"use client"

import { useState, useEffect } from "react"
import { Bell, Send, CheckCircle, XCircle } from "lucide-react"

export default function PushTestPage() {
  const [title, setTitle] = useState("EMD Dart")
  const [body, setBody] = useState("Test Benachrichtigung")
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [subscriptionCount, setSubscriptionCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const checkSubscriptions = async () => {
      try {
        const response = await fetch("/api/push/check")
        const data = await response.json()
        console.log("[v0] Push check response:", data)

        if (!data.success) {
          setErrorMessage("Fehler beim Abrufen der Subscriptions: " + data.error)
          setSubscriptionCount(0)
        } else {
          setSubscriptionCount(data.count || 0)
          if (data.count && data.count > 0) {
            setErrorMessage("")
          } else {
            setErrorMessage("Keine Push-Subscription gefunden. Bitte aktiviere zuerst Push-Benachrichtigungen.")
          }
        }
      } catch (error) {
        console.error("[v0] Error checking subscriptions:", error)
        setErrorMessage("Fehler beim Überprüfen der Subscriptions")
      }
    }
    checkSubscriptions()
  }, [])

  const handleSendTest = async () => {
    setStatus("sending")
    setMessage("")

    try {
      const response = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          data: { url: "/" },
        }),
      })

      const result = await response.json()

      if (result.success) {
        setStatus("success")
        setMessage(`Push-Benachrichtigung erfolgreich an ${result.successCount} Geräte gesendet!`)
      } else {
        setStatus("error")
        setMessage(result.error || "Fehler beim Senden der Benachrichtigung")
      }
    } catch (error) {
      setStatus("error")
      setMessage("Fehler beim Senden der Benachrichtigung: " + (error as Error).message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="bg-orange-100 p-3 rounded-full">
              <Bell className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Push Notification Test</h1>
              <p className="text-sm text-gray-600">Aktive Subscriptions: {subscriptionCount}</p>
            </div>
          </div>

          {errorMessage && subscriptionCount === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Titel
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Benachrichtigungstitel"
              />
            </div>

            <div>
              <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-2">
                Nachricht
              </label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Benachrichtigungstext"
              />
            </div>

            {/* Status Message */}
            {status !== "idle" && (
              <div
                className={`flex items-start gap-3 p-4 rounded-lg ${
                  status === "success"
                    ? "bg-green-50 text-green-800"
                    : status === "error"
                      ? "bg-red-50 text-red-800"
                      : "bg-blue-50 text-blue-800"
                }`}
              >
                {status === "success" && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                {status === "error" && <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                <p className="text-sm">{message}</p>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSendTest}
              disabled={status === "sending" || subscriptionCount === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
              {status === "sending" ? "Wird gesendet..." : "Test-Benachrichtigung senden"}
            </button>
          </div>

          {/* Instructions */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Anleitung:</h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Installiere die App auf deinem Handy</li>
              <li>Aktiviere Push-Benachrichtigungen im Dialog</li>
              <li>Gib einen Titel und eine Nachricht ein</li>
              <li>Klicke auf "Test-Benachrichtigung senden"</li>
              <li>Du solltest eine Push-Benachrichtigung auf deinem Gerät erhalten</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
