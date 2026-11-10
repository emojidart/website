"use client"

import { AlertCircle, ArrowRight, Euro, Play, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type ActiveTournament = {
  tournamentId: string
  tournamentName: string
  tournamentType: string
  accessType?: string | null
  incompleteMatches: number
} | null

type Props = {
  activeTournament: ActiveTournament
  showCancelDialog: boolean
  onOpenCancelDialog: () => void
  onCloseCancelDialog: () => void
  onCancelActiveTournament: () => void
  onContinueTournament: () => void
  registeredCount: number
  tournamentMode: "dko" | "round_robin"
  tournamentSize: number
  rrGroupCount: number
  accessLabel: string
  paidCount: number
  allPlayersPaid: boolean
  markingAllPaid: boolean
  onMarkAllPaid: () => void
  startingTournament: boolean
  canStart: boolean
  onStartTournament: () => void
}

export function EinzelturnierStart(props: Props) {
  const {
    activeTournament,
    showCancelDialog,
    onOpenCancelDialog,
    onCloseCancelDialog,
    onCancelActiveTournament,
    onContinueTournament,
    registeredCount,
    tournamentMode,
    tournamentSize,
    rrGroupCount,
    accessLabel,
    paidCount,
    allPlayersPaid,
    markingAllPaid,
    onMarkAllPaid,
    startingTournament,
    canStart,
    onStartTournament,
  } = props

  return (
    <>
      {showCancelDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[20px] border border-white/10 bg-card p-6 text-white shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-300" />
              </div>
              <h3 className="text-xl font-black">Turnier wirklich abbrechen?</h3>
            </div>
            <p className="mb-4 text-muted-foreground">Alle Daten des aktiven Turniers werden gelöscht:</p>
            <ul className="mb-6 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Match-Stati und Ergebnisse</li>
              <li>Freilose</li>
              <li>Ranglisten-Einträge</li>
              <li>Spieler-Registrierungen</li>
            </ul>
            <p className="mb-6 text-sm font-semibold text-red-300">Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div className="flex gap-3">
              <Button onClick={onCloseCancelDialog} variant="outline" className="flex-1 border-white/[0.10] bg-white/[0.025] text-white/70 hover:border-orange-300/15 hover:bg-white/[0.05] hover:text-white">
                Zurück
              </Button>
              <Button onClick={onCancelActiveTournament} className="flex-1 border border-red-300/20 bg-red-500/[0.10] font-black text-red-200 hover:bg-red-500/[0.16] hover:text-red-100">
                Turnier abbrechen
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {activeTournament ? (
        <section className="mb-6 rounded-[20px] border border-orange-300/[0.18] bg-[linear-gradient(135deg,rgba(14,165,233,.10),rgba(8,10,14,.82)_52%,rgba(249,115,22,.06))] p-5 text-white shadow-sm backdrop-blur-2xl sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-orange-300/20 bg-orange-400/10">
              <AlertCircle className="h-6 w-6 text-orange-300" />
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-xl font-black">Aktives Turnier gefunden</h3>
              <p className="text-muted-foreground">Es gibt ein laufendes Turnier.</p>
              <p className="text-sm text-muted-foreground">Du kannst zurückkehren oder das Turnier abbrechen.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button onClick={onContinueTournament} className="flex items-center gap-2 rounded-xl border border-orange-300/25 bg-orange-500/15 px-4 font-black text-orange-100 hover:bg-orange-500/22">
              <ArrowRight className="h-4 w-4" />
              Zum Turnier zurückkehren
            </Button>
            <Button onClick={onOpenCancelDialog} variant="outline" className="rounded-xl border border-red-300/25 bg-red-500/8 font-black text-red-300 hover:bg-red-500/15">
              <X className="mr-2 h-4 w-4" />
              Turnier abbrechen
            </Button>
          </div>
        </section>
      ) : null}

      {!activeTournament && registeredCount > 0 ? (
        <section className="relative mb-6 overflow-hidden rounded-[20px] border border-orange-300/[0.22] bg-[linear-gradient(135deg,rgba(249,115,22,.10),rgba(12,14,18,.92)_34%,rgba(7,9,13,.90))] p-5 text-white shadow-[0_34px_110px_-66px_rgba(249,115,22,.40)] backdrop-blur-2xl sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-orange-500/[0.12] blur-[80px]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-300/[0.16] bg-orange-500/[0.08] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-orange-200">
                <Play className="h-3.5 w-3.5" />
                Startbereit
              </div>
              <h3 className="text-xl font-black tracking-tight text-white sm:text-2xl">Turnier bereit zum Starten</h3>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                {registeredCount} Spieler registriert ·{" "}
                {tournamentMode === "dko" ? `${tournamentSize}er DKO Turnier` : `Round Robin (${rrGroupCount} Gruppen)`}
              </p>
              <div className="mt-1 text-sm font-bold text-white/65">
                Teilnahme: <span className="text-orange-200">{accessLabel}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Euro className="h-5 w-5 text-muted-foreground" />
                <span className={`font-black ${allPlayersPaid ? "text-emerald-300" : "text-amber-300"}`}>
                  {paidCount} von {registeredCount} bezahlt
                </span>
                {!allPlayersPaid ? (
                  <button
                    type="button"
                    onClick={onMarkAllPaid}
                    disabled={markingAllPaid}
                    className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-200 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {markingAllPaid ? "Aktualisiere…" : "Alle bezahlt"}
                  </button>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onStartTournament}
              disabled={!allPlayersPaid || startingTournament || !canStart}
              className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-6 py-3 text-sm font-black transition lg:w-auto ${
                allPlayersPaid && !startingTournament && canStart
                  ? "border-orange-300/30 bg-primary text-primary-foreground shadow-[0_0_34px_rgba(249,115,22,.16)] hover:bg-orange-400"
                  : "cursor-not-allowed border-white/10 bg-card text-muted-foreground"
              }`}
            >
              <Play className="h-5 w-5" />
              {startingTournament ? "Turnier wird gestartet …" : "Turnier starten"}
            </button>
          </div>
        </section>
      ) : null}
    </>
  )
}
