"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Activity, Radio, Trophy, Clock3 } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Group = { id: string; group_no: number; name: string | null }
type Match = { id: number; group_id: string; round_no: number; match_no: number; player1_name: string; player2_name: string }
type MatchState = { match_id: number; score1: number | null; score2: number | null; machine_number: number | null; winner: string | null; loser?: string | null }
type Member = { group_id: string; player_name: string }
type BroadcastEvent = { kind: "intro" | "start" | "winner" | "group-finished"; title: string; first?: string; second?: string; score?: string; machine?: number | null }
type IntroItem = { key: string; matchId: number; player1: string; player2: string; machineNumber: number }
type WinnerFlash = { key: string; matchId: number; winner: string; loser: string; score1: number; score2: number; machineNumber?: number }
// Gleiche ruhige TV-Bühne wie DKO, aber für lange Doppel-Teamnamen skaliert.
function BroadcastTeam({ name, featured = false }: { name: string; featured?: boolean }) {
  const players = name.split(/\s+\/\s+/).map(value => value.trim()).filter(Boolean)
  return (
    <div className={`flex min-h-0 w-full min-w-0 flex-col items-center justify-center gap-[.35vh] rounded-[16px] border px-[2.2vw] py-[1.3vh] ${featured ? "border-emerald-400/25 bg-emerald-400/[.06]" : "border-white/10 bg-[#141c27]"}`}>
      {players.map((player, index) => (
        <div key={`${index}-${player}`} className="w-full min-w-0 text-center text-[clamp(16px,2.1vw,36px)] font-bold leading-[1.16] tracking-[-.025em] text-white [overflow-wrap:anywhere]">
          {player}
        </div>
      ))}
    </div>
  )
}

function MatchIntro({ item, tournamentName }: { item: IntroItem; tournamentName: string }) {
  return (
    <div className="emd-broadcast-overlay fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#080b11] px-[3vw] py-[3vh] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(251,146,60,.12),transparent_38%)]" />
      <div className="emd-tv-enter relative flex h-full max-h-[820px] w-full max-w-[1150px] min-h-0 flex-col items-center justify-center gap-[1.5vh] text-center">
        <div className="rounded-full border border-orange-400/25 bg-orange-400/10 px-5 py-2 text-[clamp(12px,1vw,17px)] font-bold uppercase tracking-[.14em] text-orange-300">Match startet</div>
        <div className="max-w-full truncate text-[clamp(13px,1.2vw,20px)] font-medium text-slate-400">{tournamentName}</div>
        <div className="min-h-0 w-full flex-1 max-h-[28vh]"><BroadcastTeam name={item.player1} /></div>
        <div className="flex shrink-0 items-center gap-5 text-[clamp(19px,2vw,32px)] font-bold text-orange-300"><span className="h-px w-[7vw] bg-orange-300/50" />VS<span className="h-px w-[7vw] bg-orange-300/50" /></div>
        <div className="min-h-0 w-full flex-1 max-h-[28vh]"><BroadcastTeam name={item.player2} /></div>
        <div className="shrink-0 text-[clamp(15px,1.4vw,23px)] font-semibold uppercase tracking-[.12em] text-slate-300">Board {item.machineNumber}</div>
      </div>
    </div>
  )
}

function WinnerOverlay({ item, tournamentName }: { item: WinnerFlash; tournamentName: string }) {
  return (
    <div className="emd-broadcast-overlay fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-[#080b11] px-[3vw] py-[3vh] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(16,185,129,.12),transparent_38%)]" />
      <div className="emd-tv-enter relative flex h-full max-h-[820px] w-full max-w-[1150px] min-h-0 flex-col items-center justify-center gap-[1.6vh] text-center">
        <div className="shrink-0 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-5 py-2 text-[clamp(12px,1vw,17px)] font-bold uppercase tracking-[.14em] text-emerald-300">Match beendet · Sieger</div>
        <div className="min-h-0 w-full flex-1 max-h-[28vh]"><BroadcastTeam name={item.winner} featured /></div>
        <div className="shrink-0 rounded-xl border border-white/10 bg-white/[.04] px-[2.4vw] py-[.8vh] text-[clamp(30px,3.3vw,56px)] font-bold tabular-nums text-orange-300">{item.score1}:{item.score2}</div>
        <div className="shrink-0 text-[clamp(12px,1vw,17px)] text-slate-400">gegen</div>
        <div className="min-h-0 w-full flex-1 max-h-[25vh]"><BroadcastTeam name={item.loser} /></div>
        <div className="shrink-0 text-[clamp(12px,1vw,19px)] font-medium uppercase tracking-[.1em] text-slate-400">{item.machineNumber ? `Board ${item.machineNumber}` : `Match ${item.matchId}`}</div>
      </div>
    </div>
  )
}

type Standing = { name: string; played: number; wins: number; legsFor: number; legsAgainst: number; points: number }

const norm = (s: string | null | undefined) => (s || "").trim().toLocaleLowerCase()
const isWinner = (m: Match, st?: MatchState) => Boolean(st?.winner) && [norm(m.player1_name), norm(m.player2_name)].includes(norm(st?.winner))

function RoundRobinTv() {
  const query = useSearchParams()
  const tournamentId = query.get("roundRobinId") || query.get("tournamentId")
  const tournamentName = query.get("tournamentName") || "Round Robin"
  const [groups, setGroups] = useState<Group[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [states, setStates] = useState<Record<number, MatchState>>({})
  const [members, setMembers] = useState<Member[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState("")
  const [slide, setSlide] = useState<"next" | "live" | "table">("next")
  const [groupPage, setGroupPage] = useState(0)
  const [nextPage, setNextPage] = useState(0)
  const [livePage, setLivePage] = useState(0)
  const [broadcast, setBroadcast] = useState<BroadcastEvent | null>(null)
  const [eventQueue, setEventQueue] = useState<BroadcastEvent[]>([])
  const previousStates = useRef<Record<number, MatchState> | null>(null)
  const previousCompleted = useRef(false)
  const seenTournament = useRef<string | null>(null)

  const load = useCallback(async () => {
    if (!tournamentId) { setError("Keine Turnier-ID übergeben"); setLoaded(true); return }
    const [g, m, st] = await Promise.all([
      supabase.from("round_robin_groups").select("id,group_no,name").eq("round_robin_id", tournamentId).order("group_no"),
      supabase.from("round_robin_matches").select("id,group_id,round_no,match_no,player1_name,player2_name").eq("round_robin_id", tournamentId).order("round_no").order("match_no"),
      supabase.from("dko_match_states").select("match_id,score1,score2,machine_number,winner,loser").eq("tournament_id", tournamentId).eq("tournament_type", "round_robin"),
    ])
    if (g.error || m.error || st.error) { setError(g.error?.message || m.error?.message || st.error?.message || "Laden fehlgeschlagen"); setLoaded(true); return }
    const nextGroups = (g.data || []) as Group[]
    setGroups(nextGroups)
    const loadedMatches = (m.data || []) as Match[]
    const incoming = Object.fromEntries(((st.data || []) as MatchState[]).map(v => [Number(v.match_id), v])) as Record<number, MatchState>
    setMatches(loadedMatches)
    // Initiale Daten nur als Referenz speichern, keine alten Siege erneut einblenden.
    if (seenTournament.current !== tournamentId) {
      seenTournament.current = tournamentId
      previousStates.current = incoming
      previousCompleted.current = loadedMatches.length > 0 && loadedMatches.every(match => Boolean(incoming[match.id]?.winner))
      setEventQueue([{ kind: "intro", title: "TURNIER GESTARTET", first: tournamentName, second: "ROUND ROBIN" }])
    } else {
      const previous = previousStates.current || {}
      const events: BroadcastEvent[] = []
      for (const match of loadedMatches) {
        const now = incoming[match.id]
        const before = previous[match.id]
        if (!now) continue
        if (!before?.winner && now.winner) {
          events.push({ kind: "winner", title: "MATCH BEENDET", first: now.winner, second: now.loser || (norm(now.winner) === norm(match.player1_name) ? match.player2_name : match.player1_name), score: `${now.score1 ?? 0} : ${now.score2 ?? 0}`, machine: now.machine_number })
        } else if (!now.winner && Number(now.machine_number || 0) > 0 && (Number(before?.machine_number || 0) === 0 || Boolean(before?.winner))) {
          events.push({ kind: "start", title: "MATCH STARTET", first: match.player1_name, second: match.player2_name, machine: now.machine_number })
        }
      }
      const allDone = loadedMatches.length > 0 && loadedMatches.every(match => Boolean(incoming[match.id]?.winner))
      if (allDone && !previousCompleted.current) events.push({ kind: "group-finished", title: "GRUPPENPHASE BEENDET", first: "Alle Gruppenspiele abgeschlossen", second: "Weiter geht es mit der Finalrunde" })
      previousCompleted.current = allDone
      previousStates.current = incoming
      if (events.length) setEventQueue(queue => [...queue, ...events])
    }
    setStates(incoming)
    if (nextGroups.length) {
      const mr = await supabase.from("round_robin_group_players").select("group_id,player_name").in("group_id", nextGroups.map(x => x.id))
      if (!mr.error) setMembers((mr.data || []) as Member[])
    }
    setLoaded(true)
    setError("")
  }, [tournamentId, tournamentName])

  useEffect(() => { void load(); const t = window.setInterval(() => void load(), 4000); return () => window.clearInterval(t) }, [load])


  // Ereignisse nacheinander zeigen; bei mehreren gleichzeitig fertigen Matches nichts verlieren.
  useEffect(() => {
    if (broadcast || !eventQueue.length) return
    setBroadcast(eventQueue[0])
    setEventQueue(events => events.slice(1))
  }, [broadcast, eventQueue])
  useEffect(() => {
    if (!broadcast) return
    const time = broadcast.kind === "intro" || broadcast.kind === "group-finished" ? 4500 : broadcast.kind === "start" ? 2400 : 3200
    const timer = window.setTimeout(() => setBroadcast(null), time)
    return () => window.clearTimeout(timer)
  }, [broadcast])

  const live = useMemo(() => matches.filter(m => !states[m.id]?.winner && Number(states[m.id]?.machine_number || 0) > 0), [matches, states])
  const next = useMemo(() => matches.filter(m => !states[m.id]?.winner && !Number(states[m.id]?.machine_number || 0)), [matches, states])
  const done = useMemo(() => matches.filter(m => Boolean(states[m.id]?.winner)).length, [matches, states])
  const tables = useMemo(() => groups.map(group => {
    const ms = matches.filter(m => m.group_id === group.id)
    const names = new Set<string>(members.filter(p => p.group_id === group.id).map(p => p.player_name))
    ms.forEach(m => {names.add(m.player1_name);names.add(m.player2_name)})
    const rows: Standing[] = [...names].map(name => {
      let played=0,wins=0,legsFor=0,legsAgainst=0
      for (const m of ms) {
        const side = norm(m.player1_name) === norm(name) ? 1 : norm(m.player2_name) === norm(name) ? 2 : 0
        const st = states[m.id]
        if (!side || !st?.winner || !isWinner(m, st)) continue
        played++;if (norm(st.winner)===norm(name)) wins++
        legsFor += Number(side===1 ? st.score1 ?? 0 : st.score2 ?? 0)
        legsAgainst += Number(side===1 ? st.score2 ?? 0 : st.score1 ?? 0)
      }
      return {name,played,wins,legsFor,legsAgainst,points:wins*2}
    }).sort((a,b) => b.points-a.points || (b.legsFor-b.legsAgainst)-(a.legsFor-a.legsAgainst) || b.legsFor-a.legsFor || a.name.localeCompare(b.name))
    return {group,rows,done:ms.filter(m=>Boolean(states[m.id]?.winner)).length,total:ms.length}
  }),[groups, matches, members, states])
  // Die Anzeigefolien verwenden ausschließlich vorhandene Live-Daten.
  // Kein Schreiben in Supabase und keine Änderung am Turnierablauf.
  useEffect(() => {
    if (!loaded || error) return
    const duration = slide === "next" ? 10000 : slide === "live" ? 15000 : 12000
    const timer = window.setTimeout(() => {
      if (slide === "next") {
        if (live.length) setSlide("live")
        else setSlide("table")
      } else if (slide === "live") {
        setSlide("table")
      } else {
        setGroupPage(value => value + 1)
        setNextPage(value => value + 1)
        setLivePage(value => value + 1)
        setSlide("next")
      }
    }, duration)
    return () => window.clearTimeout(timer)
  }, [slide, loaded, error, live.length])

  const visibleNext = next.slice((nextPage * 3) % Math.max(1, next.length), (nextPage * 3) % Math.max(1, next.length) + 3)
  const visibleLive = live.slice((livePage * 3) % Math.max(1, live.length), (livePage * 3) % Math.max(1, live.length) + 3)
  const currentTable = tables.length ? tables[groupPage % tables.length] : null

  const progressPercent = matches.length ? Math.round((done / matches.length) * 100) : 0
  const matchCard = (match: Match, active: boolean) => {
    const state = states[match.id]
    return (
      <article key={match.id} className="min-w-0 overflow-hidden rounded-[16px] border border-white/10 bg-[#131a25] h-[clamp(106px,12.2vh,126px)] flex flex-col">
        <div className="flex h-[clamp(32px,3.3vh,38px)] shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-white/[.035] px-[1vw] py-[.45vh]">
          <div className="min-w-0 truncate text-[clamp(10px,.82vw,14px)] font-extrabold uppercase tracking-[.12em] text-slate-200">RUNDE {match.round_no} · MATCH {match.match_no}</div>
          <span className="shrink-0 rounded-md border border-orange-400/22 bg-orange-400/10 px-[.52vw] py-[.2vh] text-[clamp(9px,.78vw,13px)] font-black uppercase tracking-[.08em] text-orange-300">{active ? `Board ${state?.machine_number ?? "–"}` : "Als Nächstes"}</span>
        </div>
        <div className="flex-1 px-[1vw] py-[.8vh]">
          <div className="flex h-full flex-col justify-center gap-[.55vh]">
            <div className="flex min-w-0 items-center justify-between gap-[.8vw]">
              <div className="min-w-0 truncate text-[clamp(12px,1.02vw,19px)] font-extrabold leading-tight text-white" title={match.player1_name}>{match.player1_name}</div>
              {active && <div className="shrink-0 text-[clamp(16px,1.32vw,22px)] font-black tabular-nums text-orange-300">{state?.score1 ?? 0}</div>}
            </div>
            <div className="flex min-w-0 items-center justify-between gap-[.8vw]">
              <div className="min-w-0 truncate text-[clamp(12px,1.02vw,19px)] font-extrabold leading-tight text-white" title={match.player2_name}>{match.player2_name}</div>
              {active && <div className="shrink-0 text-[clamp(16px,1.32vw,22px)] font-black tabular-nums text-orange-300">{state?.score2 ?? 0}</div>}
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <main className="relative flex h-dvh min-h-0 flex-col overflow-hidden bg-[#090d14] px-[2vw] py-[1.15vh] text-white">
      <style jsx global>{`@keyframes emdTvSimpleIn { from {opacity:0;transform:translate3d(0,12px,0)} to {opacity:1;transform:translate3d(0,0,0)} } .emd-tv-enter {animation:emdTvSimpleIn .35s ease-out both} @media(prefers-reduced-motion:reduce){.emd-tv-enter{animation:none}}`}</style>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[36vh] bg-[radial-gradient(ellipse_at_50%_0%,rgba(249,115,22,.09),transparent_68%)]" />
      <header className="relative mb-[1vh] shrink-0 overflow-hidden rounded-[20px] border border-white/10 bg-[#101620] px-[1.15vw] py-[.95vh] shadow-[0_18px_60px_-38px_rgba(0,0,0,.7)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[4px] bg-white/[.08]"><div className="h-full bg-[#FF941F] transition-[width] duration-500" style={{width: `${progressPercent}%`}} /></div>
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-[.9vw]">
            <div className="grid h-[clamp(34px,2.55vw,44px)] w-[clamp(34px,2.55vw,44px)] shrink-0 place-items-center rounded-xl border border-orange-400/20 bg-[#171f2b]"><Radio className="h-[clamp(16px,1.18vw,20px)] w-[clamp(16px,1.18vw,20px)] text-orange-300" /></div>
            <h1 className="min-w-0 truncate text-[clamp(18px,1.6vw,28px)] font-black tracking-[-.04em]">{tournamentName}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-[.65vw] text-[clamp(10px,.8vw,14px)] font-bold">
            <span className="tabular-nums text-[#FF941F]">{progressPercent}%</span>
            <span className="rounded-md border border-emerald-400/25 bg-emerald-400/[.08] px-[.72vw] py-[.46vh] text-emerald-300">● {live.length} LIVE</span>
            <span className="rounded-md border border-white/10 bg-white/[.03] px-[.72vw] py-[.46vh] text-slate-300">{done} BEENDET</span>
            <span className="rounded-md border border-white/10 bg-white/[.03] px-[.72vw] py-[.46vh] text-slate-400">{groups.length} GRUPPEN</span>
            <a href="https://emojisdartverein.com/live-all-app" target="_blank" rel="noopener noreferrer" className="ml-[.4vw] flex items-center gap-[.65vw] border-l border-white/10 pl-[.9vw]" aria-label="Live am Handy"><img src="/emd-live-qr.png" alt="QR-Code Live-Turnier" className="block h-[clamp(54px,4vw,74px)] w-[clamp(54px,4vw,74px)] rounded bg-white p-[3px]" /><span className="text-[clamp(10px,.72vw,13px)] uppercase text-slate-300">Live am Handy</span></a>
          </div>
        </div>
      </header>
      {!loaded ? (
        <div className="grid flex-1 place-items-center text-xl text-slate-400">Turnierdaten werden geladen …</div>
      ) : error ? (
        <div className="grid flex-1 place-items-center text-rose-300">{error}</div>
      ) : (
        <section className="relative mt-[.3vh] flex min-h-0 flex-1 flex-col rounded-[20px] border border-white/10 bg-[#101620] px-[1.5vw] py-[1.2vh]">
          <div className="mb-[1.6vh] flex shrink-0 items-center justify-between gap-3 border-b border-white/10 pb-[1.3vh]">
            <div className="flex items-center gap-3">
              {slide === "next" ? <Clock3 className="h-5 w-5 text-orange-400" /> : slide === "live" ? <Radio className="h-5 w-5 text-emerald-300" /> : <Trophy className="h-5 w-5 text-orange-400" />}
              <h2 className="text-[clamp(19px,1.55vw,28px)] font-bold">{slide === "next" ? "Als Nächstes" : slide === "live" ? "Live Matches" : "Gruppentabelle"}</h2>
            </div>
            <span className="text-[clamp(12px,1vw,20px)] text-slate-400">
              {slide === "next" ? `${next.length} Begegnungen offen` : slide === "live" ? `${live.length} laufende Matches` : currentTable ? `${currentTable.group.name || `Gruppe ${currentTable.group.group_no}`} · ${currentTable.done}/${currentTable.total} gespielt` : "Keine Gruppen"}
            </span>
          </div>

          {slide === "next" && (
            visibleNext.length ? (
              <div className="grid min-h-0 flex-1 grid-cols-2 content-start auto-rows-min gap-[.9vw]">
                {visibleNext.map(match => matchCard(match, false))}
              </div>
            ) : <div className="grid flex-1 place-items-center text-[clamp(18px,1.6vw,30px)] text-slate-400">Keine weiteren Begegnungen offen</div>
          )}

          {slide === "live" && (
            visibleLive.length ? (
              <div className={`grid min-h-0 flex-1 content-start auto-rows-min gap-[1.2vw] ${visibleLive.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {visibleLive.map(match => matchCard(match, true))}
              </div>
            ) : <div className="grid flex-1 place-items-center gap-3 text-slate-400"><Activity className="h-10 w-10 text-orange-400" />Zurzeit kein Match live</div>
          )}

          {slide === "table" && (
            currentTable ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-[1.4vh] text-[clamp(12px,.85vw,16px)] text-slate-400">Sieg = 2 Punkte · Bei Gleichstand entscheidet die Leg-Differenz</div>
                <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_5vw_5vw_7vw_5vw] gap-2 border-b border-white/15 px-[1vw] py-[1vh] text-[clamp(10px,.75vw,14px)] font-semibold uppercase text-slate-400">
                  <span>Team</span><span>SP</span><span>S</span><span>Legs</span><span>Pkt.</span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col justify-evenly">
                  {currentTable.rows.map((row, index) => (
                    <div key={row.name} className="grid min-h-0 grid-cols-[minmax(0,1fr)_5vw_5vw_7vw_5vw] items-center gap-2 border-b border-white/[.07] px-[1vw] py-[.45vh] text-[clamp(11px,1vw,18px)]">
                      <span className="min-w-0 font-medium break-words [overflow-wrap:anywhere]"><span className="mr-[.7vw] text-orange-400">{index + 1}.</span>{row.name}</span>
                      <span className="tabular-nums text-slate-300">{row.played}</span>
                      <span className="tabular-nums text-emerald-300">{row.wins}</span>
                      <span className="tabular-nums text-slate-300">{row.legsFor}-{row.legsAgainst}</span>
                      <span className="tabular-nums font-semibold text-orange-300">{row.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="grid flex-1 place-items-center text-slate-400">Keine Gruppentabelle vorhanden</div>
          )}

          <div className="mt-[1.4vh] flex shrink-0 items-center justify-center gap-2" aria-label="TV-Anzeigezyklus">
            {(["next", "live", "table"] as const).filter(item => item !== "live" || live.length > 0).map(item => (
              <span key={item} className={`h-[.45vh] min-h-[3px] w-[4vw] rounded-full ${slide === item ? "bg-orange-500" : "bg-white/15"}`} />
            ))}
          </div>
        </section>
      )}
      {broadcast?.kind === "start" && <MatchIntro tournamentName={tournamentName} item={{ key: `start-${broadcast.first}-${broadcast.second}`, matchId: 0, player1: broadcast.first || "", player2: broadcast.second || "", machineNumber: broadcast.machine || 0 }} />}
      {broadcast?.kind === "winner" && <WinnerOverlay tournamentName={tournamentName} item={{ key: `finish-${broadcast.first}`, matchId: 0, winner: broadcast.first || "", loser: broadcast.second || "", score1: Number((broadcast.score || "0:0").split(":")[0]), score2: Number((broadcast.score || "0:0").split(":")[1]), machineNumber: broadcast.machine || undefined }} />}
      {broadcast && broadcast.kind !== "start" && broadcast.kind !== "winner" && (
        <div className="emd-broadcast-overlay fixed inset-0 z-[60] flex items-center justify-center bg-[#080b11] text-center text-white">
          <div className="emd-tv-enter max-w-[85vw]"><div className="text-[clamp(12px,1vw,20px)] font-bold uppercase tracking-[.18em] text-orange-300">EMD MEMBERS CHAMPION CUP</div><div className="mt-7 text-[clamp(30px,3vw,56px)] font-black">{broadcast.title}</div><div className="mt-6 text-[clamp(18px,2vw,38px)]">{broadcast.first}</div></div>
        </div>
      )}
    </main>
  )
}

export default function RoundRobinBeamerPage() {
  return <Suspense fallback={<main className="h-dvh bg-[#070c13]" />}><RoundRobinTv /></Suspense>
}
