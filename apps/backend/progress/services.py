"""
Adaptive Learning Progression Services

This module contains all the core business logic for:
- Session management (starting sessions, tracking progress)
- Smart activity selection (30% retry probability)
- Attempt recording and progress updates
- Session completion with analytics
- Weakness detection and alerts
- Placement test system
"""

import uuid
import random
from datetime import timedelta
from django.db import models, transaction
from django.utils import timezone
from collections import defaultdict

from progress.models import (
    UserProgress, SubjectProgress, StudySession, 
    ActivityAttempt, FailedActivityQueue, SubjectPerformanceSnapshot, WeaknessAlert
)
from courses.models import Level, Subject, Course
from activities.models import Activity, Lesson
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# I. SESSION MANAGEMENT
# ============================================================================

def start_session(user, level_id, subject_id=None, target_activities=12):
    """
    Start a new study session (set-based learning)
    
    Args:
        user: User instance
        level_id: Level ID to practice
        subject_id: Optional subject ID for subject-focused mode
        target_activities: Number of activities (default: 12)
    """
    # Get level
    level = Level.objects.get(id=level_id)
    
    # Get subject if provided
    subject = None
    if subject_id:
        try:
            subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            subject = None
    
    # Determine session type
    if subject:
        session_type = 'subject_practice'
    else:
        session_type = 'adaptive_learning'
    
    # Calculate set number for this level (or level+subject combo)
    if subject:
        previous_sessions = StudySession.objects.filter(
            user=user,
            level=level,
            subject=subject
        ).count()
    else:
        previous_sessions = StudySession.objects.filter(
            user=user,
            level=level,
            session_type='MIXED'
        ).count()
    
    set_number = previous_sessions + 1
    
    # Calculate available activities count to cap target
    available_count = Activity.objects.filter(
        lesson__level=level,
        lesson__is_published=True
    )
    if subject:
        available_count = available_count.filter(lesson__subject=subject)
    
    total_available = available_count.count()
    
    # Cap target at available count, but keep at least 1 if any exist
    if total_available > 0:
        target_activities = min(target_activities, total_available)
    
    # Create session
    session = StudySession.objects.create(
        user=user,
        level=level,
        subject=subject,
        session_type=session_type,
        target_activities=target_activities,
        set_number=set_number
    )
    
    # Initialize or update progress tracking
    if subject:
        progress, created = SubjectProgress.objects.get_or_create(
            user=user,
            level=level,
            subject=subject,
            defaults={'status': 'ACTIVE', 'started_at': timezone.now()}
        )
        if created or progress.status == 'LOCKED':
            progress.status = 'ACTIVE'
            progress.started_at = timezone.now()
            progress.save()
    else:
        progress, created = UserProgress.objects.get_or_create(
            user=user,
            level=level,
            defaults={'status': 'ACTIVE', 'started_at': timezone.now()}
        )
        if created or progress.status == 'LOCKED':
            progress.status = 'ACTIVE'
            progress.started_at = timezone.now()
            progress.save()
    
    return {
        'session': session,
        'session_type': session_type,
        'set_number': set_number,
        'level': level,
        'subject': subject
    }


# ============================================================================
# II. ADAPTIVE ACTIVITY SELECTION ENGINE
# ============================================================================

def get_next_activity(session):
    """
    Smart activity selection with retry probability
    
    Priority:
    1. Failed activities from queue (30% probability if available)
    2. Unattempted activities for the level/subject
    3. Random selection weighted by difficulty
    
    Args:
        session: StudySession instance
    
    Returns:
        dict: {
            'activity': Activity instance or None,
            'is_retry': bool,
            'retry_info': dict or None,
            'progress': {
                'completed': int,
                'target': int,
                'percentage': float
            }
        }
    """
    user = session.user
    level = session.level
    subject = session.subject
    
    logger.info(f"Getting next activity for session {session.id}. Completed: {session.activities_completed}/{session.target_activities}")
    
    # Check if session is already complete
    if session.activities_completed >= session.target_activities:
        logger.info("Session complete by target count")
        return {
            'activity': None,
            'is_retry': False,
            'retry_info': None,
            'progress': {
                'completed': session.activities_completed,
                'target': session.target_activities,
                'percentage': 100.0
            }
        }
    
    # REPLAY MODE: Check if we are in replay mode (queue exists and we are following it)
    # We are in replay mode if initial_activity_queue is populated and we haven't finished it
    queue = session.initial_activity_queue or []
    
    if queue and session.activities_completed < len(queue):
        # Deterministic Replay
        activity_id = queue[session.activities_completed]
        logger.info(f"Replay mode: picking activity {activity_id} at index {session.activities_completed}")
        
        try:
            activity = Activity.objects.get(id=activity_id)
            return {
                'activity': activity,
                'is_retry': False, # It's a replay, but not a "retry" in the adaptive sense
                'retry_info': None,
                'progress': {
                    'completed': session.activities_completed,
                    'target': session.target_activities,
                    'percentage': (session.activities_completed / session.target_activities) * 100
                }
            }
        except Activity.DoesNotExist:
            logger.error(f"Activity {activity_id} from replay queue not found. Falling back to adaptive.")
    
    # NORMAL MODE (Adaptive)
    # -------------------------------------------------------------------------
    
    # Get activities already completed in this session
    session_attempts = ActivityAttempt.objects.filter(
        user=user,
        session_id=session.id
    ).values_list('activity_id', flat=True)
    
    selected_activity = None
    is_retry = False
    retry_info = None
    
    # 1. Check for failed activities (30% probability)
    failed_queue = FailedActivityQueue.objects.filter(
        user=user,
        level=level,
        is_resolved=False
    ).exclude(activity_id__in=session_attempts)
    
    if subject:
        failed_queue = failed_queue.filter(subject=subject)
    
    if not selected_activity and failed_queue.exists() and random.random() < 0.3:
        # Select failed activity with highest priority
        failed_item = failed_queue.order_by('-priority', 'first_failed_at').first()
        logger.info(f"Selected failed activity {failed_item.activity.id}")
        
        selected_activity = failed_item.activity
        is_retry = True
        retry_info = {
            'times_failed': failed_item.times_failed,
            'last_failed': failed_item.first_failed_at,
            'priority': failed_item.priority
        }
    
    # 2. Get pool of available activities
    if not selected_activity:
        activities = Activity.objects.filter(
            lesson__level=level,
            lesson__is_published=True
        ).exclude(id__in=session_attempts)
        
        if subject:
            activities = activities.filter(lesson__subject=subject)
        
        count = activities.count()
        logger.info(f"Available activities pool: {count}")
        
        if not activities.exists():
            logger.warning(f"No activities found for level {level.id} subject {subject.id if subject else 'ALL'}")
            return {
                'activity': None,
                'is_retry': False,
                'retry_info': None,
                'progress': {
                    'completed': session.activities_completed,
                    'target': session.target_activities,
                    'percentage': 100.0
                }
            }
        
        # 3. Prioritize unattempted activities
        attempted_by_user = ActivityAttempt.objects.filter(
            user=user
        ).values_list('activity_id', flat=True)
        
        unattempted = activities.exclude(id__in=attempted_by_user)
        
        if unattempted.exists():
            selected_activity = unattempted.order_by('?').first()
            if selected_activity:
                logger.info(f"Selected unattempted activity {selected_activity.id}")
            else:
                logger.warning("Unattempted queryset was non-empty but returned None on first(). Falling back to activities pool.")
        else:
            selected_activity = None

        if not selected_activity:
            selected_activity = activities.order_by('?').first()
            if selected_activity:
                logger.info(f"Selected re-attempt of activity {selected_activity.id}")
            else:
                logger.error("Activities pool returned None on first() — cannot select next activity.")
                return {
                    'activity': None,
                    'is_retry': False,
                    'retry_info': None,
                    'progress': {
                        'completed': session.activities_completed,
                        'target': session.target_activities,
                        'percentage': 100.0
                    }
                }


    # RECORDING: Append to queue for future replay
    if selected_activity:
        if session.initial_activity_queue is None:
            session.initial_activity_queue = []
        
        # Only append if we are not replaying (obvious, since we are in normal mode block)
        # And ensure we don't have duplicates if something weird happens
        if str(selected_activity.id) not in [str(x) for x in session.initial_activity_queue]:
             session.initial_activity_queue.append(str(selected_activity.id))
             session.save(update_fields=['initial_activity_queue'])
    
    return {
        'activity': selected_activity,
        'is_retry': is_retry,
        'retry_info': retry_info,
        'progress': {
            'completed': session.activities_completed,
            'target': session.target_activities,
            'percentage': (session.activities_completed / session.target_activities) * 100
        }
    }


def reset_session_for_replay(session):
    """
    Resets a session to allow replaying the exact same activities.
    1. Ensures replay queue is populated (from old attempts if needed)
    2. Deletes old attempts
    3. Resets session stats
    """
    # 1. Ensure queue is populated
    if not session.initial_activity_queue:
        # Reconstruct from attempts (ordered by creation)
        attempts = ActivityAttempt.objects.filter(
            session_id=session.id
        ).order_by('attempted_at')
        
        queue = [str(a.activity_id) for a in attempts]
        
        # Deduplicate preserving order just in case
        seen = set()
        clean_queue = []
        for q in queue:
            if q not in seen:
                clean_queue.append(q)
                seen.add(q)
                
        session.initial_activity_queue = clean_queue
        session.save()
        logger.info(f"Reconstructed replay queue for session {session.id}: {len(clean_queue)} items")

    # 2. Delete old attempts for this session
    ActivityAttempt.objects.filter(session_id=session.id).delete()
    
    # 3. Reset session stats
    session.activities_completed = 0
    session.correct_answers = 0
    session.accuracy_percentage = 0.0
    session.total_points_earned = 0
    session.outcome = 'IN_PROGRESS'
    session.ended_at = None
    session.duration_seconds = None
    session.save()
    
    return session


# ============================================================================
# III. ACTIVITY ATTEMPT RECORDING
# ============================================================================

@transaction.atomic
def record_attempt(session, activity, user_answer, is_correct, time_spent=None):
    """
    Record an activity attempt and update all progress tracking
    
    Args:
        session: StudySession instance
        activity: Activity instance
        user_answer: User's answer (any JSON-serializable type)
        is_correct: Boolean
        time_spent: Optional time in seconds
    
    Returns:
        dict: {
            'attempt': ActivityAttempt instance,
            'points_earned': int,
            'session_progress': dict,
            'added_to_queue': bool (if failed)
        }
    """
    user = session.user
    level = activity.lesson.level
    subject = activity.lesson.subject
    
    # Count attempt number for this activity
    attempt_number = ActivityAttempt.objects.filter(
        user=user,
        activity=activity
    ).count() + 1
    
    # Create activity attempt
    attempt = ActivityAttempt.objects.create(
        user=user,
        activity=activity,
        user_answer=user_answer,
        is_correct=is_correct,
        points_earned=activity.points if is_correct else 0,
        attempt_number=attempt_number,
        time_spent_seconds=time_spent,
        session_id=session.id
    )
    
    # Update session stats
    session.activities_completed += 1
    if is_correct:
        session.correct_answers += 1
        session.total_points_earned += activity.points
    
    session.accuracy_percentage = (
        (session.correct_answers / session.activities_completed) * 100
        if session.activities_completed > 0 else 0
    )
    session.save()
    
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
        (user_progress.correct_answers / user_progress.total_attempts) * 100
        if user_progress.total_attempts > 0 else 0
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
        (subject_progress.correct_answers / subject_progress.total_attempts) * 100
        if subject_progress.total_attempts > 0 else 0
    )
    subject_progress.save()
    
    # Handle failed activity
    added_to_queue = False
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
            failed_queue.is_resolved = False  # Unresolved if failed again
            failed_queue.save()
        
        added_to_queue = True
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
    
    return {
        'attempt': attempt,
        'points_earned': activity.points if is_correct else 0,
        'session_progress': {
            'completed': session.activities_completed,
            'target': session.target_activities,
            'current_accuracy': session.accuracy_percentage
        },
        'added_to_queue': added_to_queue
    }


# ============================================================================
# IV. SESSION COMPLETION & ANALYTICS
# ============================================================================

@transaction.atomic
def complete_session(session):
    """
    Complete a session and generate analytics
    
    Returns:
        dict: {
            'passed': bool,
            'accuracy': float,
            'outcome': str,
            'next_action': str,
            'message': str,
            'subject_breakdown': list,
            'weak_subjects': list,
            'recommendations': list,
            'suggested_level': int or None
        }
    """
    user = session.user
    level = session.level
    subject = session.subject
    
    # Mark session as ended
    session.ended_at = timezone.now()
    if session.started_at:
        duration = (session.ended_at - session.started_at).total_seconds()
        session.duration_seconds = int(duration)
    
    # Get all attempts in this session
    attempts = ActivityAttempt.objects.filter(
        user=user,
        session_id=session.id
    ).select_related('activity__lesson__subject')
    
    # Analyze performance by subject
    subject_stats = defaultdict(lambda: {'total': 0, 'correct': 0})
    
    for attempt in attempts:
        subject_key = attempt.activity.lesson.subject
        subject_stats[subject_key]['total'] += 1
        if attempt.is_correct:
            subject_stats[subject_key]['correct'] += 1
    
    # Create SubjectPerformanceSnapshot for each subject
    subject_breakdown = []
    weak_subjects = []
    
    for subj, stats in subject_stats.items():
        accuracy = (stats['correct'] / stats['total'] * 100) if stats['total'] > 0 else 0
        
        snapshot, created = SubjectPerformanceSnapshot.objects.update_or_create(
            session=session,
            subject=subj,
            defaults={
                'user': user,
                'level': level,
                'total_activities': stats['total'],
                'correct_answers': stats['correct'],
                'accuracy_percentage': accuracy,
                'is_weak_area': (accuracy < 60),
                'needs_focus': (accuracy < 60)
            }
        )
        
        subject_breakdown.append({
            'subject': subj.title,
            'subject_id': subj.id,
            'total': stats['total'],
            'correct': stats['correct'],
            'accuracy': accuracy,
            'strength': snapshot.strength_level
        })
        
        if accuracy < 60:
            weak_subjects.append(subj)
    
    # Update or create weakness alerts
    for weak_subject in weak_subjects:
        recent_sessions = SubjectPerformanceSnapshot.objects.filter(
            user=user,
            level=level,
            subject=weak_subject,
            is_weak_area=True,
            created_at__gte=timezone.now() - timedelta(days=7)
        )
        
        if recent_sessions.count() >= 2:
            avg_accuracy = recent_sessions.aggregate(
                avg=models.Avg('accuracy_percentage')
            )['avg']
            
            severity = 'CRITICAL' if avg_accuracy < 50 else 'MODERATE'
            
            alert, created = WeaknessAlert.objects.update_or_create(
                user=user,
                level=level,
                subject=weak_subject,
                defaults={
                    'sessions_analyzed': recent_sessions.count(),
                    'average_accuracy': avg_accuracy,
                    'severity': severity,
                    'message': f"Vous avez des difficultés avec {weak_subject.title} au Niveau {level.cefr_code}",
                    'recommendation': f"Essayez un parcours {weak_subject.title} spécifique pour renforcer cette compétence.",
                    'is_active': True
                }
            )
    
    # Get progress
    if subject:
        progress = SubjectProgress.objects.get(user=user, level=level, subject=subject)
    else:
        progress = UserProgress.objects.get(user=user, level=level)
    
    accuracy = session.accuracy_percentage
    recommendations = []
    
    # Determine outcome
    if accuracy >= 70:
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
                UserProgress.objects.update_or_create(
                    user=user,
                    level=next_level,
                    defaults={'status': 'ACTIVE'} # Unlock immediately
                )
        
        # Recalculate overall progress for this level
        total_attempts = ActivityAttempt.objects.filter(
             user=user, 
             activity__lesson__level=level, 
             is_correct=True
        ).count()
        
        total_activities = Activity.objects.filter(
            lesson__level=level, 
            lesson__is_published=True
        ).count()
        
        if total_activities > 0:
            progress.completion_percentage = min((total_attempts / total_activities) * 100, 100)
            progress.save()
            recommendations.append({
                'type': 'SUBJECT_FOCUS',
                'message': f"Bien que vous ayez réussi, considérez renforcer: {', '.join([s.title for s in weak_subjects])}",
                'weak_subjects': [{'id': s.id, 'name': s.title} for s in weak_subjects]
            })
        
        result = {
            'passed': True,
            'accuracy': accuracy,
            'outcome': 'PASSED',
            'next_action': 'NEXT_LEVEL',
            'message': f'Félicitations! Vous avez réussi avec {accuracy:.1f}% de précision!',
            'subject_breakdown': sorted(subject_breakdown, key=lambda x: x['accuracy']),
            'weak_subjects': weak_subjects,
            'recommendations': recommendations,
            'suggested_level': next_level.id if next_level else None
        }
    
    elif accuracy >= 50:
        session.outcome = 'RETRY'
        progress.retry_count += 1
        
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
            'outcome': 'RETRY',
            'next_action': 'RETRY',
            'message': f'Précision: {accuracy:.1f}%. Continuez à pratiquer ce niveau!',
            'subject_breakdown': sorted(subject_breakdown, key=lambda x: x['accuracy']),
            'weak_subjects': weak_subjects,
            'recommendations': recommendations,
            'can_retry': True,
            'suggested_level': None
        }
    
    else:  # < 50%
        session.outcome = 'DOWNGRADE'
        
        prev_level = Level.objects.filter(order=level.order - 1).first()
        
        recommendations.append({
            'type': 'DOWNGRADE',
            'message': f'Révisez le Niveau {prev_level.cefr_code if prev_level else level.cefr_code} pour consolider vos bases',
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
            'outcome': 'DOWNGRADE',
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


# ============================================================================
# V. WEAKNESS ANALYSIS
# ============================================================================

def get_weakness_analysis(user, level):
    """
    Get comprehensive weakness analysis for a user at a specific level
    
    Returns:
        dict: {
            'overall_accuracy': float,
            'subject_performance': list,
            'weak_subjects': list,
            'active_alerts': list,
            'recommendations': list
        }
    """
    sessions = StudySession.objects.filter(
        user=user,
        level=level,
        session_type='MIXED'
    )
    
    if not sessions.exists():
        return None
    
    # Aggregate subject performance
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


# ============================================================================
# VI. PLACEMENT TEST SYSTEM
# ============================================================================

class PlacementTest:
    """Adaptive placement test using binary search approach"""
    
    @staticmethod
    def start_placement_test(user, course_id=None):
        """
        Start a placement test for a specific course
        
        Returns:
            dict: {
                'session_id': UUID,
                'current_level': Level,
                'questions_completed': 0,
                'max_questions': 12
            }
        """
        # Start at median level of the specified course
        levels_query = Level.objects.all().order_by('order')
        
        if course_id:
            levels_query = levels_query.filter(course_id=course_id)
        else:
            # Fallback: try to guess or use first course
            first_course = Course.objects.order_by('order').first()
            if first_course:
                levels_query = levels_query.filter(course=first_course)
                
        levels = list(levels_query)
        
        if not levels:
             raise ValueError("No levels found for placement test")

        median_index = len(levels) // 2
        starting_level = levels[median_index]
        
        # Create placement session
        session = StudySession.objects.create(
            user=user,
            level=starting_level,
            session_type='CUSTOM',
            target_activities=12,  # 12 questions for placement
            set_number=0  # 0 indicates placement test
        )
        
        return {
            'session_id': session.id,
            'current_level': starting_level,
            'questions_completed': 0,
            'max_questions': 12
        }
    
    @staticmethod
    def get_placement_question(session):
        """
        Get next placement test question
        
        Uses adaptive selection based on previous answers
        """
        user = session.user
        level = session.level
        
        # Check if session is already complete
        if session.activities_completed >= session.target_activities:
            return {
                'activity': None,
                'current_level': level,
                'progress': {
                    'completed': session.activities_completed,
                    'max_questions': session.target_activities
                }
            }

        # Get random activity from current level (not yet attempted in this session)
        attempted = ActivityAttempt.objects.filter(
            user=user,
            session_id=session.id
        ).values_list('activity_id', flat=True)
        
        activity = Activity.objects.filter(
            lesson__level=level,
            lesson__is_published=True
        ).exclude(id__in=attempted).order_by('?').first()
        
        return {
            'activity': activity,
            'current_level': level,
            'progress': {
                'completed': session.activities_completed,
                'max_questions': session.target_activities
            }
        }
    
    @staticmethod
    @transaction.atomic
    def submit_placement_answer(session, activity, user_answer, is_correct):
        """
        Submit placement test answer and adjust level
        
        Returns:
            dict: {
                'is_correct': bool,
                'new_level': Level or None,
                'leveled_up': bool,
                'leveled_down': bool
            }
        """
        user = session.user
        current_level = session.level
        
        # Record attempt
        record_attempt(session, activity, user_answer, is_correct)
        
        # Adjust level based on correctness
        levels = list(Level.objects.all().order_by('order'))
        current_index = next(i for i, l in enumerate(levels) if l.id == current_level.id)
        
        leveled_up = False
        leveled_down = False
        new_level = current_level
        
        if is_correct and current_index < len(levels) - 1:
            # Jump up
            new_level = levels[current_index + 1]
            session.level = new_level
            session.save()
            leveled_up = True
        
        elif not is_correct and current_index > 0:
            # Jump down
            new_level = levels[current_index - 1]
            session.level = new_level
            session.save()
            leveled_down = True
        
        return {
            'is_correct': is_correct,
            'new_level': new_level,
            'leveled_up': leveled_up,
            'leveled_down': leveled_down
        }
    
    @staticmethod
    @transaction.atomic
    def complete_placement_test(session):
        """
        Complete placement test and determine starting level
        
        Returns:
            dict: {
                'determined_level': Level,
                'accuracy': float,
                'unlocked_levels': list,
                'weakness_summary': dict
            }
        """
        user = session.user
        determined_level = session.level
        
        # Mark session as complete
        session.outcome = 'COMPLETED'
        session.ended_at = timezone.now()
        session.save()
        
        # Unlock all levels up to and including determined level
        # Calculate final accuracy
        correct_count = session.correct_answers
        total_count = session.activities_completed
        accuracy = (correct_count / total_count * 100) if total_count > 0 else 0
        
        # Unlock all levels up to and including the determined level
        all_levels = Level.objects.filter(order__lte=determined_level.order).order_by('order')
        unlocked_levels = []
        
        for level in all_levels:
            user_progress, created = UserProgress.objects.get_or_create(
                user=session.user,
                level=level,
                defaults={'status': 'ACTIVE' if level.id == determined_level.id else 'COMPLETED'}
            )
            
            # If already exists and it's below determined level, mark as completed
            if not created and level.order < determined_level.order:
                if user_progress.status != 'COMPLETED':
                    user_progress.status = 'COMPLETED'
                    user_progress.is_passed = True
                    user_progress.save()
            
            # If it's the determined level, make sure it's active
            if level.id == determined_level.id and user_progress.status != 'ACTIVE':
                user_progress.status = 'ACTIVE'
                user_progress.save()
            
            unlocked_levels.append(level)
        
        # Get weakness summary by subject
        weakness_summary = []
        subjects = Subject.objects.all()
        
        for subject in subjects:
            subject_attempts = ActivityAttempt.objects.filter(
                session=session,
                activity__lesson__subject=subject
            )
            
            if subject_attempts.exists():
                total = subject_attempts.count()
                correct = subject_attempts.filter(is_correct=True).count()
                accuracy_pct = (correct / total * 100) if total > 0 else 0
                
                strength = 'STRONG' if accuracy_pct >= 80 else 'WEAK' if accuracy_pct < 50 else 'AVERAGE'
                
                weakness_summary.append({
                    'subject': subject.title,
                    'subject_id': subject.id,
                    'total': total,
                    'correct': correct,
                    'accuracy': accuracy_pct,
                    'strength': strength
                })
        
        # Mark session as complete
        session.ended_at = timezone.now()
        session.outcome = 'COMPLETED'
        session.save()
        
        return {
            'determined_level': determined_level,
            'accuracy': accuracy,
            'unlocked_levels': unlocked_levels,
            'weakness_summary': weakness_summary,
            'message': f'Placement test complet! Niveau déterminé: {determined_level.cefr_code}'
        }
