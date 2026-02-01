"use client"

import {
  IconCircleFilled,
  IconUsers,
  IconClock,
  IconActivityHeartbeat,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Status = "accepting" | "limited" | "diverting" | "closed"

interface HospitalStatusProps {
  className?: string
}

const statusOptions: { value: Status; label: string; color: string; description: string }[] = [
  { value: "accepting", label: "Accepting", color: "text-green-500", description: "Normal operations" },
  { value: "limited", label: "Limited", color: "text-yellow-500", description: "Selective admissions" },
  { value: "diverting", label: "Diverting", color: "text-orange-500", description: "Redirect non-critical" },
  { value: "closed", label: "Closed", color: "text-red-500", description: "Emergency only" },
]

export function HospitalStatus({ className }: HospitalStatusProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Hospital Status</CardTitle>
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30">
            <IconCircleFilled className="size-2 mr-1.5 text-green-500" />
            Accepting
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Current Status
          </label>
          <Select defaultValue="accepting">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <IconCircleFilled className={cn("size-2", option.color)} />
                    <span>{option.label}</span>
                    <span className="text-muted-foreground">- {option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <IconUsers className="size-5 mx-auto text-muted-foreground" />
            <div className="text-2xl font-bold mt-1">47</div>
            <div className="text-[10px] text-muted-foreground">Staff on Duty</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <IconClock className="size-5 mx-auto text-muted-foreground" />
            <div className="text-2xl font-bold mt-1">12m</div>
            <div className="text-[10px] text-muted-foreground">Avg ER Wait</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <IconActivityHeartbeat className="size-5 mx-auto text-muted-foreground" />
            <div className="text-2xl font-bold mt-1">3m</div>
            <div className="text-[10px] text-muted-foreground">Trauma Response</div>
          </div>
        </div>

        {/* Infrastructure Status */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Infrastructure
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded border px-2 py-1.5">
              <IconCircleFilled className="size-2 text-green-500" />
              <span>Power: Normal</span>
            </div>
            <div className="flex items-center gap-1.5 rounded border px-2 py-1.5">
              <IconCircleFilled className="size-2 text-green-500" />
              <span>Water: Normal</span>
            </div>
            <div className="flex items-center gap-1.5 rounded border px-2 py-1.5">
              <IconCircleFilled className="size-2 text-green-500" />
              <span>Comms: Online</span>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" className="w-full">
          Broadcast Status Update
        </Button>
      </CardContent>
    </Card>
  )
}
