"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { AuthSection } from "@/components/auth-section"
import { SpieldatenbankForm, type SpielerdatenbankEntry } from "@/components/spielerdatenbank-form" // Korrigierter Importpfad
import { SpielerdatenbankTable } from "@/components/spielerdatenbank-table" // Neue Komponente
import { Header } from "@/components/header"
import { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { PlusCircle, List, Users } from 'lucide-react' // Neue Icons

export default function SpielerdatenbankPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authMessage, setAuthMessage] = useState("")
  const [activeTab, setActiveTab] = useState<"add" | "manage">("add") // 'add' für Formular, 'manage' für Tabelle
  const [selectedPlayerForEdit, setSelectedPlayerForEdit] = useState<SpielerdatenbankEntry | null>(null)

  // Callback, um die Spielerdaten in der Tabelle neu zu laden
  const handleDataChanged = useCallback(() => {
    // Wenn die Tabelle aktiv ist, erzwingen wir ein Neuladen
    // Dies wird durch den useEffect in SpielerdatenbankTable ausgelöst, wenn onDataChanged aufgerufen wird
    // Hier können wir einfach den Bearbeitungsmodus beenden, falls aktiv
    setSelectedPlayerForEdit(null);
    setActiveTab("manage"); // Wechselt zur Verwaltungsansicht nach dem Speichern
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleLoginSuccess = () => {
    setAuthMessage("Anmeldung erfolgreich! Sie werden weitergeleitet.")
  }

  const handleLogout = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      setAuthMessage(`Abmeldung fehlgeschlagen: ${error.message}`)
    } else {
      setAuthMessage("Erfolgreich abgemeldet.")
      setUser(null)
    }
    setLoading(false)
  }

  const handleEditPlayer = (player: SpielerdatenbankEntry) => {
    setSelectedPlayerForEdit(player);
    setActiveTab("add"); // Wechselt zum Formular, um den Spieler zu bearbeiten
  };

  const handleCancelEdit = () => {
    setSelectedPlayerForEdit(null);
    setActiveTab("manage"); // Wechselt zurück zur Tabelle
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600"></div>
        <p className="ml-4 text-gray-700">Lade Admin-Bereich...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
      <Header />
      <main className="container mx-auto p-3 sm:p-4 md:p-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">Spielerdatenbank Admin</h1> {/* Korrigierter Titel */}

        {!user ? (
          <AuthSection
            isVisible={true}
            onLoginSuccess={handleLoginSuccess}
            authMessage={authMessage}
            setAuthMessage={setAuthMessage}
          />
        ) : (
          <div className="space-y-8">
            {/* Tab Navigation */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-2 shadow-lg overflow-x-auto mb-8">
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                <Button
                  onClick={() => { setActiveTab("add"); setSelectedPlayerForEdit(null); }}
                  className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                    activeTab === "add"
                      ? "bg-red-600 text-white shadow-md"
                      : "bg-transparent text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Spieler hinzufügen
                </Button>
                <Button
                  onClick={() => setActiveTab("manage")}
                  className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                    activeTab === "manage"
                      ? "bg-red-600 text-white shadow-md"
                      : "bg-transparent text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <List className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Spieler verwalten
                </Button>
              </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === "add" && (
              <SpieldatenbankForm
                initialData={selectedPlayerForEdit}
                onSaveSuccess={handleDataChanged}
                onCancelEdit={handleCancelEdit}
              />
            )}
            {activeTab === "manage" && (
              <SpielerdatenbankTable
                onEditPlayer={handleEditPlayer}
                onDataChanged={handleDataChanged}
              />
            )}
          </div>
        )}
      </main>
      <footer className="py-4 sm:py-6 bg-gray-200 text-gray-600 text-xs sm:text-sm text-center mt-auto border-t border-gray-300 px-4">
        <p>&copy; 2025 Emoj!'s Dartverein e.V. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  )
}
