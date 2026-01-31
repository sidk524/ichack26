#!/usr/bin/env python3
import json
from aiohttp import web

# Global stores for latest ingested data.
current_phone_data = dict()
current_phone_location = dict()


async def phone_transcript_ws(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    async for msg in ws:
        if msg.type == web.WSMsgType.TEXT:
            try:
                data = json.loads(msg.data)
            except Exception:
                data = None
            if isinstance(data, dict):
                client_id = data.get("client_id")
                if not client_id:
                    continue
                # Use the nested dict directly for lookups like:
                # data["data"]["transcript"]["is_final"]
                payload = data.get("data") if isinstance(data.get("data"), dict) else None
                transcript = None
                if payload:
                    transcript = (
                        payload.get("transcript")
                        if isinstance(payload.get("transcript"), dict)
                        else None
                    )
                if transcript:
                    print(f"Transcript received: {transcript}")
                is_final = transcript.get("is_final") if transcript else False
                if is_final is True:
                    current_phone_data.setdefault(client_id, []).append(data)
                    await ws.close()
            else:
                # Ignore invalid JSON payloads; no response required.
                pass
        elif msg.type == web.WSMsgType.BINARY:
            # Ignore binary frames; no response required.
            pass
        elif msg.type == web.WSMsgType.ERROR:
            break
    return ws


async def phone_location_ws(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    async for msg in ws:
        if msg.type == web.WSMsgType.TEXT:
            try:
                data = json.loads(msg.data)
            except Exception:
                data = None
            if isinstance(data, dict):
                client_id = data.get("client_id")
                if not client_id:
                    continue
                current_phone_location.setdefault(client_id, []).append(data)
                print(f"Location received for {client_id}: {data}")
            else:
                # Ignore invalid JSON payloads; no response required.
                pass
        elif msg.type == web.WSMsgType.BINARY:
            # Ignore binary frames; no response required.
            pass
        elif msg.type == web.WSMsgType.ERROR:
            break
    return ws


def register_phone_routes(app):
    app.router.add_get("/phone_transcript_in", phone_transcript_ws)
    app.router.add_get("/phone_location_in", phone_location_ws)
