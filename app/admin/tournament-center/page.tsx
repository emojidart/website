"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  Target,
  Trophy,
} from "lucide-react"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { TournamentAdminNav } from "@/components/admin/tournaments/tournament-admin-nav"

type SeriesRow = {
  id: string
  name: string
  slug: string | null
  is_active: boolean
  series_type: string | null
  startgeld: number | null
  total_tournament_days: number | null
}

type EventRow = {
  id: string
  series_id: string
  title: string | null
  start_at: string
  is_rescheduled: boolean
  rescheduled_at: string | null
  location: string | null
  is_matchday: boolean
  registration_cutoff_minutes: number | null
}

function effectiveIso(event: EventRow) {
  return event.is_rescheduled && event.rescheduled_at ? event.rescheduled_at : event.start_at
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
}

function isMembersCup(series: SeriesRow | undefined) {
  if (!series) return false
  if (series.series_type === "members_cup") return true
  const normalized = series.name.toLowerCase()
  return normalized.includes("members") && normalized.includes("champion")
}

export default function TournamentCenterPage() {
  const router = useRouter()
  const { user, isAdmin, loading: authLoading, adminLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [series, setSeries] = useState<SeriesRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState("ALL")

  const load = async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true)
    setError(null)

    try {
      const [seriesResult, eventsResult] = await Promise.all([
        supabase
          .from("dko_series")
          .select("id,name,slug,is_active,series_type,startgeld,total_tournament_days")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("dko_series_events")
          .select("id,series_id,title,start_at,is_rescheduled,rescheduled_at,location,is_matchday,registration_cutoff_minutes")
          .order("start_at", { ascending: true }),
      ])

      if (seriesResult.error) throw seriesResult.error
      if (eventsResult.error) throw eventsResult.error

      const activeSeries = (seriesResult.data || []) as SeriesRow[]
      const activeIds = new Set(activeSeries.map((row) => row.id))
      setSeries(activeSeries)
      setEvents(((eventsResult.data || []) as EventRow[]).filter((event) => activeIds.has(event.series_id)))
    } catch (e: any) {
      console.error("Tournament center load error:", e)
      setError(e?.message || "Turnierdaten konnten nicht geladen werden.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (authLoading || adminLoading || !user || !isAdmin) return

    void load()

    const channel = supabase
      .channel("admin_tournament_center")
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series" }, () => void load(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series_events" }, () => void load(true))
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, adminLoading, user, isAdmin])

  const seriesById = useMemo(() => new Map(series.map((row) => [row.id, row])), [series])

  const futureEvents = useMemo(() => {
    const now = Date.now()
    return events
      .map((event) => ({ event, iso: effectiveIso(event), ts: new Date(effectiveIso(event)).getTime() }))
      .filter((entry) => Number.isFinite(entry.ts) && entry.ts >= now && entry.event.is_matchday)
      .sort((a, b) => a.ts - b.ts)
  }, [events])

  const visibleUpcoming = useMemo(() => {
    const filtered =
      activeFilter === "ALL" ? futureEvents : futureEvents.filter((entry) => entry.event.series_id === activeFilter)
    return filtered.slice(0, 12)
  }, [futureEvents, activeFilter])

  const todayKey = new Date().toLocaleDateString("sv-SE")
  const todayEvents = useMemo(
    () => futureEvents.filter((entry) => new Date(entry.iso).toLocaleDateString("sv-SE") === todayKey),
    [futureEvents, todayKey],
  )

  const openEvent = (event: EventRow) => {
    const parentSeries = seriesById.get(event.series_id)

    if (isMembersCup(parentSeries)) {
      router.push(
        `/admin/members-champion-cup/auslosung?seriesId=${encodeURIComponent(event.series_id)}&eventId=${encodeURIComponent(event.id)}`,
      )
      return
    }

    router.push(
      `/dko_tournament_registration?seriesId=${encodeURIComponent(event.series_id)}&eventId=${encodeURIComponent(event.id)}`,
    )
  }

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-[#f7f7f8]">
        <Header />
        <div className="h-12 sm:h-14" />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <Header />
      <TournamentAdminNav
        title="Übersicht"
        description="Alle aktuellen Turniere und Spieltage auf einen Blick."
      />

      <main className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-5 lg:px-8">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Turnierserien</div>
            <div className="mt-1 text-2xl font-black text-gray-950">{series.length}</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Heute</div>
            <div className="mt-1 text-2xl font-black text-gray-950">{todayEvents.length}</div>
            <div className="text-xs text-gray-500">Turniertage</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Kommend</div>
            <div className="mt-1 text-2xl font-black text-gray-950">{futureEvents.length}</div>
            <div className="text-xs text-gray-500">kommende Spieltage</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Nächster Termin</div>
                <div className="mt-1 truncate text-sm font-black text-gray-950">
                  {futureEvents[0] ? formatDate(futureEvents[0].iso) : "—"}
                </div>
                <div className="text-xs text-gray-500">
                  {futureEvents[0] ? `${formatTime(futureEvents[0].iso)} Uhr` : "Keine Termine geplant"}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 rounded-xl"
                onClick={() => void load(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-3">
            <h2 className="text-lg font-black text-gray-950">Turnierserien</h2>
            <p className="text-sm text-gray-500">Wähle eine Turnierserie aus.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter("ALL")}
              className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                activeFilter === "ALL"
                  ? "border-orange-300 bg-orange-50 text-orange-700"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              Alle Serien
            </button>
            {series.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setActiveFilter(row.id)}
                className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                  activeFilter === row.id
                    ? "border-orange-300 bg-orange-50 text-orange-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-orange-200"
                }`}
              >
                {row.name}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-950">Nächste Spieltage</h2>
              <p className="text-sm text-gray-500">Öffne den gewünschten Spieltag und starte direkt.</p>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <div className="flex min-h-48 items-center justify-center rounded-3xl border border-gray-200 bg-white">
              <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
            </div>
          ) : visibleUpcoming.length === 0 ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <CalendarDays className="mx-auto h-8 w-8 text-gray-300" />
              <div className="mt-3 font-black text-gray-950">Keine kommenden Spieltage</div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleUpcoming.map(({ event, iso }) => {
                const parentSeries = seriesById.get(event.series_id)
                const membersCup = isMembersCup(parentSeries)

                return (
                  <article key={event.id} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 bg-gray-50/70 p-4">
                      <div className="text-xs font-black uppercase tracking-wide text-orange-600">
                        {parentSeries?.name || "Turnierserie"}
                      </div>
                      <h3 className="mt-1 text-lg font-black text-gray-950">{event.title?.trim() || "Turniertag"}</h3>
                    </div>
                    <div className="space-y-3 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <CalendarDays className="h-4 w-4 text-orange-600" />
                        {formatDate(iso)}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Clock3 className="h-4 w-4 text-orange-600" />
                        {formatTime(iso)} Uhr
                      </div>
                      {event.location ? (
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <MapPin className="h-4 w-4 text-orange-600" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      ) : null}
                      <Button
                        className="h-11 w-full rounded-xl bg-orange-600 font-black text-white hover:bg-orange-700"
                        onClick={() => openEvent(event)}
                      >
                        {membersCup ? "Auslosung öffnen" : "Turniertag öffnen"}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
