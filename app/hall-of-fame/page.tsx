"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { createBrowserClient } from "@supabase/ssr"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Crown, Medal, Trophy, Users } from "lucide-react"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type DartType = "edart" | "steeldart"

type Season = { id: string; name: string }
type Team = { id: string; name: string; logo_url?: string | null }
type MatchMini = { id: string; season_id: string | null; dart_type: string | null }

type LegStat = {
  id: string
  match_id: string
  player_id: string

  player_legs_won?: number | null
  opponent_legs_won?: number | null

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

  dart_type?: string | null

  player?: { name?: string | null; photo_url?: string | null } | null
}

const safeNum = (v: any) => (typeof v === "number" && Number.isFinite(v) ? v : 0)

// Punkte-Logik wie in deiner Liga-Statistik
function calculatePlayerPoints(p: any) {
  const legWinPoints = safeNum(p.total_wins) * 3
  const throw180Points = safeNum(p.throws_180) * 25
  const throw171Points = safeNum(p.throws_171) * 25
  const highTonnePoints = safeNum(p.throws_high_tonne) * 18
  const tonnePoints = safeNum(p.throws_tonne) * 15
  const throw95PlusPoints = safeNum(p.throws_95_plus) * 12
  const shanghaiPoints = safeNum(p.throws_shanghai) * 10
  const bullPoints = safeNum(p.throws_bull) * 8
  const throw20Points = safeNum(p.throws_20) * 6
  const throw19Points = safeNum(p.throws_19) * 5
  const throw18Points = safeNum(p.throws_18) * 4
  const throw17Points = safeNum(p.throws_17) * 3
  const throw16Points = safeNum(p.throws_16) * 2
  const throw15Points = safeNum(p.throws_15) * 1

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

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }

function medalIcon(rank: 1 | 2 | 3) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-600" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-500" />
  return <Medal className="h-5 w-5 text-amber-700" />
}

export default function HallOfFamePage() {
  const [loading, setLoading] = useState(true)
  const [dartType, setDartType] = useState<DartType>("edart")

  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("all")

  const [teams, setTeams] = useState<Team[]>([])
  const [legStatistics, setLegStatistics] = useState<LegStat[]>([])

  const [matchesById, setMatchesById] = useState<Map<string, MatchMini>>(new Map())
  const [lineupTeamByMatchPlayer, setLineupTeamByMatchPlayer] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Seasons
        const { data: seasonsData, error: seasonsError } = await supabase
          .from("seasons")
          .select("id,name")
          .order("name", { ascending: false })
        if (seasonsError) console.error("Error fetching seasons:", seasonsError)
        setSeasons(((seasonsData as any) || []) as Season[])

        // Teams (nur eigene)
        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("id,name,logo_url")
          .not("user_id", "is", null)
          .order("name")
        if (teamsError) console.error("Error fetching teams:", teamsError)
        setTeams(((teamsData as any) || []) as Team[])

        // Matches mini (für Saison + DartType-Fallback)
        const { data: matchesData, error: matchesError } = await supabase.from("matches").select("id,season_id,dart_type")
        if (matchesError) console.error("Error fetching matches:", matchesError)
        const mm = new Map<string, MatchMini>()
        ;((matchesData as any[]) || []).forEach((m: any) => {
          if (m?.id) mm.set(String(m.id), { id: String(m.id), season_id: m.season_id ? String(m.season_id) : null, dart_type: m.dart_type })
        })
        setMatchesById(mm)

        // Match lineups (historisch korrekt): match_id + player_id -> team_id
        const { data: lineupData, error: lineupError } = await supabase
          .from("match_lineups")
          .select("match_id,team_id,player_id")
        if (lineupError) console.error("Error fetching match_lineups:", lineupError)
        const lm = new Map<string, string>()
        ;((lineupData as any[]) || []).forEach((r: any) => {
          if (r?.match_id && r?.player_id && r?.team_id) lm.set(`${r.match_id}:${r.player_id}`, String(r.team_id))
        })
        setLineupTeamByMatchPlayer(lm)

        // Leg statistics (enthält bei dir auch Tonne/HighT/95+ usw.)
        const { data: legData, error: legError } = await supabase.from("leg_statistics").select(`
          match_id,
          player_id,
          player_legs_won,
          opponent_legs_won,
          throws_180,
          throws_171,
          throws_high_tonne,
          throws_tonne,
          throws_95_plus,
          throws_shanghai,
          throws_bull,
          throws_20,
          throws_19,
          throws_18,
          throws_17,
          throws_16,
          throws_15,
          dart_type,
          player:club_players!leg_statistics_player_id_fkey(name,photo_url)
        `)
        if (legError) console.error("Error fetching leg_statistics:", legError)
        setLegStatistics((((legData as any) || []) as any[]) as LegStat[])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const seasonName = useMemo(() => {
    if (selectedSeasonId === "all") return "Alle Saisons"
    return seasons.find((s) => String(s.id) === String(selectedSeasonId))?.name || "Saison"
  }, [seasons, selectedSeasonId])

  const seasonFiltered = useMemo(() => {
    const dartFiltered = legStatistics.filter((s) => {
      const dt = s.dart_type ?? matchesById.get(String(s.match_id))?.dart_type
      return String(dt) === String(dartType)
    })

    if (selectedSeasonId === "all") return dartFiltered

    return dartFiltered.filter((s) => {
      const seasonId = matchesById.get(String(s.match_id))?.season_id
      if (!seasonId) return true
      return String(seasonId) === String(selectedSeasonId)
    })
  }, [legStatistics, matchesById, dartType, selectedSeasonId])

  const hallOfFameByTeam = useMemo(() => {
    const byTeam: Record<string, Map<string, any>> = {}

    seasonFiltered.forEach((stat) => {
      const keyTeam = lineupTeamByMatchPlayer.get(`${stat.match_id}:${stat.player_id}`)
      if (!keyTeam) return

      const teamKey = String(keyTeam)
      if (!byTeam[teamKey]) byTeam[teamKey] = new Map()
      const teamMap = byTeam[teamKey]

      if (!teamMap.has(stat.player_id)) {
        teamMap.set(stat.player_id, {
          player_id: stat.player_id,
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

      const agg = teamMap.get(stat.player_id)

      const w = safeNum(stat.player_legs_won)
      const o = safeNum(stat.opponent_legs_won)
      agg.total_legs += w + o
      agg.total_wins += w

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

    const result: Record<string, any[]> = {}
    Object.entries(byTeam).forEach(([teamId, teamMap]) => {
      const arr = Array.from(teamMap.values()).map((p: any) => {
        const total_points = calculatePlayerPoints(p)
        const win_percentage = p.total_legs > 0 ? (p.total_wins / p.total_legs) * 100 : 0
        return { ...p, total_points, win_percentage }
      })

      arr.sort((a: any, b: any) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points
        if (b.total_wins !== a.total_wins) return b.total_wins - a.total_wins
        return safeNum(b.throws_180) - safeNum(a.throws_180)
      })

      result[teamId] = arr.slice(0, 3)
    })

    return result
  }, [seasonFiltered, lineupTeamByMatchPlayer])

  const visibleTeams = useMemo(() => {
    return teams
      .map((t) => ({ ...t, hof: hallOfFameByTeam[String(t.id)] || [] }))
      .filter((t) => t.hof.length > 0)
  }, [teams, hallOfFameByTeam])

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <Header />
        <main className="pt-8 pb-24">
          <div className="container mx-auto px-4 py-10 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-6" />
            <p className="text-gray-600">Lade Hall of Fame...</p>
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
                <span className="block text-orange-200">{seasonName}</span>
              </h1>
              <p className="text-sm sm:text-lg md:text-xl font-bold uppercase text-orange-100">
                Top 3 Spieler pro Team – {dartType === "edart" ? "E-Dart" : "Steeldart"}
              </p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-center gap-3 sm:gap-4">
              <div className="flex-1 max-w-xl">
                <div className="text-xs uppercase tracking-wide text-gray-600 mb-2">Saison</div>
                <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Saison auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Saisons</SelectItem>
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
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="edart">E-Dart</TabsTrigger>
                    <TabsTrigger value="steeldart">Steeldart</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>Teams werden nur angezeigt, wenn in diesem Filter auch wirklich Daten vorhanden sind.</span>
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
                  Für diesen Filter wurden keine Team-Statistiken gefunden.
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
                          <div className="text-xs text-gray-600 uppercase tracking-wide">Top 3 – {seasonName}</div>
                        </div>
                      </div>

                      <Badge className="bg-orange-600 text-white font-semibold">{dartType === "edart" ? "E-Dart" : "Steeldart"}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                      {team.hof.map((p: any, idx: number) => {
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
                                <div className="text-sm font-semibold text-gray-900">{rank}. Platz</div>
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
                                <img src={p.photo_url || "/placeholder.svg"} alt={p.name} className="w-12 h-12 rounded-full object-cover border" />
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

                            <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                              <div className="rounded-lg bg-gray-50 border p-2 text-center">
                                <div className="font-bold text-gray-900">{Number(p.win_percentage || 0).toFixed(1)}%</div>
                                <div className="text-gray-600">Win%</div>
                              </div>
                              <div className="rounded-lg bg-gray-50 border p-2 text-center">
                                <div className="font-bold text-gray-900">{safeNum(p.throws_180)}</div>
                                <div className="text-gray-600">180</div>
                              </div>
                              <div className="rounded-lg bg-gray-50 border p-2 text-center">
                                <div className="font-bold text-gray-900">{safeNum(p.throws_171)}</div>
                                <div className="text-gray-600">171</div>
                              </div>
                              <div className="rounded-lg bg-gray-50 border p-2 text-center">
                                <div className="font-bold text-gray-900">{safeNum(p.throws_high_tonne)}</div>
                                <div className="text-gray-600">High T.</div>
                              </div>
                              <div className="rounded-lg bg-gray-50 border p-2 text-center">
                                <div className="font-bold text-gray-900">{safeNum(p.throws_tonne)}</div>
                                <div className="text-gray-600">Tonne</div>
                              </div>
                              <div className="rounded-lg bg-gray-50 border p-2 text-center">
                                <div className="font-bold text-gray-900">{safeNum(p.throws_95_plus)}</div>
                                <div className="text-gray-600">95+</div>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-4 gap-2 text-[11px] text-center">
                              <div className="rounded-lg bg-gray-50 border p-2">
                                <div className="font-bold text-gray-900">{safeNum(p.throws_shanghai)}</div>
                                <div className="text-gray-600">Shanghai</div>
                              </div>
                              <div className="rounded-lg bg-gray-50 border p-2">
                                <div className="font-bold text-gray-900">{safeNum(p.throws_bull)}</div>
                                <div className="text-gray-600">Bull</div>
                              </div>
                              <div className="rounded-lg bg-gray-50 border p-2">
                                <div className="font-bold text-gray-900">{safeNum(p.throws_20)}</div>
                                <div className="text-gray-600">20</div>
                              </div>
                              <div className="rounded-lg bg-gray-50 border p-2">
                                <div className="font-bold text-gray-900">{safeNum(p.throws_19)}</div>
                                <div className="text-gray-600">19</div>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-4 gap-2 text-[11px] text-center">
                              <div className="rounded-lg bg-gray-50 border p-2">
                                <div className="font-bold text-gray-900">{safeNum(p.throws_18)}</div>
                                <div className="text-gray-600">18</div>
                              </div>
                              <div className="rounded-lg bg-gray-50 border p-2">
                                <div className="font-bold text-gray-900">{safeNum(p.throws_17)}</div>
                                <div className="text-gray-600">17</div>
                              </div>
                              <div className="rounded-lg bg-gray-50 border p-2">
                                <div className="font-bold text-gray-900">{safeNum(p.throws_16)}</div>
                                <div className="text-gray-600">16</div>
                              </div>
                              <div className="rounded-lg bg-gray-50 border p-2">
                                <div className="font-bold text-gray-900">{safeNum(p.throws_15)}</div>
                                <div className="text-gray-600">15</div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
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
