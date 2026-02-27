"use client"

import { useState } from "react"
import { Info, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function PointsInfoBox() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4 mb-4">

      {/* HEADER (immer sichtbar) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 rounded-md p-1.5">
            <Info className="w-4 h-4 text-white" />
          </div>

          <h3 className="font-semibold text-orange-900 text-sm sm:text-base">
            Punktesystem
          </h3>

          <Badge className="bg-orange-500 text-white text-[11px] px-2 py-0.5">
            Info
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="h-7 w-7 p-0 text-orange-700"
        >
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* INHALT (aufklappbar) */}
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-orange-200">
          <p className="text-xs sm:text-sm text-orange-800 leading-snug">
            Bewertung: <strong>Leg-Wins (3)</strong>, <strong>180/171 (25)</strong>,{" "}
            <strong>High Tonne (18)</strong>, <strong>Tonne (15)</strong>,{" "}
            <strong>95+ (12)</strong>, <strong>Shanghai (10)</strong>,{" "}
            <strong>Bull (8)</strong>, <strong>15–20 (1–6)</strong>.
          </p>
        </div>
      )}
    </div>
  )
}