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
  ChevronDown,
  Crown,
  Loader2,
  Medal,
  Search,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react"

type MembersCupResultRow = {
  id: string
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

type PlayerStanding = {
  player_id: string
  player_name: string
  total_points: number
  tournaments_played: number
  wins: number
  podiums: number
  best_placement: number
  average_points: number
  profile_picture_url?: string
  results: MembersCupResultRow[]
}

type TournamentHistory = {
  round_robin_id: string
  tournament_name: string
  created_at: string
  results: MembersCupResultRow[]
}

const POINT_SYSTEM = [
  { place: "1. Platz", points: 100, badge: "🥇" },
  { place: "2. Platz", points: 95, badge: "🥈" },
  { place: "3. Platz", points: 85, badge: "🥉" },
  { place: "4. Platz", points: 70, badge: "4" },
  { place: "alle 5. Platzierten", points: 50, badge: "5" },
  { place: "alle 7. Platzierten", points: 35, badge: "7" },
  { place: "alle 9. Platzierten", points: 25, badge: "9" },
  { place: "alle 13. Platzierten", points: 15, badge: "13" },
  { place: "alle 17. Platzierten", points: 10, badge: "17" },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } },
}

function shortName(name: string) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return parts[0] || "—"
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`
}

function formatDate(dateString?: string) {
  if (!dateString) return "—"
  const dt = new Date(dateString)
  if (Number.isNaN(dt.getTime())) return "—"
  return dt.toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function getPlacementIcon(placement: number) {
  if (placement === 1) return "🥇"
  if (placement === 2) return "🥈"
  if (placement === 3) return "🥉"
  return String(placement)
}

function getRankBadgeClass(rank: number) {
  const base = "inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-sm shrink-0"
  if (rank === 1) return `${base} bg-gradient-to-br from-yellow-300 to-yellow-600 text-white shadow-lg shadow-yellow-200`
  if (rank === 2) return `${base} bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-lg shadow-gray-200`
  if (rank === 3) return `${base} bg-gradient-to-br from-amber-400 to-amber-700 text-white shadow-lg shadow-amber-200`
  return `${base} bg-white text-gray-700 border border-gray-200`
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
  return null
}

function PlayerRow({ player, rank, onClick }: { player: PlayerStanding; rank: number; onClick: () => void }) {
  return (
    <motion.button
      variants={itemVariants}
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl ${
        rank <= 3 ? "border-yellow-200 bg-gradient-to-r from-yellow-50 to-white" : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={getRankBadgeClass(rank)}>{rank}</div>
          {getRankIcon(rank)}

          <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-gray-200 bg-orange-50 shrink-0">
            <Image
              src={player.profile_picture_url || "/placeholder-user.jpg"}
              alt={player.player_name}
              width={48}
              height={48}
              className="object-cover"
              unoptimized
            />
          </div>

          <div className="min-w-0">
            <div className="truncate font-black text-gray-900">{player.player_name}</div>
            <div className="mt-0.5 text-xs font-bold text-gray-500">
              {player.tournaments_played} Antritt{player.tournaments_played === 1 ? "" : "e"} · Ø {player.average_points.toFixed(1)} Punkte
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1 text-2xl font-black text-orange-700">
            {player.total_points}
            <Trophy className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-[11px] font-bold text-gray-500">Punkte</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 text-center">
        <div className="rounded-xl border border-green-100 bg-green-50 p-2">
          <div className="text-[10px] font-bold text-green-700">Siege</div>
          <div className="text-sm font-black text-green-900">{player.wins}</div>
        </div>
        <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-2">
          <div className="text-[10px] font-bold text-yellow-700">Podium</div>
          <div className="text-sm font-black text-yellow-900">{player.podiums}</div>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-2">
          <div className="text-[10px] font-bold text-blue-700">Bestplatz</div>
          <div className="text-sm font-black text-blue-900">{player.best_placement}.</div>
        </div>
        <div className="rounded-xl border border-purple-100 bg-purple-50 p-2">
          <div className="text-[10px] font-bold text-purple-700">Schnitt</div>
          <div className="text-sm font-black text-purple-900">{player.average_points.toFixed(1)}</div>
        </div>
      </div>
    </motion.button>
  )
}

function PodiumCard({ player, rank }: { player?: PlayerStanding; rank: number }) {
  const title = rank === 1 ? "Champion" : rank === 2 ? "Verfolger" : "Podium"
  const gradient = rank === 1 ? "from-yellow-400 to-orange-500" : rank === 2 ? "from-gray-300 to-gray-500" : "from-amber-400 to-orange-700"

  return (
    <motion.div
      variants={itemVariants}
      className={`relative overflow-hidden rounded-3xl border border-white bg-white p-5 shadow-xl ${rank === 1 ? "lg:scale-105" : ""}`}
    >
      <div className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${gradient}`} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wide text-gray-500">{title}</div>
          <div className="mt-1 flex items-center gap-2 text-lg font-black text-gray-900">
            {rank === 1 ? <Crown className="h-5 w-5 text-yellow-500" /> : rank === 2 ? <Medal className="h-5 w-5 text-gray-400" /> : <Award className="h-5 w-5 text-amber-600" />}
            Platz {rank}
          </div>
        </div>
        <div className={getRankBadgeClass(rank)}>{rank}</div>
      </div>

      {player ? (
        <div className="mt-5 flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-3xl border border-gray-200 bg-orange-50 shrink-0">
            <Image
              src={player.profile_picture_url || "/placeholder-user.jpg"}
              alt={player.player_name}
              width={64}
              height={64}
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xl font-black text-gray-900">{player.player_name}</div>
            <div className="mt-1 text-sm font-bold text-gray-500">
              {player.tournaments_played} Antritte · {player.wins} Siege
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-black text-orange-700">
              <Trophy className="h-4 w-4" /> {player.total_points} Punkte
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-sm font-bold text-gray-500">
          Noch kein Spieler vorhanden
        </div>
      )}
    </motion.div>
  )
}

function TournamentCard({ tournament }: { tournament: TournamentHistory }) {
  const [open, setOpen] = useState(false)
  const teamWinners = tournament.results.filter((r) => r.placement === 1)
  const winnerText = teamWinners[0]?.team_name || "Noch kein Sieger"

  return (
    <motion.div variants={itemVariants} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <div className="truncate font-black text-gray-900">{tournament.tournament_name}</div>
          <div className="mt-1 text-xs font-bold text-gray-500">
            {formatDate(tournament.created_at)} · Siegerteam: {winnerText}
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-orange-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="space-y-2 border-t border-gray-100 p-3">
          {tournament.results
            .slice()
            .sort((a, b) => a.placement - b.placement || a.player_name.localeCompare(b.player_name))
            .map((entry) => (
              <div key={entry.id} className="rounded-xl border border-orange-100 bg-orange-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-200 bg-white font-black">
                      {getPlacementIcon(entry.placement)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-black text-gray-900">{entry.player_name}</div>
                      <div className="truncate text-[11px] font-bold text-gray-500">Team: {entry.team_name}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-black text-orange-700">{entry.points}</div>
                    <div className="text-[10px] font-bold text-gray-500">Punkte</div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      ) : null}
    </motion.div>
  )
}

function DetailView({ player, tournaments, onClose }: { player: PlayerStanding; tournaments: TournamentHistory[]; onClose: () => void }) {
  const playerTournaments = tournaments
    .map((tournament) => ({
      ...tournament,
      playerEntry: tournament.results.find((result) => result.player_id === player.player_id),
    }))
    .filter((item) => item.playerEntry)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
      <Header />
      <main className="pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full max-w-2xl lg:max-w-screen-xl space-y-6 px-4 py-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <button type="button" onClick={onClose} className="inline-flex items-center gap-2 font-black text-orange-700 hover:text-orange-800">
              <X className="h-5 w-5" /> Detail schließen
            </button>
          </motion.div>

          <motion.div variants={itemVariants} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-yellow-500" />
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-3xl border border-gray-200 bg-orange-50 shrink-0">
                  <Image
                    src={player.profile_picture_url || "/placeholder-user.jpg"}
                    alt={player.player_name}
                    width={80}
                    height={80}
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-2xl font-black text-gray-900">{player.player_name}</h1>
                  <p className="mt-1 text-sm font-bold text-gray-600">Members Champion Cup Detailansicht</p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-black text-orange-700">
                    <Trophy className="h-4 w-4" /> {player.total_points} Punkte
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5 text-center">
                <div className="rounded-2xl border border-gray-200 bg-white p-3">
                  <div className="text-[11px] font-bold text-gray-600">Antritte</div>
                  <div className="text-xl font-black text-gray-900">{player.tournaments_played}</div>
                </div>
                <div className="rounded-2xl border border-green-100 bg-green-50 p-3">
                  <div className="text-[11px] font-bold text-green-700">Siege</div>
                  <div className="text-xl font-black text-green-900">{player.wins}</div>
                </div>
                <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-3">
                  <div className="text-[11px] font-bold text-yellow-700">Podium</div>
                  <div className="text-xl font-black text-yellow-900">{player.podiums}</div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                  <div className="text-[11px] font-bold text-blue-700">Bestplatz</div>
                  <div className="text-xl font-black text-blue-900">{player.best_placement}.</div>
                </div>
                <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3 col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-bold text-purple-700">Schnitt</div>
                  <div className="text-xl font-black text-purple-900">{player.average_points.toFixed(1)}</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            <h2 className="flex items-center gap-2 font-black text-gray-900">
              <Calendar className="h-5 w-5 text-orange-600" /> Spieler-Historie
            </h2>
            {playerTournaments.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center font-bold text-gray-500">Keine Teilnahmen gefunden.</div>
            ) : (
              playerTournaments.map((tournament: any) => (
                <div key={tournament.round_robin_id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-black text-gray-900">{tournament.tournament_name}</div>
                      <div className="mt-1 text-xs font-bold text-gray-500">{formatDate(tournament.created_at)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-black text-orange-700">{tournament.playerEntry.points}</div>
                      <div className="text-[10px] font-bold text-gray-500">Platz {tournament.playerEntry.placement}</div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-bold text-gray-700">
                    Team: {tournament.playerEntry.team_name}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        </motion.div>
      </main>
      <MobileBottomNav />
    </div>
  )
}

export default function MembersChampionCupGesamtwertungPage() {
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<MembersCupResultRow[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [profilePictures, setProfilePictures] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("members_cup_results")
        .select("id,round_robin_id,tournament_name,team_id,team_name,player_id,player_name,placement,points,created_at")
        .order("created_at", { ascending: true })
        .order("placement", { ascending: true })

      if (error) throw error

      const mapped = ((data || []) as any[]).map((row) => ({
        id: String(row.id),
        round_robin_id: String(row.round_robin_id),
        tournament_name: String(row.tournament_name || "Members Champion Cup"),
        team_id: String(row.team_id || ""),
        team_name: String(row.team_name || ""),
        player_id: String(row.player_id || ""),
        player_name: String(row.player_name || ""),
        placement: Number(row.placement || 0),
        points: Number(row.points || 0),
        created_at: String(row.created_at || ""),
      }))

      setResults(mapped)

      const { data: profiles } = await supabase.from("spieldatenbank").select("id,name,profile_picture_url")
      const picMap = new Map<string, string>()
      ;(profiles || []).forEach((profile: any) => {
        if (profile?.id && profile?.profile_picture_url) picMap.set(String(profile.id), String(profile.profile_picture_url))
        if (profile?.name && profile?.profile_picture_url) picMap.set(String(profile.name).toLowerCase(), String(profile.profile_picture_url))
      })
      setProfilePictures(picMap)
    } catch (error) {
      console.error("Members Cup Gesamtwertung error:", error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const standings = useMemo(() => {
    const map = new Map<string, PlayerStanding>()

    results.forEach((row) => {
      const key = row.player_id || row.player_name
      const existing = map.get(key)
      const profile_picture_url = profilePictures.get(row.player_id) || profilePictures.get(row.player_name.toLowerCase())

      if (!existing) {
        map.set(key, {
          player_id: row.player_id,
          player_name: row.player_name,
          total_points: row.points,
          tournaments_played: 1,
          wins: row.placement === 1 ? 1 : 0,
          podiums: row.placement <= 3 ? 1 : 0,
          best_placement: row.placement,
          average_points: row.points,
          profile_picture_url,
          results: [row],
        })
        return
      }

      existing.total_points += row.points
      existing.tournaments_played += 1
      existing.wins += row.placement === 1 ? 1 : 0
      existing.podiums += row.placement <= 3 ? 1 : 0
      existing.best_placement = Math.min(existing.best_placement, row.placement)
      existing.average_points = existing.total_points / existing.tournaments_played
      existing.results.push(row)
      if (!existing.profile_picture_url && profile_picture_url) existing.profile_picture_url = profile_picture_url
    })

    return Array.from(map.values()).sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points
      if (b.wins !== a.wins) return b.wins - a.wins
      if (b.podiums !== a.podiums) return b.podiums - a.podiums
      if (a.best_placement !== b.best_placement) return a.best_placement - b.best_placement
      return a.player_name.localeCompare(b.player_name)
    })
  }, [results, profilePictures])

  const tournaments = useMemo(() => {
    const map = new Map<string, TournamentHistory>()

    results.forEach((row) => {
      if (!map.has(row.round_robin_id)) {
        map.set(row.round_robin_id, {
          round_robin_id: row.round_robin_id,
          tournament_name: row.tournament_name,
          created_at: row.created_at,
          results: [],
        })
      }
      map.get(row.round_robin_id)!.results.push(row)
    })

    return Array.from(map.values())
      .map((tournament) => ({
        ...tournament,
        results: tournament.results.sort((a, b) => a.placement - b.placement || a.player_name.localeCompare(b.player_name)),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [results])

  const filteredStandings = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return standings
    return standings.filter((player) => player.player_name.toLowerCase().includes(q))
  }, [standings, query])

  const selectedPlayer = selectedPlayerId ? standings.find((player) => player.player_id === selectedPlayerId) : null

  const totalPlayers = standings.length
  const completedTournaments = tournaments.length
  const totalPoints = standings.reduce((sum, player) => sum + player.total_points, 0)
  const totalAppearances = standings.reduce((sum, player) => sum + player.tournaments_played, 0)
  const topThree = standings.slice(0, 3)

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4 pb-20 pt-12">
          <div className="flex flex-col items-center gap-5 rounded-3xl bg-white shadow-2xl px-10 py-10 border border-gray-200">
            <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">Members Champion Cup wird geladen</p>
              <p className="text-sm text-gray-500 mt-1">Bitte kurz warten…</p>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </main>
    )
  }

  if (selectedPlayer) {
    return <DetailView player={selectedPlayer} tournaments={tournaments} onClose={() => setSelectedPlayerId(null)} />
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
      <Header />

      <main className="pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full max-w-2xl lg:max-w-screen-xl space-y-6 px-4 py-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-sm">
            <div className="h-2 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-600" />
            <div className="relative overflow-hidden p-5 sm:p-7">
              <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-orange-100 blur-2xl" />
              <div className="absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-yellow-100 blur-2xl" />

              <div className="relative flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 shrink-0">
                    <Crown className="h-7 w-7 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-gray-900">EMD MEMBERS CHAMPION CUP</h1>
                      <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                        <Sparkles className="h-3.5 w-3.5" /> 2026/27
                      </span>
                    </div>
                    <p className="mt-2 text-sm sm:text-base font-bold text-gray-600">
                      Offizielle Gesamtwertung · Doppel wird gespielt · Einzelwertung zählt
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchAll}
                  className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-black text-orange-700 hover:bg-orange-100"
                >
                  Aktualisieren
                </button>
              </div>

              <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-600"><Users className="h-4 w-4 text-orange-600" /> Spieler</div>
                  <div className="mt-1 text-3xl font-black text-gray-900">{totalPlayers}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-600"><Calendar className="h-4 w-4 text-blue-600" /> Spieltage</div>
                  <div className="mt-1 text-3xl font-black text-gray-900">{completedTournaments}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-600"><Activity className="h-4 w-4 text-green-600" /> Antritte</div>
                  <div className="mt-1 text-3xl font-black text-gray-900">{totalAppearances}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-600"><Target className="h-4 w-4 text-purple-600" /> Punkte</div>
                  <div className="mt-1 text-3xl font-black text-gray-900">{totalPoints}</div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4 lg:grid-cols-3">
            <PodiumCard player={topThree[1]} rank={2} />
            <PodiumCard player={topThree[0]} rank={1} />
            <PodiumCard player={topThree[2]} rank={3} />
          </div>

          <motion.div variants={itemVariants} className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start gap-3">
              <Star className="mt-0.5 h-5 w-5 text-yellow-700 shrink-0" />
              <div>
                <h2 className="font-black text-gray-900">Punktesystem</h2>
                <p className="mt-1 text-sm font-bold text-gray-700">
                  Beide Doppelspieler erhalten jeweils die vollen Platzierungspunkte für ihr Team.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-9">
                  {POINT_SYSTEM.map((item) => (
                    <div key={item.place} className="rounded-2xl border border-yellow-200 bg-white p-3 text-center shadow-sm">
                      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-50 font-black text-yellow-800">
                        {item.badge}
                      </div>
                      <div className="mt-2 text-[10px] font-black text-gray-500 min-h-[24px]">{item.place}</div>
                      <div className="mt-1 text-lg font-black text-orange-700">{item.points}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Spieler suchen…"
                className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-gray-400"
              />
            </div>
          </motion.div>

          <motion.div variants={containerVariants} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-black text-gray-900">
                <Trophy className="h-5 w-5 text-orange-600" /> Gesamtwertung
              </h2>
              <div className="text-xs font-bold text-gray-500">{filteredStandings.length} Spieler</div>
            </div>

            {filteredStandings.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center font-bold text-gray-500">
                Noch keine Members-Cup-Daten vorhanden.
              </div>
            ) : (
              filteredStandings.map((player, index) => (
                <PlayerRow
                  key={player.player_id || player.player_name}
                  player={player}
                  rank={index + 1}
                  onClick={() => setSelectedPlayerId(player.player_id)}
                />
              ))
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            <h2 className="flex items-center gap-2 font-black text-gray-900">
              <Calendar className="h-5 w-5 text-orange-600" /> Turnier-Historie
            </h2>
            {tournaments.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center font-bold text-gray-500">
                Noch keine gespeicherten Turniere vorhanden.
              </div>
            ) : (
              tournaments.map((tournament) => <TournamentCard key={tournament.round_robin_id} tournament={tournament} />)
            )}
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
