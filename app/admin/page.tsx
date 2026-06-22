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
  History,
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
  UserCheck,
  Activity,
} from "lucide-react"

import { AuthSection } from "@/components/auth-section"
import { PlayerListModal } from "@/components/player-list-modal"
import { GameHistoryTable } from "@/components/game-history-table"
import { PlayerRegistration } from "@/components/player-registration"
import { PlayerManagement } from "@/components/player-management"
import { ClubPlayerTeamManagement } from "@/components/vereinsverwaltung/ClubPlayerTeamManagement"
import SeasonSettingsPage from "@/app/admin/season_settings/page"
import { AdminPushManagement } from "@/components/admin/admin-push-management"
import { PlayerRecruitmentForm } from "@/components/player-recruitment-form"
import { PlayerRecruitmentList } from "@/components/player-recruitment-list"
import { PlayerApplicationsList } from "@/components/player-applications-list"
import { EventsManagement } from "@/components/admin/events-management"
import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RealtimeChannel } from "@supabase/supabase-js"
import Link from "next/link"
import { UserManagement } from "@/components/user-management"
import { AdminBonusManagement } from "@/components/admin/bonus/admin-bonus-management"
import { AdminSpieldatenbankManagement } from "@/components/admin/spieldatenbank/admin-spieldatenbank-management"
import { LeagueManagement } from "@/components/league-management"
import { RolePermissionsManager } from "@/components/role-permissions-manager"
import { AdminMembersLevelManagement } from "@/components/admin/members-champion-cup/admin-members-level-management"
import { BonusVergabeManagement } from "@/components/admin/bonus-vergabe/bonus-vergabe"
import { AdminPraemienRedemptions } from "@/components/admin/bonus/admin-praemien-redemptions"
import { GuestRequestsManagement } from "@/components/admin/guest-requests/guest-requests"
import { PackageCheck } from "lucide-react"

export default function AdminPage() {
  const { session, user, loading: authLoading, authMessage, setAuthMessage, isAdmin, adminLoading } = useAuth()

  const [isPlayerListModalOpen, setIsPlayerListModalOpen] = useState(false)
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null)
  const [isPlayerSelectedViaModal, setIsPlayerSelectedViaModal] = useState(false)
  const [navQuery, setNavQuery] = useState("")

  const [loggingOut, setLoggingOut] = useState(false)

  const [currentView, setCurrentView] = useState<
    | "dashboard"
    | "players"
    | "results"
    | "history"
    | "management"
    | "photos"
    | "recruitment"
    | "club"
    | "tournaments"
    | "users"
    | "user-management-internal"
    | "upcoming-tournaments"
    | "player-database"
    | "dart-competition"
    | "leagues"
    | "support-tickets"
    | "lion-cup-registrations"
    | "tournament-management"
    | "tournament-series"
    | "events"
    | "advent-quiz"
    | "campus-registrations"
    | "credit-loader"
    | "lion-cup-settings"
    | "role-permissions"
	  | "member-availability-all"
	  | "bonus-system"
	  | "admin-push"
| "members-levels"
| "bonus-vergabe"
| "praemien-redemptions"
| "guest-requests"
  >("dashboard")

  const [allowedViews, setAllowedViews] = useState<Set<string> | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)
  
  
  


  useEffect(() => {
    const run = async () => {
      if (!user) {
        setAllowedViews(null)
        return
      }

      // Admins: alles sichtbar
      if (isAdmin) {
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
    
  }, [user?.id, isAdmin])
  
  
  
  
  
  

  const [unreadApplicationsCount, setUnreadApplicationsCount] = useState(0)
  const [unreadCampusCount, setUnreadCampusCount] = useState(0)

  const fetchUnreadApplicationsCount = useCallback(async () => {
    if (!session) {
      setUnreadApplicationsCount(0)
      setUnreadCampusCount(0)
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

    // Campus Registrierungen
    const { count: campusCount, error: campusError } = await supabase
      .from("campus_registrations")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false)

    if (campusError) {
      console.error("Error fetching unread campus registrations count:", campusError)
      setUnreadCampusCount(0)
    } else {
      setUnreadCampusCount(campusCount || 0)
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
        .on("postgres_changes", { event: "*", schema: "public", table: "campus_registrations" }, () => {
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

  const dashboardCards = [
    {
      title: "Benutzerverwaltung",
      description: "Konten, Rollen und Registrierungen verwalten",
      icon: Users,
      color: "bg-blue-500",
      view: "users" as const,
      category: "verein" as const,
    },
    {
      title: "Rekrutierung",
      description: "Spielerbewerbungen & Bedarf verwalten",
      icon: Mail,
      color: "bg-indigo-500",
      view: "recruitment" as const,
      category: "verein" as const,
      badge: unreadApplicationsCount > 0 ? unreadApplicationsCount : undefined,
    },
  
	{
  title: "Bonussystem",
  description: "Bonusregeln und Punkteverwaltung",
  icon: Trophy,
  color: "bg-orange-600",
  view: "bonus-system" as const,
  category: "verein" as const,
},
{
  title: "Bonusvergabe",
  description: "Bonuspunkte an Spieler vergeben",
  icon: Trophy,
  color: "bg-amber-600",
  view: "bonus-vergabe" as const,
  category: "verein" as const,
},
{
  title: "Prämien-Ausgabe",
  description: "Eingelöste Prämien prüfen und abschließen",
  icon: PackageCheck,
  color: "bg-green-600",
  view: "praemien-redemptions" as const,
  category: "verein" as const,
},
{
  title: "Gastzugänge",
  description: "Gastanträge prüfen und freischalten",
  icon: Users,
  color: "bg-cyan-600",
  view: "guest-requests" as const,
  category: "verein" as const,
},
    {
      title: "Veranstaltungen",
      description: "Turniere, Partys & Events verwalten",
      icon: PartyPopper,
      color: "bg-purple-500",
      view: "events" as const,
      category: "verein" as const,
    },
	{
  title: "Push Nachrichten",
  description: "Push an alle oder ausgewählte Spieler senden",
  icon: BellRing,
  color: "bg-orange-500",
  view: "admin-push" as const,
  category: "verein" as const,
},
    {
      title: "Vereinsverwaltung",
      description: "Teams, Spieler & Vereinsdaten pflegen",
      icon: Users,
      color: "bg-teal-500",
      view: "club" as const,
      category: "verein" as const,
    },
    {
      title: "Support Tickets",
      description: "Support-Anfragen bearbeiten",
      icon: HelpCircle,
      color: "bg-red-500",
      view: "support-tickets" as const,
      category: "verein" as const,
    },
    {
      title: "Campus-Registrierungen",
      description: "EMD-CAMPUS Anmeldungen einsehen",
      badge: unreadCampusCount > 0 ? unreadCampusCount : undefined,
      icon: Users,
      color: "bg-pink-500",
      view: "campus-registrations" as const,
      category: "verein" as const,
    },
    {
      title: "Credit-Loader",
      description: "Gutscheine & Credits verwalten",
      icon: Zap,
      color: "bg-violet-500",
      view: "credit-loader" as const,
      category: "verein" as const,
    },
    {
      title: "Ligaspiele",
      description: "Saisons, Spieltage & Liga-Spiele verwalten",
      icon: Target,
      color: "bg-green-600",
      view: "leagues" as const,
      category: "sport" as const,
    },
	    {
      title: "Aufstellungen & Zusagen",
      description: "Spielerverfügbarkeiten / Zusagen verwalten",
      icon: CalendarCheck,
      color: "bg-emerald-600",
      view: "member-availability-all" as const,
      category: "sport" as const,
    },
    {
      title: "Turniere starten",
      description: "Turnier-Tools",
      icon: Trophy,
      color: "bg-amber-500",
      view: "tournaments" as const,
      category: "sport" as const,
    },
	{
  title: "Members Cup Einstufung",
  description: "Tabelle 1 / 2 / 3 Spieler verwalten",
  icon: Trophy,
  color: "bg-orange-600",
  view: "members-levels" as const,
  category: "sport" as const,
},
    {
      title: "Turnier verwalten",
      description: "Serien, Spieltage & Stammdaten zentral pflegen",
      icon: Settings,
      color: "bg-purple-600",
      view: "tournament-management" as const,
      category: "sport" as const,
    },
    {
      title: "Lion Cup",
      description: "Ergebnisse, Historie & Verwaltung",
      icon: Trophy,
      color: "bg-yellow-500",
      view: "dart-competition" as const,
      category: "sport" as const,
    },
    {
      title: "Spielerdatenbank",
      description: "Spielerdaten einsehen & verwalten",
      icon: List,
      color: "bg-slate-500",
      view: "player-database" as const,
      category: "sport" as const,
    },
    {
      title: "Adventskalender Auswertung",
      description: "Quiz-Antworten & Rangliste ansehen",
      icon: Calendar,
      color: "bg-orange-500",
      view: "advent-quiz" as const,
      category: "verein" as const,
    },
  ]

  const visibleDashboardCards = dashboardCards.filter((card) => {
  // Während laden -> erstmal alles anzeigen
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
  if (allowedViews?.has("*")) return true
  if (allowedViews === null) return false

if (
  viewKey === "members-levels" ||
  viewKey === "bonus-vergabe" ||
  viewKey === "praemien-redemptions" ||
  viewKey === "guest-requests"
) return true

  if (
    (viewKey === "results" || viewKey === "history") &&
    allowedViews.has("dart-competition")
  ) {
    return true
  }

  return allowedViews.has(viewKey)
}

  const navSections = [
    {
      label: "Übersicht",
      items: [{ key: "dashboard", label: "Dashboard", icon: Home }],
    },
    {
  label: "Ligabetrieb",
  items: [
    { key: "leagues", label: "Ligaspiele", icon: Target },
    { key: "member-availability-all", label: "Aufstellungen & Zusagen", icon: CalendarCheck },
  ],
},
    {
      label: "Turnierbetrieb",
      items: [
        { key: "tournaments", label: "Turniere", icon: Trophy },
        { key: "tournament-management", label: "Turnier verwalten", icon: Settings },
        { key: "dart-competition", label: "Lion Cup", icon: Trophy },
        { key: "history", label: "Historie", icon: History },
        { key: "player-database", label: "Spielerdatenbank", icon: List },
		{ key: "members-levels", label: "Members Cup Einstufung", icon: Trophy },
      ],
    },
    {
      label: "Verein",
      items: [
        { key: "users", label: "Benutzerverwaltung", icon: Users },
        {
          key: "recruitment",
          label: "Rekrutierung",
          icon: Mail,
          badge: unreadApplicationsCount > 0 ? unreadApplicationsCount : undefined,
        },
        
        { key: "events", label: "Veranstaltungen", icon: PartyPopper },
		{ key: "admin-push", label: "Push Nachrichten", icon: BellRing },
		{ key: "bonus-system", label: "Bonussystem", icon: Trophy },
		{ key: "bonus-vergabe", label: "Bonusvergabe", icon: Trophy },
		{ key: "praemien-redemptions", label: "Prämien-Ausgabe", icon: PackageCheck },
		{ key: "guest-requests", label: "Gastzugänge", icon: Users },
        { key: "club", label: "Vereinsverwaltung", icon: Users },
        { key: "support-tickets", label: "Support Tickets", icon: HelpCircle },
        {
          key: "campus-registrations",
          label: "Campus-Registrierungen",
          icon: Users,
          badge: unreadCampusCount > 0 ? unreadCampusCount : undefined,
        },
        { key: "credit-loader", label: "Credit-Loader", icon: Zap },
        { key: "advent-quiz", label: "Adventskalender", icon: Calendar },
      ],
    },
  ] as const

  const filteredNavSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((it) => {
        const matches = !navQuery || it.label.toLowerCase().includes(navQuery.toLowerCase())
        return matches && canSeeView(it.key)
      }),
    }))
    .filter((section) => section.items.length > 0)

 
  const dashboardByNavSection = {
  "Ligabetrieb": visibleDashboardCards.filter((c) =>
    ["leagues", "member-availability-all"].includes(c.view)
  ),
  "Turnierbetrieb": visibleDashboardCards.filter((c) =>
    [
  "tournaments",
  "tournament-management",
  "dart-competition",
  "history",
  "player-database",
  "members-levels"
].includes(c.view)
  ),
  "Verein": visibleDashboardCards.filter((c) =>
    [
      "users",
      "recruitment",
      "events",
      "club",
      "support-tickets",
      "campus-registrations",
      "credit-loader",
      "advent-quiz",
	  "admin-push",
"bonus-system",
"bonus-vergabe",
"praemien-redemptions",
"guest-requests"
    ].includes(c.view)
  ),
} as const
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="w-full p-4 md:p-8">
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
        <main className="w-full p-4 md:p-8">
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
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-6">
                <div className="bg-white rounded-xl shadow-md border border-gray-100">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900">Navigation</div>
                      <Badge className="bg-gray-100 text-gray-700">Admin</Badge>
                    </div>
                    <div className="mt-3">
                      <input
                        value={navQuery}
                        onChange={(e) => setNavQuery(e.target.value)}
                        placeholder="Suchen..."
                        className="w-full h-9 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                  </div>

                  <div className="p-2">
                    {filteredNavSections.map((section) => (
                      <div key={section.label} className="mb-2">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {section.label}
                        </div>
                        <div className="space-y-1">
                          {section.items.map((item) => (
                            <Button
                              key={item.key}
                              variant="ghost"
                              className={
                                "w-full justify-between px-3 " +
                                (currentView === (item.key as any)
                                  ? "bg-red-50 text-red-700 hover:bg-red-50"
                                  : "text-gray-700 hover:bg-gray-50")
                              }
                              onClick={() => setCurrentView(item.key as any)}
                            >
                              <span className="flex items-center gap-2">
                                <item.icon className="h-4 w-4" />
                                <span className="text-sm">{item.label}</span>
                              </span>
                              {item.badge ? (
                                <span className="text-xs font-semibold bg-orange-500 text-white rounded-full px-2 py-0.5">
                                  {item.badge}
                                </span>
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-300" />
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 border-t border-gray-100">
                    <Button variant="outline" className="w-full bg-transparent" onClick={handleLogout} disabled={loggingOut}>
                      {loggingOut ? "Abmelden..." : "Abmelden"}
                    </Button>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <section className="flex-1 space-y-6">
              {/* Mobile navigation */}
              <div className="lg:hidden">
                <details className="bg-white rounded-xl shadow-md border border-gray-100">
                  <summary className="cursor-pointer select-none p-4 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Menü</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </summary>
                  <div className="px-4 pb-4">
                    <div className="mb-3">
                      <input
                        value={navQuery}
                        onChange={(e) => setNavQuery(e.target.value)}
                        placeholder="Suchen..."
                        className="w-full h-10 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                    <div className="space-y-2">
                      {filteredNavSections.map((section) => (
                        <div key={section.label}>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-2">{section.label}</div>
                          <div className="space-y-1">
                            {section.items.map((item) => (
                              <Button
                                key={item.key}
                                variant="ghost"
                                className={
                                  "w-full justify-between px-3 " +
                                  (currentView === (item.key as any)
                                    ? "bg-red-50 text-red-700 hover:bg-red-50"
                                    : "text-gray-700 hover:bg-gray-50")
                                }
                                onClick={() => setCurrentView(item.key as any)}
                              >
                                <span className="flex items-center gap-2">
                                  <item.icon className="h-4 w-4" />
                                  <span className="text-sm">{item.label}</span>
                                </span>
                                {item.badge ? (
                                  <span className="text-xs font-semibold bg-orange-500 text-white rounded-full px-2 py-0.5">
                                    {item.badge}
                                  </span>
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-300" />
                                )}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <Button variant="outline" className="w-full bg-transparent" onClick={handleLogout} disabled={loggingOut}>
                        {loggingOut ? "Abmelden..." : "Abmelden"}
                      </Button>
                    </div>
                  </div>
                </details>
              </div>

              <div className="space-y-6">
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
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border-0 shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ungelesen</div>
                              <div className="text-2xl font-bold text-gray-900">{unreadApplicationsCount}</div>
                              <div className="text-sm text-gray-600">Spielerbewerbungen</div>
                            </div>
                            <div className="p-3 bg-indigo-50 rounded-xl">
                              <Mail className="h-5 w-5 text-indigo-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-0 shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ungelesen</div>
                              <div className="text-2xl font-bold text-gray-900">{unreadCampusCount}</div>
                              <div className="text-sm text-gray-600">Campus-Registrierungen</div>
                            </div>
                            <div className="p-3 bg-pink-50 rounded-xl">
                              <Users className="h-5 w-5 text-pink-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-0 shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Zugriff</div>
                              <div className="text-2xl font-bold text-gray-900">{allowedViews?.has("*") ? "Alle" : allowedViews?.size ?? 0}</div>
                              <div className="text-sm text-gray-600">Freigeschaltete(r) Bereich(e)</div>
                            </div>
                            <div className="p-3 bg-gray-100 rounded-xl">
                              <Eye className="h-5 w-5 text-gray-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {(["Ligabetrieb", "Turnierbetrieb", "Verein"] as const).map((section) => (
                        <Card key={section} className="border-0 shadow-md">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              {section === "Ligabetrieb" ? (
                                <Target className="h-5 w-5" />
                              ) : section === "Turnierbetrieb" ? (
                                <Trophy className="h-5 w-5" />
                              ) : (
                                <Users className="h-5 w-5" />
                              )}
                              <span>{section}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {dashboardByNavSection[section].map((card) => (
  <button
    key={`${card.view}-${allowedViews?.size ?? 0}`}
    onClick={() => setCurrentView(card.view)}
                                  className="text-left group rounded-xl border border-gray-100 bg-white hover:shadow-lg transition-all duration-200 p-4"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className={`p-3 ${card.color} rounded-xl shadow-sm`}>
                                      <card.icon className="h-5 w-5 text-white" />
                                    </div>
                                    {card.badge ? (
                                      <span className="text-xs font-semibold bg-orange-500 text-white rounded-full px-2 py-0.5">
                                        {card.badge}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-3 font-semibold text-gray-900 group-hover:text-gray-950">
                                    {card.title}
                                  </div>
                                  <div className="mt-1 text-sm text-gray-600">{card.description}</div>
                                </button>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {currentView === "players" && <PlayerRegistration isVisible={true} user={user} onDataSaved={handleDataSaved} />}
                {currentView === "history" && <GameHistoryTable />}
                {currentView === "management" && <PlayerManagement isVisible={true} user={user} onDataSaved={handleDataSaved} />}
               
                {currentView === "leagues" && <LeagueManagement />}
				{currentView === "member-availability-all" && (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CalendarCheck className="h-5 w-5" />
          <span>Aufstellungen & Zusagen</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Öffnet die Übersicht für Verfügbarkeiten / Zusagen aller Mitglieder.
        </p>

        <Link href="/admin/member-availability-all">
          <Button className="w-full">
            <CalendarCheck className="h-4 w-4 mr-2" />
            Öffnen
          </Button>
        </Link>
      </CardContent>
    </Card>
  </div>
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

                {currentView === "events" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <PartyPopper className="h-5 w-5" />
                          <span>Veranstaltungen verwalten</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <EventsManagement user={user} />
                      </CardContent>
                    </Card>
                  </div>
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

{currentView === "guest-requests" && (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Gastzugänge</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <GuestRequestsManagement />
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

                {currentView === "role-permissions" && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold">Rechteverwaltung</h2>
                      <p className="text-sm text-muted-foreground">Lege den Seitenzugriff fest. (z.B. Supervisor).</p>
                    </div>
                    <RolePermissionsManager />
                  </div>
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

                          <Link href="/admin/admin_qr_codes">
                            <Button variant="outline" className="w-full justify-start bg-transparent h-auto p-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-50">
                                  <UserCheck className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="flex flex-col items-start">
                                  <span className="font-semibold">Account Anfragen</span>
                                  <span className="text-xs text-gray-500">QR Codes & Registrierung</span>
                                </div>
                              </div>
                            </Button>
                          </Link>

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
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <List className="h-5 w-5" />
          <span>Spielerdatenbank</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <AdminSpieldatenbankManagement user={user} />
      </CardContent>
    </Card>
  </div>
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
                            onClick={() => setCurrentView("history")}
                            variant="outline"
                            className="w-full justify-start bg-transparent h-auto p-4"
                          >
                            <div className="flex flex-col items-start space-y-1">
                              <div className="flex items-center space-x-2">
                                <History className="h-4 w-4" />
                                <span className="font-medium">Spiele Historie</span>
                              </div>
                              <span className="text-xs text-gray-500">EMD - LION CUP</span>
                            </div>
                          </Button>

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

                {currentView === "advent-quiz" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5" />
                          <span>Adventskalender Auswertung</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">
                          Hier können Sie alle Quiz-Antworten der Teilnehmer einsehen und die Rangliste verwalten.
                        </p>
                        <Link href="/admin/advent-quiz">
                          <Button className="w-full">
                            <Calendar className="h-4 w-4 mr-2" />
                            Zur Adventskalender Auswertung
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {currentView === "campus-registrations" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Users className="h-5 w-5" />
                          <span>Campus-Registrierungen verwalten</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">Hier können Sie alle EMD-CAMPUS Anmeldungen einsehen und verwalten.</p>
                        <Link href="/admin/campus-registrations">
                          <Button className="w-full">
                            <Users className="h-4 w-4 mr-2" />
                            Zur Campus-Registrierungen Verwaltung
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {currentView === "credit-loader" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Zap className="h-5 w-5" />
                          <span>Credit-Loader verwalten</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">Hier können Sie Gutscheine und Credits verwalten.</p>
                        <Link href="/admin/credit-loader">
                          <Button className="w-full">
                            <Zap className="h-4 w-4 mr-2" />
                            Zur Credit-Loader Verwaltung
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
