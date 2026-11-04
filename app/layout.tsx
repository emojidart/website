// app/layout.tsx
import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { PresenceTracker } from "@/components/presence-tracker"
import { PushSubscriptionRepair } from "@/components/push-subscription-repair"
import KillServiceWorker from "@/components/KillServiceWorker"
import PushInit from "./PushInit"
import AppPlatformClass from "./AppPlatformClass"
import SupabaseSessionGuard from "@/components/SupabaseSessionGuard"
import { AppRouteGuard } from "@/components/auth/app-route-guard"
import AppThemeShell from "@/components/AppThemeShell"
import EmdLineupAlert from "@/components/emd-lineup-alert"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

// EMD Wartungsmodus: true = alle Webseiten gesperrt, false = wieder normal.
// Achtung: Dies versteckt die Benutzeroberfläche, sperrt jedoch NICHT API-Routen
// oder direkte Supabase-Zugriffe. Dafür sind gesonderte Zugriffskontrollen nötig.
const WARTUNGSMODUS = true

export const metadata: Metadata = {
  title: "Emoj's Dartverein",
  description: "Offizielle Website des Emoj's Dartvereins",
  generator: "grafikguru",
  robots: WARTUNGSMODUS ? { index: false, follow: false } : undefined,
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
  themeColor: "#050608",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  if (WARTUNGSMODUS) {
    return (
      <html lang="de">
        <body className={`${inter.className} min-h-screen bg-[#080a0f] text-white`}>
          <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#050505] px-5 py-12 text-[#e7e7e7]">
            <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 50% 43%, #351010 0%, #090909 48%, #000 85%)" }} />
            <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent 0px, transparent 3px, #fff 4px)" }} />
            <section className="relative z-10 w-full max-w-2xl py-10 text-center">
              <div className="mx-auto mb-10 flex h-14 w-14 items-center justify-center rounded-full border border-red-900/50 bg-red-950/20">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600 shadow-[0_0_22px_6px_rgba(220,38,38,0.35)]" />
              </div>
              <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.46em] text-zinc-500">EMD // SIGNAL UNTERBROCHEN</p>
              <h1 className="text-4xl font-black uppercase leading-[1.12] tracking-[0.08em] sm:text-6xl">Diese Seite<br /><span className="text-red-700">schweigt.</span></h1>
              <div className="mx-auto my-9 h-px max-w-[260px] bg-gradient-to-r from-transparent via-red-900 to-transparent" />
              <p className="mx-auto max-w-lg text-base leading-8 tracking-wide text-zinc-400 sm:text-lg">
                Der Zugang zur Website ist vorübergehend ausgesetzt.
              </p>
              <p className="mt-9 font-mono text-xs tracking-[0.28em] text-zinc-600">NICHT GELÖSCHT. NUR STILL.</p>
              <p className="mt-16 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-700">STATUS: OFFLINE <span className="mx-2 text-red-900">●</span> EMD</p>
            </section>
          </main>
        </body>
      </html>
    )
  }

  return (
    <html lang="de">
      <body className={`${inter.className} antialiased bg-[#050608] text-white`}>
        {/* killt alte PWA Service Worker */}
        <KillServiceWorker />

        {/* setzt .is-native auf <html> wenn App */}
        <AppPlatformClass />

        {/* 🔐 Supabase Session Guard */}
        <SupabaseSessionGuard />

        <div className="app-root safe-pt safe-pb">
          <PresenceTracker />
          <PushSubscriptionRepair />
          <PushInit />
          <EmdLineupAlert />

          <AppRouteGuard><AppThemeShell>{children}</AppThemeShell></AppRouteGuard>
        </div>
      </body>
    </html>
  )
}