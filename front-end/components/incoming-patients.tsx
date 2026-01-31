"use client"

import {
  IconAmbulance,
  IconClock,
  IconAlertTriangle,
  IconUser,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
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

interface IncomingPatient {
  id: string
  unitId: string
  unitType: string
  patientCount: number
  severity: 1 | 2 | 3 | 4 | 5
  eta: number // minutes
  condition: string
  incidentId: string
  needs: string[]
}

const mockIncomingPatients: IncomingPatient[] = [
  {
    id: "IP-001",
    unitId: "Medic 7",
    unitType: "Ambulance",
    patientCount: 1,
    severity: 5,
    eta: 3,
    condition: "Trauma - crush injury",
    incidentId: "INC-003",
    needs: ["Surgery", "Blood O-"],
  },
  {
    id: "IP-002",
    unitId: "Medic 12",
    unitType: "Ambulance",
    patientCount: 2,
    severity: 4,
    eta: 7,
    condition: "Smoke inhalation",
    incidentId: "INC-001",
    needs: ["Respiratory", "ICU"],
  },
  {
    id: "IP-003",
    unitId: "Rescue 3",
    unitType: "Rescue",
    patientCount: 1,
    severity: 4,
    eta: 12,
    condition: "Multiple fractures",
    incidentId: "INC-006",
    needs: ["Orthopedic", "X-ray"],
  },
  {
    id: "IP-004",
    unitId: "Medic 4",
    unitType: "Ambulance",
    patientCount: 1,
    severity: 3,
    eta: 18,
    condition: "Lacerations, stable",
    incidentId: "INC-008",
    needs: ["Sutures"],
  },
]

const severityConfig: Record<number, { label: string; color: string }> = {
  1: { label: "Low", color: "text-green-500 bg-green-500/10" },
  2: { label: "Minor", color: "text-lime-500 bg-lime-500/10" },
  3: { label: "Moderate", color: "text-yellow-500 bg-yellow-500/10" },
  4: { label: "High", color: "text-orange-500 bg-orange-500/10" },
  5: { label: "Critical", color: "text-red-500 bg-red-500/10" },
}

interface IncomingPatientsProps {
  className?: string
}

export function IncomingPatients({ className }: IncomingPatientsProps) {
  const totalIncoming = mockIncomingPatients.reduce((sum, p) => sum + p.patientCount, 0)
  const criticalCount = mockIncomingPatients.filter((p) => p.severity >= 4).length

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-none pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Incoming Patients</CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-mono">
              {totalIncoming} patients
            </Badge>
            {criticalCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {criticalCount} critical
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0">
              <TableRow>
                <TableHead className="w-20 pl-4 text-xs">ETA</TableHead>
                <TableHead className="w-24 text-xs">Unit</TableHead>
                <TableHead className="text-xs">Condition</TableHead>
                <TableHead className="w-20 text-xs">Severity</TableHead>
                <TableHead className="pr-4 text-xs">Needs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockIncomingPatients.map((patient) => {
                const severity = severityConfig[patient.severity]
                return (
                  <TableRow
                    key={patient.id}
                    className={cn(
                      patient.severity >= 4 && "bg-destructive/5"
                    )}
                  >
                    <TableCell className="pl-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <IconClock className="size-3.5 text-muted-foreground" />
                        <span className="font-mono text-sm font-semibold">
                          {patient.eta}m
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5">
                        <IconAmbulance className="size-3.5 text-muted-foreground" />
                        <span className="text-sm">{patient.unitId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <IconUser className="size-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {patient.patientCount} patient{patient.patientCount > 1 ? "s" : ""}
                          </span>
                        </div>
                        <span className="text-sm font-medium">{patient.condition}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", severity.color)}
                      >
                        {severity.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {patient.needs.map((need) => (
                          <Badge
                            key={need}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {need}
                          </Badge>
                        ))}
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
