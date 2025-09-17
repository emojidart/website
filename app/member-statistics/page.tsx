"use client"
import { Header } from "@/components/header"
import { StatisticsSection } from "@/components/statistics-section"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface UserProfile {
  id: string
  user_id: string
  player_id: string
  club_players: {
    id: string
    name: string
    photo_url: string | null
    throwing_hand: string | null
    age: number | null
    origin: string | null
  } | null
}

interface TeamMembership {
  id: string
  team_id: string
  role: string | null
  teams: {
    id: string
    name: string
    logo_url: string | null
  } | null
}

interface TeamMember {
  id: string
  team_id: string
  player_id: string
  role: string | null
  club_players: {
    id: string
    name: string
    photo_url: string | null
    throwing_hand: string | null
    age: number | null
    origin: string | null
  } | null
}

export default function MemberStatisticsPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()
  const [legStatistics, setLegStatistics] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [legStatsLoading, setLegStatsLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [dartTypeFilter, setDartTypeFilter] = useState<"gesamt" | "edart" | "steeldart">("gesamt")

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user) {
      fetchUserProfile()
    }
  }, [session])

  useEffect(() => {
    if (profile?.player_id && teamMembers.length > 0) {
      fetchLegStatistics()
    }
  }, [profile, teamMembers, dartTypeFilter])

  const isLeadershipRole = () => {
    return teamMemberships.some((membership) => membership.role === "Captain" || membership.role === "Co-Captain")
  }

  const getLeadershipTeams = () => {
    return teamMemberships.filter((membership) => membership.role === "Captain" || membership.role === "Co-Captain")
  }

  const fetchUserProfile = async () => {
    if (!session?.user) return

    try {
      setLegStatsLoading(true)

      console.log("[v0] Fetching user profile for:", session.user.id)

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select(`id, user_id, player_id, club_players (id, name, photo_url, throwing_hand, age, origin)`)
        .eq("user_id", session.user.id)
        .single()

      console.log("[v0] Profile data:", profileData, "Error:", profileError)

      if (profileError) {
        throw profileError
      }

      setProfile(profileData)

      if (profileData?.player_id) {
        const { data: teamData, error: teamError } = await supabase
          .from("team_members")
          .select(`id, team_id, role, teams (id, name, logo_url)`)
          .eq("player_id", profileData.player_id)

        console.log("[v0] Team data:", teamData, "Error:", teamError)

        if (teamError) {
          throw teamError
        }

        setTeamMemberships(teamData || [])

        if (teamData && teamData.length > 0) {
          const teamIds = teamData.map((team) => team.team_id)

          const { data: membersData, error: membersError } = await supabase
            .from("team_members")
            .select(`id, team_id, player_id, role, club_players (id, name, photo_url, throwing_hand, age, origin)`)
            .in("team_id", teamIds)
            .order("role", { ascending: false })

          console.log("[v0] Team members data:", membersData, "Error:", membersError)

          if (membersError) {
            throw membersError
          }

          setTeamMembers(membersData || [])
        }
      }
    } catch (err: any) {
      console.error("[v0] Error fetching profile:", err)
    } finally {
      setLegStatsLoading(false)
    }
  }

  const fetchLegStatistics = async () => {
    if (!isLeadershipRole()) {
      if (!profile?.player_id) return

      setLegStatsLoading(true)
      try {
        console.log("[v0] Fetching leg statistics for player:", profile.player_id)

        let query = supabase
          .from("leg_statistics")
          .select(`
            *,
            player:club_players!leg_statistics_player_id_fkey(name, photo_url),
            leg_winner:club_players!leg_statistics_leg_winner_id_fkey(name, photo_url),
            matches (
              id,
              match_date,
              match_time,
              venue,
              home_team_id,
              away_team_id,
              home_team_type,
              away_team_type,
              dart_type,
              home_team:teams!matches_home_team_id_fkey(id, name),
              away_team:teams!matches_away_team_id_fkey(id, name),
              home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
              away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name)
            )
          `)
          .eq("player_id", profile.player_id)

        if (dartTypeFilter !== "gesamt") {
          query = query.eq("dart_type", dartTypeFilter)
        }

        const { data, error } = await query
          .order("matches(match_date)", { ascending: false })
          .order("leg_number", { ascending: false })

        console.log("[v0] Leg statistics data:", data, "Error:", error)

        if (error) {
          throw error
        }

        const legStats = data || []
        const processedStats = legStats.map((stat: any) => ({
          ...stat,
          leg_wins: stat.leg_wins || 0,
        }))

        setLegStatistics(processedStats)
      } catch (err: any) {
        console.error("[v0] Error fetching leg statistics:", err)
      } finally {
        setLegStatsLoading(false)
      }
      return
    }

    setLegStatsLoading(true)
    try {
      const leadershipTeams = getLeadershipTeams()
      const leadershipTeamIds = leadershipTeams.map((team) => team.team_id)
      const teamPlayerIds = teamMembers
        .filter((member) => leadershipTeamIds.includes(member.team_id))
        .map((member) => member.player_id)

      console.log("[v0] Fetching team statistics for players:", teamPlayerIds)

      if (teamPlayerIds.length === 0) {
        setLegStatistics([])
        return
      }

      let query = supabase
        .from("leg_statistics")
        .select(`
          *,
          player:club_players!leg_statistics_player_id_fkey(name, photo_url),
          leg_winner:club_players!leg_statistics_leg_winner_id_fkey(name, photo_url),
          matches (
            id,
            match_date,
            match_time,
            venue,
            home_team_id,
            away_team_id,
            home_team_type,
            away_team_type,
            dart_type,
            home_team:teams!matches_home_team_id_fkey(id, name),
            away_team:teams!matches_away_team_id_fkey(id, name),
            home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
            away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name)
          )
        `)
        .in("player_id", teamPlayerIds)

      if (dartTypeFilter !== "gesamt") {
        query = query.eq("dart_type", dartTypeFilter)
      }

      const { data, error } = await query
        .order("matches(match_date)", { ascending: false })
        .order("leg_number", { ascending: false })

      console.log("[v0] Team leg statistics data:", data, "Error:", error)

      if (error) {
        throw error
      }

      const legStats = data || []
      const processedStats = legStats.map((stat: any) => ({
        ...stat,
        leg_wins: stat.leg_wins || 0,
      }))

      setLegStatistics(processedStats)

      let matchQuery = supabase.from("matches").select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name),
          home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
          away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name),
          season:seasons(id, name, type)
        `)

      if (dartTypeFilter !== "gesamt") {
        matchQuery = matchQuery.eq("dart_type", dartTypeFilter)
      }

      const { data: matchData, error: matchError } = await matchQuery

      console.log("[v0] Match data:", matchData, "Error:", matchError)

      if (matchError) {
        console.error("[v0] Match error:", matchError)
      } else {
        setMatches(matchData || [])
      }
    } catch (err: any) {
      console.error("[v0] Error fetching leg statistics:", err)
    } finally {
      setLegStatsLoading(false)
    }
  }

  const getTeamDisplayName = (match: any, isHome: boolean) => {
    console.log("[v0] getTeamDisplayName called with:", { match, isHome })

    if (!match) return "Unbekannt"

    if (isHome) {
      if (match.home_team && match.home_team.name) {
        return match.home_team.name
      } else if (match.home_opponent_team && match.home_opponent_team.name) {
        return match.home_opponent_team.name
      }
    } else {
      if (match.away_team && match.away_team.name) {
        return match.away_team.name
      } else if (match.away_opponent_team && match.away_opponent_team.name) {
        return match.away_opponent_team.name
      }
    }

    return "Unbekannt"
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.back()} className="flex items-center gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isLeadershipRole() ? "Team Statistiken" : "Spieler Statistiken"}
          </h1>
          <p className="text-gray-600 mt-2">
            {isLeadershipRole() ? "Detaillierte Analyse der Team-Leistung" : "Detaillierte Analyse Ihrer Leistung"}
          </p>
        </div>

        <div className="mb-6">
          <div className="flex gap-2">
            <Button
              variant={dartTypeFilter === "gesamt" ? "default" : "outline"}
              onClick={() => setDartTypeFilter("gesamt")}
              className="flex items-center gap-2"
            >
              Gesamt
            </Button>
            <Button
              variant={dartTypeFilter === "edart" ? "default" : "outline"}
              onClick={() => setDartTypeFilter("edart")}
              className="flex items-center gap-2"
            >
              E-Dart
            </Button>
            <Button
              variant={dartTypeFilter === "steeldart" ? "default" : "outline"}
              onClick={() => setDartTypeFilter("steeldart")}
              className="flex items-center gap-2"
            >
              Steeldart
            </Button>
          </div>
        </div>

        <StatisticsSection
          legStatistics={legStatistics}
          legStatsLoading={legStatsLoading}
          matches={matches}
          getTeamDisplayName={getTeamDisplayName}
        />
      </main>
    </div>
  )
}
