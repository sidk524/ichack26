"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { LocationPayload, TranscriptPayload } from "@/types/api"

// Configuration
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"
const LOCATION_ENDPOINT = "/phone_location_in"
const TRANSCRIPT_ENDPOINT = "/phone_transcript_in"

// Set to true to enable WebSocket connections (when server is ready)
const WEBSOCKET_ENABLED = false

// Reconnection settings
const RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30000
const RECONNECT_BACKOFF_MULTIPLIER = 2

export type WebSocketStatus = "disconnected" | "connecting" | "connected" | "error"

interface UseServerWebSocketOptions {
  /** Unique identifier for this client session */
  clientId: string
  /** Called when connection status changes */
  onStatusChange?: (status: WebSocketStatus) => void
  /** Called when an error occurs */
  onError?: (error: Error) => void
  /** Called when a message is received (for debugging) */
  onMessage?: (data: unknown) => void
  /** Whether to auto-connect on mount */
  autoConnect?: boolean
}

interface UseServerWebSocketReturn {
  /** Current connection status */
  status: WebSocketStatus
  /** Send location data to the server */
  sendLocation: (location: {
    lat: number
    lon: number
    timestamp: number
    accuracy?: number
  }) => void
  /** Send transcript data to the server */
  sendTranscript: (transcript: { text: string; is_final: boolean }) => void
  /** Manually connect to the server */
  connect: () => void
  /** Manually disconnect from the server */
  disconnect: () => void
  /** Whether the connection is active */
  isConnected: boolean
}

/**
 * Generate a unique session ID for tracking calls
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Hook for managing WebSocket connections to the server
 *
 * Currently disabled/mocked until the server is ready.
 * When server is deployed to GCP:
 * 1. Set NEXT_PUBLIC_WS_URL environment variable
 * 2. Set WEBSOCKET_ENABLED to true
 */
export function useServerWebSocket(
  options: UseServerWebSocketOptions
): UseServerWebSocketReturn {
  const {
    clientId,
    onStatusChange,
    onError,
    onMessage,
    autoConnect = false,
  } = options

  const [status, setStatus] = useState<WebSocketStatus>("disconnected")

  // WebSocket refs
  const locationWsRef = useRef<WebSocket | null>(null)
  const transcriptWsRef = useRef<WebSocket | null>(null)

  // Reconnection state
  const reconnectDelayRef = useRef(RECONNECT_DELAY_MS)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldReconnectRef = useRef(true)

  // Update status and notify callback
  const updateStatus = useCallback(
    (newStatus: WebSocketStatus) => {
      setStatus(newStatus)
      onStatusChange?.(newStatus)
    },
    [onStatusChange]
  )

  // Handle errors
  const handleError = useCallback(
    (error: Error) => {
      console.error("[WebSocket] Error:", error.message)
      onError?.(error)
      updateStatus("error")
    },
    [onError, updateStatus]
  )

  // Create WebSocket connection
  const createWebSocket = useCallback(
    (endpoint: string): WebSocket | null => {
      if (!WEBSOCKET_ENABLED) {
        console.log(`[WebSocket] Connection disabled. Would connect to: ${WS_URL}${endpoint}`)
        return null
      }

      try {
        const ws = new WebSocket(`${WS_URL}${endpoint}`)

        ws.onopen = () => {
          console.log(`[WebSocket] Connected to ${endpoint}`)
          reconnectDelayRef.current = RECONNECT_DELAY_MS // Reset delay on successful connection
          updateStatus("connected")
        }

        ws.onclose = (event) => {
          console.log(`[WebSocket] Disconnected from ${endpoint}:`, event.code, event.reason)

          // Attempt reconnection if not intentionally disconnected
          if (shouldReconnectRef.current) {
            updateStatus("connecting")
            scheduleReconnect()
          } else {
            updateStatus("disconnected")
          }
        }

        ws.onerror = () => {
          handleError(new Error(`WebSocket error on ${endpoint}`))
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            onMessage?.(data)
          } catch {
            onMessage?.(event.data)
          }
        }

        return ws
      } catch (error) {
        handleError(error instanceof Error ? error : new Error("Failed to create WebSocket"))
        return null
      }
    },
    [handleError, onMessage, updateStatus]
  )

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`[WebSocket] Attempting reconnection in ${reconnectDelayRef.current}ms...`)
      connect()

      // Increase delay for next attempt (exponential backoff)
      reconnectDelayRef.current = Math.min(
        reconnectDelayRef.current * RECONNECT_BACKOFF_MULTIPLIER,
        MAX_RECONNECT_DELAY_MS
      )
    }, reconnectDelayRef.current)
  }, [])

  // Connect to both WebSocket endpoints
  const connect = useCallback(() => {
    if (!WEBSOCKET_ENABLED) {
      console.log("[WebSocket] WebSocket connections are disabled (mock mode)")
      updateStatus("disconnected")
      return
    }

    shouldReconnectRef.current = true
    updateStatus("connecting")

    // Close existing connections
    locationWsRef.current?.close()
    transcriptWsRef.current?.close()

    // Create new connections
    locationWsRef.current = createWebSocket(LOCATION_ENDPOINT)
    transcriptWsRef.current = createWebSocket(TRANSCRIPT_ENDPOINT)
  }, [createWebSocket, updateStatus])

  // Disconnect from both WebSocket endpoints
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    locationWsRef.current?.close()
    transcriptWsRef.current?.close()

    locationWsRef.current = null
    transcriptWsRef.current = null

    updateStatus("disconnected")
  }, [updateStatus])

  // Send location data
  const sendLocation = useCallback(
    (location: { lat: number; lon: number; timestamp: number; accuracy?: number }) => {
      const payload: LocationPayload = {
        client_id: clientId,
        data: location,
      }

      if (!WEBSOCKET_ENABLED) {
        // Log to console in mock mode
        console.log("[WebSocket Mock] Would send location:", payload)
        return
      }

      if (locationWsRef.current?.readyState === WebSocket.OPEN) {
        locationWsRef.current.send(JSON.stringify(payload))
      } else {
        console.warn("[WebSocket] Location socket not connected, queueing message")
      }
    },
    [clientId]
  )

  // Send transcript data
  const sendTranscript = useCallback(
    (transcript: { text: string; is_final: boolean }) => {
      const payload: TranscriptPayload = {
        client_id: clientId,
        data: {
          transcript,
        },
      }

      if (!WEBSOCKET_ENABLED) {
        // Log to console in mock mode
        console.log("[WebSocket Mock] Would send transcript:", payload)
        return
      }

      if (transcriptWsRef.current?.readyState === WebSocket.OPEN) {
        transcriptWsRef.current.send(JSON.stringify(payload))
      } else {
        console.warn("[WebSocket] Transcript socket not connected, queueing message")
      }
    },
    [clientId]
  )

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

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
