"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Target,
  Trophy,
  CalendarDays,
  Users,
  Star,
  MapPin,
  Clock,
  Home,
  Plane,
  RotateCcw,
  Cake,
  Plus,
  Sun,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

interface Match {
  type?: string
  id: string
  season_id: string
  home_team_id: string
  away_team_id: string
  match_date: string
  match_time: string
  venue: string
  home_score: number | null
  away_score: number | null
  status: string
  week_number: number
  match_format?: "team" | "individual" | "best_of_three"
  division_type?: "team_division" | "individual_division"
  home_team: {
    id: string
    name: string
    logo_url?: string
  } | null
  away_team: {
    id: string
    name: string
    logo_url?: string
  } | null
  home_opponent_team: any | null
  away_opponent_team: any | null
  home_team_type: string
  away_team_type: string
  season: {
    id: string
    name: string
    type: string
  } | null
}

interface Event {
  vacation_user_id?: string | null;
  type?: string // "event" | "dko" | "birthday" | "vacation"
  id: string
  name: string
  event_date: string
  event_type: string
  description?: string
  start_time?: string

  // Zusätzliche Felder (events Tabelle)
  location?: string | null
  entry_fee?: number | null
  max_participants?: number | null
  details?: string | null
  photo_url?: string | null

  // Urlaub (optional)
  vacation_id?: string
  start_date?: string
  end_date?: string
  note?: string | null
}

type CalendarItem = Match | Event

interface BirthdayPlayer {
  id: string
  name: string
  birthdate: string
}

interface Vacation {
  id: string
  user_id?: string | null
  user_name: string
  player_name?: string | null
  start_date: string
  end_date: string
  note?: string | null
  created_at?: string



}


const DKO_TIMEZONE = "Europe/Berlin"

// Format a timestamptz string (UTC in DB) into local date/time strings for the calendar.
function toDateAndTimeInTZ(iso: string, timeZone: string = DKO_TIMEZONE) {
  const d = new Date(iso)
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d) // YYYY-MM-DD

  const timeParts = new Intl.DateTimeFormat("de-DE", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d) // HH:MM

  return { event_date: dateParts, start_time: timeParts }
}

function sanitizeVacationNote(note?: string | null) {
  if (!note) return ""
  // Remove birthday references from vacation notes (birthdays are handled separately).
  const cleaned = note
    .replace(/🎂/g, "")
    .replace(/\bgeburtstag\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
  return cleaned
}


export default function CalendarPage() {
  const router = useRouter()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Aktuellen eingeloggten User für Owner-Checks (UI) laden
  useEffect(() => {
    let isMounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return
      setCurrentUserId(data.user?.id ?? null)
    })
    return () => {
      isMounted = false
    }
  }, [])

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [selectedLeague, setSelectedLeague] = useState("Alle Ligen")
  const [selectedTeam, setSelectedTeam] = useState("Alle Teams")
  const [selectedItemType, setSelectedItemType] = useState("Alle")
  const [viewMode, setViewMode] = useState<"month" | "list" | "browse">("month")
  const [matches, setMatches] = useState<Match[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [leagues, setLeagues] = useState<string[]>(["Alle Ligen"])
  const [teams, setTeams] = useState<string[]>(["Alle Teams"])
  const [clubTeams, setClubTeams] = useState<ClubTeam[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isMultiItemDialogOpen, setIsMultiItemDialogOpen] = useState(false)
  const [isMobileBottomSheetOpen, setIsMobileBottomSheetOpen] = useState(false)
  const [mobileSelectedDate, setMobileSelectedDate] = useState<Date | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([{ id: "0", name: "Alle Spieler" }])
  const [selectedResultType, setSelectedResultType] = useState("Alle")

  const [browseTeamQuery, setBrowseTeamQuery] = useState("")

  const [birthdayPlayers, setBirthdayPlayers] = useState<BirthdayPlayer[]>([])

  const [vacations, setVacations] = useState<Vacation[]>([])
  const [isVacationDialogOpen, setIsVacationDialogOpen] = useState(false)
  const [vacationName, setVacationName] = useState("")
  const [vacationStart, setVacationStart] = useState("")
  const [vacationEnd, setVacationEnd] = useState("")
  const [vacationNote, setVacationNote] = useState("")
  const [savingVacation, setSavingVacation] = useState(false)
  const [editingVacationId, setEditingVacationId] = useState<string | null>(null)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [confirmDeleteVacationId, setConfirmDeleteVacationId] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)

      // Vereins-Teams (nur eigene) laden
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData?.user?.id
      if (uid) {
        const { data: clubTeamsData, error: clubTeamsError } = await supabase
          .from("teams")
          .select("id, name, logo_url")
          .eq("user_id", uid)
          .order("name", { ascending: true })

        if (clubTeamsError) {
          console.error("Error fetching club teams:", clubTeamsError)
          setClubTeams([])
          setTeams(["Alle Teams"])
        } else {
          const ct = (clubTeamsData || []) as ClubTeam[]
          setClubTeams(ct)
          setTeams(["Alle Teams", ...ct.map((t) => t.name)])
        }
      } else {
        setClubTeams([])
        setTeams(["Alle Teams"])
      }

      const matchesResponse = await supabase
        .from("matches")
        .select(`*,
          home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
          away_team:teams!matches_away_team_id_fkey(id, name, logo_url),
          home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
          away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name),
          season:seasons(id, name, type)
        `)
        .order("match_date", { ascending: true })

      if (matchesResponse.error) {
        console.error("Error fetching matches:", matchesResponse.error)
        return
      }

      let enrichedEvents: any[] = []
      try {
        const eventsResponse = await supabase.from("events").select("*").order("event_date", { ascending: true })

        if (eventsResponse.error) {
          console.error("Error fetching events:", eventsResponse.error)
        } else {
          const rows = (eventsResponse.data || []) as any[]
          enrichedEvents = rows.map((r) => ({
            type: "event",
            id: `event_${r.id}`,
            name: r.name || "Event",
            event_date: r.event_date,
            event_type: r.event_type || "Event",
            start_time: (r.event_time || "").toString().substring(0, 5) || undefined,
            description: r.details || undefined,
            details: r.details ?? null,
            location: r.location ?? null,
            entry_fee: r.entry_fee ?? null,
            max_participants: r.max_participants ?? null,
            photo_url: r.photo_url ?? null,
          })) as Event[]
        }
      } catch (eventError) {
        console.error("Events table might not exist or no permissions:", eventError)
      }



try {
  const tournamentsResponse = await supabase
    .from("dko_series_events")
    .select(
      `id, title, start_at, location, is_matchday, series_id,
       series:dko_series (id, name, slug, startgeld)`
    )
    .order("start_at", { ascending: true })

  if (tournamentsResponse.error) {
    console.error("Error fetching dko series events:", tournamentsResponse.error)
  } else {
    const tournamentRows = (tournamentsResponse.data || []) as any[]
    const tournamentEvents: Event[] = tournamentRows
      .filter((r) => r?.start_at && r?.series)
      .map((r) => {
        const { event_date, start_time } = toDateAndTimeInTZ(r.start_at)

        const seriesName = r.series?.name || "Turnier"
        const titlePart = r.title ? ` – ${r.title}` : ""
        const dayLabel = r.is_matchday ? "Spieltag" : "Spielfrei"
        const startgeld = r.series?.startgeld != null ? `${r.series.startgeld} € Startgeld` : null
        const location = r.location || null

        const details = [dayLabel, startgeld, location].filter(Boolean).join(" • ")

        return {
          type: "dko",
          id: `dko_${r.id}`,
          name: `${seriesName}${titlePart}`,
          event_date,
          event_type: "Turnier",
          start_time,
          description: details || undefined,
        }
      })

    
    enrichedEvents = [...enrichedEvents, ...tournamentEvents]
  }
} catch (tournamentError) {
  console.error("dko_series_events table might not exist or no permissions:", tournamentError)
}

      const enrichedMatches = matchesResponse.data || []

      setMatches(enrichedMatches)
      setEvents(enrichedEvents as Event[])

      
      let fetchedBirthdayPlayers: BirthdayPlayer[] = []
      try {
        const playersResponse = await supabase
          .from("club_players")
          .select("id, name, birthdate")
          .not("birthdate", "is", null)

        if (playersResponse.error) {
          console.error("Error fetching player birthdays:", playersResponse.error)
        } else {
          const rows = (playersResponse.data || []) as any[]
          fetchedBirthdayPlayers = rows
            .filter((r) => r?.birthdate)
            .map((r) => ({
              id: r.id,
              name: r.name || `Spieler ${String(r.id).slice(0, 6)}`,
              birthdate: r.birthdate,
            }))
        }
      } catch (birthdayError) {
        console.error("club_players table might not exist or no permissions:", birthdayError)
      }

      setBirthdayPlayers(fetchedBirthdayPlayers)

      // ✅ Urlaube aus vacations (mit user_id -> user_profiles.player_id -> club_players.name)
      let fetchedVacations: Vacation[] = []
      try {
        const vacationResponse = await supabase
          .from("vacations")
          .select("id, user_id, user_name, start_date, end_date, note, created_at")
          .order("start_date", { ascending: true })

        if (vacationResponse.error) {
          console.error("Error fetching vacations:", vacationResponse.error)
        } else {
          fetchedVacations = (vacationResponse.data || []) as Vacation[]

          // Enrich with player name via user_profiles -> club_players
          const userIds = Array.from(
            new Set(
              fetchedVacations
                .map((v) => v.user_id)
                .filter((x): x is string => typeof x === "string" && x.length > 0),
            ),
          )

          if (userIds.length) {
            const { data: profiles, error: profErr } = await supabase
              .from("user_profiles")
              .select("user_id, player_id")
              .in("user_id", userIds)

            if (!profErr && profiles?.length) {
              const playerIds = Array.from(
                new Set(
                  (profiles as any[])
                    .map((p) => p.player_id)
                    .filter((x): x is string => typeof x === "string" && x.length > 0),
                ),
              )

              let playerNameById = new Map<string, string>()
              if (playerIds.length) {
                const { data: playersRows, error: playersErr } = await supabase
                  .from("club_players")
                  .select("id, name")
                  .in("id", playerIds)

                if (!playersErr && playersRows?.length) {
                  playerNameById = new Map((playersRows as any[]).map((r) => [r.id, r.name]))
                }
              }

              const playerIdByUserId = new Map((profiles as any[]).map((p) => [p.user_id, p.player_id]))
              fetchedVacations = fetchedVacations.map((v) => {
                const pid = v.user_id ? playerIdByUserId.get(v.user_id) : null
                const pname = pid ? playerNameById.get(pid) : null
                return { ...v, player_name: pname ?? null }
              })
            }
          }
        }
      } catch (vacErr) {
        console.error("vacations table might not exist or no permissions:", vacErr)
      }

      setVacations(fetchedVacations)


      const uniqueLeagues = new Set<string>(["Alle Ligen"])
      enrichedMatches.forEach((match) => {
        if (match.season?.name) {
          uniqueLeagues.add(match.season.name)
        }
      })

      setLeagues(Array.from(uniqueLeagues))
    } catch (err) {
      console.error("Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

    useEffect(() => {
    const prefillVacationName = async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const authUserId = data?.user?.id
        if (!authUserId) return

        // auth user -> user_profiles.user_id -> player_id -> club_players.id -> name
        const { data: profileRow, error: profileErr } = await supabase
          .from("user_profiles")
          .select("player_id")
          .eq("user_id", authUserId)
          .maybeSingle()

        if (profileErr) return
        const playerId = profileRow?.player_id
        if (!playerId) return

        const { data: playerRow, error: playerErr } = await supabase
          .from("club_players")
          .select("name")
          .eq("id", playerId)
          .maybeSingle()

        if (playerErr) return
        if (playerRow?.name) {
          setVacationName(playerRow.name)
        }
      } catch (e) {
        // ignore
      }
    }

    prefillVacationName()
  }, [])

  const filteredMatches = matches.filter((match) => {
    if (selectedItemType === "Geburtstage" || selectedItemType === "Urlaube") return false

    const leagueMatch = selectedLeague === "Alle Ligen" || match.season?.name === selectedLeague
    const teamMatch =
      selectedTeam === "Alle Teams" ||
      match.home_team?.name === selectedTeam ||
      match.away_team?.name === selectedTeam ||
      match.home_opponent_team?.name === selectedTeam ||
      match.away_opponent_team?.name === selectedTeam

    // ✅ Ergebnis-Filter soll auch greifen, wenn z.B. "Alle Termine" gewählt ist,
    // aber zusätzlich nach Team/Liga gefiltert wird.
    let resultTypeMatch = true
    const shouldFilterByResultType =
      selectedResultType !== "Alle" &&
      selectedItemType !== "Events" &&
      selectedItemType !== "Turniere" &&
      selectedItemType !== "Geburtstage" &&
      selectedItemType !== "Urlaube"

    if (shouldFilterByResultType) {
      if (selectedResultType === "Gespielt") {
        resultTypeMatch = match.status === "completed" || match.status === "finished"
      } else if (selectedResultType === "Geplant") {
        resultTypeMatch = match.status === "scheduled"
      }
    }

    return leagueMatch && teamMatch && resultTypeMatch
  })

  const filteredEvents = events.filter((event) => {
    // ✅ Team-Filter gilt nur für Spiele
    if (selectedTeam !== "Alle Teams") return false
    if (selectedItemType === "Geburtstage" || selectedItemType === "Urlaube") return false
    if (selectedItemType === "Spiele") return false

    // ✅ Sauber nach Quelle filtern:
    // - "event"  => normale Vereins-/Party-Events aus public.events
    // - "dko"    => Turniere/Spieltage aus dko_series_events
    if (selectedItemType === "Events") return event.type === "event"
    if (selectedItemType === "Turniere") return event.type === "dko"

    // "Alle" oder andere Kombinationen -> alles drin lassen
    return true
  })

  // ✅ robust: kein new Date("YYYY-MM-DD") (timezone bug)
  const isBirthdayOnDate = (birthdate: string, date: Date) => {
    const parts = (birthdate || "").split("-")
    const m = Number(parts[1]) // 1-12
    const d = Number(parts[2]) // 1-31
    return m === date.getMonth() + 1 && d === date.getDate()
  }

  const isDateInRange = (dateStr: string, startStr: string, endStr: string) => {
    return dateStr >= startStr && dateStr <= endStr
  }

  const getItemsForDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const dateStr = `${year}-${month}-${day}`

    // ✅ Team-Ansicht: Team-Filter gilt nur für Spiele (keine Events/Geburtstage/Urlaube anzeigen)
    if (selectedTeam !== "Alle Teams") {
      return filteredMatches.filter((match) => match.match_date === dateStr)
    }

    const matchesForDate =
      selectedItemType !== "Events" && selectedItemType !== "Turniere" && selectedItemType !== "Geburtstage" && selectedItemType !== "Urlaube"
        ? filteredMatches.filter((match) => match.match_date === dateStr)
        : []

    const eventsForDate =
      selectedItemType !== "Spiele" && selectedItemType !== "Geburtstage" && selectedItemType !== "Urlaube"
        ? filteredEvents.filter((event) => event.event_date === dateStr)
        : []

    const birthdaysForDate =
      selectedItemType !== "Spiele" && selectedItemType !== "Turniere" && selectedItemType !== "Events" && selectedItemType !== "Urlaube"
        ? birthdayPlayers
            .filter((p) => isBirthdayOnDate(p.birthdate, date))
            .map((p) => {
              return {
                id: `birthday-${p.id}-${dateStr}`,
                name: `🎂 Geburtstag: ${p.name}`,
                event_date: dateStr,
                event_type: "Geburtstag",
                description: `${p.name} hat Geburtstag.`,
                start_time: "00:00:00",
                type: "birthday",
              } as Event
            })
        : []

    const vacationsForDate =
      selectedItemType !== "Spiele" && selectedItemType !== "Turniere" && selectedItemType !== "Geburtstage"
        ? vacations
            .filter((v) => isDateInRange(dateStr, v.start_date, v.end_date))
            .map((v) => {
              const cleanedNote = sanitizeVacationNote(v.note)
              return {
                id: `vacation-${v.id}-${dateStr}`,
                vacation_id: v.id,
                start_date: v.start_date,
                end_date: v.end_date,
                note: cleanedNote || null,
                name: `🏖️ Urlaub: ${v.player_name || v.user_name}`,
                event_date: dateStr,
                event_type: "Urlaub",
                description: cleanedNote || undefined,
                start_time: "00:00:00",
                type: "vacation",
              } as Event
            })
        : []

    return [...matchesForDate, ...eventsForDate, ...birthdaysForDate, ...vacationsForDate]
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const openMatchDialog = (match: Match) => {
    setSelectedMatch(match)
    setIsMatchDialogOpen(true)
  }

  const openEventDialog = (event: Event) => {
    setSelectedEvent(event)
    setIsEventDialogOpen(true)
  }

  const createVacation = async () => {
    if (!vacationName.trim() || !vacationStart || !vacationEnd) return
    setSavingVacation(true)
    try {
      if (editingVacationId) {
        const { error } = await supabase
          .from("vacations")
          .update({
            user_name: vacationName.trim(),
            start_date: vacationStart,
            end_date: vacationEnd,
            note: vacationNote.trim() ? vacationNote.trim() : null,
          })
          .eq("id", editingVacationId)

        if (error) {
          console.error("Error updating vacation:", error)
          return
        }
      } else {
        const { data: authData } = await supabase.auth.getUser()
        const uid = authData?.user?.id
        const { error } = await supabase.from("vacations").insert({
          user_id: uid ?? null,
          user_name: vacationName.trim(),
          start_date: vacationStart,
          end_date: vacationEnd,
          note: vacationNote.trim() ? vacationNote.trim() : null,
        })

        if (error) {
          console.error("Error creating vacation:", error)
          return
        }
      }

      setIsVacationDialogOpen(false)
      setEditingVacationId(null)
      await fetchData()
    } catch (e) {
      console.error("createVacation failed:", e)
    } finally {
      setSavingVacation(false)
    }
  }

  const deleteVacation = async (vacationId: string) => {
    if (!vacationId) return
    setSavingVacation(true)
    try {
      const { error } = await supabase.from("vacations").delete().eq("id", vacationId)
      if (error) {
        console.error("Error deleting vacation:", error)
        return
      }
      setIsEventDialogOpen(false)
      setIsVacationDialogOpen(false)
      setEditingVacationId(null)
      await fetchData()
    } catch (e) {
      console.error("deleteVacation failed:", e)
    } finally {
      setSavingVacation(false)
    }
  }

  const handleItemClick = (item: CalendarItem) => {
    if ("match_date" in item) {
      openMatchDialog(item as Match)
    } else {
      openEventDialog(item as Event)
    }
  }

  const openMultiItemDialogDialog = (date: Date, items: CalendarItem[]) => {
    setSelectedDate(date)
    setIsMultiItemDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    if (status === "completed" || status === "finished") {
      return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Beendet</Badge>
    } else if (status === "live" || status === "in_progress") {
      return <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse text-xs">Live</Badge>
    } else {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Anstehend</Badge>
    }
  }

  const isHomeGame = (match: Match, teamName?: string) => {
    return match.home_team_type === "own"
  }

  const monthNames = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ]

  const dayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]

  const todayBirthdays = (() => {
    const today = new Date()
    return birthdayPlayers.filter((p) => isBirthdayOnDate(p.birthdate, today))
  })()

  const today = new Date()
  const todayStr = (() => {
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, "0")
    const d = String(today.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  })()

  const todayMatches = matches.filter((match) => match.match_date === todayStr)
  const todayEvents = events.filter((event) => event.event_date === todayStr)
  const todayBirthdayEvents: Event[] = birthdayPlayers
    .filter((p) => isBirthdayOnDate(p.birthdate, today))
    .map((p) => ({
      id: `today-birthday-${p.id}-${todayStr}`,
      name: `🎂 Geburtstag: ${p.name}`,
      event_date: todayStr,
      event_type: "Geburtstag",
      description: `${p.name} hat Geburtstag.`,
      start_time: "00:00:00",
      type: "birthday",
    }))

  const todayVacations: Event[] = vacations
    .filter((v) => isDateInRange(todayStr, v.start_date, v.end_date))
    .map((v) => ({
      id: `today-vacation-${v.id}-${todayStr}`,
      vacation_id: v.id,
      vacation_user_id: (v as any).user_id ?? null,
      start_date: v.start_date,
      end_date: v.end_date,
      note: v.note,
      name: `🏖️ Urlaub: ${v.player_name || v.user_name}`,
      event_date: todayStr,
      event_type: "Urlaub",
      description: v.note || undefined,
      start_time: "00:00:00",
      type: "vacation",
    }))

  const todayHighlights: CalendarItem[] = [...todayMatches, ...todayEvents, ...todayBirthdayEvents, ...todayVacations]
  
  
  

  const getTeamDisplayName = (match: Match, isHome: boolean) => {
    if (isHome) {
      if (match.home_team_type === "own") {
        return match.home_team?.name || "Heimteam"
      } else {
        return match.home_opponent_team?.name || "Heimteam"
      }
    } else {
      if (match.away_team_type === "own") {
        return match.away_team?.name || "Auswärtsteam"
      } else {
        return match.away_opponent_team?.name || "Auswärtsteam"
      }
    }
  }

  const getTeamLogo = (match: Match, isHome: boolean) => {
    if (isHome) {
      return match.home_team_type === "own" ? match.home_team?.logo_url : null
    } else {
      return match.away_team_type === "own" ? match.away_team?.logo_url : null
    }
  }

  const isEvent = (item: CalendarItem): item is Event => {
    return "event_date" in item
  }

const getEventTypeBadge = (eventType: string) => {
  if (eventType === "Geburtstag") {
    return <Badge className="bg-pink-100 text-pink-800 border-pink-200 text-xs">🎂 Geburtstag</Badge>
  } else if (eventType === "Turnier") {
    return <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">Turnier</Badge>
  } else if (eventType === "Versammlung") {
    return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Event</Badge>
  } else if (eventType === "Urlaub") {
    return <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-xs">🏖️ Urlaub</Badge>
  } else if (eventType === "Spielfrei") {
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Spielfrei</Badge>
  } else {
    return <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs">Event</Badge>
  }
}

const safeString = (value: any): string => {
  if (!value) return ""

  if (typeof value === "object") {
    if (value?.type === "Buffer" && Array.isArray(value?.data)) {
      try {
        return new TextDecoder().decode(new Uint8Array(value.data))
      } catch {
        return ""
      }
    }
  }

  return String(value)
}




  const formatTimeWithoutSeconds = (value: any): string => {
  if (!value) return ""

  // Falls Supabase / irgendwas als Buffer-Objekt kommt:
  if (typeof value === "object") {
    // { type: "Buffer", data: [...] }
    if (value?.type === "Buffer" && Array.isArray(value?.data)) {
      try {
        value = new TextDecoder().decode(new Uint8Array(value.data))
      } catch {
        // ignore
      }
    } else if (value instanceof Uint8Array) {
      try {
        value = new TextDecoder().decode(value)
      } catch {
        // ignore
      }
    }
  }

  const s = String(value)

  // holt zuverlässig "HH:MM" aus z.B. "19:00:00", "Buffer ... 19:00:00", etc.
  const m = s.match(/(\d{2}:\d{2})/)
  if (m) return m[1]

  // Fallback
  return s.substring(0, 5)
}

const normalizeTimeHHMM = (value: any): string => {
  if (!value) return ""

  // Buffer-Objekt (z.B. { type: "Buffer", data: [...] })
  if (typeof value === "object") {
    if (value?.type === "Buffer" && Array.isArray(value?.data)) {
      try {
        value = new TextDecoder().decode(new Uint8Array(value.data))
      } catch {
        return ""
      }
    } else if (value instanceof Uint8Array) {
      try {
        value = new TextDecoder().decode(value)
      } catch {
        return ""
      }
    }
  }

  const s = String(value)
  const m = s.match(/(\d{1,2}):(\d{2})/)
  if (!m) return ""

  const hh = m[1].padStart(2, "0")
  const mm = m[2]
  return `${hh}:${mm}`
}



  const handleMobileTileClick = (date: Date, items: CalendarItem[]) => {
    if (items.length === 0) return

    setMobileSelectedDate(date)
    setIsMobileBottomSheetOpen(true)
  }

  
  const birthdayEventsForList: Event[] =
    selectedItemType !== "Spiele" && selectedItemType !== "Turniere" && selectedItemType !== "Events"
      ? birthdayPlayers.map((p) => {
          const parts = (p.birthdate || "").split("-")
          const m = String(parts[1] || "01").padStart(2, "0")
          const d = String(parts[2] || "01").padStart(2, "0")
          const year = currentDate.getFullYear()
          const event_date = `${year}-${m}-${d}`

          return {
            id: `birthday-list-${p.id}-${event_date}`,
            name: `🎂 Geburtstag: ${p.name}`,
            event_date,
            event_type: "Geburtstag",
            description: `${p.name} hat Geburtstag.`,
            start_time: "00:00:00",
            type: "birthday",
          }
        })
      : []


  const vacationEventsForList: Event[] =
    selectedItemType !== "Spiele" && selectedItemType !== "Turniere"
      ? vacations.map((v) => ({
          id: `vacation-list-${v.id}-${v.start_date}`,
          vacation_id: v.id,
            vacation_user_id: (v as any).user_id ?? null,
          start_date: v.start_date,
          end_date: v.end_date,
          note: sanitizeVacationNote(v.note),
          name: `🏖️ Urlaub: ${v.player_name || v.user_name}`,
          event_date: v.start_date,
          event_type: "Urlaub",
          description: `${v.start_date} bis ${v.end_date}${sanitizeVacationNote(v.note) ? ` • ${sanitizeVacationNote(v.note)}` : ""}`,
          start_time: "00:00:00",
          type: "vacation",
        }))
      : []

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-20">
        <main className="flex-grow pt-4">
          <div className="px-4 py-4 max-w-[1600px] mx-auto overflow-x-hidden">

            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-sm-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Lade Kalender...</p>
              </div>
            </div>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <Header />
      <main className="flex-grow pt-4">
       <div className="px-6 py-6 w-full overflow-x-hidden">



          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/member-profile-app")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zum Profil
            </Button>
          </div>

          <div className="mb-4">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1 uppercase tracking-wide">Vereinskalender</h1>
            <p className="text-gray-600 text-sm">Alle Liga-Spiele und Termine von Emoj!'s Dartverein</p>
          </div>

          {todayHighlights.length > 0 && (
            <div className="mb-4">
              <Card className="shadow-lg border-0 bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 rounded-sm-lg">
                      <Star className="h-5 w-5 text-orange-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">Heute im Verein</div>

                      <div className="mt-3 space-y-2">
                        {todayHighlights.slice(0, 5).map((item) => {
                          const isMatch = "match_date" in item
                          if (isMatch) {
                            const match = item as Match
                            return (
                              <button
                                key={match.id}
                                onClick={() => openMatchDialog(match)}
                                className="w-full text-left"
                              >
                                <div className="flex items-center justify-between gap-3 p-2 rounded-sm-lg border hover:bg-gray-50 transition-colors min-w-0">
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                      🎯 {getTeamDisplayName(match, true)} vs {getTeamDisplayName(match, false)}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-0.5">
  {formatTimeWithoutSeconds(match.match_time)} Uhr
  {match.season?.name ? ` • ${match.season.name}` : ""}
</div>

                                  </div>

                                  <div className="shrink-0">
                                    {match.status === "completed" || match.status === "finished" ? (
                                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs whitespace-nowrap">
                                        {match.home_score} : {match.away_score}
                                      </Badge>
                                    ) : (
                                      getStatusBadge(match.status)
                                    )}
                                  </div>
                                </div>
                              </button>
                            )
                          } else {
                            const ev = item as Event
                            return (
                              <button
                                key={ev.id}
                                onClick={() => openEventDialog(ev)}
                                className="w-full text-left"
                              >
                                <div className="flex items-center justify-between gap-3 p-2 rounded-sm-lg border hover:bg-gray-50 transition-colors min-w-0">
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                      {ev.event_type === "Geburtstag" ? "🎂" : ev.event_type === "Turnier" ? "🏆" : "📅"}{" "}
                                      {ev.name}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-0.5">
                                      {ev.event_type === "Urlaub"
                                        ? `Urlaub • ${ev.start_date} bis ${ev.end_date}`
                                        : ev.event_type === "Geburtstag"
                                          ? "Geburtstag"
                                          : `${ev.event_type}${ev.start_time ? ` • ${normalizeTimeHHMM(ev.start_time)} Uhr` : ""}`}

                                    </div>
                                  </div>

                                  <div className="shrink-0">{getEventTypeBadge(ev.event_type)}</div>
                                </div>
                              </button>
                            )
                          }
                        })}

                        {todayHighlights.length > 5 && (
                          <div className="text-xs text-gray-500 pt-1">+ {todayHighlights.length - 5} weitere</div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {todayBirthdays.length > 0 && (
            <div className="mb-4">
              <Card className="shadow-lg border-0 bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-pink-100 rounded-sm-lg">
                      <Cake className="h-5 w-5 text-pink-700" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">Heute hat jemand Geburtstag 🎉</div>
                      <div className="text-sm text-gray-700 mt-1">{todayBirthdays.map((p) => p.name).join(", ")}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="mb-4">
            <Card className="shadow-lg border-0 bg-white">
              <CardContent className="p-3">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-center">
                    <div className="flex bg-gray-100 rounded-sm-lg p-1">
                      <Button
                        variant={viewMode === "month" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("month")}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Calendar className="h-4 w-4" />
                        Monat
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Filter className="h-4 w-4" />
                        Liste
                      </Button>
                      <Button
                        variant={viewMode === "browse" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("browse")}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Users className="h-4 w-4" />
                        Übersicht
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Select value={selectedItemType} onValueChange={setSelectedItemType}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Typ auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alle" className="text-sm">
                          Alle Termine
                        </SelectItem>
                        <SelectItem value="Spiele" className="text-sm">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-orange-600" />
                            Nur Spiele
                          </div>
                        </SelectItem>
                        <SelectItem value="Turniere" className="text-sm">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-purple-600" />
                            Nur Turniere
                          </div>
                        </SelectItem>
                        <SelectItem value="Events" className="text-sm">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-green-600" />
                            Nur Events
                          </div>
                        </SelectItem>

                        <SelectItem value="Urlaube" className="text-sm">
                          <div className="flex items-center gap-2">
                            <Sun className="h-4 w-4 text-sky-700" />
                            Nur Urlaube
                          </div>
                        </SelectItem>

                        {/* ✅ wieder drin */}
                        <SelectItem value="Geburtstage" className="text-sm">
                          <div className="flex items-center gap-2">
                            <Cake className="h-4 w-4 text-pink-700" />
                            Nur Geburtstage
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Liga auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {leagues.map((league) => (
                          <SelectItem key={league} value={league} className="text-sm">
                            {league}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Team auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team} value={team} className="text-sm">
                            {team}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedResultType} onValueChange={setSelectedResultType}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Ergebnis-Typ auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alle" className="text-sm">
                          Alle Ergebnisse
                        </SelectItem>
                        <SelectItem value="Gespielt" className="text-sm">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Gespielt</Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="Geplant" className="text-sm">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Geplant</Badge>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedItemType("Alle")
                        setSelectedLeague("Alle Ligen")
                        setSelectedTeam("Alle Teams")
                        setSelectedResultType("Alle")
                      }}
                      className="w-full bg-white hover:bg-gray-50 border-gray-200 text-xs"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Zurücksetzen
                    </Button>


                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setEditingVacationId(null)
                        // Name möglichst behalten (auto-fill), daher nicht leeren wenn schon gesetzt
                        setVacationStart("")
                        setVacationEnd("")
                        setVacationNote("")
                        setIsVacationDialogOpen(true)
                      }}
                      className="w-full h-11 rounded-sm-2xl text-sm font-semibold shadow-sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Urlaub eintragen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>


          {viewMode === "browse" && (
            <div className="space-y-4">
              <Card className="shadow-lg border-0 bg-white">
                <CardHeader className="pb-2 px-2 sm:px-6">

                  <CardTitle className="text-base text-gray-900">Kachelübersicht</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-2">Typen</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setSelectedItemType("Alle")
                          setSelectedLeague("Alle Ligen")
                          setSelectedTeam("Alle Teams")
                          setViewMode("list")
                        }}
                        className="p-3 rounded-sm-xl border bg-white hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-700" />
                          <div className="text-sm font-medium text-gray-900">Alle Termine</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedItemType("Spiele")
                          setSelectedLeague("Alle Ligen")
                          setSelectedTeam("Alle Teams")
                          setViewMode("list")
                        }}
                        className="p-3 rounded-sm-xl border bg-white hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-orange-600" />
                          <div className="text-sm font-medium text-gray-900">Spiele</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedItemType("Turniere")
                          setSelectedLeague("Alle Ligen")
                          setSelectedTeam("Alle Teams")
                          setViewMode("list")
                        }}
                        className="p-3 rounded-sm-xl border bg-white hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-purple-600" />
                          <div className="text-sm font-medium text-gray-900">Turniere</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedItemType("Events")
                          setSelectedLeague("Alle Ligen")
                          setSelectedTeam("Alle Teams")
                          setViewMode("list")
                        }}
                        className="p-3 rounded-sm-xl border bg-white hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-green-600" />
                          <div className="text-sm font-medium text-gray-900">Events</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedItemType("Urlaube")
                          setSelectedLeague("Alle Ligen")
                          setSelectedTeam("Alle Teams")
                          setViewMode("list")
                        }}
                        className="p-3 rounded-sm-xl border bg-white hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4 text-sky-700" />
                          <div className="text-sm font-medium text-gray-900">Urlaube</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedItemType("Geburtstage")
                          setSelectedLeague("Alle Ligen")
                          setSelectedTeam("Alle Teams")
                          setViewMode("list")
                        }}
                        className="p-3 rounded-sm-xl border bg-white hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Cake className="h-4 w-4 text-pink-700" />
                          <div className="text-sm font-medium text-gray-900">Geburtstage</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-2">Ligen</div>
                    <div className="grid grid-cols-2 gap-2">
                      {leagues
                        .filter((l) => l !== "Alle Ligen")
                        .map((league) => (
                          <button
                            key={league}
                            onClick={() => {
                              setSelectedLeague(league)
                              setSelectedTeam("Alle Teams")
                              setSelectedItemType("Spiele")
                              setViewMode("list")
                            }}
                            className="p-3 rounded-sm-xl border bg-white hover:bg-gray-50 text-left transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Trophy className="h-4 w-4 text-gray-700 shrink-0" />
                              <div className="text-sm font-medium text-gray-900 truncate">{league}</div>
                            </div>
                          </button>
                        ))}
                    </div>
                    {leagues.filter((l) => l !== "Alle Ligen").length === 0 && (
                      <div className="text-xs text-gray-500">Keine Ligen gefunden.</div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-2">Teams</div>
                    <div className="mb-2">
                      <Input
                        value={browseTeamQuery}
                        onChange={(e) => setBrowseTeamQuery(e.target.value)}
                        placeholder="Team suchen…"
                        className="text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {clubTeams
                        .filter((t) => t.name.toLowerCase().includes(browseTeamQuery.toLowerCase().trim()))
                        .map((team) => (
                          <button
                            key={team.id}
                            onClick={() => {
                              setSelectedTeam(team.name)
                              setSelectedItemType("Spiele")
                              setViewMode("list")
                            }}
                            className="p-3 rounded-sm-xl border bg-white hover:bg-gray-50 text-left transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage src={team.logo_url ?? undefined} alt={team.name} />
                                <AvatarFallback>{team.name?.slice(0, 1)?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="text-sm font-medium text-gray-900 truncate">{team.name}</div>
                            </div>
                          </button>
                        ))}</div>
                    {clubTeams.length === 0 && (
                      <div className="text-xs text-gray-500">Keine Teams gefunden.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {viewMode === "month" && (
  <Card className="shadow-xl border-0 bg-white w-full">


              <CardHeader className="pb-3 px-2 sm:px-6">

                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl lg:text-3xl font-bold">

                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                      Heute
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 p-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 42 }, (_, index) => {
                    const day = getDaysInMonth(currentDate)[index]
                    const isToday = day?.toDateString() === new Date().toDateString()
                    const itemsForDay = day ? getItemsForDate(day) : []

                    return (
                      <div
                        key={index}
                        className={`p-1 border border-gray-200 rounded-sm-lg transition-colors overflow-hidden ${
                          isToday ? "bg-orange-50 border-orange-300" : "bg-white hover:bg-gray-50"
                        } 
                        h-24 sm:h-28 lg:h-40
 cursor-pointer`}
                        onClick={() => {
                          if (day && itemsForDay.length > 0) {
                            if (window.innerWidth < 768) {
                              handleMobileTileClick(day, itemsForDay)
                            } else {
                              if (itemsForDay.length === 1) {
                                handleItemClick(itemsForDay[0])
                              } else {
                                openMultiItemDialogDialog(day, itemsForDay)
                              }
                            }
                          }
                        }}
                      >
                        {day && (
                          <div className={`text-sm font-medium mb-1 ${isToday ? "text-orange-600" : "text-gray-900"}`}>
                            {day.getDate()}
                          </div>
                        )}

                        <div className="space-y-1 overflow-hidden">
                          <div className="block">
                      <div className="block">
  <div className="space-y-1 mt-1">
    {itemsForDay.slice(0, 3).map((item, idx) => {
      const isMatch = "match_date" in item

      let bg = "bg-gray-400"
      let text = ""

      if (isMatch) {
        bg = "bg-orange-500"
        const time = formatTimeWithoutSeconds((item as any).match_time)

const shortenTeam = (name: string, max = 14) => {
  const cleaned = (name || "").replace(/\s+/g, " ").trim()
  if (!cleaned) return "Team"
  return cleaned.length > max ? cleaned.slice(0, max - 1) + "…" : cleaned
}

const homeName = getTeamDisplayName(item, true) || "Team"
const awayName = getTeamDisplayName(item, false) || "Team"

const homeShort = shortenTeam(homeName, 14)
const awayShort = shortenTeam(awayName, 14)


text = `${normalizeTimeHHMM((item as any).match_time)} Uhr ${homeShort} vs ${awayShort}`



      } else {
        const ev: any = item
        if (ev.event_type === "Urlaub") bg = "bg-red-500"
        else if (ev.event_type === "Turnier") bg = "bg-purple-500"
        else if (ev.event_type === "Geburtstag") bg = "bg-pink-500"
        else bg = "bg-green-500"

        text = ev.name || "Termin"
      }

     return (
  <div
    key={idx}
    className={`${bg} text-white text-[11px] font-medium px-1 py-0.5 rounded-sm`}
    title={text}
  >
    {/* MOBILE */}
   <span
  className="md:hidden block leading-tight overflow-hidden"
  style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
>

  {text}
</span>


    {/* DESKTOP */}
    <span className="hidden md:block whitespace-nowrap overflow-hidden text-ellipsis">
      {isMatch
        ? `${normalizeTimeHHMM((item as any).match_time)} ${getTeamDisplayName(item, true)} vs ${getTeamDisplayName(item, false)}`
        : text}
    </span>
  </div>
)

    })}

    {itemsForDay.length > 3 && (
      <div className="text-[11px] font-medium text-gray-500 px-0.5">
        +{itemsForDay.length - 3} mehr
      </div>
    )}
  </div>
</div>

                            
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {viewMode === "list" && (
            <div className="space-y-3">
              {(() => {
                const listItems: CalendarItem[] =
                  selectedItemType === "Spiele"
                    ? [...filteredMatches]
                    : selectedItemType === "Turniere" || selectedItemType === "Events"
                      ? [...filteredEvents]
                      : selectedItemType === "Geburtstage"
                        ? [...birthdayEventsForList]
                        : selectedItemType === "Urlaube"
                          ? [...vacationEventsForList]
                          : [...filteredMatches, ...filteredEvents, ...birthdayEventsForList, ...vacationEventsForList]

                if (listItems.length === 0) {
                  return (
                    <Card className="border bg-white w-full shadow-none rounded-sm-none sm:rounded-sm-xl">

                      <CardContent className="p-6 text-center">
                        <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Termine gefunden</h3>
                        <p className="text-gray-600 text-sm">Mit den aktuellen Filtern wurden keine Termine gefunden.</p>
                      </CardContent>
                    </Card>
                  )
                }

                return listItems
                  .sort((a, b) => {
                    const todayStr = format(new Date(), "yyyy-MM-dd")

                    const dateA = "match_date" in a ? a.match_date : a.event_date
                    const dateB = "match_date" in b ? b.match_date : b.event_date

                    const timeA =
                      "match_time" in a
                        ? normalizeTimeHHMM(a.match_time) || "00:00"

                       : normalizeTimeHHMM((a as any).start_time) || "00:00"

                    const timeB =
                      "match_time" in b
                        ? normalizeTimeHHMM(b.match_time) || "00:00"

                       : normalizeTimeHHMM((b as any).start_time) || "00:00"


                    const keyA = `${dateA}T${timeA}`
                    const keyB = `${dateB}T${timeB}`

                    const isUpcomingA = dateA >= todayStr
                    const isUpcomingB = dateB >= todayStr

                    // ✅ Kommende Termine zuerst (nächster Termin ganz oben),
                    // danach vergangene Termine (neueste Ergebnisse zuerst).
                    if (isUpcomingA && !isUpcomingB) return -1
                    if (!isUpcomingA && isUpcomingB) return 1

                    if (isUpcomingA && isUpcomingB) {
                      return keyA.localeCompare(keyB) // soonest first
                    }
                    return keyB.localeCompare(keyA) // past: newest first
                  })
                  .map((item) => {
                    if (isEvent(item)) {
                      return (
                        <Card key={item.id} className="shadow-lg border-0 bg-white hover:shadow-xl transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col gap-2 mb-2">
                                  <div className="flex items-center gap-2">{getEventTypeBadge(item.event_type)}</div>
                                {item.photo_url && (
                                  <div className="mt-3">
                                    <img
                                      src={item.photo_url}
                                      alt={item.name}
                                      className="w-full h-36 object-cover rounded-sm-xl border"
                                    />
                                  </div>
                                )}

                                </div>

                                <div className="mb-2 min-w-0">
                                  <h3 className="text-base font-semibold text-gray-900 mb-1">{item.name}</h3>
                                  {item.description && <p className="text-gray-600 text-sm">{item.description}</p>}
                                </div>

                                <div className="flex flex-col gap-2 text-sm text-gray-600">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Calendar className="h-4 w-4 shrink-0" />
                                    {new Date(item.event_date).toLocaleDateString("de-DE", {
                                      weekday: "short",
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })}
                                  </div>
                                  {item?.start_time && (
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Clock className="h-4 w-4 shrink-0" />
                                      {formatTimeWithoutSeconds(item?.start_time)} Uhr
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 min-w-0">
                                    {item.event_type === "Turnier" ? (
                                      <>
                                        <Trophy className="h-4 w-4 text-purple-600 shrink-0" />
                                        <span className="text-purple-600 font-medium">Turnier</span>
                                      </>
                                    ) : item.event_type === "Geburtstag" ? (
                                      <>
                                        <Cake className="h-4 w-4 text-pink-700 shrink-0" />
                                        <span className="text-pink-700 font-medium">Geburtstag</span>
                                      </>
                                    ) : item.event_type === "Urlaub" ? (
                                      <>
                                        <Sun className="h-4 w-4 text-sky-700 shrink-0" />
                                        <span className="text-sky-700 font-medium">Urlaub</span>
                                      </>
                                    ) : (
                                      <>
                                        <Star className="h-4 w-4 text-green-600 shrink-0" />
                                        <span className="text-green-600 font-medium">Vereinsevent</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-end">
                                <Button
                                  onClick={() => openEventDialog(item)}
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                >
                                  Details
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    } else {
                      const match = item as Match
                      return (
                        <Card key={match.id} className="shadow-lg border-0 bg-white hover:shadow-xl transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    {getStatusBadge(match.status)}
                                    <Badge variant="outline" className="text-xs">
                                      {match.season?.name || "Liga"}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-600">Spieltag {match.week_number}</div>
                                </div>

                                <div className="flex items-center gap-4 mb-2 min-w-0">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Avatar className="h-8 w-8 shrink-0">
                                      <AvatarImage
                                        src={getTeamLogo(match, true) || "/placeholder.svg?height=40&width=40"}
                                      />
                                      <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-xs">
                                        {getTeamDisplayName(match, true).charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold text-sm truncate min-w-0">
                                      {getTeamDisplayName(match, true)}
                                    </span>
                                  </div>

                                  <div className="text-center px-2 shrink-0 whitespace-nowrap">
                                    {match.status === "completed" || match.status === "finished" ? (
                                      <div className="text-lg font-bold whitespace-nowrap">
                                        {match.home_score} : {match.away_score}
                                      </div>
                                    ) : (
                                      <div className="text-gray-400 font-bold">vs</div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                                    <span className="font-semibold text-sm truncate min-w-0 text-right">
                                      {getTeamDisplayName(match, false)}
                                    </span>
                                    <Avatar className="h-8 w-8 shrink-0">
                                      <AvatarImage
                                        src={getTeamLogo(match, false) || "/placeholder.svg?height=40&width=40"}
                                      />
                                      <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xs">
                                        {getTeamDisplayName(match, false).charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 text-sm text-gray-600">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Calendar className="h-4 w-4 shrink-0" />
                                    {new Date(match.match_date).toLocaleDateString("de-DE", {
                                      weekday: "short",
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })}
                                  </div>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Clock className="h-4 w-4 shrink-0" />
                                    formatTimeWithoutSeconds(match.match_time)
                                  </div>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <MapPin className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{match.venue}</span>
                                  </div>
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isHomeGame(match) ? (
                                      <>
                                        <Home className="h-4 w-4 text-orange-600 shrink-0" />
                                        <span className="text-orange-600 font-medium">Heimspiel</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plane className="h-4 w-4 text-blue-600 shrink-0" />
                                        <span className="text-blue-600 font-medium">Auswärtsspiel</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-end">
                                <Button onClick={() => openMatchDialog(match)} variant="outline" size="sm" className="w-full">
                                  Details
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    }
                  })
              })()}
            </div>
          )}

          <Dialog open={isMatchDialogOpen} onOpenChange={setIsMatchDialogOpen}>
            <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-auto sm:max-w-md max-h-[80dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg">Spiel Details</DialogTitle>
                <DialogDescription className="text-sm">Detaillierte Informationen zum Spiel</DialogDescription>
              </DialogHeader>

              {selectedMatch && (
                <div className="space-y-4">
                  <div className="flex justify-center">{getStatusBadge(selectedMatch.status)}</div>

                  <div className="text-center">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-4">
                      <div className="text-center min-w-0">
                        <Avatar className="h-16 w-16 mx-auto mb-2">
                          <AvatarImage src={getTeamLogo(selectedMatch, true) || "/placeholder.svg?height=64&width=64"} />
                          <AvatarFallback className="bg-orange-100 text-orange-700 font-bold">
                            {getTeamDisplayName(selectedMatch, true).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-semibold text-sm leading-tight break-words">
                          {getTeamDisplayName(selectedMatch, true)}
                        </div>
                      </div>

                      <div className="text-center px-4 whitespace-nowrap">
                        {selectedMatch.status === "completed" || selectedMatch.status === "finished" ? (
                          <div className="text-3xl font-bold whitespace-nowrap">
                            {selectedMatch.home_score} : {selectedMatch.away_score}
                          </div>
                        ) : (
                          <div className="text-2xl text-gray-400 font-bold">vs</div>
                        )}
                      </div>

                      <div className="text-center min-w-0">
                        <Avatar className="h-16 w-16 mx-auto mb-2">
                          <AvatarImage src={getTeamLogo(selectedMatch, false) || "/placeholder.svg?height=64&width=64"} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                            {getTeamDisplayName(selectedMatch, false).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-semibold text-sm leading-tight break-words">
                          {getTeamDisplayName(selectedMatch, false)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 bg-white p-3 rounded-sm-lg border">
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-5 w-5 text-gray-600 shrink-0" />
                      <span>
                        {new Date(selectedMatch.match_date).toLocaleDateString("de-DE", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {selectedEvent?.start_time && (
  <div className="flex items-center gap-3 text-sm">
    <Clock className="h-5 w-5 text-gray-600 shrink-0" />
    <span>{formatTimeWithoutSeconds(selectedEvent.start_time)}</span>
  </div>
)}

                    {selectedEvent?.location && (
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="h-5 w-5 text-gray-600 shrink-0" />
                        <span>{selectedEvent?.location}</span>
                      </div>
                    )}
                    {(selectedEvent?.entry_fee != null || selectedEvent?.max_participants != null) && (
                      <div className="flex items-center gap-3 text-sm">
                        <Users className="h-5 w-5 text-gray-600 shrink-0" />
                        <span>
                          {selectedEvent?.entry_fee != null ? `${selectedEvent?.entry_fee} €` : ""}
                          {selectedEvent?.entry_fee != null && selectedEvent?.max_participants != null ? " • " : ""}
                          {selectedEvent?.max_participants != null ? `Max. ${selectedEvent?.max_participants}` : ""}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="h-5 w-5 text-gray-600 shrink-0" />
                      <span>{formatTimeWithoutSeconds(selectedMatch.match_time)} Uhr</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm min-w-0">
                      <MapPin className="h-5 w-5 text-gray-600 shrink-0" />
                      <span className="truncate">{selectedMatch.venue}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Trophy className="h-5 w-5 text-gray-600 shrink-0" />
                      <span>
                        {selectedMatch.season?.name || "Liga"} - Spieltag {selectedMatch.week_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {isHomeGame(selectedMatch) ? (
                        <>
                          <Home className="h-5 w-5 text-orange-600 shrink-0" />
                          <span className="text-orange-600 font-medium">Heimspiel</span>
                        </>
                      ) : (
                        <>
                          <Plane className="h-5 w-5 text-blue-600 shrink-0" />
                          <span className="text-blue-600 font-medium">Auswärtsspiel</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button variant="outline" size="sm" className="bg-transparent">
                      <Users className="h-4 w-4 mr-2" />
                      Team Details
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
            <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-md max-h-[80dvh] overflow-y-auto">

              <DialogHeader>
                <DialogTitle className="text-lg">Event Details</DialogTitle>
                <DialogDescription className="text-sm">Detaillierte Informationen zum Event</DialogDescription>
              </DialogHeader>

              {selectedEvent && (
                <div className="space-y-4">
                  <div className="flex justify-center">{getEventTypeBadge(selectedEvent.event_type)}</div>

                  <div className="text-center">
                    {selectedEvent.photo_url && (
                      <div className="mb-4">
                        <img
                          src={selectedEvent.photo_url}
                          alt={selectedEvent.name}
                          className="w-full h-44 object-cover rounded-sm-xl border"
                        />
                      </div>
                    )}
                    <div className="mb-4">
                      <div className="h-16 w-16 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-sm-full flex items-center justify-center">
                        {selectedEvent.event_type === "Turnier" ? (
                          <Trophy className="h-8 w-8 text-orange-600" />
                        ) : selectedEvent.event_type === "Geburtstag" ? (
                          <Cake className="h-8 w-8 text-orange-600" />
                        ) : selectedEvent.event_type === "Urlaub" ? (
                          <Sun className="h-8 w-8 text-orange-600" />
                        ) : (
                          <CalendarDays className="h-8 w-8 text-orange-600" />
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{selectedEvent.name}</h3>
                      {selectedEvent.description && <p className="text-gray-600 mt-2">{selectedEvent.description}</p>}
                    </div>
                  </div>

                  <div className="space-y-2 bg-white p-3 rounded-sm-lg border">
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-5 w-5 text-gray-600 shrink-0" />
                      <span>
                        {new Date(selectedEvent.event_date).toLocaleDateString("de-DE", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {selectedEvent.event_type === "Turnier" ? (
                        <>
                          <Trophy className="h-5 w-5 text-purple-600 shrink-0" />
                          <span className="text-purple-600 font-medium">Turnier</span>
                        </>
                      ) : selectedEvent.event_type === "Geburtstag" ? (
                        <>
                          <Cake className="h-5 w-5 text-pink-700 shrink-0" />
                          <span className="text-pink-700 font-medium">Geburtstag</span>
                        </>
                      ) : selectedEvent.event_type === "Urlaub" ? (
                        <>
                          <Sun className="h-5 w-5 text-sky-700 shrink-0" />
                          <span className="text-sky-700 font-medium">Urlaub</span>
                        </>
                      ) : (
                        <>
                          <Star className="h-5 w-5 text-green-600 shrink-0" />
                          <span className="text-green-600 font-medium">Vereinsevent</span>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedEvent?.event_type === "Urlaub" &&
  selectedEvent.vacation_id &&
  currentUserId &&
  selectedEvent.vacation_user_id === currentUserId && (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Button
        variant="outline"
        onClick={() => {
          setIsEventDialogOpen(false)
          setEditingVacationId(selectedEvent.vacation_id || null)
          setVacationStart(selectedEvent.start_date || "")
          setVacationEnd(selectedEvent.end_date || "")
          setVacationNote((selectedEvent.note || selectedEvent.description || "") as string)
          // Name bleibt auto-filled; falls leer, versuchen wir aus dem Titel zu ziehen
          if (!vacationName.trim()) {
            const inferred = (selectedEvent.name || "").replace("🏖️ Urlaub:", "").trim()
            if (inferred) setVacationName(inferred)
          }
          setIsVacationDialogOpen(true)
        }}
        className="w-full"
      >
        Bearbeiten
      </Button>

      <Button
        variant="destructive"
        onClick={() => {
          setConfirmDeleteVacationId(selectedEvent.vacation_id!)
          setIsConfirmDeleteOpen(true)
        }}
        disabled={savingVacation}
        className="w-full"
      >
        Löschen
      </Button>
    </div>
)}
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isMultiItemDialogOpen} onOpenChange={setIsMultiItemDialogOpen}>
            <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-auto sm:max-w-md max-h-[80dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg">
                  Termine am{" "}
                  {selectedDate?.toLocaleDateString("de-DE", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </DialogTitle>
                <DialogDescription className="text-sm">Alle Termine an diesem Tag</DialogDescription>
              </DialogHeader>

              {selectedDate && (
                <div className="space-y-3">
                  {getItemsForDate(selectedDate).map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setIsMultiItemDialogOpen(false)
                        handleItemClick(item)
                      }}
                    >
                      <CardContent className="p-3 overflow-hidden">
                        {isEvent(item) ? (
                            <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="text-sm font-medium truncate">{item.name}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {item.event_type === "Turnier" ? (
                                <Trophy className="h-4 w-4 text-purple-600" />
                              ) : item.event_type === "Geburtstag" ? (
                                <Cake className="h-4 w-4 text-pink-700" />
                              ) : (
                                <CalendarDays className="h-4 w-4 text-green-600" />
                              )}
                              {getEventTypeBadge(item.event_type)}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="text-sm font-medium shrink-0 whitespace-nowrap">
  {formatTimeWithoutSeconds(item.match_time)}
</div>

                             <div className="text-sm break-words min-w-0">

                                {getTeamDisplayName(item, true)} vs {getTeamDisplayName(item, false)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isHomeGame(item) ? (
                                <Home className="h-4 w-4 text-orange-600" />
                              ) : (
                                <Plane className="h-4 w-4 text-blue-600" />
                              )}
                              {getStatusBadge(item.status)}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
            <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-auto sm:max-w-md max-h-[80dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg">Urlaub wirklich löschen?</DialogTitle>
                <DialogDescription className="text-sm">
                  Dieser Eintrag wird dauerhaft entfernt und ist für alle nicht mehr sichtbar.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsConfirmDeleteOpen(false)
                    setConfirmDeleteVacationId(null)
                  }}
                  className="w-full"
                >
                  Abbrechen
                </Button>

                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!confirmDeleteVacationId) return
                    setIsConfirmDeleteOpen(false)
                    const id = confirmDeleteVacationId
                    setConfirmDeleteVacationId(null)
                    await deleteVacation(id)
                  }}
                  disabled={savingVacation || !confirmDeleteVacationId}
                  className="w-full"
                >
                  Löschen
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isVacationDialogOpen} onOpenChange={setIsVacationDialogOpen}>
            <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-auto sm:max-w-md max-h-[80dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg">{editingVacationId ? "Urlaub bearbeiten" : "Urlaub eintragen"}</DialogTitle>
                <DialogDescription className="text-sm">Für alle sichtbar im Vereins-Kalender</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label></Label>
                 
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Von</Label>
                    <Input type="date" value={vacationStart} onChange={(e) => setVacationStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bis</Label>
                    <Input type="date" value={vacationEnd} onChange={(e) => setVacationEnd(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notiz (optional)</Label>
                  <Textarea
                    value={vacationNote}
                    onChange={(e) => setVacationNote(e.target.value)}
                    placeholder="z.B. nicht erreichbar / Vertretung ..."
                  />
                </div>

                <Button
                  onClick={createVacation}
                  disabled={savingVacation || !vacationName.trim() || !vacationStart || !vacationEnd}
                  className="w-full"
                >
                  <Sun className="h-4 w-4 mr-2" />
                  {savingVacation ? "Speichern..." : editingVacationId ? "Änderungen speichern" : "Urlaub speichern"}
                </Button>

                {editingVacationId && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setConfirmDeleteVacationId(editingVacationId)
                      setIsConfirmDeleteOpen(true)
                    }}
                    disabled={savingVacation}
                    className="w-full"
                  >
                    Urlaub löschen
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {isMobileBottomSheetOpen && mobileSelectedDate && (
            <div className="fixed inset-0 z-[999]">
              <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileBottomSheetOpen(false)} />

              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-sm-t-xl max-h-[70dvh] overflow-hidden pb-[calc(env(safe-area-inset-bottom)+5rem)]">
                <div className="flex justify-center py-3">
                  <div className="w-10 h-1 bg-gray-300 rounded-sm-full" />
                </div>

                <div className="px-4 pb-4 border-b">
                  <h3 className="text-lg font-semibold">
                    {mobileSelectedDate.toLocaleDateString("de-DE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {getItemsForDate(mobileSelectedDate).length}{" "}
                    {getItemsForDate(mobileSelectedDate).length === 1 ? "Termin" : "Termine"}
                  </p>
                </div>

                <div className="overflow-y-auto max-h-[50dvh]">
                  <div className="p-4 space-y-3">
                    {getItemsForDate(mobileSelectedDate).map((item) => (
                      <Card
                        key={item.id}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          setIsMobileBottomSheetOpen(false)
                          handleItemClick(item)
                        }}
                      >
                        <CardContent className="p-4">
                          {isEvent(item) ? (
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`p-2 rounded-sm-lg ${
                                    item.event_type === "Turnier"
                                      ? "bg-purple-100"
                                      : item.event_type === "Geburtstag"
                                        ? "bg-pink-100"
                                        : item.event_type === "Urlaub"
                                          ? "bg-sky-100"
                                          : "bg-green-100"
                                  }`}
                                >
                                  {item.event_type === "Turnier" ? (
                                    <Trophy className="h-5 w-5 text-purple-600" />
                                  ) : item.event_type === "Geburtstag" ? (
                                    <Cake className="h-5 w-5 text-pink-700" />
                                  ) : item.event_type === "Urlaub" ? (
                                    <Sun className="h-5 w-5 text-sky-700" />
                                  ) : (
                                    <CalendarDays className="h-5 w-5 text-green-600" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-base truncate">{item.name}</div>
                                  <div className="text-sm text-gray-600">
                                    {item.event_type === "Urlaub"
                                      ? `${item.start_date} bis ${item.end_date}`
                                      : item.event_type === "Geburtstag"
                                        ? ""
                                        : item?.start_time
                                          ? `${normalizeTimeHHMM(item?.start_time)} Uhr`

                                          : ""}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">{getEventTypeBadge(item.event_type)}</div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`p-2 rounded-sm-lg ${isHomeGame(item) ? "bg-orange-100" : "bg-blue-100"}`}>
                                  {isHomeGame(item) ? (
                                    <Home className="h-5 w-5 text-orange-600" />
                                  ) : (
                                    <Plane className="h-5 w-5 text-blue-600" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-base truncate">
                                    {getTeamDisplayName(item, true)} vs {getTeamDisplayName(item, false)}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {formatTimeWithoutSeconds((item as any).match_time)} Uhr

                                    {item.season?.name && ` • ${item.season.name}`}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">{getStatusBadge(item.status)}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}