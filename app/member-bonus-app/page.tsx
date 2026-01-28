"use client"

import { BonusSection } from "@/components/bonus-section"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface BonusConfig {
  under26: number
  under30: number
  semperit: number
}

export default function MemberBonusPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  const [legStatistics, setLegStatistics] = useState<any[]>([])
  const [legStatsLoading, setLegStatsLoading] = useState(true)

  const [bonusConfig, setBonusConfig] = useState<BonusConfig>({
    under26: 0.5,
    under30: 0.5,
    semperit: 0.5,
  })
  const [isBonusConfigOpen, setIsBonusConfigOpen] = useState(false)
  const [tempBonusConfig, setTempBonusConfig] = useState<BonusConfig>({
    under26: 0.5,
    under30: 0.5,
    semperit: 0.5,
  })

  const [profile, setProfile] = useState<any>(null)
  const [teamMemberships, setTeamMemberships] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all")

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user) {
      fetchUserData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    const savedConfig = localStorage.getItem("bonusConfig")
    if (savedConfig) {
      const config = JSON.parse(savedConfig)
      setBonusConfig(config)
      setTempBonusConfig(config)
    }
  }, [])

  const fetchUserData = async () => {
    if (!session?.user) return

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select(
          `
          id,
          user_id,
          player_id,
          club_players (
            id,
            name,
            photo_url,
            throwing_hand,
            age,
            origin
          )
        `
        )
        .eq("user_id", session.user.id)
        .single()

      if (profileError) throw profileError

      if (profileData) {
        setProfile(profileData)

        if (!profileData.player_id) {
          setLegStatsLoading(false)
          return
        }

        const { data: teamData, error: teamError } = await supabase
          .from("team_members")
          .select(
            `
            id,
            team_id,
            role,
            teams (
              id,
              name,
              logo_url
            )
          `
          )
          .eq("player_id", profileData.player_id)

        if (teamError) {
          setTeamMemberships([])
          setLegStatsLoading(false)
          return
        }

        setTeamMemberships(teamData || [])

        if (teamData && teamData.length > 0) {
          const teamIds = teamData.map((team) => team.team_id)

          const { data: membersData, error: membersError } = await supabase
            .from("team_members")
            .select(
              `
              id,
              team_id,
              player_id,
              role,
              club_players (
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
            .order("role", { ascending: false })

          if (membersError) {
            setLegStatsLoading(false)
            return
          }

          setTeamMembers(membersData || [])
          await fetchAllTeamStatistics(teamIds, membersData || [])
        } else {
          setLegStatistics([])
          setLegStatsLoading(false)
        }
      }
    } catch (error) {
      console.error("[bonus] Error fetching user data:", error)
      setLegStatsLoading(false)
    }
  }

  const fetchAllTeamStatistics = async (teamIds: string[], members: any[]) => {
    setLegStatsLoading(true)
    try {
      if (teamIds.length === 0) {
        setLegStatistics([])
        return
      }

      const { data, error } = await supabase
        .from("leg_statistics")
        .select(
          `
          *,
          player:club_players!leg_statistics_player_id_fkey(
            name,
            photo_url
          ),
          leg_winner:club_players!leg_statistics_leg_winner_id_fkey(
            name,
            photo_url
          ),
          matches!inner (
            id,
            match_date,
            match_time,
            venue,
            dart_type,
            home_team_id,
            away_team_id,
            home_team:teams!matches_home_team_id_fkey(id, name),
            away_team:teams!matches_away_team_id_fkey(id, name),
            home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
            away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name)
          )
        `
        )
        .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`, {
          foreignTable: "matches",
        })
        .order("matches(match_date)", { ascending: false })
        .order("leg_number", { ascending: false })

      if (error) throw error

      const filteredData = (data || []).filter((stat) => {
        const match = stat.matches
        if (!match) return false

        const playerHomeTeamMembership = members.find(
          (member) => member.player_id === stat.player_id && member.team_id === match.home_team_id
        )
        const playerAwayTeamMembership = members.find(
          (member) => member.player_id === stat.player_id && member.team_id === match.away_team_id
        )

        let playerTeamInMatch: string | null = null
        if (playerHomeTeamMembership && teamIds.includes(match.home_team_id)) {
          playerTeamInMatch = match.home_team_id
        } else if (playerAwayTeamMembership && teamIds.includes(match.away_team_id)) {
          playerTeamInMatch = match.away_team_id
        }

        return playerTeamInMatch !== null
      })

      setLegStatistics(filteredData)
    } catch (err) {
      console.error("[bonus] Error fetching team leg statistics:", err)
    } finally {
      setLegStatsLoading(false)
    }
  }

  const saveBonusConfig = () => {
    setBonusConfig(tempBonusConfig)
    localStorage.setItem("bonusConfig", JSON.stringify(tempBonusConfig))
    setIsBonusConfigOpen(false)
  }

  const getFilteredStatisticsByTeam = () => {
    if (selectedTeamId === "all") return legStatistics

    return legStatistics.filter((stat) => {
      const match = stat.matches
      if (!match) return false

      const playerHomeTeamMembership = teamMembers.find(
        (member) => member.player_id === stat.player_id && member.team_id === match.home_team_id
      )
      const playerAwayTeamMembership = teamMembers.find(
        (member) => member.player_id === stat.player_id && member.team_id === match.away_team_id
      )

      let playerTeamInMatch: string | null = null
      if (playerHomeTeamMembership) playerTeamInMatch = match.home_team_id
      else if (playerAwayTeamMembership) playerTeamInMatch = match.away_team_id

      return playerTeamInMatch === selectedTeamId
    })
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col pb-20">
        <Header />

        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>

        <MobileBottomNav />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col pb-20">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-4 max-w-7xl">
        {/* Back Button LINKS wie Lobby */}
        <Button
          variant="outline"
          onClick={() => router.push("/member-profile-app")}
          className="mb-4 flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Profil
        </Button>

        <div className="mb-4 flex flex-col gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bonusgeld</h1>
            <p className="text-sm text-gray-600 mt-1">Ihre Bonuspunkte und Belohnungen</p>
          </div>

          {teamMemberships.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="team-filter" className="text-sm font-medium whitespace-nowrap">
                Team filtern:
              </label>

              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger id="team-filter" className="w-full">
                  <SelectValue placeholder="Team auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Teams</SelectItem>
                  {teamMemberships.map((membership) => (
                    <SelectItem key={membership.team_id} value={membership.team_id}>
                      {membership.teams?.name || "Unbekanntes Team"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <BonusSection
          legStatistics={getFilteredStatisticsByTeam()}
          legStatsLoading={legStatsLoading}
          bonusConfig={bonusConfig}
          isBonusConfigOpen={isBonusConfigOpen}
          setIsBonusConfigOpen={setIsBonusConfigOpen}
          tempBonusConfig={tempBonusConfig}
          setTempBonusConfig={setTempBonusConfig}
          saveBonusConfig={saveBonusConfig}
        />
      </main>

      <MobileBottomNav />
    </div>
  )
}
