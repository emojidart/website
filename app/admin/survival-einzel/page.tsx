"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Header } from "@/components/header"
import { SurvivalSingleMartin, prefetchSurvivalSingleMartin } from "@/components/survival/survival-single-martin"

type Player = { id: string; player_id: string; player_name: string; active: boolean }
type Match = { id: string; round_number: number; stage_number: number; board_number: number; player1_id: string; player2_id: string; score1: number | null; score2: number | null; status: string }
type Tournament = { id: string; name: string; status: string; legs_to_win: number; round_number: number; stage_number: number; stage_round: number; win_points: number; close_loss_points: number }
type MultiTie = {id:string;stage_number:number;slots:number;player_ids:string[]}
type MultiMatch = {id:string;player1_id:string;player2_id:string;score1:number|null;score2:number|null;status:string}
type Tiebreak = {id:string;stage_number:number;player1_id:string;player2_id:string;score1:number|null;score2:number|null;winner_id:string|null;status:string}
type Rank = Player & { points: number; wins: number; losses: number; legsFor: number; legsAgainst: number; difference: number }
const sortRank = (a: Rank,b: Rank) => b.points-a.points || b.difference-a.difference || b.legsFor-a.legsFor || a.player_name.localeCompare(b.player_name,"de")
const sameRank = (a: Rank,b: Rank) => a.points===b.points && a.difference===b.difference && a.legsFor===b.legsFor
const totalCutAllowed = (count:number,target:number) => target<count && target>=2 && target%2===0
const sleep = (ms: number) => new Promise(resolve=>setTimeout(resolve,ms))

// Finds the lowest-penalty pairing: previous meetings are discouraged, not forbidden.
function drawPairs(players: Player[], history: Match[]) {
 const counts = new Map<string,number>()
 for (const m of history) {
  const k = [m.player1_id,m.player2_id].sort().join(":")
  counts.set(k,(counts.get(k)||0)+1)
 }
 let best: [Player,Player][] = [], bestScore = Infinity
 for(let attempt=0; attempt<Math.min(1500,80+players.length*60); attempt++) {
  const shuffled=[...players].sort(()=>Math.random()-.5)
  const pairs: [Player,Player][]=[]
  let penalty=0
  for(let i=0;i<shuffled.length;i+=2) {
   let index=i+1, low=Infinity
   for(let j=i+1;j<shuffled.length;j++) {
    const repeat=counts.get([shuffled[i].id,shuffled[j].id].sort().join(":"))||0
    const score=repeat*100+Math.random()*10
    if(score<low){low=score;index=j}
   }
   ;[shuffled[i+1],shuffled[index]]=[shuffled[index],shuffled[i+1]]
   const repeat=counts.get([shuffled[i].id,shuffled[i+1].id].sort().join(":"))||0
   penalty+=repeat*100
   pairs.push([shuffled[i],shuffled[i+1]])
  }
  if(penalty<bestScore){bestScore=penalty;best=pairs}
  if(penalty===0)break
 }
 return best
}

export default function SurvivalEinzel() {
 const router=useRouter()
 const search=useSearchParams()
 const centralEventId=search.get("centralEventId")
 const {user,isAdmin,loading:authLoading,adminLoading}=useAuth()
 const [catalog,setCatalog]=useState<{id:string|number;name:string}[]>([])
 const [centralEventTitle,setCentralEventTitle]=useState("")
 const [selected,setSelected]=useState<string[]>([])
 const [name,setName]=useState("Survival Einzel Roulette")
 const [legs,setLegs]=useState(3)
 const [tournament,setTournament]=useState<Tournament|null>(null)
 const [players,setPlayers]=useState<Player[]>([])
 const [matches,setMatches]=useState<Match[]>([])
 const [tiebreak,setTiebreak]=useState<Tiebreak|null>(null)
 const [multiTie,setMultiTie]=useState<MultiTie|null>(null)
 const [multiMatches,setMultiMatches]=useState<MultiMatch[]>([])
 const [multiScores,setMultiScores]=useState<Record<string,[number,number]>>({})
 const [tieScore,setTieScore]=useState<[number,number]>([0,0])
 const [busy,setBusy]=useState(false)
 const busyRef=useRef(false)
 const [error,setError]=useState("")
 const [info,setInfo]=useState("")
 const [scores,setScores]=useState<Record<string,[number,number]>>({})
 const [cutCount,setCutCount]=useState(0)
 // Round plan is scoped per tournament and stage; never mix different events.
 const [plannedRounds,setPlannedRounds]=useState(2)
 const roundPlanKey=tournament?.id?`emd_single_round_plan_${tournament.id}_stage_${tournament.stage_number}`:""
 useEffect(()=>{
  if(!roundPlanKey){setPlannedRounds(2);return}
  try {
   const stored=Number(localStorage.getItem(roundPlanKey))
   setPlannedRounds(Number.isInteger(stored)&&stored>=1&&stored<=12?Math.max(stored,tournament?.stage_round||0,1):Math.max(2,tournament?.stage_round||0))
  }catch{setPlannedRounds(Math.max(2,tournament?.stage_round||0))}
 },[roundPlanKey,tournament?.stage_round])
 const setStageRounds=(next:number)=>{
  if(!tournament||busy||!Number.isInteger(next)||next<1||next>12||next<Math.max(1,tournament.stage_round))return
  setPlannedRounds(next)
  try{localStorage.setItem(roundPlanKey,String(next))}catch{setError("Rundenplan konnte in diesem Browser nicht gespeichert werden.")}
 }
 const setStageCut=(next:number)=>{
  if(!tournament||busy||multiTie||!totalCutAllowed(players.filter(p=>p.active).length,next))return
  setCutCount(next)
 }

 const [confirmCut,setConfirmCut]=useState(false)
 const [showCompleted,setShowCompleted]=useState(false)

 // These controls are explicitly scoped to this Einzel tournament and browser.
 const [martinEnabled,setMartinEnabled]=useState(false)
 useEffect(()=>{setMartinEnabled(localStorage.getItem("emd_survival_martin_enabled")==="true")},[])
 const [machineCount,setMachineCount]=useState(5)
 const [machineAssignments,setMachineAssignments]=useState<Record<string,number>>({})
 const [machinePickerMatch,setMachinePickerMatch]=useState<string|null>(null)
 const [announcement,setAnnouncement]=useState<{players:string[];machine:number;call:1|2|3;nonce:number}|null>(null)
 const [resultConfirmation,setResultConfirmation]=useState<Match|null>(null)
 const [showCancelConfirm,setShowCancelConfirm]=useState(false)
 const clearAnnouncement=useCallback(()=>setAnnouncement(null),[])
 const machineStorageKey=tournament?.id?`emd_survival_single_machines_${tournament.id}`:""
 useEffect(()=>{
  if(!machineStorageKey){setMachineAssignments({});return}
  try{
   const stored=JSON.parse(localStorage.getItem(machineStorageKey)||"{}")
   if(stored&&typeof stored==="object"&&!Array.isArray(stored)){
    const clean:Record<string,number>={}
    for(const [id,value] of Object.entries(stored))if(Number.isInteger(value)&&Number(value)>=1&&Number(value)<=99)clean[id]=Number(value)
    setMachineAssignments(clean)
   }
  }catch{setMachineAssignments({})}
 },[machineStorageKey])
 const changeMachineCount=(value:number)=>{
  if(!Number.isInteger(value)||value<1||value>30)return
  if(Object.values(machineAssignments).some(n=>n>value)){
   setError("Ein bereits vergebener Automat liegt über der neuen Anzahl. Bitte erst dessen Zuweisung entfernen.")
   return
  }
  setMachineCount(value)
 }
 const assignMachine=(matchId:string,machine:number)=>{
  if(!tournament||!machineStorageKey)return
  if(machine!==0&&(!Number.isInteger(machine)||machine<1||machine>machineCount))return
  if(machine!==0&&currentMatches.some(m=>m.id!==matchId&&m.status!=="completed"&&machineAssignments[m.id]===machine)){
   setError(`Automat ${machine} ist in dieser Runde bereits belegt.`)
   return
  }
  setError("")
  const next={...machineAssignments}
  if(machine===0)delete next[matchId];else next[matchId]=machine
  setMachineAssignments(next)
  try{localStorage.setItem(machineStorageKey,JSON.stringify(next))}catch{setError("Automatenzuweisung konnte nicht lokal gespeichert werden.")}
  if(machine>0){const match=currentMatches.find(m=>m.id===matchId);if(match){const first=players.find(p=>p.id===match.player1_id)?.player_name;const second=players.find(p=>p.id===match.player2_id)?.player_name;if(first&&second){if(!martinEnabled)prefetchSurvivalSingleMartin([first,second],machine,1);if(martinEnabled&&match.status!=="completed"){setAnnouncement({players:[first,second],machine,call:1,nonce:Date.now()})}}}}
 }
 const callMatch=(match:Match,call:1|2|3)=>{
  const machine=machineAssignments[match.id]
  if(!machine){setError("Bitte zuerst einen Automaten für diese Begegnung auswählen.");return}
  const first=players.find(p=>p.id===match.player1_id)?.player_name
  const second=players.find(p=>p.id===match.player2_id)?.player_name
  if(!first||!second){setError("Die Spielernamen konnten nicht geladen werden.");return}
  setError("")
  setAnnouncement({players:[first,second],machine,call,nonce:Date.now()})
 }

 const currentMatches=matches.filter(m=>m.stage_number===tournament?.stage_number && m.round_number===tournament?.round_number)
 // DKO-style prefetch: quietly prepare the next two pairings for free machines.
 // Only Martin audio is warmed up; match assignments and auto-announcements are unchanged.
 const martinPrefetched=useRef<Set<string>>(new Set())
 useEffect(()=>{
  if(!martinEnabled||!tournament||tournament.status!=="active")return
  const names=new Map(players.map(p=>[p.id,p.player_name]))
  const occupied=new Set(currentMatches.filter(m=>m.status!=="completed").map(m=>machineAssignments[m.id]).filter(Boolean))
  const free=Array.from({length:machineCount},(_,i)=>i+1).filter(m=>!occupied.has(m)).slice(0,2)
  const warm=(match:Match,machine:number,call:1|2|3)=>{
   const first=names.get(match.player1_id),second=names.get(match.player2_id)
   if(!first||!second)return
   const key=JSON.stringify([tournament.id,match.id,first,second,machine,call])
   if(martinPrefetched.current.has(key))return
   martinPrefetched.current.add(key)
   prefetchSurvivalSingleMartin([first,second],machine,call)
  }
  for(const match of currentMatches.filter(m=>m.status!=="completed"&&!machineAssignments[m.id]).slice(0,2)){
   for(const machine of free)warm(match,machine,1)
  }
  for(const match of currentMatches.filter(m=>m.status!=="completed"&&machineAssignments[m.id]).slice(0,3)){
   warm(match,machineAssignments[match.id],2)
   warm(match,machineAssignments[match.id],3)
  }
 },[martinEnabled,tournament?.id,tournament?.status,players,matches,machineAssignments,machineCount])
 const stageMatches=matches.filter(m=>m.stage_number===tournament?.stage_number && m.status==="completed")
 const stageRank=useMemo(()=>{
  const ranks=players.map(p=>({...p,points:0,wins:0,losses:0,legsFor:0,legsAgainst:0,difference:0}))
  const byId=new Map(ranks.map(r=>[r.id,r]))
  for(const m of stageMatches){
   for(const [id,forLegs,against] of [[m.player1_id,m.score1!,m.score2!],[m.player2_id,m.score2!,m.score1!]] as [string,number,number][]){
    const r=byId.get(id);if(!r)continue
    r.legsFor+=forLegs;r.legsAgainst+=against;r.difference+=forLegs-against
    if(forLegs>against){r.wins++;r.points+=tournament?.win_points||3}
    else {r.losses++;r.points+=forLegs===legs-1 && against===legs ? (tournament?.close_loss_points||0) : 0}
   }
  }
  return ranks.filter(p=>p.active).sort(sortRank)
 },[stageMatches,players,tournament,legs])
 const validCutTargets=Array.from({length:Math.max(0,Math.floor((stageRank.length-2)/2))},(_,i)=>(i+1)*2)
 // First visit: a sensible half-field preview, rather than an arbitrary Top 2.
 // Never overwrite a manually chosen target during re-renders or score updates.
 useEffect(()=>{
  if(!tournament || validCutTargets.length===0)return
  setCutCount(prev=>validCutTargets.includes(prev)?prev:validCutTargets.reduce((best,n)=>Math.abs(n-stageRank.length/2)<Math.abs(best-stageRank.length/2)?n:best,validCutTargets[0]))
 },[tournament?.id,tournament?.stage_number,stageRank.length])
 const showCutPreview=stageMatches.length>0 && cutCount>=2 && cutCount<stageRank.length && totalCutAllowed(stageRank.length,cutCount)
 const boundaryTie=stageMatches.length>0&&cutCount>=2&&cutCount<stageRank.length&&sameRank(stageRank[cutCount-1],stageRank[cutCount])
 const tiedAtBoundary=boundaryTie?stageRank.filter(p=>sameRank(p,stageRank[cutCount-1])):[]
 const betterAtBoundary=boundaryTie?stageRank.filter(p=>p.points>stageRank[cutCount-1].points || (p.points===stageRank[cutCount-1].points && p.difference>stageRank[cutCount-1].difference) || (p.points===stageRank[cutCount-1].points && p.difference===stageRank[cutCount-1].difference && p.legsFor>stageRank[cutCount-1].legsFor)):[]
 const multiRanking=useMemo(()=>{const rows=(multiTie?.player_ids||[]).map(id=>({id,wins:0,forLegs:0,against:0,diff:0}));const lookup=new Map(rows.map(x=>[x.id,x]));for(const m of multiMatches.filter(x=>x.status==='completed')){for(const [id,a,b] of [[m.player1_id,m.score1??0,m.score2??0],[m.player2_id,m.score2??0,m.score1??0]] as [string,number,number][]) {const x=lookup.get(id);if(x){x.forLegs+=a;x.against+=b;x.diff+=a-b;if(a>b)x.wins++}}}return rows.sort((a,b)=>b.wins-a.wins||b.diff-a.diff||b.forLegs-a.forLegs||a.id.localeCompare(b.id))},[multiTie,multiMatches])
 const multiComplete=Boolean(multiTie&&multiMatches.length>0&&multiMatches.every(x=>x.status==='completed'))
 const multiBoundaryClear=Boolean(multiComplete&&multiTie&&multiRanking[multiTie.slots-1]&&multiRanking[multiTie.slots]&&(multiRanking[multiTie.slots-1].wins!==multiRanking[multiTie.slots].wins||multiRanking[multiTie.slots-1].diff!==multiRanking[multiTie.slots].diff||multiRanking[multiTie.slots-1].forLegs!==multiRanking[multiTie.slots].forLegs))
 const tieReady=Boolean(tiebreak?.status==='completed'&&tiebreak.winner_id&&tiedAtBoundary.length===2&&betterAtBoundary.length===cutCount-1&&tiedAtBoundary.some(p=>p.id===tiebreak.winner_id))
 const qualifyByRank=()=>{
  if(!boundaryTie)return stageRank.slice(0,cutCount).map(p=>p.id)
  if(!tieReady||!tiebreak?.winner_id)throw new Error('Stechspiel zuerst abschließen.')
  return [...betterAtBoundary.map(p=>p.id),tiebreak.winner_id]
 }
 const allFinished=currentMatches.length>0 && currentMatches.every(m=>m.status==="completed")
 const isFinal=players.filter(p=>p.active).length===2
 const stageCutReady=Boolean(tournament?.status==="active" && !isFinal && allFinished && tournament.stage_round>=plannedRounds)
 const tournamentKey=user?`emd_survival_single_${user.id}_${centralEventId||"spontan"}`:""
 const load=useCallback(async(id:string)=>{
  const [{data:t,error:te},{data:p,error:pe},{data:m,error:me}]=await Promise.all([
   supabase.from("survival_single_tournaments").select("*").eq("id",id).single(),
   supabase.from("survival_single_players").select("*").eq("tournament_id",id).order("player_name"),
   supabase.from("survival_single_matches").select("*").eq("tournament_id",id).order("round_number").order("board_number")
  ])
  if(te||pe||me)throw te||pe||me
  const {data:mg,error:mge}=await supabase.from('survival_single_multi_tiebreaks').select('*').eq('tournament_id',id).eq('stage_number',t.stage_number).maybeSingle()
  if(mge)throw mge
  const {data:mm,error:mme}=mg?await supabase.from('survival_single_multi_tiebreak_matches').select('*').eq('group_id',mg.id):{data:[],error:null}
  if(mme)throw mme
  setMultiTie(mg as MultiTie|null);setMultiMatches((mm||[]) as MultiMatch[]);setMultiScores({})
  const {data:tb,error:tbe}=await supabase.from("survival_single_tiebreaks").select("*").eq("tournament_id",id).eq("stage_number",t.stage_number).maybeSingle()
  if(tbe)throw tbe
  setTiebreak((tb||null) as Tiebreak|null);setTieScore([tb?.score1??0,tb?.score2??0])
  setTournament(t as Tournament);setPlayers((p||[]) as Player[]);setMatches((m||[]) as Match[]);setLegs(t.legs_to_win)
  if(t.status!=="active"&&tournamentKey)localStorage.removeItem(tournamentKey)
 },[tournamentKey])
 useEffect(()=>{if(!user||!isAdmin)return;let cancelled=false;(async()=>{
  if(centralEventId){
   const [{data:event,error:eventError},{data:registered,error:registrationError},{data:existing,error:existingError}]=await Promise.all([
    supabase.from("central_tournament_events").select("id,title,status").eq("id",centralEventId).single(),
    supabase.from("central_tournament_registrations").select("player_id,player_name_snapshot,status").eq("event_id",centralEventId).eq("status","registered"),
    supabase.from("survival_single_tournaments").select("id,status").eq("central_event_id",centralEventId).limit(1).maybeSingle(),
   ])
   if(cancelled)return
   if(eventError||registrationError||existingError){setError("Anmeldungen oder Turnierstatus konnten nicht geladen werden.");return}
   if(existing){try{await load(existing.id)}catch{setError("Das vorhandene Einzelturnier konnte nicht wiederhergestellt werden.")}return}
   if(event?.status==="completed"||event?.status==="cancelled"){setError("Diese Veranstaltung ist bereits beendet.");return}
   const people=(registered||[]).filter(p=>p.player_id).map(p=>({id:String(p.player_id),name:String(p.player_name_snapshot||"Spieler")}))
   if(new Set(people.map(p=>p.id)).size!==people.length){setError("Doppelte Anmeldungen erkannt. Bitte in der Zentrale prüfen.");return}
   setCatalog(people);setSelected(people.map(p=>p.id));setCentralEventTitle(event?.title||"Survival Einzel Roulette");setName(event?.title||"Survival Einzel Roulette")
   return
  }
  const {data}=await supabase.from("spieldatenbank").select("id,name").order("name")
  if(cancelled)return;setCatalog(data||[])
  const id=localStorage.getItem(`emd_survival_single_${user.id}_${centralEventId||"spontan"}`)
  if(id)try{await load(id)}catch{setError("Turnier konnte nicht geladen werden. Bitte Datenbank-Verbindung prüfen.")}
 })();return()=>{cancelled=true}},[user,isAdmin,load])
 const doAction=async(action:()=>Promise<void>)=>{
  if(busyRef.current)return;busyRef.current=true;setBusy(true);setError("");setInfo("")
  try{await action()}catch(e:any){setError(e?.message||"Aktion konnte nicht gespeichert werden")}
  finally{busyRef.current=false;setBusy(false)}
 }
 const create=()=>doAction(async()=>{
  if(!user||selected.length<4||selected.length%2){throw new Error("Bitte mindestens 4 und eine gerade Anzahl Spieler auswählen.")}
  if(centralEventId && selected.length!==catalog.length)throw new Error("Die Teilnehmer für zentrale Turniere bitte in der Turnier-Zentrale bearbeiten.")
  const chosen=catalog.filter(p=>selected.includes(String(p.id)))
  const {data:id,error:te}=await supabase.rpc("survival_single_create_atomic",{
   p_name:name.trim()||"Survival Einzel Roulette",p_legs_to_win:legs,
   p_players:centralEventId?[]:chosen.map(p=>({id:String(p.id),name:p.name})),
   p_central_event_id:centralEventId||null
  })
  if(te)throw te
  if(!id)throw new Error("Turnier konnte nicht erstellt werden")
  localStorage.setItem(`emd_survival_single_${user.id}_${centralEventId||"spontan"}`,id)
  await load(id)
 })
 const nextRound=()=>doAction(async()=>{
  if(!tournament)return
  if(tournament.status!=="active")throw new Error("Dieses Turnier ist nicht mehr aktiv.")
  if(tournament.round_number>0 && !allFinished)throw new Error("Zuerst alle Ergebnisse dieser Runde eintragen.")
  const active=players.filter(p=>p.active)
  if(active.length<2||active.length%2)throw new Error("Teilnehmerzahl muss gerade sein.")
  if(isFinal && tournament.stage_round>=1)throw new Error("Finale bereits gespielt. Bitte Turnier abschließen.")
  if(tournament.stage_round>=plannedRounds && active.length>2)throw new Error("Die geplanten Stage-Runden sind abgeschlossen. Jetzt den Cut durchführen.")
  const {error:drawError}=await supabase.rpc("survival_single_start_round",{p_tournament_id:tournament.id})
  if(drawError)throw drawError
  await load(tournament.id)
 })
 const saveMatch=(match:Match)=>doAction(async()=>{
  if(!tournament||tournament.status!=="active")throw new Error("Nur laufende Turniere dürfen geändert werden.")
  const [a,b]=scores[match.id]||[match.score1??0,match.score2??0]
  if(!((a===legs&&b>=0&&b<legs)||(b===legs&&a>=0&&a<legs)))throw new Error(`Ungültiges Ergebnis. Sieger muss genau ${legs} Legs haben.`)
  if(matches.some(m=>m.round_number>match.round_number))throw new Error("Ältere Runden können nach einer neuen Auslosung nicht korrigiert werden.")
  const {error:me}=await supabase.rpc("survival_single_record_result",{p_match_id:match.id,p_score1:a,p_score2:b})
  if(me)throw me
  await load(tournament.id)
 })
 const cut=()=>doAction(async()=>{
  if(!tournament||tournament.status!=="active"||!allFinished||tournament.stage_round<plannedRounds||isFinal)throw new Error("Cut ist derzeit nicht möglich.")
  if(cutCount<2||cutCount>=stageRank.length||cutCount%2)throw new Error("Cut-Ziel muss gerade und kleiner als die Teilnehmerzahl sein.")
  if(boundaryTie&&!tieReady&&!multiBoundaryClear)throw new Error("Gleichstand an der Cut-Grenze: Stechspiele zuerst abschließen.")
  const {error:ce}=await supabase.rpc("survival_single_apply_cut",{
   p_tournament_id:tournament.id,p_qualifiers:cutCount
  })
  if(ce)throw ce
  setConfirmCut(false);await load(tournament.id)
 })
 const prepareTiebreak=()=>doAction(async()=>{
  if(!tournament||!boundaryTie||tiedAtBoundary.length!==2||betterAtBoundary.length!==cutCount-1)throw new Error('Stechen nur bei genau zwei Spielern um einen freien Cut-Platz möglich.')
  const {error:e}=await supabase.rpc('survival_single_prepare_tiebreak',{
   p_tournament_id:tournament.id,p_qualifiers:cutCount
  })
  if(e)throw e
  await load(tournament.id)
 })
 const saveTiebreak=()=>doAction(async()=>{
  if(!tournament||!tiebreak)throw new Error('Kein Stechspiel vorhanden.')
  const {error:e}=await supabase.rpc('survival_single_record_tiebreak',{
   p_tiebreak_id:tiebreak.id,p_score1:tieScore[0],p_score2:tieScore[1]
  })
  if(e)throw e
  await load(tournament.id)
 })
 const prepareMulti=()=>doAction(async()=>{
  if(!tournament||!boundaryTie||tiedAtBoundary.length<3)throw new Error('Kein Mehrspieler-Stechen nötig.')
  const {error:e}=await supabase.rpc('survival_single_prepare_multi_tiebreak',{p_tournament_id:tournament.id,p_qualifiers:cutCount})
  if(e)throw e
  await load(tournament.id)
 })
 const saveMulti=(m:MultiMatch)=>doAction(async()=>{
  if(!tournament)throw new Error('Turnier fehlt.')
  const [a,b]=multiScores[m.id]||[m.score1??0,m.score2??0]
  const {error:e}=await supabase.rpc('survival_single_record_multi_tiebreak',{p_match_id:m.id,p_score1:a,p_score2:b})
  if(e)throw e
  await load(tournament.id)
 })
 const finish=()=>doAction(async()=>{
  if(!tournament||tournament.status!=="active"||!isFinal||!allFinished)throw new Error("Finale zuerst abschließen.")
  if(!currentMatches.every(m=>m.score1!==null&&m.score2!==null))throw new Error("Finalergebnis fehlt.")
  const {error:te}=await supabase.rpc("survival_single_finish",{p_tournament_id:tournament.id})
  if(te)throw te
  await load(tournament.id);setShowCompleted(true)
 })
 const cancel=()=>doAction(async()=>{
  if(!tournament||tournament.status!=="active"||!showCancelConfirm)return
  const {error:e}=await supabase.rpc("survival_single_cancel",{p_tournament_id:tournament.id})
  if(e)throw e
  await load(tournament.id);setShowCancelConfirm(false)
 })
 if(authLoading||adminLoading)return <main className="p-8">Berechtigung wird geprüft …</main>
 if(!user||!isAdmin)return <main className="p-8">Nur für Administratoren zugänglich.</main>
 const playerName=(id:string)=>players.find(p=>p.id===id)?.player_name||"Spieler"
   const inputClass="h-11 rounded-xl border border-white/15 bg-[#10131b] px-3 text-white outline-none focus:ring-2 focus:ring-orange-500"
  const buttonClass="rounded-xl bg-orange-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-35"
  const totalActive=players.filter(p=>p.active).length
  const completedCount=currentMatches.filter(m=>m.status==='completed').length
  const progress=currentMatches.length?Math.round(100*completedCount/currentMatches.length):0
  return <main className="min-h-screen bg-[#080a10] text-white pb-20">
    <Header/>
    <div className="mx-auto max-w-[1600px] px-4 pt-24 sm:px-7 lg:px-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-bold text-slate-200 hover:bg-white/10" onClick={()=>router.push('/admin/turnier_spieltage_starten')}>← Turnier-Zentrale</button>
        <span className="rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-orange-300">EMD · Survival Roulette · Einzel</span>
      </div>
      <header className="mb-6 overflow-hidden rounded-[28px] border border-orange-500/25 bg-gradient-to-br from-[#21130f] via-[#16151a] to-[#090c14] p-6 shadow-2xl lg:p-9">
        <p className="text-xs font-black uppercase tracking-[.22em] text-orange-400">Survival Roulette / Spielleitung</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{tournament?.name||centralEventTitle||'Einzel Roulette'}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">Ein Spieler gegen einen Spieler · neue Gegner pro Runde · individuelle Wertung</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-orange-500/15 px-3 py-2 text-orange-200">{legs===2?'Best of 3':legs===3?'Best of 5':'Best of 7'}</span>
          <span className="rounded-full bg-white/10 px-3 py-2">{tournament?`${totalActive} aktiv`:`${selected.length} angemeldet`}</span>
          {tournament&&<><span className="rounded-full bg-white/10 px-3 py-2">Stage {tournament.stage_number}</span><span className="rounded-full bg-white/10 px-3 py-2">Runde {tournament.round_number||'bereit'}</span><span className="rounded-full bg-white/10 px-3 py-2">{tournament.status==='active'?'LIVE / IN VORBEREITUNG':tournament.status.toUpperCase()}</span></>}
        </div>
      </header>
      {error&&<div role="alert" className="mb-5 rounded-2xl border border-red-500/40 bg-red-950/35 p-5 text-sm font-bold text-red-100">{error}</div>}
      {info&&<div role="status" className="mb-5 rounded-2xl border border-green-500/30 bg-green-950/30 p-4 text-green-200">{info}</div>}
      {!tournament?<section className="grid gap-5 xl:grid-cols-[1fr_1.25fr]">
        <div className="space-y-5 rounded-[26px] border border-white/10 bg-[#11151e] p-6">
          <h2 className="text-xl font-black">Turnier vorbereiten</h2>
          {centralEventId?<div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-4"><p className="text-xs font-bold uppercase tracking-wider text-orange-300">Aus der Turnier-Zentrale</p><p className="mt-1 text-xl font-black">{centralEventTitle||name}</p><p className="mt-2 text-sm text-slate-400">Turniername und Teilnehmer werden ausschließlich zentral verwaltet.</p></div>:<label className="block text-sm font-bold">Turniername<input className={`${inputClass} mt-2 block w-full`} value={name} onChange={e=>setName(e.target.value)} maxLength={100}/></label>}
          <div><p className="mb-3 text-sm font-bold">Leg-Modus</p><div className="grid grid-cols-3 gap-2">{[2,3,4].map(v=><button type="button" key={v} onClick={()=>setLegs(v)} className={`rounded-2xl border px-3 py-4 text-center font-black ${legs===v?'border-orange-400 bg-orange-500/15 text-orange-200':'border-white/10 bg-white/5 text-slate-300'}`}>Best of {2*v-1}<span className="mt-1 block text-xs font-normal">{v} Legs</span></button>)}</div></div>
          <button className={`${buttonClass} w-full`} disabled={busy||selected.length<4||selected.length%2!==0} onClick={create}>{busy?'Wird vorbereitet …':centralEventId?'Einzelturnier aus zentralen Anmeldungen starten':'Einzelturnier vorbereiten'}</button>
          <p className="text-xs leading-5 text-slate-400">Mindestens vier Spieler, gerade Teilnehmerzahl. Bestehende Doppelturniere werden nicht berührt.</p>
        </div>
        <div className="rounded-[26px] border border-white/10 bg-[#11151e] p-6"><div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-xl font-black">Teilnehmer</h2><span className="rounded-full bg-orange-500/15 px-3 py-1 text-sm font-black text-orange-300">{selected.length} gewählt</span></div><div className="grid max-h-[550px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">{catalog.map((p,i)=><label key={p.id} className={`flex items-center gap-3 rounded-xl border p-3 ${selected.includes(String(p.id))?'border-orange-500/30 bg-orange-500/10':'border-white/10 bg-white/5'}`}><input type="checkbox" className="accent-orange-500" checked={selected.includes(String(p.id))} disabled={Boolean(centralEventId)} onChange={e=>setSelected(old=>e.target.checked?[...old,String(p.id)]:old.filter(id=>id!==String(p.id)))}/><span className="min-w-0 break-words text-sm font-semibold">{p.name}</span></label>)}</div></div>
      </section>:<section className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[["AKTIVE SPIELER",String(totalActive)],["STAGE",String(tournament.stage_number)],["RUNDE",String(tournament.round_number||0)],["MATCHES FERTIG",`${completedCount} / ${currentMatches.length}`]].map(([label,value])=><div key={label} className="rounded-2xl border border-white/10 bg-[#131720] p-5"><p className="text-[11px] font-black tracking-widest text-slate-400">{label}</p><p className="mt-2 text-3xl font-black text-white">{value}</p></div>)}
        </div>
        {tournament.status==='active'&&<div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#131720] p-5"><div className="mr-auto"><h2 className="font-black text-lg">Turniersteuerung</h2><p className="text-sm text-slate-400">Ergebnisse abschließen, danach die nächste Runde oder den Cut starten</p></div><button className={buttonClass} disabled={busy||(tournament.round_number>0&&!allFinished)||(tournament.stage_round>=plannedRounds&&!isFinal)||(isFinal&&tournament.stage_round>=1)} onClick={nextRound}>{busy?'Speichert …':isFinal?'Finale auslosen':tournament.stage_round===0?'Runde 1 dieser Stage auslosen':'Nächste Runde auslosen'}</button>{isFinal&&allFinished&&<button className={buttonClass} disabled={busy} onClick={finish}>Turnier abschließen</button>}</div>}
        {tournament.status==='active'&&<div className="rounded-[24px] border border-white/10 bg-[#151920] p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-widest text-orange-400">EMD Turnieraufrufe</p><h2 className="text-xl font-black">Martin & Automaten</h2><p className="text-xs text-slate-400">Wenn Martin EIN ist, startet der erste Aufruf beim Zuweisen des Automaten. Automatenwahl gilt nur in diesem Browser.</p></div><label className="text-sm font-bold">Anzahl Automaten <select className={`${inputClass} ml-2 w-20`} value={machineCount} onChange={e=>changeMachineCount(Number(e.target.value))}>{Array.from({length:30},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}</select></label></div><SurvivalSingleMartin request={announcement} onHandled={clearAnnouncement} onEnabledChange={setMartinEnabled}/></div>}
         {tournament.status==='active'&&currentMatches.length===0&&tournament.round_number>0&&<div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5"><p className="text-lg font-black text-emerald-200">Cut abgeschlossen · Neue Stage bereit</p><p className="mt-1 text-sm text-slate-300">Die Begegnungen der vorigen Stage sind beendet. Oben mit „Nächste Runde auslosen“ die nächste Stage starten. Nur die qualifizierten Spieler werden ausgelost.</p></div>}
         {currentMatches.length>0&&<section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-orange-400">EMD Match Center</p><h2 className="text-2xl font-black">Begegnungen · aktuelle Stage</h2></div><span className="text-sm font-semibold text-slate-300">{progress}% abgeschlossen</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-orange-500 transition-all" style={{width:`${progress}%`}}/></div><div className="grid gap-4 lg:grid-cols-2">{currentMatches.map(m=>{const [a,b]=scores[m.id]||[m.score1??0,m.score2??0];const complete=m.status==='completed';return <article key={m.id} className={`overflow-hidden rounded-[24px] border bg-[#141821] ${complete?'border-emerald-500/30':'border-orange-500/25'}`}><div className="flex items-center justify-between border-b border-white/10 bg-white/[.03] px-5 py-3"><span className="text-xs font-black uppercase tracking-widest text-orange-300">Begegnung {m.board_number}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${complete?'bg-emerald-500/15 text-emerald-300':'bg-amber-500/15 text-amber-300'}`}>{complete?'ERGEBNIS GESPEICHERT':'ERGEBNIS OFFEN'}</span></div><div className="space-y-4 p-5"><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div className="min-w-0 text-center"><div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-black">{playerName(m.player1_id).slice(0,1).toUpperCase()}</div><p className="break-words font-black">{playerName(m.player1_id)}</p></div><span className="text-xl font-black text-orange-400">VS</span><div className="min-w-0 text-center"><div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-black">{playerName(m.player2_id).slice(0,1).toUpperCase()}</div><p className="break-words font-black">{playerName(m.player2_id)}</p></div></div><div className="rounded-2xl border border-white/10 bg-black/20 p-3 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><label className="text-xs font-black text-orange-200">AUTOMATENZUWEISUNG</label><button type="button" disabled={busy||complete} onClick={()=>setMachinePickerMatch(m.id)} className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-extrabold transition ${machineAssignments[m.id]?"border-emerald-400/40 bg-emerald-500/10 text-emerald-200":"border-orange-400/40 bg-orange-500/10 text-orange-200"} disabled:opacity-40`}>{machineAssignments[m.id]?`Automat ${machineAssignments[m.id]} · ändern`:'Automat zuweisen'}</button></div><div className="grid grid-cols-2 gap-2">{([2,3] as const).map(n=><button key={n} type="button" disabled={busy||complete||!machineAssignments[m.id]} onClick={()=>callMatch(m,n)} className="rounded-xl border border-orange-400/30 bg-orange-500/10 px-2 py-3 text-xs font-extrabold text-orange-200 hover:bg-orange-500/20 disabled:opacity-35">{n===2?'↻ 2. Aufruf':'⚠ Letzter Aufruf'}</button>)}</div></div><div className="flex items-center justify-center gap-3"><input aria-label={`Legs ${playerName(m.player1_id)}`} type="number" min={0} max={legs} className={`${inputClass} w-20 text-center text-xl font-black`} value={a} disabled={busy||tournament.status!=='active'} onChange={e=>setScores(old=>({...old,[m.id]:[Number(e.target.value),b]}))}/><span className="text-2xl font-black text-slate-500">:</span><input aria-label={`Legs ${playerName(m.player2_id)}`} type="number" min={0} max={legs} className={`${inputClass} w-20 text-center text-xl font-black`} value={b} disabled={busy||tournament.status!=='active'} onChange={e=>setScores(old=>({...old,[m.id]:[a,Number(e.target.value)]}))}/></div><button className={`${buttonClass} w-full`} disabled={busy||tournament.status!=='active'} onClick={()=>setResultConfirmation(m)}>{complete?'Ergebnis korrigieren':'Ergebnis bestätigen'}</button><p className="text-center text-xs text-slate-500">{complete?'Gespeicherte Werte werden bei einer Korrektur überschrieben.':'Ein Spieler muss die nötige Legzahl erreichen.'}</p></div></article>})}</div></section>}
        <section className="rounded-[26px] border border-orange-500/25 bg-[#15141c] p-5 md:p-7"><h2 className="mb-3 text-xl font-black">Cut & Stechspiele</h2>
{!isFinal&&validCutTargets.length>0&&<div className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1018]">
  <div className="border-b border-white/10 px-5 py-4"><p className="text-xs font-black uppercase tracking-[.16em] text-orange-400">Spielplan für diese Stage</p><h3 className="mt-1 text-xl font-black">Wie wird gespielt?</h3><p className="mt-1 text-sm text-slate-400">Zwei Einstellungen – danach zeigt die Spielleitung automatisch den nächsten Schritt.</p></div>
  <div className="grid gap-3 p-4 md:grid-cols-2">
    <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs font-black uppercase tracking-wider text-orange-300">1 · Runden spielen</p><p className="mt-1 text-sm text-slate-300">Wie viele vollständige Runden vor dem Cut?</p>
      <div className="mt-4 flex items-center gap-3"><button type="button" aria-label="Eine Runde weniger" disabled={busy||plannedRounds<=Math.max(1,tournament.stage_round)} onClick={()=>setStageRounds(plannedRounds-1)} className="h-12 w-12 rounded-xl border border-white/20 bg-white/10 text-2xl font-black disabled:opacity-30">−</button><span className="min-w-14 text-center text-3xl font-black tabular-nums">{plannedRounds}</span><button type="button" aria-label="Eine Runde mehr" disabled={busy||plannedRounds>=12} onClick={()=>setStageRounds(plannedRounds+1)} className="h-12 w-12 rounded-xl border border-white/20 bg-white/10 text-2xl font-black disabled:opacity-30">+</button><span className="text-sm font-semibold text-slate-400">Runden</span></div>
    </div>
    <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs font-black uppercase tracking-wider text-orange-300">2 · Wer kommt weiter?</p><p className="mt-1 text-sm text-slate-300">{stageRank.length} Spieler sind in dieser Stage.</p><div className="mt-3 flex flex-wrap gap-2">{validCutTargets.map(n=><button type="button" key={n} disabled={busy||Boolean(multiTie)} onClick={()=>setStageCut(n)} className={`rounded-xl border px-4 py-3 text-sm font-black transition disabled:opacity-40 ${cutCount===n?'border-orange-500 bg-orange-500 text-white':'border-white/20 bg-white/5 text-slate-200 hover:border-orange-400'}`}>Top {n}</button>)}</div><p className="mt-2 text-xs text-slate-400">{cutCount} weiter · {Math.max(0,stageRank.length-cutCount)} scheiden aus</p></div>
  </div>
  <div className="border-t border-white/10 bg-white/[.025] px-5 py-4"><div className="mb-2 flex items-center justify-between gap-2 text-sm font-bold"><span>Fortschritt dieser Stage</span><span className="tabular-nums">{Math.min(tournament.stage_round,plannedRounds)} / {plannedRounds} Runden ausgelost</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-orange-500 transition-all" style={{width:`${Math.min(100,100*tournament.stage_round/plannedRounds)}%`}} /></div><p className="mt-3 text-sm text-slate-300">{tournament.stage_round<plannedRounds?`Noch ${plannedRounds-tournament.stage_round} Runde(n) auslosen und alle Begegnungen abschließen.`:!allFinished?'Letzte Runde läuft: zuerst alle Ergebnisse eintragen.':'Alle geplanten Runden gespielt. Ergebnisse prüfen und Cut durchführen.'}</p><p className="mt-1 text-xs text-slate-500">{stageMatches.length===0?'Die Cut-Linie erscheint erst nach dem ersten Ergebnis.':`Die orange Cut-Linie zeigt die Grenze nach Platz ${cutCount}.`} Einstellungen gelten für diese Stage in diesem Browser.</p></div>
</div>}
{stageCutReady&&<div className="rounded-xl border border-orange-400/50 p-4 space-y-3"><h3 className="font-bold">Stage abgeschlossen – Cut durchführen</h3><p className="text-sm text-slate-300">{plannedRounds} Runden abgeschlossen. <strong>Top {cutCount}</strong> kommen weiter, {stageRank.length-cutCount} scheiden aus. Bei Gleichstand zuerst das Stechen entscheiden.</p>{boundaryTie&&<div className="border border-amber-500 rounded-xl p-3 space-y-2">
     <p className="font-semibold text-amber-300">Gleichstand genau an der Cut-Grenze – Stechen erforderlich</p>
     {tiedAtBoundary.length>2?<div className="space-y-3"><p>{tiedAtBoundary.length} Spieler gleichauf: Jeder gegen jeden um {cutCount-betterAtBoundary.length} freie Plätze.</p>
      {!multiTie?<button className={buttonClass} disabled={busy} onClick={prepareMulti}>Mehrspieler-Stechen auslosen</button>:<>
       {multiMatches.map(m=>{const [a,b]=multiScores[m.id]||[m.score1??0,m.score2??0];return <div className="flex flex-wrap items-center gap-2" key={m.id}><span>{playerName(m.player1_id)}</span><input className={`${inputClass} w-16`} aria-label="Legs Spieler 1" type="number" min={0} max={legs} value={a} disabled={busy} onChange={e=>setMultiScores(o=>({...o,[m.id]:[Number(e.target.value),b]}))}/><span>:</span><input className={`${inputClass} w-16`} aria-label="Legs Spieler 2" type="number" min={0} max={legs} value={b} disabled={busy} onChange={e=>setMultiScores(o=>({...o,[m.id]:[a,Number(e.target.value)]}))}/><span>{playerName(m.player2_id)}</span><button className={buttonClass} disabled={busy} onClick={()=>saveMulti(m)}>{m.status==='completed'?'Korrigieren':'Speichern'}</button></div>})}
       <h4 className="font-semibold">Stechspiel-Tabelle</h4>{multiRanking.map((r,i)=><p key={r.id}>{i+1}. {playerName(r.id)} · {r.wins} Siege · Legs {r.forLegs}:{r.against}</p>)}
       {multiComplete&&!multiBoundaryClear&&<p className="text-amber-300">Erneuter Gleichstand an der Grenze – Cut bleibt gesperrt.</p>}
      </>}
     </div>:(tiedAtBoundary.length!==2||betterAtBoundary.length!==cutCount-1)?<p>Stechen benötigt eine eindeutige Cut-Grenze.</p>:<>
      <p>{tiedAtBoundary.map(p=>p.player_name).join(' gegen ')}</p>
      {!tiebreak?<button className={buttonClass} disabled={busy} onClick={prepareTiebreak}>Stechspiel anlegen</button>:<>
       {tiebreak.status==='completed'?<p>Stechen abgeschlossen – Sieger: {playerName(tiebreak.winner_id||'')} ({tiebreak.score1}:{tiebreak.score2})</p>:<div className="flex flex-wrap gap-2 items-center">
        <strong>{playerName(tiebreak.player1_id)}</strong><input className={`${inputClass} w-16`} type="number" min={0} max={legs} value={tieScore[0]} onChange={e=>setTieScore(old=>[Number(e.target.value),old[1]])}/>
        <span>:</span><input className={`${inputClass} w-16`} type="number" min={0} max={legs} value={tieScore[1]} onChange={e=>setTieScore(old=>[old[0],Number(e.target.value)])}/>
        <strong>{playerName(tiebreak.player2_id)}</strong><button className={buttonClass} disabled={busy} onClick={saveTiebreak}>Stechergebnis speichern</button>
       </div>}
      </>}
     </>}
    </div>}
    <p className="text-sm">Bei Gleichstand wird ausschließlich das dokumentierte Stechspiel für die Qualifikation verwendet; die Stage-Punkte bleiben unverändert.</p><label className="flex gap-2"><input type="checkbox" checked={confirmCut} onChange={e=>setConfirmCut(e.target.checked)}/>Cut und ausscheidende Spieler geprüft</label><button className={buttonClass} disabled={busy||!confirmCut||cutCount>=stageRank.length||cutCount<2||(boundaryTie&&!tieReady&&!multiBoundaryClear)} onClick={cut}>Top {cutCount} übernehmen</button></div>}
            </section>
        <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#131720]"><div className="flex flex-wrap items-center justify-between border-b border-white/10 p-5"><div><p className="text-xs font-black uppercase tracking-widest text-orange-400">Einzelwertung</p><h2 className="mt-1 text-2xl font-black">Rangliste · aktuelle Stage</h2></div><span className="text-xs text-slate-400">Punkte → Leg-Differenz → Legs für</span></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-slate-400"><tr><th className="p-4">Platz</th><th className="p-4">Spieler</th><th className="p-4">Punkte</th><th className="p-4">S/N</th><th className="p-4">Legs</th><th className="p-4">Diff.</th></tr></thead><tbody>{stageRank.map((p,i)=><tr key={p.id} className={`border-t ${showCutPreview&&i===cutCount ? "border-t-4 border-t-orange-500" : "border-white/10"} ${showCutPreview&&i>=cutCount && totalActive>2 ? "bg-red-950/10" : ""}`}><td className="p-4 font-black text-orange-300">{i+1}.</td><td className="p-4 font-bold">{p.player_name}{showCutPreview&&i===cutCount&&totalActive>2&&<span className="ml-2 rounded bg-orange-500 px-2 py-0.5 text-[10px] font-black text-white">CUT-LINIE</span>}</td><td className="p-4 font-black">{p.points}</td><td className="p-4">{p.wins}/{p.losses}</td><td className="p-4">{p.legsFor}:{p.legsAgainst}</td><td className="p-4">{p.difference>0?'+':''}{p.difference}</td></tr>)}</tbody></table></div></section>
        {tournament.status==='completed'&&<p className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-5 font-bold text-emerald-200">Turnier abgeschlossen. Ergebnisse bleiben gespeichert.</p>}
        {tournament.status==='active'&&<div className="flex justify-end"><button className="rounded-xl border border-red-500/40 px-4 py-3 text-sm font-bold text-red-300 disabled:opacity-40" disabled={busy} onClick={()=>setShowCancelConfirm(true)}>Turnier abbrechen</button></div>}
        {tournament.status!=='active'&&<button className={buttonClass} onClick={()=>setTournament(null)}>Neues Turnier vorbereiten</button>}
      </section>}
    </div>
    {machinePickerMatch&&<div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Automat auswählen" onClick={()=>setMachinePickerMatch(null)}><div className="w-full max-w-xl rounded-[28px] border border-orange-500/30 bg-[#161b25] p-5 shadow-2xl sm:p-7" onClick={e=>e.stopPropagation()}><p className="text-xs font-black uppercase tracking-widest text-orange-400">EMD · AUTOMATENVERGABE</p><h2 className="mt-2 text-2xl font-black">Automat auswählen</h2><p className="mt-2 text-sm text-slate-300">Grün = frei · Grau = bereits vergeben. Pro Begegnung nur ein Automat.</p><div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">{Array.from({length:machineCount},(_,i)=>i+1).map(n=>{const owner=currentMatches.find(other=>other.id!==machinePickerMatch&&other.status!=='completed'&&machineAssignments[other.id]===n);const selected=machineAssignments[machinePickerMatch]===n;return <button key={n} type="button" disabled={!!owner||busy} onClick={()=>{assignMachine(machinePickerMatch,n);setMachinePickerMatch(null)}} className={`min-h-20 rounded-2xl border p-2 text-center transition ${owner?'cursor-not-allowed border-white/10 bg-white/5 text-slate-500':selected?'border-orange-400 bg-orange-500/20 text-orange-200 ring-2 ring-orange-500/30':'border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'}`}><span className="block text-2xl font-black">{n}</span><span className="mt-1 block text-[11px] font-bold">{owner?'BELEGT':selected?'GEWÄHLT':'FREI'}</span></button>})}</div><div className="mt-6 flex flex-wrap justify-between gap-3"><button type="button" disabled={!machineAssignments[machinePickerMatch]||busy} onClick={()=>{assignMachine(machinePickerMatch,0);setMachinePickerMatch(null)}} className="rounded-xl border border-red-500/35 px-4 py-3 text-sm font-bold text-red-200 disabled:opacity-30">Zuweisung entfernen</button><button type="button" onClick={()=>setMachinePickerMatch(null)} className="rounded-xl border border-white/20 px-5 py-3 font-bold">Schließen</button></div></div></div>}
    {resultConfirmation&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Ergebnis bestätigen"><div className="w-full max-w-lg rounded-[28px] border border-orange-500/40 bg-[#161b25] p-7 shadow-2xl"><p className="text-xs font-black uppercase tracking-widest text-orange-400">EMD · Ergebnisprüfung</p><h2 className="mt-2 text-2xl font-black">Ergebnis bestätigen?</h2><p className="mt-4 text-lg font-bold">{playerName(resultConfirmation.player1_id)} <span className="text-orange-400">{(scores[resultConfirmation.id]||[resultConfirmation.score1??0,resultConfirmation.score2??0]).join(' : ')}</span> {playerName(resultConfirmation.player2_id)}</p><p className="mt-2 text-sm text-slate-400">Nach dem Speichern wird die Rangliste aktualisiert.</p><div className="mt-6 flex justify-end gap-3"><button className="rounded-xl border border-white/15 px-5 py-3 font-bold" onClick={()=>setResultConfirmation(null)}>Zurück</button><button className={buttonClass} disabled={busy} onClick={()=>{const match=resultConfirmation;setResultConfirmation(null);saveMatch(match)}}>Verbindlich speichern</button></div></div></div>}
    {showCancelConfirm&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Abbruch bestätigen"><div className="w-full max-w-lg rounded-[28px] border border-red-500/30 bg-[#161b25] p-7"><h2 className="text-2xl font-black">Turnier wirklich abbrechen?</h2><p className="mt-3 text-slate-300">Diese Aktion beendet das Turnier. Alle bisherigen Daten bleiben gespeichert.</p><div className="mt-6 flex justify-end gap-3"><button className="rounded-xl border border-white/15 px-5 py-3 font-bold" onClick={()=>setShowCancelConfirm(false)}>Zurück</button><button className="rounded-xl bg-red-600 px-5 py-3 font-black" disabled={busy} onClick={cancel}>Turnier abbrechen</button></div></div></div>}
  </main>
}
