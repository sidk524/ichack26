"use client"

import { useEffect, useRef, useCallback, useState } from "react"

// Event types from the server
export interface DashboardEvent {
  type: "connected" | "new_call" | "new_location" | "new_news" | "new_user" | "pong"
  data: unknown
}

export interface NewCallEvent {
  user_id: string
  call: {
    call_id: string
    transcript: string
    start_time: number
    end_time: number
  }
}

export interface NewLocationEvent {
  user_id: string
  location: {
    lat: number
    lon: number
    timestamp: number
    accuracy: number
  }
}

export interface NewNewsEvent {
  article: {
    article_id: string
    title: string
    link: string
    pub_date: string
    disaster: boolean
    location_name: string
    lat: number | null
    lon: number | null
    received_at: number
  }
}

export interface NewUserEvent {
  user_id: string
  role: "civilian" | "first_responder"
}

interface UseDashboardUpdatesOptions {
  onNewCall?: (event: NewCallEvent) => void
  onNewLocation?: (event: NewLocationEvent) => void
  onNewNews?: (event: NewNewsEvent) => void
  onNewUser?: (event: NewUserEvent) => void
  onConnected?: () => void
  onDisconnected?: () => void
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"

export function useDashboardUpdates(options: UseDashboardUpdatesOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<DashboardEvent | null>(null)
  const optionsRef = useRef(options)

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    const wsUrl = `${WS_URL}/ws/dashboard`
    console.log("[Dashboard WS] Connecting to", wsUrl)

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log("[Dashboard WS] Connected")
        setIsConnected(true)
        optionsRef.current.onConnected?.()
      }

      ws.onmessage = (event) => {
        try {
          const data: DashboardEvent = JSON.parse(event.data)
          setLastEvent(data)

          switch (data.type) {
            case "connected":
              console.log("[Dashboard WS] Received connected confirmation")
              break
            case "new_call":
              console.log("[Dashboard WS] New call received:", data.data)
              optionsRef.current.onNewCall?.(data.data as NewCallEvent)
              break
            case "new_location":
              // Don't log every location (too noisy)
              optionsRef.current.onNewLocation?.(data.data as NewLocationEvent)
              break
            case "new_news":
              console.log("[Dashboard WS] New news received:", data.data)
              optionsRef.current.onNewNews?.(data.data as NewNewsEvent)
              break
            case "new_user":
              console.log("[Dashboard WS] New user received:", data.data)
              optionsRef.current.onNewUser?.(data.data as NewUserEvent)
              break
            case "pong":
              // Heartbeat response
              break
            default:
              console.log("[Dashboard WS] Unknown event type:", data.type)
          }
        } catch (error) {
          console.error("[Dashboard WS] Error parsing message:", error)
        }
      }

      ws.onclose = (event) => {
        console.log("[Dashboard WS] Disconnected:", event.code, event.reason)
        setIsConnected(false)
        wsRef.current = null
        optionsRef.current.onDisconnected?.()

        // Reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("[Dashboard WS] Attempting to reconnect...")
          connect()
        }, 3000)
      }

      ws.onerror = (error) => {
        console.error("[Dashboard WS] WebSocket error:", error)
      }
    } catch (error) {
      console.error("[Dashboard WS] Failed to create WebSocket:", error)
      // Retry after 5 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 5000)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  // Send ping to keep connection alive
  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ping" }))
    }
  }, [])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect()

    // Send ping every 25 seconds to keep connection alive
    const pingInterval = setInterval(sendPing, 25000)

    return () => {
      clearInterval(pingInterval)
      disconnect()
    }
  }, [connect, disconnect, sendPing])

  return {
    isConnected,
    lastEvent,
    reconnect: connect,
    disconnect,
  }
}
