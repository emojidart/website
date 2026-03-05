"use client"

import type React from "react"

import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  ArrowLeft,
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
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

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
  // venue = Adresse, venue_name = Lokalname
  venue: string | null
  venue_name: string | null
  captain_name: string | null
  captain_phone: string | null
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
  const [showPostponeToast, setShowPostponeToast] = useState(false)
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
  .is("left_at", null) // ✅ NUR aktive Teams


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

     await fetchMatches()

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

      await fetchMatches()

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
.is("left_at", null)



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
    club_players:club_players!team_members_player_id_fkey (
      id,
      name,
      photo_url,
      throwing_hand,
      age,
      origin
    )
  `)
  .in("team_id", teamIds)
  .order("role", { ascending: false })


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


const getOpponentForMatch = (match: Match): OpponentTeam | null => {
  if (match.home_team_type === "opponent") return match.home_opponent_team ?? null
  if (match.away_team_type === "opponent") return match.away_opponent_team ?? null
  return null
}

const OpponentLokalInfo = ({ match }: { match: Match }) => {
  const opp = getOpponentForMatch(match)
  if (!opp) return null

  const hasVenueName = Boolean(opp.venue_name && opp.venue_name.trim())
  const hasVenue = Boolean(opp.venue && opp.venue.trim())
  const hasCaptain = Boolean(opp.captain_name && opp.captain_name.trim())

  const phoneRaw = opp.captain_phone || ""
  const phone = phoneRaw.trim()
  const tel = phone ? phone.replace(/[^\d+]/g, "") : null
  const wa = (() => {
    if (!phone) return null
    let p = phone.replace(/[^\d+]/g, "").trim()
    if (p.startsWith("+")) p = p.slice(1)
    if (p.startsWith("00")) p = p.slice(2)
    return `https://wa.me/${p}`
  })()

  const mapsUrl = hasVenue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opp.venue)}` : null

  // If there's nothing meaningful to show, render nothing.
  if (!hasVenueName && !hasVenue && !hasCaptain && !tel) return null

  return (
    <div className="mt-3 rounded-2xl border bg-gray-50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-gray-900">Gegner – Lokal</div>

          <div className="mt-1 grid gap-1 text-sm text-gray-700">
            {hasVenueName ? (
              <div className="flex flex-wrap gap-x-2">
                <span className="text-gray-500">Lokal:</span>
                <span className="font-medium break-words">{opp.venue_name}</span>
              </div>
            ) : null}

            {hasVenue ? (
              <div className="flex flex-wrap gap-x-2">
                <span className="text-gray-500">Ort:</span>
                <span className="font-medium break-words">{opp.venue}</span>
              </div>
            ) : null}

            {hasCaptain ? (
              <div className="flex flex-wrap gap-x-2">
                <span className="text-gray-500">Kapitän:</span>
                <span className="font-medium break-words">{opp.captain_name}</span>
              </div>
            ) : null}

            {tel ? (
              <div className="flex flex-wrap gap-x-2">
                <span className="text-gray-500">Telefon:</span>
                <a
                  className="font-medium underline underline-offset-2 break-all"
                  href={`tel:${tel}`}
                >
                  {phone}
                </a>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-row flex-wrap gap-2 self-start sm:self-auto">
          {mapsUrl ? (
            <Button asChild size="sm" variant="outline" className="rounded-xl">
              <a href={mapsUrl} target="_blank" rel="noreferrer">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Route
                </span>
              </a>
            </Button>
          ) : null}

          {wa ? (
            <Button asChild size="sm" className="rounded-xl bg-green-600 hover:bg-green-700">
              <a href={wa} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
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
     await fetchMatches()

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
  return matches
    .filter((match) => match.status === "completed")
    .sort((a, b) => {
      // zuerst nach Datum (neueste zuerst)
      const dateDiff = new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
      if (dateDiff !== 0) return dateDiff

      // wenn gleiches Datum: nach Uhrzeit (neueste zuerst)
      const ta = a.match_time ? a.match_time.slice(0, 5) : "00:00"
      const tb = b.match_time ? b.match_time.slice(0, 5) : "00:00"
      return tb.localeCompare(ta)
    })
}

const postponeMatch = async (
  matchId: string,
  newDate: string,
  newTime: string,
  reason: string
) => {
  try {
    const { error } = await supabase
      .from("matches")
      .update({
        status: "postponed",
        original_date: matches.find((m) => m.id === matchId)?.match_date ?? null,
        match_date: newDate,
        match_time: newTime,
        postponement_reason: reason,
      })
      .eq("id", matchId)

    if (error) throw error

    
    await fetchMatches()

    // ✅ Dialog schließen + Form reset
    setIsPostponeDialogOpen(false)
    setSelectedMatchForPostpone(null)
    setPostponeData({
      newDate: "",
      newTime: "",
      reason: "",
    })

    // ✅ APP-TOAST ANZEIGEN
    setShowPostponeToast(true)

    // ✅ Toast nach 2.5 Sekunden ausblenden
    window.setTimeout(() => {
      setShowPostponeToast(false)
    }, 2500)
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
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      
  <Header
  variant="app"
  title="Dashboard"
  subtitle="Übersicht & Spielplan"
  backHref="/member-profile-app"
/>

      {/* Dieser Bereich füllt ALLES unter dem Header */}
      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        
        <div className="animate-in fade-in zoom-in-95 duration-300">
          
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-white shadow-2xl px-10 py-10">
            
            {/* Spinner */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl animate-pulse" />
              <Loader2 className="relative h-12 w-12 animate-spin text-orange-600" />
            </div>

            {/* Text */}
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">
                Dashboard wird geladen
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Bitte kurz warten…
              </p>
            </div>

          </div>

        </div>

      </div>
    </main>
  )
}







  if (error) {
    return (
      // Removed Header component for mobile
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-4 pb-20">
        <Header variant="app" title="Dashboard" subtitle="Statistiken, Ergebnisse und Spielpläne" backHref="/member-profile-app" />
        {/* Changed py-6 to py-4 for mobile */}
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Fehler</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-orange-600 hover:bg-orange-700">
              Erneut versuchen
            </Button>
          </div>
        </div>
      </main>
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
  
  const modalMatch =
  selectedMatchForResults
    ? matches.find((m) => m.id === selectedMatchForResults)
    : null

const modalHomeName = modalMatch
  ? getTeamDisplayName(modalMatch, true)
  : "Heim"

const modalAwayName = modalMatch
  ? getTeamDisplayName(modalMatch, false)
  : "Auswärts"
  

  const formatMatchTime = (timeString: string | null) => {
    if (!timeString) return ""
    // Remove seconds from time string (HH:mm:ss -> HH:mm)
    const timeParts = timeString.split(":")
    const timeWithoutSeconds = `${timeParts[0]}:${timeParts[1]}`
    return ` um ${timeWithoutSeconds} Uhr`
  }

 return (
  <>
    <Header
      variant="app"
      title="Dashboard"
      subtitle="Übersicht & Spielplan"
      backHref="/member-profile-app"
    />

   <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 pt-15 pb-20">
      <DashboardTutorial role={getUserRole()} />
		
		
		
		
		

        {getPostponedMatches().length > 0 && (
  <div className="mt-6 sm:mt-4 mb-4 sm:mb-6">
    <div className="rounded-2xl border border-orange-200 bg-white shadow-xl ring-1 ring-black/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-500">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
          <CalendarX className="h-5 w-5 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-white text-sm font-extrabold">Verschobene Spiele</div>
            <span className="inline-flex items-center justify-center rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white">
              {getPostponedMatches().length}
            </span>
          </div>
          <div className="text-white/80 text-xs">
            Bitte beachte die neuen Termine.
          </div>
        </div>
      </div>

      {/* List */}
      <div className="p-3 sm:p-4 space-y-2">
        {getPostponedMatches().slice(0, 3).map((match) => {
          const homeName = getTeamDisplayNameHelper(match, true)
          const awayName = getTeamDisplayNameHelper(match, false)

          const oldDate = match.original_date ? formatMatchDate(match.original_date) : null
          const newDate = formatMatchDate(match.match_date)
          const newTime = match.match_time ? match.match_time.split(":").slice(0, 2).join(":") : ""

          return (
            <div
              key={match.id}
              className="rounded-2xl border border-orange-200/70 bg-orange-50/40 p-3"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-sm">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-gray-900">
                    {homeName} <span className="text-gray-400">vs</span> {awayName}
                  </div>

                  <div className="mt-1 grid gap-1 text-xs">
                    {oldDate ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-lg bg-white border border-gray-200">
                          <X className="h-3 w-3 text-red-500" />
                        </span>
                        <span className="line-through">{oldDate}</span>
                      </div>
                    ) : null}

                    <div className="flex items-center gap-2 text-gray-800">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-lg bg-white border border-gray-200">
                        <Check className="h-3 w-3 text-green-600" />
                      </span>
                      <span className="font-semibold">
                        {newDate}{newTime ? ` · ${newTime} Uhr` : ""}
                      </span>
                    </div>

                    {match.postponement_reason ? (
                      <div className="mt-2 rounded-xl border border-orange-200 bg-white px-3 py-2 text-[11px] text-gray-700">
                        <span className="font-semibold text-orange-700">Grund:</span>{" "}
                        {match.postponement_reason}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {getPostponedMatches().length > 3 ? (
          <div className="pt-1 text-center text-xs text-gray-500">
            ... und {getPostponedMatches().length - 3} weitere
          </div>
        ) : null}
      </div>
    </div>
  </div>
)}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
          {/* Placeholder for potential new cards or sections */}
        </div>

        <div className="mb-4 sm:mb-6 lg:mb-8">
          {/* Teams Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8 lg:mb-12">
            <div className="xl:col-span-1"></div>

            {/* Main Content */}
            <div className="xl:col-span-2 space-y-6 sm:space-8">
              {/* Spielplan Section with Tabs */}
              <Card className="shadow-xl border-0 bg-white">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                      <Calendar className="h-6 w-6 text-orange-600" />
                      Spielplan meiner Teams
                    </CardTitle>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/member-profile-app")}
                      className="flex items-center gap-2 self-start sm:self-auto"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Zurück zum Profil
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={activeMatchTab}
                    onValueChange={(value) => setActiveMatchTab(value as "upcoming" | "completed" | "postponed")}
                    className="w-full"
                  >
                   <TabsList className="flex w-full gap-2 bg-transparent p-0 border-0 shadow-none">
  <TabsTrigger
    value="upcoming"
    className="flex-1 h-8 rounded-lg px-2 text-[11px] sm:text-xs font-semibold text-gray-600
      data-[state=active]:bg-orange-600 data-[state=active]:text-white"
  >
    Kommende
    <span className="ml-1 text-[10px] opacity-70">
      ({getUpcomingMatches().length})
    </span>
  </TabsTrigger>

  <TabsTrigger
    value="postponed"
    className="flex-1 h-8 rounded-lg px-2 text-[11px] sm:text-xs font-semibold text-gray-600
      data-[state=active]:bg-amber-500 data-[state=active]:text-white"
  >
    Verschoben
    <span className="ml-1 text-[10px] opacity-70">
      ({getPostponedMatches().length})
    </span>
  </TabsTrigger>

  <TabsTrigger
    value="completed"
    className="flex-1 h-8 rounded-lg px-2 text-[11px] sm:text-xs font-semibold text-gray-600
      data-[state=active]:bg-green-600 data-[state=active]:text-white"
  >
    <span className="sm:hidden">Abgeschl.</span>
    <span className="hidden sm:inline">Abgeschlossen</span>
    <span className="ml-1 text-[10px] opacity-70">
      ({getCompletedMatches().length})
    </span>
  </TabsTrigger>
</TabsList>
					
					
					
					
					
					
					
					
					
					
					
					
					
					
				{/* Tabs Conten Upcoming */}
<TabsContent value="upcoming">
{getUpcomingMatches().length === 0 ? (
<div className="rounded-2xl border border-orange-200 bg-white p-10 text-center shadow-lg ring-1 ring-black/5">
<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-md">
<Calendar className="h-6 w-6 text-white" />
</div>
<p className="font-semibold text-gray-900">Keine kommenden Spiele gefunden.</p>
<p className="text-sm text-gray-500 mt-1">Sobald Spiele geplant sind, erscheinen sie hier.</p>
</div>
) : (
<div className="space-y-3 sm:space-y-4">
{getUpcomingMatches().map((match) => {
const homeName = getTeamDisplayNameHelper(match, true)
const awayName = getTeamName(match, false) || "Unbekannt"
    const dateText = formatMatchDate(match.match_date)
    const timeText = match.match_time ? match.match_time.split(":").slice(0, 2).join(":") : ""
    const canEdit = hasLeadershipInTeam(match.home_team_id) || hasLeadershipInTeam(match.away_team_id)

    const isPostponed = match.status === "postponed"
    const isCompleted = match.status === "completed"

    // status
    let statusLabel = "Anstehend"
    let statusClasses = "border-orange-200 bg-orange-50 text-orange-800"
    let barClass = "bg-orange-500"

    if (isPostponed) {
      statusLabel = "Verschoben"
      statusClasses = "border-amber-200 bg-amber-50 text-amber-900"
      barClass = "bg-amber-500"
    } else if (isCompleted) {
      statusLabel = "Beendet"
      statusClasses = "border-gray-200 bg-gray-100 text-gray-700"
      barClass = "bg-gray-300"
    }

    return (
      <div
        key={match.id}
        className={[
          "bg-white border border-gray-200/80 ring-1 ring-black/5 shadow-md hover:shadow-lg transition-all",
          "rounded-2xl p-3 sm:p-4",
          isPostponed ? "border-amber-200" : "border-gray-200/80",
        ].join(" ")}
      >
        <div className="flex gap-3">
          {/* left status bar */}
          <div
            className={[
              "w-1.5 rounded-full flex-shrink-0 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]",
              barClass,
            ].join(" ")}
          />

          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-3">
              {/* top row: badges + date */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono border-gray-200 bg-white text-gray-700">
                    Woche {match.week_number}
                  </Badge>

                  {match.match_format ? (
                    <Badge variant="outline" className="border-gray-200 bg-white text-gray-700 text-xs">
                      {match.match_format === "team"
                        ? "Team (2er)"
                        : match.match_format === "best_of_three"
                          ? "1v1 (BoF3)"
                          : match.match_format === "individual"
                            ? "1v1"
                            : "Standard"}
                    </Badge>
                  ) : null}

                  <Badge variant="outline" className="border-gray-200 bg-white text-gray-700 text-xs">
                    {match.dart_type === "edart" ? "E-Dart" : "Steeldart"}
                  </Badge>

                  <Badge className={["text-[11px] border px-2 py-0.5 font-semibold", statusClasses].join(" ")}>
                    {statusLabel}
                  </Badge>
                </div>

                {/* desktop meta */}
                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold text-gray-800">{dateText}</span>
                  {timeText ? <span className="text-gray-500">· {timeText} Uhr</span> : null}
                  {match.original_date ? (
                    <span className="text-[11px] text-gray-400">
                      Urspr.: <span className="line-through">{formatMatchDate(match.original_date)}</span>
                    </span>
                  ) : null}
                </div>
              </div>

              {/* teams + score */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 sm:gap-4 items-center">
                {/* home */}
                <div className="min-w-0 text-center sm:text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Heim</div>
                  <div className="mt-1 font-semibold text-[15px] sm:text-base text-gray-900 truncate">
                    {homeName}
                  </div>
                </div>

                {/* score */}
                <div className="flex items-center justify-center">
                  <div className="rounded-2xl border border-gray-200 ring-1 ring-black/5 bg-white shadow-md px-5 py-2 min-w-[120px] text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-extrabold text-gray-900">{match.home_score ?? "-"}</span>
                      <span className="text-gray-300">:</span>
                      <span className="text-2xl font-extrabold text-gray-900">{match.away_score ?? "-"}</span>
                    </div>
                  </div>
                </div>

                {/* away */}
                <div className="min-w-0 text-center sm:text-left">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Gast</div>
                  <div className="mt-1 font-semibold text-[15px] sm:text-base text-gray-900 truncate">
                    {awayName}
                  </div>
                </div>
              </div>

              {/* mobile meta */}
              <div className="sm:hidden flex items-center justify-between gap-2 text-xs text-gray-600">
                <div className="font-semibold text-gray-800 whitespace-nowrap">
                  {dateText}{timeText ? ` · ${timeText} Uhr` : ""}
                </div>
                {match.original_date ? (
                  <div className="text-[10px] text-gray-400">
                    Urspr.: <span className="line-through">{formatMatchDate(match.original_date)}</span>
                  </div>
                ) : null}
              </div>

              {/* venue */}
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-500" />
                <div className="min-w-0">
                  <div className="font-semibold text-gray-800 truncate">{match.venue}</div>
                  <OpponentLokalInfo match={match} />
                </div>
              </div>

              {/* postponed info */}
              {isPostponed && match.original_date ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <div className="text-[11px] font-semibold text-amber-900">
                    Verschoben: ursprünglich am {formatMatchDate(match.original_date)}
                    {match.postponement_reason ? ` · Grund: ${match.postponement_reason}` : ""}
                  </div>
                </div>
              ) : null}

              {/* actions */}
              {canEdit ? (
                <div className="pt-3 border-t border-gray-200/70">
                  <div className="rounded-2xl bg-gray-50 p-2 border border-gray-200/60">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {/* Primary (Orange) */}
                      <Button
                        size="sm"
                        onClick={() => {
                          const userTeamIds = teamMemberships.map((tm) => tm.team_id)
                          const isUserTeamHome = userTeamIds.includes(match.home_team_id)
                          const isUserTeamAway = userTeamIds.includes(match.away_team_id)
                          const myTeamId = isUserTeamHome ? match.home_team_id : isUserTeamAway ? match.away_team_id : null
                          if (myTeamId) router.push(`/statistics/${match.id}?teamId=${myTeamId}`)
                        }}
                        className="h-9 rounded-xl bg-orange-600 text-white hover:bg-orange-700 border border-orange-700 shadow-sm"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Statistik
                      </Button>

                      {/* Live (neutral) */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const userTeamIds = teamMemberships.map((tm) => tm.team_id)
                          const isUserTeamHome = userTeamIds.includes(match.home_team_id)
                          const isUserTeamAway = userTeamIds.includes(match.away_team_id)
                          const myTeamId = isUserTeamHome ? match.home_team_id : isUserTeamAway ? match.away_team_id : null
                          if (myTeamId) router.push(`/live-statistics/${match.id}?teamId=${myTeamId}`)
                        }}
                        className="h-9 rounded-xl border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Live
                      </Button>

                      {/* Ergebnis (neutral) */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedMatchForResults(match.id)
                          setIsResultsDialogOpen(true)
                          setEditMatchScores({
                            home: match.home_score || 0,
                            away: match.away_score || 0,
                          })
                        }}
                        className="h-9 rounded-xl border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {match.status === "completed" ? "Bearbeiten" : "Ergebnis"}
                      </Button>

                      {/* Foto (neutral) */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedMatchForTeamPhoto(match.id)
                          setIsTeamPhotoDialogOpen(true)
                          setTeamPhotoFile(null)
                          setTeamPhotoPreview(null)
                          setTeamPhotoMessage("")
                        }}
                        className="h-9 rounded-xl border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {match.team_photo_url ? "Teamfoto" : "Foto"}
                      </Button>

                      {/* Verschieben (orange soft, full width) */}
                     {/* Verschieben (orange soft, full width) */}
<Button
  size="sm"
  variant="outline"
  className="h-9 rounded-xl border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100 col-span-2 sm:col-span-2"
  onClick={() => {
    router.push(`/matches/${match.id}/postpone?back=/member-profile-app&backLabel=Dashboard`)
  }}
>
  <Calendar className="h-4 w-4 mr-2" />
  Verschieben
</Button>

                      {/* spacer desktop */}
                      <div className="hidden sm:block" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  })}
</div>
)}
</TabsContent>











{/* Tabs Content Verschoben */}
<TabsContent value="postponed">
  {getPostponedMatches().length === 0 ? (
    <div className="rounded-2xl border border-orange-200 bg-white p-10 text-center shadow-lg ring-1 ring-black/5">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-md">
        <Calendar className="h-6 w-6 text-white" />
      </div>
      <p className="font-semibold text-gray-900">Keine verschobenen Spiele gefunden.</p>
      <p className="text-sm text-gray-500 mt-1">Wenn Spiele verschoben werden, erscheinen sie hier.</p>
    </div>
  ) : (
    <div className="space-y-3 sm:space-y-4">
      {getPostponedMatches().map((match) => {
        const homeName = getTeamDisplayNameHelper(match, true)
        const awayName = getTeamName(match, false) || "Unbekannt"

        const dateText = formatMatchDate(match.match_date)
        const timeText = match.match_time ? match.match_time.split(":").slice(0, 2).join(":") : ""

        const canEdit = hasLeadershipInTeam(match.home_team_id) || hasLeadershipInTeam(match.away_team_id)

        return (
          <div
            key={match.id}
            className={[
              "bg-white border border-orange-200/60 ring-1 ring-black/5 shadow-md hover:shadow-lg transition-all",
              "rounded-2xl p-3 sm:p-4",
            ].join(" ")}
          >
            <div className="flex gap-3">
              {/* left status bar */}
              <div className="w-1.5 rounded-full flex-shrink-0 bg-orange-500 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />

              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-3">
                  {/* top row: badges + date */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono border-gray-200 bg-white text-gray-700">
                        Woche {match.week_number}
                      </Badge>

                      {match.match_format ? (
                        <Badge variant="outline" className="border-gray-200 bg-white text-gray-700 text-xs">
                          {match.match_format === "team"
                            ? "Team (2er)"
                            : match.match_format === "best_of_three"
                              ? "1v1 (BoF3)"
                              : match.match_format === "individual"
                                ? "1v1"
                                : "Standard"}
                        </Badge>
                      ) : null}

                      <Badge variant="outline" className="border-gray-200 bg-white text-gray-700 text-xs">
                        {match.dart_type === "edart" ? "E-Dart" : "Steeldart"}
                      </Badge>

                      <Badge className="text-[11px] border px-2 py-0.5 font-semibold border-orange-200 bg-orange-50 text-orange-800">
                        Verschoben
                      </Badge>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-semibold text-gray-800">{dateText}</span>
                      {timeText ? <span className="text-gray-500">· {timeText} Uhr</span> : null}
                    </div>
                  </div>

                  {/* teams + score */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 sm:gap-4 items-center">
                    {/* home */}
                    <div className="min-w-0 text-center sm:text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Heim</div>
                      <div className="mt-1 font-semibold text-[15px] sm:text-base text-gray-900 truncate">
                        {homeName}
                      </div>
                    </div>

                    {/* score */}
                    <div className="flex items-center justify-center">
                      <div className="rounded-2xl border border-gray-200 ring-1 ring-black/5 bg-white shadow-md px-5 py-2 min-w-[120px] text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl font-extrabold text-gray-900">{match.home_score ?? "-"}</span>
                          <span className="text-gray-300">:</span>
                          <span className="text-2xl font-extrabold text-gray-900">{match.away_score ?? "-"}</span>
                        </div>
                      </div>
                    </div>

                    {/* away */}
                    <div className="min-w-0 text-center sm:text-left">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Gast</div>
                      <div className="mt-1 font-semibold text-[15px] sm:text-base text-gray-900 truncate">
                        {awayName}
                      </div>
                    </div>
                  </div>

                  {/* mobile meta */}
                  <div className="sm:hidden flex items-center justify-between gap-2 text-xs text-gray-600">
                    <div className="font-semibold text-gray-800 whitespace-nowrap">
                      {dateText}{timeText ? ` · ${timeText} Uhr` : ""}
                    </div>
                    {match.original_date ? (
                      <div className="text-[10px] text-gray-400">
                        Urspr.: <span className="line-through">{formatMatchDate(match.original_date)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* original date + reason (nice orange box) */}
                  {match.original_date ? (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="text-[11px] leading-snug text-orange-900">
                          <div className="font-semibold">
                            Ursprünglich: <span className="line-through">{formatMatchDate(match.original_date)}</span>
                            <span className="mx-1 text-orange-400">→</span>
                            <span>{formatMatchDate(match.match_date)}{timeText ? ` · ${timeText} Uhr` : ""}</span>
                          </div>

                          {match.postponement_reason ? (
                            <div className="mt-1 text-orange-800">
                              <span className="font-semibold">Grund:</span> {match.postponement_reason}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* venue */}
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-500" />
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 truncate">{match.venue}</div>
                      <OpponentLokalInfo match={match} />
                    </div>
                  </div>

                  {/* actions */}
                  {canEdit ? (
                    <div className="pt-3 border-t border-gray-200/70">
                      <div className="rounded-2xl bg-gray-50 p-2 border border-gray-200/60">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {/* Statistik (Primary orange) */}
                          <Button
                            size="sm"
                            onClick={() => {
                              const userTeamIds = teamMemberships.map((tm) => tm.team_id)
                              const isUserTeamHome = userTeamIds.includes(match.home_team_id)
                              const isUserTeamAway = userTeamIds.includes(match.away_team_id)
                              const myTeamId = isUserTeamHome ? match.home_team_id : isUserTeamAway ? match.away_team_id : null
                              if (myTeamId) router.push(`/statistics/${match.id}?teamId=${myTeamId}`)
                            }}
                            className="h-9 rounded-xl bg-orange-600 text-white hover:bg-orange-700 border border-orange-700 shadow-sm"
                          >
                            <Target className="h-4 w-4 mr-2" />
                            Statistik
                          </Button>

                          {/* Ergebnis */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMatchForResults(match.id)
                              setIsResultsDialogOpen(true)
                              setEditMatchScores({
                                home: match.home_score || 0,
                                away: match.away_score || 0,
                              })
                            }}
                            className="h-9 rounded-xl border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Ergebnis
                          </Button>

                          {/* Foto */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMatchForTeamPhoto(match.id)
                              setIsTeamPhotoDialogOpen(true)
                              setTeamPhotoFile(null)
                              setTeamPhotoPreview(null)
                              setTeamPhotoMessage("")
                            }}
                            className="h-9 rounded-xl border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            {match.team_photo_url ? "Teamfoto" : "Foto"}
                          </Button>

                          {/* Neu planen (wide) */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-xl border-orange-200 bg-white text-orange-700 hover:bg-orange-50 col-span-2 sm:col-span-2"
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
                            <Calendar className="h-4 w-4 mr-2" />
                            Neu planen
                          </Button>

                          {/* Rückgängig */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-xl border-red-200 bg-white text-red-700 hover:bg-red-50"
                            onClick={() => undoPostponement(match.id)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Rückgängig
                          </Button>

                          {/* Spacer on desktop for alignment */}
                          <div className="hidden sm:block" />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )}
</TabsContent>
                   
				   
				   
				   
				   
				   
				   
				   
	{/* Tabs Conten Abgeschlosssen */}
<TabsContent value="completed">
  {getCompletedMatches().length === 0 ? (
    <div className="rounded-2xl border border-orange-200 bg-white p-10 text-center shadow-lg ring-1 ring-black/5">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-md">
        <Calendar className="h-6 w-6 text-white" />
      </div>
      <p className="font-semibold text-gray-900">Keine abgeschlossenen Spiele gefunden.</p>
      <p className="mt-1 text-sm text-gray-500">Sobald Ergebnisse eingetragen sind, erscheinen sie hier.</p>
    </div>
  ) : (
    <div className="space-y-3 sm:space-y-4">
      {getCompletedMatches().map((match) => {
        const homeName = getTeamDisplayNameHelper(match, true)
        const awayName = getTeamName(match, false) || "Unbekannt"

        const dateText = formatMatchDate(match.match_date)
        const timeText = match.match_time ? match.match_time.split(":").slice(0, 2).join(":") : ""
        const canEdit = hasLeadershipInTeam(match.home_team_id) || hasLeadershipInTeam(match.away_team_id)

        const result = getMatchResult(match) // "won" | "lost" | "draw" | "pending" | "neutral"

        let resultLabel = "Beendet"
        let barClass = "bg-gray-300"
        let badgeClass = "border-gray-200 bg-gray-50 text-gray-700"

        if (result === "won") {
          resultLabel = "Sieg"
          barClass = "bg-green-500"
          badgeClass = "border-green-200 bg-green-50 text-green-700"
        } else if (result === "lost") {
          resultLabel = "Niederlage"
          barClass = "bg-red-500"
          badgeClass = "border-red-200 bg-red-50 text-red-700"
        } else if (result === "draw") {
          resultLabel = "Unentschieden"
          barClass = "bg-yellow-500"
          badgeClass = "border-yellow-200 bg-yellow-50 text-yellow-700"
        } else if (result === "pending") {
          resultLabel = "Offen"
          barClass = "bg-orange-500"
          badgeClass = "border-orange-200 bg-orange-50 text-orange-800"
        }

        return (
          <div
            key={match.id}
            className={[
              "bg-white border border-gray-200/80 ring-1 ring-black/5 shadow-md hover:shadow-lg transition-all",
              "rounded-2xl p-3 sm:p-4",
            ].join(" ")}
          >
            <div className="flex gap-3">
              {/* left result bar */}
              <div
                className={[
                  "w-1.5 rounded-full flex-shrink-0 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]",
                  barClass,
                ].join(" ")}
              />

              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-3">
                  {/* top row: badges + date */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono border-gray-200 bg-white text-gray-700">
                        Woche {match.week_number}
                      </Badge>

                      {match.match_format ? (
                        <Badge variant="outline" className="border-gray-200 bg-white text-gray-700 text-xs">
                          {match.match_format === "team"
                            ? "Team (2er)"
                            : match.match_format === "best_of_three"
                              ? "1v1 (BoF3)"
                              : match.match_format === "individual"
                                ? "1v1"
                                : "Standard"}
                        </Badge>
                      ) : null}

                      <Badge variant="outline" className="border-gray-200 bg-white text-gray-700 text-xs">
                        {match.dart_type === "edart" ? "E-Dart" : "Steeldart"}
                      </Badge>

                      <Badge className={["text-[11px] border px-2 py-0.5 font-semibold", badgeClass].join(" ")}>
                        {resultLabel}
                      </Badge>
                    </div>

                    {/* desktop meta */}
                    <div className="hidden items-center gap-2 text-sm text-gray-600 sm:flex">
                      <span className="font-semibold text-gray-800">{dateText}</span>
                      {timeText ? <span className="text-gray-500">· {timeText} Uhr</span> : null}
                    </div>
                  </div>

                  {/* teams + score */}
                  <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
                    {/* home */}
                    <div className="min-w-0 text-center sm:text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Heim</div>
                      <div className="mt-1 truncate text-[15px] font-semibold text-gray-900 sm:text-base">{homeName}</div>
                      <div className="mt-1 text-[11px] text-gray-500">
                        {match.home_team_type === "own" ? "Heim" : "Heim (Gegner)"}
                      </div>
                    </div>

                    {/* score */}
                    <div className="flex items-center justify-center">
                      <div className="min-w-[120px] rounded-2xl border border-gray-200 bg-white px-5 py-2 text-center shadow-md ring-1 ring-black/5">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl font-extrabold text-gray-900">{match.home_score ?? "-"}</span>
                          <span className="text-gray-300">:</span>
                          <span className="text-2xl font-extrabold text-gray-900">{match.away_score ?? "-"}</span>
                        </div>
                      </div>
                    </div>

                    {/* away */}
                    <div className="min-w-0 text-center sm:text-left">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Gast</div>
                      <div className="mt-1 truncate text-[15px] font-semibold text-gray-900 sm:text-base">{awayName}</div>
                      <div className="mt-1 text-[11px] text-gray-500">
                        {match.away_team_type === "own" ? "Auswärts" : "Auswärts (Gegner)"}
                      </div>
                    </div>
                  </div>

                  {/* mobile meta */}
                  <div className="flex items-center justify-between gap-2 text-xs text-gray-600 sm:hidden">
                    <div className="whitespace-nowrap font-semibold text-gray-800">
                      {dateText}
                      {timeText ? ` · ${timeText} Uhr` : ""}
                    </div>
                  </div>

                  {/* venue (OHNE Gegner-Lokal / Ort / Telefon / Route / WhatsApp) */}
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-gray-800">{match.venue}</div>
                    </div>
                  </div>

                  {/* actions */}
                  {canEdit ? (
                    <div className="border-t border-gray-200/70 pt-3">
                      <div className="rounded-2xl border border-gray-200/60 bg-gray-50 p-2">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          <Button
                            size="sm"
                            onClick={() => {
                              const userTeamIds = teamMemberships.map((tm) => tm.team_id)
                              const isUserTeamHome = userTeamIds.includes(match.home_team_id)
                              const isUserTeamAway = userTeamIds.includes(match.away_team_id)
                              const myTeamId = isUserTeamHome
                                ? match.home_team_id
                                : isUserTeamAway
                                  ? match.away_team_id
                                  : null
                              if (myTeamId) router.push(`/statistics/${match.id}?teamId=${myTeamId}`)
                            }}
                            className="h-9 rounded-xl border border-orange-700 bg-orange-600 text-white shadow-sm hover:bg-orange-700"
                          >
                            <Target className="mr-2 h-4 w-4" />
                            Statistik
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMatchForResults(match.id)
                              setIsResultsDialogOpen(true)
                              setEditMatchScores({
                                home: match.home_score || 0,
                                away: match.away_score || 0,
                              })
                            }}
                            className="h-9 rounded-xl border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Bearbeiten
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMatchForTeamPhoto(match.id)
                              setIsTeamPhotoDialogOpen(true)
                              setTeamPhotoFile(null)
                              setTeamPhotoPreview(null)
                              setTeamPhotoMessage("")
                            }}
                            className="h-9 rounded-xl border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            {match.team_photo_url ? "Teamfoto" : "Foto"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )}
</TabsContent>			   
				   
				   
				   
				   
					
					
					
					
					
					
					
					
					
					
					
					
		
  </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</main>

<MobileBottomNav />

{showPostponeToast && (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top-2 fade-in duration-200">
    <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-white px-4 py-3 shadow-2xl">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600">
        <Check className="h-5 w-5 text-white" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-bold text-gray-900">Spiel verschoben</div>
        <div className="text-xs text-gray-500">Änderungen gespeichert</div>
      </div>
    </div>
  </div>
)}



     <Dialog
  open={isResultsDialogOpen && selectedMatchForResults !== null}
  onOpenChange={(open) => {
    setIsResultsDialogOpen(open)
    if (!open) setSelectedMatchForResults(null)
  }}
>
  <DialogContent className="w-[92vw] max-w-xs rounded-2xl border-0 p-0 shadow-xl overflow-hidden">
    
    {/* Header klein */}
    <div className="bg-orange-600 px-4 py-3">
      <DialogTitle className="text-white text-sm font-bold">
        Ergebnis eintragen
      </DialogTitle>
    </div>

    {/* Body kompakt */}
    <div className="px-4 py-4 space-y-4">

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">

        {/* Heim */}
        <div className="text-center space-y-2">
          <div className="text-[11px] font-semibold text-gray-500 truncate">
  {modalHomeName}
</div>

          <div className="flex items-center justify-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-xl"
              onClick={() =>
                setEditMatchScores(prev => ({
                  ...prev,
                  home: Math.max(0, prev.home - 1)
                }))
              }
            >
              −
            </Button>

            <div className="min-w-[44px] text-xl font-extrabold text-gray-900">
              {editMatchScores.home}
            </div>

            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-xl"
              onClick={() =>
                setEditMatchScores(prev => ({
                  ...prev,
                  home: Math.min(99, prev.home + 1)
                }))
              }
            >
              +
            </Button>
          </div>
        </div>

        <div className="text-xl font-bold text-gray-300">:</div>

        {/* Auswärts */}
        <div className="text-center space-y-2">
         <div className="text-[11px] font-semibold text-gray-500 truncate">
  {modalAwayName}
</div>

          <div className="flex items-center justify-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-xl"
              onClick={() =>
                setEditMatchScores(prev => ({
                  ...prev,
                  away: Math.max(0, prev.away - 1)
                }))
              }
            >
              −
            </Button>

            <div className="min-w-[44px] text-xl font-extrabold text-gray-900">
              {editMatchScores.away}
            </div>

            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-xl"
              onClick={() =>
                setEditMatchScores(prev => ({
                  ...prev,
                  away: Math.min(99, prev.away + 1)
                }))
              }
            >
              +
            </Button>
          </div>
        </div>
      </div>
    </div>

    {/* Footer kompakt */}
    <div className="grid grid-cols-2 gap-2 px-4 pb-4">
      <Button
        variant="outline"
        className="h-9 rounded-xl"
        onClick={() => {
          setIsResultsDialogOpen(false)
          setSelectedMatchForResults(null)
        }}
      >
        Abbrechen
      </Button>

      <Button
        className="h-9 rounded-xl bg-orange-600 hover:bg-orange-700"
        onClick={() => {
          if (selectedMatchForResults) {
            updateMatchScore(
              selectedMatchForResults,
              editMatchScores.home,
              editMatchScores.away
            )
          }
          // DIREKT SCHLIESSEN
          setIsResultsDialogOpen(false)
          setSelectedMatchForResults(null)
        }}
      >
        Speichern
      </Button>
    </div>
  </DialogContent>
</Dialog>
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  {/* Foto Modal */}
	  
	  
	  

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
  <DialogContent className="w-[92vw] max-w-sm rounded-2xl border-0 p-0 shadow-2xl overflow-hidden bg-white">

  {(() => {
    const currentMatch = matches.find((m) => m.id === selectedMatchForTeamPhoto)
    const hasExistingPhoto = Boolean(currentMatch?.team_photo_url)

    return (
      <>
        {/* Header – dezentes Orange */}
        <div className="px-4 py-3 bg-orange-600">
          <DialogTitle className="text-sm font-bold text-white">
            Teamfoto
          </DialogTitle>
          <DialogDescription className="text-xs text-orange-100">
            Hochladen oder ersetzen
          </DialogDescription>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4">

          {/* Preview */}
          <div className="rounded-2xl border border-orange-100 bg-orange-50/40 overflow-hidden">
            <div className="relative w-full aspect-video">
              <Image
                src={
                  teamPhotoPreview ||
                  currentMatch?.team_photo_url ||
                  "/placeholder.svg"
                }
                alt="Teamfoto Vorschau"
                fill
                style={{ objectFit: "cover" }}
              />
            </div>
          </div>

          {/* Picker Buttons */}
          <div className="grid grid-cols-2 gap-2">
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
              className="h-10 rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              Kamera
            </Button>

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
              className="h-10 rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              Galerie
            </Button>
          </div>

          {teamPhotoMessage && (
            <Alert className="rounded-xl border-orange-200 bg-orange-50">
              <AlertDescription className="text-sm text-orange-800">
                {teamPhotoMessage}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">

          {hasExistingPhoto ? (
            <Button
              variant="destructive"
              onClick={handleTeamPhotoRemove}
              disabled={teamPhotoUploading}
              className="h-10 rounded-xl"
            >
              Entfernen
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                setIsTeamPhotoDialogOpen(false)
                setSelectedMatchForTeamPhoto(null)
              }}
              className="h-10 rounded-xl"
            >
              Abbrechen
            </Button>
          )}

          <Button
            onClick={handleTeamPhotoUpload}
            disabled={teamPhotoUploading || !teamPhotoFile}
            className="h-10 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-md"
          >
            {teamPhotoUploading ? "Upload..." : "Speichern"}
          </Button>

        </div>
      </>
    )
  })()}
</DialogContent>
</Dialog>










 
    </>
  )
}
