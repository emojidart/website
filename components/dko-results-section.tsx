"use client"

import { useState, useEffect } from "react"
import { Trophy, Calendar, Users, Medal, ChevronDown, ChevronUp } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface TournamentResult {
  tournament_id: string
  tournament_name: string
  tournament_type: string
  tournament_date: string
  player_count: number
  rankings: {
    player_name: string
    placement: number
    legs_won: number
    legs_lost: number
  }[]
}

export default function DKOResultsSection() {
  const [tournaments, setTournaments] = useState<TournamentResult[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null)

  useEffect(() => {
    fetchTournamentResults()
  }, [])

  const fetchTournamentResults = async () => {
    try {
      const { data: completedTournaments, error: statusError } = await supabase
        .from("tournaments_status")
        .select("tournament_id, tournament_name, tournament_type, created_at")
        .eq("status", "completed")
        .order("created_at", { ascending: false })

      if (statusError) throw statusError

      if (!completedTournaments || completedTournaments.length === 0) {
        setTournaments([])
        setLoading(false)
        return
      }

      const completedTournamentIds = completedTournaments.map((t) => t.tournament_id)

      const { data: rankingsData, error: rankingsError } = await supabase
        .from("dko_rankings")
        .select("*")
        .in("tournament_id", completedTournamentIds)
        .order("created_at", { ascending: false })

      if (rankingsError) throw rankingsError

      const { data: matchStatesData, error: matchStatesError } = await supabase
        .from("dko_match_states")
        .select("*")
        .in("tournament_id", completedTournamentIds)

      if (matchStatesError) throw matchStatesError

      const tournamentMap = new Map<string, TournamentResult>()

      completedTournaments.forEach((tournament) => {
        tournamentMap.set(tournament.tournament_id, {
          tournament_id: tournament.tournament_id,
          tournament_name: tournament.tournament_name || `Turnier ${tournament.tournament_id.slice(0, 8)}`,
          tournament_type: tournament.tournament_type,
          tournament_date: tournament.created_at,
          player_count: 0,
          rankings: [],
        })
      })

      rankingsData?.forEach((ranking) => {
        const key = ranking.tournament_id || "unknown"
        const tournament = tournamentMap.get(key)

        if (!tournament) return

        const playerMatches = matchStatesData?.filter(
          (match) =>
            match.tournament_id === ranking.tournament_id &&
            (match.player1 === ranking.player_name || match.player2 === ranking.player_name),
        )

        let legsWon = 0
        let legsLost = 0

        playerMatches?.forEach((match) => {
          if (match.player1 === ranking.player_name) {
            legsWon += match.score1 || 0
            legsLost += match.score2 || 0
          } else if (match.player2 === ranking.player_name) {
            legsWon += match.score2 || 0
            legsLost += match.score1 || 0
          }
        })

        tournament.rankings.push({
          player_name: ranking.player_name,
          placement: ranking.placement,
          legs_won: legsWon,
          legs_lost: legsLost,
        })
        tournament.player_count = tournament.rankings.length
      })

      const tournamentsArray = Array.from(tournamentMap.values())
      tournamentsArray.forEach((tournament) => {
        tournament.rankings.sort((a, b) => a.placement - b.placement)
      })

      setTournaments(tournamentsArray)
    } catch (error) {
      console.error("Fehler beim Laden der DKO Turnierergebnisse:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTournamentTypeLabel = (type: string) => {
    if (type.includes("16")) return "16er DKO"
    if (type.includes("8")) return "8er DKO"
    if (type.includes("32")) return "32er DKO"
    if (type.includes("64")) return "64er DKO"
    return type
  }

  const getPlacementColor = (placement: number) => {
    if (placement === 1) return "bg-yellow-500 text-white"
    if (placement === 2) return "bg-gray-400 text-white"
    if (placement === 3) return "bg-orange-600 text-white"
    return "bg-gray-200 text-gray-700"
  }

  const getPlacementIcon = (placement: number) => {
    if (placement === 1) return "🥇"
    if (placement === 2) return "🥈"
    if (placement === 3) return "🥉"
    return null
  }

  return (
    <div>
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Lade DKO Turnierergebnisse...</p>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Noch keine DKO Turniere gespielt</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((tournament, index) => (
            <div
              key={index}
              className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-orange-500 transition-colors"
            >
              {/* Tournament Header */}
              <button
                onClick={() =>
                  setExpandedTournament(
                    expandedTournament === tournament.tournament_name ? null : tournament.tournament_name,
                  )
                }
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-orange-500 text-white rounded-full font-bold">
                    {index + 1}
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-gray-900">{tournament.tournament_name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Medal className="w-4 h-4" />
                        {getTournamentTypeLabel(tournament.tournament_type)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {tournament.player_count} Spieler
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(tournament.tournament_date)}
                      </span>
                    </div>
                  </div>
                </div>
                {expandedTournament === tournament.tournament_name ? (
                  <ChevronUp className="w-6 h-6 text-gray-400" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-gray-400" />
                )}
              </button>

              {/* Tournament Rankings */}
              {expandedTournament === tournament.tournament_name && (
                <div className="border-t-2 border-gray-200 p-6 bg-gray-50">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Platzierungen</h4>
                  <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-[80px_1fr_100px_100px] gap-4 p-4 bg-gray-100 border-b-2 border-gray-200 font-bold text-sm text-gray-700">
                      <div className="text-center">Platz</div>
                      <div>Spieler</div>
                      <div className="text-center">Legs W</div>
                      <div className="text-center">Legs L</div>
                    </div>
                    {/* Table Rows */}
                    <div className="divide-y-2 divide-gray-200">
                      {tournament.rankings.map((ranking, rankIndex) => (
                        <div
                          key={rankIndex}
                          className="grid grid-cols-[80px_1fr_100px_100px] gap-4 p-4 items-center hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-center">
                            <div
                              className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${getPlacementColor(ranking.placement)}`}
                            >
                              {getPlacementIcon(ranking.placement) || ranking.placement}
                            </div>
                          </div>
                          <div className="font-medium text-gray-900">{ranking.player_name}</div>
                          <div className="text-center text-green-600 font-bold text-lg">{ranking.legs_won}</div>
                          <div className="text-center text-red-600 font-bold text-lg">{ranking.legs_lost}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
