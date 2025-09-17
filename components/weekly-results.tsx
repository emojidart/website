"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, Calendar, TrendingUp, ExternalLink } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface WeeklyMatch {
  id: string
  home_team_id: string | null
  away_team_id: string | null
  home_opponent_team_id: string | null
  away_opponent_team_id: string | null
  home_score: number | null
  away_score: number | null
  match_date: string
  matchday: number
  status: string
  match_time?: string
  home_team?: {
    id: string
    name: string
    logo_url?: string
  }
  away_team?: {
    id: string
    name: string
    logo_url?: string
  }
  home_opponent_team?: {
    id: string
    name: string
    logo_url?: string
  }
  away_opponent_team?: {
    id: string
    name: string
    logo_url?: string
  }
}

interface Team {
  id: string
  name: string
  logo_url?: string
  user_id?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } },
}

export function WeeklyResults() {
  const [matches, setMatches] = useState<WeeklyMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState("")

  useEffect(() => {
    const loadWeeklyResults = async () => {
      try {
        const { data: opponentTeamsData, error: opponentTeamsError } = await supabase.from("opponent_teams").select("*")

        if (opponentTeamsError) {
        }

        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6) // Sunday

        const startOfYear = new Date(now.getFullYear(), 0, 1)
        const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
        const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
        setCurrentWeek(`KW ${weekNumber} - ${now.getFullYear()}`)

        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select(`
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
            away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
          `)
          .gte("match_date", startOfWeek.toISOString().split("T")[0])
          .lte("match_date", endOfWeek.toISOString().split("T")[0])
          .in("status", ["completed", "scheduled"])
          .order("match_date", { ascending: false })

        if (matchesError) {
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
      } catch (error) {
      } finally {
        setLoading(false)
      }
    }

    loadWeeklyResults()
  }, [])

  const getResultBadge = (homeScore: number | null, awayScore: number | null, isHome: boolean, status: string) => {
    if (status === "scheduled" || homeScore === null || awayScore === null) {
      return (
        <Badge className="bg-primary text-primary-foreground font-bold text-sm px-3 py-1 shadow-sm border animate-pulse">
          GEPLANT
        </Badge>
      )
    }

    if (homeScore === awayScore) {
      return (
        <Badge className="bg-yellow-600 text-white font-bold text-sm px-3 py-1 shadow-sm border">UNENTSCHIEDEN</Badge>
      )
    }

    const won = isHome ? homeScore > awayScore : awayScore > homeScore
    return won ? (
      <Badge className="bg-green-600 text-white font-bold text-sm px-3 py-1 shadow-sm border">SIEG</Badge>
    ) : (
      <Badge className="bg-red-600 text-white font-bold text-sm px-3 py-1 shadow-sm border">NIEDERLAGE</Badge>
    )
  }

  const isEmojTeam = (teamName: string | undefined | null) => {
    if (!teamName) return false
    return teamName.toLowerCase().includes("emoj")
  }

  const getTeamName = (match: WeeklyMatch, isHome: boolean) => {
    if (isHome) {
      return match.home_team?.name || match.home_opponent_team?.name || "Unbekanntes Team"
    } else {
      return match.away_team?.name || match.away_opponent_team?.name || "Unbekanntes Team"
    }
  }

  const getTeamLogo = (match: WeeklyMatch, isHome: boolean) => {
    const teamName = getTeamName(match, isHome)
    const isEmoj = isEmojTeam(teamName)

    if (isEmoj) {
      if (isHome) {
        return match.home_team?.logo_url || match.home_opponent_team?.logo_url
      } else {
        return match.away_team?.logo_url || match.away_opponent_team?.logo_url
      }
    }
    return null // No logo for opponent teams
  }

  if (loading) {
    return (
      <section className="py-8 px-4 md:px-8 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Lade aktuelle Ergebnisse...</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8 px-4 md:px-8 bg-background min-h-screen">
      <motion.div className="max-w-6xl mx-auto" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg mb-6">
            <TrendingUp className="h-5 w-5" />
            <span className="font-bold text-lg uppercase tracking-wide">Aktuelle Woche</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            <span className="text-primary">TEAMSPIELE</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium mb-6">{currentWeek}</p>
          <Link
            href="/liga-statistiken"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-lg font-bold transition-colors bg-card px-6 py-3 rounded-lg shadow-sm hover:shadow-md border"
          >
            <span>Alle Teamspiele</span>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </motion.div>

        <motion.div className="grid gap-6" variants={containerVariants}>
          {matches.map((match, index) => {
            const homeTeamName = getTeamName(match, true)
            const awayTeamName = getTeamName(match, false)
            const homeIsEmoj = isEmojTeam(homeTeamName)
            const awayIsEmoj = isEmojTeam(awayTeamName)
            const homeTeamLogo = getTeamLogo(match, true)
            const awayTeamLogo = getTeamLogo(match, false)

            return (
              <motion.div key={match.id} variants={itemVariants}>
                <Card className="overflow-hidden shadow-md border bg-card hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-5 w-5" />
                        <span className="font-medium">
                          {new Date(match.match_date).toLocaleDateString("de-DE", {
                            weekday: "long",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <span className="text-muted-foreground font-medium">Spieltag {match.matchday}</span>
                    </div>

                    {/* Mobile Layout */}
                    <div className="block md:hidden space-y-6">
                      {/* Home Team */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {homeTeamLogo ? (
                            <img
                              src={homeTeamLogo || "/placeholder.svg"}
                              alt={`${homeTeamName} Logo`}
                              className="w-12 h-12 rounded-full object-cover border-2 border-border flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                              <div className="w-6 h-6 bg-muted-foreground/30 rounded-full"></div>
                            </div>
                          )}
                          <h3
                            className={`text-lg font-bold truncate ${homeIsEmoj ? "text-primary" : "text-foreground"}`}
                          >
                            {homeTeamName}
                          </h3>
                        </div>
                        {homeIsEmoj && (
                          <div className="ml-4">
                            {getResultBadge(match.home_score, match.away_score, true, match.status)}
                          </div>
                        )}
                      </div>

                      {/* Score */}
                      <div className="text-center">
                        <div className="bg-primary text-primary-foreground rounded-lg p-4 shadow-md inline-block">
                          <div className="text-2xl font-bold">
                            {match.status === "scheduled"
                              ? new Date(match.match_date + "T" + (match.match_time || "20:00:00")).toLocaleTimeString(
                                  "de-DE",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : `${match.home_score ?? "-"} : ${match.away_score ?? "-"}`}
                          </div>
                        </div>
                      </div>

                      {/* Away Team */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {awayTeamLogo ? (
                            <img
                              src={awayTeamLogo || "/placeholder.svg"}
                              alt={`${awayTeamName} Logo`}
                              className="w-12 h-12 rounded-full object-cover border-2 border-border flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                              <div className="w-6 h-6 bg-muted-foreground/30 rounded-full"></div>
                            </div>
                          )}
                          <h3
                            className={`text-lg font-bold truncate ${awayIsEmoj ? "text-primary" : "text-foreground"}`}
                          >
                            {awayTeamName}
                          </h3>
                        </div>
                        {awayIsEmoj && (
                          <div className="ml-4">
                            {getResultBadge(match.home_score, match.away_score, false, match.status)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:grid md:grid-cols-5 gap-6 items-center">
                      {/* Home Team */}
                      <div className="col-span-2 text-right">
                        <div className="flex items-center justify-end gap-4">
                          <h3
                            className={`text-xl font-bold truncate ${homeIsEmoj ? "text-primary" : "text-foreground"}`}
                          >
                            {homeTeamName}
                          </h3>
                          {homeTeamLogo ? (
                            <img
                              src={homeTeamLogo || "/placeholder.svg"}
                              alt={`${homeTeamName} Logo`}
                              className="w-12 h-12 rounded-full object-cover border-2 border-border flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                              <div className="w-6 h-6 bg-muted-foreground/30 rounded-full"></div>
                            </div>
                          )}
                        </div>
                        {homeIsEmoj && (
                          <div className="mt-3">
                            {getResultBadge(match.home_score, match.away_score, true, match.status)}
                          </div>
                        )}
                      </div>

                      {/* Score */}
                      <div className="col-span-1 text-center">
                        <div className="bg-primary text-primary-foreground rounded-lg p-4 shadow-md">
                          <div className="text-2xl font-bold">
                            {match.status === "scheduled"
                              ? new Date(match.match_date + "T" + (match.match_time || "20:00:00")).toLocaleTimeString(
                                  "de-DE",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : `${match.home_score ?? "-"} : ${match.away_score ?? "-"}`}
                          </div>
                        </div>
                      </div>

                      {/* Away Team */}
                      <div className="col-span-2 text-left">
                        <div className="flex items-center gap-4">
                          {awayTeamLogo ? (
                            <img
                              src={awayTeamLogo || "/placeholder.svg"}
                              alt={`${awayTeamName} Logo`}
                              className="w-12 h-12 rounded-full object-cover border-2 border-border flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                              <div className="w-6 h-6 bg-muted-foreground/30 rounded-full"></div>
                            </div>
                          )}
                          <h3
                            className={`text-xl font-bold truncate ${awayIsEmoj ? "text-primary" : "text-foreground"}`}
                          >
                            {awayTeamName}
                          </h3>
                        </div>
                        {awayIsEmoj && (
                          <div className="mt-3">
                            {getResultBadge(match.home_score, match.away_score, false, match.status)}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {matches.length === 0 && (
          <motion.div variants={itemVariants} className="text-center py-12">
            <div className="bg-card rounded-lg shadow-sm p-8 max-w-md mx-auto border">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-3">Keine Spiele diese Woche</h3>
              <p className="text-muted-foreground">Aktuell sind keine Teamspielergebnisse für diese Woche verfügbar.</p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </section>
  )
}
