"use client"

import {
  IconFlame,
  IconHeartbeat,
  IconAlertTriangle,
  IconDroplet,
  IconCar,
  IconCircleDot,
  IconCircleFilled,
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

type IncidentType = "fire" | "medical" | "rescue" | "flood" | "accident" | "other"
type IncidentStatus = "new" | "dispatched" | "in_progress" | "resolved"
type SeverityLevel = 1 | 2 | 3 | 4 | 5

interface Incident {
  id: string
  type: IncidentType
  location: string
  severity: SeverityLevel
  status: IncidentStatus
  reportedAt: string
  assignedUnits: number
  description: string
}

const incidentTypeConfig: Record<IncidentType, { icon: typeof IconFlame; label: string; color: string }> = {
  fire: { icon: IconFlame, label: "Fire", color: "text-orange-500" },
  medical: { icon: IconHeartbeat, label: "Medical", color: "text-red-500" },
  rescue: { icon: IconAlertTriangle, label: "Rescue", color: "text-yellow-500" },
  flood: { icon: IconDroplet, label: "Flood", color: "text-blue-500" },
  accident: { icon: IconCar, label: "Accident", color: "text-purple-500" },
  other: { icon: IconCircleDot, label: "Other", color: "text-gray-500" },
}

const statusConfig: Record<IncidentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "New", variant: "destructive" },
  dispatched: { label: "Dispatched", variant: "default" },
  in_progress: { label: "In Progress", variant: "secondary" },
  resolved: { label: "Resolved", variant: "outline" },
}

const severityConfig: Record<SeverityLevel, { color: string; bgColor: string }> = {
  1: { color: "text-green-500", bgColor: "bg-green-500" },
  2: { color: "text-lime-500", bgColor: "bg-lime-500" },
  3: { color: "text-yellow-500", bgColor: "bg-yellow-500" },
  4: { color: "text-orange-500", bgColor: "bg-orange-500" },
  5: { color: "text-red-500", bgColor: "bg-red-500" },
}

// Mock data - 2023 Turkey Earthquake (Feb 6, 2023)
// Turkey only - sorted by severity then time
const mockIncidents: Incident[] = [
  {
    id: "INC-001",
    type: "rescue",
    location: "Antakya, Hatay",
    severity: 5,
    status: "new",
    reportedAt: "2m",
    assignedUnits: 0,
    description: "300+ trapped in collapsed apartments",
  },
  {
    id: "INC-002",
    type: "rescue",
    location: "Kahramanmaraş",
    severity: 5,
    status: "dispatched",
    reportedAt: "4m",
    assignedUnits: 4,
    description: "Hospital collapse, staff trapped",
  },
  {
    id: "INC-003",
    type: "rescue",
    location: "Pazarcık",
    severity: 5,
    status: "in_progress",
    reportedAt: "6m",
    assignedUnits: 6,
    description: "Near epicenter, 200 trapped",
  },
  {
    id: "INC-004",
    type: "rescue",
    location: "Elbistan",
    severity: 5,
    status: "new",
    reportedAt: "8m",
    assignedUnits: 0,
    description: "Second epicenter, school collapsed",
  },
  {
    id: "INC-005",
    type: "medical",
    location: "Defne, Hatay",
    severity: 5,
    status: "dispatched",
    reportedAt: "10m",
    assignedUnits: 3,
    description: "Mass casualties, 220+ injured",
  },
  {
    id: "INC-006",
    type: "rescue",
    location: "Gaziantep",
    severity: 4,
    status: "in_progress",
    reportedAt: "15m",
    assignedUnits: 5,
    description: "Multi-story residential collapse",
  },
  {
    id: "INC-007",
    type: "rescue",
    location: "Iskenderun",
    severity: 4,
    status: "dispatched",
    reportedAt: "18m",
    assignedUnits: 4,
    description: "Port area buildings down",
  },
  {
    id: "INC-008",
    type: "rescue",
    location: "Adıyaman",
    severity: 4,
    status: "in_progress",
    reportedAt: "20m",
    assignedUnits: 5,
    description: "170 trapped in rubble",
  },
  {
    id: "INC-009",
    type: "medical",
    location: "Malatya",
    severity: 4,
    status: "dispatched",
    reportedAt: "25m",
    assignedUnits: 2,
    description: "Field hospital overwhelmed",
  },
  {
    id: "INC-010",
    type: "rescue",
    location: "Nurdağı",
    severity: 4,
    status: "new",
    reportedAt: "28m",
    assignedUnits: 0,
    description: "Town center devastated",
  },
  {
    id: "INC-011",
    type: "rescue",
    location: "Onikişubat",
    severity: 4,
    status: "in_progress",
    reportedAt: "32m",
    assignedUnits: 3,
    description: "Dense urban rubble clearing",
  },
  {
    id: "INC-012",
    type: "rescue",
    location: "Samandağ",
    severity: 3,
    status: "dispatched",
    reportedAt: "38m",
    assignedUnits: 2,
    description: "Coastal town damage",
  },
  {
    id: "INC-013",
    type: "rescue",
    location: "Gölbaşı",
    severity: 3,
    status: "in_progress",
    reportedAt: "42m",
    assignedUnits: 2,
    description: "80 reported trapped",
  },
  {
    id: "INC-014",
    type: "medical",
    location: "Doğanşehir",
    severity: 3,
    status: "dispatched",
    reportedAt: "48m",
    assignedUnits: 1,
    description: "Medical supplies needed",
  },
  {
    id: "INC-015",
    type: "rescue",
    location: "Diyarbakır",
    severity: 2,
    status: "in_progress",
    reportedAt: "55m",
    assignedUnits: 2,
    description: "Moderate building damage",
  },
  {
    id: "INC-016",
    type: "medical",
    location: "Şanlıurfa",
    severity: 2,
    status: "dispatched",
    reportedAt: "1h",
    assignedUnits: 1,
    description: "Minor injuries reported",
  },
]

interface IncidentFeedProps {
  incidents?: Incident[]
  className?: string
}

export function IncidentFeed({ incidents = mockIncidents, className }: IncidentFeedProps) {
  const newCount = incidents.filter(i => i.status === "new").length

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-none border-b px-5 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-tight">Live Incidents</CardTitle>
          {newCount > 0 && (
            <Badge variant="destructive" className="animate-pulse text-[10px]">
              {newCount} New
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-13 pl-5 pr-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sev</TableHead>
                <TableHead className="w-22 px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</TableHead>
                <TableHead className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Location</TableHead>
                <TableHead className="w-25 px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="w-14 pr-5 pl-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident) => {
                const typeConfig = incidentTypeConfig[incident.type]
                const TypeIcon = typeConfig.icon
                const status = statusConfig[incident.status]
                const severity = severityConfig[incident.severity]

                return (
                  <TableRow
                    key={incident.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      incident.status === "new" && "bg-destructive/5 hover:bg-destructive/10"
                    )}
                  >
                    <TableCell className="pl-5 pr-2 py-3">
                      <div className="flex items-center gap-2">
                        <IconCircleFilled className={cn("size-2.5 shrink-0", severity.color)} />
                        <span className="font-mono text-xs font-semibold tabular-nums">{incident.severity}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <TypeIcon className={cn("size-4 shrink-0", typeConfig.color)} />
                        <span className="text-xs font-medium">{typeConfig.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-medium text-xs truncate">
                          {incident.location}
                        </span>
                        <span className="text-muted-foreground text-[11px] truncate leading-tight">
                          {incident.description}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <Badge variant={status.variant} className="text-[10px] font-medium px-2 py-0.5">
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-5 pl-2 py-3 text-right">
                      <span className="text-muted-foreground text-xs tabular-nums">{incident.reportedAt}</span>
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
