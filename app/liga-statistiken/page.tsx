"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Target, Calendar, Users } from "lucide-react"
import { Header } from "@/components/header"
import { createBrowserClient } from "@supabase/ssr"

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

export default function LigaPage() {
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState([])
  const [opponentTeams, setOpponentTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [legStatistics, setLegStatistics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("[v0] Fetching own teams...")
        const { data: ownTeamsData, error: teamsError } = await supabase
          .from("teams")
          .select("*")
          .not("user_id", "is", null)
          .order("name")
        console.log("[v0] Own teams data:", ownTeamsData)

        console.log("[v0] Fetching opponent teams...")
        const { data: opponentTeamsData, error: opponentError } = await supabase
          .from("opponent_teams")
          .select("*")
          .order("name")
        console.log("[v0] Opponent teams data:", opponentTeamsData)

        if (teamsError) {
          console.error("Error fetching teams:", teamsError)
        } else {
          console.log("[v0] Loaded own teams:", ownTeamsData?.length || 0)
          setTeams(ownTeamsData || [])
        }

        if (opponentError) {
          console.error("Error fetching opponent teams:", opponentError)
        } else {
          console.log("[v0] Loaded opponent teams:", opponentTeamsData?.length || 0)
          setOpponentTeams(opponentTeamsData || [])
        }

        console.log("[v0] Fetching matches...")
        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select(`
            *,
            home_team:teams!matches_home_team_id_fkey(id, name),
            away_team:teams!matches_away_team_id_fkey(id, name),
            season:seasons(id, name, type)
          `)
          .order("match_date", { ascending: true })

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

          console.log("[v0] Loaded matches:", enrichedMatches.length)
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

          console.log("[v0] Loaded players:", transformedPlayers.length)
          setPlayers(transformedPlayers)
        }

        console.log("[v0] Fetching leg statistics...")
        const { data: legStatsData, error: legStatsError } = await supabase.from("leg_statistics").select(`
            *,
            player:club_players!leg_statistics_player_id_fkey(name)
          `)

        if (legStatsError) {
          console.error("Error fetching leg statistics:", legStatsError)
        } else {
          console.log("[v0] Loaded leg statistics:", legStatsData?.length || 0)
          setLegStatistics(legStatsData || [])
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

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
              standings[homeId].points += 3
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
              standings[awayId].points += 3
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

    return Object.values(standings).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.legsDifference !== a.legsDifference) return b.legsDifference - a.legsDifference
      return b.legsFor - a.legsFor
    })
  }

  const calculatePlayerLegStats = () => {
    const playerStats = {}

    legStatistics.forEach((stat) => {
      const playerId = stat.player_id
      const playerName = stat.player?.name

      if (!playerId || !playerName) return

      if (!playerStats[playerId]) {
        playerStats[playerId] = {
          name: playerName,
          legs_played: 0,
          throws_180: 0,
          throws_171: 0,
          throws_15: 0,
          throws_16: 0,
          throws_17: 0,
          throws_18: 0,
          throws_19: 0,
          throws_20: 0,
          throws_high_tonne: 0,
          throws_tonne: 0,
          throws_shanghai: 0,
          throws_95_plus: 0,
          throws_bull: 0,
        }
      }

      playerStats[playerId].legs_played += 1
      playerStats[playerId].throws_180 += stat.throws_180 || 0
      playerStats[playerId].throws_171 += stat.throws_171 || 0
      playerStats[playerId].throws_15 += stat.throws_15 || 0
      playerStats[playerId].throws_16 += stat.throws_16 || 0
      playerStats[playerId].throws_17 += stat.throws_17 || 0
      playerStats[playerId].throws_18 += stat.throws_18 || 0
      playerStats[playerId].throws_19 += stat.throws_19 || 0
      playerStats[playerId].throws_20 += stat.throws_20 || 0
      playerStats[playerId].throws_high_tonne += stat.throws_high_tonne || 0
      playerStats[playerId].throws_tonne += stat.throws_tonne || 0
      playerStats[playerId].throws_shanghai += stat.throws_shanghai || 0
      playerStats[playerId].throws_95_plus += stat.throws_95_plus || 0
      playerStats[playerId].throws_bull += stat.throws_bull || 0
    })

    return Object.values(playerStats).sort((a, b) => b.throws_180 - a.throws_180)
  }

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
  const standings = calculateStandings()
  const playerLegStats = calculatePlayerLegStats()

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
        <main className="pt-8 pb-20">
          <div className="container mx-auto px-4 md:px-6 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-6 backdrop-blur-sm">
                <Trophy className="h-12 w-12 text-white mx-auto" />
              </div>
              <p className="mt-4 text-gray-600">Lade Liga-Daten...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Header />
      <main className="pt-8 pb-20">
        <motion.div
          className="container mx-auto px-4 md:px-6 py-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="text-center mb-12">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-8 md:p-12 text-white">
              <div className="bg-white/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 backdrop-blur-sm">
                <Trophy className="h-12 w-12 text-white mx-auto" />
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-4">
                <span className="block text-white">EMOJ!'S DARTVEREIN</span>
                <span className="block text-orange-200">Herbstsaison 2025</span>
              </h1>
              <p className="text-lg md:text-xl font-bold uppercase text-orange-100 mb-4">
                Aktuelle Tabellen, Spielergebnisse und Statistiken
              </p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Tabs defaultValue="standings" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-8">
                <TabsTrigger value="standings" className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Tabelle
                </TabsTrigger>
                <TabsTrigger value="results" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Ergebnisse
                </TabsTrigger>
                <TabsTrigger value="fixtures" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Termine
                </TabsTrigger>
                <TabsTrigger value="teams" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Teams
                </TabsTrigger>
                <TabsTrigger value="legstats" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Spieler-Statistiken
                </TabsTrigger>
              </TabsList>

              <TabsContent value="standings">
                <Card className="overflow-hidden shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Trophy className="h-6 w-6" />
                      Liga-Tabelle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-4 font-semibold text-gray-700">Pos</th>
                            <th className="text-left p-4 font-semibold text-gray-700">Team</th>
                            <th className="text-center p-4 font-semibold text-gray-700">Sp</th>
                            <th className="text-center p-4 font-semibold text-gray-700">S</th>
                            <th className="text-center p-4 font-semibold text-gray-700">U</th>
                            <th className="text-center p-4 font-semibold text-gray-700">N</th>
                            <th className="text-center p-4 font-semibold text-gray-700">Legs</th>
                            <th className="text-center p-4 font-semibold text-gray-700">Diff</th>
                            <th className="text-center p-4 font-semibold text-gray-700">Pkt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((team, index) => (
                            <tr key={team.team} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="p-4">
                                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                  <span className="font-bold text-orange-600">{index + 1}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="font-semibold text-gray-900 text-lg">{team.team}</div>
                              </td>
                              <td className="text-center p-4 font-medium">{team.played}</td>
                              <td className="text-center p-4">
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                                  {team.won}
                                </span>
                              </td>
                              <td className="text-center p-4">
                                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
                                  {team.drawn}
                                </span>
                              </td>
                              <td className="text-center p-4">
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded font-medium">
                                  {team.lost}
                                </span>
                              </td>
                              <td className="text-center p-4 font-medium">
                                {team.legsFor}:{team.legsAgainst}
                              </td>
                              <td className="text-center p-4">
                                <span
                                  className={`font-bold ${team.legsDifference >= 0 ? "text-green-600" : "text-red-600"}`}
                                >
                                  {team.legsDifference > 0 ? "+" : ""}
                                  {team.legsDifference}
                                </span>
                              </td>
                              <td className="text-center p-4">
                                <div className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg font-bold text-lg">
                                  {team.points}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="results">
                <Card className="overflow-hidden shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Target className="h-6 w-6" />
                      Alle Ergebnisse ({completedMatches.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {completedMatches.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">Noch keine Ergebnisse verfügbar</p>
                    ) : (
                      <div className="space-y-4">
                        {completedMatches
                          .sort((a, b) => new Date(b.match_date) - new Date(a.match_date))
                          .map((match) => {
                            const homeScore = match.home_score || 0
                            const awayScore = match.away_score || 0
                            let matchColor = "bg-gray-50 border-gray-200"

                            if (homeScore > awayScore) {
                              matchColor = "bg-green-50 border-green-200"
                            } else if (awayScore > homeScore) {
                              matchColor = "bg-red-50 border-red-200"
                            } else {
                              matchColor = "bg-yellow-50 border-yellow-200"
                            }

                            return (
                              <div
                                key={match.id}
                                className={`${matchColor} border-2 rounded-xl p-6 shadow-sm hover:shadow-md transition-all`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-8">
                                    <div className="text-center min-w-[140px]">
                                      <div className="font-bold text-xl mb-1 text-gray-800">
                                        {match.home_team?.name ||
                                          match.home_opponent_team?.name ||
                                          "Team nicht gefunden"}
                                      </div>
                                      <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                        Heim
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4 bg-white rounded-lg px-6 py-3 shadow-sm">
                                      <div className="text-4xl font-bold text-gray-800">{homeScore}</div>
                                      <div className="text-2xl font-medium text-gray-400">:</div>
                                      <div className="text-4xl font-bold text-gray-800">{awayScore}</div>
                                    </div>
                                    <div className="text-center min-w-[140px]">
                                      <div className="font-bold text-xl mb-1 text-gray-800">
                                        {match.away_team?.name ||
                                          match.away_opponent_team?.name ||
                                          "Team nicht gefunden"}
                                      </div>
                                      <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Gast</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-semibold text-gray-700 mb-2">
                                      {new Date(match.match_date).toLocaleDateString("de-DE", {
                                        weekday: "short",
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      })}
                                    </div>
                                    <Badge
                                      className={`
                                        ${
                                          homeScore > awayScore
                                            ? "bg-green-100 text-green-700"
                                            : awayScore > homeScore
                                              ? "bg-red-100 text-red-700"
                                              : "bg-yellow-100 text-yellow-700"
                                        }
                                        font-medium
                                      `}
                                    >
                                      {homeScore > awayScore
                                        ? "Heimsieg"
                                        : awayScore > homeScore
                                          ? "Auswärtssieg"
                                          : "Unentschieden"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fixtures">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      Kommende Spiele ({upcomingMatches.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {upcomingMatches.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">Keine kommenden Spiele geplant</p>
                    ) : (
                      <div className="space-y-4">
                        {upcomingMatches
                          .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))
                          .map((match) => (
                            <div
                              key={match.id}
                              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-8">
                                  <div className="text-center min-w-[140px]">
                                    <div className="font-semibold text-lg text-gray-900">
                                      {match.home_team?.name || match.home_opponent_team?.name || "Team nicht gefunden"}
                                    </div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Heim</div>
                                  </div>
                                  <div className="text-2xl font-bold text-gray-400">vs</div>
                                  <div className="text-center min-w-[140px]">
                                    <div className="font-semibold text-lg text-gray-900">
                                      {match.away_team?.name || match.away_opponent_team?.name || "Team nicht gefunden"}
                                    </div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Gast</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-gray-900 mb-1">
                                    {new Date(match.match_date).toLocaleDateString("de-DE", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {new Date(match.match_date).toLocaleDateString("de-DE", {
                                      weekday: "long",
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="teams">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Users className="h-6 w-6 text-orange-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Teams & Kader</h2>
                  </div>

                  <div className="grid gap-8">
                    {teams.map((team) => {
                      const teamPlayers = players.filter((player) => player.team_id === team.id)
                      const teamStats = standings.find((s) => s.team === team.name)

                      return (
                        <Card key={team.id} className="overflow-hidden">
                          <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-xl font-bold text-gray-900">{team.name}</CardTitle>
                              <div className="flex items-center gap-4">
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 font-semibold">
                                  {teamPlayers.length} Spieler
                                </Badge>
                                {teamStats && (
                                  <Badge className="bg-orange-600 text-white font-semibold">
                                    {teamStats.points} Punkte
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="grid md:grid-cols-2 gap-6">
                              {teamStats && (
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-3">Saisonstatistik</h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                                      <div className="text-2xl font-bold text-gray-900">{teamStats.played}</div>
                                      <div className="text-sm text-gray-600">Spiele</div>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-3 text-center">
                                      <div className="text-2xl font-bold text-green-600">{teamStats.won}</div>
                                      <div className="text-sm text-gray-600">Siege</div>
                                    </div>
                                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                                      <div className="text-2xl font-bold text-yellow-600">{teamStats.drawn}</div>
                                      <div className="text-sm text-gray-600">Unentschieden</div>
                                    </div>
                                    <div className="bg-red-50 rounded-lg p-3 text-center">
                                      <div className="text-2xl font-bold text-red-600">{teamStats.lost}</div>
                                      <div className="text-sm text-gray-600">Niederlagen</div>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-3 text-center col-span-2">
                                      <div className="text-2xl font-bold text-blue-600">
                                        {teamStats.legsDifference > 0 ? "+" : ""}
                                        {teamStats.legsDifference}
                                      </div>
                                      <div className="text-sm text-gray-600">Legs-Differenz</div>
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
                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                      >
                                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                          <span className="text-sm font-semibold text-orange-600">{index + 1}</span>
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-900">{player.name}</div>
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

              <TabsContent value="legstats">
                <Card className="overflow-hidden shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Target className="h-6 w-6" />
                      Spieler-Statistiken ({playerLegStats.length} Spieler)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {playerLegStats.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">Keine Leg-Statistiken verfügbar</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-4 font-semibold text-gray-700">Rang</th>
                              <th className="text-left p-4 font-semibold text-gray-700">Spieler</th>
                              <th className="text-center p-4 font-semibold text-gray-700">Legs</th>
                              <th className="text-center p-4 font-semibold text-gray-700">180er</th>
                              <th className="text-center p-4 font-semibold text-gray-700">171er</th>
                              <th className="text-center p-4 font-semibold text-gray-700">20er</th>
                              <th className="text-center p-4 font-semibold text-gray-700">19er</th>
                              <th className="text-center p-4 font-semibold text-gray-700">18er</th>
                              <th className="text-center p-4 font-semibold text-gray-700">17er</th>
                              <th className="text-center p-4 font-semibold text-gray-700">16er</th>
                              <th className="text-center p-4 font-semibold text-gray-700">15er</th>
                              <th className="text-center p-4 font-semibold text-gray-700">High Ton</th>
                              <th className="text-center p-4 font-semibold text-gray-700">Ton</th>
                              <th className="text-center p-4 font-semibold text-gray-700">Shanghai</th>
                              <th className="text-center p-4 font-semibold text-gray-700">95+</th>
                              <th className="text-center p-4 font-semibold text-gray-700">Bull</th>
                            </tr>
                          </thead>
                          <tbody>
                            {playerLegStats.map((player, index) => (
                              <tr key={player.name} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="p-4">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="font-bold text-blue-600">{index + 1}</span>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="font-semibold text-gray-900 text-lg">{player.name}</div>
                                </td>
                                <td className="text-center p-4 font-medium">{player.legs_played}</td>
                                <td className="text-center p-4">
                                  <Badge className="bg-red-100 text-red-800 font-bold">{player.throws_180}</Badge>
                                </td>
                                <td className="text-center p-4">
                                  <Badge className="bg-orange-100 text-orange-800 font-bold">{player.throws_171}</Badge>
                                </td>
                                <td className="text-center p-4">
                                  <Badge className="bg-yellow-100 text-yellow-800 font-bold">{player.throws_20}</Badge>
                                </td>
                                <td className="text-center p-4">
                                  <Badge className="bg-yellow-100 text-yellow-800 font-bold">{player.throws_19}</Badge>
                                </td>
                                <td className="text-center p-4">
                                  <Badge className="bg-yellow-100 text-yellow-800 font-bold">{player.throws_18}</Badge>
                                </td>
                                <td className="text-center p-4">
                                  <Badge className="bg-yellow-100 text-yellow-800 font-bold">{player.throws_17}</Badge>
                                </td>
                                <td className="text-center p-4">
                                  <Badge className="bg-yellow-100 text-yellow-800 font-bold">{player.throws_16}</Badge>
                                </td>
                                <td className="text-center p-4">
                                  <Badge className="bg-yellow-100 text-yellow-800 font-bold">{player.throws_15}</Badge>
                                </td>
                                <td className="text-center p-4">
                                  <Badge className="bg-purple-100 text-purple-800 font-bold">
                                    {player.throws_high_tonne}
                                  </Badge>
                                </td>
                                <td className="text-center p-4">
                                  <Badge className="bg-green-100 text-green-800 font-bold">{player.throws_tonne}</Badge>
                                </td>
                                <td className="text-center p-4">
                                  <Badge className="bg-indigo-100 text-indigo-800 font-bold">
                                    {player.throws_shanghai}
                                  </Badge>
                                </td>
                                <td className="text-center p-4">
                                  <Badge className="bg-teal-100 text-teal-800 font-bold">{player.throws_95_plus}</Badge>
                                </td>
                                <td className="text-center p-4">
                                  <Badge className="bg-pink-100 text-pink-800 font-bold">{player.throws_bull}</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
