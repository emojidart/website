"use client"

import { useEffect, useState} from "react"   
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import Image from "@/components/image"
import { Loader2 } from "lucide-react"
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
  Target,
  Activity,
  Info,
  Gift,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
  division?: string | null
  // Original values (before halving)
  original_placement_points?: number
  original_bonus_points?: number
  original_legs_won?: number
  original_legs_lost?: number
}

interface SeasonSettings {
  halving_active: boolean
  halving_date: string | null
  division_active: boolean
  division_date: string | null
}

interface NemesisData {
  player_name: string
  nemesis: string
  losses_count: number
}

interface FreilosStats {
  freilos_count: number
  tournaments_played: number
  average: number
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

interface MatchResult {
  id: string
  tournament_id: string
  tournament_type: string
  round: number
  player1: string
  player2: string
  score1: number
  score2: number
  winner: string
  loser: string
  match_number: number
  updated_at: string
}

const QUALIFICATION_REQUIREMENT = 20

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100, damping: 12 } },
}

// ✅  Container Animation
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } },
}

function getPositionBadge(position: number) {
  const baseClasses =
    "inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold text-sm"

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
  nemesis,
  halvingActive = false,
  minimalView = false,
  onClick,
}: {
  player: SeriesStanding
  position: number
  nemesis?: NemesisData
  halvingActive?: boolean
  minimalView?: boolean
  onClick?: () => void
}) {
  const isTopThree = position <= 3
  const calculatedTotalPoints = player.placement_points + player.legs_won + player.bonus_points
  const originalTotalPoints =
    (player.original_placement_points || 0) + (player.original_legs_won || 0) + (player.original_bonus_points || 0)
  const winRate =
    player.total_matches_played > 0
      ? ((player.total_matches_won / player.total_matches_played) * 100).toFixed(1)
      : "0.0"
  const legDifference = player.legs_won - player.legs_lost

  const hasHalving = halvingActive && originalTotalPoints !== calculatedTotalPoints

  return (
    <motion.div
      variants={cardVariants}
      onClick={onClick}
      className={`bg-white rounded-xl shadow-lg border border-gray-200 p-4 hover:shadow-xl transition-all duration-300 cursor-pointer ${
        isTopThree ? "ring-2 ring-yellow-200 bg-gradient-to-r from-yellow-50 to-white" : ""
      }`}
    >
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
              className={`text-sm sm:text-base font-bold ${isTopThree ? "text-gray-900" : "text-gray-700"} truncate max-w-full block`}
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

        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1">
            {hasHalving ? (
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-400 line-through">{originalTotalPoints}</span>
                <span className="text-xl sm:text-2xl font-bold text-yellow-600">{calculatedTotalPoints}</span>
              </div>
            ) : (
              <span className="text-xl sm:text-2xl font-bold text-yellow-600">{calculatedTotalPoints}</span>
            )}
            <Trophy className="h-4 w-4 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* ✅ Punkte / Legs /  */}
      {!minimalView && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <div className="text-xs text-blue-600 font-medium">Punkte</div>
            {hasHalving && player.original_placement_points !== player.placement_points ? (
              <div className="flex items-center justify-center gap-1">
                <span className="text-xs text-gray-400 line-through">{player.original_placement_points}</span>
                <span className="text-sm font-bold text-blue-800">{player.placement_points}</span>
              </div>
            ) : (
              <div className="text-sm font-bold text-blue-800">{player.placement_points}</div>
            )}
          </div>

          <div className="bg-green-50 rounded-lg p-2 text-center">
            <div className="text-xs text-green-600 font-medium">Legs W</div>
            {hasHalving && player.original_legs_won !== player.legs_won ? (
              <div className="flex items-center justify-center gap-1">
                <span className="text-xs text-gray-400 line-through">{player.original_legs_won}</span>
                <span className="text-sm font-bold text-green-800">{player.legs_won}</span>
              </div>
            ) : (
              <div className="text-sm font-bold text-green-800">{player.legs_won}</div>
            )}
          </div>

          <div className="bg-red-50 rounded-lg p-2 text-center">
            <div className="text-xs text-red-600 font-medium">Legs L</div>
            {hasHalving && player.original_legs_lost !== player.legs_lost ? (
              <div className="flex items-center justify-center gap-1">
                <span className="text-xs text-gray-400 line-through">{player.original_legs_lost}</span>
                <span className="text-sm font-bold text-red-800">{player.legs_lost}</span>
              </div>
            ) : (
              <div className="text-sm font-bold text-red-800">{player.legs_lost}</div>
            )}
          </div>

          <div className="bg-yellow-50 rounded-lg p-2 text-center">
            <div className="text-xs text-yellow-600 font-medium">Bonus</div>
            {hasHalving && player.original_bonus_points !== player.bonus_points ? (
              <div className="flex items-center justify-center gap-1">
                <span className="text-xs text-gray-400 line-through">{player.original_bonus_points}</span>
                <span className="text-sm font-bold text-yellow-800">{player.bonus_points}</span>
              </div>
            ) : (
              <div className="text-sm font-bold text-yellow-800">{player.bonus_points}</div>
            )}
          </div>
        </div>
      )}

      {/* ✅ Matches / Siege / Siegrate / Leg-Diff */}
      {!minimalView && (
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
      )}

      {/* ✅ Angstgegner */}
      {!minimalView && nemesis && nemesis.losses_count > 0 && (
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

      <div className="bg-gray-50 rounded-lg p-2 text-center mb-3">
        <div className="text-xs text-gray-600 font-medium">Antritte</div>
        <div className="text-sm font-bold text-gray-800">{player.tournaments_played}</div>
      </div>

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

 

 // ✅ MobileTournamentRankingCard


function MobileTournamentRankingCard({ ranking }: { ranking: any }) {
  const totalPoints =
    ranking.placement_points + ranking.bonus_points + ranking.legs_won

  const formArray = ranking.form ? ranking.form.split(",") : []
  const visibleForm = formArray.slice(0, 6)
  const hiddenCount = formArray.length - 6

  return (
    <div className="relative rounded-xl border border-orange-200 bg-white p-2.5 shadow-sm">
      {/* kleiner Gesamt-Kreis */}
      <div className="absolute right-2 top-2">
        <div className="w-9 h-9 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-sm">
          {totalPoints}
        </div>
      </div>

      {/* Kopf */}
      <div className="flex items-start gap-2 pr-12">
        {/* Platz */}
        <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0 text-sm">
          {getPlacementIcon(ranking.placement) || ranking.placement}
        </div>

        {/* Name + Form */}
        <div className="min-w-0 flex-1">
          <div className="font-black text-gray-900 text-sm truncate">
            {ranking.player_name}
          </div>

          {formArray.length > 0 && (
            <div className="mt-1 flex items-center gap-1 overflow-hidden">
              {visibleForm.map((result: string, idx: number) => (
                <span
                  key={idx}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    result === "W"
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {result}
                </span>
              ))}

              {hiddenCount > 0 && (
                <span className="text-[10px] font-bold text-gray-500 ml-1">
                  +{hiddenCount}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats kompakt */}
      <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-xl bg-orange-50 border border-orange-200 py-1.5">
          <div className="text-[9px] font-bold text-orange-700">Pkt</div>
          <div className="text-sm font-black text-orange-900">
            {ranking.placement_points}
          </div>
        </div>

        <div className="rounded-xl bg-green-50 border border-green-200 py-1.5">
          <div className="text-[9px] font-bold text-green-700">W</div>
          <div className="text-sm font-black text-green-900">
            {ranking.legs_won}
          </div>
        </div>

        <div className="rounded-xl bg-red-50 border border-red-200 py-1.5">
          <div className="text-[9px] font-bold text-red-700">L</div>
          <div className="text-sm font-black text-red-900">
            {ranking.legs_lost}
          </div>
        </div>
      </div>

      {/* Bonus klein unten rechts */}
      {ranking.bonus_points > 0 && (
        <div className="mt-1 text-right">
          <span className="text-[10px] font-bold text-yellow-700">
            +{ranking.bonus_points} Bonus
          </span>
        </div>
      )}
    </div>
  )
}






export default function TournamentSeriesPage() {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [tournamentQuery, setTournamentQuery] = useState("")
const [onlyBonus, setOnlyBonus] = useState(false)
const [onlyTop3, setOnlyTop3] = useState(false)
  const [playerMatches, setPlayerMatches] = useState<MatchResult[]>([])
  const [playerFreilos, setPlayerFreilos] = useState<FreilosStats | null>(null)
  const [standings, setStandings] = useState<SeriesStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"alle" | "qualifiziert" | "nicht-qualifiziert" | "turnier-historie">(
  "alle",
  )
  
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null)
  const [nemesisData, setNemesisData] = useState<Map<string, NemesisData>>(new Map())
  const [seasonSettings, setSeasonSettings] = useState<SeasonSettings>({
    halving_active: false,
    halving_date: null,
    division_active: false,
    division_date: null,
  })

  const fetchSeasonSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("season_settings")
        .select("halving_active, halving_date, division_active, division_date")
        .single()

      if (error) throw error

      if (data) {
        setSeasonSettings({
          halving_active: data.halving_active || false,
          halving_date: data.halving_date || null,
          division_active: data.division_active || false,
          division_date: data.division_date || null,
        })
      }
    } catch (error) {
      console.error("Error fetching season settings:", error)
    }
  }

  useEffect(() => {
    fetchSeasonSettings()
  }, [])

    useEffect(() => {
    if (seasonSettings.halving_active !== undefined) {
      fetchStandings()
      fetchNemesisData()
    }
  }, [seasonSettings])
  
  
  useEffect(() => {
  if (selectedPlayer) {
    window.scrollTo({
      top: 0,
      behavior: "smooth", // oder "auto" wenn du keine Animation willst
    })
  }
}, [selectedPlayer])
  
  

  useEffect(() => {
  if (seasonSettings.halving_active === undefined) return
  fetchTournaments()
}, [seasonSettings])

  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerMatches(selectedPlayer)
      fetchPlayerFreilos(selectedPlayer)
    }
  }, [selectedPlayer])

  const fetchPlayerMatches = async (playerName: string) => {
    try {
      const { data: seriesTournaments, error: tournamentsError } = await supabase
        .from("tournament_series_standings")
        .select("tournament_id")

      if (tournamentsError) throw tournamentsError

      const tournamentIds = seriesTournaments?.map((t) => t.tournament_id) || []

      if (tournamentIds.length === 0) {
        setPlayerMatches([])
        return
      }

      const { data, error } = await supabase
        .from("dko_match_states")
        .select("*")
        .in("tournament_id", tournamentIds)
        .or(`player1.eq.${playerName},player2.eq.${playerName}`)
        .not("winner", "is", null)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(20)

      if (error) throw error

      setPlayerMatches(data || [])
    } catch (error) {
      console.error("Error fetching player matches:", error)
    }
  }

  const fetchPlayerFreilos = async (playerName: string) => {
    try {
      const { data: seriesTournaments, error: tournamentsError } = await supabase
        .from("tournament_series_standings")
        .select("tournament_id")

      if (tournamentsError) throw tournamentsError

      const tournamentIds = [...new Set(seriesTournaments?.map((t) => t.tournament_id) || [])]

      if (tournamentIds.length === 0) {
        setPlayerFreilos({
          freilos_count: 0,
          tournaments_played: 0,
          average: 0,
        })
        return
      }

      const { data: playerMatches, error: matchesError } = await supabase
        .from("dko_match_states")
        .select("player1, player2, tournament_id")
        .in("tournament_id", tournamentIds)
        .or(`player1.eq.${playerName},player2.eq.${playerName}`)

      if (matchesError) throw matchesError

      let freilosCount = 0
      playerMatches?.forEach((match) => {
        const opponent = match.player1 === playerName ? match.player2 : match.player1
        if (opponent?.toLowerCase().startsWith("freilos")) {
          freilosCount++
        }
      })

      const { data: playerTournaments, error: tournamentsPlayedError } = await supabase
        .from("tournament_series_standings")
        .select("tournament_id")
        .eq("player_name", playerName)

      if (tournamentsPlayedError) throw tournamentsPlayedError

      const tournamentsPlayed = playerTournaments?.length || 0
      const average = tournamentsPlayed > 0 ? freilosCount / tournamentsPlayed : 0

      setPlayerFreilos({
        freilos_count: freilosCount,
        tournaments_played: tournamentsPlayed,
        average: average,
      })
    } catch (error) {
      console.error("Error fetching player freilos:", error)
      setPlayerFreilos({
        freilos_count: 0,
        tournaments_played: 0,
        average: 0,
      })
    }
  }

  const fetchNemesisData = async () => {
    try {
      const { data, error } = await supabase.from("dko_match_states").select("winner, loser").not("loser", "is", null)

      if (error) throw error

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
      const { data: tournamentEntries, error: entriesError } = await supabase.from("tournament_series_standings").select("*")
      if (entriesError) throw entriesError

      const { data: profilePictures, error: profileError } = await supabase
        .from("spieldatenbank")
        .select("name, profile_picture_url, id")

      if (profileError) {
        console.error("Error fetching profile pictures:", profileError)
      }

      const { data: divisionsData, error: divError } = await supabase.from("player_divisions").select("player_id, division")

      if (divError) {
        console.error("Error fetching divisions:", divError)
      }

      const profilePictureMap = new Map<string, string>()
      const playerIdMap = new Map<string, string>()
      profilePictures?.forEach((profile: any) => {
        if (profile.profile_picture_url) {
          profilePictureMap.set(profile.name.toLowerCase(), profile.profile_picture_url)
        }
        if (profile.id) {
          playerIdMap.set(profile.name.toLowerCase(), profile.id)
        }
      })

      const divisionMap = new Map<string, string>()
      divisionsData?.forEach((div: any) => {
        if (div.division) {
          divisionMap.set(div.player_id, div.division)
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
            original_placement_points: 0,
            original_bonus_points: 0,
            original_legs_won: 0,
            original_legs_lost: 0,
          })
        }

        const stats = playerStats.get(playerName)

        const halvingMultiplier =
          seasonSettings.halving_active &&
          seasonSettings.halving_date &&
          new Date(entry.tournament_date).getTime() < new Date(seasonSettings.halving_date).getTime()
            ? 0.5
            : 1

        stats.original_placement_points += entry.placement_points || 0
        stats.original_bonus_points += entry.bonus_points || 0
        stats.original_legs_won += entry.legs_won || 0
        stats.original_legs_lost += entry.legs_lost || 0

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
        const playerId = playerIdMap.get(stats.player_name.toLowerCase())
        const division = playerId ? divisionMap.get(playerId) : null

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
          division: division || null,
          original_placement_points: stats.original_placement_points,
          original_bonus_points: stats.original_bonus_points,
          original_legs_won: stats.original_legs_won,
          original_legs_lost: stats.original_legs_lost,
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
        Array.from(uniqueTournamentMap.values()).map(async (tournament: any) => {
          const { data: entries, error: entriesError } = await supabase
            .from("tournament_series_standings")
            .select("*")
            .eq("tournament_id", tournament.tournament_id)
            .order("placement", { ascending: true })

          if (entriesError) throw entriesError

          const tournamentType = entries?.[0]?.tournament_type || "8er_dko"

          const rankings =
            entries?.map((entry: any) => {
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

          rankings.sort((a: any, b: any) => {
            if (a.placement !== b.placement) return a.placement - b.placement
            const totalA = a.placement_points + a.bonus_points + a.legs_won
            const totalB = b.placement_points + b.bonus_points + b.legs_won
            if (totalB !== totalA) return totalB - totalA
            if (b.legs_won !== a.legs_won) return b.legs_won - a.legs_won
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

  const avgParticipationsPerTournament = completedTournaments > 0 ? totalAppearances / completedTournaments : 0
  const predictedFutureAppearances = Math.round(avgParticipationsPerTournament * remainingTournaments)
  const predictedTotalAppearances = totalAppearances + predictedFutureAppearances

  const predictedPrizePoolFromAppearances = predictedTotalAppearances * 4
  const predictedPrizePoolFromParticipants = totalParticipants * 5

  let currentHostSponsoring = 0
  if (totalAppearances >= 501) currentHostSponsoring = 250
  else if (totalAppearances >= 1) currentHostSponsoring = 100

  let predictedHostSponsoring = 0
  if (predictedTotalAppearances >= 501) predictedHostSponsoring = 250
  else if (predictedTotalAppearances > 0) predictedHostSponsoring = 100

  const predictedQualifiedPlayers = Math.round(totalParticipants * 0.6)
  const finaleFeesTotal = predictedQualifiedPlayers * 5

  const predictedTotalPrizePool =
    predictedPrizePoolFromParticipants + predictedPrizePoolFromAppearances + predictedHostSponsoring + finaleFeesTotal
	
	
	
	
	
	
	

  // ✅ SELECTED PLAYER VIEW
if (selectedPlayer) {
  const player = standings.find((p) => p.player_name === selectedPlayer)
  if (!player) return null

  const playerTournaments = tournaments
    .map((t) => ({
      ...t,
      playerEntry: t.rankings?.find((r: any) => r.player_name === selectedPlayer),
    }))
    .filter((t: any) => t.playerEntry)
    .sort((a: any, b: any) => new Date(b.tournament_date).getTime() - new Date(a.tournament_date).getTime())

  const winRate =
    player.total_matches_played > 0 ? ((player.total_matches_won / player.total_matches_played) * 100).toFixed(1) : "0.0"
  const legDifference = player.legs_won - player.legs_lost
  const avgPlacementPoints =
    player.tournaments_played > 0 ? (player.placement_points / player.tournaments_played).toFixed(1) : "0.0"

  const calculatedTotalPoints = player.placement_points + player.legs_won + player.bonus_points
  const originalTotalPoints =
    (player.original_placement_points || 0) + (player.original_legs_won || 0) + (player.original_bonus_points || 0)
  const hasHalving = seasonSettings.halving_active && originalTotalPoints !== calculatedTotalPoints

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
      <Header />

      <main className="pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl space-y-6 sm:space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ✅ Back */}
          <motion.div variants={itemVariants}>
            <button
              onClick={() => setSelectedPlayer(null)}
              className="inline-flex items-center gap-2 text-orange-700 hover:text-orange-800 font-semibold transition-colors"
              type="button"
            >
              <ChevronDown className="h-5 w-5 rotate-90" />
              Zurück zur Tabelle
            </button>
          </motion.div>

          {/* ✅ PLAYER HEADER CARD  */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-gray-200 bg-orange-50 flex-shrink-0">
                    <Image
                      src={player.profile_picture_url || "/placeholder-user.jpg"}
                      alt={`Profilbild von ${player.player_name}`}
                      width={64}
                      height={64}
                      className="object-cover"
                      unoptimized={true}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-lg sm:text-2xl font-black text-gray-900 truncate">{player.player_name}</h1>

                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-black text-orange-700">
                        <Trophy className="w-3.5 h-3.5" />
                        {hasHalving ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-gray-400 line-through">{originalTotalPoints}</span>
                            <span className="text-orange-700">{calculatedTotalPoints}</span>
                          </span>
                        ) : (
                          <span>{calculatedTotalPoints} Punkte</span>
                        )}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      Detailansicht Spielerwertung & Statistiken
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-xs font-black text-gray-700">
                        <Users className="w-3.5 h-3.5" />
                        Matches: {player.total_matches_played}
                      </span>

                      <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-xs font-black text-gray-700">
                        <Calendar className="w-3.5 h-3.5" />
                        Antritte: {player.tournaments_played}
                      </span>

                      <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-xs font-black text-gray-700">
                        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        Siege: {player.total_matches_won}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ✅ 4er Stats  */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3 text-center">
                    <p className="text-[11px] font-semibold text-gray-700">Antritte</p>
                    <p className="text-lg font-black text-gray-900">{player.tournaments_played}</p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3 text-center">
                    <p className="text-[11px] font-semibold text-gray-700">Siegrate</p>
                    <p className="text-lg font-black text-green-700">{winRate}%</p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3 text-center">
                    <p className="text-[11px] font-semibold text-gray-700">Leg-Diff</p>
                    <p className={`text-lg font-black ${legDifference >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {legDifference >= 0 ? "+" : ""}
                      {legDifference}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3 text-center">
                    <p className="text-[11px] font-semibold text-gray-700">Ø Punkte</p>
                    <p className="text-lg font-black text-indigo-700">{avgPlacementPoints}</p>
                  </div>
                </div>

                {/* ✅ Quali Bar */}
                <div className="mt-4">
                  <div className="text-xs text-gray-600 mb-1">Qualifikations-Fortschritt</div>
                  <QualificationProgress current={player.tournaments_played} required={QUALIFICATION_REQUIREMENT} />
                  <div className="mt-2">
                    <QualificationStatus tournamentsPlayed={player.tournaments_played} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ✅ 3er Stats  */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

              <div className="p-4 sm:p-5 border-b border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-black text-gray-900">Punkte-Aufteilung</h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">Platzierung, Legs & Bonus</p>
                  </div>

                  <div className="flex-shrink-0 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700">
                    {hasHalving ? calculatedTotalPoints : player.total_points}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <p className="text-xs font-black text-gray-700">Platzierungspunkte</p>
                  </div>
                  <p className="text-2xl font-black text-blue-700 mt-2">{player.placement_points}</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-600" />
                    <p className="text-xs font-black text-gray-700">Legs gewonnen</p>
                  </div>
                  <p className="text-2xl font-black text-green-700 mt-2">{player.legs_won}</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-600" />
                    <p className="text-xs font-black text-gray-700">Bonuspunkte</p>
                  </div>
                  <p className="text-2xl font-black text-yellow-700 mt-2">{player.bonus_points}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ✅ Freilos */}
          {playerFreilos && (
            <motion.div variants={itemVariants}>
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

                <div className="p-4 sm:p-5 border-b border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                      <Gift className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base sm:text-lg font-black text-gray-900">Freilos-Statistik</h2>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">Auswertung aus Match-Daten</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
                    <p className="text-[11px] font-semibold text-gray-700">Antritte</p>
                    <p className="text-2xl font-black text-indigo-700 mt-2">{player.tournaments_played}</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
                    <p className="text-[11px] font-semibold text-gray-700">Freilose</p>
                    <p className="text-2xl font-black text-red-700 mt-2">{playerFreilos.freilos_count}</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
                    <p className="text-[11px] font-semibold text-gray-700">Ø pro Antritt</p>
                    <p className="text-2xl font-black text-green-700 mt-2">{playerFreilos.average.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ✅ Letzte 20 Spiele */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

              <div className="p-4 sm:p-5 border-b border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-black text-gray-900">Letzte 20 Spiele</h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">Nur abgeschlossene Matches</p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {playerMatches.length > 0 ? (
                  playerMatches.map((match) => {
                    const isPlayer1 = match.player1 === selectedPlayer
                    const opponent = isPlayer1 ? match.player2 : match.player1
                    const playerScore = isPlayer1 ? match.score1 : match.score2
                    const opponentScore = isPlayer1 ? match.score2 : match.score1
                    const isWinner = match.winner === selectedPlayer

                    return (
                      <div
                        key={match.id}
                        className={`rounded-2xl border-2 p-4 transition-colors ${
                          isWinner
                            ? "bg-green-50 border-green-200 hover:border-green-300"
                            : "bg-red-50 border-red-200 hover:border-red-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white flex-shrink-0 ${
                                isWinner ? "bg-green-600" : "bg-red-600"
                              }`}
                            >
                              {isWinner ? "S" : "N"}
                            </div>

                            <div className="min-w-0">
                              <div className="text-xs font-black text-gray-700">{match.tournament_type}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(match.updated_at).toLocaleDateString("de-DE")}
                              </div>
                              <div className="mt-1 text-sm font-bold text-gray-900 truncate">
                                vs {opponent}
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <div className={`text-2xl font-black ${isWinner ? "text-green-700" : "text-red-700"}`}>
                              {playerScore}:{opponentScore}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1">Match-ID: {match.id}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-10 text-gray-600">
                    <Activity className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                    <p>Keine Spiele gefunden</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* ✅ Turnier Historie (für den Spieler) */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

              <div className="p-4 sm:p-5 border-b border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-black text-gray-900">Turnier Historie</h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">Alle Teilnahmen & Ergebnisse</p>
                  </div>

                  <div className="flex-shrink-0 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700">
                    {playerTournaments.length}
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {playerTournaments.length > 0 ? (
                  playerTournaments.map((tournament: any) => {
                    const entry = tournament.playerEntry!
                    const total = entry.placement_points + entry.bonus_points + entry.legs_won

                    return (
                      <div
                        key={tournament.tournament_id}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4 hover:border-orange-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-black text-gray-900 truncate">{tournament.tournament_name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(tournament.tournament_date).toLocaleDateString("de-DE")}
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-gray-600">Platz</div>
                            <div className="text-2xl font-black text-orange-700">{entry.placement}</div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-4 gap-2">
                          <div className="rounded-xl border border-gray-200 bg-white p-2 text-center">
                            <div className="text-[10px] font-bold text-gray-600">Pl. Punkte</div>
                            <div className="text-sm font-black text-blue-700">{entry.placement_points}</div>
                          </div>
                          <div className="rounded-xl border border-gray-200 bg-white p-2 text-center">
                            <div className="text-[10px] font-bold text-gray-600">Legs W</div>
                            <div className="text-sm font-black text-green-700">{entry.legs_won}</div>
                          </div>
                          <div className="rounded-xl border border-gray-200 bg-white p-2 text-center">
                            <div className="text-[10px] font-bold text-gray-600">Legs L</div>
                            <div className="text-sm font-black text-red-700">{entry.legs_lost}</div>
                          </div>
                          <div className="rounded-xl border border-gray-200 bg-white p-2 text-center">
                            <div className="text-[10px] font-bold text-gray-600">Gesamt</div>
                            <div className="text-sm font-black text-orange-700">{total}</div>
                          </div>
                        </div>

                        {entry.bonus_points > 0 && (
                          <div className="mt-2 text-right">
                            <span className="inline-flex items-center justify-center rounded-full bg-yellow-100 border border-yellow-200 px-2.5 py-1 text-xs font-black text-yellow-800">
                              +{entry.bonus_points} Bonus
                            </span>
                          </div>
                        )}

                        {entry.form && (
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-600">Form:</span>
                            <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1">
                              {entry.form.split(",").map((result: string, idx: number) => (
                                <span
                                  key={`${tournament.tournament_id}-f-${idx}`}
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                                    result === "W" ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                  }`}
                                >
                                  {result}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-10 text-gray-600">
                    <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                    <p>Keine Turnier-Teilnahmen gefunden</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div variants={itemVariants}>
            
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
  
  
  
  
  
  
  
  
  

  // ✅ LOADING VIEW 
  if (loading) {
  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 pb-20 pt-12 sm:pt-14">
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-white shadow-2xl px-10 py-10 border border-gray-200">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl animate-pulse" />
              <Loader2 className="relative h-12 w-12 animate-spin text-orange-600" />
            </div>

            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">Lion Cup wird geladen</p>
              <p className="text-sm text-gray-500 mt-1">Bitte kurz warten…</p>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </main>
  )
}

// ✅ MAIN VIEW 
return (
  <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
    <Header />

    <main className="pt-12 sm:pt-14">
      <motion.div
        className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl space-y-6 sm:space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ✅ LION CUP HEADER  */}
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-orange-600" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base sm:text-lg font-black text-gray-900">EMD - LION CUP</h1>

                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-black text-orange-700">
                      <Crown className="w-3.5 h-3.5" />
                      2025
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-semibold">Gesamtwertung</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Live-Wertung aller Teilnehmer</p>
                </div>
              </div>

              {/* POT */}
              <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-orange-200 text-center">
                  <h2 className="text-base sm:text-lg font-black text-gray-900">AKTUELLER POT</h2>
                  <p className="text-xs sm:text-sm font-bold text-gray-600 mt-0.5">EMD - LION CUP II 2025</p>
                </div>

                <div className="px-4 py-4 text-center">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-2xl sm:text-3xl text-gray-600 font-bold">€</span>
                    <span className="text-5xl sm:text-6xl font-black text-orange-700">
                      {totalPrizePool.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-700 font-bold flex-wrap">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span>Steigt mit jedem Antritt um €4,00!</span>

                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-3 py-1 rounded-full text-[10px] sm:text-xs font-black shadow-sm">
                      <Sparkles className="h-3 w-3" />
                      Extra Preisgeld
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-orange-200 bg-white p-4 text-left">
                    <p className="text-sm font-black text-gray-900">Preispool-Berechnung:</p>
                    <p className="text-xs sm:text-sm font-bold text-gray-600 mt-1 leading-relaxed">
                      Jeder Teilnehmer zahlt einmalig 5€ Startgebühr und 4€ pro Antritt in die Turnierserie ein.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ✅ PREISGELD PREDICTION  */}
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600" />

            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-black text-gray-900">PREISGELD PREDICTION</h2>
                  <p className="text-sm text-gray-600 mt-1">Hochrechnung basierend auf aktuellen Teilnehmern</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-center">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-2xl sm:text-3xl text-gray-600 font-bold">€</span>
                  <span className="text-4xl sm:text-5xl font-black text-indigo-700">
                    {predictedTotalPrizePool.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-2 font-bold">
                  Geschätzter Endstand nach {TOTAL_TOURNAMENT_DAYS} Turniertagen + Finale
                </p>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    <p className="text-xs font-black text-gray-700">Turniertage</p>
                  </div>
                  <p className="text-lg font-black text-indigo-700 mt-1">
                    {completedTournaments} / {TOTAL_TOURNAMENT_DAYS}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Noch {remainingTournaments} verbleibend</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <p className="text-xs font-black text-gray-700">Ø Antritte/Turnier</p>
                  </div>
                  <p className="text-lg font-black text-green-700 mt-1">{avgParticipationsPerTournament.toFixed(1)}</p>
                  <p className="text-xs text-gray-500 mt-1">Aktuell: {totalAppearances} gesamt</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <p className="text-xs font-black text-gray-700">Prognostiziert</p>
                  </div>
                  <p className="text-lg font-black text-purple-700 mt-1">{predictedTotalAppearances}</p>
                  <p className="text-xs text-gray-500 mt-1">Antritte bis Saisonende</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-600" />
                    <p className="text-xs font-black text-gray-700">Bonus</p>
                  </div>
                  <p className="text-lg font-black text-yellow-700 mt-1">€ {predictedHostSponsoring.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {predictedTotalAppearances >= 501
                      ? "Ab 501 Antritte"
                      : predictedTotalAppearances >= 1
                        ? "Bis 500 Antritte"
                        : "Noch nicht erreicht"}
                  </p>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold text-gray-800 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-green-600" />
                      Fortschritt zum €100 Bonus
                    </p>
                    <p className="text-[11px] font-semibold text-green-700">
                      {totalAppearances >= 500 ? "Erreicht!" : `${totalAppearances} / 500`}
                    </p>
                  </div>
                  <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                      style={{ width: `${Math.min((totalAppearances / 500) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold text-gray-800 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-600" />
                      Fortschritt zum €250 Bonus
                    </p>
                    <p className="text-[11px] font-semibold text-yellow-700">
                      {totalAppearances >= 501 ? "Erreicht!" : `${Math.max(totalAppearances, 0)} / 501`}
                    </p>
                  </div>
                  <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-500"
                      style={{ width: `${Math.min((totalAppearances / 501) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
		
		
		
		

          {/* ✅ STATS 4er GRID  */}
<motion.div variants={itemVariants}>
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
    {/* Teilnehmer */}
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-orange-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-gray-700">Teilnehmer</p>
          <p className="text-lg font-bold text-gray-900">{standings.length}</p>
        </div>
      </div>
    </div>

    {/* Führender */}
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-5 h-5 text-orange-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-gray-700">Führender</p>
          <p className="text-sm font-semibold text-gray-900 truncate">
            {standings[0]?.player_name || "-"}
          </p>
        </div>
      </div>
    </div>

    {/* Höchste Punktzahl */}
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-5 h-5 text-orange-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-gray-700">Höchste Punktzahl</p>
          <p className="text-lg font-bold text-gray-900">
            {standings[0]
              ? standings[0].placement_points + standings[0].legs_won + standings[0].bonus_points
              : 0}
          </p>
        </div>
      </div>
    </div>

    {/* Qualifiziert */}
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-5 h-5 text-orange-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-gray-700">Qualifiziert</p>
          <p className="text-lg font-bold text-gray-900">{qualifiedPlayers.length}</p>
        </div>
      </div>
    </div>
  </div>
</motion.div>
		  
		  
		  
		  
		  
		  
		  
		  

         {/* ✅ TAB NAV  */}
<motion.div variants={itemVariants}>
  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
    {/* orange bar  */}
    <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

    <div className="p-3 overflow-x-auto">
      <div className="flex space-x-2 min-w-max sm:min-w-0 sm:grid sm:grid-cols-4 sm:space-x-0 sm:gap-3">
        {/* Alle */}
        <Button
          onClick={() => setActiveTab("alle")}
          className={`h-9 rounded-xl font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-3 ${
            activeTab === "alle"
              ? "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
          }`}
          type="button"
        >
          <Trophy className={`h-4 w-4 sm:h-5 sm:w-5 mr-2 ${activeTab === "alle" ? "text-white" : "text-orange-600"}`} />
          <span className="hidden sm:inline">Alle Spieler</span>
          <span className="sm:hidden">Alle</span>
          <span
            className={`ml-2 rounded-full px-2 py-1 text-xs font-black ${
              activeTab === "alle" ? "bg-white/20 text-white" : "bg-orange-50 text-orange-700 border border-orange-200"
            }`}
          >
            {standings.length}
          </span>
        </Button>

        {/* Qualifiziert */}
        <Button
          onClick={() => setActiveTab("qualifiziert")}
          className={`h-9 rounded-xl font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-3 ${
            activeTab === "qualifiziert"
              ? "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
          }`}
          type="button"
        >
          <CheckCircle
            className={`h-4 w-4 sm:h-5 sm:w-5 mr-2 ${activeTab === "qualifiziert" ? "text-white" : "text-orange-600"}`}
          />
          <span className="hidden sm:inline">Qualifizierte Spieler</span>
          <span className="sm:hidden">Quali</span>
          <span
            className={`ml-2 rounded-full px-2 py-1 text-xs font-black ${
              activeTab === "qualifiziert"
                ? "bg-white/20 text-white"
                : "bg-orange-50 text-orange-700 border border-orange-200"
            }`}
          >
            {qualifiedPlayers.length}
          </span>
        </Button>

        {/* Nicht qualifiziert */}
        <Button
          onClick={() => setActiveTab("nicht-qualifiziert")}
          className={`h-9 rounded-xl font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-3 ${
            activeTab === "nicht-qualifiziert"
              ? "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
          }`}
          type="button"
        >
          <AlertCircle
            className={`h-4 w-4 sm:h-5 sm:w-5 mr-2 ${activeTab === "nicht-qualifiziert" ? "text-white" : "text-orange-600"}`}
          />
          <span className="hidden sm:inline">Nicht qualifizierte Spieler</span>
          <span className="sm:hidden">Nicht Quali</span>
          <span
            className={`ml-2 rounded-full px-2 py-1 text-xs font-black ${
              activeTab === "nicht-qualifiziert"
                ? "bg-white/20 text-white"
                : "bg-orange-50 text-orange-700 border border-orange-200"
            }`}
          >
            {notQualifiedPlayers.length}
          </span>
        </Button>

        {/* Historie */}
        <Button
          onClick={() => setActiveTab("turnier-historie")}
          className={`h-9 rounded-xl font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-3 ${
            activeTab === "turnier-historie"
              ? "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
          }`}
          type="button"
        >
          <Calendar
            className={`h-4 w-4 sm:h-5 sm:w-5 mr-2 ${activeTab === "turnier-historie" ? "text-white" : "text-orange-600"}`}
          />
          <span className="hidden sm:inline">Turnier Historie</span>
          <span className="sm:hidden">Historie</span>
          <span
            className={`ml-2 rounded-full px-2 py-1 text-xs font-black ${
              activeTab === "turnier-historie"
                ? "bg-white/20 text-white"
                : "bg-orange-50 text-orange-700 border border-orange-200"
            }`}
          >
            {tournaments.length}
          </span>
        </Button>
      </div>
    </div>
  </div>
</motion.div>
		  
		  
		  
		  
		  
		  
	{/* ✅ Alle Turniere Button */}	  

<motion.div variants={itemVariants}>
  <a
    href="/lion_cup_results"
    className="block rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 group"
  >
    {/* Orange Balken oben */}
    <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

    <div className="p-4 sm:p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
          <Target className="h-5 w-5 text-orange-600" />
        </div>

        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-black text-gray-900">
            Alle Turnier-Ergebnisse
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Detaillierte Match-Übersicht
          </p>
        </div>
      </div>

      <ChevronDown className="h-5 w-5 text-gray-400 rotate-[-90deg] group-hover:translate-x-1 transition-transform flex-shrink-0" />
    </div>
  </a>
</motion.div>





          {/* ✅ Turnier Historie*/}
          
		  {activeTab === "turnier-historie" ? (
  <motion.div variants={itemVariants}>
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

      <div className="p-4 sm:p-5 border-b border-gray-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>

            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-gray-900">Turnier Historie</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Alle Turniere mit Platzierungen</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-black text-orange-700">
                  <Trophy className="w-3.5 h-3.5" />
                  {tournaments.length} Turniere
                </span>

                <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-xs font-black text-gray-700">
                  <Users className="w-3.5 h-3.5" />
                  Gesamt Spieler: {tournaments.reduce((sum, t) => sum + (t.rankings?.length || 0), 0)}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-xs font-black text-gray-700">
                  <Calendar className="w-3.5 h-3.5" />
                  zuletzt:{" "}
                  {tournaments.length > 0 ? new Date(tournaments[0].tournament_date).toLocaleDateString("de-DE") : "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700">
            {tournaments.length}
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {tournaments.length > 0 ? (
          tournaments.map((tournament: any, index: number) => (
            <motion.div
              key={tournament.tournament_id}
              variants={cardVariants}
              className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-orange-400 transition-all duration-300"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedTournament(expandedTournament === tournament.tournament_id ? null : tournament.tournament_id)
                }
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 bg-orange-600 text-white rounded-2xl font-black text-sm sm:text-base flex-shrink-0 shadow-sm">
                    {tournaments.length - index}
                  </div>

                  <div className="text-left min-w-0 flex-1">
                    <h3 className="text-sm sm:text-lg font-black text-gray-900 truncate">{tournament.tournament_name}</h3>

                    <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="truncate">{getTournamentTypeLabel(tournament.tournament_type)}</span>
                      </span>

                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {tournament.rankings?.length || 0} Spieler
                      </span>

                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                <div className="border-t-2 border-gray-200 bg-gray-50 p-3 sm:p-6">
                  <h4 className="text-base sm:text-lg font-black text-gray-900 mb-3 sm:mb-4">Platzierungen</h4>

                  <div className="hidden lg:block bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-[80px_1fr_auto_100px_80px_100px_100px_120px] gap-4 p-4 bg-gray-100 border-b-2 border-gray-200 font-black text-sm text-gray-700">
                      <div className="text-center">Platz</div>
                      <div>Spieler</div>
                      <div className="text-center">Form</div>
                      <div className="text-center">Punkte</div>
                      <div className="text-center">Bonus</div>
                      <div className="text-center">Legs W</div>
                      <div className="text-center">Legs L</div>
                      <div className="text-center">Gesamt</div>
                    </div>

                    <div className="divide-y-2 divide-gray-200">
                      {tournament.rankings.map((ranking: any, rankIndex: number) => (
                        <div
                          key={rankIndex}
                          className="grid grid-cols-[80px_1fr_auto_100px_80px_100px_100px_120px] gap-4 p-4 items-center hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-center">
                            <div
                              className={`flex items-center justify-center w-10 h-10 rounded-full font-black text-sm ${getPlacementColor(
                                ranking.placement,
                              )}`}
                            >
                              {getPlacementIcon(ranking.placement) || ranking.placement}
                            </div>
                          </div>

                          <div className="font-semibold text-gray-900">{ranking.player_name}</div>

                          <div className="text-center">
                            {ranking.form ? (
                              <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
                                {ranking.form.split(",").map((result: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                                      result === "W" ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                    }`}
                                  >
                                    {result}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 font-bold">-</span>
                            )}
                          </div>

                          <div className="text-center text-yellow-600 font-black text-lg">{ranking.placement_points}</div>

                          <div className="text-center">
                            {ranking.bonus_points > 0 ? (
                              <span className="inline-flex items-center justify-center rounded-full bg-yellow-100 border border-yellow-200 px-2 py-1 text-xs font-black text-yellow-800">
                                +{ranking.bonus_points}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-bold">-</span>
                            )}
                          </div>

                          <div className="text-center text-green-600 font-black text-lg">{ranking.legs_won}</div>
                          <div className="text-center text-red-600 font-black text-lg">{ranking.legs_lost}</div>

                          <div className="text-center">
                            <span className="inline-flex items-center justify-center bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-lg px-3 py-1 rounded-2xl shadow-sm">
                              {ranking.placement_points + ranking.bonus_points + ranking.legs_won}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:hidden space-y-3">
                    {tournament.rankings.map((ranking: any, rankIndex: number) => (
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
            Zuletzt hinzugefügt:{" "}
            {tournaments.length > 0 ? new Date(tournaments[0].tournament_date).toLocaleDateString("de-DE") : "-"}
          </span>
        </div>
      </div>
    </div>
  </motion.div>
) : seasonSettings.division_active ? (
		  
		  
		  
		  
		  
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      <div>
                        <h2 className="text-lg sm:text-2xl font-bold text-white">Tabelle A - Meisterrunde</h2>
                        <p className="text-xs sm:text-sm text-yellow-100 mt-1">Kampf um den Titel</p>
                      </div>
                    </div>
                    <div className="bg-white/20 rounded-lg px-2 sm:px-3 py-1">
                      <span className="text-white font-semibold text-sm">
                        {filteredPlayers.filter((p) => p.division === "A").length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-200 p-3 sm:p-4">
                  <div className="flex items-center space-x-2 text-cyan-800">
                    <Info className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
                    <span className="text-xs sm:text-sm font-medium">
                      <span className="font-semibold">Tipp:</span> Klicke auf einen Namen für detaillierte Statistiken und die letzten 20 Spiele!
                    </span>
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

                {seasonSettings.halving_active && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 p-3 sm:p-4">
                    <div className="flex items-center space-x-2 text-orange-800">
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                      <span className="text-xs sm:text-sm font-medium">
                        Punkteteilung aktiv! <span className="text-gray-400 line-through">Durchgestrichen</span> = Originalpunkte,{" "}
                        <span className="font-bold">Fett</span> = Aktuelle Punkte nach Halbierung.
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                  {filteredPlayers.filter((p) => p.division === "A").length > 0 ? (
                    filteredPlayers
                      .filter((p) => p.division === "A")
                      .map((player, index) => (
                        <MobilePlayerCard
                          key={player.player_name}
                          player={player}
                          position={index + 1}
                          nemesis={nemesisData.get(player.player_name)}
                          halvingActive={seasonSettings.halving_active}
                          onClick={() => setSelectedPlayer(player.player_name)}
                        />
                      ))
                  ) : (
                    <div className="text-center py-12 text-gray-600">Keine Spieler in Tabelle A</div>
                  )}
                </div>

                <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0">
                    <span>Gesamt: {filteredPlayers.filter((p) => p.division === "A").length} Spieler</span>
                    <span>Meisterrunde</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Award className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      <div>
                        <h2 className="text-lg sm:text-2xl font-bold text-white">Tabelle B - Platzierungsrunde</h2>
                        <p className="text-xs sm:text-sm text-gray-100 mt-1">Kampf um die beste Platzierung</p>
                      </div>
                    </div>
                    <div className="bg-white/20 rounded-lg px-2 sm:px-3 py-1">
                      <span className="text-white font-semibold text-sm">
                        {filteredPlayers.filter((p) => p.division === "B").length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-200 p-3 sm:p-4">
                  <div className="flex items-center space-x-2 text-cyan-800">
                    <Info className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
                    <span className="text-xs sm:text-sm font-medium">
                      <span className="font-semibold">Tipp:</span> Klicke auf einen Namen für detaillierte Statistiken und die letzten 20 Spiele!
                    </span>
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

                {seasonSettings.halving_active && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 p-3 sm:p-4">
                    <div className="flex items-center space-x-2 text-orange-800">
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                      <span className="text-xs sm:text-sm font-medium">
                        Punkteteilung aktiv! <span className="text-gray-400 line-through">Durchgestrichen</span> = Originalpunkte,{" "}
                        <span className="font-bold">Fett</span> = Aktuelle Punkte nach Halbierung.
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                  {filteredPlayers.filter((p) => p.division === "B").length > 0 ? (
                    filteredPlayers
                      .filter((p) => p.division === "B")
                      .map((player, index) => (
                        <MobilePlayerCard
                          key={`${player.player_name}-${index}`}
                          player={player}
                          position={index + 1}
                          nemesis={nemesisData.get(player.player_name)}
                          halvingActive={seasonSettings.halving_active}
                          onClick={() => setSelectedPlayer(player.player_name)}
                        />
                      ))
                  ) : (
                    <div className="text-center py-12 text-gray-600">Keine Spieler in Tabelle B</div>
                  )}
                </div>

                <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0">
                    <span>Gesamt: {filteredPlayers.filter((p) => p.division === "B").length} Spieler</span>
                    <span>Platzierungsrunde</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants}>
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
               {/* ✅ Orange Balken oben wie bei Historie */}
<div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

{/* ✅ Header weiß  */}
<div className="p-4 sm:p-5 border-b border-gray-200 bg-white">
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
        {activeTab === "nicht-qualifiziert" ? (
  <AlertCircle className="h-5 w-5 text-orange-600" />
) : activeTab === "qualifiziert" ? (
  <CheckCircle className="h-5 w-5 text-orange-600" />
) : (
  <Trophy className="h-5 w-5 text-orange-600" />
)}
      </div>

      <div className="min-w-0">
        <h2 className="text-base sm:text-lg font-black text-gray-900 truncate">
          {activeTab === "alle"
            ? "Alle Spieler"
            : activeTab === "qualifiziert"
              ? "Qualifizierte Spieler"
              : "Nicht qualifizierte Spieler"}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Turnierserie Gesamtwertung</p>
      </div>
    </div>

    {/* Counter rechts wie bei Historie */}
    <div className="flex-shrink-0 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700">
      {filteredPlayers.length}
    </div>
  </div>
</div>

                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-200 p-3 sm:p-4">
                  <div className="flex items-center space-x-2 text-cyan-800">
                    <Info className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
                    <span className="text-xs sm:text-sm font-medium">
                      <span className="font-semibold">Tipp:</span> Klicke auf einen Namen für detaillierte Statistiken und die letzten 20 Spiele!
                    </span>
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

                {seasonSettings.halving_active && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 p-3 sm:p-4">
                    <div className="flex items-center space-x-2 text-orange-800">
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                      <span className="text-xs sm:text-sm font-medium">
                        Punkteteilung aktiv! <span className="text-gray-400 line-through">Durchgestrichen</span> = Originalpunkte,{" "}
                        <span className="font-bold">Fett</span> = Aktuelle Punkte nach Halbierung.
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
  {filteredPlayers.length > 0 ? (
    filteredPlayers.map((player, index) => (
      <MobilePlayerCard
        key={`${player.player_name}-${index}`}
        player={player}
        position={index + 1}
        nemesis={nemesisData.get(player.player_name)}
        halvingActive={seasonSettings.halving_active}
        minimalView={activeTab === "nicht-qualifiziert" || activeTab === "qualifiziert"}
        onClick={() => setSelectedPlayer(player.player_name)}
      />
    ))
  ) : (
    <div className="text-center py-12 text-gray-600">Keine Spieler in dieser Kategorie</div>
  )}
</div>

                <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0">
                    <span>Gesamt: {filteredPlayers.length} Spieler</span>
                    <span>
                      Qualifiziert: {qualifiedPlayers.length} von {standings.length}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div variants={itemVariants}>
           
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}