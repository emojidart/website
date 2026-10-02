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
    return "bg-gradient-to-br from-gray-100 to-gray-200 text-white/70"
  }

  const getTopBadge = () => {
    if (index === 0) return { text: "GOLD", cls: "bg-amber-500/100 text-white border-yellow-600" }
    if (index === 1) return { text: "SILBER", cls: "bg-gray-500 text-white border-gray-600" }
    if (index === 2) return { text: "BRONZE", cls: "bg-orange-600 text-white border-orange-700" }
    return null
  }

  const getCardAccent = () => {
    if (index === 0) return "ring-1 ring-amber-400/35 shadow-[0_18px_55px_-44px_rgba(245,158,11,.22)]"
    if (index === 1) return "ring-1 ring-white/20"
    if (index === 2) return "ring-1 ring-orange-400/30"
    return ""
  }

  const topBadge = getTopBadge()
  const cardAccent = getCardAccent()

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-[22px] border border-orange-300/[0.10] bg-black/25 text-white shadow-[0_18px_52px_-42px_rgba(0,0,0,.95)] transition-all hover:border-orange-300/20 hover:bg-white/[0.035] backdrop-blur-xl",
        cardAccent,
        index === 0 ? "bg-[radial-gradient(circle_at_0%_100%,rgba(245,158,11,.12),transparent_38%)]" : "",
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
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover border border-white/10 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-orange-300" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              {/*  */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base text-white leading-tight line-clamp-2">
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

              <div className="text-[11px] text-white/40 mt-1">{team.played} Spiele</div>
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
              className="p-1 hover:bg-white/[0.08] rounded-lg transition-colors"
              aria-label={isExpanded ? "Details einklappen" : "Details ausklappen"}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-white/50" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/50" />
              )}
            </button>
          </div>
        </div>

        {/* S / U / N kompakt */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1.5 border border-emerald-300/10 bg-emerald-500/[0.07] rounded-xl px-2 py-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500/100"></div>
            <span className="text-xs sm:text-sm font-bold text-emerald-300">{team.won}</span>
            <span className="text-[11px] text-white/50">S</span>
          </div>

          <div className="flex items-center gap-1.5 border border-amber-300/10 bg-amber-500/[0.07] rounded-xl px-2 py-1">
            <div className="w-2 h-2 rounded-full bg-amber-500/100"></div>
            <span className="text-xs sm:text-sm font-bold text-amber-300">{team.drawn}</span>
            <span className="text-[11px] text-white/50">U</span>
          </div>

          <div className="flex items-center gap-1.5 border border-red-300/10 bg-red-500/[0.07] rounded-xl px-2 py-1">
            <div className="w-2 h-2 rounded-full bg-red-500/100"></div>
            <span className="text-xs sm:text-sm font-bold text-red-300">{team.lost}</span>
            <span className="text-[11px] text-white/50">N</span>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/[0.08]">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-500/[0.07] rounded-xl p-2 text-center">
                <div className="text-lg sm:text-xl font-bold text-emerald-300">{team.won}</div>
                <div className="text-[11px] text-white/50 mt-0.5">Siege</div>
              </div>

              <div className="bg-amber-500/[0.07] rounded-xl p-2 text-center">
                <div className="text-lg sm:text-xl font-bold text-amber-300">{team.drawn}</div>
                <div className="text-[11px] text-white/50 mt-0.5">Unentschieden</div>
              </div>

              <div className="bg-red-500/[0.07] rounded-xl p-2 text-center">
                <div className="text-lg sm:text-xl font-bold text-red-300">{team.lost}</div>
                <div className="text-[11px] text-white/50 mt-0.5">Niederlagen</div>
              </div>

              <div className="bg-sky-500/[0.07] rounded-xl p-2 text-center">
                <div className="text-lg sm:text-xl font-bold text-sky-300">
                  {team.legsFor}:{team.legsAgainst}
                </div>
                <div className="text-[11px] text-white/50 mt-0.5">Legs</div>
              </div>

              <div className="bg-violet-500/[0.07] rounded-xl p-2 text-center col-span-2">
                <div
                  className={`text-lg sm:text-xl font-bold ${
                    team.legsDifference >= 0 ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {team.legsDifference > 0 ? "+" : ""}
                  {team.legsDifference}
                </div>
                <div className="text-[11px] text-white/50 mt-0.5">Legs-Differenz</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}