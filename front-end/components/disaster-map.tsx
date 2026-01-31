"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import { cn } from "@/lib/utils"

interface IncidentData {
  id: string
  coordinates: [number, number]
  peopleInDanger: number
  severity: number // 1-5 scale
}

interface DisasterMapProps {
  incidents?: IncidentData[]
  className?: string
}

// Mock incidents for 2023 Turkey Earthquake (Feb 6, 2023)
// Mw 7.8 mainshock near Gaziantep/Pazarcık, followed by Mw 7.7 near Kahramanmaraş/Elbistan
// Turkey only - prioritized by city/town
const defaultIncidents: IncidentData[] = [
  // HATAY PROVINCE (Highest casualties ~20k+) - Multiple clusters for density
  {
    id: "1",
    coordinates: [36.165, 36.202], // Antakya center - extreme damage
    peopleInDanger: 350,
    severity: 5,
  },
  {
    id: "1a",
    coordinates: [36.175, 36.210], // Antakya north
    peopleInDanger: 300,
    severity: 5,
  },
  {
    id: "1b",
    coordinates: [36.155, 36.195], // Antakya south
    peopleInDanger: 280,
    severity: 5,
  },
  {
    id: "1c",
    coordinates: [36.180, 36.198], // Antakya east
    peopleInDanger: 250,
    severity: 5,
  },
  {
    id: "2",
    coordinates: [36.12, 36.19], // Defne center
    peopleInDanger: 280,
    severity: 5,
  },
  {
    id: "2a",
    coordinates: [36.13, 36.18], // Defne south
    peopleInDanger: 220,
    severity: 5,
  },
  {
    id: "2b",
    coordinates: [36.11, 36.20], // Defne north
    peopleInDanger: 200,
    severity: 5,
  },
  {
    id: "3",
    coordinates: [36.58, 36.59], // Iskenderun center
    peopleInDanger: 200,
    severity: 4,
  },
  {
    id: "3a",
    coordinates: [36.57, 36.58], // Iskenderun port
    peopleInDanger: 180,
    severity: 4,
  },
  {
    id: "4",
    coordinates: [36.08, 36.12], // Samandağ
    peopleInDanger: 120,
    severity: 3,
  },
  {
    id: "4a",
    coordinates: [36.40, 36.35], // Kırıkhan
    peopleInDanger: 150,
    severity: 4,
  },
  {
    id: "4b",
    coordinates: [36.35, 36.50], // Reyhanlı
    peopleInDanger: 130,
    severity: 4,
  },
  // KAHRAMANMARAŞ PROVINCE (Near epicenters)
  {
    id: "5",
    coordinates: [36.937, 37.585], // Kahramanmaraş city center
    peopleInDanger: 320,
    severity: 5,
  },
  {
    id: "5a",
    coordinates: [36.95, 37.59], // Kahramanmaraş east
    peopleInDanger: 280,
    severity: 5,
  },
  {
    id: "5b",
    coordinates: [36.92, 37.58], // Kahramanmaraş west
    peopleInDanger: 250,
    severity: 5,
  },
  {
    id: "6",
    coordinates: [37.05, 37.50], // Onikişubat district
    peopleInDanger: 180,
    severity: 4,
  },
  {
    id: "7",
    coordinates: [37.29, 37.49], // Pazarcık - near first epicenter
    peopleInDanger: 250,
    severity: 5,
  },
  {
    id: "7a",
    coordinates: [37.25, 37.47], // Pazarcık south
    peopleInDanger: 200,
    severity: 5,
  },
  {
    id: "8",
    coordinates: [37.20, 38.20], // Elbistan center
    peopleInDanger: 220,
    severity: 5,
  },
  {
    id: "8a",
    coordinates: [37.18, 38.18], // Elbistan south
    peopleInDanger: 180,
    severity: 5,
  },
  // GAZIANTEP PROVINCE
  {
    id: "9",
    coordinates: [37.38, 37.07], // Gaziantep city center
    peopleInDanger: 220,
    severity: 4,
  },
  {
    id: "9a",
    coordinates: [37.36, 37.05], // Gaziantep south
    peopleInDanger: 180,
    severity: 4,
  },
  {
    id: "10",
    coordinates: [37.02, 37.00], // Nurdağı - severe damage
    peopleInDanger: 180,
    severity: 4,
  },
  {
    id: "10a",
    coordinates: [36.98, 36.97], // Islahiye
    peopleInDanger: 160,
    severity: 4,
  },
  // ADIYAMAN PROVINCE
  {
    id: "11",
    coordinates: [38.28, 37.76], // Adıyaman city center
    peopleInDanger: 200,
    severity: 4,
  },
  {
    id: "11a",
    coordinates: [38.26, 37.74], // Adıyaman south
    peopleInDanger: 170,
    severity: 4,
  },
  {
    id: "12",
    coordinates: [38.10, 37.90], // Gölbaşı district
    peopleInDanger: 100,
    severity: 3,
  },
  // MALATYA PROVINCE
  {
    id: "13",
    coordinates: [38.32, 38.35], // Malatya city center
    peopleInDanger: 180,
    severity: 4,
  },
  {
    id: "13a",
    coordinates: [38.30, 38.33], // Malatya south
    peopleInDanger: 150,
    severity: 4,
  },
  {
    id: "14",
    coordinates: [38.09, 38.26], // Doğanşehir town
    peopleInDanger: 90,
    severity: 3,
  },
  // DIYARBAKIR PROVINCE
  {
    id: "15",
    coordinates: [40.22, 37.91], // Diyarbakır city
    peopleInDanger: 70,
    severity: 2,
  },
  // ŞANLIURFA PROVINCE
  {
    id: "16",
    coordinates: [38.79, 37.16], // Şanlıurfa city
    peopleInDanger: 60,
    severity: 2,
  },
]

export function DisasterMap({ incidents = defaultIncidents, className }: DisasterMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      console.error("Mapbox token not found. Please set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local")
      return
    }

    mapboxgl.accessToken = token

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/khonguyenpham/cm476m37000cp01r1aerh8dud",
      center: [37.0, 37.2], // Turkey-Syria earthquake affected region (Gaziantep/Kahramanmaraş area)
      zoom: 6.5,
    })

    map.current.on("load", () => {
      if (!map.current) return

      // Convert incidents to GeoJSON with combined weight (people + severity)
      const geojsonData: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: incidents.map((incident) => ({
          type: "Feature",
          properties: {
            id: incident.id,
            peopleInDanger: incident.peopleInDanger,
            severity: incident.severity,
            // Combined weight: normalize people (0-200 -> 0-1) + severity (1-5 -> 0-1)
            weight: (incident.peopleInDanger / 200) * 0.6 + (incident.severity / 5) * 0.4,
          },
          geometry: {
            type: "Point",
            coordinates: incident.coordinates,
          },
        })),
      }

      // Add the heat map source
      map.current.addSource("incidents", {
        type: "geojson",
        data: geojsonData,
      })

      // Add heat map layer - maintains gradient blur at all zoom levels
      map.current.addLayer({
        id: "incidents-heat",
        type: "heatmap",
        source: "incidents",
        maxzoom: 24,
        paint: {
          // Weight based on combined danger score
          "heatmap-weight": ["get", "weight"],
          // Higher intensity for stronger red centers
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5, 0.8,
            8, 1.2,
            12, 1.5,
            16, 2,
          ],
          // Color ramp - stronger red at center
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(0, 0, 0, 0)",
            0.1, "rgba(0, 228, 255, 0.4)",
            0.2, "rgba(0, 255, 136, 0.5)",
            0.35, "rgba(255, 255, 0, 0.6)",
            0.5, "rgba(255, 165, 0, 0.75)",
            0.7, "rgba(255, 80, 0, 0.85)",
            0.85, "rgba(255, 30, 0, 0.9)",
            1, "rgba(220, 0, 0, 0.95)",
          ],
          // Bigger radius for larger circles
          "heatmap-radius": [
            "interpolate",
            ["exponential", 1.5],
            ["zoom"],
            5, 25,
            8, 50,
            12, 100,
            16, 180,
          ],
          // Keep opacity high at all zoom levels
          "heatmap-opacity": 0.9,
        },
      })

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right")
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [incidents])

  return (
    <div
      ref={mapContainer}
      className={cn("w-full rounded-lg overflow-hidden", className)}
    />
  )
}
