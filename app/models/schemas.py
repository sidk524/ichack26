"""Pydantic models for the disaster call processing system."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class SeverityLevel(str, Enum):
    """Severity levels for disaster incidents."""

    UNKNOWN = "unknown"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class DisasterType(str, Enum):
    """Types of disasters."""

    UNKNOWN = "unknown"
    FIRE = "fire"
    FLOOD = "flood"
    EARTHQUAKE = "earthquake"
    TORNADO = "tornado"
    HURRICANE = "hurricane"
    EXPLOSION = "explosion"
    CHEMICAL_SPILL = "chemical_spill"
    BUILDING_COLLAPSE = "building_collapse"
    TRAFFIC_ACCIDENT = "traffic_accident"
    OTHER = "other"


class MessageType(str, Enum):
    """WebSocket message types."""

    # Client -> Server
    TRANSCRIPT_CHUNK = "transcript_chunk"
    HEARTBEAT = "heartbeat"
    CALL_END = "call_end"

    # Server -> Client
    CHUNK_PROCESSED = "chunk_processed"
    SUMMARY_UPDATE = "summary_update"
    ERROR = "error"
    HEARTBEAT_ACK = "heartbeat_ack"
    CONNECTION_ACK = "connection_ack"


class TranscriptChunk(BaseModel):
    """Incoming transcript chunk from a call."""

    text: str = Field(..., description="The transcript text content")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
        description="When the chunk was received",
    )
    chunk_index: int = Field(..., ge=0, description="Sequential chunk number")
    is_final: bool = Field(
        default=False, description="Whether this is the last chunk of the call"
    )
    audio_duration_ms: int | None = Field(
        default=None, ge=0, description="Duration of audio in milliseconds"
    )


class ExtractedInfo(BaseModel):
    """Information extracted from transcript by LLM."""

    location: str | None = Field(
        default=None, description="Location of the incident"
    )
    location_details: str | None = Field(
        default=None, description="Additional location details (landmarks, floor, etc.)"
    )
    disaster_type: DisasterType = Field(
        default=DisasterType.UNKNOWN, description="Type of disaster"
    )
    severity: SeverityLevel = Field(
        default=SeverityLevel.UNKNOWN, description="Severity assessment"
    )
    injuries_reported: int | None = Field(
        default=None, ge=0, description="Number of injuries reported"
    )
    fatalities_reported: int | None = Field(
        default=None, ge=0, description="Number of fatalities reported"
    )
    people_trapped: int | None = Field(
        default=None, ge=0, description="Number of people trapped"
    )
    hazards: list[str] = Field(
        default_factory=list, description="Identified hazards (fire, gas leak, etc.)"
    )
    resources_needed: list[str] = Field(
        default_factory=list, description="Resources requested (ambulance, fire truck, etc.)"
    )
    caller_condition: str | None = Field(
        default=None, description="Condition/status of the caller"
    )
    additional_notes: str | None = Field(
        default=None, description="Any other relevant information"
    )
    confidence: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Extraction confidence score"
    )
    extracted_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
        description="When extraction was performed",
    )


class PersonRecord(BaseModel):
    """Record for an individual caller."""

    person_id: str = Field(..., description="Unique identifier for the caller")
    call_started_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
        description="When the call started",
    )
    call_ended_at: datetime | None = Field(
        default=None, description="When the call ended"
    )
    is_active: bool = Field(default=True, description="Whether the call is ongoing")
    transcript_chunks: list[TranscriptChunk] = Field(
        default_factory=list, description="All transcript chunks received"
    )
    extracted_info: ExtractedInfo | None = Field(
        default=None, description="Latest extracted information"
    )
    extraction_history: list[ExtractedInfo] = Field(
        default_factory=list, description="History of all extractions"
    )
    phone_number: str | None = Field(
        default=None, description="Caller's phone number if available"
    )
    callback_number: str | None = Field(
        default=None, description="Callback number if different from caller"
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
        description="Last update timestamp",
    )


class AffectedArea(BaseModel):
    """Information about an affected area."""

    location: str = Field(..., description="Area location")
    caller_count: int = Field(default=0, ge=0, description="Number of callers from this area")
    max_severity: SeverityLevel = Field(
        default=SeverityLevel.UNKNOWN, description="Highest severity reported"
    )
    disaster_types: list[DisasterType] = Field(
        default_factory=list, description="Types of disasters reported"
    )


class DisasterSummary(BaseModel):
    """Aggregate summary of all disaster calls."""

    summary_id: str = Field(
        default="current", description="Summary identifier"
    )
    version: int = Field(
        default=1, ge=1, description="Version for optimistic locking"
    )
    total_callers: int = Field(
        default=0, ge=0, description="Total number of callers"
    )
    active_callers: int = Field(
        default=0, ge=0, description="Currently active calls"
    )
    total_injuries: int = Field(
        default=0, ge=0, description="Total injuries reported"
    )
    total_fatalities: int = Field(
        default=0, ge=0, description="Total fatalities reported"
    )
    total_trapped: int = Field(
        default=0, ge=0, description="Total people trapped"
    )
    overall_severity: SeverityLevel = Field(
        default=SeverityLevel.UNKNOWN, description="Overall severity assessment"
    )
    disaster_types: list[DisasterType] = Field(
        default_factory=list, description="All disaster types reported"
    )
    affected_areas: list[AffectedArea] = Field(
        default_factory=list, description="Breakdown by affected area"
    )
    all_hazards: list[str] = Field(
        default_factory=list, description="All identified hazards"
    )
    resources_needed: list[str] = Field(
        default_factory=list, description="All resources requested"
    )
    narrative_summary: str = Field(
        default="", description="LLM-generated narrative summary"
    )
    key_findings: list[str] = Field(
        default_factory=list, description="Key findings and priorities"
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
        description="Last update timestamp",
    )


class WebSocketMessage(BaseModel):
    """WebSocket message protocol."""

    type: MessageType = Field(..., description="Message type")
    payload: dict[str, Any] = Field(
        default_factory=dict, description="Message payload"
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
        description="Message timestamp",
    )
    message_id: str | None = Field(
        default=None, description="Optional message ID for correlation"
    )

    @classmethod
    def transcript_chunk(
        cls, text: str, chunk_index: int, is_final: bool = False
    ) -> "WebSocketMessage":
        """Create a transcript chunk message."""
        return cls(
            type=MessageType.TRANSCRIPT_CHUNK,
            payload={
                "text": text,
                "chunk_index": chunk_index,
                "is_final": is_final,
            },
        )

    @classmethod
    def chunk_processed(
        cls, chunk_index: int, extracted_info: ExtractedInfo
    ) -> "WebSocketMessage":
        """Create a chunk processed response."""
        return cls(
            type=MessageType.CHUNK_PROCESSED,
            payload={
                "chunk_index": chunk_index,
                "extracted_info": extracted_info.model_dump(),
            },
        )

    @classmethod
    def summary_update(cls, summary: DisasterSummary) -> "WebSocketMessage":
        """Create a summary update message."""
        return cls(
            type=MessageType.SUMMARY_UPDATE,
            payload={"summary": summary.model_dump()},
        )

    @classmethod
    def error(cls, message: str, code: str = "ERROR") -> "WebSocketMessage":
        """Create an error message."""
        return cls(
            type=MessageType.ERROR,
            payload={"message": message, "code": code},
        )

    @classmethod
    def heartbeat(cls) -> "WebSocketMessage":
        """Create a heartbeat message."""
        return cls(type=MessageType.HEARTBEAT, payload={})

    @classmethod
    def heartbeat_ack(cls) -> "WebSocketMessage":
        """Create a heartbeat acknowledgment."""
        return cls(type=MessageType.HEARTBEAT_ACK, payload={})

    @classmethod
    def connection_ack(cls, person_id: str) -> "WebSocketMessage":
        """Create a connection acknowledgment."""
        return cls(
            type=MessageType.CONNECTION_ACK,
            payload={"person_id": person_id, "status": "connected"},
        )
