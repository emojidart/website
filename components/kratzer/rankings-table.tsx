"use client"

import type { KratzerPlayer } from "@/types/tournament"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { MinusCircle, PlusCircle, RotateCcw, XCircle } from "lucide-react"

interface RankingsTableProps {
  players: KratzerPlayer[]
  currentRound: number
  onEditPlayerLives: (playerId: string, newLives: number) => Promise<void>
  onTogglePlayerElimination: (playerId: string) => Promise<void>
  loading: boolean
}

export function RankingsTable({
  players,
  currentRound,
  onEditPlayerLives,
  onTogglePlayerElimination,
  loading,
}: RankingsTableProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isEliminated && !b.isEliminated) return 1
    if (!a.isEliminated && b.isEliminated) return -1
    return b.lives - a.lives
  })

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            <TableHead>Rang</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Ligastatus</TableHead>
            <TableHead>Leben</TableHead>
            <TableHead>Ausgeschieden</TableHead>
            <TableHead>Aktionen</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedPlayers.map((player, index) => (
            <TableRow
              key={player.id}
              className={player.isEliminated ? "opacity-60 bg-gray-50" : "hover:bg-gray-50 transition-colors"}
            >
              <TableCell>{index + 1}</TableCell>
              <TableCell className="font-medium">{player.name}</TableCell>
              <TableCell>{player.ligastatus}</TableCell>

              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => onEditPlayerLives(player.id, Math.max(0, player.lives - 1))}
                    disabled={loading || player.lives <= 0}
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto w-auto text-red-600 hover:text-red-800"
                    title="Leben reduzieren"
                  >
                    <MinusCircle className="h-4 w-4" />
                  </Button>

                  <span className="font-bold text-lg text-gray-900 min-w-[2rem] text-center">{player.lives}</span>

                  <Button
                    onClick={() => onEditPlayerLives(player.id, player.lives + 1)}
                    disabled={loading}
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto w-auto text-green-600 hover:text-green-800"
                    title="Leben erhöhen"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>

              <TableCell>{player.isEliminated ? `Runde ${player.eliminationRound}` : "Nein"}</TableCell>

              <TableCell>
                <Button
                  onClick={() => onTogglePlayerElimination(player.id)}
                  disabled={loading}
                  variant="ghost"
                  size="sm"
                  className={`p-1 h-auto w-auto ${
                    player.isEliminated
                      ? "text-green-600 hover:text-green-800"
                      : "text-orange-600 hover:text-orange-800"
                  }`}
                  title={player.isEliminated ? "Spieler reaktivieren" : "Spieler ausscheiden"}
                >
                  {player.isEliminated ? <RotateCcw className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}