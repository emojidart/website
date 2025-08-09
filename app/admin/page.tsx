"use client"
import { Header } from "@/components/header" // Declare the Header component

import { Button } from "@/components/ui/button"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import {
  Database,
  Users,
  Shield,
  Eye,
  History,
  ImageIcon,
  UserPlus,
  Trophy,
  Settings,
  List,
  PlusCircle,
  Mail,
  CalendarCheck,
} from "lucide-react" // CalendarCheck NEU
import { useDartData } from "@/hooks/use-dart-data"
import { AuthSection } from "@/components/auth-section"
import { PlayerListModal } from "@/components/player-list-modal"
import { TournamentRegistrations } from "@/components/tournament-registrations"
import { GameHistoryTable } from "@/components/game-history-table"
import { PlayerPhotoManagement } from "@/components/player-photo-management"
import { PlayerRegistration } from "@/components/player-registration"
import { PlayerManagement } from "@/components/player-management"
import { AdminPanel as ResultEntry } from "@/components/admin-panel" // Umbenannt, da dies die ResultEntry-Komponente ist
import { ClubPlayerTeamManagement } from "@/components/club-player-team-management"
import { PlayerRecruitmentForm } from "@/components/player-recruitment-form"
import { PlayerRecruitmentList } from "@/components/player-recruitment-list"
import { PlayerApplicationsList } from "@/components/player-applications-list"
import { UpcomingTournamentsManagement } from "@/components/admin/upcoming-tournaments-management" // NEU
import { TournamentRegistrationsList } from "@/components/admin/tournament-registrations-list" // NEU
import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import type { RealtimeChannel } from "@supabase/supabase-js"
import Link from "next/link"

export default function AdminPage() {
  const { session, user, loading: authLoading, authMessage, setAuthMessage } = useAuth()
  const { fetchAndRenderAllTables, fetchPlayers } = useDartData()

  const [isPlayerListModalOpen, setIsPlayerListModalOpen] = useState(false)
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null)
  const [isPlayerSelectedViaModal, setIsPlayerSelectedViaModal] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // NEU: Zustand für die aktive Hauptkategorie
  const [activeCategory, setActiveCategory] = useState<
    "tournament-series" | "recruitment" | "club-admin" | "tournament-admin"
  >("tournament-series") // Standardmäßig "Turnierserie"

  // Zustand für den aktiven Unter-Tab
  const [activeTab, setActiveTab] = useState<
    | "players" // Spieler anlegen
    | "results" // Ergebnis Eingabe
    | "registrations" // Anmeldungen
    | "history" // Spiele Historie
    | "management" // Spielerverwaltung
    | "photos" // Spielerfotos
    | "club-management"
    | "recruitment-form"
    | "recruitment-list"
    | "applications"
    | "upcoming-tournaments" // NEU: Bevorstehende Turniere
    | "tournament-registrations-list" // NEU: Turnier Anmeldungen
    | "tournament-players"
    | "spieldatenbank"
  >("players") // Standardmäßig "Spieler anlegen"

  const [unreadApplicationsCount, setUnreadApplicationsCount] = useState(0)

  // Funktion zum Abrufen der ungelesenen Bewerbungen
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

  // Effekt für das initiale Laden und das Realtime-Abonnement
  useEffect(() => {
    fetchUnreadApplicationsCount() // Initial fetch

    let channel: RealtimeChannel | null = null

    if (session) {
      channel = supabase
        .channel("player_applications_changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "player_applications" }, (payload) => {
          fetchUnreadApplicationsCount()
        })
        .subscribe()
    }

    // Cleanup-Funktion für das Abonnement
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
    // If data is saved in recruitment form, switch to list view
    if (activeTab === "recruitment-form") {
      setActiveTab("recruitment-list")
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

  // NEU: Funktion zum Wechseln der Hauptkategorie und des Standard-Unter-Tabs
  const handleCategoryClick = (category: typeof activeCategory) => {
    setActiveCategory(category)
    switch (category) {
      case "tournament-series":
        setActiveTab("players") // Standard: Spieler anlegen
        break
      case "recruitment":
        setActiveTab("recruitment-form")
        break
      case "club-admin":
        setActiveTab("club-management")
        break
      case "tournament-admin":
        setActiveTab("upcoming-tournaments") // NEU: Standard für Turnierverwaltung
        break
      default:
        setActiveTab("players")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto p-3 sm:p-4 md:p-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Verwaltung</h1>
              <p className="text-sm sm:text-base text-gray-600">Turnierdaten und Spielerstatistiken verwalten</p>
            </div>
          </div>
        </div>

        {authLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Authentifizierungsstatus wird geladen...</p>
            </div>
          </div>
        ) : (
          <div>
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
                {/* User Status */}

                {/* Haupt-Tab-Navigation */}
                <div className="px-0 sm:px-0">
                  <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-2 shadow-lg overflow-x-auto mb-4">
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                      <Button
                        onClick={() => handleCategoryClick("tournament-series")}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 text-sm whitespace-nowrap flex-shrink-0 ${
                          activeCategory === "tournament-series"
                            ? "bg-red-600 text-white shadow-md"
                            : "bg-transparent text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <Trophy className="h-4 w-4 mr-2" />
                        Turnierserie
                      </Button>
                      <Button
                        onClick={() => handleCategoryClick("recruitment")}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 text-sm whitespace-nowrap flex-shrink-0 ${
                          activeCategory === "recruitment"
                            ? "bg-red-600 text-white shadow-md"
                            : "bg-transparent text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Rekrutierung
                        {unreadApplicationsCount > 0 && (
                          <Badge className="ml-2 h-4 w-4 flex items-center justify-center p-0 text-xs bg-red-500 text-white rounded-full">
                            {unreadApplicationsCount}
                          </Badge>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleCategoryClick("club-admin")}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 text-sm whitespace-nowrap flex-shrink-0 ${
                          activeCategory === "club-admin"
                            ? "bg-red-600 text-white shadow-md"
                            : "bg-transparent text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Vereinsverwaltung
                      </Button>
                      <Button
                        onClick={() => handleCategoryClick("tournament-admin")}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 text-sm whitespace-nowrap flex-shrink-0 ${
                          activeCategory === "tournament-admin"
                            ? "bg-red-600 text-white shadow-md"
                            : "bg-transparent text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <Database className="h-4 w-4 mr-2" />
                        Turnierverwaltung
                      </Button>
                    </div>
                  </div>

                  {/* Unter-Tab-Navigation basierend auf activeCategory */}
                  <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-2 shadow-lg overflow-x-auto">
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                      {activeCategory === "tournament-series" && (
                        <>
                          <Button
                            onClick={() => setActiveTab("players")}
                            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              activeTab === "players"
                                ? "bg-blue-600 text-white shadow-md"
                                : "bg-transparent text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Spieler anlegen</span>
                            <span className="sm:hidden">Anlegen</span>
                          </Button>
                          <Button
                            onClick={() => setActiveTab("results")}
                            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              activeTab === "results"
                                ? "bg-green-600 text-white shadow-md"
                                : "bg-transparent text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <Trophy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Ergebnis Eingabe</span>
                            <span className="sm:hidden">Ergebnis</span>
                          </Button>
                          <Button
                            onClick={() => setActiveTab("registrations")}
                            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              activeTab === "registrations"
                                ? "bg-red-600 text-white shadow-md"
                                : "bg-transparent text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Anmeldungen</span>
                            <span className="sm:hidden">Anmeld.</span>
                          </Button>
                          <Button
                            onClick={() => setActiveTab("history")}
                            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              activeTab === "history"
                                ? "bg-red-600 text-white shadow-md"
                                : "bg-transparent text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Spiele Historie</span>
                            <span className="sm:hidden">Historie</span>
                          </Button>
                          <Button
                            onClick={() => setActiveTab("management")}
                            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              activeTab === "management"
                                ? "bg-purple-600 text-white shadow-md"
                                : "bg-transparent text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Spielerverwaltung</span>
                            <span className="sm:hidden">Verwalten</span>
                          </Button>
                          <Button
                            onClick={() => setActiveTab("photos")}
                            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              activeTab === "photos"
                                ? "bg-red-600 text-white shadow-md"
                                : "bg-transparent text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Spielerfotos</span>
                            <span className="sm:hidden">Fotos</span>
                          </Button>
                        </>
                      )}

                      {activeCategory === "recruitment" && (
                        <>
                          <Button
                            onClick={() => setActiveTab("recruitment-form")}
                            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              activeTab === "recruitment-form"
                                ? "bg-blue-600 text-white shadow-md"
                                : "bg-transparent text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Rekrutierungsbedarf eingeben</span>
                            <span className="sm:hidden">Eingeben</span>
                          </Button>
                          <Button
                            onClick={() => setActiveTab("recruitment-list")}
                            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              activeTab === "recruitment-list"
                                ? "bg-indigo-600 text-white shadow-md"
                                : "bg-transparent text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <List className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Rekrutierungsbedürfnisse anzeigen</span>
                            <span className="sm:hidden">Anzeigen</span>
                          </Button>
                          <Button
                            onClick={() => setActiveTab("applications")}
                            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 relative ${
                              activeTab === "applications"
                                ? "bg-pink-600 text-white shadow-md"
                                : "bg-transparent text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Spielerbewerbungen</span>
                            <span className="sm:hidden">Bewerb.</span>
                            {unreadApplicationsCount > 0 && (
                              <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs bg-red-500 text-white rounded-full">
                                {unreadApplicationsCount}
                              </Badge>
                            )}
                          </Button>
                        </>
                      )}

                      {activeCategory === "club-admin" && (
                        <>
                          <Button
                            onClick={() => setActiveTab("club-management")}
                            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              activeTab === "club-management"
                                ? "bg-orange-600 text-white shadow-md"
                                : "bg-transparent text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Vereinsverwaltung</span>
                            <span className="sm:hidden">Verein</span>
                          </Button>
                        </>
                      )}

                      {activeCategory === "tournament-admin" && (
                        <>
                          <Button
                            onClick={() => setActiveTab("upcoming-tournaments")} // NEU
                            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              activeTab === "upcoming-tournaments"
                                ? "bg-blue-600 text-white shadow-md"
                                : "bg-transparent text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <CalendarCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Bevorstehende Turniere</span>
                            <span className="sm:hidden">Turniere</span>
                          </Button>
                          <Button
                            onClick={() => setActiveTab("tournament-registrations-list")} // NEU
                            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              activeTab === "tournament-registrations-list"
                                ? "bg-purple-600 text-white shadow-md"
                                : "bg-transparent text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <List className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Turnier Anmeldungen</span>
                            <span className="sm:hidden">Anmeldungen</span>
                          </Button>
                          <Button
                            asChild
                            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              activeTab === "kratzer-tournament" // Assuming you might set this as activeTab if clicked
                                ? "bg-orange-600 text-white shadow-md"
                                : "bg-transparent text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <Link href="/kratzer-tournament">
                              <Trophy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">Kratzer-Turnier</span>
                              <span className="sm:hidden">Kratzer</span>
                            </Link>
                          </Button>
                          {/* Bestehende Links, falls sie bleiben sollen */}
                          <Button
                            asChild
                            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              activeTab === "tournament-players"
                                ? "bg-red-600 text-white shadow-md"
                                : "bg-transparent text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <Link href="/admin/tournament-players">
                              <Trophy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">Turnierspielerdatenbank</span>
                              <span className="sm:hidden">Turnierdaten</span>
                            </Link>
                          </Button>
                          <Button
                            asChild
                            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              activeTab === "spieldatenbank"
                                ? "bg-red-600 text-white shadow-md"
                                : "bg-transparent text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <Link href="/spielerdatenbank">
                              <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">Spielerdatenbank</span>
                              <span className="sm:hidden">Spieldaten</span>
                            </Link>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Message */}
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

                {/* Tab Content */}
                {session && (
                  <div className="space-y-6">
                    {activeCategory === "tournament-series" && (
                      <>
                        {activeTab === "players" && (
                          <PlayerRegistration isVisible={true} user={user} onDataSaved={handleDataSaved} />
                        )}
                        {activeTab === "results" && (
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
                        {activeTab === "registrations" && <TournamentRegistrations />}
                        {activeTab === "history" && <GameHistoryTable />}
                        {activeTab === "management" && (
                          <PlayerManagement isVisible={true} user={user} onDataSaved={handleDataSaved} />
                        )}
                        {activeTab === "photos" && <PlayerPhotoManagement user={user} onDataSaved={handleDataSaved} />}
                      </>
                    )}

                    {activeCategory === "recruitment" && (
                      <>
                        {activeTab === "recruitment-form" && (
                          <PlayerRecruitmentForm user={user} onDataSaved={handleDataSaved} />
                        )}
                        {activeTab === "recruitment-list" && <PlayerRecruitmentList onDataSaved={handleDataSaved} />}
                        {activeTab === "applications" && (
                          <PlayerApplicationsList onDataChanged={fetchUnreadApplicationsCount} />
                        )}
                      </>
                    )}

                    {activeCategory === "club-admin" && (
                      <>
                        {activeTab === "club-management" && (
                          <ClubPlayerTeamManagement user={user} onDataSaved={handleDataSaved} />
                        )}
                      </>
                    )}

                    {activeCategory === "tournament-admin" && (
                      <>
                        {activeTab === "upcoming-tournaments" && <UpcomingTournamentsManagement user={user} />}
                        {activeTab === "tournament-registrations-list" && <TournamentRegistrationsList />}
                        {/* Für "Turnierverwaltung" gibt es keine direkten Komponenten hier, da es Links zu anderen Seiten sind. */}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
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
