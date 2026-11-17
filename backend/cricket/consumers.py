"""
WebSocket Consumers and Routing for Village Cricket Live.
Supports:
1. Django Channels AsyncJsonWebsocketConsumer (when `channels` is installed)
2. Native ASGI WebSocket handler with in-memory pub/sub queue (zero-dependency fallback)
Features:
- Match-specific broadcast groups (`match_<id>`) and global live ticker (`live_scores_global`)
- Authoritative initial state snapshot on connect/reconnect
- Heartbeat ping/pong support
"""
import asyncio
import json
from collections import defaultdict
from asgiref.sync import sync_to_async
from django.utils import timezone

from .models import Match
from .services import serialize_match_live_payload

# Native ASGI in-process subscriber queues for zero-dependency WebSocket broadcasting
_NATIVE_SUBSCRIBERS: dict[str, set[asyncio.Queue]] = defaultdict(set)


def publish_to_native_ws_subscribers(match_id: int, payload: dict) -> None:
    for group_key in (f"match_{match_id}", "live_scores_global"):
        queues = list(_NATIVE_SUBSCRIBERS.get(group_key, set()))
        for q in queues:
            try:
                q.put_nowait(payload)
            except Exception:
                pass


@sync_to_async
def get_match_snapshot(match_id: int) -> dict | None:
    match = Match.objects.filter(pk=match_id).first()
    if not match:
        return None
    return serialize_match_live_payload(match)


@sync_to_async
def get_live_matches_snapshot() -> list[dict]:
    matches = Match.objects.filter(
        status__in=[Match.STATUS_LIVE, Match.STATUS_INNINGS_BREAK, Match.STATUS_PAUSED]
    ).order_by("-updated_at")[:12]
    return [serialize_match_live_payload(m) for m in matches]


try:
    from channels.generic.websocket import AsyncJsonWebsocketConsumer

    class MatchScoreConsumer(AsyncJsonWebsocketConsumer):
        async def connect(self):
            self.match_id = int(self.scope["url_route"]["kwargs"]["match_id"])
            self.group_name = f"match_{self.match_id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()

            snapshot = await get_match_snapshot(self.match_id)
            await self.send_json(
                {
                    "type": "initial_snapshot",
                    "event_type": "connected",
                    "match": snapshot,
                    "timestamp": timezone.now().isoformat(),
                }
            )

        async def disconnect(self, close_code):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

        async def receive_json(self, content, **kwargs):
            action = content.get("action") or content.get("type")
            if action == "ping":
                await self.send_json(
                    {"type": "pong", "timestamp": timezone.now().isoformat()}
                )
            elif action == "resync":
                snapshot = await get_match_snapshot(self.match_id)
                await self.send_json(
                    {
                        "type": "resync_snapshot",
                        "match": snapshot,
                        "timestamp": timezone.now().isoformat(),
                    }
                )

        async def match_broadcast(self, event):
            await self.send_json(event)

    class GlobalLiveScoreConsumer(AsyncJsonWebsocketConsumer):
        async def connect(self):
            self.group_name = "live_scores_global"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
            matches = await get_live_matches_snapshot()
            await self.send_json(
                {
                    "type": "initial_live_list",
                    "matches": matches,
                    "timestamp": timezone.now().isoformat(),
                }
            )

        async def disconnect(self, close_code):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

        async def receive_json(self, content, **kwargs):
            if content.get("type") == "ping":
                await self.send_json({"type": "pong", "timestamp": timezone.now().isoformat()})

        async def match_broadcast(self, event):
            await self.send_json(event)

except ImportError:  # pragma: no cover
    MatchScoreConsumer = None
    GlobalLiveScoreConsumer = None


async def native_asgi_websocket_router(scope, receive, send):
    """Native ASGI WebSocket handler for environments running without channels installed."""
    path = scope.get("path", "")
    group_key = "live_scores_global"
    match_id = None
    parts = [p for p in path.strip("/").split("/") if p]
    if len(parts) >= 3 and parts[0] == "ws" and parts[1] == "matches" and parts[2].isdigit():
        match_id = int(parts[2])
        group_key = f"match_{match_id}"

    event = await receive()
    if event["type"] != "websocket.connect":
        return

    await send({"type": "websocket.accept"})

    if match_id is not None:
        snapshot = await get_match_snapshot(match_id)
        await send(
            {
                "type": "websocket.send",
                "text": json.dumps(
                    {
                        "type": "initial_snapshot",
                        "event_type": "connected",
                        "match": snapshot,
                        "timestamp": timezone.now().isoformat(),
                    }
                ),
            }
        )
    else:
        matches = await get_live_matches_snapshot()
        await send(
            {
                "type": "websocket.send",
                "text": json.dumps(
                    {
                        "type": "initial_live_list",
                        "matches": matches,
                        "timestamp": timezone.now().isoformat(),
                    }
                ),
            }
        )

    queue: asyncio.Queue = asyncio.Queue()
    _NATIVE_SUBSCRIBERS[group_key].add(queue)
    try:
        while True:
            recv_task = asyncio.create_task(receive())
            queue_task = asyncio.create_task(queue.get())
            done, pending = await asyncio.wait(
                {recv_task, queue_task}, return_when=asyncio.FIRST_COMPLETED
            )
            for p in pending:
                p.cancel()

            if recv_task in done:
                msg = recv_task.result()
                if msg["type"] == "websocket.disconnect":
                    break
                if msg["type"] == "websocket.receive":
                    try:
                        body = json.loads(msg.get("text") or "{}")
                    except Exception:
                        body = {}
                    if body.get("type") == "ping" or body.get("action") == "ping":
                        await send(
                            {
                                "type": "websocket.send",
                                "text": json.dumps(
                                    {"type": "pong", "timestamp": timezone.now().isoformat()}
                                ),
                            }
                        )
            if queue_task in done:
                payload = queue_task.result()
                await send({"type": "websocket.send", "text": json.dumps(payload)})
    finally:
        _NATIVE_SUBSCRIBERS[group_key].discard(queue)
