"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { VsIntroOverlay } from "@/components/vs-intro-overlay"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RotateCcw, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import { useSpeechAnnouncer } from "@/components/speech-announcer"

interface Match {
  id: number
  player1: string
  player2: string
  score1: number
  score2: number
  winner?: string
  loser?: string
  machineNumber?: number
  callCount?: number
}

interface TournamentBracketProps {
  bracketSize?: 64
  tournamentType?: string
}

interface Ranking {
  player_name: string
  placement: number
  eliminated_at: string
}

type SlotTarget = { matchId: number; position: 1 | 2 }
type ProgressionEntry = { winner: SlotTarget | null; loser: SlotTarget | null }
type Section = {
  key: string
  title: string
  ids: number[]
  isLoser?: boolean
  isFinal?: boolean
  isReset?: boolean
}

type Structure = {
  firstRoundIds: number[]
  finalId: number
  resetId: number
  winnersFinalId: number
  losersFinalId: number
  progressionMap: Record<number, ProgressionEntry>
  allMatchIds: number[]
  sections: Section[]
  sectionByMatchId: Record<number, string>
}

const isFreilos = (playerName: string): boolean => {
  return (playerName || "").startsWith("Freilos")
}

const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const saveMatchStatesToDatabase = async (
  matches: Record<number, Match>,
  tournamentType: string,
  tournamentId: string,
  playerIdMap: Record<string, string>,
) => {
  const getId = (name: string) => {
    const key = (name ?? "").toLowerCase().trim()
    if (!key || key.startsWith("freilos")) return null
    return playerIdMap[key] ?? null
  }

  try {
    const matchStates = Object.values(matches).map((match) => ({
      tournament_type: tournamentType,
      tournament_id: tournamentId,
      match_id: match.id,
      player1: match.player1,
      player2: match.player2,
      player1_id: getId(match.player1),
      player2_id: getId(match.player2),
      score1: match.score1,
      score2: match.score2,
      winner: match.winner || null,
      loser: match.loser || null,
      machine_number: match.machineNumber || null,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from("dko_match_states").upsert(matchStates, {
      onConflict: "tournament_type,tournament_id,match_id",
    })

    if (error) throw error
  } catch (error) {
    console.error("Fehler beim Speichern der Match-States:", error)
  }
}

const loadMatchStatesFromDatabase = async (
  tournamentType: string,
  tournamentId: string,
): Promise<Record<number, Match> | null> => {
  try {
    const { data, error } = await supabase
      .from("dko_match_states")
      .select("*")
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)
      .order("match_id", { ascending: true })

    if (error) throw error
    if (!data || data.length === 0) return null

    const matches: Record<number, Match> = {}
    data.forEach((state) => {
      matches[state.match_id] = {
        id: state.match_id,
        player1: state.player1 || "",
        player2: state.player2 || "",
        score1: state.score1 || 0,
        score2: state.score2 || 0,
        winner: state.winner || undefined,
        loser: state.loser || undefined,
        machineNumber: state.machine_number || undefined,
        callCount: state.machine_number ? 1 : undefined,
      }
    })

    return matches
  } catch (error) {
    console.error("Fehler beim Laden der Match-States:", error)
    return null
  }
}

const deleteMatchStatesFromDatabase = async (tournamentType: string, tournamentId: string) => {
  try {
    const { error } = await supabase
      .from("dko_match_states")
      .delete()
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)

    if (error) throw error
  } catch (error) {
    console.error("Fehler beim Löschen der Match-States:", error)
  }
}

const deleteRankingsFromDatabase = async (tournamentType: string, tournamentId: string) => {
  try {
    const { error } = await supabase
      .from("dko_rankings")
      .delete()
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)

    if (error) throw error
  } catch (error) {
    console.error("Fehler beim Löschen der Rankings:", error)
  }
}

const deleteFreiloseFromDatabase = async (tournamentType: string, tournamentId: string) => {
  try {
    const { error } = await supabase
      .from("tournament_freilose")
      .delete()
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)

    if (error) throw error
  } catch (error) {
    console.error("Fehler beim Löschen der Freilose:", error)
  }
}

const clearTournamentRegistration = async () => {
  try {
    const { error } = await supabase.from("dko_tournament_registration").delete().neq("id", 0)
    if (error) throw error
  } catch (error) {
    console.error("Fehler beim Löschen der Registrierung:", error)
  }
}

const saveFreiloseToDatabase = async (freilose: string[], tournamentType: string, tournamentId: string) => {
  try {
    const freilosData = freilose.map((name, index) => ({
      tournament_type: tournamentType,
      tournament_id: tournamentId,
      freilos_name: name,
      position: index,
    }))

    const { error } = await supabase.from("tournament_freilose").upsert(freilosData, {
      onConflict: "tournament_type,tournament_id,position",
    })

    if (error) throw error
  } catch (error) {
    console.error("Fehler beim Speichern der Freilose:", error)
  }
}

const loadFreiloseFromDatabase = async (tournamentType: string, tournamentId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("tournament_freilose")
      .select("freilos_name, position")
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)
      .order("position", { ascending: true })

    if (error) throw error
    return data ? data.map((f) => f.freilos_name) : []
  } catch (error) {
    console.error("Fehler beim Laden der Freilose:", error)
    return []
  }
}

const markTournamentAsCompleted = async (tournamentId: string) => {
  try {
    const { error } = await supabase
      .from("tournaments_status")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("tournament_id", tournamentId)

    if (error) throw error
  } catch (error) {
    console.error("Fehler beim Markieren des Turniers als abgeschlossen:", error)
  }
}

const markTournamentAsCancelled = async (tournamentId: string) => {
  try {
    const { error } = await supabase
      .from("tournaments_status")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("tournament_id", tournamentId)

    if (error) throw error
  } catch (error) {
    console.error("Fehler beim Markieren des Turniers als abgebrochen:", error)
  }
}

const distributePlayersWithFreilose = (players: string[], bracketSize: number): string[] => {
  const totalSlots = bracketSize
  const freilosCount = totalSlots - players.length
  const shuffledPlayers = shuffle(players)

  if (freilosCount <= 0) return shuffledPlayers

  const freilose = Array.from({ length: freilosCount }, (_, i) => `Freilos ${i + 1}`)
  const result: string[] = []
  const realPlayers = [...shuffledPlayers]
  const byes = [...freilose]

  while (byes.length > 0 && realPlayers.length > 0) {
    const player = realPlayers.pop()!
    const freilos = byes.pop()!
    if (Math.random() > 0.5) {
      result.push(player, freilos)
    } else {
      result.push(freilos, player)
    }
  }

  while (realPlayers.length >= 2) {
    result.push(realPlayers.pop()!, realPlayers.pop()!)
  }

  if (byes.length > 0) {
    console.error("Fehler: Übrig gebliebene Freilose. Das darf nicht passieren.", byes)
  }

  return result
}

const getPlacementForEliminationMatch = (matchId: number, bracketSize: number): number => {
  if (bracketSize === 64) {
    if (matchId >= 33 && matchId <= 48) return 49
    if (matchId >= 65 && matchId <= 80) return 33
    if (matchId >= 81 && matchId <= 88) return 25
    if (matchId >= 97 && matchId <= 104) return 17
    if (matchId >= 105 && matchId <= 108) return 13
    if (matchId >= 113 && matchId <= 116) return 9
    if (matchId === 117 || matchId === 118) return 7
    if (matchId === 121 || matchId === 122) return 5
    if (matchId === 123) return 4
    if (matchId === 125) return 3
    if (matchId === 126 || matchId === 127) return 2
  }

  console.warn(`[v0] Unknown elimination match ${matchId}, using fallback placement`)
  return bracketSize
}

const buildStructure = (size: number): Structure => {
  const k = Math.log2(size)
  if (!Number.isInteger(k) || size !== 64) {
    throw new Error("Diese Datei ist für einen 64er-DKO-Plan ausgelegt.")
  }

  let nextId = 1
  const createRange = (count: number) => Array.from({ length: count }, () => nextId++)

  const winnersRounds: number[][] = []
  const loserRounds: number[][] = []

  const wr1 = createRange(size / 2)
  winnersRounds.push(wr1)
  const lr1 = createRange(size / 4)
  loserRounds.push(lr1)
  const wr2 = createRange(size / 4)
  winnersRounds.push(wr2)

  for (let r = 3; r <= k; r++) {
    loserRounds.push(createRange(size / 2 ** (r - 1)))
    loserRounds.push(createRange(size / 2 ** r))
    winnersRounds.push(createRange(size / 2 ** r))
  }

  const losersFinal = createRange(1)
  loserRounds.push(losersFinal)
  const grandFinal = createRange(1)
  const reset = createRange(1)

  const progressionMap: Record<number, ProgressionEntry> = {}

  const pairToNextRound = (source: number[], target: number[]) => {
    source.forEach((matchId, i) => {
      const targetMatchId = target[Math.floor(i / 2)]
      const position: 1 | 2 = i % 2 === 0 ? 1 : 2
      progressionMap[matchId] = progressionMap[matchId] || { winner: null, loser: null }
      progressionMap[matchId].winner = { matchId: targetMatchId, position }
    })
  }

  const winnersToLoserRoundReversed = (source: number[], target: number[]) => {
    source.forEach((matchId, i) => {
      const targetMatchId = target[target.length - 1 - i]
      progressionMap[matchId] = progressionMap[matchId] || { winner: null, loser: null }
      progressionMap[matchId].loser = { matchId: targetMatchId, position: 2 }
    })
  }

  wr1.forEach((matchId, i) => {
    progressionMap[matchId] = {
      winner: { matchId: wr2[Math.floor(i / 2)], position: i % 2 === 0 ? 1 : 2 },
      loser: { matchId: lr1[Math.floor(i / 2)], position: i % 2 === 0 ? 1 : 2 },
    }
  })

  lr1.forEach((matchId, i) => {
    progressionMap[matchId] = {
      winner: { matchId: loserRounds[1][i], position: 1 },
      loser: null,
    }
  })

  winnersToLoserRoundReversed(wr2, loserRounds[1])
  pairToNextRound(wr2, winnersRounds[2])

  for (let r = 2; r <= k - 2; r++) {
    const oddLoserRound = loserRounds[2 * r - 3]
    const evenLoserRound = loserRounds[2 * r - 2]
    const currentWinnerRound = winnersRounds[r]
    const nextWinnerRound = winnersRounds[r + 1]

    oddLoserRound.forEach((matchId, i) => {
      progressionMap[matchId] = {
        winner: {
          matchId: evenLoserRound[Math.floor(i / 2)],
          position: i % 2 === 0 ? 1 : 2,
        },
        loser: null,
      }
    })

    currentWinnerRound.forEach((matchId, i) => {
      progressionMap[matchId] = progressionMap[matchId] || { winner: null, loser: null }
      progressionMap[matchId].winner = {
        matchId: nextWinnerRound[Math.floor(i / 2)],
        position: i % 2 === 0 ? 1 : 2,
      }
      progressionMap[matchId].loser = {
        matchId: evenLoserRound[evenLoserRound.length - 1 - i],
        position: 2,
      }
    })
  }

  const lrBeforeLosersFinal = loserRounds[loserRounds.length - 2]
  lrBeforeLosersFinal.forEach((matchId, i) => {
    progressionMap[matchId] = {
      winner: { matchId: losersFinal[0], position: i === 0 ? 1 : 2 },
      loser: null,
    }
  })

  const winnersFinal = winnersRounds[winnersRounds.length - 1]
  progressionMap[winnersFinal[0]] = {
    winner: { matchId: grandFinal[0], position: 1 },
    loser: { matchId: losersFinal[0], position: 2 },
  }

  progressionMap[losersFinal[0]] = {
    winner: { matchId: grandFinal[0], position: 2 },
    loser: null,
  }
  progressionMap[grandFinal[0]] = { winner: null, loser: null }
  progressionMap[reset[0]] = { winner: null, loser: null }

  const sections: Section[] = [
    { key: "wr1", title: "Runde 1", ids: winnersRounds[0] },
    { key: "lr1", title: "Verlierer-Runde 1", ids: loserRounds[0], isLoser: true },
    { key: "wr2", title: "Runde 2", ids: winnersRounds[1] },
    { key: "lr2", title: "Verlierer-Runde 2", ids: loserRounds[1], isLoser: true },
    { key: "lr3", title: "Verlierer-Runde 3", ids: loserRounds[2], isLoser: true },
    { key: "wr3", title: "Runde 3", ids: winnersRounds[2] },
    { key: "lr4", title: "Verlierer-Runde 4", ids: loserRounds[3], isLoser: true },
    { key: "lr5", title: "Verlierer-Runde 5", ids: loserRounds[4], isLoser: true },
    { key: "wr4", title: "Runde 4", ids: winnersRounds[3] },
    { key: "lr6", title: "Verlierer-Runde 6", ids: loserRounds[5], isLoser: true },
    { key: "lr7", title: "Verlierer-Runde 7", ids: loserRounds[6], isLoser: true },
    { key: "wr5", title: "Runde 5", ids: winnersRounds[4] },
    { key: "lr8", title: "Verlierer-Runde 8", ids: loserRounds[7], isLoser: true },
    { key: "lr9", title: "Verlierer-Runde 9", ids: loserRounds[8], isLoser: true },
    { key: "halbfinale", title: "Halbfinale", ids: winnersRounds[5] },
    { key: "lr10", title: "Verlierer-Runde 10", ids: losersFinal, isLoser: true },
    { key: "finale", title: "Großes Finale", ids: grandFinal, isFinal: true },
    { key: "reset", title: "Bracket Reset", ids: reset, isReset: true },
  ]

  const sectionByMatchId: Record<number, string> = {}
  sections.forEach((section) => section.ids.forEach((id) => (sectionByMatchId[id] = section.key)))

  const allMatchIds = sections.flatMap((section) => section.ids)

  return {
    firstRoundIds: wr1,
    finalId: grandFinal[0],
    resetId: reset[0],
    winnersFinalId: winnersFinal[0],
    losersFinalId: losersFinal[0],
    progressionMap,
    allMatchIds,
    sections,
    sectionByMatchId,
  }
}

const structure = buildStructure(64)

const createEmptyMatches = (): Record<number, Match> => {
  const matches: Record<number, Match> = {}
  structure.allMatchIds.forEach((id) => {
    matches[id] = { id, player1: "", player2: "", score1: 0, score2: 0 }
  })
  return matches
}

const syncRankingsFromMatches = async (
  matches: Record<number, Match>,
  tournamentType: string,
  tournamentId: string,
  tournamentName: string,
  bracketSize: number,
) => {
  if (!tournamentId) return

  try {
    await deleteRankingsFromDatabase(tournamentType, tournamentId)

    const lossesByPlayer: Record<string, Match[]> = {}

    Object.values(matches).forEach((match) => {
      if (match.loser && match.winner && !isFreilos(match.loser)) {
        if (!lossesByPlayer[match.loser]) lossesByPlayer[match.loser] = []
        lossesByPlayer[match.loser].push(match)
      }
    })

    const rankingRows: Array<{
      tournament_type: string
      tournament_id: string
      tournament_name: string
      player_name: string
      placement: number
      eliminated_at: string
    }> = []

    Object.entries(lossesByPlayer).forEach(([player, lossMatches]) => {
      if (lossMatches.length >= 2) {
        const lastLoss = lossMatches.sort((a, b) => a.id - b.id)[lossMatches.length - 1]
        rankingRows.push({
          tournament_type: tournamentType,
          tournament_id: tournamentId,
          tournament_name: tournamentName,
          player_name: player,
          placement: getPlacementForEliminationMatch(lastLoss.id, bracketSize),
          eliminated_at: new Date().toISOString(),
        })
      }
    })

    const finalWinner = matches[structure.resetId].winner || matches[structure.finalId].winner
    const finalRunnerUp = matches[structure.resetId].winner
      ? matches[structure.resetId].loser
      : matches[structure.finalId].winner === matches[structure.finalId].player1
        ? matches[structure.finalId].player2
        : matches[structure.finalId].winner
          ? matches[structure.finalId].player1
          : undefined

    if (finalWinner && !isFreilos(finalWinner)) {
      rankingRows.push({
        tournament_type: tournamentType,
        tournament_id: tournamentId,
        tournament_name: tournamentName,
        player_name: finalWinner,
        placement: 1,
        eliminated_at: new Date().toISOString(),
      })
    }

    if (finalRunnerUp && !isFreilos(finalRunnerUp)) {
      rankingRows.push({
        tournament_type: tournamentType,
        tournament_id: tournamentId,
        tournament_name: tournamentName,
        player_name: finalRunnerUp,
        placement: 2,
        eliminated_at: new Date().toISOString(),
      })
    }

    if (rankingRows.length > 0) {
      const deduped = Object.values(
        rankingRows.reduce<Record<string, (typeof rankingRows)[number]>>((acc, row) => {
          acc[row.player_name] = row
          return acc
        }, {}),
      )
      const { error } = await supabase.from("dko_rankings").insert(deduped)
      if (error) throw error
    }
  } catch (error) {
    console.error("Fehler beim Synchronisieren der Rankings:", error)
  }
}

export default function TournamentBracket({
  bracketSize = 64,
  tournamentType = "64er_dko",
}: TournamentBracketProps) {
  const initializingRef = useRef(false)
  const autoResolveRanRef = useRef(false)
  const isRemoteUpdateRef = useRef(false)
  const rankingsSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [matches, setMatches] = useState<Record<number, Match>>(() => createEmptyMatches())
  const [tournamentId, setTournamentId] = useState("")
  const [tournamentName, setTournamentName] = useState("")
  const [totalMachines, setTotalMachines] = useState<number>(10)
  const [machineDialogOpen, setMachineDialogOpen] = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [rankingsDialogOpen, setRankingsDialogOpen] = useState(false)
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [loadingRankings, setLoadingRankings] = useState(false)
  const [savingToSeries, setSavingToSeries] = useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [announcementsEnabled, setAnnouncementsEnabled] = useState(false)
  const [playerIdMap, setPlayerIdMap] = useState<Record<string, string>>({})
  const [vsIntro, setVsIntro] = useState<{
    open: boolean
    player1: string
    player2: string
    machineNumber?: number
  }>({
    open: false,
    player1: "",
    player2: "",
    machineNumber: undefined,
  })

  const router = useRouter()
  const searchParams = useSearchParams()
  const { announce } = useSpeechAnnouncer({ enabled: announcementsEnabled })

  const availableMachines = useMemo(() => {
    const used = Object.values(matches)
      .filter((m) => m.machineNumber !== undefined && !m.winner)
      .map((m) => m.machineNumber!)
    return Array.from({ length: totalMachines }, (_, i) => i + 1).filter((n) => !used.includes(n))
  }, [matches, totalMachines])

  const setPlayerInTarget = (allMatches: Record<number, Match>, target: SlotTarget, name: string) => {
    const match = allMatches[target.matchId]
    if (!match) return
    if (target.position === 1) {
      match.player1 = name
    } else {
      match.player2 = name
    }
  }

  const findNearbyMatches = (matchId: number): number[] => {
    const sectionKey = structure.sectionByMatchId[matchId]
    const section = structure.sections.find((s) => s.key === sectionKey)
    return section ? section.ids.filter((id) => id !== matchId) : []
  }

  const optimizeMatchInRound = (allMatches: Record<number, Match>, matchId: number) => {
    const match = allMatches[matchId]
    if (!match || match.winner || !match.player1 || !match.player2) return

    const isP1Freilos = isFreilos(match.player1)
    const isP2Freilos = isFreilos(match.player2)
    if (!(isP1Freilos || isP2Freilos) || (isP1Freilos && isP2Freilos)) return

    for (const nearbyId of findNearbyMatches(matchId)) {
      const nearby = allMatches[nearbyId]
      if (!nearby || nearby.winner || !nearby.player1 || !nearby.player2) continue
      const n1 = isFreilos(nearby.player1)
      const n2 = isFreilos(nearby.player2)
      if (n1 && n2) {
        const sourceUsesPlayer2 = isP2Freilos
        const temp = sourceUsesPlayer2 ? match.player2 : match.player1
        if (sourceUsesPlayer2) {
          match.player2 = nearby.player2
          nearby.player2 = temp
        } else {
          match.player1 = nearby.player2
          nearby.player2 = temp
        }
        return
      }
    }
  }

  const progressPlayers = (allMatches: Record<number, Match>, matchId: number, winner: string, loser: string) => {
    const progression = structure.progressionMap[matchId]
    if (!progression) return

    if (progression.winner) {
      setPlayerInTarget(allMatches, progression.winner, winner)
      const target = allMatches[progression.winner.matchId]
      if (target.player1 && target.player2 && !target.winner) {
        optimizeMatchInRound(allMatches, progression.winner.matchId)
      }
    }

    if (progression.loser) {
      setPlayerInTarget(allMatches, progression.loser, loser)
      const target = allMatches[progression.loser.matchId]
      if (target.player1 && target.player2 && !target.winner) {
        optimizeMatchInRound(allMatches, progression.loser.matchId)
      }
    }
  }

  const resolveOneFreilosPass = (allMatches: Record<number, Match>) => {
    let changed = false

    for (const match of Object.values(allMatches).sort((a, b) => a.id - b.id)) {
      if (match.winner || !match.player1 || !match.player2) continue

      const p1Freilos = isFreilos(match.player1)
      const p2Freilos = isFreilos(match.player2)
      if (!p1Freilos && !p2Freilos) continue

      if (p1Freilos && p2Freilos) {
        match.winner = match.player1
        match.loser = match.player2
        match.score1 = 2
        match.score2 = 0
        progressPlayers(allMatches, match.id, match.player1, match.player2)
        changed = true
        continue
      }

      const realPlayer = p1Freilos ? match.player2 : match.player1
      const freilosPlayer = p1Freilos ? match.player1 : match.player2
      match.winner = realPlayer
      match.loser = freilosPlayer
      match.score1 = p1Freilos ? 0 : 2
      match.score2 = p2Freilos ? 0 : 2

      if (match.id === structure.finalId) {
        if (match.winner !== match.player1) {
          allMatches[structure.resetId].player1 = match.player1
          allMatches[structure.resetId].player2 = match.player2
        }
      } else if (match.id !== structure.resetId) {
        progressPlayers(allMatches, match.id, realPlayer, freilosPlayer)
      }

      changed = true
    }

    return changed
  }

  const autoResolveAllFreilose = (allMatches: Record<number, Match>) => {
    let safety = 0
    while (resolveOneFreilosPass(allMatches) && safety < 300) {
      safety++
    }
  }

  const rebuildFromCompletedMatches = (
    sourceMatches: Record<number, Match>,
    keepCompletedBeforeId?: number,
  ) => {
    const rebuilt = createEmptyMatches()

    structure.firstRoundIds.forEach((id) => {
      rebuilt[id].player1 = sourceMatches[id]?.player1 || ""
      rebuilt[id].player2 = sourceMatches[id]?.player2 || ""
    })

    const completed = Object.values(sourceMatches)
      .filter((m) => m.winner && m.loser)
      .filter((m) => keepCompletedBeforeId === undefined || m.id < keepCompletedBeforeId)
      .sort((a, b) => a.id - b.id)

    for (const original of completed) {
      rebuilt[original.id] = {
        ...rebuilt[original.id],
        score1: original.score1,
        score2: original.score2,
        winner: original.winner,
        loser: original.loser,
        machineNumber: undefined,
        callCount: undefined,
      }

      if (original.id === structure.finalId) {
        if (original.winner !== rebuilt[structure.finalId].player1) {
          rebuilt[structure.resetId].player1 = rebuilt[structure.finalId].player1
          rebuilt[structure.resetId].player2 = rebuilt[structure.finalId].player2
        }
      } else if (original.id !== structure.resetId) {
        progressPlayers(rebuilt, original.id, original.winner!, original.loser!)
      }
    }

    autoResolveAllFreilose(rebuilt)
    return rebuilt
  }

  const fetchRankings = async () => {
    setLoadingRankings(true)
    try {
      const { data, error } = await supabase
        .from("dko_rankings")
        .select("player_name, placement, eliminated_at")
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)
        .order("placement", { ascending: true })

      if (error) throw error
      setRankings(data || [])
      setRankingsDialogOpen(true)
    } catch (error) {
      console.error("Fehler beim Laden der Rangliste:", error)
      alert("Fehler beim Laden der Rangliste")
    } finally {
      setLoadingRankings(false)
    }
  }

  const saveToTournamentSeries = async () => {
    const winner = matches[structure.resetId].winner || matches[structure.finalId].winner
    if (!winner) {
      alert("Kein Gewinner gefunden!")
      return
    }

    const { data: existingHistory } = await supabase
      .from("tournament_series_history")
      .select("id")
      .eq("tournament_id", tournamentId)
      .maybeSingle()

    if (existingHistory) {
      alert("Dieses Turnier wurde bereits zur Serie hinzugefügt!")
      return
    }

    setSavingToSeries(true)

    try {
      const { data: rankingData, error: rankingsError } = await supabase
        .from("dko_rankings")
        .select("player_name, placement")
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)
        .order("placement", { ascending: true })

      if (rankingsError) throw rankingsError
      if (!rankingData || rankingData.length === 0) {
        alert("Keine Rangliste gefunden! Bitte stelle sicher, dass das Turnier vollständig ist.")
        return
      }

      const placementCounts: Record<number, number> = {}
      rankingData.forEach((r) => {
        placementCounts[r.placement] = (placementCounts[r.placement] || 0) + 1
      })

      const tiersBelow: Record<number, number> = {}
      Object.keys(placementCounts)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach((placement, index, arr) => {
          tiersBelow[placement] = arr.length - index - 1
        })

      const { data: matchStates, error: matchError } = await supabase
        .from("dko_match_states")
        .select("match_id, player1, player2, score1, score2, winner, updated_at")
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)
        .order("match_id", { ascending: true })

      if (matchError) throw matchError

      const playerMatchHistory: Record<string, Array<{ matchId: number; result: "W" | "L"; timestamp: string }>> = {}

      matchStates?.forEach((match) => {
        if (!match.winner) return

        if (match.player1 && !isFreilos(match.player1)) {
          playerMatchHistory[match.player1] ||= []
          playerMatchHistory[match.player1].push({
            matchId: match.match_id,
            result: match.winner === match.player1 ? "W" : "L",
            timestamp: match.updated_at || new Date().toISOString(),
          })
        }

        if (match.player2 && !isFreilos(match.player2)) {
          playerMatchHistory[match.player2] ||= []
          playerMatchHistory[match.player2].push({
            matchId: match.match_id,
            result: match.winner === match.player2 ? "W" : "L",
            timestamp: match.updated_at || new Date().toISOString(),
          })
        }
      })

      Object.values(playerMatchHistory).forEach((history) =>
        history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      )

      const bracketResetOccurred = matches[structure.resetId].winner !== undefined

      const playerStats: Record<
        string,
        {
          placement: number
          placement_points: number
          legs_points: number
          bonus_points: number
          legs_won: number
          legs_lost: number
          matches_played: number
          matches_won: number
          matches_lost: number
        }
      > = {}

      rankingData.forEach((ranking) => {
        playerStats[ranking.player_name] = {
          placement: ranking.placement,
          placement_points: 10 + (tiersBelow[ranking.placement] || 0) * 2,
          legs_points: 0,
          bonus_points: ranking.placement === 1 && !bracketResetOccurred ? 5 : 0,
          legs_won: 0,
          legs_lost: 0,
          matches_played: 0,
          matches_won: 0,
          matches_lost: 0,
        }
      })

      matchStates?.forEach((match) => {
        const score1 = match.score1 || 0
        const score2 = match.score2 || 0

        if (match.player1 && !isFreilos(match.player1)) {
          playerStats[match.player1] ||= {
            placement: 0,
            placement_points: 0,
            legs_points: 0,
            bonus_points: 0,
            legs_won: 0,
            legs_lost: 0,
            matches_played: 0,
            matches_won: 0,
            matches_lost: 0,
          }
          playerStats[match.player1].legs_won += score1
          playerStats[match.player1].legs_lost += score2
          playerStats[match.player1].legs_points += score1
          if (match.winner) {
            playerStats[match.player1].matches_played += 1
            if (match.winner === match.player1) playerStats[match.player1].matches_won += 1
            else playerStats[match.player1].matches_lost += 1
          }
        }

        if (match.player2 && !isFreilos(match.player2)) {
          playerStats[match.player2] ||= {
            placement: 0,
            placement_points: 0,
            legs_points: 0,
            bonus_points: 0,
            legs_won: 0,
            legs_lost: 0,
            matches_played: 0,
            matches_won: 0,
            matches_lost: 0,
          }
          playerStats[match.player2].legs_won += score2
          playerStats[match.player2].legs_lost += score1
          playerStats[match.player2].legs_points += score2
          if (match.winner) {
            playerStats[match.player2].matches_played += 1
            if (match.winner === match.player2) playerStats[match.player2].matches_won += 1
            else playerStats[match.player2].matches_lost += 1
          }
        }
      })

      const tournamentEntries = Object.entries(playerStats).map(([playerName, stats]) => ({
        player_name: playerName,
        tournament_id: tournamentId,
        tournament_name: tournamentName,
        tournament_type: tournamentType,
        tournament_date: new Date().toISOString(),
        placement: stats.placement,
        placement_points: stats.placement_points,
        legs_points: stats.legs_points,
        bonus_points: stats.bonus_points,
        total_points: stats.placement_points + stats.legs_points + stats.bonus_points,
        legs_won: stats.legs_won,
        legs_lost: stats.legs_lost,
        matches_played: stats.matches_played,
        matches_won: stats.matches_won,
        matches_lost: stats.matches_lost,
        form: (playerMatchHistory[playerName] || []).map((m) => m.result).join(","),
      }))

      const { error: insertError } = await supabase
        .from("tournament_series_standings")
        .insert(tournamentEntries)
      if (insertError) throw insertError

      const { error: historyError } = await supabase.from("tournament_series_history").insert({
        tournament_id: tournamentId,
        tournament_name: tournamentName,
        tournament_type: tournamentType,
        added_at: new Date().toISOString(),
      })
      if (historyError) throw historyError

      await markTournamentAsCompleted(tournamentId)
      await deleteFreiloseFromDatabase(tournamentType, tournamentId)
      await clearTournamentRegistration()
      setSuccessDialogOpen(false)
      router.push("/dko_tournament_registration")
    } catch (error) {
      console.error("Fehler beim Speichern zur Turnierserie:", error)
      alert("Fehler beim Speichern zur Turnierserie. Bitte versuche es erneut.")
    } finally {
      setSavingToSeries(false)
    }
  }

  const startMatch = (matchId: number) => {
    const match = matches[matchId]
    if (!match.player1 || !match.player2) {
      alert("Beide Spieler müssen verfügbar sein!")
      return
    }

    if (isFreilos(match.player1) || isFreilos(match.player2)) {
      const next = rebuildFromCompletedMatches({
        ...matches,
        [matchId]: {
          ...match,
          winner: isFreilos(match.player1) ? match.player2 : match.player1,
          loser: isFreilos(match.player1) ? match.player1 : match.player2,
          score1: isFreilos(match.player1) ? 0 : 2,
          score2: isFreilos(match.player2) ? 0 : 2,
        },
      })
      setMatches(next)
      return
    }

    if (match.machineNumber) {
      alert(`Dieses Spiel läuft bereits auf Automat ${match.machineNumber}`)
      return
    }

    setSelectedMatchId(matchId)
    setMachineDialogOpen(true)
  }

  const assignMachine = (machineNumber: number) => {
    if (selectedMatchId === null) return
    const match = matches[selectedMatchId]

    setMatches((prev) => ({
      ...prev,
      [selectedMatchId]: {
        ...prev[selectedMatchId],
        machineNumber,
        callCount: 1,
      },
    }))

    if (announcementsEnabled && match) {
      announce(match.player1, match.player2, machineNumber, 1)
    }

    setVsIntro({
      open: true,
      player1: match?.player1 ?? "",
      player2: match?.player2 ?? "",
      machineNumber,
    })
    setMachineDialogOpen(false)
    setSelectedMatchId(null)
  }

  const handleRepeatCall = (matchId: number) => {
    const match = matches[matchId]
    const nextCallCount = (match.callCount || 1) + 1
    if (nextCallCount > 3) return

    setMatches((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], callCount: nextCallCount },
    }))

    if (announcementsEnabled && match.machineNumber) {
      announce(match.player1, match.player2, match.machineNumber, nextCallCount)
    }
  }

  const updateScore = (matchId: number, player: 1 | 2, score: number) => {
    setMatches((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [player === 1 ? "score1" : "score2"]: score,
      },
    }))
  }

  const confirmMatch = (matchId: number) => {
    const match = matches[matchId]

    if (match.score1 === match.score2) {
      alert("Unentschieden ist nicht erlaubt!")
      return
    }

    const winner = match.score1 > match.score2 ? match.player1 : match.player2
    const loser = match.score1 > match.score2 ? match.player2 : match.player1

    const source = {
      ...matches,
      [matchId]: {
        ...match,
        winner,
        loser,
        machineNumber: undefined,
        callCount: undefined,
      },
    }

    const next = rebuildFromCompletedMatches(source)
    setMatches(next)
  }

  const resetMatch = async (matchId: number) => {
    const rebuilt = rebuildFromCompletedMatches(matches, matchId)
    rebuilt[matchId] = {
      ...rebuilt[matchId],
      score1: 0,
      score2: 0,
      winner: undefined,
      loser: undefined,
      machineNumber: undefined,
      callCount: undefined,
    }
    setMatches(rebuilt)
  }

  const handleConfirmCancel = async () => {
    setCancelDialogOpen(false)
    await markTournamentAsCancelled(tournamentId)
    await deleteMatchStatesFromDatabase(tournamentType, tournamentId)
    await deleteRankingsFromDatabase(tournamentType, tournamentId)
    await deleteFreiloseFromDatabase(tournamentType, tournamentId)
    await clearTournamentRegistration()
    router.push("/dko_tournament_registration")
  }

  useEffect(() => {
    const fetchPlayerIds = async () => {
      try {
        const { data, error } = await supabase.from("spieldatenbank").select("id, name")
        if (error) {
          console.error("Error fetching player ids:", error)
          return
        }

        const idMap: Record<string, string> = {}
        ;(data ?? []).forEach((p: any) => {
          if (p?.name && p?.id) {
            idMap[String(p.name).toLowerCase().trim()] = String(p.id)
          }
        })
        setPlayerIdMap(idMap)
      } catch (err) {
        console.error("Error fetching player ids:", err)
      }
    }

    fetchPlayerIds()
  }, [])

  useEffect(() => {
    if (!loading && tournamentId) {
      if (isRemoteUpdateRef.current) {
        isRemoteUpdateRef.current = false
      } else {
        const timeoutId = setTimeout(() => {
          saveMatchStatesToDatabase(matches, tournamentType, tournamentId, playerIdMap)
        }, 700)
        return () => clearTimeout(timeoutId)
      }
    }
  }, [matches, tournamentType, tournamentId, loading, playerIdMap])

  useEffect(() => {
    if (loading || !tournamentId) return
    if (rankingsSyncTimeoutRef.current) clearTimeout(rankingsSyncTimeoutRef.current)
    rankingsSyncTimeoutRef.current = setTimeout(() => {
      syncRankingsFromMatches(matches, tournamentType, tournamentId, tournamentName, bracketSize)
    }, 500)
    return () => {
      if (rankingsSyncTimeoutRef.current) clearTimeout(rankingsSyncTimeoutRef.current)
    }
  }, [matches, loading, tournamentId, tournamentType, tournamentName, bracketSize])

  useEffect(() => {
    if (loading || !tournamentId) return

    const channel = supabase
      .channel(`dko_match_states_${tournamentType}_${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dko_match_states",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload: any) => {
          const record = payload?.new
          if (!record) return
          if (record.tournament_type && record.tournament_type !== tournamentType) return

          isRemoteUpdateRef.current = true

          setMatches((prev) => {
            const next = { ...prev }
            const current = next[record.match_id] || {
              id: record.match_id,
              player1: "",
              player2: "",
              score1: 0,
              score2: 0,
            }

            next[record.match_id] = {
              ...current,
              id: record.match_id,
              player1: record.player1 || "",
              player2: record.player2 || "",
              score1: record.score1 || 0,
              score2: record.score2 || 0,
              winner: record.winner || undefined,
              loser: record.loser || undefined,
              machineNumber: record.machine_number || undefined,
              callCount: record.machine_number ? 1 : undefined,
            }

            return rebuildFromCompletedMatches(next)
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loading, tournamentId, tournamentType])

  useEffect(() => {
    if (loading || !tournamentId || autoResolveRanRef.current) return
    autoResolveRanRef.current = true
    const timer = setTimeout(() => {
      setMatches((prev) => rebuildFromCompletedMatches(prev))
      autoResolveRanRef.current = false
    }, 100)
    return () => clearTimeout(timer)
  }, [matches, loading, tournamentId])

  useEffect(() => {
    const fetchRegisteredPlayers = async () => {
      if (initializingRef.current) return
      initializingRef.current = true

      try {
        const urlTournamentId = searchParams.get("tournamentId")
        const urlTournamentName = searchParams.get("tournamentName")
        let currentTournamentId = urlTournamentId || crypto.randomUUID()

        if (!urlTournamentId) {
          const newUrl = new URL(window.location.href)
          newUrl.searchParams.set("tournamentId", currentTournamentId)
          if (urlTournamentName) newUrl.searchParams.set("tournamentName", urlTournamentName)
          newUrl.searchParams.delete("shuffle")
          window.history.replaceState({}, "", newUrl.toString())
        }

        setTournamentId(currentTournamentId)
        setTournamentName(urlTournamentName ? decodeURIComponent(urlTournamentName) : "Unbenanntes Turnier")

        const savedMatches = await loadMatchStatesFromDatabase(tournamentType, currentTournamentId)
        if (savedMatches) {
          setMatches(rebuildFromCompletedMatches({ ...createEmptyMatches(), ...savedMatches }))
          setLoading(false)
          return
        }

        const { error: statusError } = await supabase.from("tournaments_status").insert({
          tournament_id: currentTournamentId,
          tournament_type: tournamentType,
          tournament_name: urlTournamentName ? decodeURIComponent(urlTournamentName) : "Unbenanntes Turnier",
          status: "active",
        })

        if (statusError && statusError.code !== "23505") {
          console.error("Error creating tournament status:", statusError)
        }

        const { data, error } = await supabase
          .from("dko_tournament_registration")
          .select("player_name")
          .order("registered_at", { ascending: true })

        if (error) throw error

        if (data && data.length > 0) {
          let playerNames = data.map((p) => p.player_name)
          const existingFreilose = await loadFreiloseFromDatabase(tournamentType, currentTournamentId)

          if (existingFreilose.length === 0) {
            playerNames = distributePlayersWithFreilose(playerNames, bracketSize)
            const freilose = playerNames.filter((name) => isFreilos(name))
            if (freilose.length > 0) {
              await saveFreiloseToDatabase(freilose, tournamentType, currentTournamentId)
            }
          } else {
            const freilosCount = bracketSize - playerNames.length
            if (freilosCount > 0) {
              playerNames = [...playerNames, ...existingFreilose.slice(0, freilosCount)]
            }
          }

          const initial = createEmptyMatches()
          structure.firstRoundIds.forEach((matchId, i) => {
            initial[matchId].player1 = playerNames[i * 2] || ""
            initial[matchId].player2 = playerNames[i * 2 + 1] || ""
          })

          autoResolveAllFreilose(initial)
          setMatches(initial)
        }
      } catch (error) {
        console.error("Fehler beim Laden der registrierten Spieler:", error)
      } finally {
        setLoading(false)
        initializingRef.current = false
      }
    }

    fetchRegisteredPlayers()
  }, [searchParams, bracketSize, tournamentType])

  const winnerName = matches[structure.resetId].winner || matches[structure.finalId].winner
  const showReset =
    (matches[structure.resetId].player1 ||
      matches[structure.resetId].player2 ||
      matches[structure.finalId].winner === matches[structure.finalId].player2) &&
    !matches[structure.resetId].winner

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Lade Spieler...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="w-full mx-auto space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {bracketSize}er DKO - {tournamentName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Turnier-ID: {tournamentId}</p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={announcementsEnabled}
                onChange={(e) => setAnnouncementsEnabled(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span>Ansage aktivieren</span>
            </label>

            <Button onClick={fetchRankings} variant="outline" disabled={loadingRankings || !tournamentId}>
              {loadingRankings ? "Lädt..." : "Rangliste"}
            </Button>

            <Button onClick={() => setSuccessDialogOpen(true)} variant="outline" disabled={!winnerName}>
              Zur Serie speichern
            </Button>

            <Button onClick={() => setCancelDialogOpen(true)} variant="outline">
              Abbrechen
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Automaten</label>
          <Input
            type="number"
            value={totalMachines}
            onChange={(e) => setTotalMachines(Math.max(1, Number(e.target.value) || 1))}
            className="w-28"
          />
        </div>

        <div className="space-y-8">
          {structure.sections.map((section) => {
            if (section.isReset && !showReset) return null

            return (
              <div key={section.key} className="space-y-3">
                <h2
                  className={cn(
                    "text-xl font-bold border-b-2 pb-2",
                    section.isReset
                      ? "text-purple-600 border-purple-600"
                      : section.isFinal
                        ? "text-blue-600 border-blue-600"
                        : section.isLoser
                          ? "text-destructive border-destructive"
                          : section.key === "wr1"
                            ? "text-orange-600 border-orange-600"
                            : "text-blue-600 border-blue-600",
                  )}
                >
                  {section.title}
                </h2>

                {section.isFinal && (
                  <p className="text-sm text-muted-foreground">
                    Sieger Gewinnerseite vs. Sieger Verliererseite
                  </p>
                )}

                {section.isReset && (
                  <p className="text-sm text-muted-foreground">
                    Der Spieler von der Verliererseite hat gewonnen! Beide Spieler haben jetzt je 1 Niederlage.
                  </p>
                )}

                {section.ids.map((id) => (
                  <MatchCard
                    key={id}
                    match={matches[id]}
                    onScoreUpdate={updateScore}
                    onConfirm={confirmMatch}
                    onStartMatch={startMatch}
                    onReset={resetMatch}
                    onRepeatCall={handleRepeatCall}
                    announcementsEnabled={announcementsEnabled}
                    isLoser={section.isLoser}
                    isGrandFinal={section.isFinal || section.isReset}
                  />
                ))}
              </div>
            )
          })}

          {winnerName && (
            <Card className="p-6 bg-primary text-primary-foreground">
              <h3 className="text-2xl font-bold text-center">🏆 Turniersieger</h3>
              <p className="text-3xl font-bold text-center mt-4">{winnerName}</p>

              <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
                <Button
                  onClick={saveToTournamentSeries}
                  disabled={savingToSeries}
                  size="lg"
                  variant="secondary"
                  className="font-semibold"
                >
                  {savingToSeries ? "Speichere..." : "Zur Turnierserie hinzufügen"}
                </Button>

                <Button
                  onClick={async () => {
                    await markTournamentAsCompleted(tournamentId)
                    await deleteFreiloseFromDatabase(tournamentType, tournamentId)
                    await clearTournamentRegistration()
                    router.push("/dko_tournament_registration")
                  }}
                  size="lg"
                  variant="outline"
                  className="bg-background text-foreground hover:bg-background/90"
                >
                  Weiter zu Ergebnissen
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <VsIntroOverlay
        open={vsIntro.open}
        player1={vsIntro.player1}
        player2={vsIntro.player2}
        machineNumber={vsIntro.machineNumber}
        durationMs={1800}
        onDone={() => setVsIntro((prev) => ({ ...prev, open: false }))}
      />

      <Dialog open={machineDialogOpen} onOpenChange={setMachineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Automat auswählen</DialogTitle>
            <DialogDescription>
              Wähle einen verfügbaren Automaten für Match {selectedMatchId}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-2 py-4">
            {availableMachines.length === 0 ? (
              <p className="col-span-4 text-center text-muted-foreground">Keine Automaten verfügbar</p>
            ) : (
              availableMachines.map((num) => (
                <Button
                  key={num}
                  onClick={() => assignMachine(num)}
                  variant="outline"
                  className="h-16 text-lg"
                >
                  {num}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turnier abbrechen?</DialogTitle>
            <DialogDescription>
              Möchtest du wirklich zur Registrierung zurückkehren? Das aktuelle Turnier wird nicht gespeichert.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Nein, weiterspielen
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancel}>
              Ja, abbrechen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rankingsDialogOpen} onOpenChange={setRankingsDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tabelle</DialogTitle>
            <DialogDescription>Aktuelle Platzierungen im Turnier</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {rankings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Platzierungen vorhanden.</p>
            ) : (
              rankings.map((ranking) => (
                <Card
                  key={`${ranking.player_name}-${ranking.placement}`}
                  className="flex items-center justify-between p-3"
                >
                  <div>
                    <p className="font-semibold">{ranking.player_name}</p>
                    <p className="text-xs text-muted-foreground">Platz {ranking.placement}</p>
                  </div>
                  <div className="text-right text-sm font-medium">#{ranking.placement}</div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turnier zur Serie hinzufügen?</DialogTitle>
            <DialogDescription>
              Die aktuelle Rangliste und alle berechneten Punkte werden in die Turnierserie übernommen.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSuccessDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={saveToTournamentSeries} disabled={savingToSeries}>
              {savingToSeries ? "Speichere…" : "Jetzt speichern"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MatchCard({
  match,
  onScoreUpdate,
  onConfirm,
  onStartMatch,
  onReset,
  onRepeatCall,
  announcementsEnabled,
  isLoser,
  isGrandFinal,
}: {
  match: Match
  onScoreUpdate: (matchId: number, player: 1 | 2, score: number) => void
  onConfirm: (matchId: number) => void
  onStartMatch: (matchId: number) => void
  onReset: (matchId: number) => void | Promise<void>
  onRepeatCall: (matchId: number) => void
  announcementsEnabled: boolean
  isLoser?: boolean
  isGrandFinal?: boolean
}) {
  const finished = Boolean(match.winner)
  const ready = Boolean(match.player1 && match.player2)

  return (
    <Card
      className={cn(
        "p-4 border-2 shadow-sm",
        finished && "ring-2 ring-primary",
        isLoser && "border-destructive/40",
        isGrandFinal && "border-primary",
        !isLoser && !isGrandFinal && "border-border",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">Match {match.id}</div>
        {match.machineNumber && !finished && (
          <div className="text-xs font-medium text-muted-foreground">
            Automat {match.machineNumber}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div
          className={cn(
            "grid grid-cols-[1fr_72px] gap-2",
            match.winner === match.player1 && "font-semibold text-primary",
          )}
        >
          <div className="rounded-md bg-muted px-3 py-2">{match.player1 || "—"}</div>
          <Input
            type="number"
            min={0}
            value={match.score1}
            disabled={finished || !ready}
            onChange={(e) => onScoreUpdate(match.id, 1, Number(e.target.value) || 0)}
          />
        </div>

        <div
          className={cn(
            "grid grid-cols-[1fr_72px] gap-2",
            match.winner === match.player2 && "font-semibold text-primary",
          )}
        >
          <div className="rounded-md bg-muted px-3 py-2">{match.player2 || "—"}</div>
          <Input
            type="number"
            min={0}
            value={match.score2}
            disabled={finished || !ready}
            onChange={(e) => onScoreUpdate(match.id, 2, Number(e.target.value) || 0)}
          />
        </div>
      </div>

      {finished && (
        <div className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
          Sieger: {match.winner}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onStartMatch(match.id)} disabled={!ready || finished}>
          Start
        </Button>

        <Button size="sm" onClick={() => onConfirm(match.id)} disabled={!ready || finished}>
          <Check className="mr-1 h-4 w-4" />
          Bestätigen
        </Button>

        <Button size="sm" variant="outline" onClick={() => onReset(match.id)} disabled={!ready && !finished}>
          <RotateCcw className="mr-1 h-4 w-4" />
          Reset
        </Button>

        {announcementsEnabled && match.machineNumber && !finished && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRepeatCall(match.id)}
            disabled={(match.callCount || 1) >= 3}
          >
            Aufruf {(match.callCount || 1)}/3
          </Button>
        )}
      </div>
    </Card>
  )
}