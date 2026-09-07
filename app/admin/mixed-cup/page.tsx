"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Check,
  Crown,
  Dices,
  Calendar,
  Clock,
  Shuffle,
  Maximize2,
  Minimize2,
  Play,
  SkipForward,
  Volume2,
  Loader2,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRoundCheck,
  Users,
  XCircle,
} from "lucide-react"

type Player = {
  id: string
  name: string
  photo_url: string | null
  role: string | null
  team_id: string
  team_name: string
}

type Team = {
  id: string
  name: string
  logo_url: string | null
  players: Player[]
}

type DrawnPlayer = Player & { source_team_name: string; draw_stage: "base" | "rest" }

type MixedTeam = {
  captain: Player
  players: DrawnPlayer[]
}

type LiveDrawItem = {
  player: DrawnPlayer
  mixedTeamIndex: number
  sourceTeamName: string
  drawStage: "base" | "rest"
}

type LivePhase = "ready" | "spinning" | "revealed" | "finished"
type AudienceView = "overview" | "live" | "result"

type ScheduleSlot = {
  id: number
  label: string
  date: string
  time: string
}

type ScheduleMatch = {
  homeIndex: number
  awayIndex: number
}

type ScheduleRound = {
  round: number
  date: string
  time: string
  matches: ScheduleMatch[]
  byeIndex: number
}

const TARGET_TEAM_NAMES = ["Emoj!´s 1", "Emoj!´s 2", "Emoj!´s 3", "Emoj!´s 4", "Emoj!´s 5"]

function shuffle<T>(input: T[]) {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function teamNumber(name: string) {
  const match = name.match(/(\d+)\s*$/)
  return match ? Number(match[1]) : 999
}

function buildRoundRobinSchedule(slots: ScheduleSlot[]) {
  const seeded = shuffle([0, 1, 2, 3, 4])
  let rotation = [...seeded, -1]
  const rounds: ScheduleRound[] = []

  for (let roundIndex = 0; roundIndex < 5; roundIndex += 1) {
    const matches: ScheduleMatch[] = []
    let byeIndex = -1

    for (let pairIndex = 0; pairIndex < 3; pairIndex += 1) {
      const a = rotation[pairIndex]
      const b = rotation[rotation.length - 1 - pairIndex]
      if (a === -1) {
        byeIndex = b
        continue
      }
      if (b === -1) {
        byeIndex = a
        continue
      }

      const flip = Math.random() > 0.5
      matches.push({ homeIndex: flip ? b : a, awayIndex: flip ? a : b })
    }

    const slot = slots[roundIndex]
    rounds.push({
      round: roundIndex + 1,
      date: slot?.date || "",
      time: slot?.time || "19:00",
      matches,
      byeIndex,
    })

    const fixed = rotation[0]
    const rest = rotation.slice(1)
    rest.unshift(rest.pop()!)
    rotation = [fixed, ...rest]
  }

  return rounds
}

function makeFairDraw(teams: Team[], captainByTeam: Record<string, string>, selectedIds: Set<string>) {
  const orderedTeams = teams.slice().sort((a, b) => teamNumber(a.name) - teamNumber(b.name))

  const mixed: MixedTeam[] = orderedTeams.map((team) => {
    const captain = team.players.find((p) => p.id === captainByTeam[team.id])
    if (!captain) throw new Error(`Für ${team.name} ist kein Gruppenkopf festgelegt.`)
    return { captain, players: [] }
  })

  // PHASE 1 – Grundverteilung:
  // Aus JEDEM Ursprungsteam geht zunächst höchstens EIN Spieler an jedes Mixed Team.
  // Reihenfolge der Ziele ist bewusst Mixed Team 1 -> 2 -> 3 -> 4 -> 5.
  // Der Spieler selbst wird vorher zufällig aus dem jeweiligen Ursprungsteam gemischt.
  const leftovers: Array<{ player: Player; sourceTeamName: string }> = []

  for (const sourceTeam of orderedTeams) {
    const captainId = captainByTeam[sourceTeam.id]
    const pool = shuffle(sourceTeam.players.filter((p) => selectedIds.has(p.id) && p.id !== captainId))

    const baseCount = Math.min(pool.length, mixed.length)

    for (let mixedTeamIndex = 0; mixedTeamIndex < baseCount; mixedTeamIndex++) {
      mixed[mixedTeamIndex].players.push({
        ...pool[mixedTeamIndex],
        source_team_name: sourceTeam.name,
        draw_stage: "base",
      })
    }

    for (const player of pool.slice(baseCount)) {
      leftovers.push({ player, sourceTeamName: sourceTeam.name })
    }
  }

  // PHASE 2 – Restspieler:
  // Erst NACHDEM die komplette 5x5-Grundverteilung steht, werden alle übrigen
  // Spieler verteilt. Ziel ist zuerst die kleinste Mannschaft; bei Gleichstand
  // bevorzugen wir das Team mit den bisher wenigsten Spielern aus diesem Ursprungsteam.
  for (const entry of shuffle(leftovers)) {
    const sizes = mixed.map((m) => m.players.length)
    const minSize = Math.min(...sizes)
    let candidates = mixed
      .map((m, index) => ({
        index,
        size: m.players.length,
        sameSource: m.players.filter((p) => p.source_team_name === entry.sourceTeamName).length,
      }))
      .filter((x) => x.size === minSize)

    const minSameSource = Math.min(...candidates.map((x) => x.sameSource))
    candidates = candidates.filter((x) => x.sameSource === minSameSource)
    const destination = candidates[Math.floor(Math.random() * candidates.length)].index

    mixed[destination].players.push({
      ...entry.player,
      source_team_name: entry.sourceTeamName,
      draw_stage: "rest",
    })
  }

  return mixed
}

export default function AdminMixedCupPage() {
  const { user, isAdmin, loading: authLoading, adminLoading } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [captainByTeam, setCaptainByTeam] = useState<Record<string, string>>({})
  const [draw, setDraw] = useState<MixedTeam[] | null>(null)

  const [liveOpen, setLiveOpen] = useState(false)
  const [liveQueue, setLiveQueue] = useState<LiveDrawItem[]>([])
  const [liveIndex, setLiveIndex] = useState(0)
  const [livePhase, setLivePhase] = useState<LivePhase>("ready")
  const [reelName, setReelName] = useState("")
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [isStageFullscreen, setIsStageFullscreen] = useState(false)
  const [audienceView, setAudienceView] = useState<AudienceView>("overview")
  const beamerWindowRef = useRef<Window | null>(null)

  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([
    { id: 1, label: "Spieltag 1", date: "", time: "19:00" },
    { id: 2, label: "Spieltag 2", date: "", time: "19:00" },
    { id: 3, label: "Spieltag 3", date: "", time: "19:00" },
    { id: 4, label: "Spieltag 4", date: "", time: "19:00" },
    { id: 5, label: "Spieltag 5", date: "", time: "19:00" },
    { id: 6, label: "Finaltag", date: "", time: "19:00" },
  ])
  const [schedule, setSchedule] = useState<ScheduleRound[] | null>(null)
  const [scheduleShowOpen, setScheduleShowOpen] = useState(false)
  const [scheduleRevealCount, setScheduleRevealCount] = useState(0)
  const scheduleTimersRef = useRef<number[]>([])

  const loadTeams = async () => {
    setLoading(true)
    setError(null)
    setDraw(null)

    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id,name,logo_url,dart_type")
        .eq("dart_type", "edart")
        .in("name", TARGET_TEAM_NAMES)

      if (teamsError) throw teamsError

      const orderedTeams = ((teamsData || []) as any[]).sort((a, b) => teamNumber(a.name) - teamNumber(b.name))
      const teamIds = orderedTeams.map((t) => t.id)

      if (teamIds.length === 0) {
        setTeams([])
        setSelectedIds(new Set())
        setCaptainByTeam({})
        return
      }

      const { data: memberData, error: memberError } = await supabase
        .from("team_members")
        .select(`
          id,
          team_id,
          role,
          left_at,
          club_players!team_members_player_id_fkey(
            id,
            name,
            photo_url
          )
        `)
        .in("team_id", teamIds)
        .is("left_at", null)

      if (memberError) throw memberError

      const mapped: Team[] = orderedTeams.map((team) => ({
        id: team.id,
        name: team.name,
        logo_url: team.logo_url ?? null,
        players: ((memberData || []) as any[])
          .filter((m) => m.team_id === team.id && m.club_players)
          .map((m) => ({
            id: m.club_players.id,
            name: m.club_players.name,
            photo_url: m.club_players.photo_url ?? null,
            role: m.role ?? null,
            team_id: team.id,
            team_name: team.name,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "de")),
      }))

      const initialCaptains: Record<string, string> = {}
      for (const team of mapped) {
        const captain = team.players.find((p) => p.role === "Captain")
        const fallback = captain || team.players.find((p) => p.role === "Co-Captain") || team.players[0]
        if (fallback) initialCaptains[team.id] = fallback.id
      }

      setTeams(mapped)
      setCaptainByTeam(initialCaptains)
      setSelectedIds(new Set(mapped.flatMap((team) => team.players.map((p) => p.id))))
    } catch (e: any) {
      console.error("Mixed Cup load error:", e)
      setError(e?.message || "Mixed-Cup-Daten konnten nicht geladen werden.")
      setTeams([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && isAdmin) void loadTeams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin])

  const allPlayers = useMemo(() => teams.flatMap((team) => team.players), [teams])
  const selectedCount = useMemo(() => allPlayers.filter((p) => selectedIds.has(p.id)).length, [allPlayers, selectedIds])

  const poolStats = useMemo(
    () =>
      teams.map((team) => {
        const captainId = captainByTeam[team.id]
        const selectedPool = team.players.filter((p) => selectedIds.has(p.id) && p.id !== captainId)
        return {
          team,
          captain: team.players.find((p) => p.id === captainId) || null,
          poolCount: selectedPool.length,
          canGiveEveryoneOne: selectedPool.length >= teams.length,
        }
      }),
    [teams, captainByTeam, selectedIds],
  )

  const exactMixPossible = teams.length === 5 && poolStats.every((x) => x.canGiveEveryoneOne)

  const togglePlayer = (playerId: string, teamId: string) => {
    if (captainByTeam[teamId] === playerId) return
    setDraw(null)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  const changeCaptain = (teamId: string, playerId: string) => {
    setDraw(null)
    setCaptainByTeam((prev) => ({ ...prev, [teamId]: playerId }))
    setSelectedIds((prev) => new Set(prev).add(playerId))
  }

  const selectAll = () => {
    setDraw(null)
    setSelectedIds(new Set(allPlayers.map((p) => p.id)))
  }

  const clearNonCaptains = () => {
    setDraw(null)
    setSelectedIds(new Set(Object.values(captainByTeam)))
  }

  const createTestDraw = () => {
    try {
      setError(null)
      setDraw(makeFairDraw(teams, captainByTeam, selectedIds))
      window.setTimeout(() => document.getElementById("mixed-cup-result")?.scrollIntoView({ behavior: "smooth" }), 50)
    } catch (e: any) {
      setError(e?.message || "Auslosung konnte nicht erstellt werden.")
    }
  }

  const buildLiveQueue = (preparedDraw: MixedTeam[]) => {
    const queue: LiveDrawItem[] = []
    const orderedTeams = teams.slice().sort((a, b) => teamNumber(a.name) - teamNumber(b.name))

    // PHASE 1: exakt nachvollziehbar für die Live-Show.
    // Emoj!´s 1: Mixed Team 1 -> 2 -> 3 -> 4 -> 5
    // Emoj!´s 2: Mixed Team 1 -> 2 -> 3 -> 4 -> 5
    // ... bis Emoj!´s 5.
    for (const sourceTeam of orderedTeams) {
      for (let mixedTeamIndex = 0; mixedTeamIndex < preparedDraw.length; mixedTeamIndex++) {
        const player = preparedDraw[mixedTeamIndex].players.find(
          (p) => p.draw_stage === "base" && p.source_team_name === sourceTeam.name,
        )
        if (!player) continue

        queue.push({
          player,
          mixedTeamIndex,
          sourceTeamName: sourceTeam.name,
          drawStage: "base",
        })
      }
    }

    // PHASE 2: Restspieler erst ganz am Schluss.
    // Auch hier bleibt die Show sauber: Mixed Team 1 -> 2 -> 3 -> 4 -> 5 -> wieder 1 ...
    const restByMixedTeam = preparedDraw.map((mixedTeam) => mixedTeam.players.filter((p) => p.draw_stage === "rest"))
    const maxRest = Math.max(0, ...restByMixedTeam.map((players) => players.length))

    for (let wave = 0; wave < maxRest; wave++) {
      for (let mixedTeamIndex = 0; mixedTeamIndex < restByMixedTeam.length; mixedTeamIndex++) {
        const player = restByMixedTeam[mixedTeamIndex][wave]
        if (!player) continue

        queue.push({
          player,
          mixedTeamIndex,
          sourceTeamName: player.source_team_name,
          drawStage: "rest",
        })
      }
    }

    return queue
  }

  const openLiveDraw = () => {
    try {
      setError(null)
      const preparedDraw = draw ?? makeFairDraw(teams, captainByTeam, selectedIds)
      setDraw(preparedDraw)
      const queue = buildLiveQueue(preparedDraw)
      setLiveQueue(queue)
      setLiveIndex(0)
      setLivePhase(queue.length ? "ready" : "finished")
      setReelName(queue[0]?.sourceTeamName || "")
      setRevealedIds(new Set())
      setAudienceView("overview")
      setLiveOpen(true)
    } catch (e: any) {
      setError(e?.message || "Live-Auslosung konnte nicht vorbereitet werden.")
    }
  }

  const runLiveReveal = () => {
    if (livePhase === "spinning" || livePhase === "finished") return

    if (livePhase === "revealed") {
      const nextIndex = liveIndex + 1
      if (nextIndex >= liveQueue.length) {
        setLivePhase("finished")
        setAudienceView("result")
        return
      }
      setLiveIndex(nextIndex)
      setLivePhase("ready")
      setReelName(liveQueue[nextIndex].sourceTeamName)
      return
    }

    const current = liveQueue[liveIndex]
    if (!current) {
      setLivePhase("finished")
      return
    }

    const candidates = teams
      .find((team) => team.name === current.sourceTeamName)
      ?.players.filter((player) => selectedIds.has(player.id) && !revealedIds.has(player.id) && captainByTeam[player.team_id] !== player.id) ?? []

    const names = candidates.length ? candidates.map((player) => player.name) : [current.player.name]
    setAudienceView("live")
    setLivePhase("spinning")

    // Show-Reel: mehrere komplette Durchläufe durch den aktuellen Lostopf,
    // anschließend immer langsamer bis zum echten Reveal.
    const fastRounds = Math.max(4, Math.min(7, names.length > 7 ? 4 : 6))
    const reelSequence: string[] = []

    for (let round = 0; round < fastRounds; round += 1) {
      const offset = Math.floor(Math.random() * names.length)
      for (let i = 0; i < names.length; i += 1) {
        reelSequence.push(names[(i + offset) % names.length] || current.player.name)
      }
    }

    // Extra Slowdown-Namen, damit die Spannung am Ende sichtbar steigt.
    for (let i = 0; i < 9; i += 1) {
      reelSequence.push(names[Math.floor(Math.random() * names.length)] || current.player.name)
    }

    let step = 0
    const slowdownCount = 9

    const tick = () => {
      if (step >= reelSequence.length) {
        setReelName(current.player.name)
        setRevealedIds((prev) => new Set(prev).add(current.player.id))
        setLivePhase("revealed")
        return
      }

      setReelName(reelSequence[step] || current.player.name)

      const slowStart = Math.max(0, reelSequence.length - slowdownCount)
      const slowIndex = Math.max(0, step - slowStart)
      const delay =
        step < slowStart
          ? 95
          : [130, 155, 185, 220, 270, 330, 410, 520, 680][slowIndex] ?? 680

      step += 1
      window.setTimeout(tick, delay)
    }

    tick()
  }

  const updateScheduleSlot = (id: number, field: "date" | "time", value: string) => {
    setSchedule(null)
    setScheduleSlots((prev) => prev.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot)))
  }

  const scheduleDatesComplete = scheduleSlots.every((slot) => Boolean(slot.date && slot.time))

  const createSchedule = () => {
    if (!draw) {
      setError("Bitte zuerst die Mixed Teams auslosen.")
      return null
    }
    if (!scheduleDatesComplete) {
      setError("Bitte zuerst alle 5 Spieltage und den Finaltag mit Datum und Uhrzeit eintragen.")
      return null
    }

    const next = buildRoundRobinSchedule(scheduleSlots)
    setSchedule(next)
    setError(null)
    return next
  }

  const stopScheduleTimers = () => {
    scheduleTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    scheduleTimersRef.current = []
  }

  const startScheduleShow = () => {
    const next = createSchedule()
    if (!next) return

    stopScheduleTimers()
    setScheduleRevealCount(0)
    setScheduleShowOpen(true)

    // Kurz und spannend: ca. 2 Sekunden pro Spieltag, danach Finaltag.
    for (let i = 1; i <= 5; i += 1) {
      const timer = window.setTimeout(() => setScheduleRevealCount(i), 900 + i * 1900)
      scheduleTimersRef.current.push(timer)
    }
    const finishTimer = window.setTimeout(() => setScheduleRevealCount(6), 900 + 6 * 1900)
    scheduleTimersRef.current.push(finishTimer)
  }

  const closeScheduleShow = () => {
    stopScheduleTimers()
    setScheduleShowOpen(false)
  }

  const syncBeamerWindow = () => {
    const beamer = beamerWindowRef.current
    if (!beamer || beamer.closed) return

    const stage = document.getElementById("mixed-cup-live-stage")
    if (!stage) return

    const clone = stage.cloneNode(true) as HTMLElement
    const adminAside = clone.querySelector("aside[data-beamer-hide]")
    if (adminAside?.parentElement) {
      adminAside.parentElement.style.gridTemplateColumns = "minmax(0,1fr)"
    }
    clone.querySelectorAll("[data-beamer-hide]").forEach((node) => node.remove())
    clone.classList.remove("sm:rounded-[28px]", "sm:border", "sm:shadow-2xl")
    clone.style.height = "100vh"
    clone.style.width = "100vw"
    clone.style.maxHeight = "100vh"
    clone.style.maxWidth = "100vw"
    clone.style.borderRadius = "0"
    clone.style.overflow = "hidden"
    clone.setAttribute("data-audience-stage", "true")

    beamer.document.body.innerHTML = ""
    beamer.document.body.appendChild(clone)

    // Browser erlauben echtes Fullscreen nur nach einem Klick im Beamer-Fenster.
    // Deshalb liegt dort einmalig ein klarer Vollbild-Button über der Show.
    if (!beamer.document.fullscreenElement) {
      const fullscreenButton = beamer.document.createElement("button")
      fullscreenButton.type = "button"
      fullscreenButton.textContent = "⛶  VOLLBILD STARTEN"
      fullscreenButton.setAttribute("aria-label", "Beamer-Vollbild starten")
      fullscreenButton.style.position = "fixed"
      fullscreenButton.style.top = "18px"
      fullscreenButton.style.right = "18px"
      fullscreenButton.style.zIndex = "999999"
      fullscreenButton.style.height = "48px"
      fullscreenButton.style.padding = "0 18px"
      fullscreenButton.style.borderRadius = "14px"
      fullscreenButton.style.border = "1px solid rgba(251,146,60,.55)"
      fullscreenButton.style.background = "rgba(249,115,22,.94)"
      fullscreenButton.style.color = "white"
      fullscreenButton.style.fontWeight = "900"
      fullscreenButton.style.fontSize = "13px"
      fullscreenButton.style.letterSpacing = ".08em"
      fullscreenButton.style.boxShadow = "0 18px 50px rgba(0,0,0,.35)"
      fullscreenButton.style.cursor = "pointer"
      fullscreenButton.onclick = async () => {
        try {
          await beamer.document.documentElement.requestFullscreen()
          fullscreenButton.remove()
        } catch {
          fullscreenButton.textContent = "VOLLBILD IM BROWSER ERLAUBEN"
        }
      }
      beamer.document.body.appendChild(fullscreenButton)
    }
  }

  const openBeamerWindow = () => {
    const existing = beamerWindowRef.current
    const beamer = existing && !existing.closed
      ? existing
      : window.open("", "emd-mixed-cup-beamer", "popup=yes,width=1600,height=900")

    if (!beamer) {
      setError("Beamer-Fenster konnte nicht geöffnet werden. Bitte Pop-ups für diese Seite erlauben.")
      return
    }

    beamerWindowRef.current = beamer
    beamer.document.open()
    beamer.document.write(`<!doctype html><html><head>${document.head.innerHTML}<style>
      html,body{margin:0!important;width:100%!important;height:100%!important;overflow:hidden!important;background:#05070b!important;overscroll-behavior:none!important}
      body{position:fixed!important;inset:0!important}
      body>[data-audience-stage]{height:100dvh!important;width:100vw!important;max-height:100dvh!important;max-width:100vw!important;border-radius:0!important;overflow:hidden!important}
      body>[data-audience-stage] *{scrollbar-width:none!important}
      body>[data-audience-stage] *::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}
      /* Zuschaueransicht soll auf 16:9 ohne Scrollen lesbar bleiben. */
      @media (max-height:850px){
        body>[data-audience-stage] header{padding-top:8px!important;padding-bottom:8px!important}
        body>[data-audience-stage] .rounded-2xl{border-radius:14px!important}
      }
    </style></head><body></body></html>`)
    beamer.document.close()
    beamer.document.title = "EMD Mixed Cup – Live-Auslosung"
    beamer.focus()
    window.setTimeout(syncBeamerWindow, 120)
  }

  const toggleStageFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.getElementById("mixed-cup-live-stage")?.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (e) {
      console.warn("Fullscreen nicht verfügbar:", e)
    }
  }

  useEffect(() => {
    if (!liveOpen) return
    const timer = window.setTimeout(syncBeamerWindow, 0)
    return () => window.clearTimeout(timer)
  }, [liveOpen, liveIndex, livePhase, revealedIds, draw, liveQueue, audienceView])

  // Während die Namen durchlaufen, aktualisieren wir im Beamer NUR den großen Namen.
  // So werden die bereits zugelosten Teamkarten nicht bei jedem Tick neu aufgebaut und flackern nicht mehr.
  useEffect(() => {
    const beamer = beamerWindowRef.current
    if (!beamer || beamer.closed) return
    const target = beamer.document.querySelector("[data-beamer-reel-name]")
    if (target) target.textContent = livePhase === "ready" ? "BEREIT?" : reelName
  }, [reelName, livePhase])

  useEffect(() => {
    return () => {
      stopScheduleTimers()
      if (beamerWindowRef.current && !beamerWindowRef.current.closed) {
        beamerWindowRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    const onFullscreen = () => setIsStageFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onFullscreen)
    return () => document.removeEventListener("fullscreenchange", onFullscreen)
  }, [])

  // Im Beamer-Vollbild bleibt die Regie unsichtbar. Space/Enter steuert die Show trotzdem weiter.
  useEffect(() => {
    if (!liveOpen || !isStageFullscreen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.code !== "Enter") return
      event.preventDefault()
      if (livePhase !== "spinning" && livePhase !== "finished") runLiveReveal()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [liveOpen, isStageFullscreen, livePhase, liveIndex, liveQueue, revealedIds])

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-[#f5f6f8]">
        <Header />
        <main className="flex min-h-[70vh] items-center justify-center px-4 pt-20">
          <div className="rounded-3xl border border-slate-200 bg-white px-8 py-7 text-center shadow-sm">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-orange-600" />
            <p className="mt-3 text-sm font-bold text-slate-600">Admin-Berechtigung wird geprüft …</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#f5f6f8]">
        <Header />
        <main className="flex min-h-[75vh] items-center justify-center px-4 pt-20">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-900/5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <XCircle className="h-7 w-7 text-red-600" />
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">Zugriff verweigert</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Dieser Bereich ist ausschließlich für Administratoren freigegeben.</p>
            <Button onClick={() => router.push("/admin")} className="mt-5 h-11 w-full rounded-xl bg-slate-950 font-black text-white hover:bg-slate-800">
              Zurück zum Admin-Dashboard
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f6f8] text-slate-950">
      <Header />

      <main className="w-full px-2 pb-24 pt-14 sm:px-4 sm:pt-16 lg:px-5 xl:px-6 2xl:px-8">
        <section className="relative overflow-hidden rounded-[24px] border border-slate-800/10 bg-slate-950 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.62)] sm:rounded-[28px] xl:rounded-[30px]">
          <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-80 rounded-full bg-white/5 blur-3xl" />

          <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => router.push("/admin")}
                  className="mb-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-white/70 transition hover:bg-white/[0.1] hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Admin-Dashboard
                </button>

                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] p-3">
                    <Dices className="h-7 w-7 text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-white/50">Vereinsverwaltung · Admin</p>
                      <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/20 bg-orange-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-orange-300">
                        <LockKeyhole className="h-3 w-3" /> Testmodus
                      </span>
                    </div>
                    <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">EMD Mixed Cup</h1>
                  </div>
                </div>

                <p className="mt-4 max-w-4xl text-sm font-medium leading-6 text-white/55 sm:text-base">
                  Spieler für die interne Mixed-Cup-Auslosung manuell auswählen. Die fünf Gruppenköpfe bleiben gesetzt, die übrigen Spieler werden fair aus Emoj!´s 1–5 verteilt.
                </p>
              </div>

              <div className="xl:min-w-[560px]">
                <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-300">LIVE SHOW TEST</div>
                    <div className="mt-1 text-sm font-black text-white">Beamer-Auslosung mit langsamem Namens-Reveal</div>
                  </div>
                  <Button
                    onClick={openLiveDraw}
                    disabled={loading || teams.length !== 5 || selectedCount <= 5}
                    className="h-12 shrink-0 rounded-xl bg-orange-500 px-5 font-black text-white shadow-lg shadow-orange-950/30 hover:bg-orange-600 disabled:opacity-40"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    LIVE-AUSLOSUNG STARTEN
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Teams</div>
                  <div className="mt-1 text-xl font-black text-white">{teams.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Spieler</div>
                  <div className="mt-1 text-xl font-black text-white">{allPlayers.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Ausgewählt</div>
                  <div className="mt-1 text-xl font-black text-orange-300">{selectedCount}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Verteilung</div>
                  <div className={`mt-1 text-sm font-black ${exactMixPossible ? "text-emerald-300" : "text-amber-300"}`}>
                    {exactMixPossible ? "bereit" : "prüfen"}
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-5">
          <div className="min-w-0 space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)] sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-950">
                    <UserRoundCheck className="h-5 w-5 text-orange-600" />
                    Test-Teilnehmer auswählen
                  </div>
                  <p className="mt-1 text-sm text-slate-500">Gruppenköpfe sind immer dabei. Alle anderen Spieler kannst du für den Test ein- oder ausschalten.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={clearNonCaptains} className="h-10 rounded-xl border-slate-200 font-black">
                    Nur Gruppenköpfe
                  </Button>
                  <Button variant="outline" onClick={selectAll} className="h-10 rounded-xl border-orange-200 font-black text-orange-700 hover:bg-orange-50">
                    Alle auswählen
                  </Button>
                  <Button variant="outline" onClick={loadTeams} className="h-10 rounded-xl border-slate-200 font-black">
                    <RefreshCw className="mr-2 h-4 w-4" /> Aktualisieren
                  </Button>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div>
            )}

            {loading ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
                <Loader2 className="mx-auto h-7 w-7 animate-spin text-orange-600" />
                <p className="mt-3 text-sm font-bold text-slate-600">Teams und Spieler werden geladen …</p>
              </div>
            ) : (
              <div className="grid gap-4 2xl:grid-cols-5 xl:grid-cols-3 md:grid-cols-2">
                {teams.map((team) => {
                  const captainId = captainByTeam[team.id]
                  const selectedInTeam = team.players.filter((p) => selectedIds.has(p.id)).length
                  return (
                    <article key={team.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_50px_-38px_rgba(15,23,42,0.55)]">
                      <div className="border-b border-slate-100 bg-slate-950 p-4 text-white">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-300">Lostopf</div>
                            <h2 className="mt-1 text-xl font-black tracking-tight">{team.name}</h2>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-center">
                            <div className="text-lg font-black">{selectedInTeam}</div>
                            <div className="text-[9px] font-black uppercase tracking-wider text-white/45">aktiv</div>
                          </div>
                        </div>
                      </div>

                      <div className="p-3">
                        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-amber-800">
                            <Crown className="h-4 w-4" /> Gruppenkopf
                          </div>
                          <select
                            value={captainId || ""}
                            onChange={(e) => changeCaptain(team.id, e.target.value)}
                            className="mt-2 h-10 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-orange-400"
                          >
                            {team.players.map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.name}{player.role ? ` · ${player.role}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          {team.players.map((player) => {
                            const isCaptain = captainId === player.id
                            const checked = selectedIds.has(player.id)
                            return (
                              <button
                                key={player.id}
                                type="button"
                                onClick={() => togglePlayer(player.id, team.id)}
                                disabled={isCaptain}
                                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                                  checked
                                    ? "border-orange-200 bg-orange-50/70"
                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                } ${isCaptain ? "cursor-default" : "cursor-pointer"}`}
                              >
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${checked ? "border-orange-300 bg-orange-500 text-white" : "border-slate-200 bg-white text-transparent"}`}>
                                  <Check className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-black text-slate-900">{player.name}</div>
                                  <div className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                    <span>{player.role || "Player"}</span>
                                    {isCaptain && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800">gesetzt</span>}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-20">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)] sm:p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
                <ShieldCheck className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950">Fairness-Check</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Für die perfekte erste Runde braucht jeder Lostopf mindestens 5 auswählbare Spieler zusätzlich zum Gruppenkopf.</p>

              <div className="mt-4 space-y-2">
                {poolStats.map(({ team, poolCount, canGiveEveryoneOne }) => (
                  <div key={team.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <span className="text-sm font-black text-slate-800">{team.name}</span>
                    <span className={`text-xs font-black ${canGiveEveryoneOne ? "text-emerald-700" : "text-amber-700"}`}>
                      {poolCount} im Topf
                    </span>
                  </div>
                ))}
              </div>

              <div className={`mt-4 rounded-2xl border p-3 ${exactMixPossible ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                <div className={`flex items-center gap-2 text-sm font-black ${exactMixPossible ? "text-emerald-800" : "text-amber-800"}`}>
                  {exactMixPossible ? <ShieldCheck className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  {exactMixPossible ? "5×5-Mischung möglich" : "Auslosung trotzdem möglich"}
                </div>
                <p className={`mt-1 text-xs leading-5 ${exactMixPossible ? "text-emerald-700" : "text-amber-700"}`}>
                  {exactMixPossible
                    ? "Jeder Gruppenkopf kann mindestens einen Spieler aus jedem der fünf Ursprungsteams erhalten."
                    : "Bei kleineren Testfeldern verteilt das System die vorhandenen Spieler so gleichmäßig wie möglich."}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-slate-800 bg-slate-950 p-4 text-white shadow-[0_20px_60px_-38px_rgba(15,23,42,0.8)] sm:p-5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-orange-300">
                <Trophy className="h-4 w-4" /> Test-Auslosung
              </div>
              <div className="mt-3 text-3xl font-black tracking-tight">{selectedCount} Teilnehmer</div>
              <p className="mt-2 text-sm leading-6 text-white/55">Erstellt sofort eine faire Vorschau. Es wird noch nichts in der Datenbank gespeichert.</p>

              <Button
                onClick={createTestDraw}
                disabled={loading || teams.length !== 5 || selectedCount <= 5}
                className="mt-5 h-12 w-full rounded-xl bg-orange-500 font-black text-white hover:bg-orange-600 disabled:opacity-40"
              >
                <Dices className="mr-2 h-5 w-5" />
                Test-Auslosung erstellen
              </Button>

              <Button
                onClick={openLiveDraw}
                disabled={loading || teams.length !== 5 || selectedCount <= 5}
                className="mt-2 h-12 w-full rounded-xl bg-white font-black text-slate-950 hover:bg-orange-50 disabled:opacity-40"
              >
                <Play className="mr-2 h-5 w-5" />
                Live-Show starten
              </Button>

              {draw && (
                <Button
                  onClick={createTestDraw}
                  variant="outline"
                  className="mt-2 h-11 w-full rounded-xl border-white/15 bg-white/[0.04] font-black text-white hover:bg-white/[0.09] hover:text-white"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Neu auslosen
                </Button>
              )}
            </div>
          </aside>
        </section>

        {draw && (
          <section id="mixed-cup-result" className="mt-5 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.14em] text-orange-600">Test-Ergebnis</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Mixed-Cup-Mannschaften</h2>
                <p className="mt-1 text-sm text-slate-500">Noch nicht gespeichert · jede neue Auslosung erzeugt eine neue faire Variante.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700">{selectedCount} Personen gesamt</div>
            </div>

            <div className="mt-5 grid gap-4 2xl:grid-cols-5 xl:grid-cols-3 md:grid-cols-2">
              {draw.map((mixedTeam, index) => (
                <article key={mixedTeam.captain.id} className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
                  <div className="bg-slate-950 p-4 text-white">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-300">Mixed Team {index + 1}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <Crown className="h-5 w-5 text-amber-300" />
                      <div className="truncate text-lg font-black">{mixedTeam.captain.name}</div>
                    </div>
                    <div className="mt-1 text-xs font-bold text-white/45">Gruppenkopf · {mixedTeam.captain.team_name}</div>
                  </div>
                  <div className="space-y-2 p-3">
                    {mixedTeam.players
                      .slice()
                      .sort((a, b) => teamNumber(a.source_team_name) - teamNumber(b.source_team_name))
                      .map((player) => (
                        <div key={player.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                          <div className="text-sm font-black text-slate-900">{player.name}</div>
                          <div className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-orange-600">{player.source_team_name}</div>
                        </div>
                      ))}
                    <div className="pt-1 text-center text-xs font-black text-slate-500">
                      {mixedTeam.players.length + 1} Spieler inkl. Gruppenkopf
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {draw && (
          <section className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)]">
            <div className="border-b border-slate-100 bg-slate-950 p-4 text-white sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-orange-300">
                    <Calendar className="h-4 w-4" /> Spielplan & Termine
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">5 Samstage + Finaltag</h2>
                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white/55">
                    Jeder spielt einmal gegen jeden. Pro Spieltag laufen zwei Begegnungen, ein Mixed Team hat spielfrei. Am Finaltag spielt Platz 3 gegen Platz 4 und Platz 1 gegen Platz 2 um den Titel.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white/75">
                  10 Vorrunden-Spiele · 5× spielfrei · 2 Finalspiele
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {scheduleSlots.map((slot) => (
                  <div key={slot.id} className={`rounded-2xl border p-4 ${slot.id === 6 ? "border-orange-200 bg-orange-50/60" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-black text-slate-950">{slot.label}</div>
                      {slot.id === 6 && <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-orange-700">Finale</span>}
                    </div>
                    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_118px] gap-2">
                      <label className="relative">
                        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          value={slot.date}
                          onChange={(event) => updateScheduleSlot(slot.id, "date", event.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                        />
                      </label>
                      <label className="relative">
                        <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="time"
                          value={slot.time}
                          onChange={(event) => updateScheduleSlot(slot.id, "time", event.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-2 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-black text-slate-950">Spielplan fair auslosen</div>
                  <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Die Paarungen werden zufällig auf die 5 Spieltage verteilt. Garantiert: jeder gegen jeden genau einmal und jedes Team genau einmal spielfrei.
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={createSchedule}
                    disabled={!scheduleDatesComplete}
                    variant="outline"
                    className="h-11 rounded-xl border-slate-300 bg-white px-5 font-black text-slate-800 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <Shuffle className="mr-2 h-4 w-4" /> Nur Spielplan auslosen
                  </Button>
                  <Button
                    onClick={startScheduleShow}
                    disabled={!scheduleDatesComplete}
                    className="h-11 rounded-xl bg-orange-500 px-5 font-black text-white hover:bg-orange-600 disabled:opacity-40"
                  >
                    <Play className="mr-2 h-4 w-4" /> Spielplan-Show starten
                  </Button>
                </div>
              </div>

              {!scheduleDatesComplete && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                  Bitte alle 5 Samstage und den Finaltag eintragen. Die Uhrzeit ist bereits mit 19:00 Uhr vorbelegt.
                </div>
              )}

              {schedule && (
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.14em] text-orange-600">Aktueller Test-Spielplan</div>
                      <div className="mt-1 text-lg font-black text-slate-950">Vorrunde</div>
                    </div>
                    <Button onClick={createSchedule} variant="outline" className="h-9 rounded-xl font-black">
                      <RefreshCw className="mr-2 h-4 w-4" /> Neu auslosen
                    </Button>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-5 md:grid-cols-2">
                    {schedule.map((round) => (
                      <article key={round.round} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="border-b border-slate-100 bg-slate-950 px-3 py-3 text-white">
                          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-300">Spieltag {round.round}</div>
                          <div className="mt-1 text-sm font-black">{new Date(`${round.date}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>
                          <div className="mt-0.5 text-xs font-bold text-white/45">{round.time} Uhr</div>
                        </div>
                        <div className="space-y-2 p-3">
                          {round.matches.map((match, matchIndex) => (
                            <div key={matchIndex} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
                              <div className="text-xs font-black text-slate-900">Mixed Team {match.homeIndex + 1}</div>
                              <div className="my-0.5 text-[10px] font-black text-orange-600">VS</div>
                              <div className="text-xs font-black text-slate-900">Mixed Team {match.awayIndex + 1}</div>
                            </div>
                          ))}
                          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-center text-[11px] font-black text-slate-500">
                            Spielfrei: Mixed Team {round.byeIndex + 1}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
                      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-300">Spiel um Platz 3</div>
                      <div className="mt-2 text-xl font-black">Tabellenplatz 3 <span className="text-orange-300">vs.</span> Tabellenplatz 4</div>
                      <div className="mt-2 text-xs font-bold text-white/45">{new Date(`${scheduleSlots[5].date}T12:00:00`).toLocaleDateString("de-DE")} · {scheduleSlots[5].time} Uhr</div>
                    </div>
                    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-700">Finale</div>
                      <div className="mt-2 text-xl font-black text-slate-950">Tabellenplatz 1 <span className="text-orange-600">vs.</span> Tabellenplatz 2</div>
                      <div className="mt-2 text-xs font-bold text-slate-500">{new Date(`${scheduleSlots[5].date}T12:00:00`).toLocaleDateString("de-DE")} · {scheduleSlots[5].time} Uhr</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

      {scheduleShowOpen && schedule && draw && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#05070b] p-3 text-white sm:p-6">
          <div className="pointer-events-none absolute -left-24 top-10 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative flex h-full w-full max-w-[1700px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black/20 shadow-2xl">
            <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/10">
                  <Calendar className="h-5 w-5 text-orange-300" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">EMD Mixed Cup</div>
                  <div className="text-lg font-black sm:text-xl">Spielplan-Auslosung</div>
                </div>
              </div>
              <Button onClick={closeScheduleShow} variant="outline" className="border-white/15 bg-white/[0.05] font-black text-white hover:bg-white/10 hover:text-white">
                Schließen
              </Button>
            </header>

            <div className="min-h-0 flex-1 p-4 sm:p-6">
              {scheduleRevealCount === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Shuffle className="h-14 w-14 animate-pulse text-orange-300" />
                  <div className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-orange-300">Paarungen werden gemischt</div>
                  <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-6xl">WER SPIELT WANN?</h2>
                  <p className="mt-4 text-sm font-semibold text-white/45">Kurze Auslosung · jeder gegen jeden · ein Team pro Samstag spielfrei</p>
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {schedule.map((round, index) => {
                      const visible = index < Math.min(scheduleRevealCount, 5)
                      return (
                        <article key={round.round} className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border transition-all duration-500 ${visible ? "border-orange-400/30 bg-white/[0.06] opacity-100" : "border-white/10 bg-white/[0.02] opacity-20"}`}>
                          <div className="border-b border-white/10 bg-black/25 p-3">
                            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">Spieltag {round.round}</div>
                            <div className="mt-1 text-base font-black">{visible ? new Date(`${round.date}T12:00:00`).toLocaleDateString("de-DE") : "••.••.••••"}</div>
                            <div className="text-xs font-bold text-white/40">{visible ? `${round.time} Uhr` : "--:--"}</div>
                          </div>
                          <div className="flex-1 space-y-2 p-3">
                            {visible ? (
                              <>
                                {round.matches.map((match, matchIndex) => (
                                  <div key={matchIndex} className="rounded-xl border border-white/10 bg-white/[0.055] px-2 py-3 text-center">
                                    <div className="text-sm font-black">Mixed Team {match.homeIndex + 1}</div>
                                    <div className="my-1 text-[10px] font-black text-orange-300">VS</div>
                                    <div className="text-sm font-black">Mixed Team {match.awayIndex + 1}</div>
                                  </div>
                                ))}
                                <div className="rounded-xl border border-dashed border-white/15 px-2 py-2 text-center text-[11px] font-black text-white/45">Spielfrei: Mixed Team {round.byeIndex + 1}</div>
                              </>
                            ) : (
                              <div className="flex h-full items-center justify-center text-3xl font-black text-white/15">?</div>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>

                  {scheduleRevealCount >= 6 && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-center">
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Spiel um Platz 3</div>
                        <div className="mt-2 text-xl font-black">Platz 3 <span className="text-orange-300">vs.</span> Platz 4</div>
                      </div>
                      <div className="rounded-2xl border border-orange-400/30 bg-orange-500/10 p-4 text-center">
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">Finale</div>
                        <div className="mt-2 text-xl font-black">Platz 1 <span className="text-orange-300">vs.</span> Platz 2</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {liveOpen && draw && (
        <div className="fixed inset-0 z-[100] bg-black/80 p-0 backdrop-blur-md sm:p-3">
          <section
            id="mixed-cup-live-stage"
            className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#05070b] text-white sm:rounded-[28px] sm:border sm:border-white/10 sm:shadow-2xl"
          >
            <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />

            <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/25 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/10">
                  <Trophy className="h-5 w-5 text-orange-300" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">EMD Mixed Cup</div>
                  <div className="text-lg font-black tracking-tight sm:text-xl">LIVE-AUSLOSUNG</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black text-white/70 sm:block">
                  {Math.min(liveIndex + (livePhase === "finished" ? 0 : 1), liveQueue.length)} / {liveQueue.length} Ziehungen
                </div>

                {!isStageFullscreen && (
                  <>
                    <button
                      type="button"
                      onClick={openBeamerWindow}
                      data-beamer-hide
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-orange-400/30 bg-orange-500/10 px-3 text-xs font-black text-orange-100 transition hover:bg-orange-500/20"
                      title="Beamer-Fenster öffnen"
                    >
                      <Maximize2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Zuschauerfenster öffnen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiveOpen(false)}
                      data-beamer-hide
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/80 transition hover:bg-red-500/20 hover:text-red-200"
                      title="Show schließen"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </header>

            {isStageFullscreen && (
              <div data-beamer-hide className="pointer-events-none absolute bottom-3 right-4 z-30 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/25">
                Leertaste / Enter = weiter · Esc = Beamer-Modus verlassen
              </div>
            )}

            <div
              className={`relative z-10 grid min-h-0 flex-1 gap-3 p-3 lg:p-4 ${
                isStageFullscreen ? "grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_410px]"
              }`}
            >
              <div className="flex min-h-0 flex-col gap-3">
                {audienceView === "overview" && (
                  <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Zuschauerübersicht</div>
                      <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Lostöpfe & Mixed Teams</h2>
                      <p className="mt-1 text-sm font-semibold text-white/40">Wer ist noch im Topf, wer wurde bereits gezogen und welche fünf Gruppenköpfe stehen fest?</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {draw.map((mixedTeam, teamIndex) => {
                        const teamRevealed = mixedTeam.players.filter((player) => revealedIds.has(player.id))
                        return (
                          <article key={mixedTeam.captain.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
                            <div className="border-b border-white/10 bg-black/20 p-3">
                              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-orange-300/80">Mixed Team {teamIndex + 1}</div>
                              <div className="mt-1 flex items-center gap-1.5">
                                <Crown className="h-4 w-4 shrink-0 text-amber-300" />
                                <div className="truncate text-sm font-black sm:text-base">{mixedTeam.captain.name}</div>
                              </div>
                            </div>
                            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white/35">{teamRevealed.length} zugelost</div>
                          </article>
                        )
                      })}
                    </div>

                    <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden sm:grid-cols-5">
                      {teams.map((team) => {
                        const captainId = captainByTeam[team.id]
                        const pool = team.players.filter((player) => selectedIds.has(player.id) && player.id !== captainId)
                        const openPlayers = pool.filter((player) => !revealedIds.has(player.id))
                        return (
                          <article key={team.id} className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                            <div className="border-b border-white/10 p-3">
                              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-orange-300/70">Lostopf</div>
                              <div className="mt-1 flex items-end justify-between gap-2">
                                <div className="text-lg font-black">{team.name}</div>
                                <div className="text-xs font-black text-emerald-300">{openPlayers.length} offen</div>
                              </div>
                            </div>
                            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                              {pool.map((player) => {
                                const drawn = revealedIds.has(player.id)
                                return (
                                  <div key={player.id} className={`rounded-xl border px-2.5 py-2 ${drawn ? "border-white/5 bg-white/[0.02] text-white/25" : "border-white/10 bg-white/[0.055] text-white"}`}>
                                    <div className={`truncate text-xs font-black ${drawn ? "line-through" : ""}`}>{player.name}</div>
                                    <div className="mt-0.5 text-[9px] font-black uppercase tracking-wide">{drawn ? "gezogen" : "im Lostopf"}</div>
                                  </div>
                                )
                              })}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                )}

                {audienceView === "result" && (
                  <div className="flex min-h-0 flex-1 flex-col justify-center gap-5 overflow-hidden">
                    <div className="text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">EMD Mixed Cup</div>
                      <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">DIE MIXED TEAMS</h2>
                      <p className="mt-2 text-sm font-semibold text-white/40">Aktueller Stand der Auslosung</p>
                    </div>
                    <div className="grid min-h-0 grid-cols-2 gap-2 sm:grid-cols-5">
                      {draw.map((mixedTeam, teamIndex) => {
                        const visiblePlayers = livePhase === "finished" ? mixedTeam.players : mixedTeam.players.filter((p) => revealedIds.has(p.id))
                        return (
                          <article key={mixedTeam.captain.id} className="min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
                            <div className="border-b border-white/10 bg-black/20 p-3">
                              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-orange-300/80">Mixed Team {teamIndex + 1}</div>
                              <div className="mt-1 flex items-center gap-1.5">
                                <Crown className="h-4 w-4 shrink-0 text-amber-300" />
                                <div className="truncate text-sm font-black sm:text-base">{mixedTeam.captain.name}</div>
                              </div>
                            </div>
                            <div className="max-h-[56vh] space-y-1 overflow-y-auto p-2">
                              {visiblePlayers.map((player) => (
                                <div key={player.id} className="rounded-xl border border-white/10 bg-white/[0.055] px-2.5 py-2">
                                  <div className="truncate text-xs font-black">{player.name}</div>
                                  <div className="mt-0.5 truncate text-[9px] font-black uppercase tracking-wide text-orange-300/75">{player.source_team_name}</div>
                                </div>
                              ))}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                )}

                {audienceView === "live" && (
                  <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {draw.map((mixedTeam, teamIndex) => {
                    const teamRevealed = mixedTeam.players.filter((player) => revealedIds.has(player.id))
                    const isTarget = livePhase === "revealed" && liveQueue[liveIndex]?.mixedTeamIndex === teamIndex
                    return (
                      <article
                        key={mixedTeam.captain.id}
                        className={`min-w-0 overflow-hidden rounded-2xl border transition-all duration-500 ${
                          isTarget
                            ? "scale-[1.02] border-orange-400 bg-orange-500/10 shadow-[0_0_42px_rgba(249,115,22,0.22)]"
                            : "border-white/10 bg-white/[0.045]"
                        }`}
                      >
                        <div className="border-b border-white/10 bg-black/20 p-3">
                          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-orange-300/80">Mixed Team {teamIndex + 1}</div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <Crown className="h-4 w-4 shrink-0 text-amber-300" />
                            <div className="truncate text-sm font-black sm:text-base">{mixedTeam.captain.name}</div>
                          </div>
                          <div className="mt-1 truncate text-[9px] font-bold uppercase tracking-wide text-white/35">{mixedTeam.captain.team_name}</div>
                        </div>
                        <div className="max-h-[23vh] space-y-1 overflow-y-auto p-2 lg:max-h-[29vh]">
                          {teamRevealed.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-white/10 px-2 py-3 text-center text-[10px] font-bold text-white/25">Noch keine Ziehung</div>
                          ) : (
                            teamRevealed.map((player) => (
                              <div key={player.id} className="rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-2">
                                <div className="truncate text-xs font-black text-white">{player.name}</div>
                                <div className="mt-0.5 truncate text-[9px] font-black uppercase tracking-wide text-orange-300/75">{player.source_team_name}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>

                <div className="relative flex min-h-[280px] flex-1 items-center justify-center overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.025] p-4 text-center sm:min-h-[320px] lg:min-h-0">
                  {livePhase === "finished" ? (
                    <div className="max-w-2xl">
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-emerald-400/30 bg-emerald-400/10">
                        <Trophy className="h-10 w-10 text-emerald-300" />
                      </div>
                      <div className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Auslosung abgeschlossen</div>
                      <h2 className="mt-2 text-4xl font-black tracking-[-0.04em] sm:text-6xl">DIE TEAMS STEHEN!</h2>
                      <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-6 text-white/50 sm:text-base">Alle Teilnehmer wurden den fünf Gruppenköpfen zugelost. Das Ergebnis bleibt weiterhin nur eine Test-Auslosung und wird nicht gespeichert.</p>
                    </div>
                  ) : (
                    <div className="w-full max-w-4xl">
                      <div className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-300">
                        {liveQueue[liveIndex]?.drawStage === "rest"
                          ? `RESTSPIELER · ${liveQueue[liveIndex]?.sourceTeamName}`
                          : `RUNDE ${teamNumber(liveQueue[liveIndex]?.sourceTeamName || "")} · ${liveQueue[liveIndex]?.sourceTeamName}`}
                      </div>
                      <div className="mt-3 text-sm font-black uppercase tracking-[0.16em] text-white/35">Spieler wird gezogen</div>

                      <div className={`mx-auto mt-5 flex min-h-[118px] max-w-3xl items-center justify-center rounded-[26px] border px-4 py-5 transition-all duration-500 ${
                        livePhase === "revealed"
                          ? "border-orange-400/60 bg-orange-500/12 shadow-[0_0_70px_rgba(249,115,22,0.18)]"
                          : "border-white/10 bg-black/20"
                      }`}>
                        <div data-beamer-reel-name className={`break-words text-3xl font-black tracking-[-0.04em] sm:text-5xl xl:text-6xl ${livePhase === "spinning" ? "opacity-70 blur-[0.3px]" : ""}`}>
                          {livePhase === "ready" ? "BEREIT?" : reelName}
                        </div>
                      </div>

                      {livePhase === "revealed" && (
                        <div className="mt-5 animate-in fade-in zoom-in-95 duration-500">
                          <div className="text-xs font-black uppercase tracking-[0.2em] text-white/35">geht zu</div>
                          <div className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-xl font-black text-amber-100 sm:text-2xl">
                            <Crown className="h-5 w-5 text-amber-300" />
                            {draw[liveQueue[liveIndex].mixedTeamIndex]?.captain.name}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                  </>
                )}
              </div>

              {!isStageFullscreen && (
              <aside data-beamer-hide className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045]">
                <div className="border-b border-white/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">Show-Steuerung</div>
                      <div className="mt-1 text-lg font-black">Live-Regie</div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">Zuschauerfenster läuft separat · dort einmal „Vollbild starten“ klicken</div>
                    </div>
                    <Volume2 className="h-5 w-5 text-white/25" />
                  </div>
                </div>

                <div className="border-b border-white/10 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Zuschaueransicht am Beamer</div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAudienceView("overview")}
                      className={`rounded-xl border px-2 py-2 text-[11px] font-black transition ${
                        audienceView === "overview"
                          ? "border-orange-400/50 bg-orange-500/15 text-orange-100"
                          : "border-white/10 bg-white/[0.04] text-white/45 hover:bg-white/[0.08]"
                      }`}
                    >
                      Übersicht
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudienceView("live")}
                      className={`rounded-xl border px-2 py-2 text-[11px] font-black transition ${
                        audienceView === "live"
                          ? "border-orange-400/50 bg-orange-500/15 text-orange-100"
                          : "border-white/10 bg-white/[0.04] text-white/45 hover:bg-white/[0.08]"
                      }`}
                    >
                      Live
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudienceView("result")}
                      className={`rounded-xl border px-2 py-2 text-[11px] font-black transition ${
                        audienceView === "result"
                          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                          : "border-white/10 bg-white/[0.04] text-white/45 hover:bg-white/[0.08]"
                      }`}
                    >
                      Ergebnis
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {livePhase !== "finished" && (
                    <>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Aktueller Lostopf</div>
                        <div className="mt-2 text-2xl font-black">
                          {liveQueue[liveIndex]?.drawStage === "rest" ? "Restspieler" : liveQueue[liveIndex]?.sourceTeamName}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-white/45">
                          {liveQueue[liveIndex]?.drawStage === "rest"
                            ? `Noch ${liveQueue.slice(liveIndex).filter((item) => item.drawStage === "rest").length} Restspieler in der Auslosung.`
                            : `Noch ${liveQueue.slice(liveIndex).filter((item) => item.drawStage === "base" && item.sourceTeamName === liveQueue[liveIndex]?.sourceTeamName).length} Ziehung(en) aus diesem Team.`}
                        </div>
                      </div>

                      <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between text-xs font-bold text-white/45">
                          <span>Gesamtfortschritt</span>
                          <span>{revealedIds.size} / {liveQueue.length}</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-orange-500 transition-all duration-700"
                            style={{ width: `${liveQueue.length ? (revealedIds.size / liveQueue.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {livePhase === "finished" && (
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                      <div className="text-sm font-black text-emerald-200">Show abgeschlossen</div>
                      <p className="mt-1 text-xs font-semibold leading-5 text-emerald-100/55">Du kannst die Show schließen und unten auf der Admin-Seite das vollständige Ergebnis ansehen.</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 p-4">
                  {livePhase !== "finished" ? (
                    <Button
                      onClick={runLiveReveal}
                      disabled={livePhase === "spinning"}
                      className="h-14 w-full rounded-2xl bg-orange-500 text-base font-black text-white shadow-lg shadow-orange-950/30 hover:bg-orange-600 disabled:opacity-50"
                    >
                      {livePhase === "spinning" ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Namen werden gemischt …
                        </>
                      ) : livePhase === "revealed" ? (
                        <>
                          <SkipForward className="mr-2 h-5 w-5" /> Nächster Spieler
                        </>
                      ) : (
                        <>
                          <Dices className="mr-2 h-5 w-5" /> Ziehung starten
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setLiveOpen(false)}
                      className="h-14 w-full rounded-2xl bg-emerald-500 text-base font-black text-white hover:bg-emerald-600"
                    >
                      <Check className="mr-2 h-5 w-5" /> Ergebnis ansehen
                    </Button>
                  )}

                  <div className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.13em] text-white/25">
                    Manuelle Regie · jede Ziehung startet erst auf Klick
                  </div>
                </div>
              </aside>
              )}
            </div>
          </section>
        </div>
      )}
      </main>
    </div>
  )
}
