"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Geolocation Hook for Live Location Tracking
 * ============================================
 *
 * A React hook that provides real-time GPS location tracking using the
 * browser's native Geolocation API. Designed for emergency response
 * scenarios where accurate, continuous location updates are critical.
 *
 * Features:
 * - Continuous position watching with `watchPosition()`
 * - High accuracy mode for GPS-based tracking
 * - Permission state management
 * - Error handling with descriptive messages
 * - Location history buffer for batch server uploads
 * - Configurable update throttling to reduce server load
 *
 * Usage:
 * ```tsx
 * const {
 *   position,
 *   error,
 *   permissionState,
 *   isWatching,
 *   startWatching,
 *   stopWatching,
 *   locationHistory,
 *   clearHistory,
 * } = useGeolocation({
 *   enableHighAccuracy: true,
 *   throttleMs: 3000,
 *   maxHistoryLength: 100,
 *   onPositionUpdate: (pos) => console.log('New position:', pos),
 * })
 * ```
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a geographic position with metadata
 */
export interface GeoPosition {
  /** Latitude in decimal degrees */
  latitude: number
  /** Longitude in decimal degrees */
  longitude: number
  /** Accuracy of the position in meters */
  accuracy: number
  /** Altitude in meters above sea level (if available) */
  altitude: number | null
  /** Accuracy of the altitude in meters (if available) */
  altitudeAccuracy: number | null
  /** Direction of travel in degrees from true north (if available) */
  heading: number | null
  /** Speed in meters per second (if available) */
  speed: number | null
  /** Timestamp when the position was recorded */
  timestamp: number
}

/**
 * Error information when geolocation fails
 */
export interface GeoError {
  /** Error code from GeolocationPositionError */
  code: number
  /** Human-readable error message */
  message: string
}

/**
 * Browser permission state for geolocation
 */
export type PermissionState = "granted" | "denied" | "prompt" | "unsupported"

/**
 * Configuration options for the geolocation hook
 */
export interface UseGeolocationOptions {
  /**
   * Enable high accuracy mode (uses GPS instead of wifi/cell triangulation)
   * Recommended for emergency scenarios but uses more battery
   * @default true
   */
  enableHighAccuracy?: boolean

  /**
   * Maximum time (ms) to wait for a position before timing out
   * @default 10000
   */
  timeout?: number

  /**
   * Maximum age (ms) of a cached position that's acceptable
   * Set to 0 to always get fresh position
   * @default 0
   */
  maximumAge?: number

  /**
   * Minimum time (ms) between position updates sent to callbacks
   * Helps reduce server load while still tracking continuously
   * @default 3000
   */
  throttleMs?: number

  /**
   * Maximum number of positions to keep in history buffer
   * Older positions are removed when limit is reached
   * @default 100
   */
  maxHistoryLength?: number

  /**
   * Start watching position automatically when hook mounts
   * @default false
   */
  autoStart?: boolean

  /**
   * Callback fired when a new position is received (after throttling)
   * Use this to send updates to your server
   */
  onPositionUpdate?: (position: GeoPosition) => void

  /**
   * Callback fired when an error occurs
   */
  onError?: (error: GeoError) => void

  /**
   * Callback fired when permission state changes
   */
  onPermissionChange?: (state: PermissionState) => void
}

/**
 * Return value from the useGeolocation hook
 */
export interface UseGeolocationReturn {
  /** Current position (null if not yet obtained) */
  position: GeoPosition | null
  /** Current error (null if no error) */
  error: GeoError | null
  /** Current permission state */
  permissionState: PermissionState
  /** Whether the hook is actively watching position */
  isWatching: boolean
  /** Whether a position request is in progress */
  isLoading: boolean
  /** Start watching position */
  startWatching: () => void
  /** Stop watching position */
  stopWatching: () => void
  /** Get a single position without continuous watching */
  getCurrentPosition: () => Promise<GeoPosition>
  /** History of recorded positions (for batch uploads) */
  locationHistory: GeoPosition[]
  /** Clear the location history buffer */
  clearHistory: () => void
}

// ============================================================================
// Constants
// ============================================================================

const ERROR_MESSAGES: Record<number, string> = {
  1: "Location permission denied. Please enable location access in your browser settings.",
  2: "Unable to determine your location. Please check your GPS signal.",
  3: "Location request timed out. Please try again.",
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    throttleMs = 3000,
    maxHistoryLength = 100,
    autoStart = false,
    onPositionUpdate,
    onError,
    onPermissionChange,
  } = options

  // State
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [error, setError] = useState<GeoError | null>(null)
  const [permissionState, setPermissionState] =
    useState<PermissionState>("prompt")
  const [isWatching, setIsWatching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [locationHistory, setLocationHistory] = useState<GeoPosition[]>([])

  // Refs for cleanup and throttling
  const watchIdRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Geolocation options object
  const geoOptions: PositionOptions = {
    enableHighAccuracy,
    timeout,
    maximumAge,
  }

  /**
   * Convert GeolocationPosition to our GeoPosition type
   */
  const toGeoPosition = useCallback(
    (pos: GeolocationPosition): GeoPosition => ({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      altitudeAccuracy: pos.coords.altitudeAccuracy,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp,
    }),
    []
  )

  /**
   * Handle successful position update
   */
  const handlePositionSuccess = useCallback(
    (pos: GeolocationPosition) => {
      const geoPos = toGeoPosition(pos)
      const now = Date.now()

      // Always update the current position state
      setPosition(geoPos)
      setError(null)
      setIsLoading(false)

      // Throttle updates for callbacks and history
      if (now - lastUpdateRef.current >= throttleMs) {
        lastUpdateRef.current = now

        // Add to history (with max length limit)
        setLocationHistory((prev) => {
          const updated = [...prev, geoPos]
          if (updated.length > maxHistoryLength) {
            return updated.slice(-maxHistoryLength)
          }
          return updated
        })

        // Fire callback
        optionsRef.current.onPositionUpdate?.(geoPos)
      }
    },
    [toGeoPosition, throttleMs, maxHistoryLength]
  )

  /**
   * Handle position error
   */
  const handlePositionError = useCallback((err: GeolocationPositionError) => {
    const geoError: GeoError = {
      code: err.code,
      message: ERROR_MESSAGES[err.code] || err.message,
    }
    setError(geoError)
    setIsLoading(false)
    optionsRef.current.onError?.(geoError)

    // Update permission state if denied
    if (err.code === 1) {
      setPermissionState("denied")
      optionsRef.current.onPermissionChange?.("denied")
    }
  }, [])

  /**
   * Check and update permission state
   */
  const checkPermission = useCallback(async () => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setPermissionState("unsupported")
      onPermissionChange?.("unsupported")
      return "unsupported" as PermissionState
    }

    // Check permission status if Permissions API is available
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({
          name: "geolocation",
        })
        const state = result.state as PermissionState
        setPermissionState(state)
        onPermissionChange?.(state)

        // Listen for permission changes
        result.onchange = () => {
          const newState = result.state as PermissionState
          setPermissionState(newState)
          optionsRef.current.onPermissionChange?.(newState)
        }

        return state
      } catch {
        // Permissions API not fully supported, return prompt
        return "prompt" as PermissionState
      }
    }

    return "prompt" as PermissionState
  }, [onPermissionChange])

  /**
   * Start watching position
   */
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: "Geolocation is not supported by your browser",
      })
      return
    }

    // Don't start if already watching
    if (watchIdRef.current !== null) {
      return
    }

    setIsLoading(true)
    setError(null)

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      geoOptions
    )

    setIsWatching(true)
  }, [handlePositionSuccess, handlePositionError, geoOptions])

  /**
   * Stop watching position
   */
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsWatching(false)
    setIsLoading(false)
  }, [])

  /**
   * Get current position once (without continuous watching)
   */
  const getCurrentPosition = useCallback((): Promise<GeoPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"))
        return
      }

      setIsLoading(true)

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const geoPos = toGeoPosition(pos)
          setPosition(geoPos)
          setError(null)
          setIsLoading(false)
          resolve(geoPos)
        },
        (err) => {
          handlePositionError(err)
          reject(err)
        },
        geoOptions
      )
    })
  }, [toGeoPosition, handlePositionError, geoOptions])

  /**
   * Clear location history
   */
  const clearHistory = useCallback(() => {
    setLocationHistory([])
  }, [])

  // Check permission on mount
  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart) {
      startWatching()
    }
  }, [autoStart, startWatching])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return {
    position,
    error,
    permissionState,
    isWatching,
    isLoading,
    startWatching,
    stopWatching,
    getCurrentPosition,
    locationHistory,
    clearHistory,
  }
}
