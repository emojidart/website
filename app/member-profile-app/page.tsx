"use client"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useDues } from "@/hooks/vereinsverwaltung/useDues"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  BarChart3,
  Users,
  Crown,
  ShieldCheck,
  Target,
  Trophy,
  ArrowRight,
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

type UserProfileWithLastSeen = UserProfile & { last_seen_at?: string | null }

type UserPagePermission = { page_key: string; allowed: boolean }

const formatDate = (date: string | Date) => {
  if (!date) return ""
  const d = new Date(date)
  return d.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const formatTime = (time: string) => {
  if (!time) return ""
  const [h, m] = time.split(":")
  if (!h || !m) return time
  return `${h}:${m}`
}

const getMatchStartDateTime = (match: any): Date | null => {
  const dateStr = match?.match_date
  if (!dateStr) return null
  const timeStr = match?.match_time

  // If match_time includes seconds, Date can still parse it.
  if (timeStr) return new Date(`${dateStr}T${timeStr}`)
  return new Date(`${dateStr}T00:00:00`)
}

const formatCountdown = (target: Date) => {
  const diffMs = target.getTime() - Date.now()
  if (diffMs <= 0) return "Startet jetzt"

  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const hh = String(hours).padStart(2, "0")
  const mm = String(minutes).padStart(2, "0")
  const ss = String(seconds).padStart(2, "0")

  return days > 0 ? `${days}T ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`
}

export default function MemberProfileAppPage() {
const CHAT_SCOPE: "team" | "captains" | "club" = "team"

  const { session, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfileWithLastSeen | null>(null)
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userPagePermissions, setUserPagePermissions] = useState<UserPagePermission[]>([])
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

  const clubPlayersForDues = useMemo(() => {
    if (!profile?.club_players) return []
    return [profile.club_players as any]
  }, [profile])

  const { summaryRows: duesSummaryRows } = useDues(session?.user ?? null, clubPlayersForDues as any, () => {})

  const myDues = useMemo(() => {
    const pid = profile?.club_players?.id
    if (!pid) return null
    return duesSummaryRows.find((r) => r.player_id === pid) ?? null
  }, [duesSummaryRows, profile])

  const [pendingMatches, setPendingMatches] = useState<Match[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [nextMatchSummary, setNextMatchSummary] = useState<null | {
    match: Match
    teamId: string
    counts: { yes: number; maybe: number; no: number; none: number }
    myStatus: "none" | "yes" | "maybe" | "no"
    myLineup: "none" | "starter" | "substitute"
  }>(null)
  const [countdown, setCountdown] = useState<string>("")

  // Ungelesene Team-Chat Nachrichten (Badge/Box)
  const [chatRooms, setChatRooms] = useState<Array<{ id: string; name: string }>>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})



  // Countdown for the next match (updates every second)
  useEffect(() => {
    const target = nextMatchSummary ? getMatchStartDateTime(nextMatchSummary.match as any) : null
    if (!target) {
      setCountdown("")
      return
    }


    const updateCountdown = () => setCountdown(formatCountdown(target))
    updateCountdown()
    const id = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(id)
  }, [nextMatchSummary])


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

  // Team-Räume aus deinen Team-Mitgliedschaften ableiten (Team-ID = Room-ID)
  useEffect(() => {
    const rooms =
      (teamMemberships || [])
        .map((m) => ({ id: m.team_id, name: m.teams?.name || "Team-Chat" }))
        .filter((r) => !!r.id)

    setChatRooms(rooms)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMemberships?.length])

  // Ungelesene Nachrichten laden (sobald Profil + Rooms da sind)
  useEffect(() => {
    if (!profile?.id) return
    if (chatRooms.length === 0) return
    fetchUnreadCounts(chatRooms)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, chatRooms?.length])

  useEffect(() => {
    if (!profile?.id) return

    const channel = supabase
      .channel("realtime-chat-unread")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        () => {
          fetchUnreadCounts(chatRooms)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, chatRooms])

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

  const fetchUnreadCounts = async (roomsOverride?: Array<{ id: string; name: string }>) => {
    const rooms = roomsOverride ?? chatRooms
    if (!profile?.id || rooms.length === 0) return

    try {
      const counts: Record<string, number> = {}

      for (const room of rooms) {
        const { data: visitData, error: visitError } = await supabase
  .from("user_room_visits")
  .select("last_visit_at")
  .eq("user_id", profile.id)
  .eq("room_id", room.id)
  .eq("scope", CHAT_SCOPE)
  .maybeSingle()


        // Tabelle evtl. noch nicht vorhanden -> dann einfach 0 anzeigen
        if (visitError && (visitError as any).code === "42P01") {
          counts[room.id] = 0
          continue
        }

        const lastVisit = (visitData as any)?.last_visit_at || "1970-01-01T00:00:00Z"

        const { count, error: countError } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .gt("created_at", lastVisit)
          .neq("user_id", profile.id)

        if (countError) counts[room.id] = 0
        else counts[room.id] = count || 0
      }

      setUnreadCounts(counts)
    } catch (error) {
      console.error("Error fetching unread counts:", error)
    }
  }

  const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + (n || 0), 0)

  type AvailabilityStatus = "yes" | "maybe" | "no"
  const statusLabel = (s: "none" | AvailabilityStatus) => {
    if (s === "yes") return "Ja"
    if (s === "maybe") return "Nur wenn Not am Mann"
    if (s === "no") return "Nein"
      return "Keine Antwort"
  }
  const statusBadge = (s: "none" | AvailabilityStatus) => {
    if (s === "yes") return <Badge className="bg-green-600 text-white">Ja</Badge>
    if (s === "maybe") return <Badge className="bg-yellow-600 text-white">Nur wenn Not am Mann</Badge>
    if (s === "no") return <Badge className="bg-red-600 text-white">Nein</Badge>
      return <Badge variant="outline">Keine Antwort</Badge>
  }
  const getAvailabilityNudge = (status: "none" | AvailabilityStatus, lineup: "none" | "starter" | "substitute") => {
    const lineupHint =
      lineup === "starter"
        ? " Du bist aktuell in der Aufstellung."
        : lineup === "substitute"
          ? " Du bist als Ersatz vorgesehen."
          : ""

    if (status === "yes") return `Super, danke für deine Zusage!${lineupHint}`
    if (status === "maybe")
      return `Danke! Wenn Not am Mann ist, melden wir uns – wenn möglich, halte dir den Termin frei.${lineupHint}`
    if (status === "no") return `Schade – vielleicht hast du beim nächsten Spiel Zeit.${lineupHint}`
      return `Bitte gib kurz Bescheid, ob du kannst – das hilft bei der Planung.${lineupHint}`
  }


  const fetchNextMatchSummary = async (playerId: string, memberships: TeamMembership[]) => {
    try {
      const teamIds = memberships.map((t) => t.team_id).filter(Boolean)
      if (!playerId || teamIds.length === 0) {
        setNextMatchSummary(null)
        return
      }

      const today = new Date().toISOString().split("T")[0]
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(`*,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name),
          home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
          away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name),
          season:seasons(id, name, type)
        `)
        .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`)
        .gte("match_date", today)
        .neq("status", "completed")
        .order("match_date", { ascending: true })
        .limit(1)

      if (matchesError) throw matchesError
      const next = (matchesData as any[] | null)?.[0] as Match | undefined
      if (!next) {
        setNextMatchSummary(null)
        return
      }

      const teamId = teamIds.includes((next as any).home_team_id) ? (next as any).home_team_id : (next as any).away_team_id

      const [{ data: av }, { data: lu }] = await Promise.all([
        supabase.from("match_availability").select("player_id,status").eq("match_id", (next as any).id).eq("team_id", teamId),
        supabase.from("match_lineups").select("player_id,is_substitute,position").eq("match_id", (next as any).id).eq("team_id", teamId),
      ])

      const rows = (av as any[] | null) ?? []
      const counts = { yes: 0, maybe: 0, no: 0, none: 0 }
      for (const r of rows) {
        if (r.status === "yes") counts.yes += 1
        else if (r.status === "maybe") counts.maybe += 1
        else if (r.status === "no") counts.no += 1
      }

      // none = all team members - answered; best effort using team_members count
      const { count: teamMemberCount } = await supabase
        .from("team_members")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .is("left_at", null)

      const total = teamMemberCount ?? rows.length
      const answered = counts.yes + counts.maybe + counts.no
      counts.none = Math.max(0, total - answered)

      const myRow = rows.find((r) => r.player_id === playerId)
      const myStatus = (myRow?.status as AvailabilityStatus | undefined) ?? "none"

      const lineupRows = (lu as any[] | null) ?? []
      const myLu = lineupRows.find((r) => r.player_id === playerId)
      const myLineup: "none" | "starter" | "substitute" = myLu ? (myLu.is_substitute ? "substitute" : "starter") : "none"

      setNextMatchSummary({ match: next, teamId, counts, myStatus, myLineup })
    } catch (e) {
      console.error("fetchNextMatchSummary error", e)
      setNextMatchSummary(null)
    }
  }

  const fetchProfile = async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      setError(null)

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select(`id, user_id, player_id, last_seen_at, club_players (id, name, photo_url, throwing_hand, age, origin, club_joined_at, club_left_at)`)
        .eq("user_id", session.user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      setProfile(profileData)

      // Admin/Verwaltung Berechtigungen laden (aus user_page_permissions)
      // Box wird nur angezeigt, wenn der Benutzer in dieser Tabelle mindestens eine Berechtigung mit allowed=true hat.
      if (profileData?.player_id) {
        const { data: permissionRows, error: permissionErr } = await supabase
          .from("user_page_permissions")
          .select("page_key, allowed")
          .eq("player_id", profileData.player_id)

        if (permissionErr) throw permissionErr
        setUserPagePermissions((permissionRows ?? []) as UserPagePermission[])
      } else {
        setUserPagePermissions([])
      }

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

        // Next upcoming match summary (for profile card)
        await fetchNextMatchSummary(profileData.player_id, teamData || [])


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
  const hasClubRole = userPagePermissions.some((p) => p.allowed)


  const navigationItems = [
    {
      title: "Dashboard",
      description: "Statistiken, Teams und Verwaltung",
      icon: BarChart3,
      href: "/member-dashboard-app",
      color: "from-blue-500 to-blue-600",
    },
	{
  title: "Zusagen & Aufstellung",
  description: "Spieler zusagen verwalten und Teamaufstellung erstellen",
  icon: CheckCircle,
  href: "/member-availability",
  color: "from-green-500 to-emerald-600",
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


  const formatLastSeen = (timestamp?: string | null) => {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
      return `${day}.${month}.${year} ${hours}:${minutes}`
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

        {myDues?.summary_tone === "overdue" && (
          <Card className="mb-6 sm:mb-8 border-0 shadow-xl bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-l-red-500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg">
                    <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-grow w-full">
                  <h3 className="text-base sm:text-lg font-bold text-red-700 mb-2">
                    Beitrag überfällig
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                    Dein Vereinsbeitrag ist aktuell überfällig. Bitte begleiche ihn so schnell wie möglich.
                  </p>
                  <Badge className="bg-red-600 text-white">Überfällig</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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

        {totalUnread > 0 && (
          <Card className="mb-6 sm:mb-8 border-0 shadow-xl bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-l-purple-500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg">
                    <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>

                <div className="flex-grow w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Neue Team-Chat Nachrichten</h3>
                    <Badge className="bg-purple-600 text-white w-fit">{totalUnread}</Badge>
                  </div>

                  <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                    Du hast neue Nachrichten in deinen Team-Chats. Tippe auf ein Team, um den Chat zu öffnen.
                  </p>

                  <div className="space-y-2">
                    {chatRooms
  .filter((r) => (unreadCounts[r.id] || 0) > 0)
  .slice(0, 5)
  .map((room) => (
    <div
      key={room.id}
      className="flex items-center justify-between bg-white/70 rounded-lg p-3 border border-purple-200 cursor-pointer hover:bg-white transition-colors"
      onClick={() => router.push(`/chat-app?roomId=${room.id}&scope=${CHAT_SCOPE}`)}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 truncate">{room.name}</div>
        <div className="text-xs text-gray-600">Tippen zum Öffnen</div>
      </div>

      <Badge className="bg-red-500 text-white">{unreadCounts[room.id] || 0}</Badge>
    </div>
  ))}

                  </div>

                  {chatRooms.filter((r) => (unreadCounts[r.id] || 0) > 0).length > 5 && (
                    <div className="text-xs text-gray-600 text-center mt-2">
                      ... und weitere Chats mit neuen Nachrichten
                    </div>
                  )}
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
          <div className="text-lg sm:text-xl text-gray-600 px-4">
            Schön dich zu sehen, {profile.club_players?.name || "Vereinsmitglied"}
            {myDues?.summary_tone === "overdue" && (
              <Badge variant="destructive" className="ml-2 inline-flex items-center gap-1 align-middle">
                <AlertTriangle className="h-3 w-3" />
                Beitrag überfällig
              </Badge>
            )}
            {myDues?.summary_tone === "due" && (
              <Badge className="ml-2 inline-flex items-center gap-1 align-middle">
                <Bell className="h-3 w-3" />
                Beitrag fällig
              </Badge>
            )}
          </div>
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
                {(profile as any)?.last_seen_at && (
                  <p className="text-sm sm:text-base text-gray-600 mb-2">
                    Zuletzt online: {formatLastSeen((profile as any).last_seen_at)}
                  </p>
                )}

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
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
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

        {/* Eigene Box unterhalb des Profil-Headers: nur kommendes Spiel */}
        <Card className="border shadow-sm bg-white mb-6 sm:mb-8">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">Kommendes Spiel</div>
                {!nextMatchSummary ? (
                  <div className="text-sm text-muted-foreground mt-1">Kein kommendes Spiel gefunden.</div>
                ) : (
                  <>
                    <div className="font-semibold text-base sm:text-lg truncate mt-1">
                      {getTeamDisplayName(nextMatchSummary.match, true)} vs {getTeamDisplayName(nextMatchSummary.match, false)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        {formatDate((nextMatchSummary.match as any).match_date)}
                        {(nextMatchSummary.match as any).match_time ? ` • ${formatTime((nextMatchSummary.match as any).match_time)}` : ""}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-orange-600" />
                        {(nextMatchSummary.match as any).venue || "—"}
                      </span>
                      {countdown && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <span className="font-mono">{countdown}</span>
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className="bg-green-600 text-white">Zusagen: {nextMatchSummary.counts.yes}</Badge>
                      <Badge className="bg-yellow-600 text-white">Vielleicht: {nextMatchSummary.counts.maybe}</Badge>
                      <Badge className="bg-red-600 text-white">Absagen: {nextMatchSummary.counts.no}</Badge>
                      <Badge variant="outline">Offen: {nextMatchSummary.counts.none}</Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="text-xs text-gray-500">Meine Antwort:</div>
                      {statusBadge(nextMatchSummary.myStatus)}
                      <div className="text-xs text-gray-500 ml-0 sm:ml-3">Aufstellung:</div>
                      {nextMatchSummary.myLineup === "starter" ? (
                        <Badge className="bg-orange-600 text-white">Stamm</Badge>
                      ) : nextMatchSummary.myLineup === "substitute" ? (
                        <Badge variant="secondary">Ersatz</Badge>
                      ) : (
                        <Badge variant="outline">Nicht gesetzt</Badge>
                      )}
                    <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-sm text-gray-700 flex items-start gap-2">
                      {nextMatchSummary.myStatus === "yes" ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      ) : nextMatchSummary.myStatus === "no" ? (
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                      ) : nextMatchSummary.myStatus === "maybe" ? (
                        <HelpCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      ) : (
                        <Bell className="h-4 w-4 text-gray-500 mt-0.5" />
                      )}
                      <span className="leading-snug">
                        {getAvailabilityNudge(nextMatchSummary.myStatus, nextMatchSummary.myLineup)}
                      </span>
                    </div>

                    </div>
                  </>
                )}
              </div>

              <div className="flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!nextMatchSummary) return
                    router.push(`/member-availability?matchId=${nextMatchSummary.match.id}`)
                  }}
                  className="bg-white hover:bg-gray-50 border-gray-200"
                  disabled={!nextMatchSummary}
                >
                  Öffnen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {hasClubRole && (
          <Card
            className="mb-6 border-0 shadow-2xl cursor-pointer overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 text-white ring-2 ring-orange-300 hover:ring-4 transition-all hover:shadow-[0_0_25px_rgba(251,146,60,0.8)]"


            onClick={() => router.push("/admin")}
          >
            <CardContent className="p-5 sm:p-6 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm opacity-90">Vereinsbereich</div>
                <div className="text-xl font-extrabold truncate">Admin / Verwaltung</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold">Öffnen</span>
                <ArrowRight className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        )}

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