"use client"

import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  CircleDollarSign,
  Coins,
  Euro,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react"
import TerminalLink from "../../_components/TerminalLink"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type SeriesConfig = {
  id: string
  name: string
  series_type: string
  is_active: boolean
  startgeld: number
  series_fee: number
  created_at: string | null
}

type PrizeStats = {
  id: string
  label: string
  seriesType: string
  startgeld: number
  seriesFee: number
  participants: number
  appearances: number
  seriesFeesTotal: number
  entryFeesTotal: number
  prizePool: number
}

const money = (value: number) =>
  new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))

function typeLabel(type: string) {
  const known: Record<string, string> = {
    lion_cup: "Lion Cup",
    summer_special: "Summer Special",
    members_cup: "Members Champion Cup",
    challenge_division: "Challenge Division",
    buffalo_cup: "Buffalo Steel Cup",
  }
  return known[type] || String(type || "Turnierserie").replaceAll("_", " ")
}

export default function TerminalPrizeMoneyPage() {
  const [loading, setLoading] = useState(true)
  const [seriesList, setSeriesList] = useState<PrizeStats[]>([])
  const [selectedSeriesId, setSelectedSeriesId] = useState("")

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      try {
        const { data: seriesRows, error: seriesError } = await supabase
          .from("dko_series")
          .select("id,name,series_type,is_active,startgeld,series_fee,created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false })

        if (seriesError) throw seriesError

        const configs = (seriesRows || []) as SeriesConfig[]
        const next: PrizeStats[] = []

        for (const series of configs) {
          const startgeld = Number(series.startgeld || 0)
          const seriesFee = Number(series.series_fee || 0)

          let participants = 0
          let appearances = 0

          // Standardquelle für dynamische Serien.
          const { data: standingRows, error: standingError } = await supabase
            .from("tournament_series_standings")
            .select("player_name,player_id,tournament_id,event_id")
            .eq("series_id", series.id)

          if (!standingError && (standingRows || []).length > 0) {
            const playerSet = new Set<string>()
            const appearanceSet = new Set<string>()

            ;(standingRows || []).forEach((row: any) => {
              const playerKey = String(row.player_id || row.player_name || "").trim()
              const eventKey = String(row.event_id || row.tournament_id || "").trim()

              if (playerKey) playerSet.add(playerKey)
              if (playerKey && eventKey) appearanceSet.add(`${playerKey}:${eventKey}`)
            })

            participants = playerSet.size
            appearances = appearanceSet.size
          }

          // Members Cup speichert die offizielle Wertung in members_cup_results.
          if (series.series_type === "members_cup") {
            const { data: memberRows } = await supabase
              .from("members_cup_results")
              .select("round_robin_id,player_id,player_name,series_id")
              .eq("series_id", series.id)

            if ((memberRows || []).length > 0) {
              const playerSet = new Set<string>()
              const appearanceSet = new Set<string>()

              ;(memberRows || []).forEach((row: any) => {
                const playerKey = String(row.player_id || row.player_name || "").trim()
                const eventKey = String(row.round_robin_id || "").trim()
                if (playerKey) playerSet.add(playerKey)
                if (playerKey && eventKey) appearanceSet.add(`${playerKey}:${eventKey}`)
              })

              participants = playerSet.size
              appearances = appearanceSet.size
            }
          }

          const seriesFeesTotal = participants * seriesFee
          const entryFeesTotal = appearances * startgeld

          next.push({
            id: series.id,
            label: series.name,
            seriesType: series.series_type,
            startgeld,
            seriesFee,
            participants,
            appearances,
            seriesFeesTotal,
            entryFeesTotal,
            prizePool: seriesFeesTotal + entryFeesTotal,
          })
        }

        setSeriesList(next)
        setSelectedSeriesId((current) =>
          current && next.some((row) => row.id === current)
            ? current
            : next[0]?.id || "",
        )
      } catch (error) {
        console.error("Dynamic prize money load error:", error)
        setSeriesList([])
        setSelectedSeriesId("")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const selected = useMemo(
    () => seriesList.find((series) => series.id === selectedSeriesId) || seriesList[0] || null,
    [seriesList, selectedSeriesId],
  )

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.56]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.40),rgba(4,6,9,.78)),radial-gradient(circle_at_8%_0%,rgba(249,115,22,.15),transparent_28%),radial-gradient(circle_at_100%_80%,rgba(14,165,233,.12),transparent_32%)]" />

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
                Preisgeld
              </h1>
              <div className="mt-1 text-sm font-semibold text-white/38">
                Dynamisch aus den Einstellungen der aktiven Turnierserien
              </div>
            </div>
          </div>

          {seriesList.length > 0 ? (
            <select
              value={selectedSeriesId}
              onChange={(e) => setSelectedSeriesId(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="h-12 min-w-[280px] rounded-2xl border border-white/10 bg-[#0b0d10]/90 px-4 text-sm font-black text-white outline-none"
            >
              {seriesList.map((series) => (
                <option key={series.id} value={series.id}>
                  {series.label}
                </option>
              ))}
            </select>
          ) : null}
        </header>

        {loading ? (
          <div className="mt-8 rounded-[32px] border border-white/[0.08] bg-black/28 p-12 text-center backdrop-blur-2xl">
            <div className="mx-auto h-1.5 w-52 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-300" />
            </div>
            <div className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-white/35">
              Preisgeld wird geladen
            </div>
          </div>
        ) : !selected ? (
          <div className="mt-8 rounded-[32px] border border-dashed border-white/10 bg-black/24 p-12 text-center backdrop-blur-xl">
            <Trophy className="mx-auto h-14 w-14 text-white/15" />
            <div className="mt-4 text-xl font-black text-white/60">
              Derzeit keine aktive Turnierserie
            </div>
          </div>
        ) : (
          <>
            <section className="relative mt-7 overflow-hidden rounded-[38px] border border-orange-400/20 bg-black/32 p-6 backdrop-blur-2xl sm:p-8">
              <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-orange-500/12 blur-3xl" />
              <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-cyan-400/[0.08] blur-3xl" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-emerald-300/18 bg-emerald-400/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
                      Aktiv
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
                      {typeLabel(selected.seriesType)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-orange-400/20 bg-orange-500/10 text-orange-300">
                      <Trophy className="h-8 w-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black sm:text-4xl">{selected.label}</h2>
                      <div className="mt-1 text-sm font-semibold text-white/38">
                        Aktuell aus gespeicherten Ergebnissen berechnet
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-orange-300/20 bg-orange-500/[0.07] px-7 py-6 text-center sm:min-w-[300px]">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-100/45">
                    Preisfonds aktuell
                  </div>
                  <div className="mt-2 text-5xl font-black tracking-[-0.06em] text-orange-100 sm:text-6xl">
                    {money(selected.prizePool)}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[26px] border border-white/[0.08] bg-black/27 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                  <Users className="h-4 w-4 text-cyan-200" />
                  Spieler
                </div>
                <div className="mt-3 text-3xl font-black">{selected.participants}</div>
              </div>

              <div className="rounded-[26px] border border-white/[0.08] bg-black/27 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                  <Sparkles className="h-4 w-4 text-orange-300" />
                  Antritte
                </div>
                <div className="mt-3 text-3xl font-black">{selected.appearances}</div>
              </div>

              <div className="rounded-[26px] border border-white/[0.08] bg-black/27 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                  <Coins className="h-4 w-4 text-orange-300" />
                  Serienbeiträge
                </div>
                <div className="mt-3 text-3xl font-black">{money(selected.seriesFeesTotal)}</div>
              </div>

              <div className="rounded-[26px] border border-white/[0.08] bg-black/27 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                  <Euro className="h-4 w-4 text-cyan-200" />
                  Startgelder
                </div>
                <div className="mt-3 text-3xl font-black">{money(selected.entryFeesTotal)}</div>
              </div>
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
              <div className="rounded-[30px] border border-white/[0.08] bg-black/28 p-5 backdrop-blur-2xl sm:p-6">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="h-5 w-5 text-orange-300" />
                  <h3 className="text-xl font-black">Zusammensetzung</h3>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-4">
                    <div>
                      <div className="font-black">Serienbeitrag</div>
                      <div className="mt-1 text-xs font-semibold text-white/35">
                        {selected.participants} Spieler × {money(selected.seriesFee)}
                      </div>
                    </div>
                    <div className="text-xl font-black text-orange-100">{money(selected.seriesFeesTotal)}</div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-4">
                    <div>
                      <div className="font-black">Startgeld je Antritt</div>
                      <div className="mt-1 text-xs font-semibold text-white/35">
                        {selected.appearances} Antritte × {money(selected.startgeld)}
                      </div>
                    </div>
                    <div className="text-xl font-black text-orange-100">{money(selected.entryFeesTotal)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-cyan-300/10 bg-cyan-400/[0.035] p-5 backdrop-blur-2xl sm:p-6">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-cyan-200" />
                  <h3 className="text-xl font-black">Dynamische Berechnung</h3>
                </div>

                <div className="mt-5 text-sm font-semibold leading-7 text-white/48">
                  Es gibt hier keine fest eingebauten Lion-, Members- oder Summer-Beträge mehr.
                  Verwendet werden ausschließlich der in der Turnierzentrale gespeicherte
                  <span className="font-black text-white"> Serienbeitrag ({money(selected.seriesFee)})</span>
                  {" "}und das
                  <span className="font-black text-white"> Startgeld ({money(selected.startgeld)})</span>.
                  Ändert sich einer der Werte in der Serie, wird die Anzeige automatisch neu berechnet.
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
