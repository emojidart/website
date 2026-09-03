"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { TournamentSettings } from "@/types/tournament"
import {
  Settings,
  RefreshCcw,
  Play,
  Heart,
  Euro,
  Pause,
  Flag,
  XCircle,
} from "lucide-react"

interface TournamentControlsCardProps {
  settings: TournamentSettings
  isTournamentRunning: boolean
  tournamentFinished: boolean
  loading: boolean
  activeTournamentExists: boolean
  currentRound: number
  registeredPlayersCount: number
  onSettingsChange: (key: keyof TournamentSettings, value: any) => void
  onStartTournament: () => void
  onStartNewRound: () => void
  onShowLeagueStatus: () => void
  onShowPrizeMoney: () => void
  onTogglePause: () => void
  onFinishTournament: () => void
  onCancelTournament: () => void
}

export function TournamentControlsCard({
  settings,
  isTournamentRunning,
  tournamentFinished,
  loading,
  activeTournamentExists,
  currentRound,
  registeredPlayersCount,
  onSettingsChange,
  onStartTournament,
  onStartNewRound,
  onShowLeagueStatus,
  onShowPrizeMoney,
  onTogglePause,
  onFinishTournament,
  onCancelTournament,
}: TournamentControlsCardProps) {
  return (
    <Card className="mb-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <CardHeader className="mb-0 border-b border-gray-100 bg-gray-50/60 px-5 py-4">
        <CardTitle className="flex items-center gap-2 text-lg font-black text-gray-950">
          <Settings className="h-6 w-6 text-orange-600" />
          Turnier-Steuerung
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label htmlFor="boardCount" className="text-gray-700">
              Anzahl der Automaten
            </Label>
            <Input
              id="boardCount"
              type="number"
              min="1"
              max="32"
              value={settings.boardCount}
              onChange={(e) => onSettingsChange("boardCount", Number.parseInt(e.target.value))}
              className="mt-2"
              disabled={isTournamentRunning || loading}
            />
          </div>

          <div>
            <Label htmlFor="maxGroupSize" className="text-gray-700">
              Maximale Gruppengröße
            </Label>
            <Input
              id="maxGroupSize"
              type="number"
              min="2"
              max="6"
              value={settings.maxGroupSize}
              onChange={(e) => onSettingsChange("maxGroupSize", Number.parseInt(e.target.value))}
              className="mt-2"
              disabled={isTournamentRunning || loading}
            />
          </div>

          <div>
            <Label htmlFor="suddenDeathTime" className="text-gray-700">
              Zeitlimit (Minuten)
            </Label>
            <Input
              id="suddenDeathTime"
              type="number"
              min="1"
              max="60"
              value={settings.suddenDeathTime}
              onChange={(e) => onSettingsChange("suddenDeathTime", Number.parseInt(e.target.value))}
              className="mt-2"
              disabled={isTournamentRunning || loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="suddenDeathMode"
              checked={settings.suddenDeathEnabled}
              onCheckedChange={(checked) => onSettingsChange("suddenDeathEnabled", checked)}
              disabled={isTournamentRunning || loading}
            />
            <Label htmlFor="suddenDeathMode" className="text-gray-700">
              Sudden Death Modus
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="speechOutput"
              checked={settings.speechEnabled}
              onCheckedChange={(checked) => onSettingsChange("speechEnabled", checked)}
              disabled={isTournamentRunning || loading || !("speechSynthesis" in window)}
            />
            <Label htmlFor="speechOutput" className="text-gray-700">
              Sprachausgabe (Google Rewin)
            </Label>
            {!("speechSynthesis" in window) && (
              <span className="text-xs text-gray-500">(Nicht unterstützt)</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-6">
          <Button
            onClick={onStartTournament}
            disabled={isTournamentRunning || loading || registeredPlayersCount === 0}
            className="rounded-xl bg-orange-600 font-bold hover:bg-orange-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {isTournamentRunning ? "Turnier läuft" : "Turnier starten"}
          </Button>

          <Button
            onClick={onStartNewRound}
            disabled={!isTournamentRunning || tournamentFinished || loading}
            className="rounded-xl bg-orange-600 font-bold hover:bg-orange-700"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Neue Runde
          </Button>

          <Button
            onClick={onShowLeagueStatus}
            disabled={!isTournamentRunning || tournamentFinished || loading}
            variant="outline"
            className="text-gray-700 border-gray-300 hover:bg-gray-100 bg-transparent"
          >
            <Heart className="h-4 w-4 mr-2" />
            Leben verwalten
          </Button>

          <Button
            onClick={onShowPrizeMoney}
            disabled={!isTournamentRunning || loading}
            variant="outline"
            className="text-gray-700 border-gray-300 hover:bg-gray-100 bg-transparent"
          >
            <Euro className="h-4 w-4 mr-2" />
            Preisgeld
          </Button>

          <Button
            onClick={onTogglePause}
            disabled={!isTournamentRunning || tournamentFinished || loading}
            variant="outline"
            className="text-gray-700 border-gray-300 hover:bg-gray-100 bg-transparent"
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>

          <Button
            onClick={onFinishTournament}
            disabled={!isTournamentRunning || !tournamentFinished || loading}
            className="rounded-xl bg-orange-600 font-bold hover:bg-orange-700"
          >
            <Flag className="h-4 w-4 mr-2" />
            Turnier abschließen
          </Button>

          <Button
            onClick={onCancelTournament}
            disabled={!isTournamentRunning && currentRound === 0 && !activeTournamentExists}
            variant="destructive"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Turnier abbrechen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}