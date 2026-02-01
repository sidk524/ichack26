import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "Emergency Services - Disaster Response",
  description: "Connect with emergency services for immediate assistance",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default function EmergencyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-[100dvh] touch-manipulation">
      {children}
    </div>
  )
}
