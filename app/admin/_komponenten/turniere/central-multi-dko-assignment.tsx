"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, UsersRound } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Registration = {
  id: string
  player_name_snapshot: string
  status: "registered" | "waitlist" | "withdrawn"
  paid: boolean
}
type Division = "herren" | "damen"
type Filter = "alle" | Division | "offen"

export function CentralMultiDkoAssignment({
  eventId,
  registrations,
  locked,
  onViewChange,
}: {
  eventId: string
  registrations: Registration[]
  locked: boolean
  onViewChange?: (view: { eventId: string; enabled: boolean; filter: Filter; assignments: Record<string, Division>; loading: boolean }) => void
}) {
  const [enabled, setEnabled] = useState(false)
  const [filter, setFilter] = useState<Filter>("alle")
  const [assignments, setAssignments] = useState<Record<string, Division>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const reload = useCallback(async () => {
    setLoading(true)
    setError("")
    const { data, error: queryError } = await supabase
      .from("emd_dko_registration_divisions")
      .select("registration_id,division")
      .eq("event_id", eventId)
    if (queryError) {
      setError(`Einteilung konnte nicht geladen werden: ${queryError.message}`)
    } else {
      const next: Record<string, Division> = {}
      for (const row of data || []) {
        if (row.division === "herren" || row.division === "damen") next[row.registration_id] = row.division
      }
      setAssignments(next)
    }
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    setEnabled(false)
    setFilter("alle")
    setAssignments({})
    setNotice("")
    void reload()
  }, [reload])

  useEffect(() => {
    onViewChange?.({ eventId, enabled, filter, assignments, loading })
  }, [eventId, enabled, filter, assignments, loading, onViewChange])

  const active = useMemo(() => registrations.filter((r) => r.status === "registered"), [registrations])
  const counts = {
    alle: active.length,
    herren: active.filter((r) => assignments[r.id] === "herren").length,
    damen: active.filter((r) => assignments[r.id] === "damen").length,
    offen: active.filter((r) => !assignments[r.id]).length,
  }
  const visible = active.filter((r) => filter === "alle" || (filter === "offen" ? !assignments[r.id] : assignments[r.id] === filter))

  async function assign(registrationId: string, next: Division | null) {
    if (locked || busyId || loading) return
    setBusyId(registrationId)
    setError("")
    setNotice("")
    try {
      if (next) {
        const { error: saveError } = await supabase
          .from("emd_dko_registration_divisions")
          .upsert({ registration_id: registrationId, event_id: eventId, division: next, updated_at: new Date().toISOString() }, { onConflict: "registration_id" })
        if (saveError) throw saveError
        setAssignments((old) => ({ ...old, [registrationId]: next }))
      } else {
        const { error: deleteError } = await supabase
          .from("emd_dko_registration_divisions")
          .delete().eq("registration_id", registrationId).eq("event_id", eventId)
        if (deleteError) throw deleteError
        setAssignments((old) => { const copy = { ...old }; delete copy[registrationId]; return copy })
      }
      setNotice("Zuordnung gespeichert.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Zuordnung konnte nicht gespeichert werden.")
    } finally { setBusyId(null) }
  }

  return (
    <section className="emd-admin-surface overflow-hidden p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-base font-black text-white"><UsersRound className="h-5 w-5 text-orange-300" /> Multi-DKO · Herren & Damen</div>
          <p className="mt-1 text-xs font-semibold text-white/45">Optional: Teilnehmer für getrennte Turniere einteilen. Die bestehende Anmeldung und der normale Turnierstart bleiben unverändert.</p>
        </div>
        <button type="button" onClick={() => setEnabled((v) => !v)} className="rounded-xl border border-orange-300/25 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-100 hover:bg-orange-500/20">
          {enabled ? "Einteilung schließen" : "Herren / Damen einteilen"}
        </button>
      </div>
      {enabled && (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <div className="flex flex-wrap gap-2">
            {(["alle", "herren", "damen", "offen"] as Filter[]).map((tab) => (
              <button type="button" key={tab} onClick={() => setFilter(tab)} className={`rounded-xl border px-3 py-2 text-xs font-black ${filter === tab ? "border-orange-400/45 bg-orange-500/15 text-orange-100" : "border-white/10 bg-white/[0.03] text-white/50"}`}>
                {tab === "alle" ? "Alle" : tab === "herren" ? "Herren" : tab === "damen" ? "Damen" : "Noch offen"} · {counts[tab]}
              </button>
            ))}
            <button type="button" onClick={() => void reload()} disabled={loading || !!busyId} className="ml-auto rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/60">Aktualisieren</button>
          </div>
          {loading ? <p className="flex items-center gap-2 text-xs text-white/60"><Loader2 className="h-4 w-4 animate-spin" /> Einteilung laden …</p> : null}
          {error ? <p role="alert" className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p> : null}
          {notice ? <p className="flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4" />{notice}</p> : null}
          {!loading && visible.length === 0 ? <p className="text-xs text-white/50">Keine Anmeldungen in dieser Ansicht.</p> : null}
          {!loading && visible.map((row) => (
            <div key={row.id} className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-[#0b0f15] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="truncate text-sm font-bold text-white">{row.player_name_snapshot}</p><p className="text-[11px] text-white/40">{row.paid ? "Bezahlt" : "Zahlung offen"} · {assignments[row.id] === "herren" ? "Herren" : assignments[row.id] === "damen" ? "Damen" : "Noch nicht eingeteilt"}</p></div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {(["herren", "damen", "offen"] as const).map((value) => (
                  <button type="button" key={value} disabled={locked || loading || !!busyId} onClick={() => void assign(row.id, value === "offen" ? null : value)} className={`rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-35 ${(assignments[row.id] || "offen") === value ? "border-orange-400/50 bg-orange-500/20 text-orange-100" : "border-white/10 bg-white/[0.025] text-white/50 hover:text-white"}`}>
                    {value === "herren" ? "Herren" : value === "damen" ? "Damen" : "Offen"}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs font-semibold text-white/40">Die Zuordnungen werden in Supabase gespeichert. Noch kein paralleler Turnierstart: Der bisherige Startbutton berücksichtigt die Einteilung nicht.</p>
        </div>
      )}
    </section>
  )
}
