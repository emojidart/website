"use client"

import type React from "react"

import {
  Header } from "@/components/header"
import { Card,
  CardContent,
  CardHeader,
  CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useMembershipAccess } from "@/hooks/use-membership-access"
import { useRouter } from "next/navigation"
import { useEffect,
  useState } from "react"
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
  Phone,
  ChevronDown,
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
  notes?: string | null
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

type SportdartsSyncPlayer = {
  sportdartsNumber: string
  sportdartsName: string
  localPlayerId: string | null
  localPlayerName: string | null
  inConfirmedLineup: boolean
  eligibleNow: boolean | null
  singlesPlayed: number
  legsWon: number
  legsLost: number
  checksMade: number | null
  checksTotal: number | null
  issue: string | null
}

type SportdartsExtraStats = {
  throws_180: number
  throws_171: number
  throws_high_tonne: number
  throws_tonne: number
  throws_shanghai: number
  throws_95_plus: number
  throws_bull: number
  throws_15: number
  throws_16: number
  throws_17: number
  throws_18: number
  throws_19: number
  throws_20: number
  throws_under_26: number
  throws_under_30: number
  semperit_outs: number
}

const EMPTY_SPORTDARTS_EXTRA_STATS: SportdartsExtraStats = {
  throws_180: 0,
  throws_171: 0,
  throws_high_tonne: 0,
  throws_tonne: 0,
  throws_shanghai: 0,
  throws_95_plus: 0,
  throws_bull: 0,
  throws_15: 0,
  throws_16: 0,
  throws_17: 0,
  throws_18: 0,
  throws_19: 0,
  throws_20: 0,
  throws_under_26: 0,
  throws_under_30: 0,
  semperit_outs: 0,
}

type SportdartsExtraEditRow = {
  statId: string
  playerId: string
  playerName: string
  stats: SportdartsExtraStats
}

type SportdartsGameCandidate = {
  gameId: string
  date: string
  weekNumber: number
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: "scheduled" | "live" | "completed"
  confidence: "exact" | "team_date"
}

type SportdartsSyncPreview = {
  gameId: string
  ownSide: "home" | "away"
  homeTeam: string
  awayTeam: string
  homeScore: string
  awayScore: string
  lineupConfirmed: boolean
  eligibilityChecked: boolean
  blocked: boolean
  blockReason: string | null
  players: SportdartsSyncPlayer[]
}

interface BonusConfig {
  under26: number
  under30: number
  semperit: number
}

export default function DashboardPage() {
  const { session, user, loading: authLoading } = useAuth()
  const {
    loading: membershipLoading,
    hasModule,
  } = useMembershipAccess()

  const canSeeEDart = hasModule("edart_league")
  const canSeeSteeldart = hasModule("steeldart_league")

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

  // Sportdarts Sync: bewusst nur Vorschau. Diese Version schreibt nichts in Supabase.
  const [sportdartsSyncOpen, setSportdartsSyncOpen] = useState(false)
  const [sportdartsSyncLoading, setSportdartsSyncLoading] = useState(false)
  const [sportdartsSyncError, setSportdartsSyncError] = useState("")
  const [sportdartsSyncPreview, setSportdartsSyncPreview] = useState<SportdartsSyncPreview | null>(null)
  const [sportdartsSyncCandidates, setSportdartsSyncCandidates] = useState<SportdartsGameCandidate[]>([])
  const [sportdartsSyncMatch, setSportdartsSyncMatch] = useState<Match | null>(null)
  const [sportdartsSyncActionLoading, setSportdartsSyncActionLoading] = useState(false)
  const [sportdartsExtraEnabled, setSportdartsExtraEnabled] = useState(false)
  const [sportdartsExtraOpenPlayers, setSportdartsExtraOpenPlayers] = useState<Record<string, boolean>>({})
  const [sportdartsExtraStats, setSportdartsExtraStats] = useState<Record<string, SportdartsExtraStats>>({})
  const [extraStatsEditOpen, setExtraStatsEditOpen] = useState(false)
  const [extraStatsEditLoading, setExtraStatsEditLoading] = useState(false)
  const [extraStatsEditSaving, setExtraStatsEditSaving] = useState(false)
  const [extraStatsEditError, setExtraStatsEditError] = useState("")
  const [extraStatsEditMatch, setExtraStatsEditMatch] = useState<Match | null>(null)
  const [extraStatsEditRows, setExtraStatsEditRows] = useState<SportdartsExtraEditRow[]>([])
  const [matchesWithExtraStats, setMatchesWithExtraStats] = useState<Record<string, boolean>>({})

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
    <div className="mt-4 overflow-hidden rounded-[22px] border border-white/[0.08] bg-black/25 text-white shadow-[0_20px_60px_-44px_rgba(0,0,0,.95)] backdrop-blur-xl hover:text-white focus-visible:text-white">
      <div className="flex flex-col gap-3 border-b border-white/[0.07] bg-white/[0.025] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-300/[0.14] bg-orange-500/[0.08]">
            <MapPin className="h-4 w-4 text-orange-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">
              Auswärtsspiel
            </div>
            <div className="text-sm font-black leading-tight text-white sm:truncate">
              Gegner – Lokal
            </div>
          </div>
        </div>

        {mapsUrl ? (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-9 w-full rounded-xl border-white/[0.10] bg-white/[0.035] px-3 font-bold text-white/65 shadow-none hover:bg-white/[0.05] sm:w-auto sm:shrink-0 hover:text-white focus-visible:text-white"
          >
            <a href={mapsUrl} target="_blank" rel="noreferrer">
              <MapPin className="mr-1.5 h-3.5 w-3.5" />
              Route
            </a>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-2.5 p-3.5 sm:grid-cols-2 sm:p-4">
        {hasVenueName ? (
          <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">Lokal</div>
            <div className="mt-1 break-words text-sm font-black leading-snug text-white">
              {opp.venue_name}
            </div>
          </div>
        ) : null}

        {hasVenue ? (
          <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">Adresse</div>
            <div className="mt-1 break-words text-sm font-semibold leading-snug text-white/65">
              {opp.venue}
            </div>
          </div>
        ) : null}

        {hasCaptain ? (
          <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-3">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/30">
              <ShieldCheck className="h-3.5 w-3.5 text-orange-500" />
              Kapitän
            </div>
            <div className="mt-1 break-words text-sm font-black leading-snug text-white">
              {opp.captain_name}
            </div>
          </div>
        ) : null}

        {tel ? (
          <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-3">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/30">
              <Phone className="h-3.5 w-3.5 text-orange-500" />
              Telefon
            </div>
            <a
              className="mt-1 block break-all text-sm font-black leading-snug text-white hover:text-orange-300"
              href={`tel:${tel}`}
            >
              {phone}
            </a>
          </div>
        ) : null}
      </div>

      {wa ? (
        <div className="border-t border-slate-100 px-3.5 py-3 sm:px-4">
          <Button
            asChild
            size="sm"
            className="h-10 w-full rounded-xl bg-orange-500 font-black text-white shadow-none hover:bg-orange-600 sm:w-auto"
          >
            <a href={wa} target="_blank" rel="noreferrer">
              WhatsApp öffnen
            </a>
          </Button>
        </div>
      ) : null}
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
        return <Users className="h-5 w-5 text-white/55" />
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
        return "bg-white/[0.05] text-white/75 border-gray-300"
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
      const finishedIds = enrichedMatches.filter((m) => m.status === "completed").map((m) => m.id)
      if (finishedIds.length > 0) {
        const fields = Object.keys(EMPTY_SPORTDARTS_EXTRA_STATS)
        const [legacy, added] = await Promise.all([
          supabase.from("leg_statistics").select(`match_id,${fields.join(",")}`).in("match_id", finishedIds),
          supabase.from("match_player_extra_stats").select("match_id,stats").in("match_id", finishedIds),
        ])
        if (!legacy.error && !added.error) {
          const active: Record<string, boolean> = {}
          for (const row of (legacy.data || []) as any[]) {
            if (fields.some((key) => Number(row[key] || 0) > 0)) active[row.match_id] = true
          }
          for (const row of (added.data || []) as any[]) {
            if (Object.values(row.stats || {}).some((value) => Number(value) > 0)) active[row.match_id] = true
          }
          setMatchesWithExtraStats(active)
        }
      }

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

  const getLocalDateString = () => {
    const now = new Date()
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    return localNow.toISOString().split("T")[0]
  }

  const isFutureMatch = (match: Match) => match.match_date > getLocalDateString()

  const updateMatchScore = async (matchId: string, homeScore: number, awayScore: number): Promise<boolean> => {
    if (!isLeadershipRole()) return false

    const match = matches.find((m) => m.id === matchId)
    if (!match) return false

    const hasHomeTeamLeadership = hasLeadershipInTeam(match.home_team_id)
    const hasAwayTeamLeadership = hasLeadershipInTeam(match.away_team_id)

    if (!hasHomeTeamLeadership && !hasAwayTeamLeadership) {
      console.log("[v0] User doesn't have leadership role in either team for this match")
      return false
    }

    if (isFutureMatch(match)) {
      toast({
        title: "Ergebnis noch nicht möglich",
        description: "Ein Ergebnis kann erst am Spieltag eingetragen werden.",
        variant: "destructive",
      })
      return false
    }

    if (homeScore === 0 && awayScore === 0) {
      toast({
        title: "Ungültiges Ergebnis",
        description: "Ein Spiel kann nicht mit 0:0 als beendet gespeichert werden.",
        variant: "destructive",
      })
      return false
    }

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
      toast({
        title: "Ungültiges Ergebnis",
        description: "Bitte ein gültiges Ergebnis eingeben.",
        variant: "destructive",
      })
      return false
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

      if (error) throw error

      await fetchMatches()
      fetchLigaStatistics()

      toast({
        title: "Ergebnis gespeichert",
        description: `${homeScore}:${awayScore} wurde eingetragen.`,
      })
      return true
    } catch (error) {
      console.error("Error updating match score:", error)
      toast({
        title: "Fehler",
        description: "Das Ergebnis konnte nicht gespeichert werden.",
        variant: "destructive",
      })
      return false
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

// Helper functions to filter matches by membership + status
const getMembershipVisibleMatches = () => {
  return matches.filter((match) => {
    if (match.dart_type === "edart") return canSeeEDart
    if (match.dart_type === "steeldart") return canSeeSteeldart

    // Unbekannte Dartart sicherheitshalber nicht freigeben.
    return false
  })
}

const getUpcomingMatches = () => {
  return getMembershipVisibleMatches().filter(
    (match) => match.status !== "completed" && match.status !== "postponed",
  )
}

const getPostponedMatches = () => {
  return getMembershipVisibleMatches().filter((match) => match.status === "postponed")
}

const getCompletedMatches = () => {
  return getMembershipVisibleMatches()
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


const getSportdartsGameId = (match: Match) =>
  match.notes?.match(/SPORTDARTS_GAME_ID:(\d+)/)?.[1] ?? null

const normalizeSportdartsTeamName = (value: string | null | undefined) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")

const getOwnTeamIdForMatch = (match: Match) => {
  const ownTeamIds = new Set(teamMemberships.map((membership) => membership.team_id))
  if (match.home_team_id && ownTeamIds.has(match.home_team_id)) return match.home_team_id
  if (match.away_team_id && ownTeamIds.has(match.away_team_id)) return match.away_team_id
  return null
}

const getOwnTeamNameForMatch = (match: Match, ownTeamId: string) => {
  const membership = teamMemberships.find((item) => item.team_id === ownTeamId)
  if (membership?.teams?.name) return membership.teams.name

  if (match.home_team_id === ownTeamId) return getTeamDisplayName(match, true)
  if (match.away_team_id === ownTeamId) return getTeamDisplayName(match, false)
  return ""
}

const getOpponentNameForSportdartsMatch = (match: Match, ownTeamId: string) => {
  if (match.home_team_id === ownTeamId) return getTeamDisplayName(match, false)
  if (match.away_team_id === ownTeamId) return getTeamDisplayName(match, true)
  return ""
}

const discoverSportdartsCandidates = async (
  match: Match,
  ownTeamId: string,
): Promise<SportdartsGameCandidate[]> => {
  // Die exakte saisonbezogene Zuordnung hat Vorrang. Bei manuell angelegten
  // Altspielen darf notfalls die zuletzt gepflegte Team-Zuordnung verwendet werden.
  let assignmentQuery = supabase
    .from("team_sportdarts_assignments")
    .select("team_id,season_id,sportdarts_season_id,sportdarts_division_id,updated_at")
    .eq("team_id", ownTeamId)
    .order("updated_at", { ascending: false })

  const { data: assignmentRows, error: assignmentError } = await assignmentQuery
  if (assignmentError) throw assignmentError

  const assignments = (assignmentRows as any[]) || []
  const assignment =
    assignments.find((row) => row.season_id === match.season_id) ||
    assignments[0] ||
    null

  if (!assignment?.sportdarts_season_id || !assignment?.sportdarts_division_id) {
    throw new Error("Für dieses Team ist keine Sportdarts-Division hinterlegt.")
  }

  const response = await fetch("/api/sportdarts/results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seasonId: Number(assignment.sportdarts_season_id),
      divisionId: Number(assignment.sportdarts_division_id),
    }),
    cache: "no-store",
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.error || "Sportdarts-Spielplan konnte nicht geladen werden.")
  }

  const ownTeamName = normalizeSportdartsTeamName(getOwnTeamNameForMatch(match, ownTeamId))
  const opponentName = normalizeSportdartsTeamName(getOpponentNameForSportdartsMatch(match, ownTeamId))
  const ownSide: "home" | "away" = match.home_team_id === ownTeamId ? "home" : "away"

  // Bei verschobenen Spielen kann Sportdarts weiterhin das ursprüngliche
  // Spieltagsdatum führen, während EMD bereits den neuen Termin gespeichert hat.
  // Deshalb beide Daten akzeptieren; der aktuelle Termin hat Vorrang.
  const acceptedDates = Array.from(
    new Set([match.match_date, match.original_date].filter(Boolean) as string[]),
  )

  const dateCandidates = ((result?.games as any[]) || [])
    .filter((game) => acceptedDates.includes(game.date))
    .sort((a, b) => {
      const aCurrent = a.date === match.match_date ? 0 : 1
      const bCurrent = b.date === match.match_date ? 0 : 1
      return aCurrent - bCurrent
    })

  const exact = dateCandidates.filter((game) => {
    const sportOwn = normalizeSportdartsTeamName(ownSide === "home" ? game.homeTeam : game.awayTeam)
    const sportOpponent = normalizeSportdartsTeamName(ownSide === "home" ? game.awayTeam : game.homeTeam)

    return sportOwn === ownTeamName && sportOpponent === opponentName
  })

  if (exact.length) {
    return exact.map((game) => ({ ...game, confidence: "exact" as const }))
  }

  // Fallback: passendes aktuelles/ursprüngliches Datum + eigenes Team
  // auf derselben Heim/Gast-Seite. Nur als Kandidat, niemals automatisch.
  const teamDate = dateCandidates.filter((game) => {
    const sportOwn = normalizeSportdartsTeamName(ownSide === "home" ? game.homeTeam : game.awayTeam)
    return Boolean(ownTeamName) && sportOwn === ownTeamName
  })

  return teamDate.map((game) => ({ ...game, confidence: "team_date" as const }))
}

const loadSportdartsSyncPreview = async (match: Match, selectedGameId?: string) => {
  const storedGameId = getSportdartsGameId(match)
  const ownTeamId = getOwnTeamIdForMatch(match)

  setSportdartsSyncOpen(true)
  setSportdartsSyncLoading(true)
  setSportdartsSyncError("")
  setSportdartsSyncPreview(null)
  setSportdartsSyncMatch(match)
  setSportdartsExtraEnabled(false)
  setSportdartsExtraOpenPlayers({})
  setSportdartsExtraStats({})

  if (!ownTeamId) {
    setSportdartsSyncError("Das eigene Team konnte für dieses Spiel nicht eindeutig ermittelt werden.")
    setSportdartsSyncLoading(false)
    return
  }

  try {
    let gameId = selectedGameId || storedGameId

    if (!gameId) {
      const candidates = await discoverSportdartsCandidates(match, ownTeamId)
      setSportdartsSyncCandidates(candidates)

      if (candidates.length === 0) {
        throw new Error(
          "Kein passendes Sportdarts-Spiel gefunden. Geprüft wurden Division, aktuelles/ursprüngliches Datum und eigenes Team.",
        )
      }

      // Nur einen EXAKTEN Treffer automatisch öffnen.
      if (candidates.length === 1 && candidates[0].confidence === "exact") {
        gameId = candidates[0].gameId
      } else {
        setSportdartsSyncLoading(false)
        return
      }
    } else {
      setSportdartsSyncCandidates([])
    }

    const detailResponse = await fetch(`/api/sportdarts/game/${encodeURIComponent(gameId)}`, {
      method: "GET",
      cache: "no-store",
    })
    const detail = await detailResponse.json()

    if (!detailResponse.ok) {
      throw new Error(detail?.error || "Sportdarts-Daten konnten nicht geladen werden.")
    }

    const ownSide: "home" | "away" = match.home_team_id === ownTeamId ? "home" : "away"

    const { data: lineupHeader, error: lineupHeaderError } = await supabase
      .from("match_lineup_headers")
      .select("status,current_version,confirmed_version,confirmed_at")
      .eq("match_id", match.id)
      .eq("team_id", ownTeamId)
      .maybeSingle()

    if (lineupHeaderError) throw lineupHeaderError

    const lineupConfirmed =
      lineupHeader?.status === "confirmed" &&
      lineupHeader?.confirmed_version != null &&
      lineupHeader?.current_version != null &&
      lineupHeader.confirmed_version === lineupHeader.current_version

    const { data: lineupRows, error: lineupError } = await supabase
      .from("match_lineups")
      .select("player_id,position,is_substitute")
      .eq("match_id", match.id)
      .eq("team_id", ownTeamId)

    if (lineupError) throw lineupError

    const lineupPlayerIds = Array.from(
      new Set(((lineupRows as any[]) || []).map((row) => row.player_id).filter(Boolean)),
    ) as string[]

    let localPlayers: Array<{ id: string; name: string; player_number: string | number | null }> = []

    if (lineupPlayerIds.length > 0) {
      const { data: playerRows, error: playerRowsError } = await supabase
        .from("club_players")
        .select("id,name,player_number")
        .in("id", lineupPlayerIds)

      if (playerRowsError) throw playerRowsError
      localPlayers = (playerRows as any[]) || []
    }

    const localByNumber = new Map<string, { id: string; name: string; player_number: string | number | null }>()
    localPlayers.forEach((player) => {
      const number = String(player.player_number ?? "").trim()
      if (number) localByNumber.set(number, player)
    })

    const requiredModule =
      String(match.dart_type || "").toLowerCase() === "steeldart"
        ? "steeldart_league"
        : String(match.dart_type || "").toLowerCase() === "edart"
          ? "edart_league"
          : null

    let eligiblePlayerIds = new Set<string>()
    let eligibilityChecked = false
    let eligiblePlayers: Array<{ id: string; name: string; player_number: string | number | null }> = []

    if (requiredModule) {
      const { data: eligibleRows, error: eligibleError } = await supabase.rpc(
        "eligible_team_players_for_league",
        {
          p_team_id: ownTeamId,
          p_required_module_code: requiredModule,
        },
      )

      if (!eligibleError) {
        eligibilityChecked = true
        eligiblePlayerIds = new Set(
          ((eligibleRows as any[]) || []).map((row: any) => row.player_id).filter(Boolean),
        )

        const eligibleIds = Array.from(eligiblePlayerIds)
        if (eligibleIds.length > 0) {
          const { data: eligiblePlayerRows, error: eligiblePlayerError } = await supabase
            .from("club_players")
            .select("id,name,player_number")
            .in("id", eligibleIds)

          if (eligiblePlayerError) throw eligiblePlayerError
          eligiblePlayers = (eligiblePlayerRows as any[]) || []
        }
      }
    }

    // Die bestätigte EMD-Aufstellung bleibt ein Hinweis, ist aber nicht mehr
    // die einzige Zuordnungsquelle. Entscheidend ist, wer laut Sportdarts
    // tatsächlich gespielt hat und für das Team/Liga-Modul berechtigt ist.
    const eligibleByNumber = new Map<string, { id: string; name: string; player_number: string | number | null }>()
    eligiblePlayers.forEach((player) => {
      const number = String(player.player_number ?? "").trim()
      if (number) eligibleByNumber.set(number, player)
    })

    const sportPlayers = ownSide === "home" ? detail.homePlayers || [] : detail.awayPlayers || []
    const usedNumbers: string[] =
      ownSide === "home" ? detail.usedHomePlayerNumbers || [] : detail.usedAwayPlayerNumbers || []
    const legRows = ownSide === "home" ? detail.homePlayerLegs || [] : detail.awayPlayerLegs || []

    const sportByNumber = new Map<string, any>()
    sportPlayers.forEach((player: any) => {
      const number = String(player.playerNumber || "").trim()
      if (number) sportByNumber.set(number, player)
    })

    const legsByNumber = new Map<string, any>()
    legRows.forEach((row: any) => {
      const number = String(row.playerNumber || "").trim()
      if (number) legsByNumber.set(number, row)
    })

    const previewPlayers: SportdartsSyncPlayer[] = Array.from(new Set(usedNumbers)).map((number) => {
      const sportPlayer = sportByNumber.get(number)
      const lineupPlayer = localByNumber.get(number)
      const localPlayer = lineupPlayer || eligibleByNumber.get(number)
      const leg = legsByNumber.get(number)

      let issue: string | null = null
      if (!eligibilityChecked) {
        issue = "Die Abo-/Berechtigungsprüfung konnte nicht durchgeführt werden."
      } else if (!localPlayer) {
        issue = "Sportdarts-Spieler konnte über die Spielernummer keinem berechtigten EMD-Spieler zugeordnet werden."
      } else if (!eligiblePlayerIds.has(localPlayer.id)) {
        issue = "Spieler ist aktuell nicht für dieses Liga-Modul berechtigt."
      }

      return {
        sportdartsNumber: number,
        sportdartsName: sportPlayer?.playerName || sportPlayer?.player || `Sportdarts #${number}`,
        localPlayerId: localPlayer?.id || null,
        localPlayerName: localPlayer?.name || null,
        inConfirmedLineup: Boolean(lineupPlayer && lineupConfirmed),
        eligibleNow: eligibilityChecked && localPlayer ? eligiblePlayerIds.has(localPlayer.id) : null,
        singlesPlayed: Number(leg?.singlesPlayed || 0),
        legsWon: Number(leg?.legsWon || 0),
        legsLost: Number(leg?.legsLost || 0),
        checksMade: sportPlayer?.checksMade ?? null,
        checksTotal: sportPlayer?.checksTotal ?? null,
        issue,
      }
    })

    const hasOfficialScore =
      String(detail.homeScore ?? "").trim() !== "" &&
      String(detail.awayScore ?? "").trim() !== ""

    const hasUsedPlayers = previewPlayers.length > 0

    const blocked =
      !hasOfficialScore ||
      !hasUsedPlayers ||
      previewPlayers.some((player) => Boolean(player.issue))

    const blockReason = !hasOfficialScore
      ? "Sportdarts enthält noch keinen vollständigen offiziellen Endstand."
      : !hasUsedPlayers
        ? "Sportdarts enthält derzeit keine auswertbaren eingesetzten Spieler."
        : previewPlayers.find((player) => player.issue)?.issue || null

    setSportdartsSyncCandidates([])
    setSportdartsSyncPreview({
      gameId,
      ownSide,
      homeTeam: detail.homeTeam || "",
      awayTeam: detail.awayTeam || "",
      homeScore: String(detail.homeScore ?? ""),
      awayScore: String(detail.awayScore ?? ""),
      lineupConfirmed,
      eligibilityChecked,
      blocked,
      blockReason,
      players: previewPlayers,
    })
  } catch (error: any) {
    console.error("Sportdarts sync preview failed:", error)
    setSportdartsSyncError(error?.message || "Sportdarts-Vorschau konnte nicht geladen werden.")
  } finally {
    setSportdartsSyncLoading(false)
  }
}


const updateSportdartsExtraStat = (
  playerId: string,
  field: keyof SportdartsExtraStats,
  value: number,
) => {
  setSportdartsExtraStats((current) => ({
    ...current,
    [playerId]: {
      ...(current[playerId] || EMPTY_SPORTDARTS_EXTRA_STATS),
      [field]: Math.max(0, Number.isFinite(value) ? value : 0),
    },
  }))
}

const getSportdartsExtraStats = (playerId: string) =>
  sportdartsExtraStats[playerId] || EMPTY_SPORTDARTS_EXTRA_STATS

const openExtraStatsEditor = async (match: Match) => {
  setExtraStatsEditOpen(true)
  setExtraStatsEditLoading(true)
  setExtraStatsEditSaving(false)
  setExtraStatsEditError("")
  setExtraStatsEditMatch(match)
  setExtraStatsEditRows([])
  try {
    const [old, lineup, extras] = await Promise.all([
      supabase.from("leg_statistics")
        .select("*,player:club_players!leg_statistics_player_id_fkey(name)")
        .eq("match_id", match.id).order("created_at", { ascending: true }),
      supabase.from("match_lineups")
        .select("player_id,team_id,player:club_players!match_lineups_player_id_fkey(name)")
        .eq("match_id", match.id),
      supabase.from("match_player_extra_stats")
        .select("player_id,stats").eq("match_id", match.id),
    ])
    if (old.error) throw old.error
    if (lineup.error) throw lineup.error
    if (extras.error) throw extras.error
    const byPlayer = new Map<string, SportdartsExtraEditRow>()
    for (const record of (old.data || []) as any[]) {
      if (!record.player_id) continue
      byPlayer.set(record.player_id, {
        statId: record.id, playerId: record.player_id,
        playerName: record.player?.name || "Unbekannt",
        stats: Object.fromEntries(Object.keys(EMPTY_SPORTDARTS_EXTRA_STATS).map((key) => [key, Number(record[key] || 0)])) as SportdartsExtraStats,
      })
    }
    for (const record of (lineup.data || []) as any[]) {
      if (!record.player_id || byPlayer.has(record.player_id)) continue
      byPlayer.set(record.player_id, {
        statId: `new:${record.player_id}`, playerId: record.player_id,
        playerName: record.player?.name || "Unbekannt",
        stats: { ...EMPTY_SPORTDARTS_EXTRA_STATS },
      })
    }
    for (const record of (extras.data || []) as any[]) {
      const row = byPlayer.get(record.player_id)
      if (row && record.stats) row.stats = { ...row.stats, ...record.stats }
    }
    setExtraStatsEditRows(Array.from(byPlayer.values()))
    if (byPlayer.size === 0) setExtraStatsEditError("Keine Spieler für dieses Spiel gefunden. Bitte zuerst die Spieleraufstellung erfassen.")
  } catch (error: any) {
    setExtraStatsEditError(error?.message || "Zusatzstatistiken konnten nicht geladen werden.")
  } finally {
    setExtraStatsEditLoading(false)
  }
}

const updateExtraStatsEditValue = (
  statId: string,
  field: keyof SportdartsExtraStats,
  value: number,
) => {
  setExtraStatsEditRows((rows) =>
    rows.map((row) =>
      row.statId === statId
        ? {
            ...row,
            stats: {
              ...row.stats,
              [field]: Math.max(0, Number.isFinite(value) ? value : 0),
            },
          }
        : row,
    ),
  )
}

const saveExtraStatsEdits = async () => {
  if (!extraStatsEditMatch || extraStatsEditRows.length === 0) return

  setExtraStatsEditSaving(true)
  setExtraStatsEditError("")

  try {
    for (const row of extraStatsEditRows) {
      if (row.statId.startsWith("new:")) {
        // Independent statistics: do not invent Sportdarts legs or match results.
        if (!Object.values(row.stats).some((value) => value > 0)) continue
        const { error } = await supabase.rpc("save_match_player_extra_stats", {
          p_match_id: extraStatsEditMatch.id,
          p_player_id: row.playerId,
          p_stats: row.stats,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.from("leg_statistics")
          .update(row.stats)
          .eq("id", row.statId).eq("match_id", extraStatsEditMatch.id)
        if (error) throw error
      }
    }
    setMatchesWithExtraStats((prev) => ({
      ...prev,
      [extraStatsEditMatch.id]: extraStatsEditRows.some((row) => Object.values(row.stats).some((value) => value > 0)),
    }))

    await Promise.all([fetchLigaStatistics(), fetchLegStatistics()])

    toast({
      title: "Zusatzstatistik gespeichert",
      description: "Nur die EMD-Zusatzwerte wurden geändert. Ergebnis und Sportdarts-Legs bleiben unverändert.",
    })

    setExtraStatsEditOpen(false)
    setExtraStatsEditMatch(null)
    setExtraStatsEditRows([])
  } catch (error: any) {
    console.error("Error saving extra statistics:", error)
    setExtraStatsEditError(error?.message || "Zusatzstatistiken konnten nicht gespeichert werden.")
  } finally {
    setExtraStatsEditSaving(false)
  }
}

const submitSportdartsSync = async (mode: "apply" | "review") => {
  if (!sportdartsSyncMatch || !sportdartsSyncPreview) return

  setSportdartsSyncActionLoading(true)

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError

    const token = sessionData.session?.access_token
    if (!token) throw new Error("Sitzung abgelaufen. Bitte erneut anmelden.")

    const response = await fetch("/api/sportdarts/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        matchId: sportdartsSyncMatch.id,
        sportdartsGameId: Number(sportdartsSyncPreview.gameId),
        mode,
        extraStatsEnabled: sportdartsExtraEnabled,
        extraStats: sportdartsExtraEnabled
          ? sportdartsSyncPreview.players
              .filter((player) => Boolean(player.localPlayerId))
              .map((player) => ({
                player_id: player.localPlayerId,
                ...getSportdartsExtraStats(player.localPlayerId!),
              }))
          : [],
      }),
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(payload?.error || "Sportdarts-Synchronisation fehlgeschlagen.")
    }

    if (payload?.applied) {
      // Niemals nur der API-Antwort vertrauen: direkt nach dem Schreiben prüfen,
      // ob Ergebnis UND Spieler-Legstatistiken wirklich in Supabase vorhanden sind.
      const expectedPlayerIds = sportdartsSyncPreview.players
        .map((player) => player.localPlayerId)
        .filter((playerId): playerId is string => Boolean(playerId))

      const [{ data: verifiedMatch, error: verifyMatchError }, { data: verifiedStats, error: verifyStatsError }] =
        await Promise.all([
          supabase
            .from("matches")
            .select("id,home_score,away_score,status")
            .eq("id", sportdartsSyncMatch.id)
            .single(),
          expectedPlayerIds.length > 0
            ? supabase
                .from("leg_statistics")
                .select("player_id,player_legs_won,opponent_legs_won")
                .eq("match_id", sportdartsSyncMatch.id)
                .in("player_id", expectedPlayerIds)
            : Promise.resolve({ data: [], error: null } as any),
        ])

      if (verifyMatchError) throw verifyMatchError
      if (verifyStatsError) throw verifyStatsError

      const expectedHomeScore = Number(sportdartsSyncPreview.homeScore)
      const expectedAwayScore = Number(sportdartsSyncPreview.awayScore)
      const savedPlayerIds = new Set((verifiedStats || []).map((row: any) => row.player_id))
      const allPlayersSaved = expectedPlayerIds.every((playerId) => savedPlayerIds.has(playerId))
      const matchSaved =
        verifiedMatch?.status === "completed" &&
        Number(verifiedMatch?.home_score) === expectedHomeScore &&
        Number(verifiedMatch?.away_score) === expectedAwayScore

      if (!matchSaved || !allPlayersSaved) {
        throw new Error(
          "Die Übernahme wurde nicht vollständig in Supabase gespeichert. Bitte erneut versuchen oder den Fall prüfen.",
        )
      }

      toast({
        title: "Sportdarts erfolgreich gespeichert",
        description: `Endstand und Leg-Daten von ${expectedPlayerIds.length} Spielern wurden geprüft und gespeichert.`,
      })

      setSportdartsSyncOpen(false)
      setSportdartsSyncPreview(null)
      setSportdartsSyncCandidates([])
      setSportdartsSyncMatch(null)
      setSportdartsExtraEnabled(false)
      setSportdartsExtraOpenPlayers({})
      setSportdartsExtraStats({})
      await fetchMatches()
      await fetchLigaStatistics()
      await fetchLegStatistics()
      return
    }

    if (payload?.reviewCreated) {
      toast({
        title: "Zur Prüfung gespeichert",
        description: payload?.message || "Der Vorgang wurde für die Administration vorgemerkt.",
      })

      setSportdartsSyncOpen(false)
      setSportdartsSyncPreview(null)
      setSportdartsSyncCandidates([])
      setSportdartsSyncMatch(null)
      setSportdartsExtraEnabled(false)
      setSportdartsExtraOpenPlayers({})
      setSportdartsExtraStats({})
    }
  } catch (error: any) {
    toast({
      title: "Sportdarts",
      description: error?.message || "Synchronisation fehlgeschlagen.",
      variant: "destructive",
    })
  } finally {
    setSportdartsSyncActionLoading(false)
  }
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
  
  
  
  
  
  
  

if (authLoading || loading || membershipLoading) {
  return <div className="min-h-[1px]" aria-hidden="true" />
}







  if (error) {
    return (
      // Removed Header component for mobile
      <main className="min-h-screen overflow-x-hidden bg-transparent px-3 py-3 pb-24 text-white sm:px-5 sm:py-5">
        <Header
          variant="app"
          title="Spielplan"
          subtitle="Ligazentrale"
          backHref="/member-league-app"
        />
        {/* Changed py-6 to py-4 for mobile */}
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Fehler</h1>
            <p className="text-white/50 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-orange-500 shadow-[0_0_24px_rgba(249,115,22,.12)] hover:bg-orange-500/90">
              Erneut versuchen
            </Button>
          </div>
        </div>
      </main>
    )
  }

  if (!canSeeEDart && !canSeeSteeldart) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-transparent px-3 py-3 pb-24 text-white sm:px-5 sm:py-5">
        <Header
          variant="app"
          title="Spielplan"
          subtitle="Ligazentrale"
          backHref="/member-league-app"
        />

        <div className="mx-auto mt-8 max-w-xl">
          <Card className="overflow-hidden rounded-[24px] border border-orange-300/15 bg-black/35 text-white shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-2xl hover:text-white focus-visible:text-white">
            <CardContent className="p-6 text-center sm:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-300/15 bg-orange-500/[0.08] shadow-[0_0_24px_rgba(249,115,22,.08)]">
                <ShieldCheck className="h-7 w-7 text-orange-300" />
              </div>

              <h1 className="mt-4 text-xl font-black text-white">
                Kein Liga-Paket gebucht
              </h1>

              <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-white/50">
                Für diesen Bereich benötigst du mindestens eines der Liga-Module:
                E-Dart oder Steeldart.
              </p>

              <Button
                type="button"
                onClick={() => router.push("/member-membership")}
                className="mt-5 rounded-xl bg-orange-600 font-black text-white hover:bg-orange-700"
              >
                Paket buchen
              </Button>
            </CardContent>
          </Card>
        </div>

        <MobileBottomNav />
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
          title="Spielplan"
          subtitle="Ligazentrale"
          backHref="/member-league-app"
        />

    <div className="pointer-events-none fixed inset-0 -z-10 bg-[#050608]">
      <div
        className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.66),rgba(3,5,9,.93)_44%,rgba(2,4,7,.99))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_7%_18%,rgba(249,115,22,.18),transparent_28%),radial-gradient(circle_at_90%_26%,rgba(14,165,233,.10),transparent_29%)]" />
    </div>

   <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] bg-transparent px-3 pb-24 pt-14 text-white sm:px-5 sm:pt-16 lg:px-7 lg:pb-12 xl:px-8">
      <DashboardTutorial role={getUserRole()} />

      <section className="relative mt-2 overflow-hidden rounded-[26px] border border-white/[0.09] bg-black/35 shadow-[0_32px_110px_-52px_rgba(0,0,0,.98)] backdrop-blur-2xl sm:mt-4 sm:rounded-[30px] xl:rounded-[32px]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-72 rounded-full bg-white/5 blur-3xl" />

        <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60 hover:text-white focus-visible:text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                Liga
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.08] text-orange-300 shadow-[0_0_24px_rgba(249,115,22,.09)] sm:h-14 sm:w-14">
                  <Target className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/50">Deine Teams auf einen Blick</p>
                  <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                    Liga-Dashboard
                  </h1>
                </div>
              </div>

              <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-white/55 sm:text-base">
                Spielplan, Ergebnisse und wichtige Änderungen für deine Teams.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:min-w-[430px]">
              <div className="relative overflow-hidden rounded-2xl border border-orange-300/[0.10] bg-white/[0.05] p-3 shadow-[0_0_24px_rgba(249,115,22,.055)] backdrop-blur-sm sm:border-white/10 sm:bg-white/[0.055] sm:shadow-none sm:p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-[10px]">Kommende</div>
                <div className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {getUpcomingMatches().length}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-orange-300/[0.10] bg-white/[0.05] p-3 shadow-[0_0_24px_rgba(249,115,22,.055)] backdrop-blur-sm sm:border-white/10 sm:bg-white/[0.055] sm:shadow-none sm:p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-[10px]">Verschoben</div>
                <div className="mt-2 text-2xl font-black tracking-tight text-orange-300 sm:text-3xl">
                  {getPostponedMatches().length}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-orange-300/[0.10] bg-white/[0.05] p-3 shadow-[0_0_24px_rgba(249,115,22,.055)] backdrop-blur-sm sm:border-white/10 sm:bg-white/[0.055] sm:shadow-none sm:p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-[10px]">Beendet</div>
                <div className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {getCompletedMatches().length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
		
		
		
		
		

        {getPostponedMatches().length > 0 && (
  <div className="mt-4 mb-4 sm:mt-5 sm:mb-5">
    <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/30 text-white shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:rounded-[28px] hover:text-white focus-visible:text-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950 px-4 py-4 sm:px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
          <CalendarX className="h-5 w-5 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-white text-sm font-extrabold">Verschobene Spiele</div>
            <span className="inline-flex items-center justify-center rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white hover:text-white focus-visible:text-white">
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
              className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-orange-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-white">
                    {homeName} <span className="text-white/30">vs</span> {awayName}
                  </div>

                  <div className="mt-1 grid gap-1 text-xs">
                    {oldDate ? (
                      <div className="flex items-center gap-2 text-white/40">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-lg bg-white border border-slate-200">
                          <X className="h-3 w-3 text-red-500" />
                        </span>
                        <span className="line-through">{oldDate}</span>
                      </div>
                    ) : null}

                    <div className="flex items-center gap-2 text-white/75">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-lg bg-white border border-slate-200">
                        <Check className="h-3 w-3 text-green-600" />
                      </span>
                      <span className="font-semibold">
                        {newDate}{newTime ? ` · ${newTime} Uhr` : ""}
                      </span>
                    </div>

                    {match.postponement_reason ? (
                      <div className="mt-2 rounded-xl border border-orange-200 bg-white px-3 py-2 text-[11px] text-white/65">
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
          <div className="pt-1 text-center text-xs text-white/40">
            ... und {getPostponedMatches().length - 3} weitere
          </div>
        ) : null}
      </div>
    </div>
  </div>
)}

        <div className="mb-4 sm:mb-6 lg:mb-8">
          {/* Teams Section */}
          <div className="mb-6 sm:mb-8 lg:mb-10">
            {/* Main Content */}
            <div className="min-w-0 space-y-5 sm:space-y-6">
              {/* Spielplan Section with Tabs */}
              <Card className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-black/30 text-white shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:rounded-[30px] hover:text-white focus-visible:text-white">
                <CardHeader className="border-b border-white/[0.07] px-4 py-5 sm:px-6 sm:py-6 lg:px-7">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.08] shadow-[0_0_18px_rgba(249,115,22,.07)]">
                        <Calendar className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30 sm:text-xs">
                          Saison
                        </div>
                        <CardTitle className="mt-0.5 text-xl font-black tracking-tight text-white sm:text-2xl">
                          Spielplan meiner Teams
                        </CardTitle>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-3 py-4 sm:px-6 sm:py-6 lg:px-7">
                  <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/20 p-2.5 sm:p-3">
        {canSeeEDart ? (
          <Badge variant="outline" className="rounded-full border-white/[0.10] bg-white/[0.035] px-3 py-1 font-bold text-white/65 shadow-none">
            E-Dart freigeschaltet
          </Badge>
        ) : null}

        {canSeeSteeldart ? (
          <Badge variant="outline" className="rounded-full border-white/[0.10] bg-white/[0.035] px-3 py-1 font-bold text-white/65 shadow-none">
            Steeldart freigeschaltet
          </Badge>
        ) : null}

        {canSeeEDart && !canSeeSteeldart ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/member-membership")}
            className="rounded-full border-orange-300/20 bg-orange-500/[0.08] px-3 font-bold text-orange-200 hover:bg-orange-500/[0.14]"
          >
            Steeldart dazubuchen
          </Button>
        ) : null}

        {canSeeSteeldart && !canSeeEDart ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/member-membership")}
            className="rounded-full border-orange-300/20 bg-orange-500/[0.08] px-3 font-bold text-orange-200 hover:bg-orange-500/[0.14]"
          >
            E-Dart dazubuchen
          </Button>
        ) : null}
      </div>

      <Tabs
                    value={activeMatchTab}
                    onValueChange={(value) => setActiveMatchTab(value as "upcoming" | "completed" | "postponed")}
                    className="w-full"
                  >
                   <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-1.5 shadow-none backdrop-blur-xl">
  <TabsTrigger
    value="upcoming"
    className="h-10 min-w-0 rounded-xl px-1.5 text-[10px] font-black text-white/40 shadow-none sm:px-3 sm:text-xs
      data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_22px_rgba(249,115,22,.14)]"
  >
    Kommende
    <span className="ml-1 text-[10px] opacity-70">
      ({getUpcomingMatches().length})
    </span>
  </TabsTrigger>

  <TabsTrigger
    value="postponed"
    className="h-10 min-w-0 rounded-xl px-1.5 text-[10px] font-black text-white/40 shadow-none sm:px-3 sm:text-xs
      data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_22px_rgba(249,115,22,.14)]"
  >
    Verschoben
    <span className="ml-1 text-[10px] opacity-70">
      ({getPostponedMatches().length})
    </span>
  </TabsTrigger>

  <TabsTrigger
    value="completed"
    className="h-10 min-w-0 rounded-xl px-1.5 text-[10px] font-black text-white/40 shadow-none sm:px-3 sm:text-xs
      data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_22px_rgba(249,115,22,.14)]"
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
<div className="rounded-[22px] border border-dashed border-white/[0.10] bg-white/[0.025] p-8 text-center text-white sm:p-10 hover:text-white focus-visible:text-white">
<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
<Calendar className="h-6 w-6 text-orange-600" />
</div>
<p className="font-semibold text-white">Keine kommenden Spiele gefunden.</p>
<p className="text-sm text-white/40 mt-1">Sobald Spiele geplant sind, erscheinen sie hier.</p>
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
    let statusClasses = "border-orange-300/20 bg-orange-500/[0.08] text-orange-800"
    let barClass = "bg-orange-500"

    if (isPostponed) {
      statusLabel = "Verschoben"
      statusClasses = "border-amber-300/20 bg-amber-500/[0.08] text-amber-900"
      barClass = "bg-amber-500"
    } else if (isCompleted) {
      statusLabel = "Beendet"
      statusClasses = "border-slate-200 bg-white/[0.05] text-white/65"
      barClass = "bg-gray-300"
    }

    return (
      <div
        key={match.id}
        className={[
          "bg-white/[0.035] text-white border border-orange-300/[0.10] shadow-[0_0_26px_rgba(249,115,22,.05)] sm:border-white/[0.08] sm:shadow-none hover:border-white/[0.12] hover:bg-white/[0.045] transition-colors duration-200 active:scale-[0.994]",
          "rounded-[20px] p-3.5 sm:rounded-[24px] sm:p-5",
          isPostponed ? "border-amber-200" : "border-slate-200/80",
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
                  <Badge variant="outline" className="rounded-full border-white/[0.08] bg-white/[0.035] px-2.5 font-mono text-white/55 hover:text-white focus-visible:text-white">
                    Woche {match.week_number}
                  </Badge>

                  {match.match_format ? (
                    <Badge variant="outline" className="rounded-full border-white/[0.08] bg-white/[0.035] px-2.5 text-xs font-bold text-white/55 hover:text-white focus-visible:text-white">
                      {match.match_format === "team"
                        ? "Team (2er)"
                        : match.match_format === "best_of_three"
                          ? "1v1 (BoF3)"
                          : match.match_format === "individual"
                            ? "1v1"
                            : "Standard"}
                    </Badge>
                  ) : null}

                  <Badge variant="outline" className="rounded-full border-white/[0.08] bg-white/[0.035] px-2.5 text-xs font-bold text-white/55 hover:text-white focus-visible:text-white">
                    {match.dart_type === "edart" ? "E-Dart" : "Steeldart"}
                  </Badge>

                  <Badge className={["text-[11px] border px-2 py-0.5 font-semibold", statusClasses].join(" ")}>
                    {statusLabel}
                  </Badge>
                </div>

                {/* desktop meta */}
                <div className="hidden sm:flex items-center gap-2 text-sm text-white/55">
                  <span className="font-semibold text-white/75">{dateText}</span>
                  {timeText ? <span className="text-white/40">· {timeText} Uhr</span> : null}
                  {match.original_date ? (
                    <span className="text-[11px] text-white/30">
                      Urspr.: <span className="line-through">{formatMatchDate(match.original_date)}</span>
                    </span>
                  ) : null}
                </div>
              </div>

              {/* teams + score */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 sm:gap-4 items-center">
                {/* home */}
                <div className="min-w-0 text-center sm:text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Heim</div>
                  <div className="mt-1 break-words text-[15px] font-black leading-snug text-white sm:text-base">
                    {homeName}
                  </div>
                </div>

                {/* score */}
                <div className="flex items-center justify-center">
                  <div className="min-w-[112px] rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-center shadow-sm sm:min-w-[128px] sm:px-5">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-black tracking-tight text-white">{match.home_score ?? "-"}</span>
                      <span className="text-white/40">:</span>
                      <span className="text-2xl font-black tracking-tight text-white">{match.away_score ?? "-"}</span>
                    </div>
                  </div>
                </div>

                {/* away */}
                <div className="min-w-0 text-center sm:text-left">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Gast</div>
                  <div className="mt-1 break-words text-[15px] font-black leading-snug text-white sm:text-base">
                    {awayName}
                  </div>
                </div>
              </div>

              {/* mobile meta */}
              <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs text-white/55 sm:hidden hover:text-white focus-visible:text-white">
                <div className="font-black text-white/75">
                  {dateText}{timeText ? ` · ${timeText} Uhr` : ""}
                </div>
                {match.original_date ? (
                  <div className="text-[10px] text-white/30">
                    Urspr.: <span className="line-through">{formatMatchDate(match.original_date)}</span>
                  </div>
                ) : null}
              </div>

              {/* venue */}
              <div className="flex items-start gap-2 text-sm text-white/55">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-500" />
                <div className="min-w-0">
                  <div className="break-words font-semibold text-white/65">{match.venue}</div>
                  <OpponentLokalInfo match={match} />
                </div>
              </div>

              {/* postponed info */}
              {isPostponed && match.original_date ? (
                <div className="rounded-2xl border border-amber-300/20 bg-amber-500/[0.08] p-3">
                  <div className="text-[11px] font-semibold text-amber-900">
                    Verschoben: ursprünglich am {formatMatchDate(match.original_date)}
                    {match.postponement_reason ? ` · Grund: ${match.postponement_reason}` : ""}
                  </div>
                </div>
              ) : null}

              {/* actions */}
              {canEdit ? (
                <div className="pt-3 border-t border-slate-200/70">
                  <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-2.5">
                    <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
                      {/* Primary (Orange) */}
                      {/* Statistik läuft bei Sportdarts über "Sportdarts prüfen" */}

                      {/* Live (neutral) */}
                      {/* Live-Eingabe vorerst ausgeblendet */}

                      {/* Ergebnis (neutral) */}
                      {/* Ergebnis läuft bei Sportdarts über "Sportdarts prüfen" */}


                      {getOwnTeamIdForMatch(match) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void loadSportdartsSyncPreview(match)}
                          className="col-span-2 h-11 rounded-xl border-sky-300/30 bg-sky-500/[0.12] font-black text-sky-100 shadow-[0_0_22px_rgba(14,165,233,.10)] transition hover:border-sky-300/45 hover:bg-sky-500/[0.18] hover:text-white sm:col-span-3"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Sportdarts prüfen
                        </Button>
                      ) : null}

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
                        className="h-10 rounded-xl border-white/[0.12] bg-white/[0.035] font-bold text-white/75 shadow-none hover:border-orange-300/20 hover:bg-white/[0.06] hover:text-white focus-visible:text-white"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {match.team_photo_url ? "Teamfoto" : "Foto"}
                      </Button>

                      {/* Verschieben (orange soft, full width) */}
                     {/* Verschieben (orange soft, full width) */}
<Button
  size="sm"
  variant="outline"
  className="col-span-2 h-10 rounded-xl border-orange-300/25 bg-orange-500/[0.10] font-bold text-orange-200 shadow-none transition hover:border-orange-300/45 hover:bg-orange-500/[0.18] hover:text-white focus-visible:text-white sm:col-span-2"
  onClick={() => {
    router.push(`/matches/${match.id}/postpone?back=/member-league-app/spielplan&backLabel=Spielplan`)
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
    <div className="rounded-[22px] border border-dashed border-white/[0.10] bg-white/[0.025] p-8 text-center text-white sm:p-10 hover:text-white focus-visible:text-white">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
        <Calendar className="h-6 w-6 text-orange-600" />
      </div>
      <p className="font-semibold text-white">Keine verschobenen Spiele gefunden.</p>
      <p className="text-sm text-white/40 mt-1">Wenn Spiele verschoben werden, erscheinen sie hier.</p>
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
              "bg-white/[0.035] text-white border border-orange-300/[0.10] shadow-[0_0_26px_rgba(249,115,22,.05)] sm:border-white/[0.08] sm:shadow-none hover:border-white/[0.12] hover:bg-white/[0.045] transition-colors duration-200 active:scale-[0.994]",
              "rounded-[20px] p-3.5 sm:rounded-[24px] sm:p-5",
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
                      <Badge variant="outline" className="rounded-full border-white/[0.08] bg-white/[0.035] px-2.5 font-mono text-white/55 hover:text-white focus-visible:text-white">
                        Woche {match.week_number}
                      </Badge>

                      {match.match_format ? (
                        <Badge variant="outline" className="rounded-full border-white/[0.08] bg-white/[0.035] px-2.5 text-xs font-bold text-white/55 hover:text-white focus-visible:text-white">
                          {match.match_format === "team"
                            ? "Team (2er)"
                            : match.match_format === "best_of_three"
                              ? "1v1 (BoF3)"
                              : match.match_format === "individual"
                                ? "1v1"
                                : "Standard"}
                        </Badge>
                      ) : null}

                      <Badge variant="outline" className="rounded-full border-white/[0.08] bg-white/[0.035] px-2.5 text-xs font-bold text-white/55 hover:text-white focus-visible:text-white">
                        {match.dart_type === "edart" ? "E-Dart" : "Steeldart"}
                      </Badge>

                      <Badge className="text-[11px] border px-2 py-0.5 font-semibold border-orange-300/20 bg-orange-500/[0.08] text-orange-800">
                        Verschoben
                      </Badge>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-sm text-white/55">
                      <span className="font-semibold text-white/75">{dateText}</span>
                      {timeText ? <span className="text-white/40">· {timeText} Uhr</span> : null}
                    </div>
                  </div>

                  {/* teams + score */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 sm:gap-4 items-center">
                    {/* home */}
                    <div className="min-w-0 text-center sm:text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Heim</div>
                      <div className="mt-1 break-words text-[15px] font-black leading-snug text-white sm:text-base">
                        {homeName}
                      </div>
                    </div>

                    {/* score */}
                    <div className="flex items-center justify-center">
                      <div className="min-w-[112px] rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-center shadow-sm sm:min-w-[128px] sm:px-5">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl font-black tracking-tight text-white">{match.home_score ?? "-"}</span>
                          <span className="text-white/40">:</span>
                          <span className="text-2xl font-black tracking-tight text-white">{match.away_score ?? "-"}</span>
                        </div>
                      </div>
                    </div>

                    {/* away */}
                    <div className="min-w-0 text-center sm:text-left">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Gast</div>
                      <div className="mt-1 break-words text-[15px] font-black leading-snug text-white sm:text-base">
                        {awayName}
                      </div>
                    </div>
                  </div>

                  {/* mobile meta */}
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs text-white/55 sm:hidden hover:text-white focus-visible:text-white">
                    <div className="font-black text-white/75">
                      {dateText}{timeText ? ` · ${timeText} Uhr` : ""}
                    </div>
                    {match.original_date ? (
                      <div className="text-[10px] text-white/30">
                        Urspr.: <span className="line-through">{formatMatchDate(match.original_date)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* original date + reason (nice orange box) */}
                  {match.original_date ? (
                    <div className="rounded-2xl border border-orange-300/20 bg-orange-500/[0.08] p-3">
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
                  <div className="flex items-start gap-2 text-sm text-white/55">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-500" />
                    <div className="min-w-0">
                      <div className="break-words font-semibold text-white/65">{match.venue}</div>
                      <OpponentLokalInfo match={match} />
                    </div>
                  </div>

                  {/* actions */}
                  {canEdit ? (
                    <div className="pt-3 border-t border-slate-200/70">
                      <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-2.5">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {/* Statistik (Primary orange) */}
                          {/* Statistik läuft bei Sportdarts über "Sportdarts prüfen" */}

                          {/* Ergebnis */}
                          {/* Ergebnis läuft bei Sportdarts über "Sportdarts prüfen" */}


                          {getOwnTeamIdForMatch(match) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void loadSportdartsSyncPreview(match)}
                              className="col-span-2 h-11 rounded-xl border-sky-300/30 bg-sky-500/[0.12] font-black text-sky-100 shadow-[0_0_22px_rgba(14,165,233,.10)] transition hover:border-sky-300/45 hover:bg-sky-500/[0.18] hover:text-white sm:col-span-3"
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Sportdarts prüfen
                            </Button>
                          ) : null}

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
                            className="h-10 rounded-xl border-white/[0.12] bg-white/[0.035] font-bold text-white/75 shadow-none hover:border-orange-300/20 hover:bg-white/[0.06] hover:text-white focus-visible:text-white"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            {match.team_photo_url ? "Teamfoto" : "Foto"}
                          </Button>

                          {/* Neu planen (wide) */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="col-span-2 h-10 rounded-xl border-orange-300/20 bg-orange-500/[0.08] font-bold text-orange-700 shadow-none hover:bg-orange-100 sm:col-span-2"
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
                            className="h-10 rounded-xl border-red-200 bg-white font-bold text-red-700 shadow-none hover:bg-red-50"
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
    <div className="rounded-[22px] border border-dashed border-white/[0.10] bg-white/[0.025] p-8 text-center text-white sm:p-10 hover:text-white focus-visible:text-white">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
        <Calendar className="h-6 w-6 text-orange-600" />
      </div>
      <p className="font-semibold text-white">Keine abgeschlossenen Spiele gefunden.</p>
      <p className="mt-1 text-sm text-white/40">Sobald Ergebnisse eingetragen sind, erscheinen sie hier.</p>
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
        let badgeClass = "border-white/[0.08] bg-white/[0.035] text-white/65"

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
          badgeClass = "border-orange-300/20 bg-orange-500/[0.08] text-orange-800"
        }

        return (
          <div
            key={match.id}
            className={[
              "bg-white/[0.035] text-white border border-orange-300/[0.10] shadow-[0_0_26px_rgba(249,115,22,.05)] sm:border-white/[0.08] sm:shadow-none hover:border-white/[0.12] hover:bg-white/[0.045] transition-colors duration-200 active:scale-[0.994]",
              "rounded-[20px] p-3.5 sm:rounded-[24px] sm:p-5",
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
                      <Badge variant="outline" className="rounded-full border-white/[0.08] bg-white/[0.035] px-2.5 font-mono text-white/55 hover:text-white focus-visible:text-white">
                        Woche {match.week_number}
                      </Badge>

                      {match.match_format ? (
                        <Badge variant="outline" className="rounded-full border-white/[0.08] bg-white/[0.035] px-2.5 text-xs font-bold text-white/55 hover:text-white focus-visible:text-white">
                          {match.match_format === "team"
                            ? "Team (2er)"
                            : match.match_format === "best_of_three"
                              ? "1v1 (BoF3)"
                              : match.match_format === "individual"
                                ? "1v1"
                                : "Standard"}
                        </Badge>
                      ) : null}

                      <Badge variant="outline" className="rounded-full border-white/[0.08] bg-white/[0.035] px-2.5 text-xs font-bold text-white/55 hover:text-white focus-visible:text-white">
                        {match.dart_type === "edart" ? "E-Dart" : "Steeldart"}
                      </Badge>

                      <Badge className={["text-[11px] border px-2 py-0.5 font-semibold", badgeClass].join(" ")}>
                        {resultLabel}
                      </Badge>
                    </div>

                    {/* desktop meta */}
                    <div className="hidden items-center gap-2 text-sm text-white/55 sm:flex">
                      <span className="font-semibold text-white/75">{dateText}</span>
                      {timeText ? <span className="text-white/40">· {timeText} Uhr</span> : null}
                    </div>
                  </div>

                  {/* teams + score */}
                  <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
                    {/* home */}
                    <div className="min-w-0 text-center sm:text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Heim</div>
                      <div className="mt-1 break-words text-[15px] font-black leading-snug text-white sm:text-base">{homeName}</div>
                      <div className="mt-1 text-[11px] text-white/40">
                        {match.home_team_type === "own" ? "Heim" : "Heim (Gegner)"}
                      </div>
                    </div>

                    {/* score */}
                    <div className="flex items-center justify-center">
                      <div className="min-w-[112px] rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-center shadow-sm sm:min-w-[128px] sm:px-5">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl font-black tracking-tight text-white">{match.home_score ?? "-"}</span>
                          <span className="text-white/40">:</span>
                          <span className="text-2xl font-black tracking-tight text-white">{match.away_score ?? "-"}</span>
                        </div>
                      </div>
                    </div>

                    {/* away */}
                    <div className="min-w-0 text-center sm:text-left">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Gast</div>
                      <div className="mt-1 break-words text-[15px] font-black leading-snug text-white sm:text-base">{awayName}</div>
                      <div className="mt-1 text-[11px] text-white/40">
                        {match.away_team_type === "own" ? "Auswärts" : "Auswärts (Gegner)"}
                      </div>
                    </div>
                  </div>

                  {/* mobile meta */}
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs text-white/55 sm:hidden hover:text-white focus-visible:text-white">
                    <div className="font-black text-white/75">
                      {dateText}
                      {timeText ? ` · ${timeText} Uhr` : ""}
                    </div>
                  </div>

                  {/* venue (OHNE Gegner-Lokal / Ort / Telefon / Route / WhatsApp) */}
                  <div className="flex items-start gap-2 text-sm text-white/55">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
                    <div className="min-w-0">
                      <div className="break-words font-semibold text-white/65">{match.venue}</div>
                    </div>
                  </div>

                  {/* actions */}
                  {canEdit ? (
                    <div className="border-t border-slate-200/70 pt-3">
                      <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-2.5">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {/* Statistik läuft bei Sportdarts über "Sportdarts prüfen" */}

                          {/* Ergebnis läuft bei Sportdarts über "Sportdarts prüfen" */}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void openExtraStatsEditor(match)}
                            className="h-10 rounded-xl border-orange-300/25 bg-orange-500/[0.10] font-black text-orange-100 shadow-none hover:border-orange-300/45 hover:bg-orange-500/[0.16] hover:text-white"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            {matchesWithExtraStats[match.id] ? "Statistik bearbeiten" : "Statistik anlegen"}
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
                            className="h-10 rounded-xl border-white/[0.12] bg-white/[0.035] font-bold text-white/75 shadow-none hover:border-orange-300/20 hover:bg-white/[0.06] hover:text-white focus-visible:text-white"
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
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.5)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950">
        <Check className="h-5 w-5 text-white" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-bold text-white">Spiel verschoben</div>
        <div className="text-xs text-white/40">Änderungen gespeichert</div>
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
  <DialogContent className="w-[94vw] max-w-sm overflow-hidden rounded-[26px] border border-white/[0.10] bg-[#070a0f]/95 p-0 text-white shadow-[0_30px_120px_-45px_rgba(0,0,0,.98)] backdrop-blur-2xl">
    
    {/* Header klein */}
    <div className="border-b border-slate-800 bg-slate-950 px-4 py-4">
      <DialogTitle className="text-white text-sm font-bold">
        Ergebnis eintragen
      </DialogTitle>
    </div>

    {/* Body kompakt */}
    <div className="px-4 py-4 space-y-4">

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">

        {/* Heim */}
        <div className="text-center space-y-2">
          <div className="text-[11px] font-semibold text-white/40 truncate">
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

            <div className="min-w-[44px] text-xl font-extrabold text-white">
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

        <div className="text-xl font-bold text-white/25">:</div>

        {/* Auswärts */}
        <div className="text-center space-y-2">
         <div className="text-[11px] font-semibold text-white/40 truncate">
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

            <div className="min-w-[44px] text-xl font-extrabold text-white">
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
        className="h-10 rounded-xl bg-orange-500 font-bold text-white shadow-[0_0_24px_rgba(249,115,22,.12)] hover:bg-orange-500/90 active:scale-[0.99]"
        onClick={async () => {
          if (!selectedMatchForResults) return

          const saved = await updateMatchScore(
            selectedMatchForResults,
            editMatchScores.home,
            editMatchScores.away
          )

          if (saved) {
            setIsResultsDialogOpen(false)
            setSelectedMatchForResults(null)
          }
        }}
      >
        Speichern
      </Button>
    </div>
  </DialogContent>
</Dialog>
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  

      {/* EMD-Zusatzstatistik nachträglich bearbeiten */}
      <Dialog
        open={extraStatsEditOpen}
        onOpenChange={(open) => {
          setExtraStatsEditOpen(open)
          if (!open) {
            setExtraStatsEditError("")
            setExtraStatsEditMatch(null)
            setExtraStatsEditRows([])
          }
        }}
      >
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-y-auto rounded-[28px] border border-white/[0.10] bg-[#070a0f]/98 p-0 text-white shadow-[0_35px_130px_-45px_rgba(0,0,0,.98)] backdrop-blur-2xl">
          <DialogHeader className="border-b border-white/[0.08] px-4 py-4 text-left sm:px-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-300/20 bg-orange-500/[0.10] text-orange-200">
                <Edit className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-black text-white sm:text-lg">
                  {extraStatsEditMatch && matchesWithExtraStats[extraStatsEditMatch.id] ? "Statistik bearbeiten" : "Statistik anlegen"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs font-semibold text-white/45 sm:text-sm">
                  Nur 180er, 171er, High Tonne, Tonne, Shanghai, 95+, Bull, 15–20er, Unter 26/30 und Semperit erfassen oder ändern. Ergebnis und Sportdarts-Legs bleiben unangetastet.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 p-4 sm:p-5">
            {extraStatsEditMatch ? (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm font-bold text-white/65">
                {getTeamDisplayNameHelper(extraStatsEditMatch, true)} <span className="text-white/30">vs.</span>{" "}
                {getTeamName(extraStatsEditMatch, false) || "Unbekannt"}
                <span className="ml-2 text-white/30">· {formatMatchDate(extraStatsEditMatch.match_date)}</span>
              </div>
            ) : null}

            {extraStatsEditLoading ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-orange-300" />
                <div className="text-sm font-bold text-white/65">Gespeicherte Zusatzstatistiken werden geladen…</div>
              </div>
            ) : extraStatsEditError ? (
              <div className="rounded-2xl border border-red-400/25 bg-red-500/[0.08] p-4 text-sm font-semibold text-red-100">
                {extraStatsEditError}
              </div>
            ) : (
              <div className="space-y-3">
                {extraStatsEditRows.map((row) => {
                  const fields: Array<{ key: keyof SportdartsExtraStats; label: string }> = [
                    { key: "throws_180", label: "180er" },
                    { key: "throws_171", label: "171er" },
                    { key: "throws_high_tonne", label: "High Tonne" },
                    { key: "throws_tonne", label: "Tonne" },
                    { key: "throws_shanghai", label: "Shanghai" },
                    { key: "throws_95_plus", label: "95+" },
                    { key: "throws_bull", label: "Bull" },
                    { key: "throws_15", label: "15er" },
                    { key: "throws_16", label: "16er" },
                    { key: "throws_17", label: "17er" },
                    { key: "throws_18", label: "18er" },
                    { key: "throws_19", label: "19er" },
                    { key: "throws_20", label: "20er" },
                    { key: "throws_under_26", label: "Unter 26" },
                    { key: "throws_under_30", label: "Unter 30" },
                    { key: "semperit_outs", label: "Semperit" },
                  ]

                  return (
                    <div key={row.statId} className="rounded-2xl border border-white/[0.08] bg-black/20 p-3.5">
                      <div className="mb-3 text-sm font-black text-white">{row.playerName}</div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {fields.map((field) => (
                          <label key={field.key} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5">
                            <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-white/40">
                              {field.label}
                            </span>
                            <div className="mt-2 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateExtraStatsEditValue(row.statId, field.key, row.stats[field.key] - 1)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/30 text-white/60 transition hover:border-orange-300/25 hover:bg-orange-500/[0.10] hover:text-white"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={row.stats[field.key]}
                                onChange={(event) =>
                                  updateExtraStatsEditValue(
                                    row.statId,
                                    field.key,
                                    Number.parseInt(event.target.value || "0", 10) || 0,
                                  )
                                }
                                className="h-8 min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-[#070a0f] px-1 text-center text-sm font-black text-white outline-none focus:border-orange-300/35"
                              />
                              <button
                                type="button"
                                onClick={() => updateExtraStatsEditValue(row.statId, field.key, row.stats[field.key] + 1)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/30 text-white/60 transition hover:border-orange-300/25 hover:bg-orange-500/[0.10] hover:text-white"
                              >
                                +
                              </button>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-white/[0.08] px-4 py-4 sm:px-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExtraStatsEditOpen(false)}
              disabled={extraStatsEditSaving}
              className="rounded-xl border-white/[0.10] bg-white/[0.035] font-bold text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={() => void saveExtraStatsEdits()}
              disabled={extraStatsEditSaving || extraStatsEditLoading || extraStatsEditRows.length === 0}
              className="rounded-xl bg-orange-500 font-black text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {extraStatsEditSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Zusatzstatistik speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sportdarts Sync – sichere Vorschau, schreibt bewusst NICHTS */}
      <Dialog
        open={sportdartsSyncOpen}
        onOpenChange={(open) => {
          setSportdartsSyncOpen(open)
          if (!open) {
            setSportdartsSyncError("")
            setSportdartsSyncPreview(null)
            setSportdartsSyncCandidates([])
            setSportdartsSyncMatch(null)
            setSportdartsExtraEnabled(false)
            setSportdartsExtraOpenPlayers({})
            setSportdartsExtraStats({})
          }
        }}
      >
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto rounded-[28px] border border-white/[0.10] bg-[#070a0f]/98 p-0 text-white shadow-[0_35px_130px_-45px_rgba(0,0,0,.98)] backdrop-blur-2xl">
          <DialogHeader className="border-b border-white/[0.08] px-4 py-4 text-left sm:px-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-500/[0.10] text-sky-200">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-black text-white sm:text-lg">
                  Sportdarts-Prüfung
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs font-semibold text-white/45 sm:text-sm">
                  Sichere Vorschau. Es werden noch keine Ergebnisse oder Statistiken gespeichert.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 p-4 sm:p-5">
            {sportdartsSyncLoading ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-orange-300" />
                <div className="text-sm font-bold text-white/70">Sportdarts und Aufstellung werden geprüft…</div>
              </div>
            ) : sportdartsSyncCandidates.length > 0 && !sportdartsSyncPreview ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-amber-300/20 bg-amber-500/[0.08] p-4">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
                    <div>
                      <div className="font-black text-white">
                        Sportdarts-Spiel auswählen
                      </div>
                      <div className="mt-1 text-sm font-semibold leading-5 text-white/55">
                        Das EMD-Spiel wurde manuell angelegt. Deshalb wurde keine feste Sportdarts-ID gespeichert.
                        Bitte wähle das passende offizielle Spiel. Es wird weiterhin nichts gespeichert.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {sportdartsSyncCandidates.map((candidate) => (
                    <button
                      key={candidate.gameId}
                      type="button"
                      onClick={() => {
                        if (sportdartsSyncMatch) {
                          void loadSportdartsSyncPreview(sportdartsSyncMatch, candidate.gameId)
                        }
                      }}
                      className="w-full rounded-2xl border border-white/[0.09] bg-white/[0.035] p-4 text-left transition hover:border-orange-300/30 hover:bg-orange-500/[0.08]"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-white">
                            {candidate.homeTeam} <span className="text-white/35">vs.</span> {candidate.awayTeam}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-white/40">
                            {candidate.date.split("-").reverse().join(".")} · Spieltag {candidate.weekNumber} · Sportdarts #{candidate.gameId}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {candidate.homeScore != null && candidate.awayScore != null ? (
                            <div className="rounded-xl border border-orange-300/20 bg-orange-500/[0.10] px-3 py-1.5 text-sm font-black text-orange-100">
                              {candidate.homeScore}:{candidate.awayScore}
                            </div>
                          ) : null}
                          <ChevronRight className="h-5 w-5 text-orange-200" />
                        </div>
                      </div>

                      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/30">
                        {candidate.confidence === "exact"
                          ? "Datum + Heim/Gast + Gegner stimmen"
                          : "Datum + eigenes Team stimmen · bitte Gegner prüfen"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : sportdartsSyncError ? (
              <div className="rounded-2xl border border-red-400/25 bg-red-500/[0.08] p-4">
                <div className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                  <div>
                    <div className="font-black text-red-100">Prüfung nicht möglich</div>
                    <div className="mt-1 text-sm font-semibold leading-5 text-red-100/70">
                      {sportdartsSyncError}
                    </div>
                  </div>
                </div>
              </div>
            ) : sportdartsSyncPreview ? (
              <>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Heim</div>
                    <div className="mt-1 text-sm font-black text-white">{sportdartsSyncPreview.homeTeam || "—"}</div>
                  </div>
                  <div className="rounded-2xl border border-orange-300/20 bg-orange-500/[0.10] px-4 py-3 text-center">
                    <div className="text-2xl font-black text-orange-100">
                      {sportdartsSyncPreview.homeScore || "–"} : {sportdartsSyncPreview.awayScore || "–"}
                    </div>
                    <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-orange-200/60">
                      Sportdarts
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Gast</div>
                    <div className="mt-1 text-sm font-black text-white">{sportdartsSyncPreview.awayTeam || "—"}</div>
                  </div>
                </div>

                <div
                  className={[
                    "rounded-2xl border p-4",
                    sportdartsSyncPreview.blocked
                      ? "border-red-400/25 bg-red-500/[0.08]"
                      : "border-emerald-400/25 bg-emerald-500/[0.08]",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-2.5">
                    {sportdartsSyncPreview.blocked ? (
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                    ) : (
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                    )}
                    <div>
                      <div className="font-black text-white">
                        {sportdartsSyncPreview.blocked
                          ? sportdartsSyncPreview.players.length === 0 ||
                            !sportdartsSyncPreview.homeScore ||
                            !sportdartsSyncPreview.awayScore
                            ? "Noch keine verwertbaren Sportdarts-Daten"
                            : "Prüfung erforderlich – Übernahme gesperrt"
                          : "Sportdarts-Zuordnung und Berechtigung stimmen"}
                      </div>
                      <div className="mt-1 text-sm font-semibold leading-5 text-white/55">
                        {sportdartsSyncPreview.blocked
                          ? sportdartsSyncPreview.blockReason || "Mindestens ein eingesetzter Spieler muss geprüft werden."
                          : "Alle bei Sportdarts tatsächlich eingesetzten Spieler konnten einem berechtigten EMD-Spieler zugeordnet werden. Die Vorab-Aufstellung blockiert die Übernahme nicht mehr."}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-white/40">
                      Eingesetzte Spieler
                    </div>
                    <div className="text-[10px] font-bold text-white/30">
                      Sportdarts-Spiel {sportdartsSyncPreview.gameId}
                    </div>
                  </div>

                  {sportdartsSyncPreview.players.length === 0 ? (
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-500/[0.08] p-4 text-sm font-semibold text-amber-100/75">
                      Sportdarts enthält derzeit keine auswertbaren eingesetzten Spieler.
                    </div>
                  ) : (
                    sportdartsSyncPreview.players.map((player) => (
                      <div
                        key={player.sportdartsNumber}
                        className={[
                          "rounded-2xl border p-3.5",
                          player.issue
                            ? "border-red-400/20 bg-red-500/[0.055]"
                            : "border-white/[0.08] bg-white/[0.03]",
                        ].join(" ")}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {player.issue ? (
                                <XCircle className="h-4 w-4 shrink-0 text-red-300" />
                              ) : (
                                <Check className="h-4 w-4 shrink-0 text-emerald-300" />
                              )}
                              <div className="truncate text-sm font-black text-white">
                                {player.localPlayerName || player.sportdartsName}
                              </div>
                            </div>
                            <div className="mt-1 text-[11px] font-semibold text-white/40">
                              Sportdarts-Nr. {player.sportdartsNumber}
                              {player.localPlayerName && player.localPlayerName !== player.sportdartsName
                                ? ` · Sportdarts: ${player.sportdartsName}`
                                : ""}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 sm:min-w-[260px]">
                            <div className="rounded-xl border border-white/[0.07] bg-black/20 px-2 py-2 text-center">
                              <div className="text-[9px] font-black uppercase text-white/30">Spiele</div>
                              <div className="mt-0.5 text-sm font-black text-white">{player.singlesPlayed}</div>
                            </div>
                            <div className="rounded-xl border border-white/[0.07] bg-black/20 px-2 py-2 text-center">
                              <div className="text-[9px] font-black uppercase text-white/30">Legs</div>
                              <div className="mt-0.5 text-sm font-black text-white">
                                {player.legsWon}:{player.legsLost}
                              </div>
                            </div>
                            <div className="rounded-xl border border-white/[0.07] bg-black/20 px-2 py-2 text-center">
                              <div className="text-[9px] font-black uppercase text-white/30">Checks</div>
                              <div className="mt-0.5 text-sm font-black text-white">
                                {player.checksMade != null && player.checksTotal != null
                                  ? `${player.checksMade}/${player.checksTotal}`
                                  : "–"}
                              </div>
                            </div>
                          </div>
                        </div>

                        {player.issue ? (
                          <div className="mt-3 rounded-xl border border-red-400/15 bg-black/20 px-3 py-2 text-xs font-bold leading-5 text-red-100/75">
                            {player.issue}
                          </div>
                        ) : (
                          <div className="mt-3 text-[11px] font-bold text-emerald-200/70">
                            ✓ bestätigte Aufstellung · ✓ Liga-Berechtigung
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {!sportdartsSyncPreview.blocked ? (
                  <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.025]">
                    <button
                      type="button"
                      onClick={() => setSportdartsExtraEnabled((value) => !value)}
                      className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-white/[0.035]"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white">
                          Zusätzliche EMD-Statistiken erfassen
                        </div>
                        <div className="mt-1 text-xs font-semibold leading-5 text-white/40">
                          Optional. Nur aktivieren, wenn eure Mannschaft die erweiterten Statistiken für dieses Spiel erfassen möchte.
                        </div>
                      </div>
                      <div
                        className={[
                          "relative h-7 w-12 shrink-0 rounded-full border transition",
                          sportdartsExtraEnabled
                            ? "border-emerald-300/30 bg-emerald-500/30"
                            : "border-white/[0.10] bg-black/30",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "absolute top-1 h-5 w-5 rounded-full transition",
                            sportdartsExtraEnabled
                              ? "left-6 bg-emerald-200"
                              : "left-1 bg-white/45",
                          ].join(" ")}
                        />
                      </div>
                    </button>

                    {sportdartsExtraEnabled ? (
                      <div className="space-y-2 border-t border-white/[0.07] p-3 sm:p-4">
                        {sportdartsSyncPreview.players
                          .filter((player) => Boolean(player.localPlayerId))
                          .map((player) => {
                            const playerId = player.localPlayerId!
                            const values = getSportdartsExtraStats(playerId)
                            const isOpen = Boolean(sportdartsExtraOpenPlayers[playerId])

                            const fields: Array<{
                              key: keyof SportdartsExtraStats
                              label: string
                            }> = [
                              { key: "throws_180", label: "180er" },
                              { key: "throws_171", label: "171er" },
                              { key: "throws_high_tonne", label: "High Tonne" },
                              { key: "throws_tonne", label: "Tonne" },
                              { key: "throws_shanghai", label: "Shanghai" },
                              { key: "throws_95_plus", label: "95+" },
                              { key: "throws_bull", label: "Bull" },
                              { key: "throws_15", label: "15er" },
                              { key: "throws_16", label: "16er" },
                              { key: "throws_17", label: "17er" },
                              { key: "throws_18", label: "18er" },
                              { key: "throws_19", label: "19er" },
                              { key: "throws_20", label: "20er" },
                              { key: "throws_under_26", label: "Unter 26" },
                              { key: "throws_under_30", label: "Unter 30" },
                              { key: "semperit_outs", label: "Semperit" },
                            ]

                            return (
                              <div
                                key={playerId}
                                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSportdartsExtraOpenPlayers((current) => ({
                                      ...current,
                                      [playerId]: !current[playerId],
                                    }))
                                  }
                                  className="flex w-full items-center justify-between gap-3 p-3.5 text-left transition hover:bg-white/[0.035]"
                                >
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-black text-white">
                                      {player.localPlayerName || player.sportdartsName}
                                    </div>
                                    <div className="mt-0.5 text-[11px] font-semibold text-white/35">
                                      Legs {player.legsWon}:{player.legsLost} werden automatisch übernommen
                                    </div>
                                  </div>
                                  <ChevronDown
                                    className={[
                                      "h-5 w-5 shrink-0 text-orange-200 transition-transform",
                                      isOpen ? "rotate-180" : "",
                                    ].join(" ")}
                                  />
                                </button>

                                {isOpen ? (
                                  <div className="border-t border-white/[0.07] p-3.5">
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                      {fields.map((field) => (
                                        <label
                                          key={field.key}
                                          className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5"
                                        >
                                          <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-white/40">
                                            {field.label}
                                          </span>
                                          <div className="mt-2 flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateSportdartsExtraStat(
                                                  playerId,
                                                  field.key,
                                                  Math.max(0, values[field.key] - 1),
                                                )
                                              }
                                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/30 text-white/60 transition hover:border-orange-300/25 hover:bg-orange-500/[0.10] hover:text-white"
                                            >
                                              −
                                            </button>
                                            <input
                                              type="number"
                                              min={0}
                                              value={values[field.key]}
                                              onChange={(event) =>
                                                updateSportdartsExtraStat(
                                                  playerId,
                                                  field.key,
                                                  Number.parseInt(event.target.value || "0", 10) || 0,
                                                )
                                              }
                                              className="h-8 min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-[#070a0f] px-1 text-center text-sm font-black text-white outline-none focus:border-orange-300/35"
                                            />
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateSportdartsExtraStat(
                                                  playerId,
                                                  field.key,
                                                  values[field.key] + 1,
                                                )
                                              }
                                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/30 text-white/60 transition hover:border-orange-300/25 hover:bg-orange-500/[0.10] hover:text-white"
                                            >
                                              +
                                            </button>
                                          </div>
                                        </label>
                                      ))}
                                    </div>

                                    <div className="mt-3 text-[10px] font-semibold leading-4 text-white/30">
                                      Nur diese Zusatzwerte werden ergänzt. Sportdarts-Legs und der Endstand bleiben die offiziellen Werte.
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-2xl border border-sky-300/15 bg-sky-500/[0.06] p-3 text-xs font-semibold leading-5 text-sky-100/65">
                  {sportdartsExtraEnabled
                    ? "Übernommen werden der offizielle Endstand, Legs gewonnen/verloren und die von euch freiwillig eingetragenen EMD-Zusatzstatistiken."
                    : "Übernommen werden ausschließlich der offizielle Endstand sowie Legs gewonnen/verloren. Eure zusätzlichen EMD-Statistiken bleiben unverändert."}
                </div>

                {sportdartsSyncPreview.blocked ? (
                  sportdartsSyncPreview.players.length === 0 ||
                  !sportdartsSyncPreview.homeScore ||
                  !sportdartsSyncPreview.awayScore ? (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        disabled
                        className="h-11 w-full cursor-not-allowed rounded-xl border border-white/[0.08] bg-white/[0.04] font-black text-white/30 shadow-none"
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Noch keine Sportdarts-Daten verfügbar
                      </Button>
                      <div className="text-center text-[10px] font-semibold leading-4 text-white/35">
                        Die Übernahme wird erst freigeschaltet, sobald Sportdarts einen vollständigen Endstand und eingesetzte Spieler liefert.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={sportdartsSyncActionLoading}
                        onClick={() => void submitSportdartsSync("review")}
                        className="h-11 w-full rounded-xl border-amber-300/30 bg-amber-500/[0.10] font-black text-amber-100 hover:border-amber-300/50 hover:bg-amber-500/[0.16] hover:text-white disabled:opacity-50"
                      >
                        {sportdartsSyncActionLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <AlertTriangle className="mr-2 h-4 w-4" />
                        )}
                        Zur Admin-Prüfung senden
                      </Button>
                      <div className="text-center text-[10px] font-semibold leading-4 text-white/35">
                        Der Fall wird gespeichert. Die Admin-Oberfläche für Freigabe oder Korrektur bauen wir als nächsten Schritt.
                      </div>
                    </div>
                  )
                ) : (
                  <Button
                    type="button"
                    disabled={sportdartsSyncActionLoading}
                    onClick={() => void submitSportdartsSync("apply")}
                    className="h-12 w-full rounded-xl bg-emerald-500 font-black text-[#03120b] shadow-[0_0_24px_rgba(16,185,129,.16)] transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {sportdartsSyncActionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    Offizielle Sportdarts-Daten übernehmen
                  </Button>
                )}
              </>
            ) : null}
          </div>

          <DialogFooter className="border-t border-white/[0.08] px-4 py-4 sm:px-5">
            <Button
              type="button"
              onClick={() => setSportdartsSyncOpen(false)}
              className="h-10 w-full rounded-xl bg-orange-500 font-black text-white hover:bg-orange-500/90 sm:w-auto"
            >
              Schließen
            </Button>
          </DialogFooter>
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
  <DialogContent className="w-[94vw] max-w-md overflow-hidden rounded-[26px] border border-white/[0.10] bg-[#070a0f]/95 p-0 text-white shadow-[0_30px_120px_-45px_rgba(0,0,0,.98)] backdrop-blur-2xl">

  {(() => {
    const currentMatch = matches.find((m) => m.id === selectedMatchForTeamPhoto)
    const hasExistingPhoto = Boolean(currentMatch?.team_photo_url)

    return (
      <>
        {/* Header – dezentes Orange */}
        <div className="border-b border-slate-800 bg-slate-950 px-4 py-4">
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
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035]">
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
              className="h-10 rounded-xl border-white/[0.10] bg-white/[0.04] font-bold text-white/75 hover:border-orange-300/20 hover:bg-white/[0.06] hover:text-white focus-visible:text-white"
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
              className="h-10 rounded-xl border-white/[0.10] bg-white/[0.04] font-bold text-white/75 hover:border-orange-300/20 hover:bg-white/[0.06] hover:text-white focus-visible:text-white"
            >
              Galerie
            </Button>
          </div>

          {teamPhotoMessage && (
            <Alert className="rounded-xl border-orange-300/20 bg-orange-500/[0.08]">
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
            className="h-10 rounded-xl bg-orange-500 font-bold text-white shadow-[0_0_24px_rgba(249,115,22,.12)] hover:bg-orange-500/90 active:scale-[0.99]"
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