"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase"

export function PresenceTracker() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    const ping = async () => {
      // nur wenn Tab sichtbar (sonst unnötige Updates)
      if (document.visibilityState !== "visible") return

      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (!user) return

      // Update nur last_seen_at (durch SQL-Rechte abgesichert)
      await supabase
        .from("user_profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("user_id", user.id)
    }

    // sofort einmal
    ping()

    // alle 2 Minuten
    timer = setInterval(ping, 2 * 60 * 1000)

    // wenn Tab wieder aktiv wird -> sofort ping
    const onVis = () => {
      if (document.visibilityState === "visible") ping()
    }
    document.addEventListener("visibilitychange", onVis)

    return () => {
      if (timer) clearInterval(timer)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [])

  return null
}
