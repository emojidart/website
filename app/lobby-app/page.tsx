"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Lobby } from "@/components/lobby"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Users, Loader2 } from "lucide-react"

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
      <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header
          variant="app"
          title="Challenge Lobby"
          subtitle="Challenges & Gegner"
          backHref="/member-profile-app"
        />

        <div className="flex-1 flex items-center justify-center px-4 pb-20">
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-6 rounded-3xl bg-white shadow-2xl px-10 py-10">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl animate-pulse" />
                <Loader2 className="relative h-12 w-12 animate-spin text-orange-600" />
              </div>

              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">Lobby wird geladen</p>
                <p className="text-sm text-gray-500 mt-1">Bitte kurz warten…</p>
              </div>
            </div>
          </div>
        </div>

        <MobileBottomNav />
      </main>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-gray-900 font-sans flex flex-col pb-20 overflow-x-hidden">
      <Header
        variant="app"
        title="Challenge Lobby"
        subtitle="Fordere Spieler heraus"
        backHref="/member-profile-app"
      />

      <main className="pt-12 sm:pt-14">
  <div className="mx-auto w-full px-4 py-4 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
        {/* Page Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-3xl mb-3 shadow-2xl">
            <Users className="h-7 w-7 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Challenge Lobby</h1>
          <p className="text-base text-gray-600">Fordere andere Spieler heraus oder nimm Challenges an</p>
        </div>

        <Lobby />
		  </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}