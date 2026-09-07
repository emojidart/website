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
      <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-[540px] rounded-[26px] shadow-2xl">
        <div className="bg-slate-950 px-6 py-6 text-white"><DialogHeader>
          <DialogTitle className="text-2xl font-black text-white">Preisgeld-Übersicht</DialogTitle>
        </DialogHeader></div>

        <div className="space-y-3 px-6 py-6">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <span className="text-gray-700">Startgeld pro Spieler:</span>
            <span className="font-semibold text-gray-800">{prizeMoneySettings.current.entryFee.toFixed(2)} €</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <span className="text-gray-700">Bezahlte Spieler:</span>
            <span className="font-semibold text-gray-800">{paidPlayers}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-4">
            <span className="text-lg font-semibold text-orange-600">Gesamtpreisgeld:</span>
            <span className="text-xl font-bold text-orange-600">{prizeData.totalPrizeMoney.toFixed(2)} €</span>
          </div>

          <h4 className="text-lg font-semibold text-gray-800 mb-4">Preisverteilung</h4>

          {prizeData.distribution.map((item) => (
            <div key={item.place} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 pb-1 border-b border-gray-100">
              <span className="text-gray-700">
                {item.place}. Platz ({prizeMoneySettings.current.percentages[item.place - 1]}%)
              </span>
              <span className="font-semibold text-gray-800">{item.amount.toFixed(2)} €</span>
            </div>
          ))}
        </div>

        <DialogFooter className="flex justify-end border-t border-slate-100 px-6 py-5">
          <Button onClick={() => onOpenChange(false)} className="h-11 rounded-xl bg-orange-600 px-5 font-black hover:bg-orange-700">
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}