"use client"

import {
  IconAmbulance,
  IconBed,
  IconCircleFilled,
  IconClock,
  IconDroplet,
  IconLungs,
  IconUser,
  IconChevronRight,
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
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// Simplified incoming patient data
const incomingPatients = [
  { id: 1, unit: "Medic 7", eta: 3, severity: "critical", condition: "Crush injury", needs: "Surgery" },
  { id: 2, unit: "Medic 12", eta: 7, severity: "high", condition: "Smoke inhalation", needs: "ICU" },
  { id: 3, unit: "Rescue 3", eta: 12, severity: "high", condition: "Multiple fractures", needs: "Ortho" },
  { id: 4, unit: "Medic 4", eta: 18, severity: "moderate", condition: "Lacerations", needs: "ER" },
]

const severityStyles = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  moderate: "bg-yellow-500",
  low: "bg-green-500",
}

export function HospitalDashboard() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 max-w-4xl mx-auto w-full">

      {/* 1. STATUS HEADER - Most important, always visible */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Central Hospital</h1>
          <p className="text-muted-foreground text-sm">Trauma Center Level 1</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select defaultValue="accepting">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="accepting">
                <div className="flex items-center gap-2">
                  <IconCircleFilled className="size-2 text-green-500" />
                  Accepting
                </div>
              </SelectItem>
              <SelectItem value="limited">
                <div className="flex items-center gap-2">
                  <IconCircleFilled className="size-2 text-yellow-500" />
                  Limited
                </div>
              </SelectItem>
              <SelectItem value="diverting">
                <div className="flex items-center gap-2">
                  <IconCircleFilled className="size-2 text-red-500" />
                  Diverting
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2. KEY METRICS - Quick glance at capacity */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          icon={IconBed}
          label="ER Beds"
          value="8"
          subtext="of 40 available"
          alert={true}
        />
        <MetricCard
          icon={IconLungs}
          label="ICU"
          value="2"
          subtext="of 24 available"
          alert={true}
        />
        <MetricCard
          icon={IconDroplet}
          label="Blood O-"
          value="8"
          subtext="units"
          alert={true}
        />
        <MetricCard
          icon={IconClock}
          label="ER Wait"
          value="12m"
          subtext="average"
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
