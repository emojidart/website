"use client"

import { SectionSkeleton } from "@/components/loading/loading"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Lobby } from "@/components/lobby"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Users } from "lucide-react"

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
      <main className="emd-loading-surface text-foreground min-h-screen flex flex-col bg-card   ">
        <Header
          variant="app"
          title="Challenge Lobby"
          subtitle="Challenges & Gegner"
          backHref="/member-profile-app"
        />

        <SectionSkeleton kind="cards" />

        <MobileBottomNav />
      </main>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-card    text-foreground font-sans flex flex-col pb-20 overflow-x-hidden">
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
          <div className="text-foreground inline-flex items-center justify-center w-14 h-14 bg-card    rounded-3xl mb-3 shadow-2xl">
            <Users className="h-7 w-7 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">Challenge Lobby</h1>
          <p className="text-base text-muted-foreground">Fordere andere Spieler heraus oder nimm Challenges an</p>
        </div>

        <Lobby />
		  </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}