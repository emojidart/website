"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, Save, Play, Target, Trophy, TrendingUp } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

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
  throws_180: number
  throws_171: number
  throws_154: number
  throws_under_26: number
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
}

export function MatchStatistics({ match, onClose, myTeamId }: MatchStatisticsProps) {
  const [activeTab, setActiveTab] = useState<"lineup" | "legs">("lineup")
  const [players, setPlayers] = useState<Player[]>([])
  const [lineups, setLineups] = useState<MatchLineup[]>([])
  const [legStats, setLegStats] = useState<LegStatistic[]>([])
  const [currentLeg, setCurrentLeg] = useState(1)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [isLegActive, setIsLegActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null)

  // Leg statistics form state
  const [legFormData, setLegFormData] = useState<Record<string, any>>({})

  const isHomeTeam = myTeamId === match.home_team_id
  const myTeam = isHomeTeam ? match.home_team : match.away_team

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
        `id, match_id, leg_number, player_id, throws_180, throws_171, throws_154, throws_under_26, semperit_outs, throws_15, throws_16, throws_17, throws_18, throws_19, throws_20, throws_bull, notes, club_players(name)`,
      )
      .eq("match_id", match.id)
      .order("leg_number")

    if (!error && data) {
      const statsWithNames = data.map((stat: any) => ({
        ...stat,
        player_name: stat.club_players.name,
      }))
      setLegStats(statsWithNames)

      // Set current leg to next available leg
      const maxLeg = Math.max(0, ...data.map((s) => s.leg_number))
      setCurrentLeg(maxLeg + 1)
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
  }

  const saveLegStatistics = async () => {
    if (selectedPlayers.length === 0) return

    setLoading(true)
    try {
      const legData = selectedPlayers.map((playerId) => ({
        match_id: match.id,
        leg_number: currentLeg,
        player_id: playerId,
        throws_180: legFormData[`${playerId}_180`] || 0,
        throws_171: legFormData[`${playerId}_171`] || 0,
        throws_154: legFormData[`${playerId}_154`] || 0,
        throws_under_26: legFormData[`${playerId}_under26`] || 0,
        semperit_outs: legFormData[`${playerId}_semperit`] || 0,
        throws_15: legFormData[`${playerId}_15`] || 0,
        throws_16: legFormData[`${playerId}_16`] || 0,
        throws_17: legFormData[`${playerId}_17`] || 0,
        throws_18: legFormData[`${playerId}_18`] || 0,
        throws_19: legFormData[`${playerId}_19`] || 0,
        throws_20: legFormData[`${playerId}_20`] || 0,
        throws_bull: legFormData[`${playerId}_bull`] || 0,
        notes: legFormData[`${playerId}_notes`] || "",
      }))

      const { error } = await supabase.from("leg_statistics").insert(legData)

      if (!error) {
        setIsLegActive(false)
        setCurrentLeg(currentLeg + 1)
        setSelectedPlayers([])
        setLegFormData({})
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
                                  <Label htmlFor={`${targetPlayerId}_under26`} className="text-sm font-medium">
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
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${targetPlayerId}_semperit`} className="text-sm font-medium">
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
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${targetPlayerId}_15`} className="text-sm font-medium">
                                    15er
                                  </Label>
                                  <Input
                                    id={`${targetPlayerId}_15`}
                                    type="number"
                                    min="0"
                                    value={legFormData[`${targetPlayerId}_15`] || 0}
                                    onChange={(e) =>
                                      updateLegFormData(`${targetPlayerId}_15`, Number.parseInt(e.target.value) || 0)
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${targetPlayerId}_16`} className="text-sm font-medium">
                                    16er
                                  </Label>
                                  <Input
                                    id={`${targetPlayerId}_16`}
                                    type="number"
                                    min="0"
                                    value={legFormData[`${targetPlayerId}_16`] || 0}
                                    onChange={(e) =>
                                      updateLegFormData(`${targetPlayerId}_16`, Number.parseInt(e.target.value) || 0)
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${targetPlayerId}_17`} className="text-sm font-medium">
                                    17er
                                  </Label>
                                  <Input
                                    id={`${targetPlayerId}_17`}
                                    type="number"
                                    min="0"
                                    value={legFormData[`${targetPlayerId}_17`] || 0}
                                    onChange={(e) =>
                                      updateLegFormData(`${targetPlayerId}_17`, Number.parseInt(e.target.value) || 0)
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${targetPlayerId}_18`} className="text-sm font-medium">
                                    18er
                                  </Label>
                                  <Input
                                    id={`${targetPlayerId}_18`}
                                    type="number"
                                    min="0"
                                    value={legFormData[`${targetPlayerId}_18`] || 0}
                                    onChange={(e) =>
                                      updateLegFormData(`${targetPlayerId}_18`, Number.parseInt(e.target.value) || 0)
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${targetPlayerId}_19`} className="text-sm font-medium">
                                    19er
                                  </Label>
                                  <Input
                                    id={`${targetPlayerId}_19`}
                                    type="number"
                                    min="0"
                                    value={legFormData[`${targetPlayerId}_19`] || 0}
                                    onChange={(e) =>
                                      updateLegFormData(`${targetPlayerId}_19`, Number.parseInt(e.target.value) || 0)
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${targetPlayerId}_20`} className="text-sm font-medium">
                                    20er
                                  </Label>
                                  <Input
                                    id={`${targetPlayerId}_20`}
                                    type="number"
                                    min="0"
                                    value={legFormData[`${targetPlayerId}_20`] || 0}
                                    onChange={(e) =>
                                      updateLegFormData(`${targetPlayerId}_20`, Number.parseInt(e.target.value) || 0)
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
                          (sum, p) => sum + p.throws_180 + p.throws_171 + p.throws_154,
                          0,
                        )

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
                                    className="bg-gradient-to-br from-white to-slate-50 border shadow-sm"
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-semibold text-lg">{stat.player_name}</h5>
                                        {stat.throws_180 > 0 && (
                                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                            🎯 {stat.throws_180}×180
                                          </Badge>
                                        )}
                                      </div>

                                      <div className="space-y-2">
                                        {/* High Scores */}
                                        <div className="flex justify-between items-center text-sm">
                                          <span className="text-muted-foreground">High Scores:</span>
                                          <div className="flex gap-2">
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
                                          </div>
                                        </div>

                                        {/* Other Stats */}
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          {stat.throws_under_26 > 0 && (
                                            <div className="flex justify-between">
                                              <span>Unter 26:</span>
                                              <span className="font-medium">{stat.throws_under_26}</span>
                                            </div>
                                          )}
                                          {stat.semperit_outs > 0 && (
                                            <div className="flex justify-between">
                                              <span>Semperit:</span>
                                              <span className="font-medium">{stat.semperit_outs}</span>
                                            </div>
                                          )}
                                          {[15, 16, 17, 18, 19, 20].map((num) => {
                                            const count = stat[`throws_${num}` as keyof typeof stat] as number
                                            return count > 0 ? (
                                              <div key={num} className="flex justify-between">
                                                <span>{num}er:</span>
                                                <span className="font-medium">{count}</span>
                                              </div>
                                            ) : null
                                          })}
                                          {stat.throws_bull > 0 && (
                                            <div className="flex justify-between">
                                              <span>Bull:</span>
                                              <span className="font-medium">{stat.throws_bull}</span>
                                            </div>
                                          )}
                                        </div>

                                        {stat.notes && (
                                          <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                                            <span className="text-blue-700 font-medium">Notiz:</span>
                                            <p className="text-blue-600 mt-1">{stat.notes}</p>
                                          </div>
                                        )}
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
      </DialogContent>
    </Dialog>
  )
}

interface TeamLineupSelectorProps {
  teamId: string
  players: Player[]
  lineup: MatchLineup[]
  onSave: (playerIds: string[]) => void
  loading: boolean
}

function TeamLineupSelector({ teamId, players, lineup, onSave, loading }: TeamLineupSelectorProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])

  useEffect(() => {
    const lineupPlayerIds = lineup.sort((a, b) => a.position - b.position).map((l) => l.player_id)
    setSelectedPlayers(lineupPlayerIds)
  }, [lineup])

  const handlePlayerSelect = (position: number, playerId: string) => {
    const newSelection = [...selectedPlayers]
    newSelection[position] = playerId
    setSelectedPlayers(newSelection)
  }

  const handleSave = () => {
    const validPlayers = selectedPlayers.filter(Boolean)
    if (validPlayers.length >= 4) {
      onSave(validPlayers)
    }
  }

  return (
    <div className="space-y-4">
      {[0, 1, 2, 3, 4].map((position) => (
        <div key={position} className="flex items-center gap-3">
          <Badge variant={position === 4 ? "secondary" : "default"}>
            {position === 4 ? "Ersatz" : `Pos ${position + 1}`}
          </Badge>
          <Select
            value={selectedPlayers[position] || ""}
            onValueChange={(value) => handlePlayerSelect(position, value)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Spieler auswählen..." />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      <Button onClick={handleSave} disabled={loading || selectedPlayers.filter(Boolean).length < 4} className="w-full">
        {loading ? "Speichern..." : "Aufstellung speichern"}
      </Button>
    </div>
  )
}
