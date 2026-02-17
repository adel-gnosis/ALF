# ADR 001 — Shared Package Strategy (`@alf/shared`)

**Date:** December 2025
**Status:** Accepted

---

## Context

ALF has two JavaScript frontend clients: a React Native mobile app (`apps/mobile`) and a Next.js web admin dashboard (`apps/web`). Both need to:

- Call the same Django REST API
- Handle JWT auth (token storage, refresh, injection into requests)
- Use the same TypeScript types for API responses
- Share React Query hooks for server state management

Without a shared package, both apps would duplicate all of this logic, creating two codebases to keep in sync when the API changes.

---

## Decision

Create a dedicated TypeScript workspace package (`packages/shared`) that:

1. Owns the **single axios instance** with auth interceptors
2. Exposes a `setTokenProvider()` function so each client can register its own storage mechanism (localStorage for web, SecureStore for mobile)
3. Contains all **service functions** that make API calls
4. Contains all **React Query hooks** built on those services
5. Contains all **TypeScript types** for API data shapes

Both `apps/web` and `apps/mobile` consume this package via pnpm workspace resolution (`"@alf/shared": "workspace:*"`).

---

## Consequences

**Positive:**
- API changes require updating code in **one place**, not two
- TypeScript types are always in sync between web and mobile
- Auth logic (token injection, refresh handling) is tested once
- New API endpoints can be added as hooks and immediately available in both apps

**Negative / Trade-offs:**
- The shared package must be built (`tsc`) before it can be consumed — adds one step to setup
- Hooks assume React Query is available — mobile must also use React Query (or we'd need to separate hooks from services, which we may do later)
- Any breaking change to shared types affects both apps simultaneously — requires coordinated updates

---

## Alternatives Considered

**1. Duplicate code in each app**
Rejected — too much maintenance overhead. Any API change requires two separate updates.

**2. Generate types from OpenAPI spec (Django Spectacular)**
Considered for future — would auto-generate types from the Django API schema. Deferred because it adds tooling complexity and the API is still evolving rapidly.

**3. Use a separate published npm package**
Rejected — overkill for an internal monorepo. Workspace packages are instant and require no publish step.

---

*This ADR documents a decision. It is not meant to be changed — if the decision is revisited, create ADR 002.*
