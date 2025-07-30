"use client"

import type React from "react"
import { CheckCircle, AlertCircle, Save, Trophy, Target, Users } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

interface Player {
  id: string
  name: string
  profile_picture_url?: string
}

interface ResultEntryProps {
  isVisible: boolean
  user: User | null
  onDataSaved: () => void
}

export function ResultEntry({ isVisible, user, onDataSaved }: ResultEntryProps) {
  const [gameType, setGameType] = useState<"edart" | "steeldart">("edart")
  const [selectedPlayer, setSelectedPlayer] = useState<string>("")
  const [players, setPlayers] = useState<Player[]>([])
  const [points, setPoints] = useState<number | string>("")
  const [legs, setLegs] = useState<number | string>("")
  const [gameDate, setGameDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [formMessage, setFormMessage] = useState("")
  const [formMessageType, setFormMessageType] = useState<"success" | "error" | "info">("info")
  const [loading, setLoading] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  const loadPlayers = async () => {
    setLoadingPlayers(true)
    try {
      // Lade ALLE Spieler aus der players Tabelle (nur Namen und Fotos)
      const { data, error } = await supabase.from("players").select("id, name, profile_picture_url").order("name")

      if (error) throw error
      setPlayers(data || [])
      setSelectedPlayer("")
    } catch (error: any) {
      console.error("Error loading players:", error)
      setFormMessage(`Fehler beim Laden der Spieler: ${error.message}`)
      setFormMessageType("error")
    } finally {
      setLoadingPlayers(false)
    }
  }

  useEffect(() => {
    loadPlayers()
  }, [])

  const recalculatePlayerStats = async (playerName: string, gameType: string) => {
    try {
      // Bestimme die richtige Statistik-Tabelle
      const statsTable = gameType === "edart" ? "edart_players" : "steel_dart_players"

      // Hole alle Spiele für diesen Spieler und Spieltyp
      const { data: games, error: gamesError } = await supabase
        .from("game_entries")
        .select("points, legs")
        .eq("player_name", playerName)
        .eq("game_type", gameType)

      if (gamesError) throw gamesError

      // Berechne Statistiken
      const totalPoints = games?.reduce((sum, game) => sum + (game.points || 0), 0) || 0
      const totalLegs = games?.reduce((sum, game) => sum + (game.legs || 0), 0) || 0
      const participations = games?.length || 0

      // Prüfe ob Spieler in Statistik-Tabelle existiert
      const { data: existingPlayer, error: fetchError } = await supabase
        .from(statsTable)
        .select("id")
        .eq("name", playerName)
        .single()

      if (existingPlayer) {
        // Update bestehenden Spieler
        const { error: updateError } = await supabase
          .from(statsTable)
          .update({
            points: totalPoints,
            legs: totalLegs,
            participations: participations,
          })
          .eq("name", playerName)

        if (updateError) throw updateError
      } else {
        // Erstelle neuen Eintrag in Statistik-Tabelle
        const { error: insertError } = await supabase.from(statsTable).insert([
          {
            name: playerName,
            points: totalPoints,
            legs: totalLegs,
            participations: participations,
            user_id: user?.id,
          },
        ])

        if (insertError) throw insertError
      }
    } catch (error: any) {
      console.error("Error recalculating stats:", error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFormMessage("Ergebnis wird gespeichert...")
    setFormMessageType("info")

    if (!user) {
      setFormMessage("Fehler: Nicht authentifiziert.")
      setFormMessageType("error")
      setLoading(false)
      return
    }

    if (!selectedPlayer || points === "" || legs === "" || gameDate === "") {
      setFormMessage("Bitte alle Felder ausfüllen.")
      setFormMessageType("error")
      setLoading(false)
      return
    }

    const numericPoints = Number(points)
    const numericLegs = Number(legs)

    if (isNaN(numericPoints) || isNaN(numericLegs) || numericPoints < 0 || numericLegs < 0) {
      setFormMessage("Punkte und Legs müssen gültige Zahlen sein.")
      setFormMessageType("error")
      setLoading(false)
      return
    }

    try {
      // Find selected player name
      const selectedPlayerData = players.find((p) => p.id === selectedPlayer)
      if (!selectedPlayerData) {
        throw new Error("Spieler nicht gefunden")
      }

      // Add game entry
      const { error: gameEntryError } = await supabase.from("game_entries").insert([
        {
          player_name: selectedPlayerData.name,
          game_type: gameType,
          points: numericPoints,
          legs: numericLegs,
          game_date: gameDate,
          user_id: user.id,
        },
      ])

      if (gameEntryError) {
        throw gameEntryError
      }

      // Recalculate player stats
      await recalculatePlayerStats(selectedPlayerData.name, gameType)

      // Update pot total
      const { data: potData, error: potFetchError } = await supabase.from("pot_total").select("id, amount").single()

      if (potFetchError) {
        throw potFetchError
      }

      const newPotAmount = Number.parseFloat(potData.amount) + 4.0
      const { error: potUpdateError } = await supabase
        .from("pot_total")
        .update({ amount: newPotAmount })
        .eq("id", potData.id)

      if (potUpdateError) {
        throw potUpdateError
      }

      setFormMessage("Ergebnis erfolgreich gespeichert!")
      setFormMessageType("success")
      onDataSaved()

      // Reset form
      setSelectedPlayer("")
      setPoints("")
      setLegs("")
    } catch (error: any) {
      setFormMessage(`Fehler: ${error.message}`)
      setFormMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Spielergebnis eingeben</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Turnierergebnis für registrierte Spieler erfassen</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tournament Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Turnierart</label>
              <Select value={gameType} onValueChange={(value: "edart" | "steeldart") => setGameType(value)}>
                <SelectTrigger className="h-12 border-gray-200 focus:border-green-500 focus:ring-green-500 bg-gray-50/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="edart">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span>E-Dart Turnier</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="steeldart">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span>Steel Dart Turnier</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Player Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Spieler auswählen</label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer} disabled={loadingPlayers}>
                <SelectTrigger className="h-12 border-gray-200 focus:border-green-500 focus:ring-green-500 bg-gray-50/50">
                  <SelectValue placeholder={loadingPlayers ? "Lade Spieler..." : "Spieler auswählen"} />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{player.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {players.length === 0 && !loadingPlayers && (
                <p className="text-xs text-gray-500 mt-1">Keine Spieler gefunden. Bitte zuerst Spieler registrieren.</p>
              )}
            </div>

            {/* Game Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Turnierdatum</label>
              <Input
                type="date"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
                className="h-12 border-gray-200 focus:border-green-500 focus:ring-green-500 bg-gray-50/50 transition-all duration-200"
                required
              />
            </div>

            {/* Points and Legs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Punkte</label>
                <Input
                  type="number"
                  min="0"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="0"
                  className="h-12 border-gray-200 focus:border-green-500 focus:ring-green-500 bg-gray-50/50 transition-all duration-200"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Legs</label>
                <Input
                  type="number"
                  min="0"
                  value={legs}
                  onChange={(e) => setLegs(e.target.value)}
                  placeholder="0"
                  className="h-12 border-gray-200 focus:border-green-500 focus:ring-green-500 bg-gray-50/50 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || loadingPlayers || players.length === 0}
              className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Speichern...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Ergebnis speichern</span>
                </div>
              )}
            </Button>

            {/* Status Message */}
            {formMessage && (
              <div
                className={`p-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  formMessageType === "error"
                    ? "bg-red-50 text-red-700 border border-red-100"
                    : formMessageType === "success"
                      ? "bg-green-50 text-green-700 border border-green-100"
                      : "bg-gray-50 text-gray-700 border border-gray-100"
                }`}
              >
                <div className="flex items-center space-x-2">
                  {formMessageType === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : formMessageType === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{formMessage}</span>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}