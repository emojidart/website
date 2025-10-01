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
  MapPin,
  Hand,
  Loader2,
  AlertCircle,
  Edit,
  Camera,
  XCircle,
  Upload,
  Eye,
  ArrowRight,
  ImageIcon,
  CalendarX,
  AlertTriangle,
  Check,
  Info,
  X,
  RotateCcw,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { DashboardTutorial } from "@/components/dashboard-tutorial"
// import { ChatLayout } from "@/components/chat/chat-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  created_at: string
  club_players: {
    name: string
    photo_url: string | null
  }
}

interface Match {
  id: string
  home_team_id: string
  away_team_id: string
  home_team_type: "own" | "opponent" | "club_team" // Added club_team
  away_team_type: "own" | "opponent" | "club_team" // Added club_team
  home_opponent_team_id: string | null
  away_opponent_team_id: string | null
  match_date: string
  match_time: string | null // Changed to string | null for consistency
  venue: string
  week_number: number
  home_score: number | null
  away_score: number | null
  status: string
  season_id: string
  dart_type: string
  match_format: string | null
  team_photo_url: string | null
  original_date: string | null
  postponement_reason: string | null
  home_team?: { id: string; name: string }
  away_team?: { id: string; name: string }
  home_opponent_team?: OpponentTeam | null
  away_opponent_team?: OpponentTeam | null
  season?: { id: string; name: string; type: string }
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

export default function DashboardPage() {
  const { session, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // const [bonusConfig, setBonusConfig] = useState<BonusConfig>({
  //   under26: 0.5,
  //   under30: 0.5,
  //   semperit: 0.5,
  // })
  // const [isBonusConfigOpen, setIsBonusConfigOpen] = useState(false)
  // const [tempBonusConfig, setTempBonusConfig] = useState<BonusConfig>({
  //   under26: 0.5,
  //   under30: 0.5,
  //   semperit: 0.5,
  // })

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

  const [teamPhotoFile, setTeamPhotoFile] = useState<File | null>(null)
  const [teamPhotoPreview, setTeamPhotoPreview] = useState<string | null>(null)
  const [isTeamPhotoDialogOpen, setIsTeamPhotoDialogOpen] = useState(false)
  const [teamPhotoUploading, setTeamPhotoUploading] = useState(false)
  const [teamPhotoMessage, setTeamPhotoMessage] = useState("")
  const [selectedMatchForTeamPhoto, setSelectedMatchForTeamPhoto] = useState<string | null>(null)

  const [statsPlayerId, setStatsPlayerId] = useState<string>("")

  const [gameDate, setGameDate] = useState<string>(new Date().toISOString().split("T")[0])

  const [showSettings, setShowSettings] = useState(false)

  const [activeMatchTab, setActiveMatchTab] = useState<"upcoming" | "completed" | "postponed">("upcoming")

  const [isPostponeDialogOpen, setIsPostponeDialogOpen] = useState(false)
  const [selectedMatchForPostpone, setSelectedMatchForPostpone] = useState<string | null>(null)
  const [postponeData, setPostponeData] = useState({
    newDate: "",
    newTime: "",
    reason: "",
  })

  const undoPostponement = async (matchId: string) => {
    try {
      const match = matches.find((m) => m.id === matchId)
      if (!match || !match.original_date) return

      const { error } = await supabase
        .from("matches")
        .update({
          status: "scheduled",
          match_date: match.original_date, // Restore original date
          original_date: null,
          postponement_reason: null,
        })
        .eq("id", matchId)

      if (!error) {
        toast({
          title: "Verschiebung rückgängig gemacht",
          description: "Das Spiel wurde auf das ursprüngliche Datum zurückgesetzt.",
        })
        fetchMatches()
      } else {
        throw error
      }
    } catch (error) {
      console.error("Error undoing postponement:", error)
      toast({
        title: "Fehler",
        description: "Die Verschiebung konnte nicht rückgängig gemacht werden.",
        variant: "destructive",
      })
    }
  }

  // useEffect(() => {
  //   const savedConfig = localStorage.getItem("bonusConfig")
  //   if (savedConfig) {
  //     const config = JSON.parse(savedConfig)
  //     setBonusConfig(config)
  //     setTempBonusConfig(config)
  //   }
  // }, [])

  // const saveBonusConfig = () => {
  //   setBonusConfig(tempBonusConfig)
  //   localStorage.setItem("bonusConfig", JSON.stringify(tempBonusConfig))
  //   setIsBonusConfigOpen(false)
  //   toast({
  //     title: "Bonusgeld Konfiguration gespeichert",
  //     description: "Die neuen Bonusgeld-Beträge wurden erfolgreich gespeichert.",
  //   })
  // }

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

  const handleCameraPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    } else {
      setPhotoFile(null)
      setPhotoPreview(null)
    }
  }

  const handleGalleryPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    } else {
      setPhotoFile(null)
      setPhotoPreview(null)
    }
  }

  const handleTeamCameraPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setTeamPhotoFile(file)
      setTeamPhotoPreview(URL.createObjectURL(file))
    } else {
      setTeamPhotoFile(null)
      setTeamPhotoPreview(null)
    }
  }

  const handleTeamGalleryPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setTeamPhotoFile(file)
      setTeamPhotoPreview(URL.createObjectURL(file))
    } else {
      setTeamPhotoFile(null)
      setTeamPhotoPreview(null)
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
      const { error } = await supabase.from("leg_statistics").update(editingStatData).eq("id", editingStatId)

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
      const { error } = await supabase.from("leg_statistics").delete().eq("id", statId)

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

  const hasLeadershipInTeam = (teamId: string) => {
    return teamMemberships.some(
      (membership) =>
        membership.team_id === teamId && (membership.role === "Captain" || membership.role === "Co-Captain"),
    )
  }

  const getLeadershipTeams = () => {
    return teamMemberships.filter((membership) => membership.role === "Captain" || membership.role === "Co-Captain")
  }

  const getUserRole = (): "player" | "captain" | "co-captain" => {
    const captainMembership = teamMemberships.find((membership) => membership.role === "Captain")
    const coCaptainMembership = teamMemberships.find((membership) => membership.role === "Co-Captain")

    if (captainMembership) return "captain"
    if (coCaptainMembership) return "co-captain"
    return "player"
  }

  const getTeamPlayersForStats = () => {
    const leadershipTeams = getLeadershipTeams()
    const leadershipTeamIds = leadershipTeams.map((team) => team.team_id)

    return teamMembers.filter((member) => leadershipTeamIds.includes(member.team_id) && member.club_players)
  }

  const fetchLigaStatistics = async () => {
    if (!isLeadershipRole()) return

    setStatsDisplayLoading(true)
    try {
      const leadershipTeams = getLeadershipTeams()
      const leadershipTeamIds = leadershipTeams.map((team) => team.team_id)
      const teamPlayerIds = teamMembers
        .filter((member) => leadershipTeamIds.includes(member.team_id))
        .map((member) => member.player_id)

      if (teamPlayerIds.length === 0) {
        setDisplayedStats([])
        return
      }

      const { data, error } = await supabase
        .from("leg_statistics")
        .select(`
          *,
          club_players!leg_statistics_player_id_fkey (
            name,
            photo_url
          )
        `)
        .in("player_id", teamPlayerIds)
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
      const { error } = await supabase.from("leg_statistics").insert([
        {
          player_id: statsPlayerId,
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

  const getTeamDisplayName = (match: any, isHome: boolean) => {
    if (!match) return "Unbekannt"

    if (isHome) {
      if (match.home_team_type === "own" && match.home_team) {
        return match.home_team.name
      } else if (match.home_team_type === "opponent" && match.home_opponent_team) {
        return match.home_opponent_team.name
      }
    } else {
      if (match.away_team_type === "own" && match.away_team) {
        return match.away_team.name
      } else if (match.away_team_type === "opponent" && match.away_opponent_team) {
        return match.away_opponent_team.name
      }
    }

    return "Unbekannt"
  }

  const updateMatchScore = async (matchId: string, homeScore: number, awayScore: number) => {
    if (!isLeadershipRole()) return

    const match = matches.find((m) => m.id === matchId)
    if (!match) return

    const hasHomeTeamLeadership = hasLeadershipInTeam(match.home_team_id)
    const hasAwayTeamLeadership = hasLeadershipInTeam(match.away_team_id)

    if (!hasHomeTeamLeadership && !hasAwayTeamLeadership) {
      console.log("[v0] User doesn't have leadership role in either team for this match")
      return
    }

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
        fetchLigaStatistics()
      }
    } catch (error) {
      console.error("Error updating match score:", error)
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

  const handleTeamPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setTeamPhotoFile(file)
      setTeamPhotoPreview(URL.createObjectURL(file))
    } else {
      setTeamPhotoFile(null)
      setTeamPhotoPreview(null)
    }
  }

  const handleTeamPhotoUpload = async () => {
    if (!teamPhotoFile || !selectedMatchForTeamPhoto) return

    setTeamPhotoUploading(true)
    setTeamPhotoMessage("")

    try {
      const fileExtension = teamPhotoFile.name.split(".").pop()
      const filePath = `team-photos/match-${selectedMatchForTeamPhoto}-${Date.now()}.${fileExtension}`

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage.from("team-photos").upload(filePath, teamPhotoFile, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage.from("team-photos").getPublicUrl(filePath)

      // Update match record
      const { error: updateError } = await supabase
        .from("matches")
        .update({ team_photo_url: publicUrlData.publicUrl })
        .eq("id", selectedMatchForTeamPhoto)

      if (updateError) {
        throw updateError
      }

      // Refresh matches data
      await fetchTeamMembers()

      setTeamPhotoMessage("Teamfoto erfolgreich hochgeladen!")
      setIsTeamPhotoDialogOpen(false)
      setTeamPhotoFile(null)
      setTeamPhotoPreview(null)
      setSelectedMatchForTeamPhoto(null)
    } catch (error: any) {
      setTeamPhotoMessage(`Fehler beim Hochladen: ${error.message}`)
    } finally {
      setTeamPhotoUploading(false)
    }
  }

  const handleTeamPhotoRemove = async () => {
    if (!selectedMatchForTeamPhoto) return

    setTeamPhotoUploading(true)
    setTeamPhotoMessage("")

    try {
      // Update match record to remove photo URL
      const { error: updateError } = await supabase
        .from("matches")
        .update({ team_photo_url: null })
        .eq("id", selectedMatchForTeamPhoto)

      if (updateError) {
        throw updateError
      }

      // Refresh matches data
      await fetchTeamMembers()

      setTeamPhotoMessage("Teamfoto erfolgreich entfernt!")
      setIsTeamPhotoDialogOpen(false)
      setSelectedMatchForTeamPhoto(null)
    } catch (error: any) {
      setTeamPhotoMessage(`Fehler beim Entfernen: ${error.message}`)
    } finally {
      setTeamPhotoUploading(false)
    }
  }

  const fetchLegStatistics = async () => {
    if (!isLeadershipRole()) return

    setLegStatsLoading(true)
    try {
      const leadershipTeams = getLeadershipTeams()
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

        const actualLegsPlayed = (stat.player_legs_won || 0) + (stat.opponent_legs_won || 0)
        const legsToAdd = actualLegsPlayed > 0 ? actualLegsPlayed : 1 // fallback to 1 for team matches

        acc[playerId].total_legs += legsToAdd
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

  // Helper function to get team display name, avoiding redeclaration
  const getTeamDisplayNameHelper = (match: any, isHome: boolean) => {
    if (!match) return "Unbekannt"

    if (isHome) {
      if (match.home_team_type === "own" && match.home_team) {
        return match.home_team.name
      } else if (match.home_team_type === "opponent" && match.home_opponent_team) {
        return match.home_opponent_team.name
      }
    } else {
      if (match.away_team_type === "own" && match.away_team) {
        return match.away_team.name
      } else if (match.away_team_type === "opponent" && match.away_opponent_team) {
        return match.away_opponent_team.name
      }
    }

    return "Unbekannt"
  }

  // Helper function to get team name, resolving undeclared variable issue
  const getTeamName = (match: any, isHome: boolean): string => {
    if (!match) return "Unbekannt"
    if (isHome) {
      if (match.home_team_type === "own" && match.home_team) {
        return match.home_team.name
      } else if (match.home_team_type === "opponent" && match.home_opponent_team) {
        return match.home_opponent_team.name
      }
    } else {
      if (match.away_team_type === "own" && match.away_team) {
        return match.away_team.name
      } else if (match.away_team_type === "opponent" && match.away_opponent_team) {
        return match.away_opponent_team.name
      }
    }
    return "Unbekannt"
  }

  // Helper functions to filter matches by status
  const getUpcomingMatches = () => {
    return matches.filter((match) => match.status !== "completed" && match.status !== "postponed")
  }

  const getPostponedMatches = () => {
    return matches.filter((match) => match.status === "postponed")
  }

  const getCompletedMatches = () => {
    return matches.filter((match) => match.status === "completed")
  }

  // const getPenaltyStatistics = () => {
  //   const penaltyStats: {
  //     [key: string]: { under26: number; under30: number; semperit: number; playerName: string; matchInfo: any }
  //   } = {}
  //
  //   legStatistics.forEach((stat) => {
  //     const playerId = stat.player_id
  //     if (!penaltyStats[playerId]) {
  //       penaltyStats[playerId] = {
  //         under26: 0,
  //         under30: 0,
  //         semperit: 0,
  //         playerName: stat.player?.name || "Unbekannt",
  //         matchInfo: stat.matches,
  //       }
  //     }
  //     penaltyStats[playerId].under26 += stat.throws_under_26 || 0
  //     penaltyStats[playerId].under30 += stat.throws_under_30 || 0
  //     penaltyStats[playerId].semperit += stat.semperit_outs || 0
  //   }
  //
  //   return Object.entries(penaltyStats).map(([playerId, stats]) => ({
  //     playerId,
  //     playerName: stats.playerName,
  //     under26: stats.under26,
  //     under30: stats.under30,
  //     semperit: stats.semperit,
  //     totalPenalties: stats.under26 + stats.under30 + stats.semperit,
  //     totalCost:
  //       stats.under26 * bonusConfig.under26 +
  //       stats.under30 * bonusConfig.under30 +
  //       stats.semperit * bonusConfig.semperit,
  //   }))
  // }

  const postponeMatch = async (matchId: string, newDate: string, newTime: string, reason: string) => {
    try {
      const { error } = await supabase
        .from("matches")
        .update({
          status: "postponed",
          original_date: matches.find((m) => m.id === matchId)?.match_date, // Store original date
          match_date: newDate,
          match_time: newTime,
          postponement_reason: reason,
        })
        .eq("id", matchId)

      if (!error) {
        toast({
          title: "Spiel verschoben",
          description: "Das Spiel wurde erfolgreich verschoben.",
        })
        fetchMatches()
        setIsPostponeDialogOpen(false)
        setSelectedMatchForPostpone(null)
        setPostponeData({ newDate: "", newTime: "", reason: "" })
      } else {
        throw error
      }
    } catch (error) {
      console.error("Error postponing match:", error)
      toast({
        title: "Fehler",
        description: "Fehler beim Verschieben des Spiels.",
        variant: "destructive",
      })
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

  const formatMatchDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  }

  const formatMatchTime = (timeString: string | null) => {
    if (!timeString) return ""
    // Remove seconds from time string (HH:mm:ss -> HH:mm)
    const timeParts = timeString.split(":")
    const timeWithoutSeconds = `${timeParts[0]}:${timeParts[1]}`
    return ` um ${timeWithoutSeconds} Uhr`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl">
        {/* Changed DashboardTutorial prop name */}
        <DashboardTutorial role={getUserRole()} />

        {getPostponedMatches().length > 0 && (
          <Card className="mb-6 sm:mb-8 border-0 shadow-xl bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-l-orange-500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl shadow-lg">
                    <CalendarX className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
                <div className="flex-grow w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">Verschobene Spiele</h3>
                    </div>
                    <Badge className="bg-orange-500 text-white w-fit">{getPostponedMatches().length}</Badge>
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                    {getPostponedMatches().length === 1
                      ? "Ein Spiel wurde"
                      : `${getPostponedMatches().length} Spiele wurden`}{" "}
                    verschoben. Bitte beachte die neuen Termine.
                  </p>
                  <div className="space-y-2 mb-3 sm:mb-4">
                    {getPostponedMatches()
                      .slice(0, 3)
                      .map((match) => (
                        <div key={match.id} className="bg-white/70 rounded-lg p-3 border border-orange-200">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <Users className="h-4 w-4 text-orange-600 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm">
                                {getTeamDisplayNameHelper(match, true)} vs {getTeamDisplayNameHelper(match, false)}
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm">
                              <div className="flex items-center gap-1 text-red-600">
                                <X className="h-3 w-3" />
                                <span className="line-through">
                                  {match.original_date ? formatMatchDate(match.original_date) : "Ursprüngliches Datum"}
                                </span>
                              </div>
                              <ArrowRight className="h-3 w-3 text-gray-400 hidden sm:block" />
                              <div className="flex items-center gap-1 text-green-600 font-medium">
                                <Check className="h-3 w-3" />
                                <span>
                                  {formatMatchDate(match.match_date)}
                                  {formatMatchTime(match.match_time)}
                                </span>
                              </div>
                            </div>
                            {match.postponement_reason && (
                              <div className="flex items-start gap-1 text-xs text-gray-600 bg-gray-50 rounded p-2">
                                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span className="italic">{match.postponement_reason}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    {getPostponedMatches().length > 3 && (
                      <div className="text-xs sm:text-sm text-gray-600 text-center py-2">
                        ... und {getPostponedMatches().length - 3} weitere
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => setActiveMatchTab("postponed")}
                    className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-lg text-sm sm:text-base"
                  >
                    <CalendarX className="h-4 w-4 mr-2" />
                    Alle verschobenen Spiele anzeigen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-4 sm:mb-6 lg:mb-8">
          {/* Teams Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8 lg:mb-12">
            <div className="xl:col-span-1"></div>

            {/* Main Content */}
            <div className="xl:col-span-2 space-y-6 sm:space-8">
              {/* Team Memberships */}
              <Card className="shadow-xl border-0 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl lg:text-2xl font-bold">
                    <Users className="h-6 w-6 lg:h-7 lg:w-7 text-orange-600" />
                    Meine Teams
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {teamMemberships.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 lg:h-16 lg:w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-base lg:text-lg">Du bist noch keinem Team zugeordnet.</p>
                      <p className="text-sm lg:text-base mt-2">Wende dich an deinen Kapitän oder Co-Kapitän.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4 lg:gap-6">
                      {teamMemberships.map((membership) => (
                        <div
                          key={membership.id}
                          className="border-2 border-gray-200 rounded-xl p-4 lg:p-6 hover:border-orange-300 transition-colors"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {membership.teams?.logo_url ? (
                              <Avatar className="h-12 w-12 lg:h-16 lg:w-16">
                                <AvatarImage src={membership.teams.logo_url || "/placeholder.svg"} />
                                <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-lg lg:text-xl">
                                  {membership.teams.name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="h-12 w-12 lg:h-16 lg:w-16 bg-orange-100 rounded-full flex items-center justify-center">
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

              {/* Spielplan Section with Tabs */}
              <Card className="shadow-xl border-0 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <Calendar className="h-6 w-6 text-orange-600" />
                    Spielplan meiner Teams
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={activeMatchTab}
                    onValueChange={(value) => setActiveMatchTab(value as "upcoming" | "completed" | "postponed")}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="upcoming" className="text-sm">
                        Kommende Spiele ({getUpcomingMatches().length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="postponed"
                        className={`text-sm ${getPostponedMatches().length > 0 ? "animate-pulse-red" : ""}`}
                      >
                        Verschoben ({getPostponedMatches().length})
                      </TabsTrigger>
                      <TabsTrigger value="completed" className="text-sm">
                        Abgeschlossene Spiele ({getCompletedMatches().length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upcoming">
                      {getUpcomingMatches().length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>Keine kommenden Spiele gefunden.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {getUpcomingMatches().map((match) => (
                            <div key={match.id} className={`border rounded-lg p-4 ${getMatchBackgroundColor(match)}`}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className="font-mono">
                                    Woche {match.week_number}
                                  </Badge>
                                  {match.match_format && (
                                    <Badge variant="secondary" className="text-xs">
                                      {match.match_format === "team"
                                        ? "Team (2er)"
                                        : match.match_format === "best_of_three"
                                          ? "1v1 (BoF3)"
                                          : match.match_format === "individual"
                                            ? "1v1"
                                            : "Standard"}
                                    </Badge>
                                  )}
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 flex-shrink-0" />
                                      <span>
                                        {formatMatchDate(match.match_date)}
                                        {formatMatchTime(match.match_time)}
                                      </span>
                                      <Badge variant="outline" className="text-xs ml-2">
                                        {match.dart_type === "edart" ? "E-Dart" : "Steeldart"}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <MapPin className="h-4 w-4 flex-shrink-0" />
                                      <span className="truncate font-medium text-xs sm:text-sm">{match.venue}</span>
                                    </div>
                                  </div>
                                </div>
                                <Badge
                                  variant={match.status === "completed" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {match.status === "completed"
                                    ? "Beendet"
                                    : match.status === "postponed"
                                      ? "Verschoben"
                                      : "Anstehend"}
                                </Badge>
                              </div>

                              {match.status === "postponed" && match.original_date && (
                                <Alert className="mb-3 bg-orange-50 border-orange-200">
                                  <AlertCircle className="h-4 w-4 text-orange-600" />
                                  <AlertDescription className="text-sm text-orange-800">
                                    <strong>Verschoben:</strong> Ursprünglich am {formatMatchDate(match.original_date)}
                                    {match.postponement_reason && (
                                      <span className="block mt-1">Grund: {match.postponement_reason}</span>
                                    )}
                                  </AlertDescription>
                                </Alert>
                              )}

                              <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-6">
                                    <div className="text-center">
                                      <div className="font-semibold text-lg mb-1">
                                        {getTeamDisplayNameHelper(match, true)}
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

                                  <div className="text-right"></div>
                                </div>

                                {(hasLeadershipInTeam(match.home_team_id) ||
                                  hasLeadershipInTeam(match.away_team_id)) && (
                                  <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const userTeamIds = teamMemberships.map((tm) => tm.team_id)
                                        const isUserTeamHome = userTeamIds.includes(match.home_team_id)
                                        const isUserTeamAway = userTeamIds.includes(match.away_team_id)
                                        const myTeamId = isUserTeamHome
                                          ? match.home_team_id
                                          : isUserTeamAway
                                            ? match.away_team_id
                                            : null

                                        if (myTeamId) {
                                          router.push(`/statistics/${match.id}?teamId=${myTeamId}`)
                                        }
                                      }}
                                      className="bg-green-600 hover:bg-green-700 text-white border-green-600 w-full h-8"
                                    >
                                      <Target className="h-3 w-3 mr-1 flex-shrink-0" />
                                      <span className="text-xs">Statistiken</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700 w-full h-8"
                                      onClick={() => {
                                        setSelectedMatchForResults(match.id)
                                        setIsResultsDialogOpen(true)
                                        setEditMatchScores({
                                          home: match.home_score || 0,
                                          away: match.away_score || 0,
                                        })
                                      }}
                                    >
                                      <Edit className="h-3 w-3 mr-1 flex-shrink-0" />
                                      <span className="text-xs">
                                        {match.status === "completed" ? "Bearbeiten" : "Ergebnis"}
                                      </span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={`w-full h-8 flex items-center justify-center ${
                                        match.team_photo_url
                                          ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                                          : "bg-green-600 hover:bg-green-700 text-white border-green-600"
                                      }`}
                                      onClick={() => {
                                        setSelectedMatchForTeamPhoto(match.id)
                                        setIsTeamPhotoDialogOpen(true)
                                        setTeamPhotoFile(null)
                                        setTeamPhotoPreview(null)
                                        setTeamPhotoMessage("")
                                      }}
                                    >
                                      <Camera className="h-3 w-3 mr-1 flex-shrink-0" />
                                      <span className="text-xs">
                                        {match.team_photo_url ? "Teamfoto" : "Foto Upload"}
                                      </span>
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600 w-full h-8"
                                      onClick={() => {
                                        setSelectedMatchForPostpone(match.id)
                                        setPostponeData({
                                          newDate: match.match_date,
                                          newTime: match.match_time,
                                          reason: "",
                                        })
                                        setIsPostponeDialogOpen(true)
                                      }}
                                    >
                                      <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                                      <span className="text-xs">Verschieben</span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="postponed">
                      {getPostponedMatches().length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>Keine verschobenen Spiele gefunden.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {getPostponedMatches().map((match) => (
                            <div key={match.id} className="border rounded-lg p-4 bg-orange-50 border-orange-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className="font-mono">
                                    Woche {match.week_number}
                                  </Badge>
                                  {match.match_format && (
                                    <Badge variant="secondary" className="text-xs">
                                      {match.match_format === "team"
                                        ? "Team (2er)"
                                        : match.match_format === "best_of_three"
                                          ? "1v1 (BoF3)"
                                          : match.match_format === "individual"
                                            ? "1v1"
                                            : "Standard"}
                                    </Badge>
                                  )}
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 flex-shrink-0" />
                                      <span>
                                        {formatMatchDate(match.match_date)}
                                        {formatMatchTime(match.match_time)}
                                      </span>
                                      <Badge variant="outline" className="text-xs ml-2">
                                        {match.dart_type === "edart" ? "E-Dart" : "Steeldart"}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <MapPin className="h-4 w-4 flex-shrink-0" />
                                      <span className="truncate font-medium text-xs sm:text-sm">{match.venue}</span>
                                    </div>
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-orange-100 text-orange-800 border-orange-300"
                                >
                                  Verschoben
                                </Badge>
                              </div>

                              {match.original_date && (
                                <Alert className="mb-3 bg-orange-100 border-orange-300">
                                  <AlertCircle className="h-4 w-4 text-orange-600" />
                                  <AlertDescription className="text-sm text-orange-900">
                                    <strong>Ursprünglich:</strong> {formatMatchDate(match.original_date)}
                                    {match.postponement_reason && (
                                      <span className="block mt-1">
                                        <strong>Grund:</strong> {match.postponement_reason}
                                      </span>
                                    )}
                                  </AlertDescription>
                                </Alert>
                              )}

                              <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-6">
                                    <div className="text-center">
                                      <div className="font-semibold text-lg mb-1">
                                        {getTeamDisplayNameHelper(match, true)}
                                      </div>
                                      <div className="text-3xl font-bold text-blue-600">{match.home_score ?? "-"}</div>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-400">vs</div>
                                    <div className="text-center">
                                      <div className="font-semibold text-lg mb-1">{getTeamName(match, false)}</div>
                                      <div className="text-3xl font-bold text-red-600">{match.away_score ?? "-"}</div>
                                    </div>
                                  </div>
                                </div>

                                {hasLeadershipInTeam(match.home_team_id) || hasLeadershipInTeam(match.away_team_id) ? (
                                  <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const userTeamIds = teamMemberships.map((tm) => tm.team_id)
                                        const isUserTeamHome = userTeamIds.includes(match.home_team_id)
                                        const isUserTeamAway = userTeamIds.includes(match.away_team_id)
                                        const myTeamId = isUserTeamHome
                                          ? match.home_team_id
                                          : isUserTeamAway
                                            ? match.away_team_id
                                            : null

                                        if (myTeamId) {
                                          router.push(`/statistics/${match.id}?teamId=${myTeamId}`)
                                        }
                                      }}
                                      className="bg-green-600 hover:bg-green-700 text-white border-green-600 w-full h-8"
                                    >
                                      <Target className="h-3 w-3 mr-1 flex-shrink-0" />
                                      <span className="text-xs">Statistiken</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700 w-full h-8"
                                      onClick={() => {
                                        setSelectedMatchForResults(match.id)
                                        setIsResultsDialogOpen(true)
                                        setEditMatchScores({
                                          home: match.home_score || 0,
                                          away: match.away_score || 0,
                                        })
                                      }}
                                    >
                                      <Edit className="h-3 w-3 mr-1 flex-shrink-0" />
                                      <span className="text-xs">
                                        {match.status === "completed" ? "Bearbeiten" : "Ergebnis"}
                                      </span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={`w-full h-8 flex items-center justify-center ${
                                        match.team_photo_url
                                          ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                                          : "bg-green-600 hover:bg-green-700 text-white border-green-600"
                                      }`}
                                      onClick={() => {
                                        setSelectedMatchForTeamPhoto(match.id)
                                        setIsTeamPhotoDialogOpen(true)
                                        setTeamPhotoFile(null)
                                        setTeamPhotoPreview(null)
                                        setTeamPhotoMessage("")
                                      }}
                                    >
                                      <Camera className="h-3 w-3 mr-1 flex-shrink-0" />
                                      <span className="text-xs">
                                        {match.team_photo_url ? "Teamfoto" : "Foto Upload"}
                                      </span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600 w-full h-8"
                                      onClick={() => {
                                        setSelectedMatchForPostpone(match.id)
                                        setPostponeData({
                                          newDate: match.match_date,
                                          newTime: match.match_time,
                                          reason: match.postponement_reason || "",
                                        })
                                        setIsPostponeDialogOpen(true)
                                      }}
                                    >
                                      <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                                      <span className="text-xs">Neu planen</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="bg-red-600 hover:bg-red-700 text-white border-red-600 w-full h-8"
                                      onClick={() => undoPostponement(match.id)}
                                    >
                                      <RotateCcw className="h-3 w-3 mr-1 flex-shrink-0" />
                                      <span className="text-xs">Rückgängig machen</span>
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="completed">
                      {getCompletedMatches().length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>Keine abgeschlossenen Spiele gefunden.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {getCompletedMatches().map((match) => (
                            <div key={match.id} className={`border rounded-lg p-4 ${getMatchBackgroundColor(match)}`}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className="font-mono">
                                    Woche {match.week_number}
                                  </Badge>
                                  {match.match_format && (
                                    <Badge variant="secondary" className="text-xs">
                                      {match.match_format === "team"
                                        ? "Team (2er)"
                                        : match.match_format === "best_of_three"
                                          ? "1v1 (BoF3)"
                                          : match.match_format === "individual"
                                            ? "1v1"
                                            : "Standard"}
                                    </Badge>
                                  )}
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 flex-shrink-0" />
                                      <span>
                                        {formatMatchDate(match.match_date)}
                                        {formatMatchTime(match.match_time)}
                                      </span>
                                      <Badge variant="outline" className="text-xs ml-2">
                                        {match.dart_type === "edart" ? "E-Dart" : "Steeldart"}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <MapPin className="h-4 w-4 flex-shrink-0" />
                                      <span className="truncate font-medium text-xs sm:text-sm">{match.venue}</span>
                                    </div>
                                  </div>
                                </div>
                                <Badge
                                  variant={match.status === "completed" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {match.status === "completed" ? "Beendet" : "Anstehend"}
                                </Badge>
                              </div>

                              <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-6">
                                    <div className="text-center">
                                      <div className="font-semibold text-lg mb-1">
                                        {getTeamDisplayNameHelper(match, true)}
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

                                  <div className="text-right"></div>
                                </div>

                                {(hasLeadershipInTeam(match.home_team_id) ||
                                  hasLeadershipInTeam(match.away_team_id)) && (
                                  <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const userTeamIds = teamMemberships.map((tm) => tm.team_id)
                                        const isUserTeamHome = userTeamIds.includes(match.home_team_id)
                                        const isUserTeamAway = userTeamIds.includes(match.away_team_id)
                                        const myTeamId = isUserTeamHome
                                          ? match.home_team_id
                                          : isUserTeamAway
                                            ? match.away_team_id
                                            : null

                                        if (myTeamId) {
                                          router.push(`/statistics/${match.id}?teamId=${myTeamId}`)
                                        }
                                      }}
                                      className="bg-green-600 hover:bg-green-700 text-white border-green-600 w-full h-8"
                                    >
                                      <Target className="h-3 w-3 mr-1 flex-shrink-0" />
                                      <span className="text-xs">Statistiken</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700 w-full h-8"
                                      onClick={() => {
                                        setSelectedMatchForResults(match.id)
                                        setIsResultsDialogOpen(true)
                                        setEditMatchScores({
                                          home: match.home_score || 0,
                                          away: match.away_score || 0,
                                        })
                                      }}
                                    >
                                      <Edit className="h-3 w-3 mr-1 flex-shrink-0" />
                                      <span className="text-xs">
                                        {match.status === "completed" ? "Bearbeiten" : "Ergebnis"}
                                      </span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={`w-full h-8 flex items-center justify-center ${
                                        match.team_photo_url
                                          ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                                          : "bg-green-600 hover:bg-green-700 text-white border-green-600"
                                      }`}
                                      onClick={() => {
                                        setSelectedMatchForTeamPhoto(match.id)
                                        setIsTeamPhotoDialogOpen(true)
                                        setTeamPhotoFile(null)
                                        setTeamPhotoPreview(null)
                                        setTeamPhotoMessage("")
                                      }}
                                    >
                                      <Camera className="h-3 w-3 mr-1 flex-shrink-0" />
                                      <span className="text-xs">
                                        {match.team_photo_url ? "Teamfoto" : "Foto Upload"}
                                      </span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Statistics Section - REMOVED: Now handled by separate page */}
        {/* {selectedMatchForStats && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
            <div className="w-full h-full max-w-[95vw] max-h-[90vh] sm:max-w-3xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl sm:h-auto overflow-hidden bg-white rounded-lg">
              <MatchStatistics
                match={selectedMatchForStats}
                myTeamId={(() => {
                  const userTeamIds = teamMemberships.map((tm) => tm.team_id)
                  const isUserTeamHome = userTeamIds.includes(selectedMatchForStats.home_team_id)
                  const isUserTeamAway = userTeamIds.includes(selectedMatchForStats.away_team_id)
                  return isUserTeamHome
                    ? selectedMatchForStats.home_team_id
                    : isUserTeamAway
                      ? selectedMatchForStats.away_team_id
                      : null
                })()}
                onClose={() => {
                  setSelectedMatchForStats(null)
                  setIsStatsDialogOpen(false)
                }}
                onStatsUpdate={fetchMatches}
              />
            </div>
          </div>
        )} */}
      </main>

      <Dialog
        open={isResultsDialogOpen && selectedMatchForResults !== null}
        onOpenChange={(open) => {
          setIsResultsDialogOpen(open)
          if (!open) setSelectedMatchForResults(null)
        }}
      >
        <DialogContent className="w-[95vw] max-w-sm mx-auto">
          <DialogHeader className="text-center pb-2 sm:pb-3">
            <DialogTitle className="text-sm sm:text-base font-semibold">Spielergebnis eintragen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-muted/30 rounded-lg p-2 sm:p-3">
              <div className="grid grid-cols-3 gap-1 sm:gap-2 items-center">
                <div className="text-center">
                  <Label className="text-xs font-medium text-muted-foreground">Heim</Label>
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0 bg-transparent text-xs"
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
                      className="text-center text-sm sm:text-lg font-bold h-8 sm:h-12 w-full"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0 bg-transparent text-xs"
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
                  <div className="text-lg sm:text-2xl font-bold text-muted-foreground mt-4 sm:mt-6">:</div>
                </div>
                <div className="text-center">
                  <Label className="text-xs font-medium text-muted-foreground">Auswärts</Label>
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0 bg-transparent text-xs"
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
                      className="text-center text-sm sm:text-lg font-bold h-8 sm:h-12 w-full"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0 bg-transparent text-xs"
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 bg-transparent text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => {
                  setIsResultsDialogOpen(false)
                  setSelectedMatchForResults(null)
                }}
              >
                Abbrechen
              </Button>
              <Button
                className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => {
                  if (selectedMatchForResults) {
                    updateMatchScore(selectedMatchForResults, editMatchScores.home, editMatchScores.away)
                  }
                }}
              >
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isTeamPhotoDialogOpen && selectedMatchForTeamPhoto !== null}
        onOpenChange={(open) => {
          setIsTeamPhotoDialogOpen(open)
          if (!open) {
            setSelectedMatchForTeamPhoto(null)
            setTeamPhotoFile(null)
            setTeamPhotoPreview(null)
            setTeamPhotoMessage("")
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-center pb-2 sm:pb-3">
            <DialogTitle className="text-sm sm:text-base font-semibold">Teamfoto hochladen</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Lade ein Teamfoto für dieses Spiel hoch oder entferne das aktuelle Foto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const currentMatch = matches.find((m) => m.id === selectedMatchForTeamPhoto)
              const hasExistingPhoto = currentMatch?.team_photo_url

              return (
                <>
                  {hasExistingPhoto && !teamPhotoPreview && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Aktuelles Teamfoto</Label>
                      <div className="flex items-center justify-center">
                        <div className="relative w-full max-w-xs aspect-video rounded-lg overflow-hidden border-2 border-green-200">
                          <Image
                            src={currentMatch.team_photo_url || "/placeholder.svg"}
                            alt="Aktuelles Teamfoto"
                            fill
                            style={{ objectFit: "cover" }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(currentMatch.team_photo_url, "_blank")}
                          className="text-green-600 border-green-600 hover:bg-green-50 text-sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Vollbild ansehen
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {hasExistingPhoto ? "Neues Teamfoto auswählen" : "Teamfoto auswählen"}
                    </Label>

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input
                            id="teamPhotoCamera"
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleTeamCameraPhotoChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById("teamPhotoCamera")?.click()}
                            className="w-full text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Kamera
                          </Button>
                        </div>

                        <div className="flex-1">
                          <input
                            id="teamPhotoGallery"
                            type="file"
                            accept="image/*"
                            onChange={handleTeamGalleryPhotoChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById("teamPhotoGallery")?.click()}
                            className="w-full text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                          >
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Galerie
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {teamPhotoPreview && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Neue Foto Vorschau</Label>
                      <div className="flex items-center justify-center">
                        <div className="relative w-full max-w-xs aspect-video rounded-lg overflow-hidden border-2 border-green-200">
                          <Image
                            src={teamPhotoPreview || "/placeholder.svg"}
                            alt="Teamfoto Vorschau"
                            fill
                            style={{ objectFit: "cover" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )
            })()}

            {teamPhotoMessage && (
              <Alert>
                <AlertDescription className="text-sm">{teamPhotoMessage}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-2 pt-4">
            {(() => {
              const currentMatch = matches.find((m) => m.id === selectedMatchForTeamPhoto)
              const hasExistingPhoto = currentMatch?.team_photo_url

              return (
                <>
                  {hasExistingPhoto && (
                    <Button
                      variant="destructive"
                      onClick={handleTeamPhotoRemove}
                      disabled={teamPhotoUploading}
                      className="w-full text-xs sm:text-sm h-8"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Foto entfernen
                    </Button>
                  )}
                  <Button
                    onClick={handleTeamPhotoUpload}
                    disabled={teamPhotoUploading || !teamPhotoFile}
                    className="w-full bg-green-600 hover:bg-green-700 text-xs sm:text-sm h-8"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {teamPhotoUploading ? "Wird hochgeladen..." : hasExistingPhoto ? "Foto ersetzen" : "Hochladen"}
                  </Button>
                </>
              )
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPostponeDialogOpen} onOpenChange={setIsPostponeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Spiel verschieben</DialogTitle>
            <DialogDescription>
              Gib das neue Datum, die neue Uhrzeit und den Grund für die Verschiebung ein.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newDate">Neues Datum</Label>
              <Input
                id="newDate"
                type="date"
                value={postponeData.newDate}
                onChange={(e) => setPostponeData({ ...postponeData, newDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newTime">Neue Uhrzeit</Label>
              <Input
                id="newTime"
                type="time"
                value={postponeData.newTime}
                onChange={(e) => setPostponeData({ ...postponeData, newTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Grund für Verschiebung</Label>
              <Input
                id="reason"
                type="text"
                placeholder="z.B. Spieler krank, Halle nicht verfügbar..."
                value={postponeData.reason}
                onChange={(e) => setPostponeData({ ...postponeData, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPostponeDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (selectedMatchForPostpone) {
                  postponeMatch(
                    selectedMatchForPostpone,
                    postponeData.newDate,
                    postponeData.newTime,
                    postponeData.reason,
                  )
                }
              }}
              disabled={!postponeData.newDate || !postponeData.newTime || !postponeData.reason}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Verschieben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
