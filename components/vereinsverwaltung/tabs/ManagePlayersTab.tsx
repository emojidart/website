"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Edit, Loader2, Trash2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ClubPlayer } from "@/components/vereinsverwaltung/types"

type Props = {
  visiblePlayers: ClubPlayer[]
  clubPlayersCount: number
  playerLoading: boolean

  playerSearch: string
  setPlayerSearch: (v: string) => void
  playerSortKey: "name" | "number" | "birthdate" | "city"
  setPlayerSortKey: (v: "name" | "number" | "birthdate" | "city") => void
  playerSortDir: "asc" | "desc"
  setPlayerSortDir: (v: "asc" | "desc") => void

  onEditPlayer: (player: ClubPlayer) => void
  onDeletePlayer: (playerId: string, photoUrl: string | null) => void
}

function fmtDateISO(d: string | null | undefined) {
  if (!d) return "—"

  // Accept: "YYYY-MM-DD" (from DATE), or ISO strings like "YYYY-MM-DDTHH:mm:ss..."
  const s = String(d)
  const iso = s.includes("T") ? s.split("T")[0] : s

  // If it's not ISO-date, just return as-is
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return s

  const [y, m, day] = iso.split("-")
  return `${day}.${m}.${y}` // dd.mm.yyyy
}

export function ManagePlayersTab(props: Props) {
  const {
    visiblePlayers,
    clubPlayersCount,
    playerLoading,
    playerSearch,
    setPlayerSearch,
    playerSortKey,
    setPlayerSortKey,
    playerSortDir,
    setPlayerSortDir,
    onEditPlayer,
    onDeletePlayer,
  } = props

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null)
  const [deletePlayerName, setDeletePlayerName] = useState<string>("")
  const [deletePlayerPhotoUrl, setDeletePlayerPhotoUrl] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState("")

  function openDelete(player: ClubPlayer) {
    setDeletePlayerId(player.id)
    setDeletePlayerName(player.name)
    setDeletePlayerPhotoUrl(player.photo_url ?? null)
    setConfirmText("")
    setDeleteOpen(true)
  }

  function closeDelete() {
    setDeleteOpen(false)
    setDeletePlayerId(null)
    setDeletePlayerName("")
    setDeletePlayerPhotoUrl(null)
    setConfirmText("")
  }

  function confirmDelete() {
    if (!deletePlayerId) return
    onDeletePlayer(deletePlayerId, deletePlayerPhotoUrl)
    closeDelete()
  }

  const mustType = "LÖSCHEN"
  const canDelete = confirmText.trim().toUpperCase() === mustType

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Spieler verwalten</h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <Label htmlFor="playerSearch">Suchen</Label>
          <Input
            id="playerSearch"
            type="text"
            value={playerSearch}
            onChange={(e) => setPlayerSearch(e.target.value)}
            placeholder="Name, Ort, E-Mail, Nummer ..."
            className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50 mt-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Sortierung</Label>
            <Select value={playerSortKey} onValueChange={(v) => setPlayerSortKey(v as any)}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50 mt-2">
                <SelectValue placeholder="Sortieren nach" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="number">Nummer</SelectItem>
                <SelectItem value="birthdate">Geburtsdatum</SelectItem>
                <SelectItem value="city">Ort</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Richtung</Label>
            <Select value={playerSortDir} onValueChange={(v) => setPlayerSortDir(v as any)}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50 mt-2">
                <SelectValue placeholder="Richtung" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Aufsteigend</SelectItem>
                <SelectItem value="desc">Absteigend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {clubPlayersCount === 0 ? (
        <p className="text-sm text-gray-500">Noch keine Spieler vorhanden.</p>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Spieler</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Nr.</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Geburtsdatum</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Straße</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Nr.</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">PLZ</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Ort</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700 text-right">Aktionen</th>
              </tr>
            </thead>

            <tbody>
              {visiblePlayers.map((player, idx) => (
                <tr
                  key={player.id}
                  className={cn("border-t border-gray-200 hover:bg-gray-50/60", idx % 2 === 1 && "bg-gray-50/30")}
                >
                  <td className="px-3 py-2 lg:px-4 lg:py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={player.photo_url || "/placeholder.svg?height=32&width=32&query=player-avatar"} />
                        <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-gray-800">{player.name}</span>
                    </div>
                  </td>

                  <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">{player.player_number ?? "—"}</td>
                  <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">{fmtDateISO(player.birthdate)}</td>
                  <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">{player.street ?? "—"}</td>
                  <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">{player.house_number ?? "—"}</td>
                  <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">{player.postal_code ?? "—"}</td>
                  <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">{player.city ?? "—"}</td>

                  <td className="px-3 py-2 lg:px-4 lg:py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditPlayer(player)}
                        disabled={playerLoading}
                        className="h-8 px-3 text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Bearbeiten</span>
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDelete(player)}
                        disabled={playerLoading}
                        className="h-8 px-3"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Löschen</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => !playerLoading && closeDelete()}
          />
          <div className="absolute left-1/2 top-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-base font-semibold text-gray-900">Spieler löschen</h5>
                    <p className="text-sm text-gray-600 mt-1">Diese Aktion kann nicht rückgängig gemacht werden.</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => !playerLoading && closeDelete()}
                  >
                    <XCircle className="h-5 w-5 text-gray-500" />
                    <span className="sr-only">Schließen</span>
                  </Button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800 flex gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Du bist dabei zu löschen:</div>
                    <div className="mt-1">
                      <span className="font-medium">{deletePlayerName}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmDeletePlayer">
                    Tippe <span className="font-semibold">LÖSCHEN</span> zum Bestätigen
                  </Label>
                  <Input
                    id="confirmDeletePlayer"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="LÖSCHEN"
                    className="h-10 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-white flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-10 border-gray-200 text-gray-700 hover:bg-gray-50"
                  onClick={() => !playerLoading && closeDelete()}
                  disabled={playerLoading}
                >
                  Abbrechen
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1 h-10"
                  onClick={confirmDelete}
                  disabled={playerLoading || !canDelete}
                >
                  {playerLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Wird gelöscht...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      <span>Endgültig löschen</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}