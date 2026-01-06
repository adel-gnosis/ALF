from django.db import models
from django.db.models import JSONField
from django.conf import settings
from polymorphic.models import PolymorphicModel
from courses.models import Lesson


class Activity(PolymorphicModel):
    """Base activity model with i18n support"""
    lesson = models.ForeignKey(Lesson, related_name='activities', on_delete=models.CASCADE)
    
    # Backward Compatibility (Fallback fields)
    question_text = models.TextField()
    explanation = models.TextField(blank=True)
    
    # Translation System (NEW)
    question_text_key = models.CharField(
        max_length=255, 
        null=True, 
        blank=True,
        help_text="i18n key for question (e.g., 'activity.fill_blank.instruction')"
    )
    explanation_key = models.CharField(
        max_length=255, 
        null=True, 
        blank=True,
        help_text="i18n key for explanation"
    )
    translation_data = models.JSONField(
        default=dict, 
        blank=True,
        help_text="Parameters for interpolation (e.g., {'phrase': 'Je suis ___'})"
    )
    
    # Metadata
    points = models.PositiveIntegerField(default=10)
    difficulty = models.CharField(max_length=10, choices=[
        ('EASY', 'Easy'),
        ('MEDIUM', 'Medium'),
        ('HARD', 'Hard')
    ], default='MEDIUM')
    order = models.PositiveIntegerField(default=0)
    
    # Teacher/Admin system
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='created_activities'
    )
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']
        verbose_name_plural = 'Activities'

    def __str__(self):
        return f"{self.lesson.title} - {self.__class__.__name__} #{self.pk}"

    @property
    def resourcetype(self):
        return self.__class__.__name__


# === ACTIVITY TYPES ===

class MCQActivity(Activity):
    """
    Multiple Choice Question
    Supports 3 cases:
    - Case A: Choices in French (target language) - default
    - Case B: Translation MCQ (choices translated to learner's language)
    - Case C: Grammar concepts (choices translated to learner's language)
    """
    choices = JSONField(help_text="List of choice strings (French for Case A)")
    correct_answer_index = models.PositiveIntegerField()
    
    # For Cases B & C: Translation support
    choices_keys = JSONField(
        null=True, 
        blank=True,
        help_text="Translation keys for choices (e.g., ['word.apple', 'word.orange'])"
    )
    choices_are_translatable = models.BooleanField(
        default=False,
        help_text="True for Cases B & C (translated choices), False for Case A (French choices)"
    )

    class Meta:
        verbose_name = 'Multiple Choice Activity'
        verbose_name_plural = 'Multiple Choice Activities'


class FillBlankActivity(Activity):
    """Fill in the Blank - Universal (instruction translated, answer in French)"""
    correct_answer = models.CharField(max_length=255)
    
    class Meta:
        verbose_name = 'Fill The Blank Activity'
        verbose_name_plural = 'Fill The Blank Activities'


class MatchingActivity(Activity):
    """
    Match pairs
    Supports both monolingual (French-French) and bilingual (French-Translation) matching
    """
    pairs = JSONField(
        help_text="Dictionary of pairs. For translatable values, prefix with 'key:' (e.g., {'le chat': 'key:animal.cat'})"
    )
    values_are_translatable = models.BooleanField(
        default=False,
        help_text="True if values are translation keys, False if literal text"
    )

    class Meta:
        verbose_name = 'Matching Activity'
        verbose_name_plural = 'Matching Activities'


class DragOrderActivity(Activity):
    """
    User drags words/phrases into correct order
    Words are in target language (French)
    """
    words = JSONField(help_text="List of words/phrases to arrange (in French)")
    correct_order = JSONField(help_text="Correct order (indices or words)")
    
    class Meta:
        verbose_name = 'Drag & Order Activity'
        verbose_name_plural = 'Drag & Order Activities'


class ConjugationActivity(Activity):
    """
    Verb conjugation exercise
    All verb data in target language (French)
    """
    verb_infinitive = models.CharField(max_length=50)
    tense = models.CharField(max_length=50)
    pronoun = models.CharField(max_length=20)
    correct_conjugation = models.CharField(max_length=100)
    
    class Meta:
        verbose_name = 'Conjugation Activity'
        verbose_name_plural = 'Conjugation Activities'


class MultipleAnswerActivity(Activity):
    """
    Select ALL correct answers (multiple correct options)
    Supports translation like MCQActivity
    """
    choices = JSONField(help_text="List of answer options")
    correct_indices = JSONField(help_text="List of indices for all correct answers")
    
    # Translation support
    choices_keys = JSONField(
        null=True, 
        blank=True,
        help_text="Translation keys for choices (optional)"
    )
    choices_are_translatable = models.BooleanField(
        default=False,
        help_text="True if choices should be translated to learner's language"
    )
    
    class Meta:
        verbose_name = 'Multiple Answer Activity'
        verbose_name_plural = 'Multiple Answer Activities'


class TextInputActivity(Activity):
    """
    Open text input with flexible keyword checking
    Answers in target language (French)
    """
    correct_answers = JSONField(help_text="List of acceptable answers in French")
    case_sensitive = models.BooleanField(default=False)
    accept_partial = models.BooleanField(
        default=False, 
        help_text="Accept partial matches"
    )
    
    class Meta:
        verbose_name = 'Text Input Activity'
        verbose_name_plural = 'Text Input Activities'


class DicteeActivity(Activity):
    """
    Dictation exercise - Universal (works for all learners)
    User listens to French audio and types what they hear
    """
    audio_file = models.FileField(
        upload_to='audio/', 
        null=True, 
        blank=True,
        help_text="Upload an audio file here to automatically add it to audio_urls"
    )
    audio_urls = JSONField(
        help_text="List of audio file URLs (e.g., ['/media/audio/phrase_slow.mp3', '/media/audio/phrase_fast.mp3'])",
        default=list,
        blank=True
    )
    correct_text = models.CharField(
        max_length=500,
        help_text="The exact French text that should be typed"
    )
    case_sensitive = models.BooleanField(
        default=False,
        help_text="Whether to enforce case sensitivity in answer checking"
    )

    class Meta:
        verbose_name = 'Dictée Activity'
        verbose_name_plural = 'Dictée Activities'
