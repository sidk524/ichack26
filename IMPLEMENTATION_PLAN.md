# Implementation Plan: New User Types & States

## 1. New User Types

### Ambulance Worker (person in ambulance)
- **Currently**: Only generic "first_responder" role exists
- **Need**: Separate tracking of individual paramedics
- **Status**: `in_ambulance | out_ambulance_going_to_civ | out_ambulance_treating_civ | out_ambulance_returning`

### Hospital Staff (user role)
- **Currently**: Hospitals are data entities, not user roles
- **Need**: Login/interface for hospital management

### Switchboard Staff (optional)
- **Need**: Intermediary for call coordination

---

## 2. Enhanced State Types

### Civilian Status (expanded)
**OLD**: `on_call | waiting | being_rescued | rescued | safe`
**NEW**: `normal | needs_help | help_on_the_way | receiving_help_at_incident | in_ambulance | at_hospital`

### Ambulance Status (expanded)
**OLD**: `Available | Responding | On Scene | Returning | Offline`
**NEW**: `roaming | docked_at_hospital | to_location | retrieving_person | to_hospital`
**ADD**: `fuelLevel: number` (0-100), `numberOfWorkers: number`

### Hospital Infrastructure (new fields)
**ADD**:
- `electricity: operational | backup | outage`
- `water: operational | limited | outage`
- `itComms: operational | degraded | down`
- `facilityIntegrity: secure | damaged | unsafe`
- `access: open | restricted | blocked`
- `ambulanceStatuses: { totalAmbulances, inbound, atHospital, outbound }`

---

## 3. New Disaster Categories

### Shelters (8 types)
`hospital | school | bunker | cultural_site | religious_site | dmz | refugee_camp | humanitarian_corridor | un_safe_area`

### People Disasters (7 types)
`civil_unrest_protest | civil_unrest_riot | militarized_zone | crime_shooting | crime_stabbing | crime_mugging | terrorism`

### Infrastructure (5 types)
`internet_connectivity | cell_service | water_outage | power_outage | structural_damage`

### Natural Disasters (add 3)
**ADD**: `droughts | earthquakes | tsunamis`
(Already have: fire, flood)

---

## 4. New Features

### Ambulance Features
- Show nearby fuel stations on map
- Low fuel alert button
- Danger-aware routing (avoid disaster zones)
- 1:1 communication with assigned civilian

### Ambulance Worker Features
- Audio-first interface (headphone use)
- Simplified UI (large buttons, hard to misclick)
- Multi-channel comms (ambulance + civilian + dispatch)
- Very local map (< 1km radius)

### Hospital Features
- Fleet status dashboard (all ambulances)
- Dynamic FR/civilian communications

### System Features
- Connection status monitoring (online/degraded/offline/sms_fallback)
- SMS fallback communication
- Offline-first architecture (optional, major refactor)
- Person-to-person translation (optional)

---

## 5. TypeScript Types

```typescript
// User roles
type UserRole = "civilian" | "first_responder" | "ambulance_worker" | "hospital_staff" | "switchboard_staff"

// Civilian
type CivilianStatus = "normal" | "needs_help" | "help_on_the_way" | "receiving_help_at_incident" | "in_ambulance" | "at_hospital"

// Ambulance
type AmbulanceJobStatus = "roaming" | "docked_at_hospital" | "to_location" | "retrieving_person" | "to_hospital"
interface AmbulanceState {
  fuelLevel?: number  // NEW
  numberOfWorkers: number  // NEW
  jobStatus: AmbulanceJobStatus  // NEW
}

// Ambulance Worker
type AmbulanceWorkerJobStatus = "in_ambulance" | "out_ambulance_going_to_civ" | "out_ambulance_treating_civ" | "out_ambulance_returning"
interface AmbulanceWorker {
  workerId: string
  ambulanceId: string
  location: { lat: number; lon: number }
  jobStatus: AmbulanceWorkerJobStatus
}

// Shelters
type ShelterType = "hospital" | "school" | "bunker" | "cultural_site" | "religious_site" | "dmz" | "refugee_camp" | "humanitarian_corridor" | "un_safe_area"

// People Disasters
type PeopleDisasterType = "civil_unrest_protest" | "civil_unrest_riot" | "militarized_zone" | "crime_shooting" | "crime_stabbing" | "crime_mugging" | "terrorism"

// Infrastructure
type InfrastructureType = "internet_connectivity" | "cell_service" | "water_outage" | "power_outage" | "structural_damage"
type InfrastructureStatus = "operational" | "degraded" | "outage"

// Hospital Infrastructure
type HospitalInfrastructure = {
  electricity: "operational" | "backup" | "outage"
  water: "operational" | "limited" | "outage"
  itComms: "operational" | "degraded" | "down"
  facilityIntegrity: "secure" | "damaged" | "unsafe"
  access: "open" | "restricted" | "blocked"
}
```

---

## 6. Database Tables (New)

```sql
-- Ambulance Workers
CREATE TABLE ambulance_workers (
  worker_id TEXT PRIMARY KEY,
  ambulance_id TEXT,
  location_lat REAL,
  location_lon REAL,
  job_status TEXT,
  FOREIGN KEY (ambulance_id) REFERENCES responder_units(id)
);

-- Shelters
CREATE TABLE shelters (
  id TEXT PRIMARY KEY,
  type TEXT,
  lat REAL, lon REAL,
  capacity INTEGER,
  current_occupancy INTEGER,
  status TEXT
);

-- People Disasters
CREATE TABLE people_disasters (
  id TEXT PRIMARY KEY,
  type TEXT,
  lat REAL, lon REAL,
  severity INTEGER,
  affected_area REAL,
  start_time REAL,
  active BOOLEAN
);

-- Infrastructure Status
CREATE TABLE infrastructure_status (
  id TEXT PRIMARY KEY,
  type TEXT,
  lat REAL, lon REAL,
  affected_area REAL,
  status TEXT,
  estimated_restoration REAL
);

-- Hospital Infrastructure
CREATE TABLE hospital_infrastructure (
  hospital_id TEXT PRIMARY KEY,
  electricity TEXT,
  water TEXT,
  it_comms TEXT,
  facility_integrity TEXT,
  access TEXT,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- Ambulance Resources
CREATE TABLE ambulance_resources (
  ambulance_id TEXT PRIMARY KEY,
  number_of_workers INTEGER,
  fuel_level REAL,
  job_status TEXT,
  FOREIGN KEY (ambulance_id) REFERENCES responder_units(id)
);
```

---

## Implementation Checklist

### Backend (data_server)
- [ ] Update database schema with new tables
- [ ] Add models for new entities (ambulance_workers, shelters, etc.)
- [ ] Update API endpoints to handle new data types
- [ ] Add WebSocket events for new entities
- [ ] Update state generation for new disaster categories

### Frontend (user_interface)
- [ ] Update TypeScript types
- [ ] Create ambulance worker interface/dashboard
- [ ] Create hospital staff interface/dashboard
- [ ] Update civilian status tracking
- [ ] Add new disaster category filters
- [ ] Implement ambulance fuel tracking UI
- [ ] Add shelter visualization on map

### Features
- [ ] Ambulance-civilian 1:1 communication
- [ ] Fuel station mapping
- [ ] Danger-aware routing
- [ ] Hospital fleet dashboard
- [ ] Connection status monitoring
- [ ] SMS fallback system (optional)

---

**Status**: Ready for implementation
**Priority**: High
**Estimated Effort**: 2-3 days full implementation
