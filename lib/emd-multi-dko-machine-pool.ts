"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Pool = { isMulti: boolean; ready: boolean; allowed: number[] | null }

// Fail closed for prepared Multi-DKO: never show unconfigured machines.
export function useMultiDkoMachinePool(tournamentId: string): Pool {
  const [pool, setPool] = useState<Pool>({ isMulti: false, ready: false, allowed: null })
  useEffect(() => {
    let cancelled = false
    setPool({ isMulti: true, ready: false, allowed: [] })
    if (!tournamentId) return () => { cancelled = true }
    void (async () => {
      const { data: run, error: runError } = await supabase.from("emd_dko_prepared_runs")
        .select("central_event_id,division").eq("tournament_id", tournamentId).maybeSingle()
      if (cancelled) return
      if (runError) { console.error("DKO-Run konnte nicht gelesen werden", runError); return }
      if (!run) { setPool({ isMulti: false, ready: true, allowed: null }); return }
      const { data: settings, error } = await supabase.from("emd_dko_machine_settings")
        .select("mode,machine_count,herren,damen").eq("event_id", run.central_event_id).maybeSingle()
      if (cancelled) return
      if (error || !settings) { console.error("Multi-DKO Automaten fehlen", error); return }
      const count = Number(settings.machine_count)
      if (!Number.isInteger(count) || count < 1 || count > 32) return
      const configured = settings.mode === "fixed"
        ? (run.division === "herren" ? settings.herren : settings.damen)
        : Array.from({ length: count }, (_, i) => i + 1)
      const allowed = Array.isArray(configured)
        ? [...new Set(configured.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= count))].sort((a,b)=>a-b)
        : []
      setPool({ isMulti: true, ready: true, allowed })
    })()
    return () => { cancelled = true }
  }, [tournamentId])
  return pool
}
