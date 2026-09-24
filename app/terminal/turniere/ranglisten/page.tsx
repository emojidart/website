"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  Award,
  Crown,
  Medal,
  Trophy,
  Users,
} from "lucide-react"
import TerminalLink from "../../_components/TerminalLink"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const MEMBERS_CHAMPION_SERIES_ID = "baeef5fb-b386-4a75-a1f3-c56090a0ec76"

type Series = {
  id: string
  name: string
  slug: string
  is_active: boolean
  series_type: string
  qualification_requirement: number
  total_tournament_days: number
  halving_active: boolean
  halving_date: string | null
  division_active: boolean
  division_date: string | null
  created_at?: string | null
}

type Standing = {
  player_name: string
  total_points: number
  placement_points: number
  bonus_points: number
  legs_won: number
  legs_lost: number
  tournaments_played: number
  total_matches_played: number
  total_matches_won: number
  total_matches_lost: number
  profile_picture_url?: string
  division?: string | null
}

export default function TerminalTournamentRankingsPage() {
  const searchParams = useSearchParams()
  const requestedSeriesId = searchParams.get("series")

  const [loading, setLoading] = useState(true)
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [selectedSeriesId, setSelectedSeriesId] = useState("")
  const [standings, setStandings] = useState<Standing[]>([])
  const [tournamentCount, setTournamentCount] = useState(0)

  useEffect(() => {
    const loadSeries = async () => {
      const { data } = await supabase
        .from("dko_series")
        .select("id,name,slug,is_active,series_type,qualification_requirement,total_tournament_days,halving_active,halving_date,division_active,division_date,created_at")
        .order("created_at", { ascending: false })

      const raw = (data || []) as Series[]
      const visible = raw.filter(
        (series) => series.is_active || series.id === MEMBERS_CHAMPION_SERIES_ID,
      )

      visible.sort((a, b) => {
        const order: Record<string, number> = {
          lion_cup: 1,
          members_cup: 2,
          summer_special: 3,
          challenge_division: 4,
          buffalo_cup: 5,
        }
        return (order[a.series_type] || 99) - (order[b.series_type] || 99)
      })

      setSeriesList(visible)

      const requested = requestedSeriesId && visible.find((s) => s.id === requestedSeriesId)
      setSelectedSeriesId(
        requested?.id ||
        visible.find((s) => s.series_type === "lion_cup" && s.is_active)?.id ||
        visible[0]?.id ||
        "",
      )
    }

    void loadSeries()
  }, [requestedSeriesId])

  const selectedSeries = seriesList.find((series) => series.id === selectedSeriesId) || null

  useEffect(() => {
    if (!selectedSeriesId || !selectedSeries) {
      setStandings([])
      setTournamentCount(0)
      setLoading(false)
      return
    }

    const loadStandings = async () => {
      setLoading(true)

      // =========================================================
      // MEMBERS CHAMPIONS CUP
      // Die offizielle Wertung liegt in members_cup_results.
      // tournament_series_standings ist für diese Serie leer.
      // =========================================================
      if (selectedSeries.series_type === "members_cup") {
        const [{ data: rows, error: rowsErr }, { data: profiles, error: profileErr }] =
          await Promise.all([
            supabase
              .from("members_cup_results")
              .select("round_robin_id,player_id,player_name,placement,points,created_at"),
            supabase
              .from("spieldatenbank")
              .select("id,name,profile_picture_url"),
          ])

        if (rowsErr) {
          console.error("Members Cup standings error:", rowsErr)
          setStandings([])
          setTournamentCount(0)
          setLoading(false)
          return
        }

        if (profileErr) console.warn("Profile pictures warning:", profileErr)

        const pictureById = new Map<string, string>()
        const pictureByName = new Map<string, string>()

        ;((profiles || []) as any[]).forEach((profile) => {
          if (profile.profile_picture_url) {
            if (profile.id) pictureById.set(String(profile.id), String(profile.profile_picture_url))
            if (profile.name) pictureByName.set(String(profile.name).toLowerCase(), String(profile.profile_picture_url))
          }
        })

        const playerMap = new Map<string, any>()
        const tournaments = new Set<string>()

        ;((rows || []) as any[]).forEach((row) => {
          if (row.round_robin_id) tournaments.add(String(row.round_robin_id))

          const key = String(row.player_id || row.player_name || "")
          if (!key) return

          if (!playerMap.has(key)) {
            playerMap.set(key, {
              player_name: String(row.player_name || "–"),
              player_id: row.player_id ? String(row.player_id) : null,
              total_points: 0,
              placement_points: 0,
              bonus_points: 0,
              legs_won: 0,
              legs_lost: 0,
              tournaments_played: 0,
              total_matches_played: 0,
              total_matches_won: 0,
              total_matches_lost: 0,
            })
          }

          const player = playerMap.get(key)
          player.total_points += Number(row.points || 0)
          player.placement_points += Number(row.points || 0)
          player.tournaments_played += 1
        })

        const result: Standing[] = Array.from(playerMap.values()).map((row) => ({
          player_name: row.player_name,
          total_points: row.total_points,
          placement_points: row.placement_points,
          bonus_points: 0,
          legs_won: 0,
          legs_lost: 0,
          tournaments_played: row.tournaments_played,
          total_matches_played: 0,
          total_matches_won: 0,
          total_matches_lost: 0,
          profile_picture_url:
            (row.player_id ? pictureById.get(row.player_id) : undefined) ||
            pictureByName.get(String(row.player_name).toLowerCase()),
          division: null,
        }))

        result.sort((a, b) => {
          if (b.total_points !== a.total_points) return b.total_points - a.total_points
          if (b.tournaments_played !== a.tournaments_played) return b.tournaments_played - a.tournaments_played
          return a.player_name.localeCompare(b.player_name, "de")
        })

        setStandings(result)
        setTournamentCount(tournaments.size)
        setLoading(false)
        return
      }

      // =========================================================
      // ANDERE SERIEN (z.B. Lion Cup)
      // =========================================================
      const [{ data: entries }, { data: profiles }, { data: divisions }] = await Promise.all([
        supabase
          .from("tournament_series_standings")
          .select("*")
          .eq("series_id", selectedSeriesId),
        supabase
          .from("spieldatenbank")
          .select("name,profile_picture_url,id"),
        supabase
          .from("dko_series_player_divisions")
          .select("player_id,division")
          .eq("series_id", selectedSeriesId),
      ])

      const pictureMap = new Map<string, string>()
      const playerIdMap = new Map<string, string>()

      ;((profiles || []) as any[]).forEach((profile) => {
        if (profile.profile_picture_url) {
          pictureMap.set(String(profile.name || "").toLowerCase(), profile.profile_picture_url)
        }
        if (profile.id) {
          playerIdMap.set(String(profile.name || "").toLowerCase(), String(profile.id))
        }
      })

      const divisionMap = new Map<string, string>()
      ;((divisions || []) as any[]).forEach((division) => {
        if (division.player_id && division.division) {
          divisionMap.set(String(division.player_id), String(division.division))
        }
      })

      const map = new Map<string, any>()
      const tournaments = new Set<string>()

      ;((entries || []) as any[]).forEach((entry) => {
        const name = String(entry.player_name || "")
        if (!name) return
        if (entry.tournament_id) tournaments.add(String(entry.tournament_id))

        if (!map.has(name)) {
          map.set(name, {
            player_name: name,
            placement_points: 0,
            bonus_points: 0,
            legs_won: 0,
            legs_lost: 0,
            tournaments_played: 0,
            total_matches_played: 0,
            total_matches_won: 0,
            total_matches_lost: 0,
          })
        }

        const row = map.get(name)

        const halvingMultiplier =
          selectedSeries.halving_active &&
          selectedSeries.halving_date &&
          entry.tournament_date &&
          new Date(entry.tournament_date).getTime() <
            new Date(selectedSeries.halving_date).getTime()
            ? 0.5
            : 1

        row.placement_points += Number(entry.placement_points || 0) * halvingMultiplier
        row.bonus_points += Number(entry.bonus_points || 0) * halvingMultiplier
        row.legs_won += Number(entry.legs_won || 0) * halvingMultiplier
        row.legs_lost += Number(entry.legs_lost || 0) * halvingMultiplier
        row.tournaments_played += 1
        row.total_matches_played += Number(entry.matches_played || 0)
        row.total_matches_won += Number(entry.matches_won || 0)
        row.total_matches_lost += Number(entry.matches_lost || 0)
      })

      const result: Standing[] = Array.from(map.values()).map((row) => {
        const key = row.player_name.toLowerCase()
        const playerId = playerIdMap.get(key)

        return {
          ...row,
          total_points: row.placement_points + row.legs_won + row.bonus_points,
          profile_picture_url: pictureMap.get(key),
          division: playerId ? divisionMap.get(playerId) || null : null,
        }
      })

      result.sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points
        if (b.legs_won !== a.legs_won) return b.legs_won - a.legs_won
        if (b.placement_points !== a.placement_points) return b.placement_points - a.placement_points
        return a.tournaments_played - b.tournaments_played
      })

      setStandings(result)
      setTournamentCount(tournaments.size)
      setLoading(false)
    }

    void loadStandings()
  }, [selectedSeriesId, selectedSeries])

  const qualified = useMemo(() => {
    if (!selectedSeries) return 0
    const req = Number(selectedSeries.qualification_requirement || 0)
    return standings.filter((row) => req <= 0 || row.tournaments_played >= req).length
  }, [standings, selectedSeries])

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.56]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.40),rgba(4,6,9,.76)),radial-gradient(circle_at_8%_0%,rgba(249,115,22,.14),transparent_28%),radial-gradient(circle_at_100%_80%,rgba(14,165,233,.12),transparent_32%)]" />

      <div className="relative mx-auto min-h-[100svh] max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TerminalLink
              href="/terminal/turniere"
              label="Turnierbereich wird geöffnet"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]"
            >
              <ArrowLeft className="h-5 w-5" />
            </TerminalLink>

            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.34em] text-cyan-200/80">
                Turnierbereich
              </div>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                Tabellen & Ranglisten
              </h1>
            </div>
          </div>

          <select
            value={selectedSeriesId}
            onChange={(e) => setSelectedSeriesId(e.target.value)}
            style={{ colorScheme: "dark" }}
            className="h-12 min-w-[260px] rounded-2xl border border-white/10 bg-[#0b0d10]/90 px-4 text-sm font-black text-white outline-none"
          >
            {seriesList.map((series) => (
              <option key={series.id} value={series.id}>
                {series.name}
              </option>
            ))}
          </select>
        </header>

        {selectedSeries && (
          <>
            <section className="mt-7 overflow-hidden rounded-[32px] border border-white/[0.08] bg-black/26 p-5 backdrop-blur-xl sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSeries.is_active && (
                      <span className="rounded-full border border-emerald-300/18 bg-emerald-400/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
                        Aktiv
                      </span>
                    )}
                    {selectedSeries.series_type === "lion_cup" && selectedSeries.halving_active && (
                      <span className="rounded-full border border-cyan-200/22 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
                        Halftime aktiv
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-2xl font-black sm:text-3xl">{selectedSeries.name}</h2>
                  <div className="mt-1 text-sm font-semibold text-white/35">
                    Serien-Gesamtwertung
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">Spieler</div>
                    <div className="mt-1 text-xl font-black">{standings.length}</div>
                  </div>
                  <div className="rounded-2xl border border-orange-300/10 bg-orange-500/[0.04] px-4 py-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-orange-100/35">Qualifiziert</div>
                    <div className="mt-1 text-xl font-black text-orange-100">{qualified}</div>
                  </div>
                  <div className="hidden rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.04] px-4 py-3 sm:block">
                    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/35">Turniere</div>
                    <div className="mt-1 text-xl font-black text-cyan-100">
                      {tournamentCount}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-5 overflow-hidden rounded-[32px] border border-white/[0.08] bg-black/28 backdrop-blur-2xl">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="mx-auto h-1.5 w-52 overflow-hidden rounded-full bg-white/[0.08]">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-300" />
                  </div>
                  <div className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-white/35">
                    Tabelle wird geladen
                  </div>
                </div>
              ) : standings.length === 0 ? (
                <div className="p-12 text-center">
                  <Trophy className="mx-auto h-12 w-12 text-white/18" />
                  <div className="mt-4 text-xl font-black text-white/60">
                    Noch keine Wertung vorhanden
                  </div>
                </div>
              ) : (
                <>
                  <div className="hidden grid-cols-[72px_minmax(260px,1fr)_100px_105px_105px_105px_105px] items-center gap-2 border-b border-white/[0.07] bg-black/30 px-5 py-4 text-[10px] font-black uppercase tracking-[0.16em] text-white/35 lg:grid">
                    <div>Platz</div>
                    <div>Spieler</div>
                    <div>Antritte</div>
                    <div>{selectedSeries.series_type === "members_cup" ? "Cup-Punkte" : "Platz-Pkt."}</div>
                    <div>{selectedSeries.series_type === "members_cup" ? "–" : "Legs"}</div>
                    <div>{selectedSeries.series_type === "members_cup" ? "–" : "Bonus"}</div>
                    <div>Gesamt</div>
                  </div>

                  <div className="divide-y divide-white/[0.06]">
                    {standings.map((row, index) => {
                      const isQualified =
                        Number(selectedSeries.qualification_requirement || 0) <= 0 ||
                        row.tournaments_played >= Number(selectedSeries.qualification_requirement || 0)

                      return (
                        <div
                          key={row.player_name}
                          className={`px-4 py-4 sm:px-5 ${index === 0 ? "bg-orange-500/[0.05]" : ""}`}
                        >
                          <div className="grid items-center gap-3 lg:grid-cols-[72px_minmax(260px,1fr)_100px_105px_105px_105px_105px]">
                            <div className="flex items-center gap-2">
                              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-lg font-black ${
                                index === 0
                                  ? "border-orange-300/30 bg-orange-500/12 text-orange-200"
                                  : index === 1
                                    ? "border-white/15 bg-white/[0.06] text-white/75"
                                    : index === 2
                                      ? "border-amber-600/20 bg-amber-700/[0.09] text-amber-200"
                                      : "border-white/10 bg-white/[0.035] text-white/45"
                              }`}>
                                {index + 1}
                              </div>
                              {index === 0 ? <Crown className="h-4 w-4 text-orange-300 lg:hidden" /> : null}
                            </div>

                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                                {row.profile_picture_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={row.profile_picture_url} alt={row.player_name} className="h-full w-full object-cover" />
                                ) : (
                                  <Users className="h-5 w-5 text-white/25" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-base font-black">{row.player_name}</div>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {row.division && (
                                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100/45">
                                      {row.division}
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-black uppercase tracking-[0.12em] ${
                                    isQualified ? "text-emerald-200/70" : "text-white/25"
                                  }`}>
                                    {isQualified ? "In der Wertung" : "Noch nicht qualifiziert"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 lg:contents">
                              <div className="rounded-xl bg-white/[0.035] px-2 py-2 text-center lg:bg-transparent lg:p-0">
                                <div className="text-[9px] uppercase text-white/25 lg:hidden">Antritte</div>
                                <div className="font-black">{row.tournaments_played}</div>
                              </div>
                              <div className="rounded-xl bg-white/[0.035] px-2 py-2 text-center lg:bg-transparent lg:p-0">
                                <div className="text-[9px] uppercase text-white/25 lg:hidden">Platz-Pkt.</div>
                                <div className="font-black">{row.placement_points}</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 lg:contents">
                              <div className="rounded-xl bg-emerald-500/[0.05] px-2 py-2 text-center lg:bg-transparent lg:p-0">
                                <div className="text-[9px] uppercase text-white/25 lg:hidden">Legs</div>
                                <div className="font-black text-emerald-200">{selectedSeries.series_type === "members_cup" ? "–" : row.legs_won}</div>
                              </div>
                              <div className="rounded-xl bg-amber-400/[0.05] px-2 py-2 text-center lg:bg-transparent lg:p-0">
                                <div className="text-[9px] uppercase text-white/25 lg:hidden">Bonus</div>
                                <div className="font-black text-amber-100">{selectedSeries.series_type === "members_cup" ? "–" : row.bonus_points}</div>
                              </div>
                              <div className="rounded-xl border border-orange-300/12 bg-orange-500/[0.06] px-2 py-2 text-center lg:border-0 lg:bg-transparent lg:p-0">
                                <div className="text-[9px] uppercase text-white/25 lg:hidden">Gesamt</div>
                                <div className="text-xl font-black text-orange-200">{row.total_points}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </section>

            <div className="mt-4 rounded-[24px] border border-white/[0.07] bg-black/20 px-5 py-4 text-xs font-semibold leading-5 text-white/38 backdrop-blur-xl">
              {selectedSeries.series_type === "members_cup"
                ? "Members Champions Cup: Gesamtpunkte werden aus den offiziellen gespeicherten Turnierergebnissen addiert."
                : "Gesamtpunkte = Platzierungspunkte + gewonnene Legs + Bonuspunkte. Bei aktiviertem Halftime werden ältere Werte entsprechend der bestehenden Serienlogik halbiert."}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
