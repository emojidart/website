"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp, Crown } from "lucide-react"

interface StatisticsSectionProps {
  legStatistics: any[]
  legStatsLoading: boolean
  matches: any[]
  getTeamDisplayName: (match: any, isHome: boolean) => string
}

export function StatisticsSection({
  legStatistics,
  legStatsLoading,
  matches,
  getTeamDisplayName,
}: StatisticsSectionProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <Tabs defaultValue="by-match" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
          <TabsTrigger value="by-match" className="text-xs sm:text-sm">
            Nach Spielen
          </TabsTrigger>
          <TabsTrigger value="overall" className="text-xs sm:text-sm">
            Gesamtstatistik
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overall" className="space-y-4 sm:space-y-6">
          <Card className="shadow-xl border-0 bg-white">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl font-bold">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                Gesamtstatistik aller Legs
              </CardTitle>
              <p className="text-sm sm:text-base text-muted-foreground">
                Alle Leg-Statistiken
              </p>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {legStatsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Lade Gesamtstatistiken...</p>
                </div>
              ) : legStatistics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Keine Gesamtstatistiken gefunden.</p>
                  <p className="text-sm mt-2">Bonusgelder werden nach dem ersten Spiel angezeigt.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const playerOverallStats: { [key: string]: any } = {}

                    legStatistics.forEach((stat) => {
                      const playerId = stat.player_id
                      if (!playerOverallStats[playerId]) {
                        playerOverallStats[playerId] = {
                          player_id: playerId,
                          player_name: stat.player?.name || "Unbekannt",
                          photo_url: stat.player?.photo_url,
                          total_legs: 0,
                          total_wins: 0,
                          total_180: 0,
                          total_171: 0,
                          total_15: 0,
                          total_16: 0,
                          total_17: 0,
                          total_18: 0,
                          total_19: 0,
                          total_20: 0,
                          total_high_tonne: 0,
                          total_tonne: 0,
                          total_shanghai: 0,
                          total_95_plus: 0,
                          total_under_26: 0,
                          total_under_30: 0,
                          total_semperit: 0,
                          total_bull: 0,
                          win_percentage: 0,
                        }
                      }

                      const actualLegsPlayed = (stat.player_legs_won || 0) + (stat.opponent_legs_won || 0)
                      const legsToAdd = actualLegsPlayed > 0 ? actualLegsPlayed : 1

                      playerOverallStats[playerId].total_legs += legsToAdd
                      playerOverallStats[playerId].total_wins += stat.leg_wins || 0
                      playerOverallStats[playerId].total_180 += stat.throws_180 || 0
                      playerOverallStats[playerId].total_171 += stat.throws_171 || 0
                      playerOverallStats[playerId].total_15 += stat.throws_15 || 0
                      playerOverallStats[playerId].total_16 += stat.throws_16 || 0
                      playerOverallStats[playerId].total_17 += stat.throws_17 || 0
                      playerOverallStats[playerId].total_18 += stat.throws_18 || 0
                      playerOverallStats[playerId].total_19 += stat.throws_19 || 0
                      playerOverallStats[playerId].total_20 += stat.throws_20 || 0
                      playerOverallStats[playerId].total_high_tonne += stat.throws_high_tonne || 0
                      playerOverallStats[playerId].total_tonne += stat.throws_tonne || 0
                      playerOverallStats[playerId].total_shanghai += stat.throws_shanghai || 0
                      playerOverallStats[playerId].total_95_plus += stat.throws_95_plus || 0
                      playerOverallStats[playerId].total_under_26 += stat.throws_under_26 || 0
                      playerOverallStats[playerId].total_under_30 += stat.throws_under_30 || 0
                      playerOverallStats[playerId].total_semperit += stat.semperit_outs || 0
                      playerOverallStats[playerId].total_bull += stat.throws_bull || 0
                    })

                    const sortedStats = Object.values(playerOverallStats)
                      .map((stats: any) => ({
                        ...stats,
                        win_percentage: stats.total_legs > 0 ? (stats.total_wins / stats.total_legs) * 100 : 0,
                      }))
                      .sort((a: any, b: any) => {
                        if (b.win_percentage !== a.win_percentage) return b.win_percentage - a.win_percentage
                        if (b.total_wins !== a.total_wins) return b.total_wins - a.total_wins
                        if (b.total_180 !== a.total_180) return b.total_180 - a.total_180
                        if (b.total_171 !== a.total_171) return b.total_171 - a.total_171
                        if (b.total_20 !== a.total_20) return b.total_20 - a.total_20
                        if (b.total_19 !== a.total_19) return b.total_19 - a.total_19
                        return b.total_18 - a.total_18
                      })

                    return sortedStats.map((stats: any, index: number) => (
                      <Card
                        key={stats.player_id}
                        className={`${index < 3 ? "border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50" : ""}`}
                      >
                        <CardContent className="p-3 sm:p-4 lg:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                            <div className="flex items-center gap-2 sm:gap-3">
                              {index < 3 && (
                                <div className="flex items-center gap-1">
                                  <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
                                    #{index + 1}
                                  </Badge>
                                </div>
                              )}
                              <h3 className="text-lg sm:text-xl font-bold truncate">{stats.player_name}</h3>
                            </div>
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                              <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                {stats.total_wins} Wins
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {stats.win_percentage.toFixed(1)}%
                              </Badge>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                {stats.total_legs} Legs
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4">
                            <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
                              <div className="text-base sm:text-lg lg:text-2xl font-bold text-blue-600">
                                {stats.total_legs}
                              </div>
                              <div className="text-xs text-muted-foreground">Legs</div>
                            </div>
                            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                              <div className="text-base sm:text-lg lg:text-2xl font-bold text-green-600">
                                {stats.total_wins}
                              </div>
                              <div className="text-xs text-muted-foreground">Wins</div>
                            </div>
                            <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg">
                              <div className="text-base sm:text-lg lg:text-2xl font-bold text-purple-600">
                                {stats.total_180}
                              </div>
                              <div className="text-xs text-muted-foreground">180er</div>
                            </div>
                            <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg">
                              <div className="text-base sm:text-lg lg:text-2xl font-bold text-orange-600">
                                {stats.total_171}
                              </div>
                              <div className="text-xs text-muted-foreground">171er</div>
                            </div>
                            <div className="text-center p-2 sm:p-3 bg-yellow-50 rounded-lg">
                              <div className="text-base sm:text-lg lg:text-2xl font-bold text-yellow-600">
                                {stats.total_20}
                              </div>
                              <div className="text-xs text-muted-foreground">20er</div>
                            </div>
                            <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg">
                              <div className="text-base sm:text-lg lg:text-2xl font-bold text-red-600">
                                {stats.total_under_26 + stats.total_under_30 + stats.total_semperit}
                              </div>
                              <div className="text-xs text-muted-foreground">Penalties</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-1 sm:gap-2 text-xs sm:text-sm">
                            <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                              <div className="font-semibold text-slate-700 text-xs sm:text-sm">{stats.total_19}</div>
                              <div className="text-xs text-muted-foreground">19er</div>
                            </div>
                            <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                              <div className="font-semibold text-slate-700 text-xs sm:text-sm">{stats.total_18}</div>
                              <div className="text-xs text-muted-foreground">18er</div>
                            </div>
                            <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                              <div className="font-semibold text-slate-700 text-xs sm:text-sm">{stats.total_17}</div>
                              <div className="text-xs text-muted-foreground">17er</div>
                            </div>
                            <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                              <div className="font-semibold text-slate-700 text-xs sm:text-sm">{stats.total_16}</div>
                              <div className="text-xs text-muted-foreground">16er</div>
                            </div>
                            <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                              <div className="font-semibold text-slate-700 text-xs sm:text-sm">{stats.total_15}</div>
                              <div className="text-xs text-muted-foreground">15er</div>
                            </div>
                            <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                              <div className="font-semibold text-slate-700 text-xs sm:text-sm">
                                {stats.total_high_tonne}
                              </div>
                              <div className="text-xs text-muted-foreground">High Ton</div>
                            </div>
                            <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                              <div className="font-semibold text-slate-700 text-xs sm:text-sm">{stats.total_tonne}</div>
                              <div className="text-xs text-muted-foreground">Ton</div>
                            </div>
                            <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                              <div className="font-semibold text-slate-700 text-xs sm:text-sm">
                                {stats.total_shanghai}
                              </div>
                              <div className="text-xs text-muted-foreground">Shanghai</div>
                            </div>
                            <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                              <div className="font-semibold text-slate-700 text-xs sm:text-sm">
                                {stats.total_95_plus}
                              </div>
                              <div className="text-xs text-muted-foreground">95+</div>
                            </div>
                            <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                              <div className="font-semibold text-slate-700 text-xs sm:text-sm">{stats.total_bull}</div>
                              <div className="text-xs text-muted-foreground">Bull</div>
                            </div>
                            <div className="text-center p-1 sm:p-2 bg-red-50 rounded">
                              <div className="font-semibold text-red-600 text-xs sm:text-sm">
                                {stats.total_under_26}
                              </div>
                              <div className="text-xs text-muted-foreground">U26</div>
                            </div>
                            <div className="text-center p-1 sm:p-2 bg-red-50 rounded">
                              <div className="font-semibold text-red-600 text-xs sm:text-sm">
                                {stats.total_under_30}
                              </div>
                              <div className="text-xs text-muted-foreground">U30</div>
                            </div>
                            <div className="text-center p-1 sm:p-2 bg-red-50 rounded">
                              <div className="font-semibold text-red-600 text-xs sm:text-sm">
                                {stats.total_semperit}
                              </div>
                              <div className="text-xs text-muted-foreground">Semp</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-match">
          <Card className="shadow-xl border-0 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                <TrendingUp className="h-6 w-6 text-orange-600" />
                Spielerstatistiken nach Spiel
              </CardTitle>
              <p className="text-muted-foreground">Detaillierte Leg-Statistiken sortiert nach Spielen</p>
            </CardHeader>
            <CardContent>
              {legStatsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Lade Spielstatistiken...</p>
                </div>
              ) : legStatistics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Keine Leg-Statistiken verfügbar</p>
                  <p className="text-sm">Füge Leg-Statistiken hinzu, um sie hier zu sehen.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const statsByMatch = legStatistics.reduce(
                      (acc, stat) => {
                        const matchKey = stat.match_id || "Unbekanntes Spiel"
                        if (!acc[matchKey]) {
                          acc[matchKey] = []
                        }
                        acc[matchKey].push(stat)
                        return acc
                      },
                      {} as Record<string, typeof legStatistics>,
                    )

                    const matchDetails = matches.reduce(
                      (acc, match) => {
                        acc[match.id] = match
                        return acc
                      },
                      {} as Record<string, (typeof matches)[0]>,
                    )

                    return Object.entries(statsByMatch)
                      .sort(([, a], [, b]) => {
                        const dateA = a[0]?.matches?.match_date || ""
                        const dateB = b[0]?.matches?.match_date || ""
                        return dateB.localeCompare(dateA)
                      })
                      .map(([matchKey, matchStats]) => {
                        const match = matchStats[0]?.matches
                        const matchDate = match?.match_date
                          ? new Date(match.match_date).toLocaleDateString("de-DE")
                          : "Unbekanntes Datum"

                        const playerStats = matchStats.reduce(
                          (acc, stat) => {
                            const playerId = stat.player_id
                            if (!acc[playerId]) {
                              acc[playerId] = {
                                player_id: playerId,
                                player_name: stat.player?.name || "Unbekannt",
                                photo_url: stat.player?.photo_url,
                                total_legs: 0,
                                total_wins: 0,
                                total_180: 0,
                                total_171: 0,
                                total_15: 0,
                                total_16: 0,
                                total_17: 0,
                                total_18: 0,
                                total_19: 0,
                                total_20: 0,
                                total_high_tonne: 0,
                                total_tonne: 0,
                                total_shanghai: 0,
                                total_95_plus: 0,
                                total_under_26: 0,
                                total_under_30: 0,
                                total_semperit: 0,
                                total_bull: 0,
                                win_percentage: 0,
                              }
                            }

                            const actualLegsPlayed = (stat.player_legs_won || 0) + (stat.opponent_legs_won || 0)
                            const legsToAdd = actualLegsPlayed > 0 ? actualLegsPlayed : 1

                            acc[playerId].total_legs += legsToAdd
                            acc[playerId].total_wins += stat.leg_wins || 0
                            acc[playerId].total_180 += stat.throws_180 || 0
                            acc[playerId].total_171 += stat.throws_171 || 0
                            acc[playerId].total_15 += stat.throws_15 || 0
                            acc[playerId].total_16 += stat.throws_16 || 0
                            acc[playerId].total_17 += stat.throws_17 || 0
                            acc[playerId].total_18 += stat.throws_18 || 0
                            acc[playerId].total_19 += stat.throws_19 || 0
                            acc[playerId].total_20 += stat.throws_20 || 0
                            acc[playerId].total_high_tonne += stat.throws_high_tonne || 0
                            acc[playerId].total_tonne += stat.throws_tonne || 0
                            acc[playerId].total_shanghai += stat.throws_shanghai || 0
                            acc[playerId].total_95_plus += stat.throws_95_plus || 0
                            acc[playerId].total_under_26 += stat.throws_under_26 || 0
                            acc[playerId].total_under_30 += stat.throws_under_30 || 0
                            acc[playerId].total_semperit += stat.semperit_outs || 0
                            acc[playerId].total_bull += stat.throws_bull || 0

                            return acc
                          },
                          {} as Record<string, any>,
                        )

                        Object.values(playerStats).forEach((stats: any) => {
                          stats.win_percentage = stats.total_legs > 0 ? (stats.total_wins / stats.total_legs) * 100 : 0
                        })

                        return (
                          <Card key={matchKey} className="border border-gray-200">
                            <CardHeader className="pb-3 p-3 sm:p-4 lg:p-6">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                                <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                                  {match
                                    ? `${getTeamDisplayName(match, true)} vs ${getTeamDisplayName(match, false)}`
                                    : `Spiel ${matchKey}`}
                                </CardTitle>
                                {matchDate && (
                                  <Badge variant="outline" className="text-xs w-fit">
                                    {matchDate}
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-4 lg:p-6">
                              <div className="space-y-3 sm:space-y-4">
                                {Object.values(playerStats)
                                  .sort((a: any, b: any) => b.wins - a.wins || b.total_180 - a.total_180)
                                  .map((player: any, index) => (
                                    <Card
                                      key={`${matchKey}-${player.player_id}`}
                                      className={`${index < 3 && player.wins > 0 ? "border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50" : ""}`}
                                    >
                                      <CardContent className="p-3 sm:p-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2 sm:gap-0">
                                          <div className="flex items-center gap-2">
                                            {index < 3 && player.wins > 0 && (
                                              <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                                            )}
                                            <h4 className="font-semibold text-base sm:text-lg truncate">
                                              {player.player_name}
                                            </h4>
                                          </div>
                                          <div className="flex items-center gap-1 sm:gap-2">
                                            <Badge
                                              variant={player.wins > 0 ? "default" : "secondary"}
                                              className={`text-xs ${player.wins > 0 ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"}`}
                                            >
                                              {player.total_wins} Wins
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                              {player.total_legs} Legs
                                            </Badge>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">180er:</span>
                                            <span className="font-medium">{player.total_180}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">171er:</span>
                                            <span className="font-medium">{player.total_171}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">20er:</span>
                                            <span className="font-medium">{player.total_20}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">19er:</span>
                                            <span className="font-medium">{player.total_19}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">18er:</span>
                                            <span className="font-medium">{player.total_18}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">17er:</span>
                                            <span className="font-medium">{player.total_17}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">16er:</span>
                                            <span className="font-medium">{player.total_16}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">15er:</span>
                                            <span className="font-medium">{player.total_15}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">High Tonne:</span>
                                            <span className="font-medium">{player.total_high_tonne}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Tonne:</span>
                                            <span className="font-medium">{player.total_tonne}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Shanghai:</span>
                                            <span className="font-medium">{player.total_shanghai}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">95+:</span>
                                            <span className="font-medium">{player.total_95_plus}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Bull:</span>
                                            <span className="font-medium">{player.total_bull}</span>
                                          </div>
                                        </div>

                                        {(player.total_under_26 > 0 ||
                                          player.total_under_30 > 0 ||
                                          player.total_semperit > 0) && (
                                          <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                                            <div className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                                              ⚠️ Check Bilanz
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                              {player.total_under_26 > 0 && (
                                                <div className="flex justify-between text-red-600">
                                                  <span>Unter 26:</span>
                                                  <span className="font-medium">{player.total_under_26}</span>
                                                </div>
                                              )}
                                              {player.total_under_30 > 0 && (
                                                <div className="flex justify-between text-red-600">
                                                  <span>Unter 30:</span>
                                                  <span className="font-medium">{player.total_under_30}</span>
                                                </div>
                                              )}
                                              {player.total_semperit > 0 && (
                                                <div className="flex justify-between text-red-600">
                                                  <span>Semperit:</span>
                                                  <span className="font-medium">{player.total_semperit}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                          <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Gewinnquote:</span>
                                            <span className="font-medium">
                                              {player.total_legs > 0
                                                ? `${((player.total_wins / player.total_legs) * 100).toFixed(1)}%`
                                                : "0%"}
                                            </span>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
