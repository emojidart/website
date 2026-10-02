import { NextResponse } from "next/server"

const LIVE_URL = "https://www.sportdartsliga.at/ligasystem/games/livegames"

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

function parseStatus(rowHtml: string): "started" | "scheduled" | "completed" {
  if (/greenCheck/i.test(rowHtml)) return "completed"
  if (/redPoint/i.test(rowHtml)) return "scheduled"
  if (/greenPoint/i.test(rowHtml)) return "started"

  const titleMatch = rowHtml.match(/(?:title|alt)=["']([^"']+)["']/i)
  const title = decodeHtml(titleMatch?.[1] || "").toLowerCase()
  if (title.includes("beendet")) return "completed"
  if (title.includes("noch nicht gestartet")) return "scheduled"
  if (title.includes("gestartet")) return "started"

  return "started"
}

function parseLiveGames(html: string) {
  const livePart = html.split(/LIVE-Turniere/i)[0] || html
  const sectionRegex = /<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3[^>]*>|$)/gi
  const games: Array<{
    gameId: string
    division: string
    weekNumber: number
    homeTeam: string
    awayTeam: string
    homeScore: number | null
    awayScore: number | null
    status: "started" | "scheduled" | "completed"
  }> = []

  for (const section of livePart.matchAll(sectionRegex)) {
    const division = decodeHtml(section[1])
    if (!division || /live-spiele/i.test(division)) continue

    const sectionHtml = section[2]
    const rows = Array.from(sectionHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi))

    for (const rowMatch of rows) {
      const rowHtml = rowMatch[1]
      const cells = Array.from(rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(
        (cell) => decodeHtml(cell[1]),
      )

      if (cells.length < 5) continue

      const gameIdMatch =
        rowHtml.match(/\/ligasystem\/games\/view\/(\d+)/i) ||
        rowHtml.match(/games\/view\/(\d+)/i)

      if (!gameIdMatch) continue

      const weekNumber = Number.parseInt(cells[0] || "", 10)
      const homeTeam = cells[1] || ""
      const awayTeam = cells[2] || ""
      const homeScoreRaw = Number.parseInt(cells[3] || "", 10)
      const awayScoreRaw = Number.parseInt(cells[4] || "", 10)

      if (!homeTeam || !awayTeam) continue

      games.push({
        gameId: gameIdMatch[1],
        division,
        weekNumber: Number.isFinite(weekNumber) ? weekNumber : 0,
        homeTeam,
        awayTeam,
        homeScore: Number.isFinite(homeScoreRaw) ? homeScoreRaw : null,
        awayScore: Number.isFinite(awayScoreRaw) ? awayScoreRaw : null,
        status: parseStatus(rowHtml),
      })
    }
  }

  return games
}

export async function GET() {
  try {
    const response = await fetch(LIVE_URL, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 EMD-League/1.0",
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

    return NextResponse.json({
      games: parseLiveGames(html),
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Sportdarts livegames failed:", error)
    return NextResponse.json(
      { error: "LIVE-Spiele konnten nicht geladen werden." },
      { status: 500 },
    )
  }
}
