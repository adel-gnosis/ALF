# ALF Monorepo Architecture & Migration Plan

This document outlines the strategy for migrating the ALF project to a production-grade monorepo using **Turborepo** and **pnpm workspaces**.

## 1. Monorepo Structure

We will reorganize the project into a Standard Monorepo structure.

### **Folder Tree**

```text
ALF/
├── apps/
│   ├── backend/                # (Your existing Django project moved here)
│   ├── mobile/                 # (Your existing Expo project moved here)
│   └── web/                    # (New Next.js 15 app)
├── packages/
│   ├── shared/                 # Shared Types, Logic, Services, Hooks
│   │   ├── src/
│   │   │   ├── types/          # Zod schemas & TypeScript interfaces
│   │   │   ├── services/       # API wrapper (Axios)
│   │   │   ├── hooks/          # React Query Hooks
│   │   │   └── utils/          # Helpers (Date formatting, math)
│   │   └── package.json
│   └── config/                 # Shared Configuration
│       ├── eslint-preset.js
│       └── tsconfig.base.json
├── package.json                # Root (pnpm workspace definition)
├── turbo.json                  # Turborepo pipeline config
└── pnpm-workspace.yaml         # Workspace definition
```

### **Backend Note**
While the backend (Django) is part of the *folder* structure for organizational purposes, it will **not** share `node_modules` with the frontend apps. It remains a distinct Python environment but lives in the same Git repository (`monorepo/apps/backend`).

---

## 2. Shared Code Strategy

The goal is to share **Business Logic** but separate **View Logic**.

### ✅ **What IS Shared (@alf/shared)**
*   **Types:** Full TypeScript definitions of your API responses (`Session`, `Activity`, `UserProgress`).
*   **API Services:** The Axios instances and functions calling endpoints (`sessionApi.startSession()`).
*   **React Query Hooks:** The data fetching logic (`useStartSession`, `useSessionHistory`).
*   **Utilities:** Helper functions (e.g., `calculateAccuracy(correct, total)`).
*   **Constants:** API Routes, Enums, Default configurations.

### ❌ **What is NOT Shared (Platform-Specific)**
*   **UI Components:**
    *   *Mobile:* Uses `<View>`/`<Text>` (React Native).
    *   *Web:* Uses `<div>`/`<span>` (HTML/Tailwind).
    *   *Why?* While React Native Web exists, for a high-quality "premium" feel, native platform primitives are often better. We will use a **"Twin Component"** pattern: `apps/mobile/components/SessionCard.tsx` and `apps/web/components/SessionCard.tsx` consuming the exact same hooks.
*   **Navigation:**
    *   *Mobile:* Expo Router (`app/(tabs)/...`).
    *   *Web:* Next.js App Router (`app/dashboard/...`).
*   **Storage:** `AsyncStorage` (Mobile) vs `localStorage/Cookies` (Web). (Can be abstracted, but usually distinct).

---

## 3. Technical Implementation

### **Root Configuration**

**`pnpm-workspace.yaml`**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**`package.json` (Root)**
```json
{
  "name": "alf-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5.x",
    "pnpm": "^9.x"
  }
}
```

### **Importing Shared Code**

In both `apps/web/package.json` and `apps/mobile/package.json`:
```json
{
  "dependencies": {
    "@alf/shared": "workspace:*"
  }
}
```

In `tsconfig.json` (apps):
```json
{
  "compilerOptions": {
    "paths": {
      "@alf/shared": ["../../packages/shared/src/index.ts"]
    }
  }
}
```

Usage in code:
```ts
import { useSession } from '@alf/shared';
```

---

## 4. Example Feature Implementation

Here is how a single feature (Session Handling) cuts across the stack.

### **1. Shared Type (`packages/shared/src/types/session.ts`)**
```typescript
export interface Activity {
  id: string;
  type: 'MCQ' | 'DRAG_DROP' | 'CONJUGATION';
  question: string;
  // ... other fields
}

export interface Session {
  id: string;
  activities_completed: number;
  accuracy: number;
}
```

### **2. Shared API API (`packages/shared/src/services/session.ts`)**
```typescript
import { api } from './api'; // Shared axios instance
import { Session } from '../types/session';

export const getSession = async (id: string): Promise<Session> => {
  const { data } = await api.get(\`/sessions/\${id}/\`);
  return data;
};
```

### **3. Shared Hook (`packages/shared/src/hooks/useSession.ts`)**
```typescript
import { useQuery } from '@tanstack/react-query';
import { getSession } from '../services/session';

export const useSession = (id: string) => {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => getSession(id),
    staleTime: 1000 * 60, // 1 minute
  });
};
```

### **4. Platform Specific UI**

**Mobile (`apps/mobile/components/SessionInfo.tsx`)**
```tsx
import { View, Text } from 'react-native';
import { useSession } from '@alf/shared';

export function SessionInfo({ id }: { id: string }) {
  const { data, isLoading } = useSession(id);
  if (isLoading) return <Text>Loading...</Text>;
  
  return (
    <View className="p-4 bg-white rounded-xl shadow">
      <Text className="text-xl font-bold">Accuracy: {data?.accuracy}%</Text>
    </View>
  );
}
```

**Web (`apps/web/components/SessionInfo.tsx`)**
```tsx
'use client';
import { useSession } from '@alf/shared';

export function SessionInfo({ id }: { id: string }) {
  const { data, isLoading } = useSession(id);
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div className="p-4 bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold">Accuracy: {data?.accuracy}%</h2>
    </div>
  );
}
```

---

## 5. Developer Experience

### **Running the Stack**
With Turborepo, one command runs everything:
```bash
pnpm dev
# Starts:
# - Django Backend (via script wrapper)
# - Next.js Web App (localhost:3000)
# - Expo Go Bundler (localhost:8081)
```

### **Environment Variables**
Create a `.env` in the root (for global secrets) or app-specific `.env.local`:
*   `apps/backend/.env` (Django secrets)
*   `apps/web/.env.local` (NEXT_PUBLIC_API_URL)
*   `apps/mobile/.env` (EXPO_PUBLIC_API_URL)

### **VS Code Config**
Use a multi-root workspace file `alf.code-workspace`:
```json
{
  "folders": [
    { "name": "ROOT", "path": "." },
    { "name": "BACKEND", "path": "apps/backend" },
    { "name": "MOBILE", "path": "apps/mobile" },
    { "name": "WEB", "path": "apps/web" },
    { "name": "SHARED", "path": "packages/shared" }
  ]
}
```

---

## 6. Migration Path (Step-by-Step)

### **Phase 1: Restructuring**
1.  Create the root folder `ALF-Monorepo`.
2.  Initialize `pnpm init` and `turbo`.
3.  Create `apps/` folders.
4.  **Move** your existing backend to `apps/backend`.
5.  **Move** your existing frontend to `apps/mobile`.

### **Phase 2: Extraction**
1.  Initialize `packages/shared`.
2.  Identify code in `apps/mobile/services/` and `apps/mobile/types/`.
3.  **Move** code to `packages/shared/src/`.
4.  Update `apps/mobile/package.json` to depend on `@alf/shared`.
5.  Refactor imports in Mobile app:
    *   *From:* `import { getSession } from '../services/session'`
    *   *To:* `import { getSession } from '@alf/shared'`

### **Phase 3: Web Expansion**
1.  Run `npx create-next-app@latest apps/web`.
2.  Add `@alf/shared` dependency.
3.  Configure `TranspilePackages: ['@alf/shared']` in `next.config.js`.
4.  Start building web pages using the *same* logic as mobile.

### **Phase 4: Testing**
Ensure both platforms work by running the full integration flow (Start Session -> Complete Session) on both simultaneously connected to the same local Django backend.
