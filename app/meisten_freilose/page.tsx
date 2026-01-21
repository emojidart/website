"use client" 
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Gift, Trophy, User } from "lucide-react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

interface FreilosStats {
  player_name: string
  freilos_count: number
  total_matches: number
  freilos_percentage: number
  tournaments_played: number
}

export default function FreilosePage() {
  const [freilosStats, setFreilosStats] = useState<FreilosStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFreilosStats()
  }, [])

  const fetchFreilosStats = async () => {
    try {
      const { data: tournamentEntries, error: tournamentsError } = await supabase
        .from("tournament_series_standings")
        .select("tournament_id, player_name")

      if (tournamentsError) throw tournamentsError

      const tournamentIds = [...new Set(tournamentEntries?.map(t => t.tournament_id) || [])]

      if (tournamentIds.length === 0) {
        setFreilosStats([])
        setLoading(false)
        return
      }

      const tournamentsPlayedMap = new Map<string, number>()
      tournamentEntries?.forEach((entry) => {
        const playerName = entry.player_name
        tournamentsPlayedMap.set(playerName, (tournamentsPlayedMap.get(playerName) || 0) + 1)
      })

      const { data: allMatches, error: matchesError } = await supabase
        .from("dko_match_states")
        .select("player1, player2")
        .in("tournament_id", tournamentIds)

      if (matchesError) throw matchesError

      const freilosCount = new Map<string, number>()
      const totalMatches = new Map<string, number>()

      allMatches?.forEach((match) => {
        const player1IsFreilos = match.player1?.toLowerCase().startsWith("freilos")
        const player2IsFreilos = match.player2?.toLowerCase().startsWith("freilos")

        if (player1IsFreilos && match.player2 && !player2IsFreilos) {
          freilosCount.set(match.player2, (freilosCount.get(match.player2) || 0) + 1)
          totalMatches.set(match.player2, (totalMatches.get(match.player2) || 0) + 1)
        } else if (player2IsFreilos && match.player1 && !player1IsFreilos) {
          freilosCount.set(match.player1, (freilosCount.get(match.player1) || 0) + 1)
          totalMatches.set(match.player1, (totalMatches.get(match.player1) || 0) + 1)
        } else if (!player1IsFreilos && !player2IsFreilos && match.player1 && match.player2) {
          totalMatches.set(match.player1, (totalMatches.get(match.player1) || 0) + 1)
          totalMatches.set(match.player2, (totalMatches.get(match.player2) || 0) + 1)
        }
      })

      const stats: FreilosStats[] = Array.from(freilosCount.entries())
        .map(([player_name, freilos_count]) => {
          const total = totalMatches.get(player_name) || freilos_count
          const tournaments_played = tournamentsPlayedMap.get(player_name) || 0
          const percentage = tournaments_played > 0 ? (freilos_count / tournaments_played) * 100 : 0
          return {
            player_name,
            freilos_count,
            total_matches: total,
            freilos_percentage: Math.round(percentage * 10) / 10,
            tournaments_played,
          }
        })
        .sort((a, b) => b.freilos_count - a.freilos_count)

      setFreilosStats(stats)
    } catch (error) {
      console.error("Error fetching freilos stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
        <Header />
        <main className="container mx-auto p-3 sm:p-4 md:p-8 max-w-4xl">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                <h2 className="text-lg sm:text-2xl font-bold text-white">Freilos-Statistik</h2>
              </div>
            </div>
            <div className="p-6 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-sm sm:text-base text-gray-600">Lade Daten...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const totalFreilose = freilosStats.reduce((sum, stat) => sum + stat.freilos_count, 0)
  const totalMatches = freilosStats.reduce((sum, stat) => sum + stat.total_matches, 0)
  const totalTournaments = freilosStats.reduce((sum, stat) => sum + stat.tournaments_played, 0)

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
      <Header />

      <main className="container mx-auto p-3 sm:p-4 md:p-8 max-w-4xl space-y-6 pb-24">
        <div className="bg-gradient-to-br from-pink-50 via-red-50 to-pink-50 rounded-2xl shadow-2xl border-2 border-red-200 overflow-hidden">
          <div className="text-center pt-6 pb-4 px-4">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 shadow-xl">
                <Gift className="h-10 w-10 text-white" />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3">
              <span className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 bg-clip-text text-transparent">
                FREILOS-STATISTIK
              </span>
            </h1>

            <p className="text-xl sm:text-2xl font-semibold text-gray-700 mb-2">Lion Cup</p>
            <p className="text-sm sm:text-base text-gray-500">Wer bekommt die meisten Freilose?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col">
              <h2 className="text-sm sm:text-base font-semibold text-gray-600 mb-2">Gesamt Freilose</h2>
              <div className="flex items-center gap-2">
                <Gift className="h-6 w-6 text-red-600" />
                <span className="text-3xl sm:text-4xl font-black text-red-600">{totalFreilose}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col">
              <h2 className="text-sm sm:text-base font-semibold text-gray-600 mb-2">Gesamt Antritte</h2>
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-purple-600" />
                <span className="text-3xl sm:text-4xl font-black text-purple-600">{totalTournaments}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              <h2 className="text-lg sm:text-2xl font-bold text-white">Freilos-Rangliste</h2>
            </div>
          </div>

          <div className="bg-blue-50 border-b border-blue-100 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-blue-800">
              <span className="font-semibold">Hinweis:</span> Zeigt die durchschnittliche Anzahl an Freilosen pro Antritt. Ein Spieler kann pro Turnier auch mehrere Freilose bekommen.
            </div>
          </div>

          <div className="p-4 space-y-3">
            {freilosStats.length > 0 ? (
              freilosStats.map((stat, index) => (
                <div
                  key={stat.player_name}
                  className={`bg-white rounded-lg shadow-md border-2 p-4 transition-all duration-300 hover:shadow-lg ${
                    index === 0
                      ? "border-yellow-400 bg-gradient-to-r from-yellow-50 to-white"
                      : index === 1
                      ? "border-gray-400 bg-gradient-to-r from-gray-50 to-white"
                      : index === 2
                      ? "border-amber-400 bg-gradient-to-r from-amber-50 to-white"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full font-bold text-lg flex-shrink-0 ${
                          index === 0
                            ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white"
                            : index === 1
                            ? "bg-gradient-to-r from-gray-300 to-gray-500 text-white"
                            : index === 2
                            ? "bg-gradient-to-r from-amber-400 to-amber-600 text-white"
                            : "bg-gray-100 text-gray-700 border-2 border-gray-300"
                        }`}
                      >
                        {index + 1}
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-gray-600 flex-shrink-0" />
                          <span className="text-base sm:text-lg font-bold text-gray-900 truncate">
                            {stat.player_name}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 ml-7">
                          {stat.tournaments_played} {stat.tournaments_played === 1 ? 'Antritt' : 'Antritte'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-red-600" />
                        <span className="text-2xl sm:text-3xl font-black text-red-600">
                          {stat.freilos_count}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-gray-600">
                        Ø {(stat.freilos_count / stat.tournaments_played).toFixed(2)} pro Antritt
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-600">
                <Gift className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Keine Freilose gefunden</p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 text-center">
              Gesamt: {freilosStats.length} Spieler mit Freilosen
            </div>
          </div>
        </div>
      </main>

      <footer className="py-4 sm:py-6 bg-gray-200 text-gray-600 text-xs sm:text-sm text-center mt-8 border-t border-gray-300 px-4">
        <p>&copy; 2025 Emoj!'s Dartverein e.V. Alle Rechte vorbehalten.</p>
      </footer>

      <MobileBottomNav />
    </div>
  )
}
