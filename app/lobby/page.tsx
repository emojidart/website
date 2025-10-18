"use client"

import { Header } from "@/components/header"
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
      <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl">
        <Button
          variant="outline"
          onClick={() => router.push("/member-profile")}
          className="mb-6 flex items-center gap-2 hover:bg-white hover:shadow-md transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Profil
        </Button>

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-3xl mb-4 sm:mb-6 shadow-2xl">
            <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Challenge Lobby</h1>
          <p className="text-lg sm:text-xl text-gray-600">Fordere andere Spieler heraus oder nimm Challenges an</p>
        </div>

        <Lobby />
      </main>
    </div>
  )
}
