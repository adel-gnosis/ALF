# AI Prompt for Multi-Level MCQ Activities (Levels 1-30)

Generate **30 French [SUBJECT] MCQ activities** - one for each level (1-30) - with progressive difficulty in this exact JSON format:

```json
{
  "subject": "[SUBJECT]",
  "levels": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  "activities": [
    {
      "level": 1,
      "type": "MCQActivity",
      "question_text": "[Question for Level 1]",
      "choices": ["option 1", "option 2", "option 3", "option 4"],
      "correct_answer_index": [0-3],
      "explanation": "[Explanation]",
      "points": 10,
      "difficulty": "EASY"
    },
    {
      "level": 2,
      "type": "MCQActivity",
      "question_text": "[Question for Level 2]",
      ...
    },
    ...
    {
      "level": 30,
      "type": "MCQActivity",
      "question_text": "[Question for Level 30]",
      ...
    }
  ]
}
```

## Requirements:

### CEFR Level Mapping:
- **Levels 1-8 (A1)**: Very basic concepts, simple vocabulary
- **Levels 9-16 (A2)**: Basic grammar, common phrases
- **Levels 17-24 (B1)**: Intermediate grammar, nuanced concepts
- **Levels 25-30 (B2)**: Advanced grammar, complex structures

### Progression Rules:
1. Start VERY simple (Level 1 = absolute basics)
2. Each level should be slightly harder than previous
3. Build on concepts from earlier levels
4. Maintain logical progression throughout

### Difficulty Mapping:
- Levels 1-10: `"difficulty": "EASY"`
- Levels 11-20: `"difficulty": "MEDIUM"`
- Levels 21-30: `"difficulty": "HARD"`

## Example for Grammaire (Grammar):

**Subject**: Grammaire

**Progression Outline**:
- Level 1-3: Articles (le, la, les, un, une, des)
- Level 4-6: Gender and number agreement
- Level 7-9: Basic adjectives and placement
- Level 10-12: Present tense basics
- Level 13-15: Past tense introduction
- Level 16-18: Future tense
- Level 19-21: Conditional
- Level 22-24: Subjunctive mood
- Level 25-27: Complex sentence structures
- Level 28-30: Literary tenses and advanced grammar

Generate exactly 30 activities, one per level, following this progression.

---

## Usage:

1. Copy this prompt with your chosen subject
2. Paste into ChatGPT/Claude
3. Save output as: `backend/data/activities/[subject]_mcq1.json`
4. Import: `python manage.py import_activities backend/data/activities/[subject]_mcq1.json`

This creates 1 activity per level (levels 1-30) in one import!
