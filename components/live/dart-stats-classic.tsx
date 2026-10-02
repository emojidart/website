"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Target } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { useParams } from "next/navigation"
import Link from "next/link"

// =========================
// SUPABASE
// =========================
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// =========================
// TYPES
// =========================

type StatKey =
  | "t20"
  | "t19"
  | "t18"
  | "t17"
  | "t16"
  | "t15"
  | "bull"
  | "s180"
  | "s171"
  | "hton"
  | "ton"
  | "u30"
  | "u26"
  | "semperit"

type ActionKey = StatKey | "legs_won" | "legs_lost"

type Player = {
  id: string
  name: string
  stats: Record<StatKey, number>
  legsWon: number
  legsLost: number
}

type Action = {
  playerId: string
  key: ActionKey
  delta: number
  ts: number
}

// =========================
// CONSTANTS
// =========================

const EMPTY: Record<StatKey, number> = {
  t20: 0,
  t19: 0,
  t18: 0,
  t17: 0,
  t16: 0,
  t15: 0,
  bull: 0,
  s180: 0,
  s171: 0,
  hton: 0,
  ton: 0,
  u30: 0,
  u26: 0,
  semperit: 0,
}

const FIELDS = [
  { key: "t20", label: "20" },
  { key: "t19", label: "19" },
  { key: "t18", label: "18" },
  { key: "t17", label: "17" },
  { key: "t16", label: "16" },
  { key: "t15", label: "15" },
  { key: "bull", label: "Bull" },
  { key: "s180", label: "180" },
  { key: "s171", label: "171" },
  { key: "hton", label: "H. Ton" },
  { key: "ton", label: "Ton" },
  { key: "u30", label: "< 30" },
  { key: "u26", label: "< 26" },
  { key: "semperit", label: "Semperit" },
] as { key: StatKey; label: string }[]

function labelFor(key: ActionKey) {
  if (key === "legs_won") return "Legs W"
  if (key === "legs_lost") return "Legs L"
  return FIELDS.find((f) => f.key === key)?.label ?? key
}

// UI -> DB Spaltenmapping (leg_statistics)
const KEY_TO_DB_COL: Record<StatKey, string> = {
  t20: "throws_20",
  t19: "throws_19",
  t18: "throws_18",
  t17: "throws_17",
  t16: "throws_16",
  t15: "throws_15",
  bull: "throws_bull",
  s180: "throws_180",
  s171: "throws_171",
  hton: "throws_high_tonne",
  ton: "throws_tonne",
  u30: "throws_under_30",
  u26: "throws_under_26",
  semperit: "semperit_outs",
}

const DB_SELECT = `
  match_id, leg_number, player_id, dart_type,
  player_legs_won, opponent_legs_won,
  leg_winner_id, leg_wins,
  throws_20, throws_19, throws_18, throws_17, throws_16, throws_15,
  throws_bull,
  throws_180, throws_171,
  throws_high_tonne, throws_tonne,
  throws_under_30, throws_under_26,
  semperit_outs
`

type DbRow = {
  match_id: string
  leg_number: number
  player_id: string
  dart_type: string | null
  player_legs_won: number | null
  opponent_legs_won: number | null
  leg_winner_id: string | null
  leg_wins: number | null
  throws_20: number | null
  throws_19: number | null
  throws_18: number | null
  throws_17: number | null
  throws_16: number | null
  throws_15: number | null
  throws_bull: number | null
  throws_180: number | null
  throws_171: number | null
  throws_high_tonne: number | null
  throws_tonne: number | null
  throws_under_30: number | null
  throws_under_26: number | null
  semperit_outs: number | null
}

function dbRowToStats(r: DbRow): Record<StatKey, number> {
  return {
    t20: r.throws_20 ?? 0,
    t19: r.throws_19 ?? 0,
    t18: r.throws_18 ?? 0,
    t17: r.throws_17 ?? 0,
    t16: r.throws_16 ?? 0,
    t15: r.throws_15 ?? 0,
    bull: r.throws_bull ?? 0,
    s180: r.throws_180 ?? 0,
    s171: r.throws_171 ?? 0,
    hton: r.throws_high_tonne ?? 0,
    ton: r.throws_tonne ?? 0,
    u30: r.throws_under_30 ?? 0,
    u26: r.throws_under_26 ?? 0,
    semperit: r.semperit_outs ?? 0,
  }
}

function uniqById(list: { id: string; name: string }[]) {
  const seen = new Set<string>()
  return list.filter((p) => {
    if (!p?.id || !p?.name) return false
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })
}

/* =========================
   OVERLAYS
========================= */

function HitOverlay({
  open,
  headline,
  variant,
}: {
  open: boolean
  headline: string
  variant: "plus" | "minus" | "undo" | "reset"
}) {
  if (!open) return null

  const bg =
    variant === "plus"
      ? "bg-green-600"
      : variant === "minus"
        ? "bg-red-600"
        : variant === "undo"
          ? "bg-blue-600"
          : "bg-gray-900"

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-3">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl text-white text-base sm:text-xl font-bold text-center py-4 sm:py-5 ${bg}`}
      >
        {headline}
      </div>
    </div>
  )
}

function PlayerSwitchOverlay({ open, name }: { open: boolean; name: string }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl px-8 sm:px-12 py-8 sm:py-10 shadow-2xl text-center animate-in fade-in zoom-in duration-200">
        <div className="text-2xl sm:text-3xl font-bold text-gray-900">{name}</div>
      </div>
    </div>
  )
}

/* =========================
   PAGE
========================= */

export default function DartStatsClassicPage({
  initialPlayers = [],
  loadingPlayers = false,
}: {
  initialPlayers?: { id: string; name: string }[]
  loadingPlayers?: boolean
}) {
  const params = useParams<{ matchId: string }>()
  const matchId = params?.matchId
  const legNumber = 1

  const [dartType, setDartType] = useState<string>("steeldart")
  const [dbStatus, setDbStatus] = useState<string>("")

  // Lineup-based players (ONLY when REALLY confirmed)
  const [lineupPlayers, setLineupPlayers] = useState<{ id: string; name: string }[] | null>(null)
  const [loadingLineup, setLoadingLineup] = useState(false)

  // Load confirmed lineup players (if any). NO FALLBACK to initialPlayers.
  useEffect(() => {
    if (!matchId) return
    let cancelled = false

    ;(async () => {
      try {
        setLoadingLineup(true)

        const hdrRes = await supabase
          .from("match_lineup_headers")
          .select("team_id,status,current_version,confirmed_version,confirmed_at")
          .eq("match_id", matchId)
          .eq("status", "confirmed")
          .order("confirmed_at", { ascending: false })

        if (cancelled) return

        const headers = (hdrRes.data as any[]) || []
        const reallyConfirmed = headers.filter(
          (h) =>
            h?.status === "confirmed" &&
            h?.confirmed_version != null &&
            h?.current_version != null &&
            h?.confirmed_version === h?.current_version
        )

        if (hdrRes.error || reallyConfirmed.length === 0) {
          setLineupPlayers(null)
          setLoadingLineup(false)
          return
        }

        const teamIds = Array.from(new Set(reallyConfirmed.map((h) => h.team_id).filter(Boolean)))

        const lineupsRes = await supabase
          .from("match_lineups")
          .select("player_id,position,is_substitute,team_id")
          .eq("match_id", matchId)
          .in("team_id", teamIds)
          .order("is_substitute", { ascending: true })
          .order("position", { ascending: true })

        if (cancelled) return

        const rows = ((lineupsRes.data ?? []) as any[]).filter((r) => r?.player_id)

        if (lineupsRes.error || rows.length === 0) {
          setLineupPlayers(null)
          setLoadingLineup(false)
          return
        }

        const orderedIds: string[] = []
        const seen = new Set<string>()
        for (const r of rows) {
          const pid = r.player_id as string
          if (!pid || seen.has(pid)) continue
          seen.add(pid)
          orderedIds.push(pid)
        }

        // Resolve names: prefer initialPlayers, fetch missing from club_players
        const initMap = new Map((initialPlayers ?? []).map((p) => [p.id, p.name] as const))
        const missing = orderedIds.filter((id) => !initMap.get(id))

        let fetchedMap = new Map<string, string>()
        if (missing.length > 0) {
          const plRes = await supabase.from("club_players").select("id,name").in("id", missing)
          if (!plRes.error && plRes.data) {
            fetchedMap = new Map((plRes.data as any[]).map((p) => [p.id as string, (p.name as string) ?? "Spieler"]))
          }
        }

        const resolved = orderedIds.map((id) => ({
          id,
          name: initMap.get(id) ?? fetchedMap.get(id) ?? "Spieler",
        }))

        if (!cancelled) {
          setLineupPlayers(uniqById(resolved))
        }
      } finally {
        if (!cancelled) setLoadingLineup(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [matchId, initialPlayers])

  const effectiveLoadingPlayers = loadingPlayers || loadingLineup

  // ✅ IMPORTANT: NO fallback to initialPlayers. If not confirmed -> incoming is empty.
  const incoming = useMemo(() => uniqById(lineupPlayers ?? []), [lineupPlayers])
  const incomingSig = useMemo(() => incoming.map((p) => `${p.id}:${p.name}`).join("|"), [incoming])
  const lastSigRef = useRef<string>("")

  const [players, setPlayers] = useState<Player[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [history, setHistory] = useState<Action[]>([])

  // dart_type from matches
  useEffect(() => {
    if (!matchId) return
    let cancelled = false

    ;(async () => {
      const res = await supabase.from("matches").select("dart_type").eq("id", matchId).single()
      if (res.error) return
      const dt = res.data?.dart_type || "steeldart"
      if (!cancelled) setDartType(dt)
    })()

    return () => {
      cancelled = true
    }
  }, [matchId])

  // Props -> State sync (players list)
  useEffect(() => {
    if (effectiveLoadingPlayers) return
    if (incomingSig === lastSigRef.current) return
    lastSigRef.current = incomingSig

    if (incoming.length === 0) {
      setPlayers([])
      setActiveId(null)
      setHistory([])
      return
    }

    setPlayers((prev) => {
      const prevMap = new Map(prev.map((p) => [p.id, p] as const))
      return incoming.map((p) => {
        const existing = prevMap.get(p.id)
        return existing
          ? { ...existing, name: p.name }
          : { id: p.id, name: p.name, stats: { ...EMPTY }, legsWon: 0, legsLost: 0 }
      })
    })

    setActiveId((prevActive) => {
      if (prevActive && incoming.some((p) => p.id === prevActive)) return prevActive
      return incoming[0].id
    })
  }, [incoming, incomingSig, effectiveLoadingPlayers])

  const activePlayer = players.find((p) => p.id === activeId) ?? null

  // DB LOAD (read only)
  useEffect(() => {
    if (effectiveLoadingPlayers) return
    if (!matchId) return
    if (incoming.length === 0) return

    let cancelled = false

    ;(async () => {
      try {
        setDbStatus("loading")

        const loadRes = await supabase
          .from("leg_statistics")
          .select(DB_SELECT)
          .eq("match_id", matchId)
          .eq("leg_number", legNumber)

        if (loadRes.error) {
          setDbStatus("error")
          return
        }

        const rows = (loadRes.data ?? []) as DbRow[]
        if (cancelled) return

        const byPlayer = new Map(rows.map((r) => [r.player_id, r]))

        setPlayers((prev) =>
          prev.map((p) => {
            const row = byPlayer.get(p.id)
            if (!row) return p
            const mapped = dbRowToStats(row)
            const legsWon = row.player_legs_won ?? 0
            const legsLost = row.opponent_legs_won ?? 0
            return { ...p, legsWon, legsLost, stats: { ...p.stats, ...mapped } }
          })
        )

        setDbStatus("loaded")
      } catch {
        setDbStatus("error")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [matchId, legNumber, incomingSig, effectiveLoadingPlayers])

  // Ensure row (ONLY when saving)
  const ensureRow = async (playerId: string) => {
    if (!matchId) return false

    const chk = await supabase
      .from("leg_statistics")
      .select("player_id")
      .eq("match_id", matchId)
      .eq("leg_number", legNumber)
      .eq("player_id", playerId)
      .maybeSingle()

    if (chk.error) return false
    if (chk.data) return true

    const ins = await supabase
      .from("leg_statistics")
      .insert([{ match_id: matchId, leg_number: legNumber, player_id: playerId, dart_type: dartType }])

    if (ins.error) return false
    return true
  }

  // Persist one STAT value
  const persistOne = async (playerId: string, key: StatKey, nextVal: number) => {
    if (!matchId) return

    const ok = await ensureRow(playerId)
    if (!ok) return

    const col = KEY_TO_DB_COL[key]
    const payload: any = {
      match_id: matchId,
      leg_number: legNumber,
      player_id: playerId,
      [col]: nextVal,
    }

    await supabase.from("leg_statistics").upsert(payload, { onConflict: "match_id,leg_number,player_id" })
  }

  // Persist LEGS
  const persistLegs = async (playerId: string, nextWon: number, nextLost: number) => {
    if (!matchId) return

    const ok = await ensureRow(playerId)
    if (!ok) return

    const leg_winner_id = nextWon > nextLost ? playerId : null
    const leg_wins = nextWon > nextLost ? 1 : 0

    const payload: any = {
      match_id: matchId,
      leg_number: legNumber,
      player_id: playerId,
      player_legs_won: nextWon,
      opponent_legs_won: nextLost,
      leg_winner_id,
      leg_wins,
    }

    await supabase.from("leg_statistics").upsert(payload, { onConflict: "match_id,leg_number,player_id" })
  }

  // OVERLAYS
  const [overlay, setOverlay] = useState({
    open: false,
    headline: "",
    variant: "plus" as "plus" | "minus" | "undo" | "reset",
  })
  const [playerOverlay, setPlayerOverlay] = useState(false)

  const timer = useRef<number | null>(null)
  const playerTimer = useRef<number | null>(null)

  const showOverlay = (data: Omit<typeof overlay, "open">) => {
    if (timer.current) window.clearTimeout(timer.current)
    setOverlay({ open: true, ...data })
    timer.current = window.setTimeout(() => setOverlay((p) => ({ ...p, open: false })), 2000)
  }

  const showPlayerOverlay = () => {
    if (playerTimer.current) window.clearTimeout(playerTimer.current)
    setPlayerOverlay(true)
    playerTimer.current = window.setTimeout(() => setPlayerOverlay(false), 900)
  }

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
      if (playerTimer.current) window.clearTimeout(playerTimer.current)
    }
  }, [])

  const switchPlayer = (id: string) => {
    setActiveId(id)
    showPlayerOverlay()
  }

  // APPLY
  const applyStat = async (key: StatKey, delta: number) => {
    if (!activePlayer) return

    const current = activePlayer.stats[key] ?? 0
    const nextVal = Math.max(0, current + delta)

    setPlayers((prev) =>
      prev.map((p) => (p.id === activePlayer.id ? { ...p, stats: { ...p.stats, [key]: nextVal } } : p))
    )

    await persistOne(activePlayer.id, key, nextVal)

    setHistory((h) => [{ playerId: activePlayer.id, key, delta, ts: Date.now() }, ...h])

    showOverlay({
      headline:
        delta > 0 ? `${activePlayer.name} – Score: ${labelFor(key)}` : `${activePlayer.name} – Delete: ${labelFor(key)}`,
      variant: delta > 0 ? "plus" : "minus",
    })
  }

  const applyLegs = async (which: "won" | "lost", delta: number) => {
    if (!activePlayer) return

    const currentWon = activePlayer.legsWon ?? 0
    const currentLost = activePlayer.legsLost ?? 0

    const nextWon = which === "won" ? Math.max(0, currentWon + delta) : currentWon
    const nextLost = which === "lost" ? Math.max(0, currentLost + delta) : currentLost

    setPlayers((prev) =>
      prev.map((p) => (p.id === activePlayer.id ? { ...p, legsWon: nextWon, legsLost: nextLost } : p))
    )

    await persistLegs(activePlayer.id, nextWon, nextLost)

    const hk: ActionKey = which === "won" ? "legs_won" : "legs_lost"
    setHistory((h) => [{ playerId: activePlayer.id, key: hk, delta, ts: Date.now() }, ...h])

    showOverlay({
      headline: delta > 0 ? `${activePlayer.name} – ${labelFor(hk)}` : `${activePlayer.name} – Delete: ${labelFor(hk)}`,
      variant: delta > 0 ? "plus" : "minus",
    })
  }

  // UI guards
  
  if (!matchId) return <div className="text-red-600 text-sm">matchId fehlt: Route muss /live-statistics/[matchId] sein.</div>

  // ✅ NEW: if no confirmed lineup -> show CTA
  if (!effectiveLoadingPlayers && incoming.length === 0) {
    return (
      <div className="flex min-h-[55vh] w-full items-center justify-center px-3 py-8 text-center sm:px-6">
        <div className="w-full max-w-md rounded-[26px] border border-white/[0.08] bg-black/35 p-6 text-white shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-2xl">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-3xl border border-orange-300/20 bg-orange-500 text-white shadow-[0_0_28px_rgba(249,115,22,.14)]">
            <Target className="h-7 w-7 text-white" />
          </div>
          <div className="text-xl font-black text-red-300">Bitte Aufstellung bestätigen !!!!</div>
          <div className="mt-2 text-sm font-medium leading-6 text-white/50">
            Bitte beachten: Die Aufstellung muss zuerst bestätigt werden, da eine Live-Eingabe ansonsten nicht möglich ist.
          </div>

          <div className="mt-5">
            <Button asChild className="w-full bg-orange-500 font-black text-white shadow-[0_0_24px_rgba(249,115,22,.12)] hover:bg-orange-500/90 hover:text-white">
              <Link href="/member-availability">Zur Aufstellung / Bestätigen</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 bg-transparent text-white">
      <main className="w-full max-w-none px-0 pb-24 pt-0">
        {/* TOP BAR */}
        <Card className="mb-4 overflow-hidden rounded-[26px] border border-white/[0.08] bg-black/30 text-white shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:mb-5">
          <CardContent className="p-3 sm:p-4 lg:p-5">
            {/* Spieler: wirklich deutlich hervorgehoben + KEIN hover */}
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {players.map((p) => {
                const isActive = activeId === p.id
                return (
                  <Button
                    key={p.id}
                    variant="outline"
                    onClick={() => switchPlayer(p.id)}
                    className={`min-h-11 w-full min-w-0 whitespace-normal break-words rounded-xl border px-2.5 py-2 text-center text-xs font-black leading-tight transition-colors sm:text-sm ${
                      isActive
                        ? "!border-orange-400/40 !bg-orange-500 !text-white !shadow-[0_0_24px_rgba(249,115,22,.14)] hover:!bg-orange-500/90 hover:!text-white"
                        : "!border-white/[0.10] !bg-white/[0.04] !text-white/75 hover:!border-orange-300/20 hover:!bg-white/[0.07] hover:!text-white"
                    }`}
                  >
                    <User className="mr-1.5 hidden h-4 w-4 shrink-0 sm:block" />
                    {p.name}
                  </Button>
                )
              })}
            </div>

            {/* Legs Buttons oben */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {/* Legs gewonnen */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 text-white">
                <div className="flex justify-between mb-2 items-center">
                  <div className="font-bold text-sm sm:text-base">Legs W</div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-black/45 text-sm font-black text-white">
                    {activePlayer?.legsWon ?? 0}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => void applyLegs("won", +1)}
                    className="bg-orange-500 font-black text-white hover:bg-orange-500/90 hover:text-white"
                    disabled={!activePlayer}
                  >
                    +1
                  </Button>
                  <Button
                    onClick={() => void applyLegs("won", -1)}
                    disabled={!activePlayer || (activePlayer?.legsWon ?? 0) === 0}
                    variant="outline"
                    className="border-white/[0.10] bg-white/[0.04] font-black text-white/80 hover:bg-white/[0.07] hover:text-white"
                  >
                    -1
                  </Button>
                </div>
              </div>

              {/* Legs verloren */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 text-white">
                <div className="flex justify-between mb-2 items-center">
                  <div className="font-bold text-sm sm:text-base">Legs L</div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-black/45 text-sm font-black text-white">
                    {activePlayer?.legsLost ?? 0}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => void applyLegs("lost", +1)}
                    className="bg-orange-500 font-black text-white hover:bg-orange-500/90 hover:text-white"
                    disabled={!activePlayer}
                  >
                    +1
                  </Button>
                  <Button
                    onClick={() => void applyLegs("lost", -1)}
                    disabled={!activePlayer || (activePlayer?.legsLost ?? 0) === 0}
                    variant="outline"
                    className="border-white/[0.10] bg-white/[0.04] font-black text-white/80 hover:bg-white/[0.07] hover:text-white"
                  >
                    -1
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Felder */}
        <Card className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-black/30 text-white shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-2xl">
          <CardContent className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3 sm:gap-3 sm:p-4 lg:grid-cols-4 xl:grid-cols-7 2xl:grid-cols-7">
            {FIELDS.map((f) => {
              const val = activePlayer?.stats[f.key] ?? 0

              return (
                <div key={f.key} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 text-white">
                  <div className="flex justify-between mb-2 items-center">
                    <div className="font-bold text-base sm:text-lg">{f.label}</div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-black/45 text-sm font-black text-white">
                      {val}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => void applyStat(f.key, +1)}
                      className="bg-orange-500 font-black text-white hover:bg-orange-500/90 hover:text-white"
                      disabled={!activePlayer}
                    >
                      +1
                    </Button>
                    <Button
                      onClick={() => void applyStat(f.key, -1)}
                      disabled={!activePlayer || val === 0}
                      variant="outline"
                      className="border-white/[0.10] bg-white/[0.04] font-black text-white/80 hover:bg-white/[0.07] hover:text-white"
                    >
                      -1
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Letzte Eingaben */}
        <Card className="mt-5 overflow-hidden rounded-[26px] border border-white/[0.08] bg-black/30 text-white shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-2xl">
          <CardContent className="p-4 sm:p-5">
            <div className="font-bold mb-3">Letzte Eingaben ({history.length})</div>

            {history.length === 0 ? (
              <div className="text-sm text-white/40">Noch keine Eingaben vorhanden.</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto">
                {history.map((h) => {
                  const pName = players.find((p) => p.id === h.playerId)?.name ?? "Spieler"
                  return (
                    <div key={h.ts} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-white">
                      <span className="text-sm">
                        {pName} · {labelFor(h.key)}
                      </span>

                      <span className={h.delta > 0 ? "text-emerald-300 font-bold" : "text-red-300 font-bold"}>
                        {h.delta > 0 ? `+${h.delta}` : "Delete"}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <HitOverlay open={overlay.open} headline={overlay.headline} variant={overlay.variant} />
      <PlayerSwitchOverlay open={playerOverlay} name={activePlayer?.name ?? ""} />
    </div>
  )
}