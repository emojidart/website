"use client"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trophy } from "lucide-react"
import type { KratzerPlayer } from "@/types/tournament"

interface WinnerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  winner: KratzerPlayer | null
  currentRound: number
  onComplete: () => void
}

export function WinnerModal({
  open,
  onOpenChange,
  winner,
  currentRound,
  onComplete,
}: WinnerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-[620px] rounded-[30px] shadow-2xl text-center">
        <div className="bg-gradient-to-br from-slate-950 via-slate-950 to-[#2a170f] px-6 pt-7 text-white"><DialogHeader>
          <DialogTitle className="text-2xl font-black text-white">🏆 Turnier beendet!</DialogTitle>
        </DialogHeader></div>

        <div className="px-6 py-7 text-center">
          <Trophy className="h-20 w-20 mx-auto text-amber-500" />

          <div className="my-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {winner?.name}
          </div>

          <p className="text-lg text-gray-700 mb-6">Herzlichen Glückwunsch zum Turniersieg!</p>

          {winner && (
            <div className="inline-block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left font-bold text-slate-700">
              <p>
                <strong>Runden gespielt:</strong> {currentRound}
              </p>
              <p>
                <strong>Verbleibende Leben:</strong> {winner.lives}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-center border-t border-slate-100 px-6 py-5">
          <Button
            onClick={() => {
              onOpenChange(false)
              onComplete()
            }}
            className="h-11 rounded-xl bg-orange-600 px-5 font-black hover:bg-orange-700"
          >
            Schließen & Abschließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}