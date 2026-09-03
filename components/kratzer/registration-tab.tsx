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
    <div className="space-y-5">
      {/* Teilnahmeart */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-black text-gray-950">Teilnahme</h2>
          <p className="mt-1 text-sm text-gray-500">
            Wähle aus, wer an diesem Turnier teilnehmen darf.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
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
                className={`rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-orange-400 bg-orange-50"
                    : lockedByRegistrations
                      ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-60"
                      : "border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${active ? "text-orange-600" : "text-gray-500"}`} />
                  <span className="font-bold text-gray-900">{option.title}</span>
                  {active ? <CheckCircle2 className="ml-auto h-4 w-4 text-orange-600" /> : null}
                </div>
                <div className="mt-1 text-xs text-gray-500">{option.description}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Anmeldung wie beim Einzelturnier: links Auswahl, rechts Registrierte */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-gray-950">Spieler hinzufügen</h2>
            <span className="text-sm font-medium text-gray-500">
              {filteredAvailablePlayers.length} Spieler
            </span>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Spieler suchen..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="h-11 rounded-xl border-gray-200 bg-white pl-10 focus-visible:ring-orange-500"
            />
          </div>

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
                className={`h-10 rounded-xl text-sm font-bold transition ${
                  eligibilityFilter === option.value
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mb-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleAllEligibleVisible}
              disabled={!tournamentAccessType || eligibilityLoading || eligibleVisiblePlayers.length === 0}
              className="rounded-xl border-orange-200 font-bold hover:bg-orange-50"
            >
              <CheckCircle2 className="mr-2 h-4 w-4 text-orange-600" />
              {allEligibleVisibleSelected
                ? "Auswahl aufheben"
                : `Berechtigte auswählen (${eligibleVisiblePlayers.length})`}
            </Button>
          </div>

          <div className="mb-4 h-[390px] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2">
            {fetchingAvailablePlayers ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-orange-500" />
                Spieler werden geladen...
              </div>
            ) : filteredAvailablePlayers.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
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
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        !eligibility.eligible
                          ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-70"
                          : selected
                            ? "cursor-pointer border-orange-300 bg-orange-50"
                            : "cursor-pointer border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selected}
                          disabled={!eligibility.eligible}
                          className="shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => {
                            if (!eligibility.eligible) return
                            handleSelectPlayer(player)
                          }}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-gray-800">{player.name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            {player.ligastatus ? <span>{player.ligastatus}</span> : null}
                            {player.verein ? <span>{player.verein}</span> : null}
                            {!eligibility.eligible ? (
                              <span className="inline-flex items-center gap-1 font-semibold">
                                <Lock className="h-3 w-3" />
                                {eligibility.reason}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {!eligibility.eligible ? (
                          <Lock className="h-4 w-4 shrink-0 text-gray-400" />
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
            className="h-12 w-full rounded-xl bg-orange-500 font-black text-white hover:bg-orange-600"
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
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-gray-950">Registrierte Spieler</h2>
            <span className="text-sm font-black text-orange-600">
              {paidPlayersCount} / {registeredPlayers.length}
            </span>
          </div>

          {registeredPlayers.length === 0 ? (
            <div className="flex h-[500px] items-center justify-center">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">
                  Noch keine Spieler registriert
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllPlayersPaid}
                  disabled={unpaidPlayersCount === 0 || loading}
                  className="rounded-xl border-green-200 bg-green-50 font-bold text-green-700 hover:bg-green-100"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Alle bezahlt
                </Button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Registrierte Spieler suchen..."
                  value={registeredSearch}
                  onChange={(e) => setRegisteredSearch(e.target.value)}
                  className="h-11 rounded-xl border-gray-200 bg-white pl-10 focus-visible:ring-orange-500"
                />
              </div>

              <div className="h-[390px] overflow-y-auto rounded-xl border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead>Name</TableHead>
                      <TableHead>Ligastatus</TableHead>
                      <TableHead className="text-center">Bezahlt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegisteredPlayers.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium text-gray-900">{player.name}</TableCell>
                        <TableCell className="text-gray-600">{player.ligastatus || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={player.paid || false}
                            onCheckedChange={(checked) =>
                              handleUpdatePlayerPaidStatus(player.id, checked as boolean)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button
                onClick={handleClearRegisteredPlayers}
                variant="destructive"
                className="mt-4 h-12 w-full rounded-xl font-bold"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Alle Registrierungen löschen
              </Button>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
