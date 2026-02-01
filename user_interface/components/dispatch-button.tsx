"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { IconAmbulance, IconCheck } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DispatchButtonProps {
  visible: boolean
  onDispatch: () => Promise<void>
  callId: string
}

export function DispatchButton({
  visible,
  onDispatch,
  callId,
}: DispatchButtonProps) {
  const [status, setStatus] = useState<"idle" | "dispatching" | "success">(
    "idle"
  )

  const handleClick = async () => {
    if (status !== "idle") return

    setStatus("dispatching")
    try {
      await onDispatch()
      setStatus("success")
      // Auto-reset after success animation
      setTimeout(() => setStatus("idle"), 2000)
    } catch (error) {
      console.error("[DispatchButton] Dispatch failed:", error)
      setStatus("idle")
    }
  }

  return (
    <AnimatePresence mode="wait">
      {visible && status !== "success" && (
        <motion.div
          key="dispatch-button"
          className="fixed bottom-6 left-1/2 z-[9999]"
          initial={{ opacity: 0, y: 50, x: "-50%", scale: 0.8 }}
          animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
          exit={{ opacity: 0, y: 20, x: "-50%", scale: 0.9 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
            mass: 0.8,
          }}
        >
          <Button
            size="lg"
            onClick={handleClick}
            disabled={status === "dispatching"}
            className={cn(
              "gap-2 px-6 py-6 text-base font-semibold rounded-full shadow-lg",
              "transition-colors duration-300",
              status === "idle" && "bg-primary hover:bg-primary/90",
              status === "dispatching" && "bg-primary/70"
            )}
          >
            <IconAmbulance className="size-5" />
            {status === "dispatching" ? "Dispatching..." : "Dispatch Ambulance"}
          </Button>
        </motion.div>
      )}

      {/* Success state - green confirmation */}
      {status === "success" && (
        <motion.div
          key="success-button"
          className="fixed bottom-6 left-1/2 z-[9999]"
          initial={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
          animate={{ opacity: 1, y: 0, x: "-50%", scale: 1.05 }}
          exit={{ opacity: 0, y: -20, x: "-50%", scale: 0.9 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
        >
          <Button
            size="lg"
            className="gap-2 px-6 py-6 text-base font-semibold rounded-full shadow-lg bg-green-500 hover:bg-green-500 text-white cursor-default"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              <IconCheck className="size-5" />
            </motion.div>
            Ambulance Dispatched
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
