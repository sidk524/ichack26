"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { cn } from "@/lib/utils"
import { backendApi } from "@/lib/backend-api"
import type { BackendDangerZone } from "@/types/backend"
import {
  IconMapPin,
  IconAlertTriangle,
  IconChevronUp,
  IconTruck,
  IconCheck,
  IconClock,
  IconArrowBack,
  IconFlame,
  IconDroplet,
  IconFirstAidKit,
  IconCar,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

// Responder status types
type ResponderStatus = "available" | "en_route" | "on_scene" | "returning"

interface NearbyIncident {
  id: string
  title: string
  type: string
  severity: number
  distance: number
  coordinates: [number, number]
  description?: string
}

// Status configuration
const statusConfig: Record<ResponderStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  available: {
    label: "Available",
    color: "text-green-600",
    bgColor: "bg-green-500",
    icon: <IconCheck className="size-5" />,
  },
  en_route: {
    label: "En Route",
    color: "text-blue-600",
    bgColor: "bg-blue-500",
    icon: <IconTruck className="size-5" />,
  },
  on_scene: {
    label: "On Scene",
    color: "text-orange-600",
    bgColor: "bg-orange-500",
    icon: <IconMapPin className="size-5" />,
  },
  returning: {
    label: "Returning",
    color: "text-purple-600",
    bgColor: "bg-purple-500",
    icon: <IconArrowBack className="size-5" />,
  },
}

// Incident type icons
const incidentTypeIcons: Record<string, React.ReactNode> = {
  fire: <IconFlame className="size-4 text-red-500" />,
  flood: <IconDroplet className="size-4 text-blue-500" />,
  medical: <IconFirstAidKit className="size-4 text-green-500" />,
  accident: <IconCar className="size-4 text-yellow-500" />,
  earthquake: <IconAlertTriangle className="size-4 text-orange-500" />,
  default: <IconAlertTriangle className="size-4 text-gray-500" />,
}

// Severity colors
const severityColors: Record<number, string> = {
  5: "bg-red-500",
  4: "bg-orange-500",
  3: "bg-yellow-500",
  2: "bg-blue-500",
  1: "bg-green-500",
}

// Calculate distance between two coordinates (in km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Mock first responder position - fixed location near a danger zone
// In production, this would come from real GPS
const MOCK_RESPONDER_POSITION = {
  longitude: 37.068,
  latitude: 37.385,
  accuracy: 5,
}

export function ResponderFieldMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const [status, setStatus] = useState<ResponderStatus>("en_route")
  const [nearbyIncidents, setNearbyIncidents] = useState<NearbyIncident[]>([])
  const [dangerZones, setDangerZones] = useState<BackendDangerZone[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<NearbyIncident | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)

  // Use mock position instead of real geolocation for demo
  // Map is locked and follows the responder - no touch interaction needed
  const position = MOCK_RESPONDER_POSITION

  // Fetch danger zones
  const fetchDangerZones = useCallback(async () => {
    try {
      const response = await backendApi.dangerZones.list()
      const activeZones = response.danger_zones.filter((z) => z.is_active)
      setDangerZones(activeZones)
    } catch (error) {
      console.error("[ResponderMap] Failed to fetch danger zones:", error)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchDangerZones()
    const interval = setInterval(fetchDangerZones, 30000)
    return () => clearInterval(interval)
  }, [fetchDangerZones])

  // Convert danger zones to nearby incidents and calculate distances
  useEffect(() => {
    if (dangerZones.length === 0) return

    const incidents: NearbyIncident[] = dangerZones.map((zone) => {
      const distance = calculateDistance(position.latitude, position.longitude, zone.lat, zone.lon)
      return {
        id: zone.zone_id,
        title: zone.disaster_type?.replace(/_/g, " ") || "Unknown Incident",
        type: zone.disaster_type || "default",
        severity: zone.severity,
        distance,
        coordinates: [zone.lon, zone.lat] as [number, number],
        description: zone.description,
      }
    })

    // Sort by distance
    incidents.sort((a, b) => a.distance - b.distance)
    setNearbyIncidents(incidents)
  }, [dangerZones, position.latitude, position.longitude])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      console.error("Mapbox token not found")
      return
    }

    mapboxgl.accessToken = token

    // Center on the first responder's fixed position
    const initialCenter: [number, number] = [position.longitude, position.latitude]

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/khonguyenpham/cm476m37000cp01r1aerh8dud",
      center: initialCenter,
      zoom: 17, // Very close street-level view
      pitch: 60, // Higher tilt for immersive view
      bearing: 0,
      attributionControl: false,
      // Disable all touch/mouse interactions - map is locked and follows responder
      dragPan: false,
      dragRotate: false,
      scrollZoom: false,
      touchZoomRotate: false,
      touchPitch: false,
      doubleClickZoom: false,
      keyboard: false,
    })

    map.current.on("load", () => {
      if (!map.current) return
      setIsMapReady(true)

      // Add danger zones source
      map.current.addSource("danger-zones", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      })

      // Danger zone fill circles
      map.current.addLayer({
        id: "danger-zones-fill",
        type: "circle",
        source: "danger-zones",
        paint: {
          "circle-radius": [
            "interpolate",
            ["exponential", 2],
            ["zoom"],
            10, ["*", ["get", "radius"], 0.001],
            15, ["*", ["get", "radius"], 0.01],
            20, ["*", ["get", "radius"], 0.1],
          ],
          "circle-color": [
            "match",
            ["get", "severity"],
            5, "rgba(239, 68, 68, 0.25)",
            4, "rgba(249, 115, 22, 0.25)",
            3, "rgba(234, 179, 8, 0.25)",
            2, "rgba(59, 130, 246, 0.25)",
            "rgba(107, 114, 128, 0.25)",
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": [
            "match",
            ["get", "severity"],
            5, "#ef4444",
            4, "#f97316",
            3, "#eab308",
            2, "#3b82f6",
            "#6b7280",
          ],
        },
      })

      // Danger zone center markers
      map.current.addLayer({
        id: "danger-zones-center",
        type: "circle",
        source: "danger-zones",
        paint: {
          "circle-radius": 10,
          "circle-color": [
            "match",
            ["get", "severity"],
            5, "#ef4444",
            4, "#f97316",
            3, "#eab308",
            2, "#3b82f6",
            "#6b7280",
          ],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      })

      // Click handler for incidents
      map.current.on("click", "danger-zones-center", (e) => {
        if (!e.features || e.features.length === 0) return
        const feature = e.features[0]
        const props = feature.properties

        const incident = nearbyIncidents.find((i) => i.id === props?.id)
        if (incident) {
          setSelectedIncident(incident)
          setIsDrawerOpen(true)
        }
      })

      map.current.on("mouseenter", "danger-zones-center", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer"
      })
      map.current.on("mouseleave", "danger-zones-center", () => {
        if (map.current) map.current.getCanvas().style.cursor = ""
      })
    })

    return () => {
      if (userMarkerRef.current) userMarkerRef.current.remove()
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update user marker when position changes
  useEffect(() => {
    if (!map.current || !isMapReady || !position) return

    const { longitude, latitude, accuracy } = position

    // Create or update user marker
    if (!userMarkerRef.current) {
      // Create user marker element
      const el = document.createElement("div")
      el.className = "user-marker"
      el.innerHTML = `
        <div style="
          width: 24px;
          height: 24px;
          background: #3b82f6;
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 2px rgba(59, 130, 246, 0.3);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${Math.min(accuracy * 2, 100)}px;
            height: ${Math.min(accuracy * 2, 100)}px;
            background: rgba(59, 130, 246, 0.15);
            border-radius: 50%;
            animation: pulse-accuracy 2s ease-out infinite;
          "></div>
        </div>
      `

      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .addTo(map.current)

      // Add accuracy pulse animation
      if (!document.getElementById("user-marker-styles")) {
        const style = document.createElement("style")
        style.id = "user-marker-styles"
        style.textContent = `
          @keyframes pulse-accuracy {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
            100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
          }
        `
        document.head.appendChild(style)
      }
    } else {
      userMarkerRef.current.setLngLat([longitude, latitude])
    }
  }, [position, isMapReady])

  // Update danger zones on map
  useEffect(() => {
    if (!map.current || !isMapReady || !map.current.getSource("danger-zones")) return

    const geojsonData: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: dangerZones.map((zone) => ({
        type: "Feature",
        properties: {
          id: zone.zone_id,
          severity: zone.severity,
          disaster_type: zone.disaster_type,
          description: zone.description,
          radius: zone.radius || 1000,
        },
        geometry: {
          type: "Point",
          coordinates: [zone.lon, zone.lat],
        },
      })),
    }

    const source = map.current.getSource("danger-zones") as mapboxgl.GeoJSONSource
    source.setData(geojsonData)
  }, [dangerZones, isMapReady])

  // Select incident (map is locked, so just highlight it)
  const selectIncident = useCallback((incident: NearbyIncident) => {
    setSelectedIncident(incident)
  }, [])

  // Handle status change
  const handleStatusChange = (newStatus: ResponderStatus) => {
    setStatus(newStatus)
    // Here you would typically send this to your backend
    console.log(`[Responder] Status changed to: ${newStatus}`)
  }

  const currentStatus = statusConfig[status]

  return (
    <div className="relative h-dvh w-full bg-black">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Top Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 safe-area-inset-top">
        <div className="m-3 rounded-2xl bg-background/95 backdrop-blur-md border shadow-lg">
          <div className="flex items-center justify-between p-3">
            {/* Current Status */}
            <div className="flex items-center gap-3">
              <div className={cn("rounded-full p-2 text-white", currentStatus.bgColor)}>
                {currentStatus.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Status</p>
                <p className={cn("font-semibold", currentStatus.color)}>{currentStatus.label}</p>
              </div>
            </div>

            {/* GPS Status - Always active with mock position */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span>GPS Active</span>
            </div>
          </div>

          {/* Selected Incident / Assignment */}
          {selectedIncident && (
            <div className="border-t px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {incidentTypeIcons[selectedIncident.type] || incidentTypeIcons.default}
                  <div>
                    <p className="text-sm font-medium capitalize">{selectedIncident.title}</p>
                    <p className="text-xs text-muted-foreground">{selectedIncident.distance.toFixed(1)} km away</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-white border-0", severityColors[selectedIncident.severity])}>
                  Sev {selectedIncident.severity}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sheet */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerTrigger asChild>
          <div className="absolute bottom-0 left-0 right-0 z-10 safe-area-inset-bottom">
            <div className="mx-3 mb-3 rounded-2xl bg-background/95 backdrop-blur-md border shadow-lg overflow-hidden">
              {/* Quick Status Buttons */}
              <div className="p-3 border-b">
                <p className="text-xs text-muted-foreground mb-2 text-center">Quick Status Update</p>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(statusConfig) as ResponderStatus[]).map((s) => {
                    const config = statusConfig[s]
                    const isActive = status === s
                    return (
                      <button
                        key={s}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStatusChange(s)
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all min-h-[60px]",
                          isActive
                            ? cn(config.bgColor, "text-white shadow-md scale-105")
                            : "bg-muted/50 hover:bg-muted text-muted-foreground"
                        )}
                      >
                        {config.icon}
                        <span className="text-[10px] font-medium">{config.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Nearby Incidents Preview */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium">Nearby Incidents ({nearbyIncidents.length})</p>
                  <IconChevronUp className="size-4 text-muted-foreground" />
                </div>
                {nearbyIncidents.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {nearbyIncidents.slice(0, 3).map((incident) => (
                      <button
                        key={incident.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          selectIncident(incident)
                        }}
                        className="flex-shrink-0 flex items-center gap-2 bg-muted/50 rounded-lg p-2 min-w-[140px] hover:bg-muted transition-colors"
                      >
                        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-white", severityColors[incident.severity])}>
                          {incidentTypeIcons[incident.type] || incidentTypeIcons.default}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-medium capitalize truncate max-w-[80px]">{incident.title}</p>
                          <p className="text-[10px] text-muted-foreground">{incident.distance.toFixed(1)} km</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">No incidents nearby</p>
                )}
              </div>
            </div>
          </div>
        </DrawerTrigger>

        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="text-center">Nearby Incidents</DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-8 overflow-y-auto">
            {nearbyIncidents.length > 0 ? (
              <div className="space-y-3">
                {nearbyIncidents.map((incident) => (
                  <button
                    key={incident.id}
                    onClick={() => {
                      selectIncident(incident)
                      setIsDrawerOpen(false)
                    }}
                    className="w-full flex items-start gap-3 bg-muted/30 hover:bg-muted/50 rounded-xl p-4 transition-colors text-left"
                  >
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white shrink-0", severityColors[incident.severity])}>
                      {incidentTypeIcons[incident.type] || incidentTypeIcons.default}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium capitalize truncate">{incident.title}</p>
                        <Badge variant="outline" className={cn("text-white border-0 shrink-0", severityColors[incident.severity])}>
                          Sev {incident.severity}
                        </Badge>
                      </div>
                      {incident.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{incident.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <IconMapPin className="size-3" />
                          {incident.distance.toFixed(1)} km
                        </span>
                        <span className="flex items-center gap-1">
                          <IconClock className="size-3" />
                          ~{Math.round(incident.distance * 2)} min
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <IconAlertTriangle className="size-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No incidents in your area</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Stay alert and ready to respond</p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
