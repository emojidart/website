"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
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
  notes: string | null
  dko_series?: DkoSeries | null
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

export default function TournamentDaysPrettyPage() {
  const { user, isAdmin, loading: authLoading, adminLoading } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [seriesList, setSeriesList] = useState<DkoSeries[]>([])
  const [events, setEvents] = useState<DkoSeriesEvent[]>([])

  const [activeSeriesId, setActiveSeriesId] = useState<string>("ALL")

  // NEW: registrations by dateKey (yyyy-mm-dd)
  const [registrationsByDay, setRegistrationsByDay] = useState<Record<string, RegistrationRow[]>>({})
  const [registrationsError, setRegistrationsError] = useState<string | null>(null)

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
        .select("id,name,slug,is_active,startgeld,created_at")
        .order("created_at", { ascending: false })

      if (sErr) throw sErr
      setSeriesList(((sData || []) as DkoSeries[]).filter(Boolean))

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
          notes,
          dko_series:dko_series (
            id,
            name,
            slug,
            is_active,
            startgeld,
            created_at
          )
        `
        )
        .order("start_at", { ascending: true })

      if (eErr) throw eErr
      setEvents((eData || []) as DkoSeriesEvent[])
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
    if (activeSeriesId === "ALL") return events
    return events.filter((e) => e.series_id === activeSeriesId)
  }, [events, activeSeriesId])


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
  const rows = registrationsByDay[todayKey] ?? []
  const paid = rows.filter((r) => r.paid === true).length
  return { total: rows.length, paid }
}, [registrationsByDay, todayKey])

  // NEW: load registrations for all visible day-keys
  const fetchRegistrationsForDays = async (dayKeys: string[]) => {
    const uniqueKeys = Array.from(new Set(dayKeys)).filter(Boolean)
    if (!uniqueKeys.length) {
      setRegistrationsByDay({})
      setRegistrationsError(null)
      return
    }

    setRegistrationsError(null)

    // We query per dayKey (small amount), because Supabase doesn't do "OR ranges" nicely without RPC.
    // This keeps it simple and reliable.
    try {
      const resultMap: Record<string, RegistrationRow[]> = {}

      for (const dayKey of uniqueKeys) {
        const { startIso, endIso } = localDayRangeToUtcIso(dayKey)

        // Prefer registered_at if it's filled in your table, else created_at
        // We try registered_at first; if query fails (column missing), fallback to created_at.
        let rows: RegistrationRow[] = []

        try {
          const { data, error } = await supabase
            .from("dko_tournament_registration")
            .select("id,player_id,player_name,registered_at,created_at,paid,entry_fee,deducted_from_credit")
            .gte("registered_at", startIso)
            .lt("registered_at", endIso)
            .order("created_at", { ascending: true })

          if (error) throw error
          rows = (data || []) as RegistrationRow[]
        } catch {
          const { data, error } = await supabase
            .from("dko_tournament_registration")
            .select("id,player_id,player_name,registered_at,created_at,paid,entry_fee,deducted_from_credit")
            .gte("created_at", startIso)
            .lt("created_at", endIso)
            .order("created_at", { ascending: true })

          if (error) throw error
          rows = (data || []) as RegistrationRow[]
        }

        resultMap[dayKey] = rows
      }

      setRegistrationsByDay(resultMap)
    } catch (e: any) {
      console.error(e)
      setRegistrationsByDay({})
      setRegistrationsError("Voranmeldungen konnten nicht geladen werden (RLS/Spalten prüfen).")
    }
  }

  useEffect(() => {
    fetchAll()

    const ch = supabase
      .channel("tournament_days_pretty_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series_events" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_tournament_registration" }, () => {
        // reload based on current visible days
        const dayKeys = (activeSeriesId === "ALL" ? events : events.filter((e) => e.series_id === activeSeriesId)).map((ev) => {
          const effectiveIso = ev.is_rescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at
          return localDayKeyFromIso(effectiveIso)
        })
        fetchRegistrationsForDays(dayKeys)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // whenever visible events change -> load registrations for those days
  useEffect(() => {
    const dayKeys = filteredEvents.map((ev) => {
      const effectiveIso = ev.is_rescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at
      return localDayKeyFromIso(effectiveIso)
    })
    fetchRegistrationsForDays(dayKeys)
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

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <main className="w-full p-4 md:p-6 flex flex-col items-center justify-center flex-grow">

          <Card className="w-full max-w-md p-6 shadow-lg">
            <CardContent className="text-center">
              <p className="text-gray-700">Lade...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <main className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow">
          <Card className="w-full max-w-md p-6 shadow-lg">
            <CardTitle className="text-2xl font-bold text-center mb-6">Zugriff verweigert</CardTitle>
            <CardContent className="text-center">
              <p className="mb-4 text-gray-700">Sie benötigen Admin-Rechte.</p>
              <Button onClick={() => router.push("/admin")} className="w-full">
                Zurück zur Admin-Seite
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-12">

          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
            <Layers className="w-8 h-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-3 tracking-tight">SPIELTAGE — ALLE SERIEN</h1>
          <p className="text-white/90 font-semibold">
            Heute: <span className="font-black">{new Date().toLocaleDateString("de-DE")}</span>
          </p>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">

        <div className="mb-6 flex items-center justify-between gap-3">
          <Button
            onClick={() => router.push("/admin")}
            variant="outline"
            className="flex items-center gap-2 border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>

          <Button onClick={fetchAll} variant="outline" className="flex items-center gap-2 border-2 border-gray-200 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Aktualisieren
          </Button>
        </div>

        <div className="mb-8 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-white rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="w-6 h-6 text-orange-600" />
            <div>
              <div className="text-xl font-black text-gray-900">Serien</div>
              <div className="text-sm text-gray-700 font-semibold">
                „Turniertag starten“ ist nur aktiv, wenn heute ein Turniertag ist.
              </div>
              {registrationsError && <div className="text-xs text-red-700 font-bold mt-1">{registrationsError}</div>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveSeriesId("ALL")}
              className={`px-3 py-2 rounded-xl border-2 font-black text-sm transition-all ${
                activeSeriesId === "ALL"
                  ? "bg-white border-orange-400 text-orange-700 shadow"
                  : "bg-white/70 border-white text-gray-700 hover:bg-white"
              }`}
            >
              Alle
            </button>

            {seriesList.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSeriesId(s.id)}
                className={`px-3 py-2 rounded-xl border-2 font-black text-sm transition-all ${
                  activeSeriesId === s.id
                    ? "bg-white border-orange-400 text-orange-700 shadow"
                    : "bg-white/70 border-white text-gray-700 hover:bg-white"
                }`}
                title={`slug: ${s.slug}`}
              >
                {s.name}
                {!s.is_active && <span className="ml-2 text-xs font-black px-2 py-0.5 rounded bg-gray-200 text-gray-600">INAKTIV</span>}
              </button>
            ))}
          </div>

          {errorMsg && (
            <div className="mt-4 bg-white border-2 border-red-100 rounded-xl p-4 text-gray-800">
              <div className="font-black mb-1">Hinweis</div>
              <div className="text-sm text-gray-700">{errorMsg}</div>
            </div>
          )}
        </div>



{/* INFOBOX: Heute ist Turniertag (datum-basierte Voranmeldungen) */}
{todayMatchdays.length > 0 && (
  <div className="mb-8 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-4 sm:p-6 shadow-lg">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 border border-orange-200">
          <Trophy className="w-5 h-5 text-orange-700" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xl font-black text-gray-900">Heute ist Turniertag! 🏆</div>

            {todaysRegistrations.total > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-orange-200 px-3 py-1 text-xs font-black text-orange-800 shadow-sm">
                <Users className="w-4 h-4" />
                {todaysRegistrations.total} Voranmeldung{todaysRegistrations.total === 1 ? "" : "en"}
                {todaysRegistrations.total ? ` • ${todaysRegistrations.paid} bezahlt` : ""}
              </span>
            )}
          </div>

          <div className="text-sm text-gray-700 font-semibold mt-1">
            {todayMatchdays.length === 1
              ? "Es ist heute ein Turniertag eingetragen."
              : `Es sind heute ${todayMatchdays.length} Turniertage eingetragen.`}
            <span className="block text-xs text-gray-600 mt-1">
              
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {todayMatchdays.slice(0, 3).map(({ ev, effectiveIso }) => (
              <div key={ev.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-gray-800">
                <span className="inline-flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-700" />
                  {fmtTime(effectiveIso)} Uhr
                </span>

                <span className="inline-flex items-center gap-2 min-w-0">
                  <Calendar className="w-4 h-4 text-orange-700" />
                  <span className="truncate">
                    {(ev.dko_series?.name ?? "Turnier")}
                    {ev.title?.trim() ? ` – ${ev.title.trim()}` : ""}
                  </span>
                </span>

                {ev.location && (
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 text-orange-700" />
                    <span className="truncate">{ev.location}</span>
                  </span>
                )}
              </div>
            ))}
            {todayMatchdays.length > 3 && (
              <div className="text-xs font-bold text-gray-600">+ {todayMatchdays.length - 3} weitere…</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 shrink-0">
        <Button
          onClick={() => {
            const first = todayMatchdays[0]?.ev
            if (!first) return

            const firstSeriesName = first.dko_series?.name ?? ""
            const isMembersChampionCup = isMembersChampionCupSeries(firstSeriesName)

            if (isMembersChampionCup) {
              router.push(
                `/admin/members-champion-cup/auslosung?seriesId=${encodeURIComponent(first.series_id)}&eventId=${encodeURIComponent(first.id)}`
              )
              return
            }

            router.push(
              `/dko_tournament_registration?seriesId=${encodeURIComponent(first.series_id)}&eventId=${encodeURIComponent(first.id)}`
            )
          }}
          className="font-black rounded-xl px-4 py-6 shadow-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white flex items-center gap-2 justify-center"
        >
          <Play className="w-5 h-5" />
          {todayMatchdays[0]?.ev?.dko_series?.name && isMembersChampionCupSeries(todayMatchdays[0].ev.dko_series.name)
            ? "Auslosung öffnen"
            : "Turniertag starten"}
        </Button>

        <div className="text-[11px] text-gray-600 font-semibold text-right">
          {todayMatchdays[0]?.ev?.dko_series?.name && isMembersChampionCupSeries(todayMatchdays[0].ev.dko_series.name)
            ? "Öffnet die Members-Cup-Auslosung."
            : "Startet den ersten heutigen Turniertag."}
        </div>
      </div>
    </div>
  </div>
)}

        {loading ? (
          <Card className="border-2 border-white shadow-lg rounded-2xl">
            <CardContent className="p-6 text-center text-gray-700 font-semibold">Lade Spieltage…</CardContent>
          </Card>
        ) : grouped.length === 0 ? (
          <Card className="border-2 border-white shadow-lg rounded-2xl">
            <CardContent className="p-6 text-center text-gray-700 font-semibold">Keine Spieltage vorhanden.</CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {grouped.map(({ seriesId, series, items }) => {
              const seriesName = series?.name ?? "Unbekannte Serie"

              return (
                <div key={seriesId}>
                  <div className="flex items-end justify-between gap-4 mb-4">
                    <div className="text-2xl font-black text-gray-900">{seriesName}</div>
                  </div>

                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {items.map((ev) => {
                      const effectiveIso = ev.is_rescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at
                      const dayKey = localDayKeyFromIso(effectiveIso)

                      const isToday = dayKey === todayKey
                      const isTournamentDay = !!ev.is_matchday
                      const canStart = isToday && isTournamentDay
                      const isMembersChampionCup = isMembersChampionCupSeries(seriesName)

                      const regs = registrationsByDay[dayKey] ?? []
                      const paidCount = regs.filter((r) => r.paid === true).length

                      return (
                        <div
                          key={ev.id}
                          className={`rounded-2xl shadow-lg border-2 transition-all ${
                            canStart ? "border-orange-400 bg-white" : "border-white bg-white/80"
                          }`}
                        >
                          <div
                            className={`rounded-t-2xl p-4 ${
                              canStart ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white" : "bg-gray-50 text-gray-900"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-bold opacity-90 flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {fmtDate(effectiveIso)}
                                </div>
                                <div className="text-2xl font-black mt-1 truncate">
                                  {ev.title?.trim() || (ev.is_matchday ? "Turniertag" : "Spielfrei")}
                                </div>
                              </div>

                              <span
                                className={`text-xs font-black px-2 py-1 rounded ${
                                  isTournamentDay
                                    ? canStart
                                      ? "bg-white/20 text-white"
                                      : "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {isTournamentDay ? "TURNIERTAG" : "SPIELFREI"}
                              </span>
                            </div>

                            <div className={`mt-3 flex items-center gap-2 text-sm font-semibold ${canStart ? "text-white/90" : "text-gray-700"}`}>
                              <Clock className="w-4 h-4" />
                              {fmtTime(effectiveIso)} Uhr
                            </div>

                            {ev.location && (
                              <div className={`mt-2 flex items-center gap-2 text-sm font-semibold ${canStart ? "text-white/90" : "text-gray-700"}`}>
                                <MapPin className="w-4 h-4" />
                                <span className="truncate">{ev.location}</span>
                              </div>
                            )}
                          </div>

                          <div className="p-4 space-y-4">
                            <div className="rounded-xl border-2 border-gray-100 bg-white p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 font-black text-gray-900">
                                  <Users className="w-4 h-4 text-orange-600" />
                                  Voranmeldungen (Datum)
                                </div>
                                <div className="text-xs font-black text-gray-700">
                                  {regs.length} gesamt{regs.length ? ` • ${paidCount} bezahlt` : ""}
                                </div>
                              </div>

                              {regs.length === 0 ? (
                                <div className="text-sm text-gray-500 mt-2">Keine Voranmeldungen an diesem Datum gefunden.</div>
                              ) : (
                                <div className="mt-3 space-y-2">
                                  {regs.slice(0, 6).map((r) => (
                                    <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                                      <div className="font-semibold text-gray-900 truncate">{r.player_name ?? "Unbekannt"}</div>
                                      {r.paid ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-black px-2 py-1 rounded bg-green-50 text-green-700 border border-green-100">
                                          <CheckCircle2 className="w-4 h-4" /> bezahlt
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-black px-2 py-1 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                          <XCircle className="w-4 h-4" /> offen
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                  {regs.length > 6 && <div className="text-xs text-gray-500 mt-1">+ {regs.length - 6} weitere…</div>}
                                </div>
                              )}
                            </div>

                            <Button
                              onClick={() => {
                                if (isMembersChampionCup) {
                                  router.push(
                                    `/admin/members-champion-cup/auslosung?seriesId=${encodeURIComponent(ev.series_id)}&eventId=${encodeURIComponent(ev.id)}`
                                  )
                                  return
                                }

                                router.push(
                                  `/dko_tournament_registration?seriesId=${encodeURIComponent(ev.series_id)}&eventId=${encodeURIComponent(ev.id)}`
                                )
                              }}
                              disabled={!canStart}
                              className={`w-full font-black py-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg ${
                                canStart
                                  ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
                              }`}
                              title={
                                canStart
                                  ? isMembersChampionCup
                                    ? "Members-Cup-Auslosung öffnen"
                                    : "Turniertag starten"
                                  : "Nur am heutigen Turniertag aktiv"
                              }
                            >
                              <Play className="w-5 h-5" />
                              {isMembersChampionCup ? "Auslosung öffnen" : "Turniertag starten"}
                            </Button>
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
      </div>
    </div>
  )
}
