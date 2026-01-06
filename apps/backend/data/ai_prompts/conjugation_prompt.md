# AI Prompt for Conjugation Activities

Generate 20 French verb conjugation exercises for **Level [N]** (CEFR: [CEFR_CODE]) in this exact JSON format:

```json
{
  "subject": "Conjugaison",
  "level": [N],
  "activities": [
    {
      "type": "ConjugationActivity",
      "question_text": "Conjuguez '[VERB]' à [TENSE] avec '[PRONOUN]':",
      "verb_infinitive": "[VERB]",
      "tense": "[TENSE]",
      "pronoun": "[PRONOUN]",
      "correct_conjugation": "[CONJUGATED_FORM]",
      "explanation": "[Explanation in French]",
      "points": 10,
      "difficulty": "[EASY/MEDIUM/HARD]"
    }
  ]
}
```

## Requirements:
- All text in French
- Common tenses: `présent`, `passé composé`, `imparfait`, `futur simple`
- Pronouns: `je`, `tu`, `il`, `elle`, `nous`, `vous`, `ils`, `elles`
- Start with high-frequency verbs (être, avoir, aller, faire, etc.)
- Progress to regular -ER, -IR, -RE verbs
- Include irregular verbs for higher levels

## Difficulty Guide:
- **EASY (Levels 1-10)**: être, avoir, -ER verbs in présent
- **MEDIUM (Levels 11-20)**: -IR/-RE verbs, passé composé
- **HARD (Levels 21+)**: Irregular verbs, imparfait, subjonctif

## Example:

Level: 3
CEFR: A1

Focus on: être, avoir, and common -ER verbs (parler, aimer, habiter) in présent tense.

---

Save output to: `backend/data/activities/conjugaison_level_3_conj.json`
