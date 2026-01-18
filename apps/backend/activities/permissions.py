"""
Custom permissions for teacher and admin content management
"""

from rest_framework import permissions


class IsTeacher(permissions.BasePermission):
    """
    Permission: User must be a teacher (approved)
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in ['teacher', 'admin'] and
            request.user.is_teacher_approved
        )


class IsAdmin(permissions.BasePermission):
    """
    Permission: User must be an admin
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == 'admin'
        )


class CanEditActivity(permissions.BasePermission):
    """
    Permission: Can edit specific activity
    Rules:
    - Admin can edit anything
    - Original creator can edit their own content
    - Lead teachers can edit during review (PENDING status)
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Admin has full access
        if user.role == 'admin':
            return True
        
        # Teacher editing their OWN activity (any status)
        if obj.created_by == user:
            return True
        
        # Teacher suggesting modification to OTHERS' APPROVED activity
        if obj.status == 'APPROVED' and obj.created_by != user:
            return True  # Backend will create new version with PENDING status
        
        return False


class CanDeleteActivity(permissions.BasePermission):
    """
    Permission: Can delete activity
    Rules:
    - Admin can delete anything
    - Creator can delete only DRAFT activities
    - Cannot delete APPROVED activities (preserves student progress)
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Admin can delete anything
        if user.role == 'admin':
            return True
        
        # Creator can only delete drafts
        if obj.created_by == user and obj.status == 'DRAFT':
            return True
        
        return False


class CanReviewContent(permissions.BasePermission):
    """
    Permission: Can approve/reject activities
    Rules:
    - Admin can review anything
    - Lead teachers can review content (except their own)
    """
    def has_permission(self, request, view):
        user = request.user
        return (
            user.is_authenticated and
            (user.role == 'admin' or user.teacher_permission_level == 'LEAD')
        )
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Admin can review anything
        if user.role == 'admin':
            return True
        
        # Lead teachers can review others' content
        if user.teacher_permission_level == 'LEAD' and obj.created_by != user:
            return True
        
        return False