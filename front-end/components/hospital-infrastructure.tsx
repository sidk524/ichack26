"use client"

import {
  IconBolt,
  IconDroplet,
  IconWifi,
  IconPhone,
  IconRadio,
  IconBell,
  IconBuilding,
  IconElevator,
  IconAirConditioning,
  IconRoute,
  IconCircleFilled,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { HospitalInfrastructure, InfrastructureStatus } from "@/types/api"

// Mock data
const mockInfrastructure: HospitalInfrastructure = {
  power: {
    status: "operational",
    source: "grid",
    backupHours: 72,
  },
  water: {
    status: "operational",
    pressure: "normal",
  },
  it: {
    status: "operational",
    ehrOnline: true,
    networkLatency: 12,
  },
  communications: {
    status: "operational",
    radioOnline: true,
    phoneOnline: true,
    pagerOnline: true,
  },
  facility: {
    status: "operational",
    accessRoutes: [
      { name: "Main Entrance", status: "open" },
      { name: "Ambulance Bay", status: "open" },
      { name: "Emergency Exit A", status: "open" },
      { name: "Loading Dock", status: "limited" },
    ],
    elevators: { operational: 5, total: 6 },
    hvac: "operational",
  },
}

const statusConfig: Record<InfrastructureStatus, { label: string; color: string; dotColor: string }> = {
  operational: { label: "Operational", color: "text-green-600", dotColor: "bg-green-500" },
  degraded: { label: "Degraded", color: "text-yellow-600", dotColor: "bg-yellow-500" },
  critical: { label: "Critical", color: "text-orange-600", dotColor: "bg-orange-500" },
  offline: { label: "Offline", color: "text-red-600", dotColor: "bg-red-500" },
}

const routeStatusConfig: Record<string, { color: string; dotColor: string }> = {
  open: { color: "text-green-600", dotColor: "bg-green-500" },
  limited: { color: "text-yellow-600", dotColor: "bg-yellow-500" },
  blocked: { color: "text-red-600", dotColor: "bg-red-500" },
}

interface HospitalInfrastructureProps {
  className?: string
}

export function HospitalInfrastructurePanel({ className }: HospitalInfrastructureProps) {
  const infra = mockInfrastructure

  // Calculate overall status
  const allStatuses = [
    infra.power.status,
    infra.water.status,
    infra.it.status,
    infra.communications.status,
    infra.facility.status,
  ]
  const hasIssues = allStatuses.some((s) => s !== "operational")
  const overallStatus = hasIssues
    ? allStatuses.includes("offline")
      ? "offline"
      : allStatuses.includes("critical")
      ? "critical"
      : "degraded"
    : "operational"
  const overallConfig = statusConfig[overallStatus]

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Infrastructure</CardTitle>
          <Badge variant="outline" className={cn("text-xs", overallConfig.color)}>
            <span className={cn("size-1.5 rounded-full mr-1.5", overallConfig.dotColor)} />
            {overallConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Systems Grid */}
        <div className="grid grid-cols-2 gap-2">
          <SystemStatus
            icon={IconBolt}
            label="Power"
            status={infra.power.status}
            detail={`${infra.power.source === "grid" ? "Grid" : infra.power.source === "generator" ? "Gen" : "Batt"}`}
            subDetail={infra.power.backupHours ? `${infra.power.backupHours}h backup` : undefined}
          />
          <SystemStatus
            icon={IconDroplet}
            label="Water"
            status={infra.water.status}
            detail={infra.water.pressure}
          />
          <SystemStatus
            icon={IconWifi}
            label="IT/Network"
            status={infra.it.status}
            detail={infra.it.ehrOnline ? "EHR Online" : "EHR Down"}
            subDetail={infra.it.networkLatency ? `${infra.it.networkLatency}ms` : undefined}
          />
          <SystemStatus
            icon={IconRadio}
            label="Comms"
            status={infra.communications.status}
            detail={[
              infra.communications.radioOnline && "Radio",
              infra.communications.phoneOnline && "Phone",
            ].filter(Boolean).join(", ")}
          />
        </div>

        {/* Facility Status */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Facility</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded border px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <IconElevator className="size-4 text-muted-foreground" />
                <span>Elevators</span>
              </div>
              <span className={cn(
                "text-sm font-medium",
                infra.facility.elevators.operational < infra.facility.elevators.total && "text-yellow-600"
              )}>
                {infra.facility.elevators.operational}/{infra.facility.elevators.total}
              </span>
            </div>
            <div className="flex items-center justify-between rounded border px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <IconAirConditioning className="size-4 text-muted-foreground" />
                <span>HVAC</span>
              </div>
              <span className={cn("size-2 rounded-full", statusConfig[infra.facility.hvac].dotColor)} />
            </div>
          </div>
        </div>

        {/* Access Routes */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Access Routes</div>
          <div className="grid grid-cols-2 gap-1.5">
            {infra.facility.accessRoutes.map((route) => {
              const config = routeStatusConfig[route.status]
              return (
                <div
                  key={route.name}
                  className="flex items-center gap-2 rounded border px-2 py-1.5 text-xs"
                >
                  <span className={cn("size-1.5 rounded-full shrink-0", config.dotColor)} />
                  <span className="truncate">{route.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SystemStatus({
  icon: Icon,
  label,
  status,
  detail,
  subDetail,
}: {
  icon: typeof IconBolt
  label: string
  status: InfrastructureStatus
  detail?: string
  subDetail?: string
}) {
  const config = statusConfig[status]

  return (
    <div className={cn(
      "rounded-lg border p-3",
      status !== "operational" && "border-yellow-200 bg-yellow-50/50"
    )}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className={cn("size-2 rounded-full", config.dotColor)} />
      </div>
      {(detail || subDetail) && (
        <div className="text-xs text-muted-foreground ml-6">
          {detail}
          {subDetail && <span className="ml-1">({subDetail})</span>}
        </div>
      )}
    </div>
  )
}
