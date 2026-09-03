"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { TournamentAdminNav } from "@/components/admin/tournaments/tournament-admin-nav"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { Plus, Save, Trash2, Pencil, X, Calendar, Clock, RefreshCw, Trophy, Layers3, CheckCircle2, CircleDot, MapPin, ChevronRight, Settings2 } from "lucide-react"

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

  const activeSeriesCount = useMemo(() => series.filter((s) => s.is_active).length, [series])

  const nextEvent = useMemo(() => {
    const now = Date.now()
    return [...events]
      .map((ev) => {
        const effectiveIso = ev.is_rescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at
        return { ev, effectiveIso, ts: new Date(effectiveIso).getTime() }
      })
      .filter((entry) => Number.isFinite(entry.ts) && entry.ts >= now)
      .sort((a, b) => a.ts - b.ts)[0] ?? null
  }, [events])

  const matchdayCount = useMemo(() => events.filter((ev) => ev.is_matchday).length, [events])

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-[#f7f7f8]">
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
    <div className="min-h-screen bg-[#f7f7f8]">
      <Header />
      <TournamentAdminNav
        title="Serien verwalten"
        description="Turnierserien und deren Spieltage anlegen, bearbeiten und verschieben."
      />

      <main className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-5 lg:px-8">
        <section className="mb-6 overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500" />
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                <Trophy className="h-3.5 w-3.5" />
                Turnierverwaltung
              </div>
              <h1 className="text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">Turnierserien & Spieltage</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                Serien, Termine und Spieltage an einem Ort verwalten.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => fetchSeries()} className="h-11 rounded-xl border-gray-200 bg-white">
                <RefreshCw className="mr-2 h-4 w-4" />
                Aktualisieren
              </Button>

              <Dialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-11 rounded-xl bg-orange-600 px-5 font-bold text-white hover:bg-orange-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Neue Serie
                  </Button>
                </DialogTrigger>

              <DialogContent className="max-w-lg rounded-3xl">
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
        </section>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Serien</div>
                <div className="mt-1 text-2xl font-black text-gray-950">{series.length}</div>
              </div>
              <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                <Layers3 className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Aktiv</div>
                <div className="mt-1 text-2xl font-black text-gray-950">{activeSeriesCount}</div>
              </div>
              <div className="rounded-xl bg-green-50 p-2.5 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Spieltage</div>
                <div className="mt-1 text-2xl font-black text-gray-950">{matchdayCount}</div>
                <div className="mt-0.5 text-[11px] font-medium text-gray-500">
                  {activeSeries ? activeSeries.name : "Serie auswählen"}
                </div>
              </div>
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Nächster Termin</div>
                <div className="mt-1 truncate text-sm font-black text-gray-950">
                  {nextEvent ? new Date(nextEvent.effectiveIso).toLocaleDateString("de-DE") : "—"}
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-gray-500">
                  {nextEvent ? new Date(nextEvent.effectiveIso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr" : "Kein weiterer Termin"}
                </div>
              </div>
              <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* Series list */}
          <Card className="overflow-hidden rounded-3xl border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50/60 p-5">
              <CardTitle className="flex items-center gap-2 text-lg font-black text-gray-950">
                <Layers3 className="h-5 w-5 text-orange-600" />
                Serien
              </CardTitle>
              <p className="text-sm text-gray-500">Serie auswählen, bearbeiten oder neue Spieltage anlegen.</p>
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
                    className={`group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all ${
                      s.id === activeSeriesId
                        ? "border-orange-300 bg-orange-50/70 shadow-sm"
                        : "border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/30"
                    }`}
                    onClick={() => setActiveSeriesId(s.id)}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{s.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className={`rounded-full px-2 py-0.5 font-bold ${s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {s.is_active ? "Aktiv" : "Inaktiv"}
                        </span>
                        <span className="text-gray-500">{s.total_tournament_days || 0} Spieltage</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-500">{Number(s.startgeld || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</span>
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
                <div className="mt-4 space-y-3 rounded-2xl border border-orange-200 bg-orange-50/40 p-4">
                  <div className="flex items-center gap-2 font-black text-gray-950"><Settings2 className="h-4 w-4 text-orange-600" />Serie bearbeiten</div>

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
          <Card className="min-w-0 overflow-hidden rounded-3xl border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-col gap-4 border-b border-gray-100 bg-gray-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-gray-950"><Calendar className="h-5 w-5 text-orange-600" />Spieltage & Termine</CardTitle>
                <div className="text-xs text-gray-600">
                  {activeSeries ? (
                    <>
                      Serie: <span className="font-bold text-gray-800">{activeSeries.name}</span>
                    </>
                  ) : (
                    "Bitte Serie auswählen"
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" disabled={!activeSeriesId} onClick={() => activeSeriesId && fetchEvents(activeSeriesId)} className="h-10 rounded-xl border-gray-200">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Termine laden
                </Button>
                <Button disabled={!activeSeriesId} onClick={openCreateEvent} className="h-10 rounded-xl bg-orange-600 font-bold text-white hover:bg-orange-700">
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
                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
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
                                  <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700"><CircleDot className="h-3 w-3" />Spieltag</span>
                                ) : (
                                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Spielfrei</span>
                                )}

                                {ev.is_rescheduled && ev.rescheduled_at && (
                                  <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">Verschoben</span>
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
          <DialogContent className="max-w-xl rounded-3xl">
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
