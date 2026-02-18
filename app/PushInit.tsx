// app/PushInit.tsx
"use client"

import { useEffect, useRef } from "react"
import { PushNotifications } from "@capacitor/push-notifications"
import { Capacitor } from "@capacitor/core"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

function getSupabaseBrowser(): SupabaseClient {
  // ✅ WICHTIG: in Capacitor/WebView unbedingt supabase-js Client verwenden
  // -> nutzt localStorage und persistiert Session zuverlässig
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // in App/WebView meist kein OAuth callback per URL nötig
    },
  })
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
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const supabase = getSupabaseBrowser()
    supabaseRef.current = supabase

    const registerTokenIfLoggedIn = async (fcmToken: string) => {
      try {
        // Session holen (sollte bei supabase-js + localStorage zuverlässig sein)
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.log("[push] getSession error:", error.message)
          return
        }

        const accessToken = data?.session?.access_token
        if (!accessToken) {
          console.log("[push] no session yet -> will register after login")
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

        if (!res.ok) {
          const txt = await res.text().catch(() => "")
          console.log("[push] register-fcm failed:", res.status, txt)
        } else {
          console.log("[push] token registered in DB")
        }
      } catch (err) {
        console.error("[push] register-fcm error:", err)
      }
    }

    const init = async () => {
      // ✅ zuerst checken, damit wir keinen unnötigen Flow starten
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
        console.log("[push] permission check/request error:", e)
        return
      }

      // Android Channel (WhatsApp-like: high)
      try {
        await PushNotifications.createChannel({
          id: "chat",
          name: "Chat",
          description: "Chat Benachrichtigungen",
          importance: 5, // HIGH
          visibility: 1, // PUBLIC
          vibration: true,
          lights: true,
        })
        console.log("[push] channel created: chat")
      } catch (e) {
        console.log("[push] createChannel skipped:", e)
      }

      // ✅ Register FCM (nicht blockierend für UI – aber hier ok)
      try {
        await PushNotifications.register()
      } catch (e) {
        console.log("[push] register failed:", e)
      }
    }

    // Listener: Token
    const subRegistration = PushNotifications.addListener("registration", (token) => {
      console.log("[push] FCM token:", token.value)

      try {
        localStorage.setItem("fcm_token", token.value)
      } catch {}

      // ✅ NICHT awaiten -> niemals App-Start blockieren
      void registerTokenIfLoggedIn(token.value)
    })

    const subRegErr = PushNotifications.addListener("registrationError", (err) => {
      console.error("[push] registration error:", err)
    })

    const subReceived = PushNotifications.addListener("pushNotificationReceived", (notif) => {
      console.log("[push] received:", notif)
    })

    // Tap auf Notification
    const subAction = PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("[push] action:", action)
      try {
        const data: any = (action as any)?.notification?.data || {}
        const url = data?.url || data?.clickUrl || data?.path
        if (url && typeof url === "string") {
          // ✅ Kein window.location.href (Full reload)
          // ✅ Router push (SPA Navigation)
          router.push(url.startsWith("/") ? url : `/${url}`)
        }
      } catch {}
    })

    // Wenn User später einloggt -> Token nochmal registrieren
    const { data: authSub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const saved = (() => {
          try {
            return localStorage.getItem("fcm_token")
          } catch {
            return null
          }
        })()
        if (saved) {
          // ✅ wieder nicht blockieren
          void registerTokenIfLoggedIn(saved)
        }
      }
    })

    // ✅ init starten (nicht awaited im Effect)
    void init()

    return () => {
      subRegistration.remove()
      subRegErr.remove()
      subReceived.remove()
      subAction.remove()
      authSub?.subscription?.unsubscribe()
    }
  }, [router])

  return null
}
