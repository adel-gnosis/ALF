from rest_framework import serializers
from .models import (
    UserProgress, SubjectProgress, ActivityAttempt, FailedActivityQueue,
    StudySession, SubjectPerformanceSnapshot, WeaknessAlert
)
from courses.serializers import LevelSerializer, SubjectSerializer
from activities.serializers import ActivityPolymorphicSerializer


# ============================================================================
# PROGRESS SERIALIZERS
# ============================================================================

class UserProgressSerializer(serializers.ModelSerializer):
    level = LevelSerializer(read_only=True)
    is_passed = serializers.BooleanField(read_only=True)
    needs_downgrade = serializers.BooleanField(read_only=True)
    can_proceed_to_next = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = UserProgress
        fields = [
            'id', 'level', 'status', 'total_activities', 'completed_activities',
            'correct_answers', 'total_attempts', 'completion_percentage',
            'accuracy_percentage', 'started_at', 'completed_at', 'retry_count',
            'is_passed', 'needs_downgrade', 'can_proceed_to_next'
        ]


class SubjectProgressSerializer(serializers.ModelSerializer):
    level = LevelSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    
    class Meta:
        model = SubjectProgress
        fields = [
            'id', 'level', 'subject', 'status', 'total_activities',
            'completed_activities', 'correct_answers', 'total_attempts',
            'completion_percentage', 'accuracy_percentage',
            'started_at', 'completed_at'
        ]


class ActivityAttemptSerializer(serializers.ModelSerializer):
    activity = ActivityPolymorphicSerializer(read_only=True)
    
    class Meta:
        model = ActivityAttempt
        fields = [
            'id', 'activity', 'user_answer', 'is_correct', 'points_earned',
            'time_spent_seconds', 'attempted_at', 'attempt_number'
        ]


class FailedActivityQueueSerializer(serializers.ModelSerializer):
    activity = ActivityPolymorphicSerializer(read_only=True)
    level = LevelSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    
    class Meta:
        model = FailedActivityQueue
        fields = [
            'id', 'activity', 'level', 'subject', 'first_failed_at',
            'times_failed', 'priority', 'is_resolved', 'resolved_at'
        ]


# ============================================================================
# SESSION SERIALIZERS
# ============================================================================

class SubjectPerformanceSnapshotSerializer(serializers.ModelSerializer):
    subject = SubjectSerializer(read_only=True)
    strength_level = serializers.CharField(read_only=True)
    
    class Meta:
        model = SubjectPerformanceSnapshot
        fields = [
            'id', 'subject', 'total_activities', 'correct_answers',
            'accuracy_percentage', 'is_weak_area', 'needs_focus',
            'strength_level', 'created_at'
        ]


class StudySessionListSerializer(serializers.ModelSerializer):
    level = LevelSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    
    class Meta:
        model = StudySession
        fields = [
            'id', 'level', 'subject', 'session_type', 'target_activities',
            'activities_completed', 'correct_answers', 'accuracy_percentage',
            'total_points_earned', 'started_at', 'ended_at', 'duration_seconds',
            'outcome', 'set_number'
        ]


class StudySessionDetailSerializer(serializers.ModelSerializer):
    level = LevelSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    subject_breakdown = SubjectPerformanceSnapshotSerializer(many=True, read_only=True)
    
    class Meta:
        model = StudySession
        fields = [
            'id', 'level', 'subject', 'session_type', 'target_activities',
            'activities_completed', 'correct_answers', 'accuracy_percentage',
            'total_points_earned', 'started_at', 'ended_at', 'duration_seconds',
            'outcome', 'set_number', 'subject_breakdown'
        ]


class WeaknessAlertSerializer(serializers.ModelSerializer):
    level = LevelSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    
    class Meta:
        model = WeaknessAlert
        fields = [
            'id', 'level', 'subject', 'sessions_analyzed', 'average_accuracy',
            'severity', 'message', 'recommendation', 'is_active',
            'dismissed_at', 'created_at'
        ]


# ============================================================================
# REQUEST/RESPONSE SERIALIZERS
# ============================================================================

class StartSessionRequestSerializer(serializers.Serializer):
    level_id = serializers.IntegerField()
    subject_id = serializers.IntegerField(required=False, allow_null=True)
    target_activities = serializers.IntegerField(default=30, min_value=1, max_value=50)


class StartSessionResponseSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    session_type = serializers.CharField()
    set_number = serializers.IntegerField()
    level = LevelSerializer()
    subject = SubjectSerializer(required=False, allow_null=True)
    message = serializers.CharField()


class NextActivityResponseSerializer(serializers.Serializer):
    activity = ActivityPolymorphicSerializer(required=False, allow_null=True)
    is_retry = serializers.BooleanField()
    retry_info = serializers.DictField(required=False, allow_null=True)
    progress = serializers.DictField()
    session_complete = serializers.BooleanField()


class SubmitActivityRequestSerializer(serializers.Serializer):
    activity_id = serializers.IntegerField()
    user_answer = serializers.JSONField()
    time_spent = serializers.IntegerField(required=False, allow_null=True)


class SubmitActivityResponseSerializer(serializers.Serializer):
    is_correct = serializers.BooleanField()
    correct_answer = serializers.JSONField(required=False, allow_null=True)
    explanation = serializers.CharField(required=False, allow_null=True)
    points_earned = serializers.IntegerField()
    session_progress = serializers.DictField()
    feedback = serializers.CharField(required=False, allow_null=True)


class CompleteSessionResponseSerializer(serializers.Serializer):
    passed = serializers.BooleanField()
    accuracy = serializers.FloatField()
    outcome = serializers.CharField()
    next_action = serializers.CharField()
    message = serializers.CharField()
    subject_breakdown = serializers.ListField()
    weak_subjects = serializers.ListField()
    recommendations = serializers.ListField()
    suggested_level = serializers.IntegerField(required=False, allow_null=True)


class WeaknessAnalysisSerializer(serializers.Serializer):
    overall_accuracy = serializers.FloatField()
    subject_performance = serializers.ListField()
    weak_subjects = serializers.ListField()
    active_alerts = serializers.ListField()
    recommendations = serializers.ListField()


# ============================================================================
# PLACEMENT TEST SERIALIZERS
# ============================================================================

class PlacementStartResponseSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    current_level = LevelSerializer()
    questions_completed = serializers.IntegerField()
    max_questions = serializers.IntegerField()


class PlacementQuestionResponseSerializer(serializers.Serializer):
    activity = ActivityPolymorphicSerializer(required=False, allow_null=True)
    current_level = LevelSerializer()
    progress = serializers.DictField()


class PlacementAnswerRequestSerializer(serializers.Serializer):
    activity_id = serializers.IntegerField()
    user_answer = serializers.JSONField()


class PlacementAnswerResponseSerializer(serializers.Serializer):
    is_correct = serializers.BooleanField()
    new_level = LevelSerializer()
    leveled_up = serializers.BooleanField()
    leveled_down = serializers.BooleanField()
    correct_answer = serializers.JSONField(required=False, allow_null=True)


class PlacementCompleteResponseSerializer(serializers.Serializer):
    determined_level = LevelSerializer()
    accuracy = serializers.FloatField()
    unlocked_levels = serializers.ListField()
    weakness_summary = serializers.ListField()
