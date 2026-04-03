"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import {
  Shuffle,
  Users,
  Trophy,
  RefreshCcw,
  Database,
  UserCheck,
  CheckSquare,
  Square,
  Eye,
  X,
  Play,
  Pause,
  SkipForward,
} from "lucide-react"

type DrawMode = "random_double" | "mixed_double" | "groups"
type PlayerSource = "registration" | "spieldatenbank"
type Gender = "m" | "w" | "unknown"

type Player = {
  id: string
  name: string
  gender: Gender
  sourceLabel?: string
}

type TeamResult = {
  id: string
  player1: Player
  player2?: Player
  label: string
}

type RevealedResult =
  | {
      id: string
      type: "team"
      title: string
      badge: string
      label: string
    }
  | {
      id: string
      type: "group_player"
      title: string
      badge: string
      label: string
      groupIndex: number
    }

type RevealStep =
  | {
      id: string
      kind: "team"
      stage: "first" | "plus" | "second" | "complete"
      delay: number
      title: string
      badge: string
      team: TeamResult
    }
  | {
      id: string
      kind: "group_player"
      delay: number
      title: string
      badge: string
      player: Player
      groupIndex: number
    }

const INITIAL_START_DELAY = 350
const TEAM_FIRST_DELAY = 1100
const TEAM_PLUS_DELAY = 600
const TEAM_SECOND_DELAY = 1100
const TEAM_COMPLETE_DELAY = 1100
const GROUP_PLAYER_DELAY = 950

function randomShuffle<T>(items: T[]) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function normalizeGender(value: string | null | undefined): Gender {
  const raw = String(value ?? "").trim().toLowerCase()
  if (raw === "m") return "m"
  if (raw === "w") return "w"
  return "unknown"
}

function createTeamLabel(p1: Player, p2?: Player) {
  if (!p2) return `${p1.name} / Freilos`
  return `${p1.name} / ${p2.name}`
}

function drawRandomDouble(players: Player[]): TeamResult[] {
  const shuffled = randomShuffle(players)
  const result: TeamResult[] = []

  for (let i = 0; i < shuffled.length; i += 2) {
    const p1 = shuffled[i]
    const p2 = shuffled[i + 1]
    if (!p1) continue

    result.push({
      id: `${p1.id}-${p2?.id ?? "bye"}`,
      player1: p1,
      player2: p2,
      label: createTeamLabel(p1, p2),
    })
  }

  return result
}

function drawMixedDouble(players: Player[]): TeamResult[] {
  const men = randomShuffle(players.filter((p) => p.gender === "m"))
  const women = randomShuffle(players.filter((p) => p.gender === "w"))
  const unknowns = randomShuffle(players.filter((p) => p.gender === "unknown"))
  const result: TeamResult[] = []

  const pairCount = Math.min(men.length, women.length)

  for (let i = 0; i < pairCount; i++) {
    result.push({
      id: `${men[i].id}-${women[i].id}`,
      player1: men[i],
      player2: women[i],
      label: `${men[i].name} / ${women[i].name}`,
    })
  }

  const leftovers = [...men.slice(pairCount), ...women.slice(pairCount), ...unknowns]

  for (let i = 0; i < leftovers.length; i += 2) {
    const p1 = leftovers[i]
    const p2 = leftovers[i + 1]
    if (!p1) continue

    result.push({
      id: `${p1.id}-${p2?.id ?? "bye"}`,
      player1: p1,
      player2: p2,
      label: createTeamLabel(p1, p2),
    })
  }

  return result
}

function drawGroups(players: Player[], groupCount: number) {
  const shuffled = randomShuffle(players)
  const groups: Player[][] = Array.from({ length: groupCount }, () => [])

  shuffled.forEach((player, index) => {
    groups[index % groupCount].push(player)
  })

  return groups
}

function buildRevealSteps(mode: DrawMode, teams: TeamResult[], groups: Player[][]): RevealStep[] {
  if (mode === "groups") {
    return groups.flatMap((group, groupIndex) =>
      group.map((player, playerIndex) => ({
        id: `group-${groupIndex + 1}-${player.id}-${playerIndex}`,
        kind: "group_player" as const,
        delay: GROUP_PLAYER_DELAY,
        title: `Gruppe ${groupIndex + 1}`,
        badge: `Spieler ${playerIndex + 1}`,
        player,
        groupIndex,
      })),
    )
  }

  return teams.flatMap((team, index) => {
    const badge = mode === "mixed_double" ? "Mixed" : "Doppel"
    const title = `Team ${index + 1}`

    return [
      {
        id: `${team.id}-first`,
        kind: "team" as const,
        stage: "first" as const,
        delay: TEAM_FIRST_DELAY,
        title,
        badge,
        team,
      },
      {
        id: `${team.id}-plus`,
        kind: "team" as const,
        stage: "plus" as const,
        delay: TEAM_PLUS_DELAY,
        title,
        badge,
        team,
      },
      {
        id: `${team.id}-second`,
        kind: "team" as const,
        stage: "second" as const,
        delay: TEAM_SECOND_DELAY,
        title,
        badge,
        team,
      },
      {
        id: `${team.id}-complete`,
        kind: "team" as const,
        stage: "complete" as const,
        delay: TEAM_COMPLETE_DELAY,
        title,
        badge,
        team,
      },
    ]
  })
}

export default function LosungsToolPage() {
  const [source, setSource] = useState<PlayerSource>("registration")
  const [mode, setMode] = useState<DrawMode>("random_double")
  const [groupCount, setGroupCount] = useState(4)

  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])

  const [teamResults, setTeamResults] = useState<TeamResult[]>([])
  const [groupResults, setGroupResults] = useState<Player[][]>([])

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [search, setSearch] = useState("")

  const [showRevealModal, setShowRevealModal] = useState(false)
  const [revealSteps, setRevealSteps] = useState<RevealStep[]>([])
  const [currentRevealStep, setCurrentRevealStep] = useState<RevealStep | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [revealedResults, setRevealedResults] = useState<RevealedResult[]>([])
  const [isAutoRevealRunning, setIsAutoRevealRunning] = useState(false)

  const revealTimerRef = useRef<NodeJS.Timeout | null>(null)
  const stepIndexRef = useRef(0)

  const clearRevealTimer = () => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current)
      revealTimerRef.current = null
    }
  }

  const resetRevealState = () => {
    clearRevealTimer()
    setShowRevealModal(false)
    setRevealSteps([])
    setCurrentRevealStep(null)
    setCurrentStepIndex(0)
    stepIndexRef.current = 0
    setRevealedResults([])
    setIsAutoRevealRunning(false)
  }

  const fetchPlayers = async (playerSource: PlayerSource) => {
    setLoading(true)
    setErrorMessage("")
    setTeamResults([])
    setGroupResults([])
    resetRevealState()

    try {
      const { data: dbPlayers, error: dbError } = await supabase
        .from("spieldatenbank")
        .select("id, name, geschlecht")
        .order("name", { ascending: true })

      if (dbError) throw dbError

      const basePlayers: Player[] = (dbPlayers ?? []).map((row) => ({
        id: String(row.id),
        name: String(row.name ?? ""),
        gender: normalizeGender((row as any).geschlecht),
        sourceLabel: "Spieldatenbank",
      }))

      if (playerSource === "spieldatenbank") {
        setPlayers(basePlayers)
        setSelectedPlayerIds(basePlayers.map((p) => p.id))
        return
      }

      const { data: registrations, error: registrationError } = await supabase
        .from("dko_tournament_registration")
        .select("id, player_id, player_name, registered_at")
        .order("registered_at", { ascending: true })

      if (registrationError) throw registrationError

      const dbById = new Map(basePlayers.map((p) => [p.id, p]))
      const dbByName = new Map(basePlayers.map((p) => [p.name.trim().toLowerCase(), p]))

      const mappedRegistrations: Player[] = (registrations ?? []).map((row) => {
        const registrationName = String((row as any).player_name ?? "")
        const registrationPlayerId = String((row as any).player_id ?? "")

        const byId = dbById.get(registrationPlayerId)
        const byName = dbByName.get(registrationName.trim().toLowerCase())
        const match = byId ?? byName

        return {
          id: String((row as any).id),
          name: registrationName,
          gender: match?.gender ?? "unknown",
          sourceLabel: match ? "Registrierung" : "Registrierung / Geschlecht unbekannt",
        }
      })

      setPlayers(mappedRegistrations)
      setSelectedPlayerIds(mappedRegistrations.map((p) => p.id))
    } catch (error) {
      console.error("Fehler beim Laden der Spieler:", error)
      setPlayers([])
      setSelectedPlayerIds([])
      setErrorMessage("Spieler konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlayers(source)

    return () => {
      clearRevealTimer()
    }
  }, [source])

  const filteredPlayers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return players
    return players.filter((player) => player.name.toLowerCase().includes(term))
  }, [players, search])

  const selectedPlayers = useMemo(() => {
    const selectedSet = new Set(selectedPlayerIds)
    return players.filter((player) => selectedSet.has(player.id))
  }, [players, selectedPlayerIds])

  const totalStats = useMemo(() => {
    const men = players.filter((p) => p.gender === "m").length
    const women = players.filter((p) => p.gender === "w").length
    const unknown = players.filter((p) => p.gender === "unknown").length

    return {
      total: players.length,
      men,
      women,
      unknown,
    }
  }, [players])

  const selectedStats = useMemo(() => {
    const men = selectedPlayers.filter((p) => p.gender === "m").length
    const women = selectedPlayers.filter((p) => p.gender === "w").length
    const unknown = selectedPlayers.filter((p) => p.gender === "unknown").length

    return {
      total: selectedPlayers.length,
      men,
      women,
      unknown,
    }
  }, [selectedPlayers])

  const selectedSet = useMemo(() => new Set(selectedPlayerIds), [selectedPlayerIds])

  const groupedPreview = useMemo(() => {
    const groups: string[][] = Array.from({ length: Math.max(2, groupCount) }, () => [])

    for (const item of revealedResults) {
      if (item.type === "group_player") {
        if (!groups[item.groupIndex]) groups[item.groupIndex] = []
        groups[item.groupIndex].push(item.label)
      }
    }

    return groups
  }, [revealedResults, groupCount])

  const progressPercent =
    revealSteps.length > 0 ? Math.round((currentStepIndex / revealSteps.length) * 100) : 0

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId)
      }
      return [...prev, playerId]
    })
  }

  const selectAllPlayers = () => {
    setSelectedPlayerIds(players.map((player) => player.id))
  }

  const deselectAllPlayers = () => {
    setSelectedPlayerIds([])
  }

  const selectAllFiltered = () => {
    const filteredIds = filteredPlayers.map((player) => player.id)

    setSelectedPlayerIds((prev) => {
      const set = new Set(prev)
      filteredIds.forEach((id) => set.add(id))
      return Array.from(set)
    })
  }

  const deselectAllFiltered = () => {
    const filteredIds = new Set(filteredPlayers.map((player) => player.id))
    setSelectedPlayerIds((prev) => prev.filter((id) => !filteredIds.has(id)))
  }

  const addRevealedResult = (step: RevealStep) => {
    if (step.kind === "group_player") {
      const item: RevealedResult = {
        id: step.id,
        type: "group_player",
        title: step.title,
        badge: step.badge,
        label: step.player.name,
        groupIndex: step.groupIndex,
      }

      setRevealedResults((prev) => {
        if (prev.some((entry) => entry.id === item.id)) return prev
        return [...prev, item]
      })

      return
    }

    if (step.stage === "complete") {
      const item: RevealedResult = {
        id: `${step.team.id}-final`,
        type: "team",
        title: step.title,
        badge: step.badge,
        label: step.team.label,
      }

      setRevealedResults((prev) => {
        if (prev.some((entry) => entry.id === item.id)) return prev
        return [...prev, item]
      })
    }
  }

  const runSingleRevealStep = (stepsParam?: RevealStep[]) => {
    const stepsToUse = stepsParam ?? revealSteps
    const index = stepIndexRef.current
    const nextStep = stepsToUse[index]

    if (!nextStep) {
      setCurrentRevealStep(null)
      setIsAutoRevealRunning(false)
      clearRevealTimer()
      return
    }

    setCurrentRevealStep(nextStep)
    addRevealedResult(nextStep)

    const nextIndex = index + 1
    stepIndexRef.current = nextIndex
    setCurrentStepIndex(nextIndex)

    if (nextIndex >= stepsToUse.length) {
      setIsAutoRevealRunning(false)
      clearRevealTimer()
    }
  }

  const startAutoReveal = (stepsParam?: RevealStep[]) => {
    const stepsToUse = stepsParam ?? revealSteps
    clearRevealTimer()

    if (!stepsToUse.length) {
      setIsAutoRevealRunning(false)
      return
    }

    if (stepIndexRef.current >= stepsToUse.length) {
      setIsAutoRevealRunning(false)
      return
    }

    setIsAutoRevealRunning(true)

    const playNext = () => {
      const index = stepIndexRef.current
      const nextStep = stepsToUse[index]

      if (!nextStep) {
        setCurrentRevealStep(null)
        setIsAutoRevealRunning(false)
        clearRevealTimer()
        return
      }

      setCurrentRevealStep(nextStep)
      addRevealedResult(nextStep)

      const nextIndex = index + 1
      stepIndexRef.current = nextIndex
      setCurrentStepIndex(nextIndex)

      if (nextIndex < stepsToUse.length) {
        revealTimerRef.current = setTimeout(playNext, nextStep.delay)
      } else {
        setIsAutoRevealRunning(false)
        clearRevealTimer()
      }
    }

    revealTimerRef.current = setTimeout(playNext, INITIAL_START_DELAY)
  }

  const stopAutoReveal = () => {
    clearRevealTimer()
    setIsAutoRevealRunning(false)
  }

  const revealNextItem = () => {
    clearRevealTimer()
    setIsAutoRevealRunning(false)
    runSingleRevealStep()
  }

  const openRevealModal = (steps: RevealStep[]) => {
    clearRevealTimer()
    setRevealSteps(steps)
    setCurrentRevealStep(null)
    setCurrentStepIndex(0)
    stepIndexRef.current = 0
    setRevealedResults([])
    setShowRevealModal(true)
    setIsAutoRevealRunning(false)

    setTimeout(() => {
      startAutoReveal(steps)
    }, 120)
  }

  const runDraw = () => {
    setErrorMessage("")
    clearRevealTimer()

    if (selectedPlayers.length === 0) {
      setTeamResults([])
      setGroupResults([])
      resetRevealState()
      setErrorMessage("Bitte mindestens einen Spieler auswählen.")
      return
    }

    if (mode === "groups" && groupCount < 2) {
      setTeamResults([])
      setGroupResults([])
      resetRevealState()
      setErrorMessage("Bitte mindestens 2 Gruppen wählen.")
      return
    }

    if (mode === "random_double") {
      const results = drawRandomDouble(selectedPlayers)
      setTeamResults(results)
      setGroupResults([])
      openRevealModal(buildRevealSteps(mode, results, []))
      return
    }

    if (mode === "mixed_double") {
      const results = drawMixedDouble(selectedPlayers)
      setTeamResults(results)
      setGroupResults([])
      openRevealModal(buildRevealSteps(mode, results, []))
      return
    }

    const groups = drawGroups(selectedPlayers, Math.max(2, groupCount))
    setGroupResults(groups)
    setTeamResults([])
    openRevealModal(buildRevealSteps(mode, [], groups))
  }

  const resetAll = () => {
    setTeamResults([])
    setGroupResults([])
    setErrorMessage("")
    resetRevealState()
  }

  return (
    <div className="min-h-screen bg-[#fff7ef]">
      <Header />

      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                <Shuffle className="h-3.5 w-3.5" />
                Losungs Tool
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                Teams, Gruppen & gelostes Doppel
              </h1>

              <p className="mt-2 text-sm text-slate-600 md:text-base">
                Wähle nur die Spieler aus, die wirklich in die Auslosung sollen.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Card className="rounded-2xl border-orange-100 shadow-none">
                <CardContent className="p-4 text-center">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Alle</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{totalStats.total}</div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-orange-100 bg-orange-50 shadow-none">
                <CardContent className="p-4 text-center">
                  <div className="text-xs uppercase tracking-[0.14em] text-orange-600">Ausgewählt</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{selectedStats.total}</div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-orange-100 shadow-none">
                <CardContent className="p-4 text-center">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">M / W</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {selectedStats.men} / {selectedStats.women}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-orange-100 shadow-none">
                <CardContent className="p-4 text-center">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">?</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{selectedStats.unknown}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
          <Card className="rounded-3xl border-orange-100 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <Users className="h-5 w-5 text-orange-500" />
                Spielerquelle & Modus
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={source === "registration" ? "default" : "outline"}
                  className={cn(
                    "rounded-2xl",
                    source === "registration" ? "bg-orange-500 hover:bg-orange-600" : "border-orange-200",
                  )}
                  onClick={() => setSource("registration")}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  DKO Registrierung
                </Button>

                <Button
                  type="button"
                  variant={source === "spieldatenbank" ? "default" : "outline"}
                  className={cn(
                    "rounded-2xl",
                    source === "spieldatenbank" ? "bg-orange-500 hover:bg-orange-600" : "border-orange-200",
                  )}
                  onClick={() => setSource("spieldatenbank")}
                >
                  <Database className="mr-2 h-4 w-4" />
                  Ganze Spieldatenbank
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant={mode === "random_double" ? "default" : "outline"}
                  className={cn(
                    "rounded-2xl",
                    mode === "random_double" ? "bg-orange-500 hover:bg-orange-600" : "border-orange-200",
                  )}
                  onClick={() => setMode("random_double")}
                >
                  Gelostes Doppel
                </Button>

                <Button
                  type="button"
                  variant={mode === "mixed_double" ? "default" : "outline"}
                  className={cn(
                    "rounded-2xl",
                    mode === "mixed_double" ? "bg-orange-500 hover:bg-orange-600" : "border-orange-200",
                  )}
                  onClick={() => setMode("mixed_double")}
                >
                  Männer / Frauen
                </Button>

                <Button
                  type="button"
                  variant={mode === "groups" ? "default" : "outline"}
                  className={cn(
                    "rounded-2xl",
                    mode === "groups" ? "bg-orange-500 hover:bg-orange-600" : "border-orange-200",
                  )}
                  onClick={() => setMode("groups")}
                >
                  Gruppen
                </Button>
              </div>

              {mode === "groups" && (
                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Anzahl Gruppen</label>
                  <Input
                    type="number"
                    min={2}
                    max={16}
                    value={groupCount}
                    onChange={(e) => setGroupCount(Number(e.target.value) || 2)}
                    className="h-11 rounded-2xl border-orange-100 bg-white"
                  />
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Spieler suchen"
                  className="h-11 rounded-2xl border-orange-100"
                />

                <Button
                  onClick={() => fetchPlayers(source)}
                  variant="outline"
                  className="rounded-2xl border-orange-200"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Neu laden
                </Button>

                <Button
                  onClick={runDraw}
                  disabled={loading}
                  className="rounded-2xl bg-orange-500 hover:bg-orange-600"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Show-Auslosung
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Button onClick={selectAllPlayers} variant="outline" className="rounded-2xl border-orange-200">
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Alle wählen
                </Button>

                <Button onClick={deselectAllPlayers} variant="outline" className="rounded-2xl border-orange-200">
                  <Square className="mr-2 h-4 w-4" />
                  Alle abwählen
                </Button>

                <Button onClick={selectAllFiltered} variant="outline" className="rounded-2xl border-orange-200">
                  Gefilterte wählen
                </Button>

                <Button onClick={deselectAllFiltered} variant="outline" className="rounded-2xl border-orange-200">
                  Gefilterte abwählen
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={resetAll} variant="outline" className="rounded-2xl border-orange-200">
                  Ergebnis löschen
                </Button>
              </div>

              {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              {mode === "mixed_double" && selectedStats.unknown > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {selectedStats.unknown} ausgewählte Spieler haben kein gültiges Geschlecht (m / w) und werden bei
                  Mixed als Restspieler gelost.
                </div>
              )}

              <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-slate-700">
                Aktuell ausgewählt: <span className="font-bold text-slate-900">{selectedStats.total}</span> von{" "}
                <span className="font-bold text-slate-900">{totalStats.total}</span> Spielern
              </div>

              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {loading ? (
                  <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50 px-4 py-8 text-center text-sm text-slate-600">
                    Spieler werden geladen...
                  </div>
                ) : filteredPlayers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50 px-4 py-8 text-center text-sm text-slate-600">
                    Keine Spieler gefunden.
                  </div>
                ) : (
                  filteredPlayers.map((player, index) => {
                    const isSelected = selectedSet.has(player.id)

                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => togglePlayer(player.id)}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left transition-all",
                          isSelected
                            ? "border-orange-300 bg-orange-50"
                            : "border-orange-100 bg-white hover:border-orange-200 hover:bg-orange-50/40",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                                isSelected ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-700",
                              )}
                            >
                              {index + 1}
                            </div>

                            <div>
                              <div className="font-semibold text-slate-900">{player.name}</div>

                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="border-orange-200 text-orange-600">
                                  {player.gender === "m" ? "M" : player.gender === "w" ? "W" : "?"}
                                </Badge>

                                {player.sourceLabel && (
                                  <span className="text-xs text-slate-500">{player.sourceLabel}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-bold",
                              isSelected ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {isSelected ? "Ausgewählt" : "Nicht gewählt"}
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-orange-100 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <Trophy className="h-5 w-5 text-orange-500" />
                Ergebnis
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {teamResults.length === 0 && groupResults.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50 px-4 py-10 text-center text-sm text-slate-600">
                  Noch kein Ergebnis vorhanden. Spieler auswählen und Show-Auslosung starten.
                </div>
              ) : null}

              {teamResults.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {teamResults.map((team, index) => (
                    <div key={team.id} className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Team {index + 1}</div>
                        <Badge variant="outline" className="border-orange-200 text-orange-600">
                          {mode === "mixed_double" ? "Mixed" : "Doppel"}
                        </Badge>
                      </div>

                      <div className="mt-3 text-lg font-bold text-slate-900">{team.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {groupResults.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {groupResults.map((group, index) => (
                    <div key={index} className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                      <div className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-orange-600">
                        Gruppe {index + 1}
                      </div>

                      <div className="space-y-2">
                        {group.map((player) => (
                          <div
                            key={player.id}
                            className="rounded-xl border border-white bg-white px-3 py-2 text-sm font-medium text-slate-800"
                          >
                            {player.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(teamResults.length > 0 || groupResults.length > 0) && (
                <Button
                  onClick={() => openRevealModal(buildRevealSteps(mode, teamResults, groupResults))}
                  variant="outline"
                  className="rounded-2xl border-orange-200"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Show nochmal öffnen
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showRevealModal && (
        <div className="fixed inset-0 z-[99999] overflow-hidden">
          <div className="absolute inset-0 bg-black" />

          <div className="relative z-10 flex h-full flex-col">
            <div className="border-b border-[#2a2a2a] bg-[#111111] px-5 py-4 md:px-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
                    Live-Auslosung
                  </div>
                  <div className="mt-1 text-lg font-bold text-white md:text-2xl">
                    {mode === "groups"
                      ? "Gruppen werden gezogen"
                      : mode === "mixed_double"
                        ? "Mixed Doppel wird gezogen"
                        : "Gelostes Doppel wird gezogen"}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isAutoRevealRunning ? (
                    <Button
                      onClick={stopAutoReveal}
                      variant="outline"
                      className="rounded-xl border-[#333333] bg-[#1a1a1a] text-white hover:bg-[#242424]"
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      Stop
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        if (currentStepIndex < revealSteps.length) {
                          startAutoReveal()
                        }
                      }}
                      variant="outline"
                      className="rounded-xl border-[#333333] bg-[#1a1a1a] text-white hover:bg-[#242424]"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Weiter
                    </Button>
                  )}

                  <Button
                    onClick={revealNextItem}
                    variant="outline"
                    className="rounded-xl border-[#333333] bg-[#1a1a1a] text-white hover:bg-[#242424]"
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Nächste
                  </Button>

                  <Button
                    onClick={resetRevealState}
                    variant="outline"
                    className="rounded-xl border-[#333333] bg-[#1a1a1a] text-white hover:bg-[#242424]"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Schließen
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                <div>
                  Fortschritt: <span className="font-bold text-white">{currentStepIndex}</span> / {revealSteps.length}
                </div>
                <div>{progressPercent}%</div>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#222222]">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 p-4 md:p-6">
              <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex min-h-0 items-center justify-center">
                  <div className="w-full max-w-4xl rounded-3xl border border-[#2d2d2d] bg-[#151515] p-6 md:p-10">
                    {currentRevealStep ? (
                      currentRevealStep.kind === "team" ? (
                        <div className="text-center">
                          <div className="inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
                            {currentRevealStep.badge}
                          </div>

                          <div className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                            {currentRevealStep.title}
                          </div>

                          {currentRevealStep.stage === "first" && (
                            <div className="mt-10">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                Spieler 1
                              </div>
                              <div className="mx-auto mt-4 max-w-3xl break-words text-3xl font-bold leading-tight text-white md:text-5xl">
                                {currentRevealStep.team.player1.name}
                              </div>
                            </div>
                          )}

                          {currentRevealStep.stage === "plus" && (
                            <div className="mt-10 flex items-center justify-center">
                              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-orange-500/20 bg-[#1d1d1d] text-5xl font-bold text-orange-400">
                                +
                              </div>
                            </div>
                          )}

                          {currentRevealStep.stage === "second" && (
                            <div className="mt-10">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                Spieler 2
                              </div>
                              <div className="mx-auto mt-4 max-w-3xl break-words text-3xl font-bold leading-tight text-white md:text-5xl">
                                {currentRevealStep.team.player2?.name ?? "Freilos"}
                              </div>
                            </div>
                          )}

                          {currentRevealStep.stage === "complete" && (
                            <div className="mt-10">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                Komplettes Team
                              </div>

                              <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                                <div className="rounded-2xl border border-[#2d2d2d] bg-[#1c1c1c] px-5 py-6">
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                                    Spieler 1
                                  </div>
                                  <div className="mt-3 break-words text-xl font-bold leading-snug text-white md:text-3xl">
                                    {currentRevealStep.team.player1.name}
                                  </div>
                                </div>

                                <div className="text-2xl font-bold text-orange-400 md:text-4xl">+</div>

                                <div className="rounded-2xl border border-[#2d2d2d] bg-[#1c1c1c] px-5 py-6">
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                                    Spieler 2
                                  </div>
                                  <div className="mt-3 break-words text-xl font-bold leading-snug text-white md:text-3xl">
                                    {currentRevealStep.team.player2?.name ?? "Freilos"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
                            {currentRevealStep.badge}
                          </div>

                          <div className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                            {currentRevealStep.title}
                          </div>

                          <div className="mx-auto mt-8 max-w-3xl break-words text-3xl font-bold leading-tight text-white md:text-5xl">
                            {currentRevealStep.player.name}
                          </div>
                        </div>
                      )
                    ) : currentStepIndex >= revealSteps.length && revealSteps.length > 0 ? (
                      <div className="text-center">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Fertig</div>
                        <div className="mt-5 text-3xl font-bold text-white md:text-5xl">
                          Auslosung abgeschlossen
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Bereit</div>
                        <div className="mt-5 text-3xl font-bold text-white md:text-5xl">
                          Show startet...
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-h-0 rounded-3xl border border-[#2d2d2d] bg-[#151515] p-4">
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                    Bereits gezogen
                  </div>

                  <div className="h-[calc(100%-1.25rem)] overflow-y-auto pr-1">
                    {mode === "groups" ? (
                      <div className="space-y-3">
                        {groupedPreview.map((group, index) => (
                          <div key={index} className="rounded-2xl border border-[#2d2d2d] bg-[#1c1c1c] p-4">
                            <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-orange-400">
                              Gruppe {index + 1}
                            </div>

                            <div className="space-y-2">
                              {group.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-[#333333] bg-[#181818] px-3 py-3 text-sm text-gray-500">
                                  wartet...
                                </div>
                              ) : (
                                group.map((name, idx) => (
                                  <div
                                    key={`${name}-${idx}`}
                                    className="rounded-xl border border-[#2b2b2b] bg-[#181818] px-3 py-2 text-sm font-semibold text-white"
                                  >
                                    {name}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {revealedResults.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[#333333] bg-[#181818] px-4 py-6 text-sm text-gray-500">
                            Noch nichts gezogen...
                          </div>
                        ) : (
                          revealedResults.map((item, index) => (
                            <div
                              key={`${item.id}-${index}`}
                              className="rounded-2xl border border-[#2d2d2d] bg-[#1c1c1c] p-4"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                                  {item.title}
                                </div>
                                <div className="rounded-full bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-400">
                                  {item.badge}
                                </div>
                              </div>

                              <div className="mt-3 text-sm font-semibold leading-snug text-white">
                                {item.label}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}