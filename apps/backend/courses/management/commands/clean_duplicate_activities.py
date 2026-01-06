"""
Django Management Command: Clean Duplicate Activities

Detects and removes duplicate activities from the database.
Duplicates are identified by: same lesson + same question_text

Usage:
    python manage.py clean_duplicate_activities                    # Dry run (no deletions)
    python manage.py clean_duplicate_activities --delete           # Delete duplicates
    python manage.py clean_duplicate_activities --interactive      # Ask before each deletion
    python manage.py clean_duplicate_activities --export report.json  # Export report
"""

from django.core.management.base import BaseCommand
from django.db.models import Count
from activities.models import (
    Activity, MCQActivity, FillBlankActivity, MatchingActivity,
    DragOrderActivity, ConjugationActivity, MultipleAnswerActivity, TextInputActivity
)
import json
from collections import defaultdict


class Command(BaseCommand):
    help = 'Detect and remove duplicate activities from the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Actually delete duplicates (default is dry-run)'
        )
        parser.add_argument(
            '--interactive',
            action='store_true',
            help='Ask for confirmation before each deletion'
        )
        parser.add_argument(
            '--export',
            type=str,
            help='Export duplicate report to JSON file'
        )
        parser.add_argument(
            '--keep',
            type=str,
            default='first',
            choices=['first', 'last', 'highest-id', 'lowest-id'],
            help='Which duplicate to keep (default: first created)'
        )

    def handle(self, *args, **options):
        delete_mode = options['delete']
        interactive = options['interactive']
        export_file = options.get('export')
        keep_strategy = options.get('keep', 'first')

        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS('🔍 DUPLICATE ACTIVITY DETECTOR & CLEANER'))
        self.stdout.write('=' * 80)
        
        if delete_mode:
            self.stdout.write(self.style.WARNING('⚠️  MODE: DELETE (duplicates will be removed)'))
        else:
            self.stdout.write(self.style.SUCCESS('ℹ️  MODE: DRY RUN (no changes will be made)'))
        
        self.stdout.write(f'Strategy: Keep {keep_strategy} duplicate')
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

        total_duplicates = 0
        total_deleted = 0
        duplicate_report = {}

        for type_name, ActivityModel in activity_types:
            self.stdout.write(f'\n📊 Analyzing: {type_name}')
            self.stdout.write('-' * 80)

            # Find duplicates: same lesson + same question_text
            duplicates = (
                ActivityModel.objects
                .values('lesson', 'question_text')
                .annotate(count=Count('id'))
                .filter(count__gt=1)
            )

            if not duplicates:
                self.stdout.write(self.style.SUCCESS('  ✓ No duplicates found'))
                continue

            type_duplicate_count = 0
            type_deleted_count = 0
            duplicate_details = []

            for dup in duplicates:
                lesson_id = dup['lesson']
                question_text = dup['question_text']
                count = dup['count']

                # Get all duplicate activities
                duplicate_activities = (
                    ActivityModel.objects
                    .filter(lesson_id=lesson_id, question_text=question_text)
                    .order_by('created_at', 'id')  # Oldest first
                )

                type_duplicate_count += count - 1  # Count extras

                # Determine which to keep
                if keep_strategy == 'first':
                    to_keep = duplicate_activities.first()
                    to_delete = duplicate_activities.exclude(id=to_keep.id)
                elif keep_strategy == 'last':
                    to_keep = duplicate_activities.last()
                    to_delete = duplicate_activities.exclude(id=to_keep.id)
                elif keep_strategy == 'highest-id':
                    to_keep = duplicate_activities.order_by('-id').first()
                    to_delete = duplicate_activities.exclude(id=to_keep.id)
                else:  # lowest-id
                    to_keep = duplicate_activities.order_by('id').first()
                    to_delete = duplicate_activities.exclude(id=to_keep.id)

                # Display info
                question_preview = question_text[:60] + '...' if len(question_text) > 60 else question_text
                self.stdout.write(f'\n  🔴 Found {count} duplicates:')
                self.stdout.write(f'     Lesson ID: {lesson_id}')
                self.stdout.write(f'     Question: "{question_preview}"')
                self.stdout.write(f'     Keeping: ID {to_keep.id} (created: {to_keep.created_at})')
                
                # Collect details for report
                duplicate_info = {
                    'lesson_id': lesson_id,
                    'question_text': question_text,
                    'total_copies': count,
                    'kept_id': to_keep.id,
                    'deleted_ids': [a.id for a in to_delete]
                }
                duplicate_details.append(duplicate_info)

                # Delete or show what would be deleted
                for activity in to_delete:
                    if delete_mode:
                        if interactive:
                            confirm = input(f'     Delete ID {activity.id}? (y/N): ')
                            if confirm.lower() != 'y':
                                self.stdout.write(f'     ⊘ Skipped ID {activity.id}')
                                continue
                        
                        activity.delete()
                        type_deleted_count += 1
                        self.stdout.write(self.style.WARNING(f'     ✗ Deleted ID {activity.id}'))
                    else:
                        self.stdout.write(self.style.WARNING(f'     ⚠ Would delete ID {activity.id}'))

            total_duplicates += type_duplicate_count
            total_deleted += type_deleted_count

            # Summary for this type
            self.stdout.write('')
            self.stdout.write(f'  Summary: {type_duplicate_count} duplicate(s) found')
            if delete_mode:
                self.stdout.write(self.style.SUCCESS(f'  ✓ Deleted: {type_deleted_count}'))
            
            # Store in report
            if duplicate_details:
                duplicate_report[type_name] = {
                    'total_duplicates': type_duplicate_count,
                    'deleted': type_deleted_count if delete_mode else 0,
                    'details': duplicate_details
                }

        # Final Summary
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS('📊 FINAL SUMMARY'))
        self.stdout.write('=' * 80)
        self.stdout.write(f'Total duplicates found: {total_duplicates}')
        
        if delete_mode:
            self.stdout.write(self.style.SUCCESS(f'✓ Total deleted:        {total_deleted}'))
            self.stdout.write(self.style.SUCCESS(f'✓ Database cleaned!'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ No changes made (dry-run mode)'))
            self.stdout.write(f'\nTo actually delete duplicates, run:')
            self.stdout.write(self.style.SUCCESS('  python manage.py clean_duplicate_activities --delete'))
        
        self.stdout.write('=' * 80 + '\n')

        # Export report if requested
        if export_file:
            try:
                report = {
                    'summary': {
                        'total_duplicates': total_duplicates,
                        'total_deleted': total_deleted,
                        'mode': 'delete' if delete_mode else 'dry-run',
                        'keep_strategy': keep_strategy
                    },
                    'by_type': duplicate_report
                }
                
                with open(export_file, 'w', encoding='utf-8') as f:
                    json.dump(report, f, indent=2, ensure_ascii=False)
                
                self.stdout.write(self.style.SUCCESS(f'✓ Report exported to: {export_file}\n'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Failed to export report: {e}\n'))

        # Recommendations
        if total_duplicates > 0 and not delete_mode:
            self.stdout.write('💡 RECOMMENDATIONS:\n')
            self.stdout.write('   1. Review the duplicates above')
            self.stdout.write('   2. Export a report: --export duplicates_report.json')
            self.stdout.write('   3. Delete duplicates: --delete')
            self.stdout.write('   4. Or use interactive mode: --delete --interactive')
            self.stdout.write('')
