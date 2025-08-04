"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Search, Save } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

interface PlayerRecruitmentFormProps {
  user: User | null
  onDataSaved: () => void
}

export function PlayerRecruitmentForm({ user, onDataSaved }: PlayerRecruitmentFormProps) {
  const [teamName, setTeamName] = useState("")
  const [league, setLeague] = useState("")
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")
  const [formMessage, setFormMessage] = useState("")
  const [formMessageType, setFormMessageType] = useState<"success" | "error" | "info">("info")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFormMessage("Verarbeitung läuft...")
    setFormMessageType("info")

    if (!user) {
      setFormMessage("Fehler: Nicht authentifiziert.")
      setFormMessageType("error")
      setLoading(false)
      return
    }
    if (!teamName || !league || !startDate || !description) {
      setFormMessage("Bitte alle Felder ausfüllen.")
      setFormMessageType("error")
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.from("player_recruitment_needs").insert([
        {
          team_name: teamName,
          league: league,
          start_date: startDate,
          description: description,
          user_id: user.id,
        },
      ])

      if (error) {
        throw error
      }

      setFormMessage("Spielergesuche erfolgreich gespeichert!")
      setFormMessageType("success")
      setTeamName("")
      setLeague("")
      setStartDate(new Date().toISOString().split("T")[0])
      setDescription("")
      onDataSaved() // Trigger data refresh in parent if needed
    } catch (error: any) {
      setFormMessage(`Fehler: ${error.message}`)
      setFormMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
              <Search className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Spieler suchen / Verstärkung</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Neue Suche eingeben</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Team Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="teamName">
                Verein / Mannschaft
              </label>
              <Input
                id="teamName"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Name des Vereins oder der Mannschaft"
                className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 transition-all duration-200"
                required
              />
            </div>

            {/* League */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="league">
                Liga
              </label>
              <Input
                id="league"
                type="text"
                value={league}
                onChange={(e) => setLeague(e.target.value)}
                placeholder="Z.B. Landesliga, Regionalliga"
                className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 transition-all duration-200"
                required
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="startDate">
                Ab wann (Datum)
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 transition-all duration-200"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="description">
                Kurzer Text / Beschreibung
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreiben Sie, welche Art von Spieler gesucht wird oder weitere Details."
                rows={4}
                className="min-h-[100px] border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 transition-all duration-200"
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Speichern...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Spielergesuche speichern</span>
                </div>
              )}
            </Button>

            {/* Status Message for form submission */}
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
