"""
Role-Based Access Control (RBAC), Authentication Helpers, Login Rate Limiting,
and File Upload Validation for Village Cricket Live.
"""
from __future__ import annotations

import os
import secrets
from functools import wraps
from django.conf import settings
from django.core.cache import cache
from django.http import HttpRequest, JsonResponse

from .models import Match, Tournament, User


def resolve_authenticated_user(request: HttpRequest) -> User | None:
    """
    Resolves authenticated admin user via:
    1. Django session cookie (`request.user`)
    2. HTTP-only cookie `vcl_admin_session`
    3. Header `X-Admin-Session` or query param `admin_token` or `Authorization: Bearer <token>`
    """
    if hasattr(request, "user") and getattr(request.user, "is_authenticated", False):
        return request.user

    token = (
        request.COOKIES.get("vcl_admin_session")
        or request.headers.get("X-Admin-Session")
        or request.GET.get("admin_token")
        or ""
    ).strip()

    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.removeprefix("Bearer ").strip()

    if token:
        user = User.objects.filter(session_token=token, is_active=True).first()
        if user:
            request.user = user
            return user

    return None


def issue_user_session_token(user: User) -> str:
    token = secrets.token_urlsafe(36)
    user.session_token = token
    user.save(update_fields=["session_token"])
    return token


def require_roles(*allowed_roles: str):
    """
    Decorator enforcing server-side role-based access control.
    SUPER_ADMIN always has access.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped(request: HttpRequest, *args, **kwargs):
            user = resolve_authenticated_user(request)
            if not user:
                return JsonResponse(
                    {"error": "Authentication required.", "code": "UNAUTHENTICATED"},
                    status=401,
                )
            if allowed_roles and not user.has_role(*allowed_roles):
                return JsonResponse(
                    {
                        "error": f"Insufficient permissions. Required role: {', '.join(allowed_roles)}.",
                        "code": "FORBIDDEN",
                        "current_role": user.effective_role,
                    },
                    status=403,
                )
            return view_func(request, *args, **kwargs)

        return _wrapped

    return decorator


def user_can_score_match(user: User, match: Match) -> bool:
    if user.has_role(User.ROLE_SUPER_ADMIN, User.ROLE_TOURNAMENT_ADMIN):
        return True
    if user.effective_role == User.ROLE_SCORER:
        if match.assigned_scorer_id is None or match.assigned_scorer_id == user.id:
            return True
    return False


def user_can_manage_tournament(user: User, tournament: Tournament) -> bool:
    if user.has_role(User.ROLE_SUPER_ADMIN):
        return True
    if user.effective_role == User.ROLE_TOURNAMENT_ADMIN:
        if not tournament.managed_by.exists() or tournament.managed_by.filter(pk=user.id).exists():
            return True
    return False


def check_login_rate_limit(ip_address: str, username: str) -> tuple[bool, int]:
    """Rate limit login attempts: max 8 failed attempts per 10 minutes."""
    key = f"login_attempts:{ip_address}:{username.lower()}"
    attempts = cache.get(key, 0)
    if attempts >= 8:
        return False, attempts
    return True, attempts


def record_failed_login(ip_address: str, username: str) -> int:
    key = f"login_attempts:{ip_address}:{username.lower()}"
    attempts = cache.get(key, 0) + 1
    cache.set(key, attempts, timeout=600)
    return attempts


def reset_login_attempts(ip_address: str, username: str) -> None:
    key = f"login_attempts:{ip_address}:{username.lower()}"
    cache.delete(key)


def validate_uploaded_image(uploaded_file) -> tuple[bool, str]:
    max_size = getattr(settings, "MAX_UPLOAD_SIZE_BYTES", 5 * 1024 * 1024)
    allowed_exts = getattr(
        settings, "ALLOWED_IMAGE_EXTENSIONS", {".jpg", ".jpeg", ".png", ".webp", ".svg"}
    )
    if uploaded_file.size > max_size:
        return False, f"Image size exceeds maximum limit of {max_size // (1024 * 1024)} MB."
    _, ext = os.path.splitext(uploaded_file.name.lower())
    if ext not in allowed_exts:
        return False, f"Unsupported image extension '{ext}'. Allowed: {', '.join(sorted(allowed_exts))}."
    return True, ""
