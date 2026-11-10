"use client"

import { Header } from "@/components/header"
import { LeagueSection } from "@/components/league-section"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function MemberLeagueResultsPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  if (authLoading) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-background text-white">
        <Header variant="app" title="Ergebnisse" subtitle="Ligazentrale" backHref="/member-league-app" />
        <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] space-y-4 px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 xl:px-8" role="status" aria-busy="true" aria-label="Ergebnisse werden geladen">
          <section className="rounded-[24px] border border-white/10 bg-card p-4 sm:p-6">
            <div className="mb-5 h-7 w-40 animate-pulse rounded bg-white/10" />
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-11 animate-pulse rounded-xl bg-white/10" />)}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-3">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-white/10" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background font-sans text-white">
      <Header variant="app" title="Ergebnisse" subtitle="Ligazentrale" backHref="/member-league-app" />

      <div className="pointer-events-none fixed inset-0 z-0 bg-background" aria-hidden="true" />

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">

        <LeagueSection initialMode="results" fixedMode="results" />
      </main>

      <MobileBottomNav />
    </div>
  )
}
