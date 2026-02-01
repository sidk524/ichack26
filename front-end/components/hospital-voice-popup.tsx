"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Drawer } from "vaul"
import { Persona, type PersonaState } from "@/components/ai-elements/persona"
import { cn } from "@/lib/utils"
import {
  IconPhone,
  IconPhoneOff,
  IconMicrophone,
  IconMicrophoneOff,
  IconAmbulance,
  IconX,
} from "@tabler/icons-react"
import {
  useElevenLabsConversation,
  type ConversationStatus,
  type ConversationMode,
} from "@/hooks/use-elevenlabs-conversation"

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

export function HospitalVoicePopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasEnded, setHasEnded] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  const {
    startConversation,
    endConversation,
    setMicMuted,
    status: conversationStatus,
    mode,
    messages,
    error,
  } = useElevenLabsConversation({
    agentType: "field-responder",
    onConnect: () => setHasEnded(false),
    onDisconnect: () => setHasEnded(true),
    onError: (message) => console.error("Conversation error:", message),
  })

  const callStatus = getCallStatus(conversationStatus, hasEnded)
  const personaState = getPersonaState(callStatus, mode)
  const isInCall = callStatus === "connected" || callStatus === "connecting"

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

  const handleStartCall = useCallback(async () => {
    setCallDuration(0)
    setHasEnded(false)
    await startConversation()
  }, [startConversation])

  const handleEndCall = useCallback(async () => {
    await endConversation()
    setHasEnded(true)
    setTimeout(() => {
      setHasEnded(false)
    }, 1500)
  }, [endConversation])

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    setMicMuted(newMuted)
  }, [isMuted, setMicMuted])

  const handleClose = useCallback(async () => {
    if (isInCall) {
      await handleEndCall()
    }
    setIsOpen(false)
  }, [isInCall, handleEndCall])

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 15, stiffness: 300, delay: 0.5 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "size-14 rounded-full",
          "bg-primary hover:bg-primary/90 active:bg-primary/80",
          "text-primary-foreground",
          "shadow-lg shadow-primary/25",
          "flex items-center justify-center",
          "transition-all active:scale-95"
        )}
      >
        <IconAmbulance className="size-6" />
        {/* Pulse indicator when not in drawer */}
        {!isOpen && (
          <>
            <span className="absolute inset-0 rounded-full animate-ping bg-primary opacity-20" />
          </>
        )}
      </motion.button>

      {/* Drawer */}
      <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Drawer.Content className="fixed bottom-0 right-0 z-50 w-full max-w-md h-[85vh] flex flex-col rounded-t-[20px] bg-background md:right-6 md:bottom-6 md:rounded-[20px] md:h-[600px]">
            {/* Drag handle (mobile) */}
            <div className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-muted-foreground/20 md:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <IconAmbulance className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Field Unit Communication</h3>
                  <p className="text-xs text-muted-foreground">Connect with ambulance responder</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="size-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
              >
                <IconX className="size-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 overflow-hidden">
              {/* Persona Visual */}
              <div className="relative">
                <div
                  className={cn(
                    "rounded-full p-2 transition-all duration-500",
                    callStatus === "connected" && "bg-primary/10 ring-4 ring-primary/20",
                    callStatus === "connecting" && "animate-pulse"
                  )}
                >
                  <Persona className="size-32" state={personaState} variant="opal" />
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
                    <h2 className="text-lg font-semibold">Contact Field Unit</h2>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Connect with ambulance responder to coordinate patient transport
                    </p>
                  </>
                )}

                {callStatus === "connecting" && (
                  <h2 className="text-lg font-semibold flex items-center justify-center gap-2">
                    <span className="size-2 bg-yellow-500 rounded-full animate-pulse" />
                    Connecting to Unit A-17...
                  </h2>
                )}

                {callStatus === "connected" && (
                  <>
                    <h2 className="text-lg font-semibold text-green-600 dark:text-green-500">
                      Connected to Field Unit
                    </h2>
                    <div className="font-mono text-2xl font-bold">
                      {formatDuration(callDuration)}
                    </div>
                  </>
                )}

                {callStatus === "ended" && (
                  <h2 className="text-lg font-semibold">Call Ended</h2>
                )}

                {callStatus === "error" && (
                  <h2 className="text-lg font-semibold text-red-600">
                    Connection Error
                  </h2>
                )}
              </div>

              {/* Transcript Preview */}
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
                          {msg.role === "ai" ? "Unit A-17: " : "You: "}
                        </span>
                        {msg.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex-none p-6 pt-0">
              {(callStatus === "idle" || callStatus === "error" || callStatus === "ended") && (
                <button
                  onClick={handleStartCall}
                  className="w-full h-14 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <IconPhone className="size-5" />
                  {callStatus === "ended" ? "Call Again" : "Call Field Unit"}
                </button>
              )}

              {callStatus === "connecting" && (
                <button
                  onClick={handleEndCall}
                  className="w-full h-14 rounded-xl bg-muted hover:bg-muted/80 font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
              )}

              {callStatus === "connected" && (
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={toggleMute}
                    className={cn(
                      "size-14 rounded-full flex items-center justify-center",
                      "transition-all active:scale-95",
                      isMuted
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {isMuted ? <IconMicrophoneOff className="size-6" /> : <IconMicrophone className="size-6" />}
                  </button>

                  <button
                    onClick={handleEndCall}
                    className="size-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-500/25 transition-all active:scale-95"
                  >
                    <IconPhoneOff className="size-7" />
                  </button>
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}
