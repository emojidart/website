"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Player {
  id: string
  name: string
  // 'wins' und 'losses' sind nicht mehr in der Anzeige, aber könnten im Datenmodell bleiben
  points: number
  participations: number // Entspricht 'Antritte' in deiner HTML
  legs: number // Entspricht 'Legs' in deiner HTML
  totalPoints: number // Entspricht 'Gesamt Punkte' in deiner HTML
  // Für kombinierte Tabelle, angenommen vom useDartData Hook oder berechnet
  edartPoints?: number
  steelPoints?: number
  totalParticipations?: number
  totalLegs?: number
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
        <div className="overflow-x-auto custom-scrollbar">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="bg-brutal-card-bg border-b border-brutal-border">
                <TableHead className="text-brutal-text whitespace-nowrap">Rang</TableHead>
                <TableHead className="text-brutal-text whitespace-nowrap">Name</TableHead>
                {/* Spalten für E-Dart und Steel-Dart Tabellen */}
                {title === "E-Dart Spieler" || title === "Steel Dart Spieler" ? (
                  <>
                    <TableHead className="text-brutal-text whitespace-nowrap text-right w-fit">Antritte</TableHead>
                    <TableHead className="text-brutal-text whitespace-nowrap text-right w-fit">Punkte</TableHead>
                    <TableHead className="text-brutal-text whitespace-nowrap text-right w-fit">Legs</TableHead>
                    <TableHead className="text-brutal-text whitespace-nowrap text-right w-fit">Gesamt Punkte</TableHead>
                  </>
                ) : (
                  // Spalten für Kombinierte Spieler Tabelle
                  <>
                    <TableHead className="text-brutal-text whitespace-nowrap text-right w-fit">E-Dart Pkt.</TableHead>
                    <TableHead className="text-brutal-text whitespace-nowrap text-right w-fit">
                      Steel-Dart Pkt.
                    </TableHead>
                    <TableHead className="text-brutal-text whitespace-nowrap text-right w-fit">
                      Gesamt Antritte
                    </TableHead>
                    <TableHead className="text-brutal-text whitespace-nowrap text-right w-fit">Gesamt Legs</TableHead>
                    <TableHead className="text-brutal-text whitespace-nowrap text-right w-fit">Gesamt Punkte</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={title === "E-Dart Spieler" || title === "Steel Dart Spieler" ? 6 : 7}
                    className="text-center text-brutal-text-muted"
                  >
                    Keine Spieler gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                players.map((player, index) => (
                  <TableRow
                    key={title === "Kombinierte Spieler" ? player.name : player.id}
                    className={cn(
                      "border-brutal-border",
                      // NUR Hervorhebung für die ersten 3 Plätze
                      index < 3 ? "bg-brutal-table-top3-bg" : "bg-transparent",
                    )}
                  >
                    <TableCell
                      className={cn(
                        "font-medium whitespace-nowrap",
                        index < 3 ? "text-brutal-table-top3-text font-extrabold" : "text-brutal-text",
                      )}
                    >
                      {index + 1}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-medium whitespace-nowrap",
                        index < 3 ? "text-brutal-table-top3-text font-extrabold" : "text-brutal-text",
                      )}
                    >
                      {player.name}
                    </TableCell>
                    {title === "E-Dart Spieler" || title === "Steel Dart Spieler" ? (
                      <>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-right w-fit",
                            index < 3 ? "text-brutal-table-top3-text font-extrabold" : "text-brutal-text",
                          )}
                        >
                          {player.participations}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-right w-fit",
                            index < 3 ? "text-brutal-table-top3-text font-extrabold" : "text-brutal-text",
                          )}
                        >
                          {player.points}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-right w-fit",
                            index < 3 ? "text-brutal-table-top3-text font-extrabold" : "text-brutal-text",
                          )}
                        >
                          {player.legs}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-right font-bold w-fit",
                            index < 3 ? "text-brutal-table-top3-text font-extrabold" : "text-brutal-accent-gold",
                          )}
                        >
                          {player.totalPoints}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-right w-fit",
                            index < 3 ? "text-brutal-table-top3-text font-extrabold" : "text-brutal-text",
                          )}
                        >
                          {player.edartPoints}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-right w-fit",
                            index < 3 ? "text-brutal-table-top3-text font-extrabold" : "text-brutal-text",
                          )}
                        >
                          {player.steelPoints}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-right w-fit",
                            index < 3 ? "text-brutal-table-top3-text font-extrabold" : "text-brutal-text",
                          )}
                        >
                          {player.totalParticipations}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-right w-fit",
                            index < 3 ? "text-brutal-table-top3-text font-extrabold" : "text-brutal-text",
                          )}
                        >
                          {player.totalLegs}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-right font-bold w-fit",
                            index < 3 ? "text-brutal-table-top3-text font-extrabold" : "text-brutal-accent-gold",
                          )}
                        >
                          {player.totalPoints}
                        </TableCell>
                      </>
                    )}
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
