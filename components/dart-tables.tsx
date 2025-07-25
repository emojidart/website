import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { PlayerData, CombinedPlayerData } from "@/hooks/use-dart-data"

interface DartTablesProps {
  edartPlayers: PlayerData[]
  steelDartPlayers: PlayerData[]
  combinedPlayers: CombinedPlayerData[]
  loading: boolean
  error: string | null
}

export function DartTables({ edartPlayers, steelDartPlayers, combinedPlayers, loading, error }: DartTablesProps) {
  if (loading) {
    return <div className="text-center text-homepage-text-light p-8">Lade Ranglisten...</div>
  }

  if (error) {
    return <div className="text-center text-red-500 p-8">Fehler beim Laden der Daten: {error}</div>
  }

  return (
    <section className="p-4">
      {/* Angepasst, um die Farbe der Homepage zu verwenden */}
      <p className="text-homepage-text-light text-lg mb-6 text-left">Alle Ranglisten</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* E-Dart Tabelle */}
        <Card className="bg-dark-table-card text-dark-table-text border-dark-table-border rounded-0.75rem shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-dark-table-text">E-Dart</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-dark-table-bg hover:bg-dark-table-bg">
                  <TableHead className="text-dark-table-text-muted font-semibold">Rang</TableHead>
                  <TableHead className="text-dark-table-text-muted font-semibold">Name</TableHead>
                  <TableHead className="text-right text-dark-table-text-muted font-semibold">Antritte</TableHead>
                  <TableHead className="text-right text-dark-table-text-muted font-semibold">Punkte</TableHead>
                  <TableHead className="text-right text-dark-table-text-muted font-semibold">Legs</TableHead>
                  <TableHead className="text-right text-gold-primary font-semibold">Gesamt Punkte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {edartPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-dark-table-text-muted py-4">
                      Keine E-Dart Daten verfügbar.
                    </TableCell>
                  </TableRow>
                ) : (
                  edartPlayers.map((player, index) => (
                    <TableRow key={player.id} className="hover:bg-dark-table-hover">
                      <TableCell className="font-bold text-gold-primary">{index + 1}</TableCell>
                      <TableCell className="text-dark-table-text">{player.name}</TableCell>
                      <TableCell className="text-right">{player.participations}</TableCell>
                      <TableCell className="text-right">{player.points}</TableCell>
                      <TableCell className="text-right">{player.legs}</TableCell>
                      <TableCell className="text-right font-extrabold text-gold-primary">
                        {player.totalPoints}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Steel-Dart Tabelle */}
        <Card className="bg-dark-table-card text-dark-table-text border-dark-table-border rounded-0.75rem shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-dark-table-text">Steel-Dart</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-dark-table-bg hover:bg-dark-table-bg">
                  <TableHead className="text-dark-table-text-muted font-semibold">Rang</TableHead>
                  <TableHead className="text-dark-table-text-muted font-semibold">Name</TableHead>
                  <TableHead className="text-right text-dark-table-text-muted font-semibold">Antritte</TableHead>
                  <TableHead className="text-right text-dark-table-text-muted font-semibold">Punkte</TableHead>
                  <TableHead className="text-right text-dark-table-text-muted font-semibold">Legs</TableHead>
                  <TableHead className="text-right text-gold-primary font-semibold">Gesamt Punkte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {steelDartPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-dark-table-text-muted py-4">
                      Keine Steel-Dart Daten verfügbar.
                    </TableCell>
                  </TableRow>
                ) : (
                  steelDartPlayers.map((player, index) => (
                    <TableRow key={player.id} className="hover:bg-dark-table-hover">
                      <TableCell className="font-bold text-gold-primary">{index + 1}</TableCell>
                      <TableCell className="text-dark-table-text">{player.name}</TableCell>
                      <TableCell className="text-right">{player.participations}</TableCell>
                      <TableCell className="text-right">{player.points}</TableCell>
                      <TableCell className="text-right">{player.legs}</TableCell>
                      <TableCell className="text-right font-extrabold text-gold-primary">
                        {player.totalPoints}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Gesamt-Rangliste Tabelle */}
      <div className="mt-6">
        <Card className="bg-dark-table-card text-dark-table-text border-dark-table-border rounded-0.75rem shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-dark-table-text">Gesamt-Rangliste</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-dark-table-bg hover:bg-dark-table-bg">
                  <TableHead className="text-dark-table-text-muted font-semibold">Rang</TableHead>
                  <TableHead className="text-dark-table-text-muted font-semibold">Name</TableHead>
                  <TableHead className="text-right text-dark-table-text-muted font-semibold">E-Dart Pkt.</TableHead>
                  <TableHead className="text-right text-dark-table-text-muted font-semibold">Steel-Dart Pkt.</TableHead>
                  <TableHead className="text-right text-dark-table-text-muted font-semibold">Gesamt Antritte</TableHead>
                  <TableHead className="text-right text-dark-table-text-muted font-semibold">Gesamt Legs</TableHead>
                  <TableHead className="text-right text-gold-primary font-semibold">Gesamt Punkte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-dark-table-text-muted py-4">
                      Keine Gesamt-Ranglisten Daten verfügbar.
                    </TableCell>
                  </TableRow>
                ) : (
                  combinedPlayers.map((player, index) => (
                    <TableRow key={player.name} className="hover:bg-dark-table-hover">
                      <TableCell className="font-bold text-gold-primary">{index + 1}</TableCell>
                      <TableCell className="text-dark-table-text">{player.name}</TableCell>
                      <TableCell className="text-right">{player.edartPoints}</TableCell>
                      <TableCell className="text-right">{player.steelPoints}</TableCell>
                      <TableCell className="text-right">{player.totalParticipations}</TableCell>
                      <TableCell className="text-right">{player.totalLegs}</TableCell>
                      <TableCell className="text-right font-extrabold text-gold-primary">
                        {player.totalPoints}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
