"use client"

import * as React from "react"
import {
  IconAlertTriangle,
  IconBuildingHospital,
  IconShieldCheck,
  IconUsersGroup,
} from "@tabler/icons-react"

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const data = {
  user: {
    name: "Operator",
    email: "operator@emergency.gov",
    avatar: "/avatars/operator.jpg",
  },
  navMain: [
    {
      title: "First Responders",
      url: "/dashboard",
      icon: IconAlertTriangle,
    },
    {
      title: "Hospitals",
      url: "/dashboard/hospitals",
      icon: IconBuildingHospital,
    },
    {
      title: "People in Danger",
      url: "/dashboard/civilians",
      icon: IconUsersGroup,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="/dashboard">
                <IconShieldCheck className="size-5!" />
                <span className="text-base font-semibold">DisasterResponse</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
