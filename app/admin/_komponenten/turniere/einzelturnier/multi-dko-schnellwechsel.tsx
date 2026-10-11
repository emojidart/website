"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { buildTournamentContinueRoute } from "./einzelturnier-engine"
import type { TournamentAccessType } from "./einzelturnier-berechtigungen"

type Lauf = {
  tournament_id: string
  tournament_type: string
  tournament_name: string | null
  access_type: string | null
  created_at: string
}

/** Read-only navigation: never changes status, registrations, results or tournament assignments. */
export function MultiDkoSchnellwechsel({ centralEventId, eventId, seriesId }: {
  centralEventId?: string | null
  eventId?: string | null
  seriesId?: string | null
}) {
  const router = useRouter()
  const [turniere, setTurniere] = useState<Lauf[]>([])
  const [fehler, setFehler] = useState("")

  const laden = useCallback(async () => {
    if (!centralEventId && !eventId) return
    let query = supabase.from("tournaments_status")
      .select("tournament_id,tournament_type,tournament_name,access_type,created_at")
      .eq("status", "active")
      .in("tournament_type", ["8er_dko", "16er_dko", "32er_dko", "64er_dko", "128er_dko"])
      .order("created_at", { ascending: true })
    if (centralEventId) query = query.eq("central_event_id", centralEventId)
    else if (eventId) {
      query = query.eq("series_event_id", eventId)
      if (seriesId) query = query.eq("series_id", seriesId)
    }
    const { data, error } = await query
    if (error) { setFehler("Aktive Turniere konnten nicht geladen werden."); return }
    setFehler("")
    setTurniere((data ?? []) as Lauf[])
  }, [centralEventId, eventId, seriesId])

  useEffect(() => {
    void laden()
    const listener = () => { if (document.visibilityState === "visible") void laden() }
    document.addEventListener("visibilitychange", listener)
    return () => document.removeEventListener("visibilitychange", listener)
  }, [laden])

  if (!centralEventId && !eventId) return null
  if (turniere.length === 0 && !fehler) return null

  return (
    <section className="my-4 rounded-2xl border border-orange-400/20 bg-[#11151a] p-4" aria-label="Laufende DKO schnell öffnen">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-black text-white">Laufende DKO · Schnellwechsel</h3>
          <p className="text-xs text-white/50">Turnier direkt öffnen, ohne Anmeldung oder Ergebnisse zu verändern.</p>
        </div>
        <button type="button" onClick={() => void laden()} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-white hover:border-orange-400/70">Aktualisieren</button>
      </div>
      {fehler && <p role="alert" className="text-sm text-orange-300">{fehler}</p>}
      <div className="flex flex-wrap gap-2">
        {turniere.map((t) => (
          <button key={t.tournament_id} type="button"
            className="min-h-12 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-left text-sm font-bold text-white hover:border-orange-400 hover:bg-orange-400/10"
            onClick={() => router.push(buildTournamentContinueRoute({
              tournamentType: t.tournament_type,
              tournamentId: t.tournament_id,
              tournamentName: t.tournament_name || "Doppel-KO",
              accessType: (t.access_type || "public") as TournamentAccessType,
              eventId,
              seriesId,
            }))}>
            {t.tournament_name || "Doppel-KO"} <span className="text-orange-300">↗</span>
          </button>
        ))}
      </div>
    </section>
  )
}
