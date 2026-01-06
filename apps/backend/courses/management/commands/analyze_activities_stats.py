"""
Django Management Command: Analyze Activity Statistics

Provides comprehensive statistics about activities in the database.

Usage:
    python manage.py analyze_activities_stats
    python manage.py analyze_activities_stats --detailed
    python manage.py analyze_activities_stats --by-subject
    python manage.py analyze_activities_stats --by-level
"""

from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from courses.models import Subject, Level, Lesson
from activities.models import (
    Activity, MCQActivity, FillBlankActivity, MatchingActivity,
    DragOrderActivity, ConjugationActivity, MultipleAnswerActivity, TextInputActivity
)
from collections import defaultdict


class Command(BaseCommand):
    help = 'Analyze activity statistics and distribution'

    def add_arguments(self, parser):
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='Show detailed breakdown'
        )
        parser.add_argument(
            '--by-subject',
            action='store_true',
            help='Group statistics by subject'
        )
        parser.add_argument(
            '--by-level',
            action='store_true',
            help='Group statistics by level'
        )
        parser.add_argument(
            '--duplicates-only',
            action='store_true',
            help='Show only duplicate statistics'
        )

    def handle(self, *args, **options):
        detailed = options['detailed']
        by_subject = options['by_subject']
        by_level = options['by_level']
        duplicates_only = options['duplicates_only']

        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS('📊 ACTIVITY DATABASE STATISTICS'))
        self.stdout.write('=' * 80 + '\n')

        activity_types = [
            ('MCQActivity', MCQActivity),
            ('FillBlankActivity', FillBlankActivity),
            ('MatchingActivity', MatchingActivity),
            ('DragOrderActivity', DragOrderActivity),
            ('ConjugationActivity', ConjugationActivity),
            ('MultipleAnswerActivity', MultipleAnswerActivity),
            ('TextInputActivity', TextInputActivity),
        ]

        # Overall Statistics
        if not duplicates_only:
            self.stdout.write('🔢 OVERALL COUNTS')
            self.stdout.write('-' * 80)
            
            total_activities = 0
            for type_name, ActivityModel in activity_types:
                count = ActivityModel.objects.count()
                total_activities += count
                self.stdout.write(f'  {type_name:30} {count:>6}')
            
            self.stdout.write('-' * 80)
            self.stdout.write(self.style.SUCCESS(f'  {"TOTAL":30} {total_activities:>6}'))
            self.stdout.write('')

        # Duplicate Statistics
        self.stdout.write('🔍 DUPLICATE ANALYSIS')
        self.stdout.write('-' * 80)
        
        total_duplicates = 0
        duplicate_breakdown = {}
        
        for type_name, ActivityModel in activity_types:
            duplicates = (
                ActivityModel.objects
                .values('lesson', 'question_text')
                .annotate(count=Count('id'))
                .filter(count__gt=1)
            )
            
            duplicate_count = sum(dup['count'] - 1 for dup in duplicates)
            total_duplicates += duplicate_count
            duplicate_breakdown[type_name] = duplicate_count
            
            if duplicate_count > 0:
                self.stdout.write(self.style.WARNING(
                    f'  {type_name:30} {duplicate_count:>6} duplicate(s)'
                ))
            else:
                self.stdout.write(self.style.SUCCESS(
                    f'  {type_name:30} {duplicate_count:>6} (clean)'
                ))
        
        self.stdout.write('-' * 80)
        if total_duplicates > 0:
            self.stdout.write(self.style.WARNING(f'  {"TOTAL DUPLICATES":30} {total_duplicates:>6}'))
            self.stdout.write('')
            self.stdout.write(self.style.WARNING('  ⚠️  Run "python manage.py clean_duplicate_activities" to clean'))
        else:
            self.stdout.write(self.style.SUCCESS(f'  {"TOTAL DUPLICATES":30} {total_duplicates:>6}'))
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS('  ✓ No duplicates found!'))
        self.stdout.write('')

        # By Subject
        if by_subject and not duplicates_only:
            self.stdout.write('📚 BY SUBJECT')
            self.stdout.write('-' * 80)
            
            subjects = Subject.objects.all().order_by('order')
            for subject in subjects:
                lessons = Lesson.objects.filter(subject=subject)
                total = 0
                for type_name, ActivityModel in activity_types:
                    count = ActivityModel.objects.filter(lesson__in=lessons).count()
                    total += count
                
                self.stdout.write(f'  {subject.title:30} {total:>6} activities')
            self.stdout.write('')

        # By Level
        if by_level and not duplicates_only:
            self.stdout.write('🎚️  BY LEVEL')
            self.stdout.write('-' * 80)
            
            levels = Level.objects.all().order_by('order')
            for level in levels:
                lessons = Lesson.objects.filter(level=level)
                total = 0
                for type_name, ActivityModel in activity_types:
                    count = ActivityModel.objects.filter(lesson__in=lessons).count()
                    total += count
                
                self.stdout.write(f'  Level {level.order:2d} {level.title:25} {total:>6} activities')
            self.stdout.write('')

        # Detailed Breakdown
        if detailed and not duplicates_only:
            self.stdout.write('🔬 DETAILED BREAKDOWN (Subject × Level × Type)')
            self.stdout.write('-' * 80)
            
            subjects = Subject.objects.all().order_by('order')
            
            for subject in subjects:
                self.stdout.write(f'\n📖 {subject.title}')
                self.stdout.write('  ' + '-' * 76)
                
                levels = Level.objects.all().order_by('order')
                
                for level in levels:
                    lessons = Lesson.objects.filter(subject=subject, level=level)
                    
                    if not lessons.exists():
                        continue
                    
                    level_total = 0
                    type_counts = []
                    
                    for type_name, ActivityModel in activity_types:
                        count = ActivityModel.objects.filter(lesson__in=lessons).count()
                        level_total += count
                        if count > 0:
                            type_counts.append(f'{type_name.replace("Activity", "")}:{count}')
                    
                    if level_total > 0:
                        types_str = ', '.join(type_counts) if type_counts else 'None'
                        self.stdout.write(f'  Level {level.order:2d}: {level_total:4d} activities ({types_str})')
            
            self.stdout.write('')

        # Health Check
        if not duplicates_only:
            self.stdout.write('🏥 DATABASE HEALTH')
            self.stdout.write('-' * 80)
            
            # Check for lessons without activities
            empty_lessons = Lesson.objects.annotate(
                activity_count=Count('activities')
            ).filter(activity_count=0)
            
            if empty_lessons.exists():
                self.stdout.write(self.style.WARNING(
                    f'  ⚠️  {empty_lessons.count()} lesson(s) have no activities'
                ))
                if detailed:
                    for lesson in empty_lessons[:10]:
                        self.stdout.write(f'      • {lesson.title} (Level {lesson.level.order})')
                    if empty_lessons.count() > 10:
                        self.stdout.write(f'      ... and {empty_lessons.count() - 10} more')
            else:
                self.stdout.write(self.style.SUCCESS('  ✓ All lessons have activities'))
            
            # Check for orphaned activities (should not happen with CASCADE)
            orphaned = 0
            for type_name, ActivityModel in activity_types:
                count = ActivityModel.objects.filter(lesson__isnull=True).count()
                orphaned += count
            
            if orphaned > 0:
                self.stdout.write(self.style.ERROR(
                    f'  ✗ {orphaned} orphaned activity(ies) found (no lesson)'
                ))
            else:
                self.stdout.write(self.style.SUCCESS('  ✓ No orphaned activities'))
            
            self.stdout.write('')

        # Recommendations
        self.stdout.write('💡 RECOMMENDATIONS')
        self.stdout.write('-' * 80)
        
        if total_duplicates > 0:
            self.stdout.write('  1. Clean duplicates:')
            self.stdout.write(self.style.WARNING('     python manage.py clean_duplicate_activities --delete'))
        
        if not by_subject and not duplicates_only:
            self.stdout.write('  2. View by subject:')
            self.stdout.write('     python manage.py analyze_activities_stats --by-subject')
        
        if not by_level and not duplicates_only:
            self.stdout.write('  3. View by level:')
            self.stdout.write('     python manage.py analyze_activities_stats --by-level')
        
        if not detailed and not duplicates_only:
            self.stdout.write('  4. View detailed breakdown:')
            self.stdout.write('     python manage.py analyze_activities_stats --detailed')
        
        self.stdout.write('')
        self.stdout.write('=' * 80 + '\n')
