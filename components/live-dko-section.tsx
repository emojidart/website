"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { Trophy, Zap, Clock, Target, RefreshCcw, Calendar } from "lucide-react"

interface Match {
  id: number
  player1: string
  player2: string
  player1_id?: string | null
  player2_id?: string | null
  score1: number
  score2: number
  winner?: string
  loser?: string
  machineNumber?: number
}

interface ActiveTournament {
  tournament_id: string
  tournament_type: string
  status: string
  tournament_name: string
  created_at: string
}

interface Ranking {
  player_name: string
  placement: number
  eliminated_at: string
}

const isFreilos = (playerName: string): boolean => {
  return playerName.startsWith("Freilos")
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function LiveDKOSection() {
  const [matches, setMatches] = useState<Record<number, Match>>({})
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [activeTournament, setActiveTournament] = useState<ActiveTournament | null>(null)
  const activeTournamentRef = useRef<ActiveTournament | null>(null)
  const [rankings, setRankings] = useState<Ranking[]>([])

  const [currentPlayerSpieldbId, setCurrentPlayerSpieldbId] = useState<string | null>(null)
  const [scoreDrafts, setScoreDrafts] = useState<Record<number, { score1: string; score2: string }>>({})
  const [savingMatchId, setSavingMatchId] = useState<number | null>(null)

  const getBracketSize = (): 8 | 16 | 32 | 64 | 128 => {
    if (!activeTournament) return 16
    const match = activeTournament.tournament_type.match(/(\d+)er_dko|dko_(\d+)/)
    if (match) {
      // Extract the number from either capture group
      const size = Number.parseInt(match[1] || match[2])
      if (size === 8 || size === 16 || size === 32 || size === 64 || size === 128) {
        return size
      }
    }
    return 16
  }

  const bracketSize = getBracketSize()

  useEffect(() => {
    const loadCurrentPlayer = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError || !authData?.user) {
          setCurrentPlayerSpieldbId(null)
          return
        }

        const userId = authData.user.id

        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("player_id")
          .eq("user_id", userId)
          .maybeSingle()

        if (profileError || !profile?.player_id) {
          setCurrentPlayerSpieldbId(null)
          return
        }

        const { data: clubPlayer, error: clubError } = await supabase
          .from("club_players")
          .select("spieldatenbank_id")
          .eq("id", profile.player_id)
          .maybeSingle()

        if (clubError || !clubPlayer?.spieldatenbank_id) {
          setCurrentPlayerSpieldbId(null)
          return
        }

        setCurrentPlayerSpieldbId(clubPlayer.spieldatenbank_id)
      } catch (err) {
        setCurrentPlayerSpieldbId(null)
      }
    }

    loadCurrentPlayer()
  }, [])

  useEffect(() => {
    const loadActiveTournament = async () => {
      try {
        const { data, error } = await supabase
          .from("tournaments_status")
          .select("tournament_id, tournament_type, status, tournament_name, created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          setLoading(false)
          return
        }

        if (data) {
          const nextTournament: ActiveTournament = {
            tournament_id: data.tournament_id,
            tournament_type: data.tournament_type,
            status: data.status,
            tournament_name: data.tournament_name,
            created_at: data.created_at,
          }

          activeTournamentRef.current = nextTournament
          setActiveTournament(nextTournament)
        } else {
          activeTournamentRef.current = null
          setActiveTournament(null)
          setMatches({})
          setRankings([])
        }
      } catch (error) {
        console.error("Fehler beim Laden des aktiven DKO-Turniers:", error)
      } finally {
        setLoading(false)
      }
    }

    loadActiveTournament()

    const channel = supabase
      .channel("tournament_status_changes_dko")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournaments_status",
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const data = payload.new as any

            const nextTournament: ActiveTournament = {
              tournament_id: data.tournament_id,
              tournament_type: data.tournament_type,
              status: data.status,
              tournament_name: data.tournament_name,
              created_at: data.created_at,
            }

            if (data.status === "active") {
              // Nur das neueste aktive Turnier darf die Live-Ansicht übernehmen.
              const current = activeTournamentRef.current
              const currentCreatedAt = current?.created_at ? new Date(current.created_at).getTime() : 0
              const nextCreatedAt = data.created_at ? new Date(data.created_at).getTime() : 0

              if (!current || current.status !== "active" || nextCreatedAt >= currentCreatedAt) {
                activeTournamentRef.current = nextTournament
                setActiveTournament(nextTournament)
                setLoading(false)
              }
            } else if (data.status === "cancelled" || data.status === "completed") {
              // Statusänderungen anderer/alter DKO-Turniere dürfen das aktuell
              // angezeigte Turnier nicht mehr löschen oder überschreiben.
              const current = activeTournamentRef.current
              if (!current || current.tournament_id !== data.tournament_id) return

              if (data.status === "completed") {
                activeTournamentRef.current = nextTournament
                setActiveTournament(nextTournament)
              } else {
                activeTournamentRef.current = null
                setActiveTournament(null)
                setMatches({})
                setRankings([])
              }
            }
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as any
            const current = activeTournamentRef.current

            if (current && current.tournament_id === deleted.tournament_id) {
              activeTournamentRef.current = null
              setActiveTournament(null)
              setMatches({})
              setRankings([])
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!activeTournament) return

    const loadMatches = async () => {
      try {
        const { data, error } = await supabase
          .from("dko_match_states")
          .select("*")
          .eq("tournament_id", activeTournament.tournament_id)
          .order("match_id", { ascending: true })

        if (error) throw error

        if (data && data.length > 0) {
          const matchesData: Record<number, Match> = {}
          data.forEach((state) => {
            matchesData[state.match_id] = {
              id: state.match_id,
              player1: state.player1 || "",
              player2: state.player2 || "",
              player1_id: state.player1_id || null,
              player2_id: state.player2_id || null,
              score1: state.score1 || 0,
              score2: state.score2 || 0,
              winner: state.winner || undefined,
              loser: state.loser || undefined,
              machineNumber: state.machine_number || undefined,
            }
          })
          setMatches(matchesData)
        }
      } catch (error) {
      } finally {
        setLoading(false)
      }
    }

    loadMatches()
  }, [activeTournament])

  useEffect(() => {
    if (!activeTournament) return

    const channel = supabase
      .channel("dko_match_updates_section")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dko_match_states",
          filter: `tournament_id=eq.${activeTournament.tournament_id}`,
        },
        (payload) => {
          setLastUpdate(new Date())

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const state = payload.new as any
            setMatches((prev) => ({
              ...prev,
              [state.match_id]: {
                id: state.match_id,
                player1: state.player1 || "",
                player2: state.player2 || "",
                player1_id: state.player1_id || null,
                player2_id: state.player2_id || null,
                score1: state.score1 || 0,
                score2: state.score2 || 0,
                winner: state.winner || undefined,
                loser: state.loser || undefined,
                machineNumber: state.machine_number || undefined,
              },
            }))
          } else if (payload.eventType === "DELETE") {
            const deletedId = Number((payload.old as any)?.match_id)
            if (Number.isFinite(deletedId) && deletedId > 0) {
              setMatches(prev => {
                const next = { ...prev }
                delete next[deletedId]
                return next
              })
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeTournament])

  useEffect(() => {
    if (!activeTournament) return

    const loadRankings = async () => {
      try {
        const { data, error } = await supabase
          .from("dko_rankings")
          .select("player_name, placement, eliminated_at")
          .eq("tournament_type", activeTournament.tournament_type)
          .eq("tournament_id", activeTournament.tournament_id)
          .order("placement", { ascending: true })

        if (error) throw error

        setRankings(data || [])
      } catch (error) {}
    }

    loadRankings()
  }, [activeTournament])

  useEffect(() => {
    if (!activeTournament) return

    const channel = supabase
      .channel("dko_rankings_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dko_rankings",
          filter: `tournament_id=eq.${activeTournament.tournament_id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newRanking = payload.new as Ranking
            setRankings((prev) => {
              const exists = prev.some((r) => r.player_name === newRanking.player_name)
              if (exists) return prev
              return [...prev, newRanking].sort((a, b) => a.placement - b.placement)
            })
          } else if (payload.eventType === "DELETE") {
            const deletedRanking = payload.old as Ranking
            setRankings((prev) => prev.filter((r) => r.player_name !== deletedRanking.player_name))
          } else if (payload.eventType === "UPDATE") {
            const updatedRanking = payload.new as Ranking
            setRankings((prev) =>
              prev
                .map((r) => (r.player_name === updatedRanking.player_name ? updatedRanking : r))
                .sort((a, b) => a.placement - b.placement),
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeTournament])

  const canEditMatch = (match: Match) => {
    if (!currentPlayerSpieldbId) return false
    return match.player1_id === currentPlayerSpieldbId || match.player2_id === currentPlayerSpieldbId
  }

  const setDraft = (matchId: number, field: "score1" | "score2", value: string) => {
    // keep only digits, avoid weird mobile keyboard chars
    const cleaned = (value ?? "").replace(/\D/g, "")
    setScoreDrafts((prev) => ({
      ...prev,
      [matchId]: {
        score1: field === "score1" ? cleaned : prev[matchId]?.score1 ?? "",
        score2: field === "score2" ? cleaned : prev[matchId]?.score2 ?? "",
      },
    }))
  }

  const bumpDraft = (matchId: number, field: "score1" | "score2", delta: number) => {
    setScoreDrafts((prev) => {
      const current = prev[matchId]?.[field] ?? ""
      const n = Number.parseInt(current === "" ? "0" : current, 10)
      const next = Number.isNaN(n) ? 0 : Math.max(0, n + delta)
      return {
        ...prev,
        [matchId]: {
          score1: field === "score1" ? String(next) : prev[matchId]?.score1 ?? "",
          score2: field === "score2" ? String(next) : prev[matchId]?.score2 ?? "",
        },
      }
    })
  }

  const quickSet = (matchId: number, field: "score1" | "score2", value: number) => {
    setDraft(matchId, field, String(Math.max(0, value)))
  }

  const saveResult = async (match: Match) => {
    if (!activeTournament) return
    if (!canEditMatch(match)) return
    if (match.winner) return

    const draft = scoreDrafts[match.id] ?? { score1: String(match.score1 ?? 0), score2: String(match.score2 ?? 0) }
    const s1 = Number.parseInt(draft.score1, 10)
    const s2 = Number.parseInt(draft.score2, 10)

    if (Number.isNaN(s1) || Number.isNaN(s2)) return
    if (s1 === s2) return

    const winner = s1 > s2 ? match.player1 : match.player2
    const loser = s1 > s2 ? match.player2 : match.player1

    setSavingMatchId(match.id)
    try {
      const { error } = await supabase
        .from("dko_match_states")
        .update({
          score1: s1,
          score2: s2,
          winner,
          loser,
          machine_number: null,
          updated_at: new Date().toISOString(),
        })
        .eq("tournament_id", activeTournament.tournament_id)
        .eq("tournament_type", activeTournament.tournament_type)
        .eq("match_id", match.id)

      if (error) {
        console.error("Error saving result:", error)
      }
    } finally {
      setSavingMatchId(null)
    }
  }

  const activeMatches = Object.values(matches).filter((m) => m.machineNumber && !m.winner)
  const completedMatches = Object.values(matches)
    .filter((m) => m.winner)
    .sort((a, b) => b.id - a.id)
    .slice(0, 6)
  const upcomingMatches = Object.values(matches)
    .filter(
      (m) => m.player1 && m.player2 && !m.machineNumber && !m.winner && !isFreilos(m.player1) && !isFreilos(m.player2),
    )
    .slice(0, 4)

  const getTournamentWinner = () => {
    if (bracketSize === 8) return matches[15]?.winner || matches[14]?.winner
    if (bracketSize === 16) return matches[31]?.winner || matches[30]?.winner
    if (bracketSize === 32) return matches[63]?.winner || matches[62]?.winner
    if (bracketSize === 64) return matches[127]?.winner || matches[126]?.winner
    if (bracketSize === 128) return matches[255]?.winner || matches[254]?.winner
    return null
  }

  const tournamentWinner = getTournamentWinner()
  const isTournamentCompleted = activeTournament?.status === "completed"
  const completedCount = Object.values(matches).filter((m) => m.winner).length
  const progressTotal = Math.max(1, 2 * bracketSize - 2 + (matches[2 * bracketSize - 1] ? 1 : 0))
  const progress = Math.min(100, Math.round((completedCount / progressTotal) * 100))

  const compactMatches = Object.values(matches).sort((a,b) => a.id-b.id)
  const finalId = 2 * bracketSize - 2
  const resetId = 2 * bracketSize - 1

  if (loading) return <div className="rounded-2xl border border-white/10 bg-[#101620] p-8 text-center font-semibold text-slate-400">Live-Daten werden geladen …</div>
  if (!activeTournament) return <div className="rounded-2xl border border-white/10 bg-[#101620] p-8 text-center"><Trophy className="mx-auto mb-3 h-8 w-8 text-slate-500"/><p className="font-bold text-white">Momentan läuft kein Doppel-KO-Turnier.</p><p className="mt-1 text-sm text-slate-400">Sobald ein Turnier startet, erscheint es hier automatisch.</p></div>

  return (
    <div className="space-y-4 pb-4 sm:space-y-5">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#101620]">
        <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-orange-400/20 bg-orange-400/10"><Trophy className="h-5 w-5 text-orange-300" /></div>
          <div className="min-w-0 flex-1"><h2 className="break-words text-lg font-black leading-tight tracking-[-.025em] text-white sm:text-2xl">{activeTournament.tournament_name}</h2><p className="mt-1 text-xs font-semibold text-slate-400">{bracketSize}er Doppel-KO · Live-Ergebnisse</p></div>
          <span className="shrink-0 rounded-lg border border-emerald-400/20 bg-emerald-400/[.08] px-2 py-1 text-[10px] font-black text-emerald-300">{isTournamentCompleted ? "BEENDET" : "● LIVE"}</span>
        </div>
        <div className="h-[3px] w-full bg-white/[.06]"><div className="h-full bg-orange-500 transition-[width] duration-500" style={{width:`${isTournamentCompleted?100:progress}%`}} /></div>
        <div className="flex justify-between px-4 py-2 text-[11px] font-bold text-slate-400 sm:px-5"><span>{completedCount} Matches beendet</span><span className="tabular-nums text-orange-300">{isTournamentCompleted?100:progress}%</span></div>
      </section>

      {isTournamentCompleted && tournamentWinner && <section className="rounded-2xl border border-amber-400/25 bg-[#151a23] px-5 py-6 text-center"><Trophy className="mx-auto h-7 w-7 text-amber-300"/><p className="mt-2 text-xs font-extrabold uppercase tracking-widest text-amber-300">Turniersieger</p><h3 className="mt-2 break-words text-2xl font-black text-white sm:text-4xl">{tournamentWinner}</h3></section>}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[{name:"Live",value:activeMatches.length,color:"text-emerald-300"},{name:"Als Nächstes",value:upcomingMatches.length,color:"text-orange-300"},{name:"Beendet",value:completedCount,color:"text-white"}].map(item=><div key={item.name} className="min-w-0 rounded-xl border border-white/10 bg-[#131a25] px-2 py-3 text-center sm:px-4 sm:py-4"><div className={`text-2xl font-black tabular-nums sm:text-3xl ${item.color}`}>{item.value}</div><div className="mt-1 text-[10px] font-bold text-slate-400 sm:text-xs">{item.name}</div></div>)}
      </div>

      {activeMatches.length>0 && <section className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-lg font-black text-white sm:text-xl">Laufende Matches</h3><span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-300">{activeMatches.length} LIVE</span></div><div className="grid gap-3 lg:grid-cols-2">{activeMatches.map(match=><article key={match.id} className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-[#131a25]"><div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/[.025] px-4 py-2.5"><span className="text-xs font-black uppercase tracking-[.08em] text-slate-300">Match {match.id}</span><span className="rounded-md border border-orange-400/20 bg-orange-400/10 px-2 py-1 text-[11px] font-extrabold text-orange-300">Board {match.machineNumber}</span></div><div className="space-y-2 px-4 py-3"><div className="flex min-w-0 items-center justify-between gap-3"><span className="min-w-0 break-words text-[15px] font-extrabold text-white">{match.player1}</span><span className="shrink-0 text-xl font-black tabular-nums text-orange-300">{match.score1}</span></div><div className="flex min-w-0 items-center justify-between gap-3"><span className="min-w-0 break-words text-[15px] font-extrabold text-white">{match.player2}</span><span className="shrink-0 text-xl font-black tabular-nums text-orange-300">{match.score2}</span></div></div>
      {canEditMatch(match) && !match.winner && <div className="border-t border-white/10 px-4 py-4"><p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">Ergebnis eingeben</p><div className="grid gap-3 sm:grid-cols-2">{(["score1","score2"] as const).map((field,i)=><div key={field} className="min-w-0 rounded-xl border border-white/10 bg-[#0d131c] p-3"><div className="mb-2 truncate text-xs font-bold text-slate-200">{i===0?match.player1:match.player2}</div><div className="flex items-center gap-2"><Button type="button" variant="outline" className="h-11 w-11 shrink-0 rounded-lg border-white/15 bg-white/5 text-white" onClick={()=>bumpDraft(match.id,field,-1)} aria-label="Minus">−</Button><Input className="h-11 min-w-0 flex-1 rounded-lg border-white/15 bg-[#101620] text-center text-xl font-black text-white" inputMode="numeric" pattern="[0-9]*" type="tel" value={scoreDrafts[match.id]?.[field]??String(i===0?match.score1:match.score2)} onChange={e=>setDraft(match.id,field,e.target.value)}/><Button type="button" variant="outline" className="h-11 w-11 shrink-0 rounded-lg border-white/15 bg-white/5 text-white" onClick={()=>bumpDraft(match.id,field,1)} aria-label="Plus">+</Button></div><div className="mt-2 grid grid-cols-6 gap-1">{[0,1,2,3,4,5].map(v=><Button key={v} type="button" variant="secondary" className="h-9 min-w-0 rounded-md bg-white/10 px-0 text-xs font-bold text-white hover:bg-white/20" onClick={()=>quickSet(match.id,field,v)}>{v}</Button>)}</div></div>)}</div><Button className="mt-3 min-h-11 w-full rounded-xl bg-orange-500 font-extrabold text-white hover:bg-orange-600" onClick={()=>saveResult(match)} disabled={savingMatchId===match.id}>{savingMatchId===match.id?"Speichere …":"Ergebnis speichern"}</Button></div>}
      </article>)}</div></section>}

      {upcomingMatches.length>0 && <section className="space-y-3"><h3 className="text-lg font-black text-white sm:text-xl">Als Nächstes</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{upcomingMatches.map(match=><CompactMatch key={match.id} match={match} mode="upcoming" />)}</div></section>}
      {completedMatches.length>0 && <section className="space-y-3"><h3 className="text-lg font-black text-white sm:text-xl">Letzte Ergebnisse</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{completedMatches.map(match=><CompactMatch key={match.id} match={match} mode="done" />)}</div></section>}
      {rankings.length>0 && <section className="rounded-2xl border border-white/10 bg-[#101620] p-4 sm:p-5"><h3 className="mb-3 text-lg font-black text-white">Rangliste</h3><div className="space-y-1">{rankings.map(r=><div key={`${r.placement}-${r.player_name}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-white/[.06] px-3 py-2"><span className="w-8 shrink-0 text-sm font-black text-orange-300">{r.placement}.</span><span className="min-w-0 flex-1 break-words text-sm font-bold text-white">{r.player_name}</span></div>)}</div></section>}
      <section className="rounded-2xl border border-white/10 bg-[#101620] p-3 sm:p-5"><div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-lg font-black text-white">Kompletter Bracket</h3><span className="rounded-md border border-white/10 px-2 py-1 text-xs font-bold text-slate-400">{bracketSize}er DKO</span></div><div className="space-y-5">{(bracketSize===8 ? [{title:"Gewinnerseite · Runde 1",ids:[1,2,3,4]},{title:"Gewinnerseite · Runde 2",ids:[5,6]},{title:"Gewinnerseite · Entscheidung",ids:[7]},{title:"Verliererseite",ids:[8,9,10,11,12,13]}] : bracketSize===16 ? [{title:"Gewinnerseite",ids:[...Array(8)].map((_,i)=>i+1).concat([13,14,15,16,23,24,28])},{title:"Verliererseite",ids:[9,10,11,12,17,18,19,20,21,22,25,26,27,29]}] : [{title:"Gewinnerseite",ids:compactMatches.filter(m=>m.id!==finalId&&m.id!==resetId&&getDkoSide(m.id,bracketSize)==="winner").map(m=>m.id)},{title:"Verliererseite",ids:compactMatches.filter(m=>m.id!==finalId&&m.id!==resetId&&getDkoSide(m.id,bracketSize)==="loser").map(m=>m.id)}]).map(group=><BracketRound key={group.title} title={group.title} matches={group.ids.map(id=>matches[id]).filter((m):m is Match=>Boolean(m && (m.player1||m.player2||m.winner)))} isLoser={group.title.startsWith("Verlierer")}/>)}<BracketRound title="Grand Final" matches={[matches[finalId]].filter((m):m is Match=>Boolean(m && (m.player1||m.player2||m.winner)))}/><BracketRound title="Grand Final · Reset" matches={[matches[resetId]].filter((m):m is Match=>Boolean(m && (m.player1||m.player2||m.winner)))}/></div></section>
      <p className="text-center text-[11px] font-medium text-slate-500">Live-Synchronisierung · Letzte Änderung {lastUpdate.toLocaleTimeString("de-DE")}</p>
    </div>
  )
}

function CompactMatch({match,mode}:{match:Match;mode:"upcoming"|"done"}) {
  const done=mode==="done"
  return <article className="overflow-hidden rounded-xl border border-white/10 bg-[#131a25]"><div className="flex items-center justify-between border-b border-white/10 px-3 py-2"><span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Match {match.id}</span><span className={`text-[10px] font-black ${done?"text-emerald-300":"text-orange-300"}`}>{done?"BEENDET":"ALS NÄCHSTES"}</span></div><div className="space-y-1.5 px-3 py-3">{([1,2] as const).map(n=>{const name=n===1?match.player1:match.player2;const win=done&&match.winner===name;return <div key={n} className="flex min-w-0 items-center justify-between gap-2"><span className={`min-w-0 break-words text-sm font-bold ${win?"text-emerald-300":"text-white"}`}>{name||"Noch offen"}</span><span className={`shrink-0 text-base font-black tabular-nums ${win?"text-emerald-300":"text-orange-300"}`}>{n===1?match.score1:match.score2}</span></div>})}</div></article>
}

function getDkoSide(id:number,size:number):"winner"|"loser" {
  const winners:Record<number,number[][]>={32:[[1,16],[25,32],[45,48],[55,56],[60,60]],64:[[1,32],[49,64],[89,96],[109,112],[119,120],[124,124]],128:[[1,64],[97,128],[177,192],[217,224],[237,240],[247,248],[252,252]]}
  return (winners[size]||[]).some(([a,b])=>id>=a&&id<=b)?"winner":"loser"
}

interface BracketRoundProps {
  title: string
  matches: Match[]
  isLoser?: boolean
}

function BracketRound({title,matches,isLoser}:BracketRoundProps) {
  if(!matches.length)return null
  return <section><h4 className={`mb-2 border-l-[3px] pl-2.5 text-[13px] font-extrabold ${isLoser?"border-rose-400 text-slate-200":"border-orange-400 text-slate-100"}`}>{title}</h4><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{matches.map(match=><CompactMatch key={match.id} match={match} mode={match.winner?"done":"upcoming"}/>)}</div></section>
}
