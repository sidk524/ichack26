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
from status_inference import infer_civilian_status, infer_responder_status


async def process_location_message(user_id: str, data: dict):
    """Process a single location message."""
    await ensure_user_exists(user_id)
    location = LocationPoint(
        lat=data.get("lat"),
        lon=data.get("lon"),
        timestamp=data.get("timestamp", time.time()),
        accuracy=data.get("accuracy", 0.0),
    )
    await append_location(user_id, location)
    print(f"Location saved for {user_id}: {location}")

    # Broadcast to dashboards
    await broadcast_new_location(user_id, {
        "lat": location.lat,
        "lon": location.lon,
        "timestamp": location.timestamp,
        "accuracy": location.accuracy,
    })

    # Trigger status inference for both roles
    user = await get_user(user_id)
    if user:
        if user.role == 'civilian':
            asyncio.create_task(infer_civilian_status(user_id))
        elif user.role == 'first_responder':
            asyncio.create_task(infer_responder_status(user_id))


async def process_transcript_message(user_id: str, transcript_data: dict, call_start_time: float, partial_texts: list):
    """
    Process a single transcript message.
    Returns (is_final, call) tuple - is_final indicates if call was completed.
    """
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

        # Trigger status inference (civilian only, as calls are from civilians)
        asyncio.create_task(infer_civilian_status(user_id))

        return True, call
    else:
        # Store partial text in case of sudden disconnect
        partial_texts.append(text)
        print(f"Transcript chunk received for {user_id}: {text[:50]}...")
        return False, None


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

            # Handle both single messages and batch arrays
            if isinstance(data, list):
                messages = data
                print(f"Processing batch of {len(messages)} transcript messages")
            elif isinstance(data, dict):
                messages = [data]
            else:
                continue

            for message in messages:
                try:
                    if not isinstance(message, dict):
                        continue

                    msg_user_id = message.get("user_id")
                    if not msg_user_id:
                        continue

                    # Track user_id for fallback save on disconnect
                    user_id = msg_user_id

                    # Extract from nested structure: data.transcript.text / data.transcript.is_final
                    transcript_data = message.get("data", {}).get("transcript", {})

                    is_final, call = await process_transcript_message(
                        msg_user_id, transcript_data, call_start_time, partial_texts
                    )

                    if is_final:
                        await print_users_table()
                        await ws.close()
                        return ws

                except Exception as e:
                    print(f"Error processing transcript message: {e}")
                    continue

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
        # Trigger status inference (civilian only, as calls are from civilians)
        asyncio.create_task(infer_civilian_status(user_id))

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

            # Handle both single messages and batch arrays
            if isinstance(data, list):
                messages = data
                print(f"Processing batch of {len(messages)} location messages")
            elif isinstance(data, dict):
                messages = [data]
            else:
                continue

            for message in messages:
                try:
                    if not isinstance(message, dict):
                        continue

                    user_id = message.get("user_id")
                    if not user_id:
                        continue

                    await process_location_message(user_id, message)

                except Exception as e:
                    print(f"Error processing location message: {e}")
                    continue

            # Print users table after processing batch
            await print_users_table()

        elif msg.type == web.WSMsgType.BINARY:
            pass
        elif msg.type == web.WSMsgType.ERROR:
            break

    return ws


def register_phone_routes(app):
    app.router.add_get("/phone_transcript_in", phone_transcript_ws)
    app.router.add_get("/phone_location_in", phone_location_ws)
