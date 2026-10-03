"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Monitor, Radio, Trophy } from "lucide-react"
import { supabase } from "@/lib/supabase"

const KRATZER_SNAPSHOT_KEY = "emd:kratzer:beamer:snapshot"
const KRATZER_CHANNEL = "emd-kratzer-beamer-v1"
const CHECK_INTERVAL_MS = 10000

type ActiveTournament = {
  tournament_id: string
  tournament_type: string
  tournament_name: string | null
}

const DKO_BEAMER_ROUTES: Record<string, string> = {
  "8er_dko": "/8erdko/beamer",
  "16er_dko": "/16erdko/beamer",
  "32er_dko": "/32erdko/beamer",
  "64er_dko": "/64erdko/beamer",
  "128er_dko": "/128erdko/beamer",
}

function readLocalKratzerRunning() {
  if (typeof window === "undefined") return false
  try {
    const raw = window.localStorage.getItem(KRATZER_SNAPSHOT_KEY)
    if (!raw) return false
    const snapshot = JSON.parse(raw)
    return Boolean(snapshot?.isTournamentRunning && !snapshot?.tournamentFinished)
  } catch {
    return false
  }
}

export default function AutoBeamerPage() {
  const [activeTournament, setActiveTournament] = useState<ActiveTournament | null>(null)
  const [kratzerRunning, setKratzerRunning] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const localKratzer = readLocalKratzerRunning()

    const [statusRes, kratzerRes] = await Promise.all([
      supabase
        .from("tournaments_status")
        .select("tournament_id, tournament_type, tournament_name")
        .eq("status", "active")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("kratzer_tournaments")
        .select("id")
        .eq("status", "running")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (statusRes.error) {
      console.error("Auto beamer tournament check failed:", statusRes.error)
    } else {
      setActiveTournament((statusRes.data as ActiveTournament | null) || null)
    }

    if (kratzerRes.error) {
      console.error("Auto beamer Kratzer check failed:", kratzerRes.error)
      setKratzerRunning(localKratzer)
    } else {
      setKratzerRunning(Boolean(kratzerRes.data?.id) || localKratzer)
    }

    setLoaded(true)
  }, [])

  useEffect(() => {
    void refresh()

    const statusChannel = supabase
      .channel("auto_beamer_tournament_status")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournaments_status",
        },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kratzer_tournaments",
        },
        () => void refresh(),
      )
      .subscribe()

    let kratzerChannel: BroadcastChannel | null = null
    try {
      kratzerChannel = new BroadcastChannel(KRATZER_CHANNEL)
      kratzerChannel.onmessage = () => void refresh()
    } catch {
      kratzerChannel = null
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === KRATZER_SNAPSHOT_KEY) void refresh()
    }

    const interval = window.setInterval(() => void refresh(), CHECK_INTERVAL_MS)
    window.addEventListener("storage", onStorage)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("storage", onStorage)
      kratzerChannel?.close()
      void supabase.removeChannel(statusChannel)
    }
  }, [refresh])

  const beamerUrl = useMemo(() => {
    // Zentrale DKO-Turniere haben Vorrang. Kratzer wird zusätzlich direkt
    // aus Supabase erkannt, damit auch ein Fire TV Stick auf einem anderen
    // Gerät automatisch in die Beameransicht wechseln kann.
    if (activeTournament) {
      const route = DKO_BEAMER_ROUTES[activeTournament.tournament_type]
      if (!route) return null

      const params = new URLSearchParams({
        tournamentId: activeTournament.tournament_id,
        tournamentType: activeTournament.tournament_type,
        tournamentName: activeTournament.tournament_name || "EMD Turnier",
      })
      return `${route}?${params.toString()}`
    }

    if (kratzerRunning) return "/kratzer-tournament/beamer"
    return null
  }, [activeTournament, kratzerRunning])

  if (beamerUrl) {
    return (
      <main className="fixed inset-0 overflow-hidden bg-[#050608]">
        <iframe
          key={beamerUrl}
          src={beamerUrl}
          title="EMD Auto Beamer"
          className="h-full w-full border-0 bg-[#050608]"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </main>
    )
  }

  const unsupported = Boolean(activeTournament && !DKO_BEAMER_ROUTES[activeTournament.tournament_type])

  return (
    <main className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-[#050608] px-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(249,115,22,.16),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(14,165,233,.10),transparent_42%)]" />

      <div className="relative w-full max-w-3xl rounded-[38px] border border-white/10 bg-black/35 px-7 py-10 text-center shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-2xl sm:px-12 sm:py-14">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] border border-orange-300/20 bg-orange-500/10 text-orange-200">
          {unsupported ? <Trophy className="h-9 w-9" /> : <Monitor className="h-9 w-9" />}
        </div>

        <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/[0.06] px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-200/80">
          <Radio className="h-4 w-4" /> Auto Mode aktiv
        </div>

        <h1 className="mt-5 text-[clamp(2.1rem,5vw,4.8rem)] font-black leading-[.92] tracking-[-0.055em]">
          {unsupported ? activeTournament?.tournament_name || "Turnier aktiv" : "EMD TV"}
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base font-semibold leading-relaxed text-white/45 sm:text-lg">
          {!loaded
            ? "Turnierstatus wird geladen …"
            : unsupported
              ? `Der Turniermodus „${activeTournament?.tournament_type}“ ist aktiv. Für diesen Modus ist noch keine eindeutige Beamer-Route hinterlegt.`
              : "Kein Turnier aktiv. Sobald ein unterstütztes Turnier startet, wechselt dieser Bildschirm automatisch in die Live-Ansicht."}
        </p>
      </div>
    </main>
  )
}
