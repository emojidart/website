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
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Medal,
  Sparkles,
  Calendar,
  ChevronDown,
  ChevronUp,
  Skull,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SeriesStanding {
  player_name: string
  total_points: number
  placement_points: number
  legs_points: number
  bonus_points: number
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
  bonus_points: number
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

const QUALIFICATION_REQUIREMENT = 20

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
      return `${baseClasses} bg-card   text-white shadow-lg`
    case 2:
      return `${baseClasses} bg-card   text-white shadow-lg`
    case 3:
      return `${baseClasses} bg-card   text-white shadow-lg`
    default:
      return `${baseClasses} bg-muted text-muted-foreground border-2 border-border`
  }
}

function getPositionIcon(position: number) {
  switch (position) {
    case 1:
      return <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
    case 2:
      return <Medal className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
    case 3:
      return <Award className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
    default:
      return null
  }
}

function getPlacementColor(placement: number) {
  if (placement === 1) return "bg-yellow-400 text-white"
  if (placement === 2) return "bg-secondary text-white"
  if (placement === 3) return "bg-amber-400 text-white"
  return "bg-muted text-muted-foreground"
}

function getPlacementIcon(placement: number) {
  if (placement === 1) return "🥇"
  if (placement === 2) return "🥈"
  if (placement === 3) return "🥉"
  return null
}

function QualificationProgress({ current, required }: { current: number; required: number }) {
  const percentage = Math.min((current / required) * 100, 100)
  const isQualified = current >= required

  return (
    <div className="flex items-center space-x-2">
      <div className="flex-1 bg-secondary rounded-full h-2 min-w-[40px] sm:min-w-[60px]">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${isQualified ? "bg-green-500" : "bg-red-500"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center space-x-1">
        <span className={`text-xs font-bold ${isQualified ? "text-green-600" : "text-red-600"}`}>
          {current}/{required}
        </span>
        {isQualified ? (
          <CheckCircle className="h-3 w-3 text-green-500" />
        ) : (
          <AlertCircle className="h-3 w-3 text-red-500" />
        )}
      </div>
    </div>
  )
}

function QualificationStatus({ tournamentsPlayed }: { tournamentsPlayed: number }) {
  const isQualified = tournamentsPlayed >= QUALIFICATION_REQUIREMENT

  if (isQualified) {
    return (
      <div className="flex items-center space-x-1 text-green-600">
        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="text-xs font-bold">QUALIFIZIERT</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-1 text-red-600">
      <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
      <span className="text-xs font-bold">NICHT QUALIFIZIERT</span>
    </div>
  )
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
  const calculatedTotalPoints = player.placement_points + player.legs_won + player.bonus_points
  const winRate =
    player.total_matches_played > 0
      ? ((player.total_matches_won / player.total_matches_played) * 100).toFixed(1)
      : "0.0"
  const legDifference = player.legs_won - player.legs_lost

  return (
    <motion.div
      variants={cardVariants}
      className={`bg-card rounded-xl shadow-lg border border-border p-4 hover:shadow-xl transition-all duration-300 ${
        isTopThree ? "text-foreground ring-2 ring-yellow-200 bg-card  " : ""
      }`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3 min-w-0 flex-1 mr-3">
          <div className={getPositionBadge(position)}>{position}</div>
          {isTopThree && getPositionIcon(position)}

          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-border flex-shrink-0">
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
              className={`text-sm sm:text-base font-bold ${isTopThree ? "text-foreground" : "text-muted-foreground"}
                         truncate max-w-full block`}
              title={player.player_name}
            >
              {player.player_name}
            </div>
            {isTopThree && (
              <div className="text-xs text-yellow-600 font-semibold flex items-center gap-1 truncate">
                <Star className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">Top {position}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Score */}
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-xl sm:text-2xl font-bold text-yellow-600">{calculatedTotalPoints}</span>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
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
        <div className="bg-yellow-50 rounded-lg p-2 text-center">
          <div className="text-xs text-yellow-600 font-medium">Bonus</div>
          <div className="text-sm font-bold text-yellow-800">{player.bonus_points}</div>
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
        <div className="text-foreground bg-card   rounded-lg p-3 mb-3 border-2 border-red-200">
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
      <div className="bg-muted rounded-lg p-2 text-center mb-3">
        <div className="text-xs text-muted-foreground font-medium">Antritte</div>
        <div className="text-sm font-bold text-foreground">{player.tournaments_played}</div>
      </div>

      {/* Progress/Status Row */}
      <div className="space-y-2">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Qualifikations-Fortschritt</div>
          <QualificationProgress current={player.tournaments_played} required={QUALIFICATION_REQUIREMENT} />
        </div>
        <div className="pt-2 border-t border-border">
          <QualificationStatus tournamentsPlayed={player.tournaments_played} />
        </div>
      </div>
    </motion.div>
  )
}

function MobileTournamentRankingCard({ ranking, index }: { ranking: any; index: number }) {
  const isTopThree = ranking.placement <= 3
  const totalPoints = ranking.placement_points + ranking.bonus_points + ranking.legs_won

  return (
    <div
      className={`bg-card rounded-lg border-2 p-3 ${
        isTopThree ? "text-foreground border-yellow-400 bg-card  " : "border-border"
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
            <div className="font-bold text-foreground text-sm truncate" title={ranking.player_name}>
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
          <div className="bg-card   text-white font-bold text-lg px-3 py-1 rounded-lg shadow-md">
            {totalPoints}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-yellow-50 rounded-lg p-2 text-center">
          <div className="text-xs text-yellow-600 font-medium">Punkte</div>
          <div className="text-base font-bold text-yellow-700">{ranking.placement_points}</div>
        </div>
        {ranking.bonus_points > 0 && (
          <div className="bg-amber-50 rounded-lg p-2 text-center">
            <div className="text-xs text-amber-600 font-medium">Bonus</div>
            <div className="text-base font-bold text-amber-700">+{ranking.bonus_points}</div>
          </div>
        )}
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

export default function TournamentSeriesPage() {
  const [standings, setStandings] = useState<SeriesStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"alle" | "qualifiziert" | "nicht-qualifiziert" | "turnier-historie">(
    "alle",
  )
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
        .from("tournament_series_aggregated")
        .select(
          "player_name, placement_points, bonus_points, total_legs_won, total_legs_lost, tournaments_played, total_matches_played, total_matches_won, total_matches_lost",
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
          total_points: row.placement_points + row.total_legs_won + row.bonus_points,
          placement_points: row.placement_points,
          legs_points: row.total_legs_won,
          bonus_points: row.bonus_points,
          legs_won: row.total_legs_won,
          legs_lost: row.total_legs_lost,
          tournaments_played: row.tournaments_played,
          total_matches_played: row.total_matches_played,
          total_matches_won: row.total_matches_won,
          total_matches_lost: row.total_matches_lost,
          profile_picture_url: profilePictureMap.get(row.player_name.toLowerCase()) || undefined,
        })) || []

      mappedData.sort((a, b) => {
        const totalA = a.placement_points + a.legs_won + a.bonus_points
        const totalB = b.placement_points + b.legs_won + b.bonus_points
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
        .from("tournament_series_standings")
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
            .from("tournament_series_standings")
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
                bonus_points: entry.bonus_points || 0,
                form: entry.form,
              }
            }) || []

          rankings.sort((a, b) => {
            if (a.placement !== b.placement) {
              return a.placement - b.placement
            }
            const totalA = a.placement_points + a.bonus_points + a.legs_won
            const totalB = b.placement_points + b.bonus_points + b.legs_won
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

  const qualifiedPlayers = standings.filter((s) => s.tournaments_played >= QUALIFICATION_REQUIREMENT)
  const notQualifiedPlayers = standings.filter((s) => s.tournaments_played < QUALIFICATION_REQUIREMENT)

  const getFilteredPlayers = () => {
    switch (activeTab) {
      case "qualifiziert":
        return qualifiedPlayers
      case "nicht-qualifiziert":
        return notQualifiedPlayers
      default:
        return standings
    }
  }

  const filteredPlayers = getFilteredPlayers()

  const totalParticipants = standings.length
  const totalAppearances = standings.reduce((sum, player) => sum + player.tournaments_played, 0)
  const prizePoolFromParticipants = totalParticipants * 5
  const prizePoolFromAppearances = totalAppearances * 4
  const totalPrizePool = prizePoolFromParticipants + prizePoolFromAppearances

  const TOTAL_TOURNAMENT_DAYS = 34
  const completedTournaments = tournaments.length
  const remainingTournaments = Math.max(0, TOTAL_TOURNAMENT_DAYS - completedTournaments)

  // Calculate average participations per tournament
  const avgParticipationsPerTournament = completedTournaments > 0 ? totalAppearances / completedTournaments : 0

  // Predict future participations
  const predictedFutureAppearances = Math.round(avgParticipationsPerTournament * remainingTournaments)
  const predictedTotalAppearances = totalAppearances + predictedFutureAppearances

  // Calculate predicted prize pool
  const predictedPrizePoolFromAppearances = predictedTotalAppearances * 4
  const predictedPrizePoolFromParticipants = totalParticipants * 5

  // Determine current host sponsoring based on actual appearances
  let currentHostSponsoring = 0
  if (totalAppearances >= 501) {
    currentHostSponsoring = 250
  } else if (totalAppearances >= 1) {
    currentHostSponsoring = 100
  }

  // Predict host sponsoring for final prize pool based on predicted appearances
  let predictedHostSponsoring = 0
  if (predictedTotalAppearances >= 501) {
    predictedHostSponsoring = 250
  } else if (predictedTotalAppearances > 0) {
    predictedHostSponsoring = 100
  }

  // Calculate qualified players for finale fee
  const predictedQualifiedPlayers = Math.round(totalParticipants * 0.6) // Estimate 60% will qualify
  const finaleFeesTotal = predictedQualifiedPlayers * 5

  const predictedTotalPrizePool =
    predictedPrizePoolFromParticipants + predictedPrizePoolFromAppearances + predictedHostSponsoring + finaleFeesTotal

  if (loading) {
    return (
      <div className="min-h-screen bg-muted text-foreground font-sans">
        <Header />
        <main className="container mx-auto p-3 sm:p-4 md:p-8 max-w-7xl">
          <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
            <div className="text-foreground bg-card   p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                <h2 className="text-lg sm:text-2xl font-bold text-white">EMD - LION CUP PART II</h2>
              </div>
            </div>
            <div className="p-6 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-sm sm:text-base text-muted-foreground">Lade Tabelle...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted text-foreground font-sans">
      <Header />
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto p-3 sm:p-4 md:p-8 max-w-7xl space-y-6 sm:space-y-8"
      >
        <div className="px-4">
          <motion.div
            variants={cardVariants}
            className="text-foreground bg-card    rounded-2xl shadow-2xl border-2 border-red-200 overflow-hidden"
          >
            <div className="text-center pt-6 pb-4 px-4">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="text-foreground bg-card   rounded-2xl p-4 shadow-xl">
                    <Trophy className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full w-4 h-4 border-2 border-white"></div>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mb-3">
                <span className="text-primary      ">
                  EMD - LION CUP
                </span>
              </h1>

              <div className="inline-flex items-center gap-2 bg-card   text-white px-4 py-2 rounded-full font-bold text-lg shadow-lg mb-4">
                <Crown className="h-5 w-5" />
                2025
              </div>

              <p className="text-xl sm:text-2xl font-semibold text-muted-foreground mb-2">Gesamtwertung</p>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">Live-Wertung aller Teilnehmer</p>

              <div className="flex justify-center items-center gap-4">
                <div className="text-foreground h-1 w-12 bg-card   rounded-full"></div>
                <Star className="h-4 w-4 text-yellow-500" />
                <div className="text-foreground h-1 w-12 bg-card   rounded-full"></div>
              </div>
            </div>

            <div className="text-center px-4 py-4 border-t-2 border-red-200">
              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-1">AKTUELLER POT</h2>
              <p className="text-sm sm:text-base text-muted-foreground font-semibold">EMD - LION CUP II 2025</p>
            </div>

            <div className="text-center py-6 px-4">
              <div className="inline-block">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-3xl sm:text-4xl text-muted-foreground font-bold">€</span>
                  <span className="text-primary text-6xl sm:text-7xl md:text-8xl font-semibold     ">
                    {totalPrizePool.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mt-4 text-sm sm:text-base">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="font-bold text-muted-foreground">Steigt mit jedem Antritt um €4,00!</span>
                <div className="bg-card   text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  Extra Preisgeld
                </div>
              </div>
            </div>

            <div className="text-foreground bg-card    px-4 py-4 border-t-2 border-yellow-500">
              <div className="flex items-center justify-center gap-2 text-center">
                <Sparkles className="h-5 w-5 text-yellow-700 flex-shrink-0" />
                <div>
                  <p className="text-base sm:text-lg font-semibold text-yellow-900">Preispool-Berechnung:</p>
                  <p className="text-xs sm:text-sm font-bold text-yellow-800 mt-1">
                    Jeder Teilnehmer zahlt einmalig 5€ Startgebühr und 4€ pro Antritt in die Turnierserie ein.
                  </p>
                </div>
                <Sparkles className="h-5 w-5 text-yellow-700 flex-shrink-0" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="px-4">
          <motion.div
            variants={cardVariants}
            className="text-foreground bg-card    rounded-2xl shadow-2xl border-2 border-indigo-300 overflow-hidden"
          >
            <div className="text-foreground text-center px-4 py-4 border-b-2 border-indigo-200 bg-card  ">
              <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-1 flex items-center justify-center gap-2">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8" />
                PREISGELD PREDICTION
              </h2>
              <p className="text-sm sm:text-base text-indigo-100 font-semibold">
                Hochrechnung basierend auf aktuellen Teilnehmern
              </p>
            </div>

            <div className="text-center py-6 px-4">
              <div className="inline-block">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-3xl sm:text-4xl text-muted-foreground font-bold">€</span>
                  <span className="text-primary text-5xl sm:text-6xl md:text-7xl font-semibold     ">
                    {predictedTotalPrizePool.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 font-medium">
                  Geschätzter Endstand nach {TOTAL_TOURNAMENT_DAYS} Turniertagen + Finale
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-4 pb-4">
              <div className="bg-card rounded-lg p-3 shadow-md border border-indigo-200">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <p className="text-xs font-semibold text-muted-foreground">Turniertage</p>
                </div>
                <p className="text-lg sm:text-xl font-bold text-indigo-700">
                  {completedTournaments} / {TOTAL_TOURNAMENT_DAYS}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Noch {remainingTournaments} verbleibend</p>
              </div>

              <div className="bg-card rounded-lg p-3 shadow-md border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-semibold text-muted-foreground">Ø Antritte/Turnier</p>
                </div>
                <p className="text-lg sm:text-xl font-bold text-green-700">
                  {avgParticipationsPerTournament.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Aktuell: {totalAppearances} gesamt</p>
              </div>

              <div className="bg-card rounded-lg p-3 shadow-md border border-purple-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <p className="text-xs font-semibold text-muted-foreground">Prognostiziert</p>
                </div>
                <p className="text-lg sm:text-xl font-bold text-purple-700">{predictedTotalAppearances}</p>
                <p className="text-xs text-muted-foreground mt-1">Antritte bis Saisonende</p>
              </div>

              <div className="bg-card rounded-lg p-3 shadow-md border border-yellow-200">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-4 w-4 text-yellow-600" />
                  <p className="text-xs font-semibold text-muted-foreground">Bonus</p>
                </div>
                <p className="text-lg sm:text-xl font-bold text-yellow-700">€ {predictedHostSponsoring.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {predictedTotalAppearances >= 501
                    ? "Ab 501 Antritte"
                    : predictedTotalAppearances >= 1
                      ? "Bis 500 Antritte"
                      : "Noch nicht erreicht"}
                </p>
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="text-foreground bg-card   rounded-lg p-4 border-2 border-green-300 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-bold text-foreground">Fortschritt zum €100 Bonus</p>
                  </div>
                  <div className="text-sm font-bold text-green-700">
                    {totalAppearances >= 500 ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Erreicht!
                      </span>
                    ) : (
                      <span>{totalAppearances} / 500</span>
                    )}
                  </div>
                </div>

                <div className="relative w-full bg-secondary rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 ${
                      totalAppearances >= 500
                        ? "text-foreground bg-card  "
                        : "text-foreground bg-card  "
                    }`}
                    style={{ width: `${Math.min((totalAppearances / 500) * 100, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0</span>
                  <span className="text-green-600 font-semibold">500 (€100)</span>
                </div>

                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {totalAppearances >= 500 ? (
                    <span className="font-semibold text-green-700">✓ €100 Wirt-Bonus erreicht!</span>
                  ) : (
                    <span>
                      Noch <span className="font-bold text-green-700">{500 - totalAppearances}</span> Antritte bis zum
                      €100 Bonus
                    </span>
                  )}
                </p>
              </div>

              <div className="text-foreground bg-card   rounded-lg p-4 border-2 border-yellow-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm font-bold text-foreground">Fortschritt zum €250 Bonus</p>
                  </div>
                  <div className="text-sm font-bold text-yellow-700">
                    {totalAppearances >= 501 ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Erreicht!
                      </span>
                    ) : totalAppearances >= 500 ? (
                      <span>{totalAppearances} / 501</span>
                    ) : (
                      <span>0 / 501</span>
                    )}
                  </div>
                </div>

                <div className="relative w-full bg-secondary rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 ${
                      totalAppearances >= 501
                        ? "text-foreground bg-card  "
                        : totalAppearances >= 500
                          ? "text-foreground bg-card  "
                          : "bg-secondary"
                    }`}
                    style={{
                      width: `${totalAppearances >= 500 ? Math.min(((totalAppearances - 500) / 1) * 100, 100) : 0}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>500 (€100)</span>
                  <span className="text-yellow-700 font-semibold">501 (€250)</span>
                </div>

                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {totalAppearances >= 501 ? (
                    <span className="font-semibold text-green-700">
                      🎉 Das maximale Bonus von €250 wurde erreicht!
                    </span>
                  ) : totalAppearances >= 500 ? (
                    <span>
                      Noch <span className="font-bold text-yellow-700">{501 - totalAppearances}</span> Antritt bis €250
                    </span>
                  ) : (
                    <span>
                      Aktuell: <span className="font-bold text-yellow-700">{totalAppearances}</span> Antritte • Noch{" "}
                      <span className="font-bold text-yellow-700">{501 - totalAppearances}</span> Antritte bis €250
                    </span>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 px-4">
          <motion.div variants={cardVariants} className="bg-card rounded-xl shadow-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs sm:text-sm">Teilnehmer</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{standings.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={cardVariants} className="bg-card rounded-xl shadow-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-600 flex-shrink-0" />
              <div className="min-w-0 overflow-hidden">
                <p className="text-muted-foreground text-xs sm:text-sm">Führender</p>
                <p className="text-base sm:text-xl font-bold text-foreground truncate">
                  {standings[0]?.player_name || "-"}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={cardVariants} className="bg-card rounded-xl shadow-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs sm:text-sm">Höchste Punktzahl</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {standings[0] ? standings[0].placement_points + standings[0].legs_won + standings[0].bonus_points : 0}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={cardVariants} className="bg-card rounded-xl shadow-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-purple-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs sm:text-sm">Qualifiziert</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{qualifiedPlayers.length}</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="px-4">
          <div className="bg-card  rounded-2xl shadow-xl border border-border p-3 overflow-x-auto">
            <div className="flex space-x-2 min-w-max sm:min-w-0 sm:grid sm:grid-cols-4 sm:space-x-0 sm:gap-3">
              <Button
                onClick={() => setActiveTab("alle")}
                className={`px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 text-sm sm:text-base whitespace-nowrap flex-shrink-0 shadow-lg ${
                  activeTab === "alle"
                    ? "bg-card   text-white shadow-red-200 scale-105"
                    : "bg-card text-muted-foreground hover:bg-muted hover:shadow-md border border-border"
                }`}
              >
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">Alle Spieler</span>
                <span className="sm:hidden">Alle</span>
                <span className="ml-2 bg-white/20 rounded-full px-2 py-1 text-xs">{standings.length}</span>
              </Button>

              <Button
                onClick={() => setActiveTab("qualifiziert")}
                className={`px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 text-sm sm:text-base whitespace-nowrap flex-shrink-0 shadow-lg ${
                  activeTab === "qualifiziert"
                    ? "bg-card   text-white shadow-red-200 scale-105"
                    : "bg-card text-muted-foreground hover:bg-muted hover:shadow-md border border-border"
                }`}
              >
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">Qualifizierte Spieler</span>
                <span className="sm:hidden">Quali</span>
                <span className="ml-2 bg-white/20 rounded-full px-2 py-1 text-xs">{qualifiedPlayers.length}</span>
              </Button>

              <Button
                onClick={() => setActiveTab("nicht-qualifiziert")}
                className={`px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 text-sm sm:text-base whitespace-nowrap flex-shrink-0 shadow-lg ${
                  activeTab === "nicht-qualifiziert"
                    ? "bg-card   text-white shadow-red-200 scale-105"
                    : "bg-card text-muted-foreground hover:bg-muted hover:shadow-md border border-border"
                }`}
              >
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">Nicht qualifizierte Spieler</span>
                <span className="sm:hidden">Nicht Quali</span>
                <span className="ml-2 bg-white/20 rounded-full px-2 py-1 text-xs">{notQualifiedPlayers.length}</span>
              </Button>

              <Button
                onClick={() => setActiveTab("turnier-historie")}
                className={`px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 text-sm sm:text-base whitespace-nowrap flex-shrink-0 shadow-lg ${
                  activeTab === "turnier-historie"
                    ? "bg-card   text-white shadow-red-200 scale-105"
                    : "bg-card text-muted-foreground hover:bg-muted hover:shadow-md border border-border"
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
            <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="text-foreground bg-card   p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    <div>
                      <h2 className="text-lg sm:text-2xl font-bold text-white">Turnier Historie</h2>
                      <p className="text-xs sm:text-sm text-red-100 mt-1">Alle Turnierserie-Turniere mit Ergebnissen</p>
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
                      className="bg-card rounded-xl shadow-lg border-2 border-border overflow-hidden hover:border-red-500 transition-colors"
                    >
                      <button
                        onClick={() =>
                          setExpandedTournament(
                            expandedTournament === tournament.tournament_id ? null : tournament.tournament_id,
                          )
                        }
                        className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                          <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-red-500 text-white rounded-full font-bold text-sm sm:text-base flex-shrink-0">
                            {tournaments.length - index}
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <h3 className="text-sm sm:text-xl font-bold text-foreground truncate">
                              {tournament.tournament_name}
                            </h3>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-xs sm:text-sm text-muted-foreground">
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
                          <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>

                      {expandedTournament === tournament.tournament_id && tournament.rankings && (
                        <div className="border-t-2 border-border p-3 sm:p-6 bg-muted">
                          <h4 className="text-base sm:text-lg font-bold text-foreground mb-3 sm:mb-4">Platzierungen</h4>

                          {/* Desktop table view - hidden on mobile */}
                          <div className="hidden lg:block bg-card border-2 border-border rounded-lg overflow-hidden">
                            <div className="grid grid-cols-[80px_1fr_auto_100px_80px_100px_100px_120px] gap-4 p-4 bg-muted border-b-2 border-border font-bold text-sm text-muted-foreground">
                              <div className="text-center">Platz</div>
                              <div>Spieler</div>
                              <div className="text-center">Form</div>
                              <div className="text-center">Punkte</div>
                              <div className="text-center">Bonus</div>
                              <div className="text-center">Legs W</div>
                              <div className="text-center">Legs L</div>
                              <div className="text-center">Gesamt</div>
                            </div>
                            <div className="divide-y-2 divide-border">
                              {tournament.rankings.map((ranking, rankIndex) => (
                                <div
                                  key={rankIndex}
                                  className="grid grid-cols-[80px_1fr_auto_100px_80px_100px_100px_120px] gap-4 p-4 items-center hover:bg-muted transition-colors"
                                >
                                  <div className="flex justify-center">
                                    <div
                                      className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${getPlacementColor(ranking.placement)}`}
                                    >
                                      {getPlacementIcon(ranking.placement) || ranking.placement}
                                    </div>
                                  </div>
                                  <div className="font-medium text-foreground">{ranking.player_name}</div>
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
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </div>
                                  <div className="text-center text-yellow-600 font-bold text-lg">
                                    {ranking.placement_points}
                                  </div>
                                  <div className="text-center">
                                    {ranking.bonus_points > 0 ? (
                                      <span className="inline-flex items-center justify-center bg-card   text-white font-bold text-sm px-2 py-1 rounded-full shadow-md">
                                        +{ranking.bonus_points}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </div>
                                  <div className="text-center text-green-600 font-bold text-lg">{ranking.legs_won}</div>
                                  <div className="text-center text-red-600 font-bold text-lg">{ranking.legs_lost}</div>
                                  <div className="text-center">
                                    <span className="inline-flex items-center justify-center bg-card   text-white font-bold text-lg px-3 py-1 rounded-lg shadow-md">
                                      {ranking.placement_points + ranking.bonus_points + ranking.legs_won}
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
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p>Noch keine Turniere in der Serie</p>
                  </div>
                )}
              </div>

              <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-t border-border">
                <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-muted-foreground space-y-1 sm:space-y-0">
                  <span>Gesamt: {tournaments.length} Turniere</span>
                  <span>
                    Zuletzt hinzugefügt:{" "}
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
            <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="text-foreground bg-card   p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    <div>
                      <h2 className="text-lg sm:text-2xl font-bold text-white">
                        {activeTab === "alle"
                          ? "Alle Spieler"
                          : activeTab === "qualifiziert"
                            ? "Qualifizierte Spieler"
                            : "Nicht qualifizierte Spieler"}
                      </h2>
                      <p className="text-xs sm:text-sm text-red-100 mt-1">Turnierserie Gesamtwertung</p>
                    </div>
                  </div>
                  <div className="bg-white/20 rounded-lg px-2 sm:px-3 py-1">
                    <span className="text-white font-semibold text-sm">{filteredPlayers.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-b border-blue-100 p-3 sm:p-4">
                <div className="flex items-center space-x-2 text-blue-800">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-sm font-medium">
                    Jeder Teilnehmer benötigt {QUALIFICATION_REQUIREMENT} Antritte für die Qualifikation.
                  </span>
                </div>
              </div>

              <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map((player, index) => (
                    <MobilePlayerCard
                      key={player.player_name}
                      player={player}
                      position={standings.findIndex((s) => s.player_name === player.player_name) + 1}
                      nemesis={nemesisData.get(player.player_name)}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">Keine Spieler in dieser Kategorie</div>
                )}
              </div>

              <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-t border-border">
                <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-muted-foreground space-y-1 sm:space-y-0">
                  <span>Gesamt: {filteredPlayers.length} Spieler</span>
                  <span>
                    Qualifiziert: {qualifiedPlayers.length} von {standings.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.main>

      <footer className="py-4 sm:py-6 bg-secondary text-muted-foreground text-xs sm:text-sm text-center mt-8 border-t border-border px-4">
        <p>&copy; 2025 Emoj!'s Dartverein e.V. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  )
}
