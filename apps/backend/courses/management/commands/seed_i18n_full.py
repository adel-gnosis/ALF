import json
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from courses.models import Course, Level, Subject, Lesson
from activities.models import (
    MCQActivity, FillBlankActivity, MatchingActivity,
    DragOrderActivity, ConjugationActivity, MultipleAnswerActivity,
    TextInputActivity, DicteeActivity
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with i18n-ready French learning activities (4 levels)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--levels',
            type=int,
            default=4,
            help='Number of levels to create (default: 4)'
        )

    def handle(self, *args, **options):
        num_levels = options['levels']
        
        self.stdout.write(self.style.SUCCESS('=== Starting I18N Seed ===\n'))
        
        # Get or create superuser
        teacher = User.objects.filter(is_superuser=True).first()
        if not teacher:
            self.stdout.write(self.style.ERROR('No superuser found. Please create one first.'))
            return
        
        # Create Course
        course, created = Course.objects.get_or_create(
            code='FR',
            defaults={
                'title': 'French Mastery',
                'description': 'Learn French with adaptive, personalized lessons',
                'course_type': 'LANGUAGE',
                'target_language': 'fr',
                'source_language': None,  # Universal (uses translation keys)
                'flag_icon': '🇫🇷',
                'source_flag_icon': '🌍',
                'order': 1
            }
        )
        self.stdout.write(self.style.SUCCESS(f'✓ Course: {course.title}'))
        
        # Create Subjects
        subjects_data = [
            ('Vocabulaire', 'Learn essential French vocabulary'),
            ('Grammaire', 'Master French grammar rules'),
            ('Conjugaison', 'Practice verb conjugations'),
            ('Prononciation', 'Improve your French pronunciation'),
        ]
        
        subjects = {}
        for title, desc in subjects_data:
            subject, created = Subject.objects.get_or_create(
                course=course,
                title=title,
                defaults={
                    'code': title[:3].upper(),
                    'description': desc,
                    'order': len(subjects) + 1
                }
            )
            subjects[title] = subject
            self.stdout.write(self.style.SUCCESS(f'✓ Subject: {title}'))
        
        # Create Levels
        for i in range(1, num_levels + 1):
            level, created = Level.objects.get_or_create(
                course=course,
                code=f'FR-L{i}',
                defaults={
                    'title': f'Level {i}',
                    'description': f'French learning level {i}',
                    'order': i
                }
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Level {i}: {level.title}'))
            
            # Assign subject based on level
            subject_map = {
                1: 'Vocabulaire',
                2: 'Grammaire',
                3: 'Conjugaison',
                4: 'Prononciation'
            }
            subject = subjects[subject_map.get(i, 'Vocabulaire')]
            
            # Create Lesson
            lesson, created = Lesson.objects.get_or_create(
                level=level,
                subject=subject,
                order=1,
                defaults={
                    'title': f'{level.code} - {subject.title}',
                    'description': f'Activities for {subject.title}',
                    'created_by': teacher,
                    'is_published': True
                }
            )
            
            # Seed activities for this level
            self._seed_activities_for_level(lesson, subject, teacher, i)
        
        self.stdout.write(self.style.SUCCESS('\n=== Seed Complete! ==='))
        self.stdout.write(f'Total: {num_levels} levels, 4 subjects, ~{num_levels * 12} activities')

    def _seed_activities_for_level(self, lesson, subject, teacher, level_num):
        """Seed 12 activities per level with proper i18n structure"""
        
        # Clear existing activities to prevent duplicates
        lesson.activities.all().delete()
        
        # Level 1: Vocabulaire
        if level_num == 1:
            self._create_vocab_activities(lesson, subject, teacher)
        
        # Level 2: Grammaire
        elif level_num == 2:
            self._create_grammar_activities(lesson, subject, teacher)
        
        # Level 3: Conjugaison
        elif level_num == 3:
            self._create_conjugation_activities(lesson, subject, teacher)
        
        # Level 4: Prononciation
        elif level_num == 4:
            self._create_pronunciation_activities(lesson, subject, teacher)

    def _create_vocab_activities(self, lesson, subject, teacher):
        """Level 1: Vocabulary activities"""
        
        # MCQ Activities (3)
        vocab_mcqs = [
            {
                "question_text": "Quelle est la traduction de 'apple' ?",
                "question_text_key": "activity.mcq.translate_word",
                "translation_data": {"word": "key:word.apple"},
                "choices": ["pomme", "orange", "banane", "poire"],
                "correct_answer_index": 0
            },
            {
                "question_text": "Quelle est la traduction de 'book' ?",
                "question_text_key": "activity.mcq.translate_word",
                "translation_data": {"word": "key:word.book"},
                "choices": ["livre", "table", "chaise", "porte"],
                "correct_answer_index": 0
            },
            {
                "question_text": "Quelle est la traduction de 'cat' ?",
                "question_text_key": "activity.mcq.translate_word",
                "translation_data": {"word": "key:word.cat"},
                "choices": ["chat", "chien", "oiseau", "poisson"],
                "correct_answer_index": 0
            },
        ]
        
        for idx, data in enumerate(vocab_mcqs):
            MCQActivity.objects.create(
                lesson=lesson,
                created_by=teacher,
                is_approved=True,
                order=idx,
                difficulty='BEGINNER',
                **data
            )
        
        # Fill Blank (2)
        FillBlankActivity.objects.create(
            lesson=lesson,
            created_by=teacher,
            is_approved=True,
            order=3,
            question_text="Complétez la phrase : Je suis ___",
            question_text_key="activity.fill_blank.complete_phrase",
            translation_data={"phrase": "Je suis ___"},
            correct_answer="étudiant",
            difficulty='BEGINNER'
        )
        
        FillBlankActivity.objects.create(
            lesson=lesson,
            created_by=teacher,
            is_approved=True,
            order=4,
            question_text="Complétez la phrase : J'aime ___",
            question_text_key="activity.fill_blank.complete_phrase",
            translation_data={"phrase": "J'aime ___"},
            correct_answer="lire",
            difficulty='BEGINNER'
        )
        
        # Matching (2)
        MatchingActivity.objects.create(
            lesson=lesson,
            created_by=teacher,
            is_approved=True,
            order=5,
            question_text="Associez les mots français avec leurs traductions anglaises",
            question_text_key="activity.matching.instruction",
            translation_data={},
            pairs={
                "pomme": "key:word.apple",
                "chat": "key:word.cat",
                "maison": "key:word.house",
                "livre": "key:word.book"
            },
            values_are_translatable=True,
            difficulty='BEGINNER'
        )
        
        MatchingActivity.objects.create(
            lesson=lesson,
            created_by=teacher,
            is_approved=True,
            order=6,
            question_text="Associez les mots français avec leurs traductions anglaises",
            question_text_key="activity.matching.instruction",
            translation_data={},
            pairs={
                "chien": "key:word.dog",
                "table": "key:word.table",
                "porte": "key:word.door",
                "fenêtre": "key:word.window"
            },
            values_are_translatable=True,
            difficulty='BEGINNER'
        )
        
        # Dictée (1)
        DicteeActivity.objects.create(
            lesson=lesson,
            created_by=teacher,
            is_approved=True,
            order=7,
            question_text="Écoutez et écrivez ce que vous entendez",
            question_text_key="activity.dictee.instruction",
            translation_data={},
            audio_urls=[],
            correct_text="Je suis un robot",
            case_sensitive=False,
            difficulty='BEGINNER'
        )
        
        # Text Input (2)
        TextInputActivity.objects.create(
            lesson=lesson,
            created_by=teacher,
            is_approved=True,
            order=8,
            question_text="Tapez la traduction française de 'hello'",
            question_text_key="activity.text_input.translate",
            translation_data={"word": "hello"},
            correct_answers=["bonjour", "salut"],
            difficulty='BEGINNER'
        )
        
        TextInputActivity.objects.create(
            lesson=lesson,
            created_by=teacher,
            is_approved=True,
            order=9,
            question_text="Tapez la traduction française de 'thank you'",
            question_text_key="activity.text_input.translate",
            translation_data={"word": "thank you"},
            correct_answers=["merci"],
            difficulty='BEGINNER'
        )
        
        # Drag Order (1)
        DragOrderActivity.objects.create(
            lesson=lesson,
            created_by=teacher,
            is_approved=True,
            order=10,
            question_text="Arrangez les mots pour former une phrase française correcte",
            question_text_key="activity.drag_order.instruction",
            translation_data={},
            words=["suis", "Je", "étudiant", "un"],
            correct_order=[1, 0, 3, 2],
            difficulty='BEGINNER'
        )
        
        # Conjugation (1)
        ConjugationActivity.objects.create(
            lesson=lesson,
            created_by=teacher,
            is_approved=True,
            order=11,
            question_text="Conjuguez être au présent pour je",
            question_text_key="activity.conjugation.instruction",
            translation_data={"verb": "être", "tense": "présent", "pronoun": "je"},
            verb_infinitive="être",
            tense="présent",
            pronoun="je",
            correct_conjugation="suis",
            difficulty='BEGINNER'
        )
        
        self.stdout.write(f'  ✓ Created 12 activities for Level 1 (Vocabulaire)')

    def _create_grammar_activities(self, lesson, subject, teacher):
        """Level 2: Grammar activities (simplified version)"""
        # Similar structure, focusing on grammar
        for i in range(12):
            FillBlankActivity.objects.create(
                lesson=lesson,
                created_by=teacher,
                is_approved=True,
                order=i,
                question_text=f"Complétez la phrase : Il ___ un livre",
                question_text_key="activity.fill_blank.complete_phrase",
                translation_data={"phrase": "Il ___ un livre"},
                correct_answer="lit",
                difficulty='BEGINNER'
            )
        self.stdout.write(f'  ✓ Created 12 activities for Level 2 (Grammaire)')

    def _create_conjugation_activities(self, lesson, subject, teacher):
        """Level 3: Conjugation activities"""
        verbs = [
            ("être", "je", "suis"),
            ("avoir", "tu", "as"),
            ("aller", "il", "va"),
            ("faire", "nous", "faisons"),
            ("dire", "vous", "dites"),
            ("pouvoir", "ils", "peuvent"),
        ]
        
        for idx, (verb, pronoun, answer) in enumerate(verbs * 2):  # 12 activities
            ConjugationActivity.objects.create(
                lesson=lesson,
                created_by=teacher,
                is_approved=True,
                order=idx,
                question_text=f"Conjuguez {verb} au présent pour {pronoun}",
                question_text_key="activity.conjugation.instruction",
                translation_data={"verb": verb, "tense": "présent", "pronoun": pronoun},
                verb_infinitive=verb,
                tense="présent",
                pronoun=pronoun,
                correct_conjugation=answer,
                difficulty='BEGINNER'
            )
        self.stdout.write(f'  ✓ Created 12 activities for Level 3 (Conjugaison)')

    def _create_pronunciation_activities(self, lesson, subject, teacher):
        """Level 4: Pronunciation (Dictée) activities"""
        sentences = [
            "Bonjour",
            "Comment allez-vous?",
            "Je suis un robot",
            "Merci beaucoup",
            "Au revoir",
            "Je m'appelle Marie",
        ]
        
        for idx, sentence in enumerate(sentences * 2):  # 12 activities
            DicteeActivity.objects.create(
                lesson=lesson,
                created_by=teacher,
                is_approved=True,
                order=idx,
                question_text="Écoutez et écrivez ce que vous entendez",
                question_text_key="activity.dictee.instruction",
                translation_data={},
                audio_urls=[f"https://placeholder.com/audio/{sentence.replace(' ', '_').lower()}.mp3"],
                correct_text=sentence,
                case_sensitive=False,
                difficulty='BEGINNER'
            )
        self.stdout.write(f'  ✓ Created 12 activities for Level 4 (Prononciation)')
