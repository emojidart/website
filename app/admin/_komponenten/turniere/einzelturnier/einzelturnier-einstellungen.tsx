"use client"

import { AlertCircle, CheckCircle, Euro, Lock, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

type TournamentAccessType = "" | "public" | "club_internal" | "club_external"
type TournamentMode = "dko" | "round_robin"

type Props = {
  tournamentName: string
  onTournamentNameChange: (value: string) => void
  tournamentEntryFee: string
  onTournamentEntryFeeChange: (value: string) => void
  tournamentAccessType: TournamentAccessType
  onTournamentAccessTypeChange: (value: TournamentAccessType) => void
  tournamentMode: TournamentMode
  onTournamentModeChange: (value: TournamentMode) => void
  rrGroupCount: number
  onRrGroupCountChange: (value: number) => void
  allowDoubleEntry: boolean
  onAllowDoubleEntryChange: (value: boolean) => void
  doubleMode: boolean
  onDoubleModeChange: (value: boolean) => void
  isSeriesPrefilled: boolean
  tournamentFormCompleted: boolean
}

export function EinzelturnierEinstellungen({
  tournamentName,
  onTournamentNameChange,
  tournamentEntryFee,
  onTournamentEntryFeeChange,
  tournamentAccessType,
  onTournamentAccessTypeChange,
  tournamentMode,
  onTournamentModeChange,
  rrGroupCount,
  onRrGroupCountChange,
  allowDoubleEntry,
  onAllowDoubleEntryChange,
  doubleMode,
  onDoubleModeChange,
  isSeriesPrefilled,
  tournamentFormCompleted,
}: Props) {
  return (
    <section className="emd-admin-surface mb-6 overflow-hidden p-5 sm:p-6 lg:p-7">
      <div className="mb-5">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/75">Einstellungen</div>
        <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Turnier konfigurieren</h2>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Trophy className="h-6 w-6 text-orange-500" />
            <h3 className="flex items-center gap-2 text-xl font-bold text-white">
              Turniername
              {isSeriesPrefilled ? <Lock className="h-4 w-4 text-orange-400" /> : null}
            </h3>
            <span className="font-bold text-red-400">*</span>
          </div>
          <input
            type="text"
            placeholder="z. B. Herbst Turnier 2026"
            value={tournamentName}
            onChange={(e) => onTournamentNameChange(e.target.value)}
            disabled={isSeriesPrefilled}
            title={isSeriesPrefilled ? "Wird automatisch aus der Turnierserie geladen" : ""}
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-base font-bold text-white outline-none transition placeholder:text-white/25 focus:border-orange-400/45 focus:bg-white/[0.06] focus:ring-4 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:bg-white/[0.025] disabled:text-white/35"
            maxLength={100}
          />
        </div>

        <div>
          <div className="mb-4 flex items-center gap-3">
            <Euro className="h-6 w-6 text-orange-500" />
            <h3 className="flex items-center gap-2 text-xl font-bold text-white">
              Startgeld
              {isSeriesPrefilled ? <Lock className="h-4 w-4 text-orange-400" /> : null}
            </h3>
            <span className="font-bold text-red-400">*</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="z. B. 10.00"
              value={tournamentEntryFee}
              onChange={(e) => onTournamentEntryFeeChange(e.target.value)}
              disabled={isSeriesPrefilled}
              title={isSeriesPrefilled ? "Wird automatisch aus der Turnierserie geladen" : ""}
              className="h-12 flex-grow rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-base font-bold text-white outline-none transition placeholder:text-white/25 focus:border-orange-400/45 focus:bg-white/[0.065] focus:ring-4 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:bg-white/[0.025] disabled:text-white/35"
            />
            <span className="text-lg font-bold text-white/55">€</span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <Lock className="h-5 w-5 text-orange-500" />
          <h3 className="text-base font-bold text-white">Teilnahme</h3>
          <span className="font-bold text-red-400">*</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { value: "public" as const, title: "Öffentlich", text: "Alle Spieler – auch Gäste und Fremdspieler" },
            { value: "club_internal" as const, title: "Vereinsintern", text: "Nur Mitglieder mit Paket „Interne Turniere“" },
            { value: "club_external" as const, title: "Vereins-Auswärts", text: "Nur Mitglieder mit Paket „Externe Turniere“" },
          ].map((option) => {
            const active = tournamentAccessType === option.value
            return (
              <button
                key={option.value}
                type="button"
                disabled={isSeriesPrefilled}
                onClick={() => onTournamentAccessTypeChange(option.value)}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? "border-orange-300/35 bg-orange-500/[0.10] ring-1 ring-orange-400/10"
                    : "border-white/[0.08] bg-white/[0.025] hover:border-orange-300/25 hover:bg-orange-500/[0.055]"
                } ${isSeriesPrefilled ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-white">{option.title}</span>
                  {active ? <CheckCircle className="h-4 w-4 text-orange-400" /> : null}
                </div>
                <div className="mt-1 text-xs font-medium leading-4 text-white/45">{option.text}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 text-base font-bold text-white">Spielmodus</div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <Button
            type="button"
            onClick={() => onTournamentModeChange("dko")}
            variant="outline"
            className={`h-12 rounded-2xl font-black ${
              tournamentMode === "dko"
                ? "border-orange-300/25 bg-orange-500/[0.12] text-orange-100 hover:bg-orange-500/[0.16]"
                : "border-white/[0.08] bg-white/[0.025] text-white/50 hover:border-orange-300/15 hover:bg-white/[0.045] hover:text-white/80"
            }`}
          >
            DKO
          </Button>
          <Button
            type="button"
            onClick={() => onTournamentModeChange("round_robin")}
            variant="outline"
            className={`h-12 rounded-2xl font-black ${
              tournamentMode === "round_robin"
                ? "border-orange-300/25 bg-orange-500/[0.12] text-orange-100 hover:bg-orange-500/[0.16]"
                : "border-white/[0.08] bg-white/[0.025] text-white/50 hover:border-orange-300/15 hover:bg-white/[0.045] hover:text-white/80"
            }`}
          >
            Round Robin
          </Button>
          {tournamentMode === "round_robin" ? (
            <label className="flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4">
              <span className="text-sm font-bold text-white/60">Gruppen</span>
              <input
                type="number"
                min={1}
                max={8}
                value={rrGroupCount}
                onChange={(e) => onRrGroupCountChange(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
                className="w-16 bg-transparent text-center font-black text-white outline-none"
              />
            </label>
          ) : null}
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${tournamentMode === "dko" ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
        {tournamentMode === "dko" ? (
          <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 transition ${
            allowDoubleEntry
              ? "border-orange-300/25 bg-orange-500/[0.10]"
              : "border-white/[0.08] bg-white/[0.025] hover:border-orange-300/15 hover:bg-white/[0.045]"
          }`}>
            <Checkbox checked={allowDoubleEntry} onCheckedChange={(checked) => onAllowDoubleEntryChange(checked === true)} />
            <span className="text-sm font-semibold text-white/75">Doppelnennung erlauben</span>
          </label>
        ) : null}

        <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 transition ${
          doubleMode
            ? "border-orange-300/25 bg-orange-500/[0.10]"
            : "border-white/[0.08] bg-white/[0.025] hover:border-orange-300/15 hover:bg-white/[0.045]"
        }`}>
          <Checkbox checked={doubleMode} onCheckedChange={(checked) => onDoubleModeChange(checked === true)} />
          <span className="text-sm font-semibold text-white/75">Doppelturnier-Modus</span>
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3.5">
        {tournamentFormCompleted ? (
          <p className="flex items-center gap-2 font-semibold text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Setup vollständig – Spieler können registriert werden.
          </p>
        ) : (
          <p className="flex items-center gap-2 font-semibold text-orange-300">
            <AlertCircle className="h-4 w-4" />
            Bitte Turniername, Teilnahme und Startgeld vollständig festlegen.
          </p>
        )}
      </div>
    </section>
  )
}
