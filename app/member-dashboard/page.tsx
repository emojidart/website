"use client"

import type React from "react"

import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  BarChart3,
  TrendingUp,
  Euro,
  Camera,
  XCircle,
  Upload,
  Trophy,
  Table,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

import { MatchStatistics } from "@/components/match-statistics"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Image from "next/image"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  throws_under_26: number
  throws_under_30: number
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

interface BonusConfig {
  under26: number
  under30: number
  semperit: number
}

export default function MemberDashboard() {
  const { session, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [bonusConfig, setBonusConfig] = useState<BonusConfig>({
    under26: 0.5,
    under30: 0.5,
    semperit: 0.5,
  })
  const [isBonusConfigOpen, setIsBonusConfigOpen] = useState(false)
  const [tempBonusConfig, setTempBonusConfig] = useState<BonusConfig>({
    under26: 0.5,
    under30: 0.5,
    semperit: 0.5,
  })

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

  const [throws180, setThrows180] = useState<number>(0)
  const [throws171, setThrows171] = useState<number>(0)
  const [throwsUnder26, setThrowsUnder26] = useState<number>(0)
  const [throwsUnder30, setThrowsUnder30] = useState<number>(0)
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

  const [legStatistics, setLegStatistics] = useState<any[]>([])
  const [legStatsLoading, setLegStatsLoading] = useState(false)
  const [activeMainTab, setActiveMainTab] = useState<"dashboard" | "statistics" | "penalties">("dashboard")

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoMessage, setPhotoMessage] = useState("")

  const [statsPlayerId, setStatsPlayerId] = useState<string>("")
  const [gameDate, setGameDate] = useState<string>(new Date().toISOString().split("T")[0])

  useEffect(() => {
    const savedConfig = localStorage.getItem("bonusConfig")
    if (savedConfig) {
      const config = JSON.parse(savedConfig)
      setBonusConfig(config)
      setTempBonusConfig(config)
    }
  }, [])

  const saveBonusConfig = () => {
    setBonusConfig(tempBonusConfig)
    localStorage.setItem("bonusConfig", JSON.stringify(tempBonusConfig))
    setIsBonusConfigOpen(false)
    toast({
      title: "Bonusgeld Konfiguration gespeichert",
      description: "Die neuen Bonusgeld-Beträge wurden erfolgreich gespeichert.",
    })
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    } else {
      setPhotoFile(null)
      setPhotoPreview(null)
    }
  }

  const fetchTeamMembers = async () => {
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

  const handlePhotoUpload = async () => {
    if (!photoFile || !profile?.club_players?.id) return

    setPhotoUploading(true)
    setPhotoMessage("")

    try {
      const fileExtension = photoFile.name.split(".").pop()
      const sanitizedPlayerName = profile.club_players.name.replace(/[^a-zA-Z0-9_.-]/g, "").replace(/\s/g, "_")
      const filePath = `player-avatars/${sanitizedPlayerName}-${Date.now()}.${fileExtension}`

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage.from("player-avatars").upload(filePath, photoFile, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage.from("player-avatars").getPublicUrl(filePath)

      // Update player record
      const { error: updateError } = await supabase
        .from("club_players")
        .update({ photo_url: publicUrlData.publicUrl })
        .eq("id", profile.club_players.id)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              club_players: prev.club_players
                ? {
                    ...prev.club_players,
                    photo_url: publicUrlData.publicUrl,
                  }
                : null,
            }
          : null,
      )

      await fetchTeamMembers()

      setPhotoMessage("Foto erfolgreich hochgeladen!")
      setIsPhotoDialogOpen(false)
      setPhotoFile(null)
      setPhotoPreview(null)
    } catch (error: any) {
      setPhotoMessage(`Fehler beim Hochladen: ${error.message}`)
    } finally {
      setPhotoUploading(false)
    }
  }

  const handlePhotoRemove = async () => {
    if (!profile?.club_players?.id || !profile?.club_players?.photo_url) return

    setPhotoUploading(true)
    setPhotoMessage("")

    try {
      // Remove from storage if it's a Supabase URL
      if (profile.club_players.photo_url.includes("player-avatars/")) {
        const filePath = profile.club_players.photo_url.split("player-avatars/")[1]
        if (filePath) {
          await supabase.storage.from("player-avatars").remove([filePath])
        }
      }

      // Update player record
      const { error: updateError } = await supabase
        .from("club_players")
        .update({ photo_url: null })
        .eq("id", profile.club_players.id)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              club_players: prev.club_players
                ? {
                    ...prev.club_players,
                    photo_url: null,
                  }
                : null,
            }
          : null,
      )

      await fetchTeamMembers()

      setPhotoMessage("Foto erfolgreich entfernt!")
      setIsPhotoDialogOpen(false)
    } catch (error: any) {
      setPhotoMessage(`Fehler beim Entfernen: ${error.message}`)
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleEditStat = (stat: any) => {
    setEditingStatId(stat.id)
    setEditingStatData({
      player_id: stat.player_id,
      game_date: stat.game_date,
      throws_180: stat.throws_180 || 0,
      throws_171: stat.throws_171 || 0,
      throws_under_26: stat.throws_under_26 || 0,
      throws_under_30: stat.throws_under_30 || 0,
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
          total_15: 0,
          total_16: 0,
          total_17: 0,
          total_18: 0,
          total_19: 0,
          total_20: 0,
          total_under_26: 0,
          total_semperit: 0,
          total_bull: 0,
          games_played: 0,
          best_score: 0,
        }
      }

      playerStats[playerId].total_180 += stat.throws_180
      playerStats[playerId].total_171 += stat.throws_171
      playerStats[playerId].total_15 += stat.throws_15
      playerStats[playerId].total_16 += stat.throws_16
      playerStats[playerId].total_17 += stat.throws_17
      playerStats[playerId].total_18 += stat.throws_18
      playerStats[playerId].total_19 += stat.throws_19
      playerStats[playerId].total_20 += stat.throws_20
      playerStats[playerId].total_under_26 += stat.throws_under_26
      playerStats[playerId].total_semperit += stat.semperit_outs
      playerStats[playerId].total_bull += stat.throws_bull
      playerStats[playerId].games_played += 1

      // Determine best score for this game
      let gameScore = 0
      if (stat.throws_180 > 0) gameScore = 180
      else if (stat.throws_171 > 0) gameScore = 171

      if (gameScore > playerStats[playerId].best_score) {
        playerStats[playerId].best_score = gameScore
      }
    })

    // Convert to array and sort by best scores first, then by total high scores
    const leaderboard = Object.values(playerStats).sort((a: any, b: any) => {
      if (b.best_score !== a.best_score) return b.best_score - a.best_score
      if (b.total_180 !== a.total_180) return b.total_180 - a.total_180
      if (b.total_171 !== a.total_171) return b.total_171 - a.total_171
      if (b.total_20 !== a.total_20) return b.total_20 - a.total_20
      if (b.total_19 !== a.total_19) return b.total_19 - a.total_19
      return b.total_18 - a.total_18
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
      fetchLegStatistics()
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
          throws_under_26: throwsUnder26,
          throws_under_30: throwsUnder30,
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
      setThrowsUnder26(0)
      setThrowsUnder30(0)
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

  const getTeamName = (match: any, isHome: boolean) => {
    if (isHome) {
      return match?.home_team_type === "own" ? match?.home_team?.name : match?.home_opponent_team?.name
    } else {
      return match?.away_team_type === "own" ? match?.away_team?.name : match?.away_opponent_team?.name
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

  const fetchLegStatistics = async () => {
    if (!isLeadershipRole()) return

    setLegStatsLoading(true)
    try {
      const leadershipTeams = teamMemberships.filter(
        (membership) => membership.role === "Captain" || membership.role === "Co-Captain",
      )
      const leadershipTeamIds = leadershipTeams.map((team) => team.team_id)
      const teamPlayerIds = teamMembers
        .filter((member) => leadershipTeamIds.includes(member.team_id))
        .map((member) => member.player_id)

      if (teamPlayerIds.length === 0) {
        setLegStatistics([])
        return
      }

      const { data, error } = await supabase
        .from("leg_statistics")
        .select(`
          *,
          player:club_players!leg_statistics_player_id_fkey(
            name,
            photo_url
          ),
          leg_winner:club_players!leg_statistics_leg_winner_id_fkey(
            name,
            photo_url
          ),
          matches (
            id,
            match_date,
            match_time,
            venue,
            home_team_id,
            away_team_id,
            home_team:teams!matches_home_team_id_fkey(id, name),
            away_team:teams!matches_away_team_id_fkey(id, name),
            home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
            away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name)
          )
        `)
        .in("player_id", teamPlayerIds)
        .order("matches(match_date)", { ascending: false })
        .order("leg_number", { ascending: false })

      if (error) {
        throw error
      }

      const legStats = data || []

      const processedStats = legStats.map((stat: any) => {
        // Use the already calculated leg_wins from the database instead of recalculating
        return {
          ...stat,
          leg_wins: stat.leg_wins || 0, // Use stored value or default to 0
        }
      })

      const aggregatedStats = processedStats.reduce((acc: any, stat: any) => {
        const playerId = stat.player_id
        if (!acc[playerId]) {
          acc[playerId] = {
            player_id: playerId,
            player_name: stat.player?.name || "Unbekannt",
            total_legs: 0,
            total_wins: 0,
            total_180s: 0,
            total_140s: 0,
            total_100s: 0,
            total_60s: 0,
            total_20s: 0,
            total_0s: 0,
            total_points: 0,
            average_score: 0,
          }
        }

        acc[playerId].total_legs += 1
        acc[playerId].total_wins += stat.leg_wins // This should now work correctly
        acc[playerId].total_180s += stat.throws_180 || 0
        acc[playerId].total_140s += stat.throws_140_179 || 0
        acc[playerId].total_100s += stat.throws_100_139 || 0
        acc[playerId].total_60s += stat.throws_60_99 || 0
        acc[playerId].total_20s += stat.throws_1_19 || 0
        acc[playerId].total_0s += stat.throws_0 || 0
        acc[playerId].total_points += stat.leg_points || 0

        return acc
      }, {})

      setLegStatistics(processedStats)
    } catch (err: any) {
      console.error("Error fetching leg statistics:", err)
    } finally {
      setLegStatsLoading(false)
    }
  }

  const getTeamDisplayName = (match: any, isHome: boolean) => {
    if (!match) return "Unbekannt"

    if (isHome) {
      if (match.home_team_type === "club_team" && match.home_team) {
        return match.home_team.name
      } else if (match.home_team_type === "opponent_team" && match.home_opponent_team) {
        return match.home_opponent_team.name
      }
    } else {
      if (match.away_team_type === "club_team" && match.away_team) {
        return match.away_team.name
      } else if (match.away_team_type === "opponent_team" && match.away_opponent_team) {
        return match.away_opponent_team.name
      }
    }

    return "Unbekannt"
  }

  const getPenaltyStatistics = () => {
    const penaltyStats: {
      [key: string]: { under26: number; under30: number; semperit: number; playerName: string; matchInfo: any }
    } = {}

    legStatistics.forEach((stat) => {
      const playerId = stat.player_id
      if (!penaltyStats[playerId]) {
        penaltyStats[playerId] = {
          under26: 0,
          under30: 0,
          semperit: 0,
          playerName: stat.player?.name || "Unbekannt",
          matchInfo: stat.matches,
        }
      }
      penaltyStats[playerId].under26 += stat.throws_under_26 || 0
      penaltyStats[playerId].under30 += stat.throws_under_30 || 0
      penaltyStats[playerId].semperit += stat.semperit_outs || 0
    })

    return Object.entries(penaltyStats).map(([playerId, stats]) => ({
      playerId,
      playerName: stats.playerName,
      under26: stats.under26,
      under30: stats.under30,
      semperit: stats.semperit,
      totalPenalties: stats.under26 + stats.under30 + stats.semperit,
      totalCost:
        stats.under26 * bonusConfig.under26 +
        stats.under30 * bonusConfig.under30 +
        stats.semperit * bonusConfig.semperit,
    }))
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

  const getStatisticsByMatch = () => {
    const groupedStatistics: { [matchId: string]: any } = {}

    legStatistics.forEach((stat) => {
      const matchId = stat.matches?.id || "unknown"
      if (!groupedStatistics[matchId]) {
        groupedStatistics[matchId] = {
          matchId: matchId,
          matchInfo: stat.matches,
          statistics: [],
        }
      }
      groupedStatistics[matchId].statistics.push(stat)
    })

    return Object.values(groupedStatistics)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">
        {/* Welcome Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2 uppercase tracking-wide">
            Willkommen zurück, {profile?.club_players?.name || "Spieler"}!
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Hier ist dein persönliches Dashboard bei Emoj!'s Dartverein
          </p>
        </div>

        <Tabs
          value={activeMainTab}
          onValueChange={(value) =>
            setActiveMainTab(value as "dashboard" | "statistics" | "penalties" | "ligatabellen")
          }
        >
          <TabsList className="grid w-full grid-cols-4 mb-4 sm:mb-6 lg:mb-8 h-auto gap-1 sm:gap-2">
            <TabsTrigger
              value="dashboard"
              className="flex flex-col items-center gap-1 py-2 sm:py-3 text-xs sm:text-sm px-1 sm:px-2"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger
              value="statistics"
              className="flex flex-col items-center gap-1 py-2 sm:py-3 text-xs sm:text-sm px-1 sm:px-2"
            >
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">Stats</span>
            </TabsTrigger>
            <TabsTrigger
              value="penalties"
              className="flex flex-col items-center gap-1 py-2 sm:py-3 text-xs sm:text-sm px-1 sm:px-2"
            >
              <Euro className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">Bonus</span>
            </TabsTrigger>
            <TabsTrigger
              value="ligatabellen"
              className="flex flex-col items-center gap-1 py-2 sm:py-3 text-xs sm:text-sm px-1 sm:px-2"
            >
              <Table className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">Liga</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Profile Card */}
              <div className="lg:col-span-1">
                <Card className="shadow-xl border-0 bg-white">
                  <CardHeader className="text-center pb-4">
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <Avatar className="h-16 w-16 sm:h-24 sm:w-24 mb-4 border-4 border-orange-500 shadow-lg">
                          <AvatarImage
                            src={
                              profile?.club_players?.photo_url ||
                              "/placeholder.svg?height=96&width=96&query=darts-player" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg"
                            }
                          />
                          <AvatarFallback className="text-2xl font-bold bg-orange-100 text-orange-700">
                            {profile?.club_players?.name?.charAt(0) || user?.email?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              size="icon"
                              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Profilbild ändern</DialogTitle>
                              <DialogDescription>
                                Lade ein neues Profilbild hoch oder entferne das aktuelle Bild.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="photo">Neues Foto auswählen</Label>
                                <Input
                                  id="photo"
                                  type="file"
                                  accept="image/*"
                                  onChange={handlePhotoChange}
                                  className="file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                                />
                              </div>
                              {photoPreview && (
                                <div className="flex items-center justify-center">
                                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-orange-200">
                                    <Image
                                      src={photoPreview || "/placeholder.svg"}
                                      alt="Vorschau"
                                      fill
                                      style={{ objectFit: "cover" }}
                                    />
                                  </div>
                                </div>
                              )}
                              {photoMessage && (
                                <Alert>
                                  <AlertDescription>{photoMessage}</AlertDescription>
                                </Alert>
                              )}
                            </div>
                            <DialogFooter className="flex-col sm:flex-row gap-2">
                              {profile?.club_players?.photo_url && (
                                <Button
                                  variant="destructive"
                                  onClick={handlePhotoRemove}
                                  disabled={photoUploading}
                                  className="w-full sm:w-auto"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Foto entfernen
                                </Button>
                              )}
                              <Button
                                onClick={handlePhotoUpload}
                                disabled={!photoFile || photoUploading}
                                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                {photoUploading ? "Wird hochgeladen..." : "Hochladen"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
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
              <div className="xl:col-span-2 space-y-6 sm:space-y-8">
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
                                <h3 className="font-bold text-gray-900">
                                  {membership.teams?.name || "Unbekanntes Team"}
                                </h3>
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
                                            "/placeholder.svg" ||
                                            "/placeholder.svg" ||
                                            "/placeholder.svg" ||
                                            "/placeholder.svg" ||
                                            "/placeholder.svg" ||
                                            "/placeholder.svg" ||
                                            "/placeholder.svg" ||
                                            "/placeholder.svg" ||
                                            "/placeholder.svg" ||
                                            "/placeholder.svg" ||
                                            "/placeholder.svg" ||
                                            "/placeholder.svg" ||
                                            "/placeholder.svg" ||
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
          </TabsContent>

          <TabsContent value="statistics">
            <div className="space-y-6 sm:space-y-8">
              <Tabs defaultValue="by-match" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
                  <TabsTrigger value="by-match" className="text-xs sm:text-sm">
                    Nach Spielen
                  </TabsTrigger>
                  <TabsTrigger value="overall" className="text-xs sm:text-sm">
                    Gesamtstatistik
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overall" className="space-y-4 sm:space-y-6">
                  <Card className="shadow-xl border-0 bg-white">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl font-bold">
                        <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                        Gesamtstatistik aller Legs
                      </CardTitle>
                      <p className="text-sm sm:text-base text-muted-foreground">
                        Alle Leg-Statistiken sortiert nach Wins, dann nach 180ern
                      </p>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      {legStatsLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
                          <p className="mt-2 text-muted-foreground">Lade Gesamtstatistiken...</p>
                        </div>
                      ) : legStatistics.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>Keine Gesamtstatistiken gefunden.</p>
                          <p className="text-sm mt-2">Bonusgelder werden nach dem ersten Spiel angezeigt.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(() => {
                            const playerOverallStats: { [key: string]: any } = {}

                            legStatistics.forEach((stat) => {
                              const playerId = stat.player_id
                              if (!playerOverallStats[playerId]) {
                                playerOverallStats[playerId] = {
                                  player_id: playerId,
                                  player_name: stat.player?.name || "Unbekannt",
                                  photo_url: stat.player?.photo_url,
                                  total_legs: 0,
                                  total_wins: 0,
                                  total_180: 0,
                                  total_171: 0,
                                  total_15: 0,
                                  total_16: 0,
                                  total_17: 0,
                                  total_18: 0,
                                  total_19: 0,
                                  total_20: 0,
                                  total_high_tonne: 0,
                                  total_tonne: 0,
                                  total_shanghai: 0,
                                  total_95_plus: 0,
                                  total_under_26: 0,
                                  total_under_30: 0,
                                  total_semperit: 0,
                                  total_bull: 0,
                                  win_percentage: 0,
                                }
                              }

                              playerOverallStats[playerId].total_legs += 1
                              playerOverallStats[playerId].total_wins += stat.leg_wins || 0
                              playerOverallStats[playerId].total_180 += stat.throws_180 || 0
                              playerOverallStats[playerId].total_171 += stat.throws_171 || 0
                              playerOverallStats[playerId].total_15 += stat.throws_15 || 0
                              playerOverallStats[playerId].total_16 += stat.throws_16 || 0
                              playerOverallStats[playerId].total_17 += stat.throws_17 || 0
                              playerOverallStats[playerId].total_18 += stat.throws_18 || 0
                              playerOverallStats[playerId].total_19 += stat.throws_19 || 0
                              playerOverallStats[playerId].total_20 += stat.throws_20 || 0
                              playerOverallStats[playerId].total_high_tonne += stat.throws_high_tonne || 0
                              playerOverallStats[playerId].total_tonne += stat.throws_tonne || 0
                              playerOverallStats[playerId].total_shanghai += stat.throws_shanghai || 0
                              playerOverallStats[playerId].total_95_plus += stat.throws_95_plus || 0
                              playerOverallStats[playerId].total_under_26 += stat.throws_under_26 || 0
                              playerOverallStats[playerId].total_under_30 += stat.throws_under_30 || 0
                              playerOverallStats[playerId].total_semperit += stat.semperit_outs || 0
                              playerOverallStats[playerId].total_bull += stat.throws_bull || 0
                            })

                            // Calculate win percentage and sort
                            const sortedStats = Object.values(playerOverallStats)
                              .map((stats: any) => ({
                                ...stats,
                                win_percentage: stats.total_legs > 0 ? (stats.total_wins / stats.total_legs) * 100 : 0,
                              }))
                              .sort((a: any, b: any) => {
                                // Sort by wins first, then by 180s, then by other high scores
                                if (b.total_wins !== a.total_wins) return b.total_wins - a.total_wins
                                if (b.total_180 !== a.total_180) return b.total_180 - a.total_180
                                if (b.total_171 !== a.total_171) return b.total_171 - a.total_171
                                if (b.total_20 !== a.total_20) return b.total_20 - a.total_20
                                if (b.total_19 !== a.total_19) return b.total_19 - a.total_19
                                return b.total_18 - a.total_18
                              })

                            return sortedStats.map((stats: any, index: number) => (
                              <Card
                                key={stats.player_id}
                                className={`${index < 3 ? "border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50" : ""}`}
                              >
                                <CardContent className="p-3 sm:p-4 lg:p-6">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                      {index < 3 && (
                                        <div className="flex items-center gap-1">
                                          <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
                                            #{index + 1}
                                          </Badge>
                                        </div>
                                      )}
                                      <h3 className="text-lg sm:text-xl font-bold truncate">{stats.player_name}</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-1 sm:gap-2">
                                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                        {stats.total_wins} Wins
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {stats.win_percentage.toFixed(1)}%
                                      </Badge>
                                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                        {stats.total_legs} Legs
                                      </Badge>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4">
                                    <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
                                      <div className="text-base sm:text-lg lg:text-2xl font-bold text-blue-600">
                                        {stats.total_legs}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Legs</div>
                                    </div>
                                    <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                                      <div className="text-base sm:text-lg lg:text-2xl font-bold text-green-600">
                                        {stats.total_wins}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Wins</div>
                                    </div>
                                    <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg">
                                      <div className="text-base sm:text-lg lg:text-2xl font-bold text-purple-600">
                                        {stats.total_180}
                                      </div>
                                      <div className="text-xs text-muted-foreground">180er</div>
                                    </div>
                                    <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg">
                                      <div className="text-base sm:text-lg lg:text-2xl font-bold text-orange-600">
                                        {stats.total_171}
                                      </div>
                                      <div className="text-xs text-muted-foreground">171er</div>
                                    </div>
                                    <div className="text-center p-2 sm:p-3 bg-yellow-50 rounded-lg">
                                      <div className="text-base sm:text-lg lg:text-2xl font-bold text-yellow-600">
                                        {stats.total_20}
                                      </div>
                                      <div className="text-xs text-muted-foreground">20er</div>
                                    </div>
                                    <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg">
                                      <div className="text-base sm:text-lg lg:text-2xl font-bold text-red-600">
                                        {stats.total_under_26 + stats.total_under_30 + stats.total_semperit}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Penalties</div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-1 sm:gap-2 text-xs">
                                    <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                                      <div className="font-semibold text-slate-700 text-xs sm:text-sm">
                                        {stats.total_19}
                                      </div>
                                      <div className="text-xs text-muted-foreground">19er</div>
                                    </div>
                                    <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                                      <div className="font-semibold text-slate-700 text-xs sm:text-sm">
                                        {stats.total_18}
                                      </div>
                                      <div className="text-xs text-muted-foreground">18er</div>
                                    </div>
                                    <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                                      <div className="font-semibold text-slate-700 text-xs sm:text-sm">
                                        {stats.total_17}
                                      </div>
                                      <div className="text-xs text-muted-foreground">17er</div>
                                    </div>
                                    <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                                      <div className="font-semibold text-slate-700 text-xs sm:text-sm">
                                        {stats.total_16}
                                      </div>
                                      <div className="text-xs text-muted-foreground">16er</div>
                                    </div>
                                    <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                                      <div className="font-semibold text-slate-700 text-xs sm:text-sm">
                                        {stats.total_15}
                                      </div>
                                      <div className="text-xs text-muted-foreground">15er</div>
                                    </div>
                                    <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                                      <div className="font-semibold text-slate-700 text-xs sm:text-sm">
                                        {stats.total_high_tonne}
                                      </div>
                                      <div className="text-xs text-muted-foreground">High Ton</div>
                                    </div>
                                    <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                                      <div className="font-semibold text-slate-700 text-xs sm:text-sm">
                                        {stats.total_tonne}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Ton</div>
                                    </div>
                                    <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                                      <div className="font-semibold text-slate-700 text-xs sm:text-sm">
                                        {stats.total_shanghai}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Shanghai</div>
                                    </div>
                                    <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                                      <div className="font-semibold text-slate-700 text-xs sm:text-sm">
                                        {stats.total_95_plus}
                                      </div>
                                      <div className="text-xs text-muted-foreground">95+</div>
                                    </div>
                                    <div className="text-center p-1 sm:p-2 bg-slate-50 rounded">
                                      <div className="font-semibold text-slate-700 text-xs sm:text-sm">
                                        {stats.total_bull}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Bull</div>
                                    </div>
                                    <div className="text-center p-1 sm:p-2 bg-red-50 rounded">
                                      <div className="font-semibold text-red-600 text-xs sm:text-sm">
                                        {stats.total_under_26}
                                      </div>
                                      <div className="text-xs text-muted-foreground">U26</div>
                                    </div>
                                    <div className="text-center p-1 sm:p-2 bg-red-50 rounded">
                                      <div className="font-semibold text-red-600 text-xs sm:text-sm">
                                        {stats.total_under_30}
                                      </div>
                                      <div className="text-xs text-muted-foreground">U30</div>
                                    </div>
                                    <div className="text-center p-1 sm:p-2 bg-red-50 rounded">
                                      <div className="font-semibold text-red-600 text-xs sm:text-sm">
                                        {stats.total_semperit}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Semp</div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="by-match">
                  <Card className="shadow-xl border-0 bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                        <TrendingUp className="h-6 w-6 text-orange-600" />
                        Spielerstatistiken nach Spiel
                      </CardTitle>
                      <p className="text-muted-foreground">Detaillierte Leg-Statistiken sortiert nach Spielen</p>
                    </CardHeader>
                    <CardContent>
                      {legStatsLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                          <p className="mt-2 text-muted-foreground">Lade Spielstatistiken...</p>
                        </div>
                      ) : legStatistics.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">Keine Leg-Statistiken verfügbar</p>
                          <p className="text-sm">Füge Leg-Statistiken hinzu, um sie hier zu sehen.</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {(() => {
                            // Group leg statistics by match
                            const statsByMatch = legStatistics.reduce(
                              (acc, stat) => {
                                const matchKey = stat.match_id || "Unbekanntes Spiel"
                                if (!acc[matchKey]) {
                                  acc[matchKey] = []
                                }
                                acc[matchKey].push(stat)
                                return acc
                              },
                              {} as Record<string, typeof legStatistics>,
                            )

                            // Get match details for each match
                            const matchDetails = matches.reduce(
                              (acc, match) => {
                                acc[match.id] = match
                                return acc
                              },
                              {} as Record<string, (typeof matches)[0]>,
                            )

                            return Object.entries(statsByMatch)
                              .sort(([a], [b]) => {
                                // Sort by match date if available
                                const matchA = matchDetails[a]
                                const matchB = matchDetails[b]
                                if (matchA?.match_date && matchB?.match_date) {
                                  return new Date(matchB.match_date).getTime() - new Date(matchA.match_date).getTime()
                                }
                                return b.localeCompare(a)
                              })
                              .map(([matchId, stats]) => {
                                const match = matchDetails[matchId]
                                const matchTitle = match
                                  ? `${getTeamDisplayName(match, true)} vs ${getTeamDisplayName(match, false)}`
                                  : `Spiel ${matchId}`
                                const matchDate = match?.match_date
                                  ? new Date(match.match_date).toLocaleDateString("de-DE")
                                  : ""

                                // Group stats by player for this match
                                const playerStats = stats.reduce(
                                  (acc, stat) => {
                                    const playerId = stat.player_id
                                    const playerName = stat.player?.name || "Unbekannter Spieler"

                                    if (!acc[playerId]) {
                                      acc[playerId] = {
                                        name: playerName,
                                        legs: [],
                                        totalLegs: 0,
                                        wins: 0,
                                        total180s: 0,
                                        total171s: 0,
                                        total15s: 0,
                                        total16s: 0,
                                        total17s: 0,
                                        total18s: 0,
                                        total19s: 0,
                                        total20s: 0,
                                        totalHighTonne: 0,
                                        totalTonne: 0,
                                        totalShanghai: 0,
                                        total95Plus: 0,
                                        totalUnder26: 0,
                                        totalUnder30: 0,
                                        totalSemperit: 0,
                                        totalBull: 0,
                                      }
                                    }

                                    acc[playerId].legs.push(stat)
                                    acc[playerId].totalLegs++

                                    acc[playerId].wins += stat.leg_wins || 0

                                    acc[playerId].total180s += stat.throws_180 || 0
                                    acc[playerId].total171s += stat.throws_171 || 0
                                    acc[playerId].total15s += stat.throws_15 || 0
                                    acc[playerId].total16s += stat.throws_16 || 0
                                    acc[playerId].total17s += stat.throws_17 || 0
                                    acc[playerId].total18s += stat.throws_18 || 0
                                    acc[playerId].total19s += stat.throws_19 || 0
                                    acc[playerId].total20s += stat.throws_20 || 0
                                    acc[playerId].totalHighTonne += stat.throws_high_tonne || 0
                                    acc[playerId].totalTonne += stat.throws_tonne || 0
                                    acc[playerId].totalShanghai += stat.throws_shanghai || 0
                                    acc[playerId].total95Plus += stat.throws_95_plus || 0
                                    acc[playerId].totalUnder26 += stat.throws_under_26 || 0
                                    acc[playerId].totalUnder30 += stat.throws_under_30 || 0
                                    acc[playerId].totalSemperit += stat.semperit_outs || 0
                                    acc[playerId].totalBull += stat.throws_bull || 0

                                    return acc
                                  },
                                  {} as Record<string, any>,
                                )

                                return (
                                  <Card key={matchId} className="border border-gray-200">
                                    <CardHeader className="pb-3 p-3 sm:p-4 lg:p-6">
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                                          {matchTitle}
                                        </CardTitle>
                                        {matchDate && (
                                          <Badge variant="outline" className="text-xs w-fit">
                                            {matchDate}
                                          </Badge>
                                        )}
                                      </div>
                                    </CardHeader>
                                    <CardContent className="p-3 sm:p-4 lg:p-6">
                                      <div className="space-y-3 sm:space-y-4">
                                        {Object.values(playerStats)
                                          .sort((a: any, b: any) => b.wins - a.wins || b.total180s - a.total180s)
                                          .map((player: any, index) => (
                                            <Card
                                              key={`${matchId}-${player.name}`}
                                              className={`${
                                                index < 3 && player.wins > 0
                                                  ? "border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50"
                                                  : ""
                                              }`}
                                            >
                                              <CardContent className="p-3 sm:p-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2 sm:gap-0">
                                                  <div className="flex items-center gap-2">
                                                    {index < 3 && player.wins > 0 && (
                                                      <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                                                    )}
                                                    <h4 className="font-semibold text-base sm:text-lg truncate">
                                                      {player.name}
                                                    </h4>
                                                  </div>
                                                  <div className="flex items-center gap-1 sm:gap-2">
                                                    <Badge
                                                      variant={player.wins > 0 ? "default" : "secondary"}
                                                      className={`text-xs ${
                                                        player.wins > 0
                                                          ? "bg-green-600 text-white"
                                                          : "bg-gray-200 text-gray-600"
                                                      }`}
                                                    >
                                                      {player.wins} Wins
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs">
                                                      {player.totalLegs} Legs
                                                    </Badge>
                                                  </div>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">180er:</span>
                                                    <span className="font-medium">{player.total180s}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">171er:</span>
                                                    <span className="font-medium">{player.total171s}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">20er:</span>
                                                    <span className="font-medium">{player.total20s}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">19er:</span>
                                                    <span className="font-medium">{player.total19s}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">18er:</span>
                                                    <span className="font-medium">{player.total18s}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">17er:</span>
                                                    <span className="font-medium">{player.total17s}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">16er:</span>
                                                    <span className="font-medium">{player.total16s}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">15er:</span>
                                                    <span className="font-medium">{player.total15s}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">High Tonne:</span>
                                                    <span className="font-medium">{player.totalHighTonne}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Tonne:</span>
                                                    <span className="font-medium">{player.totalTonne}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Shanghai:</span>
                                                    <span className="font-medium">{player.totalShanghai}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">95+:</span>
                                                    <span className="font-medium">{player.total95Plus}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Bull:</span>
                                                    <span className="font-medium">{player.totalBull}</span>
                                                  </div>
                                                </div>

                                                {(player.totalUnder26 > 0 ||
                                                  player.totalUnder30 > 0 ||
                                                  player.totalSemperit > 0) && (
                                                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                                                    <div className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                                                      ⚠️ Check Bilanz
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                                      {player.totalUnder26 > 0 && (
                                                        <div className="flex justify-between text-red-600">
                                                          <span>Unter 26:</span>
                                                          <span className="font-medium">{player.totalUnder26}</span>
                                                        </div>
                                                      )}
                                                      {player.totalUnder30 > 0 && (
                                                        <div className="flex justify-between text-red-600">
                                                          <span>Unter 30:</span>
                                                          <span className="font-medium">{player.totalUnder30}</span>
                                                        </div>
                                                      )}
                                                      {player.totalSemperit > 0 && (
                                                        <div className="flex justify-between text-red-600">
                                                          <span>Semperit:</span>
                                                          <span className="font-medium">{player.totalSemperit}</span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}

                                                <div className="mt-3 pt-3 border-t border-gray-200">
                                                  <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground">Gewinnquote:</span>
                                                    <span className="font-medium">
                                                      {player.totalLegs > 0
                                                        ? `${((player.wins / player.totalLegs) * 100).toFixed(1)}%`
                                                        : "0%"}
                                                    </span>
                                                  </div>
                                                </div>
                                              </CardContent>
                                            </Card>
                                          ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )
                              })
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="penalties">
            <div className="space-y-6 sm:space-y-8">
              <Card className="shadow-xl border-0 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
                    <Euro className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                    Bonusgeld Übersicht
                    <Button variant="outline" size="sm" onClick={() => setIsBonusConfigOpen(true)} className="ml-auto">
                      <Settings className="h-4 w-4 mr-2" />
                      Konfiguration
                    </Button>
                  </CardTitle>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Bonusgeld für Würfe unter 26 ({bonusConfig.under26.toFixed(2)}€), unter 30 (
                    {bonusConfig.under30.toFixed(2)}€) und Semperit ({bonusConfig.semperit.toFixed(2)}€)
                  </p>
                </CardHeader>
                <CardContent>
                  {legStatsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Lade Bonusgeld...</p>
                    </div>
                  ) : legStatistics.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Euro className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Keine Bonusgeld gefunden.</p>
                      <p className="text-sm mt-2">Bonusgelder werden nach dem ersten Spiel angezeigt.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="overflow-x-auto">
                        <UITable className="min-w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-bold w-[100px] sm:w-auto">Spieler</TableHead>
                              <TableHead className="font-bold text-center text-red-600 w-[60px] sm:w-[80px]">
                                <span className="hidden sm:inline">Unter 26</span>
                                <span className="sm:hidden">U26</span>
                              </TableHead>
                              <TableHead className="font-bold text-center text-red-600 w-[60px] sm:w-[80px]">
                                <span className="hidden sm:inline">Unter 30</span>
                                <span className="sm:hidden">U30</span>
                              </TableHead>
                              <TableHead className="font-bold text-center text-red-600 w-[60px] sm:w-[80px]">
                                <span className="hidden sm:inline">Semperit</span>
                                <span className="sm:hidden">Semp</span>
                              </TableHead>
                              <TableHead className="font-bold text-center w-[70px] sm:w-[100px]">
                                <span className="hidden sm:inline">Gesamt</span>
                                <span className="sm:hidden">Total</span>
                              </TableHead>
                              <TableHead className="font-bold text-center w-[70px] sm:w-[80px]">
                                <span className="hidden sm:inline">Kosten (€)</span>
                                <span className="sm:hidden">€</span>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getPenaltyStatistics()
                              .sort((a, b) => b.totalCost - a.totalCost)
                              .map((penalty) => (
                                <TableRow key={penalty.playerId} className="hover:bg-muted/50">
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                                        <AvatarImage src="/darts-player.png" />
                                        <AvatarFallback className="text-xs bg-red-100 text-red-700">
                                          {penalty.playerName.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs sm:text-base truncate max-w-[80px] sm:max-w-none">
                                        {penalty.playerName}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {penalty.under26 > 0 ? (
                                      <Badge variant="destructive" className="text-xs">
                                        {penalty.under26}
                                      </Badge>
                                    ) : (
                                      <span className="text-green-600 font-medium text-sm">0</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {penalty.under30 > 0 ? (
                                      <Badge variant="destructive" className="text-xs">
                                        {penalty.under30}
                                      </Badge>
                                    ) : (
                                      <span className="text-green-600 font-medium text-sm">0</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {penalty.semperit > 0 ? (
                                      <Badge variant="destructive" className="text-xs">
                                        {penalty.semperit}
                                      </Badge>
                                    ) : (
                                      <span className="text-green-600 font-medium text-sm">0</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline" className="font-bold text-xs">
                                      {penalty.totalPenalties}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className="font-bold text-red-600 text-sm">
                                      {penalty.totalCost.toFixed(2)}€
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </UITable>
                      </div>

                      {/* Summary Card */}
                      <Card className="bg-red-50 border-red-200">
                        <CardContent className="pt-4 sm:pt-6">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                            <div className="flex items-center gap-2">
                              <Euro className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                              <span className="font-bold text-base sm:text-lg">Gesamte Bonusgelder:</span>
                            </div>
                            <span className="text-xl sm:text-2xl font-bold text-red-600">
                              {getPenaltyStatistics()
                                .reduce((total, penalty) => total + penalty.totalCost, 0)
                                .toFixed(2)}
                              €
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Gesamt Unter 26:</span>{" "}
                              {getPenaltyStatistics().reduce((total, penalty) => total + penalty.under26, 0)}
                            </div>
                            <div>
                              <span className="font-medium">Gesamt Unter 30:</span>{" "}
                              {getPenaltyStatistics().reduce((total, penalty) => total + penalty.under30, 0)}
                            </div>
                            <div>
                              <span className="font-medium">Gesamt Semperit:</span>{" "}
                              {getPenaltyStatistics().reduce((total, penalty) => total + penalty.semperit, 0)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ligatabellen">
            <div className="space-y-6 sm:space-y-8">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-orange-200 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Trophy className="h-8 w-8 text-orange-600" />
                      <Badge variant="secondary">Aktiv</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">Herbstsaison 2025</div>
                    <p className="text-sm text-gray-600">Aktuelle Saison</p>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Users className="h-8 w-8 text-orange-600" />
                      <Badge variant="secondary">Live</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">18+ Divisionen</div>
                    <p className="text-sm text-gray-600">Salzburg, Pongau, Lungau</p>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Calendar className="h-8 w-8 text-orange-600" />
                      <Badge variant="secondary">Neu</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">Steeldart</div>
                    <p className="text-sm text-gray-600">5 neue Divisionen</p>
                  </CardContent>
                </Card>
              </div>

              {/* Liga Tabellen Iframe */}
              <Card className="border-orange-200 shadow-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Table className="h-6 w-6 text-orange-600" />
                        Liga Tabellen
                      </CardTitle>
                      <CardDescription className="text-gray-600 mt-2">
                        Aktuelle Tabellen und Spielerstatistiken der Sportdarts Liga Austria
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.reload()}
                        className="border-orange-200 hover:bg-orange-50 bg-transparent"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Aktualisieren
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="border-orange-200 hover:bg-orange-50 bg-transparent"
                      >
                        <a
                          href="https://www.sportdartsliga.at/ligasystem/division-tables"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Vollbild
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative">
                    <iframe
                      src="https://www.sportdartsliga.at/ligasystem/division-tables"
                      className="w-full h-[800px] border-0 rounded-b-lg"
                      title="Sportdarts Liga Tabellen"
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Info Section */}
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-orange-100 rounded-lg p-2 mt-1">
                      <ExternalLink className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">Über die Liga Tabellen</h3>
                      <p className="text-gray-700 text-sm leading-relaxed mb-3">
                        Diese Seite zeigt die aktuellen Tabellen der Sportdarts Liga Austria direkt von der offiziellen
                        Website. Hier findest du alle Divisionen von Salzburg, Pongau und Lungau sowie die neuen
                        Steeldart-Ligen.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-orange-700 border-orange-300">
                          Live-Daten
                        </Badge>
                        <Badge variant="outline" className="text-orange-700 border-orange-300">
                          Alle Divisionen
                        </Badge>
                        <Badge variant="outline" className="text-orange-700 border-orange-300">
                          Spielerstatistiken
                        </Badge>
                        <Badge variant="outline" className="text-orange-700 border-orange-300">
                          PDF Export
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={isBonusConfigOpen} onOpenChange={setIsBonusConfigOpen}>
          <DialogContent className="w-[95vw] max-w-sm sm:max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                Bonusgeld Konfiguration
              </DialogTitle>
              <DialogDescription className="text-sm">
                Passen Sie die Bonusgeld-Beträge für Ihren Verein an.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="under26">Bonusgeld für Würfe unter 26 (€)</Label>
                <Input
                  id="under26"
                  type="number"
                  step="0.01"
                  min="0"
                  value={tempBonusConfig.under26}
                  onChange={(e) =>
                    setTempBonusConfig((prev) => ({
                      ...prev,
                      under26: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="under30">Bonusgeld für Würfe unter 30 (€)</Label>
                <Input
                  id="under30"
                  type="number"
                  step="0.01"
                  min="0"
                  value={tempBonusConfig.under30}
                  onChange={(e) =>
                    setTempBonusConfig((prev) => ({
                      ...prev,
                      under30: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="semperit">Bonusgeld für Semperit (€)</Label>
                <Input
                  id="semperit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={tempBonusConfig.semperit}
                  onChange={(e) =>
                    setTempBonusConfig((prev) => ({
                      ...prev,
                      semperit: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBonusConfigOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={saveBonusConfig}>Speichern</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {selectedMatchForStats && (
          <MatchStatistics
            match={selectedMatchForStats}
            myTeamId={(() => {
              const userTeamIds = teamMemberships.map((tm) => tm.team_id)
              const isUserTeamHome = userTeamIds.includes(selectedMatchForStats.home_team_id)
              const isUserTeamAway = userTeamIds.includes(selectedMatchForStats.away_team_id)

              if (isUserTeamHome) return selectedMatchForStats.home_team_id
              if (isUserTeamAway) return selectedMatchForStats.away_team_id
              return userTeamIds[0] || selectedMatchForStats.home_team_id // fallback
            })()}
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
          <DialogContent className="w-[95vw] max-w-sm sm:max-w-md mx-auto">
            <DialogHeader className="text-center pb-3 sm:pb-4">
              <DialogTitle className="text-base sm:text-lg lg:text-xl font-semibold">
                Spielergebnis eintragen
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
                <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
                  <div className="text-center">
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Heim</Label>
                    <div className="flex flex-col items-center gap-1 sm:gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 sm:h-8 sm:w-8 p-0 bg-transparent text-xs sm:text-sm"
                        onClick={() =>
                          setEditMatchScores((prev) => ({
                            ...prev,
                            home: Math.min(99, prev.home + 1),
                          }))
                        }
                      >
                        +
                      </Button>
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
                        className="text-center text-lg sm:text-2xl font-bold h-10 sm:h-16 w-full"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 sm:h-8 sm:w-8 p-0 bg-transparent text-xs sm:text-sm"
                        onClick={() =>
                          setEditMatchScores((prev) => ({
                            ...prev,
                            home: Math.max(0, prev.home - 1),
                          }))
                        }
                      >
                        -
                      </Button>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-4xl font-bold text-muted-foreground mt-6 sm:mt-8">:</div>
                  </div>
                  <div className="text-center">
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Auswärts</Label>
                    <div className="flex flex-col items-center gap-1 sm:gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 sm:h-8 sm:w-8 p-0 bg-transparent text-xs sm:text-sm"
                        onClick={() =>
                          setEditMatchScores((prev) => ({
                            ...prev,
                            away: Math.min(99, prev.away + 1),
                          }))
                        }
                      >
                        +
                      </Button>
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
                        className="text-center text-lg sm:text-2xl font-bold h-10 sm:h-16 w-full"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 sm:h-8 sm:w-8 p-0 bg-transparent text-xs sm:text-sm"
                        onClick={() =>
                          setEditMatchScores((prev) => ({
                            ...prev,
                            away: Math.max(0, prev.away - 1),
                          }))
                        }
                      >
                        -
                      </Button>
                    </div>
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
