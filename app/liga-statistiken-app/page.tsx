"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Target, Calendar, Users } from "lucide-react"
import { Header } from "@/components/header"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { PlayerStatisticsCardApp } from "@/components/player-statistics-card-app"
import { PointsInfoBox } from "@/components/points-info-box"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { TeamStandingsCardApp } from "@/components/team-standings-card-app"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function DartLeaguePage() {
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState([])
  const [opponentTeams, setOpponentTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [legStatistics, setLegStatistics] = useState([])
  const [loading, setLoading] = useState(true)
  const [dartTypeFilter, setDartTypeFilter] = useState<"gesamt" | "edart" | "steeldart">("gesamt")
  const [playersPerPage, setPlayersPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: ownTeamsData, error: teamsError } = await supabase
          .from("teams")
          .select("*")
          .not("user_id", "is", null)
          .order("name")

        const { data: opponentTeamsData, error: opponentError } = await supabase
          .from("opponent_teams")
          .select("*")
          .order("name")

        if (teamsError) {
          console.error("Error fetching teams:", teamsError)
        } else {
          setTeams(ownTeamsData || [])
        }

        if (opponentError) {
          console.error("Error fetching opponent teams:", opponentError)
        } else {
          setOpponentTeams(opponentTeamsData || [])
        }

        let matchQuery = supabase
          .from("matches")
          .select(`
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
            away_team:teams!matches_away_team_id_fkey(id, name, logo_url),
            season:seasons(id, name, type)
          `)
          .order("match_date", { ascending: true })

        if (dartTypeFilter !== "gesamt") {
          matchQuery = matchQuery.eq("dart_type", dartTypeFilter)
        }

        const { data: matchesData, error: matchesError } = await matchQuery

        if (matchesError) {
          console.error("Error fetching matches:", matchesError)
        } else {
          const enrichedMatches =
            matchesData?.map((match) => {
              const homeOpponentTeam = match.home_opponent_team_id
                ? opponentTeamsData?.find((team) => team.id === match.home_opponent_team_id)
                : null
              const awayOpponentTeam = match.away_opponent_team_id
                ? opponentTeamsData?.find((team) => team.id === match.away_opponent_team_id)
                : null

              return {
                ...match,
                home_opponent_team: homeOpponentTeam,
                away_opponent_team: awayOpponentTeam,
              }
            }) || []

          setMatches(enrichedMatches)
        }

        const { data: playersData, error: playersError } = await supabase
          .from("team_members")
          .select(`
            team_id,
            club_players (
              id,
              name,
              photo_url
            ),
            teams (
              id,
              name
            )
          `)
          .order("club_players(name)")

        if (playersError) {
          console.error("Error fetching players:", playersError)
        } else {
          const transformedPlayers =
            playersData
              ?.map((member: any) => ({
                id: member.club_players?.id,
                name: member.club_players?.name,
                photo_url: member.club_players?.photo_url,
                team_id: member.team_id,
                team_name: member.teams?.name,
              }))
              .filter((player) => player.id) || []

          setPlayers(transformedPlayers)
        }

        let legStatsQuery = supabase.from("leg_statistics").select(`
            *,
            player:club_players!leg_statistics_player_id_fkey(name, photo_url)
          `)

        if (dartTypeFilter !== "gesamt") {
          legStatsQuery = legStatsQuery.eq("dart_type", dartTypeFilter)
        }

        const { data: legStatsData, error: legStatsError } = await legStatsQuery

        if (legStatsError) {
          console.error("Error fetching leg statistics:", legStatsError)
        } else {
          setLegStatistics(legStatsData || [])
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [dartTypeFilter])

  const calculateStandings = () => {
    const standings = {}

    teams.forEach((team) => {
      standings[team.id] = {
        team: team.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
        legsFor: 0,
        legsAgainst: 0,
        legsDifference: 0,
      }
    })

    matches.forEach((match) => {
      if (match.status === "completed") {
        const homeTeam = match.home_team || match.home_opponent_team
        const awayTeam = match.away_team || match.away_opponent_team

        if (homeTeam && awayTeam) {
          const homeId = match.home_team?.id
          const awayId = match.away_team?.id

          if (homeId && standings[homeId]) {
            standings[homeId].played++
            standings[homeId].legsFor += match.home_score || 0
            standings[homeId].legsAgainst += match.away_score || 0

            if ((match.home_score || 0) > (match.away_score || 0)) {
              standings[homeId].won++
              standings[homeId].points += 2
            } else if ((match.away_score || 0) > (match.home_score || 0)) {
              standings[homeId].lost++
            } else {
              standings[homeId].drawn++
              standings[homeId].points += 1
            }
          }

          if (awayId && standings[awayId]) {
            standings[awayId].played++
            standings[awayId].legsFor += match.away_score || 0
            standings[awayId].legsAgainst += match.home_score || 0

            if ((match.away_score || 0) > (match.home_score || 0)) {
              standings[awayId].won++
              standings[awayId].points += 2
            } else if ((match.home_score || 0) > (match.away_score || 0)) {
              standings[awayId].lost++
            } else {
              standings[awayId].drawn++
              standings[awayId].points += 1
            }
          }
        }
      }
    })

    Object.values(standings).forEach((team) => {
      team.legsDifference = team.legsFor - team.legsAgainst
    })

    return Object.values(standings)
      .filter((team) => team.played > 0)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.legsDifference !== a.legsDifference) return b.legsDifference - a.legsDifference
        return b.legsFor - a.legsFor
      })
  }

  const calculatePlayerPoints = (player: any, detailedStats: any) => {
    const legWinPoints = player.total_wins * 3
    const throw180Points = player.throws_180 * 25
    const throw171Points = player.throws_171 * 25
    const highTonnePoints = player.throws_high_tonne * 18
    const tonnePoints = player.throws_tonne * 15
    const throw95PlusPoints = player.throws_95_plus * 12
    const shanghaiPoints = player.throws_shanghai * 10
    const bullPoints = player.throws_bull * 8
    const throw20Points = player.throws_20 * 6
    const throw19Points = (detailedStats.throws_19 || 0) * 5
    const throw18Points = (detailedStats.throws_18 || 0) * 4
    const throw17Points = (detailedStats.throws_17 || 0) * 3
    const throw16Points = (detailedStats.throws_16 || 0) * 2
    const throw15Points = (detailedStats.throws_15 || 0) * 1

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

  const playerStatistics = useMemo(() => {
    if (!legStatistics) return []

    const playerMap = new Map()

    legStatistics.forEach((stat) => {
      const playerId = stat.player_id
      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          player_id: playerId,
          name: stat.player?.name,
          photo_url: stat.player?.photo_url,
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
        })
      }

      const player = playerMap.get(playerId)
      const playerLegsWon = stat.player_legs_won || 0
      const opponentLegsWon = stat.opponent_legs_won || 0
      const legsInThisMatch = playerLegsWon + opponentLegsWon

      player.total_legs += legsInThisMatch
      player.total_wins += playerLegsWon
      player.throws_180 += stat.throws_180 || 0
      player.throws_171 += stat.throws_171 || 0
      player.throws_high_tonne += stat.throws_high_tonne || 0
      player.throws_tonne += stat.throws_tonne || 0
      player.throws_95_plus += stat.throws_95_plus || 0
      player.throws_shanghai += stat.throws_shanghai || 0
      player.throws_bull += stat.throws_bull || 0
      player.throws_20 += stat.throws_20 || 0
    })

    return Array.from(playerMap.values())
      .map((player) => {
        const detailedStats = legStatistics
          .filter((stat) => stat.player_id === player.player_id)
          .reduce((acc, stat) => {
            return {
              throws_15: (acc.throws_15 || 0) + (stat.throws_15 || 0),
              throws_16: (acc.throws_16 || 0) + (stat.throws_16 || 0),
              throws_17: (acc.throws_17 || 0) + (stat.throws_17 || 0),
              throws_18: (acc.throws_18 || 0) + (stat.throws_18 || 0),
              throws_19: (acc.throws_19 || 0) + (stat.throws_19 || 0),
            }
          }, {})

        const totalPoints = calculatePlayerPoints(player, detailedStats)

        return {
          ...player,
          throws_15: detailedStats.throws_15 || 0,
          throws_16: detailedStats.throws_16 || 0,
          throws_17: detailedStats.throws_17 || 0,
          throws_18: detailedStats.throws_18 || 0,
          throws_19: detailedStats.throws_19 || 0,
          win_percentage: player.total_legs > 0 ? (player.total_wins / player.total_legs) * 100 : 0,
          total_points: totalPoints,
        }
      })
      .sort((a, b) => {
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points
        }
        if (b.total_wins !== a.total_wins) {
          return b.total_wins - a.total_wins
        }
        return b.throws_180 - a.throws_180
      })
  }, [legStatistics])

  const getMatchResultColor = (match, teamId) => {
    const isHomeTeam = match.home_team?.id === teamId
    const homeScore = match.home_score || 0
    const awayScore = match.away_score || 0

    if (homeScore === awayScore) return "bg-yellow-50 border-yellow-200"

    const teamWon = isHomeTeam ? homeScore > awayScore : awayScore > homeScore
    return teamWon ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
  }

  const completedMatches = matches.filter((match) => match.status === "completed")
  const upcomingMatches = matches.filter((match) => match.status === "scheduled")
  const postponedMatches = matches.filter((match) => match.status === "postponed")
  const standings = calculateStandings()
  const playerLegStats = playerStatistics
  const totalPages = Math.ceil(playerLegStats.length / playersPerPage)
  const startIndex = (currentPage - 1) * playersPerPage
  const endIndex = startIndex + playersPerPage
  const currentPlayers = playerLegStats.slice(startIndex, endIndex)

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handlePageSizeChange = (newSize: number) => {
    setPlayersPerPage(newSize)
    setCurrentPage(1)
  }

  const groupMatchesByTeam = (matchList) => {
    const grouped = {}

    matchList.forEach((match) => {
      const homeTeamName = match.home_team?.name || match.home_opponent_team?.name || "Unbekanntes Team"
      const awayTeamName = match.away_team?.name || match.away_opponent_team?.name || "Unbekanntes Team"

      if (!grouped[homeTeamName]) grouped[homeTeamName] = []
      if (!grouped[awayTeamName]) grouped[awayTeamName] = []

      grouped[homeTeamName].push(match)
      grouped[awayTeamName].push(match)
    })

    return grouped
  }

  const groupedCompletedMatches = groupMatchesByTeam(completedMatches)
  const groupedUpcomingMatches = groupMatchesByTeam(upcomingMatches)

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 font-sans">
        <Header />
        <main className="pt-8 pb-24">
          <div className="container mx-auto px-4 md:px-6 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-6 backdrop-blur-sm">
                <Trophy className="h-12 w-12 text-white mx-auto" />
              </div>
              <p className="mt-4 text-gray-600">Lade Liga-Daten...</p>
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
        <motion.div
          className="container mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="text-center mb-8 sm:mb-12">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-8 md:p-12 text-white">
              <div className="bg-white/10 rounded-full p-3 sm:p-4 w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 backdrop-blur-sm">
                <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-white mx-auto" />
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-2 sm:mb-4">
                <span className="block text-white">EMOJ!'S DARTVEREIN</span>
                <span className="block text-orange-200">Herbstsaison 2025</span>
              </h1>
              <p className="text-sm sm:text-lg md:text-xl font-bold uppercase text-orange-100 mb-2 sm:mb-4">
                Aktuelle Tabellen, Spielergebnisse und Statistiken
              </p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-6">
            <div className="flex justify-center gap-2">
              <Button
                variant={dartTypeFilter === "gesamt" ? "default" : "outline"}
                onClick={() => setDartTypeFilter("gesamt")}
                className="flex items-center gap-2"
              >
                Gesamt
              </Button>
              <Button
                variant={dartTypeFilter === "edart" ? "default" : "outline"}
                onClick={() => setDartTypeFilter("edart")}
                className="flex items-center gap-2"
              >
                E-Dart
              </Button>
              <Button
                variant={dartTypeFilter === "steeldart" ? "default" : "outline"}
                onClick={() => setDartTypeFilter("steeldart")}
                className="flex items-center gap-2"
              >
                Steeldart
              </Button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Tabs defaultValue="standings" className="w-full">
              <div className="mb-4 sm:mb-8">
                <TabsList className="grid w-full grid-cols-5 h-auto p-1 sm:p-1 lg:grid-cols-5 overflow-x-auto">
                  <TabsTrigger
                    value="standings"
                    className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 min-w-0"
                  >
                    <Trophy className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Tabelle</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="results"
                    className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 min-w-0"
                  >
                    <Target className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Ergebnisse</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="fixtures"
                    className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 min-w-0"
                  >
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Termine</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="teams"
                    className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 min-w-0"
                  >
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Teams</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="legstats"
                    className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 min-w-0"
                  >
                    <Target className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Statistiken</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="legstats">
                <PointsInfoBox />

                <Card className="overflow-hidden shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Target className="h-5 w-5 sm:h-6 sm:w-6" />
                        Spieler-Statistiken ({playerLegStats.length} Spieler) -{" "}
                        {dartTypeFilter === "gesamt" ? "Gesamt" : dartTypeFilter === "edart" ? "E-Dart" : "Steeldart"}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-blue-100">Zeige:</span>
                        <select
                          value={playersPerPage}
                          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                          className="bg-white text-gray-900 rounded px-2 py-1 text-sm"
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={playerLegStats.length}>Alle</option>
                        </select>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-3 sm:p-6">
                    {playerLegStats.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">Keine Statistiken verfügbar</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4">
                          {currentPlayers.map((player, index) => (
                            <PlayerStatisticsCardApp
                              key={player.name}
                              player={player}
                              index={startIndex + index}
                              allStats={legStatistics}
                            />
                          ))}
                        </div>

                        {totalPages > 1 && (
                          <div className="p-4 border-t bg-gray-50">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="text-sm text-gray-600">
                                Zeige {startIndex + 1} bis {Math.min(endIndex, playerLegStats.length)} von{" "}
                                {playerLegStats.length} Spielern
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handlePrevPage}
                                  disabled={currentPage === 1}
                                >
                                  Zurück
                                </Button>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum
                                    if (totalPages <= 5) {
                                      pageNum = i + 1
                                    } else if (currentPage <= 3) {
                                      pageNum = i + 1
                                    } else if (currentPage >= totalPages - 2) {
                                      pageNum = totalPages - 4 + i
                                    } else {
                                      pageNum = currentPage - 2 + i
                                    }

                                    return (
                                      <Button
                                        key={pageNum}
                                        variant={currentPage === pageNum ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCurrentPage(pageNum)}
                                        className="w-8 h-8 p-0"
                                      >
                                        {pageNum}
                                      </Button>
                                    )
                                  })}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleNextPage}
                                  disabled={currentPage === totalPages}
                                >
                                  Weiter
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="standings">
                <Card className="overflow-hidden shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
                      Liga-Tabelle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <div className="grid gap-4">
                      {standings.map((team, index) => {
                        const teamData = teams.find((t) => t.name === team.team)
                        return <TeamStandingsCardApp key={team.team} team={team} index={index} teamData={teamData} />
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="results">
                <Card className="overflow-hidden shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Target className="h-5 w-5 sm:h-6 sm:w-6" />
                      Alle Ergebnisse ({completedMatches.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    {completedMatches.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">Noch keine Ergebnisse verfügbar</p>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {completedMatches
                          .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
                          .map((match) => {
                            const homeScore = match.home_score || 0
                            const awayScore = match.away_score || 0

                            const matchDate = new Date(match.match_date)
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            const isFutureDate = matchDate > today

                            const isPendingResult =
                              match.home_score === null ||
                              match.away_score === null ||
                              (homeScore === 0 && awayScore === 0)

                            const isOurHomeTeam = match.home_team?.id
                            const isOurAwayTeam = match.away_team?.id

                            let matchColor = "bg-gray-50 border-gray-200"
                            let resultText = "Unentschieden"

                            if (isFutureDate) {
                              matchColor = "bg-orange-50 border-orange-300"
                              resultText = "Datum in der Zukunft"
                            } else if (isPendingResult) {
                              matchColor = "bg-orange-50 border-orange-300"
                              resultText = "Ergebnis ausstehend"
                            } else if (homeScore > awayScore) {
                              if (isOurHomeTeam) {
                                matchColor = "bg-green-50 border-green-200"
                                resultText = "Heimsieg"
                              } else {
                                matchColor = "bg-red-50 border-red-200"
                                resultText = "Niederlage"
                              }
                            } else if (awayScore > homeScore) {
                              if (isOurAwayTeam) {
                                matchColor = "bg-green-50 border-green-200"
                                resultText = "Auswärtssieg"
                              } else {
                                matchColor = "bg-red-50 border-red-200"
                                resultText = "Niederlage"
                              }
                            } else {
                              matchColor = "bg-yellow-50 border-yellow-200"
                              resultText = "Unentschieden"
                            }

                            return (
                              <div
                                key={match.id}
                                className={`${matchColor} border-2 rounded-xl p-3 sm:p-6 shadow-sm hover:shadow-md transition-all`}
                              >
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 w-full">
                                    <div className="text-center min-w-[120px] sm:min-w-[140px]">
                                      <div className="flex items-center justify-center gap-2 mb-2">
                                        {match.home_team?.logo_url ? (
                                          <img
                                            src={match.home_team.logo_url || "/placeholder.svg"}
                                            alt={`${match.home_team.name} Logo`}
                                            className="w-8 h-8 rounded-full object-cover border border-gray-300"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                            <Trophy className="h-4 w-4 text-gray-500" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="font-bold text-lg sm:text-xl mb-1 text-gray-800">
                                        {match.home_team?.name ||
                                          match.home_opponent_team?.name ||
                                          "Team nicht gefunden"}
                                      </div>
                                      <div className="text-xs text-gray-500 uppercase tracking-wide">Heim</div>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-4 bg-white rounded-lg px-4 sm:px-6 py-2 sm:py-3 shadow-sm">
                                      {isPendingResult || isFutureDate ? (
                                        <div className="flex items-center gap-2">
                                          <div className="text-2xl sm:text-4xl font-bold text-orange-500">?</div>
                                          <div className="text-xl sm:text-2xl font-medium text-gray-400">:</div>
                                          <div className="text-2xl sm:text-4xl font-bold text-orange-500">?</div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="text-2xl sm:text-4xl font-bold text-gray-800">
                                            {homeScore}
                                          </div>
                                          <div className="text-xl sm:text-2xl font-medium text-gray-400">:</div>
                                          <div className="text-2xl sm:text-4xl font-bold text-gray-800">
                                            {awayScore}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                    <div className="text-center min-w-[120px] sm:min-w-[140px]">
                                      <div className="flex items-center justify-center gap-2 mb-2">
                                        {match.away_team?.logo_url ? (
                                          <img
                                            src={match.away_team.logo_url || "/placeholder.svg"}
                                            alt={`${match.away_team.name} Logo`}
                                            className="w-8 h-8 rounded-full object-cover border border-gray-300"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                            <Trophy className="h-4 w-4 text-gray-500" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="font-bold text-lg sm:text-xl mb-1 text-gray-800">
                                        {match.away_team?.name ||
                                          match.away_opponent_team?.name ||
                                          "Team nicht gefunden"}
                                      </div>
                                      <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Gast</div>
                                    </div>
                                  </div>
                                  <div className="text-center sm:text-right flex flex-col items-center sm:items-end gap-2">
                                    <div className="text-base sm:text-lg font-semibold text-gray-700 mb-2">
                                      {new Date(match.match_date).toLocaleDateString("de-DE", {
                                        weekday: "short",
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      })}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        className={`
                                          ${
                                            isFutureDate || isPendingResult
                                              ? "bg-orange-100 text-orange-700 border-orange-300"
                                              : resultText === "Heimsieg" || resultText === "Auswärtssieg"
                                                ? "bg-green-100 text-green-700"
                                                : resultText === "Unentschieden"
                                                  ? "bg-yellow-100 text-yellow-700"
                                                  : "bg-red-100 text-red-700"
                                          }
                                          font-medium text-xs sm:text-sm
                                        `}
                                      >
                                        {resultText}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                {isFutureDate && (
                                  <div className="mt-3 pt-3 border-t border-orange-200">
                                    <div className="flex items-center gap-2 text-sm text-orange-700">
                                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                      <span className="font-medium">
                                        Achtung: Das Spieldatum liegt in der Zukunft! Möglicherweise wurde das Spiel
                                        vorverschoben oder das Datum ist noch nicht aktualisiert.
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {!isFutureDate && isPendingResult && (
                                  <div className="mt-3 pt-3 border-t border-orange-200">
                                    <div className="flex items-center gap-2 text-sm text-orange-700">
                                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                      <span className="font-medium">
                                        Dieses Spiel wurde noch nicht gespielt oder das Ergebnis wurde noch nicht
                                        eingetragen.
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fixtures">
                <div className="space-y-4">
                  {postponedMatches.length > 0 && (
                    <Card className="border-red-300 bg-red-50 shadow-lg">
                      <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white p-3 sm:p-6">
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                          <Calendar className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
                          Verschobene Spiele ({postponedMatches.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6">
                        <div className="space-y-3 sm:space-y-4">
                          {postponedMatches
                            .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
                            .map((match) => (
                              <div
                                key={match.id}
                                className="border-2 border-red-300 rounded-xl p-3 sm:p-6 bg-white shadow-sm hover:shadow-md transition-all"
                              >
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 w-full">
                                    <div className="text-center min-w-[120px] sm:min-w-[140px]">
                                      <div className="flex items-center justify-center gap-2 mb-2">
                                        {match.home_team?.logo_url ? (
                                          <img
                                            src={match.home_team.logo_url || "/placeholder.svg"}
                                            alt={`${match.home_team.name} Logo`}
                                            className="w-8 h-8 rounded-full object-cover border border-gray-300"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                            <Trophy className="h-4 w-4 text-gray-500" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="font-semibold text-base sm:text-lg text-gray-900">
                                        {match.home_team?.name ||
                                          match.home_opponent_team?.name ||
                                          "Team nicht gefunden"}
                                      </div>
                                      <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Heim</div>
                                    </div>
                                    <div className="text-xl sm:text-2xl font-bold text-red-500">vs</div>
                                    <div className="text-center min-w-[120px] sm:min-w-[140px]">
                                      <div className="flex items-center justify-center gap-2 mb-2">
                                        {match.away_team?.logo_url ? (
                                          <img
                                            src={match.away_team.logo_url || "/placeholder.svg"}
                                            alt={`${match.away_team.name} Logo`}
                                            className="w-8 h-8 rounded-full object-cover border border-gray-300"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                            <Trophy className="h-4 w-4 text-gray-500" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="font-semibold text-base sm:text-lg text-gray-900">
                                        {match.away_team?.name ||
                                          match.away_opponent_team?.name ||
                                          "Team nicht gefunden"}
                                      </div>
                                      <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Gast</div>
                                    </div>
                                  </div>
                                  <div className="text-center sm:text-right">
                                    <div className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                                      {new Date(match.match_date).toLocaleDateString("de-DE", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      })}
                                    </div>
                                    <div className="text-sm text-gray-600 mb-2">
                                      {new Date(match.match_date).toLocaleDateString("de-DE", {
                                        weekday: "long",
                                      })}
                                    </div>
                                    <Badge className="bg-red-500 text-white border-red-600 font-medium text-xs sm:text-sm animate-pulse">
                                      Verschoben
                                    </Badge>
                                  </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-red-200">
                                  <div className="flex items-center gap-2 text-sm text-red-700">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="font-medium">Dieses Spiel wurde verschoben!</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader className="p-3 sm:p-6">
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        Kommende Spiele ({upcomingMatches.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6">
                      {upcomingMatches.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Keine kommenden Spiele geplant</p>
                      ) : (
                        <div className="space-y-3 sm:space-y-4">
                          {upcomingMatches
                            .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
                            .map((match) => {
                              const matchDate = new Date(match.match_date)
                              const today = new Date()
                              const isPastDue = matchDate < today
                              const hasNoResult =
                                match.home_score === null ||
                                match.away_score === null ||
                                (match.home_score === 0 && match.away_score === 0)
                              const isOverdue = isPastDue && hasNoResult

                              return (
                                <div
                                  key={match.id}
                                  className={`border rounded-lg p-3 sm:p-6 hover:shadow-md transition-shadow ${
                                    isOverdue ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-white"
                                  }`}
                                >
                                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 w-full">
                                      <div className="text-center min-w-[120px] sm:min-w-[140px]">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                          {match.home_team?.logo_url ? (
                                            <img
                                              src={match.home_team.logo_url || "/placeholder.svg"}
                                              alt={`${match.home_team.name} Logo`}
                                              className="w-8 h-8 rounded-full object-cover border border-gray-300"
                                            />
                                          ) : (
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                              <Trophy className="h-4 w-4 text-gray-500" />
                                            </div>
                                          )}
                                        </div>
                                        <div className="font-semibold text-base sm:text-lg text-gray-900">
                                          {match.home_team?.name ||
                                            match.home_opponent_team?.name ||
                                            "Team nicht gefunden"}
                                        </div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Heim</div>
                                      </div>
                                      <div className="text-xl sm:text-2xl font-bold text-gray-400">vs</div>
                                      <div className="text-center min-w-[120px] sm:min-w-[140px]">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                          {match.away_team?.logo_url ? (
                                            <img
                                              src={match.away_team.logo_url || "/placeholder.svg"}
                                              alt={`${match.away_team.name} Logo`}
                                              className="w-8 h-8 rounded-full object-cover border border-gray-300"
                                            />
                                          ) : (
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                              <Trophy className="h-4 w-4 text-gray-500" />
                                            </div>
                                          )}
                                        </div>
                                        <div className="font-semibold text-base sm:text-lg text-gray-900">
                                          {match.away_team?.name ||
                                            match.away_opponent_team?.name ||
                                            "Team nicht gefunden"}
                                        </div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Gast</div>
                                      </div>
                                    </div>
                                    <div className="text-center sm:text-right">
                                      <div className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                                        {new Date(match.match_date).toLocaleDateString("de-DE", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "numeric",
                                        })}
                                      </div>
                                      <div className="text-sm text-gray-600 mb-2">
                                        {new Date(match.match_date).toLocaleDateString("de-DE", {
                                          weekday: "long",
                                        })}
                                      </div>
                                      {isOverdue && (
                                        <Badge className="bg-orange-100 text-orange-700 border-orange-300 font-medium text-xs sm:text-sm">
                                          Ergebnis überfällig
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {isOverdue && (
                                    <div className="mt-3 pt-3 border-t border-orange-200">
                                      <div className="flex items-center gap-2 text-sm text-orange-700">
                                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                        <span className="font-medium">
                                          Dieses Spiel sollte bereits gespielt worden sein, aber das Ergebnis wurde noch
                                          nicht eingetragen.
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="teams">
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-2 mb-4 sm:mb-6">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Teams & Kader</h2>
                  </div>

                  <div className="grid gap-4 sm:gap-8">
                    {teams
                      .filter((team) => {
                        const teamHasMatches = standings.some((s) => s.team === team.name)
                        return teamHasMatches
                      })
                      .map((team) => {
                        const teamPlayers = players.filter((player) => player.team_id === team.id)
                        const teamStats = standings.find((s) => s.team === team.name)

                        return (
                          <Card key={team.id} className="overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b p-3 sm:p-6">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                                <div className="flex items-center gap-3">
                                  {team.logo_url ? (
                                    <img
                                      src={team.logo_url || "/placeholder.svg"}
                                      alt={`${team.name} Logo`}
                                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-orange-200"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center">
                                      <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                                    </div>
                                  )}
                                  <CardTitle className="text-lg sm:text-xl font-bold text-gray-900">
                                    {team.name}
                                  </CardTitle>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-4">
                                  <Badge
                                    variant="secondary"
                                    className="bg-orange-100 text-orange-800 font-semibold text-xs sm:text-sm"
                                  >
                                    {teamPlayers.length} Spieler
                                  </Badge>
                                  {teamStats && (
                                    <Badge className="bg-orange-600 text-white font-semibold text-xs sm:text-sm">
                                      {teamStats.points} Punkte
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                {teamStats && (
                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">Saisonstatistik</h4>
                                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                      <div className="bg-gray-50 rounded-lg p-2 sm:p-3 text-center">
                                        <div className="text-xl sm:text-2xl font-bold text-gray-900">
                                          {teamStats.played}
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-600">Spiele</div>
                                      </div>
                                      <div className="bg-green-50 rounded-lg p-2 sm:p-3 text-center">
                                        <div className="text-xl sm:text-2xl font-bold text-green-600">
                                          {teamStats.won}
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-600">Siege</div>
                                      </div>
                                      <div className="bg-yellow-50 rounded-lg p-2 sm:p-3 text-center">
                                        <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                                          {teamStats.drawn}
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-600">Unentschieden</div>
                                      </div>
                                      <div className="bg-red-50 rounded-lg p-2 sm:p-3 text-center">
                                        <div className="text-xl sm:text-2xl font-bold text-red-600">
                                          {teamStats.lost}
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-600">Niederlagen</div>
                                      </div>
                                      <div className="bg-blue-50 rounded-lg p-2 sm:p-3 text-center col-span-2">
                                        <div className="text-xl sm:text-2xl font-bold text-blue-600">
                                          {teamStats.legsDifference > 0 ? "+" : ""}
                                          {teamStats.legsDifference}
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-600">Legs-Differenz</div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-3">Spielerkader</h4>
                                  {teamPlayers.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                      <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                      <p>Keine Spieler zugeordnet</p>
                                    </div>
                                  ) : (
                                    <div className="grid gap-2">
                                      {teamPlayers.map((player, index) => (
                                        <div
                                          key={player.id}
                                          className="flex items-center gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg"
                                        >
                                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                            <span className="text-xs sm:text-sm font-semibold text-orange-600">
                                              {index + 1}
                                            </span>
                                          </div>
                                          <div className="flex-1">
                                            <div className="font-medium text-gray-900 text-sm sm:text-base">
                                              {player.name}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
