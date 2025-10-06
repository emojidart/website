"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { Trophy, Zap, Clock, Target, RefreshCcw } from "lucide-react"

interface Match {
  id: number
  player1: string
  player2: string
  score1: number
  score2: number
  winner?: string
  loser?: string
  machineNumber?: number
}

interface ActiveTournament {
  tournament_id: string
  tournament_type: string
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

  useEffect(() => {
    const loadActiveTournament = async () => {
      try {
        const { data, error } = await supabase
          .from("tournaments_status")
          .select("tournament_id, tournament_type")
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
              })
              setLoading(false)
            } else if (data.status === "cancelled" || data.status === "completed") {
              setActiveTournament(null)
              setMatches({})
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
  }, []) // Removed activeTournament dependency to prevent subscription recreation

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
        console.error("Error loading matches:", error)
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

  const tournamentWinner = matches[31]?.winner || matches[30]?.winner
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
            <span className="block text-white">DKO TOURNAMENT</span>
            <span className="block text-orange-200">Live Bracket</span>
          </h2>
          <p className="text-sm sm:text-lg md:text-xl font-bold uppercase text-orange-100 mb-2 sm:mb-4">
            {activeTournament.tournament_type.replace("_", " ").toUpperCase()}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm sm:text-base font-semibold text-white">LIVE</span>
          </div>
        </div>
      </motion.div>

      {tournamentWinner ? (
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
                <Zap className="h-8 w-8 text-orange-600 mx-auto" />
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{activeMatches.length}</p>
              <p className="text-sm text-gray-600 font-medium">Aktive Spiele</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <Clock className="h-8 w-8 text-blue-600 mx-auto" />
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{upcomingMatches.length}</p>
              <p className="text-sm text-gray-600 font-medium">Anstehend</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <Target className="h-8 w-8 text-green-600 mx-auto" />
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
              <div className="grid md:grid-cols-2 gap-4">
                {upcomingMatches.map((match) => (
                  <div key={match.id} className="border border-gray-200 rounded-xl p-4 sm:p-6 bg-gray-50">
                    <Badge variant="outline" className="mb-4">
                      Match {match.id}
                    </Badge>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <span className="font-medium text-gray-900">{match.player1}</span>
                      </div>
                      <div className="text-center text-xs text-gray-500 font-semibold">VS</div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <span className="font-medium text-gray-900">{match.player2}</span>
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
                    <Badge variant="secondary" className="mb-3 text-xs">
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

      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-900 text-white p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Kompletter Bracket</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-6">
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
            <BracketRound title="Runde 3" matches={Object.values(matches).filter((m) => m.id >= 23 && m.id <= 24)} />
            <BracketRound title="Finale" matches={Object.values(matches).filter((m) => m.id >= 28 && m.id <= 31)} />
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
