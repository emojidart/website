"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Trophy, Target, Users } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useDartData } from "@/hooks/use-dart-data"

interface Player {
  id: string
  name: string
  profile_picture_url?: string
}

interface PlayerResult {
  playerId: string
  playerName: string
  score: number
  position: number
}

export default function ResultEntry() {
  const [tournamentName, setTournamentName] = useState("")
  const [tournamentDate, setTournamentDate] = useState("")
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const { calculatePlayerStats } = useDartData()

  useEffect(() => {
    loadPlayers()
  }, [])

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("spieldatenbank")
        .select("id, name, profile_picture_url")
        .order("name")

      if (error) throw error
      setPlayers(data || [])
    } catch (error) {
      console.error("Fehler beim Laden der Spieler:", error)
    }
  }

  const filteredPlayers = players.filter(
    (player) =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedPlayers.some((sp) => sp.playerId === player.id),
  )

  const addPlayer = (player: Player) => {
    const newPlayer: PlayerResult = {
      playerId: player.id,
      playerName: player.name,
      score: 0,
      position: selectedPlayers.length + 1,
    }
    setSelectedPlayers([...selectedPlayers, newPlayer])
    setSearchTerm("")
  }

  const removePlayer = (playerId: string) => {
    const updatedPlayers = selectedPlayers
      .filter((p) => p.playerId !== playerId)
      .map((p, index) => ({ ...p, position: index + 1 }))
    setSelectedPlayers(updatedPlayers)
  }

  const updatePlayerScore = (playerId: string, score: number) => {
    setSelectedPlayers((prev) => prev.map((p) => (p.playerId === playerId ? { ...p, score } : p)))
  }

  const sortPlayersByScore = () => {
    const sorted = [...selectedPlayers]
      .sort((a, b) => b.score - a.score)
      .map((p, index) => ({ ...p, position: index + 1 }))
    setSelectedPlayers(sorted)
  }

  const submitResults = async () => {
    if (!tournamentName || !tournamentDate || selectedPlayers.length === 0) {
      alert("Bitte alle Felder ausfüllen und mindestens einen Spieler hinzufügen.")
      return
    }

    setIsLoading(true)
    try {
      // Turnier erstellen
      const { data: tournament, error: tournamentError } = await supabase
        .from("tournaments")
        .insert({
          name: tournamentName,
          date: tournamentDate,
          player_count: selectedPlayers.length,
        })
        .select()
        .single()

      if (tournamentError) throw tournamentError

      // Ergebnisse einfügen
      const results = selectedPlayers.map((player) => ({
        tournament_id: tournament.id,
        player_id: player.playerId,
        score: player.score,
        position: player.position,
      }))

      const { error: resultsError } = await supabase.from("results").insert(results)

      if (resultsError) throw resultsError

      // Spielerstatistiken aktualisieren
      for (const player of selectedPlayers) {
        await calculatePlayerStats(player.playerId)
      }

      alert("Turnierergebnisse erfolgreich gespeichert!")

      // Formular zurücksetzen
      setTournamentName("")
      setTournamentDate("")
      setSelectedPlayers([])
    } catch (error) {
      console.error("Fehler beim Speichern:", error)
      alert("Fehler beim Speichern der Ergebnisse.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-600" />
            Turnierergebnisse eingeben
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Turnier-Informationen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tournament-name">Turniername</Label>
              <Input
                id="tournament-name"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="z.B. Weihnachtsturnier 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tournament-date">Datum</Label>
              <Input
                id="tournament-date"
                type="date"
                value={tournamentDate}
                onChange={(e) => setTournamentDate(e.target.value)}
              />
            </div>
          </div>

          {/* Spieler hinzufügen */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <Label>Spieler hinzufügen</Label>
            </div>

            <div className="space-y-2">
              <Input
                placeholder="Spieler suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {searchTerm && filteredPlayers.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {filteredPlayers.slice(0, 5).map((player) => (
                    <div
                      key={player.id}
                      className="p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                      onClick={() => addPlayer(player)}
                    >
                      <span>{player.name}</span>
                      <Plus className="h-4 w-4 text-green-600" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ausgewählte Spieler */}
          {selectedPlayers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <Label>Teilnehmer ({selectedPlayers.length})</Label>
                </div>
                <Button variant="outline" size="sm" onClick={sortPlayersByScore}>
                  Nach Punkten sortieren
                </Button>
              </div>

              <div className="space-y-3">
                {selectedPlayers.map((player, index) => (
                  <Card key={player.playerId} className="p-4">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="min-w-[60px] justify-center">
                        Platz {player.position}
                      </Badge>

                      <div className="flex-1">
                        <span className="font-medium">{player.playerName}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label htmlFor={`score-${player.playerId}`} className="text-sm">
                          Punkte:
                        </Label>
                        <Input
                          id={`score-${player.playerId}`}
                          type="number"
                          value={player.score}
                          onChange={(e) => updatePlayerScore(player.playerId, Number.parseInt(e.target.value) || 0)}
                          className="w-20"
                          min="0"
                        />
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePlayer(player.playerId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              onClick={submitResults}
              disabled={isLoading || !tournamentName || !tournamentDate || selectedPlayers.length === 0}
              className="w-full"
            >
              {isLoading ? "Speichere..." : "Turnierergebnisse speichern"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
