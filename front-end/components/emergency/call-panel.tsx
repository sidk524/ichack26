"use client"

import { Drawer } from "vaul"
import { EmergencyCall } from "@/components/emergency-call"

interface CallPanelProps {
  open: boolean
  onClose: () => void
}

export function CallPanel({ open, onClose }: CallPanelProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-[96%] flex-col rounded-t-[20px] bg-background">
          {/* Drag handle */}
          <div className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-muted-foreground/20" />

          {/* Emergency Call UI */}
          <div className="flex-1 overflow-hidden">
            <EmergencyCall />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
