"""
Teacher Content Management Views
Handles activity creation, editing, submission for review
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Count, Avg, Q
from django.utils import timezone

from .models import Activity, ActivityFeedback
from .teacher_serializers import (
    ActivityCreateSerializer,
    ActivityUpdateSerializer,
    TeacherActivityListSerializer,
    ActivityPerformanceSerializer
)
from .permissions import IsTeacher, CanEditActivity, CanDeleteActivity
from progress.models import ActivityAttempt

import logging

logger = logging.getLogger(__name__)


class TeacherActivityViewSet(viewsets.ViewSet):
    """
    Teacher content creation and management
    
    Endpoints:
    - POST   /api/teacher/activities/create/
    - GET    /api/teacher/activities/my-content/
    - GET    /api/teacher/activities/{id}/
    - PATCH  /api/teacher/activities/{id}/edit/
    - DELETE /api/teacher/activities/{id}/
    - POST   /api/teacher/activities/{id}/submit-for-review/
    - GET    /api/teacher/activities/{id}/performance/
    - GET    /api/teacher/feedback/
    """
    
    permission_classes = [permissions.IsAuthenticated, IsTeacher]
    
    @action(detail=False, methods=['post'], url_path='create')
    def create_activity(self, request):
        """
        POST /api/teacher/activities/create/
        
        Create new activity (any type)
        Auto-approves if user has can_publish_directly permission
        
        Body example:
        {
          "activity_type": "MCQActivity",
          "lesson_id": 5,
          "question_text": "What is 'dog' in French?",
          "difficulty": "EASY",
          "points": 10,
          "type_specific_data": {
            "choices_v2": [
                {"id":"c_001","content":{"type":"text","value":"le chat"}},
                {"id":"c_002","content":{"type":"text","value":"le chien"}},
                {"id":"c_003","content":{"type":"text","value":"le poisson"}}
            ],
            "correct_choice_id": "c_002"
            }

        }
        """
        serializer = ActivityCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        activity = serializer.save()
        
        return Response({
            'id': activity.id,
            'activity_type': activity.__class__.__name__,
            'status': activity.status,
            'message': (
                'Activity created and published!' if activity.status == 'APPROVED'
                else 'Activity created as draft. Submit for review to publish.'
            ),
            'auto_published': activity.status == 'APPROVED',
            'lesson': {
                'id': activity.lesson.id,
                'title': activity.lesson.title
            }
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], url_path='my-content')
    def my_content(self, request):
        """
        GET /api/teacher/activities/my-content/?status=DRAFT&lesson_id=5&activity_type=MCQActivity&created_by_me=true
        
        List activities:
        - Teachers: Only their own activities + all approved
        - Admins: Everything by default, can filter by 'created_by_me'
        
        Query params:
        - status: DRAFT | PENDING | APPROVED | REJECTED | ARCHIVED
        - lesson_id: Filter by lesson
        - level_id: Filter by level
        - activity_type: Comma-separated list of types
        - created_by_me: If true, filters by current user
        - page: Page number (1-indexed, default: 1)
        - page_size: Items per page (30, 50, or 100, default: 30)
        """
        # ✅ CONSTRAINT #1: Unified admin detection
        role = (getattr(request.user, "role", "") or "").lower()
        is_admin = bool(request.user.is_superuser or request.user.is_staff or role == "admin")

        # ✅ CONSTRAINT #4: Teacher "My Activities" stays strict
        # This endpoint ALWAYS returns only created_by=request.user
        # Even admins using teacher UI see only their own
        # (Admins have separate "All Content" page for everything)
        activities = Activity.objects.filter(created_by=request.user)
        
        activities = activities.select_related(
            'lesson', 'lesson__level', 'lesson__subject', 'created_by', 'modified_by'
        ).order_by('-created_at')
        
        # Filters
        status_filter = request.query_params.get('status')
        if status_filter:
            activities = activities.filter(status=status_filter)
        
        lesson_id = request.query_params.get('lesson_id')
        if lesson_id:
            activities = activities.filter(lesson_id=lesson_id)
        
        # Level filter
        level_id = request.query_params.get('level_id')
        if level_id:
            activities = activities.filter(lesson__level_id=level_id)

        course_id = request.query_params.get('course_id')
        if course_id:
            activities = activities.filter(lesson__level__course=course_id)

        subject_id = request.query_params.get('subject_id')
        if subject_id:
            activities = activities.filter(lesson__subject=subject_id)

        difficulty = request.query_params.get('difficulty')
        if difficulty:
            activities = activities.filter(difficulty=difficulty)

        search = request.query_params.get('search')
        if search:
            activities = activities.filter(
                Q(question_text_key__icontains=search) |
                Q(instruction_key__icontains=search) |
                Q(explanation_key__icontains=search)
            )


        activity_type = request.query_params.get('activity_type')
        if activity_type:
            types = [t.strip().lower() for t in activity_type.split(',')]
            activities = activities.filter(polymorphic_ctype__model__in=types)
        
        # Get total count before pagination
        total_count = activities.count()
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 30))
        # Validate page_size (allowed: 30, 50, 100)
        if page_size not in [30, 50, 100]:
            page_size = 30
        
        offset = (page - 1) * page_size
        activities = activities[offset:offset + page_size]
        
        # Annotate with performance stats
        activities_with_stats = []
        for activity in activities:
            attempts = ActivityAttempt.objects.filter(activity=activity)
            total_attempts = attempts.count()
            avg_accuracy = 0.0
            if total_attempts > 0:
                correct_count = attempts.filter(is_correct=True).count()
                avg_accuracy = (correct_count / total_attempts) * 100
            
            activity.total_attempts = total_attempts
            activity.average_accuracy = avg_accuracy
            activities_with_stats.append(activity)
        
        serializer = TeacherActivityListSerializer(activities_with_stats, many=True, context={'request': request})
        
        # Calculate pagination metadata
        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1
        
        return Response({
            'total': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_prev': page > 1,
            'activities': serializer.data
        })
    
    @action(detail=False, methods=['get'], url_path='browse')
    def browse_activities(self, request):
        """
        GET /api/teacher/activities/browse/?activity_type=MCQActivity,MultipleAnswerActivity
        
        Browse all APPROVED activities for viewing/suggesting modifications
        Supports category filtering via comma-separated activity types
        
        Query params:
        - activity_type: Comma-separated list (e.g., "MCQActivity,MultipleAnswerActivity")
        - lesson_id, subject_id, level_id, difficulty, search
        - page: Page number (1-indexed, default: 1)
        - page_size: Items per page (30, 50, or 100, default: 30)
        """
        # ✅ CONSTRAINT #1: Unified admin detection
        role = (getattr(request.user, "role", "") or "").lower()
        is_admin = bool(request.user.is_superuser or request.user.is_staff or role == "admin")
        
        # Teachers see APPROVED only, Admins see all statuses
        if is_admin:
            activities = Activity.objects.all()
        else:
            activities = Activity.objects.filter(status='APPROVED')
        
        activities = activities.select_related(
            'lesson', 'lesson__level', 'lesson__subject', 'created_by', 'modified_by'
        ).order_by('-created_at')
        
        # Filters
        activity_type = request.query_params.get('activity_type')
        if activity_type:
            # Support multiple types (comma-separated for categories)
            types = [t.strip().lower() for t in activity_type.split(',')]
            activities = activities.filter(polymorphic_ctype__model__in=types)
        
        lesson_id = request.query_params.get('lesson_id')
        if lesson_id:
            activities = activities.filter(lesson_id=lesson_id)
        
        course_id = request.query_params.get('course_id')
        if course_id:
            activities = activities.filter(lesson__level__course=course_id)
        
        subject_id = request.query_params.get('subject_id')
        if subject_id:
            activities = activities.filter(lesson__subject=subject_id)
        
        level_id = request.query_params.get('level_id')
        if level_id:
            activities = activities.filter(lesson__level_id=level_id)
        
        difficulty = request.query_params.get('difficulty')
        if difficulty:
            activities = activities.filter(difficulty=difficulty)
        
        search = request.query_params.get('search')
        if search:
            activities = activities.filter(
                Q(question_text_key__icontains=search) |
                Q(instruction_key__icontains=search) |
                Q(explanation_key__icontains=search)
            )

        # Get total count before pagination
        total_count = activities.count()
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 30))
        # Validate page_size (allowed: 30, 50, 100)
        if page_size not in [30, 50, 100]:
            page_size = 30
        
        offset = (page - 1) * page_size
        activities = activities[offset:offset + page_size]
        
        # Annotate with performance stats
        activities_with_stats = []
        for activity in activities:
            attempts = ActivityAttempt.objects.filter(activity=activity)
            total_attempts = attempts.count()
            avg_accuracy = 0.0
            if total_attempts > 0:
                correct_count = attempts.filter(is_correct=True).count()
                avg_accuracy = (correct_count / total_attempts) * 100
            
            activity.total_attempts = total_attempts
            activity.average_accuracy = avg_accuracy
            activities_with_stats.append(activity)
        
        serializer = TeacherActivityListSerializer(activities_with_stats, many=True, context={'request': request})
        
        # Calculate pagination metadata
        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1
        
        return Response({
            'total': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_prev': page > 1,
            'activities': serializer.data
        })
    
    def retrieve(self, request, pk=None):
        """
        GET /api/teacher/activities/{id}/
        
        Get detailed view of specific activity
        """
        role = (getattr(request.user, "role", "") or "").lower()
        is_admin = bool(request.user.is_superuser or request.user.is_staff or role == "admin")

        qs = Activity.objects.all() if is_admin else Activity.objects.filter(created_by=request.user)
        activity = get_object_or_404(qs, id=pk)

        
        # Return full activity data (polymorphic)
        from activities.serializers import ActivityPolymorphicSerializer
        serializer = ActivityPolymorphicSerializer(activity, context={'request': request})
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'], url_path='edit', permission_classes=[permissions.IsAuthenticated, CanEditActivity])
    def edit_activity(self, request, pk=None):
        """
        PATCH /api/teacher/activities/{id}/edit/
        
        Edit existing activity:
        - Creator editing own APPROVED → Auto-approve new version
        - Teacher suggesting edit to others' APPROVED → Needs admin approval
        - Editing DRAFT/PENDING → Update in place
        
        Body: Same as create, but all fields optional
        """
        activity = get_object_or_404(Activity, id=pk)

        logger.info(
            "[ACTIVITY_EDIT] user=%s activity_id=%s type=%s status=%s version=%s created_by=%s",
            request.user.id,
            activity.id,
            activity.__class__.__name__,
            activity.status,
            activity.version,
            activity.created_by_id,
        )

        
        # Check permission
        self.check_object_permissions(request, activity)
        
        serializer = ActivityUpdateSerializer(
            data=request.data,
            context={'request': request, 'activity': activity}
        )
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data
        logger.info(
            "[ACTIVITY_EDIT] validated fields=%s has_type_specific=%s",
            list(vd.keys()),
            bool(vd.get("type_specific_data")),
        )


        
        # Determine if this is the creator or someone suggesting changes
        is_creator = activity.created_by == request.user
        is_approved = activity.status == 'APPROVED'
        
        # ✅ CONSTRAINT #1: Unified admin detection
        role = (getattr(request.user, "role", "") or "").lower()
        is_admin = bool(request.user.is_superuser or request.user.is_staff or role == "admin")
        
        if is_approved:
            # ✅ CONSTRAINT #2: Approved edit must always create new version
            # Always create new version for APPROVED activities (never update in place)
            updated_activity = serializer.update(activity, serializer.validated_data)

            logger.info(
                "[ACTIVITY_EDIT] created new_version id=%s version=%s prev=%s status=%s",
                updated_activity.id,
                updated_activity.version,
                updated_activity.previous_version_id,
                updated_activity.status,
            )

            is_creator = (activity.created_by_id == request.user.id)
            logger.info(
                "[ACTIVITY_EDIT] is_creator=%s (created_by=%s user=%s)",
                is_creator,
                activity.created_by_id,
                request.user.id,
            )

            
            if is_creator:
                # ✅ CONSTRAINT #3: Auto-publish check
                # Use is_admin OR user.can_publish_directly
                can_auto_publish = is_admin or getattr(request.user, 'can_publish_directly', False)

                if can_auto_publish:
                    logger.info(
                        "[ACTIVITY_EDIT] CREATOR AUTO-PUBLISH: approve new_version=%s, archive old=%s (can_publish=%s admin=%s)",
                        updated_activity.id,
                        activity.id,
                        getattr(request.user, 'can_publish_directly', False),
                        is_admin
                    )

                    # Auto-publish: new version APPROVED, old version ARCHIVED
                    updated_activity.status = 'APPROVED'
                    updated_activity.modified_by = request.user
                    updated_activity.save()
                    
                    # Archive old version
                    activity.status = 'ARCHIVED'
                    activity.save()

                    logger.info(
                        "[ACTIVITY_EDIT] old activity now status=%s id=%s",
                        activity.status,
                        activity.id,
                    )

                    message = f'Activity updated (v{updated_activity.version}). Published.'
                    needs_approval = False
                else:
                    logger.info(
                        "[ACTIVITY_EDIT] CREATOR PENDING: new_version=%s to PENDING, old=%s stays APPROVED (not trusted)",
                        updated_activity.id,
                        activity.id,
                    )

                    # Non-trusted creator: new version PENDING, old version stays APPROVED
                    updated_activity.status = 'PENDING'
                    updated_activity.modified_by = request.user
                    updated_activity.save()
                    
                    # ✅ Old version stays APPROVED (not archived) until new version is reviewed
                    # activity.status remains 'APPROVED'
                    
                    message = f'Activity updated (v{updated_activity.version}). Awaiting admin approval.'
                    needs_approval = True
            else:

                logger.info(
                    "[ACTIVITY_EDIT] SUGGESTION FLOW: set new_version=%s to PENDING, keep old=%s APPROVED",
                    updated_activity.id,
                    activity.id,
                )

                # Teacher suggesting modification → Needs approval
                updated_activity.status = 'PENDING'
                updated_activity.modified_by = request.user
                updated_activity.save()
                
                # Old version stays APPROVED
                message = f'Modification suggested (v{updated_activity.version}). Awaiting admin approval.'
                needs_approval = True
            
            is_new_version = True
            is_suggestion = not is_creator
        else:
            # DRAFT or PENDING - update in place (no versioning)
            updated_activity = serializer.update(activity, serializer.validated_data)
            updated_activity.modified_by = request.user
            updated_activity.save()
            message = 'Activity updated.'
            is_new_version = False
            needs_approval = False
            is_suggestion = False
        
        return Response({
            'id': updated_activity.id,
            'status': updated_activity.status,
            'version': updated_activity.version,
            'message': message,
            'is_new_version': is_new_version,
            'needs_approval': needs_approval,  # ✅ Use variable set in logic
            'is_suggestion': is_suggestion    # ✅ Use variable set in logic
        })
    
    @action(detail=True, methods=['delete'], permission_classes=[permissions.IsAuthenticated, CanDeleteActivity])
    def delete_activity(self, request, pk=None):
        """
        DELETE /api/teacher/activities/{id}/
        
        Delete activity (only DRAFT status allowed for teachers)
        Admins can delete any status
        """
        activity = get_object_or_404(Activity, id=pk)
        
        # Check permission
        self.check_object_permissions(request, activity)
        
        activity_type = activity.__class__.__name__
        activity_id = activity.id
        
        activity.delete()
        
        logger.info(f"Teacher {request.user.username} deleted {activity_type} #{activity_id}")
        
        return Response({
            'message': 'Activity deleted successfully',
            'id': activity_id
        }, status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'], url_path='submit-for-review')
    def submit_for_review(self, request, pk=None):
        """
        POST /api/teacher/activities/{id}/submit-for-review/
        
        Submit DRAFT activity for admin review
        Changes status: DRAFT → PENDING
        """
        role = (getattr(request.user, "role", "") or "").lower()
        is_admin = bool(request.user.is_superuser or request.user.is_staff or role == "admin")

        qs = Activity.objects.all() if is_admin else Activity.objects.filter(created_by=request.user)
        activity = get_object_or_404(qs, id=pk, status='DRAFT')

        
        activity.status = 'PENDING'
        activity.submitted_for_review_at = timezone.now()
        activity.save()
        
        logger.info(f"Teacher {request.user.username} submitted {activity.__class__.__name__} #{activity.id} for review")
        
        return Response({
            'message': 'Activity submitted for review',
            'status': 'PENDING',
            'submitted_at': activity.submitted_for_review_at
        })
    
    @action(detail=True, methods=['get'], url_path='performance')
    def activity_performance(self, request, pk=None):
        """
        GET /api/teacher/activities/{id}/performance/
        
        Get detailed performance analytics for this activity
        """
        role = (getattr(request.user, "role", "") or "").lower()
        is_admin = bool(request.user.is_superuser or request.user.is_staff or role == "admin")

        qs = Activity.objects.all() if is_admin else Activity.objects.filter(created_by=request.user)
        activity = get_object_or_404(qs, id=pk)

        
        attempts = ActivityAttempt.objects.filter(activity=activity)
        
        total_attempts = attempts.count()
        unique_students = attempts.values('user').distinct().count()
        
        if total_attempts > 0:
            correct_count = attempts.filter(is_correct=True).count()
            avg_accuracy = (correct_count / total_attempts) * 100
            
            # Median time
            times = list(attempts.filter(
                time_spent_seconds__isnull=False
            ).values_list('time_spent_seconds', flat=True))
            median_time = sorted(times)[len(times)//2] if times else 0
        else:
            avg_accuracy = 0.0
            median_time = 0
        
        # Feedback count
        flagged_count = ActivityFeedback.objects.filter(
            activity=activity,
            is_resolved=False
        ).count()
        
        needs_review = (
            avg_accuracy < 30 or  # Too hard
            avg_accuracy > 95 or  # Too easy
            flagged_count > 5     # Many reports
        )
        
        data = {
            'activity_id': activity.id,
            'total_attempts': total_attempts,
            'unique_students': unique_students,
            'average_accuracy': round(avg_accuracy, 2),
            'median_time_seconds': median_time,
            'flagged_count': flagged_count,
            'needs_review': needs_review
        }
        
        serializer = ActivityPerformanceSerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='feedback')
    def my_feedback(self, request):
        """
        GET /api/teacher/feedback/?is_resolved=false
        
        Get all student feedback on my activities
        """
        feedback = ActivityFeedback.objects.filter(
            activity__created_by=request.user
        ).select_related('activity', 'user').order_by('-created_at')
        
        # Filter by resolution status
        is_resolved = request.query_params.get('is_resolved')
        if is_resolved is not None:
            is_resolved_bool = is_resolved.lower() == 'true'
            feedback = feedback.filter(is_resolved=is_resolved_bool)
        
        feedback_data = []
        for fb in feedback:
            feedback_data.append({
                'id': fb.id,
                'activity_id': fb.activity.id,
                'activity_question': (
                    (getattr(fb.activity, "question_text_key", "") or getattr(fb.activity, "instruction_key", "") or "")
                )[:100],

                'feedback_type': fb.feedback_type,
                'description': fb.description,
                'user_answer': fb.user_answer,
                'is_resolved': fb.is_resolved,
                'created_at': fb.created_at,
                'student_username': fb.user.username
            })
        
        return Response({
            'total': feedback.count(),
            'feedback': feedback_data
        })
    
    @action(detail=False, methods=['post'], url_path='feedback/resolve')
    def resolve_feedback(self, request):
        """
        POST /api/teacher/feedback/resolve/
        
        Body: {
          "feedback_id": 123,
          "resolution_notes": "Fixed the typo"
        }
        """
        feedback_id = request.data.get('feedback_id')
        resolution_notes = request.data.get('resolution_notes', '')
        
        feedback = get_object_or_404(
            ActivityFeedback,
            id=feedback_id,
            activity__created_by=request.user
        )
        
        feedback.is_resolved = True
        feedback.resolved_by = request.user
        feedback.resolution_notes = resolution_notes
        feedback.save()
        
        return Response({
            'message': 'Feedback marked as resolved',
            'feedback_id': feedback.id
        })


class TeacherStatsView(viewsets.ViewSet):
    """
    Teacher analytics and statistics
    
    Endpoints:
    - GET /api/teacher/stats/overview/
    """
    
    permission_classes = [permissions.IsAuthenticated, IsTeacher]
    
    @action(detail=False, methods=['get'], url_path='overview')
    def overview(self, request):
        """
        GET /api/teacher/stats/overview/
        
        Overall teacher statistics dashboard
        """
        user = request.user
        
        # Activity counts by status
        activities = Activity.objects.filter(created_by=user)
        total_activities = activities.count()
        by_status = {
            'draft': activities.filter(status='DRAFT').count(),
            'pending': activities.filter(status='PENDING').count(),
            'approved': activities.filter(status='APPROVED').count(),
            'rejected': activities.filter(status='REJECTED').count()
        }
        
        # Student reach
        approved_activity_ids = activities.filter(status='APPROVED').values_list('id', flat=True)
        attempts = ActivityAttempt.objects.filter(activity_id__in=approved_activity_ids)
        
        total_attempts = attempts.count()
        unique_students = attempts.values('user').distinct().count()
        
        # Average accuracy across all activities
        if total_attempts > 0:
            correct_attempts = attempts.filter(is_correct=True).count()
            avg_accuracy = (correct_attempts / total_attempts) * 100
        else:
            avg_accuracy = 0.0
        
        # Pending feedback
        unresolved_feedback = ActivityFeedback.objects.filter(
            activity__created_by=user,
            is_resolved=False
        ).count()
        
        return Response({
            'total_activities_created': total_activities,
            'activities_by_status': by_status,
            'students_reached': unique_students,
            'total_student_attempts': total_attempts,
            'average_accuracy': round(avg_accuracy, 2),
            'pending_feedback_count': unresolved_feedback,
            'permission_level': user.teacher_permission_level,
            'can_publish_directly': user.can_publish_directly
        })