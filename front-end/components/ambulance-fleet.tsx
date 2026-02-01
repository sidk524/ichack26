"use client"

import {
  IconAmbulance,
  IconCircleFilled,
  IconMapPin,
  IconClock,
  IconUser,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { AmbulanceFleetStatus, AmbulanceUnit } from "@/types/api"

// Mock data for ambulance fleet
const mockFleetStatus: AmbulanceFleetStatus = {
  total: 12,
  available: 3,
  dispatched: 2,
  enRouteHospital: 4,
  atScene: 2,
  atHospital: 1,
  offline: 0,
  units: [
    {
      id: "AMB-001",
      callSign: "Medic 7",
      status: "en_route_hospital",
      eta: 3,
      crew: 2,
      destination: "Central Hospital",
      patient: { severity: "critical", condition: "Trauma - crush injury" },
    },
    {
      id: "AMB-002",
      callSign: "Medic 12",
      status: "en_route_hospital",
      eta: 7,
      crew: 2,
      destination: "Central Hospital",
      patient: { severity: "high", condition: "Smoke inhalation" },
    },
    {
      id: "AMB-003",
      callSign: "Rescue 3",
      status: "en_route_hospital",
      eta: 12,
      crew: 3,
      destination: "Central Hospital",
      patient: { severity: "high", condition: "Multiple fractures" },
    },
    {
      id: "AMB-004",
      callSign: "Medic 4",
      status: "en_route_hospital",
      eta: 18,
      crew: 2,
      destination: "Central Hospital",
      patient: { severity: "moderate", condition: "Lacerations" },
    },
    {
      id: "AMB-005",
      callSign: "Medic 9",
      status: "available",
      crew: 2,
    },
    {
      id: "AMB-006",
      callSign: "Medic 15",
      status: "available",
      crew: 2,
    },
    {
      id: "AMB-007",
      callSign: "Rescue 1",
      status: "available",
      crew: 3,
    },
    {
      id: "AMB-008",
      callSign: "Medic 2",
      status: "at_scene",
      crew: 2,
    },
    {
      id: "AMB-009",
      callSign: "Medic 6",
      status: "at_scene",
      crew: 2,
    },
    {
      id: "AMB-010",
      callSign: "Medic 8",
      status: "dispatched",
      crew: 2,
    },
    {
      id: "AMB-011",
      callSign: "Medic 11",
      status: "dispatched",
      crew: 2,
    },
    {
      id: "AMB-012",
      callSign: "Medic 3",
      status: "at_hospital",
      crew: 2,
    },
  ],
}

const statusConfig: Record<AmbulanceUnit["status"], { label: string; color: string }> = {
  available: { label: "Available", color: "text-green-600" },
  dispatched: { label: "Dispatched", color: "text-blue-600" },
  en_route_hospital: { label: "En Route", color: "text-orange-600" },
  at_scene: { label: "On Scene", color: "text-yellow-600" },
  at_hospital: { label: "At Hospital", color: "text-purple-600" },
  offline: { label: "Offline", color: "text-muted-foreground" },
}

const severityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  moderate: "bg-yellow-500",
  low: "bg-green-500",
}

interface AmbulanceFleetProps {
  className?: string
}

export function AmbulanceFleet({ className }: AmbulanceFleetProps) {
  const fleet = mockFleetStatus
  const inboundUnits = fleet.units.filter((u) => u.status === "en_route_hospital")
  const utilizationPercent = Math.round(((fleet.total - fleet.available - fleet.offline) / fleet.total) * 100)

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Ambulance Fleet</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{utilizationPercent}% deployed</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fleet Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border p-2">
            <div className="text-xl font-bold text-green-600">{fleet.available}</div>
            <div className="text-[10px] text-muted-foreground">Available</div>
          </div>
          <div className="rounded-lg border p-2">
            <div className="text-xl font-bold text-orange-600">{fleet.enRouteHospital}</div>
            <div className="text-[10px] text-muted-foreground">Inbound</div>
          </div>
          <div className="rounded-lg border p-2">
            <div className="text-xl font-bold text-blue-600">{fleet.dispatched + fleet.atScene}</div>
            <div className="text-[10px] text-muted-foreground">In Field</div>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Fleet Utilization</span>
            <span className="font-medium">{fleet.total - fleet.available - fleet.offline}/{fleet.total}</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${(fleet.available / fleet.total) * 100}%` }}
            />
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${(fleet.dispatched / fleet.total) * 100}%` }}
            />
            <div
              className="bg-yellow-500 transition-all"
              style={{ width: `${(fleet.atScene / fleet.total) * 100}%` }}
            />
            <div
              className="bg-orange-500 transition-all"
              style={{ width: `${(fleet.enRouteHospital / fleet.total) * 100}%` }}
            />
            <div
              className="bg-purple-500 transition-all"
              style={{ width: `${(fleet.atHospital / fleet.total) * 100}%` }}
            />
          </div>
          <div className="flex gap-3 text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-green-500" />Avail</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-blue-500" />Disp</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-yellow-500" />Scene</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-orange-500" />Inbound</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-purple-500" />Here</span>
          </div>
        </div>

        {/* Inbound Units List */}
        {inboundUnits.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Inbound to This Hospital</div>
            <div className="space-y-2">
              {inboundUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="flex items-center gap-3 rounded-lg border p-2"
                >
                  <div className={cn(
                    "w-1 h-8 rounded-full",
                    unit.patient ? severityColors[unit.patient.severity] : "bg-muted"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <IconAmbulance className="size-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{unit.callSign}</span>
                    </div>
                    {unit.patient && (
                      <div className="text-xs text-muted-foreground truncate">
                        {unit.patient.condition}
                      </div>
                    )}
                  </div>
                  {unit.eta && (
                    <div className="text-right">
                      <div className="text-lg font-bold">{unit.eta}</div>
                      <div className="text-[10px] text-muted-foreground">min</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
