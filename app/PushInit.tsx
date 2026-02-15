// app/PushInit.tsx
"use client"

import { useEffect } from "react"
import { PushNotifications } from "@capacitor/push-notifications"
import { Capacitor } from "@capacitor/core"
import { createBrowserClient } from "@supabase/ssr"

function getSupabaseBrowser() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export default function PushInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const supabase = getSupabaseBrowser()

    const registerTokenIfLoggedIn = async (fcmToken: string) => {
      try {
        const { data } = await supabase.auth.getSession()
        const accessToken = data?.session?.access_token

        if (!accessToken) {
          console.log("[push] no session yet -> will register after login")
          return
        }

        const res = await fetch("/api/push/register-fcm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ token: fcmToken, platform: "android" }),
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
      // 1) Permission
      const perm = await PushNotifications.requestPermissions()
      if (perm.receive !== "granted") {
        console.log("[push] permission not granted")
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
      await PushNotifications.register()
    }

    // Listener
    const subRegistration = PushNotifications.addListener("registration", async (token) => {
      console.log("[push] FCM token:", token.value)

      try {
        localStorage.setItem("fcm_token", token.value)
      } catch {}

      await registerTokenIfLoggedIn(token.value)
    })

    const subRegErr = PushNotifications.addListener("registrationError", (err) => {
      console.error("[push] registration error:", err)
    })

    // Foreground: wir loggen nur (die native WhatsApp-Style Notification kommt v.a. im Background)
    const subReceived = PushNotifications.addListener("pushNotificationReceived", (notif) => {
      console.log("[push] received:", notif)
    })

    // Tap auf Notification (falls Capacitor Plugin das Event liefert)
    const subAction = PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("[push] action:", action)
      try {
        const data: any = (action as any)?.notification?.data || {}
        const url = data?.url
        if (url) {
          // url ist z.B. /chat-app?scope=team&roomId=...
          window.location.href = url
        }
      } catch {}
    })

    // Wenn User später einloggt -> Token nochmal registrieren
    const { data: authSub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN") {
        const saved = (() => {
          try {
            return localStorage.getItem("fcm_token")
          } catch {
            return null
          }
        })()
        if (saved) await registerTokenIfLoggedIn(saved)
      }
    })

    init()

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
