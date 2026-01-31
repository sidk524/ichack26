#!/usr/bin/env python3
"""
Mock server for testing the phone client with WebSocket support.

Implements SCHEMA.md for real-time bidirectional communication:
- WebSocket endpoint: /ws/call/{person_id}
- HTTP fallback endpoints for summary/status

Run this standalone server:
    python mock_server.py

Then open http://localhost:3000 for the phone client
(run: python -m http.server 3000 in the phone_client directory)
"""

from datetime import datetime
from typing import Optional
import json
import logging
import uuid
import asyncio

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Emergency Call Mock Server (WebSocket)",
    description="Mock server with WebSocket support for emergency call phone client",
    version="2.0.0",
)

# Add CORS for browser client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
_callers: dict[str, dict] = {}  # person_id -> caller data
_connections: dict[str, WebSocket] = {}  # person_id -> active websocket


class LocationData(BaseModel):
    lat: float
    lng: float
    altitude: Optional[float] = None
    accuracy: Optional[float] = None
    altitude_accuracy: Optional[float] = None
    heading: Optional[float] = None
    speed: Optional[float] = None
    timestamp: Optional[str] = None
    source: Optional[str] = None


# ==================== HELPER FUNCTIONS ====================

def generate_message_id(prefix: str = "msg") -> str:
    return f"{prefix}_{uuid.uuid4()}"


def create_chunk_ack(person_id: str, chunk_index: int) -> dict:
    """Create chunk_ack message per SCHEMA.md"""
    return {
        "type": "chunk_ack",
        "message_id": generate_message_id("ack"),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": {
            "person_id": person_id,
            "chunk_index": chunk_index,
            "status": "received"
        }
    }


def create_extracted_info(person_id: str, transcript: str) -> dict:
    """Create extracted_info message by analyzing transcript (mock LLM)"""
    # Simple keyword-based extraction (mock LLM analysis)
    text_lower = transcript.lower()

    disaster_type = "unknown"
    severity = "unknown"
    location = None
    hazards = []
    resources_needed = []

    # Detect disaster type
    if "fire" in text_lower:
        disaster_type = "fire"
        hazards.append("fire")
        resources_needed.append("fire_truck")
    elif "flood" in text_lower:
        disaster_type = "flood"
        hazards.append("flooding")
    elif "earthquake" in text_lower:
        disaster_type = "earthquake"
        hazards.append("structural_damage")
    elif "accident" in text_lower or "crash" in text_lower:
        disaster_type = "accident"
        resources_needed.append("ambulance")
    elif "explosion" in text_lower:
        disaster_type = "explosion"
        hazards.extend(["fire", "debris"])
        resources_needed.extend(["fire_truck", "ambulance"])

    # Detect severity
    if any(word in text_lower for word in ["critical", "emergency", "urgent", "dying", "trapped"]):
        severity = "critical"
    elif any(word in text_lower for word in ["serious", "severe", "major", "bad"]):
        severity = "high"
    elif any(word in text_lower for word in ["minor", "small"]):
        severity = "low"
    else:
        severity = "moderate"

    # Try to extract location from text (very basic)
    location_keywords = ["at", "on", "near", "in"]
    for kw in location_keywords:
        if f" {kw} " in text_lower:
            idx = text_lower.find(f" {kw} ")
            location = transcript[idx:idx+50].strip()
            break

    # Detect injuries
    injuries = 0
    trapped = 0
    if "injur" in text_lower or "hurt" in text_lower:
        injuries = 1
        resources_needed.append("ambulance")
    if "trapped" in text_lower or "stuck" in text_lower:
        trapped = 1

    return {
        "type": "extracted_info",
        "message_id": generate_message_id("ext"),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": {
            "person_id": person_id,
            "extraction": {
                "location": location,
                "location_details": None,
                "disaster_type": disaster_type,
                "severity": severity,
                "injuries_reported": injuries,
                "people_trapped": trapped,
                "hazards": hazards,
                "resources_needed": list(set(resources_needed)),
                "confidence": 0.75 if disaster_type != "unknown" else 0.3
            }
        }
    }


def create_summary_update() -> dict:
    """Create summary_update message aggregating all callers"""
    total_callers = len(_callers)
    active_callers = len(_connections)

    # Aggregate data
    all_disasters = set()
    total_injuries = 0
    total_trapped = 0
    max_severity = "unknown"
    severity_order = {"unknown": 0, "low": 1, "moderate": 2, "high": 3, "critical": 4}
    key_findings = []

    for person_id, caller in _callers.items():
        if "extraction" in caller:
            ext = caller["extraction"]
            if ext.get("disaster_type") and ext["disaster_type"] != "unknown":
                all_disasters.add(ext["disaster_type"])
            if ext.get("injuries_reported"):
                total_injuries += ext["injuries_reported"]
            if ext.get("people_trapped"):
                total_trapped += ext["people_trapped"]
            if ext.get("severity"):
                if severity_order.get(ext["severity"], 0) > severity_order.get(max_severity, 0):
                    max_severity = ext["severity"]

    # Generate key findings
    if all_disasters:
        key_findings.append(f"Reports of {', '.join(all_disasters)}")
    if total_injuries > 0:
        key_findings.append(f"{total_injuries} injuries reported")
    if total_trapped > 0:
        key_findings.append(f"{total_trapped} people trapped")
    if active_callers > 0:
        key_findings.append(f"{active_callers} active calls in progress")

    return {
        "type": "summary_update",
        "message_id": generate_message_id("sum"),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": {
            "summary": {
                "total_callers": total_callers,
                "active_callers": active_callers,
                "overall_severity": max_severity,
                "disaster_types": list(all_disasters),
                "total_injuries": total_injuries,
                "total_trapped": total_trapped,
                "affected_areas": [],  # Would need location clustering
                "key_findings": key_findings,
                "narrative_summary": f"Active emergency situation with {total_callers} caller(s). " +
                    (f"Primary concern: {list(all_disasters)[0]}. " if all_disasters else "") +
                    f"Severity level: {max_severity}."
            }
        }
    }


def create_heartbeat_ack() -> dict:
    """Create heartbeat_ack message"""
    return {
        "type": "heartbeat_ack",
        "message_id": generate_message_id("hb_ack"),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": {
            "server_time": datetime.utcnow().isoformat() + "Z"
        }
    }


def create_error(code: str, message: str, original_message_id: str = None) -> dict:
    """Create error message"""
    return {
        "type": "error",
        "message_id": generate_message_id("err"),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": {
            "code": code,
            "message": message,
            "original_message_id": original_message_id
        }
    }


async def broadcast_summary():
    """Broadcast summary update to all connected clients"""
    summary = create_summary_update()
    for person_id, ws in list(_connections.items()):
        try:
            await ws.send_json(summary)
        except Exception as e:
            logger.error(f"Failed to send summary to {person_id[:8]}: {e}")


# ==================== WEBSOCKET ENDPOINT ====================

@app.websocket("/ws/call/{person_id}")
async def websocket_call(websocket: WebSocket, person_id: str):
    """
    WebSocket endpoint for emergency calls.
    Implements SCHEMA.md message protocol.
    """
    await websocket.accept()
    _connections[person_id] = websocket

    # Initialize caller data
    if person_id not in _callers:
        _callers[person_id] = {
            "person_id": person_id,
            "connected_at": datetime.utcnow().isoformat(),
            "chunks": [],
            "chunk_count": 0,
            "last_location": None,
            "extraction": None,
        }

    print(f"\n{'='*60}")
    print(f"🔌 WEBSOCKET CONNECTED: {person_id[:8]}...")
    print(f"{'='*60}")

    # Send connection acknowledgment
    await websocket.send_json({
        "type": "connection_ack",
        "message_id": generate_message_id("ack"),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": {"person_id": person_id}
    })

    try:
        while True:
            # Receive message
            data = await websocket.receive_json()
            msg_type = data.get("type")
            msg_id = data.get("message_id")
            msg_data = data.get("data", {})

            print(f"\n📨 Received: {msg_type}")

            if msg_type == "call_start":
                # Handle call_start
                print(f"   🆕 Call started from {person_id[:8]}...")
                if msg_data.get("device"):
                    print(f"   📱 Device: {msg_data['device'].get('platform')} / {msg_data['device'].get('browser')}")
                if msg_data.get("initial_location"):
                    loc = msg_data["initial_location"]
                    print(f"   📍 Initial location: {loc.get('lat'):.6f}, {loc.get('lng'):.6f}")
                    _callers[person_id]["last_location"] = loc

                # Broadcast updated summary
                await broadcast_summary()

            elif msg_type == "transcript_chunk":
                # Handle transcript_chunk
                chunk_index = msg_data.get("chunk_index", 0)
                transcript = msg_data.get("transcript", {})
                text = transcript.get("text", "")
                is_final = transcript.get("is_final", False)
                location = msg_data.get("location")
                elevenlabs = msg_data.get("elevenlabs", {})

                print(f"\n{'='*60}")
                print(f"📞 TRANSCRIPT #{chunk_index}")
                print(f"{'='*60}")
                print(f"🆔 Caller: {person_id[:8]}...")
                print(f"💬 Text: \"{text}\"")
                print(f"   Final: {is_final}")
                if elevenlabs.get("conversation_id"):
                    print(f"   ElevenLabs Conv: {elevenlabs['conversation_id'][:8]}...")
                if location:
                    print(f"📍 Location: {location.get('lat'):.6f}, {location.get('lng'):.6f}")
                    if location.get('accuracy'):
                        print(f"   Accuracy: ±{location['accuracy']:.0f}m")
                    if location.get('altitude'):
                        print(f"   Altitude: {location['altitude']:.1f}m")
                    if location.get('speed'):
                        print(f"   Speed: {location['speed']:.1f}m/s")
                    if location.get('heading'):
                        print(f"   Heading: {location['heading']:.0f}°")
                    _callers[person_id]["last_location"] = location
                print(f"{'='*60}")

                # Store chunk
                _callers[person_id]["chunks"].append({
                    "chunk_index": chunk_index,
                    "transcript": text,
                    "is_final": is_final,
                    "location": location,
                    "timestamp": data.get("timestamp"),
                })
                _callers[person_id]["chunk_count"] = chunk_index + 1

                # Send chunk acknowledgment
                ack = create_chunk_ack(person_id, chunk_index)
                await websocket.send_json(ack)

                # If we have meaningful text, do mock LLM extraction
                if text and len(text) > 10 and is_final:
                    extracted = create_extracted_info(person_id, text)
                    _callers[person_id]["extraction"] = extracted["data"]["extraction"]
                    await websocket.send_json(extracted)
                    print(f"   🧠 Extracted: {extracted['data']['extraction']['disaster_type']}, severity: {extracted['data']['extraction']['severity']}")

                    # Broadcast updated summary
                    await broadcast_summary()

            elif msg_type == "agent_response":
                # Handle agent_response (AI speaking)
                agent = msg_data.get("agent", {})
                text = agent.get("text", "")
                print(f"   🤖 Agent said: \"{text[:50]}...\"" if len(text) > 50 else f"   🤖 Agent said: \"{text}\"")

            elif msg_type == "location_update":
                # Handle location_update
                location = msg_data.get("location")
                movement = msg_data.get("movement")
                if location:
                    _callers[person_id]["last_location"] = location
                    print(f"   📍 Location update: {location.get('lat'):.6f}, {location.get('lng'):.6f}")
                    if movement:
                        print(f"   🚶 Movement: {movement.get('total_distance', 0):.1f}m traveled")

            elif msg_type == "call_end":
                # Handle call_end
                duration = msg_data.get("duration_seconds", 0)
                total_chunks = msg_data.get("total_chunks", 0)

                print(f"\n{'#'*60}")
                print(f"📴 CALL ENDED: {person_id[:8]}...")
                print(f"{'#'*60}")
                print(f"   Duration: {duration}s")
                print(f"   Total chunks: {total_chunks}")

                # Print full transcript
                if person_id in _callers:
                    chunks = _callers[person_id].get("chunks", [])
                    full_text = " ".join([c["transcript"] for c in chunks if c.get("transcript")])
                    print(f"\n📝 FULL TRANSCRIPT:")
                    print(f"   \"{full_text}\"")

                    if _callers[person_id].get("extraction"):
                        ext = _callers[person_id]["extraction"]
                        print(f"\n🧠 EXTRACTED INFO:")
                        print(f"   Type: {ext.get('disaster_type')}")
                        print(f"   Severity: {ext.get('severity')}")
                        if ext.get("location"):
                            print(f"   Location: {ext['location']}")

                print(f"{'#'*60}\n")

                # Broadcast updated summary
                await broadcast_summary()
                break

            elif msg_type == "heartbeat":
                # Handle heartbeat
                ack = create_heartbeat_ack()
                await websocket.send_json(ack)

            else:
                # Unknown message type
                print(f"   ⚠️ Unknown message type: {msg_type}")
                error = create_error("UNKNOWN_MESSAGE", f"Unknown message type: {msg_type}", msg_id)
                await websocket.send_json(error)

    except WebSocketDisconnect:
        print(f"\n🔌 WEBSOCKET DISCONNECTED: {person_id[:8]}...")
    except Exception as e:
        print(f"\n❌ WEBSOCKET ERROR: {e}")
        logger.exception("WebSocket error")
    finally:
        # Cleanup
        if person_id in _connections:
            del _connections[person_id]
        # Broadcast updated summary
        await broadcast_summary()


# ==================== HTTP ENDPOINTS ====================

@app.get("/")
async def root():
    return {
        "name": "Emergency Call Mock Server (WebSocket)",
        "version": "2.0.0",
        "protocol": "SCHEMA.md",
        "endpoints": {
            "WS /ws/call/{person_id}": "WebSocket connection for calls",
            "GET /health": "Health check",
            "GET /summary": "Get disaster summary",
            "GET /caller/{person_id}": "Get caller data",
            "GET /callers": "List all callers",
            "GET /status": "Get system status",
        },
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "active_connections": len(_connections),
        "total_callers": len(_callers),
    }


@app.get("/summary")
async def get_summary():
    """Get disaster summary (HTTP fallback for polling)"""
    summary = create_summary_update()
    return summary["data"]["summary"]


@app.get("/caller/{person_id}")
async def get_caller(person_id: str):
    """Get caller data"""
    if person_id not in _callers:
        raise HTTPException(status_code=404, detail="Caller not found")

    caller = _callers[person_id]
    return {
        "person_id": person_id,
        "connected_at": caller.get("connected_at"),
        "chunk_count": caller.get("chunk_count", 0),
        "last_location": caller.get("last_location"),
        "extracted_info": caller.get("extraction"),
        "is_active": person_id in _connections,
    }


@app.get("/callers")
async def list_callers():
    """List all callers"""
    return {
        "total": len(_callers),
        "active": len(_connections),
        "callers": [
            {
                "person_id": pid,
                "chunk_count": c.get("chunk_count", 0),
                "is_active": pid in _connections,
            }
            for pid, c in _callers.items()
        ]
    }


@app.get("/status")
async def get_status():
    """Get system status"""
    return {
        "status": "operational",
        "active_connections": len(_connections),
        "total_callers": len(_callers),
        "server_time": datetime.utcnow().isoformat() + "Z",
    }


# ==================== LEGACY HTTP ENDPOINTS (for backwards compat) ====================

class VoiceTranscriptionRequest(BaseModel):
    person_id: str
    timestamp: str
    transcript: str
    location: Optional[LocationData] = None
    is_final: Optional[bool] = False


@app.post("/voice_transcription_in")
async def voice_transcription_in(request: VoiceTranscriptionRequest):
    """Legacy HTTP endpoint for voice transcription (backwards compatibility)"""

    # Initialize caller
    if request.person_id not in _callers:
        _callers[request.person_id] = {
            "person_id": request.person_id,
            "connected_at": datetime.utcnow().isoformat(),
            "chunks": [],
            "chunk_count": 0,
            "last_location": None,
            "extraction": None,
        }

    chunk_index = _callers[request.person_id]["chunk_count"]
    _callers[request.person_id]["chunk_count"] += 1

    # Store chunk
    _callers[request.person_id]["chunks"].append({
        "chunk_index": chunk_index,
        "transcript": request.transcript,
        "is_final": request.is_final,
        "location": request.location.model_dump() if request.location else None,
        "timestamp": request.timestamp,
    })

    if request.location:
        _callers[request.person_id]["last_location"] = request.location.model_dump()

    print(f"\n📞 [HTTP] Transcript #{chunk_index} from {request.person_id[:8]}...")
    print(f"   \"{request.transcript}\"")

    return {
        "status": "success",
        "person_id": request.person_id,
        "chunk_index": chunk_index,
        "message": "Transcript received (HTTP fallback)",
    }


@app.post("/voice_transcription_end")
async def voice_transcription_end(person_id: str):
    """Legacy HTTP endpoint for ending call"""
    print(f"\n📴 [HTTP] Call ended: {person_id[:8]}...")
    return {"status": "success", "message": "Call ended"}


# ==================== MAIN ====================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚨 EMERGENCY CALL MOCK SERVER (WebSocket)")
    print("="*60)
    print("\nServer running at: http://localhost:8000")
    print("WebSocket endpoint: ws://localhost:8000/ws/call/{person_id}")
    print("API docs at: http://localhost:8000/docs")
    print("\nTo test with phone client:")
    print("1. In another terminal: cd phone_client && python -m http.server 3000")
    print("2. Open http://localhost:3000 in your browser")
    print("3. Click 'Start Emergency Call' and speak")
    print("\nProtocol: SCHEMA.md")
    print("="*60 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8000)
