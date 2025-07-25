"use client"

import { Button } from "@/components/ui/button"

import { useState } from "react"
import { Header } from "@/components/header" // Header beibehalten
import { AuthSection } from "@/components/auth-section"
import { AdminPanel } from "@/components/admin-panel"
import { PlayerListModal } from "@/components/player-list-modal"
import { useAuth } from "@/hooks/use-auth"
import { useDartData } from "@/hooks/use-dart-data" // Benötigt, um Daten nach dem Speichern zu aktualisieren
import { supabase } from "@/lib/supabase" // Für Logout

export default function AdminPage() {
  const { session, user, loading: authLoading, authMessage, setAuthMessage } = useAuth()
  const { fetchAndRenderAllTables, fetchPlayers } = useDartData() // Funktionen zum Aktualisieren und Abrufen von Spielern

  const [isPlayerListModalOpen, setIsPlayerListModalOpen] = useState(false)
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null)

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Fehler beim Logout:", error.message)
      setAuthMessage(`Logout-Fehler: ${error.message}`)
    } else {
      setAuthMessage("Erfolgreich ausgeloggt.")
      // Optional: Seite neu laden oder Zustand zurücksetzen, um Login-Formular anzuzeigen
      // window.location.reload();
    }
  }

  const handleLoginSuccess = () => {
    // Nach erfolgreichem Login Daten aktualisieren
    fetchAndRenderAllTables()
    setAuthMessage("Erfolgreich eingeloggt!")
  }

  const handleDataSaved = () => {
    // Nach dem Speichern von Daten die Tabellen aktualisieren
    fetchAndRenderAllTables()
  }

  const handleOpenPlayerList = () => {
    setIsPlayerListModalOpen(true)
  }

  const handleSelectPlayer = (name: string) => {
    setSelectedPlayerName(name)
  }

  return (
    <div className="min-h-screen bg-brutal-bg text-brutal-text font-sans">
      <Header /> {/* Header bleibt oben */}
      <main className="container mx-auto p-4 md:p-8">
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase text-brutal-accent-gold text-center mb-10 drop-shadow-lg">
          Admin Bereich
        </h1>

        {authLoading ? (
          <div className="text-center text-lg text-brutal-text-muted">Lade Authentifizierungsstatus...</div>
        ) : (
          <>
            {!session ? (
              // Zeige Login-Formular, wenn nicht eingeloggt
              <AuthSection
                isVisible={true} // Immer sichtbar, wenn keine Session
                onLoginSuccess={handleLoginSuccess}
                authMessage={authMessage}
                setAuthMessage={setAuthMessage}
              />
            ) : (
              // Zeige Admin-Panel, wenn eingeloggt
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-brutal-card-bg p-4 rounded-lg shadow-md border border-brutal-border">
                  <p className="text-lg text-brutal-text">
                    Eingeloggt als: <span className="font-bold text-brutal-accent-gold">{user?.email}</span>
                  </p>
                  <Button onClick={handleLogout} className="bg-destructive hover:bg-red-700 text-white">
                    Logout
                  </Button>
                </div>
                <AdminPanel
                  isVisible={true} // Immer sichtbar, wenn Session
                  user={user}
                  onDataSaved={handleDataSaved}
                  onOpenPlayerList={handleOpenPlayerList}
                  selectedPlayerName={selectedPlayerName}
                  onPlayerNameChange={setSelectedPlayerName}
                />
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
      <footer className="py-6 bg-brutal-card-bg text-brutal-text-muted text-sm text-center mt-auto border-t border-brutal-border">
        <p>&copy; 2025 EMOJIS DARTVEREIN. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  )
}
