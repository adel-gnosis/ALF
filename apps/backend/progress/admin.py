from django.contrib import admin
from .models import (
    UserProgress, SubjectProgress, ActivityAttempt,
    FailedActivityQueue, StudySession, SubjectPerformanceSnapshot, WeaknessAlert
)


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'level', 'status', 'accuracy_percentage', 'total_attempts']
    list_filter = ['status', 'level__course', 'level']
    search_fields = ['user__username']
    readonly_fields = ['started_at', 'completed_at', 'last_activity_at']


@admin.register(SubjectProgress)
class SubjectProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'subject', 'level', 'status', 'accuracy_percentage']
    list_filter = ['status', 'subject__course', 'subject', 'level']
    search_fields = ['user__username']


@admin.register(ActivityAttempt)
class ActivityAttemptAdmin(admin.ModelAdmin):
    list_display = ['user', 'activity', 'is_correct', 'points_earned', 'attempted_at']
    list_filter = ['is_correct', 'attempted_at']
    search_fields = ['user__username']
    readonly_fields = ['attempted_at']


@admin.register(FailedActivityQueue)
class FailedActivityQueueAdmin(admin.ModelAdmin):
    list_display = ['user', 'activity', 'times_failed', 'priority', 'is_resolved']
    list_filter = ['is_resolved', 'priority', 'level', 'subject']
    search_fields = ['user__username']


@admin.register(StudySession)
class StudySessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'level', 'subject', 'session_type', 'set_number', 'outcome', 'accuracy_percentage']
    list_filter = ['session_type', 'outcome', 'level']
    search_fields = ['user__username']
    readonly_fields = ['id', 'started_at', 'ended_at']


@admin.register(SubjectPerformanceSnapshot)
class SubjectPerformanceSnapshotAdmin(admin.ModelAdmin):
    list_display = ['user', 'subject', 'session', 'accuracy_percentage', 'strength_level', 'is_weak_area']
    list_filter = ['is_weak_area', 'needs_focus', 'subject']
    search_fields = ['user__username']


@admin.register(WeaknessAlert)
class WeaknessAlertAdmin(admin.ModelAdmin):
    list_display = ['user', 'level', 'subject', 'severity', 'average_accuracy', 'is_active']
    list_filter = ['severity', 'is_active', 'level', 'subject']
    search_fields = ['user__username', 'message']
    readonly_fields = ['created_at', 'dismissed_at']
