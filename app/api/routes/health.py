"""Health check endpoints."""

from datetime import datetime

from fastapi import APIRouter, Depends

from app.core.call_processor import CallProcessor
from app.core.connection_manager import ConnectionManager
from app.db.mongodb import MongoDB
from app.models.schemas import DisasterSummary, PersonRecord

router = APIRouter(tags=["health"])


def get_connection_manager() -> ConnectionManager:
    """Dependency to get the connection manager."""
    from app.main import app_state
    return app_state.connection_manager


def get_call_processor() -> CallProcessor:
    """Dependency to get the call processor."""
    from app.main import app_state
    return app_state.call_processor


@router.get("/health")
async def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/detailed")
async def detailed_health_check(
    connection_manager: ConnectionManager = Depends(get_connection_manager),
):
    """Detailed health check with component status."""
    # Check MongoDB
    try:
        db = MongoDB.get_database()
        await db.command("ping")
        mongodb_status = "healthy"
    except Exception as e:
        mongodb_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if mongodb_status == "healthy" else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "mongodb": mongodb_status,
            "websocket_connections": connection_manager.active_connections,
        },
    }


@router.get("/status")
async def get_status(
    connection_manager: ConnectionManager = Depends(get_connection_manager),
    call_processor: CallProcessor = Depends(get_call_processor),
):
    """Get current system status and summary."""
    summary = await call_processor.get_current_summary()

    return {
        "active_connections": connection_manager.active_connections,
        "total_callers": summary.total_callers,
        "active_callers": summary.active_callers,
        "overall_severity": summary.overall_severity.value,
        "total_injuries": summary.total_injuries,
        "total_fatalities": summary.total_fatalities,
        "total_trapped": summary.total_trapped,
    }


@router.get("/summary", response_model=DisasterSummary)
async def get_summary(
    call_processor: CallProcessor = Depends(get_call_processor),
):
    """Get the current disaster summary."""
    return await call_processor.get_current_summary()


@router.get("/callers")
async def get_callers(
    call_processor: CallProcessor = Depends(get_call_processor),
):
    """Get list of all callers with extracted info."""
    from app.db.mongodb import get_database
    from app.db.repositories.person import PersonRepository

    db = MongoDB.get_database()
    person_repo = PersonRepository(db)
    persons = await person_repo.get_all_with_extracted_info()

    return {
        "count": len(persons),
        "callers": [
            {
                "person_id": p.person_id,
                "is_active": p.is_active,
                "call_started_at": p.call_started_at.isoformat(),
                "extracted_info": p.extracted_info.model_dump() if p.extracted_info else None,
            }
            for p in persons
        ],
    }


@router.get("/caller/{person_id}", response_model=PersonRecord)
async def get_caller(
    person_id: str,
    call_processor: CallProcessor = Depends(get_call_processor),
):
    """Get a specific caller's record."""
    from fastapi import HTTPException

    record = await call_processor.get_person_record(person_id)
    if not record:
        raise HTTPException(status_code=404, detail="Caller not found")
    return record
