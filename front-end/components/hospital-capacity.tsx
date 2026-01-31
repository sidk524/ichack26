"use client"

import { useState, useEffect } from "react"
import {
  IconBed,
  IconHeartRateMonitor,
  IconStethoscope,
  IconBabyCarriage,
  IconFlame,
  IconFirstAidKit,
  IconLoader2,
} from "@tabler/icons-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import type { BedCategory as ApiBedCategory } from "@/types/api"

// Local type with icon support
interface BedCategoryWithIcon extends ApiBedCategory {
  icon: typeof IconBed
}

// Map bed category IDs to icons
const iconMap: Record<string, typeof IconBed> = {
  er: IconFirstAidKit,
  icu: IconHeartRateMonitor,
  general: IconBed,
  pediatric: IconBabyCarriage,
  burn: IconFlame,
  surgical: IconStethoscope,
}

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
  hospitalId?: string
}

/**
 * HospitalCapacity displays bed capacity for a hospital
 * Fetches data from api.hospitals.getCapacity()
 */
export function HospitalCapacity({ className, hospitalId = "H-001" }: HospitalCapacityProps) {
  const [bedCategories, setBedCategories] = useState<BedCategoryWithIcon[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.hospitals
      .getCapacity(hospitalId)
      .then((data) => {
        setBedCategories(
          data.map((cat) => ({
            ...cat,
            icon: iconMap[cat.id] || IconBed,
          }))
        )
      })
      .catch((err) => {
        console.error("Failed to fetch bed capacity:", err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [hospitalId])

  const totalBeds = bedCategories.reduce((sum, cat) => sum + cat.total, 0)
  const totalAvailable = bedCategories.reduce((sum, cat) => sum + cat.available, 0)
  const totalOccupancy = totalBeds > 0 ? Math.round(((totalBeds - totalAvailable) / totalBeds) * 100) : 0

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Bed Capacity</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

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
