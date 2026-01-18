"""
Admin Content Management Views
Handles content review, teacher management, system administration
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import Activity, ActivityFeedback
from .permissions import IsAdmin, CanReviewContent
from .teacher_serializers import TeacherActivityListSerializer

import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class AdminReviewViewSet(viewsets.ViewSet):
    """
    Admin content review system
    
    Endpoints:
    - GET  /api/admin/review/pending/
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
                'question_text': activity.question_text[:200],
                'difficulty': activity.difficulty,
                'points': activity.points,
                'created_by': {
                    'id': activity.created_by.id,
                    'username': activity.created_by.username,
                    'permission_level': activity.created_by.teacher_permission_level
                },
                'modified_by': {
                    'id': activity.modified_by.id,
                    'username': activity.modified_by.username
                } if activity.modified_by else None,
                'version_notes': activity.version_notes,
                'submitted_at': activity.submitted_for_review_at,
                'version': activity.version
            })
        
        return Response({
            'total_pending': pending.count(),
            'activities': activities_data
        })
    
    @action(detail=True, methods=['post'], url_path='approve')
    def approve_activity(self, request, pk=None):
        """
        POST /api/admin/review/{id}/approve/
        
        Approve activity for publication
        """
        activity = get_object_or_404(Activity, id=pk, status='PENDING')
        
        # Check permission
        self.check_object_permissions(request, activity)
        
        activity.status = 'APPROVED'
        activity.reviewed_by = request.user
        activity.reviewed_at = timezone.now()
        activity.save()
        
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
                'question_text': activity.question_text[:200],
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
        
        List all teachers with statistics
        """
        teachers = User.objects.filter(
            Q(role='TEACHER') | Q(is_teacher_approved=True)
        ).order_by('-date_joined')
        
        teachers_data = []
        for teacher in teachers:
            activities = Activity.objects.filter(created_by=teacher)
            
            teachers_data.append({
                'id': teacher.id,
                'username': teacher.username,
                'email': teacher.email,
                'is_teacher_approved': teacher.is_teacher_approved,
                'teacher_permission_level': teacher.teacher_permission_level,
                'can_publish_directly': teacher.can_publish_directly,
                'date_joined': teacher.date_joined,
                'stats': {
                    'total_activities': activities.count(),
                    'approved': activities.filter(status='APPROVED').count(),
                    'pending': activities.filter(status='PENDING').count(),
                    'rejected': activities.filter(status='REJECTED').count()
                }
            })
        
        return Response({
            'total_teachers': len(teachers_data),
            'teachers': teachers_data
        })
    
    @action(detail=True, methods=['post'], url_path='grant-direct-publish')
    def grant_direct_publish(self, request, pk=None):
        """
        POST /api/admin/teachers/{id}/grant-direct-publish/
        
        Grant teacher ability to publish without approval
        """
        teacher = get_object_or_404(User, id=pk, role='TEACHER')
        
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
        teacher = get_object_or_404(User, id=pk, role='TEACHER')
        
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
        """
        teacher = get_object_or_404(User, id=pk, role='TEACHER')
        
        level = request.data.get('level')
        valid_levels = ['BASIC', 'VERIFIED', 'LEAD']
        
        if level not in valid_levels:
            return Response({
                'error': f'Invalid level. Must be one of: {", ".join(valid_levels)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        teacher.teacher_permission_level = level
        teacher.save()
        
        logger.info(f"Admin {request.user.username} set {teacher.username} permission to {level}")
        
        return Response({
            'message': f'Permission level set to {level}',
            'user_id': teacher.id,
            'permission_level': level
        })