/**
 * Backend API client for the disaster response system.
 * Connects to the Python data_server via REST API.
 */

import type {
  BackendNewsArticle,
  BackendUser,
  BackendCall,
  BackendDangerZone,
  BackendHospital,
} from "@/types/backend"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://drdatabackend.ngrok.dev"

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BACKEND_URL}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export const backendApi = {
  // News endpoints
  news: {
    list: async () => {
      const res = await fetchApi<{ ok: boolean; news: BackendNewsArticle[] }>("/api/news")
      return res
    },
    get: async (articleId: string) => {
      const res = await fetchApi<{ ok: boolean; article: unknown }>(`/api/news/${articleId}`)
      return res.article
    },
  },

  // Calls/transcripts endpoints
  calls: {
    list: async () => {
      const res = await fetchApi<{ ok: boolean; calls: (BackendCall & { user_id: string })[] }>("/api/calls")
      return res
    },
    getForUser: async (userId: string) => {
      const res = await fetchApi<{ ok: boolean; calls: unknown[] }>(`/api/calls/${userId}`)
      return res.calls || []
    },
  },

  // Users endpoints
  users: {
    list: async () => {
      const res = await fetchApi<{ ok: boolean; users: BackendUser[] }>("/api/users")
      return res.users || []
    },
    get: async (userId: string) => {
      const res = await fetchApi<{ ok: boolean; user: BackendUser }>(`/api/users/${userId}`)
      return res
    },
  },

  // Locations endpoints
  locations: {
    list: async () => {
      const res = await fetchApi<{ ok: boolean; locations: unknown[] }>("/api/locations")
      return res.locations || []
    },
    getForUser: async (userId: string) => {
      const res = await fetchApi<{ ok: boolean; locations: unknown[] }>(`/api/locations/${userId}`)
      return res.locations || []
    },
  },

  // Danger zones endpoints
  dangerZones: {
    list: async () => {
      const res = await fetchApi<{ ok: boolean; danger_zones: BackendDangerZone[] }>("/api/danger-zones")
      return res
    },
    getGeoJson: async () => {
      const res = await fetchApi<{ ok: boolean; geojson: unknown }>("/api/danger-zones/geojson")
      return res.geojson
    },
  },

  // Hospitals endpoints
  hospitals: {
    list: async () => {
      const res = await fetchApi<{ ok: boolean; hospitals: unknown[] }>("/api/hospitals")
      return res.hospitals || []
    },
    findNearest: async (lat: number, lon: number) => {
      const res = await fetchApi<{
        ok: boolean
        hospital: { lat: number; lon: number; name: string; hospital_id: string; [key: string]: unknown }
        distance_km: number
      }>(
        "/api/hospitals/nearest",
        {
          method: "POST",
          body: JSON.stringify({ lat, lon }),
        }
      )
      return res
    },
  },

  // Routes endpoints
  routes: {
    calculate: async (params: {
      start_lat: number
      start_lon: number
      end_lat: number
      end_lon: number
      profile?: string
      avoid_polygons?: boolean
    }) => {
      const res = await fetchApi<{
        ok: boolean
        route: {
          type: string
          features: Array<{
            type: string
            geometry: {
              type: string
              coordinates: [number, number][]
            }
            properties: {
              summary: { distance: number; duration: number }
              avoided_zones?: number
            }
          }>
        }
        avoided_zones_count: number
        avoidance_enabled: boolean
      }>("/api/route/calculate", {
        method: "POST",
        body: JSON.stringify(params),
      })
      return res
    },
  },

  // Entities endpoints
  entities: {
    list: async () => {
      const res = await fetchApi<{ ok: boolean; entities: unknown[] }>("/api/entities")
      return res.entities || []
    },
  },

  // Sensors endpoints
  sensors: {
    list: async () => {
      const res = await fetchApi<{ ok: boolean; sensors: unknown[] }>("/api/sensors")
      return res.sensors || []
    },
  },

  // Assignments endpoints
  assignments: {
    list: async () => {
      const res = await fetchApi<{ ok: boolean; assignments: unknown[] }>("/api/assignments")
      return res.assignments || []
    },
    getActive: async () => {
      const res = await fetchApi<{ ok: boolean; assignments: unknown[] }>("/api/assignments/active")
      return res.assignments || []
    },
    get: async (assignmentId: string) => {
      const res = await fetchApi<{ ok: boolean; assignment: unknown }>(`/api/assignments/${assignmentId}`)
      return res.assignment
    },
    create: async (data: unknown) => {
      const res = await fetchApi<{ ok: boolean; assignment: unknown }>("/api/assignments", {
        method: "POST",
        body: JSON.stringify(data),
      })
      return res.assignment
    },
  },

  // Priorities endpoints
  priorities: {
    list: async () => {
      const res = await fetchApi<{ ok: boolean; priorities: unknown[] }>("/api/priorities")
      return res.priorities || []
    },
  },

  // Full data dump
  data: {
    getAll: async () => {
      const res = await fetchApi<{ ok: boolean; data: unknown }>("/api/data/all")
      return res.data
    },
  },

  // Seed demo data
  seed: async () => {
    const res = await fetchApi<{ ok: boolean; message: string }>("/api/seed", {
      method: "POST",
    })
    return res
  },
}
