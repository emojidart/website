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

  const Row = ({ label, value, badge }: { label: string; value: string; badge: string }) => (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3">
      <div className="min-w-0">
        <div className="text-xs font-black text-gray-900 truncate">{label}</div>
        <div className="text-[11px] text-gray-600 font-bold truncate">{value}</div>
      </div>
      <Badge className="rounded-full bg-white text-gray-900 border border-gray-200 font-black text-xs px-3 py-1 whitespace-nowrap">
        {badge}
      </Badge>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-24px)] sm:max-w-md p-0 overflow-hidden rounded-2xl border border-gray-200 shadow-2xl">
        {/* Top orange bar */}
        <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

        {/* Sticky Header */}
        <DialogHeader className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="min-w-0 flex items-center gap-2 text-base sm:text-lg font-black">
              <div className="w-9 h-9 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-orange-600" />
              </div>
              <span className="truncate">Punkteübersicht</span>
            </DialogTitle>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-1 text-xs text-gray-500 font-bold truncate">{player?.name}</div>
        </DialogHeader>

        {/* Scroll Area */}
        <div className="max-h-[75vh] sm:max-h-[80vh] overflow-y-auto px-4 py-4">
          <div className="space-y-5">
            {/* Total Points (clean) */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500 font-bold">Gesamtpunkte</div>
                  <div className="text-[11px] text-gray-600 font-semibold truncate">
                    Summe aus Legs + Sonderwertungen
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-orange-700">
                  {pointsBreakdown.totalPoints.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Leg Wins */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-gray-700">
                <Target className="w-4 h-4 text-orange-600" />
                Leg-Wins
              </div>

              <Row
                label="Siege"
                value={`${player.total_wins} Siege × 3`}
                badge={`${pointsBreakdown.legWinPoints} Pkt`}
              />
            </div>

            {/* Special Throws */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-gray-700">
                <Award className="w-4 h-4 text-orange-600" />
                Spezielle Würfe
              </div>

              <div className="grid grid-cols-1 gap-2">
                {pointsBreakdown.throw180Points > 0 && (
                  <Row
                    label="180er"
                    value={`${player.throws_180} × 180 (25)`}
                    badge={`${pointsBreakdown.throw180Points} Pkt`}
                  />
                )}

                {pointsBreakdown.throw171Points > 0 && (
                  <Row
                    label="171er"
                    value={`${player.throws_171} × 171 (25)`}
                    badge={`${pointsBreakdown.throw171Points} Pkt`}
                  />
                )}

                {pointsBreakdown.highTonnePoints > 0 && (
                  <Row
                    label="High Tonne"
                    value={`${player.throws_high_tonne} × HT (18)`}
                    badge={`${pointsBreakdown.highTonnePoints} Pkt`}
                  />
                )}

                {pointsBreakdown.tonnePoints > 0 && (
                  <Row
                    label="Tonne"
                    value={`${player.throws_tonne} × T (15)`}
                    badge={`${pointsBreakdown.tonnePoints} Pkt`}
                  />
                )}

                {pointsBreakdown.throw95PlusPoints > 0 && (
                  <Row
                    label="95+"
                    value={`${player.throws_95_plus} × 95+ (12)`}
                    badge={`${pointsBreakdown.throw95PlusPoints} Pkt`}
                  />
                )}

                {pointsBreakdown.shanghaiPoints > 0 && (
                  <Row
                    label="Shanghai"
                    value={`${player.throws_shanghai} × Shanghai (10)`}
                    badge={`${pointsBreakdown.shanghaiPoints} Pkt`}
                  />
                )}

                {(player.throws_bull || 0) > 0 || pointsBreakdown.bullPoints > 0 ? (
                  <Row
                    label="Bull"
                    value={`${player.throws_bull || 0} × Bull (8)`}
                    badge={`${pointsBreakdown.bullPoints} Pkt`}
                  />
                ) : null}
              </div>
            </div>

            {/* Standard throws */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-gray-700">
                <Target className="w-4 h-4 text-orange-600" />
                Standard-Würfe (15–20)
              </div>

              <div className="grid grid-cols-2 gap-2">
                {pointsBreakdown.throw20Points > 0 && (
                  <Row label="20er" value={`${throw20Count} × 20 (6)`} badge={`${pointsBreakdown.throw20Points} Pkt`} />
                )}
                {pointsBreakdown.throw19Points > 0 && (
                  <Row label="19er" value={`${throw19Count} × 19 (5)`} badge={`${pointsBreakdown.throw19Points} Pkt`} />
                )}
                {pointsBreakdown.throw18Points > 0 && (
                  <Row label="18er" value={`${throw18Count} × 18 (4)`} badge={`${pointsBreakdown.throw18Points} Pkt`} />
                )}
                {pointsBreakdown.throw17Points > 0 && (
                  <Row label="17er" value={`${throw17Count} × 17 (3)`} badge={`${pointsBreakdown.throw17Points} Pkt`} />
                )}
                {pointsBreakdown.throw16Points > 0 && (
                  <Row label="16er" value={`${throw16Count} × 16 (2)`} badge={`${pointsBreakdown.throw16Points} Pkt`} />
                )}
                {pointsBreakdown.throw15Points > 0 && (
                  <Row label="15er" value={`${throw15Count} × 15 (1)`} badge={`${pointsBreakdown.throw15Points} Pkt`} />
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