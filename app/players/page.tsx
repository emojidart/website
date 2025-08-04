"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Header } from "@/components/header"
import { useDartData } from "@/hooks/use-dart-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { PlayerProfileCard } from "@/components/player-profile-card"
import { User, Search, AlertCircle, Users, UserCheck, UserX, Trophy } from "lucide-react"
import Image from "next/image"
import type { CombinedPlayerData } from "@/hooks/use-dart-data"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden" // Import VisuallyHidden

export default function PlayersPage() {
  const { combinedPlayers, loading, error } = useDartData()
  const [selectedPlayer, setSelectedPlayer] = useState<CombinedPlayerData | null>(null)
  const [selectedPlayerRank, setSelectedPlayerRank] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Sort combinedPlayers once to get the global ranking
  const sortedCombinedPlayers = [...combinedPlayers].sort((a, b) => b.combinedScore - a.combinedScore)

  const filteredPlayers = sortedCombinedPlayers.filter((player) =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()),
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

  const handlePlayerClick = (player: CombinedPlayerData) => {
    // Find the rank of the clicked player in the globally sorted list
    const rank = sortedCombinedPlayers.findIndex((p) => p.name === player.name) + 1
    setSelectedPlayer(player)
    setSelectedPlayerRank(rank)
  }

  // Calculate overall stats for the hero section
  const totalPlayersCount = combinedPlayers.length
  const activePlayersCount = combinedPlayers.filter((p) => !p.is_blocked).length // Assuming is_blocked exists
  const blockedPlayersCount = combinedPlayers.filter((p) => p.is_blocked).length // Assuming is_blocked exists
  const qualifiedForFinalsCount = combinedPlayers.filter((player) => player.totalParticipations >= 10).length

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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                transition={{ duration: 0.3, delay: 0.4 }}
                className="bg-white/15 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg flex flex-col items-center justify-center"
              >
                <div className="p-3 rounded-full bg-white/20 mb-3">
                  <UserX className="h-6 w-6 text-white" />
                </div>
                <div className="text-4xl font-bold mb-1">{blockedPlayersCount}</div>
                <div className="text-sm opacity-80">Gesperrte Spieler</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="bg-white/15 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg flex flex-col items-center justify-center"
              >
                <div className="p-3 rounded-full bg-white/20 mb-3">
                  <Trophy className="h-6 w-6 text-white" /> {/* Changed icon to Trophy */}
                </div>
                <div className="text-4xl font-bold mb-1">{qualifiedForFinalsCount}</div>
                <div className="text-sm opacity-80">Für Finale qualifiziert</div> {/* Changed text */}
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
                      // Find the rank of the current player in the globally sorted list
                      const playerRank = sortedCombinedPlayers.findIndex((p) => p.name === player.name) + 1
                      return (
                        <motion.div
                          key={player.name}
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
                                  alt={`Profilbild von ${player.name}`}
                                  width={64}
                                  height={64}
                                  className="object-cover"
                                  unoptimized={true}
                                />
                              ) : (
                                <span className="text-3xl font-bold text-gray-600">
                                  {player.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">{player.name}</h3>
                              <p className="text-sm text-gray-500">Gesamt Score: {player.combinedScore}</p>
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
              {" "}
              {/* Changed p-0 to p-4 */}
              <VisuallyHidden.Root>
                <DialogTitle>Spielerprofil von {selectedPlayer?.name}</DialogTitle>
                <DialogDescription>Detaillierte Informationen und Statistiken des Spielers.</DialogDescription>
              </VisuallyHidden.Root>
              {selectedPlayer && selectedPlayerRank !== null && (
                <PlayerProfileCard player={selectedPlayer} rank={selectedPlayerRank} className="w-full" />
              )}
              {/* Removed the custom close button, relying on shadcn's default */}
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
