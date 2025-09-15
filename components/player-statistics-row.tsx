"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"

interface PlayerStatisticsRowProps {
  player: any
  index: number
  allStats: any[]
}

export function PlayerStatisticsRow({ player, index, allStats }: PlayerStatisticsRowProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Calculate detailed stats for this specific player
  const playerDetailedStats = allStats
    .filter((stat) => stat.player_id === player.player_id)
    .reduce((acc, stat) => {
      return {
        throws_15: (acc.throws_15 || 0) + (stat.throws_15 || 0),
        throws_16: (acc.throws_16 || 0) + (stat.throws_16 || 0),
        throws_17: (acc.throws_17 || 0) + (stat.throws_17 || 0),
        throws_18: (acc.throws_18 || 0) + (stat.throws_18 || 0),
        throws_19: (acc.throws_19 || 0) + (stat.throws_19 || 0),
        throws_shanghai: (acc.throws_shanghai || 0) + (stat.throws_shanghai || 0),
        throws_95_plus: (acc.throws_95_plus || 0) + (stat.throws_95_plus || 0),
        throws_bull: (acc.throws_bull || 0) + (stat.throws_bull || 0),
        throws_171: (acc.throws_171 || 0) + (stat.throws_171 || 0),
      }
    }, {})

  return (
    <>
      <tr
        className={`border-b hover:bg-gray-50 transition-colors ${index < 3 ? "bg-gradient-to-r from-amber-50 to-yellow-50" : ""}`}
      >
        <td className="p-2 sm:p-4">
          <div
            className={`w-6 h-6 sm:w-8 sm:h-8 ${index < 3 ? "bg-amber-100" : "bg-blue-100"} rounded-full flex items-center justify-center`}
          >
            <span className={`font-bold ${index < 3 ? "text-amber-600" : "text-blue-600"} text-xs sm:text-sm`}>
              {index + 1}
            </span>
          </div>
        </td>
        <td className="p-2 sm:p-4">
          <a
            href={`/liga/spieler/${player.player_id}`}
            className="font-semibold text-gray-900 text-sm sm:text-lg hover:text-blue-600 hover:underline transition-colors cursor-pointer"
          >
            {player.name}
          </a>
        </td>
        <td className="text-center p-2 sm:p-4 font-medium text-xs sm:text-sm">{player.total_legs}</td>
        <td className="text-center p-2 sm:p-4">
          <Badge className="bg-green-100 text-green-800 font-bold text-xs">{player.total_wins}</Badge>
        </td>
        <td className="text-center p-2 sm:p-4">
          <Badge variant="outline" className="font-bold text-xs">
            {player.win_percentage.toFixed(1)}%
          </Badge>
        </td>
        <td className="text-center p-2 sm:p-4">
          <Badge className="bg-red-100 text-red-800 font-bold text-xs">{player.throws_180}</Badge>
        </td>
        <td className="text-center p-2 sm:p-4">
          <Badge className="bg-purple-100 text-purple-800 font-bold text-xs">{player.throws_171}</Badge>
        </td>
        <td className="text-center p-2 sm:p-4">
          <Badge className="bg-orange-100 text-orange-800 font-bold text-xs">{player.throws_high_tonne}</Badge>
        </td>
        <td className="text-center p-2 sm:p-4">
          <Badge className="bg-green-100 text-green-800 font-bold text-xs">{player.throws_tonne}</Badge>
        </td>
        <td className="text-center p-2 sm:p-4">
          <Badge className="bg-teal-100 text-teal-800 font-bold text-xs">{player.throws_95_plus}</Badge>
        </td>
        <td className="text-center p-2 sm:p-4">
          <Badge className="bg-indigo-100 text-indigo-800 font-bold text-xs">{player.throws_shanghai}</Badge>
        </td>
        <td className="text-center p-2 sm:p-4">
          <Badge className="bg-pink-100 text-pink-800 font-bold text-xs">{player.throws_bull}</Badge>
        </td>
        <td className="text-center p-2 sm:p-4">
          <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)} className="text-xs">
            {showDetails ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Weniger
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Mehr anzeigen
              </>
            )}
          </Button>
        </td>
      </tr>
      {showDetails && (
        <tr className="bg-gray-50">
          <td colSpan={13} className="p-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-3">Detaillierte Statistiken für {player.name}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="text-lg font-bold text-yellow-600">{player.throws_20 || 0}</div>
                  <div className="text-xs text-gray-600">20er</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="text-lg font-bold text-yellow-600">{playerDetailedStats.throws_19 || 0}</div>
                  <div className="text-xs text-gray-600">19er</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="text-lg font-bold text-yellow-600">{playerDetailedStats.throws_18 || 0}</div>
                  <div className="text-xs text-gray-600">18er</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="text-lg font-bold text-yellow-600">{playerDetailedStats.throws_17 || 0}</div>
                  <div className="text-xs text-gray-600">17er</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="text-lg font-bold text-yellow-600">{playerDetailedStats.throws_16 || 0}</div>
                  <div className="text-xs text-gray-600">16er</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="text-lg font-bold text-yellow-600">{playerDetailedStats.throws_15 || 0}</div>
                  <div className="text-xs text-gray-600">15er</div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
