"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CircleCheck, AlertTriangle, Play, XCircle, Dices, Users } from "lucide-react"
import {
  DICE_GAME_MODES,
  type DiceFace,
  type GameMode,
  type KratzerPlayer,
  type TournamentSettings,
} from "@/types/tournament"
import { publishKratzerBeamerEvent } from "@/components/kratzer/beamer/beamer-sync"

interface NewRoundModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRound: number
  settings: TournamentSettings
  players: KratzerPlayer[]
  onSettingsChange: (key: keyof TournamentSettings, value: any) => void
  onExecuteRound: (gameMode?: GameMode) => void
}

const DICE_SYMBOLS: Record<DiceFace, string> = {
  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅",
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

  const [isRolling, setIsRolling] = useState(false)
  const [diceFace, setDiceFace] = useState<DiceFace>(1)
  const [rolledMode, setRolledMode] = useState<GameMode | null>(null)
  const rollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearRollTimers = () => {
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current)
    if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current)
    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current)
    rollIntervalRef.current = null
    rollTimeoutRef.current = null
    startTimeoutRef.current = null
  }

  useEffect(() => {
    if (open) {
      setIsRolling(false)
      setDiceFace(1)
      setRolledMode(null)
    } else {
      clearRollTimers()
    }

    return clearRollTimers
  }, [open])

  const handleRoundStart = () => {
    if (!enoughCapacity || isRolling) return

    if (!settings.diceModeEnabled) {
      onExecuteRound()
      return
    }

    setRolledMode(null)
    setIsRolling(true)
    publishKratzerBeamerEvent({ type: "dice-start", round: currentRound + 1 })

    let speed = 70
    const roll = () => {
      setDiceFace((Math.floor(Math.random() * 6) + 1) as DiceFace)
      speed = Math.min(speed + 14, 220)
      rollIntervalRef.current = setTimeout(roll, speed) as unknown as ReturnType<typeof setInterval>
    }
    roll()

    rollTimeoutRef.current = setTimeout(() => {
      if (rollIntervalRef.current) clearTimeout(rollIntervalRef.current as unknown as ReturnType<typeof setTimeout>)
      rollIntervalRef.current = null

      const finalFace = (Math.floor(Math.random() * 6) + 1) as DiceFace
      const finalMode = DICE_GAME_MODES[finalFace]
      setDiceFace(finalFace)
      setRolledMode(finalMode)
      setIsRolling(false)
      publishKratzerBeamerEvent({
        type: "dice-result",
        round: currentRound + 1,
        face: finalFace,
        mode: finalMode,
      })

      startTimeoutRef.current = setTimeout(() => {
        onExecuteRound(finalMode)
      }, 1200)
    }, 1750)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isRolling && onOpenChange(nextOpen)}>
      <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-[640px] rounded-[28px] shadow-2xl">
        <div className="bg-gradient-to-br from-slate-950 via-slate-950 to-[#25140d] px-6 pb-7 pt-6 text-white sm:px-8">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-black sm:text-3xl">
              Runde {currentRound + 1}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-5 text-center">
            {settings.diceModeEnabled ? (
              <>
                <div
                  className={`mx-auto flex h-28 w-28 items-center justify-center rounded-[30px] border border-white/15 bg-white/10 text-[88px] leading-none shadow-[0_18px_50px_-25px_rgba(0,0,0,.9)] backdrop-blur-sm transition-all duration-200 sm:h-32 sm:w-32 sm:text-[100px] ${
                    isRolling ? "scale-110 rotate-6" : "scale-100 rotate-0"
                  }`}
                >
                  {DICE_SYMBOLS[diceFace]}
                </div>

                <div className="mt-4">
                  {isRolling ? (
                    <>
                      <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Wird ausgelost</div>
                      <div className="mt-1 text-2xl font-black">Welcher Modus kommt?</div>
                    </>
                  ) : rolledMode ? (
                    <>
                      <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Runde {currentRound + 1}</div>
                      <div className="mt-1 text-3xl font-black sm:text-4xl">{rolledMode}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Würfelmodus</div>
                      <div className="mt-1 text-2xl font-black">Bereit zum Würfeln</div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="py-2">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                  <Play className="h-7 w-7 text-orange-300" />
                </div>
                <div className="mt-4 text-xl font-black">Neue Runde vorbereiten</div>
              </div>
            )}

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200">
              <Users className="h-4 w-4 text-orange-300" />
              {activePlayers.length} Spieler dabei
            </div>
          </div>
        </div>

        <div className="bg-white px-6 py-6 sm:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="modalBoardCount" className="text-sm font-bold text-slate-700">
                Automaten
              </Label>
              <Input
                id="modalBoardCount"
                type="number"
                min="1"
                max="32"
                value={settings.boardCount}
                disabled={isRolling}
                onChange={(e) => onSettingsChange("boardCount", Number.parseInt(e.target.value))}
                className="mt-2 h-11 rounded-xl border-slate-200 bg-slate-50/70"
              />
            </div>

            <div>
              <Label htmlFor="modalMaxGroupSize" className="text-sm font-bold text-slate-700">
                Max. Spieler pro Board
              </Label>
              <Input
                id="modalMaxGroupSize"
                type="number"
                min="2"
                max="6"
                value={settings.maxGroupSize}
                disabled={isRolling}
                onChange={(e) => onSettingsChange("maxGroupSize", Number.parseInt(e.target.value))}
                className="mt-2 h-11 rounded-xl border-slate-200 bg-slate-50/70"
              />
            </div>
          </div>

          {!enoughCapacity ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Zu viele Spieler für die aktuelle Einstellung. Bitte Automaten oder Gruppengröße erhöhen.
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CircleCheck className="h-4 w-4" />
              Alles bereit für Runde {currentRound + 1}.
            </div>
          )}

          {settings.diceModeEnabled && !rolledMode && !isRolling ? (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.entries(DICE_GAME_MODES) as Array<[string, GameMode]>).map(([face, mode]) => (
                <div
                  key={face}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-700"
                >
                  <span className="text-xl leading-none text-slate-950">{DICE_SYMBOLS[Number(face) as DiceFace]}</span>
                  <span>{mode}</span>
                </div>
              ))}
            </div>
          ) : null}

          <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              disabled={isRolling}
              className="h-11 rounded-xl border-slate-200"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Abbrechen
            </Button>

            <Button
              onClick={handleRoundStart}
              disabled={!enoughCapacity || isRolling || Boolean(rolledMode)}
              className="h-11 rounded-xl bg-orange-600 px-5 font-black text-white hover:bg-orange-700"
            >
              {settings.diceModeEnabled ? <Dices className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isRolling
                ? "Würfelt..."
                : rolledMode
                  ? `${rolledMode} startet...`
                  : settings.diceModeEnabled
                    ? "Würfeln"
                    : `Runde ${currentRound + 1} starten`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
