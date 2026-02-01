# Status Inference System

Automatic status tracking and management for civilians and first responders in the disaster response system.

## Overview

The status inference system automatically transitions user statuses based on real-time data (calls, locations, assignments) without requiring manual updates. It enables intelligent dispatch coordination and situational awareness.

## Status Flows

### Civilian Status Flow

```
normal → needs_help → help_coming → at_incident → in_transport → at_hospital
```

| Status | Description | Entry Conditions |
|--------|-------------|------------------|
| `normal` | Default state | Initial user creation |
| `needs_help` | Emergency detected | Priority keyword in call transcript/tags |
| `help_coming` | Assigned to responder | Has active assignment + responder en_route |
| `at_incident` | Responder arrived | Responder on_scene + proximity < 50m |
| `in_transport` | Being transported | Both moving > 5 m/s + proximity < 20m |
| `at_hospital` | Delivered to hospital | Near hospital < 100m + stationary |

### First Responder Status Flow

```
roaming ↔ docked → en_route_to_civ → on_scene → en_route_to_hospital → docked
```

| Status | Description | Entry Conditions |
|--------|-------------|------------------|
| `roaming` | Moving without assignment | Velocity > 2 m/s + no assignment |
| `docked` | At hospital, idle | Near hospital < 100m + stationary + no assignment |
| `en_route_to_civ` | Dispatched to civilian | Assignment + moving > 2 m/s |
| `on_scene` | Arrived at incident | Proximity < 50m to civilian + stationary |
| `en_route_to_hospital` | Transporting patient | Moving > 5 m/s + civilian in proximity < 20m |

## Core Components

### 1. `geo_utils.py` - Geospatial Utilities

**Functions:**
- `haversine_distance(lat1, lon1, lat2, lon2) → meters` - Great circle distance
- `calculate_velocity(location_history, window_seconds) → m/s` - Recent velocity
- `is_stationary(location_history, threshold, window) → bool` - Check if stationary
- `find_nearest_hospital(lat, lon, hospitals) → hospital` - Find closest hospital
- `get_latest_location(location_history) → LocationPoint` - Most recent location

**Key Parameters:**
- Stationary threshold: 20 meters over 120 seconds
- Velocity window: 60 seconds (recent movement)
- Hospital proximity: 100 meters
- Incident proximity: 50 meters (civilian-responder)
- Transport proximity: 20 meters (moving together)

### 2. `status_inference.py` - Inference Engine

**Priority Keywords (Bilingual EN/TR):**
```python
PRIORITY_KEYWORDS = {
    'en': ['help', 'emergency', 'trapped', 'fire', 'injured', ...],
    'tr': ['yardım', 'acil', 'mahsur', 'yangın', 'yaralı', ...]
}

MEDICAL_KEYWORDS = {
    'en': ['bleeding', 'unconscious', 'heart', 'breathing', ...],
    'tr': ['kanama', 'baygın', 'kalp', 'nefes', ...]
}
```

**Core Functions:**
- `infer_civilian_status(user_id) → new_status | None` - Civilian transitions
- `infer_responder_status(user_id) → new_status | None` - Responder transitions
- `calculate_priority_score(user_id) → 0-100` - Urgency scoring
- `update_user_status(user_id, new_status, reason)` - Update & broadcast
- `infer_all_statuses()` - Batch inference (periodic background task)

**Priority Scoring Algorithm:**
```
Base: 50 points
+ Medical keywords (15 each, max 30)
+ Multiple victims (+10)
+ Time freshness (+20 max, decays over 1 hour)
+ Danger zone proximity (+5-25 based on severity 1-5)
= Total: 0-100
```

### 3. `assignment_client.py` - Assignment Tracking

**Database Table:**
```sql
assignments (
    assignment_id TEXT PRIMARY KEY,
    civilian_id TEXT NOT NULL,
    responder_id TEXT NOT NULL,
    assigned_at REAL NOT NULL,
    completed_at REAL,
    is_active INTEGER DEFAULT 1
)
```

**API Endpoints:**

**POST `/api/assignments`** - Create assignment (manual dispatch)
```json
Request: {
    "civilian_id": "civ_001",
    "responder_id": "resp_001"
}

Response: {
    "ok": true,
    "assignment_id": "abc123...",
    "civilian_id": "civ_001",
    "responder_id": "resp_001",
    "assigned_at": 1738479600.123
}
```

**GET `/api/assignments`** - List all assignments
- Query param: `?active=true` (filter to active only)

**GET `/api/assignments/active`** - Get active assignments only

**GET `/api/assignments/{assignment_id}`** - Get specific assignment

**PUT `/api/assignments/{assignment_id}/complete`** - Mark assignment complete

### 4. Integration Points

**phone_client.py** - Location & Call Hooks
```python
# After saving call transcript
asyncio.create_task(infer_civilian_status(user_id))

# After saving location update
if user.role == 'civilian':
    asyncio.create_task(infer_civilian_status(user_id))
elif user.role == 'first_responder':
    asyncio.create_task(infer_responder_status(user_id))
```

**server.py** - Background Status Checker
```python
async def status_checker_task():
    await asyncio.sleep(10)  # Wait for DB init
    while True:
        try:
            await infer_all_statuses()
        except Exception as e:
            print(f"Error in status checker: {e}")
        await asyncio.sleep(30)  # Run every 30 seconds
```

**dashboard_ws.py** - Real-time Broadcasts
```python
async def broadcast_status_change(user_id, role, old_status, new_status, reason):
    """Broadcast status changes to all connected dashboards."""
    await broadcast_event("status_changed", {
        "user_id": user_id,
        "role": role,
        "old_status": old_status,
        "new_status": new_status,
        "reason": reason,
        "timestamp": ...
    })
```

## Event Triggers

| Event | Where | What Infers |
|-------|-------|-------------|
| Call received | `phone_client.py` after saving | Civilian status (normal → needs_help) |
| Location update | `phone_client.py` after saving | Both civilian and responder (proximity checks) |
| Assignment created | `assignment_client.py` POST handler | Both users (→ help_coming, → en_route) |
| Background timer | `server.py` every 30s | All users (catch missed transitions) |

## WebSocket Messages

**Status Change Event:**
```json
{
    "type": "status_changed",
    "data": {
        "user_id": "civ_001",
        "role": "civilian",
        "old_status": "needs_help",
        "new_status": "help_coming",
        "reason": "responder_assigned",
        "timestamp": 1738479600.123
    }
}
```

Dashboards subscribe to `/ws/dashboard` to receive real-time updates.

## Priority Score API

**GET `/api/priorities`** - Get priority scores for civilians needing help

```json
Response: {
    "ok": true,
    "count": 3,
    "priorities": [
        {
            "user_id": "civ_003",
            "priority_score": 95
        },
        {
            "user_id": "civ_001",
            "priority_score": 85
        },
        {
            "user_id": "civ_002",
            "priority_score": 72
        }
    ]
}
```

Results are sorted by priority score descending (highest urgency first).

## Example Scenarios

### Scenario 1: Emergency Call
```
1. Civilian calls: "Help! Fire! Trapped!"
2. Tags extracted: ["help", "fire", "trapped"]
3. Status inference triggered
4. Priority keywords detected → status = needs_help
5. Priority score calculated: 85/100
6. WebSocket broadcasts status_changed event
7. Dispatcher sees high-priority civilian in dashboard
```

### Scenario 2: Dispatch & Response
```
1. Dispatcher creates assignment (civ_001 → resp_001)
2. Inference triggered for both users
3. Responder moving (8 m/s) → status = en_route_to_civ
4. Civilian status updates → help_coming
5. Location updates show proximity decreasing
6. Proximity < 50m + responder stationary → status = on_scene
7. Civilian status updates → at_incident
8. Both statuses broadcast via WebSocket
```

### Scenario 3: Transport to Hospital
```
1. Both locations show movement (15 m/s)
2. Proximity check: 12m apart (together)
3. Responder status → en_route_to_hospital
4. Civilian status → in_transport
5. Approaching hospital (distance < 100m)
6. Both stationary for 2 minutes
7. Responder status → docked
8. Civilian status → at_hospital
9. Assignment automatically marked complete
10. Status changes broadcast
```

## Design Decisions

1. **Event-driven + Periodic**: Triggers on data changes (calls, locations, assignments) + 30s background check for missed transitions
2. **Proximity thresholds**: Conservative values (50m incident, 20m transport, 100m hospital)
3. **Velocity windows**: 60s window for recent movement patterns
4. **Assignment completion**: Automatic when responder docks at hospital after transport
5. **Priority scoring**: Multi-factor with time decay to prioritize recent emergencies
6. **Bilingual support**: English + Turkish keywords for Turkey earthquake context
7. **Async tasks**: Non-blocking inference via `asyncio.create_task()`
8. **WebSocket broadcasts**: Real-time dashboard updates for all status changes
9. **Manual dispatch**: System tracks but doesn't auto-assign (dispatcher control)
10. **Status idempotency**: Won't update if status unchanged (prevents spam)

## Database Schema Changes

**Added Table:**
```sql
CREATE TABLE assignments (
    assignment_id TEXT PRIMARY KEY,
    civilian_id TEXT NOT NULL,
    responder_id TEXT NOT NULL,
    assigned_at REAL NOT NULL,
    completed_at REAL,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (civilian_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (responder_id) REFERENCES users (user_id) ON DELETE CASCADE
)
```

Updated `postgres.py`:
- Added assignments table to `init_db()`
- Added assignments cleanup to `wipe_db()`

## Testing

Run the test suite:
```bash
cd data_server
python3 test_status_inference.py
```

Tests cover:
1. Civilian emergency call → needs_help transition
2. Priority score calculation (> 50 with keywords)
3. First responder creation and status

## Performance Considerations

- **Background task**: 30s interval balances responsiveness vs CPU usage
- **Async tasks**: Non-blocking inference prevents request delays
- **Proximity checks**: Only run when both users have location history
- **Velocity calculations**: Use 60s window (not full history) for efficiency
- **Priority scores**: Only calculated on-demand via API (not stored)

## Future Enhancements

- [ ] Automatic dispatch based on priority scores + responder availability
- [ ] Event clustering (multiple civilians in same danger zone)
- [ ] Connection monitoring (detect stale location data)
- [ ] Historical status analytics
- [ ] Configurable thresholds (proximity, velocity, time windows)
- [ ] Machine learning for priority scoring refinement
- [ ] Multi-responder assignments (team dispatch)
- [ ] Status rollback handling (edge cases)

## Related Files

- `geo_utils.py` - Geospatial utility functions
- `status_inference.py` - Core inference engine
- `assignment_client.py` - Assignment API endpoints
- `phone_client.py` - Location/call event hooks
- `server.py` - Background task setup
- `dashboard_ws.py` - WebSocket broadcasts
- `database/postgres.py` - Database schema updates
- `test_status_inference.py` - Test suite

## API Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/assignments` | Create assignment |
| GET | `/api/assignments` | List all assignments |
| GET | `/api/assignments/active` | List active assignments |
| GET | `/api/assignments/{id}` | Get specific assignment |
| PUT | `/api/assignments/{id}/complete` | Complete assignment |
| GET | `/api/priorities` | Get priority scores |
| WS | `/ws/dashboard` | Subscribe to status changes |

---

**Built for iChack 2026** - Automatic status tracking for intelligent disaster response coordination.
