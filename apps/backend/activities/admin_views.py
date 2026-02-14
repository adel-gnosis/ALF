"""
Admin Content Management Views
Handles content review, teacher management, system administration
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q, Avg, Sum
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
from collections import Counter

from .models import Activity, ActivityFeedback
from .permissions import IsAdmin, CanReviewContent

import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class AdminReviewViewSet(viewsets.ViewSet):
    """
    Admin content review system
    
    Endpoints:
    - GET  /api/admin/review/pending/
    - GET  /api/admin/review/all-activities/
    - POST /api/admin/review/{id}/approve/
    - POST /api/admin/review/{id}/reject/
    - GET  /api/admin/review/flagged/
    """
    
    permission_classes = [permissions.IsAuthenticated, CanReviewContent]
    
    @action(detail=False, methods=['get'], url_path='pending')
    def pending_review(self, request):
        """
        GET /api/admin/review/pending/
        
        Get all activities awaiting review (status=PENDING)
        """
        pending = Activity.objects.filter(
            status='PENDING'
        ).select_related(
            'lesson', 'lesson__level', 'lesson__subject', 'created_by', 'modified_by'
        ).order_by('submitted_for_review_at')
        
        activities_data = []
        for activity in pending:
            activities_data.append({
                'id': activity.id,
                'activity_type': activity.__class__.__name__,
                'lesson': {
                    'id': activity.lesson.id,
                    'title': activity.lesson.title,
                    'level': activity.lesson.level.code,
                    'subject': activity.lesson.subject.title
                },
                'question_text': (
                    (getattr(activity, "question_text_key", "") or getattr(activity, "instruction_key", "") or "")
                )[:200],

                'difficulty': activity.difficulty,
                'points': activity.points,
                'created_by': {
                    'id': activity.created_by.id,
                    'username': activity.created_by.username,
                    'permission_level': activity.created_by.teacher_permission_level
                } if activity.created_by else {
                    'id': None,
                    'username': 'Unknown User',
                    'permission_level': None
                },
                'modified_by': {
                    'id': activity.modified_by.id,
                    'username': activity.modified_by.username
                } if activity.modified_by else None,
                'version_notes': activity.version_notes,
                'submitted_at': activity.submitted_for_review_at,
                'version': activity.version,
                # ✅ NEW: For version diff feature
                'previous_version_id': activity.previous_version_id,
                'is_edit': activity.version > 1 and activity.previous_version_id is not None
            })
        
        return Response({
            'total_pending': pending.count(),
            'activities': activities_data
        })
    
    @action(detail=False, methods=['get'], url_path='all-activities')
    def all_activities(self, request):
        """
        GET /api/admin/review/all-activities/
        
        Get ALL activities from all users (admin view)
        Supports filtering and pagination
        
        Query params:
        - status: DRAFT, PENDING, APPROVED, REJECTED
        - activity_type: MCQActivity, MatchingActivity, etc.
        - course_id: filter by course
        - subject_id: filter by subject
        - level_id: filter by level
        - search: search in question text
        - page: page number (default 1)
        - page_size: items per page (default 20)
        """
        from .serializers import ActivityPolymorphicSerializer
        
        # Build query
        queryset = Activity.objects.all().select_related(
            'lesson', 'lesson__level', 'lesson__subject', 'created_by', 'modified_by'
        )
        
        # Filters
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        activity_type = request.query_params.get('activity_type')
        if activity_type:
            # Support multiple types (comma-separated), same behavior as teacher browse
            types = [t.strip().lower() for t in activity_type.split(',') if t.strip()]
            if types:
                queryset = queryset.filter(polymorphic_ctype__model__in=types)

        
        course_id = request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(lesson__subject__course_id=course_id)
        
        subject_id = request.query_params.get('subject_id')
        if subject_id:
            queryset = queryset.filter(lesson__subject_id=subject_id)
        
        level_id = request.query_params.get('level_id')
        if level_id:
            queryset = queryset.filter(lesson__level_id=level_id)

        difficulty = request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)

        
        created_by_me = request.query_params.get('created_by_me')
        if created_by_me == 'true':
            queryset = queryset.filter(created_by=request.user)
        
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(question_text_key__icontains=search) |
                Q(instruction_key__icontains=search)
            )
        
        # Order by most recent
        queryset = queryset.order_by('-created_at')
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        total = queryset.count()
        total_pages = (total + page_size - 1) // page_size
        
        start = (page - 1) * page_size
        end = start + page_size
        
        activities = queryset[start:end]
        
        # Serialize
        serializer = ActivityPolymorphicSerializer(
            activities,
            many=True,
            context={'request': request}
        )
        
        return Response({
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_prev': page > 1,
            'activities': serializer.data
        })
    
    @action(detail=True, methods=['post'], url_path='approve')
    def approve_activity(self, request, pk=None):
        """
        POST /api/admin/review/{id}/approve/
        
        Approve activity for publication
        """
        activity = get_object_or_404(Activity, id=pk, status='PENDING')

        logger.info(
            "[ACTIVITY_APPROVE] reviewer=%s activity_id=%s type=%s status=%s version=%s prev=%s created_by=%s modified_by=%s",
            request.user.id,
            activity.id,
            activity.__class__.__name__,
            activity.status,
            activity.version,
            activity.previous_version_id,
            activity.created_by_id,
            activity.modified_by_id,
        )

        
        # Check permission
        self.check_object_permissions(request, activity)
        
        activity.status = 'APPROVED'
        activity.reviewed_by = request.user
        activity.reviewed_at = timezone.now()
        activity.save()

        logger.info(
            "[ACTIVITY_APPROVE] approved activity_id=%s now status=%s reviewed_by=%s reviewed_at=%s",
            activity.id,
            activity.status,
            activity.reviewed_by_id,
            activity.reviewed_at,
        )

        
        logger.info(
            f"Admin {request.user.username} approved {activity.__class__.__name__} #{activity.id} "
            f"(created by {activity.created_by.username})"
        )
        
        # TODO: Send notification to teacher (V1.5)
        
        return Response({
            'message': 'Activity approved and published',
            'activity_id': activity.id,
            'status': 'APPROVED',
            'reviewed_by': request.user.username,
            'reviewed_at': activity.reviewed_at
        })
    
    @action(detail=True, methods=['post'], url_path='reject')
    def reject_activity(self, request, pk=None):
        """
        POST /api/admin/review/{id}/reject/
        
        Reject activity with reason
        
        Body: {
          "reason": "Grammar error in question text"
        }
        """
        activity = get_object_or_404(Activity, id=pk, status='PENDING')

        logger.info(
            "[ACTIVITY_REJECT] BEFORE reviewer=%s activity_id=%s type=%s status=%s version=%s prev=%s created_by=%s modified_by=%s",
            request.user.id,
            activity.id,
            activity.__class__.__name__,
            activity.status,
            activity.version,
            activity.previous_version_id,
            activity.created_by_id,
            activity.modified_by_id,
        )


        
        # Check permission
        self.check_object_permissions(request, activity)
        
        reason = request.data.get('reason', '')
        if not reason:
            return Response({
                'error': 'Rejection reason is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        activity.status = 'REJECTED'
        activity.reviewed_by = request.user
        activity.reviewed_at = timezone.now()
        activity.rejection_reason = reason
        activity.save()
        
        logger.info(
            f"Admin {request.user.username} rejected {activity.__class__.__name__} #{activity.id} "
            f"(created by {activity.created_by.username}): {reason}"
        )
        
        # TODO: Send notification to teacher (V1.5)
        
        return Response({
            'message': 'Activity rejected',
            'activity_id': activity.id,
            'status': 'REJECTED',
            'reason': reason,
            'reviewed_by': request.user.username
        })
    
    @action(detail=True, methods=['get'], url_path='diff')
    def version_diff(self, request, pk=None):
        """
        GET /api/admin/review/{id}/diff/
        
        Returns current pending version alongside previous version
        for side-by-side comparison. Includes computed field-level diff.
        """
        from .serializers import ActivityPolymorphicSerializer
        
        activity = get_object_or_404(Activity, id=pk)
        
        # Serialize current version
        current_data = ActivityPolymorphicSerializer(activity, context={'request': request}).data
        
        # Get and serialize previous version if exists
        previous = activity.previous_version
        previous_data = None
        if previous:
            previous_data = ActivityPolymorphicSerializer(previous, context={'request': request}).data
        
        # Compute field-level changes (returns structured diff with content/meta separation)
        diff_result = self._compute_activity_diff(previous_data, current_data) if previous_data else {
            'content': [],
            'meta': [],
            'has_content_changes': False,
            'has_meta_changes': False
        }
        
        return Response({
            'current': {
                'id': activity.id,
                'version': activity.version,
                'status': activity.status,
                'activity_type': activity.__class__.__name__,
                'data': current_data
            },
            'previous': {
                'id': previous.id,
                'version': previous.version,
                'status': previous.status,
                'activity_type': previous.__class__.__name__,
                'data': previous_data
            } if previous else None,
            'diff': diff_result,
            'has_changes': diff_result.get('has_content_changes', False) or diff_result.get('has_meta_changes', False),
            'has_content_changes': diff_result.get('has_content_changes', False),
            'version_notes': activity.version_notes,
            'modified_by': {
                'id': activity.modified_by.id,
                'username': activity.modified_by.username
            } if activity.modified_by else None
        })
    
    def _compute_activity_diff(self, old_data, new_data):
        """
        Universal activity diff that works for ALL activity types.
        Returns structured diff with content_diff and meta_diff separation.
        """
        content_diff = []
        meta_diff = []
        
        # ===== Meta fields (excluded from content diff) =====
        META_FIELDS = {
            'id', 'activity_ptr_id', 'created_at', 'updated_at', 
            'version', 'status', 'version_notes', 'previous_version', 'previous_version_id',
            'modified_by', 'created_by', 'reviewed_by', 'reviewed_at',
            'submitted_for_review_at', 'rejection_reason', 'polymorphic_ctype_id',
            'polymorphic_ctype', 'resourcetype',
            # Runtime fields added by serializer
            'is_rtl', 'user_language', 'supported_ui_languages',
            'question_text', 'instruction', 'explanation'  # Rendered versions (we compare keys)
        }
        
        # ===== Content fields (always compare) =====
        CONTENT_FIELDS = {
            'question_text_key', 'instruction_key', 'explanation_key', 'translation_data',
            'points', 'difficulty', 'order', 'lesson_id', 'lesson',
            # Type-specific fields (all types)
            'choices_v2', 'correct_choice_id', 'correct_choice_ids',  # MCQ / MultipleAnswer
            'pairs_v2',  # Matching
            'phrase', 'phrase_key', 'correct_answer',  # FillBlank
            'words', 'correct_order',  # DragOrder
            'correct_answers', 'case_sensitive', 'strip_whitespace',  # TextInput
            'audio_urls', 'correct_text', 'sentence', 'tts_model',  # Dictee
            'verb', 'tense', 'conjugations', 'person_labels',  # Conjugation
            'audio_url', 'image_url', 'media_url'  # Legacy media fields
        }
        
        # Collect all keys from both versions
        all_keys = set(old_data.keys()) | set(new_data.keys())
        
        for key in all_keys:
            old_val = old_data.get(key)
            new_val = new_data.get(key)
            
            # Skip if values are equal (including deep comparison)
            if self._deep_equal(old_val, new_val):
                continue
            
            # Determine if it's a meta field or content field
            is_meta = key in META_FIELDS or key.endswith('_id') and key not in {'correct_choice_id', 'lesson_id'}
            
            # Determine change type
            if old_val is None:
                change_type = 'added'
            elif new_val is None:
                change_type = 'removed'
            else:
                change_type = 'modified'
            
            diff_entry = {
                'field': key,
                'field_label': self._format_field_label(key),
                'old': old_val,
                'new': new_val,
                'change_type': change_type
            }
            
            if is_meta:
                meta_diff.append(diff_entry)
            else:
                content_diff.append(diff_entry)
        
        # ===== Special case: MCQ/MultipleAnswer correct answer semantic diff =====
        old_correct_id = old_data.get('correct_choice_id')
        new_correct_id = new_data.get('correct_choice_id')
        
        if old_correct_id != new_correct_id and (old_correct_id or new_correct_id):
            # Lookup content for both IDs
            old_choices = old_data.get('choices_v2') or []
            new_choices = new_data.get('choices_v2') or []
            
            old_content = self._find_choice_content(old_choices, old_correct_id)
            new_content = self._find_choice_content(new_choices, new_correct_id)
            
            content_diff.append({
                'field': 'correct_answer_content',
                'field_label': 'Correct Answer (Content)',
                'old': old_content,
                'new': new_content,
                'change_type': 'modified',
                'is_semantic': True  # Flag for frontend to render prominently
            })
        
        # ===== Combine into structured response =====
        return {
            'content': content_diff,
            'meta': meta_diff,
            'has_content_changes': len(content_diff) > 0,
            'has_meta_changes': len(meta_diff) > 0
        }
    
    def _deep_equal(self, a, b):
        """Deep equality check for nested structures."""
        if type(a) != type(b):
            return False
        if isinstance(a, dict):
            if set(a.keys()) != set(b.keys()):
                return False
            return all(self._deep_equal(a[k], b[k]) for k in a.keys())
        if isinstance(a, list):
            if len(a) != len(b):
                return False
            return all(self._deep_equal(x, y) for x, y in zip(a, b))
        return a == b
    
    def _format_field_label(self, field):
        """Convert field name to readable label."""
        LABELS = {
            'question_text_key': 'Question Text Key',
            'instruction_key': 'Instruction Key',
            'explanation_key': 'Explanation Key',
            'translation_data': 'Translation Variables',
            'correct_choice_id': 'Correct Choice ID',
            'correct_choice_ids': 'Correct Choice IDs',
            'choices_v2': 'Choices',
            'pairs_v2': 'Matching Pairs',
            'correct_answer': 'Correct Answer',
            'correct_answers': 'Correct Answers',
            'correct_order': 'Correct Order',
            'audio_urls': 'Audio Files',
            'correct_text': 'Correct Text',
        }
        return LABELS.get(field, field.replace('_', ' ').title())
    
    def _find_choice_content(self, choices, choice_id):
        """Lookup choice content by ID for semantic diff."""
        if not choices or not choice_id:
            return None
        for choice in choices:
            if isinstance(choice, dict) and choice.get('id') == choice_id:
                content = choice.get('content', {})
                return {
                    'id': choice_id,
                    'type': content.get('type'),
                    'value': content.get('value'),
                    'rendered_value': choice.get('rendered_value', content.get('value'))
                }
        return {'id': choice_id, 'not_found': True}
    
    @action(detail=False, methods=['get'], url_path='flagged')
    def flagged_activities(self, request):
        """
        GET /api/admin/review/flagged/
        
        Get activities flagged by students (high feedback count or low accuracy)
        """
        from progress.models import ActivityAttempt
        from django.db.models import Count, Avg
        
        # Activities with 5+ unresolved feedback
        flagged_by_feedback = ActivityFeedback.objects.filter(
            is_resolved=False
        ).values('activity').annotate(
            feedback_count=Count('id')
        ).filter(feedback_count__gte=5).values_list('activity', flat=True)
        
        # Activities with <40% accuracy (min 20 attempts)
        activities_with_attempts = ActivityAttempt.objects.values('activity').annotate(
            total=Count('id'),
            correct=Count('id', filter=Q(is_correct=True))
        ).filter(total__gte=20)
        
        low_accuracy_ids = [
            item['activity'] for item in activities_with_attempts
            if (item['correct'] / item['total'] * 100) < 40
        ]
        
        # Combine
        flagged_ids = set(list(flagged_by_feedback) + low_accuracy_ids)
        
        flagged = Activity.objects.filter(
            id__in=flagged_ids
        ).select_related('lesson', 'created_by')
        
        flagged_data = []
        for activity in flagged:
            attempts = ActivityAttempt.objects.filter(activity=activity)
            total = attempts.count()
            correct = attempts.filter(is_correct=True).count()
            accuracy = (correct / total * 100) if total > 0 else 0
            
            feedback_count = ActivityFeedback.objects.filter(
                activity=activity,
                is_resolved=False
            ).count()
            
            flagged_data.append({
                'id': activity.id,
                'activity_type': activity.__class__.__name__,
                'question_text': (
                    (getattr(activity, "question_text_key", "") or getattr(activity, "instruction_key", "") or "")
                )[:200],

                'lesson_title': activity.lesson.title,
                'created_by': activity.created_by.username,
                'status': activity.status,
                'accuracy': round(accuracy, 2),
                'total_attempts': total,
                'feedback_count': feedback_count,
                'flags': {
                    'low_accuracy': accuracy < 40,
                    'high_feedback': feedback_count >= 5
                }
            })
        
        return Response({
            'total_flagged': len(flagged_data),
            'activities': flagged_data
        })


class AdminTeacherManagementViewSet(viewsets.ViewSet):
    """
    Admin teacher management
    
    Endpoints:
    - GET  /api/admin/teachers/
    - POST /api/admin/teachers/{id}/grant-direct-publish/
    - POST /api/admin/teachers/{id}/revoke-direct-publish/
    - POST /api/admin/teachers/{id}/set-permission-level/
    - POST /api/admin/teachers/{id}/suspend/
    """
    
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    
    def list(self, request):
        """
        GET /api/admin/teachers/
        
        List teachers with statistics
        - Superadmin: sees ALL users (including admins)
        - Admin: sees teachers only (no admins/staff)
        
        Query params:
        - search: filter by username/email
        - user_type: filter by teacher/admin/superadmin
        - permission_level: filter by BASIC/VERIFIED/LEAD
        - has_activities: true/false
        - ordering: field to sort by
        """
        requester = request.user
        is_superadmin = requester.is_superuser
        
        # Base query
        if is_superadmin:
            users = User.objects.all()
        else:
            users = User.objects.filter(
                Q(role__iexact='teacher') | Q(is_teacher_approved=True)
            ).exclude(
                Q(is_superuser=True) | Q(is_staff=True)
            )
        
        # Apply filters
        search = request.query_params.get('search', '').strip()
        if search:
            users = users.filter(
                Q(username__icontains=search) | Q(email__icontains=search)
            )
        
        user_type_filter = request.query_params.get('user_type', '').strip()
        if user_type_filter == 'teacher':
            users = users.filter(
                Q(role__iexact='teacher') | Q(is_teacher_approved=True)
            ).exclude(Q(is_superuser=True) | Q(is_staff=True))
        elif user_type_filter == 'admin':
            users = users.filter(Q(is_staff=True) | Q(role__iexact='admin')).exclude(is_superuser=True)
        elif user_type_filter == 'superadmin':
            users = users.filter(is_superuser=True)
        
        permission_filter = request.query_params.get('permission_level', '').strip()
        if permission_filter:
            users = users.filter(teacher_permission_level=permission_filter)
        
        has_activities_filter = request.query_params.get('has_activities', '').strip()
        if has_activities_filter == 'true':
            users = users.annotate(activity_count=Count('created_activities')).filter(activity_count__gt=0)
        elif has_activities_filter == 'false':
            users = users.annotate(activity_count=Count('created_activities')).filter(activity_count=0)
        
        # Apply ordering
        ordering = request.query_params.get('ordering', '-date_joined')
        valid_orderings = ['date_joined', '-date_joined', 'username', '-username', 'email', '-email']
        if ordering in valid_orderings:
            users = users.order_by(ordering)
        else:
            users = users.order_by('-date_joined')
        
        # Build user data
        users_data = []
        user_type_counts = {'teachers': 0, 'admins': 0, 'superadmins': 0, 'students': 0}
        
        for user in users:
            activities = Activity.objects.filter(created_by=user)
            
            # Determine user type
            user_type = 'teacher'
            if user.is_superuser:
                user_type = 'superadmin'
                user_type_counts['superadmins'] += 1
            elif user.is_staff or (user.role and user.role.lower() == 'admin'):
                user_type = 'admin'
                user_type_counts['admins'] += 1
            elif user.role and user.role.lower() == 'teacher':
                user_type = 'teacher'
                user_type_counts['teachers'] += 1
            else:
                user_type_counts['students'] += 1
            
            # Get last activity date
            last_activity = activities.order_by('-created_at').first()
            last_activity_date = last_activity.created_at.isoformat() if last_activity else None
            
            # Check if active (created activity in last 30 days)
            thirty_days_ago = timezone.now() - timedelta(days=30)
            is_active = activities.filter(created_at__gte=thirty_days_ago).exists()
            
            users_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'user_type': user_type,
                'is_superuser': user.is_superuser,
                'is_staff': user.is_staff,
                'role': user.role,
                'is_teacher_approved': user.is_teacher_approved,
                'teacher_permission_level': user.teacher_permission_level,
                'can_publish_directly': user.can_publish_directly,
                'date_joined': user.date_joined,
                'last_activity_date': last_activity_date,
                'is_active': is_active,
                'has_pending': activities.filter(status='PENDING').exists(),
                'has_rejected': activities.filter(status='REJECTED').exists(),
                'stats': {
                    'total_activities': activities.count(),
                    'approved': activities.filter(status='APPROVED').count(),
                    'pending': activities.filter(status='PENDING').count(),
                    'rejected': activities.filter(status='REJECTED').count()
                }
            })
        
        # System-wide stats
        all_activities = Activity.objects.all()
        today = timezone.now().date()
        week_ago = timezone.now() - timedelta(days=7)
        
        system_stats = {
            'total_activities': all_activities.count(),
            'pending_review': all_activities.filter(status='PENDING').count(),
            'approved_activities': all_activities.filter(status='APPROVED').count(),
            'rejected_activities': all_activities.filter(status='REJECTED').count(),
            'activities_today': all_activities.filter(created_at__date=today).count(),
            'teachers_active_this_week': User.objects.filter(
                created_activities__created_at__gte=week_ago
            ).distinct().count()
        }
        
        return Response({
            'total_users': len(users_data),
            'teachers': users_data,
            'can_manage_admins': is_superadmin,
            'user_breakdown': user_type_counts,
            'system_stats': system_stats
        })
    
    @action(detail=True, methods=['post'], url_path='grant-direct-publish')
    def grant_direct_publish(self, request, pk=None):
        """
        POST /api/admin/teachers/{id}/grant-direct-publish/
        
        Grant teacher ability to publish without approval
        """
        teacher = get_object_or_404(User, id=pk, role__iexact='teacher')
        
        teacher.can_publish_directly = True
        teacher.save()
        
        logger.info(f"Admin {request.user.username} granted direct publish to {teacher.username}")
        
        return Response({
            'message': f'Direct publish granted to {teacher.username}',
            'user_id': teacher.id,
            'can_publish_directly': True
        })
    
    @action(detail=True, methods=['post'], url_path='revoke-direct-publish')
    def revoke_direct_publish(self, request, pk=None):
        """
        POST /api/admin/teachers/{id}/revoke-direct-publish/
        
        Revoke direct publish ability
        """
        teacher = get_object_or_404(User, id=pk, role__iexact='teacher')
        
        teacher.can_publish_directly = False
        teacher.save()
        
        logger.info(f"Admin {request.user.username} revoked direct publish from {teacher.username}")
        
        return Response({
            'message': f'Direct publish revoked from {teacher.username}',
            'user_id': teacher.id,
            'can_publish_directly': False
        })
    
    @action(detail=True, methods=['post'], url_path='set-permission-level')
    def set_permission_level(self, request, pk=None):
        """
        POST /api/admin/teachers/{id}/set-permission-level/
        
        Body: {
          "level": "BASIC" | "VERIFIED" | "LEAD"
        }
        
        Only superadmin can promote to admin roles (is_staff/is_superuser)
        """
        requester = request.user
        teacher = get_object_or_404(User, id=pk)
        
        level = request.data.get('level')
        valid_levels = ['BASIC', 'VERIFIED', 'LEAD']
        
        if level not in valid_levels:
            return Response({
                'error': f'Invalid level. Must be one of: {", ".join(valid_levels)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Prevent regular admins from managing other admins
        if not requester.is_superuser:
            # Check if target is admin/staff
            if teacher.is_superuser or teacher.is_staff or (teacher.role and teacher.role.lower() == 'admin'):
                return Response({
                    'error': 'Only superadmins can modify admin permissions'
                }, status=status.HTTP_403_FORBIDDEN)
        
        teacher.teacher_permission_level = level
        teacher.save()
        
        logger.info(f"Admin {requester.username} set {teacher.username} permission to {level}")
        
        return Response({
            'message': f'Permission level set to {level}',
            'user_id': teacher.id,
            'permission_level': level
        })
    
    @action(detail=False, methods=['get'], url_path='dashboard-stats', permission_classes=[permissions.IsAuthenticated])
    def dashboard_stats(self, request):
        """
        GET /api/admin/teachers/dashboard-stats/
        
        Comprehensive dashboard statistics for admin/teacher dashboards
        """
        user = request.user
        is_admin = user.is_staff or user.is_superuser or (user.role and user.role.lower() == 'admin')
        
        # Determine scope: admin sees all, teacher sees only their own
        if is_admin:
            activities = Activity.objects.all()
            user_filter = {}
        else:
            activities = Activity.objects.filter(created_by=user)
            user_filter = {'created_by': user}
        
        # Time windows
        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        last_week_start = now - timedelta(days=14)
        last_week_end = week_ago
        month_ago = now - timedelta(days=30)
        
        # Recent activity timeline (last 10 activities)
        recent_activities = activities.select_related(
            'created_by', 'lesson'
        ).order_by('-created_at')[:10]
        
        recent_timeline = []
        for activity in recent_activities:
            recent_timeline.append({
                'id': activity.id,
                'activity_type': activity.resourcetype,
                'status': activity.status,
                'created_by': {
                    'id': activity.created_by.id,
                    'username': activity.created_by.username
                } if activity.created_by else None,
                'created_at': activity.created_at.isoformat(),
                'lesson_title': activity.lesson.title if activity.lesson else 'Unknown'
            })
        
        # This week vs last week comparison
        this_week_activities = activities.filter(created_at__gte=week_ago).count()
        last_week_activities = activities.filter(
            created_at__gte=last_week_start,
            created_at__lt=last_week_end
        ).count()
        
        this_week_approved = activities.filter(
            status='APPROVED',
            reviewed_at__gte=week_ago
        ).count()
        last_week_approved = activities.filter(
            status='APPROVED',
            reviewed_at__gte=last_week_start,
            reviewed_at__lt=last_week_end
        ).count()
        
        # Teacher leaderboard (admin only)
        leaderboard = []
        if is_admin:
            top_teachers = User.objects.filter(
                created_activities__created_at__gte=month_ago
            ).annotate(
                activity_count=Count('created_activities')
            ).order_by('-activity_count')[:10]
            
            for teacher in top_teachers:
                leaderboard.append({
                    'id': teacher.id,
                    'username': teacher.username,
                    'activity_count': teacher.activity_count,
                    'approved_count': Activity.objects.filter(
                        created_by=teacher,
                        status='APPROVED'
                    ).count()
                })
        
        # Activity type distribution
        from collections import Counter
        activity_types = activities.values_list('polymorphic_ctype__model', flat=True)
        type_distribution = dict(Counter(activity_types))
        
        # Format activity types nicely
        type_mapping = {
            'mcqactivity': 'MCQ',
            'fillblankactivity': 'Fill Blank',
            'matchingactivity': 'Matching',
            'dicteeactivity': 'Dictée',
            'conjugationactivity': 'Conjugation',
            'dragorderactivity': 'Drag Order',
            'multipleansweractivity': 'Multiple Answer',
            'textinputactivity': 'Text Input'
        }
        
        formatted_distribution = {}
        total = sum(type_distribution.values()) or 1
        for key, count in type_distribution.items():
            nice_name = type_mapping.get(key, key.replace('activity', '').title())
            formatted_distribution[nice_name] = {
                'count': count,
                'percentage': round((count / total) * 100, 1)
            }
        
        # Alerts/Notifications
        alerts = []
        
        pending_count = activities.filter(status='PENDING').count()
        if pending_count > 0:
            alerts.append({
                'type': 'pending_review',
                'message': f'{pending_count} activities pending review',
                'count': pending_count,
                'priority': 'high' if pending_count > 10 else 'medium'
            })
        
        if is_admin:
            unresolved_feedback = ActivityFeedback.objects.filter(
                is_resolved=False
            ).count()
            if unresolved_feedback > 0:
                alerts.append({
                    'type': 'unresolved_feedback',
                    'message': f'{unresolved_feedback} feedback items unresolved',
                    'count': unresolved_feedback,
                    'priority': 'medium'
                })
            
            unapproved_teachers = User.objects.filter(
                role__iexact='teacher',
                is_teacher_approved=False
            ).count()
            if unapproved_teachers > 0:
                alerts.append({
                    'type': 'teacher_approval',
                    'message': f'{unapproved_teachers} teachers awaiting approval',
                    'count': unapproved_teachers,
                    'priority': 'low'
                })
        
        # Student impact metrics (for teachers)
        student_impact = None
        if not is_admin:
            try:
                from progress.models import ActivityAttempt
                
                attempts = ActivityAttempt.objects.filter(
                    activity__created_by=user
                )
                
                avg_correct = attempts.aggregate(Avg('is_correct'))['is_correct__avg']
                
                student_impact = {
                    'students_reached': attempts.values('user').distinct().count(),
                    'total_attempts': attempts.count(),
                    'average_success_rate': round(avg_correct * 100, 1) if avg_correct else 0,
                    'total_points_earned': attempts.filter(
                        is_correct=True
                    ).aggregate(Sum('activity__points'))['activity__points__sum'] or 0
                }
            except ImportError:
                # ActivityAttempt model doesn't exist yet
                student_impact = {
                    'students_reached': 0,
                    'total_attempts': 0,
                    'average_success_rate': 0,
                    'total_points_earned': 0
                }
        return Response({
            'recent_timeline': recent_timeline,
            'week_comparison': {
                'this_week': {
                    'activities_created': this_week_activities,
                    'approvals': this_week_approved
                },
                'last_week': {
                    'activities_created': last_week_activities,
                    'approvals': last_week_approved
                },
                'changes': {
                    'activities': this_week_activities - last_week_activities,
                    'approvals': this_week_approved - last_week_approved
                }
            },
            'leaderboard': leaderboard,
            'activity_type_distribution': formatted_distribution,
            'alerts': alerts,
            'student_impact': student_impact
        })