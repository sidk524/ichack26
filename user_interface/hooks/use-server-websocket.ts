"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { TranscriptPayload } from "@/types/api"

// Configuration
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"
const LOCATION_ENDPOINT = "/phone_location_in"
const TRANSCRIPT_ENDPOINT = "/phone_transcript_in"

// Set to true to enable WebSocket connections (when server is ready)
const WEBSOCKET_ENABLED = true

export type WebSocketStatus = "disconnected" | "connecting" | "connected" | "error"

interface UseServerWebSocketOptions {
  userId: string
  onStatusChange?: (status: WebSocketStatus) => void
  onError?: (error: Error) => void
  onMessage?: (data: unknown) => void
}

interface UseServerWebSocketReturn {
  status: WebSocketStatus
  sendLocation: (location: {
    lat: number
    lon: number
    timestamp: number
    accuracy?: number
  }) => void
  sendTranscript: (transcript: { text: string; is_final: boolean }) => void
  connect: () => void
  disconnect: () => void
  isConnected: boolean
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export function useServerWebSocket(
  options: UseServerWebSocketOptions
): UseServerWebSocketReturn {
  const { userId, onStatusChange, onError, onMessage } = options

  const [status, setStatus] = useState<WebSocketStatus>("disconnected")

  // WebSocket refs
  const locationWsRef = useRef<WebSocket | null>(null)
  const transcriptWsRef = useRef<WebSocket | null>(null)

  // Store callbacks in refs to avoid stale closures
  const onStatusChangeRef = useRef(onStatusChange)
  const onErrorRef = useRef(onError)
  const onMessageRef = useRef(onMessage)

  // Update refs when callbacks change
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
    onErrorRef.current = onError
    onMessageRef.current = onMessage
  }, [onStatusChange, onError, onMessage])

  const updateStatus = useCallback((newStatus: WebSocketStatus) => {
    setStatus(newStatus)
    onStatusChangeRef.current?.(newStatus)
  }, [])

  const handleError = useCallback((error: Error) => {
    console.error("[WebSocket] Error:", error.message)
    onErrorRef.current?.(error)
    updateStatus("error")
  }, [updateStatus])

  const createWebSocket = useCallback(
    (endpoint: string): WebSocket | null => {
      if (!WEBSOCKET_ENABLED) {
        console.log(`[WebSocket] Disabled. Would connect to: ${WS_URL}${endpoint}`)
        return null
      }

      const fullUrl = `${WS_URL}${endpoint}`
      console.log(`[WebSocket] Connecting to: ${fullUrl}`)

      try {
        const ws = new WebSocket(fullUrl)

        ws.onopen = () => {
          console.log(`[WebSocket] Connected to ${endpoint}`)
          updateStatus("connected")
        }

        ws.onclose = (event) => {
          console.log(`[WebSocket] Disconnected from ${endpoint}:`, event.code, event.reason)
          updateStatus("disconnected")
        }

        ws.onerror = () => {
          handleError(new Error(`WebSocket error on ${endpoint}`))
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            onMessageRef.current?.(data)
          } catch {
            onMessageRef.current?.(event.data)
          }
        }

        return ws
      } catch (error) {
        handleError(error instanceof Error ? error : new Error("Failed to create WebSocket"))
        return null
      }
    },
    [handleError, updateStatus]
  )

  const connect = useCallback(() => {
    if (!WEBSOCKET_ENABLED) {
      console.log("[WebSocket] Disabled (mock mode)")
      updateStatus("disconnected")
      return
    }

    console.log("[WebSocket] Connecting...")
    updateStatus("connecting")

    // Close existing connections first
    if (locationWsRef.current) {
      locationWsRef.current.close()
      locationWsRef.current = null
    }
    if (transcriptWsRef.current) {
      transcriptWsRef.current.close()
      transcriptWsRef.current = null
    }

    // Create new connections
    locationWsRef.current = createWebSocket(LOCATION_ENDPOINT)
    transcriptWsRef.current = createWebSocket(TRANSCRIPT_ENDPOINT)
  }, [createWebSocket, updateStatus])

  const disconnect = useCallback(() => {
    console.log("[WebSocket] Disconnecting...")

    if (locationWsRef.current) {
      locationWsRef.current.close()
      locationWsRef.current = null
    }
    if (transcriptWsRef.current) {
      transcriptWsRef.current.close()
      transcriptWsRef.current = null
    }

    updateStatus("disconnected")
  }, [updateStatus])

  const sendLocation = useCallback(
    (location: { lat: number; lon: number; timestamp: number; accuracy?: number }) => {
      const payload = {
        user_id: userId,
        lat: location.lat,
        lon: location.lon,
        timestamp: location.timestamp,
        accuracy: location.accuracy ?? 0,
      }

      if (locationWsRef.current?.readyState === WebSocket.OPEN) {
        console.log("[WebSocket] Sending location:", payload)
        locationWsRef.current.send(JSON.stringify(payload))
      } else {
        console.warn("[WebSocket] Location socket not open, state:", locationWsRef.current?.readyState)
      }
    },
    [userId]
  )

  const sendTranscript = useCallback(
    (transcript: { text: string; is_final: boolean }) => {
      const payload: TranscriptPayload = {
        user_id: userId,
        data: { transcript },
      }

      if (transcriptWsRef.current?.readyState === WebSocket.OPEN) {
        console.log("[WebSocket] Sending transcript:", payload)
        transcriptWsRef.current.send(JSON.stringify(payload))
      } else {
        console.warn("[WebSocket] Transcript socket not open, state:", transcriptWsRef.current?.readyState)
      }
    },
    [userId]
  )

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      console.log("[WebSocket] Cleanup on unmount")
      locationWsRef.current?.close()
      transcriptWsRef.current?.close()
    }
  }, [])

  return {
    status,
    sendLocation,
    sendTranscript,
    connect,
    disconnect,
    isConnected: status === "connected",
  }
}

export default useServerWebSocket
