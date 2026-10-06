"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, Clock3, MapPin, Play, Sparkles, Trophy, Tv2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import LineupDisplay from "@/components/emd-tv/lineup-display"
import BirthdayTv from "@/components/emd-tv/birthday-tv"
import TodayTv from "@/components/emd-tv/today-tv"
import {
  SportdartsLiveOverviewTv,
  SportdartsLiveTv,
  SportdartsResultsTv,
  SportdartsUpcomingTv,
  useSportdartsTvData,
} from "@/components/emd-tv/sportdarts-tv"

const REFRESH_MS = 15 * 60 * 1000
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

type LineupRow = {
  match_id: string
  team_id: string
  is_substitute: boolean
  club_players?: { photo_url: string | null } | null
}

type TeamRow = {
  id: string
  name: string
  dart_type: string | null
}

type MatchRow = {
  id: string
  match_date: string
  match_time: string | null
  status: string | null
  dart_type: string | null
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
  opponentName: string
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
  | { kind: "today" }
  | { kind: "tournaments"; offset: number }
  | { kind: "series" }
  | { kind: "veranstaltungen" }
  | { kind: "sportdarts-live-overview" }
  | { kind: "sportdarts-live"; index: number }
  | { kind: "league-upcoming" }
  | { kind: "league-results" }
  | { kind: "birthday"; player: BirthdayPlayer }
  | { kind: "lineup"; lineup: LineupSlide }

type BirthdayPlayer = {
  id: string
  name: string
  photo_url: string | null
  birthdate: string
}

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

function normalizeDartType(value: string | null | undefined) {
  const v = String(value ?? "").toLowerCase().replace(/[\s_-]+/g, "")
  if (v.includes("edart")) return "edart" as const
  if (v.includes("steel")) return "steeldart" as const
  return "" as const
}

function normalizeTeamName(value?: string | null) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
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
  const [lineupPhotoUrls, setLineupPhotoUrls] = useState<string[]>([])
  const [birthdays, setBirthdays] = useState<BirthdayPlayer[]>([])
  const [slideIndex, setSlideIndex] = useState(0)
  const [brandBreak, setBrandBreak] = useState(true)
  const sportdarts = useSportdartsTvData()
  const [testMode, setTestMode] = useState<"" | "live" | "today" | "results" | "all">("")

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("test")
    setTestMode(raw === "live" || raw === "today" || raw === "results" || raw === "all" ? raw : "")
  }, [])

  const testLiveEnabled = testMode === "live" || testMode === "all"
  const testTodayEnabled = testMode === "today" || testMode === "all"
  const testResultsEnabled = testMode === "results" || testMode === "all"

  const testLiveGame = useMemo(() => ({
    gameId: "emd-tv-test-live",
    division: "E-Dart Division 2",
    weekNumber: 7,
    homeTeam: "Emoj!'s 4",
    awayTeam: "Habidere Lady's",
    homeScore: 5,
    awayScore: 3,
    status: "started" as const,
  }), [])

  const tvLiveGames = useMemo(() => {
    if (!testLiveEnabled) return sportdarts.live
    return [testLiveGame, ...sportdarts.live.filter((game) => game.gameId !== testLiveGame.gameId)]
  }, [sportdarts.live, testLiveEnabled, testLiveGame])

  const testResultGame = useMemo(() => ({
    gameId: "emd-tv-test-result",
    weekNumber: 6,
    date: todayIso(),
    homeTeam: "Emoj!\'s 4",
    awayTeam: "Habidere Lady\'s",
    homeScore: 9,
    awayScore: 7,
    status: "completed" as const,
    divisionName: "E-Dart Division 2",
  }), [])

  const tvResults = useMemo(() => {
    if (!testResultsEnabled) return sportdarts.results
    return [testResultGame, ...sportdarts.results.filter((game) => game.gameId !== testResultGame.gameId)]
  }, [sportdarts.results, testResultsEnabled, testResultGame])

  const loadData = useCallback(async () => {
    const today = todayIso()

    const [dkoStatusRes, kratzerStatusRes, tournamentRes, seriesRes, dachEventsRes, headersRes, birthdaysRes] = await Promise.all([
      supabase.from("tournaments_status").select("tournament_id").eq("status", "active").limit(1),
      supabase.from("kratzer_tournaments").select("id").eq("status", "running").order("created_at", { ascending: false }).limit(1),
      supabase
        .from("central_tournament_events")
        .select("id,name:title,date:event_date,time:start_time,location,mode:selected_mode,status")
        .gte("event_date", today)
        .in("status", ["open", "ready", "started"])
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(12),
      supabase.from("dko_series").select("id,name,slug,image_path").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("dach_events").select("id,name,event_type,start_date,end_date,event_time,location,city,country_code,photo_url,discipline").eq("event_status", "approved").gte("start_date", today).order("start_date", { ascending: true }).order("event_time", { ascending: true }).limit(10),
      supabase.from("match_lineup_headers").select("match_id,team_id,status,current_version,confirmed_version").eq("status", "confirmed"),
      supabase.from("club_players").select("id,name,photo_url,birthdate").eq("is_active", true).not("birthdate", "is", null),
    ])

    setActive({ dko: Boolean(dkoStatusRes.data?.length), kratzer: Boolean(kratzerStatusRes.data?.length) })

    if (!birthdaysRes.error) {
      const now = new Date()
      const month = now.getMonth() + 1
      const day = now.getDate()
      const todaysBirthdays = ((birthdaysRes.data || []) as BirthdayPlayer[])
        .filter((player) => {
          if (!player.birthdate) return false
          const parts = player.birthdate.split("-")
          return Number(parts[1]) === month && Number(parts[2]) === day
        })
        .sort((a, b) => a.name.localeCompare(b.name, "de"))
      setBirthdays(todaysBirthdays)
    } else {
      setBirthdays([])
    }

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
      const [matchesRes, teamsRes, lineupRes, opponentsRes] = await Promise.all([
        supabase.from("matches").select("id,match_date,match_time,status,dart_type,home_team_type,away_team_type,home_opponent_team_id,away_opponent_team_id,home_team:teams!matches_home_team_id_fkey(id,name),away_team:teams!matches_away_team_id_fkey(id,name)").in("id", matchIds).gte("match_date", today).neq("status", "completed"),
        supabase.from("teams").select("id,name,dart_type").in("id", teamIds),
        supabase.from("match_lineups").select("match_id,team_id,is_substitute,club_players:club_players(photo_url)").in("match_id", matchIds).in("team_id", teamIds),
        supabase.from("opponent_teams").select("id,name"),
      ])
      const matches = (matchesRes.data || []) as unknown as MatchRow[]
      const matchMap = new Map(matches.map((m) => [m.id, m]))
      const teamRows = (teamsRes.data || []) as TeamRow[]
      const teams = new Map(teamRows.map((t) => [t.id, t]))
      const lineupRows = (lineupRes.data || []) as LineupRow[]
      setLineupPhotoUrls(Array.from(new Set(lineupRows.map((row) => row.club_players?.photo_url).filter((value): value is string => Boolean(value)))))
      const opponents = new Map(((opponentsRes.data || []) as Array<{ id: string; name: string }>).map((o) => [o.id, o.name]))
      const nowMs = Date.now()

      setLineups(
        confirmed
          .map((header) => {
            const match = matchMap.get(header.match_id)
            const team = teams.get(header.team_id)
            if (!match || !team) return null

            // Exakt wie in der originalen EMD-TV-Übersicht:
            // Ein confirmed Header allein reicht nicht. Die aktuell bestätigte
            // Version muss vollständig sein, sonst ist es ein Entwurf/ungültig.
            const rows = lineupRows.filter(
              (r) => r.match_id === header.match_id && r.team_id === header.team_id,
            )
            const starters = rows.filter((r) => !r.is_substitute).length
            const dartType = normalizeDartType(team.dart_type || (match as any).dart_type)
            const requiredStarters = dartType === "edart" ? 4 : dartType === "steeldart" ? 3 : 1
            if (starters < requiredStarters) return null

            const startsAt = new Date(`${match.match_date}T${match.match_time || "23:59:00"}`).getTime()
            if (!Number.isFinite(startsAt) || startsAt <= nowMs) return null

            const sideName = (side: "home" | "away") => {
              const type = side === "home" ? match.home_team_type : match.away_team_type
              const oppId = side === "home" ? match.home_opponent_team_id : match.away_opponent_team_id
              const own = side === "home" ? match.home_team : match.away_team
              if (type === "opponent" && oppId) return opponents.get(oppId) || "GEGNER"
              return own?.name || "UNBEKANNT"
            }
            const homeName = sideName("home")
            const awayName = sideName("away")
            const ownIsHome = match.home_team?.id === header.team_id || normalizeTeamName(homeName) === normalizeTeamName(team.name)
            const opponentName = ownIsHome ? awayName : homeName

            return { matchId: header.match_id, teamId: header.team_id, teamName: team.name || "EMD", opponentName, startsAt }
          })
          .filter(Boolean)
          .sort((a, b) => a!.startsAt - b!.startsAt)
          .slice(0, 3) as LineupSlide[],
      )
    } else {
      setLineups([])
      setLineupPhotoUrls([])
    }

    setLoaded(true)
  }, [])

  const refreshActiveTournamentStatus = useCallback(async () => {
    const [dkoStatusRes, kratzerStatusRes] = await Promise.all([
      supabase.from("tournaments_status").select("tournament_id").eq("status", "active").limit(1),
      supabase.from("kratzer_tournaments").select("id").eq("status", "running").order("created_at", { ascending: false }).limit(1),
    ])

    if (!dkoStatusRes.error || !kratzerStatusRes.error) {
      setActive((current) => ({
        dko: dkoStatusRes.error ? current.dko : Boolean(dkoStatusRes.data?.length),
        kratzer: kratzerStatusRes.error ? current.kratzer : Boolean(kratzerStatusRes.data?.length),
      }))
    }
  }, [])

  useEffect(() => {
    void loadData()
    void refreshActiveTournamentStatus()
    let refreshInterval: number | null = null
    let activeStatusInterval: number | null = null

    const startFallbackRefresh = () => {
      if (refreshInterval) window.clearInterval(refreshInterval)
      refreshInterval = null
      if (!document.hidden) {
        // Supabase Realtime übernimmt die unmittelbaren Änderungen.
        // Dieser Intervall ist nur ein sparsames Sicherheitsnetz.
        refreshInterval = window.setInterval(() => void loadData(), REFRESH_MS)
      }
    }

    const handleVisibility = () => {
      startFallbackRefresh()
      if (!document.hidden) void loadData()
    }

    startFallbackRefresh()
    activeStatusInterval = window.setInterval(() => void refreshActiveTournamentStatus(), 2000)
    document.addEventListener("visibilitychange", handleVisibility)
    const clockInterval = window.setInterval(() => setNow(new Date()), 1000)
    const channel = supabase
      .channel("emd_tv_screen_updates_v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments_status" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "kratzer_tournaments" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_lineup_headers" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series_events" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "central_tournament_events" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "dach_events" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "club_players" }, () => void loadData())
      .subscribe()

    return () => {
      if (refreshInterval) window.clearInterval(refreshInterval)
      if (activeStatusInterval) window.clearInterval(activeStatusInterval)
      window.clearInterval(clockInterval)
      document.removeEventListener("visibilitychange", handleVisibility)
      void supabase.removeChannel(channel)
    }
  }, [loadData, refreshActiveTournamentStatus])

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

  const todayKey = todayIso()

  const todayLeagueGames = useMemo(() => {
    const live = sportdarts.ownLive.map((game) => ({
      id: `live-${game.gameId}`,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      division: game.division,
      weekNumber: game.weekNumber,
      live: true,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
    }))
    const upcoming = sportdarts.upcoming
      .filter((game) => game.date === todayKey)
      .map((game) => ({
        id: `up-${game.gameId}`,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        division: game.divisionName || "Sportdarts",
        weekNumber: game.weekNumber,
        live: false,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
      }))
    const seen = new Set<string>()
    return [...live, ...upcoming].filter((game) => {
      const key = game.id.replace(/^(live|up)-/, "")
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [sportdarts.ownLive, sportdarts.upcoming, todayKey])

  const todayTournaments = useMemo(() => tournaments
    .filter((item) => item.date === todayKey)
    .map((item) => ({ id: item.id, title: item.name, subtitle: item.location || item.mode, time: formatTime(item.time) })),
  [tournaments, todayKey])

  const todaySeries = useMemo(() => seriesEvents
    .filter((item) => {
      const d = new Date(item.startsAt)
      if (!Number.isFinite(d.getTime())) return false
      const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      return local === todayKey
    })
    .map((item) => ({ id: item.id, title: item.title || item.seriesName, subtitle: item.seriesName, time: formatTime(item.startsAt) })),
  [seriesEvents, todayKey])

  const todayEvents = useMemo(() => dachEvents
    .filter((item) => item.start_date === todayKey)
    .map((item) => ({ id: item.id, title: item.name, subtitle: [item.location, item.city].filter(Boolean).join(" · "), time: formatTime(item.event_time) })),
  [dachEvents, todayKey])

  const tvTodayLeagueGames = useMemo(() => {
    if (!testTodayEnabled) return todayLeagueGames
    return [
      { id: "emd-tv-test-today-league", homeTeam: "Emoj!'s 4", awayTeam: "Habidere Lady's", division: "E-Dart Division 2", weekNumber: 7, live: testLiveEnabled, homeScore: 5, awayScore: 3 },
      ...todayLeagueGames.filter((game) => game.id !== "emd-tv-test-today-league"),
    ]
  }, [todayLeagueGames, testTodayEnabled, testLiveEnabled])

  const tvTodayTournaments = useMemo(() => testTodayEnabled
    ? [{ id: "emd-tv-test-tournament", title: "Members Champion Cup", subtitle: "EMD Vereinslokal", time: "19:00 Uhr" }, ...todayTournaments]
    : todayTournaments, [testTodayEnabled, todayTournaments])

  const tvTodaySeries = useMemo(() => testTodayEnabled
    ? [{ id: "emd-tv-test-series", title: "Summer Special · Spieltag", subtitle: "Turnierserie", time: "18:30 Uhr" }, ...todaySeries]
    : todaySeries, [testTodayEnabled, todaySeries])

  const tvTodayEvents = useMemo(() => testTodayEnabled
    ? [{ id: "emd-tv-test-event", title: "EMD Clubabend", subtitle: "Linzer Bundesstraße 16 · Salzburg", time: "20:00 Uhr" }, ...todayEvents]
    : todayEvents, [testTodayEnabled, todayEvents])

  const hasTodaySlide = tvTodayLeagueGames.length > 0 || tvTodayTournaments.length > 0 || tvTodaySeries.length > 0 || tvTodayEvents.length > 0 || birthdays.length > 0

  const slides = useMemo<Slide[]>(() => {
    // Schneller TV-Test: zuerst LIVE-Übersicht, danach Detailansicht des Testspiels.
    if (testMode === "live") {
      return [
        { kind: "sportdarts-live-overview" },
        { kind: "sportdarts-live", index: 0 },
      ]
    }

    const next: Slide[] = []
    birthdays.forEach((player) => next.push({ kind: "birthday", player }))
    if (hasTodaySlide) next.push({ kind: "today" })
    if (tvLiveGames.length) {
      next.push({ kind: "sportdarts-live-overview" })
      tvLiveGames.forEach((_, index) => next.push({ kind: "sportdarts-live", index }))
    }
    // Diese beiden EMD-Liga-Folien sind feste Bestandteile der TV-Rotation.
    // Auch wenn Sportdarts vorübergehend leer antwortet, verschwinden die Seiten nicht einfach.
    if (!sportdarts.loading || sportdarts.upcoming.length || tvResults.length) {
      next.push({ kind: "league-upcoming" })
      next.push({ kind: "league-results" })
    }
    if (tournamentCards.length) {
      for (let offset = 0; offset < tournamentCards.length; offset += 4) next.push({ kind: "tournaments", offset })
    }
    if (seriesEvents.length) next.push({ kind: "series" })
    if (dachEvents.length) next.push({ kind: "veranstaltungen" })
    lineups.forEach((lineup) => next.push({ kind: "lineup", lineup }))
    return next.length ? next : [{ kind: "tournaments", offset: 0 }]
  }, [birthdays, dachEvents.length, hasTodaySlide, lineups, seriesEvents.length, tvLiveGames.length, tvResults.length, sportdarts.loading, sportdarts.upcoming.length, tournamentCards.length, testMode])

  const currentSlide = slides[slideIndex] || slides[0]

  useEffect(() => {
    setSlideIndex((i) => Math.min(i, Math.max(0, slides.length - 1)))
  }, [slides.length])

  useEffect(() => {
    if (testMode !== "live") return
    setBrandBreak(false)
    setSlideIndex(0)
  }, [testMode])

  useEffect(() => {
    if (!loaded || !assetsReady || active.dko || active.kratzer || !brandBreak) return
    const timer = window.setTimeout(() => setBrandBreak(false), 3000)
    return () => window.clearTimeout(timer)
  }, [loaded, assetsReady, active.dko, active.kratzer, brandBreak])

  const advanceSlide = useCallback(() => {
    setSlideIndex((i) => {
      if (i >= slides.length - 1) {
        setBrandBreak(true)
        return 0
      }
      return i + 1
    })
  }, [slides.length])

  useEffect(() => {
    if (!assetsReady || brandBreak || active.dko || active.kratzer || slides.length <= 1 || currentSlide?.kind === "lineup" || currentSlide?.kind === "league-results") return
    const timer = window.setTimeout(advanceSlide, NORMAL_SLIDE_MS)
    return () => window.clearTimeout(timer)
  }, [assetsReady, brandBreak, active.dko, active.kratzer, currentSlide?.kind, slideIndex, slides.length, advanceSlide])

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
    birthdays.forEach((player) => {
      const url = tvImageUrl(player.photo_url, 900, 1100, 68, "cover")
      if (url) urls.add(url)
    })
    dachEvents.slice(0, 4).forEach((event) => {
      if (event.photo_url && !event.photo_url.toLowerCase().endsWith(".pdf")) {
        const url = tvImageUrl(event.photo_url, 900, 1100, 66, "cover")
        if (url) urls.add(url)
      }
    })
    // Aufstellungsbilder schon während der normalen EMD-TV-Rotation in den Browsercache laden.
    lineupPhotoUrls.forEach((src) => {
      const url = tvImageUrl(src, 900, 1200, 70, "contain")
      if (url) urls.add(url)
    })
    return Array.from(urls)
  }, [birthdays, dachEvents, lineupPhotoUrls, seriesEvents])

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
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-[38px] w-[46px] shrink-0 items-center justify-center rounded-[10px] border border-orange-300/20 bg-gradient-to-br from-white/[.055] to-orange-500/[.055] shadow-[0_0_22px_rgba(251,146,60,.10)]">
              <Tv2 className="h-[25px] w-[25px] stroke-[1.8] text-white/72" />
              <div className="absolute inset-0 flex items-center justify-center pt-[1px]">
                <Play className="ml-[2px] h-[10px] w-[10px] fill-orange-400 text-orange-400 drop-shadow-[0_0_5px_rgba(251,146,60,.5)]" />
              </div>
            </div>
            <div className="text-[clamp(1.15rem,1.55vw,1.9rem)] font-black tracking-[-.055em]">EMD <span className="text-orange-400">TV</span></div>
          </div>
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
        ) : brandBreak && loaded && assetsReady ? (
          <section className="absolute inset-0 overflow-hidden bg-[#030303]">
            <div className="absolute inset-0 bg-[url('/terminal/hero-startscreen.png')] bg-cover bg-center opacity-[.80]" />
            <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(0,0,0,.98),rgba(5,5,6,.91)_48%,rgba(17,8,2,.77))]" />
            <div className="absolute left-[-10vw] top-[10vh] h-[42vw] w-[42vw] rounded-full bg-orange-500/[.08] blur-[7vw]" />
            <div className="absolute inset-0 grid place-items-center px-[5vw] text-center">
              <div className="relative flex min-h-[52vh] items-center justify-center">
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-[1.5vw]">
                    <div className="text-[clamp(5rem,10vw,11.5rem)] font-black leading-none tracking-[-.075em] text-white drop-shadow-[0_8px_38px_rgba(0,0,0,.75)]">
                      EMD <span className="text-orange-400">TV</span>
                    </div>
                  </div>

                  <div className="mx-auto mt-[3.2vh] h-[4px] w-[13vw] bg-orange-400 shadow-[0_0_34px_rgba(251,146,60,.60)]" />
                  <div className="mt-[2.8vh] text-[clamp(.78rem,1.08vw,1.15rem)] font-black uppercase tracking-[.46em] text-white/46">Emoji Darts · Salzburg</div>
                </div>
              </div>
            </div>
          </section>
        ) : currentSlide?.kind === "today" ? (
          <TodayTv
            leagueGames={tvTodayLeagueGames}
            tournaments={tvTodayTournaments}
            series={tvTodaySeries}
            events={tvTodayEvents}
            birthdays={birthdays.map((player) => ({ id: player.id, name: player.name }))}
          />
        ) : currentSlide?.kind === "birthday" ? (
          <BirthdayTv player={{ id: currentSlide.player.id, name: currentSlide.player.name, photoUrl: tvImageUrl(currentSlide.player.photo_url, 1000, 1300, 72, "cover") || currentSlide.player.photo_url }} />
        ) : currentSlide?.kind === "lineup" ? (
          <LineupDisplay
            key={`${currentSlide.lineup.matchId}-${currentSlide.lineup.teamId}`}
            matchId={currentSlide.lineup.matchId}
            teamId={currentSlide.lineup.teamId}
            prediction={sportdarts.getPrediction(currentSlide.lineup.teamName, currentSlide.lineup.opponentName)}
            onComplete={advanceSlide}
          />
        ) : currentSlide?.kind === "sportdarts-live-overview" ? (
          <div className="absolute inset-0 overflow-hidden bg-[#030303]">
            <div className="relative z-10 h-full"><SportdartsLiveOverviewTv games={tvLiveGames} lastUpdated={sportdarts.lastUpdated} /></div>
          </div>
        ) : currentSlide?.kind === "sportdarts-live" ? (
          <div className="absolute inset-0 overflow-hidden bg-[#030303]">
            <div className="absolute inset-0 bg-[url('/terminal/hero-startscreen.png')] bg-cover bg-center opacity-[.24]" />
            <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(0,0,0,.97),rgba(5,5,6,.88)_50%,rgba(12,3,3,.82))]" />
            <div className="relative z-10 h-full"><SportdartsLiveTv game={tvLiveGames[currentSlide.index]} lastUpdated={sportdarts.lastUpdated} testMode={testLiveEnabled && tvLiveGames[currentSlide.index]?.gameId === testLiveGame.gameId} /></div>
          </div>
        ) : currentSlide?.kind === "league-upcoming" ? (
          <div className="absolute inset-0 overflow-hidden bg-[#030303]">
            <div className="absolute inset-0 bg-[url('/terminal/hero-startscreen.png')] bg-cover bg-center opacity-[.24]" />
            <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(0,0,0,.97),rgba(5,5,6,.88)_50%,rgba(17,8,2,.78))]" />
            <div className="relative z-10 h-full"><SportdartsUpcomingTv games={sportdarts.upcoming} getPrediction={sportdarts.getPrediction} /></div>
          </div>
        ) : currentSlide?.kind === "league-results" ? (
          <div className="absolute inset-0 overflow-hidden bg-[#030303]">
            <div className="absolute inset-0 bg-[url('/terminal/hero-startscreen.png')] bg-cover bg-center opacity-[.24]" />
            <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(0,0,0,.97),rgba(5,5,6,.88)_50%,rgba(17,8,2,.78))]" />
            <div className="relative z-10 h-full"><SportdartsResultsTv games={tvResults.slice(0, 6)} onComplete={advanceSlide} /></div>
          </div>
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
          <section className="flex flex-1 flex-col justify-center pt-[4vh]">
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
