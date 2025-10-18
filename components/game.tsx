"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Target, ArrowLeft, Undo2, Trophy, Sparkles, User, BarChart3, AlertCircle, Lightbulb } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

type Challenge = {
  id: string
  challenger_id: string
  opponent_id: string
  game_mode: string
  status: string
  winner_id: string | null
  cancelled_by: string | null
}

type GameState = {
  id: string
  challenge_id: string
  player1_id: string
  player2_id: string
  current_player_id: string
  player1_score: number
  player2_score: number
  game_mode: string
  status: string
  created_at: string
  winner_id: string | null
}

type Turn = {
  id: string
  match_id: string
  player_id: string
  total_score: number
  remaining_score: number
  throw_number: number
  dart1_score: number
  dart2_score: number
  dart3_score: number
  is_bust: boolean
  created_at: string
}

type PlayerInfo = {
  user_id: string
  username: string
}

export function Game({ challengeId }: { challengeId: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [currentScore, setCurrentScore] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [challengerInfo, setChallengerInfo] = useState<PlayerInfo | null>(null)
  const [opponentInfo, setOpponentInfo] = useState<PlayerInfo | null>(null)
  const [player1ThrowCount, setPlayer1ThrowCount] = useState(0)
  const [player2ThrowCount, setPlayer2ThrowCount] = useState(0)
  const [showWinnerModal, setShowWinnerModal] = useState(false)
  const [winnerName, setWinnerName] = useState("")
  const [isWinner, setIsWinner] = useState(false)
  const [hasShownWinnerModal, setHasShownWinnerModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showOpponentCancelledModal, setShowOpponentCancelledModal] = useState(false)
  const [cancelledByName, setCancelledByName] = useState("")
  const [isRequestingRevenge, setIsRequestingRevenge] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [showBustModal, setShowBustModal] = useState(false)
  const [showInvalidScoreModal, setShowInvalidScoreModal] = useState(false)
  const [lastClickedScore, setLastClickedScore] = useState<number | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    if (user) {
      loadGame()
    }
  }, [challengeId, user])

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null

    if (
      gameState &&
      gameState.status !== "finished" &&
      challenge?.status !== "completed" &&
      challenge?.status !== "cancelled"
    ) {
      console.log("[v0] Starting polling for game updates (every 2 seconds)")

      pollInterval = setInterval(async () => {
        if (!gameState) return

        const { data: currentChallenge } = await supabase
          .from("challenges")
          .select("status, cancelled_by")
          .eq("id", challengeId)
          .single()

        if (currentChallenge?.status === "cancelled") {
          console.log("[v0] Game was cancelled by opponent")
          const cancelledBy =
            currentChallenge.cancelled_by === challenge?.challenger_id
              ? challengerInfo?.username
              : opponentInfo?.username
          setCancelledByName(cancelledBy || "Gegner")
          setShowOpponentCancelledModal(true)

          setTimeout(() => {
            router.push("/lobby")
          }, 3000)
          return
        }

        const { data: currentMatch } = await supabase
          .from("live_matches")
          .select("player1_score, player2_score, current_player_id, status, winner_id")
          .eq("id", gameState.id)
          .single()

        if (currentMatch) {
          const hasChanged =
            currentMatch.player1_score !== gameState.player1_score ||
            currentMatch.player2_score !== gameState.player2_score ||
            currentMatch.current_player_id !== gameState.current_player_id ||
            currentMatch.status !== gameState.status

          if (hasChanged) {
            console.log("[v0] Game state changed, reloading...")
            loadGame()
          }
        }
      }, 2000)
    }

    return () => {
      console.log("[v0] Stopping polling")
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [gameState, challenge, challengerInfo, opponentInfo])

  async function loadGame() {
    if (!user) return
    setIsLoading(true)

    const { data: challengeData, error: challengeError } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", challengeId)
      .single()

    console.log("[v0] Challenge data:", challengeData, challengeError)

    if (challengeData) {
      setChallenge(challengeData)

      const { data: challengerProfile, error: challengerError } = await supabase
        .from("user_profiles")
        .select("user_id, player_id, club_players(name)")
        .eq("user_id", challengeData.challenger_id)
        .single()

      const { data: opponentProfile, error: opponentError } = await supabase
        .from("user_profiles")
        .select("user_id, player_id, club_players(name)")
        .eq("user_id", challengeData.opponent_id)
        .single()

      console.log("[v0] Challenger profile:", challengerProfile, challengerError)
      console.log("[v0] Opponent profile:", opponentProfile, opponentError)

      const challengerName = challengerProfile?.club_players?.name || "Spieler 1"
      const opponentName = opponentProfile?.club_players?.name || "Spieler 2"

      const challengerData = {
        user_id: challengeData.challenger_id,
        username: challengerName,
      }

      const opponentData = {
        user_id: challengeData.opponent_id,
        username: opponentName,
      }

      console.log("[v0] Final player data:", challengerData, opponentData)

      setChallengerInfo(challengerData)
      setOpponentInfo(opponentData)

      if (challengeData.status === "completed" && !hasShownWinnerModal) {
        const winner =
          challengeData.winner_id === challengeData.challenger_id ? challengerData.username : opponentData.username
        setWinnerName(winner)
        setIsWinner(challengeData.winner_id === user?.id)
        setShowWinnerModal(true)
        setHasShownWinnerModal(true)
        setIsLoading(false)
        return
      }

      const { data: existingMatches, error: matchesError } = await supabase
        .from("live_matches")
        .select("*")
        .eq("challenge_id", challengeId)
        .order("created_at", { ascending: true })
        .limit(1)

      console.log("[v0] Existing matches:", existingMatches, matchesError)

      const gameData = existingMatches && existingMatches.length > 0 ? existingMatches[0] : null

      if (!gameData && !matchesError) {
        console.log("[v0] No match found, attempting to create one")
        const { data: newGame, error: insertError } = await supabase
          .from("live_matches")
          .insert([
            {
              challenge_id: challengeId,
              player1_id: challengeData.challenger_id,
              player2_id: challengeData.opponent_id,
              current_player_id: challengeData.challenger_id,
              player1_score: 501,
              player2_score: 501,
              game_mode: challengeData.game_mode,
              status: "active",
            },
          ])
          .select()
          .single()

        if (newGame) {
          console.log("[v0] New game created:", newGame)
          setGameState(newGame)
          await loadTurns(newGame.id)
          await calculateThrowCounts(newGame.id, challengeData.challenger_id, challengeData.opponent_id)
        } else if (insertError) {
          console.log("[v0] Error creating game (probably already exists):", insertError)

          if (insertError.code === "23505") {
            console.log("[v0] Loading existing match after conflict...")
            const { data: existingMatch } = await supabase
              .from("live_matches")
              .select("*")
              .eq("challenge_id", challengeId)
              .single()

            if (existingMatch) {
              console.log("[v0] Found existing match:", existingMatch)
              setGameState(existingMatch)
              await loadTurns(existingMatch.id)
              await calculateThrowCounts(existingMatch.id, challengeData.challenger_id, challengeData.opponent_id)
            }
          }
        }
      } else if (gameData) {
        setGameState(gameData)
        await loadTurns(gameData.id)
        await calculateThrowCounts(gameData.id, challengeData.challenger_id, challengeData.opponent_id)
      } else if (matchesError) {
        console.error("[v0] Error loading game:", matchesError)
        alert(`Fehler beim Laden des Spiels: ${matchesError.message}`)
      }
    }

    setIsLoading(false)
  }

  async function calculateThrowCounts(matchId: string, player1Id: string, player2Id: string) {
    const { data: player1Throws } = await supabase
      .from("match_throws")
      .select("id")
      .eq("match_id", matchId)
      .eq("player_id", player1Id)

    const { data: player2Throws } = await supabase
      .from("match_throws")
      .select("id")
      .eq("match_id", matchId)
      .eq("player_id", player2Id)

    setPlayer1ThrowCount(player1Throws?.length || 0)
    setPlayer2ThrowCount(player2Throws?.length || 0)
  }

  async function loadTurns(gameId: string) {
    const { data } = await supabase
      .from("match_throws")
      .select("*")
      .eq("match_id", gameId)
      .order("created_at", { ascending: false })
      .limit(10)

    if (data) {
      setTurns(data)
    }
  }

  async function submitScore() {
    if (!gameState || !challenge || !user) return

    const score = Number.parseInt(currentScore)
    if (isNaN(score) || score < 0 || score > 180) {
      setShowInvalidScoreModal(true)
      return
    }

    const isPlayer1 = user.id === challenge.challenger_id
    const currentRemaining = isPlayer1 ? gameState.player1_score : gameState.player2_score
    const newRemaining = currentRemaining - score

    if (newRemaining < 0 || newRemaining === 1) {
      setShowBustModal(true)
      setTimeout(() => setShowBustModal(false), 2000)

      const nextPlayerId =
        gameState.current_player_id === challenge.challenger_id ? challenge.opponent_id : challenge.challenger_id

      console.log("[v0] Bust! Switching player from", gameState.current_player_id, "to", nextPlayerId)

      await supabase
        .from("live_matches")
        .update({
          current_player_id: nextPlayerId,
        })
        .eq("id", gameState.id)

      setGameState({
        ...gameState,
        current_player_id: nextPlayerId,
      })
      setCurrentScore("")
      setLastClickedScore(null)
      return
    }

    const throwNumber = isPlayer1 ? player1ThrowCount + 1 : player2ThrowCount + 1

    console.log("[v0] Submitting throw:", { score, throwNumber, newRemaining })

    const { error: throwError } = await supabase.from("match_throws").insert([
      {
        match_id: gameState.id,
        player_id: user.id,
        throw_number: throwNumber,
        dart1_score: 0,
        dart2_score: 0,
        dart3_score: 0,
        total_score: score,
        remaining_score: newRemaining,
        is_bust: false,
      },
    ])

    if (throwError) {
      console.error("[v0] Error inserting throw:", throwError)
      alert(`Fehler beim Speichern des Wurfs: ${throwError.message}`)
      return
    }

    if (newRemaining === 0) {
      console.log("[v0] Game won by", user.id)

      await supabase
        .from("live_matches")
        .update({
          [isPlayer1 ? "player1_score" : "player2_score"]: newRemaining,
          status: "finished",
          winner_id: user.id,
        })
        .eq("id", gameState.id)

      const { error: challengeError } = await supabase
        .from("challenges")
        .update({
          status: "completed",
          winner_id: user.id,
        })
        .eq("id", challengeId)

      if (challengeError) {
        console.error("[v0] Error updating challenge:", challengeError)
      }

      const winner = isPlayer1 ? challengerInfo?.username : opponentInfo?.username
      setWinnerName(winner || "Du")
      setIsWinner(true)
      setShowWinnerModal(true)
      setHasShownWinnerModal(true)
      return
    }

    const nextPlayerId =
      gameState.current_player_id === challenge.challenger_id ? challenge.opponent_id : challenge.challenger_id

    console.log("[v0] Switching player from", gameState.current_player_id, "to", nextPlayerId)

    const { error: updateError } = await supabase
      .from("live_matches")
      .update({
        [isPlayer1 ? "player1_score" : "player2_score"]: newRemaining,
        current_player_id: nextPlayerId,
      })
      .eq("id", gameState.id)

    if (updateError) {
      console.error("[v0] Error updating game state:", updateError)
      alert(`Fehler beim Aktualisieren des Spielstands: ${updateError.message}`)
      return
    }

    console.log("[v0] Game state updated successfully")

    setGameState({
      ...gameState,
      [isPlayer1 ? "player1_score" : "player2_score"]: newRemaining,
      current_player_id: nextPlayerId,
    })

    if (isPlayer1) {
      setPlayer1ThrowCount(player1ThrowCount + 1)
    } else {
      setPlayer2ThrowCount(player2ThrowCount + 1)
    }

    const newTurn: Turn = {
      id: `temp-${Date.now()}`,
      match_id: gameState.id,
      player_id: user.id,
      total_score: score,
      remaining_score: newRemaining,
      throw_number: throwNumber,
      dart1_score: 0,
      dart2_score: 0,
      dart3_score: 0,
      is_bust: false,
      created_at: new Date().toISOString(),
    }
    setTurns([newTurn, ...turns])

    setCurrentScore("")
    setLastClickedScore(null)
  }

  async function undoLastTurn() {
    if (!gameState || turns.length === 0) return

    const lastTurn = turns[0]

    await supabase.from("match_throws").delete().eq("id", lastTurn.id)

    const isPlayer1 = lastTurn.player_id === challenge?.challenger_id
    const restoredScore = lastTurn.remaining_score + lastTurn.total_score

    await supabase
      .from("live_matches")
      .update({
        [isPlayer1 ? "player1_score" : "player2_score"]: restoredScore,
        current_player_id: lastTurn.player_id,
      })
      .eq("id", gameState.id)

    await loadGame()
  }

  async function cancelGame() {
    if (!challenge || !user) return

    const { error } = await supabase
      .from("challenges")
      .update({
        status: "cancelled",
        cancelled_by: user.id,
      })
      .eq("id", challengeId)

    if (error) {
      console.error("[v0] Error cancelling game:", error)
      alert(`Fehler beim Abbrechen des Spiels: ${error.message}`)
      return
    }

    console.log("[v0] Game cancelled by user")
    router.push("/lobby")
  }

  async function requestRevenge() {
    if (!challenge || !user || !challengerInfo || !opponentInfo) return

    setIsRequestingRevenge(true)

    const opponentId = user.id === challenge.challenger_id ? challenge.opponent_id : challenge.challenger_id

    const { data: newChallenge, error } = await supabase
      .from("challenges")
      .insert([
        {
          challenger_id: user.id,
          opponent_id: opponentId,
          game_mode: challenge.game_mode,
          status: "accepted",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating revanche:", error)
      alert(`Fehler beim Erstellen der Revanche: ${error.message}`)
      setIsRequestingRevenge(false)
      return
    }

    console.log("[v0] Revanche created:", newChallenge)
    router.push(`/game/${newChallenge.id}`)
  }

  function calculateAverage(pointsScored: number, throwCount: number): string {
    if (throwCount === 0) return "0.00"
    const average = pointsScored / throwCount
    return average.toFixed(2)
  }

  function getCheckoutSuggestions(score: number): string[] {
    const checkouts: { [key: number]: string[] } = {
      170: ["T20, T20, Bull"],
      167: ["T20, T19, Bull"],
      164: ["T20, T18, Bull", "T19, T19, Bull"],
      161: ["T20, T17, Bull"],
      160: ["T20, T20, D20"],
      158: ["T20, T20, D19"],
      157: ["T20, T19, D20"],
      156: ["T20, T20, D18"],
      155: ["T20, T19, D19"],
      154: ["T20, T18, D20"],
      153: ["T20, T19, D18"],
      152: ["T20, T20, D16"],
      151: ["T20, T17, D20"],
      150: ["T20, T18, D18"],
      149: ["T20, T19, D16"],
      148: ["T20, T20, D14"],
      147: ["T20, T17, D18"],
      146: ["T20, T18, D16"],
      145: ["T20, T19, D14"],
      144: ["T20, T20, D12"],
      143: ["T20, T17, D16"],
      142: ["T20, T14, D20"],
      141: ["T20, T19, D12"],
      140: ["T20, T20, D10"],
      139: ["T20, T13, D20"],
      138: ["T20, T18, D12"],
      137: ["T20, T19, D10"],
      136: ["T20, T20, D8"],
      135: ["T20, T17, D12"],
      134: ["T20, T14, D16"],
      133: ["T20, T19, D8"],
      132: ["T20, T16, D12"],
      131: ["T20, T13, D16"],
      130: ["T20, T18, D8"],
      129: ["T19, T16, D12"],
      128: ["T18, T14, D16"],
      127: ["T20, T17, D8"],
      126: ["T19, T19, D6"],
      125: ["T18, T13, D16"],
      124: ["T20, T14, D11"],
      123: ["T19, T16, D9"],
      122: ["T18, T18, D7"],
      121: ["T20, T11, D14"],
      120: ["T20, 20, D20"],
      119: ["T19, T12, D13"],
      118: ["T20, 18, D20"],
      117: ["T20, 17, D20"],
      116: ["T20, 16, D20"],
      115: ["T20, 15, D20"],
      114: ["T20, 14, D20"],
      113: ["T20, 13, D20"],
      112: ["T20, 12, D20"],
      111: ["T20, 11, D20"],
      110: ["T20, 10, D20"],
      109: ["T20, 9, D20"],
      108: ["T20, 8, D20"],
      107: ["T19, 10, D20"],
      106: ["T20, 6, D20"],
      105: ["T20, 5, D20"],
      104: ["T18, 10, D20"],
      103: ["T19, 6, D20"],
      102: ["T20, 10, D16"],
      101: ["T17, 10, D20"],
      100: ["T20, D20"],
      99: ["T19, 10, D16"],
      98: ["T20, D19"],
      97: ["T19, D20"],
      96: ["T20, D18"],
      95: ["T19, D19"],
      94: ["T18, D20"],
      93: ["T19, D18"],
      92: ["T20, D16"],
      91: ["T17, D20"],
      90: ["T18, D18"],
      89: ["T19, D16"],
      88: ["T16, D20"],
      87: ["T17, D18"],
      86: ["T18, D16"],
      85: ["T15, D20"],
      84: ["T20, D12"],
      83: ["T17, D16"],
      82: ["T14, D20"],
      81: ["T19, D12"],
      80: ["T20, D10"],
      79: ["T13, D20"],
      78: ["T18, D12"],
      77: ["T19, D10"],
      76: ["T20, D8"],
      75: ["T17, D12"],
      74: ["T14, D16"],
      73: ["T19, D8"],
      72: ["T16, D12"],
      71: ["T13, D16"],
      70: ["T18, D8"],
      69: ["T19, D6"],
      68: ["T20, D4"],
      67: ["T17, D8"],
      66: ["T10, D18"],
      65: ["T19, D4"],
      64: ["T16, D8"],
      63: ["T13, D12"],
      62: ["T10, D16"],
      61: ["T15, D8"],
      60: ["20, D20"],
      59: ["19, D20"],
      58: ["18, D20"],
      57: ["17, D20"],
      56: ["16, D20"],
      55: ["15, D20"],
      54: ["14, D20"],
      53: ["13, D20"],
      52: ["12, D20"],
      51: ["11, D20"],
      50: ["10, D20"],
      49: ["9, D20"],
      48: ["8, D20"],
      47: ["7, D20"],
      46: ["6, D20"],
      45: ["5, D20"],
      44: ["4, D20"],
      43: ["3, D20"],
      42: ["2, D20"],
      41: ["9, D16"],
      40: ["D20"],
      39: ["7, D16"],
      38: ["D19"],
      37: ["5, D16"],
      36: ["D18"],
      35: ["3, D16"],
      34: ["D17"],
      33: ["1, D16"],
      32: ["D16"],
      31: ["15, D8"],
      30: ["D15"],
      29: ["13, D8"],
      28: ["D14"],
      27: ["11, D8"],
      26: ["D13"],
      25: ["9, D8"],
      24: ["D12"],
      23: ["7, D8"],
      22: ["D11"],
      21: ["5, D8"],
      20: ["D10"],
      19: ["3, D8"],
      18: ["D9"],
      17: ["1, D8"],
      16: ["D8"],
      15: ["7, D4"],
      14: ["D7"],
      13: ["5, D4"],
      12: ["D6"],
      11: ["3, D4"],
      10: ["D5"],
      9: ["1, D4"],
      8: ["D4"],
      7: ["3, D2"],
      6: ["D3"],
      5: ["1, D2"],
      4: ["D2"],
      3: ["1, D1"],
      2: ["D1"],
    }
    return checkouts[score] || []
  }

  if (isLoading || !challenge || !gameState || !challengerInfo || !opponentInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-orange-50 to-gray-50">
        <div className="text-center">
          <Target className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-orange-50 to-gray-50">
        <p className="text-muted-foreground">Please log in to play</p>
      </div>
    )
  }

  const isMyTurn = gameState.current_player_id === user.id
  const isPlayer1 = user.id === challenge.challenger_id

  const player1PointsScored = 501 - gameState.player1_score
  const player2PointsScored = 501 - gameState.player2_score
  const player1Average = calculateAverage(player1PointsScored, player1ThrowCount)
  const player2Average = calculateAverage(player2PointsScored, player2ThrowCount)

  const myScore = isPlayer1 ? gameState.player1_score : gameState.player2_score
  const checkoutSuggestions = myScore <= 170 && myScore > 1 ? getCheckoutSuggestions(myScore) : []

  return (
    <div className="min-h-screen bg-white">
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Spiel abbrechen?</DialogTitle>
            <DialogDescription className="text-center">
              Möchtest du das Spiel wirklich abbrechen? Dein Gegner wird benachrichtigt und das Spiel wird beendet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowCancelModal(false)} className="w-full sm:w-auto">
              Weiterspielen
            </Button>
            <Button variant="destructive" onClick={cancelGame} className="w-full sm:w-auto">
              Spiel abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOpponentCancelledModal} onOpenChange={setShowOpponentCancelledModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Spiel abgebrochen</DialogTitle>
            <DialogDescription className="text-center">
              <span className="font-bold text-primary">{cancelledByName}</span> hat das Spiel abgebrochen. Du wirst zur
              Lobby zurückgeleitet.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={showWinnerModal} onOpenChange={setShowWinnerModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              {isWinner ? (
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center animate-pulse">
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                  <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-bounce" />
                  <Sparkles className="w-6 h-6 text-yellow-400 absolute -bottom-1 -left-1 animate-bounce delay-100" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <Target className="w-12 h-12 text-gray-500" />
                </div>
              )}
            </div>
            <DialogTitle className="text-center text-2xl">
              {isWinner ? "🎯 Glückwunsch! 🎯" : "Spiel beendet"}
            </DialogTitle>
            <DialogDescription className="text-center text-lg">
              {isWinner ? (
                <>
                  <span className="font-bold text-primary text-xl">Du hast gewonnen!</span>
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Dein Average:</strong> {isPlayer1 ? player1Average : player2Average}
                    </p>
                    <p className="text-sm text-green-800">
                      <strong>Würfe:</strong> {isPlayer1 ? player1ThrowCount : player2ThrowCount}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <span className="font-bold text-primary">{winnerName}</span> hat das Spiel gewonnen.
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Dein Average:</strong> {isPlayer1 ? player1Average : player2Average}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Würfe:</strong> {isPlayer1 ? player1ThrowCount : player2ThrowCount}
                    </p>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => router.push("/lobby")} variant="default" className="w-full" size="lg">
              Zurück zur Lobby
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBustModal} onOpenChange={setShowBustModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center animate-bounce">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl text-red-600">BUST!</DialogTitle>
            <DialogDescription className="text-center text-lg">
              Ungültiger Wurf! Deine Punktzahl bleibt unverändert.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={showInvalidScoreModal} onOpenChange={setShowInvalidScoreModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-orange-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Ungültige Eingabe</DialogTitle>
            <DialogDescription className="text-center text-lg">
              Bitte gib einen gültigen Score zwischen 0 und 180 ein.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowInvalidScoreModal(false)} className="w-full">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showStatsModal} onOpenChange={setShowStatsModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Spiel-Statistiken
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600">
                  <AvatarFallback className="bg-transparent">
                    <User className="w-6 h-6 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">{challengerInfo.username}</p>
                  <p className="text-sm text-muted-foreground">Spieler 1</p>
                </div>
              </div>
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Restpunkte:</span>
                  <span className="text-lg font-bold text-primary">{gameState.player1_score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Punkte erzielt:</span>
                  <span className="text-lg font-bold">{player1PointsScored}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Würfe:</span>
                  <span className="text-lg font-bold">{player1ThrowCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">3-Dart-Average:</span>
                  <span className="text-lg font-bold text-orange-600">{player1Average}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600">
                  <AvatarFallback className="bg-transparent">
                    <User className="w-6 h-6 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">{opponentInfo.username}</p>
                  <p className="text-sm text-muted-foreground">Spieler 2</p>
                </div>
              </div>
              <div className="space-y-3 p-4 bg-green-50 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Restpunkte:</span>
                  <span className="text-lg font-bold text-primary">{gameState.player2_score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Punkte erzielt:</span>
                  <span className="text-lg font-bold">{player2PointsScored}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Würfe:</span>
                  <span className="text-lg font-bold">{player2ThrowCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">3-Dart-Average:</span>
                  <span className="text-lg font-bold text-orange-600">{player2Average}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Checkout-Vorschläge</DialogTitle>
            <DialogDescription className="text-center">
              Mögliche Wege, um <span className="font-bold text-primary">{myScore}</span> Punkte auszuchecken:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {checkoutSuggestions.length > 0 ? (
              checkoutSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200"
                >
                  <p className="text-center font-mono font-semibold text-lg">{suggestion}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">Keine Checkout-Vorschläge verfügbar</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <header className="border-b border-border bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              className="gap-2 hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Lobby
            </Button>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold">501 Spiel</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowStatsModal(true)} className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistiken
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className={`${isPlayer1 && isMyTurn ? "ring-2 ring-orange-500 shadow-xl" : "shadow-md"} bg-white`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600">
                    <AvatarFallback className="bg-transparent">
                      <User className="w-6 h-6 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{challengerInfo.username}</CardTitle>
                  </div>
                </div>
                {isPlayer1 && isMyTurn && (
                  <Badge variant="default" className="bg-gradient-to-r from-orange-500 to-red-600">
                    Dein Zug
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-5xl font-bold text-primary mb-2">{gameState.player1_score}</p>
                <p className="text-sm text-muted-foreground">Würfe: {player1ThrowCount}</p>
                <p className="text-sm font-semibold text-orange-600 mt-1">Ø {player1Average}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={`${!isPlayer1 && isMyTurn ? "ring-2 ring-orange-500 shadow-xl" : "shadow-md"} bg-white`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600">
                    <AvatarFallback className="bg-transparent">
                      <User className="w-6 h-6 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{opponentInfo.username}</CardTitle>
                  </div>
                </div>
                {!isPlayer1 && isMyTurn && (
                  <Badge variant="default" className="bg-gradient-to-r from-orange-500 to-red-600">
                    Dein Zug
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-5xl font-bold text-primary mb-2">{gameState.player2_score}</p>
                <p className="text-sm text-muted-foreground">Würfe: {player2ThrowCount}</p>
                <p className="text-sm font-semibold text-orange-600 mt-1">Ø {player2Average}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isMyTurn && checkoutSuggestions.length > 0 && (
          <Card className="mb-4 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="py-4">
              <Button
                onClick={() => setShowCheckoutModal(true)}
                variant="outline"
                className="w-full gap-2 bg-white hover:bg-green-50"
              >
                <Lightbulb className="w-4 h-4" />
                Checkout-Vorschläge anzeigen ({myScore} Punkte)
              </Button>
            </CardContent>
          </Card>
        )}

        {isMyTurn && (
          <Card className="mb-6 bg-white shadow-lg">
            <CardHeader>
              <CardTitle>Gib deinen Score ein</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Score eingeben (0-180)"
                  value={currentScore}
                  onChange={(e) => setCurrentScore(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitScore()}
                  min="0"
                  max="180"
                  className="text-lg"
                />
                <Button onClick={submitScore} size="lg" className="gap-2">
                  <Target className="w-4 h-4" />
                  Senden
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[180, 171, 154, 140, 100, 60, 57, 54, 40].map((score) => (
                  <Button
                    key={score}
                    variant="outline"
                    onClick={() => {
                      setLastClickedScore(score)
                      setCurrentScore(score.toString())
                    }}
                    className={`h-12 transition-all ${
                      lastClickedScore === score
                        ? "bg-orange-500 text-white border-orange-600 hover:bg-orange-600"
                        : "hover:bg-orange-50 hover:border-orange-300"
                    }`}
                  >
                    {score}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!isMyTurn && (
          <Card className="mb-6 bg-white shadow-md">
            <CardContent className="py-8 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
              <p className="text-lg font-medium">Warte auf Gegner...</p>
              <p className="text-sm text-muted-foreground mt-2">
                {gameState.current_player_id === challenge.challenger_id
                  ? challengerInfo.username
                  : opponentInfo.username}{" "}
                ist am Zug
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Letzte Würfe</CardTitle>
              {turns.length > 0 && isMyTurn && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undoLastTurn}
                  className="gap-2 bg-transparent hover:bg-gray-100"
                >
                  <Undo2 className="w-4 h-4" />
                  Rückgängig
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {turns.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Noch keine Würfe</p>
            ) : (
              <div className="space-y-2">
                {turns.map((turn) => {
                  const playerName =
                    turn.player_id === challenge.challenger_id ? challengerInfo.username : opponentInfo.username
                  const isChallenger = turn.player_id === challenge.challenger_id
                  return (
                    <div
                      key={turn.id}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          className={`w-8 h-8 ${isChallenger ? "bg-gradient-to-br from-blue-500 to-purple-600" : "bg-gradient-to-br from-green-500 to-teal-600"}`}
                        >
                          <AvatarFallback className="bg-transparent">
                            <User className="w-4 h-4 text-white" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{playerName}</p>
                          <p className="text-xs text-muted-foreground">Wurf #{turn.throw_number}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{turn.total_score}</p>
                        <p className="text-xs text-muted-foreground">Übrig: {turn.remaining_score}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
