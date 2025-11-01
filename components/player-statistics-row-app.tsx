"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronDown, ChevronUp, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { PlayerPointsModalApp } from "@/components/player-points-modal-app"

interface PlayerStatisticsRowAppProps {
  player: any
  index: number
  allStats: any[]
}

export function PlayerStatisticsRowApp({ player, index, allStats }: PlayerStatisticsRowAppProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showPointsModal, setShowPointsModal] = useState(false)

  const calculatePointsBreakdown = () => {
    const legWinPoints = player.total_wins * 3
    const throw180Points = player.throws_180 * 25
    const throw171Points = player.throws_171 * 25
    const highTonnePoints = player.throws_high_tonne * 18
    const tonnePoints = player.throws_tonne * 15
    const throw95PlusPoints = player.throws_95_plus * 12
    const shanghaiPoints = player.throws_shanghai * 10
    const bullPoints = (player.throws_bull || 0) * 8
    const throw20Points = player.throws_20 * 6
    const throw19Points = player.throws_19 * 5
    const throw18Points = player.throws_18 * 4
    const throw17Points = player.throws_17 * 3
    const throw16Points = player.throws_16 * 2
    const throw15Points = player.throws_15 * 1

    const totalPoints =
      legWinPoints +
      throw180Points +
      throw171Points +
      highTonnePoints +
      tonnePoints +
      throw95PlusPoints +
      shanghaiPoints +
      bullPoints +
      throw20Points +
      throw19Points +
      throw18Points +
      throw17Points +
      throw16Points +
      throw15Points

    return {
      legWinPoints,
      throw180Points,
      throw171Points,
      highTonnePoints,
      tonnePoints,
      throw95PlusPoints,
      bullPoints,
      shanghaiPoints,
      throw20Points,
      throw19Points,
      throw18Points,
      throw17Points,
      throw16Points,
      throw15Points,
      totalPoints,
    }
  }

  const pointsBreakdown = calculatePointsBreakdown()

  return (
    <>
      <tr className="border-b border-border hover:bg-muted/50 transition-colors">
        <td className="p-2 sm:p-4 text-center">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <span className="font-bold text-orange-600 text-xs sm:text-sm">{index + 1}</span>
          </div>
        </td>

        <td className="p-2 sm:p-4">
          <Link
            href={`/liga-app/player-profile/${player.player_id}`}
            className="font-medium hover:text-primary transition-colors text-sm sm:text-base"
          >
            {player.name}
          </Link>
        </td>

        <td className="p-2 sm:p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <Badge variant="secondary" className="font-semibold text-xs sm:text-sm">
              {player.total_points.toFixed(1)}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-8 sm:w-8"
              onClick={() => setShowPointsModal(true)}
            >
              <Info className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </td>

        <td className="p-2 sm:p-4 text-center font-medium text-sm">{player.total_legs}</td>
        <td className="p-2 sm:p-4 text-center font-medium text-sm">{player.total_wins}</td>
        <td className="p-2 sm:p-4 text-center font-medium text-sm">{player.win_percentage.toFixed(1)}%</td>
        <td className="p-2 sm:p-4 text-center">
          <Badge className="bg-red-100 text-red-700 font-semibold text-xs sm:text-sm">{player.throws_180}</Badge>
        </td>
        <td className="p-2 sm:p-4 text-center">
          <Badge className="bg-purple-100 text-purple-700 font-semibold text-xs sm:text-sm">{player.throws_171}</Badge>
        </td>
        <td className="p-2 sm:p-4 text-center">
          <Badge className="bg-orange-100 text-orange-700 font-semibold text-xs sm:text-sm">
            {player.throws_high_tonne}
          </Badge>
        </td>
        <td className="p-2 sm:p-4 text-center">
          <Badge className="bg-green-100 text-green-700 font-semibold text-xs sm:text-sm">{player.throws_tonne}</Badge>
        </td>
        <td className="p-2 sm:p-4 text-center">
          <Badge className="bg-blue-100 text-blue-700 font-semibold text-xs sm:text-sm">{player.throws_95_plus}</Badge>
        </td>
        <td className="p-2 sm:p-4 text-center">
          <Badge className="bg-yellow-100 text-yellow-700 font-semibold text-xs sm:text-sm">
            {player.throws_shanghai}
          </Badge>
        </td>
        <td className="p-2 sm:p-4 text-center">
          <Badge className="bg-pink-100 text-pink-700 font-semibold text-xs sm:text-sm">
            {player.throws_bull || 0}
          </Badge>
        </td>
        <td className="p-2 sm:p-4 text-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 sm:h-8 sm:w-8"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : (
              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
          </Button>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={14} className="p-0">
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-muted/30 space-y-3">
                <div className="text-xs text-muted-foreground mb-2">Weitere Würfe (15er-20er)</div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-sm">
                  <div className="flex justify-between bg-white p-2 rounded">
                    <span className="text-muted-foreground">15er:</span>
                    <span className="font-semibold">{player.throws_15 || 0}</span>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded">
                    <span className="text-muted-foreground">16er:</span>
                    <span className="font-semibold">{player.throws_16 || 0}</span>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded">
                    <span className="text-muted-foreground">17er:</span>
                    <span className="font-semibold">{player.throws_17 || 0}</span>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded">
                    <span className="text-muted-foreground">18er:</span>
                    <span className="font-semibold">{player.throws_18 || 0}</span>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded">
                    <span className="text-muted-foreground">19er:</span>
                    <span className="font-semibold">{player.throws_19 || 0}</span>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded">
                    <span className="text-muted-foreground">20er:</span>
                    <span className="font-semibold">{player.throws_20}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </td>
        </tr>
      )}

      <PlayerPointsModalApp
        isOpen={showPointsModal}
        onClose={() => setShowPointsModal(false)}
        player={player}
        pointsBreakdown={pointsBreakdown}
      />
    </>
  )
}
