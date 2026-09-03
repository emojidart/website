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
import { useMembershipAccess } from "@/hooks/use-membership-access"
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
  Sparkles,
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
  ShoppingBag,
  Gift,
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

  if (days > 0) {
    return `${days} ${days === 1 ? "Tag" : "Tage"} · ${hours} Std.`
  }

  if (hours > 0) {
    return `${hours} Std. · ${minutes} Min.`
  }

  return `${Math.max(1, minutes)} Min.`
}

const formatCompactDate = (date: string | Date) => {
  const d = new Date(date)
  const weekday = d.toLocaleDateString("de-AT", { weekday: "short" }).replace(".", "")
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${weekday}, ${day}.${month}.`
}

const formatCurrencyEUR = (value: number) => {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value || 0)
}

const formatMonthYearDE = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" })
}


const daysUntilDate = (iso: string | null | undefined) => {
  if (!iso) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const target = new Date(`${iso}T00:00:00`)
  target.setHours(0, 0, 0, 0)

  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

const formatShortDateAT = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

const trialModuleLabel = (code: string) => {
  if (code === "premium_app") return "EMD App"
  if (code === "edart_league") return "E-Dart Liga"
  if (code === "steeldart_league") return "Steeldart Liga"
  if (code === "internal_tournaments") return "Interne Turniere"
  if (code === "external_tournaments") return "Externe Turniere"
  if (code === "external_events") return "Externe Veranstaltungen"
  if (code === "club_events") return "Vereinsveranstaltungen"
  if (code === "base_membership") return "Grundmitgliedschaft"
  return code
}

export default function MemberProfileAppPage() {
  const CHAT_SCOPE: "team" | "captains" | "club" = "team"

  const { session, loading: authLoading } = useAuth()
  const {
    loading: membershipAccessLoading,
    endsOn: normalMembershipEndsOn,
    activeTrials,
    hasModule,
  } = useMembershipAccess()

  const router = useRouter()

  const [profile, setProfile] = useState<UserProfileWithLastSeen | null>(null)
const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [isBlocked, setIsBlocked] = useState(false)
const [blockedReason, setBlockedReason] = useState<string | null>(null)
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

  const membershipExpiryDays = daysUntilDate(normalMembershipEndsOn)

  const expiringTrials = useMemo(
    () =>
      (activeTrials || [])
        .map((trial: any) => ({
          ...trial,
          daysLeft: daysUntilDate(trial.ends_on),
        }))
        .filter(
          (trial: any) =>
            trial.daysLeft !== null &&
            trial.daysLeft >= 0 &&
            trial.daysLeft <= 30,
        )
        .sort((a: any, b: any) => Number(a.daysLeft) - Number(b.daysLeft)),
    [activeTrials],
  )

  const showNormalMembershipExpiry =
    membershipExpiryDays !== null &&
    membershipExpiryDays >= 0 &&
    membershipExpiryDays <= 30

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
    if (membershipAccessLoading) return
    const playerId = (profile as any)?.player_id
    if (!playerId) return

    void fetchNextMatchSummary(playerId, teamMemberships)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membershipAccessLoading, profile?.player_id, teamMemberships])

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
      const eligibleMemberships = memberships.filter((membership: any) => {
        const dartType = membership?.teams?.dart_type

        if (dartType === "edart") return hasModule("edart_league")
        if (dartType === "steeldart") return hasModule("steeldart_league")

        // Alte/sonstige Teams ohne Liga-Typ sollen hier keinen Liga-Hinweis erzeugen.
        return false
      })

      const teamIds = eligibleMemberships.map((t: any) => t.team_id).filter(Boolean)

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
    setIsBlocked(false)
    setBlockedReason(null)

    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select(`
        id,
        user_id,
        player_id,
        last_seen_at,
        is_blocked,
        blocked_reason,
        club_players (
          id,
          name,
          photo_url,
          throwing_hand,
          age,
          origin,
          club_joined_at,
          club_left_at
        )
      `)
      .eq("user_id", session.user.id)
      .maybeSingle()

    if (profileError) throw profileError

    if (!profileData) {
      setError("Für dieses Konto wurde noch kein Profil gefunden.")
      setProfile(null)
      return
    }

    if ((profileData as any).is_blocked) {
      setIsBlocked(true)
      setBlockedReason((profileData as any).blocked_reason ?? null)
      setProfile(profileData as any)
      return
    }

    setProfile(profileData as any)

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
        .select(`
          id,
          team_id,
          role,
          teams (id, name, logo_url, chat_room_id, dart_type)
        `)
        .eq("player_id", (profileData as any).player_id)
        .is("left_at", null)

      if (teamError) throw teamError
      setTeamMemberships((teamData || []) as any)

      await fetchNextMatchSummary((profileData as any).player_id, (teamData || []) as any)

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
    console.error("Error fetching profile:", {
      message: err?.message,
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
      full: err,
    })
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

  const navigationGroups = [
    {
      title: "Spielen & Teams",
      description: "Alles rund um Liga, Teams und Ergebnisse",
      items: [
        { title: "Dashboard", description: "Ergebnisse & Spielpläne", icon: BarChart3, href: "/member-dashboard-app" },
        { title: "Zusagen & Aufstellung", description: "Für kommende Spiele zu- oder absagen", icon: CheckCircle, href: "/member-availability" },
        { title: "Meine Teams", description: "Teams & Mitspieler", icon: Users, href: "/meine-teams-app" },
        { title: "Liga Tabellen", description: "Aktuelle Ligastände", icon: Table, href: "/member-league-app" },
        { title: "Spieler Statistiken", description: "Deine Liga-Leistung", icon: BarChart3, href: "/member-statistics-app" },
        { title: "Turnierstatistiken", description: "Summer Special, DKO & Kratzer", icon: Trophy, href: "/member-tournament-statistics-app" },
      ],
    },
    {
      title: "Training & Community",
      description: "Trainieren, spielen und mit anderen austauschen",
      items: [
        { title: "Trainingstreff", description: "Gemeinsame Trainings & Treffen", icon: Calendar, href: "/training_event" },
        { title: "Mein Training", description: "Übungen & Trainingsplan", icon: Dumbbell, href: "/training-app" },
        { title: "Team Chat", description: "Mit deinem Team schreiben", icon: MessageCircle, href: "/chat-app" },
        { title: "Match Galerie", description: "Spielfotos ansehen", icon: Camera, href: "/match-galerie" },
      ],
    },
    {
      title: "Verein & Extras",
      description: "Mitgliedschaft, Termine und weitere Bereiche",
      items: [
        { title: "Vereinskalender", description: "Termine & Veranstaltungen", icon: Calendar, href: "/vereinskalender-app" },
        { title: "DACH Turniere", description: "Turniere in AT, DE & CH", icon: Trophy, href: "/dach-veranstaltungen" },
        { title: "Dartbörse", description: "Darts & Zubehör", icon: ShoppingBag, href: "/dartboerse" },
        { title: "Meine Bonuspunkte", description: "Punkte & Rang ansehen", icon: Sparkles, href: "/meine-bonus-punkte" },
        { title: "Bonusgeld", description: "Belohnungen ansehen", icon: Euro, href: "/member-bonus-app" },
        { title: "Meine Mitgliedschaft", description: "Paket & Zahlungsweise", icon: Euro, href: "/member-membership" },
        { title: "Support", description: "Hilfe & Anfragen", icon: HelpCircle, href: "/support-app" },
        { title: "Statistikblätter drucken", description: "Nur für Teamleitung", icon: Printer, href: "/team-print-sheet", requiresLeadership: true },
      ],
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
if (isBlocked) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl bg-white overflow-hidden rounded-3xl">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm uppercase tracking-wide text-white/80">
                      Zugang gesperrt
                    </div>
                    <div className="text-xl font-extrabold">
                      Konto derzeit nicht verfügbar
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  Dein Zugang wurde vorübergehend gesperrt.
                </p>

                {blockedReason && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 mb-4">
                    <span className="font-semibold">Grund:</span> {blockedReason}
                  </div>
                )}

                <p className="text-sm text-gray-600 mb-6">
                  Bitte wende dich an die Vereinsleitung, falls du glaubst, dass das ein Fehler ist.
                </p>

                <Button
                  onClick={handleLogout}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  Abmelden
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}

if (error || !profile) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl bg-white overflow-hidden rounded-3xl">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-orange-600" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                {error || "Profil nicht gefunden"}
              </h1>

              <p className="text-sm text-gray-600 mb-6">
                Es konnte kein vollständiges Mitgliederprofil geladen werden.
              </p>

              <Button onClick={() => router.push("/member-login")}>
                Zur Anmeldung
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}

  const primaryTeam = teamMemberships[0]
  const hasMultipleTeams = teamMemberships.length > 1

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f6f8] text-slate-950 font-sans">
      <Header />

      <main className="w-full max-w-none px-2 pb-24 pt-14 sm:px-4 sm:pt-16 lg:px-5 xl:px-6 lg:pb-12">
        {/* Hero */}
        <section className="relative mt-2 overflow-hidden rounded-[24px] border border-slate-800/10 bg-slate-950 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.62)] sm:mt-4 sm:rounded-[28px] xl:rounded-[30px]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-72 rounded-full bg-white/5 blur-3xl" />

          <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  Mitgliederbereich
                </div>

                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="relative shrink-0">
                    <Avatar className="h-16 w-16 border border-white/15 shadow-2xl sm:h-20 sm:w-20">
                      <AvatarImage
                        src={profile.club_players?.photo_url || "/placeholder.svg?height=96&width=96&query=dart player avatar"}
                        alt={profile.club_players?.name || "Spieler"}
                      />
                      <AvatarFallback className="bg-orange-500 text-xl font-black text-white sm:text-2xl">
                        {(profile.club_players?.name || "U")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => setIsPhotoDialogOpen(true)}
                      className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white text-slate-950 shadow-lg transition hover:scale-105"
                      aria-label="Profilfoto ändern"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/55">Willkommen zurück</p>
                    <h1 className="mt-1 truncate text-2xl font-black tracking-[-0.03em] text-white sm:text-4xl">
                      {profile.club_players?.name || "Vereinsmitglied"}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/60">
                      {teamMemberships.length > 0 ? (
                        teamMemberships.slice(0, 3).map((membership: any) => (
                          <span
                            key={membership.id}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-white/75"
                          >
                            <span className="truncate">{membership.teams?.name || "Team"}</span>
                            <span className="text-white/30">·</span>
                            <span className="shrink-0 text-orange-300">{getRoleLabel(membership.role)}</span>
                          </span>
                        ))
                      ) : (
                        <span>Emoj!´s Dartverein</span>
                      )}
                      {teamMemberships.length > 3 ? (
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-white/55">
                          +{teamMemberships.length - 3} weitere
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                <Button asChild variant="outline" className="h-10 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Link href="/profil-daten-app">
                    <Pencil className="mr-2 h-4 w-4" />
                    Profil
                  </Link>
                </Button>
                <Button asChild className="h-10 rounded-xl bg-orange-500 text-white hover:bg-orange-600">
                  <Link href="/member-membership">Mitgliedschaft</Link>
                </Button>
                <Button asChild variant="outline" className="h-10 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Link href="/chat-app">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Chat
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-10 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Link href="/member-availability">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Aufstellung
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3">
              <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.055] p-3 backdrop-blur-sm sm:p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">Teams</div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="text-2xl font-black text-white">{teamMemberships.length}</div>
                  <Users className="h-5 w-5 text-orange-400" />
                </div>
              </div>
              <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.055] p-3 backdrop-blur-sm sm:p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 sm:text-[11px] sm:tracking-[0.16em]">
                  Nächstes Spiel
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div className="whitespace-nowrap text-[11px] font-black leading-none text-white sm:text-sm">
                    {nextMatchSummary ? formatCompactDate((nextMatchSummary.match as any).match_date) : "Noch offen"}
                  </div>
                  <Calendar className="hidden h-5 w-5 shrink-0 text-orange-400 sm:block" />
                </div>
              </div>
              <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.055] p-3 backdrop-blur-sm sm:p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">Team-Chat</div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="text-2xl font-black text-white">{totalUnread}</div>
                  <MessageCircle className="h-5 w-5 text-orange-400" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Hinweise */}
        {!membershipAccessLoading && (showNormalMembershipExpiry || expiringTrials.length > 0) ? (
          <div className="mt-4 space-y-2.5">
            {showNormalMembershipExpiry && normalMembershipEndsOn ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="font-black text-slate-950">Mitgliedschaft läuft bald aus</div>
                    <div className="mt-0.5 text-sm text-slate-600">
                      Freigeschaltet bis {formatShortDateAT(normalMembershipEndsOn)}.
                    </div>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-xl border-amber-200 bg-white">
                  <Link href="/member-membership">Ansehen</Link>
                </Button>
              </div>
            ) : null}

            {expiringTrials.map((trial: any) => (
              <div key={trial.id} className="flex flex-col gap-3 rounded-2xl border border-violet-200/80 bg-violet-50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <Gift className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="font-black text-slate-950">Testphase: {trialModuleLabel(trial.module_code)}</div>
                    <div className="mt-0.5 text-sm text-slate-600">Kostenlos bis {formatShortDateAT(trial.ends_on)}.</div>
                  </div>
                </div>
                <div className="text-xs font-black text-violet-700">Noch {trial.daysLeft} Tage</div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Hauptbereich */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
          <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_38px_-28px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Nächstes Spiel</div>
                <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                  {nextMatchSummary ? "Dein nächster Termin" : "Aktuell kein Spiel geplant"}
                </h2>
              </div>
              <Button
                size="sm"
                disabled={!nextMatchSummary}
                onClick={() => nextMatchSummary && router.push(`/member-availability?matchId=${(nextMatchSummary.match as any).id}`)}
                className="rounded-xl bg-slate-950 px-3.5 text-white hover:bg-slate-800"
              >
                Öffnen
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 sm:p-5">
              {!nextMatchSummary ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Sobald ein neues Ligaspiel feststeht, erscheint es hier.
                </div>
              ) : (
                <>
                  <div className="rounded-2xl bg-slate-950 px-4 py-5 text-white sm:px-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">Begegnung</div>
                        <div className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
                          {getTeamDisplayName(nextMatchSummary.match, true)}
                          <span className="mx-2 font-medium text-white/30">vs</span>
                          {getTeamDisplayName(nextMatchSummary.match, false)}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Start in</div>
                        <div className="mt-0.5 whitespace-nowrap text-sm font-black text-orange-300">
                          {countdown || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                        <Calendar className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Termin</div>
                        <div className="text-sm font-bold leading-snug text-slate-800">
                          {formatDate((nextMatchSummary.match as any).match_date)}
                          {(nextMatchSummary.match as any).match_time ? ` · ${formatTime((nextMatchSummary.match as any).match_time)}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                        <MapPin className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Ort</div>
                        <div className="truncate text-sm font-bold text-slate-800">{(nextMatchSummary.match as any).venue || "Noch offen"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: "Zusagen", value: nextMatchSummary.counts.yes, dot: "bg-emerald-500" },
                      { label: "Vielleicht", value: nextMatchSummary.counts.maybe, dot: "bg-amber-500" },
                      { label: "Absagen", value: nextMatchSummary.counts.no, dot: "bg-rose-500" },
                      { label: "Offen", value: nextMatchSummary.counts.none, dot: "bg-slate-300" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-3 py-3.5">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                          {item.label}
                        </div>
                        <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Dein Status</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {statusBadge(nextMatchSummary.myStatus)}
                        {nextMatchSummary.myLineup === "starter" ? (
                          <Badge className="rounded-full bg-orange-500 text-white">Stamm</Badge>
                        ) : nextMatchSummary.myLineup === "substitute" ? (
                          <Badge variant="secondary" className="rounded-full">Ersatz</Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full bg-white">Noch nicht aufgestellt</Badge>
                        )}
                      </div>
                    </div>
                    <p className="max-w-md text-sm leading-relaxed text-slate-600">
                      {getAvailabilityNudge(nextMatchSummary.myStatus, nextMatchSummary.myLineup)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_-28px_rgba(15,23,42,0.28)] sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Auf einen Blick</div>
                  <h2 className="mt-1 text-lg font-black text-slate-950">Liga-Statistik</h2>
                </div>
                <BarChart3 className="h-5 w-5 text-orange-500" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { label: "Legs gewonnen", value: statistics.legsWon },
                  { label: "Siegquote", value: `${statistics.winPercentage}%` },
                  { label: "Leg-Bilanz", value: `${statistics.legsWon}:${statistics.legsLost}` },
                  { label: "180er", value: statistics.total180s },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-slate-50 px-3 py-3.5 ring-1 ring-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{stat.label}</div>
                    <div className="mt-1.5 text-xl font-black tracking-tight text-slate-950">{stat.value}</div>
                  </div>
                ))}
              </div>
            </section>

            {totalUnread > 0 ? (
              <button
                type="button"
                onClick={() => router.push('/chat-app')}
                className="group w-full rounded-[24px] border border-orange-200 bg-orange-50 p-4 text-left transition hover:border-orange-300 hover:bg-orange-100/70 sm:p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-600">Team-Chat</div>
                    <div className="mt-1 text-lg font-black text-slate-950">{totalUnread} neue Nachricht{totalUnread === 1 ? '' : 'en'}</div>
                    <div className="mt-1 text-sm text-slate-600">Direkt zu deinen Team-Chats</div>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                </div>
              </button>
            ) : null}
          </aside>
        </div>

        {hasClubRole ? (
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="group mt-4 flex w-full items-center justify-between gap-4 overflow-hidden rounded-[24px] border border-slate-800 bg-slate-950 px-4 py-4 text-left text-white shadow-[0_18px_42px_-30px_rgba(15,23,42,0.7)] transition hover:-translate-y-0.5 sm:px-5"
          >
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Vereinsbereich</div>
              <div className="mt-1 text-lg font-black">Admin & Verwaltung</div>
              <div className="mt-0.5 text-sm text-white/55">Beiträge, Teams und Organisation</div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 transition group-hover:bg-orange-500">
              <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        ) : null}

        {/* Bereiche */}
        <div className="mt-7 space-y-7 sm:mt-8">
          {navigationGroups.map((group) => {
            const visibleItems = group.items.filter((item: any) => !item.requiresLeadership || isLeadershipRole())
            if (visibleItems.length === 0) return null

            return (
              <section key={group.title}>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-950">{group.title}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">{group.description}</p>
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleItems.map((item: any) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => router.push(item.href)}
                        className="group flex min-h-[104px] w-full items-center gap-3.5 rounded-[20px] border border-slate-200 bg-white p-3.5 text-left shadow-[0_12px_30px_-28px_rgba(15,23,42,0.35)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_38px_-28px_rgba(15,23,42,0.38)] sm:p-4"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100 transition group-hover:bg-orange-50 group-hover:ring-orange-100">
                          <Icon className="h-5 w-5 text-slate-500 transition group-hover:text-orange-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-sm font-black text-slate-950">{item.title}</div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
                          </div>
                          <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 sm:text-sm">{item.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        {/* Teams */}
        {hasMultipleTeams ? (
          <section className="mt-7 rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Deine Teams</div>
                <div className="mt-1 text-lg font-black text-slate-950">{teamMemberships.length} aktive Teams</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {teamMemberships.map((membership: any) => (
                <div key={membership.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  {getRoleIcon(membership.role)}
                  <span className="font-bold text-slate-800">{membership.teams?.name || 'Team'}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{getRoleLabel(membership.role)}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Konto */}
        <section className="mt-7 flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Konto</div>
            <div className="mt-1 text-base font-black text-slate-950">Kontoeinstellungen</div>
            <div className="mt-0.5 text-sm text-slate-500">Profil verwalten oder eine Löschanfrage stellen.</div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/profil-daten-app">Profil bearbeiten</Link>
            </Button>
            <Button variant="outline" onClick={() => router.push('/konto-loeschen')} className="rounded-xl border-red-200 text-red-700 hover:bg-red-50">
              <Trash2 className="mr-2 h-4 w-4" />
              Löschen
            </Button>
          </div>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="mx-auto mt-6 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-400 transition hover:bg-white hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </main>

      {/* Foto Dialog */}
      {isPhotoDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full rounded-t-[28px] border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-[28px] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Profil</div>
                <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">Profilfoto ändern</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPhotoDialogOpen(false)
                  setPhotoFile(null)
                  setPhotoPreview(null)
                  setPhotoMessage("")
                }}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600"
              >
                Schließen
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center transition hover:border-orange-300 hover:bg-orange-50/40">
                <input type="file" accept="image/*" onChange={handlePhotoFileChange} className="hidden" />
                <Upload className="mx-auto h-5 w-5 text-orange-600" />
                <div className="mt-2 text-sm font-black text-slate-800">Foto auswählen</div>
                <div className="mt-0.5 text-xs text-slate-500">JPG, PNG oder WEBP</div>
              </label>

              {photoPreview && (
                <div className="rounded-2xl bg-slate-50 p-4 text-center">
                  <img src={photoPreview || "/placeholder.svg"} alt="Vorschau" className="mx-auto h-28 w-28 rounded-full object-cover ring-4 ring-white shadow-lg" />
                </div>
              )}

              {photoMessage && (
                <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${photoMessage.includes("Fehler") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{photoMessage}</p>
              )}

              <Button onClick={handlePhotoUpload} disabled={!photoFile || photoUploading} className="h-11 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                {photoUploading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wird hochgeladen...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" />Foto speichern</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </div>
  )
}
