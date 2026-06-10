"use client"

import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  Trophy,
  Loader2,
  Save,
  X,
  RefreshCw,
  Pencil,
  Trash2,
  AlertTriangle,
  Users,
  Shield,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"

type LevelGroup = 1 | 2 | 3

type Player = {
  id: string | number
  name: string
}

type LevelRow = {
  id: string
  spieldatenbank_id: string
  player_name: string
  level_group: LevelGroup
  level_label: string
  average_points: number | null
  notes: string | null
  updated_at: string | null
}

type PlayerWithLevel = Player & {
  level?: LevelRow | null
}

interface AdminMembersLevelManagementProps {
  user: User | null
}

const LEVELS: Record<LevelGroup, { label: string; short: string; description: string; className: string }> = {
  1: {
    label: "Tabelle 1",
    short: "Stark",
    description: "höchste Leistungsgruppe",
    className: "bg-orange-50 text-orange-800 border-orange-200",
  },
  2: {
    label: "Tabelle 2",
    short: "Mitte",
    description: "flexible Ausgleichsgruppe",
    className: "bg-blue-50 text-blue-800 border-blue-200",
  },
  3: {
    label: "Tabelle 3",
    short: "Schwach",
    description: "niedrigere Leistungsgruppe",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
}

const EMPTY_FORM = {
  spieldatenbank_id: "",
  player_name: "",
  level_group: "2",
  average_points: "",
  notes: "",
}

export function AdminMembersLevelManagement({ user }: AdminMembersLevelManagementProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [levels, setLevels] = useState<LevelRow[]>([])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")

  const [form, setForm] = useState(EMPTY_FORM)
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [levelToDelete, setLevelToDelete] = useState<LevelRow | null>(null)

  useEffect(() => {
    if (user) void loadData()
  }, [user?.id])

  const loadData = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const [{ data: playerData, error: playerError }, { data: levelData, error: levelError }] = await Promise.all([
        supabase.from("spieldatenbank").select("id,name").order("name", { ascending: true }),
        supabase
          .from("emd_champion_cup_player_levels")
          .select("id,spieldatenbank_id,player_name,level_group,level_label,average_points,notes,updated_at")
          .order("level_group", { ascending: true })
          .order("average_points", { ascending: false }),
      ])

      if (playerError) throw playerError
      if (levelError) throw levelError

      setPlayers((playerData || []) as Player[])
      setLevels((levelData || []) as LevelRow[])
    } catch (error: any) {
      console.error("loadData error", error)
      setMessage({ type: "error", text: error?.message || "Level-Einstufungen konnten nicht geladen werden." })
    } finally {
      setLoading(false)
    }
  }

  const playersWithLevels = useMemo<PlayerWithLevel[]>(() => {
    const levelByPlayerId = new Map<string, LevelRow>()
    levels.forEach((level) => levelByPlayerId.set(String(level.spieldatenbank_id), level))

    return players.map((player) => ({
      ...player,
      level: levelByPlayerId.get(String(player.id)) ?? null,
    }))
  }, [players, levels])

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase()

    return playersWithLevels.filter((player) => {
      const level = player.level
      const matchesSearch =
        !q ||
        player.name.toLowerCase().includes(q) ||
        level?.notes?.toLowerCase().includes(q) ||
        level?.level_label?.toLowerCase().includes(q)

      const matchesLevel =
        levelFilter === "all" ||
        (levelFilter === "unset" && !level) ||
        (level && String(level.level_group) === levelFilter)

      return matchesSearch && matchesLevel
    })
  }, [playersWithLevels, search, levelFilter])

  const groupedPlayers = useMemo(() => {
    const groups = [1, 2, 3] as LevelGroup[]

    return groups.map((group) => ({
      group,
      players: filteredPlayers
        .filter((player) => player.level?.level_group === group)
        .sort((a, b) => Number(b.level?.average_points ?? -1) - Number(a.level?.average_points ?? -1)),
    }))
  }, [filteredPlayers])

  const unsetPlayers = useMemo(() => filteredPlayers.filter((player) => !player.level), [filteredPlayers])

  const stats = useMemo(() => {
    return {
      totalPlayers: players.length,
      assigned: levels.length,
      table1: levels.filter((level) => level.level_group === 1).length,
      table2: levels.filter((level) => level.level_group === 2).length,
      table3: levels.filter((level) => level.level_group === 3).length,
      unset: Math.max(0, players.length - levels.length),
    }
  }, [players.length, levels])

  const resetForm = () => {
    setIsEditing(false)
    setForm(EMPTY_FORM)
  }

  const handleSelectPlayer = (playerId: string) => {
    const player = players.find((item) => String(item.id) === playerId)
    const existingLevel = levels.find((item) => String(item.spieldatenbank_id) === playerId)

    if (!player) return

    setIsEditing(!!existingLevel)
    setForm({
      spieldatenbank_id: String(player.id),
      player_name: player.name,
      level_group: String(existingLevel?.level_group ?? 2),
      average_points:
        existingLevel?.average_points !== null && existingLevel?.average_points !== undefined
          ? String(existingLevel.average_points)
          : "",
      notes: existingLevel?.notes ?? "",
    })
  }

  const startEditLevel = (player: PlayerWithLevel) => {
    setMessage(null)
    setIsEditing(!!player.level)
    setForm({
      spieldatenbank_id: String(player.id),
      player_name: player.name,
      level_group: String(player.level?.level_group ?? 2),
      average_points:
        player.level?.average_points !== null && player.level?.average_points !== undefined
          ? String(player.level.average_points)
          : "",
      notes: player.level?.notes ?? "",
    })
  }

  const handleSaveLevel = async () => {
    try {
      setMessage(null)

      if (!user) {
        setMessage({ type: "error", text: "Nicht eingeloggt." })
        return
      }

      if (!form.spieldatenbank_id) {
        setMessage({ type: "error", text: "Bitte einen Spieler auswählen." })
        return
      }

      const parsedPlayerId = String(form.spieldatenbank_id).trim()
      if (!parsedPlayerId) {
        setMessage({ type: "error", text: "Ungültige Spieler-ID." })
        return
      }

      const parsedLevel = Number(form.level_group) as LevelGroup
      if (![1, 2, 3].includes(parsedLevel)) {
        setMessage({ type: "error", text: "Bitte eine gültige Tabelle wählen." })
        return
      }

      const parsedAverage = form.average_points.trim() === "" ? null : Number(form.average_points.replace(",", "."))
      if (parsedAverage !== null && (!Number.isFinite(parsedAverage) || parsedAverage < 0)) {
        setMessage({ type: "error", text: "Bitte gültige Durchschnittspunkte eingeben." })
        return
      }

      const player = players.find((item) => String(item.id) === parsedPlayerId)
      if (!player) {
        setMessage({ type: "error", text: "Spieler nicht gefunden." })
        return
      }

      setSaving(true)

      const payload = {
        spieldatenbank_id: parsedPlayerId,
        player_name: player.name,
        level_group: parsedLevel,
        level_label: LEVELS[parsedLevel].label,
        average_points: parsedAverage,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("emd_champion_cup_player_levels")
        .upsert(payload, { onConflict: "spieldatenbank_id" })

      if (error) throw error

      setMessage({ type: "success", text: "Level-Einstufung wurde gespeichert." })
      await loadData()
      resetForm()
    } catch (error: any) {
      console.error("handleSaveLevel error", error)
      setMessage({ type: "error", text: error?.message || "Level-Einstufung konnte nicht gespeichert werden." })
    } finally {
      setSaving(false)
    }
  }

  const openDeleteModal = (level: LevelRow) => {
    setLevelToDelete(level)
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    if (deletingId) return
    setDeleteModalOpen(false)
    setLevelToDelete(null)
  }

  const handleDeleteLevel = async () => {
    if (!levelToDelete) return

    try {
      setDeletingId(levelToDelete.id)
      setMessage(null)

      const { error } = await supabase.from("emd_champion_cup_player_levels").delete().eq("id", levelToDelete.id)
      if (error) throw error

      setMessage({ type: "success", text: "Level-Einstufung wurde entfernt." })

      if (String(form.spieldatenbank_id) === String(levelToDelete.spieldatenbank_id)) {
        resetForm()
      }

      setDeleteModalOpen(false)
      setLevelToDelete(null)
      await loadData()
    } catch (error: any) {
      console.error("handleDeleteLevel error", error)
      setMessage({ type: "error", text: error?.message || "Level-Einstufung konnte nicht gelöscht werden." })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-start gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-orange-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-black">EMD Members Champion Cup – Level-Einstufung</h2>
              <p className="text-sm text-gray-600 mt-1">
                Spieler in Tabelle 1, Tabelle 2 oder Tabelle 3 einteilen. Diese Einstufung wird später für die automatische
                Partner-Zulosung verwendet.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadData()} disabled={loading} className="rounded-xl">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Neu laden
          </Button>
        </div>
      </div>

      {message ? (
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-medium border",
            message.type === "success" && "bg-green-50 border-green-200 text-green-800",
            message.type === "error" && "bg-red-50 border-red-200 text-red-800",
            message.type === "info" && "bg-blue-50 border-blue-200 text-blue-800"
          )}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="Spieler gesamt" value={stats.totalPlayers} />
        <StatCard label="Eingestuft" value={stats.assigned} />
        <StatCard label="Ohne Einstufung" value={stats.unset} />
        <StatCard label="Tabelle 1" value={stats.table1} />
        <StatCard label="Tabelle 2" value={stats.table2} />
        <StatCard label="Tabelle 3" value={stats.table3} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-6">
          <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle>{isEditing ? "Einstufung bearbeiten" : "Spieler einstufen"}</CardTitle>
              <CardDescription>Wähle einen Spieler und ordne ihn einer Zulosungstabelle zu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Spieler</Label>
                <Select value={form.spieldatenbank_id} onValueChange={handleSelectPlayer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Spieler wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={String(player.id)}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Zulosungstabelle</Label>
                <Select
                  value={form.level_group}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, level_group: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tabelle wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Tabelle 1 – Stark</SelectItem>
                    <SelectItem value="2">Tabelle 2 – Mitte / flexibel</SelectItem>
                    <SelectItem value="3">Tabelle 3 – Schwach</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Durchschnittspunkte pro Spiel (optional)</Label>
                <Input
                  inputMode="decimal"
                  value={form.average_points}
                  onChange={(e) => setForm((prev) => ({ ...prev, average_points: e.target.value }))}
                  placeholder="z. B. 21,47"
                />
              </div>

              <div className="space-y-2">
                <Label>Notiz (optional)</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="z. B. Herbst 2025 + Frühjahr 2026 berechnet"
                  className="min-h-[90px]"
                />
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                <div className="font-black mb-1">Wichtig für Auslosung</div>
                <p>
                  Tabelle 2 ist die flexible Ausgleichsgruppe. Beim Auslosen wird diese Gruppe vollständig auf starke oder
                  schwächere Seite verteilt.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="button" onClick={handleSaveLevel} disabled={saving} className="rounded-xl">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Speichern
                </Button>

                <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl">
                  <X className="w-4 h-4 mr-2" />
                  Zurücksetzen
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle>Legende</CardTitle>
              <CardDescription>So werden die Tabellen später im Zulosungstool verwendet.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {([1, 2, 3] as LevelGroup[]).map((group) => {
                const info = LEVELS[group]
                return (
                  <div key={group} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <Badge variant="outline" className={cn("rounded-xl px-3 py-1", info.className)}>
                      {info.label} – {info.short}
                    </Badge>
                    <div className="text-sm text-gray-600 mt-2">{info.description}</div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle>Spieler & Einstufungen</CardTitle>
              <CardDescription>Suche, filtere und bearbeite bestehende Level-Einstufungen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Spieler suchen..."
                    className="pl-9"
                  />
                </div>

                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tabelle filtern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Spieler</SelectItem>
                    <SelectItem value="1">Nur Tabelle 1</SelectItem>
                    <SelectItem value="2">Nur Tabelle 2</SelectItem>
                    <SelectItem value="3">Nur Tabelle 3</SelectItem>
                    <SelectItem value="unset">Ohne Einstufung</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-2xl border overflow-hidden">
                <ScrollArea className="h-[760px]">
                  <div className="p-4 space-y-6">
                    {loading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Einstufungen werden geladen...
                      </div>
                    ) : filteredPlayers.length === 0 ? (
                      <div className="text-sm text-gray-500">Keine Spieler gefunden.</div>
                    ) : (
                      <>
                        {groupedPlayers.map(({ group, players: groupPlayers }) => {
                          const info = LEVELS[group]
                          if (groupPlayers.length === 0 && levelFilter === "all") return null

                          return (
                            <div key={group} className="space-y-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <Badge variant="outline" className={cn("rounded-xl px-3 py-1", info.className)}>
                                  {info.label} – {info.short}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {groupPlayers.length} Spieler
                                </span>
                              </div>

                              <div className="space-y-3">
                                {groupPlayers.map((player) => (
                                  <PlayerLevelRow
                                    key={player.id}
                                    player={player}
                                    onEdit={() => startEditLevel(player)}
                                    onDelete={() => player.level && openDeleteModal(player.level)}
                                    deleting={!!player.level && deletingId === player.level.id}
                                  />
                                ))}
                              </div>
                            </div>
                          )
                        })}

                        {(levelFilter === "all" || levelFilter === "unset") && unsetPlayers.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <Badge variant="outline" className="rounded-xl px-3 py-1 bg-gray-50 text-gray-700 border-gray-200">
                                Ohne Einstufung
                              </Badge>
                              <span className="text-sm text-gray-500">{unsetPlayers.length} Spieler</span>
                            </div>

                            <div className="space-y-3">
                              {unsetPlayers.map((player) => (
                                <PlayerLevelRow
                                  key={player.id}
                                  player={player}
                                  onEdit={() => startEditLevel(player)}
                                  onDelete={() => null}
                                  deleting={false}
                                />
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={deleteModalOpen} onOpenChange={(open) => (!deletingId ? setDeleteModalOpen(open) : null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 border border-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <DialogTitle>Einstufung entfernen</DialogTitle>
                <DialogDescription>Bitte bestätige das Entfernen dieser Einstufung.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
            <div className="text-sm text-gray-600 mb-1">Ausgewählter Spieler</div>
            <div className="font-semibold text-gray-900">{levelToDelete?.player_name || "—"}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {levelToDelete ? (
                <Badge variant="outline" className="rounded-lg">
                  {LEVELS[levelToDelete.level_group].label}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="text-sm text-gray-600">Der Spieler bleibt in der Spieldatenbank, nur die Cup-Einstufung wird entfernt.</div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={closeDeleteModal} disabled={!!deletingId} className="rounded-xl">
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleDeleteLevel}
              disabled={!!deletingId}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Endgültig entfernen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-2xl border border-gray-200 shadow-sm">
      <CardContent className="p-4">
        <div className="text-xs sm:text-sm text-gray-500">{label}</div>
        <div className="text-2xl sm:text-3xl font-black mt-1">{value}</div>
      </CardContent>
    </Card>
  )
}

function PlayerLevelRow({
  player,
  onEdit,
  onDelete,
  deleting,
}: {
  player: PlayerWithLevel
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const level = player.level
  const levelInfo = level ? LEVELS[level.level_group] : null

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col lg:flex-row lg:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-semibold text-gray-900">{player.name}</div>
          {levelInfo ? (
            <Badge variant="outline" className={cn("rounded-lg", levelInfo.className)}>
              {levelInfo.label} – {levelInfo.short}
            </Badge>
          ) : (
            <Badge variant="outline" className="rounded-lg bg-gray-50 text-gray-700 border-gray-200">
              nicht eingestuft
            </Badge>
          )}
          {typeof level?.average_points === "number" ? (
            <Badge variant="outline" className="rounded-lg">
              {level.average_points.toLocaleString("de-AT")} Punkte Ø
            </Badge>
          ) : null}
        </div>
        {level?.notes ? <div className="text-sm text-gray-500 mt-2">{level.notes}</div> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onEdit} className="rounded-xl">
          <Pencil className="w-4 h-4 mr-2" />
          {level ? "Bearbeiten" : "Einstufen"}
        </Button>

        {level ? (
          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Entfernen
          </Button>
        ) : null}
      </div>
    </div>
  )
}
