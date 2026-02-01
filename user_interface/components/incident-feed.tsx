"use client"

import { useState, useEffect, useCallback } from "react"
import {
  IconFlame,
  IconHeartbeat,
  IconAlertTriangle,
  IconDroplet,
  IconCar,
  IconCircleDot,
  IconCircleFilled,
  IconDotsVertical,
  IconExternalLink,
  IconMapPin,
  IconNews,
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
import { backendApi } from "@/lib/backend-api"
import { useDashboardUpdates, type NewNewsEvent, type NewCallEvent } from "@/hooks/use-dashboard-updates"
import type { BackendNewsArticle } from "@/types/backend"
import type {
  IncidentType,
  IncidentStatus,
  SeverityLevel,
} from "@/types/api"

// Local display type for news-based incidents
interface Incident {
  id: string
  type: IncidentType
  location: string
  severity: SeverityLevel
  status: IncidentStatus
  reportedAt: string
  title: string
  link: string
  isDisaster: boolean
}

// Infer incident type from news title
function inferTypeFromTitle(title: string): IncidentType {
  const t = title.toLowerCase()
  if (t.includes("fire") || t.includes("blaze") || t.includes("burn")) return "fire"
  if (t.includes("flood") || t.includes("water") || t.includes("rain")) return "flood"
  if (t.includes("earthquake") || t.includes("collapse") || t.includes("rescue") || t.includes("trapped")) return "rescue"
  if (t.includes("crash") || t.includes("accident") || t.includes("collision")) return "accident"
  if (t.includes("medical") || t.includes("hospital") || t.includes("injury") || t.includes("injured")) return "medical"
  return "other"
}

// Infer severity from title keywords
function inferSeverity(title: string, isDisaster: boolean): SeverityLevel {
  const t = title.toLowerCase()
  if (t.includes("major") || t.includes("massive") || t.includes("devastating") || t.includes("magnitude")) return 5
  if (t.includes("severe") || t.includes("serious") || t.includes("multiple") || t.includes("dead")) return 4
  if (isDisaster) return 4
  if (t.includes("minor") || t.includes("small")) return 2
  return 3
}

// Format time ago from timestamp
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp)
  if (seconds < 60) return "Just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Transform news article to incident display format
function newsToIncident(article: BackendNewsArticle): Incident {
  const type = inferTypeFromTitle(article.title)
  const severity = inferSeverity(article.title, article.disaster)

  return {
    id: article.article_id,
    type,
    location: article.location_name || "Unknown Location",
    severity,
    status: article.disaster ? "new" : "dispatched",
    reportedAt: formatTimeAgo(article.received_at),
    title: article.title,
    link: article.link,
    isDisaster: article.disaster,
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
            <DrawerTitle>{typeConfig.label} Incident</DrawerTitle>
          </div>
          <DrawerDescription>
            {incident.title}
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
                  This incident was reported {incident.reportedAt}.
                  {incident.isDisaster && " Marked as disaster-related."}
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
              <IconNews className="size-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Source</p>
                <p className="font-medium text-sm">News Report</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <IconClock className="size-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Reported</p>
                <p className="font-medium text-sm">{incident.reportedAt}</p>
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
          {incident.link && (
            <a
              href={incident.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <IconExternalLink className="size-4" />
              View Original Article
            </a>
          )}
        </div>
        <DrawerFooter>
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
        incident.isDisaster && "bg-destructive/5 hover:bg-destructive/10"
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
          <span className="text-muted-foreground text-[10px] truncate leading-tight max-w-[200px]">
            {incident.title}
          </span>
        </div>
      </TableCell>
      <TableCell className="px-2 py-2.5">
        <span className="text-xs text-muted-foreground">{incident.reportedAt}</span>
      </TableCell>
      <TableCell className="px-2 py-2.5">
        {incident.isDisaster ? (
          <Badge variant="destructive" className="text-[10px] font-medium px-1.5 py-0.5">
            Disaster
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0.5">
            News
          </Badge>
        )}
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
            {incident.link && (
              <DropdownMenuItem asChild>
                <a href={incident.link} target="_blank" rel="noopener noreferrer">
                  <IconExternalLink className="size-4 mr-2" />
                  View Source
                </a>
              </DropdownMenuItem>
            )}
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
            <TableHead className="w-20 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Time</TableHead>
            <TableHead className="w-16 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tag</TableHead>
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
 * IncidentFeed component displays a live feed of news-based incidents
 * Uses WebSocket for real-time updates + REST API for initial load
 */
export function IncidentFeed({ className }: IncidentFeedProps) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIncidents = useCallback(async () => {
    try {
      const response = await backendApi.news.list()
      if (response.ok && response.news) {
        const transformed = response.news.map(newsToIncident)
        // Sort by most recent first
        transformed.sort((a, b) => {
          // Parse the reportedAt string to compare
          const aRecent = a.reportedAt.includes("Just") || a.reportedAt.includes("m ago")
          const bRecent = b.reportedAt.includes("Just") || b.reportedAt.includes("m ago")
          if (aRecent && !bRecent) return -1
          if (!aRecent && bRecent) return 1
          return 0
        })
        setIncidents(transformed)
        setError(null)
      }
    } catch (err) {
      console.error("Failed to fetch incidents:", err)
      setError("Failed to load incidents")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle real-time news updates via WebSocket
  const handleNewNews = useCallback((event: NewNewsEvent) => {
    const article = event.article
    const newIncident = newsToIncident({
      article_id: article.article_id,
      title: article.title,
      link: article.link,
      pub_date: article.pub_date,
      disaster: article.disaster,
      location_name: article.location_name,
      lat: article.lat,
      lon: article.lon,
      received_at: article.received_at,
    })

    // Add to front of list (most recent first)
    setIncidents(prev => [newIncident, ...prev])
  }, [])

  // Handle real-time call updates - convert calls to incidents too
  const handleNewCall = useCallback((event: NewCallEvent) => {
    const call = event.call
    const type = inferTypeFromTitle(call.transcript)
    const severity = inferSeverity(call.transcript, true)

    const newIncident: Incident = {
      id: `call_${call.call_id}`,
      type,
      location: "Location from call",
      severity,
      status: "new",
      reportedAt: "Just now",
      title: call.transcript.slice(0, 100) + (call.transcript.length > 100 ? "..." : ""),
      link: "",
      isDisaster: true,
    }

    // Add to front of list
    setIncidents(prev => [newIncident, ...prev])
  }, [])

  // Connect to real-time updates
  const { isConnected } = useDashboardUpdates({
    onNewNews: handleNewNews,
    onNewCall: handleNewCall,
  })

  useEffect(() => {
    fetchIncidents()
    // Poll for updates every 30 seconds as fallback (WebSocket is primary)
    const interval = setInterval(fetchIncidents, 30000)
    return () => clearInterval(interval)
  }, [fetchIncidents])

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
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold tracking-tight">Live Incidents</CardTitle>
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"
            )} title={isConnected ? "Real-time connected" : "Connecting..."} />
          </div>
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
