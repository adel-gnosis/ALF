import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class UserProgress(models.Model):
    """
    Tracks user's overall progression through levels
    One record per user per level
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='level_progress')
    level = models.ForeignKey('courses.Level', on_delete=models.CASCADE)
    
    # Status
    STATUS_CHOICES = [
        ('LOCKED', 'Locked'),
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='LOCKED')
    
    # Scoring
    total_activities = models.PositiveIntegerField(default=0)
    completed_activities = models.PositiveIntegerField(default=0)
    correct_answers = models.PositiveIntegerField(default=0)
    total_attempts = models.PositiveIntegerField(default=0)
    
    # Current session tracking
    current_session_correct = models.PositiveIntegerField(default=0)
    current_session_total = models.PositiveIntegerField(default=0)
    
    # Progression logic
    completion_percentage = models.FloatField(default=0.0)  # 0-100
    accuracy_percentage = models.FloatField(default=0.0)    # 0-100
    
    # Timestamps
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_activity_at = models.DateTimeField(auto_now=True)
    
    # Retry tracking
    retry_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        unique_together = ['user', 'level']
        ordering = ['level__order']
        verbose_name = 'User Progress'
        verbose_name_plural = 'User Progress'
    
    def __str__(self):
        return f"{self.user.username} - {self.level.code} ({self.status})"
    
    @property
    def is_passed(self):
        """Level is passed if accuracy >= 80%"""
        return self.accuracy_percentage >= 80.0
    
    @property
    def needs_downgrade(self):
        """Should downgrade if accuracy < 50%"""
        return self.accuracy_percentage < 50.0 and self.total_attempts >= 5
    
    @property
    def can_proceed_to_next(self):
        """Can unlock next level if passed"""
        return self.is_passed and self.status == 'COMPLETED'


class SubjectProgress(models.Model):
    """
    Tracks user's progression in a specific subject across levels
    Separate from overall level progression
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subject_progress')
    subject = models.ForeignKey('courses.Subject', on_delete=models.CASCADE)
    level = models.ForeignKey('courses.Level', on_delete=models.CASCADE)
    
    # Same fields as UserProgress
    STATUS_CHOICES = [
        ('LOCKED', 'Locked'),
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='LOCKED')
    
    total_activities = models.PositiveIntegerField(default=0)
    completed_activities = models.PositiveIntegerField(default=0)
    correct_answers = models.PositiveIntegerField(default=0)
    total_attempts = models.PositiveIntegerField(default=0)
    
    completion_percentage = models.FloatField(default=0.0)
    accuracy_percentage = models.FloatField(default=0.0)
    
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_activity_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'subject', 'level']
        ordering = ['subject', 'level__order']
        verbose_name = 'Subject Progress'
        verbose_name_plural = 'Subject Progress'
    
    def __str__(self):
        return f"{self.user.username} - {self.subject.title} {self.level.code}"


class ActivityAttempt(models.Model):
    """
    Records every attempt at every activity
    Used to track which activities were failed for re-integration
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='activity_attempts')
    activity = models.ForeignKey('activities.Activity', on_delete=models.CASCADE, related_name='attempts')
    
    # Answer tracking
    user_answer = models.JSONField()  # Store the actual answer given
    is_correct = models.BooleanField()
    points_earned = models.PositiveIntegerField(default=0)
    
    # Timing
    time_spent_seconds = models.PositiveIntegerField(null=True, blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True)
    
    # Attempt number (for same activity)
    attempt_number = models.PositiveIntegerField(default=1)
    
    # Session tracking
    session_id = models.UUIDField(null=True, blank=True)  # Groups attempts in same study session
    
    class Meta:
        ordering = ['-attempted_at']
        indexes = [
            models.Index(fields=['user', 'activity', '-attempted_at']),
            models.Index(fields=['user', '-attempted_at']),
        ]
        verbose_name = 'Activity Attempt'
        verbose_name_plural = 'Activity Attempts'
    
    def __str__(self):
        return f"{self.user.username} - Activity #{self.activity.pk} ({'✓' if self.is_correct else '✗'})"


class FailedActivityQueue(models.Model):
    """
    Queue of activities that user failed
    These are re-integrated in future sessions
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='failed_queue')
    activity = models.ForeignKey('activities.Activity', on_delete=models.CASCADE)
    level = models.ForeignKey('courses.Level', on_delete=models.CASCADE)
    subject = models.ForeignKey('courses.Subject', on_delete=models.CASCADE)
    
    # Tracking
    first_failed_at = models.DateTimeField(auto_now_add=True)
    times_failed = models.PositiveIntegerField(default=1)
    priority = models.PositiveIntegerField(default=1)  # Higher = show sooner (1-5)
    
    # Status
    is_resolved = models.BooleanField(default=False)  # True when user gets it right
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['user', 'activity']
        ordering = ['-priority', 'first_failed_at']
        verbose_name = 'Failed Activity Queue'
        verbose_name_plural = 'Failed Activity Queue'
    
    def __str__(self):
        return f"{self.user.username} - Activity #{self.activity.pk} (Failed {self.times_failed}x)"


class StudySession(models.Model):
    """
    Tracks individual study sessions (sets of exercises)
    Each session = 30 activities
    Users can do multiple sessions per level
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='study_sessions')
    
    # Session details
    level = models.ForeignKey('courses.Level', on_delete=models.CASCADE, null=True, blank=True)
    subject = models.ForeignKey('courses.Subject', on_delete=models.CASCADE, null=True, blank=True)
    
    # Session type
    SESSION_TYPE_CHOICES = [
        ('MIXED', 'Mixed (All Subjects)'),
        ('SUBJECT_FOCUSED', 'Subject Focused'),
        ('CUSTOM', 'Custom Practice'),
    ]
    session_type = models.CharField(max_length=20, choices=SESSION_TYPE_CHOICES, default='MIXED')
    
    # Set configuration
    target_activities = models.PositiveIntegerField(default=30)  # Usually 30 per set
    
    # Results
    activities_completed = models.PositiveIntegerField(default=0)
    correct_answers = models.PositiveIntegerField(default=0)
    accuracy_percentage = models.FloatField(default=0.0)
    total_points_earned = models.PositiveIntegerField(default=0)
    
    # Replay support
    initial_activity_queue = models.JSONField(null=True, blank=True, help_text="List of activity IDs for deterministic replay")
    
    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    
    # Outcome
    OUTCOME_CHOICES = [
        ('IN_PROGRESS', 'In Progress'),
        ('PASSED', 'Passed (>=80%)'),
        ('RETRY', 'Needs Retry (50-79%)'),
        ('DOWNGRADE', 'Downgrade Recommended (<50%)'),
        ('COMPLETED', 'Completed'),
    ]
    outcome = models.CharField(max_length=20, choices=OUTCOME_CHOICES, default='IN_PROGRESS')
    
    # Set number for this level
    set_number = models.PositiveIntegerField(default=1)  # 1st set, 2nd set, etc.
    
    class Meta:
        ordering = ['-started_at']
        verbose_name = 'Study Session'
        verbose_name_plural = 'Study Sessions'
    
    def __str__(self):
        subject_str = f" - {self.subject.title}" if self.subject else " (Mixed)"
        return f"{self.user.username} - {self.level.code if self.level else 'N/A'}{subject_str} - Set {self.set_number}"


class SubjectPerformanceSnapshot(models.Model):
    """
    Tracks performance breakdown by subject within mixed sessions
    Automatically created after each session to detect weaknesses
    """
    session = models.ForeignKey(StudySession, on_delete=models.CASCADE, related_name='subject_breakdown')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    level = models.ForeignKey('courses.Level', on_delete=models.CASCADE)
    subject = models.ForeignKey('courses.Subject', on_delete=models.CASCADE)
    
    # Performance metrics for this subject in this session
    total_activities = models.PositiveIntegerField(default=0)
    correct_answers = models.PositiveIntegerField(default=0)
    accuracy_percentage = models.FloatField(default=0.0)
    
    # Weakness indicators
    is_weak_area = models.BooleanField(default=False)  # True if accuracy < 60%
    needs_focus = models.BooleanField(default=False)  # True if multiple sessions show weakness
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['session', 'subject']
        ordering = ['accuracy_percentage']  # Weakest first
        verbose_name = 'Subject Performance Snapshot'
        verbose_name_plural = 'Subject Performance Snapshots'
    
    def __str__(self):
        return f"{self.user.username} - {self.subject.title} in Session {self.session.set_number} ({self.accuracy_percentage:.1f}%)"
    
    @property
    def strength_level(self):
        """Returns: STRONG, AVERAGE, WEAK"""
        if self.accuracy_percentage >= 75:
            return 'STRONG'
        elif self.accuracy_percentage >= 60:
            return 'AVERAGE'
        else:
            return 'WEAK'


class WeaknessAlert(models.Model):
    """
    Generated when system detects consistent weakness in a subject
    Shows recommendations to user
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='weakness_alerts')
    level = models.ForeignKey('courses.Level', on_delete=models.CASCADE)
    subject = models.ForeignKey('courses.Subject', on_delete=models.CASCADE)
    
    # Detection criteria
    sessions_analyzed = models.PositiveIntegerField()  # How many sessions detected this
    average_accuracy = models.FloatField()  # Average across sessions
    
    # Alert details
    SEVERITY_CHOICES = [
        ('MINOR', 'Minor Issue'),
        ('MODERATE', 'Needs Attention'),
        ('CRITICAL', 'Critical - Needs Focus'),
    ]
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    
    message = models.TextField()  # e.g., "Vous avez des difficultés avec la Grammaire au Niveau A1"
    recommendation = models.TextField()  # e.g., "Essayez un parcours Grammaire spécifique"
    
    # Status
    is_active = models.BooleanField(default=True)
    dismissed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'level', 'subject']
        ordering = ['-severity', '-created_at']
        verbose_name = 'Weakness Alert'
        verbose_name_plural = 'Weakness Alerts'
    
    def __str__(self):
        return f"{self.user.username} - {self.severity}: {self.subject.title} at {self.level.code}"
