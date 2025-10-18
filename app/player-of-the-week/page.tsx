"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Target, Award, Calendar, TrendingUp } from "lucide-react"
import { Header } from "@/components/header"
import { createBrowserClient } from "@supabase/ssr"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function PlayerOfTheWeekPage() {
  const [dartType, setDartType] = useState<"edart" | "steeldart">("edart")
  const [topPlayer, setTopPlayer] = useState<any>(null)
  const [topThreePlayers, setTopThreePlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weekRange, setWeekRange] = useState({ start: "", end: "" })

  useEffect(() => {
    const loadPlayerOfTheWeek = async () => {
      try {
        setLoading(true)
        const today = new Date()
        const lastWeekEnd = new Date(today)
        lastWeekEnd.setDate(today.getDate() - 7)
        const lastWeekStart = new Date(today)
        lastWeekStart.setDate(today.getDate() - 14)

        setWeekRange({
          start: lastWeekStart.toLocaleDateString("de-DE"),
          end: lastWeekEnd.toLocaleDateString("de-DE"),
        })

        const { data: legStatsData, error: legStatsError } = await supabase
          .from("leg_statistics")
          .select(
            `
            *,
            player:club_players!leg_statistics_player_id_fkey(name, photo_url)
          `,
          )
          .eq("dart_type", dartType)
          .gte("created_at", lastWeekStart.toISOString())
          .lte("created_at", lastWeekEnd.toISOString())

        if (legStatsError) {
          console.error("Error fetching leg statistics:", legStatsError)
          return
        }

        if (!legStatsData || legStatsData.length === 0) {
          console.log(`No statistics found for ${dartType}`)
          setTopPlayer(null)
          setTopThreePlayers([])
          setLoading(false)
          return
        }

        const playerMap = new Map()

        legStatsData.forEach((stat) => {
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
              throws_19: 0,
              throws_18: 0,
              throws_17: 0,
              throws_16: 0,
              throws_15: 0,
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
          player.throws_19 += stat.throws_19 || 0
          player.throws_18 += stat.throws_18 || 0
          player.throws_17 += stat.throws_17 || 0
          player.throws_16 += stat.throws_16 || 0
          player.throws_15 += stat.throws_15 || 0
        })

        const playersWithPoints = Array.from(playerMap.values()).map((player) => {
          const legWinPoints = player.total_wins * 3
          const throw180Points = player.throws_180 * 25
          const throw171Points = player.throws_171 * 25
          const highTonnePoints = player.throws_high_tonne * 18
          const tonnePoints = player.throws_tonne * 15
          const throw95PlusPoints = player.throws_95_plus * 12
          const shanghaiPoints = player.throws_shanghai * 10
          const bullPoints = player.throws_bull * 8
          const throw20Points = player.throws_20 * 6
          const throw19Points = player.throws_19 * 5
          const throw18Points = player.throws_18 * 4
          const throw17Points = player.throws_17 * 3
          const throw16Points = player.throws_16 * 2
          const throw15Points = player.throws_15 * 1

          const totalPoints =
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

          return {
            ...player,
            total_points: totalPoints,
            win_percentage: player.total_legs > 0 ? (player.total_wins / player.total_legs) * 100 : 0,
          }
        })

        const sortedPlayers = playersWithPoints.sort((a, b) => {
          if (b.total_points !== a.total_points) {
            return b.total_points - a.total_points
          }
          if (b.total_wins !== a.total_wins) {
            return b.total_wins - a.total_wins
          }
          return b.throws_180 - a.throws_180
        })

        setTopPlayer(sortedPlayers[0])
        setTopThreePlayers(sortedPlayers.slice(0, 3))
      } catch (error) {
        console.error("Error loading player of the week:", error)
      } finally {
        setLoading(false)
      }
    }

    loadPlayerOfTheWeek()
  }, [dartType])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  const getDartTypeLabel = (type: "edart" | "steeldart") => {
    return type === "edart" ? "E-Dart" : "Steel-Dart"
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-orange-600 rounded-3xl mb-4 sm:mb-6 shadow-xl">
            <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Spieler der Woche</h1>
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Calendar className="h-5 w-5" />
            <p className="text-base sm:text-lg">
              Vorwoche: {weekRange.start} - {weekRange.end}
            </p>
          </div>
        </div>

        <Tabs value={dartType} onValueChange={(value) => setDartType(value as "edart" | "steeldart")} className="mb-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="edart">E-Dart</TabsTrigger>
            <TabsTrigger value="steeldart">Steel-Dart</TabsTrigger>
          </TabsList>

          <TabsContent value={dartType} className="mt-6">
            {!topPlayer ? (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Keine Daten verfügbar</h2>
                <p className="text-gray-600">
                  Für {getDartTypeLabel(dartType)} in der Vorwoche ({weekRange.start} - {weekRange.end}) wurden noch
                  keine Statistiken eingegeben.
                </p>
              </div>
            ) : (
              <>
                <Card className="shadow-xl border-0 bg-white mb-6 sm:mb-8">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle className="flex items-center justify-center gap-2 text-xl lg:text-2xl font-bold">
                      <Award className="h-6 w-6 lg:h-7 lg:w-7 text-orange-600" />
                      {getDartTypeLabel(dartType)} - Gewinner der Vorwoche
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 lg:p-8">
                    <div className="flex flex-col md:flex-row items-center gap-6 lg:gap-8">
                      <div className="relative">
                        <div className="absolute -top-2 -right-2 bg-orange-600 rounded-full p-2 shadow-lg z-10">
                          <Trophy className="h-5 w-5 text-white" />
                        </div>
                        <Avatar className="h-32 w-32 lg:h-40 lg:w-40 border-4 border-orange-200">
                          <AvatarImage src={topPlayer.photo_url || "/placeholder.svg"} />
                          <AvatarFallback className="bg-orange-100 text-orange-700 text-4xl font-bold">
                            {topPlayer.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="flex-1 text-center md:text-left">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">{topPlayer.name}</h2>
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
                          <Badge className="bg-orange-600 text-white text-lg px-4 py-2 font-bold">
                            {topPlayer.total_points} Punkte
                          </Badge>
                          <Badge className="bg-gray-100 text-gray-900 text-base px-3 py-1.5 border border-gray-200">
                            {topPlayer.win_percentage.toFixed(1)}% Gewinnrate
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-2xl font-bold text-orange-600">{topPlayer.total_wins}</div>
                            <div className="text-sm text-gray-600">Leg Wins</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-2xl font-bold text-orange-600">{topPlayer.throws_180}</div>
                            <div className="text-sm text-gray-600">180er</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-2xl font-bold text-orange-600">{topPlayer.throws_171}</div>
                            <div className="text-sm text-gray-600">171er</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-2xl font-bold text-orange-600">{topPlayer.throws_high_tonne}</div>
                            <div className="text-sm text-gray-600">High Tonne</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-2xl font-bold text-orange-600">{topPlayer.throws_tonne}</div>
                            <div className="text-sm text-gray-600">Tonne</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-2xl font-bold text-orange-600">{topPlayer.throws_95_plus}</div>
                            <div className="text-sm text-gray-600">95+</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-2xl font-bold text-orange-600">{topPlayer.throws_shanghai}</div>
                            <div className="text-sm text-gray-600">Shanghai</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-2xl font-bold text-orange-600">{topPlayer.throws_bull}</div>
                            <div className="text-sm text-gray-600">Bull</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-xl border-0 bg-white">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                      <TrendingUp className="h-6 w-6 text-orange-600" />
                      {getDartTypeLabel(dartType)} - Top 3 der Vorwoche
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-3 gap-4 lg:gap-6">
                      {topThreePlayers.map((player, index) => (
                        <div
                          key={player.player_id}
                          className="border-2 border-gray-200 rounded-xl p-4 hover:border-orange-300 transition-colors"
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full font-bold text-orange-700 text-lg">
                              #{index + 1}
                            </div>
                            {index === 0 && <Trophy className="h-5 w-5 text-orange-600" />}
                            {index === 1 && <Award className="h-5 w-5 text-gray-500" />}
                            {index === 2 && <Target className="h-5 w-5 text-orange-400" />}
                          </div>

                          <div className="text-center mb-4">
                            <Avatar className="h-20 w-20 mx-auto mb-3 border-2 border-gray-200">
                              <AvatarImage src={player.photo_url || "/placeholder.svg"} />
                              <AvatarFallback className="bg-orange-100 text-orange-700 text-2xl font-bold">
                                {player.name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{player.name}</h3>
                            <Badge className="bg-orange-600 text-white px-3 py-1">{player.total_points} Punkte</Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
                              <div className="text-lg font-bold text-orange-600">{player.total_wins}</div>
                              <div className="text-xs text-gray-600">Wins</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
                              <div className="text-lg font-bold text-orange-600">{player.throws_180}</div>
                              <div className="text-xs text-gray-600">180er</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
                              <div className="text-lg font-bold text-orange-600">{player.throws_171}</div>
                              <div className="text-xs text-gray-600">171er</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
                              <div className="text-lg font-bold text-orange-600">
                                {player.win_percentage.toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-600">Win Rate</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
