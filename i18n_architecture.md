# ALF Internationalization (i18n) & Localization Strategy

You are 100% correct. Handling "Data Translation" is fundamentally different from "UI Translation" and must be architected at the database level.

## 1. The Industry Standard: "Directional Courses"

Apps like Duolingo do not just "translate" a course. They treat **"French for English speakers"** and **"French for Arabic speakers"** as two completely separate products.

### Why?
*   **Different Pedagogy:** An English speaker struggles with *Gender* (Le/La). An Arabic speaker struggles with *Vowels* or *Latin Script*. The lessons need to focus on different things.
*   **Explanations:** You cannot just Google Translate a grammar explanation. It needs to be written *in* the learner's native language.

### The Recommendation
We should implement **Course Directionality**.
Instead of just "French Course", a Course is defined by a pair: **(Target Language, Source Language)**.

---

## 2. Backend Architecture Changes

We need to modify the Django models to support this.

### **A. Course Model Update**
We need to know *who* this course is for (`source_language`) and *what* they are learning (`target_language`).

```python
# courses/models.py

class Language(models.TextChoices):
    ENGLISH = 'en', 'English'
    ARABIC = 'ar', 'Arabic'
    FRENCH = 'fr', 'French'
    SPANISH = 'es', 'Spanish'

class Course(models.Model):
    title = models.CharField(...)             # e.g. "Français (pour Arabophones)"
    target_language = models.CharField(choices=Language.choices, ...) # 'fr'
    source_language = models.CharField(choices=Language.choices, ...) # 'ar'
    
    # Metadata
    flag_icon = models.ImageField(...)        # French Flag
    source_flag_icon = models.ImageField(...) # Arabic Flag (to show "for Arabic speakers")
```

### **B. User Profile Update**
We need to know the user's "Interface Language".

```python
# users/models.py
class User(AbstractUser):
    # ...
    native_language = models.CharField(default='en', ...) # 'ar'
    learning_language = models.CharField(null=True, ...)  # 'fr'
```

### **C. Content Generation (The AI Part)**
When we generate content using our AI scripts, we currently assume English explanations. We must parameterize this.

*   **Current Prompt:** "Generate a MCQ for French grammar with English explanation."
*   **New Prompt:** "Generate a MCQ for French grammar with **{SOURCE_LANG}** explanation."

---

## 3. Frontend Implementation

### **A. Course Selection Screen**
When a user signs up, we ask: "What do you speak?" (Native Language).
Based on this answer (e.g., "Arabic"), we filter the `GET /api/courses/` endpoint:
```python
# views.py
def get_queryset(self):
    return Course.objects.filter(source_language=self.request.user.native_language)
```
*   If I speak Arabic, I see: "French (from Arabic)", "English (from Arabic)".
*   If I speak English, I see: "French (from English)", "Spanish (from English)".

### **B. UI Translations**
For static buttons ("Start", "Profile", "Settings"), we use a standard library like `i18next` or `expo-localization`.
*   Locales: `en.json`, `ar.json`, `fr.json`.
*   The App detects device language (or user setting) and loads the correct JSON.

---

## 4. Migration Plan (Before Monorepo)

Since this changes the Core Data Model, **we should do this NOW**, before the migration adds complexity.

1.  **Modify `Course` Model:** Add `source_language` and `target_language`.
2.  **Update Seed Scripts:** Update our AI generation scripts to accept a `language` argument (defaulting to 'en' for now, but ready for 'ar').
3.  **Update API:** Filter courses by user preference.

### **Does this solve your concern?**
This ensures that if you want to launch "ALF for Arabic Market", you just:
1.  Create a new Course entry: `(Target: FR, Source: AR)`.
2.  Run the seed script with `source_lang='ar'`.
3.  The AI generates all questions/explanations in Arabic.
4.  The Frontend handles the Right-to-Left (RTL) layout support (React Native supports this natively).
