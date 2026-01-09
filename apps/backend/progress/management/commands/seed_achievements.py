from django.core.management.base import BaseCommand
from progress.models import Achievement


class Command(BaseCommand):
    help = 'Create initial achievements for V1'
    
    def handle(self, *args, **options):
        achievements = [
            {
                'code': 'first_session',
                'title': 'First Steps',
                'description': 'Complete your first study session',
                'xp_reward': 50
            },
            {
                'code': 'perfect_session',
                'title': 'Perfectionist',
                'description': 'Complete a session with 100% accuracy',
                'xp_reward': 150
            },
            {
                'code': 'streak_3',
                'title': 'Getting Started',
                'description': 'Maintain a 3-day streak',
                'xp_reward': 100
            },
            {
                'code': 'streak_7',
                'title': 'Week Warrior',
                'description': 'Maintain a 7-day streak',
                'xp_reward': 200
            },
            {
                'code': 'xp_100',
                'title': 'Century Club',
                'description': 'Earn 100 total XP',
                'xp_reward': 50
            },
            {
                'code': 'sessions_10',
                'title': 'Dedicated Learner',
                'description': 'Complete 10 study sessions',
                'xp_reward': 250
            },
            {
                'code': 'placement_complete',
                'title': 'Level Finder',
                'description': 'Complete the placement test',
                'xp_reward': 30
            }
        ]
        
        for ach_data in achievements:
            achievement, created = Achievement.objects.update_or_create(
                code=ach_data['code'],
                defaults={
                    'title': ach_data['title'],
                    'description': ach_data['description'],
                    'xp_reward': ach_data['xp_reward'],
                    'is_active': True
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Created achievement: {ach_data["code"]}'))
            else:
                self.stdout.write(self.style.WARNING(f'⟳ Updated achievement: {ach_data["code"]}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Total achievements: {Achievement.objects.count()}'))