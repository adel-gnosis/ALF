from django.core.management.base import BaseCommand
from courses.models import Course, Level, Subject, Lesson
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Populates initial courses, levels, and subjects'

    def handle(self, *args, **options):
        self.stdout.write('Creating Courses...')
        
        # 1. Create Courses
        french_course, _ = Course.objects.get_or_create(
            code='FRENCH',
            defaults={
                'title': 'Français',
                'course_type': 'LANGUAGE',
                'description': 'Master French grammar, vocabulary, and conjugation.',
                'order': 1,
                'color': '#3B82F6', # Blue
                'icon': 'book-outline'
            }
        )
        
        math_course, _ = Course.objects.get_or_create(
            code='MATH',
            defaults={
                'title': 'Mathématiques',
                'course_type': 'MATH',
                'description': 'Learn Algebra, Geometry, and Arithmetic.',
                'order': 2,
                'color': '#10B981', # Green
                'icon': 'calculator-outline'
            }
        )

        # 2. Create Levels for French (30 Levels map to CEFR)
        # Clear existing French levels to avoid duplicates if re-run
        Level.objects.filter(course=french_course).delete()
        
        french_levels_config = []
        
        # A1: Levels 1-7
        for i in range(1, 8):
            french_levels_config.append({
                'order': i, 
                'code': f'A1.{i}', 
                'title': f'Niveau {i}', 
                'description': 'Débutant - A1'
            })
            
        # A2: Levels 8-14
        for i in range(8, 15):
            french_levels_config.append({
                'order': i, 
                'code': f'A2.{i-7}', 
                'title': f'Niveau {i}', 
                'description': 'Élémentaire - A2'
            })
            
        # B1: Levels 15-22
        for i in range(15, 23):
             french_levels_config.append({
                'order': i, 
                'code': f'B1.{i-14}', 
                'title': f'Niveau {i}', 
                'description': 'Intermédiaire - B1'
            })
            
        # B2: Levels 23-30
        for i in range(23, 31):
             french_levels_config.append({
                'order': i, 
                'code': f'B2.{i-22}', 
                'title': f'Niveau {i}', 
                'description': 'Avancé - B2'
            })
            
        for config in french_levels_config:
            Level.objects.get_or_create(
                course=french_course,
                order=config['order'],
                defaults={
                    'code': config['code'],
                    'title': config['title'],
                    'description': config['description']
                }
            )

        # 3. Create Levels for Math (Grades)
        math_levels = [
            ('G1', 'CP - Grade 1', 1),
            ('G2', 'CE1 - Grade 2', 2),
            ('G3', 'CE2 - Grade 3', 3),
            ('G4', 'CM1 - Grade 4', 4),
        ]
        
        for code, title, order in math_levels:
            Level.objects.get_or_create(
                course=math_course,
                code=code,
                defaults={
                    'title': title,
                    'order': order,
                    'description': f'Math Level {code}'
                }
            )

        # 4. Create Subjects for French
        french_subjects = [
            ('GRAMMAR', 'Grammaire', 'book', '#F59E0B', 1),
            ('CONJUGATION', 'Conjugaison', 'construct', '#EC4899', 2),
            ('VOCABULARY', 'Vocabulaire', 'chatbubbles', '#8B5CF6', 3),
        ]
        
        for code, title, icon, color, order in french_subjects:
            Subject.objects.get_or_create(
                course=french_course,
                code=code,
                defaults={
                    'title': title,
                    'icon': icon,
                    'color': color,
                    'order': order
                }
            )

        # 5. Create Subjects for Math
        math_subjects = [
            ('ARITHMETIC', 'Arithmétique', 'calculator', '#EF4444', 1),
            ('GEOMETRY', 'Géométrie', 'shapes', '#3B82F6', 2),
            ('ALGEBRA', 'Algèbre', 'infinite', '#10B981', 3),
        ]
        
        for code, title, icon, color, order in math_subjects:
            Subject.objects.get_or_create(
                course=math_course,
                code=code,
                defaults={
                    'title': title,
                    'icon': icon,
                    'color': color,
                    'order': order
                }
            )

        self.stdout.write(self.style.SUCCESS('Successfully populated courses, levels, and subjects'))
