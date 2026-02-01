#!/usr/bin/env python3
import json
import time
import uuid
import asyncio
from aiohttp import web

from database.postgres import ensure_user_exists, append_location, append_call, list_users, get_user
from database.db import LocationPoint, Call
from dashboard_ws import broadcast_new_call, broadcast_new_location
from tag_extractor import extract_bilingual_tags
from danger_extractor import extract_danger_from_call


async def print_users_table():
    users = await list_users()
    print(f"\n=== USERS TABLE ({len(users)} users) ===")
    print(json.dumps(users, indent=2, default=str))
    print("=" * 40)


async def phone_transcript_ws(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    call_start_time = time.time()
    user_id = None
    partial_texts = []  # Collect texts in case of sudden disconnect

    async for msg in ws:
        if msg.type == web.WSMsgType.TEXT:
            try:
                data = json.loads(msg.data)
            except Exception:
                data = None
            if isinstance(data, dict):
                user_id = data.get("user_id")
                if not user_id:
                    continue

                # Extract from nested structure: data.transcript.text / data.transcript.is_final
                transcript_data = data.get("data", {}).get("transcript", {})
                text = transcript_data.get("text", "")
                is_final = transcript_data.get("is_final", False)

                if is_final is True:
                    # Save completed call to database
                    await ensure_user_exists(user_id)

                    # Extract tags from transcript
                    tags = extract_bilingual_tags(text, num_tags=3)

                    call = Call(
                        call_id=uuid.uuid4().hex,
                        transcript=text,
                        start_time=call_start_time,
                        end_time=time.time(),
                        tags=tags
                    )
                    await append_call(user_id, call)
                    print(f"Call saved for user {user_id} with tags: {tags}")
                    await print_users_table()
                    # Broadcast to dashboards
                    await broadcast_new_call(user_id, {
                        "call_id": call.call_id,
                        "transcript": call.transcript,
                        "start_time": call.start_time,
                        "end_time": call.end_time,
                        "tags": call.tags
                    })
                    # Extract danger zone in background (don't block response)
                    asyncio.create_task(
                        extract_danger_from_call(call.call_id, text, user_id)
                    )
                    await ws.close()
                else:
                    # Store partial text in case of sudden disconnect
                    partial_texts.append(text)
                    print(f"Transcript chunk received for {user_id}: {text[:50]}...")
            else:
                pass
        elif msg.type == web.WSMsgType.BINARY:
            pass
        elif msg.type == web.WSMsgType.ERROR:
            break

    # If websocket closed without is_final, save concatenated partial texts
    if user_id and partial_texts:
        await ensure_user_exists(user_id)
        full_transcript = " ".join(partial_texts)

        # Extract tags from transcript
        tags = extract_bilingual_tags(full_transcript, num_tags=3)

        call = Call(
            call_id=uuid.uuid4().hex,
            transcript=full_transcript,
            start_time=call_start_time,
            end_time=time.time(),
            tags=tags
        )
        await append_call(user_id, call)
        print(f"Call saved on disconnect for user {user_id} with tags: {tags}")
        await print_users_table()
        # Broadcast to dashboards
        await broadcast_new_call(user_id, {
            "call_id": call.call_id,
            "transcript": call.transcript,
            "start_time": call.start_time,
            "end_time": call.end_time,
            "tags": call.tags
        })
        # Extract danger zone in background (don't block response)
        asyncio.create_task(
            extract_danger_from_call(call.call_id, full_transcript, user_id)
        )

    return ws


async def phone_location_ws(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    user_id = None
 
    async for msg in ws:
        if msg.type == web.WSMsgType.TEXT:
            try:
                data = json.loads(msg.data)
            except Exception:
                data = None
            if isinstance(data, dict):
                user_id = data.get("user_id")
                if not user_id:
                    continue
                # Ensure user exists and append location
                await ensure_user_exists(user_id)
                location = LocationPoint(
                    lat=data.get("lat"),
                    lon=data.get("lon"),
                    timestamp=data.get("timestamp", time.time()),
                    accuracy=data.get("accuracy", 0.0),
                )
                await append_location(user_id, location)
                print(f"Location saved for {user_id}: {location}")
                await print_users_table()
                # Broadcast to dashboards
                await broadcast_new_location(user_id, {
                    "lat": location.lat,
                    "lon": location.lon,
                    "timestamp": location.timestamp,
                    "accuracy": location.accuracy,
                })
            else:
                pass
        elif msg.type == web.WSMsgType.BINARY:
            pass
        elif msg.type == web.WSMsgType.ERROR:
            break

    return ws


def register_phone_routes(app):
    app.router.add_get("/phone_transcript_in", phone_transcript_ws)
    app.router.add_get("/phone_location_in", phone_location_ws)
