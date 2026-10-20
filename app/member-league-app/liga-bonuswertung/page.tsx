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
import { ShieldCheck, BookOpen, ListChecks, Euro, Users, Info } from "lucide-react"

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


function BonusHelp() {
  const steps = [
    { icon: ListChecks, title: "1. Saison und Team wählen", description: "Wähle oben die Saison und gegebenenfalls deine Mannschaft. E-Dart und Steeldart werden getrennt geführt." },
    { icon: Euro, title: "2. Beträge konfigurieren", description: "Unter Einstellungen legst du die Beträge für Unter 26, Unter 30 und Semperit fest. Sie gelten für die normale Fehlwurfwertung." },
    { icon: Users, title: "3. Spieler individuell einstellen", description: "Unter Spielereinstellungen auf „Einstellen“ klicken. Ohne Fixbetrag gilt die normale Fehlwurfberechnung; alternativ kannst du einen festen Betrag je Mannschaftsbegegnung speichern." },
  ]
  return (
    <section aria-labelledby="bonus-help-title" className="mb-5 overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/30 shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:rounded-[28px]">
      <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.08]">
            <BookOpen className="h-5 w-5 text-orange-300" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-xs">So funktioniert’s</div>
            <h2 id="bonus-help-title" className="mt-0.5 text-lg font-black tracking-tight text-white sm:text-xl">Deine Liga-Bonuswertung</h2>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-white/50">
          Behalte die Bonusgelder deiner Mannschaft im Blick: automatisch nach Fehlwürfen oder mit einem individuellen Fixbetrag pro Ligaeinsatz.
        </p>
      </div>
      <div className="grid gap-2.5 p-3.5 md:grid-cols-3 sm:p-4">
        {steps.map((step) => {
          const Icon = step.icon
          return (
            <div key={step.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-orange-300" />
                <h3 className="text-sm font-black text-white">{step.title}</h3>
              </div>
              <p className="mt-2 text-xs font-medium leading-5 text-white/50">{step.description}</p>
            </div>
          )
        })}
      </div>
      <div className="mx-3.5 mb-3.5 flex items-start gap-2 rounded-xl border border-sky-300/15 bg-sky-500/[0.05] p-3 text-xs font-medium leading-5 text-white/60 sm:mx-4 sm:mb-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
        <p><strong className="text-white">Wichtig beim Fixbetrag:</strong> Eine abgeschlossene Mannschaftsbegegnung zählt für einen eingesetzten Spieler genau einmal – auch als Ersatzspieler. Mehrere Einzel, Doppel oder Legs am selben Ligaabend erhöhen den Fixbetrag nicht. Wer nicht eingesetzt wurde, zahlt standardmäßig nichts; optional lässt sich die Berechnung für alle abgeschlossenen Ligaabende aktivieren. Die Fehlwurfstatistik bleibt trotzdem sichtbar.</p>
      </div>
    </section>
  )
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

  const [playerRates, setPlayerRates] = useState<Record<string, number>>({})
  const [chargeAbsentByPlayer, setChargeAbsentByPlayer] = useState<Record<string, boolean>>({})
  const [completedTeamMatches, setCompletedTeamMatches] = useState<any[]>([])
  const [lineupAppearances, setLineupAppearances] = useState<any[]>([])
  const [ratesError, setRatesError] = useState("")
  const [ratesSaving, setRatesSaving] = useState(false)

  const loadRates = async () => {
    if (!session?.user) return
    const { data, error } = await supabase.from("league_bonus_fixed_rates")
      .select("team_id,season_id,player_id,amount,charge_when_absent")
      .in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"])
    if (error) { setRatesError("Fixbeträge konnten nicht geladen werden. Bitte die SQL-Migration ausführen."); return }
    setRatesError("")
    setPlayerRates(Object.fromEntries((data || []).map((r: any) => [`${r.team_id}:${r.season_id}:${r.player_id}`, Number(r.amount)])))
    setChargeAbsentByPlayer(Object.fromEntries((data || []).map((r: any) => [`${r.team_id}:${r.season_id}:${r.player_id}`, Boolean(r.charge_when_absent)])))
  }

  const savePlayerRate = async (teamId: string, playerId: string, rate: number | null, chargeWhenAbsent = false) => {
    if (!selectedSeasonId || selectedSeasonId === "all") { setRatesError("Bitte zuerst eine konkrete Saison auswählen."); return }
    if (rate !== null && (!Number.isFinite(rate) || rate < 0)) return
    setRatesSaving(true)
    const query = supabase.from("league_bonus_fixed_rates")
    const result = rate === null
      ? await query.delete().eq("team_id",teamId).eq("season_id",selectedSeasonId).eq("player_id",playerId)
      : await query.upsert({team_id: teamId, season_id: selectedSeasonId, player_id:playerId, amount:rate, charge_when_absent:chargeWhenAbsent}, {onConflict:"team_id,season_id,player_id"})
    setRatesSaving(false)
    if (result.error) { setRatesError(`Speichern fehlgeschlagen: ${result.error.message}`); return }
    setRatesError("")
    await loadRates()
  }

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

  useEffect(() => { if (teamIds.length) void loadRates() }, [teamIdsKey, selectedSeasonId, session?.user?.id])

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

      const teamsById = new Map(visibleTeamData.map((membership: any) => [membership.team_id, membership.teams]))
      // Exactly one settings entry per player and team, even when membership rows repeat.
      const uniqueMembers = Array.from(new Map(
        members.filter((m: any) => m.player_id && m.team_id)
          .map((m: any) => [`${m.team_id}:${m.player_id}`, m]),
      ).values())
      const mergedMembers = uniqueMembers.map((m: any) => ({
        ...m,
        club_players: playersById.get(m.player_id) || null,
        team: teamsById.get(m.team_id) || null,
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
      setLineupAppearances([])
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

    // Confirmed lineup, including substitutes, once per completed team encounter.
    let matchQuery = supabase.from("matches")
      .select("id,season_id,dart_type,home_team_id,away_team_id,status")
      .eq("status", "completed")
      .or(`home_team_id.in.(${teamIdsToLoad.join(",")}),away_team_id.in.(${teamIdsToLoad.join(",")})`)
    if (selectedSeasonId !== "all") matchQuery = matchQuery.eq("season_id",selectedSeasonId)
    const {data: games, error: gamesError} = await matchQuery
    if (gamesError) throw gamesError
    const ids = (games || []).map((m:any)=>m.id)
    // Completed team encounters are the billing basis for opt-in absent-player charges.
    setCompletedTeamMatches((games || []).flatMap((m:any) => [m.home_team_id, m.away_team_id].filter((teamId:string)=>teamIdsToLoad.includes(teamId)).map((teamId:string)=>({team_id:teamId,match_id:m.id,dart_type:m.dart_type}))))
    if (!ids.length) { setLineupAppearances([]); return }
    const [{data: headers,error: headerError},{data: lineups,error: lineupError}] = await Promise.all([
      supabase.from("match_lineup_headers").select("match_id,team_id,status,current_version,confirmed_version").in("match_id",ids),
      supabase.from("match_lineups").select("match_id,team_id,player_id,is_substitute").in("match_id",ids).in("team_id",teamIdsToLoad),
    ])
    if (headerError) throw headerError
    if (lineupError) throw lineupError
    const confirmed = new Set((headers || []).filter((h:any)=>h.status === "confirmed" && h.current_version != null && h.current_version === h.confirmed_version).map((h:any)=>`${h.match_id}:${h.team_id}`))
    const gameById = new Map((games || []).map((m:any)=>[m.id,m]))
    const unique = new Map<string,any>()
    for (const row of lineups || []) {
      if (!confirmed.has(`${row.match_id}:${row.team_id}`)) continue
      const match:any = gameById.get(row.match_id)
      if (!match || !activePlayerIds.includes(row.player_id)) continue
      unique.set(`${row.match_id}:${row.team_id}:${row.player_id}`, {...row, match})
    }
    setLineupAppearances([...unique.values()])
  } catch (err: any) {
    console.error("[bonus] Error fetching team leg statistics:", err)
    setLegStatistics([])
    setLineupAppearances([])
    setCompletedTeamMatches([])
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

          <BonusHelp />

          <BonusSection
            legStatistics={getFilteredStatisticsByTeam()}
            legStatsLoading={legStatsLoading}
            bonusConfig={bonusConfig}
            isBonusConfigOpen={isBonusConfigOpen}
            setIsBonusConfigOpen={setIsBonusConfigOpen}
            tempBonusConfig={tempBonusConfig}
            setTempBonusConfig={setTempBonusConfig}
            saveBonusConfig={saveBonusConfig}
            teamMembers={teamMembers.filter((m:any)=>selectedTeamId === "all" || m.team_id === selectedTeamId)}
            selectedSeasonId={selectedSeasonId}
            playerRates={playerRates}
            chargeAbsentByPlayer={chargeAbsentByPlayer}
            completedTeamMatches={completedTeamMatches.filter((m:any)=>selectedTeamId === "all" || m.team_id === selectedTeamId)}
            lineupAppearances={lineupAppearances.filter((row:any)=>selectedTeamId === "all" || row.team_id === selectedTeamId)}
            ratesError={ratesError}
            ratesSaving={ratesSaving}
            savePlayerRate={savePlayerRate}
          />
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}