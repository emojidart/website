"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Target, Calendar, Users, Loader2 } from "lucide-react"
import { Header } from "@/components/header"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { PlayerStatisticsCardApp } from "@/components/player-statistics-card-app"
import { PointsInfoBox } from "@/components/points-info-box"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { TeamStandingsCardApp } from "@/components/team-standings-card-app"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const containerVariants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
}

const itemVariants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
}

type Season = {
  id: string
  name: string | null
  type: string | null
  year: number | null
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean | null
}


const formatDateDE = (d?: string | null) => {
  if (!d) return ""
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const formatDateDEShort = (d?: string | null) => {
  if (!d) return ""
  return new Date(d).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}



const formatTimeDE = (t?: string | null) => {
  if (!t) return ""
 
  return t.length >= 5 ? t.slice(0, 5) : t
}


const toMatchDateTime = (date?: string | null, time?: string | null) => {
  if (!date) return new Date(0)
  
  const safeTime = time ? time.slice(0, 8) : "00:00:00"
 
  return new Date(`${date}T${safeTime}`)
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const isTodayMatch = (match: any) => {
  const dt = toMatchDateTime(match.match_date, match.match_time)
  return isSameDay(dt, new Date())
}

const isTomorrowMatch = (match: any) => {
  const dt = toMatchDateTime(match.match_date, match.match_time)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return isSameDay(dt, tomorrow)
}


// ✅ Helfer: Spiel 
const isPastMatch = (match: any) => {
  const dt = toMatchDateTime(match.match_date, match.match_time)
  return dt.getTime() < new Date().getTime()
}

// ✅ Helfer: Spiel 
const isMissingResult = (match: any) => {
  const home = match.home_score
  const away = match.away_score

  
  if (home === null || home === undefined) return true
  if (away === null || away === undefined) return true

  
  if (Number(home) === 0 && Number(away) === 0) return true

  return false
}

export default function DartLeaguePage() {
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState([])
  const [opponentTeams, setOpponentTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [legStatistics, setLegStatistics] = useState([])
  const [loading, setLoading] = useState(true)
  const [dartTypeFilter, setDartTypeFilter] = useState<"gesamt" | "edart" | "steeldart">("gesamt")
  const [playersPerPage, setPlayersPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // ✅ Saison-Auswahl
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("")

  useEffect(() => {
    const loadData = async () => {
      try {
        // ✅ Seasons laden (für Dropdown)
const { data: seasonsData, error: seasonsError } = await supabase
  .from("seasons")
  .select("id, name, type, year, start_date, end_date, is_active")
  .order("start_date", { ascending: false })

if (seasonsError) {
  console.error("Error fetching seasons:", seasonsError)
  return
}

const seasonList = (seasonsData || []) as Season[]
setSeasons(seasonList)


const resolvedSeasonId =
  selectedSeasonId || seasonList.find((s) => s.is_active)?.id || seasonList[0]?.id || ""


if (!selectedSeasonId && resolvedSeasonId) {
  setSelectedSeasonId(resolvedSeasonId)
}

        const { data: ownTeamsData, error: teamsError } = await supabase
          .from("teams")
          .select("*")
          .not("user_id", "is", null)
          .order("name")

        const { data: opponentTeamsData, error: opponentError } = await supabase
          .from("opponent_teams")
          .select("*")
          .order("name")

        if (teamsError) {
          console.error("Error fetching teams:", teamsError)
        } else {
          setTeams(ownTeamsData || [])
        }

        if (opponentError) {
          console.error("Error fetching opponent teams:", opponentError)
        } else {
          setOpponentTeams(opponentTeamsData || [])
        }

   let matchQuery = supabase
  .from("matches")
  .select(`
    id,
    match_date,
    match_time,
    original_date,
    status,
    home_score,
    away_score,
    dart_type,
    home_team_id,
    away_team_id,
    home_opponent_team_id,
    away_opponent_team_id,
    home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
    away_team:teams!matches_away_team_id_fkey(id, name, logo_url),
    season:seasons(id, name, type, year)
  `)
  .order("match_date", { ascending: true })
   
   
   
   
   
   

        if (dartTypeFilter !== "gesamt") {
          matchQuery = matchQuery.eq("dart_type", dartTypeFilter)
        }

        // ✅ Saison-Filter (matches.season_id -> seasons.id)
        if (resolvedSeasonId) {
  matchQuery = matchQuery.eq("season_id", resolvedSeasonId)
}

        const { data: matchesData, error: matchesError } = await matchQuery

        if (matchesError) {
          console.error("Error fetching matches:", matchesError)
        } else {
          const enrichedMatches =
            matchesData?.map((match) => {
              const homeOpponentTeam = match.home_opponent_team_id
                ? opponentTeamsData?.find((team) => team.id === match.home_opponent_team_id)
                : null
              const awayOpponentTeam = match.away_opponent_team_id
                ? opponentTeamsData?.find((team) => team.id === match.away_opponent_team_id)
                : null

              return {
                ...match,
                home_opponent_team: homeOpponentTeam,
                away_opponent_team: awayOpponentTeam,
              }
            }) || []

          setMatches(enrichedMatches)
        }

const { data: playersData, error: playersError } = await supabase
  .from("team_members")
  .select(`
    team_id,
    left_at,
    club_players!team_members_player_id_fkey (
      id,
      name,
      photo_url
    ),
    teams (
      id,
      name
    )
  `)
  .is("left_at", null)
  .order("team_id")

if (playersError) {
  console.error("Error fetching players:", playersError)
} else {
  const transformedPlayers =
    playersData
      ?.map((member: any) => ({
        id: member.club_players?.id,
        name: member.club_players?.name,
        photo_url: member.club_players?.photo_url,
        team_id: member.team_id,
        team_name: member.teams?.name,
      }))
      .filter((player) => player.id) || []

  setPlayers(transformedPlayers)
}

        let legStatsQuery = supabase.from("leg_statistics").select(`
            *,
            player:club_players!leg_statistics_player_id_fkey(name, photo_url),
            match:matches!inner(season_id)
          `)

        if (dartTypeFilter !== "gesamt") {
          legStatsQuery = legStatsQuery.eq("dart_type", dartTypeFilter)
        }

        
        if (resolvedSeasonId) {
  legStatsQuery = legStatsQuery.eq("match.season_id", resolvedSeasonId)
}

        const { data: legStatsData, error: legStatsError } = await legStatsQuery

        if (legStatsError) {
          console.error("Error fetching leg statistics:", legStatsError)
        } else {
          setLegStatistics(legStatsData || [])
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [dartTypeFilter, selectedSeasonId])

  const selectedSeasonLabel = useMemo(() => {
    const s = seasons.find((x) => x.id === selectedSeasonId)
    if (!s) return "Saison"
    
    const year = s.year ? ` ${s.year}` : ""
    const name = s.name || s.type || "Saison"
    return `${name}${year}`
  }, [seasons, selectedSeasonId])

  const calculateStandings = () => {
    const standings = {}

    teams.forEach((team) => {
      standings[team.id] = {
        team: team.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
        legsFor: 0,
        legsAgainst: 0,
        legsDifference: 0,
      }
    })

    matches.forEach((match) => {
      if (match.status === "completed") {
        const homeTeam = match.home_team || match.home_opponent_team
        const awayTeam = match.away_team || match.away_opponent_team

        if (homeTeam && awayTeam) {
          const homeId = match.home_team?.id
          const awayId = match.away_team?.id

          if (homeId && standings[homeId]) {
            standings[homeId].played++
            standings[homeId].legsFor += match.home_score || 0
            standings[homeId].legsAgainst += match.away_score || 0

            if ((match.home_score || 0) > (match.away_score || 0)) {
              standings[homeId].won++
              standings[homeId].points += 2
            } else if ((match.away_score || 0) > (match.home_score || 0)) {
              standings[homeId].lost++
            } else {
              standings[homeId].drawn++
              standings[homeId].points += 1
            }
          }

          if (awayId && standings[awayId]) {
            standings[awayId].played++
            standings[awayId].legsFor += match.away_score || 0
            standings[awayId].legsAgainst += match.home_score || 0

            if ((match.away_score || 0) > (match.home_score || 0)) {
              standings[awayId].won++
              standings[awayId].points += 2
            } else if ((match.home_score || 0) > (match.away_score || 0)) {
              standings[awayId].lost++
            } else {
              standings[awayId].drawn++
              standings[awayId].points += 1
            }
          }
        }
      }
    })

    Object.values(standings).forEach((team) => {
      team.legsDifference = team.legsFor - team.legsAgainst
    })

    return Object.values(standings)
      .filter((team) => team.played > 0)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.legsDifference !== a.legsDifference) return b.legsDifference - a.legsDifference
        return b.legsFor - a.legsFor
      })
  }

  const calculatePlayerPoints = (player: any, detailedStats: any) => {
    const legWinPoints = player.total_wins * 3
    const throw180Points = player.throws_180 * 25
    const throw171Points = player.throws_171 * 25
    const highTonnePoints = player.throws_high_tonne * 18
    const tonnePoints = player.throws_tonne * 15
    const throw95PlusPoints = player.throws_95_plus * 12
    const shanghaiPoints = player.throws_shanghai * 10
    const bullPoints = player.throws_bull * 8
    const throw20Points = player.throws_20 * 6
    const throw19Points = (detailedStats.throws_19 || 0) * 5
    const throw18Points = (detailedStats.throws_18 || 0) * 4
    const throw17Points = (detailedStats.throws_17 || 0) * 3
    const throw16Points = (detailedStats.throws_16 || 0) * 2
    const throw15Points = (detailedStats.throws_15 || 0) * 1

    return (
      legWinPoints +
      throw180Points +
      throw171Points +
      highTonnePoints +
      tonnePoints +
      throw95PlusPoints +
      shanghaiPoints +
      bullPoints +
      throw20Points +
      throw19Points +
      throw18Points +
      throw17Points +
      throw16Points +
      throw15Points
    )
  }

  const playerStatistics = useMemo(() => {
    if (!legStatistics) return []

    const playerMap = new Map()

    legStatistics.forEach((stat) => {
      const playerId = stat.player_id
      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          player_id: playerId,
          name: stat.player?.name,
          photo_url: stat.player?.photo_url,
          total_legs: 0,
          total_wins: 0,
          throws_180: 0,
          throws_171: 0,
          throws_high_tonne: 0,
          throws_tonne: 0,
          throws_95_plus: 0,
          throws_shanghai: 0,
          throws_bull: 0,
          throws_20: 0,
        })
      }

      const player = playerMap.get(playerId)
      const playerLegsWon = stat.player_legs_won || 0
      const opponentLegsWon = stat.opponent_legs_won || 0
      const legsInThisMatch = playerLegsWon + opponentLegsWon

      player.total_legs += legsInThisMatch
      player.total_wins += playerLegsWon
      player.throws_180 += stat.throws_180 || 0
      player.throws_171 += stat.throws_171 || 0
      player.throws_high_tonne += stat.throws_high_tonne || 0
      player.throws_tonne += stat.throws_tonne || 0
      player.throws_95_plus += stat.throws_95_plus || 0
      player.throws_shanghai += stat.throws_shanghai || 0
      player.throws_bull += stat.throws_bull || 0
      player.throws_20 += stat.throws_20 || 0
    })

    return Array.from(playerMap.values())
      .map((player) => {
        const detailedStats = legStatistics
          .filter((stat) => stat.player_id === player.player_id)
          .reduce((acc, stat) => {
            return {
              throws_15: (acc.throws_15 || 0) + (stat.throws_15 || 0),
              throws_16: (acc.throws_16 || 0) + (stat.throws_16 || 0),
              throws_17: (acc.throws_17 || 0) + (stat.throws_17 || 0),
              throws_18: (acc.throws_18 || 0) + (stat.throws_18 || 0),
              throws_19: (acc.throws_19 || 0) + (stat.throws_19 || 0),
            }
          }, {})

        const totalPoints = calculatePlayerPoints(player, detailedStats)

        return {
          ...player,
          throws_15: detailedStats.throws_15 || 0,
          throws_16: detailedStats.throws_16 || 0,
          throws_17: detailedStats.throws_17 || 0,
          throws_18: detailedStats.throws_18 || 0,
          throws_19: detailedStats.throws_19 || 0,
          win_percentage: player.total_legs > 0 ? (player.total_wins / player.total_legs) * 100 : 0,
          total_points: totalPoints,
        }
      })
      .sort((a, b) => {
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points
        }
        if (b.total_wins !== a.total_wins) {
          return b.total_wins - a.total_wins
        }
        return b.throws_180 - a.throws_180
      })
  }, [legStatistics])

  const getMatchResultColor = (match, teamId) => {
    const isHomeTeam = match.home_team?.id === teamId
    const homeScore = match.home_score || 0
    const awayScore = match.away_score || 0

    if (homeScore === awayScore) return "bg-amber-500/10 border-amber-400/20"

    const teamWon = isHomeTeam ? homeScore > awayScore : awayScore > homeScore
    return teamWon ? "bg-emerald-500/10 border-emerald-400/20" : "bg-red-500/10 border-red-400/20"
  }

 // ✅ "Ergebnisse" 
const completedMatches = matches.filter((match) => {
  const isCompleted = match.status === "completed"
  const isScheduledButPastAndMissing = match.status === "scheduled" && isPastMatch(match) && isMissingResult(match)
  return isCompleted || isScheduledButPastAndMissing
})

// ✅ "Kommende Spiele" = scheduled aber NUR Zukunft/Heute
const upcomingMatches = matches.filter((match) => match.status === "scheduled" && !isPastMatch(match))

const postponedMatches = matches.filter((match) => match.status === "postponed")
  const todayMatches = upcomingMatches.filter(isTodayMatch)
  const standings = calculateStandings()
  const playerLegStats = playerStatistics
  const totalPages = Math.ceil(playerLegStats.length / playersPerPage)
  const startIndex = (currentPage - 1) * playersPerPage
  const endIndex = startIndex + playersPerPage
  const currentPlayers = playerLegStats.slice(startIndex, endIndex)

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handlePageSizeChange = (newSize: number) => {
    setPlayersPerPage(newSize)
    setCurrentPage(1)
  }

  const groupMatchesByTeam = (matchList) => {
    const grouped = {}

    matchList.forEach((match) => {
      const homeTeamName = match.home_team?.name || match.home_opponent_team?.name || "Unbekanntes Team"
      const awayTeamName = match.away_team?.name || match.away_opponent_team?.name || "Unbekanntes Team"

      if (!grouped[homeTeamName]) grouped[homeTeamName] = []
      if (!grouped[awayTeamName]) grouped[awayTeamName] = []

      grouped[homeTeamName].push(match)
      grouped[awayTeamName].push(match)
    })

    return grouped
  }

  const groupedCompletedMatches = groupMatchesByTeam(completedMatches)
  const groupedUpcomingMatches = groupMatchesByTeam(upcomingMatches)

  // ✅ LOADING VIEW 
  if (loading) {
  return (
    <main className="emd-app-theme-shell relative min-h-screen flex flex-col overflow-x-hidden bg-[#050608] pb-24 text-white">
      <Header variant="app" title="Liga & Statistiken" subtitle="Tabelle · Ergebnisse · Termine · Teams · Stats" backHref="/" />

      <div className="pointer-events-none fixed inset-0 z-0 bg-[#050608]">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-30"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.82),rgba(3,5,9,.96)_46%,rgba(2,4,7,.99))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_18%,rgba(249,115,22,.16),transparent_26%),radial-gradient(circle_at_88%_22%,rgba(14,165,233,.09),transparent_27%)]" />
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 pb-20 pt-12 sm:pt-14">
        <div>
          <div className="flex flex-col items-center gap-6 rounded-[28px] border border-white/10 bg-black/35 px-10 py-10 shadow-[0_28px_80px_-52px_rgba(0,0,0,.95)] backdrop-blur-xl">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl animate-pulse" />
              <Loader2 className="relative h-12 w-12 animate-spin text-orange-300" />
            </div>

            <div className="text-center">
              <p className="text-lg font-bold text-white">Statistiken werden geladen</p>
              <p className="text-sm text-white/55 mt-1">Bitte kurz warten…</p>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </main>
  )
}

 return (
  <div className="emd-app-theme-shell relative min-h-screen overflow-x-hidden bg-[#050608] pb-20 text-white">
    <Header variant="app" title="Liga & Statistiken" subtitle="Tabelle · Ergebnisse · Termine · Teams · Stats" backHref="/" />

    <div className="pointer-events-none fixed inset-0 z-0 bg-[#050608]">
      <div
        className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-30"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.82),rgba(3,5,9,.96)_46%,rgba(2,4,7,.99))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_18%,rgba(249,115,22,.16),transparent_26%),radial-gradient(circle_at_88%_22%,rgba(14,165,233,.09),transparent_27%)]" />
    </div>

    {/* fixed header offset */}
    <main className="relative z-10 pt-14 sm:pt-16">
      <motion.div
        className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-4 sm:px-5 sm:pt-6 lg:px-7 lg:pb-14 xl:px-8"
        variants={containerVariants}
        initial={false}
        animate="visible"
      >
        {/* HERO – gleiche Designsprache wie Mitgliederprofil */}
        <motion.div variants={itemVariants} className="mb-4 sm:mb-5">
          <section className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-black/35 shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:rounded-[34px]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,.08),transparent_34%,rgba(14,165,233,.06)_78%,transparent)]" />
            <div className="pointer-events-none absolute -left-20 top-[-120px] h-80 w-80 rounded-full bg-orange-500/15 blur-[110px]" />
            <div className="pointer-events-none absolute -right-24 bottom-[-140px] h-96 w-96 rounded-full bg-sky-500/12 blur-[120px]" />

            <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/55 backdrop-blur-xl">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-400" />
                </span>
                EMD Liga · {selectedSeasonLabel}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-orange-300/[0.14] bg-orange-500/[0.08]">
                  <Trophy className="h-7 w-7 text-orange-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">Sportdarts</p>
                  <h1 className="mt-1 text-[clamp(1.9rem,5vw,3.5rem)] font-black leading-none tracking-[-0.055em] text-white">
                    Liga & Statistiken
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/50 sm:text-base">
                    Tabelle, Ergebnisse, Termine, Teams und Spielerstatistiken in einer Übersicht.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2.5 sm:mt-8 sm:gap-3">
                {[
                  { label: "Teams", value: standings.length, icon: Users },
                  { label: "Spiele", value: matches.length, icon: Calendar },
                  { label: "Spieler", value: playerLegStats.length, icon: Target },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="relative min-w-0 overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.045] p-3.5 backdrop-blur-xl sm:p-4">
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_100%,rgba(249,115,22,.09),transparent_42%),radial-gradient(circle_at_92%_0%,rgba(14,165,233,.05),transparent_38%)]" />
                      <div className="relative text-[9px] font-black uppercase tracking-[0.16em] text-white/35 sm:text-[10px]">{item.label}</div>
                      <div className="relative mt-2.5 flex items-end justify-between gap-2">
                        <div className="truncate text-lg font-black tracking-tight text-white sm:text-2xl">{item.value}</div>
                        <Icon className="h-4 w-4 shrink-0 text-orange-400 sm:h-5 sm:w-5" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </motion.div>

          {/* ✅ Saison + DartType Filter (App-Card wie Kontakt) */}
<motion.div variants={itemVariants} className="mb-5 sm:mb-6">
  <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/25 shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
    <div className="h-px bg-gradient-to-r from-transparent via-orange-300/35 to-transparent" />

    <div className="p-4 sm:p-5 space-y-4">
      {/* Row 1: Saison (Mobile: untereinander, ab sm: nebeneinander) */}
<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
  <div className="min-w-0">
    <p className="text-xs text-white/48 font-bold">Saison</p>
    <p className="text-sm font-black text-white truncate">{selectedSeasonLabel}</p>
  </div>

  <select
    value={selectedSeasonId}
    onChange={(e) => {
      setSelectedSeasonId(e.target.value)
      setCurrentPage(1)
    }}
    className="h-10 w-full sm:w-auto sm:max-w-[320px] rounded-2xl border border-white/10 bg-[#0b0d10] px-3 text-sm font-semibold text-white shadow-sm outline-none focus:border-orange-400/40"
  >
    {seasons.map((s) => (
      <option key={s.id} value={s.id}>
        {(s.name || s.type || "Saison") + (s.year ? ` ${s.year}` : "")}
      </option>
    ))}
  </select>
</div>

      {/* Row 2: DartType */}
      <div>
        <p className="text-xs text-white/48 font-bold mb-2">Dart-Typ</p>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={dartTypeFilter === "gesamt" ? "default" : "outline"}
            onClick={() => setDartTypeFilter("gesamt")}
            className={[
              "h-11 rounded-2xl border font-black transition",
              dartTypeFilter === "gesamt"
                ? "border-orange-400/30 bg-orange-500 text-white shadow-[0_0_22px_rgba(249,115,22,.10)] hover:bg-orange-400"
                : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08] hover:text-white",
            ].join(" ")}
          >
            Gesamt
          </Button>

          <Button
            variant={dartTypeFilter === "edart" ? "default" : "outline"}
            onClick={() => setDartTypeFilter("edart")}
            className={[
              "h-11 rounded-2xl border font-black transition",
              dartTypeFilter === "edart"
                ? "border-orange-400/30 bg-orange-500 text-white shadow-[0_0_22px_rgba(249,115,22,.10)] hover:bg-orange-400"
                : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08] hover:text-white",
            ].join(" ")}
          >
            E-Dart
          </Button>

          <Button
            variant={dartTypeFilter === "steeldart" ? "default" : "outline"}
            onClick={() => setDartTypeFilter("steeldart")}
            className={[
              "h-11 rounded-2xl border font-black transition",
              dartTypeFilter === "steeldart"
                ? "border-orange-400/30 bg-orange-500 text-white shadow-[0_0_22px_rgba(249,115,22,.10)] hover:bg-orange-400"
                : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08] hover:text-white",
            ].join(" ")}
          >
            Steeldart
          </Button>
        </div>
      </div>
    </div>
  </div>
</motion.div>
		  
		  

          <motion.div variants={itemVariants}>
            <Tabs defaultValue="standings" className="w-full">
             {/* Tabs (App-Style Container wie Kontakt) */}
<div className="mt-2 mb-4">
  <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/25 shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
    <div className="h-px bg-gradient-to-r from-transparent via-orange-300/35 to-transparent" />

    <div className="p-2 sm:p-3">
     <TabsList className="grid w-full grid-cols-5 gap-1 rounded-2xl bg-transparent p-0">
        {/* Tabelle */}
        <TabsTrigger
          value="standings"
          className={[
  "rounded-2xl h-12 sm:h-11 px-2 border",
  "text-xs sm:text-sm font-medium",
  "data-[state=active]:font-semibold",
  "flex items-center justify-center",
  "data-[state=active]:border-orange-400/25 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(249,115,22,.10)]",
  "data-[state=inactive]:border-transparent data-[state=inactive]:text-white/48 data-[state=inactive]:hover:bg-white/[0.05] data-[state=inactive]:hover:text-white/80",
].join(" ")}
        >
          <span className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-w-0 leading-none">
            <Trophy className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Tabelle</span>
          </span>
        </TabsTrigger>

        {/* Ergebnisse */}
        <TabsTrigger
          value="results"
          className={[
  "rounded-2xl h-12 sm:h-11 px-2 border",
  "text-xs sm:text-sm font-medium",
  "flex items-center justify-center",
  "data-[state=active]:border-orange-400/25 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(249,115,22,.10)]",
  "data-[state=inactive]:border-transparent data-[state=inactive]:text-white/48 data-[state=inactive]:hover:bg-white/[0.05] data-[state=inactive]:hover:text-white/80",
].join(" ")}
        >
          <span className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-w-0 leading-none">
            <Target className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Ergeb.</span>
          </span>
        </TabsTrigger>

        {/* Termine */}
        <TabsTrigger
          value="fixtures"
          className={[
  "rounded-2xl h-12 sm:h-11 px-2 border",
  "text-xs sm:text-sm font-medium",
  "flex items-center justify-center",
  "data-[state=active]:border-orange-400/25 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(249,115,22,.10)]",
  "data-[state=inactive]:border-transparent data-[state=inactive]:text-white/48 data-[state=inactive]:hover:bg-white/[0.05] data-[state=inactive]:hover:text-white/80",
].join(" ")}
        >
          <span className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-w-0 leading-none">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Termine</span>
          </span>
        </TabsTrigger>

        {/* Teams */}
        <TabsTrigger
          value="teams"
          className={[
  "rounded-2xl h-12 sm:h-11 px-2 border",
  "text-xs sm:text-sm font-medium",
  "flex items-center justify-center",
  "data-[state=active]:border-orange-400/25 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(249,115,22,.10)]",
  "data-[state=inactive]:border-transparent data-[state=inactive]:text-white/48 data-[state=inactive]:hover:bg-white/[0.05] data-[state=inactive]:hover:text-white/80",
].join(" ")}
        >
          <span className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-w-0 leading-none">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Teams</span>
          </span>
        </TabsTrigger>

        {/* Statistiken */}
        <TabsTrigger
          value="legstats"
          className={[
  "rounded-2xl h-12 sm:h-11 px-2 border",
  "text-xs sm:text-sm font-medium",
  "flex items-center justify-center",
  "data-[state=active]:border-orange-400/25 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(249,115,22,.10)]",
  "data-[state=inactive]:border-transparent data-[state=inactive]:text-white/48 data-[state=inactive]:hover:bg-white/[0.05] data-[state=inactive]:hover:text-white/80",
].join(" ")}
        >
          <span className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-w-0 leading-none">
            <Target className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Stats</span>
          </span>
        </TabsTrigger>
      </TabsList>
    </div>
  </div>
</div>

              <TabsContent value="legstats">
                

                <Card className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/25 shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
                  <CardHeader className="p-0">
  <div className="h-px bg-gradient-to-r from-transparent via-orange-300/35 to-transparent" />
  <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-300/20 flex items-center justify-center flex-shrink-0">
        <Target className="w-5 h-5 text-orange-300" />
      </div>
      <div className="min-w-0">
        <CardTitle className="text-sm sm:text-base font-black text-white truncate">
          Spieler-Statistiken
        </CardTitle>
        <p className="text-xs text-white/48 mt-1">
          {playerLegStats.length} Spieler ·{" "}
          {dartTypeFilter === "gesamt" ? "Gesamt" : dartTypeFilter === "edart" ? "E-Dart" : "Steeldart"}
        </p>
      </div>
    </div>

    {/* rechts: Zeige Dropdown */}
    <div className="flex items-center gap-2 flex-shrink-0">
      <span className="text-xs text-white/48 font-bold whitespace-nowrap">Zeige</span>
      <select
        value={playersPerPage}
        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
        className="h-10 rounded-2xl border border-white/10 bg-[#0b0d10] px-3 text-sm font-black text-white shadow-sm outline-none focus:border-orange-400/40"
      >
        <option value={10}>10</option>
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={playerLegStats.length}>Alle</option>
      </select>
    </div>
  </div>
</CardHeader>

 <div className="mt-6 mb-2">
  <PointsInfoBox />
</div>

                  <CardContent className="p-3 sm:p-6">
                    {playerLegStats.length === 0 ? (
                      <div className="text-center py-12 text-white/48">
                        <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">Keine Statistiken verfügbar</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-2 sm:gap-4">
                          {currentPlayers.map((player, index) => (
                            <PlayerStatisticsCardApp
                              key={player.name}
                              player={player}
                              index={startIndex + index}
                              allStats={legStatistics}
                            />
                          ))}
                        </div>

                        {totalPages > 1 && (
                          <div className="p-4 border-t bg-white/5">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="text-sm text-white/55">
                                Zeige {startIndex + 1} bis {Math.min(endIndex, playerLegStats.length)} von{" "}
                                {playerLegStats.length} Spielern
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handlePrevPage}
                                  disabled={currentPage === 1}
                                >
                                  Zurück
                                </Button>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum
                                    if (totalPages <= 5) {
                                      pageNum = i + 1
                                    } else if (currentPage <= 3) {
                                      pageNum = i + 1
                                    } else if (currentPage >= totalPages - 2) {
                                      pageNum = totalPages - 4 + i
                                    } else {
                                      pageNum = currentPage - 2 + i
                                    }

                                    return (
                                      <Button
                                        key={pageNum}
                                        variant={currentPage === pageNum ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCurrentPage(pageNum)}
                                        className="w-8 h-8 p-0"
                                      >
                                        {pageNum}
                                      </Button>
                                    )
                                  })}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleNextPage}
                                  disabled={currentPage === totalPages}
                                >
                                  Weiter
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
				 
                </Card>
				
              </TabsContent>
			  
	
			  
	

              <TabsContent value="standings">
                <Card className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/25 shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
  <CardHeader className="p-0">
  <div className="h-px bg-gradient-to-r from-transparent via-orange-300/35 to-transparent" />
  <div className="p-4 sm:p-5 flex items-center gap-3">
    <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-300/20 flex items-center justify-center flex-shrink-0">
      <Trophy className="w-5 h-5 text-orange-300" />
    </div>
    <div className="min-w-0">
      <CardTitle className="text-sm sm:text-base font-black text-white">
        Liga-Tabelle
      </CardTitle>
      <p className="text-xs text-white/48 mt-1">
        {standings.length} Teams · {dartTypeFilter === "gesamt" ? "Gesamt" : dartTypeFilter === "edart" ? "E-Dart" : "Steeldart"}
      </p>
    </div>
  </div>
</CardHeader>
                  <CardContent className="p-4 sm:p-5">
                    <div className="grid gap-2 sm:gap-4">
                      {standings.map((team, index) => {
                        const teamData = teams.find((t) => t.name === team.team)
                        return <TeamStandingsCardApp key={team.team} team={team} index={index} teamData={teamData} />
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="results">
                <Card className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/25 shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
                  <CardHeader className="p-0">
  <div className="h-px bg-gradient-to-r from-transparent via-orange-300/35 to-transparent" />
  <div className="p-4 sm:p-5 flex items-center gap-3">
    <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-300/20 flex items-center justify-center flex-shrink-0">
      <Target className="w-5 h-5 text-orange-300" />
    </div>
    <div className="min-w-0">
      <CardTitle className="text-sm sm:text-base font-black text-white">
        Ergebnisse
      </CardTitle>
      <p className="text-xs text-white/48 mt-1">
        {completedMatches.length} Spiele ·{" "}
        {dartTypeFilter === "gesamt" ? "Gesamt" : dartTypeFilter === "edart" ? "E-Dart" : "Steeldart"}
      </p>
    </div>
  </div>
</CardHeader>
                  <CardContent className="p-3 sm:p-5">
                    {completedMatches.length === 0 ? (
                      <p className="text-center text-white/48 py-8">Noch keine Ergebnisse verfügbar</p>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {completedMatches
                          .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
                          .map((match) => {
                            const homeScore = match.home_score || 0
                            const awayScore = match.away_score || 0

                            const matchDate = new Date(match.match_date)
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            const isFutureDate = matchDate > today

                            const isPendingResult = isMissingResult(match)

                            const isOurHomeTeam = match.home_team?.id
                            const isOurAwayTeam = match.away_team?.id

                            let matchColor = "bg-white/5 border-gray-200"
                            let resultText = "Unentschieden"

                            
matchColor = "bg-white border-gray-200"

if (isFutureDate) {
  matchColor = "bg-white border-2 border-orange-300"
  resultText = "Datum in der Zukunft"
} else if (isPendingResult) {
  matchColor = "bg-white border-2 border-orange-300"
  resultText = "Ausstehend"
} else if (homeScore > awayScore) {
  if (isOurHomeTeam) {
    matchColor = "bg-white border-emerald-400/20"
    resultText = "Heimsieg"
  } else {
    matchColor = "bg-white border-red-400/20"
    resultText = "Niederlage"
  }
} else if (awayScore > homeScore) {
  if (isOurAwayTeam) {
    matchColor = "bg-white border-emerald-400/20"
    resultText = "Auswärtssieg"
  } else {
    matchColor = "bg-white border-red-400/20"
    resultText = "Niederlage"
  }
} else {
  matchColor = "bg-white border-amber-400/20"
  resultText = "Unentschieden"
}

                           return (
                              <div
                                key={match.id}
                                className={`${matchColor} border rounded-2xl p-3 sm:p-5 shadow-sm hover:shadow-md transition-all`}
                              >
                                
								
								{/* ======  RESULT LAYOUT ====== */}
<div className="flex gap-3">
  {/* Left Status Bar */}
  <div
    className={[
      "w-1.5 rounded-full flex-shrink-0",
      isFutureDate || isPendingResult
        ? "bg-orange-400"
        : resultText === "Heimsieg" || resultText === "Auswärtssieg"
          ? "bg-emerald-500/100"
          : resultText === "Unentschieden"
            ? "bg-amber-500/100"
            : "bg-red-500/100",
    ].join(" ")}
  />

  <div className="flex-1 min-w-0">
    {/* Top Row: Teams + Score */}
    <div className="flex flex-col items-center text-center gap-3">

  {/* Heim */}
  <div className="flex flex-col items-center gap-1">
    <span className="text-[11px] uppercase text-white/48 tracking-wide">Heim</span>

    <div className="flex items-center gap-2">
      {match.home_team?.logo_url ? (
        <img
          src={match.home_team.logo_url}
          className="w-9 h-9 rounded-lg object-cover border border-white/10 bg-black/30"
        />
      ) : (
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          <Trophy className="h-4 w-4 text-white/48" />
        </div>
      )}

      <span className="font-semibold text-sm text-white max-w-[180px] truncate">
        {match.home_team?.name || match.home_opponent_team?.name}
      </span>
    </div>
  </div>

  {/* Score */}
  <div className="bg-white border border-gray-200 shadow-md rounded-2xl px-5 py-2 min-w-[100px]">
    {isPendingResult || isFutureDate ? (
      <div className="text-lg font-semibold text-orange-500">– : –</div>
    ) : (
      <div className="flex items-center justify-center gap-2">
        <span className="text-2xl font-extrabold text-white">{homeScore}</span>
        <span className="text-white/38">:</span>
        <span className="text-2xl font-extrabold text-white">{awayScore}</span>
      </div>
    )}
  </div>

 {/* Gast */}
<div className="flex flex-col items-center gap-1">
  <span className="text-[11px] uppercase text-white/48 tracking-wide">Gast</span>

  <div className="flex items-center gap-2">
    <span className="font-semibold text-sm text-white max-w-[180px] truncate text-right">
  {match.away_team?.name || match.away_opponent_team?.name}
</span>

    {match.away_team?.logo_url ? (
      <img
        src={match.away_team.logo_url}
        className="w-9 h-9 rounded-lg object-cover border border-white/10 bg-black/30"
        alt="Away team logo"
      />
    ) : null}
  </div>
</div>


      {/* Meta Right (Desktop) */}
      <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
        <div className="text-sm font-semibold text-white/70">{formatDateDEShort(match.match_date)}</div>
        {match.match_time && <div className="text-xs text-white/55">{formatTimeDE(match.match_time)} Uhr</div>}
        <Badge
          className={`
            ${
              isFutureDate || isPendingResult
                ? "bg-orange-100 text-orange-300 border-orange-300"
                : resultText === "Heimsieg" || resultText === "Auswärtssieg"
                  ? "bg-green-100 text-emerald-300"
                  : resultText === "Unentschieden"
                    ? "bg-yellow-100 text-amber-300"
                    : "bg-red-100 text-red-300"
            }
            font-semibold text-xs
          `}
        >
          {resultText}
        </Badge>
      </div>
    </div>

    {/* Mobile Meta */}
    <div className="sm:hidden mt-3 flex items-center justify-between gap-2">
     <div className="text-xs font-semibold text-white/70 whitespace-nowrap">
  {formatDateDEShort(match.match_date)}
  {match.match_time ? ` · ${formatTimeDE(match.match_time)} Uhr` : ""}
</div>

      <Badge
        className={`
          ${
            isFutureDate || isPendingResult
              ? "bg-orange-100 text-orange-300 border-orange-300"
              : resultText === "Heimsieg" || resultText === "Auswärtssieg"
                ? "bg-green-100 text-emerald-300"
                : resultText === "Unentschieden"
                  ? "bg-yellow-100 text-amber-300"
                  : "bg-red-100 text-red-300"
          }
          font-semibold text-[11px] px-2 py-1
        `}
      >
        {resultText}
      </Badge>
    </div>

    {/* Optional: Original Date */}
    {match.original_date && (
      <div className="mt-2 text-[10px] text-white/48">
        Ursprünglich: {formatDateDE(match.original_date)} → Neu: {formatDateDE(match.match_date)}
      </div>
    )}
  </div>
</div>
								
								
								
                                {isFutureDate && (
  <div className="mt-2 pt-2 border-t border-orange-300/20">
    <div className="flex items-start gap-2 text-[11px] text-orange-300 leading-snug">
      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse mt-1"></div>
      <span className="font-medium">
        Achtung: Datum liegt in der Zukunft – evtl. verschoben / noch nicht aktualisiert.
      </span>
    </div>
  </div>
)}

{!isFutureDate && isPendingResult && (
  <div className="mt-2 pt-2 border-t border-orange-300/20">
    <div className="flex items-start gap-2 text-[11px] text-orange-300 leading-snug">
      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse mt-1"></div>
      <span className="font-medium">
        Noch kein Ergebnis eingetragen.
      </span>
    </div>
  </div>
)}
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fixtures">
  <div className="space-y-4">

    {/* ===================== HEUTE ===================== */}
    {todayMatches.length > 0 && (
      <Card className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/25 shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
        <CardHeader className="p-0">
  <div className="h-px bg-gradient-to-r from-transparent via-orange-300/35 to-transparent" />
  <div className="p-4 sm:p-5 flex items-center gap-3">
    <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-300/20 flex items-center justify-center flex-shrink-0">
      <Calendar className="w-5 h-5 text-orange-300" />
    </div>
    <div className="min-w-0">
      <CardTitle className="text-sm sm:text-base font-black text-white">
        Heute
      </CardTitle>
      <p className="text-xs text-white/48 mt-1">
        {todayMatches.length} Spiele
      </p>
    </div>
  </div>
</CardHeader>

        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3">
            {todayMatches
              .sort(
                (a, b) =>
                  toMatchDateTime(a.match_date, a.match_time).getTime() -
                  toMatchDateTime(b.match_date, b.match_time).getTime()
              )
              .map((match) => (
                <div
                  key={match.id}
                  className="border border-blue-300 rounded-2xl p-4 bg-black/30 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

                    <div className="font-semibold text-white text-center sm:text-left">
                      {match.home_team?.name ||
                        match.home_opponent_team?.name ||
                        "Team nicht gefunden"}{" "}
                      <span className="text-white/38 font-extrabold">vs</span>{" "}
                      {match.away_team?.name ||
                        match.away_opponent_team?.name ||
                        "Team nicht gefunden"}
                    </div>

                    <div className="flex items-center gap-2">
                      {match.match_time && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold">
                          {formatTimeDE(match.match_time)} Uhr
                        </Badge>
                      )}
                      <Badge className="bg-blue-600 text-white border-blue-700 font-semibold">
                        HEUTE
                      </Badge>
                    </div>

                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    )}

    {/* ===================== VERSCHOBENE SPIELE ===================== */}
    {postponedMatches.length > 0 && (
      <Card className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/25 shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
        <CardHeader className="p-0">
  <div className="h-px bg-gradient-to-r from-transparent via-orange-300/35 to-transparent" />
  <div className="p-4 sm:p-5 flex items-center gap-3">
    <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-300/20 flex items-center justify-center flex-shrink-0">
      <Calendar className="w-5 h-5 text-orange-300" />
    </div>
    <div className="min-w-0">
      <CardTitle className="text-sm sm:text-base font-black text-white">
        Verschobene Spiele
      </CardTitle>
      <p className="text-xs text-white/48 mt-1">
        {postponedMatches.length} Spiele
      </p>
    </div>
  </div>
</CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {postponedMatches
              .sort(
                (a, b) =>
                  toMatchDateTime(a.match_date, a.match_time).getTime() -
                  toMatchDateTime(b.match_date, b.match_time).getTime()
              )
              .map((match) => (
                <div
                  key={match.id}
                  className="border border-red-400/20 rounded-2xl p-3 sm:p-4 bg-black/30 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

                    <div className="font-semibold text-white text-center sm:text-left">
                      {match.home_team?.name ||
                        match.home_opponent_team?.name ||
                        "Team nicht gefunden"}{" "}
                      <span className="text-white/38 font-extrabold">vs</span>{" "}
                      {match.away_team?.name ||
                        match.away_opponent_team?.name ||
                        "Team nicht gefunden"}
                    </div>

                    <div className="text-center sm:text-right">
  <div className="text-sm font-semibold text-white">
    {formatDateDE(match.match_date)}
  </div>

  {match.original_date && (
    <div className="text-xs text-red-300/80 mt-1">
      Ursprünglich: {formatDateDE(match.original_date)}
    </div>
  )}

  {match.match_time && (
    <div className="text-sm font-semibold text-sky-300">
      {formatTimeDE(match.match_time)} Uhr
    </div>
  )}

  <Badge className="bg-red-500/100 text-white border-red-600 font-semibold text-xs px-2 py-1 mt-2">
    Verschoben
  </Badge>
</div>

                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    )}

    {/* ===================== KOMMENDE SPIELE ===================== */}
    <Card className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/25 shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
      <CardHeader className="p-0">
  <div className="h-px bg-gradient-to-r from-transparent via-orange-300/35 to-transparent" />
  <div className="p-4 sm:p-5 flex items-center gap-3">
    <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-300/20 flex items-center justify-center flex-shrink-0">
      <Calendar className="w-5 h-5 text-orange-300" />
    </div>
    <div className="min-w-0">
      <CardTitle className="text-sm sm:text-base font-black text-white">
        Kommende Spiele
      </CardTitle>
      <p className="text-xs text-white/48 mt-1">
        {upcomingMatches.length} Spiele
      </p>
    </div>
  </div>
</CardHeader>

      <CardContent className="p-3 sm:p-6">
        {upcomingMatches.length === 0 ? (
          <p className="text-center text-white/48 py-8">
            Keine kommenden Spiele geplant
          </p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {upcomingMatches
              .sort(
                (a, b) =>
                  toMatchDateTime(a.match_date, a.match_time).getTime() -
                  toMatchDateTime(b.match_date, b.match_time).getTime()
              )
              .map((match) => {
                const isToday = isTodayMatch(match)
				const isTomorrow = isTomorrowMatch(match)

                return (
                  <div
                    key={match.id}
                    className={`border rounded-2xl p-3 sm:p-4 transition-shadow ${
  isToday
    ? "border-blue-400 bg-sky-500/10"
    : isTomorrow
      ? "border-orange-400 bg-white"
      : "border-white/10 bg-black/30"
}`}
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

                      <div className="font-semibold text-white text-center sm:text-left">
                        {match.home_team?.name ||
                          match.home_opponent_team?.name ||
                          "Team nicht gefunden"}{" "}
                        <span className="text-white/38 font-extrabold">vs</span>{" "}
                        {match.away_team?.name ||
                          match.away_opponent_team?.name ||
                          "Team nicht gefunden"}
                      </div>

                      <div className="text-center sm:text-right">

                        <div className="text-sm font-semibold text-white">
                          {formatDateDE(match.match_date)}
                        </div>

                        {match.match_time && (
                          <div className="text-sm font-semibold text-sky-300">
                            {formatTimeDE(match.match_time)} Uhr
                          </div>
                        )}

                        {isToday && (
                          <Badge className="bg-blue-600 text-white border-blue-700 font-semibold text-xs mt-2">
                            HEUTE
                          </Badge>
                        )}
						{isTomorrow && (
  <Badge className="bg-orange-600 text-white border-orange-700 font-semibold text-xs mt-2">
    MORGEN
  </Badge>
)}
                      </div>

                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </CardContent>
    </Card>

  </div>
</TabsContent>
			  
			  
			  
			  
			  
			  
			  
			  
			  
			  
			  
			  
			  
			  

              <TabsContent value="teams">
                <div className="space-y-4 sm:space-y-6">
                  <div className="mb-5 sm:mb-6">
  <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/25 shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
    <div className="h-px bg-gradient-to-r from-transparent via-orange-300/35 to-transparent" />
    <div className="p-4 sm:p-5 flex items-center gap-3">
      <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-300/20 flex items-center justify-center flex-shrink-0">
        <Users className="w-5 h-5 text-orange-300" />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-black text-white">Teams & Kader</h2>
        <p className="text-xs text-white/48 mt-1">
          {standings.length} Teams · {selectedSeasonLabel}
        </p>
      </div>
    </div>
  </div>
</div>

                  <div className="grid gap-4 sm:gap-8">
                    {teams
                      .filter((team) => {
                        const teamHasMatches = standings.some((s) => s.team === team.name)
                        return teamHasMatches
                      })
                      .map((team) => {
                        const teamPlayers = players.filter((player) => player.team_id === team.id)
                        const teamStats = standings.find((s) => s.team === team.name)

                        return (
                          <Card key={team.id} className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/25 shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
						
  <CardHeader className="p-0">
  <div className="h-px bg-gradient-to-r from-transparent via-orange-300/35 to-transparent" />

  <div className="p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      {/* Left: Logo + Name */}
      <div className="flex items-center gap-3 min-w-0">
        {team.logo_url ? (
          <img
            src={team.logo_url || "/placeholder.svg"}
            alt={`${team.name} Logo`}
            className="w-11 h-11 rounded-2xl object-cover border border-white/10 bg-black/30 flex-shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-300/20 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-orange-300" />
          </div>
        )}

        <div className="min-w-0">
          <CardTitle className="text-sm sm:text-base font-black text-white truncate">
            {team.name}
          </CardTitle>

          <p className="text-xs text-white/48 mt-1">
            {teamPlayers.length} Spieler
            {teamStats ? ` · ${teamStats.points} Punkte` : ""}
          </p>
        </div>
      </div>

      {/* Right: Rank pill (optional) */}
      {teamStats && (
        <span className="inline-flex items-center rounded-full bg-orange-500/10 border border-orange-300/20 px-3 py-1 text-[11px] font-black text-orange-300 flex-shrink-0">
          #{standings.findIndex((s) => s.team === team.name) + 1}
        </span>
      )}
    </div>
  </div>
</CardHeader>

<CardContent className="p-4 sm:p-5">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
    {/* Saisonstatistik */}
    {teamStats && (
      <div>
        <h4 className="text-sm font-black text-white mb-3">Saisonstatistik</h4>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="bg-white/5 rounded-2xl p-3 text-center border border-gray-200">
            <div className="text-xl sm:text-2xl font-black text-white">{teamStats.played}</div>
            <div className="text-xs text-white/55 font-bold">Spiele</div>
          </div>

          <div className="bg-emerald-500/10 rounded-2xl p-3 text-center border border-emerald-400/20">
            <div className="text-xl sm:text-2xl font-black text-emerald-300">{teamStats.won}</div>
            <div className="text-xs text-white/55 font-bold">Siege</div>
          </div>

          <div className="bg-amber-500/10 rounded-2xl p-3 text-center border border-amber-400/20">
            <div className="text-xl sm:text-2xl font-black text-amber-300">{teamStats.drawn}</div>
            <div className="text-xs text-white/55 font-bold">Unentschieden</div>
          </div>

          <div className="bg-red-500/10 rounded-2xl p-3 text-center border border-red-400/20">
            <div className="text-xl sm:text-2xl font-black text-red-300">{teamStats.lost}</div>
            <div className="text-xs text-white/55 font-bold">Niederlagen</div>
          </div>

          <div className="bg-sky-500/10 rounded-2xl p-3 text-center border border-sky-400/20 col-span-2">
            <div className="text-xl sm:text-2xl font-black text-sky-300">
              {teamStats.legsDifference > 0 ? "+" : ""}
              {teamStats.legsDifference}
            </div>
            <div className="text-xs text-white/55 font-bold">Legs-Differenz</div>
          </div>
        </div>
      </div>
    )}

    {/* Spielerkader */}
    <div>
      <h4 className="text-sm font-black text-white mb-3">Spielerkader</h4>

      {teamPlayers.length === 0 ? (
        <div className="text-center py-8 text-white/48 border border-gray-200 rounded-2xl bg-white/5">
          <Users className="h-10 w-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-bold">Keine Spieler zugeordnet</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {teamPlayers.map((player, index) => (
            <div
              key={player.id}
              className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-200"
            >
              <div className="w-8 h-8 rounded-2xl bg-orange-500/10 border border-orange-300/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-black text-orange-300">{index + 1}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-mediumtext-white text-sm truncate">{player.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
</CardContent>
  
  
                          </Card>
                        )
                      })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
