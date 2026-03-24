"use client"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { KratzerPlayer } from "@/types/tournament"
import { getDefaultLives } from "@/utils/tournament-utils"

interface LeagueStatusModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  players: KratzerPlayer[]
  leagueStatusLivesMap: React.MutableRefObject<Record<string, number>>
  onSave: (updatedLivesMap: Record<string, number>) => void
}

export function LeagueStatusModal({
  open,
  onOpenChange,
  players,
  leagueStatusLivesMap,
  onSave,
}: LeagueStatusModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl shadow-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Leben pro Ligastatus verwalten</DialogTitle>
        </DialogHeader>

        <div className="my-6">
          {Array.from(new Set(players.map((p) => p.ligastatus))).map((status) => {
            if (!status) return null

            const currentLives = players.find((p) => p.ligastatus === status)?.lives || getDefaultLives(status)

            return (
              <div key={status} className="flex items-center gap-4 mb-4">
                <Label htmlFor={`status-${status}`} className="w-28 text-gray-700 font-medium">
                  Ligastatus {status}:
                </Label>

                <Input
                  id={`status-${status}`}
                  type="number"
                  min="1"
                  max="10"
                  defaultValue={currentLives}
                  onChange={(e) => {
                    const newLivesMap = {
                      ...leagueStatusLivesMap.current,
                      [status]: Number.parseInt(e.target.value),
                    }
                    leagueStatusLivesMap.current = newLivesMap
                  }}
                  className="w-24 text-center"
                />
              </div>
            )
          })}
        </div>

        <DialogFooter className="flex justify-end gap-3 mt-6">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Abbrechen
          </Button>

          <Button onClick={() => onSave(leagueStatusLivesMap.current)} className="bg-orange-600 hover:bg-orange-700">
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}