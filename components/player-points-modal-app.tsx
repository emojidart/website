"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Target, Award, X } from "lucide-react"

interface PlayerPointsModalProps {
  isOpen: boolean
  onClose: () => void
  player: any
  pointsBreakdown: {
    legWinPoints: number
    throw180Points: number
    throw171Points: number
    highTonnePoints: number
    tonnePoints: number
    throw95PlusPoints: number
    bullPoints: number
    shanghaiPoints: number
    throw20Points: number
    throw19Points: number
    throw18Points: number
    throw17Points: number
    throw16Points: number
    throw15Points: number
    totalPoints: number
  }
}

export function PlayerPointsModalApp({ isOpen, onClose, player, pointsBreakdown }: PlayerPointsModalProps) {
  const throw20Count = pointsBreakdown.throw20Points / 6
  const throw19Count = pointsBreakdown.throw19Points / 5
  const throw18Count = pointsBreakdown.throw18Points / 4
  const throw17Count = pointsBreakdown.throw17Points / 3
  const throw16Count = pointsBreakdown.throw16Points / 2
  const throw15Count = pointsBreakdown.throw15Points / 1

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-24px)] sm:max-w-md p-0 overflow-hidden rounded-2xl border shadow-2xl">
        {/* Sticky Header */}
        <DialogHeader className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="min-w-0 flex items-center gap-2 text-base sm:text-lg font-bold">
              <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
              <span className="truncate">Punkteübersicht</span>
            </DialogTitle>

            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-xs sm:text-sm text-gray-500 truncate">{player?.name}</div>
        </DialogHeader>

        {/* Scroll Area */}
        <div className="max-h-[75vh] sm:max-h-[80vh] overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {/* Total Points */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center justify-between">
                <div className="text-xs sm:text-sm text-gray-600">Gesamtpunkte</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                  {pointsBreakdown.totalPoints.toFixed(1)}
                </div>
              </div>
              {/* kleine optische Progress-Leiste (nur Design) */}
              <div className="mt-2 h-2 w-full bg-amber-100 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-amber-400 rounded-full" />
              </div>
            </div>

            {/* Leg Wins */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <Target className="w-4 h-4" />
                Leg-Wins
              </div>
              <div className="bg-green-50 rounded-xl p-3 flex justify-between items-center border border-green-100">
                <span className="text-xs sm:text-sm text-gray-700">{player.total_wins} Siege × 3 Punkte</span>
                <Badge className="bg-green-600 text-white font-bold text-xs sm:text-sm px-2.5 py-1">
                  {pointsBreakdown.legWinPoints} Pkt
                </Badge>
              </div>
            </div>

            {/* Special Throws */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <Award className="w-4 h-4" />
                Spezielle Würfe
              </div>

              <div className="grid grid-cols-1 gap-2">
                {pointsBreakdown.throw180Points > 0 && (
                  <div className="bg-red-50 rounded-xl p-3 flex justify-between items-center border border-red-100">
                    <span className="text-xs sm:text-sm text-gray-700">{player.throws_180} × 180er (25)</span>
                    <Badge className="bg-red-600 text-white font-bold text-xs sm:text-sm px-2.5 py-1">
                      {pointsBreakdown.throw180Points} Pkt
                    </Badge>
                  </div>
                )}

                {pointsBreakdown.throw171Points > 0 && (
                  <div className="bg-purple-50 rounded-xl p-3 flex justify-between items-center border border-purple-100">
                    <span className="text-xs sm:text-sm text-gray-700">{player.throws_171} × 171er (25)</span>
                    <Badge className="bg-purple-600 text-white font-bold text-xs sm:text-sm px-2.5 py-1">
                      {pointsBreakdown.throw171Points} Pkt
                    </Badge>
                  </div>
                )}

                {pointsBreakdown.highTonnePoints > 0 && (
                  <div className="bg-orange-50 rounded-xl p-3 flex justify-between items-center border border-orange-100">
                    <span className="text-xs sm:text-sm text-gray-700">
                      {player.throws_high_tonne} × High Tonne (18)
                    </span>
                    <Badge className="bg-orange-600 text-white font-bold text-xs sm:text-sm px-2.5 py-1">
                      {pointsBreakdown.highTonnePoints} Pkt
                    </Badge>
                  </div>
                )}

                {pointsBreakdown.tonnePoints > 0 && (
                  <div className="bg-green-50 rounded-xl p-3 flex justify-between items-center border border-green-100">
                    <span className="text-xs sm:text-sm text-gray-700">{player.throws_tonne} × Tonne (15)</span>
                    <Badge className="bg-green-600 text-white font-bold text-xs sm:text-sm px-2.5 py-1">
                      {pointsBreakdown.tonnePoints} Pkt
                    </Badge>
                  </div>
                )}

                {pointsBreakdown.throw95PlusPoints > 0 && (
                  <div className="bg-teal-50 rounded-xl p-3 flex justify-between items-center border border-teal-100">
                    <span className="text-xs sm:text-sm text-gray-700">{player.throws_95_plus} × 95+ (12)</span>
                    <Badge className="bg-teal-600 text-white font-bold text-xs sm:text-sm px-2.5 py-1">
                      {pointsBreakdown.throw95PlusPoints} Pkt
                    </Badge>
                  </div>
                )}

                {pointsBreakdown.shanghaiPoints > 0 && (
                  <div className="bg-indigo-50 rounded-xl p-3 flex justify-between items-center border border-indigo-100">
                    <span className="text-xs sm:text-sm text-gray-700">{player.throws_shanghai} × Shanghai (10)</span>
                    <Badge className="bg-indigo-600 text-white font-bold text-xs sm:text-sm px-2.5 py-1">
                      {pointsBreakdown.shanghaiPoints} Pkt
                    </Badge>
                  </div>
                )}

                <div className="bg-pink-50 rounded-xl p-3 flex justify-between items-center border border-pink-100">
                  <span className="text-xs sm:text-sm text-gray-700">{player.throws_bull || 0} × Bull (8)</span>
                  <Badge className="bg-pink-600 text-white font-bold text-xs sm:text-sm px-2.5 py-1">
                    {pointsBreakdown.bullPoints} Pkt
                  </Badge>
                </div>
              </div>
            </div>

            {/* Number Throws */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <Target className="w-4 h-4" />
                Standard-Würfe (15–20)
              </div>

              <div className="grid grid-cols-2 gap-2">
                {pointsBreakdown.throw20Points > 0 && (
                  <div className="bg-yellow-50 rounded-xl p-3 flex justify-between items-center border border-yellow-100">
                    <span className="text-xs sm:text-sm text-gray-700">{throw20Count} × 20er (6)</span>
                    <Badge variant="outline" className="text-xs sm:text-sm font-bold px-2.5 py-1">
                      {pointsBreakdown.throw20Points} Pkt
                    </Badge>
                  </div>
                )}

                {pointsBreakdown.throw19Points > 0 && (
                  <div className="bg-yellow-50 rounded-xl p-3 flex justify-between items-center border border-yellow-100">
                    <span className="text-xs sm:text-sm text-gray-700">{throw19Count} × 19er (5)</span>
                    <Badge variant="outline" className="text-xs sm:text-sm font-bold px-2.5 py-1">
                      {pointsBreakdown.throw19Points} Pkt
                    </Badge>
                  </div>
                )}

                {pointsBreakdown.throw18Points > 0 && (
                  <div className="bg-yellow-50 rounded-xl p-3 flex justify-between items-center border border-yellow-100">
                    <span className="text-xs sm:text-sm text-gray-700">{throw18Count} × 18er (4)</span>
                    <Badge variant="outline" className="text-xs sm:text-sm font-bold px-2.5 py-1">
                      {pointsBreakdown.throw18Points} Pkt
                    </Badge>
                  </div>
                )}

                {pointsBreakdown.throw17Points > 0 && (
                  <div className="bg-yellow-50 rounded-xl p-3 flex justify-between items-center border border-yellow-100">
                    <span className="text-xs sm:text-sm text-gray-700">{throw17Count} × 17er (3)</span>
                    <Badge variant="outline" className="text-xs sm:text-sm font-bold px-2.5 py-1">
                      {pointsBreakdown.throw17Points} Pkt
                    </Badge>
                  </div>
                )}

                {pointsBreakdown.throw16Points > 0 && (
                  <div className="bg-yellow-50 rounded-xl p-3 flex justify-between items-center border border-yellow-100">
                    <span className="text-xs sm:text-sm text-gray-700">{throw16Count} × 16er (2)</span>
                    <Badge variant="outline" className="text-xs sm:text-sm font-bold px-2.5 py-1">
                      {pointsBreakdown.throw16Points} Pkt
                    </Badge>
                  </div>
                )}

                {pointsBreakdown.throw15Points > 0 && (
                  <div className="bg-yellow-50 rounded-xl p-3 flex justify-between items-center border border-yellow-100">
                    <span className="text-xs sm:text-sm text-gray-700">{throw15Count} × 15er (1)</span>
                    <Badge variant="outline" className="text-xs sm:text-sm font-bold px-2.5 py-1">
                      {pointsBreakdown.throw15Points} Pkt
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <div className="h-2" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}