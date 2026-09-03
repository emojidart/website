"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/kratzer/stat-card"
import type { KratzerPlayer } from "@/types/tournament"
import { AlertTriangle, BarChart3, Calendar, Heart, Trophy, UserCheck, Users, UserX } from "lucide-react"

interface TournamentStatsCardProps {
  players: KratzerPlayer[]
  currentRound: number
  tournamentFinished: boolean
  winner: KratzerPlayer | null
}

export function TournamentStatsCard({
  players,
  currentRound,
  tournamentFinished,
  winner,
}: TournamentStatsCardProps) {
  return (
    <Card className="mb-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <CardHeader className="mb-0 border-b border-gray-100 bg-gray-50/60 px-5 py-4">
        <CardTitle className="flex items-center gap-2 text-lg font-black text-gray-950">
          <BarChart3 className="h-6 w-6 text-orange-600" />
          Turnier-Statistiken
        </CardTitle>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-3 p-5 lg:grid-cols-3 xl:grid-cols-5">
        {tournamentFinished && winner ? (
          <>
            <StatCard
              icon={<Trophy className="h-8 w-8" />}
              label="Turniersieger"
              value={winner.name}
              gradient="from-yellow-400 to-yellow-600"
            />
            <StatCard
              icon={<Calendar className="h-8 w-8" />}
              label="Runden gespielt"
              value={currentRound.toString()}
              gradient="from-orange-400 to-orange-600"
            />
            <StatCard
              icon={<Users className="h-8 w-8" />}
              label="Teilnehmer"
              value={players.length.toString()}
              gradient="from-green-400 to-green-600"
            />
            <StatCard
              icon={<Heart className="h-8 w-8" />}
              label="Verbleibende Leben"
              value={winner.lives.toString()}
              gradient="from-purple-400 to-purple-600"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={<Calendar className="h-8 w-8" />}
              label="Aktuelle Runde"
              value={currentRound.toString()}
              gradient="from-orange-400 to-orange-600"
            />
            <StatCard
              icon={<Users className="h-8 w-8" />}
              label="Verbleibende Spieler"
              value={players.filter((p) => !p.isEliminated).length.toString()}
              gradient="from-green-400 to-green-600"
            />
            <StatCard
              icon={<UserCheck className="h-8 w-8" />}
              label="Aktive Spieler"
              value={players.filter((p) => !p.isEliminated && p.lives > 1).length.toString()}
              gradient="from-cyan-400 to-cyan-600"
            />
            <StatCard
              icon={<AlertTriangle className="h-8 w-8" />}
              label="Gefährdete Spieler"
              value={players.filter((p) => !p.isEliminated && p.lives === 1).length.toString()}
              gradient="from-orange-400 to-orange-600"
            />
            <StatCard
              icon={<UserX className="h-8 w-8" />}
              label="Ausgeschiedene Spieler"
              value={players.filter((p) => p.isEliminated).length.toString()}
              gradient="from-red-400 to-red-600"
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}