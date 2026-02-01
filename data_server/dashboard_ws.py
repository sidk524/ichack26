#!/usr/bin/env python3
"""
WebSocket broadcast system for real-time dashboard updates.
Dashboards connect to /ws/dashboard and receive events when data changes.
"""
import json
import asyncio
from aiohttp import web
from typing import Set
from weakref import WeakSet

# Connected dashboard clients
_dashboard_clients: Set[web.WebSocketResponse] = set()
_lock = asyncio.Lock()


async def broadcast_event(event_type: str, data: dict):
    """Broadcast an event to all connected dashboard clients."""
    if not _dashboard_clients:
        return

    message = json.dumps({
        "type": event_type,
        "data": data
    })

    # Copy set to avoid modification during iteration
    async with _lock:
        clients = list(_dashboard_clients)

    disconnected = []
    for ws in clients:
        try:
            if not ws.closed:
                await ws.send_str(message)
        except Exception as e:
            print(f"[Dashboard WS] Error sending to client: {e}")
            disconnected.append(ws)

    # Remove disconnected clients
    if disconnected:
        async with _lock:
            for ws in disconnected:
                _dashboard_clients.discard(ws)


async def broadcast_new_call(user_id: str, call_data: dict):
    """Broadcast when a new emergency call is saved."""
    await broadcast_event("new_call", {
        "user_id": user_id,
        "call": call_data
    })
    print(f"[Dashboard WS] Broadcasted new_call for {user_id}")


async def broadcast_new_location(user_id: str, location_data: dict):
    """Broadcast when a new location is saved."""
    await broadcast_event("new_location", {
        "user_id": user_id,
        "location": location_data
    })


async def broadcast_new_news(article_data: dict):
    """Broadcast when a new news article is saved."""
    await broadcast_event("new_news", {
        "article": article_data
    })
    print(f"[Dashboard WS] Broadcasted new_news: {article_data.get('title', '')[:50]}")


async def broadcast_new_user(user_id: str, role: str):
    """Broadcast when a new user is created."""
    await broadcast_event("new_user", {
        "user_id": user_id,
        "role": role
    })


async def dashboard_ws_handler(request):
    """WebSocket endpoint for dashboard real-time updates."""
    ws = web.WebSocketResponse(heartbeat=30)
    await ws.prepare(request)

    # Register this client
    async with _lock:
        _dashboard_clients.add(ws)

    client_count = len(_dashboard_clients)
    print(f"[Dashboard WS] Client connected. Total clients: {client_count}")

    # Send welcome message with current client count
    try:
        await ws.send_json({
            "type": "connected",
            "data": {
                "message": "Connected to dashboard updates",
                "clients": client_count
            }
        })
    except Exception:
        pass

    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                # Handle ping/pong or other client messages
                try:
                    data = json.loads(msg.data)
                    if data.get("type") == "ping":
                        await ws.send_json({"type": "pong"})
                except Exception:
                    pass
            elif msg.type == web.WSMsgType.ERROR:
                print(f"[Dashboard WS] Connection error: {ws.exception()}")
                break
    finally:
        # Unregister this client
        async with _lock:
            _dashboard_clients.discard(ws)
        print(f"[Dashboard WS] Client disconnected. Total clients: {len(_dashboard_clients)}")

    return ws


def register_dashboard_routes(app: web.Application):
    """Register dashboard WebSocket routes."""
    app.router.add_get("/ws/dashboard", dashboard_ws_handler)
