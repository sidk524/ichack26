"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { HospitalDashboard } from "@/components/hospital-dashboard"
import { HospitalVoicePopup } from "@/components/hospital-voice-popup"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function HospitalsPage() {
  return (
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
          <HospitalDashboard />
        </div>
      </SidebarInset>

      {/* Voice communication popup for field units */}
      <HospitalVoicePopup />
    </SidebarProvider>
  )
}
