"use client"

import { useState } from "react"

interface CompletedQuiz {
  day: number
  selected_answer: string
  is_correct: boolean
}

interface AdventCalendarDoorsProps {
  selectedDay: number | null
  onSelectDay: (day: number) => void
  completedQuizzes: CompletedQuiz[]
}

const dayIcons: Record<number, string> = {
  1: "🎁", // Geschenk
  2: "🎄", // Weihnachtsbaum
  3: "🎅", // Weihnachtsmann
  4: "⭐", // Stern statt Dartscheibe
  5: "🔔", // Glocke
  6: "⛄", // Schneemann
  7: "❄️", // Schneeflocke
  8: "🕯️", // Kerze
  9: "💡", // Lichterkette
  10: "🎿", // Ski
  11: "🧦", // Weihnachtssocke
  12: "🎁", // Geschenk
  13: "🎄", // Weihnachtsbaum
  14: "🍪", // Keks statt Fußball
  15: "🎀", // Schleife statt Dartscheibe
  16: "🍫", // Schokolade
  17: "🔔", // Glocke
  18: "🦌", // Rentier statt Würfel
  19: "🎄", // Weihnachtsbaum
  20: "🧸", // Teddy statt Dartscheibe
  21: "⛄", // Schneemann
  22: "🎅", // Weihnachtsmann
  23: "❄️", // Schneeflocke
  24: "⭐", // Stern (Heiligabend)
}

export function AdventCalendarDoors({ selectedDay, onSelectDay, completedQuizzes }: AdventCalendarDoorsProps) {
  const today = new Date().getDate()
  const [animatingDay, setAnimatingDay] = useState<number | null>(null)

  const handleDoorClick = (day: number) => {
    const isFuture = day > today
    if (isFuture) return

    setAnimatingDay(day)
    setTimeout(() => {
      setAnimatingDay(null)
      onSelectDay(day)
    }, 3500)
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
      {Array.from({ length: 24 }, (_, i) => i + 1).map((day) => {
        const isCompleted = completedQuizzes.some((q) => q.day === day)
        const isFuture = day > today
        const isToday = day === today
        const isAnimating = animatingDay === day

        const icon = dayIcons[day] || "🎁"

        return (
          <div key={day} className="perspective-container relative">
            {isAnimating && (
              <>
                <div className="absolute inset-0 pointer-events-none z-50">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-1/2 left-1/2 w-2 h-2 bg-yellow-300 rounded-full animate-sparkle-out"
                      style={{
                        animationDelay: `${i * 0.05}s`,
                        transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-30px)`,
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            <div
              className={`door-3d ${isAnimating ? "door-flip-open" : ""}`}
              style={{
                transformStyle: "preserve-3d",
              }}
            >
              <button
                onClick={() => handleDoorClick(day)}
                disabled={isFuture || isAnimating}
                className={`door-front ${
                  isFuture ? "door-future" : isCompleted ? "door-completed" : isToday ? "door-today" : "door-available"
                }`}
              >
                <div className="absolute inset-2 border-2 border-amber-900/20 rounded-lg pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center justify-center h-full">
                  <div className="text-4xl md:text-5xl lg:text-6xl mb-1 drop-shadow-lg">{icon}</div>
                  <div className="text-3xl md:text-4xl lg:text-5xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    {String(day).padStart(2, "0")}
                  </div>
                  {isCompleted && (
                    <div className="text-sm md:text-base text-white font-bold mt-1 drop-shadow-lg">✓</div>
                  )}
                </div>

                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 via-transparent to-black/20 pointer-events-none" />
              </button>

              <div className="door-back">
                <div className="text-center relative px-2">
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <div className="text-6xl sm:text-8xl md:text-9xl">⭐</div>
                  </div>
                  <div className="relative z-10">
                    <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-2 sm:mb-3 animate-bounce-slow">
                      {icon}
                    </div>
                    <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-amber-900">
                      Tag {day}
                    </div>
                    <div className="text-xs sm:text-sm text-amber-700 mt-1 sm:mt-2">Quiz öffnet...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
