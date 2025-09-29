"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Euro, Settings } from "lucide-react"

interface BonusConfig {
  under26: number
  under30: number
  semperit: number
}

interface BonusSectionProps {
  legStatistics: any[]
  legStatsLoading: boolean
  bonusConfig: BonusConfig
  isBonusConfigOpen: boolean
  setIsBonusConfigOpen: (open: boolean) => void
  tempBonusConfig: BonusConfig
  setTempBonusConfig: (config: BonusConfig | ((prev: BonusConfig) => BonusConfig)) => void
  saveBonusConfig: () => void
}

export function BonusSection({
  legStatistics,
  legStatsLoading,
  bonusConfig,
  isBonusConfigOpen,
  setIsBonusConfigOpen,
  tempBonusConfig,
  setTempBonusConfig,
  saveBonusConfig,
}: BonusSectionProps) {
  const getFilteredStatistics = (dartType?: "edart" | "steeldart") => {
    if (!dartType) return legStatistics

    return legStatistics.filter((stat) => {
      // Assuming there's a dart_type field in the statistics
      // If not available, we'll need to determine this from match data
      return stat.dart_type === dartType || stat.matches?.dart_type === dartType
    })
  }

  const getPenaltyStatistics = (dartType?: "edart" | "steeldart") => {
    const filteredStats = getFilteredStatistics(dartType)
    const penaltyStats: {
      [key: string]: { under26: number; under30: number; semperit: number; playerName: string; matchInfo: any }
    } = {}

    filteredStats.forEach((stat) => {
      const playerId = stat.player_id
      if (!penaltyStats[playerId]) {
        penaltyStats[playerId] = {
          under26: 0,
          under30: 0,
          semperit: 0,
          playerName: stat.player?.name || "Unbekannt",
          matchInfo: stat.matches,
        }
      }
      penaltyStats[playerId].under26 += stat.throws_under_26 || 0
      penaltyStats[playerId].under30 += stat.throws_under_30 || 0
      penaltyStats[playerId].semperit += stat.semperit_outs || 0
    })

    return Object.entries(penaltyStats).map(([playerId, stats]) => ({
      playerId,
      playerName: stats.playerName,
      under26: stats.under26,
      under30: stats.under30,
      semperit: stats.semperit,
      totalPenalties: stats.under26 + stats.under30 + stats.semperit,
      totalCost:
        stats.under26 * bonusConfig.under26 +
        stats.under30 * bonusConfig.under30 +
        stats.semperit * bonusConfig.semperit,
    }))
  }

  const renderStatisticsTable = (dartType?: "edart" | "steeldart") => {
    const penalties = getPenaltyStatistics(dartType)

    if (penalties.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Euro className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Keine Bonusgeld gefunden.</p>
          <p className="text-sm mt-2">
            {dartType === "edart"
              ? "Keine eDart-Spiele"
              : dartType === "steeldart"
                ? "Keine Steeldart-Spiele"
                : "Bonusgelder werden nach dem ersten Spiel angezeigt."}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="overflow-x-auto">
          <UITable className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold w-[100px] sm:w-auto">Spieler</TableHead>
                <TableHead className="font-bold text-center text-red-600 w-[60px] sm:w-[80px]">
                  <span className="hidden sm:inline">Unter 26</span>
                  <span className="sm:hidden">U26</span>
                </TableHead>
                <TableHead className="font-bold text-center text-red-600 w-[60px] sm:w-[80px]">
                  <span className="hidden sm:inline">Unter 30</span>
                  <span className="sm:hidden">U30</span>
                </TableHead>
                <TableHead className="font-bold text-center text-red-600 w-[60px] sm:w-[80px]">
                  <span className="hidden sm:inline">Semperit</span>
                  <span className="sm:hidden">Semp</span>
                </TableHead>
                <TableHead className="font-bold text-center w-[70px] sm:w-[100px]">
                  <span className="hidden sm:inline">Gesamt</span>
                  <span className="sm:hidden">Total</span>
                </TableHead>
                <TableHead className="font-bold text-center w-[70px] sm:w-[80px]">
                  <span className="hidden sm:inline">Kosten (€)</span>
                  <span className="sm:hidden">€</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {penalties
                .sort((a, b) => b.totalCost - a.totalCost)
                .map((penalty) => (
                  <TableRow key={penalty.playerId} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                          <AvatarImage src="/darts-player.png" />
                          <AvatarFallback className="text-xs bg-red-100 text-red-700">
                            {penalty.playerName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs sm:text-base truncate max-w-[80px] sm:max-w-none">
                          {penalty.playerName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {penalty.under26 > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {penalty.under26}
                        </Badge>
                      ) : (
                        <span className="text-green-600 font-medium text-sm">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {penalty.under30 > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {penalty.under30}
                        </Badge>
                      ) : (
                        <span className="text-green-600 font-medium text-sm">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {penalty.semperit > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {penalty.semperit}
                        </Badge>
                      ) : (
                        <span className="text-green-600 font-medium text-sm">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-bold text-xs">
                        {penalty.totalPenalties}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-red-600 text-sm">{penalty.totalCost.toFixed(2)}€</span>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </UITable>
        </div>

        {/* Summary Card */}
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                <span className="font-bold text-base sm:text-lg">
                  {dartType === "edart"
                    ? "eDart Bonusgelder:"
                    : dartType === "steeldart"
                      ? "Steeldart Bonusgelder:"
                      : "Gesamte Bonusgelder:"}
                </span>
              </div>
              <span className="text-xl sm:text-2xl font-bold text-red-600">
                {penalties.reduce((total, penalty) => total + penalty.totalCost, 0).toFixed(2)}€
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Gesamt Unter 26:</span>{" "}
                {penalties.reduce((total, penalty) => total + penalty.under26, 0)}
              </div>
              <div>
                <span className="font-medium">Gesamt Unter 30:</span>{" "}
                {penalties.reduce((total, penalty) => total + penalty.under30, 0)}
              </div>
              <div>
                <span className="font-medium">Gesamt Semperit:</span>{" "}
                {penalties.reduce((total, penalty) => total + penalty.semperit, 0)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <Card className="shadow-xl border-0 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
            <Euro className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
            Bonusgeld Übersicht
            <Button variant="outline" size="sm" onClick={() => setIsBonusConfigOpen(true)} className="ml-auto">
              <Settings className="h-4 w-4 mr-2" />
              Konfiguration
            </Button>
          </CardTitle>
          <p className="text-muted-foreground text-sm sm:text-base">
            Bonusgeld für Würfe unter 26 ({bonusConfig.under26.toFixed(2)}€), unter 30 ({bonusConfig.under30.toFixed(2)}
            €) und Semperit ({bonusConfig.semperit.toFixed(2)}€)
          </p>
        </CardHeader>
        <CardContent>
          {legStatsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Lade Bonusgeld...</p>
            </div>
          ) : legStatistics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Euro className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Keine Bonusgeld gefunden.</p>
              <p className="text-sm mt-2">Bonusgelder werden nach dem ersten Spiel angezeigt.</p>
            </div>
          ) : (
            <Tabs defaultValue="gesamt" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="gesamt">Gesamt</TabsTrigger>
                <TabsTrigger value="edart">E-Dart</TabsTrigger>
                <TabsTrigger value="steeldart">Steeldart</TabsTrigger>
              </TabsList>

              <TabsContent value="gesamt" className="mt-6">
                {renderStatisticsTable()}
              </TabsContent>

              <TabsContent value="edart" className="mt-6">
                {renderStatisticsTable("edart")}
              </TabsContent>

              <TabsContent value="steeldart" className="mt-6">
                {renderStatisticsTable("steeldart")}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={isBonusConfigOpen} onOpenChange={setIsBonusConfigOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              Bonusgeld Konfiguration
            </DialogTitle>
            <DialogDescription className="text-sm">
              Passen Sie die Bonusgeld-Beträge für Ihren Verein an.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="under26">Bonusgeld für Würfe unter 26 (€)</Label>
              <Input
                id="under26"
                type="number"
                step="0.01"
                min="0"
                value={tempBonusConfig.under26}
                onChange={(e) =>
                  setTempBonusConfig((prev) => ({
                    ...prev,
                    under26: Number.parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="under30">Bonusgeld für Würfe unter 30 (€)</Label>
              <Input
                id="under30"
                type="number"
                step="0.01"
                min="0"
                value={tempBonusConfig.under30}
                onChange={(e) =>
                  setTempBonusConfig((prev) => ({
                    ...prev,
                    under30: Number.parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semperit">Bonusgeld für Semperit (€)</Label>
              <Input
                id="semperit"
                type="number"
                step="0.01"
                min="0"
                value={tempBonusConfig.semperit}
                onChange={(e) =>
                  setTempBonusConfig((prev) => ({
                    ...prev,
                    semperit: Number.parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBonusConfigOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={saveBonusConfig}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
