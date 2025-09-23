"use client"

import { Header } from "@/components/header"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2, AlertCircle, ArrowLeft, Target } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { MatchStatisticsPage } from "@/components/match-statistics-page"

interface Match {
  id: string
  season_id: string
  home_team_id: string
  away_team_id: string
  match_date: string
  match_time: string
  venue: string
  home_score: number
  away_score: number
  status: string
  match_format?: "team" | "individual" | "best_of_three"
  division_type?: "team_division" | "individual_division"
  home_team: { id: string; name: string } | null
  away_team: { id: string; name: string } | null
  dart_type?: string
  home_team_type?: string
  away_team_type?: string
  home_opponent_team: { id: string; name: string } | null
  away_opponent_team: { id: string; name: string } | null
}

interface Team {
  id: string
  name: string
}

export default function StatisticsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const matchId = params.matchId as string
  const teamId = searchParams.get("teamId")

  const [match, setMatch] = useState<Match | null>(null)
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user && matchId && teamId) {
      fetchMatchData()
    }
  }, [user, authLoading, matchId, teamId])

  const fetchMatchData = async () => {
    try {
      setLoading(true)

      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name),
          home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
          away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name)
        `)
        .eq("id", matchId)
        .single()

      if (matchError) {
        throw new Error("Spiel nicht gefunden")
      }

      setMatch(matchData)

      // Fetch team data
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id, name")
        .eq("id", teamId)
        .single()

      if (teamError) {
        throw new Error("Team nicht gefunden")
      }

      setMyTeam(teamData)
    } catch (err: any) {
      setError(err.message || "Fehler beim Laden der Daten")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  }

  const getTeamName = (match: Match, isHome: boolean) => {
    if (isHome) {
      return match?.home_team_type === "club_team" ? match?.home_team?.name : match?.home_opponent_team?.name
    } else {
      return match?.away_team_type === "club_team" ? match?.away_team?.name : match?.away_opponent_team?.name
    }
  }

  const getOpponentName = () => {
    if (!match || !teamId) return "Unbekannt"

    const isHomeTeam = match.home_team_id === teamId
    return getTeamName(match, !isHomeTeam) || "Unbekannt"
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <span className="text-lg font-medium">Lade Statistiken...</span>
          </div>
        </main>
      </div>
    )
  }

  if (error || !match || !myTeam) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Fehler</h1>
            <p className="text-gray-600 mb-4">{error || "Daten nicht gefunden"}</p>
            <Button onClick={() => router.push("/member-dashboard")} className="bg-orange-600 hover:bg-orange-700">
              Zurück zum Dashboard
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <div className="mb-8">
          <Button
            onClick={() => router.push("/member-dashboard")}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Dashboard
          </Button>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <Card className="shadow-xl border-0 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl lg:text-2xl font-bold">
                <Target className="h-6 w-6 lg:h-7 lg:w-7 text-orange-600" />
                Spielstatistiken - {myTeam.name}
                {(match.home_score > 0 || match.away_score > 0) && (
                  <>
                    {" "}
                    <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-bold text-lg shadow-md">
                      {match.home_team_id === teamId
                        ? `${match.home_score || 0}:${match.away_score || 0}`
                        : `${match.away_score || 0}:${match.home_score || 0}`}
                    </span>{" "}
                  </>
                )}
                {!(match.home_score > 0 || match.away_score > 0) && " vs "}
                {getOpponentName()}
              </CardTitle>
              <p className="text-sm lg:text-base text-muted-foreground">
                {formatDate(match.match_date)} • {match.match_time} • {match.venue}
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Statistics Component */}
        <MatchStatisticsPage match={match} myTeamId={teamId} myTeam={myTeam} showHeader={false} />
      </main>
    </div>
  )
}
