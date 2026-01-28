"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, Users, Calendar, Hash, Clock, Tv } from "lucide-react"

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

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tournamentName, setTournamentName] = useState<string>("Turnier")
  const [status, setStatus] = useState<string>("")
  const [matches, setMatches] = useState<MatchStateRow[]>([])
  const [rankings, setRankings] = useState<RankingRow[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        // 1) Meta aus tournaments_status (Name/Status)
        const { data: statusRow, error: statusErr } = await supabase
          .from("tournaments_status")
          .select("tournament_name,status,updated_at,created_at")
          .eq("tournament_id", tournamentId) 
          .maybeSingle()

        if (!statusErr && statusRow) {
          setTournamentName(statusRow.tournament_name || "Turnier")
          setStatus(statusRow.status || "")
        }

        // 2) Matchstates
        const { data: ms, error: msErr } = await supabase
          .from("dko_match_states")
          .select("match_id,player1,player2,score1,score2,winner,loser,machine_number,updated_at")
          .eq("tournament_id", tournamentId)
          .eq("tournament_type", tournamentType)
          .order("match_id", { ascending: true })

        if (msErr) throw msErr

        // 3) Rankings
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
  }, [tournamentId, tournamentType])

  const lastUpdate = useMemo(() => {
    const ts = matches.map((m) => (m.updated_at ? new Date(m.updated_at).getTime() : 0))
    const max = Math.max(0, ...ts)
    return max ? new Date(max).toISOString() : null
  }, [matches])

  const participants = useMemo(() => {
    const s = new Set<string>()
    for (const m of matches) {
      const p1 = (m.player1 ?? "").trim()
      const p2 = (m.player2 ?? "").trim()
      if (p1 && !p1.toLowerCase().startsWith("freilos")) s.add(p1.toLowerCase())
      if (p2 && !p2.toLowerCase().startsWith("freilos")) s.add(p2.toLowerCase())
    }
    return s.size
  }, [matches])

  const winner = useMemo(() => rankings.find((r) => r.placement === 1)?.player_name ?? null, [rankings])

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
            Teilnehmer: <span className="font-semibold">{participants}</span>
            {" • "}
            Letztes Update: <span className="font-semibold">{formatDateTime(lastUpdate)}</span>
            {" • "}
            Sieger: <span className="font-semibold">{winner ?? "—"}</span>
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
              <div className="text-sm text-gray-600 mt-2">
                Check: RLS/Policies für <span className="font-mono">dko_match_states</span> und{" "}
                <span className="font-mono">dko_rankings</span>.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Rankings */}
            <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm lg:col-span-1">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">Rangliste</h2>

                {rankings.length === 0 ? (
                  <div className="text-sm text-gray-600">Noch keine Rangliste vorhanden (Turnier evtl. nicht fertig).</div>
                ) : (
                  <div className="space-y-2">
                    {rankings
                      .slice()
                      .sort((a, b) => a.placement - b.placement)
                      .map((r) => (
                        <div
                          key={`${r.player_name}-${r.placement}`}
                          className="flex items-center justify-between rounded-lg border bg-white p-3"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{r.player_name}</div>
                                                      </div>
                          <Badge className="bg-orange-600 text-white">#{r.placement}</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Matches */}
            <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm lg:col-span-2">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">Matches</h2>

                {filteredMatches.length === 0 ? (
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
