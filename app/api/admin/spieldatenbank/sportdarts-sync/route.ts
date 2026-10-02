import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SPORTDARTS_DIVISION_URL = "https://www.sportdartsliga.at/ligasystem/division-tables"
const SPORTDARTS_SEASON_ID = 27

const SPORTDARTS_DIVISIONS = [
  { id: 5, name: "Lungau", status: "Lungau" },
  { id: 33, name: "Pongau A", status: "A" },
  { id: 34, name: "Pongau B", status: "B" },
  { id: 35, name: "Pongau R", status: "R" },
  { id: 2, name: "Salzburg A", status: "A" },
  { id: 4, name: "Salzburg B", status: "B" },
  { id: 6, name: "Salzburg C1", status: "C1" },
  { id: 7, name: "Salzburg C2", status: "C2" },
  { id: 8, name: "Salzburg C3", status: "C3" },
  { id: 9, name: "Salzburg C4", status: "C4" },
  { id: 10, name: "Salzburg NC1", status: "NC1" },
  { id: 11, name: "Salzburg NC2", status: "NC2" },
  { id: 12, name: "Salzburg NC3", status: "NC3" },
  { id: 13, name: "Salzburg R", status: "R" },
  { id: 39, name: "Salzburg Steeldart 1", status: "Steeldart 1" },
  { id: 37, name: "Salzburg Steeldart 2", status: "Steeldart 2" },
  { id: 45, name: "Salzburg Steeldart 3", status: "Steeldart 3" },
  { id: 49, name: "Salzburg Steeldart 4", status: "Steeldart 4" },
  { id: 58, name: "Salzburg Steeldart 5", status: "Steeldart 5" },
] as const

type ParsedPlayer = {
  name: string
  number: string
  team: string
  ligastatus: string
  divisionId: number
  divisionName: string
}

type LocalPlayer = {
  id: string
  name: string
  verein: string | null
  ligastatus: string | null
  sportdarts_player_number: string | null
  sportdarts_name: string | null
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) throw new Error("Server-Konfiguration fehlt.")

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x20;|&#32;/gi, " ")
    .replace(/&#x2F;|&#47;/gi, "/")
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

function normalizeHeader(value: string) {
  return stripTags(value)
    .toLocaleLowerCase("de")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
}

function normalizePlayerName(value: string | null | undefined) {
  return decodeHtml(String(value || ""))
    .toLocaleLowerCase("de")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function surnameKey(value: string | null | undefined) {
  const parts = normalizePlayerName(value).split(" ").filter(Boolean)
  return parts.at(-1) || ""
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)

  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = prev[0]
    prev[0] = i

    for (let j = 1; j <= b.length; j += 1) {
      const old = prev[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diagonal + cost,
      )
      diagonal = old
    }
  }

  return prev[b.length]
}

function isPlausibleSuggestion(localName: string, remoteName: string) {
  const local = normalizePlayerName(localName)
  const remote = normalizePlayerName(remoteName)

  if (!local || !remote || local === remote) return false
  if (surnameKey(local) !== surnameKey(remote)) return false

  const distance = levenshtein(local, remote)
  const maxDistance = local.length <= 10 ? 1 : local.length <= 18 ? 2 : 3
  return distance <= maxDistance
}

function isLikelySamePersonName(localName: string, remoteName: string) {
  const local = normalizePlayerName(localName)
  const remote = normalizePlayerName(remoteName)

  if (!local || !remote) return false
  if (local === remote) return true

  const localParts = local.split(" ").filter(Boolean)
  const remoteParts = remote.split(" ").filter(Boolean)
  if (localParts.length < 2 || remoteParts.length < 2) return false

  const localFirst = localParts[0]
  const remoteFirst = remoteParts[0]
  const localLast = localParts[localParts.length - 1]
  const remoteLast = remoteParts[remoteParts.length - 1]

  const firstLooksSame = localFirst === remoteFirst || levenshtein(localFirst, remoteFirst) <= 1
  const lastLooksSame = localLast === remoteLast || levenshtein(localLast, remoteLast) <= 1

  if (!firstLooksSame || !lastLooksSame) return false

  const localSet = new Set(localParts)
  const remoteSet = new Set(remoteParts)
  const localInsideRemote = localParts.every((part) => remoteSet.has(part))
  const remoteInsideLocal = remoteParts.every((part) => localSet.has(part))

  if (localInsideRemote || remoteInsideLocal) return true

  return levenshtein(local, remote) <= Math.max(2, Math.floor(Math.max(local.length, remote.length) * 0.18))
}

function extractPlayerTable(
  html: string,
  divisionId: number,
  divisionName: string,
  ligastatus: string,
): ParsedPlayer[] {
  const tableMatches = Array.from(
    html.matchAll(/<table\b[^>]*class=["'][^"']*table[^"']*["'][^>]*>([\s\S]*?)<\/table>/gi),
  )

  for (const tableMatch of tableMatches) {
    const tableHtml = tableMatch[1]
    const headers = Array.from(tableHtml.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)).map((m) =>
      stripTags(m[1]),
    )

    const normalized = headers.map(normalizeHeader)
    const nameIndex = normalized.findIndex((h) => h === "spieler" || h.includes("spieler"))
    const numberIndex = normalized.findIndex((h) => h === "nr" || h.includes("spielernr") || h.includes("nummer"))
    const teamIndex = normalized.findIndex((h) => h === "team" || h.includes("mannschaft") || h.includes("verein"))

    if (nameIndex < 0 || numberIndex < 0 || teamIndex < 0) continue

    return Array.from(tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi))
      .map((rowMatch) => {
        const cells = Array.from(rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map((cell) =>
          stripTags(cell[1]),
        )

        if (cells.length <= Math.max(nameIndex, numberIndex, teamIndex)) return null

        const name = String(cells[nameIndex] || "").trim()
        const number = String(cells[numberIndex] || "").trim()
        const team = String(cells[teamIndex] || "").trim()

        if (!name || !number || !team) return null

        return {
          name,
          number,
          team,
          ligastatus,
          divisionId,
          divisionName,
        } satisfies ParsedPlayer
      })
      .filter(Boolean) as ParsedPlayer[]
  }

  return []
}

async function fetchDivision(division: (typeof SPORTDARTS_DIVISIONS)[number]) {
  const form = new URLSearchParams({
    mySeasonsSelec: String(SPORTDARTS_SEASON_ID),
    myDivisionsSelec: String(division.id),
  })

  const response = await fetch(SPORTDARTS_DIVISION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 EMD-Spieldatenbank-Sync/2.0",
    },
    body: form.toString(),
    cache: "no-store",
    redirect: "follow",
  })

  if (!response.ok) {
    throw new Error(`SportDarts ${division.name}: HTTP ${response.status}.`)
  }

  const html = await response.text()
  return extractPlayerTable(html, division.id, division.name, division.status)
}

function sameRemotePlayer(a: ParsedPlayer, b: ParsedPlayer) {
  return (
    a.number === b.number &&
    normalizePlayerName(a.name) === normalizePlayerName(b.name) &&
    a.team === b.team &&
    a.divisionId === b.divisionId
  )
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

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle()

    if (profileError) throw profileError

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Nur Admins dürfen synchronisieren." }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const mode =
      body?.mode === "apply"
        ? "apply"
        : body?.mode === "confirm"
          ? "confirm"
          : "preview"

    const settled = await Promise.allSettled(
      SPORTDARTS_DIVISIONS.map(async (division) => ({
        division,
        players: await fetchDivision(division),
      })),
    )

    const scannedDivisions: Array<{
      id: number
      name: string
      status: string
      players: number
      ok: boolean
      error?: string
    }> = []

    const remotePlayers: ParsedPlayer[] = []

    settled.forEach((result, index) => {
      const division = SPORTDARTS_DIVISIONS[index]

      if (result.status === "fulfilled") {
        scannedDivisions.push({
          id: division.id,
          name: division.name,
          status: division.status,
          players: result.value.players.length,
          ok: true,
        })
        remotePlayers.push(...result.value.players)
      } else {
        scannedDivisions.push({
          id: division.id,
          name: division.name,
          status: division.status,
          players: 0,
          ok: false,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        })
      }
    })

    const successfulDivisions = scannedDivisions.filter((row) => row.ok)
    if (successfulDivisions.length === 0) {
      return NextResponse.json(
        { error: "Keine SportDarts-Division konnte gelesen werden." },
        { status: 502 },
      )
    }

    if (mode === "confirm") {
      const localPlayerId = String(body?.localPlayerId || "").trim()
      const playerNumber = String(body?.playerNumber || "").trim()
      const sportdartsName = String(body?.sportdartsName || "").trim()

      if (!localPlayerId || !playerNumber || !sportdartsName) {
        return NextResponse.json(
          { error: "Für die manuelle Zuordnung fehlen erforderliche Daten." },
          { status: 400 },
        )
      }

      const remoteCandidate = remotePlayers.find(
        (player) =>
          player.number.trim() === playerNumber &&
          normalizePlayerName(player.name) === normalizePlayerName(sportdartsName),
      )

      if (!remoteCandidate) {
        return NextResponse.json(
          { error: "Der ausgewählte SportDarts-Spieler wurde in den aktuellen Tabellen nicht gefunden." },
          { status: 409 },
        )
      }

      const { data: localPlayer, error: localPlayerError } = await supabase
        .from("spieldatenbank")
        .select("id,name")
        .eq("id", localPlayerId)
        .maybeSingle()

      if (localPlayerError) throw localPlayerError
      if (!localPlayer) {
        return NextResponse.json({ error: "Lokaler Spieler wurde nicht gefunden." }, { status: 404 })
      }

      const { error: updateError } = await supabase
        .from("spieldatenbank")
        .update({
          sportdarts_player_number: remoteCandidate.number,
          sportdarts_name: remoteCandidate.name,
        })
        .eq("id", localPlayerId)

      if (updateError) throw updateError

      return NextResponse.json({
        mode: "confirm",
        confirmed: true,
        localPlayer: {
          id: localPlayer.id,
          name: localPlayer.name,
        },
        sportdarts: {
          playerNumber: remoteCandidate.number,
          name: remoteCandidate.name,
          team: remoteCandidate.team,
          divisionName: remoteCandidate.divisionName,
        },
        safeguards: {
          internalNameChanged: false,
          internalClubChanged: false,
          internalLigaStatusChanged: false,
          onlyExternalMappingWritten: true,
        },
      })
    }

    const remoteByNumber = new Map<string, ParsedPlayer[]>()
    const remoteByExactName = new Map<string, ParsedPlayer[]>()

    for (const remote of remotePlayers) {
      const number = remote.number.trim()
      const nameKey = normalizePlayerName(remote.name)

      const byNumber = remoteByNumber.get(number) || []
      if (!byNumber.some((row) => sameRemotePlayer(row, remote))) byNumber.push(remote)
      remoteByNumber.set(number, byNumber)

      if (nameKey) {
        const byName = remoteByExactName.get(nameKey) || []
        if (!byName.some((row) => sameRemotePlayer(row, remote))) byName.push(remote)
        remoteByExactName.set(nameKey, byName)
      }
    }

    const { data: localRows, error: localError } = await supabase
      .from("spieldatenbank")
      .select("id,name,verein,ligastatus,sportdarts_player_number,sportdarts_name")
      .order("name")

    if (localError) throw localError

    const localPlayers = (localRows || []) as LocalPlayer[]

    // Vertrauenswürdige Brücke für unsere Vereinsmitglieder:
    // club_players.spieldatenbank_id -> club_players.player_number
    // So kann z. B. "Alen Alukic" intern mit SportDarts "AL3N ALUKIC"
    // trotzdem sicher über dieselbe Spielernummer verbunden werden.
    const { data: clubPlayerRows, error: clubPlayerError } = await supabase
      .from("club_players")
      .select("id,name,player_number,spieldatenbank_id")
      .not("spieldatenbank_id", "is", null)

    if (clubPlayerError) throw clubPlayerError

    const clubNumberBySpieldatenbankId = new Map<string, string[]>()

    for (const row of clubPlayerRows || []) {
      const spieldatenbankId = String((row as any).spieldatenbank_id || "").trim()
      const playerNumber = String((row as any).player_number || "").trim()

      if (!spieldatenbankId || !playerNumber) continue

      const numbers = clubNumberBySpieldatenbankId.get(spieldatenbankId) || []
      if (!numbers.includes(playerNumber)) numbers.push(playerNumber)
      clubNumberBySpieldatenbankId.set(spieldatenbankId, numbers)
    }

    const changes: any[] = []
    const suggestions: any[] = []
    const ambiguous: any[] = []
    const unmatched: any[] = []
    let unchanged = 0
    let matchedByNumber = 0
    let matchedByClubPlayerNumber = 0
    let matchedByExactName = 0

    for (const local of localPlayers) {
      const currentNumber = String(local.sportdarts_player_number || "").trim()
      const linkedClubNumbers = clubNumberBySpieldatenbankId.get(local.id) || []

      let candidates: ParsedPlayer[] = []
      let matchMethod: "number" | "club_player_number" | "exact_name" | null = null
      let trustedNumber = currentNumber

      if (currentNumber) {
        candidates = remoteByNumber.get(currentNumber) || []
        matchMethod = "number"
      } else if (linkedClubNumbers.length === 1) {
        trustedNumber = linkedClubNumbers[0]
        candidates = remoteByNumber.get(trustedNumber) || []
        matchMethod = "club_player_number"
      } else if (linkedClubNumbers.length > 1) {
        ambiguous.push({
          id: local.id,
          internalName: local.name,
          playerNumber: null,
          reason: "Mehrere unterschiedliche Spielernummern in club_players gefunden.",
          candidates: linkedClubNumbers.map((number) => ({
            name: local.name,
            number,
            team: "Vereinszuordnung",
            divisionName: "club_players",
          })),
        })
        continue
      } else {
        candidates = remoteByExactName.get(normalizePlayerName(local.name)) || []
        matchMethod = "exact_name"
      }

      if (candidates.length === 1) {
        const remote = candidates[0]

        if (matchMethod === "number") matchedByNumber += 1
        if (matchMethod === "club_player_number") matchedByClubPlayerNumber += 1
        if (matchMethod === "exact_name") matchedByExactName += 1

        const toNumber = remote.number
        const toAlias = remote.name

        const numberChanged = currentNumber !== toNumber
        const aliasChanged = (local.sportdarts_name || null) !== toAlias

        if (!numberChanged && !aliasChanged) {
          unchanged += 1
          continue
        }

        changes.push({
          id: local.id,
          internalName: local.name,
          playerNumber: toNumber,
          sportdartsName: toAlias,
          divisionName: remote.divisionName,
          sportdartsTeam: remote.team,
          sportdartsLigastatus: remote.ligastatus,
          matchMethod,
          fromNumber: currentNumber || null,
          trustedClubPlayerNumber: matchMethod === "club_player_number" ? trustedNumber : null,
          toNumber,
          internalVerein: local.verein || null,
          internalLigastatus: local.ligastatus || null,
          numberChanged,
          aliasChanged,
        })
        continue
      }

      if (candidates.length > 1) {
        ambiguous.push({
          id: local.id,
          internalName: local.name,
          playerNumber: currentNumber || null,
          candidates: candidates.map((row) => ({
            name: row.name,
            number: row.number,
            team: row.team,
            divisionName: row.divisionName,
          })),
        })
        continue
      }

      if (!currentNumber) {
        const plausible = remotePlayers
          .filter((remote) => isPlausibleSuggestion(local.name, remote.name))
          .slice(0, 5)

        if (plausible.length > 0) {
          suggestions.push({
            id: local.id,
            internalName: local.name,
            candidates: plausible.map((row) => ({
              name: row.name,
              number: row.number,
              team: row.team,
              divisionName: row.divisionName,
              ligastatus: row.ligastatus,
            })),
          })
          continue
        }
      }

      unmatched.push({
        id: local.id,
        internalName: local.name,
        playerNumber: currentNumber || null,
      })
    }

    // SportDarts-Spieler, die noch nicht eindeutig zugeordnet sind.
    // Bevor jemand als "neu" gilt, prüfen wir auch plausible lokale Dubletten.
    const matchedRemoteKeys = new Set<string>()

    for (const local of localPlayers) {
      const localNumber = String(local.sportdarts_player_number || "").trim()
      if (localNumber) {
        for (const remote of remoteByNumber.get(localNumber) || []) {
          matchedRemoteKeys.add(`${remote.number}::${normalizePlayerName(remote.name)}`)
        }
      }

      const linkedClubNumbers = clubNumberBySpieldatenbankId.get(local.id) || []
      for (const clubNumber of linkedClubNumbers) {
        for (const remote of remoteByNumber.get(clubNumber) || []) {
          matchedRemoteKeys.add(`${remote.number}::${normalizePlayerName(remote.name)}`)
        }
      }

      const exactNameMatches = remoteByExactName.get(normalizePlayerName(local.name)) || []
      if (exactNameMatches.length === 1) {
        const remote = exactNameMatches[0]
        matchedRemoteKeys.add(`${remote.number}::${normalizePlayerName(remote.name)}`)
      }
    }

    const remoteOnlyMap = new Map<string, {
      number: string
      name: string
      teams: string[]
      divisions: string[]
      ligastatus: string[]
    }>()

    const possibleExistingMap = new Map<string, {
      number: string
      name: string
      teams: string[]
      divisions: string[]
      ligastatus: string[]
      localCandidates: Array<{ id: string; name: string; verein: string | null; ligastatus: string | null }>
    }>()

    for (const remote of remotePlayers) {
      const key = `${remote.number}::${normalizePlayerName(remote.name)}`
      if (matchedRemoteKeys.has(key)) continue

      const likelyLocal = localPlayers
        .filter((local) => isLikelySamePersonName(local.name, remote.name))
        .map((local) => ({
          id: local.id,
          name: local.name,
          verein: local.verein || null,
          ligastatus: local.ligastatus || null,
        }))

      if (likelyLocal.length > 0) {
        const existing = possibleExistingMap.get(key) || {
          number: remote.number,
          name: remote.name,
          teams: [],
          divisions: [],
          ligastatus: [],
          localCandidates: likelyLocal,
        }

        if (remote.team && !existing.teams.includes(remote.team)) existing.teams.push(remote.team)
        if (remote.divisionName && !existing.divisions.includes(remote.divisionName)) existing.divisions.push(remote.divisionName)
        if (remote.ligastatus && !existing.ligastatus.includes(remote.ligastatus)) existing.ligastatus.push(remote.ligastatus)

        possibleExistingMap.set(key, existing)
        continue
      }

      const existing = remoteOnlyMap.get(key) || {
        number: remote.number,
        name: remote.name,
        teams: [],
        divisions: [],
        ligastatus: [],
      }

      if (remote.team && !existing.teams.includes(remote.team)) existing.teams.push(remote.team)
      if (remote.divisionName && !existing.divisions.includes(remote.divisionName)) existing.divisions.push(remote.divisionName)
      if (remote.ligastatus && !existing.ligastatus.includes(remote.ligastatus)) existing.ligastatus.push(remote.ligastatus)

      remoteOnlyMap.set(key, existing)
    }

    const remoteOnly = Array.from(remoteOnlyMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "de", { sensitivity: "base" }),
    )

    const possibleExisting = Array.from(possibleExistingMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "de", { sensitivity: "base" }),
    )

    let updated = 0

    if (mode === "apply") {
      for (const change of changes) {
        const payload = {
          sportdarts_player_number: change.toNumber,
          sportdarts_name: change.sportdartsName,
        }

        // WICHTIG:
        // Interne Vereinsdaten sind die führende Quelle.
        // Daher werden name, verein, ligastatus, geschlecht usw. NIEMALS
        // durch SportDarts überschrieben.
        const { error: updateError } = await supabase
          .from("spieldatenbank")
          .update(payload)
          .eq("id", change.id)

        if (updateError) throw updateError
        updated += 1
      }
    }

    return NextResponse.json({
      mode,
      sportdartsSeasonId: SPORTDARTS_SEASON_ID,
      scannedDivisions,
      summary: {
        totalLocalPlayers: localPlayers.length,
        remotePlayers: remotePlayers.length,
        divisionsTotal: SPORTDARTS_DIVISIONS.length,
        divisionsRead: successfulDivisions.length,
        matchedByNumber,
        matchedByClubPlayerNumber,
        matchedByExactName,
        willUpdate: changes.length,
        updated,
        unchanged,
        suggestions: suggestions.length,
        unmatched: unmatched.length,
        ambiguous: ambiguous.length,
        remoteOnly: remoteOnly.length,
        possibleExisting: possibleExisting.length,
      },
      changes,
      suggestions,
      ambiguous,
      unmatched,
      remoteOnly,
      possibleExisting,
      safeguards: {
        internalNamesChanged: false,
        internalClubChanged: false,
        internalLigaStatusChanged: false,
        internalDataIsMaster: true,
        fuzzyAutoApply: false,
        exactNameBootstrap: true,
        clubPlayerNumberBootstrap: true,
        scansAllKnownDivisions: true,
      },
    })
  } catch (error: any) {
    console.error("SportDarts spieldatenbank sync failed:", error)
    return NextResponse.json(
      { error: error?.message || "SportDarts-Synchronisierung fehlgeschlagen." },
      { status: 500 },
    )
  }
}
