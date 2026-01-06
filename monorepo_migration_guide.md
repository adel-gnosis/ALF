# Monorepo Migration Guide

We have successfully migrated the project to a Monorepo structure using Turborepo and pnpm workspaces.

## Can I execute this?

Yes! The structure is ready. To start developing:

```bash
# 1. Install Dependencies (Root)
pnpm install

# 2. Start Dev Servers (All Apps)
npx pnpm dev

# This single command runs:
# - Django Backend (Port 8000)
# - Next.js Web (Port 3000)
# - Expo Mobile (Interactive Terminal)
```

## Folder Structure

```
ALF-Monorepo/
├── apps/
│   ├── backend/           # Django API (Port 8000)
│   ├── mobile/            # Expo / React Native App
│   │   └── app/session/[id].tsx  <-- Uses Shared Hook
│   └── web/               # Next.js 15 App (Port 3000)
│       └── app/session/[id]/page.tsx  <-- Uses Shared Hook
├── packages/
│   └── shared/            # TypeScript Shared Logic
│       ├── src/
│       │   ├── types/     # Shared Interfaces
│       │   ├── services/  # Shared API Client
│       │   └── hooks/     # Shared React Query Hooks
│       └── package.json
├── package.json           # Root Scripts
├── pnpm-workspace.yaml    # Workspace Config
└── turbo.json             # Build Pipeline
```

## Migration Steps Performed

1.  **Restructure:** Moved `backend` → `apps/backend` and `frontend` → `apps/mobile`.
2.  **Configuration:** Created root `package.json`, `pnpm-workspace.yaml`, and `turbo.json`.
3.  **Shared Library:** Created `@alf/shared` with API client, Session types, and Hooks.
4.  **Web App:** Scaffolded `apps/web` (Next.js) and configured it to consume `@alf/shared`.
5.  **Mobile App:** Updated `apps/mobile/package.json` to consume `@alf/shared`.

## Example Feature: Session

We implemented the **Session Detail** feature across the stack.

### 1. Shared Logic (`packages/shared`)
- **Type:** `Session` interface.
- **Service:** `sessionApi.getSession(id)`.
- **Hook:** `useSession(id)`.

### 2. Web Implementation (`apps/web`)
- Uses `useSession` hook in a Server/Client Component hybrid.
- Tailwind CSS for styling.

### 3. Mobile Implementation (`apps/mobile`)
- Uses `useSession` hook in Expo Router screen.
- NativeWind for styling.

## Verification

To verify the setup:

1.  **Backend:** `cd apps/backend && ./venv/bin/python manage.py runserver`
2.  **Web:** `cd apps/web && pnpm dev` -> Visit `http://localhost:3000/session/123`
3.  **Mobile:** `cd apps/mobile && npx expo start` -> open on simulator.

Both web and mobile will fetch data from the same Django backend using the exact same TypeScript logic.

## Troubleshooting

### `ENOSPC: System limit for number of file watchers reached`
If you see this error on Linux, run the following commands to increase the system limit:

```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
```

