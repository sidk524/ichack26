# Phone Client WebSocket Schema

## Overview

Real-time bidirectional WebSocket communication between Phone Client and Central Server.

```
Phone Client ←──WebSocket──→ Central Server
     │                            │
     │  [transcript_chunk]  ───→  │
     │  [location_update]   ───→  │
     │  [call_start]        ───→  │
     │  [call_end]          ───→  │
     │                            │
     │  ←───  [chunk_ack]         │
     │  ←───  [extracted_info]    │
     │  ←───  [summary_update]    │
     │  ←───  [error]             │
```

---

## Client → Server Messages

### 1. call_start
Sent when user initiates emergency call.

```json
{
  "type": "call_start",
  "message_id": "msg_uuid_123",
  "timestamp": "2026-01-31T16:00:00.000Z",
  "data": {
    "person_id": "person_uuid_456",
    "device": {
      "platform": "iOS",
      "browser": "Safari",
      "user_agent": "Mozilla/5.0..."
    },
    "initial_location": {
      "lat": 51.507351,
      "lng": -0.127758,
      "altitude": 25.5,
      "accuracy": 10.0,
      "altitude_accuracy": 5.0,
      "heading": 45.0,
      "speed": 0.0,
      "timestamp": "2026-01-31T16:00:00.000Z",
      "source": "gps"
    }
  }
}
```

### 2. transcript_chunk
Sent for each speech transcript from ElevenLabs.

```json
{
  "type": "transcript_chunk",
  "message_id": "msg_uuid_124",
  "timestamp": "2026-01-31T16:00:05.123Z",
  "data": {
    "person_id": "person_uuid_456",
    "chunk_index": 0,

    "transcript": {
      "text": "There's a fire at the warehouse on Main Street",
      "is_final": true,
      "language": "en",
      "confidence": 0.95
    },

    "location": {
      "lat": 51.507351,
      "lng": -0.127758,
      "altitude": 25.5,
      "accuracy": 10.0,
      "altitude_accuracy": 5.0,
      "heading": 45.0,
      "speed": 1.2,
      "timestamp": "2026-01-31T16:00:05.000Z",
      "source": "gps"
    },

    "elevenlabs": {
      "conversation_id": "conv_abc123",
      "user_transcript": "There's a fire at the warehouse on Main Street",
      "is_final": true
    }
  }
}
```

### 3. agent_response
Sent when AI agent responds (for logging/analysis).

```json
{
  "type": "agent_response",
  "message_id": "msg_uuid_125",
  "timestamp": "2026-01-31T16:00:07.456Z",
  "data": {
    "person_id": "person_uuid_456",
    "chunk_index": 1,

    "agent": {
      "text": "I understand there's a fire. Can you tell me the exact address?",
      "conversation_id": "conv_abc123"
    },

    "location": {
      "lat": 51.507351,
      "lng": -0.127758,
      "altitude": 25.5,
      "accuracy": 10.0,
      "altitude_accuracy": 5.0,
      "heading": 45.0,
      "speed": 0.0,
      "timestamp": "2026-01-31T16:00:07.000Z",
      "source": "gps"
    }
  }
}
```

### 4. location_update
Sent periodically for live tracking (even without speech).

```json
{
  "type": "location_update",
  "message_id": "msg_uuid_126",
  "timestamp": "2026-01-31T16:00:10.000Z",
  "data": {
    "person_id": "person_uuid_456",

    "location": {
      "lat": 51.507355,
      "lng": -0.127760,
      "altitude": 25.5,
      "accuracy": 8.0,
      "altitude_accuracy": 5.0,
      "heading": 90.0,
      "speed": 2.5,
      "timestamp": "2026-01-31T16:00:10.000Z",
      "source": "gps"
    },

    "movement": {
      "distance_from_start": 15.2,
      "total_distance": 45.6,
      "average_speed": 1.8
    }
  }
}
```

### 5. call_end
Sent when user ends the call.

```json
{
  "type": "call_end",
  "message_id": "msg_uuid_127",
  "timestamp": "2026-01-31T16:05:00.000Z",
  "data": {
    "person_id": "person_uuid_456",
    "duration_seconds": 300,
    "total_chunks": 15,

    "final_location": {
      "lat": 51.507400,
      "lng": -0.127800,
      "altitude": 25.5,
      "accuracy": 5.0,
      "altitude_accuracy": 5.0,
      "heading": 180.0,
      "speed": 0.0,
      "timestamp": "2026-01-31T16:05:00.000Z",
      "source": "gps"
    },

    "elevenlabs": {
      "conversation_id": "conv_abc123"
    }
  }
}
```

### 6. heartbeat
Sent every 10 seconds to keep connection alive.

```json
{
  "type": "heartbeat",
  "message_id": "msg_uuid_128",
  "timestamp": "2026-01-31T16:00:30.000Z",
  "data": {
    "person_id": "person_uuid_456"
  }
}
```

---

## Server → Client Messages

### 1. chunk_ack
Acknowledgment of received transcript chunk.

```json
{
  "type": "chunk_ack",
  "message_id": "ack_uuid_001",
  "timestamp": "2026-01-31T16:00:05.150Z",
  "data": {
    "person_id": "person_uuid_456",
    "chunk_index": 0,
    "status": "received"
  }
}
```

### 2. extracted_info
Real-time extracted information from LLM analysis.

```json
{
  "type": "extracted_info",
  "message_id": "ext_uuid_001",
  "timestamp": "2026-01-31T16:00:06.000Z",
  "data": {
    "person_id": "person_uuid_456",

    "extraction": {
      "location": "Warehouse on Main Street",
      "location_details": "Near the intersection with Oak Ave",
      "disaster_type": "fire",
      "severity": "high",
      "injuries_reported": 0,
      "people_trapped": 2,
      "hazards": ["fire", "smoke", "structural_damage"],
      "resources_needed": ["fire_truck", "ambulance"],
      "confidence": 0.87
    }
  }
}
```

### 3. summary_update
Broadcast to all clients when disaster summary changes.

```json
{
  "type": "summary_update",
  "message_id": "sum_uuid_001",
  "timestamp": "2026-01-31T16:00:10.000Z",
  "data": {
    "summary": {
      "total_callers": 5,
      "active_callers": 3,
      "overall_severity": "critical",
      "disaster_types": ["fire", "explosion"],
      "total_injuries": 3,
      "total_trapped": 5,
      "affected_areas": [
        {
          "location": "Main Street",
          "caller_count": 3,
          "max_severity": "critical"
        }
      ],
      "key_findings": [
        "Multiple callers report fire at warehouse",
        "Possible explosion reported",
        "5 people trapped on upper floors"
      ],
      "narrative_summary": "Active fire incident at warehouse on Main Street..."
    }
  }
}
```

### 4. heartbeat_ack
Response to client heartbeat.

```json
{
  "type": "heartbeat_ack",
  "message_id": "hb_ack_001",
  "timestamp": "2026-01-31T16:00:30.050Z",
  "data": {
    "server_time": "2026-01-31T16:00:30.050Z"
  }
}
```

### 5. error
Error response.

```json
{
  "type": "error",
  "message_id": "err_uuid_001",
  "timestamp": "2026-01-31T16:00:05.200Z",
  "data": {
    "code": "INVALID_MESSAGE",
    "message": "Missing required field: person_id",
    "original_message_id": "msg_uuid_123"
  }
}
```

---

## Location Object (Full Detail)

Maximum data from mobile devices:

```json
{
  "lat": 51.507351,
  "lng": -0.127758,
  "altitude": 25.5,
  "accuracy": 10.0,
  "altitude_accuracy": 5.0,
  "heading": 45.0,
  "speed": 2.5,
  "timestamp": "2026-01-31T16:00:00.000Z",
  "source": "gps",

  "raw": {
    "coords": {
      "latitude": 51.507351,
      "longitude": -0.127758,
      "altitude": 25.5,
      "accuracy": 10.0,
      "altitudeAccuracy": 5.0,
      "heading": 45.0,
      "speed": 2.5
    },
    "timestamp": 1706716800000
  }
}
```

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `lat` | float | Latitude in degrees | GPS |
| `lng` | float | Longitude in degrees | GPS |
| `altitude` | float? | Altitude in meters above sea level | GPS |
| `accuracy` | float | Horizontal accuracy in meters | GPS |
| `altitude_accuracy` | float? | Vertical accuracy in meters | GPS |
| `heading` | float? | Direction of travel (0-360°) | GPS |
| `speed` | float? | Speed in meters/second | GPS |
| `timestamp` | string | ISO 8601 timestamp | GPS |
| `source` | string | "gps", "network", "ip-fallback" | System |

**Notes:**
- iPhone provides all fields when outdoors
- Android similar, but altitude accuracy may be null
- Indoors: accuracy degrades, altitude/heading may be null
- IP fallback: only lat/lng with ~5km accuracy

---

## WebSocket Connection

### Endpoint
```
wss://server.com/ws/call/{person_id}
```

### Connection Flow
1. Client connects with person_id in URL
2. Server sends `connection_ack`
3. Client sends `call_start`
4. Client streams `transcript_chunk` and `location_update`
5. Server sends `chunk_ack`, `extracted_info`, `summary_update`
6. Client sends `call_end` when done
7. Connection closes

### Reconnection
- On disconnect, client waits 1s, 2s, 4s, 8s, 16s (exponential backoff)
- Max 5 attempts before showing error
- Resend any unacknowledged messages on reconnect

---

## Message ID Format

UUIDs for correlation:
- `msg_` prefix for client messages
- `ack_` prefix for acknowledgments
- `ext_` prefix for extracted info
- `sum_` prefix for summary updates
- `err_` prefix for errors
- `hb_` prefix for heartbeat
