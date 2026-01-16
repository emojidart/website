"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import Image from "next/image"
import {
  Trophy,
  Users,
  Award,
  Crown,
  Star,
  TrendingUp,
  Medal,
  Calendar,
  ChevronDown,
  ChevronUp,
  Skull,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

interface SeriesStanding {
  player_name: string
  total_points: number
  placement_points: number
  legs_points: number
  legs_won: number
  legs_lost: number
  tournaments_played: number
  total_matches_played: number
  total_matches_won: number
  total_matches_lost: number
  profile_picture_url?: string
}

interface NemesisData {
  player_name: string
  nemesis: string
  losses_count: number
}

interface TournamentEntry {
  id: string
  tournament_id: string
  tournament_name: string
  player_name: string
  placement: number
  legs_won: number
  legs_lost: number
  matches_played: number
  matches_won: number
  matches_lost: number
  placement_points: number
  form: string
  added_at: string
}

interface Tournament {
  tournament_id: string
  tournament_name: string
  tournament_type: string
  tournament_date: string
  rankings?: TournamentEntry[]
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

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100, damping: 12 } },
}

function getPositionBadge(position: number) {
  const baseClasses = "inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold text-sm"

  switch (position) {
    case 1:
      return `${baseClasses} bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg`
    case 2:
      return `${baseClasses} bg-gradient-to-r from-gray-300 to-gray-500 text-white shadow-lg`
    case 3:
      return `${baseClasses} bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-lg`
    default:
      return `${baseClasses} bg-gray-100 text-gray-700 border-2 border-gray-200`
  }
}

function getPositionIcon(position: number) {
  switch (position) {
    case 1:
      return <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
    case 2:
      return <Medal className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
    case 3:
      return <Award className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
    default:
      return null
  }
}

function getPlacementColor(placement: number) {
  if (placement === 1) return "bg-yellow-400 text-white"
  if (placement === 2) return "bg-gray-300 text-white"
  if (placement === 3) return "bg-amber-400 text-white"
  return "bg-gray-100 text-gray-700"
}

function getPlacementIcon(placement: number) {
  if (placement === 1) return "🥇"
  if (placement === 2) return "🥈"
  if (placement === 3) return "🥉"
  return null
}

function MobilePlayerCard({
  player,
  position,
  nemesis,
}: {
  player: SeriesStanding
  position: number
  nemesis?: NemesisData
}) {
  const isTopThree = position <= 3
  const calculatedTotalPoints = player.placement_points + player.legs_won
  const winRate =
    player.total_matches_played > 0
      ? ((player.total_matches_won / player.total_matches_played) * 100).toFixed(1)
      : "0.0"
  const legDifference = player.legs_won - player.legs_lost

  return (
    <motion.div
      variants={cardVariants}
      className={`bg-white rounded-xl shadow-lg border border-gray-200 p-4 hover:shadow-xl transition-all duration-300 ${
        isTopThree ? "ring-2 ring-blue-200 bg-gradient-to-r from-blue-50 to-white" : ""
      }`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3 min-w-0 flex-1 mr-3">
          <div className={getPositionBadge(position)}>{position}</div>
          {isTopThree && getPositionIcon(position)}

          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
            <Image
              src={player.profile_picture_url || "/placeholder-user.jpg"}
              alt={`Profilbild von ${player.player_name}`}
              width={48}
              height={48}
              className="object-cover"
              unoptimized={true}
            />
          </div>

          <div className="min-w-0 flex-1 overflow-hidden">
            <div
              className={`text-sm sm:text-base font-bold ${isTopThree ? "text-gray-900" : "text-gray-700"}
                         truncate max-w-full block`}
              title={player.player_name}
            >
              {player.player_name}
            </div>
            {isTopThree && (
              <div className="text-xs text-blue-600 font-semibold flex items-center gap-1 truncate">
                <Star className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">Top {position}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Score */}
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-xl sm:text-2xl font-bold text-blue-600">{calculatedTotalPoints}</span>
            <Trophy className="h-4 w-4 text-blue-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <div className="text-xs text-blue-600 font-medium">Punkte</div>
          <div className="text-sm font-bold text-blue-800">{player.placement_points}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <div className="text-xs text-green-600 font-medium">Legs W</div>
          <div className="text-sm font-bold text-green-800">{player.legs_won}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-2 text-center">
          <div className="text-xs text-red-600 font-medium">Legs L</div>
          <div className="text-sm font-bold text-red-800">{player.legs_lost}</div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="bg-purple-50 rounded-lg p-2 text-center">
          <div className="text-xs text-purple-600 font-medium">Matches</div>
          <div className="text-sm font-bold text-purple-800">{player.total_matches_played}</div>
        </div>
        <div className="bg-teal-50 rounded-lg p-2 text-center">
          <div className="text-xs text-teal-600 font-medium">Siege</div>
          <div className="text-sm font-bold text-teal-800">{player.total_matches_won}</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-2 text-center">
          <div className="text-xs text-orange-600 font-medium">Siegrate</div>
          <div className="text-sm font-bold text-orange-800">{winRate}%</div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-2 text-center">
          <div className="text-xs text-indigo-600 font-medium">Leg-Diff</div>
          <div className={`text-sm font-bold ${legDifference >= 0 ? "text-green-800" : "text-red-800"}`}>
            {legDifference >= 0 ? "+" : ""}
            {legDifference}
          </div>
        </div>
      </div>

      {nemesis && nemesis.losses_count > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-3 mb-3 border-2 border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skull className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-xs text-red-600 font-semibold">Angstgegner</div>
                <div className="text-sm font-bold text-red-800">{nemesis.nemesis}</div>
              </div>
            </div>
            <div className="bg-red-600 text-white rounded-full px-3 py-1 text-xs font-bold">
              {nemesis.losses_count}x verloren
            </div>
          </div>
        </div>
      )}

      {/* Antritte Row */}
      <div className="bg-gray-50 rounded-lg p-2 text-center">
        <div className="text-xs text-gray-600 font-medium">Antritte</div>
        <div className="text-sm font-bold text-gray-800">{player.tournaments_played}</div>
      </div>
    </motion.div>
  )
}

function MobileTournamentRankingCard({ ranking, index }: { ranking: any; index: number }) {
  const isTopThree = ranking.placement <= 3
  const totalPoints = ranking.placement_points + ranking.legs_won

  return (
    <div
      className={`bg-white rounded-lg border-2 p-3 ${
        isTopThree ? "border-blue-400 bg-gradient-to-r from-blue-50 to-white" : "border-gray-200"
      }`}
    >
      {/* Header with placement and name */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm flex-shrink-0 ${getPlacementColor(ranking.placement)}`}
          >
            {getPlacementIcon(ranking.placement) || ranking.placement}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-gray-900 text-sm truncate" title={ranking.player_name}>
              {ranking.player_name}
            </div>
            {ranking.form && (
              <div className="flex gap-0.5 mt-1">
                {ranking.form.split(",").map((result: string, idx: number) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${
                      result === "W" ? "bg-green-500 text-white" : "bg-red-500 text-white"
                    }`}
                  >
                    {result}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg px-3 py-1 rounded-lg shadow-md">
            {totalPoints}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-yellow-50 rounded-lg p-2 text-center">
          <div className="text-xs text-yellow-600 font-medium">Punkte</div>
          <div className="text-base font-bold text-yellow-700">{ranking.placement_points}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <div className="text-xs text-green-600 font-medium">Legs W</div>
          <div className="text-base font-bold text-green-700">{ranking.legs_won}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-2 text-center">
          <div className="text-xs text-red-600 font-medium">Legs L</div>
          <div className="text-base font-bold text-red-700">{ranking.legs_lost}</div>
        </div>
      </div>
    </div>
  )
}

export default function BuffaloSteelCupPage() {
  const [standings, setStandings] = useState<SeriesStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"alle" | "turnier-historie">("alle")
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null)
  const [nemesisData, setNemesisData] = useState<Map<string, NemesisData>>(new Map())

  useEffect(() => {
    fetchStandings()
    fetchTournaments()
    fetchNemesisData()
  }, [])

  const fetchNemesisData = async () => {
    try {
      const { data, error } = await supabase.from("dko_match_states").select("winner, loser").not("loser", "is", null)

      if (error) throw error

      // Count losses for each player against each opponent
      const lossesMap = new Map<string, Map<string, number>>()

      data?.forEach((match: any) => {
        const loser = match.loser
        const winner = match.winner

        if (!lossesMap.has(loser)) {
          lossesMap.set(loser, new Map())
        }

        const opponentLosses = lossesMap.get(loser)!
        opponentLosses.set(winner, (opponentLosses.get(winner) || 0) + 1)
      })

      // Find the nemesis (most losses against) for each player
      const nemesisMap = new Map<string, NemesisData>()

      lossesMap.forEach((opponents, player) => {
        let maxLosses = 0
        let nemesis = ""

        opponents.forEach((count, opponent) => {
          if (count > maxLosses) {
            maxLosses = count
            nemesis = opponent
          }
        })

        if (nemesis) {
          nemesisMap.set(player, {
            player_name: player,
            nemesis: nemesis,
            losses_count: maxLosses,
          })
        }
      })

      setNemesisData(nemesisMap)
    } catch (error) {
      console.error("Error fetching nemesis data:", error)
    }
  }

  const fetchStandings = async () => {
    try {
      const { data, error } = await supabase
        .from("buffalo_steel_cup_aggregated")
        .select(
          "player_name, placement_points, total_legs_won, total_legs_lost, tournaments_played, total_matches_played, total_matches_won, total_matches_lost",
        )

      if (error) throw error

      const { data: profilePictures, error: profileError } = await supabase
        .from("spieldatenbank")
        .select("name, profile_picture_url")

      if (profileError) {
        console.error("Error fetching profile pictures:", profileError)
      }

      const profilePictureMap = new Map<string, string>()
      profilePictures?.forEach((profile: any) => {
        if (profile.profile_picture_url) {
          profilePictureMap.set(profile.name.toLowerCase(), profile.profile_picture_url)
        }
      })

      const mappedData =
        data?.map((row: any) => ({
          player_name: row.player_name,
          total_points: row.placement_points + row.total_legs_won,
          placement_points: row.placement_points,
          legs_points: row.total_legs_won,
          legs_won: row.total_legs_won,
          legs_lost: row.total_legs_lost,
          tournaments_played: row.tournaments_played,
          total_matches_played: row.total_matches_played,
          total_matches_won: row.total_matches_won,
          total_matches_lost: row.total_matches_lost,
          profile_picture_url: profilePictureMap.get(row.player_name.toLowerCase()) || undefined,
        })) || []

      mappedData.sort((a, b) => {
        const totalA = a.placement_points + a.legs_won
        const totalB = b.placement_points + b.legs_won
        if (totalB !== totalA) return totalB - totalA
        if (b.legs_won !== a.legs_won) return b.legs_won - a.legs_won
        if (b.placement_points !== a.placement_points) return b.placement_points - a.placement_points
        return a.tournaments_played - b.tournaments_played
      })

      setStandings(mappedData)
    } catch (error) {
      console.error("Error fetching standings:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTournaments = async () => {
    try {
      const { data: uniqueTournaments, error: tournamentsError } = await supabase
        .from("buffalo_steel_cup_standings")
        .select("tournament_id, tournament_name, tournament_date")
        .order("tournament_date", { ascending: false })

      if (tournamentsError) throw tournamentsError

      const uniqueTournamentMap = new Map()
      uniqueTournaments?.forEach((t) => {
        if (!uniqueTournamentMap.has(t.tournament_id)) {
          uniqueTournamentMap.set(t.tournament_id, t)
        }
      })

      const tournamentsWithRankings = await Promise.all(
        Array.from(uniqueTournamentMap.values()).map(async (tournament) => {
          const { data: entries, error: entriesError } = await supabase
            .from("buffalo_steel_cup_standings")
            .select("*")
            .eq("tournament_id", tournament.tournament_id)
            .order("placement", { ascending: true })

          if (entriesError) throw entriesError

          const tournamentType = entries?.[0]?.tournament_type || "8er_dko"

          const rankings =
            entries?.map((entry) => {
              return {
                player_name: entry.player_name,
                placement: entry.placement,
                legs_won: entry.legs_won,
                legs_lost: entry.legs_lost,
                placement_points: entry.placement_points,
                form: entry.form,
              }
            }) || []

          rankings.sort((a, b) => {
            if (a.placement !== b.placement) {
              return a.placement - b.placement
            }
            const totalA = a.placement_points + a.legs_won
            const totalB = b.placement_points + b.legs_won
            if (totalB !== totalA) {
              return totalB - totalA
            }
            if (b.legs_won !== a.legs_won) {
              return b.legs_won - a.legs_won
            }
            const aDiff = a.legs_won - a.legs_lost
            const bDiff = b.legs_won - b.legs_lost
            return bDiff - aDiff
          })

          return {
            tournament_id: tournament.tournament_id,
            tournament_name: tournament.tournament_name,
            tournament_type: tournamentType,
            tournament_date: tournament.tournament_date,
            rankings,
          }
        }),
      )

      setTournaments(tournamentsWithRankings)
    } catch (error) {
      console.error("Error fetching tournaments:", error)
    }
  }

  const getTournamentTypeLabel = (type: string) => {
    if (type.includes("16")) return "16er DKO"
    if (type.includes("8")) return "8er DKO"
    if (type.includes("32")) return "32er DKO"
    if (type.includes("64")) return "64er DKO"
    return type
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
        <Header />
        <main className="container mx-auto p-3 sm:p-4 md:p-8 max-w-7xl">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                <h2 className="text-lg sm:text-2xl font-bold text-white">BUFFALO STEEL CUP</h2>
              </div>
            </div>
            <div className="p-6 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm sm:text-base text-gray-600">Lade Tabelle...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
      <Header />

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto p-3 sm:p-4 md:p-8 max-w-7xl space-y-6 sm:space-y-8 pb-24"
      >
        <div className="px-4">
          <motion.div
            variants={cardVariants}
            className="bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50 rounded-2xl shadow-2xl border-2 border-blue-200 overflow-hidden"
          >
            <div className="text-center pt-6 pb-4 px-4">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 shadow-xl">
                    <Trophy className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full w-4 h-4 border-2 border-white"></div>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3">
                <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent">
                  BUFFALO STEEL CUP
                </span>
              </h1>

              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white px-4 py-2 rounded-full font-bold text-lg shadow-lg mb-4">
                <Crown className="h-5 w-5" />
                2026
              </div>

              <p className="text-xl sm:text-2xl font-semibold text-gray-700 mb-2">Gesamtwertung</p>
              <p className="text-sm sm:text-base text-gray-500 mb-4">Live-Wertung aller Teilnehmer</p>

              <div className="flex justify-center items-center gap-4">
                <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-yellow-500 rounded-full"></div>
                <Star className="h-4 w-4 text-yellow-500" />
                <div className="h-1 w-12 bg-gradient-to-r from-yellow-500 to-blue-500 rounded-full"></div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 px-4">
          <motion.div variants={cardVariants} className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm">Teilnehmer</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{standings.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={cardVariants} className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-600 flex-shrink-0" />
              <div className="min-w-0 overflow-hidden">
                <p className="text-gray-600 text-xs sm:text-sm">Fuehrender</p>
                <p className="text-base sm:text-xl font-bold text-gray-900 truncate">
                  {standings[0]?.player_name || "-"}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={cardVariants} className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm">Hoechste Punktzahl</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {standings[0] ? standings[0].placement_points + standings[0].legs_won : 0}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-3 overflow-x-auto">
            <div className="flex space-x-2 min-w-max sm:min-w-0 sm:grid sm:grid-cols-2 sm:space-x-0 sm:gap-3">
              <Button
                onClick={() => setActiveTab("alle")}
                className={`px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 text-sm sm:text-base whitespace-nowrap flex-shrink-0 shadow-lg ${
                  activeTab === "alle"
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-blue-200 scale-105"
                    : "bg-white text-gray-600 hover:bg-gray-50 hover:shadow-md border border-gray-200"
                }`}
              >
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">Alle Spieler</span>
                <span className="sm:hidden">Alle</span>
                <span className="ml-2 bg-white/20 rounded-full px-2 py-1 text-xs">{standings.length}</span>
              </Button>

              <Button
                onClick={() => setActiveTab("turnier-historie")}
                className={`px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 text-sm sm:text-base whitespace-nowrap flex-shrink-0 shadow-lg ${
                  activeTab === "turnier-historie"
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-blue-200 scale-105"
                    : "bg-white text-gray-600 hover:bg-gray-50 hover:shadow-md border border-gray-200"
                }`}
              >
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">Turnier Historie</span>
                <span className="sm:hidden">Historie</span>
                <span className="ml-2 bg-white/20 rounded-full px-2 py-1 text-xs">{tournaments.length}</span>
              </Button>
            </div>
          </div>
        </div>

        {activeTab === "turnier-historie" ? (
          <div className="px-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    <div>
                      <h2 className="text-lg sm:text-2xl font-bold text-white">Turnier Historie</h2>
                      <p className="text-xs sm:text-sm text-blue-100 mt-1">
                        Alle Turnierserie-Turniere mit Ergebnissen
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/20 rounded-lg px-2 sm:px-3 py-1">
                    <span className="text-white font-semibold text-sm">{tournaments.length}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                {tournaments.length > 0 ? (
                  tournaments.map((tournament, index) => (
                    <motion.div
                      key={tournament.tournament_id}
                      variants={cardVariants}
                      className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden hover:border-blue-500 transition-colors"
                    >
                      <button
                        onClick={() =>
                          setExpandedTournament(
                            expandedTournament === tournament.tournament_id ? null : tournament.tournament_id,
                          )
                        }
                        className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                          <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 text-white rounded-full font-bold text-sm sm:text-base flex-shrink-0">
                            {tournaments.length - index}
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <h3 className="text-sm sm:text-xl font-bold text-gray-900 truncate">
                              {tournament.tournament_name}
                            </h3>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Medal className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="truncate">{getTournamentTypeLabel(tournament.tournament_type)}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                {tournament.rankings?.length || 0} Spieler
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                {new Date(tournament.tournament_date).toLocaleDateString("de-DE")}
                              </span>
                            </div>
                          </div>
                        </div>
                        {expandedTournament === tournament.tournament_id ? (
                          <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 flex-shrink-0" />
                        )}
                      </button>

                      {expandedTournament === tournament.tournament_id && tournament.rankings && (
                        <div className="border-t-2 border-gray-200 p-3 sm:p-6 bg-gray-50">
                          <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Platzierungen</h4>

                          {/* Desktop table view - hidden on mobile */}
                          <div className="hidden lg:block bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                            <div className="grid grid-cols-[80px_1fr_auto_100px_100px_100px_120px] gap-4 p-4 bg-gray-100 border-b-2 border-gray-200 font-bold text-sm text-gray-700">
                              <div className="text-center">Platz</div>
                              <div>Spieler</div>
                              <div className="text-center">Form</div>
                              <div className="text-center">Punkte</div>
                              <div className="text-center">Legs W</div>
                              <div className="text-center">Legs L</div>
                              <div className="text-center">Gesamt</div>
                            </div>
                            <div className="divide-y-2 divide-gray-200">
                              {tournament.rankings.map((ranking, rankIndex) => (
                                <div
                                  key={rankIndex}
                                  className="grid grid-cols-[80px_1fr_auto_100px_100px_100px_120px] gap-4 p-4 items-center hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex justify-center">
                                    <div
                                      className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${getPlacementColor(ranking.placement)}`}
                                    >
                                      {getPlacementIcon(ranking.placement) || ranking.placement}
                                    </div>
                                  </div>
                                  <div className="font-medium text-gray-900">{ranking.player_name}</div>
                                  <div className="text-center font-mono font-bold text-sm">
                                    {ranking.form ? (
                                      <div className="flex gap-0.5">
                                        {ranking.form.split(",").map((result, idx) => (
                                          <span
                                            key={idx}
                                            className={`inline-flex items-center justify-center w-6 h-6 rounded ${
                                              result === "W" ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                            }`}
                                          >
                                            {result}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                  <div className="text-center text-yellow-600 font-bold text-lg">
                                    {ranking.placement_points}
                                  </div>
                                  <div className="text-center text-green-600 font-bold text-lg">{ranking.legs_won}</div>
                                  <div className="text-center text-red-600 font-bold text-lg">{ranking.legs_lost}</div>
                                  <div className="text-center">
                                    <span className="inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg px-3 py-1 rounded-lg shadow-md">
                                      {ranking.placement_points + ranking.legs_won}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Mobile card view - shown on mobile and tablet */}
                          <div className="lg:hidden space-y-3">
                            {tournament.rankings.map((ranking, rankIndex) => (
                              <MobileTournamentRankingCard key={rankIndex} ranking={ranking} index={rankIndex} />
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-600">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Noch keine Turniere in der Serie</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0">
                  <span>Gesamt: {tournaments.length} Turniere</span>
                  <span>
                    Zuletzt hinzugefuegt:{" "}
                    {tournaments.length > 0
                      ? new Date(tournaments[0].tournament_date).toLocaleDateString("de-DE")
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    <div>
                      <h2 className="text-lg sm:text-2xl font-bold text-white">Alle Spieler</h2>
                      <p className="text-xs sm:text-sm text-blue-100 mt-1">Buffalo Steel Cup Gesamtwertung</p>
                    </div>
                  </div>
                  <div className="bg-white/20 rounded-lg px-2 sm:px-3 py-1">
                    <span className="text-white font-semibold text-sm">{standings.length}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                {standings.length > 0 ? (
                  standings.map((player, index) => (
                    <MobilePlayerCard
                      key={player.player_name}
                      player={player}
                      position={index + 1}
                      nemesis={nemesisData.get(player.player_name)}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-600">Keine Spieler in dieser Kategorie</div>
                )}
              </div>

              <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0">
                  <span>Gesamt: {standings.length} Spieler</span>
                  <span>Turniere: {tournaments.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.main>

      <footer className="py-4 sm:py-6 bg-gray-200 text-gray-600 text-xs sm:text-sm text-center mt-8 border-t border-gray-300 px-4">
        <p>&copy; 2025 Emoj!'s Dartverein e.V. Alle Rechte vorbehalten.</p>
      </footer>

      <MobileBottomNav />
    </div>
  )
}
