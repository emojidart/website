"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Save } from "lucide-react"

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
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(lineup.map((l) => l.player_id))

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId)
      } else if (prev.length < 5) {
        return [...prev, playerId]
      }
      return prev
    })
  }

  const handleSave = () => {
    onSave(selectedPlayers)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="text-sm font-medium">Spieler auswählen ({selectedPlayers.length}/5)</span>
        </div>
        <Button
          onClick={handleSave}
          disabled={loading || selectedPlayers.length === 0}
          size="sm"
          className="w-full sm:w-auto min-h-[44px] touch-manipulation"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Speichern..." : "Aufstellung speichern"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {players.map((player, index) => {
          const isSelected = selectedPlayers.includes(player.id)
          const position = selectedPlayers.indexOf(player.id) + 1
          const isSubstitute = position === 5

          return (
            <Card
              key={player.id}
              className={`cursor-pointer transition-all min-h-[60px] touch-manipulation ${
                isSelected ? "border-primary bg-primary/5 shadow-md" : "hover:bg-muted/50"
              }`}
              onClick={() => handlePlayerToggle(player.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-sm sm:text-base">{player.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <Badge variant={isSubstitute ? "secondary" : "default"} className="text-xs">
                        {isSubstitute ? "Ersatz" : `Pos. ${position}`}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedPlayers.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Wähle bis zu 5 Spieler für die Aufstellung aus</p>
      )}
    </div>
  )
}
