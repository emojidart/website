import { Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function PointsInfoBox() {
  return (
    <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="bg-orange-500 rounded-lg p-2 flex-shrink-0">
          <Info className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-orange-900 text-lg">Punktesystem</h3>
            <Badge className="bg-orange-500 text-white">Info</Badge>
          </div>
          <p className="text-sm text-orange-800 leading-relaxed">
            Die Spieler werden nach einem Punktesystem bewertet: <strong>Leg-Wins (3 Pkt)</strong>,{" "}
            <strong>180er/171er (25 Pkt)</strong>, <strong>High Tonne (18 Pkt)</strong>, <strong>Tonne (15 Pkt)</strong>
            , <strong>95+ (12 Pkt)</strong>, <strong>Shanghai (10 Pkt)</strong>, <strong>Bull (8 Pkt)</strong> und{" "}
            <strong>Standart-Würfe 15-20 (1-6 Pkt)</strong>.
          </p>
          {/* </CHANGE> */}
        </div>
      </div>
    </div>
  )
}
