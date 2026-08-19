"use client"

import { useCallback, useState } from "react"
import {
  loadRegisteredPlayers,
  clearRegisteredPlayers,
  updatePlayerPaidStatus,
  markAllRegisteredPlayersPaid,
  registerPlayers,
} from "@/actions/tournament"
import type { SpieldatenbankEntry } from "@/types/tournament"

type TournamentAccessType = "" | "public" | "club_internal" | "club_external"

interface UseKratzerRegistrationProps {
  tournamentAccessType: TournamentAccessType
  showToast: (variant: "success" | "error" | "info" | "warning", description: string) => void
  setLoading: (loading: boolean) => void
  setConfirmationModalConfig: (config: {
    title: string
    message: string
    onConfirm: () => void
  }) => void
  setIsConfirmationModalOpen: (open: boolean) => void
}

export function useKratzerRegistration({
  tournamentAccessType,
  showToast,
  setLoading,
  setConfirmationModalConfig,
  setIsConfirmationModalOpen,
}: UseKratzerRegistrationProps) {
  const [registeredPlayers, setRegisteredPlayers] = useState<SpieldatenbankEntry[]>([])
  const [selectedPlayersForRegistration, setSelectedPlayersForRegistration] = useState<SpieldatenbankEntry[]>([])
  const [isRegisteringPlayers, setIsRegisteringPlayers] = useState(false)
  const [registrationAccessType, setRegistrationAccessType] = useState<TournamentAccessType>("")

  const loadRegisteredPlayersState = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false

      if (!silent) setLoading(true)

      try {
        const result = await loadRegisteredPlayers()
        const { data, success, message } = result

        if (success && data) {
          setRegisteredPlayers(data)
          setRegistrationAccessType(((result as any).accessType || "") as TournamentAccessType)
        } else {
          showToast("error", message)
        }
      } catch (error: any) {
        showToast("error", `Fehler beim Laden der registrierten Spieler: ${error.message}`)
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [showToast, setLoading],
  )

  const handleRegisterPlayers = useCallback(async () => {
    if (!tournamentAccessType) {
      showToast("warning", "Bitte zuerst die Turnierart auswählen.")
      return
    }

    showToast("info", "Registrierung wird verarbeitet...")
    setIsRegisteringPlayers(true)

    try {
      const selectedPlayerIds = selectedPlayersForRegistration.map((p) => p.id)
      const { success, message } = await registerPlayers(selectedPlayerIds, tournamentAccessType)

      if (success) {
        showToast("success", message)

        setRegisteredPlayers((previous) => {
          const existingIds = new Set(previous.map((player) => String(player.id)))
          const additions = selectedPlayersForRegistration
            .filter((player) => !existingIds.has(String(player.id)))
            .map((player) => ({
              ...player,
              paid: false,
            }))

          return [...previous, ...additions]
        })

        setRegistrationAccessType(tournamentAccessType)
        setSelectedPlayersForRegistration([])
      } else {
        showToast("error", message)
      }
    } catch (error: any) {
      showToast("error", `Fehler beim Registrieren: ${error.message}`)
    } finally {
      setIsRegisteringPlayers(false)
    }
  }, [selectedPlayersForRegistration, tournamentAccessType, showToast, loadRegisteredPlayersState])

  const handleClearRegisteredPlayers = useCallback(async () => {
    setConfirmationModalConfig({
      title: "Registrierung löschen",
      message: "Möchten Sie alle registrierten Spieler wirklich löschen? Dies ist irreversibel.",
      onConfirm: async () => {
        try {
          const { success, message } = await clearRegisteredPlayers()
          if (success) {
            showToast("success", message)
            setRegisteredPlayers([])
            setSelectedPlayersForRegistration([])
            setRegistrationAccessType("")
          } else {
            showToast("error", message)
          }
        } catch (error: any) {
          showToast("error", `Fehler beim Löschen: ${error.message}`)
        }
      },
    })

    setIsConfirmationModalOpen(true)
  }, [showToast, setConfirmationModalConfig, setIsConfirmationModalOpen])

  const handleUpdatePlayerPaidStatus = useCallback(
    async (playerId: string, paid: boolean) => {
      const previousPlayer = registeredPlayers.find((player) => String(player.id) === String(playerId))
      const previousPaid = previousPlayer?.paid ?? false

      setRegisteredPlayers((previous) =>
        previous.map((player) =>
          String(player.id) === String(playerId)
            ? { ...player, paid }
            : player,
        ),
      )

      try {
        const { success, message } = await updatePlayerPaidStatus(playerId, paid)

        if (success) {
          showToast("success", message)
          return
        }

        setRegisteredPlayers((previous) =>
          previous.map((player) =>
            String(player.id) === String(playerId)
              ? { ...player, paid: previousPaid }
              : player,
          ),
        )
        showToast("error", message)
      } catch (error: any) {
        setRegisteredPlayers((previous) =>
          previous.map((player) =>
            String(player.id) === String(playerId)
              ? { ...player, paid: previousPaid }
              : player,
          ),
        )
        showToast("error", `Fehler beim Aktualisieren: ${error.message}`)
      }
    },
    [registeredPlayers, showToast],
  )

  const handleMarkAllPlayersPaid = useCallback(async () => {
    if (registeredPlayers.length === 0) return
    if (registeredPlayers.every((player) => player.paid)) {
      showToast("info", "Alle Spieler sind bereits als bezahlt markiert.")
      return
    }

    const previousPlayers = registeredPlayers
    setRegisteredPlayers((previous) =>
      previous.map((player) => ({ ...player, paid: true })),
    )

    try {
      const { success, message } = await markAllRegisteredPlayersPaid()

      if (success) {
        showToast("success", message)
        return
      }

      setRegisteredPlayers(previousPlayers)
      showToast("error", message)
    } catch (error: any) {
      setRegisteredPlayers(previousPlayers)
      showToast("error", `Fehler beim Markieren aller Spieler als bezahlt: ${error.message}`)
    }
  }, [registeredPlayers, showToast])

  return {
    registeredPlayers,
    selectedPlayersForRegistration,
    setSelectedPlayersForRegistration,
    isRegisteringPlayers,
    registrationAccessType,
    loadRegisteredPlayersState,
    handleRegisterPlayers,
    handleClearRegisteredPlayers,
    handleUpdatePlayerPaidStatus,
    handleMarkAllPlayersPaid,
  }
}