"use client"

import { Button } from "@/components/ui/button"
import { Check, Search, UserPlus, Users, Euro, X } from "lucide-react"
import {
  TournamentRegistrationPanel,
  type TournamentRegistrationAvailablePlayer,
  type TournamentRegistrationRegisteredPlayer,
} from "@/components/tournament-registration/tournament-registration-panel"

type Player = {
  id: number
  name: string
}

type PlayerWithFrequency = Player & {
  playCount: number
  lastPlayed: string | null
}

type RegisteredPlayer = {
  id: number
  player_id: string
  player_name: string
  registered_at: string
  paid: boolean
  entry_fee: number
  deducted_from_credit?: boolean | string
  payment_method?: string | null
}

type PlayerEligibility = {
  eligible: boolean
  reason: string
}

type Props = {
  seriesMode?: boolean
  loading: boolean
  playerViewMode: "frequent" | "all"
  onPlayerViewModeChange: (value: "frequent" | "all") => void
  availableFrequentPlayers: PlayerWithFrequency[]
  filteredPlayers: Player[]
  availablePlayers: Player[]
  selectedPlayers: Set<number>
  onPlayerSelect: (playerId: number) => void
  getPlayerEligibility: (playerId: number | string) => PlayerEligibility
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onOpenAddPlayer: () => void
  tournamentFormCompleted: boolean
  eligibilityLoading: boolean
  isRegisteringPlayers: boolean
  registrationProgress: { done: number; total: number } | null
  onRegisterPlayers: () => void
  onQuickAddPlayer?: (playerId: string) => void
  doubleMode: boolean
  doublePlayer1Id: string
  onDoublePlayer1Change: (value: string) => void
  doublePlayer2Id: string
  onDoublePlayer2Change: (value: string) => void
  onRegisterDoubleTeam: () => void
  buildDoubleTeamName: (playerName1: string, playerName2: string) => string
  registeredPlayers: RegisteredPlayer[]
  paidCount: number
  allPlayersPaid: boolean
  markingAllPaid: boolean
  onMarkAllPaid: () => void
  tournamentSize: number
  isPreRegistered: (player: RegisteredPlayer) => boolean
  onTogglePaymentStatus: (registrationId: number, currentPaid: boolean) => void
  onUnregisterPlayer: (registrationId: number) => void
}

export function EinzelturnierSpieler({
  seriesMode = false,
  loading,
  playerViewMode,
  onPlayerViewModeChange,
  availableFrequentPlayers,
  filteredPlayers,
  availablePlayers,
  selectedPlayers,
  onPlayerSelect,
  getPlayerEligibility,
  searchTerm,
  onSearchTermChange,
  onOpenAddPlayer,
  tournamentFormCompleted,
  eligibilityLoading,
  isRegisteringPlayers,
  registrationProgress,
  onRegisterPlayers,
  onQuickAddPlayer,
  doubleMode,
  doublePlayer1Id,
  onDoublePlayer1Change,
  doublePlayer2Id,
  onDoublePlayer2Change,
  onRegisterDoubleTeam,
  buildDoubleTeamName,
  registeredPlayers,
  paidCount,
  allPlayersPaid,
  markingAllPaid,
  onMarkAllPaid,
  tournamentSize,
  isPreRegistered,
  onTogglePaymentStatus,
  onUnregisterPlayer,
}: Props) {

  const frequentById = new Map(
    availableFrequentPlayers.map((player) => [String(player.id), player]),
  )

  const registeredPlayerIds = new Set(registeredPlayers.map((player) => String(player.player_id)))

  const sharedAvailablePlayers: TournamentRegistrationAvailablePlayer[] = availablePlayers
    .filter((player) => !registeredPlayerIds.has(String(player.id)))
    .map((player) => {
      const eligibility = getPlayerEligibility(player.id)
      const frequent = frequentById.get(String(player.id))
      return {
        id: String(player.id),
        name: player.name,
        eligible: eligibility.eligible,
        eligibilityReason: eligibility.reason,
        featured: Boolean(frequent),
        featuredMeta: frequent ? `${frequent.playCount}x gespielt` : undefined,
      }
    })

  const sharedRegisteredPlayers: TournamentRegistrationRegisteredPlayer[] = registeredPlayers.map((player) => ({
    id: String(player.id),
    name: player.player_name,
    paid: player.paid,
    paidLocked: player.deducted_from_credit === true || player.deducted_from_credit === "true",
    badge: isPreRegistered(player) ? "Voranmeldung" : undefined,
  }))

  const sharedSelectedIds = new Set(Array.from(selectedPlayers).map(String))

  // Serien-Spieltage behalten die DKO-Registrierungs- und Zahlungslogik,
  // verwenden aber die kompakte Bedienung der neueren Turnierverwaltung.
  if (seriesMode && !doubleMode) {
    const visible = sharedAvailablePlayers.filter((player) =>
      player.name.toLocaleLowerCase("de").includes(searchTerm.trim().toLocaleLowerCase("de")),
    )
    return (
      <section className="grid gap-5 xl:grid-cols-2 text-white">
        <div className="rounded-[26px] border border-white/10 bg-[#0b1018] p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.15em] text-orange-300/75">Anmeldung</div>
              <h2 className="mt-1 text-xl font-black">Teilnehmer &amp; Check-in</h2>
              <p className="mt-1 text-sm text-white/45">{registeredPlayers.length} angemeldet · {paidCount} bezahlt</p>
            </div>
            <Button type="button" onClick={onMarkAllPaid} disabled={markingAllPaid || registeredPlayers.length === 0 || allPlayersPaid} className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20">
              <Check className="mr-2 h-4 w-4" />Alle als bezahlt markieren
            </Button>
          </div>
          <div className="space-y-2">
            {registeredPlayers.length === 0 ? <p className="py-8 text-center text-sm text-white/40">Noch keine Anmeldungen für diesen Spieltag.</p> : registeredPlayers.map((player) => (
              <div key={player.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.025] p-3">
                <div className="min-w-0">
                  <p className="font-bold">{player.player_name}</p>
                  <p className="text-xs text-white/45">{isPreRegistered(player) ? "Voranmeldung" : "Angemeldet"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => onTogglePaymentStatus(player.id, player.paid)} disabled={player.deducted_from_credit === true || player.deducted_from_credit === "true"} className={`rounded-xl border px-3 py-2 text-xs font-bold ${player.paid ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-amber-500/25 bg-amber-500/10 text-amber-200"}`}>
                    <Euro className="mr-1 inline h-3.5 w-3.5" />{player.paid ? "Bezahlt" : "Zahlung offen"}
                  </button>
                  <button type="button" onClick={() => onUnregisterPlayer(player.id)} title="Abmelden" aria-label={`${player.player_name} abmelden`} className="rounded-xl border border-rose-500/20 px-3 py-2 text-rose-200 hover:bg-rose-500/10"><X className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[26px] border border-white/10 bg-[#0b1018] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Spieler hinzufügen</h2>
              <p className="mt-1 text-sm text-white/45">Auf Plus klicken – Spieler direkt anmelden</p>
            </div>
            <button type="button" onClick={onOpenAddPlayer} aria-label="Neuen Spieler anlegen" title="Neuen Spieler anlegen" className="rounded-xl border border-orange-500/25 bg-orange-500/10 p-3 text-orange-300 hover:bg-orange-500/20"><UserPlus className="h-5 w-5" /></button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input type="search" placeholder="Name suchen ..." value={searchTerm} onChange={(event) => onSearchTermChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-white outline-none focus:border-orange-400/50" />
          </div>
          <div className="max-h-[400px] space-y-2 overflow-y-auto">
            {loading ? <p className="py-8 text-center text-sm text-white/45">Spieler werden geladen …</p> : visible.length === 0 ? <p className="py-8 text-center text-sm text-white/45">Keine passenden Spieler gefunden</p> : visible.map((player) => {
              const selected = sharedSelectedIds.has(player.id)
              const eligible = player.eligible !== false
              return <button key={player.id} type="button" disabled={!eligible || isRegisteringPlayers} onClick={() => onQuickAddPlayer ? onQuickAddPlayer(player.id) : onPlayerSelect(Number(player.id))} aria-pressed={selected} className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition ${selected ? "border-orange-400 bg-orange-500/20" : "border-white/10 bg-white/[0.025] hover:border-orange-400/30"} ${eligible ? "" : "cursor-not-allowed opacity-40"}`}>
                <div className="min-w-0"><p className="font-bold">{player.name}</p><p className="mt-1 text-xs text-white/45">{eligible ? player.featuredMeta || "Spieler" : player.eligibilityReason || "Nicht berechtigt"}</p></div>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${selected ? "border-orange-400 bg-orange-500 text-white" : "border-orange-500/40 text-orange-400"}`}>{selected ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}</span>
              </button>
            })}
          </div>
          {!onQuickAddPlayer && <Button type="button" onClick={onRegisterPlayers} disabled={!tournamentFormCompleted || isRegisteringPlayers || selectedPlayers.size === 0 || eligibilityLoading} className="mt-4 w-full rounded-xl bg-orange-500 py-6 text-base font-black text-white hover:bg-orange-400 disabled:opacity-50">
            {isRegisteringPlayers ? `Registrierung läuft ${registrationProgress?.done ?? 0}/${registrationProgress?.total ?? 0}` : `Spieler registrieren (${selectedPlayers.size})`}
          </Button>}
        </div>
      </section>
    )
  }

  if (!doubleMode) {
    return (
      <TournamentRegistrationPanel
        availablePlayers={sharedAvailablePlayers}
        registeredPlayers={sharedRegisteredPlayers}
        selectedIds={sharedSelectedIds}
        onToggleSelected={(id) => onPlayerSelect(Number(id))}
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        loading={loading}
        eligibilityLoading={eligibilityLoading}
        canRegister={tournamentFormCompleted}
        disabledNotice={
          tournamentFormCompleted
            ? null
            : "Bitte zuerst oben die Turniereinstellungen vollständig festlegen."
        }
        onRegister={onRegisterPlayers}
        isRegistering={isRegisteringPlayers}
        registrationProgress={registrationProgress}
        onAddPlayer={onOpenAddPlayer}
        showEligibilityFilters={true}
        showFeaturedTabs={true}
        showPaid={true}
        paidCount={paidCount}
        onTogglePaid={(id, paid) => onTogglePaymentStatus(Number(id), paid)}
        onMarkAllPaid={onMarkAllPaid}
        markingAllPaid={markingAllPaid}
        registeredLimit={tournamentSize}
        onRemove={(id) => onUnregisterPlayer(Number(id))}
      />
    )
  }

  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <section className="emd-admin-surface p-5 text-white sm:p-6">
        <div className="mb-5">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/60">Doppelturnier</div>
          <h2 className="mt-1 text-2xl font-black text-white">Doppelteam registrieren</h2>
          <p className="mt-1 text-sm font-semibold text-white/40">Zwei berechtigte Spieler auswählen und als Team anmelden.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white/60">Spieler 1</label>
            <select
              value={doublePlayer1Id}
              onChange={(e) => onDoublePlayer1Change(e.target.value)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-[#101318] px-4 font-semibold text-white outline-none transition focus:border-orange-400/45 focus:ring-4 focus:ring-orange-500/10"
            >
              <option value="">Bitte wählen</option>
              {availablePlayers.map((player) => {
                const eligibility = getPlayerEligibility(player.id)
                return (
                  <option key={player.id} value={player.id} disabled={!eligibility.eligible}>
                    {player.name}{eligibility.eligible ? "" : ` — ${eligibility.reason}`}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/60">Spieler 2</label>
            <select
              value={doublePlayer2Id}
              onChange={(e) => onDoublePlayer2Change(e.target.value)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-[#101318] px-4 font-semibold text-white outline-none transition focus:border-orange-400/45 focus:ring-4 focus:ring-orange-500/10"
            >
              <option value="">Bitte wählen</option>
              {availablePlayers
                .filter((player) => String(player.id) !== doublePlayer1Id)
                .map((player) => {
                  const eligibility = getPlayerEligibility(player.id)
                  return (
                    <option key={player.id} value={player.id} disabled={!eligibility.eligible}>
                      {player.name}{eligibility.eligible ? "" : ` — ${eligibility.reason}`}
                    </option>
                  )
                })}
            </select>
          </div>
        </div>

        {doublePlayer1Id && doublePlayer2Id ? (
          <div className="mt-4 rounded-2xl border border-orange-300/[0.18] bg-orange-500/[0.07] px-4 py-3 text-sm font-black text-orange-200">
            Teamname:{" "}
            {(() => {
              const p1 = availablePlayers.find((player) => String(player.id) === doublePlayer1Id)
              const p2 = availablePlayers.find((player) => String(player.id) === doublePlayer2Id)
              if (!p1 || !p2) return "-"
              const sortedNames = [p1.name, p2.name].sort((a, b) => a.localeCompare(b, "de"))
              return buildDoubleTeamName(sortedNames[0], sortedNames[1])
            })()}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onRegisterDoubleTeam}
          disabled={!doublePlayer1Id || !doublePlayer2Id || !tournamentFormCompleted || eligibilityLoading || isRegisteringPlayers}
          className={`mt-4 w-full rounded-xl px-6 py-3 font-bold transition-all ${
            doublePlayer1Id && doublePlayer2Id && tournamentFormCompleted && !eligibilityLoading && !isRegisteringPlayers
              ? "border border-orange-300/25 bg-orange-500 text-white hover:bg-orange-400"
              : "cursor-not-allowed border border-white/[0.06] bg-white/[0.04] text-white/25"
          }`}
        >
          {isRegisteringPlayers ? "Registrierung läuft…" : "Doppelteam registrieren"}
        </button>
      </section>

      <TournamentRegistrationPanel
        availablePlayers={[]}
        registeredPlayers={sharedRegisteredPlayers}
        selectedIds={new Set<string>()}
        onToggleSelected={() => undefined}
        searchTerm=""
        onSearchTermChange={() => undefined}
        canRegister={false}
        onRegister={() => undefined}
        showAvailablePanel={false}
        showRegisteredPanel={true}
        showPaid={true}
        paidCount={paidCount}
        onTogglePaid={(id, paid) => onTogglePaymentStatus(Number(id), paid)}
        onMarkAllPaid={onMarkAllPaid}
        markingAllPaid={markingAllPaid}
        registeredLimit={tournamentSize}
        onRemove={(id) => onUnregisterPlayer(Number(id))}
      />
    </section>
  )
}
