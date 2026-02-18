// app/PushInit.tsx
"use client"

import { useEffect } from "react"
import { PushNotifications } from "@capacitor/push-notifications"
import { Capacitor } from "@capacitor/core"
import { createBrowserClient } from "@supabase/ssr"

function getSupabaseBrowser() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(id))
}

export default function PushInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const supabase = getSupabaseBrowser()

    const registerTokenIfLoggedIn = async (fcmToken: string) => {
      try {
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

        const res = await fetchWithTimeout(
          "/api/push/register-fcm",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ token: fcmToken, platform: "android" }),
          },
          8000
        )

        const txt = await res.text().catch(() => "")
        if (!res.ok) {
          console.log("[push] register-fcm failed:", res.status, txt)
        } else {
          console.log("[push] token registered in DB:", txt || "ok")
        }
      } catch (err) {
        console.error("[push] register-fcm error:", err)
      }
    }

    const init = async () => {
      // 1) Permission (erst checken, dann request)
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

      // 2) Android Channel (WhatsApp-like: high)
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

      // 3) Register FCM
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

      // ✅ EXTREM WICHTIG: NICHT awaiten -> blockiert sonst Start/Render
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
          // ✅ kein Full Reload, sondern nur History-State ändern + Event triggern
          // (funktioniert in WebView stabiler als window.location.href)
          const next = url.startsWith("/") ? url : `/${url}`
          window.history.pushState({}, "", next)
          window.dispatchEvent(new PopStateEvent("popstate"))
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
          // ✅ nicht awaiten
          void registerTokenIfLoggedIn(saved)
        }
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
