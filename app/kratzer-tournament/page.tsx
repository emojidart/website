"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  createKratzerTournament,
  updateKratzerTournamentPlayersData,
  saveKratzerTournamentRound,
  updateKratzerTournamentStatus,
  getActiveKratzerTournament,
  getLastKratzerTournamentRound,
  getKratzerTournamentPlayers,
  addTournamentResult,
  loadRegisteredPlayers,
  clearRegisteredPlayers,
  updatePlayerPaidStatus,
  registerPlayers,
} from "@/actions/tournament"
import { supabase } from "@/lib/supabase"
import type { KratzerPlayer, Board, TournamentSettings, TournamentState, SpieldatenbankEntry } from "@/types/tournament"
import {
  formatTime,
  shuffleArray,
  getDefaultLives,
  createBoard,
  speakText,
  calculatePrizeMoney,
} from "@/utils/tournament-utils"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast" // Changed from "@/lib/use-toast"
import {
  Settings,
  BarChart3,
  Calendar,
  Users,
  UserCheck,
  UserX,
  RefreshCcw,
  Play,
  Heart,
  Pause,
  Flag,
  XCircle,
  Monitor,
  Trophy,
  AlertTriangle,
  Loader2,
  CircleCheck,
  PlusCircle,
  List,
  Euro,
  Info,
  Trash2,
} from "lucide-react"

// Default settings for tournament
const defaultTournamentSettings: TournamentSettings = {
  boardCount: 5,
  maxGroupSize: 5,
  suddenDeathEnabled: false,
  suddenDeathTime: 15, // minutes
  speechEnabled: false,
}

interface PrizeMoneySettings {
  entryFee: number
  placesToPay: number
  percentages: number[]
}

const defaultPrizeMoneySettings: PrizeMoneySettings = {
  entryFee: 10,
  placesToPay: 4,
  percentages: [50, 30, 15, 5],
}

export default function KratzerTournamentPage() {
  const { toast } = useToast()

  const [currentUser, setCurrentUser] = useState<any>(null) // Supabase User
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)

  const [tournamentState, setTournamentState] = useState<TournamentState>({
    currentRound: 0,
    tournamentId: null,
    tournamentFinished: false,
    winner: null,
    boards: [],
    players: [], // All players in the tournament
    settings: defaultTournamentSettings,
  })

  const [activeTournamentExists, setActiveTournamentExists] = useState(false)
  const [recoveryTournamentData, setRecoveryTournamentData] = useState<any>(null)
  const [isTournamentRunning, setIsTournamentRunning] = useState(false)

  // Modals state
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

  // Player registration state
  const [registeredPlayers, setRegisteredPlayers] = useState<SpieldatenbankEntry[]>([])
  const [selectedPlayersForRegistration, setSelectedPlayersForRegistration] = useState<SpieldatenbankEntry[]>([])
  const [activeTab, setActiveTab] = useState<"register" | "tournament">("register") // New tab for registration
  const [isRegisteringPlayers, setIsRegisteringPlayers] = useState(false)

  const timers = useRef<Record<number, NodeJS.Timeout>>({})
  const prizeMoneySettings = useRef<PrizeMoneySettings>(defaultPrizeMoneySettings)
  const leagueStatusLivesMap = useRef<Record<string, number>>({})
  const pauseMinutesRef = useRef<HTMLInputElement>(null)

  // --- Auth & Initial Data Loading ---
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)
      setLoading(false)
    }

    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null)
      setLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (currentUser) {
      checkForActiveTournament()
      loadRegisteredPlayersState()
    }
  }, [currentUser])

  const loadUserProfile = useCallback(async () => {
    if (!currentUser?.id) return
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", currentUser.id).single()

      if (error && error.code !== "PGRST116") throw error // PGRST116 means no rows found (profile not created yet)
      setUserProfile(data || {})
    } catch (error: any) {
      console.error("Profile loading error:", error.message)
    }
  }, [currentUser])

  const updateUserInfo = useCallback(() => {
    if (userProfile && currentUser) {
      const displayName =
        userProfile.vorname && userProfile.nachname
          ? `${userProfile.vorname} ${userProfile.nachname}`
          : currentUser.email
      // This part would typically be handled by a Header component that takes props
      // For now, assume Header manages its own display based on auth context.
    }
  }, [userProfile, currentUser])

  const handleLogout = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast({ variant: "destructive", description: `Abmeldung fehlgeschlagen: ${error.message}` })
    } else {
      toast({ variant: "info", description: "Erfolgreich abgemeldet." })
      setCurrentUser(null)
      setUserProfile(null)
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
      setActiveTournamentExists(false)
      setRecoveryTournamentData(null)
    }
    setLoading(false)
  }

  // --- Tournament Recovery / Check for Active Tournament ---
  const checkForActiveTournament = useCallback(async () => {
    if (!currentUser?.id) return
    try {
      const { data, success, message } = await getActiveKratzerTournament()
      if (success && data) {
        setActiveTournamentExists(true)
        setRecoveryTournamentData(data)
        toast({ variant: "info", description: "Laufendes Turnier gefunden! Möchten Sie es wiederherstellen?" })
      } else {
        setActiveTournamentExists(false)
        setRecoveryTournamentData(null)
      }
    } catch (error: any) {
      console.error("Error checking for active tournament:", error.message)
      toast({ variant: "destructive", description: "Fehler beim Prüfen auf aktives Turnier." })
    } finally {
      setLoading(false)
    }
  }, [currentUser, toast])

  const restoreTournament = useCallback(async () => {
    if (!recoveryTournamentData) return
    setLoading(true)
    try {
      toast({ variant: "info", description: "Turnier wird wiederhergestellt..." })
      setTournamentState((prev) => ({
        ...prev,
        tournamentId: recoveryTournamentData.id,
        currentRound: recoveryTournamentData.total_rounds || 0, // Restore current round if available
        tournamentFinished: recoveryTournamentData.status === "finished",
        settings: {
          boardCount: recoveryTournamentData.board_count,
          maxGroupSize: recoveryTournamentData.max_group_size,
          suddenDeathEnabled: recoveryTournamentData.sudden_death_enabled,
          suddenDeathTime: recoveryTournamentData.sudden_death_time,
          speechEnabled: recoveryTournamentData.speech_enabled,
        },
      }))

      // Load players for the recovered tournament
      const { data: playersData, success: playersSuccess } = await getKratzerTournamentPlayers(
        recoveryTournamentData.id,
      )
      if (!playersSuccess || !playersData) throw new Error("Could not load tournament players.")

      setTournamentState((prev) => ({ ...prev, players: playersData }))

      // Load the last round's board data
      const { data: lastRoundData, success: roundSuccess } = await getLastKratzerTournamentRound(
        recoveryTournamentData.id,
      )
      if (roundSuccess && lastRoundData?.boards_data) {
        setTournamentState((prev) => ({
          ...prev,
          boards: lastRoundData.boards_data,
          currentRound: lastRoundData.round_number,
        }))
        // Restart timers for active boards
        lastRoundData.boards_data.forEach((board: Board) => {
          if (board.startTime && board.players.length > 0) {
            startBoardTimer(board.id, board.startTime)
          }
        })
      }

      setIsTournamentRunning(true)
      setActiveTournamentExists(false)
      toast({ variant: "success", description: "Turnier erfolgreich wiederhergestellt!" })
    } catch (error: any) {
      console.error("Error restoring tournament:", error.message)
      toast({ variant: "destructive", description: "Fehler beim Wiederherstellen des Turniers." })
      resetTournamentState()
    } finally {
      setLoading(false)
    }
  }, [recoveryTournamentData, toast])

  const startNewTournamentFromRecovery = useCallback(async () => {
    if (recoveryTournamentData) {
      await updateKratzerTournamentStatus(recoveryTournamentData.id, "cancelled")
      toast({ variant: "info", description: "Altes Turnier wurde abgebrochen." })
    }
    resetTournamentState()
    setActiveTournamentExists(false)
    setRecoveryTournamentData(null)
    toast({ variant: "info", description: "Bereit für ein neues Turnier!" })
  }, [recoveryTournamentData, toast])

  const resetTournamentState = useCallback(() => {
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
    // Clear all timers
    Object.values(timers.current).forEach(clearInterval)
    timers.current = {}
    clearRegisteredPlayers() // Also clear registered players for a fresh start
  }, [])

  // --- Core Tournament Logic ---

  // 1. finishTournament (depends on nothing from this group)
  const finishTournament = useCallback(
    async (winnerPlayer: KratzerPlayer) => {
      setTournamentState((prev) => ({
        ...prev,
        tournamentFinished: true,
        winner: winnerPlayer,
      }))
      setIsWinnerModalOpen(true)
      setIsTournamentRunning(false) // Tournament is finished

      // Stop all timers
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

        // Store detailed results
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
      toast({ variant: "success", description: `${winnerPlayer.name} ist der Turniersieger!` })
    },
    [tournamentState, toast],
  )

  // 2. handleSuddenDeathTimeout (depends on finishTournament)
  const handleSuddenDeathTimeout = useCallback(
    async (boardId: number, boardPlayers: KratzerPlayer[]) => {
      toast({ variant: "warning", description: `Sudden Death: Zeit abgelaufen für Board ${boardId}!` })

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
        toast({ variant: "info", description: "Alle Spiele beendet. Starte nächste Runde..." })
        startNewRound() // This will be defined below
      }
    },
    [tournamentState, toast, finishTournament], // startNewRound will be added to dependencies later
  )

  // 3. startNewRound (depends on finishTournament)
  const startNewRound = useCallback(async () => {
    if (tournamentState.tournamentFinished) {
      toast({ variant: "warning", description: "Das Turnier ist bereits beendet." })
      return
    }

    const activePlayers = tournamentState.players.filter((p) => !p.isEliminated)

    if (activePlayers.length <= 1) {
      if (activePlayers.length === 1) {
        finishTournament(activePlayers[0])
      } else {
        toast({ variant: "info", description: "Alle Spieler sind ausgeschieden. Kein Gewinner." })
        // Optionally, reset tournament or mark as finished with no winner
        // updateKratzerTournamentStatus(tournamentState.tournamentId!, 'finished', undefined, undefined, tournamentState.currentRound);
      }
      return
    }

    const currentBoardCount = tournamentState.settings.boardCount
    const currentMaxGroupSize = tournamentState.settings.maxGroupSize
    const maxCapacity = currentBoardCount * currentMaxGroupSize

    if (maxCapacity < activePlayers.length) {
      toast({
        variant: "destructive",
        description: `Nicht genügend Plätze für Runde ${tournamentState.currentRound + 1}! Benötigt: ${activePlayers.length}, Verfügbar: ${maxCapacity}. Bitte passen Sie die Einstellungen an.`,
      })
      return
    }

    setIsNewRoundModalOpen(true) // Open modal for new round confirmation
  }, [tournamentState.tournamentFinished, tournamentState.players, tournamentState.settings, toast, finishTournament])

  // Now that startNewRound is defined, update handleSuddenDeathTimeout's dependencies
  // This is a common pattern for interdependent hooks, but can be tricky.
  // For simplicity and to avoid re-ordering issues, I'll ensure all dependencies are met.
  // The `handleSuddenDeathTimeout` already has `startNewRound` in its dependency array,
  // but since `startNewRound` is defined *after* it, it causes the error.
  // The current structure of `useCallback` means that `startNewRound` in `handleSuddenDeathTimeout`'s
  // dependency array will refer to the *current* value of `startNewRound` at the time
  // `handleSuddenDeathTimeout` is defined.
  // To fix this, `startNewRound` must be defined before `handleSuddenDeathTimeout` if `handleSuddenDeathTimeout`
  // uses `startNewRound` in its body.
  // Let's re-evaluate the order again.

  // Corrected order:
  // 1. finishTournament
  // 2. startNewRound (because handleSuddenDeathTimeout and finishGame depend on it)
  // 3. handleSuddenDeathTimeout (depends on finishTournament, startNewRound)
  // 4. finishGame (depends on finishTournament, startNewRound)
  // 5. editPlayerLives (depends on finishTournament)
  // 6. cancelGame (depends on startNewRound)
  // 7. startBoardTimer (depends on handleSuddenDeathTimeout)
  // 8. startTournament (depends on startNewRound)

  // Let's re-write the `useCallback` definitions in this order.

  // 1. finishTournament (already defined above, no change needed here)

  // 2. startNewRound (already defined above, no change needed here)

  // 3. handleSuddenDeathTimeout (now depends on finishTournament and startNewRound, both defined)
  // Re-defining to ensure correct dependency order in the file.
  const handleSuddenDeathTimeoutCorrected = useCallback(
    async (boardId: number, boardPlayers: KratzerPlayer[]) => {
      toast({ variant: "warning", description: `Sudden Death: Zeit abgelaufen für Board ${boardId}!` })

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
        toast({ variant: "info", description: "Alle Spiele beendet. Starte nächste Runde..." })
        startNewRound()
      }
    },
    [tournamentState, toast, finishTournament, startNewRound], // Now startNewRound is defined
  )

  // 4. finishGame (depends on finishTournament, startNewRound)
  const finishGame = useCallback(
    async (boardId: number, selectedPlayerNames: string[]) => {
      const board = tournamentState.boards.find((b) => b.id === boardId)
      if (!board) return

      // Stop timer for this board
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

      setTournamentState((prev) => ({ ...prev, players: updatedPlayers }))

      if (tournamentState.tournamentId) {
        await updateKratzerTournamentPlayersData(tournamentState.tournamentId, updatedPlayers)
      }

      // Filter out the finished board
      setTournamentState((prev) => ({
        ...prev,
        boards: prev.boards.filter((b) => b.id !== boardId),
      }))

      const remainingPlayersOverall = updatedPlayers.filter((p) => !p.isEliminated)

      if (remainingPlayersOverall.length === 1) {
        finishTournament(remainingPlayersOverall[0])
        return
      }

      // Check if all games on all boards are finished for the current round
      // This needs to check the *updated* boards state after filtering out the current board
      const allBoardsFinished = tournamentState.boards
        .filter((b) => b.id !== boardId)
        .every((b) => b.players.length === 0)

      if (allBoardsFinished) {
        toast({ variant: "info", description: "Alle Spiele der Runde beendet. Starte nächste Runde..." })
        startNewRound()
      } else {
        toast({ variant: "success", description: `Spiel auf Board ${boardId} beendet.` })
      }
    },
    [tournamentState, toast, startNewRound, finishTournament],
  )

  // 5. editPlayerLives (depends on finishTournament)
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
      toast({ variant: "success", description: "Spielerleben aktualisiert." })
      setLoading(false)
    },
    [tournamentState, toast, finishTournament],
  )

  // 6. cancelGame (depends on startNewRound)
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
            toast({ variant: "info", description: "Alle Spiele beendet. Starte nächste Runde..." })
            startNewRound()
          } else {
            toast({ variant: "info", description: `Spiel auf Board ${boardId} abgebrochen.` })
          }
        },
      })
      setIsConfirmationModalOpen(true)
    },
    [tournamentState.boards, toast, startNewRound],
  )

  // 7. startBoardTimer (depends on handleSuddenDeathTimeoutCorrected)
  const startBoardTimer = useCallback(
    (boardId: number, initialStartTime: number | null = null) => {
      const board = tournamentState.boards.find((b) => b.id === boardId)
      if (!board) return

      const startTime = initialStartTime || Date.now()
      setTournamentState((prev) => ({
        ...prev,
        boards: prev.boards.map((b) => (b.id === boardId ? { ...b, startTime: startTime } : b)),
      }))

      if (timers.current[boardId]) clearInterval(timers.current[boardId])

      timers.current[boardId] = setInterval(() => {
        const elapsedTime = Date.now() - startTime
        const timeLimit = tournamentState.settings.suddenDeathTime * 60 * 1000 // Convert minutes to milliseconds

        const boardElement = document.querySelector(`[data-board-id="${boardId}"]`)
        const timerElement = boardElement?.querySelector(".board-timer")

        if (timerElement) {
          timerElement.textContent = formatTime(elapsedTime)

          if (tournamentState.settings.suddenDeathEnabled) {
            const remainingTime = timeLimit - elapsedTime
            timerElement.classList.remove("warning", "critical")

            if (remainingTime <= 60000) {
              timerElement.classList.add("critical")
            } else if (remainingTime <= 180000) {
              timerElement.classList.add("warning")
            }

            if (elapsedTime >= timeLimit) {
              clearInterval(timers.current[boardId])
              delete timers.current[boardId]
              handleSuddenDeathTimeoutCorrected(boardId, board.players)
            }
          }
        }
      }, 1000)
    },
    [tournamentState.boards, tournamentState.settings, handleSuddenDeathTimeoutCorrected],
  )

  // 8. startTournament (depends on startNewRound)
  const startTournament = useCallback(async () => {
    if (isTournamentRunning) {
      toast({ variant: "warning", description: "Turnier läuft bereits." })
      return
    }
    if (tournamentState.tournamentFinished) {
      toast({
        variant: "warning",
        description: "Das Turnier ist bereits beendet. Bitte starten Sie ein neues Turnier.",
      })
      return
    }
    if (registeredPlayers.length === 0) {
      toast({ variant: "warning", description: "Keine Spieler registriert. Bitte registrieren Sie Spieler zuerst." })
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
      toast({
        variant: "destructive",
        description:
          "Nicht genügend Plätze für alle Spieler. Bitte erhöhen Sie die Anzahl der Automaten oder die maximale Gruppengröße.",
      })
      return
    }

    setLoading(true)
    try {
      const { success, message, data } = await createKratzerTournament(
        tournamentState.settings,
        initialPlayers,
        currentUser.id,
      )
      if (!success || !data?.tournamentId) throw new Error(message)

      setTournamentState((prev) => ({
        ...prev,
        tournamentId: data.tournamentId,
        players: initialPlayers,
      }))
      setIsTournamentRunning(true)
      toast({ variant: "success", description: "Turnier erfolgreich gestartet!" })
      startNewRound() // Start the first round immediately
    } catch (error: any) {
      console.error("Error starting tournament:", error.message)
      toast({ variant: "destructive", description: `Fehler beim Starten des Turniers: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }, [
    currentUser,
    registeredPlayers,
    isTournamentRunning,
    tournamentState.tournamentFinished,
    tournamentState.settings,
    toast,
    startNewRound,
  ])

  const executeNewRound = useCallback(async () => {
    setIsNewRoundModalOpen(false) // Close modal
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

    // Filter out empty boards before saving
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
      toast({ variant: "success", description: `Runde ${nextRoundNumber} gestartet!` })

      if (speechEnabled) {
        speakText(
          `Runde ${nextRoundNumber} wurde gestartet. ${activePlayers.length} Spieler verbleibend.`,
          speechEnabled,
        )
      }
    } catch (error: any) {
      console.error("Error executing new round:", error.message)
      toast({ variant: "destructive", description: `Fehler beim Starten der Runde: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }, [
    tournamentState.currentRound,
    tournamentState.settings,
    tournamentState.players,
    tournamentState.tournamentId,
    toast,
  ])

  const completeTournament = useCallback(async () => {
    // This function is triggered after a tournament has finished and winner modal is closed.
    // It should perform cleanup and potentially navigate.
    if (!tournamentState.tournamentId) return
    toast({ variant: "info", description: "Turnier wird abgeschlossen und Daten finalisiert..." })
    await updateKratzerTournamentStatus(tournamentState.tournamentId, "finished") // Ensure status is 'finished'
    await clearRegisteredPlayers() // Clear registered players
    toast({ variant: "success", description: "Turnier erfolgreich abgeschlossen. Weiterleitung zur Spielerdatenbank." })
    // Redirect to the main player management page
    window.location.href = "/spielerdatenbank" // Or wherever your main player list is
  }, [tournamentState.tournamentId, toast, resetTournamentState])

  const confirmCancelTournament = useCallback(() => {
    setConfirmationModalConfig({
      title: "Turnier abbrechen",
      message: "Sind Sie sicher, dass Sie das gesamte Turnier abbrechen möchten? Alle Daten gehen verloren.",
      onConfirm: async () => {
        if (tournamentState.tournamentId) {
          await updateKratzerTournamentStatus(tournamentState.tournamentId, "cancelled")
          toast({ variant: "info", description: "Turnier abgebrochen." })
        }
        resetTournamentState()
        toast({ variant: "info", description: "Turnier abgebrochen. Sie werden zur Spielerdatenbank weitergeleitet." })
        window.location.href = "/spielerdatenbank" // Redirect to the main player list
      },
    })
    setIsConfirmationModalOpen(true)
  }, [tournamentState.tournamentId, toast, resetTournamentState])

  // --- Player Registration Management ---
  const loadRegisteredPlayersState = useCallback(async () => {
    setLoading(true)
    try {
      const { data, success, message } = await loadRegisteredPlayers()
      if (success && data) {
        setRegisteredPlayers(data)
      } else {
        toast({ variant: "destructive", description: message })
      }
    } catch (error: any) {
      toast({ variant: "destructive", description: `Fehler beim Laden der registrierten Spieler: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const handleRegisterPlayers = useCallback(async () => {
    console.log("Client: handleRegisterPlayers gestartet.")
    toast({ variant: "info", description: "Registrierung wird verarbeitet..." }) // Test toast message
    setIsRegisteringPlayers(true)
    try {
      const selectedPlayerIds = selectedPlayersForRegistration.map((p) => p.id)
      console.log("Client: Ausgewählte Spieler-IDs für Registrierung:", selectedPlayerIds)
      const { success, message } = await registerPlayers(selectedPlayerIds)
      console.log("Client: Antwort von registerPlayers Server Action:", { success, message })
      if (success) {
        toast({ variant: "success", description: message })
        await loadRegisteredPlayersState() // Reload registered players
        setSelectedPlayersForRegistration([]) // Clear selection
      } else {
        toast({ variant: "destructive", description: message })
      }
    } catch (error: any) {
      console.error("Client: Fehler beim Aufruf von registerPlayers Server Action:", error)
      toast({ variant: "destructive", description: `Fehler beim Registrieren: ${error.message}` })
    } finally {
      setIsRegisteringPlayers(false)
      console.log("Client: handleRegisterPlayers beendet.")
    }
  }, [selectedPlayersForRegistration, toast, loadRegisteredPlayersState])

  const handleClearRegisteredPlayers = useCallback(async () => {
    setConfirmationModalConfig({
      title: "Registrierung löschen",
      message: "Möchten Sie alle registrierten Spieler wirklich löschen? Dies ist irreversibel.",
      onConfirm: async () => {
        setLoading(true)
        try {
          const { success, message } = await clearRegisteredPlayers()
          if (success) {
            toast({ variant: "success", description: message })
            await loadRegisteredPlayersState() // Reload to show empty state
          } else {
            toast({ variant: "destructive", description: message })
          }
        } catch (error: any) {
          toast({ variant: "destructive", description: `Fehler beim Löschen: ${error.message}` })
        } finally {
          setLoading(false)
        }
      },
    })
    setIsConfirmationModalOpen(true)
  }, [toast, loadRegisteredPlayersState])

  const handleUpdatePlayerPaidStatus = useCallback(
    async (playerId: string, paid: boolean) => {
      setLoading(true)
      try {
        const { success, message } = await updatePlayerPaidStatus(playerId, paid)
        if (success) {
          toast({ variant: "success", description: message })
          await loadRegisteredPlayersState() // Reload to update status in list
        } else {
          toast({ variant: "destructive", description: message })
        }
      } catch (error: any) {
        toast({ variant: "destructive", description: `Fehler beim Aktualisieren: ${error.message}` })
      } finally {
        setLoading(false)
      }
    },
    [toast, loadRegisteredPlayersState],
  )

  // --- UI Related States & Callbacks ---
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
      toast({ variant: "info", description: `Pause für ${minutes} Minuten gestartet.` })
      // Here you could add logic to temporarily disable game controls if desired
      // For now, it's just a visual timer.
      const pauseTimerId = setTimeout(
        () => {
          toast({ variant: "info", description: "Pause beendet!" })
        },
        minutes * 60 * 1000,
      )

      // Store the timer ID if you want to allow manual resume
      // timers.current['pause'] = pauseTimerId;
    },
    [toast],
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
      toast({ variant: "success", description: "Leben pro Ligastatus aktualisiert." })
      setLoading(false)
    },
    [tournamentState, toast],
  )

  const showPrizeMoneyModal = useCallback(() => {
    setIsPrizeMoneyModalOpen(true)
  }, [])

  const hasActiveGames = tournamentState.boards.some((board) => board.players.length > 0 && board.startTime !== null)

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
              {/* This assumes your AuthSection handles login/signup and redirects or re-renders parent */}
              {/* For now, we'll just show a message. You might integrate AuthSection here. */}
              <Button onClick={() => (window.location.href = "/spielerdatenbank")} className="w-full">
                Zur Anmeldung
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  // --- Render content based on tabs ---
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-6 max-w-7xl flex-grow">
        <h1 className="text-4xl font-extrabold text-center mb-8 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Kratzer-Turnier
        </h1>

        {/* Tab Navigation for Registration vs Tournament */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-2 shadow-lg overflow-x-auto mb-8">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            <Button
              onClick={() => setActiveTab("register")}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === "register"
                  ? "bg-primary text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Spieler Registrierung
            </Button>
            <Button
              onClick={() => setActiveTab("tournament")}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === "tournament"
                  ? "bg-primary text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Trophy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Turnier Verlauf
            </Button>
          </div>
        </div>

        {activeTab === "register" ? (
          <RegistrationTab
            currentUser={currentUser}
            registeredPlayers={registeredPlayers}
            selectedPlayersForRegistration={selectedPlayersForRegistration}
            setSelectedPlayersForRegistration={setSelectedPlayersForRegistration}
            handleRegisterPlayers={handleRegisterPlayers}
            handleClearRegisteredPlayers={handleClearRegisteredPlayers}
            handleUpdatePlayerPaidStatus={handleUpdatePlayerPaidStatus}
            isRegisteringPlayers={isRegisteringPlayers}
            loading={loading}
          />
        ) : (
          <>
            {/* Recovery Banner */}
            {activeTournamentExists && recoveryTournamentData && (
              <div className="bg-yellow-100 border-2 border-yellow-500 rounded-2xl p-5 mb-8 flex flex-col md:flex-row items-center gap-4 animate-fadeIn">
                <div className="p-3 bg-yellow-500 rounded-full text-white flex-shrink-0">
                  <RefreshCcw className="h-6 w-6" />
                </div>
                <div className="flex-1 text-yellow-800 text-center md:text-left">
                  <h3 className="font-bold text-lg mb-1">Laufendes Turnier gefunden!</h3>
                  <p className="text-sm">
                    Es wurde ein aktives Kratzer-Turnier gefunden (ID: {recoveryTournamentData.id}). Möchtest du es
                    wiederherstellen?
                  </p>
                </div>
                <div className="flex gap-3 mt-3 md:mt-0">
                  <Button onClick={restoreTournament} className="bg-primary hover:bg-primary-dark">
                    <Play className="h-4 w-4 mr-2" />
                    Wiederherstellen
                  </Button>
                  <Button
                    onClick={startNewTournamentFromRecovery}
                    variant="outline"
                    className="text-gray-700 border-gray-300 hover:bg-gray-100 bg-transparent"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Neues Turnier
                  </Button>
                </div>
              </div>
            )}

            {/* Tournament Control */}
            <Card className="mb-8 p-5 shadow-xl border-gray-200">
              <CardHeader className="border-b pb-4 mb-6">
                <CardTitle className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                  <Settings className="h-6 w-6 text-gray-600" /> Turnier-Steuerung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="boardCount" className="text-gray-700">
                      Anzahl der Automaten
                    </Label>
                    <Input
                      id="boardCount"
                      type="number"
                      min="1"
                      max="32"
                      value={tournamentState.settings.boardCount}
                      onChange={(e) => handleSettingsChange("boardCount", Number.parseInt(e.target.value))}
                      className="mt-2"
                      disabled={isTournamentRunning || loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxGroupSize" className="text-gray-700">
                      Maximale Gruppengröße
                    </Label>
                    <Input
                      id="maxGroupSize"
                      type="number"
                      min="2"
                      max="6"
                      value={tournamentState.settings.maxGroupSize}
                      onChange={(e) => handleSettingsChange("maxGroupSize", Number.parseInt(e.target.value))}
                      className="mt-2"
                      disabled={isTournamentRunning || loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="suddenDeathTime" className="text-gray-700">
                      Zeitlimit (Minuten)
                    </Label>
                    <Input
                      id="suddenDeathTime"
                      type="number"
                      min="1"
                      max="60"
                      value={tournamentState.settings.suddenDeathTime}
                      onChange={(e) => handleSettingsChange("suddenDeathTime", Number.parseInt(e.target.value))}
                      className="mt-2"
                      disabled={isTournamentRunning || loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="suddenDeathMode"
                      checked={tournamentState.settings.suddenDeathEnabled}
                      onCheckedChange={(checked) => handleSettingsChange("suddenDeathEnabled", checked)}
                      disabled={isTournamentRunning || loading}
                    />
                    <Label htmlFor="suddenDeathMode" className="text-gray-700">
                      Sudden Death Modus
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="speechOutput"
                      checked={tournamentState.settings.speechEnabled}
                      onCheckedChange={(checked) => handleSettingsChange("speechEnabled", checked)}
                      disabled={isTournamentRunning || loading || !("speechSynthesis" in window)}
                    />
                    <Label htmlFor="speechOutput" className="text-gray-700">
                      Sprachausgabe (Google Rewin)
                    </Label>
                    {!("speechSynthesis" in window) && (
                      <span className="text-xs text-gray-500">(Nicht unterstützt)</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-6">
                  <Button
                    onClick={startTournament}
                    disabled={isTournamentRunning || loading || registeredPlayers.length === 0}
                    className="bg-primary hover:bg-primary-dark"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isTournamentRunning ? "Turnier läuft" : "Turnier starten"}
                  </Button>
                  <Button
                    onClick={startNewRound}
                    disabled={!isTournamentRunning || tournamentState.tournamentFinished || loading}
                    className="bg-secondary hover:bg-secondary-dark"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Neue Runde
                  </Button>
                  <Button
                    onClick={showLeagueStatusModal}
                    disabled={!isTournamentRunning || tournamentState.tournamentFinished || loading}
                    variant="outline"
                    className="text-gray-700 border-gray-300 hover:bg-gray-100 bg-transparent"
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Leben verwalten
                  </Button>
                  <Button
                    onClick={showPrizeMoneyModal}
                    disabled={!isTournamentRunning || loading}
                    variant="outline"
                    className="text-gray-700 border-gray-300 hover:bg-gray-100 bg-transparent"
                  >
                    <Euro className="h-4 w-4 mr-2" />
                    Preisgeld
                  </Button>
                  <Button
                    onClick={togglePause}
                    disabled={!isTournamentRunning || tournamentState.tournamentFinished || loading}
                    variant="outline"
                    className="text-gray-700 border-gray-300 hover:bg-gray-100 bg-transparent"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                  <Button
                    onClick={() =>
                      finishTournament(
                        tournamentState.winner || tournamentState.players.filter((p) => !p.isEliminated)[0],
                      )
                    }
                    disabled={!isTournamentRunning || !tournamentState.tournamentFinished || loading}
                    className="bg-secondary hover:bg-secondary-dark"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Turnier abschließen
                  </Button>
                  <Button
                    onClick={confirmCancelTournament}
                    disabled={!isTournamentRunning && tournamentState.currentRound === 0 && !activeTournamentExists}
                    variant="destructive"
                    className="hover:bg-destructive-dark"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Turnier abbrechen
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tournament Statistics */}
            <Card className="mb-8 p-5 shadow-xl border-gray-200">
              <CardHeader className="border-b pb-4 mb-6">
                <CardTitle className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                  <BarChart3 className="h-6 w-6 text-gray-600" /> Turnier-Statistiken
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {tournamentState.tournamentFinished && tournamentState.winner ? (
                  <>
                    <StatCard
                      icon={<Trophy className="h-8 w-8" />}
                      label="Turniersieger"
                      value={tournamentState.winner.name}
                      gradient="from-yellow-400 to-yellow-600"
                    />
                    <StatCard
                      icon={<Calendar className="h-8 w-8" />}
                      label="Runden gespielt"
                      value={tournamentState.currentRound.toString()}
                      gradient="from-primary to-primary-light"
                    />
                    <StatCard
                      icon={<Users className="h-8 w-8" />}
                      label="Teilnehmer"
                      value={tournamentState.players.length.toString()}
                      gradient="from-green-400 to-green-600"
                    />
                    <StatCard
                      icon={<Heart className="h-8 w-8" />}
                      label="Verbleibende Leben"
                      value={tournamentState.winner.lives.toString()}
                      gradient="from-purple-400 to-purple-600"
                    />
                  </>
                ) : (
                  <>
                    <StatCard
                      icon={<Calendar className="h-8 w-8" />}
                      label="Aktuelle Runde"
                      value={tournamentState.currentRound.toString()}
                      gradient="from-primary to-primary-light"
                    />
                    <StatCard
                      icon={<Users className="h-8 w-8" />}
                      label="Verbleibende Spieler"
                      value={tournamentState.players.filter((p) => !p.isEliminated).length.toString()}
                      gradient="from-green-400 to-green-600"
                    />
                    <StatCard
                      icon={<UserCheck className="h-8 w-8" />}
                      label="Aktive Spieler"
                      value={tournamentState.players.filter((p) => !p.isEliminated && p.lives > 1).length.toString()}
                      gradient="from-cyan-400 to-cyan-600"
                    />
                    <StatCard
                      icon={<AlertTriangle className="h-8 w-8" />}
                      label="Gefährdete Spieler"
                      value={tournamentState.players.filter((p) => !p.isEliminated && p.lives === 1).length.toString()}
                      gradient="from-orange-400 to-orange-600"
                    />
                    <StatCard
                      icon={<UserX className="h-8 w-8" />}
                      label="Ausgeschiedene Spieler"
                      value={tournamentState.players.filter((p) => p.isEliminated).length.toString()}
                      gradient="from-red-400 to-red-600"
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Current Round Boards */}
            <Card className="mb-8 p-5 shadow-xl border-gray-200">
              <CardHeader className="border-b pb-4 mb-6">
                <CardTitle className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                  <Monitor className="h-6 w-6 text-gray-600" /> Aktuelle Runde
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Rankings Table */}
            <Card className="mb-8 p-5 shadow-xl border-gray-200">
              <CardHeader className="border-b pb-4 mb-6">
                <CardTitle className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                  <Trophy className="h-6 w-6 text-gray-600" /> Rangliste
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RankingsTable
                  players={tournamentState.players}
                  currentRound={tournamentState.currentRound}
                  onEditPlayerLives={editPlayerLives}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* New Round Confirmation Modal */}
      <Dialog open={isNewRoundModalOpen} onOpenChange={setIsNewRoundModalOpen}>
        <DialogContent className="sm:max-w-[700px] p-6 rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-primary">
              🎯 Runde {tournamentState.currentRound + 1} starten
            </DialogTitle>
          </DialogHeader>
          <div className="text-center my-6">
            <div className="text-6xl mb-4">🎲</div>
            <h2 className="text-2xl font-semibold mb-2 text-gray-800">
              Runde {tournamentState.currentRound + 1} losen
            </h2>
            <p className="text-lg text-gray-600">
              <strong>{tournamentState.players.filter((p) => !p.isEliminated).length} Spieler</strong> verbleibend
            </p>
          </div>

          <div className="bg-gray-100 p-6 rounded-xl mb-6">
            <h4 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <Settings className="h-5 w-5" /> Aktuelle Einstellungen
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modalBoardCount" className="text-gray-700">
                  Anzahl Automaten
                </Label>
                <Input
                  id="modalBoardCount"
                  type="number"
                  min="1"
                  max="32"
                  value={tournamentState.settings.boardCount}
                  onChange={(e) => handleSettingsChange("boardCount", Number.parseInt(e.target.value))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="modalMaxGroupSize" className="text-gray-700">
                  Max. Gruppengröße
                </Label>
                <Input
                  id="modalMaxGroupSize"
                  type="number"
                  min="2"
                  max="6"
                  value={tournamentState.settings.maxGroupSize}
                  onChange={(e) => handleSettingsChange("maxGroupSize", Number.parseInt(e.target.value))}
                  className="mt-2"
                />
              </div>
            </div>
            <div
              className={`mt-4 p-3 rounded-lg font-semibold text-sm ${
                tournamentState.settings.boardCount * tournamentState.settings.maxGroupSize >=
                tournamentState.players.filter((p) => !p.isEliminated).length
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-red-100 text-red-700 border border-red-300"
              }`}
            >
              {tournamentState.settings.boardCount * tournamentState.settings.maxGroupSize >=
              tournamentState.players.filter((p) => !p.isEliminated).length ? (
                <div className="flex items-center gap-2">
                  <CircleCheck className="h-4 w-4" />
                  <span>
                    Kapazität: {tournamentState.settings.boardCount * tournamentState.settings.maxGroupSize} Plätze ({" "}
                    {tournamentState.settings.boardCount * tournamentState.settings.maxGroupSize -
                      tournamentState.players.filter((p) => !p.isEliminated).length}{" "}
                    frei)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    Nicht genug Plätze! Benötigt: {tournamentState.players.filter((p) => !p.isEliminated).length},
                    Verfügbar: {tournamentState.settings.boardCount * tournamentState.settings.maxGroupSize}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="bg-primary-100 p-4 rounded-xl border-l-4 border-primary text-gray-700 text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Die Spieler werden automatisch zufällig auf die Automaten verteilt.
          </div>
          <DialogFooter className="mt-6 flex justify-end gap-3">
            <Button onClick={() => setIsNewRoundModalOpen(false)} variant="outline">
              <XCircle className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>
            <Button
              onClick={executeNewRound}
              disabled={
                tournamentState.settings.boardCount * tournamentState.settings.maxGroupSize <
                tournamentState.players.filter((p) => !p.isEliminated).length
              }
            >
              <Play className="h-4 w-4 mr-2" />
              Runde {tournamentState.currentRound + 1} starten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generic Confirmation Modal */}
      <Dialog open={isConfirmationModalOpen} onOpenChange={setIsConfirmationModalOpen}>
        <DialogContent className="sm:max-w-[425px] p-6 rounded-xl shadow-xl text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">{confirmationModalConfig.title}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-gray-600 my-4">{confirmationModalConfig.message}</DialogDescription>
          <DialogFooter className="flex justify-center gap-4 mt-6">
            <Button onClick={() => setIsConfirmationModalOpen(false)} variant="outline">
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                confirmationModalConfig.onConfirm()
                setIsConfirmationModalOpen(false)
              }}
              variant="destructive"
            >
              Bestätigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Winner Modal */}
      <Dialog open={isWinnerModalOpen} onOpenChange={setIsWinnerModalOpen}>
        <DialogContent className="sm:max-w-[600px] p-6 rounded-xl shadow-xl text-center">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-yellow-600 mb-4">🏆 Turnier beendet!</DialogTitle>
          </DialogHeader>
          <div className="text-center my-6">
            <Trophy className="h-24 w-24 mx-auto text-yellow-500 animate-bounce" />
            <div className="text-5xl font-extrabold my-6 bg-gradient-to-r from-yellow-400 to-yellow-700 bg-clip-text text-transparent">
              {tournamentState.winner?.name}
            </div>
            <p className="text-lg text-gray-700 mb-6">Herzlichen Glückwunsch zum Turniersieg!</p>
            {tournamentState.winner && (
              <div className="bg-gray-100 p-4 rounded-lg inline-block text-left text-gray-700 font-medium">
                <p>
                  <strong>Runden gespielt:</strong> {tournamentState.currentRound}
                </p>
                <p>
                  <strong>Verbleibende Leben:</strong> {tournamentState.winner.lives}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-center mt-6">
            <Button
              onClick={() => {
                setIsWinnerModalOpen(false)
                completeTournament()
              }}
              className="bg-primary hover:bg-primary-dark"
            >
              Schließen & Abschließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* League Status Modal */}
      <Dialog open={isLeagueStatusModalOpen} onOpenChange={setIsLeagueStatusModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-6 rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Leben pro Ligastatus verwalten</DialogTitle>
          </DialogHeader>
          <div className="my-6">
            {Array.from(new Set(tournamentState.players.map((p) => p.ligastatus))).map((status) => {
              if (!status) return null // Skip if status is null or undefined
              const currentLives =
                tournamentState.players.find((p) => p.ligastatus === status)?.lives || getDefaultLives(status)
              return (
                <div key={status} className="flex items-center gap-4 mb-4">
                  <Label htmlFor={`status-${status}`} className="w-28 text-gray-700 font-medium">
                    Ligastatus {status}:
                  </Label>
                  <Input
                    id={`status-${status}`}
                    type="number"
                    min="1"
                    max="10"
                    defaultValue={currentLives}
                    onChange={(e) => {
                      // This needs to update an internal state for modal, then save
                      const newLivesMap = { ...leagueStatusLivesMap.current, [status]: Number.parseInt(e.target.value) }
                      leagueStatusLivesMap.current = newLivesMap
                    }}
                    className="w-24 text-center"
                  />
                </div>
              )
            })}
          </div>
          <DialogFooter className="flex justify-end gap-3 mt-6">
            <Button onClick={() => setIsLeagueStatusModalOpen(false)} variant="outline">
              Abbrechen
            </Button>
            <Button onClick={() => saveLeagueStatusLives(leagueStatusLivesMap.current)}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Modal */}
      <Dialog open={isPauseModalOpen} onOpenChange={setIsPauseModalOpen}>
        <DialogContent className="sm:max-w-[400px] p-6 rounded-xl shadow-xl text-center bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-4xl font-extrabold text-primary mb-6">PAUSE</DialogTitle>
          </DialogHeader>
          <div className="mb-6">
            <Input
              type="number"
              placeholder="Minuten"
              min="1"
              max="60"
              defaultValue={5}
              ref={pauseMinutesRef}
              className="w-32 text-center bg-gray-800 text-white border-primary-dark focus:border-primary"
            />
          </div>
          <DialogFooter className="flex justify-center mt-6">
            <Button
              onClick={() => startPauseTimer(Number.parseInt(pauseMinutesRef.current?.value || "5"))}
              className="bg-primary hover:bg-primary-dark text-lg px-6 py-3"
            >
              <Play className="h-5 w-5 mr-2" />
              Pause starten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prize Money Modal */}
      <Dialog open={isPrizeMoneyModalOpen} onOpenChange={setIsPrizeMoneyModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-6 rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Preisgeld-Übersicht</DialogTitle>
          </DialogHeader>
          <div className="my-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Startgeld pro Spieler:</span>
              <span className="font-semibold text-gray-800">{prizeMoneySettings.current.entryFee.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Bezahlte Spieler:</span>
              <span className="font-semibold text-gray-800">{registeredPlayers.filter((p) => p.paid).length}</span>
            </div>
            <div className="flex justify-between mb-4 pb-2 border-b-2 border-gray-200">
              <span className="text-lg font-semibold text-primary">Gesamtpreisgeld:</span>
              <span className="text-xl font-bold text-primary">
                {calculatePrizeMoney(
                  prizeMoneySettings.current.entryFee,
                  registeredPlayers.filter((p) => p.paid).length,
                  prizeMoneySettings.current.percentages,
                ).totalPrizeMoney.toFixed(2)}{" "}
                €
              </span>
            </div>

            <h4 className="text-lg font-semibold text-gray-800 mb-4">Preisverteilung</h4>
            {calculatePrizeMoney(
              prizeMoneySettings.current.entryFee,
              registeredPlayers.filter((p) => p.paid).length,
              prizeMoneySettings.current.percentages,
            ).distribution.map((item) => (
              <div key={item.place} className="flex justify-between mb-2 pb-1 border-b border-gray-100">
                <span className="text-gray-700">
                  {item.place}. Platz ({prizeMoneySettings.current.percentages[item.place - 1]}%)
                </span>
                <span className="font-semibold text-gray-800">{item.amount.toFixed(2)} €</span>
              </div>
            ))}
          </div>
          <DialogFooter className="flex justify-end mt-6">
            <Button onClick={() => setIsPrizeMoneyModalOpen(false)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Helper Components ---

interface RegistrationTabProps {
  currentUser: any
  registeredPlayers: SpieldatenbankEntry[]
  selectedPlayersForRegistration: SpieldatenbankEntry[]
  setSelectedPlayersForRegistration: (players: SpieldatenbankEntry[]) => void
  handleRegisterPlayers: () => Promise<void>
  handleClearRegisteredPlayers: () => Promise<void>
  handleUpdatePlayerPaidStatus: (playerId: string, paid: boolean) => Promise<void>
  isRegisteringPlayers: boolean
  loading: boolean
}

function RegistrationTab({
  currentUser,
  registeredPlayers,
  selectedPlayersForRegistration,
  setSelectedPlayersForRegistration,
  handleRegisterPlayers,
  handleClearRegisteredPlayers,
  handleUpdatePlayerPaidStatus,
  isRegisteringPlayers,
  loading,
}: RegistrationTabProps) {
  const { toast } = useToast()
  const [availablePlayers, setAvailablePlayers] = useState<SpieldatenbankEntry[]>([])
  const [filterText, setFilterText] = useState("")
  const [fetchingAvailablePlayers, setFetchingAvailablePlayers] = useState(true)

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
      toast({ variant: "destructive", description: `Fehler beim Laden der verfügbaren Spieler: ${err.message}` })
      console.error("Error fetching available players:", err)
    } finally {
      setFetchingAvailablePlayers(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAvailablePlayers()
  }, [fetchAvailablePlayers])

  const filteredAvailablePlayers = availablePlayers.filter(
    (player) =>
      player.name.toLowerCase().includes(filterText.toLowerCase()) &&
      !registeredPlayers.some((regPlayer) => regPlayer.id === player.id), // Only show non-registered players
  )

  const handleSelectPlayer = (player: SpieldatenbankEntry) => {
    setSelectedPlayersForRegistration((prev) =>
      prev.some((p) => p.id === player.id) ? prev.filter((p) => p.id !== player.id) : [...prev, player],
    )
  }

  const isPlayerSelected = (player: SpieldatenbankEntry) =>
    selectedPlayersForRegistration.some((p) => p.id === player.id)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Available Players Card */}
      <Card className="p-5 shadow-xl border-gray-200">
        <CardHeader className="border-b pb-4 mb-6">
          <CardTitle className="text-xl font-semibold flex items-center gap-2 text-gray-900">
            <Users className="h-6 w-6 text-gray-600" /> Verfügbare Spieler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Spieler suchen..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="mb-4"
          />
          <div className="h-[400px] overflow-y-auto border rounded-lg p-2 bg-gray-50">
            {fetchingAvailablePlayers ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary-dark" />
              </div>
            ) : filteredAvailablePlayers.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                {filterText ? "Keine Spieler gefunden." : "Alle Spieler registriert oder keine vorhanden."}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAvailablePlayers.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                      isPlayerSelected(player) ? "bg-primary-100 border-primary-200" : "bg-white hover:bg-gray-100"
                    }`}
                    onClick={() => handleSelectPlayer(player)}
                  >
                    <span className="font-medium text-gray-800">
                      {player.name} ({player.ligastatus})
                    </span>
                    <Checkbox checked={isPlayerSelected(player)} className="pointer-events-none" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={handleRegisterPlayers}
            disabled={selectedPlayersForRegistration.length === 0 || isRegisteringPlayers || loading}
            className="mt-6 w-full bg-primary hover:bg-primary-dark"
          >
            {isRegisteringPlayers ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4 mr-2" />
            )}
            Spieler registrieren ({selectedPlayersForRegistration.length})
          </Button>
        </CardContent>
      </Card>

      {/* Registered Players Card */}
      <Card className="p-5 shadow-xl border-gray-200">
        <CardHeader className="border-b pb-4 mb-6">
          <CardTitle className="text-xl font-semibold flex items-center gap-2 text-gray-900">
            <List className="h-6 w-6 text-gray-600" /> Registrierte Spieler ({registeredPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] overflow-y-auto border rounded-lg p-2 bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary-dark" />
              </div>
            ) : registeredPlayers.length === 0 ? (
              <div className="text-center text-gray-500 py-4">Keine Spieler registriert.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Ligastatus</TableHead>
                    <TableHead>Bezahlt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registeredPlayers.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>{player.ligastatus}</TableCell>
                      <TableCell>
                        <Checkbox
                          checked={player.paid || false}
                          onCheckedChange={(checked) => handleUpdatePlayerPaidStatus(player.id, checked as boolean)}
                          disabled={loading}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <Button
            onClick={handleClearRegisteredPlayers}
            disabled={registeredPlayers.length === 0 || loading}
            variant="destructive"
            className="mt-6 w-full hover:bg-destructive-dark"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Alle Registrierungen löschen
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  gradient: string
}

function StatCard({ icon, label, value, gradient }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-md bg-white border border-gray-200">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20`}></div>
      <div className="relative p-6 flex items-center gap-4">
        <div className="p-3 rounded-full bg-white shadow-sm flex-shrink-0">{icon}</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{label}</h3>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

interface BoardComponentProps {
  board: Board
  suddenDeathEnabled: boolean
  suddenDeathTime: number
  speechEnabled: boolean
  onStartGame: (boardId: number, initialStartTime?: number | null) => void
  onFinishGame: (boardId: number, selectedPlayerNames: string[]) => Promise<void>
  onCancelGame: (boardId: number) => void
  onMakeCall: (text: string, enabled: boolean) => void
  currentRound: number
}

function BoardComponent({
  board,
  suddenDeathEnabled,
  suddenDeathTime,
  speechEnabled,
  onStartGame,
  onFinishGame,
  onCancelGame,
  onMakeCall,
  currentRound,
}: BoardComponentProps) {
  const [selectedPlayerNames, setSelectedPlayerNames] = useState<string[]>([])
  const [isGameActive, setIsGameActive] = useState(false)

  useEffect(() => {
    setIsGameActive(board.startTime !== null)
  }, [board.startTime])

  const handleStartGame = () => {
    onStartGame(board.id)
    setIsGameActive(true)
    onMakeCall(`Spiel auf Board ${board.id} gestartet.`, speechEnabled)
  }

  const handleFinishGame = async () => {
    await onFinishGame(board.id, selectedPlayerNames)
    setIsGameActive(false)
    onMakeCall(`Spiel auf Board ${board.id} beendet.`, speechEnabled)
  }

  const handleCancelGame = () => {
    onCancelGame(board.id)
    setIsGameActive(false)
    onMakeCall(`Spiel auf Board ${board.id} abgebrochen.`, speechEnabled)
  }

  const handlePlayerSelection = (playerName: string) => {
    setSelectedPlayerNames((prev) =>
      prev.includes(playerName) ? prev.filter((name) => name !== playerName) : [...prev, playerName],
    )
  }

  return (
    <Card data-board-id={board.id} className="shadow-xl border-gray-200">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          Board {board.id}
          {isGameActive && <span className="ml-2 text-sm text-green-600">Läuft</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-4">
          {board.players.length === 0 ? (
            <p className="text-gray-500">Keine Spieler auf diesem Board.</p>
          ) : (
            <ul className="space-y-2">
              {board.players.map((player) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                >
                  <span className="font-medium text-gray-800">
                    {player.name} ({player.lives})
                  </span>
                  {isGameActive && (
                    <Checkbox
                      checked={selectedPlayerNames.includes(player.name)}
                      onCheckedChange={() => handlePlayerSelection(player.name)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {board.startTime && isGameActive && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Spiel gestartet: <span className="board-timer font-semibold">Lädt...</span>
            </p>
          </div>
        )}

        <div className="flex justify-between gap-3">
          {!isGameActive ? (
            <Button onClick={handleStartGame} className="w-1/2 bg-green-500 hover:bg-green-700">
              Start
            </Button>
          ) : (
            <>
              <Button onClick={handleFinishGame} className="w-1/2 bg-primary hover:bg-primary-dark">
                Beenden
              </Button>
              <Button
                onClick={handleCancelGame}
                variant="outline"
                className="w-1/2 text-gray-700 border-gray-300 hover:bg-gray-100 bg-transparent"
              >
                Abbrechen
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface RankingsTableProps {
  players: KratzerPlayer[]
  currentRound: number
  onEditPlayerLives: (playerId: string, newLives: number) => Promise<void>
  loading: boolean
}

function RankingsTable({ players, currentRound, onEditPlayerLives, loading }: RankingsTableProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isEliminated && !b.isEliminated) return 1
    if (!a.isEliminated && b.isEliminated) return -1
    return b.lives - a.lives
  })

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rang</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Ligastatus</TableHead>
            <TableHead>Leben</TableHead>
            <TableHead>Ausgeschieden</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPlayers.map((player, index) => (
            <TableRow
              key={player.id}
              className={player.isEliminated ? "opacity-60 bg-gray-50" : "hover:bg-gray-50 transition-colors"}
            >
              <TableCell>{index + 1}</TableCell>
              <TableCell className="font-medium">{player.name}</TableCell>
              <TableCell>{player.ligastatus}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => onEditPlayerLives(player.id, player.lives + 1)}
                    disabled={player.isEliminated || loading}
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto w-auto"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                  <span className="font-bold text-lg text-gray-900">{player.lives}</span>
                  <Button
                    onClick={() => onEditPlayerLives(player.id, player.lives - 1)}
                    disabled={player.isEliminated || loading || player.lives <= 0}
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto w-auto"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>{player.isEliminated ? `Runde ${player.eliminationRound}` : "Nein"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
