"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { VsIntroOverlay } from "@/components/vs-intro-overlay"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RotateCcw, Check, Radio, Activity, Clock3, Trophy } from "lucide-react"
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
  playerIdMap: Record<string, string>,

) => {
  try {
    const getId = (name: string) => {
      const key = (name ?? "").toLowerCase().trim()
      if (!key || key.startsWith("freilos")) return null
      return playerIdMap[key] ?? null
    }

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
    if (matchId >= 17 && matchId <= 24) return 25
    if (matchId >= 33 && matchId <= 40) return 17
    if (matchId >= 41 && matchId <= 44) return 13
    if (matchId >= 49 && matchId <= 52) return 9
    if (matchId === 53 || matchId === 54) return 7
    if (matchId === 57 || matchId === 58) return 5
    if (matchId === 59) return 4
    if (matchId === 61) return 3
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
  const [vsIntro, setVsIntro] = useState<{ open: boolean; player1: string; player2: string; machineNumber?: number }>(() => ({
    open: false,
    player1: "",
    player2: "",
    machineNumber: undefined,
  }))

  const isRemoteUpdateRef = useRef(false)
  const autoResolveRanRef = useRef(false)

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

  const [announcementsEnabled, setAnnouncementsEnabled] = useState(false)
  const [playerIdMap, setPlayerIdMap] = useState<Record<string, string>>({})

  const { announce } = useSpeechAnnouncer({ enabled: announcementsEnabled })

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

    for (let i = 17; i <= 24; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    for (let i = 25; i <= 32; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    for (let i = 33; i <= 40; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    for (let i = 41; i <= 44; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    for (let i = 45; i <= 48; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    for (let i = 49; i <= 52; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    for (let i = 53; i <= 54; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    for (let i = 55; i <= 56; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    for (let i = 57; i <= 58; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    initialMatches[59] = { id: 59, player1: "", player2: "", score1: 0, score2: 0 }
    initialMatches[60] = { id: 60, player1: "", player2: "", score1: 0, score2: 0 }
    initialMatches[61] = { id: 61, player1: "", player2: "", score1: 0, score2: 0 }
    initialMatches[62] = { id: 62, player1: "", player2: "", score1: 0, score2: 0 }
    initialMatches[63] = { id: 63, player1: "", player2: "", score1: 0, score2: 0 }

    return initialMatches
  }

  const [matches, setMatches] = useState<Record<number, Match>>(() => initializeMatches())
  useEffect(() => {
    const fetchPlayerIds = async () => {
      try {
        const { data, error } = await supabase.from("spieldatenbank").select("id, name")

        if (error) {
          console.error("Error fetching player ids:", error)
          return
        }

        const idMap: Record<string, string> = {}
        ;(data ?? []).forEach((p) => {
          if (p?.name && p?.id) idMap[p.name.toLowerCase().trim()] = p.id
        })

        setPlayerIdMap(idMap)
        console.log("[v0] Player IDs loaded:", Object.keys(idMap).length)
      } catch (err) {
        console.error("Error fetching player ids:", err)
      }
    }

    fetchPlayerIds()
  }, [])



  useEffect(() => {
    // Prevent save loops on realtime updates
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false
      return
    }

    if (!loading && tournamentId) {
      const timeoutId = setTimeout(() => {
        saveMatchStatesToDatabase(matches, tournamentType, tournamentId, playerIdMap)
      }, 1000)

      return () => clearTimeout(timeoutId)
    }
  }, [matches, tournamentType, tournamentId, loading, playerIdMap])


  // Realtime: when players enter results in the LIVE view, progress the bracket here (admin view) too.
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

          let progressedMatches: Record<number, Match> | null = null
          let didProgress = false

          setMatches((prev) => {
            const next = { ...prev }
            const prevMatch = next[record.match_id] || {
              id: record.match_id,
              player1: "",
              player2: "",
              score1: 0,
              score2: 0,
              callCount: 1,
            }

            const wasFinished = Boolean(prevMatch.winner)
            const isFinishedNow = Boolean(record.winner)

            next[record.match_id] = {
              ...prevMatch,
              id: record.match_id,
              player1: record.player1 || "",
              player2: record.player2 || "",
              score1: record.score1 || 0,
              score2: record.score2 || 0,
              winner: record.winner || undefined,
              loser: record.loser || undefined,
              machineNumber: record.machine_number || undefined,
            }

            // Only auto-progress once: when a match transitions from "no winner" -> "has winner"
            if (!wasFinished && isFinishedNow && record.winner && record.loser) {
              // Clear machine/call info locally
              next[record.match_id] = {
                ...next[record.match_id],
                machineNumber: undefined,
                callCount: 1,
              }

              if (record.match_id === 62) {
                if (record.winner === next[62].player1) {
                  // Winner's bracket player wins the grand final
                  saveFinalRankings(record.winner, record.loser, tournamentType, tournamentId, tournamentName)
                } else {
                  // Loser's bracket player wins -> bracket reset match 63
                  next[63].player1 = next[62].player1
                  next[63].player2 = next[62].player2
                }
              } else if (record.match_id === 63) {
                saveFinalRankings(record.winner, record.loser, tournamentType, tournamentId, tournamentName)
              } else {
                progressPlayers(next, record.match_id, record.winner, record.loser)
                trackPlayerElimination(next, record.loser, tournamentType, tournamentId, tournamentName, bracketSize)
              }

              didProgress = true
              progressedMatches = next
            }

            return next
          })

          if (didProgress && progressedMatches) {
            // Persist derived progression without relying on the normal save effect (which is skipped for remote updates)
            saveMatchStatesToDatabase(progressedMatches, tournamentType, tournamentId, playerIdMap)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loading, tournamentId, tournamentType, tournamentName, bracketSize, playerIdMap])
  useEffect(() => {
    if (loading || !tournamentId || autoResolveRanRef.current) return

    autoResolveRanRef.current = true

    const timer = setTimeout(() => {
      setMatches((prev) => {
        const newMatches = { ...prev }
        let hasChanges = false

        Object.values(newMatches).forEach((match: Match) => {
          if (match.winner || !match.player1 || !match.player2) return

          const isP1Freilos = isFreilos(match.player1)
          const isP2Freilos = isFreilos(match.player2)

          if (!isP1Freilos && !isP2Freilos) return

          const realPlayer = isP1Freilos ? match.player2 : match.player1
          const freilosPlayer = isP1Freilos ? match.player1 : match.player2

          console.log(`[v0] Auto-resolving Freilos match ${match.id}: ${realPlayer} beats ${freilosPlayer}`)

          match.winner = realPlayer
          match.loser = freilosPlayer
          match.score1 = isP1Freilos ? 0 : 2
          match.score2 = isP2Freilos ? 0 : 2

          if (match.id === 62) {
            if (match.winner === match.player1) {
              saveFinalRankings(match.winner, match.loser, tournamentType, tournamentId, tournamentName)
            } else {
              newMatches[63].player1 = match.player1
              newMatches[63].player2 = match.player2
            }
          } else if (match.id === 63) {
            saveFinalRankings(match.winner, match.loser, tournamentType, tournamentId, tournamentName)
          } else {
            progressPlayers(newMatches, match.id, realPlayer, freilosPlayer)
            trackPlayerElimination(newMatches, freilosPlayer, tournamentType, tournamentId, tournamentName, bracketSize)
          }

          hasChanges = true
        })

        autoResolveRanRef.current = false
        return hasChanges ? newMatches : prev
      })
    }, 100)

    return () => clearTimeout(timer)
  }, [matches, loading, tournamentType, tournamentId, tournamentName, bracketSize])

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
        tiersBelow[placement] = sortedPlacements.length - index - 1
      })

      console.log("[v0] Placement counts:", placementCounts)
      console.log("[v0] Tiers below each placement:", tiersBelow)

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
          if (!playerMatchHistory[match.player1]) {
            playerMatchHistory[match.player1] = []
          }
          playerMatchHistory[match.player1].push({
            matchId: match.match_id,
            result: match.winner === match.player1 ? "W" : "L",
            timestamp: match.updated_at || new Date().toISOString(),
          })
        }

        if (match.player2 && !isFreilos(match.player2)) {
          if (!playerMatchHistory[match.player2]) {
            playerMatchHistory[match.player2] = []
          }
          playerMatchHistory[match.player2].push({
            matchId: match.match_id,
            result: match.winner === match.player2 ? "W" : "L",
            timestamp: match.updated_at || new Date().toISOString(),
          })
        }
      })

      Object.keys(playerMatchHistory).forEach((playerName) => {
        playerMatchHistory[playerName].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      })

      console.log("[v0] Player match history:", playerMatchHistory)

      const bracketResetOccurred = matches[63].winner !== undefined
      console.log("[v0] Bracket reset occurred:", bracketResetOccurred)

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

      rankings.forEach((ranking) => {
        const playerName = ranking.player_name
        const placement = ranking.placement
        const placementPoints = 10 + tiersBelow[placement] * 2
        const bonus = placement === 1 && !bracketResetOccurred ? 5 : 0

        playerStats[playerName] = {
          placement: placement,
          placement_points: placementPoints,
          legs_points: 0,
          bonus_points: bonus,
          legs_won: 0,
          legs_lost: 0,
          matches_played: 0,
          matches_won: 0,
          matches_lost: 0,
        }
      })

      matchStates?.forEach((match) => {
        if (match.player1 && !isFreilos(match.player1)) {
          if (!playerStats[match.player1]) {
            playerStats[match.player1] = {
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
          }

          const score1 = match.score1 || 0
          const score2 = match.score2 || 0

          playerStats[match.player1].legs_won += score1
          playerStats[match.player1].legs_lost += score2
          playerStats[match.player1].legs_points += score1

          if (match.winner) {
            playerStats[match.player1].matches_played += 1
            if (match.winner === match.player1) {
              playerStats[match.player1].matches_won += 1
            } else {
              playerStats[match.player1].matches_lost += 1
            }
          }
        }

        if (match.player2 && !isFreilos(match.player2)) {
          if (!playerStats[match.player2]) {
            playerStats[match.player2] = {
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
          }

          const score1 = match.score1 || 0
          const score2 = match.score2 || 0

          playerStats[match.player2].legs_won += score2
          playerStats[match.player2].legs_lost += score1
          playerStats[match.player2].legs_points += score2

          if (match.winner) {
            playerStats[match.player2].matches_played += 1
            if (match.winner === match.player2) {
              playerStats[match.player2].matches_won += 1
            } else {
              playerStats[match.player2].matches_lost += 1
            }
          }
        }
      })

      console.log("[v0] Calculated player statistics:", playerStats)

      const tournamentEntries = Object.entries(playerStats).map(([playerName, stats]) => {
        const totalPoints = stats.placement_points + stats.legs_points + stats.bonus_points

        const matchHistory = playerMatchHistory[playerName] || []
        const chronologicalForm = matchHistory.map((m) => m.result).join(",")

        console.log(
          `[v0] ${playerName}: Platz ${stats.placement} | ` +
            `${stats.placement_points}P (Platzierung) + ${stats.legs_points}P (Legs) + ${stats.bonus_points}P (Bonus) = ${totalPoints}P | ` +
            `Legs: ${stats.legs_won}W-${stats.legs_lost}L | Matches: ${stats.matches_won}W-${stats.matches_lost}L | ` +
            `Form: ${chronologicalForm}`,
        )

        return {
          player_name: playerName,
          tournament_id: tournamentId,
          tournament_name: tournamentName,
          tournament_type: tournamentType,
          tournament_date: new Date().toISOString(),
          placement: stats.placement,
          placement_points: stats.placement_points,
          legs_points: stats.legs_points,
          bonus_points: stats.bonus_points,
          total_points: totalPoints,
          legs_won: stats.legs_won,
          legs_lost: stats.legs_lost,
          matches_played: stats.matches_played,
          matches_won: stats.matches_won,
          matches_lost: stats.matches_lost,
          form: chronologicalForm,
        }
      })

      const { error: insertError } = await supabase.from("tournament_series_standings").insert(tournamentEntries)

      if (insertError) {
        console.error("[v0] Error inserting tournament entries:", insertError)
        throw insertError
      }

      console.log(`[v0] Successfully inserted ${tournamentEntries.length} tournament entries`)

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

    setMachineDialogOpen(false)

    setVsIntro({ open: true, player1: match?.player1 ?? "", player2: match?.player2 ?? "", machineNumber })

    setSelectedMatchId(null)
  }

  const handleRepeatCall = (matchId: number) => {
    const match = matches[matchId]
    const nextCallCount = (match.callCount || 1) + 1

    if (nextCallCount > 3) return

    setMatches((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        callCount: nextCallCount,
      },
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
      match.callCount = undefined

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
      17: { winner: { matchId: 33, position: 1 }, loser: null },
      18: { winner: { matchId: 34, position: 1 }, loser: null },
      19: { winner: { matchId: 35, position: 1 }, loser: null },
      20: { winner: { matchId: 36, position: 1 }, loser: null },
      21: { winner: { matchId: 37, position: 1 }, loser: null },
      22: { winner: { matchId: 38, position: 1 }, loser: null },
      23: { winner: { matchId: 39, position: 1 }, loser: null },
      24: { winner: { matchId: 40, position: 1 }, loser: null },
      25: { winner: { matchId: 45, position: 1 }, loser: { matchId: 40, position: 2 } },
      26: { winner: { matchId: 45, position: 2 }, loser: { matchId: 39, position: 2 } },
      27: { winner: { matchId: 46, position: 1 }, loser: { matchId: 38, position: 2 } },
      28: { winner: { matchId: 46, position: 2 }, loser: { matchId: 37, position: 2 } },
      29: { winner: { matchId: 47, position: 1 }, loser: { matchId: 36, position: 2 } },
      30: { winner: { matchId: 47, position: 2 }, loser: { matchId: 35, position: 2 } },
      31: { winner: { matchId: 48, position: 1 }, loser: { matchId: 34, position: 2 } },
      32: { winner: { matchId: 48, position: 2 }, loser: { matchId: 33, position: 2 } },
      33: { winner: { matchId: 41, position: 1 }, loser: null },
      34: { winner: { matchId: 41, position: 2 }, loser: null },
      35: { winner: { matchId: 42, position: 1 }, loser: null },
      36: { winner: { matchId: 42, position: 2 }, loser: null },
      37: { winner: { matchId: 43, position: 1 }, loser: null },
      38: { winner: { matchId: 43, position: 2 }, loser: null },
      39: { winner: { matchId: 44, position: 1 }, loser: null },
      40: { winner: { matchId: 44, position: 2 }, loser: null },
      41: { winner: { matchId: 49, position: 1 }, loser: null },
      42: { winner: { matchId: 50, position: 1 }, loser: null },
      43: { winner: { matchId: 51, position: 1 }, loser: null },
      44: { winner: { matchId: 52, position: 1 }, loser: null },
      45: { winner: { matchId: 55, position: 1 }, loser: { matchId: 52, position: 2 } },
      46: { winner: { matchId: 55, position: 2 }, loser: { matchId: 51, position: 2 } },
      47: { winner: { matchId: 56, position: 1 }, loser: { matchId: 50, position: 2 } },
      48: { winner: { matchId: 56, position: 2 }, loser: { matchId: 49, position: 2 } },
      49: { winner: { matchId: 53, position: 1 }, loser: null },
      50: { winner: { matchId: 53, position: 2 }, loser: null },
      51: { winner: { matchId: 54, position: 1 }, loser: null },
      52: { winner: { matchId: 54, position: 2 }, loser: null },
      53: { winner: { matchId: 57, position: 1 }, loser: null },
      54: { winner: { matchId: 58, position: 1 }, loser: null },
      55: { winner: { matchId: 60, position: 1 }, loser: { matchId: 58, position: 2 } },
      56: { winner: { matchId: 60, position: 2 }, loser: { matchId: 57, position: 2 } },
      57: { winner: { matchId: 59, position: 1 }, loser: null },
      58: { winner: { matchId: 59, position: 2 }, loser: null },
      59: { winner: { matchId: 61, position: 1 }, loser: null },
      60: { winner: { matchId: 62, position: 1 }, loser: { matchId: 61, position: 2 } },
      61: { winner: { matchId: 62, position: 2 }, loser: null },
      62: { winner: null, loser: null },
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
        callCount: undefined,
      }

      if (oldWinner || oldLoser) {
        clearSubsequentMatches(newMatches, matchId, oldWinner, oldLoser)
        // Also purge the affected players from any later matches (cascade reset)
        purgePlayerFromFutureMatches(newMatches, matchId, oldWinner)
        purgePlayerFromFutureMatches(newMatches, matchId, oldLoser)
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

  
  // When a match is reset, we must also remove the affected players from ALL later matches.
  // Otherwise the database can keep "stale" players in lower rounds (because they had already progressed further).
  const purgePlayerFromFutureMatches = (allMatches: Record<number, Match>, fromMatchId: number, player?: string) => {
    if (!player) return
    if (isFreilos(player)) return

    Object.values(allMatches).forEach((m) => {
      if (!m) return
      // only touch matches AFTER the reset match
      if (m.id <= fromMatchId) return

      let changed = false

      if (m.player1 === player) {
        m.player1 = ""
        m.score1 = 0
        changed = true
      }
      if (m.player2 === player) {
        m.player2 = ""
        m.score2 = 0
        changed = true
      }

      if (m.winner === player) {
        m.winner = undefined
        changed = true
      }
      if (m.loser === player) {
        m.loser = undefined
        changed = true
      }

      if (changed) {
        // If we removed somebody, also clear machine assignment so it doesn't show as "live"
        m.machineNumber = undefined
        m.callCount = undefined
      }
    })
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
  const allMatches = Object.values(matches)
  const activeLiveMatches = allMatches
    .filter((match) => match.player1 && match.player2 && !match.winner && match.machineNumber)
    .sort((a, b) => (a.machineNumber || 0) - (b.machineNumber || 0))
  const readyMatches = allMatches.filter((match) => match.player1 && match.player2 && !match.winner && !match.machineNumber)
  const completedMatches = allMatches.filter((match) => Boolean(match.winner))
  const liveMachineNumbers = activeLiveMatches
    .map((match) => match.machineNumber)
    .filter((value): value is number => Boolean(value))
  const totalMatchCount = 63
  const completedCount = completedMatches.length
  const remainingCount = Math.max(totalMatchCount - completedCount, 0)
  const liveCompletion = Math.round((completedCount / totalMatchCount) * 100)
  const winnerName = matches[63].winner || (matches[62].winner === matches[62].player1 ? matches[62].winner : undefined)

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
          <div className="flex gap-2 items-center">
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
            <Button onClick={handleCancelClick} variant="outline">
              Abbrechen
            </Button>
          </div>
        </div>


        <Card className="overflow-hidden border-0 shadow-xl bg-white text-slate-900 border border-slate-200">
          <div className="p-5 md:p-6 space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
                  <Radio className="h-3.5 w-3.5" />
                  LIVE Center
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">Alles Wichtige auf einen Blick</h2>
                  <p className="text-sm md:text-base text-slate-600">
                    Laufende Spiele, freie Automaten und die nächsten Matches sofort sichtbar.
                  </p>
                </div>
              </div>

              <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Turnier-Fortschritt</span>
                  <span className="font-semibold text-slate-900">{liveCompletion}%</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all duration-500"
                    style={{ width: `${liveCompletion}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Fertig</div>
                    <div className="mt-1 font-semibold">{completedCount} von {totalMatchCount} Matches</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      {winnerName ? "Sieger" : "Offen"}
                    </div>
                    <div className="mt-1 font-semibold">{winnerName ? winnerName : `${remainingCount} Matches`}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">LIVE Matches</span>
                  <Activity className="h-4 w-4 text-red-500" />
                </div>
                <div className="mt-2 text-3xl font-bold">{activeLiveMatches.length}</div>
                <p className="mt-1 text-xs text-slate-500">Aktuell auf Automaten gestartet</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Bereit</span>
                  <Clock3 className="h-4 w-4 text-orange-500" />
                </div>
                <div className="mt-2 text-3xl font-bold">{readyMatches.length}</div>
                <p className="mt-1 text-xs text-slate-500">Sofort startbare Matches</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Frei</span>
                  <Radio className="h-4 w-4 text-slate-500" />
                </div>
                <div className="mt-2 text-3xl font-bold">{availableMachines.length}</div>
                <p className="mt-1 text-xs text-slate-500">Verfügbare Automaten</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Abgeschlossen</span>
                  <Trophy className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-3xl font-bold">{completedMatches.length}</div>
                <p className="mt-1 text-xs text-slate-500">Bereits bestätigte Matches</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-lg">Gerade LIVE</h3>
                  <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                    {liveMachineNumbers.length > 0 ? `Automaten ${liveMachineNumbers.join(", ")}` : "Noch kein Spiel gestartet"}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {activeLiveMatches.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                      Noch kein LIVE-Match aktiv. Starte ein Match und es erscheint sofort hier oben.
                    </div>
                  ) : (
                    activeLiveMatches.map((match) => {
                      const canConfirmLive = match.score1 !== match.score2 && (match.score1 > 0 || match.score2 > 0)
                      const nextCall = Math.min((match.callCount || 1) + 1, 3)

                      return (
                        <div
                          key={match.id}
                          className="rounded-2xl border border-red-200 bg-red-50/40 px-4 py-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                                <span>Match {match.id}</span>
                                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-white">
                                  LIVE
                                </span>
                              </div>
                              <div className="mt-1 text-base font-semibold">
                                {match.player1} <span className="text-slate-400">vs.</span> {match.player2}
                              </div>
                              <div className="mt-2">
                                <span className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600">
                                  Automat {match.machineNumber}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:w-[190px]">
                              <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="truncate text-xs text-slate-500">{match.player1}</div>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={2}
                                  value={match.score1 === 0 ? "" : String(match.score1)}
                                  onChange={(e) =>
                                    updateScore(match.id, 1, Number(e.target.value.replace(/\D/g, "").slice(0, 2)) || 0)
                                  }
                                  className="mt-2 h-10 w-14 border-slate-200 bg-slate-50 px-0 text-center text-base font-bold text-slate-900"
                                />
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="truncate text-xs text-slate-500">{match.player2}</div>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={2}
                                  value={match.score2 === 0 ? "" : String(match.score2)}
                                  onChange={(e) =>
                                    updateScore(match.id, 2, Number(e.target.value.replace(/\D/g, "").slice(0, 2)) || 0)
                                  }
                                  className="mt-2 h-10 w-14 border-slate-200 bg-slate-50 px-0 text-center text-base font-bold text-slate-900"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                              Stand {match.score1}:{match.score2}
                            </span>
                            {match.callCount && match.callCount < 3 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRepeatCall(match.id)}
                                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                              >
                                {nextCall}. Aufruf
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => confirmMatch(match.id)}
                              disabled={!canConfirmLive}
                              className="bg-red-500 text-white hover:bg-red-600 disabled:bg-slate-200 disabled:text-slate-500"
                            >
                              <Check className="mr-1 h-4 w-4" />
                              Ergebnis bestätigen
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-lg">Als Nächstes dran</h3>
                  <span className="text-xs text-slate-500">Top {Math.min(readyMatches.length, 4)}</span>
                </div>

                <div className="mt-4 space-y-3">
                  {readyMatches.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                      Aktuell wartet kein startbereites Match.
                    </div>
                  ) : (
                    readyMatches.slice(0, 4).map((match) => {
                      const hasFreilos = isFreilos(match.player1) || isFreilos(match.player2)

                      return (
                        <div key={match.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold">Match {match.id}</span>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              {hasFreilos ? "auto" : "bereit"}
                            </span>
                          </div>
                          <div className="mt-2 text-sm text-slate-700">
                            {match.player1} <span className="text-slate-400">vs.</span> {match.player2}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => startMatch(match.id)}
                              className="bg-orange-500 text-white hover:bg-orange-600"
                            >
                              {hasFreilos ? "Auto starten" : "Spiel starten"}
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-8">
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
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
              />
            ))}
          </div>

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
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

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
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
              />
            ))}
          </div>

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
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

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
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

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
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
              />
            ))}
          </div>

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
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

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
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

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
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
              />
            ))}
          </div>

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
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 7</h2>
            <MatchCard
              match={matches[59]}
              onScoreUpdate={updateScore}
              onConfirm={confirmMatch}
              onStartMatch={startMatch}
              onReset={resetMatch}
              onRepeatCall={handleRepeatCall}
              announcementsEnabled={announcementsEnabled}
              isLoser
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2">Halbfinale</h2>
            <MatchCard
              match={matches[60]}
              onScoreUpdate={updateScore}
              onConfirm={confirmMatch}
              onStartMatch={startMatch}
              onReset={resetMatch}
              onRepeatCall={handleRepeatCall}
              announcementsEnabled={announcementsEnabled}
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 8</h2>
            <MatchCard
              match={matches[61]}
              onScoreUpdate={updateScore}
              onConfirm={confirmMatch}
              onStartMatch={startMatch}
              onReset={resetMatch}
              onRepeatCall={handleRepeatCall}
              announcementsEnabled={announcementsEnabled}
              isLoser
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2">Großes Finale</h2>
            <p className="text-sm text-muted-foreground">Sieger Gewinnerseite vs. Sieger Verliererseite</p>
            <MatchCard
              match={matches[62]}
              onScoreUpdate={updateScore}
              onConfirm={confirmMatch}
              onStartMatch={startMatch}
              onReset={resetMatch}
              onRepeatCall={handleRepeatCall}
              announcementsEnabled={announcementsEnabled}
              isGrandFinal
            />
          </div>

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
                  onRepeatCall={handleRepeatCall}
                  announcementsEnabled={announcementsEnabled}
                  isGrandFinal
                />
              </div>
            )}

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

      <VsIntroOverlay
        open={vsIntro.open}
        player1={vsIntro.player1}
        player2={vsIntro.player2}
        machineNumber={vsIntro.machineNumber}
        durationMs={1800}
        onDone={() => setVsIntro((p) => ({ ...p, open: false }))}
      />



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
  onRepeatCall: (matchId: number) => void
  announcementsEnabled: boolean
  isLoser?: boolean
  isGrandFinal?: boolean
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
}: MatchCardProps) {
  const isPlayer1Winner = match.winner === match.player1
  const isPlayer2Winner = match.winner === match.player2
  const isPlayer1Loser = match.loser === match.player1
  const isPlayer2Loser = match.loser === match.player2
  const isRunning = match.machineNumber && !match.winner
  const canConfirm =
    match.machineNumber && !match.winner && match.score1 !== match.score2 && (match.score1 > 0 || match.score2 > 0)

  const hasFreilos = isFreilos(match.player1) || isFreilos(match.player2)

  const callCount = match.callCount || 0
  const showSecondCall = announcementsEnabled && isRunning && callCount === 1
  const showThirdCall = announcementsEnabled && isRunning && callCount === 2

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
          {showSecondCall && (
            <Button
              size="sm"
              onClick={() => onRepeatCall(match.id)}
              variant="outline"
              className="h-7 text-xs border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              2. Aufruf
            </Button>
          )}
          {showThirdCall && (
            <Button
              size="sm"
              onClick={() => onRepeatCall(match.id)}
              variant="outline"
              className="h-7 text-xs border-red-500 text-red-600 hover:bg-red-50"
            >
              3. Aufruf
            </Button>
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


// ------------------------------
// VS INTRO OVERLAY (orange style)
// ------------------------------
