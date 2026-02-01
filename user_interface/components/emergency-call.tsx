"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Persona, type PersonaState } from "@/components/ai-elements/persona"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  IconPhone,
  IconPhoneOff,
  IconMicrophone,
  IconMicrophoneOff,
  IconMapPin,
  IconShieldCheck,
  IconLoader2,
  IconAlertCircle,
  IconMapPinOff,
} from "@tabler/icons-react"
import {
  useElevenLabsConversation,
  type ConversationStatus,
  type ConversationMode,
} from "@/hooks/use-elevenlabs-conversation"
import { useGeolocation } from "@/hooks/use-geolocation"
import {
  useServerWebSocket,
  generateSessionId,
} from "@/hooks/use-server-websocket"

type CallStatus = "idle" | "connecting" | "connected" | "ended" | "error"

// Map ElevenLabs status/mode to UI call status
function getCallStatus(
  conversationStatus: ConversationStatus,
  hasEnded: boolean
): CallStatus {
  if (hasEnded) return "ended"
  switch (conversationStatus) {
    case "connecting":
      return "connecting"
    case "connected":
      return "connected"
    case "error":
      return "error"
    default:
      return "idle"
  }
}

// Map ElevenLabs mode to Persona state
function getPersonaState(
  callStatus: CallStatus,
  mode: ConversationMode
): PersonaState {
  switch (callStatus) {
    case "connecting":
      return "thinking"
    case "connected":
      return mode === "speaking" ? "speaking" : "listening"
    case "ended":
    case "idle":
    case "error":
    default:
      return "asleep"
  }
}

export function EmergencyCall() {
  const [hasEnded, setHasEnded] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [currentInstruction, setCurrentInstruction] = useState<string>("")

  // Generate a unique user ID for this call session
  // This persists across re-renders but changes for each new call
  const sessionId = useMemo(() => generateSessionId(), [])

  // Server WebSocket connection for location and transcript streaming
  const {
    sendLocation,
    sendTranscript,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    status: wsStatus,
  } = useServerWebSocket({
    userId: sessionId,
    onStatusChange: (status) => {
      console.log("[EmergencyCall] WebSocket status:", status)
    },
    onError: (error) => {
      console.error("[EmergencyCall] WebSocket error:", error.message)
    },
    onMessage: (data) => {
      console.log("[EmergencyCall] WebSocket message received:", data)
    },
  })

  const {
    startConversation,
    endConversation,
    setMicMuted,
    status: conversationStatus,
    mode,
    messages,
    error,
  } = useElevenLabsConversation({
    onConnect: () => {
      setCurrentInstruction("Stay calm. Help is being coordinated.")
      setHasEnded(false)
    },
    onDisconnect: () => {
      setHasEnded(true)
    },
    onError: (message) => {
      console.error("Conversation error:", message)
      setCurrentInstruction("")
    },
  })

  // Live location tracking
  const {
    position,
    error: locationError,
    permissionState,
    isWatching: isTrackingLocation,
    isLoading: isLocationLoading,
    startWatching: startLocationTracking,
    stopWatching: stopLocationTracking,
    locationHistory: _locationHistory, // Available for batch server uploads
  } = useGeolocation({
    enableHighAccuracy: true,
    throttleMs: 3000, // Update every 3 seconds
    maxHistoryLength: 100,
    onPositionUpdate: (pos) => {
      // Send position updates to server via WebSocket
      // Currently logs to console (mock mode)
      // When server is ready, this will stream to /phone_location_in
      sendLocation({
        lat: pos.latitude,
        lon: pos.longitude,
        timestamp: pos.timestamp,
        accuracy: pos.accuracy,
      })
      console.log("[EmergencyCall] Location update:", {
        lat: pos.latitude,
        lon: pos.longitude,
        accuracy: pos.accuracy,
        sessionId,
      })
    },
    onError: (err) => {
      console.error("[EmergencyCall] Location error:", err.message)
    },
  })

  const callStatus = getCallStatus(conversationStatus, hasEnded)
  const personaState = getPersonaState(callStatus, mode)

  // Start location tracking and WebSocket connection on component mount
  // This ensures location is broadcasting as soon as emergency page opens
  useEffect(() => {
    console.log("[EmergencyCall] Component mounted - starting location tracking and WebSocket")
    connectWebSocket()
    startLocationTracking()

    // Cleanup on unmount
    return () => {
      console.log("[EmergencyCall] Component unmounting - stopping location tracking")
      stopLocationTracking()
      disconnectWebSocket()
    }
  }, []) // Empty deps = run once on mount

  // Send transcript updates to server when messages change
  // Send as partial (is_final=false) during the call
  // Server will save all partials when connection closes
  useEffect(() => {
    if (messages.length > 0 && callStatus === "connected") {
      const lastMessage = messages[messages.length - 1]
      sendTranscript({
        text: lastMessage.content,
        is_final: false, // Keep connection open, server saves on disconnect
      })
      console.log("[EmergencyCall] Transcript update:", {
        role: lastMessage.role,
        text: lastMessage.content,
        sessionId,
      })
    }
  }, [messages, callStatus, sendTranscript, sessionId])

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (callStatus === "connected") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [callStatus])

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleStartCall = useCallback(async () => {
    setCallDuration(0)
    setHasEnded(false)
    // WebSocket and location tracking already started on mount
    // Just start the voice conversation
    await startConversation()
  }, [startConversation])

  const handleEndCall = useCallback(async () => {
    await endConversation()
    // Keep location tracking and WebSocket active
    // They will be cleaned up when component unmounts
    setHasEnded(true)
    setCurrentInstruction("")

    // Reset after a moment
    setTimeout(() => {
      setHasEnded(false)
    }, 3000)
  }, [endConversation])

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    setMicMuted(newMuted)
  }, [isMuted, setMicMuted])

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-background to-muted/30">
      {/* Status Bar */}
      <div className="flex-none px-4 py-3 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <IconShieldCheck className="size-5 text-primary" />
          <span className="font-semibold text-sm">Emergency Response</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {/* Location status indicator */}
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "size-2 rounded-full",
                isTrackingLocation && position && "bg-green-500",
                isTrackingLocation && !position && "bg-yellow-500 animate-pulse",
                locationError && "bg-red-500",
                !isTrackingLocation && "bg-gray-400"
              )}
            />
            <span className="text-xs text-muted-foreground">
              {locationError ? "Location Error" :
               isTrackingLocation && position ? "GPS Active" :
               isTrackingLocation ? "Getting GPS..." : "GPS Off"}
            </span>
          </div>

          {/* WebSocket status indicator */}
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "size-2 rounded-full",
                wsStatus === "connected" && "bg-green-500",
                wsStatus === "connecting" && "bg-yellow-500 animate-pulse",
                wsStatus === "error" && "bg-red-500",
                wsStatus === "disconnected" && "bg-gray-400"
              )}
            />
            <span className="text-xs text-muted-foreground">
              {wsStatus === "connected" ? "Server" : wsStatus}
            </span>
          </div>

          {callStatus === "connected" && (
            <>
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-red-500"></span>
              </span>
              <span className="font-mono text-muted-foreground">
                {formatDuration(callDuration)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Location Permission Warning */}
        {locationError && (
          <div className="w-full max-w-sm px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Location access is required for emergency response
            </p>
            <p className="text-xs text-destructive/80 mt-1">
              {locationError.message}
            </p>
          </div>
        )}

        {/* Permission State Info */}
        {permissionState === "denied" && !locationError && (
          <div className="w-full max-w-sm px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
              Location permission denied
            </p>
            <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-1">
              Please enable location in your browser settings for accurate emergency response.
            </p>
          </div>
        )}

        {/* Persona Visual */}
        <div className="relative">
          <div
            className={cn(
              "rounded-full p-2 transition-all duration-500",
              callStatus === "connected" &&
                "bg-primary/10 ring-4 ring-primary/20",
              callStatus === "connecting" && "animate-pulse"
            )}
          >
            <Persona className="size-40" state={personaState} variant="opal" />
          </div>

          {/* Status indicator */}
          {callStatus === "connected" && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background border text-xs font-medium capitalize">
              {mode === "listening" && "Listening..."}
              {mode === "speaking" && "Speaking..."}
            </div>
          )}
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2">
          {callStatus === "idle" && (
            <>
              <h1 className="text-2xl font-bold">Emergency Assistance</h1>
              <p className="text-muted-foreground text-sm max-w-xs">
                Tap the button below to connect with an AI emergency operator
                who will help coordinate your rescue.
              </p>
            </>
          )}

          {callStatus === "connecting" && (
            <>
              <h1 className="text-xl font-semibold flex items-center justify-center gap-2">
                <IconLoader2 className="size-5 animate-spin" />
                Connecting...
              </h1>
              <p className="text-muted-foreground text-sm">
                Please wait while we connect you
              </p>
            </>
          )}

          {callStatus === "connected" && (
            <>
              <h1 className="text-xl font-semibold text-green-600 dark:text-green-500">
                Connected to Emergency Services
              </h1>
              {currentInstruction && (
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-medium max-w-xs">
                  {currentInstruction}
                </div>
              )}
            </>
          )}

          {callStatus === "ended" && (
            <>
              <h1 className="text-xl font-semibold">Call Ended</h1>
              <p className="text-muted-foreground text-sm">
                Help has been dispatched to your location
              </p>
            </>
          )}

          {callStatus === "error" && (
            <>
              <h1 className="text-xl font-semibold text-red-600 flex items-center justify-center gap-2">
                <IconAlertCircle className="size-5" />
                Connection Error
              </h1>
              <p className="text-muted-foreground text-sm max-w-xs">
                {error?.message || "Unable to connect. Please try again."}
              </p>
            </>
          )}
        </div>

        {/* Transcript Preview */}
        {messages.length > 0 && callStatus === "connected" && (
          <div className="w-full max-w-sm bg-muted/50 rounded-lg p-4 max-h-40 overflow-y-auto">
            <div className="space-y-3">
              {messages.slice(-3).map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "text-sm",
                    msg.role === "ai"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <span className="font-medium">
                    {msg.role === "ai" ? "Operator: " : "You: "}
                  </span>
                  {msg.content}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Location Banner */}
      {callStatus === "connected" && (
        <div className="flex-none mx-4 mb-4 p-3 bg-muted rounded-lg flex items-center gap-3">
          <div
            className={cn(
              "size-10 rounded-full flex items-center justify-center",
              locationError || permissionState === "denied"
                ? "bg-destructive/10"
                : "bg-primary/10"
            )}
          >
            {locationError || permissionState === "denied" ? (
              <IconMapPinOff className="size-5 text-destructive" />
            ) : (
              <IconMapPin className="size-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {permissionState === "denied" ? (
              <>
                <p className="text-xs text-destructive">
                  Location access denied
                </p>
                <p className="text-sm font-medium truncate">
                  Please enable location in browser settings
                </p>
              </>
            ) : locationError ? (
              <>
                <p className="text-xs text-destructive">Location error</p>
                <p className="text-sm font-medium truncate">
                  {locationError.message}
                </p>
              </>
            ) : isLocationLoading && !position ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Acquiring GPS signal...
                </p>
                <p className="text-sm font-medium truncate flex items-center gap-2">
                  <IconLoader2 className="size-4 animate-spin" />
                  Locating...
                </p>
              </>
            ) : position ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Location shared • ±{Math.round(position.accuracy)}m accuracy
                </p>
                <p className="text-sm font-medium truncate font-mono">
                  {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Your location is being shared
                </p>
                <p className="text-sm font-medium truncate">Locating via GPS...</p>
              </>
            )}
          </div>
          {isTrackingLocation && position && (
            <div className="flex flex-col items-end gap-1">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-green-500"></span>
              </span>
              <span className="text-xs text-green-600 font-medium">Live</span>
            </div>
          )}
        </div>
      )}

      {/* Call Controls */}
      <div className="flex-none p-6 pb-8 bg-gradient-to-t from-muted/50 to-transparent">
        {(callStatus === "idle" || callStatus === "error") && (
          <Button
            onClick={handleStartCall}
            size="lg"
            className="w-full h-14 text-lg bg-red-600 hover:bg-red-700 text-white"
          >
            <IconPhone className="size-6 mr-2" />
            Call Emergency Services
          </Button>
        )}

        {callStatus === "connecting" && (
          <Button
            onClick={handleEndCall}
            size="lg"
            variant="outline"
            className="w-full h-14 text-lg"
          >
            Cancel
          </Button>
        )}

        {callStatus === "connected" && (
          <div className="flex items-center justify-center gap-6">
            <Button
              onClick={toggleMute}
              size="lg"
              variant={isMuted ? "destructive" : "outline"}
              className="size-16 rounded-full"
            >
              {isMuted ? (
                <IconMicrophoneOff className="size-6" />
              ) : (
                <IconMicrophone className="size-6" />
              )}
            </Button>

            <Button
              onClick={handleEndCall}
              size="lg"
              className="size-20 rounded-full bg-red-600 hover:bg-red-700 text-white"
            >
              <IconPhoneOff className="size-8" />
            </Button>
          </div>
        )}

        {callStatus === "ended" && (
          <Button
            onClick={handleStartCall}
            size="lg"
            variant="outline"
            className="w-full h-14 text-lg"
          >
            Call Again
          </Button>
        )}
      </div>
    </div>
  )
}
