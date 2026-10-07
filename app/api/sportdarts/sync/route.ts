import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SPORTDARTS_RESULTS_URL = "https://www.sportdartsliga.at/ligasystem/games/results"
const SPORTDARTS_GAME_URL = "https://www.sportdartsliga.at/ligasystem/games/view"

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Server-Konfiguration fehlt.")
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeName(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
}

function toIsoDate(value: string) {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : ""
}

function parseNullableScore(value: string) {
  const parsed = Number.parseInt(decodeHtml(value), 10)
  return Number.isFinite(parsed) ? parsed : null
}

function parseChecks(value: string) {
  const match = String(value || "").match(/(\d+)\s*\/\s*(\d+)/)
  return {
    checksMade: match ? Number(match[1]) : null,
    checksTotal: match ? Number(match[2]) : null,
  }
}

function parseResults(html: string) {
  const tableMatch = html.match(/<!--\s*Games Table\s*-->([\s\S]*?)<\/table>/i)
  if (!tableMatch) return []

  return Array.from(tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi))
    .map((rowMatch) => {
      const row = rowMatch[1]
      const cells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) => m[1])
      const id = row.match(/\/ligasystem\/games\/view\/(\d+)/i)?.[1]
      if (!id || cells.length < 6) return null

      return {
        gameId: id,
        date: toIsoDate(decodeHtml(cells[1])),
        homeTeam: decodeHtml(cells[2]),
        homeScore: parseNullableScore(cells[3]),
        awayScore: parseNullableScore(cells[4]),
        awayTeam: decodeHtml(cells[5]),
        status: /greenCheck\.png/i.test(row)
          ? "completed"
          : /greenPoint\.png/i.test(row)
            ? "live"
            : "scheduled",
      }
    })
    .filter(Boolean) as Array<{
      gameId: string
      date: string
      homeTeam: string
      awayTeam: string
      homeScore: number | null
      awayScore: number | null
      status: "scheduled" | "live" | "completed"
    }>
}

function inputValue(formHtml: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return (
    formHtml.match(new RegExp(`name=["']${escaped}["'][^>]*value=["']([^"']*)["']`, "i"))?.[1] ||
    formHtml.match(new RegExp(`value=["']([^"']*)["'][^>]*name=["']${escaped}["']`, "i"))?.[1] ||
    ""
  )
}

function parseGame(html: string) {
  const scoreArea = decodeHtml(
    html.match(/Punktestand:\s*([\s\S]{0,1200}?)(?:<\/table>|<h\d|<div class="row")/i)?.[1] || "",
  )

  const homeScore = Number(scoreArea.match(/Heim:\s*(\d+)/i)?.[1] ?? NaN)
  const awayScore = Number(scoreArea.match(/Gast:\s*(\d+)/i)?.[1] ?? NaN)

  const lineupTables = Array.from(html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi))
    .map((m) => {
      const rows = Array.from(m[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)).map((row) =>
        Array.from(row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((cell) =>
          decodeHtml(cell[1]),
        ),
      )

      if (!rows.length || !rows[0]?.join(" ").toLowerCase().includes("checks")) return null

      const title = rows[0]?.[0] || ""
      const players = rows.slice(1).map((row) => {
        const label = row[0] || ""
        const match = label.match(/^(.*?)\s*-\s*(\d+)\s*$/)
        const checks = parseChecks(row[row.length - 1] || "")
        return {
          playerName: match?.[1]?.trim() || label,
          playerNumber: match?.[2] || "",
          checksMade: checks.checksMade,
          checksTotal: checks.checksTotal,
        }
      })

      return { title, players }
    })
    .filter(Boolean) as Array<{
      title: string
      players: Array<{
        playerName: string
        playerNumber: string
        checksMade: number | null
        checksTotal: number | null
      }>
    }>

  const homeLineup = lineupTables.find((t) => /heim/i.test(t.title)) || lineupTables[0] || null
  const awayLineup = lineupTables.find((t) => /gast/i.test(t.title)) || lineupTables[1] || null

  const homeTeam = homeLineup?.title.replace(/^\s*Heim\s*[-–:]\s*/i, "").replace(/\s*Checks\s*$/i, "").trim() || ""
  const awayTeam = awayLineup?.title.replace(/^\s*Gast\s*[-–:]\s*/i, "").replace(/\s*Checks\s*$/i, "").trim() || ""

  const plays: Array<{
    block: string
    homePlayerNumber: string
    awayPlayerNumber: string
    secondHomePlayerNumber: string
    secondAwayPlayerNumber: string
    homeLegs: number
    awayLegs: number
    isTeamMatch: boolean
  }> = []

  // Alle Game-Formulare direkt auslesen. Das ist robuster als die Block-Überschrift,
  // weil Sportdarts z. B. "Block 4 - Team" und andere Bezeichnungen verwendet.
  for (const formMatch of html.matchAll(/<form[^>]*id=["']Game(\d+)Selector["'][^>]*>[\s\S]*?<\/form>/gi)) {
    const formHtml = formMatch[0]
    const cells = Array.from(formHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi))
      .map((cell) => decodeHtml(cell[1]))
      .filter(Boolean)

    if (cells.length < 4) continue

    const homeLegs = Number(cells[1])
    const awayLegs = Number(cells[2])
    if (!Number.isFinite(homeLegs) || !Number.isFinite(awayLegs)) continue

    const secondHomePlayerNumber = inputValue(formHtml, "SecondPlayerHome")
    const secondAwayPlayerNumber = inputValue(formHtml, "SecondPlayerGuest")

    const beforeForm = html.slice(0, formMatch.index || 0)
    const previousHeadings = Array.from(beforeForm.matchAll(/<h5>\s*<b>\s*([\s\S]*?)\s*<\/b>\s*<\/h5>/gi))
    const block = decodeHtml(previousHeadings[previousHeadings.length - 1]?.[1] || "")

    plays.push({
      block,
      homePlayerNumber: inputValue(formHtml, "PlayerHome"),
      awayPlayerNumber: inputValue(formHtml, "PlayerGuest"),
      secondHomePlayerNumber,
      secondAwayPlayerNumber,
      homeLegs,
      awayLegs,
      isTeamMatch:
        Boolean(secondHomePlayerNumber || secondAwayPlayerNumber) ||
        /team|cricket/i.test(block),
    })
  }

  return { homeScore, awayScore, homeTeam, awayTeam, homePlayers: homeLineup?.players || [], awayPlayers: awayLineup?.players || [], plays }
}

function usedNumbers(plays: ReturnType<typeof parseGame>["plays"], side: "home" | "away") {
  const result = new Set<string>()
  for (const play of plays) {
    const first = side === "home" ? play.homePlayerNumber : play.awayPlayerNumber
    const second = side === "home" ? play.secondHomePlayerNumber : play.secondAwayPlayerNumber
    if (first) result.add(first)
    if (second) result.add(second)
  }
  return Array.from(result)
}

function aggregateSingles(plays: ReturnType<typeof parseGame>["plays"], side: "home" | "away") {
  const map = new Map<string, { playerNumber: string; legsWon: number; legsLost: number }>()
  for (const play of plays) {
    if (play.isTeamMatch) continue

    const playerNumber = side === "home" ? play.homePlayerNumber : play.awayPlayerNumber
    if (!playerNumber) continue

    const current = map.get(playerNumber) || { playerNumber, legsWon: 0, legsLost: 0 }
    current.legsWon += side === "home" ? play.homeLegs : play.awayLegs
    current.legsLost += side === "home" ? play.awayLegs : play.homeLegs
    map.set(playerNumber, current)
  }
  return Array.from(map.values())
}

function aggregateOfficialChecks(
  players: ReturnType<typeof parseGame>["homePlayers"],
  fallback: ReturnType<typeof aggregateSingles>,
) {
  const fallbackByNumber = new Map(fallback.map((row) => [row.playerNumber, row]))

  return players
    .filter((player) => Boolean(player.playerNumber))
    .map((player) => {
      const fallbackRow = fallbackByNumber.get(player.playerNumber)
      const hasOfficialChecks = player.checksMade != null && player.checksTotal != null

      if (!hasOfficialChecks) {
        return fallbackRow || { playerNumber: player.playerNumber, legsWon: 0, legsLost: 0 }
      }

      return {
        playerNumber: player.playerNumber,
        // Die Sportdarts-Checks-Tabelle ist die maßgebliche Spielerstatistik.
        // Dadurch bleiben Steel-Teamspiele automatisch draußen, während E-Dart-
        // Team/Cricket genau so zählt, wie Sportdarts es offiziell ausweist.
        legsWon: player.checksMade!,
        legsLost: Math.max(0, player.checksTotal! - player.checksMade!),
      }
    })
}

async function fetchOfficialResults(seasonId: number, divisionId: number) {
  const form = new URLSearchParams()
  form.set("mySeasonsSelec", String(seasonId))
  form.set("myDivisionsSelec", String(divisionId))

  const response = await fetch(SPORTDARTS_RESULTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 EMD-League/1.0",
    },
    body: form.toString(),
    cache: "no-store",
  })

  if (!response.ok) throw new Error(`Sportdarts antwortet mit HTTP ${response.status}.`)
  return parseResults(await response.text())
}

async function fetchOfficialGame(gameId: string) {
  const response = await fetch(`${SPORTDARTS_GAME_URL}/${gameId}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 EMD-League/1.0",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  })

  if (!response.ok) throw new Error(`Sportdarts-Spiel antwortet mit HTTP ${response.status}.`)
  return parseGame(await response.text())
}

async function addReview(
  supabase: ReturnType<typeof adminClient>,
  data: {
    matchId: string
    gameId: number
    teamId: string | null
    userId: string
    reason: string
    details: Record<string, unknown>
  },
) {
  await supabase.from("sportdarts_sync_reviews").insert({
    match_id: data.matchId,
    sportdarts_game_id: data.gameId,
    team_id: data.teamId,
    requested_by: data.userId,
    status: "review_required",
    reason: data.reason,
    details: data.details,
  })
}

export async function POST(request: Request) {
  try {
    const supabase = adminClient()

    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""
    if (!token) {
      return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 })
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    const user = authData?.user
    if (authError || !user) {
      return NextResponse.json({ error: "Sitzung ungültig oder abgelaufen." }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const matchId = String(body?.matchId || "").trim()
    const sportdartsGameId = Number(body?.sportdartsGameId)
    const mode = body?.mode === "review" ? "review" : "apply"
    const extraStatsEnabled = body?.extraStatsEnabled === true
    const requestedExtraStats = Array.isArray(body?.extraStats) ? body.extraStats : []

    if (!matchId || !Number.isInteger(sportdartsGameId) || sportdartsGameId <= 0) {
      return NextResponse.json({ error: "Match-ID oder Sportdarts-ID fehlt." }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("player_id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!profile?.player_id) {
      return NextResponse.json({ error: "Kein Spielerprofil gefunden." }, { status: 403 })
    }

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select(`
        id,season_id,match_date,original_date,dart_type,status,
        home_team_id,away_team_id,home_team_type,away_team_type,
        home_opponent_team_id,away_opponent_team_id
      `)
      .eq("id", matchId)
      .maybeSingle()

    if (matchError || !match) {
      return NextResponse.json({ error: "Spiel nicht gefunden." }, { status: 404 })
    }

    const candidateTeamIds = [match.home_team_id, match.away_team_id].filter(Boolean)

    const { data: memberships, error: membershipError } = await supabase
      .from("team_members")
      .select("team_id,role")
      .eq("player_id", profile.player_id)
      .in("team_id", candidateTeamIds)
      .is("left_at", null)

    if (membershipError) throw membershipError

    const leadership = (memberships || []).find(
      (row: any) => row.role === "Captain" || row.role === "Co-Captain",
    )

    if (!leadership?.team_id) {
      return NextResponse.json(
        { error: "Nur Captain oder Co-Captain des beteiligten Teams darf Sportdarts übernehmen." },
        { status: 403 },
      )
    }

    const ownTeamId = leadership.team_id as string
    const ownSide: "home" | "away" = match.home_team_id === ownTeamId ? "home" : "away"

    const { data: assignments, error: assignmentError } = await supabase
      .from("team_sportdarts_assignments")
      .select("season_id,sportdarts_season_id,sportdarts_division_id,updated_at")
      .eq("team_id", ownTeamId)
      .order("updated_at", { ascending: false })

    if (assignmentError) throw assignmentError

    const assignment =
      (assignments || []).find((row: any) => row.season_id === match.season_id) ||
      (assignments || [])[0] ||
      null

    if (!assignment?.sportdarts_season_id || !assignment?.sportdarts_division_id) {
      return NextResponse.json({ error: "Keine Sportdarts-Division für dieses Team hinterlegt." }, { status: 409 })
    }

    const officialResults = await fetchOfficialResults(
      Number(assignment.sportdarts_season_id),
      Number(assignment.sportdarts_division_id),
    )

    const officialResult = officialResults.find((row) => row.gameId === String(sportdartsGameId))
    if (!officialResult) {
      return NextResponse.json({ error: "Sportdarts-Spiel gehört nicht zur hinterlegten Division." }, { status: 409 })
    }

    const acceptedMatchDates = [match.match_date, match.original_date].filter(Boolean)
    if (!acceptedMatchDates.includes(officialResult.date)) {
      return NextResponse.json(
        { error: "Sportdarts-Datum stimmt weder mit dem aktuellen noch mit dem ursprünglichen EMD-Spieltermin überein." },
        { status: 409 },
      )
    }

    if (officialResult.status !== "completed") {
      return NextResponse.json(
        { error: "Das Sportdarts-Spiel ist noch nicht offiziell abgeschlossen." },
        { status: 409 },
      )
    }

    if (officialResult.homeScore == null || officialResult.awayScore == null) {
      return NextResponse.json({ error: "Sportdarts enthält noch keinen vollständigen Endstand." }, { status: 409 })
    }

    const { data: ownTeam } = await supabase.from("teams").select("name").eq("id", ownTeamId).maybeSingle()

    let opponentName = ""
    if (ownSide === "home") {
      if (match.away_opponent_team_id) {
        const { data } = await supabase
          .from("opponent_teams")
          .select("name")
          .eq("id", match.away_opponent_team_id)
          .maybeSingle()
        opponentName = data?.name || ""
      } else if (match.away_team_id) {
        const { data } = await supabase.from("teams").select("name").eq("id", match.away_team_id).maybeSingle()
        opponentName = data?.name || ""
      }
    } else {
      if (match.home_opponent_team_id) {
        const { data } = await supabase
          .from("opponent_teams")
          .select("name")
          .eq("id", match.home_opponent_team_id)
          .maybeSingle()
        opponentName = data?.name || ""
      } else if (match.home_team_id) {
        const { data } = await supabase.from("teams").select("name").eq("id", match.home_team_id).maybeSingle()
        opponentName = data?.name || ""
      }
    }

    const sportOwnName = ownSide === "home" ? officialResult.homeTeam : officialResult.awayTeam
    const sportOpponentName = ownSide === "home" ? officialResult.awayTeam : officialResult.homeTeam

    const ownNameOk = normalizeName(ownTeam?.name) === normalizeName(sportOwnName)
    const opponentNameOk =
      !normalizeName(opponentName) || normalizeName(opponentName) === normalizeName(sportOpponentName)

    if (!ownNameOk || !opponentNameOk) {
      const reason = "Teamzuordnung zwischen EMD und Sportdarts ist nicht eindeutig."
      await addReview(supabase, {
        matchId,
        gameId: sportdartsGameId,
        teamId: ownTeamId,
        userId: user.id,
        reason,
        details: {
          emdOwnTeam: ownTeam?.name || null,
          sportdartsOwnTeam: sportOwnName,
          emdOpponent: opponentName || null,
          sportdartsOpponent: sportOpponentName,
        },
      })

      return NextResponse.json({ error: reason, reviewCreated: true }, { status: 409 })
    }

    const detail = await fetchOfficialGame(String(sportdartsGameId))

    const { data: lineupHeader, error: headerError } = await supabase
      .from("match_lineup_headers")
      .select("status,current_version,confirmed_version")
      .eq("match_id", matchId)
      .eq("team_id", ownTeamId)
      .maybeSingle()

    if (headerError) throw headerError

    const lineupConfirmed =
      lineupHeader?.status === "confirmed" &&
      lineupHeader?.current_version != null &&
      lineupHeader?.confirmed_version != null &&
      lineupHeader.current_version === lineupHeader.confirmed_version

    const { data: lineupRows, error: lineupError } = await supabase
      .from("match_lineups")
      .select("player_id")
      .eq("match_id", matchId)
      .eq("team_id", ownTeamId)

    if (lineupError) throw lineupError

    const lineupIds = Array.from(new Set((lineupRows || []).map((row: any) => row.player_id).filter(Boolean)))

    const { data: players, error: playerError } = lineupIds.length
      ? await supabase.from("club_players").select("id,name,player_number").in("id", lineupIds)
      : { data: [], error: null as any }

    if (playerError) throw playerError

    const byNumber = new Map<string, any>()
    for (const player of players || []) {
      const number = String(player.player_number ?? "").trim()
      if (number) byNumber.set(number, player)
    }

    const requiredModule =
      String(match.dart_type || "").toLowerCase() === "steeldart"
        ? "steeldart_league"
        : String(match.dart_type || "").toLowerCase() === "edart"
          ? "edart_league"
          : null

    let eligibleIds = new Set<string>()
    let eligibilityChecked = false

    if (requiredModule) {
      const { data: eligibleRows, error: eligibleError } = await supabase.rpc(
        "eligible_team_players_for_league",
        {
          p_team_id: ownTeamId,
          p_required_module_code: requiredModule,
        },
      )

      if (!eligibleError) {
        eligibilityChecked = true
        eligibleIds = new Set((eligibleRows || []).map((row: any) => row.player_id).filter(Boolean))
      }
    }

    // Sportdarts ist nach dem Spiel die Quelle für den tatsächlichen Einsatz.
    // Daher dürfen auch berechtigte Teamspieler zugeordnet werden, die von der
    // vorab bestätigten EMD-Aufstellung abweichen (z.B. kurzfristiger Ersatz).
    if (eligibilityChecked) {
      const missingEligibleIds = Array.from(eligibleIds).filter(
        (id) => !(players || []).some((player: any) => player.id === id),
      )

      if (missingEligibleIds.length > 0) {
        const { data: eligiblePlayers, error: eligiblePlayersError } = await supabase
          .from("club_players")
          .select("id,name,player_number")
          .in("id", missingEligibleIds)

        if (eligiblePlayersError) throw eligiblePlayersError

        for (const player of eligiblePlayers || []) {
          const number = String(player.player_number ?? "").trim()
          if (number && !byNumber.has(number)) byNumber.set(number, player)
        }
      }
    }

    const used = usedNumbers(detail.plays, ownSide)
    const singlesFallback = aggregateSingles(detail.plays, ownSide)
    const officialPlayers = ownSide === "home" ? detail.homePlayers : detail.awayPlayers
    const officialStats = aggregateOfficialChecks(officialPlayers, singlesFallback)
    const legsByNumber = new Map(officialStats.map((row) => [row.playerNumber, row]))

    const issues: Array<Record<string, unknown>> = []
    const playerStats: Array<{
      player_id: string
      legs_won: number
      legs_lost: number
      extra_stats?: Record<string, number>
    }> = []

    const allowedExtraKeys = [
      "throws_180",
      "throws_171",
      "throws_high_tonne",
      "throws_tonne",
      "throws_shanghai",
      "throws_95_plus",
      "throws_bull",
      "throws_15",
      "throws_16",
      "throws_17",
      "throws_18",
      "throws_19",
      "throws_20",
      "throws_under_26",
      "throws_under_30",
      "semperit_outs",
    ] as const

    const requestedExtrasByPlayer = new Map<string, Record<string, number>>()

    if (extraStatsEnabled) {
      for (const row of requestedExtraStats) {
        const playerId = String(row?.player_id || "")
        if (!playerId) continue

        const clean: Record<string, number> = {}
        for (const key of allowedExtraKeys) {
          const value = Number(row?.[key] ?? 0)
          clean[key] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
        }
        requestedExtrasByPlayer.set(playerId, clean)
      }
    }

    if (!eligibilityChecked) {
      issues.push({ reason: "Die Liga-/Abo-Berechtigung konnte nicht sicher geprüft werden." })
    }

    for (const number of used) {
      const player = byNumber.get(number)

      if (!player) {
        issues.push({
          sportdarts_player_number: number,
          reason: "Sportdarts-Spieler konnte über die Spielernummer keinem berechtigten EMD-Spieler zugeordnet werden.",
        })
        continue
      }

      if (!eligibleIds.has(player.id)) {
        issues.push({
          player_id: player.id,
          player_name: player.name,
          sportdarts_player_number: number,
          reason: "Spieler ist nicht für das erforderliche Liga-Modul berechtigt.",
        })
      }

      const leg = legsByNumber.get(number)
      if (leg) {
        playerStats.push({
          player_id: player.id,
          legs_won: leg.legsWon,
          legs_lost: leg.legsLost,
          extra_stats: extraStatsEnabled ? requestedExtrasByPlayer.get(player.id) || {} : undefined,
        })
      }
    }

    if (extraStatsEnabled) {
      const validPlayerIds = new Set(playerStats.map((row) => row.player_id))
      for (const playerId of requestedExtrasByPlayer.keys()) {
        if (!validPlayerIds.has(playerId)) {
          issues.push({
            player_id: playerId,
            reason: "Zusatzstatistik wurde für einen Spieler übermittelt, der nicht als gültiger Sportdarts-Spieler dieses Matches erkannt wurde.",
          })
        }
      }
    }

    if (issues.length > 0 || mode === "review") {
      const reason =
        issues[0]?.reason?.toString() ||
        "Sportdarts-Synchronisation wurde zur manuellen Prüfung eingereicht."

      await addReview(supabase, {
        matchId,
        gameId: sportdartsGameId,
        teamId: ownTeamId,
        userId: user.id,
        reason,
        details: {
          issues,
          officialResult,
          playerStats,
          requestedMode: mode,
        },
      })

      return NextResponse.json({
        success: mode === "review",
        reviewCreated: true,
        blocked: issues.length > 0,
        message:
          issues.length > 0
            ? "Prüffall wurde für die Administration gespeichert."
            : "Sportdarts-Synchronisation wurde zur Admin-Prüfung gespeichert.",
      })
    }

    const { data: applyData, error: applyError } = await supabase.rpc("apply_sportdarts_sync", {
      p_match_id: matchId,
      p_home_score: officialResult.homeScore,
      p_away_score: officialResult.awayScore,
      p_player_stats: playerStats,
      p_actor: user.id,
      p_sportdarts_game_id: sportdartsGameId,
    })

    if (applyError) {
      await addReview(supabase, {
        matchId,
        gameId: sportdartsGameId,
        teamId: ownTeamId,
        userId: user.id,
        reason: "Automatische Übernahme ist technisch fehlgeschlagen.",
        details: {
          databaseError: applyError.message,
          officialResult,
          playerStats,
        },
      })

      return NextResponse.json(
        {
          error: "Automatische Übernahme fehlgeschlagen. Der Fall wurde zur Prüfung gespeichert.",
          reviewCreated: true,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      applied: true,
      result: applyData,
      homeScore: officialResult.homeScore,
      awayScore: officialResult.awayScore,
      playerCount: playerStats.length,
    })
  } catch (error: any) {
    console.error("Sportdarts sync route failed:", error)
    return NextResponse.json(
      { error: error?.message || "Sportdarts-Synchronisation fehlgeschlagen." },
      { status: 500 },
    )
  }
}
