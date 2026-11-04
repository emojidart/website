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
          <main className="flex min-h-[100dvh] items-center justify-center px-5 py-12">
            <section className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/[0.035] p-8 text-center shadow-2xl sm:p-12">
              <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-400" aria-hidden="true">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
              </div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-orange-400">Emoj&apos;s Dartverein</p>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">WEBSITE VORÜBERGEHEND GESPERRT</h1>
              <p className="mx-auto mt-5 max-w-md text-base leading-7 text-slate-400">
                Respekt ist keine Frage der Position, sondern des Verhaltens.
              </p>
              <div className="mx-auto mt-9 h-px max-w-xs bg-white/10" />
              <p className="mt-6 text-sm text-slate-500">Diese Website ist derzeit nicht erreichbar.</p>
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