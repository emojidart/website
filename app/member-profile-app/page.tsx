"use client"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Calendar,
  MessageCircle,
  BarChart3,
  Users,
  Crown,
  ShieldCheck,
  Target,
  Trophy,
  ArrowRight,
  Settings,
  LogOut,
  Camera,
  Upload,
  Euro,
  Table,
  HelpCircle,
  Inbox,
  AlertTriangle,
  Bell,
  CheckCircle,
  Dumbbell,
} from "lucide-react"
import type { UserProfile, TeamMembership, Match, Notification } from "@/types"

export default function MemberProfileAppPage() {
  const { session, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoMessage, setPhotoMessage] = useState("")
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false)
  const [statistics, setStatistics] = useState({
    totalWins: 0,
    totalLegs: 0,
    winPercentage: 0,
    total180s: 0,
    totalEvents: 0,
  })
  const [pendingMatches, setPendingMatches] = useState<Match[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])

  // PWA installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)

  // PWA installation effect
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
    }

    const handleAppInstalled = () => {
      setShowInstallButton(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstallButton(false)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  // PWA installation handler
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("Installation nicht verfügbar. Auf iOS: Teilen-Menü → Zum Home-Bildschirm hinzufügen")
      return
    }

    deferredPrompt.prompt()

    const { outcome } = await deferredPrompt.userChoice

    setDeferredPrompt(null)
    setShowInstallButton(false)
  }

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user) {
      fetchProfile()
    }
  }, [session])

  const fetchNotifications = async (playerId: string) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_player_id", playerId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })

      if (error) throw error

      const enrichedNotifications = await Promise.all(
        (data || []).map(async (notification) => {
          if (notification.statistics_entry_id) {
            const { data: legData } = await supabase
              .from("leg_statistics")
              .select(`match_id, leg_number, player_legs_won, opponent_legs_won, player_id`)
              .eq("id", notification.statistics_entry_id)
              .single()

            if (legData) {
              const { data: matchData } = await supabase
                .from("matches")
                .select(
                  `match_date, home_team_type, away_team_type, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name), home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(name), away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(name)`,
                )
                .eq("id", legData.match_id)
                .single()

              const { data: playerData } = await supabase
                .from("club_players")
                .select("name")
                .eq("id", legData.player_id)
                .single()

              return {
                ...notification,
                leg_statistics: legData,
                match: matchData,
                player: playerData,
              }
            }
          }
          return notification
        }),
      )

      setNotifications(enrichedNotifications)
    } catch (err) {
      console.error("Error fetching notifications:", err)
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)

      if (error) throw error

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  const fetchProfile = async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      setError(null)

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select(`id, user_id, player_id, club_players (id, name, photo_url, throwing_hand, age, origin)`)
        .eq("user_id", session.user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      setProfile(profileData)

      if (profileData?.player_id) {
        await fetchNotifications(profileData.player_id)

        const { data: teamData, error: teamError } = await supabase
          .from("team_members")
          .select(`id, team_id, role, teams (id, name, logo_url)`)
          .eq("player_id", profileData.player_id)

        if (teamError) {
          throw teamError
        }

        setTeamMemberships(teamData || [])

        if (teamData && teamData.length > 0) {
          const teamIds = teamData.map((t) => t.team_id)
          const today = new Date().toISOString().split("T")[0]

          const [matchesResponse, opponentTeamsResponse] = await Promise.all([
            supabase
              .from("matches")
              .select(`*,
                home_team:teams!matches_home_team_id_fkey(id, name),
                away_team:teams!matches_away_team_id_fkey(id, name),
                home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
                away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name),
                season:seasons(id, name, type)
              `)
              .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`)
              .lt("match_date", today)
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

          if (enrichedMatches) {
            const openMatches = enrichedMatches.filter((match) => {
              const homeScore = match.home_score
              const awayScore = match.away_score

              return (
                homeScore === null ||
                awayScore === null ||
                (homeScore === 0 && awayScore === 0) ||
                match.status !== "completed"
              )
            })

            setPendingMatches(openMatches)
          }
        }

        const { data: legStats, error: legStatsError } = await supabase
          .from("leg_statistics")
          .select(`leg_wins, player_legs_won, opponent_legs_won, throws_180, throws_171`)
          .eq("player_id", profileData.player_id)

        if (!legStatsError && legStats) {
          const totalWins = legStats.reduce((sum, stat) => sum + (stat.leg_wins || 0), 0)
          const totalLegs = legStats.reduce((sum, stat) => {
            const actualLegs = (stat.player_legs_won || 0) + (stat.opponent_legs_won || 0)
            return sum + (actualLegs > 0 ? actualLegs : 1)
          }, 0)
          const total180s = legStats.reduce((sum, stat) => sum + (stat.throws_180 || 0), 0)
          const winPercentage = totalLegs > 0 ? (totalWins / totalLegs) * 100 : 0

          const { data: matchData } = await supabase
            .from("matches")
            .select("id")
            .or(
              `home_team_id.in.(${teamMemberships?.map((t) => t.team_id).join(",")}),away_team_id.in.(${teamMemberships?.map((t) => t.team_id).join(",")})`,
            )

          setStatistics({
            totalWins,
            totalLegs,
            winPercentage: Math.round(winPercentage),
            total180s,
            totalEvents: matchData?.length || 0,
          })
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
    await supabase.auth.signOut()
    router.push("/")
  }

  const handlePhotoUpload = async () => {
    if (!photoFile || !profile?.club_players?.id) return

    setPhotoUploading(true)
    setPhotoMessage("")

    try {
      const fileExtension = photoFile.name.split(".").pop()
      const sanitizedPlayerName = profile.club_players.name.replace(/[^a-zA-Z0-9_.-]/g, "").replace(/\s/g, "_")
      const filePath = `player-avatars/${sanitizedPlayerName}-${Date.now()}.${fileExtension}`

      const { error: uploadError } = await supabase.storage.from("player-avatars").upload(filePath, photoFile, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        throw uploadError
      }

      const { data: publicUrlData } = supabase.storage.from("player-avatars").getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from("club_players")
        .update({ photo_url: publicUrlData.publicUrl })
        .eq("id", profile.club_players.id)

      if (updateError) {
        throw updateError
      }

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

  const handlePhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case "Captain":
        return <Crown className="h-5 w-5 text-yellow-600" />
      case "Co-Captain":
        return <ShieldCheck className="h-5 w-5 text-blue-600" />
      default:
        return <Target className="h-5 w-5 text-orange-600" />
    }
  }

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case "Captain":
        return "Kapitän"
      case "Co-Captain":
        return "Co-Kapitän"
      default:
        return "Spieler"
    }
  }

  const navigationItems = [
    {
      title: "Dashboard",
      description: "Statistiken, Teams und Verwaltung",
      icon: BarChart3,
      href: "/member-dashboard-app",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Meine Teams",
      description: "Teams und Teammitglieder verwalten",
      icon: Users,
      href: "/meine-teams-app",
      color: "from-teal-500 to-teal-600",
    },
    {
      title: "Spieler Statistiken",
      description: "Detaillierte Leistungsanalyse",
      icon: BarChart3,
      href: "/member-statistics-app",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      title: "Training",
      description: "Trainingsübungen und Fortschritt",
      icon: Dumbbell,
      href: "/training-app",
      color: "from-orange-500 to-red-600",
    },
    {
      title: "Lobby",
      description: "Spiele gegen andere Spieler",
      icon: Target,
      href: "/lobby-app",
      color: "from-pink-500 to-pink-600",
    },
    {
      title: "Match Galerie",
      description: "Match-Galerie und Spielfotos",
      icon: Camera,
      href: "/match-galerie-app",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Bonusgeld",
      description: "Bonuspunkte und Belohnungen",
      icon: Euro,
      href: "/member-bonus-app",
      color: "from-yellow-500 to-yellow-600",
    },
    {
      title: "Liga Tabellen",
      description: "Aktuelle Ligastände",
      icon: Table,
      href: "/member-league-app",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Vereinskalender",
      description: "Termine und Events verwalten",
      icon: Calendar,
      href: "/vereinskalender-app",
      color: "from-green-500 to-green-600",
    },
    {
      title: "Feed",
      description: "Poste, kommentiere und bleib verbunden",
      icon: MessageCircle,
      href: "/community-app",
      color: "from-orange-500 to-red-600",
    },
    {
      title: "Team Chat",
      description: "Kommunikation mit dem Team",
      icon: MessageCircle,
      href: "/chat-app",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Support",
      description: "Hilfe und Support-Anfragen",
      icon: HelpCircle,
      href: "/support-app",
      color: "from-red-500 to-red-600",
    },
  ]

  const formatMatchDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  }

  const getTeamDisplayName = (match: Match, isHome: boolean) => {
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

  const isLeadershipRole = () => {
    return teamMemberships.some((membership) => membership.role === "Captain" || membership.role === "Co-Captain")
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{error || "Profil nicht gefunden"}</h1>
            <Button onClick={() => router.push("/member-login")}>Zur Anmeldung</Button>
          </div>
        </main>
      </div>
    )
  }

  const primaryTeam = teamMemberships[0]
  const hasMultipleTeams = teamMemberships.length > 1

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8 max-w-6xl">
        {showInstallButton && (
          <Card className="mb-6 sm:mb-8 border-0 shadow-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                    <svg
                      className="h-5 w-5 sm:h-6 sm:w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-grow w-full">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                    App auf deinem Gerät installieren
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                    Installiere die EMD-App auf deinem Handy oder PC für schnellen Zugriff und ein besseres Erlebnis!
                  </p>
                  <Button
                    onClick={handleInstallClick}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg text-sm sm:text-base"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Jetzt installieren
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {notifications.length > 0 && (
          <Card className="mb-6 sm:mb-8 border-0 shadow-xl bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-l-red-500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg">
                    <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
                <div className="flex-grow w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">Admin-Benachrichtigungen</h3>
                    </div>
                    <Badge className="bg-red-500 text-white w-fit">{notifications.length}</Badge>
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                    Du hast {notifications.length} neue{" "}
                    {notifications.length === 1 ? "Benachrichtigung" : "Benachrichtigungen"} vom Admin bezüglich
                    fehlerhafter Statistik-Einträge.
                  </p>
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex flex-col bg-white/70 rounded-lg p-3 border border-red-200 gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 mb-1">{notification.message}</p>
                            {notification.match && (
                              <div className="text-xs text-gray-700 font-medium mb-1">
                                {notification.match.home_team_type === "own" && notification.match.home_team?.name
                                  ? notification.match.home_team.name
                                  : notification.match.home_opponent_team?.name || "Unbekannt"}{" "}
                                vs{" "}
                                {notification.match.away_team_type === "own" && notification.match.away_team?.name
                                  ? notification.match.away_team.name
                                  : notification.match.away_opponent_team?.name || "Unbekannt"}
                                {" - "}
                                {formatMatchDate(notification.match.match_date)}
                              </div>
                            )}
                            {notification.player && (
                              <div className="text-xs text-gray-600 mb-1">
                                Spieler: <span className="font-medium">{notification.player.name}</span>
                              </div>
                            )}
                            {notification.leg_statistics && (
                              <div className="text-xs text-gray-600">
                                Leg {notification.leg_statistics.leg_number} - Ergebnis:{" "}
                                {notification.leg_statistics.player_legs_won}:
                                {notification.leg_statistics.opponent_legs_won}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              Gemeldet am: {formatMatchDate(notification.created_at)}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markNotificationAsRead(notification.id)}
                            className="flex-shrink-0 h-8 w-8 p-0"
                            title="Als gelesen markieren"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {pendingMatches.length > 0 && isLeadershipRole() && (
          <Card className="mb-6 sm:mb-8 border-0 shadow-xl bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-l-yellow-500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg">
                    <Inbox className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
                <div className="flex-grow w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">Offene Spielergebnisse</h3>
                    </div>
                    <Badge className="bg-yellow-500 text-white w-fit">{pendingMatches.length}</Badge>
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                    Du hast {pendingMatches.length} vergangene {pendingMatches.length === 1 ? "Spiel" : "Spiele"}, für{" "}
                    {pendingMatches.length === 1 ? "das" : "die"} noch kein Ergebnis eingetragen wurde.
                  </p>
                  <div className="space-y-2 mb-3 sm:mb-4">
                    {pendingMatches.slice(0, 3).map((match) => (
                      <div
                        key={match.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white/70 rounded-lg p-3 border border-yellow-200 gap-2"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <Calendar className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                          <span className="font-medium text-xs sm:text-sm truncate">
                            {getTeamDisplayName(match, true)} vs {getTeamDisplayName(match, false)}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700 w-fit">
                          {formatMatchDate(match.match_date)}
                        </Badge>
                      </div>
                    ))}
                    {pendingMatches.length > 3 && (
                      <div className="text-xs sm:text-sm text-gray-600 text-center py-2">
                        ... und {pendingMatches.length - 3} weitere
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => router.push("/member-dashboard-app")}
                    className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg text-sm sm:text-base"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Ergebnisse eintragen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl mb-4 sm:mb-6 shadow-xl">
            <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Willkommen!</h1>
          <p className="text-lg sm:text-xl text-gray-600 px-4">
            Schön dich zu sehen, {profile.club_players?.name || "Vereinsmitglied"}
          </p>
        </div>

        <Card className="mb-6 sm:mb-8 border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6">
              <div className="relative">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-orange-200">
                  <AvatarImage
                    src={
                      profile.club_players?.photo_url || "/placeholder.svg?height=96&width=96&query=dart player avatar"
                    }
                    alt={profile.club_players?.name || "Spieler"}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xl sm:text-2xl font-bold">
                    {(profile.club_players?.name || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 rounded-full w-7 h-7 sm:w-8 sm:h-8 p-0 bg-white shadow-lg"
                  onClick={() => setIsPhotoDialogOpen(true)}
                >
                  <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>

              <div className="flex-grow text-center md:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {profile.club_players?.name || "Vereinsmitglied"}
                </h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <Badge variant="secondary" className="flex items-center gap-2 px-2 sm:px-3 py-1 text-xs sm:text-sm">
                    {getRoleIcon(primaryTeam?.role)}
                    {getRoleLabel(primaryTeam?.role)}
                  </Badge>
                  {primaryTeam?.teams && (
                    <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
                      {primaryTeam.teams.name}
                      {hasMultipleTeams && ` (+${teamMemberships.length - 1} weitere)`}
                    </Badge>
                  )}
                  {profile.club_players?.age && (
                    <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
                      {profile.club_players.age} Jahre
                    </Badge>
                  )}
                </div>
                {hasMultipleTeams && (
                  <div className="mb-2">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Alle Teams:</p>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {teamMemberships.map((membership) => (
                        <Badge key={membership.id} variant="outline" className="text-xs">
                          {membership.teams?.name} ({getRoleLabel(membership.role)})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.club_players?.origin && (
                  <p className="text-sm sm:text-base text-gray-600 mb-2">Herkunft: {profile.club_players.origin}</p>
                )}
                {profile.club_players?.throwing_hand && (
                  <p className="text-sm sm:text-base text-gray-600">
                    Wurfhand: {profile.club_players.throwing_hand === "right" ? "Rechts" : "Links"}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-transparent text-xs sm:text-sm"
                >
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                  Einstellungen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent text-xs sm:text-sm"
                >
                  <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                  Abmelden
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {navigationItems.map((item, index) => (
            <Card
              key={index}
              className="border-0 shadow-xl bg-white/95 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 cursor-pointer group"
              onClick={() => router.push(item.href)}
            >
              <CardContent className="p-4 sm:p-6">
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br ${item.color} rounded-2xl mb-3 sm:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <item.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">{item.description}</p>
                <div className="flex items-center text-orange-600 font-semibold group-hover:text-orange-700 transition-colors text-sm sm:text-base">
                  <span>Öffnen</span>
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{statistics.totalWins}</div>
              <div className="text-xs sm:text-sm text-gray-600">Siege</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{statistics.winPercentage}%</div>
              <div className="text-xs sm:text-sm text-gray-600">Siegquote</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{statistics.totalLegs}</div>
              <div className="text-xs sm:text-sm text-gray-600">Legs gespielt</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mx-auto mb-2" />
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{statistics.totalEvents}</div>
              <div className="text-xs sm:text-sm text-gray-600">Events</div>
            </CardContent>
          </Card>
        </div>
      </main>

      {isPhotoDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Profilfoto hochladen</h3>

            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="w-full p-2 border rounded"
                />
              </div>

              {photoPreview && (
                <div className="text-center">
                  <img
                    src={photoPreview || "/placeholder.svg"}
                    alt="Vorschau"
                    className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-orange-200"
                  />
                </div>
              )}

              {photoMessage && (
                <p className={`text-sm ${photoMessage.includes("Fehler") ? "text-red-600" : "text-green-600"}`}>
                  {photoMessage}
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPhotoDialogOpen(false)
                    setPhotoFile(null)
                    setPhotoPreview(null)
                    setPhotoMessage("")
                  }}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handlePhotoUpload}
                  disabled={!photoFile || photoUploading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {photoUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Hochladen...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </div>
  )
}
