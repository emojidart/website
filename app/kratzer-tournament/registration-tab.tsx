"use client"

import { SectionSkeleton, InlineLoader } from "@/components/loading/loading"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, List, PlusCircle, Trash2, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { SpieldatenbankEntry } from "@/types/tournament"

interface RegistrationTabProps {
  currentUser: any
  registeredPlayers: SpieldatenbankEntry[]
  selectedPlayersForRegistration: SpieldatenbankEntry[]
  setSelectedPlayersForRegistration: React.Dispatch<React.SetStateAction<SpieldatenbankEntry[]>>
  handleRegisterPlayers: () => Promise<void>
  handleClearRegisteredPlayers: () => Promise<void>
  handleUpdatePlayerPaidStatus: (playerId: string, paid: boolean) => Promise<void>
  isRegisteringPlayers: boolean
  loading: boolean
}

export function RegistrationTab({
  currentUser,
  registeredPlayers,
  selectedPlayersForRegistration,
  setSelectedPlayersForRegistration,
  handleRegisterPlayers,
  handleClearRegisteredPlayers,
  handleUpdatePlayerPaidStatus,
  isRegisteringPlayers,
  loading,
}: RegistrationTabProps) {
  const { showToast } = useToast()
  const [availablePlayers, setAvailablePlayers] = useState<SpieldatenbankEntry[]>([])
  const [filterText, setFilterText] = useState("")
  const [fetchingAvailablePlayers, setFetchingAvailablePlayers] = useState(true)

  const fetchAvailablePlayers = useCallback(async () => {
    setFetchingAvailablePlayers(true)

    try {
      const { data, error } = await supabase
        .from("spieldatenbank")
        .select("id, name, ligastatus, geschlecht, verein")
        .order("name", { ascending: true })

      if (error) throw error
      setAvailablePlayers(data || [])
    } catch (err: any) {
      showToast("error", `Fehler beim Laden der verfügbaren Spieler: ${err.message}`)
      console.error("Error fetching available players:", err)
    } finally {
      setFetchingAvailablePlayers(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchAvailablePlayers()
  }, [fetchAvailablePlayers])

  const filteredAvailablePlayers = availablePlayers.filter(
    (player) =>
      player.name.toLowerCase().includes(filterText.toLowerCase()) &&
      !registeredPlayers.some((regPlayer) => regPlayer.id === player.id),
  )

  const handleSelectPlayer = (player: SpieldatenbankEntry) => {
    setSelectedPlayersForRegistration((prev) =>
      prev.some((p) => p.id === player.id) ? prev.filter((p) => p.id !== player.id) : [...prev, player],
    )
  }

  const isPlayerSelected = (player: SpieldatenbankEntry) =>
    selectedPlayersForRegistration.some((p) => p.id === player.id)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="text-foreground h-2 bg-card  " />
        <div className="p-4 sm:p-5">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Turnier-Registrierung</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Spieler auswählen, registrieren und Bezahlstatus direkt verwalten.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="rounded-2xl border border-border shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-orange-600" />
              Verfügbare Spieler
            </CardTitle>
            <CardDescription>
              Wähle Spieler aus der Datenbank aus, die noch nicht registriert sind.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Spieler suchen..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-10 h-11 border-border focus:border-orange-500 focus:ring-orange-500 bg-muted/50"
              />
            </div>

            <div className="rounded-2xl border border-border bg-muted/60 p-3 h-[420px] overflow-y-auto">
              {fetchingAvailablePlayers ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    
                    <InlineLoader label="Spieler werden geladen..." />
                  </div>
                </div>
              ) : filteredAvailablePlayers.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center text-sm text-muted-foreground px-4">
                  {filterText ? "Keine Spieler gefunden." : "Alle Spieler sind bereits registriert oder es sind keine vorhanden."}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAvailablePlayers.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      className={`w-full text-left rounded-2xl border p-3 transition-all ${
                        isPlayerSelected(player)
                          ? "border-orange-300 bg-orange-50"
                          : "border-border bg-card hover:bg-muted"
                      }`}
                      onClick={() => handleSelectPlayer(player)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{player.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-2">
                            <span>{player.ligastatus || "Ohne Ligastatus"}</span>
                            <span>•</span>
                            <span>{player.verein || "Ohne Verein"}</span>
                          </div>
                        </div>

                        <Checkbox checked={isPlayerSelected(player)} className="pointer-events-none shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={handleRegisterPlayers}
              disabled={selectedPlayersForRegistration.length === 0 || isRegisteringPlayers || loading}
              className="w-full h-11 rounded-xl bg-primary hover:bg-orange-700 text-primary-foreground"
             loading={Boolean(isRegisteringPlayers)} loadingLabel="Registriere...">{(
                <>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Spieler registrieren ({selectedPlayersForRegistration.length})
                </>
              )}</Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <List className="h-5 w-5 text-orange-600" />
              Registrierte Spieler ({registeredPlayers.length})
            </CardTitle>
            <CardDescription>
              Übersicht aller aktuell registrierten Spieler inklusive Bezahlstatus.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/60 p-3 h-[420px] overflow-y-auto">
              {loading ? (
                <SectionSkeleton kind="tournament" />
              ) : registeredPlayers.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center text-sm text-muted-foreground px-4">
                  Keine Spieler registriert.
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted hover:bg-muted">
                        <TableHead>Name</TableHead>
                        <TableHead>Ligastatus</TableHead>
                        <TableHead className="text-center">Bezahlt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registeredPlayers.map((player) => (
                        <TableRow key={player.id}>
                          <TableCell className="font-medium text-foreground">{player.name}</TableCell>
                          <TableCell className="text-muted-foreground">{player.ligastatus || "—"}</TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={player.paid || false}
                              onCheckedChange={(checked) => handleUpdatePlayerPaidStatus(player.id, checked as boolean)}
                              disabled={loading}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <Button
              onClick={handleClearRegisteredPlayers}
              disabled={registeredPlayers.length === 0 || loading}
              variant="destructive"
              className="w-full h-11 rounded-xl"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Alle Registrierungen löschen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}