"use client"

import { Button } from "@/components/ui/button"
import { Users, Trophy } from "lucide-react"

interface TournamentTabsProps {
  activeTab: "register" | "tournament"
  setActiveTab: (tab: "register" | "tournament") => void
}

export function TournamentTabs({ activeTab, setActiveTab }: TournamentTabsProps) {
  return (
    <div className="mb-5 rounded-[22px] border border-white/[0.08] bg-[#090b0f] p-1.5 shadow-[0_14px_40px_-32px_rgba(0,0,0,.85)]">
      <div className="grid grid-cols-2 gap-1.5">
        <Button onClick={() => setActiveTab("register")} className={`h-12 rounded-[16px] border-0 text-sm font-black shadow-none transition-all ${activeTab === "register" ? "bg-orange-500/[0.12] text-orange-100 hover:bg-orange-500/[0.16]" : "bg-transparent text-white/40 hover:bg-white/[0.045] hover:text-white/75"}`}>
          <Users className={`mr-2 h-4 w-4 ${activeTab === "register" ? "text-orange-300" : "text-white/30"}`} />
          Spieler Registrierung
        </Button>
        <Button onClick={() => setActiveTab("tournament")} className={`h-12 rounded-[16px] border-0 text-sm font-black shadow-none transition-all ${activeTab === "tournament" ? "bg-orange-500/[0.12] text-orange-100 hover:bg-orange-500/[0.16]" : "bg-transparent text-white/40 hover:bg-white/[0.045] hover:text-white/75"}`}>
          <Trophy className="mr-2 h-4 w-4" />
          Turnier Verlauf
        </Button>
      </div>
    </div>
  )
}
