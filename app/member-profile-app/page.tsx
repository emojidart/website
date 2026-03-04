"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Loader2, Pencil} from "lucide-react"
import Link from "next/link"
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
  Printer,
  Trash2,
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

const formatCurrencyEUR = (value: number) => {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value || 0)
}

const formatMonthYearDE = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" })
}

export default function MemberProfileAppPage() {
  const CHAT_SCOPE: "team" | "captains" | "club" = "team"

  const { session, loading: authLoading } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<UserProfileWithLastSeen | null>(null)
  const [tournamentPushEnabled, setTournamentPushEnabled] = useState<boolean | null>(null)
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
  legsWon: 0,
  legsLost: 0,
  legsPlayed: 0,
  winPercentage: 0,
  total180s: 0,
  total180er: 0,
})

  const clubPlayersForDues = useMemo(() => {
    if (!profile?.club_players) return []
    return [profile.club_players as any]
  }, [profile])

  // ✅ useDues: periodsByPlayer ist eine Map<playerId, periods[]>
  const { summaryRows: duesSummaryRows, periodsByPlayer } = useDues(session?.user ?? null, clubPlayersForDues as any, () => {})

  const myDues = useMemo(() => {
    const pid = profile?.club_players?.id
    if (!pid) return null
    return duesSummaryRows.find((r) => r.player_id === pid) ?? null
  }, [duesSummaryRows, profile])

  // ✅ FIX: periodsByPlayer ist Map -> periodsByPlayer.get(pid)
  // ✅ FIX: Felder heißen due_on & amount
  const myDuesDetail = useMemo(() => {
    const pid = profile?.club_players?.id
    if (!pid) {
      return {
        overdueCount: 0,
        dueCount: 0,
        unpaidCount: 0,
        overdueAmount: 0,
        dueAmount: 0,
        unpaidAmount: 0,
        nextUnpaidDueDate: null as string | null,
      }
    }

    // ✅ periodsByPlayer ist eine Map => get(pid)
    const periods = (periodsByPlayer as any)?.get?.(pid) || []

    const overdue = periods.filter((p: any) => p.status_tone === "overdue")
    const due = periods.filter((p: any) => p.status_tone === "due")

    // ✅ Feld heißt amount (nicht amount_due)
    const overdueAmount = overdue.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
    const dueAmount = due.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

    const unpaidPeriods = [...overdue, ...due]
    const unpaidAmount = unpaidPeriods.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

    // ✅ Feld heißt due_on (nicht due_date)
    const nextUnpaid = unpaidPeriods
      .slice()
      .sort((a: any, b: any) => String(a.due_on).localeCompare(String(b.due_on)))[0]

    return {
      overdueCount: overdue.length,
      dueCount: due.length,
      unpaidCount: unpaidPeriods.length,
      overdueAmount,
      dueAmount,
      unpaidAmount,
      nextUnpaidDueDate: nextUnpaid?.due_on ?? null,
    }
  }, [periodsByPlayer, profile])

  const overdueMonthsLabel = useMemo(() => {
    const pid = profile?.club_players?.id
    if (!pid) return []

    const periods = (periodsByPlayer as any)?.get?.(pid) || []
    const overdue = periods
      .filter((p: any) => p.status_tone === "overdue")
      .sort((a: any, b: any) => String(a.due_on).localeCompare(String(b.due_on)))

    return Array.from(new Set(overdue.map((p: any) => formatMonthYearDE(p.due_on))))
  }, [periodsByPlayer, profile])

  const dueMonthsLabel = useMemo(() => {
    const pid = profile?.club_players?.id
    if (!pid) return []

    const periods = (periodsByPlayer as any)?.get?.(pid) || []
    const due = periods
      .filter((p: any) => p.status_tone === "due")
      .sort((a: any, b: any) => String(a.due_on).localeCompare(String(b.due_on)))

    return Array.from(new Set(due.map((p: any) => formatMonthYearDE(p.due_on))))
  }, [periodsByPlayer, profile])

  const duesBadgeText = useMemo(() => {
    const overdue = myDuesDetail.overdueCount
    const due = myDuesDetail.dueCount
    const unpaid = myDuesDetail.unpaidCount
    if (unpaid <= 0) return null

    const parts: string[] = []
    if (overdue > 0) parts.push(`${overdue}× überfällig`)
    if (due > 0) parts.push(`${due}× fällig`)
    return parts.join(" • ")
  }, [myDuesDetail])

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

  const [chatRooms, setChatRooms] = useState<Array<{ id: string; name: string }>>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

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

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user) {
      fetchProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    const rooms = (teamMemberships || [])
      .map((m: any) => ({
        id: m.teams?.chat_room_id,
        name: m.teams?.name || "Team-Chat",
      }))
      .filter((r: any) => !!r.id)

    setChatRooms(rooms)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMemberships?.length])

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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => fetchUnreadCounts(chatRooms))
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
        (data || []).map(async (notification: any) => {
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
                  `match_date, home_team_type, away_team_type,
                   home_team:teams!matches_home_team_id_fkey(name),
                   away_team:teams!matches_away_team_id_fkey(name),
                   home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(name),
                   away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(name)`,
                )
                .eq("id", (legData as any).match_id)
                .single()

              const { data: playerData } = await supabase.from("club_players").select("name").eq("id", (legData as any).player_id).single()

              return { ...notification, leg_statistics: legData, match: matchData, player: playerData }
            }
          }
          return notification
        }),
      )

      setNotifications(enrichedNotifications as any)
    } catch (err) {
      console.error("Error fetching notifications:", err)
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)
      if (error) throw error
      setNotifications((prev: any) => prev.filter((n: any) => n.id !== notificationId))
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

        counts[room.id] = countError ? 0 : count || 0
      }

      setUnreadCounts(counts)
    } catch (error) {
      console.error("Error fetching unread counts:", error)
    }
  }

  const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + (n || 0), 0)

  type AvailabilityStatus = "yes" | "maybe" | "no"

  const statusBadge = (s: "none" | AvailabilityStatus) => {
    if (s === "yes") return <Badge className="bg-green-600 text-white">Ja</Badge>
    if (s === "maybe") return <Badge className="bg-yellow-600 text-white">Nur wenn Not am Mann</Badge>
    if (s === "no") return <Badge className="bg-red-600 text-white">Nein</Badge>
    return <Badge variant="outline">Keine Antwort</Badge>
  }

  const getAvailabilityNudge = (status: "none" | AvailabilityStatus, lineup: "none" | "starter" | "substitute") => {
    const lineupHint =
      lineup === "starter" ? " Du bist aktuell in der Aufstellung." : lineup === "substitute" ? " Du bist als Ersatz vorgesehen." : ""

    if (status === "yes") return `Super, danke für deine Zusage!${lineupHint}`
    if (status === "maybe") return `Danke! Wenn Not am Mann ist, melden wir uns – wenn möglich, halte dir den Termin frei.${lineupHint}`
    if (status === "no") return `Schade – vielleicht hast du beim nächsten Spiel Zeit.${lineupHint}`
    return `Bitte gib kurz Bescheid, ob du kannst – das hilft bei der Planung.${lineupHint}`
  }

  const fetchNextMatchSummary = async (playerId: string, memberships: TeamMembership[]) => {
    try {
      const teamIds = memberships.map((t: any) => t.team_id).filter(Boolean)
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

const matchDate = (next as any).match_date as string // "YYYY-MM-DD"

const { count: teamMemberCount, error: teamMemberCountError } = await supabase
  .from("team_members")
  .select("id", { count: "exact", head: true })
  .eq("team_id", teamId)
  .lte("joined_at", matchDate)
  .or(`left_at.is.null,left_at.gt.${matchDate}`)

if (teamMemberCountError) throw teamMemberCountError

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

      if (profileError) throw profileError
      setProfile(profileData as any)
	  
	  // Push-Status aus push_preferences laden
const { data: pushData } = await supabase
  .from("push_preferences")
  .select("tournament_push_enabled")
  .eq("user_id", session.user.id)
  .single()

setTournamentPushEnabled(pushData?.tournament_push_enabled ?? false)

      if ((profileData as any)?.player_id) {
        const { data: permissionRows, error: permissionErr } = await supabase.from("user_page_permissions").select("page_key, allowed").eq("player_id", (profileData as any).player_id)

        if (permissionErr) throw permissionErr
        setUserPagePermissions((permissionRows ?? []) as any)
      } else {
        setUserPagePermissions([])
      }
	  
	  
	  
	  if ((profileData as any)?.player_id) {
  const { data: permissionRows, error: permissionErr } = await supabase
    .from("user_page_permissions")
    .select("page_key, allowed")
    .eq("player_id", (profileData as any).player_id)

  if (permissionErr) throw permissionErr
  setUserPagePermissions((permissionRows ?? []) as any)
} else {
  setUserPagePermissions([])
}

if ((profileData as any)?.player_id) {
  await fetchNotifications((profileData as any).player_id)

  const { data: teamData, error: teamError } = await supabase
    .from("team_members")
    .select(`id, team_id, role, teams (id, name, logo_url, chat_room_id)`)
    .eq("player_id", (profileData as any).player_id)
    .is("left_at", null)

  if (teamError) throw teamError
  setTeamMemberships((teamData || []) as any)

  await fetchNextMatchSummary((profileData as any).player_id, (teamData || []) as any)

  // ✅ Stats (Legs W/L, Siegquote, 180er, Events)
  const { data: legStats, error: legStatsError } = await supabase
    .from("leg_statistics")
    .select("match_id, player_legs_won, opponent_legs_won, throws_180")
    .eq("player_id", (profileData as any).player_id)

  if (legStatsError) throw legStatsError

  if (legStats) {
    const legsWon = (legStats as any[]).reduce(
      (sum, s) => sum + (Number(s.player_legs_won) || 0),
      0
    )

    const legsLost = (legStats as any[]).reduce(
      (sum, s) => sum + (Number(s.opponent_legs_won) || 0),
      0
    )

    const legsPlayed = legsWon + legsLost

    const winPercentage =
      legsPlayed > 0 ? Math.round((legsWon / legsPlayed) * 100) : 0

    const total180s = (legStats as any[]).reduce(
      (sum, s) => sum + (Number(s.throws_180) || 0),
      0
    )

    const totalEvents = new Set(
      (legStats as any[]).map((s) => s.match_id).filter(Boolean)
    ).size

    setStatistics((prev) => ({
      ...prev,
      legsWon,
      legsLost,
      legsPlayed,
      winPercentage,
      total180s,
      totalEvents,
    }))
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
    if (!photoFile || !(profile as any)?.club_players?.id) return

    setPhotoUploading(true)
    setPhotoMessage("")

    try {
      const fileExtension = photoFile.name.split(".").pop()
      const sanitizedPlayerName = (profile as any).club_players.name.replace(/[^a-zA-Z0-9_.-]/g, "").replace(/\s/g, "_")
      const filePath = `player-avatars/${sanitizedPlayerName}-${Date.now()}.${fileExtension}`

      const { error: uploadError } = await supabase.storage.from("player-avatars").upload(filePath, photoFile, {
        cacheControl: "3600",
        upsert: false,
      })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from("player-avatars").getPublicUrl(filePath)

      const { error: updateError } = await supabase.from("club_players").update({ photo_url: publicUrlData.publicUrl }).eq("id", (profile as any).club_players.id)

      if (updateError) throw updateError

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              club_players: (prev as any).club_players ? { ...(prev as any).club_players, photo_url: publicUrlData.publicUrl } : null,
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
      reader.onload = (e) => setPhotoPreview(e.target?.result as string)
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
    { title: "Dashboard", description: "Statistiken, Ergebnisse und Spielpläne", icon: BarChart3, href: "/member-dashboard-app", color: "from-blue-500 to-blue-600" },
    { title: "Zusagen & Aufstellung", description: "Spieler zusagen verwalten und Teamaufstellung erstellen", icon: CheckCircle, href: "/member-availability", color: "from-green-500 to-emerald-600" },
    { title: "Meine Teams", description: "Teams und Teammitglieder verwalten", icon: Users, href: "/meine-teams-app", color: "from-teal-500 to-teal-600" },
    { title: "Spieler Statistiken", description: "Detaillierte Leistungsanalyse", icon: BarChart3, href: "/member-statistics-app", color: "from-indigo-500 to-indigo-600" },
    { title: "Statistik Blätter drucken", description: "Statistik-/Spielerblätter auswählen und drucken", icon: Printer, href: "/team-print-sheet", color: "from-orange-500 to-orange-600", requiresLeadership: true },
    { title: "Training", description: "Trainingsübungen und Fortschritt", icon: Dumbbell, href: "/training-app", color: "from-orange-500 to-red-600" },
    { title: "Lobby", description: "Spiele gegen andere Spieler", icon: Target, href: "/lobby-app", color: "from-pink-500 to-pink-600" },
    { title: "Match Galerie", description: "Match-Galerie und Spielfotos", icon: Camera, href: "/match-galerie", color: "from-purple-500 to-purple-600" },
    { title: "Bonusgeld", description: "Bonuspunkte und Belohnungen", icon: Euro, href: "/member-bonus-app", color: "from-yellow-500 to-yellow-600" },
    { title: "Liga Tabellen", description: "Aktuelle Ligastände", icon: Table, href: "/member-league-app", color: "from-emerald-500 to-emerald-600" },
    { title: "Vereinskalender", description: "Termine und Events verwalten", icon: Calendar, href: "/vereinskalender-app", color: "from-green-500 to-green-600" },
    { title: "Feed", description: "Poste, kommentiere und bleib verbunden", icon: MessageCircle, href: "/community-app", color: "from-orange-500 to-red-600" },
    { title: "Team Chat", description: "Kommunikation mit dem Team", icon: MessageCircle, href: "/chat-app", color: "from-purple-500 to-purple-600" },
    { title: "Support", description: "Hilfe und Support-Anfragen", icon: HelpCircle, href: "/support-app", color: "from-red-500 to-red-600" },
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
      if ((match as any).home_team_type === "own" && (match as any).home_team) return (match as any).home_team.name
      if ((match as any).home_team_type === "opponent" && (match as any).home_opponent_team) return (match as any).home_opponent_team.name
    } else {
      if ((match as any).away_team_type === "own" && (match as any).away_team) return (match as any).away_team.name
      if ((match as any).away_team_type === "opponent" && (match as any).away_opponent_team) return (match as any).away_opponent_team.name
    }
    return "Unbekannt"
  }

  const isLeadershipRole = () => {
    return teamMemberships.some((m: any) => m.role === "Captain" || m.role === "Co-Captain")
  }

   // ✅ LOADING VIEW 
  if (loading) {
  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 pb-20 pt-12 sm:pt-14">
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-white shadow-2xl px-10 py-10 border border-gray-200">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl animate-pulse" />
              <Loader2 className="relative h-12 w-12 animate-spin text-orange-600" />
            </div>

            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">Profil wird geladen</p>
              <p className="text-sm text-gray-500 mt-1">Bitte kurz warten…</p>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </main>
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

      <main className="flex-grow mx-auto w-full px-4 py-6 sm:py-8 pb-24 md:pb-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
       

   

 {/* Willkommen */}
<div className="mt-8 sm:mt-10 mb-5 sm:mb-6">
  <div className="flex items-center justify-between">
    <div>
      
      <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
        Willkommen, {profile.club_players?.name || "Spieler"}
      </h1>
    </div>

    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
      <Users className="h-5 w-5 text-white" />
    </div>
  </div>
</div>


 {/* ✅ Beiträge: überfällig / fällig inkl. Beträge */}
        {myDuesDetail.overdueCount > 0 && (
          <Card className="mb-6 sm:mb-8 border-0 shadow-xl bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-l-red-500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg">
                    <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
                <div className="flex-grow w-full">
                  <h3 className="text-base sm:text-lg font-bold text-red-700 mb-2">Beitrag überfällig</h3>
                  <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                    Du hast{" "}
                    <b>
                      {myDuesDetail.overdueCount}×{" "}
                      {myDuesDetail.overdueCount === 1 ? "überfälligen Beitrag" : "überfällige Beiträge"}
                    </b>{" "}
                    offen (Summe: <b>{formatCurrencyEUR(myDuesDetail.overdueAmount)}</b>).
                    <br />
                    <span className="font-medium text-red-700">
                      {myDuesDetail.overdueCount === 1
                        ? "Der offene Betrag muss schnellstmöglich beglichen werden."
                        : "Die offenen Beträge müssen schnellstmöglich beglichen werden."}
                    </span>
                    <br />
                    Solltest du Zahlungsschwierigkeiten haben, wende dich bitte an die Vereinsleitung.
                  </p>

                  {overdueMonthsLabel.length > 0 && (
                    <div className="text-sm text-gray-700 mb-3">
                      Überfällig für: <b>{overdueMonthsLabel.join(", ")}</b>
                    </div>
                  )}

                  <Badge className="bg-red-600 text-white">{myDuesDetail.overdueCount}× überfällig</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ✅ Fällig immer anzeigen, auch wenn es zusätzlich überfällige gibt (gelb) */}
        {myDuesDetail.dueCount > 0 && (
          <Card className="mb-6 sm:mb-8 border-0 shadow-xl bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-l-yellow-500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl shadow-lg">
                    <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
                <div className="flex-grow w-full">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Beitrag fällig</h3>
                  {dueMonthsLabel.length > 0 && (
                    <div className="text-sm text-gray-700 mb-3">
                      Fällig für: <b>{dueMonthsLabel.join(", ")}</b>
                    </div>
                  )}

                  <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                    Du hast{" "}
                    <b>
                      {myDuesDetail.dueCount}× {myDuesDetail.dueCount === 1 ? "fälligen Beitrag" : "fällige Beiträge"}
                    </b>{" "}
                    offen (Summe: <b>{formatCurrencyEUR(myDuesDetail.dueAmount)}</b>).
                    <br />
                    {myDuesDetail.dueCount === 1
                      ? "Der Betrag muss spätestens bis zum 20. des Monats auf unserem Vereinskonto eingegangen sein."
                      : "Die Beträge müssen spätestens bis zum 20. des Monats auf unserem Vereinskonto eingegangen sein."}
                  </p>

                  <Badge className="bg-yellow-500 text-white">{myDuesDetail.dueCount}× fällig</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}



  {totalUnread > 0 && (
  <Card className="mb-6 sm:mb-8 border-0 shadow-xl bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-l-orange-500">
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex-shrink-0">
          <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg">
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
        </div>

        <div className="flex-grow w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Neue Team-Chat Nachrichten</h3>
            <Badge className="bg-orange-600 text-white w-fit">{totalUnread}</Badge>
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
                  className="flex items-center justify-between bg-white/70 rounded-lg p-3 border border-orange-200 cursor-pointer hover:bg-white transition-colors"
                  onClick={() => router.push(`/chat-app?room_id=${room.id}&scope=${CHAT_SCOPE}`)}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{room.name}</div>
                    <div className="text-xs text-gray-600">Tippen zum Öffnen</div>
                  </div>

                 <Badge className="bg-orange-600 text-white">{unreadCounts[room.id] || 0}</Badge>
                </div>
              ))}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)}

        {/* Profil Card */}
        <Card className="mb-6 sm:mb-8 border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-0">
  {/* Cover / Header */}
  <div className="relative overflow-hidden rounded-t-xl">
    <div className="h-24 sm:h-28 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500" />
    <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_10%,white,transparent_35%),radial-gradient(circle_at_70%_90%,white,transparent_40%)]" />
  </div>

  {/* Content */}
  <div className="relative px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6">
    {/* Avatar (overlapping) */}
    <div className="-mt-10 sm:-mt-12 flex items-end justify-between gap-3">
      <div className="relative">
        <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white shadow-xl">
          <AvatarImage
            src={profile.club_players?.photo_url || "/placeholder.svg?height=96&width=96&query=dart player avatar"}
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
          className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-white shadow-lg"
          onClick={() => setIsPhotoDialogOpen(true)}
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>

      {/* Abmelden  */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 bg-white/90 border-red-200 shadow-sm"
      >
        <LogOut className="h-4 w-4" />
        Abmelden
      </Button>
    </div>

    {/* Name + Meta */}
    <div className="mt-3">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
        {profile.club_players?.name || "Vereinsmitglied"}
      </h2>
	  
	  <div className="mt-3 flex flex-wrap items-center gap-2">
  <Button
    asChild
    variant="outline"
    size="sm"
    className="rounded-full bg-orange-600 text-white hover:bg-orange-700"
  >
    <Link href="/profil-daten-app">
      <Pencil className="h-4 w-4 mr-2" />
      Profil bearbeiten
    </Link>
  </Button>
</div>

      {(profile as any)?.last_seen_at && (
        <div className="mt-1 text-sm text-gray-600">
          Zuletzt online: {formatLastSeen((profile as any).last_seen_at)}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        


        
      </div>

      {/* Willkommen */}
      <div className="mt-4 rounded-xl border bg-white/70 backdrop-blur-sm p-3 text-sm text-gray-700">
        Hier findest du alles rund um deine Teams, Spiele und Vereinsinfos.
      </div>
	  
	  
	  {teamMemberships.length > 1 && (
  <div className="mt-5">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-semibold text-gray-900">Alle Teams</p>
      <Badge variant="secondary" className="text-xs">
        {teamMemberships.length}
      </Badge>
    </div>

    <div className="flex flex-wrap gap-2">
      {teamMemberships.map((membership: any) => (
        <div
          key={membership.id}
          className="flex items-center gap-2 rounded-full border bg-white px-2.5 py-1 shadow-sm"
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100">
            {membership.role === "Captain" ? (
              <Crown className="h-3 w-3 text-orange-700" />
            ) : membership.role === "Co-Captain" ? (
              <ShieldCheck className="h-3.5 w-3.5 text-orange-700" />
            ) : (
              <Target className="h-3.5 w-3.5 text-orange-700" />
            )}
          </span>

          <span className="text-[13px] font-semibold text-gray-900">
            {membership.teams?.name || "Team"}
          </span>

          <span className="text-[11px] text-gray-600">
            {getRoleLabel(membership.role)}
          </span>
        </div>
      ))}
    </div>
  </div>
)}

      {/* */}
    </div>
  </div>
</CardContent>
        </Card>

        {/* Kommendes Spiel */}
<Card className="border shadow-sm bg-white mb-6 sm:mb-8 rounded-2xl overflow-hidden">
  <CardContent className="p-0">
    {/* Header */}
    <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b bg-gradient-to-r from-gray-50 to-white">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">Kommendes Spiel</div>
        <div className="text-sm font-semibold text-gray-900">
          {nextMatchSummary ? "Bitte prüfen & zusagen" : "Aktuell nichts geplant"}
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={() => nextMatchSummary && router.push(`/member-availability?matchId=${(nextMatchSummary.match as any).id}`)}
        className="bg-white hover:bg-gray-50 border-gray-200 rounded-xl"
        disabled={!nextMatchSummary}
      >
        Öffnen
      </Button>
    </div>

    {/* Body */}
    <div className="px-4 sm:px-5 py-4">
      {!nextMatchSummary ? (
        <div className="text-sm text-muted-foreground">Kein kommendes Spiel gefunden.</div>
      ) : (
        <>
          {/* Title */}
          <div className="font-extrabold text-lg sm:text-xl text-gray-900 leading-snug">
            {getTeamDisplayName(nextMatchSummary.match, true)}{" "}
            <span className="text-gray-400 font-semibold">vs</span>{" "}
            {getTeamDisplayName(nextMatchSummary.match, false)}
          </div>

          {/* Meta  */}
          <div className="mt-3 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 border border-gray-200">
              <Calendar className="h-4 w-4 text-orange-600" />
              <div className="text-sm text-gray-800">
                {formatDate((nextMatchSummary.match as any).match_date)}
                {(nextMatchSummary.match as any).match_time ? ` • ${formatTime((nextMatchSummary.match as any).match_time)}` : ""}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 border border-gray-200">
              <MapPin className="h-4 w-4 text-orange-600" />
              <div className="text-sm text-gray-800 truncate">
                {(nextMatchSummary.match as any).venue || "—"}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 border border-gray-200">
              <Clock className="h-4 w-4 text-orange-600" />
              <div className="text-sm text-gray-800">
                {countdown ? <span className="font-mono font-semibold">{countdown}</span> : "—"}
              </div>
            </div>
          </div>

          {/* Team answers  */}
          <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <Badge className="bg-green-600 text-white justify-center rounded-full py-2 text-xs sm:text-sm">
              Zusagen: {nextMatchSummary.counts.yes}
            </Badge>
            <Badge className="bg-yellow-600 text-white justify-center rounded-full py-2 text-xs sm:text-sm">
              Vielleicht: {nextMatchSummary.counts.maybe}
            </Badge>
            <Badge className="bg-red-600 text-white justify-center rounded-full py-2 text-xs sm:text-sm">
              Absagen: {nextMatchSummary.counts.no}
            </Badge>
            <Badge variant="outline" className="justify-center rounded-full py-2 text-xs sm:text-sm">
              Offen: {nextMatchSummary.counts.none}
            </Badge>
          </div>

          {/* My status  */}
          <div className="mt-4 rounded-2xl border bg-gray-50 p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500 w-28">Meine Antwort:</div>
                {statusBadge(nextMatchSummary.myStatus)}
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500 w-28">Aufstellung:</div>
                {nextMatchSummary.myLineup === "starter" ? (
                  <Badge className="bg-orange-600 text-white rounded-full">Stamm</Badge>
                ) : nextMatchSummary.myLineup === "substitute" ? (
                  <Badge variant="secondary" className="rounded-full">Ersatz</Badge>
                ) : (
                  <Badge variant="outline" className="rounded-full">Nicht gesetzt</Badge>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-start gap-2 text-sm text-gray-700">
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
  </CardContent>
</Card>

{/* Spiel-Benachrichtigungen */}
<Card
  className="mb-6 sm:mb-8 border-0 shadow-xl bg-white/95 backdrop-blur-sm cursor-pointer hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden"
  onClick={() => router.push("/push_preferences")}
>
 <CardContent className="p-0">
  <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b bg-gradient-to-r from-gray-50 to-white">
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">Benachrichtigungen</div>
      <div className="text-sm font-semibold text-gray-900">Spiel-Push (Live)</div>
    </div>

    <div className="shrink-0">
      {tournamentPushEnabled ? (
        <Badge className="bg-green-600 text-white rounded-full">Aktiv</Badge>
      ) : (
        <Badge className="bg-red-600 text-white rounded-full">Aus</Badge>
      )}
    </div>
  </div>

  <div className="px-4 sm:px-5 py-4">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
          <Bell className="h-5 w-5 text-white" />
        </div>

        <div className="min-w-0">
          <div className="text-sm font-bold text-gray-900">Spielstart & Updates</div>
          <div className="text-sm text-gray-600 mt-1 leading-snug">
            Erhalte Push-Infos bei Spielstart & Änderungen.
          </div>

    
        </div>
      </div>

      <div className="shrink-0">
        <div className="w-10 h-10 rounded-xl border bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-all">
          <ArrowRight className="h-5 w-5 text-purple-700" />
        </div>
      </div>
    </div>

    <div className="mt-4 text-xs text-gray-500">
      Tippe zum Ändern der Einstellungen
    </div>
  </div>
</CardContent>
</Card>



        {hasClubRole && (
  <Card
    className="mb-6 border-0 cursor-pointer overflow-hidden rounded-2xl text-white shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500"
    onClick={() => router.push("/admin")}
  >
    <CardContent className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-white/80">Vereinsbereich</div>
          <div className="text-xl sm:text-2xl font-extrabold leading-tight truncate">
            Admin / Verwaltung
          </div>
          <div className="mt-1 text-sm text-white/85">
            Verwaltung, Beiträge, Teams & Einstellungen
          </div>
        </div>

        <div className="shrink-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-4 py-2 backdrop-blur-sm hover:bg-white/20 transition-colors">
            <span className="text-sm font-semibold">Öffnen</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)}

       {/* Navigation */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-6 sm:mb-8">
  {navigationItems
    .filter((item: any) => !item.requiresLeadership || isLeadershipRole())
    .map((item, index) => (
      <Card
        key={index}
        className="border-0 bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group rounded-2xl overflow-hidden"
        onClick={() => router.push(item.href)}
      >
        <CardContent className="p-4 sm:p-5 min-h-[170px] flex flex-col">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${item.color} rounded-2xl mb-3 shadow-md group-hover:scale-[1.06] transition-transform duration-300`}
          >
            <item.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {item.title}
          </h3>

          <p className="text-sm text-gray-600 mb-3">
            {item.description}
          </p>

          <div className="mt-auto flex items-center justify-between pt-3">
            <span className="text-sm font-semibold text-gray-900 group-hover:text-orange-700 transition-colors">
              Öffnen
            </span>
            <div className="w-9 h-9 rounded-xl border bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
              <ArrowRight className="h-4 w-4 text-orange-600 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
</div>

       {/* Stats */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
  <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm overflow-hidden">
    <CardContent className="p-0">
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs sm:text-sm font-semibold text-gray-600">Legs W</div>
          <div className="w-9 h-9 rounded-2xl bg-yellow-50 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-yellow-700" />
          </div>
        </div>
        <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          {statistics.legsWon}
        </div>
        <div className="mt-1 text-xs text-gray-500">Gesamt</div>
      </div>
      <div className="h-1.5 bg-gradient-to-r from-yellow-400 to-amber-500" />
    </CardContent>
  </Card>

  <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm overflow-hidden">
    <CardContent className="p-0">
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs sm:text-sm font-semibold text-gray-600">Siegquote</div>
          <div className="w-9 h-9 rounded-2xl bg-orange-50 flex items-center justify-center">
            <Target className="h-5 w-5 text-orange-700" />
          </div>
        </div>
        <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          {statistics.winPercentage}%
        </div>
        <div className="mt-1 text-xs text-gray-500">Quote</div>
      </div>
      <div className="h-1.5 bg-gradient-to-r from-orange-400 to-orange-600" />
    </CardContent>
  </Card>

  <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm overflow-hidden">
    <CardContent className="p-0">
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs sm:text-sm font-semibold text-gray-600">Legs</div>
          <div className="w-9 h-9 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-700" />
          </div>
        </div>
        <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          {statistics.legsWon} : {statistics.legsLost}
        </div>
        <div className="mt-1 text-xs text-gray-500">Gespielt</div>
      </div>
      <div className="h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500" />
    </CardContent>
  </Card>

  <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm overflow-hidden">
    <CardContent className="p-0">
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs sm:text-sm font-semibold text-gray-600">180er</div>
          <div className="w-9 h-9 rounded-2xl bg-green-50 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-green-700" />
          </div>
        </div>
        <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          {statistics.total180s}
        </div>
        <div className="mt-1 text-xs text-gray-500">Gesamt</div>
      </div>
      <div className="h-1.5 bg-gradient-to-r from-green-400 to-emerald-500" />
    </CardContent>
  </Card>
</div>
		
		        {/* Konto / Datenschutz */}
        <Card className="mt-6 sm:mt-8 border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-gray-600">Konto</div>
                <div className="text-lg font-bold text-gray-900">Konto löschen</div>
                <div className="text-sm text-gray-600 mt-1">
                  Du kannst eine Löschanfrage stellen. Wir bearbeiten sie anschließend.
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full sm:w-auto border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => router.push("/konto-loeschen")}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Konto löschen
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Foto Dialog */}
      {isPhotoDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Profilfoto hochladen</h3>

            <div className="space-y-4">
              <div>
                <input type="file" accept="image/*" onChange={handlePhotoFileChange} className="w-full p-2 border rounded" />
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
                <p className={`text-sm ${photoMessage.includes("Fehler") ? "text-red-600" : "text-green-600"}`}>{photoMessage}</p>
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
                <Button onClick={handlePhotoUpload} disabled={!photoFile || photoUploading} className="bg-orange-600 hover:bg-orange-700">
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