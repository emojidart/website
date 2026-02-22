"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, Tv } from "lucide-react"

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

export default function TournamentHistoryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  const tournamentId = String(params.tournamentId)
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

  // Kratzer extra settings (aus kratzer_tournaments) -> nur falls du es später wieder brauchst
  const [kBoardCount, setKBoardCount] = useState<number | null>(null)
  const [kMaxGroupSize, setKMaxGroupSize] = useState<number | null>(null)
  const [kSuddenDeathEnabled, setKSuddenDeathEnabled] = useState<boolean | null>(null)
  const [kSuddenDeathTime, setKSuddenDeathTime] = useState<number | null>(null)
  const [kSpeechEnabled, setKSpeechEnabled] = useState<boolean | null>(null)

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

          // ✅ results_data -> players array
          const rawResults = (kr as KratzerResultRow | null)?.results_data
          const asArray =
            Array.isArray(rawResults) ? rawResults : Array.isArray(rawResults?.players) ? rawResults.players : null
          setKResultsPlayers((asArray ?? []) as KratzerResultPlayer[])

          // 3) ✅ Resultate AUS kratzer_tournament_players (für Lives/Status Anzeige)
          const { data: kp, error: kpErr } = await supabase
            .from("kratzer_tournament_players")
            .select("player_name,ligastatus,lives,is_eliminated,elimination_round,elimination_time")
            .eq("kratzer_tournament_id", tournamentId)

          if (kpErr) {
            console.warn("Kratzer players warning:", kpErr)
            setRankings([])
          } else {
            const players = (kp ?? []) as KratzerPlayerRow[]

            // ✅ korrektes Ranking
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
        // ✅ DKO (Original)
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" onClick={() => router.push("/tournament-history")} className="bg-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
        </div>

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl mb-4 sm:mb-6 shadow-xl">
            <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">{tournamentName}</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Typ: <span className="font-semibold">{typeLabel(tournamentType)}</span>
            {" • "}
            Teilnehmer: <span className="font-semibold">{participants}</span>
            {" • "}
            Letztes Update: <span className="font-semibold">{formatDateTime(lastUpdate)}</span>
            {" • "}
            Sieger: <span className="font-semibold">{winner ?? "—"}</span>
            {isKratzer && kratzerTotalRounds != null ? (
              <>
                {" • "}
                Runden: <span className="font-semibold">{kratzerTotalRounds}</span>
              </>
            ) : null}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <Card className="border-0 shadow-xl bg-white/95">
            <CardContent className="p-6">
              <div className="text-red-600 font-semibold">{error}</div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Resultate/Rangliste */}
            <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm lg:col-span-1">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                  {isKratzer ? "Resultate" : "Rangliste"}
                </h2>

                {rankings.length === 0 ? (
                  <div className="text-sm text-gray-600">Keine Daten.</div>
                ) : (
                  <div className="space-y-2">
                    {rankings
                      .slice()
                      .sort((a, b) => a.placement - b.placement)
                      .map((r) => (
                        <div key={`${r.player_name}-${r.placement}`} className="rounded-lg border bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900 truncate">{r.player_name}</div>

                              {isKratzer ? (
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
                                  {r.lives != null ? <Badge variant="secondary">Lives: {r.lives}</Badge> : null}

                                  {r.ligastatus ? (
                                    <Badge variant="outline" className="font-mono">
                                      {r.ligastatus}
                                    </Badge>
                                  ) : null}

                                  {r.is_eliminated === true ? (
                                    <Badge className="bg-gray-700 text-white">Eliminiert</Badge>
                                  ) : r.is_eliminated === false ? (
                                    <Badge className="bg-green-600 text-white">Aktiv</Badge>
                                  ) : null}

                                  {r.elimination_round != null ? (
                                    <Badge variant="outline">Round {r.elimination_round}</Badge>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>

                            <Badge className="bg-orange-600 text-white">#{r.placement}</Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Matches / Info */}
            <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm lg:col-span-2">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                  {isKratzer ? "Info" : "Matches"}
                </h2>

                {isKratzer ? (
                  <div className="space-y-5 text-sm text-gray-700">
                    {/* ✅ Nur das was du willst: Sieger + Runden + Status (die Rest-Stats sind entfernt) */}
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-orange-600 text-white">Sieger: {winner ?? "—"}</Badge>
                      {kratzerTotalRounds != null ? <Badge variant="secondary">Runden: {kratzerTotalRounds}</Badge> : null}
                      {status ? <Badge variant="outline">Status: {status}</Badge> : null}
                    </div>

                    {/* ✅ Spielverlauf OHNE Scroll, OHNE max-height/overflow */}
                    <div className="pt-2 border-t">
                      <h3 className="font-bold text-gray-900 mb-2">Spielverlauf</h3>

                      {kratzerElimTimeline.length === 0 ? (
                        <div className="text-sm text-gray-600">
                          Kein Verlauf gefunden (results_data leer oder ohne eliminationRound).
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {kratzerElimTimeline.map((e, idx) => (
                            <div key={`${e.round}-${e.name}-${idx}`} className="rounded-lg border bg-white p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">{e.name}</div>
                                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
                                    <Badge variant="outline">Round {e.round}</Badge>
                                    {e.ligastatus ? (
                                      <Badge variant="outline" className="font-mono">
                                        {e.ligastatus}
                                      </Badge>
                                    ) : null}
                                    {e.time ? <Badge variant="secondary">{formatDateTime(e.time)}</Badge> : null}
                                  </div>
                                </div>

                                <Badge className="bg-gray-700 text-white">Eliminiert</Badge>
                              </div>
                            </div>
                          ))}

                          {winner ? (
                            <div className="rounded-lg border bg-white p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">{winner}</div>
                                  <div className="mt-1 text-xs text-gray-600">Turnier gewonnen</div>
                                </div>
                                <Badge className="bg-orange-600 text-white">Sieger</Badge>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                ) : filteredMatches.length === 0 ? (
                  <div className="text-sm text-gray-600">Keine Matchdaten gefunden.</div>
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
                          className="rounded-lg border bg-white p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Badge variant="outline" className="font-mono">
                                Match {m.match_id}
                              </Badge>
                              {m.machine_number ? (
                                <Badge variant="secondary" className="inline-flex items-center gap-1">
                                  <Tv className="h-3.5 w-3.5" />
                                  Board {m.machine_number}
                                </Badge>
                              ) : null}
                              {finished ? (
                                <Badge className="bg-green-600 text-white">Fertig</Badge>
                              ) : (
                                <Badge variant="outline">Offen</Badge>
                              )}
                            </div>

                            <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                              {p1} <span className="text-gray-400 font-normal">vs</span> {p2}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-lg font-bold tabular-nums">
                              {s1}:{s2}
                            </div>
                            {m.winner ? (
                              <Badge className="bg-orange-600 text-white max-w-[180px] truncate" title={m.winner}>
                                Sieger: {m.winner}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  )
}