"use client"

import { useCallback, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

const TOURNAMENT_MODE_PATH = "/terminal/turniermodus"
const CHECK_INTERVAL_MS = 15000

export default function TerminalAutoTournamentMode() {
  const pathname = usePathname()
  const router = useRouter()
  const pathnameRef = useRef(pathname)
  const navigatingRef = useRef(false)

  useEffect(() => {
    pathnameRef.current = pathname
    navigatingRef.current = false
  }, [pathname])

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("tournaments_status")
      .select("tournament_id")
      .eq("status", "active")
      .limit(1)

    if (error) {
      console.error("Terminal auto tournament check failed:", error)
      return
    }

    const tournamentActive = Boolean(data?.length)
    const currentPath = pathnameRef.current

    if (tournamentActive && currentPath !== TOURNAMENT_MODE_PATH && !navigatingRef.current) {
      navigatingRef.current = true
      router.replace(TOURNAMENT_MODE_PATH)
      return
    }

    if (!tournamentActive && currentPath === TOURNAMENT_MODE_PATH && !navigatingRef.current) {
      navigatingRef.current = true
      router.replace("/terminal")
    }
  }, [router])

  useEffect(() => {
    void refresh()

    const channel = supabase
      .channel("terminal_auto_tournament_mode")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournaments_status",
        },
        () => void refresh(),
      )
      .subscribe()

    const interval = window.setInterval(() => void refresh(), CHECK_INTERVAL_MS)

    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh()
    }
    const onFocus = () => void refresh()

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("focus", onFocus)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("focus", onFocus)
      void supabase.removeChannel(channel)
    }
  }, [refresh])

  return null
}
