"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type ConversationStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"

export type ConversationMode = "listening" | "speaking"

export interface Message {
  role: "ai" | "user"
  content: string
  timestamp: Date
}

interface ConversationInstance {
  endSession: () => Promise<void>
  setVolume: (options: { volume: number }) => void
  setMicMuted: (muted: boolean) => void
  sendUserActivity: () => void
}

interface UseElevenLabsConversationOptions {
  onConnect?: (conversationId: string) => void
  onDisconnect?: () => void
  onError?: (message: string) => void
  onModeChange?: (mode: ConversationMode) => void
  onMessage?: (message: Message) => void
}

export function useElevenLabsConversation(
  options: UseElevenLabsConversationOptions = {}
) {
  const [status, setStatus] = useState<ConversationStatus>("idle")
  const [mode, setMode] = useState<ConversationMode>("listening")
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState<Error | null>(null)

  // Use refs for the conversation instance and callbacks (rerender-use-ref-transient-values)
  const conversationRef = useRef<ConversationInstance | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession().catch(console.error)
      }
    }
  }, [])

  const startConversation = useCallback(async () => {
    if (status === "connecting" || status === "connected") {
      return
    }

    setStatus("connecting")
    setError(null)
    setMessages([])

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true })

      // Dynamically import the ElevenLabs SDK (bundle-dynamic-imports)
      const { Conversation } = await import("@elevenlabs/client")

      // Fetch signed URL from our API
      const signedUrlResponse = await fetch("/api/elevenlabs/signed-url")
      if (!signedUrlResponse.ok) {
        throw new Error("Failed to get signed URL")
      }
      const { signed_url } = await signedUrlResponse.json()

      // Start the conversation session
      const conversation = await Conversation.startSession({
        signedUrl: signed_url,
        onConnect: (props: { conversationId: string }) => {
          setStatus("connected")
          optionsRef.current.onConnect?.(props.conversationId)
        },
        onDisconnect: () => {
          setStatus("disconnected")
          conversationRef.current = null
          optionsRef.current.onDisconnect?.()
        },
        onError: (message: string, context?: unknown) => {
          console.error("Conversation error:", message, context)
          setError(new Error(message))
          setStatus("error")
          optionsRef.current.onError?.(message)
        },
        onModeChange: (newMode: { mode: "speaking" | "listening" }) => {
          const modeValue = newMode.mode as ConversationMode
          setMode(modeValue)
          optionsRef.current.onModeChange?.(modeValue)
        },
        onMessage: (payload: {
          source: "ai" | "user"
          role: "user" | "agent"
          message: string
        }) => {
          const newMessage: Message = {
            role: payload.source === "ai" ? "ai" : "user",
            content: payload.message,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, newMessage])
          optionsRef.current.onMessage?.(newMessage)
        },
      })

      conversationRef.current = conversation
    } catch (err) {
      console.error("Failed to start conversation:", err)
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start conversation"
      setError(new Error(errorMessage))
      setStatus("error")
      optionsRef.current.onError?.(errorMessage)
    }
  }, [status])

  const endConversation = useCallback(async () => {
    if (conversationRef.current) {
      try {
        await conversationRef.current.endSession()
      } catch (err) {
        console.error("Error ending conversation:", err)
      }
      conversationRef.current = null
    }
    setStatus("idle")
    setMode("listening")
  }, [])

  const setMicMuted = useCallback((muted: boolean) => {
    if (conversationRef.current) {
      conversationRef.current.setMicMuted(muted)
    }
  }, [])

  const setVolume = useCallback((volume: number) => {
    if (conversationRef.current) {
      conversationRef.current.setVolume({ volume: Math.max(0, Math.min(1, volume)) })
    }
  }, [])

  const sendUserActivity = useCallback(() => {
    if (conversationRef.current) {
      conversationRef.current.sendUserActivity()
    }
  }, [])

  return {
    startConversation,
    endConversation,
    setMicMuted,
    setVolume,
    sendUserActivity,
    status,
    mode,
    messages,
    error,
    isConnected: status === "connected",
    isConnecting: status === "connecting",
  }
}
