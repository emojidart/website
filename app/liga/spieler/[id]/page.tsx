"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Trophy, Target, Zap, Award, Star, Crown, User } from "lucide-react"

interface PlayerStats {
  player_id: string
  name: string
  photo_url?: string
  total_legs: number
  total_wins: number
  win_percentage: number
  throws_180: number
  throws_171: number
  throws_high_tonne: number
  throws_tonne: number
  throws_95_plus: number
  throws_shanghai: number
  throws_bull: number
  throws_20: number
  throws_19: number
  throws_18: number
  throws_17: number
  throws_16: number
  throws_15: number
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  achieved: boolean
  progress?: number
  target?: number
  color: string
}

export default function PlayerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [player, setPlayer] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [achievements, setAchievements] = useState<Achievement[]>([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchPlayerData()
  }, [params.id])

  const fetchPlayerData = async () => {
    try {
      const { data: statsData, error: statsError } = await supabase
        .from("leg_statistics")
        .select(`
          *,
          player:club_players!leg_statistics_player_id_fkey(name, photo_url)
        `)
        .eq("player_id", params.id)

      if (statsError) throw statsError

      if (statsData && statsData.length > 0) {
        // Aggregate all statistics for this player
        const aggregatedStats = statsData.reduce((acc, stat) => {
          const actualLegsPlayed = (stat.player_legs_won || 0) + (stat.opponent_legs_won || 0)
          const legsToAdd = actualLegsPlayed > 0 ? actualLegsPlayed : 1

          return {
            player_id: stat.player_id,
            name: stat.player.name,
            photo_url: stat.player.photo_url, // Added photo_url from player data
            total_legs: (acc.total_legs || 0) + legsToAdd,
            total_wins: (acc.total_wins || 0) + (stat.leg_wins || 0),
            throws_180: (acc.throws_180 || 0) + (stat.throws_180 || 0),
            throws_171: (acc.throws_171 || 0) + (stat.throws_171 || 0),
            throws_high_tonne: (acc.throws_high_tonne || 0) + (stat.throws_high_tonne || 0),
            throws_tonne: (acc.throws_tonne || 0) + (stat.throws_tonne || 0),
            throws_95_plus: (acc.throws_95_plus || 0) + (stat.throws_95_plus || 0),
            throws_shanghai: (acc.throws_shanghai || 0) + (stat.throws_shanghai || 0),
            throws_bull: (acc.throws_bull || 0) + (stat.throws_bull || 0),
            throws_20: (acc.throws_20 || 0) + (stat.throws_20 || 0),
            throws_19: (acc.throws_19 || 0) + (stat.throws_19 || 0),
            throws_18: (acc.throws_18 || 0) + (stat.throws_18 || 0),
            throws_17: (acc.throws_17 || 0) + (stat.throws_17 || 0),
            throws_16: (acc.throws_16 || 0) + (stat.throws_16 || 0),
            throws_15: (acc.throws_15 || 0) + (stat.throws_15 || 0),
          }
        }, {} as any)

        aggregatedStats.win_percentage =
          aggregatedStats.total_legs > 0 ? (aggregatedStats.total_wins / aggregatedStats.total_legs) * 100 : 0

        setPlayer(aggregatedStats)
        generateAchievements(aggregatedStats)
      }
    } catch (error) {
      console.error("Error fetching player data:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateAchievements = (stats: PlayerStats) => {
    const achievements: Achievement[] = [
      // 180er Achievements - Multiple Levels
      {
        id: "first_180",
        title: "Erste 180!",
        description: "Deine erste perfekte Runde",
        icon: <Target className="h-6 w-6" />,
        achieved: stats.throws_180 >= 1,
        color: "bg-red-500",
      },
      {
        id: "ton_80_bronze",
        title: "180er Bronze",
        description: "5 x 180 erreicht",
        icon: <Trophy className="h-6 w-6" />,
        achieved: stats.throws_180 >= 5,
        progress: stats.throws_180,
        target: 5,
        color: "bg-amber-600",
      },
      {
        id: "ton_80_silver",
        title: "180er Silber",
        description: "25 x 180 erreicht",
        icon: <Trophy className="h-6 w-6" />,
        achieved: stats.throws_180 >= 25,
        progress: stats.throws_180,
        target: 25,
        color: "bg-gray-400",
      },
      {
        id: "ton_80_gold",
        title: "180er Gold",
        description: "50 x 180 erreicht",
        icon: <Crown className="h-6 w-6" />,
        achieved: stats.throws_180 >= 50,
        progress: stats.throws_180,
        target: 50,
        color: "bg-yellow-500",
      },
      {
        id: "ton_80_platinum",
        title: "180er Platin",
        description: "100 x 180 erreicht",
        icon: <Crown className="h-6 w-6" />,
        achieved: stats.throws_180 >= 100,
        progress: stats.throws_180,
        target: 100,
        color: "bg-cyan-500",
      },
      {
        id: "ton_80_diamond",
        title: "180er Diamant",
        description: "250 x 180 erreicht - Elite Status!",
        icon: <Crown className="h-6 w-6" />,
        achieved: stats.throws_180 >= 250,
        progress: stats.throws_180,
        target: 250,
        color: "bg-blue-600",
      },

      // Tonne Achievements
      {
        id: "century_club",
        title: "Century Club",
        description: "Erste Tonne erreicht",
        icon: <Trophy className="h-6 w-6" />,
        achieved: stats.throws_tonne >= 1,
        color: "bg-green-500",
      },
      {
        id: "tonne_master",
        title: "Tonne Meister",
        description: "25 Tonnen erreicht",
        icon: <Award className="h-6 w-6" />,
        achieved: stats.throws_tonne >= 25,
        progress: stats.throws_tonne,
        target: 25,
        color: "bg-green-600",
      },
      {
        id: "tonne_legend",
        title: "Tonne Legende",
        description: "100 Tonnen erreicht",
        icon: <Crown className="h-6 w-6" />,
        achieved: stats.throws_tonne >= 100,
        progress: stats.throws_tonne,
        target: 100,
        color: "bg-emerald-600",
      },

      // Win Rate Achievements
      {
        id: "winner_bronze",
        title: "Gewinner Bronze",
        description: "60% Siegquote erreicht",
        icon: <Star className="h-6 w-6" />,
        achieved: stats.win_percentage >= 60,
        color: "bg-amber-600",
      },
      {
        id: "winner_silver",
        title: "Gewinner Silber",
        description: "70% Siegquote erreicht",
        icon: <Star className="h-6 w-6" />,
        achieved: stats.win_percentage >= 70,
        color: "bg-gray-400",
      },
      {
        id: "winner_gold",
        title: "Gewinner Gold",
        description: "80% Siegquote erreicht",
        icon: <Crown className="h-6 w-6" />,
        achieved: stats.win_percentage >= 80,
        color: "bg-yellow-500",
      },
      {
        id: "dominator",
        title: "Dominator",
        description: "90% Siegquote - Unaufhaltbar!",
        icon: <Crown className="h-6 w-6" />,
        achieved: stats.win_percentage >= 90,
        color: "bg-red-600",
      },

      // Experience/Games Played
      {
        id: "rookie",
        title: "Rookie",
        description: "10 Legs gespielt",
        icon: <Target className="h-6 w-6" />,
        achieved: stats.total_legs >= 10,
        progress: stats.total_legs,
        target: 10,
        color: "bg-slate-500",
      },
      {
        id: "veteran",
        title: "Veteran",
        description: "100 Legs gespielt",
        icon: <Award className="h-6 w-6" />,
        achieved: stats.total_legs >= 100,
        progress: stats.total_legs,
        target: 100,
        color: "bg-blue-500",
      },
      {
        id: "pro_player",
        title: "Profi Spieler",
        description: "500 Legs gespielt",
        icon: <Crown className="h-6 w-6" />,
        achieved: stats.total_legs >= 500,
        progress: stats.total_legs,
        target: 500,
        color: "bg-purple-600",
      },
      {
        id: "legend",
        title: "Legende",
        description: "1000 Legs gespielt - Hall of Fame!",
        icon: <Crown className="h-6 w-6" />,
        achieved: stats.total_legs >= 1000,
        progress: stats.total_legs,
        target: 1000,
        color: "bg-indigo-600",
      },

      // Special Throws
      {
        id: "shanghai_master",
        title: "Shanghai Meister",
        description: "Ersten Shanghai getroffen",
        icon: <Star className="h-6 w-6" />,
        achieved: stats.throws_shanghai >= 1,
        color: "bg-purple-500",
      },
      {
        id: "shanghai_expert",
        title: "Shanghai Experte",
        description: "10 Shanghai getroffen",
        icon: <Star className="h-6 w-6" />,
        achieved: stats.throws_shanghai >= 10,
        progress: stats.throws_shanghai,
        target: 10,
        color: "bg-purple-600",
      },
      {
        id: "bull_hunter",
        title: "Bull Hunter",
        description: "Ersten Bull getroffen",
        icon: <Zap className="h-6 w-6" />,
        achieved: stats.throws_bull >= 1,
        color: "bg-yellow-500",
      },
      {
        id: "bull_master",
        title: "Bull Meister",
        description: "25 Bulls getroffen",
        icon: <Zap className="h-6 w-6" />,
        achieved: stats.throws_bull >= 25,
        progress: stats.throws_bull,
        target: 25,
        color: "bg-yellow-600",
      },

      // High Finish Achievements
      {
        id: "high_finish_bronze",
        title: "High Finish Bronze",
        description: "10 x 95+ Punkte erreicht",
        icon: <Trophy className="h-6 w-6" />,
        achieved: stats.throws_95_plus >= 10,
        progress: stats.throws_95_plus,
        target: 10,
        color: "bg-amber-600",
      },
      {
        id: "high_finish_silver",
        title: "High Finish Silber",
        description: "50 x 95+ Punkte erreicht",
        icon: <Trophy className="h-6 w-6" />,
        achieved: stats.throws_95_plus >= 50,
        progress: stats.throws_95_plus,
        target: 50,
        color: "bg-gray-400",
      },
      {
        id: "high_finish_gold",
        title: "High Finish Gold",
        description: "100 x 95+ Punkte erreicht",
        icon: <Crown className="h-6 w-6" />,
        achieved: stats.throws_95_plus >= 100,
        progress: stats.throws_95_plus,
        target: 100,
        color: "bg-yellow-500",
      },

      // Consistency Achievements
      {
        id: "consistent_player",
        title: "Konstanter Spieler",
        description: "20+ Legs mit 60%+ Siegquote",
        icon: <Award className="h-6 w-6" />,
        achieved: stats.total_legs >= 20 && stats.win_percentage >= 60,
        color: "bg-teal-500",
      },
      {
        id: "reliable_ace",
        title: "Zuverlässiges Ass",
        description: "50+ Legs mit 70%+ Siegquote",
        icon: <Crown className="h-6 w-6" />,
        achieved: stats.total_legs >= 50 && stats.win_percentage >= 70,
        color: "bg-teal-600",
      },

      // Combo Achievements
      {
        id: "all_rounder",
        title: "Allrounder",
        description: "180er, Tonne, Shanghai & Bull getroffen",
        icon: <Crown className="h-6 w-6" />,
        achieved:
          stats.throws_180 >= 1 && stats.throws_tonne >= 1 && stats.throws_shanghai >= 1 && stats.throws_bull >= 1,
        color: "bg-gradient-to-r from-purple-500 to-pink-500",
      },
      {
        id: "perfectionist",
        title: "Perfektionist",
        description: "10+ von jedem Special Throw",
        icon: <Crown className="h-6 w-6" />,
        achieved:
          stats.throws_180 >= 10 && stats.throws_tonne >= 10 && stats.throws_shanghai >= 10 && stats.throws_bull >= 10,
        color: "bg-gradient-to-r from-blue-500 to-purple-500",
      },

      // Milestone Achievements
      {
        id: "century_180",
        title: "Jahrhundert 180",
        description: "100 x 180 - Elite Club!",
        icon: <Crown className="h-6 w-6" />,
        achieved: stats.throws_180 >= 100,
        progress: stats.throws_180,
        target: 100,
        color: "bg-gradient-to-r from-red-500 to-orange-500",
      },
      {
        id: "win_streak_master",
        title: "Siegesserie Meister",
        description: "100+ Siege erreicht",
        icon: <Crown className="h-6 w-6" />,
        achieved: stats.total_wins >= 100,
        progress: stats.total_wins,
        target: 100,
        color: "bg-gradient-to-r from-green-500 to-emerald-500",
      },
    ]

    // Sort achievements: achieved first, then by progress
    const sortedAchievements = achievements.sort((a, b) => {
      if (a.achieved && !b.achieved) return -1
      if (!a.achieved && b.achieved) return 1
      if (a.progress && b.progress && a.target && b.target) {
        return b.progress / b.target - a.progress / a.target
      }
      return 0
    })

    setAchievements(sortedAchievements)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBackButton title="Spieler Profil" />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Lade Spielerdaten...</div>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBackButton title="Spieler Profil" />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Spieler nicht gefunden</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBackButton title="Spieler Profil" />

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="outline" onClick={() => router.push("/liga")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zur Liga Statistik
        </Button>

        {/* Player Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                {player.photo_url ? (
                  <img
                    src={player.photo_url || "/placeholder.svg"}
                    alt={player.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                      e.currentTarget.nextElementSibling.style.display = "flex"
                    }}
                  />
                ) : null}
                <div
                  className={`w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ${player.photo_url ? "hidden" : "flex"}`}
                >
                  <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{player.name}</h1>
                <div className="flex gap-4">
                  <Badge className="bg-green-100 text-green-800 text-lg px-3 py-1">{player.total_wins} Siege</Badge>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {player.win_percentage.toFixed(1)}% Siegquote
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{player.total_legs}</div>
              <div className="text-sm text-gray-600">Legs gespielt</div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Erfolge & Abzeichen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    achievement.achieved ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-full text-white ${achievement.color}`}>{achievement.icon}</div>
                    <div>
                      <h3 className="font-semibold">{achievement.title}</h3>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                    </div>
                  </div>
                  {achievement.progress !== undefined && achievement.target && (
                    <div className="mt-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Fortschritt</span>
                        <span>
                          {achievement.progress}/{achievement.target}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${achievement.color}`}
                          style={{
                            width: `${Math.min((achievement.progress / achievement.target) * 100, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* High Scores */}
          <Card>
            <CardHeader>
              <CardTitle>High Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="font-medium">180er</span>
                  <Badge className="bg-red-100 text-red-800 text-lg">{player.throws_180}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium">171er</span>
                  <Badge className="bg-purple-100 text-purple-800 text-lg">{player.throws_171}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="font-medium">High Tonne</span>
                  <Badge className="bg-orange-100 text-orange-800 text-lg">{player.throws_high_tonne}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">Tonne</span>
                  <Badge className="bg-green-100 text-green-800 text-lg">{player.throws_tonne}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Special Throws */}
          <Card>
            <CardHeader>
              <CardTitle>Spezial Würfe</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-teal-50 rounded-lg">
                  <span className="font-medium">95+ Punkte</span>
                  <Badge className="bg-teal-100 text-teal-800 text-lg">{player.throws_95_plus}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                  <span className="font-medium">Shanghai</span>
                  <Badge className="bg-indigo-100 text-indigo-800 text-lg">{player.throws_shanghai}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-pink-50 rounded-lg">
                  <span className="font-medium">Bull</span>
                  <Badge className="bg-pink-100 text-pink-800 text-lg">{player.throws_bull}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Segment Statistics */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Segment Statistiken</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{player.throws_20}</div>
                  <div className="text-sm text-gray-600">20er</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{player.throws_19}</div>
                  <div className="text-sm text-gray-600">19er</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{player.throws_18}</div>
                  <div className="text-sm text-gray-600">18er</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{player.throws_17}</div>
                  <div className="text-sm text-gray-600">17er</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{player.throws_16}</div>
                  <div className="text-sm text-gray-600">16er</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{player.throws_15}</div>
                  <div className="text-sm text-gray-600">15er</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
