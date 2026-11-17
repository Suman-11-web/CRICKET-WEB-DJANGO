"""
Celery configuration for Village Cricket Live.
Gracefully degrades to synchronous execution if Celery is not installed in local minimal environments.
"""
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

try:
    from celery import Celery

    app = Celery("village_cricket_live")
    app.config_from_object("django.conf:settings", namespace="CELERY")
    app.autodiscover_tasks()
except ImportError:  # pragma: no cover
    app = None
