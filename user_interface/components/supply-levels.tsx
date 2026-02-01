"use client"

import {
  IconDroplet,
  IconLungs,
  IconPill,
  IconAlertTriangle,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface BloodSupply {
  type: string
  units: number
  capacity: number
  status: "adequate" | "low" | "critical"
}

interface Equipment {
  name: string
  available: number
  total: number
  inUse: number
}

const bloodSupply: BloodSupply[] = [
  { type: "O-", units: 8, capacity: 50, status: "critical" },
  { type: "O+", units: 45, capacity: 80, status: "adequate" },
  { type: "A-", units: 12, capacity: 30, status: "low" },
  { type: "A+", units: 38, capacity: 60, status: "adequate" },
  { type: "B-", units: 6, capacity: 20, status: "low" },
  { type: "B+", units: 22, capacity: 40, status: "adequate" },
  { type: "AB-", units: 4, capacity: 15, status: "low" },
  { type: "AB+", units: 18, capacity: 25, status: "adequate" },
]

const equipment: Equipment[] = [
  { name: "Ventilators", available: 4, total: 20, inUse: 16 },
  { name: "Defibrillators", available: 8, total: 15, inUse: 7 },
  { name: "Infusion Pumps", available: 25, total: 60, inUse: 35 },
  { name: "Patient Monitors", available: 12, total: 40, inUse: 28 },
]

const statusConfig = {
  adequate: { color: "bg-green-500", textColor: "text-green-600" },
  low: { color: "bg-yellow-500", textColor: "text-yellow-600" },
  critical: { color: "bg-red-500", textColor: "text-red-600" },
}

interface SupplyLevelsProps {
  className?: string
}

export function SupplyLevels({ className }: SupplyLevelsProps) {
  const criticalCount = bloodSupply.filter((b) => b.status === "critical").length
  const lowCount = bloodSupply.filter((b) => b.status === "low").length

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Supply Levels</CardTitle>
          {(criticalCount > 0 || lowCount > 0) && (
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalCount} critical
                </Badge>
              )}
              {lowCount > 0 && (
                <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                  {lowCount} low
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Blood Bank */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <IconDroplet className="size-4 text-red-500" />
            Blood Bank
          </div>
          <div className="grid grid-cols-4 gap-2">
            {bloodSupply.map((blood) => {
              const percentage = Math.round((blood.units / blood.capacity) * 100)
              const config = statusConfig[blood.status]
              return (
                <div
                  key={blood.type}
                  className={cn(
                    "rounded-lg border p-2 text-center",
                    blood.status === "critical" && "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                  )}
                >
                  <div className="text-xs font-bold">{blood.type}</div>
                  <div className={cn("text-lg font-semibold", config.textColor)}>
                    {blood.units}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    of {blood.capacity}
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", config.color)}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Equipment */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <IconLungs className="size-4 text-blue-500" />
            Critical Equipment
          </div>
          <div className="space-y-2">
            {equipment.map((item) => {
              const usagePercent = Math.round((item.inUse / item.total) * 100)
              const isLow = item.available <= 5
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{item.name}</span>
                      <span className={cn(
                        "text-xs",
                        isLow ? "text-red-500 font-semibold" : "text-muted-foreground"
                      )}>
                        {item.available} available
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          usagePercent >= 90 ? "bg-red-500" :
                          usagePercent >= 70 ? "bg-yellow-500" : "bg-green-500"
                        )}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>
                  {isLow && (
                    <IconAlertTriangle className="size-4 text-red-500 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <Button variant="outline" size="sm" className="w-full">
          <IconPill className="size-4 mr-2" />
          Request Supplies
        </Button>
      </CardContent>
    </Card>
  )
}
