"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import mapboxgl from "mapbox-gl"
import { cn } from "@/lib/utils"
import { backendApi } from "@/lib/backend-api"
import { useDashboardUpdates, type NewNewsEvent, type NewLocationEvent } from "@/hooks/use-dashboard-updates"
import type { BackendNewsArticle } from "@/types/backend"

interface IncidentData {
  id: string
  coordinates: [number, number]
  peopleInDanger: number
  severity: number
  title?: string
  location_name?: string
}

interface VehicleData {
  id: string
  type: "firetruck" | "ambulance" | "police" | "rescue"
  marker: mapboxgl.Marker | null
  path: [number, number][]
  progress: number
  speed: number
  direction: 1 | -1  // 1 = forward, -1 = reverse
  startPoint: [number, number]
  endPoint: [number, number]
}

interface DisasterMapProps {
  incidents?: IncidentData[]
  className?: string
  showVehicles?: boolean
  autoFetchNews?: boolean
}

// Transform news article to incident data for the map
function newsToIncident(article: BackendNewsArticle): IncidentData | null {
  if (article.lat === null || article.lon === null) return null

  let severity = article.disaster ? 4 : 2
  const title = article.title.toLowerCase()
  if (title.includes("earthquake") || title.includes("major") || title.includes("massive")) {
    severity = 5
  } else if (title.includes("fire") || title.includes("flood") || title.includes("explosion")) {
    severity = 4
  } else if (title.includes("accident") || title.includes("crash")) {
    severity = 3
  }

  return {
    id: article.article_id,
    coordinates: [article.lon, article.lat],
    peopleInDanger: severity * 50,
    severity,
    title: article.title,
    location_name: article.location_name,
  }
}

// Fallback incidents when API has no data
const fallbackIncidents: IncidentData[] = [
  { id: "fallback-1", coordinates: [-0.1278, 51.5074], peopleInDanger: 50, severity: 3 },
]

// Vehicle definitions with start and end points
// Speed values are much slower for realistic movement
const vehicleDefinitions: Omit<VehicleData, "marker" | "path">[] = [
  {
    id: "ft1",
    type: "firetruck",
    startPoint: [36.10, 36.25],
    endPoint: [36.165, 36.202],
    progress: 0,
    speed: 0.00015,
    direction: 1,
  },
  {
    id: "ft2",
    type: "firetruck",
    startPoint: [36.22, 36.15],
    endPoint: [36.165, 36.202],
    progress: 0.3,
    speed: 0.00012,
    direction: 1,
  },
  {
    id: "amb1",
    type: "ambulance",
    startPoint: [36.85, 37.55],
    endPoint: [36.937, 37.585],
    progress: 0.1,
    speed: 0.00018,
    direction: 1,
  },
  {
    id: "amb2",
    type: "ambulance",
    startPoint: [37.02, 37.62],
    endPoint: [36.937, 37.585],
    progress: 0.5,
    speed: 0.00014,
    direction: 1,
  },
  {
    id: "ft3",
    type: "firetruck",
    startPoint: [37.32, 37.12],
    endPoint: [37.38, 37.07],
    progress: 0.2,
    speed: 0.00013,
    direction: 1,
  },
  {
    id: "amb3",
    type: "ambulance",
    startPoint: [36.48, 36.52],
    endPoint: [36.58, 36.59],
    progress: 0.4,
    speed: 0.00016,
    direction: 1,
  },
  {
    id: "ft4",
    type: "firetruck",
    startPoint: [37.08, 38.12],
    endPoint: [37.20, 38.20],
    progress: 0.6,
    speed: 0.00011,
    direction: 1,
  },
  {
    id: "amb4",
    type: "ambulance",
    startPoint: [38.18, 37.82],
    endPoint: [38.28, 37.76],
    progress: 0.7,
    speed: 0.00015,
    direction: 1,
  },
]

// SVG icons for vehicles (Tabler icons)
const vehicleIcons: Record<string, { icon: string; color: string; bgColor: string }> = {
  firetruck: {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12a2 2 0 0 0 -2 -2h-1l-2 -4h-11l-2 8h-2a1 1 0 0 0 -1 1v2a1 1 0 0 0 1 1h1a2 2 0 1 0 4 0h6a2 2 0 1 0 4 0h1a1 1 0 0 0 1 -1v-3a2 2 0 0 0 -2 -2z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M10 6h4v4h-4z"/></svg>`,
    color: "#ffffff",
    bgColor: "#ef4444",
  },
  ambulance: {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/><path d="M10 6v4"/><path d="M8 8h4"/></svg>`,
    color: "#ffffff",
    bgColor: "#3b82f6",
  },
  police: {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M18 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M4 17h-2v-5l2 -5h11l3 5h1a2 2 0 0 1 2 2v3h-2"/><path d="M8 17h8"/><path d="M10 5l1 -2h2l1 2"/><path d="M7 12h3"/><path d="M14 12h3"/></svg>`,
    color: "#ffffff",
    bgColor: "#1e3a8a",
  },
  rescue: {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`,
    color: "#ffffff",
    bgColor: "#f97316",
  },
}

// Create animated marker element
function createVehicleMarkerElement(type: string): HTMLDivElement {
  const config = vehicleIcons[type] || vehicleIcons.rescue

  const container = document.createElement("div")
  container.className = "vehicle-marker"
  container.innerHTML = `
    <div class="vehicle-marker-inner" style="
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: ${config.bgColor};
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${config.color};
      box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.8);
      animation: pulse 2s ease-in-out infinite;
      cursor: pointer;
      transition: transform 0.2s ease;
    ">
      ${config.icon}
    </div>
  `

  // Add hover effect
  container.addEventListener("mouseenter", () => {
    const inner = container.querySelector(".vehicle-marker-inner") as HTMLElement
    if (inner) inner.style.transform = "scale(1.2)"
  })
  container.addEventListener("mouseleave", () => {
    const inner = container.querySelector(".vehicle-marker-inner") as HTMLElement
    if (inner) inner.style.transform = "scale(1)"
  })

  return container
}

// Fetch route from Mapbox Directions API
async function fetchRoute(start: [number, number], end: [number, number], accessToken: string): Promise<[number, number][]> {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${accessToken}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.routes && data.routes[0]) {
      return data.routes[0].geometry.coordinates as [number, number][]
    }
  } catch (error) {
    console.error("Error fetching route:", error)
  }

  return [start, end]
}

// Interpolate position along path
function interpolatePath(path: [number, number][], progress: number): { lng: number; lat: number } {
  if (path.length < 2) {
    return { lng: path[0]?.[0] || 0, lat: path[0]?.[1] || 0 }
  }

  const clampedProgress = Math.max(0, Math.min(1, progress))

  let totalLength = 0
  const segmentLengths: number[] = []

  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1][0] - path[i][0]
    const dy = path[i + 1][1] - path[i][1]
    const length = Math.sqrt(dx * dx + dy * dy)
    segmentLengths.push(length)
    totalLength += length
  }

  const targetLength = clampedProgress * totalLength
  let accumulatedLength = 0

  for (let i = 0; i < segmentLengths.length; i++) {
    if (accumulatedLength + segmentLengths[i] >= targetLength) {
      const segmentProgress = (targetLength - accumulatedLength) / segmentLengths[i]
      const start = path[i]
      const end = path[i + 1]

      const lng = start[0] + (end[0] - start[0]) * segmentProgress
      const lat = start[1] + (end[1] - start[1]) * segmentProgress

      return { lng, lat }
    }
    accumulatedLength += segmentLengths[i]
  }

  const lastIdx = path.length - 1
  return { lng: path[lastIdx][0], lat: path[lastIdx][1] }
}

export function DisasterMap({ incidents: propIncidents, className, showVehicles = true, autoFetchNews = true }: DisasterMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const vehiclesRef = useRef<VehicleData[]>([])
  const animationRef = useRef<number | null>(null)
  const [liveIncidents, setLiveIncidents] = useState<IncidentData[]>([])
  const [isLoading, setIsLoading] = useState(autoFetchNews)

  // Fetch news articles and transform to incidents
  const fetchNewsIncidents = useCallback(async () => {
    try {
      const response = await backendApi.news.list()
      const newsIncidents = response.news
        .map(newsToIncident)
        .filter((incident): incident is IncidentData => incident !== null)

      console.log(`[DisasterMap] Loaded ${newsIncidents.length} incidents from news API`)
      setLiveIncidents(newsIncidents)
    } catch (error) {
      console.error("[DisasterMap] Failed to fetch news:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle real-time news updates
  const handleNewNews = useCallback((event: NewNewsEvent) => {
    const article = event.article
    if (article.lat === null || article.lon === null) return

    const newIncident: IncidentData = {
      id: article.article_id,
      coordinates: [article.lon, article.lat],
      peopleInDanger: article.disaster ? 200 : 50,
      severity: article.disaster ? 5 : 3,
      title: article.title,
      location_name: article.location_name,
    }

    setLiveIncidents(prev => [newIncident, ...prev])
    console.log(`[DisasterMap] Added real-time incident: ${article.title.slice(0, 50)}`)
  }, [])

  // Handle real-time location updates (for tracking callers)
  const handleNewLocation = useCallback((event: NewLocationEvent) => {
    // Could add caller location markers here in the future
    console.log(`[DisasterMap] Location update for ${event.user_id}:`, event.location)
  }, [])

  // Connect to real-time updates
  useDashboardUpdates({
    onNewNews: handleNewNews,
    onNewLocation: handleNewLocation,
  })

  // Fetch news on mount and poll every 30 seconds (WebSocket is primary)
  useEffect(() => {
    if (!autoFetchNews) return

    fetchNewsIncidents()
    const interval = setInterval(fetchNewsIncidents, 30000)
    return () => clearInterval(interval)
  }, [autoFetchNews, fetchNewsIncidents])

  const incidents = propIncidents ?? (liveIncidents.length > 0 ? liveIncidents : fallbackIncidents)

  // Update map source when incidents change
  useEffect(() => {
    if (!map.current || !map.current.getSource("incidents")) return

    const geojsonData: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: incidents.map((incident) => ({
        type: "Feature",
        properties: {
          id: incident.id,
          peopleInDanger: incident.peopleInDanger,
          severity: incident.severity,
          weight: (incident.peopleInDanger / 200) * 0.6 + (incident.severity / 5) * 0.4,
          title: incident.title,
          location_name: incident.location_name,
        },
        geometry: {
          type: "Point",
          coordinates: incident.coordinates,
        },
      })),
    }

    const source = map.current.getSource("incidents") as mapboxgl.GeoJSONSource
    source.setData(geojsonData)
    console.log(`[DisasterMap] Updated map with ${incidents.length} incidents`)
  }, [incidents])

  // Initialize map only once on mount
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      console.error("Mapbox token not found")
      return
    }

    mapboxgl.accessToken = token

    // Add CSS for pulse animation (only once)
    if (!document.getElementById("vehicle-marker-styles")) {
      const style = document.createElement("style")
      style.id = "vehicle-marker-styles"
      style.textContent = `
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.8);
          }
          50% {
            box-shadow: 0 2px 12px rgba(0,0,0,0.4), 0 0 0 6px rgba(255,255,255,0.4);
          }
        }
        .vehicle-marker {
          z-index: 10;
        }
      `
      document.head.appendChild(style)
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/khonguyenpham/cm476m37000cp01r1aerh8dud",
      center: [37.0, 37.2],
      zoom: 6.5,
      pitch: 50,
      bearing: -15,
      antialias: true,
    })

    map.current.on("load", async () => {
      if (!map.current) return

      // Add incident heatmap with empty initial data
      // Data will be populated by the separate incidents useEffect
      const emptyGeojsonData: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [],
      }

      map.current.addSource("incidents", { type: "geojson", data: emptyGeojsonData })

      map.current.addLayer({
        id: "incidents-heat",
        type: "heatmap",
        source: "incidents",
        maxzoom: 24,
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 8, 1.2, 12, 1.5, 16, 2],
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
          "heatmap-radius": ["interpolate", ["exponential", 1.5], ["zoom"], 5, 25, 8, 50, 12, 100, 16, 180],
          "heatmap-opacity": 0.9,
        },
      })

      if (showVehicles) {
        // Fetch all routes from Mapbox Directions API
        console.log("[Vehicles] Fetching road routes...")
        const routePromises = vehicleDefinitions.map(async (vehicle) => {
          const path = await fetchRoute(vehicle.startPoint, vehicle.endPoint, token)
          return {
            ...vehicle,
            path,
            marker: null as mapboxgl.Marker | null,
          }
        })

        vehiclesRef.current = await Promise.all(routePromises)
        console.log("[Vehicles] Routes loaded:", vehiclesRef.current.length)

        // Add route lines to map
        vehiclesRef.current.forEach((vehicle) => {
          if (vehicle.path.length > 1 && map.current) {
            map.current.addSource(`route-${vehicle.id}`, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: vehicle.path,
                },
              },
            })

            const config = vehicleIcons[vehicle.type] || vehicleIcons.rescue
            map.current.addLayer({
              id: `route-line-${vehicle.id}`,
              type: "line",
              source: `route-${vehicle.id}`,
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": config.bgColor,
                "line-width": 3,
                "line-opacity": 0.5,
                "line-dasharray": [2, 2],
              },
            })
          }
        })

        // Create markers for each vehicle
        vehiclesRef.current.forEach((vehicle) => {
          if (!map.current) return

          const element = createVehicleMarkerElement(vehicle.type)
          const { lng, lat } = interpolatePath(vehicle.path, vehicle.progress)

          vehicle.marker = new mapboxgl.Marker({ element })
            .setLngLat([lng, lat])
            .addTo(map.current)
        })

        // Animation loop with ping-pong effect (reverse direction at path ends)
        const animate = () => {
          vehiclesRef.current.forEach((vehicle) => {
            if (!vehicle.marker || vehicle.path.length < 2) return

            // Update progress based on direction
            vehicle.progress += vehicle.speed * vehicle.direction

            // Reverse direction at path ends (ping-pong effect)
            if (vehicle.progress >= 1) {
              vehicle.progress = 1
              vehicle.direction = -1
            } else if (vehicle.progress <= 0) {
              vehicle.progress = 0
              vehicle.direction = 1
            }

            const { lng, lat } = interpolatePath(vehicle.path, vehicle.progress)
            vehicle.marker.setLngLat([lng, lat])
          })

          animationRef.current = requestAnimationFrame(animate)
        }

        animate()
      }

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right")
    })

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      vehiclesRef.current.forEach((vehicle) => {
        if (vehicle.marker) vehicle.marker.remove()
      })
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVehicles]) // Only recreate map if showVehicles changes, not on every incident update

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-50 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-sm shadow-lg border">
        <div className="font-semibold mb-2">Live Incidents</div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-linear-to-r from-yellow-500 to-red-500" />
          <span>
            {isLoading ? "Loading..." : `${incidents.length} active incidents`}
          </span>
        </div>
        {showVehicles && (
          <>
            <div className="border-t my-2" />
            <div className="font-semibold mb-2">Emergency Response</div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12a2 2 0 0 0 -2 -2h-1l-2 -4h-11l-2 8h-2a1 1 0 0 0 -1 1v2a1 1 0 0 0 1 1h1a2 2 0 1 0 4 0h6a2 2 0 1 0 4 0h1a1 1 0 0 0 1 -1v-3a2 2 0 0 0 -2 -2z"/></svg>
              </div>
              <span>Fire Trucks ({vehiclesRef.current.filter(v => v.type === "firetruck").length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/></svg>
              </div>
              <span>Ambulances ({vehiclesRef.current.filter(v => v.type === "ambulance").length})</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
