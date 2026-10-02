"use client"

import { Header } from "@/components/header"
import { LeagueSection } from "@/components/league-section"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useEffect } from "react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default function MemberLeaguePage() {
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#040609] pb-24 text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat opacity-35"
        style={{ backgroundImage: 'url("/terminal/hero-startscreen.png")' }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(249,115,22,.13),transparent_28%),radial-gradient(circle_at_85%_12%,rgba(14,165,233,.08),transparent_26%),linear-gradient(180deg,rgba(4,6,9,.68),rgba(4,6,9,.94))]" />
      <div className="relative z-10">
      <Header
        variant="app"
        title="Liga Tabellen"
        subtitle="Aktuelle Ligastände & Ergebnisse"
        backHref="/member-profile-app"
      />

      <main className="pt-16 sm:pt-20">
        <div className="mx-auto w-full max-w-none px-3 py-4 sm:px-5 sm:py-6 lg:px-8 xl:px-10 2xl:px-12">
          <LeagueSection />
        </div>
      </main>

      <MobileBottomNav />
      </div>
    </div>
  )
}
