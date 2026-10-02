"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

type UseEinzelturnierRealtimeOptions = {
  enabled: boolean
  onRefresh: () => void | Promise<void>
  debounceMs?: number
}

export function useEinzelturnierRealtime({
  enabled,
  onRefresh,
  debounceMs = 200,
}: UseEinzelturnierRealtimeOptions) {
  const refreshRef = useRef(onRefresh)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    if (!enabled) return

    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current)

      timerRef.current = setTimeout(() => {
        void refreshRef.current()
      }, debounceMs)
    }

    const channel = supabase
      .channel("dko_tournament_registration_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dko_tournament_registration",
        },
        scheduleRefresh,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)

      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [enabled, debounceMs])
}
