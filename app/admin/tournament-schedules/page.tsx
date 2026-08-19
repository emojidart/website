"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { Plus, Save, Trash2, Pencil, X, Calendar, Clock, RefreshCw } from "lucide-react"

type DkoSeries = {
  id: string
  name: string
  slug: string
  is_active: boolean
  series_type: string

  // Serien-Einstellungen
  startgeld: number
  qualification_requirement: number
  total_tournament_days: number
  halving_active: boolean
  halving_date: string | null
  division_active: boolean
  division_date: string | null

  created_at: string
  updated_at: string
}

type DkoSeriesEvent = {
  id: string
  series_id: string
  title: string | null

  // original
  start_at: string // timestamptz iso

  // NEW: reschedule support
  is_rescheduled: boolean
  rescheduled_at: string | null

  location: string | null
  is_matchday: boolean
  registration_cutoff_minutes: number
  notes: string | null
  created_at: string
  updated_at: string
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
}

function toDateInputValue(iso: string) {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function toTimeInputValue(iso: string) {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mi}`
}

function combineLocalDateTime(dateStr: string, timeStr: string) {
  // local time -> ISO
  const [y, m, d] = dateStr.split("-").map(Number)
  const [hh, mi] = timeStr.split(":").map(Number)
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mi ?? 0, 0, 0)
  return dt.toISOString()
}

export default function AdminTournamentSchedulesPage() {
  const { user, isAdmin, loading: authLoading, adminLoading } = useAuth() as any
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)

  const [series, setSeries] = useState<DkoSeries[]>([])
  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(null)

  const [events, setEvents] = useState<DkoSeriesEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)

  // Create series modal
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false)
  const [newSeriesName, setNewSeriesName] = useState("")
  const [newSeriesSlug, setNewSeriesSlug] = useState("")
  const [newSeriesActive, setNewSeriesActive] = useState(true)
  const [newSeriesType, setNewSeriesType] = useState("other")

  // NEW: startgeld create
  const [newSeriesStartgeld, setNewSeriesStartgeld] = useState<number>(0)
  const [newSeriesQualification, setNewSeriesQualification] = useState<number>(0)
  const [newSeriesTournamentDays, setNewSeriesTournamentDays] = useState<number>(0)

  // Edit series inline
  const [editSeries, setEditSeries] = useState<DkoSeries | null>(null)

  // Event modal
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<DkoSeriesEvent | null>(null)

  // original event data
  const [eventTitle, setEventTitle] = useState("")
  const [eventDate, setEventDate] = useState("") // yyyy-mm-dd (original)
  const [eventTime, setEventTime] = useState("") // hh:mm (original)

  // NEW: reschedule fields
  const [eventIsRescheduled, setEventIsRescheduled] = useState(false)
  const [eventRescheduledDate, setEventRescheduledDate] = useState("") // yyyy-mm-dd
  const [eventRescheduledTime, setEventRescheduledTime] = useState("") // hh:mm

  const [eventLocation, setEventLocation] = useState("")
  const [eventIsMatchday, setEventIsMatchday] = useState(true)
  const [eventCutoff, setEventCutoff] = useState(10)
  const [eventNotes, setEventNotes] = useState("")

  // ---------- Auth gate ----------
  useEffect(() => {
    if (authLoading || adminLoading) return
    if (!user || !isAdmin) router.push("/admin")
  }, [authLoading, adminLoading, user, isAdmin, router])

  // ---------- Load series ----------
  async function fetchSeries() {
    setLoading(true)

    const { data, error } = await supabase.from("dko_series").select("*").order("created_at", { ascending: false })

    if (error) {
      toast({ title: "Fehler", description: "Turnierserien konnten nicht geladen werden", variant: "destructive" })
      setLoading(false)
      return
    }

    const list = (data || []) as DkoSeries[]
    setSeries(list)

    if (!activeSeriesId && list.length > 0) setActiveSeriesId(list[0].id)

    setLoading(false)
  }

  // ---------- Load events for series ----------
  async function fetchEvents(seriesId: string) {
    setEventsLoading(true)

    const { data, error } = await supabase
      .from("dko_series_events")
      .select("*")
      .eq("series_id", seriesId)
      .order("start_at", { ascending: true })

    if (error) {
      toast({ title: "Fehler", description: "Termine konnten nicht geladen werden", variant: "destructive" })
      setEventsLoading(false)
      return
    }

    setEvents((data || []) as DkoSeriesEvent[])
    setEventsLoading(false)
  }

  // ---------- realtime ----------
  useEffect(() => {
    fetchSeries()

    const ch = supabase
      .channel("admin_dko_series")
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series" }, () => fetchSeries())
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series_events" }, () => {
        if (activeSeriesId) fetchEvents(activeSeriesId)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeSeriesId) return
    fetchEvents(activeSeriesId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSeriesId])

  // ---------- Create series ----------
  async function createSeries() {
    const name = newSeriesName.trim()
    if (!name) {
      toast({ title: "Fehler", description: "Bitte Serienname eingeben", variant: "destructive" })
      return
    }

    const slug = (newSeriesSlug.trim() ? newSeriesSlug.trim() : slugify(name)).toLowerCase()
    if (!slug) {
      toast({ title: "Fehler", description: "Slug ungültig", variant: "destructive" })
      return
    }

    const safeStartgeld = Number.isFinite(Number(newSeriesStartgeld)) ? Math.max(0, Number(newSeriesStartgeld)) : 0
    const safeQualification = Number.isFinite(Number(newSeriesQualification)) ? Math.max(0, Math.floor(Number(newSeriesQualification))) : 0
    const safeTournamentDays = Number.isFinite(Number(newSeriesTournamentDays)) ? Math.max(0, Math.floor(Number(newSeriesTournamentDays))) : 0

    // Es darf je Serientyp immer nur eine aktive Serie geben.
    if (newSeriesActive) {
      const { error: deactivateError } = await supabase
        .from("dko_series")
        .update({ is_active: false })
        .eq("series_type", newSeriesType)
        .eq("is_active", true)

      if (deactivateError) {
        toast({ title: "Fehler", description: deactivateError.message, variant: "destructive" })
        return
      }
    }

    const { error } = await supabase.from("dko_series").insert({
      name,
      slug,
      is_active: newSeriesActive,
      series_type: newSeriesType,
      startgeld: safeStartgeld,
      qualification_requirement: safeQualification,
      total_tournament_days: safeTournamentDays,
    })

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" })
      return
    }

    toast({ title: "Erfolg", description: "Turnierserie erstellt" })
    setSeriesDialogOpen(false)
    setNewSeriesName("")
    setNewSeriesSlug("")
    setNewSeriesActive(true)
    setNewSeriesType("other")
    setNewSeriesStartgeld(0)
    setNewSeriesQualification(0)
    setNewSeriesTournamentDays(0)
    fetchSeries()
  }

  // ---------- Update series ----------
  async function updateSeries() {
    if (!editSeries) return
    const name = editSeries.name.trim()
    const slug = editSeries.slug.trim()

    if (!name || !slug) {
      toast({ title: "Fehler", description: "Name/Slug dürfen nicht leer sein", variant: "destructive" })
      return
    }

    const safeStartgeld = Number.isFinite(Number(editSeries.startgeld)) ? Math.max(0, Number(editSeries.startgeld)) : 0
    const safeQualification = Number.isFinite(Number(editSeries.qualification_requirement))
      ? Math.max(0, Math.floor(Number(editSeries.qualification_requirement)))
      : 0
    const safeTournamentDays = Number.isFinite(Number(editSeries.total_tournament_days))
      ? Math.max(0, Math.floor(Number(editSeries.total_tournament_days)))
      : 0

    if (editSeries.is_active) {
      const { error: deactivateError } = await supabase
        .from("dko_series")
        .update({ is_active: false })
        .neq("id", editSeries.id)
        .eq("series_type", editSeries.series_type)
        .eq("is_active", true)

      if (deactivateError) {
        toast({ title: "Fehler", description: deactivateError.message, variant: "destructive" })
        return
      }
    }

    const { error } = await supabase
      .from("dko_series")
      .update({
        name,
        slug,
        is_active: editSeries.is_active,
        series_type: editSeries.series_type,
        startgeld: safeStartgeld,
        qualification_requirement: safeQualification,
        total_tournament_days: safeTournamentDays,
      })
      .eq("id", editSeries.id)

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" })
      return
    }

    toast({ title: "Erfolg", description: "Turnierserie gespeichert" })
    setEditSeries(null)
    fetchSeries()
  }

  async function deleteSeries(id: string) {
    if (!confirm("Serie wirklich löschen? (Alle Termine werden mit gelöscht)")) return
    const { error } = await supabase.from("dko_series").delete().eq("id", id)
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" })
      return
    }
    toast({ title: "Erfolg", description: "Serie gelöscht" })
    if (activeSeriesId === id) setActiveSeriesId(null)
    fetchSeries()
  }

  // ---------- Event form helpers ----------
  function openCreateEvent() {
    if (!activeSeriesId) return

    setEditEvent(null)
    setEventTitle("")
    setEventLocation("")
    setEventIsMatchday(true)
    setEventCutoff(10)
    setEventNotes("")

    // reschedule defaults
    setEventIsRescheduled(false)
    setEventRescheduledDate("")
    setEventRescheduledTime("")

    const now = new Date()
    setEventDate(toDateInputValue(now.toISOString()))
    setEventTime("19:30")

    setEventDialogOpen(true)
  }

  function openEditEvent(ev: DkoSeriesEvent) {
    setEditEvent(ev)

    setEventTitle(ev.title ?? "")
    setEventLocation(ev.location ?? "")
    setEventIsMatchday(ev.is_matchday)
    setEventCutoff(ev.registration_cutoff_minutes ?? 10)
    setEventNotes(ev.notes ?? "")

    // original
    setEventDate(toDateInputValue(ev.start_at))
    setEventTime(toTimeInputValue(ev.start_at))

    // reschedule
    const isRes = !!ev.is_rescheduled && !!ev.rescheduled_at
    setEventIsRescheduled(isRes)

    if (isRes && ev.rescheduled_at) {
      setEventRescheduledDate(toDateInputValue(ev.rescheduled_at))
      setEventRescheduledTime(toTimeInputValue(ev.rescheduled_at))
    } else {
      setEventRescheduledDate("")
      setEventRescheduledTime("")
    }

    setEventDialogOpen(true)
  }

  async function saveEvent() {
    if (!activeSeriesId) return

    // original required always (weil es der "Plan" ist)
    if (!eventDate || !eventTime) {
      toast({ title: "Fehler", description: "Bitte Original-Datum & Original-Uhrzeit wählen", variant: "destructive" })
      return
    }

    const start_at = combineLocalDateTime(eventDate, eventTime)

    let rescheduled_at: string | null = null
    let is_rescheduled = false

    if (eventIsRescheduled) {
      if (!eventRescheduledDate || !eventRescheduledTime) {
        toast({ title: "Fehler", description: "Bitte neuen Termin (Datum & Uhrzeit) setzen", variant: "destructive" })
        return
      }
      rescheduled_at = combineLocalDateTime(eventRescheduledDate, eventRescheduledTime)
      is_rescheduled = true
    }

    if (editEvent) {
      const { error } = await supabase
        .from("dko_series_events")
        .update({
          title: eventTitle.trim() || null,

          // keep original always editable (Plan)
          start_at,

          // NEW
          is_rescheduled,
          rescheduled_at,

          location: eventLocation.trim() || null,
          is_matchday: eventIsMatchday,
          registration_cutoff_minutes: Number(eventCutoff) || 10,
          notes: eventNotes.trim() || null,
        })
        .eq("id", editEvent.id)

      if (error) {
        toast({ title: "Fehler", description: error.message, variant: "destructive" })
        return
      }

      toast({ title: "Erfolg", description: "Termin gespeichert" })
      setEventDialogOpen(false)
      setEditEvent(null)
      fetchEvents(activeSeriesId)
      return
    }

    const { error } = await supabase.from("dko_series_events").insert({
      series_id: activeSeriesId,
      title: eventTitle.trim() || null,

      // original
      start_at,

      // NEW
      is_rescheduled,
      rescheduled_at,

      location: eventLocation.trim() || null,
      is_matchday: eventIsMatchday,
      registration_cutoff_minutes: Number(eventCutoff) || 10,
      notes: eventNotes.trim() || null,
    })

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" })
      return
    }

    toast({ title: "Erfolg", description: "Termin erstellt" })
    setEventDialogOpen(false)
    fetchEvents(activeSeriesId)
  }

  async function deleteEvent(id: string) {
    if (!activeSeriesId) return
    if (!confirm("Termin wirklich löschen?")) return
    const { error } = await supabase.from("dko_series_events").delete().eq("id", id)
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" })
      return
    }
    toast({ title: "Erfolg", description: "Termin gelöscht" })
    fetchEvents(activeSeriesId)
  }

  const activeSeries = useMemo(() => series.find((s) => s.id === activeSeriesId) ?? null, [series, activeSeriesId])

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="container mx-auto p-4">
          <Card className="max-w-md mx-auto mt-10">
            <CardContent className="p-6 text-center">Lade…</CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="container mx-auto p-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Turnier-Serien & Spieltage</h1>

            {/* Professionelle Info-Box statt interner Notiz */}
            <Card className="mt-3 border-gray-200 bg-white/70">
              <CardContent className="p-4 text-sm text-gray-700">
                <div className="font-semibold mb-2">So funktioniert’s</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <span className="font-semibold">Serien anlegen</span>: Name + optionaler Slug. Der Aktiv-Status steuert die Anzeige auf
                    Startseite/Upcoming.
                  </li>
                  <li>
                    <span className="font-semibold">Spieltage pflegen</span>: Datum und Uhrzeit setzen, optional Titel/Ort/Notiz ergänzen.
                  </li>
                  <li>
                    <span className="font-semibold">Verschiebungen</span>: Originaltermin bleibt als Plan gespeichert; neuer Termin wird separat
                    hinterlegt.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fetchSeries()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Aktualisieren
            </Button>

            <Dialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Serie
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Neue Turnierserie</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label>Name *</Label>
                    <Input value={newSeriesName} onChange={(e) => setNewSeriesName(e.target.value)} placeholder="z.B. Lion Cup 2026/27" />
                  </div>

                  <div className="grid gap-2">
                    <Label>Slug (optional)</Label>
                    <Input
                      value={newSeriesSlug}
                      onChange={(e) => setNewSeriesSlug(e.target.value)}
                      placeholder="z.B. lion-cup-2026-27 (wenn leer -> automatisch)"
                    />
                    <div className="text-xs text-gray-500">Wenn leer, wird automatisch aus dem Namen erzeugt.</div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Serientyp *</Label>
                    <select
                      value={newSeriesType}
                      onChange={(e) => setNewSeriesType(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="lion_cup">Lion Cup</option>
                      <option value="summer_special">Summer Special</option>
                      <option value="members_cup">Members Champion Cup</option>
                      <option value="challenge_division">Challenge Division</option>
                      <option value="buffalo_cup">Buffalo Steel Cup</option>
                      <option value="other">Andere Serie</option>
                    </select>
                  </div>

                  {/* NEW: Startgeld */}
                  <div className="grid gap-2">
                    <Label>Startgeld</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={newSeriesStartgeld}
                      onChange={(e) => setNewSeriesStartgeld(Number(e.target.value))}
                      placeholder="z.B. 10.00"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Qualifikation ab Antritten</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={newSeriesQualification}
                        onChange={(e) => setNewSeriesQualification(Number(e.target.value))}
                        placeholder="z.B. 8"
                      />
                      <div className="text-xs text-gray-500">0 = keine Mindestanzahl</div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Qualifikationstage gesamt</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={newSeriesTournamentDays}
                        onChange={(e) => setNewSeriesTournamentDays(Number(e.target.value))}
                        placeholder="z.B. 14"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={newSeriesActive} onChange={(e) => setNewSeriesActive(e.target.checked)} />
                    <span>Aktiv = aktuelle Serie dieses Serientyps</span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setSeriesDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button onClick={createSeries}>
                      <Save className="h-4 w-4 mr-2" />
                      Speichern
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Series list */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Serien</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="text-sm text-gray-600">Lade Serien…</div>
              ) : series.length === 0 ? (
                <div className="text-sm text-gray-600">Keine Serien vorhanden.</div>
              ) : (
                series.map((s) => (
                  <div
                    key={s.id}
                    className={`p-3 rounded-lg border flex items-center justify-between gap-2 cursor-pointer ${
                      s.id === activeSeriesId ? "bg-white border-orange-200" : "bg-gray-50 border-gray-200"
                    }`}
                    onClick={() => setActiveSeriesId(s.id)}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{s.name}</div>
                      <div className="text-xs text-gray-600 truncate">
                        slug: <span className="font-mono">{s.slug}</span> • {s.series_type} • {s.is_active ? "aktiv" : "inaktiv"}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditSeries(s)
                        }}
                        title="Serie bearbeiten"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSeries(s.id)
                        }}
                        title="Serie löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}

              {editSeries && (
                <div className="mt-4 p-3 bg-white border rounded-lg space-y-3">
                  <div className="font-bold">Serie bearbeiten</div>

                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input value={editSeries.name} onChange={(e) => setEditSeries({ ...editSeries, name: e.target.value })} />
                  </div>

                  <div className="grid gap-2">
                    <Label>Slug</Label>
                    <Input value={editSeries.slug} onChange={(e) => setEditSeries({ ...editSeries, slug: e.target.value })} />
                  </div>

                  <div className="grid gap-2">
                    <Label>Serientyp</Label>
                    <select
                      value={editSeries.series_type ?? "other"}
                      onChange={(e) => setEditSeries({ ...editSeries, series_type: e.target.value })}
                      className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="lion_cup">Lion Cup</option>
                      <option value="summer_special">Summer Special</option>
                      <option value="members_cup">Members Champion Cup</option>
                      <option value="challenge_division">Challenge Division</option>
                      <option value="buffalo_cup">Buffalo Steel Cup</option>
                      <option value="other">Andere Serie</option>
                    </select>
                  </div>

                  {/* NEW: Startgeld */}
                  <div className="grid gap-2">
                    <Label>Startgeld</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={editSeries.startgeld ?? 0}
                      onChange={(e) => setEditSeries({ ...editSeries, startgeld: Number(e.target.value) })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Qualifikation ab Antritten</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={editSeries.qualification_requirement ?? 0}
                        onChange={(e) =>
                          setEditSeries({ ...editSeries, qualification_requirement: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Qualifikationstage gesamt</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={editSeries.total_tournament_days ?? 0}
                        onChange={(e) =>
                          setEditSeries({ ...editSeries, total_tournament_days: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editSeries.is_active}
                      onChange={(e) => setEditSeries({ ...editSeries, is_active: e.target.checked })}
                    />
                    <span>Aktiv</span>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditSeries(null)}>
                      <X className="h-4 w-4 mr-2" />
                      Abbrechen
                    </Button>
                    <Button onClick={updateSeries}>
                      <Save className="h-4 w-4 mr-2" />
                      Speichern
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Events */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Spieltage / Termine</CardTitle>
                <div className="text-xs text-gray-600">
                  {activeSeries ? (
                    <>
                      Serie: <span className="font-semibold">{activeSeries.name}</span>{" "}
                      <span className="font-mono">({activeSeries.slug})</span>
                    </>
                  ) : (
                    "Bitte Serie auswählen"
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" disabled={!activeSeriesId} onClick={() => activeSeriesId && fetchEvents(activeSeriesId)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Termine laden
                </Button>
                <Button disabled={!activeSeriesId} onClick={openCreateEvent}>
                  <Plus className="h-4 w-4 mr-2" />
                  Neuer Termin
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {!activeSeriesId ? (
                <div className="text-sm text-gray-600">Wähle links eine Serie.</div>
              ) : eventsLoading ? (
                <div className="flex items-center gap-2 text-gray-700">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Lade Termine…
                </div>
              ) : events.length === 0 ? (
                <div className="text-sm text-gray-600">Noch keine Termine.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Uhrzeit</TableHead>
                        <TableHead>Titel</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Anmeldeschluss</TableHead>
                        <TableHead className="text-right">Aktion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((ev) => {
                        const effectiveIso = ev.is_rescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at

                        const dEff = new Date(effectiveIso)
                        const dateStr = dEff.toLocaleDateString("de-DE")
                        const timeStr = dEff.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })

                        const dOrig = new Date(ev.start_at)
                        const origDateStr = dOrig.toLocaleDateString("de-DE")
                        const origTimeStr = dOrig.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })

                        return (
                          <TableRow key={ev.id}>
                            <TableCell className="font-semibold">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-600" />
                                <div className="flex flex-col">
                                  <span>{dateStr}</span>
                                  {ev.is_rescheduled && ev.rescheduled_at && <span className="text-xs text-gray-500 line-through">{origDateStr}</span>}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-600" />
                                <div className="flex flex-col">
                                  <span>{timeStr}</span>
                                  {ev.is_rescheduled && ev.rescheduled_at && <span className="text-xs text-gray-500 line-through">{origTimeStr}</span>}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="max-w-[240px] truncate">{ev.title ?? "-"}</TableCell>

                            <TableCell>
                              <div className="flex flex-wrap items-center gap-2">
                                {ev.is_matchday ? (
                                  <span className="text-xs font-semibold bg-green-50 text-green-700 border border-green-100 px-2 py-1 rounded">Spieltag</span>
                                ) : (
                                  <span className="text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-100 px-2 py-1 rounded">Spielfrei</span>
                                )}

                                {ev.is_rescheduled && ev.rescheduled_at && (
                                  <span className="text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-100 px-2 py-1 rounded">verschoben</span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-sm">{ev.registration_cutoff_minutes} min</TableCell>

                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => openEditEvent(ev)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => deleteEvent(ev.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Event dialog */}
        <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editEvent ? "Termin bearbeiten" : "Neuer Termin"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Titel (optional)</Label>
                <Input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder='z.B. "Mittwoch" oder "Spieltag 4"' />
              </div>

              <div className="grid gap-2">
                <Label className="font-semibold">Ursprünglicher Termin (Plan) *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Datum *</Label>
                    <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Uhrzeit *</Label>
                    <Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={eventIsRescheduled}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setEventIsRescheduled(checked)
                    if (!checked) {
                      setEventRescheduledDate("")
                      setEventRescheduledTime("")
                    } else {
                      // Vorschlag: wenn neu aktiv, default auf Original übernehmen
                      setEventRescheduledDate(eventDate)
                      setEventRescheduledTime(eventTime)
                    }
                  }}
                />
                <span>Verschoben? (neuer Termin wird gespeichert)</span>
              </div>

              {eventIsRescheduled && (
                <div className="grid gap-2">
                  <Label className="font-semibold">Neuer Termin (verschoben) *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Neues Datum *</Label>
                      <Input type="date" value={eventRescheduledDate} onChange={(e) => setEventRescheduledDate(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Neue Uhrzeit *</Label>
                      <Input type="time" value={eventRescheduledTime} onChange={(e) => setEventRescheduledTime(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label>Ort (optional)</Label>
                <Input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="z.B. Pfeil-OK e.V." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Anmeldeschluss Minuten</Label>
                  <Input type="number" value={eventCutoff} onChange={(e) => setEventCutoff(Number(e.target.value))} min={0} step={1} />
                </div>
                <div className="flex items-center gap-2 mt-7 text-sm">
                  <input type="checkbox" checked={eventIsMatchday} onChange={(e) => setEventIsMatchday(e.target.checked)} />
                  <span>Ist Spieltag (wenn aus: Spielfrei)</span>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Notiz (optional)</Label>
                <Input value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} placeholder="z.B. 'verschoben wegen…'" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEventDialogOpen(false)
                    setEditEvent(null)
                  }}
                >
                  Abbrechen
                </Button>
                <Button onClick={saveEvent}>
                  <Save className="h-4 w-4 mr-2" />
                  Speichern
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
