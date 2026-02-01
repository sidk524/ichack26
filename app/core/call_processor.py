"""Core call processing logic."""

import asyncio
from datetime import datetime

from app.config import get_settings
from app.core.connection_manager import ConnectionManager
from app.db.repositories.person import PersonRepository
from app.db.repositories.summary import SummaryRepository
from app.models.schemas import (
    DisasterSummary,
    ExtractedInfo,
    MessageType,
    PersonRecord,
    TranscriptChunk,
    WebSocketMessage,
)
from app.services.llm.client import ClaudeClient
from app.utils.logging import get_context_logger


class CallProcessor:
    """Orchestrates transcript processing, LLM extraction, and database updates."""

    def __init__(
        self,
        connection_manager: ConnectionManager,
        person_repo: PersonRepository,
        summary_repo: SummaryRepository,
        llm_client: ClaudeClient,
    ):
        self.connection_manager = connection_manager
        self.person_repo = person_repo
        self.summary_repo = summary_repo
        self.llm_client = llm_client
        self.settings = get_settings()
        self.logger = get_context_logger(__name__)
        self._summary_lock = asyncio.Lock()
        self._pending_summary_update = False

    async def process_message(
        self, person_id: str, message: WebSocketMessage
    ) -> None:
        """Process an incoming WebSocket message."""
        self.logger.debug(
            f"Processing message type {message.type} from {person_id}",
            extra={"event": "message_received", "person_id": person_id, "type": message.type.value},
        )

        if message.type == MessageType.TRANSCRIPT_CHUNK:
            await self._process_transcript_chunk(person_id, message.payload)

        elif message.type == MessageType.HEARTBEAT:
            self.connection_manager.update_heartbeat(person_id)
            await self.connection_manager.send_to_person(
                person_id, WebSocketMessage.heartbeat_ack()
            )

        elif message.type == MessageType.CALL_END:
            await self._process_call_end(person_id)

    async def _process_transcript_chunk(
        self, person_id: str, payload: dict
    ) -> None:
        """Process a transcript chunk."""
        # Ensure person record exists
        record, created = await self.person_repo.get_or_create(person_id)
        if created:
            self.logger.info(
                f"Created new person record for {person_id}",
                extra={"event": "person_created", "person_id": person_id},
            )

        # Create chunk from payload
        chunk = TranscriptChunk(
            text=payload["text"],
            chunk_index=payload["chunk_index"],
            is_final=payload.get("is_final", False),
            audio_duration_ms=payload.get("audio_duration_ms"),
        )

        # Add chunk to record
        await self.person_repo.add_transcript_chunk(person_id, chunk)

        # Get connection for buffering
        conn = self.connection_manager.get_connection(person_id)
        if conn:
            conn.chunk_buffer.append(chunk)

        # Determine if we should process
        should_process = (
            chunk.is_final
            or (conn and len(conn.chunk_buffer) >= self.settings.chunk_buffer_size)
        )

        if should_process:
            await self._extract_and_update(person_id, conn.chunk_buffer if conn else [chunk])
            if conn:
                conn.chunk_buffer.clear()

    async def _extract_and_update(
        self, person_id: str, chunks: list[TranscriptChunk]
    ) -> None:
        """Extract info from chunks and update records."""
        # Get full transcript for this person
        record = await self.person_repo.get(person_id)
        if not record:
            return

        # Combine all transcript text
        full_transcript = " ".join(
            chunk.text for chunk in record.transcript_chunks
        )

        if not full_transcript.strip():
            return

        # Extract information using LLM
        try:
            extracted_info = await self.llm_client.extract_info(full_transcript)

            # Update person record with extracted info
            await self.person_repo.update_extracted_info(person_id, extracted_info)

            # Send processed confirmation to client
            await self.connection_manager.send_to_person(
                person_id,
                WebSocketMessage.chunk_processed(
                    chunk_index=chunks[-1].chunk_index if chunks else 0,
                    extracted_info=extracted_info,
                ),
            )

            # Schedule summary update
            await self._schedule_summary_update()

        except Exception as e:
            self.logger.error(
                f"Extraction failed for {person_id}: {e}",
                extra={"event": "extraction_error", "person_id": person_id, "error": str(e)},
            )
            await self.connection_manager.send_to_person(
                person_id,
                WebSocketMessage.error(f"Extraction failed: {str(e)}"),
            )

    async def _schedule_summary_update(self) -> None:
        """Schedule a summary update with debouncing."""
        async with self._summary_lock:
            if self._pending_summary_update:
                return
            self._pending_summary_update = True

        # Wait a bit to batch multiple updates
        await asyncio.sleep(self.settings.summary_update_interval)

        try:
            await self._update_summary()
        finally:
            async with self._summary_lock:
                self._pending_summary_update = False

    async def _update_summary(self) -> None:
        """Generate and broadcast updated summary."""
        # Get all persons with extracted info
        persons = await self.person_repo.get_all_with_extracted_info()

        if not persons:
            return

        # Get current summary
        current_summary = await self.summary_repo.get()

        # Generate new summary using LLM
        try:
            updated_summary = await self.llm_client.generate_summary(
                persons, current_summary
            )

            # Save with optimistic locking
            saved_summary = await self.summary_repo.update_with_retry(
                lambda _: asyncio.coroutine(lambda: updated_summary)()
            )

            # Broadcast to all clients
            await self.connection_manager.broadcast_summary(saved_summary)

        except Exception as e:
            self.logger.error(
                f"Summary update failed: {e}",
                extra={"event": "summary_error", "error": str(e)},
            )

    async def _process_call_end(self, person_id: str) -> None:
        """Process end of call."""
        # Process any remaining buffered chunks
        conn = self.connection_manager.get_connection(person_id)
        if conn and conn.chunk_buffer:
            await self._extract_and_update(person_id, conn.chunk_buffer)
            conn.chunk_buffer.clear()

        # Mark call as ended
        await self.person_repo.end_call(person_id)

        self.logger.info(
            f"Call ended for {person_id}",
            extra={"event": "call_ended", "person_id": person_id},
        )

        # Schedule summary update
        await self._schedule_summary_update()

    async def get_current_summary(self) -> DisasterSummary:
        """Get the current disaster summary."""
        return await self.summary_repo.get()

    async def get_person_record(self, person_id: str) -> PersonRecord | None:
        """Get a specific person's record."""
        return await self.person_repo.get(person_id)

    async def get_active_calls(self) -> list[PersonRecord]:
        """Get all active call records."""
        return await self.person_repo.get_active_persons()
