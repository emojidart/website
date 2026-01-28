"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { createBrowserClient } from "@supabase/ssr"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Crown, Medal, Trophy, Users } from "lucide-react"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

type DartType = "gesamt" | "edart" | "steeldart"

type Season = {
  id: string | number
  name: string
  type?: string | null
}

type Team = {
  id: string | number
  name: string
  logo_url?: string | null
}

type TeamMember = {
  team_id: string | number
  club_players?: { id: string | number; name: string; photo_url?: string | null } | null
  teams?: { id: string | number; name: string } | null
}

type MatchMini = {
  id: string | number
  season_id?: string | number | null
  dart_type?: string | null
}

type LegStat = {
  id?: string | number
  player_id: string | number
  match_id?: string | number | null
  dart_type?: string | null
  throws_180?: number | null
  throws_171?: number | null
  throws_high_tonne?: number | null
  throws_tonne?: number | null
  throws_95_plus?: number | null
  throws_shanghai?: number | null
  throws_bull?: number | null
  throws_20?: number | null
  throws_19?: number | null
  throws_18?: number | null
  throws_17?: number | null
  throws_16?: number | null
  throws_15?: number | null
  player_legs_won?: number | null
  opponent_legs_won?: number | null
  // join
  player?: { name?: string | null; photo_url?: string | null } | null
  match?: MatchMini | null
  matches?: MatchMini | null // fallback if the join key name differs
}

function safeNum(n: any) {
  return typeof n === "number" && Number.isFinite(n) ? n : 0
}

// Punkte-Logik: 1:1 aus deiner Statistik-Seite übernommen (inkl. detailed throws_15..19)
function calculatePlayerPoints(base: any, detailed: any) {
  const legWinPoints = safeNum(base.total_wins) * 3
  const throw180Points = safeNum(base.throws_180) * 25
  const throw171Points = safeNum(base.throws_171) * 25
  const highTonnePoints = safeNum(base.throws_high_tonne) * 18
  const tonnePoints = safeNum(base.throws_tonne) * 15
  const throw95PlusPoints = safeNum(base.throws_95_plus) * 12
  const shanghaiPoints = safeNum(base.throws_shanghai) * 10
  const bullPoints = safeNum(base.throws_bull) * 8
  const throw20Points = safeNum(base.throws_20) * 6
  const throw19Points = safeNum(detailed.throws_19) * 5
  const throw18Points = safeNum(detailed.throws_18) * 4
  const throw17Points = safeNum(detailed.throws_17) * 3
  const throw16Points = safeNum(detailed.throws_16) * 2
  const throw15Points = safeNum(detailed.throws_15) * 1

  return (
    legWinPoints +
    throw180Points +
    throw171Points +
    highTonnePoints +
    tonnePoints +
    throw95PlusPoints +
    shanghaiPoints +
    bullPoints +
    throw20Points +
    throw19Points +
    throw18Points +
    throw17Points +
    throw16Points +
    throw15Points
  )
}

function medalIcon(rank: 1 | 2 | 3) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-600" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-500" />
  return <Medal className="h-5 w-5 text-amber-700" />
}

function podiumLabel(rank: 1 | 2 | 3) {
  if (rank === 1) return "1. Platz"
  if (rank === 2) return "2. Platz"
  return "3. Platz"
}

export default function HallOfFamePage() {
  const [loading, setLoading] = useState(true)
  const [dartType, setDartType] = useState<DartType>("gesamt")
  const [seasons, setSeasons] = useState<Season[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<
    { id: string | number; name: string; photo_url?: string | null; team_id: string | number; team_name?: string }[]
  >([])
  const [legStatistics, setLegStatistics] = useState<LegStat[]>([])
  const [matchesById, setMatchesById] = useState<Map<string | number, MatchMini>>(new Map())
  const [lineupTeamByMatchPlayer, setLineupTeamByMatchPlayer] = useState<Map<string, string | number>>(new Map())
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // 1) Seasons
        const { data: seasonsData, error: seasonsError } = await supabase
          .from("seasons")
          .select("id, name, type")
          .order("name", { ascending: false })

        if (seasonsError) console.error("Error fetching seasons:", seasonsError)
        const seasonList = (seasonsData || []) as Season[]
        setSeasons(seasonList)
        if (!selectedSeasonId && seasonList.length > 0) setSelectedSeasonId(String(seasonList[0].id))

        // 2) Teams (nur eigene Teams wie auf der Liga-Seite)
        const { data: ownTeamsData, error: teamsError } = await supabase
          .from("teams")
          .select("id, name, logo_url")
          .not("user_id", "is", null)
          .order("name")

        if (teamsError) console.error("Error fetching teams:", teamsError)
        setTeams((ownTeamsData || []) as Team[])

        // 3) Team members / players
        const { data: membersData, error: membersError } = await supabase
          .from("team_members")
          .select(
            `
            team_id,
            club_players ( id, name, photo_url ),
            teams ( id, name )
          `
          )
          .order("club_players(name)")

        if (membersError) console.error("Error fetching team_members:", membersError)
        const transformed =
          (membersData as TeamMember[] | null)?.map((m) => ({
            id: m.club_players?.id as any,
            name: (m.club_players?.name || "Unbekannt") as any,
            photo_url: m.club_players?.photo_url || null,
            team_id: m.team_id as any,
            team_name: m.teams?.name || "",
          })) || []
        setPlayers(transformed.filter((p) => p.id))

        // 4) Matches map (für season_id + dart_type Filter auf LegStats)
        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select("id, season_id, dart_type")

        if (matchesError) console.error("Error fetching matches (mini):", matchesError)

        const m = new Map<string | number, MatchMini>()
        ;(matchesData || []).forEach((row: any) => {
          m.set(row.id, { id: row.id, season_id: row.season_id, dart_type: row.dart_type })
        })
        setMatchesById(m)

        // Match Lineups: Team pro Spieler pro Match (historisch korrekt)
        const { data: lineupData, error: lineupError } = await supabase
          .from("match_lineups")
          .select("match_id, team_id, player_id")

        if (lineupError) console.error("Error fetching match_lineups:", lineupError)

        const lm = new Map<string, string | number>()
        ;(lineupData || []).forEach((row: any) => {
          if (row?.match_id && row?.player_id && row?.team_id != null) {
            lm.set(`${row.match_id}:${row.player_id}`, row.team_id)
          }
        })
        setLineupTeamByMatchPlayer(lm)

        // 5) Leg statistics (inkl. player join)
        // Wir holen möglichst match_id + dart_type, und optional ein Join auf matches.
        // Falls deine DB den Join-Namen anders hat, nutzen wir später fallback über matchesById.
        let legStatsQuery = supabase
          .from("leg_statistics")
          .select(
            `
            *,
            player:club_players!leg_statistics_player_id_fkey(name, photo_url),
            match:matches(id, season_id, dart_type)
          `
          )

        if (dartType !== "gesamt") legStatsQuery = legStatsQuery.eq("dart_type", dartType)

        const { data: legStatsData, error: legStatsError } = await legStatsQuery

        if (legStatsError) {
          console.error("Error fetching leg_statistics:", legStatsError)
          // Fallback ohne Join (damit die Seite nicht komplett leer bleibt)
          const fallback = await supabase
            .from("leg_statistics")
            .select(`*, player:club_players!leg_statistics_player_id_fkey(name, photo_url)`)
          if (fallback.error) console.error("Fallback leg_statistics failed:", fallback.error)
          setLegStatistics(((fallback.data as any) || []) as LegStat[])
        } else {
          setLegStatistics(((legStatsData as any) || []) as LegStat[])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dartType])

  const selectedSeason = useMemo(() => {
    const s = seasons.find((x) => String(x.id) === String(selectedSeasonId))
    return s || null
  }, [seasons, selectedSeasonId])

  const seasonFilteredLegStats = useMemo(() => {
    if (!selectedSeasonId) return legStatistics

    // Wir versuchen season_id über join (stat.match?.season_id) zu bekommen,
    // ansonsten via matchesById Map anhand match_id.
    return legStatistics.filter((stat) => {
      const joined = (stat.match || stat.matches) as any
      const seasonIdFromJoin = joined?.season_id
      const matchId = (stat.match_id ?? joined?.id) as any
      const seasonIdFromMap = matchId != null ? matchesById.get(matchId)?.season_id : undefined

      const seasonId = seasonIdFromJoin ?? seasonIdFromMap
      if (seasonId == null) return false
      return String(seasonId) === String(selectedSeasonId)
    })
  }, [legStatistics, matchesById, selectedSeasonId])

  const hallOfFameByTeam = useMemo(() => {
    // Map: team_id -> Map: player_id -> aggregated stats
    const byTeam: Record<string, any> = {}


    // Aggregate
    seasonFilteredLegStats.forEach((stat) => {
      const playerId = stat.player_id

      const matchIdForTeam = (stat.match_id ?? (stat.match as any)?.id ?? (stat.matches as any)?.id) as any
      const teamId =
        matchIdForTeam != null ? lineupTeamByMatchPlayer.get(`${matchIdForTeam}:${playerId}`) : undefined
      if (!teamId) return // ohne Lineup keine sichere Team-Zuordnung

      const teamKey = String(teamId)
      if (!byTeam[teamKey]) byTeam[teamKey] = new Map<string | number, any>()

      const teamMap: Map<string | number, any> = byTeam[teamKey]
      if (!teamMap.has(playerId)) {
        teamMap.set(playerId, {
          player_id: playerId,
          name: stat.player?.name || "Unbekannt",
          photo_url: stat.player?.photo_url || null,
          total_legs: 0,
          total_wins: 0,
          throws_180: 0,
          throws_171: 0,
          throws_high_tonne: 0,
          throws_tonne: 0,
          throws_95_plus: 0,
          throws_shanghai: 0,
          throws_bull: 0,
          throws_20: 0,
          throws_19: 0,
          throws_18: 0,
          throws_17: 0,
          throws_16: 0,
          throws_15: 0,
        })
      }

      const agg = teamMap.get(playerId)
      const legsWon = safeNum(stat.player_legs_won)
      const oppWon = safeNum(stat.opponent_legs_won)
      const legsInMatch = legsWon + oppWon

      agg.total_legs += legsInMatch
      agg.total_wins += legsWon
      agg.throws_180 += safeNum(stat.throws_180)
      agg.throws_171 += safeNum(stat.throws_171)
      agg.throws_high_tonne += safeNum(stat.throws_high_tonne)
      agg.throws_tonne += safeNum(stat.throws_tonne)
      agg.throws_95_plus += safeNum(stat.throws_95_plus)
      agg.throws_shanghai += safeNum(stat.throws_shanghai)
      agg.throws_bull += safeNum(stat.throws_bull)
      agg.throws_20 += safeNum(stat.throws_20)
      agg.throws_19 += safeNum(stat.throws_19)
      agg.throws_18 += safeNum(stat.throws_18)
      agg.throws_17 += safeNum(stat.throws_17)
      agg.throws_16 += safeNum(stat.throws_16)
      agg.throws_15 += safeNum(stat.throws_15)
    })

    // Convert to arrays, compute points, sort, pick top 3
    const result: Record<string, any[]> = {}
    Object.entries(byTeam).forEach(([teamId, teamMapAny]) => {
      const teamMap = teamMapAny as Map<any, any>
      const list = Array.from(teamMap.values())
        .map((p) => {
          const total_points = calculatePlayerPoints(p, p)
          const win_percentage = p.total_legs > 0 ? (p.total_wins / p.total_legs) * 100 : 0
          return { ...p, total_points, win_percentage }
        })
        .sort((a, b) => {
          if (b.total_points !== a.total_points) return b.total_points - a.total_points
          if (b.total_wins !== a.total_wins) return b.total_wins - a.total_wins
          return b.throws_180 - a.throws_180
        })

      result[teamId] = list.slice(0, 3)
    })

    return result
  }, [players, seasonFilteredLegStats])

  const visibleTeams = useMemo(() => {
    // Nur Teams zeigen, wo es auch Top-3 Daten gibt
    return teams
      .map((t) => ({
        ...t,
        hof: hallOfFameByTeam[String(t.id)] || [],
      }))
      .filter((t) => t.hof.length > 0)
  }, [teams, hallOfFameByTeam])

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 font-sans">
        <Header />
        <main className="pt-8 pb-24">
          <div className="container mx-auto px-4 md:px-6 py-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-6" />
              <p className="mt-2 text-gray-600">Lade Hall of Fame...</p>
            </div>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <main className="container mx-auto px-4 py-8 pb-24">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-2 sm:px-4 md:px-6">
          <motion.div variants={itemVariants} className="text-center mb-8 sm:mb-12">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-5 sm:p-8 md:p-12 text-white">
              <div className="bg-white/10 rounded-full p-3 sm:p-4 w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 backdrop-blur-sm">
                <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-white mx-auto" />
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-2 sm:mb-4">
                <span className="block text-white">HALL OF FAME</span>
                <span className="block text-orange-200">{selectedSeason?.name || "Saison"}</span>
              </h1>
              <p className="text-sm sm:text-lg md:text-xl font-bold uppercase text-orange-100">
                Top 3 Spieler pro Team – modern & clean
              </p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-center gap-3 sm:gap-4">
              <div className="flex-1 max-w-xl">
                <div className="text-xs uppercase tracking-wide text-gray-600 mb-2">Saison</div>
                <Select value={selectedSeasonId} onValueChange={(v) => setSelectedSeasonId(v)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Saison auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((s) => (
                      <SelectItem key={String(s.id)} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 max-w-xl">
                <div className="text-xs uppercase tracking-wide text-gray-600 mb-2">Dart-Typ</div>
                <Tabs value={dartType} onValueChange={(v) => setDartType(v as DartType)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="gesamt">Gesamt</TabsTrigger>
                    <TabsTrigger value="edart">E-Dart</TabsTrigger>
                    <TabsTrigger value="steeldart">Steeldart</TabsTrigger>
                  </TabsList>
                  <TabsContent value={dartType} />
                </Tabs>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>
                Es werden nur Teams angezeigt, für die es in dieser Saison Statistiken gibt.
              </span>
            </div>
          </motion.div>

          {visibleTeams.length === 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-orange-600" />
                    Keine Daten
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Für die ausgewählte Saison wurden keine (zuordenbaren) Spieler-Statistiken gefunden.
                  <div className="mt-3 text-xs text-gray-500">
                    Tipp: Stelle sicher, dass leg_statistics mit match_id auf matches zeigt und matches.season_id gesetzt ist.
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="grid gap-4 sm:gap-6">
              {visibleTeams.map((team) => (
                <Card key={String(team.id)} className="overflow-hidden shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {team.logo_url ? (
                          <img
                            src={team.logo_url || "/placeholder.svg"}
                            alt={`${team.name} Logo`}
                            className="w-12 h-12 rounded-full object-cover border-2 border-orange-200"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                            <Trophy className="h-6 w-6 text-orange-600" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg sm:text-xl font-bold text-gray-900">{team.name}</CardTitle>
                          <div className="text-xs text-gray-600 uppercase tracking-wide">
                            Top 3 – {selectedSeason?.name || "Saison"}
                          </div>
                        </div>
                      </div>

                      <Badge className="bg-orange-600 text-white font-semibold">
                        {dartType === "gesamt" ? "Gesamt" : dartType === "edart" ? "E-Dart" : "Steeldart"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                      {team.hof.map((p, idx) => {
                        const rank = (idx + 1) as 1 | 2 | 3
                        return (
                          <div
                            key={String(p.player_id)}
                            className={`rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all p-4 sm:p-5 ${
                              rank === 1 ? "border-yellow-200" : rank === 2 ? "border-gray-200" : "border-amber-200"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {medalIcon(rank)}
                                <div className="text-sm font-semibold text-gray-900">{podiumLabel(rank)}</div>
                              </div>
                              <Badge
                                className={`${
                                  rank === 1
                                    ? "bg-yellow-100 text-yellow-800"
                                    : rank === 2
                                      ? "bg-gray-100 text-gray-800"
                                      : "bg-amber-100 text-amber-900"
                                }`}
                              >
                                {p.total_points} Punkte
                              </Badge>
                            </div>

                            <div className="flex items-center gap-3">
                              {p.photo_url ? (
                                <img
                                  src={p.photo_url || "/placeholder.svg"}
                                  alt={p.name}
                                  className="w-12 h-12 rounded-full object-cover border"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-100 border flex items-center justify-center">
                                  <span className="text-sm font-semibold text-gray-500">{String(p.name || "?").slice(0, 1)}</span>
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 truncate">{p.name}</div>
                                <div className="text-xs text-gray-600">
                                  Wins: <span className="font-semibold">{p.total_wins}</span> · Legs:{" "}
                                  <span className="font-semibold">{p.total_legs}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                              <div className="rounded-lg bg-gray-50 border p-2 text-center">
                                <div className="font-bold text-gray-900">{Math.round(p.win_percentage)}%</div>
                                <div className="text-gray-600">Win%</div>
                              </div>
                              <div className="rounded-lg bg-gray-50 border p-2 text-center">
                                <div className="font-bold text-gray-900">{p.throws_180}</div>
                                <div className="text-gray-600">180</div>
                              </div>
                              <div className="rounded-lg bg-gray-50 border p-2 text-center">
                                <div className="font-bold text-gray-900">{p.throws_high_tonne}</div>
                                <div className="text-gray-600">High T.</div>
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {team.hof.length < 3 &&
                        Array.from({ length: 3 - team.hof.length }).map((_, i) => (
                          <div
                            key={`empty-${String(team.id)}-${i}`}
                            className="rounded-2xl border bg-white/60 border-dashed p-4 sm:p-5 flex items-center justify-center text-sm text-gray-500"
                          >
                            Kein weiterer Spieler
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
