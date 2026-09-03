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
    <div className="mb-5 flex flex-col items-center gap-4 rounded-3xl border border-orange-200 bg-orange-50 p-5 shadow-sm md:flex-row">
      <div className="shrink-0 rounded-2xl bg-orange-600 p-3 text-white">
        <RefreshCcw className="h-6 w-6" />
      </div>

      <div className="flex-1 text-center text-gray-800 md:text-left">
        <h3 className="mb-1 text-lg font-black text-gray-950">Laufendes Turnier gefunden!</h3>
        <p className="text-sm">
          Es wurde ein aktives Kratzer-Turnier gefunden (ID: {recoveryTournamentData.id}). Möchtest du es
          wiederherstellen?
        </p>
      </div>

      <div className="flex gap-3 mt-3 md:mt-0">
        <Button onClick={onRestore} className="bg-orange-600 hover:bg-orange-700">
          <Play className="h-4 w-4 mr-2" />
          Wiederherstellen
        </Button>

        <Button
          onClick={onStartNew}
          variant="outline"
          className="text-gray-700 border-gray-300 hover:bg-gray-100 bg-transparent"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Neues Turnier
        </Button>
      </div>
    </div>
  )
}