"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { TranscriptPayload } from "@/types/api"

// Configuration
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"
const LOCATION_ENDPOINT = "/phone_location_in"
const TRANSCRIPT_ENDPOINT = "/phone_transcript_in"

// Set to true to enable WebSocket connections (when server is ready)
const WEBSOCKET_ENABLED = true

// Buffer configuration
const MAX_BUFFER_SIZE = 500
const BUFFER_FLUSH_BATCH_SIZE = 50

// Reconnection configuration
const INITIAL_RECONNECT_DELAY = 1000    // 1 second
const MAX_RECONNECT_DELAY = 30000       // 30 seconds
const RECONNECT_BACKOFF_MULTIPLIER = 2
const MAX_RECONNECT_ATTEMPTS = 10

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

  // Message buffers for network resilience
  const locationBufferRef = useRef<Array<{type: string, payload: unknown, timestamp: number}>>([])
  const transcriptBufferRef = useRef<Array<{type: string, payload: unknown, timestamp: number}>>([])

  // Reconnection state
  const reconnectAttemptRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isReconnectingRef = useRef(false)
  const intentionalDisconnectRef = useRef(false)

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

  // Buffer management functions
  const addToBuffer = useCallback((
    bufferRef: React.MutableRefObject<Array<{type: string, payload: unknown, timestamp: number}>>,
    type: string,
    payload: unknown
  ) => {
    // FIFO eviction if buffer is full
    if (bufferRef.current.length >= MAX_BUFFER_SIZE) {
      const evicted = bufferRef.current.shift()
      console.warn(`[WebSocket] Buffer full, evicting oldest message from ${evicted?.timestamp}`)
    }
    bufferRef.current.push({ type, payload, timestamp: Date.now() })
    console.log(`[WebSocket] Buffered ${type} message, buffer size: ${bufferRef.current.length}`)
  }, [])

  const getReconnectDelay = useCallback(() => {
    const baseDelay = INITIAL_RECONNECT_DELAY * Math.pow(RECONNECT_BACKOFF_MULTIPLIER, reconnectAttemptRef.current)
    const cappedDelay = Math.min(baseDelay, MAX_RECONNECT_DELAY)
    // Add jitter (±25%) to prevent thundering herd
    const jitter = cappedDelay * (0.75 + Math.random() * 0.5)
    return Math.floor(jitter)
  }, [])

  const resetReconnectState = useCallback(() => {
    reconnectAttemptRef.current = 0
    isReconnectingRef.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const flushBuffer = useCallback((
    bufferRef: React.MutableRefObject<Array<{type: string, payload: unknown, timestamp: number}>>,
    ws: WebSocket | null,
    bufferName: string
  ) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || bufferRef.current.length === 0) {
      return
    }

    const messages = bufferRef.current.splice(0, BUFFER_FLUSH_BATCH_SIZE)
    console.log(`[WebSocket] Flushing ${messages.length} buffered ${bufferName} messages`)

    try {
      // Send as batch array
      const payloads = messages.map(m => m.payload)
      ws.send(JSON.stringify(payloads))

      // If there are more messages, schedule another flush
      if (bufferRef.current.length > 0) {
        setTimeout(() => flushBuffer(bufferRef, ws, bufferName), 100)
      }
    } catch (error) {
      // Re-buffer the messages that failed to send
      console.error(`[WebSocket] Failed to flush ${bufferName} buffer, re-buffering`)
      bufferRef.current = [...messages, ...bufferRef.current]
    }
  }, [])

  // Forward declaration for scheduleReconnect (will be defined after connect)
  const scheduleReconnectRef = useRef<() => void>(() => {})

  const createWebSocket = useCallback(
    (endpoint: string, isLocation: boolean): WebSocket | null => {
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
          // Reset reconnection state on successful connection
          resetReconnectState()
          updateStatus("connected")

          // Flush buffered messages
          if (isLocation) {
            flushBuffer(locationBufferRef, ws, "location")
          } else {
            flushBuffer(transcriptBufferRef, ws, "transcript")
          }
        }

        ws.onclose = (event) => {
          console.log(`[WebSocket] Disconnected from ${endpoint}:`, event.code, event.reason)
          updateStatus("disconnected")

          // Schedule reconnection if not intentional disconnect
          if (!intentionalDisconnectRef.current) {
            scheduleReconnectRef.current()
          }
        }

        ws.onerror = () => {
          handleError(new Error(`WebSocket error on ${endpoint}`))
          // Schedule reconnection on error if not intentional disconnect
          if (!intentionalDisconnectRef.current) {
            scheduleReconnectRef.current()
          }
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
    [handleError, updateStatus, resetReconnectState, flushBuffer]
  )

  const connect = useCallback(() => {
    if (!WEBSOCKET_ENABLED) {
      console.log("[WebSocket] Disabled (mock mode)")
      updateStatus("disconnected")
      return
    }

    // Reset intentional disconnect flag when connecting
    intentionalDisconnectRef.current = false

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
    locationWsRef.current = createWebSocket(LOCATION_ENDPOINT, true)
    transcriptWsRef.current = createWebSocket(TRANSCRIPT_ENDPOINT, false)
  }, [createWebSocket, updateStatus])

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (intentionalDisconnectRef.current) {
      console.log("[WebSocket] Intentional disconnect, not reconnecting")
      return
    }

    if (isReconnectingRef.current) {
      console.log("[WebSocket] Already reconnecting, skipping")
      return
    }

    if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`[WebSocket] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached, giving up`)
      handleError(new Error("Max reconnection attempts reached"))
      return
    }

    isReconnectingRef.current = true
    reconnectAttemptRef.current += 1
    const delay = getReconnectDelay()

    console.log(`[WebSocket] Scheduling reconnect attempt ${reconnectAttemptRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`)

    reconnectTimeoutRef.current = setTimeout(() => {
      isReconnectingRef.current = false
      connect()
    }, delay)
  }, [connect, getReconnectDelay, handleError])

  // Update the ref so createWebSocket can call it
  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect
  }, [scheduleReconnect])

  const disconnect = useCallback(() => {
    console.log("[WebSocket] Disconnecting...")

    // Set intentional disconnect flag to prevent auto-reconnect
    intentionalDisconnectRef.current = true

    // Clear any pending reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    isReconnectingRef.current = false

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
        // Buffer the message for later delivery
        addToBuffer(locationBufferRef, "location", payload)
        // Trigger reconnection if not already reconnecting
        if (!isReconnectingRef.current && !intentionalDisconnectRef.current) {
          scheduleReconnect()
        }
      }
    },
    [userId, addToBuffer, scheduleReconnect]
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
        // Buffer the message for later delivery
        addToBuffer(transcriptBufferRef, "transcript", payload)
        // Trigger reconnection if not already reconnecting
        if (!isReconnectingRef.current && !intentionalDisconnectRef.current) {
          scheduleReconnect()
        }
      }
    },
    [userId, addToBuffer, scheduleReconnect]
  )

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      console.log("[WebSocket] Cleanup on unmount")
      // Clear any pending reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
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
