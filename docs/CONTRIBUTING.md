# ALF — Contributing Guide

Standards, conventions, and workflow for working on ALF.

---

## Development Workflow

### Branching

ALF uses a **single `main` branch** strategy for now (solo/small team development).

When the team grows, adopt:
```
main          → production-ready code
dev           → integration branch
feature/xyz   → individual features
fix/xyz       → bug fixes
```

### Commit Messages

Use **conventional commits** format:

```
<type>(<scope>): <short description>

Types:
  feat      → new feature
  fix       → bug fix
  docs      → documentation only
  refactor  → code change that is not a fix or feature
  style     → formatting, whitespace (no logic change)
  test      → adding or fixing tests
  chore     → build process, dependencies

Scopes (optional):
  web | mobile | backend | shared | docs

Examples:
  feat(web): add dark mode toggle to landing page
  fix(backend): correct JWT refresh token rotation
  docs(shared): update useAuth hook usage examples
  refactor(progress): extract weakness analysis to separate service
```

---

## Code Standards

### TypeScript (Web + Mobile + Shared)

- **Strict mode** is enabled — no `any` without justification
- Always type function parameters and return values explicitly
- Use `interface` for object shapes, `type` for unions and aliases
- Prefer named exports over default exports (except for Next.js pages/layouts)

```ts
// ✅ Good
interface UserProfile {
  id: number;
  username: string;
  role: 'admin' | 'lead_teacher' | 'teacher' | 'student';
}

export const getProfile = async (): Promise<UserProfile> => { ... };

// ❌ Avoid
export default async function(x: any) { ... }
```

### React (Web)

- **Server Components** by default in Next.js — only add `'use client'` when needed (event handlers, hooks, browser APIs)
- Keep components small and focused — if a component exceeds ~100 lines, consider splitting
- Custom hooks for all non-trivial logic (`useXxx` pattern)
- Use hooks from `@alf/shared` for any backend data — do not call `api` directly from components

```tsx
// ✅ Good — use shared hook
import { useAdmin } from '@alf/shared';
const { users } = useAdmin();

// ❌ Avoid — calling api directly from a component
import api from '../services/api';
const users = await api.get('/api/users/');
```

### Python (Backend)

- Follow **PEP 8** — 4-space indentation, 88 char line limit (Black formatter recommended)
- All business logic in `services.py` — **not** in views, not in models
- Views should only: validate input, call services, return response
- Models should only: define schema, basic model methods — no business logic

```python
# ✅ Good — logic in services
# views.py
class SessionView(APIView):
    def post(self, request):
        session = SessionService.build_session_sequence(request.user)
        return Response(SessionSerializer(session).data)

# ❌ Avoid — logic in views
class SessionView(APIView):
    def post(self, request):
        failed = FailedActivityQueue.objects.filter(user=request.user)
        new_acts = Activity.objects.filter(level=user.level)
        # ... 50 lines of adaptive logic ...
```

### CSS / Tailwind

- Use **Tailwind utility classes** — no raw CSS except in `globals.css` for base/reset styles
- Dark mode: always pair light and dark variants: `bg-white dark:bg-[#070b12]`
- Use design tokens (CSS variables) for brand colors — don't hardcode hex values in components
- Group Tailwind classes logically: layout → spacing → colors → borders → typography → states

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Next.js pages | `page.tsx` (Next.js convention) | `app/dashboard/page.tsx` |
| React components | PascalCase | `ThemeToggle.tsx` |
| Hooks | camelCase, `use` prefix | `useActivityWizard.ts` |
| Services | camelCase | `session.ts` |
| Types | camelCase | `activity.ts` |
| Python files | snake_case | `services.py`, `test_progress.py` |
| Python classes | PascalCase | `ActivityAttempt`, `SessionService` |

---

## Where Logic Lives

This is the most important rule in ALF:

| Layer | Where | What goes here |
|-------|-------|---------------|
| **Adaptive engine** | `apps/backend/progress/services.py` | Selection algorithm, scoring, weakness analysis, replay |
| **API endpoints** | `apps/backend/*/views.py` | Input validation, call service, return serialized response |
| **Data shapes** | `apps/backend/*/models.py` + `packages/shared/src/types/` | DB schema, TypeScript interfaces |
| **Server state** | `packages/shared/src/hooks/` | React Query hooks — fetching, caching, mutations |
| **Local UI state** | Component `useState` or Zustand (mobile) | Form state, toggle state, modal open/closed |
| **API calls** | `packages/shared/src/services/` | Axios calls only — no business logic |
| **Rendering** | Component files in `apps/web/components/` or `apps/mobile/components/` | Pure UI — receives data, renders, fires events |

---

## Adding a New Feature — Checklist

- [ ] **Backend:** Add model (if new data), migration, serializer, view, URL route
- [ ] **Backend:** Add service function in `services.py` — no logic in views
- [ ] **Backend:** Add permission check — who can access this endpoint?
- [ ] **Shared:** Add service function in `packages/shared/src/services/`
- [ ] **Shared:** Add React Query hook in `packages/shared/src/hooks/`
- [ ] **Shared:** Export from `packages/shared/src/index.ts`
- [ ] **Shared:** Rebuild: `pnpm --filter @alf/shared build`
- [ ] **Web/Mobile:** Use the hook in the component — no direct API calls
- [ ] **Web:** Add `dark:` variants for any new UI elements
- [ ] **Docs:** Update relevant README if the feature changes how something works

---

## Running Checks Before Committing

```bash
# Lint all workspaces
pnpm lint

# TypeScript type check (web)
pnpm --filter web exec tsc --noEmit

# Backend tests
cd apps/backend && python manage.py test

# Smoke test (integration — all major endpoints)
cd apps/backend && python smoke_test.py
```

---

## Documentation Rules

- **Comments explain WHY** — not what the code does (code should be self-explanatory)
- **Docs explain HOW** — how to use, run, configure, extend a module
- **Update docs when you change behaviour** — stale docs are worse than no docs

Good comment:
```ts
// 30% of the session is reserved for retry queue items.
// This ratio was tuned empirically — lower values reduce learning reinforcement,
// higher values make sessions feel repetitive.
const RETRY_RATIO = 0.3;
```

Bad comment:
```ts
// multiply retryCount by 0.3
const result = retryCount * 0.3;
```

---

*Last updated: February 2026*
