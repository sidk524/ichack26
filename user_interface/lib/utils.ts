import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Find the nearest hospital to a given coordinate
 * Supports both direct lat/lon and nested coordinates object
 */
export function findNearestHospital<T extends { lat?: number; lon?: number; coordinates?: { lat: number; lon: number }; name: string }>(
  lat: number,
  lon: number,
  hospitals: T[]
): (T & { distance_km: number }) | null {
  if (!hospitals || hospitals.length === 0) return null

  const getCoords = (h: T) => {
    if (h.coordinates) return { lat: h.coordinates.lat, lon: h.coordinates.lon }
    if (h.lat !== undefined && h.lon !== undefined) return { lat: h.lat, lon: h.lon }
    return null
  }

  let nearest: T | null = null
  let minDistance = Infinity

  for (const hospital of hospitals) {
    const coords = getCoords(hospital)
    if (!coords) continue

    const distance = calculateDistance(lat, lon, coords.lat, coords.lon)
    if (distance < minDistance) {
      minDistance = distance
      nearest = hospital
    }
  }

  if (!nearest) return null
  return { ...nearest, distance_km: minDistance }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Format a timestamp to a human-readable string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}

/**
 * Format distance in km to a human-readable string
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km.toFixed(1)}km`
}
