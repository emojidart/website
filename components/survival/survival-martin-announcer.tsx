"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"

type Phase = "preparing" | "playing" | "done" | "error" | null
const SERVER = "http://127.0.0.1:8765/speak"
const cache = new Map<string, Blob>()
const pending = new Map<string, Promise<void>>()
const pronunciation = new Map<string, string>()
let pronunciationLoading: Promise<void> | null = null

function loadNames() {
  if (!pronunciationLoading) {
    pronunciationLoading = (async () => {
      const { data, error } = await supabase.from("spieldatenbank").select("name,tts_pronunciation")
      if (error) throw error
      for (const row of data || []) {
        if (row.name && row.tts_pronunciation) pronunciation.set(String(row.name).trim().toLocaleLowerCase("de"), String(row.tts_pronunciation).trim())
      }
    })().catch((e) => { pronunciationLoading = null; console.warn("Survival Martin: Aussprache-Laden", e) })
  }
  return pronunciationLoading
}

function getSpoken(name: string) { return pronunciation.get(name.trim().toLocaleLowerCase("de")) || name }
function getKey(players: string[], machine: number, call: number) { return JSON.stringify([players, machine, call]) }

async function requestAudio(players: string[], machine: number, call: number, prefetch: boolean) {
  await loadNames()
  const response = await fetch(SERVER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "survival", players: players.map(getSpoken), machine, call, speed: 1, prefetch }),
  })
  if (!response.ok) throw new Error(`Martin HTTP ${response.status}: ${await response.text()}`)
  if (prefetch) return null
  return response.blob()
}

export function prefetchSurvivalMartin(players: string[], machine: number, call = 1) {
  if (players.length !== 4 || !players.every(Boolean) || !machine) return
  const key = getKey(players, machine, call)
  if (cache.has(key) || pending.has(key)) return
  // Cache synthesis on the local server; do not download or play during prefetch.
  const task = requestAudio(players, machine, call, true).then(() => {}).catch(() => {}).finally(() => { pending.delete(key) })
  pending.set(key, task)
}

export function useSurvivalMartin() {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>(null)
  const [playersLabel, setPlayersLabel] = useState("")
  const [details, setDetails] = useState("")
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const seq = useRef(0)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const busyRef = useRef(false)

  useEffect(() => { setEnabled(localStorage.getItem("emd_survival_martin_enabled") === "true") }, [])
  useEffect(() => () => {
    seq.current += 1
    audioRef.current?.pause()
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])
  const toggle = useCallback((value: boolean) => {
    setEnabled(value)
    localStorage.setItem("emd_survival_martin_enabled", String(value))
  }, [])

  const announce = useCallback(async (players: string[], machine: number, call = 1) => {
    if (!enabled || busyRef.current || !machine || players.length !== 4 || !players.every(Boolean)) return
    busyRef.current = true
    setBusy(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    const current = ++seq.current
    const label = `${players[0]} & ${players[1]} gegen ${players[2]} & ${players[3]}`
    const detail = `Automat ${machine} · ${call === 1 ? "Erster" : call === 2 ? "Zweiter" : "Letzter"} Aufruf`
    setPlayersLabel(label)
    setDetails(detail)
    setPhase("preparing")
    let url: string | null = null
    try {
      const key = getKey(players, machine, call)
      const audioBlob = cache.get(key) || await requestAudio(players, machine, call, false)
      if (!audioBlob || current !== seq.current) return
      cache.set(key, audioBlob)
      if (cache.size > 25) cache.delete(cache.keys().next().value!)
      url = URL.createObjectURL(audioBlob)
      const audio = new Audio(url)
      audioRef.current = audio
      await audio.play()
      if (current !== seq.current) return
      setPhase("playing")
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve()
        audio.onerror = () => reject(new Error("Audiowiedergabe fehlgeschlagen"))
      })
      if (current === seq.current) setPhase("done")
    } catch (error) {
      console.error("Survival Martin: Aufruf fehlgeschlagen", error)
      if (current === seq.current) setPhase("error")
    } finally {
      if (url) URL.revokeObjectURL(url)
      if (current === seq.current) {
        busyRef.current = false
        setBusy(false)
        hideTimer.current = setTimeout(() => setPhase(null), 2200)
      }
    }
  }, [enabled])

  const status = phase ? (
    <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[9999] w-[min(355px,calc(100vw-40px))] rounded-[18px] border border-orange-400/40 bg-slate-900 px-[18px] py-[17px] text-white shadow-2xl pointer-events-none">
      <div className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-orange-300">
        <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
        EMD · TURNIERSPRECHER
        <span className={`ml-auto flex h-6 items-center gap-[3px] ${phase === "playing" ? "" : "opacity-50"}`} aria-hidden="true">
          {[12, 19, 14, 21].map((height, index) => <span key={index} className={`w-1 rounded-full bg-orange-400 ${phase === "playing" ? "animate-pulse" : ""}`} style={{ height }} />)}
        </span>
      </div>
      <div className="mt-2 text-base font-black">{phase === "preparing" ? "Ansage wird vorbereitet …" : phase === "playing" ? "Martin spricht 🎤" : phase === "done" ? "Ansage beendet ✓" : "Martin nicht erreichbar"}</div>
      <div className="mt-1 text-sm text-slate-200">{playersLabel}</div>
      <div className="mt-1 text-xs text-slate-400">{details}</div>
    </div>
  ) : null
  return { enabled, toggle, announce, busy, status }
}
