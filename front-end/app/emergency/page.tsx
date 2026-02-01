"use client"

import { useState } from "react"
import { DisasterMap } from "@/components/disaster-map"
import { NewsTicker } from "@/components/emergency/news-ticker"
import { NewsPanel } from "@/components/emergency/news-panel"
import { CallButton } from "@/components/emergency/call-button"
import { CallPanel } from "@/components/emergency/call-panel"

export default function EmergencyPage() {
  const [newsOpen, setNewsOpen] = useState(false)
  const [callOpen, setCallOpen] = useState(false)

  return (
    <div className="h-[100dvh] relative overflow-hidden bg-black">
      {/* Layer 1: Map (full screen background) */}
      <DisasterMap
        className="absolute inset-0"
        showVehicles={true}
      />

      {/* Layer 2: News Ticker (top) */}
      <NewsTicker
        onExpand={() => setNewsOpen(true)}
        className="absolute top-0 left-0 right-0 z-10"
      />

      {/* Layer 3: Call Button (bottom center) */}
      <CallButton
        onClick={() => setCallOpen(true)}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10"
      />

      {/* Layer 4: News Panel (overlay) */}
      <NewsPanel
        open={newsOpen}
        onClose={() => setNewsOpen(false)}
      />

      {/* Layer 5: Call Panel (drawer) */}
      <CallPanel
        open={callOpen}
        onClose={() => setCallOpen(false)}
      />
    </div>
  )
}
