#!/usr/bin/env python3
import json
import time
import uuid
import asyncio
from aiohttp import web
from typing import Set

from database.postgres import save_news, list_news, list_extracted_entities, list_danger_zones
from database.db import NewsArticle
from dashboard_ws import broadcast_new_news
from danger_extractor import extract_danger_from_news


# Connected danger zone WebSocket clients
_danger_zone_clients: Set[web.WebSocketResponse] = set()
_danger_zone_lock = asyncio.Lock()
_broadcast_task = None


async def print_news_table():
    news = await list_news()
    print(f"\n=== NEWS ARTICLES TABLE ({len(news)} articles) ===")
    print(json.dumps(news, indent=2, default=str))
    print("=" * 40)


async def _read_json(request):
    try:
        return await request.json()
    except Exception:
        return None


async def sensor_information_in(request):
    data = await _read_json(request)
    return web.json_response({"ok": True, "received": data})


async def news_information_in(request):
    data = await _read_json(request)
    if not isinstance(data, dict):
        return web.json_response({"ok": False, "error": "Invalid JSON"}, status=400)

    # Extract fields from incoming format
    title = data.get("title", "")
    link = data.get("link", "")
    pub_date = data.get("pubDate", "")
    disaster = data.get("disaster", False)
    location = data.get("location", {})
    location_name = location.get("name", "") if isinstance(location, dict) else ""
    lat = location.get("lat") if isinstance(location, dict) else None
    lon = location.get("long") if isinstance(location, dict) else None  # Note: "long" in input

    # Create and save news article
    article = NewsArticle(
        article_id=uuid.uuid4().hex,
        link=link,
        title=title,
        pub_date=pub_date,
        disaster=disaster,
        location_name=location_name,
        lat=lat,
        lon=lon,
        received_at=time.time(),
    )

    try:
        await save_news(article)
        print(f"News saved: {title[:50]}..." if len(title) > 50 else f"News saved: {title}")
        await print_news_table()
        # Broadcast to dashboards
        await broadcast_new_news({
            "article_id": article.article_id,
            "title": article.title,
            "link": article.link,
            "pub_date": article.pub_date,
            "disaster": article.disaster,
            "location_name": article.location_name,
            "lat": article.lat,
            "lon": article.lon,
            "received_at": article.received_at,
        })
        # Extract danger zone in background (don't block response)
        # Note: extract_danger_from_news expects (article_id, title, content)
        # For now, pass title as content since we don't have full content
        asyncio.create_task(
            extract_danger_from_news(
                article.article_id,
                article.title,
                article.title  # Using title as content for now
            )
        )
    except Exception as e:
        print(f"Error saving news: {e}")
        return web.json_response({"ok": False, "error": str(e)}, status=500)

    return web.json_response({
        "ok": True,
        "article_id": article.article_id,
    })


async def danger_entities_out(request):
    """GET /danger_entities_out - Retrieve all extracted entities."""
    try:
        entities = await list_extracted_entities()
        return web.json_response({"ok": True, "danger_entities": entities})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def danger_zones_out(request):
    """GET /danger_zones_out - Retrieve all active danger zones."""
    try:
        zones = await list_danger_zones()
        return web.json_response({"ok": True, "danger_zones": zones})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


# === Danger Zones WebSocket ===

async def _broadcast_danger_zones_loop():
    """Background task that broadcasts danger zones to all clients every second."""
    while True:
        try:
            await asyncio.sleep(1)

            if not _danger_zone_clients:
                continue

            # Fetch current danger zones
            zones = await list_danger_zones()
            message = json.dumps({
                "type": "danger_zones",
                "timestamp": time.time(),
                "danger_zones": zones
            })

            # Broadcast to all connected clients
            async with _danger_zone_lock:
                clients = list(_danger_zone_clients)

            disconnected = []
            for ws in clients:
                try:
                    if not ws.closed:
                        await ws.send_str(message)
                except Exception as e:
                    print(f"[DangerZones WS] Error sending to client: {e}")
                    disconnected.append(ws)

            # Remove disconnected clients
            if disconnected:
                async with _danger_zone_lock:
                    for ws in disconnected:
                        _danger_zone_clients.discard(ws)

        except Exception as e:
            print(f"[DangerZones WS] Broadcast loop error: {e}")


async def danger_zones_ws_handler(request):
    """WebSocket endpoint for real-time danger zone updates (every second)."""
    global _broadcast_task

    ws = web.WebSocketResponse(heartbeat=30)
    await ws.prepare(request)

    # Start broadcast task if not running
    if _broadcast_task is None or _broadcast_task.done():
        _broadcast_task = asyncio.create_task(_broadcast_danger_zones_loop())
        print("[DangerZones WS] Started broadcast loop")

    # Register this client
    async with _danger_zone_lock:
        _danger_zone_clients.add(ws)

    client_count = len(_danger_zone_clients)
    print(f"[DangerZones WS] Client connected. Total clients: {client_count}")

    # Send initial danger zones immediately
    try:
        zones = await list_danger_zones()
        await ws.send_json({
            "type": "danger_zones",
            "timestamp": time.time(),
            "danger_zones": zones
        })
    except Exception as e:
        print(f"[DangerZones WS] Error sending initial data: {e}")

    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                # Handle ping/pong
                try:
                    data = json.loads(msg.data)
                    if data.get("type") == "ping":
                        await ws.send_json({"type": "pong"})
                except Exception:
                    pass
            elif msg.type == web.WSMsgType.ERROR:
                print(f"[DangerZones WS] Connection error: {ws.exception()}")
                break
    finally:
        # Unregister this client
        async with _danger_zone_lock:
            _danger_zone_clients.discard(ws)
        print(f"[DangerZones WS] Client disconnected. Total clients: {len(_danger_zone_clients)}")

    return ws


def register_news_routes(app):
    app.router.add_post("/sensor_information_in", sensor_information_in)
    app.router.add_post("/news_information_in", news_information_in)
    app.router.add_get("/danger_entities_out", danger_entities_out)
    app.router.add_get("/danger_zones_out", danger_zones_out)
    # WebSocket for real-time danger zones (every second)
    app.router.add_get("/ws/danger_zones", danger_zones_ws_handler)
