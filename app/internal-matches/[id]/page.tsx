"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  Play,
  Radio,
  Save,
  ShieldCheck,
  Swords,
  Users,
  UserRound,
  Crown,
  Shield,
  XCircle,
} from "lucide-react"

type Team = { id:string; name:string; logo_url?:string|null }
type Report = {
  id:string
  scheduled_at:string
  status:string
  home_team_id:string
  away_team_id:string
  home_confirmed_at:string|null
  away_confirmed_at:string|null
  home_team?:Team|null
  away_team?:Team|null
  competition?:{id:string;name:string}|null
  template?:{id:string;name:string;require_final_team_confirmation:boolean;allow_player_repeat:boolean;max_substitutes:number}|null
}
type Game = {
  id:string
  section_name:string
  sort_order:number
  label:string
  game_type:string
  dart_type:string
  mode:string
  mode_source:string
  best_of:number
  home_slots:number
  away_slots:number
  bonus_points:number
  require_result_confirmation:boolean
  home_score:number|null
  away_score:number|null
  status:string
  entered_side:"home"|"away"|null
  dispute_note:string|null
  started_at:string|null
  started_by:string|null
  dice_roll:number|null
  rolled_mode:string|null
  completed_at:string|null
}
type Assignment = {
  game_id:string
  side:"home"|"away"
  slot:number
  player_id:string
  club_players?:{id:string;name:string;photo_url?:string|null}|null
}

type TeamMemberRow = {
  team_id:string
  player_id:string
  role:string|null
  club_players?:{id:string;name:string;photo_url?:string|null}|null
}

type LineupRow = {
  id?:string
  report_id:string
  team_id:string
  player_id:string
  position:number
  is_substitute:boolean
  club_players?:{id:string;name:string;photo_url?:string|null}|null
}

type LineupHeader = {
  report_id:string
  team_id:string
  status:"draft"|"confirmed"
  current_version:number
  confirmed_version:number|null
  confirmed_at:string|null
}

const reportStatusText: Record<string,string> = {
  scheduled:"Geplant",
  live:"Live",
  pending_confirmation:"Bestätigung offen",
  completed:"Abgeschlossen",
  disputed:"Klärung erforderlich",
  cancelled:"Abgesagt",
}

function reportStatusClass(status:string) {
  if (status==="live") return "border-red-400/30 bg-red-500/15 text-red-200"
  if (status==="completed") return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
  if (status==="pending_confirmation") return "border-amber-400/30 bg-amber-500/15 text-amber-100"
  if (status==="disputed") return "border-red-400/30 bg-red-500/15 text-red-200"
  return "border-white/10 bg-white/5 text-white/70"
}

function gameStatusMeta(status:string) {
  if(status==="confirmed") return {label:"Gespeichert", className:"border-emerald-200 bg-emerald-50 text-emerald-700"}
  if(status==="pending_confirmation") return {label:"Bestätigung offen", className:"border-amber-200 bg-amber-50 text-amber-800"}
  if(status==="disputed") return {label:"Klärung", className:"border-red-200 bg-red-50 text-red-700"}
  return {label:"Offen", className:"border-slate-200 bg-slate-50 text-slate-600"}
}

function TeamLogo({team,size="lg"}:{team?:Team|null;size?:"sm"|"lg"}) {
  const wrap = size==="lg" ? "h-16 w-16 sm:h-20 sm:w-20" : "h-11 w-11"
  const text = size==="lg" ? "text-xl" : "text-sm"

  if(team?.logo_url){
    return (
      <div className={`flex ${wrap} shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200 shadow-sm`}>
        <img src={team.logo_url} alt={team.name} className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div className={`flex ${wrap} shrink-0 items-center justify-center rounded-full bg-orange-50 ${text} font-black text-orange-700 ring-1 ring-orange-100`}>
      {(team?.name||"?").slice(0,1).toUpperCase()}
    </div>
  )
}

function PlayerAvatar({
  name,
  photoUrl,
  size="md",
}:{
  name:string
  photoUrl?:string|null
  size?:"sm"|"md"|"lg"
}) {
  const cls =
    size==="lg" ? "h-14 w-14 sm:h-16 sm:w-16" :
    size==="sm" ? "h-9 w-9" :
    "h-11 w-11"

  const text =
    size==="lg" ? "text-lg" :
    size==="sm" ? "text-xs" :
    "text-sm"

  return (
    <div className={`flex ${cls} shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200 shadow-sm`}>
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className={`${text} font-black text-orange-700`}>{(name||"?").slice(0,1).toUpperCase()}</span>
      )}
    </div>
  )
}

export default function InternalMatchDetailPage() {
  const params = useParams<{id:string}>()
  const router = useRouter()
  const id = String(params?.id || "")

  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState("")
  const [message,setMessage]=useState("")
  const [successGameId,setSuccessGameId]=useState("")
  const [report,setReport]=useState<Report|null>(null)
  const [games,setGames]=useState<Game[]>([])
  const [assignments,setAssignments]=useState<Assignment[]>([])
  const [myPlayerId,setMyPlayerId]=useState("")
  const [mySide,setMySide]=useState<"home"|"away"|null>(null)
  const [isLeader,setIsLeader]=useState(false)
  const [scores,setScores]=useState<Record<string,{home:string;away:string}>>({})
  const [disputeNotes,setDisputeNotes]=useState<Record<string,string>>({})
  const [teamMembers,setTeamMembers]=useState<TeamMemberRow[]>([])
  const [lineups,setLineups]=useState<LineupRow[]>([])
  const [lineupHeaders,setLineupHeaders]=useState<LineupHeader[]>([])
  const [draftLineup,setDraftLineup]=useState<LineupRow[]>([])
  const [lineupDirty,setLineupDirty]=useState(false)
  const [lineupSaving,setLineupSaving]=useState(false)
  const [lineupMessage,setLineupMessage]=useState("")
  const [startingMatch,setStartingMatch]=useState(false)
  const [pairingSaving,setPairingSaving]=useState("")
  const [pairingMessage,setPairingMessage]=useState("")
  const [gameStarting,setGameStarting]=useState("")
  const [diceAnimation,setDiceAnimation]=useState<Record<string,{rolling:boolean;value:number;mode:string}>>({})

  const load = useCallback(async(showSpinner=true)=>{
    if(!id)return
    try{
      if(showSpinner)setLoading(true)
      const {data:sessionData}=await supabase.auth.getSession()
      if(!sessionData.session?.user){router.replace("/member-login");return}

      const profileRes=await supabase.from("user_profiles").select("player_id").eq("user_id",sessionData.session.user.id).maybeSingle()
      if(profileRes.error)throw profileRes.error
      const pid=profileRes.data?.player_id || ""
      setMyPlayerId(pid)

      const [r,g]=await Promise.all([
        supabase.from("match_reports").select(`
          id,scheduled_at,status,home_team_id,away_team_id,home_confirmed_at,away_confirmed_at,
          home_team:teams!match_reports_home_team_id_fkey(id,name,logo_url),
          away_team:teams!match_reports_away_team_id_fkey(id,name,logo_url),
          competition:match_report_competitions(id,name),
          template:match_report_templates!match_reports_template_id_fkey(id,name,require_final_team_confirmation,allow_player_repeat,max_substitutes)
        `).eq("id",id).single(),
        supabase.from("match_report_games").select("*").eq("match_report_id",id).order("sort_order"),
      ])
      if(r.error)throw r.error
      if(g.error)throw g.error

      const rep=r.data as any as Report
      setReport(rep)
      const gameRows=(g.data||[]) as Game[]
      setGames(gameRows)
      setScores(Object.fromEntries(gameRows.map(x=>[x.id,{home:x.home_score==null?"":String(x.home_score),away:x.away_score==null?"":String(x.away_score)}])))

      const gameIds=gameRows.map(x=>x.id)
      if(gameIds.length){
        const a=await supabase.from("match_report_game_players").select("game_id,side,slot,player_id,club_players(id,name,photo_url)").in("game_id",gameIds).order("slot")
        if(a.error)throw a.error
        setAssignments((a.data||[]) as any)
      }else setAssignments([])

      const [membersRes,lineupsRes,headersRes]=await Promise.all([
        supabase
          .from("team_members")
          .select("team_id,player_id,role,club_players:club_players!team_members_player_id_fkey(id,name,photo_url)")
          .in("team_id",[rep.home_team_id,rep.away_team_id])
          .is("left_at",null),
        supabase
          .from("match_report_lineups")
          .select("id,report_id,team_id,player_id,position,is_substitute,club_players(id,name,photo_url)")
          .eq("report_id",rep.id)
          .order("position"),
        supabase
          .from("match_report_lineup_headers")
          .select("report_id,team_id,status,current_version,confirmed_version,confirmed_at")
          .eq("report_id",rep.id),
      ])
      if(membersRes.error)throw membersRes.error
      if(lineupsRes.error)throw lineupsRes.error
      if(headersRes.error)throw headersRes.error

      setTeamMembers((membersRes.data||[]) as any)
      const loadedLineups=(lineupsRes.data||[]) as any as LineupRow[]
      setLineups(loadedLineups)
      setLineupHeaders((headersRes.data||[]) as any)

      if(pid){
        const tm=await supabase.from("team_members").select("team_id,role").eq("player_id",pid).is("left_at",null)
        if(tm.error)throw tm.error
        const home=(tm.data||[]).find((x:any)=>x.team_id===rep.home_team_id)
        const away=(tm.data||[]).find((x:any)=>x.team_id===rep.away_team_id)
        const side=home?"home":away?"away":null
        setMySide(side)
        const role=String((home||away)?.role||"").toLowerCase()
        const leader=["captain","co-captain","co captain","kapitän","co-kapitän"].includes(role)
        setIsLeader(leader)
        if(side){
          const myTeamId=side==="home"?rep.home_team_id:rep.away_team_id
          setDraftLineup(loadedLineups.filter((x)=>x.team_id===myTeamId))
          setLineupDirty(false)
        }else{
          setDraftLineup([])
          setLineupDirty(false)
        }
      }else{
        setMySide(null)
        setIsLeader(false)
      }

      setMessage("")
    }catch(e:any){
      setMessage(e?.message||"Spielbericht konnte nicht geladen werden.")
    }finally{
      if(showSpinner)setLoading(false)
    }
  },[id,router])

  useEffect(()=>{void load(true)},[load])

  useEffect(()=>{
    if(!id || !report || !["scheduled","live","pending_confirmation","disputed"].includes(report.status))return

    let refreshTimer:number|undefined
    const queueRefresh=()=>{
      if(refreshTimer)window.clearTimeout(refreshTimer)
      refreshTimer=window.setTimeout(()=>void load(false),250)
    }

    const ch=supabase.channel(`match-report-live-${id}`)
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"match_report_games",filter:`match_report_id=eq.${id}`},queueRefresh)
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"match_reports",filter:`id=eq.${id}`},queueRefresh)
      .on("postgres_changes",{event:"*",schema:"public",table:"match_report_game_players"},(payload:any)=>{
        const row=payload?.new||payload?.old
        if(row?.game_id && games.some((g)=>g.id===row.game_id))queueRefresh()
      })
      .subscribe()

    return()=>{
      if(refreshTimer)window.clearTimeout(refreshTimer)
      void supabase.removeChannel(ch)
    }
  },[id,report?.status,load,games])

  const assignmentRows=(gameId:string,side:"home"|"away")=>
    assignments
      .filter(a=>a.game_id===gameId&&a.side===side)
      .sort((a,b)=>a.slot-b.slot)

  const assignmentNames=(gameId:string,side:"home"|"away")=>
    assignmentRows(gameId,side).map(a=>a.club_players?.name||"Spieler")

  const isAssigned=(gameId:string)=>assignments.some(a=>a.game_id===gameId&&a.player_id===myPlayerId)
  const allConfirmed=games.length>0&&games.every(g=>g.status==="confirmed")
  const grouped=useMemo(()=>{
    const out:Record<string,Game[]>={}
    for(const g of games)(out[g.section_name]||=[]).push(g)
    return out
  },[games])

  const liveScore=useMemo(()=>{
    let home=0,away=0,confirmed=0
    for(const g of games){
      if(g.status!=="confirmed")continue
      confirmed++
      const h=Number(g.home_score??0),a=Number(g.away_score??0)
      if(h>a)home+=1+Number(g.bonus_points||0)
      else if(a>h)away+=1+Number(g.bonus_points||0)
    }
    return {home,away,confirmed,total:games.length}
  },[games])

  function lineupForTeam(teamId:string){
    return lineups
      .filter((x)=>x.team_id===teamId)
      .slice()
      .sort((a,b)=>{
        if(a.is_substitute!==b.is_substitute)return a.is_substitute?1:-1
        return (a.position||0)-(b.position||0)
      })
  }

  function lineupHeaderFor(teamId:string){
    return lineupHeaders.find((h)=>h.team_id===teamId)||null
  }

  function memberRowsFor(teamId:string){
    return teamMembers
      .filter((m)=>m.team_id===teamId)
      .slice()
      .sort((a,b)=>(a.club_players?.name||"").localeCompare(b.club_players?.name||""))
  }

  function setDraftRole(playerId:string,mode:"starter"|"substitute"|"remove"){
    if(!report||!mySide||!isLeader)return
    const myTeamId=mySide==="home"?report.home_team_id:report.away_team_id
    const member=teamMembers.find((m)=>m.team_id===myTeamId&&m.player_id===playerId)
    if(!member)return

    setLineupMessage("")
    setDraftLineup((prev)=>{
      const next=prev.filter((x)=>x.player_id!==playerId)
      if(mode==="remove"){
        setLineupDirty(true)
        return next.map((x)=>x.is_substitute?{...x,position:0}:x)
      }

      if(mode==="substitute"){
        const currentSubs=next.filter((x)=>x.is_substitute).length
        if(currentSubs>=maxSubstitutesAllowed){
          setLineupMessage(`Maximal ${maxSubstitutesAllowed} Auswechselspieler sind erlaubt.`)
          return prev
        }
        next.push({
          report_id:report.id,
          team_id:myTeamId,
          player_id:playerId,
          position:0,
          is_substitute:true,
          club_players:member.club_players||undefined,
        })
      }else{
        const starters=next.filter((x)=>!x.is_substitute)
        next.push({
          report_id:report.id,
          team_id:myTeamId,
          player_id:playerId,
          position:starters.length+1,
          is_substitute:false,
          club_players:member.club_players||undefined,
        })
      }

      const normalizedStarters=next
        .filter((x)=>!x.is_substitute)
        .sort((a,b)=>(a.position||0)-(b.position||0))
        .map((x,i)=>({...x,position:i+1}))
      const subs=next.filter((x)=>x.is_substitute).map((x)=>({...x,position:0}))
      setLineupDirty(true)
      return [...normalizedStarters,...subs]
    })
  }

  async function saveTeamLineup(confirmAfter=false){
    if(!report||!mySide||!isLeader)return
    const myTeamId=mySide==="home"?report.home_team_id:report.away_team_id
    const starters=draftLineup.filter((x)=>!x.is_substitute)
    const subs=draftLineup.filter((x)=>x.is_substitute)

    if(starters.length<1){
      setLineupMessage("Bitte mindestens 1 Stammspieler auswählen.")
      return
    }
    if(subs.length>maxSubstitutesAllowed){
      setLineupMessage(`Maximal ${maxSubstitutesAllowed} Auswechselspieler sind erlaubt.`)
      return
    }

    setLineupSaving(true)
    setLineupMessage("")
    try{
      const payload=draftLineup.map((x)=>({
        player_id:x.player_id,
        position:x.is_substitute?0:x.position,
        is_substitute:x.is_substitute,
      }))

      const save=await supabase.rpc("save_match_report_lineup",{
        p_report_id:report.id,
        p_team_id:myTeamId,
        p_rows:payload,
      })
      if(save.error)throw save.error

      if(confirmAfter){
        const confirm=await supabase.rpc("confirm_match_report_lineup",{
          p_report_id:report.id,
          p_team_id:myTeamId,
        })
        if(confirm.error)throw confirm.error
        setLineupMessage("Aufstellung bestätigt und gespeichert.")
      }else{
        setLineupMessage("Aufstellung gespeichert.")
      }

      setLineupDirty(false)
      await load(false)
    }catch(e:any){
      setLineupMessage(e?.message||"Aufstellung konnte nicht gespeichert werden.")
    }finally{
      setLineupSaving(false)
    }
  }

  function confirmedLineupForSide(side:"home"|"away"){
    if(!report)return []
    const teamId=side==="home"?report.home_team_id:report.away_team_id
    const header=lineupHeaderFor(teamId)
    if(!header || header.status!=="confirmed" || header.confirmed_version!==header.current_version)return []
    return lineupForTeam(teamId)
  }

  function assignmentFor(gameId:string,side:"home"|"away",slot:number){
    return assignments.find((a)=>a.game_id===gameId&&a.side===side&&a.slot===slot)||null
  }

  async function setGamePlayer(game:Game,side:"home"|"away",slot:number,playerId:string){
    if(!report)return
    setPairingSaving(`${game.id}-${side}-${slot}`)
    setPairingMessage("")
    try{
      const {error}=await supabase.rpc("set_match_report_game_player",{
        p_game_id:game.id,
        p_side:side,
        p_slot:slot,
        p_player_id:playerId==="__none__"?null:playerId,
      })
      if(error)throw error
      setPairingMessage("Spielerzuordnung gespeichert.")
      await load(false)
      window.setTimeout(()=>setPairingMessage(""),1800)
    }catch(e:any){
      setPairingMessage(e?.message||"Spielerzuordnung konnte nicht gespeichert werden.")
    }finally{
      setPairingSaving("")
    }
  }

  async function startMatch(){
    if(!report)return
    setStartingMatch(true)
    setMessage("")
    try{
      const {error}=await supabase.rpc("start_match_report",{p_report_id:report.id})
      if(error)throw error
      await load(false)
    }catch(e:any){
      setMessage(e?.message||"Spiel konnte nicht gestartet werden.")
    }finally{
      setStartingMatch(false)
    }
  }

  async function startIndividualGame(game:Game){
    setGameStarting(game.id)
    setMessage("")
    try{
      const {data,error}=await supabase.rpc("start_match_report_game",{p_game_id:game.id})
      if(error)throw error

      const started=(Array.isArray(data)?data[0]:data) as any

      if(started?.dice_roll){
        const faces=["⚀","⚁","⚂","⚃","⚄","⚅"]
        const modeMap:Record<number,string>={
          1:"301 SO",
          2:"301 MO",
          3:"301 DO",
          4:"501 SO",
          5:"501 MO",
          6:"501 DO",
        }

        setDiceAnimation(prev=>({...prev,[game.id]:{
          rolling:true,
          value:Math.floor(Math.random()*6)+1,
          mode:"",
        }}))

        for(let i=0;i<14;i++){
          await new Promise(resolve=>window.setTimeout(resolve,70+i*8))
          const value=Math.floor(Math.random()*6)+1
          setDiceAnimation(prev=>({...prev,[game.id]:{rolling:true,value,mode:modeMap[value]||""}}))
        }

        setDiceAnimation(prev=>({...prev,[game.id]:{
          rolling:false,
          value:Number(started.dice_roll),
          mode:String(started.rolled_mode||modeMap[Number(started.dice_roll)]||""),
        }}))

        await new Promise(resolve=>window.setTimeout(resolve,900))
      }

      await load(false)
    }catch(e:any){
      setMessage(e?.message||"Spiel konnte nicht gestartet werden.")
    }finally{
      setGameStarting("")
    }
  }

  async function submitResult(game:Game){
    const s=scores[game.id]||{home:"",away:""}
    if(s.home===""||s.away===""){
      setMessage("Bitte beide Ergebnisse eingeben.")
      return
    }

    setSaving(game.id)
    setMessage("")
    const {error}=await supabase.rpc("submit_match_report_game_result",{
      p_game_id:game.id,
      p_home_score:Number(s.home),
      p_away_score:Number(s.away),
    })

    if(error){
      setMessage(error.message)
    }else{
      setSuccessGameId(game.id)
      await load(false)
      window.setTimeout(()=>setSuccessGameId(current=>current===game.id?"":current),2200)
    }
    setSaving("")
  }

  async function decision(game:Game,action:"confirm"|"dispute"){
    setSaving(game.id)
    setMessage("")
    const {error}=await supabase.rpc("confirm_match_report_game_result",{
      p_game_id:game.id,
      p_action:action,
      p_note:disputeNotes[game.id]||null,
    })
    if(error)setMessage(error.message)
    else{
      if(action==="confirm"){
        setSuccessGameId(game.id)
        window.setTimeout(()=>setSuccessGameId(current=>current===game.id?"":current),2200)
      }
      await load(false)
    }
    setSaving("")
  }

  async function finalConfirm(){
    if(!report)return
    setSaving("final")
    setMessage("")
    const {error}=await supabase.rpc("confirm_match_report_for_team",{p_report_id:report.id})
    if(error)setMessage(error.message)
    else await load(false)
    setSaving("")
  }

  if(loading)return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-orange-600"/></div>
  if(!report)return <div className="p-8">{message||"Spiel nicht gefunden."}</div>

  const viewerOnly=!mySide
  const maxSubstitutesAllowed=Math.max(0,Number(report.template?.max_substitutes ?? 3))
  const formattedDate=new Date(report.scheduled_at).toLocaleString("de-AT",{timeZone:"Europe/Vienna",weekday:"short",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})

  return(
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f6f7fb] pb-24">
      <Header variant="app" title="Live-Spielbericht" subtitle={report.competition?.name||"Interner Wettbewerb"} backHref="/internal-matches"/>

      <main className="w-full px-4 pt-16 sm:px-6 lg:px-8 xl:px-10">
        <section className="relative overflow-hidden rounded-[24px] bg-slate-950 text-white shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.22),transparent_35%)]" />
          <div className="relative p-4 sm:p-7 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-300">{report.competition?.name||"Interner Wettbewerb"}</div>
                <div className="mt-1 text-sm font-bold text-white/65">{formattedDate}</div>
              </div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${reportStatusClass(report.status)}`}>
                {report.status==="live"?<Radio className="h-3.5 w-3.5 animate-pulse"/>:null}
                {reportStatusText[report.status]||report.status}
              </div>
            </div>

            <div className="mt-7 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-8">
              <div className="flex min-w-0 flex-col items-center text-center">
                <TeamLogo team={report.home_team}/>
                <div className="mt-3 max-w-full text-center text-lg font-black leading-tight break-words sm:text-2xl">{report.home_team?.name||"Heim"}</div>
              </div>

              <div className="flex flex-col items-center">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Zwischenstand</div>
                  <div className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{liveScore.home}<span className="mx-2 text-white/25">:</span>{liveScore.away}</div>
                  <div className="mt-1 text-[11px] font-bold text-white/45">{liveScore.confirmed}/{liveScore.total} bestätigt</div>
                </div>
                <Swords className="mt-3 h-5 w-5 text-orange-400"/>
              </div>

              <div className="flex min-w-0 flex-col items-center text-center">
                <TeamLogo team={report.away_team}/>
                <div className="mt-3 max-w-full text-center text-lg font-black leading-tight break-words sm:text-2xl">{report.away_team?.name||"Gast"}</div>
              </div>
            </div>

            {viewerOnly ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                {report.status==="scheduled" ? (
                  <>
                    <div className="flex items-center justify-center gap-2 text-sm font-black text-white">
                      <Clock3 className="h-4 w-4 text-orange-300"/> Zuschaueransicht · Spiel noch nicht gestartet
                    </div>
                    <div className="mt-1 text-xs font-semibold text-white/50">
                      Geplanter Beginn: {formattedDate}. Die Teamaufstellungen werden erst nach dem Spielstart sichtbar.
                    </div>
                  </>
                ) : report.status==="live" ? (
                  <>
                    <div className="flex items-center justify-center gap-2 text-sm font-black text-white">
                      <Radio className="h-4 w-4 animate-pulse text-red-400"/> Zuschaueransicht · Spiel läuft live
                    </div>
                    <div className="mt-1 text-xs font-semibold text-white/50">
                      Ergebnisse und Spielstatus werden automatisch aktualisiert.
                    </div>
                  </>
                ) : report.status==="completed" ? (
                  <>
                    <div className="flex items-center justify-center gap-2 text-sm font-black text-white">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400"/> Zuschaueransicht · Spiel abgeschlossen
                    </div>
                    <div className="mt-1 text-xs font-semibold text-white/50">
                      Du siehst den finalen Spielbericht und alle Ergebnisse.
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-white/65">
                    <Eye className="h-4 w-4 text-orange-300"/> Zuschaueransicht
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>

        {message?<div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{message}</div>:null}

        {(report.status!=="scheduled" || isLeader) ? (
        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">Vor dem Spiel</div>
              <h2 className="mt-1 text-xl font-black text-slate-950">Teamaufstellungen</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {report.status==="scheduled" && isLeader
                  ? <>Eigene Aufstellung festlegen. Die gegnerische Aufstellung wird erst nach dem Spielstart sichtbar.</>
                  : <>Aufstellungen dieser Begegnung.</>}
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {[report.home_team_id,report.away_team_id].map((teamId)=>{
              const team=teamId===report.home_team_id?report.home_team:report.away_team
              const header=lineupHeaderFor(teamId)
              const saved=lineupForTeam(teamId)
              const isMine=Boolean(mySide && teamId===(mySide==="home"?report.home_team_id:report.away_team_id))
              const opponentHidden=report.status==="scheduled" && !isMine
              const editable=Boolean(isMine&&isLeader&&report.status==="scheduled")
              const visibleRows=editable?draftLineup:saved
              const starters=visibleRows.filter((x)=>!x.is_substitute).sort((a,b)=>(a.position||0)-(b.position||0))
              const subs=visibleRows.filter((x)=>x.is_substitute)

              return (
                <article key={teamId} className="overflow-hidden rounded-[20px] bg-white shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <TeamLogo team={team} size="sm"/>
                      <div className="min-w-0">
                        <div className="font-black leading-tight text-slate-950 break-words">{team?.name||"Team"}</div>
                        <div className="mt-0.5 text-xs font-bold text-slate-400">
                          {header?.status==="confirmed"?"Aufstellung bestätigt":"Aufstellung offen"}
                        </div>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${header?.status==="confirmed"?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}>
                      {header?.status==="confirmed"?"Bestätigt":"Entwurf"}
                    </span>
                  </div>

                  <div className="p-4">
                    {opponentHidden ? (
                      <div className="flex min-h-[190px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 text-center">
                        <Shield className="h-7 w-7 text-slate-400" />
                        <div className="mt-3 text-base font-black text-slate-900">Aufstellung verborgen</div>
                        <div className="mt-1 max-w-sm text-sm font-semibold text-slate-500">
                          Die gegnerische Aufstellung wird erst nach dem Spielstart sichtbar.
                        </div>
                        <div className="mt-3 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
                          {header?.status==="confirmed" ? "Aufstellung bestätigt" : "Aufstellung noch offen"}
                        </div>
                      </div>
                    ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                          <Users className="h-4 w-4"/> Stammspieler
                        </div>
                        <div className="space-y-2">
                          {starters.length?starters.map((x,i)=>(
                            <div key={x.player_id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">{i+1}</div>
                              <PlayerAvatar
                                name={x.club_players?.name||teamMembers.find((m)=>m.player_id===x.player_id)?.club_players?.name||"Spieler"}
                                photoUrl={x.club_players?.photo_url||teamMembers.find((m)=>m.player_id===x.player_id)?.club_players?.photo_url}
                                size="sm"
                              />
                              <div className="min-w-0 truncate text-sm font-black text-slate-900">{x.club_players?.name||teamMembers.find((m)=>m.player_id===x.player_id)?.club_players?.name||"Spieler"}</div>
                            </div>
                          )):<div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs font-semibold text-slate-400">Noch keine Stammspieler</div>}
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                          <Shield className="h-4 w-4"/> Auswechselspieler {subs.length}/{maxSubstitutesAllowed}
                        </div>
                        <div className="space-y-2">
                          {subs.length?subs.map((x,i)=>(
                            <div key={x.player_id} className="flex items-center gap-3 rounded-xl bg-orange-50 px-3 py-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-xs font-black text-orange-700">E{i+1}</div>
                              <PlayerAvatar
                                name={x.club_players?.name||teamMembers.find((m)=>m.player_id===x.player_id)?.club_players?.name||"Spieler"}
                                photoUrl={x.club_players?.photo_url||teamMembers.find((m)=>m.player_id===x.player_id)?.club_players?.photo_url}
                                size="sm"
                              />
                              <div className="min-w-0 truncate text-sm font-black text-slate-900">{x.club_players?.name||teamMembers.find((m)=>m.player_id===x.player_id)?.club_players?.name||"Spieler"}</div>
                            </div>
                          )):<div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs font-semibold text-slate-400">Keine Auswechselspieler</div>}
                        </div>
                      </div>
                    </div>
                    )}

                    {editable?(
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <div className="mb-3">
                          <div className="text-sm font-black text-slate-950">Aufstellung bearbeiten</div>
                          <div className="mt-1 text-xs font-semibold text-slate-400">Nur Captain / Co-Captain deines Teams können Änderungen speichern.</div>
                        </div>

                        <div className="grid gap-2 md:grid-cols-2">
                          {memberRowsFor(teamId).map((m)=>{
                            const current=draftLineup.find((x)=>x.player_id===m.player_id)
                            return (
                              <div key={m.player_id} className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-2.5">
                                    <PlayerAvatar name={m.club_players?.name||"Spieler"} photoUrl={m.club_players?.photo_url} size="sm" />
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-black text-slate-900">{m.club_players?.name||"Spieler"}</div>
                                      {m.role?<div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{m.role}</div>:null}
                                    </div>
                                  </div>
                                  {current?<span className={`rounded-full px-2 py-1 text-[10px] font-black ${current.is_substitute?"bg-orange-100 text-orange-700":"bg-emerald-100 text-emerald-700"}`}>{current.is_substitute?"Ersatz":"Stamm"}</span>:null}
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  <Button type="button" size="sm" variant={current&&!current.is_substitute?"default":"outline"} className="h-9 text-xs font-black" onClick={()=>setDraftRole(m.player_id,"starter")}>Stamm</Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={current?.is_substitute?"default":"outline"}
                                    className="h-9 text-xs font-black"
                                    disabled={maxSubstitutesAllowed===0 || (!current?.is_substitute && draftLineup.filter((x)=>x.is_substitute).length>=maxSubstitutesAllowed)}
                                    onClick={()=>setDraftRole(m.player_id,"substitute")}
                                  >
                                    Ersatz
                                  </Button>
                                  <Button type="button" size="sm" variant="ghost" className="h-9 text-xs font-black text-slate-500" onClick={()=>setDraftRole(m.player_id,"remove")}>Raus</Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {lineupMessage?(
                          <div className={`mt-3 rounded-xl px-3 py-2.5 text-sm font-bold ${lineupMessage.includes("gespeichert")||lineupMessage.includes("bestätigt")?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-800"}`}>
                            {lineupMessage}
                          </div>
                        ):null}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button type="button" variant="outline" className="font-black" disabled={lineupSaving||!lineupDirty} onClick={()=>void saveTeamLineup(false)}>
                            {lineupSaving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Save className="mr-2 h-4 w-4"/>}
                            Aufstellung speichern
                          </Button>
                          <Button type="button" className="bg-orange-600 font-black hover:bg-orange-700" disabled={lineupSaving||starters.length<1} onClick={()=>void saveTeamLineup(true)}>
                            <CheckCircle2 className="mr-2 h-4 w-4"/> Speichern & bestätigen
                          </Button>
                        </div>
                      </div>
                    ):null}

                    {isMine&&isLeader&&report.status!=="scheduled"?(
                      <div className="mt-4 rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-500">
                        <Clock3 className="mr-1 inline h-4 w-4"/> Aufstellung gesperrt · Änderungen sind nach dem Spielstart nicht mehr möglich.
                      </div>
                    ):null}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        ) : null}

        {report.status==="scheduled" && isLeader ? (
          <section className="mt-5 overflow-hidden rounded-[20px] bg-white shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">Vor dem Spiel</div>
              <div className="mt-1 text-lg font-black text-slate-950">Spielpaarungen festlegen</div>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Nach bestätigter Teamaufstellung ordnet Captain / Co-Captain die eigenen Spieler den einzelnen Spielen zu. Ersatzspieler dürfen ebenfalls eingesetzt werden.
              </p>
            </div>

            <div className="grid gap-3 p-4 xl:grid-cols-2 sm:p-5">
              {games.map((game)=>{
                const ownSide=mySide
                const ownSlots=ownSide==="home"?game.home_slots:ownSide==="away"?game.away_slots:0
                const ownLineup=ownSide?confirmedLineupForSide(ownSide):[]
                const editable=Boolean(isLeader&&ownSide&&ownSlots>0)
                const ownTeam=ownSide==="home"?report.home_team:report.away_team

                return (
                  <div key={`pairing-${game.id}`} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-black text-slate-950">{game.label}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-400">
                          {game.game_type==="single"?"Einzel":game.game_type==="double"?"Doppel":"Teamspiel"} · {ownSlots} {ownSlots===1?"Spieler":"Spieler"}
                        </div>
                      </div>
                      {ownTeam?<div className="flex items-center gap-2"><TeamLogo team={ownTeam} size="sm"/><span className="hidden text-xs font-black leading-tight text-slate-600 sm:inline">{ownTeam.name}</span></div>:null}
                    </div>

                    {!ownSide?(
                      <div className="mt-3 rounded-xl bg-white px-3 py-3 text-sm font-semibold text-slate-400">
                        Zuschauer können die Paarungen nach Spielstart sehen.
                      </div>
                    ):ownLineup.length===0?(
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-bold text-amber-800">
                        Eigene Aufstellung zuerst bestätigen.
                      </div>
                    ):(
                      <div className="mt-3 space-y-2">
                        {Array.from({length:ownSlots},(_,i)=>i+1).map((slot)=>{
                          const current=assignmentFor(game.id,ownSide,slot)
                          const key=`${game.id}-${ownSide}-${slot}`
                          return (
                            <div key={key} className="grid gap-2 sm:grid-cols-[90px_1fr] sm:items-center">
                              <div className="text-xs font-black uppercase tracking-wide text-slate-400">Slot {slot}</div>
                              <Select
                                value={current?.player_id||"__none__"}
                                onValueChange={(value)=>void setGamePlayer(game,ownSide,slot,value)}
                                disabled={!editable||pairingSaving===key}
                              >
                                <SelectTrigger className="h-11 rounded-xl bg-white">
                                  <SelectValue placeholder="Spieler auswählen"/>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Nicht zugeordnet</SelectItem>
                                  {ownLineup.map((l)=>{
                                    const m=teamMembers.find((x)=>x.player_id===l.player_id)
                                    const name=l.club_players?.name||m?.club_players?.name||"Spieler"
                                    return (
                                      <SelectItem key={l.player_id} value={l.player_id}>
                                        {name}{l.is_substitute?" · Ersatz":""}
                                      </SelectItem>
                                    )
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {pairingMessage?(
              <div className={`mx-4 mb-4 rounded-xl px-3 py-2.5 text-sm font-bold sm:mx-5 sm:mb-5 ${pairingMessage.includes("gespeichert")?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-800"}`}>
                {pairingMessage}
              </div>
            ):null}
          </section>
        ) : null}

        {report.status==="scheduled" ? (
          <section className="mt-5 rounded-[20px] bg-slate-950 p-4 text-white shadow-[0_8px_30px_rgba(15,23,42,0.14)] sm:p-5">
            {isLeader ? (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-300">Spielstart</div>
                  <div className="mt-1 text-lg font-black">Mannschaftsspiel starten</div>
                  <div className="mt-1 text-sm font-semibold text-white/55">
                    Sobald beide Aufstellungen bestätigt und alle Spielpaarungen vollständig sind, kannst du die Begegnung starten.
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={()=>void startMatch()}
                  disabled={startingMatch}
                  className="h-11 shrink-0 rounded-xl bg-orange-600 px-5 font-black hover:bg-orange-700"
                >
                  {startingMatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
                  Spiel starten
                </Button>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Clock3 className="h-5 w-5 text-orange-300"/>
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-300">
                    Noch nicht gestartet
                  </div>
                  <div className="mt-1 text-lg font-black">
                    {viewerOnly ? "Diese Begegnung wartet auf den Spielstart" : "Deine Begegnung wartet auf den Spielstart"}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white/55">
                    Geplanter Beginn: {formattedDate}. Captain oder Co-Captain startet die Begegnung, sobald alles bereit ist.
                  </div>
                </div>
              </div>
            )}
          </section>
        ) : null}

        <div className="mt-6 space-y-7">
          {Object.entries(grouped).map(([section,sectionGames])=>(
            <section key={section}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">{section}</div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-500">{sectionGames.length} {sectionGames.length===1?"Spiel":"Spiele"}</div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {sectionGames.map(game=>{
                  const homeAssignments=assignmentRows(game.id,"home")
                  const awayAssignments=assignmentRows(game.id,"away")
                  const homeNames=homeAssignments.map(a=>a.club_players?.name||"Spieler")
                  const awayNames=awayAssignments.map(a=>a.club_players?.name||"Spieler")
                  const canEnter=report.status==="live"&&Boolean(game.started_at)&&(isAssigned(game.id)||isLeader)
                  const canConfirm=report.status==="live"&&Boolean(game.started_at)&&game.status==="pending_confirmation"&&mySide&&game.entered_side!==mySide&&(isAssigned(game.id)||isLeader)
                  const meta=game.started_at&&game.status==="open"
                    ? {label:"LIVE",className:"border-red-200 bg-red-50 text-red-700"}
                    : gameStatusMeta(game.status)
                  const justSaved=successGameId===game.id
                  const hasResult=game.home_score!==null&&game.away_score!==null
                  const canStartGame=report.status==="live"&&!game.started_at&&game.status==="open"&&(isAssigned(game.id)||isLeader)

                  return (
                    <article key={game.id} className={`relative overflow-hidden rounded-[20px] bg-white shadow-[0_6px_24px_rgba(15,23,42,0.06)] transition ${game.status==="disputed"?"outline outline-1 outline-red-300":""}`}>
                      <div className={`absolute inset-y-0 left-0 w-1.5 ${game.status==="confirmed"?"bg-emerald-500":game.status==="pending_confirmation"?"bg-amber-400":game.status==="disputed"?"bg-red-500":game.started_at?"bg-red-500":"bg-orange-500"}`} />
                      <div className="p-4 pl-5 sm:p-5 sm:pl-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-black text-slate-950">{game.label}</div>
                            <div className="mt-1 flex flex-wrap gap-1.5 text-xs font-bold text-slate-500">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1">{game.dart_type==="edart"?"E-Dart":game.dart_type==="steeldart"?"Steeldart":"Dart"}</span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                {game.mode_source==="dice"
                                  ? game.started_at
                                    ? `${game.rolled_mode||game.mode}${game.dice_roll?` · Würfel ${game.dice_roll}`:""}`
                                    : "Modus wird beim Start gewürfelt"
                                  : game.mode}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1">Best of {game.best_of}</span>
                              {game.bonus_points?<span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">+{game.bonus_points} Sonderpunkte</span>:null}
                            </div>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${meta.className}`}>{meta.label}</span>
                        </div>

                        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <div className="min-w-0">
                            <div className="mb-2 text-center text-[10px] font-black uppercase tracking-wide text-slate-400">Heim</div>
                            {homeAssignments.length ? (
                              <div className="flex flex-wrap justify-center gap-2">
                                {homeAssignments.map((a)=>(
                                  <div key={`${game.id}-home-${a.player_id}-${a.slot}`} className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2">
                                    <PlayerAvatar name={a.club_players?.name||"Spieler"} photoUrl={a.club_players?.photo_url} size="sm" />
                                    <span className="max-w-[150px] truncate text-xs font-black text-slate-950 sm:text-sm">{a.club_players?.name||"Spieler"}</span>
                                  </div>
                                ))}
                              </div>
                            ) : <div className="text-center text-sm font-bold text-slate-400">Nicht aufgestellt</div>}
                          </div>

                          <div className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-400">VS</div>

                          <div className="min-w-0">
                            <div className="mb-2 text-center text-[10px] font-black uppercase tracking-wide text-slate-400">Gast</div>
                            {awayAssignments.length ? (
                              <div className="flex flex-wrap justify-center gap-2">
                                {awayAssignments.map((a)=>(
                                  <div key={`${game.id}-away-${a.player_id}-${a.slot}`} className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2">
                                    <PlayerAvatar name={a.club_players?.name||"Spieler"} photoUrl={a.club_players?.photo_url} size="sm" />
                                    <span className="max-w-[150px] truncate text-xs font-black text-slate-950 sm:text-sm">{a.club_players?.name||"Spieler"}</span>
                                  </div>
                                ))}
                              </div>
                            ) : <div className="text-center text-sm font-bold text-slate-400">Nicht aufgestellt</div>}
                          </div>
                        </div>

                        {report.status==="scheduled" && !isLeader ? (
                          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                              <Clock3 className="h-4 w-4 text-orange-500"/> Noch nicht gestartet
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              Aufstellungen, Paarungen und Live-Ergebnisse werden mit dem Spielstart freigegeben.
                            </div>
                          </div>
                        ) : null}

                        {!game.started_at&&report.status==="live"?(
                          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="text-sm font-black text-slate-950">Einzelspiel noch nicht gestartet</div>
                                <div className="mt-1 text-xs font-semibold text-slate-500">
                                  Erst nach dem Start wird dieses Spiel in der Live-Ansicht als aktiv markiert und die Ergebniseingabe freigeschaltet.
                                </div>
                              </div>
                              {canStartGame?(
                                <Button
                                  type="button"
                                  onClick={()=>void startIndividualGame(game)}
                                  disabled={gameStarting===game.id}
                                  className="h-11 shrink-0 rounded-xl bg-orange-600 px-5 font-black hover:bg-orange-700"
                                >
                                  {gameStarting===game.id?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Play className="mr-2 h-4 w-4"/>}
                                  Spiel starten
                                </Button>
                              ):(
                                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500">
                                  Start durch Spieler / Teamleitung
                                </span>
                              )}
                            </div>
                          </div>
                        ):null}

                        {diceAnimation[game.id]?(
                          <div className="mt-5 overflow-hidden rounded-2xl bg-slate-950 p-5 text-center text-white shadow-lg">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">Würfelmodus</div>
                            <div className={`mt-3 text-7xl leading-none ${diceAnimation[game.id].rolling?"animate-bounce":""}`}>
                              {["⚀","⚁","⚂","⚃","⚄","⚅"][Math.max(0,Math.min(5,diceAnimation[game.id].value-1))]}
                            </div>
                            <div className="mt-3 text-xl font-black">
                              {diceAnimation[game.id].rolling?"Würfeln…":diceAnimation[game.id].mode}
                            </div>
                            {!diceAnimation[game.id].rolling?(
                              <div className="mt-1 text-sm font-semibold text-white/55">
                                Gewürfelt: {diceAnimation[game.id].value}
                              </div>
                            ):null}
                          </div>
                        ):null}

                        {game.started_at&&game.status==="open"?(
                          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-sm font-black text-red-700">
                              <Radio className="h-4 w-4 animate-pulse"/> Dieses Spiel läuft live
                            </div>
                            <div className="text-xs font-bold text-red-500">
                              Start {new Date(game.started_at).toLocaleTimeString("de-AT",{timeZone:"Europe/Vienna",hour:"2-digit",minute:"2-digit"})}
                            </div>
                          </div>
                        ):null}

                        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                          {report.status==="completed" || game.status==="confirmed" ? (
                            <div className="text-center">
                              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Endergebnis</div>
                              <div className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                                {game.home_score ?? 0}<span className="mx-3 text-slate-300">:</span>{game.away_score ?? 0}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-3">
                              <Input
                                aria-label="Heimergebnis"
                                className="h-14 w-24 rounded-2xl border-slate-200 bg-white text-center text-2xl font-black shadow-sm focus-visible:ring-orange-300"
                                inputMode="numeric"
                                value={scores[game.id]?.home||""}
                                onChange={e=>setScores(prev=>({...prev,[game.id]:{...(prev[game.id]||{home:"",away:""}),home:e.target.value.replace(/\D/g,"")}}))}
                                disabled={!canEnter}
                              />
                              <span className="text-xl font-black text-slate-300">:</span>
                              <Input
                                aria-label="Gastergebnis"
                                className="h-14 w-24 rounded-2xl border-slate-200 bg-white text-center text-2xl font-black shadow-sm focus-visible:ring-orange-300"
                                inputMode="numeric"
                                value={scores[game.id]?.away||""}
                                onChange={e=>setScores(prev=>({...prev,[game.id]:{...(prev[game.id]||{home:"",away:""}),away:e.target.value.replace(/\D/g,"")}}))}
                                disabled={!canEnter}
                              />
                            </div>
                          )}

                          {report.status!=="completed" && report.status!=="live" && isLeader ? (
                            <div className="mt-3 rounded-xl bg-slate-100 px-3 py-2.5 text-center text-xs font-bold text-slate-500">
                              Das Mannschaftsspiel muss zuerst gestartet werden.
                            </div>
                          ) : report.status==="live" && !game.started_at && (isAssigned(game.id)||isLeader) ? (
                            <div className="mt-3 rounded-xl bg-slate-100 px-3 py-2.5 text-center text-xs font-bold text-slate-500">
                              Dieses Spiel zuerst starten.
                            </div>
                          ) : null}

                          {canEnter&&game.status!=="confirmed"?(
                            <Button
                              className="mt-3 h-11 w-full rounded-xl bg-slate-950 font-black hover:bg-slate-800"
                              onClick={()=>void submitResult(game)}
                              disabled={saving===game.id}
                            >
                              {saving===game.id?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Save className="mr-2 h-4 w-4"/>}
                              {game.status==="disputed"?"Korrigiertes Ergebnis speichern":"Ergebnis speichern"}
                            </Button>
                          ):null}

                          {justSaved?(
                            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-black text-emerald-700">
                              <Check className="h-4 w-4"/> Ergebnis wurde gespeichert
                            </div>
                          ):null}

                          {viewerOnly&&hasResult&&["live","pending_confirmation","disputed"].includes(report.status)?(
                            <div className="mt-3 text-center text-xs font-semibold text-slate-500">Live-Ergebnis · automatisch aktualisiert</div>
                          ):null}
                        </div>

                        {canConfirm?(
                          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
                            <div className="font-black text-amber-950">Ergebnis bestätigen?</div>
                            <div className="mt-1 text-xs font-semibold text-amber-800/70">Die Gegenseite hat dieses Ergebnis eingetragen.</div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <Button className="bg-emerald-600 font-black hover:bg-emerald-700" onClick={()=>void decision(game,"confirm")} disabled={saving===game.id}>
                                <CheckCircle2 className="mr-2 h-4 w-4"/>Bestätigen
                              </Button>
                              <Button variant="destructive" className="font-black" onClick={()=>void decision(game,"dispute")} disabled={saving===game.id}>
                                <XCircle className="mr-2 h-4 w-4"/>Beanstanden
                              </Button>
                            </div>
                            <Textarea className="mt-2 bg-white" placeholder="Optional: kurze Begründung bei Beanstandung" value={disputeNotes[game.id]||""} onChange={e=>setDisputeNotes(prev=>({...prev,[game.id]:e.target.value}))}/>
                          </div>
                        ):null}

                        {game.status==="disputed"?(
                          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                            <AlertTriangle className="mr-1 inline h-4 w-4"/>Klärung erforderlich{game.dispute_note?`: ${game.dispute_note}`:""}
                          </div>
                        ):null}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {!report.template?.require_final_team_confirmation && report.status!=="completed" ? (
          <div className="mt-7 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4"/> Dieser Wettbewerb wird automatisch abgeschlossen, sobald alle Spiele bestätigt sind.
          </div>
        ) : null}

        {report.template?.require_final_team_confirmation ? (
        <section className="mt-7 overflow-hidden rounded-[20px] bg-white shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2 font-black text-slate-950"><ShieldCheck className="h-5 w-5 text-orange-600"/>Spielbericht abschließen</div>
            <p className="mt-1 text-sm font-semibold text-slate-500">Diese Vorlage verlangt eine Endbestätigung. Sobald alle Spiele bestätigt sind, bestätigen Captain / Co-Captain den gesamten Spielbericht.</p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`rounded-2xl border p-4 ${report.home_confirmed_at?"border-emerald-200 bg-emerald-50":"border-slate-200 bg-white"}`}>
                <div className="flex items-center gap-3">
                  <TeamLogo team={report.home_team} size="sm"/>
                  <div>
                    <div className="font-black">{report.home_team?.name}</div>
                    <div className={`mt-0.5 text-xs font-bold ${report.home_confirmed_at?"text-emerald-700":"text-slate-400"}`}>{report.home_confirmed_at?"Bestätigt":"Noch offen"}</div>
                  </div>
                </div>
              </div>
              <div className={`rounded-2xl border p-4 ${report.away_confirmed_at?"border-emerald-200 bg-emerald-50":"border-slate-200 bg-white"}`}>
                <div className="flex items-center gap-3">
                  <TeamLogo team={report.away_team} size="sm"/>
                  <div>
                    <div className="font-black">{report.away_team?.name}</div>
                    <div className={`mt-0.5 text-xs font-bold ${report.away_confirmed_at?"text-emerald-700":"text-slate-400"}`}>{report.away_confirmed_at?"Bestätigt":"Noch offen"}</div>
                  </div>
                </div>
              </div>
            </div>

            {isLeader&&allConfirmed&&((mySide==="home"&&!report.home_confirmed_at)||(mySide==="away"&&!report.away_confirmed_at))?(
              <Button className="mt-4 h-11 rounded-xl bg-orange-600 font-black hover:bg-orange-700" onClick={()=>void finalConfirm()} disabled={saving==="final"}>
                {saving==="final"?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<ShieldCheck className="mr-2 h-4 w-4"/>}
                Spielbericht für mein Team bestätigen
              </Button>
            ):null}

            {!allConfirmed?(
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-500">
                <Clock3 className="h-4 w-4"/> Noch nicht alle Spiele bestätigt.
              </div>
            ):null}
          </div>
        </section>
        ) : null}
      </main>

      <MobileBottomNav/>
    </div>
  )
}
