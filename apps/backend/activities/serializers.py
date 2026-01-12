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
            
            # C. MCQ & MultipleAnswer: Multilingual choices (teacher-created)
            if isinstance(instance, (MCQActivity, MultipleAnswerActivity)):
                if instance.choices_i18n:
                    # Teacher-created multilingual choices
                    rendered_choices = []
                    for choice in instance.choices_i18n:
                        if isinstance(choice, dict) and user_lang in choice:
                            rendered_choices.append(choice[user_lang])
                        elif isinstance(choice, dict) and 'fr' in choice:
                            rendered_choices.append(choice['fr'])  # fallback
                    data['choices'] = rendered_choices

                elif instance.choices_are_translatable and instance.choices_keys:
                    # Legacy gettext-based choices
                    translated_choices = []
                    for idx, key in enumerate(instance.choices_keys):
                        try:
                            translated_choices.append(_(key))
                        except Exception:
                            translated_choices.append(instance.choices[idx] if idx < len(instance.choices) else key)
                    data['choices'] = translated_choices

            # D. Matching: Multilingual pairs (teacher-created)
            if isinstance(instance, MatchingActivity):
                if instance.pairs_i18n:
                    rendered_pairs = {}

                    for fr_word, translations in instance.pairs_i18n.items():
                        if not isinstance(translations, dict):
                            continue

                        # 1) Best: user language translation
                        if user_lang in translations:
                            rendered_pairs[fr_word] = translations[user_lang]
                            continue

                        # 2) If a French translation exists in i18n (some activities might have it)
                        if 'fr' in translations:
                            rendered_pairs[fr_word] = translations['fr']
                            continue

                        # 3) Otherwise fallback to the legacy/simple pairs dict (your FR->EN storage)
                        if isinstance(instance.pairs, dict) and fr_word in instance.pairs:
                            rendered_pairs[fr_word] = instance.pairs[fr_word]
                            continue

                        # 4) Last fallback: pick any available translation (stable)
                        if translations:
                            rendered_pairs[fr_word] = next(iter(translations.values()))

                    data['pairs'] = rendered_pairs


                elif instance.values_are_translatable:
                    # Legacy gettext-based pairs
                    translated_pairs = {}
                    for key, value in instance.pairs.items():
                        if isinstance(value, str) and value.startswith('key:'):
                            try:
                                translated_pairs[key] = _(value.replace('key:', '', 1))
                            except Exception:
                                translated_pairs[key] = value
                        else:
                            translated_pairs[key] = value
                    data['pairs'] = translated_pairs

            return data
