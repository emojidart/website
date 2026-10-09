"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

interface SpeechAnnouncerProps {
  enabled: boolean
}

type AnnouncerAudioState = {
  sequence: number
  controller: AbortController | null
  audio: HTMLAudioElement | null
  objectUrl: string | null
}
const announcerAudioState: AnnouncerAudioState = {
  sequence: 0, controller: null, audio: null, objectUrl: null,
}
function getAudioState() { return announcerAudioState }
// Store recordings in the browser too: replay is immediate without a network request.
const audioCache = new Map<string, Blob>()
const CACHE_ITEMS = 40
// Prevent the same announcement from being generated twice while preloading.
const pendingAudio = new Map<string, Promise<Blob>>()
const martinUrl = "http://127.0.0.1:8765/speak"
const pronunciationMap = new Map<string, string>()
let pronunciationPromise: Promise<void> | null = null
// Lookup once per page: only the words spoken change, not official player identities.
function preparePronunciations(): Promise<void> {
  if (!pronunciationPromise) {
    pronunciationPromise = (async () => {
      const { data, error } = await supabase.from("spieldatenbank").select("name, tts_pronunciation")
      if (error) { console.warn("Martin-Aussprache konnte nicht geladen werden:", error.message); return }
      pronunciationMap.clear()
      for (const entry of data || []) {
        const official = String(entry.name || "").trim().toLocaleLowerCase("de")
        const spoken = String(entry.tts_pronunciation || "").trim()
        if (official && spoken) pronunciationMap.set(official, spoken)
      }
    })().catch(error => console.warn("Martin-Aussprache:", error))
  }
  return pronunciationPromise
}
function getSpokenName(name: string): string {
  return pronunciationMap.get(name.trim().toLocaleLowerCase("de")) || name
}

function audioKey(player1: string, player2: string, machine: number, call: number) {
  return JSON.stringify([player1, player2, machine, call, 1])
}
// Foreground calls bypass all preload jobs. A maximum of one preload runs at once.
// Only a few waiting preloads are retained, even in a 128-player tournament.
type PreloadJob = { player1: string; player2: string; machine: number; call: number; key: string }
const preloadQueue: PreloadJob[] = []
const queuedKeys = new Set<string>()
let preloadRunning = false
let foregroundRequests = 0
const MAX_PRELOAD_QUEUE = 3

function loadAudio(player1: string, player2: string, machine: number, call: number, prefetch = false): Promise<Blob> {
  const key = audioKey(player1, player2, machine, call)
  const cached = getCached(key)
  if (cached) return Promise.resolve(cached)
  const alreadyPending = pendingAudio.get(key)
  if (alreadyPending) return alreadyPending
  if (!prefetch) foregroundRequests += 1
  const promise = preparePronunciations().then(() => fetch(martinUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player1: getSpokenName(player1), player2: getSpokenName(player2), machine, call, speed: 1, prefetch }),
  })).then(async response => {
    if (!response.ok) throw new Error(`Martin HTTP ${response.status}`)
    return response.blob()
  }).then(blob => {
    saveCached(key, blob)
    return blob
  }).finally(() => {
    pendingAudio.delete(key)
    if (!prefetch) {
      foregroundRequests -= 1
      pumpPreloads()
    }
  })
  pendingAudio.set(key, promise)
  return promise
}

function pumpPreloads() {
  if (preloadRunning || foregroundRequests > 0) return
  while (preloadQueue.length > 0) {
    const job = preloadQueue.shift()!
    queuedKeys.delete(job.key)
    if (getCached(job.key) || pendingAudio.has(job.key)) continue
    preloadRunning = true
    void loadAudio(job.player1, job.player2, job.machine, job.call, true)
      .catch(() => {})
      .finally(() => {
        preloadRunning = false
        pumpPreloads()
      })
    return
  }
}

// Preloads never speak; they are limited, and an actual click always has priority.
export function prefetchMartinAnnouncement(player1: string, player2: string, machine: number, call = 1) {
  if (!player1 || !player2 || machine < 1) return
  const key = audioKey(player1, player2, machine, call)
  if (getCached(key) || pendingAudio.has(key) || queuedKeys.has(key)) return
  if (preloadQueue.length >= MAX_PRELOAD_QUEUE) return
  preloadQueue.push({ player1, player2, machine, call, key })
  queuedKeys.add(key)
  pumpPreloads()
}
function getCached(key: string): Blob | undefined {
  const blob = audioCache.get(key)
  if (blob) { audioCache.delete(key); audioCache.set(key, blob) }
  return blob
}
function saveCached(key: string, blob: Blob) {
  audioCache.delete(key)
  audioCache.set(key, blob)
  while (audioCache.size > CACHE_ITEMS) {
    const first = audioCache.keys().next().value
    if (first === undefined) break
    audioCache.delete(first)
  }
}


// Lightweight shared status panel: no changes to DKO components or match state.
let announcementBusy = false
let statusHideTimer: ReturnType<typeof setTimeout> | null = null
function showAnnouncementStatus(phase: "preparing" | "playing" | "done" | "error", players: string, detail: string) {
  if (typeof document === "undefined") return
  let panel = document.getElementById("emd-martin-status")
  if (!panel) {
    const style = document.createElement("style")
    style.id = "emd-martin-status-style"
    style.textContent = `
      @keyframes emdMartinWave { 0%, 100% { transform:scaleY(.35) } 50% { transform:scaleY(1) } }
      @keyframes emdMartinAppear { from { opacity:0; transform:translateY(15px) } to { opacity:1; transform:translateY(0) } }
      #emd-martin-status { position:fixed;right:20px;bottom:20px;z-index:2147483000;width:min(355px,calc(100vw - 40px));padding:17px 18px;border-radius:18px;color:#fff;background:#111827;border:1px solid #fb923c66;box-shadow:0 14px 46px #0008;font-family:system-ui,Segoe UI,sans-serif;pointer-events:none;animation:emdMartinAppear .22s ease-out }
      #emd-martin-status .emd-top { display:flex;align-items:center;gap:9px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#fdba74 }
      #emd-martin-status .emd-dot { width:9px;height:9px;border-radius:50%;background:#f97316;box-shadow:0 0 0 4px #f9731625 }
      #emd-martin-status .emd-title { margin-top:11px;font-weight:800;font-size:17px }
      #emd-martin-status .emd-players { margin-top:6px;font-size:14px;line-height:1.35;color:#e5e7eb }
      #emd-martin-status .emd-detail { margin-top:5px;color:#cbd5e1;font-size:12px }
      #emd-martin-status .emd-wave { display:flex;align-items:center;gap:3px;height:23px;margin-left:auto }
      #emd-martin-status .emd-wave span { display:block;width:4px;height:18px;border-radius:3px;background:#fb923c;animation:emdMartinWave .65s ease-in-out infinite }
      #emd-martin-status .emd-wave span:nth-child(2) { animation-delay:.12s }
      #emd-martin-status .emd-wave span:nth-child(3) { animation-delay:.24s }
      #emd-martin-status .emd-wave span:nth-child(4) { animation-delay:.36s }
      #emd-martin-status[data-phase=done] .emd-wave span,#emd-martin-status[data-phase=error] .emd-wave span { animation:none;transform:scaleY(.35) }
    `
    document.head.appendChild(style)
    panel = document.createElement("div")
    panel.id = "emd-martin-status"
    panel.setAttribute("role", "status")
    panel.setAttribute("aria-live", "polite")
    panel.innerHTML = `<div class="emd-top"><span class="emd-dot"></span><span>EMD · TURNIERSPRECHER</span><span class="emd-wave" aria-hidden="true"><span></span><span></span><span></span><span></span></span></div><div class="emd-title"></div><div class="emd-players"></div><div class="emd-detail"></div>`
    document.body.appendChild(panel)
  }
  if (statusHideTimer) { clearTimeout(statusHideTimer);statusHideTimer=null }
  panel.dataset.phase = phase
  panel.querySelector(".emd-title")!.textContent = ({ preparing:"Ansage wird vorbereitet …", playing:"Martin spricht 🎤", done:"Ansage beendet ✓", error:"Ansage nicht verfügbar" } as const)[phase]
  panel.querySelector(".emd-players")!.textContent = players
  panel.querySelector(".emd-detail")!.textContent = detail
  if (phase === "done" || phase === "error") {
    statusHideTimer = setTimeout(() => { panel?.remove(); statusHideTimer=null }, phase === "done" ? 1300 : 3500)
  }
}
function finishAnnouncement(players: string, detail: string, failed = false) {
  announcementBusy = false
  showAnnouncementStatus(failed ? "error" : "done", players, detail)
}

export function useSpeechAnnouncer({ enabled }: SpeechAnnouncerProps) {
  useEffect(() => { void preparePronunciations() }, [])
  const [isSupported, setIsSupported] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    // Check if speech synthesis is supported
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true)

      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices()
        setVoices(availableVoices)
        console.log(
          "[v0] Available voices:",
          availableVoices.map((v) => v.name),
        )
      }

      // Load voices immediately
      loadVoices()

      // Also listen for voiceschanged event (some browsers need this)
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices)

      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoices)
      }
    }
  }, [])

  const announce = useCallback(
    (player1: string, player2: string, machineNumber: number, callNumber = 1) => {
      if (!enabled || announcementBusy) return
      announcementBusy = true
      const players = `${player1} gegen ${player2}`
      const detail = `Automat ${machineNumber} · ${callNumber === 1 ? "Erster" : callNumber === 2 ? "Zweiter" : "Letzter"} Aufruf`
      showAnnouncementStatus("preparing", players, detail + " · Bitte kurz warten")

      let text = `${player1} gegen ${player2} auf Automat ${machineNumber}`
      if (callNumber === 2) text = `Zweiter Aufruf. ${text}`
      else if (callNumber === 3) text = `Letzter Aufruf. ${text}`

      // Pro Spielaufruf alte Tondateien stoppen. Auch spaet eintreffende
      // Antworten duerfen keine ueberholte Ansage mehr abspielen.
      const state = getAudioState()
      state.sequence += 1
      const sequence = state.sequence
      state.controller?.abort()
      state.audio?.pause()
      state.audio = null
      state.controller = null
      if (state.objectUrl) URL.revokeObjectURL(state.objectUrl)
      state.objectUrl = null
      if ("speechSynthesis" in window) window.speechSynthesis.cancel()

      const browserFallback = () => {
        if (state.sequence !== sequence) return
        if (!("speechSynthesis" in window)) { finishAnnouncement(players, detail + " · Martin nicht erreichbar", true); return }
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = "de-DE"
        utterance.rate = 0.9
        utterance.pitch = 1
        utterance.volume = 1
        const voice =
          voices.find(v => v.name.includes("Google Deutsch")) ||
          voices.find(v => v.lang.startsWith("de") && !v.name.includes("Hedda")) ||
          voices.find(v => v.lang.startsWith("de"))
        if (voice) utterance.voice = voice
        utterance.onstart = () => showAnnouncementStatus("playing", players, detail + " · Browserstimme")
        utterance.onend = () => finishAnnouncement(players, detail)
        utterance.onerror = () => finishAnnouncement(players, detail + " · Fehler", true)
        window.speechSynthesis.speak(utterance)
      }

      const key = audioKey(player1, player2, machineNumber, callNumber)
      const playBlob = async (blob: Blob) => {
        if (state.sequence !== sequence) return
        const url = URL.createObjectURL(blob)
        state.objectUrl = url
        const audio = new Audio(url)
        state.audio = audio
        audio.onended = () => {
          if (state.audio === audio) {
            state.audio = null
            state.objectUrl = null
            URL.revokeObjectURL(url)
            finishAnnouncement(players, detail)
          }
        }
        audio.onerror = () => {
          if (state.sequence === sequence) browserFallback()
        }
        try {
          await audio.play()
          if (state.sequence === sequence) showAnnouncementStatus("playing", players, detail)
        }
        catch (error) {
          console.warn("EMD Martin: Tonwiedergabe blockiert", error)
          if (state.sequence === sequence) browserFallback()
        }
      }

      const cached = getCached(key)
      if (cached) {
        void playBlob(cached)
        return
      }

      // Remove a waiting preload for this match: the clicked announcement
      // is now a foreground request and must not wait in the preload queue.
      const waitingIndex = preloadQueue.findIndex(job => job.key === key)
      if (waitingIndex >= 0) {
        preloadQueue.splice(waitingIndex, 1)
        queuedKeys.delete(key)
      }
      // An already running preload for this exact text may be reused.
      void loadAudio(player1, player2, machineNumber, callNumber)
        .then(blob => {
          if (state.sequence !== sequence) return
          return playBlob(blob)
        }).catch(error => {
          if (state.sequence !== sequence) return
          console.warn("EMD Martin nicht verfuegbar, Browserstimme wird verwendet:", error)
          browserFallback()
        })
    },
    [enabled, voices],
  )

  return { announce, isSupported }
}

export function SpeechAnnouncerSettings({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: (enabled: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id="speech-enabled"
        checked={enabled}
        onChange={(e) => onToggle(e.target.checked)}
        className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
      />
      <label htmlFor="speech-enabled" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
        Ansagen aktivieren
      </label>
    </div>
  )
}
