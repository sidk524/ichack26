"use client"

import { useState, useEffect } from "react"
import {
  IconAlertTriangle,
  IconFlame,
  IconDroplet,
  IconBuildingSkyscraper,
  IconRadioactive,
  IconBomb,
  IconLoader2,
  IconMapPin,
  IconShieldExclamation,
  IconHome,
  IconRouteOff,
} from "@tabler/icons-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import type { BackendDangerZone, DisasterType, RecommendedAction } from "@/types/backend"

// Icon mapping for disaster types
const disasterIcons: Record<DisasterType, typeof IconFlame> = {
  earthquake: IconBuildingSkyscraper,
  fire: IconFlame,
  flood: IconDroplet,
  building_collapse: IconBuildingSkyscraper,
  explosion: IconBomb,
  chemical: IconRadioactive,
  other: IconAlertTriangle,
}

// Action icons
const actionIcons: Record<RecommendedAction, typeof IconHome> = {
  evacuate: IconRouteOff,
  shelter_in_place: IconHome,
  avoid_area: IconShieldExclamation,
}

// Severity colors
function getSeverityColor(severity: number) {
  switch (severity) {
    case 5: return "bg-red-500 text-white"
    case 4: return "bg-orange-500 text-white"
    case 3: return "bg-yellow-500 text-black"
    case 2: return "bg-blue-500 text-white"
    default: return "bg-gray-500 text-white"
  }
}

function getSeverityBorder(severity: number) {
  switch (severity) {
    case 5: return "border-l-red-500"
    case 4: return "border-l-orange-500"
    case 3: return "border-l-yellow-500"
    case 2: return "border-l-blue-500"
    default: return "border-l-gray-500"
  }
}

function getSeverityLabel(severity: number) {
  switch (severity) {
    case 5: return "Critical"
    case 4: return "Severe"
    case 3: return "Moderate"
    case 2: return "Minor"
    default: return "Low"
  }
}

function formatActionLabel(action: RecommendedAction) {
  switch (action) {
    case "evacuate": return "Evacuate Area"
    case "shelter_in_place": return "Shelter in Place"
    case "avoid_area": return "Avoid Area"
  }
}

function formatRadius(meters: number) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`
  }
  return `${meters}m`
}

function formatTimeAgo(timestamp: number) {
  const now = Date.now() / 1000
  const diff = now - timestamp

  if (diff < 60) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

interface DangerZonesProps {
  className?: string
  maxItems?: number
  compact?: boolean
}

export function DangerZones({ className, maxItems = 5, compact = false }: DangerZonesProps) {
  const [zones, setZones] = useState<BackendDangerZone[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.dangerZones
      .list()
      .then((data) => {
        // Sort by severity (highest first), then by detected_at (newest first)
        const sorted = [...data].sort((a, b) => {
          if (b.severity !== a.severity) return b.severity - a.severity
          return b.detected_at - a.detected_at
        })
        setZones(sorted.slice(0, maxItems))
      })
      .catch((err) => {
        console.error("Failed to fetch danger zones:", err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [maxItems])

  const activeZones = zones.filter((z) => z.is_active)
  const criticalCount = activeZones.filter((z) => z.severity >= 4).length

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <IconAlertTriangle className="size-4 text-orange-500" />
            Danger Zones
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (zones.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <IconAlertTriangle className="size-4 text-orange-500" />
            Danger Zones
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          No active danger zones
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <IconAlertTriangle className="size-4 text-orange-500" />
            Danger Zones
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} Critical
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {activeZones.length} Active
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {zones.map((zone) => {
          const DisasterIcon = disasterIcons[zone.disaster_type] || IconAlertTriangle
          const ActionIcon = actionIcons[zone.recommended_action]

          return (
            <div
              key={zone.zone_id}
              className={cn(
                "border-l-4 rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted",
                getSeverityBorder(zone.severity),
                !zone.is_active && "opacity-50"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "size-9 rounded-lg flex items-center justify-center shrink-0",
                  getSeverityColor(zone.severity)
                )}>
                  <DisasterIcon className="size-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm truncate capitalize">
                      {zone.disaster_type.replace("_", " ")}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("text-xs shrink-0", getSeverityColor(zone.severity))}
                    >
                      {getSeverityLabel(zone.severity)}
                    </Badge>
                  </div>

                  {!compact && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {zone.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <IconMapPin className="size-3" />
                      {formatRadius(zone.radius)} radius
                    </span>
                    <span className="flex items-center gap-1">
                      <ActionIcon className="size-3" />
                      {formatActionLabel(zone.recommended_action)}
                    </span>
                  </div>

                  {!compact && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">
                        Detected {formatTimeAgo(zone.detected_at)}
                      </span>
                      {!zone.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Resolved
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
