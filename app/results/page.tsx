"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Target, User, Loader2 } from "lucide-react"
import { Header } from "@/components/header"
import { useRouter } from "next/navigation"

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
}

export default function ResultsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [myResults, setMyResults] = useState<GameResult[]>([])
  const [allResults, setAllResults] = useState<GameResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/member-login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadResults()
    }
  }, [user])

  async function loadResults() {
    if (!user) return
    setIsLoading(true)

    // Load my results
    const { data: myGames } = await supabase
      .from("live_matches")
      .select("*")
      .eq("status", "finished")
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(20)

    if (myGames) {
      const gamesWithNames = await enrichGamesWithPlayerNames(myGames)
      setMyResults(gamesWithNames)
    }

    // Load all results
    const { data: allGames } = await supabase
      .from("live_matches")
      .select("*")
      .eq("status", "finished")
      .order("created_at", { ascending: false })
      .limit(50)

    if (allGames) {
      const gamesWithNames = await enrichGamesWithPlayerNames(allGames)
      setAllResults(gamesWithNames)
    }

    setIsLoading(false)
  }

  async function enrichGamesWithPlayerNames(games: any[]): Promise<GameResult[]> {
    return Promise.all(
      games.map(async (game) => {
        const { data: player1Profile } = await supabase
          .from("user_profiles")
          .select("club_players(name)")
          .eq("user_id", game.player1_id)
          .single()

        const { data: player2Profile } = await supabase
          .from("user_profiles")
          .select("club_players(name)")
          .eq("user_id", game.player2_id)
          .single()

        // Count throws for each player
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
          player1_throws: player1Throws?.length || 0,
          player2_throws: player2Throws?.length || 0,
        }
      }),
    )
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

  function GameResultCard({ game }: { game: GameResult }) {
    const isPlayer1Winner = game.winner_id === game.player1_id
    const isMyGame = user && (game.player1_id === user.id || game.player2_id === user.id)
    const didIWin = user && game.winner_id === user.id

    return (
      <Card className={`bg-white shadow-md hover:shadow-lg transition-all ${isMyGame ? "border-orange-200" : ""}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">501 Double Out</CardTitle>
            <Badge variant="outline" className="text-xs">
              {formatDate(game.created_at)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Player 1 */}
            <div
              className={`flex flex-col items-center p-4 rounded-lg ${isPlayer1Winner ? "bg-green-50" : "bg-gray-50"}`}
            >
              <Avatar className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 mb-2">
                <AvatarFallback className="bg-transparent">
                  <User className="w-6 h-6 text-white" />
                </AvatarFallback>
              </Avatar>
              <p className="font-semibold text-sm text-center mb-1">{game.player1_name}</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{501 - game.player1_score}</p>
                {isPlayer1Winner && <Trophy className="w-5 h-5 text-yellow-500" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Würfe: {game.player1_throws}</p>
            </div>

            {/* Player 2 */}
            <div
              className={`flex flex-col items-center p-4 rounded-lg ${!isPlayer1Winner ? "bg-green-50" : "bg-gray-50"}`}
            >
              <Avatar className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 mb-2">
                <AvatarFallback className="bg-transparent">
                  <User className="w-6 h-6 text-white" />
                </AvatarFallback>
              </Avatar>
              <p className="font-semibold text-sm text-center mb-1">{game.player2_name}</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{501 - game.player2_score}</p>
                {!isPlayer1Winner && <Trophy className="w-5 h-5 text-yellow-500" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Würfe: {game.player2_throws}</p>
            </div>
          </div>

          {isMyGame && (
            <div className="text-center">
              <Badge variant={didIWin ? "default" : "secondary"} className="text-xs">
                {didIWin ? "Gewonnen 🎉" : "Verloren"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-gray-50">
        <Header />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Lade Ergebnisse...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Spiel-Ergebnisse</h1>
          </div>
          <p className="text-muted-foreground">Verfolge deine Spiele und die Ergebnisse aller Spieler</p>
        </div>

        <Tabs defaultValue="my-results" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
            <TabsTrigger value="my-results" className="gap-2 text-base">
              <Target className="w-4 h-4" />
              Meine Ergebnisse
            </TabsTrigger>
            <TabsTrigger value="all-results" className="gap-2 text-base">
              <Trophy className="w-4 h-4" />
              Alle Ergebnisse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-results" className="space-y-4">
            {myResults.length === 0 ? (
              <Card className="bg-white shadow-md">
                <CardContent className="py-12 text-center">
                  <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground font-medium">Noch keine Spiele gespielt</p>
                  <p className="text-sm text-muted-foreground mt-2">Gehe zur Lobby und fordere jemanden heraus!</p>
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
      </main>
    </div>
  )
}
