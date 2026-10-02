"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import {
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Medal,
  Minus,
  Swords,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type Series = {
  id: string
  name: string
  slug: string
  is_active: boolean
  series_type: string | null
  result_counting_mode: "all" | "best_n"
  best_n_results: number | null
  legs_scoring_active: boolean
  legs_points_per_win: number | null
  qualification_requirement: number | null
  total_tournament_days: number | null
}

type StandingRow = {
  id: string
  player_name: string
  tournament_id: string
  tournament_name: string
  tournament_date: string
  placement: number
  placement_points: number
  legs_points: number
  bonus_points: number
  total_points: number
  legs_won: number
  legs_lost: number
  matches_played: number
  matches_won: number
  matches_lost: number
}

type Aggregate = {
  player_name: string
  points: number
  placement_points: number
  leg_points: number
  bonus_points: number
  tournaments: number
  counted_tournaments: number
  legs_won: number
  legs_lost: number
  matches_played: number
  matches_won: number
  matches_lost: number
  best_placement: number
}

function scoreParts(series: Series, row: StandingRow) {
  if (series.series_type === "members_cup") {
    return {
      placement: Number(row.total_points || row.placement_points || 0),
      legs: 0,
      bonus: Number(row.bonus_points || 0),
    }
  }

  const placement = Number(row.placement_points || 0)
  const bonus = Number(row.bonus_points || 0)
  const storedLegPoints = Number(row.legs_points || 0)
  const calculatedLegPoints = series.legs_scoring_active
    ? Number(row.legs_won || 0) * Number(series.legs_points_per_win || 0)
    : 0

  return {
    placement,
    legs: series.legs_scoring_active ? (storedLegPoints !== 0 ? storedLegPoints : calculatedLegPoints) : 0,
    bonus,
  }
}

function formatDate(value: string) {
  if (!value) return ""
  return new Date(value).toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function rankTone(index: number) {
  if (index === 0) return "border-amber-300/30 bg-amber-400/[0.08]"
  if (index === 1) return "border-slate-300/20 bg-slate-300/[0.055]"
  if (index === 2) return "border-orange-300/20 bg-orange-500/[0.055]"
  return "border-white/[0.08] bg-white/[0.025]"
}

function rankIcon(index: number) {
  if (index === 0) return <Trophy className="h-4 w-4 text-amber-200" />
  if (index === 1) return <Medal className="h-4 w-4 text-slate-200" />
  if (index === 2) return <Medal className="h-4 w-4 text-orange-200" />
  return <span className="text-xs font-black text-white/45">{index + 1}</span>
}

export default function DynamicSeriesTablePage() {
  const params = useParams<{ slug: string }>()
  const [series, setSeries] = useState<Series | null>(null)
  const [rows, setRows] = useState<StandingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      const { data: seriesRow } = await supabase
        .from("dko_series")
        .select("id,name,slug,is_active,series_type,result_counting_mode,best_n_results,legs_scoring_active,legs_points_per_win,qualification_requirement,total_tournament_days")
        .eq("slug", params.slug)
        .eq("is_active", true)
        .maybeSingle()

      if (!mounted) return
      if (!seriesRow) {
        setSeries(null)
        setRows([])
        setLoading(false)
        return
      }

      const loaded = seriesRow as Series
      let standingsRows: StandingRow[] = []

      if (loaded.series_type === "members_cup") {
        const { data: membersResults, error: membersError } = await supabase
          .from("members_cup_results")
          .select("id,round_robin_id,tournament_name,player_name,placement,points,created_at,series_id,event_id")
          .eq("series_id", loaded.id)
          .order("created_at", { ascending: true })
          .order("placement", { ascending: true })

        if (membersError) throw membersError

        standingsRows = ((membersResults || []) as any[]).map((row) => ({
          id: String(row.id),
          player_name: String(row.player_name || "Unbekannt"),
          tournament_id: String(row.event_id || row.round_robin_id || row.id),
          tournament_name: String(row.tournament_name || loaded.name),
          tournament_date: String(row.created_at || ""),
          placement: Number(row.placement || 0),
          placement_points: Number(row.points || 0),
          legs_points: 0,
          bonus_points: 0,
          total_points: Number(row.points || 0),
          legs_won: 0,
          legs_lost: 0,
          matches_played: 0,
          matches_won: 0,
          matches_lost: 0,
        }))
      } else {
        const { data: standings, error: standingsError } = await supabase
          .from("tournament_series_standings")
          .select("id,player_name,tournament_id,tournament_name,tournament_date,placement,placement_points,legs_points,bonus_points,total_points,legs_won,legs_lost,matches_played,matches_won,matches_lost,event_id")
          .eq("series_id", loaded.id)
          .order("tournament_date", { ascending: true })

        if (standingsError) throw standingsError
        standingsRows = (standings || []) as StandingRow[]
      }

      if (!mounted) return
      setSeries(loaded)
      setRows(standingsRows)
      setLoading(false)
    }

    if (params.slug) void load()
    return () => { mounted = false }
  }, [params.slug])

  const table = useMemo(() => {
    if (!series) return [] as Aggregate[]

    const rowScore = (row: StandingRow) => {
      const parts = scoreParts(series, row)
      return parts.placement + parts.legs + parts.bonus
    }

    const grouped = new Map<string, StandingRow[]>()
    for (const row of rows) {
      const key = row.player_name || "Unbekannt"
      const current = grouped.get(key) || []
      current.push(row)
      grouped.set(key, current)
    }

    const result: Aggregate[] = []
    for (const [player_name, playerRows] of grouped.entries()) {
      const countingRows = series.result_counting_mode === "best_n" && series.best_n_results
        ? [...playerRows].sort((a, b) => rowScore(b) - rowScore(a)).slice(0, series.best_n_results)
        : playerRows

      const parts = countingRows.reduce(
        (acc, row) => {
          const score = scoreParts(series, row)
          acc.placement += score.placement
          acc.legs += score.legs
          acc.bonus += score.bonus
          return acc
        },
        { placement: 0, legs: 0, bonus: 0 },
      )

      result.push({
        player_name,
        points: parts.placement + parts.legs + parts.bonus,
        placement_points: parts.placement,
        leg_points: parts.legs,
        bonus_points: parts.bonus,
        tournaments: new Set(playerRows.map((row) => row.tournament_id)).size,
        counted_tournaments: new Set(countingRows.map((row) => row.tournament_id)).size,
        legs_won: playerRows.reduce((sum, row) => sum + Number(row.legs_won || 0), 0),
        legs_lost: playerRows.reduce((sum, row) => sum + Number(row.legs_lost || 0), 0),
        matches_played: playerRows.reduce((sum, row) => sum + Number(row.matches_played || 0), 0),
        matches_won: playerRows.reduce((sum, row) => sum + Number(row.matches_won || 0), 0),
        matches_lost: playerRows.reduce((sum, row) => sum + Number(row.matches_lost || 0), 0),
        best_placement: Math.min(...playerRows.map((row) => Number(row.placement || 999))),
      })
    }

    return result.sort((a, b) =>
      b.points - a.points ||
      b.legs_won - a.legs_won ||
      (b.legs_won - b.legs_lost) - (a.legs_won - a.legs_lost) ||
      a.best_placement - b.best_placement ||
      a.player_name.localeCompare(b.player_name, "de"),
    )
  }, [rows, series])

  const tournaments = useMemo(() => {
    const map = new Map<string, { id: string; name: string; date: string; rows: StandingRow[] }>()
    for (const row of rows) {
      const current = map.get(row.tournament_id) || {
        id: row.tournament_id,
        name: row.tournament_name || "Turnier",
        date: row.tournament_date,
        rows: [],
      }
      current.rows.push(row)
      map.set(row.tournament_id, current)
    }
    return [...map.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [rows])

  const displayRowScore = (row: StandingRow) => {
    if (!series) return Number(row.total_points || 0)
    const parts = scoreParts(series, row)
    return parts.placement + parts.legs + parts.bonus
  }

  const leader = table[0]
  const totalStarts = rows.length
  const totalPlayers = table.length

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] pb-24 text-white">
      <Header
        variant="app"
        title={series?.name || "Tabelle & Ergebnisse"}
        subtitle="Tabelle & Ergebnisse"
        backHref={`/turniere/serien/${params.slug}`}
      />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-[64%_50%] bg-no-repeat opacity-[0.26]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.76),rgba(3,5,9,.96)_42%,rgba(2,4,7,.995))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_22%,rgba(249,115,22,.12),transparent_27%),radial-gradient(circle_at_88%_18%,rgba(245,158,11,.08),transparent_24%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-10 pt-20 sm:px-5 sm:pt-24 lg:px-7 xl:px-8">
        {loading ? (
          <div className="min-h-[420px] animate-pulse rounded-[30px] border border-white/10 bg-white/[0.04]" />
        ) : !series ? (
          <div className="rounded-[28px] border border-white/10 bg-black/35 p-8 text-center font-bold text-white/60">Turnierserie nicht gefunden.</div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            <section className="relative overflow-hidden rounded-[30px] border border-orange-300/[0.13] bg-black/40 p-5 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-7">
              <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-orange-500/[0.11] blur-[70px]" />
              <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/15 bg-orange-500/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-orange-100/75">
                    <Trophy className="h-3.5 w-3.5" />
                    Gesamtwertung
                  </div>
                  <h1 className="mt-3 text-2xl font-black tracking-[-0.035em] sm:text-3xl">{series.name}</h1>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/45">
                    {series.result_counting_mode === "best_n" && series.best_n_results
                      ? `Für die Serienwertung zählen die besten ${series.best_n_results} Ergebnisse.`
                      : "Alle gespielten Turniertage fließen in die Serienwertung ein."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[560px]">
                  <HeroStat label="Spieler" value={String(totalPlayers)} icon={<Target className="h-4 w-4" />} />
                  <HeroStat label="Turniere" value={String(tournaments.length)} icon={<CalendarDays className="h-4 w-4" />} />
                  <HeroStat label="Wertungen" value={String(totalStarts)} icon={<Swords className="h-4 w-4" />} />
                  <HeroStat label="Führend" value={leader?.player_name || "–"} icon={<Award className="h-4 w-4" />} compact />
                </div>
              </div>
            </section>

            {table.length > 0 ? (
              <>
                <section className="grid gap-3 sm:grid-cols-3">
                  {table.slice(0, 3).map((player, index) => (
                    <div key={player.player_name} className={`relative overflow-hidden rounded-[24px] border p-4 backdrop-blur-xl sm:p-5 ${rankTone(index)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.10] bg-black/30">
                            {rankIcon(index)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35">Platz {index + 1}</div>
                            <div className="truncate text-lg font-black text-white">{player.player_name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black tracking-tight text-amber-100">{player.points}</div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-white/30">Punkte</div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <MiniStat label="Antritte" value={player.tournaments} />
                        <MiniStat label="Siege" value={series.series_type === "members_cup" ? "–" : player.matches_won} />
                        <MiniStat label="Leg-Diff" value={series.series_type === "members_cup" ? "–" : signed(player.legs_won - player.legs_lost)} />
                      </div>
                    </div>
                  ))}
                </section>

                <section className="rounded-[30px] border border-white/[0.09] bg-black/40 p-4 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-orange-200" />
                        <h2 className="text-xl font-black sm:text-2xl">Rangliste</h2>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-white/35 sm:text-sm">Aktueller Stand der Serie</p>
                    </div>
                    {series.qualification_requirement && series.qualification_requirement > 0 ? (
                      <div className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs font-bold text-white/50">
                        Mindestantritte: <span className="font-black text-white/85">{series.qualification_requirement}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 space-y-2 lg:hidden">
                    {table.map((player, index) => {
                      const winRate = player.matches_played > 0 ? Math.round((player.matches_won / player.matches_played) * 100) : null
                      const qualified = !series.qualification_requirement || player.tournaments >= series.qualification_requirement
                      return (
                        <div key={player.player_name} className={`rounded-[22px] border p-3.5 ${rankTone(index)}`}>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.10] bg-black/30">{rankIcon(index)}</div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-black text-white">{player.player_name}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-white/35">
                                <span>{player.tournaments} Antritte</span>
                                {series.qualification_requirement ? (
                                  <span className={qualified ? "text-emerald-200/80" : "text-amber-200/75"}>
                                    {qualified ? "Wertung erreicht" : `${series.qualification_requirement - player.tournaments} fehlen`}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-black text-amber-100">{player.points}</div>
                              <div className="text-[9px] font-black uppercase tracking-wider text-white/25">Pkt.</div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-4 gap-1.5">
                            <MobileStat label="Platz" value={player.placement_points} />
                            <MobileStat label="Leg" value={series.series_type === "members_cup" ? "–" : player.leg_points} />
                            <MobileStat label="Bonus" value={player.bonus_points} />
                            <MobileStat label="Bilanz" value={series.series_type === "members_cup" ? "–" : `${player.matches_won}:${player.matches_lost}`} />
                          </div>

                          {series.series_type !== "members_cup" ? (
                            <div className="mt-2 grid grid-cols-3 gap-1.5">
                              <MobileStat label="Legs" value={`${player.legs_won}:${player.legs_lost}`} />
                              <MobileStat label="Leg-Diff" value={signed(player.legs_won - player.legs_lost)} />
                              <MobileStat label="Siegrate" value={winRate === null ? "–" : `${winRate}%`} />
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-4 hidden overflow-hidden rounded-2xl border border-white/[0.08] lg:block">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1120px] text-sm">
                        <thead className="bg-white/[0.035] text-[10px] font-black uppercase tracking-[0.12em] text-white/30">
                          <tr>
                            <th className="w-14 px-4 py-3 text-center">#</th>
                            <th className="px-4 py-3 text-left">Spieler</th>
                            <th className="px-3 py-3 text-right">Gesamt</th>
                            <th className="px-3 py-3 text-right">Platz-Pkt.</th>
                            <th className="px-3 py-3 text-right">Leg-Pkt.</th>
                            <th className="px-3 py-3 text-right">Bonus</th>
                            <th className="px-3 py-3 text-right">Antritte</th>
                            <th className="px-3 py-3 text-right">Bilanz</th>
                            <th className="px-3 py-3 text-right">Siegrate</th>
                            <th className="px-3 py-3 text-right">Legs</th>
                            <th className="px-3 py-3 text-right">Diff.</th>
                            <th className="px-4 py-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.map((player, index) => {
                            const winRate = player.matches_played > 0 ? Math.round((player.matches_won / player.matches_played) * 100) : null
                            const qualified = !series.qualification_requirement || player.tournaments >= series.qualification_requirement
                            return (
                              <tr key={player.player_name} className="border-t border-white/[0.065] transition hover:bg-white/[0.025]">
                                <td className="px-4 py-3.5 text-center"><div className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025]">{rankIcon(index)}</div></td>
                                <td className="px-4 py-3.5"><div className="font-black text-white">{player.player_name}</div><div className="mt-0.5 text-[10px] font-semibold text-white/28">Beste Platzierung: {player.best_placement === 999 ? "–" : player.best_placement}</div></td>
                                <td className="px-3 py-3.5 text-right text-base font-black text-amber-100">{player.points}</td>
                                <td className="px-3 py-3.5 text-right font-bold text-white/58">{player.placement_points}</td>
                                <td className="px-3 py-3.5 text-right font-bold text-white/58">{series.series_type === "members_cup" ? "–" : player.leg_points}</td>
                                <td className="px-3 py-3.5 text-right font-bold text-white/58">{player.bonus_points}</td>
                                <td className="px-3 py-3.5 text-right font-bold text-white/58">{player.tournaments}</td>
                                <td className="px-3 py-3.5 text-right font-bold text-white/58">{series.series_type === "members_cup" ? "–" : `${player.matches_won}:${player.matches_lost}`}</td>
                                <td className="px-3 py-3.5 text-right font-bold text-white/58">{series.series_type === "members_cup" || winRate === null ? "–" : `${winRate}%`}</td>
                                <td className="px-3 py-3.5 text-right font-bold text-white/58">{series.series_type === "members_cup" ? "–" : `${player.legs_won}:${player.legs_lost}`}</td>
                                <td className="px-3 py-3.5 text-right font-black text-white/65">{series.series_type === "members_cup" ? "–" : signed(player.legs_won - player.legs_lost)}</td>
                                <td className="px-4 py-3.5 text-right">
                                  {series.qualification_requirement ? (
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${qualified ? "border-emerald-300/15 bg-emerald-500/[0.07] text-emerald-100/80" : "border-amber-300/15 bg-amber-500/[0.07] text-amber-100/75"}`}>
                                      {qualified ? <CheckCircle2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                      {qualified ? "Gewertet" : `${series.qualification_requirement - player.tournaments} fehlen`}
                                    </span>
                                  ) : <span className="text-white/25">–</span>}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <section className="rounded-[30px] border border-white/[0.09] bg-black/40 p-8 text-center backdrop-blur-xl">
                <Trophy className="mx-auto h-8 w-8 text-white/20" />
                <h2 className="mt-3 text-lg font-black">Noch keine Wertung</h2>
                <p className="mt-1 text-sm text-white/35">Nach dem ersten abgeschlossenen Turniertag erscheint hier die Rangliste.</p>
              </section>
            )}

            <section className="rounded-[30px] border border-white/[0.09] bg-black/40 p-4 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-6">
              <div className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-orange-200" />
                <div>
                  <h2 className="text-xl font-black sm:text-2xl">Turnierergebnisse</h2>
                  <p className="mt-0.5 text-xs font-semibold text-white/35 sm:text-sm">Alle abgeschlossenen Spieltage der Serie</p>
                </div>
              </div>

              {tournaments.length > 0 ? (
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {tournaments.map((tournament) => {
                    const sorted = [...tournament.rows].sort((a, b) => Number(a.placement || 999) - Number(b.placement || 999) || a.player_name.localeCompare(b.player_name, "de"))
                    return (
                      <details key={tournament.id} className="group overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.025] open:border-orange-300/15 open:bg-orange-500/[0.035]">
                        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-300/10 bg-orange-500/[0.06]">
                            <CalendarDays className="h-5 w-5 text-orange-200" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-black text-white">{tournament.name}</div>
                            <div className="mt-1 text-xs font-semibold text-white/35">{formatDate(tournament.date)} · {sorted.length} Wertungen</div>
                          </div>
                          <div className="hidden text-right sm:block">
                            <div className="text-[10px] font-black uppercase tracking-wider text-white/25">Sieger</div>
                            <div className="mt-0.5 max-w-[180px] truncate text-sm font-black text-amber-100">{sorted[0]?.player_name || "–"}</div>
                          </div>
                          <ChevronRight className="h-5 w-5 shrink-0 text-white/25 transition group-open:rotate-90 group-open:text-orange-200" />
                        </summary>
                        <div className="border-t border-white/[0.07] p-3 sm:p-4">
                          <div className="space-y-1.5">
                            {sorted.map((row, index) => (
                              <div key={row.id} className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-black/20 px-3 py-2.5">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">{rankIcon(index)}</div>
                                <div className="min-w-0 flex-1 truncate text-sm font-bold text-white/78">{row.player_name}</div>
                                <div className="text-sm font-black text-white/55">{displayRowScore(row)} Pkt.</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 text-center text-sm font-semibold text-white/35">Noch keine Turnierergebnisse vorhanden.</div>
              )}
            </section>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  )
}

function signed(value: number) {
  if (value > 0) return `+${value}`
  return String(value)
}

function HeroStat({ label, value, icon, compact = false }: { label: string; value: string; icon: ReactNode; compact?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="flex items-center gap-1.5 text-white/30">{icon}<span className="text-[9px] font-black uppercase tracking-[0.13em]">{label}</span></div>
      <div className={`mt-1.5 font-black text-white/90 ${compact ? "truncate text-sm" : "text-xl"}`}>{value}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-white/[0.07] bg-black/20 px-2 py-2"><div className="text-sm font-black text-white/80">{value}</div><div className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-white/25">{label}</div></div>
}

function MobileStat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-white/[0.06] bg-black/20 px-2 py-2 text-center"><div className="text-xs font-black text-white/75">{value}</div><div className="mt-0.5 text-[8px] font-black uppercase tracking-wider text-white/22">{label}</div></div>
}
