"use client"

import { Button } from "@/components/ui/button"
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
