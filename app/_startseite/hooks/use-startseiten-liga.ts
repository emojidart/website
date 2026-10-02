"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { HomeLeagueMatch } from "@/app/_startseite/typen"

type UseStartseitenLigaOptions = {
  authUserId: string | null
  membershipLoading: boolean
  canSeeEDartLeague: boolean
  canSeeSteeldartLeague: boolean
  hasLeaguePackage: boolean
}

function getLeagueDartTypeForMyTeam(match: any, myTeamIds: string[]) {
  if (match?.home_team_id && myTeamIds.includes(match.home_team_id)) {
    return String(match?.home_team?.dart_type || match?.dart_type || "").toLowerCase()
  }

  if (match?.away_team_id && myTeamIds.includes(match.away_team_id)) {
    return String(match?.away_team?.dart_type || match?.dart_type || "").toLowerCase()
  }

  return String(match?.dart_type || "").toLowerCase()
}

export function useStartseitenLiga({
  authUserId,
  membershipLoading,
  canSeeEDartLeague,
  canSeeSteeldartLeague,
  hasLeaguePackage,
}: UseStartseitenLigaOptions) {
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [myLeagueMatches, setMyLeagueMatches] = useState<HomeLeagueMatch[]>([])
  const [myLeagueLoading, setMyLeagueLoading] = useState(false)
  const [myLeagueSaving, setMyLeagueSaving] = useState<string>("")

  useEffect(() => {
    if (membershipLoading) return

    const loadMyLeagueMatches = async () => {
      if (!authUserId || !hasLeaguePackage) {
        setMyPlayerId(null)
        setMyLeagueMatches([])
        return
      }

      try {
        setMyLeagueLoading(true)

        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("player_id")
          .eq("user_id", authUserId)
          .maybeSingle()

        if (profileError) throw profileError

        const playerId = (profileData as any)?.player_id as string | undefined
        if (!playerId) {
          setMyPlayerId(null)
          setMyLeagueMatches([])
          return
        }

        setMyPlayerId(playerId)

        const { data: teamRows, error: teamError } = await supabase
          .from("team_members")
          .select("team_id, teams(id,name,dart_type)")
          .eq("player_id", playerId)
          .is("left_at", null)

        if (teamError) throw teamError

        const eligibleTeams = ((teamRows as any[]) || []).filter((row: any) => {
          const dartType = String(row?.teams?.dart_type || "").toLowerCase()
          if (dartType === "edart") return canSeeEDartLeague
          if (dartType === "steeldart") return canSeeSteeldartLeague
          return false
        })

        const teamIds = eligibleTeams.map((row: any) => row.team_id).filter(Boolean)
        if (teamIds.length === 0) {
          setMyLeagueMatches([])
          return
        }

        const today = new Date().toISOString().split("T")[0]

        const [{ data: upcoming, error: matchError }, { data: opponentTeamsData }] = await Promise.all([
          supabase
            .from("matches")
            .select(`
              *,
              home_team:teams!matches_home_team_id_fkey(id,name,logo_url,dart_type),
              away_team:teams!matches_away_team_id_fkey(id,name,logo_url,dart_type)
            `)
            .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`)
            .gte("match_date", today)
            .neq("status", "completed")
            .order("match_date", { ascending: true })
            .order("match_time", { ascending: true })
            .limit(30),
          supabase.from("opponent_teams").select("*"),
        ])

        if (matchError) throw matchError

        const eligibleMatches = ((upcoming as any[]) || []).filter((match: any) => {
          const dartType = getLeagueDartTypeForMyTeam(match, teamIds)

          if (dartType === "edart") return canSeeEDartLeague
          if (dartType === "steeldart") return canSeeSteeldartLeague

          return false
        })

        const selected: any[] = []

        if (canSeeEDartLeague) {
          const next = eligibleMatches.find(
            (match: any) => getLeagueDartTypeForMyTeam(match, teamIds) === "edart",
          )
          if (next) selected.push(next)
        }

        if (canSeeSteeldartLeague) {
          const next = eligibleMatches.find(
            (match: any) => getLeagueDartTypeForMyTeam(match, teamIds) === "steeldart",
          )
          if (next) selected.push(next)
        }

        const enriched: HomeLeagueMatch[] = []

        for (const match of selected) {
          const myTeamId = teamIds.includes(match.home_team_id)
            ? match.home_team_id
            : match.away_team_id

          const { data: availability } = await supabase
            .from("match_availability")
            .select("status")
            .eq("match_id", match.id)
            .eq("player_id", playerId)
            .maybeSingle()

          const homeOpponentTeam = match.home_opponent_team_id
            ? (opponentTeamsData as any[])?.find((team: any) => team.id === match.home_opponent_team_id)
            : null
          const awayOpponentTeam = match.away_opponent_team_id
            ? (opponentTeamsData as any[])?.find((team: any) => team.id === match.away_opponent_team_id)
            : null

          enriched.push({
            ...match,
            dart_type: getLeagueDartTypeForMyTeam(match, teamIds),
            home_opponent_team: homeOpponentTeam,
            away_opponent_team: awayOpponentTeam,
            my_team_id: myTeamId,
            my_status: ((availability as any)?.status || "none") as "none" | "yes" | "maybe" | "no",
          })
        }

        enriched.sort((a, b) => {
          const aKey = `${a.match_date}T${a.match_time || "23:59"}`
          const bKey = `${b.match_date}T${b.match_time || "23:59"}`
          return aKey.localeCompare(bKey)
        })

        setMyLeagueMatches(enriched)
      } catch (error) {
        console.error("loadMyLeagueMatches error:", error)
        setMyLeagueMatches([])
      } finally {
        setMyLeagueLoading(false)
      }
    }

    void loadMyLeagueMatches()
  }, [
    authUserId,
    membershipLoading,
    canSeeEDartLeague,
    canSeeSteeldartLeague,
    hasLeaguePackage,
  ])

  const setHomeLeagueAvailability = async (
    match: HomeLeagueMatch,
    status: "yes" | "maybe" | "no",
  ) => {
    if (!myPlayerId) return

    try {
      setMyLeagueSaving(`${match.id}-${status}`)

      const { error } = await supabase.from("match_availability").upsert(
        {
          match_id: match.id,
          team_id: match.my_team_id,
          player_id: myPlayerId,
          status,
          note: null,
        },
        { onConflict: "match_id,player_id" },
      )

      if (error) throw error

      setMyLeagueMatches((prev) =>
        prev.map((item) =>
          item.id === match.id ? { ...item, my_status: status } : item,
        ),
      )
    } catch (error) {
      console.error("setHomeLeagueAvailability error:", error)
    } finally {
      setMyLeagueSaving("")
    }
  }

  return {
    myLeagueMatches,
    myLeagueLoading,
    myLeagueSaving,
    setHomeLeagueAvailability,
  }
}
