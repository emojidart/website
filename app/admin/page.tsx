"use client"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import {
  Users,
  Shield,
  Eye,
  History,
  ImageIcon,
  Trophy,
  Settings,
  List,
  PlusCircle,
  Mail,
  CalendarCheck,
  ChevronRight,
  Home,
  Target,
  HelpCircle,
  PartyPopper,
  Calendar,
  Zap,
} from "lucide-react"
import { useDartData } from "@/hooks/use-dart-data"
import { AuthSection } from "@/components/auth-section"
import { PlayerListModal } from "@/components/player-list-modal"
import { TournamentRegistrations } from "@/components/tournament-registrations"
import { GameHistoryTable } from "@/components/game-history-table"
import { PlayerPhotoManagement } from "@/components/player-photo-management"
import { PlayerRegistration } from "@/components/player-registration"
import { PlayerManagement } from "@/components/player-management"
import { AdminPanel as ResultEntry } from "@/components/admin-panel"
import { ClubPlayerTeamManagement } from "@/components/club-player-team-management"
import SeasonSettingsPage from "@/app/admin/season_settings/page"
import { PlayerRecruitmentForm } from "@/components/player-recruitment-form"
import { PlayerRecruitmentList } from "@/components/player-recruitment-list"
import { PlayerApplicationsList } from "@/components/player-applications-list"
import { UpcomingTournamentsManagement } from "@/components/admin/upcoming-tournaments-management"
import { EventsManagement } from "@/components/admin/events-management"
import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RealtimeChannel } from "@supabase/supabase-js"
import Link from "next/link"
import { UserManagement } from "@/components/user-management"
import { AttendanceManagement } from "@/components/attendance-management"
import { LeagueManagement } from "@/components/league-management"

export default function AdminPage() {
  const { session, user, loading: authLoading, authMessage, setAuthMessage, isAdmin, adminLoading } = useAuth()
  const { fetchAndRenderAllTables, fetchPlayers } = useDartData()

  const [isPlayerListModalOpen, setIsPlayerListModalOpen] = useState(false)
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null)
  const [isPlayerSelectedViaModal, setIsPlayerSelectedViaModal] = useState(false)
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
    | "upcoming-tournaments"
    | "player-database"
    | "dart-competition"
    | "attendance"
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
  >("dashboard")

  const [unreadApplicationsCount, setUnreadApplicationsCount] = useState(0)

  const fetchUnreadApplicationsCount = useCallback(async () => {
    if (!session) {
      setUnreadApplicationsCount(0)
      return
    }
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
        .channel("player_applications_changes")
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
    fetchAndRenderAllTables()
    setAuthMessage("Erfolgreich angemeldet!")
    fetchUnreadApplicationsCount()
  }

  const handleDataSaved = () => {
    fetchAndRenderAllTables()
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
      description: "Alle Kapitäne, Co-Kapitäne und Spieler verwalten",
      icon: Users,
      color: "bg-blue-500",
      view: "users" as const,
    },
    {
      title: "Support Tickets",
      description: "Support-Anfragen von Vereinsmitgliedern bearbeiten",
      icon: HelpCircle,
      color: "bg-red-500",
      view: "support-tickets" as const,
    },
    {
      title: "Adventskalender Auswertung",
      description: "Quiz-Antworten und Rangliste der Teilnehmer einsehen",
      icon: Calendar,
      color: "bg-orange-500",
      view: "advent-quiz" as const,
    },
    {
      title: "Campus-Registrierungen",
      description: "EMD-CAMPUS Anmeldungen verwalten und einsehen",
      icon: Users,
      color: "bg-pink-500",
      view: "campus-registrations" as const,
    },
    {
      title: "Credit-Loader",
      description: "Gutscheine und Credits verwalten",
      icon: Zap,
      color: "bg-violet-500",
      view: "credit-loader" as const,
    },
    {
      title: "Lion Cup",
      description: "Alle EMD - LION CUP Funktionen verwalten",
      icon: Trophy,
      color: "bg-yellow-500",
      view: "dart-competition" as const,
    },
    {
      title: "Anwesenheitsliste",
      description: "Anwesenheit bei Veranstaltungen und Versammlungen verwalten",
      icon: CalendarCheck,
      color: "bg-indigo-500",
      view: "attendance" as const,
    },
    {
      title: "Ligaspiele",
      description: "Liga-Spiele und Saisons verwalten (Frühjahrs-/Herbstmeisterschaft, Cups)",
      icon: Target,
      color: "bg-green-500",
      view: "leagues" as const,
    },
    {
      title: "Veranstaltungen",
      description: "Partys, Spielabende und andere Events verwalten",
      icon: PartyPopper,
      color: "bg-purple-500",
      view: "events" as const,
    },
    {
      title: "Rekrutierung",
      description: "Spielerbewerbungen und Rekrutierung",
      icon: Mail,
      color: "bg-indigo-500",
      view: "recruitment" as const,
      badge: unreadApplicationsCount > 0 ? unreadApplicationsCount : undefined,
    },
    {
      title: "Vereinsverwaltung",
      description: "Vereinsangelegenheiten verwalten",
      icon: Users,
      color: "bg-teal-500",
      view: "club" as const,
    },
    {
      title: "Bevorstehende Turniere",
      description: "Kommende Turniere verwalten und planen",
      icon: CalendarCheck,
      color: "bg-cyan-500",
      view: "upcoming-tournaments" as const,
    },
    {
      title: "Turniere",
      description: "Turnier starten",
      icon: Trophy,
      color: "bg-amber-500",
      view: "tournaments" as const,
    },
    {
      title: "Turnier verwalten",
      description: "Serien, Spieltage und Turnierdaten zentral pflegen",
      icon: Settings,
      color: "bg-purple-500",
      view: "tournament-management" as const,
    },
    {
      title: "Spielerdatenbank",
      description: "Alle Spielerdaten verwalten und einsehen",
      icon: List,
      color: "bg-slate-500",
      view: "player-database" as const,
    },
  ]

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto p-4 md:p-8">
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

  if (session && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="flex items-center justify-center py-12">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">Zugriff verweigert</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-6">Sie haben keine Admin-Berechtigung für diesen Bereich.</p>
                <div className="space-y-3">
                  <Link href="/member-dashboard">
                    <Button className="w-full">Zum Member-Dashboard</Button>
                  </Link>
                  <Button variant="outline" onClick={handleLogout} className="w-full bg-transparent">
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView("dashboard")}
              className="text-gray-500 hover:text-gray-700"
            >
              <Home className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
            {currentView !== "dashboard" && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {currentView === "players" && "Spieler verwalten"}
                  {currentView === "results" && "Ergebnisse eingeben"}
                  {currentView === "history" && "Spiele Historie"}
                  {currentView === "management" && "Spielerverwaltung"}
                  {currentView === "photos" && "Spielerfotos"}
                  {currentView === "recruitment" && "Rekrutierung"}
                  {currentView === "club" && "Vereinsverwaltung"}
                  {currentView === "tournaments" && "Turniere"}
                  {currentView === "users" && "Benutzerverwaltung"}
                  {currentView === "upcoming-tournaments" && "Bevorstehende Turniere"}
                  {currentView === "player-database" && "Spielerdatenbank"}
                  {currentView === "dart-competition" && "Dart Competition"}
                  {currentView === "attendance" && "Anwesenheitsliste"}
                  {currentView === "leagues" && "Ligaspiele"}
                  {currentView === "support-tickets" && "Support Tickets"}
                  {currentView === "lion-cup-registrations" && "Lion Cup Anmeldungen"}
                  {currentView === "tournament-management" && "Turnier verwalten"}
                  {currentView === "tournament-series" && "Turnier-Serien & Spieltage"}
                  {currentView === "events" && "Veranstaltungen"}
                  {currentView === "advent-quiz" && "Adventskalender Auswertung"}
                  {currentView === "campus-registrations" && "Campus-Registrierungen"}
                  {currentView === "credit-loader" && "Credit-Loader"}
                  {currentView === "lion-cup-settings" && "Lion Cup Settings"}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {currentView === "dashboard"
                  ? "Admin-Verwaltung"
                  : currentView === "players"
                    ? "Spieler verwalten"
                    : currentView === "results"
                      ? "Ergebnisse eingeben"
                      : currentView === "history"
                        ? "Spiele Historie"
                        : currentView === "management"
                          ? "Spielerverwaltung"
                          : currentView === "photos"
                            ? "Spielerfotos"
                            : currentView === "recruitment"
                              ? "Rekrutierung"
                              : currentView === "club"
                                ? "Vereinsverwaltung"
                                : currentView === "tournaments"
                                  ? "Turniere"
                                  : currentView === "users"
                                    ? "Benutzerverwaltung"
                                    : currentView === "upcoming-tournaments"
                                      ? "Bevorstehende Turniere"
                                      : currentView === "player-database"
                                        ? "Spielerdatenbank"
                                        : currentView === "dart-competition"
                                          ? "Dart Competition"
                                          : currentView === "attendance"
                                            ? "Anwesenheitsliste"
                                            : currentView === "leagues"
                                              ? "Ligaspiele"
                                              : currentView === "support-tickets"
                                                ? "Support Tickets"
                                                : currentView === "lion-cup-registrations"
                                                  ? "Lion Cup Anmeldungen"
                                                  : currentView === "tournament-management"
                                                    ? "Turnier verwalten"
                                                    : currentView === "tournament-series"
                                                      ? "Turnier-Serien & Spieltage"
                                                      : currentView === "events"
                                                        ? "Veranstaltungen"
                                                        : currentView === "advent-quiz"
                                                          ? "Adventskalender Auswertung"
                                                          : currentView === "campus-registrations"
                                                            ? "Campus-Registrierungen"
                                                            : currentView === "credit-loader"
                                                              ? "Credit-Loader"
                                                              : currentView === "lion-cup-settings"
                                                                ? "Lion Cup Settings"
                                                                : "Admin-Zugang"}
              </h1>
              <p className="text-gray-600">
                {session && currentView === "dashboard"
                  ? "Vereinsverwaltung, Turnierdaten und Spielerstatistiken verwalten"
                  : session && currentView !== "dashboard"
                    ? "Wählen Sie eine Aktion aus dem Dashboard"
                    : "Bitte melden Sie sich an, um auf den Admin-Bereich zuzugreifen"}
              </p>
            </div>
          </div>
        </div>

        {!session ? (
          <div className="max-w-md mx-auto">
            <AuthSection
              isVisible={true}
              onLoginSuccess={handleLoginSuccess}
              authMessage={authMessage}
              setAuthMessage={setAuthMessage}
            />
          </div>
        ) : (
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboardCards.map((card) => (
                  <Card
                    key={card.view}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-105"
                    onClick={() => setCurrentView(card.view)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className={`p-3 ${card.color} rounded-lg shadow-lg`}>
                          <card.icon className="h-6 w-6 text-white" />
                        </div>
                        {card.badge && <Badge className="bg-red-500 text-white">{card.badge}</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="text-lg mb-2">{card.title}</CardTitle>
                      <p className="text-sm text-gray-600">{card.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {currentView === "players" && <PlayerRegistration isVisible={true} user={user} onDataSaved={handleDataSaved} />}

            {currentView === "results" && (
              <ResultEntry
                isVisible={true}
                user={user}
                onDataSaved={handleDataSaved}
                onOpenPlayerList={handleOpenPlayerList}
                selectedPlayerName={selectedPlayerName}
                onPlayerNameChange={handlePlayerNameChange}
                isPlayerSelectedViaModal={isPlayerSelectedViaModal}
              />
            )}

            {currentView === "history" && <GameHistoryTable />}

            {currentView === "management" && <PlayerManagement isVisible={true} user={user} onDataSaved={handleDataSaved} />}

            {currentView === "photos" && <PlayerPhotoManagement user={user} onDataSaved={handleDataSaved} />}

            {currentView === "attendance" && <AttendanceManagement />}

            {currentView === "leagues" && <LeagueManagement />}

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
                        <Badge className="bg-red-500 text-white">{unreadApplicationsCount}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PlayerApplicationsList onDataChanged={fetchUnreadApplicationsCount} />
                  </CardContent>
                </Card>
              </div>
            )}

            {currentView === "users" && <UserManagement user={user} onDataSaved={handleDataSaved} />}

            {currentView === "club" && <ClubPlayerTeamManagement user={user} onDataSaved={handleDataSaved} />}

            {currentView === "tournaments" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Turnier-Tools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Link href="/kratzer-tournament">
                        <Button variant="outline" className="w-full justify-start bg-transparent">
                          <Trophy className="h-4 w-4 mr-2" />
                          Kratzer-Turnier
                        </Button>
                      </Link>
                      <Link href="/dko_tournament_registration">
                        <Button variant="outline" className="w-full justify-start bg-transparent">
                          <Trophy className="h-4 w-4 mr-2" />
                          DKO Turnier
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {currentView === "upcoming-tournaments" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CalendarCheck className="h-5 w-5" />
                      <span>Bevorstehende Turniere verwalten</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <UpcomingTournamentsManagement user={user} />
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
                    <p className="text-gray-600 mb-4">Hier können Sie alle Spielerdaten einsehen und verwalten.</p>
                    <div className="space-y-3">
                      <Link href="/spielerdatenbank">
                        <Button className="w-full">
                          <List className="h-4 w-4 mr-2" />
                          Zur Spielerdatenbank
                        </Button>
                      </Link>
                      <Button onClick={handleOpenPlayerList} variant="outline" className="w-full bg-transparent">
                        <Users className="h-4 w-4 mr-2" />
                        Spielerliste Modal anzeigen
                      </Button>
                    </div>
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
                        onClick={() => setCurrentView("results")}
                        variant="outline"
                        className="w-full justify-start bg-transparent h-auto p-4"
                      >
                        <div className="flex flex-col items-start space-y-1">
                          <div className="flex items-center space-x-2">
                            <Trophy className="h-4 w-4" />
                            <span className="font-medium">Ergebnisse eingeben</span>
                          </div>
                          <span className="text-xs text-gray-500">EMD - LION CUP</span>
                        </div>
                      </Button>

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
                        onClick={() => setCurrentView("photos")}
                        variant="outline"
                        className="w-full justify-start bg-transparent h-auto p-4"
                      >
                        <div className="flex flex-col items-start space-y-1">
                          <div className="flex items-center space-x-2">
                            <ImageIcon className="h-4 w-4" />
                            <span className="font-medium">Spielerfotos</span>
                          </div>
                          <span className="text-xs text-gray-500">EMD - LION CUP</span>
                        </div>
                      </Button>

                      <Button
                        onClick={() => setCurrentView("lion-cup-registrations")}
                        variant="outline"
                        className="w-full justify-start bg-transparent h-auto p-4"
                      >
                        <div className="flex flex-col items-start space-y-1">
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4" />
                            <span className="font-medium">Turnier Anmeldungen</span>
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

            {currentView === "lion-cup-registrations" && <TournamentRegistrations />}

            {/* ✅ Turnier verwalten = Zentrale Sammelstelle */}
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

                      {/* 🆕 NEU */}
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
                    <p className="text-gray-600 mb-4">
                      Hier können Sie alle EMD-CAMPUS Anmeldungen einsehen und verwalten.
                    </p>
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
