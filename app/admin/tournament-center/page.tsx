"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"

export default function TournamentCenterPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/admin/turnier_spieltage_starten")
  }, [router])

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <Header />
      <div className="h-12 sm:h-14" />
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="text-sm font-bold text-gray-900">Turnierübersicht wird geöffnet…</div>
        </div>
      </div>
    </div>
  )
}
