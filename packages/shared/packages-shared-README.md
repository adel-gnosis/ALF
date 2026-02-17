# `@alf/shared` — Shared TypeScript Package

The bridge between the backend and all frontend apps.
Contains the API client, all service functions, React hooks, and shared TypeScript types.

**Consumed by:** `apps/web` and `apps/mobile`
**Built with:** TypeScript, Axios, React Query

---

## Quick Start

```bash
# Build the package (required before web/mobile can use it)
pnpm --filter @alf/shared build

# Watch mode during development
pnpm --filter @alf/shared dev
```

Turborepo handles this automatically when you run `pnpm dev` from the root.

---

## Structure

```
packages/shared/src/
├── services/
│   ├── api.ts            # Axios instance, interceptors, setTokenProvider, setApiBaseUrl
│   ├── auth.ts           # login(), logout(), refreshToken()
│   ├── session.ts        # startSession(), submitAnswer(), endSession(), getHistory()
│   ├── user.ts           # getProfile(), updateProfile()
│   ├── teacher.ts        # Teacher-scoped endpoints
│   ├── admin.ts          # Admin-scoped endpoints
│   └── conjugation.ts    # French verb conjugation API
│
├── hooks/
│   ├── useAuth.ts            # Auth state + login/logout mutations
│   ├── useSession.ts         # Active session state management
│   ├── useTeacher.ts         # Teacher dashboard data (React Query)
│   ├── useAdmin.ts           # Admin dashboard data (React Query)
│   ├── useLanguage.ts        # i18n language switching
│   ├── useConjugation.ts     # Verb conjugation queries
│   ├── useDicteeTTS.ts       # Text-to-speech for Dictée activity
│   └── useActivityWizard.ts  # Multi-step activity creation flow
│
├── types/
│   ├── session.ts        # Session, StudySession, ActivityAttempt
│   ├── activity.ts       # Activity, 8 activity type shapes
│   ├── console.ts        # Difficulty, admin console types
│   └── activityWizard.ts # ActivityType, wizard step types
│
├── constants/
│   └── activityCategories.ts  # CEFR levels (A1-B1), subjects, categories
│
└── index.ts              # All public exports
```

---

## Critical Setup: App Startup

Every client app **must** call these two functions before making API requests.
They are called once in the root Providers component.

### `setTokenProvider(fn)`

Tells the axios client how to get the current auth token. The function is async and storage-agnostic:

```ts
// In apps/web/app/providers.tsx
import { setTokenProvider } from '@alf/shared';

setTokenProvider(async () => localStorage.getItem('alf_access_token'));
```

```ts
// In apps/mobile — using Expo SecureStore
import { setTokenProvider } from '@alf/shared';
import * as SecureStore from 'expo-secure-store';

setTokenProvider(async () => SecureStore.getItemAsync('alf_access_token'));
```

### `setApiBaseUrl(url)`

Points the axios client at the correct backend:

```ts
import { setApiBaseUrl } from '@alf/shared';

// Web:
setApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

// Mobile:
setApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);
```

---

## Using Hooks

All hooks are built on **React Query** and require a `QueryClientProvider` in the component tree.

```tsx
// Login example
import { useAuth } from '@alf/shared';

function LoginForm() {
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (credentials) => {
    await login(credentials);
    // Redirects automatically on success
  };
}
```

```tsx
// Admin data example
import { useAdmin } from '@alf/shared';

function AdminDashboard() {
  const { users, courses, isLoading } = useAdmin();
  // users and courses are automatically cached and refreshed
}
```

```tsx
// Session example
import { useSession } from '@alf/shared';

function SessionScreen({ sessionId }) {
  const { currentActivity, submitAnswer, sessionProgress } = useSession(sessionId);
}
```

---

## Types Reference

### Session Types (`types/session.ts`)

```ts
StudySession      // A single learning session (12 activities)
ActivityAttempt   // One answer within a session
UserProgress      // Per-subject accuracy for a user
```

### Activity Types (`types/activity.ts`)

```ts
Activity          // Base activity shape
// Plus 8 specific shapes:
MCQActivity | DragDropActivity | ConjugationActivity | FillBlankActivity
| DicteeActivity | TranslationActivity | MatchingActivity | OrderingActivity
```

### Difficulty (`types/console.ts`)

```ts
type Difficulty = 'easy' | 'medium' | 'hard';
```

---

## Adding a New Service

1. Create `src/services/myFeature.ts`
2. Use the shared `api` axios instance:
   ```ts
   import api from './api';
   export const getMyData = () => api.get('/api/my-feature/');
   ```
3. Create a hook in `src/hooks/useMyFeature.ts` using React Query:
   ```ts
   import { useQuery } from '@tanstack/react-query';
   import { getMyData } from '../services/myFeature';
   export const useMyFeature = () => useQuery({
     queryKey: ['myFeature'],
     queryFn: getMyData,
   });
   ```
4. Export both from `src/index.ts`
5. Run `pnpm --filter @alf/shared build`

---

*Last updated: February 2026*
