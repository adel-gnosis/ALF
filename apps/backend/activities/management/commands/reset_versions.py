from django.core.management.base import BaseCommand
from django.db.models import F, Q
from activities.models import Activity


class Command(BaseCommand):
    help = 'Reset all activities to version 1 with no previous_version (clean slate for testing)'

    def handle(self, *args, **options):
        # Find all activities with version != 1 or previous_version set
        activities_to_reset = Activity.objects.filter(
            Q(version__gt=1) | Q(previous_version__isnull=False)
        )
        
        count = activities_to_reset.count()
        self.stdout.write(f'Found {count} activities to reset')
        
        for activity in activities_to_reset:
            old_version = activity.version
            old_prev = activity.previous_version_id
            
            activity.version = 1
            activity.previous_version = None
            activity.save()
            
            self.stdout.write(
                f'  Reset Activity #{activity.id}: '
                f'v{old_version}→v1, prev={old_prev}→None, status={activity.status}'
            )
        
        self.stdout.write(self.style.SUCCESS(f'\nReset {count} activities to v1'))
        
        # Verify no self-references remain
        self_refs = Activity.objects.filter(previous_version=F('id')).count()
        if self_refs > 0:
            self.stdout.write(self.style.ERROR(f'WARNING: {self_refs} self-references still exist!'))
        else:
            self.stdout.write(self.style.SUCCESS('✓ No self-references found'))
