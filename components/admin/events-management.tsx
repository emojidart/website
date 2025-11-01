"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import {
  PlusCircle,
  Edit,
  Trash2,
  Save,
  XCircle,
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  PartyPopper,
  Gamepad2,
  MessageSquare,
} from "lucide-react"
import Image from "next/image"
import type { User } from "@supabase/supabase-js"

interface Event {
  id: string
  name: string
  event_type: string
  event_date: string
  event_time: string
  location: string
  entry_fee: number
  max_participants: number | null
  details: string | null
  photo_url: string | null
  user_id: string
}

interface EventsManagementProps {
  user: User | null
}

export function EventsManagement({ user }: EventsManagementProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [form, setForm] = useState<Omit<Event, "id" | "user_id" | "created_at"> & { photo_file: File | null }>({
    name: "",
    event_type: "party",
    event_date: "",
    event_time: "",
    location: "",
    entry_fee: 0,
    max_participants: null,
    details: "",
    photo_url: null,
    photo_file: null,
  })
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    setLoading(true)
    const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true })

    if (error) {
      console.error("Error fetching events:", error)
      setFormMessage({ type: "error", text: "Fehler beim Laden der Veranstaltungen." })
    } else {
      setEvents(data || [])
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
    const filePath = `event-photos/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`

    const { data, error } = await supabase.storage.from("tournament-photos").upload(filePath, file, {
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

      const eventData = {
        name: form.name,
        event_type: form.event_type,
        event_date: form.event_date,
        event_time: form.event_time,
        location: form.location,
        entry_fee: Number(form.entry_fee),
        max_participants: form.max_participants ? Number(form.max_participants) : null,
        details: form.details,
        photo_url: photoUrl,
        user_id: user.id,
      }

      if (editingEventId) {
        const { error } = await supabase.from("events").update(eventData).eq("id", editingEventId)

        if (error) throw error
        setFormMessage({ type: "success", text: "Veranstaltung erfolgreich aktualisiert!" })
      } else {
        const { error } = await supabase.from("events").insert([eventData])
        if (error) throw error
        setFormMessage({ type: "success", text: "Veranstaltung erfolgreich hinzugefügt!" })
      }

      resetForm()
      fetchEvents()
    } catch (error: any) {
      console.error("Error saving event:", error)
      setFormMessage({ type: "error", text: `Fehler beim Speichern der Veranstaltung: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (event: Event) => {
    setEditingEventId(event.id)
    setForm({
      name: event.name,
      event_type: event.event_type,
      event_date: event.event_date,
      event_time: event.event_time,
      location: event.location,
      entry_fee: event.entry_fee,
      max_participants: event.max_participants,
      details: event.details,
      photo_url: event.photo_url,
      photo_file: null,
    })
    setPhotoPreview(event.photo_url)
    setFormMessage(null)
  }

  const handleDelete = async (id: string) => {
    setLoading(true)
    setFormMessage(null)
    const { error } = await supabase.from("events").delete().eq("id", id)

    if (error) {
      console.error("Error deleting event:", error)
      setFormMessage({ type: "error", text: "Fehler beim Löschen der Veranstaltung." })
    } else {
      setFormMessage({ type: "success", text: "Veranstaltung erfolgreich gelöscht!" })
      fetchEvents()
    }
    setLoading(false)
  }

  const resetForm = () => {
    setEditingEventId(null)
    setForm({
      name: "",
      event_type: "party",
      event_date: "",
      event_time: "",
      location: "",
      entry_fee: 0,
      max_participants: null,
      details: "",
      photo_url: null,
      photo_file: null,
    })
    setPhotoPreview(null)
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "party":
        return <PartyPopper className="h-4 w-4 text-pink-600" />
      case "game_night":
        return <Gamepad2 className="h-4 w-4 text-blue-600" />
      case "meeting":
        return <MessageSquare className="h-4 w-4 text-green-600" />
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />
    }
  }

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case "party":
        return "Party"
      case "game_night":
        return "Spielabend"
      case "meeting":
        return "Versammlung"
      default:
        return "Sonstiges"
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg">
              <PlusCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                {editingEventId ? "Veranstaltung bearbeiten" : "Neue Veranstaltung anlegen"}
              </CardTitle>
              <CardDescription className="text-sm text-gray-500 mt-1">
                Details für Partys, Spielabende und andere Veranstaltungen eingeben.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Veranstaltungsname
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleInputChange}
                  placeholder="Z.B. Weihnachtsfeier 2025"
                  required
                  className="h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 bg-gray-50/50"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="event_type" className="text-sm font-medium text-gray-700">
                  Veranstaltungstyp
                </label>
                <Select value={form.event_type} onValueChange={(value) => handleSelectChange("event_type", value)}>
                  <SelectTrigger className="h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 bg-gray-50/50">
                    <SelectValue placeholder="Wähle einen Typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="party">
                      <div className="flex items-center space-x-2">
                        <PartyPopper className="h-4 w-4 text-pink-600" />
                        <span>Party</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="game_night">
                      <div className="flex items-center space-x-2">
                        <Gamepad2 className="h-4 w-4 text-blue-600" />
                        <span>Spielabend</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="meeting">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        <span>Versammlung</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="other">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-600" />
                        <span>Sonstiges</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="event_date" className="text-sm font-medium text-gray-700">
                  Datum
                </label>
                <Input
                  id="event_date"
                  name="event_date"
                  type="date"
                  value={form.event_date}
                  onChange={handleInputChange}
                  required
                  className="h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 bg-gray-50/50"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="event_time" className="text-sm font-medium text-gray-700">
                  Uhrzeit
                </label>
                <Input
                  id="event_time"
                  name="event_time"
                  type="time"
                  value={form.event_time}
                  onChange={handleInputChange}
                  placeholder="19:00"
                  required
                  className="h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 bg-gray-50/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="Z.B. Vereinsheim"
                  required
                  className="h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 bg-gray-50/50"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="entry_fee" className="text-sm font-medium text-gray-700">
                  Eintritt (€)
                </label>
                <Input
                  id="entry_fee"
                  name="entry_fee"
                  type="number"
                  step="0.01"
                  value={form.entry_fee}
                  onChange={handleInputChange}
                  placeholder="Z.B. 5.00"
                  required
                  className="h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 bg-gray-50/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="max_participants" className="text-sm font-medium text-gray-700">
                Max. Teilnehmer (optional)
              </label>
              <Input
                id="max_participants"
                name="max_participants"
                type="number"
                value={form.max_participants || ""}
                onChange={handleInputChange}
                placeholder="Z.B. 50"
                className="h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 bg-gray-50/50"
              />
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
                placeholder="Zusätzliche Informationen zur Veranstaltung..."
                rows={4}
                className="border-gray-200 focus:border-purple-500 focus:ring-purple-500 bg-gray-50/50"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="photo_file" className="text-sm font-medium text-gray-700">
                Veranstaltungsfoto (optional)
              </label>
              <div className="flex items-center space-x-3">
                <Input
                  id="photo_file"
                  name="photo_file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="flex-1 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 bg-gray-50/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                {photoPreview && (
                  <div className="relative w-16 h-12 flex-shrink-0 rounded-md overflow-hidden border border-gray-200">
                    <Image
                      src={photoPreview || "/placeholder.svg"}
                      alt="Veranstaltungsfoto Vorschau"
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
                className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Speichern...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="h-4 w-4" />
                    <span>{editingEventId ? "Änderungen speichern" : "Veranstaltung anlegen"}</span>
                  </div>
                )}
              </Button>
              {editingEventId && (
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
              <CardTitle className="text-xl font-semibold text-gray-900">Bevorstehende Veranstaltungen</CardTitle>
              <CardDescription className="text-sm text-gray-500 mt-1">
                Übersicht und Verwaltung aller geplanten Veranstaltungen.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading && events.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <span className="ml-3 text-gray-600">Veranstaltungen werden geladen...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              Noch keine Veranstaltungen angelegt. Lege jetzt deine erste Veranstaltung an!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Ort</TableHead>
                    <TableHead>Teilnehmer</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getEventTypeIcon(event.event_type)}
                          <span>{getEventTypeLabel(event.event_type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(event.event_date).toLocaleDateString("de-DE")}</TableCell>
                      <TableCell>{event.location}</TableCell>
                      <TableCell>{event.max_participants ? `Max. ${event.max_participants}` : "Unbegrenzt"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(event)}
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
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 bg-transparent"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Löschen</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Bist du dir sicher?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Diese Aktion kann nicht rückgängig gemacht werden. Dies wird die Veranstaltung{" "}
                                  <span className="font-bold">{event.name}</span> dauerhaft löschen.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(event.id)}>Löschen</AlertDialogAction>
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
