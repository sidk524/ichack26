# user_interface/types/

## Purpose

This directory contains centralized TypeScript type definitions for the entire user interface. These types define the data models, API contracts, and shared interfaces used throughout the application to ensure type safety and consistency between the frontend and backend systems.

## Files

- **api.ts**: Core type definitions for all API responses, data models, and WebSocket payloads

## Key Type Categories

### 1. Incident Types

Types related to emergency incidents and their management.

**Enums/Unions:**
- `IncidentType`: "fire" | "medical" | "rescue" | "flood" | "accident" | "other"
- `IncidentStatus`: "new" | "dispatched" | "in_progress" | "resolved"
- `SeverityLevel`: 1 | 2 | 3 | 4 | 5

**Interfaces:**
- `Incident`: Complete incident model with location, severity, assigned units, and status

**Fields:**
```typescript
{
  id: string
  type: IncidentType
  location: string
  coordinates: { lat: number; lon: number }
  severity: SeverityLevel
  status: IncidentStatus
  reportedAt: string
  assignedUnits: string[]
  description: string
}
```

**Used in:**
- Dashboard pages for displaying active incidents
- Incident management components
- Map visualizations

---

### 2. Responder Unit Types

Types for emergency response units (ambulances, fire trucks, police, etc.).

**Enums/Unions:**
- `UnitType`: "Ambulance" | "Fire Truck" | "Police" | "Rescue" | "Hazmat" | "Medical"
- `UnitStatus`: "Available" | "Responding" | "On Scene" | "Returning" | "Offline"

**Interfaces:**
- `ResponderUnit`: Complete responder unit model with status, location, and assignment

**Fields:**
```typescript
{
  id: number
  unitName: string
  unitType: UnitType
  status: UnitStatus
  location: string
  coordinates?: { lat: number; lon: number }
  eta: string
  assignedIncident: string
}
```

**Used in:**
- `components/responder-cards.tsx`: Dashboard cards showing responder statistics
- Vehicle tracking and mapping components
- Real-time status monitoring

---

### 3. Hospital Types

Types for hospital network management and capacity tracking.

**Enums/Unions:**
- `HospitalStatus`: "accepting" | "limited" | "diverting" | "closed"

**Interfaces:**

**Hospital**: Basic hospital information
```typescript
{
  id: string
  name: string
  distance: number
  status: HospitalStatus
  erAvailable: number
  icuAvailable: number
  specialties: string[]
  coordinates?: { lat: number; lon: number }
}
```

**BedCategory**: Bed availability by category (ER, ICU, etc.)
```typescript
{
  id: string
  name: string
  total: number
  available: number
  pending: number
}
```

**HospitalCapacity**: Aggregated capacity data for a hospital
```typescript
{
  hospitalId: string
  beds: BedCategory[]
  totalOccupancy: number
}
```

**IncomingPatient**: Patient transport information
```typescript
{
  id: number
  unit: string
  eta: number
  severity: "critical" | "high" | "moderate" | "low"
  condition: string
  needs: string
}
```

**Used in:**
- `components/hospital-capacity.tsx`: Bed availability displays
- `components/hospital-network.tsx`: Hospital status and network overview
- `components/hospital-dashboard.tsx`: Incoming patient tracking

---

### 4. Dashboard Stats Types

Types for high-level dashboard statistics and metrics.

**Interfaces:**

**DashboardStats**: Aggregated statistics for the main dashboard
```typescript
{
  activeIncidents: number
  incidentsTrend: number          // Percentage change
  peopleInDanger: number
  peopleTrend: number             // Percentage change
  respondersDeployed: number
  respondersTrend: number         // Percentage change
  resourcesAvailable: number
  resourcesTrend: number          // Percentage change
}
```

**Used in:**
- `components/responder-cards.tsx`: Dashboard metric cards with trend indicators

---

### 5. WebSocket Payload Types

Types for real-time WebSocket communication with the server.

**Interfaces:**

**LocationPayload**: Real-time location updates from field units
```typescript
{
  user_id: string
  data: {
    lat: number
    lon: number
    timestamp: number
    accuracy?: number
  }
}
```

**TranscriptPayload**: Real-time audio transcription from field communications
```typescript
{
  user_id: string
  data: {
    transcript: {
      text: string
      is_final: boolean
    }
  }
}
```

**Used in:**
- `hooks/use-server-websocket.ts`: WebSocket connection management
- Real-time location tracking and map updates
- Live transcription display

---

### 6. API Response Wrapper Types

Generic types for standardized API response formats.

**Interfaces:**

**ApiResponse**: Generic wrapper for API responses
```typescript
{
  data: T                         // Generic payload
  success: boolean
  error?: string
}
```

**PaginatedResponse**: Wrapper for paginated API responses
```typescript
{
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
```

**Used in:**
- All API service calls
- Data fetching hooks
- Error handling and success state management

---

## Type Import Patterns

All types are exported from `/user_interface/types/api.ts` and imported using the `@/types/api` alias:

```typescript
import type { Incident, ResponderUnit, Hospital } from "@/types/api"
import type { DashboardStats, IncomingPatient } from "@/types/api"
import type { LocationPayload, TranscriptPayload } from "@/types/api"
```

## Design Principles

1. **Server Contract Matching**: Types are designed to match the expected server response format exactly
2. **Type Safety**: Strong typing prevents runtime errors and improves developer experience
3. **Centralization**: All shared types in one location prevents duplication and inconsistencies
4. **Documentation**: Comprehensive comments and logical grouping improve maintainability
5. **Flexibility**: Optional fields (coordinates, accuracy) allow for partial data scenarios

## Related Directories

- `/user_interface/components/`: React components that consume these types
- `/user_interface/hooks/`: Custom hooks that work with these data models
- `/user_interface/app/`: Page components that aggregate and display this data

## Notes for Development

- When adding new API endpoints, define response types here first
- Keep types in sync with backend data models
- Use strict TypeScript mode to catch type mismatches early
- Consider creating separate types for request payloads if they differ from response shapes
- Use discriminated unions for better type narrowing where applicable (e.g., status-based rendering)
