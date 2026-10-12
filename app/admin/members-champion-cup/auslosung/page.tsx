"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Crown,
  Loader2,
  RefreshCw,
  Shuffle,
  Trophy,
  Users,
  XCircle,
  Lock,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { supabase } from "@/lib/supabase"
import { MEMBERS_CUP_DRAW_CHANNEL, type DrawShow } from "@/components/members-cup-draw-show"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type LevelGroup = 1 | 2 | 3
type DrawGroupName = "A" | "B"

type RegisteredPlayer = {
  id: number
  player_id: string
  player_name: string
  registered_at: string
  paid?: boolean
  entry_fee?: number
  payment_method?: string | null
}

type LevelRow = {
  id: string
  spieldatenbank_id: string
  player_name: string
  level_group: LevelGroup
  level_label: string
  average_points: number | null
  notes?: string | null
}

type DrawPlayer = RegisteredPlayer & {
  level: LevelRow | null
}

type GroupedDrawPlayer = DrawPlayer & {
  draw_group: DrawGroupName
}

type DrawTeam = {
  teamNo: number
  playerA: GroupedDrawPlayer
  playerB: GroupedDrawPlayer
}

type RRPlayer = {
  id: string
  name: string
}

const LEVEL_INFO: Record<LevelGroup, { label: string; short: string; className: string }> = {
  1: { label: "Tabelle 1", short: "Stark", className: "bg-orange-50 text-orange-800 border-orange-200" },
  2: { label: "Tabelle 2", short: "Mitte", className: "bg-blue-50 text-blue-800 border-blue-200" },
  3: { label: "Tabelle 3", short: "Schwach", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } },
}

function shuffleArray<T>(array: T[]) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}



function generateRoundRobinPairs(playersIn: RRPlayer[]) {
  const BYE: RRPlayer = { id: "__bye__", name: "Freilos" }
  const players = [...playersIn]

  if (players.length < 2) return []
  if (players.length % 2 === 1) players.push(BYE)

  const rounds: Array<{ roundNo: number; pairs: Array<{ a: RRPlayer; b: RRPlayer }> }> = []
  const arr = [...players]
  const n = arr.length

  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<{ a: RRPlayer; b: RRPlayer }> = []

    for (let i = 0; i < n / 2; i++) {
      const a = arr[i]
      const b = arr[n - 1 - i]

      if (a.id !== BYE.id && b.id !== BYE.id) {
        pairs.push({ a, b })
      }
    }

    rounds.push({ roundNo: r + 1, pairs })

    const fixed = arr[0]
    const rest = arr.slice(1)
    rest.unshift(rest.pop()!)
    arr.splice(0, arr.length, fixed, ...rest)
  }

  return rounds
}

function getPlayerLevelBadge(player: DrawPlayer | GroupedDrawPlayer) {
  const group = player.level?.level_group

  if (!group) {
    return (
      <Badge variant="outline" className="rounded-lg bg-red-500/10 text-red-300 border-red-500/25">
        ohne Einstufung
      </Badge>
    )
  }

  const info = LEVEL_INFO[group]

  return (
    <Badge variant="outline" className={`rounded-lg border px-2 py-0.5 ${group === 1 ? "border-orange-400/25 bg-orange-500/10 text-orange-200" : group === 2 ? "border-sky-400/25 bg-sky-500/10 text-sky-200" : "border-violet-400/25 bg-violet-500/10 text-violet-200"}`}>
      {info.label} – {info.short}
    </Badge>
  )
}

function PlayerMiniCard({ player }: { player: DrawPlayer | GroupedDrawPlayer }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#11171e] p-4 shadow-sm">
      <div className="font-black text-white">{player.player_name}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {getPlayerLevelBadge(player)}
        {typeof player.level?.average_points === "number" ? (
          <Badge variant="outline" className="rounded-lg border-white/10 bg-[#1c252e] text-white/70">
            Ø {player.level.average_points.toLocaleString("de-AT")}
          </Badge>
        ) : null}
      </div>
    </div>
  )
}

export default function AdminMembersChampionCupAuslosungPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedSeriesId = searchParams.get("seriesId")
  const requestedEventId = searchParams.get("eventId")

  // Ein Ereignis fuer alle Anzeigen; gleicher Browser: storage + BroadcastChannel,
  // andere Geraete: Supabase Realtime. Auslosung selbst wird nicht erneut berechnet.
  const broadcastDraw = (names: string[], groupCount: number) => {
    if (!requestedEventId || names.length === 0) return 0
    const payload: DrawShow = {
      id: `${requestedEventId}-full-${Date.now()}`,
      eventId: requestedEventId,
      stage: "full", names, groupCount,
      startedAt: Date.now() + 2200,
      stepMs: 3000,
    }
    const endAt = payload.startedAt + payload.stepMs * (payload.names.length + 2)
    // Wiederaufnahme auch wenn Beamer kurz nach dem Klick geoeffnet wird.
    try { window.localStorage.setItem(MEMBERS_CUP_DRAW_CHANNEL, JSON.stringify(payload)) } catch {}
    try { const bc = new BroadcastChannel(MEMBERS_CUP_DRAW_CHANNEL); bc.postMessage(payload); bc.close() } catch {}
    const channel = supabase.channel(MEMBERS_CUP_DRAW_CHANNEL)
    channel.subscribe(status => {
      if (status !== "SUBSCRIBED") return
      const send = () => { void channel.send({ type: "broadcast", event: "draw", payload }) }
      send()
      const timer = window.setInterval(() => {
        if (Date.now() >= endAt) { window.clearInterval(timer); void supabase.removeChannel(channel); return }
        send()
      }, 3500)
    })
    return endAt
  }

  const { user, isAdmin, loading: authLoading, adminLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [roundRobinStarting, setRoundRobinStarting] = useState(false)
  const [showEndsAt, setShowEndsAt] = useState(0)
  const [showNow, setShowNow] = useState(Date.now())
  useEffect(() => { const timer = window.setInterval(() => setShowNow(Date.now()), 300); return () => window.clearInterval(timer) }, [])
  const showRunning = showEndsAt > showNow

  const [seriesName, setSeriesName] = useState("EMD Members Champion Cup")
  const [players, setPlayers] = useState<DrawPlayer[]>([])
  const [groupedPlayers, setGroupedPlayers] = useState<GroupedDrawPlayer[]>([])
  const [teams, setTeams] = useState<DrawTeam[]>([])
  const [rrGroupCount, setRrGroupCount] = useState(2)

  const [groupsLocked, setGroupsLocked] = useState(false)
  const [teamsLocked, setTeamsLocked] = useState(false)
  const [groupsDrawnAt, setGroupsDrawnAt] = useState<string | null>(null)
  const [teamsDrawnAt, setTeamsDrawnAt] = useState<string | null>(null)

  const [message, setMessage] = useState<{
    type: "success" | "error" | "info"
    text: string
  } | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setMessage(null)

      let seriesQuery = supabase
        .from("dko_series")
        .select("id,name,slug,series_type,no_show_penalty_mode,require_even_participants,odd_participant_policy")

      if (requestedSeriesId) {
        seriesQuery = seriesQuery.eq("id", requestedSeriesId)
      } else {
        seriesQuery = seriesQuery.eq("series_type", "members_cup").eq("is_active", true)
      }

      const { data: seriesData, error: seriesError } = await seriesQuery.maybeSingle()

      if (seriesError) throw seriesError
      if (!seriesData?.id) throw new Error("Turnierserie wurde nicht gefunden.")
      if (seriesData?.name) setSeriesName(String(seriesData.name))

      const [{ data: registrationData, error: registrationError }, { data: levelData, error: levelError }] =
        await Promise.all([
          (() => {
            let query = supabase
              .from("dko_tournament_registration")
              .select("id,player_id,player_name,registered_at,paid,entry_fee,payment_method")
              .eq("series_id", seriesData.id)
              .order("registered_at", { ascending: true })

            if (requestedEventId) query = query.eq("event_id", requestedEventId)
            return query
          })(),

          supabase
            .from("dko_series_player_levels")
            .select("id,spieldatenbank_id,player_name,level_group,level_label,average_points,notes")
            .eq("series_id", seriesData.id),
        ])

      if (registrationError) throw registrationError
      if (levelError) throw levelError

      let registrationsForDraw = (registrationData || []) as RegisteredPlayer[]

      if (requestedEventId) {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("dko_event_attendance")
          .select("player_id,status")
          .eq("event_id", requestedEventId)

        if (attendanceError) throw attendanceError

        const attendanceRows = attendanceData || []
        const attendanceRequired = seriesData.no_show_penalty_mode !== "none"

        if (attendanceRequired && registrationsForDraw.length > 0 && attendanceRows.length < registrationsForDraw.length) {
          throw new Error("Bitte zuerst unter „Turniertage starten“ die Anwesenheit vollständig bestätigen.")
        }

        if (attendanceRows.length > 0) {
          const presentIds = new Set(
            attendanceRows
              .filter((row: any) => row.status === "present")
              .map((row: any) => String(row.player_id))
          )

          registrationsForDraw = registrationsForDraw.filter((player) =>
            presentIds.has(String(player.player_id))
          )
        }
      }

      const levels = (levelData || []) as LevelRow[]
      const levelByPlayerId = new Map<string, LevelRow>()

      levels.forEach((level) => {
        levelByPlayerId.set(String(level.spieldatenbank_id), level)
      })

      const mappedPlayers: DrawPlayer[] = registrationsForDraw.map((player) => ({
        ...player,
        level: levelByPlayerId.get(String(player.player_id)) ?? null,
      }))

      setPlayers(mappedPlayers)

      if (!groupsLocked && !teamsLocked) {
        setGroupedPlayers([])
        setTeams([])
        setGroupsDrawnAt(null)
        setTeamsDrawnAt(null)
      }
    } catch (error: any) {
      console.error("loadData error:", error)
      setMessage({ type: "error", text: error?.message || "Fehler beim Laden." })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !adminLoading && user && isAdmin) {
      void loadData()
    }
  }, [authLoading, adminLoading, user, isAdmin, requestedSeriesId, requestedEventId])

  useEffect(() => {
    if (authLoading || adminLoading || !user || !isAdmin) return

    const channel = supabase
      .channel("members-cup-auslosung-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_tournament_registration" }, () => {
        if (!groupsLocked && !teamsLocked) void loadData()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series_player_levels" }, () => {
        if (!groupsLocked && !teamsLocked) void loadData()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_event_attendance" }, () => {
        if (!groupsLocked && !teamsLocked) void loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [authLoading, adminLoading, user, isAdmin, groupsLocked, teamsLocked])

  const table1Players = useMemo(() => players.filter((p) => p.level?.level_group === 1), [players])
  const table2Players = useMemo(() => players.filter((p) => p.level?.level_group === 2), [players])
  const table3Players = useMemo(() => players.filter((p) => p.level?.level_group === 3), [players])
  const unsetPlayers = useMemo(() => players.filter((p) => !p.level), [players])

  const groupA = useMemo(() => groupedPlayers.filter((p) => p.draw_group === "A"), [groupedPlayers])
  const groupB = useMemo(() => groupedPlayers.filter((p) => p.draw_group === "B"), [groupedPlayers])

  const isOdd = players.length % 2 !== 0
  const canCreateGroups = players.length >= 2 && !isOdd && unsetPlayers.length === 0 && !groupsLocked
  const canDrawTeams = groupedPlayers.length === players.length && groupA.length === groupB.length && groupA.length > 0 && !teamsLocked
  
  
  
  


const handleCreateGroups = () => {
  if (groupsLocked) {
    setMessage({
      type: "info",
      text: "Gruppen wurden bereits fix ausgelost.",
    })
    return
  }

  if (!canCreateGroups) {
    setMessage({
      type: "error",
      text:
        "Gruppenbildung nicht möglich: Spieleranzahl muss gerade sein " +
        "und alle Spieler brauchen eine Einstufung.",
    })
    return
  }

  setActionLoading(true)
  setMessage(null)
  setTeams([])
  setTeamsLocked(false)
  setTeamsDrawnAt(null)

  try {
    const target = players.length / 2

    // Tabelle 1 ist grundsätzlich Gruppe A.
    const resultA: GroupedDrawPlayer[] = table1Players.map((player) => ({
      ...player,
      draw_group: "A",
    }))

    // Tabelle 3 ist grundsätzlich Gruppe B.
    const resultB: GroupedDrawPlayer[] = table3Players.map((player) => ({
      ...player,
      draw_group: "B",
    }))

    // Tabelle 2 nach Punkten sortieren.
    // Bei gleichen oder fehlenden Punkten entscheidet die Zufallsreihenfolge.
    const middle = shuffleArray(table2Players).sort(
      (a, b) =>
        (b.level?.average_points ?? 0) -
        (a.level?.average_points ?? 0),
    )

    /*
     * Tabelle 2 wird als flexible Ausgleichsgruppe verwendet.
     * Zuerst werden freie Plätze in A und B aufgefüllt.
     */
    for (const player of middle) {
      if (resultA.length < target && resultB.length < target) {
        const targetGroup =
          resultA.length <= resultB.length ? "A" : "B"

        if (targetGroup === "A") {
          resultA.push({ ...player, draw_group: "A" })
        } else {
          resultB.push({ ...player, draw_group: "B" })
        }
      } else if (resultA.length < target) {
        resultA.push({ ...player, draw_group: "A" })
      } else if (resultB.length < target) {
        resultB.push({ ...player, draw_group: "B" })
      } else {
        throw new Error(
          `Spieler ${player.player_name} konnte keiner Gruppe zugeteilt werden.`,
        )
      }
    }

    /*
     * Falls Gruppe B zu groß ist:
     * Die stärksten Spieler aus B wechseln nur für diese Auslosung in A.
     */
    while (resultA.length < target && resultB.length > target) {
      resultB.sort(
        (a, b) =>
          (b.level?.average_points ?? 0) -
          (a.level?.average_points ?? 0),
      )

      const strongestFromB = resultB.shift()

      if (!strongestFromB) {
        throw new Error(
          "Es konnte kein Spieler aus Gruppe B verschoben werden.",
        )
      }

      resultA.push({
        ...strongestFromB,
        draw_group: "A",
      })
    }

    /*
     * Umgekehrter Sonderfall:
     * Falls A zu groß und B zu klein ist, wechseln die schwächsten Spieler
     * aus A nur für diese Auslosung in B.
     */
    while (resultB.length < target && resultA.length > target) {
      resultA.sort(
        (a, b) =>
          (a.level?.average_points ?? 0) -
          (b.level?.average_points ?? 0),
      )

      const weakestFromA = resultA.shift()

      if (!weakestFromA) {
        throw new Error(
          "Es konnte kein Spieler aus Gruppe A verschoben werden.",
        )
      }

      resultB.push({
        ...weakestFromA,
        draw_group: "B",
      })
    }

    if (
      resultA.length !== target ||
      resultB.length !== target
    ) {
      throw new Error(
        `Gruppen konnten nicht ausgeglichen werden: ` +
        `A=${resultA.length}, B=${resultB.length}, Ziel=${target}`,
      )
    }

    // Reihenfolge innerhalb der fertigen Gruppen zufällig mischen.
    const finalA = shuffleArray(resultA)
    const finalB = shuffleArray(resultB)

    // Ein Klick: Gruppen bilden, dann sofort Teams bilden; die Show zeigt beides in Reihenfolge.
    const shuffleB = shuffleArray(finalB)
    const generatedTeams: DrawTeam[] = shuffleArray(finalA).map((playerA, index) => ({
      teamNo: index + 1, playerA, playerB: shuffleB[index],
    }))
    const displayNames = [
      ...finalA.map(p => `Gruppe A · ${p.player_name}`),
      ...finalB.map(p => `Gruppe B · ${p.player_name}`),
      ...generatedTeams.map(t => `TEAM ${t.teamNo} · ${t.playerA.player_name} + ${t.playerB.player_name}`),
    ]
    setShowEndsAt(broadcastDraw(displayNames, finalA.length + finalB.length))
    setTeams(generatedTeams)
    setTeamsLocked(true)
    setTeamsDrawnAt(new Date().toLocaleString("de-AT"))
    setGroupedPlayers([...finalA, ...finalB])
    setGroupsLocked(true)
    setGroupsDrawnAt(new Date().toLocaleString("de-AT"))

    setMessage({
      type: "success",
      text:
        `Schritt 1 fertig und fixiert: ` +
        `Gruppe A und Gruppe B wurden gebildet ` +
        `(${finalA.length}:${finalB.length}).`,
    })
  } catch (error: any) {
    console.error("group draw error:", error)

    setMessage({
      type: "error",
      text: error?.message || "Fehler bei der Gruppenbildung.",
    })
  } finally {
    setActionLoading(false)
  }
}
  
  
  
  
  

  const handleDrawTeams = () => {
    if (teamsLocked) {
      setMessage({ type: "info", text: "Partner wurden bereits fix ausgelost." })
      return
    }

    if (!canDrawTeams) {
      setMessage({ type: "error", text: "Bitte zuerst Gruppen A/B auslosen." })
      return
    }

    setActionLoading(true)
    setMessage(null)

    try {
      const shuffledA = shuffleArray(groupA)
      const shuffledB = shuffleArray(groupB)

      const generatedTeams: DrawTeam[] = shuffledA.map((playerA, index) => ({
        teamNo: index + 1,
        playerA,
        playerB: shuffledB[index],
      }))

      // Die Partner sind bereits bei der Ein-Klick-Auslosung gezogen.
      setTeams(generatedTeams)
      setTeamsLocked(true)
      setTeamsDrawnAt(new Date().toLocaleString("de-AT"))

      setMessage({
        type: "success",
        text: `Schritt 2 fertig und fixiert: ${generatedTeams.length} Teams wurden ausgelost.`,
      })
    } catch (error: any) {
      console.error("team draw error:", error)
      setMessage({ type: "error", text: error?.message || "Fehler bei Partner-Auslosung." })
    } finally {
      setActionLoading(false)
    }
  }
  
  
  
  
  


const handleCreateRoundRobin = async () => {
  if (showEndsAt > Date.now()) {
    setMessage({ type: "info", text: "Die Auslosungs-Show läuft noch. Bitte bis zum Ende warten." })
    return
  }
  if (!requestedSeriesId || !requestedEventId) {
    setMessage({ type: "error", text: "Serie oder Spieltag fehlt in der URL. Bitte die Auslosung über den gewählten Spieltag starten." })
    return
  }
  if (teams.length === 0) {
    setMessage({ type: "error", text: "Bitte zuerst Partner-Teams auslosen." })
    return
  }
  if (teams.length < rrGroupCount * 2) {
    setMessage({ type: "error", text: "Für jede Round-Robin-Gruppe werden mindestens zwei Teams benötigt." })
    return
  }

  try {
    setRoundRobinStarting(true)
    setActionLoading(true)
    setMessage(null)

    const tournamentName = `${seriesName} – ${new Date().toLocaleDateString("de-AT")}`

    const { data: rr, error: rrError } = await supabase
      .from("round_robin")
      .insert({
        name: tournamentName,
        status: "created",
      })
      .select("id")
      .single()

    if (rrError) throw rrError

    const roundRobinId = rr.id as string

    // Die Partnerauslosung (A/B) ist NICHT die spätere Round-Robin-Gruppeneinteilung.
    // Für Round Robin werden eigenständige Gruppen mit eigenen Begegnungen angelegt.
    const shuffledTeams = shuffleArray(teams)
    const teamGroups: DrawTeam[][] = Array.from({ length: rrGroupCount }, () => [])
    shuffledTeams.forEach((team, index) => teamGroups[index % rrGroupCount].push(team))

    const { data: createdGroups, error: groupError } = await supabase
      .from("round_robin_groups")
      .insert(teamGroups.map((_, index) => ({
        round_robin_id: roundRobinId,
        group_no: index + 1,
        name: `Gruppe ${index + 1}`,
      })))
      .select("id,group_no")

    if (groupError) throw groupError
    if (!createdGroups || createdGroups.length !== rrGroupCount) {
      throw new Error("Round-Robin-Gruppen konnten nicht vollständig erstellt werden.")
    }
    const groupIds = new Map(createdGroups.map((group) => [group.group_no, group.id as string]))

    const preparedTeams = teamGroups.flatMap((groupTeams, index) => groupTeams.map((team) => ({
      team,
      groupNo: index + 1,
      groupId: groupIds.get(index + 1)!,
      teamId: crypto.randomUUID(),
      teamName: `${team.playerA.player_name} / ${team.playerB.player_name}`,
    })))

    const teamRows = preparedTeams.map(({ team, groupId, teamId, teamName }) => ({
      group_id: groupId,
      player_id: teamId,
      player_name: teamName,
      seed: team.teamNo,
    }))

    const { error: groupPlayersError } = await supabase
      .from("round_robin_group_players")
      .insert(teamRows)

    if (groupPlayersError) throw groupPlayersError

    const teamMemberRows = preparedTeams.map(({ team, teamId, teamName }) => ({
      round_robin_id: roundRobinId,
      team_no: team.teamNo,
      team_id: teamId,
      team_name: teamName,
      player1_id: String(team.playerA.player_id),
      player1_name: team.playerA.player_name,
      player2_id: String(team.playerB.player_id),
      player2_name: team.playerB.player_name,
    }))

    const { error: teamMembersError } = await supabase
      .from("members_cup_team_members")
      .insert(teamMemberRows)

    if (teamMembersError) throw teamMembersError

    const matchRows: Array<{
      round_robin_id: string
      group_id: string
      round_no: number
      match_no: number
      player1_id: string
      player1_name: string
      player2_id: string
      player2_name: string
      planned_machine: null
    }> = []

    for (let groupIndex = 0; groupIndex < rrGroupCount; groupIndex++) {
      const groupNo = groupIndex + 1
      const groupPlayers = preparedTeams
        .filter((team) => team.groupNo === groupNo)
        .map(({ teamId, teamName }) => ({ id: teamId, name: teamName }))
      const groupId = groupIds.get(groupNo)!
      const rounds = generateRoundRobinPairs(groupPlayers)
      let matchNo = 0
      for (const round of rounds) {
        for (const pair of round.pairs) {
          matchRows.push({
            round_robin_id: roundRobinId,
            group_id: groupId,
            round_no: round.roundNo,
            match_no: ++matchNo,
            player1_id: pair.a.id,
            player1_name: pair.a.name,
            player2_id: pair.b.id,
            player2_name: pair.b.name,
            planned_machine: null,
          })
        }
      }
    }

    if (matchRows.length > 0) {
      const { error: matchesError } = await supabase
        .from("round_robin_matches")
        .insert(matchRows)

      if (matchesError) throw matchesError
    }

    const { error: statusError } = await supabase
      .from("tournaments_status")
      .insert({
        tournament_id: roundRobinId,
        tournament_type: "round_robin",
        tournament_name: tournamentName,
        status: "active",
      })

    if (statusError && (statusError as any).code !== "23505") throw statusError

    setMessage({
      type: "success",
      text: "Round Robin wurde mit gültigen Team-IDs erstellt.",
    })
	const encodedName = encodeURIComponent(tournamentName)

router.push(
  `/roundrobin?roundRobinId=${roundRobinId}&tournamentName=${encodedName}&seriesId=${encodeURIComponent(requestedSeriesId)}&eventId=${encodeURIComponent(requestedEventId)}`
)

return
  } catch (error: any) {
    setRoundRobinStarting(false)
    console.error("create round robin error:", error)
    setMessage({
      type: "error",
      text: error?.message || "Round Robin konnte nicht erstellt werden.",
    })
  } finally {
    setActionLoading(false)
  }
}
  
  
  
  

  const resetDrawLocal = () => {
    setGroupedPlayers([])
    setTeams([])
    setGroupsLocked(false)
    setTeamsLocked(false)
    setGroupsDrawnAt(null)
    setTeamsDrawnAt(null)
    setMessage({ type: "info", text: "Auslosung wurde lokal zurückgesetzt. Du kannst neu auslosen." })
  }

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 md:pb-0">
        <Header />
        <main className="pt-20 px-4">
          <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white shadow-sm p-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
            <p className="text-white/70 font-medium">Lade Adminbereich...</p>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 md:pb-0">
        <Header />
        <main className="pt-20 px-4">
          <Card className="mx-auto w-full max-w-md p-6 shadow-lg rounded-2xl">
            <CardTitle className="text-2xl font-bold text-center mb-6">Zugriff verweigert</CardTitle>
            <CardContent className="text-center space-y-4">
              <p className="text-white/70">Du benötigst Admin-Rechte, um die Members Champion Cup Auslosung zu öffnen.</p>
              <Button onClick={() => router.push("/admin")} className="w-full rounded-xl">
                Zurück zur Admin-Seite
              </Button>
            </CardContent>
          </Card>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#15100d] via-[#0c1117] to-[#071923] text-white font-sans pb-24 md:pb-0">
      <Header />

      <main className="pt-16 sm:pt-14">
        <motion.div
          className="mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 max-w-[1480px]"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-5">
            <Link
              href="/admin/turnier_spieltage_starten"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#10151b] px-4 py-2 text-sm font-bold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-6">
            <div className="rounded-[28px] border border-orange-500/20 bg-gradient-to-br from-[#1b120d] via-[#0c1015] to-[#0a1720] shadow-[0_24px_70px_-45px_rgba(0,0,0,.9)] overflow-hidden">
              <div className="p-5 sm:p-7">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 rounded-2xl bg-orange-600 text-white p-3 shadow-[0_10px_24px_-12px_rgba(234,88,12,.8)]">
                      <Crown className="h-6 w-6" />
                    </div>

                    <div>
                      <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-orange-500/10 text-orange-300 border border-orange-500/25">
                        EMD MEMBERS CHAMPION CUP
                      </div>

                      <h1 className="mt-2 text-2xl sm:text-3xl font-black leading-tight">
                        2-Stufen Partner-Auslosung
                      </h1>

                      <p className="mt-2 text-sm text-white/60 max-w-3xl leading-relaxed">
                        Schritt 1: Tabelle 2 wird per Zufall auf Gruppe A/B verteilt. Schritt 2: Danach werden die
                        Partner aus Gruppe A und Gruppe B ausgelost.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/15 bg-[#11171e] text-white hover:bg-white/10 hover:text-white"
                      onClick={() => void loadData()}
                      disabled={loading || actionLoading || showRunning || groupsLocked || teamsLocked}
                    >
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      Neu laden
                    </Button>

                    <Button
                      type="button"
                      onClick={handleCreateGroups}
                      disabled={!canCreateGroups || loading || actionLoading || showRunning}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {groupsLocked ? <Lock className="w-4 h-4 mr-2" /> : <Shuffle className="w-4 h-4 mr-2" />}
                      {showRunning ? "Auslosung läuft …" : groupsLocked ? "Auslosung fixiert" : "Auslosung starten"}
                    </Button>

                    {(groupsLocked || teamsLocked) && !teamsLocked ? (
                      <Button type="button" variant="outline" className="border-white/15 bg-[#11171e] text-white hover:bg-white/10" onClick={resetDrawLocal} disabled={actionLoading || showRunning}>
                        Zurücksetzen
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700" />
            </div>
          </motion.div>

          {showRunning && (
            <div className="mb-5 rounded-2xl border border-orange-500/40 bg-orange-500/10 p-5" role="status" aria-live="polite">
              <div className="flex items-center gap-3 font-bold text-orange-200"><Loader2 className="h-5 w-5 animate-spin" /> Auslosung läuft auf Beamer / EMD TV</div>
              <p className="mt-2 text-sm text-white/75">Bitte warten, bis alle Gruppen und Partner gezeigt wurden. Round Robin wird danach freigeschaltet.</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, (1 - (showEndsAt - showNow) / (3000 * (players.length + players.length / 2 + 2))) * 100))}%` }} /></div>
            </div>
          )}
          {(groupsLocked || teamsLocked) && (
            <motion.div variants={itemVariants} className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.08] p-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div className="text-sm text-emerald-100">
                  <div className="font-black">Auslosungsstatus</div>
                  <div>Gruppen: {groupsLocked ? `fixiert${groupsDrawnAt ? ` am ${groupsDrawnAt}` : ""}` : "offen"}</div>
                  <div>Partner: {teamsLocked ? `fixiert${teamsDrawnAt ? ` am ${teamsDrawnAt}` : ""}` : "offen"}</div>
                </div>
              </div>
            </motion.div>
          )}

          {message ? (
            <motion.div
              variants={itemVariants}
              className={
                message.type === "success"
                  ? "mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.08] p-4 text-emerald-200 font-semibold"
                  : message.type === "error"
                    ? "mb-5 rounded-2xl border border-red-500/25 bg-red-500/[0.08] p-4 text-red-200 font-semibold"
                    : "mb-5 rounded-2xl border border-sky-500/25 bg-sky-500/[0.08] p-4 text-sky-200 font-semibold"
              }
            >
              {message.text}
            </motion.div>
          ) : null}

          {loading ? (
            <motion.div variants={itemVariants} className="rounded-2xl border border-white/10 bg-[#10151b] p-6 text-center shadow-sm">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-orange-600" />
              <div className="mt-2 text-sm font-semibold text-white/60">Auslosungsdaten werden geladen...</div>
            </motion.div>
          ) : (
            <>
              <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
                <StatCard label="Angemeldet" value={players.length} />
                <StatCard label="Tabelle 1" value={table1Players.length} />
                <StatCard label="Tabelle 2" value={table2Players.length} />
                <StatCard label="Tabelle 3" value={table3Players.length} />
                <StatCard label="Ohne Einstufung" value={unsetPlayers.length} danger={unsetPlayers.length > 0} />
                <StatCard label="Teams" value={teams.length} />
              </motion.div>

              <motion.div variants={itemVariants} className="mb-6">
                <StatusBox
                  playersCount={players.length}
                  isOdd={isOdd}
                  unsetCount={unsetPlayers.length}
                  groupedCount={groupedPlayers.length}
                  teamsCount={teams.length}
                  groupsLocked={groupsLocked}
                  teamsLocked={teamsLocked}
                />
              </motion.div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                <motion.div variants={itemVariants}>
                  <Card className="rounded-2xl border-white/10 bg-[#0d1218] text-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-orange-600" />
                        Schritt 1: Einstufungen
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <PlayerGroup title="Tabelle 1 – Stark / fix Gruppe A" players={table1Players} />
                      <PlayerGroup title="Tabelle 2 – Mitte / wird ausgelost" players={table2Players} />
                      <PlayerGroup title="Tabelle 3 – Schwach / fix Gruppe B" players={table3Players} />

                      {unsetPlayers.length > 0 ? (
                        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.08] p-4">
                          <div className="flex items-center gap-2 font-black text-red-200 mb-3">
                            <AlertTriangle className="w-5 h-5" />
                            Ohne Einstufung
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            {unsetPlayers.map((player) => (
                              <PlayerMiniCard key={player.id} player={player} />
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card className="rounded-2xl border-white/10 bg-[#0d1218] text-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shuffle className="w-5 h-5 text-orange-600" />
                        Schritt 1 Ergebnis: Gruppe A/B
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {groupedPlayers.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/60">
                          Noch keine Gruppen ausgelost. Klicke zuerst auf „1. Gruppen auslosen“.
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-5">
                          <GroupBox title="Gruppe A" tone="orange" players={groupA} />
                          <GroupBox title="Gruppe B" tone="emerald" players={groupB} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <motion.div variants={itemVariants}>
                <Card className="rounded-2xl border-white/10 bg-[#0d1218] text-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-orange-600" />
                      Schritt 2 Ergebnis: Partner-Teams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {teams.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/60">
                        Noch keine Teams ausgelost. Nach der Gruppenbildung auf „2. Partner auslosen“ klicken.
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {teams.map((team) => (
                          <div key={team.teamNo} className="rounded-2xl border border-white/10 bg-[#11171e] p-4 shadow-sm">
                            <div className="text-xs font-black text-orange-300 mb-3">Team {team.teamNo}</div>

                            <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.07] p-3">
                              <div className="text-[11px] font-black text-orange-300">Gruppe A</div>
                              <div className="font-black text-white">{team.playerA.player_name}</div>
                              <div className="mt-2">{getPlayerLevelBadge(team.playerA)}</div>
                            </div>

                            <div className="my-2 text-center text-xs font-black text-white/40">+</div>

                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-3">
                              <div className="text-[11px] font-black text-emerald-300">Gruppe B</div>
                              <div className="font-black text-white">{team.playerB.player_name}</div>
                              <div className="mt-2">{getPlayerLevelBadge(team.playerB)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                      <div className="mb-3 text-sm font-semibold text-white">Round-Robin-Gruppen</div>
                      <p className="mb-4 text-xs leading-relaxed text-white/55">Nach der Partner-Auslosung: Wie viele Gruppen sollen spielen? Die Teams werden gleichmäßig und zufällig auf die Gruppen verteilt.</p>
                      <div className="grid grid-cols-3 gap-2">
                        {([1, 2, 4] as const).map((count) => {
                          const valid = teams.length >= count * 2
                          return (
                            <button
                              key={count}
                              type="button"
                              disabled={!valid || actionLoading || showRunning}
                              onClick={() => setRrGroupCount(count)}
                              aria-pressed={rrGroupCount === count}
                              className={`rounded-xl border px-3 py-3 text-center transition-colors ${rrGroupCount === count ? "border-orange-500 bg-orange-500/15 text-orange-200" : "border-white/10 bg-[#0b1118] text-white/70 hover:border-white/25"} disabled:cursor-not-allowed disabled:opacity-35`}
                            >
                              <span className="block text-base font-semibold">{count} {count === 1 ? "Gruppe" : "Gruppen"}</span>
                              <span className="mt-1 block text-xs opacity-70">{Math.floor(teams.length / count)}{teams.length % count ? `–${Math.ceil(teams.length / count)}` : ""} Teams je Gruppe</span>
                            </button>
                          )
                        })}
                      </div>
                      <p className="mt-3 text-xs text-white/50">{rrGroupCount} {rrGroupCount === 1 ? "Gruppe" : "Gruppen"} · {teams.length} Doppel-Teams · {Array.from({length:rrGroupCount},(_,i)=>{const n=Math.floor(teams.length/rrGroupCount)+(i < teams.length % rrGroupCount ? 1 : 0);return n*(n-1)/2}).reduce((a,b)=>a+b,0)} Gruppenspiele</p>
                    </div>

                    <Button
                      type="button"
                      onClick={handleCreateRoundRobin}
                      disabled={teams.length < rrGroupCount * 2 || actionLoading || showRunning}
                      className="mt-5 w-full rounded-xl bg-orange-600 hover:bg-orange-700"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trophy className="w-4 h-4 mr-2" />
                      )}
                      {showRunning ? "Bitte warten – Auslosung läuft" : "Teams in Round Robin übernehmen"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </motion.div>
      </main>

      {roundRobinStarting && (
        <div role="status" aria-live="polite" className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#05080e]/95 px-4 backdrop-blur-xl">
          <div className="w-full max-w-xl rounded-[28px] border border-orange-500/30 bg-[#10161e] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,.65)] sm:p-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400"><Loader2 className="h-9 w-9 animate-spin" /></div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-orange-400">EMD Members Champion Cup</p>
            <h2 className="mt-4 text-2xl font-black text-white sm:text-3xl">Round Robin wird vorbereitet</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">Teams, Spielplan und Begegnungen werden erstellt. Bitte warten und nicht erneut klicken.</p>
            <div className="relative mt-8 h-2 overflow-hidden rounded-full bg-white/10"><div className="absolute inset-y-0 w-1/3 animate-pulse rounded-full bg-orange-500" /></div>
            <p className="mt-4 text-xs text-slate-400">Die Turnieransicht öffnet sich automatisch.</p>
          </div>
        </div>
      )}
      {showRunning && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#03070c]/95 px-4 py-6 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="members-cup-show-title"
          aria-describedby="members-cup-show-description"
        >
          <div className="w-full max-w-xl rounded-[28px] border border-orange-500/30 bg-gradient-to-br from-[#19150f] via-[#10161e] to-[#0a1820] p-6 shadow-[0_30px_100px_rgba(0,0,0,.75)] sm:p-9">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10">
                <Shuffle className="h-8 w-8 animate-pulse text-orange-400" />
              </div>
            </div>
            <p className="text-center text-xs font-black uppercase tracking-[.18em] text-orange-400">EMD Members Champion Cup</p>
            <h2 id="members-cup-show-title" className="mt-3 text-center text-2xl font-black text-white sm:text-3xl">Auslosung läuft</h2>
            <p id="members-cup-show-description" className="mt-3 text-center text-sm leading-relaxed text-white/65">
              Gruppen und Partner werden gerade auf Beamer und EMD TV präsentiert. Die Ergebnisse werden erst nach der vollständigen Show freigegeben.
            </p>
            <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-[width] duration-300"
                style={{ width: `${Math.min(100, Math.max(0, (1 - (showEndsAt - showNow) / (3000 * (players.length + players.length / 2 + 2))) * 100))}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-orange-200">
              <Loader2 className="h-4 w-4 animate-spin" /> Bitte warten – die Show läuft
            </div>
            <p className="mt-6 text-center text-xs text-white/40">Bitte diese Seite geöffnet lassen. Die Auslosung wird automatisch freigegeben.</p>
          </div>
        </div>
      )}
      <MobileBottomNav />
    </div>
  )
}

function StatusBox({
  playersCount,
  isOdd,
  unsetCount,
  groupedCount,
  teamsCount,
  groupsLocked,
  teamsLocked,
}: {
  playersCount: number
  isOdd: boolean
  unsetCount: number
  groupedCount: number
  teamsCount: number
  groupsLocked: boolean
  teamsLocked: boolean
}) {
  let title = "Bereit für Schritt 1"
  let text = "Alle Spieler sind eingestuft und die Anzahl ist gerade."
  let good = true

  if (playersCount < 2) {
    title = "Noch zu wenige Spieler"
    text = "Es müssen mindestens 2 Spieler angemeldet sein."
    good = false
  } else if (isOdd) {
    title = "Ungerade Spieleranzahl"
    text = "Es muss noch ein Spieler dazu oder einer entfernt werden."
    good = false
  } else if (unsetCount > 0) {
    title = "Spieler ohne Einstufung"
    text = "Bitte zuerst alle Spieler in Tabelle 1, 2 oder 3 einstufen."
    good = false
  } else if (teamsLocked && teamsCount > 0) {
    title = "Auslosung komplett fixiert"
    text = "Gruppen und Partner-Teams sind fix ausgelost."
    good = true
  } else if (groupsLocked && groupedCount > 0) {
    title = "Gruppen fixiert"
    text = "Gruppe A/B sind fix. Jetzt Partner auslosen."
    good = true
  }

  return (
    <div className={good ? "rounded-2xl border border-emerald-500/25 bg-[#0d211d] p-4" : "rounded-2xl border border-red-500/25 bg-[#241417] p-4"}>
      <div className="flex items-start gap-3">
        {good ? <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />}
        <div>
          <div className={good ? "font-black text-emerald-200" : "font-black text-red-200"}>{title}</div>
          <div className="mt-1 text-sm text-white/70">{text}</div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <Card className={danger ? "rounded-2xl border-red-500/30 bg-[#1b1115] text-white shadow-sm" : "rounded-2xl border-white/10 bg-[#0d1218] text-white shadow-sm"}>
      <CardContent className="p-4">
        <div className={danger ? "text-xs sm:text-sm text-red-400 font-semibold" : "text-xs sm:text-sm text-white/50"}>
          {label}
        </div>
        <div className={danger ? "text-2xl sm:text-3xl font-black mt-1 text-red-800" : "text-2xl sm:text-3xl font-black mt-1"}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

function PlayerGroup({ title, players }: { title: string; players: DrawPlayer[] }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="font-black text-white">{title}</div>
        <Badge variant="outline" className="rounded-lg">
          {players.length} Spieler
        </Badge>
      </div>

      {players.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/50">
          Keine Spieler in dieser Tabelle.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {players.map((player) => (
            <PlayerMiniCard key={player.id} player={player} />
          ))}
        </div>
      )}
    </div>
  )
}

function GroupBox({
  title,
  tone,
  players,
}: {
  title: string
  tone: "orange" | "emerald"
  players: GroupedDrawPlayer[]
}) {
  const boxClass =
    tone === "orange"
      ? "rounded-2xl border border-orange-500/25 bg-orange-500/[0.07] p-4"
      : "rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4"

  const titleClass = tone === "orange" ? "font-black text-orange-200 mb-3" : "font-black text-emerald-200 mb-3"

  return (
    <div className={boxClass}>
      <div className={titleClass}>
        {title} · {players.length} Spieler
      </div>

      <div className="space-y-3">
        {players.map((player, index) => (
          <div key={player.id} className="rounded-2xl border border-white/10 bg-[#11171e] p-4 shadow-sm">
            <div className="text-xs font-black text-white/40 mb-1">#{index + 1}</div>
            <div className="font-black text-white">{player.player_name}</div>
            <div className="mt-2 flex flex-wrap gap-2">{getPlayerLevelBadge(player)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}