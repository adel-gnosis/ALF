import json
import os
import glob
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from courses.models import Level, Subject, Lesson
from activities.models import (
    MCQActivity, FillBlankActivity, MatchingActivity,
    DragOrderActivity, ConjugationActivity, MultipleAnswerActivity, TextInputActivity
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Bulk import all activities from JSON files in a directory'

    def add_arguments(self, parser):
        parser.add_argument(
            'directory', 
            type=str, 
            default='backend/data/activities',
            nargs='?',
            help='Directory containing JSON files (default: backend/data/activities)'
        )
        parser.add_argument(
            '--skip-duplicates', 
            action='store_true', 
            help='Skip duplicate activities'
        )
        parser.add_argument(
            '--update-duplicates', 
            action='store_true', 
            help='Update existing activities'
        )
        parser.add_argument(
            '--pattern',
            type=str,
            default='*.json',
            help='File pattern to match (default: *.json)'
        )

    def handle(self, *args, **options):
        directory = options['directory']
        skip_duplicates = options.get('skip_duplicates', False)
        update_duplicates = options.get('update_duplicates', False)
        pattern = options.get('pattern', '*.json')

        # Check if directory exists
        if not os.path.exists(directory):
            self.stdout.write(self.style.ERROR(f'Directory not found: {directory}'))
            return

        # Get all JSON files in directory
        search_pattern = os.path.join(directory, pattern)
        json_files = glob.glob(search_pattern)
        
        if not json_files:
            self.stdout.write(self.style.WARNING(f'No JSON files found in: {directory}'))
            return

        self.stdout.write(self.style.SUCCESS(f'\n🚀 Found {len(json_files)} JSON file(s) in {directory}\n'))
        self.stdout.write('=' * 80)

        # Get or create default teacher
        teacher = User.objects.filter(role='teacher').first()
        if not teacher:
            teacher = User.objects.filter(is_superuser=True).first()
        
        if not teacher:
            self.stdout.write(self.style.ERROR('No teacher or superuser found!'))
            return

        # Statistics
        total_imported = 0
        total_skipped = 0
        total_updated = 0
        total_files_processed = 0
        failed_files = []

        # Process each file
        for idx, file_path in enumerate(sorted(json_files), 1):
            file_name = os.path.basename(file_path)
            self.stdout.write(f'\n[{idx}/{len(json_files)}] Processing: {file_name}')
            self.stdout.write('-' * 80)
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Validate required fields
                if 'subject' not in data:
                    self.stdout.write(self.style.ERROR('  ✗ Missing required field: subject'))
                    failed_files.append((file_name, 'Missing subject field'))
                    continue
                
                # Get or create subject
                subject = Subject.objects.filter(title=data['subject']).first()
                if not subject:
                    self.stdout.write(self.style.ERROR(f'  ✗ Subject not found: {data["subject"]}'))
                    failed_files.append((file_name, f'Subject not found: {data["subject"]}'))
                    continue
                
                # Check format type
                if 'levels' in data or (data.get('activities') and 'level' in data['activities'][0]):
                    # Multi-level format
                    self.stdout.write(self.style.SUCCESS('  ℹ Format: Multi-level'))
                    imported, skipped, updated = self._import_multi_level_activities(
                        data['activities'],
                        subject,
                        teacher,
                        skip_duplicates,
                        update_duplicates
                    )
                else:
                    # Single-level format
                    if 'level' not in data:
                        self.stdout.write(self.style.ERROR('  ✗ Missing required field: level'))
                        failed_files.append((file_name, 'Missing level field'))
                        continue
                    
                    self.stdout.write(self.style.SUCCESS(f'  ℹ Format: Single-level (Level {data["level"]})'))
                    
                    level = Level.objects.filter(order=data['level']).first()
                    if not level:
                        self.stdout.write(self.style.ERROR(f'  ✗ Level not found: {data["level"]}'))
                        failed_files.append((file_name, f'Level not found: {data["level"]}'))
                        continue
                    
                    # Get or create lesson
                    lesson_title = f"Level {data['level']} - {data['subject']}"
                    lesson, created = Lesson.objects.get_or_create(
                        level=level,
                        subject=subject,
                        order=1,
                        defaults={
                            'title': lesson_title,
                            'description': f'Activities for {data["subject"]} at Level {data["level"]}',
                            'created_by': teacher,
                            'is_published': True
                        }
                    )
                    
                    if created:
                        self.stdout.write(self.style.SUCCESS(f'  ✓ Created lesson: {lesson_title}'))
                    
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
                total_files_processed += 1
                
                self.stdout.write(self.style.SUCCESS(
                    f'  ✓ Results: Imported={imported}, Skipped={skipped}, Updated={updated}'
                ))
                
            except json.JSONDecodeError as e:
                self.stdout.write(self.style.ERROR(f'  ✗ JSON decode error: {e}'))
                failed_files.append((file_name, f'JSON error: {e}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ✗ Error: {e}'))
                failed_files.append((file_name, str(e)))
        
        # Final summary
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS('\n📊 BULK IMPORT SUMMARY\n'))
        self.stdout.write('=' * 80)
        self.stdout.write(f'Total files found:     {len(json_files)}')
        self.stdout.write(f'Files processed:       {total_files_processed}')
        self.stdout.write(f'Files failed:          {len(failed_files)}')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'✓ Activities imported: {total_imported}'))
        self.stdout.write(self.style.WARNING(f'⊘ Activities skipped:  {total_skipped}'))
        self.stdout.write(self.style.SUCCESS(f'↻ Activities updated:  {total_updated}'))
        self.stdout.write('=' * 80)
        
        if failed_files:
            self.stdout.write(self.style.ERROR('\n⚠ FAILED FILES:\n'))
            for file_name, error in failed_files:
                self.stdout.write(self.style.ERROR(f'  • {file_name}: {error}'))
        
        self.stdout.write('')

    def _import_activities(self, activities, lesson, teacher, skip_duplicates, update_duplicates):
        """Import activities for a single lesson"""
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
                self.stdout.write(self.style.WARNING(f'    ⚠ Unknown activity type: {activity_type}'))
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
                self.stdout.write(self.style.WARNING(f'    ⚠ Failed to create activity: {e}'))
                skipped += 1
        
        return imported, skipped, updated
    
    def _import_multi_level_activities(self, activities, subject, teacher, skip_duplicates, update_duplicates):
        """Import activities that specify their level (one file = activities for levels 1-30)"""
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
        
        # Group activities by level
        activities_by_level = {}
        for activity_data in activities:
            level_num = activity_data.get('level')
            if not level_num:
                self.stdout.write(self.style.WARNING(f'    ⚠ Activity missing level field, skipping'))
                skipped += 1
                continue
            
            if level_num not in activities_by_level:
                activities_by_level[level_num] = []
            activities_by_level[level_num].append(activity_data)
        
        # Import for each level
        for level_num, level_activities in sorted(activities_by_level.items()):
            level = Level.objects.filter(order=level_num).first()
            if not level:
                self.stdout.write(self.style.WARNING(f'    ⚠ Level {level_num} not found, skipping'))
                skipped += len(level_activities)
                continue
            
            # Get or create lesson for this level
            lesson_title = f"Level {level_num} - {subject.title}"
            lesson, created = Lesson.objects.get_or_create(
                level=level,
                subject=subject,
                order=1,
                defaults={
                    'title': lesson_title,
                    'description': f'Activities for {subject.title} at Level {level_num}',
                    'created_by': teacher,
                    'is_published': True
                }
            )
            
            # Import activities for this level
            for idx, activity_data in enumerate(level_activities):
                activity_type = activity_data.get('type')
                if not activity_type or activity_type not in activity_classes:
                    self.stdout.write(self.style.WARNING(f'    ⚠ Unknown activity type: {activity_type}'))
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
                    self.stdout.write(self.style.WARNING(f'    ⚠ Failed to create activity for level {level_num}: {e}'))
                    skipped += 1
        
        return imported, skipped, updated
