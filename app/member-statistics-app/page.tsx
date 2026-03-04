"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { StatisticsSection } from "@/components/statistics-section"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
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
    if (!authLoading && !session) router.push("/member-login")
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user) void fetchUserProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    if (profile?.player_id && teamMembers.length > 0) void fetchLegStatistics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, teamMembers, dartTypeFilter, selectedSeasonId])

  useEffect(() => {
    if (teamMemberships.length > 0) void fetchMatches()
    else setMatches([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMemberships, selectedSeasonId])

  const isLeadershipRole = () => teamMemberships.some((m) => m.role === "Captain" || m.role === "Co-Captain")
  const getLeadershipTeams = () => teamMemberships.filter((m) => m.role === "Captain" || m.role === "Co-Captain")

  const fetchUserProfile = async () => {
    if (!session?.user) return

    try {
      setLegStatsLoading(true)

      const { data: seasonsData, error: seasonsError } = await supabase
        .from("seasons")
        .select("id, name, type, year, is_active, start_date")
        .order("start_date", { ascending: false })

      if (!seasonsError) {
        const list = (seasonsData || []) as Season[]
        setSeasons(list)

        if (!selectedSeasonId) {
          const active = list.find((s) => s.is_active) || list[0]
          if (active?.id) setSelectedSeasonId(active.id)
        }
      } else {
        console.error("Error fetching seasons:", seasonsError)
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
          .is("left_at", null)

        if (teamError) throw teamError
        setTeamMemberships(teamData || [])

        if (teamData && teamData.length > 0) {
          const teamIds = teamData.map((t) => t.team_id)

          const { data: membersData, error: membersError } = await supabase
            .from("team_members")
            .select(
              `
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
            `
            )
            .in("team_id", teamIds)
            .is("left_at", null)
            .order("role", { ascending: false })

          if (membersError) throw membersError
          setTeamMembers(membersData || [])
        } else {
          setTeamMembers([])
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err)
      setProfile(null)
      setTeamMemberships([])
      setTeamMembers([])
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
        .select(
          `
          *,
          dart_type,
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
            home_team_type,
            away_team_type,
            home_opponent_team_id,
            away_opponent_team_id,
            home_team:teams!matches_home_team_id_fkey(id, name),
            away_team:teams!matches_away_team_id_fkey(id, name),
            home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
            away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name)
          )
        `
        )

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

      if (dartTypeFilter !== "gesamt") query = query.eq("dart_type", dartTypeFilter)
      if (selectedSeasonId) query = query.eq("matches.season_id", selectedSeasonId)

      const { data, error } = await query
      if (error) throw error

      setLegStatistics(data || [])
    } catch (err) {
      console.error("Error fetching leg statistics:", err)
      setLegStatistics([])
    } finally {
      setLegStatsLoading(false)
    }
  }

  const fetchMatches = async () => {
    if (teamMemberships.length === 0) {
      setMatches([])
      return
    }

    try {
      const teamIds = teamMemberships.map((tm) => tm.team_id)

      let q = supabase
        .from("matches")
        .select(
          `
          id,
          match_date,
          match_time,
          venue,
          home_team_id,
          away_team_id,
          season_id,
          dart_type,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `
        )
        .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`)
        .order("match_date", { ascending: false })

      if (selectedSeasonId) q = q.eq("season_id", selectedSeasonId)

      const { data, error } = await q
      if (error) throw error

      setMatches(data || [])
    } catch (err) {
      console.error("Error fetching matches:", err)
      setMatches([])
    }
  }

  const getTeamDisplayName = (match: any, isHome: boolean) => {
    if (!match) return "Unbekannt"
    if (isHome) {
      if (match.home_team_type === "opponent") return match.home_opponent_team?.name || "Unbekannt"
      return match.home_team?.name || "Unbekannt"
    } else {
      if (match.away_team_type === "opponent") return match.away_opponent_team?.name || "Unbekannt"
      return match.away_team?.name || "Unbekannt"
    }
  }

  const headerSubtitle = "Team Statistiken"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-gray-900 font-sans flex flex-col pb-20">
      {/* ✅ NUR HEADER geändert: jetzt dein richtiger Header-Component */}
      <Header variant="app" title="Statistiken" subtitle={headerSubtitle} backHref="/member-profile-app" />

      {/* LOADING */}
      {authLoading ? (
        <div className="flex-1 flex items-center justify-center px-4 pt-24">
          <div className="animate-in fade-in zoom-in-95 duration-300 w-full max-w-sm">
            <div className="flex flex-col items-center gap-6 rounded-3xl bg-white shadow-2xl px-10 py-10 border border-orange-100">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl animate-pulse" />
                <Loader2 className="relative h-12 w-12 animate-spin text-orange-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-extrabold text-gray-900">Statistiken werden geladen</p>
                <p className="text-sm text-gray-500 mt-1">Bitte kurz warten…</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // MAIN (unchanged)
       <main className="pt-12 sm:pt-14">
  <div className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
          {/* TOP WHITE HERO CARD */}
          <div className="rounded-3xl bg-white shadow-xl border border-orange-100 overflow-hidden">
            {/* orange strip */}
            <div className="h-1.5 bg-gradient-to-r from-orange-600 to-orange-500" />

            <div className="p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Team Statistiken</h1>
                  <p className="text-sm md:text-base text-gray-600 mt-1">Detaillierte Analyse der Team-Leistung</p>
                </div>

                {/* Filters container */}
                <div className="flex flex-col gap-2 sm:items-end">
                  <select
                    value={selectedSeasonId}
                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                    className="h-10 w-full sm:w-[260px] rounded-xl border border-orange-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
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

                  <div className="grid grid-cols-3 gap-2 w-full sm:w-[260px]">
                    <Button
                      variant={dartTypeFilter === "gesamt" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDartTypeFilter("gesamt")}
                      className={
                        dartTypeFilter === "gesamt"
                          ? "rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                          : "rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50"
                      }
                    >
                      Gesamt
                    </Button>
                    <Button
                      variant={dartTypeFilter === "edart" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDartTypeFilter("edart")}
                      className={
                        dartTypeFilter === "edart"
                          ? "rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                          : "rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50"
                      }
                    >
                      E-Dart
                    </Button>
                    <Button
                      variant={dartTypeFilter === "steeldart" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDartTypeFilter("steeldart")}
                      className={
                        dartTypeFilter === "steeldart"
                          ? "rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                          : "rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50"
                      }
                    >
                      Steeldart
                    </Button>
                  </div>
                </div>
              </div>

              {/* content section spacing */}
              <div className="mt-5">
                <StatisticsSection
                  legStatistics={legStatistics}
                  legStatsLoading={legStatsLoading}
                  matches={matches}
                  getTeamDisplayName={getTeamDisplayName}
                />
              </div>
			    </div>
            </div>
          </div>
        </main>
      )}

      <MobileBottomNav />
    </div>
  )
}