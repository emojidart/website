"use client"

import { useCallback, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Board } from "@/types/tournament"

type Phase = "idle" | "preparing" | "playing" | "done" | "error"
type Display = { phase: Phase; title: string; detail: string }
const MARTIN_URL = "http://127.0.0.1:8765/speak"

// A single active announcement prevents accidental repeated clicks.
export function useKratzerMartin() {
  const [display, setDisplay] = useState<Display>({ phase: "idle", title: "", detail: "" })
  const busyRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const namesRef = useRef(new Map<string, string>())

  const cleanAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
  }
  const scheduleHide = () => {
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current)
    finishTimerRef.current = setTimeout(() => setDisplay({phase:"idle",title:"",detail:""}), 2800)
  }

  // Bereitet neue Gruppen im Hintergrund vor. Die DKO/aktive Ansage hat serverseitig Vorrang.
  const prefetchedRef = useRef(new Set<string>())
  const prefetchGroup = useCallback(async (board: Board) => {
    if (!board.players?.length || busyRef.current) return
    const key = `${board.id}:${board.players.map(p => p.id).join(",")}`
    if (prefetchedRef.current.has(key)) return
    prefetchedRef.current.add(key)
    try {
      const ids = board.players.map(p => String(p.id))
      const missing = ids.filter(id => !namesRef.current.has(id))
      if (missing.length) {
        const { data, error } = await supabase.from("spieldatenbank")
          .select("id, tts_pronunciation").in("id", missing)
        if (error) throw error
        for (const p of (data || [])) {
          namesRef.current.set(String(p.id), String(p.tts_pronunciation || "").trim())
        }
        for (const id of missing) if (!namesRef.current.has(id)) namesRef.current.set(id, "")
      }
      const names = board.players.map(p => namesRef.current.get(String(p.id)) || p.name)
      const response = await fetch(MARTIN_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "kratzer", players: names, machine: board.id, call: 1, speed: 1, prefetch: true }),
      })
      if (!response.ok) throw new Error(`Prefetch HTTP ${response.status}`)
    } catch {
      // Ein fehlgeschlagener Vorlauf darf den normalen Aufruf nie blockieren.
      prefetchedRef.current.delete(key)
    }
  }, [])

  const announceGroup = useCallback(async (board: Board, call: number) => {
    if (busyRef.current || !board.players?.length || call < 1 || call > 3) return false
    busyRef.current = true
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current)
    cleanAudio()
    const detail = `Automat ${board.id} · ${board.players.length} Spieler · Aufruf ${call}/3`
    setDisplay({ phase: "preparing", title: "Ansage wird vorbereitet …", detail })
    try {
      const ids = board.players.map(p => String(p.id))
      const missing = ids.filter(id => !namesRef.current.has(id))
      if (missing.length) {
        const { data, error } = await supabase
          .from("spieldatenbank")
          .select("id, tts_pronunciation")
          .in("id", missing)
        if (error) throw error
        for (const p of (data || [])) {
          namesRef.current.set(String(p.id), String(p.tts_pronunciation || "").trim())
        }
        for (const id of missing) if (!namesRef.current.has(id)) namesRef.current.set(id, "")
      }

      const spokenNames = board.players.map(p =>
        namesRef.current.get(String(p.id)) || p.name
      )
      const response = await fetch(MARTIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "kratzer",
          players: spokenNames,
          machine: board.id,
          call,
          speed: 1,
        }),
      })
      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Martin HTTP ${response.status}: ${body.slice(0, 160)}`)
      }
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      urlRef.current = objectUrl
      const audio = new Audio(objectUrl)
      audioRef.current = audio
      setDisplay({ phase: "playing", title: "Martin spricht …", detail })
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve()
        audio.onerror = () => reject(new Error("Audio konnte nicht wiedergegeben werden."))
        audio.play().catch(reject)
      })
      setDisplay({ phase: "done", title: "Ansage beendet", detail })
      return true
    } catch (error) {
      console.error("Kratzer: Martin-Gruppenaufruf fehlgeschlagen", error)
      setDisplay({ phase: "error", title: "Martin nicht erreichbar", detail: "Server prüfen und Aufruf erneut versuchen." })
      return false
    } finally {
      cleanAudio()
      busyRef.current = false
      scheduleHide()
    }
  }, [])

  return { announceGroup, prefetchGroup, announcementBusy: display.phase === "preparing" || display.phase === "playing", announcementDisplay: display }
}

export function KratzerMartinStatus({ display }: { display: Display }) {
  if (display.phase === "idle") return null
  return (
    <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-[80] w-[min(390px,calc(100vw-32px))] sm:bottom-6 sm:right-6 rounded-[20px] border border-orange-400/25 bg-[#0b0f16] p-4 text-white shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400 text-xl">🎤</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black">{display.title}</div>
          <div className="mt-1 text-xs text-white/55">{display.detail}</div>
        </div>
      </div>
      {(display.phase === "preparing" || display.phase === "playing") && (
        <div className="mt-3 flex h-6 items-center justify-center gap-1">
          {[1,2,3,4,5,6,7,8,9,10,11].map((i) => (
            <span key={i} className="h-3 w-1 rounded-full bg-orange-400 animate-pulse" style={{animationDelay:`${i*80}ms`,height:`${8+(i*7)%17}px`}} />
          ))}
        </div>
      )}

    </div>
  )
}
