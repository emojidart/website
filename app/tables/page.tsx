"use client"

import { Header } from "@/components/header"
import { DartTables } from "@/components/dart-tables"
import { useDartData } from "@/hooks/use-dart-data"
import { PotDisplay } from "@/components/pot-display"

export default function TablesPage() {
  const {
    edartPlayers,
    steelDartPlayers,
    combinedPlayers,
    currentPot,
    loading: dataLoading,
    error: dataError,
  } = useDartData()

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="flex justify-center mb-8">
          <PotDisplay amount={currentPot} />
        </div>
        <DartTables
          edartPlayers={edartPlayers}
          steelDartPlayers={steelDartPlayers}
          combinedPlayers={combinedPlayers}
          loading={dataLoading}
          error={dataError}
        />
      </main>
      <footer className="py-6 bg-gray-200 text-gray-600 text-sm text-center mt-auto border-t border-gray-300">
        <p>&copy; 2025 EMOJIS DARTVEREIN. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  )
}
