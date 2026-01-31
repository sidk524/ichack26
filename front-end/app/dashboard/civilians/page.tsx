import { AppSidebar } from "@/components/app-sidebar"
import { PeopleInDanger } from "@/components/people-in-danger"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  IconUsers,
  IconAlertTriangle,
  IconPhone,
  IconHeartbeat,
} from "@tabler/icons-react"

export default function CiviliansPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:py-6 px-4 lg:px-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Callers
                  </CardTitle>
                  <IconPhone className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">
                    2 currently on call
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    People Trapped
                  </CardTitle>
                  <IconAlertTriangle className="size-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">28</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting rescue
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total People
                  </CardTitle>
                  <IconUsers className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">47</div>
                  <p className="text-xs text-muted-foreground">
                    Including groups
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Injured
                  </CardTitle>
                  <IconHeartbeat className="size-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">18</div>
                  <p className="text-xs text-muted-foreground">
                    Requiring medical
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* People in Danger Table */}
            <PeopleInDanger className="flex-1 min-h-0" />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
