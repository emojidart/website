"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

interface AdminPanelProps {
  isVisible: boolean
  user: User | null
  onDataSaved: () => void
  onOpenPlayerList: () => void
  selectedPlayerName: string | null
  onPlayerNameChange: (name: string) => void
}

export function AdminPanel({
  isVisible,
  user,
  onDataSaved,
  onOpenPlayerList,
  selectedPlayerName,
  onPlayerNameChange,
}: AdminPanelProps) {
  const [dartType, setDartType] = useState("edart_players")
  const [points, setPoints] = useState<number | string>("")
  const [legs, setLegs] = useState<number | string>("")
  const [formMessage, setFormMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFormMessage("Speichere Daten...")

    if (!user) {
      setFormMessage("Fehler: Nicht eingeloggt.")
      setLoading(false)
      return
    }
    if (!selectedPlayerName || points === "" || legs === "") {
      setFormMessage("Bitte alle Felder ausfüllen.")
      setLoading(false)
      return
    }

    try {
      // Zuerst prüfen, ob der Spieler bereits existiert
      const { data: existingPlayersArray, error: fetchError } = await supabase
        .from(dartType)
        .select("id, participations")
        .eq("name", selectedPlayerName)
        .limit(1)

      if (fetchError) {
        throw fetchError
      }

      let newParticipations
      let dbOperation
      const existingPlayer = existingPlayersArray && existingPlayersArray.length > 0 ? existingPlayersArray[0] : null

      if (existingPlayer) {
        // Wenn Spieler existiert, addiere die neuen Punkte und Legs zu den bestehenden
        const { data: currentPlayerStats, error: statsFetchError } = await supabase
          .from(dartType)
          .select("points, legs")
          .eq("id", existingPlayer.id)
          .single()

        if (statsFetchError) {
          throw statsFetchError
        }

        const updatedPoints = (currentPlayerStats.points || 0) + Number(points)
        const updatedLegs = (currentPlayerStats.legs || 0) + Number(legs)
        newParticipations = existingPlayer.participations + 1

        dbOperation = supabase
          .from(dartType)
          .update({
            participations: newParticipations,
            points: updatedPoints,
            legs: updatedLegs,
          })
          .eq("id", existingPlayer.id)
      } else {
        // Wenn Spieler nicht existiert, füge neuen Spieler ein
        newParticipations = 1
        dbOperation = supabase.from(dartType).insert([
          {
            name: selectedPlayerName,
            participations: newParticipations,
            points: Number(points), // Stelle sicher, dass es eine Zahl ist
            legs: Number(legs), // Stelle sicher, dass es eine Zahl ist
            user_id: user.id,
          },
        ])
      }

      const { error: dbError } = await dbOperation

      if (dbError) {
        throw dbError
      }

      // Pot-Logik
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

      setFormMessage("Daten erfolgreich gespeichert!")
      onDataSaved() // Trigger re-fetch of all data
      onPlayerNameChange("") // Clear selected player
      setPoints("")
      setLegs("")
    } catch (error: any) {
      setFormMessage(`Fehler beim Speichern: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isVisible) return null

  return (
    <section className="admin-panel p-4 flex justify-center">
      <Card className="w-full max-w-md bg-brutal-card-bg text-brutal-text border-brutal-border rounded-xl shadow-2xl">
        <CardHeader className="pb-6">
          <CardTitle className="text-4xl font-extrabold text-center text-brutal-accent-gold drop-shadow-md">
            Spielerdaten eingeben
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <label htmlFor="player-name" className="block text-lg font-medium text-brutal-text-muted mb-2">
                Name:
              </label>
              <div className="flex gap-3">
                <Input
                  id="player-name"
                  type="text"
                  value={selectedPlayerName || ""}
                  onChange={(e) => onPlayerNameChange(e.target.value)}
                  required
                  className="flex-grow h-12 bg-brutal-bg border-brutal-border text-brutal-text placeholder:text-brutal-text-muted focus:ring-brutal-accent-red focus:border-brutal-accent-red text-lg px-4 rounded-lg"
                />
                <Button
                  type="button"
                  onClick={onOpenPlayerList}
                  className="h-12 bg-brutal-accent-red hover:bg-brutal-accent-gold text-brutal-bg font-bold text-base px-6 rounded-lg transition-colors duration-200 shadow-md"
                >
                  Spieler wählen
                </Button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="dart-type" className="block text-lg font-medium text-brutal-text-muted mb-2">
                Dart-Typ:
              </label>
              <Select value={dartType} onValueChange={setDartType}>
                <SelectTrigger className="h-12 w-full bg-brutal-bg border-brutal-border text-brutal-text focus:ring-brutal-accent-red focus:border-brutal-accent-red text-lg px-4 rounded-lg">
                  <SelectValue placeholder="Wähle Dart-Typ" />
                </SelectTrigger>
                <SelectContent className="bg-brutal-card-bg text-brutal-text border-brutal-border rounded-lg shadow-lg">
                  <SelectItem value="edart_players" className="text-lg hover:bg-brutal-hover">
                    E-Dart
                  </SelectItem>
                  <SelectItem value="steel_dart_players" className="text-lg hover:bg-brutal-hover">
                    Steel-Dart
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="form-group">
              <label htmlFor="points" className="block text-lg font-medium text-brutal-text-muted mb-2">
                Punkte:
              </label>
              <Input
                id="points"
                type="number"
                min="0"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                required
                className="h-12 bg-brutal-bg border-brutal-border text-brutal-text placeholder:text-brutal-text-muted focus:ring-brutal-accent-red focus:border-brutal-accent-red text-lg px-4 rounded-lg"
              />
            </div>
            <div className="form-group">
              <label htmlFor="legs" className="block text-lg font-medium text-brutal-text-muted mb-2">
                Legs:
              </label>
              <Input
                id="legs"
                type="number"
                min="0"
                value={legs}
                onChange={(e) => setLegs(e.target.value)}
                required
                className="h-12 bg-brutal-bg border-brutal-border text-brutal-text placeholder:text-brutal-text-muted focus:ring-brutal-accent-red focus:border-brutal-accent-red text-lg px-4 rounded-lg"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-brutal-accent-gold hover:bg-brutal-accent-red text-brutal-bg font-extrabold text-lg rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {loading ? "Speichere Daten..." : "Daten speichern"}
            </Button>
            {formMessage && (
              <p
                className={`form-message mt-8 text-center text-xl font-semibold ${formMessage.includes("Fehler") ? "text-destructive" : "text-green-500"}`}
              >
                {formMessage}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
