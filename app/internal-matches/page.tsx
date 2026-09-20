"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { CalendarDays, ChevronRight, Loader2, Radio, Swords, Trophy, Users } from "lucide-react"

type Team = { id:string; name:string; logo_url?:string|null }
type Competition = {
  id:string
  name:string
  competition_type?:string|null
  points_win?:number|null
  points_draw?:number|null
  points_loss?:number|null
}
type Report = {
  id:string
  competition_id:string|null
  scheduled_at:string
  status:string
  home_team_id:string
  away_team_id:string
  home_team?:Team|null
  away_team?:Team|null
  competition?:Competition|null
}
type Game = {
  id:string
  match_report_id:string
  home_score:number|null
  away_score:number|null
  bonus_points:number
  status:string
}
type CompetitionTeam = {
  competition_id:string
  team_id:string
  team?:Team|null
}

type GamePlayer = {
  game_id:string
  side:"home"|"away"
  player_id:string
  club_players?:{id:string;name:string;photo_url?:string|null}|null
}

const statusText:Record<string,string>={
  scheduled:"Geplant",
  live:"LIVE",
  pending_confirmation:"Bestätigung offen",
  completed:"Abgeschlossen",
  disputed:"Klärung",
  cancelled:"Abgesagt",
}

function TeamMark({team}:{team?:Team|null}) {
  if(team?.logo_url){
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200 shadow-sm">
        <img
          src={team.logo_url}
          alt={team.name}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-sm font-black text-orange-700 ring-1 ring-orange-100">
      {(team?.name||"?").slice(0,1).toUpperCase()}
    </div>
  )
}

function PlayerMark({name,photoUrl}:{name:string;photoUrl?:string|null}) {
  if(photoUrl){
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200 shadow-sm">
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-sm font-black text-orange-700 ring-1 ring-orange-100">
      {(name||"?").slice(0,1).toUpperCase()}
    </div>
  )
}

function StatusPill({status}:{status:string}) {
  const cls=status==="live"
    ?"border-red-200 bg-red-50 text-red-700"
    :status==="completed"
      ?"border-emerald-200 bg-emerald-50 text-emerald-700"
      :status==="pending_confirmation"
        ?"border-amber-200 bg-amber-50 text-amber-700"
        :status==="disputed"
          ?"border-red-200 bg-red-50 text-red-700"
          :"border-slate-200 bg-slate-50 text-slate-600"
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${cls}`}>{status==="live"?<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600"/>:null}{statusText[status]||status}</span>
}

export default function InternalMatchesPage() {
  const router=useRouter()
  const [loading,setLoading]=useState(true)
  const [reports,setReports]=useState<Report[]>([])
  const [games,setGames]=useState<Game[]>([])
  const [competitionTeams,setCompetitionTeams]=useState<CompetitionTeam[]>([])
  const [gamePlayers,setGamePlayers]=useState<GamePlayer[]>([])
  const [myTeamIds,setMyTeamIds]=useState<string[]>([])
  const [message,setMessage]=useState("")
  const [tableCompetitionId,setTableCompetitionId]=useState("")
  const [standingsView,setStandingsView]=useState<"teams"|"players">("teams")
  const [scheduleView,setScheduleView]=useState<"mine"|"all">("mine")

  useEffect(()=>{
    const run=async()=>{
      const {data:sessionData}=await supabase.auth.getSession()
      if(!sessionData.session?.user){router.replace("/member-login");return}

      try{
        setLoading(true)

        const {data:profile,error:profileError}=await supabase
          .from("user_profiles").select("player_id").eq("user_id",sessionData.session.user.id).maybeSingle()
        if(profileError)throw profileError

        if(profile?.player_id){
          const {data:memberships,error:teamError}=await supabase
            .from("team_members").select("team_id").eq("player_id",profile.player_id).is("left_at",null)
          if(teamError)throw teamError
          setMyTeamIds((memberships||[]).map((x:any)=>x.team_id).filter(Boolean))
        }

        const [reportRes,compTeamsRes]=await Promise.all([
          supabase.from("match_reports").select(`
            id,competition_id,scheduled_at,status,home_team_id,away_team_id,
            home_team:teams!match_reports_home_team_id_fkey(id,name,logo_url),
            away_team:teams!match_reports_away_team_id_fkey(id,name,logo_url),
            competition:match_report_competitions(id,name,competition_type,points_win,points_draw,points_loss)
          `).order("scheduled_at",{ascending:true}),
          supabase.from("match_report_competition_teams")
            .select("competition_id,team_id,team:teams(id,name,logo_url)")
            .order("sort_order"),
        ])
        if(reportRes.error)throw reportRes.error
        if(compTeamsRes.error)throw compTeamsRes.error

        const rows=(reportRes.data||[]) as any as Report[]
        setReports(rows)
        setCompetitionTeams((compTeamsRes.data||[]) as any)

        const ids=rows.map(r=>r.id)
        if(ids.length){
          const gr=await supabase.from("match_report_games")
            .select("id,match_report_id,home_score,away_score,bonus_points,status")
            .in("match_report_id",ids)
          if(gr.error)throw gr.error
          const loadedGames=(gr.data||[]) as Game[]
          setGames(loadedGames)

          const gameIds=loadedGames.map((g)=>g.id)
          if(gameIds.length){
            const gpr=await supabase
              .from("match_report_game_players")
              .select("game_id,side,player_id,club_players(id,name,photo_url)")
              .in("game_id",gameIds)
            if(gpr.error)throw gpr.error
            setGamePlayers((gpr.data||[]) as any)
          }else{
            setGamePlayers([])
          }
        }else{
          setGames([])
          setGamePlayers([])
        }
      }catch(e:any){
        setMessage(e?.message||"Interne Spiele konnten nicht geladen werden.")
      }finally{
        setLoading(false)
      }
    }
    void run()
  },[router])

  const now=Date.now()
  const liveReports=useMemo(()=>reports.filter(r=>r.status==="live"||r.status==="pending_confirmation"),[reports])
  const upcoming=useMemo(()=>reports.filter(r=>r.status==="scheduled"&&new Date(r.scheduled_at).getTime()>=now-12*3600000),[reports,now])
  const completed=useMemo(()=>reports.filter(r=>r.status==="completed").slice().sort((a,b)=>b.scheduled_at.localeCompare(a.scheduled_at)),[reports])
  const allSchedule=useMemo(
    ()=>reports
      .filter(r=>r.status==="scheduled"||r.status==="live"||r.status==="pending_confirmation")
      .slice()
      .sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at)),
    [reports],
  )

  const mySchedule=useMemo(
    ()=>allSchedule.filter(r=>myTeamIds.includes(r.home_team_id)||myTeamIds.includes(r.away_team_id)),
    [allSchedule,myTeamIds],
  )

  function scoreFor(reportId:string){
    const gs=games.filter(g=>g.match_report_id===reportId&&g.status==="confirmed")
    let home=0,away=0
    for(const g of gs){
      const h=Number(g.home_score??0),a=Number(g.away_score??0)
      if(h>a)home+=1+Number(g.bonus_points||0)
      else if(a>h)away+=1+Number(g.bonus_points||0)
    }
    return {home,away,confirmed:gs.length,total:games.filter(g=>g.match_report_id===reportId).length}
  }

  const competitions=useMemo(()=>{
    const map=new Map<string,Competition>()
    for(const r of reports)if(r.competition_id&&r.competition)map.set(r.competition_id,r.competition)
    return [...map.values()]
  },[reports])

  function standingsFor(competitionId:string){
    const comp=competitions.find(c=>c.id===competitionId)
    const rows=competitionTeams.filter(t=>t.competition_id===competitionId).map(t=>({
      teamId:t.team_id,
      team:t.team,
      played:0,wins:0,draws:0,losses:0,scored:0,conceded:0,points:0,
    }))
    const map=new Map(rows.map(r=>[r.teamId,r]))

    for(const r of reports.filter(r=>r.competition_id===competitionId&&r.status==="completed")){
      const s=scoreFor(r.id)
      const h=map.get(r.home_team_id),a=map.get(r.away_team_id)
      if(!h||!a)continue
      h.played++;a.played++
      h.scored+=s.home;h.conceded+=s.away
      a.scored+=s.away;a.conceded+=s.home
      if(s.home>s.away){
        h.wins++;a.losses++
        h.points+=Number(comp?.points_win??2);a.points+=Number(comp?.points_loss??0)
      }else if(s.away>s.home){
        a.wins++;h.losses++
        a.points+=Number(comp?.points_win??2);h.points+=Number(comp?.points_loss??0)
      }else{
        h.draws++;a.draws++
        h.points+=Number(comp?.points_draw??1);a.points+=Number(comp?.points_draw??1)
      }
    }
    return rows.sort((x,y)=>y.points-x.points||(y.scored-y.conceded)-(x.scored-x.conceded)||y.scored-x.scored)
  }

  function playerStandingsFor(competitionId:string){
    const reportIds=new Set(
      reports
        .filter((r)=>r.competition_id===competitionId)
        .map((r)=>r.id),
    )

    const relevantGames=games.filter(
      (g)=>g.status==="confirmed" && reportIds.has(g.match_report_id),
    )
    const relevantGameIds=new Set(relevantGames.map((g)=>g.id))
    const rows=new Map<string,{
      playerId:string
      name:string
      photoUrl:string|null
      played:number
      wins:number
      draws:number
      losses:number
      legsWon:number
      legsLost:number
    }>()

    const ensure=(gp:GamePlayer)=>{
      const name=gp.club_players?.name||"Spieler"
      if(!rows.has(gp.player_id)){
        rows.set(gp.player_id,{
          playerId:gp.player_id,
          name,
          photoUrl:gp.club_players?.photo_url||null,
          played:0,wins:0,draws:0,losses:0,legsWon:0,legsLost:0,
        })
      }
      return rows.get(gp.player_id)!
    }

    for(const game of relevantGames){
      const hs=Number(game.home_score??0)
      const as=Number(game.away_score??0)
      const participants=gamePlayers.filter((gp)=>gp.game_id===game.id && relevantGameIds.has(gp.game_id))

      for(const gp of participants){
        const row=ensure(gp)
        row.played+=1

        const own=gp.side==="home"?hs:as
        const opp=gp.side==="home"?as:hs
        row.legsWon+=own
        row.legsLost+=opp

        if(own>opp)row.wins+=1
        else if(own<opp)row.losses+=1
        else row.draws+=1
      }
    }

    return [...rows.values()].sort((a,b)=>
      b.wins-a.wins ||
      (b.legsWon-b.legsLost)-(a.legsWon-a.legsLost) ||
      b.legsWon-a.legsWon ||
      a.played-b.played ||
      a.name.localeCompare(b.name)
    )
  }

  const nextOwn=upcoming.find(r=>myTeamIds.includes(r.home_team_id)||myTeamIds.includes(r.away_team_id))||upcoming[0]||null
  const selectedCompetition=tableCompetitionId||competitions[0]?.id||""
  const standings=selectedCompetition?standingsFor(selectedCompetition):[]
  const playerStandings=selectedCompetition?playerStandingsFor(selectedCompetition):[]

  function isMyMatch(r:Report){return myTeamIds.includes(r.home_team_id)||myTeamIds.includes(r.away_team_id)}

  return(
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f6f7fb] pb-24">
      <Header variant="app" title="Interne Wettbewerbe" subtitle="Live · Spielplan · Tabelle · Ergebnisse" backHref="/member-profile-app"/>

      <main className="w-full px-4 pt-16 sm:px-6 lg:px-8 xl:px-10">
        <section className="relative overflow-hidden rounded-[24px] bg-slate-950 text-white shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.24),transparent_38%)]"/>
          <div className="relative p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10">
                  <Swords className="h-6 w-6 text-orange-400"/>
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-300">EMD intern</div>
                  <h1 className="mt-1 text-2xl font-black sm:text-3xl">Cups & Ligen</h1>
                  <p className="mt-2 max-w-2xl text-sm font-semibold text-white/55">Live mitverfolgen, Spielplan prüfen, Tabelle ansehen und Ergebnisse öffnen.</p>
                </div>
              </div>

              {nextOwn?(
                <Link href={`/internal-matches/${nextOwn.id}`} className="group min-w-0 rounded-2xl bg-white/[0.04] p-4 transition hover:bg-white/[0.07] lg:min-w-[340px]">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">Nächstes Spiel</div>
                  <div className="mt-3 flex items-center gap-2 sm:gap-3">
                    <TeamMark team={nextOwn.home_team}/>
                    <div className="min-w-0 flex-1 text-center">
                      <div className="text-center text-sm font-black leading-tight break-words">{nextOwn.home_team?.name}</div>
                      <div className="my-1 text-[10px] font-black text-white/25">VS</div>
                      <div className="text-center text-sm font-black leading-tight break-words">{nextOwn.away_team?.name}</div>
                    </div>
                    <TeamMark team={nextOwn.away_team}/>
                  </div>
                  <div className="mt-3 text-center text-xs font-bold text-white/45">{new Date(nextOwn.scheduled_at).toLocaleString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                </Link>
              ):null}
            </div>
          </div>
        </section>

        {liveReports.length?(
          <section className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50"><Radio className="h-4 w-4 animate-pulse text-red-600"/></span>
              <div>
                <div className="text-sm font-black text-slate-950">Jetzt live</div>
                <div className="text-xs font-semibold text-slate-400">Aktuelle Begegnungen im Verein</div>
              </div>
            </div>
            <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {liveReports.map(r=>{
                const s=scoreFor(r.id)
                return(
                  <Link key={r.id} href={`/internal-matches/${r.id}`} className="group relative overflow-hidden rounded-[20px] bg-white p-4 shadow-[0_8px_28px_rgba(239,68,68,0.10)] outline outline-1 outline-red-200 transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="absolute inset-x-0 top-0 h-1 bg-red-500"/>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-red-600">{r.competition?.name||"Interner Wettbewerb"}</div>
                      <StatusPill status={r.status}/>
                    </div>
                    <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
                      <div className="flex min-w-0 flex-col items-center text-center"><TeamMark team={r.home_team}/><div className="mt-2 w-full text-center text-sm font-black leading-tight break-words">{r.home_team?.name}</div></div>
                      <div className="rounded-2xl bg-slate-950 px-3 py-2 text-xl font-black text-white">{s.home}<span className="mx-1 text-white/25">:</span>{s.away}</div>
                      <div className="flex min-w-0 flex-col items-center text-center"><TeamMark team={r.away_team}/><div className="mt-2 w-full text-center text-sm font-black leading-tight break-words">{r.away_team?.name}</div></div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-slate-400">
                      <span>{s.confirmed}/{s.total} bestätigt</span><span className="text-red-600 group-hover:underline">Live ansehen</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ):null}

        {loading?<div className="p-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-orange-600"/></div>:null}
        {message?<div className="mt-5 rounded-2xl border bg-white p-5 text-sm font-semibold">{message}</div>:null}

        {!loading&&!message?(
          <Tabs defaultValue="overview" className="mt-6 w-full">
            <TabsList className="grid h-auto w-full grid-cols-4 rounded-2xl bg-slate-100 p-1">
              <TabsTrigger value="overview" className="rounded-xl py-2.5 text-[11px] font-black sm:text-sm">Übersicht</TabsTrigger>
              <TabsTrigger value="schedule" className="rounded-xl py-2.5 text-[11px] font-black sm:text-sm">Spielplan</TabsTrigger>
              <TabsTrigger value="standings" className="rounded-xl py-2.5 text-[11px] font-black sm:text-sm">Tabelle</TabsTrigger>
              <TabsTrigger value="results" className="rounded-xl py-2.5 text-[11px] font-black sm:text-sm">Ergebnisse</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-5 space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Wettbewerbe",competitions.length,"Cups & Ligen"],
                  ["Live",liveReports.length,"gerade aktiv"],
                  ["Kommend",upcoming.length,"geplante Spiele"],
                  ["Ergebnisse",completed.length,"abgeschlossen"],
                ].map(([label,value,sub])=>(
                  <div key={String(label)} className="rounded-[20px] bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
                    <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-400">{sub}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-3 text-sm font-black text-slate-950">Als Nächstes</div>
                <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                  {mySchedule.length ? mySchedule.slice(0,6).map(r=>(
                    <Link key={r.id} href={`/internal-matches/${r.id}`} className={`group rounded-[20px] bg-white p-4 shadow-[0_6px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-lg ${isMyMatch(r)?"outline outline-1 outline-orange-200":""}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-600">{r.competition?.name||"Interner Wettbewerb"}</div>
                        {isMyMatch(r)?<Badge className="bg-orange-50 text-orange-700 hover:bg-orange-50">Dein Team</Badge>:<StatusPill status={r.status}/>}
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <TeamMark team={r.home_team}/>
                        <div className="min-w-0 flex-1 text-center">
                          <div className="text-center text-sm font-black leading-tight break-words">{r.home_team?.name}</div>
                          <div className="my-1 text-[10px] font-black text-slate-300">VS</div>
                          <div className="text-center text-sm font-black leading-tight break-words">{r.away_team?.name}</div>
                        </div>
                        <TeamMark team={r.away_team}/>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
                        <span>{new Date(r.scheduled_at).toLocaleString("de-AT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>
                        <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5"/>
                      </div>
                    </Link>
                  )) : (
                    <div className="col-span-full rounded-[20px] bg-white p-8 text-center text-sm font-semibold text-slate-400 shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
                      Für dein Team sind aktuell keine kommenden Spiele eingetragen.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="mt-5">
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-lg font-black text-slate-950">Spielplan</div>
                  <div className="mt-1 text-sm font-semibold text-slate-400">
                    Deine Begegnungen oder den kompletten Wettbewerb anzeigen.
                  </div>
                </div>

                <div className="grid w-full grid-cols-2 rounded-2xl bg-slate-100 p-1 lg:w-[360px]">
                  <button
                    type="button"
                    onClick={()=>setScheduleView("mine")}
                    className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${scheduleView==="mine"?"bg-white text-slate-950 shadow-sm":"text-slate-500 hover:text-slate-800"}`}
                  >
                    Meine Spiele ({mySchedule.length})
                  </button>
                  <button
                    type="button"
                    onClick={()=>setScheduleView("all")}
                    className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${scheduleView==="all"?"bg-white text-slate-950 shadow-sm":"text-slate-500 hover:text-slate-800"}`}
                  >
                    Alle Spiele ({allSchedule.length})
                  </button>
                </div>
              </div>

              {(() => {
                const rows=scheduleView==="mine"?mySchedule:allSchedule

                if(!rows.length){
                  return (
                    <div className="rounded-[20px] bg-white p-10 text-center text-sm font-semibold text-slate-400 shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
                      Keine Spiele vorhanden.
                    </div>
                  )
                }

                const groupedByMonth=rows.reduce<Record<string,Report[]>>((acc,r)=>{
                  const key=new Date(r.scheduled_at).toLocaleDateString("de-AT",{month:"long",year:"numeric"})
                  ;(acc[key]||=[]).push(r)
                  return acc
                },{})

                return (
                  <div className="space-y-6">
                    {Object.entries(groupedByMonth).map(([month,monthRows])=>(
                      <section key={month}>
                        <div className="mb-3 flex items-center gap-3">
                          <div className="h-px flex-1 bg-slate-200"/>
                          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{month}</div>
                          <div className="h-px flex-1 bg-slate-200"/>
                        </div>

                        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                          {monthRows.map(r=>(
                            <Link
                              key={r.id}
                              href={`/internal-matches/${r.id}`}
                              className={`group rounded-[20px] bg-white p-4 shadow-[0_6px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-lg ${r.status==="live"?"outline outline-1 outline-red-200":isMyMatch(r)?"outline outline-1 outline-orange-200":""}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-600">{r.competition?.name||"Interner Wettbewerb"}</div>
                                <div className="flex items-center gap-2">
                                  {isMyMatch(r)?<Badge className="bg-orange-50 text-orange-700 hover:bg-orange-50">Dein Team</Badge>:null}
                                  <StatusPill status={r.status}/>
                                </div>
                              </div>

                              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
                                <div className="flex min-w-0 flex-col items-center text-center">
                                  <TeamMark team={r.home_team}/>
                                  <div className="mt-2 w-full text-center text-sm font-black leading-tight break-words">{r.home_team?.name}</div>
                                </div>
                                <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-400">VS</div>
                                <div className="flex min-w-0 flex-col items-center text-center">
                                  <TeamMark team={r.away_team}/>
                                  <div className="mt-2 w-full text-center text-sm font-black leading-tight break-words">{r.away_team?.name}</div>
                                </div>
                              </div>

                              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                                <div>
                                  <div className="text-sm font-black text-slate-900">
                                    {new Date(r.scheduled_at).toLocaleDateString("de-AT",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"})}
                                  </div>
                                  <div className="mt-0.5 text-xs font-semibold text-slate-400">
                                    {new Date(r.scheduled_at).toLocaleTimeString("de-AT",{hour:"2-digit",minute:"2-digit"})} Uhr
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5"/>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )
              })()}
            </TabsContent>

            <TabsContent value="standings" className="mt-5 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-lg font-black text-slate-950">Tabelle</div>
                  <div className="text-sm font-semibold text-slate-400">
                    Mannschafts- oder Spielerwertung des gewählten Wettbewerbs.
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                  <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 sm:w-[260px]">
                    <button
                      type="button"
                      onClick={()=>setStandingsView("teams")}
                      className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${standingsView==="teams"?"bg-white text-slate-950 shadow-sm":"text-slate-500"}`}
                    >
                      Teams
                    </button>
                    <button
                      type="button"
                      onClick={()=>setStandingsView("players")}
                      className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${standingsView==="players"?"bg-white text-slate-950 shadow-sm":"text-slate-500"}`}
                    >
                      Spieler
                    </button>
                  </div>

                  <div className="w-full sm:w-[320px]">
                    <Select value={selectedCompetition} onValueChange={setTableCompetitionId}>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white"><SelectValue placeholder="Wettbewerb wählen"/></SelectTrigger>
                      <SelectContent>{competitions.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {standingsView==="teams" ? (
                standings.length?(
                  <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-sm">
                        <thead className="bg-slate-950 text-white">
                          <tr>
                            <th className="px-4 py-3.5 text-left">#</th>
                            <th className="px-4 py-3.5 text-left">Mannschaft</th>
                            <th className="px-3 py-3.5 text-center">Sp</th>
                            <th className="px-3 py-3.5 text-center">S</th>
                            <th className="px-3 py-3.5 text-center">U</th>
                            <th className="px-3 py-3.5 text-center">N</th>
                            <th className="px-3 py-3.5 text-center">Spiele</th>
                            <th className="px-3 py-3.5 text-center">Diff.</th>
                            <th className="px-4 py-3.5 text-center">Pkt.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((r,idx)=>(
                            <tr key={r.teamId} className={`border-t border-slate-100 ${myTeamIds.includes(r.teamId)?"bg-orange-50":"bg-white"}`}>
                              <td className="px-4 py-3.5 font-black">{idx+1}</td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-3">
                                  <TeamMark team={r.team}/>
                                  <div className="font-black">
                                    {r.team?.name||"Team"}
                                    {myTeamIds.includes(r.teamId)?<span className="ml-2 text-[10px] uppercase text-orange-600">Dein Team</span>:null}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3.5 text-center">{r.played}</td>
                              <td className="px-3 py-3.5 text-center">{r.wins}</td>
                              <td className="px-3 py-3.5 text-center">{r.draws}</td>
                              <td className="px-3 py-3.5 text-center">{r.losses}</td>
                              <td className="px-3 py-3.5 text-center font-bold">{r.scored}:{r.conceded}</td>
                              <td className="px-3 py-3.5 text-center">{r.scored-r.conceded}</td>
                              <td className="px-4 py-3.5 text-center text-lg font-black">{r.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ):<div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-400">Noch keine abgeschlossenen Spiele für die Tabelle.</div>
              ) : (
                playerStandings.length ? (
                  <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[820px] text-sm">
                        <thead className="bg-slate-950 text-white">
                          <tr>
                            <th className="px-4 py-3.5 text-left">#</th>
                            <th className="px-4 py-3.5 text-left">Spieler</th>
                            <th className="px-3 py-3.5 text-center">Sp</th>
                            <th className="px-3 py-3.5 text-center">S</th>
                            <th className="px-3 py-3.5 text-center">U</th>
                            <th className="px-3 py-3.5 text-center">N</th>
                            <th className="px-3 py-3.5 text-center">Legs</th>
                            <th className="px-3 py-3.5 text-center">Diff.</th>
                            <th className="px-4 py-3.5 text-center">Siegquote</th>
                          </tr>
                        </thead>
                        <tbody>
                          {playerStandings.map((r,idx)=>{
                            const winRate=r.played?Math.round((r.wins/r.played)*100):0
                            return (
                              <tr key={r.playerId} className="border-t border-slate-100 bg-white">
                                <td className="px-4 py-3.5 font-black">{idx+1}</td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <PlayerMark name={r.name} photoUrl={r.photoUrl}/>
                                    <div className="font-black text-slate-950">{r.name}</div>
                                  </div>
                                </td>
                                <td className="px-3 py-3.5 text-center">{r.played}</td>
                                <td className="px-3 py-3.5 text-center">{r.wins}</td>
                                <td className="px-3 py-3.5 text-center">{r.draws}</td>
                                <td className="px-3 py-3.5 text-center">{r.losses}</td>
                                <td className="px-3 py-3.5 text-center font-bold">{r.legsWon}:{r.legsLost}</td>
                                <td className="px-3 py-3.5 text-center">{r.legsWon-r.legsLost}</td>
                                <td className="px-4 py-3.5 text-center font-black">{winRate}%</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-400">
                    Noch keine bestätigten Einzel-/Doppelspiele für die Spielerwertung.
                  </div>
                )
              )}
            </TabsContent>

            <TabsContent value="results" className="mt-5">
              <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {completed.length?completed.map(r=>{
                  const s=scoreFor(r.id)
                  return(
                    <Link key={r.id} href={`/internal-matches/${r.id}`} className="group rounded-[20px] bg-white p-4 shadow-[0_6px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-lg">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">{r.competition?.name}</div>
                        <StatusPill status="completed"/>
                      </div>
                      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
                        <div className="flex min-w-0 flex-col items-center text-center"><TeamMark team={r.home_team}/><div className="mt-2 w-full text-center text-sm font-black leading-tight break-words">{r.home_team?.name}</div></div>
                        <div className="rounded-2xl bg-slate-950 px-3 py-2 text-xl font-black text-white">{s.home}<span className="mx-1 text-white/25">:</span>{s.away}</div>
                        <div className="flex min-w-0 flex-col items-center text-center"><TeamMark team={r.away_team}/><div className="mt-2 w-full text-center text-sm font-black leading-tight break-words">{r.away_team?.name}</div></div>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-400">
                        <span>{new Date(r.scheduled_at).toLocaleDateString("de-AT")}</span><span>{s.confirmed}/{s.total} bestätigt</span>
                      </div>
                    </Link>
                  )
                }):<div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-400">Noch keine Ergebnisse.</div>}
              </div>
            </TabsContent>
          </Tabs>
        ):null}
      </main>

      <MobileBottomNav/>
    </div>
  )
}
