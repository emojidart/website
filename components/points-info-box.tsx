"use client"

import { useState } from "react"
import { Info, ChevronDown } from "lucide-react"

export function PointsInfoBox() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.035] text-white backdrop-blur-xl">
      
      {/* Orange Top Bar */}
      <div className="h-px bg-gradient-to-r from-transparent via-orange-300/30 to-transparent" />

      {/* HEADER */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-300/20 flex items-center justify-center">
            <Info className="w-5 h-5 text-orange-300" />
          </div>

          <div>
            <p className="text-sm sm:text-base font-black text-white">
              Punktesystem
            </p>
            <p className="text-xs text-white/38">
              Erklärung der Punktevergabe
            </p>
          </div>
        </div>

        <ChevronDown
          className={`w-5 h-5 text-white/38 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* CONTENT */}
      {isOpen && (
        <div className="px-4 sm:px-5 pb-5 pt-2 text-sm text-white/58 space-y-3">
          
          <div className="flex justify-between">
            <span>Leg-Win</span>
            <span className="font-black text-emerald-300">+3</span>
          </div>

          <div className="flex justify-between">
            <span>180 / 171</span>
            <span className="font-black text-orange-300">+25</span>
          </div>

          <div className="flex justify-between">
            <span>High Tonne</span>
            <span className="font-black text-sky-300">+18</span>
          </div>

          <div className="flex justify-between">
            <span>Tonne</span>
            <span className="font-black text-indigo-300">+15</span>
          </div>

          <div className="flex justify-between">
            <span>95+</span>
            <span className="font-black text-violet-300">+12</span>
          </div>

          <div className="flex justify-between">
            <span>Shanghai</span>
            <span className="font-black text-pink-300">+10</span>
          </div>

          <div className="flex justify-between">
            <span>Bull</span>
            <span className="font-black text-red-300">+8</span>
          </div>

          <div className="flex justify-between">
            <span>15–20 Felder</span>
            <span className="font-black text-white">+1 bis +6</span>
          </div>

          <div className="pt-3 border-t border-white/10 text-xs text-white/38">
            Die Gesamtpunkte ergeben sich aus allen geworfenen Legs und Sonderwertungen.
          </div>
        </div>
      )}
    </div>
  )
}