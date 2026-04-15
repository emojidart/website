"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ArrowLeft,
  Trophy,
  Users,
  Layers,
  Monitor,
  Sparkles,
  Check,
  RotateCcw,
  RefreshCcw,
  AlertCircle,
  Cpu,
  Crown,
  Swords,
} from "lucide-react"

/**
 * ✅ Datenmodell (OHNE 400 Fehler):
 * - round_robin_groups + round_robin_matches: NUR bestehende Spalten (kein score/winner/status dort!)
 * - Ergebnisse/Automat/Winner etc. werden in dko_match_states gespeichert:
 *    - Gruppenphase: tournament_type = "round_robin"
 *    - Finalrunde (Single KO): tournament_type = "round_robin_playoff"
 *
 * Finalrunde wird komplett IN dieser Seite gespielt (kein Wechsel zu /8erdko etc.).
 */

type RRMatchRow = {
  id: number
  round_robin_id: string
  group_id: string
  round_no: number
  match_no: number
  player1_id: string
  player1_name: string
  player2_id: string
  player2_name: string
  planned_machine: number | null
}

type RRGroupRow = {
  id: string
  round_robin_id: string
  group_no: number
  name: string
}

type MatchState = {
  id: number
  player1: string
  player2: string
  player1_id: string | null
  player2_id: string | null
  score1: number
  score2: number
  winner?: string
  loser?: string
  machineNumber?: number
  callCount?: number
  _localUpdate?: boolean
}

type Qualifier = {
  name: string
  player_id: string | null
  group_id: string
  group_no: number
  place: number // 1,2,3...
  points: number
  legsFor: number
  legsAgainst: number
}

const isFreilos = (name: string) => (name ?? "").toLowerCase().startsWith("freilos")

function pct(n: number, d: number) {
  if (!d) return 0
  return Math.max(0, Math.min(100, Math.round((n / d) * 100)))
}

function badgeClass(kind: "open" | "running" | "done") {
  if (kind === "done") return "bg-green-100 text-green-800 border-green-200"
  if (kind === "running") return "bg-orange-100 text-orange-800 border-orange-200"
  return "bg-gray-100 text-gray-700 border-gray-200"
}

function normalizeName(s: string) {
  return (s ?? "").trim()
}

function ptsFrom(wins: number) {
  return wins * 2 // wie deine Tabelle
}

function sameGroup(a?: Qualifier, b?: Qualifier) {
  if (!a || !b) return false
  return a.group_id === b.group_id
}

// ---- Playoff IDs (fest, damit "existiert" erkennbar ist)
const PO_BASE = 900000
const PO_QF1 = PO_BASE + 1
const PO_QF2 = PO_BASE + 2
const PO_QF3 = PO_BASE + 3
const PO_QF4 = PO_BASE + 4
const PO_SF1 = PO_BASE + 5
const PO_SF2 = PO_BASE + 6
const PO_F = PO_BASE + 7

type PlayoffSize = 4 | 8

type PoMatchDef = {
  id: number
  round: "QF" | "SF" | "F"
  label: string
  // sources: match ids whose winners feed into this match (for SF/F)
  srcA?: number
  srcB?: number
}

const PO_DEFS_8: PoMatchDef[] = [
  { id: PO_QF1, round: "QF", label: "VF1" },
  { id: PO_QF2, round: "QF", label: "VF2" },
  { id: PO_QF3, round: "QF", label: "VF3" },
  { id: PO_QF4, round: "QF", label: "VF4" },

  // ✅ Standard: VF1 vs VF2 und VF3 vs VF4
  { id: PO_SF1, round: "SF", label: "HF1", srcA: PO_QF1, srcB: PO_QF2 },
  { id: PO_SF2, round: "SF", label: "HF2", srcA: PO_QF3, srcB: PO_QF4 },

  { id: PO_F, round: "F", label: "FINAL", srcA: PO_SF1, srcB: PO_SF2 },
]



function emptyState(id: number): MatchState {
  return {
    id,
    player1: "",
    player2: "",
    player1_id: null,
    player2_id: null,
    score1: 0,
    score2: 0,
  }
}

function canAutoFillTarget(s: MatchState) {
  // wir überschreiben NICHT, wenn schon gespielt/gestartet
  const started = Boolean(s.machineNumber) || (s.score1 > 0 || s.score2 > 0) || Boolean(s.winner)
  return !started
}

export default function RoundRobinClient() {

  const router = useRouter()
  const searchParams = useSearchParams()

  const roundRobinId = searchParams.get("roundRobinId") || ""
  const tournamentName = decodeURIComponent(searchParams.get("tournamentName") || "Round Robin")

  const tournamentTypeGroup = "round_robin"
  const tournamentTypePlayoff = "round_robin_playoff"

  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<RRGroupRow[]>([])
  const [matches, setMatches] = useState<RRMatchRow[]>([])

  const isRemoteUpdateRef = useRef(false)

  const [totalMachines, setTotalMachines] = useState<number>(10)
  const [machineDialogOpen, setMachineDialogOpen] = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)
  const [selectedMatchScope, setSelectedMatchScope] = useState<"group" | "playoff">("group")

  const [matchStates, setMatchStates] = useState<Record<number, MatchState>>({})
  const [playoffStates, setPlayoffStates] = useState<Record<number, MatchState>>({})

  // ---- UI: group tabs
  const [activeGroupId, setActiveGroupId] = useState<string>("")

  // ---- Playoff UI
  const [playoffSize, setPlayoffSize] = useState<PlayoffSize>(8)
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState<number>(2)

  // ---- Load base schedule + saved states (both types)
  const loadAll = async () => {
    if (!roundRobinId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const { data: groupData, error: gErr } = await supabase
        .from("round_robin_groups")
        .select("id, round_robin_id, group_no, name")
        .eq("round_robin_id", roundRobinId)
        .order("group_no", { ascending: true })
      if (gErr) throw gErr

      const { data: matchData, error: mErr } = await supabase
        .from("round_robin_matches")
        .select(
          "id, round_robin_id, group_id, round_no, match_no, player1_id, player1_name, player2_id, player2_name, planned_machine",
        )
        .eq("round_robin_id", roundRobinId)
        .order("group_id", { ascending: true })
        .order("round_no", { ascending: true })
        .order("match_no", { ascending: true })
      if (mErr) throw mErr

      setGroups((groupData as any) || [])
      setMatches((matchData as any) || [])

      const { data: stateRows, error: sErr } = await supabase
        .from("dko_match_states")
        .select("*")
        .eq("tournament_id", roundRobinId)
        .in("tournament_type", [tournamentTypeGroup, tournamentTypePlayoff])
      if (sErr) throw sErr

      const nextGroup: Record<number, MatchState> = {}
      const nextPo: Record<number, MatchState> = {}

      ;(stateRows || []).forEach((r: any) => {
        const mid = Number(r.match_id)
        const st: MatchState = {
          id: mid,
          player1: r.player1 || "",
          player2: r.player2 || "",
          player1_id: r.player1_id ?? null,
          player2_id: r.player2_id ?? null,
          score1: Number(r.score1 || 0),
          score2: Number(r.score2 || 0),
          winner: r.winner || undefined,
          loser: r.loser || undefined,
          machineNumber: r.machine_number ?? undefined,
          callCount: r.callCount ?? undefined,
        }
        if (r.tournament_type === tournamentTypePlayoff) nextPo[mid] = st
        else nextGroup[mid] = st
      })

      setMatchStates(nextGroup)
      setPlayoffStates(nextPo)
    } catch (e) {
      console.error("[RR] load error:", e)
      alert("Fehler beim Laden des Round Robin Turniers (siehe Konsole).")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundRobinId])

  // ---- Realtime subscribe states (damit Live/zweite Admins syncen)
  useEffect(() => {
    if (!roundRobinId) return

    const channel = supabase
      .channel(`rr_states_${roundRobinId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dko_match_states",
          filter: `tournament_id=eq.${roundRobinId}`,
        },
        (payload) => {
          const record: any = payload.new
          if (!record) return
          const tt = record.tournament_type
          if (tt !== tournamentTypeGroup && tt !== tournamentTypePlayoff) return

         

          const mid = Number(record.match_id)
          const st: MatchState = {
            id: mid,
            player1: record.player1 || "",
            player2: record.player2 || "",
            player1_id: record.player1_id ?? null,
            player2_id: record.player2_id ?? null,
            score1: Number(record.score1 || 0),
            score2: Number(record.score2 || 0),
            winner: record.winner || undefined,
            loser: record.loser || undefined,
            machineNumber: record.machine_number ?? undefined,
            callCount: record.callCount ?? undefined,
          }

         if (tt === tournamentTypePlayoff) {
  setPlayoffStates((prev) => {
    const prevMatch = prev[mid]

    if (prevMatch?._localUpdate) {
      return prev
    }

    return {
      ...prev,
      [mid]: {
        ...st,
        score1: record.score1 ?? prevMatch?.score1 ?? 0,
        score2: record.score2 ?? prevMatch?.score2 ?? 0,
        _localUpdate: false,
      },
    }
  })
} else {
  setMatchStates((prev) => {
    const prevMatch = prev[mid]

    if (prevMatch?._localUpdate) {
      return prev
    }

    return {
      ...prev,
      [mid]: {
        ...st,
        score1: record.score1 ?? prevMatch?.score1 ?? 0,
        score2: record.score2 ?? prevMatch?.score2 ?? 0,
        _localUpdate: false,
      },
    }
  })
}
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundRobinId])

  // ---- save (debounced) group states
  useEffect(() => {
    if (loading || !roundRobinId) return
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false
      return
    }

    const t = setTimeout(async () => {
      try {
        const rows = Object.values(matchStates).map((m) => ({
          tournament_type: tournamentTypeGroup,
          tournament_id: roundRobinId,
          match_id: m.id,
          player1: m.player1,
          player2: m.player2,
          player1_id: m.player1_id,
          player2_id: m.player2_id,
          score1: m.score1,
          score2: m.score2,
          winner: m.winner || null,
          loser: m.loser || null,
          machine_number: m.machineNumber || null,
          updated_at: new Date().toISOString(),
        }))

        if (rows.length === 0) return

        const { error } = await supabase.from("dko_match_states").upsert(rows, {
  onConflict: "tournament_type,tournament_id,match_id",
})
if (error) throw error

setMatchStates((prev) => {
  let changed = false
  const next: Record<number, MatchState> = {}

  Object.entries(prev).forEach(([key, match]) => {
    const id = Number(key)
    if (match._localUpdate) {
      changed = true
      next[id] = {
        ...match,
        _localUpdate: false,
      }
    } else {
      next[id] = match
    }
  })

  return changed ? next : prev
})
      } catch (e) {
        console.error("[RR] save error:", e)
      }
    }, 450)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchStates, loading, roundRobinId])

  // ---- save (debounced) playoff states
  useEffect(() => {
    if (loading || !roundRobinId) return
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false
      return
    }

    const t = setTimeout(async () => {
      try {
        const rows = Object.values(playoffStates).map((m) => ({
          tournament_type: tournamentTypePlayoff,
          tournament_id: roundRobinId,
          match_id: m.id,
          player1: m.player1,
          player2: m.player2,
          player1_id: m.player1_id,
          player2_id: m.player2_id,
          score1: m.score1,
          score2: m.score2,
          winner: m.winner || null,
          loser: m.loser || null,
          machine_number: m.machineNumber || null,
          updated_at: new Date().toISOString(),
        }))

        if (rows.length === 0) return

        const { error } = await supabase.from("dko_match_states").upsert(rows, {
  onConflict: "tournament_type,tournament_id,match_id",
})
if (error) throw error

setPlayoffStates((prev) => {
  let changed = false
  const next: Record<number, MatchState> = {}

  Object.entries(prev).forEach(([key, match]) => {
    const id = Number(key)
    if (match._localUpdate) {
      changed = true
      next[id] = {
        ...match,
        _localUpdate: false,
      }
    } else {
      next[id] = match
    }
  })

  return changed ? next : prev
})
      } catch (e) {
        console.error("[RR] playoff save error:", e)
      }
    }, 450)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playoffStates, loading, roundRobinId])

  // ---- derived: merge schedule -> display model
  const displayMatches = useMemo(() => {
    return matches.map((m) => {
      const state = matchStates[m.id]
      const base: MatchState = {
        id: m.id,
        player1: m.player1_name,
        player2: m.player2_name,
        player1_id: m.player1_id ?? null,
        player2_id: m.player2_id ?? null,
        score1: 0,
        score2: 0,
      }
      return { ...m, state: state ? { ...base, ...state } : base }
    })
  }, [matches, matchStates])

  // ---- group tab init
  useEffect(() => {
    if (!activeGroupId && groups.length) setActiveGroupId(groups[0].id)
  }, [groups, activeGroupId])

  const activeGroup = useMemo(() => groups.find((g) => g.id === activeGroupId), [groups, activeGroupId])

  const matchesForActiveGroup = useMemo(() => {
    return displayMatches.filter((m) => m.group_id === activeGroupId)
  }, [displayMatches, activeGroupId])

  const roundsForActiveGroup = useMemo(() => {
    const set = new Set<number>()
    matchesForActiveGroup.forEach((m) => set.add(m.round_no))
    return Array.from(set).sort((a, b) => a - b)
  }, [matchesForActiveGroup])

  const progressForActiveGroup = useMemo(() => {
    const total = matchesForActiveGroup.length
    const done = matchesForActiveGroup.filter((m) => Boolean(m.state.winner)).length
    const running = matchesForActiveGroup.filter((m) => Boolean(m.state.machineNumber && !m.state.winner)).length
    return { total, done, running, open: Math.max(0, total - done - running) }
  }, [matchesForActiveGroup])

  // ---- standings per group (W/L + Legs)
  const standingsByGroup = useMemo(() => {
    const byGroup: Record<
      string,
      Record<
        string,
        {
          name: string
          player_id: string | null
          played: number
          w: number
          l: number
          legsFor: number
          legsAgainst: number
        }
      >
    > = {}

    displayMatches.forEach((m) => {
      const gid = m.group_id
      const s = m.state
      if (!byGroup[gid]) byGroup[gid] = {}

      const ensure = (name: string, pid: string | null) => {
        const key = normalizeName(name)
        if (!key) return
        if (!byGroup[gid][key]) {
          byGroup[gid][key] = { name: key, player_id: pid, played: 0, w: 0, l: 0, legsFor: 0, legsAgainst: 0 }
        }
      }

      ensure(s.player1, s.player1_id)
      ensure(s.player2, s.player2_id)

      if (s.winner && s.loser) {
        const p1 = normalizeName(s.player1)
        const p2 = normalizeName(s.player2)
        if (!p1 || !p2) return

        byGroup[gid][p1].played += 1
        byGroup[gid][p2].played += 1

        byGroup[gid][p1].legsFor += s.score1
        byGroup[gid][p1].legsAgainst += s.score2

        byGroup[gid][p2].legsFor += s.score2
        byGroup[gid][p2].legsAgainst += s.score1

        if (s.winner === p1) {
          byGroup[gid][p1].w += 1
          byGroup[gid][p2].l += 1
        } else {
          byGroup[gid][p2].w += 1
          byGroup[gid][p1].l += 1
        }
      }
    })

    return byGroup
  }, [displayMatches])

  const standingsForActiveGroup = useMemo(() => {
    const table = Object.values(standingsByGroup[activeGroupId] || {}).sort((a, b) => {
      const pa = ptsFrom(a.w)
      const pb = ptsFrom(b.w)
      const da = a.legsFor - a.legsAgainst
      const db = b.legsFor - b.legsAgainst
      if (pb !== pa) return pb - pa
      return db - da
    })
    return table
  }, [standingsByGroup, activeGroupId])

  // ---- group finished?
  const groupPhaseFinished = useMemo(() => {
    if (!matches.length) return false
    // fertig wenn JEDES geplante Match einen winner im state hat
    for (const m of displayMatches) {
      const s = m.state
      if (!s?.winner) return false
    }
    return true
  }, [matches.length, displayMatches])

  // ---- default playoff sizing
  useEffect(() => {
    // Default je nach Gruppenanzahl
    if (!groups.length) return
    const g = groups.length
    // default qualifiers 2
    setQualifiersPerGroup(2)
    if (g >= 4) setPlayoffSize(8)
    else if (g === 3) setPlayoffSize(8) // mit Wildcards
    else setPlayoffSize(4) // 2 Gruppen => klassisch 4er KO
  }, [groups.length])

  // ---- Build qualifiers from standings
  const qualifiers = useMemo(() => {
    const perGroup = Math.max(1, Math.min(4, qualifiersPerGroup || 2))
    const list: Qualifier[] = []

    const groupOrder = [...groups].sort((a, b) => a.group_no - b.group_no)

    groupOrder.forEach((g) => {
      const rows = Object.values(standingsByGroup[g.id] || {}).sort((a, b) => {
        const pa = ptsFrom(a.w)
        const pb = ptsFrom(b.w)
        const da = a.legsFor - a.legsAgainst
        const db = b.legsFor - b.legsAgainst
        if (pb !== pa) return pb - pa
        return db - da
      })

      rows.forEach((r, idx) => {
        const place = idx + 1
        if (place <= perGroup) {
          list.push({
            name: r.name,
            player_id: r.player_id ?? null,
            group_id: g.id,
            group_no: g.group_no,
            place,
            points: ptsFrom(r.w),
            legsFor: r.legsFor,
            legsAgainst: r.legsAgainst,
          })
        }
      })
    })

    return list
  }, [groups, standingsByGroup, qualifiersPerGroup])

  const recommendedPlayoffSize = useMemo((): PlayoffSize => {
    // beste Größe, die zu 2-4 Gruppen passt
    const g = groups.length
    if (g >= 4) return 8
    if (g === 3) return 8
    return 4
  }, [groups.length])

  const neededQualifierCount = useMemo(() => playoffSize, [playoffSize])
  
  

const qualifiedFinalists = useMemo(() => {
  const perGroup = Math.max(1, Math.min(4, qualifiersPerGroup || 2))
  const groupOrder = [...groups].sort((a, b) => a.group_no - b.group_no)

  const list: Qualifier[] = []

  groupOrder.forEach((g) => {
    const rows = Object.values(standingsByGroup[g.id] || {}).sort((a, b) => {
      const pa = ptsFrom(a.w)
      const pb = ptsFrom(b.w)
      const da = a.legsFor - a.legsAgainst
      const db = b.legsFor - b.legsAgainst

      if (pb !== pa) return pb - pa
      if (db !== da) return db - da
      if (b.legsFor !== a.legsFor) return b.legsFor - a.legsFor
      return a.name.localeCompare(b.name)
    })

    rows.slice(0, perGroup).forEach((r, idx) => {
      list.push({
        name: r.name,
        player_id: r.player_id ?? null,
        group_id: g.id,
        group_no: g.group_no,
        place: idx + 1,
        points: ptsFrom(r.w),
        legsFor: r.legsFor,
        legsAgainst: r.legsAgainst,
      })
    })
  })

  return list
}, [groups, standingsByGroup, qualifiersPerGroup])
  
  
  

  const playoffExists = useMemo(() => {
    return Object.keys(playoffStates).length > 0
  }, [playoffStates])

  
  
function buildPairings(size: PlayoffSize, players: Qualifier[]) {
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.group_no !== b.group_no) return a.group_no - b.group_no
    if (a.place !== b.place) return a.place - b.place

    const da = a.legsFor - a.legsAgainst
    const db = b.legsFor - b.legsAgainst

    if (b.points !== a.points) return b.points - a.points
    if (db !== da) return db - da
    if (b.legsFor !== a.legsFor) return b.legsFor - a.legsFor
    return a.name.localeCompare(b.name)
  })

  const uniqueGroupNos = Array.from(new Set(sortedPlayers.map((p) => p.group_no))).sort((a, b) => a - b)

  const playersByGroup = new Map<number, Qualifier[]>()
  for (const groupNo of uniqueGroupNos) {
    playersByGroup.set(
      groupNo,
      sortedPlayers
        .filter((p) => p.group_no === groupNo)
        .sort((a, b) => {
          if (a.place !== b.place) return a.place - b.place

          const da = a.legsFor - a.legsAgainst
          const db = b.legsFor - b.legsAgainst

          if (b.points !== a.points) return b.points - a.points
          if (db !== da) return db - da
          if (b.legsFor !== a.legsFor) return b.legsFor - a.legsFor
          return a.name.localeCompare(b.name)
        }),
    )
  }

  const pairs: Array<[Qualifier | undefined, Qualifier | undefined]> = []

  if (size === 8 && uniqueGroupNos.length === 2) {
    const g1 = playersByGroup.get(uniqueGroupNos[0]) || []
    const g2 = playersByGroup.get(uniqueGroupNos[1]) || []

    if (g1.length < 4 || g2.length < 4) {
      return []
    }

    pairs.push([g1[0], g2[3]])
    pairs.push([g1[1], g2[2]])
    pairs.push([g2[0], g1[3]])
    pairs.push([g2[1], g1[2]])

    return pairs
  }

  if (size === 4 && uniqueGroupNos.length === 2) {
    const g1 = playersByGroup.get(uniqueGroupNos[0]) || []
    const g2 = playersByGroup.get(uniqueGroupNos[1]) || []

    if (g1.length < 2 || g2.length < 2) {
      return []
    }

    pairs.push([g1[0], g2[1]])
    pairs.push([g2[0], g1[1]])

    return pairs
  }

  const seeded = [...sortedPlayers].sort((a, b) => {
    if (a.place !== b.place) return a.place - b.place

    const da = a.legsFor - a.legsAgainst
    const db = b.legsFor - b.legsAgainst

    if (b.points !== a.points) return b.points - a.points
    if (db !== da) return db - da
    if (b.legsFor !== a.legsFor) return b.legsFor - a.legsFor
    return a.name.localeCompare(b.name)
  })

  for (let i = 0; i < size / 2; i++) {
    pairs.push([seeded[i], seeded[size - 1 - i]])
  }

  return pairs
}

  
  
  

  // ---- Create playoffs in DB (dko_match_states rows with playoff type)
  const createPlayoffs = async () => {
    if (!groupPhaseFinished) {
      alert("Gruppenphase ist noch nicht fertig.")
      return
    }
    const size = playoffSize
    const players = qualifiedFinalists
    if (players.length < size) {
      alert(`Nicht genug Qualifizierte für ${size}er Finalrunde.`)
      return
    }

    const pairs = buildPairings(size, players)
    const defs = size === 8 ? PO_DEFS_8 : PO_DEFS_4

    const rows: any[] = []

    if (size === 8) {
      // QFs
      const qfs = [PO_QF1, PO_QF2, PO_QF3, PO_QF4]
      for (let i = 0; i < 4; i++) {
        const [a, b] = pairs[i] || []
        rows.push({
          tournament_type: tournamentTypePlayoff,
          tournament_id: roundRobinId,
          match_id: qfs[i],
          player1: a?.name ?? "",
          player2: b?.name ?? "",
          player1_id: a?.player_id ?? null,
          player2_id: b?.player_id ?? null,
          score1: 0,
          score2: 0,
          winner: null,
          loser: null,
          machine_number: null,
          updated_at: new Date().toISOString(),
        })
      }
      // SF/F placeholders
      for (const d of defs.filter((x) => x.round !== "QF")) {
        rows.push({
          tournament_type: tournamentTypePlayoff,
          tournament_id: roundRobinId,
          match_id: d.id,
          player1: "",
          player2: "",
          player1_id: null,
          player2_id: null,
          score1: 0,
          score2: 0,
          winner: null,
          loser: null,
          machine_number: null,
          updated_at: new Date().toISOString(),
        })
      }
    } else {
      // size 4 => Semis from pairs[0], pairs[1]
      const s1 = pairs[0] || []
      const s2 = pairs[1] || []
      rows.push({
        tournament_type: tournamentTypePlayoff,
        tournament_id: roundRobinId,
        match_id: PO_SF1,
        player1: s1[0]?.name ?? "",
        player2: s1[1]?.name ?? "",
        player1_id: s1[0]?.player_id ?? null,
        player2_id: s1[1]?.player_id ?? null,
        score1: 0,
        score2: 0,
        winner: null,
        loser: null,
        machine_number: null,
        updated_at: new Date().toISOString(),
      })
      rows.push({
        tournament_type: tournamentTypePlayoff,
        tournament_id: roundRobinId,
        match_id: PO_SF2,
        player1: s2[0]?.name ?? "",
        player2: s2[1]?.name ?? "",
        player1_id: s2[0]?.player_id ?? null,
        player2_id: s2[1]?.player_id ?? null,
        score1: 0,
        score2: 0,
        winner: null,
        loser: null,
        machine_number: null,
        updated_at: new Date().toISOString(),
      })
      rows.push({
        tournament_type: tournamentTypePlayoff,
        tournament_id: roundRobinId,
        match_id: PO_F,
        player1: "",
        player2: "",
        player1_id: null,
        player2_id: null,
        score1: 0,
        score2: 0,
        winner: null,
        loser: null,
        machine_number: null,
        updated_at: new Date().toISOString(),
      })
    }

    try {
      const { error } = await supabase.from("dko_match_states").upsert(rows, {
        onConflict: "tournament_type,tournament_id,match_id",
      })
      if (error) throw error
      await loadAll()
    } catch (e) {
      console.error("[RR] create playoffs error:", e)
      alert("Fehler beim Erstellen der Finalrunde (siehe Konsole).")
    }
  }

  // ---- Auto-advance playoff bracket when winners appear
  useEffect(() => {
    if (!playoffExists) return

    const defs = playoffSize === 8 ? PO_DEFS_8 : PO_DEFS_4

    const getWinnerOf = (mid?: number) => {
      if (!mid) return { name: "", id: null as string | null }
      const s = playoffStates[mid]
      const name = normalizeName(s?.winner || "")
      if (!name) return { name: "", id: null as string | null }
      // map winner name to id from that match
      const wId =
        s?.winner === normalizeName(s.player1) ? s.player1_id : s?.winner === normalizeName(s.player2) ? s.player2_id : null
      return { name, id: wId ?? null }
    }

    const patchTarget = (
  targetId: number,
  p1: { name: string; id: string | null },
  p2: { name: string; id: string | null }
) => {
  const cur = playoffStates[targetId] || emptyState(targetId)
  if (!canAutoFillTarget(cur)) return null

  // ✅ NEU: Wenn Teilnehmer schon gleich sind -> KEIN Update -> kein Loop
  const curP1 = normalizeName(cur.player1)
  const curP2 = normalizeName(cur.player2)
  const samePlayers =
    curP1 === p1.name &&
    curP2 === p2.name &&
    (cur.player1_id ?? null) === (p1.id ?? null) &&
    (cur.player2_id ?? null) === (p2.id ?? null)

  if (samePlayers) return null

  const next: MatchState = {
    ...cur,
    player1: p1.name,
    player2: p2.name,
    player1_id: p1.id,
    player2_id: p2.id,
  }

  // clear winner/loser if participants change
  next.score1 = 0
  next.score2 = 0
  next.winner = undefined
  next.loser = undefined
  next.machineNumber = undefined
  next.callCount = undefined

  return next
}


    const updates: Array<{ id: number; st: MatchState }> = []

    for (const d of defs) {
      if (!d.srcA || !d.srcB) continue
      const a = getWinnerOf(d.srcA)
      const b = getWinnerOf(d.srcB)
      const st = patchTarget(d.id, a, b)
      if (st) updates.push({ id: d.id, st })
    }

    if (updates.length) {
      setPlayoffStates((prev) => {
        const next = { ...prev }
        for (const u of updates) next[u.id] = u.st
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playoffStates, playoffExists, playoffSize])

  // ---- Machines (shared pool for group+playoff)
  const getAvailableMachines = (): number[] => {
    const all = { ...matchStates, ...playoffStates }
    const used = Object.values(all)
      .filter((m) => m.machineNumber !== undefined && !m.winner)
      .map((m) => m.machineNumber!)
    return Array.from({ length: totalMachines }, (_, i) => i + 1).filter((n) => !used.includes(n))
  }
  const availableMachines = getAvailableMachines()
  
    // ✅ Wer ist gerade "busy" (spielt bereits in einem laufenden Match)?
  const busyPlayers = useMemo(() => {
    const busy = new Set<string>()

    // Gruppenphase (displayMatches enthält state)
    displayMatches.forEach((m) => {
      const s = m.state
      if (s.machineNumber && !s.winner) {
        busy.add(normalizeName(s.player1))
        busy.add(normalizeName(s.player2))
      }
    })

    // Playoff
    Object.values(playoffStates).forEach((s) => {
      if (s.machineNumber && !s.winner) {
        busy.add(normalizeName(s.player1))
        busy.add(normalizeName(s.player2))
      }
    })

    return busy
  }, [displayMatches, playoffStates])

    // ✅ Matches in aktiver Gruppe, die JETZT gestartet werden dürfen
  const playableMatches = useMemo(() => {
    return matchesForActiveGroup
      .filter((m) => {
        const s = m.state

        if (!s.player1 || !s.player2) return false
        if (isFreilos(s.player1) || isFreilos(s.player2)) return false

        if (s.winner) return false              // schon fertig
        if (s.machineNumber) return false       // läuft schon

        const p1 = normalizeName(s.player1)
        const p2 = normalizeName(s.player2)

        // darf nicht, wenn einer gerade spielt
        if (busyPlayers.has(p1) || busyPlayers.has(p2)) return false

        return true
      })
      .sort((a, b) => a.round_no - b.round_no || a.match_no - b.match_no)
  }, [matchesForActiveGroup, busyPlayers])

  

  // ---- Actions: start/assign/score/confirm/reset for group & playoff
  const startMatch = (scope: "group" | "playoff", matchId: number, fallback?: MatchState) => {
    const s = scope === "playoff" ? (playoffStates[matchId] || fallback || emptyState(matchId)) : (matchStates[matchId] || fallback || emptyState(matchId))
    if (!s.player1 || !s.player2) return
    if (isFreilos(s.player1) || isFreilos(s.player2)) return
    if (s.machineNumber) {
      alert(`Dieses Spiel läuft bereits auf Automat ${s.machineNumber}`)
      return
    }
    setSelectedMatchScope(scope)
    setSelectedMatchId(matchId)
    setMachineDialogOpen(true)
  }
  
  

const assignMachine = (machineNumber: number) => {
  if (selectedMatchId == null) return

  isRemoteUpdateRef.current = true

  if (selectedMatchScope === "playoff") {
    setPlayoffStates((prev) => ({
      ...prev,
      [selectedMatchId]: {
        ...(prev[selectedMatchId] || emptyState(selectedMatchId)),
        machineNumber,
        callCount: 1,
        _localUpdate: true,
      },
    }))
  } else {
    const m = displayMatches.find((x) => x.id === selectedMatchId)
    const base = m?.state || emptyState(selectedMatchId)

    setMatchStates((prev) => ({
      ...prev,
      [selectedMatchId]: {
        ...(prev[selectedMatchId] || base),
        machineNumber,
        callCount: 1,
        _localUpdate: true,
      },
    }))
  }

  setMachineDialogOpen(false)
  setSelectedMatchId(null)

  setTimeout(() => {
    isRemoteUpdateRef.current = false
  }, 500)
}
  
  
  

const updateScore = (
  scope: "group" | "playoff",
  matchId: number,
  player: 1 | 2,
  score: number,
  fallback?: MatchState
) => {
  if (scope === "playoff") {
    const base = playoffStates[matchId] || fallback || emptyState(matchId)
    setPlayoffStates((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || base),
        score1: player === 1 ? score : (prev[matchId]?.score1 ?? base.score1),
        score2: player === 2 ? score : (prev[matchId]?.score2 ?? base.score2),
        _localUpdate: true,
      },
    }))
  } else {
    const base = matchStates[matchId] || fallback || emptyState(matchId)
    setMatchStates((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || base),
        score1: player === 1 ? score : (prev[matchId]?.score1 ?? base.score1),
        score2: player === 2 ? score : (prev[matchId]?.score2 ?? base.score2),
        _localUpdate: true,
      },
    }))
  }
}

const confirmMatch = (scope: "group" | "playoff", matchId: number, fallback?: MatchState) => {
  isRemoteUpdateRef.current = true

  const s =
    scope === "playoff"
      ? playoffStates[matchId] || fallback || emptyState(matchId)
      : matchStates[matchId] || fallback || emptyState(matchId)

  if (s.score1 === s.score2) {
    isRemoteUpdateRef.current = false
    alert("Unentschieden ist nicht erlaubt!")
    return
  }

  const p1 = normalizeName(s.player1)
  const p2 = normalizeName(s.player2)
  const winner = s.score1 > s.score2 ? p1 : p2
  const loser = s.score1 > s.score2 ? p2 : p1

  const next: MatchState = {
    ...s,
    winner,
    loser,
    machineNumber: undefined,
    callCount: undefined,
    _localUpdate: true,
  }

  if (scope === "playoff") {
    setPlayoffStates((prev) => ({ ...prev, [matchId]: next }))
  } else {
    setMatchStates((prev) => ({ ...prev, [matchId]: next }))
  }

  setTimeout(() => {
    isRemoteUpdateRef.current = false
  }, 500)
}
  
  
  
  
const resetMatch = (scope: "group" | "playoff", matchId: number, fallback?: MatchState) => {
  isRemoteUpdateRef.current = true

  const s =
    scope === "playoff"
      ? playoffStates[matchId] || fallback || emptyState(matchId)
      : matchStates[matchId] || fallback || emptyState(matchId)

  const next: MatchState = {
    ...s,
    score1: 0,
    score2: 0,
    winner: undefined,
    loser: undefined,
    machineNumber: undefined,
    callCount: undefined,
    _localUpdate: true,
  }

  if (scope === "playoff") {
    setPlayoffStates((prev) => ({ ...prev, [matchId]: next }))
  } else {
    setMatchStates((prev) => ({ ...prev, [matchId]: next }))
  }

  setTimeout(() => {
    isRemoteUpdateRef.current = false
  }, 500)
}
  
  
  
  
  

  const PO_DEFS_4: PoMatchDef[] = [
  { id: PO_SF1, round: "SF", label: "HF1" },
  { id: PO_SF2, round: "SF", label: "HF2" },
  { id: PO_F, round: "F", label: "FINAL", srcA: PO_SF1, srcB: PO_SF2 },
]

// ---- Playoff display list
const playoffDefs = useMemo(() => (playoffSize === 8 ? PO_DEFS_8 : PO_DEFS_4), [playoffSize])



  const playoffRoundGroups = useMemo(() => {
    const by: Record<string, PoMatchDef[]> = { QF: [], SF: [], F: [] }
    playoffDefs.forEach((d) => by[d.round].push(d))
    return by
  }, [playoffDefs])

  const champion = useMemo(() => {
    const f = playoffStates[PO_F]
    return normalizeName(f?.winner || "")
  }, [playoffStates])

  if (!roundRobinId) {
    return (
      <div className="min-h-screen bg-white">
        {/* <Header /> */}

        <main className="max-w-3xl mx-auto p-6">
          <Card className="p-6 rounded-2xl shadow-lg border-2 border-white">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <p className="font-black text-gray-900">Kein roundRobinId in der URL.</p>
            </div>
            <Button variant="outline" onClick={() => router.push("/dko_tournament_registration")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-16">
          <Card className="p-8 rounded-2xl shadow-lg border-2 border-white">
            <div className="flex items-center gap-3">
              <RefreshCcw className="w-5 h-5 text-orange-600 animate-spin" />
              <p className="font-semibold text-gray-700">Lade Round Robin…</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* HERO */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl">
                <Layers className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{tournamentName}</h1>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black">
                    <Users className="w-4 h-4" />
                    {groups.length} Gruppen
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black">
                    <Trophy className="w-4 h-4" />
                    Round Robin
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black">
                    <Sparkles className="w-4 h-4" />
                    Live Sync
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="border-white/40 text-white bg-white/10 hover:bg-white/20"
                onClick={() => router.push("/dko_tournament_registration")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>
              <Button className="bg-white text-orange-600 hover:bg-white/90 font-black" onClick={loadAll}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                Reload
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full px-8 py-10 space-y-8">


        {/* TOP GRID */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="rounded-2xl border-2 border-white shadow-lg p-5 bg-gradient-to-br from-orange-50 to-orange-100">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-black text-gray-900">Gruppen</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGroupId(g.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl font-black border-2 transition-all shadow-sm",
                    activeGroupId === g.id
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-gray-700 border-white hover:border-orange-300",
                  )}
                >
                  G{g.group_no}
                </button>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-700 font-semibold">
              Aktiv: <span className="text-gray-900 font-black">{activeGroup?.name ?? "—"}</span>
            </div>
          </Card>

          <Card className="rounded-2xl border-2 border-white shadow-lg p-5 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <Trophy className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-black text-gray-900">Status</h2>
            </div>

            <div className="rounded-2xl border-2 border-orange-100 bg-orange-50 p-4">
              <div className="flex items-center justify-between font-black text-gray-900">
                <span>Matches</span>
                <span className="text-orange-600">
                  {progressForActiveGroup.done}/{progressForActiveGroup.total}
                </span>
              </div>

              <div className="mt-3 h-3 rounded-full bg-white border-2 border-orange-100 overflow-hidden">
                <div
                  className="h-full bg-orange-500"
                  style={{ width: `${pct(progressForActiveGroup.done, progressForActiveGroup.total)}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-black">
                <div className="rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 text-center">
                  Offen<br />
                  <span className="text-base text-gray-900">{progressForActiveGroup.open}</span>
                </div>
                <div className="rounded-xl border-2 border-orange-200 bg-orange-100/60 px-3 py-2 text-orange-800 text-center">
                  Läuft<br />
                  <span className="text-base text-orange-900">{progressForActiveGroup.running}</span>
                </div>
                <div className="rounded-xl border-2 border-green-200 bg-green-100/60 px-3 py-2 text-green-800 text-center">
                  Fertig<br />
                  <span className="text-base text-green-900">{progressForActiveGroup.done}</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border-2 px-3 py-2 font-black text-sm flex items-center justify-between">
                <span>Gruppenphase</span>
                <span className={cn("px-2 py-0.5 rounded-full border-2", groupPhaseFinished ? "bg-green-50 border-green-200 text-green-700" : "bg-orange-50 border-orange-200 text-orange-700")}>
                  {groupPhaseFinished ? "Fertig" : "Läuft"}
                </span>
              </div>
            </div>
          </Card>
		  
		  
		  <Card className="rounded-2xl border-2 border-white shadow-lg p-5 bg-white">
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-3">
      <Monitor className="w-5 h-5 text-orange-600" />
      <h2 className="text-lg font-black text-gray-900">Automaten</h2>
    </div>
    <div className="inline-flex items-center gap-2 text-xs font-black text-gray-700 bg-gray-50 border-2 border-gray-200 px-3 py-1 rounded-full">
      <Cpu className="w-4 h-4 text-orange-600" />
      Frei: {availableMachines.length}/{totalMachines}
    </div>
  </div>

  <div className="flex items-center gap-2">
    <span className="text-sm font-bold text-gray-700">Anzahl:</span>
    <Input
      type="number"
      min={1}
      max={50}
      value={totalMachines}
      onChange={(e) => setTotalMachines(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
      className="h-10 w-28 text-center font-black"
    />
    <span className="text-sm font-semibold text-gray-600">Stk</span>
  </div>

  <div className="mt-4 flex flex-wrap gap-2 max-h-[120px] overflow-auto">
    {availableMachines.slice(0, 16).map((n) => (
      <span
        key={n}
        className="inline-flex items-center justify-center rounded-xl border-2 border-green-200 bg-green-50 text-green-800 font-black px-3 py-1 text-xs"
      >
        {n}
      </span>
    ))}

    {availableMachines.length > 16 && (
      <span className="inline-flex items-center justify-center rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-700 font-black px-3 py-1 text-xs">
        +{availableMachines.length - 16} mehr
      </span>
    )}

    {availableMachines.length === 0 && (
      <span className="text-sm font-semibold text-gray-500">Keine Automaten frei.</span>
    )}
  </div>

{/* ✅ Spielbar jetzt – direkt danach */}
<div className="mt-5">
  <div className="flex items-center justify-between">
    <p className="text-sm font-black text-gray-900">Spielbar jetzt</p>
    <p className="text-xs font-black text-gray-600">
      {playableMatches.length} Match{playableMatches.length === 1 ? "" : "es"}
    </p>
  </div>

  {playableMatches.length === 0 ? (
    <div className="mt-2 text-sm font-semibold text-gray-500">
      Gerade kein Match frei (Spieler sind beschäftigt oder alles läuft/fertig).
    </div>
  ) : (
    <div className="mt-3 space-y-2 max-h-[220px] overflow-auto pr-1">
      {playableMatches.slice(0, 6).map((m) => (
        <div key={m.id} className="rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-black text-gray-600">
                Runde {m.round_no} · Match {m.match_no}
              </div>
              <div className="text-sm font-black text-gray-900 truncate">
                {m.state.player1} vs {m.state.player2}
              </div>
            </div>

            <Button
              onClick={() => startMatch("group", m.id, m.state)}
              className="h-8 px-3 text-xs font-black rounded-xl"
              disabled={availableMachines.length === 0}
            >
              Starten
            </Button>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

</Card>   
</div>    

          





        {/* FINALRUNDE PANEL */}
        <Card className="rounded-2xl border-2 border-white shadow-lg p-6 bg-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <Crown className="w-6 h-6 text-orange-600" />
                Finalrunde · Single KO
              </h2>
              <p className="text-sm text-gray-600 font-semibold mt-1">
                Einmal verloren = raus.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2">
                <span className="text-xs font-black text-gray-700">Finalgröße</span>
                <Button
                  type="button"
                  variant={playoffSize === 4 ? "default" : "outline"}
                  className={cn("h-8 px-3 font-black", playoffSize === 4 && "bg-orange-600 hover:bg-orange-700")}
                  onClick={() => setPlayoffSize(4)}
                >
                  4
                </Button>
                <Button
                  type="button"
                  variant={playoffSize === 8 ? "default" : "outline"}
                  className={cn("h-8 px-3 font-black", playoffSize === 8 && "bg-orange-600 hover:bg-orange-700")}
                  onClick={() => setPlayoffSize(8)}
                >
                  8
                </Button>
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2">
                <span className="text-xs font-black text-gray-700">Quali/Gruppe</span>
                <Input
                  type="number"
                  min={1}
                  max={4}
                  value={qualifiersPerGroup}
                  onChange={(e) => setQualifiersPerGroup(Math.max(1, Math.min(4, Number(e.target.value) || 1)))}
                  className="h-8 w-20 text-center font-black"
                />
              </div>

              <Button
                className={cn(
                  "font-black",
                  groupPhaseFinished ? "bg-orange-600 hover:bg-orange-700" : "bg-gray-300 text-gray-500",
                )}
                disabled={!groupPhaseFinished}
                onClick={createPlayoffs}
              >
                <Swords className="w-4 h-4 mr-2" />
                {playoffExists ? "Finalrunde neu erstellen (überschreibt NICHT laufende Spiele)" : "Finalrunde erstellen"}
              </Button>

              <div className="text-xs font-black text-gray-700 rounded-full border-2 border-gray-200 bg-white px-3 py-2">
                Empfehlung: {recommendedPlayoffSize}er KO
              </div>
            </div>
          </div>

          <div className="mt-4 grid lg:grid-cols-3 gap-4">
            <div className="rounded-2xl border-2 border-orange-100 bg-orange-50 p-4">
              <div className="font-black text-gray-900 mb-2">Qualifizierte ({qualifiedFinalists.length}/{playoffSize})</div>
              {qualifiedFinalists.length === 0 ? (
                <div className="text-sm text-gray-500 font-semibold">Noch keine Tabelle/Ergebnisse.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto pr-1">
                  {qualifiedFinalists.slice(0, playoffSize).map((q, idx) => (
                    <div
                      key={`${q.group_id}-${q.name}`}
                      className="flex items-center justify-between rounded-xl border-2 border-white bg-white px-3 py-2 shadow-sm"
                    >
                      <div className="font-black text-gray-900 truncate">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-black mr-2">
                          {idx + 1}
                        </span>
                        {q.name}
                      </div>
                      <div className="text-xs font-black text-gray-600">
                        G{q.group_no}#{q.place} · {q.points}P · {q.legsFor - q.legsAgainst}Δ
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!groupPhaseFinished && (
                <div className="mt-3 text-xs font-black text-orange-800 border-2 border-orange-200 bg-orange-100/60 rounded-xl px-3 py-2">
                  Finalrunde erst möglich wenn Gruppenphase fertig ist.
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              {!playoffExists ? (
                <div className="h-full rounded-2xl border-2 border-gray-200 bg-gray-50 p-4 flex items-center justify-center text-gray-600 font-semibold">
                  Noch keine Finalrunde erstellt.
                </div>
              ) : (
                <div className="space-y-6">
                  {champion && (
                    <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Crown className="w-6 h-6 text-green-700" />
                        <div>
                          <div className="text-sm font-black text-green-900">Champion</div>
                          <div className="text-xl font-black text-green-800">{champion}</div>
                        </div>
                      </div>
                      <div className="text-xs font-black text-green-800 border-2 border-green-200 bg-white rounded-full px-3 py-2">
                        Final gewonnen ✓
                      </div>
                    </div>
                  )}

                  {/* Playoff rounds */}
                  {(["QF", "SF", "F"] as const).map((rnd) => {
                    const list = playoffRoundGroups[rnd] || []
                    if (!list.length) return null
                    return (
                      <div key={rnd} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-black text-orange-600 border-b-2 border-orange-600 pb-2">
                            {rnd === "QF" ? "Viertelfinale" : rnd === "SF" ? "Halbfinale" : "Finale"}
                          </h3>
                        </div>
                        <div className="grid xl:grid-cols-2 gap-4">
                          {list.map((d) => {
                            const st = playoffStates[d.id] || emptyState(d.id)
                            return (
                              <PlayoffMatchCard
                                key={d.id}
                                label={d.label}
                                player1={st.player1}
                                player2={st.player2}
                                score1={st.score1}
                                score2={st.score2}
                                winner={st.winner}
                                loser={st.loser}
                                machineNumber={st.machineNumber}
                                onStart={() => startMatch("playoff", d.id, st)}
                                onReset={() => resetMatch("playoff", d.id, st)}
                                onConfirm={() => confirmMatch("playoff", d.id, st)}
                                onScore={(p, s) => updateScore("playoff", d.id, p, s, st)}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Tabelle */}
        <Card className="rounded-2xl border-2 border-white shadow-lg p-6 bg-white">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Tabelle · {activeGroup?.name ?? "—"}</h2>
              <p className="text-sm text-gray-600 font-semibold">
  Sieg = 2 Punkte · Gleichstand → Leg-Differenz entscheidet
</p>

            </div>
          </div>

          {standingsForActiveGroup.length === 0 ? (
            <div className="mt-4 text-gray-500 font-semibold">Noch keine Ergebnisse.</div>
          ) : (
            <div className="mt-4 overflow-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-12 text-xs font-black text-gray-500 px-3 pb-2">
                  <div className="col-span-5">Spieler</div>
                  <div className="col-span-1 text-center">SP</div>
                  <div className="col-span-1 text-center">W</div>
                  <div className="col-span-1 text-center">L</div>
                  <div className="col-span-2 text-center">Legs</div>
                  <div className="col-span-2 text-center">P</div>
                </div>

                <div className="space-y-2">
                  {standingsForActiveGroup.map((r, idx) => {
                    const pts = ptsFrom(r.w)
                    return (
                      <div
                        key={r.name}
                        className={cn(
                          "grid grid-cols-12 items-center rounded-2xl border-2 px-3 py-3 shadow-sm",
                          idx === 0 ? "bg-orange-50 border-orange-200" : "bg-white border-white",
                        )}
                      >
                        <div className="col-span-5 font-black text-gray-900 truncate flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white text-xs font-black">
                            {idx + 1}
                          </span>
                          {r.name}
                        </div>
                        <div className="col-span-1 text-center font-bold">{r.played}</div>
                        <div className="col-span-1 text-center font-bold text-green-700">{r.w}</div>
                        <div className="col-span-1 text-center font-bold text-red-700">{r.l}</div>
                        <div className="col-span-2 text-center font-bold">
                          {r.legsFor}-{r.legsAgainst}
                        </div>
                        <div className="col-span-2 text-center font-black text-orange-600 text-lg">{pts}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Spielplan */}
        <Card className="rounded-2xl border-2 border-white shadow-lg p-6 bg-white">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Spielplan · {activeGroup?.name ?? "—"}</h2>
              <p className="text-sm text-gray-600 font-semibold">
                {matchesForActiveGroup.length} Matches · {roundsForActiveGroup.length} Runden
              </p>
            </div>
          </div>

          {roundsForActiveGroup.length === 0 ? (
            <div className="py-10 text-center text-gray-500 font-semibold">Keine Matches gefunden.</div>
          ) : (
            <div className="space-y-8">
              {roundsForActiveGroup.map((rn) => {
                const roundMatches = matchesForActiveGroup.filter((x) => x.round_no === rn)
                const done = roundMatches.filter((m) => Boolean(m.state.winner)).length
                return (
                  <div key={`${activeGroupId}-r${rn}`} className="space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <h3 className="text-lg font-black text-orange-600 border-b-2 border-orange-600 pb-2">Runde {rn}</h3>
                      <div className="text-sm font-black text-gray-600">
                        {done}/{roundMatches.length} fertig
                      </div>
                    </div>

                    <div className="grid xl:grid-cols-2 gap-4">
                      {roundMatches.map((m) => (
                        <RRMatchCard
                          key={m.id}
                          matchNo={m.match_no}
                          player1={m.state.player1}
                          player2={m.state.player2}
                          score1={m.state.score1}
                          score2={m.state.score2}
                          winner={m.state.winner}
                          loser={m.state.loser}
                          machineNumber={m.state.machineNumber}
                          onStart={() => startMatch("group", m.id, m.state)}
                          onReset={() => resetMatch("group", m.id, m.state)}
                          onConfirm={() => confirmMatch("group", m.id, m.state)}
                          onScore={(p, s) => updateScore("group", m.id, p, s, m.state)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </main>

      <Dialog open={machineDialogOpen} onOpenChange={setMachineDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black">Automat auswählen</DialogTitle>
            <DialogDescription className="font-semibold">Wähle einen verfügbaren Automaten</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-2 py-4">
            {availableMachines.length === 0 ? (
              <p className="col-span-4 text-center text-gray-500 font-semibold">Keine Automaten verfügbar</p>
            ) : (
              availableMachines.map((num) => (
                <Button
                  key={num}
                  onClick={() => assignMachine(num)}
                  variant="outline"
                  className="h-16 text-lg font-black rounded-2xl border-2"
                >
                  {num}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RRMatchCard(props: {
  matchNo: number
  player1: string
  player2: string
  score1: number
  score2: number
  winner?: string
  loser?: string
  machineNumber?: number
  onStart: () => void
  onReset: () => void
  onConfirm: () => void
  onScore: (player: 1 | 2, score: number) => void
}) {
  const { matchNo, player1, player2, score1, score2, winner, loser, machineNumber, onStart, onReset, onConfirm, onScore } =
    props

  const isRunning = Boolean(machineNumber && !winner)
  const isDone = Boolean(winner)
  const canConfirm = Boolean(machineNumber && !winner && score1 !== score2 && (score1 > 0 || score2 > 0))

  const isP1Winner = winner === normalizeName(player1)
  const isP2Winner = winner === normalizeName(player2)
  const isP1Loser = loser === normalizeName(player1)
  const isP2Loser = loser === normalizeName(player2)

  const statusKind: "open" | "running" | "done" = isDone ? "done" : isRunning ? "running" : "open"

  return (
    <Card
      className={cn(
        "rounded-2xl border-2 p-4 shadow-sm transition-all",
        isRunning && "border-orange-500 bg-orange-50 shadow-orange-500/20",
        isDone && "border-green-200 bg-green-50",
        !isRunning && !isDone && "border-orange-200 bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-gray-900">Match {matchNo}</span>
          <span className={cn("text-xs font-black border-2 px-2 py-0.5 rounded-full", badgeClass(statusKind))}>
            {statusKind === "done" ? "Fertig" : statusKind === "running" ? "Läuft" : "Offen"}
          </span>
          {machineNumber && !winner && (
            <span className="text-xs font-black text-orange-700 bg-orange-100 border-2 border-orange-200 px-2 py-0.5 rounded-full animate-pulse">
              🎯 Automat {machineNumber}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canConfirm && (
            <Button onClick={onConfirm} className="h-8 px-3 text-xs font-black bg-orange-600 hover:bg-orange-700">
              <Check className="h-3 w-3 mr-1" />
              Bestätigen
            </Button>
          )}

          {winner && (
            <Button
              variant="ghost"
              onClick={onReset}
              className="h-8 w-8 p-0 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50"
              title="Match zurücksetzen"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}

          {!machineNumber && !winner && player1 && player2 && (
            <Button onClick={onStart} className="h-8 px-3 text-xs font-black rounded-xl">
              Starten
            </Button>
          )}
        </div>
      </div>

      {winner && (
        <div className="mt-3 rounded-xl border-2 border-green-200 bg-white px-3 py-2 text-sm font-black text-green-700">
          Sieger: {winner}
        </div>
      )}

      <div className="mt-4 space-y-2">
        <Row
          name={player1}
          score={score1}
          onScore={(v) => onScore(1, v)}
          disabled={!player1 || !player2 || !machineNumber || Boolean(winner)}
          winner={isP1Winner}
          loser={isP1Loser}
        />
        <Row
          name={player2}
          score={score2}
          onScore={(v) => onScore(2, v)}
          disabled={!player1 || !player2 || !machineNumber || Boolean(winner)}
          winner={isP2Winner}
          loser={isP2Loser}
        />

        {!winner && machineNumber && score1 === score2 && (score1 > 0 || score2 > 0) && (
          <div className="text-xs font-black text-orange-700 bg-orange-50 border-2 border-orange-200 rounded-xl px-3 py-2">
            Hinweis: Unentschieden ist nicht erlaubt.
          </div>
        )}
      </div>
    </Card>
  )
}

function PlayoffMatchCard(props: {
  label: string
  player1: string
  player2: string
  score1: number
  score2: number
  winner?: string
  loser?: string
  machineNumber?: number
  onStart: () => void
  onReset: () => void
  onConfirm: () => void
  onScore: (player: 1 | 2, score: number) => void
}) {
  const { label, player1, player2, score1, score2, winner, loser, machineNumber, onStart, onReset, onConfirm, onScore } =
    props

  const isRunning = Boolean(machineNumber && !winner)
  const isDone = Boolean(winner)
  const canConfirm = Boolean(machineNumber && !winner && score1 !== score2 && (score1 > 0 || score2 > 0))

  const isP1Winner = winner === normalizeName(player1)
  const isP2Winner = winner === normalizeName(player2)
  const isP1Loser = loser === normalizeName(player1)
  const isP2Loser = loser === normalizeName(player2)

  const statusKind: "open" | "running" | "done" = isDone ? "done" : isRunning ? "running" : "open"

  return (
    <Card
      className={cn(
        "rounded-2xl border-2 p-4 shadow-sm transition-all",
        isRunning && "border-orange-500 bg-orange-50 shadow-orange-500/20",
        isDone && "border-green-200 bg-green-50",
        !isRunning && !isDone && "border-orange-200 bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-gray-900">{label}</span>
          <span className={cn("text-xs font-black border-2 px-2 py-0.5 rounded-full", badgeClass(statusKind))}>
            {statusKind === "done" ? "Fertig" : statusKind === "running" ? "Läuft" : "Offen"}
          </span>
          {machineNumber && !winner && (
            <span className="text-xs font-black text-orange-700 bg-orange-100 border-2 border-orange-200 px-2 py-0.5 rounded-full animate-pulse">
              🎯 Automat {machineNumber}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canConfirm && (
            <Button onClick={onConfirm} className="h-8 px-3 text-xs font-black bg-orange-600 hover:bg-orange-700">
              <Check className="h-3 w-3 mr-1" />
              Bestätigen
            </Button>
          )}

          {winner && (
            <Button
              variant="ghost"
              onClick={onReset}
              className="h-8 w-8 p-0 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50"
              title="Match zurücksetzen"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}

          {!machineNumber && !winner && player1 && player2 && (
            <Button onClick={onStart} className="h-8 px-3 text-xs font-black rounded-xl">
              Starten
            </Button>
          )}
        </div>
      </div>

      {winner && (
        <div className="mt-3 rounded-xl border-2 border-green-200 bg-white px-3 py-2 text-sm font-black text-green-700">
          Sieger: {winner}
        </div>
      )}

      <div className="mt-4 space-y-2">
        <Row
          name={player1 || "— (wartet)"}
          score={score1}
          onScore={(v) => onScore(1, v)}
          disabled={!player1 || !player2 || !machineNumber || Boolean(winner)}
          winner={isP1Winner}
          loser={isP1Loser}
        />
        <Row
          name={player2 || "— (wartet)"}
          score={score2}
          onScore={(v) => onScore(2, v)}
          disabled={!player1 || !player2 || !machineNumber || Boolean(winner)}
          winner={isP2Winner}
          loser={isP2Loser}
        />
      </div>
    </Card>
  )
}

function Row(props: {
  name: string
  score: number
  onScore: (v: number) => void
  disabled: boolean
  winner: boolean
  loser: boolean
}) {
  const { name, score, onScore, disabled, winner, loser } = props
  const [localValue, setLocalValue] = useState(String(score))

  useEffect(() => {
    setLocalValue(String(score))
  }, [score])

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-xl border-2 transition",
        winner && "bg-orange-100 border-orange-500",
        loser && "bg-red-100 border-red-300",
        !winner && !loser && "bg-gray-50 border-gray-200",
      )}
    >
      <p
        className={cn(
          "flex-1 text-sm truncate font-bold",
          winner && "text-orange-700",
          loser && "text-red-600",
          !winner && !loser && "text-gray-900"
        )}
      >
        {name}
      </p>

      <Input
        type="text"
        inputMode="numeric"
        value={localValue}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/\D/g, "").slice(0, 2)
          setLocalValue(cleaned)

          if (cleaned === "") {
            onScore(0)
            return
          }

          onScore(Number(cleaned))
        }}
        onBlur={() => {
          if (localValue === "") {
            setLocalValue("0")
            onScore(0)
          }
        }}
        className="w-20 h-10 text-center font-black rounded-xl"
        disabled={disabled}
      />
    </div>
  )
}
