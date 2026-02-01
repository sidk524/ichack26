// Backend API response types matching data_server/scheme.md

// === Location Point ===
export interface BackendLocationPoint {
  lat: number
  lon: number
  timestamp: number // Unix timestamp (seconds since epoch)
  accuracy: number // GPS accuracy in meters
}

// === Call ===
export interface BackendCall {
  call_id: string
  user_id?: string // Present in /api/calls, not in user's embedded calls
  transcript: string
  start_time: number // Unix timestamp
  end_time: number // Unix timestamp
  tags?: string[] // Top 3 meaningful words extracted from transcript using NLP
}

// === User Status ===
export type CivilianStatus = "normal" | "needs_help" | "help_coming" | "at_incident" | "in_transport" | "at_hospital"
export type ResponderStatus = "roaming" | "docked" | "en_route_to_civ" | "on_scene" | "en_route_to_hospital"
export type UserStatus = CivilianStatus | ResponderStatus

// === User ===
export interface BackendUser {
  user_id: string
  role: "civilian" | "first_responder"
  status: UserStatus
  preferred_language?: "en" | "tr" // User's preferred language
  location_history: BackendLocationPoint[]
  calls: BackendCall[]
}

// === News Article ===
export interface BackendNewsArticle {
  article_id: string
  link: string
  title: string
  pub_date: string // ISO date string
  disaster: boolean
  location_name: string
  received_at: number // Unix timestamp
  lat: number | null
  lon: number | null
}

// === Sensor Reading ===
export interface BackendSensorReading {
  reading_id: string
  status: number
  temperature: number
  humidity: number
  accel: { x: number; y: number; z: number }
  gyro: { x: number; y: number; z: number }
  mic: { amplitude: number; frequency: number }
  received_at: number // Unix timestamp
}

// === Hospital ===
export interface BackendHospital {
  hospital_id: string
  name: string
  lat: number
  lon: number
  total_beds: number
  available_beds: number
  icu_beds: number
  available_icu: number
  er_beds: number
  available_er: number
  pediatric_beds: number
  available_pediatric: number
  contact_phone: string
  last_updated: number // Unix timestamp
}

// === Danger Zone ===
export type DangerCategory = "natural" | "people" | "infrastructure"
export type DisasterType = "earthquake" | "fire" | "flood" | "building_collapse" | "explosion" | "chemical" | "other"
export type RecommendedAction = "evacuate" | "shelter_in_place" | "avoid_area"

export interface BackendDangerZone {
  zone_id: string
  category: DangerCategory
  disaster_type: DisasterType
  severity: 1 | 2 | 3 | 4 | 5
  lat: number
  lon: number
  radius: number // in meters
  is_active: boolean
  detected_at: number // Unix timestamp
  expires_at: number | null // Unix timestamp
  description: string
  recommended_action: RecommendedAction
}

// === API Response Types ===

export interface UsersResponse {
  ok: boolean
  users: BackendUser[]
  error?: string
}

export interface UserResponse {
  ok: boolean
  user: BackendUser
  error?: string
}

export interface LocationsResponse {
  ok: boolean
  locations: (BackendLocationPoint & { user_id?: string })[]
  error?: string
}

export interface CallsResponse {
  ok: boolean
  calls: (BackendCall & { user_id: string })[]
  error?: string
}

export interface NewsResponse {
  ok: boolean
  news: BackendNewsArticle[]
  error?: string
}

export interface NewsArticleResponse {
  ok: boolean
  article: BackendNewsArticle
  error?: string
}

export interface SensorsResponse {
  ok: boolean
  sensors: BackendSensorReading[]
  error?: string
}

export interface HospitalsResponse {
  ok: boolean
  hospitals: BackendHospital[]
  error?: string
}

export interface HospitalResponse {
  ok: boolean
  hospital: BackendHospital
  error?: string
}

export interface DangerZonesResponse {
  ok: boolean
  danger_zones: BackendDangerZone[]
  error?: string
}

export interface DangerZoneResponse {
  ok: boolean
  danger_zone: BackendDangerZone
  error?: string
}

export interface AllDataResponse {
  ok: boolean
  data: {
    users: BackendUser[]
    news: BackendNewsArticle[]
    sensors: BackendSensorReading[]
    hospitals: BackendHospital[]
    danger_zones: BackendDangerZone[]
    timestamp: number
  }
  error?: string
}

// === Nearest Hospital Response ===
export interface NearestHospitalResponse {
  ok: boolean
  hospital: BackendHospital & { distance_km: number }
  distance_km: number
  error?: string
}

// === Route Calculation Types ===
export type RouteProfile =
  | "driving-car"
  | "driving-hgv"
  | "foot-walking"
  | "foot-hiking"
  | "cycling-regular"
  | "cycling-road"
  | "cycling-mountain"
  | "cycling-electric"

export interface RouteCalculateRequest {
  start_lat: number
  start_lon: number
  end_lat: number
  end_lon: number
  profile?: RouteProfile
  avoid_polygons?: boolean // Whether to avoid danger zones, defaults to true
}

export interface RouteFeature {
  type: "Feature"
  properties: {
    summary: {
      distance: number // meters
      duration: number // seconds
    }
    avoided_zones?: number
    profile: RouteProfile
    avoidance_enabled: boolean
  }
  geometry: {
    type: "LineString"
    coordinates: [number, number][] // [lon, lat] pairs
  }
}

export interface RouteCalculateResponse {
  ok: boolean
  route: {
    type: "FeatureCollection"
    features: RouteFeature[]
  }
  avoided_zones_count: number
  avoidance_enabled: boolean
  error?: string
}
