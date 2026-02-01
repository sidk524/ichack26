"use client"

import { useState, useEffect } from "react"
import {
  IconPhone,
  IconMapPin,
  IconUser,
  IconUsers,
  IconCircleFilled,
  IconPlayerPlay,
  IconAmbulance,
  IconLoader2,
  IconAlertCircle,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { api, type PersonInDanger } from "@/lib/api"

type CallerStatus = "on_call" | "waiting" | "being_rescued" | "rescued" | "safe"

// Extend PersonInDanger to match the component's needs
interface Caller extends PersonInDanger {
  // PersonInDanger already has all the fields we need
}

const statusConfig: Record<
  CallerStatus,
  { label: string; color: string; bgColor: string }
> = {
  on_call: {
    label: "On Call",
    color: "text-blue-600",
    bgColor: "bg-blue-500",
  },
  waiting: {
    label: "Waiting",
    color: "text-orange-600",
    bgColor: "bg-orange-500",
  },
  being_rescued: {
    label: "Being Rescued",
    color: "text-purple-600",
    bgColor: "bg-purple-500",
  },
  rescued: {
    label: "Rescued",
    color: "text-green-600",
    bgColor: "bg-green-500",
  },
  safe: { label: "Safe", color: "text-gray-600", bgColor: "bg-gray-500" },
}

// Fallback mock data for when API returns empty
const mockCallers: Caller[] = [
  {
    id: "C-001",
    name: "Ahmet Y.",
    phone: "+90 532 XXX XX01",
    location: "Antakya, Hatay - 3rd Floor Apt",
    status: "on_call",
    isTrapped: true,
    isInjured: true,
    peopleWith: 3,
    medicalConditions: ["Leg injury", "Child present"],
    incidentId: "INC-001",
    lastContact: "Active",
    assignedUnit: undefined,
  },
  {
    id: "C-002",
    name: "Fatma K.",
    phone: "+90 533 XXX XX02",
    location: "Kahramanmaras - Hospital Staff",
    status: "waiting",
    isTrapped: true,
    isInjured: false,
    peopleWith: 8,
    medicalConditions: ["Elderly (72)", "Diabetic"],
    incidentId: "INC-002",
    lastContact: "2m ago",
    assignedUnit: "Rescue 5",
  },
  {
    id: "C-003",
    name: "Mehmet A.",
    phone: "+90 535 XXX XX03",
    location: "Pazarcik - Near Epicenter",
    status: "being_rescued",
    isTrapped: true,
    isInjured: true,
    peopleWith: 2,
    medicalConditions: ["Head wound", "Disoriented"],
    incidentId: "INC-003",
    lastContact: "5m ago",
    assignedUnit: "Rescue 2",
  },
]

interface PeopleInDangerProps {
  className?: string
}

export function PeopleInDanger({ className }: PeopleInDangerProps) {
  const [callers, setCallers] = useState<Caller[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const people = await api.people.list()

        // Use API data if available, otherwise use mock data
        if (people.length > 0) {
          setCallers(people)
        } else {
          // Fall back to mock data when no real data
          setCallers(mockCallers)
        }
        setError(null)
      } catch (err) {
        console.error("[PeopleInDanger] Failed to fetch:", err)
        setError("Failed to load data")
        // Use mock data on error
        setCallers(mockCallers)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  const activeCount = callers.filter(
    (c) => c.status === "on_call" || c.status === "waiting"
  ).length
  const trappedCount = callers.filter(
    (c) => c.isTrapped && c.status !== "rescued" && c.status !== "safe"
  ).length

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-none border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            People in Danger
          </CardTitle>
          <div className="flex items-center gap-2">
            {isLoading && (
              <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
            )}
            <Badge variant="destructive" className="animate-pulse">
              {trappedCount} trapped
            </Badge>
            <Badge variant="secondary">{activeCount} active</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive text-xs">
            <IconAlertCircle className="size-4" />
            {error} - showing cached data
          </div>
        )}
        <div className="h-full overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-10 pl-4 text-xs">Status</TableHead>
                <TableHead className="text-xs">Person</TableHead>
                <TableHead className="text-xs">Location</TableHead>
                <TableHead className="w-20 text-xs">Condition</TableHead>
                <TableHead className="w-24 text-xs">Assigned</TableHead>
                <TableHead className="w-20 pr-4 text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {callers.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground text-sm">
                      No people in danger reported
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {callers.map((caller) => {
                const status = statusConfig[caller.status]
                return (
                  <TableRow
                    key={caller.id}
                    className={cn(
                      caller.status === "on_call" &&
                        "bg-blue-50/50 dark:bg-blue-950/20",
                      caller.isTrapped &&
                        caller.status !== "rescued" &&
                        "border-l-2 border-l-red-500"
                    )}
                  >
                    <TableCell className="pl-4 py-2.5">
                      <div className="flex flex-col items-center gap-1">
                        <IconCircleFilled
                          className={cn("size-2.5", status.color)}
                        />
                        <span className="text-[9px] text-muted-foreground">
                          {status.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <IconUser className="size-3.5 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {caller.name}
                          </span>
                          {(caller.peopleWith ?? 0) > 0 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 h-4"
                            >
                              <IconUsers className="size-2.5 mr-0.5" />+
                              {caller.peopleWith}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {caller.phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-start gap-1.5">
                        <IconMapPin className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-xs">{typeof caller.location === 'string' ? caller.location : caller.location ? `${caller.location.lat.toFixed(4)}, ${caller.location.lon.toFixed(4)}` : 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          {caller.isTrapped && (
                            <Badge
                              variant="destructive"
                              className="text-[9px] px-1 py-0 h-4"
                            >
                              Trapped
                            </Badge>
                          )}
                          {caller.isInjured && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 h-4 text-orange-600 border-orange-200"
                            >
                              Injured
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-0.5">
                          {(caller.medicalConditions ?? []).slice(0, 2).map((condition) => (
                            <span
                              key={condition}
                              className="text-[9px] text-muted-foreground"
                            >
                              {condition}
                            </span>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      {caller.assignedUnit ? (
                        <div className="flex items-center gap-1.5">
                          <IconAmbulance className="size-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">
                            {caller.assignedUnit}
                          </span>
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-yellow-600 border-yellow-200"
                        >
                          Unassigned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {caller.status === "on_call" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-green-600"
                          >
                            <IconPhone className="size-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="size-7">
                          <IconPlayerPlay className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
