"use server"

// This currently returns empty data since Kratzer tournament tables don't exist yet

export interface PublicTournamentData {
  id: string
  name: string
  winner_name: string | null
  finished_at: string | null
  total_rounds: number | null
  results_data: {
    rank: number
    name: string
    ligastatus: string
    lives: number
    isEliminated: boolean
    eliminationRound: number | null
  }[]
}

export async function getPastTournaments(): Promise<{
  success: boolean
  data?: PublicTournamentData[]
  message?: string
}> {
  try {
    // TODO: Implement Kratzer tournament database tables
    // Currently returning empty array since scratch_tournaments table doesn't exist yet
    // You'll need to create tables like: scratch_tournaments, scratch_player_states, scratch_results

    return {
      success: true,
      data: [],
      message: "Kratzer Turnier-Datenbank noch nicht eingerichtet",
    }
  } catch (error: any) {
    console.error("Error fetching past tournaments:", error)
    return {
      success: false,
      message: error.message || "Fehler beim Laden der Turniere",
    }
  }
}
