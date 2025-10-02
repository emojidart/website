"use client"
import { Header } from "@/components/header"
import { LeagueSection } from "@/components/league-section"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useEffect } from "react"

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
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.back()} className="flex items-center gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Profil
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Liga Tabellen</h1>
          <p className="text-gray-600 mt-2">Aktuelle Ligastände und Ergebnisse</p>
        </div>

        <LeagueSection />
      </main>
    </div>
  )
}
