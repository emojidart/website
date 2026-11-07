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
      <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-[620px] rounded-[20px] shadow-2xl text-center">
        <div className="bg-card    px-6 pt-7 text-white"><DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-white">🏆 Turnier beendet!</DialogTitle>
        </DialogHeader></div>

        <div className="px-6 py-7 text-center">
          <Trophy className="h-20 w-20 mx-auto text-amber-500" />

          <div className="my-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {winner?.name}
          </div>

          <p className="text-lg text-muted-foreground mb-6">Herzlichen Glückwunsch zum Turniersieg!</p>

          {winner && (
            <div className="inline-block rounded-2xl border border-border bg-muted p-4 text-left font-bold text-muted-foreground">
              <p>
                <strong>Runden gespielt:</strong> {currentRound}
              </p>
              <p>
                <strong>Verbleibende Leben:</strong> {winner.lives}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-center border-t border-border px-6 py-5">
          <Button
            onClick={() => {
              onOpenChange(false)
              onComplete()
            }}
            className="h-11 rounded-xl bg-primary px-5 font-semibold hover:bg-primary/90 text-primary-foreground"
          >
            Schließen & Abschließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}