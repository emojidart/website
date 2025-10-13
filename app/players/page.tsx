"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { PlayerProfileCard } from "@/components/player-profile-card"
import { User, Search, AlertCircle, Users, UserCheck, Trophy } from "lucide-react"
import Image from "next/image"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"

interface PlayerData {
  player_name: string
  placement_points: number
  bonus_points: number
  total_legs_won: number
  total_legs_lost: number
  tournaments_played: number
  total_matches_played: number
  total_matches_won: number
  total_matches_lost: number
  total_points: number
  profile_picture_url?: string
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null)
  const [selectedPlayerRank, setSelectedPlayerRank] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      setLoading(true)

      const { data, error: fetchError } = await supabase
        .from("tournament_series_aggregated")
        .select(
          "player_name, placement_points, bonus_points, total_legs_won, total_legs_lost, tournaments_played, total_matches_played, total_matches_won, total_matches_lost",
        )

      if (fetchError) throw fetchError

      const { data: profileData, error: profileError } = await supabase
        .from("spieldatenbank")
        .select("name, profile_picture_url")

      if (profileError) {
        console.error("Error fetching profile pictures:", profileError)
      }

      const profileMap = new Map<string, string>()
      profileData?.forEach((profile) => {
        if (profile.profile_picture_url) {
          profileMap.set(profile.name.toLowerCase(), profile.profile_picture_url)
        }
      })

      const mappedData =
        data?.map((row: any) => ({
          player_name: row.player_name,
          placement_points: row.placement_points,
          bonus_points: row.bonus_points,
          total_legs_won: row.total_legs_won,
          total_legs_lost: row.total_legs_lost,
          tournaments_played: row.tournaments_played,
          total_matches_played: row.total_matches_played,
          total_matches_won: row.total_matches_won,
          total_matches_lost: row.total_matches_lost,
          total_points: row.placement_points + row.total_legs_won + row.bonus_points,
          profile_picture_url: profileMap.get(row.player_name.toLowerCase()) || undefined, // Add profile picture
        })) || []

      // Sort by total points
      mappedData.sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points
        if (b.total_legs_won !== a.total_legs_won) return b.total_legs_won - a.total_legs_won
        if (b.placement_points !== a.placement_points) return b.placement_points - a.placement_points
        return a.tournaments_played - b.tournaments_played
      })

      setPlayers(mappedData)
    } catch (err) {
      console.error("Error fetching players:", err)
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Spielerdaten")
    } finally {
      setLoading(false)
    }
  }

  const filteredPlayers = players.filter((player) =>
    player.player_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
        <Header />
        <main className="container mx-auto p-3 sm:p-4 md:p-8 max-w-7xl">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Lade Spielerdaten...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
        <Header />
        <main className="container mx-auto p-3 sm:p-4 md:p-8 max-w-7xl">
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
              <div className="text-red-600 text-lg font-semibold mb-2">Fehler beim Laden</div>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const handlePlayerClick = (player: PlayerData) => {
    const rank = players.findIndex((p) => p.player_name === player.player_name) + 1
    setSelectedPlayer(player)
    setSelectedPlayerRank(rank)
  }

  const totalPlayersCount = players.length
  const activePlayersCount = players.filter((p) => p.tournaments_played > 0).length
  const qualifiedForFinalsCount = players.filter((player) => player.tournaments_played >= 10).length

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
      <Header />
      <main className="min-h-[calc(100vh-72px)] flex flex-col">
        {/* Hero Section for Player Overview */}
        <section className="relative bg-gradient-to-br from-red-500 to-red-700 text-white py-16 sm:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-400/10 via-red-600/0 to-red-400/10 animate-pulse-slow pointer-events-none" />
          <div className="container mx-auto p-3 sm:p-4 md:p-8 max-w-7xl relative z-10 text-center">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl sm:text-5xl font-extrabold mb-4 drop-shadow-lg"
            >
              Spielerliste
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg sm:text-xl font-medium mb-10 opacity-90"
            >
              Finde alle Spieler der Competition 2025
            </motion.p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="bg-white/15 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg flex flex-col items-center justify-center"
              >
                <div className="p-3 rounded-full bg-white/20 mb-3">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="text-4xl font-bold mb-1">{totalPlayersCount}</div>
                <div className="text-sm opacity-80">Alle Spieler</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="bg-white/15 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg flex flex-col items-center justify-center"
              >
                <div className="p-3 rounded-full bg-white/20 mb-3">
                  <UserCheck className="h-6 w-6 text-white" />
                </div>
                <div className="text-4xl font-bold mb-1">{activePlayersCount}</div>
                <div className="text-sm opacity-80">Aktive Spieler</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="bg-white/15 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg flex flex-col items-center justify-center"
              >
                <div className="p-3 rounded-full bg-white/20 mb-3">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div className="text-4xl font-bold mb-1">{qualifiedForFinalsCount}</div>
                <div className="text-sm opacity-80">Für Finale qualifiziert</div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="container mx-auto p-3 sm:p-4 md:p-8 max-w-7xl relative z-20 -mt-8 flex-grow">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-gray-100 pb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">Alle Spieler</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Klicken Sie auf einen Spieler, um Details anzuzeigen</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Nach Spielername suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
                  />
                </div>

                {filteredPlayers.length === 0 ? (
                  <div className="py-12 text-center">
                    <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Spieler gefunden</h3>
                    <p className="text-gray-600">
                      {searchTerm
                        ? "Versuchen Sie andere Suchkriterien."
                        : "Es sind noch keine Spielerdaten vorhanden."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredPlayers.map((player) => {
                      const playerRank = players.findIndex((p) => p.player_name === player.player_name) + 1
                      return (
                        <motion.div
                          key={player.player_name}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                          whileHover={{
                            scale: 1.02,
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                          }}
                          className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden cursor-pointer"
                          onClick={() => handlePlayerClick(player)}
                        >
                          <div className="p-4 flex items-center space-x-4">
                            <div className="flex-shrink-0 h-16 w-16 rounded-full overflow-hidden border-2 border-red-500 bg-gray-200 flex items-center justify-center">
                              {player.profile_picture_url ? (
                                <Image
                                  src={player.profile_picture_url || "/placeholder.svg"}
                                  alt={`Profilbild von ${player.player_name}`}
                                  width={64}
                                  height={64}
                                  className="object-cover"
                                  unoptimized={true}
                                />
                              ) : (
                                <Image
                                  src="/placeholder-user.JPG"
                                  alt="Dummy Profilbild"
                                  width={64}
                                  height={64}
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">{player.player_name}</h3>
                              <p className="text-sm text-gray-500">Gesamt Score: {player.total_points}</p>
                              <p className="text-xs text-gray-400">Rang: {playerRank}</p>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Player Profile Dialog */}
          <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
            <DialogContent className="max-w-md max-h-[90vh] p-4 overflow-y-auto rounded-xl">
              <VisuallyHidden.Root>
                <DialogTitle>Spielerprofil von {selectedPlayer?.player_name}</DialogTitle>
                <DialogDescription>Detaillierte Informationen und Statistiken des Spielers.</DialogDescription>
              </VisuallyHidden.Root>
              {selectedPlayer && selectedPlayerRank !== null && (
                <PlayerProfileCard player={selectedPlayer} rank={selectedPlayerRank} className="w-full" />
              )}
            </DialogContent>
          </Dialog>
        </section>
      </main>
      <footer className="py-4 sm:py-6 bg-gray-200 text-gray-600 text-xs sm:text-sm text-center mt-auto border-t border-gray-300 px-4">
        <p>&copy; 2025 Emoj!'s Dartverein e.V. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  )
}
