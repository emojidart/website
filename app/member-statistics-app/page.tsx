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
    <div className="min-h-screen overflow-x-hidden bg-[#f5f6f8] text-slate-950 font-sans flex flex-col pb-20">
      {/* ✅ NUR HEADER geändert: jetzt dein richtiger Header-Component */}
      <Header variant="app" title="Statistiken" subtitle={headerSubtitle} backHref="/member-profile-app" />

      {/* LOADING */}
      {authLoading || membershipLoading ? (
        <div className="flex-1 flex items-center justify-center px-4 pt-24">
          <div className="animate-in fade-in zoom-in-95 duration-300 w-full max-w-sm">
            <div className="flex flex-col items-center gap-5 rounded-[28px] border border-slate-200 bg-white px-8 py-9 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.55)] sm:px-10">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-2xl animate-pulse" />
                <Loader2 className="relative h-10 w-10 animate-spin text-orange-500" />
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
       <main className="w-full pt-14 sm:pt-16">
         <MembershipAccessGate
           required={["edart_league", "steeldart_league"]}
           requireAll={false}
           title="Liga-Statistiken nicht freigeschaltet"
           description="Für die Liga-Statistiken brauchst du das E-Dart- oder Steeldart-Ligapaket bzw. eine aktive Testfreischaltung."
         >
  <div className="w-full max-w-none px-2 py-3 pb-24 sm:px-4 sm:py-5 sm:pb-10 lg:px-5 xl:px-6 2xl:px-8">
          <section className="relative overflow-hidden rounded-[24px] border border-slate-800/10 bg-slate-950 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.62)] sm:rounded-[28px] xl:rounded-[30px]">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-72 rounded-full bg-white/5 blur-3xl" />

            <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    Statistiken
                  </div>

                  <p className="text-sm font-medium text-white/50">{headerSubtitle}</p>
                  <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                    Team Statistiken
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-white/55 sm:text-base">
                    Detaillierte Analyse der Team-Leistung
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/member-profile-app")}
                  className="h-11 w-full rounded-xl border-white/10 bg-white/10 px-4 font-black text-white shadow-none hover:bg-white/15 hover:text-white sm:w-auto"
                >
                  Zurück zum Profil
                </Button>
              </div>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_50px_-38px_rgba(15,23,42,0.45)] sm:mt-5 sm:rounded-[26px]">
            <div className="grid gap-3 p-3.5 sm:p-4 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-center">
              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm font-bold text-slate-800 shadow-none outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
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

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  variant={dartTypeFilter === "gesamt" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDartTypeFilter("gesamt")}
                  className={
                    dartTypeFilter === "gesamt"
                      ? "h-10 rounded-xl bg-slate-950 font-black text-white shadow-none hover:bg-slate-800"
                      : "h-10 rounded-xl border-slate-200 bg-white font-black text-slate-600 shadow-none hover:bg-slate-50"
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
                        ? "h-10 rounded-xl bg-slate-950 font-black text-white shadow-none hover:bg-slate-800"
                        : "h-10 rounded-xl border-slate-200 bg-white font-black text-slate-600 shadow-none hover:bg-slate-50"
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
                        ? "h-10 rounded-xl bg-slate-950 font-black text-white shadow-none hover:bg-slate-800"
                        : "h-10 rounded-xl border-slate-200 bg-white font-black text-slate-600 shadow-none hover:bg-slate-50"
                    }
                  >
                    Steeldart
                  </Button>
                ) : null}
              </div>
            </div>
          </section>

          <div className="mt-4 sm:mt-5">
            <StatisticsSection
              legStatistics={legStatistics}
              legStatsLoading={legStatsLoading}
              matches={matches}
              getTeamDisplayName={getTeamDisplayName}
            />
          </div>
        </div>
         </MembershipAccessGate>
        </main>
      )}

      <MobileBottomNav />
    </div>
  )
}