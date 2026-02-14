from .base import *
from decouple import config

DATABASE_URL = config("DATABASE_URL", default=None)

if DATABASE_URL:
    import dj_database_url
    DATABASES = {
        "default": dj_database_url.parse(DATABASE_URL, conn_max_age=60)
    }
else:
    # fallback (not ideal for prod, but safe)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

DEBUG = config("DEBUG", default=False, cast=bool)


# --- Security / HTTPS hardening (Nginx terminates SSL) ---

# Tell Django it is behind a proxy that sets the original scheme
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Secure cookies over HTTPS only
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# HSTS (start small)
SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=3600, cast=int)  # 1 hour
SECURE_HSTS_INCLUDE_SUBDOMAINS = config("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=False, cast=bool)
SECURE_HSTS_PRELOAD = config("SECURE_HSTS_PRELOAD", default=False, cast=bool)
