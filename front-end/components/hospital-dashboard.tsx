"use client"

import { useState, useEffect } from "react"
import {
  IconAmbulance,
  IconBed,
  IconCircleFilled,
  IconClock,
  IconDroplet,
  IconLungs,
  IconChevronRight,
  IconBuildingHospital,
  IconAlertTriangle,
  IconFirstAidKit,
  IconHeartRateMonitor,
  IconBabyCarriage,
  IconFlame,
  IconStethoscope,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import type { IncomingPatient, HospitalStatus } from "@/types/api"

import { AmbulanceFleet } from "@/components/ambulance-fleet"
import { HospitalResourcesPanel } from "@/components/hospital-resources"
import { HospitalInfrastructurePanel } from "@/components/hospital-infrastructure"
import { HospitalCommunications } from "@/components/hospital-communications"

// Bed capacity mock data
const mockBedCapacity = {
  ed: { total: 40, available: 8, pending: 4, icon: IconFirstAidKit, name: "Emergency" },
  icu: { total: 24, available: 2, pending: 2, icon: IconHeartRateMonitor, name: "ICU" },
  ward: { total: 120, available: 23, pending: 6, icon: IconBed, name: "Ward" },
  surgical: { total: 8, available: 3, pending: 1, icon: IconStethoscope, name: "Surgical" },
  pediatric: { total: 16, available: 5, pending: 0, icon: IconBabyCarriage, name: "Pediatric" },
  burn: { total: 6, available: 2, pending: 0, icon: IconFlame, name: "Burn" },
}

const severityStyles: Record<IncomingPatient["severity"], string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  moderate: "bg-yellow-500",
  low: "bg-green-500",
}

const statusOptions: { value: HospitalStatus; label: string; color: string }[] = [
  { value: "accepting", label: "Accepting", color: "text-green-500" },
  { value: "limited", label: "Limited", color: "text-yellow-500" },
  { value: "diverting", label: "Diverting", color: "text-orange-500" },
  { value: "closed", label: "Closed", color: "text-red-500" },
]

export function HospitalDashboard() {
  const [incomingPatients, setIncomingPatients] = useState<IncomingPatient[]>([])
  const [hospitalStatus, setHospitalStatus] = useState<HospitalStatus>("accepting")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.hospitals
      .incomingPatients("H-001")
      .then((data) => {
        setIncomingPatients(data)
      })
      .catch((err) => {
        console.error("Failed to fetch incoming patients:", err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  // Calculate totals
  const totalBeds = Object.values(mockBedCapacity).reduce((sum, cat) => sum + cat.total, 0)
  const totalAvailable = Object.values(mockBedCapacity).reduce((sum, cat) => sum + cat.available, 0)
  const totalPending = Object.values(mockBedCapacity).reduce((sum, cat) => sum + cat.pending, 0)
  const occupancyPercent = Math.round(((totalBeds - totalAvailable) / totalBeds) * 100)

  const criticalPatients = incomingPatients.filter((p) => p.severity === "critical").length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <IconBuildingHospital className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Central Hospital</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">Level 1 Trauma</Badge>
                <span>ID: H-001</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Status Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select value={hospitalStatus} onValueChange={(v) => setHospitalStatus(v as HospitalStatus)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <IconCircleFilled className={cn("size-2", option.color)} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm">
              Broadcast Update
            </Button>
          </div>
        </div>

        {/* Key Metrics Bar */}
        <div className="grid grid-cols-5 divide-x border-t">
          <MetricItem
            label="Bed Occupancy"
            value={`${occupancyPercent}%`}
            detail={`${totalAvailable} available`}
            alert={occupancyPercent >= 85}
          />
          <MetricItem
            label="ED Available"
            value={mockBedCapacity.ed.available.toString()}
            detail={`of ${mockBedCapacity.ed.total}`}
            alert={mockBedCapacity.ed.available < 10}
          />
          <MetricItem
            label="ICU Available"
            value={mockBedCapacity.icu.available.toString()}
            detail={`of ${mockBedCapacity.icu.total}`}
            alert={mockBedCapacity.icu.available < 5}
          />
          <MetricItem
            label="Incoming"
            value={incomingPatients.length.toString()}
            detail={criticalPatients > 0 ? `${criticalPatients} critical` : "patients"}
            alert={criticalPatients > 0}
          />
          <MetricItem
            label="ER Wait"
            value="12m"
            detail="average"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-12 divide-x">
          {/* Left Column - Capacity & Resources */}
          <div className="col-span-3 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Bed Capacity */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Bed Capacity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(mockBedCapacity).map(([key, cat]) => {
                    const occupied = cat.total - cat.available
                    const occupancyPercent = Math.round((occupied / cat.total) * 100)
                    const Icon = cat.icon
                    const isAlert = occupancyPercent >= 80

                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Icon className="size-3.5 text-muted-foreground" />
                            <span>{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={cn(
                              "font-medium",
                              isAlert && "text-orange-600"
                            )}>
                              {cat.available}/{cat.total}
                            </span>
                            {cat.pending > 0 && (
                              <span className="text-orange-500">+{cat.pending}</span>
                            )}
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              occupancyPercent >= 90 ? "bg-red-500" :
                              occupancyPercent >= 75 ? "bg-orange-500" :
                              occupancyPercent >= 50 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${occupancyPercent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <HospitalResourcesPanel />
            </div>
          </div>

          {/* Center Column - Incoming Patients & Ambulances */}
          <div className="col-span-5 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Incoming Patients */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Incoming Patients</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{incomingPatients.length} en route</Badge>
                      {criticalPatients > 0 && (
                        <Badge variant="destructive" className="animate-pulse">
                          {criticalPatients} critical
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {incomingPatients.map((patient) => (
                      <div
                        key={patient.id}
                        className={cn(
                          "flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors",
                          patient.severity === "critical" && "bg-red-50/50"
                        )}
                      >
                        {/* ETA */}
                        <div className="text-center min-w-12">
                          <div className="text-2xl font-bold">{patient.eta}</div>
                          <div className="text-[10px] text-muted-foreground">min</div>
                        </div>

                        {/* Severity indicator */}
                        <div className={cn("w-1 h-10 rounded-full", severityStyles[patient.severity])} />

                        {/* Patient info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{patient.condition}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {patient.needs}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <IconAmbulance className="size-3" />
                            <span>{patient.unit}</span>
                          </div>
                        </div>

                        <Button variant="ghost" size="icon" className="size-7">
                          <IconChevronRight className="size-4" />
                        </Button>
                      </div>
                    ))}

                    {incomingPatients.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No incoming patients
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Ambulance Fleet */}
              <AmbulanceFleet />
            </div>
          </div>

          {/* Right Column - Infrastructure & Communications */}
          <div className="col-span-4 overflow-y-auto bg-muted/30">
            <div className="p-4 space-y-4">
              <HospitalInfrastructurePanel />
              <HospitalCommunications />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricItem({
  label,
  value,
  detail,
  alert = false,
}: {
  label: string
  value: string
  detail: string
  alert?: boolean
}) {
  return (
    <div className={cn(
      "px-4 py-2.5 text-center",
      alert && "bg-orange-50"
    )}>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className={cn(
        "text-xl font-bold",
        alert && "text-orange-600"
      )}>
        {value}
      </div>
      <div className={cn(
        "text-[10px]",
        alert ? "text-orange-500" : "text-muted-foreground"
      )}>
        {detail}
      </div>
    </div>
  )
}
