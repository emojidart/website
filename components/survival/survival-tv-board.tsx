"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Mode = "single" | "double"
type Player = { id: string; player_name: string; active: boolean; points?: number; wins?: number; losses?: number; leg_difference?: number; difference?: number; legs_for?: number; legs_against?: number; position?: number }
type Match = { id: string; status: string; score1: number | null; score2: number | null; machine_number?: number | null; match_no?: number; board_number?: number; player1_id?: string; player2_id?: string; team1_player1_id?: string; team1_player2_id?: string; team2_player1_id?: string; team2_player2_id?: string }
type Info = { name: string; status: string; stage: number; round: number; cut: number | null; players: Player[]; matches: Match[] }

function Score({ match }: {match: Match}) {
  return <div className="shrink-0 rounded-lg border border-white/10 bg-black/40 px-[1vw] py-[.55vh] text-center text-[clamp(20px,1.7vw,29px)] font-black tabular-nums text-white">{match.status === "completed" ? `${match.score1 ?? 0} : ${match.score2 ?? 0}` : "VS"}</div>
}

export default function SurvivalTvBoard({ mode }: { mode: Mode }) {
  const search = useSearchParams()
  const id = search.get("tournamentId") || ""
  const [info, setInfo] = useState<Info | null>(null)
  const [issue, setIssue] = useState("")
  const [matchPage, setMatchPage] = useState(0)
  const load = useCallback(async () => {
    if (!id) return
    try {
      if (mode === "single") {
        const { data: t, error } = await supabase.from("survival_single_tournaments").select("id,name,status,stage_number,round_number,win_points,close_loss_points,legs_to_win").eq("id",id).single()
        if (error || !t) throw error || new Error("Turnier nicht gefunden")
        const [p,m] = await Promise.all([
          supabase.from("survival_single_players").select("id,player_name,active").eq("tournament_id",id),
          supabase.from("survival_single_matches").select("*").eq("tournament_id",id).eq("stage_number",t.stage_number).order("round_number",{ascending:false}).order("board_number"),
        ])
        if (p.error || m.error) throw p.error || m.error
        const all = (m.data || []) as (Match & {round_number:number})[]
        const round = Number(t.round_number || 0)
        const matches = all.filter(x => Number(x.round_number) === round)
        const players = (p.data || []) as Player[]
        const totals = new Map(players.map(x => [x.id,{...x,points:0,wins:0,losses:0,difference:0,legs_for:0,legs_against:0}]))
        all.filter(x=>x.status === "completed").forEach(x=>{
          const a=totals.get(x.player1_id || ""), b=totals.get(x.player2_id || "")
          if(!a||!b)return
          const s1=Number(x.score1||0),s2=Number(x.score2||0)
          a.legs_for+=s1;a.legs_against+=s2;a.difference+=s1-s2;a.wins+=Number(s1>s2);a.losses+=Number(s1<s2);a.points+=s1>s2?Number(t.win_points||3):(s1===Number(t.legs_to_win||3)-1&&s2===Number(t.legs_to_win||3)?Number(t.close_loss_points||0):0)
          b.legs_for+=s2;b.legs_against+=s1;b.difference+=s2-s1;b.wins+=Number(s2>s1);b.losses+=Number(s2<s1);b.points+=s2>s1?Number(t.win_points||3):(s2===Number(t.legs_to_win||3)-1&&s1===Number(t.legs_to_win||3)?Number(t.close_loss_points||0):0)
        })
        setInfo({name:t.name,status:t.status,stage:t.stage_number,round,cut:null,players:[...totals.values()].filter(x=>x.active).sort((a,b)=>(b.points||0)-(a.points||0)||(b.difference||0)-(a.difference||0)||a.player_name.localeCompare(b.player_name)),matches})
      } else {
        const {data:t,error}=await supabase.from("survival_tournaments").select("id,name,status,current_stage").eq("id",id).single()
        if(error||!t) throw error||new Error("Turnier nicht gefunden")
        const [p,c,r]=await Promise.all([
          supabase.from("survival_ranking").select("*").eq("tournament_id",id).order("position"),
          supabase.from("survival_stage_cuts").select("qualifying_players").eq("tournament_id",id).eq("stage_no",t.current_stage).maybeSingle(),
          supabase.from("survival_rounds").select("id,round_no").eq("tournament_id",id).eq("stage_no",t.current_stage).order("round_no",{ascending:false}).limit(1),
        ])
        if(p.error||c.error||r.error)throw p.error||c.error||r.error
        const current=r.data?.[0]
        const m=current?await supabase.from("survival_matches").select("*").eq("round_id",current.id).order("match_no"):{data:[],error:null}
        if(m.error)throw m.error
        setInfo({name:t.name,status:t.status,stage:t.current_stage,round:current?.round_no||0,cut:c.data?.qualifying_players||null,players:(p.data||[]).filter((x:any)=>x.active),matches:(m.data||[]) as Match[]})
      }
      setIssue("")
    } catch(e) { console.error("Survival TV",e);setIssue("Verbindung wird erneut versucht") }
  },[id,mode])
  useEffect(()=>{
    void load()
    if(!id)return
    const tables=mode==="single"?["survival_single_matches","survival_single_players","survival_single_tournaments"]:["survival_matches","survival_players","survival_tournaments","survival_rounds","survival_stage_cuts"]
    const channel=supabase.channel(`survival-tv-${mode}-${id}`)
    tables.forEach(table=>channel.on("postgres_changes",{event:"*",schema:"public",table},()=>void load()))
    channel.subscribe()
    const timer=window.setInterval(()=>{if(!document.hidden&&navigator.onLine)void load()},4000)
    const visible=()=>{if(!document.hidden)void load()}
    document.addEventListener("visibilitychange",visible)
    return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",visible);void supabase.removeChannel(channel)}
  },[id,mode,load])
  const names=useMemo(()=>new Map((info?.players||[]).map(p=>[p.id,p.player_name])),[info])
  const ordered=useMemo(()=>[...(info?.matches||[])].sort((a,b)=>{
    const rank=(m:Match)=>m.status==="live"?0:m.status==="ready"?1:2
    return rank(a)-rank(b)||(a.machine_number||999)-(b.machine_number||999)||(a.match_no||a.board_number||0)-(b.match_no||b.board_number||0)
  }),[info])
  const count=(s:string)=>info?.matches.filter(x=>x.status===s).length||0
  const pageCount = Math.max(1, Math.ceil(ordered.length / 5))
  useEffect(()=>{setMatchPage(0)},[id,info?.round,info?.stage])
  useEffect(()=>{if(pageCount<=1)return;const timer=window.setInterval(()=>setMatchPage(p=>(p+1)%pageCount),12000);return()=>window.clearInterval(timer)},[pageCount])
  return <main className="h-screen w-screen overflow-hidden bg-[#090b0e] px-[2.3vw] py-[2vh] text-white" style={{fontFamily:'inherit'}}>
    <div className="flex h-full flex-col gap-[1.5vh]">
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-white/10 pb-[1.4vh]">
        <div className="min-w-0"><div className="text-[clamp(11px,.85vw,15px)] font-bold uppercase tracking-[.22em] text-orange-400">EMD TV / SURVIVAL {mode==="single"?"EINZEL":"DOPPEL"}</div><h1 className="mt-1 truncate text-[clamp(26px,2.1vw,38px)] font-black leading-tight">{info?.name || "SURVIVAL ROULETTE"}</h1></div>
        <div className="flex shrink-0 gap-[1vw] text-center">{[["STAGE",info?.stage||"–"],["RUNDE",info?.round||"–"],["LIVE",count("live")]].map(([label,value])=><div key={label} className="min-w-[5.7vw] rounded-xl border border-white/10 bg-white/[.05] px-[1vw] py-[.7vh]"><div className="text-[clamp(10px,.75vw,13px)] font-bold text-white/50">{label}</div><div className="text-[clamp(20px,1.55vw,28px)] font-black text-white">{value}</div></div>)}</div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.55fr)_minmax(340px,.9fr)] gap-[1.4vw]">
        <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#11151a] p-[1.25vw]">
          <div className="mb-[1vh] flex items-center justify-between gap-3"><h2 className="text-[clamp(21px,1.65vw,29px)] font-black">Begegnungen</h2><span className="text-[clamp(12px,.88vw,16px)] font-bold text-white/60">{count("ready")} bereit · {count("completed")} beendet{pageCount>1?` · Seite ${matchPage+1}/${pageCount}`:""}</span></div>
          <div className="min-h-0 flex-1 space-y-[.85vh] overflow-hidden">
            {ordered.length?ordered.slice(matchPage*5,(matchPage+1)*5).map((m,i)=>{
              const left=mode==="single"?[names.get(m.player1_id||"")||"Spieler"]:[names.get(m.team1_player1_id||"")||"Spieler",names.get(m.team1_player2_id||"")||"Spieler"]
              const right=mode==="single"?[names.get(m.player2_id||"")||"Spieler"]:[names.get(m.team2_player1_id||"")||"Spieler",names.get(m.team2_player2_id||"")||"Spieler"]
              return <article key={m.id} className={`rounded-xl border px-[1vw] py-[.9vh] ${m.status==="live"?"border-orange-500/50 bg-orange-500/[.08]":"border-white/10 bg-white/[.025]"}`}>
                <div className="mb-[.55vh] flex items-center justify-between text-[clamp(12px,.85vw,16px)] font-extrabold"><span className={m.status==="live"?"text-orange-400":"text-white/60"}>{m.status==="live"?"● LIVE":m.status==="completed"?"BEENDET":"BEREIT"} · MATCH {m.match_no||m.board_number||i+1}</span>{m.machine_number?<span className="text-orange-300">AUTOMAT {m.machine_number}</span>:null}</div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[1vw]"><div className="min-w-0">{left.map((n,k)=><div key={k} className="truncate text-[clamp(18px,1.28vw,24px)] font-black leading-[1.2]">{n}</div>)}</div><Score match={m}/><div className="min-w-0 text-right">{right.map((n,k)=><div key={k} className="truncate text-[clamp(18px,1.28vw,24px)] font-black leading-[1.2]">{n}</div>)}</div></div>
              </article>
            }):<div className="grid h-full place-items-center text-center text-[clamp(20px,1.55vw,28px)] font-bold text-white/60">Warten auf die nächste Auslosung</div>}
          </div>
        </section>
        <aside className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#11151a] p-[1.25vw]"><div className="mb-[1vh] flex items-center justify-between"><h2 className="text-[clamp(21px,1.65vw,29px)] font-black">Rangliste</h2>{info?.cut&&! (mode==="single")?<span className="rounded-lg bg-orange-500/10 px-3 py-1 text-[clamp(11px,.82vw,15px)] font-bold text-orange-300">TOP {info.cut}</span>:null}</div>
          <div className="min-h-0 flex-1 overflow-hidden">{(info?.players||[]).slice(0,14).map((p,i)=><div key={p.id} className={`grid grid-cols-[2.2vw_minmax(0,1fr)_4vw] items-center gap-[.7vw] border-b border-white/[.07] py-[.85vh] ${info?.cut&&i>=info.cut?"opacity-60":""}`}><span className="text-[clamp(15px,1.1vw,20px)] font-black text-orange-400">{i+1}.</span><span className="truncate text-[clamp(17px,1.18vw,22px)] font-extrabold">{p.player_name}</span><span className="text-right text-[clamp(17px,1.3vw,23px)] font-black tabular-nums">{p.points||0}</span></div>)}</div>
          <div className="mt-[1vh] flex justify-between border-t border-white/10 pt-[1vh] text-[clamp(12px,.85vw,16px)] font-semibold text-white/50"><span>{info?.players.length||0} Spieler aktiv</span><span>Punkte</span></div>
        </aside>
      </div>
      {issue?<div className="absolute bottom-[1vh] left-[3vw] text-xs text-white/40">{issue}</div>:null}
    </div>
  </main>
}
