"use client"

import { SectionSkeleton } from "@/components/loading/loading"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { MemberPlayerCard as PlayerProfileCard } from "@/components/members/member-player-card"
import { TournamentFact, TournamentPageTitle } from "@/components/tournaments/tournament-ui"
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
      <div className="emd-loading-surface min-h-screen bg-muted text-foreground font-sans">
        <Header />
        <main className="container mx-auto p-3 sm:p-4 md:p-8 max-w-7xl"><SectionSkeleton kind="cards" /></main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted text-foreground font-sans">
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
    <div className="min-h-screen bg-muted text-foreground font-sans">
      <Header />
      <main className="et-shell">
        {/* Hero Section for Player Overview */}
        <TournamentPageTitle title="Spieler entdecken" eyebrow="EMD · Spielerverzeichnis" description="Spieler der Competition kennenlernen, Ergebnisse vergleichen und sportliche Profile öffnen." actions={<span className="et-status">{totalPlayersCount} Spieler</span>}/><div className="mb-5 grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card p-4"><TournamentFact label="Alle Spieler">{totalPlayersCount}</TournamentFact><TournamentFact label="Aktive Spieler">{activePlayersCount}</TournamentFact><TournamentFact label="Für Finale qualifiziert">{qualifiedForFinalsCount}</TournamentFact></div>

        <section className="min-w-0">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <Card className="border-0 shadow-xl bg-card ">
              <CardHeader className="border-b border-border pb-6">
                <div className="flex items-center space-x-3">
                  <div className="text-foreground p-2 bg-card   rounded-lg shadow-lg">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-foreground">Alle Spieler</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Klicken Sie auf einen Spieler, um Details anzuzeigen</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    aria-label="Spieler suchen"
                    placeholder="Spieler suchen…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 border-border focus:border-red-500 focus:ring-red-500 bg-muted/50"
                  />
                </div>

                {filteredPlayers.length === 0 ? (
                  <div className="py-12 text-center">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Keine Spieler gefunden</h3>
                    <p className="text-muted-foreground">
                      {searchTerm
                        ? "Versuchen Sie andere Suchkriterien."
                        : "Es sind noch keine Spielerdaten vorhanden."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                          role="button" tabIndex={0}
                          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handlePlayerClick(player) } }}
                          className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer transition hover:border-orange-300/50 focus-visible:outline-orange-300"
                          onClick={() => handlePlayerClick(player)}
                        >
                          <div className="p-4 flex items-center space-x-4">
                            <div className="flex-shrink-0 h-16 w-16 rounded-2xl overflow-hidden border border-orange-300/25 bg-secondary flex items-center justify-center">
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
                                <span aria-hidden="true" className="text-xl font-bold text-orange-300">{player.player_name.split(" ").map(part => part[0]).slice(0, 2).join("")}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-foreground break-words">{player.player_name}</h3>
                              <p className="text-sm text-muted-foreground">Gesamtpunkte: {player.total_points}</p>
                              <p className="text-xs text-muted-foreground">Rang: {playerRank}</p>
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
      <footer className="py-4 sm:py-6 bg-secondary text-muted-foreground text-xs sm:text-sm text-center mt-auto border-t border-border px-4">
        <p>&copy; 2025 Emoj!'s Dartverein e.V. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  )
}
