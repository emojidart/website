"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import type { KratzerPlayer, Board, TournamentSettings } from "@/types/tournament"
import { formatTime } from "@/utils/tournament-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor, Trophy, Calendar, Users, Heart, AlertTriangle, UserX, Loader2, RefreshCcw } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"

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

interface LiveBoardComponentProps {
  board: Board
  suddenDeathEnabled: boolean
  suddenDeathTime: number
}

function LiveBoardComponent({ board, suddenDeathEnabled, suddenDeathTime }: LiveBoardComponentProps) {
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (board.startTime && board.status === "running") {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - board.startTime!)
      }, 1000)
      return () => clearInterval(interval)
    }
    setElapsedTime(0)
  }, [board.startTime, board.status])

  const timeLimit = suddenDeathTime * 60 * 1000
  const remainingTime = timeLimit - elapsedTime
  const timerClass =
    suddenDeathEnabled && remainingTime <= 60000
      ? "text-red-600 font-bold"
      : suddenDeathEnabled && remainingTime <= 180000
        ? "text-orange-500 font-bold"
        : "text-gray-900"

  const getStatusDisplay = () => {
    switch (board.status) {
      case "running":
        return <span className="ml-2 text-sm text-green-600 font-semibold">Läuft</span>
      case "finished":
        return <span className="ml-2 text-sm text-gray-500 font-semibold">Beendet</span>
      case "not_started":
      default:
        return <span className="ml-2 text-sm text-orange-500 font-semibold">Bereit</span>
    }
  }

  const getCardStyle = () => {
    switch (board.status) {
      case "running":
        return "shadow-xl border-green-200 bg-green-50"
      case "finished":
        return "shadow-md border-gray-300 bg-gray-100 opacity-75"
      case "not_started":
      default:
        return "shadow-lg border-orange-200 bg-orange-50"
    }
  }

  return (
    <Card data-board-id={board.id} className={getCardStyle()}>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          Board {board.id}
          {getStatusDisplay()}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-4">
          {board.players.length === 0 ? (
            <p className="text-gray-500">Keine Spieler auf diesem Board.</p>
          ) : (
            <ul className="space-y-2">
              {board.players.map((player) => (
                <li key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-white/70">
                  <span className="font-medium text-gray-800">
                    {player.name} ({player.lives} Leben)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {board.status === "running" && board.startTime && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Spielzeit: <span className={`font-semibold ${timerClass}`}>{formatTime(elapsedTime)}</span>
            </p>
            {suddenDeathEnabled && (
              <p className="text-xs text-gray-500">
                Verbleibend: <span className={`font-semibold ${timerClass}`}>{formatTime(remainingTime)}</span>
              </p>
            )}
          </div>
        )}

        {board.status === "finished" && board.endTime && (
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              Spiel beendet: {formatTime(board.endTime - (board.startTime || board.endTime))} Spielzeit
            </p>
          </div>
        )}

        {board.status === "not_started" && (
          <div className="mb-4">
            <p className="text-sm text-orange-600 font-medium">Wartet auf Start...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface LiveRankingsTableProps {
  players: KratzerPlayer[]
}

function LiveRankingsTable({ players }: LiveRankingsTableProps) {
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
            <TableHead>Status</TableHead>
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
                <span className="font-bold text-lg text-gray-900">{player.lives}</span>
              </TableCell>
              <TableCell>
                {player.isEliminated ? `Ausgeschieden (Runde ${player.eliminationRound})` : "Aktiv"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default function LiveKratzerSection() {
  const [tournamentData, setTournamentData] = useState<{
    tournamentId: string | null
    status: string
    currentRound: number
    winner: KratzerPlayer | null
    players: KratzerPlayer[]
    boards: Board[]
    settings: TournamentSettings
  }>({
    tournamentId: null,
    status: "idle",
    currentRound: 0,
    winner: null,
    players: [],
    boards: [],
    settings: {
      boardCount: 0,
      maxGroupSize: 0,
      suddenDeathEnabled: false,
      suddenDeathTime: 0,
      speechEnabled: false,
    },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Verhindert, dass viele Supabase-Realtime-Events gleichzeitig mehrere
  // Daten-Ladevorgänge starten und ein älterer Request einen neueren überschreibt.
  const latestRequestRef = useRef(0)
  const realtimeRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    const requestId = ++latestRequestRef.current
    setError(null)

    try {
      // Es kann historisch mehrere fehlerhaft als "running" markierte Turniere geben.
      // Für die Live-Anzeige wird immer nur das NEUESTE laufende Turnier verwendet.
      const { data: activeTournament, error: tournamentError } = await supabase
        .from("kratzer_tournaments")
        .select("*")
        .eq("status", "running")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (tournamentError) {
        throw new Error(`Tournament query error: ${tournamentError.message}`)
      }

      // Falls während dieses Requests bereits ein neuerer Refresh gestartet wurde,
      // darf dieser alte Request den aktuellen Stand nicht mehr überschreiben.
      if (requestId !== latestRequestRef.current) return

      if (activeTournament) {
        const tournamentId = activeTournament.id
        const status = activeTournament.status
        const winnerId = activeTournament.winner_id
        const winnerName = activeTournament.winner_name
        const totalRounds = activeTournament.total_rounds

        const [{ data: playersData, error: playersError }, { data: latestRound, error: roundError }] =
          await Promise.all([
            supabase
              .from("kratzer_tournament_players")
              .select("*")
              .eq("kratzer_tournament_id", tournamentId),
            supabase
              .from("kratzer_tournament_rounds")
              .select("*")
              .eq("kratzer_tournament_id", tournamentId)
              .order("round_number", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ])

        if (playersError) {
          throw new Error(`Players query error: ${playersError.message}`)
        }

        if (roundError) {
          throw new Error(`Round query error: ${roundError.message}`)
        }

        if (requestId !== latestRequestRef.current) return

        const players: KratzerPlayer[] = (playersData || []).map((player) => ({
          id: player.player_id,
          name: player.player_name,
          ligastatus: player.ligastatus || "N/A",
          lives: player.lives,
          isEliminated: player.is_eliminated,
          eliminationRound: player.elimination_round,
          eliminationTime: player.elimination_time,
        }))

        const playersById = new Map(players.map((player) => [player.id, player]))

        let currentRound = 0
        let boards: Board[] = []

        if (latestRound) {
          currentRound = latestRound.round_number

          if (latestRound.boards_data && Array.isArray(latestRound.boards_data)) {
            boards = latestRound.boards_data
              .map((boardData: any) => ({
                id: boardData.id,
                // boards_data ist nur ein Snapshot der Runde.
                // Leben/Eliminierungsstatus kommen IMMER aus kratzer_tournament_players,
                // damit die Live-Seite keine alten Leben anzeigt.
                players: (boardData.players || []).map(
                  (boardPlayer: KratzerPlayer) => playersById.get(boardPlayer.id) || boardPlayer,
                ),
                startTime: boardData.startTime ?? null,
                endTime: boardData.endTime ?? null,
                status: boardData.status || (boardData.startTime ? "running" : "not_started"),
                timer: null,
              }))
              .filter((board: Board) => board.status !== "finished")
          }
        }

        let winnerPlayer: KratzerPlayer | null = null
        if (status === "finished" && winnerId && winnerName) {
          winnerPlayer = players.find((p) => p.id === winnerId) || {
            id: winnerId,
            name: winnerName,
            ligastatus: "N/A",
            lives: 0,
            isEliminated: true,
            eliminationRound: totalRounds,
            eliminationTime: new Date().toISOString(),
          }
        }

        if (requestId !== latestRequestRef.current) return

        setTournamentData({
          tournamentId,
          status,
          currentRound,
          winner: winnerPlayer,
          players,
          boards,
          settings: {
            boardCount: activeTournament.board_count,
            maxGroupSize: activeTournament.max_group_size,
            suddenDeathEnabled: activeTournament.sudden_death_enabled,
            suddenDeathTime: activeTournament.sudden_death_time,
            speechEnabled: activeTournament.speech_enabled,
          },
        })
      } else {
        setTournamentData({
          tournamentId: null,
          status: "idle",
          currentRound: 0,
          winner: null,
          players: [],
          boards: [],
          settings: {
            boardCount: 0,
            maxGroupSize: 0,
            suddenDeathEnabled: false,
            suddenDeathTime: 0,
            speechEnabled: false,
          },
        })
      }
    } catch (err: any) {
      if (requestId !== latestRequestRef.current) return
      console.error("Error fetching live tournament data:", err)
      setError("Fehler beim Laden der Turnierdaten: " + err.message)
    } finally {
      if (requestId === latestRequestRef.current) {
        setLoading(false)
      }
    }
  }, [])

  const scheduleRealtimeRefresh = useCallback(() => {
    // updateKratzerTournamentPlayersData aktualisiert mehrere Spieler.
    // Supabase Realtime sendet dafür mehrere Events fast gleichzeitig.
    // Statt z.B. 20x neu zu laden, bündeln wir sie zu EINEM Refresh.
    if (realtimeRefreshTimerRef.current) {
      clearTimeout(realtimeRefreshTimerRef.current)
    }

    realtimeRefreshTimerRef.current = setTimeout(() => {
      realtimeRefreshTimerRef.current = null
      fetchData()
    }, 250)
  }, [fetchData])

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel("kratzer_tournament_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kratzer_tournaments",
        },
        () => {
          scheduleRealtimeRefresh()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kratzer_tournament_players",
        },
        () => {
          scheduleRealtimeRefresh()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kratzer_tournament_rounds",
        },
        () => {
          scheduleRealtimeRefresh()
        },
      )
      .subscribe()

    return () => {
      if (realtimeRefreshTimerRef.current) {
        clearTimeout(realtimeRefreshTimerRef.current)
        realtimeRefreshTimerRef.current = null
      }
      supabase.removeChannel(channel)
    }
  }, [fetchData, scheduleRealtimeRefresh])

  const isTournamentRunning = tournamentData.status === "running"
  const isTournamentFinished = tournamentData.status === "finished"

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-16 w-16 animate-spin text-primary-dark" />
        <p className="mt-4 text-gray-700 text-lg font-semibold">Lade Kratzer Turnier-Daten...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-8" role="alert">
        <strong className="font-bold">Fehler!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    )
  }

  if (!tournamentData.tournamentId) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-lg">
        <RefreshCcw className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 text-lg">Aktuell läuft kein Kratzer Turnier.</p>
        <p className="text-gray-500 text-sm mt-2">Bitte warten Sie, bis ein Turnier gestartet wird.</p>
      </div>
    )
  }

  return (
    <>
      <Card className="mb-8 p-5 shadow-xl border-gray-200">
        <CardHeader className="border-b pb-4 mb-6">
          <CardTitle className="text-xl font-semibold flex items-center gap-2 text-gray-900">
            <Trophy className="h-6 w-6 text-gray-600" /> Turnier-Status
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            icon={<Calendar className="h-8 w-8" />}
            label="Aktuelle Runde"
            value={tournamentData.currentRound.toString()}
            gradient="from-primary to-primary-light"
          />
          <StatCard
            icon={<Users className="h-8 w-8" />}
            label="Verbleibende Spieler"
            value={tournamentData.players.filter((p) => !p.isEliminated).length.toString()}
            gradient="from-green-400 to-green-600"
          />
          <StatCard
            icon={<Heart className="h-8 w-8" />}
            label="Turnier Status"
            value={isTournamentFinished ? "Beendet" : isTournamentRunning ? "Läuft" : "Inaktiv"}
            gradient={
              isTournamentFinished
                ? "from-yellow-400 to-yellow-600"
                : isTournamentRunning
                  ? "from-green-400 to-green-600"
                  : "from-gray-400 to-gray-600"
            }
          />
          {isTournamentFinished && tournamentData.winner && (
            <StatCard
              icon={<Trophy className="h-8 w-8" />}
              label="Turniersieger"
              value={tournamentData.winner.name}
              gradient="from-yellow-400 to-yellow-600"
            />
          )}
          {isTournamentRunning && (
            <>
              <StatCard
                icon={<AlertTriangle className="h-8 w-8" />}
                label="Gefährdete Spieler"
                value={tournamentData.players.filter((p) => !p.isEliminated && p.lives === 1).length.toString()}
                gradient="from-orange-400 to-orange-600"
              />
              <StatCard
                icon={<UserX className="h-8 w-8" />}
                label="Ausgeschiedene Spieler"
                value={tournamentData.players.filter((p) => p.isEliminated).length.toString()}
                gradient="from-red-400 to-red-600"
              />
            </>
          )}
        </CardContent>
      </Card>

      {isTournamentRunning && tournamentData.boards.length > 0 && (
        <Card className="mb-8 p-5 shadow-xl border-gray-200">
          <CardHeader className="border-b pb-4 mb-6">
            <CardTitle className="text-xl font-semibold flex items-center gap-2 text-gray-900">
              <Monitor className="h-6 w-6 text-gray-600" />
              Aktive Spiele
              <span className="text-sm font-normal text-gray-500">
                ({tournamentData.boards.filter((b) => b.status === "running").length} läuft,{" "}
                {tournamentData.boards.filter((b) => b.status === "not_started").length} bereit)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournamentData.boards.map((board) => (
                <LiveBoardComponent
                  key={board.id}
                  board={board}
                  suddenDeathEnabled={tournamentData.settings.suddenDeathEnabled}
                  suddenDeathTime={tournamentData.settings.suddenDeathTime}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-8 p-5 shadow-xl border-gray-200">
        <CardHeader className="border-b pb-4 mb-6">
          <CardTitle className="text-xl font-semibold flex items-center gap-2 text-gray-900">
            <Trophy className="h-6 w-6 text-gray-600" /> Rangliste
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LiveRankingsTable players={tournamentData.players} />
        </CardContent>
      </Card>
    </>
  )
}
