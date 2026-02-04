"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
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

interface Season {
  id: string
  name: string | null
  type: string | null
  year: number | null
  is_active: boolean | null
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
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("")

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
  }, [profile, teamMembers, dartTypeFilter, selectedSeasonId])

  const isLeadershipRole = () => {
    return teamMemberships.some(
      (membership) => membership.role === "Captain" || membership.role === "Co-Captain"
    )
  }

  const getLeadershipTeams = () => {
    return teamMemberships.filter(
      (membership) => membership.role === "Captain" || membership.role === "Co-Captain"
    )
  }

  const fetchUserProfile = async () => {
    if (!session?.user) return

    try {
      setLegStatsLoading(true)

      // ✅ Seasons laden (für Dropdown)
      const { data: seasonsData, error: seasonsError } = await supabase
        .from("seasons")
        .select("id, name, type, year, is_active")
        .order("start_date", { ascending: false })

      if (seasonsError) {
        console.error("Error fetching seasons:", seasonsError)
      } else {
        const list = (seasonsData || []) as Season[]
        setSeasons(list)
        if (!selectedSeasonId) {
          const active = list.find((s) => s.is_active) || list[0]
          if (active?.id) setSelectedSeasonId(active.id)
        }
      }

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select(`id, user_id, player_id, club_players (id, name, photo_url, throwing_hand, age, origin)`)
        .eq("user_id", session.user.id)
        .single()

      if (profileError) throw profileError

      setProfile(profileData)

      if (profileData?.player_id) {
        const { data: teamData, error: teamError } = await supabase
          .from("team_members")
          .select(`id, team_id, role, teams (id, name, logo_url)`)
          .eq("player_id", profileData.player_id)

        if (teamError) throw teamError

        setTeamMemberships(teamData || [])

        if (teamData && teamData.length > 0) {
          const teamIds = teamData.map((team) => team.team_id)

          const { data: membersData, error: membersError } = await supabase
  .from("team_members")
  .select(`
    id,
    team_id,
    player_id,
    role,
    club_players:club_players!team_members_player_id_fkey (
      id,
      name,
      photo_url,
      throwing_hand,
      age,
      origin
    )
  `)
  .in("team_id", teamIds)
  .order("role", { ascending: false })


          if (membersError) throw membersError

          setTeamMembers(membersData || [])
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err)
    } finally {
      setLegStatsLoading(false)
    }
  }

  const fetchLegStatistics = async () => {
    if (!profile?.player_id) return

    setLegStatsLoading(true)

    try {
      let query = supabase
        .from("leg_statistics")
        .select(`
          *,
          player:club_players!leg_statistics_player_id_fkey(name, photo_url),
          leg_winner:club_players!leg_statistics_leg_winner_id_fkey(name, photo_url),
          matches!inner (
            id,
            match_date,
            match_time,
            venue,
            home_team_id,
            away_team_id,
            season_id,
            home_team:teams!matches_home_team_id_fkey(id, name),
            away_team:teams!matches_away_team_id_fkey(id, name)
          )
        `)

      if (isLeadershipRole()) {
        const leadershipTeamIds = getLeadershipTeams().map((t) => t.team_id)
        const teamPlayerIds = teamMembers
          .filter((m) => leadershipTeamIds.includes(m.team_id))
          .map((m) => m.player_id)

        if (teamPlayerIds.length === 0) {
          setLegStatistics([])
          return
        }

        query = query.in("player_id", teamPlayerIds)
      } else {
        query = query.eq("player_id", profile.player_id)
      }

      if (dartTypeFilter !== "gesamt") {
        query = query.eq("dart_type", dartTypeFilter)
      }

      // ✅ Saison-Filter (über Join: leg_statistics -> matches.season_id)
      if (selectedSeasonId) {
        query = query.eq("matches.season_id", selectedSeasonId)
      }

      const { data, error } = await query

      if (error) throw error

      setLegStatistics(data || [])
    } catch (err) {
      console.error("Error fetching leg statistics:", err)
    } finally {
      setLegStatsLoading(false)
    }
  }

  const getTeamDisplayName = (match: any, isHome: boolean) => {
    if (!match) return "Unbekannt"

    if (isHome) {
      return match.home_team?.name || "Unbekannt"
    } else {
      return match.away_team?.name || "Unbekannt"
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col pb-20">
        <Header />

        <main className="flex-grow flex items-center justify-center px-4">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>

        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col pb-20">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-4 max-w-7xl">
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/member-profile-app")}
            className="flex items-center gap-2 mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Profil
          </Button>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {isLeadershipRole() ? "Team Statistiken" : "Spieler Statistiken"}
          </h1>

          <p className="text-sm md:text-base text-gray-600 mt-1">
            {isLeadershipRole()
              ? "Detaillierte Analyse der Team-Leistung"
              : "Detaillierte Analyse deiner Leistung"}
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            {seasons.length === 0 ? (
              <option value="">Saison…</option>
            ) : (
              seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {(s.name || s.type || "Saison") + (s.year ? ` ${s.year}` : "")}
              </option>
              ))
            )}
          </select>
          <Button
            variant={dartTypeFilter === "gesamt" ? "default" : "outline"}
            size="sm"
            onClick={() => setDartTypeFilter("gesamt")}
          >
            Gesamt
          </Button>
          <Button
            variant={dartTypeFilter === "edart" ? "default" : "outline"}
            size="sm"
            onClick={() => setDartTypeFilter("edart")}
          >
            E-Dart
          </Button>
          <Button
            variant={dartTypeFilter === "steeldart" ? "default" : "outline"}
            size="sm"
            onClick={() => setDartTypeFilter("steeldart")}
          >
            Steeldart
          </Button>
        </div>

        <StatisticsSection
          legStatistics={legStatistics}
          legStatsLoading={legStatsLoading}
          matches={matches}
          getTeamDisplayName={getTeamDisplayName}
        />
      </main>

      <MobileBottomNav />
    </div>
  )
}
