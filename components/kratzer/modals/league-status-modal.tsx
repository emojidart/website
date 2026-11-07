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
      <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-[540px] rounded-[20px] shadow-2xl">
        <div className="bg-background px-6 py-6 text-white"><DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-white">Leben pro Ligastatus verwalten</DialogTitle>
        </DialogHeader></div>

        <div className="space-y-3 px-6 py-6">
          {Array.from(new Set(players.map((p) => p.ligastatus))).map((status) => {
            if (!status) return null

            const currentLives = players.find((p) => p.ligastatus === status)?.lives || getDefaultLives(status)

            return (
              <div key={status} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/70 p-4">
                <Label htmlFor={`status-${status}`} className="text-muted-foreground font-semibold">
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
                  className="h-11 w-24 rounded-xl border-border bg-card text-center font-semibold"
                />
              </div>
            )
          })}
        </div>

        <DialogFooter className="flex justify-end gap-3 border-t border-border px-6 py-5">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Abbrechen
          </Button>

          <Button onClick={() => onSave(leagueStatusLivesMap.current)} className="h-11 rounded-xl bg-primary px-5 font-semibold hover:bg-primary/90 text-primary-foreground">
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}