# ALF — System Architecture

> **The core philosophy: "The System Remembers Everything."**
> Every attempt, failure, and success is recorded and used to personalize the next session.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [App Responsibilities](#3-app-responsibilities)
4. [Data & Auth Flow](#4-data--auth-flow)
5. [Shared Package (`@alf/shared`)](#5-shared-package-alfshared)
6. [Backend Architecture](#6-backend-architecture)
7. [Web App Architecture](#7-web-app-architecture)
8. [Mobile App Architecture](#8-mobile-app-architecture)
9. [Key Algorithms](#9-key-algorithms)
10. [Permission Model](#10-permission-model)
11. [i18n Strategy](#11-i18n-strategy)
12. [Theme System](#12-theme-system)

---

## 1. High-Level Overview

ALF is a **decoupled, full-stack adaptive language learning platform** for French.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│                                                                 │
│   ┌──────────────────┐          ┌──────────────────────────┐   │
│   │   apps/mobile    │          │       apps/web           │   │
│   │  (React Native)  │          │      (Next.js)           │   │
│   │  Student app     │          │  Landing + Admin Panel   │   │
│   └────────┬─────────┘          └────────────┬─────────────┘   │
│            │                                 │                  │
│            └──────────────┬──────────────────┘                  │
│                           │  HTTP + JWT                         │
│                           ▼                                     │
│   ┌───────────────────────────────────────────────────────┐    │
│   │                   apps/backend                        │    │
│   │              (Django + DRF + SimpleJWT)               │    │
│   │           The Brain — Adaptive Engine + API           │    │
│   └───────────────────────────────────────────────────────┘    │
│                           │                                     │
│                           ▼                                     │
│                  SQLite (dev) / PostgreSQL (prod)               │
└─────────────────────────────────────────────────────────────────┘
```

**Communication:** All clients talk to the backend via **REST API** with **JWT authentication**.

**Shared logic:** The `packages/shared` TypeScript package contains the API client, all service functions, React hooks, and shared types — consumed by both `apps/web` and `apps/mobile`.

---

## 2. Monorepo Structure

ALF is managed as a **pnpm + Turborepo monorepo**.

```
ALF/                              # Monorepo root
├── apps/
│   ├── backend/                  # Django REST API (Python)
│   ├── mobile/                   # React Native / Expo (Student app)
│   └── web/                      # Next.js (Landing page + Admin dashboard)
│
├── packages/
│   └── shared/                   # Shared TS: API client, hooks, types
│
├── data/                         # Seed data, fixtures, content files
├── scripts/                      # Repo-level automation scripts
├── .github/                      # GitHub Actions workflows
├── turbo.json                    # Turborepo task pipeline
├── pnpm-workspace.yaml           # pnpm workspace definition
└── package.json                  # Root workspace scripts
```

### Why Turborepo?

Turborepo orchestrates build tasks across packages with **dependency awareness**:
- `packages/shared` builds **before** `apps/web` and `apps/mobile`
- Parallel execution where safe
- Cached outputs (`.next/`, `dist/`) for fast rebuilds

---

## 3. App Responsibilities

| App | Stack | Who uses it | Primary purpose |
|-----|-------|-------------|-----------------|
| `apps/backend` | Python, Django 5, DRF, SimpleJWT | All clients | Adaptive engine, all business logic, REST API, database |
| `apps/mobile` | React Native, Expo, NativeWind | Students | The actual learning experience (sessions, activities, history) |
| `apps/web` | Next.js 16, Tailwind CSS 4, React 19 | Visitors, Teachers, Admins | Marketing landing page + teacher/admin dashboard |
| `packages/shared` | TypeScript, Axios, React Query | web + mobile | Shared API client, service functions, hooks, type definitions |

---

## 4. Data & Auth Flow

### Authentication Flow

```
Client (web or mobile)
│
│  1. POST /api/auth/login/ { username, password }
▼
Backend (Django + SimpleJWT)
│
│  2. Validates credentials
│  3. Returns { access_token, refresh_token }
▼
Client
│  4. Stores access_token in localStorage (web) or SecureStore (mobile)
│  5. @alf/shared axios interceptor auto-attaches token:
│     Authorization: Bearer <access_token>
│
│  6. All subsequent API calls are authenticated automatically
▼
Backend
   7. Validates JWT on every request
   8. Returns data or 401 if expired
│
│  9. On 401: client calls POST /api/auth/token/refresh/
│     with refresh_token → gets new access_token
```

### Token Configuration (SimpleJWT)

| Token | Lifetime | Behaviour |
|-------|----------|-----------|
| Access token | 1 day | Short-lived, attached to every request |
| Refresh token | 7 days | Rotated on use (old token invalidated) |

### How `@alf/shared` Handles Tokens

The shared API client uses a **token provider pattern** — the client app (web or mobile) registers a function that returns the current token:

```ts
// In apps/web/app/providers.tsx
setTokenProvider(async () => localStorage.getItem('alf_access_token'));

// In apps/mobile — equivalent using SecureStore or AsyncStorage
setTokenProvider(async () => await SecureStore.getItemAsync('alf_access_token'));
```

This keeps the shared package **storage-agnostic** while still handling auth automatically.

---

## 5. Shared Package (`@alf/shared`)

**Location:** `packages/shared/`
**Consumed by:** `apps/web`, `apps/mobile`

### What It Contains

```
packages/shared/src/
├── services/
│   ├── api.ts          # Axios instance + interceptors + setTokenProvider
│   ├── auth.ts         # login(), logout(), refreshToken()
│   ├── session.ts      # startSession(), submitAnswer(), endSession()
│   ├── user.ts         # getProfile(), updateProfile()
│   ├── teacher.ts      # Teacher-scoped API calls
│   ├── admin.ts        # Admin-scoped API calls
│   └── conjugation.ts  # French conjugation API calls
│
├── hooks/
│   ├── useAuth.ts          # Auth state, login/logout mutations
│   ├── useSession.ts       # Active session management
│   ├── useTeacher.ts       # Teacher dashboard data
│   ├── useAdmin.ts         # Admin dashboard data
│   ├── useLanguage.ts      # i18n language switching
│   ├── useConjugation.ts   # French verb conjugation
│   ├── useDicteeTTS.ts     # Text-to-speech for dictée activity
│   └── useActivityWizard.ts # Multi-step activity creation
│
├── types/
│   ├── session.ts       # Session, ActivityAttempt, StudySession types
│   ├── activity.ts      # Activity, ActivityType, all 8 activity shapes
│   ├── console.ts       # Difficulty, admin console types
│   └── activityWizard.ts # Activity creation wizard types
│
├── constants/
│   └── activityCategories.ts  # CEFR levels, subjects, categories
│
└── index.ts            # Public exports
```

### Key Export: `setTokenProvider` and `setApiBaseUrl`

These two functions **must be called at app startup** (in the root Providers component) before any API calls are made.

---

## 6. Backend Architecture

**Location:** `apps/backend/`
**Stack:** Python, Django 5, Django REST Framework, SimpleJWT, django-polymorphic, verbecc

### Django Apps

```
apps/backend/
├── config/
│   ├── settings/
│   │   ├── base.py       # Shared settings (auth, cors, i18n, JWT config)
│   │   ├── dev.py        # Development overrides (SQLite, DEBUG=True)
│   │   └── prod.py       # Production overrides (PostgreSQL, security)
│   └── urls.py           # Root URL routing
│
├── users/                # Custom user model + roles
├── courses/              # Content structure: Levels, Subjects, Sets
├── activities/           # 8 activity types (polymorphic models)
├── progress/             # The adaptive engine (THE most important app)
│   └── services.py       # All business logic lives here
│
├── data/                 # Raw JSON content for import
├── fixtures/             # Django fixtures for testing
├── locale/               # Translation files (EN / FR / AR)
├── media/                # Uploaded files (audio, images)
└── scripts/              # Management commands, seed scripts
```

### The `progress` App — The Brain

This is the heart of ALF. `progress/services.py` contains:

- **Activity Selection Engine** — probabilistic mix of new content (70%) + failed concepts (30%)
- **Session Management** — creates, tracks, and closes study sessions
- **Weakness Analysis** — per-subject accuracy tracking, triggers alerts at <60% accuracy
- **Failed Activity Queue** — `Low → High` priority retry system
- **Replay Engine** — recreates past sessions deterministically from archived `activity_id` sequences

### Content Structure

```
Level (A1, A2, B1...)
  └── Subject (Grammar, Vocabulary, Pronunciation...)
        └── Set (12 activities)
              └── Activity (one of 8 types)
```

### 8 Activity Types

Implemented as **polymorphic models** (django-polymorphic):

1. MCQ (Multiple Choice)
2. Drag & Drop
3. Conjugation
4. Fill in the Blank
5. Dictée (audio → text)
6. Translation
7. Matching
8. Sentence Ordering

### Key Third-Party: `verbecc`

Used for **French verb conjugation**. Powers the Conjugation activity type and the dedicated conjugation API endpoint.

---

## 7. Web App Architecture

**Location:** `apps/web/`
**Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript, React Query, `@alf/shared`

### Routing Structure

```
apps/web/app/
├── page.tsx                    # Public landing page (http://localhost:3000/)
├── layout.tsx                  # Root layout (fonts, Providers)
├── providers.tsx               # Global providers (Theme, QueryClient, i18n, Auth)
│
├── auth/
│   └── login/                  # Login page (unauthenticated)
│
├── dashboard/
│   ├── admin/                  # Admin-only dashboard
│   ├── teacher/                # Teacher dashboard (admin + lead teacher access)
│   └── components/
│       └── layout/             # Sidebar, header, layout shell
│
├── session/
│   └── [id]/                   # Active learning session view
│
└── api/
    └── conjugation/            # Next.js API route (proxies to Django conjugation)
```

### Provider Stack (Root)

All pages (public and authenticated) are wrapped in:

```tsx
<ThemeProvider>           // Dark/light mode (custom context, localStorage)
  <QueryClientProvider>   // React Query (server state + caching)
    <I18nProvider>        // Language switching (EN/FR/AR)
      {children}
    </I18nProvider>
  </QueryClientProvider>
</ThemeProvider>
```

### Web-Specific Notes

- **No NextAuth** — authentication is handled entirely by `@alf/shared` + Django JWT
- **`french-verbs` + `french-verbs-lefff`** — client-side French verb library (used in activity rendering)
- **Route protection** — unauthenticated users hitting `/dashboard/*` are redirected to `/auth/login`
- The **landing page** (`app/page.tsx`) is fully public and does not require auth

---

## 8. Mobile App Architecture

**Location:** `apps/mobile/`
**Stack:** React Native, Expo, NativeWind (Tailwind), React Query, Zustand, `@alf/shared`

### Key Screens

```
apps/mobile/app/
├── (tabs)/         # Bottom tab navigation (Home, Progress, etc.)
├── auth/           # Login / registration
├── lesson/         # Content browsing
├── session/        # Active learning session (renders all 8 activity types)
├── history/        # Past sessions + Replay trigger
└── placement/      # 12-question adaptive placement test
```

### State Management

| Tool | Used for |
|------|----------|
| React Query (via `@alf/shared` hooks) | Server state: sessions, activities, progress |
| Zustand | Local app state: selected course, UI state |

### Key Components

- **`SessionScreen`** — Dynamic activity renderer. Accepts a JSON config and renders the correct activity type component (MCQ, Drag & Drop, Conjugation, etc.)
- **`HistoryScreen`** — Shows past sessions and triggers the Replay engine via `@alf/shared`

---

## 9. Key Algorithms

### Activity Selection (Backend — `progress/services.py`)

On each session start, the engine builds a 12-activity sequence:

```
70% → New content (weighted by level + subject)
30% → Failed activities from the retry queue (prioritised by failure count)
```

### Smart Placement Test

- 12 questions, adaptive
- Uses **binary search** to jump between CEFR levels based on performance
- Determines starting level in ~12 questions (vs linear tests that require 50+)

### Session Scoring & Progression

| Score | Outcome |
|-------|---------|
| > 70% | Fast unlock — next level immediately available |
| 50–70% | Normal progression |
| < 50% | Regression suggested — reinforcement of current level |

### Deterministic Replay

- Every session records the **exact `activity_id` sequence**
- Replay hydrates a new session from the archived sequence (not the random engine)
- Allows users to retry a specific set exactly as it appeared

---

## 10. Permission Model

The web dashboard has three roles:

| Role | Access |
|------|--------|
| **Admin** | Full access — user management, all content, all analytics, system settings |
| **Lead Teacher** | Similar to admin — content creation, student analytics, session management |
| **Basic Teacher** | Limited — view their students, assign content, view basic reports |

Role enforcement happens at two levels:
1. **Backend** — DRF permission classes on each endpoint
2. **Frontend** — Route-level guards + conditional UI rendering based on user role from `useAuth()`

---

## 11. i18n Strategy

ALF supports **3 languages** across all platforms:

| Language | Code | Platform |
|----------|------|----------|
| English | `en` | Web + Mobile |
| French | `fr` | Web + Mobile + Backend |
| Arabic | `ar` | Web + Mobile + Backend (RTL) |

- **Backend:** Django's built-in i18n (`USE_I18N = True`), `.po` files in `locale/`
- **Web:** Custom `I18nProvider` in `apps/web/context/I18nContext.tsx`
- **Mobile:** Custom `i18n/` directory with resource files

---

## 12. Theme System

### Web

- **Implementation:** Custom React context (`ThemeProvider` in `apps/web/context/ThemeContext.tsx`)
- **Persistence:** `localStorage` key `theme`
- **Mechanism:** Toggles `.dark` class on `<html>` element
- **Default:** Respects `prefers-color-scheme` OS setting
- **Scope:** Global — wraps all pages including the public landing page

### Mobile

- NativeWind handles dark mode via Tailwind's dark variant
- Follows OS setting (Expo's `useColorScheme`)

---

*Last updated: February 2026*
