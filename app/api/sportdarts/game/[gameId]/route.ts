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
  // Die offizielle SportDarts-Tabelle ist die einzige Quelle der Spieler-Checks.
  // Leere Angaben sind unbekannt, nicht 0. Ein echtes "0 / 0" ist gültig.
  const match = String(value || "").trim().match(/^(\d*)\s*\/\s*(\d+)$/)
  if (!match) return { checksMade: null, checksTotal: null }
  const made = match[1] ? Number(match[1]) : 0
  const total = Number(match[2])
  if (!Number.isSafeInteger(made) || !Number.isSafeInteger(total) || made > total) {
    return { checksMade: null, checksTotal: null }
  }
  return { checksMade: made, checksTotal: total }
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
  // Sportdarts liefert an dieser Stelle teilweise ungültiges HTML
  // (<h5> und <form> direkt innerhalb eines <tr>). Deshalb ordnen wir jedes
  // Game-Formular über seine Position im Original-HTML dem zuletzt davor
  // vorkommenden Block-Heading zu. Das ist deutlich robuster als Tabellenindizes.
  const headings = Array.from(
    html.matchAll(/<h5[^>]*>\s*<b[^>]*>\s*([^<]*?Block\s*\d+|Teamblock)\s*<\/b>\s*<\/h5>/gi),
  ).map((match) => ({
    index: match.index ?? -1,
    block: decodeHtml(match[1] || ""),
  }))

  const forms = Array.from(
    html.matchAll(/<form[^>]*id=["']Game(\d+)Selector["'][^>]*>[\s\S]*?<\/form>/gi),
  )

  const plays: StructuredPlay[] = []

  for (const formMatch of forms) {
    const formIndex = formMatch.index ?? -1
    let block = ""

    for (let i = headings.length - 1; i >= 0; i -= 1) {
      if (headings[i].index <= formIndex) {
        block = headings[i].block
        break
      }
    }

    // Ein Sportdarts-Spiel muss einem echten Spielblock zugeordnet sein.
    if (!/block\s*\d+|teamblock/i.test(block)) continue

    const formHtml = formMatch[0]
    const cells = Array.from(formHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi))
      .map((cell) => decodeHtml(cell[1]))

    if (cells.length < 4) continue

    const homePlayer = cells[0]?.trim() || ""
    const homeLegText = cells[1]?.trim() || ""
    const awayLegText = cells[2]?.trim() || ""
    const awayPlayer = cells[cells.length - 1]?.trim() || ""

    if (!homePlayer || !awayPlayer) continue
    const homeScore = homeLegText.match(/^\d+/)?.[0]
    const awayScore = awayLegText.match(/^\d+/)?.[0]
    if (homeScore === undefined || awayScore === undefined) continue

    plays.push({
      block,
      playId: inputValue(formHtml, "playId") || formMatch[1] || "",
      fixtureId: inputValue(formHtml, "fixtureId"),
      existingPlayId: inputValue(formHtml, "existingplayId"),
      homePlayerNumber: inputValue(formHtml, "PlayerHome"),
      awayPlayerNumber: inputValue(formHtml, "PlayerGuest"),
      secondHomePlayerNumber: inputValue(formHtml, "SecondPlayerHome"),
      secondAwayPlayerNumber: inputValue(formHtml, "SecondPlayerGuest"),
      homePlayer,
      awayPlayer,
      homeLegs: Number(homeScore),
      awayLegs: Number(awayScore),
      isTeamMatch: /teamblock|team\s*(?:m\.o\.|d\.o\.|-)/i.test(block),
    })
  }

  return plays
}


// Read the actual Sportdarts match rows, including unplayed fixtures and
// headings such as "501 M.O. - Block 1" and "Block 4 - Team".
// This is exclusively for the read-only LIVE display. Official sync data
// continues to use only finished matches from parseStructuredPlays().
function formatLivePlayerCell(raw: string) {
  const bits = raw.split(/<br\s*\/?>/gi).map(decodeHtml).filter(Boolean)
  if (bits.length === 4) return `${bits[0]} ${bits[1]}\n${bits[2]} ${bits[3]}`
  if (bits.length === 2) return `${bits[0]} ${bits[1]}`
  return decodeHtml(raw)
}

function parseLiveDisplayBlocks(html: string) {
  // Public match reports may contain plain HTML tables instead of GameSelector forms.
  // Parse the visible result blocks directly; this is display-only and does not
  // create player identities, wins, or statistics for the official sync.
  const groups: Array<{ title: string; matches: Array<{ leftPlayer: string; leftScore: string; rightScore: string; rightPlayer: string }> }> = []
  const headingMatches = Array.from(html.matchAll(/<h5\b[^>]*>\s*<b\b[^>]*>([\s\S]*?)<\/b>\s*<\/h5>/gi))
  for (let i = 0; i < headingMatches.length; i++) {
    const heading = headingMatches[i]
    const title = decodeHtml(heading[1]).trim()
    if (!/^(?:Block\s*\d+|Teamblock|.*?\s+-\s+Block\s*\d+|Block\s*\d+\s+-\s+.*)$/i.test(title)) continue
    const begin = (heading.index ?? 0) + heading[0].length
    const end = i + 1 < headingMatches.length ? headingMatches[i + 1].index ?? html.length : html.length
    const section = html.slice(begin, end)
    const table = section.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i)?.[1]
    if (!table) continue
    const matches: Array<{ leftPlayer: string; leftScore: string; rightScore: string; rightPlayer: string }> = []
    for (const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = Array.from(row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map(m => m[1])
      if (cells.length < 4) continue
      const leftPlayer = formatLivePlayerCell(cells[0])
      const rightPlayer = formatLivePlayerCell(cells[cells.length - 1])
      const leftScore = decodeHtml(cells[1])
      const rightScore = decodeHtml(cells[2])
      if (!leftPlayer || !rightPlayer) continue
      matches.push({
        leftPlayer,
        leftScore: /^\d+$/.test(leftScore) ? leftScore : "-",
        rightScore: /^\d+$/.test(rightScore) ? rightScore : "-",
        rightPlayer,
      })
    }
    if (matches.length) groups.push({ title, matches })
  }
  return groups
}

function blocksFromStructuredPlays(plays: StructuredPlay[]) {
  const grouped = new Map<
    string,
    {
      title: string
      matches: Array<{
        leftPlayer: string
        leftScore: string
        rightScore: string
        rightPlayer: string
      }>
    }
  >()

  for (const play of plays) {
    const key = play.block.toLowerCase()
    if (!grouped.has(key)) {
      grouped.set(key, {
        title: play.block,
        matches: [],
      })
    }

    grouped.get(key)!.matches.push({
      leftPlayer: play.homePlayer,
      leftScore: String(play.homeLegs),
      rightScore: String(play.awayLegs),
      rightPlayer: play.awayPlayer,
    })
  }

  return Array.from(grouped.values())
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de-AT,de;q=0.9,en;q=0.7",
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
    if (!/Punktestand|Checks|Game\d+Selector/i.test(html)) {
      return NextResponse.json({ error: "SportDarts liefert keinen lesbaren Spielbericht. Keine Daten gespeichert." }, { status: 502 })
    }
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

    // Die offizielle Checks-Liste ist die maßgebliche Quelle für die Übernahme.
    // Spielmodi/Blockbezeichnungen dürfen sie nicht ausfiltern.
    const structuredPlays = parseStructuredPlays(html)
    const officialUsed = (players: NonNullable<typeof homeLineup>["players"] | undefined) =>
      (players || [])
        .filter((player) => player.playerNumber && player.checksTotal != null && player.checksTotal > 0)
        .map((player) => player.playerNumber)
    const officialLegs = (players: NonNullable<typeof homeLineup>["players"] | undefined) =>
      (players || [])
        .filter((player) => player.playerNumber && player.checksTotal != null && player.checksTotal > 0)
        .map((player) => ({
          playerNumber: player.playerNumber,
          singlesPlayed: 0, // Keine erfundene Zahl von Einzelspielen.
          legsWon: player.checksMade ?? 0,
          legsLost: Math.max(0, (player.checksTotal ?? 0) - (player.checksMade ?? 0)),
        }))
    // Bei unbekannten Zahlen NICHT auf Null ausweichen oder Werte aus Blöcken raten.
    // Auch Spieler mit 0 / 0 dürfen für die Vorschau sichtbar bleiben.
    if (!homeLineup || !awayLineup || !homeLineup.players.length || !awayLineup.players.length ||
        [...homeLineup.players, ...awayLineup.players].some((player) =>
          !player.playerNumber || player.checksMade === null || player.checksTotal === null
        )) {
      return NextResponse.json(
        { error: "Die offiziellen SportDarts-Checks oder Spielernummern sind unvollständig. Keine Übernahme möglich." },
        { status: 502 },
      )
    }
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
      // Bevorzugt werden die echten Sportdarts-Spielblöcke. Der alte Tabellenparser
      // bleibt nur als Fallback erhalten, falls Sportdarts sein Markup ändert.
      homePlayers: homeLineup?.players || [],
      awayPlayers: awayLineup?.players || [],
      blocks: parseLiveDisplayBlocks(html),

      // New structured read-only sync data.
      singles: structuredPlays.filter((play) => !play.isTeamMatch),
      teamMatches: structuredPlays.filter((play) => play.isTeamMatch),
      homePlayerLegs: officialLegs(homeLineup?.players),
      awayPlayerLegs: officialLegs(awayLineup?.players),
      usedHomePlayerNumbers: officialUsed(homeLineup?.players),
      usedAwayPlayerNumbers: officialUsed(awayLineup?.players),
    })
  } catch (error) {
    console.error("Sportdarts game detail failed:", error)
    return NextResponse.json(
      { error: "Spieldetails konnten nicht geladen werden." },
      { status: 500 },
    )
  }
}
