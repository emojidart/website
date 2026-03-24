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
    <div className="bg-yellow-100 border-2 border-yellow-500 rounded-2xl p-5 mb-8 flex flex-col md:flex-row items-center gap-4">
      <div className="p-3 bg-yellow-500 rounded-full text-white flex-shrink-0">
        <RefreshCcw className="h-6 w-6" />
      </div>

      <div className="flex-1 text-yellow-800 text-center md:text-left">
        <h3 className="font-bold text-lg mb-1">Laufendes Turnier gefunden!</h3>
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