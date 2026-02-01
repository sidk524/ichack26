"use client"

import {
  IconUsers,
  IconStethoscope,
  IconHeartbeat,
  IconUserShield,
  IconFlask,
  IconRadioactive,
  IconDroplet,
  IconLungs,
  IconHeartRateMonitor,
  IconPill,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { HospitalResources, StaffingLevel, SupplyLevel } from "@/types/api"

// Mock data
const mockResources: HospitalResources = {
  capacity: {
    ed: { total: 40, available: 8, pending: 4 },
    ward: { total: 120, available: 23, pending: 6 },
    icu: { total: 24, available: 2, pending: 2 },
    surgical: { total: 8, available: 3, pending: 1 },
    pediatric: { total: 16, available: 5, pending: 0 },
  },
  capabilities: ["Trauma Level 1", "Cardiac", "Stroke", "Burns", "Pediatric Trauma"],
  traumaLevel: 1,
  staffing: {
    physicians: { onDuty: 12, required: 14 },
    nurses: { onDuty: 28, required: 32 },
    specialists: { onDuty: 4, required: 6 },
    support: { onDuty: 15, required: 12 },
    level: "strained",
  },
  diagnostics: {
    labTurnaround: 45,
    ctAvailable: true,
    mriAvailable: false,
    xrayWait: 8,
    ultrasoundWait: 15,
  },
  criticalSupplies: {
    bloodONeg: { units: 8, level: "low" },
    bloodOPos: { units: 24, level: "adequate" },
    bloodANeg: { units: 4, level: "critical" },
    bloodAPos: { units: 18, level: "adequate" },
    ventilators: { available: 4, total: 12 },
    monitors: { available: 8, total: 20 },
    criticalDrugs: [
      { name: "Epinephrine", level: "adequate" },
      { name: "Morphine", level: "adequate" },
      { name: "TXA", level: "low" },
      { name: "Ketamine", level: "critical" },
    ],
  },
}

const staffingLevelConfig: Record<StaffingLevel, { label: string; color: string }> = {
  adequate: { label: "Adequate", color: "text-green-600 bg-green-50 border-green-200" },
  strained: { label: "Strained", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  critical: { label: "Critical", color: "text-orange-600 bg-orange-50 border-orange-200" },
  emergency: { label: "Emergency", color: "text-red-600 bg-red-50 border-red-200" },
}

const supplyLevelConfig: Record<SupplyLevel, { color: string; bgColor: string }> = {
  adequate: { color: "text-green-600", bgColor: "bg-green-500" },
  low: { color: "text-yellow-600", bgColor: "bg-yellow-500" },
  critical: { color: "text-orange-600", bgColor: "bg-orange-500" },
  depleted: { color: "text-red-600", bgColor: "bg-red-500" },
}

interface HospitalResourcesProps {
  className?: string
}

export function HospitalResourcesPanel({ className }: HospitalResourcesProps) {
  const resources = mockResources
  const staffingConfig = staffingLevelConfig[resources.staffing.level]

  return (
    <div className={cn("space-y-4", className)}>
      {/* Staffing Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Staffing</CardTitle>
            <Badge variant="outline" className={cn("text-xs", staffingConfig.color)}>
              {staffingConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <StaffingRow
            icon={IconStethoscope}
            label="Physicians"
            current={resources.staffing.physicians.onDuty}
            required={resources.staffing.physicians.required}
          />
          <StaffingRow
            icon={IconHeartbeat}
            label="Nurses"
            current={resources.staffing.nurses.onDuty}
            required={resources.staffing.nurses.required}
          />
          <StaffingRow
            icon={IconUserShield}
            label="Specialists"
            current={resources.staffing.specialists.onDuty}
            required={resources.staffing.specialists.required}
          />
          <StaffingRow
            icon={IconUsers}
            label="Support"
            current={resources.staffing.support.onDuty}
            required={resources.staffing.support.required}
          />
        </CardContent>
      </Card>

      {/* Diagnostics Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <IconFlask className="size-4" />
                <span className="text-xs">Lab Results</span>
              </div>
              <div className="text-xl font-bold">{resources.diagnostics.labTurnaround}m</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <IconRadioactive className="size-4" />
                <span className="text-xs">X-Ray Wait</span>
              </div>
              <div className="text-xl font-bold">{resources.diagnostics.xrayWait}m</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            <div className={cn(
              "flex items-center justify-center gap-1.5 rounded border px-2 py-1.5",
              resources.diagnostics.ctAvailable ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
            )}>
              <span className={cn(
                "size-1.5 rounded-full",
                resources.diagnostics.ctAvailable ? "bg-green-500" : "bg-red-500"
              )} />
              CT
            </div>
            <div className={cn(
              "flex items-center justify-center gap-1.5 rounded border px-2 py-1.5",
              resources.diagnostics.mriAvailable ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
            )}>
              <span className={cn(
                "size-1.5 rounded-full",
                resources.diagnostics.mriAvailable ? "bg-green-500" : "bg-red-500"
              )} />
              MRI
            </div>
            <div className="flex items-center justify-center gap-1.5 rounded border px-2 py-1.5">
              US: {resources.diagnostics.ultrasoundWait}m
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Supplies Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Critical Supplies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Blood Supply */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <IconDroplet className="size-3.5" />
              <span>Blood Products</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <BloodSupplyBox label="O-" units={resources.criticalSupplies.bloodONeg.units} level={resources.criticalSupplies.bloodONeg.level} />
              <BloodSupplyBox label="O+" units={resources.criticalSupplies.bloodOPos.units} level={resources.criticalSupplies.bloodOPos.level} />
              <BloodSupplyBox label="A-" units={resources.criticalSupplies.bloodANeg.units} level={resources.criticalSupplies.bloodANeg.level} />
              <BloodSupplyBox label="A+" units={resources.criticalSupplies.bloodAPos.units} level={resources.criticalSupplies.bloodAPos.level} />
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <IconLungs className="size-3.5" />
              <span>Equipment</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <EquipmentBar
                label="Ventilators"
                available={resources.criticalSupplies.ventilators.available}
                total={resources.criticalSupplies.ventilators.total}
              />
              <EquipmentBar
                label="Monitors"
                available={resources.criticalSupplies.monitors.available}
                total={resources.criticalSupplies.monitors.total}
              />
            </div>
          </div>

          {/* Critical Drugs */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <IconPill className="size-3.5" />
              <span>Critical Medications</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {resources.criticalSupplies.criticalDrugs.map((drug) => {
                const config = supplyLevelConfig[drug.level]
                return (
                  <Badge
                    key={drug.name}
                    variant="outline"
                    className={cn("text-xs", config.color)}
                  >
                    {drug.name}
                  </Badge>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StaffingRow({
  icon: Icon,
  label,
  current,
  required,
}: {
  icon: typeof IconUsers
  label: string
  current: number
  required: number
}) {
  const ratio = current / required
  const isLow = ratio < 0.85
  const isCritical = ratio < 0.7

  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-sm mb-1">
          <span>{label}</span>
          <span className={cn(
            "font-medium",
            isCritical ? "text-red-600" : isLow ? "text-yellow-600" : ""
          )}>
            {current}/{required}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isCritical ? "bg-red-500" : isLow ? "bg-yellow-500" : "bg-green-500"
            )}
            style={{ width: `${Math.min(ratio * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function BloodSupplyBox({
  label,
  units,
  level,
}: {
  label: string
  units: number
  level: SupplyLevel
}) {
  const config = supplyLevelConfig[level]
  return (
    <div className={cn(
      "rounded border p-2 text-center",
      level === "critical" && "border-orange-200 bg-orange-50",
      level === "low" && "border-yellow-200 bg-yellow-50",
      level === "depleted" && "border-red-200 bg-red-50"
    )}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={cn("text-lg font-bold", config.color)}>{units}</div>
    </div>
  )
}

function EquipmentBar({
  label,
  available,
  total,
}: {
  label: string
  available: number
  total: number
}) {
  const ratio = available / total
  const isLow = ratio < 0.3
  const isCritical = ratio < 0.15

  return (
    <div className="rounded border p-2">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          "font-medium",
          isCritical ? "text-red-600" : isLow ? "text-yellow-600" : ""
        )}>
          {available}/{total}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isCritical ? "bg-red-500" : isLow ? "bg-yellow-500" : "bg-green-500"
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}
