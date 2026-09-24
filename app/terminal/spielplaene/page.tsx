"use client"

import TerminalLink from "../_components/TerminalLink"
import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  Filter,
  Home,
  Info,
  MapPin,
  Shield,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type Team = {
  id: string
  name: string
  logo_url?: string | null
  dart_type?: string | null
}

type OpponentTeam = {
  id: string
  name: string
  venue?: string | null
  venue_name?: string | null
}

type Season = {
  id: string
  name?: string | null
  type?: string | null
  year?: number | null
  start_date?: string | null
  is_active?: boolean | null
}

type Match = {
  id: string
  match_date: string
  match_time?: string | null
  status?: string | null
  home_score?: number | null
  away_score?: number | null
  dart_type?: string | null
  home_team_id?: string | null
  away_team_id?: string | null
  home_opponent_team_id?: string | null
  away_opponent_team_id?: string | null
  home_team?: Team | null
  away_team?: Team | null
  home_opponent_team?: OpponentTeam | null
  away_opponent_team?: OpponentTeam | null
  venue?: string | null
  notes?: string | null
  week_number?: number | null
  original_date?: string | null
  postponement_reason?: string | null
  season?: Season | null
}

type DayFilter = "all" | "today" | "tomorrow" | "dayafter" | "next14"
type VenueFilter = "all" | "home" | "away"
type DartFilter = "all" | "edart" | "steeldart"

function localDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function addDays(base: Date, days: number) {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d
}

function matchDateTime(match: Match) {
  const time = match.match_time?.slice(0, 8) || "00:00:00"
  return new Date(`${match.match_date}T${time}`)
}

function formatDay(dateString: string) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString("de-AT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatShortDay(dateString: string) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  })
}

function formatTime(value?: string | null) {
  return value ? value.slice(0, 5) : "–"
}

function getSide(match: Match, teamId: string) {
  return match.home_team_id === teamId ? "home" : "away"
}

function getTeamForSide(match: Match, side: "home" | "away") {
  if (side === "home") return match.home_team || match.home_opponent_team
  return match.away_team || match.away_opponent_team
}

function getLogoForSide(match: Match, side: "home" | "away") {
  const own = side === "home" ? match.home_team : match.away_team
  return own?.logo_url || null
}

function getVenue(match: Match) {
  if (match.venue?.trim()) return match.venue.trim()
  if (match.home_opponent_team?.venue_name?.trim()) return match.home_opponent_team.venue_name.trim()
  if (match.home_opponent_team?.venue?.trim()) return match.home_opponent_team.venue.trim()
  return "Spielort noch nicht hinterlegt"
}

function getStatusLabel(status?: string | null) {
  if (status === "postponed") return "Verschoben"
  if (status === "cancelled") return "Abgesagt"
  if (status === "completed") return "Beendet"
  return "Geplant"
}

function isPostponed(match: Match) {
  return match.status === "postponed" || !!match.postponement_reason || (!!match.original_date && match.original_date !== match.match_date)
}

function TeamLogo({ logo, name, tone = "orange", large = false }: { logo?: string | null; name?: string; tone?: "orange" | "blue"; large?: boolean }) {
  const size = large ? "h-24 w-24 sm:h-28 sm:w-28" : "h-20 w-20"
  return (
    <div className={`${size} relative mx-auto flex shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] shadow-[0_16px_55px_-30px_rgba(0,0,0,.85)]`}>
      {logo ? (
        <div className="flex h-full w-full items-center justify-center bg-black/45 p-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={name || "Teamlogo"} className="h-full w-full object-contain [transform:scale(1.28)]" />
        </div>
      ) : (
        <Shield className={`h-10 w-10 ${tone === "orange" ? "text-orange-300/85" : "text-cyan-200/85"}`} />
      )}
    </div>
  )
}

function MatchCard({ match, selectedTeamId, onOpen }: { match: Match; selectedTeamId: string; onOpen: (match: Match) => void }) {
  const side = getSide(match, selectedTeamId)
  const home = getTeamForSide(match, "home")
  const away = getTeamForSide(match, "away")
  const homeLogo = getLogoForSide(match, "home")
  const awayLogo = getLogoForSide(match, "away")
  const venue = getVenue(match)
  const postponed = isPostponed(match)

  return (
    <article className={`group relative overflow-hidden rounded-[30px] border p-5 shadow-[0_24px_70px_-45px_rgba(0,0,0,.9)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 ${postponed ? "border-amber-400/28 bg-amber-500/[0.08] hover:bg-amber-500/[0.10]" : "border-white/[0.09] bg-black/28 hover:border-orange-400/25 hover:bg-black/36"}`}>
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${postponed ? "via-amber-300/80" : "via-orange-400/60"} to-transparent`} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
            side === "home"
              ? "border-orange-400/25 bg-orange-500/10 text-orange-300"
              : "border-cyan-300/20 bg-cyan-400/10 text-cyan-200"
          }`}>
            {side === "home" ? "Heimspiel" : "Auswärtsspiel"}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
            {match.dart_type === "steeldart" ? "Steeldart" : "E-Dart"}
          </span>
          {postponed && (
            <span className="rounded-full border border-amber-300/30 bg-amber-400/14 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
              Verschoben
            </span>
          )}
        </div>

        <div className="text-right">
          <div className="text-sm font-black text-white">{formatShortDay(match.match_date)}</div>
          <div className="mt-0.5 text-xs font-bold text-white/38">{formatTime(match.match_time)} Uhr</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
        <div className="min-w-0 text-center">
          <TeamLogo logo={homeLogo} name={home?.name} tone="orange" />
          <div className="mt-3 line-clamp-2 min-h-[40px] text-sm font-black leading-5 sm:text-base">{home?.name || "Heimteam"}</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Heim</div>
        </div>

        <div className="text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">gegen</div>
          <div className="mt-1 text-2xl font-black text-white/65">VS</div>
        </div>

        <div className="min-w-0 text-center">
          <TeamLogo logo={awayLogo} name={away?.name} tone="blue" />
          <div className="mt-3 line-clamp-2 min-h-[40px] text-sm font-black leading-5 sm:text-base">{away?.name || "Auswärtsteam"}</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Auswärts</div>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Spielort</div>
          <div className="mt-1 line-clamp-2 text-sm font-bold text-white/70">{venue}</div>
        </div>
      </div>

      {postponed && (
        <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/[0.09] p-3 text-sm font-semibold text-amber-100/90">
          {match.original_date && match.original_date !== match.match_date ? (
            <div>Neuer Termin · ursprünglich {formatShortDay(match.original_date)}</div>
          ) : (
            <div>Dieses Spiel wurde verschoben.</div>
          )}
        </div>
      )}

      <button
        onClick={() => onOpen(match)}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] text-sm font-black text-white/75 transition hover:border-orange-400/25 hover:bg-orange-500/10 hover:text-white active:scale-[0.99]"
      >
        <Info className="h-4 w-4" /> Mehr Infos
      </button>
    </article>
  )
}

function MatchDetails({ match, selectedTeamId, onClose }: { match: Match; selectedTeamId: string; onClose: () => void }) {
  const home = getTeamForSide(match, "home")
  const away = getTeamForSide(match, "away")
  const homeLogo = getLogoForSide(match, "home")
  const awayLogo = getLogoForSide(match, "away")
  const venue = getVenue(match)
  const side = getSide(match, selectedTeamId)
  const postponed = isPostponed(match)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl" onClick={onClose}>
      <div
        className="relative max-h-[92svh] w-full max-w-4xl overflow-y-auto rounded-[36px] border border-white/10 bg-[#0b0d10]/95 shadow-[0_40px_150px_rgba(0,0,0,.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(249,115,22,.17),transparent_30%),radial-gradient(circle_at_90%_100%,rgba(34,211,238,.12),transparent_30%)]" />

        <div className="relative flex items-center justify-between border-b border-white/[0.07] px-6 py-5 sm:px-8">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-300">Spieldetails</div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-black">{side === "home" ? "Heimspiel" : "Auswärtsspiel"}{postponed && <span className="rounded-full border border-amber-300/30 bg-amber-400/14 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Verschoben</span>}</div>
          </div>
          <button onClick={onClose} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/65 hover:bg-white/[0.09]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative p-6 sm:p-8">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
            <div className="min-w-0 text-center">
              <TeamLogo logo={homeLogo} name={home?.name} tone="orange" large />
              <div className="mt-4 text-xl font-black sm:text-2xl">{home?.name || "Heimteam"}</div>
              <div className="mt-1 text-xs font-black uppercase tracking-[0.22em] text-orange-300/70">Heim</div>
            </div>

            <div className="text-center">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-white/25">Match</div>
              <div className="mt-2 text-3xl font-black text-white/65 sm:text-4xl">VS</div>
            </div>

            <div className="min-w-0 text-center">
              <TeamLogo logo={awayLogo} name={away?.name} tone="blue" large />
              <div className="mt-4 text-xl font-black sm:text-2xl">{away?.name || "Auswärtsteam"}</div>
              <div className="mt-1 text-xs font-black uppercase tracking-[0.22em] text-cyan-200/70">Auswärts</div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4">
              <CalendarDays className="h-5 w-5 text-orange-300" />
              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Datum</div>
              <div className="mt-1 text-base font-black">{formatDay(match.match_date)}</div>
            </div>

            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4">
              <Clock3 className="h-5 w-5 text-cyan-200" />
              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Beginn</div>
              <div className="mt-1 text-base font-black">{formatTime(match.match_time)} Uhr</div>
            </div>

            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4">
              <MapPin className="h-5 w-5 text-orange-300" />
              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Spielort</div>
              <div className="mt-1 text-base font-black">{venue}</div>
            </div>

            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4">
              <Target className="h-5 w-5 text-cyan-200" />
              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Dart-Typ</div>
              <div className="mt-1 text-base font-black">{match.dart_type === "steeldart" ? "Steeldart" : "E-Dart"}</div>
            </div>

            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4">
              <Trophy className="h-5 w-5 text-orange-300" />
              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Saison / Runde</div>
              <div className="mt-1 text-base font-black">
                {match.season?.name || match.season?.type || "Aktuelle Saison"}
                {match.week_number ? ` · Spieltag ${match.week_number}` : ""}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4">
              <Info className="h-5 w-5 text-cyan-200" />
              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Status</div>
              <div className="mt-1 text-base font-black">{getStatusLabel(match.status)}</div>
            </div>
          </div>

          {(match.notes || match.postponement_reason || match.original_date) && (
            <div className="mt-4 rounded-[26px] border border-orange-400/15 bg-orange-500/[0.06] p-5">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Zusatzinformationen</div>
              {match.original_date && match.original_date !== match.match_date && (
                <div className="mt-3 text-sm font-semibold text-white/65">Ursprünglicher Termin: {formatDay(match.original_date)}</div>
              )}
              {match.postponement_reason && (
                <div className="mt-2 text-sm font-semibold text-white/65">Grund der Verschiebung: {match.postponement_reason}</div>
              )}
              {match.notes && <div className="mt-2 text-sm font-semibold leading-6 text-white/65">{match.notes}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TerminalFixturesPage() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [dayFilter, setDayFilter] = useState<DayFilter>("all")
  const [venueFilter, setVenueFilter] = useState<VenueFilter>("all")
  const [dartFilter, setDartFilter] = useState<DartFilter>("all")
  const [seasonLabel, setSeasonLabel] = useState("Aktuelle Saison")
  const [detailMatch, setDetailMatch] = useState<Match | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const [{ data: seasonRows }, { data: teamRows }, { data: opponentRows }] = await Promise.all([
        supabase
          .from("seasons")
          .select("id, name, type, year, start_date, is_active")
          .order("start_date", { ascending: false }),
        supabase.from("teams").select("id, name, logo_url, dart_type").not("user_id", "is", null).order("name"),
        supabase.from("opponent_teams").select("id, name, venue, venue_name").order("name"),
      ])

      const seasons = (seasonRows || []) as Season[]
      const activeSeason = seasons.find((s) => s.is_active) || seasons[0]
      const ownTeams = (teamRows || []) as Team[]
      const opponents = (opponentRows || []) as OpponentTeam[]

      setTeams(ownTeams)
      if (!selectedTeamId && ownTeams[0]?.id) setSelectedTeamId(ownTeams[0].id)

      if (activeSeason) {
        setSeasonLabel(`${activeSeason.name || activeSeason.type || "Saison"}${activeSeason.year ? ` ${activeSeason.year}` : ""}`)
      }

      let query = supabase
        .from("matches")
        .select(`
          id,
          match_date,
          match_time,
          status,
          home_score,
          away_score,
          dart_type,
          home_team_id,
          away_team_id,
          home_opponent_team_id,
          away_opponent_team_id,
          venue,
          notes,
          week_number,
          original_date,
          postponement_reason,
          home_team:teams!matches_home_team_id_fkey(id, name, logo_url, dart_type),
          away_team:teams!matches_away_team_id_fkey(id, name, logo_url, dart_type),
          season:seasons(id, name, type, year)
        `)
        .order("match_date", { ascending: true })

      if (activeSeason?.id) query = query.eq("season_id", activeSeason.id)

      const { data: matchRows } = await query

      const enriched = ((matchRows || []) as Match[]).map((match) => ({
        ...match,
        home_opponent_team: match.home_opponent_team_id
          ? opponents.find((t) => t.id === match.home_opponent_team_id) || null
          : null,
        away_opponent_team: match.away_opponent_team_id
          ? opponents.find((t) => t.id === match.away_opponent_team_id) || null
          : null,
      }))

      setMatches(enriched)
      setLoading(false)
    }

    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || null

  const filteredMatches = useMemo(() => {
    if (!selectedTeamId) return []

    const now = new Date()
    const today = addDays(now, 0)
    const tomorrow = addDays(now, 1)
    const dayAfter = addDays(now, 2)
    const next14 = addDays(now, 14)

    return matches
      .filter((match) => match.status !== "completed")
      .filter((match) => match.status !== "cancelled")
      .filter((match) => matchDateTime(match).getTime() >= today.getTime())
      .filter((match) => match.home_team_id === selectedTeamId || match.away_team_id === selectedTeamId)
      .filter((match) => {
        if (venueFilter === "home") return match.home_team_id === selectedTeamId
        if (venueFilter === "away") return match.away_team_id === selectedTeamId
        return true
      })
      .filter((match) => {
        if (dartFilter === "edart") return match.dart_type === "edart"
        if (dartFilter === "steeldart") return match.dart_type === "steeldart"
        return true
      })
      .filter((match) => {
        if (dayFilter === "all") return true
        const date = new Date(`${match.match_date}T12:00:00`)
        if (dayFilter === "today") return localDateKey(date) === localDateKey(today)
        if (dayFilter === "tomorrow") return localDateKey(date) === localDateKey(tomorrow)
        if (dayFilter === "dayafter") return localDateKey(date) === localDateKey(dayAfter)
        if (dayFilter === "next14") return date >= today && date <= next14
        return true
      })
      .sort((a, b) => matchDateTime(a).getTime() - matchDateTime(b).getTime())
  }, [matches, selectedTeamId, venueFilter, dartFilter, dayFilter])

  const nextMatch = filteredMatches[0] || null

  const grouped = useMemo(() => {
    const map = new Map<string, Match[]>()
    filteredMatches.forEach((match) => {
      if (!map.has(match.match_date)) map.set(match.match_date, [])
      map.get(match.match_date)!.push(match)
    })
    return Array.from(map.entries())
  }, [filteredMatches])

  if (loading) {
    return (
      <main className="relative min-h-[100svh] overflow-hidden bg-[#050608] text-white">
        <div className="pointer-events-none absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.48]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
        <div className="pointer-events-none absolute inset-0 bg-black/55" />
        <div className="relative flex min-h-[100svh] items-center justify-center px-6 text-center">
          <div>
            <div className="text-2xl font-black text-white">Spielpläne</div>
            <div className="mt-2 text-xs font-black uppercase tracking-[0.28em] text-white/35">Daten werden vorbereitet</div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#060709] text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.58]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.38),rgba(4,6,9,.62)),radial-gradient(circle_at_10%_0%,rgba(249,115,22,.14),transparent_28%),radial-gradient(circle_at_100%_80%,rgba(14,165,233,.10),transparent_30%)]" />
      <div className="pointer-events-none fixed -left-24 bottom-[-10%] h-[48vh] w-[42vw] rounded-full bg-orange-500/12 blur-[120px]" />
      <div className="pointer-events-none fixed -right-24 bottom-[-8%] h-[46vh] w-[40vw] rounded-full bg-cyan-500/10 blur-[130px]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:52px_52px]" />

      <div className="relative mx-auto min-h-[100svh] max-w-[1560px] px-5 py-6 lg:px-8 lg:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TerminalLink href="/terminal/liga" label="Ligabereich wird geöffnet" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]">
              <ArrowLeft className="h-5 w-5" />
            </TerminalLink>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300/90">EMD Club Terminal</div>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">Spielpläne</h1>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-right backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">Saison</div>
            <div className="mt-1 text-sm font-black text-white/70">{seasonLabel}</div>
          </div>
        </header>

        <section className="mt-7 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
          <div className="overflow-hidden rounded-[32px] border border-white/[0.08] bg-black/24 p-5 backdrop-blur-xl sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-white/35"><Users className="h-4 w-4" /> Mannschaft</div>
                <div className="mt-2 text-2xl font-black">Welche Mannschaft?</div>
              </div>

              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="h-14 min-w-[260px] appearance-none rounded-2xl border border-white/10 bg-[#0b0d10]/90 px-4 text-base font-black text-white outline-none focus:border-orange-400/35"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id} className="bg-[#0b0d10] text-white">
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {([[
                "all", "Alle"], ["today", "Heute"], ["tomorrow", "Morgen"], ["dayafter", "Übermorgen"], ["next14", "Nächste 14 Tage"]] as Array<[DayFilter, string]>).map(([key, label]) => (
                <button key={key} onClick={() => setDayFilter(key)} className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${dayFilter === key ? "border-orange-400/35 bg-orange-500 text-white shadow-[0_0_30px_rgba(249,115,22,.18)]" : "border-white/10 bg-white/[0.035] text-white/55 hover:bg-white/[0.07]"}`}>{label}</button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {([[
                "all", "Heim & Auswärts", MapPin], ["home", "Nur Heim", Home], ["away", "Nur Auswärts", ChevronRight]] as Array<[VenueFilter, string, any]>).map(([key, label, Icon]) => (
                <button key={key} onClick={() => setVenueFilter(key)} className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${venueFilter === key ? "border-cyan-300/30 bg-cyan-400/12 text-cyan-100" : "border-white/10 bg-white/[0.025] text-white/45 hover:bg-white/[0.06]"}`}><Icon className="h-4 w-4" /> {label}</button>
              ))}

              <div className="mx-1 hidden h-10 w-px bg-white/10 sm:block" />

              {([["all", "Alle Darts"], ["edart", "E-Dart"], ["steeldart", "Steeldart"]] as Array<[DartFilter, string]>).map(([key, label]) => (
                <button key={key} onClick={() => setDartFilter(key)} className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${dartFilter === key ? "border-white/20 bg-white/[0.10] text-white" : "border-white/10 bg-white/[0.025] text-white/45 hover:bg-white/[0.06]"}`}>{label}</button>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[32px] border border-orange-400/15 bg-gradient-to-br from-orange-500/15 via-black/25 to-cyan-400/[0.07] p-5 shadow-[0_25px_80px_-45px_rgba(249,115,22,.5)] backdrop-blur-2xl sm:p-6">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-orange-300"><Target className="h-4 w-4" /> Nächstes Spiel</div>

              {nextMatch ? (
                <>
                  {isPostponed(nextMatch) && <div className="mt-4 inline-flex rounded-full border border-amber-300/30 bg-amber-400/14 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Verschoben</div>}
                  <div className="mt-5 text-3xl font-black tracking-[-0.05em]">{formatDay(nextMatch.match_date)}</div>
                  <div className="mt-2 flex items-center gap-2 text-lg font-black text-white/75"><Clock3 className="h-5 w-5 text-orange-300" /> {formatTime(nextMatch.match_time)} Uhr</div>
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/14 p-4">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-orange-300" />
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Spielort</div>
                      <div className="mt-1 text-sm font-black text-white/75">{getVenue(nextMatch)}</div>
                    </div>
                  </div>
                  {isPostponed(nextMatch) && nextMatch.original_date && nextMatch.original_date !== nextMatch.match_date && (
                    <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/[0.09] p-3 text-sm font-semibold text-amber-100/90">
                      Ursprünglicher Termin: {formatDay(nextMatch.original_date)}
                    </div>
                  )}
                  <button onClick={() => setDetailMatch(nextMatch)} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] text-sm font-black text-white/70 hover:bg-white/[0.09]"><Info className="h-4 w-4" /> Details öffnen</button>
                </>
              ) : (
                <div className="mt-7 text-white/45">
                  <CalendarDays className="h-10 w-10 text-white/20" />
                  <div className="mt-4 text-xl font-black text-white/65">Kein Spiel gefunden</div>
                  <div className="mt-1 text-sm font-semibold">Passe die Filter an.</div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-white/30">Termine</div>
              <div className="mt-1 text-2xl font-black">{filteredMatches.length} Spiele gefunden</div>
            </div>
            <div className="hidden items-center gap-2 text-sm font-bold text-white/35 sm:flex"><Filter className="h-4 w-4" /> Live gefiltert</div>
          </div>

          <div className="mt-5 space-y-7">
            {grouped.length === 0 ? (
              <div className="rounded-[30px] border border-dashed border-white/10 bg-black/18 p-10 text-center backdrop-blur-xl">
                <CalendarDays className="mx-auto h-12 w-12 text-white/20" />
                <div className="mt-4 text-xl font-black text-white/65">Keine Spiele in diesem Zeitraum</div>
                <div className="mt-2 text-sm font-semibold text-white/35">Wähle z. B. „Alle“ oder eine andere Mannschaft.</div>
              </div>
            ) : (
              grouped.map(([date, dateMatches]) => (
                <div key={date}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/[0.07]" />
                    <div className="rounded-full border border-white/10 bg-black/22 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/55 backdrop-blur-xl">{formatDay(date)}</div>
                    <div className="h-px flex-1 bg-white/[0.07]" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {dateMatches.map((match) => <MatchCard key={match.id} match={match} selectedTeamId={selectedTeamId} onOpen={setDetailMatch} />)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5 text-[10px] font-black uppercase tracking-[0.28em] text-white/20">
          <span>EMD Club Terminal</span>
          <span>Spielpläne · Heim · Auswärts · Heute · Morgen · Übermorgen</span>
        </footer>
      </div>

      {detailMatch && <MatchDetails match={detailMatch} selectedTeamId={selectedTeamId} onClose={() => setDetailMatch(null)} />}
    </main>
  )
}
