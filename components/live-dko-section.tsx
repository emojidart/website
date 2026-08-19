"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { Trophy, Zap, Clock, Target, RefreshCcw, Calendar } from "lucide-react"

interface Match {
  id: number
  player1: string
  player2: string
  player1_id?: string | null
  player2_id?: string | null
  score1: number
  score2: number
  winner?: string
  loser?: string
  machineNumber?: number
}

interface ActiveTournament {
  tournament_id: string
  tournament_type: string
  status: string
  tournament_name: string
  created_at: string
}

interface Ranking {
  player_name: string
  placement: number
  eliminated_at: string
}

const isFreilos = (playerName: string): boolean => {
  return playerName.startsWith("Freilos")
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function LiveDKOSection() {
  const [matches, setMatches] = useState<Record<number, Match>>({})
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [activeTournament, setActiveTournament] = useState<ActiveTournament | null>(null)
  const activeTournamentRef = useRef<ActiveTournament | null>(null)
  const [rankings, setRankings] = useState<Ranking[]>([])

  const [currentPlayerSpieldbId, setCurrentPlayerSpieldbId] = useState<string | null>(null)
  const [scoreDrafts, setScoreDrafts] = useState<Record<number, { score1: string; score2: string }>>({})
  const [savingMatchId, setSavingMatchId] = useState<number | null>(null)

  const getBracketSize = (): 8 | 16 | 32 | 64 => {
    if (!activeTournament) return 16
    const match = activeTournament.tournament_type.match(/(\d+)er_dko|dko_(\d+)/)
    if (match) {
      // Extract the number from either capture group
      const size = Number.parseInt(match[1] || match[2])
      if (size === 8 || size === 16 || size === 32 || size === 64) {
        return size
      }
    }
    return 16
  }

  const bracketSize = getBracketSize()
  console.log("[v0] Final bracketSize:", bracketSize)

  useEffect(() => {
    const loadCurrentPlayer = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError || !authData?.user) {
          setCurrentPlayerSpieldbId(null)
          return
        }

        const userId = authData.user.id

        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("player_id")
          .eq("user_id", userId)
          .maybeSingle()

        if (profileError || !profile?.player_id) {
          setCurrentPlayerSpieldbId(null)
          return
        }

        const { data: clubPlayer, error: clubError } = await supabase
          .from("club_players")
          .select("spieldatenbank_id")
          .eq("id", profile.player_id)
          .maybeSingle()

        if (clubError || !clubPlayer?.spieldatenbank_id) {
          setCurrentPlayerSpieldbId(null)
          return
        }

        setCurrentPlayerSpieldbId(clubPlayer.spieldatenbank_id)
      } catch (err) {
        setCurrentPlayerSpieldbId(null)
      }
    }

    loadCurrentPlayer()
  }, [])

  useEffect(() => {
    const loadActiveTournament = async () => {
      try {
        const { data, error } = await supabase
          .from("tournaments_status")
          .select("tournament_id, tournament_type, status, tournament_name, created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          setLoading(false)
          return
        }

        if (data) {
          const nextTournament: ActiveTournament = {
            tournament_id: data.tournament_id,
            tournament_type: data.tournament_type,
            status: data.status,
            tournament_name: data.tournament_name,
            created_at: data.created_at,
          }

          activeTournamentRef.current = nextTournament
          setActiveTournament(nextTournament)
        } else {
          activeTournamentRef.current = null
          setActiveTournament(null)
          setMatches({})
          setRankings([])
        }
      } catch (error) {
        console.error("Fehler beim Laden des aktiven DKO-Turniers:", error)
      } finally {
        setLoading(false)
      }
    }

    loadActiveTournament()

    const channel = supabase
      .channel("tournament_status_changes_dko")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournaments_status",
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const data = payload.new as any

            const nextTournament: ActiveTournament = {
              tournament_id: data.tournament_id,
              tournament_type: data.tournament_type,
              status: data.status,
              tournament_name: data.tournament_name,
              created_at: data.created_at,
            }

            if (data.status === "active") {
              // Nur das neueste aktive Turnier darf die Live-Ansicht übernehmen.
              const current = activeTournamentRef.current
              const currentCreatedAt = current?.created_at ? new Date(current.created_at).getTime() : 0
              const nextCreatedAt = data.created_at ? new Date(data.created_at).getTime() : 0

              if (!current || current.status !== "active" || nextCreatedAt >= currentCreatedAt) {
                activeTournamentRef.current = nextTournament
                setActiveTournament(nextTournament)
                setLoading(false)
              }
            } else if (data.status === "cancelled" || data.status === "completed") {
              // Statusänderungen anderer/alter DKO-Turniere dürfen das aktuell
              // angezeigte Turnier nicht mehr löschen oder überschreiben.
              const current = activeTournamentRef.current
              if (!current || current.tournament_id !== data.tournament_id) return

              if (data.status === "completed") {
                activeTournamentRef.current = nextTournament
                setActiveTournament(nextTournament)
              } else {
                activeTournamentRef.current = null
                setActiveTournament(null)
                setMatches({})
                setRankings([])
              }
            }
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as any
            const current = activeTournamentRef.current

            if (current && current.tournament_id === deleted.tournament_id) {
              activeTournamentRef.current = null
              setActiveTournament(null)
              setMatches({})
              setRankings([])
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!activeTournament) return

    const loadMatches = async () => {
      try {
        const { data, error } = await supabase
          .from("dko_match_states")
          .select("*")
          .eq("tournament_id", activeTournament.tournament_id)
          .order("match_id", { ascending: true })

        if (error) throw error

        if (data && data.length > 0) {
          const matchesData: Record<number, Match> = {}
          data.forEach((state) => {
            matchesData[state.match_id] = {
              id: state.match_id,
              player1: state.player1 || "",
              player2: state.player2 || "",
              player1_id: state.player1_id || null,
              player2_id: state.player2_id || null,
              score1: state.score1 || 0,
              score2: state.score2 || 0,
              winner: state.winner || undefined,
              loser: state.loser || undefined,
              machineNumber: state.machine_number || undefined,
            }
          })
          setMatches(matchesData)
        }
      } catch (error) {
      } finally {
        setLoading(false)
      }
    }

    loadMatches()
  }, [activeTournament])

  useEffect(() => {
    if (!activeTournament) return

    const channel = supabase
      .channel("dko_match_updates_section")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dko_match_states",
          filter: `tournament_id=eq.${activeTournament.tournament_id}`,
        },
        (payload) => {
          setLastUpdate(new Date())

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const state = payload.new as any
            setMatches((prev) => ({
              ...prev,
              [state.match_id]: {
                id: state.match_id,
                player1: state.player1 || "",
                player2: state.player2 || "",
                player1_id: state.player1_id || null,
                player2_id: state.player2_id || null,
                score1: state.score1 || 0,
                score2: state.score2 || 0,
                winner: state.winner || undefined,
                loser: state.loser || undefined,
                machineNumber: state.machine_number || undefined,
              },
            }))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeTournament])

  useEffect(() => {
    if (!activeTournament) return

    const loadRankings = async () => {
      try {
        const { data, error } = await supabase
          .from("dko_rankings")
          .select("player_name, placement, eliminated_at")
          .eq("tournament_type", activeTournament.tournament_type)
          .eq("tournament_id", activeTournament.tournament_id)
          .order("placement", { ascending: true })

        if (error) throw error

        setRankings(data || [])
      } catch (error) {}
    }

    loadRankings()
  }, [activeTournament])

  useEffect(() => {
    if (!activeTournament) return

    const channel = supabase
      .channel("dko_rankings_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dko_rankings",
          filter: `tournament_id=eq.${activeTournament.tournament_id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newRanking = payload.new as Ranking
            setRankings((prev) => {
              const exists = prev.some((r) => r.player_name === newRanking.player_name)
              if (exists) return prev
              return [...prev, newRanking].sort((a, b) => a.placement - b.placement)
            })
          } else if (payload.eventType === "DELETE") {
            const deletedRanking = payload.old as Ranking
            setRankings((prev) => prev.filter((r) => r.player_name !== deletedRanking.player_name))
          } else if (payload.eventType === "UPDATE") {
            const updatedRanking = payload.new as Ranking
            setRankings((prev) =>
              prev
                .map((r) => (r.player_name === updatedRanking.player_name ? updatedRanking : r))
                .sort((a, b) => a.placement - b.placement),
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeTournament])

  const canEditMatch = (match: Match) => {
    if (!currentPlayerSpieldbId) return false
    return match.player1_id === currentPlayerSpieldbId || match.player2_id === currentPlayerSpieldbId
  }

  const setDraft = (matchId: number, field: "score1" | "score2", value: string) => {
    // keep only digits, avoid weird mobile keyboard chars
    const cleaned = (value ?? "").replace(/\D/g, "")
    setScoreDrafts((prev) => ({
      ...prev,
      [matchId]: {
        score1: field === "score1" ? cleaned : prev[matchId]?.score1 ?? "",
        score2: field === "score2" ? cleaned : prev[matchId]?.score2 ?? "",
      },
    }))
  }

  const bumpDraft = (matchId: number, field: "score1" | "score2", delta: number) => {
    setScoreDrafts((prev) => {
      const current = prev[matchId]?.[field] ?? ""
      const n = Number.parseInt(current === "" ? "0" : current, 10)
      const next = Number.isNaN(n) ? 0 : Math.max(0, n + delta)
      return {
        ...prev,
        [matchId]: {
          score1: field === "score1" ? String(next) : prev[matchId]?.score1 ?? "",
          score2: field === "score2" ? String(next) : prev[matchId]?.score2 ?? "",
        },
      }
    })
  }

  const quickSet = (matchId: number, field: "score1" | "score2", value: number) => {
    setDraft(matchId, field, String(Math.max(0, value)))
  }

  const saveResult = async (match: Match) => {
    if (!activeTournament) return
    if (!canEditMatch(match)) return
    if (match.winner) return

    const draft = scoreDrafts[match.id] ?? { score1: String(match.score1 ?? 0), score2: String(match.score2 ?? 0) }
    const s1 = Number.parseInt(draft.score1, 10)
    const s2 = Number.parseInt(draft.score2, 10)

    if (Number.isNaN(s1) || Number.isNaN(s2)) return
    if (s1 === s2) return

    const winner = s1 > s2 ? match.player1 : match.player2
    const loser = s1 > s2 ? match.player2 : match.player1

    setSavingMatchId(match.id)
    try {
      const { error } = await supabase
        .from("dko_match_states")
        .update({
          score1: s1,
          score2: s2,
          winner,
          loser,
          machine_number: null,
          updated_at: new Date().toISOString(),
        })
        .eq("tournament_id", activeTournament.tournament_id)
        .eq("tournament_type", activeTournament.tournament_type)
        .eq("match_id", match.id)

      if (error) {
        console.error("Error saving result:", error)
      }
    } finally {
      setSavingMatchId(null)
    }
  }

  const activeMatches = Object.values(matches).filter((m) => m.machineNumber && !m.winner)
  const completedMatches = Object.values(matches)
    .filter((m) => m.winner)
    .sort((a, b) => b.id - a.id)
    .slice(0, 6)
  const upcomingMatches = Object.values(matches)
    .filter(
      (m) => m.player1 && m.player2 && !m.machineNumber && !m.winner && !isFreilos(m.player1) && !isFreilos(m.player2),
    )
    .slice(0, 4)

  const getTournamentWinner = () => {
    if (bracketSize === 8) return matches[15]?.winner || matches[14]?.winner
    if (bracketSize === 16) return matches[31]?.winner || matches[30]?.winner
    if (bracketSize === 32) return matches[63]?.winner || matches[62]?.winner
    if (bracketSize === 64) return matches[127]?.winner || matches[126]?.winner
    return null
  }

  const tournamentWinner = getTournamentWinner()
  const isTournamentCompleted = activeTournament?.status === "completed"
  const completedCount = Object.values(matches).filter((m) => m.winner).length

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="mx-auto w-12 h-12 rounded-full border-2 border-orange-200 border-t-orange-600 animate-spin" />
        <p className="mt-4 text-sm font-semibold text-gray-600">Lade DKO Turnier-Daten…</p>
      </div>
    )
  }

  if (!activeTournament) {
    return (
      <div className="text-center py-10">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto">
            <RefreshCcw className="h-6 w-6 text-gray-400" />
          </div>
          <p className="mt-4 text-gray-900 font-black text-base">Aktuell läuft kein DKO Turnier.</p>
          <p className="text-gray-500 text-sm mt-1">Bitte warten, bis ein Turnier gestartet wird.</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* App-style Header Card */}
      <motion.div variants={itemVariants} className="text-center">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-gray-900 truncate">{activeTournament.tournament_name}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[11px] font-black text-gray-900">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {activeTournament.tournament_type.replace("_", " ").toUpperCase()}
                </p>

                <div className="mt-2 flex items-center gap-2 text-[11px] sm:text-xs text-gray-600">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="font-semibold">
                    Gestartet:{" "}
                    {new Date(activeTournament.created_at + "Z").toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {isTournamentCompleted && tournamentWinner ? (
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden shadow-sm border border-orange-200 rounded-2xl">
            <CardHeader className="p-0">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="p-4 sm:p-5">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-black text-gray-900">
                  <Trophy className="h-5 w-5 text-orange-600" />
                  Turniersieger
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 text-center">
              <p className="text-2xl sm:text-3xl font-black text-orange-700">{tournamentWinner}</p>
              <Badge className="mt-3 bg-orange-50 text-orange-800 border border-orange-200 px-3 py-1 rounded-full">
                Champion
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <Card className="overflow-hidden shadow-sm rounded-2xl border border-gray-200">
            <CardContent className="p-4 sm:p-5 text-center">
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-gray-900">{activeMatches.length}</p>
              <p className="text-xs sm:text-sm text-gray-600 font-semibold mt-1">Aktive Spiele</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden shadow-sm rounded-2xl border border-gray-200">
            <CardContent className="p-4 sm:p-5 text-center">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Clock className="h-5 w-5 text-gray-700" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-gray-900">{upcomingMatches.length}</p>
              <p className="text-xs sm:text-sm text-gray-600 font-semibold mt-1">Anstehend</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden shadow-sm rounded-2xl border border-gray-200">
            <CardContent className="p-4 sm:p-5 text-center">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Target className="h-5 w-5 text-emerald-700" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-gray-900">{completedCount}</p>
              <p className="text-xs sm:text-sm text-gray-600 font-semibold mt-1">Abgeschlossen</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeMatches.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden shadow-sm rounded-2xl border border-gray-200">
            <CardHeader className="p-0">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="p-4 sm:p-5">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-black text-gray-900">
                  <Zap className="h-5 w-5 text-orange-600" />
                  Live Spiele
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                {activeMatches.map((match) => (
                  <div key={match.id} className="rounded-2xl border border-orange-200 bg-orange-50/40 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center rounded-full bg-white border border-orange-200 px-3 py-1 text-[11px] font-black text-orange-800">
                        Match {match.id}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-white border border-orange-200 px-3 py-1 text-[11px] font-black text-orange-800">
                        Automat {match.machineNumber}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                        <span className="font-black text-gray-900 truncate">{match.player1}</span>
                        <span className="text-xl font-black text-orange-700">{match.score1}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                        <span className="font-black text-gray-900 truncate">{match.player2}</span>
                        <span className="text-xl font-black text-orange-700">{match.score2}</span>
                      </div>
                    </div>

                    {canEditMatch(match) && !match.winner && (
                      <div className="mt-4 border-t border-orange-200 pt-4">
                        <div className="space-y-4">
                          {/* Mobile-first score entry */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Player 1 */}
                            <div className="rounded-2xl bg-white border border-gray-200 p-3">
                              <p className="text-xs font-black text-gray-900 mb-2 truncate">{match.player1}</p>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-12 w-12 px-0 text-lg rounded-xl"
                                  onClick={() => bumpDraft(match.id, "score1", -1)}
                                  aria-label="Minus"
                                >
                                  −
                                </Button>
                                <Input
                                  className="h-12 text-center text-lg font-black rounded-xl"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  type="tel"
                                  value={scoreDrafts[match.id]?.score1 ?? String(match.score1 ?? 0)}
                                  onChange={(e) => setDraft(match.id, "score1", e.target.value)}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-12 w-12 px-0 text-lg rounded-xl"
                                  onClick={() => bumpDraft(match.id, "score1", +1)}
                                  aria-label="Plus"
                                >
                                  +
                                </Button>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {[0, 1, 2, 3, 4, 5].map((v) => (
                                  <Button
                                    key={v}
                                    type="button"
                                    variant="secondary"
                                    className="h-9 px-3 rounded-xl font-black"
                                    onClick={() => quickSet(match.id, "score1", v)}
                                  >
                                    {v}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Player 2 */}
                            <div className="rounded-2xl bg-white border border-gray-200 p-3">
                              <p className="text-xs font-black text-gray-900 mb-2 truncate">{match.player2}</p>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-12 w-12 px-0 text-lg rounded-xl"
                                  onClick={() => bumpDraft(match.id, "score2", -1)}
                                  aria-label="Minus"
                                >
                                  −
                                </Button>
                                <Input
                                  className="h-12 text-center text-lg font-black rounded-xl"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  type="tel"
                                  value={scoreDrafts[match.id]?.score2 ?? String(match.score2 ?? 0)}
                                  onChange={(e) => setDraft(match.id, "score2", e.target.value)}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-12 w-12 px-0 text-lg rounded-xl"
                                  onClick={() => bumpDraft(match.id, "score2", +1)}
                                  aria-label="Plus"
                                >
                                  +
                                </Button>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {[0, 1, 2, 3, 4, 5].map((v) => (
                                  <Button
                                    key={v}
                                    type="button"
                                    variant="secondary"
                                    className="h-9 px-3 rounded-xl font-black"
                                    onClick={() => quickSet(match.id, "score2", v)}
                                  >
                                    {v}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <Button
                            className="w-full h-12 text-base font-black rounded-xl bg-orange-600 hover:bg-orange-700"
                            onClick={() => saveResult(match)}
                            disabled={savingMatchId === match.id}
                          >
                            {savingMatchId === match.id ? "Speichere..." : "Ergebnis speichern"}
                          </Button>

                          <p className="text-[11px] text-gray-500"></p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {upcomingMatches.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden shadow-sm rounded-2xl border border-gray-200">
            <CardHeader className="p-0">
              <div className="h-2 bg-gradient-to-r from-gray-300 to-gray-200" />
              <div className="p-4 sm:p-5">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-black text-gray-900">
                  <Clock className="h-5 w-5 text-gray-700" />
                  Als Nächstes
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {upcomingMatches.map((match) => (
                  <div key={match.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <span className="inline-flex items-center rounded-full bg-white border border-gray-200 px-3 py-1 text-[11px] font-black text-gray-900 mb-3">
                      Match {match.id}
                    </span>
                    <div className="space-y-2">
                      <div
                        className={cn(
                          "flex items-center justify-between p-2 rounded-xl text-sm border",
                          match.winner === match.player1
                            ? "bg-emerald-50 border-emerald-200 font-black"
                            : "bg-white border-gray-200",
                        )}
                      >
                        <span className={cn("text-sm truncate", match.winner === match.player1 && "text-gray-900")}>
                          {match.player1}
                        </span>
                        <span className={cn("text-sm font-black", match.winner === match.player1 && "text-emerald-700")}>
                          {match.score1}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "flex items-center justify-between p-2 rounded-xl text-sm border",
                          match.winner === match.player2
                            ? "bg-emerald-50 border-emerald-200 font-black"
                            : "bg-white border-gray-200",
                        )}
                      >
                        <span className={cn("text-sm truncate", match.winner === match.player2 && "text-gray-900")}>
                          {match.player2}
                        </span>
                        <span className={cn("text-sm font-black", match.winner === match.player2 && "text-emerald-700")}>
                          {match.score2}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {completedMatches.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden shadow-sm rounded-2xl border border-gray-200">
            <CardHeader className="p-0">
              <div className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-600" />
              <div className="p-4 sm:p-5">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-black text-gray-900">
                  <Trophy className="h-5 w-5 text-emerald-700" />
                  Letzte Ergebnisse
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {completedMatches.map((match) => (
                  <div key={match.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <Badge variant="secondary" className="text-[11px] font-black mb-3 rounded-full">
                      Match {match.id}
                    </Badge>
                    <div className="space-y-2">
                      <div
                        className={cn(
                          "flex items-center justify-between p-2 rounded-xl text-sm border",
                          match.winner === match.player1
                            ? "bg-emerald-50 border-emerald-200 font-black"
                            : "bg-gray-50 border-gray-200",
                        )}
                      >
                        <span className={cn("text-sm truncate", match.winner === match.player1 && "text-gray-900")}>
                          {match.player1}
                        </span>
                        <span className={cn("text-sm font-black", match.winner === match.player1 && "text-emerald-700")}>
                          {match.score1}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "flex items-center justify-between p-2 rounded-xl text-sm border",
                          match.winner === match.player2
                            ? "bg-emerald-50 border-emerald-200 font-black"
                            : "bg-gray-50 border-gray-200",
                        )}
                      >
                        <span className={cn("text-sm truncate", match.winner === match.player2 && "text-gray-900")}>
                          {match.player2}
                        </span>
                        <span className={cn("text-sm font-black", match.winner === match.player2 && "text-emerald-700")}>
                          {match.score2}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {rankings.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden shadow-sm rounded-2xl border border-gray-200">
            <CardHeader className="p-0">
              <div className="h-2 bg-gradient-to-r from-violet-500 to-purple-600" />
              <div className="p-4 sm:p-5">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-black text-gray-900">
                  <Trophy className="h-5 w-5 text-purple-700" />
                  Aktuelle Rangliste
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="space-y-2">
                {rankings.map((ranking) => (
                  <div
                    key={`${ranking.placement}-${ranking.player_name}`}
                    className={cn(
                      "flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all",
                      ranking.placement === 1 && "bg-yellow-50 border-yellow-200",
                      ranking.placement === 2 && "bg-gray-100 border-gray-200",
                      ranking.placement === 3 && "bg-orange-50 border-orange-200",
                      ranking.placement > 3 && "bg-white border-gray-200",
                    )}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center rounded-xl border px-2.5 py-1 text-[11px] font-black flex-shrink-0",
                          ranking.placement === 1 && "bg-yellow-100 text-yellow-900 border-yellow-200",
                          ranking.placement === 2 && "bg-gray-200 text-gray-900 border-gray-300",
                          ranking.placement === 3 && "bg-orange-100 text-orange-900 border-orange-200",
                          ranking.placement > 3 && "bg-gray-50 text-gray-900 border-gray-200",
                        )}
                      >
                        {ranking.placement === 1
                          ? "🥇"
                          : ranking.placement === 2
                            ? "🥈"
                            : ranking.placement === 3
                              ? "🥉"
                              : `${ranking.placement}.`}
                      </span>
                      <span className="font-black text-gray-900 text-sm sm:text-base truncate">{ranking.player_name}</span>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-[11px] font-black text-gray-900">
                      Platz {ranking.placement}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden shadow-sm rounded-2xl border border-gray-200">
          <CardHeader className="p-0">
            <div className="h-2 bg-gradient-to-r from-gray-800 to-gray-600" />
            <div className="p-4 sm:p-5">
              <CardTitle className="text-base sm:text-lg font-black text-gray-900">Kompletter Bracket</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-6">
            {bracketSize === 8 && (
              <>
                <BracketRound title="Runde 1" matches={Object.values(matches).filter((m) => m.id >= 1 && m.id <= 4)} />
                <BracketRound title="Runde 2" matches={Object.values(matches).filter((m) => m.id >= 5 && m.id <= 6)} />
                <BracketRound title="Halbfinale" matches={Object.values(matches).filter((m) => m.id === 7)} />

                <BracketRound
                  title="Verlierer Runde 1"
                  matches={Object.values(matches).filter((m) => m.id >= 8 && m.id <= 9)}
                  isLoser
                />
                <BracketRound
                  title="Verlierer Runde 2"
                  matches={Object.values(matches).filter((m) => m.id >= 10 && m.id <= 11)}
                  isLoser
                />
                <BracketRound title="Verlierer Runde 3" matches={Object.values(matches).filter((m) => m.id === 12)} isLoser />
                <BracketRound title="Verlierer Runde 4" matches={Object.values(matches).filter((m) => m.id === 13)} isLoser />

                <BracketRound title="Großes Finale" matches={Object.values(matches).filter((m) => m.id === 14)} />
                <BracketRound title="Bracket Reset" matches={Object.values(matches).filter((m) => m.id === 15)} />
              </>
            )}
            {bracketSize === 16 && (
              <>
                <BracketRound title="Runde 1" matches={Object.values(matches).filter((m) => m.id >= 1 && m.id <= 8)} />
                <BracketRound
                  title="Verlierer Runde 1"
                  matches={Object.values(matches).filter((m) => m.id >= 9 && m.id <= 12)}
                  isLoser
                />
                <BracketRound title="Runde 2" matches={Object.values(matches).filter((m) => m.id >= 13 && m.id <= 16)} />
                <BracketRound
                  title="Verlierer Runde 2"
                  matches={Object.values(matches).filter((m) => m.id >= 17 && m.id <= 20)}
                  isLoser
                />
                <BracketRound
                  title="Verlierer Runde 3"
                  matches={Object.values(matches).filter((m) => m.id >= 21 && m.id <= 22)}
                  isLoser
                />
                <BracketRound title="Runde 3" matches={Object.values(matches).filter((m) => m.id >= 23 && m.id <= 24)} />
                <BracketRound
                  title="Verlierer Runde 4"
                  matches={Object.values(matches).filter((m) => m.id >= 25 && m.id <= 26)}
                  isLoser
                />
                <BracketRound title="Halbfinale" matches={Object.values(matches).filter((m) => m.id === 28)} />
                <BracketRound title="Verlierer Runde 5" matches={Object.values(matches).filter((m) => m.id === 27)} isLoser />
                <BracketRound title="Verlierer Runde 6" matches={Object.values(matches).filter((m) => m.id === 29)} isLoser />
                <BracketRound title="Großes Finale" matches={Object.values(matches).filter((m) => m.id === 30)} />
                <BracketRound title="Bracket Reset" matches={Object.values(matches).filter((m) => m.id === 31)} />
              </>
            )}
            {bracketSize === 32 && (
              <>
                <BracketRound title="Runde 1" matches={Object.values(matches).filter((m) => m.id >= 1 && m.id <= 16)} />
                <BracketRound
                  title="Verlierer Runde 1"
                  matches={Object.values(matches).filter((m) => m.id >= 17 && m.id <= 24)}
                  isLoser
                />
                <BracketRound title="Runde 2" matches={Object.values(matches).filter((m) => m.id >= 25 && m.id <= 32)} />
                <BracketRound
                  title="Verlierer Runde 2"
                  matches={Object.values(matches).filter((m) => m.id >= 33 && m.id <= 40)}
                  isLoser
                />
                <BracketRound
                  title="Verlierer Runde 3"
                  matches={Object.values(matches).filter((m) => m.id >= 41 && m.id <= 44)}
                  isLoser
                />
                <BracketRound title="Runde 3" matches={Object.values(matches).filter((m) => m.id >= 45 && m.id <= 48)} />
                <BracketRound
                  title="Verlierer Runde 4"
                  matches={Object.values(matches).filter((m) => m.id >= 49 && m.id <= 52)}
                  isLoser
                />
                <BracketRound
                  title="Verlierer Runde 5"
                  matches={Object.values(matches).filter((m) => m.id >= 53 && m.id <= 54)}
                  isLoser
                />
                <BracketRound title="Runde 4" matches={Object.values(matches).filter((m) => m.id >= 55 && m.id <= 56)} />
                <BracketRound
                  title="Verlierer Runde 6"
                  matches={Object.values(matches).filter((m) => m.id >= 57 && m.id <= 58)}
                  isLoser
                />
                <BracketRound title="Verlierer Runde 7" matches={Object.values(matches).filter((m) => m.id === 59)} isLoser />
                <BracketRound title="Halbfinale" matches={Object.values(matches).filter((m) => m.id === 60)} />
                <BracketRound title="Verlierer Runde 8" matches={Object.values(matches).filter((m) => m.id === 61)} isLoser />
                <BracketRound title="Großes Finale" matches={Object.values(matches).filter((m) => m.id === 62)} />
                <BracketRound title="Bracket Reset" matches={Object.values(matches).filter((m) => m.id === 63)} />
              </>
            )}
            {bracketSize === 64 && <>{/* Additional logic for 64-player bracket can be added here */}</>}
          </CardContent>
        </Card>
      </motion.div>

      <div className="text-center text-xs sm:text-sm text-gray-600 pt-6 mt-2 border-t border-gray-200">
        <p className="font-semibold">Letzte Aktualisierung: {lastUpdate.toLocaleTimeString("de-DE")}</p>
        <p className="mt-1">Aktualisiert sich automatisch in Echtzeit</p>
      </div>
    </motion.div>
  )
}

interface BracketRoundProps {
  title: string
  matches: Match[]
  isLoser?: boolean
}

function BracketRound({ title, matches, isLoser }: BracketRoundProps) {
  if (matches.length === 0) return null

  return (
    <div className="space-y-3">
      <h3
        className={cn(
          "text-base sm:text-lg font-black pb-2 border-b",
          isLoser ? "text-red-600 border-red-200" : "text-orange-700 border-orange-200",
        )}
      >
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {matches.map((match) => (
          <BracketMatchCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  )
}

function BracketMatchCard({ match }: { match: Match }) {
  const hasPlayers = match.player1 && match.player2
  const isActive = match.machineNumber && !match.winner
  const isCompleted = !!match.winner

  return (
    <Card
      className={cn(
        "transition-all rounded-2xl border shadow-sm",
        isActive && "border-orange-200 bg-orange-50/40",
        isCompleted && "border-gray-200 bg-white",
        !hasPlayers && "opacity-50 bg-gray-50",
      )}
    >
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-2.5 py-0.5 text-[11px] font-black text-gray-900">
            Match {match.id}
          </span>
          {isActive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-600 text-white px-2.5 py-0.5 text-[11px] font-black">
              <Zap className="h-3 w-3" />
              Live
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          <div
            className={cn(
              "flex items-center justify-between p-2 rounded-xl text-sm border",
              match.winner === match.player1 ? "bg-emerald-50 border-emerald-200 font-black" : "bg-gray-50 border-gray-200",
            )}
          >
            <span className="truncate">{match.player1 || "Warte auf Spieler..."}</span>
            {hasPlayers && <span className="ml-2 font-black">{match.score1}</span>}
          </div>
          <div
            className={cn(
              "flex items-center justify-between p-2 rounded-xl text-sm border",
              match.winner === match.player2 ? "bg-emerald-50 border-emerald-200 font-black" : "bg-gray-50 border-gray-200",
            )}
          >
            <span className="truncate">{match.player2 || "Warte auf Spieler..."}</span>
            {hasPlayers && <span className="ml-2 font-black">{match.score2}</span>}
          </div>
        </div>
      </div>
    </Card>
  )
}