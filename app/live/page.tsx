"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import type { KratzerPlayer, Board, TournamentSettings } from "@/types/tournament"
import { formatTime } from "@/utils/tournament-utils"
import { Header } from "@/components/header"
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

export default function LiveTournamentPage() {
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

  const fetchData = useCallback(async () => {
    setError(null)
    try {
      // Fetch active tournament directly from Supabase
      const { data: activeTournament, error: tournamentError } = await supabase
        .from("kratzer_tournaments")
        .select("*")
        .eq("status", "running")
        .single()

      if (tournamentError && tournamentError.code !== "PGRST116") {
        throw new Error(`Tournament query error: ${tournamentError.message}`)
      }

      if (activeTournament) {
        const tournamentId = activeTournament.id
        const status = activeTournament.status
        const winnerId = activeTournament.winner_id
        const winnerName = activeTournament.winner_name
        const totalRounds = activeTournament.total_rounds

        const { data: playersData, error: playersError } = await supabase
          .from("kratzer_tournament_players")
          .select("*")
          .eq("kratzer_tournament_id", tournamentId)

        if (playersError) {
          throw new Error(`Players query error: ${playersError.message}`)
        }

        const { data: latestRound, error: roundError } = await supabase
          .from("kratzer_tournament_rounds")
          .select("*")
          .eq("kratzer_tournament_id", tournamentId)
          .order("round_number", { ascending: false })
          .limit(1)
          .single()

        let currentRound = 1
        let boards: Board[] = []

        if (!roundError && latestRound) {
          currentRound = latestRound.round_number
          if (latestRound.boards_data && Array.isArray(latestRound.boards_data)) {
            boards = latestRound.boards_data
              .map((boardData: any) => ({
                id: boardData.id,
                players: boardData.players || [],
                startTime: boardData.startTime,
                endTime: boardData.endTime || null,
                status: boardData.status || (boardData.startTime ? "running" : "not_started"),
                timer: null, // Timer is not stored in DB
              }))
              .filter((board: Board) => board.status !== "finished") // Only show active boards
          }
        } else if (status === "running") {
          const boardCount = activeTournament.board_count || 3
          for (let i = 1; i <= boardCount; i++) {
            boards.push({
              id: i,
              players: [],
              startTime: null,
              endTime: null,
              status: "not_started",
              timer: null,
            })
          }
        }

        const players: KratzerPlayer[] = playersData.map((player) => ({
          id: player.player_id,
          name: player.player_name,
          ligastatus: player.ligastatus || "N/A",
          lives: player.lives,
          isEliminated: player.is_eliminated,
          eliminationRound: player.elimination_round,
          eliminationTime: player.elimination_time,
        }))

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

        setTournamentData({
          tournamentId: tournamentId,
          status: status,
          currentRound: currentRound,
          winner: winnerPlayer,
          players: players,
          boards: boards,
          settings: {
            boardCount: activeTournament.board_count,
            maxGroupSize: activeTournament.max_group_size,
            suddenDeathEnabled: activeTournament.sudden_death_enabled,
            suddenDeathTime: activeTournament.sudden_death_time,
            speechEnabled: activeTournament.speech_enabled,
          },
        })
      } else {
        // No active tournament found
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
      console.error("Error fetching live tournament data:", err)
      setError("Fehler beim Laden der Turnierdaten: " + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch when component mounts
    fetchData()

    // Set up Realtime subscriptions
    const channel = supabase
      .channel("tournament_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kratzer_tournaments",
        },
        (payload) => {
          console.log("Realtime: kratzer_tournaments change!", payload)
          fetchData()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kratzer_tournament_players",
        },
        (payload) => {
          console.log("Realtime: kratzer_tournament_players change!", payload)
          fetchData()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kratzer_tournament_rounds",
        },
        (payload) => {
          console.log("Realtime: kratzer_tournament_rounds change!", payload)
          fetchData()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const isTournamentRunning = tournamentData.status === "running"
  const isTournamentFinished = tournamentData.status === "finished"

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-6 max-w-7xl flex-grow">
        <h1 className="text-4xl font-extrabold text-center mb-8 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Live Turnier-Übersicht
        </h1>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-16 w-16 animate-spin text-primary-dark" />
            <p className="mt-4 text-gray-700 text-lg font-semibold">Lade Live-Daten...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-8" role="alert">
            <strong className="font-bold">Fehler!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {!loading && !tournamentData.tournamentId && (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <RefreshCcw className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">Aktuell läuft kein Turnier.</p>
            <p className="text-gray-500 text-sm mt-2">Bitte warten Sie, bis ein Turnier gestartet wird.</p>
          </div>
        )}

        {!loading && tournamentData.tournamentId && (
          <>
            {/* Tournament Status */}
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

            {/* Rankings Table */}
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
        )}
      </main>
    </div>
  )
}
