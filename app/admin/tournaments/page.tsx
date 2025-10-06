"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Trash2, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type TournamentStatus = {
  id: number
  tournament_id: string
  tournament_name: string
  status: string
  created_at: string
}

type TournamentSeriesStanding = {
  id: number
  player_name: string
  total_points: number
  tournaments_played: number
  created_at: string
  updated_at: string
  placement_points: number
  legs_points: number
  bonus_points: number
}

type TournamentSeriesHistory = {
  id: number
  tournament_id: string
  tournament_name: string
  added_at: string
  tournament_type: string
}

type DKORanking = {
  id: number
  player_name: string
  tournaments_played: number
  created_at: string
  updated_at: string
  placement_points: number
}

type DKOMatchState = {
  id: number
  tournament_id: string
  tournament_type: string
  player1: string
  player2: string
  score1: number
  score2: number
  winner: string
  loser: string
  machine_num: string
  updated_at: string
  text: string
  tcount: number
}

export default function AdminTournamentsPage() {
  const { user, isAdmin, adminLoading } = useAuth()
  const { toast } = useToast()

  const [tournaments, setTournaments] = useState<TournamentStatus[]>([])
  const [seriesStandings, setSeriesStandings] = useState<TournamentSeriesStanding[]>([])
  const [seriesHistory, setSeriesHistory] = useState<TournamentSeriesHistory[]>([])
  const [dkoRankings, setDKORankings] = useState<DKORanking[]>([])
  const [matchStates, setMatchStates] = useState<DKOMatchState[]>([])

  const [loading, setLoading] = useState(true)
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false)
  const [deleteAllTable, setDeleteAllTable] = useState<string>("")
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState("")
  const [currentEditItem, setCurrentEditItem] = useState<any>(null)
  const [currentEditTable, setCurrentEditTable] = useState<string>("")

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      window.location.href = "/"
    }
  }, [isAdmin, adminLoading])

  useEffect(() => {
    if (isAdmin) {
      fetchAllData()
    }
  }, [isAdmin])

  const fetchAllData = async () => {
    setLoading(true)
    setErrors({})
    try {
      await Promise.all([
        fetchTournaments(),
        fetchSeriesStandings(),
        fetchSeriesHistory(),
        fetchDKORankings(),
        fetchMatchStates(),
      ])
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTournaments = async () => {
    console.log("[v0] Fetching tournaments...")
    const { data, error } = await supabase
      .from("tournaments_status")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching tournaments:", error)
      setErrors((prev) => ({ ...prev, tournaments_status: error.message }))
      return
    }
    console.log("[v0] Tournaments fetched:", data?.length || 0)
    setTournaments(data || [])
  }

  const fetchSeriesStandings = async () => {
    console.log("[v0] Fetching series standings...")
    const { data, error } = await supabase
      .from("tournament_series_standings")
      .select("*")
      .order("total_points", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching series standings:", error)
      setErrors((prev) => ({ ...prev, tournament_series_standings: error.message }))
      return
    }
    console.log("[v0] Series standings fetched:", data?.length || 0)
    setSeriesStandings(data || [])
  }

  const fetchSeriesHistory = async () => {
    console.log("[v0] Fetching series history...")
    const { data, error } = await supabase
      .from("tournament_series_history")
      .select("*")
      .order("added_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching series history:", error)
      setErrors((prev) => ({ ...prev, tournament_series_history: error.message }))
      return
    }
    console.log("[v0] Series history fetched:", data?.length || 0)
    setSeriesHistory(data || [])
  }

  const fetchDKORankings = async () => {
    console.log("[v0] Fetching DKO rankings...")
    const { data, error } = await supabase.from("dko_rankings").select("*")

    if (error) {
      console.error("[v0] Error fetching DKO rankings:", error)
      setErrors((prev) => ({ ...prev, dko_rankings: error.message }))
      return
    }
    console.log("[v0] DKO rankings fetched:", data?.length || 0)
    setDKORankings(data || [])
  }

  const fetchMatchStates = async () => {
    console.log("[v0] Fetching match states...")
    const { data, error } = await supabase.from("dko_match_states").select("*")

    if (error) {
      console.error("[v0] Error fetching match states:", error)
      setErrors((prev) => ({ ...prev, dko_match_states: error.message }))
      return
    }
    console.log("[v0] Match states fetched:", data?.length || 0)
    setMatchStates(data || [])
  }

  const handleDelete = async (table: string, id: number) => {
    try {
      const { error } = await supabase.from(table).delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Erfolgreich gelöscht",
        description: "Der Eintrag wurde gelöscht",
      })

      await fetchAllData()
      setDeleteDialogOpen(false)
    } catch (error) {
      console.error("Error deleting:", error)
      toast({
        title: "Fehler",
        description: "Eintrag konnte nicht gelöscht werden",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAll = async (table: string) => {
    if (deleteAllConfirmText !== "ALLES LÖSCHEN") {
      toast({
        title: "Fehler",
        description: 'Bitte gib "ALLES LÖSCHEN" ein, um fortzufahren',
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.from(table).delete().neq("id", 0)

      if (error) throw error

      toast({
        title: "Erfolgreich gelöscht",
        description: "Alle Einträge wurden gelöscht",
      })

      await fetchAllData()
      setDeleteAllDialogOpen(false)
      setDeleteAllConfirmText("")
    } catch (error) {
      console.error("Error deleting all:", error)
      toast({
        title: "Fehler",
        description: "Einträge konnten nicht gelöscht werden",
        variant: "destructive",
      })
    }
  }

  const handleEdit = async (table: string, id: number, updates: any) => {
    try {
      const { error } = await supabase.from(table).update(updates).eq("id", id)

      if (error) throw error

      toast({
        title: "Erfolgreich aktualisiert",
        description: "Der Eintrag wurde aktualisiert",
      })

      await fetchAllData()
      setEditDialogOpen(false)
    } catch (error) {
      console.error("Error updating:", error)
      toast({
        title: "Fehler",
        description: "Eintrag konnte nicht aktualisiert werden",
        variant: "destructive",
      })
    }
  }

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const filteredMatchStates = selectedTournament
    ? matchStates.filter((m) => m.tournament_id === selectedTournament)
    : matchStates

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Turnierverwaltung</h1>
          <p className="text-muted-foreground">Verwalte alle Turniere und zugehörige Daten</p>
        </div>

        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fehler beim Laden der Daten</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                {Object.entries(errors).map(([table, error]) => (
                  <div key={table} className="text-sm">
                    <strong>{table}:</strong> {error}
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="tournaments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tournaments">Turniere</TabsTrigger>
            <TabsTrigger value="standings">Serien Tabelle</TabsTrigger>
            <TabsTrigger value="history">Serien Historie</TabsTrigger>
            <TabsTrigger value="rankings">DKO Rankings</TabsTrigger>
            <TabsTrigger value="matches">Match States</TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Turniere (tournaments_status)</CardTitle>
                    <CardDescription>Alle Turniere mit Status und Typ (8er, 16er, 32er)</CardDescription>
                  </div>
                  {!errors.tournaments_status && tournaments.length > 0 && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDeleteAllTable("tournaments_status")
                        setDeleteAllDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Alles löschen
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {errors.tournaments_status ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Tabelle nicht verfügbar</AlertTitle>
                    <AlertDescription>{errors.tournaments_status}</AlertDescription>
                  </Alert>
                ) : tournaments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Keine Turniere vorhanden</div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Turnier ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Erstellt am</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tournaments.map((tournament) => (
                          <TableRow key={tournament.id}>
                            <TableCell className="font-mono">{tournament.id}</TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {tournament.tournament_id.substring(0, 8)}...
                            </TableCell>
                            <TableCell className="font-medium">{tournament.tournament_name}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                  tournament.status === "completed"
                                    ? "bg-green-100 text-green-700"
                                    : tournament.status === "cancelled"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {tournament.status}
                              </span>
                            </TableCell>
                            <TableCell>{new Date(tournament.created_at).toLocaleString("de-DE")}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setCurrentEditItem(tournament)
                                    setCurrentEditTable("tournaments_status")
                                    setEditDialogOpen(true)
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setCurrentEditItem(tournament)
                                    setCurrentEditTable("tournaments_status")
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
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
          </TabsContent>

          <TabsContent value="standings">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Serien Tabelle (tournament_series_standings)</CardTitle>
                    <CardDescription>Aktuelle Standings der Turnierserie</CardDescription>
                  </div>
                  {!errors.tournament_series_standings && seriesStandings.length > 0 && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDeleteAllTable("tournament_series_standings")
                        setDeleteAllDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Alles löschen
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {errors.tournament_series_standings ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Tabelle nicht verfügbar</AlertTitle>
                    <AlertDescription>{errors.tournament_series_standings}</AlertDescription>
                  </Alert>
                ) : seriesStandings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Keine Standings vorhanden</div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rang</TableHead>
                          <TableHead>Spieler</TableHead>
                          <TableHead>Gesamtpunkte</TableHead>
                          <TableHead>Platzierungspunkte</TableHead>
                          <TableHead>Legs Punkte</TableHead>
                          <TableHead>Bonuspunkte</TableHead>
                          <TableHead>Turniere</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seriesStandings.map((standing, index) => (
                          <TableRow key={standing.id}>
                            <TableCell>
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                                {index + 1}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{standing.player_name}</TableCell>
                            <TableCell className="font-bold text-lg">{standing.total_points}</TableCell>
                            <TableCell>{standing.placement_points}</TableCell>
                            <TableCell>{standing.legs_points}</TableCell>
                            <TableCell>{standing.bonus_points}</TableCell>
                            <TableCell>{standing.tournaments_played}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setCurrentEditItem(standing)
                                    setCurrentEditTable("tournament_series_standings")
                                    setEditDialogOpen(true)
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setCurrentEditItem(standing)
                                    setCurrentEditTable("tournament_series_standings")
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
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
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Serien Historie (tournament_series_history)</CardTitle>
                    <CardDescription>Historische Turnierdaten</CardDescription>
                  </div>
                  {!errors.tournament_series_history && seriesHistory.length > 0 && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDeleteAllTable("tournament_series_history")
                        setDeleteAllDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Alles löschen
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {errors.tournament_series_history ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Tabelle nicht verfügbar</AlertTitle>
                    <AlertDescription>{errors.tournament_series_history}</AlertDescription>
                  </Alert>
                ) : seriesHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Keine Historie vorhanden</div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Turnier ID</TableHead>
                          <TableHead>Turniername</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Hinzugefügt am</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seriesHistory.map((history) => (
                          <TableRow key={history.id}>
                            <TableCell className="font-mono">{history.id}</TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {history.tournament_id.substring(0, 8)}...
                            </TableCell>
                            <TableCell className="font-medium">{history.tournament_name}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                                {history.tournament_type}
                              </span>
                            </TableCell>
                            <TableCell>{new Date(history.added_at).toLocaleString("de-DE")}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setCurrentEditItem(history)
                                    setCurrentEditTable("tournament_series_history")
                                    setEditDialogOpen(true)
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setCurrentEditItem(history)
                                    setCurrentEditTable("tournament_series_history")
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
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
          </TabsContent>

          <TabsContent value="rankings">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>DKO Rankings (dko_rankings)</CardTitle>
                    <CardDescription>Gesamtrangliste aller Spieler</CardDescription>
                  </div>
                  {!errors.dko_rankings && dkoRankings.length > 0 && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDeleteAllTable("dko_rankings")
                        setDeleteAllDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Alles löschen
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {errors.dko_rankings ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Tabelle nicht verfügbar</AlertTitle>
                    <AlertDescription>{errors.dko_rankings}</AlertDescription>
                  </Alert>
                ) : dkoRankings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Keine Rankings vorhanden</div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rang</TableHead>
                          <TableHead>Spieler</TableHead>
                          <TableHead>Platzierungspunkte</TableHead>
                          <TableHead>Turniere</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dkoRankings.map((ranking, index) => (
                          <TableRow key={ranking.id}>
                            <TableCell>
                              <span
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                                  index === 0
                                    ? "bg-yellow-100 text-yellow-700"
                                    : index === 1
                                      ? "bg-gray-100 text-gray-700"
                                      : index === 2
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-primary/10 text-primary"
                                }`}
                              >
                                {index + 1}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{ranking.player_name}</TableCell>
                            <TableCell>{ranking.placement_points}</TableCell>
                            <TableCell>{ranking.tournaments_played}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setCurrentEditItem(ranking)
                                    setCurrentEditTable("dko_rankings")
                                    setEditDialogOpen(true)
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setCurrentEditItem(ranking)
                                    setCurrentEditTable("dko_rankings")
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
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
          </TabsContent>

          <TabsContent value="matches">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle>Match States (dko_match_states)</CardTitle>
                    <CardDescription>Alle Matches mit Ergebnissen</CardDescription>
                    {!errors.dko_match_states && tournaments.length > 0 && (
                      <div className="mt-4">
                        <Select
                          value={selectedTournament || "all"}
                          onValueChange={(value) => setSelectedTournament(value === "all" ? null : value)}
                        >
                          <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="Turnier filtern" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle Turniere</SelectItem>
                            {tournaments.map((t) => (
                              <SelectItem key={t.tournament_id} value={t.tournament_id}>
                                {t.tournament_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  {!errors.dko_match_states && matchStates.length > 0 && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDeleteAllTable("dko_match_states")
                        setDeleteAllDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Alles löschen
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {errors.dko_match_states ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Tabelle nicht verfügbar</AlertTitle>
                    <AlertDescription>{errors.dko_match_states}</AlertDescription>
                  </Alert>
                ) : filteredMatchStates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {selectedTournament ? "Keine Matches für dieses Turnier" : "Keine Matches vorhanden"}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Spieler 1</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Spieler 2</TableHead>
                          <TableHead>Gewinner</TableHead>
                          <TableHead>Verlierer</TableHead>
                          <TableHead>Maschine</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMatchStates.map((match) => (
                          <TableRow key={match.id}>
                            <TableCell className="font-mono">{match.id}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                                {match.tournament_type}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{match.player1 || "TBD"}</TableCell>
                            <TableCell className="font-mono text-center">
                              {match.score1} : {match.score2}
                            </TableCell>
                            <TableCell className="font-medium">{match.player2 || "TBD"}</TableCell>
                            <TableCell>
                              {match.winner && <span className="font-medium text-green-600">{match.winner}</span>}
                            </TableCell>
                            <TableCell>
                              {match.loser && <span className="text-muted-foreground">{match.loser}</span>}
                            </TableCell>
                            <TableCell>{match.machine_num}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setCurrentEditItem(match)
                                    setCurrentEditTable("dko_match_states")
                                    setEditDialogOpen(true)
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setCurrentEditItem(match)
                                    setCurrentEditTable("dko_match_states")
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
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
          </TabsContent>
        </Tabs>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Eintrag bearbeiten</DialogTitle>
              <DialogDescription>Bearbeite die Daten für {currentEditTable}</DialogDescription>
            </DialogHeader>
            {currentEditItem && (
              <div className="grid gap-4 py-4">
                {Object.entries(currentEditItem).map(([key, value]) => {
                  if (key === "id" || key === "created_at" || key === "updated_at") return null
                  return (
                    <div key={key} className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor={key} className="text-right">
                        {key}
                      </Label>
                      <Input
                        id={key}
                        defaultValue={value as string}
                        className="col-span-3"
                        onChange={(e) => {
                          setCurrentEditItem({
                            ...currentEditItem,
                            [key]: e.target.value,
                          })
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={() => {
                  const { id, created_at, updated_at, ...updates } = currentEditItem
                  handleEdit(currentEditTable, currentEditItem.id, updates)
                }}
              >
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eintrag löschen</DialogTitle>
              <DialogDescription>
                Bist du sicher, dass du diesen Eintrag löschen möchtest? Diese Aktion kann nicht rückgängig gemacht
                werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(currentEditTable, currentEditItem?.id)}>
                Löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alle Einträge löschen</DialogTitle>
              <DialogDescription>
                Diese Aktion löscht ALLE Einträge aus der Tabelle <strong>{deleteAllTable}</strong>. Diese Aktion kann
                nicht rückgängig gemacht werden!
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="confirm-text">
                Bitte gib <strong>"ALLES LÖSCHEN"</strong> ein, um fortzufahren:
              </Label>
              <Input
                id="confirm-text"
                value={deleteAllConfirmText}
                onChange={(e) => setDeleteAllConfirmText(e.target.value)}
                placeholder="ALLES LÖSCHEN"
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteAllDialogOpen(false)
                  setDeleteAllConfirmText("")
                }}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteAll(deleteAllTable)}
                disabled={deleteAllConfirmText !== "ALLES LÖSCHEN"}
              >
                Alles löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
