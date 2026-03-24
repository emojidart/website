"use client"

import { useEffect, useState } from "react"
import type { Board } from "@/types/tournament"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

interface BoardComponentProps {
  board: Board
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

  useEffect(() => {
    setIsGameActive(board.startTime !== null)
  }, [board.startTime])

  const handleStartGame = () => {
    onStartGame(board.id)
    setIsGameActive(true)
    onMakeCall(`Spiel auf Board ${board.id} gestartet.`, speechEnabled)
  }

  const handleFinishGame = async () => {
    await onFinishGame(board.id, selectedPlayerNames)
    setIsGameActive(false)
    onMakeCall(`Spiel auf Board ${board.id} beendet.`, speechEnabled)
  }

  const handleCancelGame = () => {
    onCancelGame(board.id)
    setIsGameActive(false)
    onMakeCall(`Spiel auf Board ${board.id} abgebrochen.`, speechEnabled)
  }

  const handlePlayerSelection = (playerName: string) => {
    setSelectedPlayerNames((prev) =>
      prev.includes(playerName) ? prev.filter((name) => name !== playerName) : [...prev, playerName],
    )
  }

  return (
    <Card data-board-id={board.id} className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span>Board {board.id}</span>
          {isGameActive && <span className="ml-2 text-sm text-green-600">Läuft</span>}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4">
        <div className="mb-4">
          {board.players.length === 0 ? (
            <p className="text-gray-500">Keine Spieler auf diesem Board.</p>
          ) : (
            <ul className="space-y-2">
              {board.players.map((player) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                >
                  <span className="font-medium text-gray-800">
                    {player.name} ({player.lives})
                  </span>

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

        {board.startTime && isGameActive && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Spiel gestartet: <span className="board-timer font-semibold">Lädt...</span>
            </p>
          </div>
        )}

        <div className="flex justify-between gap-3">
          {!isGameActive ? (
            <Button onClick={handleStartGame} className="w-1/2 bg-green-600 hover:bg-green-700">
              Start
            </Button>
          ) : (
            <>
              <Button onClick={handleFinishGame} className="w-1/2 bg-orange-600 hover:bg-orange-700">
                Beenden
              </Button>

              <Button
                onClick={handleCancelGame}
                variant="outline"
                className="w-1/2 text-gray-700 border-gray-300 hover:bg-gray-100 bg-transparent"
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