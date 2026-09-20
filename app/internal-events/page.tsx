"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, Loader2, MapPin, Trophy } from "lucide-react"
import { Header } from "@/components/header"
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

type EventRow={id:string;title:string;subtitle:string|null;event_date:string;end_date:string|null;start_time:string|null;location:string|null;image_url:string|null;image_path:string|null;draft_enabled:boolean;draw_mode:"online"|"onsite"|null;draw_datetime:string|null;draw_location:string|null;draw_attendance_required:boolean}

function Content(){
  const [events,setEvents]=useState<EventRow[]>([])
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    const run=async()=>{
      const today=new Date().toISOString().slice(0,10)
      const {data}=await supabase.from("internal_tournament_events")
        .select("id,title,subtitle,event_date,end_date,start_time,location,image_url,image_path,draft_enabled,draw_mode,draw_datetime,draw_location,draw_attendance_required")
        .in("status",["published","closed"])
        .gte("event_date",today)
        .order("event_date")
      setEvents((data||[]) as EventRow[])
      setLoading(false)
    }
    void run()
  },[])
  if(loading)return <div className="flex min-h-[380px] items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin"/> Wird geladen…</div>
  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <Header/>
      <main className="mx-auto max-w-6xl px-3 pb-16 pt-20 sm:px-5 lg:px-8">
        <div className="rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-300">Vereinsintern</div>
          <h1 className="mt-2 text-3xl font-black">Interne Turniere & Specials</h1>
          <p className="mt-2 text-sm font-semibold text-white/55">Anmelden, Sonderbewerbe ansehen und am Spieltag dabei sein.</p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {events.map((e)=>(
            <Link href={`/internal-events/${e.id}`} key={e.id}>
              <Card className="h-full overflow-hidden rounded-3xl transition hover:-translate-y-0.5 hover:shadow-md">
                {internalEventImageUrl(e.image_path,e.image_url)?<div className="relative z-0 aspect-video overflow-hidden bg-black"><img src={internalEventImageUrl(e.image_path,e.image_url)} alt={e.title} className="block h-full w-full object-contain"/></div>:null}
                <CardContent className="relative z-10 border-t bg-white p-5">
                  <div className="text-xl font-black">{e.title}</div>
                  {e.subtitle?<div className="mt-1 text-sm font-semibold text-slate-500">{e.subtitle}</div>:null}
                  <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4"/>{formatEventDateRange(e.event_date,e.end_date)}</span>
                    {e.location?<span className="flex items-center gap-1"><MapPin className="h-4 w-4"/>{e.location}</span>:null}
                  </div>
                  {e.draw_mode?(
                    <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-black ${e.draw_mode==="onsite"?"bg-amber-50 text-amber-800":"bg-sky-50 text-sky-800"}`}>
                      Auslosung: {e.draw_mode==="onsite"?"live vor Ort":"online"}
                      {e.draw_datetime?` · ${new Date(e.draw_datetime).toLocaleString("de-AT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}`:""}
                      {e.draw_mode==="onsite"&&e.draw_attendance_required?" · Anwesenheit erforderlich":""}
                    </div>
                  ):null}
                  <div className="mt-4 inline-flex items-center gap-2 font-black text-orange-700">Zur Anmeldung <ArrowRight className="h-4 w-4"/></div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {events.length===0?<div className="rounded-3xl border border-dashed bg-white p-10 text-center text-sm font-semibold text-slate-500">Aktuell ist kein internes Event veröffentlicht.</div>:null}
        </div>
      </main>
    </div>
  )
}

export default function InternalEventsPage(){
  return <MembershipAccessGate required="internal_tournaments"><Content/></MembershipAccessGate>
}
