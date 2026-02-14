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


def _intersection_from_pairs_v2(pairs_v2: list) -> list[str]:
    """
    We compute intersection of languages that exist for ALL pairs, across BOTH sides (left/right),
    but only where i18n is present.
    
    Rule:
    - If no i18n is present anywhere -> return []
    - If i18n exists: a language is "supported" only if it exists for every item that has i18n.
    """
    if not pairs_v2:
        return []

    langs = None
    has_any_i18n = False

    for pair in pairs_v2:
        if not isinstance(pair, dict):
            return []
        for side in ("left", "right"):
            item = pair.get(side)
            if not isinstance(item, dict):
                return []
            i18n = item.get("i18n")
            if not i18n:
                continue

            has_any_i18n = True
            if not isinstance(i18n, dict):
                return []

            available = set(
                k for k, v in i18n.items()
                if k in SUPPORTED_UI_LANGS and isinstance(v, str) and v.strip()
            )

            langs = available if langs is None else (langs & available)

    if not has_any_i18n:
        return []
    return sorted(langs) if langs else []

def _intersection_from_choices_v2(choices_v2: list) -> list[str]:
    if not choices_v2:
        return []

    langs = None
    has_any_i18n = False

    for ch in choices_v2:
        if not isinstance(ch, dict):
            continue
        content = ch.get("content") or {}
        if not isinstance(content, dict):
            continue
        i18n = content.get("i18n")
        if not i18n or not isinstance(i18n, dict):
            continue

        has_any_i18n = True
        available = set(
            k for k, v in i18n.items()
            if k in SUPPORTED_UI_LANGS and isinstance(v, str) and v.strip()
        )
        langs = available if langs is None else (langs & available)

    if not has_any_i18n:
        return []
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
    instruction_key = serializers.CharField(required=False, allow_blank=True)
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
        # Backward compatible input: if client sends raw question_text, store it as translation_data fallback
        raw_question = (validated_data.get("question_text") or "").strip()
        if raw_question and not validated_data.get("question_text_key"):
            # Store as plain data until you enforce keys-only everywhere
            validated_data["translation_data"] = {**validated_data.get("translation_data", {}), "raw_question_text": raw_question}


        if activity_type == "MatchingActivity":
            pairs_v2 = type_specific_data.get("pairs_v2") or []
            supported_ui_languages = _intersection_from_pairs_v2(pairs_v2)

        elif activity_type in ("MCQActivity", "MultipleAnswerActivity"):
            choices_v2 = type_specific_data.get("choices_v2") or []
            supported_ui_languages = _intersection_from_choices_v2(choices_v2)


        
        # Build kwargs for activity creation
        activity_kwargs = {
            'lesson': lesson,
            'created_by': user,
            'status': initial_status,
            'question_text_key': validated_data.get('question_text_key'),
            'instruction_key': validated_data.get('instruction_key'),
            'translation_data': validated_data.get('translation_data', {}),
            'explanation_key': validated_data.get('explanation_key'),
            'supported_ui_languages': supported_ui_languages,
            'points': validated_data.get('points', 10),
            'difficulty': validated_data.get('difficulty', 'MEDIUM'),
            'order': validated_data.get('order', 0),
            **type_specific_data  # Merge type-specific fields (choices_v2, pairs_v2, etc.)
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
    instruction_key = serializers.CharField(required=False, allow_blank=True)
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
        """Validate update data against activity schema (PATCH-safe, V2-friendly)."""

        
        activity = self.context["activity"]

        # Always trust the instance type (PATCH requests shouldn't change it)
        activity_type = activity.__class__.__name__

        # Type-specific incoming patch data
        type_specific = data.get("type_specific_data", {}) or {}
        if not isinstance(type_specific, dict):
            raise serializers.ValidationError({
                "type_specific_data": "Must be an object (JSON dict)."
            })

        # Build merged data: start with existing instance fields, override with incoming data, then override with type_specific
        merged_data = {
            "activity_type": activity_type,
            "lesson_id": activity.lesson_id,
            "question_text": getattr(activity, "question_text", None),
            "question_text_key": getattr(activity, "question_text_key", None),
            "instruction_key": getattr(activity, "instruction_key", None),
            "points": getattr(activity, "points", 10),
            "difficulty": getattr(activity, "difficulty", "MEDIUM"),
            **data, # Incoming top-level fields (to handle updates to question_text, etc.)
            **type_specific, # Incoming type-specific fields (to handle updates to choices, etc.)
        }

        # Fallback required type fields from existing instance (so PATCH can be partial)
        if activity_type == "MatchingActivity" and "pairs_v2" not in merged_data:
            merged_data["pairs_v2"] = getattr(activity, "pairs_v2", None)

        if activity_type == "MCQActivity":
            if "choices_v2" not in merged_data:
                merged_data["choices_v2"] = getattr(activity, "choices_v2", None)
            if "correct_choice_id" not in merged_data:
                merged_data["correct_choice_id"] = getattr(activity, "correct_choice_id", None)

        if activity_type == "MultipleAnswerActivity":
            if "choices_v2" not in merged_data:
                merged_data["choices_v2"] = getattr(activity, "choices_v2", None)
            if "correct_choice_ids" not in merged_data:
                merged_data["correct_choice_ids"] = getattr(activity, "correct_choice_ids", None)

        if activity_type == "FillBlankActivity" and "correct_answer" not in merged_data:
            merged_data["correct_answer"] = getattr(activity, "correct_answer", None)

        if activity_type == "DragOrderActivity":
            if "words" not in merged_data:
                merged_data["words"] = getattr(activity, "words", None)
            if "correct_order" not in merged_data:
                merged_data["correct_order"] = getattr(activity, "correct_order", None)

        if activity_type == "ConjugationActivity":
            for f in ("verb_infinitive", "tense", "pronoun", "correct_conjugation"):
                if f not in merged_data:
                    merged_data[f] = getattr(activity, f, None)

        if activity_type == "TextInputActivity" and "correct_answers" not in merged_data:
            merged_data["correct_answers"] = getattr(activity, "correct_answers", None)

        if activity_type == "DicteeActivity":
            if "correct_text" not in merged_data:
                merged_data["correct_text"] = getattr(activity, "correct_text", None)
            if "audio_urls" not in merged_data:
                merged_data["audio_urls"] = getattr(activity, "audio_urls", None)

        # ✅ Validate via schema registry (this is where V2-only enforcement happens)
        logger.info(
            "[SER_VALIDATE] type=%s activity_id=%s fields=%s has_type_specific=%s",
            activity_type,
            activity.id,
            sorted(list(data.keys())),
            bool(type_specific),
        )

        is_valid, error_msg = ActivitySchemaRegistry.validate_activity_data(activity_type, merged_data)
        if not is_valid:
            logger.warning(f"Validation failed for {activity_type} #{activity.id}: {error_msg}")
            raise serializers.ValidationError({"type_specific_data": error_msg})

        # Extra safety: if i18n exists anywhere but intersection is empty → reject
        if activity_type == "MatchingActivity" and type_specific.get("pairs_v2"):
            computed = _intersection_from_pairs_v2(type_specific["pairs_v2"])
            has_any_i18n = any(
                isinstance(p, dict) and isinstance(p.get(side), dict) and p.get(side, {}).get("i18n")
                for p in (type_specific.get("pairs_v2") or [])
                for side in ("left", "right")
            )
            if has_any_i18n and not computed:
                raise serializers.ValidationError({
                    "type_specific_data": "pairs_v2 i18n must include at least one complete UI language across all translated items (e.g. all have 'en')."
                })

        if activity_type in ("MCQActivity", "MultipleAnswerActivity") and type_specific.get("choices_v2"):
            computed = _intersection_from_choices_v2(type_specific["choices_v2"])
            has_any_i18n = any(
                isinstance(ch, dict)
                and isinstance((ch.get("content") or {}), dict)
                and isinstance((ch.get("content") or {}).get("i18n"), dict)
                and bool((ch.get("content") or {}).get("i18n"))
                for ch in (type_specific.get("choices_v2") or [])
            )
            if has_any_i18n and not computed:
                raise serializers.ValidationError({
                    "type_specific_data": "choices_v2 i18n must include at least one complete UI language across all choices (e.g. all choices have 'en')."
                })

        return data

    
    def update(self, instance, validated_data):
        """
        Update activity
        If already APPROVED, create new version (v2, v3, etc.)
        """

        logger.info(
            "[SER_UPDATE] START instance_id=%s type=%s status=%s version=%s prev=%s",
            instance.id,
            instance.__class__.__name__,
            instance.status,
            instance.version,
            instance.previous_version_id,
        )

        user = self.context['request'].user
        type_specific_data = validated_data.pop('type_specific_data', {})
        version_notes = validated_data.pop('version_notes', '')
        
        # If activity is APPROVED, create new version
        if instance.status == 'APPROVED':
            # Clone the activity as a new version

            logger.info(
                "[SER_UPDATE] APPROVED BRANCH: cloning instance_id=%s (pk=%s)",
                instance.id,
                instance.pk,
            )

            new_version = instance.__class__.objects.get(pk=instance.pk)

            # --- polymorphic clone: must clear BOTH pk and id, plus the
            #     cached _polymorphic_ctype so Django issues an INSERT.
            #     Setting only pk=None is not enough: the inherited `id`
            #     column (the polymorphic base PK) survives and Django
            #     treats save() as an UPDATE of the original row.
            new_version.pk = None
            new_version.id = None
            # Ensure polymorphic machinery picks up the type fresh on save
            if hasattr(new_version, '_polymorphic_ctype'):
                del new_version._polymorphic_ctype

            logger.info(
                "[SER_UPDATE] AFTER pk/id=None new_version.pk=%s new_version.id=%s (both should be None)",
                new_version.pk,
                new_version.id,
            )

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

            if atype == "MatchingActivity" and getattr(target_obj, "pairs_v2", None):
                target_obj.supported_ui_languages = _intersection_from_pairs_v2(target_obj.pairs_v2)
            elif atype in ("MCQActivity", "MultipleAnswerActivity") and getattr(target_obj, "choices_v2", None):
                target_obj.supported_ui_languages = _intersection_from_choices_v2(target_obj.choices_v2)

            logger.info(
                "[SER_UPDATE] BEFORE save new_version.pk=%s new_version.id=%s version=%s prev_id=%s status=%s",
                new_version.pk,
                new_version.id,
                new_version.version,
                getattr(new_version, "previous_version_id", None),
                new_version.status,
            )

            # Pre-flight: previous_version must still point to the original
            # instance, not to None or to ourself (ourself is None here, so
            # the real danger is previous_version_id being None after we
            # cleared id — guard against that too).
            if new_version.previous_version_id is None:
                raise RuntimeError(
                    f"Versioning setup error: previous_version was lost before save "
                    f"(instance.id={instance.id})."
                )

            new_version.save(force_insert=True)


            logger.info(
                "[SER_UPDATE] AFTER save new_version.id=%s pk=%s version=%s prev_id=%s status=%s",
                new_version.id,
                new_version.pk,
                new_version.version,
                new_version.previous_version_id,
                new_version.status,
            )

            # Post-save safety: should never happen now, but keep as a hard stop
            if new_version.previous_version_id == new_version.id:
                logger.error(
                    "[SER_UPDATE] CORRUPTION: new_version.id=%s prev_id=%s instance_id=%s instance_prev=%s",
                    new_version.id,
                    new_version.previous_version_id,
                    instance.id,
                    instance.previous_version_id,
                )
                raise RuntimeError(
                    f"Versioning corruption detected: activity {new_version.id} points to itself."
                )

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

            if atype == "MatchingActivity" and getattr(target_obj, "pairs_v2", None):
                target_obj.supported_ui_languages = _intersection_from_pairs_v2(target_obj.pairs_v2)
            elif atype in ("MCQActivity", "MultipleAnswerActivity") and getattr(target_obj, "choices_v2", None):
                target_obj.supported_ui_languages = _intersection_from_choices_v2(target_obj.choices_v2)

            instance.save()
            
            logger.info(f"Updated activity #{instance.id} (status={instance.status})")
            
            return instance


class TeacherActivityListSerializer(serializers.Serializer):
    """List view for teacher's activities"""
    id = serializers.IntegerField()
    activity_type = serializers.SerializerMethodField()
    lesson = serializers.SerializerMethodField()
    
    # Resolved text fields (translated)
    question_text = serializers.SerializerMethodField()
    instruction_text = serializers.SerializerMethodField()
    
    # Raw i18n keys (for debugging/reference)
    question_text_key = serializers.SerializerMethodField()
    instruction_key = serializers.SerializerMethodField()
    
    # Type-specific data for previews
    type_specific_data = serializers.SerializerMethodField()

    status = serializers.CharField()
    version = serializers.IntegerField()
    difficulty = serializers.CharField()
    points = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    
    # Creator and modifier info
    created_by = serializers.SerializerMethodField()
    modified_by = serializers.SerializerMethodField()
    
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
    
    def get_created_by(self, obj):
        if obj.created_by:
            return {
                'id': obj.created_by.id,
                'username': obj.created_by.username
            }
        return None
    
    def get_modified_by(self, obj):
        if hasattr(obj, 'modified_by') and obj.modified_by:
            return {
                'id': obj.modified_by.id,
                'username': obj.modified_by.username
            }
        return None
    
    def get_question_text(self, obj):
        """
        Return the question text, resolved from i18n key if needed.
        Uses Django's translation system to resolve the key in user's native language.
        """
        from django.utils import translation
        from django.utils.translation import gettext as _
        
        # First check for legacy direct question_text attribute
        legacy_text = getattr(obj, "question_text", None)
        if legacy_text and isinstance(legacy_text, str) and legacy_text.strip():
            return legacy_text
        
        # Try to resolve the question_text_key in user's language
        key = getattr(obj, "question_text_key", None)
        if key:
            # Get user's preferred language from request context
            request = self.context.get('request')
            user_lang = 'fr'  # default
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                user_lang = getattr(request.user, 'native_language', 'fr') or 'fr'
            
            # Activate the user's language and translate
            with translation.override(user_lang):
                translated = _(key)
            
            return translated if translated != key else key
        
        return ""
    
    def get_instruction_text(self, obj):
        """
        Return the instruction text, resolved from i18n key.
        Uses Django's translation system to resolve the key in user's native language.
        """
        from django.utils import translation
        from django.utils.translation import gettext as _
        
        # First check for legacy direct instruction attribute
        legacy_text = getattr(obj, "instruction", None)
        if legacy_text and isinstance(legacy_text, str) and legacy_text.strip():
            return legacy_text
        
        # Try to resolve the instruction_key in user's language
        key = getattr(obj, "instruction_key", None)
        if key:
            # Get user's preferred language from request context
            request = self.context.get('request')
            user_lang = 'fr'  # default
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                user_lang = getattr(request.user, 'native_language', 'fr') or 'fr'
            
            # Activate the user's language and translate
            with translation.override(user_lang):
                translated = _(key)
            
            return translated if translated != key else key
        
        return ""
    
    def get_question_text_key(self, obj):
        """Return the raw question_text_key for debugging"""
        return getattr(obj, "question_text_key", None) or ""
    
    def get_instruction_key(self, obj):
        """Return the raw instruction_key for debugging"""
        return getattr(obj, "instruction_key", None) or ""
    
    def get_type_specific_data(self, obj):
        """
        Extract activity-type specific data for previews
        Returns different fields based on the polymorphic activity type
        """
        activity_type = obj.__class__.__name__
        data = {}
        
        # MCQ and MultipleAnswer activities
        if hasattr(obj, 'choices_v2') and obj.choices_v2:
            data['choices_v2'] = obj.choices_v2
        if hasattr(obj, 'correct_choice_id') and obj.correct_choice_id:
            data['correct_choice_id'] = obj.correct_choice_id
        if hasattr(obj, 'correct_choice_ids') and obj.correct_choice_ids:
            data['correct_choice_ids'] = obj.correct_choice_ids
            
        # Matching activities
        if hasattr(obj, 'pairs_v2') and obj.pairs_v2:
            data['pairs_v2'] = obj.pairs_v2
            
        # Dictee activities
        if hasattr(obj, 'audio_urls') and obj.audio_urls:
            data['audio_urls'] = obj.audio_urls
        if hasattr(obj, 'correct_text') and obj.correct_text:
            data['text'] = obj.correct_text  # Map to 'text' for frontend compatibility
            
        # FillBlank activities
        if hasattr(obj, 'phrase') and obj.phrase:
            data['phrase'] = obj.phrase
        if hasattr(obj, 'correct_answer') and obj.correct_answer:
            data['correct_answer'] = obj.correct_answer
            
        # DragOrder activities
        if hasattr(obj, 'words') and obj.words:
            data['words'] = obj.words
        if hasattr(obj, 'correct_order') and obj.correct_order:
            data['correct_order'] = obj.correct_order
            
        # Conjugation activities
        if hasattr(obj, 'verb_infinitive') and obj.verb_infinitive:
            data['verb_infinitive'] = obj.verb_infinitive
        if hasattr(obj, 'tense') and obj.tense:
            data['tense'] = obj.tense
        if hasattr(obj, 'pronoun') and obj.pronoun:
            data['pronoun'] = obj.pronoun
        if hasattr(obj, 'correct_conjugation') and obj.correct_conjugation:
            data['conjugation'] = obj.correct_conjugation  # Map to 'conjugation' for frontend
            
        # TextInput activities
        if hasattr(obj, 'correct_answers') and obj.correct_answers:
            data['correct_answers'] = obj.correct_answers
        if hasattr(obj, 'case_sensitive'):
            data['case_sensitive'] = obj.case_sensitive
            
        return data



class ActivityPerformanceSerializer(serializers.Serializer):
    """Detailed performance stats for a single activity"""
    activity_id = serializers.IntegerField()
    total_attempts = serializers.IntegerField()
    unique_students = serializers.IntegerField()
    average_accuracy = serializers.FloatField()
    median_time_seconds = serializers.IntegerField()
    flagged_count = serializers.IntegerField()
    needs_review = serializers.BooleanField()