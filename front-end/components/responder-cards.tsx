import {
  IconAlertTriangle,
  IconAmbulance,
  IconTrendingDown,
  IconTrendingUp,
  IconUsers,
  IconPackage,
} from "@tabler/icons-react"

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface ResponderStats {
  activeIncidents: number
  incidentsTrend: number
  peopleInDanger: number
  peopleTrend: number
  respondersDeployed: number
  respondersTrend: number
  resourcesAvailable: number
  resourcesTrend: number
}

interface ResponderCardsProps {
  stats?: ResponderStats
}

// 2023 Turkey-Syria Earthquake stats (scaled for demo)
const defaultStats: ResponderStats = {
  activeIncidents: 47,
  incidentsTrend: 23.5,
  peopleInDanger: 8420,
  peopleTrend: -8.2,
  respondersDeployed: 312,
  respondersTrend: 45.0,
  resourcesAvailable: 28,
  resourcesTrend: -32.0,
}

export function ResponderCards({ stats = defaultStats }: ResponderCardsProps) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Active Incidents */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconAlertTriangle className="size-4 text-destructive" />
            Active Incidents
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.activeIncidents}
          </CardTitle>
          <CardAction>
            <Badge variant={stats.incidentsTrend > 0 ? "destructive" : "outline"}>
              {stats.incidentsTrend > 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {stats.incidentsTrend > 0 ? "+" : ""}{stats.incidentsTrend}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.incidentsTrend > 0 ? "Increasing activity" : "Decreasing activity"}
            {stats.incidentsTrend > 0 ? (
              <IconTrendingUp className="size-4 text-destructive" />
            ) : (
              <IconTrendingDown className="size-4 text-green-500" />
            )}
          </div>
          <div className="text-muted-foreground">
            Last updated 2 minutes ago
          </div>
        </CardFooter>
      </Card>

      {/* People in Danger */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconUsers className="size-4 text-orange-500" />
            People in Danger
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.peopleInDanger.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant={stats.peopleTrend > 0 ? "destructive" : "outline"}>
              {stats.peopleTrend > 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {stats.peopleTrend > 0 ? "+" : ""}{stats.peopleTrend}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.peopleTrend < 0 ? "Numbers decreasing" : "Numbers increasing"}
            {stats.peopleTrend < 0 ? (
              <IconTrendingDown className="size-4 text-green-500" />
            ) : (
              <IconTrendingUp className="size-4 text-destructive" />
            )}
          </div>
          <div className="text-muted-foreground">
            Across {stats.activeIncidents} active zones
          </div>
        </CardFooter>
      </Card>

      {/* Responders Deployed */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconAmbulance className="size-4 text-blue-500" />
            Responders Deployed
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.respondersDeployed}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              +{stats.respondersTrend}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Strong response coverage <IconTrendingUp className="size-4 text-green-500" />
          </div>
          <div className="text-muted-foreground">
            87% of available units active
          </div>
        </CardFooter>
      </Card>

      {/* Resources Available */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconPackage className="size-4 text-purple-500" />
            Resources Available
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.resourcesAvailable}
          </CardTitle>
          <CardAction>
            <Badge variant={stats.resourcesTrend < -10 ? "destructive" : "outline"}>
              {stats.resourcesTrend > 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {stats.resourcesTrend}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.resourcesTrend < 0 ? "Resources depleting" : "Resources stable"}
            <IconTrendingDown className="size-4 text-orange-500" />
          </div>
          <div className="text-muted-foreground">
            Medical supplies, vehicles, equipment
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
