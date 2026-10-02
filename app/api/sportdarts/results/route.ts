import { NextResponse } from "next/server"

const SPORTDARTS_RESULTS_URL = "https://www.sportdartsliga.at/ligasystem/games/results"

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function toIsoDate(value: string) {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!match) return ""
  return `${match[3]}-${match[2]}-${match[1]}`
}

function parseNullableScore(value: string) {
  const cleaned = decodeHtml(value)
  if (!cleaned) return null
  const parsed = Number.parseInt(cleaned, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function parseGames(html: string) {
  const tableMatch = html.match(/<!--\s*Games Table\s*-->([\s\S]*?)<\/table>/i)
  if (!tableMatch) return []

  const rows = Array.from(tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi))
  const games: Array<{
    gameId: string
    weekNumber: number
    date: string
    homeTeam: string
    awayTeam: string
    homeScore: number | null
    awayScore: number | null
    status: "scheduled" | "live" | "completed"
    detailUrl: string
  }> = []

  for (const rowMatch of rows) {
    const row = rowMatch[1]
    const cells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((match) => match[1])
    if (cells.length < 6) continue

    const detailMatch = row.match(/\/ligasystem\/games\/view\/(\d+)/i)
    if (!detailMatch) continue

    const weekNumber = Number.parseInt(decodeHtml(cells[0]), 10)
    const date = toIsoDate(decodeHtml(cells[1]))
    const homeTeam = decodeHtml(cells[2])
    const homeScore = parseNullableScore(cells[3])
    const awayScore = parseNullableScore(cells[4])
    const awayTeam = decodeHtml(cells[5])

    if (!weekNumber || !date || !homeTeam || !awayTeam) continue

    const status: "scheduled" | "live" | "completed" =
      /greenCheck\.png/i.test(row)
        ? "completed"
        : /greenPoint\.png/i.test(row)
          ? "live"
          : "scheduled"

    const gameId = detailMatch[1]

    games.push({
      gameId,
      weekNumber,
      date,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      status,
      detailUrl: `https://www.sportdartsliga.at/ligasystem/games/view/${gameId}`,
    })
  }

  return games
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const seasonId = Number(body?.seasonId)
    const divisionId = Number(body?.divisionId)

    if (!Number.isInteger(seasonId) || seasonId <= 0 || !Number.isInteger(divisionId) || divisionId <= 0) {
      return NextResponse.json({ error: "Ungültige Saison oder Division." }, { status: 400 })
    }

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

    if (!response.ok) {
      return NextResponse.json(
        { error: `Sportdarts antwortet mit HTTP ${response.status}.` },
        { status: 502 },
      )
    }

    const html = await response.text()
    return NextResponse.json({
      seasonId,
      divisionId,
      games: parseGames(html),
    })
  } catch (error) {
    console.error("Sportdarts results route failed:", error)
    return NextResponse.json(
      { error: "Sportdarts-Ergebnisse konnten nicht geladen werden." },
      { status: 500 },
    )
  }
}
