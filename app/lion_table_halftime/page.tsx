"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Target, Award, Crown, Star, CheckCircle, AlertCircle } from "lucide-react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

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

interface SeasonSettings {
  halving_active: boolean
  halving_date: string | null
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
      return <Award className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
    case 3:
      return <Award className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
    default:
      return null
  }
}

function QualificationProgress({ current, required }: { current: number; required: number }) {
  const percentage = Math.min((current / required) * 100, 100)
  const isQualified = current >= required

  return (
    <div className="flex items-center space-x-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[40px] sm:min-w-[60px]">
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
}: {
  player: SeriesStanding
  position: number
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
      className={`bg-white rounded-xl shadow-lg border border-gray-200 p-4 hover:shadow-xl transition-all duration-300 ${
        isTopThree ? "ring-2 ring-yellow-200 bg-gradient-to-r from-yellow-50 to-white" : ""
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

      {/* Antritte Row */}
      <div className="bg-gray-50 rounded-lg p-2 text-center mb-3">
        <div className="text-xs text-gray-600 font-medium">Antritte</div>
        <div className="text-sm font-bold text-gray-800">{player.tournaments_played}</div>
      </div>

      {/* Progress/Status Row */}
      <div className="space-y-2">
        <div>
          <div className="text-xs text-gray-600 mb-1">Qualifikations-Fortschritt</div>
          <QualificationProgress current={player.tournaments_played} required={QUALIFICATION_REQUIREMENT} />
        </div>
        <div className="pt-2 border-t border-gray-100">
          <QualificationStatus tournamentsPlayed={player.tournaments_played} />
        </div>
      </div>
    </motion.div>
  )
}

export default function TournamentSeriesPage() {
  const [standings, setStandings] = useState<SeriesStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"alle" | "qualifiziert" | "nicht-qualifiziert">("alle")
  const [seasonSettings, setSeasonSettings] = useState<SeasonSettings>({
    halving_active: false,
    halving_date: null,
  })

  useEffect(() => {
    fetchSeasonSettings()
    fetchStandings()
  }, [])

  const fetchSeasonSettings = async () => {
    try {
      const { data, error } = await supabase.from("season_settings").select("*").eq("id", 1).single()

      if (error) {
        console.error("Error fetching season settings:", error)
        return
      }

      if (data) {
        setSeasonSettings({
          halving_active: data.halving_active,
          halving_date: data.halving_date,
        })
      }
    } catch (error) {
      console.error("Error fetching season settings:", error)
    }
  }

  const fetchStandings = async () => {
    try {
      const { data: tournamentEntries, error: entriesError } = await supabase
        .from("tournament_series_standings")
        .select("*")

      if (entriesError) throw entriesError

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

      const playerStats = new Map<string, any>()

      tournamentEntries?.forEach((entry: any) => {
        const playerName = entry.player_name

        if (!playerStats.has(playerName)) {
          playerStats.set(playerName, {
            player_name: playerName,
            placement_points: 0,
            bonus_points: 0,
            legs_won: 0,
            legs_lost: 0,
            tournaments_played: 0,
            total_matches_played: 0,
            total_matches_won: 0,
            total_matches_lost: 0,
          })
        }

        const stats = playerStats.get(playerName)

        const halvingMultiplier =
          seasonSettings.halving_active &&
          seasonSettings.halving_date &&
          new Date(entry.tournament_date).getTime() < new Date(seasonSettings.halving_date).getTime()
            ? 0.5
            : 1

        stats.placement_points += (entry.placement_points || 0) * halvingMultiplier
        stats.bonus_points += (entry.bonus_points || 0) * halvingMultiplier
        stats.legs_won += (entry.legs_won || 0) * halvingMultiplier
        stats.legs_lost += (entry.legs_lost || 0) * halvingMultiplier
        stats.tournaments_played += 1
        stats.total_matches_played += entry.matches_played || 0
        stats.total_matches_won += entry.matches_won || 0
        stats.total_matches_lost += entry.matches_lost || 0
      })

      const mappedData = Array.from(playerStats.values()).map((stats) => {
        return {
          player_name: stats.player_name,
          total_points: stats.placement_points + stats.legs_won + stats.bonus_points,
          placement_points: stats.placement_points,
          legs_points: stats.legs_won,
          bonus_points: stats.bonus_points,
          legs_won: stats.legs_won,
          legs_lost: stats.legs_lost,
          tournaments_played: stats.tournaments_played,
          total_matches_played: stats.total_matches_played,
          total_matches_won: stats.total_matches_won,
          total_matches_lost: stats.total_matches_lost,
          profile_picture_url: profilePictureMap.get(stats.player_name.toLowerCase()) || undefined,
        }
      })

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

  useEffect(() => {
    if (seasonSettings.halving_active !== undefined) {
      fetchStandings()
    }
  }, [seasonSettings])

  const filteredStandings = standings.filter((player) => {
    if (activeTab === "qualifiziert") {
      return player.tournaments_played >= QUALIFICATION_REQUIREMENT
    } else if (activeTab === "nicht-qualifiziert") {
      return player.tournaments_played < QUALIFICATION_REQUIREMENT
    }
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">Lädt...</div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20 sm:pb-8">
      <Header />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mb-3 sm:mb-4 shadow-lg">
            <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Halbzeit Punkteteilung
          </h1>
          <p className="text-base sm:text-lg text-gray-600">Rangliste mit Punktehalbierung</p>
          {seasonSettings.halving_active && (
            <Badge variant="secondary" className="mt-3 text-sm px-4 py-1">
              Punktehalbierung aktiv
            </Badge>
          )}
        </div>

        <div className="mb-6 flex justify-center">
          <div className="inline-flex flex-col sm:flex-row gap-2 sm:gap-0 w-full sm:w-auto bg-white rounded-lg sm:rounded-xl shadow-md p-1">
            <button
              onClick={() => setActiveTab("alle")}
              className={`px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-all ${
                activeTab === "alle"
                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Alle Spieler
            </button>
            <button
              onClick={() => setActiveTab("qualifiziert")}
              className={`px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-all ${
                activeTab === "qualifiziert"
                  ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Qualifiziert
            </button>
            <button
              onClick={() => setActiveTab("nicht-qualifiziert")}
              className={`px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-all ${
                activeTab === "nicht-qualifiziert"
                  ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Nicht Qualifiziert
            </button>
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-3 sm:gap-4 mb-6"
        >
          {filteredStandings.length === 0 ? (
            <Card className="shadow-xl border-2">
              <CardContent className="py-12 text-center text-muted-foreground">Keine Spieler gefunden</CardContent>
            </Card>
          ) : (
            filteredStandings.map((player, index) => (
              <MobilePlayerCard key={player.player_name} player={player} position={index + 1} />
            ))
          )}
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="shadow-lg hover:shadow-xl transition-shadow border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-blue-50 to-white">
              <CardTitle className="text-sm font-bold text-gray-700">Gesamt Spieler</CardTitle>
              <Trophy className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600">{filteredStandings.length}</div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-green-50 to-white">
              <CardTitle className="text-sm font-bold text-gray-700">Qualifizierte</CardTitle>
              <Award className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl sm:text-3xl font-bold text-green-600">
                {standings.filter((p) => p.tournaments_played >= QUALIFICATION_REQUIREMENT).length}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-purple-50 to-white">
              <CardTitle className="text-sm font-bold text-gray-700">Durchschn. Turniere</CardTitle>
              <Target className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                {standings.length > 0
                  ? (standings.reduce((sum, p) => sum + p.tournaments_played, 0) / standings.length).toFixed(1)
                  : "0.0"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  )
}
