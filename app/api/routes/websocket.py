"""WebSocket endpoint for call processing."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends

from app.core.call_processor import CallProcessor
from app.core.connection_manager import ConnectionManager
from app.models.schemas import MessageType, WebSocketMessage
from app.utils.logging import get_context_logger

router = APIRouter()
logger = get_context_logger(__name__)


def get_connection_manager() -> ConnectionManager:
    """Dependency to get the connection manager."""
    from app.main import app_state
    return app_state.connection_manager


def get_call_processor() -> CallProcessor:
    """Dependency to get the call processor."""
    from app.main import app_state
    return app_state.call_processor


@router.websocket("/ws/call/{person_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    person_id: str,
    connection_manager: ConnectionManager = Depends(get_connection_manager),
    call_processor: CallProcessor = Depends(get_call_processor),
):
    """
    WebSocket endpoint for emergency call processing.

    Protocol:
    - Client connects with person_id in URL
    - Server sends connection_ack
    - Client sends transcript_chunk messages
    - Server responds with chunk_processed containing extracted info
    - Server broadcasts summary_update to all clients
    - Client sends heartbeat messages (server responds with heartbeat_ack)
    - Client sends call_end when call is complete
    """
    conn = await connection_manager.connect(person_id, websocket)

    try:
        while True:
            # Receive message
            data = await websocket.receive_json()

            try:
                message = WebSocketMessage(**data)
                await call_processor.process_message(person_id, message)

            except Exception as e:
                logger.error(
                    f"Error processing message from {person_id}: {e}",
                    extra={"event": "message_error", "person_id": person_id, "error": str(e)},
                )
                await connection_manager.send_to_person(
                    person_id,
                    WebSocketMessage.error(f"Error processing message: {str(e)}"),
                )

    except WebSocketDisconnect:
        logger.info(
            f"WebSocket disconnected: {person_id}",
            extra={"event": "websocket_disconnect", "person_id": person_id},
        )

    except Exception as e:
        logger.error(
            f"WebSocket error for {person_id}: {e}",
            extra={"event": "websocket_error", "person_id": person_id, "error": str(e)},
        )

    finally:
        await connection_manager.disconnect(person_id)
