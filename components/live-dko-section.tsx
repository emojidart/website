"use client"

import { useState, useEffect } from "react"
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
          .limit(1)
          .single()

        if (error) {
          setLoading(false)
          return
        }

        if (data) {
          setActiveTournament({
            tournament_id: data.tournament_id,
            tournament_type: data.tournament_type,
            status: data.status,
            tournament_name: data.tournament_name,
            created_at: data.created_at,
          })
        }
      } catch (error) {
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
            if (data.status === "active") {
              setActiveTournament({
                tournament_id: data.tournament_id,
                tournament_type: data.tournament_type,
                status: data.status,
                tournament_name: data.tournament_name,
                created_at: data.created_at,
              })
              setLoading(false)
            } else if (data.status === "cancelled" || data.status === "completed") {
              if (data.status === "completed") {
                setActiveTournament({
                  tournament_id: data.tournament_id,
                  tournament_type: data.tournament_type,
                  status: data.status,
                  tournament_name: data.tournament_name,
                  created_at: data.created_at,
                })
              } else {
                setActiveTournament(null)
                setMatches({})
              }
            }
          } else if (payload.eventType === "DELETE") {
            setActiveTournament(null)
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
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-6">
          <Trophy className="h-12 w-12 text-white mx-auto" />
        </div>
        <p className="mt-4 text-gray-600">Lade DKO Turnier-Daten...</p>
      </div>
    )
  }

  if (!activeTournament) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-lg">
        <RefreshCcw className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 text-lg">Aktuell läuft kein DKO Turnier.</p>
        <p className="text-gray-500 text-sm mt-2">Bitte warten Sie, bis ein Turnier gestartet wird.</p>
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={itemVariants} className="text-center mb-8 sm:mb-12">
        <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-8 md:p-12 text-white">
          <div className="bg-white/10 rounded-full p-3 sm:p-4 w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 backdrop-blur-sm">
            <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-white mx-auto" />
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold uppercase leading-none tracking-tighter mb-2 sm:mb-4">
            <span className="block text-white">{activeTournament.tournament_name}</span>
            <span className="block text-orange-200 text-xl sm:text-3xl md:text-4xl mt-2">
              {activeTournament.tournament_type.replace("_", " ").toUpperCase()}
            </span>
          </h2>
          <div className="flex items-center justify-center gap-2 text-orange-100 mb-4">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base font-medium">
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
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm sm:text-base font-semibold text-white">LIVE</span>
          </div>
        </div>
      </motion.div>

      {isTournamentCompleted && tournamentWinner ? (
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden shadow-lg border-2 border-orange-500">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
              <CardTitle className="flex items-center justify-center gap-3 text-2xl sm:text-3xl">
                <Trophy className="h-8 w-8 sm:h-10 sm:w-10" />
                Turniersieger
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <p className="text-4xl sm:text-6xl font-bold text-orange-600 mb-4">{tournamentWinner}</p>
              <Badge className="bg-orange-100 text-orange-800 text-lg px-4 py-2">Champion</Badge>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="overflow-hidden shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600 mx-auto" />
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{activeMatches.length}</p>
              <p className="text-sm text-gray-600 font-medium">Aktive Spiele</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 mx-auto" />
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{upcomingMatches.length}</p>
              <p className="text-sm text-gray-600 font-medium">Anstehend</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <Target className="h-8 w-8 sm:h-10 sm:w-10 text-green-600 mx-auto" />
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{completedCount}</p>
              <p className="text-sm text-gray-600 font-medium">Abgeschlossen</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeMatches.length > 0 && (
        <motion.div variants={itemVariants} className="mb-8">
          <Card className="overflow-hidden shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
                Live Spiele
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {activeMatches.map((match) => (
                  <div
                    key={match.id}
                    className="border-2 border-orange-500 bg-orange-50 rounded-xl p-4 sm:p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-orange-600 text-white">Match {match.id}</Badge>
                      <Badge variant="outline" className="border-orange-600 text-orange-600">
                        Automat {match.machineNumber}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                        <span className="font-semibold text-gray-900">{match.player1}</span>
                        <span className="text-2xl font-bold text-orange-600">{match.score1}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                        <span className="font-semibold text-gray-900">{match.player2}</span>
                        <span className="text-2xl font-bold text-orange-600">{match.score2}</span>
                      </div>
                    </div>
                    {canEditMatch(match) && !match.winner && (
                      <div className="mt-4 border-t pt-4">
                        <div className="space-y-4">
                          {/* Mobile-first score entry */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Player 1 */}
                            <div className="rounded-xl bg-white/70 border border-orange-200 p-3">
                              <p className="text-xs font-semibold text-gray-700 mb-2 truncate">{match.player1}</p>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-12 w-12 px-0 text-lg"
                                  onClick={() => bumpDraft(match.id, "score1", -1)}
                                  aria-label="Minus"
                                >
                                  −
                                </Button>
                                <Input
                                  className="h-12 text-center text-lg font-bold"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  type="tel"
                                  value={scoreDrafts[match.id]?.score1 ?? String(match.score1 ?? 0)}
                                  onChange={(e) => setDraft(match.id, "score1", e.target.value)}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-12 w-12 px-0 text-lg"
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
                                    className="h-9 px-3"
                                    onClick={() => quickSet(match.id, "score1", v)}
                                  >
                                    {v}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Player 2 */}
                            <div className="rounded-xl bg-white/70 border border-orange-200 p-3">
                              <p className="text-xs font-semibold text-gray-700 mb-2 truncate">{match.player2}</p>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-12 w-12 px-0 text-lg"
                                  onClick={() => bumpDraft(match.id, "score2", -1)}
                                  aria-label="Minus"
                                >
                                  −
                                </Button>
                                <Input
                                  className="h-12 text-center text-lg font-bold"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  type="tel"
                                  value={scoreDrafts[match.id]?.score2 ?? String(match.score2 ?? 0)}
                                  onChange={(e) => setDraft(match.id, "score2", e.target.value)}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-12 w-12 px-0 text-lg"
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
                                    className="h-9 px-3"
                                    onClick={() => quickSet(match.id, "score2", v)}
                                  >
                                    {v}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <Button
                            className="w-full h-12 text-base font-semibold"
                            onClick={() => saveResult(match)}
                            disabled={savingMatchId === match.id}
                          >
                            {savingMatchId === match.id ? "Speichere..." : "Ergebnis speichern"}
                          </Button>

                          <p className="text-[11px] text-gray-500">
                            Tipp: Auf Handy kannst du mit +/− schnell zählen oder mit den Quick-Buttons setzen.
                          </p>
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
        <motion.div variants={itemVariants} className="mb-8">
          <Card className="overflow-hidden shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
                Als Nächstes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingMatches.map((match) => (
                  <div key={match.id} className="border border-gray-200 rounded-xl p-4 sm:p-6 bg-gray-50">
                    <Badge variant="outline" className="mb-4">
                      Match {match.id}
                    </Badge>
                    <div className="space-y-2">
                      <div
                        className={cn(
                          "flex items-center justify-between p-2 rounded text-sm",
                          match.winner === match.player1
                            ? "bg-green-100 border border-green-500 font-bold"
                            : "bg-gray-100",
                        )}
                      >
                        <span className={cn("text-sm", match.winner === match.player1 && "font-bold text-gray-900")}>
                          {match.player1}
                        </span>
                        <span
                          className={cn("text-sm font-semibold", match.winner === match.player1 && "text-green-600")}
                        >
                          {match.score1}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "flex items-center justify-between p-2 rounded text-sm",
                          match.winner === match.player2
                            ? "bg-green-100 border border-green-500 font-bold"
                            : "bg-gray-100",
                        )}
                      >
                        <span className={cn("text-sm", match.winner === match.player2 && "font-bold text-gray-900")}>
                          {match.player2}
                        </span>
                        <span
                          className={cn("text-sm font-semibold", match.winner === match.player2 && "text-green-600")}
                        >
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
        <motion.div variants={itemVariants} className="mb-8">
          <Card className="overflow-hidden shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
                Letzte Ergebnisse
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedMatches.map((match) => (
                  <div key={match.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                    <Badge variant="secondary" className="text-xs mb-3">
                      Match {match.id}
                    </Badge>
                    <div className="space-y-2">
                      <div
                        className={cn(
                          "flex items-center justify-between p-2 rounded text-sm",
                          match.winner === match.player1
                            ? "bg-green-100 border border-green-500 font-bold"
                            : "bg-gray-100",
                        )}
                      >
                        <span className={cn("text-sm", match.winner === match.player1 && "font-bold text-gray-900")}>
                          {match.player1}
                        </span>
                        <span
                          className={cn("text-sm font-semibold", match.winner === match.player1 && "text-green-600")}
                        >
                          {match.score1}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "flex items-center justify-between p-2 rounded text-sm",
                          match.winner === match.player2
                            ? "bg-green-100 border border-green-500 font-bold"
                            : "bg-gray-100",
                        )}
                      >
                        <span className={cn("text-sm", match.winner === match.player2 && "font-bold text-gray-900")}>
                          {match.player2}
                        </span>
                        <span
                          className={cn("text-sm font-semibold", match.winner === match.player2 && "text-green-600")}
                        >
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
        <motion.div variants={itemVariants} className="mb-8">
          <Card className="overflow-hidden shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
                Aktuelle Rangliste
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-2">
                {rankings.map((ranking) => (
                  <div
                    key={`${ranking.placement}-${ranking.player_name}`}
                    className={cn(
                      "flex items-center justify-between p-3 sm:p-4 rounded-lg border transition-all hover:shadow-md",
                      ranking.placement === 1 && "bg-yellow-50 border-yellow-400",
                      ranking.placement === 2 && "bg-gray-100 border-gray-400",
                      ranking.placement === 3 && "bg-orange-50 border-orange-400",
                      ranking.placement > 3 && "bg-gradient-to-r from-gray-50 to-white border-gray-200",
                    )}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-sm sm:text-base font-bold px-2 sm:px-3 py-1",
                            ranking.placement === 1
                              ? "bg-yellow-200 text-yellow-800 border-yellow-400"
                              : ranking.placement === 2
                                ? "bg-gray-200 text-gray-800 border-gray-400"
                                : ranking.placement === 3
                                  ? "bg-orange-100 text-orange-800 border-orange-400"
                                  : "bg-gray-100 text-gray-700 border-gray-300",
                          )}
                        >
                          {ranking.placement === 1
                            ? "🥇"
                            : ranking.placement === 2
                              ? "🥈"
                              : ranking.placement === 3
                                ? "🥉"
                                : `${ranking.placement}.`}
                        </Badge>
                      </div>
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">{ranking.player_name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Platz {ranking.placement}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-900 text-white p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Kompletter Bracket</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-6">
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
                <BracketRound
                  title="Verlierer Runde 3"
                  matches={Object.values(matches).filter((m) => m.id === 12)}
                  isLoser
                />
                <BracketRound
                  title="Verlierer Runde 4"
                  matches={Object.values(matches).filter((m) => m.id === 13)}
                  isLoser
                />

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
                <BracketRound
                  title="Runde 2"
                  matches={Object.values(matches).filter((m) => m.id >= 13 && m.id <= 16)}
                />
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
                <BracketRound
                  title="Runde 3"
                  matches={Object.values(matches).filter((m) => m.id >= 23 && m.id <= 24)}
                />
                <BracketRound
                  title="Verlierer Runde 4"
                  matches={Object.values(matches).filter((m) => m.id >= 25 && m.id <= 26)}
                  isLoser
                />
                <BracketRound title="Halbfinale" matches={Object.values(matches).filter((m) => m.id === 28)} />
                <BracketRound
                  title="Verlierer Runde 5"
                  matches={Object.values(matches).filter((m) => m.id === 27)}
                  isLoser
                />
                <BracketRound
                  title="Verlierer Runde 6"
                  matches={Object.values(matches).filter((m) => m.id === 29)}
                  isLoser
                />
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
                <BracketRound
                  title="Runde 2"
                  matches={Object.values(matches).filter((m) => m.id >= 25 && m.id <= 32)}
                />
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
                <BracketRound
                  title="Runde 3"
                  matches={Object.values(matches).filter((m) => m.id >= 45 && m.id <= 48)}
                />
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
                <BracketRound
                  title="Runde 4"
                  matches={Object.values(matches).filter((m) => m.id >= 55 && m.id <= 56)}
                />
                <BracketRound
                  title="Verlierer Runde 6"
                  matches={Object.values(matches).filter((m) => m.id >= 57 && m.id <= 58)}
                  isLoser
                />
                <BracketRound
                  title="Verlierer Runde 7"
                  matches={Object.values(matches).filter((m) => m.id === 59)}
                  isLoser
                />
                <BracketRound title="Halbfinale" matches={Object.values(matches).filter((m) => m.id === 60)} />
                <BracketRound
                  title="Verlierer Runde 8"
                  matches={Object.values(matches).filter((m) => m.id === 61)}
                  isLoser
                />
                <BracketRound title="Großes Finale" matches={Object.values(matches).filter((m) => m.id === 62)} />
                <BracketRound title="Bracket Reset" matches={Object.values(matches).filter((m) => m.id === 63)} />
              </>
            )}
            {bracketSize === 64 && <>{/* Additional logic for 64-player bracket can be added here */}</>}
          </CardContent>
        </Card>
      </motion.div>

      <div className="text-center text-sm text-gray-600 pt-8 mt-8 border-t border-gray-200">
        <p className="font-medium">Letzte Aktualisierung: {lastUpdate.toLocaleTimeString("de-DE")}</p>
        <p className="mt-2">Aktualisiert sich automatisch in Echtzeit</p>
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
          "text-base sm:text-lg font-bold border-b-2 pb-2",
          isLoser ? "text-red-600 border-red-600" : "text-orange-600 border-orange-600",
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
        "transition-all",
        isActive && "border-2 border-orange-500 shadow-lg",
        isCompleted && "border-gray-200",
        !hasPlayers && "opacity-50 bg-gray-50",
      )}
    >
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            Match {match.id}
          </Badge>
          {isActive && (
            <Badge className="text-xs bg-orange-600">
              <Zap className="h-3 w-3 mr-1" />
              Live
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <div
            className={cn(
              "flex items-center justify-between p-2 rounded text-sm",
              match.winner === match.player1 ? "bg-green-100 border border-green-500 font-bold" : "bg-gray-100",
            )}
          >
            <span className="truncate">{match.player1 || "Warte auf Spieler..."}</span>
            {hasPlayers && <span className="ml-2">{match.score1}</span>}
          </div>
          <div
            className={cn(
              "flex items-center justify-between p-2 rounded text-sm",
              match.winner === match.player2 ? "bg-green-100 border border-green-500 font-bold" : "bg-gray-100",
            )}
          >
            <span className="truncate">{match.player2 || "Warte auf Spieler..."}</span>
            {hasPlayers && <span className="ml-2">{match.score2}</span>}
          </div>
        </div>
      </div>
    </Card>
  )
}
