/**
 * Frontend API client for the disaster response system.
 * Wraps backend API calls with proper typing and error handling.
 */

import { backendApi } from "./backend-api"
import type { Hospital, DashboardStats, ResponderUnit } from "@/types/api"
import type { BackendDangerZone } from "@/types/backend"

// Type for people in danger (callers)
export interface PersonInDanger {
  id: string
  user_id?: string
  name?: string
  phone?: string
  location?: string | { lat: number; lon: number }
  status: "on_call" | "waiting" | "being_rescued" | "rescued" | "safe"
  transcript?: string
  reported_at?: string
  severity?: number
  needs_medical?: boolean
  trapped?: boolean
  group_size?: number
  isTrapped?: boolean
  isInjured?: boolean
  peopleWith?: number
  medicalConditions?: string[]
  incidentId?: string
  lastContact?: string
  assignedUnit?: string
}

export const api = {
  // People in danger (civilians needing help)
  people: {
    list: async (): Promise<PersonInDanger[]> => {
      try {
        const users = await backendApi.users.list() as Array<{
          user_id: string
          role: string
          status?: string
          location_history?: Array<{ lat: number; lon: number }>
          calls?: Array<{ transcript: string; start_time: number }>
        }>

        // Filter for civilians and transform to PersonInDanger format
        return users
          .filter(u => u.role === "civilian")
          .map(u => ({
            id: u.user_id,
            user_id: u.user_id,
            status: (u.status as PersonInDanger["status"]) || "waiting",
            location: u.location_history?.[0]
              ? { lat: u.location_history[0].lat, lon: u.location_history[0].lon }
              : undefined,
            transcript: u.calls?.[0]?.transcript,
            reported_at: u.calls?.[0]?.start_time
              ? new Date(u.calls[0].start_time * 1000).toISOString()
              : undefined,
          }))
      } catch (error) {
        console.error("Failed to fetch people in danger:", error)
        return []
      }
    },
  },

  // Hospitals
  hospitals: {
    list: async (): Promise<Hospital[]> => {
      try {
        const hospitals = await backendApi.hospitals.list() as Array<{
          hospital_id: string
          name: string
          lat: number
          lon: number
          status?: string
          er_capacity?: number
          icu_capacity?: number
          specialties?: string[]
        }>

        return hospitals.map(h => ({
          id: h.hospital_id,
          name: h.name,
          distance: 0, // Will be calculated client-side if needed
          status: (h.status as Hospital["status"]) || "accepting",
          erAvailable: h.er_capacity || 0,
          icuAvailable: h.icu_capacity || 0,
          specialties: h.specialties || [],
          coordinates: { lat: h.lat, lon: h.lon },
        }))
      } catch (error) {
        console.error("Failed to fetch hospitals:", error)
        return []
      }
    },

    getCapacity: async (hospitalId: string) => {
      try {
        const hospitals = await backendApi.hospitals.list() as Array<{
          hospital_id: string
          er_capacity?: number
          icu_capacity?: number
          general_capacity?: number
          pediatric_capacity?: number
        }>

        const hospital = hospitals.find(h => h.hospital_id === hospitalId)
        if (!hospital) return null

        return {
          hospitalId,
          beds: [
            { id: "er", name: "Emergency", total: hospital.er_capacity || 20, available: hospital.er_capacity || 10, pending: 2 },
            { id: "icu", name: "ICU", total: hospital.icu_capacity || 10, available: hospital.icu_capacity || 5, pending: 1 },
            { id: "general", name: "General", total: hospital.general_capacity || 50, available: hospital.general_capacity || 30, pending: 3 },
            { id: "pediatric", name: "Pediatric", total: hospital.pediatric_capacity || 15, available: hospital.pediatric_capacity || 10, pending: 0 },
          ],
          totalOccupancy: 65,
        }
      } catch (error) {
        console.error("Failed to fetch hospital capacity:", error)
        return null
      }
    },
  },

  // Dashboard stats
  stats: {
    get: async (): Promise<DashboardStats> => {
      try {
        const [users, dangerZonesResponse, priorities] = await Promise.all([
          backendApi.users.list() as Promise<Array<{ role: string; status?: string }>>,
          backendApi.dangerZones.list() as Promise<{ ok: boolean; danger_zones: unknown[] }>,
          backendApi.priorities.list() as Promise<unknown[]>,
        ])

        const dangerZones = dangerZonesResponse.danger_zones || []
        const civilians = users.filter(u => u.role === "civilian")
        const responders = users.filter(u => u.role === "first_responder")
        const needsHelp = civilians.filter(c => c.status === "needs_help")

        return {
          activeIncidents: dangerZones.length + needsHelp.length,
          incidentsTrend: 5,
          peopleInDanger: needsHelp.length,
          peopleTrend: -2,
          respondersDeployed: responders.length,
          respondersTrend: 3,
          resourcesAvailable: 85,
          resourcesTrend: 0,
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
        return {
          activeIncidents: 0,
          incidentsTrend: 0,
          peopleInDanger: 0,
          peopleTrend: 0,
          respondersDeployed: 0,
          respondersTrend: 0,
          resourcesAvailable: 0,
          resourcesTrend: 0,
        }
      }
    },
  },

  // Responder units
  units: {
    list: async (): Promise<ResponderUnit[]> => {
      try {
        const users = await backendApi.users.list() as Array<{
          user_id: string
          role: string
          location_history?: Array<{ lat: number; lon: number }>
        }>

        return users
          .filter(u => u.role === "first_responder")
          .map((u, i) => ({
            id: i + 1,
            unitName: `Unit ${u.user_id.split("_").pop() || i + 1}`,
            unitType: "Rescue" as const,
            status: "Available" as const,
            location: "Field",
            coordinates: u.location_history?.[0],
            eta: "N/A",
            assignedIncident: "",
          }))
      } catch (error) {
        console.error("Failed to fetch units:", error)
        return []
      }
    },
  },

  // Danger zones
  dangerZones: {
    list: async (): Promise<BackendDangerZone[]> => {
      try {
        const response = await backendApi.dangerZones.list() as { ok: boolean; danger_zones: BackendDangerZone[] }
        return response.danger_zones || []
      } catch (error) {
        console.error("Failed to fetch danger zones:", error)
        return []
      }
    },
  },
}
