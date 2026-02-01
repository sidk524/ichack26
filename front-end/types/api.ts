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
// Hospital State Types (Extended)
// ============================================================================

export type InfrastructureStatus = "operational" | "degraded" | "critical" | "offline"
export type StaffingLevel = "adequate" | "strained" | "critical" | "emergency"
export type SupplyLevel = "adequate" | "low" | "critical" | "depleted"

export interface HospitalResources {
  // Capacity
  capacity: {
    ed: { total: number; available: number; pending: number }
    ward: { total: number; available: number; pending: number }
    icu: { total: number; available: number; pending: number }
    surgical: { total: number; available: number; pending: number }
    pediatric: { total: number; available: number; pending: number }
  }
  // Capabilities
  capabilities: string[]
  traumaLevel: 1 | 2 | 3 | 4 | 5
  // Staffing
  staffing: {
    physicians: { onDuty: number; required: number }
    nurses: { onDuty: number; required: number }
    specialists: { onDuty: number; required: number }
    support: { onDuty: number; required: number }
    level: StaffingLevel
  }
  // Diagnostics
  diagnostics: {
    labTurnaround: number // minutes
    ctAvailable: boolean
    mriAvailable: boolean
    xrayWait: number // minutes
    ultrasoundWait: number // minutes
  }
  // Critical Equipment & Supplies
  criticalSupplies: {
    bloodONeg: { units: number; level: SupplyLevel }
    bloodOPos: { units: number; level: SupplyLevel }
    bloodANeg: { units: number; level: SupplyLevel }
    bloodAPos: { units: number; level: SupplyLevel }
    ventilators: { available: number; total: number }
    monitors: { available: number; total: number }
    criticalDrugs: { name: string; level: SupplyLevel }[]
  }
}

export interface HospitalInfrastructure {
  power: {
    status: InfrastructureStatus
    source: "grid" | "generator" | "battery"
    backupHours?: number
  }
  water: {
    status: InfrastructureStatus
    pressure: "normal" | "low" | "critical"
  }
  it: {
    status: InfrastructureStatus
    ehrOnline: boolean
    networkLatency?: number
  }
  communications: {
    status: InfrastructureStatus
    radioOnline: boolean
    phoneOnline: boolean
    pagerOnline: boolean
  }
  facility: {
    status: InfrastructureStatus
    accessRoutes: { name: string; status: "open" | "blocked" | "limited" }[]
    elevators: { operational: number; total: number }
    hvac: InfrastructureStatus
  }
}

export interface AmbulanceUnit {
  id: string
  callSign: string
  status: "available" | "dispatched" | "en_route_hospital" | "at_scene" | "at_hospital" | "offline"
  currentLocation?: { lat: number; lon: number }
  destination?: string
  eta?: number
  crew: number
  patient?: {
    severity: "critical" | "high" | "moderate" | "low"
    condition: string
  }
}

export interface AmbulanceFleetStatus {
  total: number
  available: number
  dispatched: number
  enRouteHospital: number
  atScene: number
  atHospital: number
  offline: number
  units: AmbulanceUnit[]
}

export interface CommunicationChannel {
  id: string
  name: string
  type: "radio" | "phone" | "digital"
  status: "active" | "standby" | "offline"
  frequency?: string
  lastActivity?: string
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
// News Article Types
// ============================================================================

export interface NewsArticle {
  article_id: string
  title: string
  link: string
  pub_date: string
  disaster: boolean
  location_name: string
  lat?: number
  lon?: number
  image_url?: string
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
