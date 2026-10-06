"use client"

import { useCallback, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

export type DkoTvEventType = "MATCH_STARTED" | "MATCH_FINISHED"

export type DkoTvEvent = {
  id: string
  tournament_id: string
  tournament_type: string
  event_type: DkoTvEventType
  match_id: number
  payload: {
    player1?: string
    player2?: string
    score1?: number
    score2?: number
    winner?: string | null
    loser?: string | null
    machine_number?: number | null
  }
  created_at: string
}

type Options = {
  tournamentId: string
  tournamentType: string
  onMatchStarted: (event: DkoTvEvent) => void
  onMatchFinished: (event: DkoTvEvent) => void
}

const POLL_MS = 900
const STARTUP_LOOKBACK_MS = 30_000
const MAX_SEEN_IDS = 120

export function useDkoTvEvents({
  tournamentId,
  tournamentType,
  onMatchStarted,
  onMatchFinished,
}: Options) {
  const seenRef = useRef<Set<string>>(new Set())
  const lastCreatedAtRef = useRef<string>(new Date(Date.now() - STARTUP_LOOKBACK_MS).toISOString())
  const callbacksRef = useRef({ onMatchStarted, onMatchFinished })

  useEffect(() => {
    callbacksRef.current = { onMatchStarted, onMatchFinished }
  }, [onMatchStarted, onMatchFinished])

  const storageKey = `emd-tv-seen:${tournamentType}:${tournamentId}`

  const rememberSeen = useCallback(
    (id: string) => {
      seenRef.current.add(id)

      if (seenRef.current.size > MAX_SEEN_IDS) {
        const trimmed = Array.from(seenRef.current).slice(-MAX_SEEN_IDS)
        seenRef.current = new Set(trimmed)
      }

      try {
        window.localStorage.setItem(storageKey, JSON.stringify(Array.from(seenRef.current)))
      } catch {
        // TV-Browser können Storage zeitweise blockieren. Dedupe funktioniert dann pro Session weiter.
      }
    },
    [storageKey],
  )

  const handleEvent = useCallback(
    (row: any) => {
      if (!row?.id || row.tournament_id !== tournamentId || row.tournament_type !== tournamentType) return
      if (seenRef.current.has(row.id)) return

      const event = row as DkoTvEvent

      if (event.created_at && event.created_at > lastCreatedAtRef.current) {
        lastCreatedAtRef.current = event.created_at
      }

      if (event.event_type === "MATCH_STARTED") {
        callbacksRef.current.onMatchStarted(event)
      } else if (event.event_type === "MATCH_FINISHED") {
        callbacksRef.current.onMatchFinished(event)
      }

      // Erst nach erfolgreicher Übergabe als gesehen markieren.
      rememberSeen(event.id)
    },
    [rememberSeen, tournamentId, tournamentType],
  )

  useEffect(() => {
    if (!tournamentId || !tournamentType) return

    let mounted = true
    let pollBusy = false

    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored) {
        const ids = JSON.parse(stored)
        if (Array.isArray(ids)) seenRef.current = new Set(ids.filter((id) => typeof id === "string"))
      }
    } catch {
      // Kein Problem: ohne Storage wird nur innerhalb der laufenden TV-Session dedupliziert.
    }

    const fetchEvents = async (startup = false) => {
      if (pollBusy) return
      pollBusy = true

      try {
        const since = startup
          ? new Date(Date.now() - STARTUP_LOOKBACK_MS).toISOString()
          : new Date(new Date(lastCreatedAtRef.current).getTime() - 2500).toISOString()

        const { data, error } = await supabase
          .from("emd_tv_events")
          .select("id,tournament_id,tournament_type,event_type,match_id,payload,created_at")
          .eq("tournament_id", tournamentId)
          .eq("tournament_type", tournamentType)
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(30)

        if (!mounted || error) return
        ;(data || []).forEach(handleEvent)
      } finally {
        pollBusy = false
      }
    }

    void fetchEvents(true)

    const channel = supabase
      .channel(`emd_tv_events_${tournamentType}_${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "emd_tv_events",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload: any) => handleEvent(payload?.new),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void fetchEvents(false)
      })

    const pollTimer = window.setInterval(() => {
      void fetchEvents(false)
    }, POLL_MS)

    const onVisibility = () => {
      if (document.visibilityState === "visible") void fetchEvents(false)
    }
    const onOnline = () => void fetchEvents(false)

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("online", onOnline)

    return () => {
      mounted = false
      window.clearInterval(pollTimer)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("online", onOnline)
      supabase.removeChannel(channel)
    }
  }, [handleEvent, storageKey, tournamentId, tournamentType])
}
