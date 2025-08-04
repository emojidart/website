"use client"

import { motion, AnimatePresence } from "framer-motion" // AnimatePresence für Exit-Animationen
import {
  Users,
  Hand,
  Calendar,
  MapPin,
  Heart,
  Target,
  TrendingUp,
  Trophy,
  DotIcon as Darts,
  ArrowLeft,
  ArrowRight,
  Crown,
  ShieldCheck,
  X,
} from "lucide-react"
import { CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button" // Button für "Zurück"
import Image from "next/image" // Importiere Next.js Image Komponente
import { supabase } from "@/lib/supabase" // Importiere Supabase
import { format } from "date-fns"
import { de } from "date-fns/locale" // Für deutsche Datumsformatierung
import { Loader2, AlertCircle } from "lucide-react" // Neue Icons
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table" // Table Komponenten
import { cn } from "@/lib/utils" // Für bedingte Klassen
import { Badge } from "@/components/ui/badge" // Importiere Badge Komponente
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog" // Import Dialog components

// Typdefinitionen für die Daten
interface ClubPlayer {
  id: string
  name: string
  photo_url: string | null
  throwing_hand: string | null
  age: number | null
  origin: string | null
  role?: string | null // NEW: Optional role for players in a team context
}

interface Team {
  id: string
  name: string
  logo_url: string | null // NEU: Logo URL für Teams
  players: ClubPlayer[] // TeamsWithPlayers hat bereits die Spieler zugeordnet
}

interface ClubPageContentProps {
  clubPlayers: ClubPlayer[]
  teamsWithPlayers: Team[]
}

interface PlayerMovement {
  id: string
  player_id: string
  team_id: string // This is the to_team_id
  from_team_id: string | null // New: The team the player came from
  movement_type: "new_addition" | "transfer"
  movement_date: string // ISO string from Supabase
  user_id: string
  club_players: { name: string } | null
  teams: { id: string; name: string } | null
  from_teams: { id: string; name: string } | null
}

// Framer Motion Varianten
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 90, damping: 10 } },
}

const playerGridVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  exit: { opacity: 0, y: 20, transition: { duration: 0.3, ease: "easeIn" } },
}

// Helper function for role translation
const getTranslatedRole = (role: string | null | undefined) => {
  switch (role) {
    case "Captain":
      return "Kapitän"
    case "Co-Captain":
      return "Co-Kapitän"
    default:
      return role
  }
}

export function ClubPageContent({ clubPlayers, teamsWithPlayers }: ClubPageContentProps) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<ClubPlayer | null>(null) // New state for selected player
  const [movements, setMovements] = useState<PlayerMovement[]>([])
  const [movementsLoading, setMovementsLoading] = useState(true)
  const [movementsError, setMovementsError] = useState<string | null>(null)
  const [activeMovementTab, setActiveMovementTab] = useState<"all" | "new_addition" | "transfer">("all")

  useEffect(() => {
    fetchPlayerMovements()
  }, [])

  const fetchPlayerMovements = async () => {
    setMovementsLoading(true)
    setMovementsError(null)
    const { data, error } = await supabase
      .from("player_movements")
      .select(
        `
    id,
    movement_type,
    movement_date,
    club_players(name),
    teams!player_movements_team_id_fkey(id, name),
    from_teams:teams!player_movements_from_team_id_fkey(id, name)
  `,
      )
      .order("movement_date", { ascending: false })

    if (error) {
      console.error("Error fetching player movements:", error)
      setMovementsError("Fehler beim Laden der Spielerbewegungen.")
    } else {
      setMovements(data as PlayerMovement[])
    }
    setMovementsLoading(false)
  }

  const handleTeamClick = (team: Team) => {
    setSelectedTeam(team)
  }

  const handleBackToTeams = () => {
    setSelectedTeam(null)
  }

  const filteredMovements = movements.filter((movement) => {
    if (activeMovementTab === "all") {
      return true
    }
    return movement.movement_type === activeMovementTab
  })

  return (
    <motion.div
      className="container mx-auto px-4 md:px-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.section variants={itemVariants} className="text-center mb-16">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 md:p-12 mb-8">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold uppercase leading-none tracking-tighter mb-6">
            <span className="block text-orange-600">UNSER</span>
            <span className="block text-gray-900">DARTVEREIN</span>
            <span className="block text-yellow-600">EMOJIS</span>
          </h1>
          <p className="text-lg md:text-xl font-bold uppercase text-gray-600 mb-8">
            Leidenschaft, Gemeinschaft, Erfolg
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-base font-bold">
            <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-lg border border-orange-100">
              <Users className="h-5 w-5 text-orange-600" />
              <span> {clubPlayers.length} aktive Spieler</span>
            </div>
            <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-100">
              <MapPin className="h-5 w-5 text-yellow-600" />
              <span>PFEIL-OK SALZBURG</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* New "Why Join Us" Section */}
      <motion.section variants={itemVariants} className="mb-16">
        <h2 className="text-3xl md:text-4xl font-extrabold uppercase text-center mb-10 text-gray-900">
          Warum uns beitreten?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <motion.div
            variants={cardVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 text-center flex flex-col items-center hover:shadow-2xl transition-shadow duration-300"
          >
            <div className="bg-orange-100 rounded-full p-4 mb-4">
              <Heart className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Starke Gemeinschaft</h3>
            <p className="text-sm text-gray-600">
              Werde Teil einer unterstützenden und freundlichen Dart-Familie, in der Spaß und Zusammenhalt
              großgeschrieben werden.
            </p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 text-center flex flex-col items-center hover:shadow-2xl transition-shadow duration-300"
          >
            <div className="bg-yellow-100 rounded-full p-4 mb-4">
              <Target className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Leidenschaft für Darts</h3>
            <p className className="text-sm text-gray-600">
              Egal ob Anfänger oder Profi, teile deine Begeisterung für den Dartsport und verbessere dein Spiel.
            </p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 text-center flex flex-col items-center hover:shadow-2xl transition-shadow duration-300"
          >
            <div className="bg-red-100 rounded-full p-4 mb-4">
              <TrendingUp className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Persönliche Entwicklung</h3>
            <p className="text-sm text-gray-600">
              Profitiere von regelmäßigen Trainings und der Möglichkeit, dein Können stetig zu verbessern.
            </p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 text-center flex flex-col items-center hover:shadow-2xl transition-shadow duration-300"
          >
            <div className="bg-blue-100 rounded-full p-4 mb-4">
              <Trophy className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Spannende Turniere</h3>
            <p className="text-sm text-gray-600">
              Nimm an internen Ligen und regionalen Turnieren teil, um dich mit anderen zu messen.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Teams Section - Revamped with Team Spotlight */}
      <motion.section variants={itemVariants} className="mb-16">
        <h2 className="text-3xl md:text-4xl font-extrabold uppercase text-center mb-10 text-gray-900">
          Unsere Mannschaften
        </h2>

        <AnimatePresence mode="wait">
          {selectedTeam ? (
            <motion.div
              key="selected-team-players"
              variants={playerGridVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 md:p-12"
            >
              <Button
                variant="ghost"
                onClick={handleBackToTeams}
                className="mb-6 text-gray-600 hover:text-red-600 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück zu den Mannschaften
              </Button>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
                Spieler von {selectedTeam.name}
              </h3>
              {selectedTeam.players.length === 0 ? (
                <p className="text-center text-lg text-gray-600">Diese Mannschaft hat noch keine Spieler.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedTeam.players.map((player) => (
                    <Dialog key={player.id} onOpenChange={(open) => !open && setSelectedPlayer(null)}>
                      <DialogTrigger asChild>
                        <motion.div
                          variants={cardVariants}
                          className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-center flex flex-col items-center shadow-sm cursor-pointer hover:shadow-md transition-shadow duration-200"
                          onClick={() => setSelectedPlayer(player)}
                        >
                          <Avatar className="h-20 w-20 mb-3 border-2 border-orange-400">
                            <AvatarImage
                              src={
                                player.photo_url || "/placeholder.svg?height=80&width=80&query=darts-player-silhouette"
                              }
                            />
                            <AvatarFallback className="text-3xl font-bold bg-orange-100 text-orange-700">
                              {player.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <h4 className="font-semibold text-gray-900 text-lg mb-1 flex items-center justify-center gap-1">
                            {player.name}
                            {player.role === "Captain" && (
                              <Crown className="h-4 w-4 text-yellow-600 ml-1" title="Kapitän" />
                            )}
                            {player.role === "Co-Captain" && (
                              <ShieldCheck className="h-4 w-4 text-blue-600 ml-1" title="Co-Kapitän" />
                            )}
                          </h4>
                          {player.role && (
                            <p className="text-xs text-gray-500 mb-2">({getTranslatedRole(player.role)})</p>
                          )}
                          <div className="text-xs text-gray-600 space-y-1">
                            {player.throwing_hand && (
                              <p className="flex items-center justify-center gap-1">
                                <Hand className="h-3 w-3 text-orange-500" />
                                <span>Wurfhand: {player.throwing_hand}</span>
                              </p>
                            )}
                            {player.age && (
                              <p className="flex items-center justify-center gap-1">
                                <Calendar className="h-3 w-3 text-orange-500" />
                                <span>Alter: {player.age}</span>
                              </p>
                            )}
                            {player.origin && (
                              <p className="flex items-center justify-center gap-1">
                                <MapPin className="h-3 w-3 text-orange-500" />
                                <span>Herkunft: {player.origin}</span>
                              </p>
                            )}
                          </div>
                        </motion.div>
                      </DialogTrigger>
                      {selectedPlayer && (
                        <DialogContent className="sm:max-w-[425px] p-6 bg-white rounded-lg shadow-xl [&>button]:hidden">
                          <DialogHeader className="relative pb-4 border-b border-gray-200">
                            <DialogTitle className="text-2xl font-bold text-gray-900 text-center">
                              {selectedPlayer.name}
                            </DialogTitle>
                            <DialogDescription className="text-center text-gray-600">
                              Details zum Spieler
                            </DialogDescription>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 text-gray-500 hover:bg-gray-100"
                              onClick={() => setSelectedPlayer(null)}
                            >
                              <X className="h-5 w-5" />
                              <span className="sr-only">Schließen</span>
                            </Button>
                          </DialogHeader>
                          <div className="flex flex-col items-center py-6">
                            <Avatar className="h-32 w-32 mb-6 border-4 border-orange-500 shadow-lg">
                              <AvatarImage
                                src={
                                  selectedPlayer.photo_url ||
                                  "/placeholder.svg?height=128&width=128&query=darts-player-silhouette-large" ||
                                  "/placeholder.svg"
                                }
                              />
                              <AvatarFallback className="text-5xl font-bold bg-orange-100 text-orange-700">
                                {selectedPlayer.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="grid gap-3 text-center text-gray-700">
                              {selectedPlayer.role && (
                                <p className="text-lg font-semibold flex items-center justify-center gap-2">
                                  {selectedPlayer.role === "Captain" && <Crown className="h-5 w-5 text-yellow-600" />}
                                  {selectedPlayer.role === "Co-Captain" && (
                                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                                  )}
                                  {getTranslatedRole(selectedPlayer.role)}
                                </p>
                              )}
                              {selectedPlayer.throwing_hand && (
                                <p className="flex items-center justify-center gap-2">
                                  <Hand className="h-5 w-5 text-orange-500" />
                                  <span>Wurfhand: {selectedPlayer.throwing_hand}</span>
                                </p>
                              )}
                              {selectedPlayer.age && (
                                <p className="flex items-center justify-center gap-2">
                                  <Calendar className="h-5 w-5 text-orange-500" />
                                  <span>Alter: {selectedPlayer.age}</span>
                                </p>
                              )}
                              {selectedPlayer.origin && (
                                <p className="flex items-center justify-center gap-2">
                                  <MapPin className="h-5 w-5 text-orange-500" />
                                  <span>Herkunft: {selectedPlayer.origin}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      )}
                    </Dialog>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="team-overview"
              variants={playerGridVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {teamsWithPlayers.length === 0 ? (
                <p className="text-center text-lg text-gray-600 col-span-full">
                  Aktuell sind keine Mannschaften registriert.
                </p>
              ) : (
                teamsWithPlayers.map((team) => (
                  <motion.div
                    key={team.id}
                    variants={cardVariants}
                    className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-2xl transition-shadow duration-300"
                    onClick={() => handleTeamClick(team)}
                  >
                    {team.logo_url ? (
                      <div className="relative w-24 h-24 mb-4 rounded-full overflow-hidden border-4 border-red-600 shadow-md">
                        <Image
                          src={team.logo_url || "/placeholder.svg"}
                          alt={`${team.name} Logo`}
                          fill
                          style={{ objectFit: "cover" }}
                          className="rounded-full"
                        />
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-full p-4 mb-4 shadow-lg">
                        <Darts className="h-10 w-10 text-white" />
                      </div>
                    )}
                    <CardTitle className="text-2xl font-extrabold text-gray-900 uppercase tracking-wide mb-2">
                      {team.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600">{team.players.length} Spieler</p>
                    <Button variant="link" className="mt-4 text-red-600 hover:text-red-700">
                      Details anzeigen
                    </Button>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Alle Spieler Section */}
      <motion.section variants={itemVariants} className="mb-16">
        <h2 className="text-3xl md:text-4xl font-extrabold uppercase text-center mb-10 text-gray-900">Alle Spieler</h2>
        {clubPlayers.length === 0 ? (
          <p className="text-center text-lg text-gray-600">Aktuell sind keine Spieler registriert.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {clubPlayers.map((player, index) => (
              <Dialog key={player.id} onOpenChange={(open) => !open && setSelectedPlayer(null)}>
                <DialogTrigger asChild>
                  <motion.div
                    variants={cardVariants}
                    className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 text-center flex flex-col items-center cursor-pointer hover:shadow-2xl transition-shadow duration-300"
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <Avatar className="h-24 w-24 mb-4 border-4 border-orange-500 shadow-md">
                      <AvatarImage
                        src={player.photo_url || "/placeholder.svg?height=96&width=96&query=darts-player-silhouette"}
                      />
                      <AvatarFallback className="text-4xl font-bold bg-orange-100 text-orange-700">
                        {player.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{player.name}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      {player.throwing_hand && (
                        <p className="flex items-center justify-center gap-1">
                          <Hand className="h-4 w-4 text-orange-500" />
                          <span>Wurfhand: {player.throwing_hand}</span>
                        </p>
                      )}
                      {player.age && (
                        <p className="flex items-center justify-center gap-1">
                          <Calendar className="h-4 w-4 text-orange-500" />
                          <span>Alter: {player.age}</span>
                        </p>
                      )}
                      {player.origin && (
                        <p className="flex items-center justify-center gap-1">
                          <MapPin className="h-4 w-4 text-orange-500" />
                          <span>Herkunft: {player.origin}</span>
                        </p>
                      )}
                    </div>
                  </motion.div>
                </DialogTrigger>
                {selectedPlayer && (
                  <DialogContent className="sm:max-w-[425px] p-6 bg-white rounded-lg shadow-xl [&>button]:hidden">
                    <DialogHeader className="relative pb-4 border-b border-gray-200">
                      <DialogTitle className="text-2xl font-bold text-gray-900 text-center">
                        {selectedPlayer.name}
                      </DialogTitle>
                      <DialogDescription className="text-center text-gray-600">Details zum Spieler</DialogDescription>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 text-gray-500 hover:bg-gray-100"
                        onClick={() => setSelectedPlayer(null)}
                      >
                        <X className="h-5 w-5" />
                        <span className="sr-only">Schließen</span>
                      </Button>
                    </DialogHeader>
                    <div className="flex flex-col items-center py-6">
                      <Avatar className="h-32 w-32 mb-6 border-4 border-orange-500 shadow-lg">
                        <AvatarImage
                          src={
                            selectedPlayer.photo_url ||
                            "/placeholder.svg?height=128&width=128&query=darts-player-silhouette-large" ||
                            "/placeholder.svg" ||
                            "/placeholder.svg"
                          }
                        />
                        <AvatarFallback className="text-5xl font-bold bg-orange-100 text-orange-700">
                          {selectedPlayer.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid gap-3 text-center text-gray-700">
                        {selectedPlayer.role && (
                          <p className="text-lg font-semibold flex items-center justify-center gap-2">
                            {selectedPlayer.role === "Captain" && <Crown className="h-5 w-5 text-yellow-600" />}
                            {selectedPlayer.role === "Co-Captain" && <ShieldCheck className="h-5 w-5 text-blue-600" />}
                            {getTranslatedRole(selectedPlayer.role)}
                          </p>
                        )}
                        {selectedPlayer.throwing_hand && (
                          <p className="flex items-center justify-center gap-2">
                            <Hand className="h-5 w-5 text-orange-500" />
                            <span>Wurfhand: {selectedPlayer.throwing_hand}</span>
                          </p>
                        )}
                        {selectedPlayer.age && (
                          <p className="flex items-center justify-center gap-2">
                            <Calendar className="h-5 w-5 text-orange-500" />
                            <span>Alter: {selectedPlayer.age}</span>
                          </p>
                        )}
                        {selectedPlayer.origin && (
                          <p className="flex items-center justify-center gap-2">
                            <MapPin className="h-5 w-5 text-orange-500" />
                            <span>Herkunft: {selectedPlayer.origin}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                )}
              </Dialog>
            ))}
          </div>
        )}
      </motion.section>

      {/* NEU: Player Movements Section mit Tabs */}
      <motion.section variants={itemVariants} className="mb-16">
        <h2 className="text-3xl md:text-4xl font-extrabold uppercase text-center mb-10 text-gray-900">
          Spielerbewegungen
        </h2>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 md:p-12">
          {/* Tabs für Filterung */}
          <div className="flex justify-center mb-6 space-x-4">
            <Button
              onClick={() => setActiveMovementTab("all")}
              className={cn(
                "px-4 py-2 rounded-lg font-semibold transition-all duration-200",
                activeMovementTab === "all"
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-100",
              )}
            >
              Alle Bewegungen
            </Button>
            <Button
              onClick={() => setActiveMovementTab("new_addition")}
              className={cn(
                "px-4 py-2 rounded-lg font-semibold transition-all duration-200",
                activeMovementTab === "new_addition"
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-100",
              )}
            >
              Neuzugänge
            </Button>
            <Button
              onClick={() => setActiveMovementTab("transfer")}
              className={cn(
                "px-4 py-2 rounded-lg font-semibold transition-all duration-200",
                activeMovementTab === "transfer"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-100",
              )}
            >
              Transfers
            </Button>
          </div>

          {movementsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <p className="ml-3 text-gray-600">Lade Spielerbewegungen...</p>
            </div>
          ) : movementsError ? (
            <div className="flex items-center justify-center py-8 text-red-600">
              <AlertCircle className="h-8 w-8 mr-2" />
              <p>{movementsError}</p>
            </div>
          ) : filteredMovements.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {activeMovementTab === "all"
                ? "Keine Spielerbewegungen gefunden."
                : activeMovementTab === "new_addition"
                  ? "Keine Neuzugänge gefunden."
                  : "Keine Transfers gefunden."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Spieler</TableHead>
                    <TableHead>Bewegung</TableHead>
                    <TableHead>Datum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="font-medium">{movement.club_players?.name || "Unbekannt"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {movement.movement_type === "new_addition" ? (
                            <>
                              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                Neuzugang
                              </Badge>
                              <span className="text-gray-700">
                                ist {movement.teams?.name ? `der Mannschaft ${movement.teams.name}` : "einem Team"}{" "}
                                beigetreten.
                              </span>
                            </>
                          ) : (
                            <>
                              <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
                                Transfer
                              </Badge>
                              <span className="text-gray-700 flex items-center gap-1">
                                von <span className="font-semibold">{movement.from_teams?.name || "Kein Team"}</span>{" "}
                                <ArrowRight className="h-4 w-4 text-gray-500" /> nach{" "}
                                <span className="font-semibold">{movement.teams?.name || "Unbekanntes Team"}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(movement.movement_date), "dd.MM.yyyy HH:mm", { locale: de })} Uhr
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </motion.section>
    </motion.div>
  )
}
