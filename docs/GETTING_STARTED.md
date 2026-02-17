# ALF — Getting Started (Local Development)

This guide gets all three ALF apps running on your machine.
Estimated time: **15–20 minutes** on first setup, **2 minutes** on subsequent runs.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | https://nodejs.org |
| pnpm | ≥ 8 | `npm install -g pnpm` |
| Python | ≥ 3.11 | https://python.org |
| Git | any | https://git-scm.com |

---

## 1. Clone & Install

```bash
git clone <repo-url> ALF
cd ALF

# Install all JS dependencies (web + mobile + shared) in one command
pnpm install
```

---

## 2. Backend Setup (Django)

```bash
cd apps/backend

# Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Set up environment variables
copy .env.example .env      # Windows
# cp .env.example .env      # Mac/Linux

# Run database migrations
python manage.py migrate

# (Optional) Load seed data for development
python manage.py loaddata fixtures/initial_data.json

# Start the backend server
python manage.py runserver
```

Backend runs at: **http://localhost:8000**
API root: **http://localhost:8000/api/**
Django admin: **http://localhost:8000/admin/**

---

## 3. Web App Setup (Next.js)

```bash
# From ALF root
cd apps/web

# Create environment file
copy .env.example .env.local     # Windows
# cp .env.example .env.local     # Mac/Linux
```

Edit `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
# Start the web dev server (from ALF root — Turborepo handles shared build)
cd ../..
pnpm --filter web dev
```

Web app runs at: **http://localhost:3000**
- Landing page: http://localhost:3000/
- Login: http://localhost:3000/auth/login
- Admin dashboard: http://localhost:3000/dashboard/admin
- Teacher dashboard: http://localhost:3000/dashboard/teacher

---

## 4. Mobile App Setup (Expo)

```bash
cd apps/mobile

# Create environment file
copy .env.example .env      # Windows
# cp .env.example .env      # Mac/Linux
```

Edit `apps/mobile/.env`:
```env
# Use localhost for emulator, your machine's IP for physical device
EXPO_PUBLIC_API_URL=http://localhost:8000
```

```bash
# Start Expo dev server
pnpm --filter mobile dev
# or: npx expo start
```

Then:
- Press `a` to open Android emulator
- Press `i` to open iOS simulator (Mac only)
- Scan QR code with **Expo Go** app for physical device

---

## 5. Running Everything at Once (Recommended)

Turborepo can start all apps in parallel:

```bash
# From ALF root — starts web + mobile simultaneously
# (Backend must be started separately — it's Python, not JS)
pnpm dev
```

This runs the `dev` task defined in `turbo.json` across all JS workspaces.

**Recommended terminal layout:**
- Terminal 1: Backend (`python manage.py runserver`)
- Terminal 2: `pnpm dev` (web + mobile + shared in watch mode)

---

## 6. Building `@alf/shared`

The shared package must be built before web or mobile can use it.
`pnpm install` + `pnpm dev` handle this automatically via Turborepo.

To rebuild manually:
```bash
pnpm --filter @alf/shared build
```

To watch for changes during development:
```bash
pnpm --filter @alf/shared dev
```

---

## 7. Common Issues

### `@alf/shared` types not found
```bash
# Rebuild the shared package
pnpm --filter @alf/shared build
```

### Backend CORS errors in browser
Make sure `CORS_ALLOWED_ORIGINS` in `apps/backend/.env` includes `http://localhost:3000`.

### Mobile can't connect to backend on physical device
Change `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` from `localhost` to your machine's local IP:
```bash
# Find your IP:
ipconfig     # Windows
ifconfig     # Mac/Linux
```
Then set: `EXPO_PUBLIC_API_URL=http://192.168.X.X:8000`

### Port already in use
```bash
# Kill process on port 8000 (Windows):
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Database migration errors
```bash
cd apps/backend
python manage.py showmigrations   # see what's pending
python manage.py migrate --run-syncdb
```

---

## 8. Useful Commands

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Start all JS apps in dev mode |
| `pnpm build` | Build all apps (shared first, then web/mobile) |
| `pnpm lint` | Lint all workspaces |
| `pnpm --filter web dev` | Start only the web app |
| `pnpm --filter @alf/shared build` | Rebuild shared package |
| `python manage.py makemigrations` | Create new DB migrations |
| `python manage.py migrate` | Apply migrations |
| `python manage.py createsuperuser` | Create a Django admin user |
| `python manage.py test` | Run backend tests |

---

*Last updated: February 2026*
