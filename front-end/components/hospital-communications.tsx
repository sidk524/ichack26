"use client"

import {
  IconRadio,
  IconPhone,
  IconMessage,
  IconBroadcast,
  IconCircleFilled,
  IconVolume,
  IconMicrophone,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CommunicationChannel } from "@/types/api"

// Mock data
const mockChannels: CommunicationChannel[] = [
  {
    id: "CH-001",
    name: "EMS Dispatch",
    type: "radio",
    status: "active",
    frequency: "155.340 MHz",
    lastActivity: "2m ago",
  },
  {
    id: "CH-002",
    name: "Hospital Ops",
    type: "radio",
    status: "active",
    frequency: "155.280 MHz",
    lastActivity: "5m ago",
  },
  {
    id: "CH-003",
    name: "Fire/Rescue",
    type: "radio",
    status: "standby",
    frequency: "154.280 MHz",
    lastActivity: "12m ago",
  },
  {
    id: "CH-004",
    name: "Regional Coord",
    type: "digital",
    status: "active",
    lastActivity: "1m ago",
  },
  {
    id: "CH-005",
    name: "Trauma Alert",
    type: "phone",
    status: "standby",
    lastActivity: "45m ago",
  },
]

const statusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
  active: { label: "Active", color: "text-green-600", dotColor: "bg-green-500" },
  standby: { label: "Standby", color: "text-yellow-600", dotColor: "bg-yellow-500" },
  offline: { label: "Offline", color: "text-red-600", dotColor: "bg-red-500" },
}

const typeIcons: Record<string, typeof IconRadio> = {
  radio: IconRadio,
  phone: IconPhone,
  digital: IconMessage,
}

interface HospitalCommunicationsProps {
  className?: string
}

export function HospitalCommunications({ className }: HospitalCommunicationsProps) {
  const activeCount = mockChannels.filter((c) => c.status === "active").length

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Communications</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {activeCount} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5">
            <IconBroadcast className="size-3.5" />
            Broadcast
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1.5">
            <IconMicrophone className="size-3.5" />
            PTT
          </Button>
        </div>

        {/* Channel List */}
        <div className="space-y-2">
          {mockChannels.map((channel) => {
            const status = statusConfig[channel.status]
            const TypeIcon = typeIcons[channel.type] || IconRadio

            return (
              <div
                key={channel.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted/50",
                  channel.status === "active" && "border-green-200 bg-green-50/30"
                )}
              >
                <div className={cn(
                  "size-8 rounded-full flex items-center justify-center shrink-0",
                  channel.status === "active" ? "bg-green-100" : "bg-muted"
                )}>
                  <TypeIcon className={cn(
                    "size-4",
                    channel.status === "active" ? "text-green-600" : "text-muted-foreground"
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{channel.name}</span>
                    {channel.status === "active" && (
                      <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {channel.frequency && <span>{channel.frequency}</span>}
                    <span>{channel.lastActivity}</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-7 shrink-0",
                    channel.status === "active" && "text-green-600"
                  )}
                >
                  <IconVolume className="size-4" />
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
