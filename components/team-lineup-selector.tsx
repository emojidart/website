"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface Player {
  id: string
  name: string
  photo_url: string | null
}

interface MatchLineup {
  id: string
  match_id: string
  team_id: string
  player_id: string
  position: number
  is_substitute: boolean
  player_name: string
}

interface TeamLineupSelectorProps {
  teamId: string
  players: Player[]
  lineup: MatchLineup[]
  onSave: (playerIds: string[]) => void
  loading: boolean
}

export default function TeamLineupSelector({ teamId, players, lineup, onSave, loading }: TeamLineupSelectorProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])

  useEffect(() => {
    const lineupPlayerIds = lineup.sort((a, b) => a.position - b.position).map((l) => l.player_id)
    setSelectedPlayers(lineupPlayerIds)
  }, [lineup])

  const handlePlayerSelect = (position: number, playerId: string) => {
    const newSelection = [...selectedPlayers]
    newSelection[position] = playerId
    setSelectedPlayers(newSelection)
  }

  const handleSave = () => {
    const validPlayers = selectedPlayers.filter(Boolean)
    if (validPlayers.length >= 4) {
      onSave(validPlayers)
    }
  }

  return (
    <div className="space-y-4">
      {[0, 1, 2, 3, 4].map((position) => (
        <div key={position} className="flex items-center gap-3">
          <Badge variant={position === 4 ? "secondary" : "default"}>
            {position === 4 ? "Ersatz" : `Pos ${position + 1}`}
          </Badge>
          <Select
            value={selectedPlayers[position] || ""}
            onValueChange={(value) => handlePlayerSelect(position, value)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Spieler auswählen..." />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      <Button onClick={handleSave} disabled={loading || selectedPlayers.filter(Boolean).length < 4} className="w-full">
        {loading ? "Speichern..." : "Aufstellung speichern"}
      </Button>
    </div>
  )
}
