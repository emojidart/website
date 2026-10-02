"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  AlertCircle,
  RefreshCw,
  Table2,
  Trophy,
  Users,
  ChevronDown,
  CircleDot,
  UserRound,
  Globe2,
  ListChecks,
  CalendarDays,
  Target,
} from "lucide-react"

type SelectOption = {
  value: string
  label: string
  selected: boolean
}

type TableData = {
  headers: string[]
  rows: string[][]
}

type LeagueResponse = {
  title: string
  seasons: SelectOption[]
  divisions: SelectOption[]
  teamTable: TableData
  playerTable: TableData
  openRounds: string[]
  source: string
  updatedAt: string
  error?: string
}

type MyTeam = { id: string; name: string }

type SportdartsAssignment = {
  team_id: string
  season_id: string
  sportdarts_season_id: number
  sportdarts_division_id: number
  sportdarts_division_name: string
}

type MyLeagueBlock = {
  key: string
  seasonId: string
  divisionId: string
  divisionName: string
  teams: MyTeam[]
  data: LeagueResponse | null
  loading: boolean
  error: string | null
}


type SportdartsResultGame = {
  gameId: string
  weekNumber: number
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: "scheduled" | "live" | "completed"
  detailUrl: string
}

type MyTeamResultsState = {
  loading: boolean
  error: string | null
  games: SportdartsResultGame[]
}


type SportdartsPlayerCheck = {
  player: string
  checks: string
}

type SportdartsBlockMatch = {
  leftPlayer: string
  leftScore: string
  rightScore: string
  rightPlayer: string
}

type SportdartsMatchBlock = {
  title: string
  matches: SportdartsBlockMatch[]
}

type SportdartsGameDetail = {
  homeTeam: string
  awayTeam: string
  homeScore: string
  awayScore: string
  homePlayers: SportdartsPlayerCheck[]
  awayPlayers: SportdartsPlayerCheck[]
  blocks: SportdartsMatchBlock[]
}

type SportdartsGameDetailState = {
  loading: boolean
  error: string | null
  data: SportdartsGameDetail | null
}

const DEFAULT_SEASON = "27"
const DEFAULT_DIVISION = "2"

function LeagueTable({
  title,
  subtitle,
  icon,
  table,
  highlightTeamNames = [],
  highlightPlayerNumber = null,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  table: TableData
  highlightTeamNames?: string[]
  highlightPlayerNumber?: number | string | null
}) {
  const normalizedHighlights = highlightTeamNames.map((name) => name.trim().toLowerCase())
  const isTeamHighlightedRow = (row: string[]) =>
    row.some((cell) => normalizedHighlights.includes((cell || "").trim().toLowerCase()))

  const playerNumberColumnIndex = table.headers.findIndex((header) => {
    const normalized = (header || "").trim().toLowerCase().replace(/\s+/g, "")
    return normalized === "nr." || normalized === "nr" || normalized === "nummer"
  })

  const normalizePlayerNumber = (value: unknown) =>
    String(value ?? "")
      .trim()
      .replace(/^0+/, "") || "0"

  const isPlayerHighlightedRow = (row: string[]) =>
    highlightPlayerNumber !== null &&
    highlightPlayerNumber !== undefined &&
    playerNumberColumnIndex >= 0 &&
    normalizePlayerNumber(row[playerNumberColumnIndex]) === normalizePlayerNumber(highlightPlayerNumber)

  if (!table?.rows?.length) {
    return (
      <section className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/25 p-5 backdrop-blur-xl">
        <div className="pointer-events-none absolute -left-10 bottom-[-42px] h-28 w-28 rounded-full bg-orange-500/[0.10] blur-[34px]" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-orange-300">
            {icon}
          </div>
          <div>
            <h2 className="font-black text-white">{title}</h2>
            <p className="text-sm text-white/38">Keine Daten vorhanden.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/25 shadow-[0_28px_85px_-55px_rgba(0,0,0,.96)] backdrop-blur-xl sm:rounded-[30px]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,.035),transparent_38%,rgba(14,165,233,.025)_82%,transparent)]" />
      <div className="pointer-events-none absolute -left-16 top-[-90px] h-52 w-52 rounded-full bg-orange-500/[0.08] blur-[80px]" />

      <div className="relative flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.12] bg-orange-500/[0.06] text-orange-200 shadow-[0_0_18px_rgba(249,115,22,.06)]">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.20em] text-orange-300/55">
              Mein EMD
            </div>
            <h2 className="truncate text-lg font-black tracking-[-0.02em] text-white">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-white/34">{subtitle}</p>
          </div>
        </div>

        <div className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[11px] font-black text-white/45">
          {table.rows.length} Einträge
        </div>
      </div>

      <div className="md:hidden">
        {(() => {
          const normalizedHeaders = table.headers.map((header) =>
            (header || "").trim().toLowerCase().replace(/\s+/g, " "),
          )

          const findHeaderIndex = (...names: string[]) =>
            normalizedHeaders.findIndex((header) => names.includes(header))

          const placeIndex = findHeaderIndex("pl.", "pl", "platz", "rang")
          const playerIndex = findHeaderIndex("spieler")
          const numberIndex = findHeaderIndex("nr.", "nr", "nummer")
          const teamIndex = findHeaderIndex("mannschaft", "team")

          const topIndexes = [placeIndex, playerIndex, numberIndex, teamIndex]
            .filter((index, pos, arr) => index >= 0 && arr.indexOf(index) === pos)

          const bottomIndexes = table.headers
            .map((_, index) => index)
            .filter((index) => !topIndexes.includes(index))

          const shortHeader = (header: string) => {
            const h = (header || "").trim()
            const n = h.toLowerCase()
            if (n === "mannschaft") return "Team"
            if (n === "spiele") return "Sp."
            if (n === "wins") return "Wins"
            if (n === "losses" || n === "niederlagen") return "Loss"
            if (n === "legs") return "Legs"
            if (n === "punkte") return "Pkt."
            if (n === "prozent" || n === "quote") return "%"
            return h
          }

          const isNameIndex = (index: number) =>
            index === playerIndex || index === teamIndex

          return (
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20">
              <div className="divide-y divide-white/[0.055]">
                {table.rows.map((row, rowIndex) => {
                  const playerHighlighted = isPlayerHighlightedRow(row)
                  const teamHighlighted = isTeamHighlightedRow(row)

                  return (
                    <div
                      key={rowIndex}
                      className={[
                        "px-2.5 py-2.5",
                        playerHighlighted
                          ? "bg-sky-500/[0.10] shadow-[inset_2px_0_0_rgba(56,189,248,.90)]"
                          : teamHighlighted
                            ? "bg-orange-500/[0.08] shadow-[inset_2px_0_0_rgba(249,115,22,.80)]"
                            : rowIndex % 2 === 1
                              ? "bg-white/[0.012]"
                              : "",
                      ].join(" ")}
                    >
                      {playerIndex >= 0 ? (
                        <div className="grid grid-cols-[28px_minmax(0,1.35fr)_42px_minmax(0,1fr)] items-center gap-1.5">
                          <div className="text-center text-[11px] font-black text-white/45">
                            {placeIndex >= 0 ? row[placeIndex] : ""}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-[12px] font-black leading-tight text-white/92">
                              {row[playerIndex]}
                            </div>
                          </div>

                          <div className="text-center text-[10px] font-bold text-white/48">
                            {numberIndex >= 0 ? row[numberIndex] : ""}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-[10px] font-bold leading-tight text-white/64">
                              {teamIndex >= 0 ? row[teamIndex] : ""}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-center text-[11px] font-black text-white/45">
                            {placeIndex >= 0 ? row[placeIndex] : ""}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-black leading-tight text-white/92">
                              {teamIndex >= 0 ? row[teamIndex] : row[0]}
                            </div>
                          </div>
                        </div>
                      )}

                      {bottomIndexes.length > 0 ? (
                        <div
                          className="mt-2 grid gap-1"
                          style={{
                            gridTemplateColumns: `repeat(${Math.min(bottomIndexes.length, 6)}, minmax(0, 1fr))`,
                          }}
                        >
                          {bottomIndexes.slice(0, 6).map((cellIndex) => {
                            const value = row[cellIndex]
                            const header = table.headers[cellIndex] || ""

                            return (
                              <div
                                key={cellIndex}
                                className="min-w-0 rounded-lg border border-white/[0.05] bg-black/18 px-1 py-1.5 text-center"
                              >
                                <div className="truncate text-[8px] font-black uppercase tracking-[0.03em] text-white/24">
                                  {shortHeader(header)}
                                </div>
                                <div className="mt-0.5 truncate text-[10px] font-black text-white/72">
                                  {value}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

      <div className="relative hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.065] bg-white/[0.018]">
              {table.headers.map((header, index) => (
                <th
                  key={`${header}-${index}`}
                  className="whitespace-nowrap px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.11em] text-white/34 sm:px-5"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={[
                  "border-b border-white/[0.05] transition duration-200 last:border-b-0 hover:bg-white/[0.03]",
                  isPlayerHighlightedRow(row)
                    ? "bg-sky-500/[0.10] shadow-[inset_3px_0_0_rgba(56,189,248,.88)]"
                    : isTeamHighlightedRow(row)
                      ? "bg-orange-500/[0.08] shadow-[inset_3px_0_0_rgba(249,115,22,.75)]"
                      : "",
                ].join(" ")}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={[
                      "whitespace-nowrap px-4 py-3.5 text-white/65 sm:px-5",
                      cellIndex === 0 ? "font-black text-orange-300/90" : "",
                      cellIndex === 1 ? "font-black text-white/88" : "",
                    ].join(" ")}
                  >
                    {cell || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function LeagueSection({
  initialMode = "table",
  fixedMode,
}: {
  initialMode?: "table" | "results"
  fixedMode?: "table" | "results"
}) {
  const [viewMode, setViewMode] = useState<"mine" | "all">("mine")
  const [seasonId, setSeasonId] = useState(DEFAULT_SEASON)
  const [divisionId, setDivisionId] = useState(DEFAULT_DIVISION)
  const [data, setData] = useState<LeagueResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [myLeagueBlocks, setMyLeagueBlocks] = useState<MyLeagueBlock[]>([])
  const [selectedMyLeagueKey, setSelectedMyLeagueKey] = useState<string>("")
  const [myLeagueContentMode, setMyLeagueContentMode] = useState<"table" | "results">(fixedMode ?? initialMode)
  const [myResultsFilter, setMyResultsFilter] = useState<"today" | "upcoming" | "completed">("today")
  const [myTeamResults, setMyTeamResults] = useState<Record<string, MyTeamResultsState>>({})
  const [openResultGameId, setOpenResultGameId] = useState<string | null>(null)
  const [resultGameDetails, setResultGameDetails] = useState<Record<string, SportdartsGameDetailState>>({})
  const [myLeagueLoading, setMyLeagueLoading] = useState(true)
  const [myLeagueError, setMyLeagueError] = useState<string | null>(null)
  const [myPlayerNumber, setMyPlayerNumber] = useState<number | null>(null)

  useEffect(() => {
    if (fixedMode) {
      setMyLeagueContentMode(fixedMode)
    }
  }, [fixedMode])

  const loadLeague = useCallback(async (season: string, division: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/sportdarts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId: season, divisionId: division }),
        cache: "no-store",
      })

      const result = (await response.json()) as LeagueResponse

      if (!response.ok) {
        throw new Error(result?.error || "Ligadaten konnten nicht geladen werden.")
      }

      setData(result)
    } catch (err: any) {
      setError(err?.message || "Ligadaten konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (viewMode === "all" && !data) loadLeague(seasonId, divisionId)
  }, [data, divisionId, loadLeague, seasonId, viewMode])

  const loadMyLeagues = useCallback(async () => {
    setMyLeagueLoading(true)
    setMyLeagueError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.getSession()
      if (authError) throw authError
      const userId = authData.session?.user?.id
      if (!userId) throw new Error("Du bist nicht angemeldet.")

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("player_id")
        .eq("user_id", userId)
        .maybeSingle()
      if (profileError) throw profileError
      if (!profile?.player_id) throw new Error("Für dein Benutzerkonto ist kein Spielerprofil verknüpft.")

      // user_profiles.player_id -> club_players.id
      // Die Sportdarts-Spielerstatistik besitzt ebenfalls eine Spalte "Nr.".
      // Dadurch kann der eingeloggte Spieler exakt über seine Spielernummer markiert werden.
      const { data: myPlayerRow, error: myPlayerError } = await supabase
        .from("club_players")
        .select("player_number")
        .eq("id", profile.player_id)
        .maybeSingle()

      if (myPlayerError) {
        console.error("Spielernummer konnte nicht geladen werden:", myPlayerError)
        setMyPlayerNumber(null)
      } else {
        const numberValue = myPlayerRow?.player_number
        setMyPlayerNumber(
          typeof numberValue === "number"
            ? numberValue
            : numberValue !== null && numberValue !== undefined && String(numberValue).trim() !== ""
              ? Number(numberValue)
              : null,
        )
      }

      const { data: memberships, error: membershipError } = await supabase
        .from("team_members")
        .select("team_id, teams(id, name)")
        .eq("player_id", profile.player_id)
        .is("left_at", null)
      if (membershipError) throw membershipError

      const teams: MyTeam[] = (memberships || [])
        .map((membership: any) => {
          const team = Array.isArray(membership.teams) ? membership.teams[0] : membership.teams
          return team?.id && team?.name ? { id: team.id, name: team.name } : null
        })
        .filter(Boolean) as MyTeam[]

      if (!teams.length) throw new Error("Du bist aktuell keiner Mannschaft zugeordnet.")

      // Keine Abhängigkeit mehr von seasons.is_active:
      // Die bereits hinterlegte Sportdarts-Zuordnung bestimmt, welche aktuelle
      // Liga/Division für die eigenen Teams angezeigt wird.
      const { data: assignments, error: assignmentError } = await supabase
        .from("team_sportdarts_assignments")
        .select("team_id, season_id, sportdarts_season_id, sportdarts_division_id, sportdarts_division_name, created_at, updated_at")
        .in("team_id", teams.map((team) => team.id))
        .order("updated_at", { ascending: false })
      if (assignmentError) throw assignmentError

      const assignmentRows = (assignments || []) as (SportdartsAssignment & {
        created_at?: string | null
        updated_at?: string | null
      })[]

      // Pro Team nur die zuletzt gepflegte saisonbezogene Zuordnung verwenden.
      // Damit werden alte Saison-Zuordnungen nicht zusätzlich angezeigt.
      const latestAssignmentByTeam = new Map<string, typeof assignmentRows[number]>()
      for (const assignment of assignmentRows) {
        if (!latestAssignmentByTeam.has(assignment.team_id)) {
          latestAssignmentByTeam.set(assignment.team_id, assignment)
        }
      }

      const currentAssignments = Array.from(latestAssignmentByTeam.values())

      const grouped = new Map<string, { seasonId: string; divisionId: string; divisionName: string; teams: MyTeam[] }>()

      for (const assignment of currentAssignments) {
        const team = teams.find((item) => item.id === assignment.team_id)
        if (!team) continue
        const key = `${assignment.sportdarts_season_id}:${assignment.sportdarts_division_id}`
        const existing = grouped.get(key)
        if (existing) {
          if (!existing.teams.some((item) => item.id === team.id)) existing.teams.push(team)
        } else {
          grouped.set(key, {
            seasonId: String(assignment.sportdarts_season_id),
            divisionId: String(assignment.sportdarts_division_id),
            divisionName: assignment.sportdarts_division_name,
            teams: [team],
          })
        }
      }

      if (!grouped.size) throw new Error("Für deine Mannschaft ist noch keine Sportdarts-Division hinterlegt.")

      const initial: MyLeagueBlock[] = Array.from(grouped.entries()).map(([key, item]) => ({
        key,
        ...item,
        data: null,
        loading: true,
        error: null,
      }))
      setMyLeagueBlocks(initial)
      setSelectedMyLeagueKey((current) =>
        current && initial.some((block) => block.key === current) ? current : initial[0]?.key || "",
      )

      const loaded = await Promise.all(initial.map(async (block) => {
        try {
          const response = await fetch("/api/sportdarts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seasonId: block.seasonId, divisionId: block.divisionId }),
            cache: "no-store",
          })
          const result = (await response.json()) as LeagueResponse
          if (!response.ok) throw new Error(result?.error || "Ligadaten konnten nicht geladen werden.")
          return { ...block, data: result, loading: false, error: null }
        } catch (err: any) {
          return { ...block, data: null, loading: false, error: err?.message || "Ligadaten konnten nicht geladen werden." }
        }
      }))

      setMyLeagueBlocks(loaded)
    } catch (err: any) {
      console.error("Eigene Ligatabellen konnten nicht geladen werden:", err)
      setMyLeagueBlocks([])
      setMyLeagueError(err?.message || "Deine Ligatabellen konnten nicht geladen werden.")
    } finally {
      setMyLeagueLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMyLeagues()
  }, [loadMyLeagues])

  const selectedMyLeagueBlock = useMemo(
    () => myLeagueBlocks.find((block) => block.key === selectedMyLeagueKey) ?? myLeagueBlocks[0] ?? null,
    [myLeagueBlocks, selectedMyLeagueKey],
  )


  const normalizeSportdartsTeamName = useCallback(
    (value?: string | null) =>
      (value || "")
        .replace(/&amp;/g, "&")
        .replace(/&#039;/g, "'")
        .replace(/&quot;/g, '"')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " "),
    [],
  )

  const loadMyTeamResults = useCallback(
    async (block: MyLeagueBlock) => {
      if (myTeamResults[block.key]?.loading) return

      setMyTeamResults((prev) => ({
        ...prev,
        [block.key]: {
          loading: true,
          error: null,
          games: prev[block.key]?.games || [],
        },
      }))

      try {
        const response = await fetch("/api/sportdarts/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seasonId: Number(block.seasonId),
            divisionId: Number(block.divisionId),
          }),
          cache: "no-store",
        })

        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || "Ergebnisse konnten nicht geladen werden.")
        }

        const ownNames = block.teams.map((team) => normalizeSportdartsTeamName(team.name))
        const games = ((payload?.games || []) as SportdartsResultGame[]).filter((game) => {
          const home = normalizeSportdartsTeamName(game.homeTeam)
          const away = normalizeSportdartsTeamName(game.awayTeam)
          return ownNames.includes(home) || ownNames.includes(away)
        })

        setMyTeamResults((prev) => ({
          ...prev,
          [block.key]: {
            loading: false,
            error: null,
            games,
          },
        }))
      } catch (err: any) {
        setMyTeamResults((prev) => ({
          ...prev,
          [block.key]: {
            loading: false,
            error: err?.message || "Ergebnisse konnten nicht geladen werden.",
            games: [],
          },
        }))
      }
    },
    [myTeamResults, normalizeSportdartsTeamName],
  )

  useEffect(() => {
    if (myLeagueContentMode === "results" && selectedMyLeagueBlock) {
      const existing = myTeamResults[selectedMyLeagueBlock.key]
      if (!existing || (!existing.loading && !existing.games.length && !existing.error)) {
        void loadMyTeamResults(selectedMyLeagueBlock)
      }
    }
  }, [loadMyTeamResults, myLeagueContentMode, myTeamResults, selectedMyLeagueBlock])


  const loadResultGameDetail = useCallback(
    async (gameId: string) => {
      const current = resultGameDetails[gameId]
      if (current?.loading || current?.data) return

      setResultGameDetails((prev) => ({
        ...prev,
        [gameId]: { loading: true, error: null, data: null },
      }))

      try {
        const response = await fetch(`/api/sportdarts/game/${encodeURIComponent(gameId)}`, {
          method: "GET",
          cache: "no-store",
        })

        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || "Spieldetails konnten nicht geladen werden.")
        }

        setResultGameDetails((prev) => ({
          ...prev,
          [gameId]: { loading: false, error: null, data: payload },
        }))
      } catch (err: any) {
        setResultGameDetails((prev) => ({
          ...prev,
          [gameId]: {
            loading: false,
            error: err?.message || "Spieldetails konnten nicht geladen werden.",
            data: null,
          },
        }))
      }
    },
    [resultGameDetails],
  )

  const toggleResultGameDetail = useCallback(
    (gameId: string) => {
      const next = openResultGameId === gameId ? null : gameId
      setOpenResultGameId(next)
      if (next) void loadResultGameDetail(gameId)
    },
    [loadResultGameDetail, openResultGameId],
  )

  const seasonOptions = useMemo(() => data?.seasons ?? [], [data?.seasons])

  const formatResultDate = useCallback((isoDate: string) => {
    if (!isoDate) return "—"
    const [year, month, day] = isoDate.split("-")
    if (!year || !month || !day) return isoDate
    return `${day}.${month}.${year}`
  }, [])

  const isTodayDate = useCallback((isoDate: string) => {
    if (!isoDate) return false
    const now = new Date()
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`
    return isoDate === todayIso
  }, [])

  const teamInitials = useCallback((name: string) => {
    const cleaned = (name || "").trim()
    if (!cleaned) return "EMD"
    const parts = cleaned.split(/\s+/).filter(Boolean)
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("")
    return initials || cleaned.slice(0, 2).toUpperCase()
  }, [])

  const divisionOptions = useMemo(() => data?.divisions ?? [], [data?.divisions])

  const changeSeason = (value: string) => {
    setSeasonId(value)
    loadLeague(value, divisionId)
  }

  const changeDivision = (value: string) => {
    setDivisionId(value)
    loadLeague(seasonId, value)
  }

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      <section className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-black/35 shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:rounded-[34px]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,.08),transparent_34%,rgba(14,165,233,.06)_78%,transparent)]" />
        <div className="pointer-events-none absolute -left-20 top-[-120px] h-80 w-80 rounded-full bg-orange-500/15 blur-[110px]" />
        <div className="pointer-events-none absolute -right-24 bottom-[-140px] h-96 w-96 rounded-full bg-sky-500/12 blur-[120px]" />

        <div className="relative p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/55 backdrop-blur-xl">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-400" />
                </span>
                Mein EMD · Liga
              </div>

              <div className="flex items-center gap-4">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-orange-300/[0.13] bg-orange-500/[0.07] shadow-[0_0_24px_rgba(249,115,22,.08)] sm:h-16 sm:w-16">
                  <Trophy className="h-7 w-7 text-orange-300 sm:h-8 sm:w-8" />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                    Sportdarts Liga Austria
                  </p>
                  <h1 className="mt-1 truncate text-[clamp(1.65rem,4vw,2.75rem)] font-black leading-none tracking-[-0.045em] text-white">
                    {data?.title || "Liga Tabellen"}
                  </h1>
                  <p className="mt-2 text-sm text-white/38">
                    {viewMode === "mine"
                      ? "Deine aktuellen Ligatabellen automatisch nach deinen Mannschaften."
                      : "Alle Tabellen und Spielerstatistiken der Sportdarts Liga Austria."}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full space-y-2.5 rounded-[22px] border border-white/[0.075] bg-black/20 p-3 backdrop-blur-xl xl:max-w-[760px]">
              <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/[0.07] bg-black/30 p-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode("mine")}
                  className={[
                    "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition duration-200",
                    viewMode === "mine"
                      ? "bg-orange-500 text-white shadow-[0_0_24px_rgba(249,115,22,.16)]"
                      : "text-white/45 hover:bg-white/[0.05] hover:text-white/80",
                  ].join(" ")}
                >
                  <UserRound className="h-4 w-4" />
                  Meine Teams
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("all")}
                  className={[
                    "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition duration-200",
                    viewMode === "all"
                      ? "bg-orange-500 text-white shadow-[0_0_24px_rgba(249,115,22,.16)]"
                      : "text-white/45 hover:bg-white/[0.05] hover:text-white/80",
                  ].join(" ")}
                >
                  <Globe2 className="h-4 w-4" />
                  Alle Tabellen
                </button>
              </div>

              {viewMode === "all" ? (
                <div className="grid gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
                  <label className="relative block">
                    <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.16em] text-white/28">Saison</span>
                    <div className="relative">
                      <select
                        value={seasonId}
                        onChange={(e) => changeSeason(e.target.value)}
                        disabled={loading || seasonOptions.length === 0}
                        className="h-11 w-full appearance-none rounded-2xl border border-white/[0.09] bg-white/[0.035] pl-3 pr-9 text-sm font-bold text-white outline-none transition hover:border-white/[0.14] focus:border-orange-300/25 disabled:opacity-50"
                      >
                        {seasonOptions.length === 0 ? (
                          <option value={seasonId}>Saison {seasonId}</option>
                        ) : (
                          seasonOptions.map((season) => (
                            <option key={season.value} value={season.value} className="bg-[#090c12]">{season.label}</option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    </div>
                  </label>

                  <label className="relative block">
                    <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.16em] text-white/28">Division</span>
                    <div className="relative">
                      <select
                        value={divisionId}
                        onChange={(e) => changeDivision(e.target.value)}
                        disabled={loading || divisionOptions.length === 0}
                        className="h-11 w-full appearance-none rounded-2xl border border-white/[0.09] bg-white/[0.035] pl-3 pr-9 text-sm font-bold text-white outline-none transition hover:border-white/[0.14] focus:border-orange-300/25 disabled:opacity-50"
                      >
                        {divisionOptions.length === 0 ? (
                          <option value={divisionId}>Division {divisionId}</option>
                        ) : (
                          divisionOptions.map((division) => (
                            <option key={division.value} value={division.value} className="bg-[#090c12]">{division.label}</option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => loadLeague(seasonId, divisionId)}
                    disabled={loading}
                    className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-300/[0.13] bg-orange-500 px-4 text-sm font-black text-white shadow-[0_0_24px_rgba(249,115,22,.10)] transition duration-300 hover:bg-orange-500/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Aktualisieren
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-3">
                  <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/28">Persönliche Auswahl</div>
                    <div className="mt-1 truncate text-sm font-bold text-white/68">
                      {myLeagueLoading
                        ? "Deine Mannschaften werden ermittelt…"
                        : myLeagueBlocks.length > 0
                          ? `${myLeagueBlocks.length} ${myLeagueBlocks.length === 1 ? "Division" : "Divisionen"} · oben direkt auswählbar`
                          : "Keine zugeordnete Division gefunden"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadMyLeagues()}
                    disabled={myLeagueLoading}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-black text-white/65 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${myLeagueLoading ? "animate-spin" : ""}`} />
                    Neu laden
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {viewMode === "mine" ? (
        <>
          {myLeagueError ? (
            <section className="relative overflow-hidden rounded-[24px] border border-orange-300/[0.12] bg-black/25 p-4 backdrop-blur-xl sm:p-5">
              <div className="relative flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-300" />
                <div>
                  <p className="font-black text-white">Deine Ligatabellen</p>
                  <p className="mt-1 text-sm text-white/48">{myLeagueError}</p>
                  <button
                    type="button"
                    onClick={() => setViewMode("all")}
                    className="mt-3 inline-flex h-9 items-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-black text-white/70 transition hover:bg-white/[0.07] hover:text-white"
                  >
                    Alle Tabellen öffnen
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {myLeagueLoading ? (
            <section className="relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/25 backdrop-blur-xl">
              <div className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035]">
                  <RefreshCw className="h-6 w-6 animate-spin text-orange-300" />
                </div>
                <p className="mt-3 text-sm font-bold text-white/38">Deine Ligatabellen werden geladen…</p>
              </div>
            </section>
          ) : null}

          {!myLeagueLoading && myLeagueBlocks.length > 0 ? (
            <>
              <section className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/25 p-3 backdrop-blur-xl">
                <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[0.20em] text-orange-300/60">
                      Meine Mannschaften
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-white/35">
                      Mannschaft auswählen – ohne nach unten scrollen
                    </div>
                  </div>
                  <div className="shrink-0 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] font-black text-white/40">
                    {myLeagueBlocks.length} {myLeagueBlocks.length === 1 ? "Division" : "Divisionen"}
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {myLeagueBlocks.map((block) => {
                    const active = selectedMyLeagueBlock?.key === block.key
                    const teamLabel = block.teams.map((team) => team.name).join(" · ")

                    return (
                      <button
                        key={block.key}
                        type="button"
                        onClick={() => {
                          setSelectedMyLeagueKey(block.key)
                          setMyResultsFilter("today")
                        }}
                        className={[
                          "min-w-fit shrink-0 rounded-2xl border px-4 py-3 text-left transition duration-200",
                          active
                            ? "border-orange-300/25 bg-orange-500 text-white shadow-[0_0_26px_rgba(249,115,22,.14)]"
                            : "border-white/[0.08] bg-white/[0.035] text-white/55 hover:bg-white/[0.06] hover:text-white/85",
                        ].join(" ")}
                      >
                        <div className="text-sm font-black">{teamLabel}</div>
                        <div className={active ? "mt-0.5 text-[11px] font-bold text-white/75" : "mt-0.5 text-[11px] font-bold text-white/30"}>
                          {block.divisionName}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>

              {selectedMyLeagueBlock ? (
                <div className="space-y-4 sm:space-y-5">
                  {!fixedMode ? (
                    <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/[0.07] bg-black/25 p-1.5">
                    <button
                      type="button"
                      onClick={() => setMyLeagueContentMode("table")}
                      className={[
                        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition",
                        myLeagueContentMode === "table"
                          ? "bg-orange-500 text-white shadow-[0_0_22px_rgba(249,115,22,.15)]"
                          : "text-white/45 hover:bg-white/[0.05] hover:text-white/80",
                      ].join(" ")}
                    >
                      <Table2 className="h-4 w-4" />
                      Tabelle
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMyLeagueContentMode("results")
                        const state = myTeamResults[selectedMyLeagueBlock.key]
                        if (!state || (!state.loading && !state.games.length && !state.error)) {
                          void loadMyTeamResults(selectedMyLeagueBlock)
                        }
                      }}
                      className={[
                        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition",
                        myLeagueContentMode === "results"
                          ? "bg-orange-500 text-white shadow-[0_0_22px_rgba(249,115,22,.15)]"
                          : "text-white/45 hover:bg-white/[0.05] hover:text-white/80",
                      ].join(" ")}
                    >
                      <ListChecks className="h-4 w-4" />
                      Ergebnisse
                    </button>
                  </div>
                  ) : null}
                  <section className="relative overflow-hidden rounded-[24px] border border-orange-300/[0.10] bg-black/25 p-4 backdrop-blur-xl sm:p-5">
                    <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.20em] text-orange-300/60">
                          Aktuelle Auswahl
                        </div>
                        <div className="mt-1 text-lg font-black text-white">
                          {selectedMyLeagueBlock.teams.map((team) => team.name).join(" · ")}
                        </div>
                      </div>
                      <div className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs font-black text-white/55">
                        {selectedMyLeagueBlock.divisionName}
                      </div>
                    </div>
                  </section>

                  {selectedMyLeagueBlock.error ? (
                    <section className="rounded-[24px] border border-red-300/[0.13] bg-red-500/[0.055] p-4 backdrop-blur-xl">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                        <div>
                          <p className="font-black text-red-100">{selectedMyLeagueBlock.divisionName}</p>
                          <p className="mt-1 text-sm text-red-100/55">{selectedMyLeagueBlock.error}</p>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  {selectedMyLeagueBlock.loading ? (
                    <section className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/25 backdrop-blur-xl">
                      <RefreshCw className="h-6 w-6 animate-spin text-orange-300" />
                    </section>
                  ) : null}

                  {myLeagueContentMode === "table" && selectedMyLeagueBlock.data ? (
                    <>
                      <LeagueTable
                        title={`Mannschaftstabelle · ${selectedMyLeagueBlock.divisionName}`}
                        subtitle={`Deine Mannschaft: ${selectedMyLeagueBlock.teams.map((team) => team.name).join(", ")}`}
                        icon={<Table2 className="h-5 w-5" />}
                        table={selectedMyLeagueBlock.data.teamTable}
                        highlightTeamNames={selectedMyLeagueBlock.teams.map((team) => team.name)}
                      />
                      <LeagueTable
                        title={`Spielerstatistik · ${selectedMyLeagueBlock.divisionName}`}
                        subtitle={
                          myPlayerNumber !== null
                            ? `Persönliche Wertung · deine Spielernummer: ${myPlayerNumber}`
                            : "Persönliche Wertung deiner aktuellen Division"
                        }
                        icon={<Users className="h-5 w-5" />}
                        table={selectedMyLeagueBlock.data.playerTable}
                        highlightPlayerNumber={myPlayerNumber}
                      />
                    </>
                  ) : null}

                  {myLeagueContentMode === "results" ? (
                    <section className="relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-black/25 backdrop-blur-xl">
                      <div className="pointer-events-none absolute -left-14 top-[-44px] h-32 w-32 rounded-full bg-orange-500/[0.08] blur-[44px]" />
                      <div className="pointer-events-none absolute -right-10 bottom-[-50px] h-32 w-32 rounded-full bg-orange-300/[0.05] blur-[44px]" />

                      <div className="relative border-b border-white/[0.07] px-4 py-4 sm:px-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-5 w-5 text-orange-300" />
                              <h3 className="text-lg font-black text-white">
                                Ergebnisse · {selectedMyLeagueBlock.divisionName}
                              </h3>
                            </div>
                            <p className="mt-1 text-xs font-semibold text-white/35">
                              Nur Spiele von {selectedMyLeagueBlock.teams.map((team) => team.name).join(", ")}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => void loadMyTeamResults(selectedMyLeagueBlock)}
                            disabled={myTeamResults[selectedMyLeagueBlock.key]?.loading}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-black text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                          >
                            <RefreshCw
                              className={`h-3.5 w-3.5 ${
                                myTeamResults[selectedMyLeagueBlock.key]?.loading ? "animate-spin" : ""
                              }`}
                            />
                            Neu laden
                          </button>
                        </div>
                      </div>

                      <div className="relative p-3 sm:p-4">
                        {myTeamResults[selectedMyLeagueBlock.key]?.loading ? (
                          <div className="flex min-h-[180px] items-center justify-center">
                            <RefreshCw className="h-6 w-6 animate-spin text-orange-300" />
                          </div>
                        ) : myTeamResults[selectedMyLeagueBlock.key]?.error ? (
                          <div className="rounded-2xl border border-red-300/[0.12] bg-red-500/[0.05] p-4 text-sm font-semibold text-red-100/70">
                            {myTeamResults[selectedMyLeagueBlock.key]?.error}
                          </div>
                        ) : (myTeamResults[selectedMyLeagueBlock.key]?.games || []).length === 0 ? (
                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 text-center text-sm font-semibold text-white/35">
                            Keine Spiele für dieses Team gefunden.
                          </div>
                        ) : (
                          (() => {
                            const games = myTeamResults[selectedMyLeagueBlock.key]?.games || []

                            const withMeta = games.map((game) => {
                              const ownNames = selectedMyLeagueBlock.teams.map((team) =>
                                normalizeSportdartsTeamName(team.name),
                              )
                              const homeIsOwn = ownNames.includes(normalizeSportdartsTeamName(game.homeTeam))
                              const awayIsOwn = ownNames.includes(normalizeSportdartsTeamName(game.awayTeam))
                              const hasScore = game.homeScore !== null && game.awayScore !== null
                              const ownScore = homeIsOwn ? game.homeScore : awayIsOwn ? game.awayScore : null
                              const opponentScore = homeIsOwn ? game.awayScore : awayIsOwn ? game.homeScore : null
                              const won =
                                hasScore &&
                                ownScore !== null &&
                                opponentScore !== null &&
                                ownScore > opponentScore
                              const isToday = isTodayDate(game.date)

                              return {
                                ...game,
                                homeIsOwn,
                                awayIsOwn,
                                hasScore,
                                ownScore,
                                opponentScore,
                                won,
                                isToday,
                              }
                            })

                            const todayGames = withMeta.filter((game) => game.isToday)
                            const liveGames = withMeta.filter((game) => game.status === "live" && !game.isToday)
                            const upcomingGames = withMeta.filter(
                              (game) => game.status === "scheduled" && !game.isToday,
                            )
                            const completedGames = withMeta.filter((game) => game.status === "completed")

                            const renderGameCard = (game: typeof withMeta[number]) => {
                              const ownTeamName = game.homeIsOwn ? game.homeTeam : game.awayIsOwn ? game.awayTeam : ""
                              const opponentName = game.homeIsOwn ? game.awayTeam : game.awayIsOwn ? game.homeTeam : ""
                              const ownOnLeft = game.homeIsOwn || !game.awayIsOwn

                              return (
                                <div
                                  key={game.gameId}
                                  className={[
                                    "relative overflow-hidden rounded-2xl border px-3 py-3 sm:px-4",
                                    game.isToday
                                      ? "border-orange-300/[0.20] bg-orange-500/[0.08] shadow-[0_0_28px_rgba(249,115,22,.10)]"
                                      : game.status === "completed"
                                        ? game.won
                                          ? "border-emerald-300/[0.12] bg-emerald-500/[0.04]"
                                          : "border-white/[0.07] bg-white/[0.022]"
                                        : game.status === "live"
                                          ? "border-orange-300/[0.14] bg-orange-500/[0.05]"
                                          : "border-white/[0.07] bg-white/[0.018]",
                                  ].join(" ")}
                                >
                                  <div className="pointer-events-none absolute right-[-16px] top-[-18px] h-20 w-20 rounded-full bg-white/[0.035] blur-[30px]" />

                                  <div className="relative flex items-center justify-between gap-3">
                                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">
                                      ST {game.weekNumber} · {formatResultDate(game.date)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {game.isToday ? (
                                        <div className="rounded-full border border-orange-300/20 bg-orange-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-orange-200">
                                          Heute
                                        </div>
                                      ) : null}
                                      <div
                                        className={[
                                          "rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]",
                                          game.status === "completed"
                                            ? "border-emerald-300/15 bg-emerald-400/10 text-emerald-200"
                                            : game.status === "live"
                                              ? "border-orange-300/15 bg-orange-400/10 text-orange-200"
                                              : "border-white/[0.08] bg-white/[0.03] text-white/35",
                                        ].join(" ")}
                                      >
                                        {game.status === "completed"
                                          ? "Beendet"
                                          : game.status === "live"
                                            ? "Live"
                                            : "Geplant"}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="relative mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 justify-end">
                                        <div className="min-w-0 text-right">
                                          <div
                                            className={[
                                              "truncate text-sm font-black",
                                              game.homeIsOwn ? "text-orange-200" : "text-white/80",
                                            ].join(" ")}
                                          >
                                            {game.homeTeam}
                                          </div>
                                          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/28">
                                            Heim
                                          </div>
                                        </div>
                                        <div
                                          className={[
                                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-[10px] font-black",
                                            game.homeIsOwn
                                              ? "border-orange-300/20 bg-orange-400/10 text-orange-100"
                                              : "border-white/[0.08] bg-white/[0.03] text-white/55",
                                          ].join(" ")}
                                        >
                                          {teamInitials(game.homeTeam)}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="min-w-[64px] text-center">
                                      <div className="rounded-2xl border border-white/[0.08] bg-black/25 px-3 py-2 text-base font-black text-white">
                                        {game.hasScore ? `${game.homeScore} : ${game.awayScore}` : "– : –"}
                                      </div>
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={[
                                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-[10px] font-black",
                                            game.awayIsOwn
                                              ? "border-orange-300/20 bg-orange-400/10 text-orange-100"
                                              : "border-white/[0.08] bg-white/[0.03] text-white/55",
                                          ].join(" ")}
                                        >
                                          {teamInitials(game.awayTeam)}
                                        </div>
                                        <div className="min-w-0 text-left">
                                          <div
                                            className={[
                                              "truncate text-sm font-black",
                                              game.awayIsOwn ? "text-orange-200" : "text-white/80",
                                            ].join(" ")}
                                          >
                                            {game.awayTeam}
                                          </div>
                                          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/28">
                                            Auswärts
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {game.hasScore ? (
                                    <div className="relative mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/18 px-3 py-2">
                                      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/32">
                                        Dein Team
                                      </div>
                                      <div
                                        className={[
                                          "text-xs font-black",
                                          game.status === "completed"
                                            ? game.won
                                              ? "text-emerald-200"
                                              : "text-orange-200"
                                            : "text-white/75",
                                        ].join(" ")}
                                      >
                                        {ownTeamName} · {game.ownScore} : {game.opponentScore} ·{" "}
                                        {game.status === "completed"
                                          ? game.won
                                            ? "Sieg"
                                            : "Niederlage"
                                          : "Zwischenstand"}
                                      </div>
                                    </div>
                                  ) : null}

                                  <button
                                    type="button"
                                    onClick={() => toggleResultGameDetail(game.gameId)}
                                    className="relative mt-3 flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-left transition hover:bg-white/[0.045]"
                                  >
                                    <span className="flex items-center gap-2 text-xs font-black text-white/62">
                                      <Target className="h-4 w-4 text-orange-300" />
                                      Spieldetails
                                    </span>
                                    <ChevronDown
                                      className={[
                                        "h-4 w-4 text-white/35 transition-transform",
                                        openResultGameId === game.gameId ? "rotate-180" : "",
                                      ].join(" ")}
                                    />
                                  </button>

                                  {openResultGameId === game.gameId ? (
                                    <div className="relative mt-2 overflow-hidden rounded-2xl border border-white/[0.07] bg-black/25">
                                      {resultGameDetails[game.gameId]?.loading ? (
                                        <div className="flex min-h-[120px] items-center justify-center">
                                          <RefreshCw className="h-5 w-5 animate-spin text-orange-300" />
                                        </div>
                                      ) : resultGameDetails[game.gameId]?.error ? (
                                        <div className="p-4 text-sm font-semibold text-red-200/70">
                                          {resultGameDetails[game.gameId]?.error}
                                        </div>
                                      ) : resultGameDetails[game.gameId]?.data ? (
                                        (() => {
                                          const detail = resultGameDetails[game.gameId].data!

                                          return (
                                            <div className="space-y-4 p-3 sm:p-4">
                                              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3">
                                                <div className="truncate text-right text-sm font-black text-white/80">
                                                  {detail.homeTeam || game.homeTeam}
                                                </div>
                                                <div className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-1.5 text-base font-black text-white">
                                                  {detail.homeScore || (game.homeScore ?? "–")} : {detail.awayScore || (game.awayScore ?? "–")}
                                                </div>
                                                <div className="truncate text-left text-sm font-black text-white/80">
                                                  {detail.awayTeam || game.awayTeam}
                                                </div>
                                              </div>

                                              {(detail.homePlayers.length > 0 || detail.awayPlayers.length > 0) ? (
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                                                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.10em] text-white/30">
                                                      Heim · Checks
                                                    </div>
                                                    <div className="space-y-1.5">
                                                      {detail.homePlayers.map((player, playerIndex) => (
                                                        <div
                                                          key={`${player.player}-${playerIndex}`}
                                                          className="flex items-center justify-between gap-2 text-xs"
                                                        >
                                                          <span className="truncate font-bold text-white/72">{player.player}</span>
                                                          <span className="shrink-0 font-black text-orange-200">{player.checks || "—"}</span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>

                                                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                                                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.10em] text-white/30">
                                                      Gast · Checks
                                                    </div>
                                                    <div className="space-y-1.5">
                                                      {detail.awayPlayers.map((player, playerIndex) => (
                                                        <div
                                                          key={`${player.player}-${playerIndex}`}
                                                          className="flex items-center justify-between gap-2 text-xs"
                                                        >
                                                          <span className="truncate font-bold text-white/72">{player.player}</span>
                                                          <span className="shrink-0 font-black text-orange-200">{player.checks || "—"}</span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                </div>
                                              ) : null}

                                              {detail.blocks.length > 0 ? (
                                                <div className="space-y-4">
                                                  {detail.blocks.map((block, blockIndex) => (
                                                    <div
                                                      key={`${block.title}-${blockIndex}`}
                                                      className="relative overflow-hidden rounded-2xl border border-white/[0.075] bg-gradient-to-r from-orange-500/[0.025] via-white/[0.018] to-sky-500/[0.025]"
                                                    >
                                                      <div className="absolute inset-y-0 left-0 w-[3px] bg-orange-400/70" />

                                                      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-orange-300/15 bg-orange-400/[0.08] text-[11px] font-black text-orange-200">
                                                            {blockIndex + 1}
                                                          </div>
                                                          <div>
                                                            <div className="text-sm font-black text-white/88">
                                                              {block.title}
                                                            </div>
                                                            <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/24">
                                                              {block.matches.length} {block.matches.length === 1 ? "Duell" : "Duelle"}
                                                            </div>
                                                          </div>
                                                        </div>

                                                        <div className="rounded-full border border-white/[0.07] bg-black/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-white/30">
                                                          Block
                                                        </div>
                                                      </div>

                                                      <div className="space-y-1.5 p-2 sm:p-3">
                                                        {block.matches.map((match, matchIndex) => {
                                                          const leftWins = Number(match.leftScore) > Number(match.rightScore)
                                                          const rightWins = Number(match.rightScore) > Number(match.leftScore)

                                                          return (
                                                            <div
                                                              key={`${match.leftPlayer}-${match.rightPlayer}-${matchIndex}`}
                                                              className="grid grid-cols-[minmax(0,1fr)_82px_minmax(0,1fr)] items-center gap-2 rounded-xl border border-white/[0.055] bg-black/20 px-2.5 py-2.5 sm:grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] sm:px-3"
                                                            >
                                                              <div className="min-w-0 text-right">
                                                                <div
                                                                  className={[
                                                                    "break-words text-[11px] font-black leading-[1.25] sm:text-xs",
                                                                    leftWins ? "text-white/92" : "text-white/58",
                                                                  ].join(" ")}
                                                                >
                                                                  {match.leftPlayer}
                                                                </div>
                                                                <div className="mt-1 text-[8px] font-black uppercase tracking-[0.10em] text-white/20">
                                                                  Heim
                                                                </div>
                                                              </div>

                                                              <div className="flex items-center justify-center gap-1.5">
                                                                <div
                                                                  className={[
                                                                    "flex h-9 min-w-[30px] items-center justify-center rounded-xl border px-2 text-base font-black",
                                                                    leftWins
                                                                      ? "border-orange-300/20 bg-orange-400/10 text-orange-100"
                                                                      : "border-white/[0.08] bg-white/[0.035] text-white/70",
                                                                  ].join(" ")}
                                                                >
                                                                  {match.leftScore}
                                                                </div>
                                                                <div className="text-[11px] font-black text-white/20">:</div>
                                                                <div
                                                                  className={[
                                                                    "flex h-9 min-w-[30px] items-center justify-center rounded-xl border px-2 text-base font-black",
                                                                    rightWins
                                                                      ? "border-sky-300/20 bg-sky-400/10 text-sky-100"
                                                                      : "border-white/[0.08] bg-white/[0.035] text-white/70",
                                                                  ].join(" ")}
                                                                >
                                                                  {match.rightScore}
                                                                </div>
                                                              </div>

                                                              <div className="min-w-0 text-left">
                                                                <div
                                                                  className={[
                                                                    "break-words text-[11px] font-black leading-[1.25] sm:text-xs",
                                                                    rightWins ? "text-white/92" : "text-white/58",
                                                                  ].join(" ")}
                                                                >
                                                                  {match.rightPlayer}
                                                                </div>
                                                                <div className="mt-1 text-[8px] font-black uppercase tracking-[0.10em] text-white/20">
                                                                  Gast
                                                                </div>
                                                              </div>
                                                            </div>
                                                          )
                                                        })}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center text-xs font-semibold text-white/30">
                                                  Keine Blockdetails gefunden.
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })()
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              )
                            }

                            const renderSection = (
                              title: string,
                              subtitle: string,
                              icon: React.ReactNode,
                              games: typeof withMeta,
                            ) =>
                              games.length ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 px-1">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-orange-200">
                                      {icon}
                                    </div>
                                    <div>
                                      <div className="text-sm font-black text-white">{title}</div>
                                      <div className="text-[10px] font-bold uppercase tracking-[0.10em] text-white/28">
                                        {subtitle}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-2">{games.map(renderGameCard)}</div>
                                </div>
                              ) : null

                            const todayAndLiveGames = [
                              ...todayGames,
                              ...liveGames.filter(
                                (liveGame) => !todayGames.some((todayGame) => todayGame.gameId === liveGame.gameId),
                              ),
                            ]

                            const visibleGames =
                              myResultsFilter === "today"
                                ? todayAndLiveGames
                                : myResultsFilter === "upcoming"
                                  ? upcomingGames
                                  : completedGames

                            const filterMeta =
                              myResultsFilter === "today"
                                ? {
                                    title: "Heute",
                                    subtitle: "Heutige und aktuell laufende Spiele",
                                    icon: <CalendarDays className="h-4 w-4" />,
                                  }
                                : myResultsFilter === "upcoming"
                                  ? {
                                      title: "Kommend",
                                      subtitle: "Nächste geplante Begegnungen",
                                      icon: <CalendarDays className="h-4 w-4" />,
                                    }
                                  : {
                                      title: "Abgeschlossen",
                                      subtitle: "Bereits beendete Begegnungen",
                                      icon: <Trophy className="h-4 w-4" />,
                                    }

                            return (
                              <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/[0.07] bg-black/25 p-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setMyResultsFilter("today")}
                                    className={[
                                      "rounded-xl px-2 py-2.5 text-xs font-black transition",
                                      myResultsFilter === "today"
                                        ? "bg-orange-500 text-white shadow-[0_0_22px_rgba(249,115,22,.14)]"
                                        : "text-white/42 hover:bg-white/[0.05] hover:text-white/80",
                                    ].join(" ")}
                                  >
                                    Heute
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setMyResultsFilter("upcoming")}
                                    className={[
                                      "rounded-xl px-2 py-2.5 text-xs font-black transition",
                                      myResultsFilter === "upcoming"
                                        ? "bg-orange-500 text-white shadow-[0_0_22px_rgba(249,115,22,.14)]"
                                        : "text-white/42 hover:bg-white/[0.05] hover:text-white/80",
                                    ].join(" ")}
                                  >
                                    Kommend
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setMyResultsFilter("completed")}
                                    className={[
                                      "rounded-xl px-2 py-2.5 text-xs font-black transition",
                                      myResultsFilter === "completed"
                                        ? "bg-orange-500 text-white shadow-[0_0_22px_rgba(249,115,22,.14)]"
                                        : "text-white/42 hover:bg-white/[0.05] hover:text-white/80",
                                    ].join(" ")}
                                  >
                                    Abgeschlossen
                                  </button>
                                </div>

                                {visibleGames.length ? (
                                  renderSection(
                                    filterMeta.title,
                                    filterMeta.subtitle,
                                    filterMeta.icon,
                                    visibleGames,
                                  )
                                ) : (
                                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-7 text-center">
                                    <div className="text-sm font-black text-white/55">
                                      {myResultsFilter === "today"
                                        ? "Heute keine Spiele"
                                        : myResultsFilter === "upcoming"
                                          ? "Keine kommenden Spiele"
                                          : "Keine abgeschlossenen Spiele"}
                                    </div>
                                    <div className="mt-1 text-xs font-semibold text-white/25">
                                      Für {selectedMyLeagueBlock.teams.map((team) => team.name).join(", ")}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })()
                        )}
                      </div>
                    </section>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </>
      ) : (
        <>
          {error ? (
            <section className="relative overflow-hidden rounded-[24px] border border-red-300/[0.13] bg-red-500/[0.055] p-4 backdrop-blur-xl">
              <div className="relative flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                <div>
                  <p className="font-black text-red-100">Ligadaten konnten nicht geladen werden</p>
                  <p className="mt-1 text-sm text-red-100/55">{error}</p>
                </div>
              </div>
            </section>
          ) : null}

          {loading && !data ? (
            <section className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/25 backdrop-blur-xl">
              <div className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035]">
                  <RefreshCw className="h-6 w-6 animate-spin text-orange-300" />
                </div>
                <p className="mt-3 text-sm font-bold text-white/38">Ligadaten werden geladen…</p>
              </div>
            </section>
          ) : null}

          {data ? (
            <>
              {data.openRounds?.length > 0 ? (
                <section className="relative overflow-hidden rounded-[24px] border border-orange-300/[0.10] bg-black/25 p-4 backdrop-blur-xl sm:p-5">
                  <div className="relative">
                    <div className="mb-3 flex items-center gap-2">
                      <CircleDot className="h-4 w-4 text-orange-300" />
                      <p className="text-[9px] font-black uppercase tracking-[0.20em] text-orange-300/60">Offene Runden</p>
                    </div>
                    <div className="space-y-2">
                      {data.openRounds.map((item, index) => (
                        <div key={index} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-sm font-semibold text-white/58">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              <LeagueTable
                title="Mannschaftstabelle"
                subtitle="Aktueller Tabellenstand der gewählten Division"
                icon={<Table2 className="h-5 w-5" />}
                table={data.teamTable}
                highlightTeamNames={myLeagueBlocks.flatMap((block) => block.teams.map((team) => team.name))}
              />
              <LeagueTable
                title="Spielerstatistik"
                subtitle={
                  myPlayerNumber !== null
                    ? `Persönliche Wertung · deine Spielernummer: ${myPlayerNumber}`
                    : "Persönliche Wertung der gewählten Division"
                }
                icon={<Users className="h-5 w-5" />}
                table={data.playerTable}
                highlightPlayerNumber={myPlayerNumber}
              />
            </>
          ) : null}
        </>
      )}
    </div>
  )
}
