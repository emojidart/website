"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dices,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { MembershipAccessGate } from "@/components/member/membership/membership-access-gate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type EventRow={
  id:string
  title:string
  subtitle:string|null
  description:string|null
  image_url:string|null
  image_path:string|null
  event_date:string
  end_date:string|null
  start_time:string|null
  location:string|null
  registration_open_at:string|null
  registration_deadline:string|null
  max_participants:number|null
  status:string
  draft_enabled:boolean
  draft_date:string|null
  draft_time:string|null
  captain_count:number
  team_size:number|null
  reserve_count:number
  draft_order_mode:"snake"|"round_robin"
  steal_joker_enabled:boolean
  draft_notes:string|null
  draw_mode:"online"|"onsite"|null
  draw_datetime:string|null
  draw_location:string|null
  draw_attendance_required:boolean
  draw_note:string|null
}

type Registration={
  id:string
  status:"registered"|"waitlist"|"withdrawn"
  registered_at:string
}

type Captain={
  captain_player_id:string
  draft_position:number
  club_players:{id:string;name:string;photo_url:string|null}|null
}

type Pick={
  id:string
  captain_player_id:string
  player_id:string
  pick_no:number
  round_no:number
  pick_type:"normal"|"steal"
  club_players:{id:string;name:string;photo_url:string|null}|null
}

function internalEventImageUrl(path:string|null|undefined,legacyUrl?:string|null){
  if(path)return supabase.storage.from("internal-events").getPublicUrl(path).data.publicUrl
  return legacyUrl||""
}
function dateLabel(date:string){
  return new Date(`${date}T12:00:00`).toLocaleDateString("de-AT",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})
}
function dateRangeLabel(start:string,end:string|null){
  const effectiveEnd=end||start
  if(start===effectiveEnd)return dateLabel(start)
  const a=new Date(`${start}T12:00:00`).toLocaleDateString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric"})
  const b=new Date(`${effectiveEnd}T12:00:00`).toLocaleDateString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric"})
  return `${a} – ${b}`
}
function timeLabel(value:string|null){
  return value?`${value.slice(0,5)} Uhr`:"—"
}

function EventContent(){
  const params=useParams<{id:string}>()
  const id=String(params?.id||"")
  const [event,setEvent]=useState<EventRow|null>(null)
  const [registration,setRegistration]=useState<Registration|null>(null)
  const [registeredCount,setRegisteredCount]=useState(0)
  const [waitlistCount,setWaitlistCount]=useState(0)
  const [captains,setCaptains]=useState<Captain[]>([])
  const [picks,setPicks]=useState<Pick[]>([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState("")

  const load=async()=>{
    try{
      setLoading(true)
      setMessage("")
      const {data:{user}}=await supabase.auth.getUser()
      if(!user)throw new Error("Bitte zuerst anmelden.")

      const {data:e,error:ee}=await supabase.from("internal_tournament_events").select("*").eq("id",id).single()
      if(ee)throw ee
      setEvent(e as EventRow)

      const {data:profile,error:pe}=await supabase.from("user_profiles").select("player_id").eq("user_id",user.id).single()
      if(pe)throw pe

      const [rr,sr,cr,pr]=await Promise.all([
        supabase.from("internal_tournament_event_registrations")
          .select("id,status,registered_at")
          .eq("event_id",id)
          .eq("player_id",profile.player_id)
          .maybeSingle(),
        supabase.rpc("get_internal_event_registration_summary",{p_event_id:id}),
        supabase.from("internal_tournament_event_captains")
          .select("captain_player_id,draft_position,club_players!internal_tournament_event_captains_captain_player_id_fkey(id,name,photo_url)")
          .eq("event_id",id)
          .order("draft_position"),
        supabase.from("internal_tournament_event_draft_picks")
          .select("id,captain_player_id,player_id,pick_no,round_no,pick_type,club_players!internal_tournament_event_draft_picks_player_id_fkey(id,name,photo_url)")
          .eq("event_id",id)
          .order("pick_no"),
      ])
      if(rr.error)throw rr.error
      if(sr.error)throw sr.error
      if(cr.error)throw cr.error
      if(pr.error)throw pr.error
      setRegistration((rr.data||null) as Registration|null)
      setRegisteredCount(Number(sr.data?.[0]?.registered_count||0))
      setWaitlistCount(Number(sr.data?.[0]?.waitlist_count||0))
      setCaptains((cr.data||[]) as any)
      setPicks((pr.data||[]) as any)
    }catch(e:any){
      setMessage(e?.message||"Veranstaltung konnte nicht geladen werden.")
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{if(id)void load()},[id])

  const register=async()=>{
    setBusy(true)
    setMessage("")
    const {data,error}=await supabase.rpc("register_internal_tournament_event",{p_event_id:id})
    if(error)setMessage(error.message)
    else{
      const row=Array.isArray(data)?data[0]:data
      setMessage(row?.status==="waitlist"?"Du stehst auf der Warteliste.":"Du bist angemeldet 🎯")
      await load()
    }
    setBusy(false)
  }

  const unregister=async()=>{
    setBusy(true)
    setMessage("")
    const {error}=await supabase.rpc("unregister_internal_tournament_event",{p_event_id:id})
    if(error)setMessage(error.message)
    else{
      setMessage("Deine Anmeldung wurde zurückgezogen.")
      await load()
    }
    setBusy(false)
  }

  const rosters=useMemo(()=>captains.map((c)=>({
    captain:c,
    players:picks.filter((p)=>p.captain_player_id===c.captain_player_id),
  })),[captains,picks])

  if(loading){
    return <div className="flex min-h-[420px] items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin"/> Wird geladen…</div>
  }
  if(!event){
    return <div className="mx-auto max-w-2xl p-6 text-center font-bold">{message||"Event nicht gefunden."}</div>
  }

  const deadlinePassed=event.registration_deadline?Date.now()>new Date(event.registration_deadline).getTime():false
  const open=event.status==="published"&&!deadlinePassed
  const active=registration?.status==="registered"||registration?.status==="waitlist"

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <Header/>
      <main className="mx-auto w-full max-w-5xl px-3 pb-16 pt-20 sm:px-5 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-orange-700"><ArrowLeft className="h-4 w-4"/> Zur Startseite</Link>

        <section className="mt-4 overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-xl">
          {internalEventImageUrl(event.image_path,event.image_url)?(
            <div className="relative z-0 aspect-video w-full overflow-hidden bg-black">
              <img src={internalEventImageUrl(event.image_path,event.image_url)} alt={event.title} className="block h-full w-full object-contain"/>
            </div>
          ):null}
          <div className="relative z-10 border-t border-white/10 bg-slate-950 p-5 sm:p-8">
            <div className="inline-flex rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">Interne Veranstaltung</div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{event.title}</h1>
            {event.subtitle?<p className="mt-2 text-base font-semibold text-white/60">{event.subtitle}</p>:null}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/[0.06] p-4"><CalendarDays className="h-5 w-5 text-orange-300"/><div className="mt-2 font-black">{dateRangeLabel(event.event_date,event.end_date)}</div></div>
              <div className="rounded-2xl bg-white/[0.06] p-4"><Clock3 className="h-5 w-5 text-orange-300"/><div className="mt-2 font-black">Beginn {timeLabel(event.start_time)}</div></div>
              <div className="rounded-2xl bg-white/[0.06] p-4"><MapPin className="h-5 w-5 text-orange-300"/><div className="mt-2 font-black">{event.location||"Vereinsheim"}</div></div>
            </div>
          </div>
        </section>

        {message?<div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">{message}</div>:null}

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <Card className="rounded-3xl">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2 text-lg font-black"><Trophy className="h-5 w-5 text-orange-600"/> Infos & Regeln</div>
                <div className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-600">{event.description||"Weitere Informationen folgen."}</div>
              </CardContent>
            </Card>

            {event.draw_mode?(
              <Card className={`rounded-3xl ${event.draw_mode==="onsite"?"border-amber-200":"border-sky-200"}`}>
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-lg font-black">
                    <Dices className={`h-5 w-5 ${event.draw_mode==="onsite"?"text-amber-600":"text-sky-600"}`}/>
                    Auslosung
                  </div>
                  {event.draft_date?<div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold">Auslosung: {dateLabel(event.draft_date)} · {timeLabel(event.draft_time)}</div>:null}
                  {event.draft_notes?<div className="mt-3 whitespace-pre-wrap text-sm font-semibold text-slate-600">{event.draft_notes}</div>:null}

                  {captains.length>0?(
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {rosters.map(({captain,players})=>(
                        <div key={captain.captain_player_id} className="rounded-2xl border bg-white p-4">
                          <div className="text-[10px] font-black uppercase tracking-widest text-orange-600">Team {captain.draft_position}</div>
                          <div className="mt-1 font-black">{captain.club_players?.name||"Captain"}</div>
                          <div className="mt-3 space-y-1.5">
                            {players.map((p)=><div key={p.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold">{p.club_players?.name||"Spieler"}{p.pick_type==="steal"?<span className="ml-2 text-[10px] uppercase text-red-600">Steal</span>:null}</div>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ):(
                    <div className="mt-4 rounded-2xl border border-dashed p-4 text-sm font-semibold text-slate-500">Die Draft-Reihenfolge wurde noch nicht ausgelost.</div>
                  )}
                </CardContent>
              </Card>
            ):null}
          </div>

          <div>
            <Card className="sticky top-20 rounded-3xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-lg font-black"><Users className="h-5 w-5 text-orange-600"/> Anmeldung</div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Angemeldet</div><div className="mt-1 text-2xl font-black">{registeredCount}</div></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Limit</div><div className="mt-1 text-2xl font-black">{event.max_participants||"∞"}</div></div>
                </div>
                {waitlistCount>0?<div className="mt-2 text-xs font-bold text-amber-700">{waitlistCount} auf Warteliste</div>:null}

                {registration?.status==="registered"?(
                  <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
                    <div className="flex items-center gap-2 font-black"><CheckCircle2 className="h-5 w-5"/> Du bist angemeldet</div>
                  </div>
                ):registration?.status==="waitlist"?(
                  <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-amber-800"><div className="font-black">Du stehst auf der Warteliste</div></div>
                ):null}

                <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 p-3 text-xs font-bold text-orange-800">
                  <ShieldCheck className="mb-1 h-4 w-4"/> Anmeldung nur mit aktivem Paket „Interne Turniere“ – auch eine laufende Testphase zählt.
                </div>

                {active?(
                  <Button onClick={()=>void unregister()} disabled={busy} variant="outline" className="mt-4 h-11 w-full rounded-xl font-black">
                    {busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:null} Anmeldung zurückziehen
                  </Button>
                ):(
                  <Button onClick={()=>void register()} disabled={busy||!open} className="mt-4 h-11 w-full rounded-xl bg-orange-600 font-black hover:bg-orange-700">
                    {busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:null}
                    {open?"Jetzt anmelden":"Anmeldung geschlossen"}
                  </Button>
                )}

                {event.registration_deadline?<div className="mt-3 text-center text-xs font-semibold text-slate-400">Anmeldeschluss: {new Date(event.registration_deadline).toLocaleString("de-AT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</div>:null}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function InternalEventPage(){
  return (
    <MembershipAccessGate
      required="internal_tournaments"
      title="Interne Turniere"
      description="Für diese Anmeldung benötigst du das Modul „Interne Turniere“. Eine aktive Testphase reicht ebenfalls aus."
    >
      <EventContent/>
    </MembershipAccessGate>
  )
}
