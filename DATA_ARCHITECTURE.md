# Data Server Architecture

## What We Collect (Raw Data)

| Source | What It Is | Example |
|--------|-----------|---------|
| **Phone Calls** | Transcripts from civilians calling for help | "I'm trapped on the second floor, there's smoke everywhere" |
| **GPS Locations** | Where users are and where they've been | Lat/lon coordinates every few seconds |
| **News Feeds** | Articles about disasters and events | "Flooding reported in downtown area" |
| **IoT Sensors** | Environmental readings from deployed devices | Temperature, vibration, sound levels |

---

## What AI Extracts (Smart Analysis)

### From Phone Transcripts → Person's Situation

The AI reads what someone said and figures out:

- **How urgent is this?** (1-5 scale)
- **What do they need?** (medical help, evacuation, translation, shelter)
- **What's their status?** (safe, needs help, already receiving help)
- **What language are they speaking?**
- **Are they mentioning specific locations?** ("I'm near the bridge")
- **Medical keywords?** (bleeding, chest pain, unconscious)

**Example:**

> Transcript: "Please help, my grandmother fell and she's not moving, we're at 45 Oak Street"

AI extracts:
- Status: **needs_help**
- Urgency: **5 (critical)**
- Needs: **medical**
- Location mentioned: **45 Oak Street**
- Medical keywords: **fell, not moving**

---

### From GPS Trails → Movement Patterns

The AI looks at location history and calculates:

- **Is this person moving or stationary?**
- **How fast are they going?** (walking, driving, ambulance speed)
- **What direction?**
- **ETA to destination?**
- **Are they heading toward or away from danger zones?**

**Example:**

> First responder GPS shows movement at 60mph heading northeast

AI extracts:
- Job status: **en route to civilian**
- ETA: **4 minutes**
- Vehicle type: **ambulance** (based on speed + role)

---

### From News Articles → Danger Zones

The AI reads news and creates map overlays:

- **What type of disaster?** (flood, fire, shooting, protest, etc.)
- **How severe?** (1-5 scale)
- **Where exactly?** (center point + radius)
- **Is it still ongoing?**
- **How long will it last?**
- **What should people do?** (evacuate, shelter in place, avoid area)

**Example:**

> News: "Gas leak forces evacuation of 3-block radius near Main St and 5th Ave"

AI extracts:
- Type: **infrastructure / gas leak**
- Severity: **4**
- Location: **Main St & 5th Ave**
- Radius: **300 meters**
- Action: **evacuate**

---

### From Sensor Data → Automatic Alerts

The AI monitors sensor patterns and detects:

| Pattern | Alert |
|---------|-------|
| High temperature + loud high-frequency sound | **Fire detected** |
| Sudden strong vibration | **Earthquake / explosion** |
| Sharp loud bang in specific frequency | **Possible gunshot** |
| Sensor goes offline | **Power/comms outage in area** |
| Gradual structural shift | **Building instability** |

---

## What the Frontend Shows

### For Civilians
- **Their status** on the map (safe / needs help / help coming)
- **Incoming responder** with live location and ETA
- **Danger zones** to avoid (color-coded by severity)
- **Nearby shelters** with capacity info

### For First Responders
- **Assigned civilian** location and needs
- **Optimal route** avoiding danger zones
- **Other responders** nearby
- **Hospital capacity** to know where to go

### For Hospitals / Command
- **All active incidents** on map
- **Responder fleet status** (who's available, who's busy)
- **Incoming patients** with ETA and condition preview
- **Resource strain** across the system

---

## The Pipeline

```
COLLECT                 ANALYZE                  DISPLAY
───────                 ───────                  ───────

Phone calls ──┐                              ┌──► Civilian markers
              │                              │
GPS tracks ───┼──► Claude AI ──► Entities ───┼──► Responder tracking
              │    extracts      (smart      │
News feeds ───┤    meaning       data)       ├──► Danger zone overlays
              │                              │
Sensors ──────┘                              └──► Infrastructure alerts
```

---

## Status Types

### Civilian Status

| Status | Meaning |
|--------|---------|
| `normal` | Safe, no assistance needed |
| `needs_help` | Requesting assistance |
| `help_coming` | Responder assigned and en route |
| `at_incident` | Responder arrived, being helped |
| `in_transport` | In ambulance heading to hospital |
| `at_hospital` | Arrived at medical facility |

### Responder Status

| Status | Meaning |
|--------|---------|
| `roaming` | Available, patrolling |
| `docked` | At hospital/station |
| `en_route_to_civ` | Driving to help someone |
| `on_scene` | At incident location |
| `en_route_to_hospital` | Transporting patient |

### Danger Zone Types

| Category | Examples |
|----------|----------|
| **Natural** | Earthquake, flood, fire, tsunami, drought |
| **People** | Shooting, stabbing, protest, riot, terrorism |
| **Infrastructure** | Power outage, water outage, cell down, structural damage |

---

## Database Schema

```
┌──────────────────────┐       ┌──────────────────────────────┐
│       users          │       │      location_points         │
├──────────────────────┤       ├──────────────────────────────┤
│ * user_id    TEXT    │◄──────│   id          INTEGER        │
│   role       TEXT    │       │   user_id     TEXT           │
│   created_at REAL    │       │   lat         REAL           │
└──────────────────────┘       │   lon         REAL           │
         │                     │   timestamp   REAL           │
         │                     │   accuracy    REAL           │
         │                     └──────────────────────────────┘
         │
         │                     ┌──────────────────────────────┐
         │                     │         calls                │
         └────────────────────►├──────────────────────────────┤
                               │ * call_id     TEXT           │
                               │   user_id     TEXT           │
                               │   transcript  TEXT           │
                               │   start_time  REAL           │
                               │   end_time    REAL           │
                               └──────────────────────────────┘

┌──────────────────────────────┐    ┌──────────────────────────────┐
│      news_articles           │    │      sensor_readings         │
├──────────────────────────────┤    ├──────────────────────────────┤
│ * article_id    TEXT         │    │ * reading_id    TEXT         │
│   link          TEXT         │    │   status        INTEGER      │
│   title         TEXT         │    │   temperature   REAL         │
│   pub_date      TEXT         │    │   humidity      REAL         │
│   disaster      INTEGER      │    │   accel_x/y/z   REAL         │
│   location_name TEXT         │    │   gyro_x/y/z    REAL         │
│   received_at   REAL         │    │   mic_amplitude REAL         │
│   lat, lon      REAL         │    │   mic_frequency REAL         │
└──────────────────────────────┘    │   received_at   REAL         │
                                    └──────────────────────────────┘
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/phone_transcript_in` | WebSocket | Receive phone call transcripts |
| `/phone_location_in` | WebSocket | Receive GPS location updates |
| `/news_information_in` | POST | Receive news articles |
| `/sensor_information_in` | POST | Receive sensor readings |
| `/danger_entities_out` | GET | Retrieve processed danger entities |
| `/health` | GET | System health check |
