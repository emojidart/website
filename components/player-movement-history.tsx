"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { de } from "date-fns/locale" // Für deutsche Datumsformatierung
import { History, Loader2, AlertCircle, ArrowRight } from "lucide-react" // ArrowRight für Transfers
import { Badge } from "@/components/ui/badge" // Importiere Badge Komponente

interface PlayerMovement {
  id: string
  player_id: string
  team_id: string // This is the to_team_id
  from_team_id: string | null // New: The team the player came from
  movement_type: "new_addition" | "transfer"
  movement_date: string // ISO string from Supabase
  user_id: string
  club_players: { name: string } | null
  teams: { id: string; name: string } | null // Updated: Include id
  from_teams: { id: string; name: string } | null // Updated: Include id
}

export function PlayerMovementHistory() {
  const [movements, setMovements] = useState<PlayerMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlayerMovements()
  }, [])

  const fetchPlayerMovements = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from("player_movements")
      .select(`
        id,
        movement_type,
        movement_date,
        club_players(name),
        teams!player_movements_team_id_fkey(id, name),
        from_teams:teams!player_movements_from_team_id_fkey(id, name)
      `)
      .order("movement_date", { ascending: false }) // Neueste zuerst

    if (error) {
      console.error("Error fetching player movements:", error)
      setError("Fehler beim Laden der Spielerbewegungen.")
    } else {
      setMovements(data as PlayerMovement[])
    }
    setLoading(false)
  }

  return (
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-gray-100 pb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg">
            <History className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">Spielerbewegungen</CardTitle>
            <CardDescription className="text-sm text-gray-500 mt-1">
              Übersicht über alle Neuzugänge und Teamtransfers.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <p className="ml-3 text-gray-600">Lade Spielerbewegungen...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="h-8 w-8 mr-2" />
            <p>{error}</p>
          </div>
        ) : movements.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Keine Spielerbewegungen gefunden.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Spieler</TableHead>
                  <TableHead>Bewegung</TableHead>
                  <TableHead>Datum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">{movement.club_players?.name || "Unbekannt"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {movement.movement_type === "new_addition" ? (
                          <>
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                              Neuzugang
                            </Badge>
                            <span className="text-gray-700">
                              ist {movement.teams?.name ? `der Mannschaft ${movement.teams.name}` : "einem Team"}{" "}
                              beigetreten.
                            </span>
                          </>
                        ) : (
                          <>
                            <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
                              Transfer
                            </Badge>
                            <span className="text-gray-700 flex items-center gap-1">
                              von <span className="font-semibold">{movement.from_teams?.name || "Kein Team"}</span>{" "}
                              <ArrowRight className="h-4 w-4 text-gray-500" /> nach{" "}
                              <span className="font-semibold">{movement.teams?.name || "Unbekanntes Team"}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(movement.movement_date), "dd.MM.yyyy HH:mm", { locale: de })} Uhr
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
