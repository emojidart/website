"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Capacitor } from "@capacitor/core"

const INTERVAL_MS = 2 * 60 * 1000 // alle 2 Minuten
const MIN_GAP_MS = 45 * 1000 // mind. 45s Abstand
const RETRIES = 4 // weniger Retries = weniger Startlast
const RETRY_DELAY_MS = 400

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export function PresenceTracker() {
  const pathname = usePathname()

  const lastPingAtRef = useRef<number>(0)
  const inFlightRef = useRef<boolean>(false)

  // Pageviews: pro Route nur 1x zählen
  const lastTrackedPathRef = useRef<string | null>(null)
  const trackInFlightRef = useRef<boolean>(false)

  // 0) Pageview Counter bei Route-Wechsel
  useEffect(() => {
    // ✅ In nativer App skippen (sonst beim Start unnötig RPCs)
    if (Capacitor.isNativePlatform()) return

    if (!pathname) return
    if (lastTrackedPathRef.current === pathname) return
    lastTrackedPathRef.current = pathname

    const track = async () => {
      if (trackInFlightRef.current) return
      trackInFlightRef.current = true
      try {
        await supabase.rpc("increment_page_view", { p_path: pathname })
        await supabase.rpc("increment_page_view_daily", { p_path: pathname })
      } catch (e) {
        console.warn("page view counter failed:", e)
      } finally {
        trackInFlightRef.current = false
      }
    }

    // ✅ leicht verzögert, damit Startscreen nicht “gefühlt hängt”
    const t = setTimeout(() => track(), 600)
    return () => clearTimeout(t)
  }, [pathname])

  // 1) Presence Ping (last_seen_at)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    const ping = async (opts?: { force?: boolean; reason?: string }) => {
      const force = !!opts?.force

      if (cancelled) return
      if (inFlightRef.current) return

      const now = Date.now()
      if (!force && now - lastPingAtRef.current < MIN_GAP_MS) return
      if (!force && document.visibilityState !== "visible") return

      inFlightRef.current = true
      try {
        // ✅ kleiner Delay beim ersten Start
        if (force && opts?.reason === "mount") {
          await sleep(800)
        }

        for (let i = 0; i < RETRIES; i++) {
          const { data, error } = await supabase.auth.getUser()
          if (error) break

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
      } catch {
        // still
      } finally {
        inFlightRef.current = false
      }
    }

    // ✅ Wichtig: Nur pingen, wenn überhaupt sichtbar
    if (document.visibilityState === "visible") {
      ping({ force: true, reason: "mount" })
    }

    timer = setInterval(() => ping({ force: false, reason: "interval" }), INTERVAL_MS)

    const onVis = () => {
      if (document.visibilityState === "visible") ping({ force: true, reason: "visibility" })
    }
    const onFocus = () => ping({ force: true, reason: "focus" })
    const onPageShow = () => ping({ force: true, reason: "pageshow" })
    const onOnline = () => ping({ force: true, reason: "online" })
    const onPageHide = () => ping({ force: true, reason: "pagehide" })

    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("focus", onFocus)
    window.addEventListener("pageshow", onPageShow)
    window.addEventListener("online", onOnline)
    window.addEventListener("pagehide", onPageHide)

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) ping({ force: true, reason: "auth-change" })
    })

    return () => {
      cancelled = true
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
