"use client"

import { useEffect, useState } from "react"
import type { Board } from "@/types/tournament"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dices } from "lucide-react"

interface BoardComponentProps {
  board: Board | null | undefined
  suddenDeathEnabled: boolean
  suddenDeathTime: number
  speechEnabled: boolean
  onStartGame: (boardId: number, initialStartTime?: number | null) => void
  onFinishGame: (boardId: number, selectedPlayerNames: string[]) => Promise<void>
  onCancelGame: (boardId: number) => void
  onMakeCall: (text: string, enabled: boolean) => void
  currentRound: number
}

export function BoardComponent({
  board,
  suddenDeathEnabled,
  suddenDeathTime,
  speechEnabled,
  onStartGame,
  onFinishGame,
  onCancelGame,
  onMakeCall,
  currentRound,
}: BoardComponentProps) {
  const [selectedPlayerNames, setSelectedPlayerNames] = useState<string[]>([])
  const [isGameActive, setIsGameActive] = useState(false)

  const boardStartTime = board?.startTime ?? null

  useEffect(() => {
    setIsGameActive(boardStartTime !== null)
  }, [boardStartTime])

  const handleStartGame = () => {
    if (!board) return
    onStartGame(board.id)
    setIsGameActive(true)
    onMakeCall(
      `Spiel auf Board ${board.id} gestartet.${board.gameMode ? ` Gespielt wird ${board.gameMode}.` : ""}`,
      speechEnabled,
    )
  }

  const handleFinishGame = async () => {
    if (!board) return
    await onFinishGame(board.id, selectedPlayerNames)
    setIsGameActive(false)
    onMakeCall(`Spiel auf Board ${board.id} beendet.`, speechEnabled)
  }

  const handleCancelGame = () => {
    if (!board) return
    onCancelGame(board.id)
    setIsGameActive(false)
    onMakeCall(`Spiel auf Board ${board.id} abgebrochen.`, speechEnabled)
  }

  const handlePlayerSelection = (playerName: string) => {
    setSelectedPlayerNames((prev) =>
      prev.includes(playerName) ? prev.filter((name) => name !== playerName) : [...prev, playerName],
    )
  }

  if (!board) return null

  return (
    <Card data-board-id={board.id} className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#090b0f] text-white shadow-[0_18px_45px_-36px_rgba(0,0,0,.85)]">
      <CardHeader className="border-b border-white/[0.07] bg-white/[0.025] px-4 py-4">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg font-semibold">
          <span>Board {board.id}</span>
          <div className="flex items-center gap-2">
            {board.gameMode && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1 text-xs font-black tracking-wide text-white">
                <Dices className="h-3.5 w-3.5 text-orange-400" />
                {board.gameMode}
              </span>
            )}
            {isGameActive && <span className="text-sm font-bold text-emerald-300">Läuft</span>}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4">
        {board.gameMode && (
          <div className="mb-4 rounded-2xl border border-orange-300/20 bg-orange-500/[0.08] p-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">Runde {currentRound}</div>
            <div className="mt-0.5 text-lg font-black text-white">{board.gameMode}</div>
          </div>
        )}

        <div className="mb-4">
          {board.players.length === 0 ? (
            <p className="text-white/40">Keine Spieler auf diesem Board.</p>
          ) : (
            <ul className="space-y-2">
              {board.players.map((player) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between rounded-[16px] border border-white/[0.08] bg-white/[0.025] p-3 transition-colors duration-200 hover:border-orange-300/15 hover:bg-white/[0.045]"
                >
                  <span className="font-bold text-white/85">{player.name} ({player.lives})</span>

                  {isGameActive && (
                    <Checkbox
                      checked={selectedPlayerNames.includes(player.name)}
                      onCheckedChange={() => handlePlayerSelection(player.name)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {boardStartTime && isGameActive && (
          <div className="mb-4">
            <p className="text-sm font-medium text-white/40">
              Spiel gestartet: <span className="board-timer font-semibold">Lädt...</span>
            </p>
          </div>
        )}

        <div className="flex justify-between gap-3">
          {!isGameActive ? (
            <Button onClick={handleStartGame} className="w-1/2 rounded-xl border border-white/[0.10] bg-[#11161e] font-black text-white hover:border-orange-300/15 hover:bg-[#171d26]">Start</Button>
          ) : (
            <>
              <Button onClick={handleFinishGame} className="w-1/2 rounded-xl bg-orange-500 font-black text-white hover:bg-orange-400">Beenden</Button>
              <Button
                onClick={handleCancelGame}
                variant="outline"
                className="w-1/2 rounded-xl border-white/[0.10] bg-white/[0.025] text-white/70 hover:border-orange-300/15 hover:bg-white/[0.05] hover:text-white"
              >
                Abbrechen
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
