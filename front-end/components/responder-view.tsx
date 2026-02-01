"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Persona, type PersonaState } from "@/components/ai-elements/persona"
import { cn } from "@/lib/utils"
import {
  IconAmbulance,
  IconWalk,
  IconFirstAidKit,
  IconArrowBack,
  IconPhoneOff,
  IconMicrophone,
  IconMicrophoneOff,
  IconMapPin,
  IconUser,
  IconRadio,
} from "@tabler/icons-react"
import { DisasterMap } from "@/components/disaster-map"
import {
  useElevenLabsConversation,
  type ConversationStatus,
  type ConversationMode,
  type AgentType,
} from "@/hooks/use-elevenlabs-conversation"
import { useGeolocation } from "@/hooks/use-geolocation"
import {
  useServerWebSocket,
  generateSessionId,
} from "@/hooks/use-server-websocket"

// Job status for ambulance worker
type JobStatus = "in_ambulance" | "approaching_civ" | "treating_civ" | "returning"

const jobStatusConfig: Record<JobStatus, { label: string; icon: typeof IconAmbulance; color: string; bg: string }> = {
  in_ambulance: {
    label: "In Ambulance",
    icon: IconAmbulance,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  approaching_civ: {
    label: "Going to Patient",
    icon: IconWalk,
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
  treating_civ: {
    label: "Treating Patient",
    icon: IconFirstAidKit,
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  returning: {
    label: "Returning",
    icon: IconArrowBack,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
}

const jobStatusOrder: JobStatus[] = ["in_ambulance", "approaching_civ", "treating_civ", "returning"]

type CallTarget = "dispatch" | "civilian" | null
type CallStatus = "idle" | "connecting" | "connected" | "ended" | "error"

function getCallStatus(conversationStatus: ConversationStatus, hasEnded: boolean): CallStatus {
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

function getPersonaState(callStatus: CallStatus, mode: ConversationMode): PersonaState {
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

// Mock assignment data
const mockAssignment = {
  patientName: "Civilian #127",
  condition: "Puncture Wound",
  severity: "critical" as const,
  address: "45 Oak Street, Building C",
  eta: 4,
  context: "Fell through collapsed floor, debris punctured left thigh. Conscious, heavy bleeding. Family on scene.",
  notes: "3rd floor, elevator working. Enter via back stairwell.",
}

export function ResponderView() {
  const [jobStatus, setJobStatus] = useState<JobStatus>("in_ambulance")
  const [callTarget, setCallTarget] = useState<CallTarget>(null)
  const [hasEnded, setHasEnded] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [activeAgentType, setActiveAgentType] = useState<AgentType>("field-coordinator")

  const sessionId = useMemo(() => generateSessionId(), [])

  // WebSocket for location streaming
  const {
    sendLocation,
    sendTranscript,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    status: wsStatus,
  } = useServerWebSocket({
    userId: `responder-${sessionId}`,
    onStatusChange: (status) => {
      console.log("[Responder] WebSocket status:", status)
    },
    onError: (error) => {
      console.error("[Responder] WebSocket error:", error.message)
    },
  })

  // ElevenLabs conversation - uses activeAgentType
  const {
    startConversation,
    endConversation,
    setMicMuted,
    status: conversationStatus,
    mode,
    messages,
    error,
  } = useElevenLabsConversation({
    agentType: activeAgentType,
    onConnect: () => setHasEnded(false),
    onDisconnect: () => setHasEnded(true),
    onError: (message) => console.error("Conversation error:", message),
  })

  // Geolocation
  const {
    position,
    startWatching: startLocationTracking,
    stopWatching: stopLocationTracking,
  } = useGeolocation({
    enableHighAccuracy: true,
    throttleMs: 5000,
    onPositionUpdate: (pos) => {
      sendLocation({
        lat: pos.latitude,
        lon: pos.longitude,
        timestamp: pos.timestamp,
        accuracy: pos.accuracy,
      })
    },
  })

  const callStatus = getCallStatus(conversationStatus, hasEnded)
  const personaState = getPersonaState(callStatus, mode)

  // Send transcripts
  useEffect(() => {
    if (messages.length > 0 && callStatus === "connected") {
      const lastMessage = messages[messages.length - 1]
      sendTranscript({
        text: lastMessage.content,
        is_final: false,
      })
    }
  }, [messages, callStatus, sendTranscript])

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (callStatus === "connected") {
      interval = setInterval(() => setCallDuration((prev) => prev + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [callStatus])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Start location tracking on mount
  useEffect(() => {
    startLocationTracking()
    connectWebSocket()
    return () => {
      stopLocationTracking()
      disconnectWebSocket()
    }
  }, [])

  const handleStartCall = useCallback(async (target: CallTarget) => {
    setCallTarget(target)
    setCallDuration(0)
    setHasEnded(false)
    // Set agent type based on target and pass directly to avoid race condition
    const agentType: AgentType = target === "dispatch" ? "field-coordinator" : "patient-bystander"
    setActiveAgentType(agentType)
    await startConversation(agentType)
  }, [startConversation])

  const handleEndCall = useCallback(async () => {
    await endConversation()
    setHasEnded(true)
    setTimeout(() => {
      setCallTarget(null)
      setHasEnded(false)
    }, 1500)
  }, [endConversation])

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    setMicMuted(newMuted)
  }, [isMuted, setMicMuted])

  const cycleJobStatus = () => {
    const currentIndex = jobStatusOrder.indexOf(jobStatus)
    const nextIndex = (currentIndex + 1) % jobStatusOrder.length
    setJobStatus(jobStatusOrder[nextIndex])
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50)
  }

  const currentJobConfig = jobStatusConfig[jobStatus]
  const JobIcon = currentJobConfig.icon

  const isInCall = callStatus === "connected" || callStatus === "connecting"

  return (
    <div className="h-[100dvh] bg-gradient-to-b from-background to-muted/30 flex flex-col overflow-hidden select-none">
      {/* Status Bar - Tiny */}
      <div className="flex-none h-12 px-4 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <IconAmbulance className="size-5 text-primary" />
          <span className="font-semibold text-sm">Unit A-17</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {position && (
            <div className="flex items-center gap-1">
              <IconMapPin className="size-3" />
              <span>GPS</span>
            </div>
          )}
          {isInCall && (
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-red-500"></span>
              </span>
              <span className="font-mono">{formatDuration(callDuration)}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className={cn(
              "size-2 rounded-full",
              wsStatus === "connected" ? "bg-green-500" : "bg-yellow-500"
            )} />
          </div>
        </div>
      </div>

      {/* Assignment Card */}
      <div className="flex-none p-4">
        <div className={cn(
          "rounded-xl p-4 border-2",
          mockAssignment.severity === "critical"
            ? "border-red-500 bg-red-50 dark:bg-red-950/20"
            : "border-border bg-card"
        )}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl">{mockAssignment.condition}</span>
                {mockAssignment.severity === "critical" && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                    CRITICAL
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{mockAssignment.patientName}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{mockAssignment.eta}</div>
              <div className="text-xs text-muted-foreground">min ETA</div>
            </div>
          </div>

          {/* Context - what happened */}
          <p className="text-base font-medium mb-3">
            {mockAssignment.context}
          </p>

          <div className="flex items-center gap-2 text-sm">
            <IconMapPin className="size-4 text-muted-foreground" />
            <span>{mockAssignment.address}</span>
          </div>
          {mockAssignment.notes && (
            <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
              {mockAssignment.notes}
            </p>
          )}
        </div>
      </div>

      {/* Local Map */}
      <div className="flex-none px-4 h-40">
        <div className="h-full rounded-xl overflow-hidden border">
          <DisasterMap
            className="h-full w-full"
            showVehicles={true}
            showLegend={false}
            showDisasters={false}
          />
        </div>
      </div>

      {/* Main Area - Communication Buttons or Active Call */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        <AnimatePresence mode="wait">
          {!isInCall ? (
            <motion.div
              key="buttons"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md space-y-4"
            >
              {/* Two Giant Talk Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleStartCall("dispatch")}
                  className={cn(
                    "aspect-square rounded-2xl",
                    "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
                    "flex flex-col items-center justify-center gap-3",
                    "text-white font-semibold",
                    "shadow-lg shadow-blue-500/25",
                    "transition-all active:scale-95",
                    "min-h-[140px]"
                  )}
                >
                  <IconRadio className="size-12" />
                  <span className="text-lg">Dispatch</span>
                </button>

                <button
                  onClick={() => handleStartCall("civilian")}
                  className={cn(
                    "aspect-square rounded-2xl",
                    "bg-green-600 hover:bg-green-700 active:bg-green-800",
                    "flex flex-col items-center justify-center gap-3",
                    "text-white font-semibold",
                    "shadow-lg shadow-green-500/25",
                    "transition-all active:scale-95",
                    "min-h-[140px]"
                  )}
                >
                  <IconUser className="size-12" />
                  <span className="text-lg">Civilian</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="call"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md flex flex-col items-center gap-6"
            >
              {/* Persona Visual - matching /emergency style */}
              <div className="relative">
                <div
                  className={cn(
                    "rounded-full p-2 transition-all duration-500",
                    callStatus === "connected" && "bg-primary/10 ring-4 ring-primary/20",
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

              {/* Call Target Label */}
              <div className="text-center">
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                  callTarget === "dispatch" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                )}>
                  {callTarget === "dispatch" ? <IconRadio className="size-4" /> : <IconUser className="size-4" />}
                  {callStatus === "connecting"
                    ? "Connecting..."
                    : `Connected to ${callTarget === "dispatch" ? "Hospital Command" : "Civilian"}`
                  }
                </div>
              </div>

              {/* Transcript Preview - matching /emergency style */}
              {messages.length > 0 && callStatus === "connected" && (
                <div className="w-full bg-muted/50 rounded-lg p-4 max-h-32 overflow-y-auto">
                  <div className="space-y-2">
                    {messages.slice(-3).map((msg, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "text-sm",
                          msg.role === "ai" ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        <span className="font-medium">
                          {msg.role === "ai"
                            ? (callTarget === "dispatch" ? "Command: " : "Civilian: ")
                            : "You: "
                          }
                        </span>
                        {msg.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Call Controls - matching /emergency style */}
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={toggleMute}
                  className={cn(
                    "size-16 rounded-full flex items-center justify-center",
                    "transition-all active:scale-95",
                    isMuted
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {isMuted ? <IconMicrophoneOff className="size-7" /> : <IconMicrophone className="size-7" />}
                </button>

                <button
                  onClick={handleEndCall}
                  className={cn(
                    "size-20 rounded-full",
                    "bg-red-600 hover:bg-red-700 active:bg-red-800",
                    "flex items-center justify-center",
                    "text-white shadow-lg shadow-red-500/25",
                    "transition-all active:scale-95"
                  )}
                >
                  <IconPhoneOff className="size-9" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Job Status Toggle - Bottom */}
      <div className="flex-none p-4 pb-8 bg-gradient-to-t from-muted/50 to-transparent">
        <button
          onClick={cycleJobStatus}
          disabled={isInCall}
          className={cn(
            "w-full py-5 rounded-2xl",
            "flex items-center justify-center gap-3",
            "font-semibold text-lg",
            "transition-all active:scale-[0.98]",
            "border-2",
            currentJobConfig.bg,
            currentJobConfig.color,
            isInCall && "opacity-50 cursor-not-allowed"
          )}
        >
          <JobIcon className="size-7" />
          <span>{currentJobConfig.label}</span>
        </button>
      </div>
    </div>
  )
}
