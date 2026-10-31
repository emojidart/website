"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const STORAGE_LINK = "emd_survival_youtube_playlist_url"
const STORAGE_VOLUME = "emd_survival_youtube_volume"
const STORAGE_DUCK = "emd_survival_youtube_duck"

function parseYouTube(source: string): { id: string; list?: string } | null {
  try {
    const u = new URL(source.trim())
    const host = u.hostname.toLowerCase()
    if (!["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtu.be"].includes(host)) return null
    const list = u.searchParams.get("list") || undefined
    const id = host.includes("youtu.be") ? u.pathname.split("/")[1] : u.searchParams.get("v") || (u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2] : "")
    if (list && /^[a-zA-Z0-9_-]+$/.test(list)) return { id: id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : "", list }
    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return { id }
  } catch { /* Keine gültige URL */ }
  return null
}

type YouTubePlayer = {
  setVolume: (v: number) => void
  getVolume: () => number
  destroy: () => void
}
type YouTubeAPI = { Player: new (id: string, options: Record<string, unknown>) => YouTubePlayer }
declare global { interface Window { YT?: YouTubeAPI; onYouTubeIframeAPIReady?: () => void } }

export function EmdYouTubePlayer() {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState("")
  const [volume, setVolume] = useState(65)
  const [duck, setDuck] = useState(true)
  const [error, setError] = useState("")
  const [active, setActive] = useState<{ id: string; list?: string } | null>(null)
  const player = useRef<YouTubePlayer | null>(null)
  const targetVolume = useRef(65)
  const isDucking = useRef(false)
  const duckEnabled = useRef(true)
  const playerId = useRef(`emd-youtube-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    setLink(localStorage.getItem(STORAGE_LINK) || "")
    const savedVolume = Number(localStorage.getItem(STORAGE_VOLUME))
    if (localStorage.getItem(STORAGE_VOLUME) !== null && Number.isFinite(savedVolume)) { const v = Math.max(0, Math.min(100, savedVolume)); setVolume(v); targetVolume.current = v }
    const d = localStorage.getItem(STORAGE_DUCK) !== "false"
    setDuck(d); duckEnabled.current = d
  }, [])

  const setPlayerVolume = useCallback((v: number) => {
    try { player.current?.setVolume(Math.max(0, Math.min(100, v))) } catch { /* Player noch nicht bereit */ }
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ playing?: boolean }>).detail
      isDucking.current = !!detail?.playing
      setPlayerVolume(isDucking.current && duckEnabled.current ? Math.min(15, targetVolume.current) : targetVolume.current)
    }
    window.addEventListener("emd-survival-announcement", handler)
    return () => window.removeEventListener("emd-survival-announcement", handler)
  }, [setPlayerVolume])

  useEffect(() => {
    if (!active || !open) return
    let cancelled = false
    const create = () => {
      if (cancelled || !window.YT?.Player) return
      player.current?.destroy()
      player.current = new window.YT.Player(playerId.current, {
        width: "100%", height: "205",
        videoId: active.id || undefined,
        playerVars: { playsinline: 1, rel: 0, ...(active.list ? { list: active.list, listType: "playlist" } : {}) },
        events: { onReady: () => setPlayerVolume(isDucking.current && duckEnabled.current ? Math.min(15, targetVolume.current) : targetVolume.current) },
      })
    }
    if (window.YT?.Player) create()
    else {
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { previous?.(); create() }
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement("script")
        script.src = "https://www.youtube.com/iframe_api"
        script.async = true
        document.head.appendChild(script)
      }
    }
    return () => { cancelled = true; player.current?.destroy(); player.current = null }
  }, [active, open, setPlayerVolume])

  const applyLink = () => {
    const parsed = parseYouTube(link)
    if (!parsed) { setError("Bitte einen gültigen YouTube-Video- oder Playlist-Link eingeben."); return }
    setError("")
    localStorage.setItem(STORAGE_LINK, link.trim())
    setActive(parsed)
  }

  return (
    <section className="mb-5 rounded-2xl border border-orange-400/25 bg-[#151821] p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="text-sm font-extrabold text-orange-200">♫ Musik · YouTube</div><p className="text-xs text-slate-400">Deine Playlist für die Turnierleitung</p></div>
        <button type="button" onClick={() => setOpen(v => !v)} className="rounded-xl border border-orange-400/40 px-4 py-2 text-sm font-bold text-orange-200 hover:bg-orange-400/10">{open ? "Musiksteuerung schließen" : "Musiksteuerung öffnen"}</button>
      </div>
      {open && <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)]">
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-300" htmlFor="emd-youtube-url">YouTube-Playlist oder Video</label>
          <div className="flex flex-wrap gap-2">
            <input id="emd-youtube-url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://www.youtube.com/playlist?list=..." className="min-w-0 flex-1 rounded-xl border border-white/15 bg-[#080a10] px-3 py-2 text-sm text-white" />
            <button type="button" onClick={applyLink} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-black">Laden</button>
          </div>
          {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
          <label className="flex items-center gap-3 text-sm"><span className="w-24">Musik</span><input aria-label="Musiklautstärke" type="range" min={0} max={100} value={volume} onChange={e => { const v=Number(e.target.value);setVolume(v);targetVolume.current=v;localStorage.setItem(STORAGE_VOLUME,String(v));setPlayerVolume(isDucking.current && duckEnabled.current ? Math.min(15,v) : v) }} className="min-w-0 flex-1 accent-orange-500" /><span className="w-10 text-right tabular-nums">{volume}%</span></label>
          <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={duck} onChange={e => {setDuck(e.target.checked);duckEnabled.current=e.target.checked;localStorage.setItem(STORAGE_DUCK,String(e.target.checked));setPlayerVolume(isDucking.current && e.target.checked ? Math.min(15,targetVolume.current) : targetVolume.current)}} className="accent-orange-500" />Musik während NERO-/VOLT-Ansagen leiser (15 %)</label>
          <p className="text-xs text-slate-400">Musik im Player starten. Automatische Absenkung funktioniert nur in diesem Player und in diesem Browser-Tab. YouTube kann Werbung anzeigen.</p>
        </div>
        <div className="min-h-[205px] overflow-hidden rounded-xl bg-black">
          {active ? <div id={playerId.current} /> : <div className="flex h-[205px] items-center justify-center px-4 text-center text-sm text-slate-400">Playlist-Link einfügen und auf „Laden“ klicken</div>}
        </div>
      </div>}
    </section>
  )
}
