"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import { toast } from "sonner"

interface SeasonSettings {
  halving_active: boolean
  halving_date: string | null
}

export default function AdminPage() {
  const [settings, setSettings] = useState<SeasonSettings>({
    halving_active: false,
    halving_date: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from("season_settings").select("*").eq("id", 1).single()

      if (error) throw error

      if (data) {
        setSettings({
          halving_active: data.halving_active,
          halving_date: data.halving_date,
        })
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      toast.error("Fehler beim Laden der Einstellungen")
    } finally {
      setLoading(false)
    }
  }

  const toggleHalving = async () => {
    setSaving(true)
    try {
      const newActive = !settings.halving_active
      const newDate = newActive && !settings.halving_date ? new Date().toISOString() : settings.halving_date

      const { error } = await supabase
        .from("season_settings")
        .update({
          halving_active: newActive,
          halving_date: newDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1)

      if (error) throw error

      setSettings({
        halving_active: newActive,
        halving_date: newDate,
      })

      toast.success(newActive ? "Punktehalbierung aktiviert!" : "Punktehalbierung deaktiviert!")
    } catch (error) {
      console.error("Error updating settings:", error)
      toast.error("Fehler beim Speichern der Einstellungen")
    } finally {
      setSaving(false)
    }
  }

  const resetHalvingDate = async () => {
    setSaving(true)
    try {
      const newDate = new Date().toISOString()

      const { error } = await supabase
        .from("season_settings")
        .update({
          halving_date: newDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1)

      if (error) throw error

      setSettings({
        ...settings,
        halving_date: newDate,
      })

      toast.success("Halbierungs-Datum auf jetzt zurückgesetzt!")
    } catch (error) {
      console.error("Error resetting date:", error)
      toast.error("Fehler beim Zurücksetzen des Datums")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">Lädt...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin-Bereich</h1>
          <p className="text-gray-600">Verwaltung der Saison-Einstellungen</p>
        </div>

        <div className="space-y-6">
          {/* Info Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Wie funktioniert die Punktehalbierung?</strong>
              <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
                <li>Alle Turniere VOR dem Halbierungs-Datum zählen nur 50% der Punkte</li>
                <li>Neue Turniere NACH dem Datum zählen 100%</li>
                <li>Die Original-Daten bleiben unverändert und sicher</li>
                <li>Die Halbierung kann jederzeit aktiviert/deaktiviert werden</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Main Control Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Punktehalbierung
              </CardTitle>
              <CardDescription>Aktiviere die Halbierung, um die Saison spannender zu gestalten</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Toggle Switch */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-semibold text-gray-900">Halbierung aktiv</div>
                  <div className="text-sm text-gray-600">
                    {settings.halving_active
                      ? "Punktehalbierung ist eingeschaltet"
                      : "Punktehalbierung ist ausgeschaltet"}
                  </div>
                </div>
                <Switch checked={settings.halving_active} onCheckedChange={toggleHalving} disabled={saving} />
              </div>

              {/* Status Display */}
              {settings.halving_active ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    <strong>Punktehalbierung ist aktiv!</strong>
                    <div className="mt-2 text-sm">
                      Turniere vor dem{" "}
                      <strong>
                        {settings.halving_date
                          ? new Date(settings.halving_date).toLocaleString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "unbekannt"}
                      </strong>{" "}
                      zählen nur 50%.
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-gray-200 bg-gray-50">
                  <AlertTriangle className="h-4 w-4 text-gray-600" />
                  <AlertDescription className="text-gray-700">
                    Punktehalbierung ist deaktiviert. Alle Turniere zählen 100%.
                  </AlertDescription>
                </Alert>
              )}

              {/* Halving Date Info */}
              {settings.halving_date && (
                <div className="space-y-3">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-sm font-semibold text-yellow-900 mb-1">Halbierungs-Datum</div>
                    <div className="text-lg font-bold text-yellow-800">
                      {new Date(settings.halving_date).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="text-xs text-yellow-700 mt-1">
                      Turniere vor diesem Zeitpunkt werden bei aktiver Halbierung mit 50% gewertet
                    </div>
                  </div>

                  <Button
                    onClick={resetHalvingDate}
                    disabled={saving}
                    variant="outline"
                    className="w-full bg-transparent"
                  >
                    Halbierungs-Datum auf JETZT zurücksetzen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warning Card */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Wichtig
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-orange-800 space-y-2">
              <p>
                <strong>Diese Funktion ist 100% sicher:</strong>
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Keine Turnier- oder Spielerdaten werden verändert</li>
                <li>Die Berechnung erfolgt nur bei der Anzeige</li>
                <li>Du kannst die Halbierung jederzeit zurücksetzen</li>
                <li>Bei Problemen einfach ausschalten - alles ist wieder normal</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
