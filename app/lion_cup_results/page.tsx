"use client"

import { SectionSkeleton } from "@/components/loading/loading"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Calendar, ChevronDown, ChevronUp, Search, Trophy, Target, Award } from "lucide-react"

interface LionCupSeries {
  id: string
  name: string
  is_active: boolean
  series_type: string
  created_at: string
}

interface MatchResult {
  id: string
  tournament_id: string
  tournament_type: string
  round: number
  player1: string
  player2: string
  score1: number
  score2: number
  winner: string
  loser: string
  match_id: number
  updated_at: string
}

interface Tournament {
  tournament_id: string
  tournament_name: string
  tournament_type: string
  tournament_date: string
  match_count?: number
}

function formatDateDE(value: string) {
  const d = new Date(value)
  return isNaN(d.getTime()) ? value : d.toLocaleDateString("de-DE")
}

function cleanPlayerName(name: string) {
  const n = (name || "").trim()
  if (!n) return "-"
  return n
}

function isValidMatch(m: any) {
  if (!m) return false

  const p1 = (m.player1 || "").trim()
  const p2 = (m.player2 || "").trim()

  if (!p1 || !p2) return false

  const p1Freilos = p1.toUpperCase().includes("FREILOS") || p1.toUpperCase() === "EMPTY" || p1 === "NULL"
  const p2Freilos = p2.toUpperCase().includes("FREILOS") || p2.toUpperCase() === "EMPTY" || p2 === "NULL"


  if (p1Freilos && p2Freilos) return false

  return true
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null)
  const [matches, setMatches] = useState<Map<string, MatchResult[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [loadingMatches, setLoadingMatches] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState("")
  const [seriesList, setSeriesList] = useState<LionCupSeries[]>([])
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)

  useEffect(() => {
    fetchSeries()
  }, [])

  useEffect(() => {
    if (selectedSeriesId) {
      fetchTournaments()
    } else {
      setTournaments([])
      setLoading(false)
    }
  }, [selectedSeriesId])

  const fetchSeries = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("dko_series")
        .select("id,name,is_active,series_type,created_at")
        .eq("series_type", "lion_cup")
        .order("created_at", { ascending: false })

      if (error) throw error

      const list = (data || []) as LionCupSeries[]
      setSeriesList(list)
      setSelectedSeriesId((current) => {
        if (current && list.some((s) => s.id === current)) return current
        return list.find((s) => s.is_active)?.id ?? list[0]?.id ?? null
      })
    } catch (error) {
      console.error("Error fetching Lion Cup series:", error)
      setSeriesList([])
      setSelectedSeriesId(null)
      setLoading(false)
    }
  }

  const fetchTournaments = async () => {
    try {
      setLoading(true)

      const { data: uniqueTournaments, error: tournamentsError } = await supabase
        .from("tournament_series_standings")
        .select("tournament_id, tournament_name, tournament_date, tournament_type")
        .eq("series_id", selectedSeriesId)
        .order("tournament_date", { ascending: false })

      if (tournamentsError) throw tournamentsError

      const uniqueTournamentMap = new Map<string, Tournament>()
      ;(uniqueTournaments || []).forEach((t: any) => {
        if (!uniqueTournamentMap.has(t.tournament_id)) {
          uniqueTournamentMap.set(t.tournament_id, {
            tournament_id: t.tournament_id,
            tournament_name: t.tournament_name,
            tournament_type: t.tournament_type,
            tournament_date: t.tournament_date,
          })
        }
      })

      const tournamentsArray = Array.from(uniqueTournamentMap.values())

      for (const tournament of tournamentsArray) {
        const { data: matchData } = await supabase
          .from("dko_match_states")
          .select("player1, player2")
          .eq("tournament_id", tournament.tournament_id)

        const filtered = (matchData || []).filter((m: any) => isValidMatch(m))
        tournament.match_count = filtered.length
      }

      setTournaments(tournamentsArray)
    } catch (error) {
      console.error("Error fetching tournaments:", error)
      setTournaments([])
    } finally {
      setLoading(false)
    }
  }

  const fetchMatches = async (tournamentId: string) => {
    if (matches.has(tournamentId)) return

    setLoadingMatches((prev) => {
      const next = new Set(prev)
      next.add(tournamentId)
      return next
    })

    try {
      const { data, error } = await supabase
        .from("dko_match_states")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("id", { ascending: true })

      if (error) throw error

      const filteredData = (data || []).filter((m: any) => isValidMatch(m))

      setMatches((prev) => {
        const next = new Map(prev)
        next.set(tournamentId, filteredData)
        return next
      })
    } catch (error) {
      console.error("Error fetching matches:", error)
    } finally {
      setLoadingMatches((prev) => {
        const next = new Set(prev)
        next.delete(tournamentId)
        return next
      })
    }
  }

  const handleToggleTournament = (tournamentId: string) => {
    if (expandedTournament === tournamentId) {
      setExpandedTournament(null)
      return
    }
    setExpandedTournament(tournamentId)
    fetchMatches(tournamentId)
  }

  const getTournamentTypeLabel = (type: string) => {
    const t = type || ""
    if (t.includes("16")) return "16er DKO"
    if (t.includes("8")) return "8er DKO"
    if (t.includes("32")) return "32er DKO"
    if (t.includes("64")) return "64er DKO"
    return t
  }

  const getMatchWinner = (match: MatchResult) => {
    if (match.score1 > match.score2) return match.player1
    if (match.score2 > match.score1) return match.player2
    return null
  }

  const filteredTournaments = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tournaments
    return tournaments.filter((t) => {
      const name = (t.tournament_name || "").toLowerCase()
      const type = (t.tournament_type || "").toLowerCase()
      const date = formatDateDE(t.tournament_date).toLowerCase()
      return name.includes(q) || type.includes(q) || date.includes(q)
    })
  }, [tournaments, query])

  const totalMatches = tournaments.reduce((sum, t) => sum + (t.match_count || 0), 0)
  const lastDate = tournaments.length > 0 ? formatDateDE(tournaments[0].tournament_date) : "-"

  const CompactMatchCard = ({ match }: { match: MatchResult }) => {
    const winner = getMatchWinner(match)
    const p1Win = winner === match.player1
    const p2Win = winner === match.player2

    const p1IsFreilos = match.player1.toUpperCase().includes("FREILOS")
    const p2IsFreilos = match.player2.toUpperCase().includes("FREILOS")

    return (
      <div className="rounded-2xl border border-border bg-card p-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="rounded-full bg-muted border border-border px-2 py-1 text-xs font-semibold text-muted-foreground">
              ID {match.id}
            </span>
            <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700">
              Match {match.match_id}
            </span>
            {match.round ? (
              <span className="rounded-full bg-orange-50 border border-orange-200 px-2 py-1 text-xs font-semibold text-orange-700">
                Runde {match.round}
              </span>
            ) : null}
          </div>

          <div className="text-xs font-bold text-muted-foreground flex-shrink-0">{formatDateDE(match.updated_at)}</div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`w-[42%] rounded-xl border px-2 py-2 ${
              p1IsFreilos ? "border-border bg-muted" : p1Win ? "border-green-300 bg-green-50" : "border-border bg-muted"
            }`}
          >
            <div className={`text-xs font-semibold truncate ${p1IsFreilos ? "text-muted-foreground" : "text-foreground"}`}>
              {cleanPlayerName(match.player1)}
            </div>
            <div
              className={`mt-1 text-base font-semibold ${
                p1IsFreilos ? "text-muted-foreground" : p1Win ? "text-green-700" : "text-muted-foreground"
              }`}
            >
              {match.score1}
            </div>
          </div>

          <div className="w-[16%] flex flex-col items-center justify-center">
            <div className="text-xs font-semibold text-muted-foreground">VS</div>
            <div className="mt-1 w-7 h-7" />
          </div>

          <div
            className={`w-[42%] rounded-xl border px-2 py-2 ${
              p2IsFreilos ? "border-border bg-muted" : p2Win ? "border-green-300 bg-green-50" : "border-border bg-muted"
            }`}
          >
            <div className={`text-xs font-semibold truncate ${p2IsFreilos ? "text-muted-foreground" : "text-foreground"}`}>
              {cleanPlayerName(match.player2)}
            </div>
            <div
              className={`mt-1 text-base font-semibold ${
                p2IsFreilos ? "text-muted-foreground" : p2Win ? "text-green-700" : "text-muted-foreground"
              }`}
            >
              {match.score2}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
  return (
    <main className="emd-loading-surface min-h-screen flex flex-col bg-muted text-foreground pb-24 overflow-x-hidden">
      <Header />

      <SectionSkeleton kind="cards" />

      <MobileBottomNav />
    </main>
  )
}

  return (
    <div className="min-h-screen bg-muted text-foreground pb-24 overflow-x-hidden">
      <Header />

      <main className="pt-12 sm:pt-14">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8 space-y-4">
          <a href="/lion-cup" className="flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold">
            <ChevronDown className="h-5 w-5 rotate-90" />
            Zurück zur Tabelle
          </a>

          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="text-foreground h-2 bg-card  " />
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-base sm:text-lg font-semibold text-foreground">Lion Cup Ergebnisse</h1>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">Übersicht aller gespielten Matches</p>
                      {seriesList.length > 0 && (
                        <div className="mt-3">
                          <label className="text-xs font-bold text-muted-foreground">Saison / Archiv</label>
                          <select
                            value={selectedSeriesId ?? ""}
                            onChange={(e) => {
                              setExpandedTournament(null)
                              setMatches(new Map())
                              setSelectedSeriesId(e.target.value)
                            }}
                            className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-orange-400"
                          >
                            {seriesList.map((series) => (
                              <option key={series.id} value={series.id}>
                                {series.name}{series.is_active ? " – aktuell" : " – Archiv"}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 rounded-2xl border border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
                  {filteredTournaments.length}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-orange-600" />
                    <p className="text-xs font-semibold text-muted-foreground">Turniere</p>
                  </div>
                  <p className="text-lg font-semibold text-foreground mt-1">{tournaments.length}</p>
                </div>

                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <p className="text-xs font-semibold text-muted-foreground">Matches</p>
                  </div>
                  <p className="text-lg font-semibold text-foreground mt-1">{totalMatches}</p>
                </div>

                <div className="rounded-xl border border-border bg-card p-3 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <p className="text-xs font-semibold text-muted-foreground">Letztes</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-1">{lastDate}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-muted p-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Suche Turnier Name, Typ, Datum"
                  className="w-full bg-transparent outline-none text-sm font-semibold text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="text-foreground h-2 bg-card  " />

            <div className="p-4 sm:p-5 border-b border-border">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-foreground">Turniere</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Tap zum Aufklappen</p>
                  </div>
                </div>

                <div className="flex-shrink-0 rounded-2xl border border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
                  {filteredTournaments.length}
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 space-y-3">
              {filteredTournaments.length > 0 ? (
                filteredTournaments.map((tournament, index) => {
                  const isExpanded = expandedTournament === tournament.tournament_id
                  const tournamentMatches = matches.get(tournament.tournament_id) || []
                  const isLoading = loadingMatches.has(tournament.tournament_id)

                  return (
                    <div
                      key={tournament.tournament_id}
                      className="rounded-2xl border-2 border-border bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-orange-400 transition-all duration-300"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTournament(tournament.tournament_id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex items-center justify-center w-11 h-11 bg-primary text-primary-foreground rounded-2xl font-semibold text-sm flex-shrink-0 shadow-sm">
                            {filteredTournaments.length - index}
                          </div>

                          <div className="text-left min-w-0 flex-1">
                            <div className="text-sm sm:text-base font-semibold text-foreground truncate">{tournament.tournament_name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Award className="w-3.5 h-3.5" />
                                {getTournamentTypeLabel(tournament.tournament_type)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Target className="w-3.5 h-3.5" />
                                {tournament.match_count || 0}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDateDE(tournament.tournament_date)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>

                      {isExpanded ? (
                        <div className="border-t border-border bg-muted p-3 sm:p-4">
                          {isLoading ? (
                            <SectionSkeleton kind="cards" />
                          ) : tournamentMatches.length > 0 ? (
                            <div className="space-y-3">
                              {tournamentMatches.map((match) => (
                                <CompactMatchCard key={match.id} match={match} />
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-border bg-card p-6 text-center">
                              <Target className="h-10 w-10 mx-auto text-muted-foreground" />
                              <div className="mt-3 text-sm font-bold text-muted-foreground">Keine Matches gefunden</div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )
                })
              ) : (
                <div className="rounded-2xl border border-border bg-card p-6 text-center">
                  <Calendar className="h-10 w-10 mx-auto text-muted-foreground" />
                  <div className="mt-3 text-sm font-bold text-muted-foreground">Noch keine Turniere vorhanden</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}