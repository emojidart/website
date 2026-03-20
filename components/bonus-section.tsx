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
  const normalizeNumber = (value: any) => {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }

  const getFilteredStatistics = (dartType?: "edart" | "steeldart") => {
    const stats = Array.isArray(legStatistics) ? legStatistics : []

    if (!dartType) return stats

    return stats.filter((stat) => {
      const matchDartType = stat?.matches?.dart_type
      if (!matchDartType) return false

      const normalizedMatchType = String(matchDartType).toLowerCase().replace(/[-_\s]/g, "")
      const normalizedFilterType = dartType.toLowerCase().replace(/[-_\s]/g, "")
      return normalizedMatchType === normalizedFilterType
    })
  }

  const getPenaltyStatistics = (dartType?: "edart" | "steeldart") => {
    const filteredStats = getFilteredStatistics(dartType)

    const penaltyStats: {
      [key: string]: {
        under26: number
        under30: number
        semperit: number
        playerName: string
        photoUrl?: string | null
      }
    } = {}

    filteredStats.forEach((stat) => {
      const playerId = stat?.player_id
      if (!playerId) return

      if (!penaltyStats[playerId]) {
        penaltyStats[playerId] = {
          under26: 0,
          under30: 0,
          semperit: 0,
          playerName: stat?.player?.name || "Unbekannt",
          photoUrl: stat?.player?.photo_url ?? null,
        }
      }

      penaltyStats[playerId].under26 += normalizeNumber(stat?.throws_under_26)
      penaltyStats[playerId].under30 += normalizeNumber(stat?.throws_under_30)
      penaltyStats[playerId].semperit += normalizeNumber(stat?.semperit_outs)
    })

    return Object.entries(penaltyStats)
      .map(([playerId, stats]) => ({
        playerId,
        playerName: stats.playerName,
        photoUrl: stats.photoUrl,
        under26: stats.under26,
        under30: stats.under30,
        semperit: stats.semperit,
        totalPenalties: stats.under26 + stats.under30 + stats.semperit,
        totalCost:
          stats.under26 * bonusConfig.under26 +
          stats.under30 * bonusConfig.under30 +
          stats.semperit * bonusConfig.semperit,
      }))
      .filter((player) => player.totalPenalties > 0)
  }

  const renderStatisticsTable = (dartType?: "edart" | "steeldart") => {
    const penalties = getPenaltyStatistics(dartType)

    if (penalties.length === 0) {
      return (
        <div className="py-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200">
            <Euro className="h-6 w-6 text-orange-600" />
          </div>
          <p className="font-semibold text-gray-900">Keine Bonusgelder gefunden.</p>
          <p className="mt-1 text-sm text-gray-500">
            {dartType === "edart"
              ? "Keine eDart-Bonuswerte vorhanden."
              : dartType === "steeldart"
                ? "Keine Steeldart-Bonuswerte vorhanden."
                : "Für diese Auswahl gibt es keine Bonuswerte."}
          </p>
        </div>
      )
    }

    const sortedPenalties = [...penalties].sort((a, b) => b.totalCost - a.totalCost)
    const totalCost = sortedPenalties.reduce((total, p) => total + p.totalCost, 0)
    const totalU26 = sortedPenalties.reduce((total, p) => total + p.under26, 0)
    const totalU30 = sortedPenalties.reduce((total, p) => total + p.under30, 0)
    const totalSemp = sortedPenalties.reduce((total, p) => total + p.semperit, 0)

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto rounded-2xl border border-gray-200/70 bg-white ring-1 ring-black/5">
          <UITable className="min-w-full">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-bold text-gray-700 w-[120px] sm:w-auto">Spieler</TableHead>
                <TableHead className="font-bold text-center text-red-700 w-[64px] sm:w-[90px]">
                  <span className="hidden sm:inline">Unter 26</span>
                  <span className="sm:hidden">U26</span>
                </TableHead>
                <TableHead className="font-bold text-center text-red-700 w-[64px] sm:w-[90px]">
                  <span className="hidden sm:inline">Unter 30</span>
                  <span className="sm:hidden">U30</span>
                </TableHead>
                <TableHead className="font-bold text-center text-red-700 w-[64px] sm:w-[90px]">
                  <span className="hidden sm:inline">Semperit</span>
                  <span className="sm:hidden">Semp</span>
                </TableHead>
                <TableHead className="font-bold text-center text-gray-700 w-[70px] sm:w-[110px]">
                  <span className="hidden sm:inline">Gesamt</span>
                  <span className="sm:hidden">Total</span>
                </TableHead>
                <TableHead className="font-bold text-center text-gray-700 w-[70px] sm:w-[110px]">
                  <span className="hidden sm:inline">Kosten (€)</span>
                  <span className="sm:hidden">€</span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedPenalties.map((penalty) => (
                <TableRow key={penalty.playerId} className="hover:bg-gray-50/70">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                        <AvatarImage src={penalty.photoUrl || "/darts-player.png"} />
                        <AvatarFallback className="text-xs bg-orange-50 text-orange-700 border border-orange-200">
                          {penalty.playerName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs sm:text-base truncate">{penalty.playerName}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    {penalty.under26 > 0 ? (
                      <Badge className="bg-red-600 text-white text-[11px]">{penalty.under26}</Badge>
                    ) : (
                      <span className="text-emerald-700 font-semibold text-sm">0</span>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    {penalty.under30 > 0 ? (
                      <Badge className="bg-red-600 text-white text-[11px]">{penalty.under30}</Badge>
                    ) : (
                      <span className="text-emerald-700 font-semibold text-sm">0</span>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    {penalty.semperit > 0 ? (
                      <Badge className="bg-red-600 text-white text-[11px]">{penalty.semperit}</Badge>
                    ) : (
                      <span className="text-emerald-700 font-semibold text-sm">0</span>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[11px] border-gray-200 font-bold">
                      {penalty.totalPenalties}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="font-bold text-red-700 text-sm">{penalty.totalCost.toFixed(2)}€</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </UITable>
        </div>

        <Card className="border border-red-200/70 bg-red-50 shadow-md ring-1 ring-black/5 rounded-2xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2">
                <Euro className="h-5 w-5 text-red-700" />
                <span className="font-bold text-base sm:text-lg text-gray-900">
                  {dartType === "edart"
                    ? "eDart Bonusgelder"
                    : dartType === "steeldart"
                      ? "Steeldart Bonusgelder"
                      : "Gesamte Bonusgelder"}
                  :
                </span>
              </div>
              <span className="text-xl sm:text-2xl font-extrabold text-red-700">{totalCost.toFixed(2)}€</span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <div>
                <span className="font-semibold text-gray-800">Gesamt Unter 26:</span> {totalU26}
              </div>
              <div>
                <span className="font-semibold text-gray-800">Gesamt Unter 30:</span> {totalU30}
              </div>
              <div>
                <span className="font-semibold text-gray-800">Gesamt Semperit:</span> {totalSemp}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-7">
      <Card className="border border-gray-200/70 bg-white shadow-md ring-1 ring-black/5 rounded-2xl">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900">
                <Euro className="h-5 w-5 text-orange-600" />
                Bonusgeld Übersicht
              </CardTitle>
              <p className="mt-1 text-sm text-gray-500">
                Bonusgeld für Würfe unter 26 ({bonusConfig.under26.toFixed(2)}€), unter 30 ({bonusConfig.under30.toFixed(2)}€) und Semperit ({bonusConfig.semperit.toFixed(2)}€)
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBonusConfigOpen(true)}
              className="rounded-xl border-gray-200/70 bg-white shadow-sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Konfiguration
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0">
          {legStatsLoading ? (
            <div className="py-10 text-center">
              <div className="mx-auto h-9 w-9 rounded-full border-4 border-orange-600/20 border-t-orange-600 animate-spin" />
              <p className="mt-3 text-sm text-gray-500">Lade Bonusgeld...</p>
            </div>
          ) : getPenaltyStatistics().length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200">
                <Euro className="h-6 w-6 text-orange-600" />
              </div>
              <p className="font-semibold text-gray-900">Keine Bonusgelder gefunden.</p>
              <p className="mt-1 text-sm text-gray-500">Für diese Auswahl gibt es keine Bonuswerte.</p>
            </div>
          ) : (
            <Tabs defaultValue="gesamt" className="w-full">
              <TabsList className="flex w-full gap-2 bg-transparent p-0 border-0 shadow-none mb-4 sm:mb-6">
                <TabsTrigger
                  value="gesamt"
                  className="flex-1 h-8 rounded-lg px-2 text-[11px] sm:text-xs font-semibold text-gray-600
                    data-[state=active]:bg-orange-600 data-[state=active]:text-white"
                >
                  Gesamt
                </TabsTrigger>
                <TabsTrigger
                  value="edart"
                  className="flex-1 h-8 rounded-lg px-2 text-[11px] sm:text-xs font-semibold text-gray-600
                    data-[state=active]:bg-orange-600 data-[state=active]:text-white"
                >
                  E-Dart
                </TabsTrigger>
                <TabsTrigger
                  value="steeldart"
                  className="flex-1 h-8 rounded-lg px-2 text-[11px] sm:text-xs font-semibold text-gray-600
                    data-[state=active]:bg-orange-600 data-[state=active]:text-white"
                >
                  Steeldart
                </TabsTrigger>
              </TabsList>

              <TabsContent value="gesamt" className="space-y-4 sm:space-y-6">
                {renderStatisticsTable()}
              </TabsContent>

              <TabsContent value="edart" className="space-y-4 sm:space-y-6">
                {renderStatisticsTable("edart")}
              </TabsContent>

              <TabsContent value="steeldart" className="space-y-4 sm:space-y-6">
                {renderStatisticsTable("steeldart")}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={isBonusConfigOpen} onOpenChange={setIsBonusConfigOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md mx-auto rounded-2xl border border-gray-200/70 bg-white shadow-md ring-1 ring-black/5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg text-gray-900">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              Bonusgeld Konfiguration
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Passen Sie die Bonusgeld-Beträge für Ihren Verein an.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="under26" className="text-sm font-medium text-gray-700">
                Bonusgeld für Würfe unter 26 (€)
              </Label>
              <Input
                id="under26"
                type="number"
                step="0.01"
                min="0"
                value={tempBonusConfig.under26}
                className="rounded-xl border-gray-200/70"
                onChange={(e) =>
                  setTempBonusConfig((prev) => ({
                    ...prev,
                    under26: Number.parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="under30" className="text-sm font-medium text-gray-700">
                Bonusgeld für Würfe unter 30 (€)
              </Label>
              <Input
                id="under30"
                type="number"
                step="0.01"
                min="0"
                value={tempBonusConfig.under30}
                className="rounded-xl border-gray-200/70"
                onChange={(e) =>
                  setTempBonusConfig((prev) => ({
                    ...prev,
                    under30: Number.parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="semperit" className="text-sm font-medium text-gray-700">
                Bonusgeld für Semperit (€)
              </Label>
              <Input
                id="semperit"
                type="number"
                step="0.01"
                min="0"
                value={tempBonusConfig.semperit}
                className="rounded-xl border-gray-200/70"
                onChange={(e) =>
                  setTempBonusConfig((prev) => ({
                    ...prev,
                    semperit: Number.parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsBonusConfigOpen(false)}
              className="rounded-xl border-gray-200/70"
            >
              Abbrechen
            </Button>
            <Button onClick={saveBonusConfig} className="rounded-xl bg-orange-600 text-white hover:bg-orange-700">
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}