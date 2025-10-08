"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Trophy, Target, Award } from "lucide-react"

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

export function PlayerPointsModal({ isOpen, onClose, player, pointsBreakdown }: PlayerPointsModalProps) {
  const throw20Count = pointsBreakdown.throw20Points / 6
  const throw19Count = pointsBreakdown.throw19Points / 5
  const throw18Count = pointsBreakdown.throw18Points / 4
  const throw17Count = pointsBreakdown.throw17Points / 3
  const throw16Count = pointsBreakdown.throw16Points / 2
  const throw15Count = pointsBreakdown.throw15Points / 1

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="w-6 h-6 text-amber-500" />
            Punkteübersicht: {player.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Total Points */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 border-2 border-amber-200">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Gesamtpunkte</div>
              <div className="text-4xl font-bold text-amber-600">{pointsBreakdown.totalPoints.toFixed(1)}</div>
            </div>
          </div>

          {/* Leg Wins */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Target className="w-4 h-4" />
              Leg-Wins
            </div>
            <div className="bg-green-50 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm">{player.total_wins} Siege × 3 Punkte</span>
              <Badge className="bg-green-600 text-white font-bold">{pointsBreakdown.legWinPoints} Punkte</Badge>
            </div>
          </div>

          {/* Special Throws */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Award className="w-4 h-4" />
              Spezielle Würfe
            </div>
            <div className="grid grid-cols-1 gap-2">
              {pointsBreakdown.throw180Points > 0 && (
                <div className="bg-red-50 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-sm">{player.throws_180} × 180er (25 Punkte)</span>
                  <Badge className="bg-red-600 text-white font-bold">{pointsBreakdown.throw180Points} Punkte</Badge>
                </div>
              )}
              {pointsBreakdown.throw171Points > 0 && (
                <div className="bg-purple-50 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-sm">{player.throws_171} × 171er (25 Punkte)</span>
                  <Badge className="bg-purple-600 text-white font-bold">{pointsBreakdown.throw171Points} Punkte</Badge>
                </div>
              )}
              {pointsBreakdown.highTonnePoints > 0 && (
                <div className="bg-orange-50 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-sm">{player.throws_high_tonne} × High Tonne (18 Punkte)</span>
                  <Badge className="bg-orange-600 text-white font-bold">{pointsBreakdown.highTonnePoints} Punkte</Badge>
                </div>
              )}
              {pointsBreakdown.tonnePoints > 0 && (
                <div className="bg-green-50 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-sm">{player.throws_tonne} × Tonne (15 Punkte)</span>
                  <Badge className="bg-green-600 text-white font-bold">{pointsBreakdown.tonnePoints} Punkte</Badge>
                </div>
              )}
              {pointsBreakdown.throw95PlusPoints > 0 && (
                <div className="bg-teal-50 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-sm">{player.throws_95_plus} × 95+ (12 Punkte)</span>
                  <Badge className="bg-teal-600 text-white font-bold">{pointsBreakdown.throw95PlusPoints} Punkte</Badge>
                </div>
              )}
              {pointsBreakdown.shanghaiPoints > 0 && (
                <div className="bg-indigo-50 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-sm">{player.throws_shanghai} × Shanghai (10 Punkte)</span>
                  <Badge className="bg-indigo-600 text-white font-bold">{pointsBreakdown.shanghaiPoints} Punkte</Badge>
                </div>
              )}
              <div className="bg-pink-50 rounded-lg p-3 flex justify-between items-center">
                <span className="text-sm">{player.throws_bull || 0} × Bull (8 Punkte)</span>
                <Badge className="bg-pink-600 text-white font-bold">{pointsBreakdown.bullPoints} Punkte</Badge>
              </div>
            </div>
          </div>

          {/* Number Throws */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Target className="w-4 h-4" />
              Standart-Würfe (15-20)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {pointsBreakdown.throw20Points > 0 && (
                <div className="bg-yellow-50 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-xs">{throw20Count} × 20er (6 Pkt)</span>
                  <Badge variant="outline" className="text-xs font-bold">
                    {pointsBreakdown.throw20Points}
                  </Badge>
                </div>
              )}
              {pointsBreakdown.throw19Points > 0 && (
                <div className="bg-yellow-50 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-xs">{throw19Count} × 19er (5 Pkt)</span>
                  <Badge variant="outline" className="text-xs font-bold">
                    {pointsBreakdown.throw19Points}
                  </Badge>
                </div>
              )}
              {pointsBreakdown.throw18Points > 0 && (
                <div className="bg-yellow-50 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-xs">{throw18Count} × 18er (4 Pkt)</span>
                  <Badge variant="outline" className="text-xs font-bold">
                    {pointsBreakdown.throw18Points}
                  </Badge>
                </div>
              )}
              {pointsBreakdown.throw17Points > 0 && (
                <div className="bg-yellow-50 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-xs">{throw17Count} × 17er (3 Pkt)</span>
                  <Badge variant="outline" className="text-xs font-bold">
                    {pointsBreakdown.throw17Points}
                  </Badge>
                </div>
              )}
              {pointsBreakdown.throw16Points > 0 && (
                <div className="bg-yellow-50 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-xs">{throw16Count} × 16er (2 Pkt)</span>
                  <Badge variant="outline" className="text-xs font-bold">
                    {pointsBreakdown.throw16Points}
                  </Badge>
                </div>
              )}
              {pointsBreakdown.throw15Points > 0 && (
                <div className="bg-yellow-50 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-xs">{throw15Count} × 15er (1 Pkt)</span>
                  <Badge variant="outline" className="text-xs font-bold">
                    {pointsBreakdown.throw15Points}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
