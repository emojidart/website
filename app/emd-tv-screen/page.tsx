"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarDays, Clock3, MapPin, Trophy } from "lucide-react"
import { supabase } from "@/lib/supabase"

const REFRESH_MS = 30000
const NORMAL_SLIDE_MS = 14000

type TournamentRow = {
  id: string
  name: string
  date: string
  time: string | null
  location: string | null
  mode: string | null
  photo_url: string | null
}

type SeriesRow = {
  id: string
  name: string
  slug: string
  image_path: string | null
}

type SeriesEventRow = {
  id: string
  series_id: string
  title: string | null
  start_at: string
  rescheduled_at: string | null
  is_rescheduled: boolean | null
  is_matchday: boolean | null
  location: string | null
}

type LineupHeader = {
  match_id: string
  team_id: string
  status: string
  current_version: number | null
  confirmed_version: number | null
}

type MatchRow = {
  id: string
  match_date: string
  match_time: string | null
  status: string | null
  home_team_type: string | null
  away_team_type: string | null
  home_opponent_team_id: string | null
  away_opponent_team_id: string | null
  home_team?: { id: string; name: string } | null
  away_team?: { id: string; name: string } | null
}

type LineupSlide = {
  matchId: string
  teamId: string
  teamName: string
  startsAt: number
}

type SeriesEvent = {
  id: string
  seriesId: string
  seriesName: string
  title: string | null
  imagePath: string | null
  startsAt: string
  location: string | null
}

type EventCard = {
  key: string
  kind: "tournament" | "series"
  title: string
  eyebrow: string
  startsAt: number
  dateText: string
  timeText: string
  location: string | null
  detail: string | null
  imageUrl: string | null
}

type Slide =
  | { kind: "events"; offset: number }
  | { kind: "series" }
  | { kind: "lineup"; lineup: LineupSlide }

type ActiveStatus = { dko: boolean; kratzer: boolean }

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function effectiveEventDate(row: SeriesEventRow) {
  return row.is_rescheduled && row.rescheduled_at ? row.rescheduled_at : row.start_at
}

function formatDate(value: string | number | Date) {
  const d = new Date(value)
  return new Intl.DateTimeFormat("de-AT", { weekday: "short", day: "2-digit", month: "2-digit" }).format(d)
}

function formatLongDate(value: string | number | Date) {
  const d = new Date(value)
  return new Intl.DateTimeFormat("de-AT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(d)
}

function formatTime(value: string | number | Date | null | undefined) {
  if (!value) return ""
  if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) return `${value.slice(0, 5)} Uhr`
  const d = new Date(value)
  return `${new Intl.DateTimeFormat("de-AT", { hour: "2-digit", minute: "2-digit" }).format(d)} Uhr`
}

function seriesPhoto(path: string | null) {
  if (!path) return null
  return supabase.storage.from("tournament-photos").getPublicUrl(path).data.publicUrl
}

function tournamentStart(row: TournamentRow) {
  const time = row.time && /^\d{2}:\d{2}/.test(row.time) ? row.time.slice(0, 5) : "23:59"
  return new Date(`${row.date}T${time}:00`).getTime()
}

export default function EmdTvScreenPage() {
  const [loaded, setLoaded] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [active, setActive] = useState<ActiveStatus>({ dko: false, kratzer: false })
  const [tournaments, setTournaments] = useState<TournamentRow[]>([])
  const [seriesEvents, setSeriesEvents] = useState<SeriesEvent[]>([])
  const [lineups, setLineups] = useState<LineupSlide[]>([])
  const [slideIndex, setSlideIndex] = useState(0)

  const loadData = useCallback(async () => {
    const today = todayIso()

    const [dkoStatusRes, kratzerStatusRes, tournamentRes, seriesRes, headersRes] = await Promise.all([
      supabase.from("tournaments_status").select("tournament_id").eq("status", "active").limit(1),
      supabase.from("kratzer_tournaments").select("id").eq("status", "running").order("created_at", { ascending: false }).limit(1),
      supabase.from("tournaments").select("id,name,date,time,location,mode,photo_url").gte("date", today).order("date", { ascending: true }).order("time", { ascending: true }).limit(12),
      supabase.from("dko_series").select("id,name,slug,image_path").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("match_lineup_headers").select("match_id,team_id,status,current_version,confirmed_version").eq("status", "confirmed"),
    ])

    setActive({ dko: Boolean(dkoStatusRes.data?.length), kratzer: Boolean(kratzerStatusRes.data?.length) })

    if (!tournamentRes.error) {
      setTournaments(((tournamentRes.data || []) as TournamentRow[]).filter((item) => Number.isFinite(tournamentStart(item))))
    }

    const activeSeries = (seriesRes.data || []) as SeriesRow[]
    if (!seriesRes.error && activeSeries.length) {
      const ids = activeSeries.map((item) => item.id)
      const { data: eventData, error: eventError } = await supabase
        .from("dko_series_events")
        .select("id,series_id,title,start_at,rescheduled_at,is_rescheduled,is_matchday,location")
        .in("series_id", ids)
        .eq("is_matchday", true)
        .order("start_at", { ascending: true })

      if (!eventError) {
        const seriesMap = new Map(activeSeries.map((s) => [s.id, s]))
        const nowMs = Date.now()
        const upcoming = ((eventData || []) as SeriesEventRow[])
          .map((event) => {
            const series = seriesMap.get(event.series_id)
            if (!series) return null
            const startsAt = effectiveEventDate(event)
            const ts = new Date(startsAt).getTime()
            if (!Number.isFinite(ts) || ts < nowMs) return null
            return {
              id: event.id,
              seriesId: series.id,
              seriesName: series.name,
              title: event.title,
              imagePath: series.image_path,
              startsAt,
              location: event.location,
            }
          })
          .filter(Boolean)
          .sort((a, b) => new Date(a!.startsAt).getTime() - new Date(b!.startsAt).getTime())
          .slice(0, 12) as SeriesEvent[]
        setSeriesEvents(upcoming)
      }
    } else {
      setSeriesEvents([])
    }

    const confirmed = ((headersRes.data || []) as LineupHeader[]).filter(
      (h) => h.current_version !== null && h.confirmed_version !== null && h.current_version === h.confirmed_version,
    )

    if (!headersRes.error && confirmed.length) {
      const matchIds = [...new Set(confirmed.map((x) => x.match_id))]
      const teamIds = [...new Set(confirmed.map((x) => x.team_id))]
      const [matchesRes, teamsRes] = await Promise.all([
        supabase.from("matches").select("id,match_date,match_time,status,home_team_type,away_team_type,home_opponent_team_id,away_opponent_team_id,home_team:teams!matches_home_team_id_fkey(id,name),away_team:teams!matches_away_team_id_fkey(id,name)").in("id", matchIds).gte("match_date", today).neq("status", "completed"),
        supabase.from("teams").select("id,name").in("id", teamIds),
      ])
      const matches = (matchesRes.data || []) as unknown as MatchRow[]
      const matchMap = new Map(matches.map((m) => [m.id, m]))
      const teams = new Map(((teamsRes.data || []) as Array<{ id: string; name: string }>).map((t) => [t.id, t.name]))
      const nowMs = Date.now()

      setLineups(
        confirmed
          .map((header) => {
            const match = matchMap.get(header.match_id)
            if (!match) return null
            const startsAt = new Date(`${match.match_date}T${match.match_time || "23:59:00"}`).getTime()
            if (!Number.isFinite(startsAt) || startsAt <= nowMs) return null
            return { matchId: header.match_id, teamId: header.team_id, teamName: teams.get(header.team_id) || "EMD", startsAt }
          })
          .filter(Boolean)
          .sort((a, b) => a!.startsAt - b!.startsAt)
          .slice(0, 3) as LineupSlide[],
      )
    } else {
      setLineups([])
    }

    setLoaded(true)
  }, [])

  useEffect(() => {
    void loadData()
    const refreshInterval = window.setInterval(() => void loadData(), REFRESH_MS)
    const clockInterval = window.setInterval(() => setNow(new Date()), 1000)
    const channel = supabase
      .channel("emd_tv_screen_updates_v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments_status" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "kratzer_tournaments" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_lineup_headers" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series_events" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => void loadData())
      .subscribe()

    return () => {
      window.clearInterval(refreshInterval)
      window.clearInterval(clockInterval)
      void supabase.removeChannel(channel)
    }
  }, [loadData])

  const events = useMemo<EventCard[]>(() => {
    const standalone: EventCard[] = tournaments.map((t) => ({
      key: `t-${t.id}`,
      kind: "tournament",
      title: t.name,
      eyebrow: "Turnier",
      startsAt: tournamentStart(t),
      dateText: formatDate(`${t.date}T12:00:00`),
      timeText: formatTime(t.time),
      location: t.location,
      detail: t.mode,
      imageUrl: t.photo_url,
    }))
    const series: EventCard[] = seriesEvents.map((e) => ({
      key: `s-${e.id}`,
      kind: "series",
      title: e.seriesName,
      eyebrow: e.title?.trim() || "Turnierserie",
      startsAt: new Date(e.startsAt).getTime(),
      dateText: formatDate(e.startsAt),
      timeText: formatTime(e.startsAt),
      location: e.location,
      detail: e.title,
      imageUrl: seriesPhoto(e.imagePath),
    }))
    return [...standalone, ...series].sort((a, b) => a.startsAt - b.startsAt).slice(0, 12)
  }, [tournaments, seriesEvents])

  const slides = useMemo<Slide[]>(() => {
    const next: Slide[] = []
    if (events.length) {
      for (let offset = 0; offset < events.length; offset += 4) next.push({ kind: "events", offset })
    }
    if (seriesEvents.length) next.push({ kind: "series" })
    lineups.forEach((lineup) => next.push({ kind: "lineup", lineup }))
    return next.length ? next : [{ kind: "events", offset: 0 }]
  }, [events.length, lineups, seriesEvents.length])

  const currentSlide = slides[slideIndex] || slides[0]

  useEffect(() => {
    setSlideIndex((i) => Math.min(i, Math.max(0, slides.length - 1)))
  }, [slides.length])

  useEffect(() => {
    if (active.dko || active.kratzer || slides.length <= 1 || currentSlide?.kind === "lineup") return
    const timer = window.setTimeout(() => setSlideIndex((i) => (i + 1) % slides.length), NORMAL_SLIDE_MS)
    return () => window.clearTimeout(timer)
  }, [active.dko, active.kratzer, currentSlide?.kind, slideIndex, slides.length])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== "EMD_TV_LINEUP_COMPLETE") return
      setSlideIndex((i) => (i + 1) % slides.length)
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [slides.length])

  useEffect(() => {
    if (currentSlide?.kind !== "lineup") return
    const fallback = window.setTimeout(() => setSlideIndex((i) => (i + 1) % slides.length), 65000)
    return () => window.clearTimeout(fallback)
  }, [currentSlide?.kind, currentSlide && "lineup" in currentSlide ? currentSlide.lineup?.matchId : "", slides.length])

  async function tryFullscreen() {
    if (document.fullscreenElement) return
    try { await document.documentElement.requestFullscreen?.() } catch {}
  }

  if (active.dko || active.kratzer) {
    return (
      <main className="fixed inset-0 overflow-hidden bg-black" onClick={tryFullscreen}>
        <iframe src="/beamer" title="EMD TV Live" className="h-full w-full border-0 bg-black" allow="autoplay; fullscreen" allowFullScreen />
      </main>
    )
  }

  if (currentSlide?.kind === "lineup") {
    return (
      <main className="fixed inset-0 overflow-hidden bg-black" onClick={tryFullscreen}>
        <iframe
          src={`/emd-tv/${currentSlide.lineup.matchId}?team_id=${encodeURIComponent(currentSlide.lineup.teamId)}&embedded=1`}
          title={`Starting Lineup ${currentSlide.lineup.teamName}`}
          className="h-full w-full border-0 bg-black"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </main>
    )
  }

  const visibleEvents = currentSlide?.kind === "events" ? events.slice(currentSlide.offset, currentSlide.offset + 4) : []
  const hero = visibleEvents[0] || events[0]
  const rest = visibleEvents.slice(1, 4)
  const seriesPreview = seriesEvents.slice(0, 4)

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#030303] text-white" onClick={tryFullscreen}>
      <div className="absolute inset-0 bg-[url('/terminal/hero-startscreen.png')] bg-cover bg-center opacity-[.32]" />
      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(0,0,0,.97)_0%,rgba(4,4,4,.88)_45%,rgba(8,5,2,.72)_100%)]" />
      <div className="absolute -left-[12vw] top-[5vh] h-[38vw] w-[38vw] rounded-full bg-orange-500/[.10] blur-[9vw]" />
      <div className="absolute right-[-10vw] top-[-20vh] h-[38vw] w-[38vw] rounded-full bg-orange-300/[.06] blur-[8vw]" />
      <div className="absolute inset-x-0 bottom-0 h-[28vh] bg-gradient-to-t from-black to-transparent" />

      <div className="relative z-10 flex h-full flex-col px-[4.2vw] py-[4vh]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[clamp(1.35rem,2.2vw,2.7rem)] font-black tracking-[-.055em]">EMD <span className="text-orange-400">TV</span></div>
            <div className="mt-1 h-[3px] w-[4.2rem] rounded-full bg-orange-400 shadow-[0_0_20px_rgba(251,146,60,.65)]" />
          </div>
          <div className="text-right">
            <div className="text-[clamp(2.2rem,4.4vw,5rem)] font-black tabular-nums leading-none tracking-[-.07em]">
              {new Intl.DateTimeFormat("de-AT", { hour: "2-digit", minute: "2-digit" }).format(now)}
            </div>
            <div className="mt-2 text-[clamp(.72rem,1vw,1rem)] font-bold uppercase tracking-[.18em] text-white/42">{formatLongDate(now)}</div>
          </div>
        </div>

        {!loaded ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 animate-pulse rounded-full bg-orange-400" /></div>
          </div>
        ) : currentSlide?.kind === "series" ? (
          <section className="flex flex-1 flex-col justify-center pt-[1vh]">
            <div className="mb-[3.6vh]">
              <div className="text-[clamp(.7rem,.9vw,.95rem)] font-black uppercase tracking-[.38em] text-orange-300/75">Turnierserien</div>
              <h1 className="mt-2 text-[clamp(3rem,5.8vw,6.8rem)] font-black leading-[.88] tracking-[-.07em]">NÄCHSTE <span className="text-orange-400">SPIELTAGE</span></h1>
            </div>
            <div className="grid grid-cols-4 gap-[1.25vw]">
              {seriesPreview.map((item, index) => (
                <article key={item.id} className="group relative h-[47vh] overflow-hidden rounded-[2vw] border border-white/[.10] bg-[#0a0a0a] shadow-[0_35px_100px_rgba(0,0,0,.55)]">
                  <div className="absolute inset-0 bg-cover bg-center opacity-55" style={{ backgroundImage: `url('${seriesPhoto(item.imagePath) || "/terminal/hero-startscreen.png"}')` }} />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.30)_35%,rgba(0,0,0,.96)_100%)]" />
                  <div className="absolute left-[1.4vw] top-[1.4vw] grid h-[3vw] min-h-10 w-[3vw] min-w-10 place-items-center rounded-full border border-white/15 bg-black/45 text-[.8vw] font-black text-white/65 backdrop-blur-md">{index + 1}</div>
                  <div className="absolute inset-x-0 bottom-0 p-[1.6vw]">
                    <div className="text-[clamp(.65rem,.8vw,.85rem)] font-black uppercase tracking-[.22em] text-orange-300/75">{item.title || "Spieltag"}</div>
                    <h2 className="mt-2 text-[clamp(1.4rem,2.25vw,2.8rem)] font-black leading-[.94] tracking-[-.05em]">{item.seriesName}</h2>
                    <div className="mt-5 flex flex-col gap-2 text-[clamp(.78rem,1vw,1.05rem)] font-bold text-white/55">
                      <span className="flex items-center gap-2"><CalendarDays className="h-[1.05em] w-[1.05em] text-orange-300" />{formatDate(item.startsAt)}</span>
                      <span className="flex items-center gap-2"><Clock3 className="h-[1.05em] w-[1.05em] text-orange-300" />{formatTime(item.startsAt)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : hero ? (
          <section className="grid flex-1 grid-cols-[1.55fr_.85fr] items-center gap-[3vw] pt-[1vh]">
            <div className="min-w-0">
              <div className="mb-[2vh] flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,.9)]" />
                <span className="text-[clamp(.7rem,.9vw,.95rem)] font-black uppercase tracking-[.36em] text-white/46">Als Nächstes im EMD</span>
              </div>
              <div className="text-[clamp(.75rem,1vw,1.05rem)] font-black uppercase tracking-[.26em] text-orange-300/80">{hero.eyebrow}</div>
              <h1 className="mt-[1.5vh] max-w-[14ch] text-[clamp(3.8rem,7.1vw,8.6rem)] font-black leading-[.82] tracking-[-.075em]">{hero.title}</h1>
              <div className="mt-[4vh] flex flex-wrap items-center gap-x-[2vw] gap-y-3 text-[clamp(1rem,1.35vw,1.45rem)] font-bold text-white/62">
                <span className="flex items-center gap-3"><CalendarDays className="h-[1.15em] w-[1.15em] text-orange-300" />{hero.dateText}</span>
                {hero.timeText ? <span className="flex items-center gap-3"><Clock3 className="h-[1.15em] w-[1.15em] text-orange-300" />{hero.timeText}</span> : null}
                {hero.location ? <span className="flex items-center gap-3"><MapPin className="h-[1.15em] w-[1.15em] text-orange-300" />{hero.location}</span> : null}
              </div>
            </div>

            <div className="flex flex-col gap-[1.25vh]">
              {rest.length ? rest.map((item, index) => (
                <article key={item.key} className="relative overflow-hidden rounded-[1.5vw] border border-white/[.09] bg-white/[.035] px-[1.4vw] py-[1.5vh] backdrop-blur-xl">
                  <div className="absolute inset-y-0 left-0 w-[3px] bg-orange-400/80" />
                  <div className="flex items-center gap-[1vw]">
                    <div className="text-[clamp(1.35rem,2vw,2.3rem)] font-black tabular-nums text-white/16">0{index + 2}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[clamp(.58rem,.72vw,.75rem)] font-black uppercase tracking-[.18em] text-orange-300/65">{item.eyebrow}</div>
                      <div className="mt-1 truncate text-[clamp(1.15rem,1.7vw,2rem)] font-black tracking-[-.035em]">{item.title}</div>
                      <div className="mt-1 text-[clamp(.72rem,.9vw,.95rem)] font-bold text-white/38">{item.dateText}{item.timeText ? ` · ${item.timeText}` : ""}</div>
                    </div>
                  </div>
                </article>
              )) : (
                <div className="grid min-h-[28vh] place-items-center rounded-[2vw] border border-white/[.08] bg-white/[.025]">
                  <Trophy className="h-12 w-12 text-orange-300/30" />
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="flex flex-1 items-center justify-center text-center">
            <div>
              <div className="mx-auto h-px w-40 bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />
              <div className="mt-7 text-[clamp(2.5rem,5vw,6rem)] font-black tracking-[-.065em]">EMD <span className="text-orange-400">TV</span></div>
            </div>
          </section>
        )}

        <div className="flex items-center justify-between pb-[.5vh] pt-[2vh]">
          <div className="text-[clamp(.55rem,.72vw,.75rem)] font-black uppercase tracking-[.28em] text-white/20">Emoji Darts · Salzburg</div>
          <div className="flex items-center gap-2">
            {slides.map((slide, index) => <span key={`${slide.kind}-${index}`} className={`h-[4px] rounded-full transition-all duration-700 ${index === slideIndex ? "w-12 bg-orange-400" : "w-3 bg-white/12"}`} />)}
          </div>
        </div>
      </div>
    </main>
  )
}
