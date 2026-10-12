"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export const MEMBERS_CUP_DRAW_CHANNEL = "emd-members-cup-draw-show-v1"
export type DrawShow = { id: string; eventId: string; stage: "groups" | "partners" | "full"; groupCount?: number; names: string[]; startedAt: number; stepMs: number }

// Anzeigekomponente ohne Änderungen an den vorhandenen TV-Folien oder Beamer-Routen.
export default function MembersCupDrawShow() {
  const [show, setShow] = useState<DrawShow | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const apply = (value: unknown) => {
      const s = value as DrawShow
      if (!s || !Array.isArray(s.names) || s.names.length > 128 || !s.eventId || !["groups", "partners", "full"].includes(s.stage)) return
      if (Date.now() >= s.startedAt + s.stepMs * (s.names.length + 2)) return
      setShow(prev => !prev || prev.id !== s.id ? s : prev)
    }
    // TV oder Beamer nach dem Start geoeffnet: laufende Show nachholen.
    try { const raw = window.localStorage.getItem(MEMBERS_CUP_DRAW_CHANNEL); if (raw) apply(JSON.parse(raw)) } catch {}
    const onStorage = (e: StorageEvent) => { if (e.key === MEMBERS_CUP_DRAW_CHANNEL && e.newValue) { try { apply(JSON.parse(e.newValue)) } catch {} } }
    window.addEventListener("storage", onStorage)
    let bc: BroadcastChannel | null = null
    try { bc = new BroadcastChannel(MEMBERS_CUP_DRAW_CHANNEL); bc.onmessage = e => apply(e.data) } catch {}
    const channel = supabase.channel(MEMBERS_CUP_DRAW_CHANNEL)
      .on("broadcast", { event: "draw" }, ({ payload }) => apply(payload))
      .subscribe()
    return () => {
      window.removeEventListener("storage", onStorage)
      bc?.close()
      void supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  if (!show) return null
  const current = Math.floor((now - show.startedAt) / show.stepMs)
  if (current < 0 || current >= show.names.length + 2) return null
  const isIntro = current === 0
  const finished = current >= show.names.length + 1
  const rawEntry = !isIntro && !finished ? show.names[current - 1] : ""
  const isPartnerPhase = show.stage === "partners" || (show.stage === "full" && current > (show.groupCount ?? 0))
  const showEnd = finished && (show.stage === "partners" || show.stage === "full")
  const phaseTitle = isPartnerPhase ? "PARTNER-AUSLOSUNG" : "GRUPPENAUSLOSUNG"
  const phaseProgress = isPartnerPhase ? Math.max(1, current - (show.groupCount ?? 0)) : current
  const phaseTotal = isPartnerPhase && show.stage === "full" ? show.names.length - (show.groupCount ?? 0) : isPartnerPhase ? show.names.length : (show.groupCount || show.names.length)

  // Die vorhandenen Ziehungseintraege rein visuell trennen – keine neue Auslosung.
  const separator = rawEntry.indexOf(" · ")
  const rawHeading = separator >= 0 ? rawEntry.slice(0, separator) : ""
  const rawPlayers = separator >= 0 ? rawEntry.slice(separator + 3) : rawEntry
  const teamMatch = rawHeading.match(/^TEAM\s+(\d+)$/i)
  const heading = teamMatch ? `TEAM ${teamMatch[1]}` : /^Gruppe [AB]$/i.test(rawHeading) ? rawHeading.toUpperCase() : (rawHeading || (isPartnerPhase ? "TEAM" : "GRUPPE"))
  // Trennt nur den von der App erzeugten Separator ' + ', nicht Namensbestandteile.
  const plusAt = isPartnerPhase ? rawPlayers.indexOf(" + ") : -1
  const firstPlayer = plusAt >= 0 ? rawPlayers.slice(0, plusAt) : rawPlayers
  const secondPlayer = plusAt >= 0 ? rawPlayers.slice(plusAt + 3) : ""
  return (
    <div className="pointer-events-none fixed inset-0 z-[210] flex items-center justify-center overflow-hidden bg-[#05080d] p-[4vw] text-white" aria-live="off">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(249,115,22,.19),transparent_58%)]" />
      <div className="relative w-full max-w-[1100px] rounded-[2.3vw] border border-orange-500/30 bg-gradient-to-b from-[#161c23] to-[#090d12] px-[3vw] py-[4vh] text-center shadow-[0_0_100px_rgba(249,115,22,.13)]">
        <div className="text-[clamp(11px,1vw,16px)] font-extrabold tracking-[.23em] text-orange-400">EMD MEMBERS CHAMPION CUP</div>
        <div className="mt-[3vh] text-[clamp(18px,2vw,30px)] font-black">{phaseTitle}</div>
        <div className="mt-[3vh] flex min-h-[26vh] flex-col items-center justify-center gap-[1.6vh]">
          {isIntro ? (
            <div className="text-[clamp(18px,2.4vw,36px)] font-bold text-white/75">Die Auslosung beginnt …</div>
          ) : finished ? (
            <div className="text-[clamp(20px,2.6vw,40px)] font-black text-emerald-400">{showEnd ? "AUSLOSUNG ABGESCHLOSSEN" : "GRUPPEN SIND FIXIERT"}</div>
          ) : (
            <div key={`${show.id}-${current}`} className="flex w-full flex-col items-center justify-center gap-[1.2vh] animate-[fadeIn_.6s_ease-out]">
              <div className="rounded-full border border-orange-400/30 bg-orange-500/10 px-6 py-2 text-[clamp(16px,1.8vw,25px)] font-black tracking-[.13em] text-orange-300">{heading}</div>
              <div className="mt-[1vh] w-full max-w-[980px] break-words [overflow-wrap:anywhere] px-2 text-[clamp(19px,2.4vw,38px)] font-extrabold leading-[1.2] text-white">{firstPlayer}</div>
              {secondPlayer && (
                <>
                  <div className="flex w-full max-w-[520px] items-center gap-5 py-[.6vh]" aria-label="und">
                    <div className="h-px flex-1 bg-orange-400/25" />
                    <span className="text-[clamp(22px,2.3vw,34px)] font-black text-orange-400">&amp;</span>
                    <div className="h-px flex-1 bg-orange-400/25" />
                  </div>
                  <div className="w-full max-w-[980px] break-words [overflow-wrap:anywhere] px-2 text-[clamp(19px,2.4vw,38px)] font-extrabold leading-[1.2] text-white">{secondPlayer}</div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="mt-[5vh] text-[clamp(12px,1.2vw,18px)] font-bold text-orange-300">{isIntro ? "BEREIT MACHEN" : finished ? (showEnd ? "VIEL ERFOLG!" : "ALS NÄCHSTES: PARTNER-AUSLOSUNG") : `${phaseProgress} / ${phaseTotal}`}</div>
        <div className="mx-auto mt-[3vh] h-[5px] w-full max-w-3xl overflow-hidden rounded-full bg-white/10"><div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, current / Math.max(1,show.names.length) * 100))}%` }} /></div>
      </div>
    </div>
  )
}
