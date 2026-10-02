import { NextRequest, NextResponse } from "next/server"

const SOURCE_URL = "https://www.sportdartsliga.at/ligasystem/division-tables"

type SelectOption = {
  value: string
  label: string
  selected: boolean
}

type TableData = {
  headers: string[]
  rows: string[][]
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function stripTags(value: string) {
  return decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " "),
  )
}

function extractSelectOptions(html: string, selectId: string): SelectOption[] {
  const selectMatch = html.match(
    new RegExp(`<select[^>]*id=["']${selectId}["'][^>]*>([\\s\\S]*?)<\\/select>`, "i"),
  )
  if (!selectMatch) return []

  return Array.from(
    selectMatch[1].matchAll(/<option\b([^>]*)value=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/option>/gi),
  ).map((match) => {
    const attrs = `${match[1]} ${match[3]}`
    return {
      value: match[2],
      label: stripTags(match[4]),
      selected: /\bselected\b/i.test(attrs),
    }
  })
}

function extractTables(html: string): TableData[] {
  const tableMatches = Array.from(html.matchAll(/<table\b[^>]*class=["'][^"']*table[^"']*["'][^>]*>([\s\S]*?)<\/table>/gi))

  return tableMatches.map((tableMatch) => {
    const tableHtml = tableMatch[1]

    const headers = Array.from(tableHtml.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi))
      .map((m) => stripTags(m[1]))
      .filter(Boolean)

    const rows = Array.from(tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi))
      .map((rowMatch) =>
        Array.from(rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map((cell) =>
          stripTags(cell[1]),
        ),
      )
      .filter((cells) => cells.length > 0)

    return { headers, rows }
  })
}

function extractTitle(html: string) {
  const marker = "<!-- Division Table -->"
  const afterMarker = html.includes(marker) ? html.split(marker)[1] : html
  const heading = afterMarker.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)
  return heading ? stripTags(heading[1]) : ""
}

function extractOpenRounds(html: string) {
  const block = html.match(/<div\b[^>]*class=["'][^"']*openRounds[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
  if (!block) return []

  return Array.from(block[1].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
    .map((m) => stripTags(m[1]))
    .filter(Boolean)
}

function validNumericId(value: unknown) {
  return typeof value === "string" && /^\d{1,6}$/.test(value)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const seasonId = String(body?.seasonId ?? "")
    const divisionId = String(body?.divisionId ?? "")

    if (!validNumericId(seasonId) || !validNumericId(divisionId)) {
      return NextResponse.json(
        { error: "Ungültige Saison- oder Divisions-ID." },
        { status: 400 },
      )
    }

    const form = new URLSearchParams({
      mySeasonsSelec: seasonId,
      myDivisionsSelec: divisionId,
    })

    const response = await fetch(SOURCE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 EMD-League-Viewer/1.0",
      },
      body: form.toString(),
      cache: "no-store",
      redirect: "follow",
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Sportdarts Liga antwortet mit HTTP ${response.status}.` },
        { status: 502 },
      )
    }

    const html = await response.text()
    const tables = extractTables(html)

    if (tables.length === 0) {
      return NextResponse.json(
        { error: "Auf der Sportdarts-Seite wurden keine Tabellen gefunden." },
        { status: 502 },
      )
    }

    return NextResponse.json({
      title: extractTitle(html),
      seasons: extractSelectOptions(html, "mySeasonsSelec"),
      divisions: extractSelectOptions(html, "myDivisionsSelec").filter((item) => item.value !== "0"),
      teamTable: tables[0] ?? { headers: [], rows: [] },
      playerTable: tables[1] ?? { headers: [], rows: [] },
      openRounds: extractOpenRounds(html),
      source: SOURCE_URL,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("sportdarts route error", error)
    return NextResponse.json(
      { error: "Die Ligadaten konnten nicht geladen werden." },
      { status: 500 },
    )
  }
}
