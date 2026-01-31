#!/usr/bin/env python3
from aiohttp import web

# Global stores for latest ingested data.
current_news_data = []


async def _read_json(request):
    try:
        return await request.json()
    except Exception:
        return None


def process_information(payload):
    # Placeholder for downstream processing logic.
    return None


async def sensor_information_in(request):
    data = await _read_json(request)
    return web.json_response({"ok": True, "received": data})


async def news_information_in(request):
    data = await _read_json(request)
    if data is not None:
        current_news_data.append(data)
        title = data.get("title") if isinstance(data, dict) else None
        description = data.get("description") if isinstance(data, dict) else None
        desc_snippet = (
            description[:80] if isinstance(description, str) else None
        )
        print(f"News received: title={title!r}, description_snippet={desc_snippet!r}")
    process_information(data)
    title = None
    timestamp = None
    description = None
    if isinstance(data, dict):
        title = data.get("title")
        timestamp = data.get("timestamp")
        description = data.get("description")
    return web.json_response(
        {
            "ok": True,
            "parsed": {
                "title": title,
                "timestamp": timestamp,
                "description": description,
            },
        }
    )


async def danger_entities_out(request):
    return web.json_response({"ok": True, "danger_entities": []})


def register_news_routes(app):
    app.router.add_post("/sensor_information_in", sensor_information_in)
    app.router.add_post("/news_information_in", news_information_in)
    app.router.add_get("/danger_entities_out", danger_entities_out)
