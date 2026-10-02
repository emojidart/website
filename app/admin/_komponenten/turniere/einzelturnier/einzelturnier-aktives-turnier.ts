import { supabase } from "@/lib/supabase"
import type { TournamentAccessType } from "./einzelturnier-berechtigungen"

export type ActiveTournament = {
  tournamentId: string
  tournamentName: string
  tournamentType: string
  accessType?: TournamentAccessType | null
  incompleteMatches: number
}

export async function fetchActiveTournamentData(): Promise<ActiveTournament | null> {
  const { data, error } = await supabase
    .from("tournaments_status")
    .select("tournament_id, tournament_type, tournament_name, access_type")
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    tournamentId: data.tournament_id,
    tournamentName: data.tournament_name,
    tournamentType: data.tournament_type,
    accessType: (data as any).access_type || null,
    incompleteMatches: 0,
  }
}

export async function cancelActiveTournamentData(opts: {
  tournamentId: string
  centralEventId: string | null
}) {
  const { error: statusError } = await supabase
    .from("tournaments_status")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("tournament_id", opts.tournamentId)

  if (statusError) throw statusError

  let registrationDelete = supabase
    .from("dko_tournament_registration")
    .delete()

  registrationDelete = opts.centralEventId
    ? registrationDelete.eq("event_id", opts.centralEventId)
    : registrationDelete.is("event_id", null)

  const { error: registrationError } = await registrationDelete
  if (registrationError) throw registrationError
}
