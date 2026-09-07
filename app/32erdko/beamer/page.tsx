"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Activity,
  CheckCircle2,
  Clock3,
  Expand,
  Monitor,
  Radio,
  Trophy,
  Users,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

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

const INTRO_MS = 1750
const WINNER_FLASH_MS = 5000

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

function MatchIntro({
  item,
  tournamentName,
}: {
  item: IntroItem
  tournamentName: string
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_50%_42%,rgba(16,185,129,.18),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(56,189,248,.10),transparent_42%)]" />

      <div className="relative w-[min(92vw,1500px)]">
        <div className="mb-9 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-black uppercase tracking-[0.18em] text-slate-300">
            <Radio className="h-4 w-4 text-emerald-400" />
            Match {item.matchId} startet
          </div>
          <div className="mt-3 text-sm font-bold text-slate-500">{tournamentName}</div>
        </div>

        <div className="grid items-center gap-5 md:grid-cols-[1fr_auto_1fr]">
          <div className="animate-[dkoIntroLeft_.42s_cubic-bezier(.2,.8,.2,1)_both] rounded-[30px] border border-white/10 bg-white/[0.055] p-8 text-right shadow-2xl backdrop-blur">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Spieler 1</div>
            <div className="mt-3 break-words text-[clamp(34px,4.2vw,72px)] font-black leading-[0.96] tracking-[-0.045em]">
              {item.player1}
            </div>
          </div>

          <div className="animate-[dkoIntroPop_.38s_.08s_cubic-bezier(.2,.9,.2,1.1)_both] text-center">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-[28px] border border-emerald-300/20 bg-emerald-400 text-4xl font-black tracking-[-0.06em] text-slate-950 shadow-[0_22px_70px_-20px_rgba(16,185,129,.75)]">
              VS
            </div>
            <div className="mx-auto mt-5 inline-flex min-w-40 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
              <Monitor className="h-5 w-5 text-emerald-400" />
              <span className="text-lg font-black">Automat {item.machineNumber}</span>
            </div>
          </div>

          <div className="animate-[dkoIntroRight_.42s_cubic-bezier(.2,.8,.2,1)_both] rounded-[30px] border border-white/10 bg-white/[0.055] p-8 text-left shadow-2xl backdrop-blur">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Spieler 2</div>
            <div className="mt-3 break-words text-[clamp(34px,4.2vw,72px)] font-black leading-[0.96] tracking-[-0.045em]">
              {item.player2}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 h-1.5 max-w-xl overflow-hidden rounded-full bg-white/10">
          <div className="h-full origin-left animate-[dkoIntroProgress_1.75s_linear_forwards] rounded-full bg-emerald-400" />
        </div>
      </div>
    </div>
  )
}



function getBracketSide(matchId: number) {
  const winnerIds = new Set([
    ...Array.from({ length: 16 }, (_, i) => i + 1),
    ...Array.from({ length: 8 }, (_, i) => i + 25),
    ...Array.from({ length: 4 }, (_, i) => i + 45),
    55, 56, 60,
  ])

  const loserIds = new Set([
    ...Array.from({ length: 8 }, (_, i) => i + 17),
    ...Array.from({ length: 8 }, (_, i) => i + 33),
    ...Array.from({ length: 4 }, (_, i) => i + 41),
    ...Array.from({ length: 4 }, (_, i) => i + 49),
    53, 54, 57, 58, 59, 61,
  ])

  if (winnerIds.has(matchId)) {
    return {
      label: "GEWINNERSEITE",
      badge: "border-sky-300/25 bg-sky-400/10 text-sky-300",
      border: "border-sky-300/30",
    }
  }

  if (loserIds.has(matchId)) {
    return {
      label: "VERLIERERSEITE",
      badge: "border-rose-300/25 bg-rose-400/10 text-rose-300",
      border: "border-rose-300/30",
    }
  }

  if (matchId === 62) {
    return {
      label: "GROSSES FINALE",
      badge: "border-amber-300/25 bg-amber-400/10 text-amber-300",
      border: "border-amber-300/30",
    }
  }

  return {
    label: "RÜCKRUNDE",
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
    <div className="animate-[dkoWinnerIn_.22s_cubic-bezier(.2,.9,.2,1)_both] min-w-0 flex-1 lg:max-w-[720px]">
      <div className="rounded-[18px] border border-white/10 bg-white/[0.035] px-4 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-300">
              Gewinner
            </div>
            <div className="mt-0.5 truncate text-[clamp(15px,1.45vw,22px)] font-bold leading-tight text-white">
              {item.winner}
            </div>
          </div>

          <div className="text-center">
            <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-600">
              M{item.matchId}
            </div>
            <div className="mt-0.5 rounded-lg border border-white/10 bg-slate-950/55 px-2.5 py-1 text-sm font-black">
              {item.score1}:{item.score2}
            </div>
          </div>

          <div className="min-w-0 text-right">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-rose-300">
              Verlierer
            </div>
            <div className="mt-0.5 truncate text-[clamp(15px,1.45vw,22px)] font-bold leading-tight text-slate-200">
              {item.loser}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LiveMatchCard({ match }: { match: DkoMatch }) {
  const bracketSide = getBracketSide(match.id)

  return (
    <div
      className={`rounded-[24px] border ${bracketSide.border} bg-slate-900/70 p-5 shadow-[0_24px_80px_-50px_rgba(16,185,129,.45)] transition-all duration-300`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.18em] text-emerald-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          LIVE · Match {match.id}
        </div>

        <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-sm font-black text-emerald-200">
          Automat {match.machineNumber}
        </div>
      </div>

      <div className="mt-3">
        <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${bracketSide.badge}`}>
          {bracketSide.label}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="min-w-0 rounded-[18px] border border-white/8 bg-white/[0.025] p-3">
          <div className="truncate text-[clamp(16px,1.35vw,23px)] font-bold leading-none text-white">
            {match.player1}
          </div>
          <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Spieler 1</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black text-slate-500">
          VS
        </div>

        <div className="min-w-0 rounded-[18px] border border-white/8 bg-white/[0.025] p-3 text-right">
          <div className="truncate text-[clamp(16px,1.35vw,23px)] font-bold leading-none text-white">
            {match.player2}
          </div>
          <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Spieler 2</div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
          <div className="min-w-20 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-center text-2xl font-black">
            {match.score1}
          </div>
          <span className="text-slate-600">:</span>
          <div className="min-w-20 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-center text-2xl font-black">
            {match.score2}
          </div>
        </div>
    </div>
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

  const tone =
    side === "winner"
      ? "border-sky-300/18"
      : side === "loser"
        ? "border-rose-300/18"
        : side === "final"
          ? "border-amber-300/25"
          : "border-violet-300/25"

  return (
    <div
      className={`relative overflow-hidden rounded-[15px] border ${tone} bg-slate-900/90 shadow-[0_16px_36px_-28px_rgba(0,0,0,.95)] ${
        isLive ? "ring-1 ring-emerald-400/45" : ""
      }`}
    >
      <div className="flex h-7 items-center justify-between border-b border-white/[0.055] px-3">
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">M{match.id}</span>
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            LIVE{match.machineNumber ? ` · Automat ${match.machineNumber}` : ""}
          </span>
        ) : isDone ? (
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">Fertig</span>
        ) : null}
      </div>

      <div className="divide-y divide-white/[0.055]">
        <div className={`flex h-9 items-center justify-between gap-3 px-3 ${winnerIsP1 ? "bg-emerald-400/[0.08]" : ""}`}>
          <span className={`min-w-0 truncate text-[13px] font-semibold ${winnerIsP1 ? "text-emerald-300" : isDone ? "text-slate-400" : "text-slate-100"}`}>
            {match.player1}
          </span>
          <span className={`shrink-0 text-xs font-bold ${winnerIsP1 ? "text-emerald-300" : "text-slate-600"}`}>{match.score1}</span>
        </div>
        <div className={`flex h-9 items-center justify-between gap-3 px-3 ${winnerIsP2 ? "bg-emerald-400/[0.08]" : ""}`}>
          <span className={`min-w-0 truncate text-[13px] font-semibold ${winnerIsP2 ? "text-emerald-300" : isDone ? "text-slate-400" : "text-slate-100"}`}>
            {match.player2}
          </span>
          <span className={`shrink-0 text-xs font-bold ${winnerIsP2 ? "text-emerald-300" : "text-slate-600"}`}>{match.score2}</span>
        </div>
      </div>
    </div>
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
      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">{label}</div>
      <div className="space-y-3">
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
        <div className={`text-[10px] font-bold uppercase tracking-[0.2em] ${toneText}`}>{eyebrow}</div>
        <h2 className="mt-1 text-[clamp(22px,2vw,34px)] font-bold tracking-[-0.03em] text-white">{title}</h2>
      </div>
      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {count} Paarungen
      </div>
    </div>
  )
}

function WinnersView({ matches }: { matches: Record<number, DkoMatch> }) {
  const ready = (id: number) => {
    const match = matches[id]
    return Boolean(match && ((match.player1 && match.player2) || match.winner || match.machineNumber))
  }
  const pick = (ids: number[]) => ids.filter(ready).map((id) => matches[id])
  const stages = [
    { label: "Runde 1", ids: Array.from({ length: 16 }, (_, i) => i + 1) },
    { label: "Runde 2", ids: Array.from({ length: 8 }, (_, i) => i + 25) },
    { label: "Runde 3", ids: Array.from({ length: 4 }, (_, i) => i + 45) },
    { label: "Runde 4", ids: [55, 56] },
    { label: "Finale Gewinnerseite", ids: [60] },
  ]
  const count = stages.reduce((sum, stage) => sum + pick(stage.ids).length, 0)

  return (
    <section className="mt-5 rounded-[26px] border border-sky-300/10 bg-sky-400/[0.018] p-5">
      <SideHeader eyebrow="Gewinnerseite" title="Winners Bracket" tone="sky" count={count} />
      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        {stages.map((stage) => (
          <StageColumn key={stage.label} label={stage.label} matches={pick(stage.ids)} side="winner" />
        ))}
      </div>
    </section>
  )
}

function LosersView({ matches }: { matches: Record<number, DkoMatch> }) {
  const ready = (id: number) => {
    const match = matches[id]
    return Boolean(match && ((match.player1 && match.player2) || match.winner || match.machineNumber))
  }
  const pick = (ids: number[]) => ids.filter(ready).map((id) => matches[id])
  const stages = [
    { label: "Runde 1", ids: Array.from({ length: 8 }, (_, i) => i + 17) },
    { label: "Runde 2", ids: Array.from({ length: 8 }, (_, i) => i + 33) },
    { label: "Runde 3", ids: Array.from({ length: 4 }, (_, i) => i + 41) },
    { label: "Runde 4", ids: Array.from({ length: 4 }, (_, i) => i + 49) },
    { label: "Runde 5", ids: [53, 54] },
    { label: "Runde 6", ids: [57, 58] },
    { label: "Runde 7", ids: [59] },
    { label: "Finale Verliererseite", ids: [61] },
  ]
  const count = stages.reduce((sum, stage) => sum + pick(stage.ids).length, 0)

  return (
    <section className="mt-5 rounded-[26px] border border-rose-300/10 bg-rose-400/[0.018] p-5">
      <SideHeader eyebrow="Verliererseite" title="Losers Bracket" tone="rose" count={count} />
      <div className="mt-5 grid gap-5 xl:grid-cols-4 2xl:grid-cols-8">
        {stages.map((stage) => (
          <StageColumn key={stage.label} label={stage.label} matches={pick(stage.ids)} side="loser" />
        ))}
      </div>
    </section>
  )
}

function FinalsView({ matches }: { matches: Record<number, DkoMatch> }) {
  const finalMatch = matches[62]
  const resetMatch = matches[63]
  const finalReady = Boolean(finalMatch && ((finalMatch.player1 && finalMatch.player2) || finalMatch.winner || finalMatch.machineNumber))
  const resetReady = Boolean(resetMatch && ((resetMatch.player1 && resetMatch.player2) || resetMatch.winner || resetMatch.machineNumber))
  const count = Number(finalReady) + Number(resetReady)

  return (
    <section className="mt-5 rounded-[26px] border border-amber-300/10 bg-amber-400/[0.018] p-5">
      <SideHeader eyebrow="Finalphase" title="Grand Final" tone="amber" count={count} />
      <div className="mt-5 grid max-w-[1100px] gap-5 md:grid-cols-2">
        {finalReady && (
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">
              Hinspiel · Großes Finale
            </div>
            <BroadcastMatchCard match={finalMatch} side="final" />
          </div>
        )}

        {resetReady && (
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300">
              Rückrunde · Entscheidungsspiel
            </div>
            <BroadcastMatchCard match={resetMatch} side="reset" />
          </div>
        )}

        {!finalReady && !resetReady && (
          <div className="md:col-span-2 rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm font-semibold text-slate-600">
            Finalpaarung steht noch nicht fest.
          </div>
        )}
      </div>
    </section>
  )
}

export default function DkoBeamerPage() {
  const searchParams = useSearchParams()
  const tournamentId = searchParams.get("tournamentId") || ""
  const tournamentName = searchParams.get("tournamentName") || "32er DKO"
  const tournamentType = searchParams.get("tournamentType") || "32er_dko"

  const [matches, setMatches] = useState<Record<number, DkoMatch>>({})
  const [loading, setLoading] = useState(true)
  const [rankings, setRankings] = useState<RankingRow[]>([])
  const [activeView, setActiveView] = useState<"live" | "winners" | "losers" | "finals">("live")
  const [autoRotate, setAutoRotate] = useState(true)
  const previousFinalsAvailableRef = useRef(false)
  const previousLiveMatchIdsRef = useRef<string>("")
  const [introQueue, setIntroQueue] = useState<IntroItem[]>([])
  const [activeIntro, setActiveIntro] = useState<IntroItem | null>(null)
  const [winnerFlash, setWinnerFlash] = useState<WinnerFlash | null>(null)
  const initializedRef = useRef(false)
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const winnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enqueueIntro = useCallback((match: DkoMatch) => {
    if (!match.machineNumber || !match.player1 || !match.player2 || match.winner) return

    setIntroQueue((prev) => {
      const key = `${match.id}-${match.machineNumber}`
      if (prev.some((item) => item.key === key)) return prev
      return [
        ...prev,
        {
          key,
          matchId: match.id,
          player1: match.player1,
          player2: match.player2,
          machineNumber: match.machineNumber!,
        },
      ]
    })
  }, [])

  const showWinnerFlash = useCallback((match: DkoMatch) => {
    if (!match.winner) return

    if (winnerTimerRef.current) {
      clearTimeout(winnerTimerRef.current)
    }

    setWinnerFlash({
      key: `${match.id}-${match.winner}-${Date.now()}`,
      matchId: match.id,
      winner: match.winner,
      loser: match.loser || (match.winner === match.player1 ? match.player2 : match.player1),
      score1: match.score1,
      score2: match.score2,
      machineNumber: match.machineNumber,
    })

    winnerTimerRef.current = setTimeout(() => {
      setWinnerFlash(null)
      winnerTimerRef.current = null
    }, WINNER_FLASH_MS)
  }, [])

  useEffect(() => {
    if (activeIntro || introQueue.length === 0) return

    const [next, ...rest] = introQueue
    setIntroQueue(rest)
    setActiveIntro(next)
  }, [activeIntro, introQueue])

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
        setMatches(next)
      }

      initializedRef.current = true
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

            // Eventuelle alte Einblendungen sofort entfernen.
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

          setMatches((prev) => {
            const previous = prev[nextMatch.id]
            const wasRunning = Boolean(previous?.machineNumber && !previous?.winner)
            const startsNow = Boolean(nextMatch.machineNumber && !nextMatch.winner && !wasRunning)
            const winnerJustSet = Boolean(!previous?.winner && nextMatch.winner)

            if (initializedRef.current && startsNow) {
              enqueueIntro(nextMatch)
            }

            if (initializedRef.current && winnerJustSet) {
              showWinnerFlash(nextMatch)
            }

            return {
              ...prev,
              [nextMatch.id]: nextMatch,
            }
          })
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
  const readyMatches = allMatches.filter(
    (match) => match.player1 && match.player2 && !match.winner && !match.machineNumber,
  )
  const completedMatches = allMatches.filter((match) => Boolean(match.winner))
  const totalMatches = 63
  const progress = Math.min(100, Math.round((completedMatches.length / totalMatches) * 100))
  const winner =
    matches[63]?.winner ||
    (matches[62]?.winner && matches[62]?.winner === matches[62]?.player1 ? matches[62]?.winner : undefined)

  const hasLosersView = [17,18,19,20,21,22,23,24,33,34,35,36,37,38,39,40,41,42,43,44,49,50,51,52,53,54,57,58,59,61].some((id) => {
    const match = matches[id]
    return Boolean(match && ((match.player1 && match.player2) || match.winner || match.machineNumber))
  })
  const hasFinalsView = [62, 63].some((id) => {
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
    }, 10000)

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

  const selectView = (view: "live" | "winners" | "losers" | "finals") => {
    setActiveView(view)
  }

  const openFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {}
  }

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
          <p className="mt-2 text-slate-400">Öffne den Beamer direkt aus dem laufenden 32er-DKO.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      {activeIntro && <MatchIntro item={activeIntro} tournamentName={tournamentName} />}

      <style jsx global>{`
        @keyframes dkoIntroLeft {
          from { opacity: 0; transform: translate3d(-55px, 0, 0) scale(.985); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes dkoIntroRight {
          from { opacity: 0; transform: translate3d(55px, 0, 0) scale(.985); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes dkoIntroPop {
          from { opacity: 0; transform: scale(.72); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes dkoIntroProgress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes dkoWinnerIn {
          from { opacity: 0; transform: translateY(-18px) scale(.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div className="mx-auto w-full max-w-[1920px] px-5 py-5 lg:px-8">
        <header className="grid items-center gap-4 border-b border-white/10 pb-5 lg:grid-cols-[minmax(220px,.75fr)_minmax(360px,1.3fr)_auto]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] text-slate-500">
              <Radio className="h-4 w-4 text-emerald-400" />
              DKO Live
            </div>
            <h1 className="mt-1 truncate text-[clamp(24px,2.5vw,42px)] font-black tracking-[-0.045em]">
              {tournamentName}
            </h1>
          </div>

          <div className="min-w-0">
            {!activeIntro && winnerFlash ? (
              <WinnerResultBanner item={winnerFlash} />
            ) : (
              <div className="hidden h-[62px] lg:block" />
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <div className="flex flex-wrap rounded-2xl border border-white/10 bg-white/[0.04] p-1">
              {[
                ["live", "LIVE"],
                ["winners", "GEWINNER"],
                ["losers", "VERLIERER"],
                ["finals", "FINALE"],
              ].map(([view, label]) => {
                const disabled =
                  (view === "losers" && !hasLosersView) ||
                  (view === "finals" && !hasFinalsView)

                return (
                  <button
                    key={view}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectView(view as "live" | "winners" | "losers" | "finals")}
                    className={`rounded-xl px-3 py-2 text-[11px] font-bold transition ${
                      activeView === view
                        ? "bg-white text-slate-950"
                        : disabled
                          ? "cursor-not-allowed text-slate-700"
                          : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => setAutoRotate((prev) => !prev)}
              className={`rounded-2xl border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                autoRotate
                  ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
                  : "border-white/10 bg-white/5 text-slate-500"
              }`}
              title="Automatischer Wechsel alle 10 Sekunden · neue Live-Matches und Finale werden sofort gezeigt"
            >
              AUTO 10s
            </button>

            <button
              type="button"
              onClick={openFullscreen}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
              title="Vollbild"
            >
              <Expand className="h-5 w-5" />
            </button>
          </div>
        </header>

        {winner ? (
          <section className="mt-6 min-h-[66vh] rounded-[32px] border border-amber-300/20 bg-[radial-gradient(circle_at_28%_32%,rgba(251,191,36,.14),transparent_30%),rgba(255,255,255,.025)] p-6 lg:p-8">
            <div className="grid min-h-[58vh] items-center gap-8 xl:grid-cols-[1.35fr_.65fr]">
              <div className="min-w-0">
                <div className="text-center xl:text-left">
                  <div className="inline-grid h-20 w-20 place-items-center rounded-[24px] border border-amber-300/20 bg-amber-300/10">
                    <Trophy className="h-10 w-10 text-amber-300" />
                  </div>
                  <div className="mt-5 text-[11px] font-black uppercase tracking-[0.26em] text-amber-300">Turnier beendet</div>
                  <h2 className="mt-2 text-[clamp(32px,4vw,64px)] font-black tracking-[-0.05em] text-white">Podium</h2>
                </div>

                <div className="mx-auto mt-7 grid max-w-[980px] items-end gap-4 sm:grid-cols-3 xl:mx-0">
                  {[
                    { place: 2, label: "2. Platz", tone: "border-slate-300/20 bg-slate-300/[0.06] text-slate-200", height: "sm:min-h-[190px]" },
                    { place: 1, label: "Turniersieger", tone: "border-amber-300/30 bg-amber-300/10 text-amber-200", height: "sm:min-h-[235px]" },
                    { place: 3, label: "3. Platz", tone: "border-orange-300/20 bg-orange-300/[0.06] text-orange-200", height: "sm:min-h-[165px]" },
                  ].map((slot) => {
                    const row = rankings.find((ranking) => Number(ranking.placement) === slot.place)
                    const fallbackName =
                      slot.place === 1
                        ? winner
                        : slot.place === 2
                          ? (matches[63]?.loser || matches[62]?.loser || "")
                          : (matches[61]?.loser || "")

                    return (
                      <div
                        key={slot.place}
                        className={`flex ${slot.height} min-w-0 flex-col justify-between rounded-[24px] border p-5 ${slot.tone}`}
                      >
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">{slot.label}</div>
                          <div className="mt-2 truncate text-[clamp(21px,2.3vw,34px)] font-black leading-tight tracking-[-0.035em] text-white">
                            {row?.player_name || fallbackName || "—"}
                          </div>
                        </div>
                        <div className="mt-5 text-4xl font-black opacity-30">#{slot.place}</div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-5 text-center text-sm font-bold text-slate-600 xl:text-left">
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
            <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "LIVE", value: liveMatches.length, icon: Activity, accent: "text-emerald-400" },
                { label: "Bereit", value: readyMatches.length, icon: Clock3, accent: "text-sky-400" },
                { label: "Fertig", value: completedMatches.length, icon: CheckCircle2, accent: "text-slate-300" },
                { label: "Fortschritt", value: `${progress}%`, icon: Trophy, accent: "text-amber-300" },
              ].map(({ label, value, icon: Icon, accent }) => (
                <div key={label} className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
                    <Icon className={`h-4 w-4 ${accent}`} />
                  </div>
                  <div className="mt-2 text-3xl font-black tracking-[-0.04em]">{value}</div>
                </div>
              ))}
            </section>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>

            <main className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
              <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Live Center</div>
                    <h2 className="mt-1 text-2xl font-black tracking-[-0.035em]">Laufende Matches</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-slate-400">
                    {liveMatches.length} aktiv
                  </div>
                </div>

                <div className="mt-5 grid gap-4 2xl:grid-cols-2">
                  {liveMatches.length === 0 && !winnerFlash ? (
                    <div className="col-span-full grid min-h-52 place-items-center rounded-[24px] border border-dashed border-white/10 bg-slate-950/30 text-center">
                      <div>
                        <Activity className="mx-auto h-8 w-8 text-slate-700" />
                        <div className="mt-3 text-base font-black text-slate-400">Aktuell kein Match gestartet</div>
                        <div className="mt-1 text-sm text-slate-600">Der nächste Start erscheint automatisch hier.</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {liveMatches.map((match) => (
                        <LiveMatchCard key={match.id} match={match} />
                      ))}
                    </>
                  )}
                </div>
              </section>

              <aside className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-sky-400">Queue</div>
                    <h2 className="mt-1 text-2xl font-black tracking-[-0.035em]">Als Nächstes</h2>
                  </div>
                  <Users className="h-5 w-5 text-slate-600" />
                </div>

                <div className="mt-5 space-y-3">
                  {readyMatches.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-white/10 p-6 text-center text-sm font-bold text-slate-600">
                      Kein startbereites Match
                    </div>
                  ) : (
                    readyMatches.slice(0, 6).map((match, index) => (
                      <div key={match.id} className="rounded-[20px] border border-white/10 bg-slate-950/35 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-600">Match {match.id}</span>
                          {index === 0 && (
                            <span className="rounded-full bg-sky-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-sky-300">
                              Nächstes
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-base font-black leading-tight">{match.player1}</div>
                        <div className="my-1 text-xs font-black text-slate-700">VS</div>
                        <div className="text-base font-black leading-tight">{match.player2}</div>
                      </div>
                    ))
                  )}
                </div>
              </aside>
            </main>
          </>
        )}
      </div>
    </div>
  )
}
