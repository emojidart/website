"use client"

import { useState } from "react"
import { Trophy, ChevronDown, ChevronUp } from "lucide-react"

interface TeamStandingsCardAppProps {
  team: any
  index: number
  teamData: any
}

export function TeamStandingsCardApp({ team, index, teamData }: TeamStandingsCardAppProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getPositionColor = () => {
    if (index === 0) return "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white" // Gold
    if (index === 1) return "bg-gradient-to-br from-gray-300 to-gray-500 text-white" // Silver
    if (index === 2) return "bg-gradient-to-br from-orange-400 to-orange-600 text-white" // Bronze
    return "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700"
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${getPositionColor()} shadow-md flex-shrink-0`}
          >
            <span className="font-bold text-base">{index + 1}</span>
          </div>

          <div className="flex items-start gap-3 flex-1 min-w-0">
            {teamData?.logo_url ? (
              <img
                src={teamData.logo_url || "/placeholder.svg"}
                alt={`${team.team} Logo`}
                className="w-10 h-10 rounded-lg object-cover border-2 border-gray-200 flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Trophy className="h-5 w-5 text-orange-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base text-gray-900 line-clamp-2 leading-tight">{team.team}</div>
              <div className="text-xs text-gray-500 mt-1">{team.played} Spiele</div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg px-3 py-2 shadow-md">
              <div className="text-2xl font-bold leading-none">{team.points}</div>
              <div className="text-[10px] font-medium mt-0.5">Punkte</div>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 ml-13">
          <div className="flex items-center gap-1.5 bg-green-50 rounded-lg px-2.5 py-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm font-bold text-green-700">{team.won}</span>
            <span className="text-xs text-gray-600">S</span>
          </div>
          <div className="flex items-center gap-1.5 bg-yellow-50 rounded-lg px-2.5 py-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span className="text-sm font-bold text-yellow-700">{team.drawn}</span>
            <span className="text-xs text-gray-600">U</span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-50 rounded-lg px-2.5 py-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-sm font-bold text-red-700">{team.lost}</span>
            <span className="text-xs text-gray-600">N</span>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{team.won}</div>
                <div className="text-xs text-gray-600 mt-1">Siege</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">{team.drawn}</div>
                <div className="text-xs text-gray-600 mt-1">Unentschieden</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{team.lost}</div>
                <div className="text-xs text-gray-600 mt-1">Niederlagen</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {team.legsFor}:{team.legsAgainst}
                </div>
                <div className="text-xs text-gray-600 mt-1">Legs</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center col-span-2">
                <div className={`text-2xl font-bold ${team.legsDifference >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {team.legsDifference > 0 ? "+" : ""}
                  {team.legsDifference}
                </div>
                <div className="text-xs text-gray-600 mt-1">Legs-Differenz</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
