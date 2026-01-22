"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pencil, Trash2, Plus, Save, X, ChevronDown, ChevronUp, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Header } from "@/components/header"
import { useAuth } from "@/hooks/use-auth"

type TournamentEntry = {
  id: string
  player_name: string
  tournament_id: string
  tournament_name: string
  tournament_date: string
  placement: number
  legs_won: number
  legs_lost: number
  matches_played: number
  matches_won: number
  matches_lost: number
  placement_points: number
  bonus_points: number
  legs_points: number
  form: string
}

type Tournament = {
  tournament_id: string
  tournament_name: string
  tournament_date: string
  entries: TournamentEntry[]
}

type TournamentSeries = "tournament_series_standings" | "buffalo_steel_cup_standings"

const SERIES_CONFIG: Record<TournamentSeries, { name: string; exportPrefix: string }> = {
  tournament_series_standings: {
    name: "Turnierserie",
    exportPrefix: "turnierserie",
  },
  buffalo_steel_cup_standings: {
    name: "Buffalo Steel Cup",
    exportPrefix: "buffalo_steel_cup",
  },
}

export default function TournamentManagePage() {
  const { user, isAdmin, loading: authLoading, adminLoading } = useAuth()
  const router = useRouter()
  const [activeSeries, setActiveSeries] = useState<TournamentSeries>("tournament_series_standings")
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [buffaloTournaments, setBuffaloTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [editingEntry, setEditingEntry] = useState<TournamentEntry | null>(null)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [expandedTournaments, setExpandedTournaments] = useState<Record<string, boolean>>({})
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newEntry, setNewEntry] = useState<Partial<TournamentEntry>>({})
  const { toast } = useToast()

  useEffect(() => {
    fetchAllTournaments()
  }, [])

  async function fetchAllTournaments() {
    setLoading(true)
    await Promise.all([
      fetchTournamentsForSeries("tournament_series_standings"),
      fetchTournamentsForSeries("buffalo_steel_cup_standings"),
    ])
    setLoading(false)
  }

  async function fetchTournamentsForSeries(series: TournamentSeries) {
    const currentlyExpanded = { ...expandedTournaments }

    const { data, error } = await supabase
      .from(series)
      .select("*")
      .order("tournament_date", { ascending: false })

    if (error) {
      toast({
        title: "Fehler",
        description: `${SERIES_CONFIG[series].name} Turniere konnten nicht geladen werden`,
        variant: "destructive",
      })
      return
    }

    const grouped = (data as TournamentEntry[]).reduce((acc, entry) => {
      const existing = acc.find((t) => t.tournament_id === entry.tournament_id)
      if (existing) {
        existing.entries.push(entry)
      } else {
        acc.push({
          tournament_id: entry.tournament_id,
          tournament_name: entry.tournament_name,
          tournament_date: entry.tournament_date,
          entries: [entry],
        })
      }
      return acc
    }, [] as Tournament[])

    grouped.forEach((tournament) => {
      tournament.entries.sort((a, b) => a.placement - b.placement)
    })

    if (series === "tournament_series_standings") {
      setTournaments(grouped)
      if (Object.keys(currentlyExpanded).length === 0 && grouped.length > 0) {
        setExpandedTournaments((prev) => ({ ...prev, [grouped[0].tournament_id]: true }))
      }
    } else {
      setBuffaloTournaments(grouped)
      if (Object.keys(currentlyExpanded).length === 0 && grouped.length > 0) {
        setExpandedTournaments((prev) => ({ ...prev, [grouped[0].tournament_id]: true }))
      }
    }
  }

  const getCurrentTournaments = () => {
    return activeSeries === "tournament_series_standings" ? tournaments : buffaloTournaments
  }

  const toggleTournament = (tournamentId: string) => {
    setExpandedTournaments((prev) => ({
      ...prev,
      [tournamentId]: !prev[tournamentId],
    }))
  }

  async function updateEntry(entry: TournamentEntry) {
    const { error } = await supabase
      .from(activeSeries)
      .update({
        player_name: entry.player_name,
        placement: entry.placement,
        legs_won: entry.legs_won,
        legs_lost: entry.legs_lost,
        matches_played: entry.matches_played,
        matches_won: entry.matches_won,
        matches_lost: entry.matches_lost,
        placement_points: entry.placement_points,
        bonus_points: entry.bonus_points,
        legs_points: entry.legs_points,
        form: entry.form,
      })
      .eq("id", entry.id)

    if (error) {
      toast({
        title: "Fehler",
        description: "Eintrag konnte nicht aktualisiert werden",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Erfolg",
      description: "Eintrag wurde aktualisiert",
    })
    setEditingEntry(null)
    const tournamentId = entry.tournament_id
    setExpandedTournaments((prev) => ({ ...prev, [tournamentId]: true }))
    fetchTournamentsForSeries(activeSeries)
  }

  async function deleteEntry(id: string) {
    if (!confirm("Möchtest du diesen Eintrag wirklich löschen?")) return

    const { error } = await supabase.from(activeSeries).delete().eq("id", id)

    if (error) {
      toast({
        title: "Fehler",
        description: "Eintrag konnte nicht gelöscht werden",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Erfolg",
      description: "Eintrag wurde gelöscht",
    })
    fetchTournamentsForSeries(activeSeries)
  }

  async function addEntry() {
    if (!newEntry.player_name || !newEntry.tournament_id || !newEntry.tournament_name) {
      toast({
        title: "Fehler",
        description: "Bitte fülle alle Pflichtfelder aus",
        variant: "destructive",
      })
      return
    }

    const { error } = await supabase.from(activeSeries).insert([
      {
        player_name: newEntry.player_name,
        tournament_id: newEntry.tournament_id,
        tournament_name: newEntry.tournament_name,
        tournament_date: newEntry.tournament_date || new Date().toISOString(),
        placement: newEntry.placement || 0,
        legs_won: newEntry.legs_won || 0,
        legs_lost: newEntry.legs_lost || 0,
        matches_played: newEntry.matches_played || 0,
        matches_won: newEntry.matches_won || 0,
        matches_lost: newEntry.matches_lost || 0,
        placement_points: newEntry.placement_points || 0,
        bonus_points: newEntry.bonus_points || 0,
        legs_points: newEntry.legs_points || 0,
        form: newEntry.form || "",
      },
    ])

    if (error) {
      toast({
        title: "Fehler",
        description: "Eintrag konnte nicht hinzugefügt werden",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Erfolg",
      description: "Eintrag wurde hinzugefügt",
    })
    setIsAddDialogOpen(false)
    setNewEntry({})
    fetchTournamentsForSeries(activeSeries)
  }

  async function updateTournamentInfo(tournament: Tournament) {
    const { error } = await supabase
      .from(activeSeries)
      .update({
        tournament_name: tournament.tournament_name,
        tournament_date: tournament.tournament_date,
      })
      .eq("tournament_id", tournament.tournament_id)

    if (error) {
      toast({
        title: "Fehler",
        description: "Turnierinformationen konnten nicht aktualisiert werden",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Erfolg",
      description: "Turnierinformationen wurden aktualisiert",
    })
    setEditingTournament(null)
    setExpandedTournaments((prev) => ({ ...prev, [tournament.tournament_id]: true }))
    fetchTournamentsForSeries(activeSeries)
  }

  const exportToCSV = () => {
    const currentTournaments = getCurrentTournaments()
    const csvRows = []

    // CSV Header
    csvRows.push(
      [
        "Turnier ID",
        "Turniername",
        "Turnierdatum",
        "Spielername",
        "Platzierung",
        "Legs gewonnen",
        "Legs verloren",
        "Spiele gespielt",
        "Spiele gewonnen",
        "Spiele verloren",
        "Platzierungspunkte",
        "Bonuspunkte",
        "Legs-Punkte",
        "Form",
      ].join(","),
    )

    // Add data rows
    currentTournaments.forEach((tournament) => {
      tournament.entries.forEach((entry) => {
        csvRows.push(
          [
            entry.tournament_id,
            `"${entry.tournament_name}"`,
            new Date(entry.tournament_date).toLocaleDateString("de-DE"),
            `"${entry.player_name}"`,
            entry.placement,
            entry.legs_won,
            entry.legs_lost,
            entry.matches_played,
            entry.matches_won,
            entry.matches_lost,
            entry.placement_points,
            entry.bonus_points,
            entry.legs_points,
            `"${entry.form}"`,
          ].join(","),
        )
      })
    })

    // Create and download file
    const csvContent = csvRows.join("\n")
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `${SERIES_CONFIG[activeSeries].exportPrefix}_backup_${new Date().toISOString().split("T")[0]}.csv`,
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export erfolgreich",
      description: "CSV-Datei wurde heruntergeladen",
    })
  }

  const exportToJSON = () => {
    const currentTournaments = getCurrentTournaments()
    const exportData = {
      exportDate: new Date().toISOString(),
      series: activeSeries,
      seriesName: SERIES_CONFIG[activeSeries].name,
      tournaments: currentTournaments.map((tournament) => ({
        tournament_id: tournament.tournament_id,
        tournament_name: tournament.tournament_name,
        tournament_date: tournament.tournament_date,
        entries: tournament.entries.map((entry) => ({
          id: entry.id,
          player_name: entry.player_name,
          placement: entry.placement,
          legs_won: entry.legs_won,
          legs_lost: entry.legs_lost,
          matches_played: entry.matches_played,
          matches_won: entry.matches_won,
          matches_lost: entry.matches_lost,
          placement_points: entry.placement_points,
          bonus_points: entry.bonus_points,
          legs_points: entry.legs_points,
          form: entry.form,
        })),
      })),
    }

    const jsonContent = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonContent], { type: "application/json" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `${SERIES_CONFIG[activeSeries].exportPrefix}_backup_${new Date().toISOString().split("T")[0]}.json`,
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export erfolgreich",
      description: "JSON-Datei wurde heruntergeladen",
    })
  }

  const handleSeriesChange = (value: string) => {
    setActiveSeries(value as TournamentSeries)
    setEditingEntry(null)
    setEditingTournament(null)
  }

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <main className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow">
          <Card className="w-full max-w-md p-6 shadow-lg">
            <CardContent className="text-center">
              <p className="text-gray-700">Lade...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <main className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow">
          <Card className="w-full max-w-md p-6 shadow-lg">
            <CardTitle className="text-2xl font-bold text-center mb-6">Zugriff verweigert</CardTitle>
            <CardContent className="text-center">
              <p className="mb-4 text-gray-700">
                Sie benötigen Admin-Rechte, um auf die Turnierverwaltung zuzugreifen.
              </p>
              <Button onClick={() => router.push("/admin")} className="w-full">
                Zurück zur Admin-Seite
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Lade Turniere...</div>
      </div>
    )
  }

  const currentTournaments = getCurrentTournaments()

  return (
    <>
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Turnierverwaltung</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              CSV Export
            </Button>
            <Button variant="outline" onClick={exportToJSON}>
              <Download className="mr-2 h-4 w-4" />
              JSON Backup
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Neuer Eintrag
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Neuen Eintrag hinzufügen ({SERIES_CONFIG[activeSeries].name})
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="player_name">Spielername *</Label>
                    <Input
                      id="player_name"
                      value={newEntry.player_name || ""}
                      onChange={(e) => setNewEntry({ ...newEntry, player_name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tournament_id">Turnier ID *</Label>
                    <Input
                      id="tournament_id"
                      value={newEntry.tournament_id || ""}
                      onChange={(e) => setNewEntry({ ...newEntry, tournament_id: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tournament_name">Turniername *</Label>
                    <Input
                      id="tournament_name"
                      value={newEntry.tournament_name || ""}
                      onChange={(e) => setNewEntry({ ...newEntry, tournament_name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tournament_date">Turnierdatum</Label>
                    <Input
                      id="tournament_date"
                      type="date"
                      value={newEntry.tournament_date ? newEntry.tournament_date.split("T")[0] : ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          const date = new Date(e.target.value + "T12:00:00")
                          if (!isNaN(date.getTime())) {
                            setNewEntry({ ...newEntry, tournament_date: date.toISOString() })
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="placement">Platzierung</Label>
                      <Input
                        id="placement"
                        type="number"
                        value={newEntry.placement || 0}
                        onChange={(e) => setNewEntry({ ...newEntry, placement: Number.parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="matches_played">Spiele</Label>
                      <Input
                        id="matches_played"
                        type="number"
                        value={newEntry.matches_played || 0}
                        onChange={(e) => setNewEntry({ ...newEntry, matches_played: Number.parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="matches_won">Siege</Label>
                      <Input
                        id="matches_won"
                        type="number"
                        value={newEntry.matches_won || 0}
                        onChange={(e) => setNewEntry({ ...newEntry, matches_won: Number.parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="matches_lost">Niederlagen</Label>
                      <Input
                        id="matches_lost"
                        type="number"
                        value={newEntry.matches_lost || 0}
                        onChange={(e) => setNewEntry({ ...newEntry, matches_lost: Number.parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="legs_won">Legs gewonnen</Label>
                      <Input
                        id="legs_won"
                        type="number"
                        value={newEntry.legs_won || 0}
                        onChange={(e) => setNewEntry({ ...newEntry, legs_won: Number.parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="legs_lost">Legs verloren</Label>
                      <Input
                        id="legs_lost"
                        type="number"
                        value={newEntry.legs_lost || 0}
                        onChange={(e) => setNewEntry({ ...newEntry, legs_lost: Number.parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="placement_points">Platzierungspunkte</Label>
                      <Input
                        id="placement_points"
                        type="number"
                        value={newEntry.placement_points || 0}
                        onChange={(e) =>
                          setNewEntry({ ...newEntry, placement_points: Number.parseInt(e.target.value) })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="bonus_points">Bonuspunkte</Label>
                      <Input
                        id="bonus_points"
                        type="number"
                        value={newEntry.bonus_points || 0}
                        onChange={(e) => setNewEntry({ ...newEntry, bonus_points: Number.parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="legs_points">Legs-Punkte</Label>
                      <Input
                        id="legs_points"
                        type="number"
                        value={newEntry.legs_points || 0}
                        onChange={(e) => setNewEntry({ ...newEntry, legs_points: Number.parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="form">Form</Label>
                    <Input
                      id="form"
                      value={newEntry.form || ""}
                      onChange={(e) => setNewEntry({ ...newEntry, form: e.target.value })}
                      placeholder="z.B. WWLWL"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button onClick={addEntry}>
                    <Save className="mr-2 h-4 w-4" />
                    Speichern
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs value={activeSeries} onValueChange={handleSeriesChange} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="tournament_series_standings">Turnierserie</TabsTrigger>
            <TabsTrigger value="buffalo_steel_cup_standings">Buffalo Steel Cup</TabsTrigger>
          </TabsList>

          <TabsContent value="tournament_series_standings" className="mt-6">
            <div className="space-y-8">
              {tournaments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Keine Turniere in der Turnierserie gefunden.
                  </CardContent>
                </Card>
              ) : (
                tournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.tournament_id}
                    tournament={tournament}
                    isExpanded={expandedTournaments[tournament.tournament_id]}
                    onToggle={() => toggleTournament(tournament.tournament_id)}
                    editingEntry={editingEntry}
                    setEditingEntry={setEditingEntry}
                    editingTournament={editingTournament}
                    setEditingTournament={setEditingTournament}
                    onUpdateEntry={updateEntry}
                    onDeleteEntry={deleteEntry}
                    onUpdateTournamentInfo={updateTournamentInfo}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="buffalo_steel_cup_standings" className="mt-6">
            <div className="space-y-8">
              {buffaloTournaments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Keine Turniere im Buffalo Steel Cup gefunden.
                  </CardContent>
                </Card>
              ) : (
                buffaloTournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.tournament_id}
                    tournament={tournament}
                    isExpanded={expandedTournaments[tournament.tournament_id]}
                    onToggle={() => toggleTournament(tournament.tournament_id)}
                    editingEntry={editingEntry}
                    setEditingEntry={setEditingEntry}
                    editingTournament={editingTournament}
                    setEditingTournament={setEditingTournament}
                    onUpdateEntry={updateEntry}
                    onDeleteEntry={deleteEntry}
                    onUpdateTournamentInfo={updateTournamentInfo}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

type TournamentCardProps = {
  tournament: Tournament
  isExpanded: boolean
  onToggle: () => void
  editingEntry: TournamentEntry | null
  setEditingEntry: (entry: TournamentEntry | null) => void
  editingTournament: Tournament | null
  setEditingTournament: (tournament: Tournament | null) => void
  onUpdateEntry: (entry: TournamentEntry) => void
  onDeleteEntry: (id: string) => void
  onUpdateTournamentInfo: (tournament: Tournament) => void
}

function TournamentCard({
  tournament,
  isExpanded,
  onToggle,
  editingEntry,
  setEditingEntry,
  editingTournament,
  setEditingTournament,
  onUpdateEntry,
  onDeleteEntry,
  onUpdateTournamentInfo,
}: TournamentCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {editingTournament?.tournament_id === tournament.tournament_id && editingTournament !== null ? (
            <div className="flex-1 flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Input
                  value={editingTournament.tournament_name}
                  onChange={(e) =>
                    setEditingTournament({ ...editingTournament, tournament_name: e.target.value })
                  }
                  className="text-2xl font-bold"
                  placeholder="Turniername"
                />
                <Input
                  type="date"
                  value={editingTournament.tournament_date.split("T")[0]}
                  onChange={(e) => {
                    if (e.target.value) {
                      const date = new Date(e.target.value + "T12:00:00")
                      if (!isNaN(date.getTime())) {
                        setEditingTournament({
                          ...editingTournament,
                          tournament_date: date.toISOString(),
                        })
                      }
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onUpdateTournamentInfo(editingTournament)}>
                  <Save className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingTournament(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onToggle} className="mr-4">
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
              <div className="flex-1">
                <div className="text-2xl">{tournament.tournament_name}</div>
                <div className="text-sm text-muted-foreground font-normal mt-1">
                  {new Date(tournament.tournament_date).toLocaleDateString("de-DE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground font-normal">
                  {tournament.entries.length} Spieler
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditingTournament(tournament)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Platz</TableHead>
                  <TableHead>Spieler</TableHead>
                  <TableHead className="text-center">Gesamt</TableHead>
                  <TableHead className="text-center">Platz-P</TableHead>
                  <TableHead className="text-center">Legs+</TableHead>
                  <TableHead className="text-center">Legs-</TableHead>
                  <TableHead className="text-center">Spiele</TableHead>
                  <TableHead className="text-center">S</TableHead>
                  <TableHead className="text-center">N</TableHead>
                  <TableHead className="text-center">Bonus-P</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead className="text-right sticky right-0 bg-background shadow-[-4px_0_8px_rgba(0,0,0,0.1)]">
                    Aktionen
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournament.entries.map((entry) => {
                  const isEditing = editingEntry?.id === entry.id && editingEntry !== null
                  const totalPoints = entry.placement_points + entry.legs_won + entry.bonus_points

                  return (
                    <TableRow key={entry.id}>
                      {isEditing ? (
                        <>
                          <TableCell>
                            <Input
                              type="number"
                              value={editingEntry.placement}
                              onChange={(e) =>
                                setEditingEntry({
                                  ...editingEntry,
                                  placement: Number.parseInt(e.target.value),
                                })
                              }
                              className="w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editingEntry.player_name}
                              onChange={(e) =>
                                setEditingEntry({ ...editingEntry, player_name: e.target.value })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {editingEntry.placement_points +
                              editingEntry.legs_won +
                              editingEntry.bonus_points}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editingEntry.placement_points}
                              onChange={(e) =>
                                setEditingEntry({
                                  ...editingEntry,
                                  placement_points: Number.parseInt(e.target.value),
                                })
                              }
                              className="w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editingEntry.legs_won}
                              onChange={(e) =>
                                setEditingEntry({
                                  ...editingEntry,
                                  legs_won: Number.parseInt(e.target.value),
                                })
                              }
                              className="w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editingEntry.legs_lost}
                              onChange={(e) =>
                                setEditingEntry({
                                  ...editingEntry,
                                  legs_lost: Number.parseInt(e.target.value),
                                })
                              }
                              className="w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editingEntry.matches_played}
                              onChange={(e) =>
                                setEditingEntry({
                                  ...editingEntry,
                                  matches_played: Number.parseInt(e.target.value),
                                })
                              }
                              className="w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editingEntry.matches_won}
                              onChange={(e) =>
                                setEditingEntry({
                                  ...editingEntry,
                                  matches_won: Number.parseInt(e.target.value),
                                })
                              }
                              className="w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editingEntry.matches_lost}
                              onChange={(e) =>
                                setEditingEntry({
                                  ...editingEntry,
                                  matches_lost: Number.parseInt(e.target.value),
                                })
                              }
                              className="w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editingEntry.bonus_points}
                              onChange={(e) =>
                                setEditingEntry({
                                  ...editingEntry,
                                  bonus_points: Number.parseInt(e.target.value),
                                })
                              }
                              className="w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editingEntry.form}
                              onChange={(e) => setEditingEntry({ ...editingEntry, form: e.target.value })}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell className="text-right sticky right-0 bg-background shadow-[-4px_0_8px_rgba(0,0,0,0.1)]">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" onClick={() => onUpdateEntry(editingEntry)}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingEntry(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-bold">{entry.placement}</TableCell>
                          <TableCell className="font-medium">{entry.player_name}</TableCell>
                          <TableCell className="text-center font-bold text-lg">{totalPoints}</TableCell>
                          <TableCell className="text-center">{entry.placement_points}</TableCell>
                          <TableCell className="text-center">{entry.legs_won}</TableCell>
                          <TableCell className="text-center">{entry.legs_lost}</TableCell>
                          <TableCell className="text-center">{entry.matches_played}</TableCell>
                          <TableCell className="text-center">{entry.matches_won}</TableCell>
                          <TableCell className="text-center">{entry.matches_lost}</TableCell>
                          <TableCell className="text-center">{entry.bonus_points}</TableCell>
                          <TableCell>
                            <div className="flex gap-0">
                              {(entry.form || "")
                                .replace(/,/g, "")
                                .split("")
                                .filter((char) => char === "W" || char === "L")
                                .map((result, i) => (
                                  <span
                                    key={i}
                                    className={`w-5 h-5 flex items-center justify-center text-xs font-bold rounded ${
                                      result === "W" ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                    }`}
                                  >
                                    {result}
                                  </span>
                                ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right sticky right-0 bg-background shadow-[-4px_0_8px_rgba(0,0,0,0.1)]">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingEntry(entry)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => onDeleteEntry(entry.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
