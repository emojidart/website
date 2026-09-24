"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Crown,
  Medal,
  Target,
  Trophy,
  Users,
} from "lucide-react"
import TerminalLink from "../../../_components/TerminalLink"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type HistoryRow = {
  tournament_id: string
  tournament_type: string
  tournament_name: string
  status: string
  created_at: string
  updated_at: string
  last_updated_at: string | null
  winner: string | null
  participants: number | null
}

type MatchRow = {
  match_id: number
  player1: string | null
  player2: string | null
  score1: number | null
  score2: number | null
  winner: string | null
  loser: string | null
  machine_number: number | null
  updated_at: string | null
  id?: number
}

type RankingRow = {
  player_name: string
  placement: number
  eliminated_at?: string | null
}

type MembersResultRow = {
  round_robin_id: string
  tournament_name: string
  team_id: string
  team_name: string
  player_id: string
  player_name: string
  placement: number
  points: number
  created_at: string
}

type TeamRanking = {
  team_id: string
  team_name: string
  placement: number
  points: number
  players: string[]
}

type KratzerResultRow = {
  winner_name: string | null
  total_rounds: number | null
  results_data: any | null
  created_at: string | null
}

function typeLabel(t?: string | null) {
  const type = String(t || "")
  if (type === "round_robin") return "Round Robin"
  if (type === "kratzer") return "Kratzer"
  if (type.includes("8")) return "8er DKO"
  if (type.includes("16")) return "16er DKO"
  if (type.includes("32")) return "32er DKO"
  if (type.includes("64")) return "64er DKO"
  return type || "Turnier"
}

function dateDE(value?: string | null) {
  if (!value) return "–"
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function positionIcon(position: number) {
  if (position === 1) return <Crown className="h-5 w-5 text-orange-300" />
  if (position === 2) return <Medal className="h-5 w-5 text-white/65" />
  if (position === 3) return <Medal className="h-5 w-5 text-amber-500" />
  return <span className="text-sm font-black text-white/45">{position}</span>
}

export default function TerminalTournamentHistoryDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()

  const tournamentId = String((params as any).tournamentId || "")
  const tournamentType = searchParams.get("type") || ""

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryRow | null>(null)
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [rankings, setRankings] = useState<RankingRow[]>([])
  const [membersResults, setMembersResults] = useState<MembersResultRow[]>([])
  const [kratzerResult, setKratzerResult] = useState<KratzerResultRow | null>(null)

  const isMembersCup = useMemo(
    () => membersResults.length > 0 || String(history?.tournament_name || "").toLowerCase().includes("members champion"),
    [membersResults.length, history?.tournament_name],
  )
  const isKratzer = tournamentType.toLowerCase().includes("kratzer")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: historyRow, error: historyErr } = await supabase
          .from("tournaments_history_overview")
          .select("tournament_id,tournament_type,tournament_name,status,created_at,updated_at,last_updated_at,winner,participants")
          .eq("tournament_id", tournamentId)
          .maybeSingle()

        if (historyErr) throw historyErr
        if (historyRow) setHistory(historyRow as HistoryRow)

        // Members Champion Cup: canonical history/result source.
        const { data: memberRows, error: memberErr } = await supabase
          .from("members_cup_results")
          .select("round_robin_id,tournament_name,team_id,team_name,player_id,player_name,placement,points,created_at")
          .eq("round_robin_id", tournamentId)
          .order("placement", { ascending: true })

        if (memberErr) console.warn("Members Cup results warning:", memberErr)
        setMembersResults((memberRows || []) as MembersResultRow[])

        if (isKratzer) {
          const { data: kr, error: krErr } = await supabase
            .from("kratzer_tournament_results")
            .select("winner_name,total_rounds,results_data,created_at")
            .eq("kratzer_tournament_id", tournamentId)
            .maybeSingle()

          if (krErr) console.warn("Kratzer result warning:", krErr)
          setKratzerResult((kr || null) as KratzerResultRow | null)

          const raw = (kr as any)?.results_data
          const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.players) ? raw.players : []
          setRankings(
            (arr || [])
              .map((p: any, idx: number) => ({
                player_name: String(p.name || p.player_name || "–"),
                placement: Number(p.rank || p.placement || idx + 1),
                eliminated_at: p.eliminationTime || null,
              }))
              .sort((a: RankingRow, b: RankingRow) => a.placement - b.placement),
          )
          setMatches([])
          setLoading(false)
          return
        }

        const { data: matchRows, error: matchErr } = await supabase
          .from("dko_match_states")
          .select("id,match_id,player1,player2,score1,score2,winner,loser,machine_number,updated_at")
          .eq("tournament_id", tournamentId)
          .eq("tournament_type", tournamentType)
          .order("match_id", { ascending: true })
          .order("updated_at", { ascending: false })

        if (matchErr) throw matchErr

        // dko_match_states can contain snapshots/duplicates -> keep latest per match_id.
        const latestByMatch = new Map<number, MatchRow>()
        ;((matchRows || []) as MatchRow[]).forEach((row) => {
          if (!latestByMatch.has(row.match_id)) latestByMatch.set(row.match_id, row)
        })
        setMatches(Array.from(latestByMatch.values()).sort((a, b) => a.match_id - b.match_id))

        // DKO ranking; Members Cup uses members_cup_results instead.
        if (!memberRows || memberRows.length === 0) {
          const { data: rankingRows, error: rankErr } = await supabase
            .from("dko_rankings")
            .select("player_name,placement,eliminated_at")
            .eq("tournament_id", tournamentId)
            .eq("tournament_type", tournamentType)
            .order("placement", { ascending: true })

          if (rankErr) console.warn("Ranking warning:", rankErr)
          setRankings((rankingRows || []) as RankingRow[])
        } else {
          setRankings([])
        }
      } catch (e: any) {
        console.error(e)
        setError(e?.message || "Fehler beim Laden der Turnier-Historie.")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [tournamentId, tournamentType, isKratzer])

  const teamRanking = useMemo<TeamRanking[]>(() => {
    const map = new Map<string, TeamRanking>()
    membersResults.forEach((row) => {
      if (!map.has(row.team_id)) {
        map.set(row.team_id, {
          team_id: row.team_id,
          team_name: row.team_name,
          placement: row.placement,
          points: row.points,
          players: [],
        })
      }
      const item = map.get(row.team_id)!
      if (!item.players.includes(row.player_name)) item.players.push(row.player_name)
    })
    return Array.from(map.values()).sort((a, b) => a.placement - b.placement)
  }, [membersResults])

  const winner =
    (isMembersCup ? teamRanking.find((row) => row.placement === 1)?.team_name : null) ||
    kratzerResult?.winner_name ||
    history?.winner ||
    rankings.find((row) => row.placement === 1)?.player_name ||
    null

  const participantCount =
    isMembersCup
      ? teamRanking.length
      : history?.participants ?? rankings.length

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.54]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.44),rgba(4,6,9,.82)),radial-gradient(circle_at_8%_0%,rgba(249,115,22,.15),transparent_28%),radial-gradient(circle_at_100%_80%,rgba(14,165,233,.11),transparent_30%)]" />

      <div className="relative mx-auto min-h-[100svh] max-w-[1550px] px-5 py-6 lg:px-8 lg:py-8">
        <header className="flex items-center gap-4">
          <TerminalLink
            href="/terminal/turniere/ergebnisse"
            label="Turnier-Ergebnisse werden geöffnet"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-5 w-5" />
          </TerminalLink>
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300/90">
              Turnier-Historie
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
              Turnierdetails
            </h1>
          </div>
        </header>

        {loading ? (
          <div className="mt-8 rounded-[32px] border border-white/[0.08] bg-black/28 p-12 text-center backdrop-blur-2xl">
            <div className="mx-auto h-1.5 w-52 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-orange-400" />
            </div>
            <div className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-white/35">
              History wird geladen
            </div>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-[30px] border border-red-400/15 bg-red-500/[0.06] p-8 text-center font-bold text-red-100">
            {error}
          </div>
        ) : (
          <>
            <section className="relative mt-7 overflow-hidden rounded-[36px] border border-white/[0.09] bg-black/32 p-6 backdrop-blur-2xl sm:p-8">
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-orange-500/12 blur-3xl" />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
                    {typeLabel(tournamentType || history?.tournament_type)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/16 bg-emerald-400/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Abgeschlossen
                  </span>
                </div>

                <div className="mt-5 flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-orange-400/20 bg-orange-500/10 text-orange-300">
                    <Trophy className="h-8 w-8" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-3xl font-black tracking-[-0.05em] sm:text-5xl">
                      {history?.tournament_name || membersResults[0]?.tournament_name || "Turnier"}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-white/45">
                      <span className="inline-flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-300" />
                        {participantCount} {isMembersCup ? "Teams" : "Teilnehmer"}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-cyan-200" />
                        {dateDE(history?.created_at || membersResults[0]?.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] border border-orange-300/14 bg-orange-500/[0.06] p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-orange-100/40">
                    <Crown className="h-4 w-4" />
                    Sieger
                  </div>
                  <div className="mt-2 text-xl font-black text-orange-100 sm:text-2xl">
                    {winner || "Noch nicht hinterlegt"}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
              <div className="rounded-[30px] border border-white/[0.08] bg-black/28 p-5 backdrop-blur-2xl">
                <div className="mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-orange-300" />
                  <h3 className="text-xl font-black">
                    {isMembersCup ? "Rangliste" : "Platzierungen"}
                  </h3>
                </div>

                {isMembersCup ? (
                  teamRanking.length === 0 ? (
                    <div className="text-sm font-semibold text-white/35">Keine Rangliste gefunden.</div>
                  ) : (
                    <div className="space-y-2">
                      {teamRanking.map((team) => (
                        <div
                          key={team.team_id}
                          className={`rounded-[20px] border p-4 ${
                            team.placement === 1
                              ? "border-orange-300/20 bg-orange-500/[0.07]"
                              : "border-white/[0.07] bg-white/[0.025]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                              {positionIcon(team.placement)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-black">{team.team_name}</div>
                              <div className="mt-1 text-xs font-semibold text-white/35">
                                {team.players.join(" · ")}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-black text-orange-200">{team.points}</div>
                              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25">Punkte</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : rankings.length === 0 ? (
                  <div className="text-sm font-semibold text-white/35">Keine Rangliste gefunden.</div>
                ) : (
                  <div className="space-y-2">
                    {rankings.map((row) => (
                      <div key={`${row.player_name}-${row.placement}`} className="flex items-center gap-3 rounded-[18px] border border-white/[0.07] bg-white/[0.025] p-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                          {positionIcon(row.placement)}
                        </div>
                        <div className="min-w-0 flex-1 truncate font-black">{row.player_name}</div>
                        <div className="text-sm font-black text-white/40">#{row.placement}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[30px] border border-white/[0.08] bg-black/28 p-5 backdrop-blur-2xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-cyan-200" />
                    <h3 className="text-xl font-black">Matches</h3>
                  </div>
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-white/25">
                    {matches.length} Spiele
                  </div>
                </div>

                {isKratzer ? (
                  <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-5 text-sm font-semibold text-white/45">
                    Kratzer-Turnier: Die Platzierungen stehen links in der Ergebnisliste.
                    {kratzerResult?.total_rounds ? ` ${kratzerResult.total_rounds} Runden gespielt.` : ""}
                  </div>
                ) : matches.length === 0 ? (
                  <div className="text-sm font-semibold text-white/35">Keine Matchdaten gefunden.</div>
                ) : (
                  <div className="space-y-2">
                    {matches.map((match) => (
                      <div key={match.match_id} className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/40">
                                Match {match.match_id}
                              </span>
                              {match.machine_number ? (
                                <span className="rounded-full border border-cyan-200/10 bg-cyan-400/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/45">
                                  Board {match.machine_number}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-2 line-clamp-2 font-black">
                              {match.player1 || "–"}
                              <span className="mx-2 font-semibold text-white/25">vs</span>
                              {match.player2 || "–"}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <div className="text-2xl font-black tabular-nums">
                              {match.score1 ?? 0}:{match.score2 ?? 0}
                            </div>
                            {match.winner && (
                              <div className="max-w-[220px] truncate rounded-xl border border-orange-300/12 bg-orange-500/[0.07] px-3 py-2 text-xs font-black text-orange-100">
                                {match.winner}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
