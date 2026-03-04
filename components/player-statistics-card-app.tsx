"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, Trophy, Target, User } from "lucide-react"
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
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          {/* Header: Rang + Name + Toggle */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Rank */}
              <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                <span className="font-black text-orange-700 text-sm">{index + 1}</span>
              </div>

              {/* Name */}
              <Link
                href={`/liga-app/player-profile/${player.player_id}`}
                className="flex-1 min-w-0 text-base sm:text-lg font-black text-gray-900 leading-tight truncate hover:text-orange-700 transition-colors"
              >
                {player.name}
              </Link>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-9 w-9 p-0 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex-shrink-0"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {/* Main stats (cleaner, weniger bunt) */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-2.5 text-center">
              <div className="text-lg sm:text-xl font-black text-orange-700 leading-none">
                {Number(player.total_points || 0).toFixed(1)}
              </div>
              <div className="text-[11px] text-gray-600 font-bold">Punkte</div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-2.5 text-center">
              <div className="text-lg sm:text-xl font-black text-green-700 leading-none">{player.total_wins}</div>
              <div className="text-[11px] text-gray-600 font-bold">Wins</div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-2.5 text-center">
              <div className="text-lg sm:text-xl font-black text-blue-700 leading-none">
                {Number(player.win_percentage || 0).toFixed(1)}%
              </div>
              <div className="text-[11px] text-gray-600 font-bold">Win%</div>
            </div>
          </div>

          {/* Top Throws (einheitlicher, weniger knallig) */}
          <div className="flex flex-wrap gap-1.5">
            <Badge className="rounded-full border border-gray-200 bg-white text-gray-800 font-black text-[11px] px-2 py-1">
              <Target className="h-3 w-3 mr-1 text-orange-600" />
              {player.throws_180} × 180
            </Badge>

            <Badge className="rounded-full border border-gray-200 bg-white text-gray-800 font-black text-[11px] px-2 py-1">
              {player.throws_171} × 171
            </Badge>

            <Badge className="rounded-full border border-gray-200 bg-white text-gray-800 font-black text-[11px] px-2 py-1">
              {player.throws_high_tonne} × HT
            </Badge>

            <Badge className="rounded-full border border-gray-200 bg-white text-gray-800 font-black text-[11px] px-2 py-1">
              {player.throws_tonne} × T
            </Badge>
          </div>

          {/* Expand details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                  {/* Weitere Spezial-Würfe */}
                  <div>
                    <div className="text-xs font-black text-gray-700 mb-2">Weitere Würfe</div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className="rounded-full border border-gray-200 bg-gray-50 text-gray-800 font-black text-[11px] px-2 py-1">
                        {player.throws_95_plus} × 95+
                      </Badge>
                      <Badge className="rounded-full border border-gray-200 bg-gray-50 text-gray-800 font-black text-[11px] px-2 py-1">
                        {player.throws_shanghai} × Shanghai
                      </Badge>
                      <Badge className="rounded-full border border-gray-200 bg-gray-50 text-gray-800 font-black text-[11px] px-2 py-1">
                        {player.throws_bull || 0} × Bull
                      </Badge>
                    </div>
                  </div>

                  {/* Standard-Würfe */}
                  <div>
                    <div className="text-xs font-black text-gray-700 mb-2">Standard-Würfe (15–20)</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { k: "15er", v: player.throws_15 || 0 },
                        { k: "16er", v: player.throws_16 || 0 },
                        { k: "17er", v: player.throws_17 || 0 },
                        { k: "18er", v: player.throws_18 || 0 },
                        { k: "19er", v: player.throws_19 || 0 },
                        { k: "20er", v: player.throws_20 || 0 },
                      ].map((x) => (
                        <div key={x.k} className="rounded-2xl border border-gray-200 bg-gray-50 p-2 text-center">
                          <div className="font-black text-gray-900 leading-none">{x.v}</div>
                          <div className="text-[11px] text-gray-600 font-bold">{x.k}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 rounded-2xl border-gray-200 bg-white hover:bg-gray-50 font-black"
                      onClick={() => setShowPointsModal(true)}
                    >
                      <Trophy className="h-4 w-4 mr-2 shrink-0" />
                      Punkte
                    </Button>

                    <Link href={`/liga-app/player-profile/${player.player_id}`} className="w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-10 rounded-2xl border-gray-200 bg-white hover:bg-gray-50 font-black"
                      >
                        <User className="h-4 w-4 mr-2 shrink-0" />
                        Profil
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