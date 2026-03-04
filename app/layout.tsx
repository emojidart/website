// app/layout.tsx
import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { PresenceTracker } from "@/components/presence-tracker"
import { PushSubscriptionRepair } from "@/components/push-subscription-repair"
import PushInit from "./PushInit"
import AppPlatformClass from "./AppPlatformClass"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Emoj's Dartverein",
  description: "Offizielle Website des Emoj's Dartvereins",
  generator: "grafikguru",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Emoj's Dartverein",
  },
  icons: {
    apple: "/icon-192.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#d97706",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${inter.className} antialiased`}>
        {/* ✅ setzt .is-native auf <html> wenn App */}
        <AppPlatformClass />

        <div className="app-root safe-pt safe-pb">
          <PresenceTracker />
          <PushSubscriptionRepair />
          <PushInit />

          {/* ✅ KEIN lg:pl-64 mehr, weil du keine feste Sidebar hast */}
          {children}
        </div>
      </body>
    </html>
  )
}