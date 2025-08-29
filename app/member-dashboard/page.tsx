"use client"

import type React from "react"

import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Crown,
  ShieldCheck,
  Users,
  Calendar,
  Target,
  Mail,
  MapPin,
  Hand,
  Settings,
  LogOut,
  Loader2,
  AlertCircle,
  Edit,
  Clock,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

import { MatchStatistics } from "@/components/match-statistics"

interface UserProfile {
  id: string
  user_id: string
  player_id: string
  club_players: {
    id: string
    name: string
    photo_url: string | null
    throwing_hand: string | null
    age: number | null
    origin: string | null
  } | null
}

interface TeamMembership {
  id: string
  team_id: string
  role: string | null
  teams: {
    id: string
    name: string
    logo_url: string | null
  } | null
}

interface TeamMember {
  id: string
  team_id: string
  player_id: string
  role: string | null
  club_players: {
    id: string
    name: string
    photo_url: string | null
    throwing_hand: string | null
    age: number | null
    origin: string | null
  } | null
}

interface LigaStatistic {
  id: string
  player_id: string
  player_name: string
  game_date: string
  throws_180: number
  throws_171: number
  throws_154: number
  throws_under_26: number
  semperit_outs: number
  throws_15: number
  throws_16: number
  throws_17: number
  throws_18: number
  throws_19: number
  throws_20: number
  throws_bull: number
  notes: string | null
  club_players?: {
    name: string
    photo_url: string | null
  }
  created_at?: string
}

interface Match {
  id: string
  season_id: string
  home_team_id: string
  away_team_id: string
  match_date: string
  match_time: string
  venue: string
  home_score: number | null
  away_score: number | null
  status: string
  week_number: number
  home_team: {
    id: string
    name: string
  } | null
  away_team: {
    id: string
    name: string
  } | null
  home_opponent_team: any | null
  away_opponent_team: any | null
  home_team_type: string
  away_team_type: string
}

interface OpponentTeam {
  id: string
  name: string
}

export default function MemberDashboard() {
  const { session, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatchForStats, setSelectedMatchForStats] = useState<Match | null>(null)
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false)
  const [editMatchScores, setEditMatchScores] = useState({ home: 0, away: 0 })
  const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false)
  const [selectedMatchForResults, setSelectedMatchForResults] = useState<string | null>(null)

  const [displayedStats, setDisplayedStats] = useState<LigaStatistic[]>([])
  const [statsDisplayLoading, setStatsDisplayLoading] = useState(false)

  const [leaderboardData, setLeaderboardData] = useState<any[]>([])

  const [editingStatId, setEditingStatId] = useState<string | null>(null)
  const [editingStatData, setEditingStatData] = useState<any>(null)

  const { toast } = useToast()

  const [statsLoading, setStatsLoading] = useState(false)
  const [statsMessage, setStatsMessage] = useState<string>("")
  const [statsMessageType, setStatsMessageType] = useState<"success" | "error" | "info">("info")

  const [statsPlayerId, setStatsPlayerId] = useState<string>("")
  const [gameDate, setGameDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [throws180, setThrows180] = useState<number>(0)
  const [throws171, setThrows171] = useState<number>(0)
  const [throws154, setThrows154] = useState<number>(0)
  const [throwsUnder26, setThrowsUnder26] = useState<number>(0)
  const [semperitOuts, setSemperitOuts] = useState<number>(0)
  const [throws15, setThrows15] = useState<number>(0)
  const [throws16, setThrows16] = useState<number>(0)
  const [throws17, setThrows17] = useState<number>(0)
  const [throws18, setThrows18] = useState<number>(0)
  const [throws19, setThrows19] = useState<number>(0)
  const [throws20, setThrows20] = useState<number>(0)
  const [throwsBull, setThrowsBull] = useState<number>(0)
  const [statsNotes, setStatsNotes] = useState<string>("")

  const [opponentTeams, setOpponentTeams] = useState<OpponentTeam[]>([])

  const handleEditStat = (stat: any) => {
    setEditingStatId(stat.id)
    setEditingStatData({
      player_id: stat.player_id,
      game_date: stat.game_date,
      throws_180: stat.throws_180 || 0,
      throws_171: stat.throws_171 || 0,
      throws_154: stat.throws_154 || 0,
      throws_under_26: stat.throws_under_26 || 0,
      semperit_outs: stat.semperit_outs || 0,
      throws_15: stat.throws_15 || 0,
      throws_16: stat.throws_16 || 0,
      throws_17: stat.throws_17 || 0,
      throws_18: stat.throws_18 || 0,
      throws_19: stat.throws_19 || 0,
      throws_20: stat.throws_20 || 0,
      throws_bull: stat.throws_bull || 0,
      notes: stat.notes || "",
    })
  }

  const handleSaveEdit = async () => {
    if (!editingStatId || !editingStatData) return

    try {
      const { error } = await supabase.from("liga_statistics").update(editingStatData).eq("id", editingStatId)

      if (error) throw error

      setEditingStatId(null)
      setEditingStatData(null)
      fetchLigaStatistics()
      toast({
        title: "Erfolg",
        description: "Statistik wurde erfolgreich aktualisiert.",
      })
    } catch (error) {
      console.error("Error updating statistic:", error)
      toast({
        title: "Fehler",
        description: "Fehler beim Aktualisieren der Statistik.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteStat = async (statId: string) => {
    if (!confirm("Sind Sie sicher, dass Sie diese Statistik löschen möchten?")) return

    try {
      const { error } = await supabase.from("liga_statistics").delete().eq("id", statId)

      if (error) throw error

      fetchLigaStatistics()
      toast({
        title: "Erfolg",
        description: "Statistik wurde erfolgreich gelöscht.",
      })
    } catch (error) {
      console.error("Error deleting statistic:", error)
      toast({
        title: "Fehler",
        description: "Fehler beim Löschen der Statistik.",
        variant: "destructive",
      })
    }
  }

  const calculateLeaderboard = () => {
    const playerStats: { [key: string]: any } = {}

    displayedStats.forEach((stat) => {
      const playerId = stat.player_id
      if (!playerStats[playerId]) {
        playerStats[playerId] = {
          player_id: playerId,
          player_name: stat.club_players?.name || "Unbekannt",
          photo_url: stat.club_players?.photo_url,
          total_180: 0,
          total_171: 0,
          total_154: 0,
          total_under_26: 0,
          total_semperit: 0,
          total_bull: 0,
          games_played: 0,
          best_score: 0,
        }
      }

      playerStats[playerId].total_180 += stat.throws_180
      playerStats[playerId].total_171 += stat.throws_171
      playerStats[playerId].total_154 += stat.throws_154
      playerStats[playerId].total_under_26 += stat.throws_under_26
      playerStats[playerId].total_semperit += stat.semperit_outs
      playerStats[playerId].total_bull += stat.throws_bull
      playerStats[playerId].games_played += 1

      // Determine best score for this game
      let gameScore = 0
      if (stat.throws_180 > 0) gameScore = 180
      else if (stat.throws_171 > 0) gameScore = 171
      else if (stat.throws_154 > 0) gameScore = 154

      if (gameScore > playerStats[playerId].best_score) {
        playerStats[playerId].best_score = gameScore
      }
    })

    // Convert to array and sort by best scores first, then by total high scores
    const leaderboard = Object.values(playerStats).sort((a: any, b: any) => {
      if (b.best_score !== a.best_score) return b.best_score - a.best_score
      if (b.total_180 !== a.total_180) return b.total_180 - a.total_180
      if (b.total_171 !== a.total_171) return b.total_171 - a.total_171
      return b.total_154 - a.total_154
    })

    setLeaderboardData(leaderboard)
  }

  useEffect(() => {
    if (displayedStats.length > 0) {
      calculateLeaderboard()
    }
  }, [displayedStats])

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user) {
      fetchUserProfile()
    }
  }, [session])

  useEffect(() => {
    if (profile?.player_id && teamMemberships.length > 0) {
      fetchMatches()
    }
  }, [profile, teamMemberships])

  const fetchUserProfile = async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      setError(null)

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select(`
          id,
          user_id,
          player_id,
          club_players (
            id,
            name,
            photo_url,
            throwing_hand,
            age,
            origin
          )
        `)
        .eq("user_id", session.user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      setProfile(profileData)

      // Fetch team memberships
      if (profileData?.player_id) {
        const { data: teamData, error: teamError } = await supabase
          .from("team_members")
          .select(`
            id,
            team_id,
            role,
            teams (
              id,
              name,
              logo_url
            )
          `)
          .eq("player_id", profileData.player_id)

        if (teamError) {
          throw teamError
        }

        setTeamMemberships(teamData || [])

        if (teamData && teamData.length > 0) {
          const teamIds = teamData.map((team) => team.team_id)

          const { data: membersData, error: membersError } = await supabase
            .from("team_members")
            .select(`
              id,
              team_id,
              player_id,
              role,
              club_players (
                id,
                name,
                photo_url,
                throwing_hand,
                age,
                origin
              )
            `)
            .in("team_id", teamIds)
            .order("role", { ascending: false }) // Captain first, then Co-Captain, then Player

          if (membersError) {
            throw membersError
          }

          setTeamMembers(membersData || [])
        }
      }
    } catch (err: any) {
      console.error("Error fetching profile:", err)
      setError("Fehler beim Laden des Profils")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/member-login")
    } catch (err: any) {
      console.error("Logout error:", err)
    }
  }

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case "Captain":
        return <Crown className="h-5 w-5 text-yellow-600" />
      case "Co-Captain":
        return <ShieldCheck className="h-5 w-5 text-blue-600" />
      default:
        return <Users className="h-5 w-5 text-gray-600" />
    }
  }

  const getRoleText = (role: string | null) => {
    switch (role) {
      case "Captain":
        return "Kapitän"
      case "Co-Captain":
        return "Co-Kapitän"
      default:
        return "Spieler"
    }
  }

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case "Captain":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "Co-Captain":
        return "bg-blue-100 text-blue-800 border-blue-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const isLeadershipRole = () => {
    return teamMemberships.some((membership) => membership.role === "Captain" || membership.role === "Co-Captain")
  }

  const getTeamPlayersForStats = () => {
    const leadershipTeams = teamMemberships.filter(
      (membership) => membership.role === "Captain" || membership.role === "Co-Captain",
    )
    const leadershipTeamIds = leadershipTeams.map((team) => team.team_id)

    return teamMembers.filter((member) => leadershipTeamIds.includes(member.team_id) && member.club_players)
  }

  const fetchLigaStatistics = async () => {
    if (!isLeadershipRole()) return

    setStatsDisplayLoading(true)
    try {
      const leadershipTeams = teamMemberships.filter(
        (membership) => membership.role === "Captain" || membership.role === "Co-Captain",
      )
      const leadershipTeamIds = leadershipTeams.map((team) => team.team_id)
      const teamPlayerIds = teamMembers
        .filter((member) => leadershipTeamIds.includes(member.team_id))
        .map((member) => member.player_id)

      if (teamPlayerIds.length === 0) {
        setDisplayedStats([])
        return
      }

      const { data, error } = await supabase
        .from("liga_statistics")
        .select(`
          *,
          club_players (
            name,
            photo_url
          )
        `)
        .in("player_id", teamPlayerIds)
        .order("game_date", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setDisplayedStats(data || [])
    } catch (err: any) {
      console.error("Error fetching liga statistics:", err)
    } finally {
      setStatsDisplayLoading(false)
    }
  }

  useEffect(() => {
    if (isLeadershipRole() && teamMembers.length > 0) {
      fetchLigaStatistics()
    }
  }, [teamMemberships, teamMembers])

  const handleSaveLigaStatistics = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatsLoading(true)
    setStatsMessage("Statistiken werden gespeichert...")
    setStatsMessageType("info")

    if (!user) {
      setStatsMessage("Fehler: Nicht authentifiziert.")
      setStatsMessageType("error")
      setStatsLoading(false)
      return
    }

    if (!statsPlayerId) {
      setStatsMessage("Bitte einen Spieler auswählen.")
      setStatsMessageType("error")
      setStatsLoading(false)
      return
    }

    try {
      const { error } = await supabase.from("liga_statistics").insert([
        {
          player_id: statsPlayerId,
          game_date: gameDate,
          throws_180: throws180,
          throws_171: throws171,
          throws_154: throws154,
          throws_under_26: throwsUnder26,
          semperit_outs: semperitOuts,
          throws_15: throws15,
          throws_16: throws16,
          throws_17: throws17,
          throws_18: throws18,
          throws_19: throws19,
          throws_20: throws20,
          throws_bull: throwsBull,
          notes: statsNotes || null,
          created_by: user.id,
        },
      ])

      if (error) {
        throw error
      }

      setStatsMessage("Ligastatistiken erfolgreich gespeichert!")
      setStatsMessageType("success")

      // Reset form
      setStatsPlayerId("")
      setGameDate(new Date().toISOString().split("T")[0])
      setThrows180(0)
      setThrows171(0)
      setThrows154(0)
      setThrowsUnder26(0)
      setSemperitOuts(0)
      setThrows15(0)
      setThrows16(0)
      setThrows17(0)
      setThrows18(0)
      setThrows19(0)
      setThrows20(0)
      setThrowsBull(0)
      setStatsNotes("")

      fetchLigaStatistics()

      setTimeout(() => {
        setStatsMessage("")
      }, 3000)
    } catch (err: any) {
      console.error("Error saving liga statistics:", err)
      setStatsMessage("Fehler beim Speichern der Statistiken.")
      setStatsMessageType("error")
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchMatches = async () => {
    if (teamMemberships.length === 0) return

    try {
      const teamIds = teamMemberships.map((tm) => tm.team_id)

      const [matchesResponse, opponentTeamsResponse] = await Promise.all([
        supabase
          .from("matches")
          .select(`
            *,
            home_team:teams!matches_home_team_id_fkey(id, name),
            away_team:teams!matches_away_team_id_fkey(id, name),
            season:seasons(id, name, type)
          `)
          .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`)
          .order("match_date", { ascending: true }),
        supabase.from("opponent_teams").select("*"),
      ])

      const { data: matchesData, error: matchesError } = matchesResponse
      const { data: opponentTeamsData, error: opponentTeamsError } = opponentTeamsResponse

      if (matchesError) throw matchesError
      if (opponentTeamsError) throw opponentTeamsError

      const enrichedMatches =
        matchesData?.map((match) => {
          const homeOpponentTeam = match.home_opponent_team_id
            ? opponentTeamsData?.find((team) => team.id === match.home_opponent_team_id)
            : null
          const awayOpponentTeam = match.away_opponent_team_id
            ? opponentTeamsData?.find((team) => team.id === match.away_opponent_team_id)
            : null

          return {
            ...match,
            home_opponent_team: homeOpponentTeam,
            away_opponent_team: awayOpponentTeam,
          }
        }) || []

      setOpponentTeams(opponentTeamsData || [])
      setMatches(enrichedMatches)

      console.log("[v0] Fetched enriched matches data:", enrichedMatches)
      if (enrichedMatches && enrichedMatches.length > 0) {
        console.log("[v0] First match home_team:", enrichedMatches[0].home_team)
        console.log("[v0] First match away_team:", enrichedMatches[0].away_team)
        console.log("[v0] First match home_opponent_team:", enrichedMatches[0].home_opponent_team)
        console.log("[v0] First match away_opponent_team:", enrichedMatches[0].away_opponent_team)
      }
    } catch (err) {
      console.error("Error fetching matches:", err)
    }
  }

  const getTeamName = (match: Match, isHome: boolean) => {
    if (isHome) {
      return match.home_team_type === "own" ? match.home_team?.name : match.home_opponent_team?.name
    } else {
      return match.away_team_type === "own" ? match.away_team?.name : match.away_opponent_team?.name
    }
  }

  const updateMatchResult = async (matchId: string, homeScore: number, awayScore: number) => {
    if (!isLeadershipRole()) return

    try {
      const { error } = await supabase
        .from("matches")
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: "completed",
        })
        .eq("id", matchId)

      if (!error) {
        fetchMatches()
        setIsResultsDialogOpen(false)
        setSelectedMatchForResults(null)
      }
    } catch (err) {
      console.error("Error updating match result:", err)
    }
  }

  const getMatchResult = (match: Match) => {
    if (match.home_score === null || match.away_score === null) return "pending"

    const userTeamIds = teamMemberships.map((tm) => tm.team_id)
    const isUserTeamHome = userTeamIds.includes(match.home_team_id)
    const isUserTeamAway = userTeamIds.includes(match.away_team_id)

    if (!isUserTeamHome && !isUserTeamAway) return "neutral"

    if (match.home_score === match.away_score) return "draw"

    const userTeamWon =
      (isUserTeamHome && match.home_score > match.away_score) || (isUserTeamAway && match.away_score > match.home_score)

    return userTeamWon ? "won" : "lost"
  }

  const getMatchBackgroundColor = (match: Match) => {
    const result = getMatchResult(match)
    switch (result) {
      case "won":
        return "bg-green-50 border-green-200"
      case "lost":
        return "bg-red-50 border-red-200"
      case "draw":
        return "bg-yellow-50 border-yellow-200"
      default:
        return "bg-card"
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <span className="text-lg font-medium">Lade Dashboard...</span>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Fehler</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-orange-600 hover:bg-orange-700">
              Erneut versuchen
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 uppercase tracking-wide">
            Willkommen zurück, {profile?.club_players?.name || "Spieler"}!
          </h1>
          <p className="text-gray-600 text-lg">Hier ist dein persönliches Dashboard bei Emoj!'s Dartverein</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl border-0 bg-white">
              <CardHeader className="text-center pb-4">
                <div className="flex flex-col items-center">
                  <Avatar className="h-24 w-24 mb-4 border-4 border-orange-500 shadow-lg">
                    <AvatarImage
                      src={profile?.club_players?.photo_url || "/placeholder.svg?height=96&width=96&query=darts-player"}
                    />
                    <AvatarFallback className="text-2xl font-bold bg-orange-100 text-orange-700">
                      {profile?.club_players?.name?.charAt(0) || user?.email?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    {profile?.club_players?.name || "Unbekannter Spieler"}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{user?.email}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Player Details */}
                {profile?.club_players && (
                  <div className="space-y-3">
                    {profile.club_players.throwing_hand && (
                      <div className="flex items-center gap-2 text-sm">
                        <Hand className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">Wurfhand:</span>
                        <span>{profile.club_players.throwing_hand}</span>
                      </div>
                    )}
                    {profile.club_players.age && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">Alter:</span>
                        <span>{profile.club_players.age} Jahre</span>
                      </div>
                    )}
                    {profile.club_players.origin && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">Herkunft:</span>
                        <span>{profile.club_players.origin}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-gray-300 hover:bg-gray-50 bg-transparent"
                    disabled
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Profil bearbeiten
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Bald
                    </Badge>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="w-full justify-start border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 bg-transparent"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Abmelden
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Team Memberships */}
            <Card className="shadow-xl border-0 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Users className="h-6 w-6 text-orange-600" />
                  Meine Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamMemberships.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Du bist noch keinem Team zugeordnet.</p>
                    <p className="text-sm mt-2">Wende dich an deinen Kapitän oder Co-Kapitän.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teamMemberships.map((membership) => (
                      <div
                        key={membership.id}
                        className="border-2 border-gray-200 rounded-xl p-4 hover:border-orange-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          {membership.teams?.logo_url ? (
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={membership.teams.logo_url || "/placeholder.svg"} />
                              <AvatarFallback className="bg-orange-100 text-orange-700 font-bold">
                                {membership.teams.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                              <Target className="h-6 w-6 text-orange-600" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-gray-900">{membership.teams?.name || "Unbekanntes Team"}</h3>
                            <div className="flex items-center gap-2">
                              {getRoleIcon(membership.role)}
                              <Badge className={`text-xs border ${getRoleBadgeColor(membership.role)}`}>
                                {getRoleText(membership.role)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card className="shadow-xl border-0 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Users className="h-6 w-6 text-orange-600" />
                  Meine Teammitglieder
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Keine Teammitglieder gefunden.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {teamMemberships.map((membership) => {
                      const teamMembersForThisTeam = teamMembers.filter(
                        (member) => member.team_id === membership.team_id,
                      )

                      return (
                        <div key={membership.id} className="border-2 border-gray-200 rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-4">
                            {membership.teams?.logo_url ? (
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={membership.teams.logo_url || "/placeholder.svg"} />
                                <AvatarFallback className="bg-orange-100 text-orange-700 font-bold">
                                  {membership.teams.name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <Target className="h-5 w-5 text-orange-600" />
                              </div>
                            )}
                            <h3 className="font-bold text-lg text-gray-900">
                              {membership.teams?.name || "Unbekanntes Team"}
                            </h3>
                            <Badge variant="outline" className="ml-auto">
                              {teamMembersForThisTeam.length} Mitglieder
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {teamMembersForThisTeam.map((member) => (
                              <div
                                key={member.id}
                                className={`p-3 rounded-lg border-2 transition-colors ${
                                  member.player_id === profile?.player_id
                                    ? "border-orange-300 bg-orange-50"
                                    : "border-gray-200 bg-gray-50"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage
                                      src={
                                        member.club_players?.photo_url ||
                                        "/placeholder.svg?height=32&width=32&query=darts-player" ||
                                        "/placeholder.svg" ||
                                        "/placeholder.svg" ||
                                        "/placeholder.svg" ||
                                        "/placeholder.svg"
                                      }
                                    />
                                    <AvatarFallback className="text-xs bg-orange-100 text-orange-700">
                                      {member.club_players?.name?.charAt(0) || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-gray-900 truncate">
                                      {member.club_players?.name || "Unbekannt"}
                                      {member.player_id === profile?.player_id && (
                                        <span className="text-orange-600 ml-1">(Du)</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {getRoleIcon(member.role)}
                                      <span className="text-xs text-gray-600">{getRoleText(member.role)}</span>
                                    </div>
                                  </div>
                                </div>
                                {member.club_players?.throwing_hand && (
                                  <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <Hand className="h-3 w-3" />
                                    {member.club_players.throwing_hand}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-xl border-0 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Calendar className="h-6 w-6 text-orange-600" />
                  Spielplan meiner Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Keine Spiele gefunden.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matches.map((match) => (
                      <div key={match.id} className={`border rounded-lg p-4 ${getMatchBackgroundColor(match)}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono">
                              Woche {match.week_number}
                            </Badge>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(match.match_date).toLocaleDateString("de-DE")}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{match.match_time}</span>
                            </div>
                          </div>
                          <Badge variant={match.status === "completed" ? "default" : "secondary"}>
                            {match.status === "completed" ? "Beendet" : "Geplant"}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <div className="font-semibold text-lg mb-1">
                                {getTeamName(match, true) || "Heim Team"}
                              </div>
                              <div className="text-3xl font-bold text-blue-600">{match.home_score ?? "-"}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {match.home_team_type === "own" ? "Heim" : "Heim (Gegner)"}
                              </div>
                            </div>
                            <div className="text-2xl font-bold text-muted-foreground">:</div>
                            <div className="text-center">
                              <div className="font-semibold text-lg mb-1">
                                {getTeamName(match, false) || "Auswärts Team"}
                              </div>
                              <div className="text-3xl font-bold text-blue-600">{match.away_score ?? "-"}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {match.away_team_type === "own" ? "Auswärts" : "Auswärts (Gegner)"}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                              <MapPin className="h-4 w-4" />
                              <span className="font-medium">{match.venue}</span>
                            </div>

                            {isLeadershipRole() && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedMatchForStats(match)
                                    setIsStatsDialogOpen(true)
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Target className="h-4 w-4 mr-2" />
                                  Statistiken
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                  onClick={() => {
                                    setSelectedMatchForResults(match.id)
                                    setIsResultsDialogOpen(true)
                                    setEditMatchScores({
                                      home: match.home_score || 0,
                                      away: match.away_score || 0,
                                    })
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  {match.status === "completed" ? "Bearbeiten" : "Ergebnis"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {selectedMatchForStats && (
          <MatchStatistics
            match={selectedMatchForStats}
            onClose={() => {
              setSelectedMatchForStats(null)
              setIsStatsDialogOpen(false)
            }}
          />
        )}

        <Dialog
          open={isResultsDialogOpen && selectedMatchForResults !== null}
          onOpenChange={(open) => {
            setIsResultsDialogOpen(open)
            if (!open) setSelectedMatchForResults(null)
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="text-center pb-4">
              <DialogTitle className="text-xl font-semibold">Spielergebnis eintragen</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="text-center">
                    <Label className="text-sm font-medium text-muted-foreground">Heim</Label>
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      value={editMatchScores.home}
                      onChange={(e) =>
                        setEditMatchScores((prev) => ({
                          ...prev,
                          home: Number.parseInt(e.target.value) || 0,
                        }))
                      }
                      className="text-center text-2xl font-bold h-16 mt-2"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-muted-foreground">:</div>
                  </div>
                  <div className="text-center">
                    <Label className="text-sm font-medium text-muted-foreground">Auswärts</Label>
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      value={editMatchScores.away}
                      onChange={(e) =>
                        setEditMatchScores((prev) => ({
                          ...prev,
                          away: Number.parseInt(e.target.value) || 0,
                        }))
                      }
                      className="text-center text-2xl font-bold h-16 mt-2"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => {
                    setIsResultsDialogOpen(false)
                    setSelectedMatchForResults(null)
                  }}
                >
                  Abbrechen
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (selectedMatchForResults) {
                      updateMatchResult(selectedMatchForResults, editMatchScores.home, editMatchScores.away)
                    }
                  }}
                >
                  Speichern
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
