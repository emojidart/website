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
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

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
        const aggregatedStats = statsData.reduce((acc, stat) => {
          const actualLegsPlayed = (stat.player_legs_won || 0) + (stat.opponent_legs_won || 0)
          const legsToAdd = actualLegsPlayed > 0 ? actualLegsPlayed : 1

          return {
            player_id: stat.player_id,
            name: stat.player.name,
            photo_url: stat.player.photo_url,
            total_legs: (acc.total_legs || 0) + legsToAdd,
            total_wins: (acc.total_wins || 0) + (stat.player_legs_won || 0),
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
      {
        id: "first_180",
        title: "Erste 180!",
        description: "Deine erste perfekte Runde",
        icon: <Target className="h-6 w-6" />,
        achieved: stats.throws_180 >= 1,
        color: "bg-red-500/[0.07]0",
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
        color: "bg-amber-500/[0.07]0",
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
      {
        id: "century_club",
        title: "Century Club",
        description: "Erste Tonne erreicht",
        icon: <Trophy className="h-6 w-6" />,
        achieved: stats.throws_tonne >= 1,
        color: "bg-emerald-500/[0.07]0",
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
      {
        id: "high_finish_bronze",
        title: "95+ Bronze",
        description: "10 x 95+ Punkte erreicht",
        icon: <Trophy className="h-6 w-6" />,
        achieved: stats.throws_95_plus >= 10,
        progress: stats.throws_95_plus,
        target: 10,
        color: "bg-amber-600",
      },
      {
        id: "high_finish_silver",
        title: "95+ Silber",
        description: "50 x 95+ Punkte erreicht",
        icon: <Trophy className="h-6 w-6" />,
        achieved: stats.throws_95_plus >= 50,
        progress: stats.throws_95_plus,
        target: 50,
        color: "bg-gray-400",
      },
      {
        id: "high_finish_gold",
        title: "95+ Gold",
        description: "100 x 95+ Punkte erreicht",
        icon: <Crown className="h-6 w-6" />,
        achieved: stats.throws_95_plus >= 100,
        progress: stats.throws_95_plus,
        target: 100,
        color: "bg-amber-500/[0.07]0",
      },
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
        color: "bg-amber-500/[0.07]0",
      },
      {
        id: "dominator",
        title: "Dominator",
        description: "90% Siegquote - Unaufhaltbar!",
        icon: <Crown className="h-6 w-6" />,
        achieved: stats.win_percentage >= 90,
        color: "bg-red-600",
      },
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
      {
        id: "shanghai_master",
        title: "Shanghai Meister",
        description: "Ersten Shanghai getroffen",
        icon: <Star className="h-6 w-6" />,
        achieved: stats.throws_shanghai >= 1,
        color: "bg-violet-500/[0.07]0",
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
        color: "bg-amber-500/[0.07]0",
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
      <div className="emd-app-theme-shell relative min-h-screen overflow-x-hidden bg-[#050608] text-white">
        <Header variant="app" title="Spielerprofil" subtitle="Liga & Statistiken" backHref="/liga-statistiken-app" />
        <div className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-14 sm:px-5 sm:pt-16 lg:px-7 lg:pb-14 xl:px-8">
          <div className="rounded-[24px] border border-white/[0.08] bg-black/25 p-8 text-center font-bold text-white/55 backdrop-blur-xl">Lade Spielerdaten...</div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="emd-app-theme-shell relative min-h-screen overflow-x-hidden bg-[#050608] text-white">
        <Header variant="app" title="Spielerprofil" subtitle="Liga & Statistiken" backHref="/liga-statistiken-app" />
        <div className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-14 sm:px-5 sm:pt-16 lg:px-7 lg:pb-14 xl:px-8">
          <div className="rounded-[24px] border border-white/[0.08] bg-black/25 p-8 text-center font-bold text-white/55 backdrop-blur-xl">Spieler nicht gefunden</div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="emd-app-theme-shell relative min-h-screen overflow-x-hidden bg-[#050608] text-white">
      <Header variant="app" title="Spielerprofil" subtitle="Liga & Statistiken" backHref="/liga-statistiken-app" />

      <div className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-14 sm:px-5 sm:pt-16 lg:px-7 lg:pb-14 xl:px-8">
  {}
  <div className="mb-4 rounded-[18px] border border-white/[0.08] bg-black/25 p-2 backdrop-blur-xl sm:mb-5 sm:w-fit">
    <Button
      variant="outline"
      onClick={() => router.push("/liga-statistiken-app")}
      className="h-10 w-full justify-center rounded-xl border-white/10 bg-white/[0.04] font-bold text-white hover:bg-white/[0.08] hover:text-white sm:w-auto"
    >
      <ArrowLeft className="h-4 w-4 mr-2 shrink-0" />
      <span className="truncate">Zurück zur Liga Statistik</span>
    </Button>
  </div>

  {/* Profil Header – Designsprache wie Mitgliederprofil */}
  <section className="relative mb-5 overflow-hidden rounded-[28px] border border-white/[0.09] bg-black/35 p-4 text-white shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:rounded-[34px] sm:p-6 lg:p-8">
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,.08),transparent_34%,rgba(14,165,233,.06)_78%,transparent)]" />
    <div className="pointer-events-none absolute -left-20 top-[-120px] h-80 w-80 rounded-full bg-orange-500/[0.07]0/15 blur-[110px]" />
    <div className="pointer-events-none absolute -right-24 bottom-[-140px] h-96 w-96 rounded-full bg-sky-500/12 blur-[120px]" />

    <div className="relative">
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
        Liga Spielerprofil
      </div>

      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.06] sm:h-20 sm:w-20">
          {player.photo_url ? (
            <img
              src={player.photo_url || "/placeholder.svg"}
              alt={player.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none"
                ;(e.currentTarget.nextElementSibling as any).style.display = "flex"
              }}
            />
          ) : null}

          <div
            className={`h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(249,115,22,.35),rgba(14,165,233,.22))] ${
              player.photo_url ? "hidden" : "flex"
            }`}
          >
            <User className="h-8 w-8 text-white/80 sm:h-10 sm:w-10" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">Spieler</p>
          <h1 className="mt-1 line-clamp-2 text-[clamp(1.8rem,5vw,3.4rem)] font-black leading-none tracking-[-0.055em] text-white">
            {player.name}
          </h1>
          <p className="mt-2 text-sm font-semibold text-white/48">Persönliche Liga-Statistiken</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2.5 sm:mt-7 sm:gap-3">
        <div className="rounded-[20px] border border-emerald-300/[0.12] bg-emerald-500/[0.07] p-3.5 text-center">
          <div className="text-xl font-black text-emerald-300 sm:text-2xl">{player.total_wins}</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Siege</div>
        </div>

        <div className="rounded-[20px] border border-orange-300/[0.12] bg-orange-500/[0.07]0/[0.07] p-3.5 text-center">
          <div className="text-xl font-black text-orange-300 sm:text-2xl">{player.win_percentage.toFixed(1)}%</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Siegquote</div>
        </div>

        <div className="rounded-[20px] border border-sky-300/[0.12] bg-sky-500/[0.07] p-3.5 text-center">
          <div className="text-xl font-black text-sky-300 sm:text-2xl">{player.total_legs}</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Legs</div>
        </div>
      </div>
    </div>
  </section>

        <Card className="mb-5 rounded-[24px] border border-white/[0.08] bg-black/25 text-white shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Erfolge & Abzeichen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-[18px] border transition-all ${
                    achievement.achieved ? "border-emerald-300/15 bg-emerald-500/[0.07]" : "border-white/[0.08] bg-white/[0.03] opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-full text-white ${achievement.color}`}>{achievement.icon}</div>
                    <div>
                      <h3 className="font-semibold">{achievement.title}</h3>
                      <p className="text-sm text-white/55">{achievement.description}</p>
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
                      <div className="w-full bg-white/10 rounded-full h-2">
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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <Card className="border-white/[0.08] bg-black/25 text-white shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
            <CardHeader>
              <CardTitle>High Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-2.5 sm:p-3 bg-red-500/[0.07] rounded-lg">
                  <span className="font-medium">180er</span>
                  <Badge className="bg-red-500/15 text-red-200 text-sm sm:text-base px-2.5 py-1">
  {player.throws_180}
</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-violet-500/[0.07] rounded-lg">
                  <span className="font-medium">171er</span>
                  <Badge className="bg-violet-500/15 text-violet-200 text-sm sm:text-base px-2.5 py-1">{player.throws_171}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-500/[0.07] rounded-lg">
                  <span className="font-medium">High Tonne</span>
                  <Badge className="bg-orange-500/15 text-orange-200 text-sm sm:text-base px-2.5 py-1">{player.throws_high_tonne}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-emerald-500/[0.07] rounded-lg">
                  <span className="font-medium">Tonne</span>
                  <Badge className="bg-emerald-500/15 text-emerald-200 text-sm sm:text-base px-2.5 py-1">{player.throws_tonne}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/[0.08] bg-black/25 text-white shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Special-Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-cyan-500/[0.07] rounded-lg">
                  <span className="font-medium">95+ Punkte</span>
                  <Badge className="bg-cyan-500/15 text-cyan-200 text-sm sm:text-base px-2.5 py-1">{player.throws_95_plus}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-indigo-500/[0.07] rounded-lg">
                  <span className="font-medium">Shanghai</span>
                  <Badge className="bg-indigo-500/15 text-indigo-200 text-sm sm:text-base px-2.5 py-1">{player.throws_shanghai}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-pink-500/[0.07] rounded-lg">
                  <span className="font-medium">Bull</span>
                  <Badge className="bg-pink-500/15 text-pink-200 text-sm sm:text-base px-2.5 py-1">{player.throws_bull}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-white/[0.08] bg-black/25 text-white shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Segment Statistiken</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <div className="text-center p-4 bg-amber-500/[0.07] rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-amber-300">{player.throws_20}</div>
                  <div className="text-sm text-white/55">20er</div>
                </div>
                <div className="text-center p-4 bg-amber-500/[0.07] rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-amber-300">{player.throws_19}</div>
                  <div className="text-sm text-white/55">19er</div>
                </div>
                <div className="text-center p-4 bg-amber-500/[0.07] rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-amber-300">{player.throws_18}</div>
                  <div className="text-sm text-white/55">18er</div>
                </div>
                <div className="text-center p-4 bg-amber-500/[0.07] rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-amber-300">{player.throws_17}</div>
                  <div className="text-sm text-white/55">17er</div>
                </div>
                <div className="text-center p-4 bg-amber-500/[0.07] rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-amber-300">{player.throws_16}</div>
                  <div className="text-sm text-white/55">16er</div>
                </div>
                <div className="text-center p-4 bg-amber-500/[0.07] rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-amber-300">{player.throws_15}</div>
                  <div className="text-sm text-white/55">15er</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  )
}
