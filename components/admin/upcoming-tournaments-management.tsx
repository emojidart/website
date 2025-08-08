"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import {
Card,
CardContent,
CardHeader,
CardTitle,
CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select"
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from "@/components/ui/table"
import {
AlertDialog,
AlertDialogAction,
AlertDialogCancel,
AlertDialogContent,
AlertDialogDescription,
AlertDialogFooter,
AlertDialogHeader,
AlertDialogTitle,
AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { PlusCircle, Edit, Trash2, Save, XCircle, Upload, Calendar, MapPin, Euro, Swords, Info, ImageIcon, Loader2, CheckCircle, AlertCircle, Target } from 'lucide-react'
import Image from "next/image"
import type { User } from "@supabase/supabase-js"

interface Tournament {
id: string
name: string
date: string
time: string
location: string
entry_fee: number
mode: string
details: string | null
photo_url: string | null
user_id: string
}

interface UpcomingTournamentsManagementProps {
user: User | null
}

export function UpcomingTournamentsManagement({ user }: UpcomingTournamentsManagementProps) {
const [tournaments, setTournaments] = useState<Tournament[]>([])
const [form, setForm] = useState<Omit<Tournament, "id" | "user_id" | "created_at"> & { photo_file: File | null }>({
  name: "",
  date: "",
  time: "",
  location: "",
  entry_fee: 0,
  mode: "edart",
  details: "",
  photo_url: null,
  photo_file: null,
})
const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null)
const [loading, setLoading] = useState(false)
const [formMessage, setFormMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)
const [photoPreview, setPhotoPreview] = useState<string | null>(null)

useEffect(() => {
  fetchTournaments()
}, [])

const fetchTournaments = async () => {
  setLoading(true)
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("date", { ascending: true })

  if (error) {
    console.error("Error fetching tournaments:", error)
    setFormMessage({ type: "error", text: "Fehler beim Laden der Turniere." })
  } else {
    setTournaments(data || [])
  }
  setLoading(false)
}

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target
  setForm((prev) => ({ ...prev, [name]: value }))
}

const handleSelectChange = (name: string, value: string) => {
  setForm((prev) => ({ ...prev, [name]: value }))
}

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) {
    setForm((prev) => ({ ...prev, photo_file: file }))
    setPhotoPreview(URL.createObjectURL(file))
  } else {
    setForm((prev) => ({ ...prev, photo_file: null }))
    setPhotoPreview(null)
  }
}

const uploadPhoto = async (file: File): Promise<string | null> => {
  if (!file) return null

  const fileExtension = file.name.split(".").pop()
  const filePath = `tournament-photos/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`

  const { data, error } = await supabase.storage
    .from("tournament-photos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (error) {
    throw error
  }

  const { data: publicUrlData } = supabase.storage.from("tournament-photos").getPublicUrl(filePath)
  return publicUrlData.publicUrl
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setFormMessage(null)

  if (!user) {
    setFormMessage({ type: "error", text: "Fehler: Nicht authentifiziert." })
    setLoading(false)
    return
  }

  let photoUrl: string | null = form.photo_url
  try {
    if (form.photo_file) {
      photoUrl = await uploadPhoto(form.photo_file)
    }

    const tournamentData = {
      name: form.name,
      date: form.date,
      time: form.time,
      location: form.location,
      entry_fee: Number(form.entry_fee),
      mode: form.mode,
      details: form.details,
      photo_url: photoUrl,
      user_id: user.id,
    }

    if (editingTournamentId) {
      const { error } = await supabase
        .from("tournaments")
        .update(tournamentData)
        .eq("id", editingTournamentId)

      if (error) throw error
      setFormMessage({ type: "success", text: "Turnier erfolgreich aktualisiert!" })
    } else {
      const { error } = await supabase.from("tournaments").insert([tournamentData])
      if (error) throw error
      setFormMessage({ type: "success", text: "Turnier erfolgreich hinzugefügt!" })
    }

    resetForm()
    fetchTournaments()
  } catch (error: any) {
    console.error("Error saving tournament:", error)
    setFormMessage({ type: "error", text: `Fehler beim Speichern des Turniers: ${error.message}` })
  } finally {
    setLoading(false)
  }
}

const handleEdit = (tournament: Tournament) => {
  setEditingTournamentId(tournament.id)
  setForm({
    name: tournament.name,
    date: tournament.date,
    time: tournament.time,
    location: tournament.location,
    entry_fee: tournament.entry_fee,
    mode: tournament.mode,
    details: tournament.details,
    photo_url: tournament.photo_url,
    photo_file: null, // Don't pre-fill file input
  })
  setPhotoPreview(tournament.photo_url)
  setFormMessage(null)
}

const handleDelete = async (id: string) => {
  setLoading(true)
  setFormMessage(null)
  const { error } = await supabase.from("tournaments").delete().eq("id", id)

  if (error) {
    console.error("Error deleting tournament:", error)
    setFormMessage({ type: "error", text: "Fehler beim Löschen des Turniers." })
  } else {
    setFormMessage({ type: "success", text: "Turnier erfolgreich gelöscht!" })
    fetchTournaments()
  }
  setLoading(false)
}

const resetForm = () => {
  setEditingTournamentId(null)
  setForm({
    name: "",
    date: "",
    time: "",
    location: "",
    entry_fee: 0,
    mode: "edart",
    details: "",
    photo_url: null,
    photo_file: null,
  })
  setPhotoPreview(null)
}

return (
  <div className="max-w-4xl mx-auto space-y-8">
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-gray-100 pb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
            <PlusCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              {editingTournamentId ? "Turnier bearbeiten" : "Neues Turnier anlegen"}
            </CardTitle>
            <CardDescription className="text-sm text-gray-500 mt-1">
              Details für bevorstehende Turniere eingeben und verwalten.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                Turniername
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleInputChange}
                placeholder="Z.B. Sommer Cup 2025"
                required
                className="h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium text-gray-700">
                Datum
              </label>
              <Input
                id="date"
                name="date"
                type="date"
                value={form.date}
                onChange={handleInputChange}
                required
                className="h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="time" className="text-sm font-medium text-gray-700">
                Uhrzeit
              </label>
              <Input
                id="time"
                name="time"
                type="time"
                value={form.time}
                onChange={handleInputChange}
                placeholder="19:00"
                required
                className="h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="location" className="text-sm font-medium text-gray-700">
                Ort
              </label>
              <Input
                id="location"
                name="location"
                type="text"
                value={form.location}
                onChange={handleInputChange}
                placeholder="Z.B. Pfeil-OK Salzburg"
                required
                className="h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="entry_fee" className="text-sm font-medium text-gray-700">
                Startgeld (€)
              </label>
              <Input
                id="entry_fee"
                name="entry_fee"
                type="number"
                step="0.01"
                value={form.entry_fee}
                onChange={handleInputChange}
                placeholder="Z.B. 10.00"
                required
                className="h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="mode" className="text-sm font-medium text-gray-700">
                Modus
              </label>
              <Select value={form.mode} onValueChange={(value) => handleSelectChange("mode", value)}>
                <SelectTrigger className="h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50">
                  <SelectValue placeholder="Wähle einen Modus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="edart">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span>E-Dart</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="steeldart">
                    <div className="flex items-center space-x-2">
                      <Swords className="h-4 w-4 text-green-600" />
                      <span>Steel Dart</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="both">
                    <div className="flex items-center space-x-2">
                      <Swords className="h-4 w-4 text-purple-600" />
                      <span>Beide</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="details" className="text-sm font-medium text-gray-700">
              Details (optional)
            </label>
            <Textarea
              id="details"
              name="details"
              value={form.details || ""}
              onChange={handleInputChange}
              placeholder="Zusätzliche Informationen zum Turnier, z.B. Regeln, Preise..."
              rows={4}
              className="border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="photo_file" className="text-sm font-medium text-gray-700">
              Turnierfoto (optional)
            </label>
            <div className="flex items-center space-x-3">
              <Input
                id="photo_file"
                name="photo_file"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="flex-1 h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
              />
              {photoPreview && (
                <div className="relative w-16 h-12 flex-shrink-0 rounded-md overflow-hidden border border-gray-200">
                  <Image
                    src={photoPreview || "/placeholder.svg"}
                    alt="Turnierfoto Vorschau"
                    fill
                    style={{ objectFit: "cover" }}
                    className="rounded-md"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Speichern...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>{editingTournamentId ? "Änderungen speichern" : "Turnier anlegen"}</span>
                </div>
              )}
            </Button>
            {editingTournamentId && (
              <Button
                type="button"
                onClick={resetForm}
                variant="outline"
                className="h-12 px-4 border-gray-200 hover:bg-gray-50 hover:border-gray-300 bg-transparent text-gray-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
            )}
          </div>

          {formMessage && (
            <div
              className={`p-4 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                formMessage.type === "error"
                  ? "bg-red-50 text-red-700 border border-red-100"
                  : formMessage.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-100"
                    : "bg-gray-50 text-gray-700 border border-gray-100"
              }`}
            >
              {formMessage.type === "error" ? (
                <AlertCircle className="h-4 w-4" />
              ) : formMessage.type === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
              <span>{formMessage.text}</span>
            </div>
          )}
        </form>
      </CardContent>
    </Card>

    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-gray-100 pb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">Bevorstehende Turniere</CardTitle>
            <CardDescription className="text-sm text-gray-500 mt-1">
              Übersicht und Verwaltung aller geplanten Turniere.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {loading && tournaments.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <span className="ml-3 text-gray-600">Turniere werden geladen...</span>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            Noch keine Turniere angelegt. Lege jetzt dein erstes Turnier an!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turniername</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Ort</TableHead>
                  <TableHead>Modus</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournaments.map((tournament) => (
                  <TableRow key={tournament.id}>
                    <TableCell className="font-medium">{tournament.name}</TableCell>
                    <TableCell>{new Date(tournament.date).toLocaleDateString("de-DE")}</TableCell>
                    <TableCell>{tournament.location}</TableCell>
                    <TableCell>{tournament.mode}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(tournament)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Bearbeiten</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Löschen</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Bist du dir sicher?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht werden. Dies wird das Turnier{" "}
                                <span className="font-bold">{tournament.name}</span> und alle zugehörigen
                                Anmeldungen dauerhaft löschen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(tournament.id)}>
                                Löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
)
}
