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
    <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => setActiveTab("register")}
          className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-bold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap  ${
            activeTab === "register"
              ? "bg-orange-600 text-white shadow-sm hover:bg-orange-700"
              : "bg-transparent text-gray-600 hover:bg-orange-50 hover:text-orange-700"
          }`}
        >
          <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Spieler Registrierung
        </Button>

        <Button
          onClick={() => setActiveTab("tournament")}
          className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-bold transition-all duration-200 text-xs sm:text-sm whitespace-nowrap  ${
            activeTab === "tournament"
              ? "bg-orange-600 text-white shadow-sm hover:bg-orange-700"
              : "bg-transparent text-gray-600 hover:bg-orange-50 hover:text-orange-700"
          }`}
        >
          <Trophy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Turnier Verlauf
        </Button>
      </div>
    </div>
  )
}