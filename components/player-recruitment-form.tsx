"use client"

import { LoadingIndicator } from "@/components/loading/loading"

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
    <div className="w-full">
      <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground sm:text-lg">Spieler suchen / Verstärkung</CardTitle>
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground sm:text-sm">Neue Suche eingeben</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Team Name */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="teamName">
                Verein / Mannschaft
              </label>
              <Input
                id="teamName"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Name des Vereins oder der Mannschaft"
                className="h-10 rounded-xl border-border bg-card text-sm focus:border-border focus:ring-border"
                required
              />
            </div>

            {/* League */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="league">
                Liga
              </label>
              <Input
                id="league"
                type="text"
                value={league}
                onChange={(e) => setLeague(e.target.value)}
                placeholder="Z.B. Landesliga, Regionalliga"
                className="h-10 rounded-xl border-border bg-card text-sm focus:border-border focus:ring-border"
                required
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="startDate">
                Ab wann (Datum)
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 rounded-xl border-border bg-card text-sm focus:border-border focus:ring-border"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="description">
                Kurzer Text / Beschreibung
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreiben Sie, welche Art von Spieler gesucht wird oder weitere Details."
                rows={4}
                className="min-h-[92px] rounded-xl border-border bg-card text-sm focus:border-border focus:ring-border"
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-xl bg-background text-sm font-semibold text-white hover:bg-background"
             loading={Boolean(loading)} loadingLabel="Speichern...">{(
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Spielergesuche speichern</span>
                </div>
              )}</Button>

            {/* Status Message for form submission */}
            {formMessage && (
              <div
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${
                  formMessageType === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : formMessageType === "success"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-border bg-muted text-muted-foreground"
                }`}
              >
                <div className="flex items-center space-x-2">
                  {formMessageType === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : formMessageType === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <LoadingIndicator className="w-4 h-4" />
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
