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

function tvPlayerImageUrl(src: string | null, width = 900, height = 1200, quality = 72) {
  if (!src) return null
  try {
    const u = new URL(src)
    const marker = "/storage/v1/object/public/"
    if (!u.pathname.includes(marker)) return src
    u.pathname = u.pathname.replace(marker, "/storage/v1/render/image/public/")
    u.searchParams.set("width", String(width))
    u.searchParams.set("height", String(height))
    u.searchParams.set("quality", String(quality))
    u.searchParams.set("resize", "contain")
    return u.toString()
  } catch {
    return src
  }
}

function preloadTvImage(src: string, fallbackSrc?: string, timeoutMs = 9000) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.decoding = "sync"
    img.loading = "eager"
    img.fetchPriority = "high"
    let done = false

    const finish = async () => {
      if (done) return
      done = true
      try { await img.decode?.() } catch {}
      resolve(img)
    }

    const timeout = window.setTimeout(() => void finish(), timeoutMs)
    img.onload = () => {
      window.clearTimeout(timeout)
      void finish()
    }
    img.onerror = () => {
      if (fallbackSrc && img.src !== fallbackSrc) {
        img.src = fallbackSrc
        return
      }
      window.clearTimeout(timeout)
      if (!done) {
        done = true
        resolve(null)
      }
    }
    img.src = src
  })
}

const tvGameDetailCache = new Map<string, GameDetail | null>()
let clubPlayerPhotoCache: Map<string, string> | null = null

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

function TvBroadcastMotion() {
  return (
    <style jsx global>{`
      @keyframes emdTvEnter {
        from { opacity: 0; transform: translate3d(0, 14px, 0) scale(.992); }
        to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
      }
      @keyframes emdTvCardIn {
        from { opacity: 0; transform: translate3d(28px, 0, 0) scale(.985); }
        to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
      }
      @keyframes emdTvScorePop {
        0% { opacity: 0; transform: scale(.88); }
        70% { opacity: 1; transform: scale(1.045); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes emdTvWipe {
        0% { transform: translate3d(-115%,0,0); opacity: 0; }
        12% { opacity: 1; }
        58% { opacity: 1; }
        100% { transform: translate3d(115%,0,0); opacity: 0; }
      }
      @keyframes emdTvAccentSweep {
        0% { transform: translate3d(-145%,0,0); opacity: 0; }
        20% { opacity: .85; }
        100% { transform: translate3d(250%,0,0); opacity: 0; }
      }
      .emd-tv-enter { animation: emdTvEnter .48s cubic-bezier(.2,.78,.2,1) both; will-change: transform, opacity; }
      .emd-tv-card-in { animation: emdTvCardIn .44s cubic-bezier(.2,.78,.2,1) both; will-change: transform, opacity; }
      .emd-tv-score-pop { animation: emdTvScorePop .42s cubic-bezier(.2,.8,.25,1) .16s both; will-change: transform, opacity; }
      .emd-tv-wipe { animation: emdTvWipe .58s cubic-bezier(.2,.8,.2,1) both; will-change: transform, opacity; }
      .emd-tv-accent-sweep { animation: emdTvAccentSweep .9s ease-out .42s both; will-change: transform, opacity; }
      @media (prefers-reduced-motion: reduce) {
        .emd-tv-enter,.emd-tv-card-in,.emd-tv-score-pop,.emd-tv-wipe,.emd-tv-accent-sweep { animation: none !important; }
      }
    `}</style>
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
      <div className="emd-tv-score-pop grid h-[7.6vh] min-h-[66px] w-[7.4vw] min-w-[112px] place-items-center rounded-[1.2vw] border border-orange-300/20 bg-orange-500/[.085] text-[clamp(1rem,1.35vw,1.6rem)] font-black uppercase tracking-[.2em] text-orange-200 shadow-[0_16px_42px_rgba(0,0,0,.28)]">
        VS
      </div>
    )
  }

  return (
    <div className={`emd-tv-score-pop grid h-[7.6vh] min-h-[66px] w-[8.4vw] min-w-[126px] place-items-center rounded-[1.2vw] border px-[.8vw] text-[clamp(1.75rem,2.55vw,3rem)] font-black tabular-nums tracking-[-.07em] shadow-[0_16px_42px_rgba(0,0,0,.28)] ${live ? "border-red-300/20 bg-red-500/[.085] text-white" : "border-white/[.09] bg-black/35 text-white"}`}>
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
  index = 0,
}: {
  game: LiveGame | ResultGame
  mode: "live" | "upcoming" | "results"
  prediction?: EmdPrediction | null
  index?: number
}) {
  const live = mode === "live"
  const upcoming = mode === "upcoming"
  const division = "division" in game ? game.division : game.divisionName || "Sportdarts"
  const date = "date" in game ? formatDate(game.date) : null
  const accent = live ? "bg-red-400" : upcoming ? "bg-orange-400" : "bg-cyan-300"
  const accentText = live ? "text-red-200" : upcoming ? "text-orange-200" : "text-cyan-100"

  return (
    <article style={{ animationDelay: `${Math.min(index, 6) * 80}ms` }} className="emd-tv-card-in group relative min-h-0 overflow-hidden rounded-[1.55vw] border border-white/[.085] bg-black/30 px-[1.5vw] py-[1.55vh] shadow-[0_24px_70px_rgba(0,0,0,.25)] backdrop-blur-xl">
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
    <section className="emd-tv-enter relative h-full overflow-hidden px-[3.2vw] py-[3.1vh] text-white">
      <TvBroadcastMotion />
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
          {visible.map((game, index) => <MatchCard key={game.gameId} game={game} mode="live" index={index} />)}
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
    <section className="emd-tv-enter relative h-full overflow-hidden px-[3.5vw] pb-[3.4vh] pt-[3vh]">
      <TvBroadcastMotion />
      <TvBackdrop tone={upcoming ? "orange" : "cyan"} />
      <div className="relative z-10 flex h-full flex-col">
        <TvHeader
          kicker="EMD · Sportdarts Liga"
          accent={upcoming ? "orange" : "cyan"}
          title={upcoming ? <>UNSERE <span className="text-orange-400">NÄCHSTEN SPIELE</span></> : <>LETZTE <span className="text-cyan-200">ERGEBNISSE</span></>}
          right={upcoming ? <CalendarDays className="h-[2.4vw] w-[2.4vw] text-orange-300/38" /> : <Trophy className="h-[2.4vw] w-[2.4vw] text-cyan-200/38" />}
        />

        <div className="mt-[2.3vh] grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-[1.05vw]">
          {games.slice(0, 6).map((game, index) => (
            <MatchCard
              key={game.gameId}
              game={game}
              mode={mode}
              prediction={mode === "upcoming" ? getPrediction?.(game.homeTeam, game.awayTeam) ?? null : null}
              index={index}
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

type PlayerOfMatchEntry = {
  name: string
  team: string
  checks: number
}

function checksWon(value: string | null | undefined) {
  const raw = String(value || "").trim()
  if (!raw) return 0
  const beforeSlash = raw.split("/")[0]?.trim() || ""
  const match = beforeSlash.match(/\d+/)
  return match ? Number(match[0]) : 0
}

function cleanSportdartsPlayerName(value?: string | null) {
  return String(value || "")
    .replace(/\s+-\s+\d+\s*$/, "")
    .trim()
}

function calculatePlayersOfMatch(detail: GameDetail | null): PlayerOfMatchEntry[] {
  if (!detail) return []

  // Für PLAYER OF THE MATCH exakt die obere Sportdarts-Spielerliste verwenden.
  // Dort liefert die TV-Detail-API jeden Spieler einzeln als homePlayers/awayPlayers
  // und den Wert aus der Spalte "Checks" (z. B. "4 / 6").
  const players: PlayerOfMatchEntry[] = [
    ...(detail.homePlayers || []).map((player) => ({
      name: cleanSportdartsPlayerName(player.player),
      team: detail.homeTeam,
      checks: checksWon(player.checks),
    })),
    ...(detail.awayPlayers || []).map((player) => ({
      name: cleanSportdartsPlayerName(player.player),
      team: detail.awayTeam,
      checks: checksWon(player.checks),
    })),
  ].filter((player) => player.name && player.name !== "Offen")

  if (!players.length) return []

  // Immer die Top 3 anzeigen. So bleibt jede TV-Seite gleich aufgebaut,
  // auch wenn Platz 1 einen klaren Vorsprung hat.
  return players
    .sort((a, b) => b.checks - a.checks || a.name.localeCompare(b.name, "de"))
    .slice(0, 3)
}

function normalizePlayerName(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " " )
    .trim()
    .replace(/\s+/g, " " )
}


function resolveClubPlayerPhoto(name: string, photoByPlayer: Map<string, string>) {
  const key = normalizePlayerName(name)
  const exact = photoByPlayer.get(key)
  if (exact) return exact

  // Sportdarts liefert bei manchen Paar-/Teamzeilen mehrere Namen ohne saubere Trennung.
  // Dann trotzdem ein vorhandenes Vereinsfoto erkennen, statt fälschlich die Silhouette zu zeigen.
  const matches = Array.from(photoByPlayer.entries())
    .filter(([playerKey]) => playerKey.length >= 5 && (key.includes(playerKey) || playerKey.includes(key)))
    .sort((a, b) => b[0].length - a[0].length)

  return matches[0]?.[1] || null
}

function PlayerOfMatchTv({ game, detail, loading }: { game: ResultGame; detail: GameDetail | null; loading: boolean }) {
  const players = calculatePlayersOfMatch(detail)
  const plural = players.length > 1
  const [photoByPlayer, setPhotoByPlayer] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let cancelled = false
    if (!players.length) {
      setPhotoByPlayer(new Map())
      return
    }

    const loadPhotos = async () => {
      const { data, error } = await supabase
        .from("club_players")
        .select("name,photo_url")
        .eq("is_active", true)
        .not("photo_url", "is", null)

      if (cancelled || error) return
      const next = new Map<string, string>()
      ;((data || []) as Array<{ name: string; photo_url: string | null }>).forEach((row) => {
        if (row.photo_url) next.set(normalizePlayerName(row.name), row.photo_url)
      })
      setPhotoByPlayer(next)
    }

    void loadPhotos()
    return () => { cancelled = true }
  }, [players.map((p) => `${p.team}:${p.name}:${p.checks}`).join("|")])

  return (
    <section className="relative h-full overflow-hidden px-[4vw] pb-[4vh] pt-[3.4vh] text-white">
      <TvBackdrop tone="orange" />
      <div className="relative z-10 flex h-full flex-col">
        <TvHeader
          kicker="EMD · SPORTDARTS LIGA"
          title={<>{plural ? "PLAYERS" : "PLAYER"} <span className="text-orange-400">OF THE MATCH</span></>}
          accent="orange"
          right={<div className="text-right text-[clamp(.62rem,.78vw,.86rem)] font-black uppercase tracking-[.15em] text-white/34">{game.divisionName || "Sportdarts"} · ST {game.weekNumber || "–"}</div>}
        />

        <div className="mt-[3vh] flex items-center justify-center gap-[1.2vw] text-[clamp(1.15rem,1.7vw,2rem)] font-black text-white/64">
          <span className={isEmdTeam(game.homeTeam) ? "text-orange-200" : ""}>{game.homeTeam}</span>
          <span className="rounded-[1vw] border border-white/[.09] bg-black/35 px-[1.2vw] py-[.65vh] text-[clamp(1.65rem,2.4vw,2.8rem)] text-white">{game.homeScore ?? "–"} : {game.awayScore ?? "–"}</span>
          <span className={isEmdTeam(game.awayTeam) ? "text-orange-200" : ""}>{game.awayTeam}</span>
        </div>

        <div className={`mx-auto mt-[4.2vh] grid w-full max-w-[86vw] flex-1 items-center gap-[1.4vw] ${players.length <= 1 ? "grid-cols-1 max-w-[48vw]" : players.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {players.length ? players.map((player, index) => {
            const originalPhoto = resolveClubPlayerPhoto(player.name, photoByPlayer)
            const photo = originalPhoto ? (tvPlayerImageUrl(originalPhoto, 900, 1200, 72) || originalPhoto) : null
            return (
            <article key={`${player.team}-${player.name}`} className="relative flex min-h-[47vh] overflow-hidden rounded-[2vw] border border-orange-300/[.14] bg-black/34 shadow-[0_32px_90px_rgba(0,0,0,.38)] backdrop-blur-xl">
              <div className="absolute inset-x-[18%] top-0 z-20 h-[3px] bg-orange-400 shadow-[0_0_28px_rgba(251,146,60,.75)]" />
              <div className="relative w-[45%] shrink-0 overflow-hidden bg-black/35">
                {photo ? (
                  <>
                    <div className="absolute inset-[-10%] bg-cover bg-center opacity-30 blur-2xl" style={{ backgroundImage: `url('${photo}')` }} />
                    <img src={photo} alt="" loading="eager" decoding="sync" className="absolute bottom-0 left-1/2 h-[92%] w-[92%] -translate-x-1/2 object-contain object-bottom drop-shadow-[0_24px_40px_rgba(0,0,0,.5)]" />
                  </>
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_30%,rgba(251,146,60,.16),transparent_32%),linear-gradient(180deg,#111317,#050607)]">
                    <div className="relative h-[58%] w-[56%] opacity-70">
                      <div className="absolute left-1/2 top-[4%] h-[31%] w-[47%] -translate-x-1/2 rounded-full bg-white/[.12]" />
                      <div className="absolute bottom-[2%] left-1/2 h-[62%] w-[92%] -translate-x-1/2 rounded-t-[48%] bg-white/[.09]" />
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/65" />
              </div>

              <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center px-[1.8vw] py-[2.5vh] text-left">
                <div className="text-[clamp(.62rem,.78vw,.86rem)] font-black uppercase tracking-[.28em] text-orange-300/72">{players.length > 1 ? `TOP ${index + 1}` : "MATCH HERO"}</div>
                <div className="mt-[1.8vh] text-[clamp(1.75rem,3.2vw,4rem)] font-black uppercase leading-[.88] tracking-[-.065em] text-white">{player.name}</div>
                <div className={`mt-[1.5vh] text-[clamp(.7rem,.92vw,1rem)] font-black uppercase tracking-[.17em] ${isEmdTeam(player.team) ? "text-orange-200" : "text-white/42"}`}>{player.team}</div>
                <div className="mt-[2.5vh] h-px w-[38%] bg-white/10" />
                <div className="mt-[2vh] flex items-end gap-[.8vw]">
                  <div className="text-[clamp(3rem,5vw,6rem)] font-black leading-none tracking-[-.08em] text-orange-400">{player.checks}</div>
                  <div className="pb-[.45vh] text-[clamp(.65rem,.82vw,.9rem)] font-black uppercase tracking-[.22em] text-white/42">Checks</div>
                </div>
              </div>
            </article>
            )
          }) : (
            <div className="grid h-full min-h-[38vh] place-items-center rounded-[2vw] border border-white/[.08] bg-black/28 text-center">
              <div>
                <Trophy className="mx-auto h-14 w-14 text-orange-300/35" />
                <div className="mt-5 text-[clamp(1.2rem,1.8vw,2rem)] font-black text-white/42">{loading ? "Player of the Match wird ermittelt …" : "Keine Checks verfügbar"}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function playerOfMatchNameSize(name: string, count: number) {
  const len = name.trim().length
  if (count >= 3) {
    if (len >= 22) return "clamp(1.35rem,2.05vw,2.45rem)"
    if (len >= 16) return "clamp(1.55rem,2.35vw,2.8rem)"
    return "clamp(1.75rem,2.7vw,3.25rem)"
  }
  if (count === 2) {
    if (len >= 22) return "clamp(1.7rem,2.7vw,3.25rem)"
    if (len >= 16) return "clamp(2rem,3.15vw,3.75rem)"
    return "clamp(2.25rem,3.55vw,4.25rem)"
  }
  if (len >= 22) return "clamp(2.35rem,4.15vw,4.9rem)"
  if (len >= 16) return "clamp(2.75rem,4.8vw,5.7rem)"
  return "clamp(3.2rem,5.55vw,6.5rem)"
}

function PlayerOfMatchGamePage({
  game,
  detail,
  photoByPlayer,
  page,
  total,
}: {
  game: ResultGame
  detail: GameDetail | null
  photoByPlayer: Map<string, string>
  page: number
  total: number
}) {
  const winners = calculatePlayersOfMatch(detail).slice(0, 3)
  const count = Math.max(1, winners.length)

  return (
    <section key={`potm-${game.gameId}-${page}`} className="emd-tv-enter relative h-full overflow-hidden px-[3.6vw] pb-[3.7vh] pt-[3.1vh] text-white">
      <TvBroadcastMotion />
      <TvBackdrop tone="orange" />
      <div className="pointer-events-none absolute inset-0 z-[60] overflow-hidden">
        <div className="emd-tv-wipe absolute inset-y-0 left-0 w-[34%] skew-x-[-12deg] bg-gradient-to-r from-transparent via-orange-400/75 to-orange-300/15 shadow-[0_0_45px_rgba(251,146,60,.22)]" />
      </div>
      <div className="relative z-10 flex h-full flex-col">
        <TvHeader
          kicker="EMD · SPORTDARTS LIGA"
          title={<>TOP 3 <span className="text-orange-400">OF THE MATCH</span></>}
          accent="orange"
          right={
            <div className="text-right">
              <div className="text-[clamp(.55rem,.67vw,.74rem)] font-black uppercase tracking-[.18em] text-orange-300/65">
                SPIEL {page} / {total}
              </div>
              <div className="mt-[.4vh] text-[clamp(.58rem,.72vw,.8rem)] font-black uppercase tracking-[.12em] text-white/32">
                {game.divisionName || "Sportdarts"} · ST {game.weekNumber || "–"}
              </div>
            </div>
          }
        />

        <div className="mx-auto mt-[2.2vh] flex w-full max-w-[82vw] items-center justify-center gap-[1.1vw] text-[clamp(1rem,1.42vw,1.65rem)] font-black">
          <span className={`max-w-[31vw] truncate text-right ${isEmdTeam(game.homeTeam) ? "text-orange-200" : "text-white/68"}`}>{game.homeTeam}</span>
          <span className="emd-tv-score-pop shrink-0 rounded-[1vw] border border-white/[.10] bg-black/36 px-[1.1vw] py-[.6vh] text-[clamp(1.55rem,2.25vw,2.65rem)] tracking-[-.04em] text-white">
            {game.homeScore ?? "–"} : {game.awayScore ?? "–"}
          </span>
          <span className={`max-w-[31vw] truncate ${isEmdTeam(game.awayTeam) ? "text-orange-200" : "text-white/68"}`}>{game.awayTeam}</span>
        </div>

        {winners.length ? (
          <div className={`mx-auto mt-[2.6vh] grid min-h-0 w-full flex-1 items-stretch gap-[1.25vw] ${
            "max-w-[92vw] grid-cols-3"
          }`}>
            {winners.map((player, index) => {
              const originalPhoto = resolveClubPlayerPhoto(player.name, photoByPlayer)
              const photo = originalPhoto ? (tvPlayerImageUrl(originalPhoto, 760, 1180, 68) || originalPhoto) : null

              return (
                <article
                  key={`${game.gameId}-${player.team}-${player.name}`}
                  style={{ animationDelay: `${120 + index * 105}ms` }}
                  className="emd-tv-card-in relative min-h-0 overflow-hidden rounded-[2vw] border border-orange-300/[.13] bg-black/38 shadow-[0_30px_90px_rgba(0,0,0,.36)] backdrop-blur-xl"
                >
                  <div className="absolute inset-x-[15%] top-0 z-30 h-[3px] bg-orange-400 shadow-[0_0_26px_rgba(251,146,60,.7)]" />
                  {index === 0 ? <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden"><div className="emd-tv-accent-sweep absolute top-[18%] h-[18%] w-[48%] -rotate-6 bg-gradient-to-r from-transparent via-orange-300/18 to-transparent" /></div> : null}

                  <div className={`${"absolute inset-x-0 top-0 h-[59%]"} overflow-hidden bg-black/28`}>
                    {photo ? (
                      <>
                        <div
                          className="absolute inset-0 scale-[1.03] bg-cover bg-center opacity-18 blur-[1vw]"
                          style={{ backgroundImage: `url('${photo}')` }}
                        />
                        <img
                          src={photo}
                          alt=""
                          loading="eager"
                          decoding="sync"
                          fetchPriority="high"
                          draggable={false}
                          className="absolute inset-0 h-full w-full object-contain object-top drop-shadow-[0_28px_42px_rgba(0,0,0,.5)]"
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(251,146,60,.07),transparent_34%),linear-gradient(180deg,#0d0f12,#050607)]" />
                    )}
                    <div className={`${"absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/86"}`} />
                  </div>

                  <div className={`relative z-20 flex h-full min-w-0 flex-col ${
                    "justify-end px-[1.35vw] pb-[2.1vh] pt-[59%] text-center"
                  }`}>
                    <div className="text-[clamp(.55rem,.68vw,.76rem)] font-black uppercase tracking-[.25em] text-orange-300/72">
                      {`TOP ${index + 1}`}
                    </div>
                    <div
                      className={`${"mt-[.7vh]"} break-words font-black uppercase leading-[.86] tracking-[-.06em] text-white`}
                      style={{ fontSize: playerOfMatchNameSize(player.name, 3) }}
                    >
                      {player.name}
                    </div>
                    <div className={`mt-[.9vh] truncate text-[clamp(.58rem,.76vw,.84rem)] font-black uppercase tracking-[.12em] ${isEmdTeam(player.team) ? "text-orange-200" : "text-white/42"}`}>
                      {player.team}
                    </div>
                    <div className={`mt-[1.25vh] flex items-end ${"justify-center"} gap-[.65vw]`}>
                      <span className="text-[clamp(2.6rem,4.4vw,5.25rem)] font-black leading-none tracking-[-.08em] text-orange-400">{player.checks}</span>
                      <span className="pb-[.35vh] text-[clamp(.52rem,.65vw,.72rem)] font-black uppercase tracking-[.16em] text-white/34">
                        Checks
                      </span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="grid flex-1 place-items-center">
            <div className="text-center text-white/35">
              <Trophy className="mx-auto h-16 w-16 text-orange-300/30" />
              <div className="mt-5 text-[clamp(1.2rem,1.8vw,2rem)] font-black">Keine Checks verfügbar</div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export function SportdartsResultsTv({
  games,
  onComplete,
}: {
  games: ResultGame[]
  onComplete?: () => void
}) {
  const visibleGames = games.slice(0, 6)
  const gameKey = visibleGames.map((game) => game.gameId).join("|")
  const [details, setDetails] = useState<Map<string, GameDetail | null>>(new Map())
  const [photoByPlayer, setPhotoByPlayer] = useState<Map<string, string>>(new Map())
  const [detailsReady, setDetailsReady] = useState(false)
  const [photosReady, setPhotosReady] = useState(false)
  const [screenIndex, setScreenIndex] = useState(0)
  const imageCacheRef = useRef<HTMLImageElement[]>([])
  const completedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    completedRef.current = false
    setScreenIndex(0)
    setDetailsReady(false)

    if (!visibleGames.length) {
      setDetails(new Map())
      setDetailsReady(true)
      return
    }

    const load = async () => {
      const entries = await Promise.all(
        visibleGames.map(async (game) => {
          if (tvGameDetailCache.has(game.gameId)) {
            return [game.gameId, tvGameDetailCache.get(game.gameId) ?? null] as const
          }

          try {
            const response = await fetch(`/api/sportdarts/tv-game/${encodeURIComponent(game.gameId)}`, { cache: "no-store" })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload?.error || "Spieler des Spiels konnte nicht geladen werden.")
            const detail = payload as GameDetail
            tvGameDetailCache.set(game.gameId, detail)
            return [game.gameId, detail] as const
          } catch (error) {
            console.error(`EMD TV Player of the Match failed for ${game.gameId}`, error)
            tvGameDetailCache.set(game.gameId, null)
            return [game.gameId, null] as const
          }
        }),
      )

      if (!cancelled) {
        setDetails(new Map(entries))
        setDetailsReady(true)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [gameKey])

  const potmGames = useMemo(
    () => visibleGames.filter((game) => calculatePlayersOfMatch(details.get(game.gameId) || null).length > 0),
    [gameKey, details],
  )

  const winnersKey = useMemo(
    () => potmGames
      .flatMap((game) => calculatePlayersOfMatch(details.get(game.gameId) || null))
      .map((player) => normalizePlayerName(player.name))
      .sort()
      .join("|"),
    [potmGames, details],
  )

  useEffect(() => {
    let cancelled = false
    setPhotosReady(false)
    imageCacheRef.current = []

    if (!detailsReady) return

    const loadPhotos = async () => {
      let playerPhotos = clubPlayerPhotoCache

      if (!playerPhotos) {
        const { data, error } = await supabase
          .from("club_players")
          .select("name,photo_url")
          .eq("is_active", true)
          .not("photo_url", "is", null)

        if (error) {
          if (!cancelled) {
            setPhotoByPlayer(new Map())
            setPhotosReady(true)
          }
          return
        }

        playerPhotos = new Map<string, string>()
        ;((data || []) as Array<{ name: string; photo_url: string | null }>).forEach((row) => {
          if (row.photo_url) playerPhotos!.set(normalizePlayerName(row.name), row.photo_url)
        })
        clubPlayerPhotoCache = playerPhotos
      }

      if (cancelled) return
      setPhotoByPlayer(new Map(playerPhotos))

      const urls = Array.from(new Set(
        potmGames
          .flatMap((game) => calculatePlayersOfMatch(details.get(game.gameId) || null))
          .map((player) => resolveClubPlayerPhoto(player.name, playerPhotos!))
          .filter((value): value is string => Boolean(value))
      ))

      if (!urls.length) {
        if (!cancelled) setPhotosReady(true)
        return
      }

      const decoded = await Promise.all(
        urls.map((original) => preloadTvImage(tvPlayerImageUrl(original, 760, 1180, 68) || original, original))
      )

      if (!cancelled) {
        imageCacheRef.current = decoded.filter((img): img is HTMLImageElement => Boolean(img))
        setPhotosReady(true)
      }
    }

    void loadPhotos()
    return () => {
      cancelled = true
      imageCacheRef.current = []
    }
  }, [detailsReady, winnersKey])

  useEffect(() => {
    if (!visibleGames.length) {
      if (!completedRef.current) {
        completedRef.current = true
        onComplete?.()
      }
      return
    }

    // Ergebnisübersicht bleibt sichtbar, bis Detaildaten und Gewinner-Fotos vorbereitet sind.
    if (screenIndex === 0) {
      if (!detailsReady || !photosReady) return
      const delay = potmGames.length ? 7000 : 9000
      const timer = window.setTimeout(() => {
        if (potmGames.length) {
          setScreenIndex(1)
        } else if (!completedRef.current) {
          completedRef.current = true
          onComplete?.()
        }
      }, delay)
      return () => window.clearTimeout(timer)
    }

    const currentPotmIndex = screenIndex - 1
    const isLast = currentPotmIndex >= potmGames.length - 1
    const timer = window.setTimeout(() => {
      if (isLast) {
        if (!completedRef.current) {
          completedRef.current = true
          if (onComplete) onComplete()
          else setScreenIndex(0)
        }
      } else {
        setScreenIndex((index) => index + 1)
      }
    }, 6200)

    return () => window.clearTimeout(timer)
  }, [detailsReady, photosReady, onComplete, potmGames.length, screenIndex, visibleGames.length])

  if (screenIndex === 0 || !potmGames.length) {
    return <LeagueCards games={games} mode="results" />
  }

  const game = potmGames[Math.min(screenIndex - 1, potmGames.length - 1)]
  return (
    <PlayerOfMatchGamePage
      game={game}
      detail={details.get(game.gameId) || null}
      photoByPlayer={photoByPlayer}
      page={Math.min(screenIndex, potmGames.length)}
      total={potmGames.length}
    />
  )
}

