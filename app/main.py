"""FastAPI application entry point."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import health, websocket
from app.config import get_settings
from app.dependencies import AppState
from app.utils.logging import setup_logging, get_logger

# Global app state
app_state = AppState()

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    settings = get_settings()

    # Setup logging
    setup_logging(settings.log_level)

    logger.info(
        f"Starting {settings.app_name}",
        extra={"event": "startup", "debug": settings.debug},
    )

    # Initialize components
    await app_state.initialize()

    # Start background tasks
    heartbeat_task = asyncio.create_task(heartbeat_monitor())

    yield

    # Cleanup
    logger.info("Shutting down", extra={"event": "shutdown"})
    heartbeat_task.cancel()
    try:
        await heartbeat_task
    except asyncio.CancelledError:
        pass

    await app_state.cleanup()


async def heartbeat_monitor():
    """Background task to monitor and close stale connections."""
    settings = get_settings()

    while True:
        try:
            await asyncio.sleep(settings.ws_heartbeat_interval)

            if app_state.connection_manager:
                await app_state.connection_manager.close_stale_connections(
                    timeout_seconds=settings.ws_connection_timeout
                )
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(
                f"Heartbeat monitor error: {e}",
                extra={"event": "heartbeat_monitor_error", "error": str(e)},
            )


# Create FastAPI application
app = FastAPI(
    title="Disaster Call Processor",
    description="Real-time system for processing parallel emergency calls",
    version="0.1.0",
    lifespan=lifespan,
)

# Include routers
app.include_router(websocket.router)
app.include_router(health.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Disaster Call Processor",
        "version": "0.1.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
