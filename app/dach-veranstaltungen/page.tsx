"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { createBrowserClient } from "@supabase/ssr"
import {
  Calendar,
  Clock,
  Filter,
  Image as ImageIcon,
  MapPin,
  Plus,
  Search,
  Swords,
  Target,
  Trophy,
  Users,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type TimeFilter = "upcoming" | "past" | "all"

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
  cancellation_reason: string | null
  cancelled_at: string | null
}

const countryNames: Record<string, string> = {
  AT: "Österreich",
  DE: "Deutschland",
  CH: "Schweiz",
}

function formatDateRange(startDate: string | null, endDate: string | null, fallback: string) {
  const start = startDate || fallback
  const end = endDate || fallback
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }
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

function dartLabel(value: string | null) {
  if (value === "edart") return "E-Dart"
  if (value === "steeldart") return "Steel-Dart"
  if (value === "both") return "E-Dart & Steel"
  return "Dart"
}

function DartIcon({ value }: { value: string | null }) {
  if (value === "edart") return <Target className="w-3.5 h-3.5" />
  if (value === "steeldart") return <Swords className="w-3.5 h-3.5" />
  return <Users className="w-3.5 h-3.5" />
}

function Chip({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "orange" | "blue" | "green" | "amber" | "red" }) {
  const style =
    tone === "orange"
      ? "bg-orange-50 text-orange-800 border-orange-200"
      : tone === "blue"
        ? "bg-blue-50 text-blue-800 border-blue-200"
        : tone === "green"
          ? "bg-green-50 text-green-800 border-green-200"
          : tone === "amber"
            ? "bg-amber-50 text-amber-800 border-amber-200"
            : tone === "red"
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-gray-50 text-gray-700 border-gray-200"

  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${style}`}>{children}</span>
}

export default function VeranstaltungenPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming")
  const [countryFilter, setCountryFilter] = useState("all")
  const [disciplineFilter, setDisciplineFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [query, setQuery] = useState("")

  useEffect(() => {
    let active = true

    async function loadEvents() {
      setLoading(true)
      setError("")

      const { data, error } = await supabase
        .from("dach_events")
        .select(
          "id,name,event_type,event_date,start_date,end_date,event_time,location,country_code,postal_code,city,region,organizer_name,entry_fee,max_participants,details,photo_url,mode,discipline,format,startgeld_details,source,event_status,cancellation_reason,cancelled_at",
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
      .filter((event) => countryFilter === "all" || event.country_code === countryFilter)
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
  }, [events, timeFilter, countryFilter, disciplineFilter, dateFilter, query])

  const resetFilters = () => {
    setCountryFilter("all")
    setDisciplineFilter("all")
    setDateFilter("")
    setQuery("")
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
      <Header />
      <main className="pt-14">
        <div className="mx-auto w-full max-w-screen-xl px-4 py-6">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
            <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-black">Dart-Veranstaltungen DACH</h1>
                  <p className="text-sm text-gray-600 mt-1">Turniere in Österreich, Deutschland und der Schweiz finden.</p>
                </div>
              </div>
              <Button asChild className="rounded-xl">
                <Link href="/dach-veranstaltungen/neu"><Plus className="w-4 h-4 mr-2" /> Veranstaltung einreichen</Link>
              </Button>
            </div>
          </div>

          <Card className="sticky top-[56px] z-20 mt-4 rounded-3xl border border-gray-200 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" variant={timeFilter === "upcoming" ? "default" : "outline"} onClick={() => setTimeFilter("upcoming")}>Anstehend</Button>
                <Button size="sm" variant={timeFilter === "past" ? "default" : "outline"} onClick={() => setTimeFilter("past")}>Vergangen</Button>
                <Button size="sm" variant={timeFilter === "all" ? "default" : "outline"} onClick={() => setTimeFilter("all")}>Alle</Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ort, PLZ, Verein oder Turnier suchen …" className="pl-9 rounded-xl" />
              </div>

              <div className="grid sm:grid-cols-3 gap-2">
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Land" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Länder</SelectItem>
                    <SelectItem value="AT">Österreich</SelectItem>
                    <SelectItem value="DE">Deutschland</SelectItem>
                    <SelectItem value="CH">Schweiz</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Dartart" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">E-Dart + Steel</SelectItem>
                    <SelectItem value="edart">Nur E-Dart</SelectItem>
                    <SelectItem value="steeldart">Nur Steel-Dart</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="pl-9 rounded-xl" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs text-gray-600">
                <span>{loading ? "Lade …" : `${filtered.length} Veranstaltung(en)`}</span>
                <button type="button" onClick={resetFilters} className="font-bold text-orange-700">Filter zurücksetzen</button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-5">
            {loading ? (
              <div className="py-16 text-center text-gray-600">Veranstaltungen werden geladen …</div>
            ) : error ? (
              <div className="py-16 text-center text-red-600">{error}</div>
            ) : filtered.length === 0 ? (
              <Card className="rounded-3xl"><CardContent className="py-14 text-center">
                <Filter className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <p className="font-bold">Keine passenden Veranstaltungen gefunden.</p>
                <p className="text-sm text-gray-500 mt-1">Ändere Datum, Land oder Suchort.</p>
              </CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((event) => {
                  const discipline = event.discipline || event.mode
                  const country = event.country_code ? countryNames[event.country_code] : null
                  const isPast = eventEnd(event).getTime() < Date.now()
                  const isCancelled = event.event_status === "cancelled"

                  return (
                    <Card key={event.id} className={`relative rounded-3xl overflow-hidden border shadow-sm bg-white ${isCancelled ? "border-red-300" : "border-gray-200"}`}>
                      {isCancelled ? (
                        <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-3 py-1.5 text-xs font-black text-white shadow-lg">
                          ABGESAGT
                        </div>
                      ) : null}
                      {event.photo_url && !event.photo_url.toLowerCase().endsWith(".pdf") ? (
                        <div className="relative h-44 bg-gray-200">
                          <Image src={event.photo_url} alt={event.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="h-44 bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center">
                          <div className="text-center px-5">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-80" />
                            <div className="font-black line-clamp-2">{event.name}</div>
                          </div>
                        </div>
                      )}

                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-black leading-snug line-clamp-2">{event.name}</CardTitle>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Chip tone="orange"><DartIcon value={discipline} /> {dartLabel(discipline)}</Chip>
                          {country ? <Chip tone="blue">{event.country_code} · {country}</Chip> : null}
                          <Chip tone={isPast ? "gray" : "green"}>{isPast ? "Vergangen" : "Anstehend"}</Chip>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-1">
                        <div className="space-y-2 text-sm text-gray-700">
                          <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-orange-600" /><span className="font-semibold">{formatDateRange(event.start_date, event.end_date, event.event_date)}</span></div>
                          <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-orange-600" /><span>{(event.event_time || "19:00").slice(0, 5)} Uhr</span></div>
                          <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-orange-600 mt-0.5" /><span className="line-clamp-2">{[event.postal_code, event.city].filter(Boolean).join(" ") || event.location || "Ort folgt"}</span></div>
                          {event.organizer_name ? <div className="flex items-center gap-2"><Users className="w-4 h-4 text-orange-600" /><span className="line-clamp-1">{event.organizer_name}</span></div> : null}
                          {event.startgeld_details ? <p className="font-bold text-orange-700 pt-1">Startgeld: {event.startgeld_details}</p> : null}
                          {event.details ? <p className="text-gray-600 line-clamp-3 pt-1">{event.details}</p> : null}
                        </div>
                        <Button asChild className="w-full rounded-xl mt-4"><Link href={`/dach-veranstaltungen/${event.id}`}>Details anzeigen</Link></Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
