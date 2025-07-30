"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Header } from "@/components/header"
import { AuthSection } from "@/components/auth-section"
import { AdminPanel } from "@/components/admin-panel"
import { PlayerListModal } from "@/components/player-list-modal"
import { TournamentRegistrations } from "@/components/tournament-registrations"
import { GameHistoryTable } from "@/components/game-history-table"
import { PlayerPhotoManagement } from "@/components/player-photo-management" // Import the new component
import { useAuth } from "@/hooks/use-auth"
import { useDartData } from "@/hooks/use-dart-data"
import { supabase } from "@/lib/supabase"
import { LogOut, Shield, User, Database, Eye, History, ImageIcon } from "lucide-react" // Add ImageIcon

export default function AdminPage() {
  const { session, user, loading: authLoading, authMessage, setAuthMessage } = useAuth()
  const { fetchAndRenderAllTables, fetchPlayers } = useDartData()

  const [isPlayerListModalOpen, setIsPlayerListModalOpen] = useState(false)
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null)
  const [isPlayerSelectedViaModal, setIsPlayerSelectedViaModal] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [activeTab, setActiveTab] = useState<"data" | "registrations" | "history" | "photos">("data") // Add 'photos' tab

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Verwaltung</h1>
              <p className="text-gray-600">Turnierdaten und Spielerstatistiken verwalten</p>
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
                  <div className="flex justify-center mb-6">
                    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-2 shadow-lg">
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => setActiveTab("data")}
                          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                            activeTab === "data"
                              ? "bg-red-600 text-white shadow-md"
                              : "bg-transparent text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <Database className="h-4 w-4 mr-2" />
                          Spielerdaten
                        </Button>
                        <Button
                          onClick={() => setActiveTab("registrations")}
                          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                            activeTab === "registrations"
                              ? "bg-red-600 text-white shadow-md"
                              : "bg-transparent text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Anmeldungen
                        </Button>
                        <Button
                          onClick={() => setActiveTab("history")}
                          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                            activeTab === "history"
                              ? "bg-red-600 text-white shadow-md"
                              : "bg-transparent text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <History className="h-4 w-4 mr-2" />
                          Spiele Historie
                        </Button>
                        <Button
                          onClick={() => setActiveTab("photos")} // New tab
                          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                            activeTab === "photos"
                              ? "bg-red-600 text-white shadow-md"
                              : "bg-transparent text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <ImageIcon className="h-4 w-4 mr-2" /> {/* Icon for photos */}
                          Spielerfotos
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
                    {activeTab === "data" && (
                      <AdminPanel
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

                    {activeTab === "photos" && ( // New tab content
                      <PlayerPhotoManagement user={user} onDataSaved={handleDataSaved} />
                    )}
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
