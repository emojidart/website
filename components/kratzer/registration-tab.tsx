"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
import {
  TournamentRegistrationPanel,
  type TournamentRegistrationAvailablePlayer,
  type TournamentRegistrationRegisteredPlayer,
} from "@/components/tournament-registration/tournament-registration-panel"

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
  const [registrationVisualProgress, setRegistrationVisualProgress] = useState(0)
  const [showRegistrationSuccessModal, setShowRegistrationSuccessModal] = useState(false)
  const lastRegistrationTotalRef = useRef(0)

  useEffect(() => {
    if (!isRegisteringPlayers) {
      setRegistrationVisualProgress(0)
      return
    }

    const total = Math.max(1, lastRegistrationTotalRef.current || selectedPlayersForRegistration.length)
    setRegistrationVisualProgress(0)

    const interval = window.setInterval(() => {
      setRegistrationVisualProgress((current) => {
        const maxBeforeDone = Math.max(0, total - 1)
        return current >= maxBeforeDone ? current : current + 1
      })
    }, 120)

    return () => window.clearInterval(interval)
  }, [isRegisteringPlayers, selectedPlayersForRegistration.length])

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
    const total = selectedPlayersForRegistration.length
    if (total <= 0) return

    lastRegistrationTotalRef.current = total
    setRegistrationVisualProgress(0)

    try {
      await handleRegisterPlayers()
      setRegistrationVisualProgress(total)
      setFilterText("")
      setShowRegistrationSuccessModal(true)
    } catch (error) {
      console.error("Kratzer Registrierung fehlgeschlagen:", error)
    }
  }

  const sharedAvailablePlayers: TournamentRegistrationAvailablePlayer[] = availablePlayers
    .filter((player) => !registeredPlayers.some((registered) => String(registered.id) === String(player.id)))
    .map((player) => {
      const eligibility = getEligibility(player)
      return {
        id: String(player.id),
        name: player.name,
        meta: player.ligastatus || undefined,
        secondaryMeta: player.verein || undefined,
        eligible: eligibility.eligible,
        eligibilityReason: eligibility.reason,
      }
    })

  const sharedRegisteredPlayers: TournamentRegistrationRegisteredPlayer[] = registeredPlayers.map((player) => ({
    id: String(player.id),
    name: player.name,
    subtitle: player.ligastatus || undefined,
    paid: Boolean(player.paid),
  }))

  const sharedSelectedIds = new Set(selectedPlayersForRegistration.map((player) => String(player.id)))

  return (
    <div className="space-y-5">
      {/* Teilnahmeart */}
      <section className="emd-admin-surface p-5">
        <div className="mb-4">
          <h2 className="text-lg font-black text-white">Teilnahme</h2>
          <p className="mt-1 text-sm text-white/40">
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
                    ? "border-orange-300/30 bg-orange-500/[0.10] shadow-[0_0_0_1px_rgba(249,115,22,.04)]"
                    : lockedByRegistrations
                      ? "cursor-not-allowed border-white/[0.07] bg-white/[0.02] opacity-45"
                      : "border-white/[0.08] bg-white/[0.025] hover:border-orange-300/20 hover:bg-orange-500/[0.055]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${active ? "text-orange-300" : "text-white/40"}`} />
                  <span className="font-bold text-white">{option.title}</span>
                  {active ? <CheckCircle2 className="ml-auto h-4 w-4 text-orange-300" /> : null}
                </div>
                <div className="mt-1 text-xs text-white/40">{option.description}</div>
              </button>
            )
          })}
        </div>
      </section>

      <TournamentRegistrationPanel
        availablePlayers={sharedAvailablePlayers}
        registeredPlayers={sharedRegisteredPlayers}
        selectedIds={sharedSelectedIds}
        onToggleSelected={(id) => {
          const player = availablePlayers.find((candidate) => String(candidate.id) === id)
          if (player) handleSelectPlayer(player)
        }}
        searchTerm={filterText}
        onSearchTermChange={setFilterText}
        loading={fetchingAvailablePlayers || loading}
        eligibilityLoading={eligibilityLoading}
        canRegister={Boolean(tournamentAccessType)}
        disabledNotice={
          tournamentAccessType
            ? null
            : "Bitte zuerst oben die Teilnahmeart auswählen."
        }
        onRegister={handleRegisterAndResetSearch}
        isRegistering={isRegisteringPlayers}
        registrationProgress={
          isRegisteringPlayers
            ? {
                done: registrationVisualProgress,
                total: Math.max(1, lastRegistrationTotalRef.current),
              }
            : null
        }
        showEligibilityFilters={true}
        showPaid={true}
        paidCount={paidPlayersCount}
        onTogglePaid={(id, paid) => handleUpdatePlayerPaidStatus(id, !paid)}
        onMarkAllPaid={handleMarkAllPlayersPaid}
        markingAllPaid={loading}
        onClearAll={handleClearRegisteredPlayers}
        clearAllLabel="Alle Registrierungen löschen"
      />

      {showRegistrationSuccessModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,.65)]">
            <div className="p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>

              <div className="mt-4 text-center">
                <h3 className="text-xl font-black tracking-tight text-slate-950">Registrierung abgeschlossen</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {lastRegistrationTotalRef.current === 1
                    ? "1 Spieler wurde zum Turnier hinzugefügt."
                    : `${lastRegistrationTotalRef.current || 0} Spieler wurden zum Turnier hinzugefügt.`}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  Die Teilnehmerliste wurde aktualisiert.
                </p>
              </div>

              <Button
                onClick={() => setShowRegistrationSuccessModal(false)}
                className="mt-5 h-11 w-full rounded-xl bg-slate-950 font-bold text-white hover:bg-slate-800"
              >
                Schließen
              </Button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  )
}
