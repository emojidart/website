"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, TrendingUp, Users } from "lucide-react"
import Link from "next/link"

export function MobileContentSections() {
  return (
    <div className="space-y-8 md:hidden px-4 py-6 bg-white">
      {/* Nächste Spiele Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Nächste Spiele</h2>
          <Link href="/spielplan" className="text-sm text-orange-600 font-medium hover:text-orange-700">
            Alle →
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="min-w-[260px] p-4 bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="text-xs font-medium">
                  <Calendar className="w-3 h-3 mr-1" />
                  Heute, 19:00
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="font-semibold text-gray-900 text-sm">Team A</div>
                  <div className="text-xl font-bold text-orange-600 mt-1">-</div>
                </div>
                <div className="text-xs text-gray-400 px-3 font-medium">vs</div>
                <div className="text-center flex-1">
                  <div className="font-semibold text-gray-900 text-sm">Team B</div>
                  <div className="text-xl font-bold text-orange-600 mt-1">-</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Highlights Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Highlights</h2>
          <Link href="/news" className="text-sm text-orange-600 font-medium hover:text-orange-700">
            Mehr →
          </Link>
        </div>
        <div className="space-y-3">
          <Card className="p-4 bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Rekord-Wurf!</h3>
                <p className="text-xs text-gray-600 line-clamp-2">Max Mustermann erzielt 180 Punkte</p>
                <span className="text-xs text-gray-400 mt-1 inline-block">vor 2 Stunden</span>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
                <Users className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Neues Turnier</h3>
                <p className="text-xs text-gray-600 line-clamp-2">Anmeldung für Frühjahrsturnier geöffnet</p>
                <span className="text-xs text-gray-400 mt-1 inline-block">vor 5 Stunden</span>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
