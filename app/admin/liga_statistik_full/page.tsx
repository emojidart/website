"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  ArrowLeft,
  RefreshCw,
  Trophy,
  Users,
  BarChart3,
  Crown,
  Shield,
  Search,
  Database,
  AlertTriangle,
  Info,
} from "lucide-react"


type DartTypeFilter = "gesamt" | "edart" | "steeldart"
type SortKey = "winpct" | "wins" | "legs" | "180" | "name"

type TeamRow = {
  id: string
  name: string
  logo_url: string | null
}

type TeamMemberRow = {
  id: string
  team_id: string
  player_id: string
  role: string | null
  joined_at: string | null
  left_at: string | null
  teams: TeamRow | null
  club_players: {
    id: string
    name: string
    photo_url: string | null
  } | null
}

type MatchRow = {
  id: string
  match_date: string | null
  match_time: string | null
  venue: string | null
  home_team_id: string | null
  away_team_id: string | null
  home_team_type: string | null
  away_team_type: string | null
  dart_type: "edart" | "steeldart" | null
  season_id?: string | null
  home_team?: { id: string; name: string } | null
  away_team?: { id: string; name: string } | null
  home_opponent_team?: { id: string; name: string } | null
  away_opponent_team?: { id: string; name: string } | null
  season?: { id: string; name: string; type: string | null } | null
}

type LegStatRow = {
  id: string
  match_id: string | null
  player_id: string
  leg_number?: number | null

  player_legs_won?: number | null
  opponent_legs_won?: number | null

  throws_180?: number | null
  throws_171?: number | null
  throws_20?: number | null
  throws_19?: number | null
  throws_18?: number | null
  throws_17?: number | null
  throws_16?: number | null
  throws_15?: number | null
  throws_high_tonne?: number | null
  throws_tonne?: number | null
  throws_shanghai?: number | null
  throws_95_plus?: number | null
  throws_bull?: number | null

  throws_under_26?: number | null
  throws_under_30?: number | null
  semperit_outs?: number | null

  dart_type?: "edart" | "steeldart" | null

  player?: { name: string | null; photo_url: string | null } | null
  matches?: MatchRow | null
}

type PlayerAgg = {
  player_id: string
  player_name: string
  photo_url: string | null

  total_legs: number
  total_wins: number
  win_percentage: number

  total_180: number
  total_171: number
  total_20: number
  total_19: number
  total_18: number
  total_17: number
  total_16: number
  total_15: number

  total_high_tonne: number
  total_tonne: number
  total_shanghai: number
  total_95_plus: number
  total_bull: number

  total_under_26: number
  total_under_30: number
  total_semperit: number
}

type TeamAgg = {
  team_id: string
  team_name: string
  logo_url: string | null
  members_current: TeamMemberRow[]
  players: PlayerAgg[]
  totals: Omit<PlayerAgg, "player_id" | "player_name" | "photo_url">
}

function safeNum(v: any) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function getTeamDisplayName(match: MatchRow, isHome: boolean) {
  if (!match) return "Unbekannt"
  if (isHome) {
    if (match.home_team?.name) return match.home_team.name
    if (match.home_opponent_team?.name) return match.home_opponent_team.name
  } else {
    if (match.away_team?.name) return match.away_team.name
    if (match.away_opponent_team?.name) return match.away_opponent_team.name
  }
  return "Unbekannt"
}

function initAgg(playerId: string, name: string, photo: string | null): PlayerAgg {
  return {
    player_id: playerId,
    player_name: name || "Unbekannt",
    photo_url: photo ?? null,

    total_legs: 0,
    total_wins: 0,
    win_percentage: 0,

    total_180: 0,
    total_171: 0,
    total_20: 0,
    total_19: 0,
    total_18: 0,
    total_17: 0,
    total_16: 0,
    total_15: 0,

    total_high_tonne: 0,
    total_tonne: 0,
    total_shanghai: 0,
    total_95_plus: 0,
    total_bull: 0,

    total_under_26: 0,
    total_under_30: 0,
    total_semperit: 0,
  }
}

function addStat(agg: PlayerAgg, stat: LegStatRow) {
  const legsPlayed = safeNum(stat.player_legs_won) + safeNum(stat.opponent_legs_won)
  const legsToAdd = legsPlayed > 0 ? legsPlayed : 1

  agg.total_legs += legsToAdd
  agg.total_wins += safeNum(stat.player_legs_won)

  agg.total_180 += safeNum(stat.throws_180)
  agg.total_171 += safeNum(stat.throws_171)
  agg.total_20 += safeNum(stat.throws_20)
  agg.total_19 += safeNum(stat.throws_19)
  agg.total_18 += safeNum(stat.throws_18)
  agg.total_17 += safeNum(stat.throws_17)
  agg.total_16 += safeNum(stat.throws_16)
  agg.total_15 += safeNum(stat.throws_15)

  agg.total_high_tonne += safeNum(stat.throws_high_tonne)
  agg.total_tonne += safeNum(stat.throws_tonne)
  agg.total_shanghai += safeNum(stat.throws_shanghai)
  agg.total_95_plus += safeNum(stat.throws_95_plus)
  agg.total_bull += safeNum(stat.throws_bull)

  agg.total_under_26 += safeNum(stat.throws_under_26)
  agg.total_under_30 += safeNum(stat.throws_under_30)
  agg.total_semperit += safeNum(stat.semperit_outs)
}

function calcWinPct(agg: PlayerAgg) {
  agg.win_percentage = agg.total_legs > 0 ? (agg.total_wins / agg.total_legs) * 100 : 0
}

function blankTotals(): TeamAgg["totals"] {
  return {
    total_legs: 0,
    total_wins: 0,
    win_percentage: 0,

    total_180: 0,
    total_171: 0,
    total_20: 0,
    total_19: 0,
    total_18: 0,
    total_17: 0,
    total_16: 0,
    total_15: 0,

    total_high_tonne: 0,
    total_tonne: 0,
    total_shanghai: 0,
    total_95_plus: 0,
    total_bull: 0,

    total_under_26: 0,
    total_under_30: 0,
    total_semperit: 0,
  }
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 border border-gray-100 px-2 py-1">
      <span className="text-[11px] font-semibold text-gray-600">{label}</span>
      <span className="text-[12px] font-black text-gray-900 tabular-nums">{value}</span>
    </div>
  )
}

function TeamSummary({ team }: { team: TeamAgg }) {
  const penalties = team.totals.total_under_26 + team.totals.total_under_30 + team.totals.total_semperit
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground font-semibold">Aktive Spieler</div>
            <Users className="h-4 w-4 text-orange-600" />
          </div>
          <div className="mt-2 text-2xl font-black">{team.members_current.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Roster (left_at = NULL)</div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground font-semibold">Legs / Wins</div>
            <Trophy className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black">
            {team.totals.total_legs} <span className="text-base font-bold text-gray-500">/</span> {team.totals.total_wins}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Win% {team.totals.win_percentage.toFixed(1)}%</div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground font-semibold">Highlights</div>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-purple-50 text-purple-800 border border-purple-100">
              180: {team.totals.total_180}
            </Badge>
            <Badge variant="secondary" className="bg-orange-50 text-orange-800 border border-orange-100">
              171: {team.totals.total_171}
            </Badge>
            <Badge variant="secondary" className="bg-red-50 text-red-800 border border-red-100">
              Pen.: {penalties}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PlayerRow({ p, rank }: { p: PlayerAgg; rank: number }) {
  const penalties = p.total_under_26 + p.total_under_30 + p.total_semperit
  const top = rank <= 3 && p.total_wins > 0
  return (
    <Card className={`border ${top ? "border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50" : "border-gray-200 bg-white"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {top ? <Crown className="h-4 w-4 text-amber-600" /> : <Shield className="h-4 w-4 text-gray-400" />}
              <div className="font-black text-gray-900 truncate">{p.player_name}</div>
              <Badge variant="outline" className="text-[11px]">#{rank}</Badge>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-green-50 text-green-800 border border-green-100">
                {p.total_wins} Wins
              </Badge>
              <Badge variant="secondary" className="bg-blue-50 text-blue-800 border border-blue-100">
                {p.total_legs} Legs
              </Badge>
              <Badge variant="outline" className="text-xs">
                {p.win_percentage.toFixed(1)}%
              </Badge>
              {penalties > 0 && (
                <Badge variant="secondary" className="bg-red-50 text-red-800 border border-red-100">
                  Pen. {penalties}
                </Badge>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-gray-500 font-semibold">180</div>
            <div className="text-2xl font-black text-purple-700 tabular-nums">{p.total_180}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <StatPill label="171" value={p.total_171} />
          <StatPill label="20" value={p.total_20} />
          <StatPill label="19" value={p.total_19} />
          <StatPill label="18" value={p.total_18} />
          <StatPill label="High Ton" value={p.total_high_tonne} />
          <StatPill label="95+" value={p.total_95_plus} />
          <StatPill label="Ton" value={p.total_tonne} />
          <StatPill label="Shanghai" value={p.total_shanghai} />
          <StatPill label="Bull" value={p.total_bull} />
          <StatPill label="U26" value={p.total_under_26} />
          <StatPill label="U30" value={p.total_under_30} />
          <StatPill label="Semp" value={p.total_semperit} />
        </div>
      </CardContent>
    </Card>
  )
}

type MembershipInterval = {
  team_id: string
  joined_at: string | null
  left_at: string | null
}

function dateInInterval(matchDate: string | null, joinedAt: string | null, leftAt: string | null) {
  if (!matchDate) return false
  const m = new Date(matchDate).getTime()
  const j = joinedAt ? new Date(joinedAt).getTime() : -Infinity
  const l = leftAt ? new Date(leftAt).getTime() : Infinity
  return m >= j && m <= l
}

export default function AdminTeamPlayerStatisticsSeasonCorrectPage() {
  const router = useRouter()
  const { user, isAdmin, loading: authLoading, adminLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const [teams, setTeams] = useState<TeamRow[]>([])
  const [teamMembersHistory, setTeamMembersHistory] = useState<TeamMemberRow[]>([])
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [legStats, setLegStats] = useState<LegStatRow[]>([])

  const [dartTypeFilter, setDartTypeFilter] = useState<DartTypeFilter>("gesamt")
  const [searchText, setSearchText] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("winpct")

  // paging info
  const [legPagesLoaded, setLegPagesLoaded] = useState(0)
  const [legRowsLoaded, setLegRowsLoaded] = useState(0)

  useEffect(() => {
    if (!authLoading && !user) router.push("/member-login")
  }, [user, authLoading, router])

  const fetchAll = async () => {
    if (!user || !isAdmin) return
    setLoading(true)
    setErrMsg(null)
    setLegPagesLoaded(0)
    setLegRowsLoaded(0)

    try {
      // 1) Teams
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, logo_url")
        .order("name", { ascending: true })

      if (teamsError) throw teamsError
      const teamRows = (teamsData || []) as TeamRow[]
      setTeams(teamRows)

      const teamIds = teamRows.map((t) => t.id)
      if (!teamIds.length) {
        setTeamMembersHistory([])
        setMatches([])
        setLegStats([])
        return
      }

      // 2) Team Members (HISTORY) -> includes joined_at/left_at
      // IMPORTANT: do NOT filter left_at here; we need history for season-correct attribution
      const { data: membersData, error: membersError } = await supabase
        .from("team_members")
        .select(
          `
          id,
          team_id,
          player_id,
          role,
          joined_at,
          left_at,
          teams (id, name, logo_url),
          club_players (id, name, photo_url)
        `,
        )
        .in("team_id", teamIds)

      if (membersError) throw membersError
      const memberRows = (membersData || []) as TeamMemberRow[]
      setTeamMembersHistory(memberRows)

      // 3) Matches (ALL teams), filter by dart-type if set
      let matchQuery = supabase
        .from("matches")
        .select(
          `
          id,
          match_date,
          match_time,
          venue,
          home_team_id,
          away_team_id,
          home_team_type,
          away_team_type,
          dart_type,
          season_id,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name),
          home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
          away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name),
          season:seasons(id, name, type)
        `,
        )

      if (dartTypeFilter !== "gesamt") matchQuery = matchQuery.eq("dart_type", dartTypeFilter)

      const { data: matchData, error: matchError } = await matchQuery
      if (matchError) throw matchError

      const matchRows = (matchData || []) as MatchRow[]
      setMatches(matchRows)

      const matchIdSet = new Set(matchRows.map((m) => m.id))
      if (matchIdSet.size === 0) {
        setLegStats([])
        return
      }

      // 4) leg_statistics paginated
      const pageSize = 5000
      let from = 0
      let all: LegStatRow[] = []

      while (true) {
        let legQuery = supabase
          .from("leg_statistics")
          .select(
            `
            *,
            player:club_players!leg_statistics_player_id_fkey(name, photo_url),
            matches (
              id,
              match_date,
              match_time,
              venue,
              home_team_id,
              away_team_id,
              home_team_type,
              away_team_type,
              dart_type,
              season_id,
              home_team:teams!matches_home_team_id_fkey(id, name),
              away_team:teams!matches_away_team_id_fkey(id, name),
              home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
              away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name),
              season:seasons(id, name, type)
            )
          `,
          )
          .range(from, from + pageSize - 1)

        if (dartTypeFilter !== "gesamt") legQuery = legQuery.eq("dart_type", dartTypeFilter)

        const { data: legData, error: legError } = await legQuery
        if (legError) throw legError

        const rows = (legData || []) as LegStatRow[]
        const filtered = rows.filter((r) => !!r.match_id && matchIdSet.has(r.match_id as any))
        all = all.concat(filtered)

        setLegPagesLoaded((p) => p + 1)
        setLegRowsLoaded((n) => n + rows.length)

        if (rows.length < pageSize) break
        from += pageSize
      }

      setLegStats(all)
    } catch (e: any) {
      console.error(e)
      setErrMsg(e?.message ?? "Fehler beim Laden.")
      setTeams([])
      setTeamMembersHistory([])
      setMatches([])
      setLegStats([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user || !isAdmin) return
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin, dartTypeFilter])

  // Build membership intervals: player -> intervals (team_id, joined_at, left_at)
  const membershipByPlayer = useMemo(() => {
    const map = new Map<string, MembershipInterval[]>()
    for (const m of teamMembersHistory) {
      if (!map.has(m.player_id)) map.set(m.player_id, [])
      map.get(m.player_id)!.push({ team_id: m.team_id, joined_at: m.joined_at, left_at: m.left_at })
    }
    // sort by joined_at asc (helps with predictable matching)
    for (const [pid, arr] of map.entries()) {
      arr.sort((a, b) => (a.joined_at || "").localeCompare(b.joined_at || ""))
      map.set(pid, arr)
    }
    return map
  }, [teamMembersHistory])

  // Build TeamAgg[] season-correct
  const teamsAgg = useMemo<TeamAgg[]>(() => {
    if (!teams.length) return []

    const teamMap: Record<string, TeamAgg> = {}
    for (const t of teams) {
      teamMap[t.id] = {
        team_id: t.id,
        team_name: t.name,
        logo_url: t.logo_url ?? null,
        members_current: [],
        players: [],
        totals: blankTotals(),
      }
    }

    // current roster (left_at null)
    for (const tm of teamMembersHistory) {
      if (teamMap[tm.team_id] && !tm.left_at) teamMap[tm.team_id].members_current.push(tm)
    }

    const teamPlayerAgg: Record<string, Record<string, PlayerAgg>> = {}
    for (const id of Object.keys(teamMap)) teamPlayerAgg[id] = {}

    for (const s of legStats) {
      const match = s.matches
      if (!match) continue

      const matchTeamIds: string[] = []
      if (match.home_team_id && teamMap[match.home_team_id]) matchTeamIds.push(match.home_team_id)
      if (match.away_team_id && teamMap[match.away_team_id]) matchTeamIds.push(match.away_team_id)
      if (!matchTeamIds.length) continue

      // find which of the two match teams the player belonged to at match_date
      const intervals = membershipByPlayer.get(s.player_id) || []
      const eligibleTeamIds = matchTeamIds.filter((tid) =>
        intervals.some((it) => it.team_id === tid && dateInInterval(match.match_date, it.joined_at, it.left_at)),
      )

      // if we can't resolve, skip (prevents wrong attribution to both teams)
      if (eligibleTeamIds.length !== 1) continue
      const teamId = eligibleTeamIds[0]

      if (!teamPlayerAgg[teamId][s.player_id]) {
        teamPlayerAgg[teamId][s.player_id] = initAgg(
          s.player_id,
          s.player?.name ?? "Unbekannt",
          s.player?.photo_url ?? null,
        )
      }
      addStat(teamPlayerAgg[teamId][s.player_id], s)
    }

    for (const teamId of Object.keys(teamMap)) {
      const players = Object.values(teamPlayerAgg[teamId] || {})
      players.forEach(calcWinPct)

      const totals = blankTotals()
      for (const p of players) {
        totals.total_legs += p.total_legs
        totals.total_wins += p.total_wins

        totals.total_180 += p.total_180
        totals.total_171 += p.total_171
        totals.total_20 += p.total_20
        totals.total_19 += p.total_19
        totals.total_18 += p.total_18
        totals.total_17 += p.total_17
        totals.total_16 += p.total_16
        totals.total_15 += p.total_15

        totals.total_high_tonne += p.total_high_tonne
        totals.total_tonne += p.total_tonne
        totals.total_shanghai += p.total_shanghai
        totals.total_95_plus += p.total_95_plus
        totals.total_bull += p.total_bull

        totals.total_under_26 += p.total_under_26
        totals.total_under_30 += p.total_under_30
        totals.total_semperit += p.total_semperit
      }
      totals.win_percentage = totals.total_legs > 0 ? (totals.total_wins / totals.total_legs) * 100 : 0

      teamMap[teamId].players = players
      teamMap[teamId].totals = totals
    }

    return Object.values(teamMap).sort((a, b) => a.team_name.localeCompare(b.team_name))
  }, [teams, teamMembersHistory, legStats, membershipByPlayer])

  const defaultTeamId = useMemo(() => teamsAgg[0]?.team_id ?? "none", [teamsAgg])

  const sortPlayers = (players: PlayerAgg[]) => {
    const list = [...players]
    const key = sortKey
    list.sort((a, b) => {
      if (key === "name") return a.player_name.localeCompare(b.player_name)
      if (key === "180") return b.total_180 - a.total_180 || b.win_percentage - a.win_percentage
      if (key === "legs") return b.total_legs - a.total_legs || b.total_wins - a.total_wins
      if (key === "wins") return b.total_wins - a.total_wins || b.win_percentage - a.win_percentage
      return b.win_percentage - a.win_percentage || b.total_wins - a.total_wins || b.total_180 - a.total_180
    })
    return list
  }

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <main className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="inline-flex items-center gap-2 justify-center">
                <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-700 font-semibold">Lade…</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <main className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow">
          <Card className="w-full max-w-md">
            <CardTitle className="p-6 pb-0 text-center font-black text-red-700">Kein Zugriff</CardTitle>
            <CardContent className="p-6 text-center">
              <p className="mb-4 text-gray-700">Sie benötigen Admin-Rechte.</p>
              <Button onClick={() => router.push("/admin")} className="w-full">
                Zurück zur Admin-Seite
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-4 max-w-7xl">
        {/* Top */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin")}
              className="flex items-center gap-2 mb-3 border-2 border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </Button>

            <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-2">
              <Database className="h-6 w-6 text-orange-600" />
             ALLE → Spieler Statistiken
            </h1>

            <div className="mt-2 flex items-start gap-2 text-sm text-gray-700">
              <Info className="h-4 w-4 text-blue-600 mt-[2px]" />
              <div>
                Diese Seite ordnet Spielerstats dem Team anhand <span className="font-bold">joined_at/left_at</span> zum Match-Datum zu.
                Wenn ein Spieler später entfernt wird, bleibt die Saison-Historie sichtbar.
              </div>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={fetchAll} className="flex items-center gap-2" title="Neu laden">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm bg-white mb-4">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
              <div className="flex gap-2 flex-wrap">
                <Button variant={dartTypeFilter === "gesamt" ? "default" : "outline"} size="sm" onClick={() => setDartTypeFilter("gesamt")}>
                  Gesamt
                </Button>
                <Button variant={dartTypeFilter === "edart" ? "default" : "outline"} size="sm" onClick={() => setDartTypeFilter("edart")}>
                  E-Dart
                </Button>
                <Button variant={dartTypeFilter === "steeldart" ? "default" : "outline"} size="sm" onClick={() => setDartTypeFilter("steeldart")}>
                  Steeldart
                </Button>
              </div>

              <div className="flex-1" />

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full lg:w-auto">
                <div className="relative w-full sm:w-[280px]">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Spieler suchen…"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>

                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="w-full sm:w-[220px] py-2 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
                >
                  <option value="winpct">Sortierung: Win%</option>
                  <option value="wins">Sortierung: Wins</option>
                  <option value="legs">Sortierung: Legs</option>
                  <option value="180">Sortierung: 180</option>
                  <option value="name">Sortierung: Name</option>
                </select>
              </div>
            </div>

            {loading && (
              <div className="mt-3 text-xs text-gray-600 font-semibold flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                Lade leg_statistics… Seiten: {legPagesLoaded} • Rows: {legRowsLoaded}
              </div>
            )}
          </CardContent>
        </Card>

        {/* States */}
        {loading ? (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6 text-center text-gray-700 font-semibold">
              <div className="inline-flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                Lade komplette Übersicht…
              </div>
            </CardContent>
          </Card>
        ) : errMsg ? (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6 text-center">
              <div className="font-black text-red-700 flex items-center justify-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Fehler
              </div>
              <div className="text-sm text-gray-700 mt-1">{errMsg}</div>
            </CardContent>
          </Card>
        ) : teamsAgg.length === 0 ? (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6 text-center text-gray-700">
              <div className="font-black text-lg">Keine Teams gefunden</div>
              <div className="text-sm text-gray-600 mt-1">In der DB sind aktuell keine Teams vorhanden.</div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={defaultTeamId} className="w-full">
            <TabsList className="w-full flex flex-wrap justify-start gap-2 bg-transparent p-0 mb-4">
              {teamsAgg.map((t) => (
                <TabsTrigger
                  key={t.team_id}
                  value={t.team_id}
                  className="data-[state=active]:bg-orange-600 data-[state=active]:text-white bg-white border border-gray-200 rounded-xl px-4 py-2 font-black"
                >
                  {t.team_name}
                </TabsTrigger>
              ))}
            </TabsList>

            {teamsAgg.map((team) => {
              const q = searchText.trim().toLowerCase()
              const filteredPlayers = q
                ? team.players.filter((p) => p.player_name.toLowerCase().includes(q))
                : team.players

              const sortedPlayers = sortPlayers(filteredPlayers)

              return (
                <TabsContent key={team.team_id} value={team.team_id} className="space-y-4">
                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-amber-600" />
                          <span className="text-xl sm:text-2xl font-black">{team.team_name}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-800 border border-blue-100">
                            Aktive Mitglieder: {team.members_current.length}
                          </Badge>
                          <Badge variant="secondary" className="bg-indigo-50 text-indigo-800 border border-indigo-100">
                            Spieler (Stats): {team.players.length}
                          </Badge>
                          <Badge variant="secondary" className="bg-green-50 text-green-800 border border-green-100">
                            Wins: {team.totals.total_wins}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Win% {team.totals.win_percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </CardTitle>

                      {(() => {
                        const m = matches
                          .filter((x) => x.home_team_id === team.team_id || x.away_team_id === team.team_id)
                          .sort((a, b) => (b.match_date || "").localeCompare(a.match_date || ""))[0]
                        if (!m?.match_date) return null
                        const d = new Date(m.match_date).toLocaleDateString("de-DE")
                        return (
                          <div className="text-xs text-gray-600 font-semibold mt-1">
                            Letztes Spiel: {d} • {getTeamDisplayName(m, true)} vs {getTeamDisplayName(m, false)}
                          </div>
                        )
                      })()}
                    </CardHeader>

                    <CardContent className="p-4 sm:p-6 space-y-4">
                      <TeamSummary team={team} />

                      {sortedPlayers.length === 0 ? (
                        <div className="text-center py-10 text-gray-600">
                          <div className="font-black">Keine Spieler gefunden</div>
                          <div className="text-sm text-gray-500 mt-1">Suche ändern oder Filter zurücksetzen.</div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {sortedPlayers.map((p, idx) => (
                            <PlayerRow key={p.player_id} p={p} rank={idx + 1} />
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
                       
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )
            })}
          </Tabs>
        )}
      </main>
    </div>
  )
}
