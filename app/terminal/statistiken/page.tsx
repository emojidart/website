"use client"

import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  Award,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Flame,
  Medal,
  Target,
  Trophy,
} from "lucide-react"
import TerminalLink from "../_components/TerminalLink"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type Season = {
  id: string
  name?: string | null
  type?: string | null
  year?: number | null
  start_date?: string | null
  is_active?: boolean | null
}

type LegStat = {
  player_id: string
  player_legs_won?: number | null
  opponent_legs_won?: number | null
  throws_180?: number | null
  throws_171?: number | null
  throws_high_tonne?: number | null
  throws_tonne?: number | null
  throws_95_plus?: number | null
  throws_shanghai?: number | null
  throws_bull?: number | null
  throws_20?: number | null
  throws_19?: number | null
  throws_18?: number | null
  throws_17?: number | null
  throws_16?: number | null
  throws_15?: number | null
  dart_type?: string | null
  player?: {
    name?: string | null
    photo_url?: string | null
  } | null
}

type PlayerStat = {
  player_id: string
  name: string
  photo_url?: string | null
  total_legs: number
  total_wins: number
  throws_180: number
  throws_171: number
  throws_high_tonne: number
  throws_tonne: number
  throws_95_plus: number
  throws_shanghai: number
  throws_bull: number
  throws_20: number
  throws_19: number
  throws_18: number
  throws_17: number
  throws_16: number
  throws_15: number
  win_percentage: number
  total_points: number
}

type DartFilter = "gesamt" | "edart" | "steeldart"

function calculatePlayerPoints(player: PlayerStat) {
  return (
    player.total_wins * 3 +
    player.throws_180 * 25 +
    player.throws_171 * 25 +
    player.throws_high_tonne * 18 +
    player.throws_tonne * 15 +
    player.throws_95_plus * 12 +
    player.throws_shanghai * 10 +
    player.throws_bull * 8 +
    player.throws_20 * 6 +
    player.throws_19 * 5 +
    player.throws_18 * 4 +
    player.throws_17 * 3 +
    player.throws_16 * 2 +
    player.throws_15
  )
}

function PlayerAvatar({ player, size = "normal" }: { player: PlayerStat; size?: "normal" | "large" }) {
  const cls = size === "large" ? "h-20 w-20" : "h-14 w-14"
  return (
    <div className={`${cls} flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]`}>
      {player.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={player.photo_url} alt={player.name} className="h-full w-full object-cover" />
      ) : (
        <Target className="h-7 w-7 text-orange-300/75" />
      )}
    </div>
  )
}

export default function TerminalStatisticsPage() {
  const [loading, setLoading] = useState(true)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState("")
  const [dartFilter, setDartFilter] = useState<DartFilter>("gesamt")
  const [legStatistics, setLegStatistics] = useState<LegStat[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

      let query = supabase
        .from("leg_statistics")
        .select(`
          *,
          player:club_players!leg_statistics_player_id_fkey(name, photo_url),
          match:matches!inner(season_id)
        `)

      if (dartFilter !== "gesamt") {
        query = query.eq("dart_type", dartFilter)
      }

      if (resolvedSeasonId) {
        query = query.eq("match.season_id", resolvedSeasonId)
      }

      const { data } = await query
      setLegStatistics((data || []) as LegStat[])
      setLoading(false)
    }

    void load()
  }, [selectedSeasonId, dartFilter])

  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId)

  const players = useMemo<PlayerStat[]>(() => {
    const map = new Map<string, PlayerStat>()

    legStatistics.forEach((stat) => {
      if (!stat.player_id) return

      if (!map.has(stat.player_id)) {
        map.set(stat.player_id, {
          player_id: stat.player_id,
          name: stat.player?.name || "Unbekannter Spieler",
          photo_url: stat.player?.photo_url,
          total_legs: 0,
          total_wins: 0,
          throws_180: 0,
          throws_171: 0,
          throws_high_tonne: 0,
          throws_tonne: 0,
          throws_95_plus: 0,
          throws_shanghai: 0,
          throws_bull: 0,
          throws_20: 0,
          throws_19: 0,
          throws_18: 0,
          throws_17: 0,
          throws_16: 0,
          throws_15: 0,
          win_percentage: 0,
          total_points: 0,
        })
      }

      const p = map.get(stat.player_id)!
      const wins = Number(stat.player_legs_won || 0)
      const losses = Number(stat.opponent_legs_won || 0)

      p.total_wins += wins
      p.total_legs += wins + losses
      p.throws_180 += Number(stat.throws_180 || 0)
      p.throws_171 += Number(stat.throws_171 || 0)
      p.throws_high_tonne += Number(stat.throws_high_tonne || 0)
      p.throws_tonne += Number(stat.throws_tonne || 0)
      p.throws_95_plus += Number(stat.throws_95_plus || 0)
      p.throws_shanghai += Number(stat.throws_shanghai || 0)
      p.throws_bull += Number(stat.throws_bull || 0)
      p.throws_20 += Number(stat.throws_20 || 0)
      p.throws_19 += Number(stat.throws_19 || 0)
      p.throws_18 += Number(stat.throws_18 || 0)
      p.throws_17 += Number(stat.throws_17 || 0)
      p.throws_16 += Number(stat.throws_16 || 0)
      p.throws_15 += Number(stat.throws_15 || 0)
    })

    return Array.from(map.values())
      .map((p) => {
        const win_percentage = p.total_legs > 0 ? (p.total_wins / p.total_legs) * 100 : 0
        const player = { ...p, win_percentage }
        return { ...player, total_points: calculatePlayerPoints(player) }
      })
      .sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points
        if (b.total_wins !== a.total_wins) return b.total_wins - a.total_wins
        return b.throws_180 - a.throws_180
      })
  }, [legStatistics])

  const leader = players[0]
  const max180 = players.reduce((max, p) => Math.max(max, p.throws_180), 0)
  const total180 = players.reduce((sum, p) => sum + p.throws_180, 0)

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
              <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">Spieler-Statistiken</h1>
            </div>
          </div>

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
        </header>

        <section className="mt-7 overflow-hidden rounded-[32px] border border-white/[0.08] bg-black/24 p-5 backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-white/35">
                <Crosshair className="h-4 w-4" /> Rangliste
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

        {!loading && players.length > 0 && (
          <section className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[26px] border border-orange-400/20 bg-orange-500/[0.07] p-4 backdrop-blur-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-200/60">Ranglistenführer</div>
              <div className="mt-3 flex items-center gap-3">
                <PlayerAvatar player={leader} />
                <div className="min-w-0">
                  <div className="truncate text-lg font-black">{leader.name}</div>
                  <div className="mt-1 text-sm font-black text-orange-200">{leader.total_points} Punkte</div>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-black/25 p-4 backdrop-blur-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Spieler mit Statistik</div>
              <div className="mt-2 text-3xl font-black">{players.length}</div>
            </div>

            <div className="rounded-[26px] border border-cyan-300/15 bg-cyan-400/[0.06] p-4 backdrop-blur-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/45">180er gesamt</div>
              <div className="mt-2 text-3xl font-black text-cyan-100">{total180}</div>
              <div className="mt-1 text-xs font-bold text-cyan-100/45">Bestwert Spieler: {max180}</div>
            </div>
          </section>
        )}

        <section className="mt-5">
          {loading ? (
            <div className="rounded-[32px] border border-white/[0.08] bg-black/28 p-12 text-center backdrop-blur-2xl">
              <div className="mx-auto h-1.5 w-52 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-orange-400" />
              </div>
              <div className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-white/35">Statistiken werden geladen</div>
            </div>
          ) : players.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-white/10 bg-black/20 p-12 text-center backdrop-blur-xl">
              <Target className="mx-auto h-12 w-12 text-white/18" />
              <div className="mt-4 text-xl font-black text-white/60">Keine Statistiken verfügbar</div>
            </div>
          ) : (
            <div className="space-y-3">
              {players.map((player, index) => {
                const open = expandedId === player.player_id

                return (
                  <article key={player.player_id} className={`overflow-hidden rounded-[28px] border backdrop-blur-2xl ${
                    index === 0 ? "border-orange-400/25 bg-orange-500/[0.07]" : "border-white/[0.08] bg-black/28"
                  }`}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : player.player_id)}
                      className="grid w-full items-center gap-4 p-4 text-left sm:grid-cols-[64px_minmax(220px,1fr)_120px_120px_120px_48px] sm:p-5"
                    >
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-lg font-black ${
                        index === 0 ? "border-orange-400/30 bg-orange-500/12 text-orange-200" :
                        index === 1 ? "border-white/15 bg-white/[0.06] text-white/75" :
                        index === 2 ? "border-amber-600/20 bg-amber-700/[0.09] text-amber-200" :
                        "border-white/10 bg-white/[0.035] text-white/45"
                      }`}>
                        {index + 1}
                      </div>

                      <div className="flex min-w-0 items-center gap-3">
                        <PlayerAvatar player={player} />
                        <div className="min-w-0">
                          <div className="truncate text-base font-black sm:text-lg">{player.name}</div>
                          <div className="mt-1 text-xs font-bold text-white/35">{player.total_wins} gewonnene Legs · {player.total_legs} gespielt</div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-orange-500/[0.07] px-3 py-2 text-center">
                        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">Punkte</div>
                        <div className="mt-1 text-xl font-black text-orange-200">{player.total_points}</div>
                      </div>

                      <div className="rounded-xl bg-emerald-500/[0.06] px-3 py-2 text-center">
                        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">Siegquote</div>
                        <div className="mt-1 text-xl font-black text-emerald-200">{player.win_percentage.toFixed(1)}%</div>
                      </div>

                      <div className="rounded-xl bg-white/[0.035] px-3 py-2 text-center">
                        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">180er</div>
                        <div className="mt-1 text-xl font-black">{player.throws_180}</div>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-white/55">
                        {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </button>

                    {open && (
                      <div className="border-t border-white/[0.07] p-4 sm:p-5">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                          {[
                            ["180", player.throws_180, 25],
                            ["171", player.throws_171, 25],
                            ["High Tonne", player.throws_high_tonne, 18],
                            ["Tonne", player.throws_tonne, 15],
                            ["95+", player.throws_95_plus, 12],
                            ["Shanghai", player.throws_shanghai, 10],
                            ["Bull", player.throws_bull, 8],
                            ["20", player.throws_20, 6],
                            ["19", player.throws_19, 5],
                            ["18", player.throws_18, 4],
                            ["17", player.throws_17, 3],
                            ["16", player.throws_16, 2],
                            ["15", player.throws_15, 1],
                          ].map(([label, value, pts]) => (
                            <div key={String(label)} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">{label}</div>
                              <div className="mt-1 text-xl font-black">{String(value)}</div>
                              <div className="mt-1 text-[10px] font-bold text-orange-200/60">{String(pts)} Pkt. je Treffer</div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 rounded-2xl border border-orange-400/12 bg-orange-500/[0.055] p-4 text-sm font-semibold text-white/55">
                          Gewonnenes Leg = 3 Punkte. Die Rangliste wird nach Gesamtpunkten, danach gewonnenen Legs und anschließend nach 180ern sortiert.
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
