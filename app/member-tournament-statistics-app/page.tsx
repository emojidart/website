"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Crown,
  Gift,
  Loader2,
  Medal,
  Swords,
  Target,
  Trophy,
  TrendingUp,
  UserRound,
} from "lucide-react"

type MemberProfile = {
  id: string
  user_id: string
  player_id: string | null
  is_blocked?: boolean | null
  blocked_reason?: string | null
 club_players: {
  id: string
  name: string
  photo_url: string | null
} | null
}

type SummerStanding = {
  player_name: string
  total_points: number | null
  placement_points: number | null
  legs_won: number | null
  legs_lost: number | null
  tournaments_played: number | null
  total_matches_played: number | null
  total_matches_won: number | null
  total_matches_lost: number | null
  manual_bonus_points: number | null
  winner_side_bonus_points: number | null
  participation_bonus_points: number | null
}

type SummerEntry = {
  id: string
  tournament_id: string | null
  tournament_name: string | null
  tournament_type: string | null
  tournament_date: string | null
  player_name: string
  placement: number | null
  legs_won: number | null
  legs_lost: number | null
  matches_played: number | null
  matches_won: number | null
  matches_lost: number | null
  placement_points: number | null
  bonus_points: number | null
  winner_side_bonus: boolean | null
  form: string | null
}

type DkoRanking = {
  id?: string
  tournament_id: string
  tournament_type: string
  tournament_name: string | null
  player_name: string
  placement: number | null
  eliminated_at: string | null
}

type KratzerPlayerResult = {
  kratzer_tournament_id: string
  player_name: string | null
  lives: number | null
  ligastatus: string | null
  is_eliminated: boolean | null
  elimination_round: number | null
  elimination_time: string | null
}

type KratzerTournament = {
  id: string
  name: string | null
  status: string | null
  created_at: string | null
  finished_at: string | null
}

type KratzerResult = {
  kratzer_tournament_id: string
  winner_name: string | null
  total_rounds: number | null
  created_at: string | null
}

type MyKratzer = {
  tournament_id: string
  tournament_name: string
  date: string | null
  winner_name: string | null
  total_rounds: number | null
  lives: number | null
  ligastatus: string | null
  is_eliminated: boolean | null
  elimination_round: number | null
  elimination_time: string | null
}

function n(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function formatDate(value?: string | null) {
  if (!value) return "—"

  try {
    return new Date(value).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

function getPlacementLabel(placement?: number | null) {
  if (!placement) return "—"
  if (placement === 1) return "1. Platz"
  if (placement === 2) return "2. Platz"
  if (placement === 3) return "3. Platz"
  return `${placement}. Platz`
}

function getPlacementBadgeClass(placement?: number | null) {
  if (placement === 1) return "bg-yellow-500 text-white"
  if (placement === 2) return "bg-gray-500 text-white"
  if (placement === 3) return "bg-amber-600 text-white"
  return "bg-orange-600 text-white"
}

function getTypeLabel(type?: string | null) {
  const t = String(type ?? "").toLowerCase()

  if (t.includes("8")) return "8er DKO"
  if (t.includes("16")) return "16er DKO"
  if (t.includes("32")) return "32er DKO"
  if (t.includes("64")) return "64er DKO"
  if (t.includes("kratzer")) return "Kratzer"

  return type || "Turnier"
}

function StatBox({
  label,
  value,
  icon,
  tone = "orange",
}: {
  label: string
  value: string | number
  icon: ReactNode
  tone?: "orange" | "green" | "blue" | "purple" | "gray" | "yellow"
}) {
  const styles =
    tone === "green"
      ? "bg-green-50 border-green-200 text-green-800"
      : tone === "blue"
        ? "bg-blue-50 border-blue-200 text-blue-800"
        : tone === "purple"
          ? "bg-purple-50 border-purple-200 text-purple-800"
          : tone === "gray"
            ? "bg-gray-50 border-gray-200 text-gray-800"
            : tone === "yellow"
              ? "bg-yellow-50 border-yellow-200 text-yellow-800"
              : "bg-orange-50 border-orange-200 text-orange-800"

  return (
    <div className={`rounded-2xl border p-4 ${styles}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase opacity-80">{label}</div>
          <div className="text-2xl font-black mt-1">{value}</div>
        </div>

        <div className="w-11 h-11 rounded-2xl bg-white/70 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  )
}

function MiniInfo({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="text-[11px] font-black uppercase text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-gray-900">{value}</div>
    </div>
  )
}

export default function MemberTournamentStatisticsPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<MemberProfile | null>(null)

  const [summerStanding, setSummerStanding] = useState<SummerStanding | null>(null)
  const [summerEntries, setSummerEntries] = useState<SummerEntry[]>([])
  const [dkoRankings, setDkoRankings] = useState<DkoRanking[]>([])
  const [kratzerResults, setKratzerResults] = useState<MyKratzer[]>([])

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !session?.user) {
      router.push("/member-login")
    }
  }, [authLoading, session, router])

  useEffect(() => {
    if (session?.user) {
      void loadEverything()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  const loadEverything = async () => {
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
          is_blocked,
          blocked_reason,
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
        setError("Für dieses Konto wurde kein Mitgliederprofil gefunden.")
        return
      }

      if ((profileData as any).is_blocked) {
        setError((profileData as any).blocked_reason || "Dein Zugang ist derzeit gesperrt.")
        return
      }

      const memberProfile = profileData as unknown as MemberProfile
      setProfile(memberProfile)

      const playerName = memberProfile.club_players?.name?.trim()

      if (!playerName) {
        setError("Bei deinem Mitgliederprofil ist kein Spielername verknüpft.")
        return
      }

      await Promise.all([
        loadSummerSpecial(playerName),
        loadDkoRankings(playerName),
        loadKratzer(playerName),
      ])
    } catch (err: any) {
      console.error("Member tournament stats error:", err)
      setError(err?.message || "Turnierstatistiken konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  const loadSummerSpecial = async (playerName: string) => {
    const { data: standingData, error: standingError } = await supabase
      .from("summer_special_total_standings")
      .select("*")
      .eq("player_name", playerName)
      .maybeSingle()

    if (standingError) {
      console.warn("Summer total standings warning:", standingError)
    }

    setSummerStanding((standingData as SummerStanding | null) ?? null)

    const { data: entriesData, error: entriesError } = await supabase
      .from("summer_special_standings")
      .select("*")
      .eq("player_name", playerName)
      .order("tournament_date", { ascending: false })

    if (entriesError) {
      console.warn("Summer entries warning:", entriesError)
    }

    setSummerEntries((entriesData ?? []) as SummerEntry[])
  }

  const loadDkoRankings = async (playerName: string) => {
    const { data: dkoData, error: dkoError } = await supabase
      .from("dko_rankings")
      .select("*")
      .eq("player_name", playerName)
      .order("eliminated_at", { ascending: false })

    if (dkoError) {
      console.warn("DKO rankings warning:", dkoError)
      setDkoRankings([])
      return
    }

    const rows = (dkoData ?? []) as DkoRanking[]

    const cleaned = rows.filter((ranking) => {
      const name = String(ranking.tournament_name ?? "").toLowerCase()
      const type = String(ranking.tournament_type ?? "").toLowerCase()

      if (name.includes("summer special")) return false
      if (type.includes("summer")) return false

      return true
    })

    setDkoRankings(cleaned)
  }
  
  
  
  

  const loadKratzer = async (playerName: string) => {
    const { data: playerRows, error: playerError } = await supabase
      .from("kratzer_tournament_players")
      .select("kratzer_tournament_id,player_name,lives,ligastatus,is_eliminated,elimination_round,elimination_time")
      .eq("player_name", playerName)

    if (playerError) {
      console.warn("Kratzer player warning:", playerError)
      setKratzerResults([])
      return
    }

    const myRows = (playerRows ?? []) as KratzerPlayerResult[]
    const ids = myRows.map((r) => r.kratzer_tournament_id).filter(Boolean)

    if (ids.length === 0) {
      setKratzerResults([])
      return
    }

    const [{ data: tournamentsData }, { data: resultsData }] = await Promise.all([
      supabase
        .from("kratzer_tournaments")
        .select("id,name,status,created_at,finished_at")
        .in("id", ids),
      supabase
        .from("kratzer_tournament_results")
        .select("kratzer_tournament_id,winner_name,total_rounds,created_at")
        .in("kratzer_tournament_id", ids),
    ])

    const tournamentMap = new Map<string, KratzerTournament>()
    for (const t of ((tournamentsData ?? []) as KratzerTournament[])) {
      tournamentMap.set(t.id, t)
    }

    const resultMap = new Map<string, KratzerResult>()
    for (const r of ((resultsData ?? []) as KratzerResult[])) {
      resultMap.set(r.kratzer_tournament_id, r)
    }

    const mapped: MyKratzer[] = myRows
      .map((row) => {
        const tournament = tournamentMap.get(row.kratzer_tournament_id)
        const result = resultMap.get(row.kratzer_tournament_id)

        return {
          tournament_id: row.kratzer_tournament_id,
          tournament_name: tournament?.name || "Kratzer-Turnier",
          date: tournament?.finished_at || result?.created_at || tournament?.created_at || null,
          winner_name: result?.winner_name || null,
          total_rounds: result?.total_rounds ?? null,
          lives: row.lives,
          ligastatus: row.ligastatus,
          is_eliminated: row.is_eliminated,
          elimination_round: row.elimination_round,
          elimination_time: row.elimination_time,
        }
      })
      .sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : 0
        const tb = b.date ? new Date(b.date).getTime() : 0
        return tb - ta
      })

    setKratzerResults(mapped)
  }
  
  


  const playerName = profile?.club_players?.name || "Vereinsmitglied"
  const photoUrl = profile?.club_players?.photo_url || null

  const totalBonus = useMemo(() => {
    if (!summerStanding) return 0

    return (
      n(summerStanding.manual_bonus_points) +
      n(summerStanding.winner_side_bonus_points) +
      n(summerStanding.participation_bonus_points)
    )
  }, [summerStanding])

  const winRate = useMemo(() => {
    if (!summerStanding) return "0.0"
    const played = n(summerStanding.total_matches_played)
    const won = n(summerStanding.total_matches_won)

    if (played <= 0) return "0.0"
    return ((won / played) * 100).toFixed(1)
  }, [summerStanding])

  const legDiff = useMemo(() => {
    if (!summerStanding) return 0
    return n(summerStanding.legs_won) - n(summerStanding.legs_lost)
  }, [summerStanding])

  const totalTournamentCount =
    summerEntries.length + dkoRankings.length + kratzerResults.length

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
        <Header />

        <main className="flex-grow flex items-center justify-center px-4 pb-24 pt-20">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white border border-gray-200 shadow-xl px-8 py-8">
            <Loader2 className="w-10 h-10 animate-spin text-orange-600" />
            <div className="text-center">
              <div className="font-black text-gray-900">Turnierstatistiken werden geladen</div>
              <div className="text-sm text-gray-500 mt-1">Bitte kurz warten…</div>
            </div>
          </div>
        </main>

        <MobileBottomNav />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
        <Header />

        <main className="flex-grow flex items-center justify-center px-4 pb-24 pt-20">
          <Card className="w-full max-w-md rounded-3xl shadow-xl border border-gray-200">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>

              <h1 className="text-2xl font-black text-gray-900 mb-2">
                Statistik nicht verfügbar
              </h1>

              <p className="text-sm text-gray-600 mb-6">
                {error || "Deine Turnierstatistiken konnten nicht geladen werden."}
              </p>

              <Button onClick={() => router.push("/member-profile-app")}>
                Zurück zum Profil
              </Button>
            </CardContent>
          </Card>
        </main>

        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 flex flex-col">
      <Header />

      <main className="flex-grow px-4 pt-20 pb-28">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Card className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-20 h-20 rounded-3xl bg-orange-50 border border-orange-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={playerName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserRound className="w-10 h-10 text-orange-600" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black uppercase text-orange-600">
                    EMD VereinsApp
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
                    Meine Turnierstatistiken
                  </h1>

                  <p className="text-gray-600 mt-1">
                    Persönliche Übersicht für{" "}
                    <span className="font-black text-gray-900">{playerName}</span>
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge className="bg-orange-600 text-white">
                      <Activity className="w-3 h-3 mr-1" />
                      Live Daten
                    </Badge>

                    <Badge variant="outline">
                      {totalTournamentCount} Turnier(e)
                    </Badge>

                    {summerStanding ? (
                      <Badge variant="outline">
                        Summer Special aktiv
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => router.push("/member-profile-app")}
                >
                  Zum Profil
                </Button>
              </div>
            </CardContent>
          </Card>

          {summerStanding && (
            <Card className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-yellow-500" />

              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-orange-600" />
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                    Summer Special Gesamtwertung
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatBox
                    label="Gesamtpunkte"
                    value={n(summerStanding.total_points)}
                    icon={<Trophy className="w-6 h-6" />}
                    tone="orange"
                  />

                  <StatBox
                    label="Turniere"
                    value={`${n(summerStanding.tournaments_played)}/13`}
                    icon={<CalendarDays className="w-6 h-6" />}
                    tone="blue"
                  />

                  <StatBox
                    label="Siegrate"
                    value={`${winRate}%`}
                    icon={<TrendingUp className="w-6 h-6" />}
                    tone="green"
                  />

                  <StatBox
                    label="Bonus"
                    value={totalBonus}
                    icon={<Gift className="w-6 h-6" />}
                    tone="yellow"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MiniInfo label="Platzierungspunkte" value={n(summerStanding.placement_points)} />
                  <MiniInfo label="Legs gewonnen" value={n(summerStanding.legs_won)} />
                  <MiniInfo label="Legs verloren" value={n(summerStanding.legs_lost)} />
                  <MiniInfo label="Leg-Differenz" value={legDiff >= 0 ? `+${legDiff}` : legDiff} />
                  <MiniInfo label="Matches" value={n(summerStanding.total_matches_played)} />
                  <MiniInfo label="Matches gewonnen" value={n(summerStanding.total_matches_won)} />
                  <MiniInfo label="Matches verloren" value={n(summerStanding.total_matches_lost)} />
                  <MiniInfo label="Gewinnerseiten-Bonus" value={n(summerStanding.winner_side_bonus_points)} />
                </div>
              </CardContent>
            </Card>
          )}

          {summerEntries.length > 0 && (
            <Card className="rounded-3xl border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Medal className="w-5 h-5 text-orange-600" />
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                    Meine Summer-Special Turniere
                  </h2>
                </div>

                <div className="space-y-3">
                  {summerEntries.map((entry, index) => {
                    const bonus = n(entry.bonus_points) + (entry.winner_side_bonus ? 5 : 0)

                    return (
                      <div
                        key={entry.id || `${entry.player_name}-${entry.tournament_date}-${index}`}
                        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge className={getPlacementBadgeClass(entry.placement)}>
                                {getPlacementLabel(entry.placement)}
                              </Badge>

                              {entry.winner_side_bonus ? (
                                <Badge className="bg-yellow-500 text-white">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Gewinnerseite +5
                                </Badge>
                              ) : null}
                            </div>

                            <div className="font-black text-gray-900">
                              {entry.tournament_name || "Summer Special Turnier"}
                            </div>

                            <div className="text-sm text-gray-600 mt-1">
                              {formatDate(entry.tournament_date)}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                            <MiniInfo
                              label="Punkte"
                              value={n(entry.placement_points) + n(entry.legs_won) + bonus}
                            />
                            <MiniInfo
                              label="Legs"
                              value={`${n(entry.legs_won)}:${n(entry.legs_lost)}`}
                            />
                            <MiniInfo
                              label="Matches"
                              value={`${n(entry.matches_won)}/${n(entry.matches_played)}`}
                            />
                            <MiniInfo label="Bonus" value={bonus} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {dkoRankings.length > 0 && (
            <Card className="rounded-3xl border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Swords className="w-5 h-5 text-orange-600" />
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                    Meine DKO Turniere
                  </h2>
                </div>

                <div className="space-y-3">
                  {dkoRankings.map((ranking, index) => (
                    <div
                      key={`${ranking.tournament_id}-${ranking.tournament_type}-${index}`}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge className={getPlacementBadgeClass(ranking.placement)}>
                              {getPlacementLabel(ranking.placement)}
                            </Badge>

                            <Badge variant="outline">
                              {getTypeLabel(ranking.tournament_type)}
                            </Badge>
                          </div>

                          <div className="font-black text-gray-900">
                            {ranking.tournament_name || "DKO Turnier"}
                          </div>

                          <div className="text-sm text-gray-600 mt-1">
                            {formatDate(ranking.eliminated_at)}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          className="rounded-2xl w-full sm:w-auto"
                          onClick={() =>
                            router.push(
                              `/tournament-history/${encodeURIComponent(ranking.tournament_id)}?type=${encodeURIComponent(
                                ranking.tournament_type,
                              )}`,
                            )
                          }
                        >
                          Details <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {kratzerResults.length > 0 && (
            <Card className="rounded-3xl border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-orange-600" />
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                    Meine Kratzer-Turniere
                  </h2>
                </div>

                <div className="space-y-3">
                  {kratzerResults.map((k) => (
                    <div
                      key={k.tournament_id}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="outline">Kratzer</Badge>

                            {k.winner_name === playerName ? (
  <Badge className="bg-yellow-500 text-white">Sieger</Badge>
) : k.is_eliminated === true ? (
  <Badge className="bg-gray-600 text-white">Eliminiert</Badge>
) : k.is_eliminated === false ? (
  <Badge className="bg-green-600 text-white">Bis zum Ende dabei</Badge>
) : null}

                            {k.ligastatus && k.ligastatus !== "N/A" ? (
  <Badge className="bg-yellow-500 text-white">
    {k.ligastatus}
  </Badge>
) : null}
                          </div>

                          <div className="font-black text-gray-900">
                            {k.tournament_name}
                          </div>

                          <div className="text-sm text-gray-600 mt-1">
                            {formatDate(k.date)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                          <MiniInfo label="Lives" value={k.lives ?? "—"} />
                          <MiniInfo label="Runde" value={k.elimination_round ?? "—"} />
                          <MiniInfo label="Sieger" value={k.winner_name || "—"} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!summerStanding &&
            summerEntries.length === 0 &&
            dkoRankings.length === 0 &&
            kratzerResults.length === 0 && (
              <Card className="rounded-3xl border border-gray-200 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Trophy className="w-6 h-6 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-black text-gray-900">
                        Noch keine Turnierdaten gefunden
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Sobald für dich Ergebnisse gespeichert wurden, erscheinen deine Turnierstatistiken hier automatisch.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}