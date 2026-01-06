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
                    # Fallback to original question_text on any error
                    pass
            
            # B. Explanation
            if instance.explanation_key:
                try:
                    trans_str = _(instance.explanation_key)
                    data['explanation'] = trans_str.format(**instance.translation_data)
                except (KeyError, ValueError, Exception):
                    pass
            
            # ===== ACTIVITY-SPECIFIC LOGIC =====
            
            # C. MCQ & MultipleAnswer: Choice Translation
            if isinstance(instance, (MCQActivity, MultipleAnswerActivity)):
                if instance.choices_are_translatable and instance.choices_keys:
                    # Cases B & C: Translate choices
                    translated_choices = []
                    for idx, key in enumerate(instance.choices_keys):
                        try:
                            translated_choices.append(_(key))
                        except Exception:
                            # Fallback to original choice if key fails
                            if idx < len(instance.choices):
                                translated_choices.append(instance.choices[idx])
                            else:
                                translated_choices.append(key)
                    data['choices'] = translated_choices
                # Case A: choices stay in French (already in data)
            
            # D. Matching: Value Translation
            if isinstance(instance, MatchingActivity):
                if instance.values_are_translatable:
                    translated_pairs = {}
                    for key, value in instance.pairs.items():
                        if isinstance(value, str) and value.startswith('key:'):
                            # This is a translation key
                            translation_key = value.replace('key:', '', 1)
                            try:
                                translated_pairs[key] = _(translation_key)
                            except Exception:
                                translated_pairs[key] = value  # Fallback
                        else:
                            # Literal value (French text)
                            translated_pairs[key] = value
                    data['pairs'] = translated_pairs
                # Otherwise pairs stay as-is (French-French matching)
            
            return data
