"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { cn } from "@/lib/utils"
import {
  fetchAllDisasterData,
  type DisasterEvent,
  type AllDisasterData,
} from "@/lib/disaster-api"

interface VehicleData {
  id: string
  type: "firetruck" | "ambulance"
  model: THREE.Group | null
  path: [number, number][]
  progress: number
  speed: number
  startPoint: [number, number]
  endPoint: [number, number]
}

interface DisasterMapProps {
  className?: string
  showVehicles?: boolean
  showLegend?: boolean
  showDisasters?: boolean
}

// Vehicle definitions for animation
const vehicleDefinitions: Omit<VehicleData, "model" | "path">[] = [
  { id: "ft1", type: "firetruck", startPoint: [36.10, 36.25], endPoint: [36.165, 36.202], progress: 0, speed: 0.003 },
  { id: "ft2", type: "firetruck", startPoint: [36.22, 36.15], endPoint: [36.165, 36.202], progress: 0.3, speed: 0.0025 },
  { id: "amb1", type: "ambulance", startPoint: [36.85, 37.55], endPoint: [36.937, 37.585], progress: 0.1, speed: 0.0035 },
  { id: "amb2", type: "ambulance", startPoint: [37.02, 37.62], endPoint: [36.937, 37.585], progress: 0.5, speed: 0.003 },
  { id: "ft3", type: "firetruck", startPoint: [37.32, 37.12], endPoint: [37.38, 37.07], progress: 0.2, speed: 0.0028 },
  { id: "amb3", type: "ambulance", startPoint: [36.48, 36.52], endPoint: [36.58, 36.59], progress: 0.4, speed: 0.0032 },
]

const MercatorCoordinate = mapboxgl.MercatorCoordinate

// Fetch route from Mapbox Directions API
async function fetchRoute(start: [number, number], end: [number, number], accessToken: string): Promise<[number, number][]> {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${accessToken}`
    const response = await fetch(url)
    const data = await response.json()
    if (data.routes?.[0]) return data.routes[0].geometry.coordinates as [number, number][]
  } catch (error) {
    console.error("Error fetching route:", error)
  }
  return [start, end]
}

// Interpolate position along path
function interpolatePath(path: [number, number][], progress: number): { lng: number; lat: number; bearing: number } {
  if (path.length < 2) return { lng: path[0]?.[0] || 0, lat: path[0]?.[1] || 0, bearing: 0 }

  const clampedProgress = Math.max(0, Math.min(1, progress))
  let totalLength = 0
  const segmentLengths: number[] = []

  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1][0] - path[i][0]
    const dy = path[i + 1][1] - path[i][1]
    segmentLengths.push(Math.sqrt(dx * dx + dy * dy))
    totalLength += segmentLengths[i]
  }

  const targetLength = clampedProgress * totalLength
  let accumulatedLength = 0

  for (let i = 0; i < segmentLengths.length; i++) {
    if (accumulatedLength + segmentLengths[i] >= targetLength) {
      const segmentProgress = segmentLengths[i] === 0 ? 0 : (targetLength - accumulatedLength) / segmentLengths[i]
      const start = path[i]
      const end = path[i + 1]
      const lng = start[0] + (end[0] - start[0]) * segmentProgress
      const lat = start[1] + (end[1] - start[1]) * segmentProgress
      const bearing = Math.atan2(end[0] - start[0], end[1] - start[1])
      return { lng, lat, bearing }
    }
    accumulatedLength += segmentLengths[i]
  }

  const lastIdx = path.length - 1
  return {
    lng: path[lastIdx][0],
    lat: path[lastIdx][1],
    bearing: Math.atan2(path[lastIdx][0] - path[lastIdx - 1][0], path[lastIdx][1] - path[lastIdx - 1][1]),
  }
}

export function DisasterMap({
  className,
  showVehicles = true,
  showLegend = true,
  showDisasters = true,
}: DisasterMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)
  const vehiclesRef = useRef<VehicleData[]>([])
  const vehicleTemplatesRef = useRef<{ firetruck: THREE.Group | null; ambulance: THREE.Group | null }>({ firetruck: null, ambulance: null })
  const disasterModelsRef = useRef<Map<string, THREE.Group>>(new Map())
  const modelTemplatesRef = useRef<Record<string, THREE.Group>>({})
  const [routesLoaded, setRoutesLoaded] = useState(false)
  const [disasterData, setDisasterData] = useState<AllDisasterData>({
    earthquakes: [],
    fires: [],
    storms: [],
    floods: [],
    volcanoes: [],
    droughts: [],
    tsunamis: [],
    hospitals: [],
    schools: [],
    shelters: [],
    refugeeCamps: [],
    bunkers: [],
    assemblyPoints: [],
    protests: [],
    crimes: [],
    powerOutages: [],
    helicopters: [],
    borderCrossings: [],
    humanitarianCorridors: [],
    wfpFacilities: [],
    refugeePopulations: [],
    militaryZones: [],
  })
  const disasterDataRef = useRef(disasterData)

  // Fetch disaster data
  useEffect(() => {
    if (!showDisasters) return

    const loadData = async () => {
      console.log("[DisasterMap] Fetching disaster data...")
      const data = await fetchAllDisasterData(undefined, {
        includeProtests: true,
        includeUK: false,
        includeHumanitarian: true,
      })
      console.log("[DisasterMap] Data loaded:", {
        bunkers: data.bunkers.length,
        refugeeCamps: data.refugeeCamps.length,
        borderCrossings: data.borderCrossings.length,
        wfpFacilities: data.wfpFacilities.length,
        militaryZones: data.militaryZones.length,
      })
      setDisasterData(data)
    }

    loadData()
    // Refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [showDisasters])

  // Keep ref in sync with state
  useEffect(() => {
    disasterDataRef.current = disasterData
  }, [disasterData])

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

      // Create Three.js scene for all 3D models
      const customLayer: mapboxgl.CustomLayerInterface = {
        id: "3d-models",
        type: "custom",
        renderingMode: "3d",

        onAdd(mapInstance, gl) {
          sceneRef.current = new THREE.Scene()
          cameraRef.current = new THREE.Camera()

          // Lighting
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

          // Load vehicle models
          if (showVehicles) {
            loader.load(
              "/3d_models/low_poly_fire_truck.glb",
              (gltf) => {
                const template = gltf.scene
                // Scale is set dynamically in render loop based on meterInMercatorCoordinateUnits
                vehicleTemplatesRef.current.firetruck = template
                // Apply to any already-loaded vehicles
                vehiclesRef.current.forEach((v) => {
                  if (v.type === "firetruck" && !v.model && sceneRef.current) {
                    v.model = template.clone()
                    sceneRef.current.add(v.model)
                  }
                })
              },
              undefined,
              (error) => console.error("[3D] Error loading firetruck:", error)
            )

            loader.load(
              "/3d_models/lowpoly_ambulance_-_low_poly_free.glb",
              (gltf) => {
                const template = gltf.scene
                // Scale is set dynamically in render loop based on meterInMercatorCoordinateUnits
                vehicleTemplatesRef.current.ambulance = template
                // Apply to any already-loaded vehicles
                vehiclesRef.current.forEach((v) => {
                  if (v.type === "ambulance" && !v.model && sceneRef.current) {
                    v.model = template.clone()
                    sceneRef.current.add(v.model)
                  }
                })
              },
              undefined,
              (error) => console.error("[3D] Error loading ambulance:", error)
            )
          }

          // Load disaster marker models
          // Store base scales in meters - actual scale will be computed per-position
          const modelConfigs: Record<string, { path: string; baseSize: number }> = {
            hospital: { path: "/3d_models/model1.glb", baseSize: 80 },
            building: { path: "/3d_models/model2.glb", baseSize: 80 },
            fire: { path: "/3d_models/model3.glb", baseSize: 80 },
            helicopter: { path: "/3d_models/model4.glb", baseSize: 80 },
            bunker: { path: "/3d_models/bunker3d.glb", baseSize: 600 },
            tent: { path: "/3d_models/tent3d.glb", baseSize: 500 },
            border_crossing: { path: "/3d_models/border_crossing.glb", baseSize: 700 },
            warehouse: { path: "/3d_models/warehouse3d.glb", baseSize: 1000 },
            military: { path: "/3d_models/military3d.glb", baseSize: 900 },
          }

          Object.entries(modelConfigs).forEach(([key, config]) => {
            loader.load(
              config.path,
              (gltf) => {
                const template = gltf.scene
                // Store baseSize as userData for later scaling
                template.userData.baseSize = config.baseSize
                modelTemplatesRef.current[key] = template
                console.log(`[3D] Loaded ${key} model, baseSize: ${config.baseSize}m`)
              },
              undefined,
              (error) => console.error(`[3D] Error loading ${key}:`, error)
            )
          })
        },

        render(_gl, matrix) {
          if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !map.current) return

          // Update vehicle positions
          vehiclesRef.current.forEach((vehicle) => {
            if (!vehicle.model || vehicle.path.length < 2) return

            vehicle.progress += vehicle.speed
            if (vehicle.progress > 1) vehicle.progress = 0

            const { lng, lat, bearing } = interpolatePath(vehicle.path, vehicle.progress)
            const mercator = MercatorCoordinate.fromLngLat({ lng, lat }, 0)

            // Dynamic scale based on position and zoom level
            const meterScale = mercator.meterInMercatorCoordinateUnits()
            const vehicleSize = 15 // ~15 meters for a vehicle

            // Scale down as we zoom in, until reaching fixed size at maxZoom
            const zoom = map.current!.getZoom()
            const minZoom = 6
            const maxZoom = 12
            const minScale = 0.03
            const zoomFactor = Math.max(minScale, 1 - (zoom - minZoom) / (maxZoom - minZoom) * (1 - minScale))

            const scale = vehicleSize * meterScale * zoomFactor

            // Offset upward by half model height so base sits on ground
            const heightOffset = scale * 0.5
            vehicle.model.position.set(mercator.x, mercator.y, (mercator.z || 0) + heightOffset)
            vehicle.model.scale.set(scale, scale, scale)
            vehicle.model.rotation.set(0, 0, 0)
            vehicle.model.rotateX(Math.PI / 2)
            vehicle.model.rotateZ(-bearing)
          })

          // Update disaster markers using refs (not closured state)
          const data = disasterDataRef.current
          const templates = modelTemplatesRef.current

          if (Object.keys(templates).length > 0) {
            const allEvents = [
              // Shelters & Sanctuaries
              ...(data.hospitals || []).map((e) => ({ ...e, modelType: "hospital" as const })),
              ...(data.schools || []).map((e) => ({ ...e, modelType: "hospital" as const })),
              ...(data.shelters || []).map((e) => ({ ...e, modelType: "hospital" as const })),
              ...(data.refugeeCamps || []).map((e) => ({ ...e, modelType: "tent" as const })),
              ...(data.bunkers || []).map((e) => ({ ...e, modelType: "bunker" as const })),
              ...(data.assemblyPoints || []).map((e) => ({ ...e, modelType: "hospital" as const })),
              // Humanitarian
              ...(data.borderCrossings || []).map((e) => ({ ...e, modelType: "border_crossing" as const })),
              ...(data.humanitarianCorridors || []).map((e) => ({ ...e, modelType: "border_crossing" as const })),
              ...(data.wfpFacilities || []).map((e) => ({ ...e, modelType: "warehouse" as const })),
              ...(data.refugeePopulations || []).map((e) => ({ ...e, modelType: "tent" as const })),
              ...(data.militaryZones || []).map((e) => ({ ...e, modelType: "military" as const })),
              // Natural Disasters
              ...(data.earthquakes || []).map((e) => ({ ...e, modelType: "building" as const })),
              ...(data.floods || []).map((e) => ({ ...e, modelType: "building" as const })),
              ...(data.volcanoes || []).map((e) => ({ ...e, modelType: "fire" as const })),
              ...(data.droughts || []).map((e) => ({ ...e, modelType: "building" as const })),
              ...(data.storms || []).map((e) => ({ ...e, modelType: "building" as const })),
              ...(data.fires || []).map((e) => ({ ...e, modelType: "fire" as const })),
              ...(data.tsunamis || []).map((e) => ({ ...e, modelType: "building" as const })),
              // People Disasters
              ...(data.protests || []).map((e) => ({ ...e, modelType: "building" as const })),
              ...(data.crimes || []).map((e) => ({ ...e, modelType: "building" as const })),
              // Infrastructure
              ...(data.powerOutages || []).map((e) => ({ ...e, modelType: "building" as const })),
              // Emergency Response
              ...(data.helicopters || []).map((e) => ({ ...e, modelType: "helicopter" as const })),
            ]

            allEvents.forEach((event) => {
              const modelKey = `${event.modelType}-${event.id}`
              let model = disasterModelsRef.current.get(modelKey)

              if (!model && templates[event.modelType] && sceneRef.current) {
                model = templates[event.modelType].clone()
                // Apply initial scale from template
                const baseSize = templates[event.modelType].userData.baseSize || 500
                model.userData.baseSize = baseSize
                sceneRef.current.add(model)
                disasterModelsRef.current.set(modelKey, model)
                console.log(`[3D] Added ${event.modelType} at`, event.coordinates, `size: ${baseSize}m`)
              }

              if (model) {
                const mercator = MercatorCoordinate.fromLngLat(
                  { lng: event.coordinates[0], lat: event.coordinates[1] },
                  0
                )
                const meterScale = mercator.meterInMercatorCoordinateUnits()
                const baseSize = model.userData.baseSize || 300

                // Scale down models as we zoom in, until reaching fixed size at maxZoom
                const zoom = map.current!.getZoom()
                const minZoom = 6   // Zoom where models are largest
                const maxZoom = 12  // Zoom where models reach minimum size
                const minScale = 0.03 // Minimum scale factor (15% of original)
                const zoomFactor = Math.max(minScale, 1 - (zoom - minZoom) / (maxZoom - minZoom) * (1 - minScale))

                const scale = baseSize * meterScale * zoomFactor
                model.scale.set(scale, scale, scale)

                // Offset upward by half model height so base sits on ground
                const heightOffset = scale * 0.5
                // Helicopters fly at ~200m altitude
                const altitude = event.modelType === "helicopter" ? 200 * meterScale : heightOffset
                model.position.set(mercator.x, mercator.y, (mercator.z || 0) + (event.modelType === "helicopter" ? altitude : heightOffset))

                // Rotate to stand upright (GLTF models need X rotation)
                model.rotation.x = Math.PI / 2

                // Rotate helicopters for propeller animation
                if (event.modelType === "helicopter") {
                  model.rotation.z += 0.02
                }
              }
            })
          }

          // Sync camera
          const m = new THREE.Matrix4().fromArray(matrix)
          cameraRef.current.projectionMatrix = m
          cameraRef.current.projectionMatrixInverse.copy(m).invert()

          rendererRef.current.resetState()
          rendererRef.current.render(sceneRef.current, cameraRef.current)
          map.current?.triggerRepaint()
        },
      }

      // Initialize vehicles with routes
      if (showVehicles) {
        console.log("[3D] Fetching road routes...")
        const routePromises = vehicleDefinitions.map(async (vehicle) => {
          const path = await fetchRoute(vehicle.startPoint, vehicle.endPoint, token)
          return { ...vehicle, path, model: null as THREE.Group | null }
        })

        vehiclesRef.current = await Promise.all(routePromises)
        setRoutesLoaded(true)

        // Apply vehicle templates if they were already loaded
        vehiclesRef.current.forEach((v) => {
          if (!v.model && sceneRef.current) {
            const template = v.type === "firetruck"
              ? vehicleTemplatesRef.current.firetruck
              : vehicleTemplatesRef.current.ambulance
            if (template) {
              v.model = template.clone()
              sceneRef.current.add(v.model)
            }
          }
        })

        // Add route lines
        vehiclesRef.current.forEach((vehicle) => {
          if (vehicle.path.length > 1 && map.current) {
            map.current.addSource(`route-${vehicle.id}`, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: vehicle.path },
              },
            })

            map.current.addLayer({
              id: `route-line-${vehicle.id}`,
              type: "line",
              source: `route-${vehicle.id}`,
              paint: {
                "line-color": vehicle.type === "firetruck" ? "#ef4444" : "#3b82f6",
                "line-width": 3,
                "line-opacity": 0.6,
                "line-dasharray": [2, 2],
              },
            })
          }
        })
      }

      map.current.addLayer(customLayer)
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right")
    })

    return () => {
      // Helper to dispose Three.js objects
      const disposeObject = (obj: THREE.Object3D) => {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose()
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose())
            } else if (child.material) {
              child.material.dispose()
            }
          }
        })
      }

      // Dispose vehicle models
      vehiclesRef.current.forEach((vehicle) => {
        if (vehicle.model) disposeObject(vehicle.model)
      })
      vehiclesRef.current = []

      // Dispose disaster models
      disasterModelsRef.current.forEach((model) => disposeObject(model))
      disasterModelsRef.current.clear()

      // Dispose templates
      Object.values(vehicleTemplatesRef.current).forEach((template) => {
        if (template) disposeObject(template)
      })
      vehicleTemplatesRef.current = { firetruck: null, ambulance: null }

      Object.values(modelTemplatesRef.current).forEach((template) => {
        if (template) disposeObject(template)
      })
      modelTemplatesRef.current = {}

      // Dispose renderer
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }

      if (map.current) {
        map.current.remove()
        map.current = null
      }
      sceneRef.current = null
      cameraRef.current = null
      rendererRef.current = null
    }
  }, [showVehicles, showDisasters])

  // Update disaster models when data changes
  useEffect(() => {
    if (map.current && showDisasters) {
      map.current.triggerRepaint()
    }
  }, [disasterData, showDisasters])

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" />

      {showLegend && (
        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs shadow-lg border max-h-[70vh] overflow-y-auto">
          <div className="font-semibold mb-2 text-sm">Live Disaster Data</div>

          {showDisasters && (
            <div className="space-y-3">
              {/* Shelters & Sanctuaries */}
              <div>
                <div className="font-medium text-muted-foreground mb-1">Shelters & Sanctuaries</div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                  <span>Hospitals ({disasterData.hospitals.length})</span>
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded-full" />
                  <span>Schools ({disasterData.schools.length})</span>
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-teal-500 rounded-full" />
                  <span>Shelters ({disasterData.shelters.length})</span>
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full" />
                  <span>Refugee Camps ({disasterData.refugeeCamps.length})</span>
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-stone-600 rounded-full" />
                  <span>Bunkers ({disasterData.bunkers.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-lime-500 rounded-full" />
                  <span>Assembly Points ({disasterData.assemblyPoints.length})</span>
                </div>
              </div>

              {/* Humanitarian */}
              <div className="border-t pt-2">
                <div className="font-medium text-muted-foreground mb-1">Humanitarian</div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                  <span>Border Crossings ({disasterData.borderCrossings.length})</span>
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                  <span>Humanitarian Corridors ({disasterData.humanitarianCorridors.length})</span>
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-orange-400 rounded-full" />
                  <span>WFP Facilities ({disasterData.wfpFacilities.length})</span>
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-violet-500 rounded-full" />
                  <span>Refugee Populations ({disasterData.refugeePopulations.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-red-700 rounded-full" />
                  <span>Military Zones ({disasterData.militaryZones.length})</span>
                </div>
              </div>

              {/* Natural Disasters */}
              <div className="border-t pt-2">
                <div className="font-medium text-muted-foreground mb-1">Natural Disasters</div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
                  <span>Earthquakes ({disasterData.earthquakes.length})</span>
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-red-600 rounded-full" />
                  <span>Fires ({disasterData.fires.length})</span>
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                  <span>Floods ({disasterData.floods.length})</span>
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-gray-500 rounded-full" />
                  <span>Storms ({disasterData.storms.length})</span>
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-red-800 rounded-full" />
                  <span>Volcanoes ({disasterData.volcanoes.length})</span>
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-yellow-600 rounded-full" />
                  <span>Droughts ({disasterData.droughts.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-cyan-600 rounded-full" />
                  <span>Tsunamis ({disasterData.tsunamis.length})</span>
                </div>
              </div>

              {/* People Disasters */}
              <div className="border-t pt-2">
                <div className="font-medium text-muted-foreground mb-1">People Disasters</div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full" />
                  <span>Protests ({disasterData.protests.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-pink-600 rounded-full" />
                  <span>Crime ({disasterData.crimes.length})</span>
                </div>
              </div>

              {/* Infrastructure */}
              <div className="border-t pt-2">
                <div className="font-medium text-muted-foreground mb-1">Infrastructure</div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                  <span>Power Outages ({disasterData.powerOutages.length})</span>
                </div>
              </div>

              {/* Emergency Response */}
              <div className="border-t pt-2">
                <div className="font-medium text-muted-foreground mb-1">Emergency Response</div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />
                  <span>Helicopters ({disasterData.helicopters.length})</span>
                </div>
              </div>
            </div>
          )}

          {showVehicles && (
            <div className="border-t mt-2 pt-2">
              <div className="font-medium text-muted-foreground mb-1">Vehicles</div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-sm" />
                <span>Fire Trucks ({vehiclesRef.current.filter((v) => v.type === "firetruck").length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
                <span>Ambulances ({vehiclesRef.current.filter((v) => v.type === "ambulance").length})</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {routesLoaded ? "✓ Following road routes" : "Loading routes..."}
              </div>
            </div>
          )}

          <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t">
            Sources: USGS, NASA EONET, GDELT, OSM, UK Police
          </div>
        </div>
      )}
    </div>
  )
}
