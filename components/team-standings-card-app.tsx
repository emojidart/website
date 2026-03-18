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
    if (index === 0) return "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white"
    if (index === 1) return "bg-gradient-to-br from-gray-300 to-gray-500 text-white"
    if (index === 2) return "bg-gradient-to-br from-orange-400 to-orange-600 text-white"
    return "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700"
  }

  const getTopBadge = () => {
    if (index === 0) return { text: "GOLD", cls: "bg-yellow-500 text-white border-yellow-600" }
    if (index === 1) return { text: "SILBER", cls: "bg-gray-500 text-white border-gray-600" }
    if (index === 2) return { text: "BRONZE", cls: "bg-orange-600 text-white border-orange-700" }
    return null
  }

  const getCardAccent = () => {
    if (index === 0) return "ring-2 ring-yellow-400/60 shadow-lg shadow-yellow-200/50"
    if (index === 1) return "ring-1 ring-gray-400/60 shadow-md shadow-gray-200/60"
    if (index === 2) return "ring-1 ring-orange-400/60 shadow-md shadow-orange-200/60"
    return ""
  }

  const topBadge = getTopBadge()
  const cardAccent = getCardAccent()

  return (
    <div
      className={[
        "relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden",
        cardAccent,
        index === 0 ? "bg-gradient-to-br from-yellow-50/60 via-white to-white" : "",
      ].join(" ")}
    >
 

      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          {/* Platz */}
          <div
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center ${getPositionColor()} shadow-sm flex-shrink-0`}
          >
            <span className="font-bold text-sm sm:text-base">{index + 1}</span>
          </div>

          {/* Team + Logo */}
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            {teamData?.logo_url ? (
              <img
                src={teamData.logo_url || "/placeholder.svg"}
                alt={`${team.team} Logo`}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover border border-gray-200 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              {/*  */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base text-gray-900 leading-tight line-clamp-2">
                  {team.team}
                </div>

                {/* */}
                {topBadge && (
                  <div className="flex">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none ${topBadge.cls}`}
                    >
                      <span className="text-[10px]">🏆</span>
                      {topBadge.text}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-gray-500 mt-1">{team.played} Spiele</div>
            </div>
          </div>

          {/* Punkte + Expand */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg px-2.5 py-1.5 shadow-sm">
              <div className="text-lg sm:text-xl font-bold leading-none text-center">{team.points}</div>
              <div className="text-[10px] font-medium mt-0.5 text-center">Punkte</div>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={isExpanded ? "Details einklappen" : "Details ausklappen"}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* S / U / N kompakt */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1.5 bg-green-50 rounded-lg px-2 py-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs sm:text-sm font-bold text-green-700">{team.won}</span>
            <span className="text-[11px] text-gray-600">S</span>
          </div>

          <div className="flex items-center gap-1.5 bg-yellow-50 rounded-lg px-2 py-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span className="text-xs sm:text-sm font-bold text-yellow-700">{team.drawn}</span>
            <span className="text-[11px] text-gray-600">U</span>
          </div>

          <div className="flex items-center gap-1.5 bg-red-50 rounded-lg px-2 py-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-xs sm:text-sm font-bold text-red-700">{team.lost}</span>
            <span className="text-[11px] text-gray-600">N</span>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <div className="text-lg sm:text-xl font-bold text-green-600">{team.won}</div>
                <div className="text-[11px] text-gray-600 mt-0.5">Siege</div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-2 text-center">
                <div className="text-lg sm:text-xl font-bold text-yellow-600">{team.drawn}</div>
                <div className="text-[11px] text-gray-600 mt-0.5">Unentschieden</div>
              </div>

              <div className="bg-red-50 rounded-lg p-2 text-center">
                <div className="text-lg sm:text-xl font-bold text-red-600">{team.lost}</div>
                <div className="text-[11px] text-gray-600 mt-0.5">Niederlagen</div>
              </div>

              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <div className="text-lg sm:text-xl font-bold text-blue-600">
                  {team.legsFor}:{team.legsAgainst}
                </div>
                <div className="text-[11px] text-gray-600 mt-0.5">Legs</div>
              </div>

              <div className="bg-purple-50 rounded-lg p-2 text-center col-span-2">
                <div
                  className={`text-lg sm:text-xl font-bold ${
                    team.legsDifference >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {team.legsDifference > 0 ? "+" : ""}
                  {team.legsDifference}
                </div>
                <div className="text-[11px] text-gray-600 mt-0.5">Legs-Differenz</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}