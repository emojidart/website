"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowRight,
  CalendarDays,
  Coins,
  LockKeyhole,
  Medal,
  Trophy,
  Users,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type SeriesRow = {
  id: string
  name: string
  slug: string
  description: string | null
  image_path: string | null
  is_active: boolean
  access_type: "public" | "club_internal" | "club_external"
  startgeld: number | null
  series_fee: number | null
  qualification_requirement: number | null
  total_tournament_days: number | null
  result_counting_mode: "all" | "best_n" | null
  best_n_results: number | null
  registration_enabled: boolean | null
}

type EventRow = {
  id: string
  series_id: string
  start_at: string
  rescheduled_at: string | null
  is_rescheduled: boolean | null
  is_matchday: boolean | null
}

function money(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("de-AT", {
    style: "currency",
    currency: "EUR",
  })
}

function imageUrl(path: string | null) {
  if (!path) return "/terminal/hero-startscreen.png"
  return supabase.storage.from("tournament-photos").getPublicUrl(path).data.publicUrl
}

function effectiveDate(event: EventRow) {
  return event.is_rescheduled && event.rescheduled_at ? event.rescheduled_at : event.start_at
}

export default function TurnierserienPage() {
  const [series, setSeries] = useState<SeriesRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)

      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user

      let member = false
      if (user?.id) {
        const { data: clubPlayer } = await supabase
          .from("club_players")
          .select("id,is_active")
          .eq("auth_user_id", user.id)
          .eq("is_active", true)
          .maybeSingle()

        member = Boolean(clubPlayer?.id)
      }

      const { data: seriesData } = await supabase
        .from("dko_series")
        .select(
          "id,name,slug,description,image_path,is_active,access_type,startgeld,series_fee,qualification_requirement,total_tournament_days,result_counting_mode,best_n_results,registration_enabled",
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      const rows = ((seriesData || []) as SeriesRow[]).filter((row) => {
        if (row.access_type === "club_internal") return member
        return row.access_type === "public" || row.access_type === "club_external"
      })

      const ids = rows.map((row) => row.id)
      let eventRows: EventRow[] = []

      if (ids.length > 0) {
        const { data: eventData } = await supabase
          .from("dko_series_events")
          .select("id,series_id,start_at,rescheduled_at,is_rescheduled,is_matchday")
          .in("series_id", ids)
          .eq("is_matchday", true)
          .order("start_at", { ascending: true })

        eventRows = (eventData || []) as EventRow[]
      }

      if (!active) return
      setIsMember(member)
      setSeries(rows)
      setEvents(eventRows)
      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const nextBySeries = useMemo(() => {
    const now = Date.now()
    const map = new Map<string, EventRow>()

    for (const event of events) {
      const ts = new Date(effectiveDate(event)).getTime()
      if (!Number.isFinite(ts) || ts < now) continue

      const current = map.get(event.series_id)
      if (!current || ts < new Date(effectiveDate(current)).getTime()) {
        map.set(event.series_id, event)
      }
    }

    return map
  }, [events])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] pb-24 text-white">
      <Header
        variant="app"
        title="Turnierserien"
        subtitle="Serien & Spieltage"
        backHref="/turniere"
      />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[64%_50%] bg-no-repeat opacity-[0.30]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.70),rgba(3,5,9,.94)_46%,rgba(2,4,7,.985))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(139,92,246,.14),transparent_27%),radial-gradient(circle_at_86%_26%,rgba(249,115,22,.11),transparent_28%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-10 pt-20 sm:px-5 sm:pt-24 lg:px-7 xl:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-black/35 p-5 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -left-16 bottom-[-70px] h-48 w-48 rounded-full bg-violet-500/15 blur-[70px]" />
          <div className="pointer-events-none absolute right-[12%] top-[-80px] h-52 w-52 rounded-full bg-orange-500/12 blur-[75px]" />

          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100/70">
              <Trophy className="h-3.5 w-3.5" />
              Turnierserien
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">
              Serien, Spieltage & Wertungen
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/48 sm:text-base">
              Alle aktuellen Serien mit Terminen, Gebühren, Wertung und Teilnahmebedingungen.
            </p>
          </div>
        </section>

        <section className="mt-5">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-[340px] animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]"
                />
              ))}
            </div>
          ) : series.length === 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-black/35 px-5 py-14 text-center backdrop-blur-xl">
              <Trophy className="mx-auto h-8 w-8 text-white/25" />
              <div className="mt-3 text-lg font-black">Aktuell keine Turnierserie verfügbar</div>
              <p className="mt-1 text-sm text-white/40">
                Neue Serien erscheinen hier automatisch.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {series.map((item) => {
                const nextEvent = nextBySeries.get(item.id)
                const nextIso = nextEvent ? effectiveDate(nextEvent) : null
                const internal = item.access_type === "club_internal"

                return (
                  <Link
                    key={item.id}
                    href={`/turniere/serien/${item.slug}`}
                    className="group block"
                  >
                    <article className="relative min-h-[360px] overflow-hidden rounded-[30px] border border-white/10 bg-black/35 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-violet-300/25">
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-[0.66] transition duration-700 group-hover:scale-[1.035]"
                        style={{ backgroundImage: `url('${imageUrl(item.image_path)}')` }}
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.20),rgba(3,5,8,.68)_43%,rgba(3,5,8,.97))]" />

                      <div className="relative flex min-h-[360px] flex-col justify-between p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-violet-300/20 bg-violet-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-violet-100">
                              Serie
                            </span>
                            {internal ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-orange-300/20 bg-orange-500/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-orange-100">
                                <LockKeyhole className="h-3 w-3" />
                                Intern
                              </span>
                            ) : (
                              <span className="rounded-full border border-emerald-300/20 bg-emerald-500/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100">
                                Öffentlich
                              </span>
                            )}
                          </div>

                          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/65 transition group-hover:border-violet-300/30 group-hover:bg-violet-500 group-hover:text-white">
                            <ArrowRight className="h-5 w-5" />
                          </span>
                        </div>

                        <div>
                          <h2 className="text-2xl font-black tracking-[-0.035em] text-white">
                            {item.name}
                          </h2>

                          {item.description ? (
                            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-white/45">
                              {item.description}
                            </p>
                          ) : null}

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
                              <Coins className="h-4 w-4 text-orange-200" />
                              <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/30">
                                Startgeld
                              </div>
                              <div className="mt-0.5 font-black text-white/85">
                                {money(item.startgeld)}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
                              <Users className="h-4 w-4 text-sky-200" />
                              <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/30">
                                Mindestantritte
                              </div>
                              <div className="mt-0.5 font-black text-white/85">
                                {item.qualification_requirement || "Keine"}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 rounded-2xl border border-white/10 bg-black/35 p-3">
                            <div className="flex items-center gap-2 text-white/75">
                              <CalendarDays className="h-4 w-4 text-violet-200" />
                              <span className="text-xs font-black uppercase tracking-[0.10em] text-white/35">
                                Nächster Spieltag
                              </span>
                            </div>
                            <div className="mt-1.5 font-black text-white/90">
                              {nextIso
                                ? new Date(nextIso).toLocaleString("de-AT", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Noch kein Termin"}
                            </div>
                          </div>

                          {item.result_counting_mode === "best_n" && item.best_n_results ? (
                            <div className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-white/45">
                              <Medal className="h-4 w-4 text-amber-200" />
                              Beste {item.best_n_results} Ergebnisse zählen
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <MobileBottomNav />
    </div>
  )
}
