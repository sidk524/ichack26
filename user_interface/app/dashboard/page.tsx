"use client"

import { useState, useRef } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { DisasterMap, type DisasterMapHandle } from "@/components/disaster-map"
import { IncidentFeed, type PendingCallData } from "@/components/incident-feed"
import { ResponderCards } from "@/components/responder-cards"
import { SiteHeader } from "@/components/site-header"
import { DispatchButton } from "@/components/dispatch-button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function Page() {
  const [pendingCall, setPendingCall] = useState<PendingCallData | null>(null)
  const mapRef = useRef<DisasterMapHandle | null>(null)

  // Called when new call arrives from incident feed
  const handleCallReceived = (data: PendingCallData) => {
    console.log("[Dashboard] Call received:", data.callId)
    setPendingCall(data)
  }

  // Called when dispatcher clicks the dispatch button
  const handleDispatch = async () => {
    if (!pendingCall || !mapRef.current) {
      console.error("[Dashboard] Cannot dispatch - missing call data or map ref")
      return
    }
    console.log("[Dashboard] Dispatching ambulance for call:", pendingCall.callId)
    await mapRef.current.dispatchToCall(pendingCall)
    setPendingCall(null) // Clear after dispatch
  }

  return (
    <>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <ResponderCards />
                <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
                  <div>
                    <DisasterMap
                      ref={mapRef}
                      className="h-125"
                      showDangerZones
                      showHospitals
                    />
                  </div>
                  <div>
                    <IncidentFeed
                      className="h-125"
                      onCallReceived={handleCallReceived}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>

      {/* Floating Dispatch Button - outside SidebarProvider for proper z-index */}
      <DispatchButton
        visible={!!pendingCall}
        onDispatch={handleDispatch}
        callId={pendingCall?.callId || ""}
      />
    </>
  )
}
