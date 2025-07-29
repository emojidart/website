"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import { Database, Target, Users, Save, UserCheck } from "lucide-react"

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
    setFormMessage("Verarbeitung läuft...")

    if (!user) {
      setFormMessage("Fehler: Nicht authentifiziert.")
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
            points: Number(points),
            legs: Number(legs),
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
      onDataSaved()
      onPlayerNameChange("")
      setPoints("")
      setLegs("")
    } catch (error: any) {
      setFormMessage(`Fehler: ${error.message}`)
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
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Spielerdaten hinzufügen</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Spielergebnisse eingeben und Statistiken aktualisieren</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Player Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Spieler</label>
              <div className="flex space-x-3">
                <Input
                  type="text"
                  value={selectedPlayerName || ""}
                  onChange={(e) => onPlayerNameChange(e.target.value)}
                  placeholder="Spielername eingeben"
                  className="flex-1 h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50 transition-all duration-200"
                  required
                />
                <Button
                  type="button"
                  onClick={onOpenPlayerList}
                  variant="outline"
                  className="h-12 px-4 border-gray-200 hover:bg-red-50 hover:border-red-300 bg-transparent transition-all duration-200"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Auswählen
                </Button>
              </div>
            </div>

            {/* Game Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Spieltyp</label>
              <Select value={dartType} onValueChange={setDartType}>
                <SelectTrigger className="h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="edart_players">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span>E-Dart</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="steel_dart_players">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span>Steel Dart</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
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
                  className="h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50 transition-all duration-200"
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
                  className="h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verarbeitung läuft...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Daten speichern</span>
                </div>
              )}
            </Button>

            {/* Status Message */}
            {formMessage && (
              <div
                className={`p-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  formMessage.includes("Fehler") || formMessage.includes("Error")
                    ? "bg-red-50 text-red-700 border border-red-100"
                    : "bg-green-50 text-green-700 border border-green-100"
                }`}
              >
                {formMessage}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
