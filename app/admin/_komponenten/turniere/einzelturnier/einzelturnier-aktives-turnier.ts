import { supabase } from "@/lib/supabase"
import type { TournamentAccessType } from "./einzelturnier-berechtigungen"

export type ActiveTournament = {
  tournamentId: string
  tournamentName: string
  tournamentType: string
  accessType?: TournamentAccessType | null
  incompleteMatches: number
}

export async function fetchActiveTournamentData(opts?: { centralEventId?: string | null; seriesId?: string | null; eventId?: string | null }): Promise<ActiveTournament | null> {
  const centralEventId = opts?.centralEventId ?? null
  const seriesId = opts?.seriesId ?? null
  const eventId = opts?.eventId ?? null
  let centralEventTitle: string | null = null

  // Niemals ein fremdes laufendes Turnier an eine ungebundene Setup-Seite hängen.
  if (!centralEventId && !eventId) return null

  if (centralEventId && !eventId) {
    const { data: centralEvent, error: centralEventError } = await supabase
      .from("central_tournament_events")
      .select("title,status")
      .eq("id", centralEventId)
      .maybeSingle()

    if (centralEventError) throw centralEventError
    if (!centralEvent || centralEvent.status !== "started") return null
    centralEventTitle = centralEvent.title || null
  }

  let query = supabase
    .from("tournaments_status")
    .select("tournament_id, tournament_type, tournament_name, access_type, created_at, central_event_id, series_id, series_event_id")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)

  if (eventId) {
    query = query.eq("series_event_id", eventId)
    if (seriesId) query = query.eq("series_id", seriesId)
  } else if (centralEventId) {
    query = query.eq("central_event_id", centralEventId)
  } else if (centralEventTitle) {
    query = query.eq("tournament_name", centralEventTitle)
  }

  const { data, error } = await query.maybeSingle()

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
  seriesId?: string | null
  eventId?: string | null
}) {
  const { error: statusError } = await supabase
    .from("tournaments_status")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("tournament_id", opts.tournamentId)

  if (statusError) throw statusError

  // WICHTIG: Beim Abbrechen eines laufenden Turniers werden KEINE Voranmeldungen gelöscht.
  // Die Registrierungstabelle kann gleichzeitig Anmeldungen für andere Turniere/Serien enthalten.
  // Ein Abbruch ändert ausschließlich den Laufstatus des betroffenen Turniers.

  if (opts.centralEventId) {
    const { error: centralEventError } = await supabase
      .from("central_tournament_events")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", opts.centralEventId)

    if (centralEventError) throw centralEventError
  }
}
