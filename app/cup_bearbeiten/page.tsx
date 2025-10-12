"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Pencil, Trash2, Plus, Save, X, ChevronDown, ChevronUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Header } from "@/components/header"

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

export default function TournamentManagePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [editingEntry, setEditingEntry] = useState<TournamentEntry | null>(null)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [expandedTournaments, setExpandedTournaments] = useState<Record<string, boolean>>({})
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newEntry, setNewEntry] = useState<Partial<TournamentEntry>>({})
  const { toast } = useToast()

  useEffect(() => {
    fetchTournaments()
  }, [])

  async function fetchTournaments() {
    const currentlyExpanded = { ...expandedTournaments }

    setLoading(true)
    const { data, error } = await supabase
      .from("tournament_series_standings")
      .select("*")
      .order("tournament_date", { ascending: false })

    if (error) {
      toast({
        title: "Fehler",
        description: "Turniere konnten nicht geladen werden",
        variant: "destructive",
      })
      setLoading(false)
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

    setTournaments(grouped)

    if (Object.keys(currentlyExpanded).length === 0 && grouped.length > 0) {
      setExpandedTournaments({ [grouped[0].tournament_id]: true })
    } else {
      setExpandedTournaments(currentlyExpanded)
    }

    setLoading(false)
  }

  const toggleTournament = (tournamentId: string) => {
    setExpandedTournaments((prev) => ({
      ...prev,
      [tournamentId]: !prev[tournamentId],
    }))
  }

  async function updateEntry(entry: TournamentEntry) {
    const { error } = await supabase
      .from("tournament_series_standings")
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
    fetchTournaments()
  }

  async function deleteEntry(id: string) {
    if (!confirm("Möchtest du diesen Eintrag wirklich löschen?")) return

    const { error } = await supabase.from("tournament_series_standings").delete().eq("id", id)

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
    fetchTournaments()
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

    const { error } = await supabase.from("tournament_series_standings").insert([
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
    fetchTournaments()
  }

  async function updateTournamentInfo(tournament: Tournament) {
    const { error } = await supabase
      .from("tournament_series_standings")
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
    fetchTournaments()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Lade Turniere...</div>
      </div>
    )
  }

  return (
    <>
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Turnierverwaltung</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Neuer Eintrag
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Neuen Eintrag hinzufügen</DialogTitle>
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
                      onChange={(e) => setNewEntry({ ...newEntry, placement_points: Number.parseInt(e.target.value) })}
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

        <div className="space-y-8">
          {tournaments.map((tournament) => {
            const isExpanded = expandedTournaments[tournament.tournament_id]

            return (
              <Card key={tournament.tournament_id}>
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
                          <Button size="sm" onClick={() => updateTournamentInfo(editingTournament)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingTournament(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTournament(tournament.tournament_id)}
                          className="mr-4"
                        >
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
                          {tournament.entries.map((entry, index) => {
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
                                        <Button size="sm" onClick={() => updateEntry(editingEntry)}>
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
                                        {entry.form
                                          .replace(/,/g, "")
                                          .split("")
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
                                        <Button size="sm" variant="destructive" onClick={() => deleteEntry(entry.id)}>
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
          })}
        </div>
      </div>
    </>
  )
}
