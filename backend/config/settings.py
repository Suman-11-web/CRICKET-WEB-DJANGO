import importlib.util
import os
from pathlib import Path
from django.core.management.utils import get_random_secret_key
from .app_config import *  # noqa: F401,F403

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_KEY", get_random_secret_key())
DEBUG = os.environ.get("DEBUG", "True").lower() in ("true", "1", "yes")
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver", "*"]

HAS_DRF = importlib.util.find_spec("rest_framework") is not None
HAS_CORS = importlib.util.find_spec("corsheaders") is not None
HAS_CHANNELS = importlib.util.find_spec("channels") is not None
HAS_SPECTACULAR = importlib.util.find_spec("drf_spectacular") is not None
HAS_DAPHNE = importlib.util.find_spec("daphne") is not None

INSTALLED_APPS = [
    *(["daphne"] if HAS_DAPHNE else []),
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    *(["corsheaders"] if HAS_CORS else []),
    *(["rest_framework"] if HAS_DRF else []),
    *(["drf_spectacular"] if HAS_SPECTACULAR else []),
    *(["channels"] if HAS_CHANNELS else []),
    "cricket.apps.CricketConfig",
]

MIDDLEWARE = [
    "cricket.middleware.CorsAndSecurityHeadersMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
