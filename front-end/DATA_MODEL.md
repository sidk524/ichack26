# Disaster Response System - Data Model

## Mission
Help first responders, hospitals, and people in danger make **better decisions** to minimize damage and casualties through real-time coordination.

---

## Three Users

| User | Platform | Primary Goal |
|------|----------|--------------|
| **Person in Danger** | Phone (AI voice agent) | Get help, stay safe, provide info |
| **First Responder** | Next.js Dashboard | Dispatch units, prioritize incidents, navigate danger |
| **Hospital Worker** | Next.js Dashboard | Manage capacity, prepare for incoming, allocate resources |

---

## Core Workflow

```
PERSON CALLS → AI AGENT TALKS → DATABASE UPDATES → DASHBOARDS REACT
```

### Step-by-Step

1. **Person calls emergency line**
   - AI agent answers (ElevenLabs)
   - Phone GPS captured automatically

2. **AI extracts critical info through conversation**
   - What happened? (incident type)
   - How bad? (severity)
   - Anyone hurt? (victims, injuries)
   - Can you move? (trapped status)
   - Medical conditions? (special needs)

3. **AI creates/updates records in real-time**
   - New incident appears on responder dashboard
   - Caller status tracked
   - Severity auto-assessed

4. **AI gives survival instructions**
   - Stay low if smoke
   - Apply pressure to wound
   - Move to safe location
   - Help is X minutes away

5. **First responders see incident, dispatch units**
   - View on heatmap
   - Assign nearest appropriate unit
   - Track response

6. **Hospital sees incoming patients**
   - ETA and severity known in advance
   - Prepare resources before arrival
   - Manage capacity across network

---

## Data Foundation

### Core Entities

**Incident** - The central record
- Type, severity, status
- Location (GPS + address)
- Victims count
- Hazards present
- Assigned units
- Destination hospital

**Caller** - Person who reported/needs help
- Phone, name, location
- Trapped? Injured? Can move?
- Medical conditions
- People with them
- AI instructions given

**Responder Unit** - Ambulance, fire truck, etc.
- Type and capabilities
- Current location (real-time)
- Status (available → dispatched → on scene → transporting)
- Assigned incident
- ETA

**Hospital** - Medical facility
- Bed capacity by type (ER, ICU, general)
- Current occupancy
- Staff on duty
- Supply levels (blood, ventilators)
- Status (accepting / diverting / closed)
- Incoming patients

**Danger Zone** - Geographic area with threat
- Boundary (polygon)
- Threat level and type
- Active incidents count
- Evacuation status
- Safe routes

**AI Conversation** - Transcript and analysis
- Full message history
- Extracted facts
- Actions taken by AI
- Summary for responders

---

## Real-Time Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CALLER    │     │  DATABASE   │     │ DASHBOARDS  │
│   + AI      │────▶│  (Supabase) │────▶│  (Next.js)  │
└─────────────┘     └─────────────┘     └─────────────┘
     writes              stores            subscribes
                                          & displays
```

### What Each User Sees

**First Responder Dashboard**
- Incident feed (live, sorted by severity)
- Danger zone heatmap
- Unit status and locations
- Key metrics (response times, active incidents)
- Hospital capacity overview

**Hospital Dashboard**
- Own capacity metrics
- Incoming patients with ETAs
- Supply levels with alerts
- Network hospital status
- Resource request system

**Caller (via AI)**
- Voice guidance
- Status updates ("Help is 4 minutes away")
- Safety instructions
- Reassurance

---

## Key Design Principles

1. **Single source of truth** - All data in one database, all users see same reality
2. **Real-time updates** - Changes propagate instantly via subscriptions
3. **AI as data entry** - Conversation extracts structured data, no forms needed
4. **Severity-driven priority** - Everything sorted by urgency
5. **Location-centric** - GPS is foundation for dispatch and routing
6. **Capacity awareness** - Know resources before they're needed
