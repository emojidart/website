"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Lock, PlusCircle, Search, Star, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type TournamentRegistrationAvailablePlayer = {
  id: string
  name: string
  meta?: string
  secondaryMeta?: string
  eligible?: boolean
  eligibilityReason?: string
  featured?: boolean
  featuredMeta?: string
}

export type TournamentRegistrationRegisteredPlayer = {
  id: string
  name: string
  subtitle?: string
  paid?: boolean
  paidLocked?: boolean
  badge?: string
}

type Props = {
  availablePlayers: TournamentRegistrationAvailablePlayer[]
  registeredPlayers: TournamentRegistrationRegisteredPlayer[]
  selectedIds: Set<string>
  onToggleSelected: (id: string) => void

  searchTerm: string
  onSearchTermChange: (value: string) => void

  loading?: boolean
  eligibilityLoading?: boolean
  canRegister?: boolean
  disabledNotice?: string | null

  onRegister: () => void | Promise<void>
  isRegistering?: boolean
  registrationProgress?: { done: number; total: number } | null

  onAddPlayer?: () => void
  addPlayerLabel?: string

  showEligibilityFilters?: boolean
  showFeaturedTabs?: boolean

  showPaid?: boolean
  paidCount?: number
  onTogglePaid?: (id: string, paid: boolean) => void
  onMarkAllPaid?: () => void | Promise<void>
  markingAllPaid?: boolean

  registeredLimit?: number
  onRemove?: (id: string) => void | Promise<void>
  onClearAll?: () => void | Promise<void>
  clearAllLabel?: string

  availableTitle?: string
  registeredTitle?: string
  registeredSubtitle?: string
  emptyRegisteredText?: string
  showAvailablePanel?: boolean
  showRegisteredPanel?: boolean
}

export function TournamentRegistrationPanel({
  availablePlayers,
  registeredPlayers,
  selectedIds,
  onToggleSelected,
  searchTerm,
  onSearchTermChange,
  loading = false,
  eligibilityLoading = false,
  canRegister = true,
  disabledNotice = null,
  onRegister,
  isRegistering = false,
  registrationProgress = null,
  onAddPlayer,
  addPlayerLabel = "Neuer Spieler",
  showEligibilityFilters = true,
  showFeaturedTabs = false,
  showPaid = false,
  paidCount = 0,
  onTogglePaid,
  onMarkAllPaid,
  markingAllPaid = false,
  registeredLimit,
  onRemove,
  onClearAll,
  clearAllLabel = "Alle Registrierungen löschen",
  availableTitle = "Spieler hinzufügen",
  registeredTitle = "Registrierte Spieler",
  registeredSubtitle,
  emptyRegisteredText = "Noch keine Spieler registriert",
  showAvailablePanel = true,
  showRegisteredPanel = true,
}: Props) {
  const [eligibilityFilter, setEligibilityFilter] = useState<"all" | "eligible" | "locked">("all")
  const [sourceMode, setSourceMode] = useState<"featured" | "all">(showFeaturedTabs ? "featured" : "all")
  const [registeredSearch, setRegisteredSearch] = useState("")

  const eligible = (player: TournamentRegistrationAvailablePlayer) => player.eligible !== false

  const searchedPlayers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return availablePlayers.filter((player) => {
      if (showFeaturedTabs && sourceMode === "featured" && !player.featured) return false
      if (q && !`${player.name} ${player.meta || ""} ${player.secondaryMeta || ""}`.toLowerCase().includes(q)) return false
      if (eligibilityFilter === "eligible" && !eligible(player)) return false
      if (eligibilityFilter === "locked" && eligible(player)) return false
      return true
    })
  }, [availablePlayers, searchTerm, eligibilityFilter, sourceMode, showFeaturedTabs])

  const eligibleVisiblePlayers = searchedPlayers.filter(eligible)

  const filteredRegisteredPlayers = useMemo(() => {
    const q = registeredSearch.trim().toLowerCase()
    if (!q) return registeredPlayers
    return registeredPlayers.filter((player) =>
      `${player.name} ${player.subtitle || ""} ${player.badge || ""}`.toLowerCase().includes(q),
    )
  }, [registeredPlayers, registeredSearch])

  const selectAllEligibleVisible = () => {
    eligibleVisiblePlayers.forEach((player) => {
      if (!selectedIds.has(player.id)) onToggleSelected(player.id)
    })
  }

  const allPaid = showPaid && registeredPlayers.length > 0 && paidCount >= registeredPlayers.length

  return (
    <div className={`grid gap-6 ${showAvailablePanel && showRegisteredPanel ? "xl:grid-cols-2" : "grid-cols-1"}`}>
      {showAvailablePanel ? (
      <section className="emd-admin-surface p-5 text-white sm:p-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-black text-white">{availableTitle}</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white/40">{availablePlayers.length} Spieler</span>
            {onAddPlayer ? (
              <Button
                type="button"
                onClick={onAddPlayer}
                variant="outline"
                className="rounded-xl border-white/[0.08] bg-white/[0.025] text-white/65 hover:border-orange-300/15 hover:bg-white/[0.045] hover:text-white"
              >
                <PlusCircle className="mr-2 h-4 w-4 text-orange-300" />
                {addPlayerLabel}
              </Button>
            ) : null}
          </div>
        </div>

        {showFeaturedTabs ? (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSourceMode("featured")}
              className={`rounded-xl px-4 py-2.5 font-black transition ${
                sourceMode === "featured"
                  ? "bg-orange-500 text-white"
                  : "border border-white/[0.08] bg-white/[0.025] text-white/45 hover:bg-white/[0.045] hover:text-white/75"
              }`}
            >
              <span className="flex items-center justify-center gap-2"><Star className="h-4 w-4" />Häufig verwendet</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceMode("all")}
              className={`rounded-xl px-4 py-2.5 font-black transition ${
                sourceMode === "all"
                  ? "bg-orange-500 text-white"
                  : "border border-white/[0.08] bg-white/[0.025] text-white/45 hover:bg-white/[0.045] hover:text-white/75"
              }`}
            >
              Alle Spieler
            </button>
          </div>
        ) : null}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Spieler suchen..."
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            className="emd-admin-input pl-10"
          />
        </div>

        {showEligibilityFilters ? (
          <>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                { value: "all" as const, label: "Alle" },
                { value: "eligible" as const, label: "Berechtigt" },
                { value: "locked" as const, label: "Gesperrt" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEligibilityFilter(option.value)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-black transition ${
                    eligibilityFilter === option.value
                      ? "border-orange-300/25 bg-orange-500/[0.12] text-orange-100"
                      : "border-white/[0.08] bg-white/[0.025] text-white/45 hover:border-orange-300/15 hover:bg-white/[0.045] hover:text-white/75"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mb-4 flex justify-end">
              <Button
                type="button"
                onClick={selectAllEligibleVisible}
                disabled={!canRegister || eligibilityLoading || eligibleVisiblePlayers.length === 0}
                variant="outline"
                className="rounded-xl border-white/[0.08] bg-white/[0.025] font-black text-white/60 hover:border-orange-300/15 hover:bg-white/[0.045] hover:text-white"
              >
                <CheckCircle2 className="mr-2 h-4 w-4 text-orange-300" />
                Berechtigte auswählen ({eligibleVisiblePlayers.length})
              </Button>
            </div>
          </>
        ) : null}

        {disabledNotice ? (
          <div className="mb-4 rounded-xl border border-orange-300/20 bg-orange-500/[0.08] px-4 py-3 text-sm font-bold text-orange-100">
            {disabledNotice}
          </div>
        ) : null}

        <div className="emd-admin-inset mb-4 h-[390px] overflow-y-auto p-2">
          {loading ? (
            <p className="py-8 text-center text-white/35">Lade Spieler...</p>
          ) : searchedPlayers.length === 0 ? (
            <p className="py-8 text-center text-white/35">Keine Spieler gefunden</p>
          ) : (
            <div className="space-y-2">
              {searchedPlayers.map((player) => {
                const playerEligible = eligible(player)
                const selected = selectedIds.has(player.id)
                return (
                  <div
                    key={player.id}
                    role="button"
                    tabIndex={playerEligible ? 0 : -1}
                    onClick={() => playerEligible && onToggleSelected(player.id)}
                    onKeyDown={(event) => {
                      if (playerEligible && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault()
                        onToggleSelected(player.id)
                      }
                    }}
                    className={`rounded-2xl border p-3 transition ${
                      !playerEligible
                        ? "cursor-not-allowed border-white/[0.07] bg-white/[0.018] opacity-45"
                        : selected
                          ? "cursor-pointer border-orange-300/30 bg-orange-500/[0.10]"
                          : "cursor-pointer border-white/[0.08] bg-white/[0.025] hover:border-orange-300/15 hover:bg-white/[0.045]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selected}
                        disabled={!playerEligible}
                        className="shrink-0"
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={() => playerEligible && onToggleSelected(player.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-white/85">{player.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/40">
                          {player.featuredMeta && showFeaturedTabs && sourceMode === "featured" ? <span>{player.featuredMeta}</span> : null}
                          {player.meta ? <span>{player.meta}</span> : null}
                          {player.secondaryMeta ? <span>{player.secondaryMeta}</span> : null}
                          {!playerEligible ? (
                            <span className="inline-flex items-center gap-1 font-semibold">
                              <Lock className="h-3 w-3" />
                              {player.eligibilityReason || "Nicht teilnahmeberechtigt"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {player.featured && showFeaturedTabs && sourceMode === "featured" ? (
                        <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                      ) : !playerEligible ? (
                        <Lock className="h-4 w-4 shrink-0 text-white/30" />
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRegister}
          disabled={selectedIds.size === 0 || !canRegister || eligibilityLoading || isRegistering}
          className={`w-full rounded-xl px-6 py-3 font-bold transition-all ${
            selectedIds.size > 0 && canRegister && !eligibilityLoading && !isRegistering
              ? "border border-orange-300/25 bg-orange-500 text-white shadow-[0_0_28px_rgba(249,115,22,.12)] hover:bg-orange-400"
              : "cursor-not-allowed border border-white/[0.06] bg-orange-900/70 text-white/30"
          }`}
        >
          {isRegistering ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {registrationProgress?.total
                ? `Registriere… ${registrationProgress.done}/${registrationProgress.total}`
                : "Registrierung läuft…"}
            </span>
          ) : (
            `Spieler registrieren (${selectedIds.size})`
          )}
        </button>
      </section>
      ) : null}

      {showRegisteredPanel ? (
      <section className="emd-admin-surface p-5 text-white sm:p-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">{registeredTitle}</h2>
            {registeredSubtitle ? <p className="mt-1 text-sm font-semibold text-white/40">{registeredSubtitle}</p> : null}
            {showPaid ? <p className="mt-1 text-sm font-semibold text-white/40">{paidCount} von {registeredPlayers.length} bezahlt</p> : null}
          </div>

          <div className="flex items-center gap-2">
            {showPaid && registeredPlayers.length > 0 && !allPaid && onMarkAllPaid ? (
              <Button
                type="button"
                onClick={onMarkAllPaid}
                disabled={markingAllPaid}
                variant="outline"
                className="rounded-xl border border-emerald-300/20 bg-emerald-500/[0.08] font-black text-emerald-200 hover:bg-emerald-500/[0.13]"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {markingAllPaid ? "Wird aktualisiert…" : "Alle als bezahlt markieren"}
              </Button>
            ) : null}

            <span className="rounded-xl border border-orange-300/15 bg-orange-500/[0.07] px-3 py-1.5 text-xs font-black text-orange-200">
              {registeredPlayers.length}{typeof registeredLimit === "number" ? ` / ${registeredLimit}` : ""}
            </span>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Registrierte Spieler suchen..."
            value={registeredSearch}
            onChange={(event) => setRegisteredSearch(event.target.value)}
            className="emd-admin-input pl-10"
          />
        </div>

        {registeredPlayers.length === 0 ? (
          <div className="emd-admin-inset flex h-[390px] items-center justify-center p-6 text-center">
            <p className="text-sm font-semibold text-white/35">{emptyRegisteredText}</p>
          </div>
        ) : (
          <div className="h-[390px] overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.015]">
            <Table>
              <TableHeader>
                <TableRow className="bg-white/[0.03] hover:bg-white/[0.03]">
                  <TableHead className="text-white/40">Name</TableHead>
                  {showPaid ? <TableHead className="text-center text-white/40">Bezahlt</TableHead> : null}
                  <TableHead className="w-14 text-right text-white/40"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegisteredPlayers.map((player) => (
                  <TableRow key={player.id} className="border-white/[0.07] hover:bg-white/[0.025]">
                    <TableCell className="font-semibold text-white/85">
                      <div className="flex items-center gap-2">
                        {player.badge ? (
                          <span className="rounded-lg border border-sky-300/15 bg-sky-500/[0.08] px-2 py-1 text-[10px] font-bold text-sky-200">
                            {player.badge}
                          </span>
                        ) : null}
                        <div>
                          <div>{player.name}</div>
                          {player.subtitle ? <div className="mt-0.5 text-xs font-medium text-white/35">{player.subtitle}</div> : null}
                        </div>
                      </div>
                    </TableCell>

                    {showPaid ? (
                      <TableCell className="text-center">
                        <Checkbox
                          checked={Boolean(player.paid)}
                          onCheckedChange={() => onTogglePaid?.(player.id, Boolean(player.paid))}
                          disabled={player.paidLocked}
                          className={player.paidLocked ? "cursor-not-allowed opacity-50" : ""}
                        />
                      </TableCell>
                    ) : null}

                    <TableCell className="text-right">
                      {onRemove ? (
                        <button
                          type="button"
                          onClick={() => onRemove(player.id)}
                          className="rounded-lg p-2 text-white/30 transition hover:bg-rose-500/[0.10] hover:text-rose-300"
                          title="Registrierung entfernen"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {registeredPlayers.length > 0 && onClearAll ? (
          <Button
            type="button"
            onClick={onClearAll}
            variant="outline"
            className="mt-4 h-12 w-full rounded-xl border border-rose-300/20 bg-rose-500/[0.08] font-black text-rose-200 hover:bg-rose-500/[0.14]"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {clearAllLabel}
          </Button>
        ) : null}
      </section>
      ) : null}
    </div>
  )
}
