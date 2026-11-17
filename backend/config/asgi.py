"""
ASGI config for Village Cricket Live.
Supports both HTTP and WebSocket connections via Django Channels or native ASGI WebSocket routing.
Routes:
- ws/matches/<int:match_id>/ — Real-time match scorecard & ball-by-ball updates
- ws/live-scores/ — Global live scores ticker & status updates
"""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django_asgi_app = get_asgi_application()

try:
    from channels.auth import AuthMiddlewareStack
    from channels.routing import ProtocolTypeRouter, URLRouter
    from cricket.routing import websocket_urlpatterns

    application = ProtocolTypeRouter(
        {
            "http": django_asgi_app,
            "websocket": AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
        }
    )
except ImportError:
    from cricket.consumers import native_asgi_websocket_router

    async def application(scope, receive, send):
        if scope["type"] == "http":
            await django_asgi_app(scope, receive, send)
        elif scope["type"] == "websocket":
            await native_asgi_websocket_router(scope, receive, send)
        else:
            raise NotImplementedError(f"Unsupported scope type {scope['type']}")
