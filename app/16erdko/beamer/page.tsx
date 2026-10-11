"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Activity,
  Monitor,
  Radio,
  Trophy,
  Users,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useDkoTvEvents, type DkoTvEvent } from "@/components/emd-tv/use-dko-tv-events"

type DkoMatch = {
  id: number
  player1: string
  player2: string
  score1: number
  score2: number
  winner?: string
  loser?: string
  machineNumber?: number
}

type IntroItem = {
  key: string
  matchId: number
  player1: string
  player2: string
  machineNumber: number
}

type WinnerFlash = {
  key: string
  matchId: number
  winner: string
  loser: string
  score1: number
  score2: number
  machineNumber?: number
}

type RankingRow = {
  player_name: string
  placement: number
  eliminated_at?: string
}

const INTRO_MS = 1800
const WINNER_FLASH_MS = 2400

const toMatch = (row: any): DkoMatch => ({
  id: Number(row.match_id),
  player1: row.player1 || "",
  player2: row.player2 || "",
  score1: Number(row.score1 || 0),
  score2: Number(row.score2 || 0),
  winner: row.winner || undefined,
  loser: row.loser || undefined,
  machineNumber: row.machine_number || undefined,
})

function MatchIntro({ item, tournamentName }: { item: IntroItem; tournamentName: string }) {
  return (
    <div className="emd-broadcast-overlay fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#080b11] px-[4vw] py-[4vh] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(251,146,60,.12),transparent_38%)]" />

      <div className="emd-tv-enter relative mx-auto flex w-full max-w-[1380px] flex-col items-center text-center">
        <div className="inline-flex items-center rounded-full border border-orange-400/25 bg-orange-400/10 px-[1.1vw] py-[.6vh] text-[clamp(11px,.9vw,15px)] font-black uppercase tracking-[.18em] text-orange-300 shadow-[0_0_28px_rgba(251,146,60,.16)]">
          Match startet
        </div>

        <div className="mt-[5vh] max-w-[1000px] break-words text-[clamp(56px,6vw,118px)] font-black leading-[.96] tracking-[-.06em] text-white">
          {item.player1}
        </div>

        <div className="mt-[3vh] flex items-center justify-center gap-[1.2vw]">
          <span className="h-px w-[clamp(80px,10vw,170px)] bg-gradient-to-r from-transparent to-orange-300/80" />
          <span className="text-[clamp(28px,2.2vw,42px)] font-black leading-none tracking-[-.05em] text-orange-300">VS</span>
          <span className="h-px w-[clamp(80px,10vw,170px)] bg-gradient-to-l from-transparent to-orange-300/80" />
        </div>

        <div className="mt-[3vh] max-w-[1220px] break-words text-[clamp(56px,5.8vw,110px)] font-black leading-[.98] tracking-[-.06em] text-white">
          {item.player2}
        </div>

        <div className="mt-[4vh] text-[clamp(18px,1.35vw,28px)] font-bold uppercase tracking-[.18em] text-slate-400">
          Board {item.machineNumber}
        </div>
      </div>
    </div>
  )
}

function getBracketSide(matchId: number) {
  if (matchId >= 1 && matchId <= 28) {
    return {
      label: "GEWINNERSEITE",
      badge: "border-sky-300/25 bg-sky-400/10 text-sky-300",
      border: "border-sky-300/30",
    }
  }

  if ((matchId >= 9 && matchId <= 12) || (matchId >= 17 && matchId <= 22) || (matchId >= 25 && matchId <= 27) || matchId === 29) {
    return {
      label: "VERLIERERSEITE",
      badge: "border-rose-300/25 bg-rose-400/10 text-rose-300",
      border: "border-rose-300/30",
    }
  }

  if (matchId === 30) {
    return {
      label: "GROSSES FINALE",
      badge: "border-amber-300/25 bg-amber-400/10 text-amber-300",
      border: "border-amber-300/30",
    }
  }

  return {
    label: "BRACKET RESET",
    badge: "border-violet-300/25 bg-violet-400/10 text-violet-300",
    border: "border-violet-300/30",
  }
}


function WinnerResultBanner({
  item,
}: {
  item: WinnerFlash
}) {
  return (
    <div className="emd-tv-enter min-w-0 flex-1 lg:max-w-[780px]">
      <div className="rounded-[20px] border border-white/10 bg-[#131a25] px-[18px] py-[14px] shadow-[0_24px_70px_-48px_rgba(0,0,0,.9)]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="min-w-0 text-left">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-300">Sieger</div>
            <div className="mt-0.5 truncate text-[clamp(15px,1.25vw,21px)] font-bold leading-tight text-white">{item.winner}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center">
            <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-500">M{item.matchId}</div>
            <div className="mt-0.5 text-[clamp(18px,1.35vw,24px)] font-black leading-none tracking-[-0.04em] text-orange-300">{item.score1}:{item.score2}</div>
          </div>

          <div className="min-w-0 text-right">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-500">Gegner</div>
            <div className="mt-0.5 truncate text-[clamp(15px,1.25vw,21px)] font-bold leading-tight text-slate-200">{item.loser}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WinnerOverlay({ item, tournamentName }: { item: WinnerFlash; tournamentName: string }) {
  return (
    <div className="emd-broadcast-overlay fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-[#080b11] px-[4vw] py-[4vh] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(16,185,129,.12),transparent_38%)]" />

      <div className="emd-tv-enter relative mx-auto flex w-full max-w-[1380px] flex-col items-center text-center">
        <div className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-[1.1vw] py-[.6vh] text-[clamp(11px,.9vw,15px)] font-black uppercase tracking-[.18em] text-emerald-300 shadow-[0_0_28px_rgba(16,185,129,.14)]">
          Match beendet
        </div>

        <div className="mt-[5vh] max-w-[1040px] break-words text-[clamp(62px,6.6vw,126px)] font-black leading-[.94] tracking-[-.065em] text-white">
          {item.winner}
        </div>

        <div className="mt-[2.6vh] text-[clamp(20px,1.45vw,30px)] font-medium tracking-[.02em] text-slate-400">gegen</div>

        <div className="mt-[1vh] max-w-[980px] break-words text-[clamp(28px,2.5vw,50px)] font-bold leading-[1.05] tracking-[-.03em] text-slate-100">
          {item.loser}
        </div>

        <div className="mt-[4vh] rounded-[22px] border border-emerald-400/22 bg-emerald-400/8 px-[2vw] py-[1.8vh] shadow-[0_0_40px_rgba(16,185,129,.10)]">
          <div className="whitespace-nowrap text-[clamp(48px,4.4vw,86px)] font-black leading-none tracking-[-.06em] text-white">
            {item.score1}:{item.score2}
          </div>
        </div>

        <div className="mt-[3.4vh] text-[clamp(17px,1.25vw,26px)] font-medium tracking-[.16em] text-slate-400">
          {item.machineNumber ? `BOARD ${item.machineNumber}` : `MATCH ${item.matchId}`}
        </div>
      </div>
    </div>
  )
}

function LiveMatchCard({ match }: { match: DkoMatch }) {
  const bracketSide = getBracketSide(match.id)
  return (
    <article className="min-w-0 overflow-hidden rounded-[16px] border border-white/10 bg-[#131a25] h-[clamp(106px,12.2vh,126px)] flex flex-col">
      <div className="flex h-[clamp(32px,3.3vh,38px)] shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-white/[.035] px-[1vw] py-[.45vh]">
        <div className="flex min-w-0 items-center gap-[.55vw] overflow-hidden">
          <span className="shrink-0 text-[clamp(10px,.82vw,14px)] font-extrabold uppercase tracking-[.12em] text-slate-200">MATCH {match.id}</span>
          <span className="truncate text-[clamp(8px,.62vw,11px)] font-black uppercase tracking-[.18em] text-slate-500">{bracketSide.label}</span>
        </div>
        <span className="shrink-0 rounded-md border border-orange-400/22 bg-orange-400/10 px-[.52vw] py-[.2vh] text-[clamp(9px,.78vw,13px)] font-black uppercase tracking-[.08em] text-orange-300">Board {match.machineNumber}</span>
      </div>

      <div className="flex-1 px-[1vw] py-[.8vh]">
        <div className="flex h-full flex-col justify-center gap-[.55vh]">
          <div className="flex min-w-0 items-center justify-between gap-[.8vw]">
            <div className="min-w-0 truncate text-[clamp(14px,1.2vw,21px)] font-extrabold leading-tight text-white">{match.player1}</div>
            <div className="shrink-0 text-[clamp(16px,1.32vw,22px)] font-black leading-none tabular-nums text-orange-300">{match.score1}</div>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-[.8vw]">
            <div className="min-w-0 truncate text-[clamp(14px,1.2vw,21px)] font-extrabold leading-tight text-white">{match.player2}</div>
            <div className="shrink-0 text-[clamp(16px,1.32vw,22px)] font-black leading-none tabular-nums text-orange-300">{match.score2}</div>
          </div>
        </div>
      </div>
    </article>
  )
}

function BroadcastMatchCard({
  match,
  side,
}: {
  match: DkoMatch
  side: "winner" | "loser" | "final" | "reset"
}) {
  const isLive = Boolean(match.machineNumber && !match.winner)
  const isDone = Boolean(match.winner)
  const winnerIsP1 = isDone && match.winner === match.player1
  const winnerIsP2 = isDone && match.winner === match.player2

  const sideLabel =
    side === "winner"
      ? "GEWINNERSEITE"
      : side === "loser"
        ? "VERLIERERSEITE"
        : side === "final"
          ? "FINALE"
          : "RESET"

  const statusText = isLive ? `Live · Board ${match.machineNumber}` : isDone ? "Beendet" : "Ausstehend"
  const statusClass = isLive
    ? "border-emerald-400/22 bg-emerald-400/10 text-emerald-300"
    : isDone
      ? "border-emerald-400/18 bg-emerald-400/8 text-emerald-300"
      : "border-white/10 bg-white/[0.04] text-slate-400"

  return (
    <article className={`min-w-0 overflow-hidden rounded-[16px] border bg-[#131a25] h-[clamp(106px,12.2vh,126px)] flex flex-col ${isLive || isDone ? "border-emerald-400/25" : "border-white/10"}`}>
      <div className="flex h-[clamp(32px,3.3vh,38px)] shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-white/[.035] px-[1vw] py-[.45vh]">
        <div className="flex min-w-0 items-center gap-[.55vw] overflow-hidden">
          <span className="shrink-0 text-[clamp(10px,.82vw,14px)] font-extrabold uppercase tracking-[.12em] text-slate-200">MATCH {match.id}</span>
          <span className="truncate text-[clamp(8px,.62vw,11px)] font-black uppercase tracking-[.18em] text-slate-500">{sideLabel}</span>
        </div>
        <span className={`shrink-0 rounded-md border px-[.52vw] py-[.2vh] text-[clamp(9px,.78vw,13px)] font-black uppercase tracking-[.08em] ${statusClass}`}>{statusText}</span>
      </div>

      <div className="flex-1 px-[1vw] py-[.8vh]">
        <div className="flex h-full flex-col justify-center gap-[.55vh]">
          <div className="flex min-w-0 items-center justify-between gap-[.8vw]">
            <div className={`min-w-0 truncate text-[clamp(14px,1.2vw,21px)] font-extrabold leading-tight ${winnerIsP1 ? "text-emerald-300" : isDone ? "text-slate-200" : "text-white"}`}>{match.player1 || "Noch offen"}</div>
            <div className={`shrink-0 text-[clamp(16px,1.32vw,22px)] font-black leading-none tabular-nums ${winnerIsP1 ? "text-emerald-300" : isDone ? "text-slate-300" : "text-orange-300"}`}>{match.score1}</div>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-[.8vw]">
            <div className={`min-w-0 truncate text-[clamp(14px,1.2vw,21px)] font-extrabold leading-tight ${winnerIsP2 ? "text-emerald-300" : isDone ? "text-slate-200" : "text-white"}`}>{match.player2 || "Noch offen"}</div>
            <div className={`shrink-0 text-[clamp(16px,1.32vw,22px)] font-black leading-none tabular-nums ${winnerIsP2 ? "text-emerald-300" : isDone ? "text-slate-300" : "text-orange-300"}`}>{match.score2}</div>
          </div>
        </div>
      </div>
    </article>
  )
}

function StageColumn({
  label,
  matches,
  side,
}: {
  label: string
  matches: DkoMatch[]
  side: "winner" | "loser" | "final" | "reset"
}) {
  if (matches.length === 0) return null

  return (
    <section className="min-w-0">
      <div className="mb-2 text-[clamp(11px,.85vw,16px)] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="space-y-2">
        {matches.map((match) => (
          <BroadcastMatchCard key={match.id} match={match} side={side} />
        ))}
      </div>
    </section>
  )
}

function SideHeader({
  eyebrow,
  title,
  tone,
  count,
}: {
  eyebrow: string
  title: string
  tone: "sky" | "rose" | "amber"
  count: number
}) {
  const toneText =
    tone === "sky" ? "text-sky-300" : tone === "rose" ? "text-rose-300" : "text-amber-300"

  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <div className={`text-[clamp(10px,.8vw,14px)] font-bold uppercase tracking-[0.16em] ${toneText}`}>{eyebrow}</div>
        <h2 className="mt-0.5 text-[clamp(21px,1.8vw,32px)] font-bold tracking-[-0.03em] text-white">{title}</h2>
      </div>
      <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {count} Paarungen
      </div>
    </div>
  )
}


function BroadcastRounds({
  stages, matches, side, title, eyebrow,
}: {
  stages: { label: string; ids: number[] }[]
  matches: Record<number, DkoMatch>
  side: "winner" | "loser"
  title: string
  eyebrow: string
}) {
  const visibleStages = stages.map(stage => ({
    ...stage,
    rows: stage.ids.map(id => matches[id]).filter((match): match is DkoMatch => Boolean(match && (match.player1 || match.player2 || match.winner || match.machineNumber))),
  })).filter(stage => stage.rows.length > 0)
  const [scene, setScene] = useState(0)
  const scenes = visibleStages.flatMap(stage => {
    const segments: { label: string; rows: DkoMatch[]; part: number; total: number }[] = []
    const total = Math.ceil(stage.rows.length / 8)
    for (let n = 0; n < total; n++) {
      segments.push({ label: stage.label, rows: stage.rows.slice(n * 8, (n + 1) * 8), part: n + 1, total })
    }
    return segments
  })
  useEffect(() => {
    if (scenes.length < 2) return
    const timer = setInterval(() => setScene(current => (current + 1) % scenes.length), 8500)
    return () => clearInterval(timer)
  }, [scenes.length])
  const current = scenes[scene % Math.max(1, scenes.length)]
  const count = visibleStages.reduce((sum, stage) => sum + stage.rows.length, 0)
  const flatMatches = visibleStages.flatMap(stage => stage.rows)
  const liveCount = flatMatches.filter(match => Boolean(match.machineNumber && !match.winner)).length
  const doneCount = flatMatches.filter(match => Boolean(match.winner)).length
  const openCount = flatMatches.length - liveCount - doneCount

  return (
    <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(250px,27%)] gap-[1vw] overflow-hidden">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#101620] p-[1.2vw]">
        <div className="mb-[1.2vh] flex shrink-0 items-center justify-between gap-3">
          <div>
            <div className={`text-[clamp(9px,.75vw,12px)] font-bold uppercase tracking-[.18em] ${side === "winner" ? "text-sky-300" : "text-rose-300"}`}>{eyebrow}</div>
            <h2 className="text-[clamp(16px,1.45vw,26px)] font-black tracking-[-.03em] text-white">{title}</h2>
          </div>
          <span className="rounded-md border border-white/8 bg-white/[0.03] px-[.7vw] py-[.42vh] text-[clamp(10px,.82vw,14px)] font-black text-slate-400">{count} Paarungen</span>
        </div>

        {current ? (
          <>
            <div className="mb-[1vh] flex shrink-0 items-center justify-between gap-3">
              <h3 className="text-[clamp(15px,1.18vw,22px)] font-black tracking-[-.02em] text-white">{current.label}</h3>
              <div className="rounded-md border border-white/8 bg-white/[0.03] px-[.55vw] py-[.35vh] text-[clamp(10px,.8vw,13px)] font-black text-slate-400">{current.total > 1 ? `Teil ${current.part}/${current.total} · ` : ""}Ansicht {(scene % scenes.length) + 1}/{scenes.length}</div>
            </div>
            <div className="grid min-h-0 content-start gap-[1vw] overflow-hidden grid-cols-2">
              {current.rows.map(match => <BroadcastMatchCard key={match.id} match={match} side={side} />)}
            </div>
          </>
        ) : (
          <div className="grid min-h-0 flex-1 place-items-center rounded-xl border border-dashed border-white/15 bg-white/[.02] p-6 text-center">
            <div>
              <div className="text-[clamp(20px,2.1vw,36px)] font-black">Die nächste Runde wird vorbereitet</div>
              <p className="mt-2 text-[clamp(13px,1.1vw,20px)] text-slate-400">Sobald Paarungen feststehen, werden sie hier angezeigt.</p>
            </div>
          </div>
        )}
      </section>

      <aside className="flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#101620] p-[1.15vw]">
        <div className="mb-[1.2vh] flex items-center justify-between gap-2">
          <div>
            <div className="text-[clamp(9px,.75vw,12px)] font-bold uppercase tracking-[.18em] text-slate-500">Bracket</div>
            <h2 className="text-[clamp(16px,1.35vw,24px)] font-black tracking-[-.03em] text-white">Übersicht</h2>
          </div>
          <span className="rounded-md border border-white/8 bg-white/[0.03] px-[.55vw] py-[.35vh] text-[clamp(10px,.82vw,14px)] font-black text-orange-300">{visibleStages.length}</span>
        </div>

        <div className="min-h-0 space-y-[1vh] overflow-hidden">
          <div className="min-w-0 rounded-xl border border-white/10 bg-[#171f2b] p-[.9vw]">
            <div className="mb-[.55vh] flex items-center justify-between text-[clamp(9px,.78vw,13px)] font-black uppercase tracking-[.12em] text-orange-300">
              <span>Aktuelle Runde</span>
              <span className="text-slate-500">{current ? `${(scene % scenes.length) + 1}/${scenes.length}` : '—'}</span>
            </div>
            <div className="truncate text-[clamp(14px,1.12vw,20px)] font-extrabold text-white">{current?.label || 'Wird vorbereitet'}</div>
          </div>

          <div className="min-w-0 rounded-xl border border-white/10 bg-[#171f2b] p-[.9vw]">
            <div className="mb-[.55vh] text-[clamp(9px,.78vw,13px)] font-black uppercase tracking-[.12em] text-orange-300">Status</div>
            <div className="space-y-[.55vh]">
              {liveCount > 0 && <div className="flex items-center justify-between text-[clamp(13px,1vw,18px)] font-extrabold text-white"><span>Live</span><span className="text-emerald-300">{liveCount}</span></div>}
              <div className="flex items-center justify-between text-[clamp(13px,1vw,18px)] font-extrabold text-white"><span>Beendet</span><span className="text-slate-300">{doneCount}</span></div>
              <div className="flex items-center justify-between text-[clamp(13px,1vw,18px)] font-extrabold text-white"><span>Offen</span><span className="text-orange-300">{openCount}</span></div>
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-white/10 bg-[#171f2b] p-[.9vw]">
            <div className="mb-[.55vh] text-[clamp(9px,.78vw,13px)] font-black uppercase tracking-[.12em] text-orange-300">Ansicht</div>
            <div className="truncate text-[clamp(14px,1.12vw,20px)] font-extrabold text-white">{side === 'winner' ? 'Winners Bracket' : 'Losers Bracket'}</div>
            <div className="mt-[.25vh] text-[clamp(9px,.62vw,11px)] font-black uppercase tracking-[.12em] text-slate-600">Paarungen insgesamt</div>
            <div className="mt-[.15vh] text-[clamp(14px,1.02vw,18px)] font-extrabold text-white">{count}</div>
          </div>
        </div>
      </aside>
    </main>
  )
}

function WinnersView({ matches }: { matches: Record<number, DkoMatch> }) {
  const stages = [
    { label: 'Runde 1', ids: [1, 2, 3, 4, 5, 6, 7, 8] },
    { label: 'Runde 2', ids: [13, 14, 15, 16] },
    { label: 'Runde 3', ids: [23, 24] },
    { label: 'Finale Gewinnerseite', ids: [28] }
  ]
  return <BroadcastRounds stages={stages} matches={matches} side="winner" title="Winners Bracket" eyebrow="Gewinnerseite" />
}

function LosersView({ matches }: { matches: Record<number, DkoMatch> }) {
  const stages = [
    { label: 'Runde 1', ids: [9, 10, 11, 12] },
    { label: 'Runde 2', ids: [17, 18, 19, 20] },
    { label: 'Runde 3', ids: [21, 22] },
    { label: 'Runde 4', ids: [25, 26] },
    { label: 'Runde 5', ids: [27] },
    { label: 'Finale Verliererseite', ids: [29] }
  ]
  return <BroadcastRounds stages={stages} matches={matches} side="loser" title="Losers Bracket" eyebrow="Verliererseite" />
}

function FinalsView({ matches }: { matches: Record<number, DkoMatch> }) {
  const finalMatch = matches[30]
  const resetMatch = matches[31]
  const finalReady = Boolean(finalMatch && ((finalMatch.player1 && finalMatch.player2) || finalMatch.winner || finalMatch.machineNumber))
  const resetReady = Boolean(resetMatch && ((resetMatch.player1 && resetMatch.player2) || resetMatch.winner || resetMatch.machineNumber))
  const count = Number(finalReady) + Number(resetReady)

  return (
    <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(250px,27%)] gap-[1vw] overflow-hidden">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#101620] p-[1.2vw]">
        <div className="mb-[1.2vh] flex shrink-0 items-center justify-between gap-3">
          <div>
            <div className="text-[clamp(9px,.75vw,12px)] font-bold uppercase tracking-[.18em] text-amber-300">Finalphase</div>
            <h2 className="text-[clamp(16px,1.45vw,26px)] font-black tracking-[-.03em] text-white">Grand Final</h2>
          </div>
          <span className="rounded-md border border-white/8 bg-white/[0.03] px-[.7vw] py-[.42vh] text-[clamp(10px,.82vw,14px)] font-black text-slate-400">{count} Paarungen</span>
        </div>

        <div className="grid min-h-0 content-start gap-[1vw] overflow-hidden grid-cols-2">
          {finalReady && <BroadcastMatchCard match={finalMatch} side="final" />}
          {resetReady && <BroadcastMatchCard match={resetMatch} side="reset" />}
          {!finalReady && !resetReady && (
            <div className="col-span-2 grid min-h-0 flex-1 place-items-center rounded-xl border border-dashed border-white/15 bg-white/[.02] p-6 text-center">
              <div>
                <div className="text-[clamp(20px,2.1vw,36px)] font-black">Finalpaarung steht noch nicht fest</div>
                <p className="mt-2 text-[clamp(13px,1.1vw,20px)] text-slate-400">Sobald Spieler feststehen, erscheinen die Finalspiele hier.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside className="flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#101620] p-[1.15vw]">
        <div className="mb-[1.2vh] flex items-center justify-between gap-2">
          <div>
            <div className="text-[clamp(9px,.75vw,12px)] font-bold uppercase tracking-[.18em] text-slate-500">Finals</div>
            <h2 className="text-[clamp(16px,1.35vw,24px)] font-black tracking-[-.03em] text-white">Übersicht</h2>
          </div>
          <span className="rounded-md border border-white/8 bg-white/[0.03] px-[.55vw] py-[.35vh] text-[clamp(10px,.82vw,14px)] font-black text-orange-300">{count}</span>
        </div>

        <div className="min-h-0 space-y-[1vh] overflow-hidden">
          <div className="min-w-0 rounded-xl border border-white/10 bg-[#171f2b] p-[.9vw]">
            <div className="mb-[.55vh] text-[clamp(9px,.78vw,13px)] font-black uppercase tracking-[.12em] text-orange-300">Status</div>
            <div className="space-y-[.55vh]">
              <div className="flex items-center justify-between text-[clamp(13px,1vw,18px)] font-extrabold text-white"><span>Finale</span><span className="text-slate-300">{finalReady ? 'bereit' : 'offen'}</span></div>
              <div className="flex items-center justify-between text-[clamp(13px,1vw,18px)] font-extrabold text-white"><span>Reset</span><span className="text-slate-300">{resetReady ? 'bereit' : 'offen'}</span></div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  )
}

export default function DkoBeamerPage() {
  const searchParams = useSearchParams()
  const tournamentId = searchParams.get("tournamentId") || ""
  const tournamentName = searchParams.get("tournamentName") || "16er DKO"
  const tournamentType = searchParams.get("tournamentType") || "16er_dko"

  const [matches, setMatches] = useState<Record<number, DkoMatch>>({})
  const [loading, setLoading] = useState(true)
  const [rankings, setRankings] = useState<RankingRow[]>([])
  const [activeView, setActiveView] = useState<"live" | "winners" | "losers" | "finals">("live")
  const [livePage, setLivePage] = useState(0)
  const autoRotate = true
  const previousFinalsAvailableRef = useRef(false)
  const previousLiveMatchIdsRef = useRef<string>("")
  const [introQueue, setIntroQueue] = useState<IntroItem[]>([])
  const [activeIntro, setActiveIntro] = useState<IntroItem | null>(null)
  const [winnerFlash, setWinnerFlash] = useState<WinnerFlash | null>(null)
  const [winnerQueue, setWinnerQueue] = useState<WinnerFlash[]>([])
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const winnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const shownIntroKeysRef = useRef<Set<string>>(new Set())
  const shownWinnerKeysRef = useRef<Set<number>>(new Set())
  const matchesRef = useRef<Record<number, DkoMatch>>({})
  // A match may be announced again only after it is visibly scheduled/played again.
  // A DELETE or partial/unordered update alone must never re-arm an old result.
  const eligibleForReplayRef = useRef<Set<number>>(new Set())
  const snapshotReadyRef = useRef(false)

  const enqueueIntro = useCallback((match: DkoMatch) => {
    if (!match.machineNumber || !match.player1 || !match.player2 || match.winner) return

    const key = `${match.id}-${match.machineNumber}`
    if (shownIntroKeysRef.current.has(key)) return
    shownIntroKeysRef.current.add(key)

    setIntroQueue((prev) => [
      ...prev,
      {
        key,
        matchId: match.id,
        player1: match.player1,
        player2: match.player2,
        machineNumber: match.machineNumber!,
      },
    ])
  }, [])

  const showWinnerFlash = useCallback((match: DkoMatch) => {
    if (!match.winner) return

    // One completed match produces at most one broadcast, even if its score
    // is updated afterwards or Supabase delivers duplicate changes.
    if (shownWinnerKeysRef.current.has(match.id)) return
    shownWinnerKeysRef.current.add(match.id)
    eligibleForReplayRef.current.delete(match.id)
    const key = `finished-${match.id}`

    const item: WinnerFlash = {
      key,
      matchId: match.id,
      winner: match.winner,
      loser: match.loser || (match.winner === match.player1 ? match.player2 : match.player1),
      score1: match.score1,
      score2: match.score2,
      machineNumber: match.machineNumber,
    }

    setWinnerQueue((prev) => [...prev, item])
  }, [])

  const eventToMatch = useCallback((event: DkoTvEvent): DkoMatch => ({
    id: Number(event.match_id),
    player1: event.payload?.player1 || "",
    player2: event.payload?.player2 || "",
    score1: Number(event.payload?.score1 || 0),
    score2: Number(event.payload?.score2 || 0),
    winner: event.payload?.winner || undefined,
    loser: event.payload?.loser || undefined,
    machineNumber: event.payload?.machine_number || undefined,
  }), [])

  const onTvMatchStarted = useCallback((event: DkoTvEvent) => {
    enqueueIntro(eventToMatch(event))
  }, [enqueueIntro, eventToMatch])

  // Only the confirmed match-state transition may trigger the winner overlay.
  // TV events can be replayed and are deliberately not used for finishes.
  useDkoTvEvents({
    tournamentId,
    tournamentType,
    onMatchStarted: onTvMatchStarted,
  })

  useEffect(() => {
    if (activeIntro || winnerFlash || introQueue.length === 0) return

    const [next, ...rest] = introQueue
    setIntroQueue(rest)
    setActiveIntro(next)
  }, [activeIntro, introQueue, winnerFlash])

  useEffect(() => {
    if (activeIntro || winnerFlash || winnerQueue.length === 0) return

    const [next, ...rest] = winnerQueue
    setWinnerQueue(rest)
    // Drop stale queue entries that no longer describe the currently stored match.
    const current = matchesRef.current[next.matchId]
    if (!current?.winner || current.winner !== next.winner ||
        current.score1 !== next.score1 || current.score2 !== next.score2) return
    setWinnerFlash(next)
  }, [activeIntro, winnerFlash, winnerQueue])

  useEffect(() => {
    if (!winnerFlash) return

    if (winnerTimerRef.current) clearTimeout(winnerTimerRef.current)
    winnerTimerRef.current = setTimeout(() => {
      setWinnerFlash(null)
      winnerTimerRef.current = null
    }, WINNER_FLASH_MS)

    return () => {
      if (winnerTimerRef.current) {
        clearTimeout(winnerTimerRef.current)
        winnerTimerRef.current = null
      }
    }
  }, [winnerFlash])

  useEffect(() => {
    if (!activeIntro) return

    introTimerRef.current = setTimeout(() => {
      setActiveIntro(null)
      introTimerRef.current = null
    }, INTRO_MS)

    return () => {
      if (introTimerRef.current) {
        clearTimeout(introTimerRef.current)
        introTimerRef.current = null
      }
    }
  }, [activeIntro])

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false)
      return
    }

    let mounted = true
    snapshotReadyRef.current = false
    shownWinnerKeysRef.current.clear()
    eligibleForReplayRef.current.clear()
    setWinnerQueue([])
    setWinnerFlash(null)

    const load = async () => {
      const { data, error } = await supabase
        .from("dko_match_states")
        .select("match_id, player1, player2, score1, score2, winner, loser, machine_number")
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)
        .order("match_id", { ascending: true })

      if (!mounted) return

      if (!error) {
        const next: Record<number, DkoMatch> = {}
        ;(data || []).forEach((row: any) => {
          const match = toMatch(row)
          next[match.id] = match
        })
        // The initial snapshot is history, never an announcement.
        // Also prevents delayed updates of previously finished matches replaying.
        Object.values(next).forEach(match => {
          if (match.winner) shownWinnerKeysRef.current.add(match.id)
        })
        matchesRef.current = next
        setMatches(next)
        snapshotReadyRef.current = true
      }

      setLoading(false)
    }

    void load()

    const channel = supabase
      .channel(`dko_beamer_${tournamentType}_${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dko_match_states",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload: any) => {
          const eventType = payload?.eventType

          // IMPORTANT: Bei Reset/Löschen liefert Supabase bei DELETE keinen payload.new.
          // Ohne diese Behandlung blieb der alte Match-State im Beamer hängen.
          if (eventType === "DELETE") {
            const oldRow = payload?.old
            const deletedMatchId = Number(oldRow?.match_id)

            if (Number.isFinite(deletedMatchId) && deletedMatchId > 0) {
              setMatches((prev) => {
                if (!prev[deletedMatchId]) return prev
                const next = { ...prev }
                delete next[deletedMatchId]
                return next
              })
            }

            // Clear pending messages, but do not re-arm the same match ID yet:
            // delayed DELETE/INSERT pairs are not proof of a newly played match.
            eligibleForReplayRef.current.delete(deletedMatchId)
            setWinnerQueue(queue => queue.filter(item => item.matchId !== deletedMatchId))
            setWinnerFlash((current) =>
              current && current.matchId === deletedMatchId ? null : current,
            )
            setActiveIntro((current) =>
              current && current.matchId === deletedMatchId ? null : current,
            )
            setIntroQueue((queue) =>
              queue.filter((item) => item.matchId !== deletedMatchId),
            )
            return
          }

          const row = payload?.new
          if (!row) return
          if (row.tournament_type && row.tournament_type !== tournamentType) return

          const nextMatch = toMatch(row)

          const previousMatch = matchesRef.current[nextMatch.id]
          // Until the initial snapshot exists, changes must not create broadcasts.
          // Avoid converting historic INSERT/UPDATE events into fresh winners.
          if (!snapshotReadyRef.current) return

          // An actually re-opened match with participants and an assigned board
          // is the only condition that can allow another winner after a reset.
          if (!nextMatch.winner && nextMatch.player1 && nextMatch.player2 && nextMatch.machineNumber) {
            if (shownWinnerKeysRef.current.has(nextMatch.id)) {
              eligibleForReplayRef.current.add(nextMatch.id)
            }
          }

          if (!previousMatch?.machineNumber && nextMatch.machineNumber && !nextMatch.winner) {
            enqueueIntro(nextMatch)
          }
          if (previousMatch?.winner && !nextMatch.winner) {
            setWinnerQueue(queue => queue.filter(item => item.matchId !== nextMatch.id))
          }
          if (!previousMatch?.winner && nextMatch.winner) {
            // An already announced match must first have visibly restarted.
            if (shownWinnerKeysRef.current.has(nextMatch.id) && eligibleForReplayRef.current.has(nextMatch.id)) {
              shownWinnerKeysRef.current.delete(nextMatch.id)
            }
            showWinnerFlash(nextMatch)
          }

          const nextMatches = {
            ...matchesRef.current,
            [nextMatch.id]: nextMatch,
          }
          matchesRef.current = nextMatches
          setMatches(nextMatches)
        },
      )
      .subscribe()

    return () => {
      mounted = false
      if (winnerTimerRef.current) {
        clearTimeout(winnerTimerRef.current)
        winnerTimerRef.current = null
      }
      supabase.removeChannel(channel)
    }
  }, [enqueueIntro, showWinnerFlash, tournamentId, tournamentType])

  useEffect(() => {
    if (!tournamentId) return

    let mounted = true

    const loadRankings = async () => {
      const { data, error } = await supabase
        .from("dko_rankings")
        .select("player_name, placement, eliminated_at")
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)
        .order("placement", { ascending: true })
        .order("eliminated_at", { ascending: true })

      if (!mounted || error) return
      setRankings((data || []) as RankingRow[])
    }

    loadRankings()

    const rankingsChannel = supabase
      .channel(`dko_beamer_rankings_${tournamentType}_${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dko_rankings",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          loadRankings()
        },
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(rankingsChannel)
    }
  }, [tournamentId, tournamentType])

  const allMatches = useMemo(() => Object.values(matches).sort((a, b) => a.id - b.id), [matches])
  const liveMatches = allMatches.filter((match) => match.machineNumber && match.player1 && match.player2 && !match.winner)
  const livePages = Math.max(1, Math.ceil(liveMatches.length / 6))
  const visibleLiveMatches = liveMatches.slice((livePage % livePages) * 6, ((livePage % livePages) + 1) * 6)
  useEffect(() => {
    if (livePages < 2) return
    const timer = setInterval(() => setLivePage(page => (page + 1) % livePages), 7500)
    return () => clearInterval(timer)
  }, [livePages])
  const readyMatches = allMatches.filter(
    (match) => match.player1 && match.player2 && !match.winner && !match.machineNumber,
  )
  const completedMatches = allMatches.filter((match) => Boolean(match.winner))
  // 16er DKO: 30 reguläre Matches, Match 31 nur bei einem erforderlichen Reset.
  // Ein leerer, vorsorglich angelegter Reset zählt noch nicht als weiteres Match.
  const resetMatch = matches[31]
  const resetScheduled = Boolean(resetMatch && (resetMatch.player1 || resetMatch.player2 || resetMatch.machineNumber || resetMatch.winner))
  const progressTotal = resetScheduled ? 31 : 30
  const progressCompleted = allMatches.filter(match => match.id >= 1 && match.id <= progressTotal && Boolean(match.winner)).length
  const winner =
    matches[31]?.winner ||
    (matches[30]?.winner && matches[30]?.winner === matches[30]?.player1 ? matches[30]?.winner : undefined)

  // Vor dem endgültigen Turniersieger nie voreilig 100 % anzeigen.
  const progressPercent = winner ? 100 : Math.min(99, Math.round((progressCompleted / progressTotal) * 100))

  const hasLosersView = [9, 10, 11, 12, 17, 18, 19, 20, 21, 22, 25, 26, 27, 29].some((id) => {
    const match = matches[id]
    return Boolean(match && ((match.player1 && match.player2) || match.winner || match.machineNumber))
  })
  const hasFinalsView = [30, 31].some((id) => {
    const match = matches[id]
    return Boolean(match && ((match.player1 && match.player2) || match.winner || match.machineNumber))
  })

  useEffect(() => {
    if (!autoRotate || winner) return

    const timer = setInterval(() => {
      setActiveView((current) => {
        const views: Array<"live" | "winners" | "losers" | "finals"> = ["live", "winners"]
        if (hasLosersView) views.push("losers")
        if (hasFinalsView) views.push("finals")

        const safeCurrent = views.includes(current) ? current : "live"
        const index = views.indexOf(safeCurrent)
        return views[(index + 1) % views.length] || "live"
      })
    }, 30000)

    return () => clearInterval(timer)
  }, [autoRotate, hasLosersView, hasFinalsView, winner])

  useEffect(() => {
    if (!autoRotate || winner) return

    const liveIds = liveMatches.map((match) => match.id).sort((a, b) => a - b).join(",")
    const previousLiveIds = previousLiveMatchIdsRef.current

    if (previousLiveIds && liveIds !== previousLiveIds && liveIds) {
      setActiveView("live")
    }

    previousLiveMatchIdsRef.current = liveIds
  }, [autoRotate, liveMatches, winner])

  useEffect(() => {
    if (!autoRotate || winner) return

    const wasAvailable = previousFinalsAvailableRef.current
    if (!wasAvailable && hasFinalsView) {
      setActiveView("finals")
    }

    previousFinalsAvailableRef.current = hasFinalsView
  }, [autoRotate, hasFinalsView, winner])

  useEffect(() => {
    if (activeView === "losers" && !hasLosersView) {
      setActiveView("live")
      return
    }

    if (activeView === "finals" && !hasFinalsView) {
      setActiveView("live")
    }
  }, [activeView, hasLosersView, hasFinalsView])


  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />
          <div className="mt-4 text-sm font-bold text-slate-400">Beamer wird verbunden…</div>
        </div>
      </div>
    )
  }

  if (!tournamentId) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
        <div className="max-w-lg rounded-[28px] border border-white/10 bg-white/5 p-8 text-center">
          <Monitor className="mx-auto h-10 w-10 text-slate-500" />
          <h1 className="mt-4 text-2xl font-black">Kein Turnier ausgewählt</h1>
          <p className="mt-2 text-slate-400">Öffne den Beamer direkt aus dem laufenden 16er-DKO.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#090d14] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[36vh] bg-[radial-gradient(ellipse_at_50%_0%,rgba(249,115,22,.09),transparent_68%)]" />
      {activeIntro && <MatchIntro item={activeIntro} tournamentName={tournamentName} />}
      {!activeIntro && winnerFlash && <WinnerOverlay item={winnerFlash} tournamentName={tournamentName} />}

      <style jsx global>{`
        @keyframes emdTvSimpleIn { from { opacity: 0; transform: translate3d(0,12px,0); } to { opacity: 1; transform: translate3d(0,0,0); } }
        @keyframes emdTvProgress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        .emd-tv-enter { animation: emdTvSimpleIn .35s ease-out both; }
        .emd-tv-progress { transform-origin: left; animation-name: emdTvProgress; animation-timing-function: linear; animation-fill-mode: both; }
        .emd-broadcast-overlay { isolation: isolate; }
        @media (prefers-reduced-motion: reduce) { .emd-tv-enter { animation: none; } }
        @media (max-height: 700px) { .emd-tv-hide-short { display: none !important; } }
        html, body { overflow: hidden !important; background: #050608; }
        @media (min-width: 1200px) and (max-height: 900px) {
          .emd-tv-hide-short { display: none !important; }
        }
        @media (min-width: 1200px) and (max-height: 760px) {
          .emd-tv-live-title { display: none !important; }
        }
        @media (min-width: 1200px) and (max-height: 820px) {
          .emd-tv-header-caption { display: none !important; }
        }
      `}</style>

      <div className="relative mx-auto flex h-full w-full max-w-[2200px] flex-col px-[2vw] py-[1.15vh]">
        <header className="mb-[1vh] shrink-0">
          <div className="relative flex items-center justify-between gap-4 overflow-hidden rounded-[20px] border border-white/10 bg-[#101620] px-[1.15vw] py-[.95vh] shadow-[0_18px_60px_-38px_rgba(0,0,0,.7)]">
            <div aria-label={`Turnierfortschritt ${progressPercent} Prozent`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent} className="pointer-events-none absolute inset-x-0 top-0 h-[4px] bg-white/[.08]">
              <div className="h-full bg-[#FF941F] transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex min-w-0 items-center gap-[.9vw]">
              <div className="grid h-[clamp(34px,2.55vw,44px)] w-[clamp(34px,2.55vw,44px)] shrink-0 place-items-center rounded-xl border border-orange-400/18 bg-[#171f2b]">
                <Monitor className="h-[clamp(16px,1.18vw,20px)] w-[clamp(16px,1.18vw,20px)] text-orange-300" />
              </div>
              <h1 className="min-w-0 truncate text-[clamp(18px,1.6vw,28px)] font-black tracking-[-.04em] text-white">{tournamentName}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-[.65vw] text-[clamp(10px,.8vw,14px)] font-bold">
              <span className="mr-[.2vw] tabular-nums text-[#FF941F]">{progressPercent}%</span>
              <span className="rounded-md border border-emerald-400/25 bg-emerald-400/8 px-[.72vw] py-[.46vh] text-emerald-300">● LIVE</span>
              <span className="rounded-md border border-white/8 bg-white/[0.03] px-[.72vw] py-[.46vh] text-slate-400">{completedMatches.length} BEENDET</span>
              <a href="https://emojisdartverein.com/live-all-app" target="_blank" rel="noopener noreferrer" aria-label="Live-Turniere auf dem Handy öffnen" title="Auf dem Handy live verfolgen" className="ml-[.6vw] flex shrink-0 items-center gap-[.7vw] border-l border-white/10 pl-[1vw]">
                <img src="/emd-live-qr.png" alt="QR-Code: emojisdartverein.com/live-all-app" className="block h-[clamp(60px,4vw,74px)] w-[clamp(60px,4vw,74px)] rounded-[4px] bg-white p-[3px]" />
                <span className="whitespace-nowrap text-[clamp(10px,.72vw,13px)] font-extrabold uppercase tracking-[.07em] text-slate-300">Live am Handy</span>
              </a>
            </div>
          </div>
        </header>

        {winner ? (
          <section className="mt-4 min-h-0 flex-1 rounded-[32px] border border-amber-300/20 bg-[radial-gradient(circle_at_28%_32%,rgba(251,191,36,.14),transparent_30%),rgba(255,255,255,.025)] p-6 lg:p-8">
            <div className="grid h-full min-h-0 items-center gap-5 xl:grid-cols-[1.35fr_.65fr]">
              <div className="min-w-0">
                <div className="text-center xl:text-left">
                  <div className="inline-grid h-14 w-14 place-items-center rounded-[18px] border border-amber-300/20 bg-amber-300/10">
                    <Trophy className="h-7 w-7 text-amber-300" />
                  </div>
                  <div className="mt-5 text-[11px] font-black uppercase tracking-[0.26em] text-amber-300">Turnier beendet</div>
                  <h2 className="mt-2 text-[clamp(28px,2.7vw,48px)] font-black tracking-[-0.05em] text-white">Podium</h2>
                </div>

                <div className="mx-auto mt-4 grid max-w-[900px] items-end gap-3 sm:grid-cols-3 xl:mx-0">
                  {[
                    { place: 2, label: "2. Platz", tone: "border-slate-300/20 bg-slate-300/[0.06] text-slate-200", height: "sm:min-h-[145px]" },
                    { place: 1, label: "Turniersieger", tone: "border-amber-300/30 bg-amber-300/10 text-amber-200", height: "sm:min-h-[175px]" },
                    { place: 3, label: "3. Platz", tone: "border-orange-300/20 bg-orange-300/[0.06] text-orange-200", height: "sm:min-h-[130px]" },
                  ].map((slot) => {
                    const row = rankings.find((ranking) => Number(ranking.placement) === slot.place)
                    const fallbackName =
                      slot.place === 1
                        ? winner
                        : slot.place === 2
                          ? (matches[31]?.loser || matches[30]?.loser || "")
                          : (matches[29]?.loser || "")

                    return (
                      <div
                        key={slot.place}
                        className={`flex ${slot.height} min-w-0 flex-col justify-between rounded-[20px] border p-4 ${slot.tone}`}
                      >
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">{slot.label}</div>
                          <div className="mt-2 truncate text-[clamp(18px,1.7vw,28px)] font-black leading-tight tracking-[-0.035em] text-white">
                            {row?.player_name || fallbackName || "—"}
                          </div>
                        </div>
                        <div className="mt-3 text-3xl font-black opacity-30">#{slot.place}</div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-3 text-center text-xs font-bold text-slate-600 xl:text-left">
                  {completedMatches.length} Matches abgeschlossen
                </div>
              </div>

              <aside className="rounded-[26px] border border-white/10 bg-slate-950/35 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Endstand</div>
                    <div className="mt-1 text-xl font-black tracking-[-0.03em] text-white">Weitere Platzierungen</div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black text-slate-500">
                    4–8
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {rankings
                    .filter((ranking) => Number(ranking.placement) >= 4)
                    .sort((a, b) => Number(a.placement) - Number(b.placement))
                    .map((ranking) => (
                      <div
                        key={`${ranking.placement}-${ranking.player_name}`}
                        className="flex items-center gap-3 rounded-[16px] border border-white/[0.07] bg-white/[0.025] px-3.5 py-3"
                      >
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-xs font-black text-slate-500">
                          {ranking.placement}
                        </div>
                        <div className="min-w-0 truncate text-sm font-bold text-slate-200">
                          {ranking.player_name}
                        </div>
                      </div>
                    ))}

                  {rankings.filter((ranking) => Number(ranking.placement) >= 4).length === 0 && (
                    <div className="rounded-[16px] border border-dashed border-white/10 px-4 py-7 text-center text-sm font-semibold text-slate-600">
                      Platzierungen werden geladen …
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </section>
        ) : activeView === "winners" ? (
          <WinnersView matches={matches} />
        ) : activeView === "losers" ? (
          <LosersView matches={matches} />
        ) : activeView === "finals" ? (
          <FinalsView matches={matches} />
        ) : (
          <>

            <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(250px,27%)] gap-[1vw] overflow-hidden">
              <section className="flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#101620] p-[1.2vw]">
                <div className="mb-[1.2vh] flex shrink-0 items-center justify-between gap-3">
                  <div>
                    <div className="text-[clamp(9px,.75vw,12px)] font-bold uppercase tracking-[.18em] text-slate-500">Live Center</div>
                    <h2 className="text-[clamp(16px,1.45vw,26px)] font-black tracking-[-.03em] text-white">Laufende Matches</h2>
                  </div>
                  <span className="rounded-md border border-emerald-400/18 bg-emerald-400/8 px-[.7vw] py-[.42vh] text-[clamp(10px,.82vw,14px)] font-black text-emerald-300">{liveMatches.length} LIVE{livePages > 1 ? ` · ${livePage % livePages + 1}/${livePages}` : ""}</span>
                </div>
                {liveMatches.length === 0 ? (
                  <div className="grid min-h-0 flex-1 place-items-center rounded-xl border border-dashed border-white/15 bg-white/[.02] p-6 text-center">
                    <div><Activity className="mx-auto mb-4 h-10 w-10 text-orange-400"/><div className="text-[clamp(20px,2.1vw,36px)] font-black">Das nächste Match kommt gleich</div><p className="mt-2 text-[clamp(13px,1.1vw,20px)] text-slate-400">Neue Paarungen erscheinen automatisch.</p></div>
                  </div>
                ) : (
                  <div className={`grid min-h-0 content-start gap-[1vw] overflow-hidden ${liveMatches.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {visibleLiveMatches.map((match) => <LiveMatchCard key={match.id} match={match} />)}
                  </div>
                )}
              </section>
              <aside className="flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#101620] p-[1.15vw]">
                <div className="mb-[1.2vh] flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[clamp(9px,.75vw,12px)] font-bold uppercase tracking-[.18em] text-slate-500">Queue</div>
                    <h2 className="text-[clamp(16px,1.35vw,24px)] font-black tracking-[-.03em] text-white">Als Nächstes</h2>
                  </div>
                  <span className="rounded-md border border-white/8 bg-white/[0.03] px-[.55vw] py-[.35vh] text-[clamp(10px,.82vw,14px)] font-black text-orange-300">{readyMatches.length}</span>
                </div>
                <div className="min-h-0 space-y-[1vh] overflow-hidden">
                  {readyMatches.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-[clamp(13px,1.1vw,19px)] text-slate-400">Momentan keine wartende Paarung</p> :
                    readyMatches.slice(0, 5).map((match, index) => (
                      <div key={match.id} className="min-w-0 rounded-xl border border-white/10 bg-[#171f2b] p-[.9vw]">
                        <div className="mb-[.55vh] flex items-center justify-between text-[clamp(9px,.78vw,13px)] font-black uppercase tracking-[.12em] text-orange-300"><span>Match {match.id}</span>{index === 0 && <span className="text-slate-500">NÄCHSTES</span>}</div>
                        <div className="truncate text-[clamp(14px,1.12vw,20px)] font-extrabold text-white">{match.player1}</div>
                        <div className="my-[.25vh] text-[clamp(9px,.62vw,11px)] font-black uppercase tracking-[.12em] text-slate-600">Gegen</div>
                        <div className="truncate text-[clamp(14px,1.12vw,20px)] font-extrabold text-white">{match.player2}</div>
                      </div>
                    ))}
                </div>
              </aside>
            </main>
          </>
        )}
      </div>
    </div>
  )
}
