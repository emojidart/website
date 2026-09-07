"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  History,
  Monitor,
  Pencil,
  Play,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { Header } from "@/components/header"
import { TournamentAdminNav } from "@/components/admin/tournaments/tournament-admin-nav"
import { supabase } from "@/lib/supabase"

type PlayerRow = {
  id: string
  player_id: string
  player_name: string
  active: boolean
  points: number
  games_played: number
  wins: number
  losses: number
  legs_for: number
  legs_against: number
  leg_difference?: number
  position?: number
}

type MatchRow = {
  id: string
  round_id: string
  match_no: number
  score1: number
  score2: number
  winner_team: number | null
  machine_number: number | null
  status: "ready" | "live" | "completed"
  team1_player1_id: string
  team1_player2_id: string
  team2_player1_id: string
  team2_player2_id: string
  updated_at?: string
}

type TournamentRow = {
  id: string
  name: string
  status: "draft" | "active" | "completed" | "cancelled" | string
  current_stage: number
  machine_count: number
  rounds_per_stage: number
}

type StageCut = {
  stage_no: number
  starting_players: number
  qualifying_players: number
  rounds_planned: number
  status: string
}

type PendingResult = {
  match: MatchRow
  score1: number
  score2: number
} | null

type CorrectionResult = {
  match: MatchRow
  score1: number
  score2: number
} | null

type ResultAuditRow = {
  id: string
  match_id: string
  match_no: number
  old_score1: number | null
  old_score2: number | null
  new_score1: number | null
  new_score2: number | null
  change_type: "result_set" | "result_corrected"
  changed_at: string
}

type CutRankingRow = {
  id: string
  player_name: string
  points: number
  leg_difference: number
  legs_for: number
  position: number
}

type TieResolutionState = {
  keep: number
  tiedPlayers: CutRankingRow[]
  automaticAdvancingIds: string[]
  openSlots: number
  mode: "choose" | "stechen" | "draw"
  selectedIds: string[]
  drawLocked: boolean
  drawAuditSaved: boolean
}

type NoticeState = {
  title: string
  message: string
  tone: "info" | "warning" | "error" | "success"
} | null

const VALID_BEST_OF_3 = new Set(["2:0", "2:1", "1:2", "0:2"])

function shuffle<T>(input: T[]) {
  const a = [...input]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join("|")
}

function buildBestDraw(players: PlayerRow[], history: MatchRow[]) {
  const partnerCount = new Map<string, number>()
  const opponentCount = new Map<string, number>()

  const bump = (map: Map<string, number>, a: string, b: string) => {
    const key = pairKey(a, b)
    map.set(key, (map.get(key) || 0) + 1)
  }

  history.forEach((m) => {
    bump(partnerCount, m.team1_player1_id, m.team1_player2_id)
    bump(partnerCount, m.team2_player1_id, m.team2_player2_id)

    const t1 = [m.team1_player1_id, m.team1_player2_id]
    const t2 = [m.team2_player1_id, m.team2_player2_id]
    t1.forEach((a) => t2.forEach((b) => bump(opponentCount, a, b)))
  })

  let best: PlayerRow[] | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (let attempt = 0; attempt < 1200; attempt++) {
    const candidate = shuffle(players)
    let score = 0

    for (let i = 0; i < candidate.length; i += 4) {
      const [a, b, c, d] = candidate.slice(i, i + 4)
      if (!a || !b || !c || !d) continue

      score += (partnerCount.get(pairKey(a.id, b.id)) || 0) * 1000
      score += (partnerCount.get(pairKey(c.id, d.id)) || 0) * 1000

      ;[a, b].forEach((x) => {
        ;[c, d].forEach((y) => {
          score += (opponentCount.get(pairKey(x.id, y.id)) || 0) * 20
        })
      })
    }

    if (score < bestScore) {
      bestScore = score
      best = candidate
      if (score === 0) break
    }
  }

  return best || shuffle(players)
}

function sameCutScore(a: CutRankingRow, b: CutRankingRow) {
  return (
    a.points === b.points &&
    a.leg_difference === b.leg_difference &&
    a.legs_for === b.legs_for
  )
}

function findCutTie(rows: CutRankingRow[], keep: number) {
  if (keep <= 0 || rows.length <= keep) return null

  const boundary = rows[keep - 1]
  if (!boundary) return null

  const firstIndex = rows.findIndex((row) => sameCutScore(row, boundary))
  const tiedPlayers = rows.filter((row) => sameCutScore(row, boundary))
  const lastIndex = firstIndex + tiedPlayers.length - 1

  if (firstIndex < 0 || firstIndex >= keep || lastIndex < keep) return null

  return {
    tiedPlayers,
    automaticAdvancingIds: rows.slice(0, firstIndex).map((row) => row.id),
    openSlots: keep - firstIndex,
  }
}

function secureShuffle<T>(input: T[]) {
  const result = [...input]

  for (let i = result.length - 1; i > 0; i--) {
    let randomValue: number

    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const buffer = new Uint32Array(1)
      crypto.getRandomValues(buffer)
      randomValue = buffer[0] / 4294967296
    } else {
      randomValue = Math.random()
    }

    const j = Math.floor(randomValue * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

export default function SurvivalRouletteLivePage() {
  const router = useRouter()
  const params = useParams<{ tournamentId: string }>()
  const tournamentId = String(params?.tournamentId || "")

  const [tournament, setTournament] = useState<TournamentRow | null>(null)
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [allHistory, setAllHistory] = useState<MatchRow[]>([])
  const [cut, setCut] = useState<StageCut | null>(null)
  const [roundCount, setRoundCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [pendingResult, setPendingResult] = useState<PendingResult>(null)
  const [correctionResult, setCorrectionResult] = useState<CorrectionResult>(null)
  const [resultAudit, setResultAudit] = useState<ResultAuditRow[]>([])
  const [showCutConfirm, setShowCutConfirm] = useState(false)
  const [tieResolution, setTieResolution] = useState<TieResolutionState | null>(null)
  const [finalTieResolution, setFinalTieResolution] = useState<TieResolutionState | null>(null)
  const [finalChampionId, setFinalChampionId] = useState<string | null>(null)
  const [showDeleteTournament, setShowDeleteTournament] = useState(false)
  const [notice, setNotice] = useState<NoticeState>(null)
  const [isOnline, setIsOnline] = useState(true)

  // Intentionally shadows window.alert so all Survival messages use our SaaS modal.
  const alert = (message: string) => {
    let title = "Hinweis"
    let tone: "info" | "warning" | "error" | "success" = "info"

    if (/internet|offline/i.test(message)) {
      title = "Keine Internetverbindung"
      tone = "warning"
    } else if (/ungültig|fehlgeschlagen|konnte nicht|gesperrt|nicht gespeichert/i.test(message)) {
      title = "Aktion nicht möglich"
      tone = "error"
    } else if (/bereits|belegt|erwarteten Zustand|inzwischen|verändert/i.test(message)) {
      title = "Bitte prüfen"
      tone = "warning"
    }

    setNotice({ title, message, tone })
  }

  const cacheKey = `survival_roulette_live_${tournamentId}`

  const saveSnapshot = (snapshot: any) => {
    if (typeof window === "undefined" || !tournamentId) return
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ ...snapshot, cachedAt: new Date().toISOString() }),
    )
  }

  const restoreSnapshot = () => {
    if (typeof window === "undefined" || !tournamentId) return false
    try {
      const raw = localStorage.getItem(cacheKey)
      if (!raw) return false
      const snapshot = JSON.parse(raw)
      if (snapshot.tournament) setTournament(snapshot.tournament)
      if (Array.isArray(snapshot.players)) setPlayers(snapshot.players)
      if (Array.isArray(snapshot.matches)) setMatches(snapshot.matches)
      if (Array.isArray(snapshot.allHistory)) setAllHistory(snapshot.allHistory)
      if (snapshot.cut) setCut(snapshot.cut)
      if (typeof snapshot.roundCount === "number") setRoundCount(snapshot.roundCount)
      return true
    } catch (error) {
      console.warn("[Survival] Live-Snapshot konnte nicht gelesen werden:", error)
      return false
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    const syncOnline = () => setIsOnline(navigator.onLine)
    syncOnline()
    window.addEventListener("online", syncOnline)
    window.addEventListener("offline", syncOnline)
    return () => {
      window.removeEventListener("online", syncOnline)
      window.removeEventListener("offline", syncOnline)
    }
  }, [])

  const load = useCallback(async () => {
    if (!tournamentId) return

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      restoreSnapshot()
      return
    }

    try {
      const { data: t, error: tError } = await supabase
        .from("survival_tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single()

      if (tError || !t) throw tError || new Error("Turnier nicht gefunden")

      const tour = t as TournamentRow

      const [{ data: ranking }, { data: stage }, { data: rounds }, { data: history }] =
        await Promise.all([
          supabase
            .from("survival_ranking")
            .select("*")
            .eq("tournament_id", tournamentId)
            .order("position"),
          supabase
            .from("survival_stage_cuts")
            .select("*")
            .eq("tournament_id", tournamentId)
            .eq("stage_no", tour.current_stage)
            .single(),
          supabase
            .from("survival_rounds")
            .select("id,round_no,status")
            .eq("tournament_id", tournamentId)
            .eq("stage_no", tour.current_stage)
            .order("round_no"),
          supabase
            .from("survival_matches")
            .select("*")
            .eq("tournament_id", tournamentId),
        ])

      const activePlayers = ((ranking || []) as PlayerRow[]).filter((p) => p.active)
      const stageCut = (stage || null) as StageCut | null
      const historyRows = (history || []) as MatchRow[]
      const currentRound =
        (rounds || []).find((r: any) => r.status !== "completed") ||
        (rounds || []).at(-1)

      let currentMatches: MatchRow[] = []
      let auditRows: ResultAuditRow[] = []

      if (currentRound?.id) {
        const { data } = await supabase
          .from("survival_matches")
          .select("*")
          .eq("round_id", currentRound.id)
          .order("match_no")
        currentMatches = (data || []) as MatchRow[]

        if (currentMatches.length > 0) {
          const { data: auditData } = await supabase
            .from("survival_result_audit")
            .select("id,match_id,match_no,old_score1,old_score2,new_score1,new_score2,change_type,changed_at")
            .eq("tournament_id", tournamentId)
            .in("match_id", currentMatches.map((m) => m.id))
            .order("changed_at", { ascending: false })

          auditRows = (auditData || []) as ResultAuditRow[]
        }
      }

      const { data: latestFinalTiebreak } = await supabase
        .from("survival_tiebreaks")
        .select("advancing_player_ids,tied_player_ids,created_at")
        .eq("tournament_id", tournamentId)
        .eq("stage_no", tour.current_stage)
        .eq("open_slots", 1)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const storedChampionId =
        tour.status === "completed" &&
        Array.isArray(latestFinalTiebreak?.advancing_player_ids)
          ? String(latestFinalTiebreak.advancing_player_ids[0] || "")
          : ""

      setTournament(tour)
      setPlayers(activePlayers)
      setFinalChampionId(storedChampionId || null)
      setCut(stageCut)
      setRoundCount((rounds || []).length)
      setAllHistory(historyRows)
      setMatches(currentMatches)
      setResultAudit(auditRows)

      saveSnapshot({
        tournament: tour,
        players: activePlayers,
        matches: currentMatches,
        allHistory: historyRows,
        cut: stageCut,
        roundCount: (rounds || []).length,
      })
    } catch (error) {
      console.error("[Survival] Live-Daten konnten nicht geladen werden:", error)
      restoreSnapshot()
    }
  }, [tournamentId])

  useEffect(() => {
    restoreSnapshot()
    void load()
    if (!tournamentId) return

    const channel = supabase
      .channel(`survival_${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "survival_matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => void load(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "survival_players",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => void load(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "survival_tournaments",
          filter: `id=eq.${tournamentId}`,
        },
        () => void load(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [load, tournamentId])

  const playerById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  )

  const activeMatches = matches.filter((m) => m.status !== "completed")
  const completedMatches = matches.filter((m) => m.status === "completed")
  const correctedMatchIds = new Set(
    resultAudit
      .filter((row) => row.change_type === "result_corrected")
      .map((row) => row.match_id),
  )

  const occupiedMachines = new Set(
    matches
      .filter((m) => m.status === "live" && m.machine_number)
      .map((m) => Number(m.machine_number)),
  )

  const roundFinished =
    matches.length > 0 && matches.every((m) => m.status === "completed")

  // FINAL: the last four still PLAY as doubles, but the tournament
  // always remains an INDIVIDUAL competition. The last BO3 match only adds
  // points/legs to each player; the individual ranking decides the champion.
  const isFinalPhase = players.length === 4
  const finalMatch = isFinalPhase && matches.length === 1 ? matches[0] : null
  const finalMatchCompleted = Boolean(
    isFinalPhase &&
      finalMatch &&
      finalMatch.status === "completed" &&
      finalMatch.winner_team,
  )
  const finalCompleted = Boolean(
    finalMatchCompleted && tournament?.status === "completed",
  )

  const orderedFinalPlayers = [...players].sort(
    (a, b) =>
      (a.position || 999) - (b.position || 999) ||
      b.points - a.points ||
      (b.leg_difference || 0) - (a.leg_difference || 0) ||
      b.legs_for - a.legs_for,
  )

  const championPlayer = finalChampionId
    ? orderedFinalPlayers.find((player) => player.id === finalChampionId) ||
      orderedFinalPlayers[0]
    : orderedFinalPlayers[0]

  const stageReadyForCut = Boolean(
    !isFinalPhase &&
      cut &&
      roundFinished &&
      roundCount >= cut.rounds_planned,
  )

  // Important: old tournaments were created as "active" before a first round existed.
  // So the first round is the actual start condition, not only status === "draft".
  const tournamentStarted =
    Boolean(tournament && tournament.status === "active") ||
    roundCount > 0 ||
    allHistory.length > 0

  const hasAnyRound = roundCount > 0 || allHistory.length > 0

  const createRound = async (isFirstRound: boolean) => {
    if (!navigator.onLine) {
      alert("Keine Internetverbindung. Das Turnier bleibt lokal sichtbar; neue Runden werden erst online erstellt.")
      return
    }

    if (
      !tournament ||
      busy ||
      players.length < 4 ||
      players.length % 4 !== 0
    ) {
      return
    }

    if (!isFirstRound && matches.some((m) => m.status !== "completed")) {
      alert("Die aktuelle Runde ist noch nicht vollständig beendet.")
      return
    }

    if (isFinalPhase && roundCount >= 1) {
      alert("Das Finaldoppel wurde bereits ausgelost. Im Finale bleiben diese beiden Teams fix.")
      return
    }

    setBusy(true)

    try {
      const nextRoundNo = roundCount + 1

      const { data: round, error: roundError } = await supabase
        .from("survival_rounds")
        .insert({
          tournament_id: tournamentId,
          stage_no: tournament.current_stage,
          round_no: nextRoundNo,
          status: "active",
        })
        .select("id")
        .single()

      if (roundError) throw roundError

      const draw = buildBestDraw(players, allHistory)

      const matchRows = []
      for (let i = 0; i < draw.length; i += 4) {
        const matchIndex = i / 4
        matchRows.push({
          tournament_id: tournamentId,
          round_id: round.id,
          match_no: matchIndex + 1,
          team1_player1_id: draw[i].id,
          team1_player2_id: draw[i + 1].id,
          team2_player1_id: draw[i + 2].id,
          team2_player2_id: draw[i + 3].id,
          machine_number: null,
          status: "ready",
          started_at: null,
        })
      }

      const { error } = await supabase
        .from("survival_matches")
        .insert(matchRows)

      if (error) throw error

      await load()
    } catch (error) {
      console.error(error)
      alert(
        isFirstRound
          ? "Runde 1 konnte nicht ausgelost werden."
          : "Neue Roulette-Runde konnte nicht erstellt werden.",
      )
    } finally {
      setBusy(false)
    }
  }

  const assignMachine = async (
    match: MatchRow,
    machineNumber: number | null,
  ) => {
    if (busy) return

    if (!navigator.onLine) {
      alert("Keine Internetverbindung. Automaten können erst wieder online zugewiesen werden.")
      return
    }

    if (!tournament) return

    if (
      machineNumber !== null &&
      (machineNumber < 1 || machineNumber > tournament.machine_count)
    ) {
      alert("Ungültige Automatennummer.")
      return
    }

    setBusy(true)

    try {
      if (machineNumber !== null) {
        const { data: occupied, error: occupiedError } = await supabase
          .from("survival_matches")
          .select("id,match_no")
          .eq("tournament_id", tournamentId)
          .eq("status", "live")
          .eq("machine_number", machineNumber)
          .neq("id", match.id)
          .maybeSingle()

        if (occupiedError) throw occupiedError

        if (occupied) {
          alert(`Automat ${machineNumber} ist bereits bei Match ${occupied.match_no} belegt.`)
          return
        }
      }

      const { error } = await supabase
        .from("survival_matches")
        .update({
          machine_number: machineNumber,
          status: machineNumber === null ? "ready" : "live",
          started_at:
            machineNumber === null ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id)
        .neq("status", "completed")

      if (error) throw error

      await load()
    } catch (error) {
      console.error("[Survival] Automat konnte nicht zugewiesen werden:", error)
      alert("Automat konnte nicht zugewiesen werden.")
    } finally {
      setBusy(false)
    }
  }

  const requestResult = (
    match: MatchRow,
    score1: number,
    score2: number,
  ) => {
    const key = `${score1}:${score2}`

    if (!VALID_BEST_OF_3.has(key)) {
      alert(
        "Ungültiges Ergebnis. Bei Best of 3 sind nur 2:0, 2:1, 1:2 oder 0:2 erlaubt.",
      )
      return
    }

    if (match.status !== "live") {
      alert("Dieses Match ist aktuell nicht auf einem Automaten freigegeben.")
      return
    }

    setPendingResult({ match, score1, score2 })
  }

  const saveConfirmedResult = async () => {
    if (!pendingResult || busy) return
    if (!navigator.onLine) {
      alert("Keine Internetverbindung. Ergebnis wurde NICHT gespeichert. Bitte Verbindung wiederherstellen und erneut bestätigen.")
      return
    }

    const { match, score1, score2 } = pendingResult
    const key = `${score1}:${score2}`

    if (!VALID_BEST_OF_3.has(key)) {
      setPendingResult(null)
      alert("Ungültiges Best-of-3-Ergebnis.")
      return
    }

    setBusy(true)

    try {
      // Re-read before write: prevents accidentally saving over a result
      // that was completed from another device.
      const { data: freshMatch, error: freshError } = await supabase
        .from("survival_matches")
        .select("id,status,machine_number")
        .eq("id", match.id)
        .single()

      if (freshError) throw freshError

      if (!freshMatch || freshMatch.status === "completed") {
        setPendingResult(null)
        alert("Dieses Match wurde bereits abgeschlossen. Bitte Seite aktualisieren.")
        await load()
        return
      }

      const winnerTeam = score1 > score2 ? 1 : 2

      const { error } = await supabase
        .from("survival_matches")
        .update({
          score1,
          score2,
          winner_team: winnerTeam,
          status: "completed",
          completed_at: new Date().toISOString(),
          machine_number: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id)
        .neq("status", "completed")

      if (error) throw error

      await supabase.rpc("survival_recalculate_standings", {
        p_tournament_id: tournamentId,
      })

      const { count: unfinishedCount } = await supabase
        .from("survival_matches")
        .select("id", { count: "exact", head: true })
        .eq("round_id", match.round_id)
        .neq("status", "completed")

      if ((unfinishedCount || 0) === 0) {
        await supabase
          .from("survival_rounds")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", match.round_id)

        if (isFinalPhase) {
          await resolveFinalIndividualWinner()
        }
      }

      setPendingResult(null)
      await load()
    } catch (error) {
      console.error(error)
      alert("Ergebnis konnte nicht gespeichert werden.")
    } finally {
      setBusy(false)
    }
  }

  const requestCorrection = (match: MatchRow) => {
    if (match.status !== "completed") return

    // Normal stages stay locked after a completed cut.
    // The final is different: its one result may still be corrected directly.
    if (!isFinalPhase && cut?.status === "completed") {
      alert("Diese Stage wurde bereits abgeschlossen. Ergebnisse können nach einem Cut nicht mehr geändert werden.")
      return
    }

    setCorrectionResult({
      match,
      score1: match.score1,
      score2: match.score2,
    })
  }

  const chooseCorrectionScore = (score1: number, score2: number) => {
    if (!correctionResult) return
    const key = `${score1}:${score2}`

    if (!VALID_BEST_OF_3.has(key)) {
      alert("Ungültiges Best-of-3-Ergebnis.")
      return
    }

    setCorrectionResult({
      ...correctionResult,
      score1,
      score2,
    })
  }

  const saveCorrection = async () => {
    if (!correctionResult || busy) return

    if (!navigator.onLine) {
      alert("Keine Internetverbindung. Eine Ergebniskorrektur wird offline aus Sicherheitsgründen nicht gespeichert.")
      return
    }

    const { match, score1, score2 } = correctionResult
    const key = `${score1}:${score2}`

    if (!VALID_BEST_OF_3.has(key)) {
      alert("Ungültiges Best-of-3-Ergebnis.")
      return
    }

    if (score1 === match.score1 && score2 === match.score2) {
      setCorrectionResult(null)
      return
    }

    setBusy(true)

    try {
      // Re-check the stage before correcting. Once the cut is completed,
      // the result is locked to preserve the already-decided survivor field.
      const { data: stageState, error: stageError } = await supabase
        .from("survival_stage_cuts")
        .select("status")
        .eq("tournament_id", tournamentId)
        .eq("stage_no", tournament?.current_stage || 1)
        .single()

      if (stageError) throw stageError

      if (stageState?.status === "completed" && !isFinalPhase) {
        setCorrectionResult(null)
        alert("Korrektur gesperrt: Der Cut dieser Stage wurde bereits durchgeführt.")
        await load()
        return
      }

      const { data: freshMatch, error: freshError } = await supabase
        .from("survival_matches")
        .select("id,status,score1,score2,winner_team,updated_at")
        .eq("id", match.id)
        .single()

      if (freshError) throw freshError

      if (!freshMatch || freshMatch.status !== "completed") {
        setCorrectionResult(null)
        alert("Das Match ist nicht mehr im erwarteten Zustand. Bitte Seite neu laden.")
        await load()
        return
      }

      const winnerTeam = score1 > score2 ? 1 : 2
      const nextUpdatedAt = new Date().toISOString()

      let updateQuery = supabase
        .from("survival_matches")
        .update({
          score1,
          score2,
          winner_team: winnerTeam,
          updated_at: nextUpdatedAt,
        })
        .eq("id", match.id)
        .eq("status", "completed")

      // Optimistic concurrency protection: only update the exact version
      // that was just read. A simultaneous admin edit will therefore not
      // silently overwrite another result.
      if (freshMatch.updated_at) {
        updateQuery = updateQuery.eq("updated_at", freshMatch.updated_at)
      }

      const { data: updatedRows, error: updateError } = await updateQuery.select("id")

      if (updateError) throw updateError

      if (!updatedRows || updatedRows.length !== 1) {
        setCorrectionResult(null)
        alert("Das Ergebnis wurde inzwischen auf einem anderen Gerät geändert. Bitte neu laden und erneut prüfen.")
        await load()
        return
      }

      // Important: this RPC rebuilds the entire individual table from all
      // completed matches, so the old result is removed instead of points
      // being added a second time.
      const { error: recalcError } = await supabase.rpc(
        "survival_recalculate_standings",
        { p_tournament_id: tournamentId },
      )

      if (recalcError) throw recalcError

      if (isFinalPhase) {
        await resolveFinalIndividualWinner()
      }

      setCorrectionResult(null)
      await load()
    } catch (error) {
      console.error("[Survival] Ergebniskorrektur fehlgeschlagen:", error)
      alert("Ergebniskorrektur konnte nicht gespeichert werden.")
    } finally {
      setBusy(false)
    }
  }

  const fetchCutRanking = async () => {
    const { data, error } = await supabase
      .from("survival_ranking")
      .select("id,player_name,points,leg_difference,legs_for,position")
      .eq("tournament_id", tournamentId)
      .eq("active", true)
      .order("position")

    if (error) throw error
    return (data || []) as CutRankingRow[]
  }

  const getExactFinalLeaderTie = (rows: CutRankingRow[]) => {
    if (!rows.length) return [] as CutRankingRow[]
    const leader = rows[0]
    return rows.filter(
      (row) =>
        row.points === leader.points &&
        row.leg_difference === leader.leg_difference &&
        row.legs_for === leader.legs_for,
    )
  }

  const openFinalTieDecision = (tiedPlayers: CutRankingRow[]) => {
    setFinalTieResolution({
      keep: 1,
      tiedPlayers,
      automaticAdvancingIds: [],
      openSlots: 1,
      mode: "choose",
      selectedIds: [],
      drawLocked: false,
      drawAuditSaved: false,
    })
  }

  const resolveFinalIndividualWinner = async () => {
    const finalRanking = await fetchCutRanking()
    const tiedLeaders = getExactFinalLeaderTie(finalRanking)

    if (tiedLeaders.length > 1) {
      const { error: reopenError } = await supabase
        .from("survival_tournaments")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", tournamentId)

      if (reopenError) throw reopenError

      setFinalChampionId(null)
      openFinalTieDecision(tiedLeaders)
      return { completed: false, tied: true }
    }

    const championId = finalRanking[0]?.id || null

    if (!championId) {
      throw new Error("Keine gültige Finalrangliste vorhanden.")
    }

    const { error: finalError } = await supabase
      .from("survival_tournaments")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", tournamentId)

    if (finalError) throw finalError

    setFinalChampionId(championId)
    setFinalTieResolution(null)

    return { completed: true, tied: false, championId }
  }

  const requestCutConfirm = async () => {
    if (!stageReadyForCut || !cut || busy) return

    if (!navigator.onLine) {
      alert("Keine Internetverbindung. Der Cut wird aus Sicherheitsgründen erst online durchgeführt.")
      return
    }

    setBusy(true)

    try {
      const rows = await fetchCutRanking()
      const keep = cut.qualifying_players

      if (rows.length <= keep) {
        alert("Es gibt aktuell keine Spieler, die durch diesen Cut ausscheiden würden.")
        return
      }

      const tie = findCutTie(rows, keep)

      if (tie) {
        setShowCutConfirm(false)
        setTieResolution({
          keep,
          tiedPlayers: tie.tiedPlayers,
          automaticAdvancingIds: tie.automaticAdvancingIds,
          openSlots: tie.openSlots,
          mode: "choose",
          selectedIds: [],
          drawLocked: false,
          drawAuditSaved: false,
        })
        return
      }

      setShowCutConfirm(true)
    } catch (error) {
      console.error("[Survival] Cut-Prüfung fehlgeschlagen:", error)
      alert("Cut konnte nicht geprüft werden. Bitte erneut versuchen.")
    } finally {
      setBusy(false)
    }
  }

  const persistTiebreak = async (
    method: "stechen" | "draw",
    state: TieResolutionState,
    advancingIds: string[],
  ) => {
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id

    if (!userId || !tournament) {
      throw new Error("Admin konnte nicht ermittelt werden.")
    }

    const { error } = await supabase
      .from("survival_tiebreaks")
      .insert({
        tournament_id: tournamentId,
        stage_no: tournament.current_stage,
        method,
        open_slots: state.openSlots,
        tied_player_ids: state.tiedPlayers.map((player) => player.id),
        advancing_player_ids: advancingIds,
        created_by: userId,
      })

    if (error) throw error
  }

  const runTieDraw = async () => {
    if (!tieResolution || busy || tieResolution.drawLocked) return

    if (!navigator.onLine) {
      alert("Keine Internetverbindung. Die Auslosung wird erst online durchgeführt, damit die Entscheidung gespeichert werden kann.")
      return
    }

    setBusy(true)

    try {
      const selected = secureShuffle(tieResolution.tiedPlayers)
        .slice(0, tieResolution.openSlots)
        .map((player) => player.id)

      await persistTiebreak("draw", tieResolution, selected)

      setTieResolution({
        ...tieResolution,
        mode: "draw",
        selectedIds: selected,
        drawLocked: true,
        drawAuditSaved: true,
      })
    } catch (error) {
      console.error("[Survival] Cut-Line-Auslosung fehlgeschlagen:", error)
      alert("Auslosung konnte nicht gespeichert werden.")
    } finally {
      setBusy(false)
    }
  }

  const toggleStechenWinner = (playerId: string) => {
    if (!tieResolution || tieResolution.mode !== "stechen") return

    setTieResolution((current) => {
      if (!current) return current
      const alreadySelected = current.selectedIds.includes(playerId)

      if (alreadySelected) {
        return {
          ...current,
          selectedIds: current.selectedIds.filter((id) => id !== playerId),
        }
      }

      if (current.openSlots === 1) {
        return { ...current, selectedIds: [playerId] }
      }

      if (current.selectedIds.length >= current.openSlots) return current

      return { ...current, selectedIds: [...current.selectedIds, playerId] }
    })
  }

  const applyCut = async (
    resolution?: {
      method: "stechen" | "draw"
      tiedPlayerIds: string[]
      advancingPlayerIds: string[]
      auditAlreadySaved?: boolean
    },
  ) => {
    if (!cut || !stageReadyForCut || busy || !tournament) return

    if (!navigator.onLine) {
      alert("Keine Internetverbindung. Der Cut wird aus Sicherheitsgründen erst online durchgeführt.")
      return
    }

    setBusy(true)

    try {
      const rows = await fetchCutRanking()
      const keep = cut.qualifying_players
      if (rows.length <= keep) return

      const tie = findCutTie(rows, keep)
      let advancingIds: string[]

      if (tie) {
        if (!resolution) {
          setShowCutConfirm(false)
          setTieResolution({
            keep,
            tiedPlayers: tie.tiedPlayers,
            automaticAdvancingIds: tie.automaticAdvancingIds,
            openSlots: tie.openSlots,
            mode: "choose",
            selectedIds: [],
            drawLocked: false,
            drawAuditSaved: false,
          })
          return
        }

        const currentTiedIds = new Set(tie.tiedPlayers.map((player) => player.id))
        const resolutionTiedIds = new Set(resolution.tiedPlayerIds)

        if (
          currentTiedIds.size !== resolutionTiedIds.size ||
          [...currentTiedIds].some((id) => !resolutionTiedIds.has(id)) ||
          resolution.advancingPlayerIds.length !== tie.openSlots ||
          resolution.advancingPlayerIds.some((id) => !currentTiedIds.has(id))
        ) {
          setTieResolution(null)
          alert("Die Rangliste hat sich seit der Cut-Line-Entscheidung verändert. Bitte den Cut neu öffnen.")
          await load()
          return
        }

        if (!resolution.auditAlreadySaved) {
          const stateForAudit: TieResolutionState = {
            keep,
            tiedPlayers: tie.tiedPlayers,
            automaticAdvancingIds: tie.automaticAdvancingIds,
            openSlots: tie.openSlots,
            mode: resolution.method,
            selectedIds: resolution.advancingPlayerIds,
            drawLocked: resolution.method === "draw",
            drawAuditSaved: false,
          }
          await persistTiebreak(resolution.method, stateForAudit, resolution.advancingPlayerIds)
        }

        advancingIds = [...tie.automaticAdvancingIds, ...resolution.advancingPlayerIds]
      } else {
        advancingIds = rows.slice(0, keep).map((row) => row.id)
      }

      const advancingSet = new Set(advancingIds)
      const eliminatedIds = rows.filter((row) => !advancingSet.has(row.id)).map((row) => row.id)

      if (eliminatedIds.length) {
        const { error: elimError } = await supabase
          .from("survival_players")
          .update({ active: false, eliminated_stage: tournament.current_stage })
          .in("id", eliminatedIds)
        if (elimError) throw elimError
      }

      const { error: stageCompleteError } = await supabase
        .from("survival_stage_cuts")
        .update({ status: "completed" })
        .eq("tournament_id", tournamentId)
        .eq("stage_no", tournament.current_stage)
      if (stageCompleteError) throw stageCompleteError

      const nextStage = tournament.current_stage + 1
      const { data: nextCut, error: nextCutError } = await supabase
        .from("survival_stage_cuts")
        .select("stage_no")
        .eq("tournament_id", tournamentId)
        .eq("stage_no", nextStage)
        .maybeSingle()
      if (nextCutError) throw nextCutError

      if (nextCut) {
        const { error: activateError } = await supabase
          .from("survival_stage_cuts")
          .update({ status: "active" })
          .eq("tournament_id", tournamentId)
          .eq("stage_no", nextStage)
        if (activateError) throw activateError

        const { error: tournamentError } = await supabase
          .from("survival_tournaments")
          .update({ current_stage: nextStage, updated_at: new Date().toISOString() })
          .eq("id", tournamentId)
        if (tournamentError) throw tournamentError
      } else {
        const { error: completeTournamentError } = await supabase
          .from("survival_tournaments")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", tournamentId)
        if (completeTournamentError) throw completeTournamentError
      }

      setShowCutConfirm(false)
      setTieResolution(null)
      await load()
    } catch (error) {
      console.error("[Survival] Cut fehlgeschlagen:", error)
      alert("Cut konnte nicht durchgeführt werden.")
    } finally {
      setBusy(false)
    }
  }

  const persistFinalChampionDecision = async (
    method: "stechen" | "draw",
    state: TieResolutionState,
    championId: string,
    auditAlreadySaved = false,
  ) => {
    if (!auditAlreadySaved) {
      await persistTiebreak(method, state, [championId])
    }

    const { error } = await supabase
      .from("survival_tournaments")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", tournamentId)

    if (error) throw error

    setFinalChampionId(championId)
    setFinalTieResolution(null)
    await load()
  }

  const runFinalTieDraw = async () => {
    if (!finalTieResolution || busy || finalTieResolution.drawLocked) return

    if (!navigator.onLine) {
      alert("Keine Internetverbindung. Die Sieger-Auslosung kann erst online durchgeführt werden.")
      return
    }

    setBusy(true)

    try {
      const championId =
        secureShuffle(finalTieResolution.tiedPlayers)[0]?.id

      if (!championId) throw new Error("Kein Spieler für die Auslosung vorhanden.")

      await persistTiebreak("draw", finalTieResolution, [championId])

      setFinalTieResolution({
        ...finalTieResolution,
        mode: "draw",
        selectedIds: [championId],
        drawLocked: true,
        drawAuditSaved: true,
      })
    } catch (error) {
      console.error("[Survival] Sieger-Auslosung fehlgeschlagen:", error)
      alert("Sieger konnte nicht ausgelost werden.")
    } finally {
      setBusy(false)
    }
  }

  const toggleFinalStechenWinner = (playerId: string) => {
    if (!finalTieResolution || finalTieResolution.mode !== "stechen") return
    setFinalTieResolution({
      ...finalTieResolution,
      selectedIds: [playerId],
    })
  }

  const deleteCurrentTournament = async () => {
    if (!tournament || busy) return

    if (!navigator.onLine) {
      alert("Keine Internetverbindung. Ein Turnier kann nur online endgültig gelöscht werden.")
      return
    }

    setBusy(true)

    try {
      const { data: deleted, error } = await supabase
        .from("survival_tournaments")
        .delete()
        .eq("id", tournamentId)
        .select("id")

      if (error) throw error

      if (!deleted || deleted.length !== 1) {
        throw new Error("Turnier konnte nicht eindeutig gelöscht werden.")
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem(cacheKey)
        localStorage.removeItem(`survival_roulette_beamer_${tournamentId}`)

        const { data: authData } = await supabase.auth.getUser()
        const userId = authData.user?.id

        if (userId) {
          localStorage.removeItem(`survival_roulette_active_${userId}`)
          localStorage.removeItem(`survival_roulette_draft_${userId}`)
          localStorage.removeItem(`survival_roulette_setup_backup_${userId}`)
        }
      }

      setShowDeleteTournament(false)
      router.replace("/admin/survival-roulette")
    } catch (error) {
      console.error("[Survival] Turnier löschen fehlgeschlagen:", error)
      alert("Turnier konnte nicht gelöscht werden. Es wurden keine anderen Daten gelöscht.")
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (
      !isFinalPhase ||
      !finalMatchCompleted ||
      tournament?.status === "completed" ||
      finalTieResolution
    ) {
      return
    }

    const rows: CutRankingRow[] = orderedFinalPlayers.map((player, index) => ({
      id: player.id,
      player_name: player.player_name,
      points: player.points,
      leg_difference: player.leg_difference || 0,
      legs_for: player.legs_for,
      position: player.position || index + 1,
    }))

    const tiedLeaders = getExactFinalLeaderTie(rows)

    if (tiedLeaders.length > 1) {
      openFinalTieDecision(tiedLeaders)
      return
    }

    // Self-heal a completed final that was left "active" by an older build
    // or by a result correction. If #1 is unique, complete it automatically.
    void resolveFinalIndividualWinner().then(() => load()).catch((error) => {
      console.error("[Survival] Finale konnte nicht automatisch abgeschlossen werden:", error)
    })
  }, [
    finalMatchCompleted,
    finalTieResolution,
    isFinalPhase,
    orderedFinalPlayers,
    tournament?.status,
  ])

  const openBeamer = () => {
    window.open(
      `/survival-roulette/beamer?tournamentId=${tournamentId}`,
      "survival-beamer",
      "popup=yes,width=1600,height=900",
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
      </div>
    )
  }

  const cutPosition = cut?.qualifying_players || 4

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <TournamentAdminNav
        title={tournament.name}
        description="Survival Roulette – Turniersteuerung"
      />

      <main className="mx-auto w-full max-w-[1920px] px-4 py-5 sm:px-6 xl:px-10 2xl:px-12">
        <div className="mb-5 flex flex-col gap-4 rounded-[24px] border border-slate-200/80 bg-slate-950 px-5 py-4 text-white shadow-[0_18px_55px_-42px_rgba(15,23,42,.9)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">
              Survival Roulette
            </div>
            <div className="mt-1 text-xl font-black sm:text-2xl">
              {finalCompleted
                ? "Finale beendet · Einzelsieger steht fest"
                : isFinalPhase
                  ? "FINALE · Einzelwertung"
                  : tournamentStarted
                    ? `Stage ${tournament.current_stage} · Turnier läuft`
                    : "Turnier ist vorbereitet"}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold">
              {players.length} Spieler
            </span>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold">
              {tournament.machine_count} Automaten
            </span>
            <span className="rounded-full border border-orange-300/25 bg-orange-400/10 px-3 py-1.5 text-xs font-bold text-orange-200">
              Best of 3
            </span>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${isOnline ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200" : "border-amber-300/25 bg-amber-400/10 text-amber-200"}`}>
              {isOnline ? "Online" : "Offline · lokale Sicherung"}
            </span>
          </div>
        </div>

        {!hasAnyRound ? (
          <section className="mb-6 overflow-hidden rounded-[28px] border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-white p-5 shadow-[0_18px_55px_-42px_rgba(15,23,42,.45)] lg:p-8">
            <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-600">
                    <Flame className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-base font-black text-slate-950">
                      Turnier gestartet
                    </h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Jetzt Runde 1 auslosen. Erst dabei werden Partner und Gegner festgelegt.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-400">Spieler</div>
                    <div className="mt-1 text-base font-black text-slate-950">{players.length}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-400">Erste Challenge</div>
                    <div className="mt-1 text-base font-black text-slate-950">Top {cutPosition}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-400">Vor erstem Cut</div>
                    <div className="mt-1 text-base font-black text-slate-950">{cut?.rounds_planned || 2} Runden</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void createRound(true)}
                disabled={busy || players.length < 4 || players.length % 4 !== 0}
                className="inline-flex min-w-[230px] items-center justify-center gap-2 rounded-2xl bg-orange-500 px-7 py-4 text-base font-black text-white shadow-lg shadow-orange-500/15 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                <RefreshCw className="h-5 w-5" />
                {busy ? "Lose aus..." : "RUNDE 1 AUSLOSEN"}
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [isFinalPhase ? "Phase" : "Stage", isFinalPhase ? "FINALE" : String(tournament.current_stage)],
                ["Aktiv", `${players.length} Spieler`],
                ["Runden", isFinalPhase ? `${Math.min(roundCount, 1)}/1` : `${roundCount}/${cut?.rounds_planned || 2}`],
                [isFinalPhase ? "Modus" : "Nächster Cut", isFinalPhase ? "Einzelwertung" : `Top ${cutPosition}`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_40px_-32px_rgba(15,23,42,.5)]"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
                    {label}
                  </div>
                  <div className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                    {value}
                  </div>
                </div>
              ))}
            </section>

            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_14px_40px_-32px_rgba(15,23,42,.5)]">
              <span className="text-sm font-black text-slate-900">
                {players.length} Spieler aktiv
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-sm font-bold text-slate-600">
                {isFinalPhase ? "Finale" : `Stage ${tournament.current_stage}`}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-sm font-bold text-slate-600">
                {isFinalPhase ? `Finalmatch ${Math.min(roundCount, 1)}/1` : `Runde ${roundCount}/${cut?.rounds_planned || 2}`}
              </span>
              {stageReadyForCut ? (
                <span className="ml-auto rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700">
                  CUT BEREIT · TOP {cutPosition}
                </span>
              ) : null}
            </div>

            {finalCompleted && championPlayer ? (
              <section className="mb-5 rounded-[24px] border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50 p-5 shadow-[0_18px_55px_-42px_rgba(15,23,42,.45)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">
                      Survival Roulette Sieger
                    </div>
                    <div className="mt-1 text-xl font-black text-slate-950">
                      {championPlayer.player_name}
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-500">
                      Sieger der Einzelwertung
                    </div>
                  </div>
                  <Trophy className="h-9 w-9 text-amber-500" />
                </div>
              </section>
            ) : null}

            <section className="mb-6 flex flex-wrap gap-3">
              {!finalCompleted ? (
                <button
                  type="button"
                  onClick={() => void createRound(false)}
                  disabled={
                    busy ||
                    (!roundFinished && matches.length > 0) ||
                    stageReadyForCut ||
                    (isFinalPhase && roundCount >= 1)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <RefreshCw className="h-4 w-4" />
                  {isFinalPhase
                    ? roundCount >= 1
                      ? "Finale steht fest"
                      : "Finaldoppel auslosen"
                    : "Nächste Roulette-Runde auslosen"}
                </button>
              ) : null}

              {stageReadyForCut ? (
                <button
                  type="button"
                  onClick={requestCutConfirm}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-black text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  <Flame className="h-4 w-4" />
                  Cut durchführen · Top {cutPosition}
                </button>
              ) : null}

              <button
                type="button"
                onClick={openBeamer}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
              >
                <Monitor className="h-4 w-4" />
                Beamer öffnen
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteTournament(true)}
                disabled={busy}
                className="ml-auto inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-5 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                Turnier abbrechen & löschen
              </button>
            </section>

            <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,.65fr)]">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  <Play className="h-4 w-4 text-orange-500" />
                  Aktuelle Runde
                </div>

                {activeMatches.length === 0 ? (
                  <div className="rounded-[24px] border border-slate-200 bg-white p-10 text-center shadow-[0_14px_40px_-32px_rgba(15,23,42,.5)]">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                    <div className="mt-3 font-black text-slate-900">
                      Runde abgeschlossen
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {finalCompleted && championPlayer
                        ? `Turniersieg: ${championPlayer.player_name}`
                        : isFinalPhase
                          ? roundCount >= 1
                            ? "Das Finale steht fest. Dieses Finale entscheidet das Turnier."
                            : "Jetzt einmal die beiden Finaldoppel auslosen."
                          : stageReadyForCut
                            ? "Die Challenge ist beendet. Jetzt den Cut durchführen."
                            : "Die nächste Roulette-Runde kann ausgelost werden."}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {activeMatches.map((m) => {
                      const a =
                        playerById.get(m.team1_player1_id)?.player_name ||
                        "Spieler"
                      const b =
                        playerById.get(m.team1_player2_id)?.player_name ||
                        "Spieler"
                      const c =
                        playerById.get(m.team2_player1_id)?.player_name ||
                        "Spieler"
                      const d =
                        playerById.get(m.team2_player2_id)?.player_name ||
                        "Spieler"

                      return (
                        <article
                          key={m.id}
                          className={`overflow-hidden rounded-[24px] border bg-white shadow-[0_14px_40px_-32px_rgba(15,23,42,.5)] ${
                            m.status === "live"
                              ? "border-emerald-300"
                              : "border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                              Match {m.match_no}
                            </div>

                            <select
                              value={m.machine_number ?? ""}
                              onChange={(event) => {
                                const value = event.target.value
                                void assignMachine(
                                  m,
                                  value ? Number(value) : null,
                                )
                              }}
                              disabled={busy || m.status === "completed"}
                              className={`h-9 rounded-xl border px-3 text-xs font-black outline-none transition ${
                                m.machine_number
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-orange-200 bg-orange-50 text-orange-700"
                              }`}
                            >
                              <option value="">Automat wählen</option>
                              {Array.from(
                                { length: tournament.machine_count },
                                (_, index) => index + 1,
                              ).map((machine) => {
                                const isOccupied =
                                  occupiedMachines.has(machine) &&
                                  m.machine_number !== machine

                                return (
                                  <option
                                    key={machine}
                                    value={machine}
                                    disabled={isOccupied}
                                  >
                                    Automat {machine}
                                    {isOccupied ? " · belegt" : ""}
                                  </option>
                                )
                              })}
                            </select>
                          </div>

                          <div className="grid gap-2 p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                            <div className="rounded-2xl bg-slate-50 p-3 text-center">
                              <div className="font-black text-slate-950">
                                {a}
                              </div>
                              <div className="mt-1 font-black text-orange-600">
                                + {b}
                              </div>
                            </div>

                            <div className="text-center text-[10px] font-black uppercase text-slate-400">
                              VS
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-3 text-center">
                              <div className="font-black text-slate-950">
                                {c}
                              </div>
                              <div className="mt-1 font-black text-orange-600">
                                + {d}
                              </div>
                            </div>
                          </div>

                          {m.status === "ready" ? (
                            <div className="border-t border-slate-100 bg-orange-50/50 px-4 py-3 text-center text-xs font-bold text-orange-700">
                              Bitte zuerst einen Automaten auswählen.
                            </div>
                          ) : null}

                          {m.status === "live" ? (
                            <div className="border-t border-slate-100 px-4 py-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                  Best of 3 · Ergebnis eintragen
                                </div>
                                <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-black uppercase text-orange-600">
                                  mit Bestätigung
                                </span>
                              </div>

                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  [2, 0],
                                  [2, 1],
                                  [1, 2],
                                  [0, 2],
                                ].map(([s1, s2]) => (
                                  <button
                                    key={`${s1}:${s2}`}
                                    type="button"
                                    onClick={() =>
                                      requestResult(m, s1, s2)
                                    }
                                    className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-sm font-black text-slate-800 transition hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700"
                                  >
                                    {s1}:{s2}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                )}
              
              {completedMatches.length > 0 ? (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Abgeschlossene Matches
                    </div>
                    <div className="text-xs font-bold text-slate-400">
                      Korrektur bis zum Cut möglich
                    </div>
                  </div>

                  <div className="grid gap-3 2xl:grid-cols-2">
                    {completedMatches.map((m) => {
                      const a = playerById.get(m.team1_player1_id)?.player_name || "Spieler"
                      const b = playerById.get(m.team1_player2_id)?.player_name || "Spieler"
                      const c = playerById.get(m.team2_player1_id)?.player_name || "Spieler"
                      const d = playerById.get(m.team2_player2_id)?.player_name || "Spieler"
                      const wasCorrected = correctedMatchIds.has(m.id)

                      return (
                        <article
                          key={m.id}
                          className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_36px_-30px_rgba(15,23,42,.45)]"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                Match {m.match_no}
                              </span>
                              {wasCorrected ? (
                                <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-amber-700">
                                  korrigiert
                                </span>
                              ) : null}
                            </div>

                            <div className="rounded-xl bg-slate-950 px-3 py-1.5 text-sm font-black text-white">
                              {m.score1}:{m.score2}
                            </div>
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3">
                            <div className={m.winner_team === 1 ? "font-black text-emerald-700" : "font-bold text-slate-600"}>
                              <div className="truncate">{a}</div>
                              <div className="truncate text-orange-600">+ {b}</div>
                            </div>
                            <div className="text-[10px] font-black text-slate-300">VS</div>
                            <div className={`text-right ${m.winner_team === 2 ? "font-black text-emerald-700" : "font-bold text-slate-600"}`}>
                              <div className="truncate">{c}</div>
                              <div className="truncate text-orange-600">+ {d}</div>
                            </div>
                          </div>

                          <div className="border-t border-slate-100 px-4 py-2.5">
                            <button
                              type="button"
                              onClick={() => requestCorrection(m)}
                              disabled={busy || cut?.status === "completed"}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Ergebnis korrigieren
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>

                  {resultAudit.some((row) => row.change_type === "result_corrected") ? (
                    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                      <History className="h-4 w-4 text-slate-400" />
                      Ergebniskorrekturen werden mit altem/neuem Ergebnis und Zeitpunkt in Supabase protokolliert.
                    </div>
                  ) : null}
                </div>
              ) : null}
              </div>

              <aside className="min-w-0 xl:sticky xl:top-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    <Trophy className="h-4 w-4 text-orange-500" />
                    Survival Ranking
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    Cut: Top {cutPosition}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_40px_-32px_rgba(15,23,42,.5)]">
                  {players.map((p, index) => (
                    <div key={p.id}>
                      {index === cutPosition ? (
                        <div className="bg-rose-600 px-3 py-1 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white">
                          Cut Line
                        </div>
                      ) : null}

                      <div
                        className={`grid grid-cols-[36px_1fr_46px_52px] items-center gap-2 border-b border-slate-100 px-3 py-2.5 ${
                          index < cutPosition
                            ? "bg-white"
                            : "bg-rose-50/50"
                        }`}
                      >
                        <div className="text-sm font-black text-slate-400">
                          {index + 1}.
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-slate-900">
                            {p.player_name}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-400">
                            {p.wins} S · {p.losses} N · Legs {p.legs_for}:
                            {p.legs_against}
                          </div>
                        </div>

                        <div className="text-center text-sm font-black text-slate-950">
                          {p.points}
                        </div>

                        <div className="text-right text-xs font-black text-slate-500">
                          {p.legs_for - p.legs_against >= 0 ? "+" : ""}
                          {p.legs_for - p.legs_against}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </section>
          </>
        )}
      </main>

      {finalTieResolution ? (
        <div className="fixed inset-0 z-[145] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,.7)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-lg font-black text-slate-950">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Sieger entscheiden
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Vollständiger Gleichstand auf Platz 1
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-5 text-amber-900">
                Diese Spieler sind bei Punkten, Leg-Differenz und gewonnenen Legs komplett gleich. Der Admin entscheidet jetzt zwischen Stechen und Auslosung.
              </div>

              <div className="mt-4 space-y-2">
                {finalTieResolution.tiedPlayers.map((player) => {
                  const selected = finalTieResolution.selectedIds.includes(player.id)
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() =>
                        finalTieResolution.mode === "stechen" &&
                        toggleFinalStechenWinner(player.id)
                      }
                      disabled={finalTieResolution.mode !== "stechen" || busy}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
                        selected
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div>
                        <div className="font-black text-slate-950">{player.player_name}</div>
                        <div className="mt-0.5 text-xs font-semibold text-slate-400">
                          {player.points} P · Leg-Diff {player.leg_difference >= 0 ? "+" : ""}
                          {player.leg_difference} · {player.legs_for} Legs
                        </div>
                      </div>
                      {selected ? (
                        <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase text-white">
                          Sieger
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              {finalTieResolution.mode === "choose" ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFinalTieResolution({
                        ...finalTieResolution,
                        mode: "stechen",
                        selectedIds: [],
                      })
                    }
                    className="rounded-2xl border-2 border-slate-200 p-4 text-left hover:border-orange-300 hover:bg-orange-50"
                  >
                    <div className="font-black text-slate-950">Stechen</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Entscheidungs-Leg spielen und danach den Sieger markieren.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFinalTieResolution({
                        ...finalTieResolution,
                        mode: "draw",
                        selectedIds: [],
                      })
                    }
                    className="rounded-2xl border-2 border-slate-200 p-4 text-left hover:border-violet-300 hover:bg-violet-50"
                  >
                    <div className="font-black text-slate-950">Auslosung</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Die App lost einen Turniersieger aus.
                    </div>
                  </button>
                </div>
              ) : null}

              {finalTieResolution.mode === "stechen" ? (
                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFinalTieResolution({
                        ...finalTieResolution,
                        mode: "choose",
                        selectedIds: [],
                      })
                    }
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700"
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    disabled={busy || finalTieResolution.selectedIds.length !== 1}
                    onClick={() =>
                      void persistFinalChampionDecision(
                        "stechen",
                        finalTieResolution,
                        finalTieResolution.selectedIds[0],
                      )
                    }
                    className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-black text-white disabled:bg-slate-300"
                  >
                    Sieger bestätigen
                  </button>
                </div>
              ) : null}

              {finalTieResolution.mode === "draw" ? (
                <div className="mt-5">
                  {!finalTieResolution.drawLocked ? (
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setFinalTieResolution({
                            ...finalTieResolution,
                            mode: "choose",
                            selectedIds: [],
                          })
                        }
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700"
                      >
                        Zurück
                      </button>
                      <button
                        type="button"
                        onClick={() => void runFinalTieDraw()}
                        disabled={busy}
                        className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
                      >
                        Jetzt auslosen
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-center">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-violet-500">
                        Ausgelost
                      </div>
                      <div className="mt-2 text-lg font-black text-violet-950">
                        {finalTieResolution.tiedPlayers.find(
                          (player) => player.id === finalTieResolution.selectedIds[0],
                        )?.player_name}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void persistFinalChampionDecision(
                            "draw",
                            finalTieResolution,
                            finalTieResolution.selectedIds[0],
                            true,
                          )
                        }
                        disabled={busy}
                        className="mt-4 w-full rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white"
                      >
                        Turniersieger übernehmen
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {tieResolution ? (
        <div className="fixed inset-0 z-[135] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,.7)]">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-base font-black text-slate-950">
                  <Flame className="h-5 w-5 text-rose-600" />
                  Cut-Line Showdown
                </div>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Komplett gleicher Stand · Entscheidung direkt in der App
                </p>
              </div>

              {!tieResolution.drawLocked ? (
                <button
                  type="button"
                  onClick={() => setTieResolution(null)}
                  disabled={busy}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : null}
            </div>

            <div className="p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Punktgleich</div>
                  <div className="mt-1 text-base font-black text-slate-950">{tieResolution.tiedPlayers.length}</div>
                </div>
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-500">Offene Plätze</div>
                  <div className="mt-1 text-base font-black text-slate-950">{tieResolution.openSlots}</div>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-500">Cut</div>
                  <div className="mt-1 text-base font-black text-slate-950">Top {tieResolution.keep}</div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-center">
                <div className="text-base font-black text-violet-950">
                  {tieResolution.openSlots} von {tieResolution.tiedPlayers.length} {tieResolution.openSlots === 1 ? "kommt" : "kommen"} weiter
                </div>
                <div className="mt-1 text-xs font-bold text-violet-700">
                  {tieResolution.tiedPlayers.length - tieResolution.openSlots} {tieResolution.tiedPlayers.length - tieResolution.openSlots === 1 ? "Spieler scheidet" : "Spieler scheiden"} aus
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                {tieResolution.tiedPlayers.map((player) => {
                  const selected = tieResolution.selectedIds.includes(player.id)
                  const selectable = tieResolution.mode === "stechen"
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => selectable && toggleStechenWinner(player.id)}
                      disabled={!selectable || busy}
                      className={`grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 ${
                        selected ? "bg-emerald-50" : selectable ? "bg-white hover:bg-slate-50" : "bg-white"
                      }`}
                    >
                      <div>
                        <div className={`font-black ${selected ? "text-emerald-800" : "text-slate-900"}`}>
                          {player.player_name}
                        </div>
                        <div className="mt-0.5 text-xs font-semibold text-slate-400">
                          {player.points} P · Leg-Diff {player.leg_difference >= 0 ? "+" : ""}{player.leg_difference} · {player.legs_for} Legs gewonnen
                        </div>
                      </div>
                      {selected ? (
                        <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase text-white">Weiter</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              {tieResolution.mode === "choose" ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setTieResolution({ ...tieResolution, mode: "stechen", selectedIds: [] })}
                    className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-left transition hover:border-orange-300 hover:bg-orange-50/40"
                  >
                    <div className="text-base font-black text-slate-950">Stechen</div>
                    <div className="mt-1 text-sm font-medium leading-5 text-slate-500">
                      Entscheidungs-Stechen spielen. Danach hier genau {tieResolution.openSlots === 1 ? "den Gewinner" : `${tieResolution.openSlots} Gewinner`} markieren.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTieResolution({ ...tieResolution, mode: "draw", selectedIds: [], drawLocked: false, drawAuditSaved: false })}
                    className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-left transition hover:border-violet-300 hover:bg-violet-50/40"
                  >
                    <div className="text-base font-black text-slate-950">Auslosung</div>
                    <div className="mt-1 text-sm font-medium leading-5 text-slate-500">
                      Die App lost zufällig genau {tieResolution.openSlots === 1 ? "einen Spieler" : `${tieResolution.openSlots} Spieler`} weiter.
                    </div>
                  </button>
                </div>
              ) : null}

              {tieResolution.mode === "stechen" ? (
                <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <div className="font-black text-orange-900">Stechen spielen</div>
                  <div className="mt-1 text-sm font-medium text-orange-800">
                    Empfehlung: 1 Entscheidungs-Leg 501 DO. Danach {tieResolution.openSlots === 1 ? "den Sieger" : `genau ${tieResolution.openSlots} Sieger`} oben markieren.
                  </div>
                  <div className="mt-4 flex flex-wrap justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setTieResolution({ ...tieResolution, mode: "choose", selectedIds: [] })}
                      disabled={busy}
                      className="rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-black text-orange-800"
                    >Zurück</button>
                    <button
                      type="button"
                      onClick={() => void applyCut({
                        method: "stechen",
                        tiedPlayerIds: tieResolution.tiedPlayers.map((player) => player.id),
                        advancingPlayerIds: tieResolution.selectedIds,
                      })}
                      disabled={busy || tieResolution.selectedIds.length !== tieResolution.openSlots}
                      className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-black text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {busy ? "Speichert..." : "Stechen bestätigen & Cut durchführen"}
                    </button>
                  </div>
                </div>
              ) : null}

              {tieResolution.mode === "draw" ? (
                <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  {!tieResolution.drawLocked ? (
                    <>
                      <div className="font-black text-violet-950">Zufällige Entscheidung</div>
                      <div className="mt-1 text-sm font-medium text-violet-800">
                        Nach „Jetzt auslosen“ wird das Ergebnis sofort gespeichert und kann nicht einfach neu gewürfelt werden.
                      </div>
                      <div className="mt-4 flex flex-wrap justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setTieResolution({ ...tieResolution, mode: "choose", selectedIds: [] })}
                          disabled={busy}
                          className="rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-black text-violet-800"
                        >Zurück</button>
                        <button
                          type="button"
                          onClick={() => void runTieDraw()}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-50"
                        >
                          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                          Jetzt auslosen
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center">
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">Ausgelost</div>
                        <div className="mt-2 text-base font-black text-violet-950">
                          {tieResolution.selectedIds
                            .map((id) => tieResolution.tiedPlayers.find((player) => player.id === id)?.player_name)
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void applyCut({
                          method: "draw",
                          tiedPlayerIds: tieResolution.tiedPlayers.map((player) => player.id),
                          advancingPlayerIds: tieResolution.selectedIds,
                          auditAlreadySaved: tieResolution.drawAuditSaved,
                        })}
                        disabled={busy}
                        className="mt-4 w-full rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        {busy ? "Cut wird durchgeführt..." : `Auslosung übernehmen · Top ${tieResolution.keep}`}
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteTournament && tournament ? (
        <div className="fixed inset-0 z-[165] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,.75)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-rose-600">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">Turnier abbrechen & löschen?</h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">{tournament.name}</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-800">
                Möchtest du dieses Survival-Turnier wirklich löschen? Alle dazugehörigen Spieler, Runden und Ergebnisse werden entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Aktueller Stand</div>
                <div className="mt-1 text-base font-black text-slate-950">Stage {tournament.current_stage} · {players.length} aktive Spieler</div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setShowDeleteTournament(false)} disabled={busy} className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40">Abbrechen</button>
                <button type="button" onClick={() => void deleteCurrentTournament()} disabled={busy} className="rounded-xl bg-rose-600 px-4 py-3 font-black text-white hover:bg-rose-700 disabled:opacity-50">{busy ? "Wird gelöscht..." : "Turnier endgültig löschen"}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="fixed inset-0 z-[170] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,.7)]">
            <div className="px-6 pb-2 pt-6">
              <div className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ${
                notice.tone === "error" ? "bg-rose-100 text-rose-600" :
                notice.tone === "warning" ? "bg-amber-100 text-amber-600" :
                notice.tone === "success" ? "bg-emerald-100 text-emerald-600" :
                "bg-sky-100 text-sky-600"
              }`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-center text-base font-black text-slate-950">{notice.title}</h3>
              <p className="mt-2 whitespace-pre-line text-center text-sm font-medium leading-6 text-slate-500">{notice.message}</p>
            </div>
            <div className="p-5 pt-4">
              <button type="button" onClick={() => setNotice(null)} className="w-full rounded-xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-slate-800">OK</button>
            </div>
          </div>
        </div>
      ) : null}

      {correctionResult ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,.7)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-base font-black text-slate-950">
                  <Pencil className="h-5 w-5 text-orange-500" />
                  Ergebnis korrigieren
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {isFinalPhase
                    ? "Finalergebnis ändern · Einzelrangliste wird automatisch neu berechnet"
                    : `Match ${correctionResult.match.match_no} · Änderung wird protokolliert`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCorrectionResult(null)}
                disabled={busy}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-center">
                  <div className="text-[10px] font-black uppercase text-slate-400">Bisher</div>
                  <div className="mt-1 text-2xl font-black text-slate-600">
                    {correctionResult.match.score1}:{correctionResult.match.score2}
                  </div>
                </div>
                <div className="text-slate-300">→</div>
                <div className="text-center">
                  <div className="text-[10px] font-black uppercase text-orange-500">Neu</div>
                  <div className="mt-1 text-xl font-black text-slate-950">
                    {correctionResult.score1}:{correctionResult.score2}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Richtiges Best-of-3-Ergebnis wählen
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    [2, 0],
                    [2, 1],
                    [1, 2],
                    [0, 2],
                  ].map(([s1, s2]) => {
                    const selected =
                      correctionResult.score1 === s1 &&
                      correctionResult.score2 === s2

                    return (
                      <button
                        key={`${s1}:${s2}`}
                        type="button"
                        onClick={() => chooseCorrectionScore(s1, s2)}
                        disabled={busy}
                        className={`rounded-xl border px-3 py-3 text-sm font-black transition ${
                          selected
                            ? "border-orange-400 bg-orange-50 text-orange-700 ring-2 ring-orange-100"
                            : "border-slate-200 bg-white text-slate-700 hover:border-orange-300"
                        }`}
                      >
                        {s1}:{s2}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {isFinalPhase
                  ? "Nach dem Speichern wird die komplette Einzelrangliste neu berechnet. Bei einem vollständigen Gleichstand um Platz 1 muss der Sieger erneut durch Stechen oder Auslosung entschieden werden."
                  : "Nach dem Speichern wird die komplette Survival-Rangliste aus allen fertigen Matches neu berechnet. Nach einem bereits durchgeführten Cut ist eine Korrektur gesperrt."}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCorrectionResult(null)}
                  disabled={busy}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => void saveCorrection()}
                  disabled={
                    busy ||
                    (correctionResult.score1 === correctionResult.match.score1 &&
                      correctionResult.score2 === correctionResult.match.score2)
                  }
                  className="rounded-xl bg-orange-500 px-4 py-3 font-black text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {busy ? "Speichert..." : "Korrektur speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showCutConfirm && cut ? (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,.7)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2 text-base font-black text-slate-950">
                <Flame className="h-5 w-5 text-rose-600" />
                Cut durchführen?
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Diese Stage wird abgeschlossen.
              </p>
            </div>

            <div className="p-5">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-rose-600">
                  Nächste Stage
                </div>
                <div className="mt-2 text-xl font-black text-slate-950">
                  Top {cut.qualifying_players}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-600">
                  {Math.max(0, players.length - cut.qualifying_players)} Spieler scheiden aus
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowCutConfirm(false)}
                  disabled={busy}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => void applyCut()}
                  disabled={busy}
                  className="rounded-xl bg-rose-600 px-4 py-3 font-black text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {busy ? "Wird durchgeführt..." : `Top ${cut.qualifying_players} bestätigen`}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendingResult ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,.7)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2 font-black text-slate-950">
                <ShieldCheck className="h-5 w-5 text-orange-500" />
                Ergebnis bestätigen
              </div>

              <button
                type="button"
                onClick={() => setPendingResult(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-center">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">
                  Best of 3
                </div>
                <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {pendingResult.score1}:{pendingResult.score2}
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                Bitte Ergebnis kontrollieren. Erst mit „Ergebnis speichern“ wird die Rangliste aktualisiert.
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPendingResult(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-700 hover:bg-slate-50"
                >
                  Abbrechen
                </button>

                <button
                  type="button"
                  onClick={() => void saveConfirmedResult()}
                  disabled={busy}
                  className="rounded-xl bg-orange-500 px-4 py-3 font-black text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  Ergebnis speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
