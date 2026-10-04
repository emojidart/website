"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, Clock3, Radio, Trophy } from "lucide-react"
import { supabase } from "@/lib/supabase"

type LiveGame = {
  gameId: string
  division: string
  weekNumber: number
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: "started" | "scheduled" | "completed"
}

type ResultGame = {
  gameId: string
  weekNumber: number
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: "scheduled" | "live" | "completed"
  detailUrl?: string
  divisionName?: string
}


export type EmdPrediction = {
  firstTeam: string
  secondTeam: string
  firstWin: number
  draw: number
  secondWin: number
  sampleSize: number
  headToHead: number
  currentFirstGames: number
  currentSecondGames: number
  previousFirstGames: number
  previousSecondGames: number
  confidence: "niedrig" | "mittel" | "hoch"
}

type DivisionGames = {
  key: string
  divisionName: string
  seasonId: number
  seasonWeight: number
  isCurrent: boolean
  games: ResultGame[]
}


type PlayerCheck = {
  player: string
  checks: string
}

type BlockMatch = {
  leftPlayer: string
  leftScore: string
  rightScore: string
  rightPlayer: string
}

type MatchBlock = {
  title: string
  matches: BlockMatch[]
}

type StructuredPlay = {
  block: string
  playId?: string
  homePlayer: string
  awayPlayer: string
  homeLegs: number
  awayLegs: number
  isTeamMatch: boolean
}

type GameDetail = {
  homeTeam: string
  awayTeam: string
  homeScore: string
  awayScore: string
  homePlayers: PlayerCheck[]
  awayPlayers: PlayerCheck[]
  blocks: MatchBlock[]
  singles?: StructuredPlay[]
  teamMatches?: StructuredPlay[]
}

function displayBlockTitle(raw: string, isTeam = false) {
  if (isTeam || /teamblock/i.test(raw || "")) return "TEAM / DOPPEL"
  const match = String(raw || "").match(/block\s*(\d+)/i)
  return match ? `EINZEL · BLOCK ${match[1]}` : "EINZEL"
}

function structuredBlocks(detail: GameDetail | null): MatchBlock[] {
  if (!detail) return []
  const plays = [...(detail.singles || []), ...(detail.teamMatches || [])]
  if (!plays.length) return detail.blocks || []

  const grouped = new Map<string, { title: string; matches: BlockMatch[] }>()
  for (const play of plays) {
    const key = `${play.isTeamMatch ? "team" : "single"}:${play.block || ""}`
    if (!grouped.has(key)) {
      grouped.set(key, { title: displayBlockTitle(play.block, play.isTeamMatch), matches: [] })
    }
    grouped.get(key)!.matches.push({
      leftPlayer: play.homePlayer || "Offen",
      leftScore: Number.isFinite(play.homeLegs) ? String(play.homeLegs) : "",
      rightScore: Number.isFinite(play.awayLegs) ? String(play.awayLegs) : "",
      rightPlayer: play.awayPlayer || "Offen",
    })
  }
  return Array.from(grouped.values())
}

type Assignment = {
  team_id: string
  season_id?: string | null
  sportdarts_season_id: number
  sportdarts_division_id: number
  sportdarts_division_name: string
  created_at?: string | null
  updated_at?: string | null
}

type LeagueBlock = {
  key: string
  seasonId: number
  divisionId: number
  divisionName: string
  teamNames: string[]
}

export type SportdartsTvData = {
  live: LiveGame[]
  ownLive: LiveGame[]
  ownTeamNames: string[]
  upcoming: ResultGame[]
  results: ResultGame[]
  getPrediction: (firstTeam: string, secondTeam: string) => EmdPrediction | null
  loading: boolean
  lastUpdated: Date | null
}

const LIVE_REFRESH_WHEN_ACTIVE_MS = 60000
const LIVE_REFRESH_WHEN_IDLE_MS = 120000
const RESULTS_REFRESH_MS = 10 * 60 * 1000

function isLivePollingWindow(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes()
  // Vereinsbetrieb: 17:30 bis 00:30 (lokale Browserzeit).
  return minutes >= 17 * 60 + 30 || minutes < 30
}

function msUntilNextLiveWindow(date = new Date()) {
  if (isLivePollingWindow(date)) return 0
  const next = new Date(date)
  next.setHours(17, 30, 0, 0)
  if (next.getTime() <= date.getTime()) next.setDate(next.getDate() + 1)
  return Math.max(1000, next.getTime() - date.getTime())
}

function normalizeTeam(value?: string | null) {
  return (value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function isEmdTeam(value?: string | null) {
  const v = normalizeTeam(value)
  return v.includes("emoji") || v.includes("emoj!") || v.startsWith("emd")
}


function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function scoreNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : Number(String(value).trim())
  return Number.isFinite(n) ? n : null
}

function completedGame(game: ResultGame) {
  return game.status === "completed" && scoreNumber(game.homeScore) !== null && scoreNumber(game.awayScore) !== null
}

function resultForTeam(game: ResultGame, team: string) {
  const key = normalizeTeam(team)
  const home = normalizeTeam(game.homeTeam)
  const away = normalizeTeam(game.awayTeam)
  if (home !== key && away !== key) return null
  const homeScore = scoreNumber(game.homeScore)
  const awayScore = scoreNumber(game.awayScore)
  if (homeScore === null || awayScore === null) return null
  const own = home === key ? homeScore : awayScore
  const other = home === key ? awayScore : homeScore
  return own > other ? 1 : own < other ? 0 : 0.5
}

function calculateEmdPrediction(
  datasets: DivisionGames[],
  firstTeam: string,
  secondTeam: string,
): EmdPrediction | null {
  const first = normalizeTeam(firstTeam)
  const second = normalizeTeam(secondTeam)
  if (!first || !second || first === second) return null

  const relevant = datasets.filter(({ games }) =>
    games.some((game) => {
      const h = normalizeTeam(game.homeTeam)
      const a = normalizeTeam(game.awayTeam)
      return h === first || a === first || h === second || a === second
    }),
  )
  if (!relevant.length) return null

  const weightedGames = relevant
    .flatMap((dataset) => dataset.games
      .filter(completedGame)
      .map((game) => ({ game, weight: dataset.seasonWeight, isCurrent: dataset.isCurrent })))
    .sort((a, b) => a.game.date.localeCompare(b.game.date) || a.game.weekNumber - b.game.weekNumber)

  const currentGames = weightedGames.filter((item) => item.isCurrent)
  const previousGames = weightedGames.filter((item) => !item.isCurrent)

  const teamGames = (items: typeof weightedGames, team: string) =>
    items.filter(({ game }) => {
      const h = normalizeTeam(game.homeTeam)
      const a = normalizeTeam(game.awayTeam)
      return h === team || a === team
    })

  const currentFirst = teamGames(currentGames, first)
  const currentSecond = teamGames(currentGames, second)
  const previousFirst = teamGames(previousGames, first)
  const previousSecond = teamGames(previousGames, second)

  const firstAll = [...currentFirst, ...previousFirst]
  const secondAll = [...currentSecond, ...previousSecond]

  // Mindestens echte Vergleichsdaten für beide Teams. Vorjahresdaten dürfen am Saisonanfang helfen.
  if (firstAll.length < 2 || secondAll.length < 2) return null

  // Elo-artige Teamstärke: aktuelle Saison 100 %, frühere hinterlegte Saison(en) 55 %.
  const ratings = new Map<string, number>()
  const rating = (team: string) => ratings.get(team) ?? 1500
  for (const { game, weight } of weightedGames) {
    const home = normalizeTeam(game.homeTeam)
    const away = normalizeTeam(game.awayTeam)
    const homeScore = scoreNumber(game.homeScore)
    const awayScore = scoreNumber(game.awayScore)
    if (!home || !away || homeScore === null || awayScore === null || !Number.isFinite(weight)) continue
    const rh = rating(home)
    const ra = rating(away)
    const expectedHome = 1 / (1 + Math.pow(10, (ra - rh) / 400))
    const actualHome = homeScore > awayScore ? 1 : homeScore < awayScore ? 0 : 0.5
    const margin = Math.abs(homeScore - awayScore)
    const k = 24 * (1 + Math.min(4, margin) * 0.08) * weight
    ratings.set(home, rh + k * (actualHome - expectedHome))
    ratings.set(away, ra + k * ((1 - actualHome) - (1 - expectedHome)))
  }
  const eloFirst = 1 / (1 + Math.pow(10, (rating(second) - rating(first)) / 400))

  // Form: aktuelle Spiele zuerst. Fehlen aktuelle Spiele, ergänzen wir wenige Vorjahresspiele mit Abschlag.
  const recentForm = (team: string, current: typeof weightedGames, previous: typeof weightedGames) => {
    const currentRecent = current
      .slice()
      .sort((a, b) => b.game.date.localeCompare(a.game.date) || b.game.weekNumber - a.game.weekNumber)
      .slice(0, 5)
      .map(({ game }) => ({ value: resultForTeam(game, team), weight: 1 }))
    const missing = Math.max(0, 5 - currentRecent.length)
    const previousRecent = previous
      .slice()
      .sort((a, b) => b.game.date.localeCompare(a.game.date) || b.game.weekNumber - a.game.weekNumber)
      .slice(0, missing)
      .map(({ game }) => ({ value: resultForTeam(game, team), weight: 0.55 }))
    const values = [...currentRecent, ...previousRecent].filter((x): x is { value: number; weight: number } => x.value !== null)
    if (!values.length) return 0.5
    const totalWeight = values.reduce((sum, x) => sum + x.weight, 0)
    return values.reduce((sum, x) => sum + x.value * x.weight, 0) / totalWeight
  }

  const formFirst = recentForm(firstTeam, currentFirst, previousFirst)
  const formSecond = recentForm(secondTeam, currentSecond, previousSecond)
  const formProbability = clamp(0.5 + (formFirst - formSecond) * 0.45, 0.08, 0.92)

  // Direkte Duelle über aktuelle + frühere Saison, alte Duelle zählen schwächer.
  const h2h = weightedGames.filter(({ game }) => {
    const h = normalizeTeam(game.homeTeam)
    const a = normalizeTeam(game.awayTeam)
    return (h === first && a === second) || (h === second && a === first)
  })
  let h2hProbability = 0.5
  if (h2h.length) {
    const latest = h2h.slice().sort((a, b) => b.game.date.localeCompare(a.game.date)).slice(0, 6)
    const values = latest
      .map(({ game, isCurrent }) => ({ value: resultForTeam(game, firstTeam), weight: isCurrent ? 1 : 0.6 }))
      .filter((x): x is { value: number; weight: number } => x.value !== null)
    if (values.length) {
      const totalWeight = values.reduce((sum, x) => sum + x.weight, 0)
      h2hProbability = values.reduce((sum, x) => sum + x.value * x.weight, 0) / totalWeight
    }
  }

  // Professioneller Mix für EMD: Saisonstärke + aktuelle Form + direkte Duelle.
  const h2hWeight = Math.min(0.22, h2h.length * 0.055)
  const formWeight = 0.25
  const eloWeight = 1 - formWeight - h2hWeight
  const firstStrength = clamp(
    eloFirst * eloWeight + formProbability * formWeight + h2hProbability * h2hWeight,
    0.06,
    0.94,
  )

  const currentCompleted = currentGames.map((x) => x.game)
  const previousCompleted = previousGames.map((x) => x.game)
  const drawBaseCurrent = currentCompleted.length
    ? currentCompleted.filter((g) => {
        const h = scoreNumber(g.homeScore)
        const a = scoreNumber(g.awayScore)
        return h !== null && a !== null && h === a
      }).length / currentCompleted.length
    : null
  const drawBasePrevious = previousCompleted.length
    ? previousCompleted.filter((g) => {
        const h = scoreNumber(g.homeScore)
        const a = scoreNumber(g.awayScore)
        return h !== null && a !== null && h === a
      }).length / previousCompleted.length
    : null
  const divisionDrawRateRaw = drawBaseCurrent !== null
    ? (drawBasePrevious !== null ? drawBaseCurrent * 0.8 + drawBasePrevious * 0.2 : drawBaseCurrent)
    : (drawBasePrevious ?? 0)
  const divisionDrawRate = Number.isFinite(divisionDrawRateRaw) ? divisionDrawRateRaw : 0

  if (!Number.isFinite(firstStrength)) return null
  const closenessRaw = 1 - Math.abs(firstStrength - 0.5) * 2
  const closeness = Number.isFinite(closenessRaw) ? clamp(closenessRaw, 0, 1) : 0
  const drawProbabilityRaw = divisionDrawRate * (0.65 + closeness * 0.7)
  const drawProbability = Number.isFinite(drawProbabilityRaw) ? clamp(drawProbabilityRaw, 0, 0.24) : 0
  const remaining = 1 - drawProbability

  let firstWin = Math.round(firstStrength * remaining * 100)
  let draw = Math.round(drawProbability * 100)
  let secondWin = 100 - firstWin - draw
  if (![firstWin, draw, secondWin].every(Number.isFinite)) return null
  if (secondWin < 0) {
    secondWin = 0
    firstWin = 100 - draw
  }

  const uniqueGames = new Set<string>()
  for (const item of [...firstAll, ...secondAll]) uniqueGames.add(item.game.gameId)
  const sampleSize = uniqueGames.size
  const currentMin = Math.min(currentFirst.length, currentSecond.length)
  const totalMin = Math.min(firstAll.length, secondAll.length)
  const confidence: EmdPrediction["confidence"] =
    currentMin >= 6 && totalMin >= 8 ? "hoch" :
    currentMin >= 3 && totalMin >= 5 ? "mittel" : "niedrig"

  return {
    firstTeam,
    secondTeam,
    firstWin,
    draw,
    secondWin,
    sampleSize,
    headToHead: h2h.length,
    currentFirstGames: currentFirst.length,
    currentSecondGames: currentSecond.length,
    previousFirstGames: previousFirst.length,
    previousSecondGames: previousSecond.length,
    confidence,
  }
}
function formatDate(value: string) {
  const d = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(d)
}

function formatTime(value: Date | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("de-AT", { hour: "2-digit", minute: "2-digit" }).format(value)
}

async function loadOwnLeagueBlocks(): Promise<{ current: LeagueBlock[]; prediction: LeagueBlock[] }> {
  const { data: assignmentData, error: assignmentError } = await supabase
    .from("team_sportdarts_assignments")
    .select("team_id,season_id,sportdarts_season_id,sportdarts_division_id,sportdarts_division_name,created_at,updated_at")
    .order("updated_at", { ascending: false })

  if (assignmentError) throw assignmentError

  const rows = (assignmentData || []) as Assignment[]
  const latestByTeam = new Map<string, Assignment>()
  for (const row of rows) {
    if (!latestByTeam.has(row.team_id)) latestByTeam.set(row.team_id, row)
  }

  const currentRows = Array.from(latestByTeam.values())
  if (!currentRows.length) return { current: [], prediction: [] }

  const teamIds = [...new Set(currentRows.map((row) => row.team_id))]
  const { data: teamData, error: teamError } = await supabase
    .from("teams")
    .select("id,name")
    .in("id", teamIds)

  if (teamError) throw teamError

  const teamNames = new Map(((teamData || []) as Array<{ id: string; name: string }>).map((t) => [t.id, t.name]))

  const groupRows = (input: Assignment[]) => {
    const grouped = new Map<string, LeagueBlock>()
    for (const row of input) {
      const name = teamNames.get(row.team_id)
      if (!name) continue
      const key = `${row.sportdarts_season_id}:${row.sportdarts_division_id}`
      const existing = grouped.get(key)
      if (existing) {
        if (!existing.teamNames.includes(name)) existing.teamNames.push(name)
      } else {
        grouped.set(key, {
          key,
          seasonId: row.sportdarts_season_id,
          divisionId: row.sportdarts_division_id,
          divisionName: row.sportdarts_division_name,
          teamNames: [name],
        })
      }
    }
    return Array.from(grouped.values())
  }

  const previousRows: Assignment[] = []
  for (const current of currentRows) {
    const older = rows
      .filter((row) => row.team_id === current.team_id && row.sportdarts_season_id < current.sportdarts_season_id)
      .sort((a, b) => b.sportdarts_season_id - a.sportdarts_season_id || String(b.updated_at || "").localeCompare(String(a.updated_at || "")))
    if (older[0]) previousRows.push(older[0])
  }

  const current = groupRows(currentRows)
  const previous = groupRows(previousRows)
  const seen = new Set(current.map((block) => block.key))
  const prediction = [...current, ...previous.filter((block) => !seen.has(block.key))]
  return { current, prediction }
}
export function useSportdartsTvData(): SportdartsTvData {
  const [live, setLive] = useState<LiveGame[]>([])
  const [ownGames, setOwnGames] = useState<ResultGame[]>([])
  const [divisionGames, setDivisionGames] = useState<DivisionGames[]>([])
  const [ownTeamNames, setOwnTeamNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const blocksRef = useRef<{ current: LeagueBlock[]; prediction: LeagueBlock[] } | null>(null)

  const loadLive = useCallback(async () => {
    try {
      const response = await fetch("/api/sportdarts/live", { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "LIVE-Spiele konnten nicht geladen werden.")
      const games = ((payload?.games || []) as LiveGame[])
        .filter((g) => g.status === "started")
        .sort((a, b) => a.division.localeCompare(b.division, "de") || a.weekNumber - b.weekNumber)
      setLive(games)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("EMD TV Sportdarts live failed", error)
    }
  }, [])

  const loadOwnGames = useCallback(async () => {
    try {
      const blockSets = blocksRef.current ?? await loadOwnLeagueBlocks()
      blocksRef.current = blockSets
      const blocks = blockSets.current
      const predictionBlocks = blockSets.prediction
      setOwnTeamNames(Array.from(new Set(blocks.flatMap((block) => block.teamNames))))
      if (!blocks.length) {
        setOwnGames([])
        setDivisionGames([])
        return
      }

      const responses = await Promise.all(
        blocks.map(async (block) => {
          const response = await fetch("/api/sportdarts/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seasonId: block.seasonId, divisionId: block.divisionId }),
            cache: "no-store",
          })
          const payload = await response.json()
          if (!response.ok) return { block, all: [] as ResultGame[], own: [] as ResultGame[] }

          const all = ((payload?.games || []) as ResultGame[]).map((game) => ({ ...game, divisionName: block.divisionName }))
          const ownNames = block.teamNames.map(normalizeTeam)
          const own = all.filter((game) => ownNames.includes(normalizeTeam(game.homeTeam)) || ownNames.includes(normalizeTeam(game.awayTeam)))
          return { block, all, own }
        }),
      )

      const currentKeys = new Set(blocks.map((block) => block.key))
      const previousBlocks = predictionBlocks.filter((block) => !currentKeys.has(block.key))
      const previousResponses = await Promise.all(
        previousBlocks.map(async (block) => {
          const response = await fetch("/api/sportdarts/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seasonId: block.seasonId, divisionId: block.divisionId }),
            cache: "no-store",
          })
          const payload = await response.json()
          if (!response.ok) return { block, all: [] as ResultGame[] }
          const all = ((payload?.games || []) as ResultGame[]).map((game) => ({ ...game, divisionName: block.divisionName }))
          return { block, all }
        }),
      )

      setDivisionGames([
        ...responses.map(({ block, all }) => ({
          key: block.key, divisionName: block.divisionName, seasonId: block.seasonId, seasonWeight: 1, isCurrent: true, games: all,
        })),
        ...previousResponses.map(({ block, all }) => ({
          key: block.key, divisionName: block.divisionName, seasonId: block.seasonId, seasonWeight: 0.55, isCurrent: false, games: all,
        })),
      ])
      const unique = new Map<string, ResultGame>()
      responses.flatMap((item) => item.own).forEach((game) => unique.set(game.gameId, game))
      setOwnGames(Array.from(unique.values()))
      setLastUpdated(new Date())
    } catch (error) {
      console.error("EMD TV Sportdarts results failed", error)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let liveTimer: number | null = null
    let resultTimer: number | null = null
    let latestLiveCount = 0

    const clearTimers = () => {
      if (liveTimer) window.clearTimeout(liveTimer)
      if (resultTimer) window.clearTimeout(resultTimer)
      liveTimer = null
      resultTimer = null
    }

    const refreshLive = async () => {
      try {
        const response = await fetch("/api/sportdarts/live", { cache: "no-store" })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || "LIVE-Spiele konnten nicht geladen werden.")
        const games = ((payload?.games || []) as LiveGame[])
          .filter((g) => g.status === "started")
          .sort((a, b) => a.division.localeCompare(b.division, "de") || a.weekNumber - b.weekNumber)
        latestLiveCount = games.length
        if (!cancelled) {
          setLive(games)
          setLastUpdated(new Date())
        }
      } catch (error) {
        console.error("EMD TV Sportdarts live failed", error)
      }
    }

    const scheduleLive = () => {
      if (cancelled || document.hidden) return
      const now = new Date()
      const delay = isLivePollingWindow(now)
        ? (latestLiveCount > 0 ? LIVE_REFRESH_WHEN_ACTIVE_MS : LIVE_REFRESH_WHEN_IDLE_MS)
        : msUntilNextLiveWindow(now)

      liveTimer = window.setTimeout(async () => {
        if (document.hidden) return
        await refreshLive()
        scheduleLive()
      }, delay)
    }

    const scheduleResults = () => {
      if (cancelled || document.hidden || !isLivePollingWindow(new Date())) return
      resultTimer = window.setTimeout(async () => {
        if (!document.hidden) await loadOwnGames()
        scheduleResults()
      }, RESULTS_REFRESH_MS)
    }

    const handleVisibility = () => {
      clearTimers()
      if (!document.hidden) {
        void (async () => {
          await refreshLive()
          scheduleLive()
          if (isLivePollingWindow(new Date())) {
            await loadOwnGames()
            scheduleResults()
          }
        })()
      }
    }

    async function initial() {
      await Promise.all([refreshLive(), loadOwnGames()])
      if (!cancelled) {
        setLoading(false)
        scheduleLive()
        scheduleResults()
      }
    }

    void initial()
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      cancelled = true
      clearTimers()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [loadOwnGames])

  const today = new Date().toISOString().slice(0, 10)

  const ownLive = useMemo(() => {
    const own = new Set(ownTeamNames.map(normalizeTeam))
    if (!own.size) return []
    return live.filter((game) => own.has(normalizeTeam(game.homeTeam)) || own.has(normalizeTeam(game.awayTeam)))
  }, [live, ownTeamNames])

  const upcoming = useMemo(
    () => ownGames
      .filter((g) => g.status === "scheduled" && g.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.weekNumber - b.weekNumber)
      .slice(0, 6),
    [ownGames, today],
  )

  const results = useMemo(
    () => ownGames
      .filter((g) => g.status === "completed")
      .sort((a, b) => b.date.localeCompare(a.date) || b.weekNumber - a.weekNumber)
      .slice(0, 6),
    [ownGames],
  )

  const getPrediction = useCallback((firstTeam: string, secondTeam: string) => {
    const first = normalizeTeam(firstTeam)
    const second = normalizeTeam(secondTeam)
    const matching = divisionGames.filter(({ games }) =>
      games.some((game) => {
        const h = normalizeTeam(game.homeTeam)
        const a = normalizeTeam(game.awayTeam)
        return h === first || a === first || h === second || a === second
      }),
    )
    if (!matching.length) return null
    return calculateEmdPrediction(matching, firstTeam, secondTeam)
  }, [divisionGames])

  return { live, ownLive, ownTeamNames, upcoming, results, getPrediction, loading, lastUpdated }
}

function TvBackdrop({ tone }: { tone: "live" | "orange" | "cyan" }) {
  const glow = tone === "live" ? "bg-red-500/[.09]" : tone === "cyan" ? "bg-cyan-400/[.09]" : "bg-orange-500/[.10]"
  const glow2 = tone === "live" ? "bg-orange-500/[.05]" : tone === "cyan" ? "bg-orange-500/[.06]" : "bg-cyan-400/[.055]"
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[url('/terminal/hero-startscreen.png')] bg-cover bg-[66%_50%] opacity-[.19]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(3,5,8,.97),rgba(4,6,9,.90)_48%,rgba(3,5,8,.95))]" />
      <div className={`absolute -left-[10vw] bottom-[-20vh] h-[44vw] w-[44vw] rounded-full ${glow} blur-[9vw]`} />
      <div className={`absolute -right-[8vw] top-[-16vh] h-[38vw] w-[38vw] rounded-full ${glow2} blur-[8vw]`} />
      <div className="absolute inset-x-0 top-[16vh] h-px bg-gradient-to-r from-transparent via-white/[.07] to-transparent" />
      <div className="absolute bottom-[3vh] right-[3vw] text-[clamp(5rem,11vw,12rem)] font-black tracking-[-.08em] text-white/[.018]">EMD</div>
    </div>
  )
}

function TvHeader({
  kicker,
  title,
  accent,
  right,
}: {
  kicker: string
  title: React.ReactNode
  accent: "red" | "orange" | "cyan"
  right?: React.ReactNode
}) {
  const kickerTone = accent === "red" ? "text-red-300/80" : accent === "cyan" ? "text-cyan-200/80" : "text-orange-300/80"
  return (
    <header className="relative z-10 flex items-end justify-between gap-8 border-b border-white/[.06] pb-[2.2vh]">
      <div className="min-w-0">
        <div className={`text-[clamp(.68rem,.82vw,.9rem)] font-black uppercase tracking-[.32em] ${kickerTone}`}>{kicker}</div>
        <h1 className="mt-[.8vh] text-[clamp(2.8rem,4.6vw,5.45rem)] font-black leading-[.88] tracking-[-.065em] text-white">{title}</h1>
      </div>
      {right ? <div className="shrink-0 pb-[.4vh]">{right}</div> : null}
    </header>
  )
}

function ScoreBox({ home, away, live = false, upcoming = false }: { home: number | null; away: number | null; live?: boolean; upcoming?: boolean }) {
  if (upcoming) {
    return (
      <div className="grid h-[7.6vh] min-h-[66px] w-[7.4vw] min-w-[112px] place-items-center rounded-[1.2vw] border border-orange-300/20 bg-orange-500/[.085] text-[clamp(1rem,1.35vw,1.6rem)] font-black uppercase tracking-[.2em] text-orange-200 shadow-[0_16px_42px_rgba(0,0,0,.28)]">
        VS
      </div>
    )
  }

  return (
    <div className={`grid h-[7.6vh] min-h-[66px] w-[8.4vw] min-w-[126px] place-items-center rounded-[1.2vw] border px-[.8vw] text-[clamp(1.75rem,2.55vw,3rem)] font-black tabular-nums tracking-[-.07em] shadow-[0_16px_42px_rgba(0,0,0,.28)] ${live ? "border-red-300/20 bg-red-500/[.085] text-white" : "border-white/[.09] bg-black/35 text-white"}`}>
      <div>{home ?? "–"}<span className="px-[.45vw] text-white/24">:</span>{away ?? "–"}</div>
    </div>
  )
}

function TeamName({ name, side }: { name: string; side: "left" | "right" }) {
  const own = isEmdTeam(name)
  return (
    <div className={`${side === "left" ? "text-right" : "text-left"} min-w-0 text-[clamp(1.05rem,1.52vw,1.72rem)] font-black leading-[1.02] tracking-[-.035em] ${own ? "text-orange-200" : "text-white/88"}`}>
      <span className="line-clamp-2">{name}</span>
    </div>
  )
}

function MatchCard({
  game,
  mode,
  prediction = null,
}: {
  game: LiveGame | ResultGame
  mode: "live" | "upcoming" | "results"
  prediction?: EmdPrediction | null
}) {
  const live = mode === "live"
  const upcoming = mode === "upcoming"
  const division = "division" in game ? game.division : game.divisionName || "Sportdarts"
  const date = "date" in game ? formatDate(game.date) : null
  const accent = live ? "bg-red-400" : upcoming ? "bg-orange-400" : "bg-cyan-300"
  const accentText = live ? "text-red-200" : upcoming ? "text-orange-200" : "text-cyan-100"

  return (
    <article className="group relative min-h-0 overflow-hidden rounded-[1.55vw] border border-white/[.085] bg-black/30 px-[1.5vw] py-[1.55vh] shadow-[0_24px_70px_rgba(0,0,0,.25)] backdrop-blur-xl">
      <div className={`absolute inset-y-[18%] left-0 w-[3px] rounded-r-full ${accent}`} />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,.024),transparent_44%)]" />

      <div className="relative z-10 flex h-full flex-col justify-center">
        <div className="mb-[1.05vh] flex items-center justify-between gap-4 text-[clamp(.54rem,.66vw,.72rem)] font-black uppercase tracking-[.14em] text-white/30">
          <span className="truncate">{division} · ST {game.weekNumber || "–"}</span>
          {live ? (
            <span className={`inline-flex items-center gap-2 ${accentText}`}>
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-45" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400" /></span>
              LIVE
            </span>
          ) : date ? (
            <span className={accentText}>{date}</span>
          ) : null}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[1.15vw]">
          <TeamName name={game.homeTeam} side="left" />
          <ScoreBox home={game.homeScore} away={game.awayScore} live={live} upcoming={upcoming} />
          <TeamName name={game.awayTeam} side="right" />
        </div>

        {upcoming && prediction ? (() => {
          const ownHome = isEmdTeam(game.homeTeam)
          const ownWin = ownHome ? prediction.firstWin : prediction.secondWin
          const loss = ownHome ? prediction.secondWin : prediction.firstWin
          return (
            <div className="mt-[1.25vh] flex items-center justify-center gap-[.7vw] border-t border-white/[.055] pt-[1vh] text-[clamp(.48rem,.59vw,.67rem)] font-black uppercase tracking-[.12em]">
              <span className="text-orange-300/80">EMD Prognose</span>
              <span className="text-emerald-200">{ownWin}% Sieg</span>
              <span className="text-white/20">·</span>
              <span className="text-white/56">{prediction.draw}% X</span>
              <span className="text-white/20">·</span>
              <span className="text-red-200/80">{loss}% Niederlage</span>
            </div>
          )
        })() : null}
      </div>
    </article>
  )
}


export function SportdartsLiveOverviewTv({ games, lastUpdated }: { games: LiveGame[]; lastUpdated: Date | null }) {
  const visible = games.slice(0, 6)
  return (
    <section className="relative h-full overflow-hidden px-[3.2vw] py-[3.1vh] text-white">
      <TvBackdrop tone="live" />
      <div className="relative z-10 flex h-full flex-col">
        <TvHeader
          kicker="EMD · SPORTDARTS LIGA"
          title={<><span>LIVE </span><span className="text-red-300">ZWISCHENSTÄNDE</span></>}
          accent="red"
          right={
            <div className="flex items-center gap-3 rounded-full border border-red-300/15 bg-red-500/[.07] px-[1vw] py-[.7vh] text-[clamp(.62rem,.78vw,.86rem)] font-black uppercase tracking-[.18em] text-red-200">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-45" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400" /></span>
              {games.length} LIVE{lastUpdated ? <span className="text-white/28">· {formatTime(lastUpdated)}</span> : null}
            </div>
          }
        />

        <div className="mt-[2.2vh] grid flex-1 grid-cols-2 grid-rows-3 gap-[1.15vw] min-h-0">
          {visible.map((game) => <MatchCard key={game.gameId} game={game} mode="live" />)}
          {visible.length === 0 ? (
            <div className="col-span-2 row-span-3 grid place-items-center rounded-[1.7vw] border border-white/[.08] bg-black/25 text-[clamp(1.3rem,2vw,2.2rem)] font-black text-white/35">Keine LIVE-Spiele</div>
          ) : null}
        </div>

        {games.length > 6 ? (
          <div className="mt-[1.3vh] text-right text-[clamp(.56rem,.7vw,.78rem)] font-black uppercase tracking-[.18em] text-white/28">+ {games.length - 6} weitere LIVE-Spiele</div>
        ) : null}
      </div>
    </section>
  )
}

export function SportdartsLiveTv({ game, lastUpdated, testMode = false }: { game?: LiveGame; lastUpdated: Date | null; testMode?: boolean }) {
  const [detail, setDetail] = useState<GameDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    if (!game?.gameId) {
      setDetail(null)
      return
    }

    const load = async () => {
      setDetailLoading(true)
      try {
        if (testMode) {
          const fake: GameDetail = {
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            homeScore: String(game.homeScore ?? 5),
            awayScore: String(game.awayScore ?? 3),
            homePlayers: [],
            awayPlayers: [],
            blocks: [
              {
                title: "Einzel 1–4",
                matches: [
                  { leftPlayer: "Jimmy", leftScore: "3", rightScore: "1", rightPlayer: "Ramona" },
                  { leftPlayer: "Christoph", leftScore: "2", rightScore: "2", rightPlayer: "Stefan" },
                  { leftPlayer: "Orhan", leftScore: "", rightScore: "", rightPlayer: "Andrea" },
                  { leftPlayer: "Bernhard", leftScore: "", rightScore: "", rightPlayer: "Michael" },
                ],
              },
              {
                title: "Doppel",
                matches: [
                  { leftPlayer: "Jimmy / Christoph", leftScore: "3", rightScore: "2", rightPlayer: "Ramona / Stefan" },
                  { leftPlayer: "Orhan / Bernhard", leftScore: "", rightScore: "", rightPlayer: "Andrea / Michael" },
                ],
              },
              {
                title: "Einzel 5–8",
                matches: [
                  { leftPlayer: "Jimmy", leftScore: "", rightScore: "", rightPlayer: "Stefan" },
                  { leftPlayer: "Christoph", leftScore: "", rightScore: "", rightPlayer: "Ramona" },
                  { leftPlayer: "Orhan", leftScore: "", rightScore: "", rightPlayer: "Michael" },
                  { leftPlayer: "Bernhard", leftScore: "", rightScore: "", rightPlayer: "Andrea" },
                ],
              },
            ],
          }
          if (!cancelled) setDetail(fake)
        } else {
          const response = await fetch(`/api/sportdarts/tv-game/${encodeURIComponent(game.gameId)}`, { cache: "no-store" })
          const payload = await response.json()
          if (!response.ok) throw new Error(payload?.error || "LIVE-Details konnten nicht geladen werden.")
          if (!cancelled) setDetail(payload as GameDetail)
        }
      } catch (error) {
        console.error("EMD TV Sportdarts live detail failed", error)
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }

    const scheduleDetailRefresh = () => {
      if (cancelled || testMode || document.hidden || !isLivePollingWindow(new Date())) return
      timer = window.setTimeout(async () => {
        if (!document.hidden) await load()
        scheduleDetailRefresh()
      }, LIVE_REFRESH_WHEN_ACTIVE_MS)
    }

    const handleVisibility = () => {
      if (timer) window.clearTimeout(timer)
      timer = null
      if (!document.hidden && !testMode && isLivePollingWindow(new Date())) {
        void load().then(scheduleDetailRefresh)
      }
    }

    void load().then(scheduleDetailRefresh)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [game?.gameId, testMode])

  if (!game) return null

  const blocks = structuredBlocks(detail)
  const visibleBlocks = blocks.slice(0, 6)
  const hasScore = (left: string, right: string) => {
    const l = String(left ?? "").trim()
    const r = String(right ?? "").trim()
    return Boolean(l && r && l !== "-" && r !== "-" && l !== "–" && r !== "–")
  }

  return (
    <section className="relative h-full overflow-hidden px-[3.5vw] pb-[3.2vh] pt-[3vh]">
      <TvBackdrop tone="live" />
      <div className="relative z-10 flex h-full flex-col">
        <TvHeader
          kicker="EMD · Sportdarts Liga"
          accent="red"
          title={<>LIVE <span className="text-red-400">SPIELPLAN</span></>}
          right={
            <div className="flex items-center gap-3 rounded-full border border-red-300/15 bg-red-500/[.07] px-[1vw] py-[.7vh] text-[clamp(.58rem,.7vw,.76rem)] font-black uppercase tracking-[.15em] text-red-100/70 backdrop-blur-xl">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-45" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400" /></span>
              {lastUpdated ? `LIVE · Stand ${formatTime(lastUpdated)}` : "LIVE"}
            </div>
          }
        />

        <div className="mt-[2vh] rounded-[1.7vw] border border-red-300/[.11] bg-black/34 px-[2vw] py-[1.45vh] shadow-[0_24px_70px_rgba(0,0,0,.30)] backdrop-blur-xl">
          <div className="mb-[.8vh] flex items-center justify-between gap-4 text-[clamp(.58rem,.7vw,.78rem)] font-black uppercase tracking-[.16em] text-white/32">
            <span>{game.division} · ST {game.weekNumber || "–"}</span>
            <span className="text-red-200/76">LÄUFT GERADE</span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[1.6vw]">
            <div className={`text-right text-[clamp(1.7rem,2.7vw,3.45rem)] font-black leading-[.94] tracking-[-.055em] ${isEmdTeam(game.homeTeam) ? "text-orange-300" : "text-white"}`}>{game.homeTeam}</div>
            <div className="min-w-[160px] rounded-[1.3vw] border border-red-300/16 bg-red-500/[.07] px-[1.35vw] py-[.95vh] text-center text-[clamp(2.5rem,3.7vw,4.55rem)] font-black leading-none tracking-[-.08em] tabular-nums text-white">
              {game.homeScore ?? "–"}<span className="px-[.45vw] text-white/22">:</span>{game.awayScore ?? "–"}
            </div>
            <div className={`text-left text-[clamp(1.7rem,2.7vw,3.45rem)] font-black leading-[.94] tracking-[-.055em] ${isEmdTeam(game.awayTeam) ? "text-orange-300" : "text-white"}`}>{game.awayTeam}</div>
          </div>
        </div>

        <div className="mt-[1.45vh] flex min-h-0 flex-1 flex-col">
          <div className="mb-[.8vh] flex items-center justify-between">
            <div className="text-[clamp(.62rem,.76vw,.86rem)] font-black uppercase tracking-[.24em] text-red-100/68">Paarungen · aktueller Spielplan</div>
            {detailLoading ? <div className="text-[clamp(.55rem,.65vw,.72rem)] font-bold uppercase tracking-[.12em] text-white/24">Aktualisiert …</div> : null}
          </div>

          {visibleBlocks.length ? (
            <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-[.8vw]">
              {visibleBlocks.map((block, blockIndex) => (
                <article key={`${block.title}-${blockIndex}`} className="min-h-0 overflow-hidden rounded-[1.35vw] border border-white/[.075] bg-black/30 px-[1.25vw] py-[1vh] backdrop-blur-xl">
                  <div className="mb-[.55vh] flex items-center gap-2 border-b border-white/[.055] pb-[.5vh] text-[clamp(.55rem,.68vw,.76rem)] font-black uppercase tracking-[.12em] text-red-100/72">
                    <Trophy className="h-[1.15em] w-[1.15em]" /> {block.title}
                  </div>
                  <div className="divide-y divide-white/[.045]">
                    {block.matches.slice(0, 4).map((match, matchIndex) => {
                      const played = hasScore(match.leftScore, match.rightScore)
                      return (
                        <div key={`${match.leftPlayer}-${match.rightPlayer}-${matchIndex}`} className="grid grid-cols-[minmax(0,1fr)_86px_minmax(0,1fr)] items-center gap-[.65vw] py-[.47vh]">
                          <div className="truncate text-right text-[clamp(.68rem,.88vw,1rem)] font-bold text-white/74">{match.leftPlayer || "Offen"}</div>
                          <div className={`text-center font-black tabular-nums ${played ? "text-[clamp(.78rem,1.02vw,1.15rem)] text-white" : "text-[clamp(.54rem,.68vw,.76rem)] uppercase tracking-[.11em] text-orange-200/72"}`}>
                            {played ? <>{match.leftScore}<span className="px-1 text-white/22">:</span>{match.rightScore}</> : "OFFEN"}
                          </div>
                          <div className="truncate text-left text-[clamp(.68rem,.88vw,1rem)] font-bold text-white/74">{match.rightPlayer || "Offen"}</div>
                        </div>
                      )
                    })}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid flex-1 place-items-center rounded-[1.4vw] border border-white/[.07] bg-black/24 text-center text-[clamp(.85rem,1vw,1.1rem)] font-bold text-white/34">
              {detailLoading ? "LIVE-Spielplan wird geladen …" : "Noch keine Paarungen verfügbar"}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function SportdartsMatchOfDayTv({ game, lastUpdated }: { game: LiveGame; lastUpdated: Date | null }) {
  const homeOwn = isEmdTeam(game.homeTeam)
  const awayOwn = isEmdTeam(game.awayTeam)
  return (
    <section className="relative h-full overflow-hidden px-[4vw] pb-[4vh] pt-[3.4vh]">
      <TvBackdrop tone="live" />
      <div className="absolute inset-0 opacity-[.12] bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,.28),transparent_34%)]" />
      <div className="relative z-10 flex h-full flex-col">
        <TvHeader
          kicker="EMD · Sportdarts Liga"
          accent="red"
          title={<>MATCH <span className="text-orange-400">OF THE DAY</span></>}
          right={
            <div className="flex items-center gap-3 rounded-full border border-red-300/15 bg-red-500/[.08] px-[1.1vw] py-[.75vh] text-[clamp(.62rem,.74vw,.82rem)] font-black uppercase tracking-[.16em] text-red-100/80 backdrop-blur-xl">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-45" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400" /></span>
              LIVE {lastUpdated ? `· ${formatTime(lastUpdated)}` : ""}
            </div>
          }
        />

        <div className="flex flex-1 items-center justify-center py-[4vh]">
          <div className="w-full max-w-[1500px] rounded-[2.4vw] border border-white/[.10] bg-black/34 px-[3.4vw] py-[4.8vh] shadow-[0_34px_110px_rgba(0,0,0,.42)] backdrop-blur-2xl">
            <div className="mb-[3vh] flex items-center justify-center gap-3 text-[clamp(.65rem,.82vw,.9rem)] font-black uppercase tracking-[.28em] text-white/36">
              <span>{game.division}</span><span className="text-white/14">•</span><span>Spieltag {game.weekNumber || "–"}</span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[2.6vw]">
              <div className={`text-right text-[clamp(2.2rem,4.4vw,5.7rem)] font-black leading-[.9] tracking-[-.065em] ${homeOwn ? "text-orange-300" : "text-white"}`}>{game.homeTeam}</div>
              <div className="min-w-[220px] rounded-[1.8vw] border border-red-300/20 bg-red-500/[.09] px-[2vw] py-[2.5vh] text-center shadow-[0_22px_70px_rgba(0,0,0,.34)]">
                <div className="text-[clamp(.64rem,.8vw,.9rem)] font-black uppercase tracking-[.26em] text-red-200/75">Zwischenstand</div>
                <div className="mt-[.5vh] text-[clamp(3.8rem,6.6vw,8rem)] font-black leading-none tracking-[-.08em] tabular-nums text-white">
                  {game.homeScore ?? "–"}<span className="px-[.65vw] text-white/22">:</span>{game.awayScore ?? "–"}
                </div>
              </div>
              <div className={`text-left text-[clamp(2.2rem,4.4vw,5.7rem)] font-black leading-[.9] tracking-[-.065em] ${awayOwn ? "text-orange-300" : "text-white"}`}>{game.awayTeam}</div>
            </div>
            <div className="mx-auto mt-[4vh] h-[3px] w-[12vw] bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_26px_rgba(251,146,60,.48)]" />
            <div className="mt-[2vh] text-center text-[clamp(.72rem,.95vw,1.08rem)] font-black uppercase tracking-[.34em] text-white/30">Unser Team · live im Ligabetrieb</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function LeagueCards({
  games,
  mode,
  getPrediction,
}: {
  games: ResultGame[]
  mode: "upcoming" | "results"
  getPrediction?: (firstTeam: string, secondTeam: string) => EmdPrediction | null
}) {
  const upcoming = mode === "upcoming"
  return (
    <section className="relative h-full overflow-hidden px-[3.5vw] pb-[3.4vh] pt-[3vh]">
      <TvBackdrop tone={upcoming ? "orange" : "cyan"} />
      <div className="relative z-10 flex h-full flex-col">
        <TvHeader
          kicker="EMD · Sportdarts Liga"
          accent={upcoming ? "orange" : "cyan"}
          title={upcoming ? <>UNSERE <span className="text-orange-400">NÄCHSTEN SPIELE</span></> : <>LETZTE <span className="text-cyan-200">ERGEBNISSE</span></>}
          right={upcoming ? <CalendarDays className="h-[2.4vw] w-[2.4vw] text-orange-300/38" /> : <Trophy className="h-[2.4vw] w-[2.4vw] text-cyan-200/38" />}
        />

        <div className="mt-[2.3vh] grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-[1.05vw]">
          {games.slice(0, 6).map((game) => (
            <MatchCard
              key={game.gameId}
              game={game}
              mode={mode}
              prediction={mode === "upcoming" ? getPrediction?.(game.homeTeam, game.awayTeam) ?? null : null}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export function SportdartsUpcomingTv({
  games,
  getPrediction,
}: {
  games: ResultGame[]
  getPrediction: (firstTeam: string, secondTeam: string) => EmdPrediction | null
}) {
  return <LeagueCards games={games} mode="upcoming" getPrediction={getPrediction} />
}

export function SportdartsResultsTv({ games }: { games: ResultGame[] }) {
  return <LeagueCards games={games} mode="results" />
}
