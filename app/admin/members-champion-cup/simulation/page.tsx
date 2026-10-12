"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, RefreshCw, ShieldCheck, Shuffle, Users } from "lucide-react"

type Level = 1 | 2 | 3
type Person = { id: string; name: string; level: Level; points: number }
type Team = { id: string; a: Person; b: Person }
type Match = { id: string; a: Team; b: Team; winner: string | null }
const mix = <T,>(arr: T[]): T[] => {
  const next = [...arr]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}
const sortPoints = (a: Person, b: Person) => b.points - a.points
const card = "rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5"
const btn = "rounded-xl border border-orange-400/30 bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"

export default function MembersCupSimulation() {
  const search = useSearchParams()
  const seriesId = search.get("seriesId") || ""
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [count, setCount] = useState(16)
  const [selected, setSelected] = useState<Person[]>([])
  const [absent, setAbsent] = useState<string[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [stage, setStage] = useState<"participants" | "attendance" | "draw" | "matches">("participants")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      if (!seriesId) { setError("Serien-ID fehlt. Bitte aus der Serienverwaltung öffnen."); setLoading(false); return }
      try {
        const [{ data: players, error: pe }, { data: levels, error: le }] = await Promise.all([
          supabase.from("spieldatenbank").select("id,name"),
          supabase.from("dko_series_player_levels").select("spieldatenbank_id,level_group,average_points").eq("series_id", seriesId),
        ])
        if (pe) throw pe
        if (le) throw le
        const levelMap = new Map((levels || []).map((p: any) => [String(p.spieldatenbank_id), p]))
        const result: Person[] = (players || []).flatMap((p: any) => {
          const lvl: any = levelMap.get(String(p.id))
          const group = Number(lvl?.level_group)
          return group === 1 || group === 2 || group === 3
            ? [{ id: String(p.id), name: String(p.name), level: group as Level, points: Number(lvl?.average_points) || 0 }]
            : []
        }).sort((a, b) => a.name.localeCompare(b.name, "de"))
        if (!cancelled) { setPeople(result); setCount(Math.min(16, Math.floor(result.length / 2) * 2)) }
      } catch (err: any) { if (!cancelled) setError(err?.message || "Einstufungen konnten nicht geladen werden.") }
      finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [seriesId])

  const active = useMemo(() => selected.filter(p => !absent.includes(p.id)), [selected, absent])
  const possible = !loading && people.length >= 2
  const start = () => {
    setSelected(mix(people).slice(0, count).sort((a,b) => a.name.localeCompare(b.name, "de")))
    setAbsent([]); setTeams([]); setMatches([]); setStage("attendance")
  }
  const draw = () => {
    if (active.length < 2 || active.length % 2 !== 0) { setError("Für die Auslosung ist eine gerade Zahl von mindestens zwei anwesenden Spielern erforderlich."); return }
    setError("")
    const target = active.length / 2
    const groupA = active.filter(x => x.level === 1)
    const groupB = active.filter(x => x.level === 3)
    const middle = mix(active.filter(x => x.level === 2)).sort(sortPoints)
    for (const p of middle) {
      if (groupA.length < target && groupB.length < target) {
        if (groupA.length <= groupB.length) groupA.push(p); else groupB.push(p)
      } else if (groupA.length < target) groupA.push(p)
      else if (groupB.length < target) groupB.push(p)
      else { setError("Die Gruppen lassen sich nicht ausgleichen."); return }
    }
    while (groupA.length < target && groupB.length > target) {
      groupB.sort(sortPoints); groupA.push(groupB.shift()!)
    }
    while (groupB.length < target && groupA.length > target) {
      groupA.sort((a,b) => a.points-b.points); groupB.push(groupA.shift()!)
    }
    if (groupA.length !== target || groupB.length !== target) {
      setError(`Gruppen ungleich: A ${groupA.length}, B ${groupB.length}. Auslosung abgebrochen.`); return
    }
    const a = mix(groupA), b = mix(groupB)
    const t = a.map((p,i) => ({id:`team-${i+1}`,a:p,b:b[i]}))
    setTeams(t)
    setMatches([])
    setStage("draw")
  }
  const createMatches = () => {
    const next: Match[] = []
    // Entspricht der realen Members-Cup-Auslosungsseite: jede Paarung einmal.
    for (let i=0;i<teams.length;i++) for(let j=i+1;j<teams.length;j++) {
      next.push({id:`${teams[i].id}_${teams[j].id}`,a:teams[i],b:teams[j],winner:null})
    }
    setMatches(next); setStage("matches")
  }
  const results = useMemo(() => {
    const rows = teams.map(t => ({ team:t, win:0, played:0 }))
    for (const m of matches) if (m.winner) for (const r of rows) {
      if (r.team.id === m.a.id || r.team.id === m.b.id) {r.played++;if(r.team.id===m.winner)r.win++}
    }
    return rows.sort((a,b)=>b.win-a.win || b.played-a.played)
  },[teams,matches])
  const fullname = (t: Team) => `${t.a.name} / ${t.b.name}`
  return <main className="min-h-screen bg-[#070b10] px-4 py-8 text-white sm:px-8">
    <div className="mx-auto max-w-6xl space-y-5">
      <Link href="/admin/turnier_spieltage_starten" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft size={16}/> Zur Turnierverwaltung</Link>
      <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-[#23140d] to-[#0d0a13] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mb-1 text-xs font-black uppercase tracking-widest text-orange-300">EMD Members Champion Cup</p><h1 className="text-2xl font-black sm:text-3xl">Geschützte Turnier-Simulation</h1></div><span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-300">NUR LESEN · KEINE SPEICHERUNG</span></div>
        <p className="mt-3 text-sm leading-relaxed text-white/65"><ShieldCheck className="mr-2 inline-block h-4 w-4 text-emerald-300"/>Echte Namen und Einstufungen aus Supabase. Alle Testanmeldungen, Anwesenheiten, Paarungen und Ergebnisse existieren nur im Browser. Kein Schreibzugriff auf Tabellen, Ranglisten oder Spieltage.</p>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-950/50 p-4 text-sm text-red-200">{error}</div>}
      {loading ? <div className={card}>Spieler und Einstufungen werden geladen …</div> : <div className="grid gap-3 sm:grid-cols-4">
        {([["Eingestuft",people.length],["Tabelle 1",people.filter(p=>p.level===1).length],["Tabelle 2",people.filter(p=>p.level===2).length],["Tabelle 3",people.filter(p=>p.level===3).length]] as const).map(([k,v])=><div key={k} className={card}><div className="text-xs font-semibold text-white/50">{k}</div><div className="mt-1 text-2xl font-black">{v}</div></div>)}
      </div>}
      <section className={card}><div className="mb-4 flex items-center gap-2 font-black"><Users className="text-orange-400" size={18}/> 1. Testteilnehmer & Anwesenheit</div>
        <div className="flex flex-wrap items-end gap-3"><label className="text-sm text-white/70">Teilnehmerzahl<select className="mt-2 block rounded-xl border border-white/20 bg-[#12161c] px-4 py-3 text-white" value={count} onChange={e=>setCount(Number(e.target.value))}>{[8,16,24,32,40].filter(n=>n<=people.length).map(n=><option key={n} value={n}>{n} Spieler</option>)}{people.length >= 2 && people.length < 8 && <option value={Math.floor(people.length/2)*2}>{Math.floor(people.length/2)*2} Spieler</option>}</select></label><button className={btn} onClick={start} disabled={!possible || count < 2 || count > people.length || count % 2 !== 0}><RefreshCw className="mr-2 inline h-4 w-4"/> Testbesetzung ziehen</button></div>
        {stage !== "participants" && <><p className="mt-4 text-sm text-white/60">Anwesenheit anklicken: {active.length} spielt · {absent.length} nicht erschienen. Nur die Simulation wird verändert.</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{selected.map(p=><button key={p.id} onClick={()=>{setAbsent(old=>old.includes(p.id)?old.filter(x=>x!==p.id):[...old,p.id]);setTeams([]);setMatches([]);setStage("attendance")}} className={`flex items-center justify-between rounded-xl border p-3 text-left text-sm ${absent.includes(p.id)?"border-red-500/30 bg-red-500/10 text-white/45":"border-white/10 bg-white/[0.04]"}`}><span className="truncate">{p.name}<span className="ml-2 text-xs text-white/40">T{p.level}</span></span><span className={absent.includes(p.id)?"text-red-300":"text-emerald-300"}>{absent.includes(p.id)?"Fehlt":"Dabei"}</span></button>)}</div><button className={`${btn} mt-4`} onClick={draw} disabled={active.length<2 || active.length%2!==0}><Shuffle className="mr-2 inline h-4 w-4"/> Gruppen A/B und Doppel auslosen</button>{active.length%2!==0 && <p className="mt-2 text-xs text-orange-300">Ungerade Spielerzahl: einen Teilnehmer korrigieren, bevor du auslost.</p>}</>}
      </section>
      {(stage==="draw"||stage==="matches")&&<section className={card}><h2 className="mb-3 font-black">2. Test-Auslosung · {teams.length} Doppel</h2><div className="grid gap-2 md:grid-cols-2">{teams.map((t,i)=><div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm" key={t.id}><span className="mr-2 text-orange-400">#{i+1}</span>{fullname(t)}<div className="mt-1 text-xs text-white/45">Gruppe A: T{t.a.level} · Gruppe B: T{t.b.level}</div></div>)}</div><button className={`${btn} mt-4`} onClick={createMatches}>Round Robin als Test erzeugen</button></section>}
      {stage==="matches"&&<section className={card}><h2 className="font-black">3. Round-Robin-Test · {matches.length} Begegnungen</h2><p className="mt-1 text-xs text-white/55">Klick auf Sieger: Testwert setzen oder wieder löschen. Keine Live-Turnierdaten.</p><div className="mt-4 grid gap-2 lg:grid-cols-2">{matches.map(m=><div key={m.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="mb-2 text-xs text-white/45">Begegnung</p><div className="grid gap-2 sm:grid-cols-2">{[m.a,m.b].map(t=><button key={t.id} onClick={()=>setMatches(old=>old.map(x=>x.id===m.id?{...x,winner:x.winner===t.id?null:t.id}:x))} className={`rounded-lg border px-3 py-2 text-left text-sm ${m.winner===t.id?"border-emerald-400/60 bg-emerald-600/20 text-emerald-100":"border-white/10 bg-white/[0.04] text-white/75"}`}>{fullname(t)}{m.winner===t.id?" ✓":""}</button>)}</div></div>)}</div><h3 className="mt-6 mb-3 font-black">Test-Tabelle</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-white/50"><tr><th className="py-2">Doppel</th><th>Spiele</th><th>Siege</th></tr></thead><tbody>{results.map(r=><tr className="border-t border-white/10" key={r.team.id}><td className="py-3 pr-4">{fullname(r.team)}</td><td>{r.played}</td><td className="font-bold text-orange-300">{r.win}</td></tr>)}</tbody></table></div><p className="mt-4 text-xs text-orange-200/75">Dies ist eine isolierte Vorschau für Auslosung und Round Robin – keine echte Turnier-Engine, KO-Qualifikation oder Punktevergabe.</p></section>}
    </div>
  </main>
}
