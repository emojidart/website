"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, BellOff, CheckCircle, XCircle } from "lucide-react"
import {
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "@/lib/push-notifications"
import { useAuth } from "@/hooks/use-auth"

export function PushNotificationManager() {
  const { user, session } = useAuth() as any
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)
      checkSubscription()
    }
  }, [])

  const checkSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      setRegistration(reg)
      const subscription = await reg.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error("Fehler beim Prüfen des Abonnements:", error)
    }
  }

  const handleSubscribe = async () => {
    if (!user) {
      alert("Bitte melde dich an, um Benachrichtigungen zu aktivieren")
      return
    }

    setLoading(true)
    try {
      let reg = registration
      if (!reg) {
        reg = await registerServiceWorker()
        setRegistration(reg)
      }
      if (!reg) throw new Error("Service Worker konnte nicht registriert werden")

      const perm = await requestNotificationPermission()
      setPermission(perm)

      if (perm !== "granted") {
        alert("Benachrichtigungen wurden nicht erlaubt")
        return
      }

      const subscription = await subscribeToPushNotifications(reg)
      if (!subscription) throw new Error("Abonnement fehlgeschlagen")

      // ✅ Token AUS useAuth Session (das ist der richtige Token deines Logins)
      const token = session?.access_token ?? null

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(subscription),
      })

      const json = await response.json().catch(() => ({}))
      console.log("[push] subscribe response:", json)

      if (!response.ok) {
        throw new Error(json?.error || "Fehler beim Speichern des Abonnements")
      }

      if (json?.hasUserId === false) {
        console.warn("[push] Subscription gespeichert, aber user_id wurde NICHT gesetzt (Token fehlt/ungültig).")
      }

      setIsSubscribed(true)
      alert("Benachrichtigungen erfolgreich aktiviert!")
    } catch (error) {
      console.error("Fehler beim Aktivieren der Benachrichtigungen:", error)
      alert("Fehler beim Aktivieren der Benachrichtigungen")
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    try {
      if (!registration) throw new Error("Keine Service Worker Registrierung gefunden")

      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) throw new Error("Kein Abonnement gefunden")

      const token = session?.access_token ?? null

      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })

      await unsubscribeFromPushNotifications(registration)
      setIsSubscribed(false)
      alert("Benachrichtigungen erfolgreich deaktiviert")
    } catch (error) {
      console.error("Fehler beim Deaktivieren der Benachrichtigungen:", error)
      alert("Fehler beim Deaktivieren der Benachrichtigungen")
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Push-Benachrichtigungen nicht verfügbar
          </CardTitle>
          <CardDescription>
            Dein Browser oder Gerät unterstützt keine Push-Benachrichtigungen. Bitte verwende einen modernen Browser
            oder installiere die App auf deinem Gerät.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Push-Benachrichtigungen
        </CardTitle>
        <CardDescription>
          Erhalte wichtige Updates zu Turnieren, Spielen und Vereinsnachrichten direkt auf dein Gerät
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {isSubscribed ? "Benachrichtigungen aktiviert" : "Benachrichtigungen deaktiviert"}
              </p>
              <p className="text-xs text-gray-600">
                {isSubscribed
                  ? "Du erhältst Push-Benachrichtigungen"
                  : "Aktiviere Benachrichtigungen, um Updates zu erhalten"}
              </p>
            </div>
          </div>
        </div>

        {permission === "denied" && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Benachrichtigungen wurden blockiert. Bitte erlaube Benachrichtigungen in deinen Browser-Einstellungen.
            </p>
          </div>
        )}

        {!user && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">Du musst angemeldet sein, um Benachrichtigungen zu aktivieren.</p>
          </div>
        )}

        <div className="flex gap-2">
          {!isSubscribed ? (
            <Button onClick={handleSubscribe} disabled={loading || !user || permission === "denied"} className="flex-1">
              <Bell className="w-4 h-4 mr-2" />
              {loading ? "Aktiviere..." : "Benachrichtigungen aktivieren"}
            </Button>
          ) : (
            <Button onClick={handleUnsubscribe} disabled={loading} variant="outline" className="flex-1 bg-transparent">
              <BellOff className="w-4 h-4 mr-2" />
              {loading ? "Deaktiviere..." : "Benachrichtigungen deaktivieren"}
            </Button>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>💡 Tipp: Installiere die App auf deinem Startbildschirm für das beste Erlebnis</p>
          <p>📱 iOS: Teilen → Zum Home-Bildschirm</p>
          <p>🤖 Android: Menü → App installieren</p>
        </div>
      </CardContent>
    </Card>
  )
}
