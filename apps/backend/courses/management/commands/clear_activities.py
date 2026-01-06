from django.core.management.base import BaseCommand
from activities.models import Activity
from courses.models import Lesson
from progress.models import ActivityAttempt, FailedActivityQueue


class Command(BaseCommand):
    help = 'Clear all activities and related progress data (keeps levels and subjects)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm deletion (required for safety)',
        )

    def handle(self, *args, **options):
        if not options.get('confirm'):
            self.stdout.write(self.style.ERROR(
                'This will delete ALL activities and related progress data!\n'
                'Run with --confirm flag if you are sure.\n\n'
                'Example: python3 manage.py clear_activities --confirm'
            ))
            return

        self.stdout.write('Clearing activities and related data...\n')

        # Import all models that might reference activities
        from progress.models import (
            StudySession, SubjectPerformanceSnapshot, 
            UserProgress, SubjectProgress
        )

        # Count everything
        activity_count = Activity.objects.count()
        attempt_count = ActivityAttempt.objects.count()
        failed_count = FailedActivityQueue.objects.count()
        lesson_count = Lesson.objects.count()
        session_count = StudySession.objects.count()
        snapshot_count = SubjectPerformanceSnapshot.objects.count()
        user_progress_count = UserProgress.objects.count()
        subject_progress_count = SubjectProgress.objects.count()

        self.stdout.write(f'Found:')
        self.stdout.write(f'  - {activity_count} activities')
        self.stdout.write(f'  - {attempt_count} activity attempts')
        self.stdout.write(f'  - {failed_count} failed activity queue items')
        self.stdout.write(f'  - {lesson_count} lessons')
        self.stdout.write(f'  - {session_count} study sessions')
        self.stdout.write(f'  - {snapshot_count} performance snapshots')
        self.stdout.write(f'  - {user_progress_count} user progress records')
        self.stdout.write(f'  - {subject_progress_count} subject progress records')
        self.stdout.write('')

        # Delete in correct order to respect foreign keys
        SubjectPerformanceSnapshot.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'✓ Deleted {snapshot_count} performance snapshots'))

        StudySession.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'✓ Deleted {session_count} study sessions'))

        ActivityAttempt.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'✓ Deleted {attempt_count} activity attempts'))

        FailedActivityQueue.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'✓ Deleted {failed_count} failed queue items'))

        UserProgress.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'✓ Deleted {user_progress_count} user progress records'))

        SubjectProgress.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'✓ Deleted {subject_progress_count} subject progress records'))

        Activity.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'✓ Deleted {activity_count} activities'))

        Lesson.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'✓ Deleted {lesson_count} lessons'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Database cleared! Levels and subjects preserved.'))
        self.stdout.write('')
        self.stdout.write('Next steps:')
        self.stdout.write('1. Use INTERACTIVE_ACTIVITY_GENERATOR.md with ChatGPT/Claude')
        self.stdout.write('2. Import activities: python3 manage.py import_activities <json_file>')
