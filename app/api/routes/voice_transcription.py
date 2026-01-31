"""HTTP endpoint for voice transcription from the phone client.

This is a simplified mock version that doesn't require a database.
It logs transcripts and stores them in memory for the session.
"""

from datetime import datetime
from typing import Optional
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory storage (mock database)
_transcripts: dict[str, list[dict]] = {}
_chunk_indices: dict[str, int] = {}


class LocationData(BaseModel):
    """GPS location data from client."""

    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")
    accuracy: Optional[float] = Field(None, description="Accuracy in meters")
    altitude: Optional[float] = Field(None, description="Altitude in meters")
    timestamp: Optional[str] = Field(None, description="Location timestamp")
    source: Optional[str] = Field(None, description="Location source (gps/ip-fallback)")


class VoiceTranscriptionRequest(BaseModel):
    """Incoming voice transcription from phone client."""

    person_id: str = Field(..., description="Unique identifier for the caller")
    timestamp: str = Field(..., description="ISO timestamp of the transcription")
    transcript: str = Field(..., description="The transcribed text")
    location: Optional[LocationData] = Field(None, description="GPS location data")


class VoiceTranscriptionResponse(BaseModel):
    """Response to voice transcription request."""

    status: str = Field(..., description="Processing status")
    person_id: str = Field(..., description="Person ID")
    chunk_index: int = Field(..., description="Assigned chunk index")
    message: str = Field(..., description="Status message")


@router.post(
    "/voice_transcription_in",
    response_model=VoiceTranscriptionResponse,
    summary="Receive voice transcription",
    description="HTTP endpoint for receiving voice transcriptions from the phone client",
)
async def voice_transcription_in(request: VoiceTranscriptionRequest):
    """
    Receive voice transcription from the phone client.

    This is a mock implementation that stores transcripts in memory.
    In production, this would integrate with the full call processor and database.
    """
    # Get or increment chunk index for this person
    if request.person_id not in _chunk_indices:
        _chunk_indices[request.person_id] = 0
        _transcripts[request.person_id] = []

    chunk_index = _chunk_indices[request.person_id]
    _chunk_indices[request.person_id] += 1

    # Store the transcript
    transcript_entry = {
        "chunk_index": chunk_index,
        "timestamp": request.timestamp,
        "transcript": request.transcript,
        "location": request.location.model_dump() if request.location else None,
        "received_at": datetime.utcnow().isoformat(),
    }
    _transcripts[request.person_id].append(transcript_entry)

    # Log the transcript
    location_str = ""
    if request.location:
        location_str = f" @ ({request.location.lat:.4f}, {request.location.lng:.4f})"

    logger.info(
        f"📞 [{request.person_id[:8]}...] Chunk {chunk_index}: \"{request.transcript}\"{location_str}"
    )

    # Also print to console for visibility during development
    print(f"\n{'='*60}")
    print(f"📞 EMERGENCY TRANSCRIPT RECEIVED")
    print(f"{'='*60}")
    print(f"Person ID: {request.person_id}")
    print(f"Chunk: {chunk_index}")
    print(f"Time: {request.timestamp}")
    print(f"Transcript: {request.transcript}")
    if request.location:
        print(f"Location: {request.location.lat:.6f}, {request.location.lng:.6f} (±{request.location.accuracy or '?'}m)")
    print(f"{'='*60}\n")

    return VoiceTranscriptionResponse(
        status="success",
        person_id=request.person_id,
        chunk_index=chunk_index,
        message="Transcript received and stored (mock mode)",
    )


@router.post(
    "/voice_transcription_end",
    summary="End voice call",
    description="Signal the end of a voice call session",
)
async def voice_transcription_end(person_id: str):
    """
    Signal the end of a voice call.

    Prints a summary of all transcripts received from this caller.
    """
    print(f"\n{'='*60}")
    print(f"📴 EMERGENCY CALL ENDED")
    print(f"{'='*60}")
    print(f"Person ID: {person_id}")

    if person_id in _transcripts:
        transcripts = _transcripts[person_id]
        print(f"Total chunks: {len(transcripts)}")
        print(f"\nFull transcript:")
        print("-" * 40)
        full_text = " ".join([t["transcript"] for t in transcripts])
        print(full_text)
        print("-" * 40)

        # Get last known location
        for t in reversed(transcripts):
            if t.get("location"):
                loc = t["location"]
                print(f"Last location: {loc['lat']:.6f}, {loc['lng']:.6f}")
                break
    else:
        print("No transcripts recorded for this person")

    print(f"{'='*60}\n")

    # Clean up
    if person_id in _chunk_indices:
        del _chunk_indices[person_id]
    if person_id in _transcripts:
        del _transcripts[person_id]

    return {"status": "success", "message": "Call ended"}


@router.get(
    "/voice_transcriptions",
    summary="Get all transcriptions",
    description="Get all stored transcriptions (for debugging)",
)
async def get_all_transcriptions():
    """
    Get all stored transcriptions.

    This is a debug endpoint to view all received transcripts.
    """
    return {
        "status": "success",
        "active_callers": list(_transcripts.keys()),
        "transcripts": _transcripts,
    }


@router.get(
    "/voice_transcriptions/{person_id}",
    summary="Get transcriptions for a person",
    description="Get all transcriptions for a specific person",
)
async def get_person_transcriptions(person_id: str):
    """
    Get all transcriptions for a specific person.
    """
    if person_id not in _transcripts:
        raise HTTPException(status_code=404, detail="Person not found")

    transcripts = _transcripts[person_id]
    full_text = " ".join([t["transcript"] for t in transcripts])

    return {
        "status": "success",
        "person_id": person_id,
        "chunk_count": len(transcripts),
        "full_transcript": full_text,
        "chunks": transcripts,
    }
