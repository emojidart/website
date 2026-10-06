import { supabase } from "@/lib/supabase"

export type TournamentAccessType = "" | "public" | "club_internal" | "club_external"
export type RRPlayer = { id: string; name: string }

function splitIntoGroups(players: RRPlayer[], groupCount: number): RRPlayer[][] {
  const groups: RRPlayer[][] = Array.from({ length: groupCount }, () => [])
  const shuffled = [...players].sort(() => Math.random() - 0.5)
  shuffled.forEach((player, index) => groups[index % groupCount].push(player))
  return groups
}

function generateRoundRobinPairs(playersIn: RRPlayer[]) {
  const bye: RRPlayer = { id: "__bye__", name: "Freilos" }
  const players = [...playersIn]

  if (players.length < 2) return []
  if (players.length % 2 === 1) players.push(bye)

  const rounds: Array<{ roundNo: number; pairs: Array<{ a: RRPlayer; b: RRPlayer }> }> = []
  const rotation = [...players]

  for (let roundIndex = 0; roundIndex < players.length - 1; roundIndex += 1) {
    const pairs: Array<{ a: RRPlayer; b: RRPlayer }> = []

    for (let index = 0; index < players.length / 2; index += 1) {
      const a = rotation[index]
      const b = rotation[players.length - 1 - index]
      if (a.id !== bye.id && b.id !== bye.id) pairs.push({ a, b })
    }

    rounds.push({ roundNo: roundIndex + 1, pairs })

    const fixed = rotation[0]
    const rest = rotation.slice(1)
    rest.unshift(rest.pop()!)
    rotation.splice(0, rotation.length, fixed, ...rest)
  }

  return rounds
}

export async function createRoundRobinWithSchedule(opts: {
  name: string
  groupCount: number
  players: RRPlayer[]
  accessType: Exclude<TournamentAccessType, "">
  centralEventId?: string | null
  seriesId?: string | null
  eventId?: string | null
}) {
  const { name, groupCount, players, accessType, centralEventId, seriesId, eventId } = opts

  const { data: roundRobin, error: roundRobinError } = await supabase
    .from("round_robin")
    .insert({ name, status: "created", access_type: accessType })
    .select("id")
    .single()

  if (roundRobinError) throw roundRobinError
  const roundRobinId = roundRobin.id as string

  const { data: groups, error: groupError } = await supabase
    .from("round_robin_groups")
    .insert(
      Array.from({ length: groupCount }, (_, index) => ({
        round_robin_id: roundRobinId,
        group_no: index + 1,
        name: `Gruppe ${index + 1}`,
      })),
    )
    .select("id, group_no")

  if (groupError) throw groupError
  if (!groups?.length) throw new Error("No groups inserted")

  const groupsByNumber = new Map<number, string>()
  groups.forEach((group: any) => groupsByNumber.set(Number(group.group_no), String(group.id)))

  const groupedPlayers = splitIntoGroups(players, groupCount)
  const groupPlayerRows: any[] = []
  const matchRows: any[] = []

  groupedPlayers.forEach((playersInGroup, groupIndex) => {
    const groupNo = groupIndex + 1
    const groupId = groupsByNumber.get(groupNo)
    if (!groupId) throw new Error(`Missing groupId for group ${groupNo}`)

    playersInGroup.forEach((player, index) => {
      groupPlayerRows.push({
        group_id: groupId,
        player_id: player.id,
        player_name: player.name,
        seed: index + 1,
      })
    })

    generateRoundRobinPairs(playersInGroup).forEach((round) => {
      round.pairs.forEach((pair, matchIndex) => {
        matchRows.push({
          round_robin_id: roundRobinId,
          group_id: groupId,
          round_no: round.roundNo,
          match_no: matchIndex + 1,
          player1_id: pair.a.id,
          player1_name: pair.a.name,
          player2_id: pair.b.id,
          player2_name: pair.b.name,
          planned_machine: null,
        })
      })
    })
  })

  if (groupPlayerRows.length) {
    const { error } = await supabase.from("round_robin_group_players").insert(groupPlayerRows)
    if (error) throw error
  }

  if (matchRows.length) {
    const { error } = await supabase.from("round_robin_matches").insert(matchRows)
    if (error) throw error
  }

  const { error: statusError } = await supabase.from("tournaments_status").insert({
    tournament_id: roundRobinId,
    tournament_type: "round_robin",
    tournament_name: name,
    access_type: accessType,
    status: "active",
    central_event_id: centralEventId || null,
    series_id: seriesId || null,
    series_event_id: eventId || null,
  })

  if (statusError && (statusError as any).code !== "23505") throw statusError

  return { roundRobinId }
}

export function createTournamentIdCompat() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function buildDkoStartRoute(opts: {
  tournamentSize: number
  tournamentId: string
  tournamentName: string
  accessType: TournamentAccessType
  seriesId?: string | null
  eventId?: string | null
}) {
  const size = [8, 16, 32, 64, 128].includes(opts.tournamentSize) ? opts.tournamentSize : 16
  const params = new URLSearchParams({
    shuffle: "true",
    tournamentId: opts.tournamentId,
    tournamentName: opts.tournamentName,
    accessType: opts.accessType,
  })
  if (opts.seriesId) params.set("seriesId", opts.seriesId)
  if (opts.eventId) params.set("eventId", opts.eventId)
  return `/${size}erdko?${params.toString()}`
}

export function buildTournamentContinueRoute(opts: {
  tournamentType: string
  tournamentId: string
  tournamentName: string
  accessType: TournamentAccessType | null
  seriesId?: string | null
  eventId?: string | null
}) {
  const encodedName = encodeURIComponent(opts.tournamentName)
  const encodedAccessType = encodeURIComponent(opts.accessType || "public")

  if (opts.tournamentType === "round_robin") {
    const extra = `${opts.seriesId ? `&seriesId=${encodeURIComponent(opts.seriesId)}` : ""}${opts.eventId ? `&eventId=${encodeURIComponent(opts.eventId)}` : ""}`
    return `/roundrobin?roundRobinId=${opts.tournamentId}&tournamentName=${encodedName}&accessType=${encodedAccessType}${extra}`
  }

  const routeMap: Record<string, string> = {
    "8er_dko": "/8erdko",
    "16er_dko": "/16erdko",
    "32er_dko": "/32erdko",
    "64er_dko": "/64erdko",
    "128er_dko": "/128erdko",
  }

  const route = routeMap[opts.tournamentType] || "/16erdko"
  const extra = `${opts.seriesId ? `&seriesId=${encodeURIComponent(opts.seriesId)}` : ""}${opts.eventId ? `&eventId=${encodeURIComponent(opts.eventId)}` : ""}`
  return `${route}?tournamentId=${opts.tournamentId}&tournamentName=${encodedName}&accessType=${encodedAccessType}${extra}`
}
