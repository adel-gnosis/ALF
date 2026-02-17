# ALF Web — Next.js App

**Two purposes in one app:**
1. **Public marketing site** — landing page for visitors at `/`
2. **Admin & Teacher dashboard** — content management, analytics, user management at `/dashboard`

Stack: Next.js 16, React 19, TypeScript, Tailwind CSS 4, React Query, `@alf/shared`

---

## Quick Start

```bash
# From ALF root
cd apps/web
copy .env.example .env.local    # Windows
# cp .env.example .env.local   # Mac/Linux

# Edit .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start dev server (from ALF root):
cd ../..
pnpm --filter web dev
```

App runs at **http://localhost:3000**

---

## Routing Structure

```
app/
├── page.tsx                      # / — Public landing page (no auth required)
├── layout.tsx                    # Root layout (fonts, global Providers)
├── providers.tsx                 # ThemeProvider, QueryClient, I18nProvider
│
├── auth/
│   └── login/
│       └── page.tsx              # /auth/login — Login form
│
├── dashboard/
│   ├── admin/                    # /dashboard/admin — Admin-only
│   │   └── page.tsx
│   ├── teacher/                  # /dashboard/teacher — Teacher view
│   │   └── page.tsx
│   └── components/
│       └── layout/               # Sidebar, header, nav — shared dashboard shell
│
├── session/
│   └── [id]/
│       └── page.tsx              # /session/:id — Session review/replay view
│
└── api/
    └── conjugation/
        └── route.ts              # Next.js API route — proxies to Django conjugation
```

---

## Provider Stack

Every page (public and authenticated) is wrapped in all global providers.
Defined in `app/providers.tsx`:

```tsx
<ThemeProvider>           // Dark/light mode
  <QueryClientProvider>   // React Query — staleTime: 60s default
    <I18nProvider>        // Language: EN / FR / AR
      {children}
    </I18nProvider>
  </QueryClientProvider>
</ThemeProvider>
```

Token injection happens in `providers.tsx` via:
```tsx
setTokenProvider(async () => localStorage.getItem('alf_access_token'));
```
This registers the auth token with the shared axios client **once at app startup**.

---

## Key Directories

### `components/`

Reusable UI components shared across the web app.

```
components/
├── ThemeToggle.tsx               # Dark/light mode toggle button (used everywhere)
├── activities/                   # Activity-type renderers for web
└── ActivityCreationWizard/       # Multi-step wizard for creating new activities
    └── Step3_ActivityContent/    # Content-specific step (one per activity type)
```

### `context/`

Custom React contexts.

```
context/
├── ThemeContext.tsx              # Theme state + toggleTheme() + localStorage persistence
└── I18nContext.tsx              # Language switching, translation loading
```

### `messages/`

Translation strings for the web app UI (used by `I18nContext`).

---

## Auth & Route Protection

- **No NextAuth or next-iron-session** — auth is JWT-based via `@alf/shared`
- Tokens stored in `localStorage` under key `alf_access_token`
- Protected routes (anything under `/dashboard`) check auth status via `useAuth()` from `@alf/shared`
- Unauthenticated users are redirected to `/auth/login`
- Role checks (`isAdmin`, `isTeacher`) determine what dashboard content renders

---

## Theme System

- **Context:** `context/ThemeContext.tsx`
- **Persistence:** `localStorage` key `theme`
- **Mechanism:** Toggles `.dark` CSS class on `<html>` element
- **Default:** Reads `prefers-color-scheme` OS setting on first visit
- **Toggle component:** `components/ThemeToggle.tsx` — use this anywhere

Usage in any component:
```tsx
import { useTheme } from "@/context/ThemeContext";

const { theme, toggleTheme } = useTheme();
```

---

## Dashboard: Permission Levels

| Route | Who can access |
|-------|---------------|
| `/dashboard/admin` | Admin only |
| `/dashboard/teacher` | Admin + Lead Teacher + Basic Teacher |
| `/session/:id` | Authenticated users |

Permission is enforced by the backend (API returns 403 for unauthorized requests) and also reflected in the frontend UI (certain actions/buttons are hidden for lower-permission roles).

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@alf/shared` | API client, all service hooks, shared types |
| `@tanstack/react-query` | Server state caching and synchronization |
| `lucide-react` | Icon library |
| `french-verbs` + `french-verbs-lefff` | Client-side French verb conjugation for activity rendering |
| `tailwindcss` v4 | Utility-first styling (uses new CSS-native config) |

---

## Tailwind v4 Notes

This app uses **Tailwind CSS v4** (CSS-native, no `tailwind.config.js`).
- Configuration is done in `globals.css` using `@theme` directive
- Dark mode uses the `.dark` class strategy (applied to `<html>`)
- Use `dark:` variants for dark mode styles

---

*Last updated: February 2026*
