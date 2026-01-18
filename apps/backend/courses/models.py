from django.db import models
from django.conf import settings

class Course(models.Model):
    """The actual subject being taught"""
    COURSE_TYPES = [
        ('LANGUAGE', 'Language'),
        ('MATH', 'Mathematics'),
        ('SCIENCE', 'Science'),
        ('OTHER', 'Other'),
    ]

    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('ar', 'Arabic'),
        ('fr', 'French'),
        ('es', 'Spanish'),
    ]
    
    code = models.CharField(max_length=20, unique=True)  # FRENCH, ENGLISH, MATH
    title = models.CharField(max_length=100)  # "French", "English", "Mathematics"
    course_type = models.CharField(max_length=20, choices=COURSE_TYPES)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=7, blank=True)
    order = models.PositiveIntegerField(unique=True)

    # I18N Support (Directionality)
    target_language = models.CharField(max_length=5, choices=LANGUAGE_CHOICES, null=True, blank=True)
    source_language = models.CharField(
        max_length=5, 
        choices=LANGUAGE_CHOICES, 
        null=True, 
        blank=True,
        help_text="Native language of the learner. If NULL, this is a Universal/Global course."
    )
    
    # Metadata
    flag_icon = models.CharField(max_length=50, blank=True, help_text="Icon for target language")
    source_flag_icon = models.CharField(max_length=50, blank=True, help_text="Icon for source language (if specific)")
    
    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title


class Level(models.Model):
    """Levels now belong to a Course (e.g. French A1, Math Grade 1)"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='levels', null=True) # null=True temporarily for migration if needed, but we reset DB so it's fine. keeping it strict.
    
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    code = models.CharField(max_length=20) # A1, G1, etc.
    order = models.PositiveIntegerField(default=0)
    image_url = models.URLField(blank=True, null=True)

    class Meta:
        ordering = ['course__order', 'order']
        unique_together = ['course', 'code']

    def __str__(self):
        return f"{self.course.title} - {self.code}"


class Subject(models.Model):
    """
    Topic within a course
    French -> Grammar
    Math -> Algebra
    """

    SUBJECT_KINDS = [
        ("KNOWLEDGE", "Knowledge"),
        ("SKILL", "Skill"),
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='subjects')

    # Stable identifier (used in code / imports)
    code = models.CharField(max_length=20)

    # Display (current)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # Future-proof i18n (optional for now)
    title_key = models.CharField(max_length=255, blank=True, default="")
    description_key = models.CharField(max_length=255, blank=True, default="")

    # UI metadata
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=7, blank=True)
    order = models.PositiveIntegerField(default=0)

    # Platform structure
    kind = models.CharField(max_length=20, choices=SUBJECT_KINDS, default="KNOWLEDGE")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['course__order', 'order']
        unique_together = ['course', 'code']

    def __str__(self):
        return f"{self.course.title} - {self.title}"



class Lesson(models.Model):
    """
    Lessons belong to Level + Subject
    """
    level = models.ForeignKey(Level, on_delete=models.CASCADE, related_name='lessons')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='lessons')
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    
    # Teacher system
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='created_lessons'
    )
    is_published = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['level__order', 'subject__order', 'order']
        unique_together = ['level', 'subject', 'order']
    
    def __str__(self):
        return f"{self.level.code} - {self.subject.title} - {self.title}"
