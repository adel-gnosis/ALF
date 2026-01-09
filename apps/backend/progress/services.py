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
from datetime import timedelta
from django.db import models, transaction
from django.utils import timezone
from django.db.models import Count, Q
import random
from collections import defaultdict

from progress.models import (
    Achievement, UserAchievement, UserProgress, SubjectProgress, StudySession, 
    ActivityAttempt, FailedActivityQueue, SubjectPerformanceSnapshot, WeaknessAlert
)
from courses.models import Level, Subject, Course
from activities.models import Activity
import logging

logger = logging.getLogger(__name__)

def _filter_by_ui_language(qs, user):
    """
    Meaning A:
    - supported_ui_languages = []  => universal (allow everyone)
    - supported_ui_languages != [] => allow only if user's native_language is inside
    """
    user_lang = getattr(user, "native_language", None) or "fr"
    return qs.filter(
        Q(supported_ui_languages=[]) | Q(supported_ui_languages__contains=[user_lang])
    )


def calculate_session_xp(session) -> int:
    # Simple, V1-safe formula
    base = int(session.activities_completed * 10)
    bonus = int(base * (session.accuracy_percentage / 100.0))
    return max(5, min(250, base + bonus))


def calculate_placement_xp(session) -> int:
    # Small reward so placement feels valuable, but not farmable
    return 30


def update_user_streak(user, practice_date):
    # practice_date is a date() (not datetime)
    last = user.last_practice_date

    if last == practice_date:
        return  # already counted today

    if last is None:
        user.current_streak = 1
    else:
        delta = (practice_date - last).days
        if delta == 1:
            user.current_streak += 1
        else:
            user.current_streak = 1

    user.last_practice_date = practice_date
    user.longest_streak = max(user.longest_streak, user.current_streak)


def award_achievement(user, code, session_id=None):
    ach = Achievement.objects.filter(code=code, is_active=True).first()
    if not ach:
        return None

    obj, created = UserAchievement.objects.get_or_create(
        user=user,
        achievement=ach,
        defaults={"session_id": session_id},
    )
    if not created:
        return None

    # Achievement XP reward (optional)
    if ach.xp_reward:
        user.total_xp += ach.xp_reward

    return {"code": ach.code, "title": ach.title, "xp_reward": ach.xp_reward}


def _pick_random_activity(qs, *, max_tries: int = 30):
    """
    Safely pick a random Activity from a queryset without using order_by('?').

    IMPORTANT:
    With django-polymorphic, some Activity rows can sometimes fail to "realize"
    into their concrete subclass (and can come back as None instead of an object).
    This helper skips those IDs and keeps trying.
    """
    ids = list(qs.values_list("id", flat=True))
    if not ids:
        return None

    tries = 0
    while ids and tries < max_tries:
        tries += 1
        pk = random.choice(ids)

        # Remove immediately so we don't retry the same bad id forever
        try:
            ids.remove(pk)
        except ValueError:
            pass

        try:
            obj = Activity.objects.get(pk=pk)
        except Activity.DoesNotExist:
            continue

        # Polymorphic "realize" failure (yes, it can happen)
        if obj is None:
            logger.warning(f"Polymorphic Activity id={pk} could not be realized; skipping.")
            continue

        return obj

    return None


def build_initial_activity_queue(
    user,
    level,
    subject,
    target_activities: int,
    review_ratio: float = 0.3,
    seed: int | None = None,
):
    """
    Build a deterministic queue for a new study session:
    - ~30% due reviews (FailedActivityQueue)
    - remainder new activities
    The final queue is frozen by being stored on StudySession.initial_activity_queue.
    """
    now = timezone.now()

    review_count = int(round(target_activities * review_ratio))
    review_count = max(0, min(target_activities, review_count))
    new_count = target_activities - review_count

    # 1) Due review candidates (respect SRS)
    due_failed_qs = FailedActivityQueue.objects.filter(
        user=user,
        level=level,
        subject=subject,
        is_resolved=False,
    ).filter(
        Q(next_review_at__isnull=True) | Q(next_review_at__lte=now)
    ).select_related('activity').order_by(
        '-priority',
        'next_review_at',
        'first_failed_at'
    )

    # ✅ NEW: filter out failed items that aren't supported by user's UI language
    user_lang = getattr(user, "native_language", None) or "fr"
    due_failed_qs = due_failed_qs.filter(
        Q(activity__supported_ui_languages=[]) |
        Q(activity__supported_ui_languages__contains=[user_lang])
    )


    due_review_ids = list(
        due_failed_qs.values_list('activity_id', flat=True)[:review_count]
    )

    # 2) New candidates: prefer activities user has never attempted
    attempted_counts = ActivityAttempt.objects.filter(
        user=user,
        activity__lesson__level=level,
    ).values('activity_id').annotate(c=Count('id'))

    if subject:
        attempted_counts = attempted_counts.filter(activity__lesson__subject=subject)

    attempted_map = {row['activity_id']: row['c'] for row in attempted_counts}

    # NOTE: Adjust these filters to match your Activity model flags (published/active/etc.)
    new_qs = Activity.objects.filter(
        lesson__level=level,
        lesson__is_published=True,
    ).exclude(id__in=due_review_ids)

    if subject:
        new_qs = new_qs.filter(lesson__subject=subject)

    # ✅ NEW: filter by UI language (Meaning A)
    new_qs = _filter_by_ui_language(new_qs, user)



    # Build list and sort by "attempted count" then stable id
    new_ids_all = list(new_qs.values_list('id', flat=True))
    new_ids_all.sort(key=lambda aid: (attempted_map.get(aid, 0), aid))

    # Take the least attempted set, then shuffle lightly for variety (seeded)
    chosen_new = new_ids_all[: max(new_count * 3, new_count)]  # pull a bit extra for randomness
    if seed is None:
        seed = random.randint(1, 10_000_000)
    rng = random.Random(seed)
    rng.shuffle(chosen_new)
    new_ids = chosen_new[:new_count]

    queue = due_review_ids + new_ids

    # final shuffle? No: keep reviews first for “warm up”.
    # But add a *small* interleave if you want:
    # - simple interleave: every 3 new insert 1 review; for V1 keep it simple.

    return queue, seed

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
        session_type = 'SUBJECT_FOCUSED'
    else:
        session_type = 'MIXED'

    
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
    
    # ✅ NEW: cap availability by UI language (Meaning A)
    available_count = _filter_by_ui_language(available_count, user)
    
    total_available = available_count.count()
    
    # Cap target at available count, but keep at least 1 if any exist
    if total_available > 0:
        target_activities = min(target_activities, total_available)
    
    # Create session
    queue, seed = build_initial_activity_queue(
        user=user,
        level=level,
        subject=subject,
        target_activities=target_activities,  # or session.target_activities
        review_ratio=0.3,
    )

    session = StudySession.objects.create(
        user=user,
        level=level,
        subject=subject,
        session_type=session_type,
        target_activities=target_activities,
        initial_activity_queue=queue,
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
    Deterministic session selection (V1):
    - The session has a frozen initial_activity_queue created at start_session()
    - Next activity is always queue[activities_completed]
    - No adaptive random selection during the session
    """
    user = session.user
    level = session.level
    subject = session.subject

    logger.info(
        f"Getting next activity for session {session.id}. "
        f"Completed: {session.activities_completed}/{session.target_activities}"
    )

    # Complete by target count
    if session.activities_completed >= session.target_activities:
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

    queue = session.initial_activity_queue or []

    # Backward compatibility: if queue is missing (older sessions), build it once
    if not queue:
        queue, seed = build_initial_activity_queue(
            user=user,
            level=level,
            subject=subject,
            target_activities=session.target_activities,
            review_ratio=0.3,
        )
        session.initial_activity_queue = queue
        session.save(update_fields=['initial_activity_queue'])

    idx = session.activities_completed
    if idx >= len(queue):
        # Safety: if queue shorter than target, consider session complete
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

    activity_id = queue[idx]

    try:
        activity = Activity.objects.select_related(
            "lesson",
            "lesson__level",
            "lesson__subject",
        ).only(
            "id",
            "lesson",
            "lesson__level",
            "lesson__subject",
        ).get(id=activity_id)

        user_lang = getattr(user, "native_language", None) or "fr"
        if activity.supported_ui_languages and user_lang not in activity.supported_ui_languages:
            logger.warning(
                f"Skipping activity {activity.id} due to unsupported UI language '{user_lang}'. "
                f"supported={activity.supported_ui_languages}"
            )
            # Mark as completed to avoid infinite loop, or rebuild queue (simpler: mark as completed)
            session.activities_completed += 1
            session.save(update_fields=["activities_completed"])
            return get_next_activity(session)


    except Activity.DoesNotExist:
        logger.error(f"Activity {activity_id} not found in queue for session {session.id}")
        return {
            'activity': None,
            'is_retry': False,
            'retry_info': None,
            'progress': {
                'completed': session.activities_completed,
                'target': session.target_activities,
                'percentage': (session.activities_completed / session.target_activities) * 100
            }
        }

    # is_retry is now informational: if activity is currently in failed queue & due, it's a retry
    now = timezone.now()
    fq = FailedActivityQueue.objects.filter(
        user=user,
        activity_id=activity_id,
        is_resolved=False,
    ).filter(
        Q(next_review_at__isnull=True) | Q(next_review_at__lte=now)
    ).first()

    is_retry = fq is not None
    retry_info = None
    if fq:
        retry_info = {
            'times_failed': fq.times_failed,
            'last_failed': fq.first_failed_at,
            'priority': fq.priority,
        }

    return {
        'activity': activity,
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
        
        queue = [a.activity_id for a in attempts]

        
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
def record_attempt(session, activity, user_answer, is_correct, time_spent=None, client_attempt_uuid=None):

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
    # Prevent concurrent submit increments
    session = StudySession.objects.select_for_update().get(id=session.id)

    user = session.user
    level = activity.lesson.level
    subject = activity.lesson.subject
    
    # Count attempt number for this activity
    attempt_number = ActivityAttempt.objects.filter(
        user=user,
        activity=activity
    ).count() + 1
    
    # Idempotency: if the client retries the same submission, return the existing attempt
    if client_attempt_uuid:
        existing = ActivityAttempt.objects.filter(client_attempt_uuid=client_attempt_uuid).first()
        if existing:
            # Important: do NOT update session/progress counters again
            session.refresh_from_db()
            return {
                'attempt': existing,
                'points_earned': existing.points_earned,
                'session_progress': {
                    'activities_completed': session.activities_completed,
                    'target_activities': session.target_activities,
                    'correct_answers': session.correct_answers,
                    'accuracy_percentage': session.accuracy_percentage,
                    'total_points_earned': session.total_points_earned,
                }
            }

    # Create activity attempt
    attempt = ActivityAttempt.objects.create(
        user=user,
        activity=activity,
        user_answer=user_answer,
        is_correct=is_correct,
        points_earned=activity.points if is_correct else 0,
        attempt_number=attempt_number,
        time_spent_seconds=time_spent,
        session_id=session.id,
        client_attempt_uuid=client_attempt_uuid
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
    
    # Handle failed activity + SRS-lite scheduling
    added_to_queue = False
    now = timezone.now()

    if not is_correct:
        failed_queue, created = FailedActivityQueue.objects.get_or_create(
            user=user,
            activity=activity,
            defaults={
                'level': level,
                'subject': subject,
                'priority': 1,

                # SRS defaults
                'next_review_at': now + timedelta(days=1),
                'interval_days': 1,
                'ease_factor': 2.5,
                'times_reviewed': 0,
                'last_reviewed_at': None,
                'last_outcome': False,
            }
        )

        if not created:
            failed_queue.times_failed += 1
            failed_queue.priority = min(failed_queue.times_failed, 5)  # Max priority 5
            failed_queue.is_resolved = False
            failed_queue.resolved_at = None

            # SRS on failure: reset interval, reduce ease, schedule soon
            failed_queue.ease_factor = max(1.3, (failed_queue.ease_factor or 2.5) - 0.2)
            failed_queue.interval_days = 1
            failed_queue.next_review_at = now + timedelta(days=1)
            failed_queue.last_reviewed_at = now
            failed_queue.last_outcome = False

            failed_queue.save()

        added_to_queue = True

    else:
        # On success: if it was in failed queue, schedule the next review (and optionally resolve after mastery)
        fq = FailedActivityQueue.objects.filter(
            user=user,
            activity=activity,
            is_resolved=False
        ).first()

        if fq:
            fq.times_reviewed += 1
            fq.last_reviewed_at = now
            fq.last_outcome = True

            fq.ease_factor = min(2.8, (fq.ease_factor or 2.5) + 0.1)

            # Increase interval (cap at 30 days)
            current_interval = fq.interval_days or 1
            new_interval = int(round(current_interval * fq.ease_factor))
            new_interval = max(1, min(30, new_interval))

            fq.interval_days = new_interval
            fq.next_review_at = now + timedelta(days=new_interval)

            # Lower priority slowly on success
            fq.priority = max(1, (fq.priority or 1) - 1)

            # "Mastered" rule (minimal): after 3 successful reviews and interval >= 14d, resolve it
            if fq.times_reviewed >= 3 and fq.interval_days >= 14:
                fq.is_resolved = True
                fq.resolved_at = now
                fq.next_review_at = None

            fq.save()

    
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

    # Idempotent completion: if already completed, return stored payload
    if session.completion_payload:
        return session.completion_payload

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

    # ======================
    # Gamification + achievements (V1)
    # ======================
    practice_date = timezone.localdate()
    xp_earned = calculate_session_xp(session)

    user.total_xp += xp_earned
    update_user_streak(user, practice_date)

    new_achievements = []
    # Basic achievements
    new_ach = award_achievement(user, "first_session", session_id=session.id)
    if new_ach:
        new_achievements.append(new_ach)

    if session.accuracy_percentage >= 100:
        new_ach = award_achievement(user, "perfect_session", session_id=session.id)
        if new_ach:
            new_achievements.append(new_ach)

    if user.current_streak >= 3:
        new_ach = award_achievement(user, "streak_3", session_id=session.id)
        if new_ach:
            new_achievements.append(new_ach)

    if user.current_streak >= 7:
        new_ach = award_achievement(user, "streak_7", session_id=session.id)
        if new_ach:
            new_achievements.append(new_ach)

    if user.total_xp >= 100:
        new_ach = award_achievement(user, "xp_100", session_id=session.id)
        if new_ach:
            new_achievements.append(new_ach)

    # sessions_10 (count completed sessions)
    completed_sessions = StudySession.objects.filter(user=user, outcome__in=["PASSED", "RETRY", "DOWNGRADE"]).count()
    if completed_sessions >= 10:
        new_ach = award_achievement(user, "sessions_10", session_id=session.id)
        if new_ach:
            new_achievements.append(new_ach)

    user.save(update_fields=["total_xp", "current_streak", "longest_streak", "last_practice_date"])

    # Inject into response payload
    result.update({
        "xp_earned": xp_earned,
        "total_xp": user.total_xp,
        "streak": {
            "current": user.current_streak,
            "longest": user.longest_streak,
            "last_practice_date": str(user.last_practice_date) if user.last_practice_date else None,
        },
        "new_achievements": new_achievements,
    })
    session.completion_payload = result
    session.completion_xp_awarded = True
    session.save(update_fields=["completion_payload", "completion_xp_awarded", "outcome", "ended_at"])


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
        
        qs = Activity.objects.filter(
            lesson__level=level,
            lesson__is_published=True
        ).exclude(id__in=attempted)

        # ✅ NEW: filter by UI language (Meaning A)
        qs = _filter_by_ui_language(qs, user)


        activity = _pick_random_activity(qs)

        
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
    def submit_placement_answer(session, activity, user_answer, is_correct, client_attempt_uuid=None):

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
        record_attempt(
            session,
            activity,
            user_answer,
            is_correct,
            client_attempt_uuid=client_attempt_uuid
        )

        
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
                session_id=session.id,
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
        
        # Build base response payload first
        result = {
            'determined_level': determined_level,
            'accuracy': accuracy,
            'unlocked_levels': unlocked_levels,
            'weakness_summary': weakness_summary,
            'message': f'Placement test complet! Niveau déterminé: {determined_level.cefr_code}'
        }

        # ======================
        # Placement XP (no streak)
        # ======================
        xp_earned = calculate_placement_xp(session)
        user.total_xp += xp_earned

        new_achievements = []
        new_ach = award_achievement(user, "placement_complete", session_id=session.id)
        if new_ach:
            new_achievements.append(new_ach)

        # award_achievement may add xp_reward, so save all changes
        user.save(update_fields=["total_xp", "current_streak", "longest_streak", "last_practice_date"])

        result.update({
            "xp_earned": xp_earned,
            "total_xp": user.total_xp,
            "new_achievements": new_achievements,
        })

        return result

