"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Calendar, ChevronDown, ChevronUp, Search, Trophy, Target, Award, Loader2 } from "lucide-react"


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
      <div className="rounded-2xl border border-gray-200 bg-white p-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="rounded-full bg-gray-100 border border-gray-200 px-2 py-1 text-[10px] font-black text-gray-700">
              ID {match.id}
            </span>
            <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-1 text-[10px] font-black text-blue-700">
              Match {match.match_id}
            </span>
            {match.round ? (
              <span className="rounded-full bg-purple-50 border border-purple-200 px-2 py-1 text-[10px] font-black text-purple-700">
                Runde {match.round}
              </span>
            ) : null}
          </div>

          <div className="text-[10px] font-bold text-gray-500 flex-shrink-0">{formatDateDE(match.updated_at)}</div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`w-[42%] rounded-xl border px-2 py-2 ${
              p1IsFreilos ? "border-gray-200 bg-gray-100" : p1Win ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className={`text-[11px] font-semibold truncate ${p1IsFreilos ? "text-gray-500" : "text-gray-900"}`}>
              {cleanPlayerName(match.player1)}
            </div>
            <div
              className={`mt-1 text-base font-black ${
                p1IsFreilos ? "text-gray-400" : p1Win ? "text-green-700" : "text-gray-700"
              }`}
            >
              {match.score1}
            </div>
          </div>

          <div className="w-[16%] flex flex-col items-center justify-center">
            <div className="text-[10px] font-black text-gray-300">VS</div>
            <div className="mt-1 w-7 h-7" />
          </div>

          <div
            className={`w-[42%] rounded-xl border px-2 py-2 ${
              p2IsFreilos ? "border-gray-200 bg-gray-100" : p2Win ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className={`text-[11px] font-semibold truncate ${p2IsFreilos ? "text-gray-500" : "text-gray-900"}`}>
              {cleanPlayerName(match.player2)}
            </div>
            <div
              className={`mt-1 text-base font-black ${
                p2IsFreilos ? "text-gray-400" : p2Win ? "text-green-700" : "text-gray-700"
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
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 pb-20 pt-12 sm:pt-14">
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-white shadow-2xl px-10 py-10 border border-gray-200">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl animate-pulse" />
              <Loader2 className="relative h-12 w-12 animate-spin text-orange-600" />
            </div>

            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">Turniere werden geladen</p>
              <p className="text-sm text-gray-500 mt-1">Bitte kurz warten…</p>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </main>
  )
}

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
      <Header />

      <main className="pt-12 sm:pt-14">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8 space-y-4">
          <a href="/lion-cup" className="flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold">
            <ChevronDown className="h-5 w-5 rotate-90" />
            Zurück zur Tabelle
          </a>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-base sm:text-lg font-black text-gray-900">Lion Cup Ergebnisse</h1>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">Übersicht aller gespielten Matches</p>
                      {seriesList.length > 0 && (
                        <div className="mt-3">
                          <label className="text-[11px] font-bold text-gray-500">Saison / Archiv</label>
                          <select
                            value={selectedSeriesId ?? ""}
                            onChange={(e) => {
                              setExpandedTournament(null)
                              setMatches(new Map())
                              setSelectedSeriesId(e.target.value)
                            }}
                            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-orange-400"
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

                <div className="flex-shrink-0 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700">
                  {filteredTournaments.length}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-orange-600" />
                    <p className="text-[11px] font-semibold text-gray-700">Turniere</p>
                  </div>
                  <p className="text-lg font-black text-gray-900 mt-1">{tournaments.length}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <p className="text-[11px] font-semibold text-gray-700">Matches</p>
                  </div>
                  <p className="text-lg font-black text-gray-900 mt-1">{totalMatches}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-3 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <p className="text-[11px] font-semibold text-gray-700">Letztes</p>
                  </div>
                  <p className="text-sm font-black text-gray-900 mt-1">{lastDate}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Suche Turnier Name, Typ, Datum"
                  className="w-full bg-transparent outline-none text-sm font-semibold text-gray-800"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

            <div className="p-4 sm:p-5 border-b border-gray-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-gray-900">Turniere</h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">Tap zum Aufklappen</p>
                  </div>
                </div>

                <div className="flex-shrink-0 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700">
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
                      className="rounded-2xl border-2 border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-orange-400 transition-all duration-300"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTournament(tournament.tournament_id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex items-center justify-center w-11 h-11 bg-orange-600 text-white rounded-2xl font-black text-sm flex-shrink-0 shadow-sm">
                            {filteredTournaments.length - index}
                          </div>

                          <div className="text-left min-w-0 flex-1">
                            <div className="text-sm sm:text-base font-black text-gray-900 truncate">{tournament.tournament_name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-gray-600">
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
                          <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                      </button>

                      {isExpanded ? (
                        <div className="border-t border-gray-200 bg-gray-50 p-3 sm:p-4">
                          {isLoading ? (
                            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-500" />
                              <div className="mt-3 text-sm font-bold text-gray-600">Lade Matches</div>
                            </div>
                          ) : tournamentMatches.length > 0 ? (
                            <div className="space-y-3">
                              {tournamentMatches.map((match) => (
                                <CompactMatchCard key={match.id} match={match} />
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                              <Target className="h-10 w-10 mx-auto text-gray-400" />
                              <div className="mt-3 text-sm font-bold text-gray-600">Keine Matches gefunden</div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )
                })
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                  <Calendar className="h-10 w-10 mx-auto text-gray-400" />
                  <div className="mt-3 text-sm font-bold text-gray-600">Noch keine Turniere vorhanden</div>
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