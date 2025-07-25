"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Player {
  id: string
  name: string
  wins: number
  losses: number
  points: number
  // Füge andere relevante Spielerstatistiken hinzu, falls aus useDartData Hook bekannt
}

interface DartTablesProps {
  edartPlayers: Player[]
  steelDartPlayers: Player[]
  combinedPlayers: Player[]
  loading: boolean
  error: string | null
}

export function DartTables({ edartPlayers, steelDartPlayers, combinedPlayers, loading, error }: DartTablesProps) {
  if (loading) {
    return <div className="text-center text-lg text-brutal-text">Lade Daten...</div>
  }

  if (error) {
    return <div className="text-center text-lg text-red-500">Fehler: {error}</div>
  }

  const renderTable = (players: Player[], title: string) => (
    <Card className="mb-8 bg-brutal-card-bg border-brutal-border">
      <CardHeader>
        <CardTitle className="text-brutal-text">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {" "}
        {/* p-0 entfernt internes Padding der CardContent */}
        <div className="overflow-x-auto custom-scrollbar">
          {" "}
          {/* Hier wird der scrollbare Container hinzugefügt */}
          <Table className="min-w-full">
            {" "}
            {/* min-w-full stellt sicher, dass die Tabelle nicht schrumpft */}
            <TableHeader>
              <TableRow className="bg-brutal-card-bg border-b border-brutal-border">
                <TableHead className="text-brutal-text whitespace-nowrap">Name</TableHead>
                <TableHead className="text-brutal-text whitespace-nowrap">Siege</TableHead>
                <TableHead className="text-brutal-text whitespace-nowrap">Niederlagen</TableHead>
                <TableHead className="text-brutal-text text-right whitespace-nowrap">Punkte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-brutal-text-muted">
                    Keine Spieler gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                players.map((player, index) => (
                  <TableRow
                    key={player.id}
                    className={cn(
                      "border-brutal-border",
                      // NUR Hervorhebung für die ersten 3 Plätze, keine abwechselnden Farben
                      index < 3 ? "bg-brutal-table-top3-bg" : "bg-transparent", // Standardhintergrund oder transparent
                    )}
                  >
                    <TableCell
                      className={cn(
                        "font-medium whitespace-nowrap", // whitespace-nowrap für Zellen
                        index < 3 ? "text-brutal-table-top3-text font-extrabold" : "text-brutal-text",
                      )}
                    >
                      {player.name}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "whitespace-nowrap",
                        index < 3 ? "text-brutal-table-top3-text font-extrabold" : "text-brutal-text",
                      )}
                    >
                      {player.wins}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "whitespace-nowrap",
                        index < 3 ? "text-brutal-table-top3-text font-extrabold" : "text-brutal-text",
                      )}
                    >
                      {player.losses}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right whitespace-nowrap",
                        index < 3 ? "text-brutal-table-top3-text font-extrabold" : "text-brutal-text",
                      )}
                    >
                      {player.points}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="grid gap-8">
      {renderTable(edartPlayers, "E-Dart Spieler")}
      {renderTable(steelDartPlayers, "Steel Dart Spieler")}
      {renderTable(combinedPlayers, "Kombinierte Spieler")}
    </div>
  )
}
