"use client"

import type React from "react"

import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Crown,
  ShieldCheck,
  Users,
  Calendar,
  Trophy,
  Target,
  Mail,
  MapPin,
  Hand,
  Settings,
  LogOut,
  Loader2,
  AlertCircle,
  BarChart3,
  Save,
  Edit,
  Trash2,
  Zap,
  FileText,
} from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

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

export default function MemberDashboard() {
  const { session, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statsPlayerId, setStatsPlayerId] = useState("")
  const [gameDate, setGameDate] = useState(new Date().toISOString().split("T")[0])
  const [throws180, setThrows180] = useState(0)
  const [throws171, setThrows171] = useState(0)
  const [throws154, setThrows154] = useState(0)
  const [throwsUnder26, setThrowsUnder26] = useState(0)
  const [semperitOuts, setSemperitOuts] = useState(0)
  const [throws15, setThrows15] = useState(0)
  const [throws16, setThrows16] = useState(0)
  const [throws17, setThrows17] = useState(0)
  const [throws18, setThrows18] = useState(0)
  const [throws19, setThrows19] = useState(0)
  const [throws20, setThrows20] = useState(0)
  const [throwsBull, setThrowsBull] = useState(0)
  const [statsNotes, setStatsNotes] = useState("")
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsMessage, setStatsMessage] = useState("")
  const [statsMessageType, setStatsMessageType] = useState<"success" | "error" | "info">("info")

  const [displayedStats, setDisplayedStats] = useState<LigaStatistic[]>([])
  const [statsDisplayLoading, setStatsDisplayLoading] = useState(false)

  const [leaderboardData, setLeaderboardData] = useState<any[]>([])

  const [editingStatId, setEditingStatId] = useState<string | null>(null)
  const [editingStatData, setEditingStatData] = useState<any>(null)

  const { toast } = useToast()

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

            {/* Teammitglieder */}
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

            {isLeadershipRole() && (
              <Card className="shadow-xl border-0 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <BarChart3 className="h-6 w-6 text-orange-600" />
                    Ligastatistiken
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 ml-2">
                      {teamMemberships.find((m) => m.role === "Captain") ? "Kapitän" : "Co-Kapitän"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="eingabe" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="eingabe" className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Eingabe
                      </TabsTrigger>
                      <TabsTrigger value="anzeige" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Anzeige
                      </TabsTrigger>
                      <TabsTrigger value="bestenliste" className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Bestenliste
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="eingabe" className="space-y-6">
                      <form onSubmit={handleSaveLigaStatistics} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="statsPlayer">Spieler auswählen</Label>
                            <Select value={statsPlayerId} onValueChange={setStatsPlayerId}>
                              <SelectTrigger
                                id="statsPlayer"
                                className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                              >
                                <SelectValue placeholder="Spieler aus deinen Teams auswählen" />
                              </SelectTrigger>
                              <SelectContent>
                                {getTeamPlayersForStats().map((member) => (
                                  <SelectItem key={member.id} value={member.player_id}>
                                    <div className="flex items-center space-x-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage
                                          src={
                                            member.club_players?.photo_url ||
                                            "/placeholder.svg?height=24&width=24&query=player-avatar" ||
                                            "/placeholder.svg" ||
                                            "/placeholder.svg" ||
                                            "/placeholder.svg"
                                          }
                                        />
                                        <AvatarFallback>{member.club_players?.name?.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <span>{member.club_players?.name}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {teamMemberships.find((tm) => tm.team_id === member.team_id)?.teams?.name}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="gameDate">Spieldatum</Label>
                            <Input
                              id="gameDate"
                              type="date"
                              value={gameDate}
                              onChange={(e) => setGameDate(e.target.value)}
                              className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                            />
                          </div>
                        </div>

                        {/* High Scores */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-800">High Scores</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="throws180">180er</Label>
                              <Input
                                id="throws180"
                                type="number"
                                min="0"
                                value={throws180}
                                onChange={(e) => setThrows180(Number.parseInt(e.target.value) || 0)}
                                className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="throws171">171er</Label>
                              <Input
                                id="throws171"
                                type="number"
                                min="0"
                                value={throws171}
                                onChange={(e) => setThrows171(Number.parseInt(e.target.value) || 0)}
                                className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="throws154">154er</Label>
                              <Input
                                id="throws154"
                                type="number"
                                min="0"
                                value={throws154}
                                onChange={(e) => setThrows154(Number.parseInt(e.target.value) || 0)}
                                className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="throwsUnder26">Unter 26</Label>
                              <Input
                                id="throwsUnder26"
                                type="number"
                                min="0"
                                value={throwsUnder26}
                                onChange={(e) => setThrowsUnder26(Number.parseInt(e.target.value) || 0)}
                                className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Finish Statistics */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-800">Finish-Statistiken</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="semperitOuts">Semperit Outs</Label>
                              <Input
                                id="semperitOuts"
                                type="number"
                                min="0"
                                value={semperitOuts}
                                onChange={(e) => setSemperitOuts(Number.parseInt(e.target.value) || 0)}
                                className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="throws15">15er</Label>
                              <Input
                                id="throws15"
                                type="number"
                                min="0"
                                value={throws15}
                                onChange={(e) => setThrows15(Number.parseInt(e.target.value) || 0)}
                                className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="throws16">16er</Label>
                              <Input
                                id="throws16"
                                type="number"
                                min="0"
                                value={throws16}
                                onChange={(e) => setThrows16(Number.parseInt(e.target.value) || 0)}
                                className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="throws17">17er</Label>
                              <Input
                                id="throws17"
                                type="number"
                                min="0"
                                value={throws17}
                                onChange={(e) => setThrows17(Number.parseInt(e.target.value) || 0)}
                                className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="throws18">18er</Label>
                              <Input
                                id="throws18"
                                type="number"
                                min="0"
                                value={throws18}
                                onChange={(e) => setThrows18(Number.parseInt(e.target.value) || 0)}
                                className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="throws19">19er</Label>
                              <Input
                                id="throws19"
                                type="number"
                                min="0"
                                value={throws19}
                                onChange={(e) => setThrows19(Number.parseInt(e.target.value) || 0)}
                                className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="throws20">20er</Label>
                              <Input
                                id="throws20"
                                type="number"
                                min="0"
                                value={throws20}
                                onChange={(e) => setThrows20(Number.parseInt(e.target.value) || 0)}
                                className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="throwsBull">Bull</Label>
                              <Input
                                id="throwsBull"
                                type="number"
                                min="0"
                                value={throwsBull}
                                onChange={(e) => setThrowsBull(Number.parseInt(e.target.value) || 0)}
                                className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                          <Label htmlFor="statsNotes">Notizen (optional)</Label>
                          <Textarea
                            id="statsNotes"
                            value={statsNotes}
                            onChange={(e) => setStatsNotes(e.target.value)}
                            placeholder="Zusätzliche Notizen zum Spiel..."
                            className="min-h-[80px] border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                          />
                        </div>

                        {/* Status Message */}
                        {statsMessage && (
                          <div
                            className={`p-3 rounded-md text-sm ${
                              statsMessageType === "success"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : statsMessageType === "error"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {statsMessage}
                          </div>
                        )}

                        {/* Submit Button */}
                        <Button
                          type="submit"
                          disabled={statsLoading || !statsPlayerId}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3"
                        >
                          {statsLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Speichere...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Statistiken speichern
                            </>
                          )}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="anzeige" className="space-y-6">
                      {statsDisplayLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                          <span className="ml-2">Lade Statistiken...</span>
                        </div>
                      ) : displayedStats.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>Noch keine Statistiken vorhanden.</p>
                          <p className="text-sm mt-2">Wechsle zum "Eingabe" Tab, um Statistiken hinzuzufügen.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-800">
                              Gespeicherte Statistiken ({displayedStats.length})
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={fetchLigaStatistics}
                              className="border-orange-300 text-orange-600 hover:bg-orange-50 bg-transparent"
                            >
                              Aktualisieren
                            </Button>
                          </div>

                          <div className="grid gap-6">
                            {displayedStats.map((stat) => (
                              <div
                                key={stat.id}
                                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200"
                              >
                                <div className="flex items-center justify-between mb-6">
                                  <div className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12 ring-2 ring-orange-100">
                                      <AvatarImage
                                        src={
                                          stat.club_players?.photo_url ||
                                          "/placeholder.svg?height=48&width=48&query=player-avatar" ||
                                          "/placeholder.svg"
                                        }
                                      />
                                      <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold">
                                        {stat.club_players?.name?.charAt(0) || "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <h5 className="font-bold text-gray-900 text-lg">
                                        {stat.club_players?.name || "Unbekannt"}
                                      </h5>
                                      <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Calendar className="h-4 w-4" />
                                        <span>{new Date(stat.game_date).toLocaleDateString("de-DE")}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditStat(stat)}
                                      className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      Bearbeiten
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteStat(stat.id)}
                                      className="border-red-300 text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Löschen
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Target className="h-5 w-5 text-green-600" />
                                      <h6 className="font-semibold text-green-800">High Scores</h6>
                                    </div>
                                    <div className="space-y-2">
                                      {stat.throws_180 > 0 && (
                                        <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                                          <span className="font-medium text-gray-700">180er</span>
                                          <span className="bg-green-600 text-white px-2 py-1 rounded-full text-sm font-bold">
                                            {stat.throws_180}
                                          </span>
                                        </div>
                                      )}
                                      {stat.throws_171 > 0 && (
                                        <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                                          <span className="font-medium text-gray-700">171er</span>
                                          <span className="bg-green-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                                            {stat.throws_171}
                                          </span>
                                        </div>
                                      )}
                                      {stat.throws_154 > 0 && (
                                        <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                                          <span className="font-medium text-gray-700">154er</span>
                                          <span className="bg-green-400 text-white px-2 py-1 rounded-full text-sm font-bold">
                                            {stat.throws_154}
                                          </span>
                                        </div>
                                      )}
                                      {stat.throws_under_26 > 0 && (
                                        <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                                          <span className="font-medium text-gray-700">Unter 26</span>
                                          <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                                            {stat.throws_under_26}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Zap className="h-5 w-5 text-blue-600" />
                                      <h6 className="font-semibold text-blue-800">Finish-Stats</h6>
                                    </div>
                                    <div className="space-y-2">
                                      {stat.semperit_outs > 0 && (
                                        <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                                          <span className="font-medium text-gray-700">Semperit</span>
                                          <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-sm font-bold">
                                            {stat.semperit_outs}
                                          </span>
                                        </div>
                                      )}
                                      {[15, 16, 17, 18, 19, 20].map(
                                        (num) =>
                                          stat[`throws_${num}`] > 0 && (
                                            <div
                                              key={num}
                                              className="flex justify-between items-center bg-white rounded-lg px-3 py-2"
                                            >
                                              <span className="font-medium text-gray-700">{num}er</span>
                                              <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                                                {stat[`throws_${num}`]}
                                              </span>
                                            </div>
                                          ),
                                      )}
                                      {stat.throws_bull > 0 && (
                                        <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                                          <span className="font-medium text-gray-700">Bull</span>
                                          <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                                            {stat.throws_bull}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {stat.notes && (
                                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                                      <div className="flex items-center gap-2 mb-3">
                                        <FileText className="h-5 w-5 text-gray-600" />
                                        <h6 className="font-semibold text-gray-800">Notizen</h6>
                                      </div>
                                      <div className="bg-white rounded-lg p-3">
                                        <p className="text-gray-700 text-sm leading-relaxed">{stat.notes}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}

                            {editingStatId && editingStatData && (
                              <Dialog open={!!editingStatId} onOpenChange={() => setEditingStatId(null)}>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Statistik bearbeiten</DialogTitle>
                                  </DialogHeader>

                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                      <Label htmlFor="edit-game-date">Spieldatum</Label>
                                      <Input
                                        id="edit-game-date"
                                        type="date"
                                        value={editingStatData.game_date}
                                        onChange={(e) =>
                                          setEditingStatData({ ...editingStatData, game_date: e.target.value })
                                        }
                                      />
                                    </div>

                                    <div>
                                      <Label htmlFor="edit-throws-180">180er Würfe</Label>
                                      <Input
                                        id="edit-throws-180"
                                        type="number"
                                        min="0"
                                        value={editingStatData.throws_180}
                                        onChange={(e) =>
                                          setEditingStatData({
                                            ...editingStatData,
                                            throws_180: Number.parseInt(e.target.value) || 0,
                                          })
                                        }
                                      />
                                    </div>

                                    <div>
                                      <Label htmlFor="edit-throws-171">171er Würfe</Label>
                                      <Input
                                        id="edit-throws-171"
                                        type="number"
                                        min="0"
                                        value={editingStatData.throws_171}
                                        onChange={(e) =>
                                          setEditingStatData({
                                            ...editingStatData,
                                            throws_171: Number.parseInt(e.target.value) || 0,
                                          })
                                        }
                                      />
                                    </div>

                                    <div>
                                      <Label htmlFor="edit-throws-154">154er Würfe</Label>
                                      <Input
                                        id="edit-throws-154"
                                        type="number"
                                        min="0"
                                        value={editingStatData.throws_154}
                                        onChange={(e) =>
                                          setEditingStatData({
                                            ...editingStatData,
                                            throws_154: Number.parseInt(e.target.value) || 0,
                                          })
                                        }
                                      />
                                    </div>

                                    <div>
                                      <Label htmlFor="edit-throws-under-26">Unter 26 Würfe</Label>
                                      <Input
                                        id="edit-throws-under-26"
                                        type="number"
                                        min="0"
                                        value={editingStatData.throws_under_26}
                                        onChange={(e) =>
                                          setEditingStatData({
                                            ...editingStatData,
                                            throws_under_26: Number.parseInt(e.target.value) || 0,
                                          })
                                        }
                                      />
                                    </div>

                                    <div>
                                      <Label htmlFor="edit-semperit-outs">Semperit Outs</Label>
                                      <Input
                                        id="edit-semperit-outs"
                                        type="number"
                                        min="0"
                                        value={editingStatData.semperit_outs}
                                        onChange={(e) =>
                                          setEditingStatData({
                                            ...editingStatData,
                                            semperit_outs: Number.parseInt(e.target.value) || 0,
                                          })
                                        }
                                      />
                                    </div>

                                    {[15, 16, 17, 18, 19, 20].map((num) => (
                                      <div key={num}>
                                        <Label htmlFor={`edit-throws-${num}`}>{num}er Würfe</Label>
                                        <Input
                                          id={`edit-throws-${num}`}
                                          type="number"
                                          min="0"
                                          value={editingStatData[`throws_${num}`]}
                                          onChange={(e) =>
                                            setEditingStatData({
                                              ...editingStatData,
                                              [`throws_${num}`]: Number.parseInt(e.target.value) || 0,
                                            })
                                          }
                                        />
                                      </div>
                                    ))}

                                    <div>
                                      <Label htmlFor="edit-throws-bull">Bull Würfe</Label>
                                      <Input
                                        id="edit-throws-bull"
                                        type="number"
                                        min="0"
                                        value={editingStatData.throws_bull}
                                        onChange={(e) =>
                                          setEditingStatData({
                                            ...editingStatData,
                                            throws_bull: Number.parseInt(e.target.value) || 0,
                                          })
                                        }
                                      />
                                    </div>

                                    <div className="md:col-span-2 lg:col-span-3">
                                      <Label htmlFor="edit-notes">Notizen</Label>
                                      <Textarea
                                        id="edit-notes"
                                        value={editingStatData.notes}
                                        onChange={(e) =>
                                          setEditingStatData({ ...editingStatData, notes: e.target.value })
                                        }
                                        placeholder="Zusätzliche Notizen..."
                                      />
                                    </div>
                                  </div>

                                  <div className="flex justify-end gap-2 mt-6">
                                    <Button variant="outline" onClick={() => setEditingStatId(null)}>
                                      Abbrechen
                                    </Button>
                                    <Button onClick={handleSaveEdit} className="bg-orange-600 hover:bg-orange-700">
                                      Speichern
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="bestenliste" className="space-y-6">
                      {statsDisplayLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                          <span className="ml-2">Lade Bestenliste...</span>
                        </div>
                      ) : leaderboardData.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>Noch keine Daten für die Bestenliste vorhanden.</p>
                          <p className="text-sm mt-2">Statistiken müssen erst eingegeben werden.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-800">
                              Team Bestenliste ({leaderboardData.length} Spieler)
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => calculateLeaderboard()}
                              className="border-orange-300 text-orange-600 hover:bg-orange-50 bg-transparent"
                            >
                              Aktualisieren
                            </Button>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="border-b-2 border-gray-200">
                                  <th className="text-left p-3 font-semibold text-gray-700">Rang</th>
                                  <th className="text-left p-3 font-semibold text-gray-700">Spieler</th>
                                  <th className="text-center p-3 font-semibold text-gray-700">Bester Score</th>
                                  <th className="text-center p-3 font-semibold text-gray-700">180er</th>
                                  <th className="text-center p-3 font-semibold text-gray-700">171er</th>
                                  <th className="text-center p-3 font-semibold text-gray-700">154er</th>
                                  <th className="text-center p-3 font-semibold text-gray-700">Bull</th>
                                  <th className="text-center p-3 font-semibold text-gray-700">Spiele</th>
                                </tr>
                              </thead>
                              <tbody>
                                {leaderboardData.map((player, index) => (
                                  <tr
                                    key={player.player_id}
                                    className={`border-b border-gray-100 hover:bg-orange-50 transition-colors ${
                                      index < 3 ? "bg-gradient-to-r from-orange-50 to-transparent" : ""
                                    }`}
                                  >
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                                        {index === 1 && <Trophy className="h-5 w-5 text-gray-400" />}
                                        {index === 2 && <Trophy className="h-5 w-5 text-orange-600" />}
                                        <span className="font-semibold text-gray-800">#{index + 1}</span>
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage
                                            src={
                                              player.photo_url ||
                                              "/placeholder.svg?height=32&width=32&query=player-avatar" ||
                                              "/placeholder.svg"
                                            }
                                          />
                                          <AvatarFallback className="bg-orange-100 text-orange-700 text-sm">
                                            {player.player_name?.charAt(0) || "?"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium text-gray-900">{player.player_name}</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span
                                        className={`font-bold px-2 py-1 rounded text-sm ${
                                          player.best_score === 180
                                            ? "bg-green-100 text-green-800"
                                            : player.best_score === 171
                                              ? "bg-blue-100 text-blue-800"
                                              : player.best_score === 154
                                                ? "bg-purple-100 text-purple-800"
                                                : "bg-gray-100 text-gray-800"
                                        }`}
                                      >
                                        {player.best_score || "-"}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center font-semibold text-green-700">
                                      {player.total_180 || "-"}
                                    </td>
                                    <td className="p-3 text-center font-semibold text-blue-700">
                                      {player.total_171 || "-"}
                                    </td>
                                    <td className="p-3 text-center font-semibold text-purple-700">
                                      {player.total_154 || "-"}
                                    </td>
                                    <td className="p-3 text-center font-semibold text-orange-700">
                                      {player.total_bull || "-"}
                                    </td>
                                    <td className="p-3 text-center text-gray-600">{player.games_played}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="shadow-xl border-0 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Trophy className="h-6 w-6 text-orange-600" />
                  Schnellzugriff
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-16 justify-start border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 bg-transparent"
                    disabled
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Turniere</div>
                        <div className="text-xs text-gray-500">Kommende Events</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Bald
                    </Badge>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-16 justify-start border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 bg-transparent"
                    disabled
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Trophy className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Statistiken</div>
                        <div className="text-xs text-gray-500">Meine Leistung</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Bald
                    </Badge>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
