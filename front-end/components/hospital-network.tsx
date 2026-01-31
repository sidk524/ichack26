"use client"

import { useState, useEffect } from "react"
import {
  IconBuildingHospital,
  IconCircleFilled,
  IconArrowRight,
  IconPhone,
  IconLoader2,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import type { HospitalStatus, Hospital } from "@/types/api"

const statusConfig: Record<HospitalStatus, { label: string; color: string; dotColor: string }> = {
  accepting: {
    label: "Accepting",
    color: "text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900",
    dotColor: "text-green-500",
  },
  limited: {
    label: "Limited",
    color: "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900",
    dotColor: "text-yellow-500",
  },
  diverting: {
    label: "Diverting",
    color: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900",
    dotColor: "text-orange-500",
  },
  closed: {
    label: "Closed",
    color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900",
    dotColor: "text-red-500",
  },
}

interface HospitalNetworkProps {
  className?: string
}

/**
 * HospitalNetwork displays nearby hospitals and their status
 * Fetches data from api.hospitals.list()
 */
export function HospitalNetwork({ className }: HospitalNetworkProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.hospitals
      .list()
      .then((data) => {
        // Filter out the current hospital (H-001) to show only nearby ones
        setHospitals(data.filter(h => h.id !== "H-001"))
      })
      .catch((err) => {
        console.error("Failed to fetch hospitals:", err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const acceptingCount = hospitals.filter((h) => h.status === "accepting").length

  if (isLoading) {
    return (
      <Card className={cn("flex flex-col", className)}>
        <CardHeader className="flex-none pb-3">
          <CardTitle className="text-sm font-semibold">Hospital Network</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-none pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Hospital Network</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {acceptingCount} accepting
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-3">
        {hospitals.map((hospital) => {
          const status = statusConfig[hospital.status]
          return (
            <div
              key={hospital.id}
              className={cn(
                "rounded-lg border p-3 transition-colors hover:bg-muted/50",
                hospital.status === "diverting" && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="size-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <IconBuildingHospital className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium truncate">{hospital.name}</h4>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {hospital.distance} km
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <div className="flex items-center gap-1">
                        <IconCircleFilled className={cn("size-2", status.dotColor)} />
                        <span className={cn("text-xs font-medium", status.dotColor)}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>ER: {hospital.erAvailable}</span>
                      <span>ICU: {hospital.icuAvailable}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {hospital.specialties.map((specialty) => (
                        <Badge
                          key={specialty}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={hospital.status === "diverting" || hospital.status === "closed"}
                  >
                    <IconArrowRight className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7">
                    <IconPhone className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
