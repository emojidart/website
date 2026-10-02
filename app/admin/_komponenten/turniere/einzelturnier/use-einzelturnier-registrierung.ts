"use client"

import { useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { verifyPlayerEligibility } from "./einzelturnier-berechtigungen"
import type { PlayerEligibility, TournamentAccessType } from "./einzelturnier-berechtigungen"
import {
  buildDoubleTeamName,
  getBasePlayerId,
  getNextDoubleEntryData,
  isDoubleEntryName,
  stripDoubleSuffix,
} from "./einzelturnier-helfer"
import {
  deleteTournamentRegistration,
  deductPlayerCredit,
  findPlayerCredit,
  insertTournamentRegistration,
  markTournamentRegistrationsPaid,
  refundTournamentCredit,
  setTournamentRegistrationPaid,
} from "./einzelturnier-registrierung"

type Player = {
  id: number
  name: string
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
  access_type?: TournamentAccessType | null
}

type CreditConfirm = {
  open: boolean
  players?: Array<{
    id: number
    name: string
    currentBalance: number
    newBalance: number
    clubPlayerId: string
  }>
  playersWithoutCredit?: number[]
  entryFee?: number
}

type RefundConfirm = {
  open: boolean
  registrationId?: number
  playerName?: string
  refundAmount?: number
}

type Options = {
  userId?: string
  availablePlayers: Player[]
  registeredPlayers: RegisteredPlayer[]
  setRegisteredPlayers: Dispatch<SetStateAction<RegisteredPlayer[]>>
  selectedPlayers: Set<number>
  setSelectedPlayers: Dispatch<SetStateAction<Set<number>>>
  tournamentEntryFee: string
  tournamentAccessType: TournamentAccessType
  tournamentFormCompleted: boolean
  allowDoubleEntry: boolean
  centralEventId: string | null
  doublePlayer1Id: string
  doublePlayer2Id: string
  setDoublePlayer1Id: Dispatch<SetStateAction<string>>
  setDoublePlayer2Id: Dispatch<SetStateAction<string>>
  getPlayerEligibility: (playerId: number | string) => PlayerEligibility
  ensurePlayersEligible: (playerIds: Array<number | string>) => Promise<boolean>
  fetchRegisteredPlayers: () => Promise<void>
  fetchFrequentPlayers: () => Promise<void>
  showCreditConfirmModal: CreditConfirm
  setShowCreditConfirmModal: Dispatch<SetStateAction<CreditConfirm>>
  setShowAlreadyRegisteredModal: Dispatch<SetStateAction<{ open: boolean; playerName?: string }>>
  setShowSuccessModal: Dispatch<SetStateAction<{ open: boolean; playerCount?: number }>>
  setShowErrorModal: Dispatch<SetStateAction<{ open: boolean }>>
  showRefundConfirmModal: RefundConfirm
  setShowRefundConfirmModal: Dispatch<SetStateAction<RefundConfirm>>
  setShowRefundSuccessModal: Dispatch<
    SetStateAction<{ open: boolean; playerName?: string; refundAmount?: number }>
  >
  setShowPaidLockModal: Dispatch<SetStateAction<{ open: boolean; playerName?: string }>>
  setSearchTerm: Dispatch<SetStateAction<string>>
}

export function useEinzelturnierRegistrierung(options: Options) {
  const {
    userId,
    availablePlayers,
    registeredPlayers,
    setRegisteredPlayers,
    selectedPlayers,
    setSelectedPlayers,
    tournamentEntryFee,
    tournamentAccessType,
    tournamentFormCompleted,
    allowDoubleEntry,
    centralEventId,
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
  } = options

  const registrationBusyRef = useRef(false)
  const [isRegisteringPlayers, setIsRegisteringPlayers] = useState(false)
  const [registrationProgress, setRegistrationProgress] = useState<{ done: number; total: number } | null>(null)
  const [markingAllPaid, setMarkingAllPaid] = useState(false)

  const buildRegistrationPayload = (
    playerId: number,
    playerName: string,
    useDoubleEntry: boolean,
  ) => {
    if (!useDoubleEntry) {
      return {
        player_id: playerId.toString(),
        player_name: stripDoubleSuffix(playerName),
      }
    }

    const nextDouble = getNextDoubleEntryData(playerId, playerName, registeredPlayers)
    return {
      player_id: nextDouble.syntheticPlayerId,
      player_name: nextDouble.syntheticPlayerName,
    }
  }

  const registerPlayersDirectly = async (playerIds: number[], entryFee: number) => {
    try {
      const successfullyRegistered: number[] = []
      let processed = 0
      setRegistrationProgress({ done: 0, total: playerIds.length })

      for (const playerId of playerIds) {
        processed += 1
        setRegistrationProgress({ done: processed, total: playerIds.length })

        const player = availablePlayers.find((item) => item.id === playerId)
        if (!player) continue

        const eligibility = await verifyPlayerEligibility(playerId, tournamentAccessType)
        if (!eligibility.eligible) {
          alert(`${player.name} kann nicht hinzugefügt werden: ${eligibility.reason}`)
          continue
        }

        const alreadyRegisteredNormally = registeredPlayers.some(
          (registration) =>
            stripDoubleSuffix(registration.player_name) === stripDoubleSuffix(player.name) &&
            !isDoubleEntryName(registration.player_name),
        )

        const shouldUseDoubleEntry = allowDoubleEntry && alreadyRegisteredNormally
        const registrationPayload = buildRegistrationPayload(
          playerId,
          player.name,
          shouldUseDoubleEntry,
        )

        const registerError = await insertTournamentRegistration({
          playerId: registrationPayload.player_id,
          playerName: registrationPayload.player_name,
          paid: false,
          entryFee,
          deductedFromCredit: false,
          accessType: tournamentAccessType,
          eventId: centralEventId,
        })

        if (registerError) {
          const message = String(registerError.message || "").toLowerCase()

          if (message.includes("duplicate")) {
            setShowAlreadyRegisteredModal({
              open: true,
              playerName: shouldUseDoubleEntry
                ? registrationPayload.player_name
                : player.name,
            })
          } else {
            throw registerError
          }
          continue
        }

        successfullyRegistered.push(playerId)
      }

      await fetchRegisteredPlayers()
      await fetchFrequentPlayers()
      setSelectedPlayers(new Set())

      if (successfullyRegistered.length > 0) {
        setShowSuccessModal({
          open: true,
          playerCount: successfullyRegistered.length,
        })
      }
    } catch (error: any) {
      console.error("[v0] Error in registerPlayersDirectly FULL:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        full: error,
      })
      alert(
        `Fehler:\nmessage=${error?.message ?? "-"}\ncode=${error?.code ?? "-"}\ndetails=${error?.details ?? "-"}\nhint=${error?.hint ?? "-"}`,
      )
      setShowErrorModal({ open: true })
    }
  }

  const handleRegisterPlayers = async () => {
    if (registrationBusyRef.current) return

    if (!tournamentFormCompleted) {
      alert("Bitte Turniername, Turnierart und Startgeld vollständig festlegen!")
      return
    }

    if (selectedPlayers.size === 0) return

    registrationBusyRef.current = true
    setIsRegisteringPlayers(true)
    setRegistrationProgress({ done: 0, total: selectedPlayers.size })

    try {
      const eligible = await ensurePlayersEligible(Array.from(selectedPlayers))
      if (!eligible) return

      const entryFee = Number.parseFloat(tournamentEntryFee) || 0
      const playersWithCredit: NonNullable<CreditConfirm["players"]> = []
      const playersWithoutCredit: number[] = []

      for (const playerId of selectedPlayers) {
        const player = availablePlayers.find((item) => item.id === playerId)
        if (!player) continue

        if (entryFee > 0) {
          const creditInfo = await findPlayerCredit(playerId)

          if (creditInfo && creditInfo.currentBalance >= entryFee) {
            playersWithCredit.push({
              id: player.id,
              name: player.name,
              currentBalance: creditInfo.currentBalance,
              newBalance: creditInfo.currentBalance - entryFee,
              clubPlayerId: creditInfo.clubPlayerId,
            })
          } else {
            playersWithoutCredit.push(playerId)
          }
        } else {
          playersWithoutCredit.push(playerId)
        }
      }

      if (playersWithCredit.length > 0) {
        setShowCreditConfirmModal({
          open: true,
          players: playersWithCredit,
          playersWithoutCredit,
          entryFee,
        })
      } else if (playersWithoutCredit.length > 0) {
        await registerPlayersDirectly(playersWithoutCredit, entryFee)
      } else {
        setShowErrorModal({ open: true })
      }
    } catch (error) {
      console.error("[v0] Error in handleRegisterPlayers:", error)
      setShowErrorModal({ open: true })
    } finally {
      registrationBusyRef.current = false
      setIsRegisteringPlayers(false)
      setRegistrationProgress(null)
    }
  }

  const registerPlayersWithoutCreditDeduction = async () => {
    if (registrationBusyRef.current) return

    registrationBusyRef.current = true
    setIsRegisteringPlayers(true)

    try {
      const entryFee = showCreditConfirmModal.entryFee || 0
      const playersWithCredit = showCreditConfirmModal.players || []
      const playersWithoutCredit = showCreditConfirmModal.playersWithoutCredit || []

      setShowCreditConfirmModal({ open: false })

      const allPlayerIds = [
        ...playersWithCredit.map((player) => player.id),
        ...playersWithoutCredit,
      ]

      await registerPlayersDirectly(allPlayerIds, entryFee)
    } catch (error) {
      console.error("[v0] Error in registerPlayersWithoutCreditDeduction:", error)
      setShowErrorModal({ open: true })
    } finally {
      registrationBusyRef.current = false
      setIsRegisteringPlayers(false)
      setRegistrationProgress(null)
    }
  }

  const registerPlayersWithCreditDeduction = async () => {
    if (registrationBusyRef.current) return

    registrationBusyRef.current = true
    setIsRegisteringPlayers(true)

    try {
      const entryFee = showCreditConfirmModal.entryFee || 0
      const playersWithCredit = showCreditConfirmModal.players || []
      const playersWithoutCredit = showCreditConfirmModal.playersWithoutCredit || []

      setShowCreditConfirmModal({ open: false })

      const totalToRegister =
        playersWithCredit.length + playersWithoutCredit.length
      let processedRegistrations = 0
      setRegistrationProgress({ done: 0, total: totalToRegister })

      for (const playerWithCredit of playersWithCredit) {
        processedRegistrations += 1
        setRegistrationProgress({
          done: processedRegistrations,
          total: totalToRegister,
        })

        const player = availablePlayers.find(
          (item) => item.id === playerWithCredit.id,
        )
        if (!player) continue

        const eligibility = await verifyPlayerEligibility(
          playerWithCredit.id,
          tournamentAccessType,
        )
        if (!eligibility.eligible) {
          alert(`${player.name} kann nicht hinzugefügt werden: ${eligibility.reason}`)
          continue
        }

        const alreadyRegisteredNormally = registeredPlayers.some(
          (registration) =>
            getBasePlayerId(registration.player_id) ===
              playerWithCredit.id.toString() &&
            !isDoubleEntryName(registration.player_name),
        )

        const shouldUseDoubleEntry =
          allowDoubleEntry && alreadyRegisteredNormally

        const registrationPayload = buildRegistrationPayload(
          playerWithCredit.id,
          player.name,
          shouldUseDoubleEntry,
        )

        const registerError = await insertTournamentRegistration({
          playerId: registrationPayload.player_id,
          playerName: registrationPayload.player_name,
          paid: true,
          entryFee,
          deductedFromCredit: true,
          accessType: tournamentAccessType,
          eventId: centralEventId,
        })

        if (registerError) {
          const message = String(registerError.message || "").toLowerCase()

          if (message.includes("duplicate")) {
            setShowAlreadyRegisteredModal({
              open: true,
              playerName: shouldUseDoubleEntry
                ? registrationPayload.player_name
                : player.name,
            })
          } else {
            throw registerError
          }
          continue
        }

        await deductPlayerCredit({
          clubPlayerId: playerWithCredit.clubPlayerId,
          amount: entryFee,
          newBalance: playerWithCredit.newBalance,
          adminId: userId,
        })
      }

      for (const playerId of playersWithoutCredit) {
        processedRegistrations += 1
        setRegistrationProgress({
          done: processedRegistrations,
          total: totalToRegister,
        })

        const player = availablePlayers.find((item) => item.id === playerId)
        if (!player) continue

        const eligibility = await verifyPlayerEligibility(
          playerId,
          tournamentAccessType,
        )
        if (!eligibility.eligible) {
          alert(`${player.name} kann nicht hinzugefügt werden: ${eligibility.reason}`)
          continue
        }

        const alreadyRegisteredNormally = registeredPlayers.some(
          (registration) =>
            stripDoubleSuffix(registration.player_name) ===
              stripDoubleSuffix(player.name) &&
            !isDoubleEntryName(registration.player_name),
        )

        const shouldUseDoubleEntry =
          allowDoubleEntry && alreadyRegisteredNormally

        const registrationPayload = buildRegistrationPayload(
          playerId,
          player.name,
          shouldUseDoubleEntry,
        )

        const registerError = await insertTournamentRegistration({
          playerId: registrationPayload.player_id,
          playerName: registrationPayload.player_name,
          paid: false,
          entryFee,
          deductedFromCredit: false,
          accessType: tournamentAccessType,
          eventId: centralEventId,
        })

        if (registerError) {
          const message = String(registerError.message || "").toLowerCase()

          if (message.includes("duplicate")) {
            setShowAlreadyRegisteredModal({
              open: true,
              playerName: shouldUseDoubleEntry
                ? registrationPayload.player_name
                : player.name,
            })
          } else {
            throw registerError
          }
          continue
        }
      }

      const totalRegistered =
        playersWithCredit.length + playersWithoutCredit.length

      await fetchRegisteredPlayers()
      await fetchFrequentPlayers()
      setSelectedPlayers(new Set())
      setShowSuccessModal({ open: true, playerCount: totalRegistered })
    } catch (error) {
      console.error("[v0] Error in registerPlayersWithCreditDeduction:", error)
      setShowErrorModal({ open: true })
    } finally {
      registrationBusyRef.current = false
      setIsRegisteringPlayers(false)
      setRegistrationProgress(null)
    }
  }

  const registerDoubleTeam = async () => {
    if (!tournamentFormCompleted) {
      alert("Bitte zuerst Turniername und Startgeld eingeben.")
      return
    }

    if (!doublePlayer1Id || !doublePlayer2Id) {
      alert("Bitte 2 Spieler auswählen.")
      return
    }

    if (doublePlayer1Id === doublePlayer2Id) {
      alert("Spieler 1 und Spieler 2 dürfen nicht identisch sein.")
      return
    }

    if (registrationBusyRef.current) return

    registrationBusyRef.current = true
    setIsRegisteringPlayers(true)
    setRegistrationProgress({ done: 0, total: 1 })

    try {
      const player1 = availablePlayers.find(
        (player) => String(player.id) === doublePlayer1Id,
      )
      const player2 = availablePlayers.find(
        (player) => String(player.id) === doublePlayer2Id,
      )

      if (!player1 || !player2) {
        alert("Spieler nicht gefunden.")
        return
      }

      const eligible = await ensurePlayersEligible([player1.id, player2.id])
      if (!eligible) return

      const sortedNames = [player1.name, player2.name].sort((a, b) =>
        a.localeCompare(b, "de"),
      )
      const baseTeamName = buildDoubleTeamName(sortedNames[0], sortedNames[1])

      const existingEntries = registeredPlayers.filter(
        (registration) =>
          stripDoubleSuffix(registration.player_name) ===
          stripDoubleSuffix(baseTeamName),
      )

      const alreadyRegisteredNormally = existingEntries.some(
        (registration) => !isDoubleEntryName(registration.player_name),
      )

      if (existingEntries.length > 0 && !allowDoubleEntry) {
        setShowAlreadyRegisteredModal({
          open: true,
          playerName: baseTeamName,
        })
        return
      }

      let finalName = baseTeamName
      let finalId = crypto.randomUUID()

      if (allowDoubleEntry && alreadyRegisteredNormally) {
        const nextDouble = getNextDoubleEntryData(
          finalId,
          baseTeamName,
          registeredPlayers,
        )
        finalName = nextDouble.syntheticPlayerName
        finalId = nextDouble.syntheticPlayerId
      }

      const entryFee = Number.parseFloat(tournamentEntryFee) || 0

      const error = await insertTournamentRegistration({
        playerId: finalId,
        playerName: finalName,
        paid: false,
        entryFee,
        deductedFromCredit: false,
        accessType: tournamentAccessType,
        eventId: centralEventId,
      })

      if (error) throw error

      setDoublePlayer1Id("")
      setDoublePlayer2Id("")

      await fetchRegisteredPlayers()
      await fetchFrequentPlayers()

      setShowSuccessModal({ open: true, playerCount: 1 })
    } catch (error) {
      console.error("Fehler beim Registrieren des Doppelteams:", error)
      setShowErrorModal({ open: true })
    } finally {
      registrationBusyRef.current = false
      setIsRegisteringPlayers(false)
      setRegistrationProgress(null)
    }
  }

  const handlePlayerSelect = (playerId: number) => {
    const eligibility = getPlayerEligibility(playerId)
    if (!eligibility.eligible) return

    const nextSelected = new Set(selectedPlayers)

    if (nextSelected.has(playerId)) {
      nextSelected.delete(playerId)
    } else {
      nextSelected.add(playerId)
      setSearchTerm("")
    }

    setSelectedPlayers(nextSelected)
  }

  const handleUnregisterPlayer = async (registrationId: number) => {
    try {
      const playerToUnregister = registeredPlayers.find(
        (player) => player.id === registrationId,
      )
      if (!playerToUnregister) return

      const deductedFromCredit =
        playerToUnregister.deducted_from_credit === true ||
        playerToUnregister.deducted_from_credit === "true"

      if (deductedFromCredit && playerToUnregister.player_id) {
        setShowRefundConfirmModal({
          open: true,
          registrationId,
          playerName: playerToUnregister.player_name,
          refundAmount: playerToUnregister.entry_fee,
        })
        return
      }

      await deleteTournamentRegistration(registrationId)
      await fetchRegisteredPlayers()
    } catch (error) {
      console.error("Fehler beim Entfernen der Registrierung:", error)
    }
  }

  const confirmRefund = async () => {
    const registrationId = showRefundConfirmModal.registrationId
    if (!registrationId) return

    try {
      const playerToUnregister = registeredPlayers.find(
        (player) => player.id === registrationId,
      )

      if (!playerToUnregister || !playerToUnregister.player_id) {
        setShowRefundConfirmModal({ open: false })
        return
      }

      const refund = await refundTournamentCredit({
        registrationId,
        playerName: playerToUnregister.player_name,
        refundAmount: playerToUnregister.entry_fee,
        adminId: userId,
      })

      if (!refund.ok) {
        console.error("[v0] Refund failed:", refund.error)
        setShowRefundConfirmModal({ open: false })
        return
      }

      setShowRefundConfirmModal({ open: false })
      setShowRefundSuccessModal({
        open: true,
        playerName: playerToUnregister.player_name,
        refundAmount: playerToUnregister.entry_fee,
      })

      await fetchRegisteredPlayers()
    } catch (error) {
      console.error("[v0] Unhandled error in confirmRefund:", error)
      setShowRefundConfirmModal({ open: false })
    }
  }

  const togglePaymentStatus = async (
    registrationId: number,
    currentStatus: boolean,
  ) => {
    try {
      const playerToToggle = registeredPlayers.find(
        (player) => player.id === registrationId,
      )

      const deductedFromCredit =
        playerToToggle?.deducted_from_credit === true ||
        playerToToggle?.deducted_from_credit === "true"

      if (deductedFromCredit && currentStatus === true) {
        setShowPaidLockModal({
          open: true,
          playerName: playerToToggle?.player_name,
        })
        return
      }

      await setTournamentRegistrationPaid(registrationId, !currentStatus)

      setRegisteredPlayers((previousPlayers) =>
        previousPlayers.map((player) =>
          player.id === registrationId
            ? { ...player, paid: !currentStatus }
            : player,
        ),
      )
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Bezahlstatus:", error)
    }
  }

  const markAllPlayersPaid = async () => {
    if (markingAllPaid) return

    const unpaidIds = registeredPlayers
      .filter((player) => !player.paid)
      .map((player) => player.id)

    if (unpaidIds.length === 0) return

    setMarkingAllPaid(true)

    try {
      await markTournamentRegistrationsPaid(unpaidIds)

      const unpaidIdSet = new Set(unpaidIds)
      setRegisteredPlayers((previousPlayers) =>
        previousPlayers.map((player) =>
          unpaidIdSet.has(player.id) ? { ...player, paid: true } : player,
        ),
      )

      await fetchRegisteredPlayers()
    } catch (error) {
      console.error("Fehler beim Markieren aller Spieler als bezahlt:", error)
      setShowErrorModal({ open: true })
    } finally {
      setMarkingAllPaid(false)
    }
  }

  return {
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
  }
}
