"""
Custom permissions for teacher and admin content management
"""

from rest_framework import permissions


def _is_admin(user):
    return bool(
        user.is_authenticated and (
            getattr(user, "is_superuser", False)
            or getattr(user, "is_staff", False)
            or ((getattr(user, "role", "") or "").lower() == "admin")
        )
    )


class IsTeacher(permissions.BasePermission):
    """
    Permission: User must be a teacher (approved)
    Admin/superuser/staff always allowed (for debugging & management).
    """
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False

        # Always allow platform admins
        if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
            return True

        role = (getattr(user, "role", "") or "").lower()

        # Allow admins even if not teacher-approved
        if role == "admin":
            return True

        # Teachers must be approved
        if role == "teacher":
            return bool(getattr(user, "is_teacher_approved", False))

        return False


class IsAdmin(permissions.BasePermission):
    """
    Permission: User must be an admin
    """
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return bool(user.is_superuser or user.is_staff or ((getattr(user, "role", "") or "").lower() == "admin"))



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
        if _is_admin(user):
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
        if _is_admin(user):
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
        if not user or not user.is_authenticated:
            return False

        # Admins always can review
        if _is_admin(user):
            return True

        # Lead teachers can review
        return getattr(user, "teacher_permission_level", None) == "LEAD"

    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Admin can review anything
        if _is_admin(user):
            return True
        
        # Lead teachers can review others' content
        if user.teacher_permission_level == 'LEAD' and obj.created_by != user:
            return True
        
        return False