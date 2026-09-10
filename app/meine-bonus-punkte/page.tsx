"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
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
    next: 1500,
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
    min: 1500,
    next: 2000,
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
    min: 2000,
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
  lion_cup: "Lion Cup",
  summer_special: "Summer Special",
  fun_turnier: "Fun Turnier",
  extern_verein: "Extern Verein",
  extern_fremd: "Extern fremd",
  manual_bonus: "Manuell",
  edart_league: "E-Dart Meisterschaft",
  steeldart_league: "Steeldart Meisterschaft",
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
  if (totalPoints >= 2000) return RANKS[3]
  if (totalPoints >= 1500) return RANKS[2]
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
    if (row?.id) map.set(row.id, row)
  })

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

async function hasActiveBaseMembership(playerIds: string[]) {
  const cleanPlayerIds = Array.from(new Set(playerIds.filter(Boolean)))
  if (cleanPlayerIds.length === 0) return false

  const today = new Date().toISOString().slice(0, 10)

  const { data: baseModule, error: baseModuleError } = await supabase
    .from("membership_modules")
    .select("id")
    .eq("code", "base_membership")
    .eq("is_active", true)
    .maybeSingle()

  if (baseModuleError) throw baseModuleError

  if (baseModule?.id) {
    const { data: memberships, error: membershipsError } = await supabase
      .from("member_memberships")
      .select("id")
      .in("player_id", cleanPlayerIds)
      .eq("status", "active")
      .lte("starts_on", today)
      .or(`ends_on.is.null,ends_on.gte.${today}`)

    if (membershipsError) throw membershipsError

    const membershipIds = (memberships || []).map((row: any) => String(row.id))

    if (membershipIds.length > 0) {
      const { data: membershipModule, error: membershipModuleError } = await supabase
        .from("member_membership_modules")
        .select("membership_id")
        .in("membership_id", membershipIds)
        .eq("module_id", baseModule.id)
        .limit(1)
        .maybeSingle()

      if (membershipModuleError) throw membershipModuleError
      if (membershipModule) return true
    }
  }

  const { data: trial, error: trialError } = await supabase
    .from("membership_trials")
    .select("id")
    .in("player_id", cleanPlayerIds)
    .eq("module_code", "base_membership")
    .eq("status", "active")
    .lte("starts_on", today)
    .gte("ends_on", today)
    .limit(1)
    .maybeSingle()

  if (trialError) throw trialError

  return !!trial
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
    if (!authLoading && !session) router.push("/member-login")
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user) void loadData()
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

      const possiblePlayerIds = nextProfile.player_id ? [String(nextProfile.player_id)] : []

      const isBaseMember = await hasActiveBaseMembership(possiblePlayerIds)

      if (!isBaseMember) {
        setTransactions([])
        setError(
          "Das Bonusprogramm ist Teil der Mitgliedschaft. Mit aktiver Grundmitgliedschaft oder aktiver Testmitgliedschaft kannst du Bonuspunkte sammeln und das Prämienprogramm nutzen.",
        )
        return
      }

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

  const totalPoints = useMemo(
    () => transactions.reduce((sum, item) => sum + Number(item.points || 0), 0),
    [transactions],
  )

  const currentRank = useMemo(() => getRank(totalPoints), [totalPoints])
  const nextRank = useMemo(() => getNextRank(currentRank), [currentRank])
  const progress = useMemo(() => getProgress(totalPoints, currentRank), [totalPoints, currentRank])
  const pointsToNext = currentRank.next ? Math.max(0, currentRank.next - totalPoints) : 0
  const RankIcon = currentRank.icon
  const sourceStats = useMemo(() => groupBySource(transactions), [transactions])
  const lastBonus = transactions[0] || null
  const highestBonus = useMemo(
    () => transactions.slice().sort((a, b) => Number(b.points || 0) - Number(a.points || 0))[0] || null,
    [transactions],
  )

  if (loading || authLoading) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#f5f6f8] text-slate-950 flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center px-4 pb-24 pt-20">
          <div className="flex flex-col items-center gap-4 rounded-[28px] border border-slate-200 bg-white px-8 py-8 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.55)]">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <div className="text-center">
              <p className="font-black leading-snug text-slate-950">Bonusprogramm wird geladen</p>
              <p className="mt-1 text-sm text-slate-500">Bitte kurz warten…</p>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </main>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#f5f6f8] text-slate-950 flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center px-4 pb-24 pt-20">
          <div className="w-full max-w-md">
            <Card className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_-46px_rgba(15,23,42,0.55)]">
              <CardContent className="p-6 text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                  <Gift className="h-7 w-7 text-orange-600" />
                </div>
                <h1 className="mt-4 text-2xl font-black text-slate-950">Bonusprogramm</h1>
                <p className="mt-2 text-sm font-semibold text-slate-600">{error}</p>
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
    <div className="min-h-screen overflow-x-hidden bg-[#f5f6f8] text-slate-950 flex flex-col">
      <Header />

      <main className="flex-grow flex items-center justify-center px-4 pb-24 pt-20">
        <motion.div
          className="w-full max-w-none space-y-4 sm:space-y-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Button
              variant="ghost"
              onClick={() => router.push("/member-profile-app")}
              className="h-10 rounded-xl px-2 font-black text-orange-700 hover:bg-orange-50 hover:text-orange-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="overflow-hidden rounded-[24px] border border-slate-800/10 bg-white shadow-[0_24px_80px_-42px_rgba(15,23,42,0.62)] sm:rounded-[28px] xl:rounded-[30px]"
          >
            <div className="relative overflow-hidden bg-slate-950 p-4 text-white sm:p-6 lg:p-8 xl:p-9">
              <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.07] sm:h-20 sm:w-20">
                    {photoUrl ? (
                      <img src={photoUrl} alt={playerName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-black text-white">{getInitials(playerName)}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
                      <Gift className="w-3.5 h-3.5" />
                      EMD Bonusprogramm
                    </div>
                    <h1 className="break-words text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">{playerName}</h1>
                    <p className="mt-2 text-sm font-medium leading-6 text-white/55 sm:text-base">Deine Bonuspunkte, dein Rang und dein Fortschritt</p>
                  </div>
                </div>

                <div className="w-full rounded-[22px] border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm sm:p-5 xl:w-auto xl:min-w-[290px]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-950/20">
                      <RankIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.12em] text-white/45">Aktueller Rang</div>
                      <div className="text-2xl font-black tracking-tight">{currentRank.title}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-end gap-2">
                    <div className="text-4xl font-black leading-none sm:text-5xl">{totalPoints}</div>
                    <div className="text-sm font-black text-white/85 pb-1">Punkte</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-7">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
                <div className={cn("rounded-2xl border p-4", currentRank.bg, currentRank.border)}>
                  <div className={cn("text-sm font-black", currentRank.text)}>{currentRank.label}</div>
                  <div className="text-sm text-slate-700 mt-1">{currentRank.description}</div>
                </div>

                <div className="lg:col-span-2 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-black text-slate-950">
                        {nextRank ? `Fortschritt zu ${nextRank.title}` : "Maximalrang erreicht"}
                      </div>
                      <div className="text-sm font-semibold text-slate-700 mt-1">
                        {nextRank ? `Noch ${pointsToNext} Punkte bis ${nextRank.title}` : "Du hast Gold erreicht – stark!"}
                      </div>
                    </div>
                    <Badge className={cn("rounded-full", nextRank ? "bg-orange-600 text-white" : "bg-yellow-500 text-white")}>
                      {progress}%
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <Progress value={progress} className="h-4 bg-white" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {RANKS.filter((rank) => rank.key !== "starter").map((rank) => {
              const Icon = rank.icon
              const reached = totalPoints >= rank.min
              return (
                <div
                  key={rank.key}
                  className={cn(
                    "rounded-[20px] border p-4 bg-white shadow-[0_18px_60px_-48px_rgba(15,23,42,0.5)]",
                    reached ? `${rank.border} ${rank.bg}` : "border-slate-200 opacity-75",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center",
                      reached ? `bg-gradient-to-br ${rank.gradient} text-white` : "bg-slate-100 text-gray-400",
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {reached ? (
                      <Badge className="bg-green-600 text-white rounded-full">Erreicht</Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-full">Offen</Badge>
                    )}
                  </div>
                  <div className="mt-3 font-black text-slate-950">{rank.title}</div>
                  <div className="text-sm font-semibold text-slate-600">ab {rank.min} Punkten</div>
                </div>
              )
            })}
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="rounded-[20px] border border-slate-200 bg-white shadow-[0_18px_60px_-48px_rgba(15,23,42,0.5)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-500">Bonuspunkte</div>
                  <Trophy className="w-5 h-5 text-orange-600" />
                </div>
                <div className="mt-2 text-3xl font-black">{totalPoints}</div>
                <div className="text-xs font-semibold text-slate-500">gesamt</div>
              </CardContent>
            </Card>

            <Card className="rounded-[20px] border border-slate-200 bg-white shadow-[0_18px_60px_-48px_rgba(15,23,42,0.5)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-500">Vergaben</div>
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div className="mt-2 text-3xl font-black">{transactions.length}</div>
                <div className="text-xs font-semibold text-slate-500">Einträge</div>
              </CardContent>
            </Card>

            <Card className="rounded-[20px] border border-slate-200 bg-white shadow-[0_18px_60px_-48px_rgba(15,23,42,0.5)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-500">Höchster Bonus</div>
                  <Zap className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="mt-2 text-3xl font-black">+{highestBonus?.points ?? 0}</div>
                <div className="text-xs font-semibold text-slate-500 truncate">{highestBonus?.rule_title || "—"}</div>
              </CardContent>
            </Card>

            <Card className="rounded-[20px] border border-slate-200 bg-white shadow-[0_18px_60px_-48px_rgba(15,23,42,0.5)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-500">Letzter Bonus</div>
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div className="mt-2 text-3xl font-black">+{lastBonus?.points ?? 0}</div>
                <div className="text-xs font-semibold text-slate-500">{lastBonus ? formatDate(lastBonus.created_at) : "—"}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="relative overflow-hidden rounded-[24px] border border-orange-500/20 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 p-4 text-white shadow-[0_24px_80px_-45px_rgba(234,88,12,0.65)] sm:rounded-[28px] sm:p-6"
          >
            <div className="relative grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-lg backdrop-blur-sm">
                  <Gift className="h-7 w-7 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/90">
                    <Sparkles className="h-3.5 w-3.5" />
                    Prämien verfügbar
                  </div>
                  <h2 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
                    Punkte sammeln und Sachprämien sichern
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/85">
                    Im Prämienbereich siehst du alle verfügbaren Sachpreise, benötigte Punkte und ob du deine Wunschprämie bereits einlösen kannst.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/20 bg-white/15 p-4 backdrop-blur-sm">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-white/15 p-3">
                    <div className="text-lg font-black">1000</div>
                    <div className="text-[10px] font-black uppercase text-white/75">Bronze</div>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-3">
                    <div className="text-lg font-black">1500</div>
                    <div className="text-[10px] font-black uppercase text-white/75">Silber</div>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-3">
                    <div className="text-lg font-black">2000</div>
                    <div className="text-[10px] font-black uppercase text-white/75">Gold</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    href="/praemien"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-orange-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-orange-50"
                  >
                    <Gift className="h-4 w-4" />
                    Zu den Prämien
                  </Link>
                  <Link
                    href="/praemien-rangliste"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-5 py-3 text-sm font-black uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-white/25"
                  >
                    <Trophy className="h-4 w-4" />
                    Rangliste
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,2.2fr)] xl:gap-5">
            <motion.div variants={itemVariants} className="">
              <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)] sm:rounded-[28px]">
                <CardContent className="p-0">
                  <div className="border-b border-slate-100 p-4 sm:p-5">
                    <h2 className="font-black text-slate-950 flex items-center gap-2">
                      <Target className="w-5 h-5 text-orange-600" />
                      Punkte nach Quelle
                    </h2>
                    <p className="text-sm font-semibold text-slate-500 mt-1">Woher deine Bonuspunkte kommen.</p>
                  </div>

                  <div className="space-y-3 p-3 sm:p-4">
                    {sourceStats.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                        Noch keine Bonuspunkte vorhanden.
                      </div>
                    ) : (
                      sourceStats.map((item) => {
                        const value = totalPoints > 0 ? Math.round((item.points / totalPoints) * 100) : 0
                        return (
                          <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-black text-slate-950 truncate">{item.label}</div>
                              <div className="h-10 rounded-xl px-2 font-black text-orange-700 hover:bg-orange-50 hover:text-orange-800">+{item.points}</div>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-white border border-slate-200 overflow-hidden">
                              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${value}%` }} />
                            </div>
                            <div className="mt-1 text-xs font-bold text-slate-500">{value}% deiner Punkte</div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="">
              <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)] sm:rounded-[28px]">
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen((value) => !value)}
                    className="flex w-full items-center justify-between gap-3 border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 sm:p-5"
                  >
                    <div>
                      <h2 className="font-black text-slate-950 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-orange-600" />
                        Bonus-Historie
                      </h2>
                      <p className="text-sm font-semibold text-slate-500 mt-1">
                        Alle gespeicherten Bonuspunkte transparent aufgelistet.
                      </p>
                    </div>
                    <ChevronDown className={cn("w-5 h-5 text-orange-600 transition-transform", historyOpen && "rotate-180")} />
                  </button>

                  {historyOpen ? (
                    <div className="space-y-3 p-3 sm:p-4">
                      {transactions.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                          <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                            <Gift className="w-7 h-7 text-orange-600" />
                          </div>
                          <h3 className="mt-4 font-black text-slate-950">Noch keine Bonuspunkte</h3>
                          <p className="text-sm font-semibold text-slate-500 mt-1">
                            Sobald dir Bonuspunkte gutgeschrieben werden, erscheinen sie hier.
                          </p>
                        </div>
                      ) : (
                        transactions.map((row) => (
                          <div key={row.id} className="rounded-[20px] border border-slate-200 bg-slate-50/40 p-3.5 transition-colors hover:bg-white sm:p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="font-black text-slate-950">{row.rule_title}</div>
                                  {row.category_name ? (
                                    <Badge variant="outline" className="rounded-full bg-orange-50 border-orange-200 text-orange-700">
                                      {row.category_name}
                                    </Badge>
                                  ) : null}
                                </div>

                                <div className="mt-2 text-sm font-semibold text-slate-600">
                                  {row.source_name || SOURCE_LABELS[row.source_type] || row.source_type} · {formatDate(row.created_at)}
                                </div>

                                {row.note ? (
                                  <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
                                    {row.note}
                                  </div>
                                ) : null}
                              </div>

                              <div className="flex w-full items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 sm:w-auto sm:block sm:shrink-0 sm:text-right">
                                <div className="text-2xl font-black text-orange-700">+{row.points}</div>
                                <div className="text-[10px] font-bold text-slate-500">Punkte</div>
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

          <motion.div variants={itemVariants} className="rounded-[20px] border border-slate-200 bg-slate-50/40 p-3.5 transition-colors hover:bg-white sm:p-4">
            <div className="font-black text-slate-950">Ränge im Bonusprogramm</div>
            <div className="text-sm font-semibold text-slate-500">
              Bronze ab 1000 · Silber ab 1500 · Gold ab 2000 Punkten
            </div>
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
