"use client"

import { useEffect, useState } from "react"
import { Bell, X } from "lucide-react"

export function PushNotificationDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if push notifications are supported
    const isPushSupported = "serviceWorker" in navigator && "PushManager" in window
    setIsSupported(isPushSupported)

    // Check if notifications have already been requested
    if (isPushSupported && Notification.permission === "default") {
      // Show dialog only if user hasn't responded yet
      setIsOpen(true)
    }
  }, [])

  const handleEnable = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        console.log("[v0] Push notifications enabled")
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={handleDismiss} aria-hidden="true" />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4 z-50">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with icon */}
        <div className="flex items-start gap-3">
          <div className="bg-orange-100 p-2 rounded-full flex-shrink-0">
            <Bell className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bleib immer auf dem Laufenden</h2>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600">
          Erhalte Push-Benachrichtigungen für Live-Scores, Turnierergebnisse und wichtige Updates direkt auf dein Gerät.
        </p>

        {/* Buttons */}
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
