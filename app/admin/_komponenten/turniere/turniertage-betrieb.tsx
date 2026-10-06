"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { MatchdayAttendance } from "@/app/admin/_komponenten/turniere/spieltag-anwesenheit"
import { buildTournamentContinueRoute } from "@/app/admin/_komponenten/turniere/einzelturnier/einzelturnier-engine"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Play,
  RefreshCw,
  Layers,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react"

type DkoSeries = {
  id: string
  name: string
  slug: string
  is_active: boolean
  startgeld?: number
  no_show_penalty_mode?: "none" | "delete_worst_result"
  require_even_participants?: boolean
  odd_participant_policy?: "allow" | "last_waitlist"
  created_at?: string
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
  no_show_penalty_mode_override?: "none" | "delete_worst_result" | null
  notes: string | null
  dko_series?: DkoSeries | null
}

type ActiveSeriesRun = {
  tournament_id: string
  tournament_type: string
  tournament_name: string
  access_type: "public" | "club_internal" | "club_external" | null
  series_id: string | null
  series_event_id: string | null
}

type RegistrationRow = {
  id: number
  player_id: string | null
  player_name: string | null
  registered_at: string | null
  created_at: string | null
  paid: boolean | null
  entry_fee: number | null
  deducted_from_credit: string | null
  series_id?: string | null
  event_id?: string | null
}

// yyyy-mm-dd in LOCAL time
function localDayKeyFromIso(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// local date key -> [start,end) as ISO in UTC (safe for timestamptz filtering)
function localDayRangeToUtcIso(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map(Number)
  const startLocal = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0)
  const endLocal = new Date(y, (m ?? 1) - 1, d ?? 1, 24, 0, 0, 0)
  return { startIso: startLocal.toISOString(), endIso: endLocal.toISOString() }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
}

function isMembersChampionCupSeries(seriesName: string) {
  const normalized = seriesName.toLowerCase()
  return normalized.includes("members") && normalized.includes("champion")
}

export function TournamentDaysManagement({ onBack }: { onBack?: () => void }) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [seriesList, setSeriesList] = useState<DkoSeries[]>([])
  const [events, setEvents] = useState<DkoSeriesEvent[]>([])

  const [activeSeriesId, setActiveSeriesId] = useState<string>("ALL")
  const [timeTab, setTimeTab] = useState<"today" | "planned" | "past">("today")

  // Registrierungen werden eindeutig dem Spieltag über event_id zugeordnet.
  const [registrationsByEvent, setRegistrationsByEvent] = useState<Record<string, RegistrationRow[]>>({})
  const [registrationsError, setRegistrationsError] = useState<string | null>(null)
  const [activeRunsByEvent, setActiveRunsByEvent] = useState<Record<string, ActiveSeriesRun>>({})

  const todayKey = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    setErrorMsg(null)

    try {
      const { data: sData, error: sErr } = await supabase
        .from("dko_series")
        .select("id,name,slug,is_active,startgeld,no_show_penalty_mode,require_even_participants,odd_participant_policy,created_at")
        .order("created_at", { ascending: false })

      if (sErr) throw sErr
      setSeriesList(((sData || []) as DkoSeries[]).filter((s) => Boolean(s) && s.is_active))

      const { data: eData, error: eErr } = await supabase
        .from("dko_series_events")
        .select(
          `
          id,
          series_id,
          title,
          start_at,
          is_rescheduled,
          rescheduled_at,
          location,
          is_matchday,
          no_show_penalty_mode_override,
          notes,
          dko_series:dko_series (
            id,
            name,
            slug,
            is_active,
            startgeld,
            no_show_penalty_mode,
            require_even_participants,
            odd_participant_policy,
            created_at
          )
        `
        )
        .order("start_at", { ascending: true })

      if (eErr) throw eErr
      setEvents(((eData || []) as DkoSeriesEvent[]).filter((ev) => ev.dko_series?.is_active !== false))

      const { data: activeData, error: activeErr } = await supabase
        .from("tournaments_status")
        .select("tournament_id,tournament_type,tournament_name,access_type,series_id,series_event_id")
        .eq("status", "active")
        .not("series_event_id", "is", null)

      if (activeErr) throw activeErr
      const activeMap: Record<string, ActiveSeriesRun> = {}
      for (const row of (activeData || []) as ActiveSeriesRun[]) {
        if (row.series_event_id) activeMap[row.series_event_id] = row
      }
      setActiveRunsByEvent(activeMap)
    } catch (e: any) {
      console.error(e)
      setErrorMsg(e?.message ?? "Fehler beim Laden.")
      setSeriesList([])
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = useMemo(() => {
    const bySeries =
      activeSeriesId === "ALL"
        ? events
        : events.filter((e) => e.series_id === activeSeriesId)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)

    return bySeries.filter((ev) => {
      if (!ev.is_matchday) return false

      const effectiveIso =
        ev.is_rescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at
      const ts = new Date(effectiveIso).getTime()

      if (timeTab === "today") {
        return ts >= todayStart.getTime() && ts < tomorrowStart.getTime()
      }

      if (timeTab === "planned") {
        return ts >= tomorrowStart.getTime()
      }

      return ts < todayStart.getTime()
    })
  }, [events, activeSeriesId, timeTab])


const todayMatchdays = useMemo(() => {
  const todays = filteredEvents
    .map((ev) => {
      const effectiveIso = ev.is_rescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at
      return { ev, effectiveIso, dayKey: localDayKeyFromIso(effectiveIso) }
    })
    .filter((x) => x.dayKey === todayKey && !!x.ev.is_matchday)

  todays.sort((a, b) => new Date(a.effectiveIso).getTime() - new Date(b.effectiveIso).getTime())
  return todays
}, [filteredEvents, todayKey])

const todaysRegistrations = useMemo(() => {
  const rows = todayMatchdays.flatMap(({ ev }) => registrationsByEvent[ev.id] ?? [])
  const paid = rows.filter((r) => r.paid === true).length
  return { total: rows.length, paid }
}, [registrationsByEvent, todayMatchdays])

  // Registrierungen immer über die echte Spieltag-ID laden.
  // Das Anmeldedatum darf dafür nicht verwendet werden: Eine Anmeldung kann Tage/Wochen vor dem Spieltag erfolgen.
  const fetchRegistrationsForEvents = async (visibleEvents: DkoSeriesEvent[]) => {
    const eventIds = Array.from(new Set(visibleEvents.map((ev) => ev.id).filter(Boolean)))

    if (!eventIds.length) {
      setRegistrationsByEvent({})
      setRegistrationsError(null)
      return
    }

    setRegistrationsError(null)

    try {
      const { data, error } = await supabase
        .from("dko_tournament_registration")
        .select("id,player_id,player_name,registered_at,created_at,paid,entry_fee,deducted_from_credit,series_id,event_id")
        .in("event_id", eventIds)
        .order("registered_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })

      if (error) throw error

      const resultMap: Record<string, RegistrationRow[]> = {}
      for (const eventId of eventIds) resultMap[eventId] = []

      for (const row of (data || []) as RegistrationRow[]) {
        const eventId = String(row.event_id || "")
        if (!eventId || !resultMap[eventId]) continue
        resultMap[eventId].push(row)
      }

      setRegistrationsByEvent(resultMap)
    } catch (e: any) {
      console.error(e)
      setRegistrationsByEvent({})
      setRegistrationsError("Voranmeldungen konnten nicht geladen werden (RLS/Spalten prüfen).")
    }
  }

  useEffect(() => {
    fetchAll()

    const ch = supabase
      .channel("tournament_days_pretty_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series_events" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments_status" }, () => fetchAll())
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Beim Wechsel von Tab/Serie immer die sichtbaren Spieltage neu laden.
  useEffect(() => {
    fetchRegistrationsForEvents(filteredEvents)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEvents])

  // Neue/gelöschte Anmeldung sofort im Admin aktualisieren.
  useEffect(() => {
    const ch = supabase
      .channel("tournament_days_registrations_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_tournament_registration" }, () => {
        fetchRegistrationsForEvents(filteredEvents)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEvents])

  const grouped = useMemo(() => {
    const map = new Map<string, { series: DkoSeries | null; items: DkoSeriesEvent[] }>()
    for (const ev of filteredEvents) {
      if (!map.has(ev.series_id)) map.set(ev.series_id, { series: ev.dko_series ?? null, items: [] })
      map.get(ev.series_id)!.items.push(ev)
    }

    const order = new Map<string, number>()
    seriesList.forEach((s, idx) => order.set(s.id, idx))

    return Array.from(map.entries())
      .sort((a, b) => (order.get(a[0]) ?? 9999) - (order.get(b[0]) ?? 9999))
      .map(([seriesId, val]) => ({ seriesId, ...val }))
  }, [filteredEvents, seriesList])

  const activeSeriesCount = useMemo(() => seriesList.filter((s) => s.is_active).length, [seriesList])

  const nextUpcomingEvent = useMemo(() => {
    const now = Date.now()
    return filteredEvents
      .map((ev) => {
        const effectiveIso = ev.is_rescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at
        return { ev, effectiveIso, ts: new Date(effectiveIso).getTime() }
      })
      .filter((entry) => Number.isFinite(entry.ts) && entry.ts >= now)
      .sort((a, b) => a.ts - b.ts)[0] ?? null
  }, [filteredEvents])

  return (
    <div className="relative min-h-[720px] w-full min-w-0 overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#050608] text-white">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[#050608]">
        <div
          className="absolute inset-0 bg-cover bg-[64%_50%] bg-no-repeat opacity-[0.24]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.74),rgba(3,5,9,.95)_44%,rgba(2,4,7,.99))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.13),transparent_26%),radial-gradient(circle_at_88%_22%,rgba(56,189,248,.07),transparent_26%)]" />
      </div>

      <main className="relative z-10 w-full min-w-0 px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
        <section className="relative mb-6 overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(18,21,27,.94),rgba(8,10,14,.90))] p-5 text-white shadow-[0_30px_100px_-60px_rgba(0,0,0,.98)] backdrop-blur-2xl sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            {onBack ? (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="h-9 rounded-xl border-white/10 bg-white/[0.035] px-3 text-white/65 hover:bg-white/[0.07] hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Turnier-Zentrale
              </Button>
            ) : <span />}

            <Button
              variant="outline"
              onClick={() => fetchAll()}
              className="h-9 rounded-xl border border-white/10 bg-white/[0.045] px-3 font-black text-white/70 transition hover:border-orange-300/20 hover:bg-orange-500/[0.08] hover:text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Aktualisieren
            </Button>
          </div>

          <div className="lg:flex lg:items-center lg:justify-between">
            <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-200/70">
              <Play className="h-3.5 w-3.5 text-orange-400" />
              Turnierbetrieb
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">Turniertage starten</h1>
            <p className="mt-2 text-sm leading-6 text-white/50">Heute starten, kommende Termine planen und vergangene Spieltage sauber getrennt ansehen.</p>
            </div>
          </div>
        </section>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(15,18,23,.88),rgba(8,10,14,.82))] p-4 shadow-[0_18px_50px_-36px_rgba(0,0,0,.96)] transition hover:-translate-y-0.5 hover:border-orange-300/[0.16]">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-white/40">Serien</div>
            <div className="mt-1 text-2xl font-black text-white">{seriesList.length}</div>
            <div className="mt-0.5 text-xs text-white/40">{activeSeriesCount} aktiv</div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(15,18,23,.88),rgba(8,10,14,.82))] p-4 shadow-[0_18px_50px_-36px_rgba(0,0,0,.96)] transition hover:-translate-y-0.5 hover:border-orange-300/[0.16]">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-white/40">Spieltage</div>
            <div className="mt-1 text-2xl font-black text-white">{filteredEvents.filter((e) => e.is_matchday).length}</div>
            <div className="mt-0.5 text-xs text-white/40">
              {activeSeriesId === "ALL" ? "Alle Serien" : "Aktuelle Auswahl"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(15,18,23,.88),rgba(8,10,14,.82))] p-4 shadow-[0_18px_50px_-36px_rgba(0,0,0,.96)] transition hover:-translate-y-0.5 hover:border-orange-300/[0.16]">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-white/40">Heute</div>
            <div className="mt-1 text-2xl font-black text-white">{todayMatchdays.length}</div>
            <div className="mt-0.5 text-xs text-white/40">
              {todayMatchdays.length === 1 ? "Turniertag" : "Turniertage"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(15,18,23,.88),rgba(8,10,14,.82))] p-4 shadow-[0_18px_50px_-36px_rgba(0,0,0,.96)] transition hover:-translate-y-0.5 hover:border-orange-300/[0.16]">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-white/40">Nächster Termin</div>
            <div className="mt-1 truncate text-sm font-black text-white">
              {nextUpcomingEvent ? new Date(nextUpcomingEvent.effectiveIso).toLocaleDateString("de-DE") : "—"}
            </div>
            <div className="mt-0.5 text-xs text-white/40">
              {nextUpcomingEvent
                ? `${new Date(nextUpcomingEvent.effectiveIso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`
                : "Kein weiterer Termin"}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-[24px] border border-white/[0.08] bg-[#090b0f]/90 p-2 shadow-[0_18px_60px_-44px_rgba(0,0,0,.96)]">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "today", label: "Heute" },
              { id: "planned", label: "Geplant" },
              { id: "past", label: "Vergangen" },
            ].map((item) => {
              const active = timeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTimeTab(item.id as "today" | "planned" | "past")}
                  className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${
                    active
                      ? "border-orange-300/25 bg-orange-500/[0.12] text-orange-100"
                      : "border-transparent bg-white/[0.025] text-white/45 hover:border-white/[0.08] hover:text-white/75"
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-white">Serien filtern</div>
            <div className="text-xs text-white/40">Wähle eine Serie oder zeige alle Spieltage.</div>
          </div>
        </div>

        <div className="mb-6 rounded-[28px] border border-emerald-300/[0.14] bg-[linear-gradient(135deg,rgba(16,185,129,.08),rgba(8,10,14,.90)_38%,rgba(7,9,13,.88))] p-4 text-white shadow-[0_28px_90px_-58px_rgba(0,0,0,.98)] backdrop-blur-xl sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <Trophy className="h-6 w-6 text-orange-300" />
            <div>
              <div className="text-base font-black text-white">Turnierserien</div>
              <div className="text-sm font-semibold text-white/55">
                „Turniertag starten“ ist nur aktiv, wenn heute ein Turniertag ist.
              </div>
              {registrationsError && <div className="text-xs text-red-700 font-bold mt-1">{registrationsError}</div>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveSeriesId("ALL")}
              className={`rounded-xl border px-3 py-2 text-sm font-bold transition-all ${
                activeSeriesId === "ALL"
                  ? "border-orange-300/30 bg-orange-500/[0.12] text-orange-100 shadow-[0_12px_30px_-22px_rgba(249,115,22,.45)]"
                  : "border-white/[0.08] bg-white/[0.035] text-white/55 hover:border-orange-300/20 hover:bg-orange-500/[0.07] hover:text-white"
              }`}
            >
              Alle
            </button>

            {seriesList.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSeriesId(s.id)}
                className={`rounded-xl border px-3 py-2 text-sm font-bold transition-all ${
                  activeSeriesId === s.id
                    ? "border-orange-300/30 bg-orange-500/[0.12] text-orange-100 shadow-[0_12px_30px_-22px_rgba(249,115,22,.45)]"
                    : "border-white/[0.08] bg-white/[0.035] text-white/55 hover:border-orange-300/20 hover:bg-orange-500/[0.07] hover:text-white"
                }`}
              >
                {s.name}
                {!s.is_active && <span className="ml-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-black text-white/35">INAKTIV</span>}
              </button>
            ))}
          </div>

          {errorMsg && (
            <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-500/[0.07] p-4 text-rose-100">
              <div className="font-black mb-1">Hinweis</div>
              <div className="text-sm text-white/60">{errorMsg}</div>
            </div>
          )}
        </div>



{/* INFOBOX: Heute ist Turniertag (spieltag-basierte Voranmeldungen) */}
{timeTab === "today" && todayMatchdays.length > 0 && (
  <div className="mb-6 rounded-[28px] border border-emerald-300/[0.14] bg-[linear-gradient(135deg,rgba(16,185,129,.08),rgba(8,10,14,.90)_38%,rgba(7,9,13,.88))] p-4 text-white shadow-[0_28px_90px_-58px_rgba(0,0,0,.98)] backdrop-blur-xl sm:p-5">
    <div className="flex items-start gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-500/[0.10]">
          <Trophy className="h-5 w-5 text-emerald-300" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-lg font-black text-white sm:text-xl">Heute ist Turniertag</div>

            {todaysRegistrations.total > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-500/[0.08] px-3 py-1 text-xs font-black text-orange-200 shadow-[0_10px_24px_-18px_rgba(249,115,22,.38)]">
                <Users className="w-4 h-4" />
                {todaysRegistrations.total} Voranmeldung{todaysRegistrations.total === 1 ? "" : "en"}
                {todaysRegistrations.total ? ` • ${todaysRegistrations.paid} bezahlt` : ""}
              </span>
            )}
          </div>

          <div className="mt-1 text-sm font-semibold text-white/60">
            {todayMatchdays.length === 1
              ? "Es ist heute ein Turniertag eingetragen."
              : `Es sind heute ${todayMatchdays.length} Turniertage eingetragen.`}
            <span className="mt-1 block text-xs text-white/40">
              
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {todayMatchdays.slice(0, 3).map(({ ev, effectiveIso }) => (
              <div key={ev.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3 text-sm font-semibold text-white/70">
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-300/80" />
                  {fmtTime(effectiveIso)} Uhr
                </span>

                <span className="inline-flex items-center gap-2 min-w-0">
                  <Calendar className="h-4 w-4 text-orange-300/80" />
                  <span className="truncate">
                    {(ev.dko_series?.name ?? "Turnier")}
                    {ev.title?.trim() ? ` – ${ev.title.trim()}` : ""}
                  </span>
                </span>

                {ev.location && (
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <MapPin className="h-4 w-4 text-orange-300/80" />
                    <span className="truncate">{ev.location}</span>
                  </span>
                )}
              </div>
            ))}
            {todayMatchdays.length > 3 && (
              <div className="text-xs font-bold text-white/40">+ {todayMatchdays.length - 3} weitere…</div>
            )}
          </div>
        </div>
      </div>


    </div>
  </div>
)}

        {loading ? (
          <Card className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(14,17,22,.90),rgba(7,9,13,.86))] text-white shadow-[0_28px_90px_-58px_rgba(0,0,0,.98)]">
            <CardContent className="p-6 text-center font-semibold text-white/55">Lade Spieltage…</CardContent>
          </Card>
        ) : grouped.length === 0 ? (
          <Card className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(14,17,22,.90),rgba(7,9,13,.86))] text-white shadow-[0_28px_90px_-58px_rgba(0,0,0,.98)]">
            <CardContent className="p-6 text-center font-semibold text-white/55">
            {timeTab === "today"
              ? "Heute ist kein Turniertag."
              : timeTab === "planned"
                ? "Keine geplanten Spieltage vorhanden."
                : "Keine vergangenen Spieltage vorhanden."}
          </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ seriesId, series, items }) => {
              const seriesName = series?.name ?? "Unbekannte Serie"

              return (
                <div key={seriesId}>
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xl font-black text-white sm:text-2xl">{seriesName}</div>
                      <div className="mt-0.5 text-xs font-medium text-white/40">{items.length} Termin{items.length === 1 ? "" : "e"}</div>
                    </div>
                  </div>

                  <div className="grid gap-5">
                    {items.map((ev) => {
                      const effectiveIso = ev.is_rescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at
                      const dayKey = localDayKeyFromIso(effectiveIso)

                      const isToday = dayKey === todayKey
                      const isTournamentDay = !!ev.is_matchday
                      const canStart = timeTab === "today" && isToday && isTournamentDay
                      const isMembersChampionCup = isMembersChampionCupSeries(seriesName)
                      const timeStatusLabel =
                        timeTab === "today"
                          ? "Heute"
                          : timeTab === "planned"
                            ? "Geplant"
                            : "Vergangen"

                      const regs = registrationsByEvent[ev.id] ?? []
                      const paidCount = regs.filter((r) => r.paid === true).length
                      const activeRun = activeRunsByEvent[ev.id] ?? null
                      const hasActiveRun = Boolean(activeRun)
                      const canOpenOrStart = hasActiveRun || canStart
                      const effectiveNoShowPenalty =
                        ev.no_show_penalty_mode_override ??
                        series?.no_show_penalty_mode ??
                        "none"
                      const attendanceRequired = effectiveNoShowPenalty !== "none"

                      return (
                        <div
                          key={ev.id}
                          className={`w-full overflow-hidden rounded-[30px] border bg-[linear-gradient(145deg,rgba(14,17,22,.96),rgba(7,9,13,.92))] text-white shadow-[0_28px_80px_-50px_rgba(0,0,0,.98)] transition-all hover:-translate-y-0.5 ${
                            canOpenOrStart ? "border-orange-300/30 ring-1 ring-orange-400/10 shadow-[0_24px_70px_-46px_rgba(249,115,22,.34)]" : "border-white/[0.08]"
                          }`}
                        >
                          <div
                            className={`p-5 sm:p-6 ${
                              canStart ? "bg-[linear-gradient(135deg,rgba(249,115,22,.12),rgba(10,13,18,.96))] text-white" : "border-b border-white/[0.07] bg-white/[0.025] text-white"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-bold opacity-90 flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {fmtDate(effectiveIso)}
                                </div>
                                <div className="mt-1 truncate text-xl font-black">
                                  {ev.title?.trim() || (ev.is_matchday ? "Turniertag" : "Spielfrei")}
                                </div>
                              </div>

                              <span
                                className={`text-xs font-black px-2 py-1 rounded ${
                                  isTournamentDay
                                    ? canStart
                                      ? "border border-orange-200/20 bg-orange-500/[0.16] text-orange-100"
                                      : "border border-emerald-300/20 bg-emerald-500/[0.10] text-emerald-200"
                                    : "border border-amber-300/20 bg-amber-500/[0.10] text-amber-200"
                                }`}
                              >
                                {isTournamentDay ? timeStatusLabel.toUpperCase() : "SPIELFREI"}
                              </span>
                            </div>

                            <div className={`mt-3 flex items-center gap-2 text-sm font-semibold ${canStart ? "text-white/85" : "text-white/55"}`}>
                              <Clock className="w-4 h-4" />
                              {fmtTime(effectiveIso)} Uhr
                            </div>

                            {ev.location && (
                              <div className={`mt-2 flex items-center gap-2 text-sm font-semibold ${canStart ? "text-white/85" : "text-white/55"}`}>
                                <MapPin className="w-4 h-4" />
                                <span className="truncate">{ev.location}</span>
                              </div>
                            )}
                          </div>

                          <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] xl:items-start">
                            <div className="h-full rounded-[22px] border border-white/[0.08] bg-black/20 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 font-black text-white/85">
                                  <Users className="h-4 w-4 text-orange-300/70" />
                                  Voranmeldungen (Spieltag)
                                </div>
                                <div className="text-xs font-black text-white/55">
                                  {regs.length} gesamt{regs.length ? ` • ${paidCount} bezahlt` : ""}
                                </div>
                              </div>

                              {regs.length === 0 ? (
                                <div className="mt-2 text-sm text-white/40">Keine Voranmeldungen für diesen Spieltag gefunden.</div>
                              ) : (
                                <div className="mt-3 space-y-2">
                                  {regs.slice(0, 6).map((r) => (
                                    <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                                      <div className="truncate font-semibold text-white/85">{r.player_name ?? "Unbekannt"}</div>
                                      {r.paid ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-500/[0.09] px-2 py-1 text-xs font-black text-emerald-200">
                                          <CheckCircle2 className="w-4 h-4" /> bezahlt
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-xs font-black text-white/45">
                                          <XCircle className="w-4 h-4" /> offen
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                  {regs.length > 6 && <div className="mt-1 text-xs text-white/35">+ {regs.length - 6} weitere…</div>}
                                </div>
                              )}
                            </div>

                            {canStart && attendanceRequired && !hasActiveRun ? (
                              <MatchdayAttendance
                                seriesId={ev.series_id}
                                seriesName={seriesName}
                                eventId={ev.id}
                                eventName={ev.title?.trim() || "Turniertag"}
                                noShowPenaltyMode={effectiveNoShowPenalty}
                                requireEvenParticipants={!!series?.require_even_participants}
                                oddParticipantPolicy={series?.odd_participant_policy || "allow"}
                                continueHref={
                                  isMembersChampionCup
                                    ? `/admin/members-champion-cup/auslosung?seriesId=${encodeURIComponent(ev.series_id)}&eventId=${encodeURIComponent(ev.id)}`
                                    : `/admin/einzelturnier?seriesId=${encodeURIComponent(ev.series_id)}&eventId=${encodeURIComponent(ev.id)}`
                                }
                                continueLabel={hasActiveRun ? "Laufendes Turnier öffnen" : isMembersChampionCup ? "Auslosung öffnen" : "Turniertag starten"}
                              />
                            ) : (
                              <Button
                                onClick={() => {
                                  if (activeRun) {
                                    router.push(
                                      buildTournamentContinueRoute({
                                        tournamentType: activeRun.tournament_type,
                                        tournamentId: activeRun.tournament_id,
                                        tournamentName: activeRun.tournament_name || seriesName,
                                        accessType: activeRun.access_type || "public",
                                        seriesId: ev.series_id,
                                        eventId: ev.id,
                                      }),
                                    )
                                    return
                                  }

                                  if (isMembersChampionCup) {
                                    router.push(
                                      `/admin/members-champion-cup/auslosung?seriesId=${encodeURIComponent(ev.series_id)}&eventId=${encodeURIComponent(ev.id)}`
                                    )
                                    return
                                  }

                                  router.push(
                                    `/admin/einzelturnier?seriesId=${encodeURIComponent(ev.series_id)}&eventId=${encodeURIComponent(ev.id)}`
                                  )
                                }}
                                disabled={!canOpenOrStart}
                                className={`flex min-h-[72px] w-full items-center justify-center gap-2 rounded-2xl py-5 text-base font-black transition-all ${
                                  canOpenOrStart
                                    ? "border border-orange-300/25 bg-orange-500 text-white shadow-[0_14px_32px_-20px_rgba(249,115,22,.55)] hover:bg-orange-400 hover:-translate-y-0.5"
                                    : "cursor-not-allowed border border-white/[0.07] bg-white/[0.035] text-white/25"
                                }`}
                                title={
                                  hasActiveRun
                                    ? "Laufendes Turnier öffnen"
                                    : canStart
                                    ? isMembersChampionCup
                                      ? "Members-Cup-Auslosung öffnen"
                                      : "Turniertag starten"
                                    : "Nur am heutigen Turniertag aktiv"
                                }
                              >
                                <Play className="w-5 h-5" />
                                {hasActiveRun ? "Laufendes Turnier öffnen" : isMembersChampionCup ? "Auslosung öffnen" : "Turniertag starten"}
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
