"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Division = "offen" | "herren" | "damen"
type Player = { id: number; player_name: string; paid: boolean }
type Registration = { id: string; player_name_snapshot: string | null; paid: boolean | null; entry_no: number | null; status: string | null }
type Props = { eventKey: string; centralEventId?: string | null; players: Player[] }
const labels: Record<Division, string> = { offen: "Noch offen", herren: "Herren", damen: "Damen" }
const divisions: Division[] = ["offen", "herren", "damen"]
const uuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

/** Die Supabase-Zuordnung greift niemals in bestehende Anmeldung, Zahlungen oder Turnierstart ein. */
export function MultiDkoZuordnung({ eventKey, centralEventId, players }: Props) {
  const remote = Boolean(centralEventId && uuid(centralEventId))
  const [enabled, setEnabled] = useState(Boolean(centralEventId))
  const [tab, setTab] = useState<"alle" | Division>("alle")
  const [assignments, setAssignments] = useState<Record<string, Division>>({})
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState<string | null>(null)
  const [preparing, setPreparing] = useState<"herren" | "damen" | null>(null)
  const [prepared, setPrepared] = useState<Record<string, { id: string; count: number }>>({})
  const storageKey = `emd:dko:division-draft:v1:${eventKey}`

  const reload = async () => {
    if (!centralEventId || !uuid(centralEventId)) return
    const [{ data: entries, error: entriesError }, { data: saved, error: savedError }] = await Promise.all([
      supabase.from("central_tournament_registrations")
        .select("id,player_name_snapshot,paid,entry_no,status")
        .eq("event_id", centralEventId).order("registered_at", { ascending: true }),
      supabase.from("emd_dko_registration_divisions")
        .select("registration_id,division").eq("event_id", centralEventId),
    ])
    if (entriesError || savedError) throw new Error(entriesError?.message || savedError?.message)
    setRegistrations((entries || []).filter(r => r.status === "registered") as Registration[])
    const next: Record<string, Division> = {}
    for (const row of saved || []) {
      if (row.division === "herren" || row.division === "damen") next[row.registration_id] = row.division
    }
    setAssignments(next)
    const { data: runs, error: runsError } = await supabase.from("emd_dko_prepared_runs")
      .select("tournament_id,division").eq("central_event_id", centralEventId)
    if (runsError) throw runsError
    const summaries: Record<string, { id: string; count: number }> = {}
    for (const run of runs || []) {
      if (run.division !== "herren" && run.division !== "damen") continue
      const { count, error: countError } = await supabase.from("emd_dko_run_players")
        .select("registration_id", { count: "exact", head: true }).eq("tournament_id", run.tournament_id)
      if (countError) throw countError
      summaries[run.division] = { id: run.tournament_id, count: count || 0 }
    }
    setPrepared(summaries)
  }

  useEffect(() => {
    let active = true
    setReady(false); setAssignments({}); setRegistrations([]); setError(""); setTab("alle"); setEnabled(remote)
    if (remote) {
      (async () => {
        try { setBusy(true); await reload(); if (active) setReady(true) }
        catch (e) { if (active) setError(e instanceof Error ? e.message : "Daten konnten nicht geladen werden") }
        finally { if (active) setBusy(false) }
      })()
    } else {
      try {
        const saved = JSON.parse(window.localStorage.getItem(storageKey) || "{}")
        setEnabled(saved.enabled === true)
        setAssignments(saved.assignments || {})
      } catch { /* Defekte lokale Entwürfe ignorieren */ }
      setReady(true)
    }
    return () => { active = false }
    // Reload happens on event change; avoid resetting while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centralEventId, storageKey, remote])

  useEffect(() => {
    if (!ready || remote) return
    try { window.localStorage.setItem(storageKey, JSON.stringify({ enabled, assignments })) } catch { /* Browser blockiert Speicher */ }
  }, [storageKey, enabled, assignments, remote, ready])

  const rows = useMemo(() => remote
    ? registrations.map(r => ({ id: r.id, name: r.player_name_snapshot || "Unbekannt", paid: Boolean(r.paid), suffix: r.entry_no && r.entry_no > 1 ? ` · Anmeldung ${r.entry_no}` : "" }))
    : players.map(r => ({ id: String(r.id), name: r.player_name, paid: r.paid, suffix: "" })), [remote, registrations, players])
  const counts = useMemo(() => {
    const tally = { offen: 0, herren: 0, damen: 0 }
    for (const row of rows) tally[assignments[row.id] ?? "offen"]++
    return tally
  }, [rows, assignments])

  const change = async (id: string, division: Division) => {
    if (saving) return
    const before = assignments[id] ?? "offen"
    if (prepared[before] || prepared[division]) {
      setError("Eine dieser Gruppen ist bereits vorbereitet. Die Teilnehmerliste ist gesperrt, damit der Lauf nicht abweicht.")
      return
    }
    setAssignments(old => ({ ...old, [id]: division }))
    if (!remote || !centralEventId) return
    setSaving(id); setError("")
    const result = division === "offen"
      ? await supabase.from("emd_dko_registration_divisions").delete().eq("event_id", centralEventId).eq("registration_id", id).select("registration_id")
      : await supabase.from("emd_dko_registration_divisions").upsert({ event_id: centralEventId, registration_id: id, division }, { onConflict: "registration_id" }).select("registration_id")
    if (result.error || (division !== "offen" && (!result.data || result.data.length !== 1))) {
      setAssignments(old => ({ ...old, [id]: before }))
      setError(result.error?.message || "Speichern fehlgeschlagen. Bitte Admin-Anmeldung prüfen.")
    }
    setSaving(null)
  }

  // Nur unabhängige, unveränderliche Snapshots vorbereiten. Bestehende Läufe nie überschreiben.
  const prepareDivision = async (division: "herren" | "damen") => {
    if (!remote || !centralEventId || saving || preparing) return
    setPreparing(division); setError("")
    try {
      // Frische Serverdaten statt möglicherweise veralteter Browser-Zuordnungen.
      const [{ data: registrationsNow, error: registrationError }, { data: assignedNow, error: assignmentError }] = await Promise.all([
        supabase.from("central_tournament_registrations")
          .select("id,player_name_snapshot,paid,status").eq("event_id", centralEventId).eq("status", "registered")
          .order("registered_at", { ascending: true }),
        supabase.from("emd_dko_registration_divisions").select("registration_id,division").eq("event_id", centralEventId),
      ])
      if (registrationError || assignmentError) throw registrationError || assignmentError
      const selectedIds = new Set((assignedNow || []).filter(r => r.division === division).map(r => r.registration_id))
      const selected = (registrationsNow || []).filter(r => selectedIds.has(r.id))
      if (selected.length < 2) throw new Error(`Für ${division} müssen mindestens zwei Personen zugeordnet sein.`)
      if (selected.some(r => !r.paid)) throw new Error(`Für ${division} sind noch Zahlungen offen. Bitte zuerst klären.`)
      if (selected.some(r => !r.player_name_snapshot?.trim())) throw new Error("Ein Spielername fehlt.")
      const { data: previous, error: previousError } = await supabase.from("emd_dko_prepared_runs")
        .select("tournament_id").eq("central_event_id", centralEventId).eq("division", division).limit(1)
      if (previousError) throw previousError
      if (previous?.length) throw new Error("Dieser Lauf wurde bereits vorbereitet. Bestehende Teilnehmerliste wird nicht überschrieben.")
      const tournamentId = globalThis.crypto.randomUUID()
      const { error: runError } = await supabase.from("emd_dko_prepared_runs")
        .insert({ tournament_id: tournamentId, central_event_id: centralEventId, division })
      if (runError) throw runError
      const { error: playerError } = await supabase.from("emd_dko_run_players")
        .insert(selected.map((r, i) => ({ tournament_id: tournamentId, registration_id: r.id,
          player_name: r.player_name_snapshot!.trim(), seed_order: i + 1 })))
      if (playerError) {
        await supabase.from("emd_dko_prepared_runs").delete().eq("tournament_id", tournamentId)
        throw playerError
      }
      await reload()
    } catch (e) { setError(e instanceof Error ? e.message : "Vorbereitung fehlgeschlagen") }
    finally { setPreparing(null) }
  }

  if (!ready && !error) return <div className="rounded-xl border border-white/10 p-4 text-xs text-white/60">DKO-Einteilung wird geladen …</div>

  return <section className="rounded-[24px] border border-white/10 bg-[#0b0f15]/95 p-4 text-white sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300/70">DKO · Vorbereitung</p>
        <h3 className="mt-1 text-lg font-black">Herren- und Damen-Einteilung</h3>
        <p className="mt-1 text-xs text-white/50">Zusätzlich zur bisherigen Anmeldung. Zahlungen und Turnierstart unverändert.</p>
      </div>
      <button type="button" aria-pressed={enabled} onClick={() => setEnabled(!enabled)} className={`rounded-xl border px-4 py-2 text-sm font-bold ${enabled ? "border-orange-400/40 bg-orange-500/20 text-orange-200" : "border-white/15 bg-white/5 text-white/70"}`}>
        {enabled ? "Einteilung ausblenden" : "Einteilung anzeigen"}
      </button>
    </div>
    {error && <p role="alert" className="mt-3 rounded-lg border border-red-500/40 p-3 text-xs text-red-200">{error} {remote && "Keine Änderung an den Anmeldungen."}</p>}
    {enabled && <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="DKO-Einteilung">
        {(["alle", ...divisions] as const).map(value => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`rounded-xl px-3 py-2 text-xs font-bold ${tab === value ? "bg-orange-500 text-black" : "border border-white/10 bg-white/5 text-white/75"}`}>{value === "alle" ? "Alle" : labels[value]} ({value === "alle" ? rows.length : counts[value]})</button>)}
      </div>
      <div className="max-h-72 divide-y divide-white/10 overflow-y-auto rounded-xl border border-white/10">
        {rows.filter(row => tab === "alle" || (assignments[row.id] ?? "offen") === tab).map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <div><div className="text-sm font-semibold">{row.name}{row.suffix}</div><div className="text-[11px] text-white/40">{row.paid ? "Bezahlt" : "Zahlung offen"}</div></div>
          <select aria-label={`${row.name} zuordnen`} disabled={Boolean(saving) || (remote && Boolean(error))} value={assignments[row.id] ?? "offen"} onChange={e => void change(row.id, e.target.value as Division)} className="rounded-lg border border-white/15 bg-[#151a22] px-2 py-2 text-xs font-semibold text-white">{divisions.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select>
        </div>)}
        {!rows.length && <p className="p-3 text-xs text-white/50">Noch keine Voranmeldungen in dieser Veranstaltung.</p>}
      </div>
      {remote && <div className="rounded-xl border border-orange-400/20 bg-orange-500/5 p-3 space-y-2">
        <p className="text-sm font-bold text-orange-200">Getrennte DKO-Listen vorbereiten</p>
        <p className="text-xs text-white/60">Erstellt eine feste Teilnehmerliste je Gruppe. Noch kein Turnierstart. Ein vorbereiteter Lauf wird nicht überschrieben.</p>
        <div className="flex flex-wrap gap-2">
          {(["herren", "damen"] as const).map(division => <button key={division} type="button"
            disabled={Boolean(preparing) || Boolean(saving) || busy || Boolean(prepared[division])}
            onClick={() => void prepareDivision(division)}
            className="rounded-lg border border-orange-400/30 bg-orange-500/15 px-3 py-2 text-xs font-bold text-orange-100 disabled:opacity-40">
            {prepared[division] ? `${labels[division]} vorbereitet (${prepared[division].count})` : preparing === division ? "Vorbereitung …" : `${labels[division]} vorbereiten`}
          </button>)}
        </div>
      </div>}
      {remote && <button type="button" disabled={busy || Boolean(saving)} onClick={() => { setBusy(true); void reload().catch(e => setError(String(e))).finally(() => setBusy(false)) }} className="text-xs font-bold text-orange-300">{busy ? "Lädt …" : "Einteilung aktualisieren"}</button>}
      <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100/80">{remote ? "Die Zuordnung wird in Supabase gespeichert und kann am anderen Admin-Gerät geladen werden. Sie beeinflusst noch nicht den Turnierstart." : "Keine zentrale Veranstaltung erkannt: Diese Zuordnung ist nur ein lokaler Entwurf. Noch keine Synchronisierung."}</p>
    </div>}
  </section>
}
