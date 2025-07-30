"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Header } from "@/components/header"
import { AuthSection } from "@/components/auth-section"
import { PlayerListModal } from "@/components/player-list-modal"
import { TournamentRegistrations } from "@/components/tournament-registrations"
import { GameHistoryTable } from "@/components/game-history-table"
import { PlayerPhotoManagement } from "@/components/player-photo-management"
import { PlayerRegistration } from "@/components/player-registration"
import { PlayerManagement } from "@/components/player-management"
import { ResultEntry } from "@/components/result-entry"
import { useAuth } from "@/hooks/use-auth"
import { useDartData } from "@/hooks/use-dart-data"
import { supabase } from "@/lib/supabase"
import { LogOut, Shield, User, Eye, History, ImageIcon, UserPlus, Trophy, Settings } from "lucide-react"

export default function AdminPage() {
  const { session, user, loading: authLoading, authMessage, setAuthMessage } = useAuth()
  const { fetchAndRenderAllTables, fetchPlayers } = useDartData()

  const [isPlayerListModalOpen, setIsPlayerListModalOpen] = useState(false)
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null)
  const [isPlayerSelectedViaModal, setIsPlayerSelectedViaModal] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [activeTab, setActiveTab] = useState<
    "players" | "results" | "registrations" | "history" | "photos" | "management"
  >("players")

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
  }

  const handleDataSaved = () => {
    fetchAndRenderAllTables()
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
          <>
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
                <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Angemeldet als</p>
                        <p className="font-medium text-gray-900">{user?.email}</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      variant="outline"
                      size="sm"
                      className="border-gray-200 hover:bg-red-50 hover:border-red-300 bg-transparent transition-all duration-200"
                    >
                      {loggingOut ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                          Abmeldung...
                        </>
                      ) : (
                        <>
                          <LogOut className="h-4 w-4 mr-2" />
                          Abmelden
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Tab Navigation */}
                {session && (
                  <div className="px-0 sm:px-0">
                    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-2 shadow-lg overflow-x-auto">
                      <div className="flex space-x-1 min-w-max sm:min-w-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:space-x-0 sm:gap-2">
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
                      </div>
                    </div>
                  </div>
                )}

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
                    {activeTab === "players" && (
                      <PlayerRegistration isVisible={true} user={user} onDataSaved={handleDataSaved} />
                    )}

                    {activeTab === "results" && (
                      <ResultEntry isVisible={true} user={user} onDataSaved={handleDataSaved} />
                    )}

                    {activeTab === "management" && (
                      <PlayerManagement isVisible={true} user={user} onDataSaved={handleDataSaved} />
                    )}

                    {activeTab === "registrations" && <TournamentRegistrations />}

                    {activeTab === "history" && <GameHistoryTable />}

                    {activeTab === "photos" && <PlayerPhotoManagement user={user} onDataSaved={handleDataSaved} />}
                  </div>
                )}
              </div>
            )}
          </>
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
