"use client"
import { BonusSection } from "@/components/bonus-section"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
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

  // ✅ Saison Filter
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

  // ✅ Wenn Saison geändert wird: Stats neu laden (sonst nichts)
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
      console.log("[v0] Fetching user profile for user:", session.user.id)

      // ✅ Seasons laden (für Dropdown)
      const { data: seasonsData, error: seasonsError } = await supabase
        .from("seasons")
        .select("id, name, type, year, is_active")
        .order("start_date", { ascending: false })

      if (seasonsError) {
        console.error("[v0] Seasons fetch error:", seasonsError)
      } else {
        const list = (seasonsData || []) as Season[]
        setSeasons(list)

        if (selectedSeasonId === "all") {
          const active = list.find((s) => s.is_active) || list[0]
          if (active?.id) setSelectedSeasonId(active.id)
        }
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

      if (profileError) {
        console.error("[v0] Profile fetch error:", profileError)
        throw profileError
      }

      if (!profileData) {
        setProfile(null)
        setTeamMemberships([])
        setTeamMembers([])
        setLegStatistics([])
        return
      }

      console.log("[v0] Profile data:", profileData)
      setProfile(profileData)

      if (!profileData.player_id) {
        console.error("[v0] No player_id found in profile")
        setTeamMemberships([])
        setTeamMembers([])
        setLegStatistics([])
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
        setTeamMembers([])
        setLegStatistics([])
        return
      }

      console.log("[v0] Team memberships:", teamData)
      setTeamMemberships(teamData || [])

      if (!teamData || teamData.length === 0) {
        console.log("[v0] No team memberships found")
        setTeamMembers([])
        setLegStatistics([])
        return
      }

      const teamIds = teamData.map((t: any) => t.team_id)

      // ✅ FIX: KEIN embed club_players (vermeidet PGRST201 komplett)
      const { data: rawMembers, error: membersError } = await supabase
        .from("team_members")
        .select("id,team_id,player_id,role")
        .in("team_id", teamIds)
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

        if (playersErr) {
          console.error("[v0] Club players fetch error:", playersErr)
          // Wir können trotzdem weiter machen (dann sind nur Namen/Avatare leer)
        } else {
          for (const p of playersData || []) playersById.set(p.id, p as ClubPlayer)
        }
      }

      const mergedMembers = members.map((m: any) => ({
        ...m,
        club_players: playersById.get(m.player_id) || null,
      }))

      setTeamMembers(mergedMembers)

      console.log("[v0] Loading statistics for all team members")
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
      console.log("[v0] Fetching statistics only for matches involving team IDs:", teamIds)

      if (teamIds.length === 0) {
        console.log("[v0] No teams found")
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

      // ✅ Saison-Filter (nur wenn gewählt)
      if (selectedSeasonId !== "all" && selectedSeasonId) {
        query = query.eq("matches.season_id", selectedSeasonId)
      }

      const { data, error } = await query

      if (error) {
        console.error("[v0] Error fetching team leg statistics:", error)
        throw error
      }

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

      console.log(
        "[v0] Team leg statistics loaded:",
        filteredData.length,
        "records (filtered from",
        data?.length || 0,
        ")"
      )

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
      <main className="flex-grow container mx-auto px-4 py-4 max-w-7xl">
        <div className="mb-4">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="flex items-center gap-2 mb-3">
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Profil
          </Button>

          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bonusgeld</h1>
              <p className="text-sm text-gray-600 mt-1">Ihre Bonuspunkte und Belohnungen</p>
            </div>

            {/* ✅ Saison Filter (sonst nichts geändert) */}
            <div className="flex items-center gap-2">
              <label htmlFor="season-filter" className="text-sm font-medium whitespace-nowrap">
                Saison:
              </label>
              <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                <SelectTrigger id="season-filter" className="w-full">
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
                    {teamMemberships.map((membership: any) => (
                      <SelectItem key={membership.team_id} value={membership.team_id}>
                        {membership.teams?.name || "Unbekanntes Team"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
        />
      </main>

      <MobileBottomNav />
    </div>
  )
}
