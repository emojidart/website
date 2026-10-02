"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Match } from "@/app/_startseite/typen"

export function useStartseitenNaechsteSpiele() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMatches = async () => {
      try {
        const { data: opponentTeamsData } = await supabase
          .from("opponent_teams")
          .select("*")

        const now = new Date()
        const today = now.toISOString().split("T")[0]

        const { data: matchesData } = await supabase
          .from("matches")
          .select(
            `
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
            away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
          `,
          )
          .eq("status", "scheduled")
          .gte("match_date", today)
          .order("match_date", { ascending: true })
          .order("match_time", { ascending: true })
          .limit(4)

        if (matchesData) {
          const enrichedMatches =
            matchesData?.map((match: any) => {
              const homeOpponentTeam = match.home_opponent_team_id
                ? opponentTeamsData?.find(
                    (team: any) => team.id === match.home_opponent_team_id,
                  )
                : null
              const awayOpponentTeam = match.away_opponent_team_id
                ? opponentTeamsData?.find(
                    (team: any) => team.id === match.away_opponent_team_id,
                  )
                : null

              return {
                ...match,
                home_opponent_team: homeOpponentTeam,
                away_opponent_team: awayOpponentTeam,
              }
            }) || []

          setMatches(enrichedMatches)
        }
      } catch (error) {
        console.error("Error loading matches:", error)
      } finally {
        setLoading(false)
      }
    }

    loadMatches()
  }, [])

  return {
    matches,
    loading,
  }
}
