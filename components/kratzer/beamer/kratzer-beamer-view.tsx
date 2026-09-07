"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Dices, Heart, Maximize2, Radio, Trophy, Users } from "lucide-react"
import {
  KRATZER_BEAMER_CHANNEL,
  KRATZER_BEAMER_EVENT_KEY,
  KRATZER_BEAMER_SNAPSHOT_KEY,
  readKratzerBeamerEvent,
  readKratzerBeamerSnapshot,
  type KratzerBeamerEvent,
  type KratzerBeamerSnapshot,
} from "@/components/kratzer/beamer/beamer-sync"



type AudienceMoment =
  | { type: "scratch"; playerName: string; beforeLives: number; afterLives: number; id: string }
  | { type: "eliminated"; playerName: string; id: string }
  | { type: "final-three"; playerNames: string[]; id: string }
  | { type: "head-to-head"; playerNames: string[]; id: string }

const audienceMomentDuration: Record<AudienceMoment["type"], number> = {
  scratch: 2200,
  eliminated: 3000,
  "final-three": 3600,
  "head-to-head": 4200,
}

const pipMap: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}

const faceTransform: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(-90deg) rotateY(0deg)",
  3: "rotateX(0deg) rotateY(-90deg)",
  4: "rotateX(0deg) rotateY(90deg)",
  5: "rotateX(90deg) rotateY(0deg)",
  6: "rotateX(0deg) rotateY(180deg)",
}

function DiceFace({ value, className }: { value: number; className: string }) {
  const active = new Set(pipMap[value] || [])
  return (
    <div className={`dice-face ${className}`}>
      <div className="dice-grid">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} className={active.has(index + 1) ? "dice-pip" : "dice-pip dice-pip-hidden"} />
        ))}
      </div>
    </div>
  )
}

function RealDice({ rolling, face }: { rolling: boolean; face: number }) {
  return (
    <div className="dice-stage" aria-label={`Würfel ${face}`}>
      <div
        className={`dice-cube ${rolling ? "dice-cube-rolling" : ""}`}
        style={!rolling ? { transform: faceTransform[face] || faceTransform[1] } : undefined}
      >
        <DiceFace value={1} className="dice-front" />
        <DiceFace value={6} className="dice-back" />
        <DiceFace value={3} className="dice-right" />
        <DiceFace value={4} className="dice-left" />
        <DiceFace value={2} className="dice-top" />
        <DiceFace value={5} className="dice-bottom" />
      </div>
    </div>
  )
}

function formatElapsed(startTime: number | null, now: number) {
  if (!startTime) return "Bereit"
  const total = Math.max(0, Math.floor((now - startTime) / 1000))
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

export function KratzerBeamerView() {
  const [snapshot, setSnapshot] = useState<KratzerBeamerSnapshot | null>(null)
  const [diceEvent, setDiceEvent] = useState<KratzerBeamerEvent | null>(null)
  const [audienceMoments, setAudienceMoments] = useState<AudienceMoment[]>([])
  const previousSnapshotRef = useRef<KratzerBeamerSnapshot | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [isFullscreen, setIsFullscreen] = useState(false)

  const activeAudienceMoment = audienceMoments[0] ?? null

  useEffect(() => {
    const acceptSnapshot = (nextSnapshot: KratzerBeamerSnapshot | null) => {
      if (!nextSnapshot) return

      const previousSnapshot = previousSnapshotRef.current
      const shouldCompare =
        previousSnapshot &&
        previousSnapshot.tournamentId === nextSnapshot.tournamentId &&
        nextSnapshot.updatedAt > previousSnapshot.updatedAt

      if (shouldCompare && previousSnapshot) {
        const moments: AudienceMoment[] = []
        const previousPlayers = new Map(previousSnapshot.players.map((player) => [String(player.id), player]))

        for (const player of nextSnapshot.players) {
          const previousPlayer = previousPlayers.get(String(player.id))
          if (!previousPlayer) continue

          if (!previousPlayer.isEliminated && player.isEliminated) {
            moments.push({
              type: "eliminated",
              playerName: player.name,
              id: `out-${player.id}-${nextSnapshot.updatedAt}`,
            })
          } else if (!player.isEliminated && player.lives < previousPlayer.lives) {
            moments.push({
              type: "scratch",
              playerName: player.name,
              beforeLives: previousPlayer.lives,
              afterLives: player.lives,
              id: `scratch-${player.id}-${nextSnapshot.updatedAt}`,
            })
          }
        }

        const previousActiveCount = previousSnapshot.players.filter((player) => !player.isEliminated).length
        const nextActivePlayers = nextSnapshot.players
          .filter((player) => !player.isEliminated)
          .sort((a, b) => b.lives - a.lives || a.name.localeCompare(b.name))
        const nextActiveCount = nextActivePlayers.length

        if (previousActiveCount > 3 && nextActiveCount === 3) {
          moments.push({
            type: "final-three",
            playerNames: nextActivePlayers.map((player) => player.name),
            id: `final3-${nextSnapshot.updatedAt}`,
          })
        }

        if (previousActiveCount > 2 && nextActiveCount === 2) {
          moments.push({
            type: "head-to-head",
            playerNames: nextActivePlayers.map((player) => player.name),
            id: `h2h-${nextSnapshot.updatedAt}`,
          })
        }

        if (moments.length > 0) {
          setAudienceMoments((current) => [...current, ...moments])
        }
      }

      previousSnapshotRef.current = nextSnapshot
      setSnapshot(nextSnapshot)
    }

    acceptSnapshot(readKratzerBeamerSnapshot())
    const lastEvent = readKratzerBeamerEvent()
    if (lastEvent && Date.now() - lastEvent.at < 8000) setDiceEvent(lastEvent)

    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(KRATZER_BEAMER_CHANNEL)
      channel.onmessage = (message) => {
        if (message.data?.kind === "snapshot") acceptSnapshot(message.data.payload)
        if (message.data?.kind === "event") setDiceEvent(message.data.payload)
      }
    } catch {
      channel = null
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === KRATZER_BEAMER_SNAPSHOT_KEY && event.newValue) {
        try { acceptSnapshot(JSON.parse(event.newValue)) } catch {}
      }
      if (event.key === KRATZER_BEAMER_EVENT_KEY && event.newValue) {
        try { setDiceEvent(JSON.parse(event.newValue)) } catch {}
      }
    }

    window.addEventListener("storage", onStorage)
    return () => {
      channel?.close()
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  useEffect(() => {
    if (!activeAudienceMoment) return
    const timeout = window.setTimeout(() => {
      setAudienceMoments((current) => current.slice(1))
    }, audienceMomentDuration[activeAudienceMoment.type])
    return () => window.clearTimeout(timeout)
  }, [activeAudienceMoment])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!diceEvent) return
    if (diceEvent.type === "dice-result") {
      const id = window.setTimeout(() => setDiceEvent(null), 3200)
      return () => window.clearTimeout(id)
    }
    if (diceEvent.type === "pause-end") {
      const id = window.setTimeout(() => setDiceEvent(null), 300)
      return () => window.clearTimeout(id)
    }
  }, [diceEvent])

  const activePlayers = useMemo(() => snapshot?.players.filter((p) => !p.isEliminated) ?? [], [snapshot])
  const eliminatedPlayers = useMemo(() => snapshot?.players.filter((p) => p.isEliminated) ?? [], [snapshot])
  const ranking = useMemo(
    () => [...(snapshot?.players ?? [])].sort((a, b) => {
      if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1
      return b.lives - a.lives || a.name.localeCompare(b.name)
    }),
    [snapshot],
  )
  const currentMode = snapshot?.boards.find((board) => board.gameMode)?.gameMode ?? null
  const runningBoards = useMemo(() => snapshot?.boards.filter((board) => Boolean(board.startTime)) ?? [], [snapshot])
  const readyBoards = useMemo(() => snapshot?.boards.filter((board) => !board.startTime) ?? [], [snapshot])

  const pauseActive = diceEvent?.type === "pause-start" && diceEvent.until > now
  const pauseSeconds = pauseActive && diceEvent.type === "pause-start" ? Math.max(0, Math.ceil((diceEvent.until - now) / 1000)) : 0

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      // Browser kann Fullscreen blockieren; die Ansicht bleibt trotzdem nutzbar.
    }
  }

  if (!snapshot) {
    return (
      <main className="flex h-screen w-screen items-center justify-center overflow-hidden bg-slate-950 p-8 text-white">
        <button onClick={enterFullscreen} className="absolute right-6 top-6 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black hover:bg-white/15">
          <Maximize2 className="mr-2 inline h-4 w-4" /> Vollbild starten
        </button>
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-orange-500/15 text-orange-400"><Radio className="h-9 w-9" /></div>
          <h1 className="mt-6 text-4xl font-black">Kratzer Live</h1>
          <p className="mt-2 text-lg font-semibold text-slate-400">Warte auf die Turnier-Steuerung …</p>
        </div>
      </main>
    )
  }

  const showDice = diceEvent?.type === "dice-start" || diceEvent?.type === "dice-result"
  const diceFace = diceEvent?.type === "dice-result" ? diceEvent.face : 1
  const diceMode = diceEvent?.type === "dice-result" ? diceEvent.mode : null
  const diceRound = showDice && "round" in diceEvent ? diceEvent.round : snapshot.currentRound + 1

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-white">
      <style>{`
        .dice-stage{width:240px;height:240px;perspective:900px;display:flex;align-items:center;justify-content:center}
        .dice-cube{position:relative;width:154px;height:154px;transform-style:preserve-3d;transition:transform .85s cubic-bezier(.2,.8,.2,1)}
        .dice-cube-rolling{animation:emdDiceRoll .75s linear infinite}
        .dice-face{position:absolute;inset:0;border-radius:30px;background:linear-gradient(145deg,#fff,#e8edf4);box-shadow:inset -10px -12px 24px rgba(15,23,42,.14),inset 7px 7px 15px rgba(255,255,255,.85),0 20px 50px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.7);padding:24px}
        .dice-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:100%;height:100%;align-items:center;justify-items:center}
        .dice-pip{width:20px;height:20px;border-radius:999px;background:#0f172a;box-shadow:inset 2px 3px 5px rgba(0,0,0,.45)}
        .dice-pip-hidden{opacity:0}
        .dice-front{transform:translateZ(77px)} .dice-back{transform:rotateY(180deg) translateZ(77px)}
        .dice-right{transform:rotateY(90deg) translateZ(77px)} .dice-left{transform:rotateY(-90deg) translateZ(77px)}
        .dice-top{transform:rotateX(90deg) translateZ(77px)} .dice-bottom{transform:rotateX(-90deg) translateZ(77px)}
        @keyframes emdDiceRoll{0%{transform:rotateX(0) rotateY(0) rotateZ(0)}25%{transform:rotateX(95deg) rotateY(140deg) rotateZ(35deg)}50%{transform:rotateX(210deg) rotateY(275deg) rotateZ(90deg)}75%{transform:rotateX(315deg) rotateY(410deg) rotateZ(145deg)}100%{transform:rotateX(360deg) rotateY(540deg) rotateZ(180deg)}}
        @keyframes emdMomentPop{0%{opacity:0;transform:scale(.76) translateY(28px)}18%{opacity:1;transform:scale(1.04) translateY(0)}28%{transform:scale(1)}82%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.98) translateY(-10px)}}
        @keyframes emdHeartDrop{0%{opacity:0;transform:translateY(-18px) scale(1.35)}25%{opacity:1;transform:translateY(0) scale(1)}70%{opacity:1;transform:translateY(6px) scale(.92)}100%{opacity:0;transform:translateY(28px) scale(.65)}}
        @keyframes emdFinalGlow{0%,100%{box-shadow:0 0 0 rgba(249,115,22,0)}50%{box-shadow:0 0 80px rgba(249,115,22,.24)}}
        @keyframes emdBoardStart{0%{transform:scale(.97);box-shadow:0 0 0 rgba(16,185,129,0)}45%{transform:scale(1.01);box-shadow:0 0 46px rgba(16,185,129,.28)}100%{transform:scale(1);box-shadow:0 0 24px rgba(16,185,129,.12)}}
        .audience-moment-pop{animation:emdMomentPop 2.2s cubic-bezier(.2,.8,.2,1) both}
        .audience-heart-drop{animation:emdHeartDrop 1.4s cubic-bezier(.2,.8,.2,1) both}
        .audience-final-glow{animation:emdFinalGlow 1.6s ease-in-out infinite}
        .board-live-start{animation:emdBoardStart .7s cubic-bezier(.2,.8,.2,1) both}
        @media (prefers-reduced-motion:reduce){.dice-cube-rolling,.audience-moment-pop,.audience-heart-drop,.audience-final-glow,.board-live-start{animation:none}.dice-cube{transition:none}}
      `}</style>

      <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-white/10 bg-slate-950 px-7 2xl:px-10">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400"><Dices className="h-6 w-6" /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-2xl font-black tracking-tight 2xl:text-3xl">EMD Kratzer</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[.14em] text-emerald-300"><Radio className="h-3.5 w-3.5" /> Live</span>
            </div>
            <div className="mt-1 text-sm font-bold text-slate-400">Runde {snapshot.currentRound || "–"}{currentMode ? ` · ${currentMode}` : ""}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[.06] px-5 py-2.5 text-right">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Spieler im Turnier</div>
            <div className="mt-0.5 text-xl font-black">{activePlayers.length} <span className="text-sm text-slate-500">/ {snapshot.players.length}</span></div>
          </div>
          {!isFullscreen ? (
            <button onClick={enterFullscreen} className="h-12 rounded-2xl border border-white/10 bg-white/[.06] px-4 font-black text-slate-200 transition hover:bg-white/10">
              <Maximize2 className="mr-2 inline h-4 w-4" /> Vollbild
            </button>
          ) : null}
        </div>
      </header>

      <section className="grid min-h-0 flex-1 grid-cols-1 gap-5 p-5 2xl:gap-6 2xl:p-7 xl:grid-cols-[minmax(0,1fr)_330px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <div className="grid shrink-0 grid-cols-3 gap-3">
            <div className="rounded-[22px] border border-white/10 bg-white/[.055] px-5 py-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-slate-500"><Users className="h-4 w-4 text-orange-400" /> Aktiv</div>
              <div className="mt-2 text-3xl font-black">{activePlayers.length}</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[.055] px-5 py-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-slate-500"><Heart className="h-4 w-4 text-orange-400" /> Leben gesamt</div>
              <div className="mt-2 text-3xl font-black">{activePlayers.reduce((sum, player) => sum + player.lives, 0)}</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[.055] px-5 py-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-slate-500"><Trophy className="h-4 w-4 text-orange-400" /> Ausgeschieden</div>
              <div className="mt-2 text-3xl font-black">{eliminatedPlayers.length}</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 rounded-[28px] border border-white/10 bg-white/[.035] p-4 2xl:p-5">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[.18em] text-orange-400">Aktuelle Runde</div>
                <div className="mt-1 text-xl font-black">Boards & Spieler</div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {runningBoards.length > 0 ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-2 text-xs font-black uppercase tracking-[.12em] text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.9)]" />
                    {runningBoards.length} {runningBoards.length === 1 ? "Board läuft" : "Boards laufen"}
                  </div>
                ) : null}
                {readyBoards.length > 0 ? (
                  <div className="rounded-full border border-white/10 bg-white/[.06] px-3.5 py-2 text-xs font-black uppercase tracking-[.12em] text-slate-400">
                    {readyBoards.length} bereit
                  </div>
                ) : null}
                {currentMode ? <div className="rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-white">{currentMode}</div> : null}
              </div>
            </div>

            {snapshot.boards.length === 0 ? (
              <div className="flex h-[calc(100%-52px)] items-center justify-center rounded-[22px] border border-dashed border-white/10 bg-white/[.025] text-center">
                <div><div className="text-2xl font-black">Nächste Runde wird vorbereitet</div><div className="mt-2 text-slate-500">Die neuen Boards erscheinen automatisch.</div></div>
              </div>
            ) : (
              <div className={`grid h-[calc(100%-52px)] gap-3 ${snapshot.boards.length <= 4 ? "grid-cols-2" : snapshot.boards.length <= 6 ? "grid-cols-3" : "grid-cols-4"}`}>
                {snapshot.boards.map((board) => {
                  const isRunning = Boolean(board.startTime)
                  return (
                  <article
                    key={board.id}
                    className={`min-h-0 overflow-hidden rounded-[22px] border transition-all duration-300 ${
                      isRunning
                        ? "board-live-start border-emerald-400/60 bg-gradient-to-b from-emerald-500/[.09] to-slate-900/90 shadow-[0_0_28px_rgba(16,185,129,.14)]"
                        : "border-white/10 bg-slate-900/80"
                    }`}
                  >
                    <div className={`flex items-center justify-between border-b px-4 py-3 ${isRunning ? "border-emerald-400/20 bg-emerald-400/[.06]" : "border-white/10"}`}>
                      <div className="flex items-center gap-2.5">
                        <div className="text-lg font-black">Board {board.id}</div>
                        {isRunning ? (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] text-slate-950">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-950" /> LIVE
                          </div>
                        ) : (
                          <div className="rounded-full bg-white/[.07] px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Bereit</div>
                        )}
                      </div>
                      <div className="text-xs font-black text-orange-300">{board.gameMode || currentMode || "Kratzer"}</div>
                    </div>
                    <div className="flex h-[calc(100%-49px)] flex-col p-3">
                      <div className="space-y-2 overflow-hidden">
                        {board.players.map((player) => (
                          <div key={player.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[.055] px-3 py-2.5">
                            <div className="min-w-0 truncate text-sm font-black 2xl:text-base">{player.name}</div>
                            <div className="flex shrink-0 items-center gap-2">
                              {player.lives === 1 ? <span className="rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-[.12em] text-red-300">Letztes Leben</span> : null}
                              <div className={`rounded-lg px-2.5 py-1 text-sm font-black ${player.lives === 1 ? "bg-red-500/15 text-red-300" : "bg-orange-500/15 text-orange-300"}`}>{player.lives} ❤</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className={`mt-auto pt-2 text-right font-black uppercase tracking-[.13em] ${isRunning ? "text-base text-emerald-300" : "text-xs text-slate-500"}`}>
                        {isRunning ? `LIVE · ${formatElapsed(board.startTime, now)}` : "Bereit"}
                      </div>
                    </div>
                  </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="hidden min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[.045] xl:flex">
          <div className="border-b border-white/10 px-5 py-4">
            <div className="text-xs font-black uppercase tracking-[.18em] text-orange-400">Live Rangliste</div>
            <div className="mt-1 text-xl font-black">Spieler</div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-3">
            <div className="space-y-2">
              {ranking.slice(0, 12).map((player, index) => (
                <div key={player.id} className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${player.isEliminated ? "border-white/5 bg-white/[.025] opacity-45" : "border-white/10 bg-white/[.055]"}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${index < 3 && !player.isEliminated ? "bg-orange-500 text-white" : "bg-white/10 text-slate-300"}`}>{index + 1}</div>
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{player.name}</div><div className="text-[11px] font-bold text-slate-500">{player.ligastatus || "–"}</div></div>
                  <div className="text-sm font-black text-orange-300">{player.lives} ❤</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {activeAudienceMoment?.type === "scratch" ? (
        <div className="pointer-events-none absolute inset-0 z-[34] flex items-center justify-center bg-slate-950/35 backdrop-blur-[2px]">
          <div className="audience-moment-pop min-w-[420px] rounded-[34px] border border-orange-400/30 bg-slate-950/95 px-10 py-8 text-center shadow-[0_30px_100px_rgba(0,0,0,.55)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-orange-500/15 text-orange-400">
              <Heart className="audience-heart-drop h-8 w-8 fill-orange-400/20" />
            </div>
            <div className="mt-5 text-xs font-black uppercase tracking-[.32em] text-orange-400">Kratzer!</div>
            <div className="mt-2 text-4xl font-black">{activeAudienceMoment.playerName}</div>
            <div className="mt-4 flex items-center justify-center gap-4 text-2xl font-black">
              <span className="text-slate-500">{activeAudienceMoment.beforeLives} ❤</span>
              <span className="text-orange-400">→</span>
              <span className="text-white">{activeAudienceMoment.afterLives} ❤</span>
            </div>
          </div>
        </div>
      ) : null}

      {activeAudienceMoment?.type === "eliminated" ? (
        <div className="pointer-events-none absolute inset-0 z-[35] flex items-center justify-center bg-slate-950/72 backdrop-blur-md">
          <div className="audience-moment-pop min-w-[520px] rounded-[36px] border border-red-500/30 bg-gradient-to-br from-slate-950 to-red-950/55 px-12 py-10 text-center shadow-[0_35px_120px_rgba(0,0,0,.7)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-red-400/30 bg-red-500/15 text-5xl font-black text-red-400">×</div>
            <div className="mt-6 text-xs font-black uppercase tracking-[.34em] text-red-400">Ausgeschieden</div>
            <div className="mt-3 text-5xl font-black">{activeAudienceMoment.playerName}</div>
            <div className="mt-4 text-lg font-bold text-slate-400">Keine Leben mehr</div>
          </div>
        </div>
      ) : null}

      {activeAudienceMoment?.type === "final-three" ? (
        <div className="pointer-events-none absolute inset-0 z-[36] flex items-center justify-center bg-slate-950/88 backdrop-blur-xl">
          <div className="audience-final-glow audience-moment-pop rounded-[40px] border border-orange-400/25 bg-white/[.045] px-14 py-11 text-center">
            <div className="text-xs font-black uppercase tracking-[.35em] text-orange-400">Final Phase</div>
            <div className="mt-3 text-6xl font-black">LETZTE 3</div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {activeAudienceMoment.playerNames.map((name, index) => (
                <div key={name} className="rounded-2xl border border-white/10 bg-white/[.07] px-5 py-3 text-xl font-black"><span className="mr-2 text-orange-400">{index + 1}</span>{name}</div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeAudienceMoment?.type === "head-to-head" ? (
        <div className="pointer-events-none absolute inset-0 z-[37] flex items-center justify-center bg-slate-950/94 backdrop-blur-xl">
          <div className="audience-final-glow audience-moment-pop w-[min(1100px,90vw)] rounded-[44px] border border-orange-400/25 bg-gradient-to-br from-white/[.06] to-orange-500/[.05] px-12 py-12 text-center">
            <div className="text-xs font-black uppercase tracking-[.38em] text-orange-400">Head to Head</div>
            <div className="mt-3 text-5xl font-black">DIE LETZTEN ZWEI</div>
            <div className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center gap-8">
              <div className="truncate rounded-[28px] border border-white/10 bg-white/[.07] px-7 py-7 text-3xl font-black">{activeAudienceMoment.playerNames[0]}</div>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-500 text-2xl font-black text-white shadow-[0_0_55px_rgba(249,115,22,.35)]">VS</div>
              <div className="truncate rounded-[28px] border border-white/10 bg-white/[.07] px-7 py-7 text-3xl font-black">{activeAudienceMoment.playerNames[1]}</div>
            </div>
          </div>
        </div>
      ) : null}

      {showDice ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl">
          <div className="flex flex-col items-center text-center">
            <div className="text-xs font-black uppercase tracking-[.28em] text-orange-400">Runde {diceRound}</div>
            <h2 className="mt-2 text-4xl font-black 2xl:text-5xl">{diceEvent?.type === "dice-result" ? "Der Modus steht" : "Welcher Modus kommt?"}</h2>
            <div className="mt-10"><RealDice rolling={diceEvent?.type === "dice-start"} face={diceFace} /></div>
            <div className="mt-10 min-h-[76px]">
              {diceMode ? <div className="text-5xl font-black text-orange-400 2xl:text-6xl">{diceMode}</div> : <div className="text-xl font-bold text-slate-400">Der Würfel läuft …</div>}
            </div>
          </div>
        </div>
      ) : null}

      {pauseActive && diceEvent?.type === "pause-start" ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/93 backdrop-blur-xl">
          <div className="text-center"><div className="text-xs font-black uppercase tracking-[.3em] text-orange-400">Turnierpause</div><div className="mt-3 text-7xl font-black">PAUSE</div><div className="mt-5 text-3xl font-black text-slate-300">{String(Math.floor(pauseSeconds / 60)).padStart(2, "0")}:{String(pauseSeconds % 60).padStart(2, "0")}</div></div>
        </div>
      ) : null}

      {snapshot.tournamentFinished && snapshot.winner ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/96 backdrop-blur-xl">
          <div className="text-center"><Trophy className="mx-auto h-24 w-24 text-orange-400" /><div className="mt-7 text-xs font-black uppercase tracking-[.3em] text-orange-400">Turniersieger</div><div className="mt-3 text-6xl font-black 2xl:text-7xl">{snapshot.winner.name}</div><div className="mt-5 text-xl font-bold text-slate-400">Glückwunsch zum Sieg!</div></div>
        </div>
      ) : null}
    </main>
  )
}
