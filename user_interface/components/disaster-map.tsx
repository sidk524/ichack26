"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { cn } from "@/lib/utils"

interface IncidentData {
  id: string
  coordinates: [number, number]
  peopleInDanger: number
  severity: number
}

interface VehicleData {
  id: string
  type: "firetruck" | "ambulance"
  model: THREE.Group | null
  path: [number, number][] // Will be populated with road coordinates
  progress: number
  speed: number
  startPoint: [number, number]
  endPoint: [number, number]
}

interface DisasterMapProps {
  incidents?: IncidentData[]
  className?: string
  showVehicles?: boolean
}

const defaultIncidents: IncidentData[] = [
  { id: "1", coordinates: [36.165, 36.202], peopleInDanger: 350, severity: 5 },
  { id: "1a", coordinates: [36.175, 36.210], peopleInDanger: 300, severity: 5 },
  { id: "1b", coordinates: [36.155, 36.195], peopleInDanger: 280, severity: 5 },
  { id: "1c", coordinates: [36.180, 36.198], peopleInDanger: 250, severity: 5 },
  { id: "2", coordinates: [36.12, 36.19], peopleInDanger: 280, severity: 5 },
  { id: "2a", coordinates: [36.13, 36.18], peopleInDanger: 220, severity: 5 },
  { id: "2b", coordinates: [36.11, 36.20], peopleInDanger: 200, severity: 5 },
  { id: "3", coordinates: [36.58, 36.59], peopleInDanger: 200, severity: 4 },
  { id: "3a", coordinates: [36.57, 36.58], peopleInDanger: 180, severity: 4 },
  { id: "4", coordinates: [36.08, 36.12], peopleInDanger: 120, severity: 3 },
  { id: "4a", coordinates: [36.40, 36.35], peopleInDanger: 150, severity: 4 },
  { id: "4b", coordinates: [36.35, 36.50], peopleInDanger: 130, severity: 4 },
  { id: "5", coordinates: [36.937, 37.585], peopleInDanger: 320, severity: 5 },
  { id: "5a", coordinates: [36.95, 37.59], peopleInDanger: 280, severity: 5 },
  { id: "5b", coordinates: [36.92, 37.58], peopleInDanger: 250, severity: 5 },
  { id: "6", coordinates: [37.05, 37.50], peopleInDanger: 180, severity: 4 },
  { id: "7", coordinates: [37.29, 37.49], peopleInDanger: 250, severity: 5 },
  { id: "7a", coordinates: [37.25, 37.47], peopleInDanger: 200, severity: 5 },
  { id: "8", coordinates: [37.20, 38.20], peopleInDanger: 220, severity: 5 },
  { id: "8a", coordinates: [37.18, 38.18], peopleInDanger: 180, severity: 5 },
  { id: "9", coordinates: [37.38, 37.07], peopleInDanger: 220, severity: 4 },
  { id: "9a", coordinates: [37.36, 37.05], peopleInDanger: 180, severity: 4 },
  { id: "10", coordinates: [37.02, 37.00], peopleInDanger: 180, severity: 4 },
  { id: "10a", coordinates: [36.98, 36.97], peopleInDanger: 160, severity: 4 },
  { id: "11", coordinates: [38.28, 37.76], peopleInDanger: 200, severity: 4 },
  { id: "11a", coordinates: [38.26, 37.74], peopleInDanger: 170, severity: 4 },
  { id: "12", coordinates: [38.10, 37.90], peopleInDanger: 100, severity: 3 },
  { id: "13", coordinates: [38.32, 38.35], peopleInDanger: 180, severity: 4 },
  { id: "13a", coordinates: [38.30, 38.33], peopleInDanger: 150, severity: 4 },
  { id: "14", coordinates: [38.09, 38.26], peopleInDanger: 90, severity: 3 },
  { id: "15", coordinates: [40.22, 37.91], peopleInDanger: 70, severity: 2 },
  { id: "16", coordinates: [38.79, 37.16], peopleInDanger: 60, severity: 2 },
]

// Vehicle definitions with start and end points
const vehicleDefinitions: Omit<VehicleData, "model" | "path">[] = [
  {
    id: "ft1",
    type: "firetruck",
    startPoint: [36.10, 36.25],
    endPoint: [36.165, 36.202],
    progress: 0,
    speed: 0.003,
  },
  {
    id: "ft2",
    type: "firetruck",
    startPoint: [36.22, 36.15],
    endPoint: [36.165, 36.202],
    progress: 0.3,
    speed: 0.0025,
  },
  {
    id: "amb1",
    type: "ambulance",
    startPoint: [36.85, 37.55],
    endPoint: [36.937, 37.585],
    progress: 0.1,
    speed: 0.0035,
  },
  {
    id: "amb2",
    type: "ambulance",
    startPoint: [37.02, 37.62],
    endPoint: [36.937, 37.585],
    progress: 0.5,
    speed: 0.003,
  },
  {
    id: "ft3",
    type: "firetruck",
    startPoint: [37.32, 37.12],
    endPoint: [37.38, 37.07],
    progress: 0.2,
    speed: 0.0028,
  },
  {
    id: "amb3",
    type: "ambulance",
    startPoint: [36.48, 36.52],
    endPoint: [36.58, 36.59],
    progress: 0.4,
    speed: 0.0032,
  },
  {
    id: "ft4",
    type: "firetruck",
    startPoint: [37.08, 38.12],
    endPoint: [37.20, 38.20],
    progress: 0.6,
    speed: 0.0026,
  },
  {
    id: "amb4",
    type: "ambulance",
    startPoint: [38.18, 37.82],
    endPoint: [38.28, 37.76],
    progress: 0.7,
    speed: 0.003,
  },
]

const MercatorCoordinate = mapboxgl.MercatorCoordinate

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

  // Fallback to straight line if API fails
  return [start, end]
}

// Interpolate position along path with proper bearing calculation
function interpolatePath(path: [number, number][], progress: number): { lng: number; lat: number; bearing: number } {
  if (path.length < 2) {
    return { lng: path[0]?.[0] || 0, lat: path[0]?.[1] || 0, bearing: 0 }
  }

  const clampedProgress = Math.max(0, Math.min(1, progress))

  // Calculate total path length
  let totalLength = 0
  const segmentLengths: number[] = []

  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1][0] - path[i][0]
    const dy = path[i + 1][1] - path[i][1]
    const length = Math.sqrt(dx * dx + dy * dy)
    segmentLengths.push(length)
    totalLength += length
  }

  // Find position along path
  const targetLength = clampedProgress * totalLength
  let accumulatedLength = 0

  for (let i = 0; i < segmentLengths.length; i++) {
    if (accumulatedLength + segmentLengths[i] >= targetLength) {
      const segmentProgress = (targetLength - accumulatedLength) / segmentLengths[i]
      const start = path[i]
      const end = path[i + 1]

      const lng = start[0] + (end[0] - start[0]) * segmentProgress
      const lat = start[1] + (end[1] - start[1]) * segmentProgress

      // Calculate bearing (heading direction) - North is 0, East is 90, etc.
      const dx = end[0] - start[0]
      const dy = end[1] - start[1]
      const bearing = Math.atan2(dx, dy) // Radians, 0 = North

      return { lng, lat, bearing }
    }
    accumulatedLength += segmentLengths[i]
  }

  // At the end of path
  const lastIdx = path.length - 1
  const dx = path[lastIdx][0] - path[lastIdx - 1][0]
  const dy = path[lastIdx][1] - path[lastIdx - 1][1]

  return {
    lng: path[lastIdx][0],
    lat: path[lastIdx][1],
    bearing: Math.atan2(dx, dy),
  }
}

export function DisasterMap({ incidents = defaultIncidents, className, showVehicles = true }: DisasterMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)
  const vehiclesRef = useRef<VehicleData[]>([])
  const [routesLoaded, setRoutesLoaded] = useState(false)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      console.error("Mapbox token not found")
      return
    }

    mapboxgl.accessToken = token

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

      // Add incident heatmap
      const geojsonData: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: incidents.map((incident) => ({
          type: "Feature",
          properties: {
            id: incident.id,
            peopleInDanger: incident.peopleInDanger,
            severity: incident.severity,
            weight: (incident.peopleInDanger / 200) * 0.6 + (incident.severity / 5) * 0.4,
          },
          geometry: {
            type: "Point",
            coordinates: incident.coordinates,
          },
        })),
      }

      map.current.addSource("incidents", { type: "geojson", data: geojsonData })

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
        console.log("[3D] Fetching road routes...")
        const routePromises = vehicleDefinitions.map(async (vehicle) => {
          const path = await fetchRoute(vehicle.startPoint, vehicle.endPoint, token)
          return {
            ...vehicle,
            path,
            model: null as THREE.Group | null,
          }
        })

        vehiclesRef.current = await Promise.all(routePromises)
        setRoutesLoaded(true)
        console.log("[3D] Routes loaded:", vehiclesRef.current.length)

        // Add route lines to map for visualization
        vehiclesRef.current.forEach((vehicle, idx) => {
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

            map.current.addLayer({
              id: `route-line-${vehicle.id}`,
              type: "line",
              source: `route-${vehicle.id}`,
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": vehicle.type === "firetruck" ? "#ef4444" : "#3b82f6",
                "line-width": 3,
                "line-opacity": 0.6,
                "line-dasharray": [2, 2],
              },
            })
          }
        })

        // Create Three.js custom layer
        const customLayer: mapboxgl.CustomLayerInterface = {
          id: "3d-vehicles",
          type: "custom",
          renderingMode: "3d",

          onAdd(mapInstance, gl) {
            sceneRef.current = new THREE.Scene()
            cameraRef.current = new THREE.Camera()

            // Better lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
            sceneRef.current.add(ambientLight)

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
            directionalLight.position.set(100, 100, 100)
            sceneRef.current.add(directionalLight)

            const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4)
            directionalLight2.position.set(-100, 50, -100)
            sceneRef.current.add(directionalLight2)

            rendererRef.current = new THREE.WebGLRenderer({
              canvas: mapInstance.getCanvas(),
              context: gl,
              antialias: true,
            })
            rendererRef.current.autoClear = false

            const loader = new GLTFLoader()

            // Smaller scale for the models
            const modelScale = 0.000003

            // Load firetruck
            loader.load(
              "/3d_models/low_poly_fire_truck.glb",
              (gltf) => {
                const template = gltf.scene
                template.scale.set(modelScale, modelScale, modelScale)

                vehiclesRef.current.forEach((vehicle) => {
                  if (vehicle.type === "firetruck" && sceneRef.current) {
                    const model = template.clone()
                    vehicle.model = model
                    sceneRef.current.add(model)
                  }
                })
                console.log("[3D] Fire trucks loaded")
              },
              undefined,
              (error) => console.error("[3D] Fire truck error:", error)
            )

            // Load ambulance
            loader.load(
              "/3d_models/lowpoly_ambulance_-_low_poly_free.glb",
              (gltf) => {
                const template = gltf.scene
                template.scale.set(modelScale, modelScale, modelScale)

                vehiclesRef.current.forEach((vehicle) => {
                  if (vehicle.type === "ambulance" && sceneRef.current) {
                    const model = template.clone()
                    vehicle.model = model
                    sceneRef.current.add(model)
                  }
                })
                console.log("[3D] Ambulances loaded")
              },
              undefined,
              (error) => console.error("[3D] Ambulance error:", error)
            )
          },

          render(_gl, matrix) {
            if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !map.current) return

            vehiclesRef.current.forEach((vehicle) => {
              if (!vehicle.model || vehicle.path.length < 2) return

              // Update progress (loop)
              vehicle.progress += vehicle.speed
              if (vehicle.progress > 1) vehicle.progress = 0

              const { lng, lat, bearing } = interpolatePath(vehicle.path, vehicle.progress)
              const mercator = MercatorCoordinate.fromLngLat({ lng, lat }, 0)

              // Position
              vehicle.model.position.set(mercator.x, mercator.y, mercator.z || 0)

              // Rotation: model should face direction of travel
              // Reset rotation first
              vehicle.model.rotation.set(0, 0, 0)

              // Rotate to face north initially (Z-up in Three.js world)
              vehicle.model.rotateX(Math.PI / 2)

              // Then rotate around Z axis to face bearing direction
              // Bearing: 0 = North, positive = clockwise
              vehicle.model.rotateZ(-bearing)
            })

            // Sync camera
            const m = new THREE.Matrix4().fromArray(matrix)
            cameraRef.current.projectionMatrix = m

            rendererRef.current.resetState()
            rendererRef.current.render(sceneRef.current, cameraRef.current)
            map.current?.triggerRepaint()
          },
        }

        map.current.addLayer(customLayer)
      }

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right")
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
      sceneRef.current = null
      cameraRef.current = null
      rendererRef.current = null
    }
  }, [incidents, showVehicles])

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" />

      {showVehicles && (
        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-sm shadow-lg border">
          <div className="font-semibold mb-2">Emergency Response</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-red-500 rounded-sm" />
            <span>Fire Trucks ({vehiclesRef.current.filter(v => v.type === "firetruck").length})</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-blue-500 rounded-sm" />
            <span>Ambulances ({vehiclesRef.current.filter(v => v.type === "ambulance").length})</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {routesLoaded ? "✓ Following road routes" : "Loading routes..."}
          </div>
        </div>
      )}
    </div>
  )
}
