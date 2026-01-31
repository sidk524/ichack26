"use client"

import {
  IconBed,
  IconHeartRateMonitor,
  IconStethoscope,
  IconBabyCarriage,
  IconFlame,
  IconFirstAidKit,
} from "@tabler/icons-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface BedCategory {
  id: string
  name: string
  icon: typeof IconBed
  total: number
  available: number
  pending: number
}

const bedCategories: BedCategory[] = [
  { id: "er", name: "Emergency", icon: IconFirstAidKit, total: 40, available: 8, pending: 3 },
  { id: "icu", name: "ICU", icon: IconHeartRateMonitor, total: 24, available: 2, pending: 2 },
  { id: "general", name: "General", icon: IconBed, total: 120, available: 34, pending: 5 },
  { id: "pediatric", name: "Pediatric", icon: IconBabyCarriage, total: 20, available: 12, pending: 0 },
  { id: "burn", name: "Burn Unit", icon: IconFlame, total: 8, available: 3, pending: 1 },
  { id: "surgical", name: "Surgical", icon: IconStethoscope, total: 16, available: 4, pending: 2 },
]

function getOccupancyColor(percentage: number) {
  if (percentage >= 90) return "text-red-500"
  if (percentage >= 75) return "text-orange-500"
  if (percentage >= 50) return "text-yellow-500"
  return "text-green-500"
}

function getProgressColor(percentage: number) {
  if (percentage >= 90) return "bg-red-500"
  if (percentage >= 75) return "bg-orange-500"
  if (percentage >= 50) return "bg-yellow-500"
  return "bg-green-500"
}

interface HospitalCapacityProps {
  className?: string
}

export function HospitalCapacity({ className }: HospitalCapacityProps) {
  const totalBeds = bedCategories.reduce((sum, cat) => sum + cat.total, 0)
  const totalAvailable = bedCategories.reduce((sum, cat) => sum + cat.available, 0)
  const totalOccupancy = Math.round(((totalBeds - totalAvailable) / totalBeds) * 100)

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Bed Capacity</CardTitle>
          <div className="flex items-center gap-2">
            <span className={cn("text-2xl font-bold", getOccupancyColor(totalOccupancy))}>
              {totalOccupancy}%
            </span>
            <span className="text-xs text-muted-foreground">occupied</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {bedCategories.map((category) => {
          const occupied = category.total - category.available
          const occupancyPercent = Math.round((occupied / category.total) * 100)
          const Icon = category.icon

          return (
            <div key={category.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">
                    {category.available}/{category.total} available
                  </span>
                  {category.pending > 0 && (
                    <span className="text-orange-500 font-medium">
                      +{category.pending} incoming
                    </span>
                  )}
                </div>
              </div>
              <div className="relative">
                <Progress value={occupancyPercent} className="h-2" />
                <div
                  className={cn("absolute inset-0 h-2 rounded-full", getProgressColor(occupancyPercent))}
                  style={{ width: `${occupancyPercent}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
