"use client"

import { Button } from "@/components/ui/button"
import { Play, PlusCircle, RefreshCcw } from "lucide-react"

interface RecoveryBannerProps {
  recoveryTournamentData: any
  onRestore: () => void
  onStartNew: () => void
}

export function RecoveryBanner({
  recoveryTournamentData,
  onRestore,
  onStartNew,
}: RecoveryBannerProps) {
  if (!recoveryTournamentData) return null

  return (
    <div className="mb-5 flex flex-col items-center gap-4 rounded-[24px] border border-orange-300/20 bg-orange-500/[0.08] p-5 shadow-[0_18px_55px_-42px_rgba(0,0,0,.9)] md:flex-row">
      <div className="shrink-0 rounded-2xl border border-orange-300/20 bg-orange-500/[0.14] p-3 text-orange-200">
        <RefreshCcw className="h-6 w-6" />
      </div>

      <div className="flex-1 text-center text-white/65 md:text-left">
        <h3 className="mb-1 text-lg font-black text-white">Laufendes Turnier gefunden!</h3>
        <p className="text-sm">
          Es wurde ein aktives Kratzer-Turnier gefunden (ID: {recoveryTournamentData.id}). Möchtest du es
          wiederherstellen?
        </p>
      </div>

      <div className="flex gap-3 mt-3 md:mt-0">
        <Button onClick={onRestore} className="h-11 rounded-xl bg-orange-500 px-5 font-black text-white hover:bg-orange-400">
          <Play className="h-4 w-4 mr-2" />
          Wiederherstellen
        </Button>

        <Button
          onClick={onStartNew}
          variant="outline"
          className="h-11 rounded-xl border-white/[0.10] bg-white/[0.025] px-5 font-black text-white/70 hover:border-orange-300/15 hover:bg-white/[0.05] hover:text-white"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Neues Turnier
        </Button>
      </div>
    </div>
  )
}