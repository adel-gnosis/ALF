from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from courses.models import Level, Subject

User = get_user_model()


class Command(BaseCommand):
    help = 'Create minimal seed data (levels, subjects, users) without activities'

    def add_arguments(self, parser):
        parser.add_argument('--levels', type=int, default=30, help='Number of levels to create (default: 30)')
        parser.add_argument('--clear', action='store_true', help='Clear existing data first')

    def handle(self, *args, **options):
        num_levels = options['levels']
        clear_data = options.get('clear', False)

        if clear_data:
            self.stdout.write('Clearing existing data...')
            from courses.models import Lesson
            from activities.models import Activity
            
            # Delete in order to avoid foreign key constraints
            Activity.objects.all().delete()
            Lesson.objects.all().delete()
            Subject.objects.all().delete()
            Level.objects.all().delete()
            self.stdout.write(self.style.WARNING('  Cleared activities, lessons, subjects, and levels'))

        # Create levels
        self.stdout.write(f'\nCreating {num_levels} levels...')
        levels_created = self._create_levels(num_levels)
        
        # Create subjects
        self.stdout.write('\nCreating subjects...')
        subjects_created = self._create_subjects()
        
        # Create users
        self.stdout.write('\nCreating default users...')
        users_created = self._create_users()
        
        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Seed data created: {levels_created} levels, {subjects_created} subjects, {users_created} users'
        ))
        self.stdout.write(self.style.SUCCESS(
            '\nNext: Import activities using: python manage.py import_activities <json_file>'
        ))

    def _create_levels(self, num_levels):
        """Create numeric levels with CEFR mapping"""
        # CEFR bracket mapping (configurable)
        def get_cefr(level_num):
            if 1 <= level_num <= 8:
                return 'A1'
            elif 9 <= level_num <= 16:
                return 'A2'
            elif 17 <= level_num <= 24:
                return 'B1'
            elif 25 <= level_num <= 32:
                return 'B2'
            elif 33 <= level_num <= 40:
                return 'C1'
            else:
                return 'C2'
        
        created = 0
        for i in range(1, num_levels + 1):
            cefr = get_cefr(i)
            level, was_created = Level.objects.get_or_create(
                order=i,
                defaults={
                    'title': f'Level {i}',
                    'description': f'Numeric level {i} (CEFR: {cefr})',
                    'cefr_code': cefr
                }
            )
            if was_created:
                created += 1
                self.stdout.write(f'  Created: Level {i} ({cefr})')
        
        return created

    def _create_subjects(self):
        """Create 5 main subjects"""
        subjects_data = [
            {
                'code': 'GRAMMAR',
                'title': 'Grammaire',
                'description': 'Les règles de la langue française',
                'icon': '📚',
                'color': '#3B82F6',
                'order': 1
            },
            {
                'code': 'CONJUGATION',
                'title': 'Conjugaison',
                'description': 'La conjugaison des verbes français',
                'icon': '⏰',
                'color': '#10B981',
                'order': 2
            },
            {
                'code': 'VOCABULARY',
                'title': 'Vocabulaire / Lexique',
                'description': 'Les mots et expressions',
                'icon': '🗣️',
                'color': '#F59E0B',
                'order': 3
            },
            {
                'code': 'SPELLING',
                'title': 'Orthographe',
                'description': "L'orthographe et les accents",
                'icon': '✏️',
                'color': '#EF4444',
                'order': 4
            },
            {
                'code': 'COMPREHENSION',
                'title': 'Compréhension',
                'description': 'Compréhension écrite et orale',
                'icon': '👂',
                'color': '#8B5CF6',
                'order': 5
            }
        ]
        
        created = 0
        for data in subjects_data:
            subject, was_created = Subject.objects.get_or_create(
                code=data['code'],
                defaults={
                    'title': data['title'],
                    'description': data['description'],
                    'icon': data['icon'],
                    'color': data['color'],
                    'order': data['order']
                }
            )
            if was_created:
                created += 1
                self.stdout.write(f'  Created: {subject.title}')
        
        return created

    def _create_users(self):
        """Create default users"""
        created = 0
        
        # Teacher
        teacher, was_created = User.objects.get_or_create(
            username='prof_marie',
            defaults={
                'email': 'marie@alf.com',
                'role': 'teacher',
                'is_teacher_approved': True,
                'teacher_bio': 'Professeure de français'
            }
        )
        if was_created:
            teacher.set_password('password123')
            teacher.save()
            created += 1
            self.stdout.write('  Created: prof_marie (teacher)')
        
        # Sample student
        student, was_created = User.objects.get_or_create(
            username='student_test',
            defaults={
                'email': 'student@test.com',
                'role': 'student'
            }
        )
        if was_created:
            student.set_password('password123')
            student.save()
            created += 1
            self.stdout.write('  Created: student_test')
        
        return created
