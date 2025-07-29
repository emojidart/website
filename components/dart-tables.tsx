"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Trophy, Target, Users, Medal, Crown, Award, Star, Zap, CheckCircle, AlertCircle } from "lucide-react"
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

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  hover: { scale: 1.02, transition: { type: "spring", stiffness: 400, damping: 25 } },
}

function getPositionBadge(position: number) {
  const baseClasses = "inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm"

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
      return <Crown className="h-5 w-5 text-yellow-500" />
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />
    default:
      return null
  }
}

function QualificationProgress({ current, required }: { current: number; required: number }) {
  const percentage = Math.min((current / required) * 100, 100)
  const isQualified = current >= required

  return (
    <div className="flex items-center space-x-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
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
        <CheckCircle className="h-4 w-4" />
        <span className="text-xs font-bold">FINALE QUALIFIZIERT</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-1 text-red-600">
      <AlertCircle className="h-4 w-4" />
      <span className="text-xs font-bold">NOCH NICHT QUALIFIZIERT</span>
    </div>
  )
}

function TotalParticipationsTable({ players, loading }: { players: CombinedPlayerData[]; loading: boolean }) {
  console.log("TotalParticipationsTable - players:", players, "loading:", loading)

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Gesamt Antritte</h2>
          </div>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Tabelle...</p>
        </div>
      </div>
    )
  }

  if (!players || players.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Gesamt Antritte</h2>
          </div>
        </div>
        <div className="p-8 text-center">
          <p className="text-gray-600">Keine Daten verfügbar</p>
        </div>
      </div>
    )
  }

  const sortedPlayers = [...players]
    .sort((a, b) => b.totalParticipations - a.totalParticipations)
    .map((player, index) => ({ ...player, position: index + 1 }))

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Gesamt Antritte</h2>
          </div>
          <div className="bg-white/20 rounded-lg px-3 py-1">
            <span className="text-white font-semibold">{players.length} Spieler</span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-red-50 border-b border-red-100 p-4">
        <div className="flex items-center space-x-2 text-red-800">
          <Users className="h-5 w-5" />
          <span className="text-sm font-medium">Komplette Übersicht aller Antritte pro Spieler</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Platz
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Spieler
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                E-Dart Antritte
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Steel Antritte
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Gesamt Antritte
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Gesamt Legs
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Gesamt Punkte
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sortedPlayers.map((player, index) => {
              const isTopThree = player.position <= 3
              const edartGames = player.edartParticipations || 0
              const steelGames = player.steelParticipations || 0

              return (
                <motion.tr
                  key={player.name}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  transition={{ delay: index * 0.05 }}
                  className={`hover:bg-gray-50 transition-colors duration-200 ${
                    isTopThree ? "bg-gradient-to-r from-red-50 to-transparent" : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={getPositionBadge(player.position)}>{player.position}</div>
                      {isTopThree && getPositionIcon(player.position)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{player.name.charAt(0).toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className={`text-sm font-bold ${isTopThree ? "text-gray-900" : "text-gray-700"}`}>
                          {player.name}
                        </div>
                        {isTopThree && (
                          <div className="text-xs text-red-600 font-semibold flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Aktivster Spieler #{player.position}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                        {edartGames}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                        {steelGames}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-2xl font-bold text-red-600">{player.totalParticipations}</span>
                      <Users className="h-4 w-4 text-red-500" />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-lg font-semibold text-gray-700">{player.totalLegs}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-lg font-bold text-yellow-600">{player.totalPoints}</span>
                      <Zap className="h-4 w-4 text-yellow-500" />
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Stats */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Gesamt: {players.length} Spieler</span>
          <span>
            Durchschnittliche Antritte pro Spieler:{" "}
            {players.length > 0
              ? Math.round(players.reduce((sum, p) => sum + p.totalParticipations, 0) / players.length)
              : 0}
          </span>
        </div>
      </div>
    </div>
  )
}

// Separate components for each table type
function CombinedTable({ players, loading }: { players: CombinedPlayerData[]; loading: boolean }) {
  console.log("CombinedTable - players:", players, "loading:", loading)

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Gesamtwertung</h2>
          </div>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Tabelle...</p>
        </div>
      </div>
    )
  }

  if (!players || players.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Gesamtwertung</h2>
          </div>
        </div>
        <div className="p-8 text-center">
          <p className="text-gray-600">Keine Daten verfügbar</p>
        </div>
      </div>
    )
  }

  const sortedPlayers = [...players]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((player, index) => ({ ...player, position: index + 1 }))

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Gesamtwertung</h2>
          </div>
          <div className="bg-white/20 rounded-lg px-3 py-1">
            <span className="text-white font-semibold">{players.length} Spieler</span>
          </div>
        </div>
      </div>

      {/* Qualification Info */}
      <div className="bg-blue-50 border-b border-blue-100 p-4">
        <div className="flex items-center space-x-2 text-blue-800">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Für das Finale: 5x E-Dart + 5x Steel Dart erforderlich</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Platz
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Spieler
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                E-Dart Fortschritt
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Steel Fortschritt
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Finale-Status
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Gesamt Punkte
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sortedPlayers.map((player, index) => {
              const isTopThree = player.position <= 3
              // Fix: Use actual individual participations instead of estimates
              const edartGames = player.edartParticipations || 0 // Use actual E-Dart participations
              const steelGames = player.steelParticipations || 0 // Use actual Steel Dart participations

              return (
                <motion.tr
                  key={player.name}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  transition={{ delay: index * 0.05 }}
                  className={`hover:bg-gray-50 transition-colors duration-200 ${
                    isTopThree ? "bg-gradient-to-r from-yellow-50 to-transparent" : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={getPositionBadge(player.position)}>{player.position}</div>
                      {isTopThree && getPositionIcon(player.position)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{player.name.charAt(0).toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className={`text-sm font-bold ${isTopThree ? "text-gray-900" : "text-gray-700"}`}>
                          {player.name}
                        </div>
                        {isTopThree && (
                          <div className="text-xs text-yellow-600 font-semibold flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Top {player.position}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <QualificationProgress current={edartGames} required={5} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <QualificationProgress current={steelGames} required={5} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <QualificationStatus edartGames={edartGames} steelGames={steelGames} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-2xl font-bold text-yellow-600">{player.totalPoints}</span>
                      <Zap className="h-4 w-4 text-yellow-500" />
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Stats */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Gesamt: {players.length} Spieler</span>
          <span>
            Qualifiziert für Finale:{" "}
            {
              sortedPlayers.filter((p) => {
                const edart = p.edartParticipations || 0
                const steel = p.steelParticipations || 0
                return edart >= 5 && steel >= 5
              }).length
            }
          </span>
        </div>
      </div>
    </div>
  )
}

function PlayerDataTable({
  players,
  loading,
  title,
  icon,
}: {
  players: PlayerData[]
  loading: boolean
  title: string
  icon: React.ReactNode
}) {
  console.log(`${title} - players:`, players, "loading:", loading)

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </div>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Tabelle...</p>
        </div>
      </div>
    )
  }

  if (!players || players.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </div>
        </div>
        <div className="p-8 text-center">
          <p className="text-gray-600">Keine Daten verfügbar</p>
        </div>
      </div>
    )
  }

  const sortedPlayers = [...players]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((player, index) => ({ ...player, position: index + 1 }))

  const isEdart = title.includes("E-Dart")

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </div>
          <div className="bg-white/20 rounded-lg px-3 py-1">
            <span className="text-white font-semibold">{players.length} Spieler</span>
          </div>
        </div>
      </div>

      {/* Qualification Info */}
      <div className={`${isEdart ? "bg-blue-50 border-blue-100" : "bg-green-50 border-green-100"} border-b p-4`}>
        <div className={`flex items-center space-x-2 ${isEdart ? "text-blue-800" : "text-green-800"}`}>
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-medium">5 Spiele erforderlich für Finale-Qualifikation</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Platz
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Spieler
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Finale-Fortschritt
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Punkte
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Legs
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Gesamt
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sortedPlayers.map((player, index) => {
              const isTopThree = player.position <= 3
              return (
                <motion.tr
                  key={player.id}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  transition={{ delay: index * 0.05 }}
                  className={`hover:bg-gray-50 transition-colors duration-200 ${
                    isTopThree ? "bg-gradient-to-r from-yellow-50 to-transparent" : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={getPositionBadge(player.position)}>{player.position}</div>
                      {isTopThree && getPositionIcon(player.position)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{player.name.charAt(0).toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className={`text-sm font-bold ${isTopThree ? "text-gray-900" : "text-gray-700"}`}>
                          {player.name}
                        </div>
                        {isTopThree && (
                          <div className="text-xs text-yellow-600 font-semibold flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Top {player.position}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <QualificationProgress current={player.participations} required={5} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-semibold text-gray-700">{player.points}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-semibold text-gray-700">{player.legs}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-2xl font-bold text-yellow-600">{player.totalPoints}</span>
                      <Zap className="h-4 w-4 text-yellow-500" />
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Stats */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Gesamt: {players.length} Spieler</span>
          <span>
            Qualifiziert: {players.filter((p) => p.participations >= 5).length} von {players.length}
          </span>
        </div>
      </div>
    </div>
  )
}

export function DartTables({ edartPlayers, steelDartPlayers, combinedPlayers, loading, error }: DartTablesProps) {
  const [activeTab, setActiveTab] = useState<"combined" | "edart" | "steel" | "total">("combined")

  // Debug logging
  console.log("DartTables - Props:", {
    edartPlayers: edartPlayers?.length || 0,
    steelDartPlayers: steelDartPlayers?.length || 0,
    combinedPlayers: combinedPlayers?.length || 0,
    loading,
    error,
    activeTab,
  })

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <div className="text-red-600 text-lg font-semibold mb-2">Fehler beim Laden</div>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Ranglisten</h1>
        <p className="text-lg text-gray-600">Aktuelle Standings der Competition 2025</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2">
          <div className="flex space-x-2">
            <Button
              onClick={() => setActiveTab("combined")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === "combined"
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Trophy className="h-4 w-4 mr-2" />
              Gesamtwertung ({combinedPlayers?.length || 0})
            </Button>
            <Button
              onClick={() => setActiveTab("edart")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === "edart"
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Target className="h-4 w-4 mr-2" />
              E-Dart ({edartPlayers?.length || 0})
            </Button>
            <Button
              onClick={() => setActiveTab("steel")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === "steel"
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Users className="h-4 w-4 mr-2" />
              Steel Dart ({steelDartPlayers?.length || 0})
            </Button>
            <Button
              onClick={() => setActiveTab("total")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === "total"
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Users className="h-4 w-4 mr-2" />
              Gesamt Antritte ({combinedPlayers?.length || 0})
            </Button>
          </div>
        </div>
      </div>

      {/* Table Content - No AnimatePresence to avoid issues */}
      <div>
        {activeTab === "total" && <TotalParticipationsTable players={combinedPlayers} loading={loading} />}

        {activeTab === "combined" && <CombinedTable players={combinedPlayers} loading={loading} />}

        {activeTab === "edart" && (
          <PlayerDataTable
            players={edartPlayers}
            loading={loading}
            title="E-Dart Tabelle"
            icon={<Target className="h-6 w-6 text-white" />}
          />
        )}

        {activeTab === "steel" && (
          <PlayerDataTable
            players={steelDartPlayers}
            loading={loading}
            title="Steel Dart Tabelle"
            icon={<Users className="h-6 w-6 text-white" />}
          />
        )}
      </div>
    </motion.div>
  )
}
