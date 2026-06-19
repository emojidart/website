"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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

const MEMBERS_CUP_SLUG = "2026/27"

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
      <Badge variant="outline" className="rounded-lg bg-red-50 text-red-700 border-red-200">
        ohne Einstufung
      </Badge>
    )
  }

  const info = LEVEL_INFO[group]

  return (
    <Badge variant="outline" className={`rounded-lg ${info.className}`}>
      {info.label} – {info.short}
    </Badge>
  )
}

function PlayerMiniCard({ player }: { player: DrawPlayer | GroupedDrawPlayer }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="font-black text-gray-900">{player.player_name}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {getPlayerLevelBadge(player)}
        {typeof player.level?.average_points === "number" ? (
          <Badge variant="outline" className="rounded-lg bg-white">
            Ø {player.level.average_points.toLocaleString("de-AT")}
          </Badge>
        ) : null}
      </div>
    </div>
  )
}

export default function AdminMembersChampionCupAuslosungPage() {
  const router = useRouter()
  const { user, isAdmin, loading: authLoading, adminLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const [seriesName, setSeriesName] = useState("EMD Members Champion Cup")
  const [players, setPlayers] = useState<DrawPlayer[]>([])
  const [groupedPlayers, setGroupedPlayers] = useState<GroupedDrawPlayer[]>([])
  const [teams, setTeams] = useState<DrawTeam[]>([])

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

      const { data: seriesData, error: seriesError } = await supabase
        .from("dko_series")
        .select("id,name,slug")
        .eq("slug", MEMBERS_CUP_SLUG)
        .maybeSingle()

      if (seriesError) throw seriesError
      if (seriesData?.name) setSeriesName(String(seriesData.name))

      const [{ data: registrationData, error: registrationError }, { data: levelData, error: levelError }] =
        await Promise.all([
          supabase
            .from("dko_tournament_registration")
            .select("id,player_id,player_name,registered_at,paid,entry_fee,payment_method")
            .order("registered_at", { ascending: true }),

          supabase
            .from("emd_champion_cup_player_levels")
            .select("id,spieldatenbank_id,player_name,level_group,level_label,average_points,notes"),
        ])

      if (registrationError) throw registrationError
      if (levelError) throw levelError

      const levels = (levelData || []) as LevelRow[]
      const levelByPlayerId = new Map<string, LevelRow>()

      levels.forEach((level) => {
        levelByPlayerId.set(String(level.spieldatenbank_id), level)
      })

      const mappedPlayers: DrawPlayer[] = ((registrationData || []) as RegisteredPlayer[]).map((player) => ({
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
  }, [authLoading, adminLoading, user, isAdmin])

  useEffect(() => {
    if (authLoading || adminLoading || !user || !isAdmin) return

    const channel = supabase
      .channel("members-cup-auslosung-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_tournament_registration" }, () => {
        if (!groupsLocked && !teamsLocked) void loadData()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "emd_champion_cup_player_levels" }, () => {
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
      setMessage({ type: "info", text: "Gruppen wurden bereits fix ausgelost." })
      return
    }

    if (!canCreateGroups) {
      setMessage({
        type: "error",
        text: "Gruppenbildung nicht möglich: Spieleranzahl muss gerade sein und alle Spieler brauchen eine Einstufung.",
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

      const resultA: GroupedDrawPlayer[] = shuffleArray(table1Players).map((p) => ({
        ...p,
        draw_group: "A",
      }))

      const resultB: GroupedDrawPlayer[] = shuffleArray(table3Players).map((p) => ({
        ...p,
        draw_group: "B",
      }))

      const middle = shuffleArray(table2Players)

      middle.forEach((player) => {
        if (resultA.length < target && resultB.length < target) {
          if (resultA.length <= resultB.length) {
            resultA.push({ ...player, draw_group: "A" })
          } else {
            resultB.push({ ...player, draw_group: "B" })
          }
          return
        }

        if (resultA.length < target) {
          resultA.push({ ...player, draw_group: "A" })
          return
        }

        resultB.push({ ...player, draw_group: "B" })
      })

      if (resultA.length !== target || resultB.length !== target) {
        throw new Error(`Gruppen nicht gleich groß: A=${resultA.length}, B=${resultB.length}`)
      }

      setGroupedPlayers([...resultA, ...resultB])
      setGroupsLocked(true)
      setGroupsDrawnAt(new Date().toLocaleString("de-AT"))
      setMessage({
        type: "success",
        text: `Schritt 1 fertig und fixiert: Gruppe A und Gruppe B wurden gebildet (${resultA.length}:${resultB.length}).`,
      })
    } catch (error: any) {
      console.error("group draw error:", error)
      setMessage({ type: "error", text: error?.message || "Fehler bei Gruppenauslosung." })
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
  if (teams.length === 0) {
    setMessage({ type: "error", text: "Bitte zuerst Partner-Teams auslosen." })
    return
  }

  try {
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

    const { data: groupData, error: groupError } = await supabase
      .from("round_robin_groups")
      .insert({
        round_robin_id: roundRobinId,
        group_no: 1,
        name: "Gruppe 1",
      })
      .select("id")
      .single()

    if (groupError) throw groupError

    const groupId = groupData.id as string

    const preparedTeams = teams.map((team) => {
      const teamId = crypto.randomUUID()
      const teamName = `${team.playerA.player_name} / ${team.playerB.player_name}`

      return {
        team,
        teamId,
        teamName,
      }
    })

    const teamRows = preparedTeams.map(({ team, teamId, teamName }) => ({
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

    const rrPlayers = preparedTeams.map(({ teamId, teamName }) => ({
      id: teamId,
      name: teamName,
    }))

    const matchRows: any[] = []

    for (let i = 0; i < rrPlayers.length; i++) {
      for (let j = i + 1; j < rrPlayers.length; j++) {
        matchRows.push({
          round_robin_id: roundRobinId,
          group_id: groupId,
          round_no: i + 1,
          match_no: j,
          player1_id: rrPlayers[i].id,
          player1_name: rrPlayers[i].name,
          player2_id: rrPlayers[j].id,
          player2_name: rrPlayers[j].name,
          planned_machine: null,
        })
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
  `/roundrobin?roundRobinId=${roundRobinId}&tournamentName=${encodedName}`
)

return
  } catch (error: any) {
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
            <p className="text-gray-700 font-medium">Lade Adminbereich...</p>
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
              <p className="text-gray-700">Du benötigst Admin-Rechte, um die Members Champion Cup Auslosung zu öffnen.</p>
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24 md:pb-0">
      <Header />

      <main className="pt-16 sm:pt-14">
        <motion.div
          className="mx-auto w-full px-4 py-6 sm:py-8 max-w-7xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-5">
            <Link
              href="/admin/turnier_spieltage_starten"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-6">
            <div className="rounded-3xl border border-gray-200 bg-white shadow-md overflow-hidden">
              <div className="p-5 sm:p-7">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 rounded-2xl bg-orange-600 text-white p-3 shadow-sm">
                      <Crown className="h-6 w-6" />
                    </div>

                    <div>
                      <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-orange-50 text-orange-700 border border-orange-100">
                        EMD MEMBERS CHAMPION CUP
                      </div>

                      <h1 className="mt-2 text-2xl sm:text-3xl font-black leading-tight">
                        2-Stufen Partner-Auslosung
                      </h1>

                      <p className="mt-2 text-sm text-gray-600 max-w-3xl">
                        Schritt 1: Tabelle 2 wird per Zufall auf Gruppe A/B verteilt. Schritt 2: Danach werden die
                        Partner aus Gruppe A und Gruppe B ausgelost.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void loadData()}
                      disabled={loading || actionLoading || groupsLocked || teamsLocked}
                    >
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      Neu laden
                    </Button>

                    <Button
                      type="button"
                      onClick={handleCreateGroups}
                      disabled={!canCreateGroups || loading || actionLoading}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {groupsLocked ? <Lock className="w-4 h-4 mr-2" /> : <Shuffle className="w-4 h-4 mr-2" />}
                      {groupsLocked ? "Gruppen fixiert" : "1. Gruppen auslosen"}
                    </Button>

                    <Button
                      type="button"
                      onClick={handleDrawTeams}
                      disabled={!canDrawTeams || actionLoading}
                      className="bg-gray-900 hover:bg-black"
                    >
                      {teamsLocked ? <Lock className="w-4 h-4 mr-2" /> : <Trophy className="w-4 h-4 mr-2" />}
                      {teamsLocked ? "Partner fixiert" : "2. Partner auslosen"}
                    </Button>

                    {(groupsLocked || teamsLocked) && !teamsLocked ? (
                      <Button type="button" variant="outline" onClick={resetDrawLocal} disabled={actionLoading}>
                        Zurücksetzen
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700" />
            </div>
          </motion.div>

          {(groupsLocked || teamsLocked) && (
            <motion.div variants={itemVariants} className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-green-700 mt-0.5" />
                <div className="text-sm text-green-900">
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
                  ? "mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800 font-semibold"
                  : message.type === "error"
                    ? "mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 font-semibold"
                    : "mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800 font-semibold"
              }
            >
              {message.text}
            </motion.div>
          ) : null}

          {loading ? (
            <motion.div variants={itemVariants} className="rounded-2xl border bg-white p-6 text-center shadow-sm">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-orange-600" />
              <div className="mt-2 text-sm font-semibold text-gray-600">Auslosungsdaten werden geladen...</div>
            </motion.div>
          ) : (
            <>
              <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
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
                  <Card className="rounded-2xl border-gray-200 shadow-sm">
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
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                          <div className="flex items-center gap-2 font-black text-red-900 mb-3">
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
                  <Card className="rounded-2xl border-gray-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shuffle className="w-5 h-5 text-orange-600" />
                        Schritt 1 Ergebnis: Gruppe A/B
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {groupedPlayers.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
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
                <Card className="rounded-2xl border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-orange-600" />
                      Schritt 2 Ergebnis: Partner-Teams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {teams.length === 0 ? (
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                        Noch keine Teams ausgelost. Nach der Gruppenbildung auf „2. Partner auslosen“ klicken.
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {teams.map((team) => (
                          <div key={team.teamNo} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="text-xs font-black text-orange-700 mb-3">Team {team.teamNo}</div>

                            <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
                              <div className="text-[11px] font-black text-orange-700">Gruppe A</div>
                              <div className="font-black text-gray-900">{team.playerA.player_name}</div>
                              <div className="mt-2">{getPlayerLevelBadge(team.playerA)}</div>
                            </div>

                            <div className="my-2 text-center text-xs font-black text-gray-400">+</div>

                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                              <div className="text-[11px] font-black text-emerald-700">Gruppe B</div>
                              <div className="font-black text-gray-900">{team.playerB.player_name}</div>
                              <div className="mt-2">{getPlayerLevelBadge(team.playerB)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={handleCreateRoundRobin}
                      disabled={teams.length === 0 || actionLoading}
                      className="mt-5 w-full rounded-xl bg-orange-600 hover:bg-orange-700"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trophy className="w-4 h-4 mr-2" />
                      )}
                      Teams in Round Robin übernehmen
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </motion.div>
      </main>

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
    <div className={good ? "rounded-2xl border border-green-200 bg-green-50 p-4" : "rounded-2xl border border-red-200 bg-red-50 p-4"}>
      <div className="flex items-start gap-3">
        {good ? <CheckCircle2 className="w-6 h-6 text-green-700 shrink-0 mt-0.5" /> : <XCircle className="w-6 h-6 text-red-700 shrink-0 mt-0.5" />}
        <div>
          <div className={good ? "font-black text-green-900" : "font-black text-red-900"}>{title}</div>
          <div className="mt-1 text-sm text-gray-700">{text}</div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <Card className={danger ? "rounded-2xl border-red-200 bg-red-50 shadow-sm" : "rounded-2xl border-gray-200 shadow-sm"}>
      <CardContent className="p-4">
        <div className={danger ? "text-xs sm:text-sm text-red-700 font-semibold" : "text-xs sm:text-sm text-gray-500"}>
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
        <div className="font-black text-gray-900">{title}</div>
        <Badge variant="outline" className="rounded-lg">
          {players.length} Spieler
        </Badge>
      </div>

      {players.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
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
      ? "rounded-2xl border border-orange-200 bg-orange-50 p-4"
      : "rounded-2xl border border-emerald-200 bg-emerald-50 p-4"

  const titleClass = tone === "orange" ? "font-black text-orange-900 mb-3" : "font-black text-emerald-900 mb-3"

  return (
    <div className={boxClass}>
      <div className={titleClass}>
        {title} · {players.length} Spieler
      </div>

      <div className="space-y-3">
        {players.map((player, index) => (
          <div key={player.id} className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
            <div className="text-xs font-black text-gray-400 mb-1">#{index + 1}</div>
            <div className="font-black text-gray-900">{player.player_name}</div>
            <div className="mt-2 flex flex-wrap gap-2">{getPlayerLevelBadge(player)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}