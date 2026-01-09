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
    # ======================
    # Minimal gamification (V1)
    # ======================
    total_xp = models.PositiveIntegerField(default=0)
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_practice_date = models.DateField(null=True, blank=True)

    # ========== Teacher System (V1) ==========
    is_teacher_approved = models.BooleanField(default=False)
    teacher_bio = models.TextField(blank=True)
    teacher_requested_at = models.DateTimeField(null=True, blank=True)
    
    # Teacher permission levels
    TEACHER_PERMISSION_LEVELS = [
        ('NONE', 'Not a Teacher'),
        ('BASIC', 'Basic Creator'),          # Must submit for approval
        ('VERIFIED', 'Verified Creator'),     # Can publish directly
        ('LEAD', 'Lead Teacher'),            # Can review others' content
    ]
    teacher_permission_level = models.CharField(
        max_length=20,
        choices=TEACHER_PERMISSION_LEVELS,
        default='NONE',
        help_text="Teacher's content creation permission level"
    )
    
    # Granular publishing control (admin can grant/revoke)
    can_publish_directly = models.BooleanField(
        default=False,
        help_text="Can publish activities without admin approval"
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['last_practice_date']),
            models.Index(fields=['teacher_permission_level']),
        ]

    
    def __str__(self):
        return f"{self.username} ({self.role})"
