"use client"

import { Header } from "@/components/header"
import { LeagueSection } from "@/components/league-section"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
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
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col pb-20">
        <Header />

        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>

        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col pb-20">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-4 max-w-7xl">
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/member-profile-app")}
            className="flex items-center gap-2 mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Profil
          </Button>

          <h1 className="text-2xl font-bold text-gray-900">Liga Tabellen</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Aktuelle Ligastände und Ergebnisse
          </p>
        </div>

        <LeagueSection />
      </main>

      <MobileBottomNav />
    </div>
  )
}
