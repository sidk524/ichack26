# Server Connection Guide

Connect the front-end to the Python server on GCP.

## Quick Start

### 1. Set Environment Variables

```env
NEXT_PUBLIC_API_URL=https://your-gcp-server.run.app
NEXT_PUBLIC_WS_URL=wss://your-gcp-server.run.app
```

### 2. Enable WebSocket (optional)

In `hooks/use-server-websocket.ts`:

```typescript
const WEBSOCKET_ENABLED = true
```

That's it. Components already fetch via `api.*` methods.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Front-end                            │
├─────────────────────────────────────────────────────────────┤
│  types/api.ts                 → Shared TypeScript types     │
│  lib/api.ts                   → REST API client             │
│  hooks/use-server-websocket.ts → WebSocket streaming        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Python Server (GCP)                     │
├─────────────────────────────────────────────────────────────┤
│  WS  /phone_location_in   → Receives location stream        │
│  WS  /phone_transcript_in → Receives call transcripts       │
│  REST /api/incidents      → Incident CRUD                   │
│  REST /api/units          → Responder units                 │
│  REST /api/hospitals      → Hospital data                   │
│  REST /api/stats          → Dashboard statistics            │
└─────────────────────────────────────────────────────────────┘
```

---

## REST API Endpoints

### GET /api/incidents

```json
[
  {
    "id": "INC-001",
    "type": "fire" | "medical" | "rescue" | "flood" | "accident" | "other",
    "location": "123 Main St",
    "coordinates": { "lat": 37.7749, "lon": -122.4194 },
    "severity": 1-5,
    "status": "new" | "dispatched" | "in_progress" | "resolved",
    "reportedAt": "2m",
    "assignedUnits": ["Unit-1", "Unit-2"],
    "description": "Building fire reported"
  }
]
```

### GET /api/units

```json
[
  {
    "id": 1,
    "unitName": "Engine 1",
    "unitType": "Ambulance" | "Fire Truck" | "Police" | "Rescue" | "Hazmat" | "Medical",
    "status": "Available" | "Responding" | "On Scene" | "Returning" | "Offline",
    "location": "Station 4",
    "eta": "8 min",
    "assignedIncident": "INC-001" | "Unassigned"
  }
]
```

### GET /api/hospitals

```json
[
  {
    "id": "H-001",
    "name": "Central Hospital",
    "distance": 4.2,
    "status": "accepting" | "limited" | "diverting" | "closed",
    "erAvailable": 8,
    "icuAvailable": 2,
    "specialties": ["Trauma", "Cardiac"]
  }
]
```

### GET /api/hospitals/:id/capacity

```json
[
  { "id": "er", "name": "Emergency", "total": 40, "available": 8, "pending": 3 },
  { "id": "icu", "name": "ICU", "total": 24, "available": 2, "pending": 2 }
]
```

### GET /api/hospitals/:id/incoming

```json
[
  {
    "id": 1,
    "unit": "Medic 7",
    "eta": 3,
    "severity": "critical" | "high" | "moderate" | "low",
    "condition": "Crush injury",
    "needs": "Surgery"
  }
]
```

### GET /api/stats

```json
{
  "activeIncidents": 47,
  "incidentsTrend": 23.5,
  "peopleInDanger": 8420,
  "peopleTrend": -8.2,
  "respondersDeployed": 312,
  "respondersTrend": 45.0,
  "resourcesAvailable": 28,
  "resourcesTrend": -32.0
}
```

---

## WebSocket Payloads

### Location Stream → `/phone_location_in`

```json
{
  "user_id": "session_1706745600000_abc123def",
  "data": {
    "lat": 37.7749,
    "lon": -122.4194,
    "timestamp": 1706745600000,
    "accuracy": 10
  }
}
```

### Transcript Stream → `/phone_transcript_in`

```json
{
  "user_id": "session_1706745600000_abc123def",
  "data": {
    "transcript": {
      "text": "I need help, there's a fire",
      "is_final": true
    }
  }
}
```

---

## Component → API Mapping

| Component | Fetches From |
|-----------|--------------|
| `IncidentFeed` | `api.incidents.list()` |
| `ResponderCards` | `api.stats.get()` |
| `DataTable` | `api.units.list()` |
| `HospitalNetwork` | `api.hospitals.list()` |
| `HospitalCapacity` | `api.hospitals.getCapacity(id)` |
| `HospitalDashboard` | `api.hospitals.getIncomingPatients(id)` |
| `EmergencyCall` | WebSocket streams location + transcript |

---

## Mock Mode

To use mock data (for development without server):

In `lib/api.ts`:
```typescript
const USE_MOCK_DATA = true
```

In `hooks/use-server-websocket.ts`:
```typescript
const WEBSOCKET_ENABLED = false
```
