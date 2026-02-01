#!/usr/bin/env python3
"""Assignment tracking API for manual dispatch."""
import json
import time
import uuid
from aiohttp import web
from database.postgres import db, get_user
from status_inference import infer_civilian_status, infer_responder_status
import aiosqlite


async def create_assignment(request):
    """
    Create a new assignment (manual dispatch).

    POST /api/assignments
    Body: {
        "civilian_id": "civ_001",
        "responder_id": "resp_001"
    }
    """
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)

    civilian_id = data.get('civilian_id')
    responder_id = data.get('responder_id')

    if not civilian_id or not responder_id:
        return web.json_response({"error": "Missing civilian_id or responder_id"}, status=400)

    # Verify both users exist
    civilian = await get_user(civilian_id)
    responder = await get_user(responder_id)

    if not civilian:
        return web.json_response({"error": f"Civilian {civilian_id} not found"}, status=404)

    if not responder:
        return web.json_response({"error": f"Responder {responder_id} not found"}, status=404)

    if civilian.role != 'civilian':
        return web.json_response({"error": f"User {civilian_id} is not a civilian"}, status=400)

    if responder.role != 'first_responder':
        return web.json_response({"error": f"User {responder_id} is not a first responder"}, status=400)

    # Create assignment
    assignment_id = uuid.uuid4().hex
    assigned_at = time.time()

    async with aiosqlite.connect(db.db_path) as conn:
        await conn.execute(
            """INSERT INTO assignments
               (assignment_id, civilian_id, responder_id, assigned_at, is_active)
               VALUES (?, ?, ?, ?, 1)""",
            (assignment_id, civilian_id, responder_id, assigned_at)
        )
        await conn.commit()

    print(f"Assignment created: {assignment_id} ({civilian_id} ← {responder_id})")

    # Trigger status inference for both users
    await infer_civilian_status(civilian_id)
    await infer_responder_status(responder_id)

    return web.json_response({
        "ok": True,
        "assignment_id": assignment_id,
        "civilian_id": civilian_id,
        "responder_id": responder_id,
        "assigned_at": assigned_at
    })


async def list_assignments(request):
    """
    List all assignments.

    GET /api/assignments
    Query params:
        ?active=true - Only return active assignments (default: all)
    """
    active_only = request.query.get('active', '').lower() == 'true'

    async with aiosqlite.connect(db.db_path) as conn:
        if active_only:
            query = """
                SELECT assignment_id, civilian_id, responder_id, assigned_at, completed_at, is_active
                FROM assignments
                WHERE is_active = 1
                ORDER BY assigned_at DESC
            """
        else:
            query = """
                SELECT assignment_id, civilian_id, responder_id, assigned_at, completed_at, is_active
                FROM assignments
                ORDER BY assigned_at DESC
            """

        assignments = []
        async with conn.execute(query) as cursor:
            async for row in cursor:
                assignments.append({
                    "assignment_id": row[0],
                    "civilian_id": row[1],
                    "responder_id": row[2],
                    "assigned_at": row[3],
                    "completed_at": row[4],
                    "is_active": bool(row[5])
                })

    return web.json_response({
        "ok": True,
        "count": len(assignments),
        "assignments": assignments
    })


async def get_assignment(request):
    """
    Get a specific assignment by ID.

    GET /api/assignments/{assignment_id}
    """
    assignment_id = request.match_info.get('assignment_id')

    async with aiosqlite.connect(db.db_path) as conn:
        async with conn.execute(
            """SELECT assignment_id, civilian_id, responder_id, assigned_at, completed_at, is_active
               FROM assignments WHERE assignment_id = ?""",
            (assignment_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                return web.json_response({"error": "Assignment not found"}, status=404)

            assignment = {
                "assignment_id": row[0],
                "civilian_id": row[1],
                "responder_id": row[2],
                "assigned_at": row[3],
                "completed_at": row[4],
                "is_active": bool(row[5])
            }

    return web.json_response({
        "ok": True,
        "assignment": assignment
    })


async def complete_assignment(request):
    """
    Mark an assignment as completed.

    PUT /api/assignments/{assignment_id}/complete
    """
    assignment_id = request.match_info.get('assignment_id')

    # Verify assignment exists
    async with aiosqlite.connect(db.db_path) as conn:
        async with conn.execute(
            "SELECT assignment_id FROM assignments WHERE assignment_id = ?",
            (assignment_id,)
        ) as cursor:
            if not await cursor.fetchone():
                return web.json_response({"error": "Assignment not found"}, status=404)

        # Mark as completed
        completed_at = time.time()
        await conn.execute(
            """UPDATE assignments
               SET is_active = 0, completed_at = ?
               WHERE assignment_id = ?""",
            (completed_at, assignment_id)
        )
        await conn.commit()

    print(f"Assignment completed: {assignment_id}")

    return web.json_response({
        "ok": True,
        "assignment_id": assignment_id,
        "completed_at": completed_at
    })


async def get_active_assignments(request):
    """
    Get all active assignments.

    GET /api/assignments/active
    """
    async with aiosqlite.connect(db.db_path) as conn:
        assignments = []
        async with conn.execute(
            """SELECT assignment_id, civilian_id, responder_id, assigned_at
               FROM assignments
               WHERE is_active = 1
               ORDER BY assigned_at DESC"""
        ) as cursor:
            async for row in cursor:
                assignments.append({
                    "assignment_id": row[0],
                    "civilian_id": row[1],
                    "responder_id": row[2],
                    "assigned_at": row[3]
                })

    return web.json_response({
        "ok": True,
        "count": len(assignments),
        "assignments": assignments
    })


def register_assignment_routes(app):
    """Register assignment API routes."""
    app.router.add_post("/api/assignments", create_assignment)
    app.router.add_get("/api/assignments", list_assignments)
    app.router.add_get("/api/assignments/active", get_active_assignments)
    app.router.add_get("/api/assignments/{assignment_id}", get_assignment)
    app.router.add_put("/api/assignments/{assignment_id}/complete", complete_assignment)
