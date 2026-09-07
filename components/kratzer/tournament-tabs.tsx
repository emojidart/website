"use client"

import { Button } from "@/components/ui/button"
import { Users, Trophy } from "lucide-react"

interface TournamentTabsProps {
  activeTab: "register" | "tournament"
  setActiveTab: (tab: "register" | "tournament") => void
}

export function TournamentTabs({ activeTab, setActiveTab }: TournamentTabsProps) {
  return (
    <div className="mb-5 rounded-[22px] border border-slate-200 bg-white p-1.5 shadow-[0_14px_40px_-32px_rgba(15,23,42,.55)]">
      <div className="grid grid-cols-2 gap-1.5">
        <Button onClick={() => setActiveTab("register")} className={`h-12 rounded-[16px] border-0 text-sm font-black shadow-none transition-all ${activeTab === "register" ? "bg-slate-950 text-white hover:bg-slate-900" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
          <Users className={`mr-2 h-4 w-4 ${activeTab === "register" ? "text-orange-400" : "text-slate-400"}`} />
          Spieler Registrierung
        </Button>
        <Button onClick={() => setActiveTab("tournament")} className={`h-12 rounded-[16px] border-0 text-sm font-black shadow-none transition-all ${activeTab === "tournament" ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
          <Trophy className="mr-2 h-4 w-4" />
          Turnier Verlauf
        </Button>
      </div>
    </div>
  )
}
