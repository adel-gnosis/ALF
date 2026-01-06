# Activity JSON Templates - Usage Guide

This directory contains JSON templates for all 8 activity types in the ALF platform. Use these templates with AI (ChatGPT, Claude, etc.) to generate more activities.

## Template Files

1. **mcq_template.json** - Multiple Choice Questions
2. **fill_blank_template.json** - Fill in the Blank
3. **dictee_template.json** - Audio Dictation
4. **matching_template.json** - Matching Pairs
5. **drag_order_template.json** - Drag and Drop Word Order
6. **conjugation_template.json** - Verb Conjugation
7. **multiple_answer_template.json** - Multiple Correct Answers
8. **text_input_template.json** - Text Input Translation

## How to Use with AI

### Example Prompt for ChatGPT/Claude:

```
Using the template in mcq_template.json, generate 20 new MCQ activities for BEGINNER level French vocabulary. Focus on common household items. Return the result as a JSON array.
```

### Example Output Format:

```json
[
  {
    "question_text": "What is the translation of 'table'?",
    "question_text_key": "activity.mcq.translate_word",
    "translation_data": {"word": "table"},
    "choices": ["table", "chaise", "lit", "porte"],
    "correct_answer": 0,
    "difficulty": "BEGINNER",
    "subject": "Vocabulaire"
  },
  ...
]
```

## Importing Generated Activities

Once you have AI-generated JSON, you can import it using the Django management command:

```bash
python manage.py import_activities --file generated_activities.json --level 5
```

## Field Descriptions

### Common Fields (All Activities)
- `question_text`: The fallback text (English by default)
- `question_text_key`: Translation key for i18n
- `translation_data`: Variables to interpolate into translated text
- `difficulty`: BEGINNER, INTERMEDIATE, or ADVANCED
- `subject`: Vocabulaire, Grammaire, Conjugaison, or Prononciation

### Activity-Specific Fields
See individual template files for detailed field descriptions and examples.

## Tips for AI Generation

1. **Variety**: Generate activities with diverse vocabulary/grammar topics
2. **Difficulty**: Match difficulty to the target level
3. **Distractors**: For MCQ, ensure wrong answers are plausible but clearly incorrect
4. **Natural Language**: Use natural, conversational French
5. **Consistency**: Keep formatting consistent with templates
