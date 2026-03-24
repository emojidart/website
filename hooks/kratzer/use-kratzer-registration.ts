"use client"

import { useCallback, useState } from "react"
import {
  loadRegisteredPlayers,
  clearRegisteredPlayers,
  updatePlayerPaidStatus,
  registerPlayers,
} from "@/actions/tournament"
import type { SpieldatenbankEntry } from "@/types/tournament"

interface UseKratzerRegistrationProps {
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
  showToast,
  setLoading,
  setConfirmationModalConfig,
  setIsConfirmationModalOpen,
}: UseKratzerRegistrationProps) {
  const [registeredPlayers, setRegisteredPlayers] = useState<SpieldatenbankEntry[]>([])
  const [selectedPlayersForRegistration, setSelectedPlayersForRegistration] = useState<SpieldatenbankEntry[]>([])
  const [isRegisteringPlayers, setIsRegisteringPlayers] = useState(false)

  const loadRegisteredPlayersState = useCallback(async () => {
    setLoading(true)
    try {
      const { data, success, message } = await loadRegisteredPlayers()
      if (success && data) {
        setRegisteredPlayers(data)
      } else {
        showToast("error", message)
      }
    } catch (error: any) {
      showToast("error", `Fehler beim Laden der registrierten Spieler: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [showToast, setLoading])

  const handleRegisterPlayers = useCallback(async () => {
    showToast("info", "Registrierung wird verarbeitet...")
    setIsRegisteringPlayers(true)

    try {
      const selectedPlayerIds = selectedPlayersForRegistration.map((p) => p.id)
      const { success, message } = await registerPlayers(selectedPlayerIds)

      if (success) {
        showToast("success", message)
        await loadRegisteredPlayersState()
        setSelectedPlayersForRegistration([])
      } else {
        showToast("error", message)
      }
    } catch (error: any) {
      showToast("error", `Fehler beim Registrieren: ${error.message}`)
    } finally {
      setIsRegisteringPlayers(false)
    }
  }, [selectedPlayersForRegistration, showToast, loadRegisteredPlayersState])

  const handleClearRegisteredPlayers = useCallback(async () => {
    setConfirmationModalConfig({
      title: "Registrierung löschen",
      message: "Möchten Sie alle registrierten Spieler wirklich löschen? Dies ist irreversibel.",
      onConfirm: async () => {
        setLoading(true)
        try {
          const { success, message } = await clearRegisteredPlayers()
          if (success) {
            showToast("success", message)
            await loadRegisteredPlayersState()
          } else {
            showToast("error", message)
          }
        } catch (error: any) {
          showToast("error", `Fehler beim Löschen: ${error.message}`)
        } finally {
          setLoading(false)
        }
      },
    })

    setIsConfirmationModalOpen(true)
  }, [showToast, loadRegisteredPlayersState, setConfirmationModalConfig, setIsConfirmationModalOpen, setLoading])

  const handleUpdatePlayerPaidStatus = useCallback(
    async (playerId: string, paid: boolean) => {
      setLoading(true)
      try {
        const { success, message } = await updatePlayerPaidStatus(playerId, paid)
        if (success) {
          showToast("success", message)
          await loadRegisteredPlayersState()
        } else {
          showToast("error", message)
        }
      } catch (error: any) {
        showToast("error", `Fehler beim Aktualisieren: ${error.message}`)
      } finally {
        setLoading(false)
      }
    },
    [showToast, loadRegisteredPlayersState, setLoading],
  )

  return {
    registeredPlayers,
    selectedPlayersForRegistration,
    setSelectedPlayersForRegistration,
    isRegisteringPlayers,
    loadRegisteredPlayersState,
    handleRegisterPlayers,
    handleClearRegisteredPlayers,
    handleUpdatePlayerPaidStatus,
  }
}