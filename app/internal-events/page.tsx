"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, Loader2, MapPin, Trophy } from "lucide-react"
import { Header } from "@/components/header"
import { InternalEventsBackground } from "@/app/internal-events/_komponenten/internal-events-design"
import { MembershipAccessGate } from "@/components/member/membership/membership-access-gate"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"


function internalEventImageUrl(path:string|null|undefined,legacyUrl?:string|null){
  if(path)return supabase.storage.from("internal-events").getPublicUrl(path).data.publicUrl
  return legacyUrl||""
}

function formatEventDateRange(start:string,end:string|null){
  const effectiveEnd=end||start
  const fmt=(v:string)=>new Date(`${v}T12:00:00`).toLocaleDateString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric"})
  return start===effectiveEnd?fmt(start):`${fmt(start)} – ${fmt(effectiveEnd)}`
}

type EventRow={id:string;title:string;subtitle:string|null;event_date:string|null;end_date:string|null;date_open:boolean;start_time:string|null;location:string|null;image_url:string|null;image_path:string|null;draft_enabled:boolean;draw_mode:"online"|"onsite"|null;draw_datetime:string|null;draw_location:string|null;draw_attendance_required:boolean}

function Content(){
  const [events,setEvents]=useState<EventRow[]>([])
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    const run=async()=>{
      const today=new Date().toISOString().slice(0,10)
      const {data}=await supabase.from("internal_tournament_events")
        .select("id,title,subtitle,event_date,end_date,date_open,start_time,location,image_url,image_path,draft_enabled,draw_mode,draw_datetime,draw_location,draw_attendance_required")
        .in("status",["published","closed"])
        .or(`date_open.eq.true,end_date.gte.${today},event_date.gte.${today}`)
        .order("event_date",{ascending:true,nullsFirst:false})
      setEvents((data||[]) as EventRow[])
      setLoading(false)
    }
    void run()
  },[])
  if(loading)return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white">
      <InternalEventsBackground />
      <div className="relative z-10 flex min-h-[420px] items-center justify-center gap-2 text-white/65">
        <Loader2 className="h-5 w-5 animate-spin text-orange-300"/> Wird geladen…
      </div>
    </div>
  )
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] pb-24 text-white">
      <Header variant="app" title="Interne Turniere" subtitle="Vereinsintern" backHref="/" />
      <InternalEventsBackground />
      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-16 pt-20 sm:px-5 lg:px-8">
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-black/35 p-6 text-white shadow-[0_28px_80px_-50px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-8">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-300">Vereinsintern</div>
          <h1 className="mt-2 text-3xl font-black">Interne Turniere & Specials</h1>
          <p className="mt-2 text-sm font-semibold text-white/55">Anmelden, Sonderbewerbe ansehen und am Spieltag dabei sein.</p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {events.map((e)=>(
            <Link href={`/internal-events/${e.id}`} key={e.id}>
              <Card className="h-full overflow-hidden rounded-[26px] border border-white/10 bg-black/30 text-white shadow-[0_20px_60px_-46px_rgba(0,0,0,.9)] transition hover:-translate-y-0.5 hover:border-orange-300/20 hover:bg-white/[0.04]">
                {internalEventImageUrl(e.image_path,e.image_url)?<div className="relative z-0 aspect-video overflow-hidden bg-black"><img src={internalEventImageUrl(e.image_path,e.image_url)} alt={e.title} className="block h-full w-full object-contain"/></div>:null}
                <CardContent className="relative z-10 border-t border-white/10 bg-black/35 p-5">
                  <div className="text-xl font-black text-white">{e.title}</div>
                  {e.subtitle?<div className="mt-1 text-sm font-semibold text-white/45">{e.subtitle}</div>:null}
                  <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-white/45">
                    <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4"/>{formatEventDateRange(e.event_date,e.end_date,e.date_open)}</span>
                    {e.location?<span className="flex items-center gap-1"><MapPin className="h-4 w-4"/>{e.location}</span>:null}
                  </div>
                  {e.draw_mode?(
                    <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-black ${e.draw_mode==="onsite"?"border border-amber-400/20 bg-amber-500/10 text-amber-200":"border border-sky-400/20 bg-sky-500/10 text-sky-200"}`}>
                      Auslosung: {e.draw_mode==="onsite"?"live vor Ort":"online"}
                      {e.draw_datetime?` · ${new Date(e.draw_datetime).toLocaleString("de-AT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}`:""}
                      {e.draw_mode==="onsite"&&e.draw_attendance_required?" · Anwesenheit erforderlich":""}
                    </div>
                  ):null}
                  <div className="mt-4 inline-flex items-center gap-2 font-black text-orange-300">Zur Anmeldung <ArrowRight className="h-4 w-4"/></div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {events.length===0?<div className="rounded-3xl border border-dashed border-white/15 bg-black/25 p-10 text-center text-sm font-semibold text-white/45">Aktuell ist kein internes Event veröffentlicht.</div>:null}
        </div>
      </main>
    </div>
  )
}

export default function InternalEventsPage(){
  return <MembershipAccessGate required="internal_tournaments"><Content/></MembershipAccessGate>
}
