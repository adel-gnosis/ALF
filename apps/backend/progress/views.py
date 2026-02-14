import uuid
from rest_framework import views, viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext as _

from .models import (
    UserProgress, SubjectProgress, StudySession, FailedActivityQueue, WeaknessAlert
)
from .serializers import *
from .services import (
    create_rehearsal_missed_session, start_session, get_next_activity, record_attempt, complete_session,
    get_weakness_analysis, PlacementTest, reset_session_for_replay
)
from activities.models import (
    Activity, DicteeActivity, MCQActivity, FillBlankActivity, MatchingActivity,
    ConjugationActivity, DragOrderActivity, MultipleAnswerActivity, TextInputActivity
)
from courses.models import Level



def _matching_expected_map(activity, user_lang: str) -> dict:
    """
    Returns: {pair_id: expected_right_value_for_current_language}
    We compare against what the student sees/should match.
    """
    expected = {}
    for pair in (getattr(activity, "pairs_v2", None) or []):
        if not isinstance(pair, dict):
            continue
        pid = (pair.get("id") or "").strip()
        left = pair.get("left") or {}
        right = pair.get("right") or {}
        if not pid or not isinstance(left, dict) or not isinstance(right, dict):
            continue

        right_value = (right.get("value") or "").strip()

        # Fix: The expected "right" value is what is displayed on the right side.
        # This comes from the 'right' object's i18n or value, NOT the 'left' object.
        i18n = right.get("i18n") or {}
        if isinstance(i18n, dict) and isinstance(i18n.get(user_lang), str) and i18n.get(user_lang).strip():
            expected[pid] = i18n[user_lang].strip()
        else:
            expected[pid] = right_value

    return expected


def _parse_matching_answer(user_answer):
    """
    Supports BOTH:
    - new format: {"matches":[{"pair_id":"p_001","right_value":"and"}, ...]}
    - legacy format: {"fr_left":"and", ...}

    Returns tuple: (mode, parsed)
      mode="v2" -> parsed is {pair_id: right_value}
      mode="legacy" -> parsed is dict 그대로
      mode="invalid" -> parsed is None
    """
    if isinstance(user_answer, dict) and isinstance(user_answer.get("matches"), list):
        out = {}
        for i, m in enumerate(user_answer["matches"]):
            if not isinstance(m, dict):
                return "invalid", None
            pid = m.get("pair_id")
            rv = m.get("right_value")
            if not isinstance(pid, str) or not pid.strip():
                return "invalid", None
            if not isinstance(rv, str):
                return "invalid", None
            out[pid.strip()] = rv.strip()
        return "v2", out

    # legacy dict
    if isinstance(user_answer, dict):
        return "legacy", user_answer

    return "invalid", None

# ============================================================================
# SESSION ENDPOINTS
# ============================================================================

class SessionViewSet(viewsets.ViewSet):
    """Session management endpoints"""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'], url_path='start')
    def start(self, request):
        """POST /api/sessions/start/ - Start a new session"""
        serializer = StartSessionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        result = start_session(
            user=request.user,
            level_id=serializer.validated_data['level_id'],
            subject_id=serializer.validated_data.get('subject_id'),
            target_activities=serializer.validated_data.get('target_activities', 12)
        )
        
        response_data = {
            'session_id': result['session'].id,
            'session_type': result['session_type'],
            'set_number': result['set_number'],
            'level': result['level'],
            'subject': result['subject'],
            'message': f"Session démarrée: Série {result['set_number']} - {result['level'].title}"
        }
        
        return Response(
            StartSessionResponseSerializer(response_data).data,
            status=status.HTTP_201_CREATED
        )

    def retrieve(self, request, pk=None):
        """GET /api/sessions/{id}/ - Get session details"""
        session = get_object_or_404(StudySession, id=pk, user=request.user)
        return Response(StudySessionDetailSerializer(session).data)
    
    @action(detail=True, methods=["post"], url_path="rehearse-missed")
    def rehearse_missed(self, request, pk=None):
        """
        POST /api/sessions/{id}/rehearse-missed/
        Creates a rehearsal session that contains ONLY the missed activities from this session.
        Does NOT affect progress, XP, or SRS.
        """
        source_session = get_object_or_404(StudySession, id=pk, user=request.user)

        result = create_rehearsal_missed_session(source_session=source_session)

        if result["session"] is None:
            return Response(
                {"detail": "No missed activities to rehearse."},
                status=status.HTTP_200_OK
            )

        rehearsal = result["session"]

        response_data = {
            "session_id": rehearsal.id,
            "session_type": rehearsal.session_type,
            "set_number": rehearsal.set_number,
            "level": rehearsal.level,
            "subject": rehearsal.subject,
            "missed_count": result["missed_count"],
            "message": f"Répétition: {result['missed_count']} activités ratées (sans impact sur la progression)."
        }

        return Response(
            StartSessionResponseSerializer(response_data).data,
            status=status.HTTP_201_CREATED
        )

    
    @action(detail=True, methods=['get'], url_path='next-activity')
    def next_activity(self, request, pk=None):
        """GET /api/sessions/{id}/next-activity/ - Get next activity"""
        session = get_object_or_404(StudySession, id=pk, user=request.user)
        
        result = get_next_activity(session)
        
        response_data = {
            'activity': result['activity'],
            'is_retry': result['is_retry'],
            'retry_info': result['retry_info'],
            'progress': result['progress'],
            'session_complete': result['activity'] is None
        }
        
        return Response(NextActivityResponseSerializer(response_data, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """POST /api/sessions/{id}/submit/ - Submit activity answer"""
        session = get_object_or_404(StudySession, id=pk, user=request.user)
        
        serializer = SubmitActivityRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        activity = get_object_or_404(Activity, id=serializer.validated_data['activity_id'])
        user_answer = serializer.validated_data['user_answer']
        
        # Check correctness
        is_correct = self._check_answer(activity, user_answer)
        
        # Record attempt
        result = record_attempt(
            session=session,
            activity=activity,
            user_answer=user_answer,
            is_correct=is_correct,
            time_spent=serializer.validated_data.get('time_spent'),
            client_attempt_uuid=serializer.validated_data.get('client_attempt_uuid') or uuid.uuid4(),

        )

        
        # Get correct answer if wrong
        correct_answer = None
        explanation = activity.explanation if hasattr(activity, 'explanation') else None
        
        if not is_correct:
            correct_answer = self._get_correct_answer(activity)
        
        response_data = {
            'is_correct': is_correct,
            'correct_answer': correct_answer,
            'explanation': explanation,
            'points_earned': result['points_earned'],
            'session_progress': result['session_progress'],
            'feedback': 'Correct!' if is_correct else f'Incorrect. The correct answer is: {correct_answer}'
        }
        
        return Response(SubmitActivityResponseSerializer(response_data).data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """POST /api/sessions/{id}/complete/ - Complete session and get results"""
        session = get_object_or_404(StudySession, id=pk, user=request.user)
        
        result = complete_session(session)
        
        return Response(CompleteSessionResponseSerializer(result).data)
    
    @action(detail=False, methods=['post'], url_path='retry-level')
    def retry_level(self, request):
        """POST /api/sessions/retry-level/ - Start new set for same level"""
        level_id = request.data.get('level_id')
        if not level_id:
            return Response({'error': 'level_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        result = start_session(
            user=request.user,
            level_id=level_id,
            subject_id=None,
            target_activities=12
        )
        
        response_data = {
            'session_id': result['session'].id,
            'session_type': result['session_type'],
            'set_number': result['set_number'],
            'level': result['level'],
            'subject': None,
            'message': f"Nouvelle série préparée (Série {result['set_number']}) avec vos erreurs précédentes réintégrées"
        }
        
        return Response(StartSessionResponseSerializer(response_data).data)

    @action(detail=True, methods=['post'], url_path='replay')
    def replay(self, request, pk=None):
        """POST /api/sessions/{id}/replay/ - Restart session with exact same activities"""
        session = get_object_or_404(StudySession, id=pk, user=request.user)
        
        # Reset the session
        reset_session = reset_session_for_replay(session)
        
        # Structure response similar to start_session
        response_data = {
            'session_id': reset_session.id,
            'session_type': reset_session.session_type,
            'set_number': reset_session.set_number,
            'level': reset_session.level,
            'subject': reset_session.subject,
            'message': f"Session redémarrée (Série {reset_session.set_number}) - Replay Mode"
        }
        
        return Response(StartSessionResponseSerializer(response_data).data)
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """GET /api/sessions/history/ - Get session history"""
        level_id = request.query_params.get('level_id')
        
        sessions = StudySession.objects.filter(user=request.user).order_by('-started_at')
        
        if level_id:
            sessions = sessions.filter(level_id=level_id)
        
        serializer = StudySessionListSerializer(sessions, many=True)
        return Response({
            'total_sessions': sessions.count(),
            'sessions': serializer.data
        })
    
    # Helper methods
    def _check_answer(self, activity, user_answer):
        """Check if user answer is correct"""
        if isinstance(activity, MCQActivity):
            # NEW format
            if isinstance(user_answer, dict) and isinstance(user_answer.get("choice_id"), str):
                return user_answer["choice_id"] == getattr(activity, "correct_choice_id", "")

            # LEGACY format (index)
            if isinstance(user_answer, int):
                # compare against old field if still present, or convert index->id if you want
                return user_answer == getattr(activity, "correct_answer_index", None)

            return False
        elif isinstance(activity, FillBlankActivity):
            return str(user_answer).strip().lower() == str(activity.correct_answer).strip().lower()
        elif isinstance(activity, MatchingActivity):
            mode, parsed = _parse_matching_answer(user_answer)
            if mode == "invalid":
                return False

            user_lang = getattr(self.request.user, 'native_language', 'fr') or 'fr'

            # ✅ V2 matching: compare pair_id -> expected right_value
            if mode == "v2":
                expected = _matching_expected_map(activity, user_lang)

                # Must match all pairs (strict)
                if set(parsed.keys()) != set(expected.keys()):
                    return False

                return parsed == expected

            # ✅ Legacy matching (temporary compatibility): compare fr_left -> expected displayed right
            # (keeps your previous behavior for old clients)
            expected_pairs = {}
            for pair in (getattr(activity, "pairs_v2", None) or []):
                if not isinstance(pair, dict):
                    continue

                left = pair.get("left") or {}
                right = pair.get("right") or {}

                if not isinstance(left, dict) or not isinstance(right, dict):
                    continue

                left_value = (left.get("value") or "").strip()
                right_value = (right.get("value") or "").strip()
                if not left_value:
                    continue

                i18n = left.get("i18n") or {}
                if isinstance(i18n, dict) and isinstance(i18n.get(user_lang), str) and i18n.get(user_lang).strip():
                    expected_pairs[left_value] = i18n[user_lang].strip()
                else:
                    expected_pairs[left_value] = right_value

            return parsed == expected_pairs



        elif isinstance(activity, ConjugationActivity):
            return str(user_answer).strip().lower() == str(activity.correct_conjugation).strip().lower()
        elif isinstance(activity, DragOrderActivity):
            # user_answer should be list of indices [0, 2, 1]
            if not isinstance(user_answer, list):
                return False
            return user_answer == activity.correct_order
        elif isinstance(activity, MultipleAnswerActivity):
            # NEW format
            if isinstance(user_answer, dict) and isinstance(user_answer.get("choice_ids"), list):
                ids = user_answer["choice_ids"]
                if not all(isinstance(x, str) for x in ids):
                    return False
                return sorted(ids) == sorted(getattr(activity, "correct_choice_ids", []) or [])

            # LEGACY format (indices list)
            if isinstance(user_answer, list) and all(isinstance(x, int) for x in user_answer):
                return sorted(user_answer) == sorted(getattr(activity, "correct_indices", []) or [])

            return False

        
        elif isinstance(activity, DicteeActivity):
            # user_answer should be the text transcription
            ans = str(user_answer).strip()
            correct = str(getattr(activity, "correct_text", "")).strip()

            # If not case-sensitive, compare lowercased
            if not getattr(activity, "case_sensitive", False):
                ans = ans.lower()
                correct = correct.lower()

            return ans == correct

        elif isinstance(activity, TextInputActivity):
            # correct_answers is list of acceptable strings
            ans = str(user_answer).strip()
            if not activity.case_sensitive:
                ans = ans.lower()
                acceptable = [str(a).strip().lower() for a in activity.correct_answers]
            else:
                acceptable = [str(a).strip() for a in activity.correct_answers]
            
            return ans in acceptable
            
        return False
    
    def _get_correct_answer(self, activity):
        """Get the correct answer for an activity"""
        if isinstance(activity, MCQActivity):
            return {"format": "v2", "choice_id": getattr(activity, "correct_choice_id", "")}


        elif isinstance(activity, FillBlankActivity):
            return activity.correct_answer
        elif isinstance(activity, DicteeActivity):
            return getattr(activity, "correct_text", None)

        elif isinstance(activity, MatchingActivity):
            request = self.request
            user_lang = getattr(request.user, 'native_language', 'fr') or 'fr'

            expected_by_pair_id = _matching_expected_map(activity, user_lang)

            # Also provide a human-readable view for feedback/UI
            readable = {}
            for pair in (getattr(activity, "pairs_v2", None) or []):
                if not isinstance(pair, dict):
                    continue
                pid = (pair.get("id") or "").strip()
                left = pair.get("left") or {}
                if not pid or not isinstance(left, dict):
                    continue
                left_value = (left.get("value") or "").strip()
                if left_value:
                    readable[left_value] = expected_by_pair_id.get(pid)

            return {
                "format": "pairs_v2",
                "expected": [{"pair_id": pid, "right_value": rv} for pid, rv in expected_by_pair_id.items()],
                "readable": readable
            }



        elif isinstance(activity, ConjugationActivity):
            return activity.correct_conjugation
        elif isinstance(activity, DragOrderActivity):
            # Return ordered words for display
            if activity.correct_order:
                # If correct_order is indices [2, 1, 0] and words is ["A", "B", "C"]
                # Return "C A B" or similar string representation
                try:
                    words = activity.words
                    ordered = [words[i] for i in activity.correct_order]
                    return " ".join(ordered)
                except (IndexError, TypeError):
                    return str(activity.correct_order)
            return activity.correct_order
        elif isinstance(activity, MultipleAnswerActivity):
            return {"format": "v2", "choice_ids": getattr(activity, "correct_choice_ids", []) or []}


        elif isinstance(activity, TextInputActivity):
            return activity.correct_answers[0] if activity.correct_answers else ""
        return None


# ============================================================================
# PROGRESS ENDPOINTS
# ============================================================================

class ProgressViewSet(viewsets.ViewSet):
    """Progress tracking endpoints"""
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        """GET /api/progress/ - Get overall user progress, optionally filtered by course"""
        user = request.user
        course_id = request.query_params.get('course_id')
        
        # Get levels - Filter by course if provided
        levels = Level.objects.all().order_by('order')
        if course_id:
            levels = levels.filter(course_id=course_id)
            
        # Ensure first level (of the filtered set) is always unlocked
        first_level = levels.first()
        if first_level:
            user_progress, created = UserProgress.objects.get_or_create(
                user=user,
                level=first_level,
                defaults={'status': 'ACTIVE'}
            )
            # If exists but locked, unlock it
            if user_progress.status == 'LOCKED':
                user_progress.status = 'ACTIVE'
                user_progress.save()
        
        progress_data = []
        
        # Prefetch progress to avoid N+1
        # Fetch only relevant progress
        user_progress_dict = {
            p.level_id: p 
            for p in UserProgress.objects.filter(
                user=user, 
                level__in=levels
            )
        }
        
        for level in levels:
            user_progress = user_progress_dict.get(level.id)
            
            if user_progress:
                progress_data.append(UserProgressSerializer(user_progress).data)
            else:
                # Level not yet unlocked - show as locked
                progress_data.append({
                    'id': None,
                    'level': LevelSerializer(level).data,
                    'status': 'LOCKED',
                    'total_activities': 0,
                    'completed_activities': 0,
                    'correct_answers': 0,
                    'total_attempts': 0,
                    'completion_percentage': 0,
                    'accuracy_percentage': 0,
                    'retry_count': 0,
                    'is_passed': False,
                    'needs_downgrade': False,
                    'can_proceed_to_next': False
                })
        
        # Calculate overall accuracy for the filtered set
        overall_accuracy = 0
        total_accuracy_sum = 0
        active_levels_count = 0
        current_level_id = None

        for item in progress_data:
            if item['status'] == 'ACTIVE' and current_level_id is None:
                current_level_id = item['level']['id']
            if item['accuracy_percentage'] is not None and item['status'] != 'LOCKED':
                total_accuracy_sum += item['accuracy_percentage']
                active_levels_count += 1
        
        if active_levels_count > 0:
            overall_accuracy = total_accuracy_sum / active_levels_count

        return Response({
            'current_level': current_level_id,
            'overall_accuracy': overall_accuracy,
            'levels': progress_data
        })
    
    @action(detail=False, methods=['get'], url_path='weakness-analysis')
    def weakness_analysis(self, request):
        """GET /api/progress/weakness-analysis/ - Get weakness analysis"""
        level_id = request.query_params.get('level_id')
        
        if not level_id:
            return Response({'error': 'level_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        level = get_object_or_404(Level, id=level_id)
        analysis = get_weakness_analysis(request.user, level)
        
        if not analysis:
            return Response({'message': 'No data available for analysis'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(WeaknessAnalysisSerializer(analysis).data)
    
    @action(detail=False, methods=['get'], url_path='weakness-alerts')
    def weakness_alerts(self, request):
        """GET /api/progress/weakness-alerts/ - Get active weakness alerts"""
        alerts = WeaknessAlert.objects.filter(
            user=request.user,
            is_active=True
        ).select_related('level', 'subject').order_by('-severity', '-created_at')
        
        return Response(WeaknessAlertSerializer(alerts, many=True).data)
    
    @action(detail=False, methods=['get'], url_path='failed-activities')
    def failed_activities(self, request):
        """GET /api/progress/failed-activities/ - Get failed activities queue"""
        level_id = request.query_params.get('level_id')
        
        failed = FailedActivityQueue.objects.filter(
            user=request.user,
            is_resolved=False
        ).select_related('activity', 'level', 'subject').order_by('-priority', 'first_failed_at')
        
        if level_id:
            failed = failed.filter(level_id=level_id)
        
        # Group by subject
        by_subject = {}
        for item in failed:
            subject_name = item.subject.title
            if subject_name not in by_subject:
                by_subject[subject_name] = 0
            by_subject[subject_name] += 1
        
        return Response({
            'total_failed': failed.count(),
            'by_subject': by_subject,
            'activities': FailedActivityQueueSerializer(failed, many=True).data
        })
    
    @action(detail=False, methods=['post'], url_path='dismiss-alert')
    def dismiss_alert(self, request):
        """POST /api/progress/dismiss-alert/{id}/ - Dismiss a weakness alert"""
        alert_id = request.data.get('alert_id')
        
        alert = get_object_or_404(WeaknessAlert, id=alert_id, user=request.user)
        alert.is_active = False
        alert.dismissed_at = timezone.now()
        alert.save()
        
        return Response({'success': True, 'message': 'Alert dismissed'})


# ============================================================================
# QUICK PRACTICE ENDPOINTS
# ============================================================================

class PracticeViewSet(viewsets.ViewSet):
    """Quick practice endpoints"""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'], url_path='failed-only')
    def failed_only(self, request):
        """POST /api/practice/failed-only/ - Practice only failed activities"""
        level_id = request.data.get('level_id')
        
        if not level_id:
            return Response({'error': 'level_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get failed activities count
        failed_count = FailedActivityQueue.objects.filter(
            user=request.user,
            level_id=level_id,
            is_resolved=False
        ).count()
        
        if failed_count == 0:
            return Response({'error': 'No failed activities found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Create a custom practice session
        result = start_session(
            user=request.user,
            level_id=level_id,
            subject_id=None,
            target_activities=min(failed_count, 12)
        )
        
        # Mark session as custom practice
        result['session'].session_type = 'CUSTOM'
        result['session'].save()
        
        return Response({
            'session_id': result['session'].id,
            'message': f"Session de révision: {failed_count} exercices échoués",
            'total_failed': failed_count
        })


# ============================================================================
# SUBJECT MODE ENDPOINTS
# ============================================================================

class SubjectModeViewSet(viewsets.ViewSet):
    """Subject-focused learning endpoints"""
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request):
        """POST /api/subject/start/ - Start subject-focused session"""
        level_id = request.data.get('level_id')
        subject_id = request.data.get('subject_id')
        
        if not level_id or not subject_id:
            return Response(
                {'error': 'level_id and subject_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = start_session(
            user=request.user,
            level_id=level_id,
            subject_id=subject_id,
            target_activities=12
        )
        
        response_data = {
            'session_id': result['session'].id,
            'session_type': result['session_type'],
            'set_number': result['set_number'],
            'level': result['level'],
            'subject': result['subject'],
            'message': f"Parcours {result['subject'].title} - Série {result['set_number']}"
        }
        
        return Response(StartSessionResponseSerializer(response_data).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """POST /api/sessions/{id}/complete/ - Complete a session"""
        session = get_object_or_404(StudySession, id=pk, user=request.user) # Use pk to fetch session
        
        if session.outcome == 'COMPLETED':
            return Response(
                {'error': 'Session already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Complete the session using service
        result = complete_session(session)
        
        # Serialize nested objects properly
        response_data = {
            'session_id': str(session.id),
            'passed': result['passed'],
            'accuracy': result['accuracy'],
            'outcome': result['outcome'],
            'level': {
                'id': result['level'].id,
                'title': result['level'].title,
                'order': result['level'].order
            } if result.get('level') else None,
            'subject': {
                'id': result['subject'].id,
                'name': result['subject'].name,
                'color': result['subject'].color
            } if result.get('subject') else None,
            'total_activities': result.get('total_activities', 0),
            'correct_answers': result.get('correct_answers', 0),
            'points_earned': result.get('points_earned', 0),
        }
        
        return Response(response_data)


# ============================================================================
# PLACEMENT TEST ENDPOINTS
# ============================================================================

class PlacementTestViewSet(viewsets.ViewSet):
    """Placement test endpoints"""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'], url_path='start')
    def start(self, request):
        """POST /api/placement/start/ - Start placement test"""
        course_id = request.data.get('course_id') # Extract course_id
        result = PlacementTest.start_placement_test(request.user, course_id)
        
        return Response(PlacementStartResponseSerializer(result).data, status=status.HTTP_201_CREATED)

    
    @action(detail=True, methods=['get'], url_path='next')
    def next_question(self, request, pk=None):
        """GET /api/placement/{id}/next/ - Get next placement question"""
        session = get_object_or_404(StudySession, id=pk, user=request.user, set_number=0)
        
        result = PlacementTest.get_placement_question(session)
        
        return Response(PlacementQuestionResponseSerializer(result, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def answer(self, request, pk=None):
        """POST /api/placement/{id}/answer/ - Submit placement answer"""
        session = get_object_or_404(StudySession, id=pk, user=request.user, set_number=0)
        
        serializer = PlacementAnswerRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        activity = get_object_or_404(Activity, id=serializer.validated_data['activity_id'])
        user_answer = serializer.validated_data['user_answer']
        
        # Check correctness (reuse from SessionViewSet)
        session_viewset = SessionViewSet()
        session_viewset.request = request  # ✅ required because _check_answer uses self.request
        is_correct = session_viewset._check_answer(activity, user_answer)

        
        # Submit and adjust level
        result = PlacementTest.submit_placement_answer(
            session,
            activity,
            user_answer,
            is_correct,
            client_attempt_uuid=serializer.validated_data['client_attempt_uuid']
        )

        
        # Add correct answer if wrong
        if not is_correct:
            result['correct_answer'] = session_viewset._get_correct_answer(activity)
        
        return Response(PlacementAnswerResponseSerializer(result).data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """POST /api/placement/{id}/complete/ - Complete placement test"""
        session = get_object_or_404(StudySession, id=pk, user=request.user, set_number=0)
        
        result = PlacementTest.complete_placement_test(session)
        
        return Response(PlacementCompleteResponseSerializer(result).data)


# Import for aggregation
from django.db import models
from django.utils import timezone
