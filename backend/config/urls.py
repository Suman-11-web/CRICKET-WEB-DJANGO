"""
URL configuration for Village Cricket Live.
Exposes:
- /api/v1/ versioned REST API endpoints
- /api/v1/schema/ OpenAPI 3.0 JSON specification
- /api/v1/docs/ Interactive Swagger UI documentation
- /django-internal-admin/ (obscured fallback Django admin route)
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("django-internal-admin/", admin.site.urls),
    path("api/v1/", include("cricket.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
