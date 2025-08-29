"use client"

import { useState, useEffect, useMemo } from "react"
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
} from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { MatchStatistics } from "./match-statistics"

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
  match_date: string
  match_time: string
  week_number: number
  venue: string
  home_score: number
  away_score: number
  status: string
  notes?: string
  home_team: Team
  away_team: Team
  season: Season
  home_opponent_team?: OpponentTeam
  away_opponent_team?: OpponentTeam
}

export function LeagueManagement() {
  const [ownTeams, setOwnTeams] = useState<Team[]>([])
  const [opponentTeams, setOpponentTeams] = useState<OpponentTeam[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  // Form states
  const [newMatch, setNewMatch] = useState({
    home_team_id: "",
    home_team_type: "own" as "own" | "opponent",
    away_team_id: "",
    away_team_type: "own" as "own" | "opponent",
    match_date: "",
    match_time: "",
    week_number: 1,
    venue: "",
  })

  const [newSeason, setNewSeason] = useState({
    name: "",
    type: "Frühjahrsmeisterschaft",
    year: new Date().getFullYear(),
    start_date: "",
    end_date: "",
  })

  const [newOpponentTeam, setNewOpponentTeam] = useState("")
  const [newOpponentTeamVenue, setNewOpponentTeamVenue] = useState("")
  const [editingOpponentTeam, setEditingOpponentTeam] = useState<string | null>(null)
  const [editOpponentTeamName, setEditOpponentTeamName] = useState("")
  const [editOpponentTeamVenue, setEditOpponentTeamVenue] = useState("")
  const [editingMatch, setEditingMatch] = useState<string | null>(null)
  const [editMatchScores, setEditMatchScores] = useState({ home: 0, away: 0 })
  const [showSuccessMessage, setShowSuccessMessage] = useState("")
  const [isSeasonDialogOpen, setIsSeasonDialogOpen] = useState(false)
  const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false)
  const [selectedMatchForResults, setSelectedMatchForResults] = useState<string | null>(null)
  const [selectedMatchForStats, setSelectedMatchForStats] = useState<Match | null>(null)
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false)

  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set())

  const pastGamesWithoutResults = useMemo(() => {
    const now = new Date()
    const pastGames = matches.filter((match) => {
      const gameDate = new Date(match.match_date)
      return gameDate < now && (match.home_score === null || match.away_score === null)
    })
    return pastGames
  }, [matches])

  useEffect(() => {
    console.log("[v0] Component mounted, starting data fetch")
    console.log("[v0] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("[v0] Supabase Key exists:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    fetchData()
  }, [])

  const fetchData = async () => {
    console.log("[v0] Starting fetchData function")
    try {
      // Teams laden
      console.log("[v0] Fetching teams...")
      const { data: ownTeamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .not("user_id", "is", null)
        .order("name")
      console.log("[v0] Teams data:", ownTeamsData)
      console.log("[v0] Teams error:", teamsError)

      console.log("[v0] Fetching opponent teams...")
      const { data: opponentTeamsData, error: opponentError } = await supabase
        .from("opponent_teams")
        .select("*")
        .order("name")
      console.log("[v0] Opponent teams data:", opponentTeamsData)
      console.log("[v0] Opponent teams error:", opponentError)

      // Saisons laden
      console.log("[v0] Fetching seasons...")
      const { data: seasonsData, error: seasonsError } = await supabase
        .from("seasons")
        .select("*")
        .order("created_at", { ascending: false })
      console.log("[v0] Seasons data:", seasonsData)
      console.log("[v0] Seasons error:", seasonsError)

      console.log("[v0] Fetching matches...")
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name),
          season:seasons(id, name, type)
        `)
        .order("match_date", { ascending: true })

      const enrichedMatches =
        matchesData?.map((match) => {
          const homeOpponentTeam = match.home_opponent_team_id
            ? opponentTeamsData?.find((team) => team.id === match.home_opponent_team_id)
            : null
          const awayOpponentTeam = match.away_opponent_team_id
            ? opponentTeamsData?.find((team) => team.id === match.away_opponent_team_id)
            : null

          return {
            ...match,
            home_opponent_team: homeOpponentTeam,
            away_opponent_team: awayOpponentTeam,
          }
        }) || []

      setOwnTeams(ownTeamsData?.map((team) => ({ ...team, type: "own" as const })) || [])
      setOpponentTeams(opponentTeamsData || [])
      setSeasons(seasonsData || [])
      setMatches(enrichedMatches)

      console.log("[v0] State updated - seasons count:", seasonsData?.length || 0)

      // Aktive Saison als Standard setzen
      const activeSeason = seasonsData?.find((s) => s.is_active)
      if (activeSeason && !selectedSeason) {
        setSelectedSeason(activeSeason.id)
      }
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
    } finally {
      console.log("[v0] Setting loading to false")
      setLoading(false)
    }
  }

  const createSeason = async () => {
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
      setShowSuccessMessage("Saison erfolgreich erstellt!")
      setIsSeasonDialogOpen(false)
      setTimeout(() => setShowSuccessMessage(""), 3000)
      fetchData()
    } catch (error) {
      console.error("Error creating season:", error)
    }
  }

  const createMatch = async () => {
    try {
      const matchData: any = {
        season_id: selectedSeason,
        match_date: newMatch.match_date,
        match_time: newMatch.match_time,
        week_number: newMatch.week_number,
        venue: newMatch.venue,
        home_team_type: newMatch.home_team_type,
        away_team_type: newMatch.away_team_type,
      }

      if (newMatch.home_team_type === "own") {
        matchData.home_team_id = newMatch.home_team_id
      } else {
        matchData.home_opponent_team_id = newMatch.home_team_id
      }

      if (newMatch.away_team_type === "own") {
        matchData.away_team_id = newMatch.away_team_id
      } else {
        matchData.away_opponent_team_id = newMatch.away_team_id
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
      })
      fetchData()
    } catch (error) {
      console.error("Error creating match:", error)
    }
  }

  const deleteSeason = async (seasonId: string) => {
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

      setShowSuccessMessage("Saison erfolgreich gelöscht!")
      setTimeout(() => setShowSuccessMessage(""), 3000)
      fetchData()
    } catch (error) {
      console.error("Error deleting season:", error)
    }
  }

  const getMatchResult = (match: Match) => {
    if (match.home_score === null || match.away_score === null) return "pending"

    const isOurTeamHome = ownTeams.some((team) => team.id === match.home_team_id)
    const isOurTeamAway = ownTeams.some((team) => team.id === match.away_team_id)

    if (!isOurTeamHome && !isOurTeamAway) return "neutral" // Neither team is ours

    if (match.home_score === match.away_score) return "draw"

    const ourTeamWon =
      (isOurTeamHome && match.home_score > match.away_score) || (isOurTeamAway && match.away_score > match.home_score)

    return ourTeamWon ? "won" : "lost"
  }

  const getMatchBackgroundColor = (match: Match) => {
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
  }

  const updateMatchScore = async (matchId: string, homeScore: number, awayScore: number) => {
    try {
      const { error } = await supabase
        .from("matches")
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: "completed",
        })
        .eq("id", matchId)

      if (error) throw error
      setEditingMatch(null)
      setIsResultsDialogOpen(false)
      setSelectedMatchForResults(null)
      fetchData()
    } catch (error) {
      console.error("Error updating match score:", error)
    }
  }

  const createOpponentTeam = async () => {
    if (!newOpponentTeam.trim()) return

    try {
      const { error } = await supabase.from("opponent_teams").insert([
        {
          name: newOpponentTeam.trim(),
          venue: newOpponentTeamVenue.trim() || null,
        },
      ])

      if (error) throw error

      setNewOpponentTeam("")
      setNewOpponentTeamVenue("")
      fetchData()
    } catch (error) {
      console.error("Error creating opponent team:", error)
    }
  }

  const deleteOpponentTeam = async (teamId: string) => {
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
      fetchData()
    } catch (error) {
      console.error("Error deleting opponent team:", error)
    }
  }

  const updateOpponentTeam = async (teamId: string) => {
    if (!editOpponentTeamName.trim()) return

    try {
      const { error } = await supabase
        .from("opponent_teams")
        .update({
          name: editOpponentTeamName.trim(),
          venue: editOpponentTeamVenue.trim() || null,
        })
        .eq("id", teamId)

      if (error) throw error

      setEditingOpponentTeam(null)
      setEditOpponentTeamName("")
      setEditOpponentTeamVenue("")
      fetchData()
    } catch (error) {
      console.error("Error updating opponent team:", error)
    }
  }

  const deleteMatch = async (matchId: string) => {
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
      fetchData()
    } catch (error) {
      console.error("Error deleting match:", error)
    }
  }

  const getTeamName = (match: Match, isHome: boolean) => {
    if (isHome) {
      return match.home_team_type === "own" ? match.home_team?.name : match.home_opponent_team?.name
    } else {
      return match.away_team_type === "own" ? match.away_team?.name : match.away_opponent_team?.name
    }
  }

  const allTeams = [
    ...ownTeams.map((team) => ({ ...team, displayName: `${team.name} (Eigenes Team)` })),
    ...opponentTeams.map((team) => ({ ...team, type: "opponent" as const, displayName: team.name })),
  ]

  const filteredMatches = selectedSeason
    ? matches
        .filter((match) => match.season_id === selectedSeason)
        .sort((a, b) => {
          const aHasOwnTeam = a.home_team_type === "own" || a.away_team_type === "own"
          const bHasOwnTeam = b.home_team_type === "own" || b.away_team_type === "own"

          if (aHasOwnTeam && !bHasOwnTeam) return -1
          if (!aHasOwnTeam && bHasOwnTeam) return 1

          return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
        })
    : matches

  const groupMatchesByOwnTeam = (matches: Match[]) => {
    const grouped: { [teamId: string]: { team: Team; matches: Match[] } } = {}
    const otherMatches: Match[] = []

    matches.forEach((match) => {
      let ownTeam: Team | null = null
      let isOwnTeamHome = false

      if (match.home_team_type === "own" && match.home_team) {
        ownTeam = match.home_team
        isOwnTeamHome = true
      } else if (match.away_team_type === "own" && match.away_team) {
        ownTeam = match.away_team
        isOwnTeamHome = false
      }

      if (ownTeam) {
        if (!grouped[ownTeam.id]) {
          grouped[ownTeam.id] = { team: ownTeam, matches: [] }
        }
        grouped[ownTeam.id].matches.push({ ...match, isOwnTeamHome })
      } else {
        otherMatches.push(match)
      }
    })

    return { grouped, otherMatches }
  }

  const toggleTeamCollapse = (teamId: string) => {
    const newCollapsed = new Set(collapsedTeams)
    if (newCollapsed.has(teamId)) {
      newCollapsed.delete(teamId)
    } else {
      newCollapsed.add(teamId)
    }
    setCollapsedTeams(newCollapsed)
  }

  const { grouped: groupedMatches, otherMatches } = groupMatchesByOwnTeam(filteredMatches)

  const currentSeason = seasons.find((s) => s.id === selectedSeason)

  const handleTeamSelection = (teamId: string, teamType: "own" | "opponent", position: "home" | "away") => {
    const updatedMatch = { ...newMatch }

    if (position === "home") {
      updatedMatch.home_team_id = teamId
      updatedMatch.home_team_type = teamType
    } else {
      updatedMatch.away_team_id = teamId
      updatedMatch.away_team_type = teamType
    }

    // Auto-fill venue logic
    let autoVenue = ""

    // If home team is own team, use "Dart Freizeitverein Pfeil - OK"
    if (updatedMatch.home_team_type === "own" && updatedMatch.home_team_id) {
      autoVenue = "Dart Freizeitverein Pfeil - OK"
    }
    // If home team is opponent team, use their venue
    else if (updatedMatch.home_team_type === "opponent" && updatedMatch.home_team_id) {
      const opponentTeam = opponentTeams.find((team) => team.id === updatedMatch.home_team_id)
      if (opponentTeam?.venue) {
        autoVenue = opponentTeam.venue
      }
    }

    updatedMatch.venue = autoVenue
    setNewMatch(updatedMatch)
  }

  const startEditingOpponentTeam = (team: OpponentTeam) => {
    setEditingOpponentTeam(team.id)
    setEditOpponentTeamName(team.name)
    setEditOpponentTeamVenue(team.venue || "")
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Lade Ligadaten...</div>
  }

  console.log("[v0] Rendering component - seasons:", seasons.length, "teams:", ownTeams.length)

  return (
    <div className="space-y-6">
      {pastGamesWithoutResults.length > 0 && (
        <div className="bg-yellow-100 border border-yellow-400 rounded p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="font-semibold text-yellow-800">
              {pastGamesWithoutResults.length} offene Spiele aus der Vergangenheit ohne Ergebnis
            </span>
          </div>
          <div className="text-yellow-700 text-sm space-y-1">
            {pastGamesWithoutResults.map((match) => {
              const homeTeam = ownTeams.find((t) => t.id === match.home_team_id)
              const awayTeam = ownTeams.find((t) => t.id === match.away_team_id)
              return (
                <div key={match.id}>
                  {homeTeam?.name} vs {awayTeam?.name} - {new Date(match.match_date).toLocaleDateString("de-DE")}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showSuccessMessage && (
        <div className="bg-green-100 border border-green-400 rounded p-4 mb-4 flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-green-800">{showSuccessMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ligaspiele</h1>
          <p className="text-muted-foreground">Verwalte Mannschaften, Saisons und Spiele</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSeasonDialogOpen} onOpenChange={setIsSeasonDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Neue Saison
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                <Button onClick={createSeason} className="w-full">
                  Saison erstellen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="matches">Spiele</TabsTrigger>
          <TabsTrigger value="teams">Mannschaften</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eigene Teams</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ownTeams.length}</div>
                <p className="text-xs text-muted-foreground">Vereinsteams</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gegnerische Teams</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{opponentTeams.length}</div>
                <p className="text-xs text-muted-foreground">Gegner</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Saisons</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seasons.length}</div>
                <p className="text-xs text-muted-foreground">Verfügbare Saisons</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aktuelle Saisons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {seasons.map((season) => (
                    <div key={season.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{season.name}</h3>
                        <div className="flex items-center gap-2">
                          {season.is_active && <Badge variant="default">Aktiv</Badge>}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteSeason(season.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{season.type}</p>
                      <div className="text-xs text-muted-foreground">
                        {new Date(season.start_date).toLocaleDateString()} -{" "}
                        {new Date(season.end_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Aktuelle Saisons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {seasons.map((season) => (
                  <div key={season.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{season.name}</h3>
                      <div className="flex items-center gap-2">
                        {season.is_active && <Badge variant="default">Aktiv</Badge>}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteSeason(season.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{season.type}</p>
                    <div className="text-xs text-muted-foreground">
                      {new Date(season.start_date).toLocaleDateString()} -{" "}
                      {new Date(season.end_date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="space-y-6">
          <div className="flex items-center gap-4">
            <Select value={selectedSeason} onValueChange={setSelectedSeason}>
              <SelectTrigger className="w-64">
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
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Neues Spiel
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Neues Spiel erstellen</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Heimteam</Label>
                        <div className="space-y-2">
                          <Select
                            value={newMatch.home_team_type}
                            onValueChange={(value: "own" | "opponent") =>
                              setNewMatch({ ...newMatch, home_team_type: value, home_team_id: "" })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="own">Eigenes Team</SelectItem>
                              <SelectItem value="opponent">Gegnerisches Team</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={newMatch.home_team_id}
                            onValueChange={(value) => handleTeamSelection(value, newMatch.home_team_type, "home")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Team auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                              {(newMatch.home_team_type === "own" ? ownTeams : opponentTeams).map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Auswärtsteam</Label>
                        <div className="space-y-2">
                          <Select
                            value={newMatch.away_team_type}
                            onValueChange={(value: "own" | "opponent") =>
                              setNewMatch({ ...newMatch, away_team_type: value, away_team_id: "" })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="own">Eigenes Team</SelectItem>
                              <SelectItem value="opponent">Gegnerisches Team</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={newMatch.away_team_id}
                            onValueChange={(value) => handleTeamSelection(value, newMatch.away_team_type, "away")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Team auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                              {(newMatch.away_team_type === "own" ? ownTeams : opponentTeams).map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Datum</Label>
                        <Input
                          type="date"
                          value={newMatch.match_date}
                          onChange={(e) => setNewMatch({ ...newMatch, match_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Zeit</Label>
                        <Input
                          type="time"
                          value={newMatch.match_time}
                          onChange={(e) => setNewMatch({ ...newMatch, match_time: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Woche</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newMatch.week_number}
                          onChange={(e) => setNewMatch({ ...newMatch, week_number: Number.parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Spielort</Label>
                      <Input
                        value={newMatch.venue}
                        onChange={(e) => setNewMatch({ ...newMatch, venue: e.target.value })}
                        placeholder="z.B. DC SIM - Salzburg"
                      />
                    </div>
                    <Button onClick={createMatch} className="w-full">
                      Spiel erstellen
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {currentSeason && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  {currentSeason.name} - Spielplan
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
                      {Object.entries(groupedMatches).map(([teamId, { team, matches }]) => (
                        <Collapsible
                          key={teamId}
                          open={!collapsedTeams.has(teamId)}
                          onOpenChange={() => toggleTeamCollapse(teamId)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full justify-between p-4 h-auto border rounded-lg hover:bg-muted/50"
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
                                    {matches.length} Spiel{matches.length !== 1 ? "e" : ""}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="default" className="bg-blue-500">
                                Eigenes Team
                              </Badge>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-4">
                            <div className="space-y-3 pl-4">
                              {matches
                                .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
                                .map((match) => (
                                  <div
                                    key={match.id}
                                    className={`border rounded-lg p-4 ${getMatchBackgroundColor(match)}`}
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
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
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={match.status === "completed" ? "default" : "secondary"}>
                                          {match.status === "completed" ? "Beendet" : "Geplant"}
                                        </Badge>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => deleteMatch(match.id)}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-6">
                                        <div className="text-center">
                                          <div className="font-semibold text-lg mb-1">{getTeamName(match, true)}</div>
                                          <div className="text-3xl font-bold text-blue-600">{match.home_score}</div>
                                          <div className="text-xs text-muted-foreground mt-1">
                                            {match.home_team_type === "own" ? "Heim" : "Heim (Gegner)"}
                                          </div>
                                        </div>
                                        <div className="text-2xl font-bold text-muted-foreground">:</div>
                                        <div className="text-center">
                                          <div className="font-semibold text-lg mb-1">{getTeamName(match, false)}</div>
                                          <div className="text-3xl font-bold text-blue-600">{match.away_score}</div>
                                          <div className="text-xs text-muted-foreground mt-1">
                                            {match.away_team_type === "own" ? "Auswärts" : "Auswärts (Gegner)"}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="text-right">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                          <MapPin className="h-4 w-4" />
                                          <span className="font-medium">{match.venue}</span>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setSelectedMatchForStats(match)
                                              setIsStatsDialogOpen(true)
                                            }}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                          >
                                            <Target className="h-4 w-4 mr-2" />
                                            Statistiken
                                          </Button>
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
                                                className="bg-blue-600 hover:bg-blue-700"
                                                onClick={() => {
                                                  setSelectedMatchForResults(match.id)
                                                  setIsResultsDialogOpen(true)
                                                  setEditMatchScores({
                                                    home: match.home_score || 0,
                                                    away: match.away_score || 0,
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
                                                  {match.status === "completed"
                                                    ? "Ergebnis bearbeiten"
                                                    : "Spielergebnis eintragen"}
                                                </DialogTitle>
                                                <p className="text-sm text-muted-foreground">
                                                  {new Date(match.match_date).toLocaleDateString("de-DE")} •{" "}
                                                  {match.match_time}
                                                </p>
                                              </DialogHeader>
                                              <div className="space-y-6">
                                                <div className="bg-muted/30 rounded-lg p-4">
                                                  <div className="grid grid-cols-3 gap-4 items-center">
                                                    <div className="text-center">
                                                      <Label className="text-sm font-medium text-muted-foreground">
                                                        {getTeamName(match, true)}
                                                      </Label>
                                                      <Input
                                                        type="number"
                                                        min="0"
                                                        max="99"
                                                        value={editMatchScores.home}
                                                        className="text-center text-2xl font-bold h-16 mt-2"
                                                        onChange={(e) => {
                                                          setEditMatchScores((prev) => ({
                                                            ...prev,
                                                            home: Number.parseInt(e.target.value) || 0,
                                                          }))
                                                        }}
                                                      />
                                                    </div>
                                                    <div className="text-center">
                                                      <div className="text-3xl font-bold text-muted-foreground">:</div>
                                                    </div>
                                                    <div className="text-center">
                                                      <Label className="text-sm font-medium text-muted-foreground">
                                                        {getTeamName(match, false)}
                                                      </Label>
                                                      <Input
                                                        type="number"
                                                        min="0"
                                                        max="99"
                                                        value={editMatchScores.away}
                                                        className="text-center text-2xl font-bold h-16 mt-2"
                                                        onChange={(e) => {
                                                          setEditMatchScores((prev) => ({
                                                            ...prev,
                                                            away: Number.parseInt(e.target.value) || 0,
                                                          }))
                                                        }}
                                                      />
                                                    </div>
                                                  </div>
                                                </div>
                                                <Button
                                                  onClick={() =>
                                                    updateMatchScore(
                                                      match.id,
                                                      editMatchScores.home,
                                                      editMatchScores.away,
                                                    )
                                                  }
                                                  className="w-full h-12 text-base font-medium"
                                                >
                                                  <Check className="h-4 w-4 mr-2" />
                                                  Ergebnis speichern
                                                </Button>
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
                              <div key={match.id} className={`border rounded-lg p-4 ${getMatchBackgroundColor(match)}`}>
                                {/* Same match display as above but simplified */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <Badge variant="outline">Woche {match.week_number}</Badge>
                                    <span className="font-medium">
                                      {getTeamName(match, true)} vs {getTeamName(match, false)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-lg">
                                      {match.home_score}:{match.away_score}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => deleteMatch(match.id)}
                                      className="text-red-600 hover:text-red-700"
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

        <TabsContent value="teams" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Eigene Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ownTeams.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Keine eigenen Teams gefunden</p>
                  ) : (
                    ownTeams.map((team) => (
                      <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{team.name}</span>
                        </div>
                        <Badge variant="default">Eigenes Team</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gegnerische Mannschaften
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Neues Gegnerteam..."
                        value={newOpponentTeam}
                        onChange={(e) => setNewOpponentTeam(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && createOpponentTeam()}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Spielort..."
                        value={newOpponentTeamVenue}
                        onChange={(e) => setNewOpponentTeamVenue(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && createOpponentTeam()}
                      />
                    </div>
                    <Button onClick={createOpponentTeam} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {opponentTeams.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">Keine Gegnerteams vorhanden</p>
                    ) : (
                      opponentTeams.map((team) => (
                        <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Users className="h-4 w-4 text-orange-600" />
                            {editingOpponentTeam === team.id ? (
                              <div className="flex gap-2 flex-1">
                                <Input
                                  value={editOpponentTeamName}
                                  onChange={(e) => setEditOpponentTeamName(e.target.value)}
                                  onKeyPress={(e) => e.key === "Enter" && updateOpponentTeam(team.id)}
                                />
                                <Input
                                  value={editOpponentTeamVenue}
                                  onChange={(e) => setEditOpponentTeamVenue(e.target.value)}
                                  onKeyPress={(e) => e.key === "Enter" && updateOpponentTeam(team.id)}
                                  placeholder="Spielort..."
                                />
                              </div>
                            ) : (
                              <div>
                                <span className="font-medium">{team.name}</span>
                                {team.venue && <div className="text-sm text-muted-foreground">{team.venue}</div>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Gegner</Badge>
                            {editingOpponentTeam === team.id ? (
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => updateOpponentTeam(team.id)}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingOpponentTeam(null)
                                    setEditOpponentTeamName("")
                                    setEditOpponentTeamVenue("")
                                  }}
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    startEditingOpponentTeam(team)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteOpponentTeam(team.id)}
                                  className="text-red-600 hover:text-red-700"
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
      </Tabs>

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
