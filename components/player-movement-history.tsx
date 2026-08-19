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
    <Card className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <CardHeader className="border-b border-gray-100 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
            <History className="h-4 w-4 text-gray-700" />
          </div>
          <div>
            <CardTitle className="text-base font-black text-gray-900 sm:text-lg">Spielerbewegungen</CardTitle>
            <CardDescription className="mt-0.5 text-xs font-semibold text-gray-500 sm:text-sm">
              Übersicht über alle Neuzugänge und Teamtransfers.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            <p className="ml-3 text-gray-600">Lade Spielerbewegungen...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="mr-2 h-5 w-5" />
            <p>{error}</p>
          </div>
        ) : movements.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Keine Spielerbewegungen gefunden.</p>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {movements.map((movement) => (
                <div key={movement.id} className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-gray-900">
                        {movement.club_players?.name || "Unbekannt"}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-gray-500">
                        {format(new Date(movement.movement_date), "dd.MM.yyyy HH:mm", { locale: de })} Uhr
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={
                        movement.movement_type === "new_addition"
                          ? "shrink-0 rounded-full border-green-200 bg-green-50 text-green-700"
                          : "shrink-0 rounded-full border-blue-200 bg-blue-50 text-blue-700"
                      }
                    >
                      {movement.movement_type === "new_addition" ? "Neuzugang" : "Transfer"}
                    </Badge>
                  </div>

                  <div className="mt-3 text-sm font-semibold leading-5 text-gray-700">
                    {movement.movement_type === "new_addition" ? (
                      <>
                        {movement.teams?.name ? `Beitritt zu ${movement.teams.name}` : "Beitritt zu einem Team"}
                      </>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1">
                        <span>{movement.from_teams?.name || "Kein Team"}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                        <span>{movement.teams?.name || "Unbekanntes Team"}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
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
                      <TableCell className="font-semibold">{movement.club_players?.name || "Unbekannt"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              movement.movement_type === "new_addition"
                                ? "rounded-full border-green-200 bg-green-50 text-green-700"
                                : "rounded-full border-blue-200 bg-blue-50 text-blue-700"
                            }
                          >
                            {movement.movement_type === "new_addition" ? "Neuzugang" : "Transfer"}
                          </Badge>

                          {movement.movement_type === "new_addition" ? (
                            <span className="text-gray-700">
                              {movement.teams?.name ? `Beitritt zu ${movement.teams.name}` : "Beitritt zu einem Team"}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-700">
                              <span className="font-semibold">{movement.from_teams?.name || "Kein Team"}</span>
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                              <span className="font-semibold">{movement.teams?.name || "Unbekanntes Team"}</span>
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-gray-600">
                        {format(new Date(movement.movement_date), "dd.MM.yyyy HH:mm", { locale: de })} Uhr
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
