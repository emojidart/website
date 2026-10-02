"use client"

export const dynamic = "force-dynamic"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import {
  Users,
  Shield,
  Eye,
  Trophy,
  Settings,
  List,
  PlusCircle,
  Mail,
  CalendarCheck,
  ChevronRight,
  Home,
  BellRing,
  Target,
  HelpCircle,
  PartyPopper,
  Calendar,
  Zap,
  Activity,
  CreditCard,
  Video,
  UserPlus,
  ImageUp,
  Inbox,
} from "lucide-react"

import { AuthSection } from "@/components/auth-section"
import { PlayerListModal } from "@/components/player-list-modal"
import { PlayerRegistration } from "@/components/player-registration"
import { PlayerManagement } from "@/components/player-management"
import { ClubPlayerTeamManagement } from "./_komponenten/vereinsverwaltung/verwaltung"
import SeasonSettingsPage from "@/app/admin/season_settings/page"
import { AdminPushManagement } from "./_komponenten/push-nachrichten"
import { PlayerRecruitmentForm } from "@/components/player-recruitment-form"
import { PlayerRecruitmentList } from "@/components/player-recruitment-list"
import { PlayerApplicationsList } from "@/components/player-applications-list"
import { EventsManagement } from "./_komponenten/veranstaltungen"
import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RealtimeChannel } from "@supabase/supabase-js"
import Link from "next/link"
import { UserManagement } from "@/components/user-management"
import { AdminBonusManagement } from "./_komponenten/bonus/bonussystem"
import { AdminSpieldatenbankManagement } from "./_komponenten/turniere/spieldatenbank/verwaltung"
import { LeagueManagement, type LeagueMailboxPrefill } from "@/components/league-management"
import { RolePermissionsManager } from "./_komponenten/rechteverwaltung"
import { AdminMembersLevelManagement } from "./_komponenten/turniere/members-cup-einstufung"
import { BonusVergabeManagement } from "./_komponenten/bonus/bonusvergabe"
import { AdminPraemienRedemptions } from "./_komponenten/bonus/praemien-ausgabe"
import { AdminMembershipManagement } from "./_komponenten/mitgliedschaften/verwaltung"
import { AdminApprovalsManagement } from "./_komponenten/freigaben"
import { AdminClubMeeting } from "./_komponenten/vereinssitzung"
import { AdminClubhouseManagement } from "./_komponenten/vereinsheim"
import { InternalTournamentEventsAdmin } from "./_komponenten/turniere/interne-veranstaltungen"
import { AdminTournamentCenter } from "./_komponenten/turniere/turnier-zentrale"
import { PackageCheck } from "lucide-react"
import { AdminNavigation } from "./_komponenten/navigation"
import { AdminDashboard } from "./_komponenten/dashboard"
import { AdminProfileChangeRequests } from "./_komponenten/profil-aenderungen"
import { AdminLeagueMailbox } from "./_komponenten/ligapostfach"
import { ADMIN_CATEGORY_LABELS, ADMIN_PAGES } from "./_konfiguration/admin-seiten"

export default function AdminPage() {
  const { session, user, loading: authLoading, authMessage, setAuthMessage, isAdmin, adminLoading } = useAuth()

  const [isPlayerListModalOpen, setIsPlayerListModalOpen] = useState(false)
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null)
  const [isPlayerSelectedViaModal, setIsPlayerSelectedViaModal] = useState(false)
  const [navQuery, setNavQuery] = useState("")
  const [adminViewRestored, setAdminViewRestored] = useState(false)
  const [dataViewKey, setDataViewKey] = useState(0)

  const [loggingOut, setLoggingOut] = useState(false)

  const [currentView, setCurrentView] = useState<
    | "dashboard"
    | "players"

    | "results"
    | "management"
    | "photos"
    | "recruitment"
    | "club"
    | "tournaments"
    | "tournament-center"
    | "users"
    | "user-management-internal"
    | "upcoming-tournaments"
    | "player-database"
    | "dart-competition"
    | "leagues"
    | "league-overdue"
    | "support-tickets"
    | "lion-cup-registrations"
    | "tournament-management"
    | "tournament-series"
    | "events"
    | "lion-cup-settings"
    | "role-permissions"
	  | "member-availability-all"
	  | "bonus-system"
	  | "admin-push"
| "members-levels"
| "membership-management"
| "internal-events"
| "bonus-vergabe"
| "praemien-redemptions"
| "guest-requests"
| "approvals"
| "club-meeting"
| "clubhouse"
| "profile-changes"
| "league-mailbox"
  >("dashboard")

  // Admin-Ansicht merken: selbst wenn eine Unterkomponente/Browser die Seite neu lädt,
  // landest du wieder in derselben Kachel statt im Dashboard.
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem("emd-admin-current-view")
      if (saved === "guest-requests") setCurrentView("club")
      else if (saved) setCurrentView(saved as any)
    } catch (error) {
      console.warn("Admin view restore failed:", error)
    } finally {
      setAdminViewRestored(true)
    }
  }, [])

  useEffect(() => {
    if (!adminViewRestored) return
    try {
      window.sessionStorage.setItem("emd-admin-current-view", currentView)
    } catch (error) {
      console.warn("Admin view save failed:", error)
    }
  }, [currentView, adminViewRestored])

  useEffect(() => {
    if (!adminViewRestored || !session || !user?.id) return
    if (currentView !== "membership-management" && currentView !== "approvals") return

    void supabase.auth.getSession().then(() => {
      setDataViewKey((key) => key + 1)
    })
  }, [adminViewRestored, session?.user?.id, user?.id])

  const [allowedViews, setAllowedViews] = useState<Set<string> | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)
  const [adminProfileFlag, setAdminProfileFlag] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [superAdminLoading, setSuperAdminLoading] = useState(true)

  useEffect(() => {
    if (isAdmin) {
      setAdminProfileFlag(true)
      return
    }

    if (!user?.id) {
      setAdminProfileFlag(false)
      return
    }

    let cancelled = false

    void supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.warn("Admin flag load failed:", error)
          return
        }
        setAdminProfileFlag(Boolean(data?.is_admin))
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, isAdmin])

  const stableIsAdmin = isAdmin || adminProfileFlag

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setIsSuperAdmin(false)
          setSuperAdminLoading(false)
        }
        return
      }

      setSuperAdminLoading(true)

      try {
        const { data, error } = await supabase.rpc("is_super_admin")
        if (error) throw error
        if (!cancelled) setIsSuperAdmin(Boolean(data))
      } catch (error) {
        console.warn("Super admin check failed:", error)
        if (!cancelled) setIsSuperAdmin(false)
      } finally {
        if (!cancelled) setSuperAdminLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  
  
  


  useEffect(() => {
    const run = async () => {
      if (!user) {
        setAllowedViews(null)
        return
      }

      // Admins: alles sofort sichtbar.
      // stableIsAdmin berücksichtigt zusätzlich das Profil-Flag und verhindert,
      // dass Admin-Kacheln beim ersten Laden fehlen und erst nach Reload erscheinen.
      if (stableIsAdmin) {
        setAllowedViews(new Set(["*"]))
        return
      }

      setRoleLoading(true)

      try {
       
        const { data: profile, error: profileErr } = await supabase
          .from("user_profiles")
          .select("player_id")
          .eq("user_id", user.id)
          .maybeSingle()

        if (profileErr) throw profileErr

        const playerId = profile?.player_id as string | undefined
        if (!playerId) {
          setAllowedViews(new Set())
          return
        }

      
        const { data: permRows, error: permErr } = await supabase
          .from("user_page_permissions")
          .select("page_key, allowed")
          .eq("player_id", playerId)

        if (permErr) throw permErr

        const allowed = new Set<string>()
        ;(permRows || []).forEach((row: any) => {
          if (row.allowed) allowed.add(row.page_key)
        })

        setAllowedViews(allowed)
      } catch (e) {
        console.error("Permission load error:", e)
        setAllowedViews(new Set())
      } finally {
        setRoleLoading(false)
      }
    }

    run()
    
  }, [user?.id, stableIsAdmin])
  
  
  
  
  
  

  const [unreadApplicationsCount, setUnreadApplicationsCount] = useState(0)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [pendingGuestRequestsCount, setPendingGuestRequestsCount] = useState(0)
  const [pendingJoinRequestsCount, setPendingJoinRequestsCount] = useState(0)
  const [overdueLeagueCount, setOverdueLeagueCount] = useState(0)
  const [pendingProfileChangesCount, setPendingProfileChangesCount] = useState(0)
  const [openLeagueMailboxCount, setOpenLeagueMailboxCount] = useState(0)
  const [leagueMailboxPrefill, setLeagueMailboxPrefill] = useState<LeagueMailboxPrefill | null>(null)

  const fetchOpenLeagueMailboxCount = useCallback(async () => {
    if (!session || !stableIsAdmin) {
      setOpenLeagueMailboxCount(0)
      return
    }

    const { data, error } = await supabase.rpc("league_mail_admin_unread_count")

    if (error) {
      console.warn("Neue Ligapostfach-Antworten konnten nicht gezählt werden:", error)
      setOpenLeagueMailboxCount(0)
      return
    }

    setOpenLeagueMailboxCount(Number(data || 0))
  }, [session, stableIsAdmin])

  useEffect(() => {
    void fetchOpenLeagueMailboxCount()
    if (!session || !stableIsAdmin) return

    const channel = supabase
      .channel("admin_league_mailbox_count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "league_mail_threads" },
        () => void fetchOpenLeagueMailboxCount(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [session, stableIsAdmin, fetchOpenLeagueMailboxCount])

  const fetchPendingProfileChangesCount = useCallback(async () => {
    if (!session || !stableIsAdmin) {
      setPendingProfileChangesCount(0)
      return
    }

    const { count, error } = await supabase
      .from("profile_change_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")

    if (error) {
      console.warn("Offene Profiländerungen konnten nicht gezählt werden:", error)
      setPendingProfileChangesCount(0)
      return
    }

    setPendingProfileChangesCount(count || 0)
  }, [session, stableIsAdmin])

  useEffect(() => {
    void fetchPendingProfileChangesCount()
    if (!session || !stableIsAdmin) return

    const channel = supabase
      .channel("admin_profile_change_requests_count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profile_change_requests" },
        () => void fetchPendingProfileChangesCount(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [session, stableIsAdmin, fetchPendingProfileChangesCount])

  const fetchOverdueLeagueCount = useCallback(async () => {
    if (!session) {
      setOverdueLeagueCount(0)
      return
    }

    try {
      // Gleiche Logik wie in der Ligaverwaltung:
      // aktive Saison, in unserer App noch offen, nicht verschoben und Termin + 24 h überschritten.
      const { data: activeSeason, error: seasonError } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_active", true)
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (seasonError) throw seasonError
      if (!activeSeason?.id) {
        setOverdueLeagueCount(0)
        return
      }

      const { data: rows, error: matchesError } = await supabase
        .from("matches")
        .select("id,match_date,match_time,status,home_score,away_score")
        .eq("season_id", activeSeason.id)

      if (matchesError) throw matchesError

      const now = Date.now()
      const graceMs = 24 * 60 * 60 * 1000

      const count = (rows || []).filter((match: any) => {
        // Verschobene Spiele NICHT pauschal ausblenden:
        // match_date / match_time enthalten bereits den neuen Termin.
        // Erst wenn dieser neue Termin + 24h vorbei ist, wird es überfällig.
        if (match.status === "completed") return false
        if (match.status === "cancelled") return false

        const resultMissing = true

        if (!resultMissing || !match.match_date) return false

        const rawTime = String(match.match_time || "").trim()
        const time = /^\d{1,2}:\d{2}(?::\d{2})?$/.test(rawTime)
          ? rawTime.length === 5
            ? `${rawTime}:00`
            : rawTime
          : "23:59:59"

        const base = new Date(`${match.match_date}T${time}`)
        if (Number.isNaN(base.getTime())) return false

        return now > base.getTime() + graceMs
      }).length

      setOverdueLeagueCount(count)
    } catch (error) {
      console.warn("Überfällige Ligaspiele konnten nicht gezählt werden:", error)
      setOverdueLeagueCount(0)
    }
  }, [session])

  useEffect(() => {
    void fetchOverdueLeagueCount()
    if (!session) return

    const channel = supabase
      .channel("admin_league_overdue_count")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        void fetchOverdueLeagueCount()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "seasons" }, () => {
        void fetchOverdueLeagueCount()
      })
      .subscribe()

    const interval = window.setInterval(() => {
      void fetchOverdueLeagueCount()
    }, 5 * 60 * 1000)

    const onFocus = () => void fetchOverdueLeagueCount()
    window.addEventListener("focus", onFocus)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      void supabase.removeChannel(channel)
    }
  }, [session, fetchOverdueLeagueCount])


const fetchPendingGuestRequestsCount = useCallback(async () => {
  if (!session) {
    setPendingGuestRequestsCount(0)
    return
  }

  const { count, error } = await supabase
    .from("guest_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")

  if (error) {
    console.error("Error fetching pending guest requests count:", error)
    setPendingGuestRequestsCount(0)
    return
  }

  setPendingGuestRequestsCount(count || 0)
}, [session])

useEffect(() => {
  void fetchPendingGuestRequestsCount()

  if (!session) return

  const onGuestRequestsChanged = () => {
    void fetchPendingGuestRequestsCount()
  }

  window.addEventListener("emd:guest-requests-changed", onGuestRequestsChanged)

  const channel = supabase
    .channel("admin_guest_requests_count")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "guest_requests" },
      () => void fetchPendingGuestRequestsCount(),
    )
    .subscribe()

  return () => {
    window.removeEventListener("emd:guest-requests-changed", onGuestRequestsChanged)
    void supabase.removeChannel(channel)
  }
}, [session, fetchPendingGuestRequestsCount])


const fetchPendingJoinRequestsCount = useCallback(async () => {
  if (!session || !stableIsAdmin) {
    setPendingJoinRequestsCount(0)
    return
  }

  const { count, error } = await supabase
    .from("club_join_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")

  if (error) {
    console.warn("Offene Beitrittsanfragen konnten nicht gezählt werden:", error)
    setPendingJoinRequestsCount(0)
    return
  }

  setPendingJoinRequestsCount(count || 0)
}, [session, stableIsAdmin])

useEffect(() => {
  void fetchPendingJoinRequestsCount()

  if (!session || !stableIsAdmin) return

  const channel = supabase
    .channel("admin_club_join_requests_count")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "club_join_requests" },
      () => void fetchPendingJoinRequestsCount(),
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}, [session, stableIsAdmin, fetchPendingJoinRequestsCount])

  const fetchPendingApprovalsCount = useCallback(async () => {
    if (!session || !stableIsAdmin) {
      setPendingApprovalsCount(0)
      return
    }

    const [dachRes, marketRes] = await Promise.all([
      supabase
        .from("dach_events")
        .select("id", { count: "exact", head: true })
        .eq("event_status", "pending"),
      supabase
        .from("dart_marketplace_listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ])

    const dachCount = dachRes.error ? 0 : dachRes.count || 0
    const marketCount = marketRes.error ? 0 : marketRes.count || 0
    setPendingApprovalsCount(dachCount + marketCount)
  }, [session, stableIsAdmin])

  useEffect(() => {
    void fetchPendingApprovalsCount()

    if (!session || !stableIsAdmin) return

    const channel = supabase
      .channel("admin_approvals_count")
      .on("postgres_changes", { event: "*", schema: "public", table: "dach_events" }, () => {
        void fetchPendingApprovalsCount()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dart_marketplace_listings" }, () => {
        void fetchPendingApprovalsCount()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [session, stableIsAdmin, fetchPendingApprovalsCount])


  const fetchUnreadApplicationsCount = useCallback(async () => {
    if (!session) {
      setUnreadApplicationsCount(0)
      return
    }

    // Spielerbewerbungen (Rekrutierung)
    const { count, error } = await supabase
      .from("player_applications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false)

    if (error) {
      console.error("Error fetching unread applications count:", error)
      setUnreadApplicationsCount(0)
    } else {
      setUnreadApplicationsCount(count || 0)
    }
  }, [session])

  useEffect(() => {
    fetchUnreadApplicationsCount()

    let channel: RealtimeChannel | null = null

    if (session) {
      channel = supabase
        .channel("admin_unread_counts")
        .on("postgres_changes", { event: "*", schema: "public", table: "player_applications" }, () => {
          fetchUnreadApplicationsCount()
        })
        .subscribe()
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchUnreadApplicationsCount, session])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      try {
        window.sessionStorage.removeItem("emd-admin-current-view")
      } catch {}
      await supabase.auth.signOut()
      window.location.reload()
    } catch (err: any) {
      console.error("Logout error:", err)
      window.location.reload()
    } finally {
      setLoggingOut(false)
    }
  }

 const handleLoginSuccess = () => {
  setAuthMessage("Erfolgreich angemeldet!")
  fetchUnreadApplicationsCount()
}

  const handleDataSaved = () => {
  if (currentView === "recruitment") {
    // Stay on recruitment view after saving
  }
}

  const handleOpenPlayerList = () => {
    setIsPlayerListModalOpen(true)
  }

  const handleSelectPlayer = (name: string) => {
    setSelectedPlayerName(name)
    setIsPlayerSelectedViaModal(true)
  }

  const handlePlayerNameChange = (name: string) => {
    setSelectedPlayerName(name)
    setIsPlayerSelectedViaModal(false)
  }

  const openAdminView = async (view: typeof currentView) => {
    if (view === "guest-requests") {
      setCurrentView("club")
      return
    }

    if (view === "member-availability-all") {
      setCurrentView("member-availability-all")
      return
    }

    if (view === "league-overdue") {
      setCurrentView("league-overdue")
      return
    }

    // Bei datenintensiven Bereichen zuerst sicherstellen, dass die
    // Supabase-Session im Browser wirklich bereit ist.
    if (view === "membership-management" || view === "approvals" || view === "internal-events") {
      await supabase.auth.getSession()
      setDataViewKey((key) => key + 1)
    }

    setCurrentView(view)
  }

  const dashboardCards = [
    ...ADMIN_PAGES
      .filter((page) => page.showOnDashboard !== false && page.key !== "dashboard" && !["history", "campus-registrations", "credit-loader", "advent-quiz"].includes(page.key))
      .filter((page) => !page.superAdminOnly || isSuperAdmin)
      .map((page) => ({
        title: page.title,
        description: page.description,
        icon: page.icon,
        color: "bg-orange-600",
        view: page.key as typeof currentView,
        category:
          page.category === "league" || page.category === "tournaments"
            ? ("sport" as const)
            : ("verein" as const),
        badge:
          page.key === "recruitment"
            ? unreadApplicationsCount > 0 ? unreadApplicationsCount : undefined
            : page.key === "approvals"
              ? pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
              : page.key === "club"
                ? pendingGuestRequestsCount + pendingJoinRequestsCount > 0
                  ? pendingGuestRequestsCount + pendingJoinRequestsCount
                  : undefined
                : undefined,
      })),
    {
      title: "Ligapostfach",
      description: "Nachrichten, Antworten und Liga-Kommunikation",
      icon: Inbox,
      color: "bg-orange-600",
      view: "league-mailbox" as typeof currentView,
      category: "sport" as const,
      badge: openLeagueMailboxCount > 0 ? openLeagueMailboxCount : undefined,
    },
    {
      title: "Profiländerungen",
      description: "Namens- und Profilbild-Anfragen prüfen",
      icon: ImageUp,
      color: "bg-orange-600",
      view: "profile-changes" as typeof currentView,
      category: "verein" as const,
      badge: pendingProfileChangesCount > 0 ? pendingProfileChangesCount : undefined,
    },
  ]

  const visibleDashboardCards = dashboardCards.filter((card) => {
    // Für echte Admins alle Kacheln sofort stabil anzeigen.
    if (stableIsAdmin) return true

    // Während Rechte laden: bekannte Navigation nicht kurz leer rendern.
    if (allowedViews === null) return true
    if (allowedViews.has("*")) return true
    if (card.view === "role-permissions") return false

    return (
      allowedViews.has(card.view) ||
      card.view === "members-levels" ||
      card.view === "bonus-vergabe" ||
      card.view === "praemien-redemptions" ||
      card.view === "guest-requests"
    )
  })

 const canSeeView = (viewKey: string) => {
  if (viewKey === "dashboard") return true
  if (viewKey === "role-permissions") return isSuperAdmin
  if (viewKey === "profile-changes") return stableIsAdmin
  if (viewKey === "league-mailbox") return stableIsAdmin
  if (stableIsAdmin) return true
  if (viewKey === "approvals") return stableIsAdmin
  if (viewKey === "membership-management") {
    return stableIsAdmin || allowedViews?.has("membership-management") === true || allowedViews?.has("*") === true
  }
  if (viewKey === "league-overdue") {
    return stableIsAdmin || allowedViews?.has("leagues") === true || allowedViews?.has("*") === true
  }

  if (allowedViews?.has("*")) return true
  if (allowedViews === null) return false

  if (
    viewKey === "members-levels" ||
    viewKey === "bonus-vergabe" ||
    viewKey === "praemien-redemptions" ||
    viewKey === "guest-requests"
  ) return true

  if (
    viewKey === "results" &&
    allowedViews.has("dart-competition")
  ) {
    return true
  }

  return allowedViews.has(viewKey)
}

  const navSections = (
    ["overview", "league", "tournaments", "club", "communication", "system"] as const
  )
    .map((category) => {
      const items = ADMIN_PAGES
        .filter(
          (page) =>
            page.category === category &&
            page.showInNavigation !== false &&
            !["internal-events", "history", "campus-registrations", "credit-loader", "advent-quiz"].includes(page.key) &&
            (!page.superAdminOnly || isSuperAdmin),
        )
        .map((page) => ({
          key: page.key,
          label: page.key === "member-availability-all" ? "Aufstellungen & Zusagen" : page.title,
          icon: page.icon,
          badge:
            page.key === "recruitment"
              ? unreadApplicationsCount > 0 ? unreadApplicationsCount : undefined
              : page.key === "approvals"
                ? pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
                : page.key === "club"
                  ? pendingGuestRequestsCount + pendingJoinRequestsCount > 0
                    ? pendingGuestRequestsCount + pendingJoinRequestsCount
                    : undefined
                  : undefined,
        }))

      if (category === "league") {
        items.push({
          key: "league-overdue" as any,
          label: "Überfällig",
          icon: BellRing,
          badge: overdueLeagueCount > 0 ? overdueLeagueCount : undefined,
        })

        items.push({
          key: "internal-events" as any,
          label: "Interner Ligabetrieb",
          icon: UserPlus,
          badge: undefined,
        })

        items.push({
          key: "league-mailbox" as any,
          label: "Ligapostfach",
          icon: Inbox,
          badge: openLeagueMailboxCount > 0 ? openLeagueMailboxCount : undefined,
        })
      }

      if (category === "club") {
        items.push({
          key: "profile-changes" as any,
          label: "Profiländerungen",
          icon: ImageUp,
          badge: pendingProfileChangesCount > 0 ? pendingProfileChangesCount : undefined,
        })
      }

      return {
        label: category === "league" ? "SPORTDART" : ADMIN_CATEGORY_LABELS[category],
        items,
      }
    })
    .filter((section) => section.items.length > 0)

  const filteredNavSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((it) => {
        const matches = !navQuery || it.label.toLowerCase().includes(navQuery.toLowerCase())
        return matches && canSeeView(it.key)
      }),
    }))
    .filter((section) => section.items.length > 0)

 

  useEffect(() => {
    if (superAdminLoading) return
    if (currentView === "role-permissions" && !isSuperAdmin) {
      setCurrentView("dashboard")
    }
  }, [currentView, isSuperAdmin, superAdminLoading])

  const dashboardByNavSection = {
  "Ligabetrieb": visibleDashboardCards.filter((c) =>
    ["leagues", "member-availability-all", "league-mailbox"].includes(c.view)
  ),
  "Turnierbetrieb": visibleDashboardCards.filter((c) =>
    [
  "tournament-center",
  "dart-competition",
  "player-database",
  "members-levels",
  "internal-events"
].includes(c.view)
  ),
"Verein": visibleDashboardCards.filter((c) =>
  [
    "users",
    "membership-management",
    "recruitment",
    "approvals",
    "events",
    "clubhouse",
    "club-meeting",
    "club",
    "support-tickets",
    "admin-push",
    "bonus-system",
    "bonus-vergabe",
    "praemien-redemptions",
    "profile-changes",
  ].includes(c.view)
),
} as const
  if (authLoading || adminLoading || superAdminLoading || !adminViewRestored) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="w-full min-w-0 max-w-full overflow-x-hidden p-4 md:p-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Berechtigungen werden geprüft...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ✅ Zugriff jetzt über user_page_permissions (allowedViews), nicht mehr über clubRoles
if (session && !isAdmin) {
  // solange Berechtigungen laden: Spinner
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="w-full min-w-0 max-w-full overflow-x-hidden px-2 py-4 sm:px-4 md:p-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Berechtigungen werden geprüft...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const hasAnyPermission = allowedViews.has("*") || allowedViews.size > 0

if (!hasAnyPermission) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="w-full pt-14 p-4 md:p-8">
        <div className="flex items-center justify-center py-12">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl text-gray-900">
                Zugriff verweigert
              </CardTitle>
            </CardHeader>

            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                Sie haben keine Berechtigung für diesen Bereich.
              </p>

              <div className="space-y-3">
                <Link href="/member-profile-app">
                  <Button className="w-full">
                    Zum Member-Dashboard
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full bg-transparent"
                >
                  Abmelden
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
}

 return (
  <div className="min-h-screen bg-gray-50">
    <Header />

    {/* Abstand für fixed Header (damit nix abgeschnitten ist) */}
    <div className="h-12 sm:h-14" aria-hidden="true" />

    <main className="w-full p-4 md:p-8">
        {!session ? (
          <div className="w-full max-w-none">
            <AuthSection
              isVisible={true}
              onLoginSuccess={handleLoginSuccess}
              authMessage={authMessage}
              setAuthMessage={setAuthMessage}
            />
          </div>
        ) : (
          <div className="flex w-full min-w-0 max-w-full flex-col gap-4 overflow-x-hidden lg:flex-row lg:gap-6">
            <AdminNavigation
              sections={filteredNavSections}
              currentView={currentView}
              query={navQuery}
              onQueryChange={setNavQuery}
              onNavigate={(key) => void openAdminView(key as typeof currentView)}
              onLogout={handleLogout}
              loggingOut={loggingOut}
              alignWithBreadcrumb={currentView === "tournament-center"}
            />

            {/* Main content */}
            <section className="w-full min-w-0 max-w-full flex-1 space-y-6 overflow-x-hidden lg:w-0">
              <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden">
                {currentView !== "dashboard" ? (
                  <div className="emd-admin-breadcrumb hidden lg:flex items-center justify-between rounded-2xl px-4 py-3">
                    <div className="text-sm font-bold text-gray-600">
                      Admin / <span className="text-gray-900">{filteredNavSections.flatMap((section) => section.items).find((item) => item.key === currentView)?.label || "Bereich"}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void openAdminView("dashboard")}
                      className="emd-admin-overview-button rounded-xl"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Übersicht
                    </Button>
                  </div>
                ) : null}

                {authMessage && (
                  <div
                    className={`p-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                      authMessage.includes("fehler") || authMessage.includes("Error")
                        ? "bg-red-50 text-red-700 border border-red-100"
                        : "bg-green-50 text-green-700 border border-green-100"
                    }`}
                  >
                    {authMessage}
                  </div>
                )}

                {currentView === "dashboard" && (
                  <AdminDashboard
                    sections={filteredNavSections}
                    dashboardCards={visibleDashboardCards}
                    unreadApplicationsCount={unreadApplicationsCount}
                    unreadCampusCount={0}
                    pendingApprovalsCount={pendingApprovalsCount}
                    pendingGuestRequestsCount={pendingGuestRequestsCount}
                    pendingJoinRequestsCount={pendingJoinRequestsCount}
                    onOpen={(key) => void openAdminView(key as typeof currentView)}
                  />
                )}

                {currentView === "players" && <PlayerRegistration isVisible={true} user={user} onDataSaved={handleDataSaved} />}
                {currentView === "management" && <PlayerManagement isVisible={true} user={user} onDataSaved={handleDataSaved} />}
               
                {(currentView === "leagues" ||
                  currentView === "member-availability-all" ||
                  currentView === "league-overdue") && (
                  <LeagueManagement
                    key={`league-management-${currentView}`}
                    initialTab={
                      currentView === "member-availability-all"
                        ? "lineups"
                        : currentView === "league-overdue"
                          ? "overdue"
                          : "overview"
                    }
                    onOpenMailbox={(prefill) => {
                      setLeagueMailboxPrefill(prefill || null)
                      setCurrentView("league-mailbox")
                    }}
                  />
                )}

                {currentView === "support-tickets" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <HelpCircle className="h-5 w-5" />
                          <span>Support Tickets verwalten</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">
                          Hier können Sie alle Support-Anfragen von Vereinsmitgliedern einsehen und bearbeiten.
                        </p>
                        <div className="space-y-3">
                          <Link href="/admin/support-tickets">
                            <Button className="w-full">
                              <HelpCircle className="h-4 w-4 mr-2" />
                              Support Tickets verwalten
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {currentView === "approvals" && (
                  <div className="space-y-6">
                    {session && stableIsAdmin ? (
                      <AdminApprovalsManagement
                        key={`approvals-${user?.id || "admin"}-${dataViewKey}`}
                      />
                    ) : (
                      <div className="flex items-center justify-center py-10">
                        <div className="text-sm font-semibold text-gray-500">
                          Freigaben werden geladen...
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {currentView === "profile-changes" && (
                  <AdminProfileChangeRequests
                    onPendingCountChange={setPendingProfileChangesCount}
                  />
                )}

                {currentView === "league-mailbox" && (
                  <AdminLeagueMailbox
                    onOpenCountChange={setOpenLeagueMailboxCount}
                    prefill={leagueMailboxPrefill}
                    onPrefillConsumed={() => setLeagueMailboxPrefill(null)}
                  />
                )}

                {currentView === "clubhouse" && (
                  <div className="space-y-6">
                    <AdminClubhouseManagement />
                  </div>
                )}

                {currentView === "club-meeting" && (
                  <div className="space-y-6">
                    <AdminClubMeeting />
                  </div>
                )}

                {currentView === "events" && (
                  <EventsManagement user={user} />
                )}
				
				{currentView === "admin-push" && (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BellRing className="h-5 w-5" />
          <span>Push Nachrichten</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <AdminPushManagement user={user} />
      </CardContent>
    </Card>
  </div>
)}


{currentView === "members-levels" && (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5" />
          <span>EMD Members Cup Einstufung</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <AdminMembersLevelManagement user={user} />
      </CardContent>
    </Card>
  </div>
)}

{currentView === "bonus-system" && (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5" />
          <span>Bonussystem</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <AdminBonusManagement user={user} />
      </CardContent>
    </Card>
  </div>
)}

{currentView === "bonus-vergabe" && (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5" />
          <span>Bonusvergabe</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <BonusVergabeManagement user={user} />
      </CardContent>
    </Card>
  </div>
)}

{currentView === "praemien-redemptions" && (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <PackageCheck className="h-5 w-5" />
          <span>Prämien-Ausgabe</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <AdminPraemienRedemptions user={user} />
      </CardContent>
    </Card>
  </div>
)}


{currentView === "internal-events" && (
  <InternalTournamentEventsAdmin />
)}

{currentView === "membership-management" && (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Mitgliedschaften & Module</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {user?.id ? (
          <AdminMembershipManagement
            key={`membership-management-${user.id}-${dataViewKey}`}
            user={user}
          />
        ) : (
          <div className="flex items-center justify-center py-10">
            <div className="text-sm font-semibold text-gray-500">
              Mitgliedschaften werden geladen...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
)}

                {currentView === "recruitment" && (
                  <div className="space-y-6">
                    <div className="flex space-x-4 border-b border-gray-200">
                      <Button
                        variant="ghost"
                        className="pb-2 border-b-2 border-transparent data-[active=true]:border-red-500 data-[active=true]:text-red-600"
                        data-active={true}
                      >
                        Rekrutierung verwalten
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <PlusCircle className="h-5 w-5" />
                            <span>Rekrutierungsbedarf eingeben</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <PlayerRecruitmentForm user={user} onDataSaved={handleDataSaved} />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <List className="h-5 w-5" />
                            <span>Aktuelle Rekrutierungen</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <PlayerRecruitmentList onDataSaved={handleDataSaved} />
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Mail className="h-5 w-5" />
                          <span>Spielerbewerbungen</span>
                          {unreadApplicationsCount > 0 && (
                            <Badge className="bg-orange-500 text-white rounded-full px-2 py-0.5 text-xs">
                              {unreadApplicationsCount}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <PlayerApplicationsList onDataChanged={fetchUnreadApplicationsCount} />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {currentView === "role-permissions" && isSuperAdmin && (
                  <RolePermissionsManager />
                )}

                {currentView === "users" && (
                  <div className="space-y-6">
                    <Card className="border-0 shadow-md">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Users className="h-5 w-5" />
                          <span>Benutzerverwaltung</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">Konten, Registrierungen und Aktivität der Mitglieder verwalten.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <Button
                            onClick={() => setCurrentView("user-management-internal")}
                            variant="outline"
                            className="w-full justify-start bg-transparent h-auto p-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-blue-50">
                                <Users className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex flex-col items-start">
                                <span className="font-semibold">Benutzer bearbeiten</span>
                                <span className="text-xs text-gray-500">Rollen, Zuordnung, Spieler</span>
                              </div>
                            </div>
                          </Button>

                          <Link href="/admin/users">
                            <Button variant="outline" className="w-full justify-start bg-transparent h-auto p-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-50">
                                  <Activity className="h-5 w-5 text-green-600" />
                                </div>
                                <div className="flex flex-col items-start">
                                  <span className="font-semibold">Online Übersicht</span>
                                  <span className="text-xs text-gray-500">Zuletzt online & registriert</span>
                                </div>
                              </div>
                            </Button>
                          </Link>

                          {isAdmin && (
                            <Button
                              onClick={() => setCurrentView("role-permissions")}
                              variant="outline"
                              className="w-full justify-start bg-transparent h-auto p-4"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-red-50">
                                  <Shield className="h-5 w-5 text-red-600" />
                                </div>
                                <div className="flex flex-col items-start">
                                  <span className="font-semibold">Rechteverwaltung</span>
                                  <span className="text-xs text-gray-500">Rollen-Rechte festlegen</span>
                                </div>
                              </div>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {currentView === "user-management-internal" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="bg-transparent" onClick={() => setCurrentView("users")}>
                        Zurück
                      </Button>
                    </div>

                    <UserManagement user={user} onDataSaved={handleDataSaved} />
                  </div>
                )}

                {currentView === "club" && <ClubPlayerTeamManagement user={user} onDataSaved={handleDataSaved} />}

                {currentView === "tournament-center" && (
                  <AdminTournamentCenter
                    onOpen={(view) => void openAdminView(view as typeof currentView)}
                    canOpen={canSeeView}
                  />
                )}

                {currentView === "tournaments" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Turnier-Tools</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <Link href="/kratzer-tournament">
                            <Button variant="outline" className="w-full justify-start bg-transparent">
                              <Trophy className="h-4 w-4 mr-2" />
                              Kratzer-Turnier
                            </Button>
                          </Link>
                          <Link href="/dko_tournament_registration">
                            <Button variant="outline" className="w-full justify-start bg-transparent">
                              <Trophy className="h-4 w-4 mr-2" />
                              DKO | Round Robin Turnier
                            </Button>
                          </Link>

                          <Link href="/admin/turnier_spieltage_starten">
                            <Button variant="outline" className="w-full justify-start bg-transparent">
                              <Trophy className="h-4 w-4 mr-2" />
                              Turnierserie starten
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {currentView === "player-database" && (
                  <AdminSpieldatenbankManagement user={user} />
                )}

                {currentView === "dart-competition" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Trophy className="h-5 w-5" />
                          <span>EMD - LION CUP Verwaltung</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
                          <Button
                            onClick={() => setCurrentView("management")}
                            variant="outline"
                            className="w-full justify-start bg-transparent h-auto p-4"
                          >
                            <div className="flex flex-col items-start space-y-1">
                              <div className="flex items-center space-x-2">
                                <Settings className="h-4 w-4" />
                                <span className="font-medium">Spielerverwaltung</span>
                              </div>
                              <span className="text-xs text-gray-500">EMD - LION CUP</span>
                            </div>
                          </Button>

                          <Button
                            onClick={() => setCurrentView("lion-cup-settings")}
                            variant="outline"
                            className="w-full justify-start bg-transparent h-auto p-4"
                          >
                            <div className="flex flex-col items-start space-y-1">
                              <div className="flex items-center space-x-2">
                                <Settings className="h-4 w-4" />
                                <span className="font-medium">Lion Cup Settings</span>
                              </div>
                              <span className="text-xs text-gray-500">EMD - LION CUP</span>
                            </div>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {currentView === "tournament-management" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Settings className="h-5 w-5" />
                          <span>Turnier verwalten</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">Zentrale Verwaltung für Turnier-Struktur, Serien und Spieltage.</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Link href="/admin/tournaments">
                            <Button className="w-full justify-start" variant="outline">
                              <Settings className="h-4 w-4 mr-2" />
                              Turnierverwaltung
                            </Button>
                          </Link>

                          <Link href="/admin/tournament-schedules">
                            <Button className="w-full justify-start" variant="outline">
                              <Trophy className="h-4 w-4 mr-2" />
                              Turnier-Serien & Spieltage
                            </Button>
                          </Link>

                          <Link href="/admin/turnierserie-bearbeiten">
                            <Button className="w-full justify-start" variant="outline">
                              <ChevronRight className="h-4 w-4 mr-2" />
                              Turnier transferieren
                            </Button>
                          </Link>
                        </div>

                        <div className="mt-4 text-xs text-gray-500">
                          Tipp: Serien & Spieltage sind die Basis für Startseite/Upcoming — bitte dort zuerst pflegen.
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {currentView === "tournament-series" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Trophy className="h-5 w-5" />
                          <span>Turnier-Serien & Spieltage</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">Serien anlegen und Spieltage pflegen (inkl. Verschiebungen).</p>
                        <Link href="/admin/tournament-series">
                          <Button className="w-full">
                            <Trophy className="h-4 w-4 mr-2" />
                            Öffnen
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {currentView === "lion-cup-settings" && <SeasonSettingsPage />}
              </div>
            </section>
          </div>
        )}

        <PlayerListModal
          isOpen={isPlayerListModalOpen}
          onClose={() => setIsPlayerListModalOpen(false)}
          onSelectPlayer={handleSelectPlayer}
          fetchAllUniquePlayers={async () => {
            const edart = await fetchPlayers("edart_players")
            const steel = await fetchPlayers("steel_dart_players")
            const uniqueNames = new Set<string>()
            edart.forEach((p) => uniqueNames.add(p.name))
            steel.forEach((p) => uniqueNames.add(p.name))
            return Array.from(uniqueNames).sort()
          }}
        />
      </main>
    </div>
  )
}
