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
  Info,
  MapPin,
  Minus,
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

type DartFilter = "all" | "edart" | "steeldart"
type RangeFilter = "all" | "last5" | "last10" | "month"
type ResultFilter = "all" | "wins" | "draws" | "losses" | "pending"

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

function matchDateTime(match: Match) {
  const time = match.match_time?.slice(0, 8) || "00:00:00"
  return new Date(`${match.match_date}T${time}`)
}

function isMissingResult(match: Match) {
  const h = match.home_score
  const a = match.away_score
  if (h === null || h === undefined) return true
  if (a === null || a === undefined) return true
  return Number(h) === 0 && Number(a) === 0
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

function resultForTeam(match: Match, selectedTeamId: string) {
  if (isMissingResult(match)) return "pending"
  const h = Number(match.home_score || 0)
  const a = Number(match.away_score || 0)
  if (h === a) return "draw"

  const teamIsHome = match.home_team_id === selectedTeamId
  const teamScore = teamIsHome ? h : a
  const oppScore = teamIsHome ? a : h
  return teamScore > oppScore ? "win" : "loss"
}

function resultLabel(match: Match, selectedTeamId: string) {
  const r = resultForTeam(match, selectedTeamId)
  if (r === "pending") return "Ausstehend"
  if (r === "draw") return "Unentschieden"
  if (r === "win") return "Sieg"
  return "Niederlage"
}

function resultClasses(match: Match, selectedTeamId: string) {
  const r = resultForTeam(match, selectedTeamId)
  if (r === "win") return "border-emerald-400/25 bg-emerald-500/[0.07] text-emerald-200"
  if (r === "loss") return "border-rose-400/25 bg-rose-500/[0.07] text-rose-200"
  if (r === "draw") return "border-amber-300/25 bg-amber-400/[0.07] text-amber-100"
  return "border-orange-300/25 bg-orange-400/[0.07] text-orange-200"
}

function ResultCard({ match, selectedTeamId, onOpen }: { match: Match; selectedTeamId: string; onOpen: (m: Match) => void }) {
  const home = getTeamForSide(match, "home")
  const away = getTeamForSide(match, "away")
  const pending = isMissingResult(match)
  const label = resultLabel(match, selectedTeamId)
  const cls = resultClasses(match, selectedTeamId)

  return (
    <article className={`group relative overflow-hidden rounded-[30px] border p-5 shadow-[0_24px_70px_-45px_rgba(0,0,0,.9)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 ${cls}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${cls}`}>
            {label}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
            {match.dart_type === "steeldart" ? "Steeldart" : "E-Dart"}
          </span>
        </div>

        <div className="text-right">
          <div className="text-sm font-black text-white">{formatShortDay(match.match_date)}</div>
          <div className="mt-0.5 text-xs font-bold text-white/38">{formatTime(match.match_time)} Uhr</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
        <div className="min-w-0 text-center">
          <TeamLogo logo={getLogoForSide(match, "home")} name={home?.name} tone="orange" />
          <div className="mt-3 line-clamp-2 min-h-[40px] text-sm font-black leading-5 sm:text-base">{home?.name || "Heimteam"}</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Heim</div>
        </div>

        <div className="min-w-[92px] text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">Ergebnis</div>
          {pending ? (
            <div className="mt-2 text-3xl font-black text-orange-300">– : –</div>
          ) : (
            <div className="mt-2 flex items-center justify-center gap-2 text-4xl font-black tracking-[-0.06em]">
              <span>{match.home_score}</span>
              <span className="text-white/25">:</span>
              <span>{match.away_score}</span>
            </div>
          )}
        </div>

        <div className="min-w-0 text-center">
          <TeamLogo logo={getLogoForSide(match, "away")} name={away?.name} tone="blue" />
          <div className="mt-3 line-clamp-2 min-h-[40px] text-sm font-black leading-5 sm:text-base">{away?.name || "Auswärtsteam"}</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Auswärts</div>
        </div>
      </div>

      {match.original_date && match.original_date !== match.match_date && (
        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/[0.08] p-3 text-sm font-semibold text-amber-100/90">
          Verschoben · ursprünglich {formatShortDay(match.original_date)}
        </div>
      )}

      {pending && (
        <div className="mt-4 rounded-2xl border border-orange-300/20 bg-orange-400/[0.08] p-3 text-sm font-semibold text-orange-100/90">
          Noch kein Ergebnis eingetragen.
        </div>
      )}

      <button onClick={() => onOpen(match)} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/22 text-sm font-black text-white/75 transition hover:border-orange-400/25 hover:bg-orange-500/10 hover:text-white active:scale-[0.99]">
        <Info className="h-4 w-4" /> Mehr Infos
      </button>
    </article>
  )
}

function ResultDetails({ match, selectedTeamId, onClose }: { match: Match; selectedTeamId: string; onClose: () => void }) {
  const home = getTeamForSide(match, "home")
  const away = getTeamForSide(match, "away")
  const pending = isMissingResult(match)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl" onClick={onClose}>
      <div className="relative max-h-[92svh] w-full max-w-4xl overflow-y-auto rounded-[36px] border border-white/10 bg-[#0b0d10]/95 shadow-[0_40px_150px_rgba(0,0,0,.8)]" onClick={(e) => e.stopPropagation()}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(249,115,22,.17),transparent_30%),radial-gradient(circle_at_90%_100%,rgba(34,211,238,.12),transparent_30%)]" />

        <div className="relative flex items-center justify-between border-b border-white/[0.07] px-6 py-5 sm:px-8">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-300">Ergebnisdetails</div>
            <div className="mt-1 flex items-center gap-3 text-2xl font-black">
              {resultLabel(match, selectedTeamId)}
            </div>
          </div>
          <button onClick={onClose} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/65 hover:bg-white/[0.09]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative p-6 sm:p-8">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
            <div className="min-w-0 text-center">
              <TeamLogo logo={getLogoForSide(match, "home")} name={home?.name} tone="orange" large />
              <div className="mt-4 text-xl font-black sm:text-2xl">{home?.name || "Heimteam"}</div>
            </div>

            <div className="text-center">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-white/25">Endstand</div>
              {pending ? (
                <div className="mt-2 text-4xl font-black text-orange-300">– : –</div>
              ) : (
                <div className="mt-2 flex items-center justify-center gap-3 text-5xl font-black tracking-[-0.07em]">
                  <span>{match.home_score}</span><span className="text-white/25">:</span><span>{match.away_score}</span>
                </div>
              )}
            </div>

            <div className="min-w-0 text-center">
              <TeamLogo logo={getLogoForSide(match, "away")} name={away?.name} tone="blue" large />
              <div className="mt-4 text-xl font-black sm:text-2xl">{away?.name || "Auswärtsteam"}</div>
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
              <div className="mt-1 text-base font-black">{getVenue(match)}</div>
            </div>
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4">
              <Target className="h-5 w-5 text-cyan-200" />
              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Dart-Typ</div>
              <div className="mt-1 text-base font-black">{match.dart_type === "steeldart" ? "Steeldart" : "E-Dart"}</div>
            </div>
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4">
              <Trophy className="h-5 w-5 text-orange-300" />
              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Saison / Spieltag</div>
              <div className="mt-1 text-base font-black">
                {match.season?.name || match.season?.type || "Aktuelle Saison"}{match.week_number ? ` · ${match.week_number}` : ""}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4">
              <Info className="h-5 w-5 text-cyan-200" />
              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Status</div>
              <div className="mt-1 text-base font-black">{pending ? "Ergebnis offen" : "Beendet"}</div>
            </div>
          </div>

          {(match.notes || match.original_date || match.postponement_reason) && (
            <div className="mt-4 rounded-[26px] border border-orange-400/15 bg-orange-500/[0.06] p-5">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Zusatzinformationen</div>
              {match.original_date && match.original_date !== match.match_date && <div className="mt-3 text-sm font-semibold text-white/65">Ursprünglicher Termin: {formatDay(match.original_date)}</div>}
              {match.postponement_reason && <div className="mt-2 text-sm font-semibold text-white/65">Grund der Verschiebung: {match.postponement_reason}</div>}
              {match.notes && <div className="mt-2 text-sm font-semibold leading-6 text-white/65">{match.notes}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TerminalResultsPage() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [dartFilter, setDartFilter] = useState<DartFilter>("all")
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("all")
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all")
  const [seasonLabel, setSeasonLabel] = useState("Aktuelle Saison")
  const [detailMatch, setDetailMatch] = useState<Match | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: seasonRows }, { data: teamRows }, { data: opponentRows }] = await Promise.all([
        supabase.from("seasons").select("id, name, type, year, start_date, is_active").order("start_date", { ascending: false }),
        supabase.from("teams").select("id, name, logo_url, dart_type").not("user_id", "is", null).order("name"),
        supabase.from("opponent_teams").select("id, name, venue, venue_name").order("name"),
      ])

      const seasons = (seasonRows || []) as Season[]
      const activeSeason = seasons.find((s) => s.is_active) || seasons[0]
      const ownTeams = (teamRows || []) as Team[]
      const opponents = (opponentRows || []) as OpponentTeam[]

      setTeams(ownTeams)
      if (ownTeams[0]?.id) setSelectedTeamId(ownTeams[0].id)
      if (activeSeason) setSeasonLabel(`${activeSeason.name || activeSeason.type || "Saison"}${activeSeason.year ? ` ${activeSeason.year}` : ""}`)

      let query = supabase
        .from("matches")
        .select(`
          id, match_date, match_time, status, home_score, away_score, dart_type,
          home_team_id, away_team_id, home_opponent_team_id, away_opponent_team_id,
          venue, notes, week_number, original_date, postponement_reason,
          home_team:teams!matches_home_team_id_fkey(id, name, logo_url, dart_type),
          away_team:teams!matches_away_team_id_fkey(id, name, logo_url, dart_type),
          season:seasons(id, name, type, year)
        `)
        .order("match_date", { ascending: false })

      if (activeSeason?.id) query = query.eq("season_id", activeSeason.id)
      const { data: matchRows } = await query

      const enriched = ((matchRows || []) as Match[]).map((match) => ({
        ...match,
        home_opponent_team: match.home_opponent_team_id ? opponents.find((t) => t.id === match.home_opponent_team_id) || null : null,
        away_opponent_team: match.away_opponent_team_id ? opponents.find((t) => t.id === match.away_opponent_team_id) || null : null,
      }))
      setMatches(enriched)
      setLoading(false)
    }
    void load()
  }, [])

  const filtered = useMemo(() => {
    if (!selectedTeamId) return []
    const now = new Date()
    const monthAgo = new Date(now)
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    let list = matches
      .filter((m) => m.home_team_id === selectedTeamId || m.away_team_id === selectedTeamId)
      .filter((m) => m.status === "completed" || (m.status === "scheduled" && matchDateTime(m).getTime() < now.getTime()))
      .filter((m) => dartFilter === "all" || m.dart_type === dartFilter)
      .filter((m) => rangeFilter !== "month" || matchDateTime(m) >= monthAgo)
      .filter((m) => {
        if (resultFilter === "all") return true
        const r = resultForTeam(m, selectedTeamId)
        if (resultFilter === "wins") return r === "win"
        if (resultFilter === "draws") return r === "draw"
        if (resultFilter === "losses") return r === "loss"
        if (resultFilter === "pending") return r === "pending"
        return true
      })
      .sort((a, b) => matchDateTime(b).getTime() - matchDateTime(a).getTime())

    if (rangeFilter === "last5") list = list.slice(0, 5)
    if (rangeFilter === "last10") list = list.slice(0, 10)
    return list
  }, [matches, selectedTeamId, dartFilter, rangeFilter, resultFilter])

  const stats = useMemo(() => {
    let wins = 0, draws = 0, losses = 0, pending = 0
    filtered.forEach((m) => {
      const r = resultForTeam(m, selectedTeamId)
      if (r === "win") wins++
      else if (r === "draw") draws++
      else if (r === "loss") losses++
      else pending++
    })
    return { wins, draws, losses, pending }
  }, [filtered, selectedTeamId])

  if (loading) {
    return (
      <main className="relative min-h-[100svh] overflow-hidden bg-[#050608] text-white">
        <div className="pointer-events-none absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.48]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
        <div className="pointer-events-none absolute inset-0 bg-black/55" />
        <div className="relative flex min-h-[100svh] items-center justify-center px-6 text-center">
          <div>
            <div className="text-2xl font-black text-white">Ergebnisse</div>
            <div className="mt-2 text-xs font-black uppercase tracking-[0.28em] text-white/35">Daten werden vorbereitet</div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#060709] text-white">
      <div className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.58]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.38),rgba(4,6,9,.62)),radial-gradient(circle_at_10%_0%,rgba(249,115,22,.14),transparent_28%),radial-gradient(circle_at_100%_80%,rgba(14,165,233,.10),transparent_30%)]" />
      <div className="pointer-events-none fixed -left-24 bottom-[-10%] h-[48vh] w-[42vw] rounded-full bg-orange-500/12 blur-[120px]" />
      <div className="pointer-events-none fixed -right-24 bottom-[-8%] h-[46vh] w-[40vw] rounded-full bg-cyan-500/10 blur-[130px]" />

      <div className="relative mx-auto min-h-[100svh] max-w-[1560px] px-5 py-6 lg:px-8 lg:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TerminalLink href="/terminal/liga" label="Ligabereich wird geöffnet" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]">
              <ArrowLeft className="h-5 w-5" />
            </TerminalLink>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300/90">EMD Club Terminal</div>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">Ergebnisse</h1>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-right backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">Saison</div>
            <div className="mt-1 text-sm font-black text-white/70">{seasonLabel}</div>
          </div>
        </header>

        <section className="mt-7 overflow-hidden rounded-[32px] border border-white/[0.08] bg-black/24 p-5 backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-white/35"><Users className="h-4 w-4" /> Mannschaft</div>
              <div className="mt-2 text-2xl font-black">Ergebnisse von</div>
            </div>
            <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} style={{ colorScheme: "dark" }} className="h-14 min-w-[260px] appearance-none rounded-2xl border border-white/10 bg-[#0b0d10]/90 px-4 text-base font-black text-white outline-none focus:border-orange-400/35">
              {teams.map((team) => <option key={team.id} value={team.id} className="bg-[#0b0d10] text-white">{team.name}</option>)}
            </select>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {([['all','Alle'],['last5','Letzte 5'],['last10','Letzte 10'],['month','Letzter Monat']] as Array<[RangeFilter,string]>).map(([k,l]) => (
              <button key={k} onClick={() => setRangeFilter(k)} className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${rangeFilter===k ? 'border-orange-400/35 bg-orange-500 text-white' : 'border-white/10 bg-white/[0.035] text-white/55 hover:bg-white/[0.07]'}`}>{l}</button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {([['all','Alle Ergebnisse'],['wins','Siege'],['draws','Unentschieden'],['losses','Niederlagen'],['pending','Ausstehend']] as Array<[ResultFilter,string]>).map(([k,l]) => (
              <button key={k} onClick={() => setResultFilter(k)} className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${resultFilter===k ? 'border-cyan-300/30 bg-cyan-400/12 text-cyan-100' : 'border-white/10 bg-white/[0.025] text-white/45 hover:bg-white/[0.06]'}`}>{l}</button>
            ))}
            <div className="mx-1 hidden h-10 w-px bg-white/10 sm:block" />
            {([['all','Alle Darts'],['edart','E-Dart'],['steeldart','Steeldart']] as Array<[DartFilter,string]>).map(([k,l]) => (
              <button key={k} onClick={() => setDartFilter(k)} className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${dartFilter===k ? 'border-white/20 bg-white/[0.10] text-white' : 'border-white/10 bg-white/[0.025] text-white/45 hover:bg-white/[0.06]'}`}>{l}</button>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[26px] border border-emerald-400/20 bg-emerald-500/[0.07] p-4 backdrop-blur-xl"><div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/60">Siege</div><div className="mt-2 text-3xl font-black text-emerald-200">{stats.wins}</div></div>
          <div className="rounded-[26px] border border-amber-300/20 bg-amber-400/[0.07] p-4 backdrop-blur-xl"><div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/60">Unentschieden</div><div className="mt-2 text-3xl font-black text-amber-100">{stats.draws}</div></div>
          <div className="rounded-[26px] border border-rose-400/20 bg-rose-500/[0.07] p-4 backdrop-blur-xl"><div className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-200/60">Niederlagen</div><div className="mt-2 text-3xl font-black text-rose-200">{stats.losses}</div></div>
          <div className="rounded-[26px] border border-orange-300/20 bg-orange-400/[0.07] p-4 backdrop-blur-xl"><div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-200/60">Ausstehend</div><div className="mt-2 text-3xl font-black text-orange-200">{stats.pending}</div></div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[0.24em] text-white/30">Ergebnisse</div><div className="mt-1 text-2xl font-black">{filtered.length} Spiele gefunden</div></div><div className="hidden items-center gap-2 text-sm font-bold text-white/35 sm:flex"><Filter className="h-4 w-4" /> Live gefiltert</div></div>

          {filtered.length === 0 ? (
            <div className="mt-5 rounded-[30px] border border-dashed border-white/10 bg-black/18 p-10 text-center backdrop-blur-xl"><Target className="mx-auto h-12 w-12 text-white/20" /><div className="mt-4 text-xl font-black text-white/65">Keine Ergebnisse gefunden</div><div className="mt-2 text-sm font-semibold text-white/35">Passe Mannschaft oder Filter an.</div></div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((m) => <ResultCard key={m.id} match={m} selectedTeamId={selectedTeamId} onOpen={setDetailMatch} />)}</div>
          )}
        </section>

        <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5 text-[10px] font-black uppercase tracking-[0.28em] text-white/20"><span>EMD Club Terminal</span><span>Ergebnisse · Siege · Unentschieden · Niederlagen</span></footer>
      </div>

      {detailMatch && <ResultDetails match={detailMatch} selectedTeamId={selectedTeamId} onClose={() => setDetailMatch(null)} />}
    </main>
  )
}
