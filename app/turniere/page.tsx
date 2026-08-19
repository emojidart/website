"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { createBrowserClient } from "@supabase/ssr"
import {
  Calendar,
  ChevronRight,
  Clock,
  Filter,
  Image as ImageIcon,
  List,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Swords,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)


type TimeFilter = "upcoming" | "past" | "all"
type QuickFilter = "all" | "today" | "weekend" | "next7"

type EventRow = {
  id: string
  name: string
  event_type: string
  event_date: string
  start_date: string | null
  end_date: string | null
  event_time: string | null
  location: string | null
  country_code: string | null
  postal_code: string | null
  city: string | null
  region: string | null
  organizer_name: string | null
  entry_fee: number | null
  max_participants: number | null
  details: string | null
  photo_url: string | null
  mode: string | null
  discipline: string | null
  format: string | null
  startgeld_details: string | null
  source: string | null
  event_status: string | null
  latitude: number | null
  longitude: number | null
  internal_event_id: string | null
  _source_kind?: "dach" | "internal"
  _internal_id?: string | null
}

const countryNames: Record<string, string> = {
  AT: "Österreich",
  DE: "Deutschland",
  CH: "Schweiz",
}

const timeOptions: { value: TimeFilter; label: string }[] = [
  { value: "upcoming", label: "Anstehend" },
  { value: "past", label: "Vergangen" },
  { value: "all", label: "Alle" },
]

function formatDateRange(startDate: string | null, endDate: string | null, fallback: string) {
  const start = startDate || fallback
  const end = endDate || fallback
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }
  const first = new Date(`${start}T12:00:00`).toLocaleDateString("de-DE", options)
  const last = new Date(`${end}T12:00:00`).toLocaleDateString("de-DE", options)
  return start === end ? first : `${first} – ${last}`
}

function eventEnd(event: EventRow) {
  const date = event.end_date || event.event_date
  return new Date(`${date}T23:59:59`)
}

function eventStart(event: EventRow) {
  const date = event.start_date || event.event_date
  const rawTime = event.event_time || "19:00"
  return new Date(`${date}T${rawTime.slice(0, 5)}:00`)
}

function startOfLocalDay(date: Date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function endOfLocalDay(date: Date) {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

function isEventInQuickRange(event: EventRow, filter: QuickFilter) {
  if (filter === "all") return true

  const now = new Date()
  const eventStartDate = startOfLocalDay(eventStart(event))
  const eventEndDate = endOfLocalDay(eventEnd(event))

  if (filter === "today") {
    const todayStart = startOfLocalDay(now)
    const todayEnd = endOfLocalDay(now)
    return eventEndDate >= todayStart && eventStartDate <= todayEnd
  }

  if (filter === "next7") {
    const rangeStart = startOfLocalDay(now)
    const rangeEnd = endOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7))
    return eventEndDate >= rangeStart && eventStartDate <= rangeEnd
  }

  const day = now.getDay()
  const daysUntilSaturday = (6 - day + 7) % 7
  const saturday = startOfLocalDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSaturday),
  )
  const sunday = endOfLocalDay(
    new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 1),
  )

  return eventEndDate >= saturday && eventStartDate <= sunday
}

function shortMonth(value: string) {
  return new Date(`${value}T12:00:00`)
    .toLocaleDateString("de-DE", { month: "short" })
    .replace(".", "")
    .toUpperCase()
}

function dayNumber(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
  })
}

function dartLabel(value: string | null) {
  if (value === "edart") return "E-Dart"
  if (value === "steeldart") return "Steel-Dart"
  if (value === "both") return "E-Dart & Steel"
  return "Dart"
}

function DartIcon({ value }: { value: string | null }) {
  if (value === "edart") return <Target className="h-3.5 w-3.5" />
  if (value === "steeldart") return <Swords className="h-3.5 w-3.5" />
  return <Users className="h-3.5 w-3.5" />
}

function Chip({
  children,
  tone = "slate",
}: {
  children: React.ReactNode
  tone?: "slate" | "orange" | "blue" | "green"
}) {
  const style =
    tone === "orange"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : tone === "blue"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : tone === "green"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-600"

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${style}`}>
      {children}
    </span>
  )
}

export default function VeranstaltungenPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming")
  const [countryFilter, setCountryFilter] = useState("all")
  const [regionFilter, setRegionFilter] = useState("all")
  const [disciplineFilter, setDisciplineFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [query, setQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all")

  useEffect(() => {
    let active = true

    async function loadEvents() {
      setLoading(true)
      setError("")

      const [dachRes, internalRes] = await Promise.all([
        supabase
          .from("dach_events")
          .select(
            "id,internal_event_id,name,event_type,event_date,start_date,end_date,event_time,location,country_code,postal_code,city,region,organizer_name,entry_fee,max_participants,details,photo_url,mode,discipline,format,startgeld_details,source,event_status,latitude,longitude",
          )
          .in("event_status", ["approved", "cancelled"])
          .order("start_date", { ascending: true })
          .order("event_time", { ascending: true }),

        supabase
          .from("events")
          .select(
            "id,name,event_type,event_date,start_date,end_date,event_time,location,entry_fee,max_participants,details,photo_url,mode,startgeld_details,source",
          )
          .eq("event_type", "tournament")
          .order("start_date", { ascending: true })
          .order("event_time", { ascending: true }),
      ])

      if (!active) return

      if (dachRes.error) {
        setError(dachRes.error.message)
        setLoading(false)
        return
      }

      if (internalRes.error) {
        setError(internalRes.error.message)
        setLoading(false)
        return
      }

      const dachRows = ((dachRes.data || []) as any[]).map((row) => ({
        ...row,
        _source_kind: "dach" as const,
        _internal_id: row.internal_event_id || null,
      }))

      const linkedInternalIds = new Set(
        dachRows
          .map((row) => row.internal_event_id)
          .filter((id): id is string => Boolean(id)),
      )

      const internalOnly = ((internalRes.data || []) as any[])
        .filter((row) => !linkedInternalIds.has(String(row.id)))
        .map((row) => ({
          id: String(row.id),
          internal_event_id: String(row.id),
          name: row.name,
          event_type: row.event_type,
          event_date: row.event_date || row.start_date,
          start_date: row.start_date,
          end_date: row.end_date,
          event_time: row.event_time,
          location: row.location,
          country_code: "AT",
          postal_code: null,
          city: null,
          region: null,
          organizer_name: "EMD",
          entry_fee: row.entry_fee,
          max_participants: row.max_participants,
          details: row.details,
          photo_url: row.photo_url,
          mode: row.mode,
          discipline: row.mode,
          format: null,
          startgeld_details: row.startgeld_details,
          source: row.source || "internal",
          event_status: "approved",
          latitude: null,
          longitude: null,
          _source_kind: "internal" as const,
          _internal_id: String(row.id),
        }))

      setEvents([...dachRows, ...internalOnly] as EventRow[])
      setLoading(false)
    }

    void loadEvents()
    return () => {
      active = false
    }
  }, [])

  const availableRegions = useMemo(() => {
    return Array.from(
      new Set(
        events
          .filter(
            (event) =>
              countryFilter === "all" || event.country_code === countryFilter,
          )
          .map((event) => event.region?.trim())
          .filter((region): region is string => Boolean(region)),
      ),
    ).sort((a, b) => a.localeCompare(b, "de"))
  }, [events, countryFilter])

  const filtered = useMemo(() => {
    const now = Date.now()
    const search = query.trim().toLowerCase()

    return events
      .filter((event) => {
        const end = eventEnd(event).getTime()
        if (timeFilter === "upcoming") return end >= now
        if (timeFilter === "past") return end < now
        return true
      })
      .filter((event) => isEventInQuickRange(event, quickFilter))
      .filter((event) => countryFilter === "all" || event.country_code === countryFilter)
      .filter((event) => regionFilter === "all" || event.region === regionFilter)
      .filter((event) => {
        const discipline = event.discipline || event.mode
        return disciplineFilter === "all" || discipline === disciplineFilter || discipline === "both"
      })
      .filter((event) => {
        if (!dateFilter) return true
        const start = event.start_date || event.event_date
        const end = event.end_date || event.event_date
        return dateFilter >= start && dateFilter <= end
      })
      .filter((event) => {
        if (!search) return true
        return [
          event.name,
          event.city,
          event.postal_code,
          event.region,
          event.location,
          event.organizer_name,
          event.details,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search)
      })
      .sort((a, b) => {
        const first = eventStart(a).getTime()
        const second = eventStart(b).getTime()
        return timeFilter === "past" ? second - first : first - second
      })
  }, [events, timeFilter, quickFilter, countryFilter, regionFilter, disciplineFilter, dateFilter, query])

  const activeFilterCount = [
    countryFilter !== "all",
    regionFilter !== "all",
    disciplineFilter !== "all",
    Boolean(dateFilter),
  ].filter(Boolean).length

  const resetFilters = () => {
    setQuickFilter("all")
    setCountryFilter("all")
    setRegionFilter("all")
    setDisciplineFilter("all")
    setDateFilter("")
    setQuery("")
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f7f9] pb-24 text-slate-950">
      <Header />

      <main className="pt-14">
        <section className="relative overflow-hidden bg-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.28),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_35%)]" />
          <div className="relative mx-auto w-full max-w-screen-xl px-4 pb-24 pt-10 sm:pb-28 sm:pt-14">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-orange-200 backdrop-blur">
                  <Trophy className="h-3.5 w-3.5" />
                  Alle Dart-Turniere auf einen Blick
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                  Finde dein nächstes
                  <span className="block text-orange-400">Dart-Turnier.</span>
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                  EMD-Turniere und öffentliche DACH-Turniere gemeinsam – ohne doppelte Einträge.
                </p>
              </div>

              <Button asChild className="h-12 rounded-2xl bg-orange-500 px-5 font-bold text-white shadow-lg shadow-orange-950/30 hover:bg-orange-600">
                <Link href="/dach-veranstaltungen/neu">
                  <Plus className="mr-2 h-4 w-4" />
                  Veranstaltung einreichen
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <div className="relative z-20 mx-auto -mt-14 w-full max-w-screen-xl px-4">
          <Card className="overflow-hidden rounded-[28px] border-0 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.14)]">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Turnier, Ort, PLZ, Bundesland oder Verein suchen"
                    className="h-14 rounded-2xl border-slate-200 bg-slate-50 pl-12 pr-12 text-base shadow-none focus-visible:ring-orange-500"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Suche löschen"
                      className="absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition hover:bg-slate-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilters((current) => !current)}
                  className="h-14 rounded-2xl border-slate-200 px-5 font-bold lg:min-w-40"
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filter
                  {activeFilterCount > 0 ? (
                    <span className="ml-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </Button>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[
                  { value: "all", label: "Alle" },
                  { value: "today", label: "Heute" },
                  { value: "weekend", label: "Dieses Wochenende" },
                  { value: "next7", label: "Nächste 7 Tage" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setQuickFilter(option.value as QuickFilter)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                      quickFilter === option.value
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {timeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTimeFilter(option.value)}
                    className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      timeFilter === option.value
                        ? "bg-slate-950 text-white"
                        : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {showFilters ? (
                <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Select
                    value={countryFilter}
                    onValueChange={(value) => {
                      setCountryFilter(value)
                      setRegionFilter("all")
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Land auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Länder</SelectItem>
                      <SelectItem value="AT">Österreich</SelectItem>
                      <SelectItem value="DE">Deutschland</SelectItem>
                      <SelectItem value="CH">Schweiz</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={regionFilter}
                    onValueChange={setRegionFilter}
                    disabled={availableRegions.length === 0}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Bundesland / Kanton" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Bundesländer / Kantone</SelectItem>
                      {availableRegions.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Dartart auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">E-Dart und Steel-Dart</SelectItem>
                      <SelectItem value="edart">Nur E-Dart</SelectItem>
                      <SelectItem value="steeldart">Nur Steel-Dart</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(event) => setDateFilter(event.target.value)}
                      className="h-12 rounded-xl border-slate-200 pl-10"
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
                <span className="font-semibold text-slate-500">
                  {loading ? "Veranstaltungen werden geladen …" : `${filtered.length} Treffer gefunden`}
                </span>
                {(activeFilterCount > 0 || query) ? (
                  <button type="button" onClick={resetFilters} className="font-bold text-orange-600 transition hover:text-orange-700">
                    Alles zurücksetzen
                  </button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mx-auto w-full max-w-screen-xl px-4 py-8">
          {!loading && !error && filtered.length > 0 ? (
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                  {timeFilter === "past" ? "Vergangene Veranstaltungen" : timeFilter === "all" ? "Alle Veranstaltungen" : "Kommende Veranstaltungen"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Entdecke Turniere und öffne die Detailansicht für weitere Informationen.</p>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex gap-4 rounded-[24px] border border-slate-200 bg-white p-4">
                  <div className="h-24 w-20 animate-pulse rounded-2xl bg-slate-200" />
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <Card className="rounded-[28px] border-red-200 bg-red-50">
              <CardContent className="py-14 text-center text-red-700">{error}</CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="rounded-[28px] border-0 bg-white shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Filter className="h-6 w-6 text-slate-500" />
                </div>
                <p className="mt-4 text-lg font-black">Keine passenden Veranstaltungen gefunden</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  Passe den Suchbegriff oder die Filter an, um weitere Turniere zu entdecken.
                </p>
                <Button type="button" variant="outline" onClick={resetFilters} className="mt-5 rounded-xl">
                  Suche zurücksetzen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((event) => {
                const discipline = event.discipline || event.mode
                const country = event.country_code ? countryNames[event.country_code] : null
                const isPast = eventEnd(event).getTime() < Date.now()
                const isCancelled = event.event_status === "cancelled"
                const startDate = event.start_date || event.event_date
                const location =
                  [event.postal_code, event.city].filter(Boolean).join(" ") ||
                  event.location ||
                  "Ort folgt"
                const regionLabel = event.region?.trim() || null

                return (
                  <Link
                    key={event.id}
                    href={event._source_kind === "internal" ? `/veranstaltungen/${event._internal_id || event.id}` : `/dach-veranstaltungen/${event.id}`}
                    className="group block"
                  >
                    <article
                      className={`relative overflow-hidden rounded-[24px] border bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
                        isCancelled
                          ? "border-red-300 ring-2 ring-red-50"
                          : "border-slate-200 hover:border-orange-200"
                      }`}
                    >
                      <div className="flex min-h-[150px]">
                        <div
                          className={`flex w-24 shrink-0 flex-col items-center justify-center px-3 text-center sm:w-28 ${
                            isCancelled
                              ? "bg-red-600 text-white"
                              : "bg-slate-950 text-white"
                          }`}
                        >
                          <div className="text-3xl font-black leading-none sm:text-4xl">
                            {dayNumber(startDate)}
                          </div>
                          <div className={`mt-1 text-sm font-black tracking-widest ${
                            isCancelled ? "text-red-100" : "text-orange-400"
                          }`}>
                            {shortMonth(startDate)}
                          </div>
                          <div className="mt-3 text-xs font-bold text-white/65">
                            {(event.event_time || "19:00").slice(0, 5)} Uhr
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-black text-orange-700">
                                  <DartIcon value={discipline} />
                                  {dartLabel(discipline)}
                                </span>

                                {event.country_code ? (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                                    {event.country_code} · {country}
                                  </span>
                                ) : null}

                                {isCancelled ? (
                                  <span className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-black text-white">
                                    ABGESAGT
                                  </span>
                                ) : isPast ? (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
                                    VERGANGEN
                                  </span>
                                ) : null}
                              </div>

                              <h3
                                className={`mt-3 line-clamp-2 text-lg font-black leading-snug sm:text-xl ${
                                  isCancelled
                                    ? "text-red-700 line-through decoration-2"
                                    : "text-slate-950 group-hover:text-orange-600"
                                }`}
                              >
                                {event.name}
                              </h3>

                              <div className="mt-2 flex items-start gap-2 text-sm font-semibold text-slate-600">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                                <span className="line-clamp-1">
                                  {location}
                                  {regionLabel ? ` · ${regionLabel}` : ""}
                                </span>
                              </div>

                              {event.details ? (
                                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                                  {event.details}
                                </p>
                              ) : null}

                              {event.startgeld_details ? (
                                <div className="mt-3 inline-flex rounded-xl bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700">
                                  Startgeld: {event.startgeld_details}
                                </div>
                              ) : null}
                            </div>

                            <span
                              className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
                                isCancelled
                                  ? "bg-red-100 text-red-700 group-hover:bg-red-600 group-hover:text-white"
                                  : "bg-slate-100 text-slate-700 group-hover:bg-orange-500 group-hover:text-white"
                              }`}
                            >
                              <ChevronRight className="h-5 w-5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
