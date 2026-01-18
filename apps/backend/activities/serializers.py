from rest_framework import serializers
from django.utils.translation import gettext as _
from django.utils import translation
from rest_polymorphic.serializers import PolymorphicSerializer
from activities.models import (
    Activity, MCQActivity, FillBlankActivity, MatchingActivity,
    DragOrderActivity, ConjugationActivity, MultipleAnswerActivity,
    TextInputActivity, DicteeActivity
)


# Individual serializers for each activity type
class MCQActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = MCQActivity
        fields = '__all__'


class FillBlankActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = FillBlankActivity
        fields = '__all__'


class MatchingActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchingActivity
        fields = '__all__'


class DragOrderActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DragOrderActivity
        fields = '__all__'


class ConjugationActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ConjugationActivity
        fields = '__all__'


class MultipleAnswerActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = MultipleAnswerActivity
        fields = '__all__'


class TextInputActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TextInputActivity
        fields = '__all__'


class DicteeActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DicteeActivity
        fields = '__all__'


# Base Activity Serializer (Fallback)
class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = '__all__'


# Main polymorphic serializer with translation engine
class ActivityPolymorphicSerializer(PolymorphicSerializer):
    """
    The Translation Engine
    Resolves translation keys at runtime based on user's native language
    """
    
    model_serializer_mapping = {
        Activity: ActivitySerializer,
        MCQActivity: MCQActivitySerializer,
        FillBlankActivity: FillBlankActivitySerializer,
        MatchingActivity: MatchingActivitySerializer,
        DragOrderActivity: DragOrderActivitySerializer,
        ConjugationActivity: ConjugationActivitySerializer,
        MultipleAnswerActivity: MultipleAnswerActivitySerializer,
        TextInputActivity: TextInputActivitySerializer,
        DicteeActivity: DicteeActivitySerializer,
    }
    
    def to_representation(self, instance):
        """
        Intercepts serialization to resolve translation keys
        Falls back to original text if keys are missing
        """
        
        # 1. Determine user's language
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            # Fallback to 'fr' (French) if native_language is not set
            user_lang = getattr(request.user, 'native_language', 'fr') or 'fr'
        else:
            user_lang = 'fr'  # Default fallback to French
        
        # 2. Detect RTL languages
        is_rtl = user_lang in ['ar', 'he', 'fa', 'ur']
        
        # 3. Activate translation context
        with translation.override(user_lang):
            
            # Get base representation from polymorphic serializer
            data = super().to_representation(instance)

            # Expose supported UI languages (useful for frontend debugging / logic)
            data['supported_ui_languages'] = instance.supported_ui_languages

            
            # Add RTL metadata
            data['is_rtl'] = is_rtl
            data['user_language'] = user_lang
            
            # ===== TRANSLATION RESOLUTION =====
            
            # A. Question Text
            if instance.question_text_key:
                try:
                    trans_str = _(instance.question_text_key)
                    # Process translation_data to handle translatable variables (prefixed with 'key:')
                    safe_context = {}
                    if instance.translation_data:
                        for k, v in instance.translation_data.items():
                            if isinstance(v, str) and v.startswith('key:'):
                                try:
                                    safe_context[k] = _(v.replace('key:', '', 1))
                                except:
                                    safe_context[k] = v
                            else:
                                safe_context[k] = v
                    
                    # Interpolate with safe_context
                    data['question_text'] = trans_str.format(**safe_context)
                except (KeyError, ValueError, Exception):
                    # No fallback field anymore
                    pass

            # B. General Instruction
            if instance.instruction_key:
                try:
                    trans_str = _(instance.instruction_key)
                    # Use same context as question_text
                    safe_context = {}
                    if instance.translation_data:
                        for k, v in instance.translation_data.items():
                            if isinstance(v, str) and v.startswith('key:'):
                                try:
                                    safe_context[k] = _(v.replace('key:', '', 1))
                                except:
                                    safe_context[k] = v
                            else:
                                safe_context[k] = v
                    
                    data['instruction'] = trans_str.format(**safe_context)
                except Exception:
                    # Fallback to literal translated string or None
                    try:
                        data['instruction'] = _(instance.instruction_key)
                    except:
                        data['instruction'] = None
            else:
                data['instruction'] = None
            
            # C. Explanation
            if instance.explanation_key:
                try:
                    trans_str = _(instance.explanation_key)
                    data['explanation'] = trans_str.format(**instance.translation_data)
                except (KeyError, ValueError, Exception):
                    data['explanation'] = None
            
            # ===== ACTIVITY-SPECIFIC LOGIC =====

            # ===== FILL BLANK: Phrase resolution =====
            if isinstance(instance, FillBlankActivity):
                if instance.phrase_key:
                    try:
                        data['phrase'] = _(instance.phrase_key)
                    except Exception:
                        data['phrase'] = instance.phrase
                else:
                    data['phrase'] = instance.phrase

            
            # C. MCQ & MultipleAnswer: Multilingual choices (teacher-created)
            if isinstance(instance, (MCQActivity, MultipleAnswerActivity)):
                def _render_choice(ch):
                    content = ch.get("content") or {}
                    i18n = content.get("i18n") or {}

                    rendered = content.get("value")
                    if isinstance(i18n, dict):
                        if user_lang in i18n and isinstance(i18n[user_lang], str) and i18n[user_lang].strip():
                            rendered = i18n[user_lang]
                        elif "fr" in i18n and isinstance(i18n["fr"], str) and i18n["fr"].strip():
                            rendered = i18n["fr"]

                    return {
                        "id": ch.get("id"),
                        "content": content,
                        "rendered_value": rendered,
                    }

                data["choices_v2"] = [_render_choice(ch) for ch in (instance.choices_v2 or []) if isinstance(ch, dict)]


            # D. Matching (V2): Render pairs_v2 with UI-language fallback
            if isinstance(instance, MatchingActivity):
                def _render_item(item: dict):
                    # item: {type, value, i18n?}
                    if not isinstance(item, dict):
                        return item
                    t = item.get("type")
                    v = item.get("value")
                    i18n = item.get("i18n") or {}

                    rendered = v
                    if isinstance(i18n, dict):
                        # best: user lang
                        if user_lang in i18n and isinstance(i18n[user_lang], str) and i18n[user_lang].strip():
                            rendered = i18n[user_lang]
                        # fallback: fr if present
                        elif "fr" in i18n and isinstance(i18n["fr"], str) and i18n["fr"].strip():
                            rendered = i18n["fr"]

                    return {
                        "type": t,
                        "value": v,
                        "rendered_value": rendered,
                        "i18n": i18n,
                    }

                rendered_pairs_v2 = []
                for pair in (instance.pairs_v2 or []):
                    if not isinstance(pair, dict):
                        continue
                    rendered_pairs_v2.append({
                        "id": pair.get("id"),
                        "left": _render_item(pair.get("left") or {}),
                        "right": _render_item(pair.get("right") or {}),
                    })

                data["pairs_v2"] = rendered_pairs_v2


            return data
