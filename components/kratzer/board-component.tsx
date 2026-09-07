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
    <Card data-board-id={board.id} className="rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_45px_-36px_rgba(15,23,42,.55)] overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-4 py-4">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg font-semibold">
          <span>Board {board.id}</span>
          <div className="flex items-center gap-2">
            {board.gameMode && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1 text-xs font-black tracking-wide text-white">
                <Dices className="h-3.5 w-3.5 text-orange-400" />
                {board.gameMode}
              </span>
            )}
            {isGameActive && <span className="text-sm font-bold text-emerald-700">Läuft</span>}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4">
        {board.gameMode && (
          <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">Runde {currentRound}</div>
            <div className="mt-0.5 text-lg font-black text-slate-950">{board.gameMode}</div>
          </div>
        )}

        <div className="mb-4">
          {board.players.length === 0 ? (
            <p className="text-gray-500">Keine Spieler auf diesem Board.</p>
          ) : (
            <ul className="space-y-2">
              {board.players.map((player) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-[16px] border border-slate-200 bg-white hover:bg-slate-50 transition-colors duration-200"
                >
                  <span className="font-bold text-slate-800">{player.name} ({player.lives})</span>

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
            <p className="text-sm font-medium text-slate-500">
              Spiel gestartet: <span className="board-timer font-semibold">Lädt...</span>
            </p>
          </div>
        )}

        <div className="flex justify-between gap-3">
          {!isGameActive ? (
            <Button onClick={handleStartGame} className="w-1/2 rounded-xl bg-slate-950 font-black hover:bg-slate-900">Start</Button>
          ) : (
            <>
              <Button onClick={handleFinishGame} className="w-1/2 rounded-xl bg-orange-600 font-black hover:bg-orange-700">Beenden</Button>
              <Button
                onClick={handleCancelGame}
                variant="outline"
                className="w-1/2 rounded-xl text-slate-700 border-slate-300 hover:bg-slate-50 bg-white"
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
