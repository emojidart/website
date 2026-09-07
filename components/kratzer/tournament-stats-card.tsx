"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { KratzerPlayer } from "@/types/tournament"
import { AlertTriangle, BarChart3, Calendar, Trophy, UserCheck, Users, UserX } from "lucide-react"

interface TournamentStatsCardProps {
  players: KratzerPlayer[]
  currentRound: number
  tournamentFinished: boolean
  winner: KratzerPlayer | null
}

function Metric({
  icon,
  label,
  value,
  tone = "slate",
}: {
  icon: ReactNode
  label: string
  value: string
  tone?: "slate" | "orange" | "green" | "red" | "amber"
}) {
  const toneClass = {
    slate: "bg-slate-100 text-slate-700",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
  }[tone]

  return (
    <div className="group rounded-[20px] border border-slate-200 bg-white p-4 transition hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
          <div className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{value}</div>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${toneClass}`}>{icon}</span>
      </div>
    </div>
  )
}

export function TournamentStatsCard({ players, currentRound, tournamentFinished, winner }: TournamentStatsCardProps) {
  const remaining = players.filter((p) => !p.isEliminated).length
  const active = players.filter((p) => !p.isEliminated && p.lives > 1).length
  const danger = players.filter((p) => !p.isEliminated && p.lives === 1).length
  const out = players.filter((p) => p.isEliminated).length

  return (
    <Card className="mb-5 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_55px_-42px_rgba(15,23,42,.55)]">
      <CardHeader className="border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
        <CardTitle className="flex items-center gap-3 text-lg font-black text-slate-950">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-slate-950 text-white">
            <BarChart3 className="h-5 w-5 text-orange-400" />
          </span>
          Turnier-Statistiken
        </CardTitle>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-3 p-4 sm:p-5 lg:grid-cols-3 xl:grid-cols-5">
        {tournamentFinished && winner ? (
          <>
            <Metric icon={<Trophy className="h-5 w-5" />} label="Turniersieger" value={winner.name} tone="amber" />
            <Metric icon={<Calendar className="h-5 w-5" />} label="Runden gespielt" value={String(currentRound)} tone="orange" />
            <Metric icon={<Users className="h-5 w-5" />} label="Teilnehmer" value={String(players.length)} />
            <Metric icon={<UserCheck className="h-5 w-5" />} label="Verbleibende Leben" value={String(winner.lives)} tone="green" />
          </>
        ) : (
          <>
            <Metric icon={<Calendar className="h-5 w-5" />} label="Aktuelle Runde" value={String(currentRound)} tone="orange" />
            <Metric icon={<Users className="h-5 w-5" />} label="Verbleibend" value={String(remaining)} tone="green" />
            <Metric icon={<UserCheck className="h-5 w-5" />} label="Aktive Spieler" value={String(active)} />
            <Metric icon={<AlertTriangle className="h-5 w-5" />} label="Gefährdet" value={String(danger)} tone="amber" />
            <Metric icon={<UserX className="h-5 w-5" />} label="Ausgeschieden" value={String(out)} tone="red" />
          </>
        )}
      </CardContent>
    </Card>
  )
}
