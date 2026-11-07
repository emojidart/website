"use client"

import { Header } from "@/components/header"
import { LeagueSection } from "@/components/league-section"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function MemberLeagueTablesPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  if (authLoading) {
    return <div className="min-h-[1px]" aria-hidden="true" />
  }

  if (!session) return null

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background font-sans text-white">
      <Header variant="app" title="Tabellen" subtitle="Ligazentrale" backHref="/member-league-app" />

      <div className="pointer-events-none fixed inset-0 z-0 bg-background" aria-hidden="true" />

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8 xl:px-8">

        <LeagueSection initialMode="table" fixedMode="table" />
      </main>

      <MobileBottomNav />
    </div>
  )
}
