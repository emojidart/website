"use client"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, CircleCheck, AlertTriangle, Info, Play, XCircle } from "lucide-react"
import type { KratzerPlayer, TournamentSettings } from "@/types/tournament"

interface NewRoundModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRound: number
  settings: TournamentSettings
  players: KratzerPlayer[]
  onSettingsChange: (key: keyof TournamentSettings, value: any) => void
  onExecuteRound: () => void
}

export function NewRoundModal({
  open,
  onOpenChange,
  currentRound,
  settings,
  players,
  onSettingsChange,
  onExecuteRound,
}: NewRoundModalProps) {
  const activePlayers = players.filter((p) => !p.isEliminated)
  const capacity = settings.boardCount * settings.maxGroupSize
  const enoughCapacity = capacity >= activePlayers.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-6 rounded-2xl shadow-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-gray-900">
            Runde {currentRound + 1} starten
          </DialogTitle>
        </DialogHeader>

        <div className="text-center my-6">
          <div className="text-6xl mb-4">🎲</div>
          <h2 className="text-2xl font-semibold mb-2 text-gray-800">Runde {currentRound + 1} losen</h2>
          <p className="text-lg text-gray-600">
            <strong>{activePlayers.length} Spieler</strong> verbleibend
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl mb-6">
          <h4 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Aktuelle Einstellungen
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="modalBoardCount" className="text-gray-700">
                Anzahl Automaten
              </Label>
              <Input
                id="modalBoardCount"
                type="number"
                min="1"
                max="32"
                value={settings.boardCount}
                onChange={(e) => onSettingsChange("boardCount", Number.parseInt(e.target.value))}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="modalMaxGroupSize" className="text-gray-700">
                Max. Gruppengröße
              </Label>
              <Input
                id="modalMaxGroupSize"
                type="number"
                min="2"
                max="6"
                value={settings.maxGroupSize}
                onChange={(e) => onSettingsChange("maxGroupSize", Number.parseInt(e.target.value))}
                className="mt-2"
              />
            </div>
          </div>

          <div
            className={`mt-4 p-3 rounded-xl font-semibold text-sm ${
              enoughCapacity
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-100 text-red-700 border border-red-300"
            }`}
          >
            {enoughCapacity ? (
              <div className="flex items-center gap-2">
                <CircleCheck className="h-4 w-4" />
                <span>
                  Kapazität: {capacity} Plätze ({capacity - activePlayers.length} frei)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Nicht genug Plätze! Benötigt: {activePlayers.length}, Verfügbar: {capacity}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl text-gray-700 text-sm flex items-center gap-2">
          <Info className="h-4 w-4" />
          Die Spieler werden automatisch zufällig auf die Automaten verteilt.
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-3">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            <XCircle className="h-4 w-4 mr-2" />
            Abbrechen
          </Button>

          <Button onClick={onExecuteRound} disabled={!enoughCapacity} className="bg-orange-600 hover:bg-orange-700">
            <Play className="h-4 w-4 mr-2" />
            Runde {currentRound + 1} starten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}