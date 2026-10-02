"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Trophy, Plus, Edit, Trash2, Save, X, Coffee } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface TournamentDay {
  id: string
  name: string
  event_date: string
  event_type: string
  event_time?: string
  description?: string
}

interface TournamentDaysManagementProps {
  user?: any
  onDataSaved?: () => void
}

export function TournamentDaysManagement({ user, onDataSaved }: TournamentDaysManagementProps) {
  const [tournamentDays, setTournamentDays] = useState<TournamentDay[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDay, setEditingDay] = useState<TournamentDay | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    event_date: "",
    event_type: "Turnier",
    event_time: "",
    description: "",
  })

  useEffect(() => {
    fetchTournamentDays()
  }, [])

  const fetchTournamentDays = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .in("event_type", ["Turnier", "Spielfrei"])
        .order("event_date", { ascending: true })

      if (error) throw error
      setTournamentDays(data || [])
    } catch (error) {
      console.error("Fehler beim Laden der Turniertage:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const eventData = {
        name: formData.name,
        event_date: formData.event_date,
        event_type: formData.event_type,
        event_time: formData.event_time || null,
        description: formData.description || null,
      }

      if (editingDay) {
        const { error } = await supabase.from("events").update(eventData).eq("id", editingDay.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("events").insert([eventData])
        if (error) throw error
      }

      await fetchTournamentDays()
      if (onDataSaved) {
        onDataSaved()
      }
      handleCloseDialog()
    } catch (error) {
      console.error("Fehler beim Speichern:", error)
      alert("Fehler beim Speichern des Turniertags")
    }
  }

  const handleEdit = (day: TournamentDay) => {
    setEditingDay(day)
    setFormData({
      name: day.name,
      event_date: day.event_date,
      event_type: day.event_type,
      event_time: day.event_time || "",
      description: day.description || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie diesen Turniertag wirklich löschen?")) return

    try {
      const { error } = await supabase.from("events").delete().eq("id", id)

      if (error) throw error
      await fetchTournamentDays()
    } catch (error) {
      console.error("Fehler beim Löschen:", error)
      alert("Fehler beim Löschen des Turniertags")
    }
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingDay(null)
    setFormData({
      name: "",
      event_date: "",
      event_type: "Turnier",
      event_time: "",
      description: "",
    })
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "Turnier":
        return <Trophy className="h-4 w-4 text-purple-600" />
      case "Spielfrei":
        return <Coffee className="h-4 w-4 text-gray-600" />
      default:
        return <Trophy className="h-4 w-4 text-purple-600" />
    }
  }

  const getEventTypeBadge = (type: string) => {
    const colors = {
      Turnier: "bg-purple-100 text-purple-800",
      Spielfrei: "bg-gray-100 text-gray-800",
    }
    return <Badge className={colors[type as keyof typeof colors] || colors.Turnier}>{type}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">Lade Turniertage...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cup Turniertage Verwaltung</h2>
          <p className="text-gray-600">Verwalten Sie Cup-Spieltage und spielfreie Tage</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />
          Neuer Cup-Tag
        </Button>
      </div>

      <div className="grid gap-4">
        {tournamentDays.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Turniertage vorhanden</h3>
              <p className="text-gray-600 mb-4">Erstellen Sie Ihren ersten Turniertag</p>
              <Button onClick={() => setIsDialogOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Turniertag hinzufügen
              </Button>
            </CardContent>
          </Card>
        ) : (
          tournamentDays.map((day) => (
            <Card key={day.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getEventTypeIcon(day.event_type)}
                      <h3 className="text-lg font-semibold text-gray-900">{day.name}</h3>
                      {getEventTypeBadge(day.event_type)}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(day.event_date).toLocaleDateString("de-DE", {
                        weekday: "long",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                      {day.event_time && <span className="ml-2 text-blue-600 font-medium">um {day.event_time}</span>}
                    </div>

                    {day.description && <p className="text-gray-600 text-sm">{day.description}</p>}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button onClick={() => handleEdit(day)} variant="outline" size="sm" className="bg-transparent">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(day.id)}
                      variant="outline"
                      size="sm"
                      className="bg-transparent text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDay ? "Cup-Tag bearbeiten" : "Neuer Cup-Tag"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. EMD-LION CUP Spieltag 1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_type">Typ *</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData({ ...formData, event_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Turnier">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-purple-600" />
                      Cup Turnier
                    </div>
                  </SelectItem>
                  <SelectItem value="Spielfrei">
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4 text-gray-600" />
                      Spielfrei
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_date">Datum *</Label>
              <Input
                id="event_date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_time">Uhrzeit (optional)</Label>
              <Input
                id="event_time"
                type="time"
                value={formData.event_time}
                onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                placeholder="HH:MM"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Zusätzliche Informationen..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">
                <Save className="h-4 w-4 mr-2" />
                {editingDay ? "Aktualisieren" : "Erstellen"}
              </Button>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
