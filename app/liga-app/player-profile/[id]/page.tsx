"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
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
        color: "bg-yellow-500",
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
      <div className="emd-app-theme-shell relative min-h-screen overflow-x-hidden text-white">
        <Header />
        <main className="mx-auto w-full max-w-[1680px] px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 xl:px-8">
          <div className="flex min-h-[55vh] items-center justify-center">
            <div className="w-full max-w-md rounded-[28px] border border-white/[0.08] bg-black/25 p-8 text-center shadow-[0_30px_90px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-orange-300/[0.14] bg-orange-500/[0.08]">
                <Target className="h-7 w-7 animate-pulse text-orange-300" />
              </div>
              <div className="mt-5 text-lg font-black text-white">Spielerdaten werden geladen</div>
              <div className="mt-1 text-sm font-semibold text-white/40">Einen Moment bitte …</div>
            </div>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="emd-app-theme-shell relative min-h-screen overflow-x-hidden text-white">
        <Header />
        <main className="mx-auto w-full max-w-[1680px] px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 xl:px-8">
          <div className="flex min-h-[55vh] items-center justify-center">
            <div className="w-full max-w-md rounded-[28px] border border-white/[0.08] bg-black/25 p-8 text-center shadow-[0_30px_90px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-red-300/[0.14] bg-red-500/[0.08]">
                <User className="h-7 w-7 text-red-200" />
              </div>
              <div className="mt-5 text-lg font-black text-white">Spieler nicht gefunden</div>
              <Button
                variant="outline"
                onClick={() => router.push("/liga-statistiken-app")}
                className="mt-5 rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück zur Liga
              </Button>
            </div>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  const achievedCount = achievements.filter((achievement) => achievement.achieved).length

  const scoreRows = [
    { label: "180er", value: player.throws_180, tone: "red" },
    { label: "171er", value: player.throws_171, tone: "violet" },
    { label: "High Tonne", value: player.throws_high_tonne, tone: "orange" },
    { label: "Tonne", value: player.throws_tonne, tone: "emerald" },
    { label: "95+ Punkte", value: player.throws_95_plus, tone: "cyan" },
    { label: "Shanghai", value: player.throws_shanghai, tone: "indigo" },
    { label: "Bull", value: player.throws_bull, tone: "pink" },
  ]

  const segmentRows = [
    { label: "20er", value: player.throws_20 },
    { label: "19er", value: player.throws_19 },
    { label: "18er", value: player.throws_18 },
    { label: "17er", value: player.throws_17 },
    { label: "16er", value: player.throws_16 },
    { label: "15er", value: player.throws_15 },
  ]

  const toneClasses: Record<string, string> = {
    red: "border-red-300/[0.12] bg-red-500/[0.07] text-red-200",
    violet: "border-violet-300/[0.12] bg-violet-500/[0.07] text-violet-200",
    orange: "border-orange-300/[0.12] bg-orange-500/[0.07] text-orange-200",
    emerald: "border-emerald-300/[0.12] bg-emerald-500/[0.07] text-emerald-200",
    cyan: "border-cyan-300/[0.12] bg-cyan-500/[0.07] text-cyan-200",
    indigo: "border-indigo-300/[0.12] bg-indigo-500/[0.07] text-indigo-200",
    pink: "border-pink-300/[0.12] bg-pink-500/[0.07] text-pink-200",
  }

  return (
    <div className="emd-app-theme-shell relative min-h-screen overflow-x-hidden text-white">
      <Header />

      <main className="mx-auto w-full max-w-[1680px] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">
        {/* TOP BAR */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/liga-statistiken-app")}
            className="h-10 rounded-xl border-white/10 bg-black/25 px-3 font-bold text-white/70 backdrop-blur-xl hover:bg-white/[0.07] hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Liga & Statistiken
          </Button>

          <div className="hidden rounded-full border border-white/[0.08] bg-black/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/35 backdrop-blur-xl sm:block">
            Spielerprofil
          </div>
        </div>

        {/* HERO - bewusst komplett anderes Layout als davor */}
        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-black/30 shadow-[0_40px_130px_-62px_rgba(0,0,0,.98)] backdrop-blur-2xl sm:rounded-[36px]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgba(249,115,22,.10),transparent_34%,rgba(14,165,233,.07)_78%,transparent)]" />
          <div className="pointer-events-none absolute -left-28 top-[-150px] h-[420px] w-[420px] rounded-full bg-orange-500/14 blur-[135px]" />
          <div className="pointer-events-none absolute -right-28 bottom-[-160px] h-[430px] w-[430px] rounded-full bg-sky-500/11 blur-[140px]" />

          <div className="relative grid gap-0 lg:grid-cols-[330px_minmax(0,1fr)]">
            {/* Spielerbild */}
            <div className="relative min-h-[320px] overflow-hidden border-b border-white/[0.07] bg-white/[0.025] lg:min-h-[430px] lg:border-b-0 lg:border-r">
              {player.photo_url ? (
                <img
                  src={player.photo_url || "/placeholder.svg"}
                  alt={player.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                    ;(e.currentTarget.nextElementSibling as any).style.display = "flex"
                  }}
                />
              ) : null}

              <div
                className={`absolute inset-0 items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(249,115,22,.18),transparent_42%),linear-gradient(145deg,#0b0e13,#050608)] ${
                  player.photo_url ? "hidden" : "flex"
                }`}
              >
                <User className="h-24 w-24 text-white/15" />
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-black/35" />

              <div className="absolute bottom-5 left-5 right-5 lg:hidden">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/80">Liga Spieler</div>
                <h1 className="mt-1 text-3xl font-black leading-none tracking-[-0.05em] text-white">{player.name}</h1>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
              <div className="hidden lg:block">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                  Liga Spieler
                </div>
                <h1 className="mt-4 text-[clamp(2.4rem,4vw,4.4rem)] font-black leading-[0.92] tracking-[-0.065em] text-white">
                  {player.name}
                </h1>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/48 sm:text-base">
                  Persönliche Liga-Performance, High Scores und erreichte Abzeichen.
                </p>
              </div>

              {/* Hauptkennzahlen */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:mt-9">
                <div className="rounded-[20px] border border-emerald-300/[0.12] bg-emerald-500/[0.07] p-3.5 sm:p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Siege</div>
                  <div className="mt-2 text-2xl font-black text-emerald-200 sm:text-3xl">{player.total_wins}</div>
                </div>

                <div className="rounded-[20px] border border-orange-300/[0.12] bg-orange-500/[0.07] p-3.5 sm:p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Siegquote</div>
                  <div className="mt-2 text-2xl font-black text-orange-200 sm:text-3xl">
                    {player.win_percentage.toFixed(1)}%
                  </div>
                </div>

                <div className="rounded-[20px] border border-sky-300/[0.12] bg-sky-500/[0.07] p-3.5 sm:p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Legs</div>
                  <div className="mt-2 text-2xl font-black text-sky-200 sm:text-3xl">{player.total_legs}</div>
                </div>

                <div className="rounded-[20px] border border-violet-300/[0.12] bg-violet-500/[0.07] p-3.5 sm:p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Abzeichen</div>
                  <div className="mt-2 text-2xl font-black text-violet-200 sm:text-3xl">
                    {achievedCount}
                    <span className="ml-1 text-sm text-white/30">/{achievements.length}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">180er</div>
                  <div className="mt-1 text-lg font-black text-white">{player.throws_180}</div>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">Tonnen</div>
                  <div className="mt-1 text-lg font-black text-white">{player.throws_tonne}</div>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">95+</div>
                  <div className="mt-1 text-lg font-black text-white">{player.throws_95_plus}</div>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">Bull</div>
                  <div className="mt-1 text-lg font-black text-white">{player.throws_bull}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Scores */}
        <section className="mt-5">
          <div className="mb-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300/70">Performance</div>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">High & Special Scores</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
            {scoreRows.map((item) => (
              <div
                key={item.label}
                className={`rounded-[20px] border p-4 backdrop-blur-xl ${toneClasses[item.tone]}`}
              >
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">{item.label}</div>
                <div className="mt-2 text-2xl font-black">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Segmente + Erfolge */}
        <section className="mt-5 grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
          <div className="rounded-[26px] border border-white/[0.08] bg-black/25 p-4 shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/[0.12] bg-amber-500/[0.07]">
                <Target className="h-5 w-5 text-amber-200" />
              </div>
              <div>
                <div className="text-lg font-black text-white">Segment-Statistik</div>
                <div className="text-xs font-semibold text-white/35">15 bis 20</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {segmentRows.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3 text-center">
                  <div className="text-xl font-black text-amber-200">{item.value}</div>
                  <div className="mt-1 text-[10px] font-bold text-white/35">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/[0.08] bg-black/25 p-4 shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300/70">Achievements</div>
                <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Erfolge & Abzeichen</h2>
              </div>
              <div className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs font-black text-white/50">
                {achievedCount}/{achievements.length}
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={[
                    "relative overflow-hidden rounded-[20px] border p-3.5 transition",
                    achievement.achieved
                      ? "border-emerald-300/[0.14] bg-emerald-500/[0.055]"
                      : "border-white/[0.06] bg-white/[0.025] opacity-55",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${achievement.color}`}>
                      {achievement.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-white">{achievement.title}</div>
                      <div className="mt-0.5 line-clamp-2 text-xs font-semibold leading-5 text-white/40">
                        {achievement.description}
                      </div>
                    </div>
                  </div>

                  {achievement.progress !== undefined && achievement.target ? (
                    <div className="mt-3">
                      <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-white/35">
                        <span>Fortschritt</span>
                        <span>{achievement.progress}/{achievement.target}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={`h-full rounded-full ${achievement.color}`}
                          style={{
                            width: `${Math.min((achievement.progress / achievement.target) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <MobileBottomNav />
    </div>
  )
}
