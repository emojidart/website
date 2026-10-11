import { supabase } from "@/lib/supabase"

/** Fail closed: a network/RLS error must never be interpreted as normal DKO. */
export async function isPreparedMultiDkoRun(tournamentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("emd_dko_prepared_runs")
    .select("tournament_id")
    .eq("tournament_id", tournamentId)
    .maybeSingle()
  if (error) throw new Error(`Multi-DKO-Prüfung fehlgeschlagen: ${error.message}`)
  return Boolean(data)
}

/**
 * A single division must not finish/cancel the whole central event while its
 * sibling division is still active. Returns false for a normal tournament.
 */
export async function finishCentralMultiDkoRun(
  tournamentId: string,
  centralEventId: string,
  result: "completed" | "cancelled",
): Promise<boolean> {
  if (!(await isPreparedMultiDkoRun(tournamentId))) return false

  const { data: activeRuns, error: activeError } = await supabase
    .from("tournaments_status")
    .select("tournament_id")
    .eq("central_event_id", centralEventId)
    .eq("status", "active")
  if (activeError) throw new Error(`Weitere DKO konnten nicht geprüft werden: ${activeError.message}`)
  if ((activeRuns || []).some((row) => row.tournament_id !== tournamentId)) return true

  const { data: runRows, error: runsError } = await supabase
    .from("emd_dko_prepared_runs")
    .select("tournament_id")
    .eq("central_event_id", centralEventId)
  if (runsError) throw new Error(`DKO-Läufe konnten nicht geprüft werden: ${runsError.message}`)
  const runIds = new Set((runRows || []).map((row) => row.tournament_id))
  if (!runIds.has(tournamentId)) throw new Error("Turnier gehört nicht zu dieser Veranstaltung.")
  const { data: statuses, error: statusError } = await supabase
    .from("tournaments_status")
    .select("tournament_id,status")
    .eq("central_event_id", centralEventId)
  if (statusError) throw new Error(`Turnierstatus konnte nicht geprüft werden: ${statusError.message}`)
  const remaining = (statuses || []).filter((row) => runIds.has(row.tournament_id))
  if (remaining.some((row) => row.status === "active")) return true
  const eventStatus = remaining.some((row) => row.status === "completed") ? "completed" : result
  const { error: eventError } = await supabase
    .from("central_tournament_events")
    .update({ status: eventStatus, updated_at: new Date().toISOString() })
    .eq("id", centralEventId)
  if (eventError) throw new Error(`Veranstaltungsabschluss fehlgeschlagen: ${eventError.message}`)
  return true
}
