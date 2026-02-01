"use client"

import { useState, useEffect } from "react"
import {
  IconAmbulance,
  IconBed,
  IconCircleFilled,
  IconClock,
  IconDroplet,
  IconLungs,
  IconChevronRight,
  IconLoader2,
  IconPhone,
  IconMapPin,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import type { IncomingPatient, Hospital, HospitalCapacity } from "@/types/api"

const severityStyles: Record<IncomingPatient["severity"], string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  moderate: "bg-yellow-500",
  low: "bg-green-500",
}

const statusColors: Record<string, string> = {
  accepting: "text-green-500",
  limited: "text-yellow-500",
  diverting: "text-orange-500",
  closed: "text-red-500",
}

/**
 * HospitalDashboard displays the main hospital overview
 * Fetches hospitals and capacity from real backend API
 */
export function HospitalDashboard() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("")
  const [capacity, setCapacity] = useState<HospitalCapacity | null>(null)
  const [incomingPatients, setIncomingPatients] = useState<IncomingPatient[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch hospitals list
  useEffect(() => {
    api.hospitals
      .list()
      .then((data) => {
        setHospitals(data)
        if (data.length > 0 && !selectedHospitalId) {
          setSelectedHospitalId(data[0].id)
        }
      })
      .catch((err) => {
        console.error("Failed to fetch hospitals:", err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  // Fetch capacity when hospital changes
  useEffect(() => {
    if (!selectedHospitalId) return

    api.hospitals
      .getCapacity(selectedHospitalId)
      .then(setCapacity)
      .catch((err) => {
        console.error("Failed to fetch hospital capacity:", err)
      })

    api.hospitals
      .getIncomingPatients()
      .then(setIncomingPatients)
      .catch((err) => {
        console.error("Failed to fetch incoming patients:", err)
      })
  }, [selectedHospitalId])

  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Get bed data from capacity
  const erBed = capacity?.beds.find((b) => b.id === "er")
  const icuBed = capacity?.beds.find((b) => b.id === "icu")
  const generalBed = capacity?.beds.find((b) => b.id === "general")
  const pediatricBed = capacity?.beds.find((b) => b.id === "pediatric")

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 max-w-4xl mx-auto w-full">

      {/* 1. STATUS HEADER - Hospital selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue placeholder="Select hospital" />
            </SelectTrigger>
            <SelectContent>
              {hospitals.map((hospital) => (
                <SelectItem key={hospital.id} value={hospital.id}>
                  <div className="flex items-center gap-2">
                    <IconCircleFilled className={cn("size-2", statusColors[hospital.status])} />
                    {hospital.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedHospital && (
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <IconMapPin className="size-3" />
                {selectedHospital.coordinates ? `${selectedHospital.coordinates.lat.toFixed(4)}, ${selectedHospital.coordinates.lon.toFixed(4)}` : "Unknown"}
              </span>
              <span className="capitalize flex items-center gap-1">
                <IconCircleFilled className={cn("size-2", statusColors[selectedHospital.status])} />
                {selectedHospital.status}
              </span>
            </div>
          )}
        </div>
        <Badge
          variant={selectedHospital?.status === "accepting" ? "default" : "destructive"}
          className="text-sm px-3 py-1"
        >
          {capacity ? `${capacity.totalOccupancy}% Occupied` : "Loading..."}
        </Badge>
      </div>

      {/* 2. KEY METRICS - Quick glance at capacity */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          icon={IconBed}
          label="ER Beds"
          value={erBed ? String(erBed.available) : "-"}
          subtext={erBed ? `of ${erBed.total} available` : "loading"}
          alert={erBed ? erBed.available < erBed.total * 0.2 : false}
        />
        <MetricCard
          icon={IconLungs}
          label="ICU"
          value={icuBed ? String(icuBed.available) : "-"}
          subtext={icuBed ? `of ${icuBed.total} available` : "loading"}
          alert={icuBed ? icuBed.available < icuBed.total * 0.2 : false}
        />
        <MetricCard
          icon={IconBed}
          label="General"
          value={generalBed ? String(generalBed.available) : "-"}
          subtext={generalBed ? `of ${generalBed.total} available` : "loading"}
          alert={generalBed ? generalBed.available < generalBed.total * 0.2 : false}
        />
        <MetricCard
          icon={IconBed}
          label="Pediatric"
          value={pediatricBed ? String(pediatricBed.available) : "-"}
          subtext={pediatricBed ? `of ${pediatricBed.total} available` : "loading"}
          alert={pediatricBed ? pediatricBed.available < pediatricBed.total * 0.2 : false}
        />
      </div>

      {/* 3. INCOMING PATIENTS - Primary focus */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">Incoming Patients</h2>
              <Badge variant="secondary">{incomingPatients.length} en route</Badge>
            </div>
          </div>

          <div className="divide-y">
            {incomingPatients.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                {/* ETA - Most important */}
                <div className="text-center min-w-16">
                  <div className="text-2xl font-bold">{patient.eta}</div>
                  <div className="text-xs text-muted-foreground">min</div>
                </div>

                {/* Severity indicator */}
                <div className={cn("w-1 h-12 rounded-full", severityStyles[patient.severity as keyof typeof severityStyles])} />

                {/* Patient info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{patient.condition}</span>
                    <Badge variant="outline" className="text-xs">
                      {patient.needs}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <IconAmbulance className="size-3.5" />
                    <span>{patient.unit}</span>
                  </div>
                </div>

                {/* Action */}
                <Button variant="ghost" size="icon">
                  <IconChevronRight className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          {incomingPatients.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No incoming patients
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. QUICK ACTIONS */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm">Request Blood</Button>
        <Button variant="outline" size="sm">Request Staff</Button>
        <Button variant="outline" size="sm">View Network</Button>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  alert = false,
}: {
  icon: typeof IconBed
  label: string
  value: string
  subtext: string
  alert?: boolean
}) {
  return (
    <Card className={cn(alert && "border-orange-200 dark:border-orange-900")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Icon className="size-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={cn("text-2xl font-bold", alert && "text-orange-600")}>{value}</span>
          <span className="text-xs text-muted-foreground">{subtext}</span>
        </div>
      </CardContent>
    </Card>
  )
}
