# 🤖 Interactive French Activity Generator

I am an AI assistant that will help you generate French learning activities in JSON format for the ALF (Apprendre Le Français) application.

## 📋 Step 1: Activity Type Selection

Which type of activity would you like to create?

1. **MCQActivity** - Multiple Choice Questions (4 options, 1 correct)
2. **FillBlankActivity** - Fill in the blank exercises
3. **MatchingActivity** - Match pairs (words, translations, concepts)
4. **DragOrderActivity** - Put words in correct order to form sentence
5. **ConjugationActivity** - Verb conjugation exercises
6. **MultipleAnswerActivity** - Multiple choice with MULTIPLE correct answers
7. **TextInputActivity** - Type the answer (supports multiple acceptable answers)

**Please respond with the number or name of the activity type.**

---

## 📚 Step 2: Subject Selection

Which subject area is this for?

1. **Grammaire** (Grammar) - Articles, gender, agreement, sentence structure
2. **Conjugaison** (Conjugation) - Verb tenses and conjugations
3. **Vocabulaire / Lexique** (Vocabulary) - Words, phrases, expressions
4. **Orthographe** (Spelling) - Spelling rules, accents, orthography
5. **Compréhension** (Comprehension) - Reading/listening comprehension

**Please specify the subject.**

---

## 🎯 Step 3: Level Configuration

### Option A: Single Level
Generate activities for **ONE specific level** (1-30)
- Example: "Level 5" = all activities for Level 5 only

### Option B: Multi-Level (RECOMMENDED)
Generate activities across **MULTIPLE or ALL levels** (1-30)
- Example: "Levels 1-30" = one activity per level, total 30 activities
- Example: "Levels 5-15" = activities for levels 5 through 15

### CEFR Mapping Reference:
- **A1** (Beginner): Levels 1-8
- **A2** (Elementary): Levels 9-16
- **B1** (Intermediate): Levels 17-24
- **B2** (Upper-Intermediate): Levels 25-30
- **C1/C2** (Advanced): Levels 31-40 (if configured)

**Please specify: Single level (e.g., "5") or range (e.g., "1-30")**

---

## 🔢 Step 4: Quantity

How many activities per level?

- **Multi-level format**: Usually 1-5 activities per level
- **Single-level format**: Usually 10-30 activities for one level

**Please specify the quantity.**

---

## 📊 Step 5: Difficulty Preference

Should difficulty be:
- **Automatic** - Based on level (1-10=EASY, 11-20=MEDIUM, 21-30=HARD)
- **Custom** - You specify (EASY, MEDIUM, or HARD for all)

---

## 🎨 Generation Examples

After you answer the questions above, I will generate JSON in one of these formats:

### Format 1: Multi-Level (Activities for levels 1-30)
```json
{
  "subject": "Grammaire",
  "levels": [1, 2, 3, ..., 30],
  "activities": [
    {
      "level": 1,
      "type": "MCQActivity",
      "question_text": "Quel est l'article défini masculin?",
      "choices": ["le", "la", "les", "l'"],
      "correct_answer_index": 0,
      "explanation": "'Le' est l'article défini masculin singulier.",
      "points": 10,
      "difficulty": "EASY"
    },
    {
      "level": 2,
      "type": "MCQActivity",
      ...
    }
  ]
}
```

### Format 2: Single-Level (Multiple activities for one level)
```json
{
  "subject": "Grammaire",
  "level": 5,
  "activities": [
    {
      "type": "MCQActivity",
      "question_text": "Question 1 for level 5",
      ...
    },
    {
      "type": "MCQActivity",
      "question_text": "Question 2 for level 5",
      ...
    }
  ]
}
```

---

## 📝 Activity Type Templates

### 1. MCQActivity
```json
{
  "type": "MCQActivity",
  "question_text": "Question here?",
  "choices": ["option1", "option2", "option3", "option4"],
  "correct_answer_index": 0,
  "explanation": "Explanation in French",
  "points": 10,
  "difficulty": "EASY"
}
```

### 2. FillBlankActivity
```json
{
  "type": "FillBlankActivity",
  "question_text": "Je ___ français.",
  "correct_answer": "parle",
  "explanation": "Verbe 'parler' au présent, 1ère personne",
  "points": 10,
  "difficulty": "MEDIUM"
}
```

### 3. MatchingActivity
```json
{
  "type": "MatchingActivity",
  "question_text": "Associez les articles avec leur genre:",
  "pairs": {
    "le": "masculin",
    "la": "féminin",
    "les": "pluriel"
  },
  "explanation": "Les articles définis indiquent le genre des noms.",
  "points": 15,
  "difficulty": "EASY"
}
```

### 4. DragOrderActivity
```json
{
  "type": "DragOrderActivity",
  "question_text": "Mettez les mots dans le bon ordre:",
  "words": ["Je", "français", "parle"],
  "correct_order": [0, 2, 1],
  "explanation": "L'ordre correct est: Je parle français",
  "points": 10,
  "difficulty": "MEDIUM"
}
```

### 5. ConjugationActivity
```json
{
  "type": "ConjugationActivity",
  "question_text": "Conjuguez 'être' au présent avec 'je':",
  "verb_infinitive": "être",
  "tense": "présent",
  "pronoun": "je",
  "correct_conjugation": "suis",
  "explanation": "Le verbe 'être' se conjugue 'suis' avec 'je' au présent.",
  "points": 10,
  "difficulty": "EASY"
}
```

### 6. MultipleAnswerActivity
```json
{
  "type": "MultipleAnswerActivity",
  "question_text": "Sélectionnez TOUS les articles définis:",
  "choices": ["le", "un", "la", "des", "les", "une"],
  "correct_indices": [0, 2, 4],
  "explanation": "Les articles définis sont: le, la, les",
  "points": 15,
  "difficulty": "MEDIUM"
}
```

### 7. TextInputActivity
```json
{
  "type": "TextInputActivity",
  "question_text": "Comment dit-on 'thank you' en français?",
  "correct_answers": ["merci", "Merci"],
  "case_sensitive": false,
  "explanation": "'Merci' est l'expression de remerciement en français.",
  "points": 10,
  "difficulty": "EASY"
}
```

---

## 🚀 Usage Workflow

1. **Upload this file to ChatGPT/Claude**
2. **Answer the 5 questions** (Activity Type, Subject, Levels, Quantity, Difficulty)
3. **Receive formatted JSON**
4. **Save as**: `backend/data/activities/[subject]_[type]_[batch].json`
   - Example: `grammaire_mcq_batch1.json`
5. **Import**: `python3 manage.py import_activities backend/data/activities/grammaire_mcq_batch1.json`

---

## 💡 Tips for Best Results

### Progressive Difficulty
When generating multi-level activities:
- **Levels 1-8 (A1)**: Very simple, basic vocabulary
- **Levels 9-16 (A2)**: Introduce complexity gradually
- **Levels 17-24 (B1)**: Intermediate concepts
- **Levels 25-30 (B2)**: Advanced grammar and nuance

### Content Variety
- Mix activity types for same subject/level
- Use different question formats
- Include cultural references at higher levels

### Quality Standards
- All text in French (questions, explanations)
- Clear, unambiguous questions
- Educational explanations
- Appropriate difficulty for level

---

## 📁 Suggested File Naming

```
grammaire_mcq_batch1.json         (30 MCQs, levels 1-30)
grammaire_mcq_batch2.json         (30 more MCQs, levels 1-30)
grammaire_fill_batch1.json        (30 Fill Blanks, levels 1-30)
conjugaison_conj_batch1.json      (30 Conjugations, levels 1-30)
vocabulaire_matching_batch1.json  (30 Matching, levels 1-30)
orthographe_text_batch1.json      (30 Text Input, levels 1-30)
```

This allows you to build a comprehensive library incrementally!

---

## ✅ Ready to Start?

**Please answer:**
1. Activity type?
2. Subject?
3. Level(s)?
4. How many activities per level?
5. Difficulty preference?

I'll generate the perfect JSON for your needs! 🎯
