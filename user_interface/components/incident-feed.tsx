"use client"

import { useState, useEffect } from "react"
import {
  IconFlame,
  IconHeartbeat,
  IconAlertTriangle,
  IconDroplet,
  IconCar,
  IconCircleDot,
  IconCircleFilled,
  IconDotsVertical,
  IconPhone,
  IconMapPin,
  IconUsers,
  IconClock,
  IconTrendingUp,
  IconLoader2,
} from "@tabler/icons-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import type {
  IncidentType,
  IncidentStatus,
  SeverityLevel,
  Incident as ApiIncident,
} from "@/types/api"

// Local display type (maps API incident to component needs)
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

// Transform API incident to local display format
function toDisplayIncident(incident: ApiIncident): Incident {
  return {
    id: incident.id,
    type: incident.type,
    location: incident.location,
    severity: incident.severity,
    status: incident.status,
    reportedAt: incident.reportedAt,
    assignedUnits: incident.assignedUnits.length,
    description: incident.description,
  }
}

// UI configuration for incident types
const incidentTypeConfig: Record<IncidentType, { icon: typeof IconFlame; label: string; color: string }> = {
  fire: { icon: IconFlame, label: "Fire", color: "text-orange-500" },
  medical: { icon: IconHeartbeat, label: "Medical", color: "text-red-500" },
  rescue: { icon: IconAlertTriangle, label: "Rescue", color: "text-yellow-500" },
  flood: { icon: IconDroplet, label: "Flood", color: "text-blue-500" },
  accident: { icon: IconCar, label: "Accident", color: "text-purple-500" },
  other: { icon: IconCircleDot, label: "Other", color: "text-gray-500" },
}

// UI configuration for incident statuses
const statusConfig: Record<IncidentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "New", variant: "destructive" },
  dispatched: { label: "Dispatched", variant: "default" },
  in_progress: { label: "In Progress", variant: "secondary" },
  resolved: { label: "Resolved", variant: "outline" },
}

// UI configuration for severity levels
const severityConfig: Record<SeverityLevel, { color: string; bgColor: string; label: string }> = {
  1: { color: "text-green-500", bgColor: "bg-green-500", label: "Low" },
  2: { color: "text-lime-500", bgColor: "bg-lime-500", label: "Minor" },
  3: { color: "text-yellow-500", bgColor: "bg-yellow-500", label: "Moderate" },
  4: { color: "text-orange-500", bgColor: "bg-orange-500", label: "High" },
  5: { color: "text-red-500", bgColor: "bg-red-500", label: "Critical" },
}

const chartData = [
  { time: "00:00", incidents: 2, resolved: 1 },
  { time: "04:00", incidents: 3, resolved: 2 },
  { time: "08:00", incidents: 8, resolved: 4 },
  { time: "12:00", incidents: 12, resolved: 6 },
  { time: "16:00", incidents: 10, resolved: 8 },
  { time: "20:00", incidents: 6, resolved: 5 },
]

const chartConfig = {
  incidents: {
    label: "New Incidents",
    color: "var(--destructive)",
  },
  resolved: {
    label: "Resolved",
    color: "var(--primary)",
  },
} satisfies ChartConfig

function IncidentDetailDrawer({ incident }: { incident: Incident }) {
  const isMobile = useIsMobile()
  const typeConfig = incidentTypeConfig[incident.type]
  const TypeIcon = typeConfig.icon
  const severity = severityConfig[incident.severity]

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left h-auto py-0">
          <span className="font-medium text-xs truncate">
            {incident.location}
          </span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <div className="flex items-center gap-2">
            <TypeIcon className={cn("size-5", typeConfig.color)} />
            <DrawerTitle>{incident.id}: {typeConfig.label}</DrawerTitle>
          </div>
          <DrawerDescription>
            {incident.location} - {incident.description}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <ChartContainer config={chartConfig}>
                <AreaChart
                  accessibilityLayer
                  data={chartData}
                  margin={{
                    left: 0,
                    right: 10,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 5)}
                    hide
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="resolved"
                    type="natural"
                    fill="var(--color-resolved)"
                    fillOpacity={0.6}
                    stroke="var(--color-resolved)"
                    stackId="a"
                  />
                  <Area
                    dataKey="incidents"
                    type="natural"
                    fill="var(--color-incidents)"
                    fillOpacity={0.4}
                    stroke="var(--color-incidents)"
                    stackId="a"
                  />
                </AreaChart>
              </ChartContainer>
              <Separator />
              <div className="grid gap-2">
                <div className="flex gap-2 leading-none font-medium">
                  Incident activity for today{" "}
                  <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  This area has seen increased incident activity. {incident.assignedUnits} units
                  currently assigned to this incident.
                </div>
              </div>
              <Separator />
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <IconMapPin className="size-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium text-sm">{incident.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <IconUsers className="size-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Units Assigned</p>
                <p className="font-medium text-sm">{incident.assignedUnits}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <IconClock className="size-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Reported</p>
                <p className="font-medium text-sm">{incident.reportedAt} ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <IconCircleFilled className={cn("size-5", severity.color)} />
              <div>
                <p className="text-xs text-muted-foreground">Severity</p>
                <p className="font-medium text-sm">{severity.label} (Level {incident.severity})</p>
              </div>
            </div>
          </div>
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="description">Description</Label>
              <Input id="description" defaultValue={incident.description} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="type">Incident Type</Label>
                <Select defaultValue={incident.type}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fire">Fire</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="rescue">Rescue</SelectItem>
                    <SelectItem value="flood">Flood</SelectItem>
                    <SelectItem value="accident">Accident</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue={incident.status}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="severity">Severity Level</Label>
                <Select defaultValue={incident.severity.toString()}>
                  <SelectTrigger id="severity" className="w-full">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Low</SelectItem>
                    <SelectItem value="2">2 - Minor</SelectItem>
                    <SelectItem value="3">3 - Moderate</SelectItem>
                    <SelectItem value="4">4 - High</SelectItem>
                    <SelectItem value="5">5 - Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="units">Assigned Units</Label>
                <Input id="units" type="number" defaultValue={incident.assignedUnits} />
              </div>
            </div>
          </form>
        </div>
        <DrawerFooter>
          <Button>Update Incident</Button>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function IncidentRow({ incident }: { incident: Incident }) {
  const typeConfig = incidentTypeConfig[incident.type]
  const TypeIcon = typeConfig.icon
  const status = statusConfig[incident.status]
  const severity = severityConfig[incident.severity]

  return (
    <TableRow
      className={cn(
        "transition-colors",
        incident.status === "new" && "bg-destructive/5 hover:bg-destructive/10"
      )}
    >
      <TableCell className="pl-4 pr-2 py-2.5">
        <div className="flex items-center gap-1.5">
          <IconCircleFilled className={cn("size-2.5 shrink-0", severity.color)} />
          <span className="font-mono text-xs font-semibold tabular-nums">{incident.severity}</span>
        </div>
      </TableCell>
      <TableCell className="px-2 py-2.5">
        <div className="flex items-center gap-1.5">
          <TypeIcon className={cn("size-3.5 shrink-0", typeConfig.color)} />
          <span className="text-xs font-medium">{typeConfig.label}</span>
        </div>
      </TableCell>
      <TableCell className="px-2 py-2.5">
        <div className="flex flex-col gap-0.5 min-w-0">
          <IncidentDetailDrawer incident={incident} />
          <span className="text-muted-foreground text-[10px] truncate leading-tight">
            {incident.description}
          </span>
        </div>
      </TableCell>
      <TableCell className="px-2 py-2.5">
        <Badge variant={status.variant} className="text-[10px] font-medium px-1.5 py-0.5">
          {status.label}
        </Badge>
      </TableCell>
      <TableCell className="px-2 py-2.5 text-center">
        <span className="text-xs font-medium tabular-nums">{incident.assignedUnits}</span>
      </TableCell>
      <TableCell className="pl-2 pr-2 py-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-7"
              size="icon"
            >
              <IconDotsVertical className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem>
              <IconMapPin className="size-4 mr-2" />
              View on Map
            </DropdownMenuItem>
            <DropdownMenuItem>
              <IconUsers className="size-4 mr-2" />
              Dispatch Units
            </DropdownMenuItem>
            <DropdownMenuItem>
              <IconPhone className="size-4 mr-2" />
              Contact Reporter
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              Mark Resolved
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

function IncidentTable({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="h-full overflow-y-auto">
      <Table>
        <TableHeader className="bg-muted/50 sticky top-0 z-10">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12 pl-4 pr-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sev</TableHead>
            <TableHead className="w-20 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Type</TableHead>
            <TableHead className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Location</TableHead>
            <TableHead className="w-24 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
            <TableHead className="w-12 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Units</TableHead>
            <TableHead className="w-10 pl-2 pr-2 py-2"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.length > 0 ? (
            incidents.map((incident) => (
              <IncidentRow key={incident.id} incident={incident} />
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No incidents found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

interface IncidentFeedProps {
  className?: string
}

/**
 * IncidentFeed component displays a live feed of emergency incidents
 * Fetches data from api.incidents.list()
 */
export function IncidentFeed({ className }: IncidentFeedProps) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.incidents
      .list()
      .then((data) => {
        setIncidents(data.map(toDisplayIncident))
        setError(null)
      })
      .catch((err) => {
        console.error("Failed to fetch incidents:", err)
        setError("Failed to load incidents")
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const newIncidents = incidents.filter(i => i.status === "new")
  const dispatchedIncidents = incidents.filter(i => i.status === "dispatched")
  const inProgressIncidents = incidents.filter(i => i.status === "in_progress")
  const criticalIncidents = incidents.filter(i => i.severity >= 4)

  if (isLoading) {
    return (
      <Card className={cn("flex flex-col items-center justify-center", className)}>
        <CardContent className="flex flex-col items-center gap-2 py-8">
          <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading incidents...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("flex flex-col items-center justify-center", className)}>
        <CardContent className="flex flex-col items-center gap-2 py-8">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-none border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-tight">Live Incidents</CardTitle>
          {newIncidents.length > 0 && (
            <Badge variant="destructive" className="animate-pulse text-[10px]">
              {newIncidents.length} New
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <Tabs defaultValue="all" className="flex flex-col h-full">
          <div className="border-b px-4 py-2">
            <TabsList className="h-8 w-full justify-start gap-1 bg-transparent p-0">
              <TabsTrigger value="all" className="h-7 text-xs px-2.5 data-[state=active]:bg-muted">
                All
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  {incidents.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="critical" className="h-7 text-xs px-2.5 data-[state=active]:bg-muted">
                Critical
                <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">
                  {criticalIncidents.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="new" className="h-7 text-xs px-2.5 data-[state=active]:bg-muted">
                New
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  {newIncidents.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="active" className="h-7 text-xs px-2.5 data-[state=active]:bg-muted">
                Active
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  {dispatchedIncidents.length + inProgressIncidents.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="all" className="flex-1 overflow-hidden m-0">
            <IncidentTable incidents={incidents} />
          </TabsContent>
          <TabsContent value="critical" className="flex-1 overflow-hidden m-0">
            <IncidentTable incidents={criticalIncidents} />
          </TabsContent>
          <TabsContent value="new" className="flex-1 overflow-hidden m-0">
            <IncidentTable incidents={newIncidents} />
          </TabsContent>
          <TabsContent value="active" className="flex-1 overflow-hidden m-0">
            <IncidentTable incidents={[...dispatchedIncidents, ...inProgressIncidents]} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
