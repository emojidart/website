// app/PushInit.tsx
"use client"

import { useEffect, useRef } from "react"
import { PushNotifications } from "@capacitor/push-notifications"
import { Capacitor } from "@capacitor/core"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

function getSupabaseBrowser(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 8000, ...rest } = init
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...rest, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

export default function PushInit() {
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const latestTokenRef = useRef<string | null>(null)
  const registeringRef = useRef(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const supabase = getSupabaseBrowser()
    supabaseRef.current = supabase

    const registerToken = async (fcmToken: string) => {
      if (!fcmToken) return
      if (registeringRef.current) return
      registeringRef.current = true

      try {
        // ✅ Session kann beim Cold Start kurz NULL sein -> retry max ~10s
        let accessToken: string | null = null
        for (let i = 0; i < 20; i++) {
          const { data, error } = await supabase.auth.getSession()
          if (!error && data?.session?.access_token) {
            accessToken = data.session.access_token
            break
          }
          await sleep(500)
        }

        if (!accessToken) {
          console.log("[push] no session after retry -> skip register (will retry on auth events)")
          return
        }

        const res = await fetchWithTimeout("/api/push/register-fcm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ token: fcmToken, platform: "android" }),
          timeoutMs: 8000,
        })

        const txt = await res.text().catch(() => "")
        if (!res.ok) {
          console.log("[push] register-fcm failed:", res.status, txt)
        } else {
          console.log("[push] token registered in DB:", txt || "ok")
        }
      } catch (err) {
        console.error("[push] register-fcm error:", err)
      } finally {
        registeringRef.current = false
      }
    }

    const init = async () => {
      try {
        const cur = await PushNotifications.checkPermissions()
        if (cur.receive !== "granted") {
          const perm = await PushNotifications.requestPermissions()
          if (perm.receive !== "granted") {
            console.log("[push] permission not granted")
            return
          }
        }
      } catch (e) {
        console.log("[push] permission error:", e)
        return
      }

      try {
        await PushNotifications.createChannel({
          id: "chat",
          name: "Chat",
          description: "Chat Benachrichtigungen",
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
        })
      } catch {}

      try {
        await PushNotifications.register()
      } catch (e) {
        console.log("[push] register failed:", e)
      }
    }

    const subRegistration = PushNotifications.addListener("registration", (token) => {
      console.log("[push] FCM token:", token.value)

      latestTokenRef.current = token.value
      try {
        localStorage.setItem("fcm_token", token.value)
      } catch {}

      // ✅ nicht blockieren
      void registerToken(token.value)
    })

    const subRegErr = PushNotifications.addListener("registrationError", (err) => {
      console.error("[push] registration error:", err)
    })

    const subReceived = PushNotifications.addListener("pushNotificationReceived", (notif) => {
      console.log("[push] received:", notif)
    })

    const subAction = PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("[push] action:", action)
      // Navigation machst du eh nativ über MainActivity/Intent – hier lassen wir nur loggen
    })

    // ✅ Sobald supabase die Session initial geladen hat, nochmal registrieren
    const { data: authSub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const saved = (() => {
          try {
            return localStorage.getItem("fcm_token")
          } catch {
            return null
          }
        })()
        const token = latestTokenRef.current || saved
        if (token) void registerToken(token)
      }
    })

    void init()

    return () => {
      subRegistration.remove()
      subRegErr.remove()
      subReceived.remove()
      subAction.remove()
      authSub?.subscription?.unsubscribe()
    }
  }, [])

  return null
}
