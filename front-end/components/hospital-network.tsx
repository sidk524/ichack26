"use client"

import {
  IconBuildingHospital,
  IconCircleFilled,
  IconArrowRight,
  IconPhone,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type HospitalStatus = "accepting" | "limited" | "diverting" | "closed"

interface NearbyHospital {
  id: string
  name: string
  distance: number // km
  status: HospitalStatus
  erAvailable: number
  icuAvailable: number
  specialties: string[]
}

const nearbyHospitals: NearbyHospital[] = [
  {
    id: "H-002",
    name: "City General Hospital",
    distance: 4.2,
    status: "accepting",
    erAvailable: 12,
    icuAvailable: 3,
    specialties: ["Trauma", "Cardiac"],
  },
  {
    id: "H-003",
    name: "St. Mary's Medical Center",
    distance: 6.8,
    status: "limited",
    erAvailable: 4,
    icuAvailable: 1,
    specialties: ["Pediatric", "Burns"],
  },
  {
    id: "H-004",
    name: "Regional Trauma Center",
    distance: 8.5,
    status: "accepting",
    erAvailable: 18,
    icuAvailable: 6,
    specialties: ["Trauma", "Neuro", "Ortho"],
  },
  {
    id: "H-005",
    name: "University Hospital",
    distance: 12.3,
    status: "diverting",
    erAvailable: 0,
    icuAvailable: 0,
    specialties: ["Research", "Oncology"],
  },
]

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

export function HospitalNetwork({ className }: HospitalNetworkProps) {
  const acceptingCount = nearbyHospitals.filter((h) => h.status === "accepting").length

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
        {nearbyHospitals.map((hospital) => {
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
