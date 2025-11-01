"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Trophy, Calendar, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"

const highlights = [
  {
    icon: Trophy,
    title: "Nächstes Turnier",
    description: "Vereinsmeisterschaft 2025",
    date: "15. März 2025",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Calendar,
    title: "Kommende Spiele",
    description: "5 Spiele diese Woche",
    date: "Diese Woche",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: TrendingUp,
    title: "Top Spieler",
    description: "Aktuelle Rangliste",
    date: "Jetzt ansehen",
    color: "from-green-500 to-emerald-500",
  },
]

export function HighlightsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % highlights.length)
  }

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + highlights.length) % highlights.length)
  }

  return (
    <section className="py-4 md:py-8 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-2xl font-bold text-gray-900">Highlights</h2>
          <div className="hidden md:flex gap-2">
            <Button variant="outline" size="icon" onClick={prev} className="rounded-full bg-transparent">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={next} className="rounded-full bg-transparent">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Mobile: Horizontal scroll */}
        <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-3 pb-2">
            {highlights.map((highlight, index) => (
              <div key={index} className="flex-shrink-0 w-72 p-4 rounded-2xl bg-white shadow-md">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${highlight.color} flex items-center justify-center mb-3`}
                >
                  <highlight.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">{highlight.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{highlight.description}</p>
                <p className="text-xs text-gray-500">{highlight.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: Carousel */}
        <div className="hidden md:block">
          <div className="grid grid-cols-3 gap-4">
            {highlights.map((highlight, index) => (
              <div key={index} className="p-6 rounded-2xl bg-white shadow-md hover:shadow-lg transition-shadow">
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${highlight.color} flex items-center justify-center mb-4`}
                >
                  <highlight.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{highlight.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{highlight.description}</p>
                <p className="text-xs text-gray-500">{highlight.date}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
