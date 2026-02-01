"use client"

import { useState } from "react"
import { DisasterMap } from "@/components/disaster-map"
import { NewsFeed } from "@/components/emergency/news-feed"
import { CallButton } from "@/components/emergency/call-button"
import { CallPanel } from "@/components/emergency/call-panel"
import { Card, CardContent } from "@/components/ui/card"

export default function EmergencyPage() {
  const [callOpen, setCallOpen] = useState(false)

  return (
    <div className="min-h-[100dvh] bg-background p-4 pb-28">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold">Emergency</h1>
        <p className="text-sm text-muted-foreground">Live disaster updates</p>
      </div>

      {/* Panels */}
      <div className="flex flex-col gap-4">
        {/* Map Panel */}
        <Card>
          <CardContent className="p-0 overflow-hidden rounded-lg">
            <DisasterMap
              className="h-64"
              showVehicles={true}
              showLegend={false}
            />
          </CardContent>
        </Card>

        {/* News Feed Panel */}
        <NewsFeed className="h-80" />
      </div>

      {/* Fixed Call Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
        <CallButton onClick={() => setCallOpen(true)} />
      </div>

      {/* Call Panel (drawer) */}
      <CallPanel
        open={callOpen}
        onClose={() => setCallOpen(false)}
      />
    </div>
  )
}
