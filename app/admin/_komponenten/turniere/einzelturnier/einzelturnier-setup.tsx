"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Search,
  UserPlus,
  PlusCircle,
  X,
  Play,
  Trophy,
  ArrowLeft,
  Euro,
  AlertCircle,
  ArrowRight,
  Star,
  Lock,
  Info,
  CheckCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SpieldatenbankForm } from "@/app/admin/_komponenten/turniere/spieldatenbank/formular"
import styles from "@/app/dko_tournament_registration/tournament-admin-theme.module.css"
import { EinzelturnierEinstellungen } from "./einzelturnier-einstellungen"
import { EinzelturnierSpieler } from "./einzelturnier-spieler"
import { EinzelturnierZahlungDialoge } from "./einzelturnier-zahlung-dialoge"
import { EinzelturnierStart } from "./einzelturnier-start"
import { buildTournamentContinueRoute } from "./einzelturnier-engine"
import { accessTypeLabel } from "./einzelturnier-berechtigungen"
import { useEinzelturnierRealtime } from "./einzelturnier-realtime"
import { buildDoubleTeamName, stripDoubleSuffix } from "./einzelturnier-helfer"
import { useEinzelturnierRegistrierung } from "./use-einzelturnier-registrierung"
import { cancelActiveTournamentData } from "./einzelturnier-aktives-turnier"
import { useEinzelturnierSetupDaten } from "./use-einzelturnier-setup-daten"
import { useEinzelturnierCentralEventSetup } from "./use-einzelturnier-central-event-setup"
import { useEinzelturnierStartController } from "./use-einzelturnier-start-controller"

interface Player {
  id: number
  name: string
}

type TournamentAccessType = "" | "public" | "club_internal" | "club_external"

type PlayerEligibility = {
  eligible: boolean
  reason: string
}

interface PlayerWithFrequency extends Player {
  playCount: number
  lastPlayed: string | null
}

interface RegisteredPlayer {
  id: number
  player_id: string
  player_name: string
  registered_at: string
  paid: boolean
  entry_fee: number
  deducted_from_credit?: boolean | string
  payment_method?: string | null
  access_type?: TournamentAccessType | null
}

type TournamentMode = "dko" | "round_robin"


export function EinzelturnierSetup() {
  const { user, isAdmin, loading: authLoading, adminLoading } = useAuth()
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [frequentPlayers, setFrequentPlayers] = useState<PlayerWithFrequency[]>([])
  const [registeredPlayers, setRegisteredPlayers] = useState<RegisteredPlayer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(new Set())
  const [doubleMode, setDoubleMode] = useState(false)
const [doublePlayer1Id, setDoublePlayer1Id] = useState("")
const [doublePlayer2Id, setDoublePlayer2Id] = useState("")
  const [loading, setLoading] = useState(true)
  const [tournamentName, setTournamentName] = useState("")
  const [tournamentEntryFee, setTournamentEntryFee] = useState("")
  const [tournamentAccessType, setTournamentAccessType] = useState<TournamentAccessType>("")
  const [tournamentMode, setTournamentMode] = useState<TournamentMode>("dko")
  const [allowDoubleEntry, setAllowDoubleEntry] = useState(false)
  const [rrGroupCount, setRrGroupCount] = useState<number>(2)

  const [showPaymentWarning, setShowPaymentWarning] = useState(false)
  const [showNameWarning, setShowNameWarning] = useState(false)
  const [playerViewMode, setPlayerViewMode] = useState<"frequent" | "all">("frequent")
  const [activeTournament, setActiveTournament] = useState<{
    tournamentId: string
    tournamentName: string
    tournamentType: string
    accessType?: TournamentAccessType | null
    incompleteMatches: number
  } | null>(null)
  const [showCancelActiveTournamentDialog, setShowCancelActiveTournamentDialog] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // ✅ Wenn du von der Turnier-Startseite kommst, wird die Series-ID als Query-Param übergeben:
  // /dko_tournament_registration?seriesId=XYZ
  const seriesId = searchParams.get("seriesId")
  const eventId = searchParams.get("eventId")
  const centralEventId = searchParams.get("centralEventId")

  // Für Serien-Spieltage kommt die Anmeldung über eventId, für zentrale Turniere über centralEventId.
  // Beide müssen dieselbe Registrierungslogik verwenden, sonst werden fälschlich event_id=NULL Datensätze geladen/gespeichert.
  const registrationEventId = centralEventId ?? eventId
  const centralMode = searchParams.get("mode")
  const centralDoubleEntry = searchParams.get("doubleEntry")
  const centralDoubleMode = searchParams.get("doubleMode")
  const centralTeamMode = searchParams.get("teamMode")

  useEffect(() => {
    if (!centralEventId) return
    setAllowDoubleEntry(centralMode === "dko" && (centralTeamMode || "single") === "single" && centralDoubleEntry === "1")
    setDoubleMode(centralTeamMode === "fixed" || centralTeamMode === "drawn" ? false : centralDoubleMode === "1")
    setDoublePlayer1Id("")
    setDoublePlayer2Id("")
  }, [centralEventId, centralMode, centralDoubleEntry, centralDoubleMode, centralTeamMode])

  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false)
  const [addPlayerFormKey, setAddPlayerFormKey] = useState(0)


  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState<{
    open: boolean
    playerName?: string
    required?: number
    available?: number
  }>({ open: false })
  const [showAlreadyRegisteredModal, setShowAlreadyRegisteredModal] = useState<{ open: boolean; playerName?: string }>({
    open: false,
  })
  const [showSuccessModal, setShowSuccessModal] = useState<{ open: boolean; playerCount?: number }>({ open: false })
  const [showErrorModal, setShowErrorModal] = useState<{ open: boolean }>({ open: false })

  const [showCreditConfirmModal, setShowCreditConfirmModal] = useState<{
    open: boolean
    players?: Array<{ id: number; name: string; currentBalance: number; newBalance: number; clubPlayerId: string }>
    playersWithoutCredit?: number[]
    entryFee?: number
  }>({ open: false })


  const [showPaidLockModal, setShowPaidLockModal] = useState<{ open: boolean; playerName?: string }>({ open: false })

  const [showRefundConfirmModal, setShowRefundConfirmModal] = useState<{
    open: boolean
    registrationId?: number
    playerName?: string
    refundAmount?: number
  }>({ open: false })

  const [showRefundSuccessModal, setShowRefundSuccessModal] = useState<{
    open: boolean
    playerName?: string
    refundAmount?: number
  }>({ open: false })

  const {
    isSeriesPrefilled,
    tournamentFormCompleted,
    eligibilityLoading,
    getPlayerEligibility,
    ensurePlayersEligible,
    fetchPlayers,
    fetchRegisteredPlayers,
    fetchFrequentPlayers,
  } = useEinzelturnierSetupDaten({
    seriesId,
    centralEventId: registrationEventId,
    tournamentName,
    tournamentEntryFee,
    tournamentAccessType,
    availablePlayers,
    setAvailablePlayers,
    setFrequentPlayers,
    setRegisteredPlayers,
    setTournamentName,
    setTournamentEntryFee,
    setTournamentAccessType,
    setSelectedPlayers,
    setDoublePlayer1Id,
    setDoublePlayer2Id,
    setActiveTournament,
    setLoading,
  })

  const {
    isRegisteringPlayers,
    registrationProgress,
    markingAllPaid,
    handleRegisterPlayers,
    registerPlayersWithoutCreditDeduction,
    registerPlayersWithCreditDeduction,
    registerDoubleTeam,
    handlePlayerSelect,
    handleUnregisterPlayer,
    confirmRefund,
    togglePaymentStatus,
    markAllPlayersPaid,
  } = useEinzelturnierRegistrierung({
    userId: user?.id,
    availablePlayers,
    registeredPlayers,
    setRegisteredPlayers,
    selectedPlayers,
    setSelectedPlayers,
    tournamentEntryFee,
    tournamentAccessType,
    tournamentFormCompleted,
    allowDoubleEntry,
    centralEventId: registrationEventId,
    doublePlayer1Id,
    doublePlayer2Id,
    setDoublePlayer1Id,
    setDoublePlayer2Id,
    getPlayerEligibility,
    ensurePlayersEligible,
    fetchRegisteredPlayers,
    fetchFrequentPlayers,
    showCreditConfirmModal,
    setShowCreditConfirmModal,
    setShowAlreadyRegisteredModal,
    setShowSuccessModal,
    setShowErrorModal,
    showRefundConfirmModal,
    setShowRefundConfirmModal,
    setShowRefundSuccessModal,
    setShowPaidLockModal,
    setSearchTerm,
  })


  const openAddPlayerModal = () => {
    setAddPlayerFormKey((k) => k + 1) // Form zurücksetzen beim Öffnen
    setShowAddPlayerModal(true)
  }

  const closeAddPlayerModal = () => {
    setShowAddPlayerModal(false)
  }

  const handleAddPlayerSaved = async () => {
    // Spieler wurde in der Spieldatenbank gespeichert → Listen hier aktualisieren
    closeAddPlayerModal()
    await fetchPlayers()
    await fetchFrequentPlayers()
    setPlayerViewMode("all")
    setSearchTerm("")
  }

  
  useEinzelturnierRealtime({
    enabled: !authLoading && !adminLoading && Boolean(user) && isAdmin,
    onRefresh: async () => {
      await fetchRegisteredPlayers()
      await fetchFrequentPlayers()
    },
  })

  useEinzelturnierCentralEventSetup({
    centralEventId,
    centralMode,
    centralTeamMode,
    setLoading,
    setTournamentName,
    setTournamentEntryFee,
    setTournamentAccessType,
    setTournamentMode,
    fetchRegisteredPlayers,
    setShowErrorModal,
  })

  const handleCancelActiveTournament = async () => {
    if (!activeTournament) return

    try {
      await cancelActiveTournamentData({
        tournamentId: activeTournament.tournamentId,
        centralEventId: registrationEventId,
      })

      setActiveTournament(null)
      setShowCancelActiveTournamentDialog(false)
      await fetchRegisteredPlayers()
    } catch (error) {
      console.error("Fehler beim Abbrechen des aktiven Turniers:", error)
      alert("Fehler beim Abbrechen des Turniers. Bitte versuche es erneut.")
    }
  }

  const handleContinueTournament = () => {
    if (!activeTournament) return

    router.push(
      buildTournamentContinueRoute({
        tournamentType: activeTournament.tournamentType,
        tournamentId: activeTournament.tournamentId,
        tournamentName: activeTournament.tournamentName,
        accessType: activeTournament.accessType || "public",
        seriesId,
        eventId,
      }),
    )
  }



  const allPlayersPaid = registeredPlayers.every((player) => player.paid)
  const paidCount = registeredPlayers.filter((player) => player.paid).length
  const unpaidPlayers = registeredPlayers.filter((player) => !player.paid)

  const isPreRegistered = (p: RegisteredPlayer) =>
    p?.payment_method === "credit" || p?.payment_method === "on_site"

  const getTournamentSize = (playerCount: number): number => {
  if (playerCount <= 8) return 8
  if (playerCount <= 16) return 16
  if (playerCount <= 32) return 32
  if (playerCount <= 64) return 64
  return 128
}

  const tournamentSize = getTournamentSize(registeredPlayers.length)

  const {
    startingTournament,
    handleStartTournament,
  } = useEinzelturnierStartController({
    registeredPlayers,
    tournamentName,
    tournamentAccessType,
    tournamentMode,
    rrGroupCount,
    tournamentSize,
    centralEventId,
    seriesId,
    eventId,
    allPlayersPaid,
    setShowNameWarning,
    setShowPaymentWarning,
    push: (url) => router.push(url),
  })



const filteredPlayers = availablePlayers.filter((player) => {
  const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase())
  if (!matchesSearch) return false

  if (doubleMode) return true
  if (allowDoubleEntry) return true

  return !registeredPlayers.some((rp) => stripDoubleSuffix(rp.player_name) === player.name)
})

const availableFrequentPlayers = frequentPlayers.filter((player) => {
  if (doubleMode) return true
  if (allowDoubleEntry) return true

  return !registeredPlayers.some((rp) => stripDoubleSuffix(rp.player_name) === player.name)
})

  if (authLoading || adminLoading) {
    return (
      <div className={`${styles.theme} min-h-screen flex flex-col bg-[#050608] text-white`}>
        <main className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow">
          <Card className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0b0d11]/95 p-6 text-white shadow-[0_35px_120px_-58px_rgba(0,0,0,.98)] backdrop-blur-2xl">
            <CardContent className="text-center">
              <p className="text-gray-700">Lade...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className={`${styles.theme} min-h-screen flex flex-col bg-[#050608] text-white`}>
        <main className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow">
          <Card className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0b0d11]/95 p-6 text-white shadow-[0_35px_120px_-58px_rgba(0,0,0,.98)] backdrop-blur-2xl">
            <CardTitle className="text-2xl font-bold text-center mb-6">Zugriff verweigert</CardTitle>
            <CardContent className="text-center">
              <p className="mb-4 text-gray-700">
                Du benötigst Admin-Rechte, um die Einzelturnier-Verwaltung zu öffnen.
              </p>
              <Button onClick={() => router.push("/admin")} className="w-full">
                Zurück zur Admin-Seite
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className={`${styles.theme} relative min-h-[720px] w-full min-w-0 overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#050608] text-white`}>
      <div className="pointer-events-none absolute inset-0 z-0 bg-[#050608]">
        <div
          className="absolute inset-0 bg-cover bg-[62%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.72),rgba(3,5,9,.93)_42%,rgba(2,4,7,.99))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.15),transparent_27%),radial-gradient(circle_at_88%_26%,rgba(14,165,233,.10),transparent_29%)]" />
      </div>


     

      {showAlreadyRegisteredModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0b0d11]/95 p-7 text-white shadow-[0_35px_120px_-58px_rgba(0,0,0,.98)] backdrop-blur-2xl sm:p-8">
            <div className="flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4 mx-auto">
              <UserPlus className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="mb-2 text-center text-2xl font-black tracking-tight text-white">Bereits registriert</h3>
            <p className="text-center text-gray-600 font-semibold mb-2">{showAlreadyRegisteredModal.playerName}</p>
            <p className="text-center text-gray-500 mb-6">Dieser Spieler ist bereits für das Turnier registriert.</p>
            <Button
              onClick={() => setShowAlreadyRegisteredModal({ open: false })}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
            >
              Verstanden
            </Button>
          </div>
        </div>
      )}

      {showSuccessModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,.65)]">
            <div className="p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>

              <div className="mt-4 text-center">
                <h3 className="text-xl font-black tracking-tight text-slate-950">Registrierung abgeschlossen</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {showSuccessModal.playerCount === 1
                    ? "1 Spieler wurde zum Turnier hinzugefügt."
                    : `${showSuccessModal.playerCount || 0} Spieler wurden zum Turnier hinzugefügt.`}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  Die Teilnehmerliste wurde aktualisiert.
                </p>
              </div>

              <Button
                onClick={() => setShowSuccessModal({ open: false })}
                className="mt-5 h-11 w-full rounded-xl bg-slate-950 font-bold text-white hover:bg-slate-800"
              >
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}

      {showErrorModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0b0d11]/95 p-7 text-white shadow-[0_35px_120px_-58px_rgba(0,0,0,.98)] backdrop-blur-2xl sm:p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-rose-300/20 bg-rose-500/[0.10]">
              <AlertCircle className="h-7 w-7 text-rose-300" />
            </div>
            <h3 className="mb-2 text-center text-2xl font-black tracking-tight text-white">Fehler</h3>
            <p className="mb-6 text-center text-white/50">
              Ein Fehler ist aufgetreten. Der Spieler könnte bereits registriert sein.
            </p>
            <Button
              onClick={() => setShowErrorModal({ open: false })}
              className="w-full rounded-xl border border-rose-300/20 bg-rose-500/[0.10] py-3 font-black text-rose-200 hover:bg-rose-500/[0.16]"
            >
              Verstanden
            </Button>
          </div>
        </div>
      )}

      
      {showAddPlayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/[0.10] bg-[#080b10] p-4 text-white shadow-[0_30px_100px_-40px_rgba(0,0,0,.98)] sm:p-6">
            <button
              onClick={closeAddPlayerModal}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/55 transition hover:border-orange-300/15 hover:bg-white/[0.05] hover:text-white"
              aria-label="Schließen"
            >
              <X className="h-5 w-5 text-current" />
            </button>

            <div className="mb-4">
              <h3 className="text-2xl font-black tracking-tight text-white">Neuen Spieler anlegen</h3>
              <p className="text-white/45">Der Spieler wird direkt in der Spieldatenbank gespeichert.</p>
            </div>

            <div key={addPlayerFormKey}>
              <SpieldatenbankForm onSaveSuccess={handleAddPlayerSaved} />
            </div>
          </div>
        </div>
      )}

      <EinzelturnierZahlungDialoge
        insufficientBalance={showInsufficientBalanceModal}
        onCloseInsufficientBalance={() => setShowInsufficientBalanceModal({ open: false })}
        creditConfirm={showCreditConfirmModal}
        onRegisterWithoutCredit={registerPlayersWithoutCreditDeduction}
        onRegisterWithCredit={registerPlayersWithCreditDeduction}
        isRegisteringPlayers={isRegisteringPlayers}
        paidLock={showPaidLockModal}
        onClosePaidLock={() => setShowPaidLockModal({ open: false })}
        refundConfirm={showRefundConfirmModal}
        onCloseRefundConfirm={() => setShowRefundConfirmModal({ open: false })}
        onConfirmRefund={confirmRefund}
        refundSuccess={showRefundSuccessModal}
        onCloseRefundSuccess={() => setShowRefundSuccessModal({ open: false })}
      />

      {showNameWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[26px] border border-white/10 bg-[#0b0d11]/95 p-6 text-white shadow-[0_35px_120px_-58px_rgba(0,0,0,.98)] backdrop-blur-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-300/20 bg-orange-500/[0.10]">
                <Trophy className="h-6 w-6 text-orange-300" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-white">Turniername fehlt</h3>
            </div>
            <p className="mb-6 text-white/50">Bitte gib einen Turniernamen ein, bevor du das Turnier startest.</p>
            <Button onClick={() => setShowNameWarning(false)} className="w-full rounded-xl bg-orange-500 font-black text-white hover:bg-orange-400">
              Verstanden
            </Button>
          </div>
        </div>
      )}

      {showPaymentWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[26px] border border-white/10 bg-[#0b0d11]/95 p-6 text-white shadow-[0_35px_120px_-58px_rgba(0,0,0,.98)] backdrop-blur-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-300/20 bg-orange-500/[0.10]">
                <AlertCircle className="h-6 w-6 text-orange-300" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-white">Nicht alle Spieler haben bezahlt</h3>
            </div>
            <p className="mb-4 text-white/50">
              Das Turnier kann erst gestartet werden, wenn alle Spieler ihre Teilnahmegebühr bezahlt haben.
            </p>
            <div className="mb-6 rounded-2xl border border-orange-300/20 bg-orange-500/[0.08] p-4">
              <p className="mb-2 font-semibold text-white/85">Noch nicht bezahlt:</p>
              <ul className="space-y-1">
                {unpaidPlayers.map((player) => (
                  <li key={player.id} className="flex items-center gap-2 text-white/60">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    {player.player_name}
                  </li>
                ))}
              </ul>
            </div>
            <Button onClick={() => setShowPaymentWarning(false)} className="w-full rounded-xl bg-orange-500 font-black text-white hover:bg-orange-400">
              Verstanden
            </Button>
          </div>
        </div>
      )}

      <div className="emd-admin-page">
        <div className="emd-admin-content">

        <div className="emd-admin-hero flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">Turnier Setup</div>
            <div className="mt-1 text-xl font-black sm:text-2xl">Teilnehmer & Turnierstart</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold sm:text-sm">
            <span className="rounded-full border border-white/10 bg-[#11151a] px-3 py-1.5 text-white/85">{registeredPlayers.length} registriert</span>
            <span className={`rounded-full border px-3 py-1.5 ${tournamentFormCompleted ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-orange-400/30 bg-orange-400/10 text-orange-200"}`}>
              {tournamentFormCompleted ? "Setup bereit" : "Setup offen"}
            </span>
          </div>
        </div>

        <EinzelturnierEinstellungen
          tournamentName={tournamentName}
          onTournamentNameChange={setTournamentName}
          tournamentEntryFee={tournamentEntryFee}
          onTournamentEntryFeeChange={setTournamentEntryFee}
          tournamentAccessType={tournamentAccessType}
          onTournamentAccessTypeChange={setTournamentAccessType}
          tournamentMode={tournamentMode}
          onTournamentModeChange={(mode) => {
            setTournamentMode(mode)
            if (mode === "round_robin") setAllowDoubleEntry(false)
          }}
          rrGroupCount={rrGroupCount}
          onRrGroupCountChange={setRrGroupCount}
          allowDoubleEntry={allowDoubleEntry}
          onAllowDoubleEntryChange={setAllowDoubleEntry}
          doubleMode={doubleMode}
          onDoubleModeChange={(checked) => {
            setDoubleMode(checked)
            setDoublePlayer1Id("")
            setDoublePlayer2Id("")
          }}
          isSeriesPrefilled={isSeriesPrefilled}
          tournamentFormCompleted={tournamentFormCompleted}
        />

        <EinzelturnierStart
          activeTournament={activeTournament}
          showCancelDialog={showCancelActiveTournamentDialog}
          onOpenCancelDialog={() => setShowCancelActiveTournamentDialog(true)}
          onCloseCancelDialog={() => setShowCancelActiveTournamentDialog(false)}
          onCancelActiveTournament={handleCancelActiveTournament}
          onContinueTournament={handleContinueTournament}
          registeredCount={registeredPlayers.length}
          tournamentMode={tournamentMode}
          tournamentSize={tournamentSize}
          rrGroupCount={rrGroupCount}
          accessLabel={accessTypeLabel(tournamentAccessType)}
          paidCount={paidCount}
          allPlayersPaid={allPlayersPaid}
          markingAllPaid={markingAllPaid}
          onMarkAllPaid={markAllPlayersPaid}
          startingTournament={startingTournament}
          canStart={Boolean(tournamentAccessType)}
          onStartTournament={handleStartTournament}
        />

        <EinzelturnierSpieler
          loading={loading}
          playerViewMode={playerViewMode}
          onPlayerViewModeChange={setPlayerViewMode}
          availableFrequentPlayers={availableFrequentPlayers}
          filteredPlayers={filteredPlayers}
          availablePlayers={availablePlayers}
          selectedPlayers={selectedPlayers}
          onPlayerSelect={handlePlayerSelect}
          getPlayerEligibility={getPlayerEligibility}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onOpenAddPlayer={openAddPlayerModal}
          tournamentFormCompleted={tournamentFormCompleted}
          eligibilityLoading={eligibilityLoading}
          isRegisteringPlayers={isRegisteringPlayers}
          registrationProgress={registrationProgress}
          onRegisterPlayers={handleRegisterPlayers}
          doubleMode={doubleMode}
          doublePlayer1Id={doublePlayer1Id}
          onDoublePlayer1Change={setDoublePlayer1Id}
          doublePlayer2Id={doublePlayer2Id}
          onDoublePlayer2Change={setDoublePlayer2Id}
          onRegisterDoubleTeam={registerDoubleTeam}
          buildDoubleTeamName={buildDoubleTeamName}
          registeredPlayers={registeredPlayers}
          paidCount={paidCount}
          allPlayersPaid={allPlayersPaid}
          markingAllPaid={markingAllPaid}
          onMarkAllPaid={markAllPlayersPaid}
          tournamentSize={tournamentSize}
          isPreRegistered={isPreRegistered}
          onTogglePaymentStatus={togglePaymentStatus}
          onUnregisterPlayer={handleUnregisterPlayer}
        />
        </div>
      </div>
    </div>
  )
}
