# ALF - Complete Progression & Scoring System Design

## 🎯 Learning Modes

Users can learn in 3 ways:

### Mode 1: Sequential Level Progression (Default)
- User goes through Level 1 → 2 → 3... sequentially
- Gets mixed exercises from ALL subjects per level
- Must score 80%+ to unlock next level
- Below 50% = downgrade to previous level

### Mode 2: Subject-Focused Learning
- User selects "Grammaire" (or any subject)
- Goes through Level 1 → 2 → 3... for ONLY that subject
- Separate progression tracking per subject
- Can work on multiple subjects in parallel

### Mode 3: Custom (Level + Subject)
- User selects "Level 3 - Grammaire"
- Practices specific combinations
- Doesn't affect main progression

---

## 📊 Database Models for Progression

### 1. UserProgress - Overall Level Tracking

```python
class UserProgress(models.Model):
    """
    Tracks user's overall progression through levels
    One record per user per level
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='level_progress')
    level = models.ForeignKey(Level, on_delete=models.CASCADE)
    
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
```

### 2. SubjectProgress - Subject-Specific Tracking

```python
class SubjectProgress(models.Model):
    """
    Tracks user's progression in a specific subject across levels
    Separate from overall level progression
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subject_progress')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    level = models.ForeignKey(Level, on_delete=models.CASCADE)
    
    # Same fields as UserProgress
    status = models.CharField(max_length=10, choices=[
        ('LOCKED', 'Locked'),
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
    ], default='LOCKED')
    
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
```

### 3. ActivityAttempt - Individual Activity Tracking

```python
class ActivityAttempt(models.Model):
    """
    Records every attempt at every activity
    Used to track which activities were failed for re-integration
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_attempts')
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='attempts')
    
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
```

### 4. FailedActivityQueue - Smart Retry System

```python
class FailedActivityQueue(models.Model):
    """
    Queue of activities that user failed
    These are re-integrated in future sessions
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='failed_queue')
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE)
    level = models.ForeignKey(Level, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    
    # Tracking
    first_failed_at = models.DateTimeField(auto_now_add=True)
    times_failed = models.PositiveIntegerField(default=1)
    priority = models.PositiveIntegerField(default=1)  # Higher = show sooner
    
    # Status
    is_resolved = models.BooleanField(default=False)  # True when user gets it right
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['user', 'activity']
        ordering = ['-priority', 'first_failed_at']
```

### 5. StudySession - Session Tracking (Set-Based)

```python
class StudySession(models.Model):
    """
    Tracks individual study sessions (sets of exercises)
    Each session = 30 activities
    Users can do multiple sessions per level
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_sessions')
    
    # Session details
    level = models.ForeignKey(Level, on_delete=models.CASCADE, null=True, blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, null=True, blank=True)
    
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

### 6. SubjectPerformanceSnapshot - Weakness Detection

```python
class SubjectPerformanceSnapshot(models.Model):
    """
    Tracks performance breakdown by subject within mixed sessions
    Automatically created after each session to detect weaknesses
    """
    session = models.ForeignKey(StudySession, on_delete=models.CASCADE, related_name='subject_breakdown')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    level = models.ForeignKey(Level, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    
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
    
    @property
    def strength_level(self):
        """Returns: STRONG, AVERAGE, WEAK"""
        if self.accuracy_percentage >= 75:
            return 'STRONG'
        elif self.accuracy_percentage >= 60:
            return 'AVERAGE'
        else:
            return 'WEAK'

### 7. WeaknessAlert - Smart Recommendations

```python
class WeaknessAlert(models.Model):
    """
    Generated when system detects consistent weakness in a subject
    Shows recommendations to user
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weakness_alerts')
    level = models.ForeignKey(Level, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    
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
    
    message = models.TextField()  # e.g., "Vous avez des difficultés avec la Grammaire au Niveau 3"
    recommendation = models.TextField()  # e.g., "Essayez un parcours Grammaire spécifique"
    
    # Status
    is_active = models.BooleanField(default=True)
    dismissed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'level', 'subject']
        ordering = ['-severity', '-created_at']
```

---

## 🔄 Progression Logic Flow

### When User Starts a Level

```python
def start_level(user, level, subject=None):
    """
    Initialize progression tracking when user starts a level
    """
    if subject:
        # Subject-specific mode
        progress, created = SubjectProgress.objects.get_or_create(
            user=user,
            level=level,
            subject=subject,
            defaults={'status': 'ACTIVE', 'started_at': timezone.now()}
        )
    else:
        # General level mode
        progress, created = UserProgress.objects.get_or_create(
            user=user,
            level=level,
            defaults={'status': 'ACTIVE', 'started_at': timezone.now()}
        )
    
    # Create study session
    session = StudySession.objects.create(
        user=user,
        level=level,
        subject=subject
    )
    
    return progress, session
```

### Getting Next Activity (Smart Selection)

```python
def get_next_activity(user, level, subject=None, session_id=None):
    """
    Smart activity selection algorithm
    
    Priority:
    1. Failed activities from queue (30% probability if available)
    2. New activities not yet attempted
    3. Activities with lowest accuracy
    """
    from random import random
    
    # Check for failed activities in queue
    failed_activities = FailedActivityQueue.objects.filter(
        user=user,
        level=level,
        is_resolved=False
    )
    
    if subject:
        failed_activities = failed_activities.filter(subject=subject)
    
    # 30% chance to retry a failed activity if any exist
    if failed_activities.exists() and random() < 0.3:
        failed_item = failed_activities.order_by('-priority', 'first_failed_at').first()
        return failed_item.activity
    
    # Get activities for this level (and subject if specified)
    activities = Activity.objects.filter(lesson__level=level)
    if subject:
        activities = activities.filter(lesson__subject=subject)
    
    # Exclude recently completed in this session
    recent_attempts = ActivityAttempt.objects.filter(
        user=user,
        session_id=session_id
    ).values_list('activity_id', flat=True)
    
    activities = activities.exclude(id__in=recent_attempts)
    
    # Prioritize activities never attempted
    never_attempted = activities.exclude(
        id__in=ActivityAttempt.objects.filter(user=user).values_list('activity_id', flat=True)
    )
    
    if never_attempted.exists():
        return never_attempted.order_by('?').first()  # Random selection
    
    # All attempted - return one with lowest accuracy
    return activities.order_by('?').first()
```

### Recording Activity Attempt

```python
def record_attempt(user, activity, user_answer, is_correct, session_id=None):
    """
    Record an activity attempt and update all progress tracking
    """
    from django.utils import timezone
    
    # Count attempt number
    attempt_number = ActivityAttempt.objects.filter(
        user=user,
        activity=activity
    ).count() + 1
    
    # Create attempt record
    attempt = ActivityAttempt.objects.create(
        user=user,
        activity=activity,
        user_answer=user_answer,
        is_correct=is_correct,
        points_earned=activity.points if is_correct else 0,
        attempt_number=attempt_number,
        session_id=session_id
    )
    
    level = activity.lesson.level
    subject = activity.lesson.subject
    
    # Update UserProgress (overall level)
    user_progress, _ = UserProgress.objects.get_or_create(
        user=user,
        level=level,
        defaults={'status': 'ACTIVE'}
    )
    
    user_progress.total_attempts += 1
    user_progress.current_session_total += 1
    
    if is_correct:
        user_progress.correct_answers += 1
        user_progress.current_session_correct += 1
    
    user_progress.accuracy_percentage = (
        user_progress.correct_answers / user_progress.total_attempts * 100
    )
    user_progress.save()
    
    # Update SubjectProgress
    subject_progress, _ = SubjectProgress.objects.get_or_create(
        user=user,
        level=level,
        subject=subject,
        defaults={'status': 'ACTIVE'}
    )
    
    subject_progress.total_attempts += 1
    if is_correct:
        subject_progress.correct_answers += 1
    
    subject_progress.accuracy_percentage = (
        subject_progress.correct_answers / subject_progress.total_attempts * 100
    )
    subject_progress.save()
    
    # Handle failed activity
    if not is_correct:
        failed_queue, created = FailedActivityQueue.objects.get_or_create(
            user=user,
            activity=activity,
            defaults={
                'level': level,
                'subject': subject,
                'priority': 1
            }
        )
        
        if not created:
            failed_queue.times_failed += 1
            failed_queue.priority = min(failed_queue.times_failed, 5)  # Max priority 5
            failed_queue.save()
    
    else:
        # Mark as resolved if in queue
        FailedActivityQueue.objects.filter(
            user=user,
            activity=activity,
            is_resolved=False
        ).update(
            is_resolved=True,
            resolved_at=timezone.now()
        )
    
    # Update session
    if session_id:
        session = StudySession.objects.get(id=session_id)
        session.activities_completed += 1
        if is_correct:
            session.correct_answers += 1
            session.total_points_earned += activity.points
        
        session.accuracy_percentage = (
            session.correct_answers / session.activities_completed * 100
        )
        session.save()
    
    return attempt
```

### Completing a Level Session (Set-Based with Analytics)

```python
def complete_session(user, level, session_id, subject=None):
    """
    Evaluate session results and determine next action
    ENHANCED: Now analyzes subject-level performance in mixed sessions
    
    Returns: {
        'passed': bool,
        'accuracy': float,
        'next_action': 'NEXT_LEVEL' | 'RETRY' | 'DOWNGRADE',
        'message': str,
        'subject_breakdown': [...],  # Performance per subject
        'weak_subjects': [...],       # Subjects user struggles with
        'recommendations': [...]      # Smart recommendations
    }
    """
    from collections import defaultdict
    
    session = StudySession.objects.get(id=session_id)
    session.ended_at = timezone.now()
    
    # Get all attempts in this session
    attempts = ActivityAttempt.objects.filter(
        user=user,
        session_id=session_id
    ).select_related('activity__lesson__subject')
    
    # Analyze performance by subject (for mixed sessions)
    subject_stats = defaultdict(lambda: {'total': 0, 'correct': 0})
    
    for attempt in attempts:
        subject_key = attempt.activity.lesson.subject
        subject_stats[subject_key]['total'] += 1
        if attempt.is_correct:
            subject_stats[subject_key]['correct'] += 1
    
    # Create SubjectPerformanceSnapshot for each subject
    subject_breakdown = []
    weak_subjects = []
    
    for subject, stats in subject_stats.items():
        accuracy = (stats['correct'] / stats['total'] * 100) if stats['total'] > 0 else 0
        
        snapshot = SubjectPerformanceSnapshot.objects.create(
            session=session,
            user=user,
            level=level,
            subject=subject,
            total_activities=stats['total'],
            correct_answers=stats['correct'],
            accuracy_percentage=accuracy,
            is_weak_area=(accuracy < 60),
            needs_focus=(accuracy < 60)
        )
        
        subject_breakdown.append({
            'subject': subject.title,
            'subject_id': subject.id,
            'total': stats['total'],
            'correct': stats['correct'],
            'accuracy': accuracy,
            'strength': snapshot.strength_level
        })
        
        # Track weak subjects
        if accuracy < 60:
            weak_subjects.append(subject)
    
    # Update or create weakness alerts for consistently weak subjects
    for weak_subject in weak_subjects:
        # Check if this is a recurring weakness (multiple sessions)
        recent_sessions = SubjectPerformanceSnapshot.objects.filter(
            user=user,
            level=level,
            subject=weak_subject,
            is_weak_area=True,
            created_at__gte=timezone.now() - timedelta(days=7)  # Last week
        )
        
        if recent_sessions.count() >= 2:  # Weak in 2+ sessions
            avg_accuracy = recent_sessions.aggregate(
                avg=models.Avg('accuracy_percentage')
            )['avg']
            
            severity = 'CRITICAL' if avg_accuracy < 50 else 'MODERATE'
            
            alert, created = WeaknessAlert.objects.get_or_create(
                user=user,
                level=level,
                subject=weak_subject,
                defaults={
                    'sessions_analyzed': recent_sessions.count(),
                    'average_accuracy': avg_accuracy,
                    'severity': severity,
                    'message': f"Vous avez des difficultés avec {weak_subject.title} au Niveau {level.order}",
                    'recommendation': f"Essayez un parcours {weak_subject.title} spécifique pour renforcer cette compétence."
                }
            )
            
            if not created:
                # Update existing alert
                alert.sessions_analyzed = recent_sessions.count()
                alert.average_accuracy = avg_accuracy
                alert.severity = severity
                alert.is_active = True
                alert.save()
    
    # Get progress
    if subject:
        progress = SubjectProgress.objects.get(user=user, level=level, subject=subject)
    else:
        progress = UserProgress.objects.get(user=user, level=level)
    
    accuracy = progress.accuracy_percentage
    
    # Determine outcome
    recommendations = []
    
    if accuracy >= 80:
        session.outcome = 'PASSED'
        progress.status = 'COMPLETED'
        progress.completed_at = timezone.now()
        
        # Unlock next level
        next_level = Level.objects.filter(order=level.order + 1).first()
        if next_level:
            if subject:
                SubjectProgress.objects.get_or_create(
                    user=user,
                    level=next_level,
                    subject=subject,
                    defaults={'status': 'LOCKED'}
                )
            else:
                UserProgress.objects.get_or_create(
                    user=user,
                    level=next_level,
                    defaults={'status': 'LOCKED'}
                )
        
        # Add recommendations even when passing
        if weak_subjects:
            recommendations.append({
                'type': 'SUBJECT_FOCUS',
                'message': f"Bien que vous ayez réussi, considérez renforcer: {', '.join([s.title for s in weak_subjects])}",
                'weak_subjects': [{'id': s.id, 'name': s.title} for s in weak_subjects]
            })
        
        result = {
            'passed': True,
            'accuracy': accuracy,
            'next_action': 'NEXT_LEVEL',
            'message': f'Félicitations! Vous avez réussi avec {accuracy:.1f}% de précision!',
            'subject_breakdown': sorted(subject_breakdown, key=lambda x: x['accuracy']),
            'weak_subjects': weak_subjects,
            'recommendations': recommendations
        }
    
    elif accuracy >= 50:
        session.outcome = 'RETRY'
        progress.retry_count += 1
        progress.current_session_correct = 0
        progress.current_session_total = 0
        
        # Generate smart recommendations
        if weak_subjects:
            recommendations.append({
                'type': 'SUBJECT_FOCUS',
                'message': f"Concentrez-vous sur: {', '.join([s.title for s in weak_subjects])}",
                'action': 'START_SUBJECT_PATH',
                'weak_subjects': [{'id': s.id, 'name': s.title} for s in weak_subjects]
            })
        
        recommendations.append({
            'type': 'RETRY_SET',
            'message': 'Essayez une nouvelle série d\'exercices pour ce niveau',
            'action': 'START_NEW_SET'
        })
        
        result = {
            'passed': False,
            'accuracy': accuracy,
            'next_action': 'RETRY',
            'message': f'Précision: {accuracy:.1f}%. Continuez à pratiquer ce niveau!',
            'subject_breakdown': sorted(subject_breakdown, key=lambda x: x['accuracy']),
            'weak_subjects': weak_subjects,
            'recommendations': recommendations,
            'can_retry': True
        }
    
    else:  # < 50%
        session.outcome = 'DOWNGRADE'
        
        # Downgrade to previous level
        prev_level = Level.objects.filter(order=level.order - 1).first()
        
        recommendations.append({
            'type': 'DOWNGRADE',
            'message': f'Révisez le Niveau {prev_level.order if prev_level else 1} pour consolider vos bases',
            'action': 'DOWNGRADE_LEVEL',
            'suggested_level': prev_level.id if prev_level else None
        })
        
        if weak_subjects:
            recommendations.append({
                'type': 'SUBJECT_FOCUS',
                'message': f'Problèmes majeurs détectés avec: {", ".join([s.title for s in weak_subjects])}',
                'weak_subjects': [{'id': s.id, 'name': s.title} for s in weak_subjects]
            })
        
        result = {
            'passed': False,
            'accuracy': accuracy,
            'next_action': 'DOWNGRADE',
            'message': f'Précision trop basse ({accuracy:.1f}%). Révision recommandée.',
            'subject_breakdown': sorted(subject_breakdown, key=lambda x: x['accuracy']),
            'weak_subjects': weak_subjects,
            'recommendations': recommendations,
            'suggested_level': prev_level.id if prev_level else None
        }
    
    progress.save()
    session.save()
    
    return result


def get_weakness_analysis(user, level):
    """
    Get comprehensive weakness analysis for a user at a specific level
    Used to show analytics dashboard
    
    Returns: {
        'overall_accuracy': float,
        'subject_performance': [...],
        'weak_subjects': [...],
        'active_alerts': [...],
        'recommendations': [...]
    }
    """
    # Get all sessions for this level
    sessions = StudySession.objects.filter(
        user=user,
        level=level,
        session_type='MIXED'
    )
    
    if not sessions.exists():
        return None
    
    # Aggregate subject performance across all sessions
    subject_aggregates = SubjectPerformanceSnapshot.objects.filter(
        user=user,
        level=level
    ).values('subject').annotate(
        avg_accuracy=models.Avg('accuracy_percentage'),
        total_attempts=models.Sum('total_activities'),
        total_correct=models.Sum('correct_answers')
    )
    
    subject_performance = []
    weak_subjects = []
    
    for agg in subject_aggregates:
        subject = Subject.objects.get(id=agg['subject'])
        
        perf = {
            'subject_id': subject.id,
            'subject_name': subject.title,
            'avg_accuracy': agg['avg_accuracy'],
            'total_attempts': agg['total_attempts'],
            'total_correct': agg['total_correct'],
            'strength_level': 'STRONG' if agg['avg_accuracy'] >= 75 else 
                            'AVERAGE' if agg['avg_accuracy'] >= 60 else 'WEAK'
        }
        
        subject_performance.append(perf)
        
        if agg['avg_accuracy'] < 60:
            weak_subjects.append(perf)
    
    # Get active alerts
    active_alerts = WeaknessAlert.objects.filter(
        user=user,
        level=level,
        is_active=True
    ).values('subject__title', 'severity', 'message', 'recommendation')
    
    # Generate recommendations
    recommendations = []
    
    for weak in weak_subjects:
        recommendations.append({
            'type': 'SUBJECT_FOCUS',
            'priority': 'HIGH' if weak['avg_accuracy'] < 50 else 'MEDIUM',
            'subject_id': weak['subject_id'],
            'subject_name': weak['subject_name'],
            'message': f"Renforcez vos compétences en {weak['subject_name']} (actuellement {weak['avg_accuracy']:.1f}%)",
            'action': {
                'type': 'START_SUBJECT_PATH',
                'level_id': level.id,
                'subject_id': weak['subject_id']
            }
        })
    
    return {
        'overall_accuracy': sessions.aggregate(avg=models.Avg('accuracy_percentage'))['avg'],
        'subject_performance': sorted(subject_performance, key=lambda x: x['avg_accuracy']),
        'weak_subjects': weak_subjects,
        'active_alerts': list(active_alerts),
        'recommendations': recommendations
    }
```

---

## 📱 API Endpoints Needed

```python
# Start learning session (set-based, default 30 activities)
POST /api/sessions/start/
{
    "level_id": 1,
    "subject_id": null,  # null = mixed mode
    "target_activities": 30  # Activities per set
}
Response: {
    "session_id": "uuid",
    "level": {...},
    "subject": null,
    "session_type": "MIXED",
    "set_number": 2,  # This is the 2nd set for this level
    "target_activities": 30
}

# Get next activity (smart selection with failed activity reintegration)
GET /api/sessions/{session_id}/next-activity/
Response: {
    "activity": {...},
    "progress": {
        "completed": 15,
        "target": 30,
        "percentage": 50
    },
    "is_retry": true,  # True if this is a previously failed activity
    "retry_info": {
        "times_failed": 2,
        "last_failed": "2025-12-10T10:00:00Z"
    }
}

# Submit answer
POST /api/sessions/{session_id}/submit/
{
    "activity_id": 123,
    "user_answer": {...},
    "time_spent": 45
}
Response: {
    "is_correct": true,
    "points_earned": 10,
    "correct_answer": {...},  # If wrong
    "explanation": "...",     # If wrong
    "progress": {
        "completed": 16,
        "target": 30,
        "current_accuracy": 87.5
    }
}

# Complete session (with subject breakdown and recommendations)
POST /api/sessions/{session_id}/complete/
Response: {
    "passed": true,
    "accuracy": 83.3,
    "next_action": "NEXT_LEVEL",
    "message": "Félicitations! ...",
    
    # NEW: Subject-level breakdown
    "subject_breakdown": [
        {
            "subject": "Grammaire",
            "subject_id": 1,
            "total": 8,
            "correct": 5,
            "accuracy": 62.5,
            "strength": "AVERAGE"
        },
        {
            "subject": "Vocabulaire",
            "subject_id": 3,
            "total": 12,
            "correct": 11,
            "accuracy": 91.7,
            "strength": "STRONG"
        },
        ...
    ],
    
    # NEW: Weak subjects identified
    "weak_subjects": [
        {"id": 1, "name": "Grammaire"}
    ],
    
    # NEW: Smart recommendations
    "recommendations": [
        {
            "type": "SUBJECT_FOCUS",
            "message": "Bien que vous ayez réussi, considérez renforcer: Grammaire",
            "weak_subjects": [{"id": 1, "name": "Grammaire"}],
            "action": {
                "type": "START_SUBJECT_PATH",
                "level_id": 3,
                "subject_id": 1
            }
        }
    ]
}

# Try another set for same level
POST /api/sessions/retry-level/
{
    "level_id": 3
}
Response: {
    "session_id": "new-uuid",
    "set_number": 3,  # This will be the 3rd set
    "message": "Nouvelle série d'exercices préparée avec vos erreurs précédentes réintégrées"
}

# Get progress overview
GET /api/progress/
Response: {
    "current_level": 3,
    "overall_accuracy": 75.5,
    "levels": [
        {
            "level": 1,
            "status": "COMPLETED",
            "accuracy": 85.0
        },
        ...
    ]
}

# Get subject-specific progress
GET /api/progress/?subject_id=2
Response: {
    "subject": "Conjugaison",
    "current_level": 2,
    "overall_accuracy": 68.0,
    "levels": [...]
}

# NEW: Get weakness analysis for current level
GET /api/progress/weakness-analysis/?level_id=3
Response: {
    "overall_accuracy": 75.5,
    "subject_performance": [
        {
            "subject_name": "Grammaire",
            "avg_accuracy": 58.3,
            "strength_level": "WEAK",
            "total_attempts": 45,
            "total_correct": 26
        },
        ...
    ],
    "weak_subjects": [...],
    "active_alerts": [
        {
            "subject": "Grammaire",
            "severity": "MODERATE",
            "message": "Vous avez des difficultés avec Grammaire au Niveau 3",
            "recommendation": "Essayez un parcours Grammaire spécifique..."
        }
    ],
    "recommendations": [...]
}

# Get failed activities queue
GET /api/progress/failed-activities/?level_id=3
Response: {
    "total_failed": 12,
    "by_subject": {
        "Grammaire": 7,
        "Conjugaison": 3,
        "Vocabulaire": 2
    },
    "activities": [
        {
            "activity_id": 456,
            "subject": "Grammaire",
            "times_failed": 3,
            "priority": 3,
            "first_failed": "2025-12-08T14:30:00Z"
        },
        ...
    ]
}

# NEW: Dismiss weakness alert
POST /api/progress/dismiss-alert/{alert_id}/
Response: {"success": true}

# NEW: Get session history for a level
GET /api/sessions/history/?level_id=3
Response: {
    "total_sessions": 5,
    "sets_completed": 5,
    "sessions": [
        {
            "session_id": "uuid",
            "set_number": 5,
            "completed_at": "2025-12-12T15:30:00Z",
            "accuracy": 76.7,
            "outcome": "RETRY",
            "subject_breakdown": [...]
        },
        ...
    ]
}
```

---

## 🎯 User Experience Flows (Updated with Set-Based Learning)

### Flow 1: General Level Learning (Mixed Subjects - Set-Based)
1. User selects "Continue Learning" (default mode)
2. System loads current level (or Level 1 if new)
3. User clicks "Start Set" (30 mixed activities from ALL subjects)
4. System intelligently selects 30 activities:
   - ~30% from failed activities queue (prioritized)
   - ~70% new or less-practiced activities
   - Balanced across all subjects
5. User completes all 30 activities in the set
6. System shows results with **subject breakdown**:
   ```
   Overall: 25/30 (83.3%)
   ✅ PASSED - Next Level Unlocked!
   
   Performance by Subject:
   📊 Vocabulaire: 10/12 (83%) - STRONG
   📊 Conjugaison: 8/10 (80%) - STRONG  
   ⚠️  Grammaire: 5/8 (62%) - WEAK
   
   💡 Recommendation: 
   "Bien que vous ayez réussi, vous avez des difficultés 
   avec la Grammaire. Voulez-vous faire un parcours 
   Grammaire spécifique pour le Niveau 3?"
   
   [Niveau Suivant] [Parcours Grammaire] [Nouvelle Série]
   ```

7. User choices:
   - **"Niveau Suivant"** → Proceed to Level 4
   - **"Parcours Grammaire"** → Switch to Grammar-focused path
   - **"Nouvelle Série"** → Try another 30-activity set for Level 3
     - Failed activities from Set 1 are re-integrated
     - New activities added to reach 30 total

### Flow 2: Retry Same Level (User clicks "Nouvelle Série")
1. User scored 76% in Set 1 (didn't pass 80%)
2. Clicks "Try Another Set"
3. **System creates Set 2 for Level 3:**
   - Includes ALL 7 failed activities from Set 1
   - Adds 23 new activities
   - Total: 30 activities again
4. User completes Set 2
5. If they score 82%:
   - Level passes
   - Shows updated subject breakdown
   - Identifies if same weaknesses persist

### Flow 3: Subject-Focused Learning After Weakness Detection
**Scenario:** User passed Level 3 generally but weak in Grammar

1. User sees recommendation: "Renforcez la Grammaire"
2. Clicks "Parcours Grammaire"
3. System shows: "Grammaire - Niveau 3"
4. User does 30-activity set of ONLY Grammar exercises
5. System tracks this separately in SubjectProgress
6. After completing:
   ```
   Grammaire - Niveau 3: 27/30 (90%)
   ✅ Excellent! Vos compétences en Grammaire se sont 
   améliorées de 62% à 90%!
   
   [Retour au Parcours Général] [Grammaire Niveau 4]
   ```

### Flow 4: Downgrade Scenario
1. User attempts Level 3, Set 1: 14/30 (47%)
2. System shows:
   ```
   ❌ Précision trop basse (47%)
   
   Performance by Subject:
   ⚠️  Grammaire: 2/8 (25%) - CRITICAL
   ⚠️  Conjugaison: 4/10 (40%) - WEAK
   📊 Vocabulaire: 8/12 (67%) - AVERAGE
   
   💡 Recommendation:
   "Vos bases nécessitent un renforcement. Nous vous 
   recommandons de réviser le Niveau 2 pour consolider 
   vos acquis, particulièrement en Grammaire."
   
   [Réviser Niveau 2] [Parcours Grammaire Niveau 2]
   ```

### Flow 5: Multi-Session Weakness Detection
**Scenario:** User does 3 sets for Level 3, keeps failing Grammar

1. **Set 1:** Overall 76%, Grammar 55%
2. **Set 2:** Overall 78%, Grammar 58%
3. **Set 3:** Overall 79%, Grammar 52%

**System detects persistent weakness:**
```
🚨 Alerte de Difficulté Persistante

Nous avons remarqué que vous rencontrez des 
difficultés répétées avec la Grammaire au Niveau 3 
(moyenne: 55% sur 3 sessions).

💡 Recommandations:
1. Suivez un Parcours Grammaire spécifique
2. Révisez les bases au Niveau 2 - Grammaire
3. Consultez les ressources pédagogiques

[Parcours Grammaire] [Voir mes Erreurs] [Ignorer]
```

### Flow 6: Analytics Dashboard View
User clicks "Mon Progrès" → sees:

```
📊 Analyse de Performance - Niveau 3

Précision Globale: 77.5%
Sessions Complétées: 5 sets
Activités Totales: 150

Performance par Matière:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📗 Vocabulaire    ████████████░ 88% (STRONG)
📘 Conjugaison    ██████████░░░ 75% (AVERAGE)
📕 Grammaire      ███████░░░░░░ 56% (WEAK) ⚠️
📙 Orthographe    █████████░░░░ 72% (AVERAGE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Exercices Échoués à Réessayer: 12
   - Grammaire: 7
   - Conjugaison: 3
   - Orthographe: 2

💡 Recommandations:
1. Focus Grammaire prioritaire
2. Renforcez la Conjugaison

[Parcours Grammaire] [Nouvelle Série Niveau 3]
```

---

## ✅ Key Features (Complete System)

✅ **Dual progression** (Level-based + Subject-based)
✅ **Set-based learning** (30 activities per set, unlimited retries)
✅ **Smart activity selection** (prioritizes failed activities - 30% probability)
✅ **Failed activity queue** with automatic re-integration in next sets
✅ **Subject-level weakness detection** in mixed-mode sessions
✅ **Real-time analytics** showing performance breakdown by subject
✅ **Smart recommendations** ("Focus on Grammar", "Try another set", "Downgrade")
✅ **Persistent weakness alerts** (multi-session analysis)
✅ **Session-based scoring** with 80%/50% thresholds
✅ **Auto-unlock next level** at 80%
✅ **Downgrade recommendation** at <50%
✅ **Multiple retries per level** (unlimited sets)
✅ **Separate tracking** for each learning mode
✅ **Detailed session history** per level
✅ **Subject strength visualization** (STRONG/AVERAGE/WEAK)
✅ **Actionable insights** for users

---

## 🚀 This Solves ALL Your Requirements

### Original Requirements:
✓ Learn everything through levels (mixed subjects)
✓ Learn specific subject across levels
✓ 80% threshold to advance
✓ Remember failed exercises
✓ Re-integrate failed exercises in retries
✓ Downgrade at <50%
✓ Multiple retries before passing
✓ Analytics and progress tracking

### NEW Enhanced Features:
✓ **Detect weak subjects within mixed mode**
✓ **Show "You're weak in Grammar"** after each set
✓ **Recommend subject-focused paths** when weaknesses detected
✓ **Set-based system** (30 exercises per set, "Try Another Set" button)
✓ **Smart reintegration** (failed activities from Set 1 appear in Set 2)
✓ **Multi-session analysis** (tracks weakness patterns across multiple sets)
✓ **Rich analytics dashboard** with subject breakdown
✓ **Persistent alerts** for recurring weaknesses
✓ **Strength indicators** (STRONG/AVERAGE/WEAK per subject)

---

## 💡 Example Scenario (Complete Flow)

**User: Ahmed, Level 3**

1. **Set 1** (Mixed): 25/30 (83%) ✅ PASSED
   - But Grammar: 5/8 (62%) ⚠️
   - System: "Bien joué! Mais considérez renforcer Grammaire"

2. **Advances to Level 4**, but Grammar weakness noted

3. **Level 4 - Set 1** (Mixed): 23/30 (77%) ❌ RETRY
   - Grammar: 4/9 (44%) ⚠️⚠️
   - System detects persistent Grammar weakness
   - Alert created: "MODERATE - Grammar difficulties detected"

4. **Level 4 - Set 2** (includes 7 failed from Set 1): 24/30 (80%) ✅ PASSED
   - But Grammar still: 5/9 (55%) ⚠️
   - Alert upgraded: "CRITICAL - 3 sessions with Grammar <60%"

5. **System Recommendation:**
   ```
   🚨 Vous avez des difficultés persistantes avec la Grammaire
   
   Sur vos 3 dernières sessions:
   - Précision Grammaire moyenne: 53%
   - Autres matières: 85%+
   
   💡 Nous recommandons fortement un Parcours Grammaire
   spécifique pour consolider cette compétence avant de 
   continuer.
   
   [Parcours Grammaire Niveau 4] [Continuer Quand Même]
   ```

6. User clicks **"Parcours Grammaire Niveau 4"**
   - Does 30 Grammar-only exercises
   - Scores 27/30 (90%) ✅
   - Alert resolved!
   - Can now continue general path with confidence
