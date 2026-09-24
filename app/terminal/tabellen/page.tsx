"use client"

import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  Minus,
  Shield,
  Target,
  Trophy,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import TerminalLink from "../_components/TerminalLink"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type Team = {
  id: string
  name: string
  logo_url?: string | null
  dart_type?: string | null
}

type Season = {
  id: string
  name?: string | null
  type?: string | null
  year?: number | null
  start_date?: string | null
  is_active?: boolean | null
}

type Match = {
  id: string
  status?: string | null
  home_score?: number | null
  away_score?: number | null
  dart_type?: string | null
  home_team_id?: string | null
  away_team_id?: string | null
}

type Standing = {
  id: string
  team: string
  logo_url?: string | null
  dart_type?: string | null
  played: number
  won: number
  drawn: number
  lost: number
  points: number
  legsFor: number
  legsAgainst: number
  legsDifference: number
}

type DartFilter = "gesamt" | "edart" | "steeldart"

function TeamLogo({ team, compact = false }: { team: Team | Standing; compact?: boolean }) {
  const size = compact ? "h-10 w-10 rounded-xl" : "h-14 w-14 rounded-2xl"
  return (
    <div className={`${size} flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-black/40`}>
      {team.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo_url} alt={team.team || team.name || "Team"} className="h-full w-full object-contain [transform:scale(1.16)]" />
      ) : (
        <Shield className="h-6 w-6 text-orange-300/80" />
      )}
    </div>
  )
}

export default function TerminalStandingsPage() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState("")
  const [dartFilter, setDartFilter] = useState<DartFilter>("gesamt")

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: seasonRows } = await supabase
        .from("seasons")
        .select("id, name, type, year, start_date, is_active")
        .order("start_date", { ascending: false })

      const seasonList = (seasonRows || []) as Season[]
      setSeasons(seasonList)

      const resolvedSeasonId =
        selectedSeasonId ||
        seasonList.find((s) => s.is_active)?.id ||
        seasonList[0]?.id ||
        ""

      if (!selectedSeasonId && resolvedSeasonId) {
        setSelectedSeasonId(resolvedSeasonId)
      }

      let teamQuery = supabase
        .from("teams")
        .select("id, name, logo_url, dart_type")
        .not("user_id", "is", null)
        .order("name")

      if (dartFilter !== "gesamt") {
        teamQuery = teamQuery.eq("dart_type", dartFilter)
      }

      const { data: teamRows } = await teamQuery
      setTeams((teamRows || []) as Team[])

      let matchQuery = supabase
        .from("matches")
        .select("id,status,home_score,away_score,dart_type,home_team_id,away_team_id")
        .eq("status", "completed")

      if (resolvedSeasonId) {
        matchQuery = matchQuery.eq("season_id", resolvedSeasonId)
      }

      if (dartFilter !== "gesamt") {
        matchQuery = matchQuery.eq("dart_type", dartFilter)
      }

      const { data: matchRows } = await matchQuery
      setMatches((matchRows || []) as Match[])
      setLoading(false)
    }

    void load()
  }, [selectedSeasonId, dartFilter])

  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId)

  const standings = useMemo<Standing[]>(() => {
    const map: Record<string, Standing> = {}

    teams.forEach((team) => {
      map[team.id] = {
        id: team.id,
        team: team.name,
        logo_url: team.logo_url,
        dart_type: team.dart_type,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
        legsFor: 0,
        legsAgainst: 0,
        legsDifference: 0,
      }
    })

    matches.forEach((match) => {
      if (match.status !== "completed") return

      const h = Number(match.home_score || 0)
      const a = Number(match.away_score || 0)

      if (match.home_team_id && map[match.home_team_id]) {
        const row = map[match.home_team_id]
        row.played++
        row.legsFor += h
        row.legsAgainst += a
        if (h > a) {
          row.won++
          row.points += 2
        } else if (a > h) {
          row.lost++
        } else {
          row.drawn++
          row.points += 1
        }
      }

      if (match.away_team_id && map[match.away_team_id]) {
        const row = map[match.away_team_id]
        row.played++
        row.legsFor += a
        row.legsAgainst += h
        if (a > h) {
          row.won++
          row.points += 2
        } else if (h > a) {
          row.lost++
        } else {
          row.drawn++
          row.points += 1
        }
      }
    })

    return Object.values(map)
      .map((row) => ({
        ...row,
        legsDifference: row.legsFor - row.legsAgainst,
      }))
      .filter((row) => row.played > 0)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.legsDifference !== a.legsDifference) return b.legsDifference - a.legsDifference
        return b.legsFor - a.legsFor
      })
  }, [teams, matches])

  const topTeam = standings[0]
  const totalGames = standings.reduce((sum, row) => sum + row.played, 0)

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
      <div className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.58]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.38),rgba(4,6,9,.68)),radial-gradient(circle_at_10%_0%,rgba(249,115,22,.14),transparent_28%),radial-gradient(circle_at_100%_80%,rgba(14,165,233,.10),transparent_30%)]" />

      <div className="relative mx-auto min-h-[100svh] max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TerminalLink href="/terminal/liga" label="Ligabereich wird geöffnet" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]">
              <ArrowLeft className="h-5 w-5" />
            </TerminalLink>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300/90">EMD Club Terminal</div>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">Liga-Tabellen</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="h-12 rounded-2xl border border-white/10 bg-[#0b0d10]/90 px-4 text-sm font-black text-white outline-none"
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.id} className="bg-[#0b0d10] text-white">
                  {season.name || season.type || "Saison"}{season.year ? ` ${season.year}` : ""}
                </option>
              ))}
            </select>
          </div>
        </header>

        <section className="mt-7 overflow-hidden rounded-[32px] border border-white/[0.08] bg-black/24 p-5 backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-white/35">
                <Trophy className="h-4 w-4" /> Tabelle
              </div>
              <div className="mt-2 text-2xl font-black">
                {selectedSeason?.name || selectedSeason?.type || "Aktuelle Saison"}
                {selectedSeason?.year ? ` ${selectedSeason.year}` : ""}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {([
                ["gesamt", "Gesamt"],
                ["edart", "E-Dart"],
                ["steeldart", "Steeldart"],
              ] as Array<[DartFilter, string]>).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setDartFilter(key)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                    dartFilter === key
                      ? "border-orange-400/35 bg-orange-500 text-white"
                      : "border-white/10 bg-white/[0.035] text-white/55 hover:bg-white/[0.07]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {!loading && standings.length > 0 && (
          <section className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[26px] border border-orange-400/20 bg-orange-500/[0.07] p-4 backdrop-blur-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-200/60">Aktuell vorne</div>
              <div className="mt-2 truncate text-xl font-black">{topTeam?.team}</div>
              <div className="mt-1 text-sm font-bold text-orange-200">{topTeam?.points} Punkte</div>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-black/25 p-4 backdrop-blur-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Teams</div>
              <div className="mt-2 text-3xl font-black">{standings.length}</div>
            </div>
            <div className="rounded-[26px] border border-cyan-300/15 bg-cyan-400/[0.06] p-4 backdrop-blur-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/45">Team-Spiele gezählt</div>
              <div className="mt-2 text-3xl font-black text-cyan-100">{totalGames}</div>
            </div>
          </section>
        )}

        <section className="mt-5 overflow-hidden rounded-[32px] border border-white/[0.08] bg-black/28 backdrop-blur-2xl">
          {loading ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-1.5 w-52 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-orange-400" />
              </div>
              <div className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-white/35">Tabelle wird geladen</div>
            </div>
          ) : standings.length === 0 ? (
            <div className="p-12 text-center">
              <Trophy className="mx-auto h-12 w-12 text-white/18" />
              <div className="mt-4 text-xl font-black text-white/60">Noch keine Tabelle verfügbar</div>
              <div className="mt-2 text-sm font-semibold text-white/35">Für diesen Filter gibt es noch keine abgeschlossenen Spiele.</div>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[70px_minmax(280px,1fr)_80px_80px_80px_80px_90px_110px_100px] items-center gap-2 border-b border-white/[0.07] bg-black/30 px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/35 lg:grid">
                <div>Platz</div><div>Team</div><div>Sp.</div><div>S</div><div>U</div><div>N</div><div>Legs</div><div>Diff.</div><div>Punkte</div>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {standings.map((row, index) => (
                  <div key={row.id} className={`relative px-4 py-4 sm:px-5 ${index === 0 ? "bg-orange-500/[0.055]" : "bg-black/[0.08]"}`}>
                    {index === 0 && <div className="absolute inset-y-0 left-0 w-1 bg-orange-400" />}

                    <div className="grid items-center gap-3 lg:grid-cols-[70px_minmax(280px,1fr)_80px_80px_80px_80px_90px_110px_100px]">
                      <div className="flex items-center gap-3 lg:block">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-lg font-black ${
                          index === 0 ? "border-orange-400/30 bg-orange-500/12 text-orange-200" :
                          index === 1 ? "border-white/15 bg-white/[0.06] text-white/75" :
                          index === 2 ? "border-amber-600/20 bg-amber-700/[0.09] text-amber-200" :
                          "border-white/10 bg-white/[0.035] text-white/45"
                        }`}>
                          {index + 1}
                        </div>
                      </div>

                      <div className="flex min-w-0 items-center gap-3">
                        <TeamLogo team={row} />
                        <div className="min-w-0">
                          <div className="truncate text-base font-black">{row.team}</div>
                          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                            {row.dart_type === "steeldart" ? "Steeldart" : "E-Dart"}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 lg:contents">
                        <div className="rounded-xl bg-white/[0.035] px-2 py-2 text-center lg:bg-transparent lg:p-0"><div className="text-[9px] uppercase text-white/25 lg:hidden">Sp.</div><div className="font-black">{row.played}</div></div>
                        <div className="rounded-xl bg-emerald-500/[0.06] px-2 py-2 text-center lg:bg-transparent lg:p-0"><div className="text-[9px] uppercase text-white/25 lg:hidden">S</div><div className="font-black text-emerald-200">{row.won}</div></div>
                        <div className="rounded-xl bg-amber-400/[0.05] px-2 py-2 text-center lg:bg-transparent lg:p-0"><div className="text-[9px] uppercase text-white/25 lg:hidden">U</div><div className="font-black text-amber-100">{row.drawn}</div></div>
                        <div className="rounded-xl bg-rose-500/[0.05] px-2 py-2 text-center lg:bg-transparent lg:p-0"><div className="text-[9px] uppercase text-white/25 lg:hidden">N</div><div className="font-black text-rose-200">{row.lost}</div></div>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 lg:block lg:border-0 lg:bg-transparent lg:p-0">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/25 lg:hidden">Legs</span>
                        <span className="font-black">{row.legsFor}:{row.legsAgainst}</span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 lg:block lg:border-0 lg:bg-transparent lg:p-0">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/25 lg:hidden">Differenz</span>
                        <span className={`inline-flex items-center gap-1 font-black ${
                          row.legsDifference > 0 ? "text-emerald-200" :
                          row.legsDifference < 0 ? "text-rose-200" : "text-white/60"
                        }`}>
                          {row.legsDifference > 0 ? <TrendingUp className="h-4 w-4" /> : row.legsDifference < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                          {row.legsDifference > 0 ? "+" : ""}{row.legsDifference}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-orange-400/15 bg-orange-500/[0.06] px-3 py-2 lg:block lg:border-0 lg:bg-transparent lg:p-0">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/25 lg:hidden">Punkte</span>
                        <span className="text-xl font-black text-orange-200">{row.points}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <div className="mt-4 rounded-[24px] border border-white/[0.07] bg-black/20 px-5 py-4 text-xs font-semibold leading-5 text-white/38 backdrop-blur-xl">
          Wertung: Sieg = 2 Punkte · Unentschieden = 1 Punkt · Sortierung bei Punktgleichheit nach Leg-Differenz und danach nach gewonnenen Legs.
        </div>
      </div>
    </main>
  )
}
