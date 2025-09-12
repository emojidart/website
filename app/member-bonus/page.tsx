"use client"
import { Header } from "@/components/header"
import { BonusSection } from "@/components/bonus-section"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

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

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user) {
      fetchUserData()
    }
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
      console.log("[v0] Fetching user profile for user:", session.user.id)

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select(`
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
        `)
        .eq("user_id", session.user.id)
        .single()

      if (profileError) {
        console.error("[v0] Profile fetch error:", profileError)
        throw profileError
      }

      if (profileData) {
        console.log("[v0] Profile data:", profileData)
        setProfile(profileData)

        if (!profileData.player_id) {
          console.error("[v0] No player_id found in profile")
          setLegStatsLoading(false)
          return
        }

        console.log("[v0] Fetching team memberships for player_id:", profileData.player_id)

        const { data: teamData, error: teamError } = await supabase
          .from("team_members")
          .select(`
            id,
            team_id,
            role,
            teams (
              id,
              name,
              logo_url
            )
          `)
          .eq("player_id", profileData.player_id)

        if (teamError) {
          console.error("[v0] Team memberships fetch error:", teamError)
          setTeamMemberships([])
          setLegStatsLoading(false)
          return
        }

        console.log("[v0] Team memberships:", teamData)
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
              club_players (
                id,
                name,
                photo_url,
                throwing_hand,
                age,
                origin
              )
            `)
            .in("team_id", teamIds)
            .order("role", { ascending: false }) // Captain first, then Co-Captain, then Player

          if (membersError) {
            console.error("[v0] Team members fetch error:", membersError)
            setLegStatsLoading(false)
            return
          }

          setTeamMembers(membersData || [])

          console.log("[v0] Loading statistics for all team members")
          await fetchAllTeamStatistics(teamIds, membersData || [])
        } else {
          console.log("[v0] No team memberships found")
          setLegStatistics([])
          setLegStatsLoading(false)
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching user data:", error)
      setLegStatsLoading(false)
    }
  }

  const fetchAllTeamStatistics = async (teamIds: string[], members: any[]) => {
    setLegStatsLoading(true)
    try {
      const teamPlayerIds = members.map((member) => member.player_id)

      console.log("[v0] All team IDs:", teamIds)
      console.log("[v0] All team player IDs for statistics:", teamPlayerIds)

      if (teamPlayerIds.length === 0) {
        console.log("[v0] No team players found")
        setLegStatistics([])
        return
      }

      const { data, error } = await supabase
        .from("leg_statistics")
        .select(`
          *,
          player:club_players!leg_statistics_player_id_fkey(
            name,
            photo_url
          ),
          leg_winner:club_players!leg_statistics_leg_winner_id_fkey(
            name,
            photo_url
          ),
          matches (
            id,
            match_date,
            match_time,
            venue,
            home_team_id,
            away_team_id,
            home_team:teams!matches_home_team_id_fkey(id, name),
            away_team:teams!matches_away_team_id_fkey(id, name),
            home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
            away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name)
          )
        `)
        .in("player_id", teamPlayerIds)
        .order("matches(match_date)", { ascending: false })
        .order("leg_number", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching all team leg statistics:", error)
        throw error
      }

      console.log("[v0] All team leg statistics loaded:", data?.length || 0, "records")
      if (data && data.length > 0) {
        console.log("[v0] Sample team bonus data:", {
          throws_under_26: data[0].throws_under_26,
          throws_under_30: data[0].throws_under_30,
          semperit_outs: data[0].semperit_outs,
        })
      }

      setLegStatistics(data || [])
    } catch (err: any) {
      console.error("Error fetching all team leg statistics:", err)
    } finally {
      setLegStatsLoading(false)
    }
  }

  const saveBonusConfig = () => {
    setBonusConfig(tempBonusConfig)
    localStorage.setItem("bonusConfig", JSON.stringify(tempBonusConfig))
    setIsBonusConfigOpen(false)
    // Note: toast functionality would need to be imported if available
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
          <h1 className="text-3xl font-bold text-gray-900">Bonusgeld</h1>
          <p className="text-gray-600 mt-2">Ihre Bonuspunkte und Belohnungen</p>
        </div>

        <BonusSection
          legStatistics={legStatistics}
          legStatsLoading={legStatsLoading}
          bonusConfig={bonusConfig}
          isBonusConfigOpen={isBonusConfigOpen}
          setIsBonusConfigOpen={setIsBonusConfigOpen}
          tempBonusConfig={tempBonusConfig}
          setTempBonusConfig={setTempBonusConfig}
          saveBonusConfig={saveBonusConfig}
        />
      </main>
    </div>
  )
}
