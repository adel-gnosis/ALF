# ALF Backend — Django REST API

**"The Brain"** — all adaptive logic, business rules, and data lives here.

Stack: Python, Django 5, Django REST Framework, SimpleJWT, django-polymorphic, verbecc

---

## Quick Start

```bash
cd apps/backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py runserver
```

API runs at **http://localhost:8000**

---

## Django Apps

### `users/`
Custom user model (`AUTH_USER_MODEL = "users.User"`) with role-based permissions.

- Extends Django's `AbstractUser`
- Roles: `admin`, `lead_teacher`, `teacher`, `student`
- JWT auth via SimpleJWT — tokens issued at login, validated on every request

### `courses/`
Defines the **content structure** — the "what" students learn.

```
Level (A1 / A2 / B1...)
  └── Subject (Grammar, Vocabulary, Pronunciation, Conjugation...)
        └── Set (a group of 12 activities)
```

### `activities/`
Defines the **8 activity types** using `django-polymorphic` (single table inheritance with type dispatch).

| Type | Description |
|------|-------------|
| MCQ | Multiple choice question |
| DragDrop | Drag words into correct positions |
| Conjugation | Conjugate a French verb |
| FillBlank | Fill in the missing word |
| Dictee | Listen and type what you hear |
| Translation | Translate a sentence |
| Matching | Match pairs of words/phrases |
| Ordering | Reorder words to form a sentence |

Management commands in `activities/management/commands/` handle bulk import from JSON.

### `progress/` — The Adaptive Engine ⭐
The most critical app. All adaptive logic lives in `progress/services.py`.

**Models:**
- `StudySession` — one session (12 activities), tracks start/end, score
- `ActivityAttempt` — one answer within a session (correct/incorrect, time taken)
- `UserProgress` — per-user, per-subject accuracy tracking
- `FailedActivityQueue` — prioritised retry queue for failed activities

**Key service functions in `services.py`:**

| Function | What it does |
|----------|-------------|
| `build_session_sequence()` | Builds the 12-activity mix (70% new + 30% retry) |
| `record_attempt()` | Saves an answer, updates UserProgress, manages retry queue |
| `calculate_session_result()` | Scores session, determines pass/fail/regression |
| `get_weakness_report()` | Analyzes per-subject accuracy, flags subjects below 60% |
| `replay_session()` | Hydrates a session from archived `activity_id` sequence |

### `config/`
Django project configuration.

```
config/
├── settings/
│   ├── base.py    # Shared config (auth, cors, jwt, i18n, installed apps)
│   ├── dev.py     # SQLite, DEBUG=True, relaxed CORS
│   └── prod.py    # PostgreSQL, DEBUG=False, strict security
├── urls.py        # Root URL routing
└── wsgi.py        # WSGI entrypoint for production
```

---

## API Endpoints (Overview)

| Prefix | App | Description |
|--------|-----|-------------|
| `/api/auth/` | users | Login, logout, token refresh |
| `/api/users/` | users | Profile management |
| `/api/courses/` | courses | Levels, subjects, sets |
| `/api/activities/` | activities | Activity CRUD (admin/teacher) |
| `/api/progress/` | progress | Sessions, attempts, history, replay |
| `/api/admin/` | users + courses | Admin-only management endpoints |

Full endpoint docs: see each app's `views.py` and `urls.py`.

---

## Data & Fixtures

```
data/activities/          # Raw JSON activity content for import
data/ai_prompts/          # Prompt templates used for AI-assisted content generation
fixtures/                 # Django fixtures (for testing + initial data)
seed_data/french/         # French-specific seed content
```

To import activity content from JSON:
```bash
python manage.py import_activities data/activities/a1_grammar.json
```

---

## Locale / i18n

The backend serves content in 3 languages. Translation files:

```
locale/
├── en/LC_MESSAGES/django.po   # English
├── fr/LC_MESSAGES/django.po   # French
└── ar/LC_MESSAGES/django.po   # Arabic (RTL)
```

To compile translations after editing `.po` files:
```bash
python manage.py compilemessages
```

---

## Testing

```bash
# Run all tests
python manage.py test

# Run tests for a specific app
python manage.py test progress

# Run with pytest (recommended)
pytest

# Run smoke test (integration check — all major endpoints)
python smoke_test.py
```

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `djangorestframework` | REST API framework |
| `djangorestframework-simplejwt` | JWT authentication |
| `django-cors-headers` | CORS headers for frontend clients |
| `django-polymorphic` | Polymorphic activity models (8 types, one queryset) |
| `verbecc` | French verb conjugation engine |
| `python-decouple` | Environment variable management |
| `psycopg2-binary` | PostgreSQL adapter (used in production) |
| `Pillow` | Image handling for media uploads |

---

*Last updated: February 2026*
