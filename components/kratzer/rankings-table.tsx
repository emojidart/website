"use client"

import type { KratzerPlayer } from "@/types/tournament"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Minus, Plus, RotateCcw, X } from "lucide-react"

interface RankingsTableProps {
  players: KratzerPlayer[]
  currentRound: number
  onEditPlayerLives: (playerId: string, newLives: number) => Promise<void>
  onTogglePlayerElimination: (playerId: string) => Promise<void>
  loading: boolean
}

export function RankingsTable({ players, currentRound, onEditPlayerLives, onTogglePlayerElimination, loading }: RankingsTableProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isEliminated && !b.isEliminated) return 1
    if (!a.isEliminated && b.isEliminated) return -1
    return b.lives - a.lives
  })

  return (
    <div className="overflow-x-auto rounded-[20px] border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-200 bg-slate-50/80 hover:bg-slate-50/80">
            <TableHead className="w-16 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Rang</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Spieler</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Ligastatus</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Leben</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Status</TableHead>
            <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPlayers.map((player, index) => (
            <TableRow key={player.id} className={`border-slate-100 transition-colors ${player.isEliminated ? "bg-slate-50/60 opacity-60" : "hover:bg-slate-50/70"}`}>
              <TableCell>
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${index === 0 && !player.isEliminated ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>{index + 1}</span>
              </TableCell>
              <TableCell className="font-black text-slate-950">{player.name}</TableCell>
              <TableCell><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600">{player.ligastatus || "—"}</span></TableCell>
              <TableCell>
                <div className="inline-flex items-center rounded-[14px] border border-slate-200 bg-white p-1">
                  <Button onClick={() => onEditPlayerLives(player.id, Math.max(0, player.lives - 1))} disabled={loading || player.lives <= 0} variant="ghost" size="sm" className="h-8 w-8 rounded-[10px] p-0 text-slate-500 hover:bg-rose-50 hover:text-rose-700" title="Leben reduzieren"><Minus className="h-4 w-4" /></Button>
                  <span className="min-w-[42px] text-center text-lg font-black text-slate-950">{player.lives}</span>
                  <Button onClick={() => onEditPlayerLives(player.id, player.lives + 1)} disabled={loading} variant="ghost" size="sm" className="h-8 w-8 rounded-[10px] p-0 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" title="Leben erhöhen"><Plus className="h-4 w-4" /></Button>
                </div>
              </TableCell>
              <TableCell>
                {player.isEliminated ? <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700">Aus · Runde {player.eliminationRound}</span> : <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">Im Turnier</span>}
              </TableCell>
              <TableCell className="text-right">
                <Button onClick={() => onTogglePlayerElimination(player.id)} disabled={loading} variant="ghost" size="sm" className={`h-9 rounded-xl px-3 font-bold ${player.isEliminated ? "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" : "text-slate-600 hover:bg-rose-50 hover:text-rose-700"}`} title={player.isEliminated ? "Spieler reaktivieren" : "Spieler ausscheiden"}>
                  {player.isEliminated ? <RotateCcw className="mr-1.5 h-4 w-4" /> : <X className="mr-1.5 h-4 w-4" />}
                  {player.isEliminated ? "Reaktivieren" : "Ausscheiden"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
