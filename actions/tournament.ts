"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import type { TournamentSettings, KratzerPlayer, Board, SpieldatenbankEntry } from "@/types/tournament"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

interface ServerActionResponse {
  success: boolean
  message: string
  data?: any
}

type TournamentAccessType = "public" | "club_internal" | "club_external"

type PlayerEligibility = {
  eligible: boolean
  reason: string
}

const requiredModuleForAccessType = (
  accessType: TournamentAccessType,
): "internal_tournaments" | "external_tournaments" | null => {
  if (accessType === "club_internal") return "internal_tournaments"
  if (accessType === "club_external") return "external_tournaments"
  return null
}

const packageLabelForAccessType = (accessType: TournamentAccessType) =>
  accessType === "club_internal" ? "Interne Turniere" : "Externe Turniere"

const chunk = <T,>(items: T[], size = 100): T[][] => {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}

async function buildKratzerEligibility(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  playerIds: Array<string | number>,
  accessType: TournamentAccessType,
): Promise<Record<string, PlayerEligibility>> {
  const result: Record<string, PlayerEligibility> = {}

  playerIds.forEach((id) => {
    result[String(id)] =
      accessType === "public"
        ? { eligible: true, reason: "" }
        : { eligible: false, reason: "Nur für Vereinsmitglieder" }
  })

  if (accessType === "public" || playerIds.length === 0) return result

  const requiredModule = requiredModuleForAccessType(accessType)
  if (!requiredModule) return result

  const today = new Date().toISOString().slice(0, 10)

  // Zuerst die Namen der ausgewählten Spieldatenbank-Einträge laden.
  // Bei älteren Vereinsmitgliedern ist spieldatenbank_id teilweise nicht gesetzt.
  // Deshalb verwenden wir zusätzlich einen sicheren Fallback über einen eindeutigen exakten Namen.
  const spieldatenbankPlayers: any[] = []
  for (const playerIdChunk of chunk(playerIds, 100)) {
    const { data, error } = await supabase
      .from("spieldatenbank")
      .select("id,name")
      .in("id", playerIdChunk)

    if (error) throw error
    spieldatenbankPlayers.push(...(data || []))
  }

  const clubPlayers: any[] = []
  for (const playerIdChunk of chunk(playerIds, 100)) {
    const { data, error } = await supabase
      .from("club_players")
      .select("id,name,spieldatenbank_id")
      .in("spieldatenbank_id", playerIdChunk)

    if (error) throw error
    clubPlayers.push(...(data || []))
  }

  const directlyLinkedSpieldatenbankIds = new Set(
    clubPlayers
      .map((row: any) => row.spieldatenbank_id)
      .filter((value: any) => value !== null && value !== undefined)
      .map((value: any) => String(value)),
  )

  const unmatchedPlayers = spieldatenbankPlayers.filter(
    (player: any) => !directlyLinkedSpieldatenbankIds.has(String(player.id)),
  )

  if (unmatchedPlayers.length > 0) {
    const unmatchedNames = Array.from(
      new Set(
        unmatchedPlayers
          .map((player: any) => String(player.name || "").trim())
          .filter(Boolean),
      ),
    )

    const possibleClubPlayers: any[] = []
    for (const nameChunk of chunk(unmatchedNames, 100)) {
      const { data, error } = await supabase
        .from("club_players")
        .select("id,name,spieldatenbank_id")
        .in("name", nameChunk)

      if (error) throw error
      possibleClubPlayers.push(...(data || []))
    }

    const clubPlayersByNormalizedName = new Map<string, any[]>()

    possibleClubPlayers.forEach((clubPlayer: any) => {
      const key = String(clubPlayer.name || "").trim().toLocaleLowerCase("de-AT")
      if (!key) return
      const existing = clubPlayersByNormalizedName.get(key) || []
      existing.push(clubPlayer)
      clubPlayersByNormalizedName.set(key, existing)
    })

    unmatchedPlayers.forEach((player: any) => {
      const key = String(player.name || "").trim().toLocaleLowerCase("de-AT")
      const matches = clubPlayersByNormalizedName.get(key) || []

      // Nur bei genau einem Treffer automatisch zuordnen.
      // So werden gleichnamige Personen nicht versehentlich verwechselt.
      if (matches.length === 1) {
        const match = matches[0]
        clubPlayers.push({
          ...match,
          spieldatenbank_id: player.id,
          matched_by_name: true,
        })
      }
    })
  }

  const clubPlayerIds = Array.from(
    new Set(clubPlayers.map((row: any) => row.id).filter(Boolean).map((id: any) => String(id))),
  )

  if (clubPlayerIds.length === 0) return result

  const memberships: any[] = []
  for (const clubPlayerIdChunk of chunk(clubPlayerIds, 100)) {
    const { data, error } = await supabase
      .from("member_memberships")
      .select("id,player_id,starts_on,ends_on,status")
      .in("player_id", clubPlayerIdChunk)
      .eq("status", "active")
      .lte("starts_on", today)
      .or(`ends_on.is.null,ends_on.gte.${today}`)

    if (error) throw error
    memberships.push(...(data || []))
  }

  const membershipIds = memberships.map((row: any) => row.id).filter(Boolean)

  const { data: requiredModuleRow, error: requiredModuleError } = await supabase
    .from("membership_modules")
    .select("id,code,is_active")
    .eq("code", requiredModule)
    .eq("is_active", true)
    .maybeSingle()

  if (requiredModuleError) throw requiredModuleError

  if (!requiredModuleRow?.id) {
    throw new Error(`Mitgliedschaftsmodul ${requiredModule} wurde nicht gefunden.`)
  }

  const membershipModuleRows: any[] = []
  if (membershipIds.length > 0) {
    for (const membershipIdChunk of chunk(membershipIds, 100)) {
      const { data, error } = await supabase
        .from("member_membership_modules")
        .select("membership_id,module_id")
        .in("membership_id", membershipIdChunk)
        .eq("module_id", requiredModuleRow.id)

      if (error) throw error
      membershipModuleRows.push(...(data || []))
    }
  }

  const eligibleMembershipIds = new Set(
    membershipModuleRows.map((row: any) => String(row.membership_id)),
  )

  const eligibleClubPlayerIds = new Set<string>()

  ;(memberships || []).forEach((membership: any) => {
    if (eligibleMembershipIds.has(String(membership.id))) {
      eligibleClubPlayerIds.add(String(membership.player_id))
    }
  })

  const trials: any[] = []
  for (const clubPlayerIdChunk of chunk(clubPlayerIds, 100)) {
    const { data, error } = await supabase
      .from("membership_trials")
      .select("player_id,module_code,starts_on,ends_on,status")
      .in("player_id", clubPlayerIdChunk)
      .eq("module_code", requiredModule)
      .eq("status", "active")
      .lte("starts_on", today)
      .gte("ends_on", today)

    if (error) throw error
    trials.push(...(data || []))
  }

  trials.forEach((trial: any) => {
    eligibleClubPlayerIds.add(String(trial.player_id))
  })

  clubPlayers.forEach((clubPlayer: any) => {
    const key = String(clubPlayer.spieldatenbank_id)
    result[key] = eligibleClubPlayerIds.has(String(clubPlayer.id))
      ? { eligible: true, reason: "" }
      : { eligible: false, reason: `Paket „${packageLabelForAccessType(accessType)}“ fehlt` }
  })

  return result
}

export async function getKratzerPlayerEligibility(
  playerIds: Array<string | number>,
  accessType: TournamentAccessType,
): Promise<ServerActionResponse & { data?: Record<string, PlayerEligibility> }> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, message: "Benutzer nicht authentifiziert." }

  try {
    const supabase = createServerSupabaseClient(await cookies())
    const data = await buildKratzerEligibility(supabase, playerIds, accessType)
    return { success: true, message: "Berechtigungen geladen.", data }
  } catch (error: any) {
    console.error("getKratzerPlayerEligibility error:", error)
    return {
      success: false,
      message: `Fehler beim Prüfen der Turnierberechtigungen: ${error?.message || "Unbekannter Fehler"}`,
    }
  }
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = createServerSupabaseClient(await cookies())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id || null
}

export async function registerPlayers(playerIds: string[], accessType: TournamentAccessType): Promise<ServerActionResponse> {
  console.log("registerPlayers: Funktion gestartet. Empfangene Player IDs:", playerIds)

  const allCookies = (await cookies()).getAll()
  console.log("registerPlayers: Empfangene Cookies im Server Action:", allCookies)

  const userId = await getCurrentUserId()
  console.log("registerPlayers: Aktueller Benutzer ID:", userId)

  if (!userId) {
    console.error("registerPlayers: Benutzer nicht authentifiziert.")
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  const supabase = createServerSupabaseClient(await cookies())

  try {
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

    const eligibility = await buildKratzerEligibility(supabase, playerIds, accessType)
    const blockedPlayer = playersData.find((player) => !eligibility[String(player.id)]?.eligible)

    if (blockedPlayer) {
      return {
        success: false,
        message: `${blockedPlayer.name} kann nicht registriert werden: ${
          eligibility[String(blockedPlayer.id)]?.reason || "Nicht teilnahmeberechtigt"
        }`,
      }
    }

    const registrationsToInsert = playersData.map((player) => ({
      player_id: player.id,
      player_name: player.name,
      ligastatus: player.ligastatus || "N/A",
      paid: false,
      access_type: accessType,
    }))

    console.log("registerPlayers: Vorbereitet für Upsert:", registrationsToInsert)

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

export async function loadRegisteredPlayers(): Promise<ServerActionResponse & { data?: SpieldatenbankEntry[] }> {
  const supabase = createServerSupabaseClient(await cookies())
  const userId = await getCurrentUserId()

  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    const { data, error } = await supabase
      .from("kratzer_tournament_registrations")
      .select("player_id, player_name, ligastatus, paid, access_type")
      .order("registered_at", { ascending: true })

    if (error) throw error

    const registeredPlayers: SpieldatenbankEntry[] = (data || []).map((reg) => ({
      id: reg.player_id,
      name: reg.player_name,
      ligastatus: reg.ligastatus,
      paid: reg.paid,
    }))

    const accessType =
      (data || []).find((row: any) => row.access_type)?.access_type || null

    return {
      success: true,
      message: "Registrierte Spieler geladen.",
      data: registeredPlayers,
      accessType,
    } as any
  } catch (error: any) {
    console.error("Fehler beim Laden registrierter Spieler:", error)
    return {
      success: false,
      message: `Fehler beim Laden registrierter Spieler: ${error.message}`,
    }
  }
}

export async function clearRegisteredPlayers(): Promise<ServerActionResponse> {
  const supabase = createServerSupabaseClient(await cookies())
  const userId = await getCurrentUserId()

  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    const { error } = await supabase
      .from("kratzer_tournament_registrations")
      .delete()
      .not("player_id", "is", null)

    if (error) throw error

    return {
      success: true,
      message: "Alle registrierten Spieler gelöscht.",
    }
  } catch (error: any) {
    console.error("Fehler beim Löschen registrierter Spieler:", error)
    return {
      success: false,
      message: `Fehler beim Löschen registrierter Spieler: ${error.message}`,
    }
  }
}

export async function markAllRegisteredPlayersPaid(): Promise<ServerActionResponse> {
  const supabase = createServerSupabaseClient(await cookies())
  const userId = await getCurrentUserId()

  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    const { error } = await supabase
      .from("kratzer_tournament_registrations")
      .update({ paid: true })
      .eq("paid", false)

    if (error) throw error

    return {
      success: true,
      message: "Alle registrierten Spieler wurden als bezahlt markiert.",
    }
  } catch (error: any) {
    console.error("Fehler beim Markieren aller Spieler als bezahlt:", error)
    return {
      success: false,
      message: `Fehler beim Markieren aller Spieler als bezahlt: ${error.message}`,
    }
  }
}

export async function updatePlayerPaidStatus(playerId: string, paid: boolean): Promise<ServerActionResponse> {
  const supabase = createServerSupabaseClient(await cookies())
  const userId = await getCurrentUserId()

  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    const { error } = await supabase
      .from("kratzer_tournament_registrations")
      .update({ paid })
      .eq("player_id", playerId)

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

export async function createKratzerTournament(
  settings: TournamentSettings,
  initialPlayers: KratzerPlayer[],
  accessType: TournamentAccessType,
  _requestedUserId?: string,
): Promise<ServerActionResponse & { data?: { tournamentId: string } }> {
  const supabase = createServerSupabaseClient(await cookies())
  const userId = await getCurrentUserId()

  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    // WICHTIG: Vor dem Erstellen prüfen, ob bereits ein laufendes
    // Kratzer-Turnier für diesen Benutzer existiert.
    // Damit kann nach Reload/Mehrfachklick kein zweites "running"-Turnier entstehen.
    const { data: existingTournament, error: existingTournamentError } = await supabase
      .from("kratzer_tournaments")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("status", "running")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingTournamentError) throw existingTournamentError

    if (existingTournament) {
      return {
        success: false,
        message: "Es läuft bereits ein Kratzer-Turnier. Bitte stellen Sie dieses Turnier wieder her.",
        data: { tournamentId: existingTournament.id },
      }
    }

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
        access_type: accessType,
      })
      .select("id")
      .single()

    if (tournamentError) throw tournamentError
    if (!tournament) throw new Error("Turnier konnte nicht erstellt werden.")

    const tournamentId = tournament.id

    const playersToInsert = initialPlayers.map((player) => ({
      kratzer_tournament_id: tournamentId,
      player_id: player.id,
      player_name: player.name,
      ligastatus: player.ligastatus,
      lives: player.lives,
      is_eliminated: player.isEliminated,
    }))

    const { error: playersInsertError } = await supabase
      .from("kratzer_tournament_players")
      .insert(playersToInsert)

    if (playersInsertError) throw playersInsertError

    revalidatePath("/live")

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

export async function updateKratzerTournamentPlayersData(
  tournamentId: string,
  playersToUpdate: KratzerPlayer[],
): Promise<ServerActionResponse> {
  const supabase = createServerSupabaseClient(await cookies())
  const userId = await getCurrentUserId()

  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
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

    revalidatePath("/live")

    return { success: true, message: "Spielerdaten erfolgreich aktualisiert." }
  } catch (error: any) {
    console.error("Fehler beim Aktualisieren der Spielerdaten:", error)
    return { success: false, message: `Fehler beim Aktualisieren der Spielerdaten: ${error.message}` }
  }
}

export async function saveKratzerTournamentRound(
  tournamentId: string,
  roundNumber: number,
  boardsData: Board[],
): Promise<ServerActionResponse> {
  const supabase = createServerSupabaseClient(await cookies())
  const userId = await getCurrentUserId()

  if (!userId) {
    return { success: false, message: "Benutzer nicht authentifiziert." }
  }

  try {
    const { error } = await supabase.from("kratzer_tournament_rounds").insert({
      kratzer_tournament_id: tournamentId,
      round_number: roundNumber,
      boards_data: JSON.parse(JSON.stringify(boardsData)),
    })

    if (error) throw error

    revalidatePath("/live")

    return { success: true, message: "Runde erfolgreich gespeichert." }
  } catch (error: any) {
    console.error("Fehler beim Speichern der Runde:", error)
    return { success: false, message: `Fehler beim Speichern der Runde: ${error.message}` }
  }
}

export async function updateKratzerTournamentStatus(
  tournamentId: string,
  status: "finished" | "cancelled",
  winnerId?: string,
  winnerName?: string,
  totalRounds?: number,
): Promise<ServerActionResponse> {
  const supabase = createServerSupabaseClient(await cookies())
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

    const { error } = await supabase
      .from("kratzer_tournaments")
      .update(updateData)
      .eq("id", tournamentId)

    if (error) throw error

    revalidatePath("/live")

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

export async function getActiveKratzerTournament(): Promise<ServerActionResponse & { data?: any }> {
  const supabase = createServerSupabaseClient(await cookies())
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

export async function getLastKratzerTournamentRound(
  tournamentId: string,
): Promise<ServerActionResponse & { data?: any }> {
  const supabase = createServerSupabaseClient(await cookies())
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

export async function getKratzerTournamentPlayers(
  tournamentId: string,
): Promise<ServerActionResponse & { data?: KratzerPlayer[] }> {
  const supabase = createServerSupabaseClient(await cookies())
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
  playerResults: any[],
): Promise<ServerActionResponse> {
  const supabase = createServerSupabaseClient(await cookies())
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
      results_data: playerResults,
    })

    if (error) throw error

    revalidatePath("/live")

    return { success: true, message: "Turnierergebnisse erfolgreich gespeichert." }
  } catch (error: any) {
    console.error("Fehler beim Speichern der Turnierergebnisse:", error)
    return {
      success: false,
      message: `Fehler beim Speichern der Turnierergebnisse: ${error.message}`,
    }
  }
}