"use client"

import { useEffect, useState } from "react"
import { Bell, X } from "lucide-react"

export function PushNotificationDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true

    if (!isStandalone) {
      return // Don't show dialog in browser
    }

    const delayTimer = setTimeout(() => {
      const isPushSupported = "serviceWorker" in navigator && "PushManager" in window
      setIsSupported(isPushSupported)

      if (isPushSupported && Notification.permission === "default") {
        setIsOpen(true)
      }
    }, 8000) // 8 Sekunden nach App-Load

    return () => clearTimeout(delayTimer)
  }, [])

  const handleEnable = async () => {
    try {
      console.log("[v0] Push notification enable clicked")
      const permission = await Notification.requestPermission()
      console.log("[v0] Notification permission:", permission)

      if (permission === "granted") {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.register("/sw.js")
          console.log("[v0] Service worker registered:", registration)

          await navigator.serviceWorker.ready

          const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          console.log("[v0] VAPID Public Key exists:", !!vapidPublicKey)

          if (vapidPublicKey) {
            try {
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
              })

              console.log("[v0] Subscription created:", subscription)

              // Save to localStorage
              localStorage.setItem("pushSubscription", JSON.stringify(subscription))
              console.log("[v0] Subscription saved to localStorage")

              // Also save to API (for server-side storage)
              const response = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription),
              })
              console.log("[v0] API response:", response.status)
            } catch (subError) {
              console.error("[v0] Push subscription error:", subError)
            }
          } else {
            console.error("[v0] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set!")
          }
        }

        setIsOpen(false)
      }
    } catch (error) {
      console.error("[v0] Error requesting notification permission:", error)
    }
  }

  const handleDismiss = () => {
    setIsOpen(false)
  }

  if (!isOpen || !isSupported) {
    return null
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
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Später
          </button>
          <button
            onClick={handleEnable}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
          >
            Aktivieren
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
