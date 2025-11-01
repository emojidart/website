"use client"

import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Lobby } from "@/components/lobby"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ArrowLeft, Users } from "lucide-react"

export default function LobbyPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/member-login")
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col pb-20">
        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col pb-20">
      <main className="flex-grow container mx-auto px-4 py-4 max-w-6xl">
        <Button
          variant="outline"
          onClick={() => router.push("/member-profile-app")}
          className="mb-4 flex items-center gap-2 hover:bg-white hover:shadow-md transition-all"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Profil
        </Button>

        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-3xl mb-3 shadow-2xl">
            <Users className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Challenge Lobby</h1>
          <p className="text-base text-gray-600">Fordere andere Spieler heraus oder nimm Challenges an</p>
        </div>

        <Lobby />
      </main>

      <MobileBottomNav />
    </div>
  )
}
