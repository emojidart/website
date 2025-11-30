"use client"

import { useEffect, useState } from "react"

interface DoorCardProps {
  dayNumber: number
  isOpened: boolean
  onClick: () => void
}

export function DoorCard({ dayNumber, isOpened, onClick }: DoorCardProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpened) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 600)
      return () => clearTimeout(timer)
    }
  }, [isOpened])

  return (
    <button
      onClick={onClick}
      disabled={isOpened}
      className={`relative aspect-square rounded-lg overflow-hidden transition-all duration-300 group ${
        isOpened ? "pointer-events-none" : "hover:scale-105 active:scale-95 cursor-pointer"
      }`}
    >
      {!isOpened ? (
        <div className="relative w-full h-full bg-gradient-to-br from-primary via-primary to-primary/80 shadow-xl hover:shadow-2xl transition-all duration-300">
          {/* Luxe border frame */}
          <div className="absolute inset-0 border border-secondary/30" />
          <div className="absolute inset-2 border border-secondary/10 rounded-sm" />

          {/* Day number */}
          <div className="flex items-center justify-center h-full">
            <span className="text-4xl md:text-5xl font-light text-primary-foreground drop-shadow-lg">{dayNumber}</span>
          </div>

          {/* Subtle shine effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Decorative corner accent */}
          <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-secondary/30 to-transparent" />
        </div>
      ) : (
        <div
          className={`relative w-full h-full bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 shadow-md flex items-center justify-center transition-all duration-500 ${
            isAnimating ? "door-perspective" : ""
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="text-5xl md:text-6xl text-secondary animate-pulse">✓</div>
            <span className="text-xs md:text-sm font-semibold text-secondary uppercase tracking-widest">
              Beantwortet
            </span>
          </div>
        </div>
      )}
    </button>
  )
}
