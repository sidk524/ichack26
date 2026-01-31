import { IconUsersGroup } from "@tabler/icons-react"

import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

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
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <Card className="flex flex-col items-center justify-center py-16">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 rounded-full bg-orange-500/10 p-4">
                    <IconUsersGroup className="size-12 text-orange-500" />
                  </div>
                  <CardTitle className="text-2xl">People in Danger</CardTitle>
                  <CardDescription className="text-base max-w-md">
                    Civilian evacuation routes, shelter locations, and emergency alerts dashboard coming soon.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
