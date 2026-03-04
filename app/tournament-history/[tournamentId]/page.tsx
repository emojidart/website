"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, Tv, Calendar, Users, Clock, CheckCircle2, Info } from "lucide-react"
import { motion } from "framer-motion"

type MatchStateRow = {
  match_id: number
  player1: string | null
  player2: string | null
  score1: number | null
  score2: number | null
  winner: string | null
  loser: string | null
  machine_number: number | null
  updated_at: string | null
}

type RankingRow = {
  player_name: string
  placement: number
  eliminated_at: string | null

  // ✅ Kratzer Zusatz
  lives?: number | null
  ligastatus?: string | null
  is_eliminated?: boolean | null
  elimination_round?: number | null
  elimination_time?: string | null
}

type KratzerTournamentMetaRow = {
  name: string | null
  status: string | null
  created_at: string | null
  board_count?: number | null
  max_group_size?: number | null
  sudden_death_enabled?: boolean | null
  sudden_death_time?: number | null
  speech_enabled?: boolean | null
  winner_id?: string | null
}

type KratzerResultRow = {
  kratzer_tournament_id: string
  winner_id: string | null
  winner_name: string | null
  total_rounds: number | null
  created_at: string | null
  results_data: any | null
}

type KratzerPlayerRow = {
  player_name: string | null
  ligastatus: string | null
  lives: number | null
  is_eliminated: boolean | null
  elimination_round: number | null
  elimination_time: string | null
}

type KratzerResultPlayer = {
  name?: string | null
  rank?: number | null
  lives?: number | null
  ligastatus?: string | null
  isEliminated?: boolean | null
  eliminationTime?: string | null
  eliminationRound?: number | null
}

type KratzerElimEvent = {
  round: number
  time: string | null
  name: string
  ligastatus: string | null
}

/* ---------------- motion ---------------- */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 14 } },
}

/* ---------------- helpers ---------------- */

const formatDateTime = (value?: string | null) => {
  if (!value) return "—"
  const d = new Date(value)
  return d.toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const typeLabel = (t?: string | null) => {
  if (!t) return "—"
  if (t === "kratzer") return "Kratzer"
  if (t.includes("8")) return "8er DKO"
  if (t.includes("16")) return "16er DKO"
  if (t.includes("32")) return "32er DKO"
  if (t.includes("64")) return "64er DKO"
  return t
}

const statusChip = (status?: string | null) => {
  const s = String(status ?? "").toLowerCase().trim()
  const isDone = s === "completed" || s === "finished" || s === "done"
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black ${
        isDone ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-gray-200 bg-gray-50 text-gray-800"
      }`}
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
      {isDone ? "Abgeschlossen" : status || "Status"}
    </span>
  )
}

function Chip({
  children,
  tone = "gray",
}: {
  children: React.ReactNode
  tone?: "gray" | "orange" | "blue" | "emerald" | "amber" | "slate"
}) {
  const cls =
    tone === "orange"
      ? "bg-orange-50 text-orange-900 border-orange-200"
      : tone === "blue"
        ? "bg-blue-50 text-blue-900 border-blue-200"
        : tone === "emerald"
          ? "bg-emerald-50 text-emerald-900 border-emerald-200"
          : tone === "amber"
            ? "bg-amber-50 text-amber-900 border-amber-200"
            : tone === "slate"
              ? "bg-slate-50 text-slate-800 border-slate-200"
              : "bg-gray-50 text-gray-800 border-gray-200"

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      {children}
    </span>
  )
}

export default function TournamentHistoryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  const tournamentId = String((params as any).tournamentId)
  const tournamentType = searchParams.get("type") || "16er_dko"

  const isKratzer = useMemo(() => {
    const t = (tournamentType ?? "").toLowerCase()
    return t === "kratzer" || t.includes("kratzer")
  }, [tournamentType])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tournamentName, setTournamentName] = useState<string>("Turnier")
  const [status, setStatus] = useState<string>("")

  // DKO
  const [matches, setMatches] = useState<MatchStateRow[]>([])
  const [rankings, setRankings] = useState<RankingRow[]>([])

  // Kratzer Meta
  const [kratzerWinner, setKratzerWinner] = useState<string | null>(null)
  const [kratzerTotalRounds, setKratzerTotalRounds] = useState<number | null>(null)
  const [kratzerLastUpdate, setKratzerLastUpdate] = useState<string | null>(null)

  // Kratzer extra settings (bleiben, aber im UI nicht angezeigt)
  const [_kBoardCount, setKBoardCount] = useState<number | null>(null)
  const [_kMaxGroupSize, setKMaxGroupSize] = useState<number | null>(null)
  const [_kSuddenDeathEnabled, setKSuddenDeathEnabled] = useState<boolean | null>(null)
  const [_kSuddenDeathTime, setKSuddenDeathTime] = useState<number | null>(null)
  const [_kSpeechEnabled, setKSpeechEnabled] = useState<boolean | null>(null)

  // ✅ Kratzer Verlauf aus results_data
  const [kResultsPlayers, setKResultsPlayers] = useState<KratzerResultPlayer[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        // =========================
        // ✅ KRATZER
        // =========================
        if (isKratzer) {
          const { data: km, error: kmErr } = await supabase
            .from("kratzer_tournaments")
            .select(
              "name,status,created_at,board_count,max_group_size,sudden_death_enabled,sudden_death_time,speech_enabled,winner_id",
            )
            .eq("id", tournamentId)
            .maybeSingle()

          if (kmErr) console.warn("Kratzer meta warning:", kmErr)

          if (km) {
            const meta = km as KratzerTournamentMetaRow
            setTournamentName(meta.name || "Kratzer-Turnier")
            setStatus(meta.status || "")
            setKratzerLastUpdate(meta.created_at ?? null)

            setKBoardCount(typeof meta.board_count === "number" ? meta.board_count : null)
            setKMaxGroupSize(typeof meta.max_group_size === "number" ? meta.max_group_size : null)
            setKSuddenDeathEnabled(typeof meta.sudden_death_enabled === "boolean" ? meta.sudden_death_enabled : null)
            setKSuddenDeathTime(typeof meta.sudden_death_time === "number" ? meta.sudden_death_time : null)
            setKSpeechEnabled(typeof meta.speech_enabled === "boolean" ? meta.speech_enabled : null)
          }

          const { data: kr, error: krErr } = await supabase
            .from("kratzer_tournament_results")
            .select("kratzer_tournament_id,winner_id,winner_name,total_rounds,created_at,results_data")
            .eq("kratzer_tournament_id", tournamentId)
            .maybeSingle()

          if (krErr) console.warn("Kratzer results load warning:", krErr)

          const winnerNameFromResults = (kr as KratzerResultRow | null)?.winner_name ?? null
          const totalRoundsFromResults = (kr as KratzerResultRow | null)?.total_rounds ?? null
          const resultsCreatedAt = (kr as KratzerResultRow | null)?.created_at ?? null

          if (winnerNameFromResults) setKratzerWinner(winnerNameFromResults)
          if (totalRoundsFromResults != null) setKratzerTotalRounds(totalRoundsFromResults)
          if (resultsCreatedAt) setKratzerLastUpdate(resultsCreatedAt)

          const rawResults = (kr as KratzerResultRow | null)?.results_data
          const asArray =
            Array.isArray(rawResults) ? rawResults : Array.isArray(rawResults?.players) ? rawResults.players : null
          setKResultsPlayers((asArray ?? []) as KratzerResultPlayer[])

          const { data: kp, error: kpErr } = await supabase
            .from("kratzer_tournament_players")
            .select("player_name,ligastatus,lives,is_eliminated,elimination_round,elimination_time")
            .eq("kratzer_tournament_id", tournamentId)

          if (kpErr) {
            console.warn("Kratzer players warning:", kpErr)
            setRankings([])
          } else {
            const players = (kp ?? []) as KratzerPlayerRow[]

            const winnerLower = (winnerNameFromResults ?? "").trim().toLowerCase()

            const sorted = players.slice().sort((a, b) => {
              const an = (a.player_name ?? "").trim().toLowerCase()
              const bn = (b.player_name ?? "").trim().toLowerCase()

              const aIsWinner = Boolean(winnerLower) && an === winnerLower
              const bIsWinner = Boolean(winnerLower) && bn === winnerLower
              if (aIsWinner !== bIsWinner) return aIsWinner ? -1 : 1

              const aElim = Boolean(a.is_eliminated)
              const bElim = Boolean(b.is_eliminated)
              if (aElim !== bElim) return aElim ? 1 : -1

              if (!aElim && !bElim) {
                const al = a.lives ?? -999
                const bl = b.lives ?? -999
                if (al !== bl) return bl - al
                return an.localeCompare(bn)
              }

              const ar = a.elimination_round ?? -1
              const br = b.elimination_round ?? -1
              if (ar !== br) return br - ar

              const at = a.elimination_time ? new Date(a.elimination_time).getTime() : -1
              const bt = b.elimination_time ? new Date(b.elimination_time).getTime() : -1
              if (at !== bt) return bt - at

              return an.localeCompare(bn)
            })

            const mapped: RankingRow[] = sorted.map((p, idx) => ({
              player_name: p.player_name ?? "—",
              placement: idx + 1,
              eliminated_at: p.is_eliminated ? (p.elimination_time ?? null) : null,
              lives: p.lives ?? null,
              ligastatus: p.ligastatus ?? null,
              is_eliminated: p.is_eliminated ?? null,
              elimination_round: p.elimination_round ?? null,
              elimination_time: p.elimination_time ?? null,
            }))

            setRankings(mapped)
          }

          setMatches([])
          setLoading(false)
          return
        }

        // =========================
        // ✅ DKO
        // =========================
        const { data: statusRow, error: statusErr } = await supabase
          .from("tournaments_status")
          .select("tournament_name,status,updated_at,created_at")
          .eq("tournament_id", tournamentId)
          .maybeSingle()

        if (!statusErr && statusRow) {
          setTournamentName(statusRow.tournament_name || "Turnier")
          setStatus(statusRow.status || "")
        }

        const { data: ms, error: msErr } = await supabase
          .from("dko_match_states")
          .select("match_id,player1,player2,score1,score2,winner,loser,machine_number,updated_at")
          .eq("tournament_id", tournamentId)
          .eq("tournament_type", tournamentType)
          .order("match_id", { ascending: true })

        if (msErr) throw msErr

        const { data: rk, error: rkErr } = await supabase
          .from("dko_rankings")
          .select("player_name,placement,eliminated_at")
          .eq("tournament_id", tournamentId)
          .eq("tournament_type", tournamentType)
          .order("placement", { ascending: true })

        if (rkErr) console.warn("Rankings load warning:", rkErr)

        setMatches((ms ?? []) as MatchStateRow[])
        setRankings((rk ?? []) as RankingRow[])
      } catch (e: any) {
        console.error(e)
        setError("Fehler beim Laden der Turnierdaten.")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [tournamentId, tournamentType, isKratzer])

  const lastUpdate = useMemo(() => {
    if (isKratzer) return kratzerLastUpdate
    const ts = matches.map((m) => (m.updated_at ? new Date(m.updated_at).getTime() : 0))
    const max = Math.max(0, ...ts)
    return max ? new Date(max).toISOString() : null
  }, [matches, isKratzer, kratzerLastUpdate])

  const participants = useMemo(() => {
    if (isKratzer) return rankings.length

    const s = new Set<string>()
    for (const m of matches) {
      const p1 = (m.player1 ?? "").trim()
      const p2 = (m.player2 ?? "").trim()
      if (p1 && !p1.toLowerCase().startsWith("freilos")) s.add(p1.toLowerCase())
      if (p2 && !p2.toLowerCase().startsWith("freilos")) s.add(p2.toLowerCase())
    }
    return s.size
  }, [matches, rankings.length, isKratzer])

  const winner = useMemo(() => {
    if (isKratzer) return kratzerWinner ?? rankings.find((r) => r.placement === 1)?.player_name ?? null
    return rankings.find((r) => r.placement === 1)?.player_name ?? null
  }, [rankings, isKratzer, kratzerWinner])

  const kratzerElimTimeline = useMemo<KratzerElimEvent[]>(() => {
    if (!isKratzer) return []
    const list = (kResultsPlayers ?? [])
      .filter((p) => p && (p.isEliminated === true || (p as any).isEliminated === "true"))
      .map((p) => ({
        round: typeof p.eliminationRound === "number" ? p.eliminationRound : -1,
        time: (p.eliminationTime as any) ?? null,
        name: String(p.name ?? "—"),
        ligastatus: p.ligastatus ? String(p.ligastatus) : null,
      }))
      .filter((e) => e.round >= 0)

    list.sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round
      const at = a.time ? new Date(a.time).getTime() : 0
      const bt = b.time ? new Date(b.time).getTime() : 0
      return at - bt
    })

    return list
  }, [isKratzer, kResultsPlayers])

  const filteredMatches = useMemo(() => {
    const isEmptyName = (v: string | null | undefined) => {
      const s = (v ?? "").trim()
      if (!s) return true
      const low = s.toLowerCase()
      return low === "empty" || low === "null"
    }

    return (matches ?? []).filter((m) => {
      const p1Empty = isEmptyName(m.player1)
      const p2Empty = isEmptyName(m.player2)
      const bothEmpty = p1Empty && p2Empty
      const winnerEmpty = isEmptyName(m.winner)
      const s1 = m.score1 ?? 0
      const s2 = m.score2 ?? 0
      const scoresEmpty = s1 === 0 && s2 === 0
      if (bothEmpty && winnerEmpty && scoresEmpty) return false
      return true
    })
  }, [matches])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 overflow-x-hidden">
      <Header />

      {/* fixed header offset */}
      <main className="pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Top back bar (Kontakt-Style sticky feel) */}
          <motion.div variants={itemVariants} className="mb-4">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-3 py-2 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/tournament-history")}
                className="gap-2 rounded-xl"
                type="button"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück
              </Button>

              <div className="flex items-center gap-2">
                <Chip tone="gray">{typeLabel(tournamentType)}</Chip>
                {statusChip(status)}
              </div>
            </div>
          </motion.div>

          {/* App-Header Card (Kontakt look) */}
          <motion.div variants={itemVariants} className="mb-5 sm:mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="p-4 sm:p-5 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black line-clamp-2">{tournamentName}</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Sieger: <span className="font-black text-gray-900">{winner ?? "—"}</span>
                    {isKratzer && kratzerTotalRounds != null ? (
                      <>
                        {" "}
                        • Runden: <span className="font-black text-gray-900">{kratzerTotalRounds}</span>
                      </>
                    ) : null}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Chip tone="blue">
                      <Users className="w-3.5 h-3.5" />
                      {participants} Teilnehmer
                    </Chip>
                    <Chip tone="slate">
                      <Clock className="w-3.5 h-3.5" />
                      Update: {formatDateTime(lastUpdate)}
                    </Chip>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {loading ? (
            <motion.div variants={itemVariants} className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
            </motion.div>
          ) : error ? (
            <motion.div variants={itemVariants}>
              <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white">
                <CardContent className="p-5 text-red-600 font-semibold">{error}</CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
              {/* Resultate/Rangliste */}
              <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white lg:col-span-1 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base font-black">
                    {isKratzer ? "Resultate" : "Rangliste"}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-0 pb-5">
                  {rankings.length === 0 ? (
                    <div className="text-sm text-gray-600">Keine Daten.</div>
                  ) : (
                    <div className="space-y-2">
                      {rankings
                        .slice()
                        .sort((a, b) => a.placement - b.placement)
                        .map((r) => (
                          <div
                            key={`${r.player_name}-${r.placement}`}
                            className="rounded-2xl border border-gray-200 bg-white p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-black text-gray-900 truncate">{r.player_name}</div>

                                {isKratzer ? (
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                    {r.lives != null ? (
                                      <Chip tone="gray">
                                        <span className="font-black">Lives:</span> {r.lives}
                                      </Chip>
                                    ) : null}

                                    {r.ligastatus ? (
                                      <Chip tone="amber">
                                        <span className="font-mono font-black">{r.ligastatus}</span>
                                      </Chip>
                                    ) : null}

                                    {r.is_eliminated === true ? (
                                      <Chip tone="slate">Eliminiert</Chip>
                                    ) : r.is_eliminated === false ? (
                                      <Chip tone="emerald">Aktiv</Chip>
                                    ) : null}

                                    {r.elimination_round != null ? (
                                      <Chip tone="gray">Round {r.elimination_round}</Chip>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>

                              <span className="inline-flex items-center rounded-full bg-orange-600 px-2.5 py-1 text-[11px] font-black text-white">
                                #{r.placement}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Matches / Info */}
              <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white lg:col-span-2 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base font-black">{isKratzer ? "Info" : "Matches"}</CardTitle>
                </CardHeader>

                <CardContent className="pt-0 pb-5">
                  {isKratzer ? (
                    <div className="space-y-5 text-sm text-gray-700">
                      <div className="flex flex-wrap gap-2">
                        <Chip tone="orange">
                          <Trophy className="w-3.5 h-3.5" />
                          Sieger: <span className="font-black">{winner ?? "—"}</span>
                        </Chip>

                        {kratzerTotalRounds != null ? (
                          <Chip tone="blue">
                            <span className="font-black">Runden:</span> {kratzerTotalRounds}
                          </Chip>
                        ) : null}

                        {status ? (
                          <Chip tone="gray">
                            <Info className="w-3.5 h-3.5" />
                            Status: <span className="font-black">{status}</span>
                          </Chip>
                        ) : null}
                      </div>

                      <div className="pt-2 border-t border-gray-200">
                        <h3 className="font-black text-gray-900 mb-2">Spielverlauf</h3>

                        {kratzerElimTimeline.length === 0 ? (
                          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-700">
                            Kein Verlauf gefunden (results_data leer oder ohne eliminationRound).
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {kratzerElimTimeline.map((e, idx) => (
                              <div key={`${e.round}-${e.name}-${idx}`} className="rounded-2xl border border-gray-200 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-black text-gray-900 truncate">{e.name}</div>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                      <Chip tone="gray">Round {e.round}</Chip>
                                      {e.ligastatus ? (
                                        <Chip tone="amber">
                                          <span className="font-mono font-black">{e.ligastatus}</span>
                                        </Chip>
                                      ) : null}
                                      {e.time ? <Chip tone="slate">{formatDateTime(e.time)}</Chip> : null}
                                    </div>
                                  </div>

                                  <Chip tone="slate">Eliminiert</Chip>
                                </div>
                              </div>
                            ))}

                            {winner ? (
                              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-black text-gray-900 truncate">{winner}</div>
                                    <div className="mt-1 text-xs text-gray-600">Turnier gewonnen</div>
                                  </div>
                                  <Chip tone="orange">
                                    <Trophy className="w-3.5 h-3.5" />
                                    Sieger
                                  </Chip>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : filteredMatches.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-700">
                      Keine Matchdaten gefunden.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredMatches.map((m) => {
                        const p1 = m.player1 || "—"
                        const p2 = m.player2 || "—"
                        const s1 = m.score1 ?? 0
                        const s2 = m.score2 ?? 0
                        const finished = Boolean(m.winner)

                        return (
                          <div
                            key={m.match_id}
                            className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-black text-gray-700">
                                    Match {m.match_id}
                                  </span>

                                  {m.machine_number ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-black text-gray-700">
                                      <Tv className="h-3.5 w-3.5 text-gray-600" />
                                      Board {m.machine_number}
                                    </span>
                                  ) : null}

                                  {finished ? (
                                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-800">
                                      Fertig
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-black text-gray-700">
                                      Offen
                                    </span>
                                  )}
                                </div>

                                <div className="text-sm sm:text-base font-black text-gray-900 truncate">
                                  {p1} <span className="text-gray-400 font-normal">vs</span> {p2}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3">
                                <div className="text-lg font-black tabular-nums text-gray-900">
                                  {s1}:{s2}
                                </div>

                                {m.winner ? (
                                  <span
                                    className="inline-flex items-center rounded-full bg-orange-600 px-2.5 py-1 text-[11px] font-black text-white max-w-[220px] truncate"
                                    title={m.winner}
                                  >
                                    Sieger: {m.winner}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            {m.updated_at ? (
                              <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" />
                                Letztes Update: <span className="font-semibold">{formatDateTime(m.updated_at)}</span>
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}