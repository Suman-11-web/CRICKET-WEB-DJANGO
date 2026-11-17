"""WebSocket URL routing for Django Channels."""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = (
    [
        re_path(r"^ws/matches/(?P<match_id>\d+)/?$", consumers.MatchScoreConsumer.as_asgi()),
        re_path(r"^ws/live-scores/?$", consumers.GlobalLiveScoreConsumer.as_asgi()),
    ]
    if getattr(consumers, "MatchScoreConsumer", None) is not None
    else []
)
