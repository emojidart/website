"use server"

import { createServerSupabaseClient } from "@/lib/supabase" // Import the server-side client creator
import type { TournamentSettings, KratzerPlayer, Board, SpieldatenbankEntry } from "@/types/tournament"
import { cookies } from "next/headers" // Import cookies directly in the Server Action

interface ServerActionResponse {
  success: boolean
  message: string
  data?: any
}

// Function to get the current user ID
async function getCurrentUserId(): Promise<string | null> {
  const supabase = createServerSupabaseClient(cookies()) // Pass cookies() to the client creator
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id || null
}

// Registers selected players from spieldatenbank into kratzer_tournament_registrations
export async function registerPlayers(playerIds: string[]): Promise<ServerActionResponse> {
  console.log("registerPlayers: Funktion gestartet. Empfangene Player IDs:", playerIds)

  // NEU: Cookies direkt im Server Action loggen
  const allCookies = cookies().getAll()
  console.log("registerPlayers: Empfangene Cookies im Server Action:", allCookies)

  const userId = await getCurrentUserId()
  console.log("registerPlayers: Aktueller Benutzer ID:", userId)

  if (!userId) {
    console.error("registerPlayers: Benutzer nicht authentifiziert.")
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  const supabase = createServerSupabaseClient(cookies()) // Pass cookies() to the client creator
  try {
    // Fetch player details from spieldatenbank
    console.log("registerPlayers: Versuche Spielerdetails aus spieldatenbank zu laden...")
    const { data: playersData, error: playersError } = await supabase
      .from("spieldatenbank")
      .select("id, name, ligastatus")
      .in("id", playerIds)

    if (playersError) {
      console.error("registerPlayers: Fehler beim Laden der Spielerdetails:", playersError)
      throw playersError
    }

    if (!playersData || playersData.length === 0) {
      console.warn("registerPlayers: Keine Spielerdaten gefunden oder leere Auswahl.")
      return { success: false, message: "Keine Spieler gefunden für Registrierung." }
    }
    console.log("registerPlayers: Spielerdetails erfolgreich geladen:", playersData)

    // Prepare data for insertion into kratzer_tournament_registrations
    const registrationsToInsert = playersData.map((player) => ({
      player_id: player.id,
      player_name: player.name,
      ligastatus: player.ligastatus || "N/A",
      paid: false,
    }))
    console.log("registerPlayers: Vorbereitet für Upsert:", registrationsToInsert)

    // Perform upsert to handle existing registrations
    console.log("registerPlayers: Versuche Upsert in kratzer_tournament_registrations...")
    const { error: upsertError } = await supabase
      .from("kratzer_tournament_registrations")
      .upsert(registrationsToInsert, { onConflict: "player_id" })

    if (upsertError) {
      console.error("registerPlayers: Fehler beim Upsert der Registrierungen:", upsertError)
      throw upsertError
    }
    console.log("registerPlayers: Spieler erfolgreich in kratzer_tournament_registrations geschrieben.")

    return {
      success: true,
      message: `${playersData.length} Spieler erfolgreich registriert.`,
    }
  } catch (error: any) {
    console.error("registerPlayers: Allgemeiner Fehler im try-Block:", error)
    return {
      success: false,
      message: `Fehler beim Registrieren der Spieler: ${error.message}`,
    }
  }
}

// Loads registered players from kratzer_tournament_registrations
export async function loadRegisteredPlayers(): Promise<ServerActionResponse & { data?: SpieldatenbankEntry[] }> {
  const supabase = createServerSupabaseClient(cookies()) // Pass cookies() to the client creator
  const userId = await getCurrentUserId()
  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    const { data, error } = await supabase
      .from("kratzer_tournament_registrations")
      .select("player_id, player_name, ligastatus, paid")
      .order("registered_at", { ascending: true })

    if (error) throw error

    // Map to SpieldatenbankEntry type for consistency
    const registeredPlayers: SpieldatenbankEntry[] = (data || []).map((reg) => ({
      id: reg.player_id,
      name: reg.player_name,
      ligastatus: reg.ligastatus,
      paid: reg.paid,
    }))

    return { success: true, message: "Registrierte Spieler geladen.", data: registeredPlayers }
  } catch (error: any) {
    console.error("Fehler beim Laden registrierter Spieler:", error)
    return {
      success: false,
      message: `Fehler beim Laden registrierter Spieler: ${error.message}`,
    }
  }
}

// Clears all registered players
export async function clearRegisteredPlayers(): Promise<ServerActionResponse> {
  const supabase = createServerSupabaseClient(cookies()) // Pass cookies() to the client creator
  const userId = await getCurrentUserId()
  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    const { error } = await supabase
      .from("kratzer_tournament_registrations")
      .delete()
      .neq("player_id", "00000000-0000-0000-0000-000000000000") // Delete all entries

    if (error) throw error

    return { success: true, message: "Alle registrierten Spieler gelöscht." }
  } catch (error: any) {
    console.error("Fehler beim Löschen registrierter Spieler:", error)
    return {
      success: false,
      message: `Fehler beim Löschen registrierter Spieler: ${error.message}`,
    }
  }
}

// Updates the paid status of a registered player
export async function updatePlayerPaidStatus(playerId: string, paid: boolean): Promise<ServerActionResponse> {
  const supabase = createServerSupabaseClient(cookies()) // Pass cookies() to the client creator
  const userId = await getCurrentUserId()
  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    const { error } = await supabase.from("kratzer_tournament_registrations").update({ paid }).eq("player_id", playerId)

    if (error) throw error

    return { success: true, message: "Bezahlstatus aktualisiert." }
  } catch (error: any) {
    console.error("Fehler beim Aktualisieren des Bezahlstatus:", error)
    return {
      success: false,
      message: `Fehler beim Aktualisieren des Bezahlstatus: ${error.message}`,
    }
  }
}

// Creates a new tournament entry in Supabase
export async function createKratzerTournament(
  settings: TournamentSettings,
  initialPlayers: KratzerPlayer[],
): Promise<ServerActionResponse & { data?: { tournamentId: string } }> {
  const supabase = createServerSupabaseClient(cookies()) // Pass cookies() to the client creator
  const userId = await getCurrentUserId()
  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    const { data: tournament, error: tournamentError } = await supabase
      .from("kratzer_tournaments")
      .insert({
        user_id: userId,
        name: `Kratzer-Turnier ${new Date().toLocaleDateString("de-DE")}`,
        status: "running",
        board_count: settings.boardCount,
        max_group_size: settings.maxGroupSize,
        sudden_death_enabled: settings.suddenDeathEnabled,
        sudden_death_time: settings.suddenDeathTime,
        speech_enabled: settings.speechEnabled,
      })
      .select("id")
      .single()

    if (tournamentError) throw tournamentError
    if (!tournament) throw new Error("Turnier konnte nicht erstellt werden.")

    const tournamentId = tournament.id

    // Insert initial players for this tournament instance
    const playersToInsert = initialPlayers.map((player) => ({
      kratzer_tournament_id: tournamentId,
      player_id: player.id,
      player_name: player.name,
      ligastatus: player.ligastatus,
      lives: player.lives,
      is_eliminated: player.isEliminated,
    }))

    const { error: playersInsertError } = await supabase.from("kratzer_tournament_players").insert(playersToInsert)

    if (playersInsertError) throw playersInsertError

    return {
      success: true,
      message: "Turnier erfolgreich gestartet!",
      data: { tournamentId },
    }
  } catch (error: any) {
    console.error("Fehler beim Starten des Turniers:", error)
    return { success: false, message: `Fehler beim Starten des Turniers: ${error.message}` }
  }
}

// Updates player data within a running tournament
export async function updateKratzerTournamentPlayersData(
  tournamentId: string,
  playersToUpdate: KratzerPlayer[],
): Promise<ServerActionResponse> {
  const supabase = createServerSupabaseClient(cookies()) // Pass cookies() to the client creator
  const userId = await getCurrentUserId()
  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    // Filter out players that are not part of this tournament or user
    // (Additional RLS policies should handle this on Supabase side)
    const updates = playersToUpdate.map((player) =>
      supabase
        .from("kratzer_tournament_players")
        .update({
          lives: player.lives,
          is_eliminated: player.isEliminated,
          elimination_round: player.eliminationRound,
          elimination_time: player.eliminationTime,
        })
        .eq("kratzer_tournament_id", tournamentId)
        .eq("player_id", player.id),
    )

    const results = await Promise.all(updates)

    for (const result of results) {
      if (result.error) throw result.error
    }

    return { success: true, message: "Spielerdaten erfolgreich aktualisiert." }
  } catch (error: any) {
    console.error("Fehler beim Aktualisieren der Spielerdaten:", error)
    return { success: false, message: `Fehler beim Aktualisieren der Spielerdaten: ${error.message}` }
  }
}

// Inserts a new round's board configuration
export async function saveKratzerTournamentRound(
  tournamentId: string,
  roundNumber: number,
  boardsData: Board[],
): Promise<ServerActionResponse> {
  const supabase = createServerSupabaseClient(cookies()) // Pass cookies() to the client creator
  const userId = await getCurrentUserId()
  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    const { error } = await supabase.from("kratzer_tournament_rounds").insert({
      kratzer_tournament_id: tournamentId,
      round_number: roundNumber,
      boards_data: JSON.parse(JSON.stringify(boardsData)), // Deep copy to ensure no reactivity issues
    })

    if (error) throw error

    return { success: true, message: "Runde erfolgreich gespeichert." }
  } catch (error: any) {
    console.error("Fehler beim Speichern der Runde:", error)
    return { success: false, message: `Fehler beim Speichern der Runde: ${error.message}` }
  }
}

// Completes or cancels a tournament
export async function updateKratzerTournamentStatus(
  tournamentId: string,
  status: "finished" | "cancelled",
  winnerId?: string,
  winnerName?: string,
  totalRounds?: number,
): Promise<ServerActionResponse> {
  const supabase = createServerSupabaseClient(cookies()) // Pass cookies() to the client creator
  const userId = await getCurrentUserId()
  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    const updateData: {
      status: string
      winner_id?: string
      winner_name?: string
      total_rounds?: number
      finished_at?: string
    } = { status }

    if (status === "finished") {
      updateData.winner_id = winnerId
      updateData.winner_name = winnerName
      updateData.total_rounds = totalRounds
      updateData.finished_at = new Date().toISOString()
    }

    const { error } = await supabase.from("kratzer_tournaments").update(updateData).eq("id", tournamentId)

    if (error) throw error

    return {
      success: true,
      message: `Turnier erfolgreich ${status === "finished" ? "abgeschlossen" : "abgebrochen"}.`,
    }
  } catch (error: any) {
    console.error("Fehler beim Aktualisieren des Turnierstatus:", error)
    return {
      success: false,
      message: `Fehler beim Aktualisieren des Turnierstatus: ${error.message}`,
    }
  }
}

// Fetches an active tournament
export async function getActiveKratzerTournament(): Promise<ServerActionResponse & { data?: any }> {
  const supabase = createServerSupabaseClient(cookies()) // Pass cookies() to the client creator
  const userId = await getCurrentUserId()
  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    const { data: tournaments, error } = await supabase
      .from("kratzer_tournaments")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "running")
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) throw error

    return {
      success: true,
      message: tournaments && tournaments.length > 0 ? "Aktives Turnier gefunden." : "Kein aktives Turnier.",
      data: tournaments && tournaments.length > 0 ? tournaments[0] : null,
    }
  } catch (error: any) {
    console.error("Fehler beim Abrufen des aktiven Turniers:", error)
    return {
      success: false,
      message: `Fehler beim Abrufen des aktiven Turniers: ${error.message}`,
    }
  }
}

// Fetches the last round data for a given tournament
export async function getLastKratzerTournamentRound(
  tournamentId: string,
): Promise<ServerActionResponse & { data?: any }> {
  const supabase = createServerSupabaseClient(cookies()) // Pass cookies() to the client creator
  const userId = await getCurrentUserId()
  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    const { data: rounds, error } = await supabase
      .from("kratzer_tournament_rounds")
      .select("*")
      .eq("kratzer_tournament_id", tournamentId)
      .order("round_number", { ascending: false })
      .limit(1)

    if (error) throw error

    return {
      success: true,
      message: rounds && rounds.length > 0 ? "Letzte Runde geladen." : "Keine Runden gefunden.",
      data: rounds && rounds.length > 0 ? rounds[0] : null,
    }
  } catch (error: any) {
    console.error("Fehler beim Laden der letzten Runde:", error)
    return {
      success: false,
      message: `Fehler beim Laden der letzten Runde: ${error.message}`,
    }
  }
}

// Fetches all players for a specific tournament instance
export async function getKratzerTournamentPlayers(
  tournamentId: string,
): Promise<ServerActionResponse & { data?: KratzerPlayer[] }> {
  const supabase = createServerSupabaseClient(cookies()) // Pass cookies() to the client creator
  const userId = await getCurrentUserId()
  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    const { data: kratzerPlayers, error } = await supabase
      .from("kratzer_tournament_players")
      .select("*")
      .eq("kratzer_tournament_id", tournamentId)
      .order("created_at", { ascending: true })

    if (error) throw error

    const players: KratzerPlayer[] = (kratzerPlayers || []).map((p) => ({
      id: p.player_id,
      name: p.player_name,
      ligastatus: p.ligastatus || "N/A",
      lives: p.lives,
      isEliminated: p.is_eliminated,
      eliminationRound: p.elimination_round,
      eliminationTime: p.elimination_time,
    }))

    return {
      success: true,
      message: "Turnierspieler geladen.",
      data: players,
    }
  } catch (error: any) {
    console.error("Fehler beim Laden der Turnierspieler:", error)
    return {
      success: false,
      message: `Fehler beim Laden der Turnierspieler: ${error.message}`,
    }
  }
}

export async function addTournamentResult(
  tournamentId: string,
  winnerId: string,
  winnerName: string,
  totalRounds: number,
  playerResults: any[], // Array of player objects with rank, name, lives etc.
): Promise<ServerActionResponse> {
  const supabase = createServerSupabaseClient(cookies()) // Pass cookies() to the client creator
  const userId = await getCurrentUserId()
  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    const { error } = await supabase.from("kratzer_tournament_results").insert({
      kratzer_tournament_id: tournamentId,
      winner_id: winnerId,
      winner_name: winnerName,
      total_rounds: totalRounds,
      results_data: playerResults, // Store detailed results as JSONB
    })

    if (error) throw error

    return { success: true, message: "Turnierergebnisse erfolgreich gespeichert." }
  } catch (error: any) {
    console.error("Fehler beim Speichern der Turnierergebnisse:", error)
    return {
      success: false,
      message: `Fehler beim Speichern der Turnierergebnisse: ${error.message}`,
    }
  }
}
