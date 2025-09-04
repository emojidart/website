"use client"

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
import { Users, Save, Play, Target, Trophy, TrendingUp, Crown } from "lucide-react"
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
  leg_wins: number // Add leg_wins field
  throws_180: number
  throws_171: number
  throws_154: number
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
        `id, match_id, leg_number, player_id, leg_winner_id, leg_winner_ids, leg_wins, throws_180, throws_171, throws_154, throws_high_tonne, throws_tonne, throws_shanghai, throws_95_plus, throws_under_26, throws_under_30, semperit_outs, throws_15, throws_16, throws_17, throws_18, throws_19, throws_20, throws_bull, notes, 
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
      const legWinnerIdsString = legWinnerIds.length > 0 ? legWinnerIds.join(",") : null
      const primaryWinnerId = legWinnerIds.length > 0 ? legWinnerIds[0] : null

      const legData = selectedPlayers.map((playerId) => ({
        match_id: match.id,
        leg_number: currentLeg,
        player_id: playerId,
        leg_winner_id: legWinnerIds.includes(playerId) ? playerId : null,
        leg_winner_ids: legWinnerIdsString, // Store all winner IDs
        leg_wins: legWinnerIds.includes(playerId) ? 1 : 0,
        throws_180: legFormData[`${playerId}_180`] || 0,
        throws_171: legFormData[`${playerId}_171`] || 0,
        throws_154: legFormData[`${playerId}_154`] || 0,
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

      const { error } = await supabase.from("leg_statistics").insert(legData)

      if (!error) {
        setIsLegActive(false)
        setCurrentLeg(currentLeg + 1)
        setSelectedPlayers([])
        setLegFormData({})
        setLegWinnerIds([])
        fetchLegStatistics()
      }
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Spielstatistiken - {myTeam?.name || "Mein Team"}
          </DialogTitle>
          <p className="text-muted-foreground">
            {new Date(match.match_date).toLocaleDateString("de-DE")} • {match.match_time}
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "lineup" | "legs")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lineup" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Aufstellung
            </TabsTrigger>
            <TabsTrigger value="legs" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Leg Statistiken
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lineup" className="space-y-6">
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

          <TabsContent value="legs" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-semibold">Leg {currentLeg}</h3>
                <Badge variant={isLegActive ? "default" : "secondary"} className="px-3 py-1">
                  {isLegActive ? "🎯 Aktiv" : "⏸️ Bereit"}
                </Badge>
              </div>
              <div className="flex gap-2">
                {!isLegActive ? (
                  <Button onClick={startLeg} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                    <Play className="h-4 w-4" />
                    Leg starten
                  </Button>
                ) : (
                  <Button
                    onClick={saveLegStatistics}
                    disabled={selectedPlayers.length === 0 || loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Leg speichern
                  </Button>
                )}
              </div>
            </div>

            {isLegActive && (
              <Card className="border-2 border-primary/20">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Spieler für Leg {currentLeg} auswählen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {selectedPlayers.length > 0 && (
                    <Card className="bg-amber-50 border-amber-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Crown className="h-5 w-5 text-amber-600" />
                          Leg-Gewinner auswählen
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
                            Wähle einen oder mehrere Spieler aus, die dieses Leg gewonnen haben. Bei Unentschieden
                            können beide Spieler als Gewinner markiert werden.
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
                            <CardContent className="pt-6">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <Label htmlFor={`${targetPlayerId}_180`} className="text-sm font-medium">
                                    180er
                                  </Label>
                                  <Input
                                    id={`${targetPlayerId}_180`}
                                    type="number"
                                    min="0"
                                    value={legFormData[`${targetPlayerId}_180`] || 0}
                                    onChange={(e) =>
                                      updateLegFormData(`${targetPlayerId}_180`, Number.parseInt(e.target.value) || 0)
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${targetPlayerId}_171`} className="text-sm font-medium">
                                    171er
                                  </Label>
                                  <Input
                                    id={`${targetPlayerId}_171`}
                                    type="number"
                                    min="0"
                                    value={legFormData[`${targetPlayerId}_171`] || 0}
                                    onChange={(e) =>
                                      updateLegFormData(`${targetPlayerId}_171`, Number.parseInt(e.target.value) || 0)
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${targetPlayerId}_154`} className="text-sm font-medium">
                                    154er
                                  </Label>
                                  <Input
                                    id={`${targetPlayerId}_154`}
                                    type="number"
                                    min="0"
                                    value={legFormData[`${targetPlayerId}_154`] || 0}
                                    onChange={(e) =>
                                      updateLegFormData(`${targetPlayerId}_154`, Number.parseInt(e.target.value) || 0)
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${targetPlayerId}_high_tonne`} className="text-sm font-medium">
                                    High Tonne
                                  </Label>
                                  <Input
                                    id={`${targetPlayerId}_high_tonne`}
                                    type="number"
                                    min="0"
                                    value={legFormData[`${targetPlayerId}_high_tonne`] || 0}
                                    onChange={(e) =>
                                      updateLegFormData(
                                        `${targetPlayerId}_high_tonne`,
                                        Number.parseInt(e.target.value) || 0,
                                      )
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${targetPlayerId}_tonne`} className="text-sm font-medium">
                                    Tonne
                                  </Label>
                                  <Input
                                    id={`${targetPlayerId}_tonne`}
                                    type="number"
                                    min="0"
                                    value={legFormData[`${targetPlayerId}_tonne`] || 0}
                                    onChange={(e) =>
                                      updateLegFormData(`${targetPlayerId}_tonne`, Number.parseInt(e.target.value) || 0)
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${targetPlayerId}_shanghai`} className="text-sm font-medium">
                                    Shanghai
                                  </Label>
                                  <Input
                                    id={`${targetPlayerId}_shanghai`}
                                    type="number"
                                    min="0"
                                    value={legFormData[`${targetPlayerId}_shanghai`] || 0}
                                    onChange={(e) =>
                                      updateLegFormData(
                                        `${targetPlayerId}_shanghai`,
                                        Number.parseInt(e.target.value) || 0,
                                      )
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${targetPlayerId}_95_plus`} className="text-sm font-medium">
                                    95+
                                  </Label>
                                  <Input
                                    id={`${targetPlayerId}_95_plus`}
                                    type="number"
                                    min="0"
                                    value={legFormData[`${targetPlayerId}_95_plus`] || 0}
                                    onChange={(e) =>
                                      updateLegFormData(
                                        `${targetPlayerId}_95_plus`,
                                        Number.parseInt(e.target.value) || 0,
                                      )
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${targetPlayerId}_bull`} className="text-sm font-medium">
                                    Bull
                                  </Label>
                                  <Input
                                    id={`${targetPlayerId}_bull`}
                                    type="number"
                                    min="0"
                                    value={legFormData[`${targetPlayerId}_bull`] || 0}
                                    onChange={(e) =>
                                      updateLegFormData(`${targetPlayerId}_bull`, Number.parseInt(e.target.value) || 0)
                                    }
                                    className="mt-1"
                                  />
                                </div>
                              </div>

                              <div className="mt-6 pt-4 border-t-2 border-red-200">
                                <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                                  ⚠️ Check Bilanz
                                </h4>
                                <div className="grid grid-cols-3 gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
                                  <div>
                                    <Label
                                      htmlFor={`${targetPlayerId}_under26`}
                                      className="text-sm font-medium text-red-700"
                                    >
                                      Unter 26
                                    </Label>
                                    <Input
                                      id={`${targetPlayerId}_under26`}
                                      type="number"
                                      min="0"
                                      value={legFormData[`${targetPlayerId}_under26`] || 0}
                                      onChange={(e) =>
                                        updateLegFormData(
                                          `${targetPlayerId}_under26`,
                                          Number.parseInt(e.target.value) || 0,
                                        )
                                      }
                                      className="mt-1 border-red-300 focus:border-red-500"
                                    />
                                  </div>
                                  <div>
                                    <Label
                                      htmlFor={`${targetPlayerId}_under30`}
                                      className="text-sm font-medium text-red-700"
                                    >
                                      Unter 30
                                    </Label>
                                    <Input
                                      id={`${targetPlayerId}_under30`}
                                      type="number"
                                      min="0"
                                      value={legFormData[`${targetPlayerId}_under30`] || 0}
                                      onChange={(e) =>
                                        updateLegFormData(
                                          `${targetPlayerId}_under30`,
                                          Number.parseInt(e.target.value) || 0,
                                        )
                                      }
                                      className="mt-1 border-red-300 focus:border-red-500"
                                    />
                                  </div>
                                  <div>
                                    <Label
                                      htmlFor={`${targetPlayerId}_semperit`}
                                      className="text-sm font-medium text-red-700"
                                    >
                                      Semperit
                                    </Label>
                                    <Input
                                      id={`${targetPlayerId}_semperit`}
                                      type="number"
                                      min="0"
                                      value={legFormData[`${targetPlayerId}_semperit`] || 0}
                                      onChange={(e) =>
                                        updateLegFormData(
                                          `${targetPlayerId}_semperit`,
                                          Number.parseInt(e.target.value) || 0,
                                        )
                                      }
                                      className="mt-1 border-red-300 focus:border-red-500"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4">
                                <Label htmlFor={`${targetPlayerId}_notes`} className="text-sm font-medium">
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
              <Card className="border-2">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Trophy className="h-6 w-6 text-amber-600" />
                    Bisherige Legs
                    <Badge variant="secondary" className="ml-auto">
                      {Array.from(new Set(legStats.map((s) => s.leg_number))).length} Legs gespielt
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
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
                            p.throws_154 +
                            p.throws_high_tonne +
                            p.throws_tonne +
                            p.throws_shanghai,
                          0,
                        )
                        const legWinners = legPlayers.filter((p) => p.leg_wins > 0)

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
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
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
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {legPlayers.map((stat) => (
                                  <Card
                                    key={stat.id}
                                    className={`bg-gradient-to-br from-white to-slate-50 border shadow-sm ${
                                      stat.leg_wins > 0
                                        ? "border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100"
                                        : ""
                                    }`}
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-semibold text-lg flex items-center gap-2">
                                          {stat.leg_wins > 0 && <Crown className="h-4 w-4 text-amber-600" />}
                                          {stat.player_name}
                                        </h5>
                                        {stat.throws_180 > 0 && (
                                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                            🎯 {stat.throws_180}×180
                                          </Badge>
                                        )}
                                      </div>

                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">High Scores:</span>
                                        <div className="flex gap-2 flex-wrap">
                                          {stat.throws_180 > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                              180×{stat.throws_180}
                                            </Badge>
                                          )}
                                          {stat.throws_171 > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                              171×{stat.throws_171}
                                            </Badge>
                                          )}
                                          {stat.throws_154 > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                              154×{stat.throws_154}
                                            </Badge>
                                          )}
                                          {stat.throws_high_tonne > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                              HT×{stat.throws_high_tonne}
                                            </Badge>
                                          )}
                                          {stat.throws_tonne > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                              T×{stat.throws_tonne}
                                            </Badge>
                                          )}
                                          {stat.throws_shanghai > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                              SH×{stat.throws_shanghai}
                                            </Badge>
                                          )}
                                          {stat.throws_95_plus > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                              95+×{stat.throws_95_plus}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>

                                      {(stat.throws_under_26 > 0 ||
                                        stat.throws_under_30 > 0 ||
                                        stat.semperit_outs > 0) && (
                                        <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
                                          <div className="text-xs font-medium text-red-700 mb-1">⚠️ Check Bilanz:</div>
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            {stat.throws_under_26 > 0 && (
                                              <div className="flex justify-between text-red-600">
                                                <span>Unter 26:</span>
                                                <span className="font-medium">{stat.throws_under_26}</span>
                                              </div>
                                            )}
                                            {stat.throws_under_30 > 0 && (
                                              <div className="flex justify-between text-red-600">
                                                <span>Unter 30:</span>
                                                <span className="font-medium">{stat.throws_under_30}</span>
                                              </div>
                                            )}
                                            {stat.semperit_outs > 0 && (
                                              <div className="flex justify-between text-red-600">
                                                <span>Semperit:</span>
                                                <span className="font-medium">{stat.semperit_outs}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
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
      </DialogContent>
    </Dialog>
  )
}
