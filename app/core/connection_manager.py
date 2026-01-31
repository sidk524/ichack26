"""WebSocket connection manager for handling concurrent connections."""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime

from fastapi import WebSocket

from app.models.schemas import DisasterSummary, WebSocketMessage
from app.utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class Connection:
    """Represents an active WebSocket connection."""

    person_id: str
    websocket: WebSocket
    connected_at: datetime = field(default_factory=datetime.utcnow)
    last_heartbeat: datetime = field(default_factory=datetime.utcnow)
    chunk_buffer: list = field(default_factory=list)


class ConnectionManager:
    """Manages concurrent WebSocket connections."""

    def __init__(self):
        self._connections: dict[str, Connection] = {}
        self._lock = asyncio.Lock()

    async def connect(self, person_id: str, websocket: WebSocket) -> Connection:
        """Register a new WebSocket connection."""
        await websocket.accept()

        async with self._lock:
            # Close existing connection if any
            if person_id in self._connections:
                old_conn = self._connections[person_id]
                try:
                    await old_conn.websocket.close(code=1000, reason="Replaced by new connection")
                except Exception:
                    pass
                logger.info(
                    f"Replaced existing connection for {person_id}",
                    extra={"event": "connection_replaced", "person_id": person_id},
                )

            conn = Connection(person_id=person_id, websocket=websocket)
            self._connections[person_id] = conn

        logger.info(
            f"New connection: {person_id}",
            extra={
                "event": "connection_opened",
                "person_id": person_id,
                "total_connections": len(self._connections),
            },
        )

        # Send connection acknowledgment
        await self.send_to_person(
            person_id, WebSocketMessage.connection_ack(person_id)
        )

        return conn

    async def disconnect(self, person_id: str) -> None:
        """Remove a WebSocket connection."""
        async with self._lock:
            if person_id in self._connections:
                del self._connections[person_id]

        logger.info(
            f"Connection closed: {person_id}",
            extra={
                "event": "connection_closed",
                "person_id": person_id,
                "total_connections": len(self._connections),
            },
        )

    async def send_to_person(self, person_id: str, message: WebSocketMessage) -> bool:
        """Send a message to a specific person."""
        conn = self._connections.get(person_id)
        if not conn:
            return False

        try:
            await conn.websocket.send_json(message.model_dump(mode="json"))
            return True
        except Exception as e:
            logger.warning(
                f"Failed to send to {person_id}: {e}",
                extra={"event": "send_failed", "person_id": person_id, "error": str(e)},
            )
            return False

    async def broadcast(self, message: WebSocketMessage) -> int:
        """Broadcast a message to all connected clients."""
        sent = 0
        message_data = message.model_dump(mode="json")

        for person_id, conn in list(self._connections.items()):
            try:
                await conn.websocket.send_json(message_data)
                sent += 1
            except Exception as e:
                logger.warning(
                    f"Failed to broadcast to {person_id}: {e}",
                    extra={"event": "broadcast_failed", "person_id": person_id},
                )

        return sent

    async def broadcast_summary(self, summary: DisasterSummary) -> int:
        """Broadcast a summary update to all clients."""
        message = WebSocketMessage.summary_update(summary)
        count = await self.broadcast(message)
        logger.info(
            f"Broadcast summary to {count} clients",
            extra={"event": "summary_broadcast", "client_count": count},
        )
        return count

    def get_connection(self, person_id: str) -> Connection | None:
        """Get a connection by person ID."""
        return self._connections.get(person_id)

    def update_heartbeat(self, person_id: str) -> bool:
        """Update the last heartbeat time for a connection."""
        conn = self._connections.get(person_id)
        if conn:
            conn.last_heartbeat = datetime.utcnow()
            return True
        return False

    @property
    def active_connections(self) -> int:
        """Get the number of active connections."""
        return len(self._connections)

    def get_all_person_ids(self) -> list[str]:
        """Get all connected person IDs."""
        return list(self._connections.keys())

    async def check_stale_connections(self, timeout_seconds: int = 60) -> list[str]:
        """Find connections that haven't sent a heartbeat recently."""
        now = datetime.utcnow()
        stale = []

        for person_id, conn in self._connections.items():
            elapsed = (now - conn.last_heartbeat).total_seconds()
            if elapsed > timeout_seconds:
                stale.append(person_id)

        return stale

    async def close_stale_connections(self, timeout_seconds: int = 60) -> int:
        """Close connections that haven't sent a heartbeat recently."""
        stale = await self.check_stale_connections(timeout_seconds)

        for person_id in stale:
            conn = self._connections.get(person_id)
            if conn:
                try:
                    await conn.websocket.close(code=1000, reason="Heartbeat timeout")
                except Exception:
                    pass
                await self.disconnect(person_id)

        if stale:
            logger.info(
                f"Closed {len(stale)} stale connections",
                extra={"event": "stale_connections_closed", "count": len(stale)},
            )

        return len(stale)
