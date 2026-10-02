"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SeriesLevelDrawManagement } from "./serien-einstufung-auslosung"

import {
  Plus,
  Save,
  Trash2,
  Pencil,
  X,
  Calendar,
  Clock,
  RefreshCw,
  Trophy,
  Layers3,
  CheckCircle2,
  CircleDot,
  Settings2,
  Euro,
  Target,
  Medal,
  Gift,
  ShieldCheck,
  ListOrdered,
  ImagePlus,
  Upload,
  Users,
} from "lucide-react"

type DkoSeries = {
  id: string
  name: string
  slug: string
  is_active: boolean
  series_type: string
  access_type: "public" | "club_internal" | "club_external"

  startgeld: number
  qualification_requirement: number
  total_tournament_days: number

  description: string | null
  rules_text: string | null
  image_path: string | null
  series_fee: number

  placement_scoring_mode: "fixed" | "dynamic"
  dynamic_last_place_points: number
  dynamic_step_points: number

  result_counting_mode: "all" | "best_n"
  best_n_results: number | null

  legs_scoring_active: boolean
  legs_points_per_win: number

  undefeated_winner_bonus_active: boolean
  undefeated_winner_bonus_points: number

  participation_bonus_mode: "highest_only" | "cumulative"
  registration_enabled: boolean

  registration_open_mode: "event_day" | "always"
  registration_open_time: string | null
  registration_close_mode: "fixed_time" | "minutes_before_start"
  registration_close_time: string | null
  unregister_close_mode: "same_as_registration" | "fixed_time" | "minutes_before_start"
  unregister_close_time: string | null
  require_even_participants: boolean
  odd_participant_policy: "allow" | "last_waitlist"
  no_show_penalty_mode: "none" | "delete_worst_result"
  min_participants: number | null
  max_participants: number | null

  tournament_format: "dko" | "round_robin" | "kratzer" | "survival"
  team_mode: "single" | "drawn_doubles" | "fixed_doubles"
  draw_method: "none" | "random" | "level_balanced" | "manual"

  // Bestehende Felder bleiben erhalten.
  halving_active: boolean
  halving_date: string | null
  division_active: boolean
  division_date: string | null

  created_at: string
  updated_at: string
}

type DkoSeriesEvent = {
  id: string
  series_id: string
  title: string | null
  start_at: string
  is_rescheduled: boolean
  rescheduled_at: string | null
  location: string | null
  is_matchday: boolean
  registration_cutoff_minutes: number
  tournament_format_override: "dko" | "round_robin" | "kratzer" | "survival" | null
  team_mode_override: "single" | "drawn_doubles" | "fixed_doubles" | null
  draw_method_override: "none" | "random" | "level_balanced" | "manual" | null
  no_show_penalty_mode_override: "none" | "delete_worst_result" | null
  notes: string | null
  created_at: string
  updated_at: string
}

type PointRule = {
  id?: string
  place_from: number
  place_to: number
  points: number
  sort_order: number
}

type ParticipationBonus = {
  id?: string
  required_starts: number
  bonus_points: number
  label: string | null
  sort_order: number
}

type CashReward = {
  id?: string
  required_starts: number
  amount: number
  one_time: boolean
  label: string | null
  sort_order: number
}

type TiebreakRule = {
  id?: string
  priority: number
  rule_key: string
  label: string | null
}

const TOURNAMENT_FORMAT_OPTIONS = [
  { value: "dko", label: "Doppel-K.-o." },
  { value: "round_robin", label: "Round Robin" },
  { value: "kratzer", label: "Kratzer" },
  { value: "survival", label: "Survival" },
] as const

const TEAM_MODE_OPTIONS = [
  { value: "single", label: "Einzel" },
  { value: "drawn_doubles", label: "Gelostes Doppel" },
  { value: "fixed_doubles", label: "Fixes Doppel" },
] as const

const DRAW_METHOD_OPTIONS = [
  { value: "none", label: "Keine Auslosung" },
  { value: "random", label: "Zufällige Auslosung" },
  { value: "level_balanced", label: "Auslosung nach Leistungsgruppen" },
  { value: "manual", label: "Manuelle Einteilung" },
] as const

function formatTournamentMode(format: string, teamMode: string, drawMethod: string) {
  const f = TOURNAMENT_FORMAT_OPTIONS.find((x) => x.value === format)?.label || format
  const t = TEAM_MODE_OPTIONS.find((x) => x.value === teamMode)?.label || teamMode
  const d = DRAW_METHOD_OPTIONS.find((x) => x.value === drawMethod)?.label || drawMethod
  return `${f} · ${t}${drawMethod !== "none" ? ` · ${d}` : ""}`
}

const TIEBREAK_OPTIONS = [
  { key: "total_points", label: "Gesamtpunkte" },
  { key: "check_points", label: "Check-Punkte" },
  { key: "legs_won", label: "Gewonnene Legs" },
  { key: "leg_difference", label: "Leg-Differenz" },
  { key: "placement_points", label: "Platzierungspunkte" },
  { key: "direct_match", label: "Direktes Duell" },
  { key: "participations", label: "Antritte" },
  { key: "best_placement", label: "Beste Platzierung" },
] as const

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
}

function toDateInputValue(iso: string) {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function toTimeInputValue(iso: string) {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mi}`
}

function combineLocalDateTime(dateStr: string, timeStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  const [hh, mi] = timeStr.split(":").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mi ?? 0, 0, 0).toISOString()
}

function money(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("de-AT", { style: "currency", currency: "EUR" })
}

function accessLabel(value: DkoSeries["access_type"]) {
  if (value === "club_internal") return "Nur Verein"
  if (value === "club_external") return "Verein + Externe"
  return "Öffentlich"
}

function ToggleRow({
  checked,
  onChange,
  title,
  text,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  title: string
  text?: string
}) {
  return (
    <label className="emd-series-toggle flex cursor-pointer items-center justify-between gap-4 rounded-2xl p-4">
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-900">{title}</span>
        {text ? <span className="mt-0.5 block text-xs leading-5 text-slate-500">{text}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0"
      />
    </label>
  )
}

export function AdminTournamentSeriesManagement() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [series, setSeries] = useState<DkoSeries[]>([])
  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(null)

  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false)
  const [newSeriesName, setNewSeriesName] = useState("")
  const [newSeriesType, setNewSeriesType] = useState("other")
  const [newSeriesAccessType, setNewSeriesAccessType] = useState<DkoSeries["access_type"]>("public")
  const [newSeriesActive, setNewSeriesActive] = useState(true)
  const [creatingSeries, setCreatingSeries] = useState(false)

  const [editSeries, setEditSeries] = useState<DkoSeries | null>(null)
  const [savingSeries, setSavingSeries] = useState(false)
  const [seriesSaveState, setSeriesSaveState] = useState<"idle" | "saved" | "error">("idle")
  const [rulesLoading, setRulesLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [seriesDeleteTarget, setSeriesDeleteTarget] = useState<DkoSeries | null>(null)

  const [pointRules, setPointRules] = useState<PointRule[]>([])
  const [participationBonuses, setParticipationBonuses] = useState<ParticipationBonus[]>([])
  const [cashRewards, setCashRewards] = useState<CashReward[]>([])
  const [tiebreakRules, setTiebreakRules] = useState<TiebreakRule[]>([])

  const [events, setEvents] = useState<DkoSeriesEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)

  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<DkoSeriesEvent | null>(null)
  const [eventTitle, setEventTitle] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [eventIsRescheduled, setEventIsRescheduled] = useState(false)
  const [eventRescheduledDate, setEventRescheduledDate] = useState("")
  const [eventRescheduledTime, setEventRescheduledTime] = useState("")
  const [eventLocation, setEventLocation] = useState("")
  const [eventIsMatchday, setEventIsMatchday] = useState(true)
  const [eventCutoff, setEventCutoff] = useState(10)
  const [eventNotes, setEventNotes] = useState("")
  const [eventTournamentFormatOverride, setEventTournamentFormatOverride] = useState("")
  const [eventTeamModeOverride, setEventTeamModeOverride] = useState("")
  const [eventDrawMethodOverride, setEventDrawMethodOverride] = useState("")
  const [eventNoShowPenaltyOverride, setEventNoShowPenaltyOverride] = useState("")



  async function fetchSeries(preferredId?: string | null) {
    setLoading(true)
    const { data, error } = await supabase.from("dko_series").select("*").order("created_at", { ascending: false })

    if (error) {
      toast({ title: "Fehler", description: "Turnierserien konnten nicht geladen werden", variant: "destructive" })
      setLoading(false)
      return
    }

    const list = (data || []) as DkoSeries[]
    setSeries(list)

    const nextId =
      preferredId && list.some((s) => s.id === preferredId)
        ? preferredId
        : activeSeriesId && list.some((s) => s.id === activeSeriesId)
          ? activeSeriesId
          : list[0]?.id || null

    setActiveSeriesId(nextId)
    setLoading(false)
  }

  async function fetchEvents(seriesId: string) {
    setEventsLoading(true)
    const { data, error } = await supabase
      .from("dko_series_events")
      .select("*")
      .eq("series_id", seriesId)
      .order("start_at", { ascending: true })

    if (error) {
      toast({ title: "Fehler", description: "Termine konnten nicht geladen werden", variant: "destructive" })
      setEventsLoading(false)
      return
    }

    setEvents((data || []) as DkoSeriesEvent[])
    setEventsLoading(false)
  }

  async function loadRuleTables(seriesId: string) {
    setRulesLoading(true)
    try {
      const [p, b, c, t] = await Promise.all([
        supabase
          .from("dko_series_point_rules")
          .select("*")
          .eq("series_id", seriesId)
          .order("sort_order", { ascending: true })
          .order("place_from", { ascending: true }),
        supabase
          .from("dko_series_participation_bonuses")
          .select("*")
          .eq("series_id", seriesId)
          .order("required_starts", { ascending: true }),
        supabase
          .from("dko_series_cash_rewards")
          .select("*")
          .eq("series_id", seriesId)
          .order("required_starts", { ascending: true }),
        supabase
          .from("dko_series_tiebreak_rules")
          .select("*")
          .eq("series_id", seriesId)
          .order("priority", { ascending: true }),
      ])

      const firstError = p.error || b.error || c.error || t.error
      if (firstError) throw firstError

      setPointRules((p.data || []) as PointRule[])
      setParticipationBonuses((b.data || []) as ParticipationBonus[])
      setCashRewards((c.data || []) as CashReward[])
      setTiebreakRules((t.data || []) as TiebreakRule[])
    } catch (error: any) {
      toast({ title: "Fehler", description: error?.message || "Serienregeln konnten nicht geladen werden.", variant: "destructive" })
      setPointRules([])
      setParticipationBonuses([])
      setCashRewards([])
      setTiebreakRules([])
    } finally {
      setRulesLoading(false)
    }
  }

  async function openSeriesSettings(s: DkoSeries) {
    setActiveSeriesId(s.id)
    setEditSeries({ ...s })
    await loadRuleTables(s.id)
  }

  useEffect(() => {
    void fetchSeries()

    const ch = supabase
      .channel("admin_dko_series_v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series" }, () => void fetchSeries())
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series_events" }, () => {
        if (activeSeriesId) void fetchEvents(activeSeriesId)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeSeriesId) {
      setEvents([])
      return
    }
    void fetchEvents(activeSeriesId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSeriesId])

  function seriesImageUrl(path: string | null | undefined) {
    if (!path) return ""
    return supabase.storage.from("tournament-photos").getPublicUrl(path).data.publicUrl
  }

  async function uploadSeriesImage(file: File) {
    if (!editSeries || !file) return

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Bild nicht unterstützt", description: "Bitte JPG, PNG oder WEBP verwenden.", variant: "destructive" })
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Bild zu groß", description: "Das Bild darf maximal 8 MB groß sein.", variant: "destructive" })
      return
    }

    setUploadingImage(true)
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "")
      const path = `series/${editSeries.id}/${crypto.randomUUID()}.${ext || "jpg"}`

      const { error: uploadError } = await supabase.storage
        .from("tournament-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type })

      if (uploadError) throw uploadError

      const oldPath = editSeries.image_path
      const { error: updateError } = await supabase
        .from("dko_series")
        .update({ image_path: path })
        .eq("id", editSeries.id)

      if (updateError) {
        await supabase.storage.from("tournament-photos").remove([path])
        throw updateError
      }

      if (oldPath) {
        await supabase.storage.from("tournament-photos").remove([oldPath])
      }

      setEditSeries({ ...editSeries, image_path: path })
      await fetchSeries(editSeries.id)
      toast({ title: "Gespeichert", description: "Serienbild wurde aktualisiert." })
    } catch (error: any) {
      toast({ title: "Fehler", description: error?.message || "Bild konnte nicht hochgeladen werden.", variant: "destructive" })
    } finally {
      setUploadingImage(false)
    }
  }

  async function removeSeriesImage() {
    if (!editSeries?.image_path) return
    setUploadingImage(true)
    try {
      const oldPath = editSeries.image_path
      const { error: updateError } = await supabase
        .from("dko_series")
        .update({ image_path: null })
        .eq("id", editSeries.id)

      if (updateError) throw updateError

      await supabase.storage.from("tournament-photos").remove([oldPath])
      setEditSeries({ ...editSeries, image_path: null })
      await fetchSeries(editSeries.id)
      toast({ title: "Entfernt", description: "Serienbild wurde entfernt." })
    } catch (error: any) {
      toast({ title: "Fehler", description: error?.message || "Bild konnte nicht entfernt werden.", variant: "destructive" })
    } finally {
      setUploadingImage(false)
    }
  }

  async function createSeries() {
    const name = newSeriesName.trim()
    const slug = slugify(name)

    if (!name || !slug) {
      toast({ title: "Fehler", description: "Bitte einen Seriennamen eingeben.", variant: "destructive" })
      return
    }

    setCreatingSeries(true)
    try {
      const { data, error } = await supabase
        .from("dko_series")
        .insert({
          name,
          slug,
          is_active: newSeriesActive,
          series_type: newSeriesType,
          access_type: newSeriesAccessType,
          startgeld: 0,
          qualification_requirement: 0,
          total_tournament_days: 0,
          series_fee: 0,
          placement_scoring_mode: "fixed",
          dynamic_last_place_points: 10,
          dynamic_step_points: 2,
          result_counting_mode: "all",
          best_n_results: null,
          legs_scoring_active: false,
          legs_points_per_win: 1,
          undefeated_winner_bonus_active: false,
          undefeated_winner_bonus_points: 0,
          participation_bonus_mode: "highest_only",
          registration_enabled: true,
          image_path: null,
          registration_open_mode: "event_day",
          registration_open_time: "00:00",
          registration_close_mode: "minutes_before_start",
          registration_close_time: null,
          unregister_close_mode: "same_as_registration",
          unregister_close_time: null,
          require_even_participants: false,
          odd_participant_policy: "allow",
          no_show_penalty_mode: "none",
          min_participants: null,
          max_participants: null,
        })
        .select("*")
        .single()

      if (error) throw error

      const created = data as DkoSeries
      toast({ title: "Erfolg", description: "Turnierserie erstellt. Jetzt kannst du alle Regeln konfigurieren." })
      setSeriesDialogOpen(false)
      setNewSeriesName("")
      setNewSeriesType("other")
      setNewSeriesAccessType("public")
      setNewSeriesActive(true)

      await fetchSeries(created.id)
      await openSeriesSettings(created)
    } catch (error: any) {
      toast({ title: "Fehler", description: error?.message || "Serie konnte nicht erstellt werden.", variant: "destructive" })
    } finally {
      setCreatingSeries(false)
    }
  }

  async function saveChildRows(
    table: string,
    seriesId: string,
    rows: Record<string, unknown>[],
  ) {
    const { error: deleteError } = await supabase.from(table).delete().eq("series_id", seriesId)
    if (deleteError) throw deleteError

    if (rows.length === 0) return

    const { error: insertError } = await supabase.from(table).insert(rows)
    if (insertError) throw insertError
  }

  async function updateSeries() {
    if (!editSeries) return

    const name = editSeries.name.trim()

    if (!name) {
      toast({ title: "Fehler", description: "Bitte einen Seriennamen eingeben.", variant: "destructive" })
      return
    }

    if (editSeries.result_counting_mode === "best_n" && Number(editSeries.best_n_results || 0) < 1) {
      toast({ title: "Fehler", description: "Bei Best-X muss mindestens 1 Ergebnis zählen.", variant: "destructive" })
      return
    }

    const cleanedPointRules = pointRules
      .filter((r) => Number(r.place_from) >= 1 && Number(r.place_to) >= Number(r.place_from))
      .map((r, i) => ({
        series_id: editSeries.id,
        place_from: Math.floor(Number(r.place_from)),
        place_to: Math.floor(Number(r.place_to)),
        points: Math.max(0, Number(r.points) || 0),
        sort_order: i,
      }))

    const cleanedBonuses = participationBonuses
      .filter((r) => Number(r.required_starts) >= 1)
      .map((r, i) => ({
        series_id: editSeries.id,
        required_starts: Math.floor(Number(r.required_starts)),
        bonus_points: Math.max(0, Number(r.bonus_points) || 0),
        label: r.label?.trim() || null,
        sort_order: i,
      }))

    const cleanedCash = cashRewards
      .filter((r) => Number(r.required_starts) >= 1)
      .map((r, i) => ({
        series_id: editSeries.id,
        required_starts: Math.floor(Number(r.required_starts)),
        amount: Math.max(0, Number(r.amount) || 0),
        one_time: r.one_time !== false,
        label: r.label?.trim() || null,
        sort_order: i,
      }))

    const cleanedTiebreaks = tiebreakRules
      .filter((r) => r.rule_key)
      .map((r, i) => ({
        series_id: editSeries.id,
        priority: i + 1,
        rule_key: r.rule_key,
        label: TIEBREAK_OPTIONS.find((x) => x.key === r.rule_key)?.label || r.label || r.rule_key,
      }))

    setSeriesSaveState("idle")
    setSavingSeries(true)
    try {
      const { error } = await supabase
        .from("dko_series")
        .update({
          name,
          is_active: !!editSeries.is_active,
          series_type: editSeries.series_type || "other",
          access_type: editSeries.access_type || "public",

          description: editSeries.description?.trim() || null,
          rules_text: editSeries.rules_text?.trim() || null,

          series_fee: Math.max(0, Number(editSeries.series_fee) || 0),
          startgeld: Math.max(0, Number(editSeries.startgeld) || 0),

          qualification_requirement: Math.max(0, Math.floor(Number(editSeries.qualification_requirement) || 0)),
          total_tournament_days: Math.max(0, Math.floor(Number(editSeries.total_tournament_days) || 0)),

          placement_scoring_mode: editSeries.placement_scoring_mode,
          dynamic_last_place_points: Math.max(0, Number(editSeries.dynamic_last_place_points) || 0),
          dynamic_step_points: Math.max(0, Number(editSeries.dynamic_step_points) || 0),

          result_counting_mode: editSeries.result_counting_mode,
          best_n_results:
            editSeries.result_counting_mode === "best_n"
              ? Math.max(1, Math.floor(Number(editSeries.best_n_results) || 1))
              : null,

          legs_scoring_active: !!editSeries.legs_scoring_active,
          legs_points_per_win: Math.max(0, Number(editSeries.legs_points_per_win) || 0),

          undefeated_winner_bonus_active: !!editSeries.undefeated_winner_bonus_active,
          undefeated_winner_bonus_points: Math.max(0, Number(editSeries.undefeated_winner_bonus_points) || 0),

          participation_bonus_mode: editSeries.participation_bonus_mode,
          registration_enabled: !!editSeries.registration_enabled,

          registration_open_mode: editSeries.registration_open_mode || "event_day",
          registration_open_time: editSeries.registration_open_time || "00:00",
          registration_close_mode: editSeries.registration_close_mode || "minutes_before_start",
          registration_close_time:
            editSeries.registration_close_mode === "fixed_time"
              ? editSeries.registration_close_time || "17:00"
              : null,
          unregister_close_mode: editSeries.unregister_close_mode || "same_as_registration",
          unregister_close_time:
            editSeries.unregister_close_mode === "fixed_time"
              ? editSeries.unregister_close_time || "14:00"
              : null,
          require_even_participants: !!editSeries.require_even_participants,
          odd_participant_policy: editSeries.require_even_participants
            ? editSeries.odd_participant_policy || "last_waitlist"
            : "allow",
          no_show_penalty_mode: editSeries.no_show_penalty_mode || "none",
          min_participants:
            Number(editSeries.min_participants || 0) >= 1
              ? Math.floor(Number(editSeries.min_participants))
              : null,
          max_participants:
            Number(editSeries.max_participants || 0) >= 1
              ? Math.floor(Number(editSeries.max_participants))
              : null,

          tournament_format: editSeries.tournament_format || "dko",
          team_mode: editSeries.team_mode || "single",
          draw_method:
            editSeries.team_mode === "single"
              ? "none"
              : editSeries.draw_method || "none",
        })
        .eq("id", editSeries.id)

      if (error) throw error

      await saveChildRows("dko_series_point_rules", editSeries.id, cleanedPointRules)
      await saveChildRows("dko_series_participation_bonuses", editSeries.id, cleanedBonuses)
      await saveChildRows("dko_series_cash_rewards", editSeries.id, cleanedCash)
      await saveChildRows("dko_series_tiebreak_rules", editSeries.id, cleanedTiebreaks)

      const { data: refreshedSeries, error: refreshedSeriesError } = await supabase
        .from("dko_series")
        .select("*")
        .eq("id", editSeries.id)
        .single()

      if (refreshedSeriesError) throw refreshedSeriesError

      setEditSeries(refreshedSeries as DkoSeries)
      setSeries((prev) =>
        prev.map((item) => (item.id === editSeries.id ? (refreshedSeries as DkoSeries) : item)),
      )
      setSeriesSaveState("saved")
      toast({ title: "Gespeichert", description: "Serienkonfiguration wurde vollständig gespeichert." })
      await loadRuleTables(editSeries.id)

      window.setTimeout(() => setSeriesSaveState("idle"), 3000)
    } catch (error: any) {
      setSeriesSaveState("error")
      toast({ title: "Fehler", description: error?.message || "Serie konnte nicht gespeichert werden.", variant: "destructive" })
    } finally {
      setSavingSeries(false)
    }
  }

  async function deleteSeriesConfirmed() {
    if (!seriesDeleteTarget) return

    const id = seriesDeleteTarget.id
    const { error } = await supabase.from("dko_series").delete().eq("id", id)

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" })
      return
    }

    toast({ title: "Serie gelöscht", description: `${seriesDeleteTarget.name} wurde gelöscht.` })
    setSeriesDeleteTarget(null)

    if (activeSeriesId === id) setActiveSeriesId(null)
    if (editSeries?.id === id) setEditSeries(null)

    await fetchSeries()
  }

  function addPointRule() {
    const lastTo = pointRules.at(-1)?.place_to || 0
    setPointRules((prev) => [
      ...prev,
      { place_from: lastTo + 1, place_to: lastTo + 1, points: 0, sort_order: prev.length },
    ])
  }

  function addParticipationBonus() {
    const lastStarts = participationBonuses.at(-1)?.required_starts || 0
    setParticipationBonuses((prev) => [
      ...prev,
      { required_starts: lastStarts + 1, bonus_points: 0, label: null, sort_order: prev.length },
    ])
  }

  function addCashReward() {
    const lastStarts = cashRewards.at(-1)?.required_starts || 0
    setCashRewards((prev) => [
      ...prev,
      { required_starts: lastStarts + 1, amount: 0, one_time: true, label: null, sort_order: prev.length },
    ])
  }

  function addTiebreakRule() {
    const used = new Set(tiebreakRules.map((r) => r.rule_key))
    const firstFree = TIEBREAK_OPTIONS.find((option) => !used.has(option.key))
    if (!firstFree) return

    setTiebreakRules((prev) => [
      ...prev,
      { priority: prev.length + 1, rule_key: firstFree.key, label: firstFree.label },
    ])
  }

  function moveTiebreak(index: number, direction: -1 | 1) {
    setTiebreakRules((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      ;[copy[index], copy[target]] = [copy[target], copy[index]]
      return copy.map((r, i) => ({ ...r, priority: i + 1 }))
    })
  }

  function openCreateEvent() {
    if (!activeSeriesId) return

    setEditEvent(null)
    setEventTitle("")
    setEventLocation("")
    setEventIsMatchday(true)
    setEventCutoff(10)
    setEventNotes("")
    setEventTournamentFormatOverride("")
    setEventTeamModeOverride("")
    setEventDrawMethodOverride("")
    setEventNoShowPenaltyOverride("")
    setEventIsRescheduled(false)
    setEventRescheduledDate("")
    setEventRescheduledTime("")

    const now = new Date()
    setEventDate(toDateInputValue(now.toISOString()))
    setEventTime("19:30")
    setEventDialogOpen(true)
  }

  function openEditEvent(ev: DkoSeriesEvent) {
    setEditEvent(ev)
    setEventTitle(ev.title ?? "")
    setEventLocation(ev.location ?? "")
    setEventIsMatchday(ev.is_matchday)
    setEventCutoff(ev.registration_cutoff_minutes ?? 10)
    setEventNotes(ev.notes ?? "")
    setEventTournamentFormatOverride(ev.tournament_format_override ?? "")
    setEventTeamModeOverride(ev.team_mode_override ?? "")
    setEventDrawMethodOverride(ev.draw_method_override ?? "")
    setEventNoShowPenaltyOverride(ev.no_show_penalty_mode_override ?? "")
    setEventDate(toDateInputValue(ev.start_at))
    setEventTime(toTimeInputValue(ev.start_at))

    const isRes = !!ev.is_rescheduled && !!ev.rescheduled_at
    setEventIsRescheduled(isRes)

    if (isRes && ev.rescheduled_at) {
      setEventRescheduledDate(toDateInputValue(ev.rescheduled_at))
      setEventRescheduledTime(toTimeInputValue(ev.rescheduled_at))
    } else {
      setEventRescheduledDate("")
      setEventRescheduledTime("")
    }

    setEventDialogOpen(true)
  }

  async function saveEvent() {
    if (!activeSeriesId) return

    if (!eventDate || !eventTime) {
      toast({ title: "Fehler", description: "Bitte Datum und Uhrzeit wählen.", variant: "destructive" })
      return
    }

    const start_at = combineLocalDateTime(eventDate, eventTime)
    let rescheduled_at: string | null = null
    let is_rescheduled = false

    if (eventIsRescheduled) {
      if (!eventRescheduledDate || !eventRescheduledTime) {
        toast({ title: "Fehler", description: "Bitte neuen Termin vollständig angeben.", variant: "destructive" })
        return
      }
      rescheduled_at = combineLocalDateTime(eventRescheduledDate, eventRescheduledTime)
      is_rescheduled = true
    }

    const payload = {
      title: eventTitle.trim() || null,
      start_at,
      is_rescheduled,
      rescheduled_at,
      location: eventLocation.trim() || null,
      is_matchday: eventIsMatchday,
      registration_cutoff_minutes: Math.max(0, Number(eventCutoff) || 0),
      tournament_format_override: eventTournamentFormatOverride || null,
      team_mode_override: eventTeamModeOverride || null,
      draw_method_override:
        eventTeamModeOverride === "single"
          ? "none"
          : eventDrawMethodOverride || null,
      no_show_penalty_mode_override: eventNoShowPenaltyOverride || null,
      notes: eventNotes.trim() || null,
    }

    const query = editEvent
      ? supabase.from("dko_series_events").update(payload).eq("id", editEvent.id)
      : supabase.from("dko_series_events").insert({ ...payload, series_id: activeSeriesId })

    const { error } = await query
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" })
      return
    }

    toast({ title: "Erfolg", description: editEvent ? "Termin gespeichert" : "Termin erstellt" })
    setEventDialogOpen(false)
    setEditEvent(null)
    await fetchEvents(activeSeriesId)
  }

  async function deleteEvent(id: string) {
    if (!activeSeriesId) return
    if (!confirm("Termin wirklich löschen?")) return

    const { error } = await supabase.from("dko_series_events").delete().eq("id", id)
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" })
      return
    }

    toast({ title: "Erfolg", description: "Termin gelöscht" })
    await fetchEvents(activeSeriesId)
  }

  const activeSeries = useMemo(
    () => series.find((s) => s.id === activeSeriesId) ?? null,
    [series, activeSeriesId],
  )

  const activeSeriesCount = useMemo(() => series.filter((s) => s.is_active).length, [series])

  const nextEvent = useMemo(() => {
    const now = Date.now()
    return (
      [...events]
        .map((ev) => {
          const effectiveIso = ev.is_rescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at
          return { ev, effectiveIso, ts: new Date(effectiveIso).getTime() }
        })
        .filter((entry) => Number.isFinite(entry.ts) && entry.ts >= now)
        .sort((a, b) => a.ts - b.ts)[0] ?? null
    )
  }, [events])

  const matchdayCount = useMemo(() => events.filter((ev) => ev.is_matchday).length, [events])


  return (
    <div className="emd-admin-page emd-tournament-series-page">
      <div className="emd-admin-content px-0 py-0">
        <section className="emd-admin-hero emd-series-hero">
          <div className="emd-series-hero-line" />
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                <Trophy className="h-3.5 w-3.5" />
                Turnierzentrale
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Turnierserien & Spieltage
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Serien, Wertung, Gebühren, Anmeldung und Spieltage zentral verwalten.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void fetchSeries(activeSeriesId)}
                className="h-11 rounded-xl border-slate-200 bg-white"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Aktualisieren
              </Button>

              <Dialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="emd-admin-button-primary h-11 px-5">
                    <Plus className="mr-2 h-4 w-4" />
                    Neue Serie
                  </Button>
                </DialogTrigger>

                <DialogContent className="emd-admin-modal max-w-xl rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>Neue Turnierserie</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                      <Label>Serienname *</Label>
                      <Input
                        value={newSeriesName}
                        onChange={(e) => setNewSeriesName(e.target.value)}
                        placeholder="z. B. EMD Winter Cup 2027"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Serientyp</Label>
                        <select
                          value={newSeriesType}
                          onChange={(e) => setNewSeriesType(e.target.value)}
                          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="lion_cup">Lion Cup</option>
                          <option value="summer_special">Summer Special</option>
                          <option value="members_cup">Members Champion Cup</option>
                          <option value="challenge_division">Challenge Division</option>
                          <option value="buffalo_cup">Buffalo Steel Cup</option>
                          <option value="other">Andere / neue Serie</option>
                        </select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Zugriff</Label>
                        <select
                          value={newSeriesAccessType}
                          onChange={(e) => setNewSeriesAccessType(e.target.value as DkoSeries["access_type"])}
                          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="public">Öffentlich – jeder kann teilnehmen</option>
                          <option value="club_internal">Intern – nur Vereinsmitglieder</option>
                          <option value="club_external">Verein + Externe</option>
                        </select>
                      </div>
                    </div>

                    <ToggleRow
                      checked={newSeriesActive}
                      onChange={setNewSeriesActive}
                      title="Serie aktiv"
                      text="Aktive Serien können später automatisch in der Turnierübersicht erscheinen."
                    />

                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                      Nach dem Erstellen kannst du alle Einstellungen der Serie direkt bearbeiten.
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setSeriesDialogOpen(false)}>
                        Abbrechen
                      </Button>
                      <Button onClick={() => void createSeries()} disabled={creatingSeries}>
                        <Save className="mr-2 h-4 w-4" />
                        {creatingSeries ? "Erstelle…" : "Serie erstellen"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="emd-admin-stat emd-series-stat">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Serien</div>
            <div className="mt-1 text-2xl font-black text-slate-950">{series.length}</div>
          </div>
          <div className="emd-admin-stat emd-series-stat">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Aktiv</div>
            <div className="mt-1 text-2xl font-black text-slate-950">{activeSeriesCount}</div>
          </div>
          <div className="emd-admin-stat emd-series-stat">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Spieltage</div>
            <div className="mt-1 text-2xl font-black text-slate-950">{matchdayCount}</div>
            <div className="mt-0.5 truncate text-[11px] text-slate-500">{activeSeries?.name || "Serie auswählen"}</div>
          </div>
          <div className="emd-admin-stat emd-series-stat">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Nächster Termin</div>
            <div className="mt-1 text-sm font-black text-slate-950">
              {nextEvent ? new Date(nextEvent.effectiveIso).toLocaleDateString("de-AT") : "—"}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              {nextEvent
                ? new Date(nextEvent.effectiveIso).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" }) + " Uhr"
                : "Kein weiterer Termin"}
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="emd-admin-surface emd-series-surface overflow-hidden border-0">
            <CardHeader className="emd-series-card-header p-5">
              <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                <Layers3 className="h-5 w-5 text-slate-600" />
                Serien
              </CardTitle>
              <p className="text-sm text-slate-500">Serie auswählen und vollständig konfigurieren.</p>
            </CardHeader>

            <CardContent className="space-y-2 p-4">
              {loading ? (
                <div className="p-4 text-sm text-slate-600">Lade Serien…</div>
              ) : series.length === 0 ? (
                <div className="p-4 text-sm text-slate-600">Keine Serien vorhanden.</div>
              ) : (
                series.map((s) => (
                  <div
                    key={s.id}
                    className={`emd-series-list-item group rounded-2xl border p-3.5 transition ${
                      s.id === activeSeriesId ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveSeriesId(s.id)}
                      className="w-full text-left"
                    >
                      <div className="truncate font-black text-slate-950">{s.name}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                        <span className={`emd-series-status rounded-full px-2 py-1 ${s.is_active ? "emd-series-status-active" : "emd-series-status-inactive"}`}>
                          {s.is_active ? "Aktiv" : "Inaktiv"}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">{accessLabel(s.access_type)}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{money(s.startgeld)}</span>
                      </div>
                    </button>

                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => void openSeriesSettings(s)}
                      >
                        <Settings2 className="mr-2 h-4 w-4" />
                        Einstellungen
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setSeriesDeleteTarget(s)}
                        title="Serie löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="min-w-0 space-y-5">
            {editSeries ? (
              <Card className="emd-admin-surface-lg emd-series-config-surface overflow-hidden border-0">
                <CardHeader className="emd-series-config-header p-5 text-white sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">Serienkonfiguration</div>
                      <CardTitle className="mt-1 text-2xl font-black text-white">{editSeries.name}</CardTitle>
                      <p className="mt-1 text-sm text-white/60">Alle Einstellungen dieser Turnierserie auf einen Blick.</p>
                    </div>
                    <Button
                      variant="outline"
                      className="border-white/20 bg-white/10 text-white hover:bg-white/15"
                      onClick={() => setEditSeries(null)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Schließen
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 p-4 sm:p-6">
                  {rulesLoading ? (
                    <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">Serienregeln werden geladen…</div>
                  ) : (
                    <>
                      <section className="emd-series-config-section emd-series-config-neutral p-4 sm:p-5">
                        <div className="flex items-center gap-2">
                          <Settings2 className="h-5 w-5 text-slate-700" />
                          <h2 className="text-lg font-black text-slate-950">Grundeinstellungen</h2>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Name</Label>
                            <Input value={editSeries.name} onChange={(e) => setEditSeries({ ...editSeries, name: e.target.value })} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Serientyp</Label>
                            <select
                              value={editSeries.series_type || "other"}
                              onChange={(e) => setEditSeries({ ...editSeries, series_type: e.target.value })}
                              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="lion_cup">Lion Cup</option>
                              <option value="summer_special">Summer Special</option>
                              <option value="members_cup">Members Champion Cup</option>
                              <option value="challenge_division">Challenge Division</option>
                              <option value="buffalo_cup">Buffalo Steel Cup</option>
                              <option value="other">Andere / neue Serie</option>
                            </select>
                          </div>

                          <div className="grid gap-2">
                            <Label>Zugriff</Label>
                            <select
                              value={editSeries.access_type || "public"}
                              onChange={(e) => setEditSeries({ ...editSeries, access_type: e.target.value as DkoSeries["access_type"] })}
                              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="public">Öffentlich – jeder kann teilnehmen</option>
                              <option value="club_internal">Intern – nur Vereinsmitglieder</option>
                              <option value="club_external">Verein + Externe</option>
                            </select>
                          </div>


                          <div className="grid gap-2 lg:col-span-2">
                            <Label>Serienbild</Label>
                            <div className="grid gap-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-center">
                              <div className="aspect-[16/10] overflow-hidden rounded-2xl border border-white/[0.08] bg-black/25">
                                {editSeries.image_path ? (
                                  <img
                                    src={seriesImageUrl(editSeries.image_path)}
                                    alt={editSeries.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-white/20">
                                    <ImagePlus className="h-9 w-9" />
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <label className="emd-admin-button-secondary inline-flex cursor-pointer items-center justify-center gap-2 px-4">
                                  <Upload className="h-4 w-4" />
                                  {uploadingImage ? "Wird hochgeladen…" : editSeries.image_path ? "Bild ändern" : "Bild hochladen"}
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    disabled={uploadingImage}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) void uploadSeriesImage(file)
                                      e.currentTarget.value = ""
                                    }}
                                  />
                                </label>

                                {editSeries.image_path ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={uploadingImage}
                                    onClick={() => void removeSeriesImage()}
                                    className="emd-admin-button-danger"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Entfernen
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-2 lg:col-span-2">
                            <Label>Beschreibung</Label>
                            <textarea
                              value={editSeries.description || ""}
                              onChange={(e) => setEditSeries({ ...editSeries, description: e.target.value })}
                              rows={3}
                              className="min-h-[90px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                              placeholder="Kurze Beschreibung für spätere öffentliche Turnierseite…"
                            />
                          </div>

                          <ToggleRow
                            checked={!!editSeries.is_active}
                            onChange={(checked) => setEditSeries({ ...editSeries, is_active: checked })}
                            title="Serie aktiv"
                            text="Nur aktive Serien sollen später als aktuell/kommend behandelt werden."
                          />

                          <ToggleRow
                            checked={!!editSeries.registration_enabled}
                            onChange={(checked) => setEditSeries({ ...editSeries, registration_enabled: checked })}
                            title="Anmeldung aktiviert"
                            text="Kann unabhängig vom öffentlichen/internen Zugriff deaktiviert werden."
                          />
                        </div>
                      </section>

                      <section className="emd-series-config-section emd-series-config-green p-4 sm:p-5">
                        <div className="flex items-center gap-2">
                          <Euro className="h-5 w-5 text-emerald-700" />
                          <h2 className="text-lg font-black text-slate-950">Gebühren</h2>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Einmalige Seriengebühr (€)</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={editSeries.series_fee ?? 0}
                              onChange={(e) => setEditSeries({ ...editSeries, series_fee: Number(e.target.value) })}
                            />
                            <p className="text-xs text-slate-500">Einmal pro Spieler und Serie.</p>
                          </div>

                          <div className="grid gap-2">
                            <Label>Startgeld pro Teilnahme (€)</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={editSeries.startgeld ?? 0}
                              onChange={(e) => setEditSeries({ ...editSeries, startgeld: Number(e.target.value) })}
                            />
                            <p className="text-xs text-slate-500">Wird bei jedem Spieltag fällig.</p>
                          </div>
                        </div>
                      </section>

                      <section className="emd-series-config-section emd-series-config-blue p-4 sm:p-5">
                        <div className="flex items-center gap-2">
                          <Target className="h-5 w-5 text-blue-700" />
                          <h2 className="text-lg font-black text-slate-950">Wertung</h2>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Platzierungspunkte</Label>
                            <select
                              value={editSeries.placement_scoring_mode}
                              onChange={(e) =>
                                setEditSeries({
                                  ...editSeries,
                                  placement_scoring_mode: e.target.value as DkoSeries["placement_scoring_mode"],
                                })
                              }
                              className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                            >
                              <option value="fixed">Eigener Punkteschlüssel</option>
                              <option value="dynamic">Dynamisch vom letzten Platz aufsteigend</option>
                            </select>
                          </div>

                          <div className="grid gap-2">
                            <Label>Ergebnisse zählen</Label>
                            <select
                              value={editSeries.result_counting_mode}
                              onChange={(e) =>
                                setEditSeries({
                                  ...editSeries,
                                  result_counting_mode: e.target.value as DkoSeries["result_counting_mode"],
                                })
                              }
                              className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                            >
                              <option value="all">Alle Ergebnisse zählen</option>
                              <option value="best_n">Nur die besten X Ergebnisse</option>
                            </select>
                          </div>

                          {editSeries.result_counting_mode === "best_n" ? (
                            <div className="grid gap-2">
                              <Label>Beste X Ergebnisse</Label>
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                value={editSeries.best_n_results ?? 8}
                                onChange={(e) => setEditSeries({ ...editSeries, best_n_results: Number(e.target.value) })}
                              />
                            </div>
                          ) : null}

                          <div className="grid gap-2">
                            <Label>Mindestantritte / Qualifikation</Label>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={editSeries.qualification_requirement ?? 0}
                              onChange={(e) => setEditSeries({ ...editSeries, qualification_requirement: Number(e.target.value) })}
                            />
                            <p className="text-xs text-slate-500">0 = keine Mindestanzahl.</p>
                          </div>

                          <div className="grid gap-2">
                            <Label>Geplante Spieltage gesamt</Label>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={editSeries.total_tournament_days ?? 0}
                              onChange={(e) => setEditSeries({ ...editSeries, total_tournament_days: Number(e.target.value) })}
                            />
                          </div>
                        </div>

                        {editSeries.placement_scoring_mode === "dynamic" ? (
                          <div className="mt-5 rounded-2xl border border-blue-200 bg-white p-4">
                            <div className="font-black text-slate-900">Dynamische Platzierungspunkte</div>
                            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                              <div className="grid gap-2">
                                <Label>Letzter Platz erhält</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  value={editSeries.dynamic_last_place_points ?? 10}
                                  onChange={(e) => setEditSeries({ ...editSeries, dynamic_last_place_points: Number(e.target.value) })}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Je bessere Platzierung +</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  value={editSeries.dynamic_step_points ?? 2}
                                  onChange={(e) => setEditSeries({ ...editSeries, dynamic_step_points: Number(e.target.value) })}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-5 rounded-2xl border border-blue-200 bg-white p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="font-black text-slate-900">Punkteschlüssel</div>
                                <p className="text-xs text-slate-500">Platzbereiche möglich, z. B. 5–6 = 50 Punkte.</p>
                              </div>
                              <Button type="button" variant="outline" size="sm" onClick={addPointRule}>
                                <Plus className="mr-2 h-4 w-4" />
                                Regel
                              </Button>
                            </div>

                            <div className="mt-4 space-y-2">
                              {pointRules.length === 0 ? (
                                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Noch kein Punkteschlüssel hinterlegt.</div>
                              ) : (
                                pointRules.map((rule, index) => (
                                  <div key={rule.id || index} className="grid grid-cols-[1fr_1fr_1fr_42px] gap-2">
                                    <Input
                                      type="number"
                                      min={1}
                                      value={rule.place_from}
                                      title="von Platz"
                                      onChange={(e) =>
                                        setPointRules((prev) =>
                                          prev.map((x, i) => (i === index ? { ...x, place_from: Number(e.target.value) } : x)),
                                        )
                                      }
                                    />
                                    <Input
                                      type="number"
                                      min={rule.place_from}
                                      value={rule.place_to}
                                      title="bis Platz"
                                      onChange={(e) =>
                                        setPointRules((prev) =>
                                          prev.map((x, i) => (i === index ? { ...x, place_to: Number(e.target.value) } : x)),
                                        )
                                      }
                                    />
                                    <Input
                                      type="number"
                                      min={0}
                                      step={0.5}
                                      value={rule.points}
                                      title="Punkte"
                                      onChange={(e) =>
                                        setPointRules((prev) =>
                                          prev.map((x, i) => (i === index ? { ...x, points: Number(e.target.value) } : x)),
                                        )
                                      }
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      onClick={() => setPointRules((prev) => prev.filter((_, i) => i !== index))}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                          <ToggleRow
                            checked={!!editSeries.legs_scoring_active}
                            onChange={(checked) => setEditSeries({ ...editSeries, legs_scoring_active: checked })}
                            title="Gewonnene Legs zusätzlich werten"
                            text="Leg-Punkte werden zusätzlich zu Platzierung und Boni gerechnet."
                          />

                          {editSeries.legs_scoring_active ? (
                            <div className="emd-series-field-card grid gap-2 rounded-2xl p-4">
                              <Label>Punkte pro gewonnenem Leg</Label>
                              <Input
                                type="number"
                                min={0}
                                step={0.5}
                                value={editSeries.legs_points_per_win ?? 1}
                                onChange={(e) => setEditSeries({ ...editSeries, legs_points_per_win: Number(e.target.value) })}
                              />
                            </div>
                          ) : null}

                          <ToggleRow
                            checked={!!editSeries.undefeated_winner_bonus_active}
                            onChange={(checked) => setEditSeries({ ...editSeries, undefeated_winner_bonus_active: checked })}
                            title="Bonus für Turniersieg ohne Niederlage"
                            text="Nur Platz 1 und kein verlorenes Match."
                          />

                          {editSeries.undefeated_winner_bonus_active ? (
                            <div className="emd-series-field-card grid gap-2 rounded-2xl p-4">
                              <Label>Bonus-Punkte</Label>
                              <Input
                                type="number"
                                min={0}
                                step={0.5}
                                value={editSeries.undefeated_winner_bonus_points ?? 0}
                                onChange={(e) =>
                                  setEditSeries({ ...editSeries, undefeated_winner_bonus_points: Number(e.target.value) })
                                }
                              />
                            </div>
                          ) : null}
                        </div>
                      </section>

                      <section className="emd-series-config-section emd-series-config-violet p-4 sm:p-5">
                        <div className="flex items-center gap-2">
                          <Layers3 className="h-5 w-5 text-violet-300" />
                          <h2 className="text-lg font-black text-slate-950">Turniermodus</h2>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-3">
                          <div className="grid gap-2">
                            <Label>Spielsystem</Label>
                            <select
                              value={editSeries.tournament_format || "dko"}
                              onChange={(e) =>
                                setEditSeries({
                                  ...editSeries,
                                  tournament_format: e.target.value as DkoSeries["tournament_format"],
                                })
                              }
                              className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                            >
                              {TOURNAMENT_FORMAT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid gap-2">
                            <Label>Spieler / Teams</Label>
                            <select
                              value={editSeries.team_mode || "single"}
                              onChange={(e) => {
                                const next = e.target.value as DkoSeries["team_mode"]
                                setEditSeries({
                                  ...editSeries,
                                  team_mode: next,
                                  draw_method: next === "single" ? "none" : editSeries.draw_method,
                                })
                              }}
                              className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                            >
                              {TEAM_MODE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid gap-2">
                            <Label>Auslosung</Label>
                            <select
                              value={editSeries.team_mode === "single" ? "none" : editSeries.draw_method || "none"}
                              disabled={editSeries.team_mode === "single"}
                              onChange={(e) =>
                                setEditSeries({
                                  ...editSeries,
                                  draw_method: e.target.value as DkoSeries["draw_method"],
                                })
                              }
                              className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm disabled:opacity-50"
                            >
                              {DRAW_METHOD_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                          <div className="text-xs font-black uppercase tracking-[0.12em] text-white/35">
                            Standard für die Serie
                          </div>
                          <div className="mt-1 font-black text-white/85">
                            {formatTournamentMode(
                              editSeries.tournament_format || "dko",
                              editSeries.team_mode || "single",
                              editSeries.draw_method || "none",
                            )}
                          </div>
                          <div className="mt-1 text-sm text-white/45">
                            Bei einzelnen Spieltagen kann davon abgewichen werden.
                          </div>
                        </div>
                      </section>

                      <SeriesLevelDrawManagement
                        seriesId={editSeries.id}
                        seriesName={editSeries.name}
                        drawMethod={editSeries.draw_method || "none"}
                        teamMode={editSeries.team_mode || "single"}
                        tournamentFormat={editSeries.tournament_format || "dko"}
                      />

                      <section className="emd-series-config-section emd-series-config-orange p-4 sm:p-5">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-orange-300" />
                          <h2 className="text-lg font-black text-slate-950">Anmeldung & Teilnahme</h2>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Anmeldung öffnet</Label>
                            <select
                              value={editSeries.registration_open_mode || "event_day"}
                              onChange={(e) =>
                                setEditSeries({
                                  ...editSeries,
                                  registration_open_mode: e.target.value as DkoSeries["registration_open_mode"],
                                })
                              }
                              className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                            >
                              <option value="event_day">Am Turniertag</option>
                              <option value="always">Sofort / dauerhaft geöffnet</option>
                            </select>
                          </div>

                          {editSeries.registration_open_mode === "event_day" ? (
                            <div className="grid gap-2">
                              <Label>Uhrzeit Anmeldung öffnet</Label>
                              <Input
                                type="time"
                                value={(editSeries.registration_open_time || "00:00").slice(0, 5)}
                                onChange={(e) =>
                                  setEditSeries({ ...editSeries, registration_open_time: e.target.value })
                                }
                              />
                            </div>
                          ) : null}

                          <div className="grid gap-2">
                            <Label>Anmeldung schließt</Label>
                            <select
                              value={editSeries.registration_close_mode || "minutes_before_start"}
                              onChange={(e) =>
                                setEditSeries({
                                  ...editSeries,
                                  registration_close_mode: e.target.value as DkoSeries["registration_close_mode"],
                                })
                              }
                              className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                            >
                              <option value="minutes_before_start">Minuten vor Turnierstart</option>
                              <option value="fixed_time">Fixe Uhrzeit am Turniertag</option>
                            </select>
                          </div>

                          {editSeries.registration_close_mode === "fixed_time" ? (
                            <div className="grid gap-2">
                              <Label>Anmeldeschluss</Label>
                              <Input
                                type="time"
                                value={(editSeries.registration_close_time || "17:00").slice(0, 5)}
                                onChange={(e) =>
                                  setEditSeries({ ...editSeries, registration_close_time: e.target.value })
                                }
                              />
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm text-white/55">
                              Die Minuten vor dem Start werden beim jeweiligen Spieltag festgelegt.
                            </div>
                          )}

                          <div className="grid gap-2">
                            <Label>Abmeldung schließt</Label>
                            <select
                              value={editSeries.unregister_close_mode || "same_as_registration"}
                              onChange={(e) =>
                                setEditSeries({
                                  ...editSeries,
                                  unregister_close_mode: e.target.value as DkoSeries["unregister_close_mode"],
                                })
                              }
                              className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                            >
                              <option value="same_as_registration">Gleich wie Anmeldung</option>
                              <option value="fixed_time">Fixe Uhrzeit am Turniertag</option>
                              <option value="minutes_before_start">Minuten vor Turnierstart</option>
                            </select>
                          </div>

                          {editSeries.unregister_close_mode === "fixed_time" ? (
                            <div className="grid gap-2">
                              <Label>Abmeldeschluss</Label>
                              <Input
                                type="time"
                                value={(editSeries.unregister_close_time || "14:00").slice(0, 5)}
                                onChange={(e) =>
                                  setEditSeries({ ...editSeries, unregister_close_time: e.target.value })
                                }
                              />
                            </div>
                          ) : editSeries.unregister_close_mode === "minutes_before_start" ? (
                            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm text-white/55">
                              Es gilt der beim Spieltag eingetragene Zeitraum vor Turnierstart.
                            </div>
                          ) : null}

                          <div className="grid gap-2">
                            <Label>Mindestteilnehmer</Label>
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              value={editSeries.min_participants ?? ""}
                              onChange={(e) =>
                                setEditSeries({
                                  ...editSeries,
                                  min_participants: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              placeholder="Keine Begrenzung"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label>Maximalteilnehmer</Label>
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              value={editSeries.max_participants ?? ""}
                              onChange={(e) =>
                                setEditSeries({
                                  ...editSeries,
                                  max_participants: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              placeholder="Keine Begrenzung"
                            />
                          </div>

                          <ToggleRow
                            checked={!!editSeries.require_even_participants}
                            onChange={(checked) =>
                              setEditSeries({
                                ...editSeries,
                                require_even_participants: checked,
                                odd_participant_policy: checked
                                  ? editSeries.odd_participant_policy || "last_waitlist"
                                  : "allow",
                              })
                            }
                            title="Gerade Teilnehmerzahl erforderlich"
                            text="Geeignet für Serien mit Partner- oder Team-Zulosung."
                          />

                          {editSeries.require_even_participants ? (
                            <div className="grid gap-2 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                              <Label>Bei ungerader Teilnehmerzahl</Label>
                              <select
                                value={editSeries.odd_participant_policy || "last_waitlist"}
                                onChange={(e) =>
                                  setEditSeries({
                                    ...editSeries,
                                    odd_participant_policy: e.target.value as DkoSeries["odd_participant_policy"],
                                  })
                                }
                                className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                              >
                                <option value="last_waitlist">Zuletzt angemeldeter Spieler wartet</option>
                                <option value="allow">Trotzdem alle berücksichtigen</option>
                              </select>
                            </div>
                          ) : null}

                          <div className="grid gap-2 lg:col-span-2">
                            <Label>Bei Anmeldung ohne Antritt</Label>
                            <select
                              value={editSeries.no_show_penalty_mode || "none"}
                              onChange={(e) =>
                                setEditSeries({
                                  ...editSeries,
                                  no_show_penalty_mode: e.target.value as DkoSeries["no_show_penalty_mode"],
                                })
                              }
                              className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                            >
                              <option value="none">Keine automatische Folge</option>
                              <option value="delete_worst_result">Schlechtestes Ergebnis einmalig streichen</option>
                            </select>
                          </div>
                        </div>
                      </section>

                      <section className="emd-series-config-section emd-series-config-amber p-4 sm:p-5">
                        <div className="flex items-center gap-2">
                          <Medal className="h-5 w-5 text-amber-700" />
                          <h2 className="text-lg font-black text-slate-950">Teilnahme-Bonuspunkte</h2>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                          <div className="grid gap-2">
                            <Label>Wie werden mehrere erreichte Stufen behandelt?</Label>
                            <select
                              value={editSeries.participation_bonus_mode}
                              onChange={(e) =>
                                setEditSeries({
                                  ...editSeries,
                                  participation_bonus_mode: e.target.value as DkoSeries["participation_bonus_mode"],
                                })
                              }
                              className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                            >
                              <option value="highest_only">Nur höchste erreichte Stufe</option>
                              <option value="cumulative">Alle erreichten Stufen zusammenzählen</option>
                            </select>
                          </div>

                          <Button type="button" variant="outline" onClick={addParticipationBonus}>
                            <Plus className="mr-2 h-4 w-4" />
                            Bonus
                          </Button>
                        </div>

                        <div className="mt-4 space-y-2">
                          {participationBonuses.length === 0 ? (
                            <div className="emd-series-empty rounded-xl p-3 text-sm">Keine Teilnahme-Bonuspunkte.</div>
                          ) : (
                            participationBonuses.map((row, index) => (
                              <div key={row.id || index} className="emd-series-rule-row grid gap-2 rounded-2xl p-3 sm:grid-cols-[150px_150px_minmax(0,1fr)_42px]">
                                <div>
                                  <Label className="text-xs">ab Antritten</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={row.required_starts}
                                    onChange={(e) =>
                                      setParticipationBonuses((prev) =>
                                        prev.map((x, i) => (i === index ? { ...x, required_starts: Number(e.target.value) } : x)),
                                      )
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Bonus-Punkte</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={row.bonus_points}
                                    onChange={(e) =>
                                      setParticipationBonuses((prev) =>
                                        prev.map((x, i) => (i === index ? { ...x, bonus_points: Number(e.target.value) } : x)),
                                      )
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Bezeichnung optional</Label>
                                  <Input
                                    value={row.label || ""}
                                    onChange={(e) =>
                                      setParticipationBonuses((prev) =>
                                        prev.map((x, i) => (i === index ? { ...x, label: e.target.value } : x)),
                                      )
                                    }
                                    placeholder="z. B. Treuebonus"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="self-end"
                                  onClick={() => setParticipationBonuses((prev) => prev.filter((_, i) => i !== index))}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </section>

                      <section className="emd-series-config-section emd-series-config-violet p-4 sm:p-5">
                        <div className="flex items-center gap-2">
                          <Gift className="h-5 w-5 text-violet-700" />
                          <h2 className="text-lg font-black text-slate-950">Geldprämien nach Antritten</h2>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button type="button" variant="outline" onClick={addCashReward}>
                            <Plus className="mr-2 h-4 w-4" />
                            Prämie
                          </Button>
                        </div>

                        <div className="mt-4 space-y-2">
                          {cashRewards.length === 0 ? (
                            <div className="emd-series-empty rounded-xl p-3 text-sm">Keine Geldprämien hinterlegt.</div>
                          ) : (
                            cashRewards.map((row, index) => (
                              <div key={row.id || index} className="emd-series-rule-row grid gap-2 rounded-2xl p-3 md:grid-cols-[150px_150px_170px_minmax(0,1fr)_42px]">
                                <div>
                                  <Label className="text-xs">ab Antritten</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={row.required_starts}
                                    onChange={(e) =>
                                      setCashRewards((prev) =>
                                        prev.map((x, i) => (i === index ? { ...x, required_starts: Number(e.target.value) } : x)),
                                      )
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Betrag (€)</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={row.amount}
                                    onChange={(e) =>
                                      setCashRewards((prev) =>
                                        prev.map((x, i) => (i === index ? { ...x, amount: Number(e.target.value) } : x)),
                                      )
                                    }
                                  />
                                </div>
                                <label className="flex items-end gap-2 pb-2 text-sm font-bold text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={row.one_time !== false}
                                    onChange={(e) =>
                                      setCashRewards((prev) =>
                                        prev.map((x, i) => (i === index ? { ...x, one_time: e.target.checked } : x)),
                                      )
                                    }
                                  />
                                  einmalig
                                </label>
                                <div>
                                  <Label className="text-xs">Bezeichnung optional</Label>
                                  <Input
                                    value={row.label || ""}
                                    onChange={(e) =>
                                      setCashRewards((prev) =>
                                        prev.map((x, i) => (i === index ? { ...x, label: e.target.value } : x)),
                                      )
                                    }
                                    placeholder="z. B. 200er-Prämie"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="self-end"
                                  onClick={() => setCashRewards((prev) => prev.filter((_, i) => i !== index))}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </section>

                      <section className="emd-series-config-section emd-series-config-cyan p-4 sm:p-5">
                        <div className="flex items-center gap-2">
                          <ListOrdered className="h-5 w-5 text-cyan-700" />
                          <h2 className="text-lg font-black text-slate-950">Tie-Break Reihenfolge</h2>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button type="button" variant="outline" onClick={addTiebreakRule} disabled={tiebreakRules.length >= TIEBREAK_OPTIONS.length}>
                            <Plus className="mr-2 h-4 w-4" />
                            Kriterium
                          </Button>
                        </div>

                        <div className="mt-4 space-y-2">
                          {tiebreakRules.length === 0 ? (
                            <div className="emd-series-empty rounded-xl p-3 text-sm">Keine eigene Tie-Break-Reihenfolge hinterlegt.</div>
                          ) : (
                            tiebreakRules.map((row, index) => (
                              <div key={row.id || index} className="emd-series-rule-row grid grid-cols-[48px_minmax(0,1fr)_92px_42px] items-center gap-2 rounded-2xl p-3">
                                <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-100 text-sm font-black text-cyan-800">
                                  {index + 1}
                                </div>
                                <select
                                  value={row.rule_key}
                                  onChange={(e) =>
                                    setTiebreakRules((prev) =>
                                      prev.map((x, i) =>
                                        i === index
                                          ? {
                                              ...x,
                                              rule_key: e.target.value,
                                              label: TIEBREAK_OPTIONS.find((o) => o.key === e.target.value)?.label || e.target.value,
                                            }
                                          : x,
                                      ),
                                    )
                                  }
                                  className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                                >
                                  {TIEBREAK_OPTIONS.map((option) => (
                                    <option
                                      key={option.key}
                                      value={option.key}
                                      disabled={tiebreakRules.some((r, i) => i !== index && r.rule_key === option.key)}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex gap-1">
                                  <Button type="button" size="sm" variant="outline" disabled={index === 0} onClick={() => moveTiebreak(index, -1)}>
                                    ↑
                                  </Button>
                                  <Button type="button" size="sm" variant="outline" disabled={index === tiebreakRules.length - 1} onClick={() => moveTiebreak(index, 1)}>
                                    ↓
                                  </Button>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => setTiebreakRules((prev) => prev.filter((_, i) => i !== index))}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </section>

                      <section className="emd-series-config-section emd-series-config-neutral p-4 sm:p-5">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-slate-700" />
                          <h2 className="text-lg font-black text-slate-950">Regelwerk</h2>
                        </div>

                        <textarea
                          value={editSeries.rules_text || ""}
                          onChange={(e) => setEditSeries({ ...editSeries, rules_text: e.target.value })}
                          rows={9}
                          className="mt-4 min-h-[180px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                          placeholder="Spielmodus, Sonderregeln, Finaltag, Teilnahmebedingungen…"
                        />
                      </section>

                      <div className="emd-series-savebar sticky bottom-3 z-20 flex flex-col gap-2 rounded-2xl p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                        <div className={`text-xs font-bold ${
                          seriesSaveState === "saved"
                            ? "text-emerald-400"
                            : seriesSaveState === "error"
                              ? "text-red-400"
                              : "text-slate-500"
                        }`}>
                          {seriesSaveState === "saved"
                            ? "Gespeichert ✓ – Änderungen sind in Supabase übernommen."
                            : seriesSaveState === "error"
                              ? "Speichern fehlgeschlagen – bitte Fehlermeldung prüfen."
                              : "Änderungen mit dem Button rechts speichern."}
                        </div>
                        <Button
                          type="button"
                          onClick={() => void updateSeries()}
                          disabled={savingSeries}
                          className="emd-admin-button-primary"
                        >
                          {seriesSaveState === "saved" && !savingSeries ? (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          {savingSeries
                            ? "Speichert…"
                            : seriesSaveState === "saved"
                              ? "Gespeichert"
                              : "Serienkonfiguration speichern"}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="emd-admin-surface emd-series-surface border-dashed">
                <CardContent className="p-8 text-center">
                  <Settings2 className="mx-auto h-8 w-8 text-slate-300" />
                  <div className="mt-3 font-black text-slate-900">Serie konfigurieren</div>
                  <p className="mt-1 text-sm text-slate-500">
                    Links bei einer Serie auf „Einstellungen“ klicken.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="emd-admin-surface emd-series-surface min-w-0 overflow-hidden border-0">
              <CardHeader className="emd-series-card-header flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                    <Calendar className="h-5 w-5 text-slate-600" />
                    Spieltage & Termine
                  </CardTitle>
                  <div className="mt-1 text-xs text-slate-600">
                    {activeSeries ? <>Serie: <span className="font-bold text-slate-800">{activeSeries.name}</span></> : "Bitte Serie auswählen"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={!activeSeriesId}
                    onClick={() => activeSeriesId && void fetchEvents(activeSeriesId)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Laden
                  </Button>
                  <Button
                    disabled={!activeSeriesId}
                    onClick={openCreateEvent}
                    className="emd-admin-button-primary font-bold"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Neuer Termin
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5">
                {!activeSeriesId ? (
                  <div className="text-sm text-slate-600">Wähle links eine Serie.</div>
                ) : eventsLoading ? (
                  <div className="flex items-center gap-2 text-slate-700">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Lade Termine…
                  </div>
                ) : events.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Noch keine Termine.</div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Datum</TableHead>
                          <TableHead>Uhrzeit</TableHead>
                          <TableHead>Titel</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Anmeldeschluss</TableHead>
                          <TableHead className="text-right">Aktion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.map((ev) => {
                          const effectiveIso = ev.is_rescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at
                          const effective = new Date(effectiveIso)
                          const original = new Date(ev.start_at)

                          return (
                            <TableRow key={ev.id}>
                              <TableCell className="font-semibold">
                                <div>{effective.toLocaleDateString("de-AT")}</div>
                                {ev.is_rescheduled && ev.rescheduled_at ? (
                                  <div className="text-xs text-slate-400 line-through">{original.toLocaleDateString("de-AT")}</div>
                                ) : null}
                              </TableCell>
                              <TableCell>
                                <div>{effective.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}</div>
                                {ev.is_rescheduled && ev.rescheduled_at ? (
                                  <div className="text-xs text-slate-400 line-through">
                                    {original.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell className="max-w-[240px] truncate">{ev.title || "—"}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1.5">
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ev.is_matchday ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                    {ev.is_matchday ? "Spieltag" : "Spielfrei"}
                                  </span>
                                  {ev.is_rescheduled && ev.rescheduled_at ? (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">Verschoben</span>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell>{ev.registration_cutoff_minutes} min</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openEditEvent(ev)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => void deleteEvent(ev.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog
          open={!!seriesDeleteTarget}
          onOpenChange={(open) => {
            if (!open) setSeriesDeleteTarget(null)
          }}
        >
          <DialogContent className="emd-admin-modal emd-series-confirm-modal max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>Serie löschen?</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="emd-series-confirm-box">
                <div className="font-black text-white">
                  {seriesDeleteTarget?.name}
                </div>
                <p className="mt-1 text-sm leading-6 text-white/55">
                  Die Serie und alle zugehörigen Termine werden gelöscht.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="emd-admin-button-secondary"
                  onClick={() => setSeriesDeleteTarget(null)}
                >
                  Abbrechen
                </Button>

                <Button
                  type="button"
                  className="emd-admin-button-danger"
                  onClick={() => void deleteSeriesConfirmed()}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Serie löschen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
          <DialogContent className="emd-admin-modal max-w-xl rounded-3xl">
            <DialogHeader>
              <DialogTitle>{editEvent ? "Termin bearbeiten" : "Neuer Termin"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Titel (optional)</Label>
                <Input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="z. B. Spieltag 4" />
              </div>

              <div className="grid gap-2">
                <Label className="font-semibold">Ursprünglicher Termin *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Datum *</Label>
                    <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Uhrzeit *</Label>
                    <Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
                  </div>
                </div>
              </div>

              <ToggleRow
                checked={eventIsRescheduled}
                onChange={(checked) => {
                  setEventIsRescheduled(checked)
                  if (checked) {
                    setEventRescheduledDate(eventDate)
                    setEventRescheduledTime(eventTime)
                  } else {
                    setEventRescheduledDate("")
                    setEventRescheduledTime("")
                  }
                }}
                title="Termin verschoben"
                text="Bei Aktivierung kannst du einen neuen Termin eintragen."
              />

              {eventIsRescheduled ? (
                <div className="grid gap-2">
                  <Label className="font-semibold">Neuer Termin *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="date" value={eventRescheduledDate} onChange={(e) => setEventRescheduledDate(e.target.value)} />
                    <Input type="time" value={eventRescheduledTime} onChange={(e) => setEventRescheduledTime(e.target.value)} />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label>Ort</Label>
                <Input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="z. B. Linzer Bundesstraße 16, Salzburg" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Anmeldeschluss Minuten vor Start</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={eventCutoff}
                    onChange={(e) => setEventCutoff(Number(e.target.value))}
                  />
                </div>

                <div className="pt-6">
                  <ToggleRow
                    checked={eventIsMatchday}
                    onChange={setEventIsMatchday}
                    title="Spieltag"
                    text="Deaktivieren, wenn an diesem Termin nicht gespielt wird."
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                <div className="mb-3">
                  <div className="font-black text-white/90">Turniermodus für diesen Spieltag</div>
                  <div className="mt-1 text-sm text-white/45">
                    Leer lassen, wenn der Serienstandard gelten soll.
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Spielsystem</Label>
                    <select
                      value={eventTournamentFormatOverride}
                      onChange={(e) => setEventTournamentFormatOverride(e.target.value)}
                      className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Serienstandard</option>
                      {TOURNAMENT_FORMAT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Spieler / Teams</Label>
                    <select
                      value={eventTeamModeOverride}
                      onChange={(e) => {
                        const next = e.target.value
                        setEventTeamModeOverride(next)
                        if (next === "single") setEventDrawMethodOverride("none")
                      }}
                      className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Serienstandard</option>
                      {TEAM_MODE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Auslosung</Label>
                    <select
                      value={eventDrawMethodOverride}
                      disabled={eventTeamModeOverride === "single"}
                      onChange={(e) => setEventDrawMethodOverride(e.target.value)}
                      className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm disabled:opacity-50"
                    >
                      <option value="">Serienstandard</option>
                      {DRAW_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                <div className="grid gap-2">
                  <Label>No-Show-Regel für diesen Spieltag</Label>
                  <select
                    value={eventNoShowPenaltyOverride}
                    onChange={(e) => setEventNoShowPenaltyOverride(e.target.value)}
                    className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Serienstandard</option>
                    <option value="none">Keine No-Show-Strafe</option>
                    <option value="delete_worst_result">Schlechtestes Ergebnis streichen</option>
                  </select>
                  <p className="text-xs text-white/45">
                    Nur wenn hier bzw. in der Serie eine No-Show-Regel aktiv ist, erscheint am Turniertag die Anwesenheitsprüfung.
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Notiz</Label>
                <Input value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} placeholder="optional" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEventDialogOpen(false)
                    setEditEvent(null)
                  }}
                >
                  Abbrechen
                </Button>
                <Button onClick={() => void saveEvent()}>
                  <Save className="mr-2 h-4 w-4" />
                  Speichern
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
