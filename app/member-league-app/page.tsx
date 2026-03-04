"use client"

import { Header } from "@/components/header"
import { LeagueSection } from "@/components/league-section"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useEffect } from "react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Loader2 } from "lucide-react"

export default function MemberLeaguePage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  if (authLoading) {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header variant="app" title="Liga Tabellen" subtitle="Aktuelle Ligastände & Ergebnisse" backHref="/member-profile-app" />

        <div className="flex-1 flex items-center justify-center px-4 pb-24">
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-6 rounded-3xl bg-white shadow-2xl px-10 py-10">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl animate-pulse" />
                <Loader2 className="relative h-12 w-12 animate-spin text-orange-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">Liga wird geladen</p>
                <p className="text-sm text-gray-500 mt-1">Bitte kurz warten…</p>
              </div>
            </div>
          </div>
        </div>

        <MobileBottomNav />
      </main>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-gray-900 font-sans flex flex-col overflow-x-hidden">
      <Header variant="app" title="Liga Tabellen" subtitle="Aktuelle Ligastände & Ergebnisse" backHref="/member-profile-app" />

      <main className="pt-12 sm:pt-14">
  <div className="mx-auto w-full px-4 py-4 sm:py-6 pb-24 md:pb-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
    <LeagueSection />
  </div>
</main>

      <MobileBottomNav />
    </div>
  )
}