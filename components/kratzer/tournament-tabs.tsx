"use client"

import { Button } from "@/components/ui/button"
import { Users, Trophy } from "lucide-react"

interface TournamentTabsProps {
  activeTab: "register" | "tournament"
  setActiveTab: (tab: "register" | "tournament") => void
}

export function TournamentTabs({
  activeTab,
  setActiveTab,
}: TournamentTabsProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-2 shadow-sm overflow-x-auto mb-6">
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        <Button
          onClick={() => setActiveTab("register")}
          className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
            activeTab === "register"
              ? "bg-primary text-white shadow-md"
              : "bg-transparent text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Spieler Registrierung
        </Button>

        <Button
          onClick={() => setActiveTab("tournament")}
          className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
            activeTab === "tournament"
              ? "bg-primary text-white shadow-md"
              : "bg-transparent text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Trophy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Turnier Verlauf
        </Button>
      </div>
    </div>
  )
}