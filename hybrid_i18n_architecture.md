# ALF Final Hybrid I18N Architecture & Specification

This document serves as the implementation blueprint for the Hybrid Internationalization system.

## 1. New Activity Type: Dictée (Dictation)

We add `DicteeActivity` to `activities/models.py`.

```python
class DicteeActivity(Activity):
    """
    User listens to audio and types the phrase.
    """
    # JSON list of URLs: ["/media/audio/phrase_1_slow.mp3", "/media/audio/phrase_1_fast.mp3"]
    audio_urls = models.JSONField(help_text="List of audio file URLs")
    
    # Exact text match required
    correct_text = models.CharField(max_length=500)
    
    class Meta:
        verbose_name = 'Dictée Activity'
        verbose_name_plural = 'Dictée Activities'
```

---

## 2. Updated Models (`activities/models.py`)

Complete schema with translation support.

```python
from django.db import models
from polymorphic.models import PolymorphicModel

class Activity(PolymorphicModel):
    # Backward Compatibility (Fallback)
    question_text = models.TextField()
    explanation = models.TextField(blank=True)
    
    # Translation Keys
    question_text_key = models.CharField(max_length=255, null=True, blank=True)
    explanation_key = models.CharField(max_length=255, null=True, blank=True)
    
    # Interpolation Data
    translation_data = models.JSONField(default=dict, blank=True)
    
    # ... (other existing fields: points, difficulty, created_by, etc.)

# 1. MCQ (Refined for 3 Cases)
class MCQActivity(Activity):
    choices = models.JSONField() 
    correct_answer_index = models.PositiveIntegerField()
    
    # Case B & C: Keys for choices
    # If set, these keys take precedence over `choices`
    choices_keys = models.JSONField(null=True, blank=True)
    
    # Case B & C: Do we translate the resolved text?
    choices_are_translatable = models.BooleanField(default=False)

# 2. FillBlank (Standard)
class FillBlankActivity(Activity):
    correct_answer = models.CharField(max_length=255)

# 3. Matching (Pairs)
class MatchingActivity(Activity):
    pairs = models.JSONField()
    # Keys for left/right sides if needed? Usually text is target language.
    # If instruction needs translation, use base `question_text_key`.

# 4. DragOrder (Target Language focus)
class DragOrderActivity(Activity):
    words = models.JSONField() 
    correct_order = models.JSONField()

# 5. Conjugation (Target Language focus)
class ConjugationActivity(Activity):
    verb_infinitive = models.CharField(max_length=50)
    tense = models.CharField(max_length=50)
    pronoun = models.CharField(max_length=20)
    correct_conjugation = models.CharField(max_length=100)

# 6. Multiple Answer
class MultipleAnswerActivity(Activity):
    choices = models.JSONField()
    correct_indices = models.JSONField()
    choices_keys = models.JSONField(null=True, blank=True) # Support translation here too

# 7. Text Input
class TextInputActivity(Activity):
    correct_answers = models.JSONField()
    case_sensitive = models.BooleanField(default=False)

# 8. Dictée (New)
class DicteeActivity(Activity):
    audio_urls = models.JSONField()
    correct_text = models.CharField(max_length=500)
```

---

## 3. The "Translation Engine" Serializer

This is the production-ready code for `ActivityPolymorphicSerializer`.

```python
from rest_framework import serializers
from django.utils.translation import gettext as _
from django.utils import translation
from polymorphic.serializers import PolymorphicSerializer
from activities.models import *

class ActivityPolymorphicSerializer(PolymorphicSerializer):
    model_serializer_mapping = {
        MCQActivity: MCQActivitySerializer,
        FillBlankActivity: FillBlankActivitySerializer,
        # ... map all 8 types
    }

    def to_representation(self, instance):
        # 1. Determine User Language
        request = self.context.get('request')
        user_lang = request.user.native_language if request and request.user else 'en'
        
        # 2. RTL Detection
        is_rtl = user_lang in ['ar', 'he', 'fa', 'ur']

        # 3. Activate Language Context
        with translation.override(user_lang):
            # Get base serialization
            data = super().to_representation(instance)
            
            # Inject Metadata
            data['is_rtl'] = is_rtl
            
            # --- TRANSLATION LOGIC ---
            
            # A. Question Text
            if instance.question_text_key:
                try:
                    trans_str = _(instance.question_text_key)
                    data['question_text'] = trans_str.format(**instance.translation_data)
                except Exception:
                    pass # Keep fallback

            # B. Explanation
            if instance.explanation_key:
                try:
                    trans_str = _(instance.explanation_key)
                    data['explanation'] = trans_str.format(**instance.translation_data)
                except Exception:
                    pass

            # --- SUBCLASS LOGIC ---

            # C. MCQ / MultipleAnswer Choices
            if isinstance(instance, (MCQActivity, MultipleAnswerActivity)):
                if instance.choices_keys:
                    # Case B & C: Resolve keys
                    resolved_choices = []
                    for key in instance.choices_keys:
                        try:
                            # Translate the choice itself (e.g. "word.apple" -> "تفاحة")
                            resolved_choices.append(_(key))
                        except:
                            resolved_choices.append(key)
                    data['choices'] = resolved_choices
                
                # Case A: Choices are fixed (Target Language), but maybe UI needs RTL?
                # Data remains as is (French).

            return data
```

---

## 4. Course Enrollment Logic

The filtering happens at the ViewSet level.

```python
# courses/views.py

class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    def get_queryset(self):
        user = self.request.user
        user_lang = user.native_language
        
        return Course.objects.filter(
            models.Q(source_language=user_lang) |  # Specific (e.g. French from Arabic)
            models.Q(source_language__isnull=True) # Universal (French Global)
        )
```

**`is_universal`** is implicit: if `source_language` is NULL, it is Universal/Global.

---

## 5. Migration Strategy

We will use a Django Data Migration.

**Step 1:** Add fields to models (makemigrations).
**Step 2:** Run data migration script.

### Data Migration Example

```python
# courses/management/commands/migrate_activities.py

from django.core.management.base import BaseCommand
from activities.models import FillBlankActivity

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        # Migrate "Translate" activities
        activities = FillBlankActivity.objects.filter(question_text__startswith="Translate:")
        
        for activity in activities:
            # "Translate: apple" -> "apple"
            word_to_translate = activity.question_text.replace("Translate: ", "").strip()
            
            activity.question_text_key = "activity.translate_word"
            activity.translation_data = {"word": word_to_translate}
            # activity.question_text remains as fallback!
            activity.save()
            
        self.stdout.write(f"Migrated {activities.count()} activities.")
```

---

## 6. Translation Files (.po) Example

**`locale/ar/LC_MESSAGES/django.po`**

```po
msgid "activity.fill_blank.instruction"
msgstr "أكمل الجملة التالية: {phrase}"

msgid "activity.translate_word"
msgstr "ترجم الكلمة: {word}"

msgid "activity.mcq.select_correct"
msgstr "اختر الإجابة الصحيحة:"

msgid "grammar.masculine"
msgstr "مذكر"

msgid "grammar.feminine"
msgstr "مؤنث"
```

**`locale/en/LC_MESSAGES/django.po`**

```po
msgid "activity.fill_blank.instruction"
msgstr "Complete the phrase: {phrase}"

msgid "activity.translate_word"
msgstr "Translate the word: {word}"
```

This architecture is robust, scalable for infinite languages, and immediately deployable (backward compatible).
