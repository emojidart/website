"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Division = "herren" | "damen"
type Run = { tournament_id: string; division: Division }
type Running = { tournament_id: string; tournament_type: string; tournament_name: string; access_type: string | null; status: string }

const routes: Record<string, string> = {
  "8er_dko": "/8erdko", "16er_dko": "/16erdko", "32er_dko": "/32erdko",
  "64er_dko": "/64erdko", "128er_dko": "/128erdko",
}

export function EmdMultiDkoQuickSwitch({ tournamentId, centralEventId }: { tournamentId: string; centralEventId: string | null }) {
  const router = useRouter()
  const [transitionPending, startTransition] = useTransition()
  const [current, setCurrent] = useState<Division | null>(null)
  const [runs, setRuns] = useState<Partial<Record<Division, Running>>>({})
  const [error, setError] = useState("")


  useEffect(() => {
    let cancelled = false
    setCurrent(null)
    setRuns({})
    setError("")
    if (!centralEventId || !tournamentId) return
    const load = async () => {
      const { data: prepared, error: preparedError } = await supabase
        .from("emd_dko_prepared_runs")
        .select("tournament_id,division")
        .eq("central_event_id", centralEventId)
      if (preparedError) throw preparedError
      const matched = (prepared || []).find((item) => item.tournament_id === tournamentId && ["herren", "damen"].includes(item.division)) as Run | undefined
      if (!matched) return
      const { data: statuses, error: statusError } = await supabase
        .from("tournaments_status")
        .select("tournament_id,tournament_type,tournament_name,access_type,status")
        .eq("central_event_id", centralEventId)
        .eq("status", "active")
      if (statusError) throw statusError
      const next: Partial<Record<Division, Running>> = {}
      for (const group of (prepared || []) as Run[]) {
        if (group.division !== "herren" && group.division !== "damen") continue
        const row = (statuses || []).find((s) => s.tournament_id === group.tournament_id)
        if (row && routes[row.tournament_type]) next[group.division] = row as Running
      }
      if (!cancelled) { setCurrent(matched.division); setRuns(next) }
    }
    void load().catch((e) => { if (!cancelled) setError(e?.message || "Turnierstatus nicht verfügbar") })
    return () => { cancelled = true }
  }, [centralEventId, tournamentId])

  if (!current) return null
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-orange-400/20 bg-orange-500/[0.06] p-1" aria-label="Multi-DKO Schnellwechsel">
      {(["herren", "damen"] as const).map((division) => {
        const active = division === current
        const run = runs[division]
        return (
          <button key={division} type="button" disabled={active || !run || transitionPending}
            title={active ? "Dieses DKO ist geöffnet" : !run ? "Noch nicht gestartet – in der Turnierzentrale starten" : `${division === "herren" ? "Herren" : "Damen"}-DKO öffnen`}
            onClick={() => {
              if (!run || active || !centralEventId || transitionPending) return
              const route = routes[run.tournament_type]
              if (!route) return
              const params = new URLSearchParams({ tournamentId: run.tournament_id, tournamentName: run.tournament_name, accessType: run.access_type || "public", centralEventId })
              // Client-side navigation; the keyed bracket wrapper remounts ONLY the
              // bracket when tournamentId changes, preserving the surrounding UI.
              startTransition(() => router.push(`${route}?${params.toString()}`, { scroll: false }))
            }}
            className={`h-9 rounded-lg px-3 text-xs font-black transition sm:text-sm ${active ? "bg-orange-500 text-black" : run ? "bg-white/[0.07] text-white hover:bg-orange-500/20" : "cursor-not-allowed text-white/35"}`}
          >
            {division === "herren" ? "Herren" : "Damen"}{active ? " · aktiv" : !run ? " · wartet" : " ↗"}
          </button>
        )
      })}
      {error && <span className="px-2 text-xs text-rose-300" title={error}>Wechsel nicht verfügbar</span>}
    </div>
  )
}
