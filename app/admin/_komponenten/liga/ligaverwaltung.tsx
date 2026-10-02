"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

// ✅ Lazy-load (spart initial load in Apps)
const MatchStatistics = dynamic(() => import("@/components/match-statistics").then((m) => m.MatchStatistics), {
  ssr: false,
})

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
  notes?: string
  home_team: Team
  away_team: Team
  season: Season
  home_opponent_team?: OpponentTeam | null
  away_opponent_team?: OpponentTeam | null
  dart_type: "steeldart" | "edart"
}

type TabKey = "overview" | "matches" | "teams" | "venues"
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

export function LeagueManagement() {
  const [ownTeams, setOwnTeams] = useState<Team[]>([])
  const [opponentTeams, setOpponentTeams] = useState<OpponentTeam[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>("")
  const [loading, setLoading] = useState(true)

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

  // ✅ Tab state (merken)
  const [activeTab, setActiveTab] = useState<TabKey>("overview")
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TAB_STORAGE_KEY) as TabKey | null
      if (saved) setActiveTab(saved)
    } catch {}
  }, [])
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

  // ✅ Derived
  const pastGamesWithoutResults = useMemo(() => {
    const now = new Date()
    return matches.filter((match) => {
      const gameDate = new Date(match.match_date)
      return gameDate < now && (match.home_score === null || match.away_score === null)
    })
  }, [matches])

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
    <div className="w-full mx-auto space-y-4 px-2 sm:px-4">
      {/* Hinweise */}
      {pastGamesWithoutResults.length > 0 && (
        <ToastLike
          type="warning"
          text={`${pastGamesWithoutResults.length} offene Spiele aus der Vergangenheit ohne Ergebnis`}
        />
      )}

      {showSuccessMessage && (
        <ToastLike type="success" text={showSuccessMessage} onClose={() => setShowSuccessMessage("")} />
      )}

      {/* Header */}
      <Card className="border-gray-200 shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-4 sm:p-5">
          <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Ligaspiele
          </CardTitle>
          <div className="text-orange-100 text-sm sm:text-base">Verwalte Mannschaften, Saisons und Spiele</div>
        </CardHeader>

        <CardContent className="p-3 sm:p-5 space-y-4 sm:space-y-6">
          {/* Top Actions */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">
                {seasons.length} Saison{seasons.length !== 1 ? "s" : ""} • {ownTeams.length} eigene Teams •{" "}
                {opponentTeams.length} Gegner
              </div>
            </div>

            <Dialog open={isSeasonDialogOpen} onOpenChange={setIsSeasonDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl">
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Saison
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Neue Saison erstellen</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="season-name">Name</Label>
                    <Input
                      id="season-name"
                      value={newSeason.name}
                      onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                      placeholder="z.B. Frühjahrsmeisterschaft 2025"
                    />
                  </div>

                  <div>
                    <Label htmlFor="season-type">Typ</Label>
                    <Select value={newSeason.type} onValueChange={(value) => setNewSeason({ ...newSeason, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Frühjahrsmeisterschaft">Frühjahrsmeisterschaft</SelectItem>
                        <SelectItem value="Herbstmeisterschaft">Herbstmeisterschaft</SelectItem>
                        <SelectItem value="Sommercup">Sommercup</SelectItem>
                        <SelectItem value="Wintercup">Wintercup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-date">Startdatum</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={newSeason.start_date}
                        onChange={(e) => setNewSeason({ ...newSeason, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">Enddatum</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={newSeason.end_date}
                        onChange={(e) => setNewSeason({ ...newSeason, end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button onClick={createSeason} className="w-full rounded-xl" disabled={!newSeason.name.trim()}>
                    Saison erstellen
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Sticky Tabs */}
          <div className="sticky top-0 z-10 -mx-3 sm:-mx-5 px-3 sm:px-5 py-3 bg-[#090c12]/95 backdrop-blur-xl border-b border-white/10">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
              <TabsList className="w-full justify-start overflow-x-auto flex-nowrap gap-2 rounded-2xl bg-black/25 p-1.5 border border-white/10">
                <TabsTrigger
                  value="overview"
                  className="flex-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 font-bold text-white/75 transition hover:bg-white/[0.09] hover:text-white data-[state=active]:border-orange-400/30 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_22px_rgba(249,115,22,.20)]"
                >
                  Übersicht
                </TabsTrigger>
                <TabsTrigger
                  value="matches"
                  className="flex-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 font-bold text-white/75 transition hover:bg-white/[0.09] hover:text-white data-[state=active]:border-orange-400/30 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_22px_rgba(249,115,22,.20)]"
                >
                  Spiele
                </TabsTrigger>
                <TabsTrigger
                  value="teams"
                  className="flex-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 font-bold text-white/75 transition hover:bg-white/[0.09] hover:text-white data-[state=active]:border-orange-400/30 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_22px_rgba(249,115,22,.20)]"
                >
                  Mannschaften
                </TabsTrigger>
                <TabsTrigger
                  value="venues"
                  className="flex-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 font-bold text-white/75 transition hover:bg-white/[0.09] hover:text-white data-[state=active]:border-orange-400/30 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_22px_rgba(249,115,22,.20)]"
                >
                  Lokale
                </TabsTrigger>
              </TabsList>

              {/* OVERVIEW */}
              <TabsContent value="overview" className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Eigene Teams</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{ownTeams.length}</div>
                      <p className="text-xs text-muted-foreground">Vereinsteams</p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Gegnerische Teams</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{opponentTeams.length}</div>
                      <p className="text-xs text-muted-foreground">Gegner</p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Saisons</CardTitle>
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{seasons.length}</div>
                      <p className="text-xs text-muted-foreground">Verfügbar</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>Alle Saisons</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {seasons.map((season) => (
                        <div key={season.id} className="border rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold truncate">{season.name}</h3>
                              <p className="text-sm text-muted-foreground">{season.type}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {season.is_active && <Badge variant="default">Aktiv</Badge>}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteSeason(season.id)}
                                className="h-8 w-8 p-0 rounded-lg"
                                aria-label="Saison löschen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(season.start_date).toLocaleDateString()} –{" "}
                            {new Date(season.end_date).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* MATCHES */}
              <TabsContent value="matches" className="space-y-6 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                    <SelectTrigger className="w-full sm:w-72 rounded-xl">
                      <SelectValue placeholder="Saison auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((season) => (
                        <SelectItem key={season.id} value={season.id}>
                          {season.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedSeason && (
                    <Dialog
                      open={isSportdartsImportOpen}
                      onOpenChange={(open) => {
                        setIsSportdartsImportOpen(open)
                        if (!open) {
                          setSportdartsImportPreview([])
                          setSportdartsImportMessage("")
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl w-full sm:w-auto"
                          onClick={() => {
                            setSportdartsImportPreview([])
                            setSportdartsImportMessage("")
                          }}
                        >
                          <Trophy className="h-4 w-4 mr-2" />
                          Sportdarts-Spielplan
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-4xl max-h-[88vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Sportdarts-Spielplan importieren</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                            <div className="font-semibold">
                              Ziel: {currentSeason?.name || "ausgewählte Saison"}
                            </div>
                            <div className="mt-1 text-muted-foreground">
                              Es werden nur Spiele eurer für diese Saison zugeordneten Mannschaften geladen.
                              Bereits vorhandene Spiele werden erkannt und niemals überschrieben.
                            </div>
                          </div>

                          <Button
                            type="button"
                            className="w-full sm:w-auto rounded-xl"
                            onClick={() => void loadSportdartsImportPreview()}
                            disabled={sportdartsImportLoading || sportdartsImporting}
                          >
                            {sportdartsImportLoading ? "Spielplan wird geladen…" : "Vorschau laden"}
                          </Button>

                          {sportdartsImportMessage && (
                            <div className="rounded-xl border border-white/10 bg-black/5 px-4 py-3 text-sm">
                              {sportdartsImportMessage}
                            </div>
                          )}

                          {sportdartsImportPreview.length > 0 && (
                            <>
                              <div className="overflow-x-auto rounded-xl border">
                                <table className="w-full min-w-[760px] text-sm">
                                  <thead className="bg-muted/40">
                                    <tr>
                                      <th className="px-3 py-2 text-left">ST</th>
                                      <th className="px-3 py-2 text-left">Datum</th>
                                      <th className="px-3 py-2 text-left">Heim</th>
                                      <th className="px-3 py-2 text-left">Auswärts</th>
                                      <th className="px-3 py-2 text-left">Division</th>
                                      <th className="px-3 py-2 text-left">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sportdartsImportPreview.map((row) => (
                                      <tr key={`${row.gameId}:${row.ownTeamId}`} className="border-t">
                                        <td className="px-3 py-2 font-medium">{row.weekNumber}</td>
                                        <td className="px-3 py-2">{row.date.split("-").reverse().join(".")}</td>
                                        <td className="px-3 py-2">{row.homeTeam}</td>
                                        <td className="px-3 py-2">{row.awayTeam}</td>
                                        <td className="px-3 py-2">{row.divisionName}</td>
                                        <td className="px-3 py-2">
                                          {row.alreadyExists ? (
                                            <Badge variant="secondary">Bereits vorhanden</Badge>
                                          ) : (
                                            <Badge variant="default">Neu</Badge>
                                          )}
                                          {row.duplicateReason && (
                                            <div className="mt-1 text-xs text-muted-foreground">
                                              {row.duplicateReason}
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="text-sm text-muted-foreground">
                                  {
                                    sportdartsImportPreview.filter((row) => !row.alreadyExists).length
                                  }{" "}
                                  neue Spiele werden ergänzt. Vorhandene bleiben unverändert.
                                </div>

                                <Button
                                  type="button"
                                  className="rounded-xl"
                                  onClick={() => void importNewSportdartsGames()}
                                  disabled={
                                    sportdartsImporting ||
                                    sportdartsImportPreview.every((row) => row.alreadyExists)
                                  }
                                >
                                  {sportdartsImporting
                                    ? "Import läuft…"
                                    : `${sportdartsImportPreview.filter((row) => !row.alreadyExists).length} neue Spiele importieren`}
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {selectedSeason && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="rounded-xl w-full sm:w-auto">
                          <Plus className="h-4 w-4 mr-2" />
                          Neues Spiel
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Neues Spiel erstellen</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Heimteam</Label>
                              <Select
                                value={newMatchState.home_team_type}
                                onValueChange={(value: "own" | "opponent") =>
                                  setNewMatch({ ...newMatchState, home_team_type: value, home_team_id: "" })
                                }
                              >
                                <SelectTrigger className="rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="own">Eigenes Team</SelectItem>
                                  <SelectItem value="opponent">Gegnerisches Team</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select
                                value={newMatchState.home_team_id}
                                onValueChange={(value) => handleTeamSelection(value, newMatchState.home_team_type, "home")}
                              >
                                <SelectTrigger className="rounded-xl">
                                  <SelectValue placeholder="Team auswählen" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(newMatchState.home_team_type === "own" ? ownTeams : opponentTeams).map((team) => (
                                    <SelectItem key={team.id} value={team.id}>
                                      {team.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Auswärtsteam</Label>
                              <Select
                                value={newMatchState.away_team_type}
                                onValueChange={(value: "own" | "opponent") =>
                                  setNewMatch({ ...newMatchState, away_team_type: value, away_team_id: "" })
                                }
                              >
                                <SelectTrigger className="rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="own">Eigenes Team</SelectItem>
                                  <SelectItem value="opponent">Gegnerisches Team</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select
                                value={newMatchState.away_team_id}
                                onValueChange={(value) => handleTeamSelection(value, newMatchState.away_team_type, "away")}
                              >
                                <SelectTrigger className="rounded-xl">
                                  <SelectValue placeholder="Team auswählen" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(newMatchState.away_team_type === "own" ? ownTeams : opponentTeams).map((team) => (
                                    <SelectItem key={team.id} value={team.id}>
                                      {team.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <Label>Datum</Label>
                              <Input
                                className="rounded-xl"
                                type="date"
                                value={newMatchState.match_date}
                                onChange={(e) => setNewMatch({ ...newMatchState, match_date: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Zeit</Label>
                              <Input
                                className="rounded-xl"
                                type="time"
                                value={newMatchState.match_time}
                                onChange={(e) => setNewMatch({ ...newMatchState, match_time: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Woche</Label>
                              <Input
                                className="rounded-xl"
                                type="number"
                                min="1"
                                value={newMatchState.week_number}
                                onChange={(e) =>
                                  setNewMatch({ ...newMatchState, week_number: Number.parseInt(e.target.value) || 1 })
                                }
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Spielort</Label>

                            {newMatchState.home_team_id && (
                              <div className="text-sm text-muted-foreground mb-1">
                                {newMatchState.home_team_type === "own" ? (
                                  <>
                                    Heimteam-Lokal: <span className="font-medium">{DEFAULT_HOME_VENUE}</span>
                                  </>
                                ) : (
                                  (() => {
                                    const t = opponentTeams.find((ot) => ot.id === newMatchState.home_team_id)
                                    const lokal = t?.venue_name?.trim()
                                    const adresse = t?.venue?.trim()
                                    return (
                                      <div className="space-y-0.5">
                                        <div>
                                          Heimteam-Lokal (Gegner): <span className="font-medium">{lokal || "—"}</span>
                                        </div>
                                        <div>
                                          Adresse: <span className="font-medium">{adresse || "—"}</span>
                                        </div>
                                      </div>
                                    )
                                  })()
                                )}
                              </div>
                            )}

                            <Input
                              className="rounded-xl"
                              value={newMatchState.venue}
                              onChange={(e) => setNewMatch({ ...newMatchState, venue: e.target.value })}
                              placeholder="z.B. DC SIM - Salzburg"
                            />
                          </div>

                          <div>
                            <Label>Dart-Art</Label>
                            <Select
                              value={newMatchState.dart_type}
                              onValueChange={(value) =>
                                setNewMatch({ ...newMatchState, dart_type: value as "steeldart" | "edart" })
                              }
                            >
                              <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Dart-Art auswählen" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="steeldart">Steeldart</SelectItem>
                                <SelectItem value="edart">E-Dart</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            onClick={createMatch}
                            className="w-full rounded-xl"
                            disabled={
                              !newMatchState.home_team_id ||
                              !newMatchState.away_team_id ||
                              !newMatchState.match_date ||
                              !newMatchState.match_time ||
                              !selectedSeason
                            }
                          >
                            Spiel erstellen
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {currentSeason && (
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        {currentSeason.name} – Spielplan
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {Object.keys(groupedMatches).length === 0 && otherMatches.length === 0 ? (
                          <div className="text-center py-12">
                            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-lg font-medium text-muted-foreground">Keine Spiele für diese Saison</p>
                            <p className="text-sm text-muted-foreground">Erstelle dein erstes Spiel mit dem Button oben</p>
                          </div>
                        ) : (
                          <>
                            {Object.entries(groupedMatches).map(([teamId, { team, matches: teamMatches }]) => (
                              <Collapsible
                                key={teamId}
                                open={!collapsedTeams.has(teamId)}
                                onOpenChange={() => toggleTeamCollapse(teamId)}
                              >
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-between p-4 h-auto border rounded-xl hover:bg-muted/50"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2">
                                        {collapsedTeams.has(teamId) ? (
                                          <ChevronRight className="h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                        <Users className="h-5 w-5 text-blue-600" />
                                      </div>
                                      <div className="text-left">
                                        <h3 className="font-semibold text-lg">{team.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                          {teamMatches.length} Spiel{teamMatches.length !== 1 ? "e" : ""}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge variant="default" className="bg-blue-500">
                                      Eigenes Team
                                    </Badge>
                                  </Button>
                                </CollapsibleTrigger>

                                <CollapsibleContent className="mt-4">
                                  <div className="space-y-3 pl-0 sm:pl-4">
                                    {teamMatches
                                      .slice()
                                      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
                                      .map((match) => (
                                        <div key={match.id} className={cn("border rounded-xl p-4", getMatchBackgroundColor(match as Match))}>
                                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                                            <div className="flex flex-wrap items-center gap-3">
                                              <Badge variant="outline" className="font-mono">
                                                Woche {match.week_number}
                                              </Badge>

                                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                <span>{new Date(match.match_date).toLocaleDateString("de-DE")}</span>
                                              </div>

                                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                <span>{match.match_time}</span>
                                                <span className="text-xs bg-muted px-2 py-1 rounded">
                                                  {match.dart_type === "edart" ? "E-Dart" : "Steeldart"}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2 justify-between sm:justify-end">
                                              <Badge variant={match.status === "completed" ? "default" : "secondary"}>
                                                {match.status === "completed" ? "Beendet" : "Geplant"}
                                              </Badge>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => deleteMatch(match.id)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>

                                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div className="flex items-center justify-between md:justify-start gap-6">
                                              <div className="text-center">
                                                <div className="font-semibold text-base sm:text-lg mb-1">
                                                  {getTeamName(match as Match, true)}
                                                </div>
                                                <div className="text-3xl font-bold text-blue-600">
                                                  {match.home_score ?? "—"}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                  {match.home_team_type === "own" ? "Heim" : "Heim (Gegner)"}
                                                </div>
                                              </div>

                                              <div className="text-2xl font-bold text-muted-foreground">:</div>

                                              <div className="text-center">
                                                <div className="font-semibold text-base sm:text-lg mb-1">
                                                  {getTeamName(match as Match, false)}
                                                </div>
                                                <div className="text-3xl font-bold text-blue-600">
                                                  {match.away_score ?? "—"}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                  {match.away_team_type === "own" ? "Auswärts" : "Auswärts (Gegner)"}
                                                </div>
                                              </div>
                                            </div>

                                            <div className="md:text-right">
                                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                                <MapPin className="h-4 w-4" />
                                                <span className="font-medium">{match.venue}</span>
                                              </div>

                                              <div className="flex flex-wrap gap-2">
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => {
                                                    setSelectedMatchForStats(match as Match)
                                                    setIsStatsDialogOpen(true)
                                                  }}
                                                  className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
                                                >
                                                  <Target className="h-4 w-4 mr-2" />
                                                  Statistiken
                                                </Button>

                                                {/* DETAILS */}
                                                <Dialog
                                                  open={isMatchDetailsDialogOpen && selectedMatchForDetails === match.id}
                                                  onOpenChange={(open) => {
                                                    setIsMatchDetailsDialogOpen(open)
                                                    if (!open) setSelectedMatchForDetails(null)
                                                  }}
                                                >
                                                  <DialogTrigger asChild>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="rounded-xl"
                                                      onClick={() => {
                                                        // resolve ids (own/opponent)
                                                        let homeTeamId = ""
                                                        let homeTeamType: "own" | "opponent" = "own"
                                                        if ((match as any).home_team_id) {
                                                          homeTeamId = (match as any).home_team_id
                                                          homeTeamType = "own"
                                                        } else if ((match as any).home_opponent_team_id) {
                                                          homeTeamId = (match as any).home_opponent_team_id
                                                          homeTeamType = "opponent"
                                                        }

                                                        let awayTeamId = ""
                                                        let awayTeamType: "own" | "opponent" = "own"
                                                        if ((match as any).away_team_id) {
                                                          awayTeamId = (match as any).away_team_id
                                                          awayTeamType = "own"
                                                        } else if ((match as any).away_opponent_team_id) {
                                                          awayTeamId = (match as any).away_opponent_team_id
                                                          awayTeamType = "opponent"
                                                        }

                                                        setEditMatchDetails({
                                                          home_team_id: homeTeamId,
                                                          home_team_type: homeTeamType,
                                                          away_team_id: awayTeamId,
                                                          away_team_type: awayTeamType,
                                                          match_date: (match as any).match_date,
                                                          match_time: (match as any).match_time,
                                                          week_number: (match as any).week_number,
                                                          venue: (match as any).venue || "",
                                                          dart_type: (match as any).dart_type || "steeldart",
                                                        })

                                                        setSelectedMatchForDetails(match.id)
                                                        setIsMatchDetailsDialogOpen(true)
                                                      }}
                                                    >
                                                      <Settings className="h-4 w-4 mr-2" />
                                                      Details
                                                    </Button>
                                                  </DialogTrigger>

                                                  <DialogContent className="sm:max-w-lg">
                                                    <DialogHeader>
                                                      <DialogTitle>Spieldetails bearbeiten</DialogTitle>
                                                      <p className="text-sm text-muted-foreground">
                                                        Datum, Uhrzeit, Teams und Details ändern
                                                      </p>
                                                    </DialogHeader>

                                                    <div className="space-y-4">
                                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                          <Label htmlFor="week-number">Spieltag</Label>
                                                          <Input
                                                            id="week-number"
                                                            type="number"
                                                            min="1"
                                                            className="rounded-xl"
                                                            value={editMatchDetails.week_number}
                                                            onChange={(e) =>
                                                              setEditMatchDetails((prev) => ({
                                                                ...prev,
                                                                week_number: Number.parseInt(e.target.value) || 1,
                                                              }))
                                                            }
                                                          />
                                                        </div>
                                                        <div>
                                                          <Label htmlFor="venue">Spielort</Label>
                                                          <Input
                                                            id="venue"
                                                            className="rounded-xl"
                                                            value={editMatchDetails.venue}
                                                            onChange={(e) =>
                                                              setEditMatchDetails((prev) => ({ ...prev, venue: e.target.value }))
                                                            }
                                                          />
                                                        </div>
                                                      </div>

                                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                          <Label htmlFor="match-date">Datum</Label>
                                                          <Input
                                                            id="match-date"
                                                            type="date"
                                                            className="rounded-xl"
                                                            value={editMatchDetails.match_date}
                                                            onChange={(e) =>
                                                              setEditMatchDetails((prev) => ({ ...prev, match_date: e.target.value }))
                                                            }
                                                          />
                                                        </div>
                                                        <div>
                                                          <Label htmlFor="match-time">Uhrzeit</Label>
                                                          <Input
                                                            id="match-time"
                                                            type="time"
                                                            className="rounded-xl"
                                                            value={editMatchDetails.match_time}
                                                            onChange={(e) =>
                                                              setEditMatchDetails((prev) => ({ ...prev, match_time: e.target.value }))
                                                            }
                                                          />
                                                        </div>
                                                      </div>

                                                      <div className="space-y-2">
                                                        <Label>Heimteam</Label>
                                                        <div className="flex flex-col sm:flex-row gap-2">
                                                        <Select
  value={editMatchDetails.home_team_type}
  onValueChange={(value: "own" | "opponent") =>
    handleEditTeamSelection("", value, "home")
  }
>
                                                            <SelectTrigger className="w-full sm:w-40 rounded-xl">
                                                              <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                              <SelectItem value="own">Eigenes</SelectItem>
                                                              <SelectItem value="opponent">Gegner</SelectItem>
                                                            </SelectContent>
                                                          </Select>

                                                          <Select
  value={editMatchDetails.home_team_id}
  onValueChange={(value) =>
    handleEditTeamSelection(value, editMatchDetails.home_team_type, "home")
  }
>
                                                            <SelectTrigger className="flex-1 rounded-xl">
                                                              <SelectValue placeholder="Team auswählen" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                              {editMatchDetails.home_team_type === "own"
                                                                ? ownTeams.map((t) => (
                                                                    <SelectItem key={t.id} value={t.id}>
                                                                      {t.name}
                                                                    </SelectItem>
                                                                  ))
                                                                : opponentTeams.map((t) => (
                                                                    <SelectItem key={t.id} value={t.id}>
                                                                      {t.name}
                                                                    </SelectItem>
                                                                  ))}
                                                            </SelectContent>
                                                          </Select>
                                                        </div>
                                                      </div>

                                                      <div className="space-y-2">
                                                        <Label>Auswärtsteam</Label>
                                                        <div className="flex flex-col sm:flex-row gap-2">
                                                         <Select
  value={editMatchDetails.away_team_type}
  onValueChange={(value: "own" | "opponent") =>
    handleEditTeamSelection("", value, "away")
  }
>
                                                            <SelectTrigger className="w-full sm:w-40 rounded-xl">
                                                              <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                              <SelectItem value="own">Eigenes</SelectItem>
                                                              <SelectItem value="opponent">Gegner</SelectItem>
                                                            </SelectContent>
                                                          </Select>

                                                          <Select
  value={editMatchDetails.away_team_id}
  onValueChange={(value) =>
    handleEditTeamSelection(value, editMatchDetails.away_team_type, "away")
  }
>
                                                            <SelectTrigger className="flex-1 rounded-xl">
                                                              <SelectValue placeholder="Team auswählen" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                              {editMatchDetails.away_team_type === "own"
                                                                ? ownTeams.map((t) => (
                                                                    <SelectItem key={t.id} value={t.id}>
                                                                      {t.name}
                                                                    </SelectItem>
                                                                  ))
                                                                : opponentTeams.map((t) => (
                                                                    <SelectItem key={t.id} value={t.id}>
                                                                      {t.name}
                                                                    </SelectItem>
                                                                  ))}
                                                            </SelectContent>
                                                          </Select>
                                                        </div>
                                                      </div>

                                                      <div>
                                                        <Label>Dart-Art</Label>
                                                        <Select
                                                          value={editMatchDetails.dart_type}
                                                          onValueChange={(value) =>
                                                            setEditMatchDetails((prev) => ({
                                                              ...prev,
                                                              dart_type: value as "steeldart" | "edart",
                                                            }))
                                                          }
                                                        >
                                                          <SelectTrigger className="rounded-xl">
                                                            <SelectValue placeholder="Dart-Art auswählen" />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                            <SelectItem value="steeldart">Steeldart</SelectItem>
                                                            <SelectItem value="edart">E-Dart</SelectItem>
                                                          </SelectContent>
                                                        </Select>
                                                      </div>

                                                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                                        <Button
                                                          onClick={() => updateMatchDetails(match.id)}
                                                          className="flex-1 rounded-xl"
                                                          disabled={
                                                            !editMatchDetails.home_team_id ||
                                                            !editMatchDetails.away_team_id ||
                                                            !editMatchDetails.match_date ||
                                                            !editMatchDetails.match_time
                                                          }
                                                        >
                                                          <Check className="h-4 w-4 mr-2" />
                                                          Speichern
                                                        </Button>
                                                        <Button
                                                          variant="outline"
                                                          className="rounded-xl"
                                                          onClick={() => setIsMatchDetailsDialogOpen(false)}
                                                        >
                                                          Abbrechen
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  </DialogContent>
                                                </Dialog>

                                                {/* RESULTS */}
                                                <Dialog
                                                  open={isResultsDialogOpen && selectedMatchForResults === match.id}
                                                  onOpenChange={(open) => {
                                                    setIsResultsDialogOpen(open)
                                                    if (!open) setSelectedMatchForResults(null)
                                                  }}
                                                >
                                                  <DialogTrigger asChild>
                                                    <Button
                                                      size="sm"
                                                      className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                                                      onClick={() => {
                                                        setSelectedMatchForResults(match.id)
                                                        setIsResultsDialogOpen(true)
                                                        setEditMatchScores({
                                                          home: (match.home_score ?? 0) as number,
                                                          away: (match.away_score ?? 0) as number,
                                                        })
                                                      }}
                                                    >
                                                      <Edit className="h-4 w-4 mr-2" />
                                                      {match.status === "completed" ? "Bearbeiten" : "Ergebnis"}
                                                    </Button>
                                                  </DialogTrigger>

                                                  <DialogContent className="sm:max-w-md">
                                                    <DialogHeader className="text-center pb-4">
                                                      <DialogTitle className="text-xl font-semibold">
                                                        {match.status === "completed" ? "Ergebnis bearbeiten" : "Spielergebnis eintragen"}
                                                      </DialogTitle>
                                                      <p className="text-sm text-muted-foreground">
                                                        {new Date(match.match_date).toLocaleDateString("de-DE")} • {match.match_time}
                                                      </p>
                                                    </DialogHeader>

                                                    <div className="space-y-6">
                                                      <div className="bg-muted/30 rounded-xl p-4">
                                                        <div className="grid grid-cols-3 gap-4 items-center">
                                                          <div className="text-center">
                                                            <Label className="text-sm font-medium text-muted-foreground">
                                                              {getTeamName(match as Match, true)}
                                                            </Label>
                                                            <Input
                                                              type="number"
                                                              min="0"
                                                              max="99"
                                                              value={editMatchScores.home}
                                                              className="text-center text-2xl font-bold h-16 mt-2 rounded-xl"
                                                              onChange={(e) =>
                                                                setEditMatchScores((prev) => ({
                                                                  ...prev,
                                                                  home: Number.parseInt(e.target.value) || 0,
                                                                }))
                                                              }
                                                            />
                                                          </div>
                                                          <div className="text-center">
                                                            <div className="text-3xl font-bold text-muted-foreground">:</div>
                                                          </div>
                                                          <div className="text-center">
                                                            <Label className="text-sm font-medium text-muted-foreground">
                                                              {getTeamName(match as Match, false)}
                                                            </Label>
                                                            <Input
                                                              type="number"
                                                              min="0"
                                                              max="99"
                                                              value={editMatchScores.away}
                                                              className="text-center text-2xl font-bold h-16 mt-2 rounded-xl"
                                                              onChange={(e) =>
                                                                setEditMatchScores((prev) => ({
                                                                  ...prev,
                                                                  away: Number.parseInt(e.target.value) || 0,
                                                                }))
                                                              }
                                                            />
                                                          </div>
                                                        </div>
                                                      </div>

                                                      <div className="flex flex-col sm:flex-row gap-3">
                                                        <Button
                                                          onClick={() => updateMatchScore(match.id, editMatchScores.home, editMatchScores.away)}
                                                          className="flex-1 h-12 text-base font-medium rounded-xl"
                                                        >
                                                          <Check className="h-4 w-4 mr-2" />
                                                          Speichern
                                                        </Button>

                                                        {match.status === "completed" && (
                                                          <Button
                                                            onClick={() => resetMatchScore(match.id)}
                                                            variant="outline"
                                                            className="h-12 px-4 text-base font-medium rounded-xl border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                                          >
                                                            <AlertTriangle className="h-4 w-4 mr-2" />
                                                            Reset
                                                          </Button>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </DialogContent>
                                                </Dialog>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))}

                            {otherMatches.length > 0 && (
                              <div className="border-t pt-6">
                                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                  <Users className="h-5 w-5 text-muted-foreground" />
                                  Andere Spiele
                                </h3>
                                <div className="space-y-3">
                                  {otherMatches.map((match) => (
                                    <div key={match.id} className={cn("border rounded-xl p-4", getMatchBackgroundColor(match))}>
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <Badge variant="outline">Woche {match.week_number}</Badge>
                                          <span className="font-medium truncate">
                                            {getTeamName(match, true)} vs {getTeamName(match, false)}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="font-mono text-lg">
                                            {match.home_score ?? "—"}:{match.away_score ?? "—"}
                                          </span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => deleteMatch(match.id)}
                                            className="text-red-600 hover:text-red-700 rounded-lg"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* TEAMS */}
              <TabsContent value="teams" className="space-y-6 pt-4">
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
                                {season.name}{season.is_active ? " · Aktiv" : ""}
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
              <TabsContent value="venues" className="space-y-6 pt-4">
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
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Stats Dialog/Component */}
      {selectedMatchForStats && isStatsDialogOpen && (
        <MatchStatistics
          match={selectedMatchForStats}
          myTeamId={
            selectedMatchForStats.home_team_type === "own"
              ? selectedMatchForStats.home_team_id
              : selectedMatchForStats.away_team_type === "own"
                ? selectedMatchForStats.away_team_id
                : undefined
          }
          onClose={() => {
            setIsStatsDialogOpen(false)
            setSelectedMatchForStats(null)
          }}
        />
      )}
    </div>
  )
}