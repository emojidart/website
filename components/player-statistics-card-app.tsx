"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, Trophy, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { PlayerPointsModalApp } from "@/components/player-points-modal-app"

interface PlayerStatisticsCardAppProps {
  player: any
  index: number
  allStats: any[]
}

export function PlayerStatisticsCardApp({ player, index, allStats }: PlayerStatisticsCardAppProps) {
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
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          {/* Header mit Rang und Name */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-md">
                <span className="font-bold text-white text-lg">{index + 1}</span>
              </div>
              <Link
                href={`/liga-app/player-profile/${player.player_id}`}
                className="font-bold text-lg hover:text-primary transition-colors"
              >
                {player.name}
              </Link>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8 p-0">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {/* Hauptstatistiken */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-2 text-center">
              <div className="text-2xl font-bold text-orange-600">{player.total_points.toFixed(1)}</div>
              <div className="text-xs text-gray-600">Punkte</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2 text-center">
              <div className="text-2xl font-bold text-green-600">{player.total_wins}</div>
              <div className="text-xs text-gray-600">Wins</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 text-center">
              <div className="text-2xl font-bold text-blue-600">{player.win_percentage.toFixed(1)}%</div>
              <div className="text-xs text-gray-600">Win%</div>
            </div>
          </div>

          {/* Top-Würfe */}
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-red-100 text-red-700 font-semibold">
              <Target className="h-3 w-3 mr-1" />
              {player.throws_180} × 180
            </Badge>
            <Badge className="bg-purple-100 text-purple-700 font-semibold">{player.throws_171} × 171</Badge>
            <Badge className="bg-orange-100 text-orange-700 font-semibold">{player.throws_high_tonne} × HT</Badge>
            <Badge className="bg-green-100 text-green-700 font-semibold">{player.throws_tonne} × T</Badge>
          </div>

          {/* Aufklappbare Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t space-y-3">
                  {/* Weitere Spezial-Würfe */}
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-2">Weitere Würfe</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-100 text-blue-700">{player.throws_95_plus} × 95+</Badge>
                      <Badge className="bg-yellow-100 text-yellow-700">{player.throws_shanghai} × Shanghai</Badge>
                      <Badge className="bg-pink-100 text-pink-700">{player.throws_bull || 0} × Bull</Badge>
                    </div>
                  </div>

                  {/* Standard-Würfe (15er-20er) */}
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-2">Standard-Würfe (15er-20er)</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <div className="font-bold text-gray-900">{player.throws_15 || 0}</div>
                        <div className="text-xs text-gray-600">15er</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <div className="font-bold text-gray-900">{player.throws_16 || 0}</div>
                        <div className="text-xs text-gray-600">16er</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <div className="font-bold text-gray-900">{player.throws_17 || 0}</div>
                        <div className="text-xs text-gray-600">17er</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <div className="font-bold text-gray-900">{player.throws_18 || 0}</div>
                        <div className="text-xs text-gray-600">18er</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <div className="font-bold text-gray-900">{player.throws_19 || 0}</div>
                        <div className="text-xs text-gray-600">19er</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <div className="font-bold text-gray-900">{player.throws_20}</div>
                        <div className="text-xs text-gray-600">20er</div>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={() => setShowPointsModal(true)}
                    >
                      <Trophy className="h-4 w-4 mr-2" />
                      Punkte-Details
                    </Button>
                    <Link href={`/liga-app/player-profile/${player.player_id}`} className="flex-1">
                      <Button variant="default" size="sm" className="w-full">
                        Profil ansehen
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <PlayerPointsModalApp
        isOpen={showPointsModal}
        onClose={() => setShowPointsModal(false)}
        player={player}
        pointsBreakdown={pointsBreakdown}
      />
    </>
  )
}
