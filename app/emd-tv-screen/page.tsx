"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, Clock3, MapPin, Sparkles, Trophy } from "lucide-react"
import { supabase } from "@/lib/supabase"
import LineupDisplay from "@/components/emd-tv/lineup-display"

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


type DachEventRow = {
  id: string
  name: string
  event_type: string | null
  start_date: string
  end_date: string | null
  event_time: string | null
  location: string | null
  city: string | null
  country_code: string | null
  photo_url: string | null
  discipline: string | null
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
  | { kind: "tournaments"; offset: number }
  | { kind: "series" }
  | { kind: "veranstaltungen" }
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

function tvImageUrl(src: string | null, width = 1280, height = 900, quality = 68, resize: "cover" | "contain" = "cover") {
  if (!src) return null
  try {
    const u = new URL(src)
    const marker = "/storage/v1/object/public/"
    if (!u.pathname.includes(marker)) return src
    u.pathname = u.pathname.replace(marker, "/storage/v1/render/image/public/")
    u.searchParams.set("width", String(width))
    u.searchParams.set("height", String(height))
    u.searchParams.set("quality", String(quality))
    u.searchParams.set("resize", resize)
    return u.toString()
  } catch {
    return src
  }
}

function tournamentStart(row: TournamentRow) {
  const time = row.time && /^\d{2}:\d{2}/.test(row.time) ? row.time.slice(0, 5) : "23:59"
  return new Date(`${row.date}T${time}:00`).getTime()
}

export default function EmdTvScreenPage() {
  const [loaded, setLoaded] = useState(false)
  const [assetsReady, setAssetsReady] = useState(false)
  const preloadedKeyRef = useRef("")
  const preloadedImagesRef = useRef<HTMLImageElement[]>([])
  const [now, setNow] = useState(() => new Date())
  const [active, setActive] = useState<ActiveStatus>({ dko: false, kratzer: false })
  const [tournaments, setTournaments] = useState<TournamentRow[]>([])
  const [seriesEvents, setSeriesEvents] = useState<SeriesEvent[]>([])
  const [dachEvents, setDachEvents] = useState<DachEventRow[]>([])
  const [lineups, setLineups] = useState<LineupSlide[]>([])
  const [slideIndex, setSlideIndex] = useState(0)

  const loadData = useCallback(async () => {
    const today = todayIso()

    const [dkoStatusRes, kratzerStatusRes, tournamentRes, seriesRes, dachEventsRes, headersRes] = await Promise.all([
      supabase.from("tournaments_status").select("tournament_id").eq("status", "active").limit(1),
      supabase.from("kratzer_tournaments").select("id").eq("status", "running").order("created_at", { ascending: false }).limit(1),
      supabase.from("tournaments").select("id,name,date,time,location,mode,photo_url").gte("date", today).order("date", { ascending: true }).order("time", { ascending: true }).limit(12),
      supabase.from("dko_series").select("id,name,slug,image_path").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("dach_events").select("id,name,event_type,start_date,end_date,event_time,location,city,country_code,photo_url,discipline").eq("event_status", "approved").gte("start_date", today).order("start_date", { ascending: true }).order("event_time", { ascending: true }).limit(10),
      supabase.from("match_lineup_headers").select("match_id,team_id,status,current_version,confirmed_version").eq("status", "confirmed"),
    ])

    setActive({ dko: Boolean(dkoStatusRes.data?.length), kratzer: Boolean(kratzerStatusRes.data?.length) })

    if (!tournamentRes.error) {
      setTournaments(((tournamentRes.data || []) as TournamentRow[]).filter((item) => Number.isFinite(tournamentStart(item))))
    }

    if (!dachEventsRes.error) {
      setDachEvents((dachEventsRes.data || []) as DachEventRow[])
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
      .on("postgres_changes", { event: "*", schema: "public", table: "dach_events" }, () => void loadData())
      .subscribe()

    return () => {
      window.clearInterval(refreshInterval)
      window.clearInterval(clockInterval)
      void supabase.removeChannel(channel)
    }
  }, [loadData])

  const tournamentCards = useMemo<EventCard[]>(() => {
    return tournaments
      .map((t) => ({
        key: `t-${t.id}`,
        kind: "tournament" as const,
        title: t.name,
        eyebrow: "Turnier",
        startsAt: tournamentStart(t),
        dateText: formatDate(`${t.date}T12:00:00`),
        timeText: formatTime(t.time),
        location: t.location,
        detail: t.mode,
        imageUrl: t.photo_url,
      }))
      .sort((a, b) => a.startsAt - b.startsAt)
      .slice(0, 12)
  }, [tournaments])

  const slides = useMemo<Slide[]>(() => {
    const next: Slide[] = []
    if (tournamentCards.length) {
      for (let offset = 0; offset < tournamentCards.length; offset += 4) next.push({ kind: "tournaments", offset })
    }
    if (seriesEvents.length) next.push({ kind: "series" })
    if (dachEvents.length) next.push({ kind: "veranstaltungen" })
    lineups.forEach((lineup) => next.push({ kind: "lineup", lineup }))
    return next.length ? next : [{ kind: "tournaments", offset: 0 }]
  }, [dachEvents.length, lineups, seriesEvents.length, tournamentCards.length])

  const currentSlide = slides[slideIndex] || slides[0]

  useEffect(() => {
    setSlideIndex((i) => Math.min(i, Math.max(0, slides.length - 1)))
  }, [slides.length])

  useEffect(() => {
    if (!assetsReady || active.dko || active.kratzer || slides.length <= 1 || currentSlide?.kind === "lineup") return
    const timer = window.setTimeout(() => setSlideIndex((i) => (i + 1) % slides.length), NORMAL_SLIDE_MS)
    return () => window.clearTimeout(timer)
  }, [assetsReady, active.dko, active.kratzer, currentSlide?.kind, slideIndex, slides.length])

  const advanceSlide = useCallback(() => {
    setSlideIndex((i) => (i + 1) % slides.length)
  }, [slides.length])

  async function tryFullscreen() {
    if (document.fullscreenElement) return
    try { await document.documentElement.requestFullscreen?.() } catch {}
  }

  const visibleEvents = currentSlide?.kind === "tournaments" ? tournamentCards.slice(currentSlide.offset, currentSlide.offset + 4) : []
  const hero = visibleEvents[0] || tournamentCards[0]
  const rest = visibleEvents.slice(1, 4)
  const seriesPreview = seriesEvents.slice(0, 4)
  const veranstaltungenPreview = dachEvents.slice(0, 4)

  const preloadImageUrls = useMemo(() => {
    // TV: only preload the images that are actually shown on the first series/event slides.
    // Loading dozens of large originals in parallel is what made Fire TV/Silk paint them one after another.
    const urls = new Set<string>()
    seriesEvents.slice(0, 4).forEach((item) => {
      const url = tvImageUrl(seriesPhoto(item.imagePath), 900, 1100, 66, "cover")
      if (url) urls.add(url)
    })
    dachEvents.slice(0, 4).forEach((event) => {
      if (event.photo_url && !event.photo_url.toLowerCase().endsWith(".pdf")) {
        const url = tvImageUrl(event.photo_url, 900, 1100, 66, "cover")
        if (url) urls.add(url)
      }
    })
    return Array.from(urls)
  }, [dachEvents, seriesEvents])

  const preloadKey = useMemo(() => preloadImageUrls.slice().sort().join("|"), [preloadImageUrls])

  useEffect(() => {
    let cancelled = false

    async function warmImages() {
      if (!loaded) return
      if (!preloadImageUrls.length) {
        preloadedImagesRef.current = []
        setAssetsReady(true)
        return
      }
      if (preloadedKeyRef.current === preloadKey && preloadedImagesRef.current.length) {
        setAssetsReady(true)
        return
      }

      setAssetsReady(false)

      // Keep the decoded Image objects alive. This is important on low-memory TV browsers:
      // otherwise Silk may throw away the decoded bitmap and visibly rebuild it line by line.
      const images = preloadImageUrls.map((src) => {
        const img = new Image()
        img.decoding = "sync"
        img.loading = "eager"
        img.fetchPriority = "high"
        img.src = src
        return img
      })

      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              const finish = async () => {
                try { await img.decode?.() } catch {}
                resolve()
              }
              if (img.complete) void finish()
              else {
                img.onload = () => void finish()
                img.onerror = () => resolve()
              }
            }),
        ),
      )

      if (!cancelled) {
        preloadedImagesRef.current = images
        preloadedKeyRef.current = preloadKey
        setAssetsReady(true)
      }
    }

    void warmImages()
    return () => { cancelled = true }
  }, [loaded, preloadImageUrls, preloadKey])

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#030303] text-white" onClick={tryFullscreen}>
      <div className="absolute inset-x-0 top-0 z-[80] flex h-[72px] items-center justify-between border-b border-white/[.06] bg-black/90 px-[3.2vw] shadow-[0_8px_30px_rgba(0,0,0,.35)]">
        <div className="flex items-center gap-4">
          <div className="text-[clamp(1.15rem,1.55vw,1.9rem)] font-black tracking-[-.055em]">EMD <span className="text-orange-400">TV</span></div>
          <div className="h-6 w-px bg-white/10" />
          <div className="text-[clamp(.58rem,.72vw,.78rem)] font-black uppercase tracking-[.25em] text-white/35">Emoji Darts · Salzburg</div>
        </div>
        <div className="flex items-center gap-5 text-right">
          <div className="text-[clamp(.58rem,.72vw,.78rem)] font-bold uppercase tracking-[.16em] text-white/28">{formatLongDate(now)}</div>
          <div className="text-[clamp(1.35rem,1.9vw,2.2rem)] font-black tabular-nums tracking-[-.05em]">{new Intl.DateTimeFormat("de-AT", { hour: "2-digit", minute: "2-digit" }).format(now)}</div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 top-[72px] overflow-hidden">
        {active.dko || active.kratzer ? (
          <iframe src="/beamer" title="EMD TV Live" className="h-full w-full border-0 bg-black" allow="autoplay; fullscreen" allowFullScreen />
        ) : currentSlide?.kind === "lineup" ? (
          <LineupDisplay key={`${currentSlide.lineup.matchId}-${currentSlide.lineup.teamId}`} matchId={currentSlide.lineup.matchId} teamId={currentSlide.lineup.teamId} onComplete={advanceSlide} />
        ) : (
          <>
      <div className="absolute inset-0 bg-[url('/terminal/hero-startscreen.png')] bg-cover bg-center opacity-[.32]" />
      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(0,0,0,.97)_0%,rgba(4,4,4,.88)_45%,rgba(8,5,2,.72)_100%)]" />
      <div className="absolute -left-[12vw] top-[5vh] h-[38vw] w-[38vw] rounded-full bg-orange-500/[.10] blur-[9vw]" />
      <div className="absolute right-[-10vw] top-[-20vh] h-[38vw] w-[38vw] rounded-full bg-orange-300/[.06] blur-[8vw]" />
      <div className="absolute inset-x-0 bottom-0 h-[28vh] bg-gradient-to-t from-black to-transparent" />

      <div className="relative z-10 flex h-full flex-col px-[4.2vw] py-[4vh]">
        {!loaded || !assetsReady ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-[clamp(2.4rem,4.7vw,5.6rem)] font-black tracking-[-.06em] text-white/12">EMD <span className="text-orange-400/25">TV</span></div>
          </div>
        ) : currentSlide?.kind === "veranstaltungen" ? (
          <section className="flex flex-1 flex-col justify-center pt-[1vh]">
            <div className="mb-[3.3vh] flex items-end justify-between gap-8">
              <div>
                <div className="text-[clamp(.7rem,.9vw,.95rem)] font-black uppercase tracking-[.38em] text-orange-300/75">Veranstaltungen</div>
                <h1 className="mt-2 text-[clamp(3rem,5.5vw,6.4rem)] font-black leading-[.88] tracking-[-.07em]">DAS LÄUFT <span className="text-orange-400">ALS NÄCHSTES</span></h1>
              </div>
              <Sparkles className="mb-2 h-[3.2vw] w-[3.2vw] text-orange-300/40" />
            </div>

            <div className="grid grid-cols-4 gap-[1.25vw]">
              {veranstaltungenPreview.map((event, index) => {
                const flyerIsImage = Boolean(event.photo_url && !event.photo_url.toLowerCase().endsWith(".pdf"))
                const place = [event.location, event.city].filter(Boolean).join(" · ")
                return (
                  <article key={event.id} className="relative h-[48vh] overflow-hidden rounded-[2vw] border border-white/[.10] bg-[#090909] shadow-[0_35px_100px_rgba(0,0,0,.55)]">
                    <img
                      src={flyerIsImage ? (tvImageUrl(event.photo_url!, 900, 1100, 66, "cover") || event.photo_url!) : "/terminal/hero-startscreen.png"}
                      onError={(e) => {
                        if (flyerIsImage && e.currentTarget.dataset.fallback !== "1") {
                          e.currentTarget.dataset.fallback = "1"
                          e.currentTarget.src = event.photo_url!
                        }
                      }}
                      alt=""
                      loading="eager"
                      decoding="sync"
                      className="absolute inset-0 h-full w-full object-cover object-center opacity-65"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,.30)_34%,rgba(0,0,0,.97)_100%)]" />
                    <div className="absolute left-[1.35vw] top-[1.35vw] rounded-full border border-orange-300/20 bg-black/55 px-[.8vw] py-[.45vw] text-[clamp(.55rem,.68vw,.72rem)] font-black uppercase tracking-[.17em] text-orange-200 backdrop-blur-md">
                      {event.event_type || "Event"}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-[1.55vw]">
                      <div className="text-[clamp(.58rem,.7vw,.75rem)] font-black uppercase tracking-[.18em] text-white/38">Veranstaltung {String(index + 1).padStart(2, "0")}</div>
                      <h2 className="mt-2 line-clamp-2 text-[clamp(1.35rem,2.05vw,2.55rem)] font-black leading-[.95] tracking-[-.045em]">{event.name}</h2>
                      <div className="mt-5 flex flex-col gap-2 text-[clamp(.74rem,.92vw,1rem)] font-bold text-white/58">
                        <span className="flex items-center gap-2"><CalendarDays className="h-[1.05em] w-[1.05em] text-orange-300" />{formatDate(`${event.start_date}T12:00:00`)}</span>
                        {event.event_time ? <span className="flex items-center gap-2"><Clock3 className="h-[1.05em] w-[1.05em] text-orange-300" />{formatTime(event.event_time)}</span> : null}
                        {place ? <span className="flex items-center gap-2 truncate"><MapPin className="h-[1.05em] w-[1.05em] shrink-0 text-orange-300" />{place}</span> : null}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ) : currentSlide?.kind === "series" ? (
          <section className="flex flex-1 flex-col justify-center pt-[1vh]">
            <div className="mb-[3.6vh]">
              <div className="text-[clamp(.7rem,.9vw,.95rem)] font-black uppercase tracking-[.38em] text-orange-300/75">Turnierserien</div>
              <h1 className="mt-2 text-[clamp(3rem,5.8vw,6.8rem)] font-black leading-[.88] tracking-[-.07em]">NÄCHSTE <span className="text-orange-400">SPIELTAGE</span></h1>
            </div>
            <div className="grid grid-cols-4 gap-[1.25vw]">
              {seriesPreview.map((item, index) => (
                <article key={item.id} className="group relative h-[47vh] overflow-hidden rounded-[2vw] border border-white/[.10] bg-[#0a0a0a] shadow-[0_35px_100px_rgba(0,0,0,.55)]">
                  <img
                    src={tvImageUrl(seriesPhoto(item.imagePath), 900, 1100, 66, "cover") || seriesPhoto(item.imagePath) || "/terminal/hero-startscreen.png"}
                    onError={(e) => {
                      const original = seriesPhoto(item.imagePath)
                      if (original && e.currentTarget.dataset.fallback !== "1") {
                        e.currentTarget.dataset.fallback = "1"
                        e.currentTarget.src = original
                      }
                    }}
                    alt=""
                    loading="eager"
                    decoding="sync"
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover object-center opacity-55"
                  />
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
        ) : currentSlide?.kind === "tournaments" && hero ? (
          <section className="grid flex-1 grid-cols-[1.55fr_.85fr] items-center gap-[3vw] pt-[1vh]">
            <div className="min-w-0">
              <div className="mb-[2vh] flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,.9)]" />
                <span className="text-[clamp(.7rem,.9vw,.95rem)] font-black uppercase tracking-[.36em] text-white/46">Nächste Turniere</span>
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

        <div className="flex items-center justify-end pb-[.5vh] pt-[2vh]">
          <div className="flex items-center gap-2">
            {slides.map((slide, index) => <span key={`${slide.kind}-${index}`} className={`h-[4px] rounded-full transition-all duration-700 ${index === slideIndex ? "w-12 bg-orange-400" : "w-3 bg-white/12"}`} />)}
          </div>
        </div>
      </div>
          </>
        )}
      </div>
    </main>
  )
}
