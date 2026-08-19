"use client"

import { RegistrationTab } from "@/components/kratzer/registration-tab"
import { BoardComponent } from "@/components/kratzer/board-component"
import { RankingsTable } from "@/components/kratzer/rankings-table"
import { NewRoundModal } from "@/components/kratzer/modals/new-round-modal"
import { ConfirmationModal } from "@/components/kratzer/modals/confirmation-modal"
import { WinnerModal } from "@/components/kratzer/modals/winner-modal"
import { LeagueStatusModal } from "@/components/kratzer/modals/league-status-modal"
import { PauseModal } from "@/components/kratzer/modals/pause-modal"
import { PrizeMoneyModal } from "@/components/kratzer/modals/prize-money-modal"
import { RecoveryBanner } from "@/components/kratzer/recovery-banner"
import { TournamentControlsCard } from "@/components/kratzer/tournament-controls-card"
import { TournamentStatsCard } from "@/components/kratzer/tournament-stats-card"
import { TournamentPageHeader } from "@/components/kratzer/tournament-page-header"
import { TournamentTabs } from "@/components/kratzer/tournament-tabs"
import { SectionCard } from "@/components/kratzer/section-card"

import { useKratzerAuth } from "@/hooks/kratzer/use-kratzer-auth"
import { useKratzerRegistration } from "@/hooks/kratzer/use-kratzer-registration"
import { useKratzerRecovery } from "@/hooks/kratzer/use-kratzer-recovery"

import { useState, useEffect, useCallback, useRef } from "react"

import { supabase } from "@/lib/supabase"
import type { KratzerPlayer, Board, TournamentSettings, TournamentState } from "@/types/tournament"
import {
  formatTime,
  shuffleArray,
  getDefaultLives,
  createBoard,
  speakText,
} from "@/utils/tournament-utils"
import {
  createKratzerTournament,
  updateKratzerTournamentPlayersData,
  saveKratzerTournamentRound,
  updateKratzerTournamentStatus,
  addTournamentResult,
  clearRegisteredPlayers,
} from "@/actions/tournament"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"

import { useToast } from "@/hooks/use-toast"
import { Trophy, Monitor, Play, Loader2 } from "lucide-react"

const defaultTournamentSettings: TournamentSettings = {
  boardCount: 5,
  maxGroupSize: 5,
  suddenDeathEnabled: false,
  suddenDeathTime: 15,
  speechEnabled: false,
}

interface PrizeMoneySettings {
  entryFee: number
  placesToPay: number
  percentages: number[]
}

type TournamentAccessType = "" | "public" | "club_internal" | "club_external"

const defaultPrizeMoneySettings: PrizeMoneySettings = {
  entryFee: 10,
  placesToPay: 4,
  percentages: [50, 30, 15, 5],
}

export function KratzerTournamentPage() {
  const { toast } = useToast()

  const { currentUser, setCurrentUser, loading, setLoading } = useKratzerAuth()

  const [tournamentState, setTournamentState] = useState<TournamentState>({
    currentRound: 0,
    tournamentId: null,
    tournamentFinished: false,
    winner: null,
    boards: [],
    players: [],
    settings: defaultTournamentSettings,
  })

  const [isTournamentRunning, setIsTournamentRunning] = useState(false)

  const [isNewRoundModalOpen, setIsNewRoundModalOpen] = useState(false)
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false)
  const [confirmationModalConfig, setConfirmationModalConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  })
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false)
  const [isLeagueStatusModalOpen, setIsLeagueStatusModalOpen] = useState(false)
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false)
  const [isPrizeMoneyModalOpen, setIsPrizeMoneyModalOpen] = useState(false)

  const [activeTab, setActiveTab] = useState<"register" | "tournament">("register")
  const [tournamentAccessType, setTournamentAccessType] = useState<TournamentAccessType>("")

  const timers = useRef<Record<number, NodeJS.Timeout>>({})
  const prizeMoneySettings = useRef<PrizeMoneySettings>(defaultPrizeMoneySettings)
  const leagueStatusLivesMap = useRef<Record<string, number>>({})
  const pauseMinutesRef = useRef<HTMLInputElement>(null)
  const initializedUserIdRef = useRef<string | null>(null)

  const showToast = useCallback(
    (variant: "success" | "error" | "info" | "warning", description: string) => {
      toast({ variant, description })
    },
    [toast],
  )

  const {
    registeredPlayers,
    selectedPlayersForRegistration,
    setSelectedPlayersForRegistration,
    isRegisteringPlayers,
    loadRegisteredPlayersState,
    handleRegisterPlayers,
    handleClearRegisteredPlayers,
    handleUpdatePlayerPaidStatus,
    handleMarkAllPlayersPaid,
    registrationAccessType,
  } = useKratzerRegistration({
    tournamentAccessType,
    showToast,
    setLoading,
    setConfirmationModalConfig,
    setIsConfirmationModalOpen,
  })

  useEffect(() => {
    if (!tournamentAccessType && registrationAccessType) {
      setTournamentAccessType(registrationAccessType)
    }
  }, [registrationAccessType, tournamentAccessType])

  const handleLogout = useCallback(async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()

    if (error) {
      showToast("error", `Abmeldung fehlgeschlagen: ${error.message}`)
    } else {
      showToast("info", "Erfolgreich abgemeldet.")
      initializedUserIdRef.current = null
      setCurrentUser(null)
      setTournamentState((prev) => ({
        ...prev,
        currentRound: 0,
        tournamentId: null,
        tournamentFinished: false,
        winner: null,
        boards: [],
        players: [],
      }))
      setIsTournamentRunning(false)
      setTournamentAccessType("")
    }

    setLoading(false)
  }, [showToast, setCurrentUser, setLoading])

  const resetTournamentState = useCallback(() => {
    Object.values(timers.current).forEach(clearInterval)
    timers.current = {}

    setTournamentState({
      currentRound: 0,
      tournamentId: null,
      tournamentFinished: false,
      winner: null,
      boards: [],
      players: [],
      settings: defaultTournamentSettings,
    })

    setIsTournamentRunning(false)
  }, [])

  const finishTournament = useCallback(
    async (winnerPlayer: KratzerPlayer) => {
      setTournamentState((prev) => ({
        ...prev,
        tournamentFinished: true,
        winner: winnerPlayer,
      }))
      setIsWinnerModalOpen(true)
      setIsTournamentRunning(false)

      Object.values(timers.current).forEach(clearInterval)
      timers.current = {}

      if (tournamentState.tournamentId) {
        await updateKratzerTournamentStatus(
          tournamentState.tournamentId,
          "finished",
          winnerPlayer.id,
          winnerPlayer.name,
          tournamentState.currentRound,
        )

        const sortedPlayers = [...tournamentState.players].sort((a, b) => {
          if (a.isEliminated && !b.isEliminated) return 1
          if (!a.isEliminated && b.isEliminated) return -1
          return b.lives - a.lives
        })

        const resultsData = sortedPlayers.map((player, index) => ({
          rank: index + 1,
          name: player.name,
          ligastatus: player.ligastatus,
          lives: player.lives,
          isEliminated: player.isEliminated,
          eliminationRound: player.eliminationRound,
          eliminationTime: player.eliminationTime,
        }))

        await addTournamentResult(
          tournamentState.tournamentId,
          winnerPlayer.id,
          winnerPlayer.name,
          tournamentState.currentRound,
          resultsData,
        )
      }

      showToast("success", `${winnerPlayer.name} ist der Turniersieger!`)
    },
    [tournamentState, showToast],
  )

  const startNewRound = useCallback(async () => {
    if (tournamentState.tournamentFinished) {
      showToast("warning", "Das Turnier ist bereits beendet.")
      return
    }

    const activePlayers = tournamentState.players.filter((p) => !p.isEliminated)

    if (activePlayers.length <= 1) {
      if (activePlayers.length === 1) {
        finishTournament(activePlayers[0])
      } else {
        showToast("info", "Alle Spieler sind ausgeschieden. Kein Gewinner.")
      }
      return
    }

    const currentBoardCount = tournamentState.settings.boardCount
    const currentMaxGroupSize = tournamentState.settings.maxGroupSize
    const maxCapacity = currentBoardCount * currentMaxGroupSize

    if (maxCapacity < activePlayers.length) {
      showToast(
        "error",
        `Nicht genügend Plätze für Runde ${tournamentState.currentRound + 1}! Benötigt: ${activePlayers.length}, Verfügbar: ${maxCapacity}. Bitte passen Sie die Einstellungen an.`,
      )
      return
    }

    setIsNewRoundModalOpen(true)
  }, [tournamentState, showToast, finishTournament])

  const handleSuddenDeathTimeout = useCallback(
    async (boardId: number, boardPlayers: KratzerPlayer[]) => {
      showToast("warning", `Sudden Death: Zeit abgelaufen für Board ${boardId}!`)

      const updatedPlayers = tournamentState.players.map((p) => {
        const playerOnBoard = boardPlayers.find((bp) => bp.id === p.id)

        if (playerOnBoard) {
          const newLives = p.lives - 1

          if (newLives <= 0) {
            return {
              ...p,
              lives: 0,
              isEliminated: true,
              eliminationRound: tournamentState.currentRound,
              eliminationTime: new Date().toISOString(),
            }
          }

          return { ...p, lives: newLives }
        }

        return p
      })

      setTournamentState((prev) => ({
        ...prev,
        players: updatedPlayers,
        boards: prev.boards.filter((b) => b.id !== boardId),
      }))

      if (tournamentState.tournamentId) {
        await updateKratzerTournamentPlayersData(tournamentState.tournamentId, updatedPlayers)
      }

      const remainingPlayers = updatedPlayers.filter((p) => !p.isEliminated)

      if (remainingPlayers.length === 1 && !tournamentState.tournamentFinished) {
        finishTournament(remainingPlayers[0])
      } else if (tournamentState.boards.filter((b) => b.id !== boardId).every((b) => b.players.length === 0)) {
        showToast("info", "Alle Spiele beendet. Starte nächste Runde...")
        startNewRound()
      }
    },
    [tournamentState, showToast, finishTournament, startNewRound],
  )

  const finishGame = useCallback(
    async (boardId: number, selectedPlayerNames: string[]) => {
      const board = tournamentState.boards.find((b) => b.id === boardId)
      if (!board) return

      clearInterval(timers.current[boardId])
      delete timers.current[boardId]

      const updatedPlayers = tournamentState.players.map((p) => {
        const isSelected = selectedPlayerNames.includes(p.name)

        if (isSelected) {
          const newLives = p.lives - 1

          if (newLives <= 0) {
            return {
              ...p,
              lives: 0,
              isEliminated: true,
              eliminationRound: tournamentState.currentRound,
              eliminationTime: new Date().toISOString(),
            }
          }

          return { ...p, lives: newLives }
        }

        return p
      })

      setTournamentState((prev) => ({
        ...prev,
        players: updatedPlayers,
        boards: prev.boards.filter((b) => b.id !== boardId),
      }))

      if (tournamentState.tournamentId) {
        await updateKratzerTournamentPlayersData(tournamentState.tournamentId, updatedPlayers)
      }

      const remainingPlayersOverall = updatedPlayers.filter((p) => !p.isEliminated)

      if (remainingPlayersOverall.length === 1) {
        finishTournament(remainingPlayersOverall[0])
        return
      }

      const allBoardsFinished = tournamentState.boards
        .filter((b) => b.id !== boardId)
        .every((b) => b.players.length === 0)

      if (allBoardsFinished) {
        showToast("info", "Alle Spiele der Runde beendet. Starte nächste Runde...")
        startNewRound()
      } else {
        showToast("success", `Spiel auf Board ${boardId} beendet.`)
      }
    },
    [tournamentState, showToast, startNewRound, finishTournament],
  )

  const editPlayerLives = useCallback(
    async (playerId: string, newLives: number) => {
      setLoading(true)

      const updatedPlayers = tournamentState.players.map((p) => {
        if (p.id === playerId) {
          const wasEliminated = p.isEliminated
          const isNowEliminated = newLives === 0

          return {
            ...p,
            lives: newLives,
            isEliminated: isNowEliminated,
            eliminationRound:
              !wasEliminated && isNowEliminated
                ? tournamentState.currentRound
                : wasEliminated && !isNowEliminated
                  ? null
                  : p.eliminationRound,
            eliminationTime:
              !wasEliminated && isNowEliminated
                ? new Date().toISOString()
                : wasEliminated && !isNowEliminated
                  ? null
                  : p.eliminationTime,
          }
        }

        return p
      })

      setTournamentState((prev) => ({ ...prev, players: updatedPlayers }))

      if (tournamentState.tournamentId) {
        await updateKratzerTournamentPlayersData(tournamentState.tournamentId, updatedPlayers)
      }

      const remainingPlayers = updatedPlayers.filter((p) => !p.isEliminated)

      if (remainingPlayers.length === 1 && !tournamentState.tournamentFinished) {
        finishTournament(remainingPlayers[0])
      }

      showToast("success", "Spielerleben aktualisiert.")
      setLoading(false)
    },
    [tournamentState, showToast, finishTournament, setLoading],
  )

  const togglePlayerElimination = useCallback(
    async (playerId: string) => {
      setLoading(true)

      const updatedPlayers = tournamentState.players.map((p) => {
        if (p.id === playerId) {
          const newEliminationStatus = !p.isEliminated

          return {
            ...p,
            isEliminated: newEliminationStatus,
            eliminationRound: newEliminationStatus ? tournamentState.currentRound : null,
            eliminationTime: newEliminationStatus ? new Date().toISOString() : null,
            lives: !newEliminationStatus && p.lives === 0 ? 1 : p.lives,
          }
        }

        return p
      })

      setTournamentState((prev) => ({ ...prev, players: updatedPlayers }))

      try {
        const playerToUpdate = updatedPlayers.find((p) => p.id === playerId)

        if (playerToUpdate) {
          const { error } = await supabase
            .from("kratzer_tournament_players")
            .update({
              lives: playerToUpdate.lives,
              is_eliminated: playerToUpdate.isEliminated,
              elimination_round: playerToUpdate.eliminationRound,
              elimination_time: playerToUpdate.eliminationTime,
            })
            .eq("player_id", playerId)

          if (error) throw error

          showToast("success", "Spielerstatus erfolgreich geändert!")
        }
      } catch (err: any) {
        showToast("error", `Fehler beim Ändern des Spielerstatus: ${err.message}`)
        console.error("Error toggling player elimination:", err)
      } finally {
        setLoading(false)
      }
    },
    [tournamentState.players, tournamentState.currentRound, showToast, setLoading],
  )

  const cancelGame = useCallback(
    async (boardId: number) => {
      setConfirmationModalConfig({
        title: "Spiel abbrechen",
        message: "Möchten Sie dieses Spiel wirklich abbrechen?",
        onConfirm: async () => {
          clearInterval(timers.current[boardId])
          delete timers.current[boardId]

          setTournamentState((prev) => ({
            ...prev,
            boards: prev.boards.filter((b) => b.id !== boardId),
          }))

          if (tournamentState.boards.filter((b) => b.id !== boardId).every((b) => b.players.length === 0)) {
            showToast("info", "Alle Spiele beendet. Starte nächste Runde...")
            startNewRound()
          } else {
            showToast("info", `Spiel auf Board ${boardId} abgebrochen.`)
          }
        },
      })

      setIsConfirmationModalOpen(true)
    },
    [tournamentState.boards, showToast, startNewRound],
  )

  const startBoardTimer = useCallback(
    (boardId: number, initialStartTime: number | null = null) => {
      const board = tournamentState.boards.find((b) => b.id === boardId)
      if (!board) return

      const startTime = initialStartTime || Date.now()

      setTournamentState((prev) => ({
        ...prev,
        boards: prev.boards.map((b) => (b.id === boardId ? { ...b, startTime } : b)),
      }))

      if (timers.current[boardId]) clearInterval(timers.current[boardId])

      timers.current[boardId] = setInterval(() => {
        const elapsedTime = Date.now() - startTime
        const timeLimit = tournamentState.settings.suddenDeathTime * 60 * 1000

        const boardElement = document.querySelector(`[data-board-id="${boardId}"]`)
        const timerElement = boardElement?.querySelector(".board-timer")

        if (timerElement) {
          timerElement.textContent = formatTime(elapsedTime)

          if (tournamentState.settings.suddenDeathEnabled) {
            const remainingTime = timeLimit - elapsedTime

            timerElement.classList.remove("warning", "critical")

            if (remainingTime <= 60000) timerElement.classList.add("critical")
            else if (remainingTime <= 180000) timerElement.classList.add("warning")

            if (elapsedTime >= timeLimit) {
              clearInterval(timers.current[boardId])
              delete timers.current[boardId]

              handleSuddenDeathTimeout(boardId, board.players)
            }
          }
        }
      }, 1000)
    },
    [tournamentState.boards, tournamentState.settings, handleSuddenDeathTimeout],
  )

  const {
    activeTournamentExists,
    recoveryTournamentData,
    checkForActiveTournament,
    restoreTournament,
    startNewTournamentFromRecovery,
  } = useKratzerRecovery({
    currentUser,
    showToast,
    setLoading,
    resetTournamentState,
    setTournamentState,
    startBoardTimer,
    setIsTournamentRunning,
  })

  useEffect(() => {
    const userId = currentUser?.id
    if (!userId) {
      initializedUserIdRef.current = null
      return
    }

    // Erst ausführen, nachdem useKratzerRecovery initialisiert wurde.
    if (initializedUserIdRef.current === userId) return
    initializedUserIdRef.current = userId

    void Promise.all([
      checkForActiveTournament(),
      loadRegisteredPlayersState(),
    ])
  }, [currentUser?.id, checkForActiveTournament, loadRegisteredPlayersState])

  const startTournament = useCallback(async () => {
    if (isTournamentRunning) {
      showToast("warning", "Turnier läuft bereits.")
      return
    }

    if (tournamentState.tournamentFinished) {
      showToast("warning", "Das Turnier ist bereits beendet. Bitte starten Sie ein neues Turnier.")
      return
    }

    if (!tournamentAccessType) {
      showToast("warning", "Bitte zuerst die Turnierart auswählen.")
      setActiveTab("register")
      return
    }

    if (registeredPlayers.length === 0) {
      showToast("warning", "Keine Spieler registriert. Bitte registrieren Sie Spieler zuerst.")
      return
    }

    const initialPlayers: KratzerPlayer[] = registeredPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      ligastatus: p.ligastatus || "N/A",
      lives: getDefaultLives(p.ligastatus || "N/A"),
      isEliminated: false,
      eliminationRound: null,
      eliminationTime: null,
    }))

    const { boardCount, maxGroupSize } = tournamentState.settings

    if (boardCount * maxGroupSize < initialPlayers.length) {
      showToast(
        "error",
        "Nicht genügend Plätze für alle Spieler. Bitte erhöhen Sie die Anzahl der Automaten oder die maximale Gruppengröße.",
      )
      return
    }

    setLoading(true)

    try {
      const { success, message, data } = await createKratzerTournament(
        tournamentState.settings,
        initialPlayers,
        tournamentAccessType,
        currentUser.id,
      )

      if (!success || !data?.tournamentId) throw new Error(message)

      setTournamentState((prev) => ({
        ...prev,
        tournamentId: data.tournamentId,
        players: initialPlayers,
      }))

      setIsTournamentRunning(true)
      showToast("success", "Turnier erfolgreich gestartet!")
      startNewRound()
    } catch (error: any) {
      console.error("Error starting tournament:", error.message)
      showToast("error", `Fehler beim Starten des Turniers: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [
    currentUser,
    registeredPlayers,
    isTournamentRunning,
    tournamentState.tournamentFinished,
    tournamentState.settings,
    tournamentAccessType,
    showToast,
    startNewRound,
    setLoading,
  ])

  const executeNewRound = useCallback(async () => {
    setIsNewRoundModalOpen(false)
    setLoading(true)

    const nextRoundNumber = tournamentState.currentRound + 1
    const { boardCount, maxGroupSize, speechEnabled } = tournamentState.settings
    const activePlayers = shuffleArray(tournamentState.players.filter((p) => !p.isEliminated))

    const newBoards: Board[] = []
    for (let i = 1; i <= boardCount; i++) {
      newBoards.push(createBoard(i))
    }

    let playerIndex = 0
    while (playerIndex < activePlayers.length) {
      for (const board of newBoards) {
        if (playerIndex >= activePlayers.length) break
        if (board.players.length < maxGroupSize) {
          board.players.push(activePlayers[playerIndex])
          playerIndex++
        }
      }
    }

    const boardsToSave = newBoards.filter((b) => b.players.length > 0)

    try {
      if (tournamentState.tournamentId) {
        const { success, message } = await saveKratzerTournamentRound(
          tournamentState.tournamentId,
          nextRoundNumber,
          boardsToSave,
        )

        if (!success) throw new Error(message)
      }

      setTournamentState((prev) => ({
        ...prev,
        currentRound: nextRoundNumber,
        boards: boardsToSave,
      }))

      showToast("success", `Runde ${nextRoundNumber} gestartet!`)

      if (speechEnabled) {
        speakText(
          `Runde ${nextRoundNumber} wurde gestartet. ${activePlayers.length} Spieler verbleibend.`,
          speechEnabled,
        )
      }
    } catch (error: any) {
      console.error("Error executing new round:", error.message)
      showToast("error", `Fehler beim Starten der Runde: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [tournamentState, showToast, setLoading])

  const completeTournament = useCallback(async () => {
    if (!tournamentState.tournamentId) return

    showToast("info", "Turnier wird abgeschlossen und Daten finalisiert...")
    await updateKratzerTournamentStatus(tournamentState.tournamentId, "finished")
    await clearRegisteredPlayers()
    showToast("success", "Turnier erfolgreich abgeschlossen. Weiterleitung zur Spielerdatenbank.")
    window.location.href = "/spielerdatenbank"
  }, [tournamentState.tournamentId, showToast])

  const confirmCancelTournament = useCallback(() => {
    setConfirmationModalConfig({
      title: "Turnier abbrechen",
      message: "Sind Sie sicher, dass Sie das gesamte Turnier abbrechen möchten? Alle Daten gehen verloren.",
      onConfirm: async () => {
        if (tournamentState.tournamentId) {
          await updateKratzerTournamentStatus(tournamentState.tournamentId, "cancelled")
          await clearRegisteredPlayers()
          showToast("info", "Turnier abgebrochen.")
        }

        resetTournamentState()
        showToast("info", "Turnier abgebrochen. Sie werden zur Kratzer - Startseite weitergeleitet.")
        window.location.href = "/kratzer-tournament"
      },
    })

    setIsConfirmationModalOpen(true)
  }, [tournamentState.tournamentId, showToast, resetTournamentState])

  const handleSettingsChange = useCallback((key: keyof TournamentSettings, value: any) => {
    setTournamentState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value,
      },
    }))
  }, [])

  const togglePause = useCallback(() => {
    setIsPauseModalOpen(true)
  }, [])

  const startPauseTimer = useCallback(
    (minutes: number) => {
      setIsPauseModalOpen(false)
      showToast("info", `Pause für ${minutes} Minuten gestartet.`)

      setTimeout(() => {
        showToast("info", "Pause beendet!")
      }, minutes * 60 * 1000)
    },
    [showToast],
  )

  const showLeagueStatusModal = useCallback(() => {
    setIsLeagueStatusModalOpen(true)
  }, [])

  const saveLeagueStatusLives = useCallback(
    async (updatedLivesMap: Record<string, number>) => {
      setIsLeagueStatusModalOpen(false)
      setLoading(true)

      const updatedPlayers = tournamentState.players.map((p) => {
        if (!p.isEliminated && p.ligastatus && updatedLivesMap[p.ligastatus] !== undefined) {
          return { ...p, lives: updatedLivesMap[p.ligastatus] }
        }

        return p
      })

      setTournamentState((prev) => ({ ...prev, players: updatedPlayers }))

      if (tournamentState.tournamentId) {
        await updateKratzerTournamentPlayersData(tournamentState.tournamentId, updatedPlayers)
      }

      showToast("success", "Leben pro Ligastatus aktualisiert.")
      setLoading(false)
    },
    [tournamentState, showToast, setLoading],
  )

  const showPrizeMoneyModal = useCallback(() => {
    setIsPrizeMoneyModalOpen(true)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary-dark" />
        <p className="mt-4 text-gray-700 text-lg font-semibold">Lade Turnierdaten...</p>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <main className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow">
          <Card className="w-full max-w-md p-6 shadow-lg">
            <CardTitle className="text-2xl font-bold text-center mb-6">Zugriff erforderlich</CardTitle>
            <CardContent className="text-center">
              <p className="mb-4 text-gray-700">Bitte melden Sie sich an, um auf das Kratzer-Turnier zuzugreifen.</p>
              <Button onClick={() => (window.location.href = "/spielerdatenbank")} className="w-full">
                Zur Anmeldung
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      <Header />

      <main className="mx-auto max-w-[1800px] p-6 pt-16 flex-grow w-full">
        <TournamentPageHeader
          title="Kratzer Turnier"
          subtitle="Turnierverwaltung und Spielersteuerung"
        />

        <TournamentTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === "register" ? (
          <RegistrationTab
            currentUser={currentUser}
            tournamentAccessType={tournamentAccessType}
            setTournamentAccessType={setTournamentAccessType}
            registeredPlayers={registeredPlayers}
            selectedPlayersForRegistration={selectedPlayersForRegistration}
            setSelectedPlayersForRegistration={setSelectedPlayersForRegistration}
            handleRegisterPlayers={handleRegisterPlayers}
            handleClearRegisteredPlayers={handleClearRegisteredPlayers}
            handleUpdatePlayerPaidStatus={handleUpdatePlayerPaidStatus}
            handleMarkAllPlayersPaid={handleMarkAllPlayersPaid}
            isRegisteringPlayers={isRegisteringPlayers}
            loading={loading}
          />
        ) : (
          <>
            {activeTournamentExists && recoveryTournamentData && (
              <RecoveryBanner
                recoveryTournamentData={recoveryTournamentData}
                onRestore={restoreTournament}
                onStartNew={startNewTournamentFromRecovery}
              />
            )}

            <TournamentControlsCard
              settings={tournamentState.settings}
              isTournamentRunning={isTournamentRunning}
              tournamentFinished={tournamentState.tournamentFinished}
              loading={loading}
              activeTournamentExists={activeTournamentExists}
              currentRound={tournamentState.currentRound}
              registeredPlayersCount={registeredPlayers.length}
              onSettingsChange={handleSettingsChange}
              onStartTournament={startTournament}
              onStartNewRound={startNewRound}
              onShowLeagueStatus={showLeagueStatusModal}
              onShowPrizeMoney={showPrizeMoneyModal}
              onTogglePause={togglePause}
              onFinishTournament={() =>
                finishTournament(
                  tournamentState.winner || tournamentState.players.filter((p) => !p.isEliminated)[0],
                )
              }
              onCancelTournament={confirmCancelTournament}
            />

            <TournamentStatsCard
              players={tournamentState.players}
              currentRound={tournamentState.currentRound}
              tournamentFinished={tournamentState.tournamentFinished}
              winner={tournamentState.winner}
            />

            <SectionCard
              title="Aktuelle Runde"
              icon={<Monitor className="h-6 w-6 text-gray-600" />}
            >
              {tournamentState.boards.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">Keine aktive Runde.</p>
                  <p className="text-gray-500 text-sm mt-2">Starte eine neue Runde, um Spiele zu beginnen.</p>
                  <Button onClick={startNewRound} className="mt-6 bg-primary hover:bg-primary-dark">
                    <Play className="h-4 w-4 mr-2" />
                    Neue Runde starten
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tournamentState.boards.map((board) => (
                    <BoardComponent
                      key={board.id}
                      board={board}
                      suddenDeathEnabled={tournamentState.settings.suddenDeathEnabled}
                      suddenDeathTime={tournamentState.settings.suddenDeathTime}
                      speechEnabled={tournamentState.settings.speechEnabled}
                      onStartGame={startBoardTimer}
                      onFinishGame={finishGame}
                      onCancelGame={cancelGame}
                      onMakeCall={speakText}
                      currentRound={tournamentState.currentRound}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Rangliste"
              icon={<Trophy className="h-6 w-6 text-gray-600" />}
            >
              <RankingsTable
                players={tournamentState.players}
                currentRound={tournamentState.currentRound}
                onEditPlayerLives={editPlayerLives}
                onTogglePlayerElimination={togglePlayerElimination}
                loading={loading}
              />
            </SectionCard>
          </>
        )}
      </main>

      <NewRoundModal
        open={isNewRoundModalOpen}
        onOpenChange={setIsNewRoundModalOpen}
        currentRound={tournamentState.currentRound}
        settings={tournamentState.settings}
        players={tournamentState.players}
        onSettingsChange={handleSettingsChange}
        onExecuteRound={executeNewRound}
      />

      <ConfirmationModal
        open={isConfirmationModalOpen}
        onOpenChange={setIsConfirmationModalOpen}
        title={confirmationModalConfig.title}
        message={confirmationModalConfig.message}
        onConfirm={confirmationModalConfig.onConfirm}
      />

      <WinnerModal
        open={isWinnerModalOpen}
        onOpenChange={setIsWinnerModalOpen}
        winner={tournamentState.winner}
        currentRound={tournamentState.currentRound}
        onComplete={completeTournament}
      />

      <LeagueStatusModal
        open={isLeagueStatusModalOpen}
        onOpenChange={setIsLeagueStatusModalOpen}
        players={tournamentState.players}
        leagueStatusLivesMap={leagueStatusLivesMap}
        onSave={saveLeagueStatusLives}
      />

      <PauseModal
        open={isPauseModalOpen}
        onOpenChange={setIsPauseModalOpen}
        pauseMinutesRef={pauseMinutesRef}
        onStartPause={startPauseTimer}
      />

      <PrizeMoneyModal
        open={isPrizeMoneyModalOpen}
        onOpenChange={setIsPrizeMoneyModalOpen}
        registeredPlayers={registeredPlayers}
        prizeMoneySettings={prizeMoneySettings}
      />
    </div>
  )
}