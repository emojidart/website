"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { selectLiveAnnouncement } from "@/components/emd-live-announcement-scheduler"

type Announcement = { id: string; kind: string; scope: string; message: string | null; ends_at: string; created_at: string; cancelled_at: string | null; display_mode?: "repeat" | "once" | "permanent"; display_seconds?: number; repeat_seconds?: number; central_tournament_events?: { title: string } | null }
const TITLES: Record<string, string> = { registration: "ANMELDESCHLUSS IN", start: "TURNIERBEGINN IN", final: "FINALE BEGINNT IN", ceremony: "SIEGEREHRUNG IN", custom: "EMD DURCHSAGE" }
export default function EmdLiveAnnouncementDisplay({ tv = false }: { tv?: boolean }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    let active = true
    const refresh = async () => {
      const { data, error } = await supabase.from("emd_live_announcements")
        .select("id,kind,scope,message,ends_at,created_at,cancelled_at,display_mode,display_seconds,repeat_seconds,central_tournament_events(title)")
        .is("cancelled_at", null).gt("ends_at", new Date().toISOString())
        .order("ends_at", { ascending: true }).limit(100)
      if (!active) return
      if (error) { console.error("EMD Live-Regie konnte nicht geladen werden:", error); return }
      setAnnouncements((data || []) as Announcement[])
    }
    void refresh()
    const poll = window.setInterval(() => { if (!document.hidden) void refresh() }, 12000)
    const channel = supabase.channel("emd-live-announcements-display").on("postgres_changes", { event: "*", schema: "public", table: "emd_live_announcements" }, () => void refresh()).subscribe()
    return () => { active = false; window.clearInterval(poll); void supabase.removeChannel(channel) }
  }, [])
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  // Identische, kollisionsfreie Zeitplanung fuer Beamer und EMD TV.
  // Ist eine Meldung faellig, bekommt sie exklusiv ihre Einblenddauer.
  const announcement = selectLiveAnnouncement(announcements, now)
  if (!announcement) return null
  const remaining = Math.max(0, Math.ceil((Date.parse(announcement.ends_at) - now) / 1000))
  if (remaining <= 0) return null
  const hours = Math.floor(remaining / 3600)
  const displayTime = hours > 0
    ? `${String(hours).padStart(2,"0")}:${String(Math.floor((remaining % 3600) / 60)).padStart(2,"0")}:${String(remaining % 60).padStart(2,"0")}`
    : `${String(Math.floor(remaining / 60)).padStart(2,"0")}:${String(remaining % 60).padStart(2,"0")}`
  const title = announcement.central_tournament_events?.title || "EMD Turnier"
  return (
    <div className="pointer-events-none fixed inset-0 z-[180] grid place-items-center bg-[#06080e]/[.96] p-[4vw] text-center text-white" aria-live="off">
      <div className="w-full max-w-[1100px] rounded-[2.5vw] border border-orange-400/25 bg-gradient-to-b from-[#171b26] to-[#07090f] px-[5vw] py-[5vh] shadow-[0_0_100px_rgba(249,115,22,.12)]">
        <div className="mb-[3vh] text-[clamp(12px,1.3vw,24px)] font-black uppercase tracking-[.24em] text-orange-400">EMD · LIVE ANKÜNDIGUNG</div>
        <h2 className="text-[clamp(24px,3.3vw,65px)] font-black uppercase leading-tight tracking-tight">{TITLES[announcement.kind] || "EMD"}</h2>
        {announcement.kind === "custom" ? (
          <div className="mx-auto mt-[4vh] max-w-4xl break-words text-[clamp(26px,3.4vw,64px)] font-bold leading-snug">{announcement.message}</div>
        ) : (
          <div className="mt-[3vh] text-[clamp(70px,10.5vw,200px)] font-black tabular-nums leading-none tracking-[-.07em] text-orange-400">{displayTime}</div>
        )}
        <div className="mt-[4vh] text-[clamp(16px,2vw,34px)] font-bold text-white/80">{title}{announcement.scope !== "all" ? ` · ${announcement.scope === "herren" ? "Herren-DKO" : "Damen-DKO"}` : ""}</div>
      </div>
    </div>
  )
}
