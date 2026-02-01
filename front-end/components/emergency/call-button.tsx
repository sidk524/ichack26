"use client"

import { motion } from "framer-motion"
import { IconPhone } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface CallButtonProps {
  onClick: () => void
  className?: string
}

export function CallButton({ onClick, className }: CallButtonProps) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 15, stiffness: 300, delay: 0.2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative size-20 rounded-full",
        "bg-red-600 hover:bg-red-700 active:bg-red-800",
        "shadow-lg shadow-red-500/30",
        "flex items-center justify-center",
        "transition-colors",
        className
      )}
    >
      {/* Pulse animation rings */}
      <span className="absolute inset-0 rounded-full animate-ping bg-red-500 opacity-20" />
      <span
        className="absolute inset-0 rounded-full animate-ping bg-red-500 opacity-15"
        style={{ animationDelay: "0.5s" }}
      />

      {/* Icon */}
      <IconPhone className="size-8 text-white" />

      {/* Label below button */}
      <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs font-medium text-white/90 whitespace-nowrap">
        Emergency Call
      </span>
    </motion.button>
  )
}
