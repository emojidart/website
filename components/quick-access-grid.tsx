"use client"

import Link from "next/link"
import { Trophy, Target, Calendar, BarChart3, Users, Newspaper } from "lucide-react"

const quickAccessItems = [
  {
    icon: Trophy,
    label: "Tabellen",
    href: "/tabellen",
    gradient: "from-orange-500 to-orange-600",
  },
  {
    icon: Target,
    label: "Live",
    href: "/live",
    gradient: "from-pink-500 to-pink-600",
  },
  {
    icon: Calendar,
    label: "Spielplan",
    href: "/spielplan",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    icon: BarChart3,
    label: "Statistiken",
    href: "/statistiken",
    gradient: "from-green-500 to-green-600",
  },
  {
    icon: Users,
    label: "Teams",
    href: "/teams",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    icon: Newspaper,
    label: "News",
    href: "/news",
    gradient: "from-amber-500 to-amber-600",
  },
]

export function QuickAccessGrid() {
  return (
    <section className="py-6 md:py-8 px-4 bg-white md:bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {quickAccessItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-2 group">
              <div
                className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-md group-hover:shadow-xl group-hover:scale-105 transition-all duration-200`}
              >
                <item.icon className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center leading-tight">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
