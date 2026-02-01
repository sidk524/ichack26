/**
 * Shared API types for the front-end
 * These types match the expected server response format
 */

// ============================================================================
// Incident Types
// ============================================================================

export type IncidentType = "fire" | "medical" | "rescue" | "flood" | "accident" | "other"
export type IncidentStatus = "new" | "dispatched" | "in_progress" | "resolved"
export type SeverityLevel = 1 | 2 | 3 | 4 | 5

export interface Incident {
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

// ============================================================================
// Responder Unit Types
// ============================================================================

export type UnitType = "Ambulance" | "Fire Truck" | "Police" | "Rescue" | "Hazmat" | "Medical"
export type UnitStatus = "Available" | "Responding" | "On Scene" | "Returning" | "Offline"

export interface ResponderUnit {
  id: number
  unitName: string
  unitType: UnitType
  status: UnitStatus
  location: string
  coordinates?: { lat: number; lon: number }
  eta: string
  assignedIncident: string
}

// ============================================================================
// Hospital Types
// ============================================================================

export type HospitalStatus = "accepting" | "limited" | "diverting" | "closed"

export interface Hospital {
  id: string
  name: string
  distance: number
  status: HospitalStatus
  erAvailable: number
  icuAvailable: number
  specialties: string[]
  coordinates?: { lat: number; lon: number }
}

export interface BedCategory {
  id: string
  name: string
  total: number
  available: number
  pending: number
}

export interface HospitalCapacity {
  hospitalId: string
  beds: BedCategory[]
  totalOccupancy: number
}

export interface IncomingPatient {
  id: number
  unit: string
  eta: number
  severity: "critical" | "high" | "moderate" | "low"
  condition: string
  needs: string
}

// ============================================================================
// Dashboard Stats Types
// ============================================================================

export interface DashboardStats {
  activeIncidents: number
  incidentsTrend: number
  peopleInDanger: number
  peopleTrend: number
  respondersDeployed: number
  respondersTrend: number
  resourcesAvailable: number
  resourcesTrend: number
}

// ============================================================================
// WebSocket Payload Types (matching server expectations)
// ============================================================================

export interface LocationPayload {
  user_id: string
  data: {
    lat: number
    lon: number
    timestamp: number
    accuracy?: number
  }
}

export interface TranscriptPayload {
  user_id: string
  data: {
    transcript: {
      text: string
      is_final: boolean
    }
  }
}

// ============================================================================
// API Response Wrapper Types
// ============================================================================

export interface ApiResponse<T> {
  data: T
  success: boolean
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
