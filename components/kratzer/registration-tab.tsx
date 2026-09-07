"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  PlusCircle,
  Trash2,
  Loader2,
  Search,
  CheckCircle2,
  Lock,
  Globe2,
  Home,
  MapPin,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { SpieldatenbankEntry } from "@/types/tournament"
import { getKratzerPlayerEligibility } from "@/actions/tournament"

type TournamentAccessType = "" | "public" | "club_internal" | "club_external"

type PlayerEligibility = {
  eligible: boolean
  reason: string
}

interface RegistrationTabProps {
  currentUser: any
  tournamentAccessType: TournamentAccessType
  setTournamentAccessType: React.Dispatch<React.SetStateAction<TournamentAccessType>>
  registeredPlayers: SpieldatenbankEntry[]
  selectedPlayersForRegistration: SpieldatenbankEntry[]
  setSelectedPlayersForRegistration: React.Dispatch<React.SetStateAction<SpieldatenbankEntry[]>>
  handleRegisterPlayers: () => Promise<void>
  handleClearRegisteredPlayers: () => Promise<void>
  handleUpdatePlayerPaidStatus: (playerId: string, paid: boolean) => Promise<void>
  handleMarkAllPlayersPaid: () => Promise<void>
  isRegisteringPlayers: boolean
  loading: boolean
}

export function RegistrationTab({
  currentUser,
  tournamentAccessType,
  setTournamentAccessType,
  registeredPlayers,
  selectedPlayersForRegistration,
  setSelectedPlayersForRegistration,
  handleRegisterPlayers,
  handleClearRegisteredPlayers,
  handleUpdatePlayerPaidStatus,
  handleMarkAllPlayersPaid,
  isRegisteringPlayers,
  loading,
}: RegistrationTabProps) {
  const { toast } = useToast()

  const [availablePlayers, setAvailablePlayers] = useState<SpieldatenbankEntry[]>([])
  const [filterText, setFilterText] = useState("")
  const [fetchingAvailablePlayers, setFetchingAvailablePlayers] = useState(true)
  const [eligibilityLoading, setEligibilityLoading] = useState(false)
  const [eligibilityByPlayerId, setEligibilityByPlayerId] = useState<Record<string, PlayerEligibility>>({})
  const [eligibilityFilter, setEligibilityFilter] = useState<"all" | "eligible" | "locked">("all")
  const [registeredSearch, setRegisteredSearch] = useState("")

  const fetchAvailablePlayers = useCallback(async () => {
    setFetchingAvailablePlayers(true)

    try {
      const { data, error } = await supabase
        .from("spieldatenbank")
        .select("id, name, ligastatus, geschlecht, verein")
        .order("name", { ascending: true })

      if (error) throw error
      setAvailablePlayers(data || [])
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: `Fehler beim Laden der Spieler: ${err.message}`,
      })
    } finally {
      setFetchingAvailablePlayers(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAvailablePlayers()
  }, [fetchAvailablePlayers])

  useEffect(() => {
    const loadEligibility = async () => {
      if (!tournamentAccessType || tournamentAccessType === "public" || availablePlayers.length === 0) {
        setEligibilityByPlayerId({})
        setEligibilityLoading(false)
        return
      }

      try {
        setEligibilityLoading(true)
        const result = await getKratzerPlayerEligibility(
          availablePlayers.map((player) => player.id),
          tournamentAccessType,
        )

        if (!result.success) throw new Error(result.message)
        setEligibilityByPlayerId(result.data || {})
      } catch (err: any) {
        const reason = `Prüfung fehlgeschlagen: ${err?.message || "Unbekannter Fehler"}`
        toast({
          variant: "destructive",
          description: `Berechtigungen konnten nicht geladen werden: ${err?.message || "Unbekannter Fehler"}`,
        })

        setEligibilityByPlayerId(
          Object.fromEntries(
            availablePlayers.map((player) => [
              String(player.id),
              { eligible: false, reason },
            ]),
          ),
        )
      } finally {
        setEligibilityLoading(false)
      }
    }

    void loadEligibility()
  }, [availablePlayers, tournamentAccessType, toast])

  useEffect(() => {
    setSelectedPlayersForRegistration([])
  }, [tournamentAccessType, setSelectedPlayersForRegistration])

  const getEligibility = (player: SpieldatenbankEntry): PlayerEligibility => {
    if (!tournamentAccessType) {
      return { eligible: false, reason: "Zuerst Turnierart auswählen" }
    }

    if (tournamentAccessType === "public") {
      return { eligible: true, reason: "" }
    }

    return (
      eligibilityByPlayerId[String(player.id)] || {
        eligible: false,
        reason: eligibilityLoading ? "Berechtigung wird geprüft…" : "Nicht teilnahmeberechtigt",
      }
    )
  }

  const baseFilteredAvailablePlayers = availablePlayers.filter(
    (player) =>
      player.name.toLowerCase().includes(filterText.toLowerCase()) &&
      !registeredPlayers.some((regPlayer) => regPlayer.id === player.id),
  )

  const filteredAvailablePlayers = baseFilteredAvailablePlayers.filter((player) => {
    const eligibility = getEligibility(player)

    if (eligibilityFilter === "eligible") return eligibility.eligible
    if (eligibilityFilter === "locked") return !eligibility.eligible
    return true
  })

  const eligibleVisiblePlayers = filteredAvailablePlayers.filter(
    (player) => getEligibility(player).eligible,
  )

  const allEligibleVisibleSelected =
    eligibleVisiblePlayers.length > 0 &&
    eligibleVisiblePlayers.every((player) =>
      selectedPlayersForRegistration.some((selected) => selected.id === player.id),
    )

  const handleToggleAllEligibleVisible = () => {
    if (eligibleVisiblePlayers.length === 0) return

    setSelectedPlayersForRegistration((previous) => {
      const visibleIds = new Set(eligibleVisiblePlayers.map((player) => String(player.id)))

      if (allEligibleVisibleSelected) {
        return previous.filter((player) => !visibleIds.has(String(player.id)))
      }

      const existingIds = new Set(previous.map((player) => String(player.id)))
      const additions = eligibleVisiblePlayers.filter(
        (player) => !existingIds.has(String(player.id)),
      )

      return [...previous, ...additions]
    })
  }

  const filteredRegisteredPlayers = registeredPlayers.filter((player) =>
    player.name.toLowerCase().includes(registeredSearch.trim().toLowerCase()),
  )

  const handleSelectPlayer = (player: SpieldatenbankEntry) => {
    const eligibility = getEligibility(player)
    if (!eligibility.eligible) return

    setSelectedPlayersForRegistration((prev) =>
      prev.some((p) => p.id === player.id) ? prev.filter((p) => p.id !== player.id) : [...prev, player],
    )
  }

  const isPlayerSelected = (player: SpieldatenbankEntry) =>
    selectedPlayersForRegistration.some((p) => p.id === player.id)

  const paidPlayersCount = registeredPlayers.filter((player) => player.paid).length
  const unpaidPlayersCount = registeredPlayers.length - paidPlayersCount

  const handleRegisterAndResetSearch = async () => {
    await handleRegisterPlayers()
    setFilterText("")
  }

  return (
    <div className="space-y-6">
      {/* Teilnahme */}
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_70px_-52px_rgba(15,23,42,0.7)]">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-950 to-[#24150f] px-5 py-5 text-white sm:px-6 lg:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-300">
                Teilnahme
              </div>
              <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                Wer darf mitspielen?
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Wähle die passende Teilnahmeart für dieses Turnier.
              </p>
            </div>

            {tournamentAccessType ? (
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-slate-100">
                <CheckCircle2 className="h-4 w-4 text-orange-300" />
                Teilnahmeart gewählt
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5 lg:p-6">
          {[
            {
              value: "public" as const,
              title: "Öffentlich",
              description: "Alle Spieler",
              icon: Globe2,
            },
            {
              value: "club_internal" as const,
              title: "Vereinsintern",
              description: "Nur interne Mitglieder",
              icon: Home,
            },
            {
              value: "club_external" as const,
              title: "Vereins-Auswärts",
              description: "Nur berechtigte Mitglieder",
              icon: MapPin,
            },
          ].map((option) => {
            const Icon = option.icon
            const active = tournamentAccessType === option.value
            const lockedByRegistrations = registeredPlayers.length > 0 && !active

            return (
              <button
                key={option.value}
                type="button"
                disabled={lockedByRegistrations}
                onClick={() => setTournamentAccessType(option.value)}
                className={`group relative min-h-[112px] rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? "border-orange-300 bg-orange-50 shadow-sm ring-1 ring-orange-100"
                    : lockedByRegistrations
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"
                      : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                      active ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>

                  {active ? (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  ) : lockedByRegistrations ? (
                    <Lock className="h-4 w-4 text-slate-400" />
                  ) : null}
                </div>

                <div className="mt-4 font-black text-slate-950">{option.title}</div>
                <div className="mt-1 text-sm font-medium text-slate-500">{option.description}</div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Registrierung */}
      <div className="grid gap-6 2xl:grid-cols-2">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_70px_-52px_rgba(15,23,42,0.7)]">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
                Spielerauswahl
              </div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                Spieler hinzufügen
              </h2>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600">
              {filteredAvailablePlayers.length} verfügbar
            </span>
          </div>

          <div className="p-4 sm:p-5 lg:p-6">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Spieler suchen..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="h-12 rounded-2xl border-slate-200 bg-slate-50/70 pl-10 text-base shadow-none focus-visible:ring-orange-500"
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="inline-grid grid-cols-3 rounded-2xl border border-slate-200 bg-slate-100 p-1">
                {[
                  { value: "all" as const, label: "Alle" },
                  { value: "eligible" as const, label: "Berechtigt" },
                  { value: "locked" as const, label: "Gesperrt" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEligibilityFilter(option.value)}
                    className={`h-9 rounded-xl px-3 text-xs font-black transition ${
                      eligibilityFilter === option.value
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleAllEligibleVisible}
                disabled={!tournamentAccessType || eligibilityLoading || eligibleVisiblePlayers.length === 0}
                className="h-10 rounded-xl border-slate-200 bg-white px-3 font-bold text-slate-700 hover:border-orange-200 hover:bg-orange-50"
              >
                <CheckCircle2 className="mr-2 h-4 w-4 text-orange-600" />
                {allEligibleVisibleSelected
                  ? "Auswahl aufheben"
                  : `Berechtigte auswählen (${eligibleVisiblePlayers.length})`}
              </Button>
            </div>

            {!tournamentAccessType ? (
              <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800">
                Bitte zuerst oben die Teilnahmeart auswählen.
              </div>
            ) : null}

            <div className="mt-4 h-[430px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5">
              {fetchingAvailablePlayers ? (
                <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-orange-500" />
                  Spieler werden geladen...
                </div>
              ) : filteredAvailablePlayers.length === 0 ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-slate-500">
                  Keine passenden Spieler gefunden.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAvailablePlayers.map((player) => {
                    const selected = isPlayerSelected(player)
                    const eligibility = getEligibility(player)

                    return (
                      <div
                        key={player.id}
                        role="button"
                        tabIndex={eligibility.eligible ? 0 : -1}
                        aria-disabled={!eligibility.eligible}
                        onClick={() => {
                          if (!eligibility.eligible) return
                          handleSelectPlayer(player)
                        }}
                        onKeyDown={(e) => {
                          if (!eligibility.eligible) return
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            handleSelectPlayer(player)
                          }
                        }}
                        className={`w-full rounded-2xl border p-3.5 text-left transition-all ${
                          !eligibility.eligible
                            ? "cursor-not-allowed border-slate-200 bg-slate-100/80 opacity-70"
                            : selected
                              ? "cursor-pointer border-orange-300 bg-orange-50 shadow-sm ring-1 ring-orange-100"
                              : "cursor-pointer border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selected}
                            disabled={!eligibility.eligible}
                            className="shrink-0 border-slate-300 data-[state=checked]:border-orange-600 data-[state=checked]:bg-orange-600"
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={() => {
                              if (!eligibility.eligible) return
                              handleSelectPlayer(player)
                            }}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="truncate font-bold text-slate-900">{player.name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500">
                              {player.ligastatus ? (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5">{player.ligastatus}</span>
                              ) : null}
                              {player.verein ? <span>{player.verein}</span> : null}
                              {!eligibility.eligible ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
                                  <Lock className="h-3 w-3" />
                                  {eligibility.reason}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {!eligibility.eligible ? (
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
                              <Lock className="h-4 w-4" />
                            </span>
                          ) : selected ? (
                            <span className="hidden rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-black text-orange-700 sm:inline-flex">
                              Ausgewählt
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <Button
              onClick={handleRegisterAndResetSearch}
              disabled={
                !tournamentAccessType ||
                eligibilityLoading ||
                selectedPlayersForRegistration.length === 0 ||
                isRegisteringPlayers ||
                loading
              }
              className="mt-4 h-12 w-full rounded-2xl bg-orange-600 font-black text-white shadow-sm hover:bg-orange-700"
            >
              {isRegisteringPlayers ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registriere...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Spieler registrieren ({selectedPlayersForRegistration.length})
                </>
              )}
            </Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_70px_-52px_rgba(15,23,42,0.7)]">
          <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
                  Teilnehmer
                </div>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                  Registrierte Spieler
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">
                  {registeredPlayers.length} Spieler
                </span>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                  {paidPlayersCount} bezahlt
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 lg:p-6">
            {registeredPlayers.length === 0 ? (
              <div className="flex h-[526px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60">
                <div className="max-w-xs text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <PlusCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="mt-4 font-black text-slate-900">Noch keine Spieler registriert</div>
                  <div className="mt-1 text-sm font-medium text-slate-500">
                    Wähle links Spieler aus und füge sie dem Turnier hinzu.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Registrierte Spieler suchen..."
                      value={registeredSearch}
                      onChange={(e) => setRegisteredSearch(e.target.value)}
                      className="h-11 rounded-2xl border-slate-200 bg-slate-50/70 pl-10 shadow-none focus-visible:ring-orange-500"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllPlayersPaid}
                    disabled={unpaidPlayersCount === 0 || loading}
                    className="h-11 rounded-2xl border-emerald-200 bg-emerald-50 px-4 font-black text-emerald-700 hover:bg-emerald-100"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Alle bezahlt
                  </Button>
                </div>

                <div className="mt-4 h-[430px] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="sticky top-0 z-10 bg-slate-50 hover:bg-slate-50">
                        <TableHead className="font-black text-slate-600">Name</TableHead>
                        <TableHead className="font-black text-slate-600">Ligastatus</TableHead>
                        <TableHead className="text-center font-black text-slate-600">Bezahlt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRegisteredPlayers.map((player) => (
                        <TableRow key={player.id} className="hover:bg-slate-50/70">
                          <TableCell className="font-bold text-slate-900">{player.name}</TableCell>
                          <TableCell className="text-slate-600">{player.ligastatus || "—"}</TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={player.paid || false}
                              onCheckedChange={(checked) =>
                                handleUpdatePlayerPaidStatus(player.id, checked as boolean)
                              }
                              className="border-slate-300 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Button
                  onClick={handleClearRegisteredPlayers}
                  variant="outline"
                  className="mt-4 h-12 w-full rounded-2xl border-red-200 bg-red-50 font-black text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Alle Registrierungen löschen
                </Button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
