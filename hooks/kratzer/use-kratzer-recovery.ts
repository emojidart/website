"use client"

import { useCallback, useState } from "react"
import {
  getActiveKratzerTournament,
  getLastKratzerTournamentRound,
  getKratzerTournamentPlayers,
  updateKratzerTournamentStatus,
} from "@/actions/tournament"
import type { Board, TournamentSettings, TournamentState } from "@/types/tournament"

interface UseKratzerRecoveryProps {
  currentUser: any
  showToast: (variant: "success" | "error" | "info" | "warning", description: string) => void
  setLoading: (loading: boolean) => void
  resetTournamentState: () => void
  setTournamentState: React.Dispatch<React.SetStateAction<TournamentState>>
  startBoardTimer: (boardId: number, initialStartTime?: number | null) => void
  setIsTournamentRunning: (value: boolean) => void
}

export function useKratzerRecovery({
  currentUser,
  showToast,
  setLoading,
  resetTournamentState,
  setTournamentState,
  startBoardTimer,
  setIsTournamentRunning,
}: UseKratzerRecoveryProps) {
  const [activeTournamentExists, setActiveTournamentExists] = useState(false)
  const [recoveryTournamentData, setRecoveryTournamentData] = useState<any>(null)

  const checkForActiveTournament = useCallback(async () => {
    if (!currentUser?.id) return

    try {
      const { data, success } = await getActiveKratzerTournament()

      if (success && data) {
        setActiveTournamentExists(true)
        setRecoveryTournamentData(data)
        showToast("info", "Laufendes Turnier gefunden! Möchten Sie es wiederherstellen?")
      } else {
        setActiveTournamentExists(false)
        setRecoveryTournamentData(null)
      }
    } catch (error: any) {
      showToast("error", "Fehler beim Prüfen auf aktives Turnier.")
    } finally {
      setLoading(false)
    }
  }, [currentUser, showToast, setLoading])

  const restoreTournament = useCallback(async () => {
    if (!recoveryTournamentData) return

    setLoading(true)

    try {
      showToast("info", "Turnier wird wiederhergestellt...")

      setTournamentState((prev) => ({
        ...prev,
        tournamentId: recoveryTournamentData.id,
        currentRound: recoveryTournamentData.total_rounds || 0,
        tournamentFinished: recoveryTournamentData.status === "finished",
        settings: {
          boardCount: recoveryTournamentData.board_count,
          maxGroupSize: recoveryTournamentData.max_group_size,
          suddenDeathEnabled: recoveryTournamentData.sudden_death_enabled,
          suddenDeathTime: recoveryTournamentData.sudden_death_time,
          speechEnabled: recoveryTournamentData.speech_enabled,
        } as TournamentSettings,
      }))

      const { data: playersData, success: playersSuccess } = await getKratzerTournamentPlayers(
        recoveryTournamentData.id,
      )
      if (!playersSuccess || !playersData) throw new Error("Could not load tournament players.")

      setTournamentState((prev) => ({ ...prev, players: playersData }))

      const { data: lastRoundData, success: roundSuccess } = await getLastKratzerTournamentRound(
        recoveryTournamentData.id,
      )

      if (roundSuccess && lastRoundData?.boards_data) {
        setTournamentState((prev) => ({
          ...prev,
          boards: lastRoundData.boards_data,
          currentRound: lastRoundData.round_number,
        }))

        lastRoundData.boards_data.forEach((board: Board) => {
          if (board.startTime && board.players.length > 0) {
            startBoardTimer(board.id, board.startTime)
          }
        })
      }

      setIsTournamentRunning(true)
      setActiveTournamentExists(false)
      showToast("success", "Turnier erfolgreich wiederhergestellt!")
    } catch (error: any) {
      showToast("error", "Fehler beim Wiederherstellen des Turniers.")
      resetTournamentState()
    } finally {
      setLoading(false)
    }
  }, [
    recoveryTournamentData,
    setLoading,
    showToast,
    setTournamentState,
    startBoardTimer,
    setIsTournamentRunning,
    resetTournamentState,
  ])

  const startNewTournamentFromRecovery = useCallback(async () => {
    if (recoveryTournamentData) {
      await updateKratzerTournamentStatus(recoveryTournamentData.id, "cancelled")
      showToast("info", "Altes Turnier wurde abgebrochen.")
    }

    resetTournamentState()
    setActiveTournamentExists(false)
    setRecoveryTournamentData(null)
    showToast("info", "Bereit für ein neues Turnier!")
  }, [recoveryTournamentData, showToast, resetTournamentState])

  return {
    activeTournamentExists,
    recoveryTournamentData,
    checkForActiveTournament,
    restoreTournament,
    startNewTournamentFromRecovery,
  }
}