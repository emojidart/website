"use client"

import { useEffect, useMemo, useState } from "react"
import { MonitorPlay, Pause, Play, ArrowLeftRight } from "lucide-react"

type Run = { id: string; division: "herren" | "damen"; name: string; url: string }
const CYCLE_MS = 15000

/** Zeigt nur tatsächlich gleichzeitig laufende Multi-DKO. Beide Beamer bleiben gemountet. */
export default function MultiDkoBeamerSwitcher({ runs, tvMode = false }: { runs: Run[]; tvMode?: boolean }) {
  const sorted = useMemo(() => ["herren", "damen"].map(d => runs.find(r => r.division === d)).filter((r): r is Run => Boolean(r)), [runs])
  const pairKey = sorted.map(r => r.id).join(":")
  const [selectedId, setSelectedId] = useState("")
  const [paused, setPaused] = useState(false)
  const [loaded, setLoaded] = useState<Record<string, boolean>>({})
  const [showControls, setShowControls] = useState(false)
  const current = sorted.find(r => r.id === selectedId) || sorted[0]

  useEffect(() => {
    if (!sorted.some(run => run.id === selectedId)) setSelectedId(sorted[0]?.id || "")
  }, [pairKey, selectedId])

  useEffect(() => {
    if (paused || sorted.length < 2) return
    const interval = window.setInterval(() => {
      setSelectedId(previous => {
        const index = sorted.findIndex(run => run.id === previous)
        const next = sorted[(index + 1) % sorted.length]
        // Nicht auf eine Beameransicht umschalten, die noch nicht geladen ist.
        return loaded[next.id] ? next.id : previous
      })
    }, CYCLE_MS)
    return () => window.clearInterval(interval)
  }, [pairKey, paused, loaded])

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#050608] text-white" onMouseEnter={() => { if (!tvMode) setShowControls(true) }} onMouseLeave={() => setShowControls(false)}>
      {sorted.map((run, index) => {
        const active = current?.id === run.id
        return (
          <iframe
            key={run.id}
            title={`EMD Beamer ${run.division}`}
            src={run.url}
            onLoad={() => setLoaded(old => ({ ...old, [run.id]: true }))}
            allow="autoplay; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0 bg-[#050608]"
            style={{
              opacity: active ? 1 : 0,
              zIndex: active ? 2 : 1,
              pointerEvents: active ? "auto" : "none",
              transition: "opacity 450ms ease",
            }}
          />
        )
      })}
      <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full border border-white/15 bg-[#070a10]/85 px-5 py-2.5 text-center shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-center gap-3 whitespace-nowrap">
          <span className="h-2 w-2 rounded-full bg-orange-400" />
          <span className="text-[clamp(10px,.9vw,15px)] font-black uppercase tracking-[.14em]">{current?.division === "herren" ? "Herren-DKO" : "Damen-DKO"}</span>
          <span className="text-xs font-medium text-slate-400">·</span>
          <span className="max-w-[30vw] truncate text-[clamp(10px,.8vw,13px)] font-semibold text-slate-300">{current?.name}</span>
        </div>
      </div>
      {!tvMode && <div className={`absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/15 bg-[#090d15]/95 p-2 shadow-2xl backdrop-blur-xl transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}>
        <div className="flex items-center gap-2 px-2 text-xs font-bold text-slate-400"><MonitorPlay size={16}/> BEAMER</div>
        {sorted.map(run => (
          <button key={run.id} type="button" onClick={() => { setSelectedId(run.id); setPaused(true) }} disabled={!loaded[run.id]} className={`rounded-xl px-5 py-2 text-sm font-bold transition ${current?.id === run.id ? "bg-orange-600 text-white" : "bg-white/10 text-slate-200 hover:bg-white/20"} disabled:cursor-not-allowed disabled:opacity-40`}>
            {run.division === "herren" ? "Herren" : "Damen"}
          </button>
        ))}
        <button type="button" onClick={() => setPaused(v => !v)} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/20" title={paused ? "Automatischen Wechsel fortsetzen" : "Automatischen Wechsel pausieren"}>
          {paused ? <Play size={15}/> : <Pause size={15}/>} {paused ? "Auto an" : "Pause"}
        </button>
      </div>}
      {!tvMode && <div className="pointer-events-none absolute bottom-4 right-5 z-10 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-bold text-slate-300/80">
        <ArrowLeftRight size={13}/>{paused ? "MANUELL" : "WECHSEL ALLE 15 S"}
      </div>}
    </main>
  )
}
