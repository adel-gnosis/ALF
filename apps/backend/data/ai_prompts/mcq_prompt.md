# AI Prompt for MCQ Activities

Generate 20 French **[SUBJECT]** MCQ activities for **Level [N]** (CEFR: [CEFR_CODE]) in this exact JSON format:

```json
{
  "subject": "[SUBJECT]",
  "level": [N],
  "activities": [
    {
      "type": "MCQActivity",
      "question_text": "[Question in French]",
      "choices": ["option 1", "option 2", "option 3", "option 4"],
      "correct_answer_index": [0-3],
      "explanation": "[Explanation in French]",
      "points": 10,
      "difficulty": "[EASY/MEDIUM/HARD]"
    }
  ]
}
```

## Requirements:
- All text must be in French
- Each activity has exactly 4 choices
- `correct_answer_index` is 0-based (0=first choice, 3=fourth choice)
- Questions should be appropriate for the level (beginner/intermediate/advanced)
- Explanations should be clear and educational
- Use difficulty: EASY for levels 1-10, MEDIUM for 11-20, HARD for 21+

## Example:

Subject: Grammaire
Level: 5
CEFR: A1

Generate varied grammar questions covering articles, gender, plurals, basic sentence structure.

---

Copy the JSON output directly into a file: `backend/data/activities/grammaire_level_5_mcq.json`
Then run: `python manage.py import_activities backend/data/activities/grammaire_level_5_mcq.json`
