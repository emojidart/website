"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dices,
  Loader2,
  MapPin,
  ImagePlus,
  Trash2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  WandSparkles,
  X,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { MatchReportsTab } from "@/components/vereinsverwaltung/tabs/MatchReportsTab"

type EventStatus = "draft" | "published" | "closed" | "completed" | "cancelled"
type RegistrationStatus = "registered" | "waitlist" | "withdrawn"

type InternalEvent = {
  id:string
  title:string
  subtitle:string|null
  description:string|null
  image_url:string|null
  image_path:string|null
  event_date:string|null
  end_date:string|null
  date_open:boolean
  start_time:string|null
  location:string|null
  registration_open_at:string|null
  registration_deadline:string|null
  max_participants:number|null
  status:EventStatus
  show_on_homepage:boolean
  required_module_code:string
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

type Player = {
  id:string
  name:string
  photo_url:string|null
}

type Registration = {
  id:string
  event_id:string
  player_id:string
  status:RegistrationStatus
  registered_at:string
  note:string|null
  admin_note:string|null
  club_players:Player|null
}

type Captain = {
  event_id:string
  captain_player_id:string
  draft_position:number
  club_players:Player|null
}

type Pick = {
  id:string
  event_id:string
  captain_player_id:string
  player_id:string
  pick_no:number
  round_no:number
  pick_type:"normal"|"steal"
  stolen_from_captain_id:string|null
  club_players:Player|null
}

type Joker = {
  id:string
  event_id:string
  captain_player_id:string
  joker_type:"steal"
}

type EventTeamBridge = {
  event_id:string
  captain_player_id:string
  team_id:string
  teams?:{id:string;name:string;dart_type:string|null}|null
}

const emptyForm = {
  id:"",
  title:"",
  subtitle:"",
  description:"",
  image_url:"",
  image_path:"",
  event_date:"",
  end_date:"",
  date_open:false,
  start_time:"19:00",
  location:"",
  registration_open_at:"",
  registration_deadline:"",
  max_participants:"",
  status:"draft" as EventStatus,
  show_on_homepage:true,
  draft_enabled:false,
  draft_date:"",
  draft_time:"18:00",
  captain_count:"3",
  team_size:"3",
  reserve_count:"1",
  draft_order_mode:"snake" as "snake"|"round_robin",
  steal_joker_enabled:false,
  draft_notes:"",
  draw_mode:null as "online"|"onsite"|null,
  draw_datetime:"",
  draw_location:"",
  draw_attendance_required:false,
  draw_note:"",
}

function fmtDate(iso:string|null|undefined){
  if(!iso)return "—"
  return new Date(`${iso}T12:00:00`).toLocaleDateString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric"})
}
function fmtDateRange(start:string|null|undefined,end:string|null|undefined){
  if(!start)return "—"
  const effectiveEnd=end||start
  if(start===effectiveEnd)return fmtDate(start)
  return `${fmtDate(start)} – ${fmtDate(effectiveEnd)}`
}

function fmtDateTime(iso:string|null|undefined){
  if(!iso)return "—"
  return new Date(iso).toLocaleString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})
}

function localInputToIso(value:string){
  if(!value)return null
  return new Date(value).toISOString()
}

function internalEventImageUrl(path:string|null|undefined,legacyUrl?:string|null){
  if(path){
    return supabase.storage.from("internal-events").getPublicUrl(path).data.publicUrl
  }
  return legacyUrl||""
}

function isoToLocalInput(value:string|null){
  if(!value)return ""
  const d=new Date(value)
  const pad=(n:number)=>String(n).padStart(2,"0")
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function InternalTournamentEventsAdmin(){
  const [tab,setTab]=useState("events")
  const [events,setEvents]=useState<InternalEvent[]>([])
  const [registrations,setRegistrations]=useState<Registration[]>([])
  const [captains,setCaptains]=useState<Captain[]>([])
  const [picks,setPicks]=useState<Pick[]>([])
  const [jokers,setJokers]=useState<Joker[]>([])
  const [eventTeams,setEventTeams]=useState<EventTeamBridge[]>([])
  const [draftDartType,setDraftDartType]=useState<"edart"|"steeldart">("edart")
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [uploadingImage,setUploadingImage]=useState(false)
  const [message,setMessage]=useState("")
  const [form,setForm]=useState({...emptyForm})
  const [selectedEventId,setSelectedEventId]=useState("")
  const [draftCaptainIds,setDraftCaptainIds]=useState<string[]>([])
  const [draftBusy,setDraftBusy]=useState(false)
  const [stealCaptainId,setStealCaptainId]=useState("")
  const [stealPlayerId,setStealPlayerId]=useState("")
  const [releasePlayerId,setReleasePlayerId]=useState("")

  const load=async()=>{
    try{
      setLoading(true)
      const [er,rr,cr,pr,jr,tr]=await Promise.all([
        supabase.from("internal_tournament_events")
          .select("*")
          .order("event_date",{ascending:false}),
        supabase.from("internal_tournament_event_registrations")
          .select("id,event_id,player_id,status,registered_at,note,admin_note,club_players(id,name,photo_url)")
          .order("registered_at",{ascending:true}),
        supabase.from("internal_tournament_event_captains")
          .select("event_id,captain_player_id,draft_position,club_players!internal_tournament_event_captains_captain_player_id_fkey(id,name,photo_url)")
          .order("draft_position",{ascending:true}),
        supabase.from("internal_tournament_event_draft_picks")
          .select("id,event_id,captain_player_id,player_id,pick_no,round_no,pick_type,stolen_from_captain_id,club_players!internal_tournament_event_draft_picks_player_id_fkey(id,name,photo_url)")
          .order("pick_no",{ascending:true}),
        supabase.from("internal_tournament_event_jokers")
          .select("id,event_id,captain_player_id,joker_type"),
        supabase.from("internal_tournament_event_teams")
          .select("event_id,captain_player_id,team_id,teams(id,name,dart_type)"),
      ])
      if(er.error)throw er.error
      if(rr.error)throw rr.error
      if(cr.error)throw cr.error
      if(pr.error)throw pr.error
      if(jr.error)throw jr.error
      if(tr.error)throw tr.error

      const ev=(er.data||[]) as InternalEvent[]
      setEvents(ev)
      setRegistrations((rr.data||[]) as any)
      setCaptains((cr.data||[]) as any)
      setPicks((pr.data||[]) as any)
      setJokers((jr.data||[]) as any)
      setEventTeams((tr.data||[]) as any)

      // Keine Veranstaltung automatisch auswählen.
      // Der Admin muss bewusst wählen, für welches Event Einstellungen bearbeitet werden.
      if(selectedEventId && !ev.some((item)=>item.id===selectedEventId)){
        setSelectedEventId("")
      }
    }catch(e:any){
      setMessage(e?.message||"Daten konnten nicht geladen werden.")
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void load()},[])

  const selectedEvent=events.find((e)=>e.id===selectedEventId)||null
  const eventRegs=registrations.filter((r)=>r.event_id===selectedEventId)
  const activeRegs=eventRegs.filter((r)=>r.status==="registered")
  const waitRegs=eventRegs.filter((r)=>r.status==="waitlist")
  const eventCaptains=captains.filter((c)=>c.event_id===selectedEventId).sort((a,b)=>a.draft_position-b.draft_position)
  const eventPicks=picks.filter((p)=>p.event_id===selectedEventId).sort((a,b)=>a.pick_no-b.pick_no)
  const eventJokers=jokers.filter((j)=>j.event_id===selectedEventId)
  const linkedEventTeams=eventTeams.filter((t)=>t.event_id===selectedEventId)

  const playerById=useMemo(()=>{
    const map=new Map<string,Player>()
    for(const r of registrations)if(r.club_players)map.set(r.player_id,r.club_players)
    for(const c of captains)if(c.club_players)map.set(c.captain_player_id,c.club_players)
    for(const p of picks)if(p.club_players)map.set(p.player_id,p.club_players)
    return map
  },[registrations,captains,picks])

  const editEvent=(e:InternalEvent)=>{
    setForm({
      id:e.id,
      title:e.title,
      subtitle:e.subtitle||"",
      description:e.description||"",
      image_url:e.image_url||"",
      image_path:e.image_path||"",
      event_date:e.event_date||"",
      end_date:e.end_date||e.event_date||"",
      date_open:!!e.date_open,
      start_time:(e.start_time||"").slice(0,5),
      location:e.location||"",
      registration_open_at:isoToLocalInput(e.registration_open_at),
      registration_deadline:isoToLocalInput(e.registration_deadline),
      max_participants:e.max_participants?String(e.max_participants):"",
      status:e.status,
      show_on_homepage:e.show_on_homepage,
      draft_enabled:e.draft_enabled,
      draft_date:e.draft_date||"",
      draft_time:(e.draft_time||"18:00").slice(0,5),
      captain_count:String(e.captain_count||3),
      team_size:e.team_size?String(e.team_size):"",
      reserve_count:String(e.reserve_count||0),
      draft_order_mode:e.draft_order_mode||"snake",
      steal_joker_enabled:e.steal_joker_enabled,
      draft_notes:e.draft_notes||"",
      draw_mode:e.draw_mode as "online"|"onsite"|null,
      draw_datetime:isoToLocalInput(e.draw_datetime),
      draw_location:e.draw_location||"",
      draw_attendance_required:!!e.draw_attendance_required,
      draw_note:e.draw_note||"",
    })
    setSelectedEventId(e.id)
    setTab("events")
    setMessage("")
  }

  const resetForm=()=>setForm({...emptyForm})

  const uploadEventImage=async(file:File)=>{
    if(!file)return
    if(!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)){
      setMessage("Bitte JPG, PNG, WEBP oder GIF hochladen.")
      return
    }
    if(file.size>8*1024*1024){
      setMessage("Das Bild darf maximal 8 MB groß sein.")
      return
    }

    try{
      setUploadingImage(true)
      setMessage("")

      const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")
      const fileName=`${crypto.randomUUID()}.${ext||"jpg"}`
      const path=`events/${fileName}`

      const {error}=await supabase.storage
        .from("internal-events")
        .upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type})

      if(error)throw error

      const oldPath=form.image_path
      setForm((prev)=>({...prev,image_path:path,image_url:""}))

      if(oldPath){
        await supabase.storage.from("internal-events").remove([oldPath])
      }

      setMessage("Bild wurde hochgeladen.")
    }catch(e:any){
      setMessage(e?.message||"Bild konnte nicht hochgeladen werden.")
    }finally{
      setUploadingImage(false)
    }
  }

  const removeEventImage=async()=>{
    if(!form.image_path){
      setForm((prev)=>({...prev,image_url:""}))
      return
    }
    try{
      setUploadingImage(true)
      const {error}=await supabase.storage.from("internal-events").remove([form.image_path])
      if(error)throw error
      setForm((prev)=>({...prev,image_path:"",image_url:""}))
      setMessage("Bild wurde entfernt.")
    }catch(e:any){
      setMessage(e?.message||"Bild konnte nicht entfernt werden.")
    }finally{
      setUploadingImage(false)
    }
  }

  const saveEvent=async()=>{
    if(!form.title.trim()){
      setMessage("Titel ist Pflicht.")
      return
    }
    if(!form.date_open && !form.event_date){
      setMessage("Bitte Startdatum eintragen oder den Termin auf „offen“ setzen.")
      return
    }
    if(!form.date_open && form.end_date && form.event_date && form.end_date < form.event_date){
      setMessage("Enddatum darf nicht vor dem Startdatum liegen.")
      return
    }
    try{
      setSaving(true)
      setMessage("")
      const payload={
        title:form.title.trim(),
        subtitle:form.subtitle.trim()||null,
        description:form.description.trim()||null,
        image_url:null,
        image_path:form.image_path||null,
        event_date:form.date_open?null:form.event_date,
        end_date:form.date_open?null:(form.end_date||form.event_date),
        date_open:form.date_open,
        start_time:form.start_time||null,
        location:form.location.trim()||null,
        registration_open_at:localInputToIso(form.registration_open_at),
        registration_deadline:localInputToIso(form.registration_deadline),
        max_participants:form.max_participants?Number(form.max_participants):null,
        status:form.status,
        show_on_homepage:form.show_on_homepage,
        required_module_code:"internal_tournaments",
        draft_enabled:form.draft_enabled,
        draft_date:form.draft_enabled?(form.draft_date||(!form.date_open?form.event_date:null)):null,
        draft_time:form.draft_enabled?(form.draft_time||null):null,
        captain_count:form.draft_enabled?Math.max(2,Number(form.captain_count)||2):0,
        team_size:form.draft_enabled&&form.team_size?Number(form.team_size):null,
        reserve_count:form.draft_enabled?Math.max(0,Number(form.reserve_count)||0):0,
        draft_order_mode:form.draft_order_mode,
        steal_joker_enabled:form.draft_enabled&&form.steal_joker_enabled,
        draft_notes:form.draft_enabled?(form.draft_notes.trim()||null):null,
        draw_mode:form.draw_mode,
        draw_datetime:form.draw_mode?localInputToIso(form.draw_datetime):null,
        draw_location:form.draw_mode==="onsite"?(form.draw_location.trim()||form.location.trim()||null):null,
        draw_attendance_required:form.draw_mode==="onsite"?form.draw_attendance_required:false,
        draw_note:form.draw_mode?(form.draw_note.trim()||null):null,
        updated_at:new Date().toISOString(),
      }
      if(form.id){
        const {error}=await supabase.from("internal_tournament_events").update(payload).eq("id",form.id)
        if(error)throw error
      }else{
        const {data,error}=await supabase.from("internal_tournament_events")
          .insert(payload).select("id").single()
        if(error)throw error
        if(data?.id)setSelectedEventId(data.id)
      }
      setMessage("Veranstaltung gespeichert.")
      await load()
      resetForm()
    }catch(e:any){
      setMessage(e?.message||"Speichern fehlgeschlagen.")
    }finally{
      setSaving(false)
    }
  }

  const updateRegistration=async(id:string,status:RegistrationStatus)=>{
    const {error}=await supabase.from("internal_tournament_event_registrations")
      .update({status,updated_at:new Date().toISOString(),withdrawn_at:status==="withdrawn"?new Date().toISOString():null})
      .eq("id",id)
    if(error)setMessage(error.message)
    else await load()
  }

  const toggleCaptain=(playerId:string)=>{
    const max=Math.max(2,Number(selectedEvent?.captain_count||3))
    setDraftCaptainIds((prev)=>{
      if(prev.includes(playerId))return prev.filter((id)=>id!==playerId)
      if(prev.length>=max)return prev
      return [...prev,playerId]
    })
  }

  const randomizeCaptains=async()=>{
    if(!selectedEvent)return
    if(draftCaptainIds.length!==Number(selectedEvent.captain_count||0)){
      setMessage(`Bitte genau ${selectedEvent.captain_count} Captains auswählen.`)
      return
    }
    try{
      setDraftBusy(true)
      setMessage("")
      const {error}=await supabase.rpc("start_internal_event_draft",{
        p_event_id:selectedEvent.id,
        p_captain_ids:draftCaptainIds,
      })
      if(error)throw error
      setMessage("Draft-Reihenfolge wurde fair ausgelost.")
      await load()
    }catch(e:any){
      setMessage(e?.message||"Auslosung fehlgeschlagen.")
    }finally{
      setDraftBusy(false)
    }
  }

  const makePick=async(playerId:string)=>{
    if(!selectedEvent)return
    try{
      setDraftBusy(true)
      const {error}=await supabase.rpc("make_internal_event_draft_pick",{
        p_event_id:selectedEvent.id,
        p_player_id:playerId,
      })
      if(error)throw error
      await load()
    }catch(e:any){
      setMessage(e?.message||"Pick fehlgeschlagen.")
    }finally{
      setDraftBusy(false)
    }
  }

  const undoPick=async()=>{
    if(!selectedEvent)return
    setDraftBusy(true)
    const {error}=await supabase.rpc("undo_internal_event_draft_pick",{p_event_id:selectedEvent.id})
    if(error)setMessage(error.message)
    await load()
    setDraftBusy(false)
  }

  const useSteal=async()=>{
    if(!selectedEvent||!stealCaptainId||!stealPlayerId||!releasePlayerId)return
    try{
      setDraftBusy(true)
      setMessage("")
      const {error}=await supabase.rpc("use_internal_event_steal_joker",{
        p_event_id:selectedEvent.id,
        p_captain_id:stealCaptainId,
        p_steal_player_id:stealPlayerId,
        p_release_player_id:releasePlayerId,
      })
      if(error)throw error
      setMessage("Steal-Joker ausgeführt.")
      setStealPlayerId("")
      setReleasePlayerId("")
      await load()
    }catch(e:any){
      setMessage(e?.message||"Steal-Joker konnte nicht ausgeführt werden.")
    }finally{
      setDraftBusy(false)
    }
  }

  const buildDraftTeams=async()=>{
    if(!selectedEvent)return
    try{
      setDraftBusy(true)
      setMessage("")
      const {data,error}=await supabase.rpc("build_internal_event_draft_teams",{
        p_event_id:selectedEvent.id,
        p_dart_type:draftDartType,
      })
      if(error)throw error
      setMessage(`${Array.isArray(data)?data.length:0} Teams wurden aus dem Draft übernommen. Du kannst sie jetzt im Tab „Spielmodus & Spielplan“ verwenden.`)
      await load()
    }catch(e:any){
      setMessage(e?.message||"Draft-Teams konnten nicht erstellt werden.")
    }finally{
      setDraftBusy(false)
    }
  }

  const captainForNextPick=useMemo(()=>{
    if(!selectedEvent||eventCaptains.length<2)return null
    const n=eventCaptains.length
    const pickCount=eventPicks.length
    const round=Math.floor(pickCount/n)+1
    const index=pickCount%n
    const pos=selectedEvent.draft_order_mode==="snake"&&round%2===0?n-index:index+1
    return {captain:eventCaptains.find((c)=>c.draft_position===pos)||null,round,pickNo:pickCount+1}
  },[selectedEvent,eventCaptains,eventPicks])

  const pickedPlayerIds=new Set(eventPicks.map((p)=>p.player_id))
  const captainIds=new Set(eventCaptains.map((c)=>c.captain_player_id))
  const availablePlayers=activeRegs.filter((r)=>!pickedPlayerIds.has(r.player_id)&&!captainIds.has(r.player_id))

  if(loading){
    return <div className="flex min-h-[280px] items-center justify-center gap-2 text-sm font-bold text-slate-500"><Loader2 className="h-5 w-5 animate-spin"/> Interne Events werden geladen…</div>
  }

  return (
    <div className="space-y-5">
      {message?(
        <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${message.includes("gespeichert")||message.includes("ausgelost")||message.includes("ausgeführt")?"border-emerald-200 bg-emerald-50 text-emerald-700":"border-orange-200 bg-orange-50 text-orange-800"}`}>
          {message}
        </div>
      ):null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 lg:grid-cols-4">
          <TabsTrigger value="events" className="rounded-xl py-2.5 font-black">Events</TabsTrigger>
          <TabsTrigger value="registrations" className="rounded-xl py-2.5 font-black">Anmeldungen</TabsTrigger>
          <TabsTrigger value="draft" className="rounded-xl py-2.5 font-black">Draft / Auslosung</TabsTrigger>
          <TabsTrigger value="competition" className="rounded-xl py-2.5 font-black">Spielmodus & Spielplan</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-5 space-y-5">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-orange-600"/> Interne Veranstaltung anlegen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div><Label>Titel *</Label><Input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} className="mt-2"/></div>
                <div><Label>Untertitel</Label><Input value={form.subtitle} onChange={(e)=>setForm({...form,subtitle:e.target.value})} className="mt-2"/></div>
                <div className="md:col-span-2">
                  <label className={`flex items-center justify-between rounded-2xl border p-4 ${form.date_open?"border-sky-200 bg-sky-50":"border-slate-200 bg-white"}`}>
                    <span>
                      <span className="block font-black text-slate-950">Termin noch offen</span>
                      <span className="mt-1 block text-xs font-semibold text-slate-500">
                        Aktivieren, wenn Start- und Enddatum des Bewerbs noch nicht feststehen.
                      </span>
                    </span>
                    <Switch
                      checked={form.date_open}
                      onCheckedChange={(v)=>setForm({
                        ...form,
                        date_open:v,
                        event_date:v?"":form.event_date,
                        end_date:v?"":form.end_date,
                      })}
                    />
                  </label>
                </div>
                <div>
                  <Label>Datum von{form.date_open?"":" *"}</Label>
                  <Input
                    type="date"
                    disabled={form.date_open}
                    value={form.event_date}
                    onChange={(e)=>setForm({...form,event_date:e.target.value,end_date:form.end_date&&form.end_date<e.target.value?e.target.value:form.end_date})}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Datum bis</Label>
                  <Input
                    type="date"
                    disabled={form.date_open}
                    min={form.event_date||undefined}
                    value={form.end_date}
                    onChange={(e)=>setForm({...form,end_date:e.target.value})}
                    className="mt-2"
                  />
                </div>
                <div><Label>Ort</Label><Input value={form.location} onChange={(e)=>setForm({...form,location:e.target.value})} className="mt-2"/></div>
                <div><Label>Beginn</Label><Input type="time" value={form.start_time} onChange={(e)=>setForm({...form,start_time:e.target.value})} className="mt-2"/></div>
                <div><Label>Anmeldung ab</Label><Input type="datetime-local" value={form.registration_open_at} onChange={(e)=>setForm({...form,registration_open_at:e.target.value})} className="mt-2"/></div>
                <div><Label>Anmeldeschluss</Label><Input type="datetime-local" value={form.registration_deadline} onChange={(e)=>setForm({...form,registration_deadline:e.target.value})} className="mt-2"/></div>
                <div><Label>Max. Teilnehmer</Label><Input type="number" min={1} value={form.max_participants} onChange={(e)=>setForm({...form,max_participants:e.target.value})} className="mt-2" placeholder="leer = unbegrenzt"/></div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(value:EventStatus)=>setForm({...form,status:value})}>
                    <SelectTrigger className="mt-2"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Entwurf</SelectItem>
                      <SelectItem value="published">Veröffentlicht / Anmeldung offen</SelectItem>
                      <SelectItem value="closed">Anmeldung geschlossen</SelectItem>
                      <SelectItem value="completed">Abgeschlossen</SelectItem>
                      <SelectItem value="cancelled">Abgesagt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Veranstaltungsbild</Label>
                <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {internalEventImageUrl(form.image_path,form.image_url)?(
                    <div className="relative">
                      <img
                        src={internalEventImageUrl(form.image_path,form.image_url)}
                        alt="Veranstaltungsbild"
                        className="block aspect-video w-full bg-black object-contain"
                      />
                      <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 bg-gradient-to-t from-black/75 to-transparent p-4 pt-10">
                        <label className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-white px-4 text-sm font-black text-slate-900 shadow">
                          <ImagePlus className="mr-2 h-4 w-4"/>
                          Bild ersetzen
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            disabled={uploadingImage}
                            onChange={(e)=>{const file=e.target.files?.[0];if(file)void uploadEventImage(file);e.currentTarget.value=""}}
                          />
                        </label>
                        <Button
                          type="button"
                          variant="destructive"
                          className="h-10 rounded-xl font-black"
                          disabled={uploadingImage}
                          onClick={()=>void removeEventImage()}
                        >
                          <Trash2 className="mr-2 h-4 w-4"/> Entfernen
                        </Button>
                      </div>
                    </div>
                  ):(
                    <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center p-6 text-center transition hover:bg-orange-50">
                      {uploadingImage?<Loader2 className="h-9 w-9 animate-spin text-orange-600"/>:<ImagePlus className="h-9 w-9 text-orange-600"/>}
                      <div className="mt-3 font-black text-slate-900">{uploadingImage?"Bild wird hochgeladen…":"Bild hochladen"}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">JPG, PNG, WEBP oder GIF · max. 8 MB · empfohlen 16:9</div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={(e)=>{const file=e.target.files?.[0];if(file)void uploadEventImage(file);e.currentTarget.value=""}}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div><Label>Beschreibung / Regeln</Label><Textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="mt-2 min-h-[130px]"/></div>

              <div className="rounded-3xl border border-sky-200 bg-sky-50/60 p-4 sm:p-5">
                <div className="flex items-center gap-2 font-black text-sky-900"><Dices className="h-5 w-5"/> Auslosung</div>
                <p className="mt-1 text-sm font-semibold text-sky-800/70">
                  Unabhängig vom Captain-Draft. Für normale Online- oder Vor-Ort-Auslosungen.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Auslosung</Label>
                    <Select
                      value={form.draw_mode||"none"}
                      onValueChange={(v:"none"|"online"|"onsite")=>setForm({
                        ...form,
                        draw_mode:v==="none"?null:v,
                        draw_datetime:v==="none"?"":form.draw_datetime,
                        draw_location:v==="none"?"":form.draw_location,
                        draw_attendance_required:v==="onsite"?form.draw_attendance_required:false,
                        draw_note:v==="none"?"":form.draw_note,
                      })}
                    >
                      <SelectTrigger className="mt-2 bg-white"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Keine Auslosung</SelectItem>
                        <SelectItem value="online">Online-Auslosung</SelectItem>
                        <SelectItem value="onsite">Live vor Ort</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.draw_mode?(
                    <div>
                      <Label>Termin der Auslosung</Label>
                      <Input
                        type="datetime-local"
                        value={form.draw_datetime}
                        onChange={(e)=>setForm({...form,draw_datetime:e.target.value})}
                        className="mt-2 bg-white"
                      />
                    </div>
                  ):null}
                </div>

                {form.draw_mode==="onsite"?(
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Ort der Auslosung</Label>
                      <Input
                        value={form.draw_location}
                        onChange={(e)=>setForm({...form,draw_location:e.target.value})}
                        className="mt-2 bg-white"
                        placeholder={form.location||"Vereinsheim"}
                      />
                    </div>
                    <label className="flex items-center justify-between rounded-2xl border border-sky-200 bg-white p-4">
                      <span>
                        <span className="block font-black">Anwesenheit erforderlich</span>
                        <span className="text-xs text-slate-500">Spieler müssen zur Auslosung vor Ort sein.</span>
                      </span>
                      <Switch checked={form.draw_attendance_required} onCheckedChange={(v)=>setForm({...form,draw_attendance_required:v})}/>
                    </label>
                  </div>
                ):null}

                {form.draw_mode?(
                  <div className="mt-4">
                    <Label>Hinweis zur Auslosung</Label>
                    <Textarea
                      value={form.draw_note}
                      onChange={(e)=>setForm({...form,draw_note:e.target.value})}
                      className="mt-2 bg-white"
                      placeholder={form.draw_mode==="online"?"z. B. Auslosung erfolgt über unser vereinseigenes Auslosungsprogramm.":"z. B. Bitte 15 Minuten vorher vor Ort sein."}
                    />
                  </div>
                ):null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-2xl border p-4">
                  <span><span className="block font-black">Auf Startseite anzeigen</span><span className="text-xs font-semibold text-slate-500">Nur für Paket „Interne Turniere“.</span></span>
                  <Switch checked={form.show_on_homepage} onCheckedChange={(v)=>setForm({...form,show_on_homepage:v})}/>
                </label>
                <label className="flex items-center justify-between rounded-2xl border p-4">
                  <span><span className="block font-black">Optionaler Captain-Draft</span><span className="text-xs font-semibold text-slate-500">Nur aktivieren, wenn dieser Bewerb so gespielt wird.</span></span>
                  <Switch checked={form.draft_enabled} onCheckedChange={(v)=>setForm({...form,draft_enabled:v})}/>
                </label>
              </div>

              {form.draft_enabled?(
                <div className="rounded-3xl border border-orange-200 bg-orange-50/60 p-4 sm:p-5">
                  <div className="flex items-center gap-2 font-black text-orange-900"><Dices className="h-5 w-5"/> Draft-Einstellungen</div>
                  <p className="mt-1 max-w-4xl text-sm font-semibold leading-6 text-orange-900/75">
                    Beim Snake-Draft wechselt die Wahlreihenfolge nach jeder Runde die Richtung.
                    Beispiel: In Runde 1 wählen die Captains A → B → C, in Runde 2 C → B → A.
                    So wird der Vorteil des ersten Picks ausgeglichen und die Spielerauswahl fairer verteilt.
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div><Label>Draft-Datum</Label><Input type="date" value={form.draft_date} onChange={(e)=>setForm({...form,draft_date:e.target.value})} className="mt-2"/></div>
                    <div><Label>Draft-Uhrzeit</Label><Input type="time" value={form.draft_time} onChange={(e)=>setForm({...form,draft_time:e.target.value})} className="mt-2"/></div>
                    <div><Label>Anzahl Captains</Label><Input type="number" min={2} max={12} value={form.captain_count} onChange={(e)=>setForm({...form,captain_count:e.target.value})} className="mt-2"/></div>
                    <div><Label>Teamgröße inkl. Captain</Label><Input type="number" min={1} value={form.team_size} onChange={(e)=>setForm({...form,team_size:e.target.value})} className="mt-2"/></div>
                    <div><Label>Reserve je Team</Label><Input type="number" min={0} value={form.reserve_count} onChange={(e)=>setForm({...form,reserve_count:e.target.value})} className="mt-2"/></div>
                    <div>
                      <Label>Wahlreihenfolge</Label>
                      <Select value={form.draft_order_mode} onValueChange={(v:"snake"|"round_robin")=>setForm({...form,draft_order_mode:v})}>
                        <SelectTrigger className="mt-2"><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="snake">Snake-Draft (empfohlen)</SelectItem>
                          <SelectItem value="round_robin">Immer gleiche Reihenfolge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <label className="mt-4 flex items-center justify-between rounded-2xl border border-orange-200 bg-white p-4">
                    <span><span className="block font-black">Steal-Joker</span><span className="text-xs text-slate-500">Jeder Captain kann einmal einen bereits gewählten Spieler stehlen und muss einen eigenen abgeben.</span></span>
                    <Switch checked={form.steal_joker_enabled} onCheckedChange={(v)=>setForm({...form,steal_joker_enabled:v})}/>
                  </label>
                  <div className="mt-4"><Label>Draft-Hinweise / Sonderregeln</Label><Textarea value={form.draft_notes} onChange={(e)=>setForm({...form,draft_notes:e.target.value})} className="mt-2 bg-white"/></div>
                </div>
              ):null}

              <div className="flex flex-wrap gap-2">
                <Button onClick={()=>void saveEvent()} disabled={saving} className="rounded-xl bg-orange-600 font-black hover:bg-orange-700">
                  {saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Save className="mr-2 h-4 w-4"/>}
                  {form.id?"Änderungen speichern":"Event anlegen"}
                </Button>
                {form.id?<Button variant="outline" className="rounded-xl" onClick={resetForm}><X className="mr-2 h-4 w-4"/> Bearbeiten abbrechen</Button>:null}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3">
            {events.map((e)=>(
              <Card key={e.id} className="rounded-2xl">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-black text-slate-950">{e.title}</div>
                      <Badge variant="outline">{e.status}</Badge>
                      {e.draft_enabled?<Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Draft</Badge>:null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                      <span>{fmtDateRange(e.event_date,e.end_date,e.date_open)}</span>
                      {e.start_time?<span>{e.start_time.slice(0,5)} Uhr</span>:null}
                      {e.location?<span>{e.location}</span>:null}
                      <span>{registrations.filter((r)=>r.event_id===e.id&&r.status==="registered").length} Anmeldungen</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={()=>editEvent(e)}>Bearbeiten</Button>
                    <Button variant="outline" className="rounded-xl" onClick={()=>{setSelectedEventId(e.id);setTab("registrations")}}>Anmeldungen</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="registrations" className="mt-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-lg font-black">Anmeldungen</div>
              <div className="text-sm font-semibold text-slate-500">Alle Vereinsmitglieder, Warteliste und Abmeldungen.</div>
            </div>
            <div className="w-full sm:w-[360px]">
              <Label>Veranstaltung</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Event wählen"/></SelectTrigger>
                <SelectContent>{events.map((e)=><SelectItem key={e.id} value={e.id}>{e.title} · {fmtDateRange(e.event_date,e.end_date,e.date_open)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {selectedEvent?(
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="border-emerald-200 bg-emerald-50/60"><CardContent className="p-4"><div className="text-xs font-black uppercase text-emerald-700">Angemeldete Spieler</div><div className="mt-1 text-3xl font-black text-emerald-950">{activeRegs.length}</div></CardContent></Card>
                <Card className="border-amber-200 bg-amber-50/60"><CardContent className="p-4"><div className="text-xs font-black uppercase text-amber-700">Warteliste</div><div className="mt-1 text-3xl font-black text-amber-950">{waitRegs.length}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs font-black uppercase text-slate-400">Limit</div><div className="mt-1 text-3xl font-black">{selectedEvent.max_participants||"∞"}</div></CardContent></Card>
              </div>
              <Card className="overflow-hidden rounded-3xl">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-slate-950 text-white">
                      <tr><th className="px-4 py-3 text-left">Spieler</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Anmeldung</th><th className="px-4 py-3 text-right">Aktion</th></tr>
                    </thead>
                    <tbody>
                      {eventRegs.map((r)=>(
                        <tr
                          key={r.id}
                          className={`border-t ${
                            r.status==="registered"
                              ?"bg-emerald-50/70"
                              :r.status==="waitlist"
                                ?"bg-amber-50/70"
                                :"bg-red-50/60"
                          }`}
                        >
                          <td className="px-4 py-3 font-black">{r.club_players?.name||"Spieler"}</td>
                          <td className="px-4 py-3">
                            <Badge
                              className={
                                r.status==="registered"
                                  ?"border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                                  :r.status==="waitlist"
                                    ?"border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100"
                                    :"border-red-200 bg-red-100 text-red-800 hover:bg-red-100"
                              }
                              variant="outline"
                            >
                              {r.status==="registered"?"Angemeldet":r.status==="waitlist"?"Warteliste":"Abgemeldet"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{fmtDateTime(r.registered_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              {r.status!=="registered"?<Button size="sm" variant="outline" onClick={()=>void updateRegistration(r.id,"registered")}>Anmelden</Button>:null}
                              {r.status!=="waitlist"?<Button size="sm" variant="outline" onClick={()=>void updateRegistration(r.id,"waitlist")}>Warteliste</Button>:null}
                              {r.status!=="withdrawn"?<Button size="sm" variant="outline" onClick={()=>void updateRegistration(r.id,"withdrawn")}>Abmelden</Button>:null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ):null}
        </TabsContent>

        <TabsContent value="draft" className="mt-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-lg font-black">Draft / Auslosung am Spieltag</div>
              <div className="text-sm font-semibold text-slate-500">Optional pro Veranstaltung. Für normale interne Turniere bleibt dieser Bereich einfach deaktiviert.</div>
            </div>
            <div className="w-full sm:w-[360px]">
              <Label>Veranstaltung</Label>
              <Select value={selectedEventId} onValueChange={(id)=>{setSelectedEventId(id);setDraftCaptainIds([])}}>
                <SelectTrigger className="mt-2"><SelectValue/></SelectTrigger>
                <SelectContent>{events.map((e)=><SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {!selectedEvent?.draft_enabled?(
            <Card className="rounded-3xl border-dashed">
              <CardContent className="p-8 text-center">
                <Dices className="mx-auto h-10 w-10 text-slate-300"/>
                <div className="mt-3 font-black">Für dieses Event ist kein Draft aktiviert.</div>
                <div className="mt-1 text-sm font-semibold text-slate-500">Das ist völlig okay – der Draft ist nur ein optionales Zusatzmodul.</div>
              </CardContent>
            </Card>
          ):(
            <>
              <Card className="rounded-3xl">
                <CardHeader><CardTitle className="flex items-center gap-2"><WandSparkles className="h-5 w-5 text-orange-600"/> 1. Captains auswählen & Reihenfolge auslosen</CardTitle></CardHeader>
                <CardContent>
                  {eventCaptains.length===0?(
                    <>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-black text-slate-950">Angemeldete Spieler</div>
                          <div className="text-xs font-semibold text-slate-500">Nur angemeldete Spieler können als Captain ausgewählt werden.</div>
                        </div>
                        <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100" variant="outline">
                          {activeRegs.length} angemeldet
                        </Badge>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {activeRegs.map((r)=>{
                          const selected=draftCaptainIds.includes(r.player_id)
                          return (
                            <button
                              key={r.player_id}
                              type="button"
                              onClick={()=>toggleCaptain(r.player_id)}
                              className={`rounded-2xl border p-3 text-left transition ${
                                selected
                                  ?"border-orange-500 bg-orange-50 ring-2 ring-orange-100"
                                  :"border-emerald-200 bg-emerald-50/70 hover:border-orange-300"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-black">{r.club_players?.name||"Spieler"}</div>
                                <Badge
                                  className={selected
                                    ?"border-orange-200 bg-orange-100 text-orange-800 hover:bg-orange-100"
                                    :"border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                                  }
                                  variant="outline"
                                >
                                  {selected?"Captain":"Angemeldet"}
                                </Badge>
                              </div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">
                                {selected?"Als Captain ausgewählt":"Antippen, um als Captain auszuwählen"}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                        <div className="text-sm font-bold">{draftCaptainIds.length}/{selectedEvent.captain_count} Captains ausgewählt</div>
                        <Button onClick={()=>void randomizeCaptains()} disabled={draftBusy} className="rounded-xl bg-orange-600 font-black hover:bg-orange-700">
                          <Dices className="mr-2 h-4 w-4"/> Reihenfolge auslosen
                        </Button>
                      </div>
                    </>
                  ):(
                    <div>
                      <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                        Startreihenfolge ist ausgelost. {selectedEvent.draft_order_mode==="snake"?"Die Wahlrichtung wechselt nach jeder Runde. Dadurch wird der Vorteil des ersten Picks ausgeglichen und die Auswahl fair verteilt.":"Die Captains wählen in jeder Runde in derselben Reihenfolge."}
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {eventCaptains.map((c)=>(
                          <div key={c.captain_player_id} className="rounded-2xl border bg-white p-4">
                            <div className="text-xs font-black uppercase text-orange-600">Position {c.draft_position}</div>
                            <div className="mt-1 font-black">{c.club_players?.name||playerById.get(c.captain_player_id)?.name||"Captain"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {eventCaptains.length>0?(
                <>
                  <Card className="rounded-3xl">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-orange-600"/> 2. Spieler wählen</span>
                        <Button size="sm" variant="outline" onClick={()=>void undoPick()} disabled={draftBusy||eventPicks.length===0}><RotateCcw className="mr-2 h-4 w-4"/> Letzten Pick zurück</Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {captainForNextPick?.captain?(
                        <div className="mb-4 rounded-2xl bg-slate-950 p-4 text-white">
                          <div className="text-[10px] font-black uppercase tracking-widest text-orange-300">Nächster Pick · Runde {captainForNextPick.round}</div>
                          <div className="mt-1 text-xl font-black">{captainForNextPick.captain.club_players?.name||"Captain"} wählt jetzt</div>
                        </div>
                      ):null}

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {availablePlayers.map((r)=>(
                          <button key={r.player_id} type="button" disabled={draftBusy} onClick={()=>void makePick(r.player_id)}
                            className="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-orange-300 hover:bg-orange-50 disabled:opacity-50">
                            <div className="font-black">{r.club_players?.name||"Spieler"}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Für aktuellen Captain wählen</div>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 lg:grid-cols-3">
                    {eventCaptains.map((c)=>{
                      const roster=eventPicks.filter((p)=>p.captain_player_id===c.captain_player_id)
                      return (
                        <Card key={c.captain_player_id} className="rounded-3xl">
                          <CardHeader>
                            <CardTitle className="text-base">
                              Team {c.club_players?.name||"Captain"}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-black text-orange-800">Captain · {c.club_players?.name||"Captain"}</div>
                            {roster.map((p)=>(
                              <div key={p.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold">
                                {p.club_players?.name||playerById.get(p.player_id)?.name||"Spieler"}
                                {p.pick_type==="steal"?<span className="ml-2 text-[10px] uppercase text-red-600">Steal</span>:null}
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>

                  <Card className="rounded-3xl border-orange-200 bg-orange-50/40">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-orange-600"/> 3. Draft-Teams für Wettbewerb übernehmen
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-semibold text-slate-600">
                        Erst wenn der Draft fertig ist: daraus werden echte Teams mit Captain und gewählten Spielern erzeugt.
                        Danach erscheinen sie 1:1 im Bereich „Spielmodus & Spielplan“ bei der Mannschaftsauswahl.
                      </p>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="w-full sm:w-[220px]">
                          <Label>Dartart der Teams</Label>
                          <Select value={draftDartType} onValueChange={(v:"edart"|"steeldart")=>setDraftDartType(v)}>
                            <SelectTrigger className="mt-2 bg-white"><SelectValue/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="edart">E-Dart</SelectItem>
                              <SelectItem value="steeldart">Steeldart</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={()=>void buildDraftTeams()} disabled={draftBusy||eventCaptains.length===0} className="h-11 rounded-xl bg-orange-600 font-black hover:bg-orange-700">
                          {draftBusy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Users className="mr-2 h-4 w-4"/>}
                          Teams übernehmen
                        </Button>
                      </div>
                      {linkedEventTeams.length>0?(
                        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {linkedEventTeams.map((t)=>(
                            <div key={t.team_id} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                              <div className="flex items-center gap-2 text-sm font-black text-emerald-800">
                                <CheckCircle2 className="h-4 w-4"/> {t.teams?.name||"Team"}
                              </div>
                              <div className="mt-1 text-xs font-semibold text-emerald-700/70">
                                {t.teams?.dart_type==="steeldart"?"Steeldart":"E-Dart"} · für Spielplan verfügbar
                              </div>
                            </div>
                          ))}
                        </div>
                      ):null}
                    </CardContent>
                  </Card>

                  {selectedEvent.steal_joker_enabled?(
                    <Card className="rounded-3xl border-red-200">
                      <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-red-600"/> 4. Steal-Joker</CardTitle></CardHeader>
                      <CardContent>
                        <p className="mb-4 text-sm font-semibold text-slate-500">
                          Ein Captain darf einmal einen bereits gewählten Spieler eines anderen Teams übernehmen. Dafür muss er einen eigenen gedrafteten Spieler an dieses Team abgeben.
                        </p>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <Label>Captain</Label>
                            <select value={stealCaptainId} onChange={(e)=>{setStealCaptainId(e.target.value);setStealPlayerId("");setReleasePlayerId("")}} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm font-bold">
                              <option value="">Wählen…</option>
                              {eventCaptains.map((c)=><option key={c.captain_player_id} value={c.captain_player_id}>{c.club_players?.name||"Captain"}</option>)}
                            </select>
                          </div>
                          <div>
                            <Label>Spieler stehlen</Label>
                            <select value={stealPlayerId} onChange={(e)=>setStealPlayerId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm font-bold">
                              <option value="">Wählen…</option>
                              {eventPicks.filter((p)=>stealCaptainId&&p.captain_player_id!==stealCaptainId).map((p)=><option key={p.player_id} value={p.player_id}>{p.club_players?.name||"Spieler"}</option>)}
                            </select>
                          </div>
                          <div>
                            <Label>Eigenen Spieler abgeben</Label>
                            <select value={releasePlayerId} onChange={(e)=>setReleasePlayerId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm font-bold">
                              <option value="">Wählen…</option>
                              {eventPicks.filter((p)=>p.captain_player_id===stealCaptainId).map((p)=><option key={p.player_id} value={p.player_id}>{p.club_players?.name||"Spieler"}</option>)}
                            </select>
                          </div>
                        </div>
                        <Button onClick={()=>void useSteal()} disabled={!stealCaptainId||!stealPlayerId||!releasePlayerId||draftBusy||eventJokers.some((j)=>j.captain_player_id===stealCaptainId)} className="mt-4 rounded-xl bg-red-600 font-black hover:bg-red-700">
                          Steal-Joker ausführen
                        </Button>
                      </CardContent>
                    </Card>
                  ):null}
                </>
              ):null}
            </>
          )}
        </TabsContent>

        <TabsContent value="competition" className="mt-5">
          <Card className="mb-5 rounded-3xl border-slate-200">
            <CardContent className="p-4 sm:p-5">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <Label>Veranstaltung auswählen</Label>
                  <Select value={selectedEventId || undefined} onValueChange={setSelectedEventId}>
                    <SelectTrigger className="mt-2 h-12 rounded-xl bg-white">
                      <SelectValue placeholder="Bitte Veranstaltung auswählen"/>
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((e)=>(
                        <SelectItem key={e.id} value={e.id}>
                          {e.title} · {fmtDateRange(e.event_date,e.end_date,e.date_open)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedEvent ? (
                  <Button
                    variant="outline"
                    className="h-12 rounded-xl"
                    onClick={()=>setSelectedEventId("")}
                  >
                    Auswahl ändern
                  </Button>
                ) : null}
              </div>

              {selectedEvent ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedEvent.title}</Badge>
                  <Badge variant="outline">{fmtDateRange(selectedEvent.event_date,selectedEvent.end_date,selectedEvent.date_open)}</Badge>
                  {selectedEvent.draft_enabled ? (
                    <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Captain-Draft</Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Ohne Captain-Draft</Badge>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {!selectedEvent ? (
            <Card className="rounded-3xl border-dashed">
              <CardContent className="p-8 text-center">
                <Trophy className="mx-auto h-10 w-10 text-slate-300"/>
                <div className="mt-3 text-lg font-black text-slate-900">Keine Veranstaltung ausgewählt</div>
                <div className="mt-1 text-sm font-semibold text-slate-500">
                  Wähle oben zuerst die Veranstaltung aus, für die Spielmodus und Spielplan eingerichtet werden sollen.
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
          <div className="mb-5 rounded-3xl border border-orange-200 bg-orange-50/60 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-lg font-black text-orange-950">
              <Trophy className="h-5 w-5 text-orange-600"/> Wettbewerb konfigurieren
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-orange-900/70">
              Spielmodus, Mannschaften, Wertung und Spielplan für diese Veranstaltung festlegen.
            </p>
            {selectedEvent?.draft_enabled && linkedEventTeams.length===0 ? (
              <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-orange-800">
                Captain-Draft ist für diese Veranstaltung aktiviert.
              </div>
            ) : null}
            {linkedEventTeams.length>0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {linkedEventTeams.map((t)=>(
                  <Badge key={t.team_id} className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                    {t.teams?.name||"Team"}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          <MatchReportsTab />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
