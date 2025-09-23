"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Trophy, Minus, Plus, ArrowLeft, Trash2, Camera } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Player {
  id: string
  name: string
  photo_url: string | null
}

interface Team {
  id: string
  name: string
}

interface Match {
  id: string
  season_id: string
  home_team_id: string
  away_team_id: string
  match_date: string
  match_time: string
  venue: string
  home_score: number
  away_score: number
  status: string
  match_format?: "team" | "individual" | "best_of_three"
  division_type?: "team_division" | "individual_division"
  home_team: Team | null
  away_team: Team | null
  dart_type?: string
  home_opponent_team_id?: string
  away_opponent_team_id?: string
  home_team_type?: "club_team" | "opponent_team"
  away_team_type?: "club_team" | "opponent_team"
}

interface LegStatistic {
  id?: string
  match_id: string
  leg_number: number
  player_id: string
  player_name: string
  leg_winner_id?: string
  leg_wins: number
  legs_won_in_match?: number
  player_legs_won?: number
  opponent_legs_won?: number
  throws_180: number
  throws_171: number
  throws_high_tonne: number
  throws_tonne: number
  throws_shanghai: number
  throws_95_plus: number
  throws_under_26: number
  throws_under_30: number
  semperit_outs: number
  throws_15: number
  throws_16: number
  throws_17: number
  throws_18: number
  throws_19: number
  throws_20: number
  throws_bull: number
  notes: string
  dart_type?: string
}

interface MatchStatisticsPageProps {
  match: Match
  myTeamId: string
  myTeam: Team | null
  showHeader?: boolean
}

const NumberInput = ({
  id,
  label,
  value,
  onChange,
  min = 0,
  className = "",
  labelClassName = "",
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  className?: string
  labelClassName?: string
}) => {
  const handleDecrement = () => {
    const newValue = Math.max(min, (value || 0) - 1)
    onChange(newValue)
  }

  const handleIncrement = () => {
    onChange((value || 0) + 1)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    if (inputValue === "") {
      onChange(0)
    } else {
      const numValue = Number.parseInt(inputValue)
      if (!isNaN(numValue) && numValue >= min) {
        onChange(numValue)
      }
    }
  }

  return (
    <div>
      <Label htmlFor={id} className={`text-xs sm:text-sm font-medium ${labelClassName}`}>
        {label}
      </Label>
      <div className="flex items-center mt-1 border rounded-md">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDecrement}
          disabled={value <= min}
          className="h-9 w-7 sm:h-11 sm:w-9 p-0 rounded-none border-r hover:bg-gray-100 flex-shrink-0"
        >
          <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <Input
          id={id}
          type="number"
          min={min}
          value={value || ""}
          onChange={handleInputChange}
          className={`border-0 text-center h-9 sm:h-11 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 min-w-0 text-sm sm:text-base font-semibold ${className}`}
          placeholder="0"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleIncrement}
          className="h-9 w-7 sm:h-11 sm:w-9 p-0 rounded-none border-l hover:bg-gray-100 flex-shrink-0"
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        {/* </CHANGE> */}
      </div>
    </div>
  )
}

export function MatchStatisticsPage({ match, myTeamId, myTeam, showHeader = true }: MatchStatisticsPageProps) {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [legStats, setLegStats] = useState<LegStatistic[]>([])
  const [loading, setLoading] = useState(false)
  const [opponentTeams, setOpponentTeams] = useState<any[]>([])
  const [enrichedMatch, setEnrichedMatch] = useState<any>(match)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [playerToDelete, setPlayerToDelete] = useState<LegStatistic | null>(null)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [savedPlayerName, setSavedPlayerName] = useState("")
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const [currentStats, setCurrentStats] = useState<LegStatistic>({
    match_id: match.id,
    leg_number: 1,
    player_id: "",
    player_name: "",
    leg_winner_id: undefined,
    leg_wins: 0,
    legs_won_in_match: 0,
    player_legs_won: 0,
    opponent_legs_won: 0,
    throws_180: 0,
    throws_171: 0,
    throws_high_tonne: 0,
    throws_tonne: 0,
    throws_shanghai: 0,
    throws_95_plus: 0,
    throws_under_26: 0,
    throws_under_30: 0,
    semperit_outs: 0,
    throws_15: 0,
    throws_16: 0,
    throws_17: 0,
    throws_18: 0,
    throws_19: 0,
    throws_20: 0,
    throws_bull: 0,
    notes: "",
    dart_type: match.dart_type || "steeldart",
  })

  useEffect(() => {
    fetchPlayers()
    fetchLegStatistics()
    fetchOpponentTeams()
  }, [match.id, myTeamId])

  const fetchPlayers = async () => {
    if (!myTeamId) {
      return
    }

    const { data, error } = await supabase
      .from("team_members")
      .select(`
        club_players (
          id,
          name,
          photo_url
        )
      `)
      .eq("team_id", myTeamId)
      .order("club_players(name)")

    if (!error && data) {
      const teamPlayers = data.map((member: any) => member.club_players).filter(Boolean)
      setPlayers(teamPlayers)
    }
  }

  const fetchLegStatistics = async () => {
    const { data, error } = await supabase
      .from("leg_statistics")
      .select(`
        id, match_id, leg_number, player_id, leg_winner_id, leg_wins, 
        throws_180, throws_171, throws_high_tonne, throws_tonne, throws_shanghai,
        throws_95_plus, throws_under_26, throws_under_30, semperit_outs,
        throws_15, throws_16, throws_17, throws_18, throws_19, throws_20, throws_bull, 
        notes, player_legs_won, opponent_legs_won, legs_won_in_match, dart_type,
        player:club_players!leg_statistics_player_id_fkey(name)
      `)
      .eq("match_id", match.id)
      .order("leg_number")

    if (!error && data) {
      const statsWithNames = data.map((stat: any) => ({
        ...stat,
        player_name: stat.player?.name || "Unbekannter Spieler",
      }))
      setLegStats(statsWithNames)
    } else if (error) {
      console.error("Error fetching leg statistics:", error)
    }
  }

  const fetchOpponentTeams = async () => {
    const { data: opponentTeamsData, error } = await supabase.from("opponent_teams").select("*")

    if (!error && opponentTeamsData) {
      setOpponentTeams(opponentTeamsData)

      const homeOpponentTeam = match.home_opponent_team_id
        ? opponentTeamsData.find((team) => team.id === match.home_opponent_team_id)
        : null
      const awayOpponentTeam = match.away_opponent_team_id
        ? opponentTeamsData.find((team) => team.id === match.away_opponent_team_id)
        : null

      setEnrichedMatch({
        ...match,
        home_opponent_team: homeOpponentTeam,
        away_opponent_team: awayOpponentTeam,
      })
    }
  }

  const handlePlayerSelect = (playerId: string) => {
    const player = players.find((p) => p.id === playerId)
    if (!player) return

    const existingStats = legStats.find((s) => s.player_id === playerId)

    if (existingStats) {
      setCurrentStats(existingStats)
    } else {
      setCurrentStats({
        match_id: match.id,
        leg_number: 1,
        player_id: playerId,
        player_name: player.name,
        leg_winner_id: undefined,
        leg_wins: 0,
        legs_won_in_match: 0,
        player_legs_won: 0,
        opponent_legs_won: 0,
        throws_180: 0,
        throws_171: 0,
        throws_high_tonne: 0,
        throws_tonne: 0,
        throws_shanghai: 0,
        throws_95_plus: 0,
        throws_under_26: 0,
        throws_under_30: 0,
        semperit_outs: 0,
        throws_15: 0,
        throws_16: 0,
        throws_17: 0,
        throws_18: 0,
        throws_19: 0,
        throws_20: 0,
        throws_bull: 0,
        notes: "",
        dart_type: match.dart_type || "steeldart",
      })
    }

    setSelectedPlayerId(playerId)
  }

  const savePlayerStats = async () => {
    if (!selectedPlayerId || !currentStats.player_name) return

    setLoading(true)
    try {
      const statsData = {
        match_id: match.id,
        leg_number: currentStats.leg_number,
        player_id: selectedPlayerId,
        leg_winner_id:
          currentStats.player_legs_won && currentStats.player_legs_won > (currentStats.opponent_legs_won || 0)
            ? selectedPlayerId
            : null,
        leg_wins:
          currentStats.player_legs_won && currentStats.player_legs_won > (currentStats.opponent_legs_won || 0) ? 1 : 0,
        legs_won_in_match: currentStats.legs_won_in_match,
        player_legs_won: currentStats.player_legs_won,
        opponent_legs_won: currentStats.opponent_legs_won,
        throws_180: currentStats.throws_180,
        throws_171: currentStats.throws_171,
        throws_high_tonne: currentStats.throws_high_tonne,
        throws_tonne: currentStats.throws_tonne,
        throws_shanghai: currentStats.throws_shanghai,
        throws_95_plus: currentStats.throws_95_plus,
        throws_under_26: currentStats.throws_under_26,
        throws_under_30: currentStats.throws_under_30,
        semperit_outs: currentStats.semperit_outs,
        throws_15: currentStats.throws_15,
        throws_16: currentStats.throws_16,
        throws_17: currentStats.throws_17,
        throws_18: currentStats.throws_18,
        throws_19: currentStats.throws_19,
        throws_20: currentStats.throws_20,
        throws_bull: currentStats.throws_bull,
        notes: currentStats.notes,
        dart_type: match.dart_type || "steeldart",
      }

      let error
      if (currentStats.id) {
        const result = await supabase.from("leg_statistics").update(statsData).eq("id", currentStats.id)
        error = result.error
      } else {
        const result = await supabase.from("leg_statistics").insert(statsData)
        error = result.error
      }

      if (!error) {
        setSavedPlayerName(currentStats.player_name)
        setSuccessModalOpen(true)

        fetchLegStatistics()
        setSelectedPlayerId("")
        setCurrentStats({
          match_id: match.id,
          leg_number: 1,
          player_id: "",
          player_name: "",
          leg_winner_id: undefined,
          leg_wins: 0,
          legs_won_in_match: 0,
          player_legs_won: 0,
          opponent_legs_won: 0,
          throws_180: 0,
          throws_171: 0,
          throws_high_tonne: 0,
          throws_tonne: 0,
          throws_shanghai: 0,
          throws_95_plus: 0,
          throws_under_26: 0,
          throws_under_30: 0,
          semperit_outs: 0,
          throws_15: 0,
          throws_16: 0,
          throws_17: 0,
          throws_18: 0,
          throws_19: 0,
          throws_20: 0,
          throws_bull: 0,
          notes: "",
          dart_type: match.dart_type || "steeldart",
        })
      }
    } catch (error) {
      console.error("Error saving player statistics:", error)
    } finally {
      setLoading(false)
    }
  }

  const deletePlayerStats = async () => {
    if (!playerToDelete?.id) return

    setLoading(true)
    try {
      const { error } = await supabase.from("leg_statistics").delete().eq("id", playerToDelete.id)

      if (!error) {
        fetchLegStatistics()
        setDeleteModalOpen(false)
        setPlayerToDelete(null)
      }
    } catch (error) {
      console.error("Error deleting player statistics:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (stat: LegStatistic) => {
    setPlayerToDelete(stat)
    setDeleteModalOpen(true)
  }

  const updateCurrentStats = (field: keyof LegStatistic, value: any) => {
    setCurrentStats((prev) => ({ ...prev, [field]: value }))
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE")
  }

  const teamName = myTeam?.name || "Mein Team"

  const getOpponentName = () => {
    if (!enrichedMatch) return "Unbekannter Gegner"

    if (enrichedMatch.home_team_id === myTeamId) {
      if (enrichedMatch.away_team_type === "club_team" && enrichedMatch.away_team) {
        return enrichedMatch.away_team.name
      } else if (enrichedMatch.away_team_type === "opponent_team" && enrichedMatch.away_opponent_team) {
        return enrichedMatch.away_opponent_team.name
      }
    } else {
      if (enrichedMatch.home_team_type === "club_team" && enrichedMatch.home_team) {
        return enrichedMatch.home_team.name
      } else if (enrichedMatch.home_team_type === "opponent_team" && enrichedMatch.home_opponent_team) {
        return enrichedMatch.home_opponent_team.name
      }
    }

    return "Unbekannter Gegner"
  }

  const getScoreDisplay = () => {
    if (enrichedMatch.home_score === null || enrichedMatch.away_score === null) return "- : -"

    if (enrichedMatch.home_team_id === myTeamId) {
      return `${enrichedMatch.home_score} : ${enrichedMatch.away_score}`
    } else {
      return `${enrichedMatch.away_score} : ${enrichedMatch.home_score}`
    }
  }

  useEffect(() => {
    if (successModalOpen) {
      const timer = setTimeout(() => {
        setSuccessModalOpen(false)
      }, 3000) // Auto-dismiss after 3 seconds

      return () => clearTimeout(timer)
    }
  }, [successModalOpen])

  return (
    <div className="space-y-6">
      {showHeader && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="outline"
                onClick={() => router.push("/member-dashboard")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück zum Dashboard
              </Button>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                🎯 Spielstatistiken - {teamName} vs {getOpponentName()}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="text-lg font-medium">
                  {formatDate(enrichedMatch.match_date)} • {enrichedMatch.match_time}
                </span>
                {enrichedMatch.venue && (
                  <>
                    <span>•</span>
                    <span>{enrichedMatch.venue}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 text-lg">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border">
                  <span className="font-bold text-blue-600">{teamName}</span>
                  <Badge variant="secondary" className="text-lg px-3 py-1 font-bold bg-blue-100 text-blue-800">
                    {getScoreDisplay()}
                  </Badge>
                  <span className="font-bold text-red-600">{getOpponentName()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-xl border-0 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Spielerstatistiken nach dem Spiel eingeben
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Wähle einen Spieler aus deinem Team aus und gib seine Statistiken für das gesamte Spiel ein.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Spieler auswählen</Label>
            <Select value={selectedPlayerId} onValueChange={handlePlayerSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Spieler auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                    {legStats.find((s) => s.player_id === player.id) && (
                      <Badge variant="secondary" className="ml-2">
                        Bereits eingegeben
                      </Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlayerId && (
            <Card className="border-2 border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                <CardTitle className="flex items-center gap-2">🎯 Statistiken für {currentStats.player_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <NumberInput
                    id="player_legs_won"
                    label="Legs gewonnen"
                    value={currentStats.player_legs_won || 0}
                    onChange={(value) => updateCurrentStats("player_legs_won", value)}
                    className="border-blue-300"
                    labelClassName="text-blue-700 font-semibold"
                  />
                  <NumberInput
                    id="opponent_legs_won"
                    label="Gegner Legs"
                    value={currentStats.opponent_legs_won || 0}
                    onChange={(value) => updateCurrentStats("opponent_legs_won", value)}
                    className="border-blue-300"
                    labelClassName="text-blue-700 font-semibold"
                  />
                </div>
                {/* </CHANGE> */}

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">🎯 High Scores</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <NumberInput
                      id="throws_180"
                      label="180er"
                      value={currentStats.throws_180}
                      onChange={(value) => updateCurrentStats("throws_180", value)}
                    />
                    <NumberInput
                      id="throws_171"
                      label="171er"
                      value={currentStats.throws_171}
                      onChange={(value) => updateCurrentStats("throws_171", value)}
                    />
                    <NumberInput
                      id="throws_high_tonne"
                      label="High Tonne"
                      value={currentStats.throws_high_tonne}
                      onChange={(value) => updateCurrentStats("throws_high_tonne", value)}
                    />
                    <NumberInput
                      id="throws_tonne"
                      label="Tonne"
                      value={currentStats.throws_tonne}
                      onChange={(value) => updateCurrentStats("throws_tonne", value)}
                    />
                    <NumberInput
                      id="throws_shanghai"
                      label="Shanghai"
                      value={currentStats.throws_shanghai}
                      onChange={(value) => updateCurrentStats("throws_shanghai", value)}
                    />
                    <NumberInput
                      id="throws_95_plus"
                      label="95+"
                      value={currentStats.throws_95_plus}
                      onChange={(value) => updateCurrentStats("throws_95_plus", value)}
                    />
                    <NumberInput
                      id="throws_bull"
                      label="Bull"
                      value={currentStats.throws_bull}
                      onChange={(value) => updateCurrentStats("throws_bull", value)}
                    />
                  </div>
                  {/* </CHANGE> */}
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                    🎲 Weitere Scores
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <NumberInput
                      id="throws_15"
                      label="15er"
                      value={currentStats.throws_15}
                      onChange={(value) => updateCurrentStats("throws_15", value)}
                    />
                    <NumberInput
                      id="throws_16"
                      label="16er"
                      value={currentStats.throws_16}
                      onChange={(value) => updateCurrentStats("throws_16", value)}
                    />
                    <NumberInput
                      id="throws_17"
                      label="17er"
                      value={currentStats.throws_17}
                      onChange={(value) => updateCurrentStats("throws_17", value)}
                    />
                    <NumberInput
                      id="throws_18"
                      label="18er"
                      value={currentStats.throws_18}
                      onChange={(value) => updateCurrentStats("throws_18", value)}
                    />
                    <NumberInput
                      id="throws_19"
                      label="19er"
                      value={currentStats.throws_19}
                      onChange={(value) => updateCurrentStats("throws_19", value)}
                    />
                    <NumberInput
                      id="throws_20"
                      label="20er"
                      value={currentStats.throws_20}
                      onChange={(value) => updateCurrentStats("throws_20", value)}
                    />
                  </div>
                  {/* </CHANGE> */}
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">⚠️ Under-Scores</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <NumberInput
                      id="throws_under_26"
                      label="Unter 26"
                      value={currentStats.throws_under_26}
                      onChange={(value) => updateCurrentStats("throws_under_26", value)}
                      className="border-red-300"
                      labelClassName="text-red-700"
                    />
                    <NumberInput
                      id="throws_under_30"
                      label="Unter 30"
                      value={currentStats.throws_under_30}
                      onChange={(value) => updateCurrentStats("throws_under_30", value)}
                      className="border-red-300"
                      labelClassName="text-red-700"
                    />
                    <NumberInput
                      id="semperit_outs"
                      label="Semperit"
                      value={currentStats.semperit_outs}
                      onChange={(value) => updateCurrentStats("semperit_outs", value)}
                      className="border-red-300"
                      labelClassName="text-red-700"
                    />
                  </div>
                  {/* </CHANGE> */}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium">
                    Notizen
                  </Label>
                  <Textarea
                    id="notes"
                    value={currentStats.notes}
                    onChange={(e) => updateCurrentStats("notes", e.target.value)}
                    placeholder="Zusätzliche Notizen zum Spiel..."
                    className="min-h-[80px]"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={savePlayerStats}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 min-h-[44px] px-8"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {currentStats.id ? "Statistiken aktualisieren" : "Statistiken speichern"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {legStats.length > 0 && (
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Trophy className="h-6 w-6 text-amber-600" />
                  Eingegebene Statistiken
                  <Badge variant="secondary" className="ml-auto">
                    {legStats.length} Spieler
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-4">
                  {legStats.map((stat) => (
                    <Card key={stat.id} className="border border-slate-200 shadow-sm">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b pb-3">
                            <h5 className="font-bold text-xl text-gray-900">{stat.player_name}</h5>
                            <div className="text-sm text-muted-foreground">{formatDate(match.match_date)}</div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                              <span className="text-sm font-medium">Legs gewonnen:</span>
                              <span className="text-lg font-bold text-green-600">{stat.player_legs_won || 0}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                              <span className="text-sm font-medium">Gegner Legs:</span>
                              <span className="text-lg font-bold text-red-600">{stat.opponent_legs_won || 0}</span>
                            </div>

                            <div className="space-y-2">
                              <h6 className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                                🎯 High Scores
                              </h6>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                                  <span className="text-sm font-medium">180er:</span>
                                  <span className="text-lg font-bold text-blue-600">{stat.throws_180}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                                  <span className="text-sm font-medium">171er:</span>
                                  <span className="text-lg font-bold text-purple-600">{stat.throws_171}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                                  <span className="text-sm font-medium">High Tonne:</span>
                                  <span className="text-lg font-bold text-orange-600">{stat.throws_high_tonne}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-teal-50 rounded">
                                  <span className="text-sm font-medium">Tonne:</span>
                                  <span className="text-lg font-bold text-teal-600">{stat.throws_tonne}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-pink-50 rounded">
                                  <span className="text-sm font-medium">Shanghai:</span>
                                  <span className="text-lg font-bold text-pink-600">{stat.throws_shanghai}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-amber-50 rounded">
                                  <span className="text-sm font-medium">95+:</span>
                                  <span className="text-lg font-bold text-amber-600">{stat.throws_95_plus}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-cyan-50 rounded">
                                  <span className="text-sm font-medium">Bull:</span>
                                  <span className="text-lg font-bold text-cyan-600">{stat.throws_bull}</span>
                                </div>
                              </div>
                              {/* </CHANGE> */}
                            </div>

                            <div className="space-y-2">
                              <h6 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                                🎲 Zahlen-Scores
                              </h6>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                  <span className="text-sm font-medium">15er:</span>
                                  <span className="text-lg font-bold text-slate-600">{stat.throws_15}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                  <span className="text-sm font-medium">16er:</span>
                                  <span className="text-lg font-bold text-slate-600">{stat.throws_16}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                  <span className="text-sm font-medium">17er:</span>
                                  <span className="text-lg font-bold text-slate-600">{stat.throws_17}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                  <span className="text-sm font-medium">18er:</span>
                                  <span className="text-lg font-bold text-slate-600">{stat.throws_18}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                  <span className="text-sm font-medium">19er:</span>
                                  <span className="text-lg font-bold text-slate-600">{stat.throws_19}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                  <span className="text-sm font-medium">20er:</span>
                                  <span className="text-lg font-bold text-slate-600">{stat.throws_20}</span>
                                </div>
                              </div>
                              {/* </CHANGE> */}
                            </div>

                            <div className="space-y-2">
                              <h6 className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                                ⚠️ Under-Scores
                              </h6>
                              <div className="grid grid-cols-1 gap-2">
                                <div className="flex justify-between items-center p-2 bg-red-100 rounded">
                                  <span className="text-sm font-medium">Unter 26:</span>
                                  <span className="text-lg font-bold text-red-500">{stat.throws_under_26}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-red-100 rounded">
                                  <span className="text-sm font-medium">Unter 30:</span>
                                  <span className="text-lg font-bold text-red-500">{stat.throws_under_30}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-red-100 rounded">
                                  <span className="text-sm font-medium">Semperit:</span>
                                  <span className="text-lg font-bold text-red-500">{stat.semperit_outs}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlayerSelect(stat.player_id)}
                              className="flex-1"
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(stat)}
                              className="flex-1"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-green-800">
              Statistik erfolgreich gespeichert! 🎯
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 mt-2">
              Die Statistiken für <strong className="text-green-700">{savedPlayerName}</strong> wurden erfolgreich
              eingegeben und gespeichert.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setSuccessModalOpen(false)} className="bg-green-600 hover:bg-green-700 px-8">
              Perfekt!
            </Button>
          </DialogFooter>
          <div className="text-center text-xs text-gray-500 mt-2">Schließt automatisch in 3 Sekunden...</div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Statistiken löschen</DialogTitle>
            <DialogDescription>
              Möchtest du die Statistiken für <strong>{playerToDelete?.player_name}</strong> wirklich löschen? Diese
              Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={loading}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={deletePlayerStats} disabled={loading}>
              <Trash2 className="h-4 w-4 mr-2" />
              {loading ? "Wird gelöscht..." : "Löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
