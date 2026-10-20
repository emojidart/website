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
import { useState } from "react"

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
  teamMembers: any[]
  selectedSeasonId: string
  playerRates: Record<string, number>
  lineupAppearances: any[]
  chargeAbsentByPlayer: Record<string,boolean>
  completedTeamMatches: any[]
  ratesError: string
  ratesSaving: boolean
  savePlayerRate: (teamId: string, playerId: string, rate: number | null, chargeWhenAbsent?: boolean) => Promise<void>
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
  teamMembers,
  selectedSeasonId,
  playerRates,
  lineupAppearances,
  chargeAbsentByPlayer,
  completedTeamMatches,
  ratesError,
  ratesSaving,
  savePlayerRate,
}: BonusSectionProps) {
  const [editingPlayer, setEditingPlayer] = useState("")
  const [settingsDartType, setSettingsDartType] = useState<"all" | "edart" | "steeldart">("all")
  const [editingRate, setEditingRate] = useState("10")
  const [editingMode, setEditingMode] = useState("fixed")
  const [editingChargeAbsent, setEditingChargeAbsent] = useState(false)
  const euro = (n: number) => n.toFixed(2).replace(".", ",") + " €"
  const getPlayerRate = (playerId: string, teamId: string) => playerRates[`${teamId}:${selectedSeasonId}:${playerId}`]
  const rateTeamFor = (playerId: string, dartType?: string) => teamMembers.find((m:any)=>m.player_id===playerId && (!dartType || String(m.team?.dart_type||"").toLowerCase().replace(/[-_\s]/g, "")===dartType) && getPlayerRate(playerId,m.team_id)!==undefined)
  const ratesByPlayer = (playerId: string, dartType?: string) => { const m=rateTeamFor(playerId,dartType); return m ? getPlayerRate(playerId,m.team_id) : undefined }
  const billableFor = (playerId: string, dartType?: string) => {
    const m = rateTeamFor(playerId,dartType)
    if (!m) return appearancesFor(playerId,dartType)
    const key=`${m.team_id}:${selectedSeasonId}:${playerId}`
    return chargeAbsentByPlayer[key]
      ? new Set(completedTeamMatches.filter((r:any)=>r.team_id===m.team_id).map((r:any)=>r.match_id)).size
      : new Set(lineupAppearances.filter((r:any)=>r.team_id===m.team_id && r.player_id===playerId).map((r:any)=>r.match_id)).size
  }
  const appearancesFor = (playerId: string, dartType?: string) => new Set(lineupAppearances.filter((r:any)=>r.player_id === playerId && (!dartType || String(r.match?.dart_type).toLowerCase().replace(/[-_\s]/g,"") === dartType)).map((r:any)=>`${r.match_id}:${r.team_id}`)).size
  const settingsMembers = Array.from(new Map(
    teamMembers
      .filter((m: any) => m.club_players?.name && (settingsDartType === "all" || String(m.team?.dart_type || "").toLowerCase().replace(/[-_\s]/g, "") === settingsDartType))
      .map((m: any) => [`${m.team_id}:${m.player_id}`, m]),
  ).values()).sort((a: any, b: any) => String(a.team?.dart_type || "").localeCompare(String(b.team?.dart_type || "")) || String(a.club_players.name).localeCompare(String(b.club_players.name), "de"))
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

    // Fixed-rate players may have no penalty/leg statistics at all.
    for (const row of lineupAppearances) {
      if (dartType && String(row.match?.dart_type).toLowerCase().replace(/[-_\s]/g, "") !== dartType) continue
      if (!penaltyStats[row.player_id]) {
        const member = teamMembers.find((m:any)=>m.player_id === row.player_id)
        penaltyStats[row.player_id] = {under26:0,under30:0,semperit:0,playerName:member?.club_players?.name || "Unbekannt",photoUrl:member?.club_players?.photo_url || null}
      }
    }
    for (const member of teamMembers) {
      if (dartType && String(member.team?.dart_type||"").toLowerCase().replace(/[-_\s]/g, "") !== dartType) continue
      if (getPlayerRate(member.player_id,member.team_id) === undefined || penaltyStats[member.player_id]) continue
      penaltyStats[member.player_id] = {under26:0,under30:0,semperit:0,playerName:member.club_players?.name||"Unbekannt",photoUrl:member.club_players?.photo_url||null}
    }
    return Object.entries(penaltyStats)
      .map(([playerId, stats]) => ({
        playerId,
        playerName: stats.playerName,
        photoUrl: stats.photoUrl,
        under26: stats.under26,
        under30: stats.under30,
        semperit: stats.semperit,
        totalPenalties: stats.under26 + stats.under30 + stats.semperit,
        fixedRate: ratesByPlayer(playerId, dartType),
        appearances: appearancesFor(playerId, dartType),
        totalCost: ratesByPlayer(playerId, dartType) !== undefined
          ? (ratesByPlayer(playerId, dartType) as number) * billableFor(playerId, dartType)
          : stats.under26 * bonusConfig.under26 +
          stats.under30 * bonusConfig.under30 +
          stats.semperit * bonusConfig.semperit,
      }))
      .filter((player) => player.totalPenalties > 0 || player.fixedRate !== undefined)
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
                <TableHead className="font-bold text-center text-gray-700">Einsätze</TableHead>
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

                  <TableCell className="text-center text-sm">{penalty.appearances}{penalty.fixedRate !== undefined ? <div className="text-[10px] text-orange-600">Fix {euro(penalty.fixedRate)}</div> : null}</TableCell>
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
          {ratesError ? <p className="mb-3 text-sm text-red-600">{ratesError}</p> : null}
          <div className="mb-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-gray-900">
            <p className="mb-2 font-bold">Fixbetrag je Spieler und Ligaabend</p>
            <p className="mb-3 text-xs text-gray-600">Standardmäßig zählt nur ein tatsächlicher Einsatz, auch als Ersatzspieler. Optional können alle abgeschlossenen Ligaabende der Mannschaft berechnet werden. Nie pro Leg.</p>
            {selectedSeasonId === "all" ? <p className="text-sm text-red-700">Zum Bearbeiten eine Saison auswählen.</p> : null}
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Dartart filtern">
              {([ ["all", "Alle"], ["edart", "E-Dart"], ["steeldart", "Steeldart"] ] as const).map(([value, label]) => (
                <Button key={value} size="sm" variant={settingsDartType === value ? "default" : "outline"} onClick={() => { setSettingsDartType(value); setEditingPlayer("") }}>{label}</Button>
              ))}
            </div>
            <div className="space-y-2">
              {settingsMembers.map((member:any)=> {
                const key = `${member.team_id}:${member.player_id}`
                const rate = getPlayerRate(member.player_id,member.team_id)
                const editing = editingPlayer === key
                const count = new Set(lineupAppearances.filter((r:any)=>r.player_id === member.player_id && r.team_id === member.team_id).map((r:any)=>r.match_id)).size
                const totalNights = new Set(completedTeamMatches.filter((r:any)=>r.team_id === member.team_id).map((r:any)=>r.match_id)).size
                const chargeAbsent = chargeAbsentByPlayer[`${member.team_id}:${selectedSeasonId}:${member.player_id}`] || false
                return <div key={key} className="rounded-xl bg-white border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><p className="font-semibold text-sm">{member.club_players.name} <span className="ml-2 text-xs font-normal text-orange-700">{String(member.team?.dart_type || "").toLowerCase().replace(/[-_\s]/g, "") === "steeldart" ? "Steeldart" : "E-Dart"}</span></p><p className="text-xs text-gray-500">{member.team?.name ? `${member.team.name} · ` : ""}{count} Einsätze · {rate === undefined ? "Fehlwürfe" : `Fix ${euro(rate)} / Abend · ${euro(rate*(chargeAbsent ? totalNights : count))}${chargeAbsent ? " (alle Ligaabende)" : ""}`}</p></div>
                    <Button size="sm" variant="outline" disabled={selectedSeasonId === "all"} onClick={()=>{setEditingPlayer(editing ? "" : key);setEditingMode(rate === undefined ? "penalty" : "fixed");setEditingRate(String(rate ?? 10));setEditingChargeAbsent(chargeAbsent)}}>Einstellen</Button>
                  </div>
                  {editing ? <div className="mt-3 space-y-2">
                    <select aria-label="Abrechnungsart" className="w-full rounded-lg border bg-white p-2 text-sm" value={editingMode} onChange={e=>setEditingMode(e.target.value)}><option value="penalty">Normal nach Fehlwürfen</option><option value="fixed">Fixbetrag pro Ligaabend</option></select>
                    {editingMode === "fixed" ? <><Input aria-label="Euro pro Ligaabend" type="number" min="0" step="0.01" value={editingRate} onChange={e=>setEditingRate(e.target.value)} />
                    <label className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50/70 p-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4 accent-orange-600" checked={editingChargeAbsent} onChange={e=>setEditingChargeAbsent(e.target.checked)} /><span><strong>Auch ohne Einsatz berechnen</strong><span className="mt-1 block text-xs text-gray-600">Bei jeder abgeschlossenen Mannschaftsbegegnung berechnen, auch wenn der Spieler nicht in der Aufstellung stand. Standard: aus.</span></span></label></> : null}
                    <Button size="sm" disabled={ratesSaving || (editingMode === "fixed" && (editingRate.trim() === "" || !Number.isFinite(Number(editingRate)) || Number(editingRate)<0))} onClick={async()=>{await savePlayerRate(member.team_id,member.player_id,editingMode === "fixed" ? Math.round(Number(editingRate)*100)/100 : null, editingMode === "fixed" && editingChargeAbsent);setEditingPlayer("")}}>Speichern</Button>
                  </div> : null}
                </div>
              })}
            </div>
          </div>
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