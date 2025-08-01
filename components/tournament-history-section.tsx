"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { Calendar, Target, Users, ChevronDown, ChevronRight, Zap, Crown, Medal, Award, History } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { GroupedTournamentHistory } from "@/hooks/use-dart-data"
import Image from "next/image"

interface TournamentHistorySectionProps {
  groupedHistory: GroupedTournamentHistory
  loading: boolean
  error: string | null
}

function getPositionBadge(position: number) {
  const baseClasses = "inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs"
  switch (position) {
    case 1:
      return `${baseClasses} bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-md`
    case 2:
      return `${baseClasses} bg-gradient-to-r from-gray-300 to-gray-500 text-white shadow-md`
    case 3:
      return `${baseClasses} bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-md`
    default:
      return `${baseClasses} bg-gray-100 text-gray-700 border border-gray-200`
  }
}

function getPositionIcon(position: number) {
  switch (position) {
    case 1:
      return <Crown className="h-3 w-3 text-yellow-500" />
    case 2:
      return <Medal className="h-3 w-3 text-gray-400" />
    case 3:
      return <Award className="h-3 w-3 text-amber-600" />
    default:
      return null
  }
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
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            <h2 className="text-lg sm:text-2xl font-bold text-white">Turnier Historie</h2>
          </div>
        </div>
        <div className="p-6 sm:p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">Lade Turnierhistorie...</p>
        </div>
      </div>
    )
  }

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

  const hasHistory = Object.values(groupedHistory).some((arr) => arr && arr.length > 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
              <History className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Turnier Historie</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Vergangene Turnierergebnisse und Platzierungen</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {!hasHistory ? (
            <div className="py-12 text-center">
              <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Turnierhistorie gefunden</h3>
              <p className="text-gray-600">Es sind noch keine vergangenen Turnierdaten vorhanden.</p>
            </div>
          ) : (
            <div className="space-y-6 p-4">
              {/* E-Dart Tournaments */}
              {groupedHistory.edart && groupedHistory.edart.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
                    <Target className="h-5 w-5" /> E-Dart Turniere
                  </h3>
                  {groupedHistory.edart.map((tournament, index) => {
                    const tournamentKey = `edart-${tournament.date}-${index}`
                    const isExpanded = expandedTournaments[tournamentKey]
                    return (
                      <div key={tournamentKey} className="bg-blue-50 rounded-lg border border-blue-100 overflow-hidden">
                        <button
                          onClick={() => toggleTournament(tournamentKey)}
                          className="w-full p-4 flex items-center justify-between hover:bg-blue-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-blue-900">{formatDate(tournament.date)}</span>
                            <Badge className="bg-blue-200 text-blue-800 border-0">
                              {tournament.totalParticipants} Spieler
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1 text-blue-600">
                              <Zap className="h-3 w-3" />
                              <span className="text-sm font-semibold">{tournament.totalPoints} P.</span>
                            </div>
                            <div className="flex items-center space-x-1 text-blue-600">
                              <Target className="h-3 w-3" />
                              <span className="text-sm font-semibold">{tournament.totalLegs} L.</span>
                            </div>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-4 pb-4"
                          >
                            <div className="bg-white rounded-md overflow-hidden border border-blue-100">
                              <table className="w-full text-sm">
                                <thead className="bg-blue-100">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-semibold text-blue-900">Platz</th>
                                    <th className="px-3 py-2 text-left font-semibold text-blue-900">Spieler</th>
                                    <th className="px-3 py-2 text-center font-semibold text-blue-900">Punkte</th>
                                    <th className="px-3 py-2 text-center font-semibold text-blue-900">Legs</th>
                                    <th className="px-3 py-2 text-center font-semibold text-blue-900">Gesamt</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tournament.rankedPlayers.map((player, playerIndex) => (
                                    <tr
                                      key={player.player_name}
                                      className={playerIndex % 2 === 0 ? "bg-white" : "bg-blue-25"}
                                    >
                                      <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                          <div className={getPositionBadge(playerIndex + 1)}>{playerIndex + 1}</div>
                                          {getPositionIcon(playerIndex + 1)}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="flex items-center space-x-2">
                                          {player.profile_picture_url ? (
                                            <Image
                                              src={player.profile_picture_url || "/placeholder.svg"}
                                              alt={`Profilbild von ${player.player_name}`}
                                              width={24}
                                              height={24}
                                              className="rounded-full object-cover"
                                              unoptimized={true} // Added unoptimized prop
                                            />
                                          ) : (
                                            <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                              {player.player_name.charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                          <span className="font-medium text-gray-900">{player.player_name}</span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-center text-blue-700 font-semibold">
                                        {player.points}
                                      </td>
                                      <td className="px-3 py-2 text-center text-blue-700 font-semibold">
                                        {player.legs}
                                      </td>
                                      <td className="px-3 py-2 text-center text-blue-900 font-bold">
                                        {player.combinedScore}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Steel Dart Tournaments */}
              {groupedHistory.steeldart && groupedHistory.steeldart.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h3 className="text-lg font-semibold text-green-700 flex items-center gap-2">
                    <Users className="h-5 w-5" /> Steel Dart Turniere
                  </h3>
                  {groupedHistory.steeldart.map((tournament, index) => {
                    const tournamentKey = `steeldart-${tournament.date}-${index}`
                    const isExpanded = expandedTournaments[tournamentKey]
                    return (
                      <div
                        key={tournamentKey}
                        className="bg-green-50 rounded-lg border border-green-100 overflow-hidden"
                      >
                        <button
                          onClick={() => toggleTournament(tournamentKey)}
                          className="w-full p-4 flex items-center justify-between hover:bg-green-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Calendar className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-green-900">{formatDate(tournament.date)}</span>
                            <Badge className="bg-green-200 text-green-800 border-0">
                              {tournament.totalParticipants} Spieler
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1 text-green-600">
                              <Zap className="h-3 w-3" />
                              <span className="text-sm font-semibold">{tournament.totalPoints} P.</span>
                            </div>
                            <div className="flex items-center space-x-1 text-green-600">
                              <Users className="h-3 w-3" />
                              <span className="text-sm font-semibold">{tournament.totalLegs} L.</span>
                            </div>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-4 pb-4"
                          >
                            <div className="bg-white rounded-md overflow-hidden border border-green-100">
                              <table className="w-full text-sm">
                                <thead className="bg-green-100">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-semibold text-green-900">Platz</th>
                                    <th className="px-3 py-2 text-left font-semibold text-green-900">Spieler</th>
                                    <th className="px-3 py-2 text-center font-semibold text-green-900">Punkte</th>
                                    <th className="px-3 py-2 text-center font-semibold text-green-900">Legs</th>
                                    <th className="px-3 py-2 text-center font-semibold text-green-900">Gesamt</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tournament.rankedPlayers.map((player, playerIndex) => (
                                    <tr
                                      key={player.player_name}
                                      className={playerIndex % 2 === 0 ? "bg-white" : "bg-green-25"}
                                    >
                                      <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                          <div className={getPositionBadge(playerIndex + 1)}>{playerIndex + 1}</div>
                                          {getPositionIcon(playerIndex + 1)}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="flex items-center space-x-2">
                                          {player.profile_picture_url ? (
                                            <Image
                                              src={player.profile_picture_url || "/placeholder.svg"}
                                              alt={`Profilbild von ${player.player_name}`}
                                              width={24}
                                              height={24}
                                              className="rounded-full object-cover"
                                              unoptimized={true} // Added unoptimized prop
                                            />
                                          ) : (
                                            <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                              {player.player_name.charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                          <span className="font-medium text-gray-900">{player.player_name}</span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-center text-green-700 font-semibold">
                                        {player.points}
                                      </td>
                                      <td className="px-3 py-2 text-center text-green-700 font-semibold">
                                        {player.legs}
                                      </td>
                                      <td className="px-3 py-2 text-center text-green-900 font-bold">
                                        {player.combinedScore}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
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
        </CardContent>
      </Card>
    </motion.div>
  )
}
