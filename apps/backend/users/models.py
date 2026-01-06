from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_STUDENT = 'student'
    ROLE_TEACHER = 'teacher'
    ROLE_ADMIN = 'admin'

    ROLE_CHOICES = [
        (ROLE_STUDENT, 'Student'),
        (ROLE_TEACHER, 'Teacher'),
        (ROLE_ADMIN, 'Admin'),
    ]
    
    # Language choices for UI (not learning language - everyone learns French)
    LANGUAGE_CHOICES = [
        ('fr', 'Français'),
        ('en', 'English'),
        ('ar', 'العربية'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_STUDENT)
    
    # UI language preference (default: French)
    # This determines which language the user sees instructions in
    # Does NOT affect course content (everyone learns French)
    native_language = models.CharField(
        max_length=5,
        choices=LANGUAGE_CHOICES,
        default='fr',
        help_text="User's preferred UI language"
    )
    
    # Teacher system fields
    is_teacher_approved = models.BooleanField(default=False)
    teacher_bio = models.TextField(blank=True)
    teacher_requested_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.username} ({self.role})"
