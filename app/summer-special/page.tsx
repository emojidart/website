"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import Image from "@/components/image"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { supabase } from "@/lib/supabase"
import {
  Activity,
  Award,
  Calendar,
  CheckCircle,
  ChevronDown,
  Crown,
  Gift,
  Loader2,
  Medal,
  Sparkles,
  Star,
  Target,
  Trophy,
  TrendingUp,
  Users,
} from "lucide-react"

interface SummerStanding {
  player_name: string
  total_points: number
  placement_points: number
  legs_won: number
  legs_lost: number
  tournaments_played: number
  total_matches_played: number
  total_matches_won: number
  total_matches_lost: number
  manual_bonus_points: number
  winner_side_bonus_points: number
  participation_bonus_points: number
  profile_picture_url?: string
}

interface TournamentEntry {
  id: string
  tournament_id: string
  tournament_name: string
  tournament_type: string
  tournament_date: string
  player_name: string
  placement: number
  legs_won: number
  legs_lost: number
  matches_played: number
  matches_won: number
  matches_lost: number
  placement_points: number
  bonus_points: number
  winner_side_bonus: boolean
  form: string | null
}

interface Tournament {
  tournament_id: string
  tournament_name: string
  tournament_type: string
  tournament_date: string
  rankings: TournamentEntry[]
}

interface Settings {
  season_name: string
  total_tournament_days: number
  entry_fee_per_tournament: number
  one_time_participation_fee: number
  final_day_fee: number
  winner_side_bonus_points: number
}

const DEFAULT_SETTINGS: Settings = {
  season_name: "EMD Summer Special 2026",
  total_tournament_days: 13,
  entry_fee_per_tournament: 5,
  one_time_participation_fee: 10,
  final_day_fee: 5,
  winner_side_bonus_points: 5,
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } },
}

function getPositionBadge(position: number) {
  const base = "inline-flex items-center justify-center w-9 h-9 rounded-full font-black text-sm"
  if (position === 1) return `${base} bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg`
  if (position === 2) return `${base} bg-gradient-to-r from-gray-300 to-gray-500 text-white shadow-lg`
  if (position === 3) return `${base} bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-lg`
  return `${base} bg-gray-100 text-gray-700 border border-gray-200`
}

function getPositionIcon(position: number) {
  if (position === 1) return <Crown className="h-5 w-5 text-yellow-500" />
  if (position === 2) return <Medal className="h-5 w-5 text-gray-400" />
  if (position === 3) return <Award className="h-5 w-5 text-amber-600" />
  return null
}

function getPlacementIcon(placement: number) {
  if (placement === 1) return "🥇"
  if (placement === 2) return "🥈"
  if (placement === 3) return "🥉"
  return String(placement)
}

function getParticipationBonus(tournamentsPlayed: number) {
  if (tournamentsPlayed >= 13) return 12
  if (tournamentsPlayed >= 11) return 8
  if (tournamentsPlayed >= 8) return 5
  if (tournamentsPlayed >= 5) return 2
  return 0
}

function getNextBonusText(tournamentsPlayed: number) {
  if (tournamentsPlayed >= 13) return "Maximaler Teilnahmebonus erreicht"
  if (tournamentsPlayed >= 11) return `Noch ${13 - tournamentsPlayed} bis +12 Bonus`
  if (tournamentsPlayed >= 8) return `Noch ${11 - tournamentsPlayed} bis +8 Bonus`
  if (tournamentsPlayed >= 5) return `Noch ${8 - tournamentsPlayed} bis +5 Bonus`
  return `Noch ${5 - tournamentsPlayed} bis +2 Bonus`
}

function PlayerCard({ player, position, onClick }: { player: SummerStanding; position: number; onClick: () => void }) {
  const winRate = player.total_matches_played > 0 ? ((player.total_matches_won / player.total_matches_played) * 100).toFixed(1) : "0.0"
  const legDiff = player.legs_won - player.legs_lost

  return (
    <motion.div
      variants={itemVariants}
      onClick={onClick}
      className={`rounded-2xl border bg-white p-4 shadow-sm cursor-pointer hover:shadow-lg transition-all ${
        position <= 3 ? "border-yellow-200 bg-gradient-to-r from-yellow-50 to-white" : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={getPositionBadge(position)}>{position}</div>
          {getPositionIcon(position)}
          <div className="relative h-12 w-12 rounded-2xl overflow-hidden border border-gray-200 bg-orange-50 flex-shrink-0">
            <Image
              src={player.profile_picture_url || "/placeholder-user.jpg"}
              alt={`Profilbild von ${player.player_name}`}
              width={48}
              height={48}
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0">
            <div className="font-black text-gray-900 truncate">{player.player_name}</div>
            <div className="text-xs font-bold text-orange-700">{getNextBonusText(player.tournaments_played)}</div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="flex items-center justify-end gap-1 text-2xl font-black text-orange-700">
            {player.total_points}
            <Trophy className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-[11px] font-bold text-gray-500">Punkte</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-2">
          <div className="text-[10px] font-bold text-blue-700">Platzierung</div>
          <div className="text-sm font-black text-blue-900">{player.placement_points}</div>
        </div>
        <div className="rounded-xl bg-green-50 border border-green-100 p-2">
          <div className="text-[10px] font-bold text-green-700">Legs W</div>
          <div className="text-sm font-black text-green-900">{player.legs_won}</div>
        </div>
        <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-2">
          <div className="text-[10px] font-bold text-yellow-700">Bonus</div>
          <div className="text-sm font-black text-yellow-900">
            {player.manual_bonus_points + player.winner_side_bonus_points + player.participation_bonus_points}
          </div>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-2">
          <div className="text-[10px] font-bold text-gray-700">Antritte</div>
          <div className="text-sm font-black text-gray-900">{player.tournaments_played}/13</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-purple-50 border border-purple-100 p-2">
          <div className="text-[10px] font-bold text-purple-700">Matches</div>
          <div className="text-sm font-black text-purple-900">{player.total_matches_played}</div>
        </div>
        <div className="rounded-xl bg-teal-50 border border-teal-100 p-2">
          <div className="text-[10px] font-bold text-teal-700">Siegrate</div>
          <div className="text-sm font-black text-teal-900">{winRate}%</div>
        </div>
        <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-2">
          <div className="text-[10px] font-bold text-indigo-700">Leg-Diff</div>
          <div className={`text-sm font-black ${legDiff >= 0 ? "text-green-800" : "text-red-800"}`}>
            {legDiff >= 0 ? "+" : ""}{legDiff}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div variants={itemVariants} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full p-4 text-left flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-black text-gray-900 truncate">{tournament.tournament_name}</div>
          <div className="text-xs font-bold text-gray-500">
            {new Date(tournament.tournament_date).toLocaleDateString("de-DE")} · {tournament.tournament_type}
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-orange-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 p-3 space-y-2">
          {tournament.rankings.map((entry) => {
            const total = entry.placement_points + entry.legs_won + entry.bonus_points + (entry.winner_side_bonus ? 5 : 0)
            return (
              <div key={entry.id} className="rounded-xl border border-orange-100 bg-orange-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-white border border-orange-200 flex items-center justify-center font-black">
                      {getPlacementIcon(entry.placement)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-gray-900 truncate">{entry.player_name}</div>
                      <div className="text-[11px] font-bold text-gray-500">
                        {entry.legs_won}:{entry.legs_lost} Legs · {entry.matches_won}/{entry.matches_played} Siege
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-black text-orange-700">{total}</div>
                    <div className="text-[10px] font-bold text-gray-500">Punkte</div>
                  </div>
                </div>
                {entry.winner_side_bonus && (
                  <div className="mt-2 text-right text-xs font-black text-yellow-700">+5 Gewinner-Seite</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

export default function SummerSpecialPage() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [standings, setStandings] = useState<SummerStanding[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      await Promise.all([fetchSettings(), fetchStandings(), fetchTournaments()])
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    const { data, error } = await supabase.from("summer_special_settings").select("*").eq("id", 1).single()
    if (error) {
      console.error("Summer settings error:", error)
      return
    }
    if (data) {
      setSettings({
        season_name: data.season_name || DEFAULT_SETTINGS.season_name,
        total_tournament_days: data.total_tournament_days || 13,
        entry_fee_per_tournament: Number(data.entry_fee_per_tournament ?? 5),
        one_time_participation_fee: Number(data.one_time_participation_fee ?? 10),
        final_day_fee: Number(data.final_day_fee ?? 5),
        winner_side_bonus_points: Number(data.winner_side_bonus_points ?? 5),
      })
    }
  }

  const fetchStandings = async () => {
    const { data, error } = await supabase.from("summer_special_total_standings").select("*")
    if (error) {
      console.error("Summer standings error:", error)
      setStandings([])
      return
    }

    const { data: profiles } = await supabase.from("spieldatenbank").select("name, profile_picture_url")
    const pictureMap = new Map<string, string>()
    profiles?.forEach((p: any) => {
      if (p.name && p.profile_picture_url) pictureMap.set(String(p.name).toLowerCase(), p.profile_picture_url)
    })

    const mapped = (data || []).map((row: any) => ({
      player_name: row.player_name,
      total_points: Number(row.total_points || 0),
      placement_points: Number(row.placement_points || 0),
      legs_won: Number(row.legs_won || 0),
      legs_lost: Number(row.legs_lost || 0),
      tournaments_played: Number(row.tournaments_played || 0),
      total_matches_played: Number(row.total_matches_played || 0),
      total_matches_won: Number(row.total_matches_won || 0),
      total_matches_lost: Number(row.total_matches_lost || 0),
      manual_bonus_points: Number(row.manual_bonus_points || 0),
      winner_side_bonus_points: Number(row.winner_side_bonus_points || 0),
      participation_bonus_points: Number(row.participation_bonus_points ?? getParticipationBonus(Number(row.tournaments_played || 0))),
      profile_picture_url: pictureMap.get(String(row.player_name).toLowerCase()),
    }))

    mapped.sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points
      if (b.legs_won !== a.legs_won) return b.legs_won - a.legs_won
      if (b.placement_points !== a.placement_points) return b.placement_points - a.placement_points
      return a.tournaments_played - b.tournaments_played
    })

    setStandings(mapped)
  }

  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from("summer_special_standings")
      .select("*")
      .order("tournament_date", { ascending: false })
      .order("placement", { ascending: true })

    if (error) {
      console.error("Summer tournaments error:", error)
      setTournaments([])
      return
    }

    const map = new Map<string, Tournament>()
    ;(data || []).forEach((entry: TournamentEntry) => {
      if (!map.has(entry.tournament_id)) {
        map.set(entry.tournament_id, {
          tournament_id: entry.tournament_id,
          tournament_name: entry.tournament_name,
          tournament_type: entry.tournament_type,
          tournament_date: entry.tournament_date,
          rankings: [],
        })
      }
      map.get(entry.tournament_id)!.rankings.push(entry)
    })

    const result = Array.from(map.values()).map((t) => ({
      ...t,
      rankings: t.rankings.sort((a, b) => a.placement - b.placement),
    }))

    setTournaments(result)
  }

  const filteredStandings = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return standings
    return standings.filter((p) => p.player_name.toLowerCase().includes(q))
  }, [query, standings])

  const selected = selectedPlayer ? standings.find((p) => p.player_name === selectedPlayer) : null
  const playerTournaments = selected
    ? tournaments
        .map((t) => ({ ...t, playerEntry: t.rankings.find((r) => r.player_name === selected.player_name) }))
        .filter((t: any) => t.playerEntry)
    : []

  const totalParticipants = standings.length
  const totalAppearances = standings.reduce((sum, p) => sum + p.tournaments_played, 0)
  const completedTournaments = tournaments.length
  const remainingTournaments = Math.max(0, settings.total_tournament_days - completedTournaments)
  const oneTimeFees = totalParticipants * settings.one_time_participation_fee
  const tournamentFees = totalAppearances * settings.entry_fee_per_tournament
  const finalDayFees = totalParticipants * settings.final_day_fee
  const totalPrizePool = oneTimeFees + tournamentFees + finalDayFees

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4 pb-20 pt-12">
          <div className="flex flex-col items-center gap-5 rounded-3xl bg-white shadow-2xl px-10 py-10 border border-gray-200">
            <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">Summer Special wird geladen</p>
              <p className="text-sm text-gray-500 mt-1">Bitte kurz warten…</p>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </main>
    )
  }

  if (selected) {
    const winRate = selected.total_matches_played > 0 ? ((selected.total_matches_won / selected.total_matches_played) * 100).toFixed(1) : "0.0"
    const legDiff = selected.legs_won - selected.legs_lost

    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
        <Header />
        <main className="pt-12 sm:pt-14">
          <motion.div className="mx-auto w-full px-4 py-6 max-w-2xl lg:max-w-screen-xl space-y-6" variants={containerVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants}>
              <button onClick={() => setSelectedPlayer(null)} type="button" className="inline-flex items-center gap-2 text-orange-700 hover:text-orange-800 font-black">
                <ChevronDown className="h-5 w-5 rotate-90" /> Zurück zur Tabelle
              </button>
            </motion.div>

            <motion.div variants={itemVariants} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-yellow-500" />
              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-gray-200 bg-orange-50 flex-shrink-0">
                    <Image src={selected.profile_picture_url || "/placeholder-user.jpg"} alt={selected.player_name} width={64} height={64} className="object-cover" unoptimized />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 truncate">{selected.player_name}</h1>
                    <p className="text-sm font-bold text-gray-600">Summer Special Detailansicht</p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-200 px-4 py-2 text-sm font-black text-orange-700">
                      <Trophy className="h-4 w-4" /> {selected.total_points} Punkte
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl border border-gray-200 bg-white p-3"><div className="text-[11px] font-bold text-gray-600">Antritte</div><div className="text-xl font-black">{selected.tournaments_played}/13</div></div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3"><div className="text-[11px] font-bold text-gray-600">Siegrate</div><div className="text-xl font-black text-green-700">{winRate}%</div></div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3"><div className="text-[11px] font-bold text-gray-600">Leg-Diff</div><div className={`text-xl font-black ${legDiff >= 0 ? "text-green-700" : "text-red-700"}`}>{legDiff >= 0 ? "+" : ""}{legDiff}</div></div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3"><div className="text-[11px] font-bold text-gray-600">Teilnahmebonus</div><div className="text-xl font-black text-yellow-700">+{selected.participation_bonus_points}</div></div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-yellow-500" />
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                <Target className="h-5 w-5 text-orange-600" />
                <div><h2 className="font-black text-gray-900">Punkte-Aufteilung</h2><p className="text-xs font-bold text-gray-500">Platzierung, Legs und Bonus</p></div>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="text-xs font-bold text-blue-700">Platzierung</div><div className="text-2xl font-black text-blue-900">{selected.placement_points}</div></div>
                <div className="rounded-2xl border border-green-100 bg-green-50 p-4"><div className="text-xs font-bold text-green-700">Legs gewonnen</div><div className="text-2xl font-black text-green-900">{selected.legs_won}</div></div>
                <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-4"><div className="text-xs font-bold text-yellow-700">Gewinner-Seite</div><div className="text-2xl font-black text-yellow-900">+{selected.winner_side_bonus_points}</div></div>
                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4"><div className="text-xs font-bold text-orange-700">Teilnahmebonus</div><div className="text-2xl font-black text-orange-900">+{selected.participation_bonus_points}</div></div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-3">
              <h2 className="font-black text-gray-900 flex items-center gap-2"><Calendar className="h-5 w-5 text-orange-600" /> Turnier-Historie</h2>
              {playerTournaments.length === 0 ? <div className="rounded-2xl bg-white border border-gray-200 p-8 text-center text-gray-500">Keine Teilnahmen gefunden</div> : playerTournaments.map((t: any) => <TournamentCard key={t.tournament_id} tournament={t} />)}
            </motion.div>
          </motion.div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
      <Header />
      <main className="pt-12 sm:pt-14">
        <motion.div className="mx-auto w-full px-4 py-6 max-w-2xl lg:max-w-screen-xl space-y-6" variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-yellow-500" />
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0"><Trophy className="w-5 h-5 text-orange-600" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-2xl font-black text-gray-900">EMD - SUMMER SPECIAL</h1>
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-black text-orange-700"><Crown className="w-3.5 h-3.5" /> 2026</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1"><span className="font-semibold">Gesamtwertung</span> · keine Qualifikation nötig</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-center">
                <h2 className="text-base sm:text-lg font-black text-gray-900">AKTUELLER POT</h2>
                <div className="mt-2 flex items-baseline justify-center gap-2">
                  <span className="text-2xl text-gray-600 font-bold">€</span>
                  <span className="text-5xl sm:text-6xl font-black text-orange-700">{totalPrizePool.toFixed(2)}</span>
                </div>
                <p className="mt-3 text-xs sm:text-sm font-bold text-gray-700">
                  €{settings.entry_fee_per_tournament.toFixed(2)} je Teilnahme + €{settings.one_time_participation_fee.toFixed(2)} einmalig je Teilnehmer + €{settings.final_day_fee.toFixed(2)} Finaltag
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-orange-600" /><span className="text-xs font-bold text-gray-600">Teilnehmer</span></div><div className="text-2xl font-black mt-1">{totalParticipants}</div></div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"><div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-blue-600" /><span className="text-xs font-bold text-gray-600">Turniertage</span></div><div className="text-2xl font-black mt-1">{completedTournaments}/{settings.total_tournament_days}</div></div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-green-600" /><span className="text-xs font-bold text-gray-600">Antritte</span></div><div className="text-2xl font-black mt-1">{totalAppearances}</div></div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-purple-600" /><span className="text-xs font-bold text-gray-600">Verbleibend</span></div><div className="text-2xl font-black mt-1">{remainingTournaments}</div></div>
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start gap-3">
              <Gift className="h-5 w-5 text-yellow-700 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-black text-gray-900">Bonus-Regeln</h2>
                <p className="text-sm font-bold text-gray-700 mt-1">5 Antritte +2 · 8 Antritte +5 · 11 Antritte +8 · alle 13 gespielt +12 · Gewinner-Seite Platz 1 zusätzlich +5.</p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Spieler suchen…" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-400" />
          </motion.div>

          <motion.div variants={containerVariants} className="space-y-3">
            {filteredStandings.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500 font-bold">Noch keine Summer-Special-Daten vorhanden.</div>
            ) : (
              filteredStandings.map((player, index) => <PlayerCard key={player.player_name} player={player} position={index + 1} onClick={() => setSelectedPlayer(player.player_name)} />)
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            <h2 className="font-black text-gray-900 flex items-center gap-2"><Sparkles className="h-5 w-5 text-orange-600" /> Turnier-Historie</h2>
            {tournaments.map((t) => <TournamentCard key={t.tournament_id} tournament={t} />)}
          </motion.div>
        </motion.div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
