import { NextResponse } from "next/server"

const SPORTDARTS_RESULTS_URL = "https://www.sportdartsliga.at/ligasystem/results"
const SPORTDARTS_LEGACY_RESULTS_URL = "https://www.sportdartsliga.at/ligasystem/games/results"
const BROWSER_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "de-AT,de;q=0.9,en;q=0.7",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
  // SportDarts verwendet je nach Version eine kommentierte oder eine normale Tabelle.
  const tableMatch = html.match(/<!--\s*Games Table\s*-->([\s\S]*?)<\/table>/i)
  const section = tableMatch?.[1] ?? html
  const rows = Array.from(section.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi))
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

    // Zuerst die reguläre öffentliche Ergebnisansicht (wie im Browser).
    // Die alte POST-Adresse bleibt nur ein Fallback, falls sie noch funktioniert.
    const query = new URLSearchParams(form.toString())
    const attempts: Array<() => Promise<Response>> = [
      () => fetch(`${SPORTDARTS_RESULTS_URL}?${query.toString()}`, {
        method: "GET", headers: BROWSER_HEADERS, cache: "no-store",
      }),
      () => fetch(SPORTDARTS_LEGACY_RESULTS_URL, {
        method: "POST",
        headers: { ...BROWSER_HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(), cache: "no-store",
      }),
    ]

    const issues: string[] = []
    for (let i = 0; i < attempts.length; i++) {
      let response: Response
      try { response = await attempts[i]() } catch {
        issues.push(`Quelle ${i + 1}: Netzwerkfehler`)
        continue
      }
      if (!response.ok) {
        issues.push(`Quelle ${i + 1}: HTTP ${response.status}`)
        continue
      }
      const html = await response.text()
      const games = parseGames(html)
      // Nie einen erfolgreichen HTTP-Status als Erfolg werten, wenn die Seite
      // kein einziges Spiel enthält (z.B. Login-, Blockier- oder Standardseite).
      if (!games.length) {
        issues.push(`Quelle ${i + 1}: keine lesbaren Spiele – HTML möglicherweise geändert`)
        continue
      }
      return NextResponse.json({ seasonId, divisionId, games })
    }

    return NextResponse.json(
      { error: `SportDarts-Ergebnisse nicht lesbar: ${issues.join("; ")}. Keine Daten gespeichert.` },
      { status: 502 },
    )
  } catch (error) {
    console.error("Sportdarts results route failed:", error)
    return NextResponse.json(
      { error: "Sportdarts-Ergebnisse konnten nicht geladen werden." },
      { status: 500 },
    )
  }
}
