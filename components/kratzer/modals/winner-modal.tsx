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
      <DialogContent className="sm:max-w-[600px] p-6 rounded-2xl shadow-sm text-center">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-yellow-600 mb-4">🏆 Turnier beendet!</DialogTitle>
        </DialogHeader>

        <div className="text-center my-6">
          <Trophy className="h-24 w-24 mx-auto text-yellow-500" />

          <div className="text-5xl font-extrabold my-6 bg-gradient-to-r from-yellow-400 to-yellow-700 bg-clip-text text-transparent">
            {winner?.name}
          </div>

          <p className="text-lg text-gray-700 mb-6">Herzlichen Glückwunsch zum Turniersieg!</p>

          {winner && (
            <div className="bg-gray-100 p-4 rounded-lg inline-block text-left text-gray-700 font-medium">
              <p>
                <strong>Runden gespielt:</strong> {currentRound}
              </p>
              <p>
                <strong>Verbleibende Leben:</strong> {winner.lives}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-center mt-6">
          <Button
            onClick={() => {
              onOpenChange(false)
              onComplete()
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Schließen & Abschließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}