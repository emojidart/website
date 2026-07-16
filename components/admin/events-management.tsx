"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

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
  Trophy,
  ListChecks,
  Globe2,
  Link2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Event {
  id: string
  name: string
  event_type: string
  source?: string | null
  mode?: string | null
  startgeld_details?: string | null
  start_date: string
  end_date: string
  event_time: string
  location: string
  entry_fee: number
  max_participants: number | null
  details: string | null
  photo_url: string | null
  user_id: string
}

type EventForm = Omit<Event, "id" | "user_id"> & {
  photo_file: File | null
  publish_in_dach: boolean
  dach_country_code: "AT" | "DE" | "CH"
  dach_postal_code: string
  dach_city: string
  dach_region: string
  dach_organizer_name: string
}

type ClubPlayer = {
  id: string
  name: string
  birthdate: string | null
}

type Vacation = {
  id: string
  user_name: string
  start_date: string
  end_date: string
}

type Opp = { id: string; name: string }

type MatchLite = {
  id: string
  match_date: string
  match_time: string | null
  venue: string
  week_number: number
  status: string
  original_date: string | null
  postponement_reason: string | null

  home_team_id: string
  away_team_id: string

  home_team_type: "own" | "opponent" | "club_team"
  away_team_type: "own" | "opponent" | "club_team"

  home_team: { id: string; name: string } | null
  away_team: { id: string; name: string } | null

  home_opponent_team_id: string | null
  away_opponent_team_id: string | null
  home_opponent_team: { id: string; name: string } | null
  away_opponent_team: { id: string; name: string } | null
}

interface EventsManagementProps {
  user: User | null
}

const PUSH_ENDPOINT = "/api/push/send-event"

function formatDE(dateString: string) {
  if (!dateString) return ""
  const d = new Date(dateString)
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function hhmm(timeString: string | null) {
  if (!timeString) return "—"
  const parts = timeString.split(":")
  return `${parts[0]}:${parts[1]}`
}

function getDatesBetween(start: string, end: string) {
  const dates: string[] = []
  const current = new Date(start)
  const last = new Date(end)

  while (current <= last) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, "0")
    const d = String(current.getDate()).padStart(2, "0")
    dates.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 1)
  }

  return dates
}



export function EventsManagement({ user }: EventsManagementProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [players, setPlayers] = useState<ClubPlayer[]>([])
  const [form, setForm] = useState<EventForm>({
  name: "",
  event_type: "party",
  source: "internal",
  mode: "both",
  startgeld_details: "",
  start_date: "",
  end_date: "",
  event_time: "",
  location: "",
  entry_fee: 0,
  max_participants: null,
  details: "",
  photo_url: null,
  photo_file: null,
  publish_in_dach: false,
  dach_country_code: "AT",
  dach_postal_code: "",
  dach_city: "Salzburg",
  dach_region: "Salzburg",
  dach_organizer_name: "EMD",
})

  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const createdObjectUrlRef = useRef<string | null>(null)

  // Planung (Matches + interne Events) am ausgewählten Tag
  const [opponents, setOpponents] = useState<Opp[]>([])
  const [dayLoading, setDayLoading] = useState(false)
  const [dayError, setDayError] = useState<string | null>(null)
  const [dayMatches, setDayMatches] = useState<MatchLite[]>([])
  const [dayEvents, setDayEvents] = useState<Event[]>([])

  const isBusy = useMemo(() => isFetching || isSaving, [isFetching, isSaving])

  useEffect(() => {
    if (user) {
      fetchEvents()
      fetchOpponents()
	  fetchPlayers()
	  fetchVacations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    return () => {
      if (createdObjectUrlRef.current) {
        URL.revokeObjectURL(createdObjectUrlRef.current)
        createdObjectUrlRef.current = null
      }
    }
  }, [])

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

      if (createdObjectUrlRef.current) {
        URL.revokeObjectURL(createdObjectUrlRef.current)
        createdObjectUrlRef.current = null
      }
      const objectUrl = URL.createObjectURL(file)
      createdObjectUrlRef.current = objectUrl
      setPhotoPreview(objectUrl)
    } else {
      setForm((prev) => ({ ...prev, photo_file: null }))
      setPhotoPreview(null)
    }
  }

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const fileExtension = file.name.split(".").pop()
    const filePath = `event-photos/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`

    const { error } = await supabase.storage.from("tournament-photos").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })
    if (error) throw error

    const { data: publicUrlData } = supabase.storage.from("tournament-photos").getPublicUrl(filePath)
    return publicUrlData.publicUrl
  }

  const sendPushToAll = async (payload: { eventId: string; action: "created" | "updated" }) => {
    const res = await fetch(PUSH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      let msg = `Push-API Fehler (${res.status})`
      try {
        const j = await res.json()
        if (j?.error) msg = `${msg}: ${j.error}`
      } catch {}
      throw new Error(msg)
    }
  }


  const syncTournamentToDach = async (
    eventId: string,
    eventData: {
      name: string
      event_type: string
      start_date: string
      end_date: string
      event_time: string
      location: string
      entry_fee: number
      max_participants: number | null
      details: string | null
      photo_url: string | null
      mode: string | null
      startgeld_details: string | null
    },
  ) => {
    if (!user) throw new Error("Nicht authentifiziert.")

    if (eventData.event_type !== "tournament" || !form.publish_in_dach) {
      const { error: deleteError } = await supabase
        .from("dach_events")
        .delete()
        .eq("internal_event_id", eventId)

      if (deleteError) throw deleteError
      return
    }

    if (!form.dach_postal_code.trim() || !form.dach_city.trim() || !form.dach_region.trim()) {
      throw new Error(
        "Für die Veröffentlichung im DACH-Kalender bitte PLZ, Ort und Bundesland/Kanton ausfüllen.",
      )
    }

    const dachData = {
      internal_event_id: eventId,
      name: eventData.name,
      event_type: "tournament",
      event_date: eventData.start_date,
      start_date: eventData.start_date,
      end_date: eventData.end_date,
      event_time: eventData.event_time || null,
      location: eventData.location,
      country_code: form.dach_country_code,
      postal_code: form.dach_postal_code.trim(),
      city: form.dach_city.trim(),
      region: form.dach_region.trim(),
      organizer_name: form.dach_organizer_name.trim() || "EMD",
      organizer_email: user.email || null,
      organizer_phone: null,
      registration_url: null,
      registration_deadline: null,
      entry_fee: eventData.entry_fee,
      max_participants: eventData.max_participants,
      details: eventData.details,
      photo_url: eventData.photo_url,
      mode: eventData.mode,
      discipline: eventData.mode,
      format: null,
      startgeld_details: eventData.startgeld_details,
      source: "internal",
      event_status: "approved",
      created_by: user.id,
    }

    const { error } = await supabase
      .from("dach_events")
      .upsert(dachData, {
        onConflict: "internal_event_id",
      })

    if (error) throw error
  }

  const loadDachLinkForEvent = async (eventId: string) => {
    const { data, error } = await supabase
      .from("dach_events")
      .select(
        "internal_event_id,country_code,postal_code,city,region,organizer_name",
      )
      .eq("internal_event_id", eventId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  const fetchEvents = async () => {
    setIsFetching(true)
    setFormMessage(null)
    const { data, error } = await supabase.from("events").select("*").order("start_date", { ascending: true })
    if (error) {
      console.error("Error fetching events:", error)
      setFormMessage({ type: "error", text: "Fehler beim Laden der Veranstaltungen." })
      setEvents([])
    } else {
      setEvents((data || []) as Event[])
    }
    setIsFetching(false)
  }

  const fetchOpponents = async () => {
    const { data, error } = await supabase.from("opponent_teams").select("id,name")
    if (error) {
      console.error("Error fetching opponents:", error)
      return
    }
    setOpponents((data || []) as Opp[])
  }
  
  const fetchPlayers = async () => {
  const { data, error } = await supabase
    .from("club_players")
    .select("id,name,birthdate")
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching club_players:", error)
    setPlayers([])
    return
  }

  setPlayers((data || []) as ClubPlayer[])
}

const fetchVacations = async () => {
  const { data, error } = await supabase
    .from("vacations")
    .select("id,user_name,start_date,end_date")
    .order("start_date", { ascending: true })

  if (error) {
    console.error("Error fetching vacations:", error)
    setVacations([])
    return
  }

  setVacations((data || []) as Vacation[])
}

  const getTeamDisplayName = (m: MatchLite | null, isHome: boolean) => {
    if (!m) return "Unbekannt"
    if (isHome) {
      if (m.home_team_type === "own" && m.home_team) return m.home_team.name
      if (m.home_team_type === "opponent" && m.home_opponent_team) return m.home_opponent_team.name
      return m.home_team?.name ?? m.home_opponent_team?.name ?? "Unbekannt"
    } else {
      if (m.away_team_type === "own" && m.away_team) return m.away_team.name
      if (m.away_team_type === "opponent" && m.away_opponent_team) return m.away_opponent_team.name
      return m.away_team?.name ?? m.away_opponent_team?.name ?? "Unbekannt"
    }
  }

  const enrichWithOpponentNames = (m: any, opps: Opp[]): MatchLite => {
    const homeOpp = m?.home_opponent_team_id ? opps.find((o) => o.id === m.home_opponent_team_id) : null
    const awayOpp = m?.away_opponent_team_id ? opps.find((o) => o.id === m.away_opponent_team_id) : null
    return { ...m, home_opponent_team: homeOpp, away_opponent_team: awayOpp }
  }
  
  
  
  
  

 useEffect(() => {
  if (!user) return

  if (!form.start_date || !form.end_date) {
    setDayMatches([])
    setDayEvents([])
    setDayError(null)
    return
  }

  ;(async () => {
    setDayLoading(true)
    setDayError(null)
    try {
      const [matchesRes, eventsRes] = await Promise.all([
        supabase
          .from("matches")
          .select(
            `
            id,
            match_date,
            match_time,
            venue,
            week_number,
            status,
            original_date,
            postponement_reason,

            home_team_id,
            away_team_id,

            home_team_type,
            away_team_type,

            home_opponent_team_id,
            away_opponent_team_id,

            home_team:teams!matches_home_team_id_fkey(id,name),
            away_team:teams!matches_away_team_id_fkey(id,name)
          `,
          )
          .gte("match_date", form.start_date)
          .lte("match_date", form.end_date),

        supabase
          .from("events")
          .select("*")
          .lte("start_date", form.end_date)
          .gte("end_date", form.start_date)
          .eq("source", "internal")
          .order("start_date", { ascending: true }),
      ])

      if (matchesRes.error) throw matchesRes.error
      if (eventsRes.error) throw eventsRes.error

      const rows = (matchesRes.data || []).map((m: any) => enrichWithOpponentNames(m, opponents))
      setDayMatches(rows as MatchLite[])
      setDayEvents((eventsRes.data || []) as Event[])
    } catch (e: any) {
      console.error(e)
      setDayError(e?.message ?? "Fehler beim Laden (Spiele/Events).")
      setDayMatches([])
      setDayEvents([])
    } finally {
      setDayLoading(false)
    }
  })()
}, [user?.id, form.start_date, form.end_date, opponents])

  const homeGamesInRange = useMemo(() => dayMatches.filter((m) => m.home_team_type === "own"), [dayMatches])

const vacationsInRange = useMemo(() => {
  if (!form.start_date || !form.end_date) return []

  return vacations.filter((v) => {
    return v.start_date <= form.end_date && v.end_date >= form.start_date
  })
}, [vacations, form.start_date, form.end_date])


const birthdaysInRange = useMemo(() => {
  if (!form.start_date || !form.end_date) return []

  const allDays = getDatesBetween(form.start_date, form.end_date)
  const monthDaySet = new Set(
    allDays.map((date) => {
      const [, month, day] = date.split("-")
      return `${month}-${day}`
    }),
  )

  return players.filter((p) => {
    if (!p.birthdate) return false
    const bd = new Date(p.birthdate)
    const key = `${String(bd.getMonth() + 1).padStart(2, "0")}-${String(bd.getDate()).padStart(2, "0")}`
    return monthDaySet.has(key)
  })
}, [players, form.start_date, form.end_date])



  const resetForm = () => {
    setEditingEventId(null)
     setForm({
    name: "",
    event_type: "party",
    source: "internal",
    mode: "both",
    startgeld_details: "",
    start_date: "",
    end_date: "",
    event_time: "",
    location: "",
    entry_fee: 0,
    max_participants: null,
    details: "",
    photo_url: null,
    photo_file: null,
    publish_in_dach: false,
    dach_country_code: "AT",
    dach_postal_code: "",
    dach_city: "Salzburg",
    dach_region: "Salzburg",
    dach_organizer_name: "EMD",
  })
    if (createdObjectUrlRef.current) {
      URL.revokeObjectURL(createdObjectUrlRef.current)
      createdObjectUrlRef.current = null
    }
    setPhotoPreview(null)
    setFormMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormMessage(null)

    if (!user) {
      setFormMessage({ type: "error", text: "Fehler: Nicht authentifiziert." })
      setIsSaving(false)
      return
    }
	
	if (!form.start_date || !form.end_date) {
  setFormMessage({ type: "error", text: "Bitte Startdatum und Enddatum auswählen." })
  setIsSaving(false)
  return
}

if (form.end_date < form.start_date) {
  setFormMessage({ type: "error", text: "Enddatum darf nicht vor dem Startdatum liegen." })
  setIsSaving(false)
  return
}
	

    let photoUrl: string | null = form.photo_url
    try {
      if (form.photo_file) photoUrl = await uploadPhoto(form.photo_file)

const eventData = {
  name: form.name,
  event_type: form.event_type,
  event_date: form.start_date,
  start_date: form.start_date,
  end_date: form.end_date,
  event_time: form.event_time,
  location: form.location,
  entry_fee: Number(form.entry_fee),
  max_participants: form.max_participants ? Number(form.max_participants) : null,
  details: form.details,
  photo_url: photoUrl,
  source: form.source,
  mode: form.event_type === "tournament" ? (form.mode || null) : null,
  startgeld_details: form.event_type === "tournament" ? (form.startgeld_details || null) : null,
  user_id: user.id,
}

      if (editingEventId) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEventId)

        if (error) throw error

        await syncTournamentToDach(editingEventId, eventData)
        await sendPushToAll({ eventId: editingEventId, action: "updated" })

        setFormMessage({
          type: "success",
          text:
            form.event_type === "tournament" && form.publish_in_dach
              ? "Veranstaltung aktualisiert, im DACH-Kalender synchronisiert und Push versendet!"
              : "Veranstaltung aktualisiert + Push versendet!",
        })
      } else {
        const { data: insertedData, error } = await supabase
          .from("events")
          .insert([eventData])
          .select("id")
          .single()

        if (error) throw error

        const newEventId = insertedData?.id
        if (!newEventId) throw new Error("Neue Veranstaltungs-ID konnte nicht gelesen werden.")

        await syncTournamentToDach(newEventId, eventData)
        await sendPushToAll({ eventId: newEventId, action: "created" })

        setFormMessage({
          type: "success",
          text:
            form.event_type === "tournament" && form.publish_in_dach
              ? "Veranstaltung angelegt, im DACH-Kalender veröffentlicht und Push versendet!"
              : "Veranstaltung angelegt + Push versendet!",
        })
      }

      resetForm()
      void fetchEvents()
    } catch (error: any) {
      console.error("Error saving event:", error)
      setFormMessage({ type: "error", text: `Fehler beim Speichern: ${error.message}` })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = async (event: Event) => {
    setFormMessage(null)

    try {
      const dachLink =
        event.event_type === "tournament"
          ? await loadDachLinkForEvent(event.id)
          : null

      setEditingEventId(event.id)
      setForm({
        name: event.name,
        event_type: event.event_type,
        source: event.source ?? "internal",
        mode: event.mode ?? "both",
        startgeld_details: event.startgeld_details ?? "",
        start_date: event.start_date,
        end_date: event.end_date,
        event_time: event.event_time,
        location: event.location,
        entry_fee: event.entry_fee,
        max_participants: event.max_participants,
        details: event.details,
        photo_url: event.photo_url,
        photo_file: null,
        publish_in_dach: Boolean(dachLink),
        dach_country_code:
          dachLink?.country_code === "DE" || dachLink?.country_code === "CH"
            ? dachLink.country_code
            : "AT",
        dach_postal_code: dachLink?.postal_code ?? "",
        dach_city: dachLink?.city ?? "Salzburg",
        dach_region: dachLink?.region ?? "Salzburg",
        dach_organizer_name: dachLink?.organizer_name ?? "EMD",
      })

      setPhotoPreview(event.photo_url)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error: any) {
      console.error("Error loading DACH link:", error)
      setFormMessage({
        type: "error",
        text: `DACH-Verknüpfung konnte nicht geladen werden: ${error.message}`,
      })
    }
  }

  const handleDelete = async (id: string) => {
    setIsSaving(true)
    setFormMessage(null)

    if (!user) {
      setFormMessage({ type: "error", text: "Fehler: Nicht authentifiziert." })
      setIsSaving(false)
      return
    }

    const { error: dachDeleteError } = await supabase
      .from("dach_events")
      .delete()
      .eq("internal_event_id", id)

    if (dachDeleteError) {
      console.error("Error deleting linked DACH event:", dachDeleteError)
      setFormMessage({
        type: "error",
        text: `DACH-Verknüpfung konnte nicht gelöscht werden: ${dachDeleteError.message}`,
      })
      setIsSaving(false)
      return
    }

    const first = await supabase.from("events").delete().eq("id", id)
    const second = first.error ? await supabase.from("events").delete().eq("id", id).eq("user_id", user.id) : null
    const finalError = second?.error ?? first.error

    if (finalError) {
      console.error("Error deleting event:", finalError)
      setFormMessage({ type: "error", text: `Fehler beim Löschen: ${finalError.message}` })
    } else {
      setFormMessage({ type: "success", text: "Veranstaltung erfolgreich gelöscht!" })
      fetchEvents()
    }
    setIsSaving(false)
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "party":
        return <PartyPopper className="h-4 w-4 text-pink-600" />
      case "game_night":
        return <Gamepad2 className="h-4 w-4 text-blue-600" />
      case "meeting":
        return <MessageSquare className="h-4 w-4 text-green-600" />
      case "tournament":
        return <Trophy className="h-4 w-4 text-yellow-600" />
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
      case "tournament":
        return "Turnier"
      default:
        return "Sonstiges"
    }
  }

  return (
    // ✅ WICHTIG: KEIN Header, KEIN max-w, KEIN main → Admin Page macht Layout.
    <div className="w-full space-y-6">
      {/* Header Card (nur innerhalb Admin-Content) */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
        <div className="p-4 sm:p-5 flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black">Events verwalten</h2>
            <p className="text-sm text-gray-600 mt-1">Anlegen, planen & verwalten.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black border",
                  isBusy ? "border-orange-200 bg-orange-50 text-orange-800" : "border-gray-200 bg-gray-100 text-gray-700",
                )}
              >
                {isBusy ? "Aktiv…" : "Bereit"}
              </span>
              {user ? (
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black border border-green-200 bg-green-50 text-green-800">
                  Eingeloggt
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <PlusCircle className="w-4 h-4 text-gray-800" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base font-black">
                {editingEventId ? "Veranstaltung bearbeiten" : "Neue Veranstaltung anlegen"}
              </CardTitle>
              <CardDescription>Turniere, Partys und andere Veranstaltungen anlegen.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="space-y-2 lg:col-span-2">
                <label htmlFor="name" className="text-sm font-bold text-gray-700">
                  Veranstaltungsname
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleInputChange}
                  placeholder="z.B. Kratzer Turnier…"
                  required
                  className="h-11 rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="source" className="text-sm font-bold text-gray-700">
                  Quelle
                </label>
                <Select value={form.source ?? "internal"} onValueChange={(v) => handleSelectChange("source", v)}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Quelle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Intern</SelectItem>
                    <SelectItem value="external">Extern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="event_type" className="text-sm font-bold text-gray-700">
                  Veranstaltungstyp
                </label>
                <Select
                  value={form.event_type}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      event_type: value,
                      publish_in_dach:
                        value === "tournament" ? prev.publish_in_dach : false,
                    }))
                  }
                >
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Wähle einen Typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="party">
                      <div className="flex items-center gap-2">
                        <PartyPopper className="h-4 w-4 text-pink-600" />
                        <span>Party</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="game_night">
                      <div className="flex items-center gap-2">
                        <Gamepad2 className="h-4 w-4 text-blue-600" />
                        <span>Spielabend</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="meeting">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        <span>Versammlung</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="tournament">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-600" />
                        <span>Turnier</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="other">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-600" />
                        <span>Sonstiges</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
  <div className="space-y-2">
    <label htmlFor="start_date" className="text-sm font-bold text-gray-700">
      Startdatum
    </label>
    <Input
      id="start_date"
      name="start_date"
      type="date"
      value={form.start_date}
      onChange={handleInputChange}
      required
      className="h-11 rounded-2xl"
    />
  </div>

  <div className="space-y-2">
    <label htmlFor="end_date" className="text-sm font-bold text-gray-700">
      Enddatum
    </label>
    <Input
      id="end_date"
      name="end_date"
      type="date"
      value={form.end_date}
      onChange={handleInputChange}
      required
      className="h-11 rounded-2xl"
    />
  </div>

  <div className="space-y-2">
    <label htmlFor="event_time" className="text-sm font-bold text-gray-700">
      Uhrzeit
    </label>
    <Input
      id="event_time"
      name="event_time"
      type="time"
      value={form.event_time}
      onChange={handleInputChange}
      required
      className="h-11 rounded-2xl"
    />
  </div>
</div>
</div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="location" className="text-sm font-bold text-gray-700">
                  Ort
                </label>
                <Input
                  id="location"
                  name="location"
                  type="text"
                  value={form.location}
                  onChange={handleInputChange}
                  placeholder="z.B. Vereinsheim"
                  required
                  className="h-11 rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="entry_fee" className="text-sm font-bold text-gray-700">
                  Eintritt (€)
                </label>
                <Input
                  id="entry_fee"
                  name="entry_fee"
                  type="number"
                  step="0.01"
                  value={form.entry_fee}
                  onChange={handleInputChange}
                  required
                  className="h-11 rounded-2xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="max_participants" className="text-sm font-bold text-gray-700">
                  Max. Teilnehmer (optional)
                </label>
                <Input
                  id="max_participants"
                  name="max_participants"
                  type="number"
                  value={form.max_participants || ""}
                  onChange={handleInputChange}
                  placeholder="z.B. 50"
                  className="h-11 rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="photo_file" className="text-sm font-bold text-gray-700">
                  Veranstaltungsfoto (optional)
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    id="photo_file"
                    name="photo_file"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="flex-1 h-11 rounded-2xl"
                  />
                  {photoPreview ? (
                    <div className="w-16 h-12 flex-shrink-0 rounded-2xl overflow-hidden border border-gray-200 bg-white">
                      <img
                        src={photoPreview}
                        alt="Vorschau"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).src = "/placeholder.svg"
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {form.event_type === "tournament" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="mode" className="text-sm font-bold text-gray-700">
                    Modus
                  </label>
                  <Select value={form.mode ?? "both"} onValueChange={(v) => handleSelectChange("mode", v)}>
                    <SelectTrigger className="h-11 rounded-2xl">
                      <SelectValue placeholder="Modus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="edart">E-Dart</SelectItem>
                      <SelectItem value="steeldart">Steeldart</SelectItem>
                      <SelectItem value="both">Beides</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="startgeld_details" className="text-sm font-bold text-gray-700">
                    Startgeld
                  </label>
                  <Textarea
                    id="startgeld_details"
                    name="startgeld_details"
                    value={form.startgeld_details || ""}
                    onChange={handleInputChange}
                    placeholder='z.B. "10"'
                    rows={2}
                    className="resize-none rounded-2xl"
                  />
                </div>
              </div>
            ) : null}

            <div
              className={`rounded-3xl border p-4 sm:p-5 ${
                form.event_type === "tournament"
                  ? "border-orange-200 bg-orange-50/50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <label
                className={`flex items-start gap-3 ${
                  form.event_type === "tournament"
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.publish_in_dach}
                  disabled={form.event_type !== "tournament"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      publish_in_dach: e.target.checked,
                    }))
                  }
                  className="mt-1 h-5 w-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500 disabled:cursor-not-allowed"
                />

                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-black text-gray-900">
                    <Globe2
                      className={`h-5 w-5 ${
                        form.event_type === "tournament"
                          ? "text-orange-600"
                          : "text-gray-400"
                      }`}
                    />
                    Zusätzlich im DACH-Turnierkalender veröffentlichen
                  </span>

                  {form.event_type === "tournament" ? (
                    <span className="mt-1 block text-sm text-gray-600">
                      Das Turnier bleibt vollständig in der Vereinsverwaltung.
                      Anmeldung, Push-Nachrichten und interne Funktionen laufen
                      weiterhin ausschließlich über die Vereinsveranstaltung.
                    </span>
                  ) : (
                    <span className="mt-1 block text-sm font-bold text-gray-500">
                      Nur für den Veranstaltungstyp „Turnier“ verfügbar.
                    </span>
                  )}
                </span>
              </label>

              {form.event_type === "tournament" && form.publish_in_dach ? (
                <div className="mt-5 space-y-4 border-t border-orange-200 pt-5">
                  <div className="flex items-center gap-2 text-sm font-black text-orange-900">
                    <Link2 className="h-4 w-4" />
                    Öffentliche Angaben für den DACH-Kalender
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">
                        Land
                      </label>
                      <Select
                        value={form.dach_country_code}
                        onValueChange={(value: "AT" | "DE" | "CH") =>
                          setForm((prev) => ({
                            ...prev,
                            dach_country_code: value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-2xl bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AT">Österreich</SelectItem>
                          <SelectItem value="DE">Deutschland</SelectItem>
                          <SelectItem value="CH">Schweiz</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">
                        PLZ
                      </label>
                      <Input
                        value={form.dach_postal_code}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            dach_postal_code: e.target.value.replace(/\D/g, ""),
                          }))
                        }
                        inputMode="numeric"
                        placeholder="z. B. 5020"
                        className="h-11 rounded-2xl bg-white"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">
                        Ort
                      </label>
                      <Input
                        value={form.dach_city}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            dach_city: e.target.value,
                          }))
                        }
                        placeholder="z. B. Salzburg"
                        className="h-11 rounded-2xl bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">
                        Bundesland / Kanton
                      </label>
                      <Input
                        value={form.dach_region}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            dach_region: e.target.value,
                          }))
                        }
                        placeholder="z. B. Salzburg"
                        className="h-11 rounded-2xl bg-white"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">
                        Veranstalter
                      </label>
                      <Input
                        value={form.dach_organizer_name}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            dach_organizer_name: e.target.value,
                          }))
                        }
                        placeholder="EMD"
                        className="h-11 rounded-2xl bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-orange-200 bg-white p-3 text-xs font-semibold text-gray-600">
                    Änderungen am Vereins-Turnier werden beim Speichern
                    automatisch auch im DACH-Kalender aktualisiert. Wird das
                    Häkchen entfernt, verschwindet nur der DACH-Eintrag.
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="details" className="text-sm font-bold text-gray-700">
                Details (optional)
              </label>
              <Textarea
                id="details"
                name="details"
                value={form.details || ""}
                onChange={handleInputChange}
                placeholder="Zusätzliche Informationen…"
                rows={4}
                className="min-h-[110px] rounded-2xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Button
                type="submit"
                disabled={isBusy}
                className="h-11 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-sm"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editingEventId ? "Änderungen speichern" : "Veranstaltung anlegen"}
              </Button>

              {editingEventId ? (
                <Button
                  type="button"
                  onClick={resetForm}
                  variant="outline"
                  className="h-11 rounded-2xl border-gray-200 bg-white hover:bg-gray-50 font-black"
                  disabled={isBusy}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={resetForm}
                  variant="outline"
                  className="h-11 rounded-2xl border-gray-200 bg-white hover:bg-gray-50 font-black"
                  disabled={isBusy}
                >
                  Zurücksetzen
                </Button>
              )}
            </div>

            {formMessage ? (
              <div
                className={cn(
                  "p-4 rounded-2xl text-sm font-medium flex items-center gap-2 border",
                  formMessage.type === "error"
                    ? "bg-red-50 text-red-700 border-red-100"
                    : formMessage.type === "success"
                      ? "bg-green-50 text-green-700 border-green-100"
                      : "bg-gray-50 text-gray-700 border-gray-100",
                )}
              >
                {formMessage.type === "error" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : formMessage.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Info className="h-4 w-4" />
                )}
                <span className="min-w-0">{formMessage.text}</span>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {/* Planung */}
      <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-black">
  <ListChecks className="w-5 h-5 text-orange-600" />
  Planung von {form.start_date ? formatDE(form.start_date) : "…"} bis {form.end_date ? formatDE(form.end_date) : "…"}
</CardTitle>
          <CardDescription>Heimspiele + interne Events am ausgewählten Datum.</CardDescription>
        </CardHeader>
		
		
		
		<CardContent className="text-sm text-gray-700">
  {dayLoading ? (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      Lade Spiele/Events…
    </span>
  ) : dayError ? (
    <span className="text-orange-700">{dayError}</span>
  ) : (
    <>
      <div className="mt-1">
        <span className="font-black">{homeGamesInRange.length}</span>{" "}
        {homeGamesInRange.length === 1 ? "Heimspiel" : "Heimspiele"} im Zeitraum.
      </div>

      <div className="mt-3 flex items-center gap-2">
        <PartyPopper className="h-4 w-4 text-pink-600" />
        <div>
          <span className="font-black">{birthdaysInRange.length}</span>{" "}
          {birthdaysInRange.length === 1 ? "Geburtstag" : "Geburtstage"} im Zeitraum.
        </div>
      </div>

      {birthdaysInRange.length > 0 ? (
        <div className="mt-2 space-y-2">
          {birthdaysInRange.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-pink-200 bg-pink-50/60 px-3 py-2"
            >
              <div className="font-black text-gray-900 truncate">{p.name}</div>
              <div className="ml-3 font-black text-gray-900 tabular-nums">
                {p.birthdate ? formatDE(p.birthdate) : "—"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-sm text-gray-600">Keine Geburtstage im Zeitraum.</div>
      )}

      {homeGamesInRange.length > 0 ? (
        <div className="mt-3 space-y-2">
          {homeGamesInRange
            .slice()
            .sort((a, b) => (a.match_time || "").localeCompare(b.match_time || ""))
            .map((m) => {
              const h = getTeamDisplayName(m, true)
              const a = getTeamDisplayName(m, false)
              const t = hhmm(m.match_time)
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="font-black text-gray-900 truncate">
                      {h} <span className="text-gray-400">vs</span> {a}
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {formatDE(m.match_date)} • {m.venue || "—"}
                    </div>
                  </div>
                  <div className="ml-3 font-black text-gray-900 tabular-nums">{t}</div>
                </div>
              )
            })}
        </div>
      ) : (
        <div className="mt-2 text-sm text-gray-600">Keine Heimspiele im Zeitraum gefunden.</div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Info className="h-4 w-4 text-blue-700" />
        <div>
          <span className="font-black">{vacationsInRange.length}</span>{" "}
          {vacationsInRange.length === 1 ? "Person" : "Personen"} im Urlaub im Zeitraum.
        </div>
      </div>

      {vacationsInRange.length > 0 ? (
        <div className="mt-2 space-y-2">
          {vacationsInRange.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2"
            >
              <div className="font-black text-gray-900 truncate">{v.user_name}</div>
              <div className="ml-3 text-xs font-black text-gray-700 tabular-nums">
                {formatDE(v.start_date)} – {formatDE(v.end_date)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-sm text-gray-600">Niemand im Urlaub im Zeitraum.</div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <PartyPopper className="h-4 w-4 text-gray-800" />
        <div>
          <span className="font-black">{dayEvents.length}</span> interne{" "}
          {dayEvents.length === 1 ? "Veranstaltung" : "Veranstaltungen"} im Zeitraum.
        </div>
      </div>

      {dayEvents.length > 0 ? (
        <div className="mt-3 space-y-2">
          {dayEvents
            .slice()
            .sort((a, b) => {
              const dateCompare = a.start_date.localeCompare(b.start_date)
              if (dateCompare !== 0) return dateCompare
              return (a.event_time || "").localeCompare(b.event_time || "")
            })
            .map((ev) => {
              const t = hhmm(ev.event_time)
              const isThis = editingEventId && ev.id === editingEventId
              return (
                <div
                  key={ev.id}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-3 py-2",
                    isThis ? "border-orange-200 bg-orange-50/60" : "border-gray-200 bg-gray-50/50",
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-black text-gray-900 truncate">
                      {ev.name}
                      {isThis ? (
                        <span className="ml-2 text-xs font-black text-orange-700">(dieses Event)</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {getEventTypeLabel(ev.event_type)} • {formatDE(ev.start_date)}
                      {ev.end_date !== ev.start_date ? ` – ${formatDE(ev.end_date)}` : ""}
                    </div>
                  </div>
                  <div className="ml-3 font-black text-gray-900 tabular-nums">{t}</div>
                </div>
              )
            })}
        </div>
      ) : (
        <div className="mt-2 text-sm text-gray-600">Keine internen Events im Zeitraum.</div>
      )}
    </>
  )}
</CardContent>
		
		
		

      
      </Card>

      {/* Liste */}
      <Card className="rounded-2xl border border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base font-black">Bevorstehende Veranstaltungen</CardTitle>
              <CardDescription>Übersicht und Verwaltung aller geplanten Veranstaltungen.</CardDescription>
            </div>

            <Button
              variant="outline"
              className="h-10 rounded-2xl border-gray-200 bg-white hover:bg-gray-50 font-black"
              onClick={() => fetchEvents()}
              disabled={isBusy}
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {isFetching && events.length === 0 ? (
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
                    <TableHead>Foto</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Ort</TableHead>
                    <TableHead>Teilnehmer</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">
                        <div className="min-w-[200px]">
                          <div className="font-black text-gray-900">{event.name}</div>
                          <div className="text-xs text-gray-500">{event.source === "external" ? "Extern" : "Intern"}</div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getEventTypeIcon(event.event_type)}
                          <span>{getEventTypeLabel(event.event_type)}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {event.photo_url ? (
                          <div className="w-12 h-9 rounded-md overflow-hidden border border-gray-200">
                            <img
                              src={event.photo_url}
                              alt={`Foto: ${event.name}`}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                ;(e.currentTarget as HTMLImageElement).src = "/placeholder.svg"
                              }}
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </TableCell>

                      <TableCell>
  {new Date(event.start_date).toLocaleDateString("de-DE")}
  {event.end_date !== event.start_date ? ` – ${new Date(event.end_date).toLocaleDateString("de-DE")}` : ""}
</TableCell>
                      <TableCell>{event.location}</TableCell>
                      <TableCell>{event.max_participants ? `Max. ${event.max_participants}` : "Unbegrenzt"}</TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => void handleEdit(event)} className="h-9 w-9 p-0 rounded-xl">
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Bearbeiten</span>
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" disabled={isBusy || !user} className="h-9 w-9 p-0 rounded-xl">
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
                                <AlertDialogAction disabled={isBusy || !user} onClick={() => handleDelete(event.id)}>
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