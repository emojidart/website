import { NextResponse } from "next/server"

const BASE_URL = "https://www.sportdartsliga.at"

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

function tableRows(tableHtml: string) {
  return Array.from(tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)).map((row) =>
    Array.from(row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((cell) =>
      decodeHtml(cell[1]),
    ),
  )
}

function findTables(html: string) {
  return Array.from(html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)).map((m) => m[1])
}

function parseScoreSummary(html: string) {
  const scoreText = decodeHtml(
    html.match(/Punktestand:\s*([\s\S]{0,1200}?)(?:<\/table>|<h\d|<div class="row")/i)?.[1] || "",
  )

  const homeMatch = scoreText.match(/Heim:\s*(\d+)/i)
  const awayMatch = scoreText.match(/Gast:\s*(\d+)/i)

  return {
    homeScore: homeMatch?.[1] || "",
    awayScore: awayMatch?.[1] || "",
  }
}

function splitPlayerLabel(value: string) {
  const clean = value.trim()
  const match = clean.match(/^(.*?)\s*-\s*(\d+)\s*$/)
  if (!match) {
    return {
      player: clean,
      playerName: clean,
      playerNumber: "",
    }
  }

  return {
    player: clean,
    playerName: match[1].trim(),
    playerNumber: match[2],
  }
}

function parseChecks(value: string) {
  const match = value.match(/(\d+)\s*\/\s*(\d+)/)
  return {
    checksMade: match ? Number(match[1]) : null,
    checksTotal: match ? Number(match[2]) : null,
  }
}

function parseLineupTable(rows: string[][]) {
  if (!rows.length) return null
  const first = rows[0] || []
  if (first.length < 2) return null

  const header = first.join(" ").toLowerCase()
  if (!header.includes("checks")) return null

  const title = first[0] || ""
  const players = rows
    .slice(1)
    .filter((row) => row.length >= 2 && row[0])
    .map((row) => {
      const base = splitPlayerLabel(row[0])
      const checks = row[row.length - 1] || ""
      return {
        ...base,
        checks,
        ...parseChecks(checks),
      }
    })

  return { title, players }
}

function parseBlockTable(rows: string[][], fallbackTitle: string) {
  if (!rows.length) return null

  const titleRow = rows.find((row) => row.length === 1 && /^Block\s+\d+/i.test(row[0] || ""))
  const title = titleRow?.[0] || fallbackTitle

  const matches = rows
    .filter((row) => row.length >= 4)
    .map((row) => {
      const compact = row.filter((value) => value !== "")
      if (compact.length < 4) return null

      const leftPlayer = compact[0]
      const leftScore = compact[1]
      const rightScore = compact[2]
      const rightPlayer = compact[3]

      if (!leftPlayer || !rightPlayer) return null
      if (!/^\d+$/.test(leftScore || "") || !/^\d+$/.test(rightScore || "")) return null

      return { leftPlayer, leftScore, rightScore, rightPlayer }
    })
    .filter(Boolean) as Array<{
      leftPlayer: string
      leftScore: string
      rightScore: string
      rightPlayer: string
    }>

  if (!matches.length) return null
  return { title, matches }
}

function inputValue(formHtml: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return (
    formHtml.match(new RegExp(`name=["']${escaped}["'][^>]*value=["']([^"']*)["']`, "i"))?.[1] ||
    formHtml.match(new RegExp(`value=["']([^"']*)["'][^>]*name=["']${escaped}["']`, "i"))?.[1] ||
    ""
  )
}

type StructuredPlay = {
  block: string
  playId: string
  fixtureId: string
  existingPlayId: string
  homePlayerNumber: string
  awayPlayerNumber: string
  secondHomePlayerNumber: string
  secondAwayPlayerNumber: string
  homePlayer: string
  awayPlayer: string
  homeLegs: number
  awayLegs: number
  isTeamMatch: boolean
}

function parseStructuredPlays(html: string) {
  const plays: StructuredPlay[] = []

  // Alle Game-Formulare direkt auslesen. So werden auch Überschriften wie
  // "Block 4 - Team" zuverlässig erkannt.
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
      playId: inputValue(formHtml, "playId") || formMatch[1] || "",
      fixtureId: inputValue(formHtml, "fixtureId"),
      existingPlayId: inputValue(formHtml, "existingplayId"),
      homePlayerNumber: inputValue(formHtml, "PlayerHome"),
      awayPlayerNumber: inputValue(formHtml, "PlayerGuest"),
      secondHomePlayerNumber,
      secondAwayPlayerNumber,
      homePlayer: cells[0] || "",
      awayPlayer: cells[cells.length - 1] || "",
      homeLegs,
      awayLegs,
      isTeamMatch:
        Boolean(secondHomePlayerNumber || secondAwayPlayerNumber) ||
        /team|cricket/i.test(block),
    })
  }

  return plays
}

function aggregateSingles(plays: StructuredPlay[], side: "home" | "away") {
  const map = new Map<
    string,
    { playerNumber: string; singlesPlayed: number; legsWon: number; legsLost: number }
  >()

  for (const play of plays) {
    if (play.isTeamMatch) continue

    const playerNumber = side === "home" ? play.homePlayerNumber : play.awayPlayerNumber
    if (!playerNumber) continue

    const won = side === "home" ? play.homeLegs : play.awayLegs
    const lost = side === "home" ? play.awayLegs : play.homeLegs
    const current = map.get(playerNumber) || {
      playerNumber,
      singlesPlayed: 0,
      legsWon: 0,
      legsLost: 0,
    }

    current.singlesPlayed += 1
    current.legsWon += won
    current.legsLost += lost
    map.set(playerNumber, current)
  }

  return Array.from(map.values())
}

function aggregateOfficialChecks(
  players: Array<{
    playerNumber: string
    checksMade: number | null
    checksTotal: number | null
  }>,
  singles: ReturnType<typeof aggregateSingles>,
) {
  const singlesByNumber = new Map(singles.map((row) => [row.playerNumber, row]))

  return players
    .filter((player) => Boolean(player.playerNumber))
    .map((player) => {
      const fallback = singlesByNumber.get(player.playerNumber)
      const hasOfficialChecks = player.checksMade != null && player.checksTotal != null

      if (!hasOfficialChecks) {
        return fallback || {
          playerNumber: player.playerNumber,
          singlesPlayed: 0,
          legsWon: 0,
          legsLost: 0,
        }
      }

      return {
        playerNumber: player.playerNumber,
        singlesPlayed: fallback?.singlesPlayed || 0,
        legsWon: player.checksMade!,
        legsLost: Math.max(0, player.checksTotal! - player.checksMade!),
      }
    })
}


function usedPlayerNumbers(plays: StructuredPlay[], side: "home" | "away") {
  const values = new Set<string>()

  for (const play of plays) {
    const first = side === "home" ? play.homePlayerNumber : play.awayPlayerNumber
    const second = side === "home" ? play.secondHomePlayerNumber : play.secondAwayPlayerNumber
    if (first) values.add(first)
    if (second) values.add(second)
  }

  return Array.from(values)
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await context.params
    if (!/^\d+$/.test(gameId)) {
      return NextResponse.json({ error: "Ungültige Spiel-ID." }, { status: 400 })
    }

    const response = await fetch(`${BASE_URL}/ligasystem/games/view/${gameId}`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 EMD-League/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Sportdarts antwortet mit HTTP ${response.status}.` },
        { status: 502 },
      )
    }

    const html = await response.text()
    const tables = findTables(html)

    const lineupTables = tables
      .map((table) => parseLineupTable(tableRows(table)))
      .filter(Boolean) as Array<{
        title: string
        players: Array<{
          player: string
          playerName: string
          playerNumber: string
          checks: string
          checksMade: number | null
          checksTotal: number | null
        }>
      }>

    const homeLineup =
      lineupTables.find((table) => /heim/i.test(table.title)) ||
      lineupTables[0] ||
      null

    const awayLineup =
      lineupTables.find((table) => /gast/i.test(table.title)) ||
      lineupTables[1] ||
      null

    const blockTables = tables
      .map((table, index) => parseBlockTable(tableRows(table), `Block ${index + 1}`))
      .filter(Boolean) as Array<{
        title: string
        matches: Array<{
          leftPlayer: string
          leftScore: string
          rightScore: string
          rightPlayer: string
        }>
      }>

    const structuredPlays = parseStructuredPlays(html)
    const score = parseScoreSummary(html)

    const homeTeam =
      homeLineup?.title.replace(/^\s*Heim\s*[-–:]\s*/i, "").replace(/\s*Checks\s*$/i, "").trim() || ""
    const awayTeam =
      awayLineup?.title.replace(/^\s*Gast\s*[-–:]\s*/i, "").replace(/\s*Checks\s*$/i, "").trim() || ""

    return NextResponse.json({
      gameId,
      homeTeam,
      awayTeam,
      homeScore: score.homeScore,
      awayScore: score.awayScore,

      // Backward-compatible fields used by the existing LIVE/details view.
      homePlayers: homeLineup?.players || [],
      awayPlayers: awayLineup?.players || [],
      blocks: blockTables,

      // New structured read-only sync data.
      singles: structuredPlays.filter((play) => !play.isTeamMatch),
      teamMatches: structuredPlays.filter((play) => play.isTeamMatch),
      homePlayerLegs: aggregateOfficialChecks(
        homeLineup?.players || [],
        aggregateSingles(structuredPlays, "home"),
      ),
      awayPlayerLegs: aggregateOfficialChecks(
        awayLineup?.players || [],
        aggregateSingles(structuredPlays, "away"),
      ),
      usedHomePlayerNumbers: usedPlayerNumbers(structuredPlays, "home"),
      usedAwayPlayerNumbers: usedPlayerNumbers(structuredPlays, "away"),
    })
  } catch (error) {
    console.error("Sportdarts game detail failed:", error)
    return NextResponse.json(
      { error: "Spieldetails konnten nicht geladen werden." },
      { status: 500 },
    )
  }
}
