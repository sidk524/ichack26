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
}

// === User ===
export interface BackendUser {
  user_id: string
  role: "civilian" | "first_responder"
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

export interface AllDataResponse {
  ok: boolean
  data: {
    users: BackendUser[]
    news: BackendNewsArticle[]
    sensors: BackendSensorReading[]
    timestamp: number
  }
  error?: string
}
