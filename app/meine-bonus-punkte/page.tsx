"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Award,
  Calendar,
  ChevronDown,
  Crown,
  Gift,
  Loader2,
  Medal,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type UserProfileRow = {
  id: string
  user_id: string
  player_id: string | null
  club_players?: {
    id: string
    name: string
    photo_url?: string | null
  } | null
}

type BonusTransaction = {
  id: string
  player_id: string
  player_name: string
  rule_id: string | null
  rule_title: string
  category_name: string | null
  points: number
  source_type: string
  source_context: string | null
  source_id: string | null
  source_name: string | null
  note: string | null
  created_at: string
}

type RankInfo = {
  key: "starter" | "bronze" | "silber" | "gold"
  title: string
  label: string
  icon: any
  min: number
  next: number | null
  gradient: string
  bg: string
  text: string
  border: string
  description: string
}

const RANKS: RankInfo[] = [
  {
    key: "starter",
    title: "Starter",
    label: "Noch kein Rang",
    icon: Star,
    min: 0,
    next: 1000,
    gradient: "from-orange-500 via-orange-600 to-red-600",
    bg: "bg-orange-50",
    text: "text-orange-800",
    border: "border-orange-200",
    description: "Sammle deine ersten Bonuspunkte und erreiche Bronze.",
  },
  {
    key: "bronze",
    title: "Bronze",
    label: "Bronze Rang",
    icon: Medal,
    min: 1000,
    next: 1200,
    gradient: "from-amber-700 via-orange-700 to-orange-900",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    description: "Starker Start! Weiter sammeln Richtung Silber.",
  },
  {
    key: "silber",
    title: "Silber",
    label: "Silber Rang",
    icon: Shield,
    min: 1200,
    next: 1500,
    gradient: "from-slate-400 via-slate-500 to-slate-700",
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    description: "Sehr starke Vereinsaktivität. Nur noch ein Schritt zu Gold.",
  },
  {
    key: "gold",
    title: "Gold",
    label: "Gold Rang",
    icon: Crown,
    min: 1500,
    next: null,
    gradient: "from-yellow-400 via-orange-500 to-red-600",
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    border: "border-yellow-200",
    description: "Gold erreicht. Absolute Top-Aktivität im Verein.",
  },
]

const SOURCE_LABELS: Record<string, string> = {
  members_cup: "Members Cup",
  summer_special: "Summer Special",
  fun_turnier: "Fun Turnier",
  extern_verein: "Extern Verein",
  extern_fremd: "Extern fremd",
  manual_bonus: "Manuell",
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } },
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return value
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

function getRank(totalPoints: number) {
  if (totalPoints >= 1500) return RANKS[3]
  if (totalPoints >= 1200) return RANKS[2]
  if (totalPoints >= 1000) return RANKS[1]
  return RANKS[0]
}

function getNextRank(rank: RankInfo) {
  if (!rank.next) return null
  return RANKS.find((item) => item.min === rank.next) || null
}

function getProgress(totalPoints: number, rank: RankInfo) {
  if (!rank.next) return 100
  const range = rank.next - rank.min
  const current = Math.max(0, totalPoints - rank.min)
  return Math.max(0, Math.min(100, Math.round((current / range) * 100)))
}

function groupBySource(transactions: BonusTransaction[]) {
  const map = new Map<string, number>()

  transactions.forEach((item) => {
    const label = SOURCE_LABELS[item.source_type] || item.source_name || item.source_type || "Sonstiges"
    map.set(label, (map.get(label) || 0) + Number(item.points || 0))
  })

  return Array.from(map.entries())
    .map(([label, points]) => ({ label, points }))
    .sort((a, b) => b.points - a.points)
}

function uniqueTransactions(rows: BonusTransaction[]) {
  const map = new Map<string, BonusTransaction>()

  rows.forEach((row) => {
    if (row?.id) {
      map.set(row.id, row)
    }
  })

  return Array.from(map.values()).sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export default function MemberBonusAppPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfileRow | null>(null)
  const [transactions, setTransactions] = useState<BonusTransaction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(true)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user) {
      void loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  const loadData = async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      setError(null)

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select(`
          id,
          user_id,
          player_id,
          club_players (
            id,
            name,
            photo_url
          )
        `)
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profileData) {
        setProfile(null)
        setTransactions([])
        setError("Für dein Konto wurde noch kein Spielerprofil gefunden.")
        return
      }

      const nextProfile = profileData as any as UserProfileRow
      setProfile(nextProfile)

      const playerNameFromProfile = String(nextProfile.club_players?.name || "").trim()

      const possiblePlayerIds = Array.from(
        new Set(
          [
            nextProfile.club_players?.id ? String(nextProfile.club_players.id) : "",
            nextProfile.player_id ? String(nextProfile.player_id) : "",
          ].filter(Boolean),
        ),
      )

      const foundTransactions: BonusTransaction[] = []

      if (possiblePlayerIds.length > 0) {
        const { data: bonusByIds, error: bonusByIdsError } = await supabase
          .from("bonus_transactions")
          .select("*")
          .in("player_id", possiblePlayerIds)
          .order("created_at", { ascending: false })

        if (bonusByIdsError) throw bonusByIdsError

        foundTransactions.push(...((bonusByIds || []) as BonusTransaction[]))
      }

      if (playerNameFromProfile) {
        const { data: bonusByName, error: bonusByNameError } = await supabase
          .from("bonus_transactions")
          .select("*")
          .ilike("player_name", playerNameFromProfile)
          .order("created_at", { ascending: false })

        if (bonusByNameError) throw bonusByNameError

        foundTransactions.push(...((bonusByName || []) as BonusTransaction[]))
      }

      setTransactions(uniqueTransactions(foundTransactions))
    } catch (error: any) {
      console.error("member bonus load error:", error)
      setError(error?.message || "Bonuspunkte konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  const playerName = profile?.club_players?.name || transactions[0]?.player_name || "Vereinsmitglied"
  const photoUrl = profile?.club_players?.photo_url || null

  const totalPoints = useMemo(() => {
    return transactions.reduce((sum, item) => sum + Number(item.points || 0), 0)
  }, [transactions])

  const currentRank = useMemo(() => getRank(totalPoints), [totalPoints])
  const nextRank = useMemo(() => getNextRank(currentRank), [currentRank])
  const progress = useMemo(() => getProgress(totalPoints, currentRank), [totalPoints, currentRank])
  const pointsToNext = currentRank.next ? Math.max(0, currentRank.next - totalPoints) : 0
  const RankIcon = currentRank.icon

  const sourceStats = useMemo(() => groupBySource(transactions), [transactions])
  const lastBonus = transactions[0] || null
  const highestBonus = useMemo(() => {
    return transactions.slice().sort((a, b) => Number(b.points || 0) - Number(a.points || 0))[0] || null
  }, [transactions])

  if (loading || authLoading) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4 pb-20 pt-12">
          <div className="flex flex-col items-center gap-5 rounded-3xl bg-white shadow-2xl px-10 py-10 border border-gray-200">
            <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">Bonusprogramm wird geladen</p>
              <p className="text-sm text-gray-500 mt-1">Bitte kurz warten…</p>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </main>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
        <Header />
        <main className="pt-12 sm:pt-14">
          <div className="mx-auto w-full max-w-xl px-4 py-8">
            <Card className="rounded-3xl border-0 shadow-xl bg-white overflow-hidden">
              <CardContent className="p-6 text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                  <Gift className="w-8 h-8 text-orange-600" />
                </div>
                <h1 className="mt-4 text-2xl font-black text-gray-900">Bonusprogramm</h1>
                <p className="mt-2 text-sm font-semibold text-gray-600">{error}</p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button variant="outline" onClick={() => router.push("/member-profile-app")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Zurück
                  </Button>
                  <Button onClick={loadData} className="bg-orange-600 hover:bg-orange-700">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Neu laden
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
      <Header />

      <main className="pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full px-4 py-6 max-w-2xl lg:max-w-screen-xl space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Button variant="ghost" onClick={() => router.push("/")} className="font-black text-orange-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück 
            </Button>
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-3xl overflow-hidden shadow-2xl border border-orange-100 bg-white">
            <div className="relative p-5 sm:p-8 text-white bg-gradient-to-br from-orange-500 via-orange-600 to-red-600">
              <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_15%_15%,white,transparent_35%),radial-gradient(circle_at_85%_20%,white,transparent_30%),radial-gradient(circle_at_70%_90%,white,transparent_35%)]" />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/10 to-transparent" />

              <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/15 border border-white/30 overflow-hidden shadow-xl flex items-center justify-center shrink-0">
                    {photoUrl ? (
                      <img src={photoUrl} alt={playerName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-black text-white">{getInitials(playerName)}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-black mb-2">
                      <Gift className="w-3.5 h-3.5" />
                      EMD Bonusprogramm
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black leading-tight truncate">{playerName}</h1>
                    <p className="text-white/90 font-semibold mt-1">Deine Bonuspunkte, dein Rang und dein Fortschritt</p>
                  </div>
                </div>

                <div className="rounded-3xl bg-white/15 border border-white/25 p-5 min-w-[240px] backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white text-orange-700 flex items-center justify-center shadow-lg">
                      <RankIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white/80">Aktueller Rang</div>
                      <div className="text-2xl font-black">{currentRank.title}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-end gap-2">
                    <div className="text-5xl font-black leading-none">{totalPoints}</div>
                    <div className="text-sm font-black text-white/85 pb-1">Punkte</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className={cn("rounded-2xl border p-4", currentRank.bg, currentRank.border)}>
                  <div className={cn("text-sm font-black", currentRank.text)}>{currentRank.label}</div>
                  <div className="text-sm text-gray-700 mt-1">{currentRank.description}</div>
                </div>

                <div className="lg:col-span-2 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-black text-gray-900">
                        {nextRank ? `Fortschritt zu ${nextRank.title}` : "Maximalrang erreicht"}
                      </div>
                      <div className="text-sm font-semibold text-gray-700 mt-1">
                        {nextRank ? `Noch ${pointsToNext} Punkte bis ${nextRank.title}` : "Du hast Gold erreicht – stark!"}
                      </div>
                    </div>
                    <Badge className={cn("rounded-full", nextRank ? "bg-orange-600 text-white" : "bg-yellow-500 text-white")}>
                      {progress}%
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <Progress value={progress} className="h-4 bg-white" />
                    <div className="mt-2 flex justify-between text-xs font-black text-gray-600">
                      <span>{currentRank.min} Punkte</span>
                      <span>{currentRank.next ?? totalPoints} Punkte</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {RANKS.filter((rank) => rank.key !== "starter").map((rank) => {
              const Icon = rank.icon
              const reached = totalPoints >= rank.min

              return (
                <div
                  key={rank.key}
                  className={cn(
                    "rounded-2xl border p-4 shadow-sm bg-white",
                    reached ? `${rank.border} ${rank.bg}` : "border-gray-200 opacity-75",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center",
                        reached ? `bg-gradient-to-br ${rank.gradient} text-white` : "bg-gray-100 text-gray-400",
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    {reached ? (
                      <Badge className="bg-green-600 text-white rounded-full">Erreicht</Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-full">
                        Offen
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 font-black text-gray-900">{rank.title}</div>
                  <div className="text-sm font-semibold text-gray-600">ab {rank.min} Punkten</div>
                </div>
              )
            })}
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-gray-500">Bonuspunkte</div>
                  <Trophy className="w-5 h-5 text-orange-600" />
                </div>
                <div className="mt-2 text-3xl font-black">{totalPoints}</div>
                <div className="text-xs font-semibold text-gray-500">gesamt</div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-gray-500">Vergaben</div>
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div className="mt-2 text-3xl font-black">{transactions.length}</div>
                <div className="text-xs font-semibold text-gray-500">Einträge</div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-gray-500">Höchster Bonus</div>
                  <Zap className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="mt-2 text-3xl font-black">+{highestBonus?.points ?? 0}</div>
                <div className="text-xs font-semibold text-gray-500 truncate">{highestBonus?.rule_title || "—"}</div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-gray-500">Letzter Bonus</div>
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div className="mt-2 text-3xl font-black">+{lastBonus?.points ?? 0}</div>
                <div className="text-xs font-semibold text-gray-500">{lastBonus ? formatDate(lastBonus.created_at) : "—"}</div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="lg:col-span-1">
              <Card className="rounded-3xl border border-gray-200 shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5 border-b border-gray-100">
                    <h2 className="font-black text-gray-900 flex items-center gap-2">
                      <Target className="w-5 h-5 text-orange-600" />
                      Punkte nach Quelle
                    </h2>
                    <p className="text-sm font-semibold text-gray-500 mt-1">Woher deine Bonuspunkte kommen.</p>
                  </div>

                  <div className="p-4 space-y-3">
                    {sourceStats.length === 0 ? (
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-500">
                        Noch keine Bonuspunkte vorhanden.
                      </div>
                    ) : (
                      sourceStats.map((item) => {
                        const value = totalPoints > 0 ? Math.round((item.points / totalPoints) * 100) : 0

                        return (
                          <div key={item.label} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-black text-gray-900 truncate">{item.label}</div>
                              <div className="font-black text-orange-700">+{item.points}</div>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-white border border-gray-200 overflow-hidden">
                              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${value}%` }} />
                            </div>
                            <div className="mt-1 text-xs font-bold text-gray-500">{value}% deiner Punkte</div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card className="rounded-3xl border border-gray-200 shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen((value) => !value)}
                    className="w-full p-5 border-b border-gray-100 flex items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <h2 className="font-black text-gray-900 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-orange-600" />
                        Bonus-Historie
                      </h2>
                      <p className="text-sm font-semibold text-gray-500 mt-1">Alle gespeicherten Bonuspunkte transparent aufgelistet.</p>
                    </div>
                    <ChevronDown className={cn("w-5 h-5 text-orange-600 transition-transform", historyOpen && "rotate-180")} />
                  </button>

                  {historyOpen ? (
                    <div className="p-4 space-y-3">
                      {transactions.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
                          <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                            <Gift className="w-7 h-7 text-orange-600" />
                          </div>
                          <h3 className="mt-4 font-black text-gray-900">Noch keine Bonuspunkte</h3>
                          <p className="text-sm font-semibold text-gray-500 mt-1">
                            Sobald dir Bonuspunkte gutgeschrieben werden, erscheinen sie hier.
                          </p>
                        </div>
                      ) : (
                        transactions.map((row) => (
                          <div key={row.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="font-black text-gray-900">{row.rule_title}</div>
                                  {row.category_name ? (
                                    <Badge variant="outline" className="rounded-full bg-orange-50 border-orange-200 text-orange-700">
                                      {row.category_name}
                                    </Badge>
                                  ) : null}
                                </div>

                                <div className="mt-2 text-sm font-semibold text-gray-600">
                                  {row.source_name || SOURCE_LABELS[row.source_type] || row.source_type} · {formatDate(row.created_at)}
                                </div>

                                {row.note ? (
                                  <div className="mt-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600">
                                    {row.note}
                                  </div>
                                ) : null}
                              </div>

                              <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-right shrink-0">
                                <div className="text-2xl font-black text-orange-700">+{row.points}</div>
                                <div className="text-[10px] font-bold text-gray-500">Punkte</div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-black text-gray-900">Ränge im Bonusprogramm</div>
                <div className="text-sm font-semibold text-gray-500">Bronze ab 1000 · Silber ab 1200 · Gold ab 1500 Punkten</div>
              </div>
              
            </div>
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}