"use client"

import { useEffect, useState } from "react"
import { Bell, X, CheckCircle, AlertCircle } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export function PushNotificationDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true

    if (!isStandalone) {
      return
    }

    const delayTimer = setTimeout(() => {
      const isPushSupported = "serviceWorker" in navigator && "PushManager" in window
      setIsSupported(isPushSupported)

      if (isPushSupported && Notification.permission === "default") {
        setIsOpen(true)
      }
    }, 8000)

    return () => clearTimeout(delayTimer)
  }, [])

  const handleEnable = async () => {
    try {
      setStatus("loading")

      const permission = await Notification.requestPermission()

      if (permission !== "granted") {
        setStatus("error")
        setErrorMessage("Benachrichtigungen wurden abgelehnt")
        return
      }

      if (!("serviceWorker" in navigator)) {
        setStatus("error")
        setErrorMessage("Service Worker nicht unterstützt")
        return
      }

      const registration = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!vapidPublicKey) {
        setStatus("error")
        setErrorMessage("VAPID Key fehlt")
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      localStorage.setItem("pushSubscription", JSON.stringify(subscription))

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] API error:", errorData)
        setStatus("error")
        setErrorMessage(errorData.error || "Speichern fehlgeschlagen")
        return
      }

      const result = await response.json()
      console.log("[v0] Subscription erfolgreich gespeichert:", result)

      setStatus("success")
      setTimeout(() => {
        setIsOpen(false)
      }, 3000)
    } catch (error) {
      console.error("[v0] Error in handleEnable:", error)
      setStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Unbekannter Fehler")
    }
  }

  const handleDismiss = () => {
    setIsOpen(false)
  }

  if (!isOpen || !isSupported) {
    return null
  }

  if (status === "success") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" />
        <div className="relative bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4 z-50 text-center">
          <div className="flex justify-center">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Erfolgreich aktiviert!</h2>
          <p className="text-sm text-gray-600">Du erhältst jetzt Push-Benachrichtigungen für Live-Updates.</p>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" />
        <div className="relative bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4 z-50 text-center">
          <div className="flex justify-center">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Fehler</h2>
          <p className="text-sm text-gray-600">{errorMessage}</p>
          <button
            onClick={() => setStatus("idle")}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={handleDismiss} aria-hidden="true" />

      <div className="relative bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4 z-50">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3">
          <div className="bg-orange-100 p-2 rounded-full flex-shrink-0">
            <Bell className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bleib immer auf dem Laufenden</h2>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          Erhalte Push-Benachrichtigungen für Live-Scores, Turnierergebnisse und wichtige Updates direkt auf dein Gerät.
        </p>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleDismiss}
            disabled={status === "loading"}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Später
          </button>
          <button
            onClick={handleEnable}
            disabled={status === "loading"}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {status === "loading" ? "Lädt..." : "Aktivieren"}
          </button>
        </div>
      </div>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
