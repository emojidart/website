"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar, Users, Plus, Filter, BarChart3, Trash2, X } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"

interface ClubPlayer {
  id: string
  name: string
  photo_url: string | null
}

interface Event {
  id: string
  name: string
  event_date: string
  event_type: string
  description: string | null
  attendance_count?: number
}

interface AttendanceRecord {
  id: string
  event_id: string
  player_id: string
  attended: boolean
  player_name: string
}

interface AttendanceStats {
  player_name: string
  total_events: number
  attended_events: number
  attendance_rate: number
}

export function AttendanceManagement() {
  const [players, setPlayers] = useState<ClubPlayer[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats[]>([])

  // Form states
  const [newEventName, setNewEventName] = useState("")
  const [newEventDate, setNewEventDate] = useState("")
  const [newEventType, setNewEventType] = useState("Veranstaltung")
  const [newEventDescription, setNewEventDescription] = useState("")

  // UI states
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [currentView, setCurrentView] = useState<"create" | "manage" | "stats">("create")
  const [filterType, setFilterType] = useState<string>("all")

  const [showAttendeesModal, setShowAttendeesModal] = useState(false)
  const [selectedEventAttendees, setSelectedEventAttendees] = useState<AttendanceRecord[]>([])

  useEffect(() => {
    fetchPlayers()
    fetchEvents()
    fetchStats()
  }, [])

  const fetchPlayers = async () => {
    const { data, error } = await supabase.from("club_players").select("id, name, photo_url").order("name")

    if (error) {
      console.error("Error fetching players:", error)
      setMessage("Fehler beim Laden der Spieler")
    } else {
      setPlayers(data || [])
    }
  }

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select(`
        *,
        attendance(attended)
      `)
      .order("event_date", { ascending: false })

    if (error) {
      console.error("Error fetching events:", error)
      setMessage("Fehler beim Laden der Veranstaltungen")
    } else {
      const eventsWithCount =
        data?.map((event) => ({
          ...event,
          attendance_count: event.attendance?.filter((a: any) => a.attended).length || 0,
        })) || []
      setEvents(eventsWithCount)
    }
  }

  const fetchAttendance = async (eventId: string) => {
    const { data, error } = await supabase
      .from("attendance")
      .select(`
        *,
        club_players(name)
      `)
      .eq("event_id", eventId)

    if (error) {
      console.error("Error fetching attendance:", error)
      setMessage("Fehler beim Laden der Anwesenheit")
    } else {
      const attendanceWithNames =
        data?.map((record: any) => ({
          id: record.id,
          event_id: record.event_id,
          player_id: record.player_id,
          attended: record.attended,
          player_name: record.club_players.name,
        })) || []
      setAttendance(attendanceWithNames)
    }
  }

  const fetchStats = async () => {
    const { data: eventsData, error: eventsError } = await supabase.from("events").select("id")

    if (eventsError) {
      console.error("Error fetching events for stats:", eventsError)
      return
    }

    const totalEvents = eventsData?.length || 0

    const { data, error } = await supabase.from("attendance").select(`
        player_id,
        attended,
        club_players(name)
      `)

    if (error) {
      console.error("Error fetching stats:", error)
      return
    }

    const { data: playersData, error: playersError } = await supabase.from("club_players").select("id, name")

    if (playersError) {
      console.error("Error fetching players for stats:", playersError)
      return
    }

    const playerStats: { [key: string]: { name: string; total: number; attended: number } } = {}

    playersData?.forEach((player) => {
      playerStats[player.id] = {
        name: player.name,
        total: totalEvents,
        attended: 0,
      }
    })

    data?.forEach((record: any) => {
      const playerId = record.player_id

      if (playerStats[playerId] && record.attended) {
        playerStats[playerId].attended++
      }
    })

    const statsArray = Object.values(playerStats)
      .map((stat) => ({
        player_name: stat.name,
        total_events: stat.total,
        attended_events: stat.attended,
        attendance_rate: stat.total > 0 ? (stat.attended / stat.total) * 100 : 0,
      }))
      .sort((a, b) => b.attendance_rate - a.attendance_rate)

    setStats(statsArray)
  }

  const createEvent = async () => {
    if (!newEventName || !newEventDate) {
      setMessage("Bitte Name und Datum eingeben")
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from("events")
      .insert({
        name: newEventName,
        event_date: newEventDate,
        event_type: newEventType,
        description: newEventDescription || null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating event:", error)
      setMessage("Fehler beim Erstellen der Veranstaltung")
    } else {
      setMessage("Veranstaltung erfolgreich erstellt!")
      setNewEventName("")
      setNewEventDate("")
      setNewEventDescription("")
      fetchEvents()

      // Automatically create attendance records for all players
      const attendanceRecords = players.map((player) => ({
        event_id: data.id,
        player_id: player.id,
        attended: false,
      }))

      await supabase.from("attendance").insert(attendanceRecords)
    }
    setLoading(false)
  }

  const selectEvent = async (event: Event) => {
    setSelectedEvent(event)
    await fetchAttendance(event.id)
  }

  const toggleAttendance = async (playerId: string, attended: boolean) => {
    if (!selectedEvent) return

    const player = players.find((p) => p.id === playerId)
    if (!player) {
      console.error("Player not found:", playerId)
      setMessage("Spieler nicht gefunden")
      return
    }

    const { error } = await supabase.from("attendance").upsert(
      {
        event_id: selectedEvent.id,
        player_id: playerId,
        attended: attended,
        player_name: player.name, // Use player.name directly from found player
      },
      {
        onConflict: "event_id,player_id",
      },
    )

    if (error) {
      console.error("Error updating attendance:", error)
      setMessage("Fehler beim Aktualisieren der Anwesenheit")
    } else {
      await fetchAttendance(selectedEvent.id)
      fetchEvents()
      fetchStats()
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!confirm("Veranstaltung wirklich löschen?")) return

    const { error } = await supabase.from("events").delete().eq("id", eventId)

    if (error) {
      console.error("Error deleting event:", error)
      setMessage("Fehler beim Löschen der Veranstaltung")
    } else {
      setMessage("Veranstaltung gelöscht")
      fetchEvents()
      fetchStats()
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null)
        setAttendance([])
      }
    }
  }

  const showAttendees = async (event: Event) => {
    const { data, error } = await supabase
      .from("attendance")
      .select(`
        *,
        club_players(name)
      `)
      .eq("event_id", event.id)
      .eq("attended", true)

    if (error) {
      console.error("Error fetching attendees:", error)
    } else {
      const attendeesWithNames =
        data?.map((record: any) => ({
          id: record.id,
          event_id: record.event_id,
          player_id: record.player_id,
          attended: record.attended,
          player_name: record.club_players.name,
        })) || []
      setSelectedEventAttendees(attendeesWithNames)
      setShowAttendeesModal(true)
    }
  }

  const removeAttendee = async (playerId: string, eventId: string) => {
    const { error } = await supabase
      .from("attendance")
      .update({ attended: false })
      .eq("event_id", eventId)
      .eq("player_id", playerId)

    if (error) {
      console.error("Error removing attendee:", error)
    } else {
      // Refresh data
      fetchEvents()
      if (selectedEvent?.id === eventId) {
        await fetchAttendance(eventId)
      }
      // Update popup list
      setSelectedEventAttendees((prev) => prev.filter((a) => a.player_id !== playerId))
    }
  }

  const filteredEvents = events.filter((event) => filterType === "all" || event.event_type === filterType)

  const eventTypes = [...new Set(events.map((e) => e.event_type))]

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.includes("Fehler") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Navigation */}
      <div className="flex space-x-2 border-b">
        <Button
          variant={currentView === "create" ? "default" : "ghost"}
          onClick={() => setCurrentView("create")}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Neue Veranstaltung</span>
        </Button>
        <Button
          variant={currentView === "manage" ? "default" : "ghost"}
          onClick={() => setCurrentView("manage")}
          className="flex items-center space-x-2"
        >
          <Users className="h-4 w-4" />
          <span>Anwesenheit verwalten</span>
        </Button>
        <Button
          variant={currentView === "stats" ? "default" : "ghost"}
          onClick={() => setCurrentView("stats")}
          className="flex items-center space-x-2"
        >
          <BarChart3 className="h-4 w-4" />
          <span>Statistiken</span>
        </Button>
      </div>

      {/* Create Event View */}
      {currentView === "create" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Neue Veranstaltung erstellen</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventName">Name der Veranstaltung</Label>
                <Input
                  id="eventName"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="z.B. Mitgliederversammlung 2024"
                />
              </div>
              <div>
                <Label htmlFor="eventDate">Datum</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventType">Art der Veranstaltung</Label>
                <Select value={newEventType} onValueChange={setNewEventType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Veranstaltung">Veranstaltung</SelectItem>
                    <SelectItem value="Versammlung">Mitgliederversammlung</SelectItem>
                    <SelectItem value="Turnier">Turnier</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                    <SelectItem value="Feier">Vereinsfeier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="eventDescription">Beschreibung (optional)</Label>
              <Input
                id="eventDescription"
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
                placeholder="Zusätzliche Informationen..."
              />
            </div>
            <Button onClick={createEvent} disabled={loading} className="w-full">
              {loading ? "Erstelle..." : "Veranstaltung erstellen"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manage Attendance View */}
      {currentView === "manage" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Events List */}
          <Card>
            <CardHeader>
              <CardTitle>Veranstaltungen</CardTitle>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Veranstaltungen</SelectItem>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedEvent?.id === event.id ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
                    }`}
                    onClick={() => selectEvent(event)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{event.name}</h4>
                        <p className="text-sm text-gray-600">
                          {format(new Date(event.event_date), "dd.MM.yyyy", { locale: de })}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {event.event_type}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Dialog open={showAttendeesModal} onOpenChange={setShowAttendeesModal}>
                          <DialogTrigger asChild>
                            <Badge
                              className="cursor-pointer hover:bg-blue-100 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                showAttendees(event)
                              }}
                            >
                              {event.attendance_count || 0} Teilnehmer
                            </Badge>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Anwesende Teilnehmer</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {selectedEventAttendees.length > 0 ? (
                                selectedEventAttendees.map((attendee) => (
                                  <div
                                    key={attendee.id}
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                  >
                                    <span className="font-medium">{attendee.player_name}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeAttendee(attendee.player_id, attendee.event_id)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-500 text-center py-4">Keine Teilnehmer</p>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteEvent(event.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Management */}
          <Card>
            <CardHeader>
              <CardTitle>{selectedEvent ? `Anwesenheit: ${selectedEvent.name}` : "Veranstaltung auswählen"}</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEvent ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {players.map((player) => {
                    const attendanceRecord = attendance.find((a) => a.player_id === player.id)
                    const isAttending = attendanceRecord?.attended || false

                    return (
                      <div
                        key={player.id}
                        className={`flex items-center space-x-3 p-3 border rounded transition-colors ${
                          isAttending ? "bg-gray-100 border-gray-300" : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <Checkbox
                          checked={isAttending}
                          onCheckedChange={(checked) => toggleAttendance(player.id, checked as boolean)}
                        />
                        <span className={`flex-1 ${isAttending ? "font-medium text-gray-900" : "text-gray-600"}`}>
                          {player.name}
                        </span>
                        {isAttending && <Badge className="bg-green-100 text-green-800">Anwesend</Badge>}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Wählen Sie eine Veranstaltung aus der Liste aus</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Statistics View */}
      {currentView === "stats" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Anwesenheitsstatistiken</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-4 font-semibold text-gray-700">Spieler</th>
                    <th className="text-center p-4 font-semibold text-gray-700">Teilgenommen</th>
                    <th className="text-center p-4 font-semibold text-gray-700">Gesamt</th>
                    <th className="text-center p-4 font-semibold text-gray-700">Anwesenheitsquote</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">{stat.player_name}</td>
                      <td className="text-center p-4 text-gray-700">{stat.attended_events}</td>
                      <td className="text-center p-4 text-gray-700">{stat.total_events}</td>
                      <td className="text-center p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <Badge
                            className={
                              stat.attendance_rate >= 80
                                ? "bg-green-100 text-green-800 border-green-200"
                                : stat.attendance_rate >= 60
                                  ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                  : "bg-red-100 text-red-800 border-red-200"
                            }
                          >
                            {stat.attendance_rate.toFixed(1)}%
                          </Badge>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                stat.attendance_rate >= 80
                                  ? "bg-green-500"
                                  : stat.attendance_rate >= 60
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${stat.attendance_rate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
