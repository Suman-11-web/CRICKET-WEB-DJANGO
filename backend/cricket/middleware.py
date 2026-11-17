"""
CORS, Security Headers, and API Token/Session Middleware for Village Cricket Live.
Ensures seamless cross-origin requests between Next.js (localhost:3000 / 127.0.0.1:3000) and Django (8000).
"""
from django.http import HttpResponse


class CorsAndSecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin", "")

        if request.method == "OPTIONS":
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        response["Access-Control-Allow-Origin"] = origin if origin else "*"
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Methods"] = (
            "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        )
        response["Access-Control-Allow-Headers"] = (
            "Accept, Authorization, Content-Type, X-CSRFToken, X-Requested-With, X-Admin-Session, X-Idempotency-Key"
        )
        if origin:
            response["Vary"] = "Origin"

        response["X-Content-Type-Options"] = "nosniff"
        response["X-Frame-Options"] = "DENY"
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response
