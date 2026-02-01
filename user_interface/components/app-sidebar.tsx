"use client"

import * as React from "react"
import {
  IconAlertTriangle,
  IconBuildingHospital,
  IconHeadset,
  IconHelp,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconUsersGroup,
} from "@tabler/icons-react"

import { NavMain } from '@/components/nav-main'
import { NavSecondary } from '@/components/nav-secondary'
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
      title: "Switchboard",
      url: "/dashboard",
      icon: IconHeadset,
    },
    {
      title: "Field View",
      url: "/dashboard/firstresponders",
      icon: IconAlertTriangle,
    },
    {
      title: "Civilians",
      url: "/emergency",
      icon: IconUsersGroup,
    },
    {
      title: "Hospitals",
      url: "/dashboard/hospitals",
      icon: IconBuildingHospital,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
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
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
