"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

const INTERVAL_MS = 2 * 60 * 1000          // alle 2 Minuten (wenn möglich)
const MIN_GAP_MS = 45 * 1000               // mind. 45s Abstand zwischen Pings (Anti-Spam)
const RETRIES = 6                          // Mobile/PWA: auth ist manchmal kurz nicht ready
const RETRY_DELAY_MS = 300

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export function PresenceTracker() {
  const lastPingAtRef = useRef<number>(0)
  const inFlightRef = useRef<boolean>(false)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    const ping = async (opts?: { force?: boolean; reason?: string }) => {
      const force = !!opts?.force

      // nicht parallel laufen lassen
      if (inFlightRef.current) return

      // throttle: nicht zu oft updaten
      const now = Date.now()
      if (!force && now - lastPingAtRef.current < MIN_GAP_MS) return

      // nur wenn sichtbar (außer force)
      if (!force && document.visibilityState !== "visible") return

      inFlightRef.current = true
      try {
        // Mobile/PWA: auth.getUser() kann kurz null liefern -> Retry
        for (let i = 0; i < RETRIES; i++) {
          const { data, error } = await supabase.auth.getUser()
          if (error) {
            // bei Fehler nicht endlos retryen
            break
          }

          const user = data?.user
          if (user) {
            const { error: upErr } = await supabase
              .from("user_profiles")
              .update({ last_seen_at: new Date().toISOString() })
              .eq("user_id", user.id)

            if (!upErr) lastPingAtRef.current = Date.now()
            break
          }

          await sleep(RETRY_DELAY_MS)
        }
      } finally {
        inFlightRef.current = false
      }
    }

    // 1) Sofort beim Start (immer erzwingen)
    ping({ force: true, reason: "mount" })

    // 2) Intervall (wird in PWA/In-App teils gedrosselt, aber schadet nicht)
    timer = setInterval(() => ping({ force: false, reason: "interval" }), INTERVAL_MS)

    // 3) Events: PWA / In-App Browser / Resume / Fokus
    const onVis = () => {
      if (document.visibilityState === "visible") ping({ force: true, reason: "visibility" })
    }
    const onFocus = () => ping({ force: true, reason: "focus" })
    const onPageShow = () => ping({ force: true, reason: "pageshow" })
    const onOnline = () => ping({ force: true, reason: "online" })
    const onPageHide = () => ping({ force: true, reason: "pagehide" }) // best effort

    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("focus", onFocus)
    window.addEventListener("pageshow", onPageShow)
    window.addEventListener("online", onOnline)
    window.addEventListener("pagehide", onPageHide)

    // 4) Wenn Session erst später kommt -> sofort ping
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) ping({ force: true, reason: "auth-change" })
    })

    return () => {
      if (timer) clearInterval(timer)
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("pageshow", onPageShow)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("pagehide", onPageHide)
      sub.subscription.unsubscribe()
    }
  }, [])

  return null
}
