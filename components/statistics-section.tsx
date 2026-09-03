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
  
  const hasRealData = (stat: any) => {
    const pLegs = stat?.player_legs_won ?? 0
    const oLegs = stat?.opponent_legs_won ?? 0
    const legs = pLegs + oLegs

    const anyThrows =
      (stat?.throws_180 ?? 0) > 0 ||
      (stat?.throws_171 ?? 0) > 0 ||
      (stat?.throws_20 ?? 0) > 0 ||
      (stat?.throws_19 ?? 0) > 0 ||
      (stat?.throws_18 ?? 0) > 0 ||
      (stat?.throws_17 ?? 0) > 0 ||
      (stat?.throws_16 ?? 0) > 0 ||
      (stat?.throws_15 ?? 0) > 0 ||
      (stat?.throws_high_tonne ?? 0) > 0 ||
      (stat?.throws_tonne ?? 0) > 0 ||
      (stat?.throws_shanghai ?? 0) > 0 ||
      (stat?.throws_95_plus ?? 0) > 0 ||
      (stat?.throws_under_26 ?? 0) > 0 ||
      (stat?.throws_under_30 ?? 0) > 0 ||
      (stat?.semperit_outs ?? 0) > 0 ||
      (stat?.throws_bull ?? 0) > 0

    
    return legs > 0 || anyThrows
  }

  
  const realLegStatistics = Array.isArray(legStatistics) ? legStatistics.filter(hasRealData) : []

  return (
    <div className="space-y-4 sm:space-y-5">
      <Tabs defaultValue="by-match" className="w-full">
        {/* cleaner tabs (app style like your dashboard tabs) */}
        <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5 shadow-none sm:mb-5">
          <TabsTrigger
            value="by-match"
            className="h-10 rounded-xl px-3 text-xs font-black text-slate-500 shadow-none data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-sm sm:text-sm"
          >
            Nach Spielen
          </TabsTrigger>
          <TabsTrigger
            value="overall"
            className="h-10 rounded-xl px-3 text-xs font-black text-slate-500 shadow-none data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-sm sm:text-sm"
          >
            Gesamt
          </TabsTrigger>
        </TabsList>

        {/* OVERALL */}
        <TabsContent value="overall" className="space-y-4 sm:space-y-6">
          <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_70px_-46px_rgba(15,23,42,0.55)] sm:rounded-[28px]">
            <CardHeader className="border-b border-slate-100 px-4 py-5 sm:px-6 sm:py-6">
              <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                <Trophy className="h-5 w-5 text-orange-600" />
                Gesamtstatistik
              </CardTitle>
              <p className="text-sm text-slate-500">Alle Statistiken</p>
            </CardHeader>

            <CardContent className="px-3 py-4 sm:px-6 sm:py-6">
              {legStatsLoading ? (
                <div className="py-10 text-center">
                  <div className="mx-auto h-9 w-9 rounded-full border-4 border-orange-600/20 border-t-orange-600 animate-spin" />
                  <p className="mt-3 text-sm text-slate-500">Lade Gesamtstatistiken...</p>
                </div>
              ) : realLegStatistics.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200">
                    <Trophy className="h-6 w-6 text-orange-600" />
                  </div>
                  <p className="font-semibold text-slate-950">Keine Gesamtstatistiken gefunden.</p>
                  <p className="mt-1 text-sm text-slate-500">Sobald echte Daten vorhanden sind, erscheinen sie hier.</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {(() => {
                    const playerOverallStats: { [key: string]: any } = {}

                    realLegStatistics.forEach((stat) => {
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

                      const pLegs = stat.player_legs_won ?? 0
                      const oLegs = stat.opponent_legs_won ?? 0
                      const actualLegsPlayed = pLegs + oLegs

                      
                      playerOverallStats[playerId].total_legs += actualLegsPlayed
                      playerOverallStats[playerId].total_wins += pLegs

                      playerOverallStats[playerId].total_180 += stat.throws_180 ?? 0
                      playerOverallStats[playerId].total_171 += stat.throws_171 ?? 0
                      playerOverallStats[playerId].total_15 += stat.throws_15 ?? 0
                      playerOverallStats[playerId].total_16 += stat.throws_16 ?? 0
                      playerOverallStats[playerId].total_17 += stat.throws_17 ?? 0
                      playerOverallStats[playerId].total_18 += stat.throws_18 ?? 0
                      playerOverallStats[playerId].total_19 += stat.throws_19 ?? 0
                      playerOverallStats[playerId].total_20 += stat.throws_20 ?? 0
                      playerOverallStats[playerId].total_high_tonne += stat.throws_high_tonne ?? 0
                      playerOverallStats[playerId].total_tonne += stat.throws_tonne ?? 0
                      playerOverallStats[playerId].total_shanghai += stat.throws_shanghai ?? 0
                      playerOverallStats[playerId].total_95_plus += stat.throws_95_plus ?? 0
                      playerOverallStats[playerId].total_under_26 += stat.throws_under_26 ?? 0
                      playerOverallStats[playerId].total_under_30 += stat.throws_under_30 ?? 0
                      playerOverallStats[playerId].total_semperit += stat.semperit_outs ?? 0
                      playerOverallStats[playerId].total_bull += stat.throws_bull ?? 0
                    })

                    
                    const cleaned = Object.values(playerOverallStats).filter((s: any) => {
                      const anyStats =
                        (s.total_180 ?? 0) > 0 ||
                        (s.total_171 ?? 0) > 0 ||
                        (s.total_20 ?? 0) > 0 ||
                        (s.total_19 ?? 0) > 0 ||
                        (s.total_18 ?? 0) > 0 ||
                        (s.total_17 ?? 0) > 0 ||
                        (s.total_16 ?? 0) > 0 ||
                        (s.total_15 ?? 0) > 0 ||
                        (s.total_high_tonne ?? 0) > 0 ||
                        (s.total_tonne ?? 0) > 0 ||
                        (s.total_shanghai ?? 0) > 0 ||
                        (s.total_95_plus ?? 0) > 0 ||
                        (s.total_under_26 ?? 0) > 0 ||
                        (s.total_under_30 ?? 0) > 0 ||
                        (s.total_semperit ?? 0) > 0 ||
                        (s.total_bull ?? 0) > 0
                      return (s.total_legs ?? 0) > 0 || anyStats
                    })

                    const sortedStats = cleaned
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

                    return sortedStats.map((stats: any, index: number) => {
                      const isTop = index < 3
                      return (
                        <div
                          key={stats.player_id}
                          className={[
                            "rounded-[20px] border bg-white shadow-[0_14px_42px_-34px_rgba(15,23,42,0.55)] sm:rounded-[22px]",
                            "p-3 sm:p-4",
                            isTop ? "border-orange-200" : "border-slate-200",
                          ].join(" ")}
                        >
                          {/* header row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {isTop ? (
                                  <span className="inline-flex items-center gap-1 rounded-xl border border-orange-200 bg-orange-50 px-2 py-1">
                                    <Crown className="h-4 w-4 text-orange-600" />
                                    <span className="text-xs font-bold text-orange-700">#{index + 1}</span>
                                  </span>
                                ) : null}
                                <h3 className="break-words text-[15px] font-black leading-snug text-slate-950 sm:text-base">
                                  {stats.player_name}
                                </h3>
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Gewinnquote:{" "}
                                <span className="font-semibold text-slate-800">{stats.win_percentage.toFixed(1)}%</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 justify-end">
                              <Badge className="rounded-full bg-slate-950 px-2.5 text-[11px] font-black text-white shadow-none">{stats.total_wins} Wins</Badge>
                              <Badge variant="outline" className="text-[11px] border-slate-200">
                                {stats.total_legs} Legs
                              </Badge>
                            </div>
                          </div>

                          {/* main stats chips */}
                          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-2 py-3 text-center">
                              <div className="text-lg font-black tracking-tight text-slate-950">{stats.total_180}</div>
                              <div className="text-[10px] text-slate-500">180</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-2 py-3 text-center">
                              <div className="text-lg font-black tracking-tight text-slate-950">{stats.total_171}</div>
                              <div className="text-[10px] text-slate-500">171</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-2 py-3 text-center">
                              <div className="text-lg font-black tracking-tight text-slate-950">{stats.total_20}</div>
                              <div className="text-[10px] text-slate-500">20</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-2 py-3 text-center">
                              <div className="text-lg font-black tracking-tight text-slate-950">{stats.total_19}</div>
                              <div className="text-[10px] text-slate-500">19</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-2 py-3 text-center">
                              <div className="text-lg font-black tracking-tight text-slate-950">{stats.total_18}</div>
                              <div className="text-[10px] text-slate-500">18</div>
                            </div>
                            <div className="rounded-xl border border-red-200 bg-red-50 px-2 py-2 text-center">
                              <div className="text-lg font-extrabold text-red-700">
                                {stats.total_under_26 + stats.total_under_30 + stats.total_semperit}
                              </div>
                              <div className="text-[10px] text-red-700/80">Under-Würfe</div>
                            </div>
                          </div>

                          {/* details (compact) */}
                          <div className="mt-3 rounded-[18px] border border-slate-200 bg-slate-50/70 p-3">
                            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4 xl:grid-cols-8">
                              {[
                                ["17", stats.total_17],
                                ["16", stats.total_16],
                                ["15", stats.total_15],
                                ["HighTon", stats.total_high_tonne],
                                ["Ton", stats.total_tonne],
                                ["Shanghai", stats.total_shanghai],
                                ["95+", stats.total_95_plus],
                                ["Bull", stats.total_bull],
                              ].map(([label, val]) => (
                                <div key={String(label)} className="rounded-xl border border-slate-200 bg-white px-2 py-2.5">
                                  <div className="text-sm font-bold text-slate-950">{val as any}</div>
                                  <div className="text-[10px] text-slate-500">{label as any}</div>
                                </div>
                              ))}
                            </div>

                            {stats.total_under_26 > 0 || stats.total_under_30 > 0 || stats.total_semperit > 0 ? (
                              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2">
                                <div className="text-[11px] font-bold text-red-700 mb-1">Under-Würfe</div>
                                <div className="grid grid-cols-3 gap-2 text-[11px]">
                                  <div className="flex items-center justify-between rounded-lg bg-white border border-red-200 px-2 py-1">
                                    <span className="text-red-700">U26</span>
                                    <span className="font-bold text-red-700">{stats.total_under_26}</span>
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg bg-white border border-red-200 px-2 py-1">
                                    <span className="text-red-700">U30</span>
                                    <span className="font-bold text-red-700">{stats.total_under_30}</span>
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg bg-white border border-red-200 px-2 py-1">
                                    <span className="text-red-700">Semp</span>
                                    <span className="font-bold text-red-700">{stats.total_semperit}</span>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BY MATCH */}
        <TabsContent value="by-match">
          <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_70px_-46px_rgba(15,23,42,0.55)] sm:rounded-[28px]">
            <CardHeader className="border-b border-slate-100 px-4 py-5 sm:px-6 sm:py-6">
              <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                Statistiken nach Spiel
              </CardTitle>
              <p className="text-sm text-slate-500">Detailliert sortiert nach Match</p>
            </CardHeader>

            <CardContent className="px-3 py-4 sm:px-6 sm:py-6">
              {legStatsLoading ? (
                <div className="py-10 text-center">
                  <div className="mx-auto h-9 w-9 rounded-full border-4 border-orange-600/20 border-t-orange-600 animate-spin" />
                  <p className="mt-3 text-sm text-slate-500">Lade Spielstatistiken...</p>
                </div>
              ) : realLegStatistics.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                  <p className="font-semibold text-slate-950">Keine Statistiken verfügbar</p>
                  <p className="mt-1 text-sm text-slate-500">Sobald echte Daten vorhanden sind, erscheinen sie hier.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const statsByMatch = realLegStatistics.reduce((acc, stat) => {
                      const matchKey = stat.match_id || "Unbekanntes Spiel"
                      if (!acc[matchKey]) acc[matchKey] = []
                      acc[matchKey].push(stat)
                      return acc
                    }, {} as Record<string, typeof realLegStatistics>)

                    return Object.entries(statsByMatch)
                      .sort(([, a], [, b]) => {
                        const dateA = (a as any)[0]?.matches?.match_date || ""
                        const dateB = (b as any)[0]?.matches?.match_date || ""
                        return dateB.localeCompare(dateA)
                      })
                      .map(([matchKey, matchStats]) => {
                        const match = (matchStats as any)[0]?.matches
                        const matchDate = match?.match_date
                          ? new Date(match.match_date).toLocaleDateString("de-DE")
                          : "Unbekannt"

                        const playerStats = (matchStats as any).reduce((acc: any, stat: any) => {
                          // ✅ doppelte Sicherheit
                          if (!hasRealData(stat)) return acc

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

                          const pLegs = stat.player_legs_won ?? 0
                          const oLegs = stat.opponent_legs_won ?? 0
                          const actualLegsPlayed = pLegs + oLegs

                          acc[playerId].total_legs += actualLegsPlayed
                          acc[playerId].total_wins += pLegs
                          acc[playerId].total_180 += stat.throws_180 ?? 0
                          acc[playerId].total_171 += stat.throws_171 ?? 0
                          acc[playerId].total_15 += stat.throws_15 ?? 0
                          acc[playerId].total_16 += stat.throws_16 ?? 0
                          acc[playerId].total_17 += stat.throws_17 ?? 0
                          acc[playerId].total_18 += stat.throws_18 ?? 0
                          acc[playerId].total_19 += stat.throws_19 ?? 0
                          acc[playerId].total_20 += stat.throws_20 ?? 0
                          acc[playerId].total_high_tonne += stat.throws_high_tonne ?? 0
                          acc[playerId].total_tonne += stat.throws_tonne ?? 0
                          acc[playerId].total_shanghai += stat.throws_shanghai ?? 0
                          acc[playerId].total_95_plus += stat.throws_95_plus ?? 0
                          acc[playerId].total_under_26 += stat.throws_under_26 ?? 0
                          acc[playerId].total_under_30 += stat.throws_under_30 ?? 0
                          acc[playerId].total_semperit += stat.semperit_outs ?? 0
                          acc[playerId].total_bull += stat.throws_bull ?? 0

                          return acc
                        }, {} as Record<string, any>)

                        
                        const playersCleaned = Object.values(playerStats).filter((p: any) => {
                          const anyStats =
                            (p.total_180 ?? 0) > 0 ||
                            (p.total_171 ?? 0) > 0 ||
                            (p.total_20 ?? 0) > 0 ||
                            (p.total_19 ?? 0) > 0 ||
                            (p.total_18 ?? 0) > 0 ||
                            (p.total_17 ?? 0) > 0 ||
                            (p.total_16 ?? 0) > 0 ||
                            (p.total_15 ?? 0) > 0 ||
                            (p.total_high_tonne ?? 0) > 0 ||
                            (p.total_tonne ?? 0) > 0 ||
                            (p.total_shanghai ?? 0) > 0 ||
                            (p.total_95_plus ?? 0) > 0 ||
                            (p.total_under_26 ?? 0) > 0 ||
                            (p.total_under_30 ?? 0) > 0 ||
                            (p.total_semperit ?? 0) > 0 ||
                            (p.total_bull ?? 0) > 0
                          return (p.total_legs ?? 0) > 0 || anyStats
                        })

                        
                        if (playersCleaned.length === 0) return null

                        playersCleaned.forEach((s: any) => {
                          s.win_percentage = s.total_legs > 0 ? (s.total_wins / s.total_legs) * 100 : 0
                        })

                        return (
                          <div
                            key={matchKey}
                            className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_14px_42px_-34px_rgba(15,23,42,0.5)]"
                          >
                            <div className="border-b border-slate-100 bg-slate-50/60 p-4 sm:px-5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="break-words text-sm font-black leading-snug text-slate-950 sm:text-base">
                                    {match
                                      ? `${getTeamDisplayName(match, true)} vs ${getTeamDisplayName(match, false)}`
                                      : `Spiel ${matchKey}`}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">{matchDate}</div>
                                </div>

                                <Badge variant="outline" className="text-[11px] border-slate-200">
                                  Match
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-3 p-3.5 sm:p-4">
                              {playersCleaned
                                .sort((a: any, b: any) => b.total_wins - a.total_wins || b.total_180 - a.total_180)
                                .map((player: any, index: number) => {
                                  const isTop = index < 3 && player.total_wins > 0
                                  return (
                                    <div
                                      key={`${matchKey}-${player.player_id}`}
                                      className={[
                                        "rounded-[18px] border bg-white shadow-[0_10px_30px_-26px_rgba(15,23,42,0.4)]",
                                        "p-3",
                                        isTop ? "border-orange-200" : "border-slate-200",
                                      ].join(" ")}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            {isTop ? <Crown className="h-4 w-4 text-orange-600" /> : null}
                                            <div className="break-words text-sm font-black leading-snug text-slate-950">
                                              {player.player_name}
                                            </div>
                                          </div>
                                          <div className="mt-1 text-xs text-slate-500">
                                            Gewinnquote:{" "}
                                            <span className="font-semibold text-slate-800">
                                              {player.total_legs > 0
                                                ? `${((player.total_wins / player.total_legs) * 100).toFixed(1)}%`
                                                : "0%"}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex gap-2 flex-shrink-0">
                                          <Badge className="rounded-full bg-slate-950 px-2.5 text-[11px] font-black text-white shadow-none">
                                            {player.total_wins} Wins
                                          </Badge>
                                          <Badge variant="outline" className="text-[11px] border-slate-200">
                                            {player.total_legs} Legs
                                          </Badge>
                                        </div>
                                      </div>

                                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
                                        {[
                                          ["180", player.total_180],
                                          ["171", player.total_171],
                                          ["20", player.total_20],
                                          ["19", player.total_19],
                                          ["18", player.total_18],
                                          ["17", player.total_17],
                                          ["16", player.total_16],
                                          ["15", player.total_15],
                                        ].map(([label, val]) => (
                                          <div
                                            key={String(label)}
                                            className="rounded-xl border border-slate-200 bg-slate-50/70 px-2 py-2.5 text-center"
                                          >
                                            <div className="text-sm font-bold text-slate-950">{val as any}</div>
                                            <div className="text-[10px] text-slate-500">{label as any}</div>
                                          </div>
                                        ))}
                                      </div>

                                      {player.total_under_26 > 0 || player.total_under_30 > 0 || player.total_semperit > 0 ? (
                                        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3">
                                          <div className="text-[11px] font-bold text-red-700 mb-2">Under-Würfe</div>
                                          <div className="grid grid-cols-3 gap-2">
                                            <div className="flex items-center justify-between rounded-xl bg-white border border-red-200 px-2 py-2">
                                              <span className="text-[11px] text-red-700">U26</span>
                                              <span className="text-[11px] font-bold text-red-700">{player.total_under_26}</span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-xl bg-white border border-red-200 px-2 py-2">
                                              <span className="text-[11px] text-red-700">U30</span>
                                              <span className="text-[11px] font-bold text-red-700">{player.total_under_30}</span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-xl bg-white border border-red-200 px-2 py-2">
                                              <span className="text-[11px] text-red-700">Semp</span>
                                              <span className="text-[11px] font-bold text-red-700">{player.total_semperit}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ) : null}

                                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
                                        {[
                                          ["HighTon", player.total_high_tonne],
                                          ["Ton", player.total_tonne],
                                          ["Shanghai", player.total_shanghai],
                                          ["95+", player.total_95_plus],
                                          ["Bull", player.total_bull],
                                        ].map(([label, val]) => (
                                          <div
                                            key={String(label)}
                                            className="rounded-2xl border border-slate-200 bg-slate-50/70 px-2 py-3 text-center"
                                          >
                                            <div className="text-sm font-bold text-slate-950">{val as any}</div>
                                            <div className="text-[10px] text-slate-500">{label as any}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                          </div>
                        )
                      })
                      .filter(Boolean)
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