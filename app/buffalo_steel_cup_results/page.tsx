"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import Image from '@/components/Image'
import { MobileBottomNav } from '@/components/mobile-bottom-nav'
import {
Trophy,
  Calendar,
  ChevronDown,
  ChevronUp,
  Target,
  Award,
  Star,
} from 'lucide-react'

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

export default function BuffaloTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null)
  const [matches, setMatches] = useState<Map<string, MatchResult[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [loadingMatches, setLoadingMatches] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      const { data: uniqueTournaments, error: tournamentsError } = await supabase
        .from('buffalo_steel_cup_standings')
        .select('tournament_id, tournament_name, tournament_date')
        .order('tournament_date', { ascending: false })

      if (tournamentsError) throw tournamentsError

      const uniqueTournamentMap = new Map<string, any>()
      uniqueTournaments?.forEach((t) => {
        if (!uniqueTournamentMap.has(t.tournament_id)) {
          uniqueTournamentMap.set(t.tournament_id, t)
        }
      })

      const tournamentsArray = await Promise.all(
        Array.from(uniqueTournamentMap.values()).map(async (tournament) => {
          const { data: matchData } = await supabase
            .from('dko_match_states')
            .select('tournament_type')
            .eq('tournament_id', tournament.tournament_id)
            .limit(1)
            .maybeSingle()

          return {
            tournament_id: tournament.tournament_id,
            tournament_name: tournament.tournament_name,
            tournament_type: matchData?.tournament_type || '8er_dko',
            tournament_date: tournament.tournament_date,
          }
        })
      )

      for (const tournament of tournamentsArray) {
        const { data: matchData } = await supabase
          .from('dko_match_states')
          .select('player1, player2')
          .eq('tournament_id', tournament.tournament_id)

        const filteredMatches = (matchData || []).filter(
          (match) =>
            match.player1 &&
            match.player2 &&
            match.player1.trim() !== '' &&
            match.player2.trim() !== '' &&
            match.player1.toUpperCase() !== 'EMPTY' &&
            match.player2.toUpperCase() !== 'EMPTY' &&
            match.player1 !== 'NULL' &&
            match.player2 !== 'NULL'
        )

        tournament.match_count = filteredMatches.length
      }

      setTournaments(tournamentsArray)
    } catch (error) {
      console.error('Error fetching tournaments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMatches = async (tournamentId: string) => {
    if (matches.has(tournamentId)) {
      return
    }

    setLoadingMatches((prev) => new Set(prev).add(tournamentId))

    try {
      const { data, error } = await supabase
        .from('dko_match_states')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('id', { ascending: true })

      if (error) throw error

      const filteredData = (data || []).filter(
        (match) =>
          match.player1 &&
          match.player2 &&
          match.player1.trim() !== '' &&
          match.player2.trim() !== '' &&
          match.player1.toUpperCase() !== 'EMPTY' &&
          match.player2.toUpperCase() !== 'EMPTY' &&
          match.player1 !== 'NULL' &&
          match.player2 !== 'NULL'
      )

      setMatches((prev) => new Map(prev).set(tournamentId, filteredData))
    } catch (error) {
      console.error('Error fetching matches:', error)
    } finally {
      setLoadingMatches((prev) => {
        const newSet = new Set(prev)
        newSet.delete(tournamentId)
        return newSet
      })
    }
  }

  const handleToggleTournament = (tournamentId: string) => {
    if (expandedTournament === tournamentId) {
      setExpandedTournament(null)
    } else {
      setExpandedTournament(tournamentId)
      fetchMatches(tournamentId)
    }
  }

  const getTournamentTypeLabel = (type: string) => {
    if (type.includes('16')) return '16er DKO'
    if (type.includes('8')) return '8er DKO'
    if (type.includes('32')) return '32er DKO'
    if (type.includes('64')) return '64er DKO'
    return type
  }

  const getMatchWinner = (match: MatchResult) => {
    if (match.score1 > match.score2) return match.player1
    if (match.score2 > match.score1) return match.player2
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
        <Header />
        <main className="container mx-auto p-3 sm:p-4 md:p-8 max-w-7xl">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                <h2 className="text-lg sm:text-2xl font-bold text-white">Buffalo Steel Cup Turniere</h2>
              </div>
            </div>
            <div className="p-6 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm sm:text-base text-gray-600">Lade Turniere...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
      <Header />

      <main className="container mx-auto p-3 sm:p-4 md:p-8 max-w-7xl space-y-6 sm:space-y-8 pb-24">
        <a
          href="/buffalo_steel_cup_tabelle"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors px-4"
        >
          <ChevronDown className="h-5 w-5 rotate-90" />
          Zurück zur Tabelle
        </a>
        <div className="px-4">
          <div className="bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50 rounded-2xl shadow-2xl border-2 border-blue-200 overflow-hidden">
            <div className="text-center pt-6 pb-4 px-4">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 shadow-xl">
                    <Trophy className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full w-4 h-4 border-2 border-white"></div>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3">
                <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent">
                  BUFFALO STEEL CUP TURNIERE
                </span>
              </h1>

              <p className="text-xl sm:text-2xl font-semibold text-gray-700 mb-2">
                Alle Turniere & Spielergebnisse
              </p>
              <p className="text-sm sm:text-base text-gray-500 mb-4">
                Komplette Übersicht aller gespielten Matches
              </p>

              <div className="flex justify-center items-center gap-4">
                <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-yellow-500 rounded-full"></div>
                <Star className="h-4 w-4 text-yellow-500" />
                <div className="h-1 w-12 bg-gradient-to-r from-yellow-500 to-blue-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 px-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm">Turniere</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{tournaments.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm">Gesamt Matches</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {tournaments.reduce((sum, t) => sum + (t.match_count || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-purple-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm">Letztes Turnier</p>
                <p className="text-base sm:text-lg font-bold text-gray-900">
                  {tournaments.length > 0
                    ? new Date(tournaments[0].tournament_date).toLocaleDateString('de-DE')
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold text-white">Alle Turniere</h2>
                    <p className="text-xs sm:text-sm text-blue-100 mt-1">
                      Klicke auf ein Turnier um alle Spielergebnisse zu sehen
                    </p>
                  </div>
                </div>
                <div className="bg-white/20 rounded-lg px-2 sm:px-3 py-1">
                  <span className="text-white font-semibold text-sm">{tournaments.length}</span>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              {tournaments.length > 0 ? (
                tournaments.map((tournament, index) => {
                  const isExpanded = expandedTournament === tournament.tournament_id
                  const tournamentMatches = matches.get(tournament.tournament_id) || []
                  const isLoadingMatches = loadingMatches.has(tournament.tournament_id)

                  return (
                    <div
                      key={tournament.tournament_id}
                      className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden hover:border-blue-500 transition-colors"
                    >
                      <button
                        onClick={() => handleToggleTournament(tournament.tournament_id)}
                        className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                          <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 text-white rounded-full font-bold text-sm sm:text-base flex-shrink-0">
                            {tournaments.length - index}
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <h3 className="text-sm sm:text-xl font-bold text-gray-900 truncate">
                              {tournament.tournament_name}
                            </h3>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Award className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="truncate">{getTournamentTypeLabel(tournament.tournament_type)}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Target className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                {tournament.match_count || 0} Matches
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                {new Date(tournament.tournament_date).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 flex-shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t-2 border-gray-200 p-3 sm:p-6 bg-gray-50">
                          <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
                            Spielergebnisse
                          </h4>

                          {isLoadingMatches ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                              <p className="mt-3 text-sm text-gray-600">Lade Spielergebnisse...</p>
                            </div>
                          ) : tournamentMatches.length > 0 ? (
                            <div className="space-y-3">
                              {tournamentMatches.map((match) => {
                                const winner = getMatchWinner(match)
                                return (
                                  <div
                                    key={match.id}
                                    className="bg-white rounded-lg border-2 border-gray-200 p-3 sm:p-4 hover:border-blue-300 transition-colors"
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <div className="bg-gray-100 rounded-lg px-2 py-1">
                                          <span className="text-xs font-bold text-gray-600">ID: {match.id}</span>
                                        </div>
                                        <div className="bg-blue-100 rounded-lg px-2 py-1">
                                          <span className="text-xs font-bold text-blue-700">
                                            Match #{match.match_id}
                                          </span>
                                        </div>
                                        {match.round && (
                                          <div className="bg-purple-100 rounded-lg px-2 py-1">
                                            <span className="text-xs font-bold text-purple-700">
                                              Runde {match.round}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {new Date(match.updated_at).toLocaleDateString('de-DE')}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div
                                        className={`rounded-lg p-3 border-2 ${
                                          winner === match.player1
                                            ? 'bg-green-50 border-green-500'
                                            : 'bg-gray-50 border-gray-300'
                                        }`}
                                      >
                                        <div className="text-xs text-gray-600 mb-1">Spieler 1</div>
                                        <div className="font-bold text-gray-900 text-sm sm:text-base truncate">
                                          {match.player1}
                                        </div>
                                        <div
                                          className={`text-2xl font-black mt-2 ${
                                            winner === match.player1 ? 'text-green-600' : 'text-gray-600'
                                          }`}
                                        >
                                          {match.score1}
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-center">
                                        <div className="text-2xl font-black text-gray-400">VS</div>
                                      </div>

                                      <div
                                        className={`rounded-lg p-3 border-2 ${
                                          winner === match.player2
                                            ? 'bg-green-50 border-green-500'
                                            : 'bg-gray-50 border-gray-300'
                                        }`}
                                      >
                                        <div className="text-xs text-gray-600 mb-1">Spieler 2</div>
                                        <div className="font-bold text-gray-900 text-sm sm:text-base truncate">
                                          {match.player2}
                                        </div>
                                        <div
                                          className={`text-2xl font-black mt-2 ${
                                            winner === match.player2 ? 'text-green-600' : 'text-gray-600'
                                          }`}
                                        >
                                          {match.score2}
                                        </div>
                                      </div>
                                    </div>

                                    {match.winner && (
                                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-center gap-2">
                                        <Trophy className="h-4 w-4 text-yellow-500" />
                                        <span className="text-sm font-bold text-gray-700">
                                          Gewinner: <span className="text-green-600">{match.winner}</span>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-12 text-gray-600">
                              <Target className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                              <p>Keine Spielergebnisse gefunden</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-12 text-gray-600">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>Noch keine Turniere vorhanden</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="py-4 sm:py-6 bg-gray-200 text-gray-600 text-xs sm:text-sm text-center mt-8 border-t border-gray-300 px-4">
        <p>&copy; 2025 Emoj!'s Dartverein e.V. Alle Rechte vorbehalten.</p>
      </footer>

      <MobileBottomNav />
    </div>
  )
}


