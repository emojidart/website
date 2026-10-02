"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function TournamentSchedulesRedirect() {
  const router = useRouter()

  useEffect(() => {
    try {
      window.sessionStorage.setItem("emd-admin-current-view", "tournament-series")
    } catch {}
    router.replace("/admin")
  }, [router])

  return null
}
