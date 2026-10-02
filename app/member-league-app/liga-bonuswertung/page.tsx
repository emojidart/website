"use client"

import { BonusSection } from "@/components/bonus-section"
import { Header } from "@/components/header"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useMembershipAccess } from "@/hooks/use-membership-access"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck } from "lucide-react"

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
  const {
    loading: membershipLoading,
    hasModule,
  } = useMembershipAccess()

  const canSeeEDart = hasModule("edart_league")
  const canSeeSteeldart = hasModule("steeldart_league")

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
    if (session?.user && !membershipLoading) {
      fetchUserData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, membershipLoading, canSeeEDart, canSeeSteeldart])

  useEffect(() => {
    const savedConfig = localStorage.getItem("bonusConfig")
    if (savedConfig) {
      const config = JSON.parse(savedConfig)
      setBonusConfig(config)
      setTempBonusConfig(config)
    }
  }, [])

  const teamIds = useMemo(() => {
    return teamMemberships.map((t: any) => t.team_id).filter(Boolean)
  }, [teamMemberships])

  const teamIdsKey = useMemo(() => {
    return teamIds.join(",")
  }, [teamIds])

  useEffect(() => {
    if (!teamIdsKey) {
      setLegStatistics([])
      return
    }

    // Beim ersten Laden werden die frischen Mitglieder direkt in fetchUserData
    // übergeben. Dieser Effect ist für spätere Saisonwechsel.
    if (teamMembers.length === 0) return

    void fetchAllTeamStatistics(teamIds, teamMembers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId, teamIdsKey, teamMembers.length])

  const fetchUserData = async () => {
    if (!session?.user) return

    setLegStatsLoading(true)

    try {
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
        console.error("[bonus] Seasons fetch error:", seasonsError)
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
            logo_url,
            dart_type
          )
        `)
        .eq("player_id", profileData.player_id)
        .is("left_at", null)

      if (teamError) {
        console.error("[bonus] Team memberships fetch error:", teamError)
        setTeamMemberships([])
        setTeamMembers([])
        setLegStatistics([])
        return
      }

      const visibleTeamData = (teamData || []).filter((membership: any) => {
        const dartType = membership.teams?.dart_type

        if (dartType === "edart") return canSeeEDart
        if (dartType === "steeldart") return canSeeSteeldart

        return false
      })

      setTeamMemberships(visibleTeamData)

      if (visibleTeamData.length === 0) {
        setTeamMembers([])
        setLegStatistics([])
        return
      }

      const teamIdsLocal = visibleTeamData.map((t: any) => t.team_id)

      const { data: rawMembers, error: membersError } = await supabase
        .from("team_members")
        .select("id,team_id,player_id,role,left_at")
        .in("team_id", teamIdsLocal)
        .is("left_at", null)
        .order("role", { ascending: false })

      if (membersError) {
        console.error("[bonus] Team members fetch error:", membersError)
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
          console.error("[bonus] Club players fetch error:", playersErr)
        }
      }

      const mergedMembers = members.map((m: any) => ({
        ...m,
        club_players: playersById.get(m.player_id) || null,
      }))

      setTeamMembers(mergedMembers)

      await fetchAllTeamStatistics(teamIdsLocal, mergedMembers)
    } catch (error) {
      console.error("[bonus] Error fetching user data:", error)
      setTeamMemberships([])
      setTeamMembers([])
      setLegStatistics([])
    } finally {
      setLegStatsLoading(false)
    }
  }
  
  
  
  

  const fetchAllTeamStatistics = async (teamIdsToLoad: string[], membersOverride?: any[]) => {
  setLegStatsLoading(true)

  try {
    if (teamIdsToLoad.length === 0) {
      setLegStatistics([])
      return
    }

    const sourceMembers = membersOverride ?? teamMembers

    const activePlayerIds = Array.from(
      new Set(sourceMembers.map((m: any) => m.player_id).filter(Boolean)),
    )

    if (activePlayerIds.length === 0) {
      setLegStatistics([])
      return
    }

    let query = supabase
      .from("leg_statistics")
      .select(`
        *,
        player:club_players!leg_statistics_player_id_fkey(
          id,
          name,
          photo_url
        ),
        leg_winner:club_players!leg_statistics_leg_winner_id_fkey(
          id,
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
      .in("player_id", activePlayerIds)
      .or(
        `home_team_id.in.(${teamIdsToLoad.join(",")}),away_team_id.in.(${teamIdsToLoad.join(",")})`,
        { foreignTable: "matches" }
      )
      .order("match_date", { foreignTable: "matches", ascending: false })
      .order("leg_number", { ascending: true })

    if (selectedSeasonId !== "all" && selectedSeasonId) {
      query = query.eq("matches.season_id", selectedSeasonId)
    }

    const { data, error } = await query
    if (error) throw error

    setLegStatistics(data || [])
  } catch (err: any) {
    console.error("[bonus] Error fetching team leg statistics:", err)
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
      const match = stat?.matches
      if (!match) return false

      return match.home_team_id === selectedTeamId || match.away_team_id === selectedTeamId
    })
  }

  if (authLoading || membershipLoading) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white font-sans flex flex-col pb-20">
        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-300 border-t-transparent rounded-full animate-spin" />
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  if (!canSeeEDart && !canSeeSteeldart) {
    return (
      <main className="relative min-h-screen flex flex-col bg-[#050608] text-white pb-20">
        <Header
          variant="app"
          title="Liga-Bonuswertung"
          subtitle="Ligazentrale"
          backHref="/member-league-app"
        />

        <div className="flex-1 flex items-center justify-center px-4 pb-20">
          <Card className="w-full max-w-xl overflow-hidden rounded-[28px] border border-orange-300/[0.14] bg-black/35 shadow-[0_28px_80px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
            <CardContent className="p-6 text-center sm:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-orange-500/[0.08]">
                <ShieldCheck className="h-7 w-7 text-orange-200" />
              </div>

              <h1 className="mt-4 text-xl font-black text-white">
                Kein Liga-Paket gebucht
              </h1>

              <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-white/45">
                Für die Liga-Bonuswertung benötigst du mindestens das E-Dart- oder Steeldart-Liga-Paket.
              </p>

              <Button
                type="button"
                onClick={() => router.push("/member-membership")}
                className="mt-5 rounded-xl bg-orange-500 font-black text-white hover:bg-orange-400"
              >
                Paket buchen
              </Button>
            </CardContent>
          </Card>
        </div>

        <MobileBottomNav />
      </main>
    )
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white font-sans flex flex-col pb-20">
      <Header
        variant="app"
        title="Liga-Bonuswertung"
        subtitle="Ligazentrale"
        backHref="/member-league-app"
      />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.68),rgba(3,5,9,.93)_46%,rgba(2,4,7,.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.18),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.12),transparent_28%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 lg:pb-14 xl:px-8">
        <div className="w-full">
          <section className="relative mb-5 overflow-hidden rounded-[30px] border border-white/[0.08] bg-black/30 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/[0.08]0/[0.14] blur-3xl" />
            <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-300/[0.14] bg-orange-500/[0.08]0/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500/[0.08]0" />
                    Liga-Bonuswertung
                  </div>
                  <h1 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">Liga-Bonuswertung</h1>
                  <p className="mt-2 text-sm font-medium text-white/45 sm:text-base">Bonuswerte aus deinen Liga-Statistiken</p>
                </div>

                  <div className="flex flex-wrap gap-2">
                    {canSeeEDart ? (
                      <span className="inline-flex items-center rounded-full border border-orange-300/[0.16] bg-orange-500/[0.08]0/[0.08] px-3 py-1 text-xs font-black text-orange-100">
                        E-Dart freigeschaltet
                      </span>
                    ) : null}

                    {canSeeSteeldart ? (
                      <span className="inline-flex items-center rounded-full border border-sky-300/[0.16] bg-sky-500/[0.08] px-3 py-1 text-xs font-black text-sky-100">
                        Steeldart freigeschaltet
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <label htmlFor="season-filter" className="text-sm font-medium whitespace-nowrap text-white/45">
                        Saison:
                      </label>
                      <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                        <SelectTrigger
                          id="season-filter"
                          className="w-full rounded-xl border-white/[0.10] bg-[#0a0d12] text-white shadow-none"
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
                        <label htmlFor="team-filter" className="text-sm font-medium whitespace-nowrap text-white/45">
                          Team:
                        </label>
                        <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                          <SelectTrigger
                            id="team-filter"
                            className="w-full rounded-xl border-white/[0.10] bg-[#0a0d12] text-white shadow-none"
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
          </section>

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
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}