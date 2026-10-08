"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"

/**
 * Einheitlicher Rücksprung aus DKO, Survival, Kratzer und anderen Modi.
 * Die eigentliche Turnier-Zentrale ist die Ansicht "tournament-center"
 * innerhalb von /admin, nicht die historische Spieltags-Seite.
 */
export default function TournamentCenterPage() {
  const router = useRouter()

  useEffect(() => {
    try {
      window.sessionStorage.setItem("emd-admin-current-view", "tournament-center")
    } catch (error) {
      console.warn("Turnier-Zentrale konnte nicht als Startansicht gespeichert werden:", error)
    }
    router.replace("/admin")
  }, [router])

  return (
    <div className="min-h-screen bg-[#070b12] text-white">
      <Header />
      <div className="h-12 sm:h-14" />
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-white/10 bg-[#0b101a] px-6 py-5 text-center shadow-xl">
          <div className="text-sm font-bold text-white">Turnier-Zentrale wird geöffnet…</div>
          <p className="mt-2 text-xs text-white/50">Zurück zur Verwaltung deiner Turniere</p>
        </div>
      </div>
    </div>
  )
}
