"use client"

import { EmergencyCall } from "@/components/emergency-call"
import { Button } from "@/components/ui/button"
import { IconArrowLeft } from "@tabler/icons-react"
import Link from "next/link"

export default function EmergencyPage() {
  return (
    <div className="relative min-h-screen">
      <div className="absolute top-14 left-4 z-50">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <IconArrowLeft className="size-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>
      <EmergencyCall />
    </div>
  )
}
