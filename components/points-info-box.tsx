"use client"

import { useState } from "react"
import { Info, ChevronDown } from "lucide-react"

export function PointsInfoBox() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      
      {/* Orange Top Bar */}
      <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

      {/* HEADER */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
            <Info className="w-5 h-5 text-orange-600" />
          </div>

          <div>
            <p className="text-sm sm:text-base font-black text-gray-900">
              Punktesystem
            </p>
            <p className="text-xs text-gray-500">
              Erklärung der Punktevergabe
            </p>
          </div>
        </div>

        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* CONTENT */}
      {isOpen && (
        <div className="px-4 sm:px-5 pb-5 pt-2 text-sm text-gray-700 space-y-3">
          
          <div className="flex justify-between">
            <span>Leg-Win</span>
            <span className="font-black text-green-600">+3</span>
          </div>

          <div className="flex justify-between">
            <span>180 / 171</span>
            <span className="font-black text-orange-600">+25</span>
          </div>

          <div className="flex justify-between">
            <span>High Tonne</span>
            <span className="font-black text-blue-600">+18</span>
          </div>

          <div className="flex justify-between">
            <span>Tonne</span>
            <span className="font-black text-indigo-600">+15</span>
          </div>

          <div className="flex justify-between">
            <span>95+</span>
            <span className="font-black text-purple-600">+12</span>
          </div>

          <div className="flex justify-between">
            <span>Shanghai</span>
            <span className="font-black text-pink-600">+10</span>
          </div>

          <div className="flex justify-between">
            <span>Bull</span>
            <span className="font-black text-red-600">+8</span>
          </div>

          <div className="flex justify-between">
            <span>15–20 Felder</span>
            <span className="font-black text-gray-900">+1 bis +6</span>
          </div>

          <div className="pt-3 border-t border-gray-200 text-xs text-gray-500">
            Die Gesamtpunkte ergeben sich aus allen geworfenen Legs und Sonderwertungen.
          </div>
        </div>
      )}
    </div>
  )
}