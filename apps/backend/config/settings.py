import os

# Default to dev so local continues to work out of the box
default_module = "config.settings.dev"

module = os.environ.get("DJANGO_SETTINGS_MODULE", default_module)
__import__(module)

# Re-export everything
from importlib import import_module
_settings = import_module(module)

globals().update({k: getattr(_settings, k) for k in dir(_settings) if k.isupper()})
