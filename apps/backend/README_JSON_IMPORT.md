# JSON Activity Import System - Complete Guide

## Quick Start

### 1️⃣ Initial Setup (One Time)
```bash
cd backend

# Create 30 levels, subjects, and test users
python3 manage.py seed_minimal --levels 30

# Or clear existing data first
python3 manage.py seed_minimal --clear --levels 30
```

### 2️⃣ Generate Activities with AI
Upload `data/ai_prompts/INTERACTIVE_ACTIVITY_GENERATOR.md` to ChatGPT/Claude and follow the prompts!

### 3️⃣ Import Activities
```bash
# Import single file
python3 manage.py import_activities data/activities/grammaire_mcq1.json

# Import multiple files
python3 manage.py import_activities data/activities/*.json

# Skip duplicates (don't re-import same activities)
python3 manage.py import_activities --skip-duplicates data/activities/*.json

# Update existing (overwrite with new content)
python3 manage.py import_activities --update-duplicates data/activities/grammaire_mcq1.json
```

---

## 📊 Supported Formats

### Format 1: Multi-Level (RECOMMENDED)
**One file = Activities for levels 1-30**

```json
{
  "subject": "Grammaire",
  "levels": [1, 2, 3, 4, 5, ..., 30],
  "activities": [
    {
      "level": 1,
      "type": "MCQActivity",
      "question_text": "Question for level 1",
      ...
    },
    {
      "level": 2,
      "type": "MCQActivity",
      "question_text": "Question for level 2",
      ...
    }
  ]
}
```

**Benefits:**
- ✅ Consistent progression across all levels
- ✅ AI understands full context (1-30)
- ✅ Easy to review entire curriculum
- ✅ CEFR mapping handled by AI

**Use case:** Generate 1-5 activities per level, import to populate all levels at once

---

### Format 2: Single-Level
**One file = Multiple activities for ONE level**

```json
{
  "subject": "Grammaire",
  "level": 5,
  "activities": [
    {
      "type": "MCQActivity",
      "question_text": "Question 1",
      ...
    },
    {
      "type": "FillBlankActivity",
      "question_text": "Question 2",
      ...
    }
  ]
}
```

**Use case:** Generate 10-30 activities for a specific level

---

## 🎯 All Activity Types

| Type | Required Fields |
|------|----------------|
| **MCQActivity** | `question_text`, `choices` (4 options), `correct_answer_index` (0-3), `explanation` |
| **FillBlankActivity** | `question_text`, `correct_answer`, `explanation` |
| **MatchingActivity** | `question_text`, `pairs` (dict), `explanation` |
| **DragOrderActivity** | `question_text`, `words` (list), `correct_order` (indices), `explanation` |
| **ConjugationActivity** | `question_text`, `verb_infinitive`, `tense`, `pronoun`, `correct_conjugation`, `explanation` |
| **MultipleAnswerActivity** | `question_text`, `choices`, `correct_indices` (list), `explanation` |
| **TextInputActivity** | `question_text`, `correct_answers` (list), `case_sensitive` (bool), `explanation` |

**Common fields:** `points` (default 10), `difficulty` (EASY/MEDIUM/HARD)

See `data/ai_prompts/INTERACTIVE_ACTIVITY_GENERATOR.md` for detailed examples!

---

## 📚 Subjects

1. **Grammaire** (Grammar)
2. **Conjugaison** (Conjugation)
3. **Vocabulaire / Lexique** (Vocabulary)
4. **Orthographe** (Spelling)
5. **Compréhension** (Comprehension)

---

## 🎓 Level System

**30 Numeric Levels** mapped to CEFR:

- **Levels 1-8**: A1 (Beginner)
- **Levels 9-16**: A2 (Elementary)
- **Levels 17-24**: B1 (Intermediate)
- **Levels 25-30**: B2 (Upper-Intermediate)
- **Levels 31-40**: C1/C2 (if configured)

---

## 💡 Recommended Workflow

### Building a Complete Curriculum

```bash
# Step 1: Generate MCQs for all levels
# Use AI to create grammaire_mcq_batch1.json (30 activities, 1 per level)
python3 manage.py import_activities data/activities/grammaire_mcq_batch1.json
# ✅ Each level now has 1 Grammar MCQ

# Step 2: Add more MCQs
# Generate grammaire_mcq_batch2.json (30 more activities)
python3 manage.py import_activities data/activities/grammaire_mcq_batch2.json
# ✅ Each level now has 2 Grammar MCQs

# Step 3: Add Fill Blank activities
python3 manage.py import_activities data/activities/grammaire_fill_batch1.json
# ✅ Each level now has 2 MCQs + 1 Fill Blank

# Step 4: Add Conjugation
python3 manage.py import_activities data/activities/conjugaison_conj_batch1.json
# ✅ Now have Grammar + Conjugation activities

# Continue building...
```

### Suggested File Structure

```
backend/data/activities/
├── grammaire/
│   ├── grammaire_mcq_batch1.json      (30 MCQs, levels 1-30)
│   ├── grammaire_mcq_batch2.json      (30 more MCQs)
│   ├── grammaire_fill_batch1.json     (30 Fill Blanks)
│   └── grammaire_matching_batch1.json (30 Matching)
├── conjugaison/
│   ├── conjugaison_conj_batch1.json   (30 Conjugations)
│   ├── conjugaison_mcq_batch1.json    (30 MCQs about verbs)
│   └── conjugaison_fill_batch1.json   (30 Fill Blanks)
├── vocabulaire/
│   ├── vocabulaire_matching_batch1.json
│   ├── vocabulaire_mcq_batch1.json
│   └── vocabulaire_text_batch1.json
└── ...
```

---

## 🤖 Using AI to Generate Content

### Option 1: Interactive Generator (RECOMMENDED)
1. Upload `data/ai_prompts/INTERACTIVE_ACTIVITY_GENERATOR.md` to ChatGPT/Claude
2. Answer 5 questions interactively
3. Receive perfectly formatted JSON
4. Save and import!

### Option 2: Direct Prompts
Use templates in `data/ai_prompts/`:
- `multi_level_mcq_prompt.md` - MCQ for all levels
- `mcq_prompt.md` - MCQ for one level
- `conjugation_prompt.md` - Conjugation exercises

---

## ✅ Verification

After importing, verify in Django admin:
1. Navigate to `http://localhost:8000/admin/`
2. Check **Courses → Lessons** (should see lessons per level)
3. Check **Activities** section (should see imported activities)

---

## 🔧 Troubleshooting

### "Subject not found"
Make sure subjects exist: `python3 manage.py seed_minimal`

### "Level not found"
Check level order matches JSON level number (1-30)

### "UNIQUE constraint failed"
Duplicate lesson creation. Use `--skip-duplicates` or `--update-duplicates`

### Foreign key constraint
Clear database properly: `python3 manage.py seed_minimal --clear --levels 30`

---

## 📊 Example: Generate 1000 Activities

**Goal:** 1000 activities across all subjects and levels

**Strategy:**
- 30 levels × 5 subjects = 150 "slots"
- 1000 ÷ 150 ≈ 7 activities per (level, subject) pair

**Execution:**
```bash
# Generate 7 batches for each subject
# Batch 1-7 for Grammaire (7 × 30 = 210 activities)
python3 manage.py import_activities \
  data/activities/grammaire_mcq_batch{1..3}.json \
  data/activities/grammaire_fill_batch{1..2}.json \
  data/activities/grammaire_matching_batch{1..2}.json

# Repeat for other 4 subjects...
```

Result: Scalable, high-quality content generation! 🚀
