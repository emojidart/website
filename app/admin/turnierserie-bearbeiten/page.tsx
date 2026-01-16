"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Trash2, AlertTriangle, Search, ChevronDown, ChevronUp, RefreshCw, ArrowRightLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface TournamentEntry {
  id: string
  tournament_id: string
  tournament_name: string
  tournament_date: string
  player_name: string
  placement: number
  legs_won: number
  legs_lost: number
  placement_points: number
  bonus_points: number
  added_at: string
}

interface GroupedTournament {
  tournament_id: string
  tournament_name: string
  tournament_date: string
  entries: TournamentEntry[]
}

type ActionTarget = {
  type: "entry" | "tournament"
  action: "delete" | "move"
  id: string
  name: string
  entries?: TournamentEntry[]
}

export default function AdminTurnierSeriePage() {
  const [entries, setEntries] = useState<TournamentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set())
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("tournament_series_standings")
        .select("*")
        .order("tournament_date", { ascending: false })
        .order("placement", { ascending: true })

      if (error) throw error
      setEntries(data || [])
    } catch (error) {
      console.error("Error fetching entries:", error)
      setMessage({ type: "error", text: "Fehler beim Laden der Daten" })
    } finally {
      setLoading(false)
    }
  }

  // Group entries by tournament
  const groupedTournaments: GroupedTournament[] = entries.reduce((acc: GroupedTournament[], entry) => {
    const existing = acc.find((t) => t.tournament_id === entry.tournament_id)
    if (existing) {
      existing.entries.push(entry)
    } else {
      acc.push({
        tournament_id: entry.tournament_id,
        tournament_name: entry.tournament_name,
        tournament_date: entry.tournament_date,
        entries: [entry],
      })
    }
    return acc
  }, [])

  // Filter tournaments based on search
  const filteredTournaments = groupedTournaments.filter((tournament) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      tournament.tournament_name?.toLowerCase().includes(searchLower) ||
      tournament.tournament_id?.toLowerCase().includes(searchLower) ||
      tournament.entries.some((e) => e.player_name?.toLowerCase().includes(searchLower))
    )
  })

  const toggleTournament = (tournamentId: string) => {
    const newExpanded = new Set(expandedTournaments)
    if (newExpanded.has(tournamentId)) {
      newExpanded.delete(tournamentId)
    } else {
      newExpanded.add(tournamentId)
    }
    setExpandedTournaments(newExpanded)
  }

  const handleDeleteEntry = async (entryId: string) => {
    setProcessing(true)
    try {
      const { error } = await supabase.from("tournament_series_standings").delete().eq("id", entryId)

      if (error) throw error

      setMessage({ type: "success", text: "Eintrag erfolgreich gelöscht!" })
      fetchEntries()
    } catch (error) {
      console.error("Error deleting entry:", error)
      setMessage({ type: "error", text: "Fehler beim Löschen des Eintrags" })
    } finally {
      setProcessing(false)
      setActionTarget(null)
    }
  }

  const handleDeleteTournament = async (tournamentId: string) => {
    setProcessing(true)
    try {
      const { error } = await supabase.from("tournament_series_standings").delete().eq("tournament_id", tournamentId)

      if (error) throw error

      setMessage({ type: "success", text: "Komplettes Turnier erfolgreich gelöscht!" })
      fetchEntries()
    } catch (error) {
      console.error("Error deleting tournament:", error)
      setMessage({ type: "error", text: "Fehler beim Löschen des Turniers" })
    } finally {
      setProcessing(false)
      setActionTarget(null)
    }
  }

  const handleMoveTournament = async (tournamentId: string, entriesToMove: TournamentEntry[]) => {
    setProcessing(true)
    try {
      // 1. Insert entries into buffalo_steel_cup_standings
      const newEntries = entriesToMove.map((entry) => ({
        tournament_id: entry.tournament_id,
        tournament_name: entry.tournament_name,
        tournament_date: entry.tournament_date,
        player_name: entry.player_name,
        placement: entry.placement,
        legs_won: entry.legs_won,
        legs_lost: entry.legs_lost,
        placement_points: entry.placement_points,
        bonus_points: entry.bonus_points,
      }))

      const { error: insertError } = await supabase.from("buffalo_steel_cup_standings").insert(newEntries)

      if (insertError) throw insertError

      // 2. Delete entries from tournament_series_standings
      const { error: deleteError } = await supabase
        .from("tournament_series_standings")
        .delete()
        .eq("tournament_id", tournamentId)

      if (deleteError) throw deleteError

      setMessage({
        type: "success",
        text: `Turnier mit ${entriesToMove.length} Einträgen erfolgreich zum Buffalo Steel Cup verschoben!`,
      })
      fetchEntries()
    } catch (error) {
      console.error("Error moving tournament:", error)
      setMessage({
        type: "error",
        text: "Fehler beim Verschieben des Turniers. Stelle sicher, dass die Tabelle buffalo_steel_cup_standings existiert.",
      })
    } finally {
      setProcessing(false)
      setActionTarget(null)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unbekannt"
    try {
      return new Date(dateString).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Lade Turnierserie-Einträge...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Admin: Turnierserie bereinigen</h1>
              <p className="text-red-100 mt-1">Turniere löschen oder zum Buffalo Steel Cup verschieben</p>
            </div>
            <Button onClick={fetchEntries} variant="secondary" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Aktualisieren
            </Button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
            <button onClick={() => setMessage(null)} className="float-right font-bold">
              ×
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-red-600">{groupedTournaments.length}</div>
            <div className="text-sm text-gray-600">Turniere</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{entries.length}</div>
            <div className="text-sm text-gray-600">Einträge gesamt</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{new Set(entries.map((e) => e.player_name)).size}</div>
            <div className="text-sm text-gray-600">Spieler</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {entries.reduce((sum, e) => sum + (e.placement_points || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Punkte gesamt</div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Suche nach Turnier-ID, Name oder Spieler..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 flex items-start gap-3">
          <ArrowRightLeft className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-800">Turniere verschieben</h3>
            <p className="text-blue-700 text-sm">
              Du kannst komplette Turniere zum <strong>Buffalo Steel Cup</strong> verschieben. Die Einträge werden in
              die neue Tabelle kopiert und dann aus der Lion Cup Tabelle entfernt.
            </p>
          </div>
        </div>

        {/* Tournament List */}
        <div className="space-y-4">
          {filteredTournaments.map((tournament) => (
            <div
              key={tournament.tournament_id}
              className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200"
            >
              {/* Tournament Header */}
              <div
                className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleTournament(tournament.tournament_id)}
              >
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    {expandedTournaments.has(tournament.tournament_id) ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {tournament.tournament_name || "Unbenanntes Turnier"}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>ID: {tournament.tournament_id}</span>
                        <span>Datum: {formatDate(tournament.tournament_date)}</span>
                        <span>{tournament.entries.length} Spieler</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActionTarget({
                          type: "tournament",
                          action: "move",
                          id: tournament.tournament_id,
                          name: tournament.tournament_name || tournament.tournament_id,
                          entries: tournament.entries,
                        })
                      }}
                      className="flex items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                      Zu Buffalo Cup
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActionTarget({
                          type: "tournament",
                          action: "delete",
                          id: tournament.tournament_id,
                          name: tournament.tournament_name || tournament.tournament_id,
                        })
                      }}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Löschen
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tournament Entries */}
              {expandedTournaments.has(tournament.tournament_id) && (
                <div className="border-t border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-600">Platz</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-600">Spieler</th>
                        <th className="px-4 py-2 text-center text-xs font-bold text-gray-600">Punkte</th>
                        <th className="px-4 py-2 text-center text-xs font-bold text-gray-600">Legs</th>
                        <th className="px-4 py-2 text-center text-xs font-bold text-gray-600">Bonus</th>
                        <th className="px-4 py-2 text-right text-xs font-bold text-gray-600">Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournament.entries
                        .sort((a, b) => a.placement - b.placement)
                        .map((entry) => (
                          <tr key={entry.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                  entry.placement === 1
                                    ? "bg-yellow-400 text-white"
                                    : entry.placement === 2
                                      ? "bg-gray-300 text-white"
                                      : entry.placement === 3
                                        ? "bg-amber-600 text-white"
                                        : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {entry.placement}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium">{entry.player_name}</td>
                            <td className="px-4 py-3 text-center">{entry.placement_points}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-green-600">{entry.legs_won}</span>
                              {" / "}
                              <span className="text-red-600">{entry.legs_lost}</span>
                            </td>
                            <td className="px-4 py-3 text-center">{entry.bonus_points || 0}</td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setActionTarget({
                                    type: "entry",
                                    action: "delete",
                                    id: entry.id,
                                    name: `${entry.player_name} (Platz ${entry.placement})`,
                                  })
                                }
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredTournaments.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">Keine Turniere gefunden</div>
        )}
      </div>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={!!actionTarget} onOpenChange={() => setActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle
              className={`flex items-center gap-2 ${actionTarget?.action === "move" ? "text-blue-600" : "text-red-600"}`}
            >
              {actionTarget?.action === "move" ? (
                <>
                  <ArrowRightLeft className="h-5 w-5" />
                  Turnier verschieben?
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5" />
                  {actionTarget?.type === "tournament" ? "Turnier löschen?" : "Eintrag löschen?"}
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget?.action === "move" ? (
                <>
                  Möchtest du das Turnier <strong>{actionTarget?.name}</strong> mit{" "}
                  <strong>{actionTarget?.entries?.length} Spielern</strong> zum <strong>Buffalo Steel Cup</strong>{" "}
                  verschieben? Die Einträge werden aus der Lion Cup Tabelle entfernt und in die Buffalo Steel Cup
                  Tabelle eingefügt.
                </>
              ) : actionTarget?.type === "tournament" ? (
                <>
                  Bist du sicher, dass du das komplette Turnier <strong>{actionTarget?.name}</strong> und alle
                  zugehörigen Spieler-Einträge löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden!
                </>
              ) : (
                <>
                  Bist du sicher, dass du den Eintrag <strong>{actionTarget?.name}</strong> löschen möchtest? Diese
                  Aktion kann nicht rückgängig gemacht werden!
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (actionTarget?.action === "move" && actionTarget.entries) {
                  handleMoveTournament(actionTarget.id, actionTarget.entries)
                } else if (actionTarget?.action === "delete") {
                  if (actionTarget.type === "tournament") {
                    handleDeleteTournament(actionTarget.id)
                  } else {
                    handleDeleteEntry(actionTarget.id)
                  }
                }
              }}
              disabled={processing}
              className={
                actionTarget?.action === "move" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
              }
            >
              {processing
                ? actionTarget?.action === "move"
                  ? "Wird verschoben..."
                  : "Wird gelöscht..."
                : actionTarget?.action === "move"
                  ? "Verschieben"
                  : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
