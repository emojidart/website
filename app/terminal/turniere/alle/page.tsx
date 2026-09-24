"use client"

import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react"
import TerminalLink from "../../_components/TerminalLink"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const MEMBERS_CHAMPION_SERIES_ID = "baeef5fb-b386-4a75-a1f3-c56090a0ec76"

type Series = {
  id: string
  name: string
  slug: string
  is_active: boolean
  series_type: string
  startgeld: number
  qualification_requirement: number
  total_tournament_days: number
  halving_active: boolean
  halving_date: string | null
  division_active: boolean
  division_date: string | null
  created_at?: string | null
}

type SeriesEvent = {
  id: string
  series_id: string
  title: string | null
  start_at: string
  is_rescheduled: boolean | null
  rescheduled_at: string | null
  location: string | null
  is_matchday: boolean
  registration_cutoff_minutes: number | null
  notes: string | null
}

type SeriesWithEvents = Series & {
  events: SeriesEvent[]
}

function effectiveDate(event: SeriesEvent) {
  return event.is_rescheduled && event.rescheduled_at
    ? new Date(event.rescheduled_at)
    : new Date(event.start_at)
}

function dateDE(date: Date) {
  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function timeDE(date: Date) {
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function typeLabel(type: string) {
  if (type === "lion_cup") return "Lion Cup"
  if (type === "summer_special") return "Summer Special"
  if (type === "members_cup") return "Members Champions Cup"
  if (type === "challenge_division") return "Challenge Division"
  if (type === "buffalo_cup") return "Buffalo Steel Cup"
  return "Turnierserie"
}

export default function TerminalTournamentsPage() {
  const [loading, setLoading] = useState(true)
  const [seriesList, setSeriesList] = useState<SeriesWithEvents[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: seriesRows } = await supabase
        .from("dko_series")
        .select("id,name,slug,is_active,series_type,startgeld,qualification_requirement,total_tournament_days,halving_active,halving_date,division_active,division_date,created_at")
        .order("created_at", { ascending: false })

      const raw = (seriesRows || []) as Series[]

      // Alle aktiven Serien anzeigen.
      // Members Champions Cup zusätzlich absichern, da die bestehende App diese Serie
      // auch über ihre feste Serien-ID verwendet.
      const visible = raw.filter(
        (series) => series.is_active || series.id === MEMBERS_CHAMPION_SERIES_ID,
      )

      const withEvents: SeriesWithEvents[] = []

      for (const series of visible) {
        const { data: eventRows } = await supabase
          .from("dko_series_events")
          .select("id,series_id,title,start_at,is_rescheduled,rescheduled_at,location,is_matchday,registration_cutoff_minutes,notes")
          .eq("series_id", series.id)
          .order("start_at", { ascending: true })

        withEvents.push({
          ...series,
          events: (eventRows || []) as SeriesEvent[],
        })
      }

      withEvents.sort((a, b) => {
        const order: Record<string, number> = {
          lion_cup: 1,
          members_cup: 2,
          summer_special: 3,
          challenge_division: 4,
          buffalo_cup: 5,
        }
        return (order[a.series_type] || 99) - (order[b.series_type] || 99)
      })

      setSeriesList(withEvents)
      setLoading(false)
    }

    void load()
  }, [])

  const totalEvents = useMemo(
    () => seriesList.reduce((sum, series) => sum + series.events.length, 0),
    [seriesList],
  )

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.58]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.38),rgba(4,6,9,.74)),radial-gradient(circle_at_8%_0%,rgba(249,115,22,.16),transparent_28%),radial-gradient(circle_at_100%_80%,rgba(14,165,233,.12),transparent_32%)]" />

      <div className="relative mx-auto min-h-[100svh] max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">
        <header className="flex items-center gap-4">
          <TerminalLink
            href="/terminal/turniere"
            label="Turnierbereich wird geöffnet"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-5 w-5" />
          </TerminalLink>

          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300/90">
              Turniere & Cups
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
              Aktive Serien
            </h1>
            <div className="mt-1 text-sm font-semibold text-white/38">
              Alle aktuell laufenden Cups und Vereinsserien
            </div>
          </div>
        </header>

        {!loading && (
          <section className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[26px] border border-white/10 bg-black/25 p-4 backdrop-blur-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Aktive Serien</div>
              <div className="mt-2 text-3xl font-black">{seriesList.length}</div>
            </div>
            <div className="rounded-[26px] border border-orange-400/18 bg-orange-500/[0.06] p-4 backdrop-blur-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200/55">Termine gesamt</div>
              <div className="mt-2 text-3xl font-black text-orange-100">{totalEvents}</div>
            </div>
            <div className="rounded-[26px] border border-cyan-300/18 bg-cyan-400/[0.06] p-4 backdrop-blur-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/55">Wertungen</div>
              <div className="mt-2 text-xl font-black text-cyan-100">Live aus Supabase</div>
            </div>
          </section>
        )}

        <section className="mt-6">
          {loading ? (
            <div className="rounded-[32px] border border-white/[0.08] bg-black/28 p-12 text-center backdrop-blur-2xl">
              <div className="mx-auto h-1.5 w-52 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-orange-400" />
              </div>
              <div className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-white/35">
                Cups werden geladen
              </div>
            </div>
          ) : seriesList.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-white/10 bg-black/24 p-12 text-center backdrop-blur-xl">
              <Trophy className="mx-auto h-14 w-14 text-white/15" />
              <div className="mt-4 text-xl font-black text-white/60">Derzeit keine aktive Serie</div>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {seriesList.map((series) => {
                const sorted = [...series.events].sort(
                  (a, b) => effectiveDate(a).getTime() - effectiveDate(b).getTime(),
                )
                const now = Date.now()
                const nextEvent = sorted.find((event) => effectiveDate(event).getTime() >= now) || null
                const played = sorted.filter((event) => effectiveDate(event).getTime() < now).length
                const halftime = series.series_type === "lion_cup" && series.halving_active

                return (
                  <TerminalLink
                    key={series.id}
                    href={`/terminal/turniere/ranglisten?series=${series.id}`}
                    label={`${series.name} wird geöffnet`}
                    className="group relative block overflow-hidden rounded-[34px] border border-white/[0.09] bg-black/30 p-6 backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-orange-300/30"
                  >
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
                    <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-cyan-400/[0.08] blur-3xl" />

                    <div className="relative">
                      <div className="flex flex-wrap items-center gap-2">
                        {series.is_active && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Aktiv
                          </span>
                        )}

                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
                          {typeLabel(series.series_type)}
                        </span>

                        {halftime && (
                          <span className="rounded-full border border-cyan-200/25 bg-cyan-400/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                            Halftime aktiv
                          </span>
                        )}
                      </div>

                      <div className="mt-5 flex items-start gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-orange-400/22 bg-orange-500/10 text-orange-300">
                          <Trophy className="h-8 w-8" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="line-clamp-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                            {series.name}
                          </h2>
                          <div className="mt-1 text-sm font-semibold text-white/38">
                            {series.total_tournament_days || series.events.length} Spieltage · € {series.startgeld ?? 0} Startgeld
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">Termine</div>
                          <div className="mt-1 text-xl font-black">{series.events.length}</div>
                        </div>
                        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">Gespielt</div>
                          <div className="mt-1 text-xl font-black">{played}</div>
                        </div>
                        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">Quali</div>
                          <div className="mt-1 text-xl font-black">{series.qualification_requirement || "–"}</div>
                        </div>
                      </div>

                      {nextEvent ? (
                        <div className="mt-4 rounded-2xl border border-cyan-300/12 bg-cyan-400/[0.045] p-4">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/40">
                            <Sparkles className="h-4 w-4" /> Nächster Termin
                          </div>
                          <div className="mt-2 font-black">{nextEvent.title || "Spieltag"}</div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-white/45">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-4 w-4 text-orange-300" />
                              {dateDE(effectiveDate(nextEvent))}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-cyan-200" />
                              {timeDE(effectiveDate(nextEvent))} Uhr
                            </span>
                            {nextEvent.location && (
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {nextEvent.location}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 text-sm font-semibold text-white/30">
                          Kein weiterer Termin eingetragen.
                        </div>
                      )}

                      <div className="mt-5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                        Tabelle & Details öffnen <Target className="h-4 w-4" />
                      </div>
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
