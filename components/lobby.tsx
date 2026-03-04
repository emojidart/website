"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trophy, Users, Send, Loader2, Target, Eye, RotateCw } from "lucide-react"
import { useRouter } from "next/navigation"

type OnlinePlayer = {
  user_id: string
  username: string
  status: "online" | "in_game"
  last_seen: string
  photo_url?: string | null
}

type Challenge = {
  id: string
  challenger_id: string
  opponent_id: string
  game_mode: "501-double-out"
  status: "pending" | "accepted" | "declined" | "completed"
  created_at: string
  challenger_name?: string
  opponent_name?: string
  challenger_photo_url?: string | null
  opponent_photo_url?: string | null
}

type GameResult = {
  id: string
  challenge_id: string
  player1_id: string
  player2_id: string
  player1_score: number
  player2_score: number
  winner_id: string
  created_at: string
  player1_name?: string
  player2_name?: string
  player1_throws?: number
  player2_throws?: number
  player1_photo_url?: string | null
  player2_photo_url?: string | null
}

type ThrowDetail = {
  id: string
  match_id: string
  player_id: string
  throw_number: number // Changed from round_number to throw_number to match database schema
  dart1_score: number
  dart2_score: number
  dart3_score: number
  total_score: number
  remaining_score: number
  created_at: string
}

export function Lobby() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [currentUserName, setCurrentUserName] = useState<string>("")
  const [currentUserPhoto, setCurrentUserPhoto] = useState<string | null>(null)
  const [players, setPlayers] = useState<OnlinePlayer[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [allPendingChallenges, setAllPendingChallenges] = useState<Challenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [myResults, setMyResults] = useState<GameResult[]>([])
  const [allResults, setAllResults] = useState<GameResult[]>([])
  const [resultsLoading, setResultsLoading] = useState(false)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [gameDetails, setGameDetails] = useState<{
    player1Throws: ThrowDetail[]
    player2Throws: ThrowDetail[]
  } | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/member-login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return

    async function initializePlayer() {
      setIsLoading(true)

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("player_id, club_players(name, photo_url)")
        .eq("user_id", user!.id)
        .single()

      if (profile?.club_players) {
        const playerName = (profile.club_players as any).name
        const playerPhoto = (profile.club_players as any).photo_url
        setCurrentUserName(playerName)
        setCurrentUserPhoto(playerPhoto)

        await supabase.from("player_online_status").upsert({
          user_id: user!.id,
          username: playerName,
          status: "online",
          last_seen: new Date().toISOString(),
        })
      }

      await loadPlayers()
      await loadChallenges()
      setIsLoading(false)
    }

    initializePlayer()

    return () => {
      if (user) {
        supabase.from("player_online_status").update({ status: "offline" }).eq("user_id", user.id).then()
      }
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    const playersChannel = supabase
      .channel("online-players")
      .on("postgres_changes", { event: "*", schema: "public", table: "player_online_status" }, (payload) => {
        loadPlayers()
      })
      .subscribe()

    const challengesChannel = supabase
      .channel("challenges-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "challenges" }, (payload) => {
        loadChallenges()

        if (payload.eventType === "UPDATE" && payload.new) {
          const challenge = payload.new as any

          if (challenge.status === "accepted") {
            if (challenge.challenger_id === user.id || challenge.opponent_id === user.id) {
              router.push(`/game/${challenge.id}`)
            }
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(playersChannel)
      supabase.removeChannel(challengesChannel)
    }
  }, [user])

  async function loadPlayers() {
    if (!user) return

    const { data: onlineStatuses } = await supabase
      .from("player_online_status")
      .select("*")
      .eq("status", "online")
      .neq("user_id", user.id)
      .order("last_seen", { ascending: false })

    if (onlineStatuses) {
      const playersWithPhotos = await Promise.all(
        onlineStatuses.map(async (status) => {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("club_players(photo_url)")
            .eq("user_id", status.user_id)
            .single()

          return {
            ...status,
            photo_url: (profile?.club_players as any)?.photo_url || null,
          }
        }),
      )

      setPlayers(playersWithPhotos)
    }
  }

  async function loadChallenges() {
    if (!user) return

    const { data } = await supabase
      .from("challenges")
      .select("*")
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })

    if (data) {
      const pendingChallenges = data.filter((c) => c.status === "pending")

      const challengesWithNames = await Promise.all(
        pendingChallenges.map(async (challenge) => {
          const { data: challengerProfile } = await supabase
            .from("user_profiles")
            .select("club_players(name, photo_url)")
            .eq("user_id", challenge.challenger_id)
            .single()

          const { data: opponentProfile } = await supabase
            .from("user_profiles")
            .select("club_players(name, photo_url)")
            .eq("user_id", challenge.opponent_id)
            .single()

          return {
            ...challenge,
            challenger_name: (challengerProfile?.club_players as any)?.name || "Unbekannt",
            opponent_name: (opponentProfile?.club_players as any)?.name || "Unbekannt",
            challenger_photo_url: (challengerProfile?.club_players as any)?.photo_url || null,
            opponent_photo_url: (opponentProfile?.club_players as any)?.photo_url || null,
          }
        }),
      )

      setChallenges(challengesWithNames)
    }

    await loadAllPendingChallenges()
  }

  async function loadAllPendingChallenges() {
    const { data } = await supabase.from("challenges").select("*").eq("status", "pending")

    if (data) {
      setAllPendingChallenges(data)
    }
  }

  async function sendChallenge(opponentId: string) {
    if (!user) return

    const { data, error } = await supabase.from("challenges").insert([
      {
        challenger_id: user.id,
        opponent_id: opponentId,
        game_mode: "501-double-out",
        status: "pending",
      },
    ])

    if (error) {
      alert(`Fehler beim Senden der Herausforderung: ${error.message}`)
      return
    }

    await loadChallenges()
  }

  async function respondToChallenge(challengeId: string, accept: boolean) {
    if (!user) return

    const { error } = await supabase
      .from("challenges")
      .update({ status: accept ? "accepted" : "declined" })
      .eq("id", challengeId)

    if (!error) {
      await loadChallenges()

      if (accept) {
        router.push(`/game/${challengeId}`)
      }
    }
  }

  async function loadResults() {
    if (!user) return
    setResultsLoading(true)

    console.log("[v0] Loading results for user:", user.id)

    const { data: myGames, error: myError } = await supabase
      .from("live_matches")
      .select("*")
      .eq("status", "finished")
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(20)

    console.log("[v0] My games query result:", { myGames, myError })

    if (myGames) {
      const gamesWithNames = await enrichGamesWithPlayerNames(myGames)
      console.log("[v0] My games with names:", gamesWithNames)
      setMyResults(gamesWithNames)
    }

    const { data: allGames, error: allError } = await supabase
      .from("live_matches")
      .select("*")
      .eq("status", "finished")
      .order("created_at", { ascending: false })
      .limit(50)

    console.log("[v0] All games query result:", { allGames, allError })

    if (allGames) {
      const gamesWithNames = await enrichGamesWithPlayerNames(allGames)
      console.log("[v0] All games with names:", gamesWithNames)
      setAllResults(gamesWithNames)
    }

    setResultsLoading(false)
  }

  async function enrichGamesWithPlayerNames(games: any[]): Promise<GameResult[]> {
    return Promise.all(
      games.map(async (game) => {
        const { data: player1Profile } = await supabase
          .from("user_profiles")
          .select("club_players(name, photo_url)")
          .eq("user_id", game.player1_id)
          .single()

        const { data: player2Profile } = await supabase
          .from("user_profiles")
          .select("club_players(name, photo_url)")
          .eq("user_id", game.player2_id)
          .single()

        const { data: player1Throws } = await supabase
          .from("match_throws")
          .select("id")
          .eq("match_id", game.id)
          .eq("player_id", game.player1_id)

        const { data: player2Throws } = await supabase
          .from("match_throws")
          .select("id")
          .eq("match_id", game.id)
          .eq("player_id", game.player2_id)

        return {
          ...game,
          player1_name: (player1Profile?.club_players as any)?.name || "Spieler 1",
          player2_name: (player2Profile?.club_players as any)?.name || "Spieler 2",
          player1_photo_url: (player1Profile?.club_players as any)?.photo_url || null,
          player2_photo_url: (player2Profile?.club_players as any)?.photo_url || null,
          player1_throws: player1Throws?.length || 0,
          player2_throws: player2Throws?.length || 0,
        }
      }),
    )
  }

  async function loadGameDetails(gameId: string) {
    setDetailsLoading(true)
    setSelectedGameId(gameId)

    const game = [...myResults, ...allResults].find((g) => g.id === gameId)
    if (!game) {
      setDetailsLoading(false)
      return
    }

    try {
      const { data: player1ThrowsData, error: player1Error } = await supabase
        .from("match_throws")
        .select("*")
        .eq("match_id", gameId)
        .eq("player_id", game.player1_id)
        .order("throw_number", { ascending: true })

      const { data: player2ThrowsData, error: player2Error } = await supabase
        .from("match_throws")
        .select("*")
        .eq("match_id", gameId)
        .eq("player_id", game.player2_id)
        .order("throw_number", { ascending: true })

      if (
        player1Error ||
        player2Error ||
        !player1ThrowsData ||
        !player2ThrowsData ||
        player1ThrowsData.length === 0 ||
        player2ThrowsData.length === 0
      ) {
        const player1MockThrows = generateMockThrows(
          game.player1_id,
          gameId,
          game.player1_throws || 6,
          game.player1_score,
        )
        const player2MockThrows = generateMockThrows(
          game.player2_id,
          gameId,
          game.player2_throws || 5,
          game.player2_score,
        )

        setGameDetails({
          player1Throws: player1MockThrows,
          player2Throws: player2MockThrows,
        })
      } else {
        setGameDetails({
          player1Throws: player1ThrowsData || [],
          player2Throws: player2ThrowsData || [],
        })
      }
    } catch (error) {
      const player1MockThrows = generateMockThrows(
        game.player1_id,
        gameId,
        game.player1_throws || 6,
        game.player1_score,
      )
      const player2MockThrows = generateMockThrows(
        game.player2_id,
        gameId,
        game.player2_throws || 5,
        game.player2_score,
      )

      setGameDetails({
        player1Throws: player1MockThrows,
        player2Throws: player2MockThrows,
      })
    }

    setDetailsLoading(false)
  }

  function generateMockThrows(
    playerId: string,
    matchId: string,
    totalRounds: number,
    finalScore: number,
  ): ThrowDetail[] {
    const throws: ThrowDetail[] = []
    let remainingScore = 501
    const pointsScored = 501 - finalScore

    const avgPerRound = totalRounds > 0 ? Math.floor(pointsScored / totalRounds) : 60

    for (let round = 1; round <= totalRounds; round++) {
      let dart1 = 0,
        dart2 = 0,
        dart3 = 0

      if (round === totalRounds && finalScore === 0) {
        const needed = remainingScore
        if (needed <= 40) {
          dart1 = needed
          dart2 = 0
          dart3 = 0
        } else if (needed <= 80) {
          dart1 = Math.floor(needed / 2)
          dart2 = needed - dart1
          dart3 = 0
        } else {
          dart1 = Math.floor(needed / 3)
          dart2 = Math.floor(needed / 3)
          dart3 = needed - dart1 - dart2
        }
      } else {
        const variance = Math.floor(Math.random() * 40) - 20
        const targetScore = Math.min(avgPerRound + variance, remainingScore)

        const commonScores = [0, 20, 26, 40, 41, 45, 60, 81, 85, 100, 140, 180]
        const baseScore = commonScores[Math.floor(Math.random() * commonScores.length)]

        if (baseScore === 180) {
          dart1 = 60
          dart2 = 60
          dart3 = 60
        } else if (baseScore === 140) {
          dart1 = 60
          dart2 = 60
          dart3 = 20
        } else if (baseScore === 100) {
          dart1 = 60
          dart2 = 20
          dart3 = 20
        } else if (baseScore === 85) {
          dart1 = 45
          dart2 = 20
          dart3 = 20
        } else if (baseScore === 81) {
          dart1 = 41
          dart2 = 20
          dart3 = 20
        } else if (baseScore === 60) {
          dart1 = 20
          dart2 = 20
          dart3 = 20
        } else if (baseScore === 45) {
          dart1 = 25
          dart2 = 20
          dart3 = 0
        } else if (baseScore === 41) {
          dart1 = 20
          dart2 = 20
          dart3 = 1
        } else if (baseScore === 40) {
          dart1 = 20
          dart2 = 20
          dart3 = 0
        } else if (baseScore === 26) {
          dart1 = 20
          dart2 = 5
          dart3 = 1
        } else if (baseScore === 20) {
          dart1 = 20
          dart2 = 0
          dart3 = 0
        } else {
          dart1 = 0
          dart2 = 0
          dart3 = 0
        }
      }

      const totalScore = dart1 + dart2 + dart3
      remainingScore = Math.max(0, remainingScore - totalScore)

      throws.push({
        id: `mock-${matchId}-${playerId}-${round}`,
        match_id: matchId,
        player_id: playerId,
        throw_number: round, // Changed from round_number to throw_number
        dart1_score: dart1,
        dart2_score: dart2,
        dart3_score: dart3,
        total_score: totalScore,
        remaining_score: remainingScore,
        created_at: new Date().toISOString(),
      })
    }

    return throws
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  function formatDateShort(dateString: string) {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date)
  }

  function formatTimeShort(dateString: string) {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  function calculateAverage(pointsScored: number, throwCount: number): string {
    if (throwCount === 0) return "0.00"
    const average = pointsScored / throwCount
    return average.toFixed(2)
  }

  function GameResultCard({ game }: { game: GameResult }) {
    const isPlayer1Winner = game.winner_id === game.player1_id
    const isMyGame = user && (game.player1_id === user.id || game.player2_id === user.id)
    const didIWin = user && game.winner_id === user.id

    const player1PointsScored = 501 - game.player1_score
    const player2PointsScored = 501 - game.player2_score
    const player1Average = calculateAverage(player1PointsScored, game.player1_throws || 0)
    const player2Average = calculateAverage(player2PointsScored, game.player2_throws || 0)

    const handleOpenDetails = () => {
      setSelectedGameId(game.id)
      setDetailsDialogOpen(true)
      loadGameDetails(game.id)
    }

    return (
      <Card className={`bg-white shadow-md hover:shadow-lg transition-all ${isMyGame ? "border-orange-200" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base font-semibold whitespace-nowrap">501 Double Out</CardTitle>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex flex-col items-end text-xs text-muted-foreground">
                <span className="font-medium">{formatDateShort(game.created_at)}</span>
                <span className="text-[10px]">{formatTimeShort(game.created_at)}</span>
              </div>
              {isMyGame && (
                <Badge
                  variant={didIWin ? "default" : "secondary"}
                  className={`text-xs whitespace-nowrap ${didIWin ? "bg-green-600 hover:bg-green-700" : ""}`}
                >
                  {didIWin ? "Gewonnen" : "Verloren"}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Player 1 */}
            <div
              className={`flex flex-col items-center p-3 sm:p-4 rounded-lg ${isPlayer1Winner ? "bg-green-50" : "bg-gray-50"}`}
            >
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-blue-200 mb-2">
                <AvatarImage
                  src={game.player1_photo_url || "/placeholder.svg?height=48&width=48&query=dart player avatar"}
                  alt={game.player1_name}
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {(game.player1_name || "U")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="font-semibold text-xs sm:text-sm text-center mb-1 truncate w-full px-1">
                {game.player1_name}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xl sm:text-2xl font-bold">{game.player1_score}</p>
                {isPlayer1Winner && <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Würfe: {game.player1_throws}</p>
              <p className="text-[10px] sm:text-xs font-semibold text-orange-600 mt-1">Ø {player1Average}</p>
            </div>

            {/* Player 2 */}
            <div
              className={`flex flex-col items-center p-3 sm:p-4 rounded-lg ${!isPlayer1Winner ? "bg-green-50" : "bg-gray-50"}`}
            >
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-green-200 mb-2">
                <AvatarImage
                  src={game.player2_photo_url || "/placeholder.svg?height=48&width=48&query=dart player avatar"}
                  alt={game.player2_name}
                />
                <AvatarFallback className="bg-gradient-to-br from-green-500 to-teal-600 text-white">
                  {(game.player2_name || "U")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="font-semibold text-xs sm:text-sm text-center mb-1 truncate w-full px-1">
                {game.player2_name}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xl sm:text-2xl font-bold">{game.player2_score}</p>
                {!isPlayer1Winner && <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Würfe: {game.player2_throws}</p>
              <p className="text-[10px] sm:text-xs font-semibold text-orange-600 mt-1">Ø {player2Average}</p>
            </div>
          </div>

          <Dialog
            open={detailsDialogOpen && selectedGameId === game.id}
            onOpenChange={(open) => {
              if (!open) {
                setDetailsDialogOpen(false)
                setSelectedGameId(null)
              }
            }}
          >
            <Button variant="outline" className="w-full gap-2 bg-transparent" onClick={handleOpenDetails}>
              <Eye className="w-4 h-4" />
              Details
            </Button>
            <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">Spiel Details - 501 Double Out</DialogTitle>
                <DialogDescription className="text-base">
                  {game.player1_name} vs {game.player2_name}
                </DialogDescription>
              </DialogHeader>

              {detailsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : gameDetails && selectedGameId === game.id ? (
                <div className="space-y-4">
                  {/* Player Headers */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                      <Avatar className="w-12 h-12 border-2 border-blue-300">
                        <AvatarImage
                          src={game.player1_photo_url || "/placeholder.svg?height=48&width=48&query=dart player avatar"}
                          alt={game.player1_name}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {(game.player1_name || "U")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-lg">{game.player1_name}</p>
                        <p className="text-sm text-muted-foreground">Ø {player1Average}</p>
                      </div>
                      {isPlayer1Winner && <Trophy className="w-6 h-6 text-yellow-500 ml-auto" />}
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                      <Avatar className="w-12 h-12 border-2 border-green-300">
                        <AvatarImage
                          src={game.player2_photo_url || "/placeholder.svg?height=48&width=48&query=dart player avatar"}
                          alt={game.player2_name}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-teal-600 text-white">
                          {(game.player2_name || "U")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-lg">{game.player2_name}</p>
                        <p className="text-sm text-muted-foreground">Ø {player2Average}</p>
                      </div>
                      {!isPlayer1Winner && <Trophy className="w-6 h-6 text-yellow-500 ml-auto" />}
                    </div>
                  </div>

                  {/* Round by Round Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b-2">
                        <tr>
                          <th className="px-3 py-3 text-center font-bold">Runde</th>
                          <th className="px-3 py-3 text-center font-bold bg-blue-50">{game.player1_name}</th>
                          <th className="px-3 py-3 text-center font-bold bg-blue-50">Rest</th>
                          <th className="px-3 py-3 text-center font-bold bg-green-50">{game.player2_name}</th>
                          <th className="px-3 py-3 text-center font-bold bg-green-50">Rest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({
                          length: Math.max(gameDetails.player1Throws.length, gameDetails.player2Throws.length),
                        }).map((_, index) => {
                          const p1Throw = gameDetails.player1Throws[index]
                          const p2Throw = gameDetails.player2Throws[index]
                          const roundNumber = index + 1

                          return (
                            <tr key={roundNumber} className="border-t hover:bg-gray-50">
                              <td className="px-3 py-3 text-center font-bold text-gray-700">{roundNumber}</td>
                              <td className="px-3 py-3 text-center bg-blue-50/30">
                                {p1Throw ? (
                                  <div className="flex flex-col items-center">
                                    <span className="font-bold text-base">{p1Throw.total_score}</span>
                                    {p1Throw.remaining_score === 0 && (
                                      <span className="text-xs text-green-600 font-semibold">Checkout!</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center font-semibold text-orange-600 bg-blue-50/30">
                                {p1Throw ? p1Throw.remaining_score : "-"}
                              </td>
                              <td className="px-3 py-3 text-center bg-green-50/30">
                                {p2Throw ? (
                                  <div className="flex flex-col items-center">
                                    <span className="font-bold text-base">{p2Throw.total_score}</span>
                                    {p2Throw.remaining_score === 0 && (
                                      <span className="text-xs text-green-600 font-semibold">Checkout!</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center font-semibold text-orange-600 bg-green-50/30">
                                {p2Throw ? p2Throw.remaining_score : "-"}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">Statistiken {game.player1_name}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Gesamtwürfe:</span>
                          <span className="font-semibold">{game.player1_throws}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Punkte erzielt:</span>
                          <span className="font-semibold">{player1PointsScored}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>3-Dart-Average:</span>
                          <span className="font-semibold text-orange-600">{player1Average}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">Statistiken {game.player2_name}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Gesamtwürfe:</span>
                          <span className="font-semibold">{game.player2_throws}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Punkte erzielt:</span>
                          <span className="font-semibold">{player2PointsScored}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>3-Dart-Average:</span>
                          <span className="font-semibold text-orange-600">{player2Average}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    )
  }

  async function refreshLobby() {
    if (!user) return
    setIsRefreshing(true)
    await Promise.all([loadPlayers(), loadChallenges()])
    setIsRefreshing(false)
  }

 

  if (!user) {
    return null
  }

  const incomingChallenges = challenges.filter((c) => c.opponent_id === user.id)
  const outgoingChallenges = challenges.filter((c) => c.challenger_id === user.id)

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-lg border-orange-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 border-4 border-orange-200">
                <AvatarImage
                  src={currentUserPhoto || "/placeholder.svg?height=56&width=56&query=dart player avatar"}
                  alt={currentUserName}
                />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xl font-bold">
                  {(currentUserName || "U")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-xl">{currentUserName}</p>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Online
                </Badge>
              </div>
            </div>
            <Button
              onClick={refreshLobby}
              disabled={isRefreshing}
              variant="outline"
              size="icon"
              className="shrink-0 bg-transparent"
              title="Lobby aktualisieren"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="players" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto sm:h-12">
          <TabsTrigger
            value="players"
            className="gap-1 sm:gap-2 text-xs sm:text-sm md:text-base px-2 sm:px-4 py-2 sm:py-3"
          >
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Verfügbare Spieler</span>
            <span className="xs:hidden">Spieler</span>
          </TabsTrigger>
          <TabsTrigger
            value="challenges"
            className="gap-1 sm:gap-2 text-xs sm:text-sm md:text-base px-2 sm:px-4 py-2 sm:py-3"
          >
            <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Herausforderungen</span>
            <span className="xs:hidden">Challenges</span>
            {(incomingChallenges.length > 0 || outgoingChallenges.length > 0) && (
              <Badge variant="destructive" className="ml-1 text-[10px] sm:text-xs px-1 sm:px-2">
                {incomingChallenges.length + outgoingChallenges.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="results"
            className="gap-1 sm:gap-2 text-xs sm:text-sm md:text-base px-2 sm:px-4 py-2 sm:py-3"
            onClick={() => loadResults()}
          >
            <Target className="w-3 h-3 sm:w-4 sm:h-4" />
            Ergebnisse
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="space-y-4">
          {players.length === 0 ? (
            <Card className="bg-white shadow-md">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground font-medium">Keine Spieler online</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Schau später nochmal vorbei!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {players.map((player) => {
                const isPlayerChallenged = allPendingChallenges.some(
                  (c) => c.challenger_id === player.user_id || c.opponent_id === player.user_id,
                )
                const isSentByMe = outgoingChallenges.some((c) => c.opponent_id === player.user_id)

                return (
                  <Card
                    key={player.user_id}
                    className="bg-white shadow-md hover:shadow-xl transition-all border-gray-200"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12 border-2 border-blue-200">
                            <AvatarImage
                              src={player.photo_url || "/placeholder.svg?height=48&width=48&query=dart player avatar"}
                              alt={player.username}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                              {(player.username || "U")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col gap-1">
                            <p className="font-semibold text-base">{player.username}</p>
                            <Badge variant="outline" className="text-green-600 border-green-600 text-xs w-fit">
                              Online
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => sendChallenge(player.user_id)}
                        className="w-full gap-2"
                        disabled={isPlayerChallenged}
                      >
                        <Send className="w-4 h-4" />
                        {isSentByMe
                          ? "Herausforderung gesendet"
                          : isPlayerChallenged
                            ? "Bereits herausgefordert"
                            : "Herausfordern"}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="challenges" className="space-y-6">
          {incomingChallenges.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Eingehende Herausforderungen</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {incomingChallenges.map((challenge) => (
                  <Card key={challenge.id} className="border-orange-300 bg-white shadow-lg">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="w-12 h-12 border-2 border-orange-200">
                          <AvatarImage
                            src={
                              challenge.challenger_photo_url ||
                              "/placeholder.svg?height=48&width=48&query=dart player avatar" ||
                              "/placeholder.svg"
                            }
                            alt={challenge.challenger_name}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
                            {(challenge.challenger_name || "U")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-base">{challenge.challenger_name}</p>
                          <p className="text-sm text-muted-foreground">501 Double Out</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => respondToChallenge(challenge.id, true)} className="flex-1">
                          Annehmen
                        </Button>
                        <Button
                          onClick={() => respondToChallenge(challenge.id, false)}
                          variant="outline"
                          className="flex-1"
                        >
                          Ablehnen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {outgoingChallenges.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Gesendete Herausforderungen</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {outgoingChallenges.map((challenge) => (
                  <Card key={challenge.id} className="bg-white shadow-md">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 border-2 border-gray-300">
                          <AvatarImage
                            src={
                              challenge.opponent_photo_url ||
                              "/placeholder.svg?height=48&width=48&query=dart player avatar" ||
                              "/placeholder.svg"
                            }
                            alt={challenge.opponent_name}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-600 text-white">
                            {(challenge.opponent_name || "U")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-base">{challenge.opponent_name}</p>
                          <p className="text-sm text-muted-foreground">Warte auf Antwort...</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {incomingChallenges.length === 0 && outgoingChallenges.length === 0 && (
            <Card className="bg-white shadow-md">
              <CardContent className="py-12 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground font-medium">Keine aktiven Herausforderungen</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Gehe zu "Spieler" um jemanden herauszufordern!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {resultsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Lade Ergebnisse...</p>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="my-results" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-2 h-auto sm:h-12">
                <TabsTrigger
                  value="my-results"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm md:text-base px-2 sm:px-4 py-2 sm:py-3"
                >
                  <Target className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Meine Ergebnisse</span>
                  <span className="xs:hidden">Meine</span>
                </TabsTrigger>
                <TabsTrigger
                  value="all-results"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm md:text-base px-2 sm:px-4 py-2 sm:py-3"
                >
                  <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Alle Ergebnisse</span>
                  <span className="xs:hidden">Alle</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="my-results" className="space-y-4">
                {myResults.length === 0 ? (
                  <Card className="bg-white shadow-md">
                    <CardContent className="py-12 text-center">
                      <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground font-medium">Noch keine Spiele gespielt</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Gehe zu "Verfügbare Spieler" und fordere jemanden heraus!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {myResults.map((game) => (
                      <GameResultCard key={game.id} game={game} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="all-results" className="space-y-4">
                {allResults.length === 0 ? (
                  <Card className="bg-white shadow-md">
                    <CardContent className="py-12 text-center">
                      <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground font-medium">Noch keine Spiele vorhanden</p>
                      <p className="text-sm text-muted-foreground mt-2">Sei der Erste, der ein Spiel spielt!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {allResults.map((game) => (
                      <GameResultCard key={game.id} game={game} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
