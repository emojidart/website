"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Bell, Send } from "lucide-react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default function SendNotificationPage() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [url, setUrl] = useState("/")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSend = async () => {
    if (!title || !body) {
      alert("Bitte fülle Titel und Nachricht aus")
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body,
          url,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        setTitle("")
        setBody("")
        setUrl("/")
        alert(`Benachrichtigung erfolgreich gesendet! ${data.sent} von ${data.total} Empfängern erreicht.`)
      } else {
        alert(`Fehler: ${data.error}`)
      }
    } catch (error) {
      console.error("Fehler beim Senden:", error)
      alert("Fehler beim Senden der Benachrichtigung")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Push-Benachrichtigung senden</h1>
          <p className="text-gray-600 mb-8">Sende eine Benachrichtigung an alle registrierten Benutzer</p>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Neue Benachrichtigung
              </CardTitle>
              <CardDescription>Erstelle und sende eine Push-Benachrichtigung an deine Benutzer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  placeholder="z.B. Neues Turnier!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={50}
                />
                <p className="text-xs text-gray-500">{title.length}/50 Zeichen</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Nachricht</Label>
                <Textarea
                  id="body"
                  placeholder="z.B. Das LION CUP Turnier startet heute um 19:00 Uhr"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500">{body.length}/200 Zeichen</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Link (optional)</Label>
                <Input
                  id="url"
                  placeholder="z.B. /tournament-series-app"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <p className="text-xs text-gray-500">Wohin soll der Benutzer weitergeleitet werden?</p>
              </div>

              <Button onClick={handleSend} disabled={loading || !title || !body} className="w-full" size="lg">
                <Send className="w-4 h-4 mr-2" />
                {loading ? "Sende..." : "Benachrichtigung senden"}
              </Button>

              {result && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-semibold mb-2">✅ Erfolgreich gesendet!</p>
                  <div className="text-xs text-green-700 space-y-1">
                    <p>Erfolgreich: {result.sent}</p>
                    <p>Fehlgeschlagen: {result.failed}</p>
                    <p>Gesamt: {result.total}</p>
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-semibold mb-2">💡 Beispiele für Benachrichtigungen:</p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>Turnier-Erinnerungen (1 Stunde vorher)</li>
                  <li>Live-Score-Updates</li>
                  <li>Neue Vereinsnachrichten</li>
                  <li>Spielplan-Änderungen</li>
                  <li>Ergebnisse und Ranglisten</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
