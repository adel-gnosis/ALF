# ALF Phase 2: Complete System Implementation

## 🎯 Overview

Implement a complete adaptive learning system with:
- Dual taxonomy (Level + Subject)
- Set-based learning (30 activities per set)
- Subject-level weakness detection in mixed mode
- Smart recommendations and analytics
- Failed activity re-integration
- 80%/50% threshold progression system

## 📚 Reference Documents

I have provided a complete specification document that includes:
1. **All database models** with detailed field definitions
2. **Progression logic algorithms** (start_level, get_next_activity, record_attempt, complete_session, get_weakness_analysis)
3. **API endpoint specifications** with request/response examples
4. **User experience flows** showing exactly how the system should behave
5. **Complete feature list** with all requirements

**PLEASE READ THE SPECIFICATION DOCUMENT CAREFULLY BEFORE IMPLEMENTING.**

---

## 🗄️ PART 1: Database Models

### File: `courses/models.py`

**Update existing models:**
1. Keep `Level` model as is
2. **DELETE `Module` model** (we're simplifying to Level + Subject only)
3. **Add `Subject` model:**
   - Fields: code, title, description, icon, order
   - Subjects: GRAMMAR, CONJUGATION, VOCABULARY, SPELLING, COMPREHENSION
4. **Refactor `Lesson` model:**
   - Remove `module` FK
   - Add `level` FK (to Level)
   - Add `subject` FK (to Subject)
   - Add `created_by` FK (to User, for teacher system)
   - Add `is_published` boolean
   - Unique constraint: (level, subject, order)

### File: `activities/models.py`

**Keep existing activities** (MCQActivity, FillBlankActivity, MatchingActivity)

**Add to Activity base model:**
- `created_by` FK to User
- `is_approved` boolean

**Add new activity types:**
1. `DragOrderActivity` - Order words correctly
2. `ConjugationActivity` - Verb conjugation
3. `MultipleAnswerActivity` - Select ALL correct answers  
4. `TextInputActivity` - Open text with keyword checking

### File: `progress/models.py` (NEW APP - create it)

Implement these models exactly as specified in the document:
1. **UserProgress** - Overall level progression tracking
2. **SubjectProgress** - Subject-specific progression
3. **ActivityAttempt** - Every activity attempt with answers
4. **FailedActivityQueue** - Smart retry queue
5. **StudySession** - Set-based session tracking (30 activities)
6. **SubjectPerformanceSnapshot** - Performance breakdown by subject
7. **WeaknessAlert** - Persistent weakness detection

### File: `users/models.py`

**Add to User model:**
- `role` field (STUDENT/TEACHER/ADMIN)
- `is_teacher_approved` boolean
- `teacher_bio` text
- `teacher_requested_at` datetime

---

## 🧠 PART 2: Progression Logic

### File: `progress/services.py` (CREATE THIS FILE)

Implement these functions exactly as specified:

1. **`start_level(user, level, subject=None)`**
   - Creates UserProgress or SubjectProgress
   - Creates StudySession with set_number tracking
   - Returns (progress, session)

2. **`get_next_activity(user, level, subject=None, session_id=None)`**
   - **CRITICAL:** 30% probability to retry failed activity
   - Prioritizes activities from FailedActivityQueue
   - Excludes recently completed in same session
   - Smart selection algorithm

3. **`record_attempt(user, activity, user_answer, is_correct, session_id)`**
   - Creates ActivityAttempt record
   - Updates UserProgress and SubjectProgress
   - Adds to FailedActivityQueue if wrong
   - Marks as resolved if correct
   - Updates session statistics

4. **`complete_session(user, level, session_id, subject=None)`**
   - **NEW:** Creates SubjectPerformanceSnapshot for each subject
   - Detects weak subjects (accuracy < 60%)
   - Creates/updates WeaknessAlert for persistent weaknesses
   - Returns comprehensive result with:
     - subject_breakdown
     - weak_subjects
     - recommendations
   - Implements 80%/50%/<50% thresholds

5. **`get_weakness_analysis(user, level)`**
   - Aggregates performance across all sessions
   - Returns subject performance summary
   - Lists active alerts
   - Generates recommendations

---

## 🌐 PART 3: API Endpoints

### File: `progress/views.py` (CREATE THIS FILE)
### File: `progress/urls.py` (CREATE THIS FILE)

Implement these endpoints using DRF:

1. **POST `/api/sessions/start/`**
   - Body: `{level_id, subject_id?, target_activities}`
   - Returns session info with set_number

2. **GET `/api/sessions/{id}/next-activity/`**
   - Returns next activity using smart selection
   - Includes retry info if applicable

3. **POST `/api/sessions/{id}/submit/`**
   - Records attempt
   - Returns correctness and progress

4. **POST `/api/sessions/{id}/complete/`**
   - **CRITICAL:** Returns subject breakdown and recommendations
   - Implements all progression logic

5. **POST `/api/sessions/retry-level/`**
   - Creates new set for same level
   - Increments set_number

6. **GET `/api/progress/weakness-analysis/`**
   - Returns comprehensive weakness analysis
   - Includes subject performance and alerts

7. **GET `/api/sessions/history/`**
   - Lists all session history for a level

8. **POST `/api/progress/dismiss-alert/{id}/`**
   - Dismisses a weakness alert

---

## 📊 PART 4: Serializers

### File: `progress/serializers.py` (CREATE THIS FILE)

Create serializers for:
- StudySession (with subject_breakdown nested)
- ActivityAttempt
- SubjectPerformanceSnapshot
- WeaknessAlert
- SessionResultSerializer (for complete_session response)

---

## 🌱 PART 5: Seed Data

### File: `courses/management/commands/seed_data.py`

**Comprehensive seed data:**

1. **5 Subjects:**
   - Grammaire (Grammar)
   - Conjugaison (Conjugation)
   - Vocabulaire / Lexique (Vocabulary)
   - Orthographe (Spelling)
   - Compréhension (Comprehension)

2. **5 Levels minimum (A1.1 to A2.1):**
   - Each level has lessons covering MULTIPLE subjects
   - Example Level structure:
     ```
     Level A1.1:
       - Lesson: "Les Salutations" (Vocabulaire)
       - Lesson: "Présent Simple" (Conjugaison)
       - Lesson: "Articles Définis" (Grammaire)
       - Lesson: "Sons de base" (Orthographe)
     ```

3. **10-15 activities per lesson**
   - Mix of all activity types
   - Realistic French learning content
   - Proper difficulty progression

4. **Sample users:**
   - 1 admin
   - 1 approved teacher
   - 2 students with some progress

---

## 🔧 PART 6: Migration Strategy

Since we have minimal data:

```bash
# Backup
cp db.sqlite3 db.sqlite3.backup

# Clean migrations
rm courses/migrations/00*.py
rm activities/migrations/00*.py  
rm users/migrations/00*.py
# Keep __init__.py files

# Create progress app
python manage.py startapp progress

# Fresh migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Seed data
python manage.py seed_data
```

---

## ✅ CRITICAL IMPLEMENTATION REQUIREMENTS

### 1. Complete Session Response
The `/api/sessions/{id}/complete/` endpoint **MUST** return:
```json
{
  "passed": true,
  "accuracy": 83.3,
  "subject_breakdown": [
    {
      "subject": "Grammaire",
      "accuracy": 62.5,
      "strength": "WEAK"
    }
  ],
  "weak_subjects": [...],
  "recommendations": [
    {
      "type": "SUBJECT_FOCUS",
      "message": "Consider strengthening Grammar",
      "action": {...}
    }
  ]
}
```

### 2. Set-Based Learning
- Each session = 30 activities (configurable)
- User can click "Try Another Set" for same level
- Failed activities from previous sets are re-integrated
- set_number tracks which attempt this is

### 3. Smart Activity Selection
- 30% probability to show failed activity (if any in queue)
- 70% new/less-practiced activities
- Balanced across subjects in mixed mode

### 4. Weakness Detection
- Create SubjectPerformanceSnapshot after EVERY session
- Track performance by subject even in mixed mode
- Create WeaknessAlert when subject weak in 2+ sessions
- Alert severity: MINOR (60-70%), MODERATE (50-60%), CRITICAL (<50%)

### 5. Thresholds
- **≥80%:** Pass, unlock next level
- **50-79%:** Retry, can do another set
- **<50%:** Downgrade recommended

---

## 📦 DELIVERABLES

1. ✅ All models implemented and migrated
2. ✅ `progress/services.py` with all logic functions
3. ✅ All API endpoints working
4. ✅ Comprehensive serializers
5. ✅ Rich seed data (5 subjects, 5 levels, 100+ activities)
6. ✅ Updated requirements.txt
7. ✅ API documentation in README
8. ✅ Django admin configured for all models

---

## 🧪 TESTING CHECKLIST

After implementation, verify:

1. [ ] User can start mixed session (30 activities from all subjects)
2. [ ] After completing session, sees subject breakdown
3. [ ] If weak in subject, sees recommendation
4. [ ] Failed activities appear in next set (30% probability)
5. [ ] User can do multiple sets for same level
6. [ ] set_number increments correctly
7. [ ] WeaknessAlert created after 2+ weak sessions
8. [ ] 80% passes level, <50% suggests downgrade
9. [ ] Subject-focused mode works independently
10. [ ] Weakness analysis endpoint returns correct data

---

## 🚀 BEGIN IMPLEMENTATION

Please implement this complete system following the specification exactly.

Priority order:
1. Models and migrations
2. Progression logic (services.py)
3. API endpoints and serializers
4. Seed data
5. Testing

Ask questions if anything is unclear!
