"""WebSocket client library for disaster call processing."""

import asyncio
import json
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Callable

import websockets
from websockets.exceptions import ConnectionClosed

from app.models.schemas import (
    DisasterSummary,
    ExtractedInfo,
    MessageType,
    WebSocketMessage,
)
from app.utils.logging import get_context_logger


class ConnectionState(Enum):
    """Client connection states."""

    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"


class DisasterCallClient:
    """
    WebSocket client for sending emergency call data to the processing server.

    Features:
    - Auto-reconnect with exponential backoff
    - Heartbeat mechanism
    - Callback-based event handling
    - Async context manager support
    """

    def __init__(
        self,
        server_url: str = "ws://localhost:8000",
        person_id: str | None = None,
        auto_reconnect: bool = True,
        max_reconnect_attempts: int = 10,
        heartbeat_interval: int = 25,
    ):
        self.server_url = server_url.rstrip("/")
        self.person_id = person_id or str(uuid.uuid4())
        self.auto_reconnect = auto_reconnect
        self.max_reconnect_attempts = max_reconnect_attempts
        self.heartbeat_interval = heartbeat_interval

        self._ws: websockets.WebSocketClientProtocol | None = None
        self._state = ConnectionState.DISCONNECTED
        self._reconnect_attempts = 0
        self._chunk_index = 0

        self._heartbeat_task: asyncio.Task | None = None
        self._receive_task: asyncio.Task | None = None
        self._running = False

        self.logger = get_context_logger(__name__, person_id=self.person_id)

        # Callbacks
        self._on_connected: Callable[[], Any] | None = None
        self._on_disconnected: Callable[[], Any] | None = None
        self._on_chunk_processed: Callable[[int, ExtractedInfo], Any] | None = None
        self._on_summary_update: Callable[[DisasterSummary], Any] | None = None
        self._on_error: Callable[[str], Any] | None = None

    @property
    def state(self) -> ConnectionState:
        """Get current connection state."""
        return self._state

    @property
    def is_connected(self) -> bool:
        """Check if client is connected."""
        return self._state == ConnectionState.CONNECTED

    def on_connected(self, callback: Callable[[], Any]) -> None:
        """Register callback for connection established."""
        self._on_connected = callback

    def on_disconnected(self, callback: Callable[[], Any]) -> None:
        """Register callback for disconnection."""
        self._on_disconnected = callback

    def on_chunk_processed(
        self, callback: Callable[[int, ExtractedInfo], Any]
    ) -> None:
        """Register callback for chunk processed event."""
        self._on_chunk_processed = callback

    def on_summary_update(self, callback: Callable[[DisasterSummary], Any]) -> None:
        """Register callback for summary updates."""
        self._on_summary_update = callback

    def on_error(self, callback: Callable[[str], Any]) -> None:
        """Register callback for errors."""
        self._on_error = callback

    async def connect(self) -> bool:
        """Establish connection to the server."""
        if self._state == ConnectionState.CONNECTED:
            return True

        self._state = ConnectionState.CONNECTING
        ws_url = f"{self.server_url}/ws/call/{self.person_id}"

        try:
            self._ws = await websockets.connect(ws_url)
            self._state = ConnectionState.CONNECTED
            self._reconnect_attempts = 0
            self._running = True

            self.logger.info(
                f"Connected to {ws_url}",
                extra={"event": "client_connected"},
            )

            # Start background tasks
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            self._receive_task = asyncio.create_task(self._receive_loop())

            if self._on_connected:
                await self._call_callback(self._on_connected)

            return True

        except Exception as e:
            self._state = ConnectionState.DISCONNECTED
            self.logger.error(
                f"Connection failed: {e}",
                extra={"event": "connection_failed", "error": str(e)},
            )
            return False

    async def disconnect(self) -> None:
        """Disconnect from the server."""
        self._running = False
        self._state = ConnectionState.DISCONNECTED

        # Cancel background tasks
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass

        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        # Close WebSocket
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None

        self.logger.info("Disconnected", extra={"event": "client_disconnected"})

        if self._on_disconnected:
            await self._call_callback(self._on_disconnected)

    async def send_transcript_chunk(
        self,
        text: str,
        is_final: bool = False,
        audio_duration_ms: int | None = None,
    ) -> bool:
        """
        Send a transcript chunk to the server.

        Args:
            text: The transcript text
            is_final: Whether this is the final chunk of the call
            audio_duration_ms: Duration of the audio in milliseconds

        Returns:
            True if sent successfully
        """
        if not self.is_connected or not self._ws:
            self.logger.warning(
                "Cannot send: not connected",
                extra={"event": "send_failed_not_connected"},
            )
            return False

        message = WebSocketMessage(
            type=MessageType.TRANSCRIPT_CHUNK,
            payload={
                "text": text,
                "chunk_index": self._chunk_index,
                "is_final": is_final,
                "audio_duration_ms": audio_duration_ms,
            },
        )

        try:
            await self._ws.send(message.model_dump_json())
            self._chunk_index += 1
            self.logger.debug(
                f"Sent chunk {message.payload['chunk_index']}",
                extra={"event": "chunk_sent", "chunk_index": message.payload["chunk_index"]},
            )
            return True

        except Exception as e:
            self.logger.error(
                f"Failed to send chunk: {e}",
                extra={"event": "send_failed", "error": str(e)},
            )
            return False

    async def end_call(self) -> bool:
        """Signal end of call to the server."""
        if not self.is_connected or not self._ws:
            return False

        message = WebSocketMessage(
            type=MessageType.CALL_END,
            payload={},
        )

        try:
            await self._ws.send(message.model_dump_json())
            self.logger.info("Call ended", extra={"event": "call_end_sent"})
            return True
        except Exception as e:
            self.logger.error(
                f"Failed to send call end: {e}",
                extra={"event": "call_end_failed", "error": str(e)},
            )
            return False

    async def _heartbeat_loop(self) -> None:
        """Send periodic heartbeats."""
        while self._running:
            try:
                await asyncio.sleep(self.heartbeat_interval)

                if self._ws and self._state == ConnectionState.CONNECTED:
                    message = WebSocketMessage.heartbeat()
                    await self._ws.send(message.model_dump_json())
                    self.logger.debug("Heartbeat sent", extra={"event": "heartbeat_sent"})

            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.warning(
                    f"Heartbeat failed: {e}",
                    extra={"event": "heartbeat_failed", "error": str(e)},
                )

    async def _receive_loop(self) -> None:
        """Receive and process messages from server."""
        while self._running:
            try:
                if not self._ws:
                    await asyncio.sleep(0.1)
                    continue

                data = await self._ws.recv()
                message_dict = json.loads(data)
                message = WebSocketMessage(**message_dict)

                await self._handle_message(message)

            except ConnectionClosed:
                self.logger.warning(
                    "Connection closed by server",
                    extra={"event": "connection_closed"},
                )
                await self._handle_disconnect()

            except asyncio.CancelledError:
                break

            except Exception as e:
                self.logger.error(
                    f"Receive error: {e}",
                    extra={"event": "receive_error", "error": str(e)},
                )

    async def _handle_message(self, message: WebSocketMessage) -> None:
        """Handle incoming message."""
        if message.type == MessageType.CONNECTION_ACK:
            self.logger.info(
                "Connection acknowledged",
                extra={"event": "connection_ack"},
            )

        elif message.type == MessageType.HEARTBEAT_ACK:
            self.logger.debug("Heartbeat acknowledged", extra={"event": "heartbeat_ack"})

        elif message.type == MessageType.CHUNK_PROCESSED:
            chunk_index = message.payload.get("chunk_index", 0)
            info_data = message.payload.get("extracted_info", {})
            extracted_info = ExtractedInfo(**info_data)

            self.logger.info(
                f"Chunk {chunk_index} processed",
                extra={
                    "event": "chunk_processed",
                    "chunk_index": chunk_index,
                    "severity": extracted_info.severity.value,
                },
            )

            if self._on_chunk_processed:
                await self._call_callback(
                    self._on_chunk_processed, chunk_index, extracted_info
                )

        elif message.type == MessageType.SUMMARY_UPDATE:
            summary_data = message.payload.get("summary", {})
            summary = DisasterSummary(**summary_data)

            self.logger.info(
                "Summary updated",
                extra={
                    "event": "summary_update",
                    "severity": summary.overall_severity.value,
                    "total_callers": summary.total_callers,
                },
            )

            if self._on_summary_update:
                await self._call_callback(self._on_summary_update, summary)

        elif message.type == MessageType.ERROR:
            error_msg = message.payload.get("message", "Unknown error")
            self.logger.error(
                f"Server error: {error_msg}",
                extra={"event": "server_error", "error": error_msg},
            )

            if self._on_error:
                await self._call_callback(self._on_error, error_msg)

    async def _handle_disconnect(self) -> None:
        """Handle disconnection and attempt reconnection."""
        self._state = ConnectionState.DISCONNECTED

        if self._on_disconnected:
            await self._call_callback(self._on_disconnected)

        if self.auto_reconnect and self._reconnect_attempts < self.max_reconnect_attempts:
            await self._reconnect()

    async def _reconnect(self) -> None:
        """Attempt to reconnect with exponential backoff."""
        self._state = ConnectionState.RECONNECTING
        self._reconnect_attempts += 1

        # Exponential backoff: 1s, 2s, 4s, 8s, ... up to 60s
        wait_time = min(2 ** (self._reconnect_attempts - 1), 60)

        self.logger.info(
            f"Reconnecting in {wait_time}s (attempt {self._reconnect_attempts})",
            extra={
                "event": "reconnecting",
                "attempt": self._reconnect_attempts,
                "wait_time": wait_time,
            },
        )

        await asyncio.sleep(wait_time)

        if await self.connect():
            self.logger.info(
                "Reconnected successfully",
                extra={"event": "reconnected"},
            )
        else:
            if self._reconnect_attempts < self.max_reconnect_attempts:
                await self._reconnect()
            else:
                self.logger.error(
                    "Max reconnection attempts reached",
                    extra={"event": "reconnect_failed"},
                )

    async def _call_callback(self, callback: Callable, *args) -> None:
        """Call a callback, handling both sync and async callbacks."""
        try:
            result = callback(*args)
            if asyncio.iscoroutine(result):
                await result
        except Exception as e:
            self.logger.error(
                f"Callback error: {e}",
                extra={"event": "callback_error", "error": str(e)},
            )

    async def __aenter__(self) -> "DisasterCallClient":
        """Async context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.end_call()
        await self.disconnect()
