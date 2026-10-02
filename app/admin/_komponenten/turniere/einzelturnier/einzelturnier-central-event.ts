import { supabase } from "@/lib/supabase"
import type { TournamentAccessType } from "./einzelturnier-berechtigungen"

type CentralEvent = {
  id: string
  title: string | null
  entry_fee: number | null
  access_type: TournamentAccessType | null
  selected_mode: "dko" | "round_robin" | null
}

type CentralRegistration = {
  id: string
  player_id: string | number | null
  player_name_snapshot: string
  paid: boolean
  status: string
  entry_no: number
}

type CentralDoubleTeam = {
  id: string
  team_mode: "fixed" | "drawn"
  position: number
  registration1_id: string
  registration2_id: string
  team_name: string
}

export async function loadCentralEventForSetup(centralEventId: string): Promise<{
  event: CentralEvent
  registrations: CentralRegistration[]
}> {
  const [{ data: eventData, error: eventError }, { data: centralRows, error: centralError }] =
    await Promise.all([
      supabase
        .from("central_tournament_events")
        .select("id,title,entry_fee,access_type,selected_mode")
        .eq("id", centralEventId)
        .single(),
      supabase
        .from("central_tournament_registrations")
        .select("id,player_id,player_name_snapshot,paid,status,entry_no")
        .eq("event_id", centralEventId)
        .eq("status", "registered")
        .order("registered_at", { ascending: true }),
    ])

  if (eventError) throw eventError
  if (centralError) throw centralError

  const registrations = (centralRows || []) as CentralRegistration[]
  const unresolved = registrations.filter((row) => !row.player_id)

  if (unresolved.length > 0) {
    throw new Error(
      `${unresolved.length} Anmeldung${unresolved.length === 1 ? "" : "en"} ohne Spielerdatenbank-Zuordnung. Bitte zuerst in der Turnier-Zentrale eindeutig zuordnen.`,
    )
  }

  return {
    event: eventData as CentralEvent,
    registrations,
  }
}

export async function syncCentralEventRegistrations(opts: {
  centralEventId: string
  event: CentralEvent
  registrations: CentralRegistration[]
  teamMode?: "single" | "fixed" | "drawn"
  tournamentMode?: "dko" | "round_robin"
}) {
  const { centralEventId, event } = opts
  const teamMode = opts.tournamentMode === "dko" ? (opts.teamMode || "single") : "single"
  const registrations = opts.tournamentMode === "round_robin"
    ? opts.registrations.filter((row) => Number(row.entry_no || 1) === 1)
    : opts.registrations

  const { error: clearError } = await supabase
    .from("dko_tournament_registration")
    .delete()
    .eq("event_id", centralEventId)

  if (clearError) throw clearError

  let rows: Array<Record<string, unknown>> = []

  if (teamMode === "fixed" || teamMode === "drawn") {
    const { data: teamData, error: teamError } = await supabase
      .from("central_tournament_double_teams")
      .select("id,team_mode,position,registration1_id,registration2_id,team_name")
      .eq("event_id", centralEventId)
      .eq("team_mode", teamMode)
      .order("position", { ascending: true })

    if (teamError) throw teamError

    const teams = (teamData || []) as CentralDoubleTeam[]
    const registrationById = new Map(registrations.map((row) => [row.id, row]))

    if (teams.length === 0) {
      throw new Error(teamMode === "fixed" ? "Es wurden noch keine fixen Doppel zusammengestellt." : "Die gelosten Doppel fehlen.")
    }

    rows = teams.map((team) => {
      const first = registrationById.get(team.registration1_id)
      const second = registrationById.get(team.registration2_id)
      if (!first || !second) {
        throw new Error(`Doppel ${team.position} ist nicht mehr vollständig. Bitte die Paarungen in der Turnier-Zentrale neu prüfen.`)
      }

      return {
        player_id: team.id,
        player_name: team.team_name,
        paid: Boolean(first.paid && second.paid),
        entry_fee: Number(event.entry_fee || 0),
        deducted_from_credit: false,
        payment_method: "admin",
        access_type: event.access_type || "club_internal",
        event_id: centralEventId,
        event_name: event.title || null,
      }
    })
  } else {
    rows = registrations.map((row) => ({
      player_id: Number(row.entry_no || 1) > 1 ? row.id : row.player_id,
      player_name: row.player_name_snapshot,
      paid: Boolean(row.paid),
      entry_fee: Number(event.entry_fee || 0),
      deducted_from_credit: false,
      payment_method: "admin",
      access_type: event.access_type || "club_internal",
      event_id: centralEventId,
      event_name: event.title || null,
    }))
  }

  if (rows.length === 0) return

  const { error: insertError } = await supabase
    .from("dko_tournament_registration")
    .insert(rows)

  if (insertError) throw insertError
}

export async function markCentralEventStarted(
  centralEventId: string,
  selectedMode: "dko" | "round_robin",
) {
  const { error } = await supabase
    .from("central_tournament_events")
    .update({
      status: "started",
      selected_mode: selectedMode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", centralEventId)

  if (error) throw error
}
