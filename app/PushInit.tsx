"use client"

import { useEffect } from "react"
import { PushNotifications } from "@capacitor/push-notifications"
import { Capacitor } from "@capacitor/core"
import { createBrowserClient } from "@supabase/ssr"

function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(id))
}

const STORAGE_FCM_TOKEN_KEY = "fcm_token"
const STORAGE_LAST_PRIVATE_SENT_TOKEN_KEY = "fcm_token_last_sent_private"
const STORAGE_LAST_PUBLIC_SENT_TOKEN_KEY = "fcm_token_last_sent_public"
const PUBLIC_TOPIC = "public_events"

export default function PushInit() {
  useEffect(() => {
    console.log("[push] PushInit mounted")
    console.log("[push] Capacitor.isNativePlatform():", Capacitor.isNativePlatform())
    console.log("[push] Capacitor platform:", Capacitor.getPlatform())

    if (!Capacitor.isNativePlatform()) {
      console.log("[push] not native platform -> abort")
      return
    }

    const supabase = getSupabaseBrowser()

    const getStoredToken = () => {
      try {
        const v = localStorage.getItem(STORAGE_FCM_TOKEN_KEY)
        console.log("[push] getStoredToken:", v ? `${v.slice(0, 20)}...` : "null")
        return v
      } catch (e) {
        console.log("[push] getStoredToken error:", e)
        return null
      }
    }

    const setStoredToken = (token: string) => {
      try {
        localStorage.setItem(STORAGE_FCM_TOKEN_KEY, token)
        console.log("[push] token saved to localStorage")
      } catch (e) {
        console.log("[push] setStoredToken error:", e)
      }
    }

    const getLastPrivateSentToken = () => {
      try {
        return localStorage.getItem(STORAGE_LAST_PRIVATE_SENT_TOKEN_KEY)
      } catch {
        return null
      }
    }

    const setLastPrivateSentToken = (token: string) => {
      try {
        localStorage.setItem(STORAGE_LAST_PRIVATE_SENT_TOKEN_KEY, token)
      } catch {}
    }

    const clearLastPrivateSentToken = () => {
      try {
        localStorage.removeItem(STORAGE_LAST_PRIVATE_SENT_TOKEN_KEY)
      } catch {}
    }

    const getLastPublicSentToken = () => {
      try {
        return localStorage.getItem(STORAGE_LAST_PUBLIC_SENT_TOKEN_KEY)
      } catch {
        return null
      }
    }

    const setLastPublicSentToken = (token: string) => {
      try {
        localStorage.setItem(STORAGE_LAST_PUBLIC_SENT_TOKEN_KEY, token)
      } catch {}
    }

    const clearLastPublicSentToken = () => {
      try {
        localStorage.removeItem(STORAGE_LAST_PUBLIC_SENT_TOKEN_KEY)
      } catch {}
    }

    const registerTokenPublic = async (fcmToken: string, force = false) => {
      try {
        console.log("[push] registerTokenPublic start", {
          hasToken: !!fcmToken,
          force,
        })

        if (!fcmToken) return

        const lastSent = getLastPublicSentToken()
        if (!force && lastSent === fcmToken) {
          console.log("[push] public token already synced, skip")
          return
        }

        const res = await fetchWithTimeout(
          "/api/push/register-public-fcm",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              token: fcmToken,
              platform: Capacitor.getPlatform() || "android",
              topic: PUBLIC_TOPIC,
            }),
          },
          8000
        )

        const txt = await res.text().catch(() => "")
        console.log("[push] register-public-fcm response:", res.status, txt)

        if (!res.ok) {
          console.log("[push] register-public-fcm failed:", res.status, txt)
          return
        }

        setLastPublicSentToken(fcmToken)
        console.log("[push] public token registered in DB")
      } catch (err) {
        console.error("[push] register-public-fcm error:", err)
      }
    }

    const registerTokenPrivateIfLoggedIn = async (fcmToken: string, force = false) => {
      try {
        console.log("[push] registerTokenPrivateIfLoggedIn start", {
          hasToken: !!fcmToken,
          force,
        })

        if (!fcmToken) return

        const lastSent = getLastPrivateSentToken()
        if (!force && lastSent === fcmToken) {
          console.log("[push] private token already synced, skip")
          return
        }

        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.log("[push] getSession error in private flow:", error.message)
          await registerTokenPublic(fcmToken, force)
          return
        }

        const accessToken = data?.session?.access_token
        console.log("[push] private session exists:", !!accessToken)

        if (!accessToken) {
          console.log("[push] no session yet -> fallback to public registration")
          await registerTokenPublic(fcmToken, force)
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
            body: JSON.stringify({
              token: fcmToken,
              platform: Capacitor.getPlatform() || "android",
            }),
          },
          8000
        )

        const txt = await res.text().catch(() => "")
        console.log("[push] register-fcm response:", res.status, txt)

        if (!res.ok) {
          console.log("[push] register-fcm failed:", res.status, txt)
          return
        }

        setLastPrivateSentToken(fcmToken)
        console.log("[push] private token registered in DB")
      } catch (err) {
        console.error("[push] register-fcm error:", err)
        await registerTokenPublic(fcmToken, force)
      }
    }

    const syncStoredTokenIfPossible = async (force = false) => {
      console.log("[push] syncStoredTokenIfPossible start", { force })

      const saved = getStoredToken()
      if (!saved) {
        console.log("[push] no local token stored yet")
        return
      }

      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.log("[push] getSession error while syncing:", error.message)
          await registerTokenPublic(saved, force)
          return
        }

        const accessToken = data?.session?.access_token
        console.log("[push] sync session exists:", !!accessToken)

        if (accessToken) {
          await registerTokenPrivateIfLoggedIn(saved, force)
        } else {
          await registerTokenPublic(saved, force)
        }
      } catch (err) {
        console.error("[push] syncStoredTokenIfPossible exception:", err)
        await registerTokenPublic(saved, force)
      }
    }

    const init = async () => {
      console.log("[push] init start")

      try {
        const cur = await PushNotifications.checkPermissions()
        console.log("[push] current permission:", cur)

        if (cur.receive !== "granted") {
          const perm = await PushNotifications.requestPermissions()
          console.log("[push] requested permission result:", perm)

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
        console.log("[push] channel created: chat")
      } catch (e) {
        console.log("[push] createChannel skipped:", e)
      }

      try {
        await PushNotifications.register()
        console.log("[push] register() called")
      } catch (e) {
        console.log("[push] register failed:", e)
      }

      await syncStoredTokenIfPossible(false)
    }

    const subRegistration = PushNotifications.addListener("registration", async (token) => {
      console.log("[push] REGISTRATION EVENT FIRED")
      console.log("[push] FCM token:", token.value)

      setStoredToken(token.value)

      const lastPrivate = getLastPrivateSentToken()
      if (lastPrivate !== token.value) {
        clearLastPrivateSentToken()
      }

      const lastPublic = getLastPublicSentToken()
      if (lastPublic !== token.value) {
        clearLastPublicSentToken()
      }

      await registerTokenPrivateIfLoggedIn(token.value, true)
    })

    const subRegErr = PushNotifications.addListener("registrationError", (err) => {
      console.error("[push] registration error:", err)
    })

    const subReceived = PushNotifications.addListener("pushNotificationReceived", (notif) => {
      console.log("[push] received:", notif)
    })

    const subAction = PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("[push] action:", action)

      try {
        const data: any = (action as any)?.notification?.data || {}
        const url = data?.url || data?.clickUrl || data?.path

        if (url && typeof url === "string") {
          const next = url.startsWith("/") ? url : `/${url}`
          window.history.pushState({}, "", next)
          window.dispatchEvent(new PopStateEvent("popstate"))
        }
      } catch {}
    })

    const { data: authSub } = supabase.auth.onAuthStateChange(async (event) => {
      console.log("[push] auth event:", event)

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        await syncStoredTokenIfPossible(true)
      }

      if (event === "SIGNED_OUT") {
        clearLastPrivateSentToken()
        await syncStoredTokenIfPossible(true)
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