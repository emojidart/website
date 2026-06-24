"use client"

import { useState, useEffect, useRef } from "react"
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


const rebuildRankingsFromMatches = async ({
  tournamentId,
  tournamentType,
  tournamentName,
  bracketSize,
  matches,
}: {
  tournamentId: string
  tournamentType: string
  tournamentName: string
  bracketSize: number
  matches: Record<number, Match>
}) => {
  if (!tournamentId) {
    alert("Keine Turnier-ID gefunden!")
    return false
  }

  const cleanName = (name?: string | null) => String(name || "").trim()

  const isRealPlayer = (name?: string | null) => {
    const n = cleanName(name)
    return n !== "" && !isFreilos(n)
  }

  const realPlayers = new Set<string>()

  Object.values(matches).forEach((match) => {
    if (isRealPlayer(match.player1)) realPlayers.add(cleanName(match.player1))
    if (isRealPlayer(match.player2)) realPlayers.add(cleanName(match.player2))
  })

  if (realPlayers.size === 0) {
    alert("Keine echten Spieler im Turnier gefunden!")
    return false
  }

  const finalMatchId =
    bracketSize === 64
      ? matches[127]?.winner
        ? 127
        : 126
      : bracketSize === 32
        ? matches[63]?.winner
          ? 63
          : 62
        : bracketSize === 16
          ? matches[31]?.winner
            ? 31
            : 30
          : matches[15]?.winner
            ? 15
            : 14

  const finalMatch = matches[finalMatchId]

  if (!finalMatch?.winner || !finalMatch?.loser) {
    alert("Finale ist noch nicht fertig. Rangliste kann nicht vollständig neu berechnet werden.")
    return false
  }

  const rebuiltRankings: {
    tournament_type: string
    tournament_id: string
    tournament_name: string
    player_name: string
    placement: number
    eliminated_at: string
  }[] = []

  realPlayers.forEach((playerName) => {
    const lostMatches = Object.values(matches)
      .filter((match) => match.winner && match.loser === playerName)
      .sort((a, b) => a.id - b.id)

    if (playerName === finalMatch.winner) {
      rebuiltRankings.push({
        tournament_type: tournamentType,
        tournament_id: tournamentId,
        tournament_name: tournamentName,
        player_name: playerName,
        placement: 1,
        eliminated_at: new Date().toISOString(),
      })
      return
    }

    if (playerName === finalMatch.loser) {
      rebuiltRankings.push({
        tournament_type: tournamentType,
        tournament_id: tournamentId,
        tournament_name: tournamentName,
        player_name: playerName,
        placement: 2,
        eliminated_at: new Date().toISOString(),
      })
      return
    }

    if (lostMatches.length >= 2) {
      const eliminationMatch = lostMatches[lostMatches.length - 1]
      const placement = getPlacementForEliminationMatch(eliminationMatch.id, bracketSize)

      rebuiltRankings.push({
        tournament_type: tournamentType,
        tournament_id: tournamentId,
        tournament_name: tournamentName,
        player_name: playerName,
        placement,
        eliminated_at: new Date().toISOString(),
      })
    }
  })

  const missingPlayers = Array.from(realPlayers).filter(
    (playerName) => !rebuiltRankings.some((r) => r.player_name === playerName),
  )

  if (missingPlayers.length > 0) {
    alert("Rangliste konnte nicht vollständig berechnet werden. Diese Spieler fehlen noch: " + missingPlayers.join(", "))
    return false
  }

  const { error: deleteError } = await supabase
    .from("dko_rankings")
    .delete()
    .eq("tournament_type", tournamentType)
    .eq("tournament_id", tournamentId)

  if (deleteError) {
    console.error("Fehler beim Löschen der alten Rankings:", deleteError)
    alert("Alte Rangliste konnte nicht gelöscht werden.")
    return false
  }

  const { error: insertError } = await supabase.from("dko_rankings").insert(rebuiltRankings)

  if (insertError) {
    console.error("Fehler beim Neuaufbau der Rankings:", insertError)
    alert("Neue Rangliste konnte nicht gespeichert werden.")
    return false
  }

  console.log("[DKO] Rangliste komplett neu berechnet:", rebuiltRankings)
  return true
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

export default function TournamentBracket({ bracketSize = 64, tournamentType = "64er_dko" }: TournamentBracketProps) {
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
  const [savingToSummerSpecial, setSavingToSummerSpecial] = useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [announcementsEnabled, setAnnouncementsEnabled] = useState(false)
  const [playerIdMap, setPlayerIdMap] = useState<Record<string, string>>({})

  const { announce } = useSpeechAnnouncer({ enabled: announcementsEnabled })

  const initializeMatches = () => {
  const teamNames = Array.from({ length: 64 }, (_, i) => `Team ${i + 1}`)

  const initialMatches: Record<number, Match> = {}

  for (let i = 1; i <= 32; i++) {
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

  for (let i = 33; i <= 127; i++) {
    initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
  }

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

              if (record.match_id === 126) {
                if (record.winner === next[126].player1) {
                  // Winner's bracket player wins the grand final
                  saveFinalRankings(record.winner, record.loser, tournamentType, tournamentId, tournamentName)
                } else {
                  // Loser's bracket player wins -> bracket reset match 63
                  next[127].player1 = next[126].player1
                  next[127].player2 = next[126].player2
                }
              } else if (record.match_id === 127) {
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

          if (match.id === 126) {
            if (match.winner === match.player1) {
              saveFinalRankings(match.winner, match.loser, tournamentType, tournamentId, tournamentName)
            } else {
              newMatches[127].player1 = match.player1
              newMatches[127].player2 = match.player2
            }
          } else if (match.id === 127) {
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
    const winner = matches[127].winner || matches[126].winner

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
      const rankingsRebuilt = await rebuildRankingsFromMatches({
        tournamentId,
        tournamentType,
        tournamentName,
        bracketSize,
        matches,
      })

      if (!rankingsRebuilt) {
        setSavingToSeries(false)
        return
      }

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

      const bracketResetOccurred = matches[127].winner !== undefined
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


  const saveToSummerSpecial = async () => {
    const winner = matches[127]?.winner || matches[126]?.winner

    if (!winner) {
      alert("Kein Gewinner gefunden!")
      return
    }

    setSavingToSummerSpecial(true)

    try {
      const { data: existingRows, error: existingError } = await supabase
        .from("summer_special_standings")
        .select("id")
        .eq("tournament_id", tournamentId)
        .limit(1)

      if (existingError) throw existingError

      if (existingRows && existingRows.length > 0) {
        alert("Dieses Turnier wurde bereits zum Summer Special hinzugefügt!")
        return
      }

      const rankingsRebuilt = await rebuildRankingsFromMatches({
        tournamentId,
        tournamentType,
        tournamentName,
        bracketSize,
        matches,
      })

      if (!rankingsRebuilt) {
        setSavingToSummerSpecial(false)
        return
      }

      const { data: rankings, error: rankingsError } = await supabase
        .from("dko_rankings")
        .select("player_name, placement")
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)
        .order("placement", { ascending: true })

      if (rankingsError) throw rankingsError

      if (!rankings || rankings.length === 0) {
        alert("Keine Rangliste gefunden! Bitte stelle sicher, dass das Turnier vollständig ist.")
        return
      }

      const placementCounts: Record<number, number> = {}
      rankings.forEach((r) => {
        placementCounts[r.placement] = (placementCounts[r.placement] || 0) + 1
      })

      const tiersBelow: Record<number, number> = {}
      const sortedPlacements = Object.keys(placementCounts).map(Number).sort((a, b) => a - b)

      sortedPlacements.forEach((placement, index) => {
        tiersBelow[placement] = sortedPlacements.length - index - 1
      })

      const { data: matchStates, error: matchError } = await supabase
        .from("dko_match_states")
        .select("match_id, player1, player2, score1, score2, winner, updated_at")
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)
        .order("match_id", { ascending: true })

      if (matchError) throw matchError

      const bracketResetOccurred = matches[127]?.winner !== undefined
      const playerStats: Record<string, any> = {}

      rankings.forEach((ranking) => {
        const placementPoints = 10 + tiersBelow[ranking.placement] * 2
        const winnerSideBonus = ranking.placement === 1 && !bracketResetOccurred

        playerStats[ranking.player_name] = {
          placement: ranking.placement,
          placement_points: placementPoints,
          bonus_points: 0,
          winner_side_bonus: winnerSideBonus,
          legs_won: 0,
          legs_lost: 0,
          matches_played: 0,
          matches_won: 0,
          matches_lost: 0,
          match_history: [],
        }
      })

      matchStates?.forEach((match) => {
        if (match.player1 && !isFreilos(match.player1) && playerStats[match.player1]) {
          playerStats[match.player1].legs_won += match.score1 || 0
          playerStats[match.player1].legs_lost += match.score2 || 0

          if (match.winner) {
            playerStats[match.player1].matches_played += 1
            const result = match.winner === match.player1 ? "W" : "L"
            if (result === "W") playerStats[match.player1].matches_won += 1
            else playerStats[match.player1].matches_lost += 1

            playerStats[match.player1].match_history.push({
              match_id: match.match_id,
              result,
              timestamp: match.updated_at || new Date().toISOString(),
            })
          }
        }

        if (match.player2 && !isFreilos(match.player2) && playerStats[match.player2]) {
          playerStats[match.player2].legs_won += match.score2 || 0
          playerStats[match.player2].legs_lost += match.score1 || 0

          if (match.winner) {
            playerStats[match.player2].matches_played += 1
            const result = match.winner === match.player2 ? "W" : "L"
            if (result === "W") playerStats[match.player2].matches_won += 1
            else playerStats[match.player2].matches_lost += 1

            playerStats[match.player2].match_history.push({
              match_id: match.match_id,
              result,
              timestamp: match.updated_at || new Date().toISOString(),
            })
          }
        }
      })

      const summerRows = Object.entries(playerStats).map(([playerName, stats]: any) => {
        stats.match_history.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        const form = stats.match_history.map((h: any) => h.result).join(",")

        return {
          player_name: playerName,
          tournament_id: tournamentId,
          tournament_name: tournamentName,
          tournament_type: tournamentType,
          tournament_date: new Date().toISOString(),
          placement: stats.placement,
          placement_points: stats.placement_points,
          bonus_points: stats.bonus_points,
          winner_side_bonus: stats.winner_side_bonus,
          legs_won: stats.legs_won,
          legs_lost: stats.legs_lost,
          matches_played: stats.matches_played,
          matches_won: stats.matches_won,
          matches_lost: stats.matches_lost,
          form,
        }
      })

      const { error: insertError } = await supabase.from("summer_special_standings").insert(summerRows)

      if (insertError) throw insertError

      await markTournamentAsCompleted(tournamentId)
      await deleteFreiloseFromDatabase(tournamentType, tournamentId)
      await clearTournamentRegistration(tournamentId)

      router.push("/dko_tournament_registration")
    } catch (error) {
      console.error("Fehler beim Speichern zum Summer Special:", error)
      alert("Fehler beim Speichern zum Summer Special.")
    } finally {
      setSavingToSummerSpecial(false)
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

      if (matchId === 126) {
        if (match.winner === match.player1) {
          console.log(`[v0] Grand Final: Winner's bracket player ${match.winner} wins! Tournament over.`)
          saveFinalRankings(match.winner, match.loser, tournamentType, tournamentId, tournamentName)
        } else {
          console.log(`[v0] Grand Final: Loser's bracket player ${match.winner} wins! Bracket reset required.`)
          newMatches[127].player1 = match.player1
          newMatches[127].player2 = match.player2
        }
      } else if (matchId === 127) {
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
      1: { winner: { matchId: 49, position: 1 }, loser: { matchId: 33, position: 1 } },
      2: { winner: { matchId: 49, position: 2 }, loser: { matchId: 33, position: 2 } },
      3: { winner: { matchId: 50, position: 1 }, loser: { matchId: 34, position: 1 } },
      4: { winner: { matchId: 50, position: 2 }, loser: { matchId: 34, position: 2 } },
      5: { winner: { matchId: 51, position: 1 }, loser: { matchId: 35, position: 1 } },
      6: { winner: { matchId: 51, position: 2 }, loser: { matchId: 35, position: 2 } },
      7: { winner: { matchId: 52, position: 1 }, loser: { matchId: 36, position: 1 } },
      8: { winner: { matchId: 52, position: 2 }, loser: { matchId: 36, position: 2 } },
      9: { winner: { matchId: 53, position: 1 }, loser: { matchId: 37, position: 1 } },
      10: { winner: { matchId: 53, position: 2 }, loser: { matchId: 37, position: 2 } },
      11: { winner: { matchId: 54, position: 1 }, loser: { matchId: 38, position: 1 } },
      12: { winner: { matchId: 54, position: 2 }, loser: { matchId: 38, position: 2 } },
      13: { winner: { matchId: 55, position: 1 }, loser: { matchId: 39, position: 1 } },
      14: { winner: { matchId: 55, position: 2 }, loser: { matchId: 39, position: 2 } },
      15: { winner: { matchId: 56, position: 1 }, loser: { matchId: 40, position: 1 } },
      16: { winner: { matchId: 56, position: 2 }, loser: { matchId: 40, position: 2 } },
      17: { winner: { matchId: 57, position: 1 }, loser: { matchId: 41, position: 1 } },
      18: { winner: { matchId: 57, position: 2 }, loser: { matchId: 41, position: 2 } },
      19: { winner: { matchId: 58, position: 1 }, loser: { matchId: 42, position: 1 } },
      20: { winner: { matchId: 58, position: 2 }, loser: { matchId: 42, position: 2 } },
      21: { winner: { matchId: 59, position: 1 }, loser: { matchId: 43, position: 1 } },
      22: { winner: { matchId: 59, position: 2 }, loser: { matchId: 43, position: 2 } },
      23: { winner: { matchId: 60, position: 1 }, loser: { matchId: 44, position: 1 } },
      24: { winner: { matchId: 60, position: 2 }, loser: { matchId: 44, position: 2 } },
      25: { winner: { matchId: 61, position: 1 }, loser: { matchId: 45, position: 1 } },
      26: { winner: { matchId: 61, position: 2 }, loser: { matchId: 45, position: 2 } },
      27: { winner: { matchId: 62, position: 1 }, loser: { matchId: 46, position: 1 } },
      28: { winner: { matchId: 62, position: 2 }, loser: { matchId: 46, position: 2 } },
      29: { winner: { matchId: 63, position: 1 }, loser: { matchId: 47, position: 1 } },
      30: { winner: { matchId: 63, position: 2 }, loser: { matchId: 47, position: 2 } },
      31: { winner: { matchId: 64, position: 1 }, loser: { matchId: 48, position: 1 } },
      32: { winner: { matchId: 64, position: 2 }, loser: { matchId: 48, position: 2 } },
      33: { winner: { matchId: 65, position: 1 }, loser: null },
      34: { winner: { matchId: 66, position: 1 }, loser: null },
      35: { winner: { matchId: 67, position: 1 }, loser: null },
      36: { winner: { matchId: 68, position: 1 }, loser: null },
      37: { winner: { matchId: 69, position: 1 }, loser: null },
      38: { winner: { matchId: 70, position: 1 }, loser: null },
      39: { winner: { matchId: 71, position: 1 }, loser: null },
      40: { winner: { matchId: 72, position: 1 }, loser: null },
      41: { winner: { matchId: 73, position: 1 }, loser: null },
      42: { winner: { matchId: 74, position: 1 }, loser: null },
      43: { winner: { matchId: 75, position: 1 }, loser: null },
      44: { winner: { matchId: 76, position: 1 }, loser: null },
      45: { winner: { matchId: 77, position: 1 }, loser: null },
      46: { winner: { matchId: 78, position: 1 }, loser: null },
      47: { winner: { matchId: 79, position: 1 }, loser: null },
      48: { winner: { matchId: 80, position: 1 }, loser: null },
      49: { winner: { matchId: 89, position: 1 }, loser: { matchId: 80, position: 2 } },
      50: { winner: { matchId: 89, position: 2 }, loser: { matchId: 79, position: 2 } },
      51: { winner: { matchId: 90, position: 1 }, loser: { matchId: 78, position: 2 } },
      52: { winner: { matchId: 90, position: 2 }, loser: { matchId: 77, position: 2 } },
      53: { winner: { matchId: 91, position: 1 }, loser: { matchId: 76, position: 2 } },
      54: { winner: { matchId: 91, position: 2 }, loser: { matchId: 75, position: 2 } },
      55: { winner: { matchId: 92, position: 1 }, loser: { matchId: 74, position: 2 } },
      56: { winner: { matchId: 92, position: 2 }, loser: { matchId: 73, position: 2 } },
      57: { winner: { matchId: 93, position: 1 }, loser: { matchId: 72, position: 2 } },
      58: { winner: { matchId: 93, position: 2 }, loser: { matchId: 71, position: 2 } },
      59: { winner: { matchId: 94, position: 1 }, loser: { matchId: 70, position: 2 } },
      60: { winner: { matchId: 94, position: 2 }, loser: { matchId: 69, position: 2 } },
      61: { winner: { matchId: 95, position: 1 }, loser: { matchId: 68, position: 2 } },
      62: { winner: { matchId: 95, position: 2 }, loser: { matchId: 67, position: 2 } },
      63: { winner: { matchId: 96, position: 1 }, loser: { matchId: 66, position: 2 } },
      64: { winner: { matchId: 96, position: 2 }, loser: { matchId: 65, position: 2 } },
      65: { winner: { matchId: 81, position: 1 }, loser: null },
      66: { winner: { matchId: 81, position: 2 }, loser: null },
      67: { winner: { matchId: 82, position: 1 }, loser: null },
      68: { winner: { matchId: 82, position: 2 }, loser: null },
      69: { winner: { matchId: 83, position: 1 }, loser: null },
      70: { winner: { matchId: 83, position: 2 }, loser: null },
      71: { winner: { matchId: 84, position: 1 }, loser: null },
      72: { winner: { matchId: 84, position: 2 }, loser: null },
      73: { winner: { matchId: 85, position: 1 }, loser: null },
      74: { winner: { matchId: 85, position: 2 }, loser: null },
      75: { winner: { matchId: 86, position: 1 }, loser: null },
      76: { winner: { matchId: 86, position: 2 }, loser: null },
      77: { winner: { matchId: 87, position: 1 }, loser: null },
      78: { winner: { matchId: 87, position: 2 }, loser: null },
      79: { winner: { matchId: 88, position: 1 }, loser: null },
      80: { winner: { matchId: 88, position: 2 }, loser: null },
      81: { winner: { matchId: 97, position: 1 }, loser: null },
      82: { winner: { matchId: 98, position: 1 }, loser: null },
      83: { winner: { matchId: 99, position: 1 }, loser: null },
      84: { winner: { matchId: 100, position: 1 }, loser: null },
      85: { winner: { matchId: 101, position: 1 }, loser: null },
      86: { winner: { matchId: 102, position: 1 }, loser: null },
      87: { winner: { matchId: 103, position: 1 }, loser: null },
      88: { winner: { matchId: 104, position: 1 }, loser: null },
      89: { winner: { matchId: 109, position: 1 }, loser: { matchId: 104, position: 2 } },
      90: { winner: { matchId: 109, position: 2 }, loser: { matchId: 103, position: 2 } },
      91: { winner: { matchId: 110, position: 1 }, loser: { matchId: 102, position: 2 } },
      92: { winner: { matchId: 110, position: 2 }, loser: { matchId: 101, position: 2 } },
      93: { winner: { matchId: 111, position: 1 }, loser: { matchId: 100, position: 2 } },
      94: { winner: { matchId: 111, position: 2 }, loser: { matchId: 99, position: 2 } },
      95: { winner: { matchId: 112, position: 1 }, loser: { matchId: 98, position: 2 } },
      96: { winner: { matchId: 112, position: 2 }, loser: { matchId: 97, position: 2 } },
      97: { winner: { matchId: 105, position: 1 }, loser: null },
      98: { winner: { matchId: 105, position: 2 }, loser: null },
      99: { winner: { matchId: 106, position: 1 }, loser: null },
      100: { winner: { matchId: 106, position: 2 }, loser: null },
      101: { winner: { matchId: 107, position: 1 }, loser: null },
      102: { winner: { matchId: 107, position: 2 }, loser: null },
      103: { winner: { matchId: 108, position: 1 }, loser: null },
      104: { winner: { matchId: 108, position: 2 }, loser: null },
      105: { winner: { matchId: 113, position: 1 }, loser: null },
      106: { winner: { matchId: 114, position: 1 }, loser: null },
      107: { winner: { matchId: 115, position: 1 }, loser: null },
      108: { winner: { matchId: 116, position: 1 }, loser: null },
      109: { winner: { matchId: 119, position: 1 }, loser: { matchId: 116, position: 2 } },
      110: { winner: { matchId: 119, position: 2 }, loser: { matchId: 115, position: 2 } },
      111: { winner: { matchId: 120, position: 1 }, loser: { matchId: 114, position: 2 } },
      112: { winner: { matchId: 120, position: 2 }, loser: { matchId: 113, position: 2 } },
      113: { winner: { matchId: 117, position: 1 }, loser: null },
      114: { winner: { matchId: 117, position: 2 }, loser: null },
      115: { winner: { matchId: 118, position: 1 }, loser: null },
      116: { winner: { matchId: 118, position: 2 }, loser: null },
      117: { winner: { matchId: 121, position: 1 }, loser: null },
      118: { winner: { matchId: 122, position: 1 }, loser: null },
      119: { winner: { matchId: 124, position: 1 }, loser: { matchId: 122, position: 2 } },
      120: { winner: { matchId: 124, position: 2 }, loser: { matchId: 121, position: 2 } },
      121: { winner: { matchId: 123, position: 1 }, loser: null },
      122: { winner: { matchId: 123, position: 2 }, loser: null },
      123: { winner: { matchId: 125, position: 1 }, loser: null },
      124: { winner: { matchId: 126, position: 1 }, loser: { matchId: 125, position: 2 } },
      125: { winner: { matchId: 126, position: 2 }, loser: null },
      126: { winner: null, loser: null },
      127: { winner: null, loser: null },
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
      round1: Array.from({ length: 32 }, (_, i) => i + 1),
      loser1: Array.from({ length: 16 }, (_, i) => i + 33),
      round2: Array.from({ length: 16 }, (_, i) => i + 49),
      loser2: Array.from({ length: 16 }, (_, i) => i + 65),
      loser3: Array.from({ length: 8 }, (_, i) => i + 81),
      round3: Array.from({ length: 8 }, (_, i) => i + 89),
      loser4: Array.from({ length: 8 }, (_, i) => i + 97),
      loser5: Array.from({ length: 4 }, (_, i) => i + 105),
      round4: Array.from({ length: 4 }, (_, i) => i + 109),
      loser6: Array.from({ length: 4 }, (_, i) => i + 113),
      loser7: Array.from({ length: 2 }, (_, i) => i + 117),
      semi: Array.from({ length: 2 }, (_, i) => i + 119),
      loser8: Array.from({ length: 2 }, (_, i) => i + 121),
      loser9: [123],
      finalWinner: [124],
      loser10: [125],
      final: [126],
      reset: [127],
    }

    for (const matches of Object.values(rounds)) {
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

    if (matchId === 126 || matchId === 127) {
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
    // Die eigentliche Kaskaden-Bereinigung läuft über purgePlayerFromFutureMatches.
    // Diese Funktion bleibt bewusst minimal, damit keine 32er-Hardcodes mehr stören.
    void allMatches
    void matchId
    void winner
    void loser
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
          setMatches((prev) => ({ ...prev, ...savedMatches }))
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

        <div className="space-y-8">
          {[
            { title: "Runde 1", start: 1, count: 32, isLoser: false },
            { title: "Verlierer-Runde 1", start: 33, count: 16, isLoser: true },
            { title: "Runde 2", start: 49, count: 16, isLoser: false },
            { title: "Verlierer-Runde 2", start: 65, count: 16, isLoser: true },
            { title: "Verlierer-Runde 3", start: 81, count: 8, isLoser: true },
            { title: "Runde 3", start: 89, count: 8, isLoser: false },
            { title: "Verlierer-Runde 4", start: 97, count: 8, isLoser: true },
            { title: "Verlierer-Runde 5", start: 105, count: 4, isLoser: true },
            { title: "Runde 4", start: 109, count: 4, isLoser: false },
            { title: "Verlierer-Runde 6", start: 113, count: 4, isLoser: true },
            { title: "Verlierer-Runde 7", start: 117, count: 2, isLoser: true },
            { title: "Halbfinale", start: 119, count: 2, isLoser: false },
            { title: "Verlierer-Runde 8", start: 121, count: 2, isLoser: true },
            { title: "Verlierer-Runde 9", start: 123, count: 1, isLoser: true },
            { title: "Finale Gewinnerseite", start: 124, count: 1, isLoser: false },
            { title: "Verlierer-Runde 10", start: 125, count: 1, isLoser: true },
          ].map((section) => (
            <div key={section.title} className="space-y-3">
              <h2
                className={cn(
                  "text-xl font-bold border-b-2 pb-2",
                  section.isLoser
                    ? "text-destructive border-destructive"
                    : "text-blue-600 border-blue-600",
                  section.start === 1 && "text-orange-600 border-orange-600",
                )}
              >
                {section.title}
              </h2>

              {Array.from({ length: section.count }, (_, i) => {
                const matchId = section.start + i
                return (
                  <MatchCard
                    key={matchId}
                    match={matches[matchId]}
                    onScoreUpdate={updateScore}
                    onConfirm={confirmMatch}
                    onStartMatch={startMatch}
                    onReset={resetMatch}
                    onRepeatCall={handleRepeatCall}
                    announcementsEnabled={announcementsEnabled}
                    isLoser={section.isLoser}
                  />
                )
              })}
            </div>
          ))}

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2">Großes Finale</h2>
            <p className="text-sm text-muted-foreground">Sieger Gewinnerseite vs. Sieger Verliererseite</p>
            <MatchCard
              match={matches[126]}
              onScoreUpdate={updateScore}
              onConfirm={confirmMatch}
              onStartMatch={startMatch}
              onReset={resetMatch}
              onRepeatCall={handleRepeatCall}
              announcementsEnabled={announcementsEnabled}
              isGrandFinal
            />
          </div>

          {(matches[127].player1 ||
            matches[127].player2 ||
            (matches[126].winner === matches[126].player2 && matches[126].winner)) &&
            !matches[127].winner && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-purple-600 border-b-2 border-purple-600 pb-2">Bracket Reset</h2>
                <p className="text-sm text-muted-foreground">
                  Der Spieler von der Verliererseite hat gewonnen! Beide Spieler haben jetzt je 1 Niederlage.
                </p>
                <MatchCard
                  match={matches[127]}
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

          {(matches[127].winner || (matches[126].winner === matches[126].player1 && matches[126].player1)) && (
            <Card className="p-6 bg-primary text-primary-foreground">
              <h3 className="text-2xl font-bold text-center">🏆 Turniersieger</h3>
              <p className="text-3xl font-bold text-center mt-4">{matches[127].winner || matches[126].winner}</p>

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
                  onClick={saveToSummerSpecial}
                  disabled={savingToSummerSpecial}
                  size="lg"
                  variant="secondary"
                  className="font-semibold bg-orange-500 text-white hover:bg-orange-600"
                >
                  {savingToSummerSpecial ? "Speichere..." : "Zu Summer Special hinzufügen"}
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
