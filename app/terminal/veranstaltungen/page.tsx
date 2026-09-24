"use client"

import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Filter,
  MapPin,
  PartyPopper,
  Search,
  Swords,
  Target,
  Trophy,
  Users,
} from "lucide-react"
import TerminalLink from "../_components/TerminalLink"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type SourceFilter = "all" | "internal" | "external"
type TimeFilter = "upcoming" | "all" | "past"

type TerminalEvent = {
  id: string
  source: "internal" | "external"
  name: string
  event_type: string | null
  start_date: string
  end_date: string
  event_time: string | null
  location: string | null
  city?: string | null
  region?: string | null
  country_code?: string | null
  organizer_name?: string | null
  entry_fee?: number | null
  startgeld_details?: string | null
  max_participants?: number | null
  details?: string | null
  photo_url?: string | null
  mode?: string | null
  discipline?: string | null
  registration_url?: string | null
  event_status?: string | null
}

function eventTypeLabel(value?: string | null) {
  const v = String(value || "").toLowerCase()
  if (v.includes("tournament") || v.includes("turnier")) return "Turnier"
  if (v.includes("party")) return "Party"
  if (v.includes("gaming") || v.includes("console")) return "Gaming"
  if (v.includes("versammlung")) return "Versammlung"
  if (v.includes("announcement")) return "Ankündigung"
  return "Veranstaltung"
}

function TypeIcon({ value }: { value?: string | null }) {
  const v = String(value || "").toLowerCase()
  if (v.includes("tournament") || v.includes("turnier")) return <Trophy className="h-4 w-4" />
  if (v.includes("party")) return <PartyPopper className="h-4 w-4" />
  return <CalendarDays className="h-4 w-4" />
}

function dartLabel(value?: string | null) {
  const v = String(value || "").toLowerCase()
  if (v === "edart") return "E-Dart"
  if (v === "steeldart") return "Steel-Dart"
  if (v === "both") return "E-Dart & Steel"
  return null
}

function DartIcon({ value }: { value?: string | null }) {
  const v = String(value || "").toLowerCase()
  if (v === "edart") return <Target className="h-4 w-4" />
  if (v === "steeldart") return <Swords className="h-4 w-4" />
  return <Users className="h-4 w-4" />
}

function dateDE(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function dateRange(event: TerminalEvent) {
  return event.start_date === event.end_date
    ? dateDE(event.start_date)
    : `${dateDE(event.start_date)} – ${dateDE(event.end_date)}`
}

function endTs(event: TerminalEvent) {
  return new Date(`${event.end_date}T23:59:59`).getTime()
}

function startTs(event: TerminalEvent) {
  const t = (event.event_time || "19:00").slice(0, 5)
  return new Date(`${event.start_date}T${t}:00`).getTime()
}

function locationText(event: TerminalEvent) {
  if (event.source === "external") {
    const place = [event.location, [event.city, event.region].filter(Boolean).join(", "), event.country_code]
      .filter(Boolean)
      .join(" · ")
    return place || "Ort offen"
  }
  return event.location || "Ort offen"
}

export default function TerminalVeranstaltungenPage() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<TerminalEvent[]>([])
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all")
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming")
  const [query, setQuery] = useState("")

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const [internalResult, externalResult] = await Promise.all([
        supabase
          .from("events")
          .select("id,name,event_type,event_date,start_date,end_date,event_time,location,entry_fee,max_participants,details,photo_url,mode,startgeld_details,source")
          .order("start_date", { ascending: true }),
        supabase
          .from("dach_events")
          .select("id,name,event_type,event_date,start_date,end_date,event_time,location,country_code,city,region,organizer_name,entry_fee,max_participants,details,photo_url,mode,discipline,startgeld_details,registration_url,event_status")
          .in("event_status", ["approved", "cancelled"])
          .order("start_date", { ascending: true }),
      ])

      const internalRows: TerminalEvent[] = ((internalResult.data || []) as any[]).map((row) => ({
        id: String(row.id),
        source: "internal",
        name: row.name || "Veranstaltung",
        event_type: row.event_type || null,
        start_date: row.start_date || row.event_date,
        end_date: row.end_date || row.event_date,
        event_time: row.event_time || null,
        location: row.location || null,
        entry_fee: row.entry_fee ?? null,
        max_participants: row.max_participants ?? null,
        details: row.details || null,
        photo_url: row.photo_url || null,
        mode: row.mode || null,
        startgeld_details: row.startgeld_details || null,
      }))

      const externalRows: TerminalEvent[] = ((externalResult.data || []) as any[]).map((row) => ({
        id: String(row.id),
        source: "external",
        name: row.name || "Veranstaltung",
        event_type: row.event_type || null,
        start_date: row.start_date || row.event_date,
        end_date: row.end_date || row.event_date,
        event_time: row.event_time || null,
        location: row.location || null,
        city: row.city || null,
        region: row.region || null,
        country_code: row.country_code || null,
        organizer_name: row.organizer_name || null,
        entry_fee: row.entry_fee ?? null,
        max_participants: row.max_participants ?? null,
        details: row.details || null,
        photo_url: row.photo_url || null,
        mode: row.mode || null,
        discipline: row.discipline || null,
        startgeld_details: row.startgeld_details || null,
        registration_url: row.registration_url || null,
        event_status: row.event_status || null,
      }))

      setEvents([...internalRows, ...externalRows])
      setLoading(false)
    }

    void load()
  }, [])

  const filtered = useMemo(() => {
    const now = Date.now()
    const q = query.trim().toLowerCase()

    return events
      .filter((event) => sourceFilter === "all" || event.source === sourceFilter)
      .filter((event) => {
        if (timeFilter === "all") return true
        if (timeFilter === "upcoming") return endTs(event) >= now
        return endTs(event) < now
      })
      .filter((event) => {
        if (!q) return true
        return [
          event.name,
          event.location,
          event.city,
          event.region,
          event.organizer_name,
          event.details,
          event.event_type,
          event.mode,
          event.discipline,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) => {
        if (timeFilter === "past") return startTs(b) - startTs(a)
        return startTs(a) - startTs(b)
      })
  }, [events, sourceFilter, timeFilter, query])

  const internalCount = events.filter((event) => event.source === "internal").length
  const externalCount = events.filter((event) => event.source === "external").length

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.56]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.40),rgba(4,6,9,.74)),radial-gradient(circle_at_8%_0%,rgba(249,115,22,.14),transparent_28%),radial-gradient(circle_at_100%_80%,rgba(14,165,233,.12),transparent_32%)]" />

      <div className="relative mx-auto min-h-[100svh] max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TerminalLink
              href="/terminal/menu"
              label="Hauptmenü wird geöffnet"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]"
            >
              <ArrowLeft className="h-5 w-5" />
            </TerminalLink>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.34em] text-cyan-200/80">
                EMD Club Terminal
              </div>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                Veranstaltungen
              </h1>
            </div>
          </div>
        </header>

        <section className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[26px] border border-white/10 bg-black/25 p-4 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Gesamt</div>
            <div className="mt-2 text-3xl font-black">{events.length}</div>
          </div>
          <div className="rounded-[26px] border border-orange-400/18 bg-orange-500/[0.06] p-4 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200/55">Intern</div>
            <div className="mt-2 text-3xl font-black text-orange-100">{internalCount}</div>
          </div>
          <div className="rounded-[26px] border border-cyan-300/18 bg-cyan-400/[0.06] p-4 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/55">Extern</div>
            <div className="mt-2 text-3xl font-black text-cyan-100">{externalCount}</div>
          </div>
        </section>

        <section className="mt-5 rounded-[30px] border border-white/[0.08] bg-black/24 p-4 backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {([
                ["all", "Alle"],
                ["internal", "Intern"],
                ["external", "Extern"],
              ] as Array<[SourceFilter, string]>).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSourceFilter(key)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                    sourceFilter === key
                      ? key === "external"
                        ? "border-cyan-300/35 bg-cyan-400/16 text-cyan-100"
                        : "border-orange-400/35 bg-orange-500 text-white"
                      : "border-white/10 bg-white/[0.035] text-white/55"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Veranstaltung suchen…"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 pl-11 pr-4 text-sm font-semibold text-white outline-none placeholder:text-white/25"
                />
              </div>

              <div className="flex gap-2">
                {([
                  ["upcoming", "Anstehend"],
                  ["all", "Alle"],
                  ["past", "Vergangen"],
                ] as Array<[TimeFilter, string]>).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTimeFilter(key)}
                    className={`rounded-2xl border px-3 py-3 text-xs font-black ${
                      timeFilter === key
                        ? "border-white/20 bg-white/10 text-white"
                        : "border-white/[0.07] bg-white/[0.025] text-white/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="rounded-[32px] border border-white/[0.08] bg-black/28 p-12 text-center backdrop-blur-2xl">
              <div className="mx-auto h-1.5 w-52 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-300" />
              </div>
              <div className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-white/35">
                Veranstaltungen werden geladen
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-white/10 bg-black/20 p-12 text-center backdrop-blur-xl">
              <CalendarDays className="mx-auto h-12 w-12 text-white/18" />
              <div className="mt-4 text-xl font-black text-white/60">Keine Veranstaltungen gefunden</div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((event) => {
                const dart = dartLabel(event.discipline || event.mode)
                const cancelled = event.event_status === "cancelled"

                return (
                  <TerminalLink
                    key={`${event.source}-${event.id}`}
                    href={`/terminal/veranstaltungen/${event.source}/${event.id}`}
                    label={`${event.name} wird geöffnet`}
                    className="group block overflow-hidden rounded-[28px] border border-white/[0.09] bg-black/28 text-left backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-white/20"
                  >
                    <div className="relative h-64 overflow-hidden bg-black/55">
                      {event.photo_url && !event.photo_url.toLowerCase().endsWith(".pdf") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={event.photo_url} alt={event.name} className="h-full w-full object-contain p-2 transition duration-500 group-hover:scale-[1.02]" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <CalendarDays className="h-14 w-14 text-white/14" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />

                      <div className="absolute left-4 top-4 flex gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                          event.source === "internal"
                            ? "border-orange-300/25 bg-orange-500/18 text-orange-100"
                            : "border-cyan-200/25 bg-cyan-400/16 text-cyan-100"
                        }`}>
                          {event.source === "internal" ? "Intern" : "Extern"}
                        </span>
                        {cancelled && (
                          <span className="rounded-full border border-rose-300/25 bg-rose-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-rose-100">
                            Abgesagt
                          </span>
                        )}
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/50">
                          <TypeIcon value={event.event_type} />
                          {eventTypeLabel(event.event_type)}
                        </div>
                        <h2 className="mt-2 line-clamp-2 text-xl font-black leading-tight">{event.name}</h2>
                      </div>
                    </div>

                    <div className="space-y-2.5 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white/65">
                        <CalendarDays className="h-4 w-4 text-orange-300" />
                        {dateRange(event)}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-white/55">
                        <Clock className="h-4 w-4 text-cyan-200" />
                        {event.event_time ? `${event.event_time.slice(0, 5)} Uhr` : "Uhrzeit offen"}
                      </div>
                      <div className="flex items-start gap-2 text-sm font-semibold text-white/55">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
                        <span className="line-clamp-2">{locationText(event)}</span>
                      </div>

                      {dart && (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-xs font-bold text-white/55">
                          <DartIcon value={event.discipline || event.mode} />
                          {dart}
                        </div>
                      )}
                    </div>
                  </TerminalLink>
                )
              })}
            </div>
          )}
        </section>
      </div>

    </main>
  )
}
