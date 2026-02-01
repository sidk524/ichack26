"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DisasterMap } from "@/components/disaster-map"
import { NewsFeed } from "@/components/emergency/news-feed"
import { CallButton } from "@/components/emergency/call-button"
import { CallPanel } from "@/components/emergency/call-panel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IconAlertTriangle, IconChevronDown, IconChevronUp } from "@tabler/icons-react"

export default function EmergencyPage() {
  const [callOpen, setCallOpen] = useState(false)
  const [newsExpanded, setNewsExpanded] = useState(false)

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-2 flex-shrink-0">
        <h1 className="text-xl font-bold">Emergency</h1>
        <p className="text-sm text-muted-foreground">Live disaster updates</p>
      </div>

      {/* News Panel (collapsible) */}
      <div className="px-4 pb-2 flex-shrink-0">
        <Card>
          <CardHeader
            className="py-2 cursor-pointer"
            onClick={() => setNewsExpanded(!newsExpanded)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <IconAlertTriangle className="size-5 text-red-500" />
                Emergency Updates
              </CardTitle>
              {newsExpanded ? (
                <IconChevronUp className="size-5 text-muted-foreground" />
              ) : (
                <IconChevronDown className="size-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          <AnimatePresence initial={false}>
            <motion.div
              initial={false}
              animate={{
                height: newsExpanded ? "auto" : 40,
                overflow: "hidden",
              }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <CardContent className="pt-0">
                <NewsFeed compact={!newsExpanded} />
              </CardContent>
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>

      {/* Map Panel - fills all remaining space to bottom */}
      <div className="flex-1 px-4 pb-4 min-h-0 relative">
        <Card className="h-full">
          <CardContent className="p-0 h-full overflow-hidden rounded-lg">
            <DisasterMap
              className="h-full w-full"
              showVehicles={true}
              showLegend={false}
            />
          </CardContent>
        </Card>

        {/* Call Button - on top of the map */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
          <CallButton onClick={() => setCallOpen(true)} />
        </div>
      </div>

      {/* Call Panel (drawer) */}
      <CallPanel
        open={callOpen}
        onClose={() => setCallOpen(false)}
      />
    </div>
  )
}
