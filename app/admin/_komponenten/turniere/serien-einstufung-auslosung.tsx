"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Shuffle,
  Trophy,
  UserRoundCog,
  Users,
} from "lucide-react"

type LevelGroup = 1 | 2 | 3

type Player = {
  id: string
  name: string
}

type LevelRow = {
  id: string
  series_id: string
  spieldatenbank_id: string
  player_name: string
  level_group: LevelGroup
  level_label: string
  average_points: number | null
  notes: string | null
}

type EventRow = {
  id: string
  title: string | null
  start_at: string
  is_matchday: boolean | null
  is_rescheduled: boolean | null
  rescheduled_at: string | null
}

type Props = {
  seriesId: string
  seriesName: string
  drawMethod: string
  teamMode: string
  tournamentFormat: string
}

const LEVELS: Record<LevelGroup, { label: string; short: string }> = {
  1: { label: "Tabelle 1", short: "Stark" },
  2: { label: "Tabelle 2", short: "Mitte / flexibel" },
  3: { label: "Tabelle 3", short: "Schwach" },
}

function effectiveDate(event: EventRow) {
  return event.is_rescheduled && event.rescheduled_at ? event.rescheduled_at : event.start_at
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function SeriesLevelDrawManagement({
  seriesId,
  seriesName,
  drawMethod,
  teamMode,
  tournamentFormat,
}: Props) {
  const [players, setPlayers] = useState<Player[]>([])
  const [levels, setLevels] = useState<LevelRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [registrationCount, setRegistrationCount] = useState(0)

  const [loading, setLoading] = useState(true)
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [editorOpen, setEditorOpen] = useState(false)
  const [message, setMessage] = useState("")

  const [draftLevels, setDraftLevels] = useState<
    Record<string, { level_group: LevelGroup; average_points: string; notes: string }>
  >({})

  const load = async () => {
    setLoading(true)
    setMessage("")

    try {
      const [{ data: playerData, error: playerError }, { data: levelData, error: levelError }, { data: eventData, error: eventError }] =
        await Promise.all([
          supabase.from("spieldatenbank").select("id,name").order("name", { ascending: true }),
          supabase
            .from("dko_series_player_levels")
            .select("id,series_id,spieldatenbank_id,player_name,level_group,level_label,average_points,notes")
            .eq("series_id", seriesId)
            .order("level_group", { ascending: true }),
          supabase
            .from("dko_series_events")
            .select("id,title,start_at,is_matchday,is_rescheduled,rescheduled_at")
            .eq("series_id", seriesId)
            .eq("is_matchday", true)
            .order("start_at", { ascending: true }),
        ])

      if (playerError) throw playerError
      if (levelError) throw levelError
      if (eventError) throw eventError

      const loadedPlayers = (playerData || []) as Player[]
      const loadedLevels = (levelData || []) as LevelRow[]
      const loadedEvents = (eventData || []) as EventRow[]

      setPlayers(loadedPlayers)
      setLevels(loadedLevels)
      setEvents(loadedEvents)

      const levelByPlayer = new Map(loadedLevels.map((row) => [String(row.spieldatenbank_id), row]))
      const nextDraft: Record<string, { level_group: LevelGroup; average_points: string; notes: string }> = {}

      for (const player of loadedPlayers) {
        const current = levelByPlayer.get(String(player.id))
        nextDraft[String(player.id)] = {
          level_group: (current?.level_group || 2) as LevelGroup,
          average_points:
            current?.average_points === null || current?.average_points === undefined
              ? ""
              : String(current.average_points),
          notes: current?.notes || "",
        }
      }

      setDraftLevels(nextDraft)
    } catch (error: any) {
      setMessage(error?.message || "Daten konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [seriesId])

  const nextEvent = useMemo(() => {
    const now = Date.now()
    const sorted = [...events].sort(
      (a, b) => new Date(effectiveDate(a)).getTime() - new Date(effectiveDate(b)).getTime(),
    )

    return (
      sorted.find((event) => {
        const dt = new Date(effectiveDate(event))
        const sameDay =
          dt.getFullYear() === new Date().getFullYear() &&
          dt.getMonth() === new Date().getMonth() &&
          dt.getDate() === new Date().getDate()
        return sameDay
      }) ||
      sorted.find((event) => new Date(effectiveDate(event)).getTime() >= now) ||
      null
    )
  }, [events])

  useEffect(() => {
    async function loadRegistrations() {
      if (!nextEvent?.id) {
        setRegistrationCount(0)
        return
      }

      const { count } = await supabase
        .from("dko_tournament_registration")
        .select("id", { count: "exact", head: true })
        .eq("series_id", seriesId)
        .eq("event_id", nextEvent.id)

      setRegistrationCount(count || 0)
    }

    void loadRegistrations()
  }, [seriesId, nextEvent?.id])

  const stats = useMemo(() => {
    return {
      total: players.length,
      assigned: levels.length,
      table1: levels.filter((row) => row.level_group === 1).length,
      table2: levels.filter((row) => row.level_group === 2).length,
      table3: levels.filter((row) => row.level_group === 3).length,
    }
  }, [players.length, levels])

  const levelByPlayer = useMemo(
    () => new Map(levels.map((row) => [String(row.spieldatenbank_id), row])),
    [levels],
  )

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return players
    return players.filter((player) => player.name.toLowerCase().includes(q))
  }, [players, search])

  const isEven = registrationCount % 2 === 0
  const missingLevels = Math.max(0, registrationCount - stats.assigned)

  async function savePlayer(player: Player) {
    const draft = draftLevels[String(player.id)]
    if (!draft) return

    setSavingPlayerId(String(player.id))
    setMessage("")

    try {
      const avg =
        draft.average_points.trim() === ""
          ? null
          : Number(draft.average_points.replace(",", "."))

      if (avg !== null && (!Number.isFinite(avg) || avg < 0)) {
        throw new Error("Bitte gültige Durchschnittspunkte eingeben.")
      }

      const payload = {
        series_id: seriesId,
        spieldatenbank_id: player.id,
        player_name: player.name,
        level_group: draft.level_group,
        level_label: LEVELS[draft.level_group].label,
        average_points: avg,
        notes: draft.notes.trim() || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("dko_series_player_levels")
        .upsert(payload, { onConflict: "series_id,spieldatenbank_id" })

      if (error) throw error

      await load()
      setMessage(`${player.name} wurde gespeichert.`)
    } catch (error: any) {
      setMessage(error?.message || "Einstufung konnte nicht gespeichert werden.")
    } finally {
      setSavingPlayerId(null)
    }
  }

  function openDraw() {
    if (!nextEvent?.id) return

    const params = new URLSearchParams({
      seriesId,
      eventId: nextEvent.id,
    })

    window.location.href = `/admin/members-champion-cup/auslosung?${params.toString()}`
  }

  if (drawMethod !== "level_balanced") return null

  return (
    <section className="emd-series-config-section emd-series-config-draw p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-fuchsia-300" />
            <h2 className="text-lg font-black text-slate-950">Einstufung & Auslosung</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Leistungsgruppen verwalten und die Auslosung für den nächsten Spieltag öffnen.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
          className="emd-admin-button-secondary"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Aktualisieren
        </Button>
      </div>

      {message ? (
        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm font-semibold text-white/70">
          {message}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<Users className="h-4 w-4" />} label="Spieler" value={stats.total} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Eingestuft" value={stats.assigned} />
        <StatCard icon={<Trophy className="h-4 w-4" />} label="Tabelle 1" value={stats.table1} />
        <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Tabelle 2" value={stats.table2} />
        <StatCard icon={<UserRoundCog className="h-4 w-4" />} label="Tabelle 3" value={stats.table3} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/[0.08] bg-black/20 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white/90">Spieler-Einstufung</div>
              <div className="mt-1 text-sm text-white/45">
                Jede Serie hat ihre eigenen Einstufungen.
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorOpen((value) => !value)}
              className="emd-admin-button-secondary"
            >
              {editorOpen ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
              {editorOpen ? "Schließen" : "Bearbeiten"}
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {([1, 2, 3] as LevelGroup[]).map((group) => (
              <div key={group} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">
                  {LEVELS[group].label}
                </div>
                <div className="mt-1 text-xl font-black text-white">
                  {levels.filter((row) => row.level_group === group).length}
                </div>
                <div className="mt-0.5 text-[11px] font-semibold text-white/40">{LEVELS[group].short}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-fuchsia-300/10 bg-fuchsia-500/[0.045] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-300/15 bg-fuchsia-500/10 text-fuchsia-100">
              <Shuffle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-white/90">Auslosung</div>
              <div className="mt-1 text-sm text-white/45">
                {nextEvent ? `${nextEvent.title || "Spieltag"} · ${formatDateTime(effectiveDate(nextEvent))}` : "Noch kein kommender Spieltag"}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">Anmeldungen</div>
              <div className="mt-1 text-2xl font-black text-white">{registrationCount}</div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">Teilnehmerzahl</div>
              <div className={`mt-1 text-sm font-black ${isEven ? "text-emerald-200" : "text-orange-200"}`}>
                {isEven ? "Gerade" : "Ungerade"}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/[0.08] bg-black/20 p-3 text-sm text-white/55">
            {teamMode === "drawn_doubles" ? "Gelostes Doppel" : teamMode === "fixed_doubles" ? "Fixes Doppel" : "Einzel"}
            {" · "}
            {tournamentFormat === "round_robin"
              ? "Round Robin"
              : tournamentFormat === "dko"
                ? "Doppel-K.-o."
                : tournamentFormat === "kratzer"
                  ? "Kratzer"
                  : "Survival"}
          </div>

          {missingLevels > 0 ? (
            <div className="mt-3 rounded-2xl border border-orange-300/15 bg-orange-500/[0.06] p-3 text-sm font-semibold text-orange-100/80">
              Vor der Auslosung fehlen noch Einstufungen.
            </div>
          ) : null}

          <Button
            type="button"
            onClick={openDraw}
            disabled={!nextEvent || registrationCount < 2 || !isEven}
            className="mt-4 w-full rounded-2xl bg-fuchsia-600 font-black text-white hover:bg-fuchsia-500 disabled:opacity-40"
          >
            <Shuffle className="mr-2 h-4 w-4" />
            Auslosung öffnen
          </Button>
        </div>
      </div>

      {editorOpen ? (
        <div className="mt-5 rounded-3xl border border-white/[0.08] bg-black/20 p-4 sm:p-5">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Spieler suchen"
              className="pl-9"
            />
          </div>

          <div className="mt-4 space-y-3">
            {filteredPlayers.map((player) => {
              const current = levelByPlayer.get(String(player.id))
              const draft = draftLevels[String(player.id)] || {
                level_group: 2 as LevelGroup,
                average_points: "",
                notes: "",
              }

              return (
                <div
                  key={player.id}
                  className="grid gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 xl:grid-cols-[minmax(180px,1fr)_180px_150px_minmax(180px,1fr)_110px] xl:items-end"
                >
                  <div>
                    <div className="text-sm font-black text-white/90">{player.name}</div>
                    <div className="mt-1 text-xs text-white/35">
                      {current ? `${LEVELS[current.level_group].label} · gespeichert` : "Noch nicht eingestuft"}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Tabelle</Label>
                    <select
                      value={String(draft.level_group)}
                      onChange={(e) =>
                        setDraftLevels((prev) => ({
                          ...prev,
                          [String(player.id)]: {
                            ...draft,
                            level_group: Number(e.target.value) as LevelGroup,
                          },
                        }))
                      }
                      className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                    >
                      <option value="1">Tabelle 1 – Stark</option>
                      <option value="2">Tabelle 2 – Mitte</option>
                      <option value="3">Tabelle 3 – Schwach</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Ø Punkte</Label>
                    <Input
                      inputMode="decimal"
                      value={draft.average_points}
                      onChange={(e) =>
                        setDraftLevels((prev) => ({
                          ...prev,
                          [String(player.id)]: {
                            ...draft,
                            average_points: e.target.value,
                          },
                        }))
                      }
                      placeholder="optional"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Notiz</Label>
                    <Input
                      value={draft.notes}
                      onChange={(e) =>
                        setDraftLevels((prev) => ({
                          ...prev,
                          [String(player.id)]: {
                            ...draft,
                            notes: e.target.value,
                          },
                        }))
                      }
                      placeholder="optional"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={() => void savePlayer(player)}
                    disabled={savingPlayerId === String(player.id)}
                    className="emd-admin-button-primary"
                  >
                    {savingPlayerId === String(player.id) ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Speichern
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-3">
      <div className="flex items-center gap-2 text-white/35">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.12em]">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
    </div>
  )
}
