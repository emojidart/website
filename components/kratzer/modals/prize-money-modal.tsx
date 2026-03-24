"use client"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { SpieldatenbankEntry } from "@/types/tournament"
import { calculatePrizeMoney } from "@/utils/tournament-utils"

interface PrizeMoneySettings {
  entryFee: number
  placesToPay: number
  percentages: number[]
}

interface PrizeMoneyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  registeredPlayers: SpieldatenbankEntry[]
  prizeMoneySettings: React.MutableRefObject<PrizeMoneySettings>
}

export function PrizeMoneyModal({
  open,
  onOpenChange,
  registeredPlayers,
  prizeMoneySettings,
}: PrizeMoneyModalProps) {
  const paidPlayers = registeredPlayers.filter((p) => p.paid).length
  const prizeData = calculatePrizeMoney(
    prizeMoneySettings.current.entryFee,
    paidPlayers,
    prizeMoneySettings.current.percentages,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl shadow-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Preisgeld-Übersicht</DialogTitle>
        </DialogHeader>

        <div className="my-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-700">Startgeld pro Spieler:</span>
            <span className="font-semibold text-gray-800">{prizeMoneySettings.current.entryFee.toFixed(2)} €</span>
          </div>

          <div className="flex justify-between mb-2">
            <span className="text-gray-700">Bezahlte Spieler:</span>
            <span className="font-semibold text-gray-800">{paidPlayers}</span>
          </div>

          <div className="flex justify-between mb-4 pb-2 border-b-2 border-gray-200">
            <span className="text-lg font-semibold text-orange-600">Gesamtpreisgeld:</span>
            <span className="text-xl font-bold text-orange-600">{prizeData.totalPrizeMoney.toFixed(2)} €</span>
          </div>

          <h4 className="text-lg font-semibold text-gray-800 mb-4">Preisverteilung</h4>

          {prizeData.distribution.map((item) => (
            <div key={item.place} className="flex justify-between mb-2 pb-1 border-b border-gray-100">
              <span className="text-gray-700">
                {item.place}. Platz ({prizeMoneySettings.current.percentages[item.place - 1]}%)
              </span>
              <span className="font-semibold text-gray-800">{item.amount.toFixed(2)} €</span>
            </div>
          ))}
        </div>

        <DialogFooter className="flex justify-end mt-6">
          <Button onClick={() => onOpenChange(false)} className="bg-orange-600 hover:bg-orange-700">
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}