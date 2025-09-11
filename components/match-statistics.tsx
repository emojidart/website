"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, Save, Play, Target, Trophy, TrendingUp, Crown, Minus, Plus } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import TeamLineupSelector from "@/components/team-lineup-selector"

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
}

interface MatchLineup {
  id: string
  match_id: string
  team_id: string
  player_id: string
  position: number
  is_substitute: boolean
  player_name: string
}

interface LegStatistic {
  id: string
  match_id: string
  leg_number: number
  player_id: string
  player_name: string
  leg_winner_id?: string
  leg_winner_ids?: string
  leg_wins: number
  legs_won_in_match?: number // actual legs won in individual format
  player_legs_won?: number // legs won by this player in 1v1 match
  opponent_legs_won?: number // legs won by opponent in 1v1 match
  throws_180: number
  throws_171: number
  throws_high_tonne: number
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
}

interface MatchStatisticsProps {
  match: Match
  onClose: () => void
  myTeamId: string
  myTeam: Team | null // Declare myTeam variable
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
          className="h-11 w-11 p-0 rounded-none border-r hover:bg-gray-100"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          id={id}
          type="number"
          min={min}
          value={value || ""}
          onChange={handleInputChange}
          className={`border-0 text-center h-11 focus-visible:ring-0 focus-visible:ring-offset-0 ${className}`}
          placeholder="0"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleIncrement}
          className="h-11 w-11 p-0 rounded-none border-l hover:bg-gray-100"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function MatchStatistics({ match, onClose, myTeamId, myTeam }: MatchStatisticsProps) {
  const [activeTab, setActiveTab] = useState<"lineup" | "legs">("lineup")
  const [players, setPlayers] = useState<Player[]>([])
  const [lineups, setLineups] = useState<MatchLineup[]>([])
  const [legStats, setLegStats] = useState<LegStatistic[]>([])
  const [currentLeg, setCurrentLeg] = useState(1)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [isLegActive, setIsLegActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null)
  const [legWinnerIds, setLegWinnerIds] = useState<string[]>([]) // Support multiple winners
  const [legFormData, setLegFormData] = useState<{ [key: string]: any }>({}) // Declare legFormData variable
  const [individualMatchResults, setIndividualMatchResults] = useState<{
    [key: string]: { score: string; legsWon: number }
  }>({})
  const [matchFormat, setMatchFormat] = useState<"team" | "individual" | "best_of_three">(
    match.match_format || (match.division_type === "individual_division" ? "best_of_three" : "team"),
  )

  useEffect(() => {
    fetchPlayers()
    fetchLineups()
    fetchLegStatistics()
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
      // Extract player data from the joined result
      const teamPlayers = data.map((member: any) => member.club_players).filter(Boolean) // Remove any null entries
      setPlayers(teamPlayers)
    }
  }

  const fetchLineups = async () => {
    const { data, error } = await supabase
      .from("match_lineups")
      .select(`id, match_id, team_id, player_id, position, is_substitute, club_players(name)`)
      .eq("match_id", match.id)
      .order("position")

    if (!error && data) {
      const lineupsWithNames = data.map((lineup: any) => ({
        ...lineup,
        player_name: lineup.club_players.name,
      }))
      setLineups(lineupsWithNames)
    }
  }

  const fetchLegStatistics = async () => {
    const { data, error } = await supabase
      .from("leg_statistics")
      .select(
        `id, match_id, leg_number, player_id, leg_winner_id, leg_winner_ids, leg_wins, throws_180, throws_171, throws_high_tonne, throws_tonne, throws_shanghai, throws_95_plus, throws_under_26, throws_under_30, semperit_outs, throws_15, throws_16, throws_17, throws_18, throws_19, throws_20, throws_bull, notes, 
         player:club_players!leg_statistics_player_id_fkey(name),
         leg_winner:club_players!leg_statistics_leg_winner_id_fkey(name)`,
      )
      .eq("match_id", match.id)
      .order("leg_number")

    if (!error && data) {
      const statsWithNames = data.map((stat: any) => ({
        ...stat,
        player_name: stat.player.name,
        leg_winner_name: stat.leg_winner?.name || null,
      }))
      setLegStats(statsWithNames)

      // Set current leg to next available leg
      const maxLeg = Math.max(0, ...data.map((s) => s.leg_number))
      setCurrentLeg(maxLeg + 1)
    } else if (error) {
      console.error("Error fetching leg statistics:", error)
    }
  }

  const saveLineup = async (teamId: string, playerIds: string[]) => {
    setLoading(true)
    try {
      // Delete existing lineup for this team
      await supabase.from("match_lineups").delete().eq("match_id", match.id).eq("team_id", teamId)

      // Insert new lineup
      const lineupData = playerIds.map((playerId, index) => ({
        match_id: match.id,
        team_id: teamId,
        player_id: playerId,
        position: index + 1,
        is_substitute: index === 4, // 5th player is substitute
      }))

      const { error } = await supabase.from("match_lineups").insert(lineupData)

      if (!error) {
        fetchLineups()
      }
    } catch (error) {
      console.error("Error saving lineup:", error)
    } finally {
      setLoading(false)
    }
  }

  const startLeg = () => {
    setIsLegActive(true)
    setSelectedPlayers([])
    setLegFormData({})
    setActivePlayerId(null)
    setLegWinnerIds([]) // Reset multiple winners
  }

  const saveLegStatistics = async () => {
    if (selectedPlayers.length === 0) return

    setLoading(true)
    try {
      console.log("[v0] Saving leg statistics for format:", matchFormat)
      let legData: any[] = []

      if (matchFormat === "team") {
        const legWinnerIdsString = legWinnerIds.length > 0 ? legWinnerIds.join(",") : null

        legData = selectedPlayers.map((playerId) => ({
          match_id: match.id,
          leg_number: currentLeg,
          player_id: playerId,
          leg_winner_id: legWinnerIds.includes(playerId) ? playerId : null,
          leg_winner_ids: legWinnerIdsString,
          leg_wins: legWinnerIds.includes(playerId) ? 1 : 0,
          throws_180: legFormData[`${playerId}_180`] || 0,
          throws_171: legFormData[`${playerId}_171`] || 0,
          throws_15: legFormData[`${playerId}_15`] || 0,
          throws_16: legFormData[`${playerId}_16`] || 0,
          throws_17: legFormData[`${playerId}_17`] || 0,
          throws_18: legFormData[`${playerId}_18`] || 0,
          throws_19: legFormData[`${playerId}_19`] || 0,
          throws_20: legFormData[`${playerId}_20`] || 0,
          throws_high_tonne: legFormData[`${playerId}_high_tonne`] || 0,
          throws_tonne: legFormData[`${playerId}_tonne`] || 0,
          throws_shanghai: legFormData[`${playerId}_shanghai`] || 0,
          throws_95_plus: legFormData[`${playerId}_95_plus`] || 0,
          throws_under_26: legFormData[`${playerId}_under26`] || 0,
          throws_under_30: legFormData[`${playerId}_under30`] || 0,
          semperit_outs: legFormData[`${playerId}_semperit`] || 0,
          throws_bull: legFormData[`${playerId}_bull`] || 0,
          notes: legFormData[`${playerId}_notes`] || "",
        }))
      } else if (matchFormat === "best_of_three" || matchFormat === "individual") {
        legData = selectedPlayers.map((playerId) => {
          const result = individualMatchResults[playerId] || { score: "0:0", legsWon: 0 }
          const [playerLegs, opponentLegs] = result.score.split(":").map(Number)
          console.log("[v0] Processing player", playerId, "with result:", result)

          return {
            match_id: match.id,
            leg_number: currentLeg,
            player_id: playerId,
            leg_winner_id: result.legsWon > 0 ? playerId : null,
            leg_wins: result.legsWon,
            legs_won_in_match: result.legsWon,
            player_legs_won: playerLegs || 0,
            opponent_legs_won: opponentLegs || 0,
            throws_180: legFormData[`${playerId}_180`] || 0,
            throws_171: legFormData[`${playerId}_171`] || 0,
            throws_15: legFormData[`${playerId}_15`] || 0,
            throws_16: legFormData[`${playerId}_16`] || 0,
            throws_17: legFormData[`${playerId}_17`] || 0,
            throws_18: legFormData[`${playerId}_18`] || 0,
            throws_19: legFormData[`${playerId}_19`] || 0,
            throws_20: legFormData[`${playerId}_20`] || 0,
            throws_high_tonne: legFormData[`${playerId}_high_tonne`] || 0,
            throws_tonne: legFormData[`${playerId}_tonne`] || 0,
            throws_shanghai: legFormData[`${playerId}_shanghai`] || 0,
            throws_95_plus: legFormData[`${playerId}_95_plus`] || 0,
            throws_under_26: legFormData[`${playerId}_under26`] || 0,
            throws_under_30: legFormData[`${playerId}_under30`] || 0,
            semperit_outs: legFormData[`${playerId}_semperit`] || 0,
            throws_bull: legFormData[`${playerId}_bull`] || 0,
            notes: legFormData[`${playerId}_notes`] || "",
          }
        })
      }

      console.log("[v0] Inserting leg data:", legData)
      const { error } = await supabase.from("leg_statistics").insert(legData)

      if (error) {
        console.log("[v0] Error saving leg statistics:", error)
        throw error
      }

      console.log("[v0] Successfully saved leg statistics")
      setIsLegActive(false)
      setCurrentLeg(currentLeg + 1)
      setSelectedPlayers([])
      setLegFormData({})
      setLegWinnerIds([])
      setIndividualMatchResults({})
      fetchLegStatistics()
    } catch (error) {
      console.error("Error saving leg statistics:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateLegFormData = (key: string, value: any) => {
    setLegFormData((prev) => ({ ...prev, [key]: value }))
  }

  const getTeamLineup = (teamId: string) => {
    return lineups.filter((l) => l.team_id === teamId)
  }

  const getAvailablePlayers = (teamId: string) => {
    const teamLineup = getTeamLineup(teamId)
    return teamLineup.map((l) => players.find((p) => p.id === l.player_id)).filter(Boolean) as Player[]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE")
  }

  const { match_date: matchDate, match_time: matchTime } = match
  const teamName = myTeam?.name || "Mein Team"

  const playerTotals = legStats.reduce((acc: any, stat: any) => {
    const playerId = stat.player_id
    if (!acc[playerId]) {
      acc[playerId] = {
        player_id: playerId,
        player_name: stat.player_name,
        total_legs: 0,
        total_wins: 0,
        total_180: 0,
        total_171: 0,
        total_high_ton: 0,
        total_ton: 0,
        total_shanghai: 0,
        total_95_plus: 0,
        total_bull: 0,
        total_19er: 0,
        total_18er: 0,
        total_17er: 0,
        total_16er: 0,
        total_15er: 0,
        total_u26: 0,
        total_u30: 0,
        total_semp: 0,
        win_percentage: 0,
      }
    }

    // Calculate actual legs played from player_legs_won + opponent_legs_won
    const actualLegsPlayed = (stat.player_legs_won || 0) + (stat.opponent_legs_won || 0)
    const legsToAdd = actualLegsPlayed > 0 ? actualLegsPlayed : 1 // fallback to 1 for team matches

    acc[playerId].total_legs += legsToAdd
    acc[playerId].total_wins += stat.leg_wins || 0
    acc[playerId].total_180 += stat.throws_180 || 0
    acc[playerId].total_171 += stat.throws_171 || 0
    acc[playerId].total_high_ton += stat.throws_high_tonne || 0
    acc[playerId].total_ton += stat.throws_tonne || 0
    acc[playerId].total_shanghai += stat.throws_shanghai || 0
    acc[playerId].total_95_plus += stat.throws_95_plus || 0
    acc[playerId].total_bull += stat.throws_bull || 0
    acc[playerId].total_19er += stat.throws_19 || 0
    acc[playerId].total_18er += stat.throws_18 || 0
    acc[playerId].total_17er += stat.throws_17 || 0
    acc[playerId].total_16er += stat.throws_16 || 0
    acc[playerId].total_15er += stat.throws_15 || 0
    acc[playerId].total_u26 += stat.throws_under_26 || 0
    acc[playerId].total_u30 += stat.throws_under_30 || 0
    acc[playerId].total_semp += stat.semperit_outs || 0

    return acc
  }, {})

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none max-h-none m-0 p-0 sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl sm:max-h-[95vh] sm:m-4 sm:rounded-lg overflow-y-auto">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-3 py-2 sm:px-6 md:px-8 sm:py-4 border-b shrink-0">
            <DialogTitle className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
              🎯 Spielstatistiken - {teamName}
            </DialogTitle>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
              {formatDate(matchDate)} • {matchTime}
            </p>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "lineup" | "legs")}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid w-full grid-cols-2 h-auto gap-1 px-3 py-2 sm:px-6 md:px-8 shrink-0">
              <TabsTrigger
                value="lineup"
                className="flex items-center gap-2 py-2 sm:py-3 text-xs sm:text-sm md:text-base"
              >
                <Users className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden sm:inline">Aufstellung</span>
                <span className="sm:hidden">Team</span>
              </TabsTrigger>
              <TabsTrigger
                value="legs"
                className="flex items-center gap-2 py-2 sm:py-3 text-xs sm:text-sm md:text-base"
              >
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden sm:inline">Spielerstatistiken nach Spiel</span>
                <span className="sm:hidden">Statistiken</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lineup" className="space-y-6 p-3 sm:px-6 md:px-8 pb-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {myTeam?.name || "Mein Team"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TeamLineupSelector
                      teamId={myTeamId}
                      players={players}
                      lineup={getTeamLineup(myTeamId)}
                      onSave={(playerIds) => saveLineup(myTeamId, playerIds)}
                      loading={loading}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent
              value="legs"
              className="space-y-4 sm:space-y-6 p-3 sm:px-6 md:px-8 pb-6 flex-1 overflow-y-auto"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-semibold">Leg {currentLeg}</h3>
                  <Badge variant={isLegActive ? "default" : "secondary"} className="px-2 py-1 text-xs sm:text-sm">
                    {isLegActive ? "🎯 Aktiv" : "⏸️ Bereit"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {!isLegActive ? (
                    <Button
                      onClick={startLeg}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 min-h-[44px] touch-manipulation"
                    >
                      <Play className="h-4 w-4" />
                      <span className="hidden sm:inline">Leg starten</span>
                      <span className="sm:hidden">Start</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={saveLegStatistics}
                      disabled={selectedPlayers.length === 0 || loading}
                      className="bg-blue-600 hover:bg-blue-700 min-h-[44px] touch-manipulation"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Leg speichern</span>
                      <span className="sm:hidden">Speichern</span>
                    </Button>
                  )}
                </div>
              </div>

              {isLegActive && (
                <Card className="border-2 border-primary/20 flex-1 flex flex-col">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Spieler für Leg {currentLeg} auswählen
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2">
                      <Label className="text-sm font-medium">Spielformat:</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={matchFormat === "team" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMatchFormat("team")}
                        >
                          Team (2er)
                        </Button>
                        <Button
                          variant={matchFormat === "best_of_three" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMatchFormat("best_of_three")}
                        >
                          1v1 (Best of 3)
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6 flex-1 flex flex-col">
                    {matchFormat === "team" && selectedPlayers.length > 0 && (
                      <Card className="bg-amber-50 border-amber-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Crown className="h-4 w-4 text-amber-600" />
                            Leg-Gewinner auswählen (Team-Format)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <Label className="text-sm font-medium">
                              Wer hat dieses Leg gewonnen? (Mehrfachauswahl möglich)
                            </Label>
                            <div className="grid gap-3">
                              {selectedPlayers.map((playerId) => {
                                const player = players.find((p) => p.id === playerId)
                                if (!player) return null
                                return (
                                  <div
                                    key={playerId}
                                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                  >
                                    <Checkbox
                                      id={`winner-${playerId}`}
                                      checked={legWinnerIds.includes(playerId)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setLegWinnerIds([...legWinnerIds, playerId])
                                        } else {
                                          setLegWinnerIds(legWinnerIds.filter((id) => id !== playerId))
                                        }
                                      }}
                                    />
                                    <Label
                                      htmlFor={`winner-${playerId}`}
                                      className="text-sm font-medium flex-1 cursor-pointer flex items-center gap-2"
                                    >
                                      <Crown className="h-4 w-4 text-amber-600" />
                                      {player.name}
                                    </Label>
                                  </div>
                                )
                              })}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Wähle einen oder mehrere Spieler aus, die dieses Leg gewonnen haben. Bei Team-Spiel können
                              beide Spieler als Gewinner markiert werden.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {(matchFormat === "best_of_three" || matchFormat === "individual") &&
                      selectedPlayers.length > 0 && (
                        <Card className="bg-blue-50 border-blue-200">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Trophy className="h-4 w-4 text-blue-600" />
                              Einzel-Ergebnisse (1v1 Format)
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <Label className="text-sm font-medium">Ergebnis des Best-of-3 Matches eingeben</Label>
                              <div className="grid gap-4">
                                {selectedPlayers.map((playerId) => {
                                  const player = players.find((p) => p.id === playerId)
                                  if (!player) return null
                                  return (
                                    <div key={playerId} className="p-4 border rounded-lg bg-white">
                                      <Label className="text-sm font-medium mb-2 block">{player.name}</Label>
                                      <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                          <Label className="text-xs text-muted-foreground">
                                            Match-Ergebnis (z.B. 2:1)
                                          </Label>
                                          <Input
                                            placeholder="2:1"
                                            value={individualMatchResults[playerId]?.score || ""}
                                            onChange={(e) => {
                                              const score = e.target.value
                                              const [won, lost] = score.split(":").map((n) => Number.parseInt(n) || 0)
                                              setIndividualMatchResults((prev) => ({
                                                ...prev,
                                                [playerId]: {
                                                  score,
                                                  legsWon: won,
                                                },
                                              }))
                                            }}
                                            className="mt-1"
                                          />
                                        </div>
                                        <div className="w-20">
                                          <Label className="text-xs text-muted-foreground">Legs gewonnen</Label>
                                          <div className="mt-1 text-lg font-bold text-center p-2 bg-gray-50 rounded">
                                            {individualMatchResults[playerId]?.legsWon || 0}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Bei 1v1 Best-of-3: Gib das Endergebnis ein (z.B. 2:1). Die gewonnenen Legs werden
                                automatisch berechnet.
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          {myTeam?.name || "Mein Team"}
                        </h4>
                        <div className="grid gap-3">
                          {getAvailablePlayers(myTeamId).map((player) => (
                            <div
                              key={player.id}
                              className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <Checkbox
                                id={player.id}
                                checked={selectedPlayers.includes(player.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPlayers([...selectedPlayers, player.id])
                                  } else {
                                    setSelectedPlayers(selectedPlayers.filter((id) => id !== player.id))
                                    if (activePlayerId === player.id) {
                                      setActivePlayerId(null)
                                    }
                                    if (legWinnerIds.includes(player.id)) {
                                      setLegWinnerIds(legWinnerIds.filter((id) => id !== player.id))
                                    }
                                  }
                                }}
                              />
                              <Label htmlFor={player.id} className="text-sm font-medium flex-1 cursor-pointer">
                                {player.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ... existing code for player selection and statistics form ... */}

                    {selectedPlayers.length > 1 && (
                      <Card className="bg-blue-50 border-blue-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">🎯 Aktiver Spieler wechseln</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {selectedPlayers.map((playerId) => {
                              const player = players.find((p) => p.id === playerId)
                              if (!player) return null

                              return (
                                <Button
                                  key={playerId}
                                  variant={activePlayerId === playerId ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setActivePlayerId(playerId)}
                                  className={`transition-all ${
                                    activePlayerId === playerId
                                      ? "bg-primary text-primary-foreground shadow-lg scale-105"
                                      : "hover:bg-muted"
                                  }`}
                                >
                                  {activePlayerId === playerId && "🎯 "}
                                  {player.name}
                                </Button>
                              )
                            })}
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Wähle den Spieler aus, für den du gerade Statistiken eingeben möchtest.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {selectedPlayers.length > 0 && (
                      <div className="space-y-6 mt-6">
                        {(() => {
                          const targetPlayerId = selectedPlayers.length === 1 ? selectedPlayers[0] : activePlayerId
                          if (!targetPlayerId) return null

                          const player = players.find((p) => p.id === targetPlayerId)
                          if (!player) return null

                          return (
                            <Card
                              key={targetPlayerId}
                              className={`transition-all ${
                                selectedPlayers.length > 1 ? "border-2 border-primary shadow-lg" : ""
                              }`}
                            >
                              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  {selectedPlayers.length > 1 && "🎯 "}
                                  {player.name}
                                  {selectedPlayers.length > 1 && (
                                    <Badge variant="secondary" className="ml-auto">
                                      Aktiv
                                    </Badge>
                                  )}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-3 sm:pt-4 lg:pt-6">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
                                  <NumberInput
                                    id={`${targetPlayerId}_180`}
                                    label="180er"
                                    value={legFormData[`${targetPlayerId}_180`] || 0}
                                    onChange={(value) => updateLegFormData(`${targetPlayerId}_180`, value)}
                                  />
                                  <NumberInput
                                    id={`${targetPlayerId}_171`}
                                    label="171er"
                                    value={legFormData[`${targetPlayerId}_171`] || 0}
                                    onChange={(value) => updateLegFormData(`${targetPlayerId}_171`, value)}
                                  />
                                  <NumberInput
                                    id={`${targetPlayerId}_15`}
                                    label="15er"
                                    value={legFormData[`${targetPlayerId}_15`] || 0}
                                    onChange={(value) => updateLegFormData(`${targetPlayerId}_15`, value)}
                                  />
                                  <NumberInput
                                    id={`${targetPlayerId}_16`}
                                    label="16er"
                                    value={legFormData[`${targetPlayerId}_16`] || 0}
                                    onChange={(value) => updateLegFormData(`${targetPlayerId}_16`, value)}
                                  />
                                  <NumberInput
                                    id={`${targetPlayerId}_17`}
                                    label="17er"
                                    value={legFormData[`${targetPlayerId}_17`] || 0}
                                    onChange={(value) => updateLegFormData(`${targetPlayerId}_17`, value)}
                                  />
                                  <NumberInput
                                    id={`${targetPlayerId}_18`}
                                    label="18er"
                                    value={legFormData[`${targetPlayerId}_18`] || 0}
                                    onChange={(value) => updateLegFormData(`${targetPlayerId}_18`, value)}
                                  />
                                  <NumberInput
                                    id={`${targetPlayerId}_19`}
                                    label="19er"
                                    value={legFormData[`${targetPlayerId}_19`] || 0}
                                    onChange={(value) => updateLegFormData(`${targetPlayerId}_19`, value)}
                                  />
                                  <NumberInput
                                    id={`${targetPlayerId}_20`}
                                    label="20er"
                                    value={legFormData[`${targetPlayerId}_20`] || 0}
                                    onChange={(value) => updateLegFormData(`${targetPlayerId}_20`, value)}
                                  />
                                  <NumberInput
                                    id={`${targetPlayerId}_high_tonne`}
                                    label="High Tonne"
                                    value={legFormData[`${targetPlayerId}_high_tonne`] || 0}
                                    onChange={(value) => updateLegFormData(`${targetPlayerId}_high_tonne`, value)}
                                  />
                                  <NumberInput
                                    id={`${targetPlayerId}_tonne`}
                                    label="Tonne"
                                    value={legFormData[`${targetPlayerId}_tonne`] || 0}
                                    onChange={(value) => updateLegFormData(`${targetPlayerId}_tonne`, value)}
                                  />
                                  <NumberInput
                                    id={`${targetPlayerId}_shanghai`}
                                    label="Shanghai"
                                    value={legFormData[`${targetPlayerId}_shanghai`] || 0}
                                    onChange={(value) => updateLegFormData(`${targetPlayerId}_shanghai`, value)}
                                  />
                                  <NumberInput
                                    id={`${targetPlayerId}_95_plus`}
                                    label="95+"
                                    value={legFormData[`${targetPlayerId}_95_plus`] || 0}
                                    onChange={(value) => updateLegFormData(`${targetPlayerId}_95_plus`, value)}
                                  />
                                  <NumberInput
                                    id={`${targetPlayerId}_bull`}
                                    label="Bull"
                                    value={legFormData[`${targetPlayerId}_bull`] || 0}
                                    onChange={(value) => updateLegFormData(`${targetPlayerId}_bull`, value)}
                                  />
                                </div>

                                <div className="mt-4 sm:mt-6 pt-4 border-t-2 border-red-200">
                                  <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                                    ⚠️Under-Score
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 p-2 sm:p-3 lg:p-4 bg-red-50 rounded-lg border border-red-200">
                                    <NumberInput
                                      id={`${targetPlayerId}_under26`}
                                      label="Unter 26"
                                      value={legFormData[`${targetPlayerId}_under26`] || 0}
                                      onChange={(value) => updateLegFormData(`${targetPlayerId}_under26`, value)}
                                      className="border-red-300 focus:border-red-500"
                                      labelClassName="text-red-700"
                                    />
                                    <NumberInput
                                      id={`${targetPlayerId}_under30`}
                                      label="Unter 30"
                                      value={legFormData[`${targetPlayerId}_under30`] || 0}
                                      onChange={(value) => updateLegFormData(`${targetPlayerId}_under30`, value)}
                                      className="border-red-300 focus:border-red-500"
                                      labelClassName="text-red-700"
                                    />
                                    <NumberInput
                                      id={`${targetPlayerId}_semperit`}
                                      label="Semperit"
                                      value={legFormData[`${targetPlayerId}_semperit`] || 0}
                                      onChange={(value) => updateLegFormData(`${targetPlayerId}_semperit`, value)}
                                      className="border-red-300 focus:border-red-500"
                                      labelClassName="text-red-700"
                                    />
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <Label htmlFor={`${targetPlayerId}_notes`} className="text-xs sm:text-sm font-medium">
                                    Notizen
                                  </Label>
                                  <Textarea
                                    id={`${targetPlayerId}_notes`}
                                    value={legFormData[`${targetPlayerId}_notes`] || ""}
                                    onChange={(e) => updateLegFormData(`${targetPlayerId}_notes`, e.target.value)}
                                    placeholder="Zusätzliche Notizen..."
                                    className="mt-1"
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {legStats.length > 0 && (
                <Card className="border-2 flex-1 flex flex-col">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Trophy className="h-6 w-6 text-amber-600" />
                      Bisherige Legs
                      <Badge variant="secondary" className="ml-auto">
                        {Array.from(new Set(legStats.map((s) => s.leg_number))).length} Legs gespielt
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        Spieler-Gesamtstatistik für dieses Match
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                        {(() => {
                          const playerTotals: { [key: string]: any } = {}

                          legStats.forEach((stat) => {
                            const playerId = stat.player_id
                            if (!playerTotals[playerId]) {
                              playerTotals[playerId] = {
                                player_id: playerId,
                                player_name: stat.player_name,
                                total_legs: 0,
                                total_wins: 0,
                                total_180: 0,
                                total_171: 0,
                                total_15: 0,
                                total_16: 0,
                                total_17: 0,
                                total_18: 0,
                                total_19: 0,
                                total_20: 0,
                                total_high_tonne: 0,
                                total_tonne: 0,
                                total_shanghai: 0,
                                total_95_plus: 0,
                                total_under_26: 0,
                                total_under_30: 0,
                                total_semperit: 0,
                                total_bull: 0,
                                win_percentage: 0,
                              }
                            }

                            const actualLegsPlayed = (stat.player_legs_won || 0) + (stat.opponent_legs_won || 0)
                            const legsToAdd = actualLegsPlayed > 0 ? actualLegsPlayed : 1 // fallback to 1 for team matches

                            playerTotals[playerId].total_legs += legsToAdd
                            playerTotals[playerId].total_wins += stat.leg_wins || 0
                            playerTotals[playerId].total_180 += stat.throws_180 || 0
                            playerTotals[playerId].total_171 += stat.throws_171 || 0
                            playerTotals[playerId].total_15 += stat.throws_15 || 0
                            playerTotals[playerId].total_16 += stat.throws_16 || 0
                            playerTotals[playerId].total_17 += stat.throws_17 || 0
                            playerTotals[playerId].total_18 += stat.throws_18 || 0
                            playerTotals[playerId].total_19 += stat.throws_19 || 0
                            playerTotals[playerId].total_20 += stat.throws_20 || 0
                            playerTotals[playerId].total_high_tonne += stat.throws_high_tonne || 0
                            playerTotals[playerId].total_tonne += stat.throws_tonne || 0
                            playerTotals[playerId].total_shanghai += stat.throws_shanghai || 0
                            playerTotals[playerId].total_95_plus += stat.throws_95_plus || 0
                            playerTotals[playerId].total_under_26 += stat.throws_under_26 || 0
                            playerTotals[playerId].total_under_30 += stat.throws_under_30 || 0
                            playerTotals[playerId].total_semperit += stat.semperit_outs || 0
                            playerTotals[playerId].total_bull += stat.throws_bull || 0
                          })

                          // Calculate win percentage and sort by wins
                          const sortedPlayerTotals = Object.values(playerTotals)
                            .map((stats: any) => ({
                              ...stats,
                              win_percentage: stats.total_legs > 0 ? (stats.total_wins / stats.total_legs) * 100 : 0,
                            }))
                            .sort((a: any, b: any) => {
                              if (b.total_wins !== a.total_wins) return b.total_wins - a.total_wins
                              if (b.total_180 !== a.total_180) return b.total_180 - a.total_180
                              return b.total_171 - a.total_171
                            })

                          return sortedPlayerTotals.map((playerTotal: any, index: number) => (
                            <Card
                              key={playerTotal.player_id}
                              className={`${
                                playerTotal.total_wins > 0
                                  ? "border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100"
                                  : "bg-gradient-to-br from-white to-slate-50"
                              }`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-bold text-lg flex items-center gap-2 truncate">
                                    {index === 0 && playerTotal.total_wins > 0 && (
                                      <Crown className="h-5 w-5 text-amber-600" />
                                    )}
                                    {playerTotal.player_name}
                                  </h5>
                                  <div className="flex flex-col items-end gap-1">
                                    <Badge
                                      variant={playerTotal.total_wins > 0 ? "default" : "secondary"}
                                      className={playerTotal.total_wins > 0 ? "bg-green-600 hover:bg-green-700" : ""}
                                    >
                                      🏆 {playerTotal.total_wins}/{playerTotal.total_legs} Wins
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {playerTotal.win_percentage.toFixed(1)}% Gewinnrate
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">High Scores:</span>
                                    <div className="flex gap-1 flex-wrap">
                                      {playerTotal.total_180 > 0 && (
                                        <Badge variant="outline" className="text-xs bg-red-50 border-red-200">
                                          🎯 {playerTotal.total_180}×180
                                        </Badge>
                                      )}
                                      {playerTotal.total_171 > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          171×{playerTotal.total_171}
                                        </Badge>
                                      )}
                                      {playerTotal.total_15 > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          15×{playerTotal.total_15}
                                        </Badge>
                                      )}
                                      {playerTotal.total_16 > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          16×{playerTotal.total_16}
                                        </Badge>
                                      )}
                                      {playerTotal.total_17 > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          17×{playerTotal.total_17}
                                        </Badge>
                                      )}
                                      {playerTotal.total_18 > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          18×{playerTotal.total_18}
                                        </Badge>
                                      )}
                                      {playerTotal.total_19 > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          19×{playerTotal.total_19}
                                        </Badge>
                                      )}
                                      {playerTotal.total_20 > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          20×{playerTotal.total_20}
                                        </Badge>
                                      )}
                                      {playerTotal.total_high_tonne > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          HT×{playerTotal.total_high_tonne}
                                        </Badge>
                                      )}
                                      {playerTotal.total_tonne > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          T×{playerTotal.total_tonne}
                                        </Badge>
                                      )}
                                      {playerTotal.total_shanghai > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          SH×{playerTotal.total_shanghai}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {(playerTotal.total_under_26 > 0 ||
                                    playerTotal.total_under_30 > 0 ||
                                    playerTotal.total_semperit > 0) && (
                                    <div className="p-2 bg-red-50 rounded border border-red-200">
                                      <div className="text-xs font-medium text-red-700 mb-1">⚠️ Under-ScoreGesamt:</div>
                                      <div className="grid grid-cols-3 gap-2 text-xs">
                                        {playerTotal.total_under_26 > 0 && (
                                          <div className="text-center">
                                            <div className="font-medium text-red-600">{playerTotal.total_under_26}</div>
                                            <div className="text-red-500">U26</div>
                                          </div>
                                        )}
                                        {playerTotal.total_under_30 > 0 && (
                                          <div className="text-center">
                                            <div className="font-medium text-red-600">{playerTotal.total_under_30}</div>
                                            <div className="text-red-500">U30</div>
                                          </div>
                                        )}
                                        {playerTotal.total_semperit > 0 && (
                                          <div className="text-center">
                                            <div className="font-medium text-red-600">{playerTotal.total_semperit}</div>
                                            <div className="text-red-500">Semp</div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        })()}
                      </div>
                    </div>
                    <div className="space-y-6">
                      {Array.from(new Set(legStats.map((s) => s.leg_number)))
                        .sort((a, b) => b - a)
                        .map((legNumber) => {
                          const legPlayers = legStats.filter((s) => s.leg_number === legNumber)
                          const total180s = legPlayers.reduce((sum, p) => sum + p.throws_180, 0)
                          const totalHighScores = legPlayers.reduce(
                            (sum, p) =>
                              sum +
                              p.throws_180 +
                              p.throws_171 +
                              p.throws_15 +
                              p.throws_16 +
                              p.throws_17 +
                              p.throws_18 +
                              p.throws_19 +
                              p.throws_20 +
                              p.throws_high_tonne +
                              p.throws_tonne +
                              p.throws_shanghai,
                            0,
                          )
                          const legWinners = legPlayers.filter((s) => s.leg_wins > 0)

                          return (
                            <Card
                              key={legNumber}
                              className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow"
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Badge variant="default" className="text-lg px-3 py-1">
                                      Leg {legNumber}
                                    </Badge>
                                    {legWinners.length > 0 && (
                                      <Badge
                                        variant="secondary"
                                        className="bg-amber-100 text-amber-800 border-amber-300"
                                      >
                                        <Crown className="h-3 w-3 mr-1" />
                                        Gewinner: {legWinners.map((winner) => winner.player_name).join(", ")}
                                      </Badge>
                                    )}
                                    <div className="flex gap-4 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">🎯 {total180s} × 180er</span>
                                      <span className="flex items-center gap-1">🔥 {totalHighScores} High Scores</span>
                                      <span className="flex items-center gap-1">👥 {legPlayers.length} Spieler</span>
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                                  {legPlayers.map((stat) => (
                                    <Card
                                      key={stat.id}
                                      className={`bg-gradient-to-br from-white to-slate-50 border shadow-sm ${
                                        stat.leg_wins > 0
                                          ? "border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100"
                                          : ""
                                      }`}
                                    >
                                      <CardContent className="p-2 sm:p-3 lg:p-4">
                                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                                          <h5 className="font-semibold text-xs sm:text-sm lg:text-base flex items-center gap-1 sm:gap-2 truncate">
                                            {stat.leg_wins > 0 && (
                                              <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                                            )}
                                            <span className="truncate">{stat.player_name}</span>
                                          </h5>
                                          <div className="flex flex-col items-end gap-1">
                                            {stat.leg_wins > 0 && (
                                              <Badge
                                                variant="default"
                                                className="bg-green-600 hover:bg-green-700 text-xs"
                                              >
                                                🏆 GEWINNER
                                              </Badge>
                                            )}
                                            {stat.throws_180 > 0 && (
                                              <Badge
                                                variant="secondary"
                                                className="bg-amber-100 text-amber-800 text-xs"
                                              >
                                                🎯 {stat.throws_180}×180
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
