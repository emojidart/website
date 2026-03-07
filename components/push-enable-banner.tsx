"use client"

import { useEffect, useState } from "react"
import { Capacitor } from "@capacitor/core"
import { PushNotifications } from "@capacitor/push-notifications"
import { App } from "@capacitor/app"
import { createBrowserClient } from "@supabase/ssr"
import { Bell, BellRing, Loader2, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(id))
}

export function PushEnableBanner() {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [needsSettings, setNeedsSettings] = useState(false)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    const checkPushStatus = async () => {
      try {
        if (!Capacitor.isNativePlatform()) return
        if (closed) return

        const { data } = await supabase.auth.getSession()
        const userId = data.session?.user?.id
        if (!userId) return

        const perm = await PushNotifications.checkPermissions()

        const { data: tokenRow } = await supabase
          .from("fcm_tokens")
          .select("token")
          .eq("user_id", userId)
          .eq("platform", "android")
          .limit(1)
          .maybeSingle()

        const hasTokenInDb = !!tokenRow?.token
        const permissionGranted = perm.receive === "granted"

        if (!permissionGranted || !hasTokenInDb) {
          setVisible(true)
        } else {
          setVisible(false)
        }
      } catch (err) {
        console.error("[push-banner] check error:", err)
      }
    }

    void checkPushStatus()
  }, [closed])

  const registerTokenIfLoggedIn = async (fcmToken: string) => {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error

    const accessToken = data?.session?.access_token
    if (!accessToken) throw new Error("Kein Login gefunden")

    const res = await fetchWithTimeout("/api/push/register-fcm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        token: fcmToken,
        platform: "android",
      }),
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      throw new Error(txt || "Token konnte nicht gespeichert werden")
    }
  }

  const handleEnablePush = async () => {
    try {
      setLoading(true)
      setNeedsSettings(false)

      const before = await PushNotifications.checkPermissions()

      if (before.receive !== "granted") {
        const requested = await PushNotifications.requestPermissions()

        if (requested.receive !== "granted") {
          setNeedsSettings(true)
          return
        }
      }

      await PushNotifications.createChannel({
        id: "chat",
        name: "Chat",
        description: "Chat Benachrichtigungen",
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
      }).catch(() => {})

      const tokenPromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("FCM Token Timeout"))
        }, 10000)

        const regSub = PushNotifications.addListener("registration", async (token) => {
          try {
            clearTimeout(timeout)
            regSub.remove()

            try {
              localStorage.setItem("fcm_token", token.value)
            } catch {}

            resolve(token.value)
          } catch (e) {
            reject(e)
          }
        })

        const errSub = PushNotifications.addListener("registrationError", (err) => {
          clearTimeout(timeout)
          regSub.remove()
          errSub.remove()
          reject(err)
        })
      })

      await PushNotifications.register()
      const fcmToken = await tokenPromise
      await registerTokenIfLoggedIn(fcmToken)

      setVisible(false)
    } catch (err) {
      console.error("[push-banner] enable error:", err)
      setNeedsSettings(true)
    } finally {
      setLoading(false)
    }
  }

  const openAppSettings = async () => {
    try {
      await App.openSettings()
    } catch (err) {
      console.error("[push-banner] open settings error:", err)
    }
  }

  if (!visible) return null

  return (
    <div className="mx-4 sm:mx-6 mt-3">
      <div className="rounded-2xl border border-orange-200 bg-white shadow-lg overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                {needsSettings ? (
                  <Settings className="w-5 h-5 text-orange-700" />
                ) : (
                  <BellRing className="w-5 h-5 text-orange-700" />
                )}
              </div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
                  <Bell className="w-3.5 h-3.5" />
                  Push-News
                </div>

                <div className="mt-1 text-sm sm:text-base font-black text-gray-900">
                  Benachrichtigungen aktivieren
                </div>

                <div className="mt-1 text-[12px] sm:text-sm text-gray-600">
                  Erhalte wichtige Vereinsnews, Chat-Nachrichten und Updates direkt aufs Handy.
                </div>

                {needsSettings && (
                  <div className="mt-2 text-[12px] sm:text-sm text-orange-700 font-semibold">
                    Push wurde noch nicht erlaubt. Bitte öffne die App-Einstellungen und aktiviere Benachrichtigungen.
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setClosed(true)
                setVisible(false)
              }}
              className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600"
              aria-label="Schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            {!needsSettings ? (
              <Button
                onClick={handleEnablePush}
                disabled={loading}
                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird aktiviert...
                  </>
                ) : (
                  <>
                    <BellRing className="w-4 h-4 mr-2" />
                    Push aktivieren
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={openAppSettings}
                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black"
              >
                <Settings className="w-4 h-4 mr-2" />
                Einstellungen öffnen
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => {
                setClosed(true)
                setVisible(false)
              }}
              className="rounded-xl font-black"
            >
              Später
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}