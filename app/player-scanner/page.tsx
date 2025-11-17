'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, AlertCircle, Trophy, Clock, User, Zap } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface PlayerInfo {
  id: string
  name: string
  profile_picture_url: string | null
}

interface Match {
  match_id: number
  player1: string
  player2: string
  score1: number
  score2: number
  winner: string | null
  tournament_id: string
}

export default function PlayerScannerPage() {
  const [playerCode, setPlayerCode] = useState('')
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null)
  const [matchHistory, setMatchHistory] = useState<Match[]>([])
  const [nextMatch, setNextMatch] = useState<{
    opponent: string
    tournament: string
    matchId: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleCodeSubmit = async (code: string) => {
    if (!code.trim()) return

    setLoading(true)
    setError('')
    setPlayerInfo(null)
    setMatchHistory([])
    setNextMatch(null)

    try {
      let normalizedCode = code.trim()
      
      normalizedCode = normalizedCode.replace(/ß/g, '')
      
      // Entferne alle doppelten oder mehrfachen Bindestriche
      normalizedCode = normalizedCode.replace(/-+/g, '-')
      
      // Entferne führende/nachfolgende Bindestriche
      normalizedCode = normalizedCode.replace(/^-+|-+$/g, '')
      
      // Normalisiere EMD-Codes: EMD oder emd am Anfang wird zu EMD-
      if (normalizedCode.toLowerCase().startsWith('emd')) {
        // Extrahiere den Teil nach EMD (mit oder ohne Bindestrich)
        const afterEMD = normalizedCode.slice(3).replace(/^-+/, '')
        normalizedCode = 'EMD-' + afterEMD.toLowerCase()
      }

      console.log('[v0] Original code:', code, '| Normalized:', normalizedCode)

      const { data: playerData, error: playerError } = await supabase
        .from('spieldatenbank')
        .select('id, name, profile_picture_url')
        .eq('player_code', normalizedCode)
        .maybeSingle()

      if (playerError) {
        console.error('[v0] Supabase error:', playerError)
        throw playerError
      }

      if (!playerData) {
        setError(`Spieler mit Code "${normalizedCode}" nicht gefunden`)
        setPlayerCode('')
        inputRef.current?.focus()
        return
      }

      setPlayerInfo(playerData)

      const { data: matches, error: matchError } = await supabase
        .from('dko_match_states')
        .select('match_id, player1, player2, score1, score2, winner, tournament_id')
        .or(`player1.eq.${playerData.name},player2.eq.${playerData.name}`)
        .not('winner', 'is', null)
        .order('updated_at', { ascending: false })

      if (matchError) throw matchError

      const playedMatches = (matches || []).filter((m) => m.winner)
      setMatchHistory(playedMatches)

      // Get next upcoming match (no winner yet)
      const { data: upcomingMatches, error: upcomingError } = await supabase
        .from('dko_match_states')
        .select('match_id, player1, player2, tournament_id')
        .or(`player1.eq.${playerData.name},player2.eq.${playerData.name}`)
        .is('winner', null)
        .maybeSingle()

      if (upcomingError) throw upcomingError

      if (upcomingMatches) {
        const opponent = upcomingMatches.player1 === playerData.name ? upcomingMatches.player2 : upcomingMatches.player1

        const { data: tournamentData } = await supabase
          .from('tournaments_status')
          .select('tournament_name')
          .eq('tournament_id', upcomingMatches.tournament_id)
          .maybeSingle()

        setNextMatch({
          opponent,
          tournament: tournamentData?.tournament_name || 'Unbekanntes Turnier',
          matchId: upcomingMatches.match_id,
        })
      }

      // Clear input for next scan
      setPlayerCode('')
      inputRef.current?.focus()
    } catch (err) {
      console.error('[v0] Scanner error:', err)
      setError('Fehler beim Abrufen der Daten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Player Check-In</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Turnierbegleiter</p>
          </div>
          <Link href="/dko_tournament_registration">
            <Button variant="outline" size="sm" className="gap-2 border-slate-300 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        {/* Scanner Input Card */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-900 uppercase tracking-wide">
            Spielerkarte scannen
          </label>
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder="EMD-90cebf"
              value={playerCode}
              onChange={(e) => setPlayerCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCodeSubmit(playerCode)
                }
              }}
              disabled={loading}
              className="text-base h-16 font-mono tracking-widest border-2 border-slate-200 rounded-lg shadow-sm focus:border-slate-900 focus:ring-0"
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-slate-300 border-t-slate-900 rounded-full"></div>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">Automatischer Scanner oder manueller Code + Enter</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Player Info Header */}
        {playerInfo && (
          <div className="bg-slate-900 text-white rounded-lg overflow-hidden shadow-lg">
            <div className="px-8 py-8 flex items-center gap-8">
              {playerInfo.profile_picture_url && (
                <Image
                  src={playerInfo.profile_picture_url || "/placeholder.svg"}
                  alt={playerInfo.name}
                  width={96}
                  height={96}
                  className="rounded-lg object-cover border-2 border-white flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <p className="text-slate-300 text-sm font-medium uppercase tracking-wide mb-2">Spieler</p>
                <h2 className="text-4xl font-black mb-3">{playerInfo.name}</h2>
              </div>
            </div>
          </div>
        )}

        {/* Next Match - Priority Card */}
        {nextMatch && playerInfo && (
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg overflow-hidden shadow-lg border-l-4 border-blue-400">
            <div className="px-8 py-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm font-semibold uppercase tracking-wide">Nächster Match</p>
                    <p className="text-white text-3xl font-black">Match #{nextMatch.matchId}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-blue-100 text-xs font-semibold uppercase tracking-wide mb-2">Gegner</p>
                  <p className="text-2xl font-bold text-white">{nextMatch.opponent}</p>
                </div>
                <div>
                  <p className="text-blue-100 text-xs font-semibold uppercase tracking-wide mb-2">Turnier</p>
                  <p className="text-xl font-bold text-blue-50">{nextMatch.tournament}</p>
                </div>
              </div>

              <Button className="w-full bg-white text-blue-700 hover:bg-blue-50 font-bold h-12 rounded-lg">
                Zum Match starten
              </Button>
            </div>
          </div>
        )}

        {/* Match History */}
        {matchHistory.length > 0 && playerInfo && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-amber-600" />
              <h3 className="text-xl font-black text-slate-900">Spielhistorie</h3>
              <span className="ml-auto bg-slate-100 px-4 py-2 rounded-full text-sm font-bold text-slate-900">
                {matchHistory.length} Matches
              </span>
            </div>
            
            <div className="space-y-3">
              {matchHistory.map((match, idx) => {
                const isWinner = match.winner === playerInfo.name
                const opponent = match.player1 === playerInfo.name ? match.player2 : match.player1
                const playerScore = match.player1 === playerInfo.name ? match.score1 : match.score2
                const opponentScore = match.player1 === playerInfo.name ? match.score2 : match.score1

                return (
                  <div
                    key={`${match.tournament_id}-${match.match_id}-${idx}`}
                    className={`p-5 rounded-lg border-l-4 shadow-sm transition-all ${
                      isWinner
                        ? 'bg-green-50 border-l-green-500 border border-green-200'
                        : 'bg-slate-50 border-l-red-500 border border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 text-lg">{opponent}</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">Match #{match.match_id}</p>
                      </div>
                      <div className={`text-right font-mono ${isWinner ? 'text-green-700' : 'text-red-700'}`}>
                        <p className="text-3xl font-black">{playerScore}:{opponentScore}</p>
                        <p className="text-xs font-bold uppercase tracking-wide mt-1">
                          {isWinner ? '✓ Gewonnen' : '✗ Verloren'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {playerInfo && matchHistory.length === 0 && !nextMatch && (
          <div className="text-center py-16 px-6 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
            <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Keine Matches vorhanden</p>
            <p className="text-slate-500 text-sm mt-1">Dieser Spieler hat noch keine Matches gespielt</p>
          </div>
        )}
      </main>
    </div>
  )
}
