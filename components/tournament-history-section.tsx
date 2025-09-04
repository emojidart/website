"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  Target,
  Users,
  ChevronDown,
  ChevronRight,
  Zap,
  Crown,
  Medal,
  Award,
  History,
  Star,
  Trophy,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { GroupedTournamentHistory, HistoricalPlayerResult } from "@/hooks/use-dart-data"
import Image from "next/image"

interface TournamentHistorySectionProps {
  groupedHistory: GroupedTournamentHistory
  loading: boolean
  error: string | null
}

function getPositionBadge(position: number) {
  const baseClasses = "inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs shadow-lg"
  switch (position) {
    case 1:
      return `${baseClasses} bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-white shadow-yellow-200`
    case 2:
      return `${baseClasses} bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-white shadow-gray-200`
    case 3:
      return `${baseClasses} bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white shadow-amber-200`
    default:
      return `${baseClasses} bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300`
  }
}

function getPositionIcon(position: number) {
  switch (position) {
    case 1:
      return <Crown className="h-3 w-3 text-yellow-500 drop-shadow-sm" />
    case 2:
      return <Medal className="h-3 w-3 text-gray-400 drop-shadow-sm" />
    case 3:
      return <Award className="h-3 w-3 text-amber-600 drop-shadow-sm" />
    default:
      return null
  }
}

function HistoricalPlayerResultCard({ player, position }: { player: HistoricalPlayerResult; position: number }) {
  const isTopThree = position <= 3
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.05 }}
      className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 ${
        isTopThree ? "ring-2 ring-yellow-200/50 bg-gradient-to-r from-yellow-50/80 to-white/90" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={getPositionBadge(position)}>{position}</div>
          {isTopThree && getPositionIcon(position)}
          <div className="flex items-center space-x-2">
            {player.profile_picture_url ? (
              <div className="relative">
                <Image
                  src={player.profile_picture_url || "/placeholder.svg"}
                  alt={`Profilbild von ${player.player_name}`}
                  width={32}
                  height={32}
                  className="rounded-full object-cover border-2 border-white shadow-md"
                  unoptimized={true}
                />
                {isTopThree && (
                  <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full p-1">
                    <Star className="h-2 w-2 text-white" />
                  </div>
                )}
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center text-xs font-bold text-white shadow-md border-2 border-white">
                {player.player_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-bold text-gray-900 text-sm">{player.player_name}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 font-medium">Gesamt</div>
          <div className="font-black text-xl bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
            {player.combinedScore}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-center">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200/30">
          <div className="text-blue-600 font-semibold">Punkte</div>
          <div className="font-black text-blue-800 text-sm">{player.points}</div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-green-100/50 rounded-lg p-3 border border-green-200/30">
          <div className="text-green-600 font-semibold">Legs</div>
          <div className="font-black text-green-800 text-sm">{player.legs}</div>
        </div>
      </div>
    </motion.div>
  )
}

export function TournamentHistorySection({ groupedHistory, loading, error }: TournamentHistorySectionProps) {
  const [expandedTournaments, setExpandedTournaments] = useState<{ [key: string]: boolean }>({})

  const toggleTournament = (key: string) => {
    setExpandedTournaments((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-xl p-3 shadow-lg">
              <History className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Turnier Historie</h2>
              <p className="text-red-100 text-sm font-medium">Vergangene Turnierergebnisse</p>
            </div>
          </div>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-600 mx-auto shadow-lg"></div>
          <p className="mt-4 text-gray-600 font-medium">Lade Turnierhistorie...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 px-4">
        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-8 max-w-md mx-auto shadow-xl">
          <div className="text-red-600 text-xl font-bold mb-3">Fehler beim Laden</div>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  const hasHistory = Object.values(groupedHistory).some((arr) => arr && arr.length > 0)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden hover:shadow-2xl transition-all duration-300">
        {/* Enhanced header with gradient and decorations */}
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 p-6 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-transparent to-red-600/20"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>

          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-white/10">
                <History className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white mb-1">Turnier Historie</h2>
                <p className="text-red-100 font-medium">Vergangene Turnierergebnisse und Platzierungen</p>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
              <Trophy className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="p-0">
          {!hasHistory ? (
            <div className="py-16 text-center">
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-full p-6 w-24 h-24 mx-auto mb-6 shadow-lg">
                <History className="h-12 w-12 text-gray-400 mx-auto" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Keine Turnierhistorie gefunden</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Es sind noch keine vergangenen Turnierdaten vorhanden. Sobald Turniere stattgefunden haben, werden sie
                hier angezeigt.
              </p>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              {groupedHistory.edart && groupedHistory.edart.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-2 shadow-lg">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                      E-Dart Turniere
                    </h3>
                    <div className="h-1 flex-1 bg-gradient-to-r from-blue-200 to-transparent rounded-full"></div>
                  </div>
                  {groupedHistory.edart.map((tournament, index) => {
                    const tournamentKey = `edart-${tournament.date}-${index}`
                    const isExpanded = expandedTournaments[tournamentKey]
                    return (
                      <div
                        key={tournamentKey}
                        className="bg-gradient-to-r from-blue-50/80 to-blue-100/50 backdrop-blur-sm rounded-xl border border-blue-200/30 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <button
                          onClick={() => toggleTournament(tournamentKey)}
                          className="w-full p-5 flex items-center justify-between hover:bg-blue-100/50 transition-all duration-300 group"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 shadow-md group-hover:shadow-lg transition-shadow">
                              <Calendar className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="font-bold text-blue-900 text-lg">{formatDate(tournament.date)}</span>
                            <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-md font-semibold">
                              {tournament.totalParticipants} Spieler
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-1 shadow-sm">
                              <Zap className="h-4 w-4 text-blue-600" />
                              <span className="font-bold text-blue-800">{tournament.totalPoints} P.</span>
                            </div>
                            <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-1 shadow-sm">
                              <Target className="h-4 w-4 text-blue-600" />
                              <span className="font-bold text-blue-800">{tournament.totalLegs} L.</span>
                            </div>
                            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2 shadow-sm">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-blue-600" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                          </div>
                        </button>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="px-5 pb-5"
                          >
                            {/* Enhanced desktop table */}
                            <div className="hidden sm:block bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden border border-blue-200/30 shadow-lg">
                              <table className="w-full">
                                <thead className="bg-gradient-to-r from-blue-500 to-blue-600">
                                  <tr>
                                    <th className="px-4 py-3 text-left font-bold text-white">Platz</th>
                                    <th className="px-4 py-3 text-left font-bold text-white">Spieler</th>
                                    <th className="px-4 py-3 text-center font-bold text-white">Punkte</th>
                                    <th className="px-4 py-3 text-center font-bold text-white">Legs</th>
                                    <th className="px-4 py-3 text-center font-bold text-white">Gesamt</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tournament.rankedPlayers.map((player, playerIndex) => (
                                    <tr
                                      key={player.player_name}
                                      className={`${playerIndex % 2 === 0 ? "bg-white/80" : "bg-blue-50/50"} hover:bg-blue-100/50 transition-colors`}
                                    >
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                          <div className={getPositionBadge(playerIndex + 1)}>{playerIndex + 1}</div>
                                          {getPositionIcon(playerIndex + 1)}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center space-x-3">
                                          {player.profile_picture_url ? (
                                            <Image
                                              src={player.profile_picture_url || "/placeholder.svg"}
                                              alt={`Profilbild von ${player.player_name}`}
                                              width={28}
                                              height={28}
                                              className="rounded-full object-cover border-2 border-white shadow-md"
                                              unoptimized={true}
                                            />
                                          ) : (
                                            <div className="h-7 w-7 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                                              {player.player_name.charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                          <span className="font-bold text-gray-900">{player.player_name}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold text-sm">
                                          {player.points}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold text-sm">
                                          {player.legs}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-1 rounded-full font-black text-sm shadow-md">
                                          {player.combinedScore}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {/* Enhanced mobile cards */}
                            <div className="block sm:hidden space-y-3 mt-4">
                              {tournament.rankedPlayers.map((player, playerIndex) => (
                                <HistoricalPlayerResultCard
                                  key={player.player_name}
                                  player={player}
                                  position={playerIndex + 1}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {groupedHistory.steeldart && groupedHistory.steeldart.length > 0 && (
                <div className="space-y-4 mt-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-2 shadow-lg">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                      Steel Dart Turniere
                    </h3>
                    <div className="h-1 flex-1 bg-gradient-to-r from-green-200 to-transparent rounded-full"></div>
                  </div>
                  {groupedHistory.steeldart.map((tournament, index) => {
                    const tournamentKey = `steeldart-${tournament.date}-${index}`
                    const isExpanded = expandedTournaments[tournamentKey]
                    return (
                      <div
                        key={tournamentKey}
                        className="bg-gradient-to-r from-green-50/80 to-green-100/50 backdrop-blur-sm rounded-xl border border-green-200/30 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <button
                          onClick={() => toggleTournament(tournamentKey)}
                          className="w-full p-5 flex items-center justify-between hover:bg-green-100/50 transition-all duration-300 group"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 shadow-md group-hover:shadow-lg transition-shadow">
                              <Calendar className="h-4 w-4 text-green-600" />
                            </div>
                            <span className="font-bold text-green-900 text-lg">{formatDate(tournament.date)}</span>
                            <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-md font-semibold">
                              {tournament.totalParticipants} Spieler
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-1 shadow-sm">
                              <Zap className="h-4 w-4 text-green-600" />
                              <span className="font-bold text-green-800">{tournament.totalPoints} P.</span>
                            </div>
                            <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-1 shadow-sm">
                              <Users className="h-4 w-4 text-green-600" />
                              <span className="font-bold text-green-800">{tournament.totalLegs} L.</span>
                            </div>
                            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2 shadow-sm">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-green-600" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                          </div>
                        </button>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="px-5 pb-5"
                          >
                            {/* Enhanced desktop table */}
                            <div className="hidden sm:block bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden border border-green-200/30 shadow-lg">
                              <table className="w-full">
                                <thead className="bg-gradient-to-r from-green-500 to-green-600">
                                  <tr>
                                    <th className="px-4 py-3 text-left font-bold text-white">Platz</th>
                                    <th className="px-4 py-3 text-left font-bold text-white">Spieler</th>
                                    <th className="px-4 py-3 text-center font-bold text-white">Punkte</th>
                                    <th className="px-4 py-3 text-center font-bold text-white">Legs</th>
                                    <th className="px-4 py-3 text-center font-bold text-white">Gesamt</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tournament.rankedPlayers.map((player, playerIndex) => (
                                    <tr
                                      key={player.player_name}
                                      className={`${playerIndex % 2 === 0 ? "bg-white/80" : "bg-green-50/50"} hover:bg-green-100/50 transition-colors`}
                                    >
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                          <div className={getPositionBadge(playerIndex + 1)}>{playerIndex + 1}</div>
                                          {getPositionIcon(playerIndex + 1)}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center space-x-3">
                                          {player.profile_picture_url ? (
                                            <Image
                                              src={player.profile_picture_url || "/placeholder.svg"}
                                              alt={`Profilbild von ${player.player_name}`}
                                              width={28}
                                              height={28}
                                              className="rounded-full object-cover border-2 border-white shadow-md"
                                              unoptimized={true}
                                            />
                                          ) : (
                                            <div className="h-7 w-7 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                                              {player.player_name.charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                          <span className="font-bold text-gray-900">{player.player_name}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold text-sm">
                                          {player.points}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold text-sm">
                                          {player.legs}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-1 rounded-full font-black text-sm shadow-md">
                                          {player.combinedScore}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {/* Enhanced mobile cards */}
                            <div className="block sm:hidden space-y-3 mt-4">
                              {tournament.rankedPlayers.map((player, playerIndex) => (
                                <HistoricalPlayerResultCard
                                  key={player.player_name}
                                  player={player}
                                  position={playerIndex + 1}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
