"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Euro,
  LockKeyhole,
  Loader2,
  MapPin,
  Play,
  RefreshCw,
  Search,
  Target,
  Trash2,
  Trophy,
  UserPlus,
  UsersRound,
  Users,
  X,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getPlayerEligibilityFromMap, loadEligibilityMapData, type PlayerEligibility } from "./einzelturnier/einzelturnier-berechtigungen"
import { loadCentralEventForSetup, markCentralEventStarted, syncCentralEventRegistrations } from "./einzelturnier/einzelturnier-central-event"
import { buildDkoStartRoute, buildTournamentContinueRoute, createTournamentIdCompat } from "./einzelturnier/einzelturnier-engine"

type EventStatus = "draft" | "open" | "closed" | "ready" | "started" | "completed" | "cancelled"
type AccessType = "public" | "club_internal" | "club_external"
type RegistrationStatus = "registered" | "waitlist" | "withdrawn"
type StartMode = "dko" | "round_robin" | "kratzer" | "survival" | "survival_single"
type TeamMode = "single" | "fixed" | "drawn"

type CentralEvent = {
  id: string
  source_event_id: string | null
  is_spontaneous: boolean
  title: string
  event_date: string
  start_time: string | null
  location: string | null
  registration_deadline: string | null
  max_participants: number | null
  entry_fee: number
  access_type: AccessType
  status: EventStatus
  selected_mode: StartMode | null
  created_at: string
}

type CentralRegistration = {
  id: string
  event_id: string
  player_id: string | null
  player_name_snapshot: string
  status: RegistrationStatus
  paid: boolean
  source: "admin" | "member" | "public" | "terminal"
  note: string | null
  registered_at: string
  public_registration_id?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  entry_no: number
}

type CentralDoubleTeam = {
  id: string
  event_id: string
  team_mode: "fixed" | "drawn"
  position: number
  registration1_id: string
  registration2_id: string
  team_name: string
}

type Player = {
  id: string
  name: string
  verein: string | null
  ligastatus: string | null
  geschlecht: string | null
}

type PlannedEvent = {
  id: string
  name: string
  is_emd_organizer: boolean | null
  start_date: string
  end_date: string
  event_time: string | null
  location: string | null
  entry_fee: number | null
  max_participants: number | null
  access_type: AccessType | "club" | null
  event_type: string
}


function normalizePlayerName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  const current = new Array<number>(b.length + 1)

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      )
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j]
  }

  return previous[b.length]
}

function playerNameSimilarity(sourceName: string, candidateName: string) {
  const source = normalizePlayerName(sourceName)
  const candidate = normalizePlayerName(candidateName)

  if (!source || !candidate) return 0
  if (source === candidate) return 1
  if (source.includes(candidate) || candidate.includes(source)) return 0.94

  const sourceTokens = source.split(" ").filter(Boolean)
  const candidateTokens = candidate.split(" ").filter(Boolean)
  const candidateSet = new Set(candidateTokens)
  const shared = sourceTokens.filter((token) => candidateSet.has(token)).length
  const shorterTokenCount = Math.max(1, Math.min(sourceTokens.length, candidateTokens.length))
  const tokenCoverage = shared / shorterTokenCount

  const distance = levenshteinDistance(source, candidate)
  const charSimilarity = 1 - distance / Math.max(source.length, candidate.length, 1)

  const firstTokenBonus =
    sourceTokens[0] && candidateTokens[0] && sourceTokens[0] === candidateTokens[0] ? 0.08 : 0
  const lastTokenBonus =
    sourceTokens.at(-1) &&
    candidateTokens.at(-1) &&
    sourceTokens.at(-1) === candidateTokens.at(-1)
      ? 0.12
      : 0

  return Math.min(
    1,
    Math.max(
      charSimilarity,
      tokenCoverage * 0.86 + firstTokenBonus + lastTokenBonus,
    ),
  )
}

const ACCESS_LABELS: Record<AccessType, string> = {
  public: "Öffentlich",
  club_internal: "Vereinsintern",
  club_external: "Vereins-Auswärts",
}

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Entwurf",
  open: "Anmeldung offen",
  closed: "Anmeldung geschlossen",
  ready: "Startbereit",
  started: "Gestartet",
  completed: "Abgeschlossen",
  cancelled: "Abgesagt",
}

const MODE_LABELS: Record<StartMode, string> = {
  dko: "Doppel-KO",
  round_robin: "Round Robin",
  kratzer: "Kratzer",
  survival: "Survival Roulette",
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return "Datum offen"
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

const formatTime = (value: string | null | undefined) => {
  if (!value) return null
  return value.slice(0, 5)
}

const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const shortPlayerName = (value: string) => {
  const clean = value.replace(/\s\[(\d+)\]$/, "").trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return clean
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`
}

const buildDoubleTeamName = (a: string, b: string) =>
  `${shortPlayerName(a)} / ${shortPlayerName(b)}`

type CentralTournamentRegistrationHubProps = {
  initialEventId?: string | null
}

export function CentralTournamentRegistrationHub({ initialEventId = null }: CentralTournamentRegistrationHubProps) {
  const router = useRouter()

  const [events, setEvents] = useState<CentralEvent[]>([])
  const [plannedEvents, setPlannedEvents] = useState<PlannedEvent[]>([])
  const [registrations, setRegistrations] = useState<CentralRegistration[]>([])
  const [players, setPlayers] = useState<Player[]>([])

  const [selectedEventId, setSelectedEventId] = useState("")
  const [activeTab, setActiveTab] = useState<"planned" | "today" | "past" | "event">("planned")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [startingMode, setStartingMode] = useState<StartMode | null>(null)
  const startClickLock = useRef(false)
  const [newEventMode, setNewEventMode] = useState<StartMode | "">("")
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [playerSearch, setPlayerSearch] = useState("")
  const [registrationSearch, setRegistrationSearch] = useState("")
  const [registrationFilter, setRegistrationFilter] = useState<"all" | RegistrationStatus>("all")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [visiblePlayerCount, setVisiblePlayerCount] = useState(18)
  const [eligibilityByPlayerId, setEligibilityByPlayerId] = useState<Record<string, PlayerEligibility>>({})
  const [eligibilityLoading, setEligibilityLoading] = useState(false)
  const [allowDoubleEntry, setAllowDoubleEntry] = useState(false)
  const [teamMode, setTeamMode] = useState<TeamMode>("single")
  // Survival verwendet eigenständige Einstellungen, keine DKO-Doppelnennungen.
  const [survivalMachines, setSurvivalMachines] = useState(5)
  const [survivalVariant, setSurvivalVariant] = useState<"survival" | "survival_single">("survival")
  const [doubleTeams, setDoubleTeams] = useState<CentralDoubleTeam[]>([])
  const [fixedPlayer1RegistrationId, setFixedPlayer1RegistrationId] = useState("")
  const [fixedPlayer2RegistrationId, setFixedPlayer2RegistrationId] = useState("")

  useEffect(() => {
    if (!selectedEventId) return
    try {
      const raw = window.localStorage.getItem(`emd-survival-rules:${selectedEventId}`)
      const settings = raw ? JSON.parse(raw) : {}
      setSurvivalMachines(Number.isInteger(settings.machines) && settings.machines >= 1 && settings.machines <= 32 ? settings.machines : 5)
    } catch {
      setSurvivalMachines(5)
    }
  }, [selectedEventId])

  useEffect(() => {
    setVisiblePlayerCount(18)
  }, [playerSearch, selectedEventId])
  // Die gewählte Survival-Variante darf beim Nachladen der Anmeldungen nicht verloren gehen.
  // Nur ein tatsächlicher Eventwechsel lädt die Einstellung neu.
  useEffect(() => {
    if (!selectedEventId) return
    const current = events.find((event) => event.id === selectedEventId)
    if (!current) return
    if (current.selected_mode === "survival_single") {
      setSurvivalVariant("survival_single")
      return
    }
    try {
      const saved = window.localStorage.getItem(`emd-survival-variant:${selectedEventId}`)
      setSurvivalVariant(saved === "survival_single" ? "survival_single" : "survival")
    } catch {
      setSurvivalVariant("survival")
    }
  }, [selectedEventId])


  useEffect(() => {
    const event = events.find((item) => item.id === selectedEventId)
    if (!event) return
    if ((event.selected_mode === "survival" || event.selected_mode === "survival_single")) {
      setAllowDoubleEntry(false)
      setTeamMode("single")
      return
    }

    try {
      const stored = window.localStorage.getItem(`emd-central-rules:${event.id}`)
      if (!stored) {
        setAllowDoubleEntry(false)
        setTeamMode("single")
        return
      }
      const parsed = JSON.parse(stored) as { allowDoubleEntry?: boolean; doubleMode?: boolean; teamMode?: TeamMode }
      setAllowDoubleEntry(Boolean(parsed.allowDoubleEntry))
      setTeamMode(parsed.teamMode || (parsed.doubleMode ? "fixed" : "single"))
    } catch {
      setAllowDoubleEntry(false)
      setTeamMode("single")
    }
  }, [events, selectedEventId])

  useEffect(() => {
    if (!selectedEventId) return
    window.localStorage.setItem(
      `emd-central-rules:${selectedEventId}`,
      JSON.stringify({ allowDoubleEntry, teamMode }),
    )
  }, [selectedEventId, allowDoubleEntry, teamMode])

  useEffect(() => {
    if (!selectedEventId) {
      setDoubleTeams([])
      return
    }

    let cancelled = false
    supabase
      .from("central_tournament_double_teams")
      .select("id,event_id,team_mode,position,registration1_id,registration2_id,team_name")
      .eq("event_id", selectedEventId)
      .order("position", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error("central double teams load failed:", error)
          setDoubleTeams([])
          return
        }
        setDoubleTeams((data || []) as CentralDoubleTeam[])
      })

    return () => { cancelled = true }
  }, [selectedEventId])

  useEffect(() => {
    const event = events.find((item) => item.id === selectedEventId)
    if (!event || event.access_type === "public") {
      setEligibilityByPlayerId({})
      setEligibilityLoading(false)
      return
    }

    let cancelled = false
    setEligibilityLoading(true)
    loadEligibilityMapData(event.access_type)
      .then((map) => { if (!cancelled) setEligibilityByPlayerId(map) })
      .catch((error) => {
        console.error("central tournament eligibility load failed:", error)
        if (!cancelled) setEligibilityByPlayerId({})
      })
      .finally(() => { if (!cancelled) setEligibilityLoading(false) })

    return () => { cancelled = true }
  }, [events, selectedEventId])

  useEffect(() => {
    if (!message || message.type !== "success") return
    const timer = window.setTimeout(() => setMessage(null), 2600)
    return () => window.clearTimeout(timer)
  }, [message])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setMessage(null)
      setSchemaMissing(false)

      const [plannedResult, playerResult] = await Promise.all([
        supabase
          .from("events")
          .select("id,name,start_date,end_date,event_time,location,entry_fee,max_participants,access_type,event_type,is_emd_organizer")
          .eq("event_type", "tournament")
          .eq("is_emd_organizer", true)
          .order("start_date", { ascending: true }),
        supabase
          .from("spieldatenbank")
          .select("id,name,verein,ligastatus,geschlecht")
          .order("name", { ascending: true }),
      ])

      if (plannedResult.error) throw plannedResult.error
      if (playerResult.error) throw playerResult.error

      const loadedPlanned = (plannedResult.data || []) as PlannedEvent[]
      setPlannedEvents(loadedPlanned)
      setPlayers((playerResult.data || []) as Player[])

      // Bestehende Veranstaltungen sind Master:
      // Für jedes geplante Turnier wird nur eine zentrale Anmelde-Hülle gespiegelt.
      // Route/Funktionen der Veranstaltungsverwaltung bleiben unangetastet.
      if (loadedPlanned.length > 0) {
        const today = new Date().toISOString().slice(0, 10)

        const { data: existingCentralRows, error: existingCentralError } = await supabase
          .from("central_tournament_events")
          .select("source_event_id,status")
          .not("source_event_id", "is", null)

        if (existingCentralError) throw existingCentralError

        const existingStatusBySource = new Map(
          (existingCentralRows || []).map((row: any) => [String(row.source_event_id), String(row.status)]),
        )

        const protectedStatuses = new Set(["started", "ready", "cancelled", "completed"])

        const mirrorRows = loadedPlanned.map((event) => {
          const currentStatus = existingStatusBySource.get(event.id)
          const mirroredStatus = protectedStatuses.has(currentStatus || "")
            ? currentStatus
            : event.start_date < today
              ? "completed"
              : "open"

          return {
            source_event_id: event.id,
            is_spontaneous: false,
            title: event.name,
            event_date: event.start_date,
            start_time: event.event_time || null,
            location: event.location || null,
            max_participants: event.max_participants || null,
            entry_fee: Number(event.entry_fee || 0),
            access_type:
              event.access_type === "club_internal" || event.access_type === "club_external" || event.access_type === "public"
                ? event.access_type
                : event.access_type === "club"
                  ? "club_internal"
                  : "public",
            status: mirroredStatus,
          }
        })

        const { error: mirrorError } = await supabase
          .from("central_tournament_events")
          .upsert(mirrorRows, { onConflict: "source_event_id" })

        if (mirrorError) {
          const code = String((mirrorError as any)?.code || "")
          const text = String((mirrorError as any)?.message || "")
          if (code === "42P01" || code === "PGRST205" || text.includes("central_tournament_")) {
            setSchemaMissing(true)
            setEvents([])
            setRegistrations([])
            return
          }
          throw mirrorError
        }
      }

      const [eventResult, registrationResult] = await Promise.all([
        supabase
          .from("central_tournament_events")
          .select("*")
          .order("event_date", { ascending: true })
          .order("start_time", { ascending: true }),
        supabase
          .from("central_tournament_registrations")
          .select("*")
          .order("registered_at", { ascending: true }),
      ])

      const firstError = eventResult.error || registrationResult.error
      if (firstError) {
        const code = String((firstError as any)?.code || "")
        const text = String((firstError as any)?.message || "")
        if (code === "42P01" || code === "PGRST205" || text.includes("central_tournament_")) {
          setSchemaMissing(true)
          setEvents([])
          setRegistrations([])
          return
        }
        throw firstError
      }

      const allowedSourceIds = new Set(loadedPlanned.map((event) => event.id))
      const loadedEvents = ((eventResult.data || []) as CentralEvent[]).filter(
        (event) => event.is_spontaneous || !event.source_event_id || allowedSourceIds.has(event.source_event_id),
      )

      setEvents(loadedEvents)

      const allowedCentralIds = new Set(loadedEvents.map((event) => event.id))
      setRegistrations(
        ((registrationResult.data || []) as CentralRegistration[]).filter((row) =>
          allowedCentralIds.has(row.event_id),
        ),
      )

      setSelectedEventId((current) => {
        if (current && loadedEvents.some((event) => event.id === current)) return current

        const today = new Date().toISOString().slice(0, 10)
        const preferred =
          loadedEvents.find((event) => event.event_date >= today && !["completed", "cancelled"].includes(event.status)) ||
          loadedEvents[0]

        return preferred?.id || ""
      })
    } catch (error: any) {
      console.error("central tournament hub load failed:", error)
      setMessage({ type: "error", text: error?.message || "Turnier-Anmeldungen konnten nicht geladen werden." })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!initialEventId || events.length === 0) return
    const exists = events.some((event) => event.id === initialEventId)
    if (!exists) return

    setSelectedEventId(initialEventId)
    setActiveTab("event")
  }, [initialEventId, events])


  useEffect(() => {
    if (schemaMissing || events.length === 0) return

    const visibleEventIds = new Set(events.map((event) => event.id))

    const channel = supabase
      .channel("central-tournament-registrations-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "central_tournament_registrations",
        },
        (payload) => {
          const eventType = payload.eventType
          const newRow = payload.new as CentralRegistration
          const oldRow = payload.old as Partial<CentralRegistration>

          setRegistrations((current) => {
            if (eventType === "DELETE") {
              return current.filter((row) => row.id !== oldRow.id)
            }

            if (!newRow?.id) return current

            if (!visibleEventIds.has(newRow.event_id)) {
              return current.filter((row) => row.id !== newRow.id)
            }

            const index = current.findIndex((row) => row.id === newRow.id)

            if (index === -1) {
              return [...current, newRow].sort(
                (a, b) =>
                  new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime(),
              )
            }

            const next = [...current]
            next[index] = newRow
            return next
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [events, schemaMissing])

  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players])

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId],
  )

  const todayKey = new Date().toISOString().slice(0, 10)

  const selectedEventIsPast = Boolean(
    selectedEvent && (selectedEvent.event_date < todayKey || ["completed", "cancelled"].includes(selectedEvent.status)),
  )

  // Laufende, abgesagte und abgeschlossene Turniere sind hier nur lesbar.
  const selectedEventLocked = Boolean(selectedEvent && ["started", "completed", "cancelled"].includes(selectedEvent.status))

  const selectedRegistrations = useMemo(
    () => registrations.filter((row) => row.event_id === selectedEventId),
    [registrations, selectedEventId],
  )

  const registeredRows = selectedRegistrations.filter((row) => row.status === "registered")
  const waitlistRows = selectedRegistrations.filter((row) => row.status === "waitlist")
  const withdrawnRows = selectedRegistrations.filter((row) => row.status === "withdrawn")
  // Nur bestätigte Nennungen dürfen eine Auslosung starten. Warteliste und Abmeldungen sind ausgeschlossen.
  const unpaidRegisteredRows = selectedEvent && Number(selectedEvent.entry_fee || 0) > 0
    ? registeredRows.filter((row) => !row.paid)
    : []
  const unresolvedRegisteredRows = registeredRows.filter((row) => !row.player_id)
  const selectedStartMode = selectedEvent?.selected_mode === "survival"
    ? survivalVariant
    : (selectedEvent?.selected_mode || newEventMode)

  const startBlockers = [
    ...(!selectedStartMode ? ["Bitte zuerst einen Spielmodus auswählen."] : []),
    ...(registeredRows.length < 2 ? ["Mindestens 2 angemeldete Spieler erforderlich."] : []),
    ...(unresolvedRegisteredRows.length ? [`${unresolvedRegisteredRows.length} Spieler ohne eindeutige Zuordnung.`] : []),
    ...(unpaidRegisteredRows.length ? [`${unpaidRegisteredRows.length} Zahlung${unpaidRegisteredRows.length === 1 ? "" : "en"} offen.`] : []),
    ...(selectedStartMode === "survival_single" && (registeredRows.length < 4 || registeredRows.length % 2 !== 0)
      ? [`Survival Einzel benötigt mindestens 4 und eine gerade Spielerzahl (aktuell ${registeredRows.length}).`] : []),
    ...(selectedStartMode === "survival" && (registeredRows.length < 4 || registeredRows.length % 4 !== 0)
      ? [`Survival benötigt 4, 8, 12, 16 … Spieler (aktuell ${registeredRows.length}).`] : []),
  ]
  const canStartSelectedEvent = !selectedEventIsPast && !selectedEventLocked && !startingMode && !!selectedStartMode && startBlockers.length === 0

  const activePlayerIds = new Set(
    selectedRegistrations
      .filter((row) => row.status !== "withdrawn" && !!row.player_id)
      .map((row) => row.player_id as string),
  )


  const similarPlayersForRegistration = (row: CentralRegistration) =>
    players
      .filter((candidate) => !activePlayerIds.has(candidate.id))
      .map((candidate) => ({
        player: candidate,
        similarity: playerNameSimilarity(row.player_name_snapshot, candidate.name),
      }))
      .filter((candidate) => candidate.similarity >= 0.52)
      .sort((a, b) => b.similarity - a.similarity || a.player.name.localeCompare(b.player.name, "de"))
      .slice(0, 5)

  const filteredPlayers = useMemo(() => {
    const q = normalize(playerSearch)
    return players
      .filter((player) => allowDoubleEntry || !activePlayerIds.has(player.id))
      .filter((player) => {
        if (!q) return true
        return normalize(
          [player.name, player.verein, player.ligastatus]
            .filter(Boolean)
            .join(" "),
        ).includes(q)
      })
      .slice(0, 120)
  }, [players, playerSearch, selectedRegistrations, allowDoubleEntry])

  const filteredRegistrationRows = useMemo(() => {
    const q = normalize(registrationSearch)
    return selectedRegistrations.filter((row) => {
      if (registrationFilter !== "all" && row.status !== registrationFilter) return false
      if (!q) return true
      const player = row.player_id ? playerById.get(row.player_id) : undefined
      return normalize(
        [row.player_name_snapshot, player?.verein, player?.ligastatus, row.status]
          .filter(Boolean)
          .join(" "),
      ).includes(q)
    })
  }, [selectedRegistrations, registrationSearch, registrationFilter, playerById])

  const upcomingCount = events.filter((event) => {
    const today = new Date().toISOString().slice(0, 10)
    return event.event_date >= today && !["completed", "cancelled"].includes(event.status)
  }).length

  const totalOpenRegistrations = registrations.filter((row) => row.status === "registered").length

  const plannedEventsList = events.filter(
    (event) => event.event_date > todayKey && !["completed", "cancelled"].includes(event.status),
  )

  const todayEventsList = events.filter(
    (event) => event.event_date === todayKey && event.status !== "cancelled",
  )

  const pastEventsList = events
    .filter((event) => event.event_date < todayKey || ["completed", "cancelled"].includes(event.status))
    .sort((a, b) => {
      const dateCompare = b.event_date.localeCompare(a.event_date)
      if (dateCompare !== 0) return dateCompare
      return String(b.start_time || "").localeCompare(String(a.start_time || ""))
    })

  const visibleOverviewEvents =
    activeTab === "today"
      ? todayEventsList
      : activeTab === "past"
        ? pastEventsList
        : plannedEventsList


  const cancelSelectedEvent = async () => {
    if (!selectedEvent || selectedEvent.is_spontaneous || ["started", "completed", "cancelled"].includes(selectedEvent.status)) return

    try {
      setSaving(true)
      setMessage(null)

      const { data: linkedKratzer, error: linkedKratzerError } = await supabase
        .from("kratzer_tournaments")
        .select("id")
        .eq("central_event_id", selectedEvent.id)
        .eq("status", "running")
        .limit(1)
      if (linkedKratzerError) throw linkedKratzerError
      if (linkedKratzer?.length) throw new Error("Ein Kratzer-Turnier läuft bereits. Absagen ist gesperrt.")

      const { error } = await supabase
        .from("central_tournament_events")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", selectedEvent.id)

      if (error) throw error

      setDeleteConfirmOpen(false)
      setSelectedEventId("")
      setActiveTab("past")
      await load()
      setMessage({ type: "success", text: `${selectedEvent.title} wurde als abgesagt markiert. Die Veranstaltung selbst bleibt erhalten.` })
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Turnier konnte nicht abgesagt werden." })
    } finally {
      setSaving(false)
    }
  }

  const deleteSelectedEvent = async () => {
    if (!selectedEvent || !selectedEvent.is_spontaneous || ["started", "completed"].includes(selectedEvent.status)) return

    const eventId = selectedEvent.id
    try {
      setSaving(true)
      setMessage(null)

      // Prüfe nochmals in Supabase: keine Löschung bei zwischenzeitlich gestartetem Turnier.
      const { data: freshEvent, error: freshError } = await supabase
        .from("central_tournament_events")
        .select("id,title,status,is_spontaneous")
        .eq("id", eventId).maybeSingle()
      if (freshError) throw freshError
      if (!freshEvent || !freshEvent.is_spontaneous || ["started", "completed"].includes(freshEvent.status)) {
        throw new Error("Der Turnierstatus hat sich geändert. Bitte neu laden; es wurde nichts gelöscht.")
      }
      const { data: activeLink, error: linkError } = await supabase
        .from("tournaments_status")
        .select("tournament_id").eq("central_event_id", eventId).eq("status", "active").limit(1)
      if (linkError) throw linkError
      if (activeLink?.length) throw new Error("Es existiert ein laufendes Turnier. Löschen gesperrt.")
      const { data: runningKratzer, error: runningKratzerError } = await supabase
        .from("kratzer_tournaments")
        .select("id")
        .eq("central_event_id", eventId)
        .eq("status", "running")
        .limit(1)
      if (runningKratzerError) throw runningKratzerError
      if (runningKratzer?.length) throw new Error("Ein Kratzer-Turnier läuft bereits. Löschen ist gesperrt.")

      // Der FK auf event_id entfernt ausschließlich Anmeldungen dieses Events.
      // Ein Löschen des Events mit ON DELETE CASCADE erledigt diese Zuordnung atomar.
      const { data: deleted, error: centralDeleteError } = await supabase
        .from("central_tournament_events")
        .delete()
        .eq("id", eventId)
        .eq("is_spontaneous", true)
        .eq("status", freshEvent.status)
        .select("id")
      if (centralDeleteError) throw centralDeleteError
      if (deleted?.length !== 1) throw new Error("Turnier konnte nicht eindeutig gelöscht werden. Bitte neu laden.")

      setDeleteConfirmOpen(false)
      setSelectedEventId("")
      setActiveTab("planned")
      await load()
      setMessage({ type: "success", text: `${freshEvent.title} und nur dessen eigene Anmeldungen wurden gelöscht.` })
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Turnier konnte nicht gelöscht werden." })
    } finally {
      setSaving(false)
    }
  }

  const updateSelectedAccessType = async (nextAccessType: AccessType) => {
    if (!selectedEvent || selectedEventIsPast || selectedEventLocked || saving) return

    try {
      setSaving(true)
      setMessage(null)

      const { error: centralError } = await supabase
        .from("central_tournament_events")
        .update({ access_type: nextAccessType, updated_at: new Date().toISOString() })
        .eq("id", selectedEvent.id)

      if (centralError) throw centralError

      if (selectedEvent.source_event_id) {
        const { error: sourceError } = await supabase
          .from("events")
          .update({ access_type: nextAccessType, updated_at: new Date().toISOString() })
          .eq("id", selectedEvent.source_event_id)

        if (sourceError) throw sourceError
      }

      await load()
      setMessage({ type: "success", text: `Teilnahme auf ${ACCESS_LABELS[nextAccessType]} gesetzt.` })
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Turnierart konnte nicht geändert werden." })
    } finally {
      setSaving(false)
    }
  }

  const setEventStatus = async (status: EventStatus) => {
    if (!selectedEvent || selectedEventLocked) return

    try {
      setSaving(true)
      setMessage(null)

      const { error } = await supabase
        .from("central_tournament_events")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", selectedEvent.id)

      if (error) throw error

      await load()
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Status konnte nicht geändert werden." })
    } finally {
      setSaving(false)
    }
  }

  const markAllRegisteredPaid = async () => {
    if (!selectedEvent || selectedEventIsPast || selectedEventLocked || registeredRows.length === 0) return

    try {
      setSaving(true)
      setMessage(null)

      const { error } = await supabase
        .from("central_tournament_registrations")
        .update({ paid: true, updated_at: new Date().toISOString() })
        .eq("event_id", selectedEvent.id)
        .eq("status", "registered")

      if (error) throw error
      await load()
      setMessage({ type: "success", text: "Alle angemeldeten Spieler wurden als bezahlt markiert." })
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Zahlungsstatus konnte nicht aktualisiert werden." })
    } finally {
      setSaving(false)
    }
  }

  const playerEligibility = (player: Player) => {
    if (!selectedEvent) return { eligible: false, reason: "Kein Turnier ausgewählt" }
    return getPlayerEligibilityFromMap({
      playerId: player.id,
      accessType: selectedEvent.access_type,
      eligibilityByPlayerId,
      eligibilityLoading,
    })
  }

  const addPlayer = async (player: Player) => {
    if (!selectedEvent || selectedEventIsPast || selectedEventLocked) return

    const eligibility = playerEligibility(player)
    if (!eligibility.eligible) {
      setMessage({ type: "error", text: `${player.name}: ${eligibility.reason || "Nicht teilnahmeberechtigt"}.` })
      return
    }

    const playerRows = selectedRegistrations
      .filter((row) => row.player_id === player.id)
      .sort((a, b) => Number(a.entry_no || 1) - Number(b.entry_no || 1))
    const activeRows = playerRows.filter((row) => row.status !== "withdrawn")
    const reusableWithdrawn = playerRows.find((row) => row.status === "withdrawn" && Number(row.entry_no || 1) === 1)

    if (activeRows.length > 0 && !allowDoubleEntry) {
      setMessage({ type: "error", text: `${player.name} ist bereits angemeldet. Aktiviere „Doppelnennung“, wenn derselbe Spieler ein zweites Mal starten soll.` })
      return
    }

    const limit = selectedEvent.max_participants || null
    const shouldWaitlist = Boolean(limit && registeredRows.length >= limit)
    const status: RegistrationStatus = shouldWaitlist ? "waitlist" : "registered"

    try {
      setSaving(true)
      setMessage(null)

      if (activeRows.length === 0 && reusableWithdrawn) {
        const { error } = await supabase
          .from("central_tournament_registrations")
          .update({
            player_name_snapshot: player.name,
            status,
            paid: false,
            source: "admin",
            updated_at: new Date().toISOString(),
          })
          .eq("id", reusableWithdrawn.id)
        if (error) throw error
      } else {
        const nextEntryNo = allowDoubleEntry && activeRows.length > 0
          ? Math.max(...playerRows.map((row) => Number(row.entry_no || 1)), 1) + 1
          : 1
        const displayName = nextEntryNo > 1 ? `${player.name} [${nextEntryNo}]` : player.name

        const { error } = await supabase
          .from("central_tournament_registrations")
          .insert({
            event_id: selectedEvent.id,
            player_id: player.id,
            player_name_snapshot: displayName,
            entry_no: nextEntryNo,
            status,
            paid: false,
            source: "admin",
            registered_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (error) throw error
      }

      await load()
      setMessage({
        type: "success",
        text: activeRows.length > 0 && allowDoubleEntry
          ? `${player.name} wurde als weitere Nennung hinzugefügt.`
          : shouldWaitlist
            ? `${player.name} wurde auf die Warteliste gesetzt.`
            : `${player.name} wurde angemeldet.`,
      })
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Spieler konnte nicht angemeldet werden." })
    } finally {
      setSaving(false)
    }
  }

  const updateRegistration = async (
    row: CentralRegistration,
    patch: Partial<Pick<CentralRegistration, "status" | "paid">>,
  ) => {
    if (selectedEventIsPast || selectedEventLocked) return

    try {
      setSaving(true)
      setMessage(null)

      const { error } = await supabase
        .from("central_tournament_registrations")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", row.id)

      if (error) throw error

      await load()
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Anmeldung konnte nicht geändert werden." })
    } finally {
      setSaving(false)
    }
  }

  const assignRegistrationPlayer = async (row: CentralRegistration, playerId: string) => {
    if (selectedEventIsPast || selectedEventLocked) return

    const player = playerById.get(playerId)
    if (!player) return

    const allowedCandidate = similarPlayersForRegistration(row).some(
      (candidate) => candidate.player.id === playerId,
    )

    if (!allowedCandidate) {
      setMessage({
        type: "error",
        text: "Diese Zuordnung wurde aus Sicherheitsgründen nicht zugelassen. Es können nur ausreichend ähnliche Spielerdatenbank-Treffer gewählt werden.",
      })
      return
    }

    try {
      setSaving(true)
      setMessage(null)

      const { error } = await supabase
        .from("central_tournament_registrations")
        .update({
          player_id: player.id,
          player_name_snapshot: player.name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)

      if (error) throw error

      await load()
      setMessage({ type: "success", text: `${row.player_name_snapshot} wurde ${player.name} zugeordnet.` })
    } catch (error: any) {
      const text = String(error?.message || "")
      setMessage({
        type: "error",
        text: text.toLowerCase().includes("duplicate")
          ? "Dieser Spieler ist bei diesem Turnier bereits angemeldet."
          : text || "Spieler konnte nicht zugeordnet werden.",
      })
    } finally {
      setSaving(false)
    }
  }

  const prepareKratzer = async () => {
    if (!selectedEvent) return

    // Sicherheitsprüfung auch bei Aufruf über andere UI-Wege und nach zwischenzeitlichen Änderungen.
    const { data: latestEvent, error: eventCheckError } = await supabase
      .from("central_tournament_events")
      .select("id,status,entry_fee,selected_mode")
      .eq("id", selectedEvent.id).single()
    if (eventCheckError || !latestEvent) {
      setMessage({ type: "error", text: "Turnierstatus konnte nicht kontrolliert werden. Bitte neu laden." })
      return
    }
    if (latestEvent.status === "started" || latestEvent.status === "completed" || latestEvent.status === "cancelled") {
      setMessage({ type: "error", text: "Das Turnier wurde bereits gestartet oder beendet. Bitte die Zentrale neu laden." })
      return
    }
    const { data: latestRegistrations, error: registrationCheckError } = await supabase
      .from("central_tournament_registrations")
      .select("id,status,paid,player_id")
      .eq("event_id", selectedEvent.id)
    if (registrationCheckError || !latestRegistrations) {
      setMessage({ type: "error", text: "Anmeldungen konnten nicht aktuell geprüft werden. Bitte erneut versuchen." })
      return
    }
    const latestActive = latestRegistrations.filter((row) => row.status === "registered")
    const localActive = selectedRegistrations.filter((row) => row.status === "registered")
    if (latestActive.length !== localActive.length || latestActive.some((row) => {
      const old = localActive.find((candidate) => candidate.id === row.id)
      return !old || old.paid !== row.paid || old.player_id !== row.player_id
    })) {
      setMessage({ type: "error", text: "Die Teilnehmer oder Zahlungen wurden inzwischen geändert. Bitte Turnier neu öffnen und erneut prüfen." })
      return
    }
    if (Number(latestEvent.entry_fee || 0) > 0 && latestActive.some((row) => !row.paid)) {
      setMessage({ type: "error", text: "Start gesperrt: Nicht alle angemeldeten Teilnehmer haben bezahlt." })
      return
    }
    const active = localActive
    if (active.length < 2) {
      throw new Error("Für Kratzer müssen mindestens 2 Spieler angemeldet sein.")
    }

    const unresolved = active.filter((row) => !row.player_id)
    if (unresolved.length > 0) {
      throw new Error(
        `${unresolved.length} öffentliche Anmeldung${unresolved.length === 1 ? "" : "en"} ist noch keinem Spieler aus der Spielerdatenbank zugeordnet. Bitte zuerst in der Anmeldeliste zuordnen.`,
      )
    }

    // Die Kratzer-Seite lädt die Spieler anhand der centralEventId direkt aus
    // central_tournament_registrations. Keine globale Anmeldung überschreiben
    // und keine Einträge aus anderen Turnieren oder Serien löschen.
    const duplicateIds = new Set<string>()
    for (const row of active) {
      if (!row.player_id || duplicateIds.has(row.player_id)) {
        throw new Error("Kratzer benötigt eindeutig zugeordnete Spieler ohne Doppelnennungen.")
      }
      duplicateIds.add(row.player_id)
    }

  }

  const reloadDoubleTeams = async () => {
    if (!selectedEvent) return [] as CentralDoubleTeam[]
    const { data, error } = await supabase
      .from("central_tournament_double_teams")
      .select("id,event_id,team_mode,position,registration1_id,registration2_id,team_name")
      .eq("event_id", selectedEvent.id)
      .order("position", { ascending: true })
    if (error) throw error
    const rows = (data || []) as CentralDoubleTeam[]
    setDoubleTeams(rows)
    return rows
  }

  const addFixedDoubleTeam = async () => {
    if (!selectedEvent || selectedEventIsPast || !fixedPlayer1RegistrationId || !fixedPlayer2RegistrationId) return
    if (fixedPlayer1RegistrationId === fixedPlayer2RegistrationId) {
      setMessage({ type: "error", text: "Für ein Doppel müssen zwei verschiedene Nennungen gewählt werden." })
      return
    }

    const first = registeredRows.find((row) => row.id === fixedPlayer1RegistrationId)
    const second = registeredRows.find((row) => row.id === fixedPlayer2RegistrationId)
    if (!first || !second) {
      setMessage({ type: "error", text: "Die gewählten Spieler sind nicht mehr im Teilnehmerfeld." })
      return
    }

    try {
      setSaving(true)
      setMessage(null)

      let currentTeams = doubleTeams
      if (currentTeams.some((team) => team.team_mode !== "fixed")) {
        const { error: clearOtherModeError } = await supabase
          .from("central_tournament_double_teams")
          .delete()
          .eq("event_id", selectedEvent.id)
        if (clearOtherModeError) throw clearOtherModeError
        currentTeams = []
        setDoubleTeams([])
      }

      const used = new Set(currentTeams.flatMap((team) => [team.registration1_id, team.registration2_id]))
      if (used.has(first.id) || used.has(second.id)) {
        setMessage({ type: "error", text: "Eine dieser Nennungen ist bereits einem fixen Doppel zugeordnet." })
        return
      }

      const { error } = await supabase.from("central_tournament_double_teams").insert({
        event_id: selectedEvent.id,
        team_mode: "fixed",
        position: currentTeams.length + 1,
        registration1_id: first.id,
        registration2_id: second.id,
        team_name: buildDoubleTeamName(first.player_name_snapshot, second.player_name_snapshot),
      })
      if (error) throw error
      setFixedPlayer1RegistrationId("")
      setFixedPlayer2RegistrationId("")
      await reloadDoubleTeams()
      setMessage({ type: "success", text: "Fixes Doppel wurde angelegt." })
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Doppel konnte nicht angelegt werden." })
    } finally {
      setSaving(false)
    }
  }

  const removeDoubleTeam = async (teamId: string) => {
    if (!selectedEvent || selectedEventIsPast || selectedEventLocked) return
    try {
      setSaving(true)
      const { error } = await supabase
        .from("central_tournament_double_teams")
        .delete()
        .eq("id", teamId)
      if (error) throw error
      const remaining = await reloadDoubleTeams()
      await Promise.all(remaining.map((team, index) =>
        supabase.from("central_tournament_double_teams").update({ position: index + 1 }).eq("id", team.id)
      ))
      await reloadDoubleTeams()
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Doppel konnte nicht entfernt werden." })
    } finally {
      setSaving(false)
    }
  }

  const ensureDrawnDoubleTeams = async () => {
    if (!selectedEvent) return
    const active = registeredRows
    if (active.length < 4) throw new Error("Für gelostes Doppel werden mindestens 4 Nennungen benötigt.")
    if (active.length % 2 !== 0) throw new Error("Für gelostes Doppel wird eine gerade Anzahl an Nennungen benötigt.")

    const existing = doubleTeams.filter((team) => team.team_mode === "drawn")
    const expectedTeamCount = active.length / 2
    if (existing.length === expectedTeamCount) return

    const { error: clearError } = await supabase
      .from("central_tournament_double_teams")
      .delete()
      .eq("event_id", selectedEvent.id)
    if (clearError) throw clearError

    const shuffled = [...active]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    const rows = []
    for (let i = 0; i < shuffled.length; i += 2) {
      const first = shuffled[i]
      const second = shuffled[i + 1]
      rows.push({
        event_id: selectedEvent.id,
        team_mode: "drawn",
        position: i / 2 + 1,
        registration1_id: first.id,
        registration2_id: second.id,
        team_name: buildDoubleTeamName(first.player_name_snapshot, second.player_name_snapshot),
      })
    }

    const { error: insertError } = await supabase
      .from("central_tournament_double_teams")
      .insert(rows)
    if (insertError) throw insertError
    await reloadDoubleTeams()
  }

  const validateFixedDoubleTeams = async () => {
    const activeIds = new Set(registeredRows.map((row) => row.id))
    const fixed = doubleTeams.filter((team) => team.team_mode === "fixed")
    if (registeredRows.length < 4) throw new Error("Für fixes Doppel werden mindestens 4 Nennungen benötigt.")
    if (registeredRows.length % 2 !== 0) throw new Error("Für fixes Doppel wird eine gerade Anzahl an Nennungen benötigt.")
    if (fixed.length !== registeredRows.length / 2) {
      throw new Error(`Bitte zuerst alle ${registeredRows.length} Nennungen zu fixen Doppeln zusammenstellen.`)
    }
    const used = fixed.flatMap((team) => [team.registration1_id, team.registration2_id])
    if (new Set(used).size !== used.length || used.some((id) => !activeIds.has(id))) {
      throw new Error("Die fixen Doppel sind nicht mehr vollständig. Bitte die Paarungen kurz neu prüfen.")
    }
  }

  const openRunningCentralTournament = async () => {
    if (!selectedEvent) return

    if (selectedEvent.selected_mode === "kratzer") {
      const { data: kratzer, error: kratzerError } = await supabase
        .from("kratzer_tournaments")
        .select("id,status")
        .eq("central_event_id", selectedEvent.id)
        .eq("status", "running")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (kratzerError) throw kratzerError
      if (!kratzer) {
        setMessage({ type: "error", text: "Dieses Kratzer-Turnier wurde nicht als laufend gefunden. Es wird kein neues Turnier gestartet." })
        return
      }
      router.push(`/kratzer-tournament?centralEventId=${encodeURIComponent(selectedEvent.id)}`)
      return
    }

    const { data, error } = await supabase
      .from("tournaments_status")
      .select("tournament_id, tournament_type, tournament_name, access_type")
      .eq("central_event_id", selectedEvent.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      setMessage({
        type: "error",
        text: "Dieses Turnier ist als gestartet markiert, aber es wurde kein aktives Turnier gefunden. Es wird NICHT neu gestartet.",
      })
      return
    }

    if (data.tournament_type === "survival") {
      const { data: survival, error: survivalError } = await supabase.from("survival_tournaments")
        .select("id,status").eq("id", data.tournament_id).maybeSingle()
      if (survivalError) throw survivalError
      if (!survival || !["draft", "active"].includes(survival.status)) {
        setMessage({type:"error",text:"Das verknüpfte Survival-Turnier ist nicht mehr aktiv. Es wird kein neues Turnier erstellt."})
        return
      }
      router.push(`/admin/survival-roulette/${survival.id}?centralEventId=${encodeURIComponent(selectedEvent.id)}`)
      return
    }

    let route = buildTournamentContinueRoute({
      tournamentType: data.tournament_type,
      tournamentId: data.tournament_id,
      tournamentName: data.tournament_name || selectedEvent.title,
      accessType: data.access_type || selectedEvent.access_type,
      eventId: selectedEvent.id,
    })
    route += `${route.includes("?") ? "&" : "?"}centralEventId=${encodeURIComponent(selectedEvent.id)}`
    router.push(route)
  }

  const chooseMode = async (mode: StartMode) => {
    if (startClickLock.current) return
    if (!selectedEvent || selectedEventIsPast || selectedEventLocked) return

    if (selectedEvent.status === "started") {
      try {
        await openRunningCentralTournament()
      } catch (error: any) {
        console.error("running central tournament open failed:", error)
        setMessage({ type: "error", text: error?.message || "Laufendes Turnier konnte nicht geöffnet werden." })
      }
      return
    }

    const active = selectedRegistrations.filter((row) => row.status === "registered")
    if (active.length < 2) {
      setMessage({ type: "error", text: "Mindestens 2 angemeldete Spieler werden benötigt." })
      return
    }

    const unresolved = active.filter((row) => !row.player_id)
    if (unresolved.length > 0) {
      setMessage({
        type: "error",
        text: `${unresolved.length} Anmeldung${unresolved.length === 1 ? "" : "en"} ohne eindeutige Spielerdatenbank-Zuordnung. Diese Spieler dürfen nicht mitspielen und das Turnier kann so nicht gestartet werden.`,
      })
      return
    }

    startClickLock.current = true
    try {
      setStartingMode(mode)
      setMessage(null)

      if (mode !== "dko" && mode !== "survival" && mode !== "survival_single" && teamMode !== "single") {
        throw new Error("Fixes oder gelostes Doppel ist nur für Doppel-KO vorgesehen. Stelle den Teammodus für Round Robin, Kratzer oder Survival auf Einzel.")
      }

      if (mode === "dko" && teamMode === "fixed") {
        await validateFixedDoubleTeams()
      }

      if (mode === "dko" && teamMode === "drawn") {
        await ensureDrawnDoubleTeams()
      }

      if (mode === "kratzer") {
        await prepareKratzer()
      }

      const { error } = await supabase
        .from("central_tournament_events")
        .update({
          selected_mode: mode,
          status: "ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedEvent.id)

      if (error) throw error

      if (mode === "dko") {
        // Falls dieses zentrale Event bereits ein aktives DKO hat, niemals ein neues erzeugen.
        const { data: existingActive, error: existingError } = await supabase
          .from("tournaments_status")
          .select("tournament_id, tournament_type, tournament_name, access_type")
          .eq("central_event_id", selectedEvent.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existingError) throw existingError
        if (existingActive) {
          let route = buildTournamentContinueRoute({
            tournamentType: existingActive.tournament_type,
            tournamentId: existingActive.tournament_id,
            tournamentName: existingActive.tournament_name || selectedEvent.title,
            accessType: existingActive.access_type || selectedEvent.access_type,
            eventId: selectedEvent.id,
          })
          route += `${route.includes("?") ? "&" : "?"}centralEventId=${encodeURIComponent(selectedEvent.id)}`
          router.push(route)
          return
        }

        // Zentrale Turniere sind hier bereits vollständig konfiguriert.
        const centralSetup = await loadCentralEventForSetup(selectedEvent.id)
        await syncCentralEventRegistrations({
          centralEventId: selectedEvent.id,
          event: centralSetup.event,
          registrations: centralSetup.registrations,
          teamMode,
          tournamentMode: "dko",
        })

        const participantCount = teamMode === "single"
          ? centralSetup.registrations.length
          : Math.ceil(centralSetup.registrations.length / 2)
        const tournamentSize = participantCount <= 8 ? 8 : participantCount <= 16 ? 16 : participantCount <= 32 ? 32 : participantCount <= 64 ? 64 : 128
        const tournamentId = createTournamentIdCompat()
        const tournamentType = `${tournamentSize}er_dko`

        // Status VOR Navigation anlegen. Der DB-Index erlaubt pro zentralem Event nur EIN aktives Turnier.
        const { error: statusError } = await supabase.from("tournaments_status").insert({
          tournament_id: tournamentId,
          tournament_type: tournamentType,
          tournament_name: selectedEvent.title,
          access_type: selectedEvent.access_type,
          status: "active",
          central_event_id: selectedEvent.id,
        })

        if (statusError) {
          // Ein zweiter Klick / Reload darf niemals ein zweites Turnier starten.
          if ((statusError as any).code === "23505") {
            const { data: activeNow, error: activeNowError } = await supabase
              .from("tournaments_status")
              .select("tournament_id, tournament_type, tournament_name, access_type")
              .eq("central_event_id", selectedEvent.id)
              .eq("status", "active")
              .limit(1)
              .maybeSingle()
            if (activeNowError) throw activeNowError
            if (activeNow) {
              let route = buildTournamentContinueRoute({
                tournamentType: activeNow.tournament_type,
                tournamentId: activeNow.tournament_id,
                tournamentName: activeNow.tournament_name || selectedEvent.title,
                accessType: activeNow.access_type || selectedEvent.access_type,
                eventId: selectedEvent.id,
              })
              route += `${route.includes("?") ? "&" : "?"}centralEventId=${encodeURIComponent(selectedEvent.id)}`
              router.push(route)
              return
            }
          }
          throw statusError
        }

        await markCentralEventStarted(selectedEvent.id, "dko")

        let route = buildDkoStartRoute({
          tournamentSize,
          tournamentId,
          tournamentName: selectedEvent.title,
          accessType: selectedEvent.access_type,
          eventId: selectedEvent.id,
        })
        route += `&centralEventId=${encodeURIComponent(selectedEvent.id)}`
        router.push(route)
        return
      }

      if (mode === "round_robin") {
        const params = new URLSearchParams({
          centralEventId: selectedEvent.id,
          mode,
          doubleEntry: "0",
          teamMode: "single",
          doubleMode: "0",
        })
        router.push(`/admin/einzelturnier?${params.toString()}`)
        return
      }

      if (mode === "kratzer") {
        router.push(`/kratzer-tournament?centralEventId=${encodeURIComponent(selectedEvent.id)}`)
        return
      }

      if (mode === "survival_single") {
        router.push(`/admin/survival-einzel?centralEventId=${encodeURIComponent(selectedEvent.id)}`)
        return
      }
      if (mode === "survival") {
        const params = new URLSearchParams({
          centralEventId: selectedEvent.id,
          machines: String(survivalMachines),
        })
        router.push(`/admin/survival-start?${params.toString()}`)
      }
    } catch (error: any) {
      console.error("central event start failed:", error)
      setMessage({ type: "error", text: error?.message || "Turniermodus konnte nicht vorbereitet werden." })
    } finally {
      startClickLock.current = false
      setStartingMode(null)
    }
  }

  const openEvent = (eventId: string) => {
    setSelectedEventId(eventId)
    setRegistrationSearch("")
    setRegistrationFilter("all")
    setDeleteConfirmOpen(false)
    setPlayerSearch("")
    setActiveTab("event")
  }

  return (
    <section className="w-full min-w-0 space-y-4">
        <div className="emd-admin-hero emd-central-registration-hero">
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-200/45">
                Turnier-Zentrale
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.025em] text-white sm:text-[30px]">
                Turniere
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-white/38">
                Turnier auswählen, Teilnehmer verwalten und starten.
              </p>
            </div>

            <div className="flex min-w-0 flex-wrap items-stretch gap-2 lg:justify-end">
              <div className="emd-admin-stat emd-central-stat">
                <div className="emd-central-stat-label">Kommend</div>
                <div className="mt-0.5 text-sm font-black text-white">{upcomingCount}</div>
              </div>
              <div className="emd-admin-stat emd-central-stat">
                <div className="emd-central-stat-label">Anmeldungen</div>
                <div className="mt-0.5 text-sm font-black text-white">{totalOpenRegistrations}</div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void load()}
                disabled={loading}
                className="emd-admin-button-secondary emd-central-refresh"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Neu laden
              </Button>
            </div>
          </div>
        </div>

        <div className="emd-central-tabs sticky top-0 z-20 -mx-3 mb-5 px-3 py-2.5 sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7 xl:-mx-8 xl:px-8">
          <div className="emd-admin-tabs-shell mx-auto flex max-w-[var(--emd-content-max)] gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setActiveTab("planned")}
              className={`emd-admin-tab ${activeTab === "planned" ? "emd-admin-tab-active" : "emd-admin-tab-idle"}`}
            >
              <CalendarDays className="h-4 w-4" />
              <span className="whitespace-nowrap">Geplant</span>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px]">{plannedEventsList.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("today")}
              className={`emd-admin-tab ${activeTab === "today" ? "emd-admin-tab-active" : "emd-admin-tab-idle"}`}
            >
              <Clock3 className="h-4 w-4" />
              <span className="whitespace-nowrap">Heute</span>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px]">{todayEventsList.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("past")}
              className={`emd-admin-tab ${activeTab === "past" ? "emd-admin-tab-active" : "emd-admin-tab-idle"}`}
            >
              <Trophy className="h-4 w-4" />
              <span className="whitespace-nowrap">Vergangen</span>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px]">{pastEventsList.length}</span>
            </button>

          </div>
        </div>

        {message ? (
          <div
            className={`pointer-events-none fixed bottom-4 right-4 z-[120] w-[min(420px,calc(100vw-2rem))] rounded-2xl border p-4 text-sm font-semibold shadow-2xl backdrop-blur-xl ${
              message.type === "success"
                ? "border-emerald-300/20 bg-emerald-950/90 text-emerald-100"
                : "border-rose-300/25 bg-rose-950/90 text-rose-100"
            }`}
            role="status"
            aria-live="polite"
          >
            {message.text}
          </div>
        ) : null}

        {schemaMissing ? (
          <div className="emd-admin-surface-lg p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-500/10">
                <CalendarDays className="h-5 w-5 text-amber-200" />
              </div>
              <div>
                <div className="font-black text-white">Turnier-Anmeldung noch nicht bereit</div>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-white/45">
                  Die zentrale Anmeldung muss einmal technisch eingerichtet werden. Bestehende Turniere und Ergebnisse bleiben dabei erhalten.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {!schemaMissing && ["planned", "today", "past"].includes(activeTab) ? (
          <div className="space-y-4">
            {loading ? null : visibleOverviewEvents.length === 0 ? (
              <div className="emd-admin-surface-lg p-8 text-center">
                <CalendarDays className="mx-auto h-9 w-9 text-white/20" />
                <div className="mt-3 font-black text-white">Noch kein geplantes Turnier</div>
                <p className="mt-1 text-sm text-white/40">
                  Lege das Turnier zuerst unter Veranstaltungen an. Es wird danach automatisch hier übernommen.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleOverviewEvents.map((event) => {
                  const eventRows = registrations.filter((row) => row.event_id === event.id)
                  const registered = eventRows.filter((row) => row.status === "registered").length
                  const waiting = eventRows.filter((row) => row.status === "waitlist").length

                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => openEvent(event.id)}
                      className="emd-admin-card emd-admin-card-hover group w-full p-4 text-left sm:p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-black text-white">{event.title}</h3>
                            <Badge
                              variant="outline"
                              className={
                                event.event_date < todayKey || event.status === "completed"
                                  ? "border-white/[0.08] text-white/45"
                                  : "border-orange-300/15 text-orange-100/70"
                              }
                            >
                              {event.event_date < todayKey || event.status === "completed"
                                ? "Abgeschlossen"
                                : STATUS_LABELS[event.status]}
                            </Badge>
                            {event.selected_mode ? (
                              <Badge variant="outline" className="border-cyan-300/15 text-cyan-100/70">
                                {MODE_LABELS[event.selected_mode]}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-white/[0.08] text-white/45">
                                Modus offen
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={
                                event.is_spontaneous
                                  ? "border-violet-300/15 text-violet-100/65"
                                  : "border-emerald-300/15 text-emerald-100/65"
                              }
                            >
                              {event.is_spontaneous ? "Spontan" : "Aus Veranstaltungen"}
                            </Badge>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-white/38">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatDate(event.event_date)}
                            </span>
                            {formatTime(event.start_time) ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 className="h-3.5 w-3.5" />
                                {formatTime(event.start_time)} Uhr
                              </span>
                            ) : null}
                            {event.location ? (
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                {event.location}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <span className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs font-black text-white/65">
                            <Users className="h-3.5 w-3.5 text-orange-200/70" />
                            {registered} Teilnehmer
                          </span>
                          {waiting > 0 ? (
                            <span className="inline-flex h-9 items-center rounded-xl border border-amber-300/10 bg-amber-500/[0.035] px-3 text-xs font-black text-amber-100/65">
                              {waiting} Warteliste
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs font-black uppercase tracking-[0.1em] text-white/38">
                        <span>{ACCESS_LABELS[event.access_type]}</span>
                        <span className="inline-flex items-center gap-1 text-orange-200/70">
                          {event.event_date < todayKey || event.status === "completed" ? "Details" : "Öffnen"}
                          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}

        {!schemaMissing && activeTab === "event" && selectedEvent ? (
          <div className="space-y-4">
            <div className="emd-admin-surface-lg overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-white/[0.07] p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{selectedEvent.title}</h2>
                    <Badge variant="outline" className="border-orange-300/15 text-orange-100/70">
                      {STATUS_LABELS[selectedEvent.status]}
                    </Badge>
                    <Badge variant="outline" className="border-white/[0.08] text-white/50">
                      {ACCESS_LABELS[selectedEvent.access_type]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        selectedEvent.is_spontaneous
                          ? "border-violet-300/15 text-violet-100/65"
                          : "border-emerald-300/15 text-emerald-100/65"
                      }
                    >
                      {selectedEvent.is_spontaneous ? "Spontanes Turnier" : "Geplante Veranstaltung"}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/42">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(selectedEvent.event_date)}</span>
                    {formatTime(selectedEvent.start_time) ? <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{formatTime(selectedEvent.start_time)} Uhr</span> : null}
                    {selectedEvent.location ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{selectedEvent.location}</span> : null}
                    {selectedEvent.selected_mode ? <span className="font-black text-orange-200/70">{MODE_LABELS[selectedEvent.selected_mode]}</span> : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!selectedEventIsPast && selectedEvent.status === "open" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void setEventStatus("closed")}
                      className="emd-admin-button-secondary"
                      disabled={saving}
                    >
                      Anmeldung schließen
                    </Button>
                  ) : !selectedEventIsPast && (selectedEvent.status === "closed" || selectedEvent.status === "ready") ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void setEventStatus("open")}
                      className="emd-admin-button-secondary"
                      disabled={saving}
                    >
                      Anmeldung öffnen
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={
                      saving ||
                      ["started", "completed", "cancelled"].includes(selectedEvent.status)
                    }
                    className="h-10 rounded-xl border-rose-300/15 bg-rose-500/[0.05] px-3.5 text-xs font-black text-rose-100/70 hover:bg-rose-500/[0.09] disabled:cursor-not-allowed disabled:opacity-35"
                    title={
                      ["started", "completed", "cancelled"].includes(selectedEvent.status)
                        ? "Dieses Turnier kann hier nicht mehr geändert werden."
                        : selectedEvent.is_spontaneous
                          ? "Spontanes Turnier dauerhaft löschen"
                          : "Turnier als abgesagt markieren – Veranstaltung bleibt erhalten"
                    }
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    {selectedEvent.is_spontaneous ? "Turnier löschen" : "Turnier absagen"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("planned")}
                    className="emd-admin-button-secondary"
                  >
                    Zur Übersicht
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 p-4 sm:p-5">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">Teilnehmer</span>
                  <span className="ml-2 text-sm font-black text-white">{registeredRows.length}</span>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">Warteliste</span>
                  <span className="ml-2 text-sm font-black text-white">{waitlistRows.length}</span>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">Abgemeldet</span>
                  <span className="ml-2 text-sm font-black text-white">{withdrawnRows.length}</span>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">Plätze</span>
                  <span className="ml-2 text-sm font-black text-white">{selectedEvent.max_participants || "∞"}</span>
                </div>
              </div>
            </div>

            {!selectedEventLocked && !selectedEventIsPast ? (
              <div className="emd-admin-surface-lg border border-orange-300/15 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-orange-300/65">Turnierstart · {selectedStartMode ? MODE_LABELS[selectedStartMode] : "Modus wählen"}</div>
                    {!selectedEvent.selected_mode ? (
                      <label className="mt-3 block text-sm font-semibold text-white/80">
                        Spielmodus
                        <select value={newEventMode} onChange={(e) => setNewEventMode(e.target.value as StartMode | "")}
                          className="mt-1 block w-full max-w-xs rounded-xl border border-orange-300/20 bg-neutral-900 px-3 py-2 text-white">
                          <option value="">Bitte auswählen</option>
                          <option value="dko">Doppel-KO</option>
                          <option value="round_robin">Round Robin</option>
                          <option value="kratzer">Kratzer</option>
                          <option value="survival">Survival Doppel Roulette</option>
                          <option value="survival_single">Survival Einzel Roulette</option>
                        </select>
                      </label>
                    ) : null}
                    <div className="mt-1 text-lg font-black text-white">{startBlockers.length ? "Noch nicht startbereit" : "Startbereit"}</div>
                    <div className="mt-1 text-xs text-white/50">{registeredRows.length} angemeldet · {waitlistRows.length} Warteliste (nicht in der Auslosung) · {withdrawnRows.length} abgemeldet</div>
                    {startBlockers.length > 0 ? (
                      <div className="mt-3 space-y-1" role="status">
                        {startBlockers.map((reason) => <p key={reason} className="text-sm font-semibold text-amber-300">• {reason}</p>)}
                      </div>
                    ) : <p className="mt-2 text-sm font-semibold text-emerald-300">Alle bekannten Startvoraussetzungen erfüllt.</p>}
                  </div>
                  <Button type="button" className="emd-admin-button-primary shrink-0" disabled={!canStartSelectedEvent}
                    onClick={() => { if (selectedStartMode) void chooseMode(selectedStartMode) }}>
                    {startingMode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    {startingMode ? "Turnier wird gestartet … bitte nicht erneut klicken" : "Turnier starten"}
                  </Button>
                </div>
              </div>
            ) : null}

            {selectedEvent.status === "started" ? (
              <div className="rounded-3xl border border-emerald-300/15 bg-emerald-500/[0.055] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/60">Turnier läuft</div>
                    <div className="mt-2 text-xl font-black text-white">Dieses Turnier ist bereits gestartet.</div>
                    <div className="mt-1 text-sm font-semibold text-white/45">Teilnehmer, Startgeld, Warteliste und Turniermodus sind während des laufenden Turniers gesperrt.</div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void openRunningCentralTournament()}
                    className="h-11 rounded-xl bg-emerald-500 px-5 font-black text-black hover:bg-emerald-400"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Zum laufenden Turnier
                  </Button>
                </div>
              </div>
            ) : null}

            {selectedEventLocked && selectedEvent.status !== "started" ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-3 text-sm font-semibold text-amber-100">
                Dieses Turnier ist {selectedEvent.status === "cancelled" ? "abgesagt" : "abgeschlossen"}. Die Einstellungen und Anmeldungen sind schreibgeschützt.
              </div>
            ) : null}
            <div className={selectedEventLocked ? "pointer-events-none select-text opacity-70 [&_button]:cursor-not-allowed [&_input]:cursor-not-allowed [&_select]:cursor-not-allowed" : "contents"}>
            {deleteConfirmOpen ? (
              <div className="rounded-2xl border border-rose-300/15 bg-rose-500/[0.045] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-black text-rose-100">
                      {selectedEvent.is_spontaneous ? "Turnier wirklich löschen?" : "Turnier wirklich absagen?"}
                    </div>
                    <div className="mt-1 text-xs font-semibold leading-5 text-rose-100/55">
                      {selectedEvent.is_spontaneous
                        ? "Das spontane Turnier und seine Anmeldungen werden dauerhaft entfernt."
                        : "Das Turnier wird als „Abgesagt“ markiert und bleibt unter Vergangen erhalten. Die ursprüngliche Veranstaltung und ihre Daten werden nicht gelöscht."}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={saving} className="emd-admin-button-secondary">
                      Abbrechen
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void (selectedEvent.is_spontaneous ? deleteSelectedEvent() : cancelSelectedEvent())}
                      disabled={saving}
                      className="rounded-xl bg-rose-600 px-4 font-black text-white hover:bg-rose-500"
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      {selectedEvent.is_spontaneous ? "Endgültig löschen" : "Ja, Turnier absagen"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {selectedEventIsPast ? (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-sm font-semibold text-white/50">
                Dieses Turnier ist abgeschlossen. Anmeldungen und Teilnehmer können hier nur noch angesehen, aber nicht mehr verändert werden.
              </div>
            ) : null}

            <div className={`grid gap-3 ${(selectedEvent.selected_mode === "survival" || selectedEvent.selected_mode === "survival_single") ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/30">
                  <LockKeyhole className="h-3.5 w-3.5" /> Teilnahme
                </div>
                <div className="mt-2 font-black text-white">{ACCESS_LABELS[selectedEvent.access_type]}</div>
                <div className="mt-1 text-xs font-semibold leading-5 text-white/38">
                  {selectedEvent.access_type === "public"
                    ? "Alle Spieler möglich · kein Turnierpaket erforderlich."
                    : selectedEvent.access_type === "club_internal"
                      ? "Nur Mitglieder mit Paket „Interne Turniere“."
                      : "Nur Mitglieder mit Paket „Externe Turniere“."}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {([
                    ["public", "Öffentlich"],
                    ["club_internal", "Intern"],
                    ["club_external", "Auswärts"],
                  ] as const).map(([value, label]) => {
                    const active = selectedEvent.access_type === value
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={selectedEventIsPast || saving}
                        onClick={() => void updateSelectedAccessType(value)}
                        className={`rounded-xl border px-2 py-2 text-[10px] font-black transition ${
                          active
                            ? "border-orange-300/30 bg-orange-500/15 text-orange-100"
                            : "border-white/[0.07] bg-white/[0.02] text-white/40 hover:border-orange-300/15 hover:text-white/70"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {(selectedEvent.selected_mode === "survival" || selectedEvent.selected_mode === "survival_single") ? (
                <div className="rounded-2xl border border-orange-400/20 bg-orange-500/[0.055] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-300">Survival Roulette · Einstellungen</div>
                  <div className="mt-2 font-black text-white">{selectedStartMode === "survival_single" ? "Einzel Roulette – neue Gegner jede Runde" : "Doppel Roulette – neue Teams jede Runde"}</div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white/55">Wähle die Survival-Variante vor dem Turnierstart. Bestehende Doppelturniere bleiben unverändert.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {([ ["survival_single", "Einzel Roulette"], ["survival", "Doppel Roulette"] ] as const).map(([value,label]) => (
                      <button type="button" key={value}
                        disabled={selectedEvent.status === "started" || selectedEventLocked || !!startingMode || selectedEvent.selected_mode === "survival_single"}
                        onClick={() => {
                          setSurvivalVariant(value)
                          try { window.localStorage.setItem(`emd-survival-variant:${selectedEvent.id}`, value) } catch {}
                        }}
                        className={`rounded-xl border px-3 py-2 text-left text-xs font-bold ${selectedStartMode === value ? "border-orange-400/40 bg-orange-500/20 text-orange-100" : "border-white/10 text-white/60"} disabled:opacity-60`}>
                        {selectedStartMode === value ? "✓ " : ""}{label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-bold text-white/75">Anzahl Automaten
                      <input type="number" min={1} max={32} step={1} value={survivalMachines} disabled={selectedEventIsPast || !!startingMode}
                        onChange={(e) => {
                          const value = Math.min(32, Math.max(1, Number(e.target.value) || 1))
                          setSurvivalMachines(value)
                          window.localStorage.setItem(`emd-survival-rules:${selectedEvent.id}`, JSON.stringify({machines:value}))
                        }}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-orange-400/60" />
                    </label>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/70">
                      <div className="font-bold text-white">Aktive Survival-Regeln</div>
                      <div>2 Runden je Stage · Best of 3 (2 Legs zum Sieg)</div>
                      <div>Sieg 3 · knappe Niederlage 1 · Niederlage 0 Punkte</div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-orange-100/65">Teilnehmer bleiben unten im Check-in. Der aktuelle Survival-Cut benötigt 4, 8, 12 … Spieler.</p>
                </div>
              ) : null}
              {(selectedEvent.selected_mode !== "survival" && selectedEvent.selected_mode !== "survival_single") ? (
              <button
                type="button"
                disabled={selectedEventIsPast}
                onClick={() => setAllowDoubleEntry((current) => !current)}
                className={`rounded-2xl border p-4 text-left transition ${allowDoubleEntry ? "border-orange-300/25 bg-orange-500/[0.09]" : "border-white/[0.07] bg-white/[0.025] hover:border-orange-300/15"} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">Turnierregel</div>
                    <div className="mt-2 font-black text-white">Doppelnennung erlauben</div>
                  </div>
                  <span className={`grid h-7 w-12 place-items-center rounded-full border text-[10px] font-black ${allowDoubleEntry ? "border-orange-300/30 bg-orange-500/20 text-orange-100" : "border-white/10 bg-white/[0.03] text-white/35"}`}>
                    {allowDoubleEntry ? "AN" : "AUS"}
                  </span>
                </div>
                <div className="mt-1 text-xs font-semibold leading-5 text-white/38">Nur für Doppel-KO. Bei Round Robin und Survival wird keine Doppelnennung verwendet.</div>
              </button>
              ) : null}
              {(selectedEvent.selected_mode !== "survival" && selectedEvent.selected_mode !== "survival_single") ? (
              <div className={`rounded-2xl border p-4 ${teamMode !== "single" ? "border-cyan-300/25 bg-cyan-500/[0.08]" : "border-white/[0.07] bg-white/[0.025]"}`}>
                <div className="flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-cyan-200/70" />
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">Teammodus · Doppel-KO</div>
                    <div className="mt-1 font-black text-white">Doppelturnier</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {([
                    ["single", "Einzel"],
                    ["fixed", "Fixes Doppel"],
                    ["drawn", "Gelostes Doppel"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={selectedEventIsPast}
                      onClick={() => {
                        setTeamMode(value)
                        setFixedPlayer1RegistrationId("")
                        setFixedPlayer2RegistrationId("")
                      }}
                      className={`rounded-xl border px-2 py-2 text-[10px] font-black transition ${
                        teamMode === value
                          ? "border-cyan-300/30 bg-cyan-500/15 text-cyan-100"
                          : "border-white/[0.07] bg-white/[0.02] text-white/40 hover:text-white/70"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs font-semibold leading-5 text-white/38">
                  {teamMode === "fixed"
                    ? "Du stellst die Doppel selbst zusammen."
                    : teamMode === "drawn"
                      ? "Die angemeldeten Nennungen werden beim Start zufällig zu Doppeln gelost."
                      : "Normales Einzelturnier."}
                </div>
              </div>
              ) : null}
            </div>

            {selectedEvent.selected_mode !== "survival" && selectedEvent.selected_mode !== "survival_single" && teamMode === "fixed" && !selectedEventIsPast ? (
              <div className="emd-admin-surface p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="font-black text-white">Fixe Doppel zusammenstellen</div>
                    <div className="mt-1 text-xs font-semibold text-white/38">Jede Nennung kann genau einem Doppel zugeordnet werden. Mit Doppelnennung kann derselbe Spieler über [2], [3] usw. mehrfach vorkommen.</div>
                  </div>
                  <div className="text-xs font-black text-cyan-100/70">{doubleTeams.filter((team) => team.team_mode === "fixed").length} / {Math.floor(registeredRows.length / 2)} Doppel</div>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <Select value={fixedPlayer1RegistrationId} onValueChange={setFixedPlayer1RegistrationId}>
                    <SelectTrigger className="emd-admin-input"><SelectValue placeholder="Spieler 1 aus Liste auswählen" /></SelectTrigger>
                    <SelectContent>
                      {registeredRows
                        .filter((row) => !doubleTeams.some((team) => team.team_mode === "fixed" && (team.registration1_id === row.id || team.registration2_id === row.id)))
                        .map((row) => <SelectItem key={row.id} value={row.id}>{row.player_name_snapshot}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={fixedPlayer2RegistrationId} onValueChange={setFixedPlayer2RegistrationId}>
                    <SelectTrigger className="emd-admin-input"><SelectValue placeholder="Spieler 2 aus Liste auswählen" /></SelectTrigger>
                    <SelectContent>
                      {registeredRows
                        .filter((row) => row.id !== fixedPlayer1RegistrationId)
                        .filter((row) => !doubleTeams.some((team) => team.team_mode === "fixed" && (team.registration1_id === row.id || team.registration2_id === row.id)))
                        .map((row) => <SelectItem key={row.id} value={row.id}>{row.player_name_snapshot}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={() => void addFixedDoubleTeam()} disabled={!fixedPlayer1RegistrationId || !fixedPlayer2RegistrationId || saving} className="rounded-xl bg-cyan-600 px-4 font-black text-white hover:bg-cyan-500">
                    <UserPlus className="mr-2 h-4 w-4" /> Doppel hinzufügen
                  </Button>
                </div>

                {doubleTeams.filter((team) => team.team_mode === "fixed").length > 0 ? (
                  <div className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.07]">
                    {doubleTeams.filter((team) => team.team_mode === "fixed").map((team) => (
                      <div key={team.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/25">Doppel {team.position}</div>
                          <div className="truncate font-black text-white">{team.team_name}</div>
                        </div>
                        <button type="button" onClick={() => void removeDoubleTeam(team.id)} className="rounded-xl border border-rose-300/15 bg-rose-500/[0.05] p-2 text-rose-100/70 hover:bg-rose-500/[0.10]">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
              <div className="emd-admin-surface min-w-0">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="font-black text-white">Teilnehmer & Check-in</div>
                      <div className="mt-1 text-xs text-white/35">Zahlung, Status und Warteliste direkt verwalten</div>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                      {registeredRows.length > 0 && registeredRows.some((row) => !row.paid) && !selectedEventIsPast ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void markAllRegisteredPaid()}
                          disabled={saving}
                          className="h-10 shrink-0 rounded-xl border-emerald-300/20 bg-emerald-500/[0.07] px-3.5 text-xs font-black text-emerald-100 hover:bg-emerald-500/[0.12]"
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          Alle als bezahlt markieren
                        </Button>
                      ) : null}
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                        <Input
                          value={registrationSearch}
                          onChange={(event) => setRegistrationSearch(event.target.value)}
                          placeholder="Anmeldungen suchen …"
                          className="emd-admin-input pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-white/[0.06] px-4 py-3 sm:px-5">
                  {([
                    ["all", "Alle", selectedRegistrations.length],
                    ["registered", "Angemeldet", registeredRows.length],
                    ["waitlist", "Warteliste", waitlistRows.length],
                    ["withdrawn", "Abgemeldet", withdrawnRows.length],
                  ] as const).map(([value, label, count]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRegistrationFilter(value)}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-black transition ${
                        registrationFilter === value
                          ? "border-orange-300/20 bg-orange-500/[0.10] text-orange-100"
                          : "border-white/[0.07] bg-white/[0.02] text-white/40 hover:text-white/65"
                      }`}
                    >
                      {label}
                      <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px]">{count}</span>
                    </button>
                  ))}
                </div>

                <div className="p-3">
                  {filteredRegistrationRows.length === 0 ? (
                    <div className="py-12 text-center text-sm font-semibold text-white/30">
                      Noch keine Anmeldungen.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredRegistrationRows.map((row) => {
                        const player = row.player_id ? playerById.get(row.player_id) : undefined

                        return (
                          <div
                            key={row.id}
                            className={`rounded-2xl border p-3 ${
                              row.status === "registered"
                                ? "border-emerald-300/10 bg-emerald-500/[0.025]"
                                : row.status === "waitlist"
                                  ? "border-amber-300/10 bg-amber-500/[0.025]"
                                  : "border-white/[0.06] bg-white/[0.02] opacity-55"
                            }`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <div className="truncate font-black text-white">
                                  {player?.name || row.player_name_snapshot}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/35">
                                  {player?.verein ? <span>{player.verein}</span> : null}
                                  {player?.ligastatus ? <span>· {player.ligastatus}</span> : null}
                                  <span>· {row.status === "registered" ? "Angemeldet" : row.status === "waitlist" ? "Warteliste" : "Abgemeldet"}</span>
                                  {row.source === "public" ? (
                                    <Badge variant="outline" className="h-5 border-cyan-300/15 px-1.5 text-[9px] text-cyan-100/60">
                                      Öffentlich
                                    </Badge>
                                  ) : row.source === "terminal" ? (
                                    <Badge variant="outline" className="h-5 border-orange-300/20 px-1.5 text-[9px] text-orange-100/75">
                                      Terminal
                                    </Badge>
                                  ) : null}
                                  {!row.player_id ? (
                                    <Badge variant="outline" className="h-5 border-amber-300/20 px-1.5 text-[9px] text-amber-100/75">
                                      Zuordnung fehlt
                                    </Badge>
                                  ) : null}
                                </div>
                                {row.source === "public" && (row.contact_email || row.contact_phone) ? (
                                  <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-white/28">
                                    {row.contact_email ? <span>{row.contact_email}</span> : null}
                                    {row.contact_phone ? <span>· {row.contact_phone}</span> : null}
                                  </div>
                                ) : null}

                                {!row.player_id && row.status !== "withdrawn" && !selectedEventIsPast ? (
                                  <div className="mt-3 max-w-md rounded-xl border border-amber-300/10 bg-amber-500/[0.035] p-3">
                                    <div className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-100/55">
                                      Spieler zuordnen
                                    </div>
                                    <div className="mt-1 text-xs font-semibold leading-5 text-white/45">
                                      Bitte den passenden Spieler auswählen.
                                    </div>

                                    {similarPlayersForRegistration(row).length > 0 ? (
                                      <div className="mt-2.5">
                                        <Select
                                          onValueChange={(value) => void assignRegistrationPlayer(row, value)}
                                          disabled={saving}
                                        >
                                          <SelectTrigger className="emd-admin-select h-9">
                                            <SelectValue placeholder="Spieler auswählen …" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {similarPlayersForRegistration(row).map(({ player: candidate, similarity }) => (
                                              <SelectItem key={candidate.id} value={candidate.id}>
                                                {candidate.name}
                                                {candidate.verein ? ` · ${candidate.verein}` : ""}
                                                {` · ${Math.round(similarity * 100)}% ähnlich`}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <div className="mt-1.5 text-[10px] font-semibold text-white/25">
                                          Ähnliche Spieler zur sicheren Zuordnung.
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="mt-2.5 rounded-lg border border-red-300/10 bg-red-500/[0.035] px-3 py-2 text-xs font-bold text-red-100/60">
                                        Kein ausreichend ähnlicher Spieler gefunden. Bitte den Spieler zuerst in der Spielerdatenbank prüfen bzw. korrekt anlegen.
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void updateRegistration(row, { paid: !row.paid })}
                                  disabled={saving || selectedEventIsPast}
                                  className={`h-9 rounded-xl px-3 text-xs font-black ${
                                    row.paid
                                      ? "border-emerald-300/25 bg-emerald-500/[0.10] text-emerald-100 hover:bg-emerald-500/[0.14]"
                                      : "border-amber-300/20 bg-amber-500/[0.06] text-amber-100/80 hover:bg-amber-500/[0.10]"
                                  }`}
                                >
                                  {row.paid ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Euro className="mr-1.5 h-3.5 w-3.5" />}
                                  {row.paid ? "Bezahlt ✓" : "Zahlung offen"}
                                </Button>

                                {row.status !== "registered" ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void updateRegistration(row, { status: "registered" })}
                                    disabled={saving || selectedEventIsPast}
                                    className="emd-admin-button-secondary h-9 px-3 text-xs"
                                  >
                                    Anmelden
                                  </Button>
                                ) : null}

                                {row.status !== "waitlist" ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void updateRegistration(row, { status: "waitlist" })}
                                    disabled={saving || selectedEventIsPast}
                                    className="emd-admin-button-secondary h-9 px-3 text-xs"
                                  >
                                    Warteliste
                                  </Button>
                                ) : null}

                                {row.status !== "withdrawn" ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void updateRegistration(row, { status: "withdrawn" })}
                                    disabled={saving || selectedEventIsPast}
                                    className="h-9 rounded-xl border-rose-300/15 bg-rose-500/[0.05] px-3 text-xs font-black text-rose-100/70"
                                  >
                                    <X className="mr-1.5 h-3.5 w-3.5" />
                                    Abmelden
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="emd-admin-surface min-w-0">
                <div className="p-4 sm:p-5">
                  <div className="font-black text-white">Spieler hinzufügen</div>
                  <div className="mt-1 text-xs text-white/35">Spieler suchen und mit einem Klick aufnehmen</div>

                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                    <Input
                      value={playerSearch}
                      onChange={(event) => setPlayerSearch(event.target.value)}
                      placeholder="Name, Verein oder Ligastatus …"
                      className="emd-admin-input pl-9"
                    />
                  </div>
                </div>

                <div className="p-3">
                  {filteredPlayers.length === 0 ? (
                    <div className="py-12 text-center text-sm font-semibold text-white/30">
                      Keine weiteren Spieler gefunden.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {filteredPlayers.slice(0, visiblePlayerCount).map((player) => {
                          const eligibility = playerEligibility(player)
                          return (
                            <button
                              key={player.id}
                              type="button"
                              onClick={() => void addPlayer(player)}
                              disabled={saving || selectedEventIsPast || !eligibility.eligible}
                              className="emd-admin-card-hover flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-left disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <div className="min-w-0">
                                <div className="truncate font-black text-white/85">{player.name}</div>
                                <div className="mt-1 truncate text-xs text-white/32">
                                  {[player.verein, player.ligastatus].filter(Boolean).join(" · ") || "Keine weiteren Angaben"}
                                </div>
                                <div className={`mt-1.5 text-[10px] font-black ${eligibility.eligible ? "text-emerald-200/65" : "text-amber-200/65"}`}>
                                  {selectedEvent.access_type === "public"
                                    ? "Öffentlich · keine Paketprüfung"
                                    : eligibilityLoading
                                      ? "Paket wird geprüft …"
                                      : eligibility.eligible
                                        ? "Paket vorhanden · teilnahmeberechtigt"
                                        : eligibility.reason}
                                </div>
                              </div>
                              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${eligibility.eligible ? "border-orange-300/15 bg-orange-500/[0.07] text-orange-200" : "border-white/[0.06] bg-white/[0.02] text-white/20"}`}>
                                {eligibility.eligible ? <UserPlus className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                              </div>
                            </button>
                          )
                        })}
                      </div>

                      {filteredPlayers.length > visiblePlayerCount ? (
                        <button
                          type="button"
                          onClick={() => setVisiblePlayerCount((current) => current + 18)}
                          className="mt-3 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm font-black text-white/55 transition hover:border-orange-300/15 hover:bg-white/[0.045] hover:text-white"
                        >
                          Weitere Spieler anzeigen
                          <span className="ml-2 text-white/25">
                            ({Math.min(18, filteredPlayers.length - visiblePlayerCount)})
                          </span>
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>


            </div>
          </div>
        ) : null}
    </section>
  )
}
