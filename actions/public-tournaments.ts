"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import { cookies } from "next/headers"

// Define types for the data fetched from Supabase
interface TournamentResultEntry {
  rank: number
  name: string
  ligastatus: string
  lives: number
  isEliminated: boolean
  eliminationRound: number | null
  eliminationTime: string | null
}

export interface PublicTournamentData {
  id: string
  name: string
  finished_at: string
  winner_name: string | null
  total_rounds: number | null
  board_count: number
  max_group_size: number
  sudden_death_enabled: boolean
  sudden_death_time: number
  speech_enabled: boolean
  results_data: TournamentResultEntry[] | null // Detailed player results
}

interface ServerActionResponse<T> {
  success: boolean
  message: string
  data?: T
}

/**
 * Fetches all finished tournaments along with their detailed results.
 * This function is designed to be public and does not require user authentication.
 */
export async function getPastTournaments(): Promise<ServerActionResponse<PublicTournamentData[]>> {
  const supabase = createServerSupabaseClient(cookies())

  try {
    // 1. Fetch finished tournaments from kratzer_tournaments table
    const { data: tournaments, error: tournamentsError } = await supabase
      .from("kratzer_tournaments")
      .select(
        "id, name, finished_at, winner_name, total_rounds, board_count, max_group_size, sudden_death_enabled, sudden_death_time, speech_enabled",
      )
      .eq("status", "finished") // Only fetch finished tournaments
      .order("finished_at", { ascending: false }) // Order by finish date, newest first

    if (tournamentsError) {
      console.error("Error fetching past tournaments:", tournamentsError)
      throw tournamentsError
    }

    if (!tournaments || tournaments.length === 0) {
      return { success: true, message: "Keine abgeschlossenen Turniere gefunden.", data: [] }
    }

    // 2. Extract tournament IDs to fetch their detailed results
    const tournamentIds = tournaments.map((t) => t.id)
    const { data: results, error: resultsError } = await supabase
      .from("kratzer_tournament_results")
      .select("kratzer_tournament_id, results_data")
      .in("kratzer_tournament_id", tournamentIds) // Fetch results only for the fetched tournaments

    if (resultsError) {
      console.error("Error fetching tournament results data:", resultsError)
      throw resultsError
    }

    // 3. Map results data to their respective tournament IDs for easy lookup
    const resultsMap = new Map(results?.map((r) => [r.kratzer_tournament_id, r.results_data]))

    // 4. Combine tournament data with their detailed results
    const publicTournaments: PublicTournamentData[] = tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      finished_at: t.finished_at,
      winner_name: t.winner_name,
      total_rounds: t.total_rounds,
      board_count: t.board_count,
      max_group_size: t.max_group_size,
      sudden_death_enabled: t.sudden_death_enabled,
      sudden_death_time: t.sudden_death_time,
      speech_enabled: t.speech_enabled,
      // Ensure results_data is correctly typed as an array of TournamentResultEntry
      results_data: (resultsMap.get(t.id) || null) as TournamentResultEntry[],
    }))

    return { success: true, message: "Abgeschlossene Turniere erfolgreich geladen.", data: publicTournaments }
  } catch (error: any) {
    console.error("General error in getPastTournaments:", error)
    return { success: false, message: `Fehler beim Laden der Turniere: ${error.message}` }
  }
}
