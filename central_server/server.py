#!/usr/bin/env python3
import json
from aiohttp import web

HOST = "0.0.0.0"
PORT = 8000

# Global stores for latest ingested data.
current_phone_data = []
current_news_data = []

async def phone_client_ws(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    async for msg in ws:
        if msg.type == web.WSMsgType.TEXT:
            try:
                data = json.loads(msg.data)
            except Exception:
                data = None
            if isinstance(data, dict):
                # Use the nested dict directly for lookups like:
                # data["data"]["transcript"]["is_final"]
                _ = data
            else:
                # Ignore invalid JSON payloads; no response required.
                pass
        elif msg.type == web.WSMsgType.BINARY:
            # Ignore binary frames; no response required.
            pass
        elif msg.type == web.WSMsgType.ERROR:
            break
    return ws

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


def create_app():
    app = web.Application()

    # WebSocket for live streaming text.
    app.router.add_get("/phone_client_in", phone_client_ws)

    app.router.add_post("/sensor_information_in", sensor_information_in)
    app.router.add_post("/news_information_in", news_information_in)
    app.router.add_get("/danger_entities_out", danger_entities_out)

    return app


if __name__ == "__main__":
    web.run_app(create_app(), host=HOST, port=PORT)
