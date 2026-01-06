import json
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from courses.models import Level, Subject, Lesson
from activities.models import (
    MCQActivity, FillBlankActivity, MatchingActivity,
    DragOrderActivity, ConjugationActivity, MultipleAnswerActivity, TextInputActivity
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Import activities from JSON files'

    def add_arguments(self, parser):
        parser.add_argument('files', nargs='+', type=str, help='JSON file(s) to import')
        parser.add_argument('--skip-duplicates', action='store_true', help='Skip duplicate activities')
        parser.add_argument('--update-duplicates', action='store_true', help='Update existing activities')
        parser.add_argument('--course', type=str, default='FRENCH', help='Course code (default: FRENCH)')

    def handle(self, *args, **options):
        files = options['files']
        skip_duplicates = options.get('skip_duplicates', False)
        update_duplicates = options.get('update_duplicates', False)
        course_code = options.get('course', 'FRENCH').upper()

        # Get Course
        from courses.models import Course
        course = Course.objects.filter(code=course_code).first()
        if not course:
             self.stdout.write(self.style.ERROR(f'Course not found: {course_code}. Run populate_courses first.'))
             return

        # Get or create default teacher
        teacher = User.objects.filter(role='teacher').first()
        if not teacher:
            teacher = User.objects.filter(is_superuser=True).first()

        total_imported = 0
        total_skipped = 0
        total_updated = 0

        for file_path in files:
            if not os.path.exists(file_path):
                self.stdout.write(self.style.ERROR(f'File not found: {file_path}'))
                continue

            self.stdout.write(f'\nProcessing: {file_path}')
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Get or create subject
                if 'subject' not in data:
                    self.stdout.write(self.style.ERROR('  Missing required field: subject'))
                    continue
                    
                subject = Subject.objects.filter(course=course, title=data['subject']).first()
                if not subject:
                    self.stdout.write(self.style.ERROR(f'  Subject not found: {data["subject"]} in course {course.title}'))
                    continue
                
                # Check if multi-level format (activities with level field) or single-level
                if 'levels' in data or (data.get('activities') and 'level' in data['activities'][0]):
                    # Multi-level format: activities distributed across levels
                    self.stdout.write(self.style.SUCCESS('  Detected multi-level format'))
                    imported, skipped, updated = self._import_multi_level_activities(
                        data['activities'],
                        subject,
                        course, # Pass course
                        teacher,
                        skip_duplicates,
                        update_duplicates
                    )
                else:
                    # Single-level format: all activities for one level
                    if 'level' not in data:
                        self.stdout.write(self.style.ERROR('  Missing required field: level'))
                        continue
                    
                    level = Level.objects.filter(course=course, order=data['level']).first()
                    if not level:
                        self.stdout.write(self.style.ERROR(f'  Level not found: {data["level"]} in course {course.title}'))
                        continue
                    
                    # Get or create lesson
                    lesson_title = f"{level.code} - {data['subject']}"
                    lesson, created = Lesson.objects.get_or_create(
                        level=level,
                        subject=subject,
                        order=1,
                        defaults={
                            'title': lesson_title,
                            'description': f'Activities for {data["subject"]} at {level.title}',
                            'created_by': teacher,
                            'is_published': True
                        }
                    )
                    
                    if created:
                        self.stdout.write(self.style.SUCCESS(f'  Created lesson: {lesson_title}'))
                    
                    # Import activities
                    imported, skipped, updated = self._import_activities(
                        data['activities'], 
                        lesson, 
                        teacher, 
                        skip_duplicates, 
                        update_duplicates
                    )
                
                total_imported += imported
                total_skipped += skipped
                total_updated += updated
                
                self.stdout.write(self.style.SUCCESS(
                    f'  Imported: {imported}, Skipped: {skipped}, Updated: {updated}'
                ))
                
            except json.JSONDecodeError as e:
                self.stdout.write(self.style.ERROR(f'  JSON decode error: {e}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Error: {e}'))
        
        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Total - Imported: {total_imported}, Skipped: {total_skipped}, Updated: {total_updated}'
        ))

    def _import_activities(self, activities, lesson, teacher, skip_duplicates, update_duplicates):
        imported = 0
        skipped = 0
        updated = 0
        
        activity_classes = {
            'MCQActivity': MCQActivity,
            'FillBlankActivity': FillBlankActivity,
            'MatchingActivity': MatchingActivity,
            'DragOrderActivity': DragOrderActivity,
            'ConjugationActivity': ConjugationActivity,
            'MultipleAnswerActivity': MultipleAnswerActivity,
            'TextInputActivity': TextInputActivity,
        }
        
        for idx, activity_data in enumerate(activities):
            activity_type = activity_data.get('type')
            if not activity_type or activity_type not in activity_classes:
                self.stdout.write(self.style.WARNING(f'    Unknown activity type: {activity_type}'))
                skipped += 1
                continue
            
            ActivityClass = activity_classes[activity_type]
            
            # Check for duplicate
            existing = ActivityClass.objects.filter(
                lesson=lesson,
                question_text=activity_data.get('question_text')
            ).first()
            
            if existing:
                if skip_duplicates:
                    skipped += 1
                    continue
                elif update_duplicates:
                    # Update existing
                    for key, value in activity_data.items():
                        if key != 'type' and hasattr(existing, key):
                            setattr(existing, key, value)
                    existing.save()
                    updated += 1
                    continue
            
            # Create new activity
            try:
                activity_fields = {
                    'lesson': lesson,
                    'created_by': teacher,
                    'is_approved': True,
                    'order': idx
                }
                
                # Add all fields except 'type'
                for key, value in activity_data.items():
                    if key != 'type':
                        activity_fields[key] = value
                
                ActivityClass.objects.create(**activity_fields)
                imported += 1
                
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'    Failed to create activity: {e}'))
                skipped += 1
        
        return imported, skipped, updated
    
    def _import_multi_level_activities(self, activities, subject, course, teacher, skip_duplicates, update_duplicates):
        """Import activities that specify their level (one file = activities for levels 1-30)"""
        imported = 0
        skipped = 0
        updated = 0
        
        from courses.models import Level
        
        activity_classes = {
            'MCQActivity': MCQActivity,
            'FillBlankActivity': FillBlankActivity,
            'MatchingActivity': MatchingActivity,
            'DragOrderActivity': DragOrderActivity,
            'ConjugationActivity': ConjugationActivity,
            'MultipleAnswerActivity': MultipleAnswerActivity,
            'TextInputActivity': TextInputActivity,
        }
        
        # Group activities by level
        activities_by_level = {}
        for activity_data in activities:
            level_num = activity_data.get('level')
            if not level_num:
                self.stdout.write(self.style.WARNING(f'    Activity missing level field, skipping'))
                skipped += 1
                continue
            
            if level_num not in activities_by_level:
                activities_by_level[level_num] = []
            activities_by_level[level_num].append(activity_data)
        
        # Import for each level
        for level_num, level_activities in sorted(activities_by_level.items()):
            level = Level.objects.filter(course=course, order=level_num).first()
            if not level:
                self.stdout.write(self.style.WARNING(f'    Level {level_num} not found in course {course.title}, skipping'))
                skipped += len(level_activities)
                continue
            
            # Get or create lesson for this level
            lesson_title = f"{level.code} - {subject.title}"
            lesson, created = Lesson.objects.get_or_create(
                level=level,
                subject=subject,
                order=1,
                defaults={
                    'title': lesson_title,
                    'description': f'Activities for {subject.title} at {level.title}',
                    'created_by': teacher,
                    'is_published': True
                }
            )
            
            # Import activities for this level
            for idx, activity_data in enumerate(level_activities):
                activity_type = activity_data.get('type')
                if not activity_type or activity_type not in activity_classes:
                    self.stdout.write(self.style.WARNING(f'    Unknown activity type: {activity_type}'))
                    skipped += 1
                    continue
                
                ActivityClass = activity_classes[activity_type]
                
                # Check for duplicate
                existing = ActivityClass.objects.filter(
                    lesson=lesson,
                    question_text=activity_data.get('question_text')
                ).first()
                
                if existing:
                    if skip_duplicates:
                        skipped += 1
                        continue
                    elif update_duplicates:
                        for key, value in activity_data.items():
                            if key not in ['type', 'level'] and hasattr(existing, key):
                                setattr(existing, key, value)
                        existing.save()
                        updated += 1
                        continue
                
                # Create new activity
                try:
                    activity_fields = {
                        'lesson': lesson,
                        'created_by': teacher,
                        'is_approved': True,
                        'order': idx
                    }
                    
                    # Add all fields except 'type' and 'level'
                    for key, value in activity_data.items():
                        if key not in ['type', 'level']:
                            activity_fields[key] = value
                    
                    ActivityClass.objects.create(**activity_fields)
                    imported += 1
                    
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'    Failed to create activity for level {level_num}: {e}'))
                    skipped += 1
        
        return imported, skipped, updated
