from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from courses.models import Level, Subject, Lesson
from activities.models import (
    MCQActivity, FillBlankActivity, MatchingActivity,
    DragOrderActivity, ConjugationActivity, MultipleAnswerActivity, TextInputActivity
)
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Populate database with comprehensive French learning content'

    def handle(self, *args, **options):
        self.stdout.write('Starting seed data generation...')
        
        # Clear existing data (optional - be careful!)
        self.stdout.write('Clearing existing content data...')
        Level.objects.all().delete()
        Subject.objects.all().delete()
        
        # Create data
        subjects = self.create_subjects()
        levels = self.create_levels()
        users = self.create_users()
        lessons = self.create_lessons(levels, subjects, users['teacher'])
        self.create_activities(lessons, users['teacher'])
        
        self.stdout.write(self.style.SUCCESS('✓ Seed data created successfully!'))
        self.stdout.write(f'  - {len(subjects)} subjects')
        self.stdout.write(f'  - {len(levels)} levels')
        self.stdout.write(f'  - {len(lessons)} lessons')
        self.stdout.write(f'  - {MCQActivity.objects.count() + FillBlankActivity.objects.count() + MatchingActivity.objects.count() + DragOrderActivity.objects.count() + ConjugationActivity.objects.count() + MultipleAnswerActivity.objects.count() + TextInputActivity.objects.count()} activities')

    def create_subjects(self):
        """Create 5 subjects"""
        subjects_data = [
            {
                'code': 'GRAMMAR',
                'title': 'Grammaire',
                'description': 'Les règles de la langue française: articles, genre, nombre, etc.',
                'icon': '📚',
                'color': '#3B82F6',
                'order': 1
            },
            {
                'code': 'CONJUGATION',
                'title': 'Conjugaison',
                'description': 'La conjugaison des verbes français: présent, passé, futur, etc.',
                'icon': '⏰',
                'color': '#10B981',
                'order': 2
            },
            {
                'code': 'VOCABULARY',
                'title': 'Vocabulaire / Lexique',
                'description': 'Les mots et expressions de la vie quotidienne',
                'icon': '🗣️',
                'color': '#F59E0B',
                'order': 3
            },
            {
                'code': 'SPELLING',
                'title': 'Orthographe',
                'description': 'L\'orthographe et les accents français',
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
        
        subjects = []
        for data in subjects_data:
            subject = Subject.objects.create(**data)
            subjects.append(subject)
            self.stdout.write(f'  Created subject: {subject.title}')
        
        return subjects

    def create_levels(self):
        """Create 5 levels"""
        levels_data = [
            {'title': 'Débutant A1.1', 'description': 'Niveau débutant - Premiers pas', 'cefr_code': 'A1', 'order': 1},
            {'title': 'Débutant A1.2', 'description': 'Niveau débutant - Consolidation', 'cefr_code': 'A1', 'order': 2},
            {'title': 'Élémentaire A2.1', 'description': 'Niveau élémentaire - Progression', 'cefr_code': 'A2', 'order': 3},
            {'title': 'Élémentaire A2.2', 'description': 'Niveau élémentaire - Avancé', 'cefr_code': 'A2', 'order': 4},
            {'title': 'Intermédiaire B1.1', 'description': 'Niveau intermédiaire - Indépendance', 'cefr_code': 'B1', 'order': 5},
        ]
        
        levels = []
        for data in levels_data:
            level = Level.objects.create(**data)
            levels.append(level)
            self.stdout.write(f'  Created level: {level.title}')
        
        return levels

    def create_users(self):
        """Create sample users"""
        self.stdout.write('Creating users...')
        
        # Admin (already exists)
        admin = User.objects.filter(username='admin').first()
        
        # Teacher
        teacher, created = User.objects.get_or_create(
            username='prof_marie',
            defaults={
                'email': 'marie@alf.com',
                'role': 'teacher',
                'is_teacher_approved': True,
                'teacher_bio': 'Professeure de français avec 10 ans d\'expérience'
            }
        )
        if created:
            teacher.set_password('password123')
            teacher.save()
            self.stdout.write('  Created teacher: prof_marie')
        
        # Students
        students = []
        student_names = ['sarah', 'ahmed', 'lucas']
        
        for name in student_names:
            student, created = User.objects.get_or_create(
                username=name,
                defaults={
                    'email': f'{name}@student.com',
                    'role': 'student'
                }
            )
            if created:
                student.set_password('password123')
                student.save()
                students.append(student)
                self.stdout.write(f'  Created student: {name}')
        
        return {'admin': admin, 'teacher': teacher, 'students': students}

    def create_lessons(self, levels, subjects, teacher):
        """Create 3+ lessons per level per subject (75+ lessons)"""
        self.stdout.write('Creating lessons...')
        
        lessons = []
        
        # Lesson templates per subject
        lesson_templates = {
            'Grammaire': [
                'Les Articles Définis',
                'Les Articles Indéfinis',
                'Le Genre des Noms',
                'Le Pluriel des Noms',
                'Les Adjectifs Possessifs'
            ],
            'Conjugaison': [
                'Être et Avoir au Présent',
                'Les Verbes en -ER',
                'Les Verbes en -IR',
                'Le Passé Composé',
                'L\'Imparfait'
            ],
            'Vocabulaire / Lexique': [
                'Les Salutations',
                'La Famille',
                'Les Nombres',
                'Les Couleurs',
                'Les Jours et Mois'
            ],
            'Orthographe': [
                'Les Accents',
                'La Cédille',
                'Les Homophones (a/à)',
                'Les Homophones (et/est)',
                'Les Homophones (son/sont)'
            ],
            'Compréhension': [
                'Dialogue Simple',
                'Histoire Courte',
                'Description',
                'Instructions',
                'Annonce'
            ]
        }
        
        order = 1
        for level in levels:
            for subject in subjects:
                templates = lesson_templates.get(subject.title, ['Leçon 1', 'Leçon 2', 'Leçon 3'])
                
                for i, template in enumerate(templates[:3], 1):  # 3 lessons per subject per level
                    lesson = Lesson.objects.create(
                        level=level,
                        subject=subject,
                        title=f"{template} - {level.cefr_code}",
                        description=f"Apprenez {template.lower()} au niveau {level.cefr_code}",
                        order=i,
                        created_by=teacher,
                        is_published=True
                    )
                    lessons.append(lesson)
                    order += 1
        
        self.stdout.write(f'  Created {len(lessons)} lessons')
        return lessons

    def create_activities(self, lessons, teacher):
        """Create 1000+ activities across all types"""
        self.stdout.write('Creating activities...')
        
        activities_per_lesson = 15  # Will create ~1125 total activities
        
        for lesson in lessons:
            subject = lesson.subject.title
            
            # Distribution of activity types
            num_mcq = 4
            num_fill = 3
            num_match = 2
            num_drag = 2
            num_conj = 2
            num_multi = 1
            num_text = 1
            
            # Create MCQ activities
            for i in range(num_mcq):
                self._create_mcq(lesson, teacher, i)
            
            # Create Fill Blank activities
            for i in range(num_fill):
                self._create_fill_blank(lesson, teacher, i)
            
            # Create Matching activities
            for i in range(num_match):
                self._create_matching(lesson, teacher, i)
            
            # Create Drag Order activities
            for i in range(num_drag):
                self._create_drag_order(lesson, teacher, i)
            
            # Create Conjugation activities (especially for Conjugaison subject)
            if 'Conjugaison' in subject:
                for i in range(num_conj + 2):
                    self._create_conjugation(lesson, teacher, i)
            else:
                for i in range(num_conj):
                    self._create_conjugation(lesson, teacher, i)
            
            # Create Multiple Answer activities
            for i in range(num_multi):
                self._create_multiple_answer(lesson, teacher, i)
            
            # Create Text Input activities
            for i in range(num_text):
                self._create_text_input(lesson, teacher, i)

    # Activity creation helpers
    def _create_mcq(self, lesson, teacher, index):
        """Create MCQ activity"""
        mcq_questions = {
            'Grammaire': [
                {
                    'question': "Quel est l'article défini pour 'livre' (masculin)?",
                    'choices': ['le', 'la', 'les', 'l\''],
                    'correct': 0,
                    'explanation': "'Livre' est masculin singulier, donc on utilise 'le'."
                },
                {
                    'question': "Comment dit-on 'the girls' en français?",
                    'choices': ['la fille', 'les filles', 'des filles', 'une fille'],
                    'correct': 1,
                    'explanation': "'The girls' = 'les filles' (article défini pluriel)"
                }
            ],
            'Vocabulaire / Lexique': [
                {
                    'question': "Comment dit-on 'Hello' en français?",
                    'choices': ['Au revoir', 'Bonjour', 'Merci', 'S\'il vous plaît'],
                    'correct': 1,
                    'explanation': "'Bonjour' signifie 'Hello' ou 'Good morning/afternoon'."
                }
            ]
        }
        
        # Get questions for this subject or use default
        questions = mcq_questions.get(lesson.subject.title, [
            {
                'question': f"Question MCQ {index + 1} pour {lesson.title}",
                'choices': ['Option A', 'Option B', 'Option C', 'Option D'],
                'correct': random.randint(0, 3),
                'explanation': 'Explication de la réponse correcte.'
            }
        ])
        
        q = random.choice(questions)
        
        MCQActivity.objects.create(
            lesson=lesson,
            question_text=q['question'],
            choices=q['choices'],
            correct_answer_index=q['correct'],
            explanation=q.get('explanation', ''),
            points=10,
            difficulty='EASY' if lesson.level.order <= 2 else 'MEDIUM',
            order=index,
            created_by=teacher,
            is_approved=True
        )

    def _create_fill_blank(self, lesson, teacher, index):
        """Create Fill Blank activity"""
        fill_templates = [
            ("Je ____ français.", "parle", "Verbe 'parler' au présent, 1ère personne"),
            ("Elle ____ étudiante.", "est", "Verbe 'être' au présent, 3ème personne"),
            ("Nous ____ à Paris.", "sommes", "Verbe 'être' au présent, 1ère personne pluriel"),
        ]
        
        template = random.choice(fill_templates)
        
        FillBlankActivity.objects.create(
            lesson=lesson,
            question_text=template[0],
            correct_answer=template[1],
            explanation=template[2],
            points=10,
            difficulty='MEDIUM',
            order=index,
            created_by=teacher,
            is_approved=True
        )

    def _create_matching(self, lesson, teacher, index):
        """Create Matching activity"""
        matching_pairs = {
            'Vocabulaire / Lexique': {
                'Bonjour': 'Hello',
                'Merci': 'Thank you',
                'Au revoir': 'Goodbye',
                'S\'il vous plaît': 'Please'
            },
            'Numbers': {
                'un': '1',
                'deux': '2',
                'trois': '3',
                'quatre': '4'
            }
        }
        
        pairs = random.choice(list(matching_pairs.values()))
        
        MatchingActivity.objects.create(
            lesson=lesson,
            question_text="Associez les mots français avec leur traduction anglaise:",
            pairs=pairs,
            explanation="Mémorisez ces correspondances essentielles.",
            points=10,
            difficulty='EASY',
            order=index,
            created_by=teacher,
            is_approved=True
        )

    def _create_drag_order(self, lesson, teacher, index):
        """Create Drag Order activity"""
        sentences = [
            (["Je", "suis", "étudiant"], ["Je", "suis", "étudiant"]),
            (["Tu", "parles", "français"], ["Tu", "parles", "français"]),
            (["Nous", "sommes", "heureux"], ["Nous", "sommes", "heureux"]),
        ]
        
        sentence = random.choice(sentences)
        
        DragOrderActivity.objects.create(
            lesson=lesson,
            question_text="Mettez les mots dans le bon ordre:",
            words=sentence[0],
            correct_order=sentence[1],
            explanation="L'ordre correct forme une phrase grammaticalement correcte.",
            points=10,
            difficulty='MEDIUM',
            order=index,
            created_by=teacher,
            is_approved=True
        )

    def _create_conjugation(self, lesson, teacher, index):
        """Create Conjugation activity"""
        conjugations = [
            ("être", "présent", "je", "suis"),
            ("avoir", "présent", "tu", "as"),
            ("parler", "présent", "il", "parle"),
            ("aller", "présent", "nous", "allons"),
            ("faire", "présent", "vous", "faites"),
        ]
        
        conj = random.choice(conjugations)
        
        ConjugationActivity.objects.create(
            lesson=lesson,
            question_text=f"Conjuguez '{conj[0]}' à {conj[1]} avec '{conj[2]}':",
            verb_infinitive=conj[0],
            tense=conj[1],
            pronoun=conj[2],
            correct_conjugation=conj[3],
            explanation=f"Le verbe '{conj[0]}' se conjugue '{conj[3]}' avec {conj[2]} au {conj[1]}.",
            points=10,
            difficulty='MEDIUM',
            order=index,
            created_by=teacher,
            is_approved=True
        )

    def _create_multiple_answer(self, lesson, teacher, index):
        """Create Multiple Answer activity"""
        MultipleAnswerActivity.objects.create(
            lesson=lesson,
            question_text="Sélectionnez TOUS les articles définis français:",
            choices=["le", "un", "la", "des", "les", "une"],
            correct_indices=[0, 2, 4],  # le, la, les
            explanation="Les articles définis sont: le, la, les, l'",
            points=15,
            difficulty='MEDIUM',
            order=index,
            created_by=teacher,
            is_approved=True
        )

    def _create_text_input(self, lesson, teacher, index):
        """Create Text Input activity"""
        TextInputActivity.objects.create(
            lesson=lesson,
            question_text="Comment dit-on 'thank you' en français?",
            correct_answers=["merci", "Merci"],
            case_sensitive=False,
            accept_partial=False,
            explanation="'Merci' est l'expression de remerciement en français.",
            points=10,
            difficulty='EASY',
            order=index,
            created_by=teacher,
            is_approved=True
        )
