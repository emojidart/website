"use client"

import { useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertCircle,
  CheckCircle,
  Edit,
  Eye,
  Link2,
  Link2Off as LinkOff,
  Loader2,
  Mail,
  Phone,
  Trash2,
  XCircle,
} from "lucide-react"
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
  onDeactivatePlayer: (playerId: string) => void
  onReactivatePlayer: (playerId: string) => void

  onDataChanged?: () => void | Promise<void>
}

type SpielerOption = {
  id: string
  name: string
  verein: string | null
  player_code: string | null
}

function fmtDateISO(d: string | null | undefined) {
  if (!d) return "—"
  const s = String(d)
  const iso = s.includes("T") ? s.split("T")[0] : s
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return s
  const [y, m, day] = iso.split("-")
  return `${day}.${m}.${y}`
}

function fmtText(v: unknown) {
  const s = v == null ? "" : String(v)
  return s.trim().length > 0 ? s : "—"
}

function compactContact(player: ClubPlayer) {
  const email = player.email?.trim()
  const phone = player.phone?.trim()
  if (!email && !phone) return "—"
  if (email && phone) return `${email} · ${phone}`
  return email || phone || "—"
}

const getPlayerStatusBadge = (player: ClubPlayer) => {
  const isInactive = (player as any)?.is_active === false || !!player.club_left_at

  if (isInactive) {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
        Deaktiviert
      </Badge>
    )
  }

  return (
    <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
      Aktiv
    </Badge>
  )
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
    onDeactivatePlayer,
    onReactivatePlayer,
    onDataChanged,
  } = props

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null)
  const [deletePlayerName, setDeletePlayerName] = useState<string>("")
  const [confirmText, setConfirmText] = useState("")

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsPlayer, setDetailsPlayer] = useState<ClubPlayer | null>(null)

  const [linkingDialogOpen, setLinkingDialogOpen] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [linkingStatus, setLinkingStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })
  const [spielerOptions, setSpielerOptions] = useState<SpielerOption[]>([])
  const [linkingForm, setLinkingForm] = useState<{
    playerId: string
    playerName: string
    selectedSpielerId: string
  }>({
    playerId: "",
    playerName: "",
    selectedSpielerId: "",
  })

  const mustType = "DEAKTIVIEREN"
  const canDelete = confirmText.trim().toUpperCase() === mustType

  const minWidth = useMemo(() => "min-w-[1180px]", [])

  function openDelete(player: ClubPlayer) {
    setDeletePlayerId(player.id)
    setDeletePlayerName(player.name)
    setConfirmText("")
    setDeleteOpen(true)
  }

  function closeDelete() {
    setDeleteOpen(false)
    setDeletePlayerId(null)
    setDeletePlayerName("")
    setConfirmText("")
  }

  function confirmDelete() {
    if (!deletePlayerId) return
    onDeactivatePlayer(deletePlayerId)
    closeDelete()
  }

  function openDetails(player: ClubPlayer) {
    setDetailsPlayer(player)
    setDetailsOpen(true)
  }

  function closeDetails() {
    setDetailsOpen(false)
    setDetailsPlayer(null)
  }

  const loadSpielerdatenbank = async () => {
    try {
      const { data, error } = await supabase
        .from("spieldatenbank")
        .select("id, name, verein, player_code")
        .order("name", { ascending: true })

      if (error) throw error
      setSpielerOptions((data || []) as SpielerOption[])
    } catch (err: any) {
      setLinkingStatus({
        type: "error",
        message: `Fehler beim Laden der Spielerdatenbank: ${err.message}`,
      })
    }
  }

  const openLinkingDialog = async (player: ClubPlayer) => {
    setLinkingForm({
      playerId: player.id,
      playerName: player.name,
      selectedSpielerId: "",
    })
    setLinkingStatus({ type: null, message: "" })
    await loadSpielerdatenbank()
    setLinkingDialogOpen(true)
  }

  const refreshAfterChange = async () => {
    await Promise.resolve(onDataChanged?.())

    if (detailsOpen && detailsPlayer) {
      const updated = visiblePlayers.find((p) => p.id === detailsPlayer.id) || null
      if (updated) setDetailsPlayer(updated)
    }
  }

  const linkToSpieldatenbank = async () => {
    if (!linkingForm.selectedSpielerId) {
      setLinkingStatus({
        type: "error",
        message: "Bitte wählen Sie einen Spieler aus der Spielerdatenbank aus.",
      })
      return
    }

    setIsLinking(true)
    setLinkingStatus({ type: null, message: "" })

    try {
      const { error } = await supabase
        .from("club_players")
        .update({ spieldatenbank_id: linkingForm.selectedSpielerId })
        .eq("id", linkingForm.playerId)

      if (error) throw error

      setLinkingStatus({
        type: "success",
        message: "Spieler erfolgreich mit Spielerdatenbank verknüpft!",
      })
      await refreshAfterChange()

      setTimeout(() => setLinkingDialogOpen(false), 700)
    } catch (err: any) {
      setLinkingStatus({
        type: "error",
        message: `Fehler beim Verknüpfen: ${err.message}`,
      })
    } finally {
      setIsLinking(false)
    }
  }

  const unlinkSpieldatenbank = async (player: ClubPlayer) => {
    setIsLinking(true)
    try {
      const { error } = await supabase
        .from("club_players")
        .update({ spieldatenbank_id: null })
        .eq("id", player.id)

      if (error) throw error
      await refreshAfterChange()
    } catch (err: any) {
      setLinkingStatus({
        type: "error",
        message: `Fehler beim Entfernen der Verknüpfung: ${err.message}`,
      })
    } finally {
      setIsLinking(false)
    }
  }

  const getMemberCardBadge = (player: ClubPlayer) => {
    if ((player as any)?.spieldatenbank_id) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
          <Link2 className="h-3 w-3 mr-1" />
          Card aktiv
        </Badge>
      )
    }

    return (
      <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
        <LinkOff className="h-3 w-3 mr-1" />
        Card fehlt
      </Badge>
    )
  }

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
            placeholder="Name, Ort, E-Mail, Nummer, Player-Code ..."
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
          <table className={cn("w-full text-sm", minWidth)}>
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Spieler</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Nr.</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Player-Code</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Member Card</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Kontakt</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Geburtsdatum</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Ort</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700 text-right">Aktionen</th>
              </tr>
            </thead>

            <tbody>
              {visiblePlayers.map((player, idx) => {
                const linked = !!(player as any)?.spieldatenbank_id
                const isInactive = (player as any)?.is_active === false || !!player.club_left_at

                return (
                  <tr
                    key={player.id}
                    className={cn(
                      "border-t border-gray-200 hover:bg-gray-50/60",
                      idx % 2 === 1 && "bg-gray-50/30"
                    )}
                  >
                    <td className="px-3 py-2 lg:px-4 lg:py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={player.photo_url || "/placeholder.svg?height=32&width=32&query=player-avatar"}
                          />
                          <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <div className="font-medium text-gray-800 truncate max-w-[260px]">
                            {player.name}
                          </div>

                          <div className="mt-1 flex gap-2 flex-wrap">
                            {getPlayerStatusBadge(player)}

                            {player.email ? (
                              <Badge variant="outline" className="text-xs">
                                <Mail className="h-3 w-3 mr-1" />
                                Mail
                              </Badge>
                            ) : null}

                            {player.phone ? (
                              <Badge variant="outline" className="text-xs">
                                <Phone className="h-3 w-3 mr-1" />
                                Tel
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">
                      {player.player_number ?? "—"}
                    </td>

                    <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700 font-mono">
                      {(player as any)?.player_code ?? "—"}
                    </td>

                    <td className="px-3 py-2 lg:px-4 lg:py-3">
                      <div className="flex items-center gap-2">
                        {getMemberCardBadge(player)}

                        {!linked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => openLinkingDialog(player)}
                            disabled={playerLoading || isLinking}
                          >
                            <Link2 className="h-4 w-4 mr-2" />
                            Verknüpfen
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-gray-200 text-gray-700 hover:bg-gray-50"
                            onClick={() => unlinkSpieldatenbank(player)}
                            disabled={playerLoading || isLinking}
                            title="Verknüpfung entfernen"
                          >
                            <LinkOff className="h-4 w-4" />
                            <span className="sr-only">Verknüpfung entfernen</span>
                          </Button>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">
                      <span className="truncate inline-block max-w-[320px]">
                        {compactContact(player)}
                      </span>
                    </td>

                    <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">
                      {fmtDateISO(player.birthdate)}
                    </td>

                    <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">
                      {player.city ?? "—"}
                    </td>

                    <td className="px-3 py-2 lg:px-4 lg:py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetails(player)}
                          disabled={playerLoading}
                          className="h-8 px-3 border-gray-200"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Details</span>
                        </Button>

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

                        {isInactive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReactivatePlayer(player.id)}
                            disabled={playerLoading}
                            className="h-8 px-3 border-green-200 text-green-700 hover:bg-green-50"
                          >
                            Aktivieren
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDelete(player)}
                            disabled={playerLoading}
                            className="h-8 px-3 border-amber-200 text-amber-700 hover:bg-amber-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Deaktivieren</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={detailsOpen} onOpenChange={(open) => (open ? null : closeDetails())}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={detailsPlayer?.photo_url || "/placeholder.svg?height=36&width=36&query=player-avatar"}
                  />
                  <AvatarFallback>{detailsPlayer?.name?.charAt(0) ?? "?"}</AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="truncate">{detailsPlayer?.name ?? "Spieler"}</div>
                  <div className="text-xs text-gray-500 truncate">
                    Player-Code:{" "}
                    <span className="font-mono">
                      {(detailsPlayer as any)?.player_code ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {detailsPlayer && (
            <div className="space-y-5">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="font-semibold text-gray-900 mb-3">Member Card</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getMemberCardBadge(detailsPlayer)}

                  {!((detailsPlayer as any)?.spieldatenbank_id) ? (
                    <Button
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => openLinkingDialog(detailsPlayer)}
                      disabled={isLinking}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Jetzt verknüpfen
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="border-gray-200 text-gray-700 hover:bg-gray-50"
                      onClick={() => unlinkSpieldatenbank(detailsPlayer)}
                      disabled={isLinking}
                    >
                      <LinkOff className="h-4 w-4 mr-2" />
                      Verknüpfung entfernen
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="text-xs text-gray-500">Nr.</div>
                  <div className="font-semibold text-gray-900">
                    {detailsPlayer.player_number ?? "—"}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="text-xs text-gray-500">Geburtsdatum</div>
                  <div className="font-semibold text-gray-900">
                    {fmtDateISO(detailsPlayer.birthdate)}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="font-semibold text-gray-900 mb-3">Kontakt</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">E-Mail</div>
                    <div className="font-medium text-gray-900">{fmtText(detailsPlayer.email)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Telefon</div>
                    <div className="font-medium text-gray-900">{fmtText(detailsPlayer.phone)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="font-semibold text-gray-900 mb-3">Adresse</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Straße</div>
                    <div className="font-medium text-gray-900">{fmtText(detailsPlayer.street)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Hausnr.</div>
                    <div className="font-medium text-gray-900">{fmtText(detailsPlayer.house_number)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">PLZ</div>
                    <div className="font-medium text-gray-900">{fmtText(detailsPlayer.postal_code)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Ort</div>
                    <div className="font-medium text-gray-900">{fmtText(detailsPlayer.city)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="font-semibold text-gray-900 mb-3">Weitere Daten</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Trikotgröße</div>
                    <div className="font-medium text-gray-900">{fmtText(detailsPlayer.jersey_size)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">IBAN</div>
                    <div className="font-medium text-gray-900">{fmtText(detailsPlayer.iban)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Mitglied seit</div>
                    <div className="font-medium text-gray-900">{fmtDateISO(detailsPlayer.club_joined_at)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Ausgetreten</div>
                    <div className="font-medium text-gray-900">{fmtDateISO(detailsPlayer.club_left_at)}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeDetails} className="border-gray-200">
                  Schließen
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    closeDetails()
                    onEditPlayer(detailsPlayer)
                  }}
                  disabled={playerLoading}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Bearbeiten
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={linkingDialogOpen} onOpenChange={setLinkingDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Link2 className="h-5 w-5 text-blue-600" />
              <span>Mit Member Card verknüpfen</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                Wählen Sie einen Spieler aus der Spielerdatenbank aus, um diesem Vereinsspieler eine Member Card zu aktivieren.
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Spieler:</p>
              <p className="font-semibold text-gray-900">{linkingForm.playerName}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="spieler-select">Spieler aus Spielerdatenbank</Label>
              <Select
                value={linkingForm.selectedSpielerId}
                onValueChange={(value) =>
                  setLinkingForm((prev) => ({ ...prev, selectedSpielerId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Spieler auswählen..." />
                </SelectTrigger>

                <SelectContent>
                  {spielerOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{s.name}</span>

                        {s.verein ? (
                          <Badge variant="outline" className="text-xs ml-2">
                            {s.verein}
                          </Badge>
                        ) : null}

                        {s.player_code ? (
                          <Badge variant="outline" className="text-xs ml-2 font-mono">
                            {s.player_code}
                          </Badge>
                        ) : null}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {linkingStatus.type && (
              <div
                className={cn(
                  "p-3 rounded-lg flex items-center space-x-2 border",
                  linkingStatus.type === "success"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700"
                )}
              >
                {linkingStatus.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm">{linkingStatus.message}</span>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                onClick={() => setLinkingDialogOpen(false)}
                variant="outline"
                className="flex-1"
                disabled={isLinking}
              >
                Abbrechen
              </Button>

              <Button
                onClick={linkToSpieldatenbank}
                disabled={isLinking || !linkingForm.selectedSpielerId}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLinking ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Wird verknüpft...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link2 className="h-4 w-4" />
                    <span>Verknüpfen</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                    <h5 className="text-base font-semibold text-gray-900">
                      Spieler deaktivieren
                    </h5>
                    <p className="text-sm text-gray-600 mt-1">
                      Der Spieler wird deaktiviert, aus Teams entfernt und der Zugang gesperrt.
                    </p>
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
                    <div className="font-semibold">Du bist dabei zu deaktivieren:</div>
                    <div className="mt-1">
                      <span className="font-medium">{deletePlayerName}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmDeletePlayer">
                    Tippe <span className="font-semibold">DEAKTIVIEREN</span> zum Bestätigen
                  </Label>
                  <Input
                    id="confirmDeletePlayer"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DEAKTIVIEREN"
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
                      <span>Wird deaktiviert...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      <span>Deaktivieren & sperren</span>
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