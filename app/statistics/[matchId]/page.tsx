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

function HeaderSpacer() {
  return <div className="h-12 sm:h-14" aria-hidden="true" />
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, matchId, teamId])

  const fetchMatchData = async () => {
    try {
      setLoading(true)

      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select(
          `
          *,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name),
          home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
          away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name)
        `,
        )
        .eq("id", matchId)
        .single()

      if (matchError) throw new Error("Spiel nicht gefunden")
      setMatch(matchData)

      const { data: teamData, error: teamError } = await supabase.from("teams").select("id, name").eq("id", teamId).single()
      if (teamError) throw new Error("Team nicht gefunden")
      setMyTeam(teamData)
    } catch (err: any) {
      setError(err?.message || "Fehler beim Laden der Daten")
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
    return <div className="min-h-[1px]" aria-hidden="true" />
  }

  if (error || !match || !myTeam) {
    return (
      <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
        <Header />
        <HeaderSpacer />

        <main className="flex-grow flex items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-white mb-2">Fehler</h1>
            <p className="text-white/50 mb-4">{error || "Daten nicht gefunden"}</p>
            <Button onClick={() => router.push("/member-dashboard-app")} className="bg-orange-500 font-black text-white shadow-[0_0_24px_rgba(249,115,22,.12)] hover:bg-orange-500/90 hover:text-white">
              Zurück zum Dashboard
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
      <Header />
      <HeaderSpacer />

      <main className="w-full max-w-none px-3 pb-24 pt-16 sm:px-5 sm:pt-20 lg:px-8 xl:px-10 2xl:px-12">
        <div className="mb-4 sm:mb-5">
          <Button onClick={() => router.push("/member-dashboard-app")} variant="outline" className="flex items-center gap-2 rounded-xl border-white/[0.10] bg-white/[0.035] px-4 font-bold text-white/80 shadow-none hover:border-orange-300/20 hover:bg-white/[0.06] hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Dashboard
          </Button>
        </div>

        <div className="mb-4 sm:mb-5">
          <Card className="relative w-full overflow-hidden rounded-[28px] border border-orange-300/[0.10] bg-black/35 text-white shadow-[0_0_34px_rgba(249,115,22,.045),0_28px_80px_-50px_rgba(0,0,0,.98)] backdrop-blur-2xl">
            <CardHeader className="relative p-4 sm:p-5 lg:p-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(249,115,22,.12),transparent_28%),radial-gradient(circle_at_92%_0%,rgba(14,165,233,.07),transparent_30%)]" />
              <div className="relative">
              <CardTitle className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-lg font-black leading-tight tracking-tight text-white sm:text-xl lg:text-2xl">
                <Target className="h-6 w-6 shrink-0 text-orange-300 lg:h-7 lg:w-7" />
                Spielstatistiken - {myTeam.name}
                {(match.home_score > 0 || match.away_score > 0) && (
                  <span className="rounded-xl border border-orange-300/20 bg-orange-500/12 px-2.5 py-1 text-base font-black text-orange-200 shadow-[0_0_18px_rgba(249,115,22,.08)] sm:text-lg">
                    {match.home_team_id === teamId
                      ? `${match.home_score || 0}:${match.away_score || 0}`
                      : `${match.away_score || 0}:${match.home_score || 0}`}
                  </span>
                )}
                {!(match.home_score > 0 || match.away_score > 0) && " vs "}
                {getOpponentName()}
              </CardTitle>

              <p className="mt-2 break-words text-xs font-semibold leading-5 text-white/45 sm:text-sm lg:text-base">
                {formatDate(match.match_date)} • {match.match_time} • {match.venue}
              </p>
              </div>
            </CardHeader>
          </Card>
        </div>

        <MatchStatisticsPage match={match} myTeamId={teamId!} myTeam={myTeam} showHeader={false} />
      </main>
    </div>
  )
}
