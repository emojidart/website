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
      ? "border-orange-300/[0.16] bg-orange-500/[0.08] text-orange-200"
      : tone === "blue"
        ? "border-sky-300/[0.16] bg-sky-500/[0.08] text-sky-200"
        : tone === "green"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-white/[0.08] bg-[#080c12]/95 text-white/50"

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
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    let active = true

    async function checkAuth() {
      const { data } = await supabase.auth.getUser()
      if (active) setIsLoggedIn(Boolean(data.user))
    }

    void checkAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setIsLoggedIn(Boolean(session?.user))
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadEvents() {
      setLoading(true)
      setError("")

      const { data, error } = await supabase
        .from("dach_events")
        .select(
          "id,name,event_type,event_date,start_date,end_date,event_time,location,country_code,postal_code,city,region,organizer_name,entry_fee,max_participants,details,photo_url,mode,discipline,format,startgeld_details,source,event_status,latitude,longitude",
        )
        .in("event_status", ["approved", "cancelled"])
        .order("start_date", { ascending: true })
        .order("event_time", { ascending: true })

      if (!active) return
      if (error) setError(error.message)
      else setEvents((data || []) as EventRow[])
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] pb-24 text-white">
      <Header variant="app" title="Turniere entdecken" subtitle="DACH Turniere" backHref="/dach-veranstaltungen" />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.32]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.70),rgba(3,5,9,.94)_46%,rgba(2,4,7,.985))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(14,165,233,.13),transparent_26%),radial-gradient(circle_at_88%_28%,rgba(249,115,22,.12),transparent_28%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-10 pt-20 sm:px-5 sm:pt-24 lg:px-7 xl:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-black/35 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.28),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_35%)]" />
          <div className="relative px-5 py-7 sm:px-7 sm:py-9 lg:px-8">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-300/[0.14] bg-orange-500/[0.08] px-3 py-1.5 text-xs font-bold text-orange-100 backdrop-blur">
                  <Trophy className="h-3.5 w-3.5" />
                  Die Turnierübersicht für den DACH-Raum
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                  Finde dein nächstes
                  <span className="block text-orange-400">Dart-Turnier.</span>
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-white/48 sm:text-base">
                  Durchsuche Veranstaltungen in Österreich, Deutschland und der Schweiz nach Ort, Verein, Datum oder Dartart.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                {isLoggedIn ? (
                  <Button
                    asChild
                    variant="outline"
                    className="h-12 rounded-2xl border-white/[0.10] bg-white/[0.04] px-5 font-bold text-white shadow-none backdrop-blur transition hover:border-sky-300/[0.20] hover:bg-sky-500/[0.08] hover:text-white"
                  >
                    <Link href="/dach-veranstaltungen/meine">
                      <List className="mr-2 h-4 w-4" />
                      Meine Turniere
                    </Link>
                  </Button>
                ) : null}

                <Button
                  asChild
                  className="h-12 rounded-2xl bg-orange-500 px-5 font-bold text-white shadow-[0_18px_46px_-26px_rgba(249,115,22,.55)] transition hover:bg-orange-400"
                >
                  <Link href="/dach-veranstaltungen/neu">
                    <Plus className="mr-2 h-4 w-4" />
                    Turnier einreichen
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="relative z-20 mt-4 w-full">
          <Card className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/40 shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/25" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Turnier, Ort, PLZ, Bundesland oder Verein suchen"
                    className="h-14 rounded-2xl border-white/[0.09] bg-[#080c12]/95 pl-12 pr-12 text-base text-white placeholder:text-white/25 shadow-none focus-visible:border-orange-300/30 focus-visible:ring-1 focus-visible:ring-orange-400/30"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Suche löschen"
                      className="absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.06] text-white/45 transition hover:bg-white/[0.10] hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilters((current) => !current)}
                  className="h-14 rounded-2xl border-white/[0.09] bg-[#080c12]/95 px-5 font-bold text-white shadow-none transition hover:border-sky-300/[0.20] hover:bg-sky-500/[0.08] hover:text-white lg:min-w-40"
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
                        ? "border border-orange-300/20 bg-orange-500 text-white shadow-[0_10px_28px_-20px_rgba(249,115,22,.7)]"
                        : "border border-white/[0.08] bg-white/[0.04] text-white/50 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white/75"
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
                        ? "border border-sky-300/[0.18] bg-sky-500/[0.10] text-sky-100"
                        : "border border-white/[0.08] bg-white/[0.035] text-white/40 hover:bg-white/[0.06] hover:text-white/70"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {showFilters ? (
                <div className="mt-4 grid gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Select
                    value={countryFilter}
                    onValueChange={(value) => {
                      setCountryFilter(value)
                      setRegionFilter("all")
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-white/[0.09] bg-[#080c12]/95 text-white shadow-none">
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
                    <SelectTrigger className="h-12 rounded-xl border-white/[0.09] bg-[#080c12]/95 text-white shadow-none">
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
                    <SelectTrigger className="h-12 rounded-xl border-white/[0.09] bg-[#080c12]/95 text-white shadow-none">
                      <SelectValue placeholder="Dartart auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">E-Dart und Steel-Dart</SelectItem>
                      <SelectItem value="edart">Nur E-Dart</SelectItem>
                      <SelectItem value="steeldart">Nur Steel-Dart</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(event) => setDateFilter(event.target.value)}
                      className="h-12 rounded-xl border-white/[0.09] bg-[#080c12]/95 pl-10 text-white shadow-none"
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-3 text-sm">
                <span className="font-semibold text-white/35">
                  {loading ? "Veranstaltungen werden geladen …" : `${filtered.length} Treffer gefunden`}
                </span>
                {(activeFilterCount > 0 || query) ? (
                  <button type="button" onClick={resetFilters} className="font-bold text-orange-200 transition hover:text-orange-200">
                    Alles zurücksetzen
                  </button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full py-7 sm:py-8">
          {!loading && !error && filtered.length > 0 ? (
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                  {timeFilter === "past" ? "Vergangene Veranstaltungen" : timeFilter === "all" ? "Alle Veranstaltungen" : "Kommende Veranstaltungen"}
                </h2>
                <p className="mt-1 text-sm text-white/35">Entdecke Turniere und öffne die Detailansicht für weitere Informationen.</p>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex gap-4 rounded-[24px] border border-white/[0.08] bg-black/25 p-4">
                  <div className="h-24 w-20 animate-pulse rounded-2xl bg-white/[0.07]" />
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-white/[0.07]" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-white/[0.045]" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.045]" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <Card className="rounded-[28px] border-red-300/[0.16] bg-red-500/[0.08]">
              <CardContent className="py-14 text-center text-red-200">{error}</CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="rounded-[28px] border-0 bg-black/25 shadow-none">
              <CardContent className="py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.045]">
                  <Filter className="h-6 w-6 text-white/35" />
                </div>
                <p className="mt-4 text-lg font-black">Keine passenden Veranstaltungen gefunden</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-white/35">
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
                    href={`/dach-veranstaltungen/${event.id}`}
                    className="group block"
                  >
                    <article
                      className={`relative h-full overflow-hidden rounded-[24px] border bg-black/35 shadow-[0_22px_60px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-black/42 hover:shadow-[0_26px_72px_-44px_rgba(0,0,0,.98)] ${
                        isCancelled
                          ? "border-red-300/[0.22] ring-1 ring-red-300/[0.08]"
                          : "border-white/[0.08] hover:border-orange-300/[0.22]"
                      }`}
                    >
                      <div className="flex min-h-[150px]">
                        <div
                          className={`flex w-24 shrink-0 flex-col items-center justify-center px-3 text-center sm:w-28 ${
                            isCancelled
                              ? "bg-red-600 text-white"
                              : "bg-[linear-gradient(180deg,rgba(15,20,28,.96),rgba(5,8,12,.98))] text-white"
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
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/[0.08] px-2.5 py-1 text-[11px] font-black text-orange-200">
                                  <DartIcon value={discipline} />
                                  {dartLabel(discipline)}
                                </span>

                                {event.country_code ? (
                                  <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[11px] font-black text-white/45">
                                    {event.country_code} · {country}
                                  </span>
                                ) : null}

                                {isCancelled ? (
                                  <span className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-black text-white">
                                    ABGESAGT
                                  </span>
                                ) : isPast ? (
                                  <span className="rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 text-[11px] font-black text-white/35">
                                    VERGANGEN
                                  </span>
                                ) : null}
                              </div>

                              <h3
                                className={`mt-3 line-clamp-2 text-lg font-black leading-snug sm:text-xl ${
                                  isCancelled
                                    ? "text-red-700 line-through decoration-2"
                                    : "text-white group-hover:text-orange-200"
                                }`}
                              >
                                {event.name}
                              </h3>

                              <div className="mt-2 flex items-start gap-2 text-sm font-semibold text-white/50">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-200" />
                                <span className="line-clamp-1">
                                  {location}
                                  {regionLabel ? ` · ${regionLabel}` : ""}
                                </span>
                              </div>

                              {event.details ? (
                                <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/35">
                                  {event.details}
                                </p>
                              ) : null}

                              {event.startgeld_details ? (
                                <div className="mt-3 inline-flex rounded-xl bg-orange-500/[0.08] px-3 py-1.5 text-xs font-black text-orange-200">
                                  Startgeld: {event.startgeld_details}
                                </div>
                              ) : null}
                            </div>

                            <span
                              className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
                                isCancelled
                                  ? "border border-red-300/[0.14] bg-red-500/[0.08] text-red-200 group-hover:bg-red-500 group-hover:text-white"
                                  : "border border-white/[0.08] bg-white/[0.04] text-white/55 group-hover:border-orange-300/25 group-hover:bg-orange-500 group-hover:text-white"
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
