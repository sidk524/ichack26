"use client"

import * as React from "react"
import {
  IconBuildingHospital,
  IconUsersGroup,
} from "@tabler/icons-react"

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar'

const data = {
  user: {
    name: "Operator",
    email: "operator@emergency.gov",
    avatar: "/avatars/operator.jpg",
  },
  navMain: [
    {
      title: "Hospitals",
      url: "/hospitals",
      icon: IconBuildingHospital,
    },
    {
      title: "People in Danger",
      url: "/civilians",
      icon: IconUsersGroup,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
