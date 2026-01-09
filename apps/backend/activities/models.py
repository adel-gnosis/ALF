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

    # UI-language availability (Meaning A)
    # Empty [] means "universal" (safe for any UI language)
    supported_ui_languages = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "List of UI languages this activity supports when it contains translated content "
            "(e.g., ['en','ar']). Empty means universal (doesn't depend on UI language)."
        ),
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
    # ========== REPLACE is_approved WITH THIS ==========
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('ARCHIVED', 'Archived'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='DRAFT',
        help_text="Content approval workflow status"
    )
    
    # Approval tracking
    submitted_for_review_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_activities'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    # Versioning
    version = models.PositiveIntegerField(default=1)
    previous_version = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='next_versions'
    )
    version_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']
        verbose_name_plural = 'Activities'

    def supports_ui_language(self, lang: str) -> bool:
        return not self.supported_ui_languages or lang in self.supported_ui_languages


    def __str__(self):
        return f"{self.lesson.title} - {self.__class__.__name__} #{self.pk}"
    
    

    @property
    def resourcetype(self):
        return self.__class__.__name__


class ActivityFeedback(models.Model):
    """Student feedback on activities"""
    activity = models.ForeignKey(
        Activity,
        on_delete=models.CASCADE,
        related_name='feedback'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    
    # Feedback type
    FEEDBACK_TYPES = [
        ('INCORRECT', 'Answer is Wrong'),
        ('UNCLEAR', 'Question is Unclear'),
        ('TYPO', 'Has Typo'),
        ('TOO_HARD', 'Too Difficult'),
        ('TOO_EASY', 'Too Easy'),
        ('OTHER', 'Other Issue'),
    ]
    feedback_type = models.CharField(max_length=20, choices=FEEDBACK_TYPES)
    
    # Details
    description = models.TextField(blank=True)
    user_answer = models.JSONField(null=True, blank=True)
    
    # Status
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='resolved_feedback'
    )
    resolution_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['activity', 'user', 'feedback_type']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['activity', 'is_resolved']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.feedback_type} on Activity #{self.activity.pk}"

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

    # Teacher-created multilingual choices (no gettext)
    # Shape: [ {"fr":"pomme","en":"apple","ar":"تفاحة"}, {"fr":"chat","en":"cat"} ]
    choices_i18n = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "Optional multilingual choices provided by teacher. Each choice is a dict keyed by language code. "
            "Use supported_ui_languages to prevent serving when the user's UI language is missing."
        ),
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

    # Teacher-created multilingual matching (no gettext, no keys)
    # Shape: { "parfait": {"en":"perfect","ar":"ممتاز"}, "rapide": {"en":"fast"} }
    pairs_i18n = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            "Teacher-provided multilingual pairs. Keys are typically French terms; values are "
            "dicts keyed by UI language code (e.g. {'en': 'perfect', 'ar': 'ممتاز'}). "
            "If a language is missing for any entry, exclude it from supported_ui_languages."
        ),
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

    # Teacher-created multilingual choices (no gettext)
    choices_i18n = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "Optional multilingual choices provided by teacher. Each choice is a dict keyed by language code."
        ),
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
