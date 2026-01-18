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

    allowed_types = {"text", "image"}  # add audio later
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
        # At least one of question_text or question_text_key must exist
        if not data.get('question_text') and not data.get('question_text_key'):
            return False, "Either 'question_text' or 'question_text_key' is required"
        
        # If using i18n keys, translation_data should be present (optional but recommended)
        if data.get('question_text_key') and not data.get('translation_data'):
            # Warning only, not an error
            pass
        
        return True, None


class MCQActivitySchema(ActivitySchema):
    """Schema for Multiple Choice Questions"""
    
    def __init__(self):
        super().__init__('MCQActivity')
        self.type_specific_fields = {
            'choices': {
                'type': 'list',
                'required': True,
                'min_length': 2,
                'max_length': 6,
                'help': 'List of answer choices (French text or i18n keys)'
            },
            'correct_answer_index': {
                'type': 'int',
                'required': True,
                'min': 0,
                'help': 'Index of correct answer in choices array'
            },
            'choices_keys': {
                'type': 'list',
                'required': False,
                'help': 'i18n keys for choices (for translated options)'
            },
            'choices_are_translatable': {
                'type': 'bool',
                'required': False,
                'default': False,
                'help': 'True if choices should be translated to learner language'
            },
            'choices_i18n': {
                'type': 'list',
                'required': False,
                'help': 'Teacher-provided multilingual choices: [{"fr":"pomme","en":"apple","ar":"تفاحة"}]'
            },
            'choices_v2': {
                'type': 'list',
                'required': False,
                'help': 'New structured choices with IDs and i18n support'
            },
            'correct_choice_id': {
                'type': 'str',
                'required': False,
                'help': 'ID of the correct choice from choices_v2'
            }

        }
    
    def validate(self, data: Dict) -> tuple[bool, Optional[str]]:
        """Custom validation for MCQ"""
        # Base i18n validation
        valid, error = self.validate_i18n_fields(data)
        if not valid:
            return False, error
        
        # Validate correct_answer_index is within choices range (LEGACY)
        choices = data.get('choices', [])
        correct_idx = data.get('correct_answer_index')
        
        if correct_idx is not None and choices and correct_idx >= len(choices):
            return False, f"correct_answer_index ({correct_idx}) out of range (choices length: {len(choices)})"
        
        # If using translatable choices, choices_keys should match choices length
        if data.get('choices_are_translatable') and data.get('choices_keys'):
            if len(data['choices_keys']) != len(choices):
                return False, "choices_keys length must match choices length"

        # Validate v2 fields if provided
        choices_v2 = data.get("choices_v2")
        if choices_v2:
            ok, err = _validate_choices_v2(choices_v2)
            if not ok:
                return False, err

            correct_choice_id = data.get("correct_choice_id")
            if correct_choice_id:
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
            'choices': {
                'type': 'list',
                'required': True,
                'min_length': 2,
                'help': 'List of answer options'
            },
            'correct_indices': {
                'type': 'list',
                'required': True,
                'min_length': 1,
                'help': 'List of indices for all correct answers'
            },
            'choices_keys': {
                'type': 'list',
                'required': False,
                'help': 'Translation keys for choices'
            },
            'choices_are_translatable': {
                'type': 'bool',
                'required': False,
                'default': False
            },
            'choices_i18n': {
                'type': 'list',
                'required': False,
                'help': 'Teacher-provided multilingual choices: [{"fr":"pomme","en":"apple","ar":"تفاحة"}]'
            },
            'choices_v2': {
                'type': 'list',
                'required': False,
                'help': 'New structured choices with IDs and i18n support'
            },
            'correct_choice_ids': {
                'type': 'list',
                'required': False,
                'help': 'IDs of the correct choices from choices_v2'
            }

        }
    
    def validate(self, data: Dict) -> tuple[bool, Optional[str]]:
        valid, error = self.validate_i18n_fields(data)
        if not valid:
            return False, error
        
        choices = data.get('choices', [])
        correct_indices = data.get('correct_indices', [])
        
        # All correct indices must be valid (LEGACY)
        for idx in correct_indices:
            if choices and idx >= len(choices):
                return False, f"correct_indices contains invalid index: {idx}"
            
        # Validate v2 fields if provided
        choices_v2 = data.get("choices_v2")
        if choices_v2:
            ok, err = _validate_choices_v2(choices_v2)
            if not ok:
                return False, err

            correct_choice_ids = data.get("correct_choice_ids")
            if correct_choice_ids:
                if not isinstance(correct_choice_ids, list):
                    return False, "correct_choice_ids must be a list"

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
        
        # At least one audio source must be provided
        if not data.get('audio_urls') and not data.get('audio_file'):
            return False, "Either 'audio_urls' or 'audio_file' is required"
        
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