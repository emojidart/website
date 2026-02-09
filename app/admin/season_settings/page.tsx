"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Info,
  Split,
  Trophy,
  Users,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

interface SeasonSettings {
  halving_active: boolean
  halving_date: string | null
  division_active: boolean
  division_date: string | null
}

interface Player {
  player_id: string
  player_name: string
  total_points: number
  division: string | null
  tournaments_played: number
}

export default function AdminPage() {
  const [settings, setSettings] = useState<SeasonSettings>({
    halving_active: false,
    halving_date: null,
    division_active: false,
    division_date: null,
  })
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigningDivisions, setAssigningDivisions] = useState(false)

  useEffect(() => {
    fetchSettings()
    fetchPlayers()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from("season_settings").select("*").eq("id", 1).single()

      if (error) throw error

      if (data) {
        setSettings({
          halving_active: data.halving_active ?? false,
          halving_date: data.halving_date,
          division_active: data.division_active ?? false,
          division_date: data.division_date,
        })
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      toast.error("Fehler beim Laden der Einstellungen")
    } finally {
      setLoading(false)
    }
  }

  const fetchPlayers = async () => {
    try {
      // 1. Hole alle Spieler mit Punkten aus dem aggregierten View
      const { data: aggregatedData, error: aggError } = await supabase
        .from("tournament_series_aggregated")
        .select("player_name, total_points, tournaments_played")
        .order("total_points", { ascending: false })

      if (aggError) throw aggError

      // 2. Hole alle Spieler mit ihren IDs aus der spieldatenbank Tabelle
      const { data: playersData, error: playersError } = await supabase.from("spieldatenbank").select("id, name")

      if (playersError) throw playersError

      // 3. Hole alle Division-Zuweisungen
      const { data: divisionsData, error: divError } = await supabase
        .from("player_divisions")
        .select("player_id, division")

      if (divError) throw divError

      // 4. Kombiniere die Daten
      const combinedPlayers: Player[] = (aggregatedData || []).map((aggPlayer) => {
        // Finde die player_id anhand des Namens (case-insensitive und trimmed)
        const playerRecord = playersData?.find(
          (p) => p.name?.trim().toLowerCase() === aggPlayer.player_name?.trim().toLowerCase(),
        )
        const playerId = playerRecord?.id || ""

        // Finde die Division für diesen Spieler
        const divisionRecord = divisionsData?.find((d) => d.player_id === playerId)

        return {
          player_id: playerId,
          player_name: aggPlayer.player_name,
          total_points: aggPlayer.total_points,
          division: divisionRecord?.division || null,
          tournaments_played: aggPlayer.tournaments_played || 0,
        }
      })

      setPlayers(combinedPlayers)
    } catch (error) {
      console.error("Error fetching players:", error)
      toast.error("Fehler beim Laden der Spieler")
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

      setSettings((prev) => ({
        ...prev,
        halving_active: newActive,
        halving_date: newDate,
      }))

      toast.success(newActive ? "Punktehalbierung aktiviert!" : "Punktehalbierung deaktiviert!")
    } catch (error) {
      console.error("Error updating settings:", error)
      toast.error("Fehler beim Speichern der Einstellungen")
    } finally {
      setSaving(false)
    }
  }

  const toggleDivision = async () => {
    setSaving(true)
    try {
      const newActive = !settings.division_active
      const newDate = newActive && !settings.division_date ? new Date().toISOString() : settings.division_date

      const { error } = await supabase
        .from("season_settings")
        .update({
          division_active: newActive,
          division_date: newDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1)

      if (error) throw error

      setSettings((prev) => ({
        ...prev,
        division_active: newActive,
        division_date: newDate,
      }))

      toast.success(newActive ? "Tabellenteilung aktiviert!" : "Tabellenteilung deaktiviert!")
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

      setSettings((prev) => ({
        ...prev,
        halving_date: newDate,
      }))

      toast.success("Halbierungs-Datum auf jetzt zurückgesetzt!")
    } catch (error) {
      console.error("Error resetting date:", error)
      toast.error("Fehler beim Zurücksetzen des Datums")
    } finally {
      setSaving(false)
    }
  }

  const autoAssignDivisions = async () => {
    setAssigningDivisions(true)
    try {
      // Spieler nach Punkten sortieren (bereits sortiert)
      const sortedPlayers = [...players]
      const totalPlayers = sortedPlayers.length
      const halfPoint = Math.ceil(totalPlayers / 2)

      // Zuerst alle bestehenden Divisionen löschen
      const playerIds = sortedPlayers.map((p) => p.player_id).filter((id) => id)
      if (playerIds.length > 0) {
        const { error: deleteError } = await supabase.from("player_divisions").delete().in("player_id", playerIds)

        if (deleteError) throw deleteError
      }

      // Neue Divisionen einfügen
      const newDivisions = sortedPlayers
        .filter((p) => p.player_id) // Nur Spieler mit gültiger ID
        .map((player, index) => ({
          player_id: player.player_id,
          division: index < halfPoint ? "A" : "B",
          total_points_at_split: player.total_points,
          placement_at_split: index + 1,
          assigned_at: new Date().toISOString(),
        }))

      if (newDivisions.length > 0) {
        const { error: insertError } = await supabase.from("player_divisions").insert(newDivisions)

        if (insertError) throw insertError
      }

      // Spieler neu laden
      await fetchPlayers()

      toast.success(
        `Divisionen automatisch zugewiesen! ${halfPoint} Spieler in A, ${totalPlayers - halfPoint} Spieler in B`,
      )
    } catch (error) {
      console.error("Error assigning divisions:", error)
      toast.error("Fehler beim Zuweisen der Divisionen")
    } finally {
      setAssigningDivisions(false)
    }
  }

  const updatePlayerDivision = async (playerId: string, newDivision: string | null) => {
    if (!playerId) {
      toast.error("Spieler-ID nicht gefunden")
      return
    }

    try {
      if (newDivision === null) {
        // Division entfernen
        const { error } = await supabase.from("player_divisions").delete().eq("player_id", playerId)

        if (error) throw error
      } else {
        // Prüfen ob schon ein Eintrag existiert
        const { data: existing } = await supabase.from("player_divisions").select("id").eq("player_id", playerId).maybeSingle()

        if (existing) {
          // Update
          const { error } = await supabase.from("player_divisions").update({ division: newDivision }).eq("player_id", playerId)

          if (error) throw error
        } else {
          // Insert
          const player = players.find((p) => p.player_id === playerId)
          const { error } = await supabase.from("player_divisions").insert({
            player_id: playerId,
            division: newDivision,
            total_points_at_split: player?.total_points || 0,
            placement_at_split: players.indexOf(player!) + 1,
            assigned_at: new Date().toISOString(),
          })

          if (error) throw error
        }
      }

      setPlayers((prev) => prev.map((p) => (p.player_id === playerId ? { ...p, division: newDivision } : p)))

      toast.success("Division aktualisiert!")
    } catch (error) {
      console.error("Error updating player division:", error)
      toast.error("Fehler beim Aktualisieren")
    }
  }

  const clearAllDivisions = async () => {
    setAssigningDivisions(true)
    try {
      const { error } = await supabase.from("player_divisions").delete().neq("id", 0) // Lösche alle Einträge

      if (error) throw error

      await fetchPlayers()
      toast.success("Alle Divisionen zurückgesetzt!")
    } catch (error) {
      console.error("Error clearing divisions:", error)
      toast.error("Fehler beim Zurücksetzen")
    } finally {
      setAssigningDivisions(false)
    }
  }

  const playersInA = players.filter((p) => p.division === "A")
  const playersInB = players.filter((p) => p.division === "B")
  const playersUnassigned = players.filter((p) => !p.division)

  if (loading) {
    return (
      <div className="w-full max-w-none">
        <div className="flex items-center justify-center gap-2 py-12">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Lädt...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-none">
      <div className="w-full max-w-none px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin-Bereich</h1>
          <p className="text-gray-600">Verwaltung der LION CUP -Einstellungen</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Linke Spalte: Einstellungen */}
          <div className="space-y-6">
            {/* Info Alert */}
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Saisonverlauf</strong>
                <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
                  <li>Nach Spieltag 17: Punktehalbierung aktivieren</li>
                  <li>Nach Spieltag 24: Tabellenteilung aktivieren</li>
                  <li>Obere Tabelle (A) = Meisterrunde</li>
                  <li>Untere Tabelle (B) = Platzierungsrunde</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Punktehalbierung Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Punktehalbierung
                </CardTitle>
                <CardDescription>Nach Spieltag 17 - Punkte werden halbiert</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-900">Halbierung aktiv</div>
                    <div className="text-sm text-gray-600">
                      {settings.halving_active ? "Punktehalbierung ist eingeschaltet" : "Punktehalbierung ist ausgeschaltet"}
                    </div>
                  </div>
                  <Switch checked={settings.halving_active} onCheckedChange={toggleHalving} disabled={saving} />
                </div>

                {settings.halving_active && settings.halving_date && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm text-green-900">
                      <strong>Aktiv seit:</strong>{" "}
                      {new Date(settings.halving_date).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                )}

                {settings.halving_date && (
                  <Button onClick={resetHalvingDate} disabled={saving} variant="outline" size="sm" className="w-full bg-transparent">
                    Datum auf JETZT zurücksetzen
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Tabellenteilung Card */}
            <Card className="border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <Split className="h-5 w-5" />
                  Tabellenteilung (A/B)
                </CardTitle>
                <CardDescription>Nach Spieltag 24 - Tabelle wird in zwei Gruppen geteilt</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-900">Getrennte Tabellen</div>
                    <div className="text-sm text-gray-600">{settings.division_active ? "A/B Tabellen sind aktiv" : "Gesamttabelle wird angezeigt"}</div>
                  </div>
                  <Switch checked={settings.division_active} onCheckedChange={toggleDivision} disabled={saving} />
                </div>

                {settings.division_active && (
                  <Alert className="border-purple-200 bg-purple-50">
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-purple-900">
                      <strong>Tabellenteilung ist aktiv!</strong>
                      <div className="mt-1 text-sm">Spieler können nicht mehr zwischen A und B wechseln.</div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Statistiken */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                    <Trophy className="h-4 w-4 mx-auto text-amber-600 mb-1" />
                    <div className="text-lg font-bold text-amber-900">{playersInA.length}</div>
                    <div className="text-xs text-amber-700">Tabelle A</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                    <Users className="h-4 w-4 mx-auto text-slate-600 mb-1" />
                    <div className="text-lg font-bold text-slate-900">{playersInB.length}</div>
                    <div className="text-xs text-slate-700">Tabelle B</div>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <Users className="h-4 w-4 mx-auto text-gray-500 mb-1" />
                    <div className="text-lg font-bold text-gray-700">{playersUnassigned.length}</div>
                    <div className="text-xs text-gray-500">Nicht zugeteilt</div>
                  </div>
                </div>

                {/* Aktionen */}
                <div className="space-y-2">
                  <Button onClick={autoAssignDivisions} disabled={assigningDivisions || players.length === 0} className="w-full">
                    {assigningDivisions ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Split className="h-4 w-4 mr-2" />}
                    Automatisch nach Punkten aufteilen
                  </Button>
                  <Button onClick={clearAllDivisions} disabled={assigningDivisions} variant="outline" className="w-full bg-transparent">
                    Alle Divisionen zurücksetzen
                  </Button>
                </div>
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
                <ul className="ml-4 list-disc space-y-1">
                  <li>Division-Zuteilung erfolgt einmalig nach Spieltag 24</li>
                  <li>Bei ungerader Spieleranzahl kommt der mittlere Spieler in Tabelle A</li>
                  <li>Manuelle Korrekturen sind jederzeit möglich</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Rechte Spalte: Zwei Tabellen A und B */}
          <div className="space-y-6">
            {/* Tabelle A - Meisterrunde */}
            <Card className="border-2 border-amber-300">
              <CardHeader className="bg-amber-50 border-b border-amber-200">
                <CardTitle className="flex items-center gap-2 text-amber-900">
                  <Trophy className="h-5 w-5" />
                  Tabelle A - Meisterrunde
                  <Badge className="ml-auto bg-amber-500">{playersInA.length} Spieler</Badge>
                </CardTitle>
                <CardDescription>Obere Hälfte nach Punkten</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[300px] overflow-y-auto">
                  {playersInA.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">Noch keine Spieler in Tabelle A</div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-amber-50 sticky top-0">
                        <tr className="text-xs text-amber-700">
                          <th className="p-2 text-left">#</th>
                          <th className="p-2 text-left">Spieler</th>
                          <th className="p-2 text-right">Punkte</th>
                          <th className="p-2 text-center">Antritte</th>
                          <th className="p-2 text-center">Aktion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playersInA.map((player, index) => (
                          <tr
                            key={player.player_id}
                            className={`border-b border-amber-100 hover:bg-amber-50 ${
                              player.tournaments_played >= 20 ? "bg-green-100" : "bg-red-100"
                            }`}
                          >
                            <td className="p-2 text-sm text-gray-500">{index + 1}</td>
                            <td className="p-2 font-medium">{player.player_name}</td>
                            <td className="p-2 text-right font-semibold text-amber-700">{player.total_points}</td>
                            <td className="p-2 text-center">
                              <span
                                className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold ${
                                  player.tournaments_played >= 20 ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                }`}
                              >
                                {player.tournaments_played}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updatePlayerDivision(player.player_id, "B")}
                                className="h-7 px-2 text-xs bg-transparent hover:bg-slate-100"
                              >
                                <ArrowDown className="h-3 w-3 mr-1" />
                                Nach B
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabelle B - Platzierungsrunde */}
            <Card className="border-2 border-slate-300">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Users className="h-5 w-5" />
                  Tabelle B - Platzierungsrunde
                  <Badge variant="secondary" className="ml-auto">
                    {playersInB.length} Spieler
                  </Badge>
                </CardTitle>
                <CardDescription>Untere Hälfte nach Punkten</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[300px] overflow-y-auto">
                  {playersInB.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">Noch keine Spieler in Tabelle B</div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr className="text-xs text-slate-700">
                          <th className="p-2 text-left">#</th>
                          <th className="p-2 text-left">Spieler</th>
                          <th className="p-2 text-right">Punkte</th>
                          <th className="p-2 text-center">Antritte</th>
                          <th className="p-2 text-center">Aktion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playersInB.map((player, index) => (
                          <tr
                            key={player.player_id}
                            className={`border-b border-slate-100 hover:bg-slate-50 ${
                              player.tournaments_played >= 20 ? "bg-green-100" : "bg-red-100"
                            }`}
                          >
                            <td className="p-2 text-sm text-gray-500">{index + 1}</td>
                            <td className="p-2 font-medium">{player.player_name}</td>
                            <td className="p-2 text-right font-semibold text-slate-700">{player.total_points}</td>
                            <td className="p-2 text-center">
                              <span
                                className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold ${
                                  player.tournaments_played >= 20 ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                }`}
                              >
                                {player.tournaments_played}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updatePlayerDivision(player.player_id, "A")}
                                className="h-7 px-2 text-xs bg-transparent hover:bg-amber-100"
                              >
                                <ArrowUp className="h-3 w-3 mr-1" />
                                Nach A
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Nicht zugeteilte Spieler */}
            {playersUnassigned.length > 0 && (
              <Card className="border-2 border-dashed border-gray-300">
                <CardHeader className="bg-gray-50 border-b border-gray-200">
                  <CardTitle className="flex items-center gap-2 text-gray-700">
                    <Users className="h-5 w-5" />
                    Nicht zugeteilt
                    <Badge variant="outline" className="ml-auto">
                      {playersUnassigned.length} Spieler
                    </Badge>
                  </CardTitle>
                  <CardDescription>Diese Spieler müssen noch einer Tabelle zugeordnet werden</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[250px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="text-xs text-gray-600">
                          <th className="p-2 text-left">#</th>
                          <th className="p-2 text-left">Spieler</th>
                          <th className="p-2 text-right">Punkte</th>
                          <th className="p-2 text-center">Antritte</th>
                          <th className="p-2 text-center">Zuweisen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playersUnassigned.map((player, index) => (
                          <tr
                            key={player.player_id || player.player_name}
                            className={`border-b border-gray-100 hover:bg-gray-50 ${
                              player.tournaments_played >= 20 ? "bg-green-100" : "bg-red-100"
                            }`}
                          >
                            <td className="p-2 text-sm text-gray-500">{index + 1}</td>
                            <td className="p-2 font-medium">{player.player_name}</td>
                            <td className="p-2 text-right font-semibold">{player.total_points}</td>
                            <td className="p-2 text-center">
                              <span
                                className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold ${
                                  player.tournaments_played >= 20 ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                }`}
                              >
                                {player.tournaments_played}
                              </span>
                            </td>
                            <td className="p-2">
                              <div className="flex justify-center gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => updatePlayerDivision(player.player_id, "A")}
                                  className="h-7 px-3 text-xs bg-amber-500 hover:bg-amber-600"
                                >
                                  A
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => updatePlayerDivision(player.player_id, "B")}
                                  className="h-7 px-3 text-xs"
                                >
                                  B
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info was Zurücksetzen macht */}
            <Alert className="border-gray-200 bg-gray-50">
              <Info className="h-4 w-4 text-gray-600" />
              <AlertDescription className="text-gray-700 text-sm">
                <strong>"Alle Divisionen zurücksetzen"</strong> löscht nur die A/B Zuordnung der Spieler. Alle Turnierdaten, Punkte und Ergebnisse bleiben vollständig erhalten!
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  )
}
