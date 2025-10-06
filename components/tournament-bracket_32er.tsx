"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RotateCcw, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"

interface Match {
  id: number
  player1: string
  player2: string
  score1: number
  score2: number
  winner?: string
  loser?: string
  machineNumber?: number
}

interface TournamentBracketProps {
  bracketSize?: 8 | 16 | 32 | 64
  tournamentType?: string
}

interface Ranking {
  player_name: string
  placement: number
  eliminated_at: string
}

const isFreilos = (playerName: string): boolean => {
  return playerName.startsWith("Freilos")
}

const saveMatchStatesToDatabase = async (
  matches: Record<number, Match>,
  tournamentType: string,
  tournamentId: string,
) => {
  try {
    const matchStates = Object.values(matches).map((match) => ({
      tournament_type: tournamentType,
      tournament_id: tournamentId,
      match_id: match.id,
      player1: match.player1,
      player2: match.player2,
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
    console.log("[v0] Match states saved successfully")
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

    if (!data || data.length === 0) {
      console.log("[v0] No saved match states found")
      return null
    }

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
      }
    })

    console.log("[v0] Match states loaded successfully")
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
    console.log("[v0] Match states deleted")
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
    console.log("[v0] Rankings deleted")
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
    console.log("[v0] Freilose deleted")
  } catch (error) {
    console.error("Fehler beim Löschen der Freilose:", error)
  }
}

const clearTournamentRegistration = async (tournamentId: string) => {
  try {
    const { error } = await supabase.from("dko_tournament_registration").delete().neq("id", 0)

    if (error) throw error
    console.log("[v0] Tournament registration cleared successfully")
  } catch (error) {
    console.error("Fehler beim Löschen der Registrierung:", error)
  }
}

const distributePlayersWithFreilose = (players: string[], bracketSize: number): string[] => {
  const totalSlots = bracketSize
  const freilosCount = totalSlots - players.length

  if (freilosCount === 0) {
    return players.sort(() => Math.random() - 0.5)
  }

  const freilose: string[] = Array.from({ length: freilosCount }, (_, i) => `Freilos ${i + 1}`)
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5)
  const result: string[] = []
  const remainingPlayers = [...shuffledPlayers]
  const remainingFreilose = [...freilose]

  while (remainingFreilose.length > 0 && remainingPlayers.length > 0) {
    const player = remainingPlayers.pop()!
    const freilos = remainingFreilose.pop()!

    if (Math.random() > 0.5) {
      result.push(player, freilos)
    } else {
      result.push(freilos, player)
    }
  }

  while (remainingPlayers.length >= 2) {
    result.push(remainingPlayers.pop()!, remainingPlayers.pop()!)
  }

  while (remainingFreilose.length >= 2) {
    result.push(remainingFreilose.pop()!, remainingFreilose.pop()!)
  }

  if (remainingPlayers.length === 1 && remainingFreilose.length === 1) {
    result.push(remainingPlayers.pop()!, remainingFreilose.pop()!)
  }

  return result
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
    console.log("[v0] Freilose saved successfully")
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

const removePlayerFromRankings = async (playerName: string, tournamentType: string, tournamentId: string) => {
  try {
    console.log(`[v0] Removing ${playerName} from rankings due to match reset`)

    const { error } = await supabase
      .from("dko_rankings")
      .delete()
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)
      .eq("player_name", playerName)

    if (error) {
      console.error("[v0] Error removing player from rankings:", error)
      throw error
    }

    console.log(`[v0] Successfully removed ${playerName} from rankings`)
  } catch (error) {
    console.error("Fehler beim Entfernen aus Rankings:", error)
  }
}

const getPlacementForEliminationMatch = (matchId: number, bracketSize: number): number => {
  if (bracketSize === 32) {
    // Loser Round 1 (matches 17-24): 8 players eliminated → placement 25 (25-32)
    if (matchId >= 17 && matchId <= 24) return 25

    // Loser Round 2 (matches 33-40): 8 players eliminated → placement 17 (17-24)
    if (matchId >= 33 && matchId <= 40) return 17

    // Loser Round 3 (matches 41-44): 4 players eliminated → placement 13 (13-16)
    if (matchId >= 41 && matchId <= 44) return 13

    // Loser Round 4 (matches 49-52): 4 players eliminated → placement 9 (9-12)
    if (matchId >= 49 && matchId <= 52) return 9

    // Loser Round 5 (matches 53-54): 2 players eliminated → placement 7 (7-8)
    if (matchId === 53 || matchId === 54) return 7

    // Loser Round 6 (matches 57-58): 2 players eliminated → placement 5 (5-6)
    if (matchId === 57 || matchId === 58) return 5

    // Loser Round 7 (match 59): 1 player eliminated → placement 4
    if (matchId === 59) return 4

    // Loser Round 8 (match 61): 1 player eliminated → placement 3
    if (matchId === 61) return 3

    // Grand Final (match 62 or 63): 1 player eliminated → placement 2
    if (matchId === 62 || matchId === 63) return 2
  }

  console.warn(`[v0] Unknown elimination match ${matchId}, using fallback placement`)
  return bracketSize
}

const trackPlayerElimination = async (
  allMatches: Record<number, Match>,
  eliminatedPlayer: string,
  tournamentType: string,
  tournamentId: string,
  tournamentName: string,
  totalPlayers: number,
) => {
  console.log(`[v0] ========== TRACKING ELIMINATION ==========`)
  console.log(`[v0] Player: ${eliminatedPlayer}`)
  console.log(`[v0] Tournament ID: ${tournamentId}`)
  console.log(`[v0] Tournament Name: ${tournamentName}`)

  if (isFreilos(eliminatedPlayer)) {
    console.log(`[v0] ✗ Skipping ranking for Freilos: ${eliminatedPlayer} (Freilos are not ranked)`)
    return
  }

  const { data: existingPlayerRanking, error: checkError } = await supabase
    .from("dko_rankings")
    .select("id, placement")
    .eq("tournament_type", tournamentType)
    .eq("tournament_id", tournamentId)
    .eq("player_name", eliminatedPlayer)
    .maybeSingle()

  if (checkError) {
    console.error("[v0] Error checking for existing ranking:", checkError)
  }

  if (existingPlayerRanking) {
    console.log(
      `[v0] ✗ Player ${eliminatedPlayer} already has ranking in THIS tournament (placement ${existingPlayerRanking.placement}), skipping duplicate call`,
    )
    return
  }

  const lossMatches = Object.values(allMatches).filter((m) => m.loser === eliminatedPlayer && m.winner)
  const losses = lossMatches.length

  console.log(`[v0] Player ${eliminatedPlayer} loss history:`)
  lossMatches.forEach((m) => {
    console.log(`[v0]   - Lost Match ${m.id}: ${m.player1} vs ${m.player2}, Winner: ${m.winner}`)
  })
  console.log(`[v0] Total losses: ${losses}`)

  if (losses === 2) {
    console.log(`[v0] ✓ Player ${eliminatedPlayer} is ELIMINATED with 2 losses! Saving to database...`)
    try {
      const eliminationMatch = lossMatches[lossMatches.length - 1]
      const placement = getPlacementForEliminationMatch(eliminationMatch.id, totalPlayers)

      console.log(`[v0] Elimination match: ${eliminationMatch.id}`)
      console.log(`[v0] Calculated placement for ${eliminatedPlayer}: ${placement} (based on elimination round)`)

      if (isFreilos(eliminatedPlayer)) {
        console.error(`[v0] ✗ CRITICAL ERROR: Attempted to save Freilos ${eliminatedPlayer} to rankings! Aborting.`)
        return
      }

      const rankingData = {
        tournament_type: tournamentType,
        tournament_id: tournamentId,
        tournament_name: tournamentName,
        player_name: eliminatedPlayer,
        placement: placement,
        eliminated_at: new Date().toISOString(),
      }

      console.log("[v0] Attempting to insert ranking data:", rankingData)

      const { data: insertData, error: insertError } = await supabase.from("dko_rankings").insert(rankingData).select()

      if (insertError) {
        if (insertError.code === "23505") {
          console.log(
            `[v0] ℹ️ Player ${eliminatedPlayer} already exists in rankings (caught by database constraint), skipping`,
          )
          return
        }
        console.error("[v0] ✗ Error inserting ranking:", insertError)
        throw insertError
      }

      console.log(`[v0] ✓ Successfully saved! Player ${eliminatedPlayer} - Placement: ${placement}`, insertData)
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        console.log(`[v0] ℹ️ Player ${eliminatedPlayer} already ranked (duplicate prevented by database)`)
        return
      }
      console.error("[v0] Fehler beim Speichern der Platzierung:", error)
    }
  } else if (losses > 2) {
    console.log(
      `[v0] ⚠️ WARNING: Player ${eliminatedPlayer} has ${losses} losses (more than 2)! This shouldn't happen in double elimination!`,
    )
  } else {
    console.log(`[v0] Player ${eliminatedPlayer} only has ${losses} loss(es), not eliminated yet`)
  }
  console.log(`[v0] ========================================`)
}

const saveFinalRankings = async (
  winner: string,
  runnerUp: string,
  tournamentType: string,
  tournamentId: string,
  tournamentName: string,
) => {
  try {
    console.log(`[v0] Saving final rankings for tournament "${tournamentName}": 1st: ${winner}, 2nd: ${runnerUp}`)

    const { error: winnerError } = await supabase.from("dko_rankings").insert({
      tournament_type: tournamentType,
      tournament_id: tournamentId,
      tournament_name: tournamentName,
      player_name: winner,
      placement: 1,
      eliminated_at: new Date().toISOString(),
    })

    if (winnerError && winnerError.code !== "23505") {
      console.error("[v0] Error saving winner:", winnerError)
    }

    const { error: runnerUpError } = await supabase.from("dko_rankings").insert({
      tournament_type: tournamentType,
      tournament_id: tournamentId,
      tournament_name: tournamentName,
      player_name: runnerUp,
      placement: 2,
      eliminated_at: new Date().toISOString(),
    })

    if (runnerUpError && runnerUpError.code !== "23505") {
      console.error("[v0] Error saving runner-up:", runnerUpError)
    }

    console.log(`[v0] Final rankings saved successfully!`)
  } catch (error) {
    console.error("Fehler beim Speichern der finalen Platzierungen:", error)
  }
}

const markTournamentAsCompleted = async (tournamentId: string) => {
  try {
    console.log(`[v0] Marking tournament ${tournamentId} as completed`)

    const { error } = await supabase
      .from("tournaments_status")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("tournament_id", tournamentId)

    if (error) throw error

    console.log(`[v0] Tournament marked as completed successfully`)
  } catch (error) {
    console.error("Fehler beim Markieren des Turniers als abgeschlossen:", error)
  }
}

const markTournamentAsCancelled = async (tournamentId: string) => {
  try {
    console.log(`[v0] Marking tournament ${tournamentId} as cancelled`)

    const { error } = await supabase
      .from("tournaments_status")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("tournament_id", tournamentId)

    if (error) throw error

    console.log(`[v0] Tournament marked as cancelled successfully`)
  } catch (error) {
    console.error("Fehler beim Markieren des Turniers als abgebrochen:", error)
  }
}

export default function TournamentBracket({ bracketSize = 32, tournamentType = "32er_dko" }: TournamentBracketProps) {
  const initializingRef = useRef(false)

  const [tournamentId, setTournamentId] = useState<string>("")
  const [tournamentName, setTournamentName] = useState<string>("")
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
  const router = useRouter()
  const searchParams = useSearchParams()

  const initializeMatches = () => {
    const teamNames = [
      "Team Alpha",
      "Team Bravo",
      "Team Charlie",
      "Team Delta",
      "Team Echo",
      "Team Foxtrot",
      "Team Golf",
      "Team Hotel",
      "Team India",
      "Team Juliet",
      "Team Kilo",
      "Team Lima",
      "Team Mike",
      "Team November",
      "Team Oscar",
      "Team Papa",
      "Team Quebec",
      "Team Romeo",
      "Team Sierra",
      "Team Tango",
      "Team Uniform",
      "Team Victor",
      "Team Whiskey",
      "Team X-ray",
      "Team Yankee",
      "Team Zulu",
      "Team Omega",
      "Team Phoenix",
      "Team Dragon",
      "Team Tiger",
      "Team Eagle",
      "Team Falcon",
    ]

    const initialMatches: Record<number, Match> = {}

    // Round 1: Matches 1-16 (16 matches) - Now populated with team names
    for (let i = 1; i <= 16; i++) {
      const player1Index = (i - 1) * 2
      const player2Index = player1Index + 1
      initialMatches[i] = {
        id: i,
        player1: teamNames[player1Index],
        player2: teamNames[player2Index],
        score1: 0,
        score2: 0,
      }
    }

    // Loser Round 1: Matches 17-24 (8 matches)
    for (let i = 17; i <= 24; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    // Round 2: Matches 25-32 (8 matches)
    for (let i = 25; i <= 32; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    // Loser Round 2: Matches 33-40 (8 matches)
    for (let i = 33; i <= 40; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    // Loser Round 3: Matches 41-44 (4 matches)
    for (let i = 41; i <= 44; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    // Round 3: Matches 45-48 (4 matches)
    for (let i = 45; i <= 48; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    // Loser Round 4: Matches 49-52 (4 matches)
    for (let i = 49; i <= 52; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    // Loser Round 5: Matches 53-54 (2 matches)
    for (let i = 53; i <= 54; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    // Round 4: Matches 55-56 (2 matches)
    for (let i = 55; i <= 56; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    // Loser Round 6: Matches 57-58 (2 matches)
    for (let i = 57; i <= 58; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    // Loser Round 7: Match 59 (1 match)
    initialMatches[59] = { id: 59, player1: "", player2: "", score1: 0, score2: 0 }

    // Semi-final: Match 60 (1 match)
    initialMatches[60] = { id: 60, player1: "", player2: "", score1: 0, score2: 0 }

    // Loser Round 8: Match 61 (1 match)
    initialMatches[61] = { id: 61, player1: "", player2: "", score1: 0, score2: 0 }

    // Grand Final: Match 62 (1 match)
    initialMatches[62] = { id: 62, player1: "", player2: "", score1: 0, score2: 0 }

    // Bracket Reset: Match 63 (1 match)
    initialMatches[63] = { id: 63, player1: "", player2: "", score1: 0, score2: 0 }

    return initialMatches
  }

  const [matches, setMatches] = useState<Record<number, Match>>(() => initializeMatches())

  useEffect(() => {
    if (!loading && tournamentId) {
      const timeoutId = setTimeout(() => {
        saveMatchStatesToDatabase(matches, tournamentType, tournamentId)
      }, 1000)

      return () => clearTimeout(timeoutId)
    }
  }, [matches, tournamentType, tournamentId, loading])

  const getAvailableMachines = (): number[] => {
    const usedMachines = Object.values(matches)
      .filter((m) => m.machineNumber !== undefined && !m.winner)
      .map((m) => m.machineNumber!)

    return Array.from({ length: totalMachines }, (_, i) => i + 1).filter((num) => !usedMachines.includes(num))
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
    const winner = matches[63].winner || matches[62].winner

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
      const { data: rankings, error: rankingsError } = await supabase
        .from("dko_rankings")
        .select("player_name, placement")
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)
        .order("placement", { ascending: true })

      if (rankingsError) throw rankingsError

      if (!rankings || rankings.length === 0) {
        alert("Keine Rangliste gefunden! Bitte stelle sicher, dass das Turnier vollständig ist.")
        setSavingToSeries(false)
        return
      }

      const placementCounts: Record<number, number> = {}
      rankings.forEach((r) => {
        placementCounts[r.placement] = (placementCounts[r.placement] || 0) + 1
      })

      const tiersBelow: Record<number, number> = {}
      const sortedPlacements = Object.keys(placementCounts)
        .map(Number)
        .sort((a, b) => a - b)

      sortedPlacements.forEach((placement, index) => {
        // Count how many distinct placement tiers are below this one
        tiersBelow[placement] = sortedPlacements.length - index - 1
      })

      console.log("[v0] Placement counts:", placementCounts)
      console.log("[v0] Tiers below each placement:", tiersBelow)

      const { data: matchStates, error: matchError } = await supabase
        .from("dko_match_states")
        .select("player1, player2, score1, score2, winner")
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)

      if (matchError) throw matchError

      const bracketResetOccurred = matches[63].winner !== undefined
      console.log("[v0] Bracket reset occurred:", bracketResetOccurred)

      const playerPoints: Record<string, { placement_points: number; legs_points: number; bonus_points: number }> = {}

      rankings.forEach((ranking) => {
        const playerName = ranking.player_name
        const placement = ranking.placement

        const placementPoints = 10 + tiersBelow[placement] * 2

        const bonus = placement === 1 && !bracketResetOccurred ? 5 : 0

        console.log(
          `[v0] ${playerName} (Platz ${placement}): ${tiersBelow[placement]} Stufen darunter → ${placementPoints} Platzierungspunkte + ${bonus} Bonus ${bracketResetOccurred ? "(kein Bonus wegen Bracket Reset)" : ""}`,
        )

        playerPoints[playerName] = {
          placement_points: placementPoints,
          legs_points: 0,
          bonus_points: bonus,
        }
      })

      matchStates?.forEach((match) => {
        if (match.player1 && !isFreilos(match.player1)) {
          if (!playerPoints[match.player1]) {
            playerPoints[match.player1] = { placement_points: 0, legs_points: 0, bonus_points: 0 }
          }
          playerPoints[match.player1].legs_points += match.score1 || 0
        }

        if (match.player2 && !isFreilos(match.player2)) {
          if (!playerPoints[match.player2]) {
            playerPoints[match.player2] = { placement_points: 0, legs_points: 0, bonus_points: 0 }
          }
          playerPoints[match.player2].legs_points += match.score2 || 0
        }
      })

      console.log("[v0] Calculated points:", playerPoints)

      for (const [playerName, points] of Object.entries(playerPoints)) {
        const totalPoints = points.placement_points + points.legs_points + points.bonus_points

        console.log(
          `[v0] ${playerName}: ${points.placement_points} (Platzierung) + ${points.legs_points} (Legs) + ${points.bonus_points} (Bonus) = ${totalPoints} Gesamt`,
        )

        const { data: existingPlayer } = await supabase
          .from("tournament_series_standings")
          .select("total_points, placement_points, legs_points, bonus_points, tournaments_played")
          .eq("player_name", playerName)
          .maybeSingle()

        if (existingPlayer) {
          const { error: updateError } = await supabase
            .from("tournament_series_standings")
            .update({
              total_points: existingPlayer.total_points + totalPoints,
              placement_points: existingPlayer.placement_points + points.placement_points,
              legs_points: existingPlayer.legs_points + points.legs_points,
              bonus_points: existingPlayer.bonus_points + points.bonus_points,
              tournaments_played: existingPlayer.tournaments_played + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("player_name", playerName)

          if (updateError) throw updateError
        } else {
          const { error: insertError } = await supabase.from("tournament_series_standings").insert({
            player_name: playerName,
            total_points: totalPoints,
            placement_points: points.placement_points,
            legs_points: points.legs_points,
            bonus_points: points.bonus_points,
            tournaments_played: 1,
          })

          if (insertError) throw insertError
        }
      }

      const { error: historyError } = await supabase.from("tournament_series_history").insert({
        tournament_id: tournamentId,
        tournament_name: tournamentName,
        tournament_type: tournamentType,
        added_at: new Date().toISOString(),
      })

      if (historyError) throw historyError

      await markTournamentAsCompleted(tournamentId)

      await deleteFreiloseFromDatabase(tournamentType, tournamentId)

      await clearTournamentRegistration(tournamentId)

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

    const isP1Freilos = isFreilos(match.player1)
    const isP2Freilos = isFreilos(match.player2)

    if (isP1Freilos && isP2Freilos) {
      console.log(`[v0] Auto-resolving Freilos vs Freilos match ${matchId}: ${match.player1} vs ${match.player2}`)
      setMatches((prev) => {
        const newMatches = { ...prev }
        const updatedMatch = {
          ...match,
          winner: match.player1,
          loser: match.player2,
          score1: 2,
          score2: 0,
        }
        newMatches[matchId] = updatedMatch
        progressPlayers(newMatches, matchId, match.player1, match.player2)
        return newMatches
      })
      return
    }

    if (isP1Freilos || isP2Freilos) {
      const realPlayer = isP1Freilos ? match.player2 : match.player1
      const freilosPlayer = isP1Freilos ? match.player1 : match.player2

      console.log(`[v0] Auto-resolving Freilos match ${matchId}: ${realPlayer} beats ${freilosPlayer}`)
      setMatches((prev) => {
        const newMatches = { ...prev }
        const updatedMatch = {
          ...match,
          winner: realPlayer,
          loser: freilosPlayer,
          score1: isP1Freilos ? 0 : 2,
          score2: isP2Freilos ? 0 : 2,
        }
        newMatches[matchId] = updatedMatch
        progressPlayers(newMatches, matchId, realPlayer, freilosPlayer)
        return newMatches
      })
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

    setMatches((prev) => ({
      ...prev,
      [selectedMatchId]: {
        ...prev[selectedMatchId],
        machineNumber,
      },
    }))

    setMachineDialogOpen(false)
    setSelectedMatchId(null)
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
    setMatches((prev) => {
      const newMatches = { ...prev }
      const match = { ...newMatches[matchId] }

      if (match.score1 > match.score2) {
        match.winner = match.player1
        match.loser = match.player2
      } else if (match.score2 > match.score1) {
        match.winner = match.player2
        match.loser = match.player1
      } else {
        alert("Unentschieden ist nicht erlaubt!")
        return prev
      }

      match.machineNumber = undefined

      newMatches[matchId] = match

      if (matchId === 62) {
        if (match.winner === match.player1) {
          console.log(`[v0] Grand Final: Winner's bracket player ${match.winner} wins! Tournament over.`)
          saveFinalRankings(match.winner, match.loser, tournamentType, tournamentId, tournamentName)
        } else {
          console.log(`[v0] Grand Final: Loser's bracket player ${match.winner} wins! Bracket reset required.`)
          newMatches[63].player1 = match.player1
          newMatches[63].player2 = match.player2
        }
      } else if (matchId === 63) {
        console.log(`[v0] Bracket Reset: ${match.winner} wins the tournament!`)
        saveFinalRankings(match.winner, match.loser, tournamentType, tournamentId, tournamentName)
      } else {
        progressPlayers(newMatches, matchId, match.winner, match.loser)
        trackPlayerElimination(newMatches, match.loser, tournamentType, tournamentId, tournamentName, bracketSize)
      }

      return newMatches
    })
  }

  const progressPlayers = (allMatches: Record<number, Match>, matchId: number, winner: string, loser: string) => {
    console.log(`[v0] ========== PROGRESSING PLAYERS ==========`)
    console.log(`[v0] Match ${matchId} completed: Winner: ${winner}, Loser: ${loser}`)

    const progressionMap: Record<
      number,
      { winner: { matchId: number; position: 1 | 2 } | null; loser: { matchId: number; position: 1 | 2 } | null }
    > = {
      // Round 1 (Matches 1-16): Winners to Round 2, Losers to Loser Round 1
      1: { winner: { matchId: 25, position: 1 }, loser: { matchId: 17, position: 1 } },
      2: { winner: { matchId: 25, position: 2 }, loser: { matchId: 17, position: 2 } },
      3: { winner: { matchId: 26, position: 1 }, loser: { matchId: 18, position: 1 } },
      4: { winner: { matchId: 26, position: 2 }, loser: { matchId: 18, position: 2 } },
      5: { winner: { matchId: 27, position: 1 }, loser: { matchId: 19, position: 1 } },
      6: { winner: { matchId: 27, position: 2 }, loser: { matchId: 19, position: 2 } },
      7: { winner: { matchId: 28, position: 1 }, loser: { matchId: 20, position: 1 } },
      8: { winner: { matchId: 28, position: 2 }, loser: { matchId: 20, position: 2 } },
      9: { winner: { matchId: 29, position: 1 }, loser: { matchId: 21, position: 1 } },
      10: { winner: { matchId: 29, position: 2 }, loser: { matchId: 21, position: 2 } },
      11: { winner: { matchId: 30, position: 1 }, loser: { matchId: 22, position: 1 } },
      12: { winner: { matchId: 30, position: 2 }, loser: { matchId: 22, position: 2 } },
      13: { winner: { matchId: 31, position: 1 }, loser: { matchId: 23, position: 1 } },
      14: { winner: { matchId: 31, position: 2 }, loser: { matchId: 23, position: 2 } },
      15: { winner: { matchId: 32, position: 1 }, loser: { matchId: 24, position: 1 } },
      16: { winner: { matchId: 32, position: 2 }, loser: { matchId: 24, position: 2 } },

      // Loser Round 1 (Matches 17-24): Winners to Loser Round 2, Losers eliminated
      17: { winner: { matchId: 33, position: 1 }, loser: null },
      18: { winner: { matchId: 34, position: 1 }, loser: null },
      19: { winner: { matchId: 35, position: 1 }, loser: null },
      20: { winner: { matchId: 36, position: 1 }, loser: null },
      21: { winner: { matchId: 37, position: 1 }, loser: null },
      22: { winner: { matchId: 38, position: 1 }, loser: null },
      23: { winner: { matchId: 39, position: 1 }, loser: null },
      24: { winner: { matchId: 40, position: 1 }, loser: null },

      // Round 2 (Matches 25-32): Winners to Round 3, Losers to Loser Round 2
      25: { winner: { matchId: 45, position: 1 }, loser: { matchId: 40, position: 2 } },
      26: { winner: { matchId: 45, position: 2 }, loser: { matchId: 39, position: 2 } },
      27: { winner: { matchId: 46, position: 1 }, loser: { matchId: 38, position: 2 } },
      28: { winner: { matchId: 46, position: 2 }, loser: { matchId: 37, position: 2 } },
      29: { winner: { matchId: 47, position: 1 }, loser: { matchId: 36, position: 2 } },
      30: { winner: { matchId: 47, position: 2 }, loser: { matchId: 35, position: 2 } },
      31: { winner: { matchId: 48, position: 1 }, loser: { matchId: 34, position: 2 } },
      32: { winner: { matchId: 48, position: 2 }, loser: { matchId: 33, position: 2 } },

      // Loser Round 2 (Matches 33-40): Winners to Loser Round 3, Losers eliminated
      33: { winner: { matchId: 41, position: 1 }, loser: null },
      34: { winner: { matchId: 41, position: 2 }, loser: null },
      35: { winner: { matchId: 42, position: 1 }, loser: null },
      36: { winner: { matchId: 42, position: 2 }, loser: null },
      37: { winner: { matchId: 43, position: 1 }, loser: null },
      38: { winner: { matchId: 43, position: 2 }, loser: null },
      39: { winner: { matchId: 44, position: 1 }, loser: null },
      40: { winner: { matchId: 44, position: 2 }, loser: null },

      // Loser Round 3 (Matches 41-44): Winners to Loser Round 4, Losers eliminated
      41: { winner: { matchId: 49, position: 1 }, loser: null },
      42: { winner: { matchId: 50, position: 1 }, loser: null },
      43: { winner: { matchId: 51, position: 1 }, loser: null },
      44: { winner: { matchId: 52, position: 1 }, loser: null },

      // Round 3 (Matches 45-48): Winners to Round 4, Losers to Loser Round 4
      45: { winner: { matchId: 55, position: 1 }, loser: { matchId: 52, position: 2 } },
      46: { winner: { matchId: 55, position: 2 }, loser: { matchId: 51, position: 2 } },
      47: { winner: { matchId: 56, position: 1 }, loser: { matchId: 50, position: 2 } },
      48: { winner: { matchId: 56, position: 2 }, loser: { matchId: 49, position: 2 } },

      // Loser Round 4 (Matches 49-52): Winners to Loser Round 5, Losers eliminated
      49: { winner: { matchId: 53, position: 1 }, loser: null },
      50: { winner: { matchId: 53, position: 2 }, loser: null },
      51: { winner: { matchId: 54, position: 1 }, loser: null },
      52: { winner: { matchId: 54, position: 2 }, loser: null },

      // Loser Round 5 (Matches 53-54): Winners to Loser Round 6, Losers eliminated
      53: { winner: { matchId: 57, position: 1 }, loser: null },
      54: { winner: { matchId: 58, position: 1 }, loser: null },

      // Round 4 (Matches 55-56): Winners to Semi-final, Losers to Loser Round 6
      55: { winner: { matchId: 60, position: 1 }, loser: { matchId: 58, position: 2 } },
      56: { winner: { matchId: 60, position: 2 }, loser: { matchId: 57, position: 2 } },

      // Loser Round 6 (Matches 57-58): Winners to Loser Round 7, Losers eliminated
      57: { winner: { matchId: 59, position: 1 }, loser: null },
      58: { winner: { matchId: 59, position: 2 }, loser: null },

      // Loser Round 7 (Match 59): Winner to Loser Round 8, Loser eliminated
      59: { winner: { matchId: 61, position: 1 }, loser: null },

      // Semi-final (Match 60): Winner to Grand Final, Loser to Loser Round 8
      60: { winner: { matchId: 62, position: 1 }, loser: { matchId: 61, position: 2 } },

      // Loser Round 8 (Match 61): Winner to Grand Final, Loser eliminated
      61: { winner: { matchId: 62, position: 2 }, loser: null },

      // Grand Final (Match 62): If loser bracket player wins, bracket reset
      62: { winner: null, loser: null },

      // Bracket Reset (Match 63): Final match if needed
      63: { winner: null, loser: null },
    }

    const progression = progressionMap[matchId]
    if (!progression) {
      console.log(`[v0] ⚠️ No progression defined for match ${matchId}`)
      return
    }

    if (progression.winner) {
      const { matchId: targetMatch, position } = progression.winner
      console.log(`[v0] ✓ Winner ${winner} progresses to Match ${targetMatch} position ${position}`)

      const targetMatchBefore = { ...allMatches[targetMatch] }

      if (position === 1) {
        allMatches[targetMatch].player1 = winner
      } else {
        allMatches[targetMatch].player2 = winner
      }

      console.log(
        `[v0]   Match ${targetMatch} before: P1="${targetMatchBefore.player1}" P2="${targetMatchBefore.player2}"`,
      )
      console.log(
        `[v0]   Match ${targetMatch} after:  P1="${allMatches[targetMatch].player1}" P2="${allMatches[targetMatch].player2}"`,
      )

      if (allMatches[targetMatch].player1 && allMatches[targetMatch].player2 && !allMatches[targetMatch].winner) {
        console.log(`[v0]   ✓ Match ${targetMatch} now has both players, checking for optimization...`)
        optimizeMatchInRound(allMatches, targetMatch)
        autoResolveFreilosMatch(allMatches, targetMatch)
      }
    } else {
      console.log(`[v0] ✓ Winner ${winner} has no further progression (reached final or waiting)`)
    }

    if (progression.loser) {
      const { matchId: targetMatch, position } = progression.loser
      console.log(`[v0] ↓ Loser ${loser} drops to Match ${targetMatch} position ${position} (1st loss)`)

      const targetMatchBefore = { ...allMatches[targetMatch] }

      if (position === 1) {
        allMatches[targetMatch].player1 = loser
      } else {
        allMatches[targetMatch].player2 = loser
      }

      console.log(
        `[v0]   Match ${targetMatch} before: P1="${targetMatchBefore.player1}" P2="${targetMatchBefore.player2}"`,
      )
      console.log(
        `[v0]   Match ${targetMatch} after:  P1="${allMatches[targetMatch].player1}" P2="${allMatches[targetMatch].player2}"`,
      )

      if (allMatches[targetMatch].player1 && allMatches[targetMatch].player2 && !allMatches[targetMatch].winner) {
        console.log(`[v0]   ✓ Match ${targetMatch} now has both players, checking for optimization...`)
        optimizeMatchInRound(allMatches, targetMatch)
        autoResolveFreilosMatch(allMatches, targetMatch)
      }
    } else {
      console.log(`[v0] ✗ Loser ${loser} is ELIMINATED (2nd loss, no further progression)`)
    }
    console.log(`[v0] ==========================================`)
  }

  const optimizeMatchInRound = (allMatches: Record<number, Match>, matchId: number) => {
    const match = allMatches[matchId]

    if (match.winner) return

    const isP1Freilos = isFreilos(match.player1)
    const isP2Freilos = isFreilos(match.player2)

    if (isP1Freilos && isP2Freilos) {
      const nearbyMatches = findNearbyMatches(matchId)

      for (const nearbyId of nearbyMatches) {
        const nearbyMatch = allMatches[nearbyId]

        if (!nearbyMatch.player1 || !nearbyMatch.player2 || nearbyMatch.winner) continue

        const isNearbyP1Freilos = isFreilos(nearbyMatch.player1)
        const isNearbyP2Freilos = isFreilos(nearbyMatch.player2)

        if (!isNearbyP1Freilos && !isNearbyP2Freilos) {
          const temp = match.player2
          match.player2 = nearbyMatch.player2
          nearbyMatch.player2 = temp
          console.log(
            `[v0] Optimized: Swapped ${nearbyMatch.player2} from Match ${nearbyId} with ${match.player2} from Match ${matchId}`,
          )
          return
        }

        if (!isNearbyP1Freilos && isNearbyP2Freilos) {
          const temp = match.player1
          match.player1 = nearbyMatch.player2
          nearbyMatch.player2 = temp
          console.log(`[v0] Optimized: Swapped Freilos from Match ${nearbyId} with Freilos from Match ${matchId}`)
          return
        }

        if (isNearbyP1Freilos && !isNearbyP2Freilos) {
          const temp = match.player1
          match.player1 = nearbyMatch.player1
          nearbyMatch.player1 = temp
          console.log(`[v0] Optimized: Swapped Freilos from Match ${nearbyId} with Freilos from Match ${matchId}`)
          return
        }
      }
    } else if (!isP1Freilos && !isP2Freilos) {
      const nearbyMatches = findNearbyMatches(matchId)

      for (const nearbyId of nearbyMatches) {
        const nearbyMatch = allMatches[nearbyId]

        if (!nearbyMatch.player1 || !nearbyMatch.player2 || nearbyMatch.winner) continue

        const isNearbyP1Freilos = isFreilos(nearbyMatch.player1)
        const isNearbyP2Freilos = isFreilos(nearbyMatch.player2)

        if (isNearbyP1Freilos && isNearbyP2Freilos) {
          const temp = match.player2
          match.player2 = nearbyMatch.player2
          nearbyMatch.player2 = temp
          console.log(
            `[v0] Optimized: Swapped ${match.player2} from Match ${matchId} with ${nearbyMatch.player2} from Match ${nearbyId}`,
          )
          return
        }
      }
    }
  }

  const findNearbyMatches = (matchId: number): number[] => {
    const rounds: Record<string, number[]> = {
      round1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      loser1: [17, 18, 19, 20, 21, 22, 23, 24],
      round2: [25, 26, 27, 28, 29, 30, 31, 32],
      loser2: [33, 34, 35, 36, 37, 38, 39, 40],
      loser3: [41, 42, 43, 44],
      round3: [45, 46, 47, 48],
      loser4: [49, 50, 51, 52],
      loser5: [53, 54],
      round4: [55, 56],
      loser6: [57, 58],
      loser7: [59],
      semi: [60],
      loser8: [61],
      final: [62],
      reset: [63],
    }

    for (const [roundName, matches] of Object.entries(rounds)) {
      if (matches.includes(matchId)) {
        return matches.filter((id) => id !== matchId)
      }
    }

    return []
  }

  const handleCancelClick = () => {
    setCancelDialogOpen(true)
  }

  const handleConfirmCancel = async () => {
    setCancelDialogOpen(false)
    await markTournamentAsCancelled(tournamentId)
    await deleteMatchStatesFromDatabase(tournamentType, tournamentId)
    await deleteRankingsFromDatabase(tournamentType, tournamentId)
    await deleteFreiloseFromDatabase(tournamentType, tournamentId)
    await clearTournamentRegistration(tournamentId)
    router.push("/dko_tournament_registration")
  }

  const resetMatch = async (matchId: number) => {
    const match = matches[matchId]

    if (matchId === 62 || matchId === 63) {
      console.log(`[v0] Resetting finale Match ${matchId}, removing both players from rankings...`)

      if (match.player1) {
        await removePlayerFromRankings(match.player1, tournamentType, tournamentId)
      }
      if (match.player2) {
        await removePlayerFromRankings(match.player2, tournamentType, tournamentId)
      }
    } else {
      const oldLoser = match.loser

      if (oldLoser) {
        const lossMatches = Object.values(matches).filter((m) => m.loser === oldLoser && m.winner)
        const losses = lossMatches.length

        console.log(`[v0] Resetting Match ${matchId}: ${oldLoser} had ${losses} losses before reset`)

        if (losses === 2) {
          console.log(`[v0] ${oldLoser} was eliminated, removing from rankings...`)
          await removePlayerFromRankings(oldLoser, tournamentType, tournamentId)
        }
      }
    }

    setMatches((prev) => {
      const newMatches = { ...prev }
      const match = newMatches[matchId]

      const oldWinner = match.winner
      const oldLoser = match.loser

      newMatches[matchId] = {
        ...match,
        score1: 0,
        score2: 0,
        winner: undefined,
        loser: undefined,
        machineNumber: undefined,
      }

      if (oldWinner || oldLoser) {
        clearSubsequentMatches(newMatches, matchId, oldWinner, oldLoser)
      }

      return newMatches
    })
  }

  const clearSubsequentMatches = (
    allMatches: Record<number, Match>,
    matchId: number,
    winner?: string,
    loser?: string,
  ) => {
    // Clear winners from subsequent matches
    if (matchId >= 1 && matchId <= 2) {
      if (allMatches[25]?.player1 === winner) allMatches[25].player1 = ""
      if (allMatches[25]?.player2 === winner) allMatches[25].player2 = ""
    } else if (matchId >= 3 && matchId <= 4) {
      if (allMatches[26]?.player1 === winner) allMatches[26].player1 = ""
      if (allMatches[26]?.player2 === winner) allMatches[26].player2 = ""
    } else if (matchId >= 5 && matchId <= 6) {
      if (allMatches[27]?.player1 === winner) allMatches[27].player1 = ""
      if (allMatches[27]?.player2 === winner) allMatches[27].player2 = ""
    } else if (matchId >= 7 && matchId <= 8) {
      if (allMatches[28]?.player1 === winner) allMatches[28].player1 = ""
      if (allMatches[28]?.player2 === winner) allMatches[28].player2 = ""
    } else if (matchId >= 9 && matchId <= 10) {
      if (allMatches[29]?.player1 === winner) allMatches[29].player1 = ""
      if (allMatches[29]?.player2 === winner) allMatches[29].player2 = ""
    } else if (matchId >= 11 && matchId <= 12) {
      if (allMatches[30]?.player1 === winner) allMatches[30].player1 = ""
      if (allMatches[30]?.player2 === winner) allMatches[30].player2 = ""
    } else if (matchId >= 13 && matchId <= 14) {
      if (allMatches[31]?.player1 === winner) allMatches[31].player1 = ""
      if (allMatches[31]?.player2 === winner) allMatches[31].player2 = ""
    } else if (matchId >= 15 && matchId <= 16) {
      if (allMatches[32]?.player1 === winner) allMatches[32].player1 = ""
      if (allMatches[32]?.player2 === winner) allMatches[32].player2 = ""
    } else if (matchId >= 25 && matchId <= 26) {
      if (allMatches[45]?.player1 === winner) allMatches[45].player1 = ""
      if (allMatches[45]?.player2 === winner) allMatches[45].player2 = ""
    } else if (matchId >= 27 && matchId <= 28) {
      if (allMatches[46]?.player1 === winner) allMatches[46].player1 = ""
      if (allMatches[46]?.player2 === winner) allMatches[46].player2 = ""
    } else if (matchId >= 29 && matchId <= 30) {
      if (allMatches[47]?.player1 === winner) allMatches[47].player1 = ""
      if (allMatches[47]?.player2 === winner) allMatches[47].player2 = ""
    } else if (matchId >= 31 && matchId <= 32) {
      if (allMatches[48]?.player1 === winner) allMatches[48].player1 = ""
      if (allMatches[48]?.player2 === winner) allMatches[48].player2 = ""
    } else if (matchId >= 45 && matchId <= 46) {
      if (allMatches[55]?.player1 === winner) allMatches[55].player1 = ""
      if (allMatches[55]?.player2 === winner) allMatches[55].player2 = ""
    } else if (matchId >= 47 && matchId <= 48) {
      if (allMatches[56]?.player1 === winner) allMatches[56].player1 = ""
      if (allMatches[56]?.player2 === winner) allMatches[56].player2 = ""
    } else if (matchId >= 55 && matchId <= 56) {
      if (allMatches[60]?.player1 === winner) allMatches[60].player1 = ""
      if (allMatches[60]?.player2 === winner) allMatches[60].player2 = ""
    } else if (matchId === 60) {
      if (allMatches[62]?.player1 === winner) allMatches[62].player1 = ""
    } else if (matchId === 62 && winner === allMatches[62].player1) {
      if (allMatches[63]?.player1 === winner) allMatches[63].player1 = ""
      if (allMatches[63]?.player2 === winner) allMatches[63].player2 = ""
    }

    // Clear losers from subsequent Loser Bracket matches
    if (matchId >= 1 && matchId <= 2) {
      if (allMatches[17]?.player1 === loser) allMatches[17].player1 = ""
      if (allMatches[17]?.player2 === loser) allMatches[17].player2 = ""
    } else if (matchId >= 3 && matchId <= 4) {
      if (allMatches[18]?.player1 === loser) allMatches[18].player1 = ""
      if (allMatches[18]?.player2 === loser) allMatches[18].player2 = ""
    } else if (matchId >= 5 && matchId <= 6) {
      if (allMatches[19]?.player1 === loser) allMatches[19].player1 = ""
      if (allMatches[19]?.player2 === loser) allMatches[19].player2 = ""
    } else if (matchId >= 7 && matchId <= 8) {
      if (allMatches[20]?.player1 === loser) allMatches[20].player1 = ""
      if (allMatches[20]?.player2 === loser) allMatches[20].player2 = ""
    } else if (matchId >= 9 && matchId <= 10) {
      if (allMatches[21]?.player1 === loser) allMatches[21].player1 = ""
      if (allMatches[21]?.player2 === loser) allMatches[21].player2 = ""
    } else if (matchId >= 11 && matchId <= 12) {
      if (allMatches[22]?.player1 === loser) allMatches[22].player1 = ""
      if (allMatches[22]?.player2 === loser) allMatches[22].player2 = ""
    } else if (matchId >= 13 && matchId <= 14) {
      if (allMatches[23]?.player1 === loser) allMatches[23].player1 = ""
      if (allMatches[23]?.player2 === loser) allMatches[23].player2 = ""
    } else if (matchId >= 15 && matchId <= 16) {
      if (allMatches[24]?.player1 === loser) allMatches[24].player1 = ""
      if (allMatches[24]?.player2 === loser) allMatches[24].player2 = ""
    } else if (matchId >= 25 && matchId <= 26) {
      if (allMatches[40]?.player1 === loser) allMatches[40].player1 = ""
      if (allMatches[40]?.player2 === loser) allMatches[40].player2 = ""
      if (allMatches[39]?.player1 === loser) allMatches[39].player1 = ""
      if (allMatches[39]?.player2 === loser) allMatches[39].player2 = ""
    } else if (matchId >= 27 && matchId <= 28) {
      if (allMatches[38]?.player1 === loser) allMatches[38].player1 = ""
      if (allMatches[38]?.player2 === loser) allMatches[38].player2 = ""
      if (allMatches[37]?.player1 === loser) allMatches[37].player1 = ""
      if (allMatches[37]?.player2 === loser) allMatches[37].player2 = ""
    } else if (matchId >= 29 && matchId <= 30) {
      if (allMatches[36]?.player1 === loser) allMatches[36].player1 = ""
      if (allMatches[36]?.player2 === loser) allMatches[36].player2 = ""
      if (allMatches[35]?.player1 === loser) allMatches[35].player1 = ""
      if (allMatches[35]?.player2 === loser) allMatches[35].player2 = ""
    } else if (matchId >= 31 && matchId <= 32) {
      if (allMatches[34]?.player1 === loser) allMatches[34].player1 = ""
      if (allMatches[34]?.player2 === loser) allMatches[34].player2 = ""
      if (allMatches[33]?.player1 === loser) allMatches[33].player1 = ""
      if (allMatches[33]?.player2 === loser) allMatches[33].player2 = ""
    } else if (matchId >= 33 && matchId <= 34) {
      if (allMatches[41]?.player1 === loser) allMatches[41].player1 = ""
      if (allMatches[41]?.player2 === loser) allMatches[41].player2 = ""
    } else if (matchId >= 35 && matchId <= 36) {
      if (allMatches[42]?.player1 === loser) allMatches[42].player1 = ""
      if (allMatches[42]?.player2 === loser) allMatches[42].player2 = ""
    } else if (matchId >= 37 && matchId <= 38) {
      if (allMatches[43]?.player1 === loser) allMatches[43].player1 = ""
      if (allMatches[43]?.player2 === loser) allMatches[43].player2 = ""
    } else if (matchId >= 39 && matchId <= 40) {
      if (allMatches[44]?.player1 === loser) allMatches[44].player1 = ""
      if (allMatches[44]?.player2 === loser) allMatches[44].player2 = ""
    } else if (matchId >= 45 && matchId <= 46) {
      if (allMatches[52]?.player1 === loser) allMatches[52].player1 = ""
      if (allMatches[52]?.player2 === loser) allMatches[52].player2 = ""
      if (allMatches[51]?.player1 === loser) allMatches[51].player1 = ""
      if (allMatches[51]?.player2 === loser) allMatches[51].player2 = ""
    } else if (matchId >= 47 && matchId <= 48) {
      if (allMatches[50]?.player1 === loser) allMatches[50].player1 = ""
      if (allMatches[50]?.player2 === loser) allMatches[50].player2 = ""
      if (allMatches[49]?.player1 === loser) allMatches[49].player1 = ""
      if (allMatches[49]?.player2 === loser) allMatches[49].player2 = ""
    } else if (matchId >= 49 && matchId <= 50) {
      if (allMatches[53]?.player1 === loser) allMatches[53].player1 = ""
      if (allMatches[53]?.player2 === loser) allMatches[53].player2 = ""
    } else if (matchId >= 51 && matchId <= 52) {
      if (allMatches[54]?.player1 === loser) allMatches[54].player1 = ""
      if (allMatches[54]?.player2 === loser) allMatches[54].player2 = ""
    } else if (matchId >= 55 && matchId <= 56) {
      if (allMatches[58]?.player1 === loser) allMatches[58].player1 = ""
      if (allMatches[58]?.player2 === loser) allMatches[58].player2 = ""
      if (allMatches[57]?.player1 === loser) allMatches[57].player1 = ""
      if (allMatches[57]?.player2 === loser) allMatches[57].player2 = ""
    } else if (matchId >= 57 && matchId <= 58) {
      if (allMatches[59]?.player1 === loser) allMatches[59].player1 = ""
      if (allMatches[59]?.player2 === loser) allMatches[59].player2 = ""
    } else if (matchId === 59) {
      if (allMatches[61]?.player1 === loser) allMatches[61].player1 = ""
    } else if (matchId === 60) {
      if (allMatches[61]?.player2 === loser) allMatches[61].player2 = ""
    } else if (matchId === 61) {
      if (allMatches[62]?.player2 === loser) allMatches[62].player2 = ""
    } else if (matchId === 62) {
      if (allMatches[63]?.player1 === loser) allMatches[63].player1 = ""
      if (allMatches[63]?.player2 === loser) allMatches[63].player2 = ""
    }
  }

  const autoResolveFreilosMatch = (allMatches: Record<number, Match>, matchId: number) => {
    const match = allMatches[matchId]

    if (match.winner) return

    const isP1Freilos = isFreilos(match.player1)
    const isP2Freilos = isFreilos(match.player2)

    if ((isP1Freilos && isP2Freilos) || (!isP1Freilos && !isP2Freilos)) {
      return
    }

    const realPlayer = isP1Freilos ? match.player2 : match.player1
    const freilosPlayer = isP1Freilos ? match.player1 : match.player2

    match.winner = realPlayer
    match.loser = freilosPlayer
    match.score1 = isP1Freilos ? 0 : 2
    match.score2 = isP2Freilos ? 0 : 2

    console.log(`[v0] Auto-resolved Match ${matchId}: ${realPlayer} beats ${freilosPlayer} 2:0`)

    progressPlayers(allMatches, matchId, realPlayer, freilosPlayer)
  }

  useEffect(() => {
    const fetchRegisteredPlayers = async () => {
      if (initializingRef.current) {
        console.log("[v0] Already initializing, skipping duplicate call")
        return
      }

      initializingRef.current = true

      try {
        const urlTournamentId = searchParams.get("tournamentId")
        const urlTournamentName = searchParams.get("tournamentName")
        let currentTournamentId: string

        if (urlTournamentId) {
          currentTournamentId = urlTournamentId
          console.log("[v0] Using existing tournament ID from URL:", currentTournamentId)
        } else {
          currentTournamentId = crypto.randomUUID()
          console.log("[v0] Generated new tournament ID:", currentTournamentId)

          const newUrl = new URL(window.location.href)
          newUrl.searchParams.set("tournamentId", currentTournamentId)
          if (urlTournamentName) {
            newUrl.searchParams.set("tournamentName", urlTournamentName)
          }
          newUrl.searchParams.delete("shuffle")
          window.history.replaceState({}, "", newUrl.toString())
        }

        setTournamentId(currentTournamentId)

        if (urlTournamentName) {
          const decodedName = decodeURIComponent(urlTournamentName)
          setTournamentName(decodedName)
          console.log("[v0] Tournament name from URL:", decodedName)
        } else {
          setTournamentName("Unbenanntes Turnier")
          console.log("[v0] No tournament name provided, using default")
        }

        const savedMatches = await loadMatchStatesFromDatabase(tournamentType, currentTournamentId)

        if (savedMatches) {
          console.log("[v0] ✓ Loaded saved tournament state - tournament will continue from where it left off")
          setMatches(savedMatches)
          setLoading(false)
          return
        }

        console.log("[v0] No saved state found - initializing new tournament")

        const { error: statusError } = await supabase.from("tournaments_status").insert({
          tournament_id: currentTournamentId,
          tournament_type: tournamentType,
          tournament_name: urlTournamentName ? decodeURIComponent(urlTournamentName) : "Unbenanntes Turnier",
          status: "active",
        })

        if (statusError && statusError.code !== "23505") {
          console.error("[v0] Error creating tournament status:", statusError)
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
            console.log("[v0] No existing Freilose found, creating new ones")
            playerNames = distributePlayersWithFreilose(playerNames, bracketSize)

            const freilose = playerNames.filter((name) => isFreilos(name))
            if (freilose.length > 0) {
              console.log("[v0] Saving", freilose.length, "Freilose to database")
              await saveFreiloseToDatabase(freilose, tournamentType, currentTournamentId)
            }
          } else {
            console.log("[v0] Using existing Freilose from database:", existingFreilose)
            const freilosCount = bracketSize - playerNames.length
            if (freilosCount > 0) {
              playerNames = [...playerNames, ...existingFreilose.slice(0, freilosCount)]
            }
          }

          setMatches((prev) => {
            const newMatches = { ...prev }

            const firstRoundMatches = bracketSize / 2
            for (let i = 0; i < firstRoundMatches; i++) {
              const matchId = i + 1
              const player1Index = i * 2
              const player2Index = i * 2 + 1

              newMatches[matchId] = {
                ...newMatches[matchId],
                player1: playerNames[player1Index] || "",
                player2: playerNames[player2Index] || "",
              }
            }

            return newMatches
          })
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

  const availableMachines = getAvailableMachines()

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {bracketSize}er DKO - {tournamentName}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchRankings} variant="outline" disabled={loadingRankings || !tournamentId}>
              {loadingRankings ? "Lädt..." : "Rangliste"}
            </Button>
            <Button onClick={handleCancelClick} variant="outline">
              Abbrechen
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Runde 1 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-orange-600 border-b-2 border-orange-600 pb-2">Runde 1</h2>
            {[...Array(16)].map((_, i) => (
              <MatchCard
                key={i + 1}
                match={matches[i + 1]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
              />
            ))}
          </div>

          {/* Verlierer-Runde 1 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 1</h2>
            {[...Array(8)].map((_, i) => (
              <MatchCard
                key={i + 17}
                match={matches[i + 17]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                isLoser
              />
            ))}
          </div>

          {/* Runde 2 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2">Runde 2</h2>
            {[...Array(8)].map((_, i) => (
              <MatchCard
                key={i + 25}
                match={matches[i + 25]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
              />
            ))}
          </div>

          {/* Verlierer-Runde 2 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 2</h2>
            {[...Array(8)].map((_, i) => (
              <MatchCard
                key={i + 33}
                match={matches[i + 33]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                isLoser
              />
            ))}
          </div>

          {/* Verlierer-Runde 3 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 3</h2>
            {[...Array(4)].map((_, i) => (
              <MatchCard
                key={i + 41}
                match={matches[i + 41]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                isLoser
              />
            ))}
          </div>

          {/* Runde 3 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2">Runde 3</h2>
            {[...Array(4)].map((_, i) => (
              <MatchCard
                key={i + 45}
                match={matches[i + 45]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
              />
            ))}
          </div>

          {/* Verlierer-Runde 4 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 4</h2>
            {[...Array(4)].map((_, i) => (
              <MatchCard
                key={i + 49}
                match={matches[i + 49]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                isLoser
              />
            ))}
          </div>

          {/* Verlierer-Runde 5 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 5</h2>
            {[...Array(2)].map((_, i) => (
              <MatchCard
                key={i + 53}
                match={matches[i + 53]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                isLoser
              />
            ))}
          </div>

          {/* Runde 4 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2">Runde 4</h2>
            {[...Array(2)].map((_, i) => (
              <MatchCard
                key={i + 55}
                match={matches[i + 55]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
              />
            ))}
          </div>

          {/* Verlierer-Runde 6 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 6</h2>
            {[...Array(2)].map((_, i) => (
              <MatchCard
                key={i + 57}
                match={matches[i + 57]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                isLoser
              />
            ))}
          </div>

          {/* Verlierer-Runde 7 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 7</h2>
            <MatchCard
              match={matches[59]}
              onScoreUpdate={updateScore}
              onConfirm={confirmMatch}
              onStartMatch={startMatch}
              onReset={resetMatch}
              isLoser
            />
          </div>

          {/* Halbfinale */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2">Halbfinale</h2>
            <MatchCard
              match={matches[60]}
              onScoreUpdate={updateScore}
              onConfirm={confirmMatch}
              onStartMatch={startMatch}
              onReset={resetMatch}
            />
          </div>

          {/* Verlierer-Runde 8 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 8</h2>
            <MatchCard
              match={matches[61]}
              onScoreUpdate={updateScore}
              onConfirm={confirmMatch}
              onStartMatch={startMatch}
              onReset={resetMatch}
              isLoser
            />
          </div>

          {/* Großes Finale */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2">Großes Finale</h2>
            <p className="text-sm text-muted-foreground">Sieger Gewinnerseite vs. Sieger Verliererseite</p>
            <MatchCard
              match={matches[62]}
              onScoreUpdate={updateScore}
              onConfirm={confirmMatch}
              onStartMatch={startMatch}
              onReset={resetMatch}
              isGrandFinal
            />
          </div>

          {/* Bracket Reset */}
          {(matches[63].player1 ||
            matches[63].player2 ||
            (matches[62].winner === matches[62].player2 && matches[62].winner)) &&
            !matches[63].winner && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-purple-600 border-b-2 border-purple-600 pb-2">Bracket Reset</h2>
                <p className="text-sm text-muted-foreground">
                  Der Spieler von der Verliererseite hat gewonnen! Beide Spieler haben jetzt je 1 Niederlage.
                </p>
                <MatchCard
                  match={matches[63]}
                  onScoreUpdate={updateScore}
                  onConfirm={confirmMatch}
                  onStartMatch={startMatch}
                  onReset={resetMatch}
                  isGrandFinal
                />
              </div>
            )}

          {/* Tournament Winner */}
          {(matches[63].winner || (matches[62].winner === matches[62].player1 && matches[62].player1)) && (
            <Card className="p-6 bg-primary text-primary-foreground">
              <h3 className="text-2xl font-bold text-center">🏆 Turniersieger</h3>
              <p className="text-3xl font-bold text-center mt-4">{matches[63].winner || matches[62].winner}</p>

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
                    await clearTournamentRegistration(tournamentId)
                    router.push("/dko_tournament_registration")
                  }}
                  size="lg"
                  variant="outline"
                  className="font-semibold bg-background text-foreground hover:bg-background/90"
                >
                  Weiter zu Ergebnissen
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={machineDialogOpen} onOpenChange={setMachineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Automat auswählen</DialogTitle>
            <DialogDescription>Wähle einen verfügbaren Automaten für Match {selectedMatchId}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 py-4">
            {availableMachines.length === 0 ? (
              <p className="col-span-4 text-center text-muted-foreground">Keine Automaten verfügbar</p>
            ) : (
              availableMachines.map((num) => (
                <Button key={num} onClick={() => assignMachine(num)} variant="outline" className="h-16 text-lg">
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
          <div className="flex gap-3 justify-end mt-4">
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
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tabelle</DialogTitle>
            <DialogDescription>Aktuelle Platzierungen im Turnier</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {rankings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Noch keine Platzierungen vorhanden</p>
            ) : (
              rankings.map((ranking) => (
                <div
                  key={`${ranking.placement}-${ranking.player_name}`}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    ranking.placement === 1 && "bg-yellow-50 border-yellow-400",
                    ranking.placement === 2 && "bg-gray-100 border-gray-400",
                    ranking.placement === 3 && "bg-orange-50 border-orange-400",
                    ranking.placement > 3 && "bg-muted",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "text-2xl font-bold w-8 text-center",
                        ranking.placement === 1 && "text-yellow-600",
                        ranking.placement === 2 && "text-gray-600",
                        ranking.placement === 3 && "text-orange-600",
                        ranking.placement > 3 && "text-muted-foreground",
                      )}
                    >
                      {ranking.placement === 1
                        ? "🥇"
                        : ranking.placement === 2
                          ? "🥈"
                          : ranking.placement === 3
                            ? "🥉"
                            : ranking.placement}
                    </span>
                    <span className="font-medium">{ranking.player_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Platz {ranking.placement}</span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface MatchCardProps {
  match: Match
  onScoreUpdate: (matchId: number, player: 1 | 2, score: number) => void
  onConfirm: (matchId: number) => void
  onStartMatch: (matchId: number) => void
  onReset: (matchId: number) => void
  isLoser?: boolean
  isGrandFinal?: boolean
}

function MatchCard({ match, onScoreUpdate, onConfirm, onStartMatch, onReset, isLoser, isGrandFinal }: MatchCardProps) {
  const isPlayer1Winner = match.winner === match.player1
  const isPlayer2Winner = match.winner === match.player2
  const isPlayer1Loser = match.loser === match.player1
  const isPlayer2Loser = match.loser === match.player2
  const isRunning = match.machineNumber && !match.winner
  const canConfirm =
    match.machineNumber && !match.winner && match.score1 !== match.score2 && (match.score1 > 0 || match.score2 > 0)

  const hasFreilos = isFreilos(match.player1) || isFreilos(match.player2)

  return (
    <Card
      className={cn(
        "p-3 space-y-2 transition-all",
        isGrandFinal && "border-2 border-primary shadow-lg",
        isLoser && "border-l-4 border-l-destructive",
        isRunning && "border-2 border-orange-500 shadow-lg shadow-orange-500/20 bg-orange-50/50",
        hasFreilos && !match.winner && "border-l-4 border-l-yellow-500 bg-yellow-50/30",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-muted-foreground">Match {match.id}</span>
        <div className="flex items-center gap-2">
          {match.machineNumber && !match.winner && (
            <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded animate-pulse">
              🎯 Automat {match.machineNumber}
            </span>
          )}
          {canConfirm && (
            <Button
              size="sm"
              onClick={() => onConfirm(match.id)}
              className="h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Check className="h-3 w-3 mr-1" />
              Bestätigen
            </Button>
          )}
          {match.winner && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onReset(match.id)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              title="Match zurücksetzen"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
          {!match.machineNumber && !match.winner && match.player1 && match.player2 && (
            <Button size="sm" onClick={() => onStartMatch(match.id)} className="h-6 text-xs">
              {hasFreilos ? "Auto" : "Starten"}
            </Button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-md transition-colors",
          isPlayer1Winner && "bg-orange-100 border-2 border-orange-500",
          isPlayer1Loser && "bg-red-100 border border-red-300",
          !isPlayer1Winner && !isPlayer1Loser && "bg-muted",
          isFreilos(match.player1) && "bg-yellow-100 border border-yellow-400",
        )}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p
            className={cn(
              "text-sm truncate",
              !match.player1 && "text-muted-foreground italic",
              isPlayer1Winner && "font-semibold text-orange-700",
              isPlayer1Loser && "text-red-600",
              isFreilos(match.player1) && "text-yellow-700 italic font-medium",
            )}
          >
            {match.player1 || "Warte auf Spieler..."}
          </p>
          {isPlayer1Winner && <span className="text-orange-600 font-bold">✓</span>}
        </div>
        <Input
          type="number"
          min="0"
          max="2"
          value={match.score1}
          onChange={(e) => onScoreUpdate(match.id, 1, Number.parseInt(e.target.value) || 0)}
          className="w-16 h-8 text-center"
          disabled={!match.player1 || !match.player2 || !match.machineNumber}
        />
      </div>

      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-md transition-colors",
          isPlayer2Winner && "bg-orange-100 border-2 border-orange-500",
          isPlayer2Loser && "bg-red-100 border border-red-300",
          !isPlayer2Winner && !isPlayer2Loser && "bg-muted",
          isFreilos(match.player2) && "bg-yellow-100 border border-yellow-400",
        )}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p
            className={cn(
              "text-sm truncate",
              !match.player2 && "text-muted-foreground italic",
              isPlayer2Winner && "font-semibold text-orange-700",
              isPlayer2Loser && "text-red-600",
              isFreilos(match.player2) && "text-yellow-700 italic font-medium",
            )}
          >
            {match.player2 || "Warte auf Spieler..."}
          </p>
          {isPlayer2Winner && <span className="text-orange-600 font-bold">✓</span>}
        </div>
        <Input
          type="number"
          min="0"
          max="2"
          value={match.score2}
          onChange={(e) => onScoreUpdate(match.id, 2, Number.parseInt(e.target.value) || 0)}
          className="w-16 h-8 text-center"
          disabled={!match.player1 || !match.player2 || !match.machineNumber}
        />
      </div>
    </Card>
  )
}
