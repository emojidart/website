"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, List, PlusCircle, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { SpieldatenbankEntry } from "@/types/tournament"

interface RegistrationTabProps {
  currentUser: any
  registeredPlayers: SpieldatenbankEntry[]
  selectedPlayersForRegistration: SpieldatenbankEntry[]
  setSelectedPlayersForRegistration: (players: SpieldatenbankEntry[]) => void
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
      !registeredPlayers.some((regPlayer) => regPlayer.id === player.id), // Only show non-registered players
  )

  const handleSelectPlayer = (player: SpieldatenbankEntry) => {
    setSelectedPlayersForRegistration((prev) =>
      prev.some((p) => p.id === player.id) ? prev.filter((p) => p.id !== player.id) : [...prev, player],
    )
  }

  const isPlayerSelected = (player: SpieldatenbankEntry) =>
    selectedPlayersForRegistration.some((p) => p.id === player.id)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Available Players Card */}
      <Card className="p-6 shadow-xl border-gray-200">
        <CardHeader className="border-b pb-4 mb-6">
          <CardTitle className="text-xl font-semibold flex items-center gap-2 text-gray-900">
            <Users className="h-6 w-6 text-gray-600" /> Verfügbare Spieler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Spieler suchen..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="mb-4"
          />
          <div className="h-[400px] overflow-y-auto border rounded-lg p-2 bg-gray-50">
            {fetchingAvailablePlayers ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary-dark" />
              </div>
            ) : filteredAvailablePlayers.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                {filterText ? "Keine Spieler gefunden." : "Alle Spieler registriert oder keine vorhanden."}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAvailablePlayers.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                      isPlayerSelected(player) ? "bg-primary-100 border-primary-200" : "bg-white hover:bg-gray-100"
                    }`}
                    onClick={() => handleSelectPlayer(player)}
                  >
                    <span className="font-medium text-gray-800">
                      {player.name} ({player.ligastatus})
                    </span>
                    <Checkbox checked={isPlayerSelected(player)} className="pointer-events-none" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={handleRegisterPlayers}
            disabled={selectedPlayersForRegistration.length === 0 || isRegisteringPlayers || loading}
            className="mt-6 w-full bg-primary hover:bg-primary-dark"
          >
            {isRegisteringPlayers ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4 mr-2" />
            )}
            Spieler registrieren ({selectedPlayersForRegistration.length})
          </Button>
        </CardContent>
      </Card>

      {/* Registered Players Card */}
      <Card className="p-6 shadow-xl border-gray-200">
        <CardHeader className="border-b pb-4 mb-6">
          <CardTitle className="text-xl font-semibold flex items-center gap-2 text-gray-900">
            <List className="h-6 w-6 text-gray-600" /> Registrierte Spieler ({registeredPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] overflow-y-auto border rounded-lg p-2 bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary-dark" />
              </div>
            ) : registeredPlayers.length === 0 ? (
              <div className="text-center text-gray-500 py-4">Keine Spieler registriert.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Ligastatus</TableHead>
                    <TableHead>Bezahlt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registeredPlayers.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>{player.ligastatus}</TableCell>
                      <TableCell>
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
            )}
          </div>
          <Button
            onClick={handleClearRegisteredPlayers}
            disabled={registeredPlayers.length === 0 || loading}
            variant="destructive"
            className="mt-6 w-full hover:bg-destructive-dark"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Alle Registrierungen löschen
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
