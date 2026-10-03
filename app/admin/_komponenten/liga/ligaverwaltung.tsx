"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

import {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Users,
  Plus,
  Edit,
  Trash2,
  Check,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Target,
  Settings,
  ClipboardList,
  BellRing,
  Inbox,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { vv } from "@/app/admin/_komponenten/vereinsverwaltung/vereinsverwaltung-styles"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Team {
  id: string
  name: string
  type: "own" | "opponent"
}

interface OpponentTeam {
  id: string
  name: string
  venue?: string
  venue_name?: string
  captain_phone?: string
}

interface Season {
  id: string
  name: string
  year: number
  type: string
  start_date: string
  end_date: string
  is_active: boolean
  status?: string | null
  created_at: string
}

interface Match {
  id: string
  season_id: string
  home_team_id: string
  away_team_id: string
  home_opponent_team_id?: string | null
  away_opponent_team_id?: string | null
  home_team_type: "own" | "opponent"
  away_team_type: "own" | "opponent"
  match_date: string
  match_time: string
  week_number: number
  venue: string
  home_score: number | null
  away_score: number | null
  status: string
  original_date?: string | null
  postponement_reason?: string | null
  notes?: string
  home_team: Team
  away_team: Team
  season: Season
  home_opponent_team?: OpponentTeam | null
  away_opponent_team?: OpponentTeam | null
  dart_type: "steeldart" | "edart"
}

type TabKey = "overview" | "matches" | "lineups" | "overdue" | "teams" | "venues"

type LineupAlertRecipient = "captain" | "co_captain" | "both"

type LineupAlertLogRow = {
  id: string
  created_at: string
  recipient_mode: LineupAlertRecipient
  recipient_names: string[]
  targeted_devices: number
  sent_count: number
  failed_count: number
  status: string
}

type LineupAlertDialogState = {
  matchId: string
  teamId: string
  teamName: string
  matchTitle: string
  matchDate: string
  matchTime: string
  captainName: string | null
  coCaptainName: string | null
}

export type LeagueMailboxPrefill = {
  recipientMode: "player" | "team" | "captains" | "all"
  recipientTeamId?: string
  recipientPlayerId?: string
  subject: string
  body: string
  category: "general" | "lineup" | "result" | "schedule" | "team" | "info" | "other"
  priority: "info" | "normal" | "important" | "urgent"
  matchId?: string
  seasonId?: string
}
const TAB_STORAGE_KEY = "league-management-active-tab"

const DEFAULT_HOME_VENUE = "Dart Freizeitverein Pfeil - OK"

type SportdartsTeamAssignment = {
  id: string
  team_id: string
  season_id: string
  sportdarts_season_id: number
  sportdarts_division_id: number
  sportdarts_division_name: string
  created_at?: string
  updated_at?: string
}


type SportdartsGame = {
  gameId: string
  weekNumber: number
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: "scheduled" | "live" | "completed"
  detailUrl: string
  divisionId: number
  divisionName: string
}

type SportdartsImportPreviewRow = SportdartsGame & {
  ownTeamId: string
  ownTeamName: string
  alreadyExists: boolean
  duplicateReason?: string
}

// Aktuelle Sportdarts-Saison: Herbstsaison 2026.
// Die Zuordnung selbst wird trotzdem pro interner Saison gespeichert.
const SPORTDARTS_CURRENT_SEASON_ID = 27

const SPORTDARTS_DIVISIONS = [
  { id: 5, name: "Lungau" },
  { id: 33, name: "Pongau A" },
  { id: 34, name: "Pongau B" },
  { id: 35, name: "Pongau R" },
  { id: 2, name: "Salzburg A" },
  { id: 4, name: "Salzburg B" },
  { id: 6, name: "Salzburg C1" },
  { id: 7, name: "Salzburg C2" },
  { id: 8, name: "Salzburg C3" },
  { id: 9, name: "Salzburg C4" },
  { id: 10, name: "Salzburg NC1" },
  { id: 11, name: "Salzburg NC2" },
  { id: 12, name: "Salzburg NC3" },
  { id: 13, name: "Salzburg R" },
  { id: 39, name: "Salzburg Steeldart 1" },
  { id: 37, name: "Salzburg Steeldart 2" },
  { id: 45, name: "Salzburg Steeldart 3" },
  { id: 49, name: "Salzburg Steeldart 4" },
  { id: 58, name: "Salzburg Steeldart 5" },
] as const

function ToastLike({
  type,
  text,
  onClose,
}: {
  type: "success" | "warning"
  text: string
  onClose?: () => void
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 mb-4 flex items-start gap-2",
        type === "success" ? "bg-green-100 border-green-400" : "bg-yellow-100 border-yellow-400",
      )}
    >
      {type === "success" ? (
        <Check className="h-4 w-4 text-green-600 mt-0.5" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
      )}
      <div className="flex-1">
        <div className={cn("text-sm", type === "success" ? "text-green-800" : "text-yellow-800")}>{text}</div>
      </div>
      {onClose && (
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-2">
          ✕
        </Button>
      )}
    </div>
  )
}

export function LeagueManagement({
  initialTab = "overview",
  onOpenMailbox,
}: {
  initialTab?: TabKey
  onOpenMailbox?: (prefill?: LeagueMailboxPrefill) => void
}) {
  const [ownTeams, setOwnTeams] = useState<Team[]>([])
  const [opponentTeams, setOpponentTeams] = useState<OpponentTeam[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // Admin-Kontrollansicht für Zusagen/Aufstellungen – rein lesend.
  const [planningLoading, setPlanningLoading] = useState(false)
  const [planningTeamMembers, setPlanningTeamMembers] = useState<any[]>([])
  const [planningAvailability, setPlanningAvailability] = useState<any[]>([])
  const [planningLineups, setPlanningLineups] = useState<any[]>([])
  const [planningLineupHeaders, setPlanningLineupHeaders] = useState<any[]>([])

  // EMD Alert für noch nicht bestätigte Aufstellungen.
  const [lineupAlertDialog, setLineupAlertDialog] = useState<LineupAlertDialogState | null>(null)
  const [lineupAlertSelectedRecipient, setLineupAlertSelectedRecipient] = useState<LineupAlertRecipient | null>(null)
  const [lineupAlertSending, setLineupAlertSending] = useState(false)
  const [lineupAlertError, setLineupAlertError] = useState<string>("")
  const [lineupAlertLogs, setLineupAlertLogs] = useState<LineupAlertLogRow[]>([])
  const [lineupAlertLogsLoading, setLineupAlertLogsLoading] = useState(false)

  // Sportdarts-Zuordnung: rein additiv, verändert keine bestehende Liga-/Saisonlogik.
  const [sportdartsAssignments, setSportdartsAssignments] = useState<SportdartsTeamAssignment[]>([])
  const [sportdartsAssignmentSeason, setSportdartsAssignmentSeason] = useState<string>("")
  const [sportdartsSavingKey, setSportdartsSavingKey] = useState<string | null>(null)
  const [sportdartsAssignmentMessage, setSportdartsAssignmentMessage] = useState<string>("")

  const [isSportdartsImportOpen, setIsSportdartsImportOpen] = useState(false)
  const [sportdartsImportLoading, setSportdartsImportLoading] = useState(false)
  const [sportdartsImporting, setSportdartsImporting] = useState(false)
  const [sportdartsImportPreview, setSportdartsImportPreview] = useState<SportdartsImportPreviewRow[]>([])
  const [sportdartsImportMessage, setSportdartsImportMessage] = useState("")

  // Tab state:
  // Admin-Navigation gibt den gewünschten Ziel-Tab direkt vor.
  // Dadurch gibt es keinen Race-Condition/StrictMode-Fehler mehr über localStorage.
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, activeTab)
    } catch {}
  }, [activeTab])

  // Form states
  const [newMatchState, setNewMatch] = useState({
    home_team_id: "",
    home_team_type: "own" as "own" | "opponent",
    away_team_id: "",
    away_team_type: "own" as "own" | "opponent",
    match_date: "",
    match_time: "",
    week_number: 1,
    venue: "",
    dart_type: "steeldart" as "steeldart" | "edart",
  })

  const [newSeason, setNewSeason] = useState({
    name: "",
    type: "Frühjahrsmeisterschaft",
    year: new Date().getFullYear(),
    start_date: "",
    end_date: "",
  })

  const [newOpponentTeam, setNewOpponentTeam] = useState("")
  const [newOpponentTeamVenueName, setNewOpponentTeamVenueName] = useState("")
  const [newOpponentTeamVenue, setNewOpponentTeamVenue] = useState("")
  const [newOpponentTeamCaptainPhone, setNewOpponentTeamCaptainPhone] = useState("")

  // Lokale
  const [venueSearch, setVenueSearch] = useState("")
  const [isVenueAssignDialogOpen, setIsVenueAssignDialogOpen] = useState(false)
  const [venueToAssign, setVenueToAssign] = useState<{ name: string; address: string } | null>(null)
  const [venueAssignTeamId, setVenueAssignTeamId] = useState("")
  const [venueAssignTeamSearch, setVenueAssignTeamSearch] = useState("")

  // Editing
  const [editingOpponentTeam, setEditingOpponentTeam] = useState<string | null>(null)
  const [editOpponentTeamName, setEditOpponentTeamName] = useState("")
  const [editOpponentTeamVenueName, setEditOpponentTeamVenueName] = useState("")
  const [editOpponentTeamVenue, setEditOpponentTeamVenue] = useState("")
  const [editOpponentTeamCaptainPhone, setEditOpponentTeamCaptainPhone] = useState("")

  const [editMatchScores, setEditMatchScores] = useState({ home: 0, away: 0 })
  const [showSuccessMessage, setShowSuccessMessage] = useState("")
  const successTimerRef = useRef<number | null>(null)

  const [isSeasonDialogOpen, setIsSeasonDialogOpen] = useState(false)
  const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false)
  const [selectedMatchForResults, setSelectedMatchForResults] = useState<string | null>(null)

  const [selectedMatchForStats, setSelectedMatchForStats] = useState<Match | null>(null)
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false)

  const [isMatchDetailsDialogOpen, setIsMatchDetailsDialogOpen] = useState(false)
  const [selectedMatchForDetails, setSelectedMatchForDetails] = useState<string | null>(null)
  const [editMatchDetails, setEditMatchDetails] = useState({
    home_team_id: "",
    home_team_type: "own" as "own" | "opponent",
    away_team_id: "",
    away_team_type: "own" as "own" | "opponent",
    match_date: "",
    match_time: "",
    week_number: 1,
    venue: "",
    dart_type: "steeldart" as "steeldart" | "edart",
  })

  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set())

  const toastSuccess = useCallback((msg: string, ms = 2500) => {
    setShowSuccessMessage(msg)
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current)
    successTimerRef.current = window.setTimeout(() => setShowSuccessMessage(""), ms)
  }, [])
  useEffect(() => {
    return () => {
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current)
    }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const [{ data: ownTeamsData, error: teamsError }, { data: opponentTeamsData, error: opponentError }] =
        await Promise.all([
          supabase.from("teams").select("*").not("user_id", "is", null).order("name"),
          supabase.from("opponent_teams").select("*").order("name"),
        ])

      if (teamsError) throw teamsError
      if (opponentError) throw opponentError

      const { data: seasonsData, error: seasonsError } = await supabase
        .from("seasons")
        .select("*")
        .order("created_at", { ascending: false })
      if (seasonsError) throw seasonsError

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(
          `
          *,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name),
          season:seasons(id, name, type)
        `,
        )
        .order("match_date", { ascending: true })
      if (matchesError) throw matchesError

      const enrichedMatches =
        matchesData?.map((match: any) => {
          const homeOpponentTeam = match.home_opponent_team_id
            ? opponentTeamsData?.find((team: any) => team.id === match.home_opponent_team_id)
            : null
          const awayOpponentTeam = match.away_opponent_team_id
            ? opponentTeamsData?.find((team: any) => team.id === match.away_opponent_team_id)
            : null
          return { ...match, home_opponent_team: homeOpponentTeam, away_opponent_team: awayOpponentTeam }
        }) || []

      setOwnTeams(ownTeamsData?.map((team: any) => ({ ...team, type: "own" as const })) || [])
      setOpponentTeams(opponentTeamsData || [])
      setSeasons(seasonsData || [])
      setMatches(enrichedMatches)

      const activeSeason = seasonsData?.find((s: any) => s.is_active)
      setSelectedSeason((prev) => (prev ? prev : activeSeason?.id ?? ""))
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])


  const fetchSportdartsAssignments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("team_sportdarts_assignments")
        .select("*")
        .order("created_at", { ascending: true })

      if (error) {
        // Falls die Migration noch nicht ausgeführt wurde, soll die bestehende Ligaverwaltung
        // trotzdem vollständig weiter funktionieren.
        if ((error as any)?.code === "42P01") {
          setSportdartsAssignments([])
          return
        }
        throw error
      }

      setSportdartsAssignments((data || []) as SportdartsTeamAssignment[])
    } catch (error) {
      console.error("Error fetching Sportdarts assignments:", error)
    }
  }, [])

  useEffect(() => {
    void fetchSportdartsAssignments()
  }, [fetchSportdartsAssignments])

  useEffect(() => {
    if (!sportdartsAssignmentSeason && selectedSeason) {
      setSportdartsAssignmentSeason(selectedSeason)
    }
  }, [selectedSeason, sportdartsAssignmentSeason])

  const getSportdartsAssignment = useCallback(
    (teamId: string, seasonId: string) =>
      sportdartsAssignments.find((row) => row.team_id === teamId && row.season_id === seasonId) ?? null,
    [sportdartsAssignments],
  )

  const saveSportdartsDivision = useCallback(
    async (teamId: string, divisionIdRaw: string) => {
      if (!sportdartsAssignmentSeason) {
        setSportdartsAssignmentMessage("Bitte zuerst eine Saison auswählen.")
        return
      }

      const divisionId = Number(divisionIdRaw)
      const division = SPORTDARTS_DIVISIONS.find((item) => item.id === divisionId)
      if (!division) return

      const key = `${sportdartsAssignmentSeason}:${teamId}`
      setSportdartsSavingKey(key)
      setSportdartsAssignmentMessage("")

      try {
        const payload = {
          team_id: teamId,
          season_id: sportdartsAssignmentSeason,
          sportdarts_season_id: SPORTDARTS_CURRENT_SEASON_ID,
          sportdarts_division_id: division.id,
          sportdarts_division_name: division.name,
          updated_at: new Date().toISOString(),
        }

        const { data, error } = await supabase
          .from("team_sportdarts_assignments")
          .upsert(payload, { onConflict: "team_id,season_id" })
          .select("*")
          .single()

        if (error) throw error

        setSportdartsAssignments((prev) => {
          const next = prev.filter(
            (row) => !(row.team_id === teamId && row.season_id === sportdartsAssignmentSeason),
          )
          return [...next, data as SportdartsTeamAssignment]
        })

        setSportdartsAssignmentMessage(`Sportdarts-Division "${division.name}" gespeichert.`)
      } catch (error: any) {
        console.error("Error saving Sportdarts division:", error)
        setSportdartsAssignmentMessage(
          error?.code === "42P01"
            ? "Die Tabelle team_sportdarts_assignments fehlt noch. Bitte zuerst die SQL-Migration ausführen."
            : "Sportdarts-Division konnte nicht gespeichert werden.",
        )
      } finally {
        setSportdartsSavingKey(null)
      }
    },
    [sportdartsAssignmentSeason],
  )

  const removeSportdartsDivision = useCallback(
    async (teamId: string) => {
      if (!sportdartsAssignmentSeason) return

      const key = `${sportdartsAssignmentSeason}:${teamId}`
      setSportdartsSavingKey(key)
      setSportdartsAssignmentMessage("")

      try {
        const { error } = await supabase
          .from("team_sportdarts_assignments")
          .delete()
          .eq("team_id", teamId)
          .eq("season_id", sportdartsAssignmentSeason)

        if (error) throw error

        setSportdartsAssignments((prev) =>
          prev.filter(
            (row) => !(row.team_id === teamId && row.season_id === sportdartsAssignmentSeason),
          ),
        )
        setSportdartsAssignmentMessage("Sportdarts-Zuordnung entfernt.")
      } catch (error) {
        console.error("Error removing Sportdarts division:", error)
        setSportdartsAssignmentMessage("Sportdarts-Zuordnung konnte nicht entfernt werden.")
      } finally {
        setSportdartsSavingKey(null)
      }
    },
    [sportdartsAssignmentSeason],
  )


  const normalizeSportdartsName = useCallback(
    (value?: string | null) =>
      (value || "")
        .replace(/&amp;/g, "&")
        .replace(/&#039;/g, "'")
        .replace(/&quot;/g, '"')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " "),
    [],
  )

  const getExistingMatchTeamName = useCallback(
    (match: Match, side: "home" | "away") => {
      if (side === "home") {
        return match.home_team_type === "own"
          ? match.home_team?.name || ""
          : match.home_opponent_team?.name || ""
      }
      return match.away_team_type === "own"
        ? match.away_team?.name || ""
        : match.away_opponent_team?.name || ""
    },
    [],
  )

  const loadSportdartsImportPreview = useCallback(async () => {
    if (!selectedSeason) {
      setSportdartsImportMessage("Bitte zuerst die Saison auswählen, in die importiert werden soll.")
      return
    }

    const assignmentsForSeason = sportdartsAssignments.filter((row) => row.season_id === selectedSeason)
    if (assignmentsForSeason.length === 0) {
      setSportdartsImportMessage("Für diese Saison ist noch keinem eigenen Team eine Sportdarts-Division zugeordnet.")
      setSportdartsImportPreview([])
      return
    }

    setSportdartsImportLoading(true)
    setSportdartsImportMessage("")
    setSportdartsImportPreview([])

    try {
      const grouped = new Map<string, SportdartsTeamAssignment[]>()
      assignmentsForSeason.forEach((assignment) => {
        const key = `${assignment.sportdarts_season_id}:${assignment.sportdarts_division_id}`
        grouped.set(key, [...(grouped.get(key) || []), assignment])
      })

      const collected: SportdartsImportPreviewRow[] = []

      for (const [, assignments] of grouped) {
        const sample = assignments[0]
        const response = await fetch("/api/sportdarts/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seasonId: sample.sportdarts_season_id,
            divisionId: sample.sportdarts_division_id,
          }),
        })

        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || "Sportdarts-Spielplan konnte nicht geladen werden.")
        }

        const divisionGames = (payload?.games || []) as SportdartsGame[]

        for (const assignment of assignments) {
          const ownTeam = ownTeams.find((team) => team.id === assignment.team_id)
          if (!ownTeam) continue

          const ownName = normalizeSportdartsName(ownTeam.name)

          for (const rawGame of divisionGames) {
            const game: SportdartsGame = {
              ...rawGame,
              divisionId: assignment.sportdarts_division_id,
              divisionName: assignment.sportdarts_division_name,
            }

            const homeMatches = normalizeSportdartsName(game.homeTeam) === ownName
            const awayMatches = normalizeSportdartsName(game.awayTeam) === ownName
            if (!homeMatches && !awayMatches) continue

            const idMarker = `SPORTDARTS_GAME_ID:${game.gameId}`

            const duplicateById = matches.find(
              (match) =>
                match.season_id === selectedSeason &&
                (match.notes || "").includes(idMarker),
            )

            const duplicateByFields = matches.find((match) => {
              if (match.season_id !== selectedSeason) return false

              const existingHome = normalizeSportdartsName(getExistingMatchTeamName(match, "home"))
              const existingAway = normalizeSportdartsName(getExistingMatchTeamName(match, "away"))

              return (
                match.match_date === game.date &&
                existingHome === normalizeSportdartsName(game.homeTeam) &&
                existingAway === normalizeSportdartsName(game.awayTeam)
              )
            })

            const duplicate = duplicateById || duplicateByFields

            collected.push({
              ...game,
              ownTeamId: ownTeam.id,
              ownTeamName: ownTeam.name,
              alreadyExists: Boolean(duplicate),
              duplicateReason: duplicateById
                ? "bereits über Sportdarts-ID vorhanden"
                : duplicateByFields
                  ? "Datum + Heim/Auswärts bereits vorhanden"
                  : undefined,
            })
          }
        }
      }

      const unique = new Map<string, SportdartsImportPreviewRow>()
      collected.forEach((row) => {
        const key = `${row.gameId}:${row.ownTeamId}`
        if (!unique.has(key)) unique.set(key, row)
      })

      const rows = Array.from(unique.values()).sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        return a.weekNumber - b.weekNumber
      })

      setSportdartsImportPreview(rows)

      const newCount = rows.filter((row) => !row.alreadyExists).length
      const existingCount = rows.length - newCount
      setSportdartsImportMessage(
        `${rows.length} Spiele für eure zugeordneten Teams gefunden · ${newCount} neu · ${existingCount} bereits vorhanden.`,
      )
    } catch (error: any) {
      console.error("Error loading Sportdarts import preview:", error)
      setSportdartsImportMessage(error?.message || "Sportdarts-Spielplan konnte nicht geladen werden.")
    } finally {
      setSportdartsImportLoading(false)
    }
  }, [
    getExistingMatchTeamName,
    matches,
    normalizeSportdartsName,
    ownTeams,
    selectedSeason,
    sportdartsAssignments,
  ])

  const importNewSportdartsGames = useCallback(async () => {
    if (!selectedSeason) return

    const rowsToImport = sportdartsImportPreview.filter((row) => !row.alreadyExists)
    if (rowsToImport.length === 0) {
      setSportdartsImportMessage("Es gibt keine neuen Spiele zum Importieren.")
      return
    }

    setSportdartsImporting(true)
    setSportdartsImportMessage("")

    try {
      const opponentCache = new Map<string, OpponentTeam>()
      opponentTeams.forEach((team) => opponentCache.set(normalizeSportdartsName(team.name), team))

      const ownTeamByName = new Map<string, Team>()
      ownTeams.forEach((team) => ownTeamByName.set(normalizeSportdartsName(team.name), team))

      let imported = 0
      let skipped = 0

      const ensureOpponentTeam = async (name: string) => {
        const normalized = normalizeSportdartsName(name)
        const cached = opponentCache.get(normalized)
        if (cached) return cached

        const { data, error } = await supabase
          .from("opponent_teams")
          .insert([
            {
              name: name.trim(),
              venue_name: null,
              venue: null,
              captain_phone: null,
            },
          ])
          .select("*")
          .single()

        if (error) throw error

        const created = data as OpponentTeam
        opponentCache.set(normalized, created)
        return created
      }

      for (const row of rowsToImport) {
        // Zweite Sicherheitsprüfung unmittelbar vor dem Insert.
        const idMarker = `SPORTDARTS_GAME_ID:${row.gameId}`
        const stillExistsById = matches.some(
          (match) =>
            match.season_id === selectedSeason &&
            (match.notes || "").includes(idMarker),
        )

        const stillExistsByFields = matches.some((match) => {
          if (match.season_id !== selectedSeason) return false
          return (
            match.match_date === row.date &&
            normalizeSportdartsName(getExistingMatchTeamName(match, "home")) ===
              normalizeSportdartsName(row.homeTeam) &&
            normalizeSportdartsName(getExistingMatchTeamName(match, "away")) ===
              normalizeSportdartsName(row.awayTeam)
          )
        })

        if (stillExistsById || stillExistsByFields) {
          skipped += 1
          continue
        }

        const homeOwn = ownTeamByName.get(normalizeSportdartsName(row.homeTeam))
        const awayOwn = ownTeamByName.get(normalizeSportdartsName(row.awayTeam))

        // Importiert werden ausschließlich Spiele, an denen eines unserer zugeordneten Teams beteiligt ist.
        if (!homeOwn && !awayOwn) {
          skipped += 1
          continue
        }

        const matchData: any = {
          season_id: selectedSeason,
          match_date: row.date,
          // Die Ergebnis-Seite enthält keine verlässliche Uhrzeit.
          // Leer lassen statt eine Uhrzeit zu erfinden.
          match_time: "",
          week_number: row.weekNumber,
          venue: "",
          dart_type: row.divisionName.toLowerCase().includes("steeldart") ? "steeldart" : "edart",
          home_team_type: homeOwn ? "own" : "opponent",
          away_team_type: awayOwn ? "own" : "opponent",
          status: "scheduled",
          home_score: null,
          away_score: null,
          notes: `${idMarker}\nSportdarts: ${row.detailUrl}`,
        }

        if (homeOwn) {
          matchData.home_team_id = homeOwn.id
          matchData.home_opponent_team_id = null
        } else {
          const opponent = await ensureOpponentTeam(row.homeTeam)
          matchData.home_team_id = null
          matchData.home_opponent_team_id = opponent.id
        }

        if (awayOwn) {
          matchData.away_team_id = awayOwn.id
          matchData.away_opponent_team_id = null
        } else {
          const opponent = await ensureOpponentTeam(row.awayTeam)
          matchData.away_team_id = null
          matchData.away_opponent_team_id = opponent.id
        }

        const { error } = await supabase.from("matches").insert([matchData])
        if (error) throw error

        imported += 1
      }

      await fetchData()
      setSportdartsImportPreview([])
      setSportdartsImportMessage(
        `${imported} neue Spiele importiert${skipped ? ` · ${skipped} übersprungen` : ""}. Bestehende Spiele wurden nicht verändert.`,
      )
      toastSuccess(`${imported} Sportdarts-Spiel${imported === 1 ? "" : "e"} importiert.`)
    } catch (error) {
      console.error("Error importing Sportdarts games:", error)
      setSportdartsImportMessage("Import fehlgeschlagen. Es wurden keine bestehenden Spiele überschrieben.")
    } finally {
      setSportdartsImporting(false)
    }
  }, [
    fetchData,
    getExistingMatchTeamName,
    matches,
    normalizeSportdartsName,
    opponentTeams,
    ownTeams,
    selectedSeason,
    sportdartsImportPreview,
    toastSuccess,
  ])


  const seasonLabel = useCallback((season?: Season | null) => {
    if (!season) return ""
    const name = String(season.name || "").trim()
    return /\b\d{4}\b/.test(name) ? name : `${name} ${season.year}`
  }, [])

  const getMatchStartMs = useCallback((match: Match) => {
    if (!match.match_date) return Number.NaN
    const raw = String(match.match_time || "").trim()
    const time = /^\d{1,2}:\d{2}(?::\d{2})?$/.test(raw)
      ? raw.length === 5
        ? `${raw}:00`
        : raw
      : "23:59:59"

    return new Date(`${match.match_date}T${time}`).getTime()
  }, [])

  const fetchPlanningData = useCallback(async () => {
    const seasonMatches = selectedSeason
      ? matches.filter((match) => match.season_id === selectedSeason)
      : []

    const matchIds = Array.from(new Set(seasonMatches.map((match) => match.id).filter(Boolean)))
    const teamIds = Array.from(
      new Set(
        seasonMatches
          .flatMap((match) => [
            match.home_team_type === "own" ? match.home_team_id : null,
            match.away_team_type === "own" ? match.away_team_id : null,
          ])
          .filter(Boolean) as string[],
      ),
    )

    if (matchIds.length === 0 || teamIds.length === 0) {
      setPlanningTeamMembers([])
      setPlanningAvailability([])
      setPlanningLineups([])
      setPlanningLineupHeaders([])
      return
    }

    setPlanningLoading(true)
    try {
      const [membersRes, availabilityRes, lineupsRes, headersRes] = await Promise.all([
        supabase
          .from("team_members")
          .select(`
            team_id,
            player_id,
            role,
            club_players:club_players!team_members_player_id_fkey(id,name,photo_url)
          `)
          .in("team_id", teamIds)
          .is("left_at", null),
        supabase
          .from("match_availability")
          .select("match_id,team_id,player_id,status,note,updated_at")
          .in("match_id", matchIds)
          .in("team_id", teamIds),
        supabase
          .from("match_lineups")
          .select("id,match_id,team_id,player_id,position,is_substitute")
          .in("match_id", matchIds)
          .in("team_id", teamIds),
        supabase
          .from("match_lineup_headers")
          .select("match_id,team_id,status,current_version,confirmed_version,confirmed_at,confirmed_by")
          .in("match_id", matchIds)
          .in("team_id", teamIds),
      ])

      if (membersRes.error) throw membersRes.error
      if (availabilityRes.error) throw availabilityRes.error
      if (lineupsRes.error) throw lineupsRes.error
      if (headersRes.error) throw headersRes.error

      setPlanningTeamMembers((membersRes.data as any[]) || [])
      setPlanningAvailability((availabilityRes.data as any[]) || [])
      setPlanningLineups((lineupsRes.data as any[]) || [])
      setPlanningLineupHeaders((headersRes.data as any[]) || [])
    } catch (error) {
      console.error("Error loading league planning overview:", error)
      setPlanningTeamMembers([])
      setPlanningAvailability([])
      setPlanningLineups([])
      setPlanningLineupHeaders([])
    } finally {
      setPlanningLoading(false)
    }
  }, [matches, selectedSeason])

  useEffect(() => {
    void fetchPlanningData()
  }, [fetchPlanningData])

  const loadLineupAlertLogs = useCallback(async (matchId: string, teamId: string) => {
    setLineupAlertLogsLoading(true)
    try {
      const { data, error } = await supabase
        .from("emd_lineup_alert_log")
        .select("id,created_at,recipient_mode,recipient_names,targeted_devices,sent_count,failed_count,status")
        .eq("match_id", matchId)
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(8)

      if (error) throw error
      setLineupAlertLogs((data || []) as LineupAlertLogRow[])
    } catch (error) {
      console.error("loadLineupAlertLogs error:", error)
      setLineupAlertLogs([])
    } finally {
      setLineupAlertLogsLoading(false)
    }
  }, [])

  const openLineupAlertDialog = useCallback(
    (match: Match, teamId: string, teamName: string, members: any[]) => {
      const captain = members.find((member) => member.role === "Captain")
      const coCaptain = members.find((member) => member.role === "Co-Captain")

      setLineupAlertError("")
      setLineupAlertSelectedRecipient(null)
      setLineupAlertDialog({
        matchId: match.id,
        teamId,
        teamName,
        matchTitle: `${getTeamName(match, true)} vs. ${getTeamName(match, false)}`,
        matchDate: new Date(match.match_date).toLocaleDateString("de-AT"),
        matchTime: match.match_time ? String(match.match_time).slice(0, 5) : "",
        captainName: captain?.club_players?.name || null,
        coCaptainName: coCaptain?.club_players?.name || null,
      })
      void loadLineupAlertLogs(match.id, teamId)
    },
    [loadLineupAlertLogs],
  )

  const sendLineupConfirmationAlert = useCallback(
    async () => {
      if (!lineupAlertDialog || !lineupAlertSelectedRecipient || lineupAlertSending) return

      setLineupAlertSending(true)
      setLineupAlertError("")

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const accessToken = session?.access_token
        if (!accessToken) throw new Error("Keine aktive Admin-Sitzung gefunden.")

        const response = await fetch("/api/push/lineup-confirmation-alert", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            match_id: lineupAlertDialog.matchId,
            team_id: lineupAlertDialog.teamId,
            recipient: lineupAlertSelectedRecipient,
          }),
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || "EMD Alert konnte nicht gesendet werden.")
        }

        const sent = Number(payload?.sent || 0)
        const targetLabel =
          lineupAlertSelectedRecipient === "captain"
            ? "Kapitän"
            : lineupAlertSelectedRecipient === "co_captain"
              ? "Co-Kapitän"
              : "Kapitän & Co-Kapitän"

        if (sent > 0) {
          toastSuccess(
            `EMD Alert an ${targetLabel} gesendet (${sent} Gerät${sent === 1 ? "" : "e"}).`,
            4500,
          )
          await loadLineupAlertLogs(lineupAlertDialog.matchId, lineupAlertDialog.teamId)
          setLineupAlertSelectedRecipient(null)
        } else {
          setLineupAlertError(`Für ${targetLabel} ist aktuell kein registriertes Push-Gerät vorhanden.`)
          await loadLineupAlertLogs(lineupAlertDialog.matchId, lineupAlertDialog.teamId)
        }
      } catch (error: any) {
        console.error("sendLineupConfirmationAlert error:", error)
        setLineupAlertError(error?.message || "EMD Alert konnte nicht gesendet werden.")
      } finally {
        setLineupAlertSending(false)
      }
    },
    [
      lineupAlertDialog,
      lineupAlertSelectedRecipient,
      lineupAlertSending,
      loadLineupAlertLogs,
      toastSuccess,
    ],
  )

  const overdueMatches = useMemo(() => {
    if (!selectedSeason) return []

    const now = Date.now()
    const graceMs = 24 * 60 * 60 * 1000

    return matches
      .filter((match) => match.season_id === selectedSeason)
      .filter((match) => {
        // Bei einer Verschiebung steht in match_date / match_time bereits
        // der NEUE Termin. Deshalb postponed NICHT pauschal ausschließen:
        // vor dem neuen Termin unsichtbar, ab neuem Termin + 24h überfällig.
        if (match.status === "completed") return false
        if (match.status === "cancelled") return false

        // scheduled, postponed, live oder jeder andere nicht abgeschlossene
        // Status bleibt offen. Vollständige Scores alleine schließen ein Spiel
        // nicht ab – maßgeblich ist status === "completed".
        const startMs = getMatchStartMs(match)
        if (!Number.isFinite(startMs)) return false

        return now >= startMs + graceMs
      })
      .sort((a, b) => getMatchStartMs(a) - getMatchStartMs(b))
  }, [getMatchStartMs, matches, selectedSeason])

  const upcomingPlanningMatches = useMemo(() => {
    if (!selectedSeason) return []

    const now = Date.now()
    return matches
      .filter((match) => match.season_id === selectedSeason)
      .filter((match) => match.status !== "completed" && match.status !== "postponed")
      .filter((match) => {
        const startMs = getMatchStartMs(match)
        return Number.isFinite(startMs) ? startMs >= now : true
      })
      .sort((a, b) => getMatchStartMs(a) - getMatchStartMs(b))
  }, [getMatchStartMs, matches, selectedSeason])

  const getOwnTeamContexts = useCallback(
    (match: Match) => {
      const result: { teamId: string; teamName: string }[] = []

      if (match.home_team_type === "own" && match.home_team_id) {
        result.push({
          teamId: match.home_team_id,
          teamName:
            match.home_team?.name ||
            ownTeams.find((team) => team.id === match.home_team_id)?.name ||
            "Eigenes Team",
        })
      }

      if (
        match.away_team_type === "own" &&
        match.away_team_id &&
        !result.some((item) => item.teamId === match.away_team_id)
      ) {
        result.push({
          teamId: match.away_team_id,
          teamName:
            match.away_team?.name ||
            ownTeams.find((team) => team.id === match.away_team_id)?.name ||
            "Eigenes Team",
        })
      }

      return result
    },
    [ownTeams],
  )

  const getPlanningSummary = useCallback(
    (match: Match, teamId: string) => {
      const members = planningTeamMembers
        .filter((row) => row.team_id === teamId)
        .slice()
        .sort((a, b) =>
          String(a.club_players?.name || "").localeCompare(String(b.club_players?.name || ""), "de"),
        )

      const availabilityByPlayer = new Map(
        planningAvailability
          .filter((row) => row.match_id === match.id && row.team_id === teamId)
          .map((row) => [row.player_id, row]),
      )

      const lineup = planningLineups
        .filter((row) => row.match_id === match.id && row.team_id === teamId)
        .slice()
        .sort((a, b) => {
          if (Boolean(a.is_substitute) !== Boolean(b.is_substitute)) {
            return a.is_substitute ? 1 : -1
          }
          return Number(a.position || 0) - Number(b.position || 0)
        })

      const header = planningLineupHeaders.find(
        (row) => row.match_id === match.id && row.team_id === teamId,
      )

      const counts = { yes: 0, maybe: 0, no: 0, none: 0 }

      members.forEach((member) => {
        const status = availabilityByPlayer.get(member.player_id)?.status
        if (status === "yes") counts.yes += 1
        else if (status === "maybe") counts.maybe += 1
        else if (status === "no") counts.no += 1
        else counts.none += 1
      })

      const confirmed =
        header?.status === "confirmed" &&
        header?.confirmed_version != null &&
        header?.confirmed_version === header?.current_version

      const stale =
        header?.status === "confirmed" &&
        header?.confirmed_version != null &&
        header?.current_version != null &&
        Number(header.confirmed_version) < Number(header.current_version)

      const requiredStarters =
        match.dart_type === "edart" ? 4 : match.dart_type === "steeldart" ? 3 : 1

      const startersCount = lineup.filter((row) => !row.is_substitute).length

      return {
        members,
        availabilityByPlayer,
        lineup,
        counts,
        confirmed,
        stale,
        requiredStarters,
        startersCount,
      }
    },
    [planningAvailability, planningLineupHeaders, planningLineups, planningTeamMembers],
  )

  const lineupActionItems = useMemo(() => {
    if (!selectedSeason) return []

    const now = Date.now()
    const warningWindowMs = 12 * 60 * 60 * 1000
    const items: Array<{
      match: Match
      teamId: string
      teamName: string
      hoursUntil: number
    }> = []

    matches
      .filter((match) => match.season_id === selectedSeason)
      .filter((match) => match.status !== "completed" && match.status !== "cancelled")
      .forEach((match) => {
        const startMs = getMatchStartMs(match)
        if (!Number.isFinite(startMs)) return

        const remaining = startMs - now
        if (remaining <= 0 || remaining > warningWindowMs) return

        getOwnTeamContexts(match).forEach(({ teamId, teamName }) => {
          const header = planningLineupHeaders.find(
            (row) => row.match_id === match.id && row.team_id === teamId,
          )

          const confirmed =
            header?.status === "confirmed" &&
            header?.confirmed_version != null &&
            header?.confirmed_version === header?.current_version

          if (!confirmed) {
            items.push({
              match,
              teamId,
              teamName,
              hoursUntil: Math.max(0, Math.ceil(remaining / (60 * 60 * 1000))),
            })
          }
        })
      })

    return items.sort(
      (a, b) => getMatchStartMs(a.match) - getMatchStartMs(b.match),
    )
  }, [
    getMatchStartMs,
    getOwnTeamContexts,
    matches,
    planningLineupHeaders,
    selectedSeason,
  ])

  const leagueActionCount = lineupActionItems.length + overdueMatches.length



  // ✅ Derived
  // Bestehende Hinweislogik verwendet jetzt dieselbe 24h-Kontrolle wie der Tab "Überfällig".
  const pastGamesWithoutResults = overdueMatches

  const normalizeVenuePart = (value?: string) => (value || "").trim().toLowerCase().replace(/\s+/g, " ")

  const venues = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string
        name: string
        address: string
        teams: OpponentTeam[]
      }
    >()

    for (const t of opponentTeams) {
      const name = (t.venue_name || "").trim()
      const address = (t.venue || "").trim()
      if (!name && !address) continue

      const key = `${normalizeVenuePart(name)}|${normalizeVenuePart(address)}`
      if (!map.has(key)) map.set(key, { key, name, address, teams: [] })
      map.get(key)!.teams.push(t)
    }

    return Array.from(map.values()).sort((a, b) => {
      const an = a.name || a.address
      const bn = b.name || b.address
      return an.localeCompare(bn)
    })
  }, [opponentTeams])

  const filteredVenues = useMemo(() => {
    const q = venueSearch.trim().toLowerCase()
    if (!q) return venues
    return venues.filter((v) => {
      const hay = [v.name, v.address, ...v.teams.map((t) => t.name)].filter(Boolean).join(" ").toLowerCase()
      return hay.includes(q)
    })
  }, [venues, venueSearch])

  const filteredOpponentTeamsForVenueAssign = useMemo(() => {
    const q = venueAssignTeamSearch.trim().toLowerCase()
    if (!q) return opponentTeams
    return opponentTeams.filter((t) => t.name.toLowerCase().includes(q))
  }, [opponentTeams, venueAssignTeamSearch])

  const currentSeason = useMemo(() => seasons.find((s) => s.id === selectedSeason), [seasons, selectedSeason])

  const filteredMatches = useMemo(() => {
    const base = selectedSeason ? matches.filter((m) => m.season_id === selectedSeason) : matches
    return base.slice().sort((a, b) => {
      const aHasOwnTeam = a.home_team_type === "own" || a.away_team_type === "own"
      const bHasOwnTeam = b.home_team_type === "own" || b.away_team_type === "own"
      if (aHasOwnTeam && !bHasOwnTeam) return -1
      if (!aHasOwnTeam && bHasOwnTeam) return 1
      return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    })
  }, [matches, selectedSeason])

  const groupMatchesByOwnTeam = useCallback((ms: Match[]) => {
    const grouped: Record<string, { team: Team; matches: (Match & { isOwnTeamHome?: boolean })[] }> = {}
    const otherMatches: Match[] = []

    const addToGroup = (team: Team, match: Match, isOwnTeamHome: boolean) => {
      if (!grouped[team.id]) grouped[team.id] = { team, matches: [] }
      grouped[team.id].matches.push({ ...match, isOwnTeamHome })
    }

    ms.forEach((match) => {
      const homeIsOwn = match.home_team_type === "own" && match.home_team
      const awayIsOwn = match.away_team_type === "own" && match.away_team

      if (homeIsOwn) addToGroup(match.home_team!, match, true)

      if (awayIsOwn && (!homeIsOwn || match.away_team!.id !== match.home_team!.id)) {
        addToGroup(match.away_team!, match, false)
      }

      if (!homeIsOwn && !awayIsOwn) otherMatches.push(match)
    })

    return { grouped, otherMatches }
  }, [])

  const { grouped: groupedMatches, otherMatches } = useMemo(
    () => groupMatchesByOwnTeam(filteredMatches),
    [filteredMatches, groupMatchesByOwnTeam],
  )

  const toggleTeamCollapse = useCallback((teamId: string) => {
    setCollapsedTeams((prev) => {
      const next = new Set(prev)
      next.has(teamId) ? next.delete(teamId) : next.add(teamId)
      return next
    })
  }, [])

  const createSeason = useCallback(async () => {
    try {
      const { error } = await supabase.from("seasons").insert([
        {
          name: newSeason.name,
          type: newSeason.type,
          year: newSeason.year,
          start_date: newSeason.start_date,
          end_date: newSeason.end_date,
          is_active: false,
        },
      ])
      if (error) throw error

      setNewSeason({
        name: "",
        type: "Frühjahrsmeisterschaft",
        year: new Date().getFullYear(),
        start_date: "",
        end_date: "",
      })
      setIsSeasonDialogOpen(false)
      toastSuccess("Saison erfolgreich erstellt!")
      fetchData()
    } catch (error) {
      console.error("Error creating season:", error)
    }
  }, [fetchData, newSeason, toastSuccess])

  const closeSeason = useCallback(
    async (seasonId: string) => {
      const season = seasons.find((row) => row.id === seasonId)
      if (!season) return

      if (!window.confirm(`Liga "${seasonLabel(season)}" wirklich abschließen?\n\nDie Saison bleibt vollständig erhalten.`)) {
        return
      }

      try {
        const { error } = await supabase
          .from("seasons")
          .update({ is_active: false, status: "completed" })
          .eq("id", seasonId)
        if (error) throw error
        toastSuccess(`${seasonLabel(season)} wurde abgeschlossen.`)
        await fetchData()
      } catch (error) {
        console.error("Error closing season:", error)
        setShowSuccessMessage("Liga konnte nicht abgeschlossen werden.")
      }
    },
    [fetchData, seasonLabel, seasons, toastSuccess],
  )

  const deleteSeason = useCallback(
    async (seasonId: string) => {
      if (
        !window.confirm(
          "Sind Sie sicher, dass Sie diese Saison löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
        )
      ) {
        return
      }
      try {
        const { error } = await supabase.from("seasons").delete().eq("id", seasonId)
        if (error) throw error
        toastSuccess("Saison erfolgreich gelöscht!")
        fetchData()
      } catch (error) {
        console.error("Error deleting season:", error)
      }
    },
    [fetchData, toastSuccess],
  )




const createMatch = useCallback(async () => {
  try {
    const matchData: any = {
      season_id: selectedSeason,
      match_date: newMatchState.match_date,
      match_time: newMatchState.match_time,
      week_number: newMatchState.week_number,
      venue: newMatchState.venue,
      dart_type: newMatchState.dart_type,
      home_team_type: newMatchState.home_team_type,
      away_team_type: newMatchState.away_team_type,
      status: "scheduled",
    }

    if (newMatchState.home_team_type === "own") {
      matchData.home_team_id = newMatchState.home_team_id
      matchData.home_opponent_team_id = null
    } else {
      matchData.home_opponent_team_id = newMatchState.home_team_id
      matchData.home_team_id = null
    }

    if (newMatchState.away_team_type === "own") {
      matchData.away_team_id = newMatchState.away_team_id
      matchData.away_opponent_team_id = null
    } else {
      matchData.away_opponent_team_id = newMatchState.away_team_id
      matchData.away_team_id = null
    }

    const { error } = await supabase.from("matches").insert([matchData])
    if (error) throw error

    setNewMatch({
      home_team_id: "",
      home_team_type: "own",
      away_team_id: "",
      away_team_type: "own",
      match_date: "",
      match_time: "",
      week_number: 1,
      venue: "",
      dart_type: "steeldart",
    })

    toastSuccess("Spiel erstellt!")
    fetchData()
  } catch (error) {
    console.error("Error creating match:", error)
  }
}, [fetchData, newMatchState, selectedSeason, toastSuccess])







  const deleteMatch = useCallback(
    async (matchId: string) => {
      if (
        !window.confirm(
          "Sind Sie sicher, dass Sie dieses Spiel löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
        )
      ) {
        return
      }
      try {
        const { error } = await supabase.from("matches").delete().eq("id", matchId)
        if (error) throw error
        toastSuccess("Spiel gelöscht.")
        fetchData()
      } catch (error) {
        console.error("Error deleting match:", error)
      }
    },
    [fetchData, toastSuccess],
  )

  const updateMatchScore = useCallback(
    async (matchId: string, homeScore: number, awayScore: number) => {
      try {
        const { error } = await supabase
          .from("matches")
          .update({ home_score: homeScore, away_score: awayScore, status: "completed" })
          .eq("id", matchId)
        if (error) throw error

        setIsResultsDialogOpen(false)
        setSelectedMatchForResults(null)
        toastSuccess("Ergebnis gespeichert.")
        fetchData()
      } catch (error) {
        console.error("Error updating match score:", error)
      }
    },
    [fetchData, toastSuccess],
  )

  const resetMatchScore = useCallback(
    async (matchId: string) => {
      try {
        const { error } = await supabase
          .from("matches")
          .update({ home_score: null, away_score: null, status: "scheduled" })
          .eq("id", matchId)
        if (error) throw error

        setIsResultsDialogOpen(false)
        setSelectedMatchForResults(null)
        toastSuccess("Ergebnis zurückgesetzt.")
        fetchData()
      } catch (error) {
        console.error("Error resetting match score:", error)
      }
    },
    [fetchData, toastSuccess],
  )

  const updateMatchDetails = useCallback(
    async (matchId: string) => {
      try {
        const matchData: any = {
          match_date: editMatchDetails.match_date,
          match_time: editMatchDetails.match_time,
          week_number: editMatchDetails.week_number,
          venue: editMatchDetails.venue,
          dart_type: editMatchDetails.dart_type,
        }

        if (editMatchDetails.home_team_type === "own") {
          matchData.home_team_id = editMatchDetails.home_team_id
          matchData.home_opponent_team_id = null
        } else {
          matchData.home_opponent_team_id = editMatchDetails.home_team_id
          matchData.home_team_id = null
        }

        if (editMatchDetails.away_team_type === "own") {
          matchData.away_team_id = editMatchDetails.away_team_id
          matchData.away_opponent_team_id = null
        } else {
          matchData.away_opponent_team_id = editMatchDetails.away_team_id
          matchData.away_team_id = null
        }

        const { error } = await supabase.from("matches").update(matchData).eq("id", matchId)
        if (error) throw error

        setIsMatchDetailsDialogOpen(false)
        setSelectedMatchForDetails(null)
        toastSuccess("Spieldetails erfolgreich aktualisiert!")
        fetchData()
      } catch (error) {
        console.error("Error updating match details:", error)
      }
    },
    [editMatchDetails, fetchData, toastSuccess],
  )

  const createOpponentTeam = useCallback(async () => {
    if (!newOpponentTeam.trim()) return
    try {
      const { error } = await supabase.from("opponent_teams").insert([
        {
          name: newOpponentTeam.trim(),
          venue_name: newOpponentTeamVenueName.trim() || null,
          venue: newOpponentTeamVenue.trim() || null,
          captain_phone: newOpponentTeamCaptainPhone.trim() || null,
        },
      ])
      if (error) throw error

      setNewOpponentTeam("")
      setNewOpponentTeamVenueName("")
      setNewOpponentTeamVenue("")
      setNewOpponentTeamCaptainPhone("")
      toastSuccess("Gegnerteam erstellt.")
      fetchData()
    } catch (error) {
      console.error("Error creating opponent team:", error)
    }
  }, [
    fetchData,
    newOpponentTeam,
    newOpponentTeamCaptainPhone,
    newOpponentTeamVenue,
    newOpponentTeamVenueName,
    toastSuccess,
  ])

  const deleteOpponentTeam = useCallback(
    async (teamId: string) => {
      if (
        !window.confirm(
          "Sind Sie sicher, dass Sie dieses Gegnerteam löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
        )
      ) {
        return
      }
      try {
        const { error } = await supabase.from("opponent_teams").delete().eq("id", teamId)
        if (error) throw error
        toastSuccess("Gegnerteam gelöscht.")
        fetchData()
      } catch (error) {
        console.error("Error deleting opponent team:", error)
      }
    },
    [fetchData, toastSuccess],
  )

  const startEditingOpponentTeam = useCallback((team: OpponentTeam) => {
    setEditingOpponentTeam(team.id)
    setEditOpponentTeamName(team.name)
    setEditOpponentTeamVenueName(team.venue_name || "")
    setEditOpponentTeamVenue(team.venue || "")
    setEditOpponentTeamCaptainPhone(team.captain_phone || "")
  }, [])

  const updateOpponentTeam = useCallback(
    async (teamId: string) => {
      if (!editOpponentTeamName.trim()) return
      try {
        const { error } = await supabase
          .from("opponent_teams")
          .update({
            name: editOpponentTeamName.trim(),
            venue_name: editOpponentTeamVenueName.trim() || null,
            venue: editOpponentTeamVenue.trim() || null,
            captain_phone: editOpponentTeamCaptainPhone.trim() || null,
          })
          .eq("id", teamId)

        if (error) throw error

        setEditingOpponentTeam(null)
        setEditOpponentTeamName("")
        setEditOpponentTeamVenueName("")
        setEditOpponentTeamVenue("")
        setEditOpponentTeamCaptainPhone("")
        toastSuccess("Gegnerteam aktualisiert.")
        fetchData()
      } catch (error) {
        console.error("Error updating opponent team:", error)
      }
    },
    [
      editOpponentTeamCaptainPhone,
      editOpponentTeamName,
      editOpponentTeamVenue,
      editOpponentTeamVenueName,
      fetchData,
      toastSuccess,
    ],
  )

  const applyVenueToOpponentTeam = useCallback(
    async (teamId: string, venue: { name: string; address: string }) => {
      try {
        const { error } = await supabase
          .from("opponent_teams")
          .update({ venue_name: venue.name.trim() || null, venue: venue.address.trim() || null })
          .eq("id", teamId)
        if (error) throw error

        toastSuccess("Lokal wurde gespeichert.")
        fetchData()
      } catch (error) {
        console.error("Error applying venue to opponent team:", error)
      }
    },
    [fetchData, toastSuccess],
  )

  const getTeamName = useCallback((match: Match, isHome: boolean) => {
    if (isHome) return match.home_team_type === "own" ? match.home_team?.name : match.home_opponent_team?.name
    return match.away_team_type === "own" ? match.away_team?.name : match.away_opponent_team?.name
  }, [])

  const getMatchResult = useCallback(
    (match: Match) => {
      if (match.home_score === null || match.away_score === null) return "pending"

      const isOurTeamHome = ownTeams.some((team) => team.id === match.home_team_id)
      const isOurTeamAway = ownTeams.some((team) => team.id === match.away_team_id)
      if (!isOurTeamHome && !isOurTeamAway) return "neutral"

      if (match.home_score === match.away_score) return "draw"

      const ourTeamWon =
        (isOurTeamHome && match.home_score > match.away_score) || (isOurTeamAway && match.away_score > match.home_score)

      return ourTeamWon ? "won" : "lost"
    },
    [ownTeams],
  )

  const getMatchBackgroundColor = useCallback(
    (match: Match) => {
      const result = getMatchResult(match)
      switch (result) {
        case "won":
          return "bg-green-50 border-green-200"
        case "lost":
          return "bg-red-50 border-red-200"
        case "draw":
          return "bg-yellow-50 border-yellow-200"
        default:
          return "bg-card"
      }
    },
    [getMatchResult],
  )

  const handleTeamSelection = useCallback(
    (teamId: string, teamType: "own" | "opponent", position: "home" | "away") => {
      setNewMatch((prev) => {
        const updated = { ...prev }
        if (position === "home") {
          updated.home_team_id = teamId
          updated.home_team_type = teamType
        } else {
          updated.away_team_id = teamId
          updated.away_team_type = teamType
        }

        let autoVenue = ""
        if (updated.home_team_type === "own" && updated.home_team_id) autoVenue = DEFAULT_HOME_VENUE
        else if (updated.home_team_type === "opponent" && updated.home_team_id) {
          const opp = opponentTeams.find((t) => t.id === updated.home_team_id)
          if (opp?.venue) autoVenue = opp.venue
        }
        updated.venue = autoVenue
        return updated
      })
    },
    [opponentTeams],
  )
  
  
  const handleEditTeamSelection = useCallback(
  (teamId: string, teamType: "own" | "opponent", position: "home" | "away") => {
    setEditMatchDetails((prev) => {
      const updated = { ...prev }

      if (position === "home") {
        updated.home_team_id = teamId
        updated.home_team_type = teamType
      } else {
        updated.away_team_id = teamId
        updated.away_team_type = teamType
      }

      let autoVenue = ""
      if (updated.home_team_type === "own" && updated.home_team_id) {
        autoVenue = DEFAULT_HOME_VENUE
      } else if (updated.home_team_type === "opponent" && updated.home_team_id) {
        const opp = opponentTeams.find((t) => t.id === updated.home_team_id)
        if (opp?.venue) autoVenue = opp.venue
      }

      updated.venue = autoVenue
      return updated
    })
  },
  [opponentTeams],
)
  
  
  
  

  // ✅ "App-Layout": Sticky Tabs + mobile friendly spacing
  if (loading) {
    return <div className="flex items-center justify-center p-8">Lade Ligadaten...</div>
  }

  return (
    <div className={cn(vv.page, "emd-league-management")}>
      <div className={vv.content}>
        <div className="emd-admin-hero">
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-200/45">Mein EMD · Verwaltung</div>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.025em] text-white sm:text-[30px]">Ligaverwaltung</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/38">Spielplan, Aufstellungen und Ligakontrolle zentral verwalten.</p>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <div className="emd-admin-stat text-right">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25">Mannschaften</div>
                <div className="mt-0.5 text-sm font-black text-white">{ownTeams.length}</div>
              </div>
              <div className="emd-admin-stat text-right">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25">Handlungsbedarf</div>
                <div className={cn("mt-0.5 text-sm font-black", leagueActionCount > 0 ? "text-amber-200" : "text-white")}>
                  {leagueActionCount}
                </div>
              </div>
              <div className="emd-admin-stat text-right">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25">Überfällig</div>
                <div className="mt-0.5 text-sm font-black text-white">{overdueMatches.length}</div>
              </div>
            </div>
          </div>
        </div>

        {showSuccessMessage ? (
          <div className="mb-4 rounded-[18px] border border-emerald-300/15 bg-emerald-500/[0.06] px-4 py-3 text-sm font-bold text-emerald-100">
            {showSuccessMessage}
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
          <div className={cn("sticky top-0 z-20 -mx-3 mb-5 px-3 py-2.5 sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7 xl:-mx-8 xl:px-8", vv.navBar)}>
            <div className="mx-auto flex max-w-[var(--emd-content-max)] gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                ["overview", "Übersicht", Trophy],
                ["matches", "Spiele", Calendar],
                ["lineups", "Aufstellungen & Zusagen", ClipboardList],
                ["overdue", "Überfällig", BellRing],
                ["teams", "Mannschaften", Users],
                ["venues", "Lokale", MapPin],
              ].map(([key, label, Icon]: any) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key as TabKey)}
                  className={cn(vv.navItem, activeTab === key ? vv.navActive : vv.navIdle)}
                >
                  <Icon className={cn("h-4 w-4", activeTab === key ? "text-orange-300" : "text-white/28 group-hover:text-white/55")} />
                  <span className="whitespace-nowrap">{label}</span>
                  {key === "overdue" && overdueMatches.length > 0 ? (
                    <span className="ml-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-black text-amber-200">{overdueMatches.length}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
              {/* OVERVIEW */}
              <TabsContent value="overview" className="mt-0 space-y-5">
                <section className={vv.surface}>
                  <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className={vv.label}>Liga-Zentrale</div>
                        <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-white">
                          <AlertTriangle className={cn("h-5 w-5", leagueActionCount > 0 ? "text-amber-300" : "text-emerald-300")} />
                          Handlungsbedarf
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-white/38">
                          Wichtige Punkte, die vor oder nach einem Ligaspiel noch offen sind.
                        </p>
                      </div>
                      {onOpenMailbox ? (
                        <Button type="button" variant="outline" className={vv.buttonSecondary} onClick={onOpenMailbox}>
                          <Inbox className="mr-2 h-4 w-4" />
                          Ligapostfach
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 p-4 lg:grid-cols-2 sm:p-5">
                    <button
                      type="button"
                      onClick={() => setActiveTab("lineups")}
                      className={cn(
                        vv.cardHover,
                        "p-4 text-left sm:p-5",
                        lineupActionItems.length > 0 && "border-amber-300/[0.16] bg-amber-500/[0.045]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">
                            Vor dem Spiel
                          </div>
                          <div className="mt-1 text-base font-black text-white">Aufstellung fehlt</div>
                          <div className="mt-1 text-sm font-semibold leading-5 text-white/38">
                            Ab 12 Stunden vor Spielbeginn wird eine fehlende bestätigte Aufstellung hier als Handlungsbedarf angezeigt.
                          </div>
                        </div>
                        <span className={cn(
                          "rounded-full px-3 py-1 text-sm font-black",
                          lineupActionItems.length > 0
                            ? "bg-amber-500/12 text-amber-200"
                            : "bg-emerald-500/10 text-emerald-200",
                        )}>
                          {lineupActionItems.length}
                        </span>
                      </div>

                      {lineupActionItems.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {lineupActionItems.slice(0, 3).map((item) => (
                            <div key={`${item.match.id}:${item.teamId}`} className={cn(vv.inset, "px-3 py-2.5")}>
                              <div className="text-sm font-black text-white/80">{item.teamName}</div>
                              <div className="mt-0.5 text-xs font-semibold text-white/35">
                                {getTeamName(item.match, true)} vs. {getTeamName(item.match, false)}
                                {" · "}
                                noch ca. {item.hoursUntil} Std.
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 text-xs font-bold text-emerald-200/70">Aktuell alles erledigt.</div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("overdue")}
                      className={cn(
                        vv.cardHover,
                        "p-4 text-left sm:p-5",
                        overdueMatches.length > 0 && "border-amber-300/[0.16] bg-amber-500/[0.045]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">
                            Nach dem Spiel
                          </div>
                          <div className="mt-1 text-base font-black text-white">Ergebnis ausständig</div>
                          <div className="mt-1 text-sm font-semibold leading-5 text-white/38">
                            Spiele ohne Abschluss erscheinen 24 Stunden nach dem aktuell gültigen Spieltermin.
                          </div>
                        </div>
                        <span className={cn(
                          "rounded-full px-3 py-1 text-sm font-black",
                          overdueMatches.length > 0
                            ? "bg-amber-500/12 text-amber-200"
                            : "bg-emerald-500/10 text-emerald-200",
                        )}>
                          {overdueMatches.length}
                        </span>
                      </div>

                      {overdueMatches.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {overdueMatches.slice(0, 3).map((match) => (
                            <div key={match.id} className={cn(vv.inset, "px-3 py-2.5")}>
                              <div className="text-sm font-black text-white/80">
                                {getTeamName(match, true)} vs. {getTeamName(match, false)}
                              </div>
                              <div className="mt-0.5 text-xs font-semibold text-white/35">
                                {new Date(match.match_date).toLocaleDateString("de-AT")}
                                {match.match_time ? ` · ${String(match.match_time).slice(0, 5)} Uhr` : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 text-xs font-bold text-emerald-200/70">Aktuell alles erledigt.</div>
                      )}
                    </button>
                  </div>
                </section>

                <section className={vv.surface}>
                  <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className={vv.label}>Aktuelle Saison</div>
                        <h2 className="mt-1 text-xl font-black text-white">{currentSeason ? seasonLabel(currentSeason) : "Keine aktive Saison"}</h2>
                        <p className="mt-1 text-sm font-semibold text-white/38">Sportdarts ist die führende Quelle für Spielplan und Ergebnisse.</p>
                      </div>
                      <Dialog open={isSeasonDialogOpen} onOpenChange={setIsSeasonDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className={vv.buttonSecondary}>
                            <Plus className="mr-2 h-4 w-4" />Neue Saison
                          </Button>
                        </DialogTrigger>
                        <DialogContent className={vv.modalSmall}>
                          <DialogHeader className={vv.modalHeader}>
                            <DialogTitle>Neue Saison erstellen</DialogTitle>
                          </DialogHeader>
                          <div className={vv.modalBody}>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="season-name">Name</Label>
                                <Input id="season-name" className={vv.input} value={newSeason.name} onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })} placeholder="z. B. Herbstmeisterschaft" />
                              </div>
                              <div>
                                <Label>Jahr</Label>
                                <Input type="number" className={vv.input} value={newSeason.year} onChange={(e) => setNewSeason({ ...newSeason, year: Number(e.target.value) || new Date().getFullYear() })} />
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div><Label>Startdatum</Label><Input type="date" className={vv.input} value={newSeason.start_date} onChange={(e) => setNewSeason({ ...newSeason, start_date: e.target.value })} /></div>
                                <div><Label>Enddatum</Label><Input type="date" className={vv.input} value={newSeason.end_date} onChange={(e) => setNewSeason({ ...newSeason, end_date: e.target.value })} /></div>
                              </div>
                            </div>
                          </div>
                          <div className={vv.modalFooter}>
                            <Button variant="outline" className={vv.buttonSecondary} onClick={() => setIsSeasonDialogOpen(false)}>Abbrechen</Button>
                            <Button className={vv.buttonPrimary} onClick={createSeason} disabled={!newSeason.name.trim()}>Saison erstellen</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
                    <div className={cn(vv.card, "p-4")}><div className={vv.label}>Eigene Teams</div><div className="mt-2 text-2xl font-black text-white">{ownTeams.length}</div></div>
                    <div className={cn(vv.card, "p-4")}><div className={vv.label}>Gegner</div><div className="mt-2 text-2xl font-black text-white">{opponentTeams.length}</div></div>
                    <div className={cn(vv.card, "p-4")}><div className={vv.label}>Saisons</div><div className="mt-2 text-2xl font-black text-white">{seasons.length}</div></div>
                  </div>
                </section>

                <section className={vv.surface}>
                  <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
                    <h2 className="text-lg font-black text-white">Saisons</h2>
                  </div>
                  <div className="grid gap-3 p-4 md:grid-cols-2 sm:p-5">
                    {seasons.map((season) => (
                      <div key={season.id} className={cn(vv.cardHover, "p-4")}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-base font-black text-white">{seasonLabel(season)}</div>
                            <div className="mt-1 text-xs font-semibold text-white/35">{new Date(season.start_date).toLocaleDateString("de-AT")} – {new Date(season.end_date).toLocaleDateString("de-AT")}</div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            {season.is_active ? <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-200">Aktiv</span> : season.status === "completed" ? <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-black text-white/45">Abgeschlossen</span> : null}
                          </div>
                        </div>
                        {season.is_active ? (
                          <div className="mt-4">
                            <Button type="button" variant="outline" className={vv.buttonSecondary} onClick={() => void closeSeason(season.id)}>Liga abschließen</Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              </TabsContent>

              {/* MATCHES */}
              <TabsContent value="matches" className="mt-0 space-y-5">
                <section className={vv.surface}>
                  <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className={vv.label}>Sportdarts-Sync</div>
                        <h2 className="mt-1 text-xl font-black text-white">{currentSeason ? `${seasonLabel(currentSeason)} · Spielplan` : "Spielplan"}</h2>
                        <p className="mt-1 text-sm font-semibold text-white/38">Keine manuelle Bearbeitung: Spielplan und Ergebnisse kommen ausschließlich aus Sportdarts.</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                          <SelectTrigger className={cn(vv.select, "w-full sm:w-64")}><SelectValue placeholder="Saison auswählen" /></SelectTrigger>
                          <SelectContent>{seasons.map((season) => <SelectItem key={season.id} value={season.id}>{seasonLabel(season)}</SelectItem>)}</SelectContent>
                        </Select>
                        {selectedSeason ? (
                          <Dialog open={isSportdartsImportOpen} onOpenChange={(open) => { setIsSportdartsImportOpen(open); if (!open) { setSportdartsImportPreview([]); setSportdartsImportMessage("") } }}>
                            <DialogTrigger asChild><Button variant="outline" className={vv.buttonSecondary} onClick={() => { setSportdartsImportPreview([]); setSportdartsImportMessage("") }}><Trophy className="mr-2 h-4 w-4" />Sportdarts-Spielplan</Button></DialogTrigger>
                            <DialogContent className={vv.modal}>
                              <DialogHeader className={vv.modalHeader}><DialogTitle>Sportdarts-Spielplan synchronisieren</DialogTitle></DialogHeader>
                              <div className={vv.modalBody}>
                                <div className="space-y-4">
                                  <div className={cn(vv.inset, "p-4 text-sm font-semibold text-white/55")}>Ziel: <span className="font-black text-white">{currentSeason ? seasonLabel(currentSeason) : "ausgewählte Saison"}</span>. Bestehende Spiele werden beim Import nicht überschrieben.</div>
                                  <Button type="button" className={vv.buttonPrimary} onClick={() => void loadSportdartsImportPreview()} disabled={sportdartsImportLoading || sportdartsImporting}>{sportdartsImportLoading ? "Spielplan wird geladen…" : "Vorschau laden"}</Button>
                                  {sportdartsImportMessage ? <div className={cn(vv.inset, "p-3 text-sm font-semibold text-white/60")}>{sportdartsImportMessage}</div> : null}
                                  {sportdartsImportPreview.length > 0 ? (
                                    <div className="space-y-3">
                                      <div className="max-h-[48vh] overflow-y-auto rounded-[18px] border border-white/[0.07]">
                                        {sportdartsImportPreview.map((row) => (
                                          <div key={`${row.gameId}:${row.ownTeamId}`} className="grid gap-1 border-b border-white/[0.05] px-4 py-3 last:border-b-0 sm:grid-cols-[80px_110px_1fr_1fr_120px] sm:items-center">
                                            <div className="text-xs font-black text-white/40">ST {row.weekNumber}</div>
                                            <div className="text-xs font-bold text-white/55">{row.date.split("-").reverse().join(".")}</div>
                                            <div className="truncate text-sm font-black text-white/80">{row.homeTeam}</div>
                                            <div className="truncate text-sm font-black text-white/80">{row.awayTeam}</div>
                                            <div className="text-xs font-black text-white/40">{row.alreadyExists ? "Vorhanden" : "Neu"}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              <div className={vv.modalFooter}>
                                <Button variant="outline" className={vv.buttonSecondary} onClick={() => setIsSportdartsImportOpen(false)}>Schließen</Button>
                                <Button className={vv.buttonPrimary} onClick={() => void importNewSportdartsGames()} disabled={sportdartsImporting || sportdartsImportPreview.every((row) => row.alreadyExists)}>{sportdartsImporting ? "Import läuft…" : `${sportdartsImportPreview.filter((row) => !row.alreadyExists).length} neue Spiele importieren`}</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 sm:p-5">
                    {!selectedSeason ? (
                      <div className={cn(vv.inset, "p-8 text-center text-sm font-semibold text-white/35")}>Bitte eine Saison auswählen.</div>
                    ) : filteredMatches.length === 0 ? (
                      <div className={cn(vv.inset, "p-8 text-center text-sm font-semibold text-white/35")}>Noch keine Spiele vorhanden. Lade den Spielplan über Sportdarts.</div>
                    ) : (
                      <div className="space-y-4">
                        {Object.values(groupedMatches).map(({ team, matches: teamMatches }) => (
                          <Collapsible key={team.id} defaultOpen>
                            <div className={cn(vv.card, "overflow-hidden")}>
                              <CollapsibleTrigger asChild>
                                <button type="button" className="flex w-full items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-4 text-left sm:px-5">
                                  <div className="min-w-0">
                                    <div className="text-base font-black text-white">{team.name}</div>
                                    <div className="mt-0.5 text-xs font-semibold text-white/35">{teamMatches.length} Spiele</div>
                                  </div>
                                  <ChevronDown className="h-4 w-4 shrink-0 text-white/35" />
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="space-y-2 p-3 sm:p-4">
                                  {teamMatches.map((match) => {
                                    const shownStatus = match.status
                                    const shownHome = match.home_score
                                    const shownAway = match.away_score

                                    return (
                                      <div key={match.id} className="rounded-[18px] border border-white/[0.07] bg-white/[0.025] p-4">
                                        <div className="grid gap-3 lg:grid-cols-[150px_minmax(0,1fr)_auto] lg:items-center">
                                          <div className="text-xs font-bold text-white/42">
                                            <div>Spieltag {match.week_number}</div>

                                            {shownStatus === "postponed" && match.original_date ? (
                                              <div className="mt-2 space-y-1.5">
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/25">
                                                    Ursprünglich
                                                  </span>
                                                  <span className="line-through decoration-red-400/70 text-white/35">
                                                    {new Date(match.original_date).toLocaleDateString("de-AT")}
                                                  </span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-300/70">
                                                    Neuer Termin
                                                  </span>
                                                  <span className="font-black text-amber-100">
                                                    {new Date(match.match_date).toLocaleDateString("de-AT")}
                                                    {match.match_time ? ` · ${String(match.match_time).slice(0, 5)} Uhr` : ""}
                                                  </span>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="mt-1">
                                                {new Date(match.match_date).toLocaleDateString("de-AT")}
                                                {match.match_time ? ` · ${String(match.match_time).slice(0, 5)}` : ""}
                                              </div>
                                            )}
                                          </div>

                                          <div className="min-w-0">
                                            <div className="truncate text-sm font-black text-white/88">
                                              {getTeamName(match, true)} <span className="text-white/25">vs.</span> {getTeamName(match, false)}
                                            </div>
                                            <div className="mt-1 truncate text-xs font-semibold text-white/30">
                                              {match.venue || "Spielort noch nicht hinterlegt"}
                                            </div>

                                            {shownStatus === "postponed" && match.postponement_reason ? (
                                              <div className="mt-2 inline-flex max-w-full items-center rounded-full border border-amber-300/10 bg-amber-500/[0.07] px-2.5 py-1 text-[10px] font-bold text-amber-100/70">
                                                <span className="mr-1 text-amber-300/70">Grund:</span>
                                                <span className="truncate">{match.postponement_reason}</span>
                                              </div>
                                            ) : null}
                                          </div>

                                          <div className="flex items-center gap-3 lg:justify-end">
                                            {shownStatus === "completed" ? (
                                              <div className="font-mono text-lg font-black text-white">
                                                {shownHome ?? "–"}:{shownAway ?? "–"}
                                              </div>
                                            ) : null}

                                            <span
                                              className={cn(
                                                "rounded-full border px-2.5 py-1 text-[11px] font-black",
                                                shownStatus === "completed"
                                                  ? "border-emerald-300/10 bg-emerald-500/10 text-emerald-200"
                                                  : shownStatus === "live"
                                                    ? "border-red-300/10 bg-red-500/10 text-red-200"
                                                    : shownStatus === "postponed"
                                                      ? "border-amber-300/15 bg-amber-500/10 text-amber-200"
                                                      : "border-sky-300/10 bg-sky-500/10 text-sky-200",
                                              )}
                                            >
                                              {shownStatus === "completed"
                                                ? "Beendet"
                                                : shownStatus === "live"
                                                  ? "Live"
                                                  : shownStatus === "postponed"
                                                    ? "Verschoben"
                                                    : "Geplant"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="lineups" className="mt-0 space-y-5">
                <section className={vv.surface}>
                  <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div><div className={vv.label}>Ligaplanung</div><h2 className="mt-1 text-xl font-black text-white">Aufstellungen & Zusagen</h2><p className="mt-1 text-sm font-semibold text-white/38">Pro Spiel aufklappen: Zusagen, offene Antworten und bestätigte Aufstellung auf einen Blick.</p></div>
                      <Button variant="outline" className={vv.buttonSecondary} onClick={() => void fetchPlanningData()} disabled={planningLoading}>{planningLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Aktualisieren</Button>
                    </div>
                  </div>
                  <div className="space-y-3 p-3 sm:p-5">
                    {planningLoading ? <div className={cn(vv.inset,"p-10 text-center text-sm font-bold text-white/35")}>Aufstellungen werden geladen …</div> : upcomingPlanningMatches.length === 0 ? <div className={cn(vv.inset,"p-10 text-center text-sm font-bold text-white/35")}>Keine kommenden Ligaspiele.</div> : upcomingPlanningMatches.flatMap((match) => getOwnTeamContexts(match).map(({teamId,teamName}) => {
                      const summary = getPlanningSummary(match, teamId)
                      const label = summary.confirmed ? "Bestätigt" : summary.stale ? "Bestätigung veraltet" : summary.lineup.length > 0 ? "Entwurf" : "Keine Aufstellung"
                      return (
                        <Collapsible key={`${match.id}:${teamId}`}>
                          <div className={cn(vv.cardHover,"overflow-hidden")}>
                            <CollapsibleTrigger asChild>
                              <button type="button" className="flex w-full flex-col gap-3 p-4 text-left sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-black text-orange-200">{teamName}</span><span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-black text-white/45">{match.dart_type === "edart" ? "E-Dart" : "Steeldart"}</span></div><div className="mt-2 truncate text-base font-black text-white">{getTeamName(match,true)} <span className="text-white/25">vs.</span> {getTeamName(match,false)}</div><div className="mt-1 text-xs font-semibold text-white/35">{new Date(match.match_date).toLocaleDateString("de-AT")}{match.match_time ? ` · ${String(match.match_time).slice(0,5)} Uhr` : ""}</div></div>
                                <div className="flex flex-wrap items-center gap-2 lg:justify-end"><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-200">Ja {summary.counts.yes}</span><span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-black text-amber-200">Notfall {summary.counts.maybe}</span><span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-black text-red-200">Nein {summary.counts.no}</span><span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-black text-white/45">Offen {summary.counts.none}</span><span className={cn("rounded-full px-2.5 py-1 text-[11px] font-black", summary.confirmed ? "bg-emerald-500/10 text-emerald-200" : summary.lineup.length > 0 ? "bg-amber-500/10 text-amber-200" : "bg-white/[0.05] text-white/45")}>{label}</span><ChevronDown className="h-4 w-4 text-white/30" /></div>
                              </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="grid gap-4 border-t border-white/[0.06] p-4 sm:p-5 xl:grid-cols-[1.2fr_.8fr]">
                                <div className={cn(vv.inset,"p-3 sm:p-4")}><div className={vv.label}>Zusagen</div><div className="mt-3 grid gap-2 sm:grid-cols-2">{summary.members.map((member:any) => { const status = summary.availabilityByPlayer.get(member.player_id)?.status ?? "none"; return <div key={member.player_id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5"><div className="min-w-0"><div className="truncate text-sm font-black text-white/85">{member.club_players?.name || "Spieler"}</div>{member.role === "Captain" || member.role === "Co-Captain" ? <div className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-orange-200/45">{member.role}</div> : null}</div><span className={cn("rounded-full px-2.5 py-1 text-[11px] font-black",status === "yes" ? "bg-emerald-500/10 text-emerald-200" : status === "maybe" ? "bg-amber-500/10 text-amber-200" : status === "no" ? "bg-red-500/10 text-red-200" : "bg-white/[0.05] text-white/35")}>{status === "yes" ? "Ja" : status === "maybe" ? "Nur wenn nötig" : status === "no" ? "Nein" : "Keine Antwort"}</span></div> })}</div></div>
                                <div className={cn(vv.inset,"p-3 sm:p-4")}>
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className={vv.label}>Aufstellung</div>
                                      <div className="mt-1 text-base font-black text-white">{label}</div>
                                    </div>
                                    <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-black text-white/50">
                                      {summary.startersCount}/{summary.requiredStarters} Starter
                                    </span>
                                  </div>

                                  <div className="mt-3 space-y-2">
                                    {summary.lineup.length === 0 ? (
                                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-3 text-sm font-semibold text-white/35">
                                        Noch keine Aufstellung gespeichert.
                                      </div>
                                    ) : (
                                      summary.lineup.map((row:any) => {
                                        const member = summary.members.find((item:any) => item.player_id === row.player_id)
                                        return (
                                          <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                                            <span className="truncate text-sm font-bold text-white/80">{member?.club_players?.name || "Spieler"}</span>
                                            <span className={cn("text-[11px] font-black",row.is_substitute ? "text-sky-200" : "text-orange-200")}>
                                              {row.is_substitute ? "Reserve" : `Starter ${row.position}`}
                                            </span>
                                          </div>
                                        )
                                      })
                                    )}
                                  </div>

                                  {!summary.confirmed ? (
                                    <div className="mt-4 space-y-2">
                                      <Button
                                        type="button"
                                        className="w-full rounded-xl border border-red-300/25 bg-red-500/10 font-black text-red-100 shadow-[0_0_20px_rgba(239,68,68,.10)] hover:bg-red-500/20"
                                        onClick={() => openLineupAlertDialog(match, teamId, teamName, summary.members)}
                                      >
                                        <BellRing className="mr-2 h-4 w-4" />
                                        EMD Alert senden
                                      </Button>

                                      {onOpenMailbox ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          className={cn(vv.buttonSecondary, "w-full")}
                                          onClick={() =>
                                            onOpenMailbox({
                                              recipientMode: "captains",
                                              recipientTeamId: teamId,
                                              subject: `Aufstellung offen · ${getTeamName(match, true)} vs. ${getTeamName(match, false)}`,
                                              body: `Für das Ligaspiel am ${new Date(match.match_date).toLocaleDateString("de-AT")}${match.match_time ? ` um ${String(match.match_time).slice(0, 5)} Uhr` : ""} ist für ${teamName} noch keine bestätigte Aufstellung hinterlegt. Bitte prüft die Aufstellung und gebt kurz Bescheid.`,
                                              category: "lineup",
                                              priority: "important",
                                              matchId: match.id,
                                              seasonId: match.season_id,
                                            })
                                          }
                                        >
                                          <Inbox className="mr-2 h-4 w-4" />
                                          Kapitän & Co-Kapitän anschreiben
                                        </Button>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      )
                    }))}
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="overdue" className="mt-0 space-y-5">
                <section className={vv.surface}>
                  <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className={vv.label}>Offene Ergebnisse</div>
                        <h2 className="mt-1 text-xl font-black text-white">Überfällige Ligaspiele</h2>
                        <p className="mt-1 text-sm font-semibold text-white/38">
                          Hier siehst du Spiele, deren Termin seit mindestens 24 Stunden vorbei ist und für die noch kein abgeschlossenes Ergebnis vorliegt.
                          Bei verschobenen Spielen zählt immer der neue Spieltermin.
                        </p>
                      </div>
                      <span className="w-fit rounded-full border border-amber-300/15 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-100">
                        {overdueMatches.length} offen
                      </span>
                    </div>
                  </div>

                  <div className="p-3 sm:p-5">
                    {overdueMatches.length === 0 ? (
                      <div className={cn(vv.inset, "p-10 text-center")}>
                        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-300/70" />
                        <div className="mt-3 font-black text-white">Keine überfälligen Spiele</div>
                        <div className="mt-1 text-sm font-semibold text-white/35">
                          Aktuell ist in unserer App kein Spiel seit mindestens 24 Stunden offen.
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {overdueMatches.map((match) => {
                          const startMs = getMatchStartMs(match)
                          const hours = Number.isFinite(startMs)
                            ? Math.max(24, Math.floor((Date.now() - startMs) / 3600000))
                            : 24

                          return (
                            <Collapsible key={match.id}>
                              <div className={cn(vv.cardHover, "overflow-hidden")}>
                                <CollapsibleTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex w-full flex-col gap-3 p-4 text-left sm:p-5 lg:flex-row lg:items-center lg:justify-between"
                                  >
                                    <div>
                                      <div className="flex flex-wrap gap-2">
                                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-black text-amber-200">
                                          {hours}h überfällig
                                        </span>
                                        <span className={cn(
                                          "rounded-full border px-2.5 py-1 text-[11px] font-black",
                                          match.status === "postponed"
                                            ? "border-amber-300/15 bg-amber-500/10 text-amber-200"
                                            : match.status === "live"
                                              ? "border-red-300/10 bg-red-500/10 text-red-200"
                                              : "border-sky-300/10 bg-sky-500/10 text-sky-200",
                                        )}>
                                          {match.status === "postponed"
                                            ? "Verschoben"
                                            : match.status === "live"
                                              ? "Live"
                                              : "Geplant"}
                                        </span>
                                      </div>

                                      <div className="mt-2 text-base font-black text-white">
                                        {getTeamName(match, true)} <span className="text-white/25">vs.</span>{" "}
                                        {getTeamName(match, false)}
                                      </div>

                                      {match.status === "postponed" && match.original_date ? (
                                        <div className="mt-2 space-y-1 text-xs font-semibold">
                                          <div className="flex flex-wrap items-center gap-2 text-white/30">
                                            <span>Ursprünglich:</span>
                                            <span className="line-through decoration-red-400/70">
                                              {new Date(match.original_date).toLocaleDateString("de-AT")}
                                            </span>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2 text-amber-100/80">
                                            <span className="font-black">Neuer Termin:</span>
                                            <span>
                                              {new Date(match.match_date).toLocaleDateString("de-AT")}
                                              {match.match_time ? ` · ${String(match.match_time).slice(0, 5)} Uhr` : ""}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="mt-1 text-xs font-semibold text-white/35">
                                          {new Date(match.match_date).toLocaleDateString("de-AT")}
                                          {match.match_time ? ` · ${String(match.match_time).slice(0, 5)} Uhr` : ""}
                                        </div>
                                      )}
                                    </div>

                                    <ChevronDown className="h-4 w-4 text-white/30" />
                                  </button>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                  <div className="grid gap-3 border-t border-white/[0.06] p-4 text-sm sm:grid-cols-3 sm:p-5">
                                    <div className={cn(vv.inset, "p-3")}>
                                      <div className={vv.label}>Spielstatus</div>
                                      <div className="mt-1 font-black text-white/80">
                                        {match.status === "postponed"
                                          ? "Verschoben"
                                          : match.status === "live"
                                            ? "Live"
                                            : "Geplant"}
                                      </div>
                                    </div>

                                    <div className={cn(vv.inset, "p-3")}>
                                      <div className={vv.label}>Ergebnis</div>
                                      <div className="mt-1 font-black text-white/80">
                                        {match.home_score === null || match.away_score === null
                                          ? "Noch kein Ergebnis"
                                          : `${match.home_score}:${match.away_score}`}
                                      </div>
                                    </div>

                                    <div className={cn(vv.inset, "p-3")}>
                                      <div className={vv.label}>Überfällig</div>
                                      <div className="mt-1 font-black text-amber-200">
                                        Seit mindestens 24 Stunden offen
                                      </div>
                                    </div>
                                  </div>

                                  {onOpenMailbox ? (
                                    <div className="flex flex-wrap gap-2 border-t border-white/[0.06] px-4 py-4 sm:px-5">
                                      {getOwnTeamContexts(match).map(({ teamId, teamName }) => (
                                        <Button
                                          key={teamId}
                                          type="button"
                                          variant="outline"
                                          className={vv.buttonSecondary}
                                          onClick={() =>
                                            onOpenMailbox({
                                              recipientMode: "captains",
                                              recipientTeamId: teamId,
                                              subject: `Ergebnis offen · ${getTeamName(match, true)} vs. ${getTeamName(match, false)}`,
                                              body: `Für das Ligaspiel vom ${new Date(match.match_date).toLocaleDateString("de-AT")}${match.match_time ? ` um ${String(match.match_time).slice(0, 5)} Uhr` : ""} ist noch kein abgeschlossenes Ergebnis hinterlegt. Bitte prüft das Ergebnis und gebt kurz Bescheid.`,
                                              category: "result",
                                              priority: "important",
                                              matchId: match.id,
                                              seasonId: match.season_id,
                                            })
                                          }
                                        >
                                          <Inbox className="mr-2 h-4 w-4" />
                                          {teamName}: Kapitän anschreiben
                                        </Button>
                                      ))}
                                    </div>
                                  ) : null}
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="teams" className="mt-0 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Eigene Teams
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        Sportdarts-Division pro Saison zuordnen. Teamnamen bleiben unverändert.
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 rounded-xl border bg-muted/20 p-3">
                        <Label className="text-xs text-muted-foreground">Saison für die Zuordnung</Label>
                        <Select value={sportdartsAssignmentSeason} onValueChange={setSportdartsAssignmentSeason}>
                          <SelectTrigger className="mt-1 rounded-xl">
                            <SelectValue placeholder="Saison auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {seasons.map((season) => (
                              <SelectItem key={season.id} value={season.id}>
                                {seasonLabel(season)}{season.is_active ? " · Aktiv" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Sportdarts-Saison: Herbstsaison 2026 (ID {SPORTDARTS_CURRENT_SEASON_ID})
                        </div>
                      </div>

                      {sportdartsAssignmentMessage && (
                        <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">
                          {sportdartsAssignmentMessage}
                        </div>
                      )}

                      <div className="space-y-3">
                        {ownTeams.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">Keine eigenen Teams gefunden</p>
                        ) : (
                          ownTeams.map((team) => {
                            const assignment = sportdartsAssignmentSeason
                              ? getSportdartsAssignment(team.id, sportdartsAssignmentSeason)
                              : null
                            const saveKey = `${sportdartsAssignmentSeason}:${team.id}`
                            const isSaving = sportdartsSavingKey === saveKey

                            return (
                              <div key={team.id} className="rounded-xl border p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <Users className="h-4 w-4 text-blue-600 shrink-0" />
                                    <div className="min-w-0">
                                      <div className="font-medium truncate">{team.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {assignment
                                          ? `Sportdarts: ${assignment.sportdarts_division_name}`
                                          : "Noch keine Sportdarts-Division zugeordnet"}
                                      </div>
                                    </div>
                                  </div>
                                  <Badge variant={assignment ? "default" : "secondary"}>
                                    {assignment ? "Zugeordnet" : "Offen"}
                                  </Badge>
                                </div>

                                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                  <Select
                                    value={assignment ? String(assignment.sportdarts_division_id) : ""}
                                    onValueChange={(value) => void saveSportdartsDivision(team.id, value)}
                                    disabled={!sportdartsAssignmentSeason || isSaving}
                                  >
                                    <SelectTrigger className="w-full rounded-xl">
                                      <SelectValue placeholder="Sportdarts-Division auswählen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {SPORTDARTS_DIVISIONS.map((division) => (
                                        <SelectItem key={division.id} value={String(division.id)}>
                                          {division.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  {assignment && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="rounded-xl text-red-600 hover:text-red-700"
                                      disabled={isSaving}
                                      onClick={() => void removeSportdartsDivision(team.id)}
                                    >
                                      Zuordnung entfernen
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Gegnerische Mannschaften
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                          <Input
                            placeholder="Neues Gegnerteam..."
                            value={newOpponentTeam}
                            onChange={(e) => setNewOpponentTeam(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && createOpponentTeam()}
                            className="rounded-xl md:col-span-2"
                          />
                          <Input
                            placeholder="Lokal..."
                            value={newOpponentTeamVenueName}
                            onChange={(e) => setNewOpponentTeamVenueName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && createOpponentTeam()}
                            className="rounded-xl"
                          />
                          <Input
                            placeholder="Adresse..."
                            value={newOpponentTeamVenue}
                            onChange={(e) => setNewOpponentTeamVenue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && createOpponentTeam()}
                            className="rounded-xl"
                          />
                          <div className="flex gap-2 md:col-span-1">
                            <Input
                              placeholder="Kapitän Tel..."
                              value={newOpponentTeamCaptainPhone}
                              onChange={(e) => setNewOpponentTeamCaptainPhone(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && createOpponentTeam()}
                              className="rounded-xl"
                            />
                            <Button onClick={createOpponentTeam} className="rounded-xl" size="sm" aria-label="Hinzufügen">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {opponentTeams.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">Keine Gegnerteams vorhanden</p>
                          ) : (
                            opponentTeams.map((team) => (
                              <div key={team.id} className="flex items-start justify-between p-3 border rounded-xl gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                  <Users className="h-4 w-4 text-orange-600 mt-1 shrink-0" />

                                  {editingOpponentTeam === team.id ? (
                                    <div className="flex gap-2 flex-1 flex-wrap">
                                      <Input
                                        value={editOpponentTeamName}
                                        onChange={(e) => setEditOpponentTeamName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && updateOpponentTeam(team.id)}
                                        className="min-w-[160px] rounded-xl"
                                      />
                                      <Input
                                        value={editOpponentTeamVenueName}
                                        onChange={(e) => setEditOpponentTeamVenueName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && updateOpponentTeam(team.id)}
                                        placeholder="Lokal..."
                                        className="min-w-[160px] rounded-xl"
                                      />
                                      <Input
                                        value={editOpponentTeamVenue}
                                        onChange={(e) => setEditOpponentTeamVenue(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && updateOpponentTeam(team.id)}
                                        placeholder="Adresse..."
                                        className="min-w-[200px] rounded-xl"
                                      />
                                      <Input
                                        value={editOpponentTeamCaptainPhone}
                                        onChange={(e) => setEditOpponentTeamCaptainPhone(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && updateOpponentTeam(team.id)}
                                        placeholder="Kapitän Tel..."
                                        className="min-w-[160px] rounded-xl"
                                      />
                                    </div>
                                  ) : (
                                    <div className="min-w-0">
                                      <span className="font-medium">{team.name}</span>
                                      {team.venue_name && (
                                        <div className="text-sm text-muted-foreground">Lokal: {team.venue_name}</div>
                                      )}
                                      {team.venue && <div className="text-sm text-muted-foreground">Adresse: {team.venue}</div>}
                                      {team.captain_phone && (
                                        <div className="text-sm text-muted-foreground">Kapitän: {team.captain_phone}</div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="secondary">Gegner</Badge>
                                  {editingOpponentTeam === team.id ? (
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="outline" onClick={() => updateOpponentTeam(team.id)} className="rounded-lg">
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="rounded-lg"
                                        onClick={() => {
                                          setEditingOpponentTeam(null)
                                          setEditOpponentTeamName("")
                                          setEditOpponentTeamVenueName("")
                                          setEditOpponentTeamVenue("")
                                          setEditOpponentTeamCaptainPhone("")
                                        }}
                                      >
                                        ✕
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => startEditingOpponentTeam(team)}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700 rounded-lg"
                                        onClick={() => deleteOpponentTeam(team.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* VENUES */}
              <TabsContent value="venues" className="mt-0 space-y-5">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Lokale (aus Gegnerteams)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                        <div className="flex-1">
                          <Input
                            className="rounded-xl"
                            placeholder="Suchen (Lokal, Adresse, Mannschaft)..."
                            value={venueSearch}
                            onChange={(e) => setVenueSearch(e.target.value)}
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {filteredVenues.length} {filteredVenues.length === 1 ? "Lokal" : "Lokale"}
                        </div>
                      </div>

                      {filteredVenues.length === 0 ? (
                        <div className="text-muted-foreground text-center py-8">Keine Lokale gefunden.</div>
                      ) : (
                        <div className="space-y-2">
                          {filteredVenues.map((v) => (
                            <Collapsible key={v.key}>
                              <div className="flex items-start justify-between gap-3 p-3 border rounded-xl">
                                <div className="flex items-start gap-3 min-w-0">
                                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{v.name ? v.name : "(Ohne Lokalname)"}</div>
                                    {v.address ? (
                                      <div className="text-sm text-muted-foreground truncate">{v.address}</div>
                                    ) : (
                                      <div className="text-sm text-muted-foreground">(Ohne Adresse)</div>
                                    )}
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Wird genutzt von {v.teams.length} {v.teams.length === 1 ? "Mannschaft" : "Mannschaften"}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="secondary">{v.teams.length}</Badge>
                                  <Button
                                    size="sm"
                                    className="rounded-xl"
                                    onClick={() => {
                                      setVenueToAssign({ name: v.name, address: v.address })
                                      setVenueAssignTeamId("")
                                      setVenueAssignTeamSearch("")
                                      setIsVenueAssignDialogOpen(true)
                                    }}
                                  >
                                    Zum Team hinzufügen
                                  </Button>
                                  <CollapsibleTrigger asChild>
                                    <Button size="sm" variant="outline" className="rounded-xl" aria-label="Aufklappen">
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </CollapsibleTrigger>
                                </div>
                              </div>

                              <CollapsibleContent>
                                <div className="px-3 pb-3">
                                  <div className="rounded-xl border bg-muted/30 p-3">
                                    <div className="text-sm font-medium mb-2">Mannschaften</div>
                                    <div className="flex flex-wrap gap-2">
                                      {v.teams
                                        .slice()
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map((t) => (
                                          <Badge key={t.id} variant="outline">
                                            {t.name}
                                          </Badge>
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Dialog open={isVenueAssignDialogOpen} onOpenChange={setIsVenueAssignDialogOpen}>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Lokal zu Gegnerteam hinzufügen</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="rounded-xl border p-3">
                        <div className="text-sm font-medium">Ausgewähltes Lokal</div>
                        <div className="mt-1">
                          <div className="font-semibold">{venueToAssign?.name ? venueToAssign.name : "(Ohne Lokalname)"}</div>
                          {venueToAssign?.address ? (
                            <div className="text-sm text-muted-foreground">{venueToAssign.address}</div>
                          ) : (
                            <div className="text-sm text-muted-foreground">(Ohne Adresse)</div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Gegnerteam auswählen</Label>
                        <Input
                          className="rounded-xl"
                          placeholder="Team suchen..."
                          value={venueAssignTeamSearch}
                          onChange={(e) => setVenueAssignTeamSearch(e.target.value)}
                        />

                        <Select value={venueAssignTeamId} onValueChange={setVenueAssignTeamId}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Gegnerteam auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredOpponentTeamsForVenueAssign.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => {
                            setIsVenueAssignDialogOpen(false)
                            setVenueToAssign(null)
                            setVenueAssignTeamId("")
                            setVenueAssignTeamSearch("")
                          }}
                        >
                          Abbrechen
                        </Button>

                        <Button
                          className="rounded-xl"
                          disabled={!venueToAssign || !venueAssignTeamId}
                          onClick={async () => {
                            if (!venueToAssign || !venueAssignTeamId) return
                            await applyVenueToOpponentTeam(venueAssignTeamId, venueToAssign)
                            setIsVenueAssignDialogOpen(false)
                            setVenueToAssign(null)
                            setVenueAssignTeamId("")
                            setVenueAssignTeamSearch("")
                          }}
                        >
                          Speichern
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            </div>

            <Dialog
              open={Boolean(lineupAlertDialog)}
              onOpenChange={(open) => {
                if (!open && !lineupAlertSending) {
                  setLineupAlertDialog(null)
                  setLineupAlertSelectedRecipient(null)
                  setLineupAlertError("")
                  setLineupAlertLogs([])
                }
              }}
            >
              <DialogContent className="max-h-[92dvh] max-w-md overflow-y-auto rounded-[26px] border border-red-300/15 bg-[#090b10] text-white shadow-[0_28px_100px_-42px_rgba(239,68,68,.55)]">
                <DialogHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-300/20 bg-red-500/10">
                    <BellRing className="h-6 w-6 text-red-200" />
                  </div>
                  <DialogTitle className="text-xl font-black text-white">EMD Alert senden</DialogTitle>
                </DialogHeader>

                {lineupAlertDialog ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-red-200/60">
                        Aufstellung noch nicht bestätigt
                      </div>
                      <div className="mt-1 font-black text-white">{lineupAlertDialog.matchTitle}</div>
                      <div className="mt-1 text-xs font-semibold text-white/40">
                        {lineupAlertDialog.teamName} · {lineupAlertDialog.matchDate}
                        {lineupAlertDialog.matchTime ? ` · ${lineupAlertDialog.matchTime} Uhr` : ""}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                        Empfänger auswählen
                      </div>

                      <div className="grid gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!lineupAlertDialog.captainName || lineupAlertSending}
                          onClick={() => setLineupAlertSelectedRecipient("captain")}
                          className={cn(
                            "h-auto min-h-12 justify-between rounded-xl px-4 py-3 text-left transition-all",
                            lineupAlertSelectedRecipient === "captain"
                              ? "border-red-300/45 bg-red-500/18 text-red-50 shadow-[0_0_24px_rgba(239,68,68,.18)]"
                              : "border-white/10 bg-white/[0.035] text-white hover:border-red-300/20 hover:bg-white/[0.06]",
                          )}
                        >
                          <span>
                            <span className="block font-black">Nur Kapitän</span>
                            <span className={cn(
                              "mt-0.5 block text-xs font-semibold",
                              lineupAlertSelectedRecipient === "captain" ? "text-red-100/75" : "text-white/40",
                            )}>
                              {lineupAlertDialog.captainName || "Kein Kapitän hinterlegt"}
                            </span>
                          </span>
                          <BellRing className={cn(
                            "h-4 w-4",
                            lineupAlertSelectedRecipient === "captain" ? "text-red-100" : "text-red-200/65",
                          )} />
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={!lineupAlertDialog.coCaptainName || lineupAlertSending}
                          onClick={() => setLineupAlertSelectedRecipient("co_captain")}
                          className={cn(
                            "h-auto min-h-12 justify-between rounded-xl px-4 py-3 text-left transition-all",
                            lineupAlertSelectedRecipient === "co_captain"
                              ? "border-red-300/45 bg-red-500/18 text-red-50 shadow-[0_0_24px_rgba(239,68,68,.18)]"
                              : "border-white/10 bg-white/[0.035] text-white hover:border-red-300/20 hover:bg-white/[0.06]",
                          )}
                        >
                          <span>
                            <span className="block font-black">Nur Co-Kapitän</span>
                            <span className={cn(
                              "mt-0.5 block text-xs font-semibold",
                              lineupAlertSelectedRecipient === "co_captain" ? "text-red-100/75" : "text-white/40",
                            )}>
                              {lineupAlertDialog.coCaptainName || "Kein Co-Kapitän hinterlegt"}
                            </span>
                          </span>
                          <BellRing className={cn(
                            "h-4 w-4",
                            lineupAlertSelectedRecipient === "co_captain" ? "text-red-100" : "text-red-200/65",
                          )} />
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={
                            (!lineupAlertDialog.captainName && !lineupAlertDialog.coCaptainName) ||
                            lineupAlertSending
                          }
                          onClick={() => setLineupAlertSelectedRecipient("both")}
                          className={cn(
                            "h-auto min-h-12 justify-between rounded-xl px-4 py-3 text-left transition-all",
                            lineupAlertSelectedRecipient === "both"
                              ? "border-red-300/45 bg-red-500/18 text-red-50 shadow-[0_0_24px_rgba(239,68,68,.18)]"
                              : "border-white/10 bg-white/[0.035] text-white hover:border-red-300/20 hover:bg-white/[0.06]",
                          )}
                        >
                          <span>
                            <span className="block font-black">An beide</span>
                            <span className={cn(
                              "mt-0.5 block text-xs font-semibold",
                              lineupAlertSelectedRecipient === "both" ? "text-red-100/75" : "text-white/40",
                            )}>
                              Kapitän + Co-Kapitän
                            </span>
                          </span>
                          <BellRing className={cn(
                            "h-4 w-4",
                            lineupAlertSelectedRecipient === "both" ? "text-red-100" : "text-red-200/65",
                          )} />
                        </Button>
                      </div>
                    </div>

                    {lineupAlertSelectedRecipient ? (
                      <div className="rounded-xl border border-red-300/15 bg-red-500/[0.06] px-3 py-2.5 text-xs font-bold text-red-100/75">
                        Ausgewählt:{" "}
                        {lineupAlertSelectedRecipient === "captain"
                          ? `Kapitän · ${lineupAlertDialog.captainName}`
                          : lineupAlertSelectedRecipient === "co_captain"
                            ? `Co-Kapitän · ${lineupAlertDialog.coCaptainName}`
                            : `Kapitän + Co-Kapitän · ${[lineupAlertDialog.captainName, lineupAlertDialog.coCaptainName].filter(Boolean).join(" + ")}`}
                      </div>
                    ) : null}

                    <Button
                      type="button"
                      disabled={!lineupAlertSelectedRecipient || lineupAlertSending}
                      onClick={() => void sendLineupConfirmationAlert()}
                      className={cn(
                        "h-14 w-full rounded-2xl border font-black uppercase tracking-[0.08em] transition-all",
                        lineupAlertSelectedRecipient
                          ? "border-red-200/35 bg-red-600 text-white shadow-[0_0_28px_rgba(239,68,68,.28)] hover:bg-red-500"
                          : "border-white/10 bg-white/[0.04] text-white/25",
                      )}
                    >
                      {lineupAlertSending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          EMD Alert wird gesendet …
                        </>
                      ) : (
                        <>
                          <BellRing className="mr-2 h-5 w-5" />
                          EMD Alert senden
                        </>
                      )}
                    </Button>

                    {lineupAlertError ? (
                      <div className="rounded-xl border border-red-300/15 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-100">
                        {lineupAlertError}
                      </div>
                    ) : null}

                    <div className="border-t border-white/[0.07] pt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.14em] text-white/35">
                            Versandlog
                          </div>
                          <div className="mt-0.5 text-xs font-semibold text-white/25">
                            Letzte EMD Alerts für dieses Spiel
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={lineupAlertLogsLoading}
                          onClick={() => void loadLineupAlertLogs(lineupAlertDialog.matchId, lineupAlertDialog.teamId)}
                          className="h-8 rounded-xl border-white/10 bg-white/[0.03] px-3 text-xs text-white/55"
                        >
                          {lineupAlertLogsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Neu laden"}
                        </Button>
                      </div>

                      {lineupAlertLogsLoading && lineupAlertLogs.length === 0 ? (
                        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-xs font-semibold text-white/30">
                          Versandlog wird geladen …
                        </div>
                      ) : lineupAlertLogs.length === 0 ? (
                        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-xs font-semibold text-white/30">
                          Für dieses Spiel wurde noch kein EMD Alert protokolliert.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {lineupAlertLogs.map((row) => {
                            const modeLabel =
                              row.recipient_mode === "captain"
                                ? "Kapitän"
                                : row.recipient_mode === "co_captain"
                                  ? "Co-Kapitän"
                                  : "Beide"

                            return (
                              <div
                                key={row.id}
                                className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-xs font-black text-white">
                                      {modeLabel}
                                      {row.recipient_names?.length
                                        ? ` · ${row.recipient_names.join(" + ")}`
                                        : ""}
                                    </div>
                                    <div className="mt-1 text-[11px] font-semibold text-white/30">
                                      {new Date(row.created_at).toLocaleString("de-AT")} · Geräte {row.targeted_devices}
                                    </div>
                                  </div>
                                  <div
                                    className={cn(
                                      "shrink-0 rounded-full px-2 py-1 text-[10px] font-black",
                                      row.failed_count > 0
                                        ? "bg-amber-500/10 text-amber-200"
                                        : "bg-emerald-500/10 text-emerald-200",
                                    )}
                                  >
                                    {row.sent_count} gesendet
                                    {row.failed_count > 0 ? ` · ${row.failed_count} Fehler` : ""}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-semibold leading-5 text-white/30">
                      Auswahl allein sendet nichts. Erst der rote Button „EMD Alert senden“ verschickt den Alert.
                    </div>
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>
          </Tabs>
        </div>
      </div>
  )
}
