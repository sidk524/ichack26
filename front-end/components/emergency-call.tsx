"use client"

import { useState, useEffect } from "react"
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
} from "@tabler/icons-react"

type CallStatus = "idle" | "connecting" | "connected" | "ended"

interface Message {
  role: "ai" | "user"
  content: string
  timestamp: Date
}

export function EmergencyCall() {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle")
  const [personaState, setPersonaState] = useState<PersonaState>("asleep")
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentInstruction, setCurrentInstruction] = useState<string>("")

  // Simulate call duration timer
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

  const handleStartCall = async () => {
    setCallStatus("connecting")
    setPersonaState("thinking")
    setCallDuration(0)
    setMessages([])

    // Simulate connection delay
    setTimeout(() => {
      setCallStatus("connected")
      setPersonaState("speaking")

      // AI greeting
      const greeting: Message = {
        role: "ai",
        content: "Emergency services. I'm here to help you. Can you tell me what's happening?",
        timestamp: new Date(),
      }
      setMessages([greeting])
      setCurrentInstruction("Stay calm. Help is being coordinated.")

      // Switch to listening after speaking
      setTimeout(() => {
        setPersonaState("listening")
      }, 3000)
    }, 2000)
  }

  const handleEndCall = () => {
    setCallStatus("ended")
    setPersonaState("asleep")

    // Reset after a moment
    setTimeout(() => {
      setCallStatus("idle")
      setMessages([])
      setCurrentInstruction("")
    }, 3000)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  // Demo: Simulate AI states for demo purposes
  useEffect(() => {
    if (callStatus !== "connected") return

    const stateSequence: PersonaState[] = ["listening", "thinking", "speaking", "listening"]
    let index = 0

    const interval = setInterval(() => {
      index = (index + 1) % stateSequence.length
      setPersonaState(stateSequence[index])
    }, 4000)

    return () => clearInterval(interval)
  }, [callStatus])

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-background to-muted/30">
      {/* Status Bar */}
      <div className="flex-none px-4 py-3 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <IconShieldCheck className="size-5 text-primary" />
          <span className="font-semibold text-sm">Emergency Response</span>
        </div>
        {callStatus === "connected" && (
          <div className="flex items-center gap-2 text-sm">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-red-500"></span>
            </span>
            <span className="font-mono text-muted-foreground">{formatDuration(callDuration)}</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Persona Visual */}
        <div className="relative">
          <div className={cn(
            "rounded-full p-2 transition-all duration-500",
            callStatus === "connected" && "bg-primary/10 ring-4 ring-primary/20",
            callStatus === "connecting" && "animate-pulse"
          )}>
            <Persona
              className="size-40"
              state={personaState}
              variant="opal"
            />
          </div>

          {/* Status indicator */}
          {callStatus === "connected" && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background border text-xs font-medium capitalize">
              {personaState === "listening" && "Listening..."}
              {personaState === "thinking" && "Processing..."}
              {personaState === "speaking" && "Speaking..."}
              {personaState === "idle" && "Ready"}
            </div>
          )}
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2">
          {callStatus === "idle" && (
            <>
              <h1 className="text-2xl font-bold">Emergency Assistance</h1>
              <p className="text-muted-foreground text-sm max-w-xs">
                Tap the button below to connect with an AI emergency operator who will help coordinate your rescue.
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
                    msg.role === "ai" ? "text-foreground" : "text-muted-foreground"
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
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
            <IconMapPin className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Your location is being shared</p>
            <p className="text-sm font-medium truncate">Locating via GPS...</p>
          </div>
          <span className="text-xs text-green-600 font-medium">Live</span>
        </div>
      )}

      {/* Call Controls */}
      <div className="flex-none p-6 pb-8 bg-gradient-to-t from-muted/50 to-transparent">
        {callStatus === "idle" && (
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
