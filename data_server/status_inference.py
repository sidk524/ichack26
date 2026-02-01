#!/usr/bin/env python3
"""Status inference engine for automatic status transitions."""
import time
from typing import Optional, List, Tuple
from database.postgres import get_user, db, list_hospitals, list_danger_zones
from database.db import User
from geo_utils import (
    haversine_distance, calculate_velocity, is_stationary,
    find_nearest_hospital, get_latest_location
)
from dashboard_ws import broadcast_status_change
import aiosqlite


# Priority keywords for needs_help detection
PRIORITY_KEYWORDS = {
    'en': ['help', 'emergency', 'trapped', 'fire', 'injured', 'hurt', 'bleeding', 'unconscious', 'heart', 'attack', 'stroke', 'danger', 'dying'],
    'tr': ['yardım', 'acil', 'mahsur', 'yangın', 'yaralı', 'kanama', 'baygın', 'kalp', 'tehlike']
}

MEDICAL_KEYWORDS = {
    'en': ['bleeding', 'unconscious', 'heart', 'breathing', 'chest', 'pain', 'broken', 'burn'],
    'tr': ['kanama', 'baygın', 'kalp', 'nefes', 'göğüs', 'ağrı', 'kırık', 'yanık']
}


async def get_active_assignment(user_id: str, role: str) -> Optional[dict]:
    """
    Get active assignment for a user.

    Args:
        user_id: User ID to check
        role: 'civilian' or 'first_responder'

    Returns:
        Assignment dict or None if no active assignment
    """
    async with aiosqlite.connect(db.db_path) as conn:
        if role == 'civilian':
            query = """
                SELECT assignment_id, civilian_id, responder_id, assigned_at
                FROM assignments
                WHERE civilian_id = ? AND is_active = 1
                LIMIT 1
            """
        else:  # first_responder
            query = """
                SELECT assignment_id, civilian_id, responder_id, assigned_at
                FROM assignments
                WHERE responder_id = ? AND is_active = 1
                LIMIT 1
            """

        async with conn.execute(query, (user_id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None
            return {
                'assignment_id': row[0],
                'civilian_id': row[1],
                'responder_id': row[2],
                'assigned_at': row[3]
            }


async def get_other_user_in_assignment(assignment: dict, my_id: str) -> Optional[User]:
    """
    Get the other user in an assignment.

    Args:
        assignment: Assignment dict
        my_id: Current user's ID

    Returns:
        User object of the other party, or None
    """
    other_id = assignment['responder_id'] if assignment['civilian_id'] == my_id else assignment['civilian_id']
    return await get_user(other_id)


async def update_user_status(user_id: str, new_status: str, reason: str) -> None:
    """
    Update user status in database and broadcast change.

    Args:
        user_id: User ID to update
        new_status: New status value
        reason: Reason for status change
    """
    user = await get_user(user_id)
    if not user:
        return

    old_status = user.status

    # Don't update if status hasn't changed
    if old_status == new_status:
        return

    # Update in database
    async with aiosqlite.connect(db.db_path) as conn:
        await conn.execute(
            "UPDATE users SET status = ? WHERE user_id = ?",
            (new_status, user_id)
        )
        await conn.commit()

    print(f"Status updated: {user_id} ({user.role}): {old_status} → {new_status} (reason: {reason})")

    # Broadcast to dashboards
    await broadcast_status_change(
        user_id=user_id,
        role=user.role,
        old_status=old_status,
        new_status=new_status,
        reason=reason
    )


async def calculate_priority_score(user_id: str) -> int:
    """
    Calculate priority score (0-100) for a civilian needing help.

    Scoring factors:
    - Base: 50 points
    - Medical keywords (+15 each, max 30)
    - Multiple victims (+10)
    - Time freshness (+20 max, decays over time)
    - Danger zone proximity (+5-25 based on severity)

    Args:
        user_id: Civilian user ID

    Returns:
        Priority score from 0 to 100
    """
    user = await get_user(user_id)
    if not user or not user.calls:
        return 50  # Base score

    score = 50  # Base score

    # Get latest call
    latest_call = user.calls[-1]
    transcript = latest_call.transcript.lower()
    tags = [tag.lower() for tag in latest_call.tags] if latest_call.tags else []

    # Check medical keywords in transcript and tags
    medical_count = 0
    for lang_keywords in MEDICAL_KEYWORDS.values():
        for keyword in lang_keywords:
            if keyword in transcript or keyword in tags:
                medical_count += 1
                if medical_count >= 2:  # Cap at 2 keywords
                    break
        if medical_count >= 2:
            break

    score += min(medical_count * 15, 30)

    # Check for multiple victims (numbers or "people")
    multiple_victim_indicators = ['people', 'victims', 'injured', 'kişi', 'yaralı', '2', '3', '4', '5']
    if any(indicator in transcript or indicator in tags for indicator in multiple_victim_indicators):
        score += 10

    # Time freshness (decays over 1 hour)
    current_time = time.time()
    time_since_call = current_time - latest_call.end_time
    freshness_score = max(0, 20 - (time_since_call / 180))  # Decay over 3600 seconds (1 hour)
    score += int(freshness_score)

    # Danger zone proximity
    if user.location_history:
        latest_loc = get_latest_location(user.location_history)
        if latest_loc:
            danger_zones = await list_danger_zones()
            for zone in danger_zones:
                if zone['is_active']:
                    distance = haversine_distance(latest_loc.lat, latest_loc.lon, zone['lat'], zone['lon'])
                    if distance < 1000:  # Within 1km
                        proximity_score = zone['severity'] * 5  # 5-25 points based on severity (1-5)
                        score += proximity_score
                        break  # Only count closest danger zone

    return min(score, 100)  # Cap at 100


async def infer_civilian_status(user_id: str) -> Optional[str]:
    """
    Infer new status for a civilian based on current state.

    Status flow:
    normal → needs_help → help_coming → at_incident → in_transport → at_hospital

    Args:
        user_id: Civilian user ID

    Returns:
        New status string or None if no change
    """
    user = await get_user(user_id)
    if not user or user.role != 'civilian':
        return None

    current_status = user.status
    assignment = await get_active_assignment(user_id, 'civilian')

    # Rule 1: normal → needs_help (priority keywords in latest call)
    if current_status == 'normal' and user.calls:
        latest_call = user.calls[-1]
        tags = [tag.lower() for tag in latest_call.tags] if latest_call.tags else []
        transcript = latest_call.transcript.lower()

        # Check for priority keywords
        has_priority = False
        for lang_keywords in PRIORITY_KEYWORDS.values():
            if any(keyword in transcript or keyword in tags for keyword in lang_keywords):
                has_priority = True
                break

        if has_priority:
            await update_user_status(user_id, 'needs_help', 'priority_keywords_detected')
            return 'needs_help'

    # Rule 2: needs_help → help_coming (has assignment + responder en_route)
    if current_status == 'needs_help' and assignment:
        responder = await get_other_user_in_assignment(assignment, user_id)
        if responder and responder.status == 'en_route_to_civ':
            await update_user_status(user_id, 'help_coming', 'responder_assigned')
            return 'help_coming'

    # Rule 3: help_coming → at_incident (responder on_scene + proximity < 50m)
    if current_status == 'help_coming' and assignment:
        responder = await get_other_user_in_assignment(assignment, user_id)
        if responder and responder.status == 'on_scene':
            if user.location_history and responder.location_history:
                civ_loc = get_latest_location(user.location_history)
                resp_loc = get_latest_location(responder.location_history)
                if civ_loc and resp_loc:
                    distance = haversine_distance(civ_loc.lat, civ_loc.lon, resp_loc.lat, resp_loc.lon)
                    if distance < 50:
                        await update_user_status(user_id, 'at_incident', 'responder_arrived')
                        return 'at_incident'

    # Rule 4: at_incident → in_transport (both moving > 5 m/s + proximity < 20m)
    if current_status == 'at_incident' and assignment:
        responder = await get_other_user_in_assignment(assignment, user_id)
        if responder and user.location_history and responder.location_history:
            civ_velocity = calculate_velocity(user.location_history, window_seconds=60)
            resp_velocity = calculate_velocity(responder.location_history, window_seconds=60)

            if civ_velocity > 5 and resp_velocity > 5:
                civ_loc = get_latest_location(user.location_history)
                resp_loc = get_latest_location(responder.location_history)
                if civ_loc and resp_loc:
                    distance = haversine_distance(civ_loc.lat, civ_loc.lon, resp_loc.lat, resp_loc.lon)
                    if distance < 20:
                        await update_user_status(user_id, 'in_transport', 'moving_with_responder')
                        return 'in_transport'

    # Rule 5: in_transport → at_hospital (near hospital < 100m + stationary)
    if current_status == 'in_transport' and user.location_history:
        hospitals = await list_hospitals()
        if hospitals:
            latest_loc = get_latest_location(user.location_history)
            if latest_loc:
                nearest_hospital = find_nearest_hospital(latest_loc.lat, latest_loc.lon, hospitals)
                if nearest_hospital and nearest_hospital['distance'] < 100:
                    if is_stationary(user.location_history, threshold_meters=20, window_seconds=120):
                        await update_user_status(user_id, 'at_hospital', 'arrived_at_hospital')
                        return 'at_hospital'

    return None


async def infer_responder_status(user_id: str) -> Optional[str]:
    """
    Infer new status for a first responder based on current state.

    Status flow:
    roaming ↔ docked → en_route_to_civ → on_scene → en_route_to_hospital → docked

    Args:
        user_id: Responder user ID

    Returns:
        New status string or None if no change
    """
    user = await get_user(user_id)
    if not user or user.role != 'first_responder':
        return None

    current_status = user.status
    assignment = await get_active_assignment(user_id, 'first_responder')

    # No assignment cases
    if not assignment:
        # Rule: Moving > 2 m/s without assignment → roaming
        if user.location_history:
            velocity = calculate_velocity(user.location_history, window_seconds=60)
            if velocity > 2:
                if current_status != 'roaming':
                    await update_user_status(user_id, 'roaming', 'moving_without_assignment')
                    return 'roaming'

            # Rule: Near hospital < 100m + stationary + no assignment → docked
            hospitals = await list_hospitals()
            if hospitals:
                latest_loc = get_latest_location(user.location_history)
                if latest_loc:
                    nearest_hospital = find_nearest_hospital(latest_loc.lat, latest_loc.lon, hospitals)
                    if nearest_hospital and nearest_hospital['distance'] < 100:
                        if is_stationary(user.location_history, threshold_meters=20, window_seconds=120):
                            if current_status != 'docked':
                                await update_user_status(user_id, 'docked', 'at_hospital_idle')
                                return 'docked'
        return None

    # Has assignment cases
    civilian = await get_other_user_in_assignment(assignment, user_id)
    if not civilian:
        return None

    # Rule 1: (roaming/docked) → en_route_to_civ (assignment + moving > 2 m/s)
    if current_status in ['roaming', 'docked'] and user.location_history:
        velocity = calculate_velocity(user.location_history, window_seconds=60)
        if velocity > 2:
            await update_user_status(user_id, 'en_route_to_civ', 'dispatched')
            return 'en_route_to_civ'

    # Rule 2: en_route_to_civ → on_scene (proximity < 50m + stationary)
    if current_status == 'en_route_to_civ' and user.location_history and civilian.location_history:
        resp_loc = get_latest_location(user.location_history)
        civ_loc = get_latest_location(civilian.location_history)
        if resp_loc and civ_loc:
            distance = haversine_distance(resp_loc.lat, resp_loc.lon, civ_loc.lat, civ_loc.lon)
            if distance < 50 and is_stationary(user.location_history, threshold_meters=20, window_seconds=60):
                await update_user_status(user_id, 'on_scene', 'arrived_at_civilian')
                return 'on_scene'

    # Rule 3: on_scene → en_route_to_hospital (moving > 5 m/s + civilian in proximity)
    if current_status == 'on_scene' and user.location_history:
        velocity = calculate_velocity(user.location_history, window_seconds=60)
        if velocity > 5 and civilian.location_history:
            resp_loc = get_latest_location(user.location_history)
            civ_loc = get_latest_location(civilian.location_history)
            if resp_loc and civ_loc:
                distance = haversine_distance(resp_loc.lat, resp_loc.lon, civ_loc.lat, civ_loc.lon)
                if distance < 20:
                    await update_user_status(user_id, 'en_route_to_hospital', 'transporting_civilian')
                    return 'en_route_to_hospital'

    # Rule 4: en_route_to_hospital → docked (near hospital < 100m + stationary)
    if current_status == 'en_route_to_hospital' and user.location_history:
        hospitals = await list_hospitals()
        if hospitals:
            latest_loc = get_latest_location(user.location_history)
            if latest_loc:
                nearest_hospital = find_nearest_hospital(latest_loc.lat, latest_loc.lon, hospitals)
                if nearest_hospital and nearest_hospital['distance'] < 100:
                    if is_stationary(user.location_history, threshold_meters=20, window_seconds=120):
                        # Complete the assignment
                        async with aiosqlite.connect(db.db_path) as conn:
                            await conn.execute(
                                "UPDATE assignments SET is_active = 0, completed_at = ? WHERE assignment_id = ?",
                                (time.time(), assignment['assignment_id'])
                            )
                            await conn.commit()

                        await update_user_status(user_id, 'docked', 'delivered_to_hospital')
                        return 'docked'

    return None


async def infer_all_statuses() -> None:
    """
    Run status inference for all users.
    Called periodically by background task.
    """
    # Get all users
    async with aiosqlite.connect(db.db_path) as conn:
        async with conn.execute("SELECT user_id, role FROM users") as cursor:
            users = await cursor.fetchall()

    for user_id, role in users:
        try:
            if role == 'civilian':
                await infer_civilian_status(user_id)
            elif role == 'first_responder':
                await infer_responder_status(user_id)
        except Exception as e:
            print(f"Error inferring status for {user_id}: {e}")
