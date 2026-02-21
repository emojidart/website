"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowLeft, Loader2, Target } from "lucide-react"
import DartStatsClassicPage from "@/components/live/dart-stats-classic"

interface Match {
  id: string
  match_date: string
  match_time: string | null
  venue: string | null
  home_team_id: string
  away_team_id: string
  home_score: number | null
  away_score: number | null
  home_team_type?: string
  away_team_type?: string
  dart_type?: string
  home_team: { id: string; name: string } | null
  away_team: { id: string; name: string } | null
  home_opponent_team: { id: string; name: string } | null
  away_opponent_team: { id: string; name: string } | null
}

interface Team {
  id: string
  name: string
}

type TeamPlayer = { id: string; name: string }

type LineupRow = {
  player_id: string
  position: number
  is_substitute: boolean
  club_players?: { id: string; name: string } | null
}

export default function LiveStatisticsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  const matchId = (params?.matchId as string) || ""
  const teamId = searchParams.get("team_id") || searchParams.get("teamId") || ""

  const [match, setMatch] = useState<Match | null>(null)
  const [myTeam, setMyTeam] = useState<Team | null>(null)

  const [lineupPlayers, setLineupPlayers] = useState<TeamPlayer[]>([])
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/member-login")
      return
    }

    if (!authLoading && user) {
      if (!matchId || !teamId) {
        setLoading(false)
        setError("Fehler: match_id oder team_id fehlt in der URL.")
        return
      }
      void fetchAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, matchId, teamId])

  const fetchAll = async () => {
    try {
      setLoading(true)
      setError(null)

      const [{ data: matchData, error: matchError }, { data: teamData, error: teamError }] = await Promise.all([
        supabase
          .from("matches")
          .select(
            `
            *,
            home_team:teams!matches_home_team_id_fkey(id, name),
            away_team:teams!matches_away_team_id_fkey(id, name),
            home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
            away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name)
          `
          )
          .eq("id", matchId)
          .single(),
        supabase.from("teams").select("id, name").eq("id", teamId).single(),
      ])

      if (matchError) throw new Error("Spiel nicht gefunden")
      if (teamError) throw new Error("Team nicht gefunden")

      setMatch(matchData as Match)
      setMyTeam(teamData as Team)

      // 1) Aufstellung laden
      const { data: lu, error: luError } = await supabase
        .from("match_lineups")
        .select("player_id,position,is_substitute, club_players:club_players(id,name)")
        .eq("match_id", matchId)
        .eq("team_id", teamId)
        .order("position", { ascending: true })

      if (luError) throw luError

      const lineupRows = ((lu as any) || []) as LineupRow[]

      const starters = lineupRows
        .filter((x) => !x.is_substitute)
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

      const subs = lineupRows.filter((x) => x.is_substitute)

      const ordered = [...starters, ...subs]
        .map((r) => ({
          id: r.player_id,
          name: r.club_players?.name ?? r.player_id,
        }))
        .filter((p) => !!p.id && !!p.name)

      setLineupPlayers(ordered)

      // 2) Fallback: Teamspieler (nur wenn Aufstellung leer ist, brauchst du weiterhin)
      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select("player_id")
        .eq("team_id", teamId)
        .is("left_at", null)

      if (membersError) throw membersError

      const ids = Array.from(new Set((members || []).map((m: any) => m?.player_id).filter(Boolean))) as string[]
      if (ids.length === 0) {
        setTeamPlayers([])
      } else {
        const { data: playersData, error: playersError } = await supabase
          .from("club_players")
          .select("id, name")
          .in("id", ids)
          .order("name")

        if (playersError) throw playersError
        setTeamPlayers((playersData || []) as TeamPlayer[])
      }
    } catch (e: any) {
      setError(e?.message || "Fehler beim Laden der Daten")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("de-DE")

  const opponentName = useMemo(() => {
    if (!match) return "Unbekannt"

    const isHome = match.home_team_id === teamId
    const otherSide = isHome ? "away" : "home"
    const teamType = (match as any)[`${otherSide}_team_type`]

    if (teamType === "own" || teamType === "club_team") {
      return (match as any)[`${otherSide}_team`]?.name || "Unbekannt"
    }
    if (teamType === "opponent" || teamType === "opponent_team") {
      return (match as any)[`${otherSide}_opponent_team`]?.name || "Unbekannt"
    }

    return (
      (match as any)[`${otherSide}_team`]?.name ||
      (match as any)[`${otherSide}_opponent_team`]?.name ||
      "Unbekannt"
    )
  }, [match, teamId])

  // ✅ Quelle: Aufstellung, sonst Teamspieler
  const sourcePlayers = lineupPlayers.length > 0 ? lineupPlayers : teamPlayers

  // ✅ WICHTIG: memoize, damit Props stabil sind
  const initialPlayers = useMemo(() => sourcePlayers, [sourcePlayers])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <span className="text-lg font-medium">Lade Live-Statistiken...</span>
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
            <Button onClick={() => router.push("/member-dashboard-app")} className="bg-orange-600 hover:bg-orange-700">
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

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-4">
          <Button
            onClick={() => router.push("/member-dashboard-app")}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Dashboard
          </Button>
        </div>

        <Card className="shadow-xl border-0 bg-white mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl lg:text-2xl font-bold">
              <Target className="h-6 w-6 text-orange-600" />
              Live – {myTeam.name} vs {opponentName}
            </CardTitle>
            <p className="text-sm lg:text-base text-muted-foreground">
              {formatDate(match.match_date)}
              {match.match_time ? ` • ${match.match_time}` : ""} {match.venue ? ` • ${match.venue}` : ""}
            </p>
          </CardHeader>
        </Card>

        {/* ✅ ALLE Spieler übergeben */}
        <DartStatsClassicPage initialPlayers={initialPlayers} loadingPlayers={false} />
      </main>
    </div>
  )
}