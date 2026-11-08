"use client"



import { useEffect, useState } from "react"
import { Capacitor } from "@capacitor/core"
import { PushNotifications } from "@capacitor/push-notifications"
import { createBrowserClient } from "@supabase/ssr"
import { Bell, BellRing, Settings, X } from "lucide-react"
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

      let cleanupRegistrationListeners = () => {}
      const tokenPromise = new Promise<string>((resolve, reject) => {
        let finished = false
        let regSub: ReturnType<typeof PushNotifications.addListener> | null = null
        let errSub: ReturnType<typeof PushNotifications.addListener> | null = null

        const cleanup = () => {
          clearTimeout(timeout)
          for (const listener of [regSub, errSub]) {
            if (listener) void listener.then((handle) => handle.remove()).catch(console.warn)
          }
        }
        cleanupRegistrationListeners = cleanup

        const finish = (token?: string, error?: unknown) => {
          if (finished) return
          finished = true
          cleanup()
          if (error) reject(error)
          else if (token) resolve(token)
          else reject(new Error("Kein Push-Token erhalten"))
        }

        const timeout = setTimeout(() => finish(undefined, new Error("FCM Token Timeout")), 10000)
        regSub = PushNotifications.addListener("registration", (token) => {
          try { localStorage.setItem("fcm_token", token.value) } catch {}
          finish(token.value)
        })
        errSub = PushNotifications.addListener("registrationError", (error) => finish(undefined, error))
      })

      let fcmToken: string
      try {
        await PushNotifications.register()
        fcmToken = await tokenPromise
      } catch (error) {
        cleanupRegistrationListeners()
        throw error
      }
      await registerTokenIfLoggedIn(fcmToken)

      setVisible(false)
    } catch (err) {
      console.error("[push-banner] enable error:", err)
      setNeedsSettings(true)
    } finally {
      setLoading(false)
    }
  }

  if (!visible) return null

  return (
    <div className="mx-4 sm:mx-6 mt-3">
      <div className="rounded-2xl border border-orange-200 bg-card shadow-lg overflow-hidden">
        <div className="text-foreground h-1.5 bg-card   " />

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
                <div className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">
                  <Bell className="w-3.5 h-3.5" />
                  Push-News
                </div>

                <div className="mt-1 text-sm sm:text-base font-semibold text-foreground">
                  Benachrichtigungen aktivieren
                </div>

                <div className="mt-1 text-[12px] sm:text-sm text-muted-foreground">
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
              className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground"
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
                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold"
               loading={Boolean(loading)} loadingLabel="Wird aktiviert...">{(
                  <>
                    <BellRing className="w-4 h-4 mr-2" />
                    Push aktivieren
                  </>
                )}</Button>
            ) : (
              <Button
                onClick={handleEnablePush}
                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold"
              >
                <Settings className="w-4 h-4 mr-2" />
                Erneut prüfen
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => {
                setClosed(true)
                setVisible(false)
              }}
              className="rounded-xl font-semibold"
            >
              Später
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}