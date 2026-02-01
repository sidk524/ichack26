import type {
  Incident,
  ResponderUnit,
  Hospital,
  HospitalCapacity,
  IncomingPatient,
  DashboardStats,
  NewsArticle,
} from "@/types/api"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://715814cd2aaf.ngrok-free.app"

// Mock data for demo when API endpoints don't exist
const mockStats: DashboardStats = {
  activeIncidents: 12,
  incidentsTrend: 8,
  peopleInDanger: 47,
  peopleTrend: -12,
  respondersDeployed: 24,
  respondersTrend: 15,
  resourcesAvailable: 156,
  resourcesTrend: -3,
}

const mockIncidents: Incident[] = [
  {
    id: "INC-001",
    type: "fire",
    location: "Istanbul, Kadikoy District",
    coordinates: { lat: 40.9833, lon: 29.0333 },
    severity: 4,
    status: "in_progress",
    reportedAt: new Date().toISOString(),
    assignedUnits: ["FT-12", "AMB-03"],
    description: "Building fire reported on 3rd floor",
  },
  {
    id: "INC-002",
    type: "medical",
    location: "Ankara, Cankaya",
    coordinates: { lat: 39.9208, lon: 32.8541 },
    severity: 3,
    status: "dispatched",
    reportedAt: new Date().toISOString(),
    assignedUnits: ["AMB-07"],
    description: "Medical emergency - cardiac symptoms",
  },
  {
    id: "INC-003",
    type: "flood",
    location: "Hatay Province",
    coordinates: { lat: 36.2, lon: 36.15 },
    severity: 5,
    status: "new",
    reportedAt: new Date().toISOString(),
    assignedUnits: [],
    description: "Flash flooding in residential area",
  },
]

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    console.warn(`API fetch failed for ${endpoint}, using mock data:`, error)
    throw error
  }
}

export const api = {
  incidents: {
    list: async (): Promise<Incident[]> => {
      try {
        return await fetchApi<Incident[]>("/incidents")
      } catch {
        return mockIncidents
      }
    },
    get: (id: string): Promise<Incident> => fetchApi<Incident>(`/incidents/${id}`),
  },

  stats: {
    get: async (): Promise<DashboardStats> => {
      try {
        return await fetchApi<DashboardStats>("/dashboard/stats")
      } catch {
        return mockStats
      }
    },
  },

  responders: {
    list: (): Promise<ResponderUnit[]> => fetchApi<ResponderUnit[]>("/responders"),
    get: (id: number): Promise<ResponderUnit> => fetchApi<ResponderUnit>(`/responders/${id}`),
  },

  hospitals: {
    list: (): Promise<Hospital[]> => fetchApi<Hospital[]>("/hospitals"),
    get: (id: string): Promise<Hospital> => fetchApi<Hospital>(`/hospitals/${id}`),
    capacity: (id: string): Promise<HospitalCapacity> =>
      fetchApi<HospitalCapacity>(`/hospitals/${id}/capacity`),
    incomingPatients: (id: string): Promise<IncomingPatient[]> =>
      fetchApi<IncomingPatient[]>(`/hospitals/${id}/incoming`),
  },

  dashboard: {
    stats: async (): Promise<DashboardStats> => {
      try {
        return await fetchApi<DashboardStats>("/dashboard/stats")
      } catch {
        return mockStats
      }
    },
  },

  news: {
    list: async (): Promise<NewsArticle[]> => {
      try {
        return await fetchApi<NewsArticle[]>("/news_list")
      } catch {
        return []
      }
    },
  },
}

export default api
