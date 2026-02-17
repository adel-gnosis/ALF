# ALF — Environment Variables

This document describes every environment variable used across all ALF apps.
**Never commit real secrets.** Use `.env.example` files as templates.

---

## Quick Reference

| App | Env file location |
|-----|------------------|
| Backend (Django) | `apps/backend/.env` |
| Web (Next.js) | `apps/web/.env.local` |
| Mobile (Expo) | `apps/mobile/.env` |

---

## `apps/backend/.env`

Copy from `apps/backend/.env.example` to get started.

```bash
cp apps/backend/.env.example apps/backend/.env
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | ✅ | `django-insecure-key` | Django secret key. **Must be changed in production.** Generate with: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | ✅ | `True` | Set to `False` in production. Exposes stack traces when `True`. |
| `DATABASE_URL` | ✅ | `sqlite:///db.sqlite3` | Database connection. Dev uses SQLite. Prod uses PostgreSQL: `postgresql://user:pass@host:5432/alfdb` |
| `ALLOWED_HOSTS` | ✅ | `localhost,127.0.0.1` | Comma-separated list of allowed hostnames. Add your production domain here. |
| `CORS_ALLOWED_ORIGINS` | ✅ | `http://localhost:8081,...` | Comma-separated list of allowed frontend origins. In dev: `http://localhost:3000` (web) + `http://localhost:8081` (mobile/Expo). |
| `CORS_ALLOW_ALL_ORIGINS` | ⚠️ | `True` | Set to `False` in production. Only use `True` in dev for convenience. |
| `CORS_ALLOW_CREDENTIALS` | ✅ | `True` | Required for JWT cookies (if used). Keep `True`. |

### Example `.env` (development)

```env
DEBUG=True
SECRET_KEY=unsafe-secret-key-for-dev
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.235
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081,http://localhost:19006
CORS_ALLOW_ALL_ORIGINS=True
CORS_ALLOW_CREDENTIALS=True
```

### Example `.env` (production)

```env
DEBUG=False
SECRET_KEY=<long-random-secret-key>
DATABASE_URL=postgresql://alfuser:password@db.yourhost.com:5432/alfdb
ALLOWED_HOSTS=api.alf-platform.com
CORS_ALLOWED_ORIGINS=https://alf-platform.com,https://www.alf-platform.com
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOW_CREDENTIALS=True
```

---

## `apps/web/.env.local`

Next.js reads `.env.local` automatically. It is gitignored by default.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | `http://localhost:8000` | The Django backend API base URL. Prefix `NEXT_PUBLIC_` makes it available in the browser. Change for production. |

### Example `.env.local` (development)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Example `.env.local` (production)

```env
NEXT_PUBLIC_API_URL=https://api.alf-platform.com
```

> **Note:** `NEXT_PUBLIC_` variables are embedded in the JavaScript bundle at build time.
> They are visible to the browser. Never put secrets here.

---

## `apps/mobile/.env`

Expo reads environment variables via `app.config.js` or `expo-constants`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EXPO_PUBLIC_API_URL` | ✅ | `http://localhost:8000` | Django backend URL. Use your machine's local IP (e.g. `http://192.168.1.235:8000`) when testing on a physical device. `localhost` does not work on physical devices. |

### Example `.env` (development — emulator)

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

### Example `.env` (development — physical device)

```env
EXPO_PUBLIC_API_URL=http://192.168.1.235:8000
```

> **Tip:** Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find your machine's local IP.

---

## Security Rules

1. **Never commit** `.env`, `.env.local` to git. They are in `.gitignore`.
2. **Always commit** `.env.example` with placeholder values so new devs know what's needed.
3. **Rotate `SECRET_KEY`** if it is ever accidentally committed.
4. **Do not use** `CORS_ALLOW_ALL_ORIGINS=True` in production — it opens the API to any origin.
5. **JWT tokens** are stored in `localStorage` (web) — acceptable for an admin dashboard, but note this is accessible to JavaScript (XSS risk). Consider `httpOnly` cookies for higher security in future.

---

*Last updated: February 2026*
