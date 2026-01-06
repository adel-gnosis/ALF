# ALF - Adaptive Learning Framework

ALF is an intelligent, adaptive language learning platform designed to provide personalized education through smart algorithms, rather than static content drilling.

The system is built on the core philosophy that **"The System Remembers Everything."** tailored to address user weaknesses dynamically.

---

## 🏗 Technical Architecture

The project is structured as a modern decoupled full-stack application.

### 🐍 Backend: "The Brain"
**Stack:** Python, Django, Django REST Framework (DRF), SQLite/PostgreSQL.

The backend is not just an API; it is the decision engine.
*   **`progress` App:** The heart of the system.
    *   **Services Layer (`services.py`):** Contains all business logic (adaptive weighted selection, session management, weakness analysis).
    *   **Models:** Tracks `UserProgress`, `ActivityAttempt`, `StudySession`, and `FailedActivityQueue`.
*   **`courses` & `activities` Apps:** Manage the educational content structure (Levels A1-B1, Subjects, 8 distinct Activity Types).
*   **Key Algorithms:**
    *   **Activity Selection:** A probabilistic engine that mixes new content (70%) with prioritized failed concepts (30%).
    *   **Binary Search Placement:** A recursive algorithm to determine user CEFR level in ~12 questions.

### 📱 Frontend: "The Face"
**Stack:** React Native (Expo), TypeScript, NativeWind (Tailwind), React Query.

*   **State Management:**
    *   **React Query:** Handles server state, caching, and optimistic updates for seamless transitions.
    *   **Zustand:** Manages local app state (like course selection).
*   **Key Components:**
    *   **`SessionScreen`:** A dynamic rendering engine that can display any of the 8 activity types (MCQ, Drag & Drop, Conjugation, etc.) based on JSON config.
    *   **`HistoryScreen`:** Displays past performance and triggers the Replay engine.

---

## 🌟 Core Features

### 1. Adaptive Learning Engine
Unlike linear apps, ALF adjusts in real-time.
*   **Retry Queue:** If you fail a question, it enters a `Low -> High` priority queue. The system will "inject" this question into future sessions until you master it.
*   **Weakness Detection:** The system analyzes accuracy per Subject (e.g., "Grammar"). If accuracy drops below 60%, it triggers a **Weakness Alert** suggesting specific focused practice.

### 2. "Set-Based" Progression
Content is digested in "Sets" (Sessions) of 12 activities.
*   **Fast Unlock:** Scoring >70% immediately unlocks the next level.
*   **Regression:** Scoring <50% suggests a downgrade to reinforce basics.

### 3. Deterministic Replay Mode (New)
A feature allowing users to master specific difficult sets.
*   **How it works:** The system records the exact `activity_id` sequence of every session.
*   **The Logic:** When "Replay" is clicked, a new session is hydrated using the *archived* sequence instead of the random engine.
*   **Result:** Users can retry "Set 4" exactly as it was, turning a 60% failure into a 100% success.

### 4. Smart Placement Test
A 12-question adaptive test that jumps levels based on performance to find the perfect starting point for new users.

---

## 📂 Project Structure

```
ALF/
├── backend/                # Django Project
│   ├── progress/           # Core adaptive logic
│   ├── courses/            # Content structure
│   ├── activities/         # Question types
│   └── manage.py
│
└── frontend/               # Expo Project
    ├── app/                # File-based routing (Expo Router)
    ├── services/           # API integration
    ├── components/         # Reusable UI (Activity renderers)
    └── assets/
```
