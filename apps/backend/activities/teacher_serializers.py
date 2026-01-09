"""
Teacher Content Creation Serializers
Uses ActivitySchemaRegistry for validation
Scalable: Add new activity types by updating schemas.py only
"""

from rest_framework import serializers
from .models import Activity
from .schemas import ActivitySchemaRegistry
from courses.models import Lesson
import logging

logger = logging.getLogger(__name__)


SUPPORTED_UI_LANGS = {"en", "fr", "ar"}  # extend later if needed

def _intersection_from_pairs_i18n(pairs_i18n: dict) -> list[str]:
    """
    pairs_i18n shape: { "parfait": {"en":"perfect","ar":"ممتاز"}, ... }
    We compute intersection of langs that exist for ALL entries.
    """
    if not pairs_i18n:
        return []
    langs = None
    for _, trans in pairs_i18n.items():
        if not isinstance(trans, dict):
            return []
        available = set(k for k, v in trans.items() if k in SUPPORTED_UI_LANGS and str(v).strip())
        langs = available if langs is None else (langs & available)
    return sorted(langs) if langs else []

def _intersection_from_choices_i18n(choices_i18n: list) -> list[str]:
    """
    choices_i18n shape: [ {"fr":"pomme","en":"apple","ar":"تفاحة"}, ... ]
    Intersection of langs present for ALL choices.
    """
    if not choices_i18n:
        return []
    langs = None
    for choice in choices_i18n:
        if not isinstance(choice, dict):
            return []
        available = set(k for k, v in choice.items() if k in SUPPORTED_UI_LANGS and str(v).strip())
        langs = available if langs is None else (langs & available)
    return sorted(langs) if langs else []

class ActivityCreateSerializer(serializers.Serializer):
    """
    Unified serializer for creating any activity type
    Validates based on ActivitySchemaRegistry
    """
    
    # Common fields (all activity types)
    activity_type = serializers.ChoiceField(
        choices=ActivitySchemaRegistry.get_all_types(),
        help_text="Type of activity to create"
    )
    lesson_id = serializers.IntegerField()
    
    # Base activity fields (optional with smart defaults)
    question_text = serializers.CharField(required=False, allow_blank=True)
    question_text_key = serializers.CharField(required=False, allow_blank=True)
    translation_data = serializers.JSONField(required=False, default=dict)
    explanation = serializers.CharField(required=False, allow_blank=True)
    explanation_key = serializers.CharField(required=False, allow_blank=True)
    points = serializers.IntegerField(default=10, min_value=1, max_value=100)
    difficulty = serializers.ChoiceField(
        choices=['EASY', 'MEDIUM', 'HARD'],
        default='MEDIUM'
    )
    order = serializers.IntegerField(default=0, min_value=0)
    
    # Type-specific fields (validated dynamically)
    type_specific_data = serializers.JSONField(
        required=False,
        default=dict,
        help_text="Activity-type-specific fields (choices, correct_answer, etc.)"
    )
    
    def validate(self, data):
        """
        Validate against activity type schema
        Scalable: no hardcoded validation per type
        """
        activity_type = data.get('activity_type')
        if not activity_type:
            raise serializers.ValidationError("activity_type is required")
        
        # Merge type_specific_data into main data for validation
        merged_data = {**data, **data.get('type_specific_data', {})}
        
        # Validate using schema registry
        is_valid, error_msg = ActivitySchemaRegistry.validate_activity_data(
            activity_type, merged_data
        )
        
        if not is_valid:
            raise serializers.ValidationError({
                'type_specific_data': error_msg
            })
        
        # Validate lesson exists and user has access
        lesson_id = data.get('lesson_id')
        try:
            lesson = Lesson.objects.get(id=lesson_id)
            # Check if lesson is published (teachers can only add to published lessons)
            if not lesson.is_published and self.context['request'].user.role != 'ADMIN':
                raise serializers.ValidationError({
                    'lesson_id': 'Can only add activities to published lessons'
                })
        except Lesson.DoesNotExist:
            raise serializers.ValidationError({
                'lesson_id': f'Lesson with id {lesson_id} does not exist'
            })
        
        data['lesson'] = lesson
        return data
    
    def create(self, validated_data):
        """
        Create polymorphic activity instance
        Automatically determines if auto-approved based on user permissions
        """
        user = self.context['request'].user
        activity_type = validated_data['activity_type']
        lesson = validated_data['lesson']
        type_specific_data = validated_data.get('type_specific_data', {})
        
        # Determine initial status
        if user.can_publish_directly:
            initial_status = 'APPROVED'
        else:
            initial_status = 'DRAFT'
        
        # Get the polymorphic model class
        from . import models as activity_models
        ActivityClass = getattr(activity_models, activity_type)

        # Auto-compute supported_ui_languages for multilingual teacher content
        supported_ui_languages = []

        if activity_type == "MatchingActivity":
            pairs_i18n = type_specific_data.get("pairs_i18n") or {}
            supported_ui_languages = _intersection_from_pairs_i18n(pairs_i18n)

        elif activity_type in ("MCQActivity", "MultipleAnswerActivity"):
            choices_i18n = type_specific_data.get("choices_i18n") or []
            supported_ui_languages = _intersection_from_choices_i18n(choices_i18n)

        
        # Build kwargs for activity creation
        activity_kwargs = {
            'lesson': lesson,
            'created_by': user,
            'status': initial_status,
            'question_text': validated_data.get('question_text', ''),
            'question_text_key': validated_data.get('question_text_key'),
            'translation_data': validated_data.get('translation_data', {}),
            'explanation': validated_data.get('explanation', ''),
            'explanation_key': validated_data.get('explanation_key'),
            'supported_ui_languages': supported_ui_languages,
            'points': validated_data.get('points', 10),
            'difficulty': validated_data.get('difficulty', 'MEDIUM'),
            'order': validated_data.get('order', 0),
            **type_specific_data  # Merge type-specific fields
        }
        
        # Create activity
        activity = ActivityClass.objects.create(**activity_kwargs)
        
        logger.info(
            f"Teacher {user.username} created {activity_type} #{activity.id} "
            f"with status={initial_status}"
        )
        
        return activity


class ActivityUpdateSerializer(serializers.Serializer):
    """
    Update existing activity
    Creates new version if activity is already approved
    """
    
    # Allow partial updates
    question_text = serializers.CharField(required=False)
    question_text_key = serializers.CharField(required=False, allow_blank=True)
    translation_data = serializers.JSONField(required=False)
    explanation = serializers.CharField(required=False, allow_blank=True)
    explanation_key = serializers.CharField(required=False, allow_blank=True)
    points = serializers.IntegerField(required=False, min_value=1, max_value=100)
    difficulty = serializers.ChoiceField(
        choices=['EASY', 'MEDIUM', 'HARD'],
        required=False
    )
    order = serializers.IntegerField(required=False, min_value=0)
    
    type_specific_data = serializers.JSONField(required=False)
    version_notes = serializers.CharField(
        required=False,
        help_text="Notes about what changed in this version"
    )
    
    def validate(self, data):
        """Validate update data against activity schema"""
        activity = self.context['activity']
        activity_type = activity.__class__.__name__
        
        # Merge existing data with updates
        merged_data = {
            'activity_type': activity_type,
            'lesson_id': activity.lesson_id,
            **data.get('type_specific_data', {})
        }
        
        # Validate
        is_valid, error_msg = ActivitySchemaRegistry.validate_activity_data(
            activity_type, merged_data
        )

        activity_type = activity.__class__.__name__
        type_specific = data.get("type_specific_data", {}) or {}



        if activity_type == "MatchingActivity" and type_specific.get("pairs_i18n"):
            computed = _intersection_from_pairs_i18n(type_specific["pairs_i18n"])
            if not computed:
                raise serializers.ValidationError({
                    "type_specific_data": "pairs_i18n must include at least one complete UI language (e.g. all entries have 'en')."
                })

        if activity_type in ("MCQActivity", "MultipleAnswerActivity") and type_specific.get("choices_i18n"):
            computed = _intersection_from_choices_i18n(type_specific["choices_i18n"])
            if not computed:
                raise serializers.ValidationError({
                    "type_specific_data": "choices_i18n must include at least one complete UI language across all choices."
                })

        
        if not is_valid:
            raise serializers.ValidationError({
                'type_specific_data': error_msg
            })
        
        return data
    
    def update(self, instance, validated_data):
        """
        Update activity
        If already APPROVED, create new version (v2, v3, etc.)
        """
        user = self.context['request'].user
        type_specific_data = validated_data.pop('type_specific_data', {})
        version_notes = validated_data.pop('version_notes', '')
        
        # If activity is APPROVED, create new version
        if instance.status == 'APPROVED':
            # Clone the activity as a new version
            new_version = instance.__class__.objects.get(pk=instance.pk)
            new_version.pk = None  # Create new instance
            new_version.version = instance.version + 1
            new_version.previous_version = instance
            new_version.status = 'PENDING'  # Needs re-approval
            new_version.version_notes = version_notes or f"Updated by {user.username}"
            
            # Apply updates
            for field, value in validated_data.items():
                setattr(new_version, field, value)
            for field, value in type_specific_data.items():
                setattr(new_version, field, value)

            # Recompute supported_ui_languages if multilingual payload is present
            target_obj = new_version if instance.status == 'APPROVED' else instance
            atype = target_obj.__class__.__name__

            if atype == "MatchingActivity" and getattr(target_obj, "pairs_i18n", None):
                target_obj.supported_ui_languages = _intersection_from_pairs_i18n(target_obj.pairs_i18n)
            elif atype in ("MCQActivity", "MultipleAnswerActivity") and getattr(target_obj, "choices_i18n", None):
                target_obj.supported_ui_languages = _intersection_from_choices_i18n(target_obj.choices_i18n)

            
            new_version.save()
            
            logger.info(
                f"Created v{new_version.version} of activity #{instance.id} "
                f"(status=PENDING, awaiting re-approval)"
            )
            
            return new_version
        
        else:
            # DRAFT or PENDING - just update in place
            for field, value in validated_data.items():
                setattr(instance, field, value)
            for field, value in type_specific_data.items():
                setattr(instance, field, value)

            # Recompute supported_ui_languages if multilingual payload is present
            target_obj = instance
            atype = target_obj.__class__.__name__

            if atype == "MatchingActivity" and getattr(target_obj, "pairs_i18n", None):
                target_obj.supported_ui_languages = _intersection_from_pairs_i18n(target_obj.pairs_i18n)
            elif atype in ("MCQActivity", "MultipleAnswerActivity") and getattr(target_obj, "choices_i18n", None):
                target_obj.supported_ui_languages = _intersection_from_choices_i18n(target_obj.choices_i18n)

            instance.save()
            
            logger.info(f"Updated activity #{instance.id} (status={instance.status})")
            
            return instance


class TeacherActivityListSerializer(serializers.Serializer):
    """List view for teacher's activities"""
    id = serializers.IntegerField()
    activity_type = serializers.SerializerMethodField()
    lesson = serializers.SerializerMethodField()
    question_text = serializers.CharField()
    status = serializers.CharField()
    version = serializers.IntegerField()
    difficulty = serializers.CharField()
    points = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    
    # Performance stats (if available)
    total_attempts = serializers.IntegerField(required=False, default=0)
    average_accuracy = serializers.FloatField(required=False, default=0.0)
    
    def get_activity_type(self, obj):
        return obj.__class__.__name__
    
    def get_lesson(self, obj):
        return {
            'id': obj.lesson.id,
            'title': obj.lesson.title,
            'level': obj.lesson.level.code,
            'subject': obj.lesson.subject.title
        }


class ActivityPerformanceSerializer(serializers.Serializer):
    """Detailed performance stats for a single activity"""
    activity_id = serializers.IntegerField()
    total_attempts = serializers.IntegerField()
    unique_students = serializers.IntegerField()
    average_accuracy = serializers.FloatField()
    median_time_seconds = serializers.IntegerField()
    flagged_count = serializers.IntegerField()
    needs_review = serializers.BooleanField()