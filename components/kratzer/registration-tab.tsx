"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Users,
  List,
  PlusCircle,
  Trash2,
  Loader2,
  Search,
  CheckCircle2,
  UserPlus,
  BadgeCheck,
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
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-white via-orange-50/40 to-orange-100/60 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.14),transparent_30%)]" />
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400" />

        <div className="relative p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm">
                <BadgeCheck className="h-3.5 w-3.5" />
                Kratzer Registrierung
              </div>

              <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Spieler registrieren
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">
                
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[460px]">
              <div className="rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Verfügbar</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">{filteredAvailablePlayers.length}</div>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Ausgewählt</div>
                <div className="mt-2 text-2xl font-bold text-orange-600">
                  {selectedPlayersForRegistration.length}
                </div>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Registriert</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">{registeredPlayers.length}</div>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Bezahlt</div>
                <div className="mt-2 text-2xl font-bold text-green-600">{paidPlayersCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-orange-600" />
            Turnierart / Teilnahme
          </CardTitle>
          <CardDescription>
            Vor der Spielerregistrierung muss festgelegt werden, wer an diesem Kratzer-Turnier teilnehmen darf.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                value: "public" as const,
                title: "Öffentlich",
                description: "Alle Spieler – auch Gäste und Fremdspieler",
                icon: Globe2,
              },
              {
                value: "club_internal" as const,
                title: "Vereinsintern",
                description: "Nur Mitglieder mit Paket „Interne Turniere“",
                icon: Home,
              },
              {
                value: "club_external" as const,
                title: "Vereins-Auswärts",
                description: "Nur Mitglieder mit Paket „Externe Turniere“",
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
                  className={`rounded-2xl border-2 p-4 text-left transition ${
                    active
                      ? "border-orange-500 bg-orange-50"
                      : lockedByRegistrations
                        ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-60"
                        : "border-gray-200 bg-white hover:border-orange-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${active ? "text-orange-600" : "text-gray-500"}`} />
                    <span className="font-black text-gray-900">{option.title}</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-5 text-gray-500">{option.description}</p>
                </button>
              )
            })}
          </div>

          {!tournamentAccessType ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              Bitte zuerst eine Turnierart auswählen.
            </div>
          ) : registeredPlayers.length > 0 ? (
            <div className="mt-3 text-xs font-semibold text-gray-500">
              Die Turnierart ist gesperrt, solange Spieler registriert sind.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 to-amber-400" />

          <CardHeader className="space-y-3 border-b border-gray-100 bg-gradient-to-b from-white to-orange-50/40 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                    <Users className="h-5 w-5" />
                  </div>
                  Verfügbare Spieler
                </CardTitle>

                <CardDescription className="mt-2 text-sm text-gray-600">
                  Hier siehst du alle Spieler aus der Datenbank, die noch nicht für dieses Turnier registriert sind.
                </CardDescription>
              </div>

              <div className="hidden rounded-2xl border border-orange-100 bg-white px-4 py-3 text-right shadow-sm sm:block">
                <div className="text-xs uppercase tracking-wide text-gray-500">Treffer</div>
                <div className="text-xl font-bold text-gray-900">{filteredAvailablePlayers.length}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-400" />
                <Input
                  placeholder="Spieler suchen..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="h-11 rounded-xl border-orange-200 bg-white pl-10 pr-10 shadow-sm focus-visible:ring-2 focus-visible:ring-orange-500"
                />
                {filterText ? (
                  <button
                    type="button"
                    onClick={() => setFilterText("")}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Suche löschen"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all" as const, label: "Alle" },
                    { value: "eligible" as const, label: "Berechtigt" },
                    { value: "locked" as const, label: "Gesperrt" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEligibilityFilter(option.value)}
                      className={`h-8 rounded-lg border px-3 text-xs font-bold transition ${
                        eligibilityFilter === option.value
                          ? "border-orange-300 bg-orange-50 text-orange-700"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
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
                  disabled={
                    !tournamentAccessType ||
                    eligibilityLoading ||
                    eligibleVisiblePlayers.length === 0
                  }
                  className="h-8 rounded-lg px-3 text-xs font-bold"
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  {allEligibleVisibleSelected
                    ? "Treffer abwählen"
                    : `Berechtigte Treffer wählen (${eligibleVisiblePlayers.length})`}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">
            <div className="rounded-3xl border border-orange-100 bg-gradient-to-b from-orange-50/30 to-white p-3">
              <div className="h-[420px] overflow-y-auto pr-1">
                {fetchingAvailablePlayers ? (
                  <div className="flex h-full items-center justify-center text-gray-600">
                    <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white px-5 py-4 shadow-sm">
                      <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                      <span className="text-sm font-medium">Spieler werden geladen...</span>
                    </div>
                  </div>
                ) : filteredAvailablePlayers.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="max-w-sm rounded-3xl border border-dashed border-orange-200 bg-white px-6 py-10 text-center shadow-sm">
                      <UserPlus className="mx-auto h-10 w-10 text-orange-300" />
                      <h3 className="mt-4 text-base font-semibold text-gray-900">Keine passenden Spieler</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        {filterText
                          ? "Für deine Suche wurde kein passender Spieler gefunden."
                          : "Alle verfügbaren Spieler sind bereits registriert."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAvailablePlayers.map((player) => {
                      const selected = isPlayerSelected(player)
                      const eligibility = getEligibility(player)

                      return (
                        <div
                          key={player.id}
                          role="button"
                          tabIndex={eligibility.eligible ? 0 : -1}
                          aria-disabled={!eligibility.eligible}
                          onClick={() => handleSelectPlayer(player)}
                          onKeyDown={(e) => {
                            if (eligibility.eligible && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault()
                              handleSelectPlayer(player)
                            }
                          }}
                          className={`group relative w-full rounded-2xl border p-3 text-left transition-all duration-200 ${
                            !eligibility.eligible
                              ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-75"
                              : selected
                                ? "cursor-pointer border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 shadow-[0_8px_24px_rgba(249,115,22,0.14)]"
                                : "cursor-pointer border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-base font-semibold text-gray-900">{player.name}</div>

                              {!eligibility.eligible ? (
                                <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-gray-600">
                                  <Lock className="h-3.5 w-3.5" />
                                  {eligibility.reason}
                                </div>
                              ) : null}

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                                  {player.ligastatus || "Ohne Ligastatus"}
                                </span>
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                                  {player.verein || "Ohne Verein"}
                                </span>
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                                  {player.geschlecht || "Keine Angabe"}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${
                                selected
                                  ? "border-orange-300 bg-white shadow-sm"
                                  : "border-gray-200 bg-gray-50 group-hover:border-orange-200 group-hover:bg-white"
                              }`}
                            >
                              {eligibility.eligible ? (
                                <Checkbox checked={selected} className="pointer-events-none shrink-0" />
                              ) : (
                                <Lock className="h-5 w-5 text-gray-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3 text-sm text-gray-700">
                <span className="font-semibold text-orange-700">
                  {selectedPlayersForRegistration.length} Spieler ausgewählt
                </span>
                <span className="text-gray-500"> — bereit zur Registrierung</span>
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
                className="h-12 rounded-2xl bg-orange-600 px-6 font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-60"
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
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 to-amber-400" />

          <CardHeader className="space-y-3 border-b border-gray-100 bg-gradient-to-b from-white to-orange-50/40 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                    <List className="h-5 w-5" />
                  </div>
                  Registrierte Spieler
                </CardTitle>

                <CardDescription className="mt-2 text-sm text-gray-600">
                  Übersicht aller registrierten Spieler inklusive Bezahlstatus.
                </CardDescription>
              </div>

              <div className="hidden rounded-2xl border border-orange-100 bg-white px-4 py-3 text-right shadow-sm sm:block">
                <div className="text-xs uppercase tracking-wide text-gray-500">Gesamt</div>
                <div className="text-xl font-bold text-gray-900">{registeredPlayers.length}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-gray-500">
                Bezahlstatus für alle Teilnehmer verwalten
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMarkAllPlayersPaid}
                disabled={registeredPlayers.length === 0 || unpaidPlayersCount === 0 || loading}
                className="h-9 rounded-xl border-green-200 bg-green-50 font-bold text-green-700 hover:bg-green-100"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Alle bezahlt
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-green-700">Bezahlt</div>
                <div className="mt-1 text-xl font-bold text-green-700">{paidPlayersCount}</div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-amber-700">Offen</div>
                <div className="mt-1 text-xl font-bold text-amber-700">{unpaidPlayersCount}</div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Registrierte Spieler suchen..."
                value={registeredSearch}
                onChange={(e) => setRegisteredSearch(e.target.value)}
                className="h-10 rounded-xl border-gray-200 bg-white pl-10 pr-10"
              />
              {registeredSearch ? (
                <button
                  type="button"
                  onClick={() => setRegisteredSearch("")}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Suche löschen"
                >
                  ×
                </button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">
            <div className="rounded-3xl border border-orange-100 bg-gradient-to-b from-orange-50/30 to-white p-3">
              <div className="h-[420px] overflow-y-auto">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-gray-600">
                    <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white px-5 py-4 shadow-sm">
                      <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                      <span className="text-sm font-medium">Registrierungen werden geladen...</span>
                    </div>
                  </div>
                ) : registeredPlayers.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="max-w-sm rounded-3xl border border-dashed border-orange-200 bg-white px-6 py-10 text-center shadow-sm">
                      <List className="mx-auto h-10 w-10 text-orange-300" />
                      <h3 className="mt-4 text-base font-semibold text-gray-900">Noch keine Registrierungen</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Sobald Spieler hinzugefügt wurden, erscheinen sie hier.
                      </p>
                    </div>
                  </div>
                ) : filteredRegisteredPlayers.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="max-w-sm rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center">
                      <Search className="mx-auto h-8 w-8 text-gray-300" />
                      <div className="mt-3 text-sm font-bold text-gray-700">
                        Kein registrierter Spieler gefunden
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-orange-50 to-amber-50 hover:bg-orange-50">
                          <TableHead className="h-12 font-semibold text-gray-700">Name</TableHead>
                          <TableHead className="font-semibold text-gray-700">Ligastatus</TableHead>
                          <TableHead className="text-center font-semibold text-gray-700">Bezahlt</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {filteredRegisteredPlayers.map((player) => (
                          <TableRow key={player.id} className="hover:bg-orange-50/40">
                            <TableCell className="py-4">
                              <div className="font-semibold text-gray-900">{player.name}</div>
                            </TableCell>

                            <TableCell className="py-4">
                              <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                                {player.ligastatus || "—"}
                              </span>
                            </TableCell>

                            <TableCell className="py-4 text-center">
                              <div className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 shadow-sm">
                                <Checkbox
                                  checked={player.paid || false}
                                  onCheckedChange={(checked) =>
                                    handleUpdatePlayerPaidStatus(player.id, checked as boolean)
                                  }
                                />
                                {player.paid ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleClearRegisteredPlayers}
              variant="destructive"
              className="mt-4 h-12 w-full rounded-2xl font-semibold shadow-sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Alle Registrierungen löschen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}