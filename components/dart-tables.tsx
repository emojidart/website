"use client"

import type React from "react"
import Image from "next/image" // Import Image component

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Trophy,
  Target,
  Users,
  Medal,
  Crown,
  Award,
  Star,
  Zap,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PlayerData, CombinedPlayerData } from "@/hooks/use-dart-data"

interface DartTablesProps {
  edartPlayers: PlayerData[]
  steelDartPlayers: PlayerData[]
  combinedPlayers: CombinedPlayerData[]
  loading: boolean
  error: string | null
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

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } },
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

function QualificationStatus({ edartGames, steelGames }: { edartGames: number; steelGames: number }) {
  const edartQualified = edartGames >= 5
  const steelQualified = steelGames >= 5
  const fullyQualified = edartQualified && steelQualified

  if (fullyQualified) {
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

// Mobile Player Card Component
function MobilePlayerCard({
  player,
  position,
  showDetails = false,
  type = "combined",
}: {
  player: PlayerData | CombinedPlayerData // Use updated types
  position: number
  showDetails?: boolean
  type?: "combined" | "edart" | "steel" | "total"
}) {
  const [expanded, setExpanded] = useState(false)
  const isTopThree = position <= 3

  return (
    <motion.div
      variants={cardVariants}
      className={`bg-white rounded-xl shadow-lg border border-gray-200 p-4 hover:shadow-xl transition-all duration-300 ${
        isTopThree ? "ring-2 ring-yellow-200 bg-gradient-to-r from-yellow-50 to-white" : ""
      }`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={getPositionBadge(position)}>{position}</div>
          {isTopThree && getPositionIcon(position)}
          <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
            {player.profile_picture_url ? (
              <div className="h-full w-full rounded-full overflow-hidden border border-gray-200">
                <Image
                  src={player.profile_picture_url || "/placeholder.svg"}
                  alt={`Profilbild von ${player.name}`}
                  width={48}
                  height={48}
                  style={{ objectFit: "cover" }}
                  className="rounded-full"
                />
              </div>
            ) : (
              <div className="h-full w-full rounded-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm sm:text-base">{player.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={`text-sm sm:text-base font-bold truncate ${isTopThree ? "text-gray-900" : "text-gray-700"}`}
            >
              {player.name}
            </div>
            {isTopThree && (
              <div className="text-xs text-yellow-600 font-semibold flex items-center gap-1">
                <Star className="h-3 w-3" />
                Top {position}
              </div>
            )}
          </div>
        </div>

        {/* Main Score */}
        <div className="text-right">
          {type === "total" ? (
            <div className="flex items-center gap-1">
              <span className="text-xl sm:text-2xl font-bold text-red-600">{player.totalParticipations}</span>
              <Users className="h-4 w-4 text-red-500" />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xl sm:text-2xl font-bold text-yellow-600">
                {type === "combined" ? (player as CombinedPlayerData).totalPoints : (player as PlayerData).points}
              </span>
              <Zap className="h-4 w-4 text-yellow-500" />
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        {type === "combined" && (
          <>
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-xs text-blue-600 font-medium">E-Dart</div>
              <div className="text-sm font-bold text-blue-800">
                {(player as CombinedPlayerData).edartParticipations || 0}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <div className="text-xs text-green-600 font-medium">Steel</div>
              <div className="text-sm font-bold text-green-800">
                {(player as CombinedPlayerData).steelParticipations || 0}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-600 font-medium">Gesamt</div>
              <div className="text-sm font-bold text-gray-800">
                {(player as CombinedPlayerData).totalParticipations}
              </div>
            </div>
          </>
        )}

        {type === "total" && (
          <>
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-xs text-blue-600 font-medium">E-Dart</div>
              <div className="text-sm font-bold text-blue-800">
                {(player as CombinedPlayerData).edartParticipations || 0}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <div className="text-xs text-green-600 font-medium">Steel</div>
              <div className="text-sm font-bold text-green-800">
                {(player as CombinedPlayerData).steelParticipations || 0}
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-2 text-center">
              <div className="text-xs text-yellow-600 font-medium">Legs</div>
              <div className="text-sm font-bold text-yellow-800">{(player as CombinedPlayerData).totalLegs}</div>
            </div>
          </>
        )}

        {(type === "edart" || type === "steel") && (
          <>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-600 font-medium">Punkte</div>
              <div className="text-sm font-bold text-gray-800">{(player as PlayerData).points}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-600 font-medium">Legs</div>
              <div className="text-sm font-bold text-gray-800">{(player as PlayerData).legs}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-600 font-medium">Antritte</div>
              <div className="text-sm font-bold text-gray-800">{(player as PlayerData).participations}</div>
            </div>
          </>
        )}
      </div>

      {/* Progress/Status Row */}
      {type === "combined" && (
        <div className="space-y-2">
          <div>
            <div className="text-xs text-gray-600 mb-1">E-Dart Fortschritt</div>
            <QualificationProgress current={(player as CombinedPlayerData).edartParticipations || 0} required={5} />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Steel Fortschritt</div>
            <QualificationProgress current={(player as CombinedPlayerData).steelParticipations || 0} required={5} />
          </div>
          <div className="pt-2 border-t border-gray-100">
            <QualificationStatus
              edartGames={(player as CombinedPlayerData).edartParticipations || 0}
              steelGames={(player as CombinedPlayerData).steelParticipations || 0}
            />
          </div>
        </div>
      )}

      {(type === "edart" || type === "steel") && (
        <div className="pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-600 mb-1">Finale-Fortschritt</div>
          <QualificationProgress current={(player as PlayerData).participations} required={5} />
        </div>
      )}

      {/* Expand Button for more details */}
      {showDetails && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 pt-3 border-t border-gray-100 flex items-center justify-center text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {expanded ? (
            <>
              Weniger anzeigen <ChevronUp className="h-3 w-3 ml-1" />
            </>
          ) : (
            <>
              Mehr Details <ChevronDown className="h-3 w-3 ml-1" />
            </>
          )}
        </button>
      )}

      {/* Expanded Details */}
      {expanded && showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 pt-3 border-t border-gray-100 space-y-2"
        >
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-600">Erstellt:</span>
              <span className="ml-1 font-medium">
                {new Date(player.created_at || Date.now()).toLocaleDateString("de-DE")}
              </span>
            </div>
            <div>
              <span className="text-gray-600">ID:</span>
              <span className="ml-1 font-mono text-xs">{player.id?.slice(0, 8)}...</span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// Mobile Table Component
function MobileTable({
  players,
  loading,
  title,
  icon,
  type = "combined",
  description,
}: {
  players: any[]
  loading: boolean
  title: string
  icon: React.ReactNode
  type?: "combined" | "edart" | "steel" | "total"
  description?: string
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-lg sm:text-2xl font-bold text-white">{title}</h2>
          </div>
        </div>
        <div className="p-6 sm:p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">Lade Tabelle...</p>
        </div>
      </div>
    )
  }

  if (!players || players.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-lg sm:text-2xl font-bold text-white">{title}</h2>
          </div>
        </div>
        <div className="p-6 sm:p-8 text-center">
          <p className="text-sm sm:text-base text-gray-600">Keine Daten verfügbar</p>
        </div>
      </div>
    )
  }

  const sortedPlayers = [...players]
    .sort((a, b) => {
      if (type === "total") {
        return b.totalParticipations - a.totalParticipations
      }
      return b.totalPoints - a.totalPoints
    })
    .map((player, index) => ({ ...player, position: index + 1 }))

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-white">{title}</h2>
              {description && <p className="text-xs sm:text-sm text-red-100 mt-1">{description}</p>}
            </div>
          </div>
          <div className="bg-white/20 rounded-lg px-2 sm:px-3 py-1">
            <span className="text-white font-semibold text-sm">{players.length}</span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      {type === "combined" && (
        <div className="bg-blue-50 border-b border-blue-100 p-3 sm:p-4">
          <div className="flex items-center space-x-2 text-blue-800">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm font-medium">
              Für das Finale: 5x E-Dart + 5x Steel Dart erforderlich
            </span>
          </div>
        </div>
      )}

      {(type === "edart" || type === "steel") && (
        <div
          className={`${type === "edart" ? "bg-blue-50 border-blue-100" : "bg-green-50 border-green-100"} border-b p-3 sm:p-4`}
        >
          <div className={`flex items-center space-x-2 ${type === "edart" ? "text-blue-800" : "text-green-800"}`}>
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm font-medium">5 Spiele erforderlich für Finale-Qualifikation</span>
          </div>
        </div>
      )}

      {type === "total" && (
        <div className="bg-red-50 border-b border-red-100 p-3 sm:p-4">
          <div className="flex items-center space-x-2 text-red-800">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm font-medium">Komplette Übersicht aller Antritte pro Spieler</span>
          </div>
        </div>
      )}

      {/* Mobile Cards */}
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {sortedPlayers.map((player, index) => (
          <MobilePlayerCard
            key={player.name || player.id}
            player={player}
            position={player.position}
            type={type}
            showDetails={index < 10} // Show details for top 10
          />
        ))}
      </div>

      {/* Footer Stats */}
      <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0">
          <span>Gesamt: {players.length} Spieler</span>
          {type === "combined" && (
            <span>
              Qualifiziert für Finale:{" "}
              {
                sortedPlayers.filter((p) => {
                  const edart = (p as CombinedPlayerData).edartParticipations || 0
                  const steel = (p as CombinedPlayerData).steelParticipations || 0
                  return edart >= 5 && steel >= 5
                }).length
              }
            </span>
          )}
          {(type === "edart" || type === "steel") && (
            <span>
              Qualifiziert: {players.filter((p) => (p as PlayerData).participations >= 5).length} von {players.length}
            </span>
          )}
          {type === "total" && (
            <span>
              Durchschnitt:{" "}
              {players.length > 0
                ? Math.round(
                    players.reduce((sum, p) => sum + (p as CombinedPlayerData).totalParticipations, 0) / players.length,
                  )
                : 0}{" "}
              Antritte
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function DartTables({ edartPlayers, steelDartPlayers, combinedPlayers, loading, error }: DartTablesProps) {
  const [activeTab, setActiveTab] = useState<"combined" | "edart" | "steel" | "total">("combined")

  if (error) {
    return (
      <div className="text-center py-12 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <div className="text-red-600 text-lg font-semibold mb-2">Fehler beim Laden</div>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8 px-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Ranglisten</h1>
        <p className="text-sm sm:text-base lg:text-lg text-gray-600">Aktuelle Standings der Competition 2025</p>
      </div>

      {/* Mobile-Optimized Tab Navigation */}
      <div className="px-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2 overflow-x-auto">
          <div className="flex space-x-1 min-w-max sm:min-w-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:space-x-0 sm:gap-2">
            <Button
              onClick={() => setActiveTab("combined")}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === "combined"
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Trophy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Gesamtwertung</span>
              <span className="sm:hidden">Gesamt</span>
              <span className="ml-1">({combinedPlayers?.length || 0})</span>
            </Button>
            <Button
              onClick={() => setActiveTab("edart")}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === "edart"
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Target className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              E-Dart ({edartPlayers?.length || 0})
            </Button>
            <Button
              onClick={() => setActiveTab("steel")}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === "steel"
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Steel Dart</span>
              <span className="sm:hidden">Steel</span>
              <span className="ml-1">({steelDartPlayers?.length || 0})</span>
            </Button>
            <Button
              onClick={() => setActiveTab("total")}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === "total"
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Gesamt Antritte</span>
              <span className="sm:hidden">Antritte</span>
              <span className="ml-1">({combinedPlayers?.length || 0})</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="px-4">
        {activeTab === "combined" && (
          <MobileTable
            players={combinedPlayers}
            loading={loading}
            title="Gesamtwertung"
            icon={<Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
            type="combined"
            description="Kombinierte Wertung aus E-Dart und Steel Dart"
          />
        )}

        {activeTab === "edart" && (
          <MobileTable
            players={edartPlayers}
            loading={loading}
            title="E-Dart Tabelle"
            icon={<Target className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
            type="edart"
            description="Elektronisches Dart Ranking"
          />
        )}

        {activeTab === "steel" && (
          <MobileTable
            players={steelDartPlayers}
            loading={loading}
            title="Steel Dart Tabelle"
            icon={<Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
            type="steel"
            description="Klassisches Steel Dart Ranking"
          />
        )}

        {activeTab === "total" && (
          <MobileTable
            players={combinedPlayers}
            loading={loading}
            title="Gesamt Antritte"
            icon={<Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
            type="total"
            description="Übersicht aller Teilnahmen"
          />
        )}
      </div>
    </motion.div>
  )
}
