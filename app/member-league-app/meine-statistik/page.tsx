"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { StatisticsSection } from "@/components/statistics-section"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useMembershipAccess } from "@/hooks/use-membership-access"
import { MembershipAccessGate } from "@/components/member/membership/membership-access-gate"
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
    dart_type?: "edart" | "steeldart" | null
  } | null
}

interface TeamMember {
  id: string
  team_id: string
  player_id: string
  role: string | null
  joined_at?: string | null
  left_at?: string | null
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
  const {
    loading: membershipLoading,
    hasModule,
  } = useMembershipAccess()

  const canSeeEDart = hasModule("edart_league")
  const canSeeSteeldart = hasModule("steeldart_league")

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
    if (session?.user && !membershipLoading) void fetchUserProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, membershipLoading, canSeeEDart, canSeeSteeldart])

  useEffect(() => {
    if (profile?.player_id && teamMembers.length > 0) void fetchLegStatistics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, teamMembers, dartTypeFilter, selectedSeasonId])

  useEffect(() => {
    if (teamMemberships.length > 0) void fetchMatches()
    else setMatches([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMemberships, selectedSeasonId])

  useEffect(() => {
    if (membershipLoading) return

    if (dartTypeFilter === "edart" && !canSeeEDart) {
      setDartTypeFilter(canSeeSteeldart ? "steeldart" : "gesamt")
      return
    }

    if (dartTypeFilter === "steeldart" && !canSeeSteeldart) {
      setDartTypeFilter(canSeeEDart ? "edart" : "gesamt")
    }
  }, [membershipLoading, canSeeEDart, canSeeSteeldart, dartTypeFilter])

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
          .select(`id, team_id, role, teams (id, name, logo_url, dart_type)`)
          .eq("player_id", profileData.player_id)
          .is("left_at", null)

        if (teamError) throw teamError

        const allowedTeamData = ((teamData || []) as any[]).filter((membership: any) => {
          const dartType = String(membership?.teams?.dart_type || "").toLowerCase()

          if (dartType === "edart") return canSeeEDart
          if (dartType === "steeldart") return canSeeSteeldart

          return false
        })

        setTeamMemberships(allowedTeamData as any)

        if (allowedTeamData.length > 0) {
          const teamIds = allowedTeamData.map((t: any) => t.team_id)

          const { data: membersData, error: membersError } = await supabase
            .from("team_members")
            .select(
              `
              id,
              team_id,
              player_id,
              role,
              joined_at,
              left_at,
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

      const membershipIsValidForMatch = (stat: any) => {
        const match = stat?.matches
        if (!match?.match_date || !stat?.player_id) return false

        const matchDate = String(match.match_date).slice(0, 10)
        const participatingOwnTeamIds = [
          match.home_team_type !== "opponent" ? match.home_team_id : null,
          match.away_team_type !== "opponent" ? match.away_team_id : null,
        ].filter(Boolean) as string[]

        if (participatingOwnTeamIds.length === 0) return false

        return teamMembers.some((membership) => {
          if (membership.player_id !== stat.player_id) return false
          if (!participatingOwnTeamIds.includes(membership.team_id)) return false

          const joined = membership.joined_at ? String(membership.joined_at).slice(0, 10) : null
          const left = membership.left_at ? String(membership.left_at).slice(0, 10) : null

          if (joined && joined > matchDate) return false
          if (left && left < matchDate) return false

          return true
        })
      }

      const validStats = (data || []).filter(membershipIsValidForMatch)
      setLegStatistics(validStats)
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

  const headerSubtitle = "Ligazentrale"

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] font-sans text-white">
      <Header variant="app" title="Meine Statistik" subtitle={headerSubtitle} backHref="/member-league-app" />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.68),rgba(3,5,9,.93)_46%,rgba(2,4,7,.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.18),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_55%_82%,rgba(99,102,241,.09),transparent_24%)]" />
      </div>

      {authLoading || membershipLoading ? (
        <main className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-24 pt-24">
          <div className="w-full max-w-sm rounded-[28px] border border-white/[0.08] bg-black/35 p-8 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-orange-300" />
            <p className="mt-5 text-lg font-black text-white">Statistiken werden geladen</p>
            <p className="mt-1 text-sm font-semibold text-white/35">Einen Moment bitte…</p>
          </div>
        </main>
      ) : (
        <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 lg:pb-14 xl:px-8">
          <MembershipAccessGate
            required={["edart_league", "steeldart_league"]}
            requireAll={false}
            title="Liga-Statistiken nicht freigeschaltet"
            description="Für die Liga-Statistiken brauchst du das E-Dart- oder Steeldart-Ligapaket bzw. eine aktive Testfreischaltung."
          >
            <section className="mb-5 overflow-hidden rounded-[30px] border border-white/[0.08] bg-black/30 p-5 backdrop-blur-xl sm:p-7">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-orange-300/15 bg-orange-500/[0.09] text-orange-200 shadow-[0_0_28px_rgba(249,115,22,.10)]">
                  <Loader2 className="hidden" />
                  <span className="text-2xl font-black">Σ</span>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300/65">
                    Auswertung
                  </div>
                  <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
                    Meine Statistik
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/40">
                    Persönliche und teambezogene Ligastatistiken nach Saison und Dartart.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-5 overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/25 p-4 backdrop-blur-xl sm:p-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-end">
                <div>
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Saison</div>
                  <select
                    value={selectedSeasonId}
                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/[0.10] bg-[#0a0d12] px-3 text-sm font-bold text-white outline-none focus:border-orange-300/40 focus:ring-2 focus:ring-orange-500/10"
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
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Dartart</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button
                      variant={dartTypeFilter === "gesamt" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDartTypeFilter("gesamt")}
                      className={
                        dartTypeFilter === "gesamt"
                          ? "h-10 rounded-xl bg-orange-500 font-black text-white shadow-none hover:bg-orange-400"
                          : "h-10 rounded-xl border-white/[0.09] bg-white/[0.035] font-black text-white/50 shadow-none hover:bg-white/[0.06] hover:text-white"
                      }
                    >
                      Gesamt
                    </Button>

                    {canSeeEDart ? (
                      <Button
                        variant={dartTypeFilter === "edart" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDartTypeFilter("edart")}
                        className={
                          dartTypeFilter === "edart"
                            ? "h-10 rounded-xl bg-orange-500 font-black text-white shadow-none hover:bg-orange-400"
                            : "h-10 rounded-xl border-white/[0.09] bg-white/[0.035] font-black text-white/50 shadow-none hover:bg-white/[0.06] hover:text-white"
                        }
                      >
                        E-Dart
                      </Button>
                    ) : null}

                    {canSeeSteeldart ? (
                      <Button
                        variant={dartTypeFilter === "steeldart" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDartTypeFilter("steeldart")}
                        className={
                          dartTypeFilter === "steeldart"
                            ? "h-10 rounded-xl bg-orange-500 font-black text-white shadow-none hover:bg-orange-400"
                            : "h-10 rounded-xl border-white/[0.09] bg-white/[0.035] font-black text-white/50 shadow-none hover:bg-white/[0.06] hover:text-white"
                        }
                      >
                        Steeldart
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/25 p-3 backdrop-blur-xl sm:p-4">
              <StatisticsSection
                legStatistics={legStatistics}
                legStatsLoading={legStatsLoading}
                matches={matches}
                getTeamDisplayName={getTeamDisplayName}
              />
            </section>
          </MembershipAccessGate>
        </main>
      )}

      <MobileBottomNav />
    </div>
  )
}
