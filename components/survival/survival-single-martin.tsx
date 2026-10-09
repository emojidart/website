"use client"
import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"

// Genau wie Doppel: hinterlegte Martin-Aussprache aus der Spielerdatenbank.
const pronunciation = new Map<string, string>()
let pronunciationLoading: Promise<void> | null = null
async function loadPronunciation(): Promise<void> {
  if (!pronunciationLoading) {
    pronunciationLoading = (async () => {
      const { data, error } = await supabase.from("spieldatenbank").select("name,tts_pronunciation")
      if (error) throw error
      for (const row of data || []) {
        if (row.name && row.tts_pronunciation) {
          pronunciation.set(String(row.name).trim().toLocaleLowerCase("de"), String(row.tts_pronunciation).trim())
        }
      }
    })().catch(error => {
      pronunciationLoading = null
      console.warn("[EMD Martin Einzel] Aussprache nicht geladen; Originalnamen werden verwendet", error)
    })
  }
  await pronunciationLoading
}
function spoken(name: string): string {
  return pronunciation.get(name.trim().toLocaleLowerCase("de")) || name
}

// Bereitet dieselbe Einzel-Ansage ohne Ton im Martin-Servercache vor.
// Ein Fehler beim Vorladen darf niemals die Turnierleitung blockieren.
export function prefetchSurvivalSingleMartin(
  players: string[],
  machine: number,
  call: 1 | 2 | 3 = 1,
): void {
  if (typeof window === "undefined" || players.length !== 2 || !players[0] || !players[1]) return
  if (!Number.isInteger(machine) || machine < 1 || machine > 99) return
  void loadPronunciation().then(() => fetch("http://127.0.0.1:8765/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      player1: spoken(players[0]),
      player2: spoken(players[1]),
      machine,
      call,
      speed: 1,
      prefetch: true,
    }),
  }).then((response) => {
    if (!response.ok) throw new Error(`Martin-Vorladen HTTP ${response.status}`)
    return response.blob()
  })).catch((error) => {
    console.warn("[EMD Martin Einzel] Vorladen nicht möglich:", error)
  })
}

type Request = {players:string[];machine:number;call:1|2|3;nonce:number}|null
type Phase = "preparing" | "playing" | "done" | "error" | null

export function SurvivalSingleMartin({request,onHandled,onEnabledChange}:{request:Request;onHandled:()=>void;onEnabledChange?:(enabled:boolean)=>void}) {
  const [enabled,setEnabled]=useState(false)
  const [busy,setBusy]=useState(false)
  const [phase,setPhase]=useState<Phase>(null)
  const [playersLabel,setPlayersLabel]=useState("")
  const [details,setDetails]=useState("")
  const audioRef=useRef<HTMLAudioElement|null>(null)
  const hideTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
  const handledRef=useRef(onHandled)
  handledRef.current=onHandled

  useEffect(()=>{
    const saved=localStorage.getItem("emd_survival_martin_enabled")==="true"
    setEnabled(saved)
    onEnabledChange?.(saved)
    return ()=>{
      audioRef.current?.pause()
      if(hideTimer.current) clearTimeout(hideTimer.current)
    }
    // Only run the initial preference load on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  useEffect(()=>{
    if(!request)return
    // Do not show a permanent notification when Martin has been switched off.
    if(!enabled){handledRef.current();return}
    if(request.players.length!==2||request.players.some(p=>!p)){handledRef.current();return}
    if(hideTimer.current){clearTimeout(hideTimer.current);hideTimer.current=null}
    let cancelled=false
    let url:string|null=null
    const {players,machine,call}=request
    const run=async()=>{
      setBusy(true)
      setPlayersLabel(`${players[0]} gegen ${players[1]}`)
      setDetails(`Automat ${machine} · ${call===1?"Erster":call===2?"Zweiter":"Letzter"} Aufruf`)
      setPhase("preparing")
      try{
        await loadPronunciation()
        const response=await fetch("http://127.0.0.1:8765/speak",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({player1:spoken(players[0]),player2:spoken(players[1]),machine,call,speed:1})
        })
        if(!response.ok){const detail=await response.json().catch(()=>null);throw new Error(detail?.error||`Martin HTTP ${response.status}`)}
        const audio=await response.blob()
        if(cancelled)return
        url=URL.createObjectURL(audio)
        const player=new Audio(url)
        audioRef.current=player
        await player.play()
        if(cancelled)return
        setPhase("playing")
        await new Promise<void>((resolve,reject)=>{
          player.onended=()=>resolve()
          player.onerror=()=>reject(new Error("Audiowiedergabe fehlgeschlagen"))
        })
        if(!cancelled)setPhase("done")
      }catch(error){
        console.error("[EMD Martin Einzel] Aufruf fehlgeschlagen",error)
        if(!cancelled)setPhase("error")
      }finally{
        if(url)URL.revokeObjectURL(url)
        if(!cancelled){
          setBusy(false)
          handledRef.current()
          hideTimer.current=setTimeout(()=>{setPhase(null);hideTimer.current=null},2200)
        }
      }
    }
    void run()
    return()=>{cancelled=true;audioRef.current?.pause();if(url)URL.revokeObjectURL(url)}
  },[request,enabled])

  return <>
    <div className="rounded-xl border border-orange-500/20 bg-[#15100d] px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
      <div><p className="text-sm font-extrabold text-orange-200">🎤 EMD Martin · Einzel Roulette</p><p className="text-xs text-zinc-400 mt-1">Ansagen bei Automatenzuweisung automatisch, wenn Martin eingeschaltet ist.</p></div>
      <label className="text-sm font-bold flex items-center gap-2"><input type="checkbox" checked={enabled} disabled={busy} onChange={e=>{setEnabled(e.target.checked);onEnabledChange?.(e.target.checked);localStorage.setItem("emd_survival_martin_enabled",String(e.target.checked))}}/>Martin {enabled?"EIN":"AUS"}</label>
    </div>
    {phase&&<div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[9999] w-[min(355px,calc(100vw-40px))] rounded-[18px] border border-orange-400/40 bg-slate-900 px-[18px] py-[17px] text-white shadow-2xl pointer-events-none">
      <div className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-orange-300">
        <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
        EMD · TURNIERSPRECHER
        <span className={`ml-auto flex h-6 items-center gap-[3px] ${phase==="playing"?"":"opacity-50"}`} aria-hidden="true">
          {[12,19,14,21].map((height,index)=><span key={index} className={`w-1 rounded-full bg-orange-400 ${phase==="playing"?"animate-pulse":""}`} style={{height}} />)}
        </span>
      </div>
      <div className="mt-2 text-base font-black">{phase==="preparing"?"Ansage wird vorbereitet …":phase==="playing"?"Martin spricht 🎤":phase==="done"?"Ansage beendet ✓":"Martin nicht erreichbar"}</div>
      <div className="mt-1 text-sm text-slate-200">{playersLabel}</div>
      <div className="mt-1 text-xs text-slate-400">{details}</div>
    </div>}
  </>
}
