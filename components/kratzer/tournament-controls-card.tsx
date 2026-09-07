"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { TournamentSettings } from "@/types/tournament"
import { Settings, RefreshCcw, Play, Heart, Euro, Pause, Flag, XCircle, Dices, Volume2, Timer, MonitorUp } from "lucide-react"

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
  onOpenBeamer: () => void
}

export function TournamentControlsCard({
  settings, isTournamentRunning, tournamentFinished, loading, activeTournamentExists,
  currentRound, registeredPlayersCount, onSettingsChange, onStartTournament, onStartNewRound,
  onShowLeagueStatus, onShowPrizeMoney, onTogglePause, onFinishTournament, onCancelTournament, onOpenBeamer,
}: TournamentControlsCardProps) {
  return (
    <Card className="mb-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_65px_-48px_rgba(15,23,42,.65)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-950 px-5 py-5 text-white sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">
            <Settings className="h-4 w-4" />Steuerung
          </div>
          <h2 className="mt-1 text-xl font-black tracking-tight">Turnier-Steuerung</h2>
        </div>
        <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-300">
          {isTournamentRunning ? `Runde ${currentRound} · Turnier läuft` : "Bereit zum Start"}
        </div>
      </div>

      <CardContent className="space-y-5 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-3.5">
            <Label htmlFor="boardCount" className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Anzahl der Automaten</Label>
            <Input id="boardCount" type="number" min="1" max="32" value={settings.boardCount} onChange={(e) => onSettingsChange("boardCount", Number.parseInt(e.target.value))} className="mt-2 h-11 rounded-xl border-slate-200 bg-white text-base font-black text-slate-950 shadow-none" disabled={isTournamentRunning || loading} />
          </div>
          <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-3.5">
            <Label htmlFor="maxGroupSize" className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Max. Gruppengröße</Label>
            <Input id="maxGroupSize" type="number" min="2" max="6" value={settings.maxGroupSize} onChange={(e) => onSettingsChange("maxGroupSize", Number.parseInt(e.target.value))} className="mt-2 h-11 rounded-xl border-slate-200 bg-white text-base font-black text-slate-950 shadow-none" disabled={isTournamentRunning || loading} />
          </div>
          <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-3.5">
            <Label htmlFor="suddenDeathTime" className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Zeitlimit (Minuten)</Label>
            <Input id="suddenDeathTime" type="number" min="1" max="60" value={settings.suddenDeathTime} onChange={(e) => onSettingsChange("suddenDeathTime", Number.parseInt(e.target.value))} className="mt-2 h-11 rounded-xl border-slate-200 bg-white text-base font-black text-slate-950 shadow-none" disabled={isTournamentRunning || loading} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className={`flex cursor-pointer items-center gap-3 rounded-[18px] border p-3.5 transition ${settings.suddenDeathEnabled ? "border-slate-300 bg-slate-950 text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
            <Checkbox id="suddenDeathMode" checked={settings.suddenDeathEnabled} onCheckedChange={(checked) => onSettingsChange("suddenDeathEnabled", checked)} disabled={isTournamentRunning || loading} />
            <span className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${settings.suddenDeathEnabled ? "bg-white/10 text-orange-400" : "bg-slate-100 text-slate-600"}`}><Timer className="h-5 w-5" /></span>
            <span><span className="block font-black">Sudden Death</span><span className={`block text-xs font-semibold ${settings.suddenDeathEnabled ? "text-slate-400" : "text-slate-500"}`}>{settings.suddenDeathEnabled ? "Aktiv" : "Aus"}</span></span>
          </label>

          <label className={`flex cursor-pointer items-center gap-3 rounded-[18px] border p-3.5 transition ${settings.speechEnabled ? "border-slate-300 bg-slate-950 text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
            <Checkbox id="speechOutput" checked={settings.speechEnabled} onCheckedChange={(checked) => onSettingsChange("speechEnabled", checked)} disabled={isTournamentRunning || loading || !("speechSynthesis" in window)} />
            <span className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${settings.speechEnabled ? "bg-white/10 text-orange-400" : "bg-slate-100 text-slate-600"}`}><Volume2 className="h-5 w-5" /></span>
            <span><span className="block font-black">Sprachausgabe</span><span className={`block text-xs font-semibold ${settings.speechEnabled ? "text-slate-400" : "text-slate-500"}`}>{settings.speechEnabled ? "Aktiv" : "Aus"}</span></span>
          </label>

          <label className={`flex cursor-pointer items-center gap-3 rounded-[18px] border p-3.5 transition ${settings.diceModeEnabled ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
            <Checkbox id="diceModeEnabled" checked={Boolean(settings.diceModeEnabled)} onCheckedChange={(checked) => onSettingsChange("diceModeEnabled", checked === true)} disabled={loading || tournamentFinished} />
            <span className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${settings.diceModeEnabled ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-600"}`}><Dices className="h-5 w-5" /></span>
            <span><span className="block font-black text-slate-950">Würfelmodus</span><span className="block text-xs font-semibold text-slate-500">{settings.diceModeEnabled ? "Aktiv" : "Aus"}</span></span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2.5 border-t border-slate-100 pt-5">
          <Button onClick={onStartTournament} disabled={isTournamentRunning || loading || registeredPlayersCount === 0} className="h-11 rounded-xl bg-slate-950 px-4 font-black text-white hover:bg-slate-900"><Play className="mr-2 h-4 w-4" />{isTournamentRunning ? "Turnier läuft" : "Turnier starten"}</Button>
          <Button onClick={onStartNewRound} disabled={!isTournamentRunning || tournamentFinished || loading} className="h-11 rounded-xl bg-orange-600 px-4 font-black text-white hover:bg-orange-700"><RefreshCcw className="mr-2 h-4 w-4" />Neue Runde</Button>
          <Button onClick={onOpenBeamer} disabled={loading} variant="outline" className="h-11 rounded-xl border-orange-200 bg-orange-50 px-4 font-black text-orange-700 hover:bg-orange-100"><MonitorUp className="mr-2 h-4 w-4" />Beamer öffnen</Button>
          <Button onClick={onShowLeagueStatus} disabled={!isTournamentRunning || tournamentFinished || loading} variant="outline" className="h-11 rounded-xl border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50"><Heart className="mr-2 h-4 w-4" />Leben</Button>
          <Button onClick={onShowPrizeMoney} disabled={!isTournamentRunning || loading} variant="outline" className="h-11 rounded-xl border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50"><Euro className="mr-2 h-4 w-4" />Preisgeld</Button>
          <Button onClick={onTogglePause} disabled={!isTournamentRunning || tournamentFinished || loading} variant="outline" className="h-11 rounded-xl border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50"><Pause className="mr-2 h-4 w-4" />Pause</Button>
          <Button onClick={onFinishTournament} disabled={!isTournamentRunning || !tournamentFinished || loading} className="h-11 rounded-xl bg-slate-950 px-4 font-black text-white hover:bg-slate-900"><Flag className="mr-2 h-4 w-4" />Turnier abschließen</Button>
          <Button onClick={onCancelTournament} disabled={!isTournamentRunning && currentRound === 0 && !activeTournamentExists} variant="destructive" className="h-11 rounded-xl font-black"><XCircle className="mr-2 h-4 w-4" />Turnier abbrechen</Button>
        </div>
      </CardContent>
    </Card>
  )
}
