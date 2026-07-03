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

import { useSpeechAnnouncer, SpeechAnnouncerSettings } from "@/components/speech-announcer"

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

function shortPersonName(name: string) {
  const parts = normalizeName(name).split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return parts[0] || ""
  const first = parts[0]
  const lastInitial = parts[parts.length - 1]?.charAt(0)?.toUpperCase() || ""
  return `${first} ${lastInitial}.`
}

function shortTeamName(name: string) {
  const clean = normalizeName(name)
  if (!clean) return ""
  if (clean.includes("/")) {
    return clean
      .split("/")
      .map((part) => shortPersonName(part))
      .join(" / ")
  }
  return shortPersonName(clean)
}

function fullTeamTitle(name: string) {
  return normalizeName(name) || "—"
}


function ptsFrom(wins: number) {
  return wins * 2 // wie deine Tabelle
}

const MEMBERS_CUP_POINTS: Record<number, number> = {
  1: 100,
  2: 95,
  3: 85,
  4: 70,
  5: 50,
  7: 35,
  9: 25,
  13: 15,
  17: 10,
}

function getMembersCupPoints(placement: number) {
  if (placement <= 1) return MEMBERS_CUP_POINTS[1]
  if (placement === 2) return MEMBERS_CUP_POINTS[2]
  if (placement === 3) return MEMBERS_CUP_POINTS[3]
  if (placement === 4) return MEMBERS_CUP_POINTS[4]
  if (placement <= 6) return MEMBERS_CUP_POINTS[5]
  if (placement <= 8) return MEMBERS_CUP_POINTS[7]
  if (placement <= 12) return MEMBERS_CUP_POINTS[9]
  if (placement <= 16) return MEMBERS_CUP_POINTS[13]
  return MEMBERS_CUP_POINTS[17]
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
const PO_3RD = PO_BASE + 8

// ---- DKO Finalrunde IDs (eigener Bereich, damit Single-KO und DKO sich nicht vermischen)
const DKO_BASE = 910000
const DKO_M = (n: number) => DKO_BASE + n



type PlayoffSize = 2 | 4 | 8
type FinalMode = "single_ko" | "double_ko"

type PoMatchDef = {
  id: number
  round: "QF" | "SF" | "F" | "P3" | "WB" | "LB" | "GF" | "RESET"
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
  { id: PO_3RD, round: "P3", label: "Platz 3" },
]

const PO_DEFS_2: PoMatchDef[] = [
  { id: PO_F, round: "F", label: "FINAL" },
]

const DKO_DEFS_8: PoMatchDef[] = [
  { id: DKO_M(1), round: "QF", label: "WB 1" },
  { id: DKO_M(2), round: "QF", label: "WB 2" },
  { id: DKO_M(3), round: "QF", label: "WB 3" },
  { id: DKO_M(4), round: "QF", label: "WB 4" },
  { id: DKO_M(5), round: "SF", label: "WB HF1" },
  { id: DKO_M(6), round: "SF", label: "WB HF2" },
  { id: DKO_M(7), round: "WB", label: "WB Finale" },
  { id: DKO_M(8), round: "LB", label: "LB 1" },
  { id: DKO_M(9), round: "LB", label: "LB 2" },
  { id: DKO_M(10), round: "LB", label: "LB 3" },
  { id: DKO_M(11), round: "LB", label: "LB 4" },
  { id: DKO_M(12), round: "LB", label: "LB HF" },
  { id: DKO_M(13), round: "LB", label: "LB Finale" },
  { id: DKO_M(14), round: "GF", label: "Grand Final" },
  { id: DKO_M(15), round: "RESET", label: "Reset Final" },
]

const DKO_DEFS_4: PoMatchDef[] = [
  { id: DKO_M(1), round: "SF", label: "WB HF1" },
  { id: DKO_M(2), round: "SF", label: "WB HF2" },
  { id: DKO_M(3), round: "WB", label: "WB Finale" },
  { id: DKO_M(4), round: "LB", label: "LB 1" },
  { id: DKO_M(5), round: "LB", label: "LB Finale" },
  { id: DKO_M(6), round: "GF", label: "Grand Final" },
  { id: DKO_M(7), round: "RESET", label: "Reset Final" },
]

const DKO_DEFS_2: PoMatchDef[] = [
  { id: DKO_M(1), round: "GF", label: "Finale" },
]

type DkoTarget = { matchId: number; position: 1 | 2 }
type DkoProgression = { winner?: DkoTarget; loser?: DkoTarget }

const DKO_PROGRESS_8: Record<number, DkoProgression> = {
  [DKO_M(1)]: { winner: { matchId: DKO_M(5), position: 1 }, loser: { matchId: DKO_M(8), position: 1 } },
  [DKO_M(2)]: { winner: { matchId: DKO_M(5), position: 2 }, loser: { matchId: DKO_M(8), position: 2 } },
  [DKO_M(3)]: { winner: { matchId: DKO_M(6), position: 1 }, loser: { matchId: DKO_M(9), position: 1 } },
  [DKO_M(4)]: { winner: { matchId: DKO_M(6), position: 2 }, loser: { matchId: DKO_M(9), position: 2 } },
  [DKO_M(5)]: { winner: { matchId: DKO_M(7), position: 1 }, loser: { matchId: DKO_M(11), position: 2 } },
  [DKO_M(6)]: { winner: { matchId: DKO_M(7), position: 2 }, loser: { matchId: DKO_M(10), position: 2 } },
  [DKO_M(7)]: { winner: { matchId: DKO_M(14), position: 1 }, loser: { matchId: DKO_M(13), position: 2 } },
  [DKO_M(8)]: { winner: { matchId: DKO_M(10), position: 1 } },
  [DKO_M(9)]: { winner: { matchId: DKO_M(11), position: 1 } },
  [DKO_M(10)]: { winner: { matchId: DKO_M(12), position: 1 } },
  [DKO_M(11)]: { winner: { matchId: DKO_M(12), position: 2 } },
  [DKO_M(12)]: { winner: { matchId: DKO_M(13), position: 1 } },
  [DKO_M(13)]: { winner: { matchId: DKO_M(14), position: 2 } },
}

const DKO_PROGRESS_4: Record<number, DkoProgression> = {
  [DKO_M(1)]: { winner: { matchId: DKO_M(3), position: 1 }, loser: { matchId: DKO_M(4), position: 1 } },
  [DKO_M(2)]: { winner: { matchId: DKO_M(3), position: 2 }, loser: { matchId: DKO_M(4), position: 2 } },
  [DKO_M(3)]: { winner: { matchId: DKO_M(6), position: 1 }, loser: { matchId: DKO_M(5), position: 2 } },
  [DKO_M(4)]: { winner: { matchId: DKO_M(5), position: 1 } },
  [DKO_M(5)]: { winner: { matchId: DKO_M(6), position: 2 } },
}

function getDkoDefs(size: PlayoffSize) {
  if (size === 8) return DKO_DEFS_8
  if (size === 4) return DKO_DEFS_4
  return DKO_DEFS_2
}

function getDkoProgression(size: PlayoffSize) {
  if (size === 8) return DKO_PROGRESS_8
  if (size === 4) return DKO_PROGRESS_4
  return {} as Record<number, DkoProgression>
}

function isDkoMatchId(id: number) {
  return id >= DKO_BASE && id < DKO_BASE + 100
}



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

  const [savingResults, setSavingResults] = useState(false)
  const [resultsSaved, setResultsSaved] = useState(false)
  const [hasSavedResults, setHasSavedResults] = useState(false)
  const [finishingTournament, setFinishingTournament] = useState(false)
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successTitle, setSuccessTitle] = useState("")
  const [successText, setSuccessText] = useState("")
  const [speechEnabled, setSpeechEnabled] = useState(false)
  const { announce } = useSpeechAnnouncer({ enabled: speechEnabled })

  // ---- UI: group tabs
  const [activeGroupId, setActiveGroupId] = useState<string>("")

  // ---- Playoff UI
  const [playoffSize, setPlayoffSize] = useState<PlayoffSize>(4)
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState<number>(2)
  const [finalMode, setFinalMode] = useState<FinalMode>("single_ko")

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

      const [{ count: membersCount }, { count: funCount }] = await Promise.all([
        supabase
          .from("members_cup_results")
          .select("id", { count: "exact", head: true })
          .eq("round_robin_id", roundRobinId),
        supabase
          .from("fun_tournament_results")
          .select("id", { count: "exact", head: true })
          .eq("round_robin_id", roundRobinId),
      ])

      setHasSavedResults(Number(membersCount || 0) > 0 || Number(funCount || 0) > 0)
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
    if (g <= 1) setPlayoffSize(2) // 1 Gruppe => Top 2 spielen Finale
    else if (g >= 4) setPlayoffSize(8)
    else if (g === 3) setPlayoffSize(8) // mit Wildcards
    else setPlayoffSize(4) // 2 Gruppen => klassisch 4er KO
  }, [groups.length])

  // ---- Build qualifiers from standings
  const effectiveQualifiersPerGroup = useMemo(() => {
    if (groups.length <= 1) return playoffSize
    return Math.max(1, Math.min(8, qualifiersPerGroup || 2))
  }, [groups.length, playoffSize, qualifiersPerGroup])

  const qualifiers = useMemo(() => {
    const perGroup = effectiveQualifiersPerGroup
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
  }, [groups, standingsByGroup, effectiveQualifiersPerGroup])

  const recommendedPlayoffSize = useMemo((): PlayoffSize => {
    const g = groups.length
    if (g <= 1) return 2
    if (g >= 4) return 8
    if (g === 3) return 8
    return 4
  }, [groups.length])

  const neededQualifierCount = useMemo(() => playoffSize, [playoffSize])
  
  

const qualifiedFinalists = useMemo(() => {
  const perGroup = effectiveQualifiersPerGroup
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
}, [groups, standingsByGroup, effectiveQualifiersPerGroup])
  
  
  

  const playoffExists = useMemo(() => {
    return Object.keys(playoffStates).length > 0
  }, [playoffStates])

  useEffect(() => {
    const ids = Object.keys(playoffStates).map(Number)
    if (ids.some(isDkoMatchId)) {
      setFinalMode("double_ko")
      const maxDkoId = Math.max(...ids.filter(isDkoMatchId).map((id) => id - DKO_BASE))
      if (maxDkoId >= 15) setPlayoffSize(8)
      else if (maxDkoId >= 7) setPlayoffSize(4)
    }
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

    if (finalMode === "double_ko" && size === 2) {
      alert("DKO macht erst ab 4 Teams Sinn. Bei Top 2 bitte Single KO verwenden.")
      return
    }

    const pairs = buildPairings(size, players)
    const rows: any[] = []

    const makeRow = (matchId: number, a?: Qualifier, b?: Qualifier) => ({
      tournament_type: tournamentTypePlayoff,
      tournament_id: roundRobinId,
      match_id: matchId,
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

    if (finalMode === "double_ko") {
      if (size === 8) {
        for (let i = 0; i < 4; i++) {
          const [a, b] = pairs[i] || []
          rows.push(makeRow(DKO_M(i + 1), a, b))
        }

        for (let id = 5; id <= 15; id++) {
          rows.push(makeRow(DKO_M(id)))
        }
      } else if (size === 4) {
        const s1 = pairs[0] || []
        const s2 = pairs[1] || []
        rows.push(makeRow(DKO_M(1), s1[0], s1[1]))
        rows.push(makeRow(DKO_M(2), s2[0], s2[1]))

        for (let id = 3; id <= 7; id++) {
          rows.push(makeRow(DKO_M(id)))
        }
      }
    } else if (size === 2) {
      const [a, b] = pairs[0] || []
      rows.push(makeRow(PO_F, a, b))
    } else if (size === 8) {
      const qfs = [PO_QF1, PO_QF2, PO_QF3, PO_QF4]
      for (let i = 0; i < 4; i++) {
        const [a, b] = pairs[i] || []
        rows.push(makeRow(qfs[i], a, b))
      }
      for (const d of PO_DEFS_8.filter((x) => x.round !== "QF")) {
        rows.push(makeRow(d.id))
      }
    } else {
  const s1 = pairs[0] || []
  const s2 = pairs[1] || []
  rows.push(makeRow(PO_SF1, s1[0], s1[1]))
  rows.push(makeRow(PO_SF2, s2[0], s2[1]))
  rows.push(makeRow(PO_F))
  rows.push(makeRow(PO_3RD))
}

    try {
      // Alte Finalrunde löschen, damit Single-KO und DKO nicht vermischt werden.
      const { error: deleteError } = await supabase
        .from("dko_match_states")
        .delete()
        .eq("tournament_type", tournamentTypePlayoff)
        .eq("tournament_id", roundRobinId)

      if (deleteError) throw deleteError

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

    const patchTarget = (
      states: Record<number, MatchState>,
      targetId: number,
      position: 1 | 2,
      player: { name: string; id: string | null }
    ) => {
      if (!player.name) return null

      const cur = states[targetId] || emptyState(targetId)
      if (!canAutoFillTarget(cur)) return null

      const samePlayer =
        position === 1
          ? normalizeName(cur.player1) === player.name && (cur.player1_id ?? null) === (player.id ?? null)
          : normalizeName(cur.player2) === player.name && (cur.player2_id ?? null) === (player.id ?? null)

      if (samePlayer) return null

      const next: MatchState = {
        ...cur,
        player1: position === 1 ? player.name : cur.player1,
        player2: position === 2 ? player.name : cur.player2,
        player1_id: position === 1 ? player.id : cur.player1_id,
        player2_id: position === 2 ? player.id : cur.player2_id,
        score1: 0,
        score2: 0,
        winner: undefined,
        loser: undefined,
        machineNumber: undefined,
        callCount: undefined,
        _localUpdate: true,
      }

      return next
    }

    const getWinnerOf = (states: Record<number, MatchState>, mid?: number) => {
      if (!mid) return { name: "", id: null as string | null }
      const st = states[mid]
      const name = normalizeName(st?.winner || "")
      if (!name) return { name: "", id: null as string | null }
      const id = name === normalizeName(st.player1) ? st.player1_id : name === normalizeName(st.player2) ? st.player2_id : null
      return { name, id: id ?? null }
    }

    const getLoserOf = (states: Record<number, MatchState>, mid?: number) => {
      if (!mid) return { name: "", id: null as string | null }
      const st = states[mid]
      const name = normalizeName(st?.loser || "")
      if (!name) return { name: "", id: null as string | null }
      const id = name === normalizeName(st.player1) ? st.player1_id : name === normalizeName(st.player2) ? st.player2_id : null
      return { name, id: id ?? null }
    }

    const updates: Array<{ id: number; st: MatchState }> = []
    const stagedStates: Record<number, MatchState> = { ...playoffStates }
    const stageUpdate = (id: number, st: MatchState | null) => {
      if (!st) return
      stagedStates[id] = st
      updates.push({ id, st })
    }

    if (finalMode === "double_ko") {
      const progression = getDkoProgression(playoffSize)

      Object.entries(progression).forEach(([sourceIdRaw, target]) => {
        const sourceId = Number(sourceIdRaw)
        const source = playoffStates[sourceId]
        if (!source?.winner || !source?.loser) return

        if (target.winner) {
          const winner = getWinnerOf(playoffStates, sourceId)
          const st = patchTarget(stagedStates, target.winner.matchId, target.winner.position, winner)
          stageUpdate(target.winner.matchId, st)
        }

        if (target.loser) {
          const loser = getLoserOf(playoffStates, sourceId)
          const st = patchTarget(stagedStates, target.loser.matchId, target.loser.position, loser)
          stageUpdate(target.loser.matchId, st)
        }
      })

      const grandFinalId = playoffSize === 8 ? DKO_M(14) : playoffSize === 4 ? DKO_M(6) : DKO_M(1)
      const resetFinalId = playoffSize === 8 ? DKO_M(15) : playoffSize === 4 ? DKO_M(7) : 0
      const grandFinal = playoffStates[grandFinalId]

      // Reset-Finale nur dann befüllen, wenn der Spieler aus dem Loser-Bracket das erste Grand Final gewinnt.
      if (resetFinalId && grandFinal?.winner && grandFinal?.winner === normalizeName(grandFinal.player2)) {
        const wbChampion = { name: normalizeName(grandFinal.player1), id: grandFinal.player1_id ?? null }
        const lbChampion = { name: normalizeName(grandFinal.player2), id: grandFinal.player2_id ?? null }
        const reset1 = patchTarget(stagedStates, resetFinalId, 1, wbChampion)
        stageUpdate(resetFinalId, reset1)
        const reset2 = patchTarget(stagedStates, resetFinalId, 2, lbChampion)
        stageUpdate(resetFinalId, reset2)
      }
    } else {
  const defs = playoffSize === 8 ? PO_DEFS_8 : playoffSize === 4 ? PO_DEFS_4 : PO_DEFS_2

  for (const d of defs) {
    if (!d.srcA || !d.srcB) continue
    const a = getWinnerOf(playoffStates, d.srcA)
    const b = getWinnerOf(playoffStates, d.srcB)
    const first = patchTarget(stagedStates, d.id, 1, a)
    stageUpdate(d.id, first)
    const second = patchTarget(stagedStates, d.id, 2, b)
    stageUpdate(d.id, second)
  }

  // ✅ Spiel um Platz 3 automatisch mit den beiden Halbfinal-Verlierern befüllen
  if (playoffSize === 4 || playoffSize === 8) {
    const loser1 = getLoserOf(playoffStates, PO_SF1)
    const loser2 = getLoserOf(playoffStates, PO_SF2)

    const thirdPlace1 = patchTarget(stagedStates, PO_3RD, 1, loser1)
    stageUpdate(PO_3RD, thirdPlace1)

    const thirdPlace2 = patchTarget(stagedStates, PO_3RD, 2, loser2)
    stageUpdate(PO_3RD, thirdPlace2)
  }
}

    if (updates.length) {
      setPlayoffStates((prev) => {
        const next = { ...prev }
        for (const u of updates) next[u.id] = u.st
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playoffStates, playoffExists, playoffSize, finalMode])

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

  let matchToAnnounce: MatchState | null = null

  if (selectedMatchScope === "playoff") {
    const base = playoffStates[selectedMatchId] || emptyState(selectedMatchId)
    matchToAnnounce = base

    setPlayoffStates((prev) => ({
      ...prev,
      [selectedMatchId]: {
        ...(prev[selectedMatchId] || base),
        machineNumber,
        callCount: 1,
        _localUpdate: true,
      },
    }))
  } else {
    const m = displayMatches.find((x) => x.id === selectedMatchId)
    const base = m?.state || emptyState(selectedMatchId)
    matchToAnnounce = base

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

  if (matchToAnnounce?.player1 && matchToAnnounce?.player2) {
    announce(matchToAnnounce.player1, matchToAnnounce.player2, machineNumber, 1)
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
  { id: PO_3RD, round: "P3", label: "Platz 3" },
]

// ---- Playoff display list
const playoffDefs = useMemo(
  () => (finalMode === "double_ko" ? getDkoDefs(playoffSize) : playoffSize === 8 ? PO_DEFS_8 : playoffSize === 4 ? PO_DEFS_4 : PO_DEFS_2),
  [playoffSize, finalMode]
)



  const playoffRoundGroups = useMemo(() => {
    const by: Record<string, PoMatchDef[]> = { QF: [], SF: [], WB: [], LB: [], GF: [], RESET: [], F: [], P3: [] }
    playoffDefs.forEach((d) => by[d.round].push(d))
    return by
  }, [playoffDefs])

  const champion = useMemo(() => {
    if (finalMode === "double_ko") {
      if (playoffSize === 8) {
        const grandFinal = playoffStates[DKO_M(14)]
        const resetFinal = playoffStates[DKO_M(15)]
        if (resetFinal?.winner) return normalizeName(resetFinal.winner)
        if (grandFinal?.winner && grandFinal.winner === normalizeName(grandFinal.player1)) return normalizeName(grandFinal.winner)
        return ""
      }

      if (playoffSize === 4) {
        const grandFinal = playoffStates[DKO_M(6)]
        const resetFinal = playoffStates[DKO_M(7)]
        if (resetFinal?.winner) return normalizeName(resetFinal.winner)
        if (grandFinal?.winner && grandFinal.winner === normalizeName(grandFinal.player1)) return normalizeName(grandFinal.winner)
        return ""
      }
    }

    const f = playoffStates[PO_F]
    return normalizeName(f?.winner || "")
  }, [playoffStates, finalMode, playoffSize])

  const finalPlacements = useMemo(() => {
    const allTeams = Object.values(standingsByGroup)
      .flatMap((groupTable) => Object.values(groupTable))
      .sort((a, b) => {
        const pa = ptsFrom(a.w)
        const pb = ptsFrom(b.w)
        const da = a.legsFor - a.legsAgainst
        const db = b.legsFor - b.legsAgainst

        if (pb !== pa) return pb - pa
        if (db !== da) return db - da
        if (b.legsFor !== a.legsFor) return b.legsFor - a.legsFor
        return a.name.localeCompare(b.name)
      })

    const byName = new Map<string, any>()
    allTeams.forEach((team) => byName.set(normalizeName(team.name), team))

    const result: Array<{ placement: number; team_id: string | null; team_name: string }> = []
    const used = new Set<string>()

    const addTeam = (placement: number, name?: string, id?: string | null) => {
      const cleanName = normalizeName(name || "")
      if (!cleanName || used.has(cleanName)) return

      result.push({
        placement,
        team_id: id ?? byName.get(cleanName)?.player_id ?? null,
        team_name: cleanName,
      })

      used.add(cleanName)
    }

    const addDkoLoser = (placement: number, matchId: number) => {
      const state = playoffStates[matchId]
      const loserName = normalizeName(state?.loser || "")
      if (!loserName) return
      const loserId =
        loserName === normalizeName(state?.player1 || "")
          ? state?.player1_id
          : loserName === normalizeName(state?.player2 || "")
            ? state?.player2_id
            : byName.get(loserName)?.player_id
      addTeam(placement, loserName, loserId ?? null)
    }

    if (playoffExists && finalMode === "double_ko") {
      if (playoffSize === 8) {
        const grandFinal = playoffStates[DKO_M(14)]
        const resetFinal = playoffStates[DKO_M(15)]
        const finalMatch = resetFinal?.winner ? resetFinal : grandFinal

        if (champion && finalMatch?.winner) {
          addTeam(1, finalMatch.winner, finalMatch.winner === normalizeName(finalMatch.player1) ? finalMatch.player1_id : finalMatch.player2_id)
          addTeam(2, finalMatch.loser, finalMatch.loser === normalizeName(finalMatch.player1) ? finalMatch.player1_id : finalMatch.player2_id)
          addDkoLoser(3, DKO_M(13))
          addDkoLoser(4, DKO_M(12))
          addDkoLoser(5, DKO_M(10))
          addDkoLoser(5, DKO_M(11))
          addDkoLoser(7, DKO_M(8))
          addDkoLoser(7, DKO_M(9))
        }
      } else if (playoffSize === 4) {
        const grandFinal = playoffStates[DKO_M(6)]
        const resetFinal = playoffStates[DKO_M(7)]
        const finalMatch = resetFinal?.winner ? resetFinal : grandFinal

        if (champion && finalMatch?.winner) {
          addTeam(1, finalMatch.winner, finalMatch.winner === normalizeName(finalMatch.player1) ? finalMatch.player1_id : finalMatch.player2_id)
          addTeam(2, finalMatch.loser, finalMatch.loser === normalizeName(finalMatch.player1) ? finalMatch.player1_id : finalMatch.player2_id)
          addDkoLoser(3, DKO_M(5))
          addDkoLoser(4, DKO_M(4))
        }
      }
    } else {
  const final = playoffStates[PO_F]
  const thirdPlaceMatch = playoffStates[PO_3RD]

  if (playoffExists && final?.winner) {
    addTeam(
      1,
      final.winner,
      final.winner === normalizeName(final.player1) ? final.player1_id : final.player2_id
    )

    addTeam(
      2,
      final.loser,
      final.loser === normalizeName(final.player1) ? final.player1_id : final.player2_id
    )

    // Bei Top 4 / Top 8 zählt das echte Spiel um Platz 3
    if ((playoffSize === 4 || playoffSize === 8) && thirdPlaceMatch?.winner) {
      addTeam(
        3,
        thirdPlaceMatch.winner,
        thirdPlaceMatch.winner === normalizeName(thirdPlaceMatch.player1)
          ? thirdPlaceMatch.player1_id
          : thirdPlaceMatch.player2_id
      )

      addTeam(
        4,
        thirdPlaceMatch.loser,
        thirdPlaceMatch.loser === normalizeName(thirdPlaceMatch.player1)
          ? thirdPlaceMatch.player1_id
          : thirdPlaceMatch.player2_id
      )
    }
  }
}

    allTeams.forEach((team) => {
      if (!used.has(normalizeName(team.name))) {
        addTeam(result.length + 1, team.name, team.player_id)
      }
    })

    return result.sort((a, b) => a.placement - b.placement)
  }, [standingsByGroup, playoffStates, playoffExists, finalMode, playoffSize, champion])

  // ✅ Speicher-Buttons erst anzeigen, wenn das Turnier wirklich fertig ist:
  // Gruppenphase fertig + Finalrunde erstellt + Finale gespielt + Platzierungen vorhanden
  const thirdPlaceReady =
  finalMode !== "single_ko" || playoffSize === 2 || Boolean(playoffStates[PO_3RD]?.winner)

const resultSaveReady =
  groupPhaseFinished && playoffExists && Boolean(champion) && thirdPlaceReady && finalPlacements.length > 0

  const showSuccess = (title: string, text: string) => {
    setSuccessTitle(title)
    setSuccessText(text)
    setSuccessOpen(true)
    setResultsSaved(true)
    setHasSavedResults(true)

    window.setTimeout(() => {
      setResultsSaved(false)
    }, 5000)
  }

  const saveFunTournamentResults = async () => {
    if (!resultSaveReady) {
      alert("Bitte zuerst Gruppenphase und Finalrunde vollständig fertig spielen.")
      return
    }

    if (finalPlacements.length === 0) {
      alert("Keine Platzierungen gefunden.")
      return
    }

    try {
      setSavingResults(true)

      const rows = finalPlacements.map((row) => ({
        round_robin_id: roundRobinId,
        tournament_name: tournamentName,
        team_id: row.team_id,
        team_name: row.team_name,
        placement: row.placement,
      }))

      const { error } = await supabase
        .from("fun_tournament_results")
        .upsert(rows, {
          onConflict: "round_robin_id,team_name",
        })

      if (error) throw error

      showSuccess("Normales Turnier gespeichert", `${rows.length} Platzierungen wurden gespeichert oder aktualisiert.`)
    } catch (error: any) {
      console.error("[RR] save fun results error:", error)
      alert(error?.message || "Normales-Turnier konnte nicht gespeichert werden.")
    } finally {
      setSavingResults(false)
    }
  }

  const saveMembersCupResults = async () => {
    if (!resultSaveReady) {
      alert("Bitte zuerst Gruppenphase und Finalrunde vollständig fertig spielen.")
      return
    }

    if (finalPlacements.length === 0) {
      alert("Keine Platzierungen gefunden.")
      return
    }

    try {
      setSavingResults(true)

      const { data: teamMembers, error: teamMembersError } = await supabase
        .from("members_cup_team_members")
        .select("team_id,team_name,player1_id,player1_name,player2_id,player2_name")
        .eq("round_robin_id", roundRobinId)

      if (teamMembersError) throw teamMembersError

      if (!teamMembers || teamMembers.length === 0) {
        alert("Keine Members-Cup-Teamzuordnung gefunden. Dieses Turnier wurde vermutlich nicht über die Members-Cup-Auslosung erstellt.")
        return
      }

      const memberByTeamId = new Map<string, any>()
      const memberByTeamName = new Map<string, any>()

      teamMembers.forEach((row: any) => {
        memberByTeamId.set(String(row.team_id), row)
        memberByTeamName.set(normalizeName(row.team_name), row)
      })

      const rows: any[] = []

      finalPlacements.forEach((placementRow) => {
        const teamRow =
          (placementRow.team_id ? memberByTeamId.get(String(placementRow.team_id)) : null) ||
          memberByTeamName.get(normalizeName(placementRow.team_name))

        if (!teamRow) return

        const points = getMembersCupPoints(placementRow.placement)

        rows.push({
          round_robin_id: roundRobinId,
          tournament_name: tournamentName,
          team_id: String(teamRow.team_id),
          team_name: teamRow.team_name,
          player_id: String(teamRow.player1_id),
          player_name: teamRow.player1_name,
          placement: placementRow.placement,
          points,
        })

        rows.push({
          round_robin_id: roundRobinId,
          tournament_name: tournamentName,
          team_id: String(teamRow.team_id),
          team_name: teamRow.team_name,
          player_id: String(teamRow.player2_id),
          player_name: teamRow.player2_name,
          placement: placementRow.placement,
          points,
        })
      })

      if (rows.length === 0) {
        alert("Keine Spielerpunkte erzeugt. Team-Zuordnung prüfen.")
        return
      }

      const { error } = await supabase
        .from("members_cup_results")
        .upsert(rows, {
          onConflict: "round_robin_id,player_id",
        })

      if (error) throw error

      showSuccess("Members Cup gespeichert", `${rows.length} Punkte-Einträge wurden gespeichert oder aktualisiert.`)
    } catch (error: any) {
      console.error("[RR] save members cup results error:", error)
      alert(error?.message || "Members Cup Punkte konnten nicht gespeichert werden.")
    } finally {
      setSavingResults(false)
    }
  }
  
  
  
  const handleFinishTournament = async () => {
  if (!roundRobinId) return

  try {
    setFinishingTournament(true)

    const [
      { count: membersCount, error: membersCountError },
      { count: funCount, error: funCountError },
    ] = await Promise.all([
      supabase
        .from("members_cup_results")
        .select("id", { count: "exact", head: true })
        .eq("round_robin_id", roundRobinId),
      supabase
        .from("fun_tournament_results")
        .select("id", { count: "exact", head: true })
        .eq("round_robin_id", roundRobinId),
    ])

    if (membersCountError) throw membersCountError
    if (funCountError) throw funCountError

    const savedRows = Number(membersCount || 0) + Number(funCount || 0)

    if (savedRows <= 0) {
      setFinishConfirmOpen(false)
      alert("Bitte zuerst Ergebnisse speichern.")
      return
    }

    const { error: statusError } = await supabase
      .from("tournaments_status")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("tournament_id", roundRobinId)

    if (statusError) throw statusError

    const { error: roundRobinError } = await supabase
      .from("round_robin")
      .update({
        status: "completed",
      })
      .eq("id", roundRobinId)

    if (roundRobinError) throw roundRobinError

    const { error: registrationError } = await supabase
      .from("dko_tournament_registration")
      .delete()
      .not("id", "is", null)

    if (registrationError) throw registrationError

    setFinishConfirmOpen(false)
    setSuccessTitle("Turnier abgeschlossen")
    setSuccessText(
      "Ergebnisse wurden gespeichert, das Turnier wurde abgeschlossen und die Anmeldung wurde geleert. Du wirst gleich zur Anmeldung weitergeleitet."
    )
    setSuccessOpen(true)

    window.setTimeout(() => {
      router.push("/dko_tournament_registration")
    }, 1400)
  } catch (error: any) {
    console.error("[RR] finish tournament error:", error)
    alert(error?.message || "Turnier konnte nicht abgeschlossen werden.")
  } finally {
    setFinishingTournament(false)
  }
}

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

<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
  <Card className="p-4 rounded-2xl border border-orange-200 bg-orange-50">
    <SpeechAnnouncerSettings enabled={speechEnabled} onToggle={setSpeechEnabled} />
  </Card>
</div>

      {/* HERO */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl">
                <Layers className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight line-clamp-2" title={tournamentName}>{tournamentName}</h1>
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

      <main className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">


        {/* TOP GRID */}
        <div className="grid lg:grid-cols-3 gap-6 items-start">
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
    <div className="mt-3 space-y-2 max-h-[120px] overflow-auto pr-1">
      {playableMatches.slice(0, 3).map((m) => (
        <div key={m.id} className="rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-black text-gray-600">
                Runde {m.round_no} · Match {m.match_no}
              </div>
              <div className="text-sm font-black text-gray-900 leading-tight" title={`${m.state.player1} vs ${m.state.player2}`}>
                <div className="truncate">{shortTeamName(m.state.player1)}</div>
                <div className="text-[10px] font-black text-orange-600 uppercase leading-none my-0.5">vs</div>
                <div className="truncate">{shortTeamName(m.state.player2)}</div>
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

          





        {/* FINALRUNDE PANEL - CLEAN */}
        <Card className="rounded-2xl border-2 border-orange-100 shadow-lg p-5 bg-white">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Crown className="w-5 h-5 text-orange-600" />
                Finalrunde einstellen
              </h2>
              <p className="text-sm text-gray-600 font-semibold mt-1">
                Erst Gruppenphase fertig spielen, dann Finalmodus wählen und Finalrunde erstellen.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "inline-flex items-center rounded-full border-2 px-3 py-1 text-xs font-black",
                groupPhaseFinished ? "bg-green-50 border-green-200 text-green-800" : "bg-orange-50 border-orange-200 text-orange-800"
              )}>
                {groupPhaseFinished ? "Gruppenphase fertig" : "Gruppenphase läuft"}
              </span>
              <span className="inline-flex items-center rounded-full border-2 border-gray-200 bg-gray-50 px-3 py-1 text-xs font-black text-gray-700">
                Empfehlung: Top {recommendedPlayoffSize}
              </span>
            </div>
          </div>

          <div className="mt-5 grid xl:grid-cols-3 gap-4">
            {/* Auswahl */}
            <div className="xl:col-span-1 space-y-4">
              <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">1. Was wird gespielt?</div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFinalMode("single_ko")}
                    className={cn(
                      "rounded-xl border-2 p-3 text-left transition-all",
                      finalMode === "single_ko"
                        ? "bg-orange-600 border-orange-600 text-white shadow-md"
                        : "bg-white border-gray-200 text-gray-800 hover:border-orange-300"
                    )}
                  >
                    <div className="font-black text-sm">Single KO</div>
                    <div className={cn("text-xs mt-1", finalMode === "single_ko" ? "text-orange-50" : "text-gray-500")}>1 Niederlage = raus</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFinalMode("double_ko")}
                    className={cn(
                      "rounded-xl border-2 p-3 text-left transition-all",
                      finalMode === "double_ko"
                        ? "bg-orange-600 border-orange-600 text-white shadow-md"
                        : "bg-white border-gray-200 text-gray-800 hover:border-orange-300"
                    )}
                  >
                    <div className="font-black text-sm">Doppel KO</div>
                    <div className={cn("text-xs mt-1", finalMode === "double_ko" ? "text-orange-50" : "text-gray-500")}>2 Niederlagen = raus</div>
                  </button>
                </div>

                {finalMode === "double_ko" ? (
                  <div className="mt-3 rounded-xl border-2 border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-900">
                    Doppel KO aktiv: Wer zweimal verliert, ist ausgeschieden. Bei Top 2 bitte Single KO verwenden.
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">2. Wie viele kommen weiter?</div>

                <div className="grid grid-cols-3 gap-2">
                  {([2, 4, 8] as PlayoffSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPlayoffSize(size)}
                      className={cn(
                        "rounded-xl border-2 px-3 py-3 font-black transition-all",
                        playoffSize === size
                          ? "bg-orange-600 border-orange-600 text-white shadow-md"
                          : "bg-white border-gray-200 text-gray-800 hover:border-orange-300"
                      )}
                    >
                      Top {size}
                    </button>
                  ))}
                </div>

                {groups.length > 1 ? (
                  <div className="mt-3 rounded-xl border-2 border-white bg-white p-3">
                    <div className="text-xs font-black text-gray-500 mb-2">Qualifizierte je Gruppe</div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={8}
                        value={qualifiersPerGroup}
                        onChange={(e) => setQualifiersPerGroup(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
                        className="h-9 w-24 text-center font-black"
                      />
                      <span className="text-xs font-bold text-gray-600">
                        aktuell: {effectiveQualifiersPerGroup} pro Gruppe
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border-2 border-white bg-white px-3 py-2 text-xs font-bold text-gray-700">
                    Bei 1 Gruppe kommen automatisch die besten {playoffSize} Teams der Tabelle weiter.
                  </div>
                )}
              </div>

              <Button
                className={cn(
                  "w-full h-12 rounded-xl font-black",
                  groupPhaseFinished && qualifiedFinalists.length >= playoffSize && !(finalMode === "double_ko" && playoffSize === 2)
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-gray-300 text-gray-500"
                )}
                disabled={!groupPhaseFinished || qualifiedFinalists.length < playoffSize || (finalMode === "double_ko" && playoffSize === 2)}
                onClick={createPlayoffs}
              >
                <Swords className="w-4 h-4 mr-2" />
                {playoffExists
                  ? `${finalMode === "single_ko" ? "Single KO" : "Doppel KO"} neu erstellen`
                  : `${finalMode === "single_ko" ? "Single KO" : "Doppel KO"} erstellen`}
              </Button>
            </div>

            {/* Qualifizierte */}
            <div className="rounded-2xl border-2 border-orange-100 bg-orange-50 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="font-black text-gray-900">Qualifizierte</div>
                  <div className="text-xs font-bold text-gray-600">
                    {qualifiedFinalists.length}/{playoffSize} Teams für die Finalrunde
                  </div>
                </div>
                <div className="rounded-full bg-white border-2 border-orange-200 px-3 py-1 text-xs font-black text-orange-700">
                  {finalMode === "single_ko" ? "Single KO" : "DKO"}
                </div>
              </div>

              {qualifiedFinalists.length === 0 ? (
                <div className="rounded-xl border-2 border-white bg-white p-4 text-sm text-gray-500 font-semibold">
                  Noch keine Ergebnisse in der Gruppenphase.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-auto pr-1">
                  {qualifiedFinalists.slice(0, playoffSize).map((q, idx) => (
                    <div
                      key={`${q.group_id}-${q.name}`}
                      className="flex items-center justify-between gap-3 rounded-xl border-2 border-white bg-white px-3 py-2 shadow-sm"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-black shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-black text-gray-900 truncate" title={q.name}>{shortTeamName(q.name)}</span>
                      </div>
                      <div className="text-[11px] font-black text-gray-600 shrink-0">
                        G{q.group_no} · #{q.place} · {q.points}P · {q.legsFor - q.legsAgainst}Δ
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!groupPhaseFinished ? (
                <div className="mt-3 text-xs font-black text-orange-800 border-2 border-orange-200 bg-orange-100/60 rounded-xl px-3 py-2">
                  Finalrunde erst möglich, wenn alle Gruppenspiele fertig sind.
                </div>
              ) : null}
            </div>

            {/* Finalbaum */}
            <div className="xl:col-span-1 rounded-2xl border-2 border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="font-black text-gray-900">Finalbaum</div>
                {playoffExists ? (
                  <span className="rounded-full bg-green-50 border-2 border-green-200 px-3 py-1 text-xs font-black text-green-800">erstellt</span>
                ) : (
                  <span className="rounded-full bg-white border-2 border-gray-200 px-3 py-1 text-xs font-black text-gray-600">offen</span>
                )}
              </div>

              {!playoffExists ? (
                <div className="h-[220px] rounded-xl border-2 border-dashed border-gray-300 bg-white flex items-center justify-center text-center p-4 text-gray-500 font-semibold">
                  Noch keine Finalrunde erstellt. Oben Modus und Anzahl wählen.
                </div>
              ) : (
                <div className="space-y-4 max-h-[420px] overflow-auto pr-1">
                  {champion && (
                    <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-3">
                      <div className="text-xs font-black text-green-900">Champion</div>
                      <div className="text-lg font-black text-green-800 truncate" title={champion}>{shortTeamName(champion)}</div>
                    </div>
                  )}

                  {(["QF", "SF", "WB", "LB", "GF", "RESET", "F", "P3"] as const).map((rnd) => {
                    const list = playoffRoundGroups[rnd] || []
                    if (!list.length) return null
                    return (
                      <div key={rnd} className="space-y-2">
                        <h3 className="text-sm font-black text-orange-600">
                          {rnd === "QF"
                            ? "Viertelfinale / Runde 1"
                            : rnd === "SF"
                              ? "Halbfinale"
                              : rnd === "WB"
                                ? "Winner-Bracket Finale"
                                : rnd === "LB"
                                  ? "Loser-Bracket"
                                  : rnd === "GF"
                                    ? "Grand Final"
                                    : rnd === "RESET"
  ? "Reset Final"
  : rnd === "P3"
    ? "Spiel um Platz 3"
    : "Finale"}
                        </h3>
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
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ERGEBNISSE SPEICHERN */}
        <Card className="rounded-2xl border-2 border-orange-100 shadow-lg p-5 bg-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-orange-600" />
                Ergebnisse speichern
              </h2>
              <p className="text-sm text-gray-600 font-semibold mt-1">
                Speichere die Turnierergebnisse entweder als normales Turnier oder werte sie für den Members Cup aus.  
Bei Members-Cup-Turnieren werden die Punkte automatisch beiden Doppelspielern gutgeschrieben.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {resultSaveReady ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={savingResults}
                    onClick={saveFunTournamentResults}
                    className="font-black"
                  >
                    {savingResults ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Trophy className="w-4 h-4 mr-2" />}
                    Normales-Turnier speichern
                  </Button>

                  <Button
                    type="button"
                    disabled={savingResults}
                    onClick={saveMembersCupResults}
                    className="font-black bg-orange-600 hover:bg-orange-700"
                  >
                    {savingResults ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Crown className="w-4 h-4 mr-2" />}
                    Members Cup Punkte speichern
                  </Button>
                </>
              ) : null}

              <Button
                type="button"
                disabled={!hasSavedResults || finishingTournament}
                onClick={() => setFinishConfirmOpen(true)}
                className={cn(
                  "font-black",
                  hasSavedResults
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-300 text-gray-500 hover:bg-gray-300",
                )}
              >
                {finishingTournament ? (
                  <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Turnier abschließen
              </Button>
            </div>
          </div>

          {resultsSaved ? (
            <div className="mt-4 rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3 text-green-800 font-black">
              Ergebnisse wurden gespeichert oder aktualisiert. Turnier abschließen ist jetzt möglich.
            </div>
          ) : null}

          {!resultSaveReady && !hasSavedResults ? (
            <div className="mt-4 rounded-xl border-2 border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-900 font-bold">
              Die Speicher-Buttons erscheinen erst, wenn Gruppenphase und Finalrunde vollständig fertig gespielt sind.  

            </div>
          ) : null}

          {resultSaveReady && !hasSavedResults ? (
            <div className="mt-4 rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3 text-green-900 font-bold">
              Das Turnier ist fertig. Speichere jetzt die Ergebnisse als normales Turnier oder als Members-Cup-Wertung.  
Danach kannst du das Turnier vollständig.
            </div>
          ) : null}

          <div className="mt-5">
            {finalPlacements.length === 0 ? (
              <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-600">
                Noch keine Platzierungen berechenbar. Gruppenphase oder Finalrunde zuerst fertig spielen.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto pr-1">
                {finalPlacements.map((row) => (
                  <div
                    key={`${row.placement}-${row.team_name}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black text-gray-500">Platz {row.placement}</div>
                      <div className="font-black text-gray-900 truncate" title={row.team_name}>
                        {shortTeamName(row.team_name)}
                      </div>
                    </div>

                    <div className="rounded-xl border-2 border-orange-200 bg-orange-50 px-3 py-2 text-sm font-black text-orange-700 shrink-0">
                      {getMembersCupPoints(row.placement)} Punkte
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                          <span className="truncate" title={r.name}>{shortTeamName(r.name)}</span>
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

      <Dialog open={finishConfirmOpen} onOpenChange={setFinishConfirmOpen}>
        <DialogContent className="max-w-md rounded-3xl border-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-orange-600">
              <Check className="w-6 h-6" />
              Turnier abschließen?
            </DialogTitle>

            <DialogDescription className="text-base pt-2">
              Dadurch wird das Turnier als abgeschlossen markiert, die aktuelle Anmeldung geleert und du wirst zur Anmeldung weitergeleitet.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border-2 border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-bold text-yellow-900">
            Wichtig: Ergebnisse müssen vorher gespeichert sein. Die Team- und Punktehistorie bleibt erhalten.
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFinishConfirmOpen(false)}
              disabled={finishingTournament}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleFinishTournament}
              disabled={finishingTournament}
              className="bg-green-600 hover:bg-green-700"
            >
              {finishingTournament ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Ja, abschließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md rounded-3xl border-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-green-600">
              <Check className="w-6 h-6" />
              {successTitle}
            </DialogTitle>

            <DialogDescription className="text-base pt-2">
              {successText}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end pt-4">
            <Button onClick={() => setSuccessOpen(false)} className="bg-green-600 hover:bg-green-700">
              Schließen
            </Button>
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
          Sieger: <span title={winner}>{shortTeamName(winner)}</span>
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
          Sieger: <span title={winner}>{shortTeamName(winner)}</span>
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
        title={fullTeamTitle(name)}
        className={cn(
          "flex-1 text-sm truncate font-bold leading-tight",
          winner && "text-orange-700",
          loser && "text-red-600",
          !winner && !loser && "text-gray-900"
        )}
      >
        {shortTeamName(name) || name}
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
