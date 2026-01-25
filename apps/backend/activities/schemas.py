"""
Activity Type Schema Registry
Defines validation rules for each polymorphic activity type
Easy to extend when adding new activity types
"""

from typing import Dict, List, Any, Optional


def _validate_choices_v2(choices_v2):
    if not isinstance(choices_v2, list):
        return False, "choices_v2 must be a list"
    if len(choices_v2) < 2:
        return False, "choices_v2 must contain at least 2 choices"

    allowed_types = {"text", "image", "audio"}  # ✅ now supports audio too
    seen_ids = set()

    for i, ch in enumerate(choices_v2):
        if not isinstance(ch, dict):
            return False, f"choices_v2[{i}] must be an object"
        cid = ch.get("id")
        if not isinstance(cid, str) or not cid.strip():
            return False, f"choices_v2[{i}].id is required"
        if cid in seen_ids:
            return False, f"Duplicate choice id: {cid}"
        seen_ids.add(cid)

        content = ch.get("content")
        if not isinstance(content, dict):
            return False, f"choices_v2[{i}].content must be an object"

        t = content.get("type")
        v = content.get("value")
        if t not in allowed_types:
            return False, f"choices_v2[{i}].content.type must be one of {sorted(allowed_types)}"
        if not isinstance(v, str) or not v.strip():
            return False, f"choices_v2[{i}].content.value is required"

        i18n = content.get("i18n")
        if i18n is not None:
            if not isinstance(i18n, dict):
                return False, f"choices_v2[{i}].content.i18n must be a dict"
            for lang, txt in i18n.items():
                if txt is None:
                    continue
                if not isinstance(txt, str):
                    return False, f"choices_v2[{i}].content.i18n['{lang}'] must be a string"

    return True, None

class ActivitySchema:
    """Base schema for activity validation"""
    
    def __init__(self, activity_type: str):
        self.activity_type = activity_type
        self.base_fields = {
            'lesson_id': {'type': 'int', 'required': True},
            'question_text': {'type': 'str', 'required': False},  # Fallback
            'question_text_key': {'type': 'str', 'required': False},  # i18n
            'instruction_key': {'type': 'str', 'required': False},    # i18n instruction
            'translation_data': {'type': 'dict', 'required': False},  # i18n params
            'explanation': {'type': 'str', 'required': False},
            'explanation_key': {'type': 'str', 'required': False},
            'points': {'type': 'int', 'required': False, 'default': 10},
            'difficulty': {'type': 'str', 'required': False, 'default': 'MEDIUM',
                          'choices': ['EASY', 'MEDIUM', 'HARD']},
            'order': {'type': 'int', 'required': False, 'default': 0},
        }
        self.type_specific_fields = {}
    
    def get_required_fields(self) -> List[str]:
        """Get all required field names"""
        required = []
        all_fields = {**self.base_fields, **self.type_specific_fields}
        for field_name, config in all_fields.items():
            if config.get('required', False):
                required.append(field_name)
        return required
    
    def get_all_fields(self) -> Dict[str, Any]:
        """Get complete field schema"""
        return {**self.base_fields, **self.type_specific_fields}
    
    def validate_i18n_fields(self, data: Dict) -> tuple[bool, Optional[str]]:
        """
        Validate that either raw text OR i18n key is provided
        Returns: (is_valid, error_message)
        """
        # At least one of question_text, question_text_key or instruction_key must exist
        text_provided = any([
            data.get('question_text'),
            data.get('question_text_key'),
            data.get('instruction_key')
        ])
        
        if not text_provided:
            return False, "Either 'question_text', 'question_text_key', or 'instruction_key' is required"
        
        return True, None


class MCQActivitySchema(ActivitySchema):
    """Schema for Multiple Choice Questions"""
    
    def __init__(self):
        super().__init__('MCQActivity')
        self.type_specific_fields = {
            'choices_v2': {
                'type': 'list',
                'required': True,
                'min_length': 2,
                'max_length': 8,
                'help': 'V2 choices: [{"id":"c_001","content":{"type":"text|image|audio","value":"..."}}]'
            },
            'correct_choice_id': {
                'type': 'str',
                'required': True,
                'help': 'V2: ID of the correct choice from choices_v2'
            },
        }


        
    
    def validate(self, data: Dict) -> tuple[bool, Optional[str]]:
        """Custom validation for MCQ"""
        # Base i18n validation
        valid, error = self.validate_i18n_fields(data)
        if not valid:
            return False, error
        
        # ❌ Reject legacy payload keys (MCQ is V2-only now)
        legacy_keys = {"choices", "correct_answer_index", "choices_keys", "choices_are_translatable", "choices_i18n"}
        if any(k in data and data.get(k) is not None for k in legacy_keys):
            return False, "Legacy MCQ fields are no longer supported. Use choices_v2 + correct_choice_id فقط."

        choices_v2 = data.get("choices_v2") or []
        ok, err = _validate_choices_v2(choices_v2)
        if not ok:
            return False, err

        correct_choice_id = data.get("correct_choice_id")
        if not isinstance(correct_choice_id, str) or not correct_choice_id.strip():
            return False, "correct_choice_id is required when using choices_v2"

        valid_ids = {c["id"] for c in choices_v2 if isinstance(c, dict) and isinstance(c.get("id"), str)}
        if correct_choice_id not in valid_ids:
            return False, "correct_choice_id must match an id from choices_v2"

        return True, None


class FillBlankActivitySchema(ActivitySchema):
    """Schema for Fill in the Blank"""
    
    def __init__(self):
        super().__init__('FillBlankActivity')
        self.type_specific_fields = {
            'correct_answer': {
                'type': 'str',
                'required': True,
                'help': 'The correct answer (in target language)'
            }
        }
    
    def validate(self, data: Dict) -> tuple[bool, Optional[str]]:
        valid, error = self.validate_i18n_fields(data)
        if not valid:
            return False, error
        
        # Question should contain a blank indicator (optional check)
        question = data.get('question_text', '')
        if question and '___' not in question and '_' not in question:
            # Warning only, not blocking
            pass
        
        return True, None


class MatchingActivitySchema(ActivitySchema):
    """Schema for Matching (V2 pairs_v2)"""

    def __init__(self):
        super().__init__('MatchingActivity')
        self.type_specific_fields = {
            'pairs_v2': {
                'type': 'list',
                'required': True,
                'min_length': 2,
                'help': (
                    "List of pair objects. Each pair: "
                    "{id, left:{type,value,i18n?}, right:{type,value,i18n?}}"
                )
            }
        }

    def validate(self, data: Dict) -> tuple[bool, Optional[str]]:
        valid, error = self.validate_i18n_fields(data)
        if not valid:
            return False, error

        pairs_v2 = data.get('pairs_v2')
        if not isinstance(pairs_v2, list):
            return False, "pairs_v2 must be a list"

        if len(pairs_v2) < 2:
            return False, "pairs_v2 must contain at least 2 pairs"

        seen_ids = set()
        allowed_types = {"text", "image"}  # add "audio" later

        def _is_nonempty_str(x):
            return isinstance(x, str) and x.strip() != ""

        for i, pair in enumerate(pairs_v2):
            if not isinstance(pair, dict):
                return False, f"pairs_v2[{i}] must be an object"

            pid = pair.get("id")
            if not _is_nonempty_str(pid):
                return False, f"pairs_v2[{i}].id is required"
            if pid in seen_ids:
                return False, f"Duplicate pair id: {pid}"
            seen_ids.add(pid)

            for side in ("left", "right"):
                item = pair.get(side)
                if not isinstance(item, dict):
                    return False, f"pairs_v2[{i}].{side} must be an object"

                t = item.get("type")
                v = item.get("value")
                if t not in allowed_types:
                    return False, f"pairs_v2[{i}].{side}.type must be one of {sorted(allowed_types)}"
                if not _is_nonempty_str(v):
                    return False, f"pairs_v2[{i}].{side}.value is required"

                i18n = item.get("i18n")
                if i18n is not None:
                    if not isinstance(i18n, dict):
                        return False, f"pairs_v2[{i}].{side}.i18n must be a dict"
                    # optional: ensure i18n values are strings if provided
                    for lang, text in i18n.items():
                        if text is None:
                            continue
                        if not isinstance(text, str):
                            return False, f"pairs_v2[{i}].{side}.i18n['{lang}'] must be a string"

        return True, None



class DragOrderActivitySchema(ActivitySchema):
    """Schema for Drag & Order"""
    
    def __init__(self):
        super().__init__('DragOrderActivity')
        self.type_specific_fields = {
            'words': {
                'type': 'list',
                'required': True,
                'min_length': 2,
                'help': 'List of words/phrases to arrange (in target language)'
            },
            'correct_order': {
                'type': 'list',
                'required': True,
                'help': 'Correct order (list of indices or words)'
            }
        }
    
    def validate(self, data: Dict) -> tuple[bool, Optional[str]]:
        valid, error = self.validate_i18n_fields(data)
        if not valid:
            return False, error
        
        words = data.get('words', [])
        correct_order = data.get('correct_order', [])
        
        if len(correct_order) != len(words):
            return False, "correct_order length must match words length"
        
        return True, None


class ConjugationActivitySchema(ActivitySchema):
    """Schema for Verb Conjugation"""
    
    def __init__(self):
        super().__init__('ConjugationActivity')
        self.type_specific_fields = {
            'verb_infinitive': {
                'type': 'str',
                'required': True,
                'help': 'Verb in infinitive form (e.g., "être")'
            },
            'tense': {
                'type': 'str',
                'required': True,
                'help': 'Tense (e.g., "présent", "imparfait")'
            },
            'pronoun': {
                'type': 'str',
                'required': True,
                'help': 'Pronoun (e.g., "je", "tu", "il")'
            },
            'correct_conjugation': {
                'type': 'str',
                'required': True,
                'help': 'Correct conjugated form'
            }
        }
    
    def validate(self, data: Dict) -> tuple[bool, Optional[str]]:
        valid, error = self.validate_i18n_fields(data)
        return valid, error


class MultipleAnswerActivitySchema(ActivitySchema):
    """Schema for Multiple Answer (Select All Correct)"""
    
    def __init__(self):
        super().__init__('MultipleAnswerActivity')
        self.type_specific_fields = {
            'choices_v2': {
                'type': 'list',
                'required': True,
                'min_length': 2,
                'max_length': 10,
                'help': 'V2 choices: [{"id":"c_001","content":{"type":"text|image|audio","value":"..."}}]'
            },
            'correct_choice_ids': {
                'type': 'list',
                'required': True,
                'min_length': 1,
                'help': 'V2: list of correct IDs from choices_v2'
            },
        }

    
    def validate(self, data: Dict) -> tuple[bool, Optional[str]]:
        valid, error = self.validate_i18n_fields(data)
        if not valid:
            return False, error
        
        # Validate v2 fields if provided
        # ❌ Reject legacy payload keys (MultipleAnswer is V2-only now)
        legacy_keys = {"choices", "correct_indices", "choices_keys", "choices_are_translatable", "choices_i18n"}
        if any(k in data and data.get(k) is not None for k in legacy_keys):
            return False, "Legacy MultipleAnswer fields are no longer supported. Use choices_v2 + correct_choice_ids فقط."

        choices_v2 = data.get("choices_v2") or []
        ok, err = _validate_choices_v2(choices_v2)
        if not ok:
            return False, err

        correct_choice_ids = data.get("correct_choice_ids")
        if not isinstance(correct_choice_ids, list) or len(correct_choice_ids) < 1:
            return False, "correct_choice_ids is required (non-empty list) when using choices_v2"

        valid_ids = {c["id"] for c in choices_v2 if isinstance(c, dict) and isinstance(c.get("id"), str)}

        for cid in correct_choice_ids:
            if not isinstance(cid, str) or cid not in valid_ids:
                return False, "Every correct_choice_id must match an id from choices_v2"

        if len(set(correct_choice_ids)) != len(correct_choice_ids):
            return False, "correct_choice_ids contains duplicates"

        
        return True, None


class TextInputActivitySchema(ActivitySchema):
    """Schema for Text Input"""
    
    def __init__(self):
        super().__init__('TextInputActivity')
        self.type_specific_fields = {
            'correct_answers': {
                'type': 'list',
                'required': True,
                'min_length': 1,
                'help': 'List of acceptable answers (in target language)'
            },
            'case_sensitive': {
                'type': 'bool',
                'required': False,
                'default': False
            },
            'accept_partial': {
                'type': 'bool',
                'required': False,
                'default': False,
                'help': 'Accept partial matches'
            }
        }
    
    def validate(self, data: Dict) -> tuple[bool, Optional[str]]:
        valid, error = self.validate_i18n_fields(data)
        return valid, error


class DicteeActivitySchema(ActivitySchema):
    """Schema for Dictation (Listening)"""
    
    def __init__(self):
        super().__init__('DicteeActivity')
        self.type_specific_fields = {
            'audio_urls': {
                'type': 'list',
                'required': False,  # Can use audio_file instead
                'help': 'List of audio file URLs'
            },
            'audio_file': {
                'type': 'file',
                'required': False,
                'help': 'Upload audio file (alternative to audio_urls)'
            },
            'correct_text': {
                'type': 'str',
                'required': True,
                'help': 'Exact text that should be typed (in target language)'
            },
            'case_sensitive': {
                'type': 'bool',
                'required': False,
                'default': False
            }
        }
    
    def validate(self, data: Dict) -> tuple[bool, Optional[str]]:
        valid, error = self.validate_i18n_fields(data)
        if not valid:
            return False, error
        
        # Audio sources are now optional during creation to support TTS generation flow
        
        return True, None


# ============================================================================
# SCHEMA REGISTRY
# ============================================================================

class ActivitySchemaRegistry:
    """Central registry for all activity type schemas"""
    
    _schemas = {
        'MCQActivity': MCQActivitySchema(),
        'FillBlankActivity': FillBlankActivitySchema(),
        'MatchingActivity': MatchingActivitySchema(),
        'DragOrderActivity': DragOrderActivitySchema(),
        'ConjugationActivity': ConjugationActivitySchema(),
        'MultipleAnswerActivity': MultipleAnswerActivitySchema(),
        'TextInputActivity': TextInputActivitySchema(),
        'DicteeActivity': DicteeActivitySchema(),
    }
    
    @classmethod
    def get_schema(cls, activity_type: str) -> Optional[ActivitySchema]:
        """Get schema for activity type"""
        return cls._schemas.get(activity_type)
    
    @classmethod
    def get_all_types(cls) -> List[str]:
        """Get list of all supported activity types"""
        return list(cls._schemas.keys())
    
    @classmethod
    def validate_activity_data(cls, activity_type: str, data: Dict) -> tuple[bool, Optional[str]]:
        """
        Validate activity data against its schema
        Returns: (is_valid, error_message)
        """
        schema = cls.get_schema(activity_type)
        if not schema:
            return False, f"Unknown activity type: {activity_type}"
        
        # Check required fields
        required_fields = schema.get_required_fields()
        for field in required_fields:
            if field not in data or data[field] is None:
                return False, f"Missing required field: {field}"
        
        # Run type-specific validation
        return schema.validate(data)
    
    @classmethod
    def register_new_type(cls, schema: ActivitySchema):
        """
        Register a new activity type schema
        Use this when adding new activity types
        """
        cls._schemas[schema.activity_type] = schema