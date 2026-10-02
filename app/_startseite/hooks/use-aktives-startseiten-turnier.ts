"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { ActiveTournament } from "@/app/_startseite/typen"

export function useAktivesStartseitenTurnier() {
  const [activeTournament, setActiveTournament] = useState<ActiveTournament | null>(null)

  useEffect(() => {
    const loadActiveTournament = async () => {
      try {
        const { data, error } = await supabase
          .from("tournaments_status")
          .select("tournament_id, tournament_name, tournament_type, status")
          .eq("status", "active")
          .limit(1)
          .maybeSingle()

        if (error) {
          console.error("Error loading active tournament:", error)
          setActiveTournament(null)
          return
        }

        if (!data) {
          setActiveTournament(null)
          return
        }

        setActiveTournament({
          tournament_id: data.tournament_id,
          tournament_name: data.tournament_name,
          tournament_type: data.tournament_type,
          status: data.status,
        })
      } catch (error) {
        console.error("Error loading active tournament:", error)
        setActiveTournament(null)
      }
    }

    loadActiveTournament()

    const channel = supabase
      .channel("tournament_status_home")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournaments_status",
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const data = payload.new as any
            if (data.status === "active") {
              setActiveTournament({
                tournament_id: data.tournament_id,
                tournament_name: data.tournament_name,
                tournament_type: data.tournament_type,
                status: data.status,
              })
            } else if (data.status === "cancelled" || data.status === "completed") {
              setActiveTournament(null)
            }
          } else if (payload.eventType === "DELETE") {
            setActiveTournament(null)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { activeTournament }
}
