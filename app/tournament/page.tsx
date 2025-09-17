"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Target, Users, Calendar, TrendingUp, Award, Medal, Star } from "lucide-react"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Team {
  id: string
  name: string
  logo_url?: string
  user_id?: string
}

interface OpponentTeam {
  id: string
  name: string
  logo_url?: string
}

interface Match {
  id: string
  home_team_id?: string
  away_team_id?: string
  home_opponent_team_id?: string
  away_opponent_team_id?: string
  home_score?: number
  away_score?: number
  match_date: string
  dart_type: string
  home_team?: Team
  away_team?: Team
  home_opponent_team?: OpponentTeam
  away_opponent_team?: OpponentTeam
  season?: { id: string; name: string; type: string }
}

export default function DartLeagueDashboard() {
  const [teams, setTeams] = useState<Team[]>([])
  const [opponentTeams, setOpponentTeams] = useState<OpponentTeam[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [legStatistics, setLegStatistics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dartTypeFilter, setDartTypeFilter] = useState("gesamt")

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
    const standings: Record<string, any> = {}

    // Initialize standings for all teams
    teams.forEach((team) => {
      standings[team.id] = {
        id: team.id,
        name: team.name,
        logo_url: team.logo_url,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        legsFor: 0,
        legsAgainst: 0,
        legsDiff: 0,
        points: 0,
      }
    })

    // Calculate standings from matches
    matches.forEach((match) => {
      if (match.home_score !== null && match.away_score !== null) {
        const homeId = match.home_team_id
        const awayId = match.away_team_id

        // Only process matches involving our teams
        if (homeId || awayId) {
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
      team.legsDiff = team.legsFor - team.legsAgainst
    })

    return Object.values(standings).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.legsDiff !== a.legsDiff) return b.legsDiff - a.legsDiff
      return b.legsFor - a.legsFor
    })
  }

  const getTopScorers = () => {
    const playerStats: Record<string, any> = {}

    legStatistics.forEach((stat) => {
      const playerId = stat.player_id
      if (!playerStats[playerId]) {
        playerStats[playerId] = {
          id: playerId,
          name: stat.player?.name || "Unknown",
          photo_url: stat.player?.photo_url,
          totalLegs: 0,
          totalScore: 0,
          averageScore: 0,
          highestFinish: 0,
          finishes: 0,
        }
      }

      playerStats[playerId].totalLegs++
      playerStats[playerId].totalScore += stat.score || 0
      if (stat.finish_score && stat.finish_score > playerStats[playerId].highestFinish) {
        playerStats[playerId].highestFinish = stat.finish_score
      }
      if (stat.finish_score) {
        playerStats[playerId].finishes++
      }
    })

    Object.values(playerStats).forEach((player: any) => {
      player.averageScore = player.totalLegs > 0 ? player.totalScore / player.totalLegs : 0
    })

    return Object.values(playerStats)
      .sort((a: any, b: any) => b.averageScore - a.averageScore)
      .slice(0, 10)
  }

  const getRecentMatches = () => {
    return matches
      .filter((match) => match.home_score !== null && match.away_score !== null)
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
      .slice(0, 5)
  }

  const getUpcomingMatches = () => {
    return matches
      .filter((match) => match.home_score === null && match.away_score === null)
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
      .slice(0, 5)
  }

  const standings = calculateStandings()
  const topScorers = getTopScorers()
  const recentMatches = getRecentMatches()
  const upcomingMatches = getUpcomingMatches()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dart Liga Dashboard</h1>
          <p className="text-muted-foreground">Übersicht über Teams, Spieler und Statistiken</p>
        </div>
        <Select value={dartTypeFilter} onValueChange={setDartTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Dart-Typ wählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gesamt">Alle Dart-Typen</SelectItem>
            <SelectItem value="501">501</SelectItem>
            <SelectItem value="301">301</SelectItem>
            <SelectItem value="cricket">Cricket</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
            <p className="text-xs text-muted-foreground">Aktive Teams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spieler</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{players.length}</div>
            <p className="text-xs text-muted-foreground">Registrierte Spieler</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spiele</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{matches.length}</div>
            <p className="text-xs text-muted-foreground">Gesamt Spiele</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Legs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{legStatistics.length}</div>
            <p className="text-xs text-muted-foreground">Gespielte Legs</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="standings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="standings">Tabelle</TabsTrigger>
          <TabsTrigger value="matches">Spiele</TabsTrigger>
          <TabsTrigger value="players">Top Spieler</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Liga Tabelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Pos</th>
                      <th className="text-left p-2">Team</th>
                      <th className="text-center p-2">Sp</th>
                      <th className="text-center p-2">S</th>
                      <th className="text-center p-2">U</th>
                      <th className="text-center p-2">N</th>
                      <th className="text-center p-2">Legs</th>
                      <th className="text-center p-2">Diff</th>
                      <th className="text-center p-2">Pkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, index) => (
                      <tr key={team.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {index + 1}
                            {index === 0 && <Medal className="h-4 w-4 text-yellow-500" />}
                            {index === 1 && <Medal className="h-4 w-4 text-gray-400" />}
                            {index === 2 && <Medal className="h-4 w-4 text-amber-600" />}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {team.logo_url && (
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={team.logo_url || "/placeholder.svg"} alt={team.name} />
                                <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            )}
                            <span className="font-medium">{team.name}</span>
                          </div>
                        </td>
                        <td className="text-center p-2">{team.played}</td>
                        <td className="text-center p-2 text-green-600">{team.won}</td>
                        <td className="text-center p-2 text-yellow-600">{team.drawn}</td>
                        <td className="text-center p-2 text-red-600">{team.lost}</td>
                        <td className="text-center p-2">
                          {team.legsFor}:{team.legsAgainst}
                        </td>
                        <td className={`text-center p-2 ${team.legsDiff >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {team.legsDiff > 0 ? "+" : ""}
                          {team.legsDiff}
                        </td>
                        <td className="text-center p-2 font-bold">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Letzte Spiele
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentMatches.map((match) => (
                  <div key={match.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="font-medium text-sm">
                          {match.home_team?.name || match.home_opponent_team?.name}
                        </div>
                        <div className="text-xs text-muted-foreground">vs</div>
                        <div className="font-medium text-sm">
                          {match.away_team?.name || match.away_opponent_team?.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {match.home_score} : {match.away_score}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(match.match_date).toLocaleDateString("de-DE")}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Kommende Spiele
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingMatches.map((match) => (
                  <div key={match.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="font-medium text-sm">
                          {match.home_team?.name || match.home_opponent_team?.name}
                        </div>
                        <div className="text-xs text-muted-foreground">vs</div>
                        <div className="font-medium text-sm">
                          {match.away_team?.name || match.away_opponent_team?.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <Badge variant="outline">Geplant</Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(match.match_date).toLocaleDateString("de-DE")}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="players" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Top Spieler (Durchschnitt)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topScorers.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{index + 1}</span>
                        {index === 0 && <Award className="h-4 w-4 text-yellow-500" />}
                      </div>
                      <Avatar>
                        <AvatarImage src={player.photo_url || "/placeholder.svg"} alt={player.name} />
                        <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-muted-foreground">{player.totalLegs} Legs gespielt</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{player.averageScore.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Ø Punkte</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => {
              const teamPlayers = players.filter((player) => player.team_id === team.id)
              const teamStats = standings.find((s) => s.id === team.id)

              return (
                <Card key={team.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {team.logo_url && (
                        <Avatar>
                          <AvatarImage src={team.logo_url || "/placeholder.svg"} alt={team.name} />
                          <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      {team.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {teamStats && (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-lg font-bold">{teamStats.points}</div>
                          <div className="text-xs text-muted-foreground">Punkte</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{teamStats.won}</div>
                          <div className="text-xs text-muted-foreground">Siege</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{teamStats.played}</div>
                          <div className="text-xs text-muted-foreground">Spiele</div>
                        </div>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium mb-2">Spieler ({teamPlayers.length})</h4>
                      <div className="space-y-2">
                        {teamPlayers.slice(0, 3).map((player) => (
                          <div key={player.id} className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={player.photo_url || "/placeholder.svg"} alt={player.name} />
                              <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{player.name}</span>
                          </div>
                        ))}
                        {teamPlayers.length > 3 && (
                          <div className="text-sm text-muted-foreground">+{teamPlayers.length - 3} weitere</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
