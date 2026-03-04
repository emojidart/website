"use client"

import { BonusSection } from "@/components/bonus-section"
import { Header } from "@/components/header"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

interface BonusConfig {
  under26: number
  under30: number
  semperit: number
}

type ClubPlayer = {
  id: string
  name: string
  photo_url: string | null
  throwing_hand: string | null
  age: number | null
  origin: string | null
}

type Season = {
  id: string
  name: string | null
  type: string | null
  year: number | null
  is_active: boolean | null
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

  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("all")

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

  useEffect(() => {
    if (teamMemberships.length > 0 && teamMembers.length > 0) {
      const teamIds = teamMemberships.map((t: any) => t.team_id)
      fetchAllTeamStatistics(teamIds, teamMembers)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId])

  const fetchUserData = async () => {
    if (!session?.user) return

    setLegStatsLoading(true)

    try {
      // ✅ Seasons
      const { data: seasonsData, error: seasonsError } = await supabase
        .from("seasons")
        .select("id, name, type, year, is_active")
        .order("start_date", { ascending: false })

      if (!seasonsError) {
        const list = (seasonsData || []) as Season[]
        setSeasons(list)

        if (selectedSeasonId === "all") {
          const active = list.find((s) => s.is_active) || list[0]
          if (active?.id) setSelectedSeasonId(active.id)
        }
      } else {
        console.error("[v0] Seasons fetch error:", seasonsError)
      }

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

      if (profileError) throw profileError

      if (!profileData) {
        setProfile(null)
        setTeamMemberships([])
        setTeamMembers([])
        setLegStatistics([])
        return
      }

      setProfile(profileData)

      if (!profileData.player_id) {
        setTeamMemberships([])
        setTeamMembers([])
        setLegStatistics([])
        return
      }

      // ✅ Nur aktive Mitgliedschaften
      const { data: teamData, error: teamError } = await supabase
        .from("team_members")
        .select(`
          id,
          team_id,
          role,
          left_at,
          teams (
            id,
            name,
            logo_url
          )
        `)
        .eq("player_id", profileData.player_id)
        .is("left_at", null)

      if (teamError) {
        console.error("[v0] Team memberships fetch error:", teamError)
        setTeamMemberships([])
        setTeamMembers([])
        setLegStatistics([])
        return
      }

      setTeamMemberships(teamData || [])

      if (!teamData || teamData.length === 0) {
        setTeamMembers([])
        setLegStatistics([])
        return
      }

      const teamIds = teamData.map((t: any) => t.team_id)

      // ✅ TeamMembers nur aktiv
      const { data: rawMembers, error: membersError } = await supabase
        .from("team_members")
        .select("id,team_id,player_id,role,left_at")
        .in("team_id", teamIds)
        .is("left_at", null)
        .order("role", { ascending: false })

      if (membersError) {
        console.error("[v0] Team members fetch error:", membersError)
        setTeamMembers([])
        setLegStatistics([])
        return
      }

      const members = rawMembers || []
      const playerIds = Array.from(new Set(members.map((m: any) => m.player_id).filter(Boolean)))

      let playersById = new Map<string, ClubPlayer>()
      if (playerIds.length > 0) {
        const { data: playersData, error: playersErr } = await supabase
          .from("club_players")
          .select("id,name,photo_url,throwing_hand,age,origin")
          .in("id", playerIds)

        if (!playersErr) {
          for (const p of playersData || []) playersById.set(p.id, p as ClubPlayer)
        } else {
          console.error("[v0] Club players fetch error:", playersErr)
        }
      }

      const mergedMembers = members.map((m: any) => ({
        ...m,
        club_players: playersById.get(m.player_id) || null,
      }))

      setTeamMembers(mergedMembers)

      await fetchAllTeamStatistics(teamIds, mergedMembers)
    } catch (error) {
      console.error("[v0] Error fetching user data:", error)
      setTeamMemberships([])
      setTeamMembers([])
      setLegStatistics([])
    } finally {
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

      let query = supabase
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
          matches!inner (
            id,
            match_date,
            match_time,
            venue,
            dart_type,
            home_team_id,
            away_team_id,
            season_id,
            home_team:teams!matches_home_team_id_fkey(id, name),
            away_team:teams!matches_away_team_id_fkey(id, name),
            home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
            away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name)
          )
        `)
        .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`, {
          foreignTable: "matches",
        })
        .order("matches(match_date)", { ascending: false })
        .order("leg_number", { ascending: false })

      if (selectedSeasonId !== "all" && selectedSeasonId) {
        query = query.eq("matches.season_id", selectedSeasonId)
      }

      const { data, error } = await query
      if (error) throw error

      const filteredData = (data || []).filter((stat: any) => {
        const match = stat.matches
        if (!match) return false

        const playerHomeTeamMembership = members.find(
          (member: any) => member.player_id === stat.player_id && member.team_id === match.home_team_id
        )
        const playerAwayTeamMembership = members.find(
          (member: any) => member.player_id === stat.player_id && member.team_id === match.away_team_id
        )

        let playerTeamInMatch = null
        if (playerHomeTeamMembership && teamIds.includes(match.home_team_id)) {
          playerTeamInMatch = match.home_team_id
        } else if (playerAwayTeamMembership && teamIds.includes(match.away_team_id)) {
          playerTeamInMatch = match.away_team_id
        }

        return playerTeamInMatch !== null
      })

      setLegStatistics(filteredData)
    } catch (err: any) {
      console.error("Error fetching team leg statistics:", err)
      setLegStatistics([])
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

    return legStatistics.filter((stat: any) => {
      const match = stat.matches
      if (!match) return false

      const playerHomeTeamMembership = teamMembers.find(
        (member: any) => member.player_id === stat.player_id && member.team_id === match.home_team_id
      )
      const playerAwayTeamMembership = teamMembers.find(
        (member: any) => member.player_id === stat.player_id && member.team_id === match.away_team_id
      )

      let playerTeamInMatch = null
      if (playerHomeTeamMembership) playerTeamInMatch = match.home_team_id
      else if (playerAwayTeamMembership) playerTeamInMatch = match.away_team_id

      return playerTeamInMatch === selectedTeamId
    })
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col pb-20">
        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col pb-20">
      {/* */}
      <Header
        variant="app"
        title="Bonusgeld"
        subtitle="Ihre Bonuspunkte und Belohnungen"
        backHref="/member-profile-app"
      />

     <main className="pt-12 sm:pt-14">
  <div className="mx-auto w-full px-4 py-4 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
        <div className="mb-4 sm:mb-6">
          <div className="rounded-2xl border border-gray-200/70 bg-white shadow-md ring-1 ring-black/5">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="hidden sm:block">
                  <h1 className="text-2xl font-bold text-gray-900">Bonusgeld</h1>
                  <p className="text-sm text-gray-500 mt-1">Ihre Bonuspunkte und Belohnungen</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <label htmlFor="season-filter" className="text-sm font-medium whitespace-nowrap text-gray-700">
                      Saison:
                    </label>
                    <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                      <SelectTrigger
                        id="season-filter"
                        className="w-full rounded-xl border-gray-200/70 bg-white shadow-sm"
                      >
                        <SelectValue placeholder="Saison auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Saisons</SelectItem>
                        {seasons.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {(s.name || s.type || "Saison") + (s.year ? ` ${s.year}` : "")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {teamMemberships.length > 1 ? (
                    <div className="flex items-center gap-2">
                      <label htmlFor="team-filter" className="text-sm font-medium whitespace-nowrap text-gray-700">
                        Team:
                      </label>
                      <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                        <SelectTrigger
                          id="team-filter"
                          className="w-full rounded-xl border-gray-200/70 bg-white shadow-sm"
                        >
                          <SelectValue placeholder="Team auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Teams</SelectItem>
                          {teamMemberships.map((membership: any) => (
                            <SelectItem key={membership.team_id} value={membership.team_id}>
                              {membership.teams?.name || "Unbekanntes Team"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
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
          teamMembers={teamMembers}
        />
		</div>
      </main>

      <MobileBottomNav />
    </div>
  )
}