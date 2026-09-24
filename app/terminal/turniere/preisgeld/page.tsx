"use client"

import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  CircleDollarSign,
  Coins,
  Euro,
  Gift,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react"
import TerminalLink from "../../_components/TerminalLink"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type CupKey = "lion" | "summer" | "members"

type CupStats = {
  key: CupKey
  label: string
  subtitle: string
  prizePool: number
  participants: number
  appearances: number
  seriesFees: number
  tournamentFees: number
  sponsoring: number
  active: boolean
}

const money = (value: number) =>
  new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export default function TerminalPrizeMoneyPage() {
  const [loading, setLoading] = useState(true)
  const [selectedCup, setSelectedCup] = useState<CupKey>("lion")
  const [cups, setCups] = useState<CupStats[]>([
    {
      key: "lion",
      label: "EMD Lion Cup",
      subtitle: "Aktiver Serien-Cup",
      prizePool: 0,
      participants: 0,
      appearances: 0,
      seriesFees: 0,
      tournamentFees: 0,
      sponsoring: 0,
      active: false,
    },
    {
      key: "summer",
      label: "Summer Special",
      subtitle: "Serienturnier",
      prizePool: 0,
      participants: 0,
      appearances: 0,
      seriesFees: 0,
      tournamentFees: 0,
      sponsoring: 0,
      active: true,
    },
    {
      key: "members",
      label: "EMD MEMBERS Champion Cup",
      subtitle: "Mitglieder-Cup",
      prizePool: 0,
      participants: 0,
      appearances: 0,
      seriesFees: 0,
      tournamentFees: 0,
      sponsoring: 0,
      active: true,
    },
  ])

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const next: CupStats[] = []

      // LION CUP
      try {
        const { data: activeSeries } = await supabase
          .from("dko_series")
          .select("id,name,is_active")
          .eq("series_type", "lion_cup")
          .eq("is_active", true)
          .maybeSingle()

        let participants = 0
        let appearances = 0
        let seriesFees = 0
        let tournamentFees = 0
        let sponsoring = 0

        if (activeSeries?.id) {
          const { data: rows } = await supabase
            .from("tournament_series_standings")
            .select("player_name,tournament_id")
            .eq("series_id", activeSeries.id)

          const participantSet = new Set(
            (rows || [])
              .map((r: any) => String(r.player_name || "").trim())
              .filter(Boolean),
          )

          const appearanceSet = new Set(
            (rows || [])
              .filter((r: any) => r?.player_name && r?.tournament_id)
              .map((r: any) => `${String(r.player_name).trim()}:${String(r.tournament_id)}`),
          )

          participants = participantSet.size
          appearances = appearanceSet.size
          seriesFees = participants * 10
          tournamentFees = appearances * 5

          // Bestehende Preisgeldlogik aus der Vereins-App beibehalten.
          if (appearances >= 501) sponsoring = 250
          else if (appearances >= 500) sponsoring = 100
        }

        next.push({
          key: "lion",
          label: activeSeries?.name || "EMD Lion Cup",
          subtitle: "Aktiver Serien-Cup",
          prizePool: seriesFees + tournamentFees + sponsoring,
          participants,
          appearances,
          seriesFees,
          tournamentFees,
          sponsoring,
          active: Boolean(activeSeries?.id),
        })
      } catch {
        next.push({
          key: "lion",
          label: "EMD Lion Cup",
          subtitle: "Aktiver Serien-Cup",
          prizePool: 0,
          participants: 0,
          appearances: 0,
          seriesFees: 0,
          tournamentFees: 0,
          sponsoring: 0,
          active: false,
        })
      }

      // SUMMER SPECIAL
      try {
        const { data: rows } = await supabase
          .from("summer_special_total_standings")
          .select("tournaments_played")

        const participants = (rows || []).length
        const appearances = (rows || []).reduce(
          (sum: number, row: any) => sum + Number(row.tournaments_played || 0),
          0,
        )
        const seriesFees = participants * 10
        const tournamentFees = appearances * 5

        next.push({
          key: "summer",
          label: "Summer Special",
          subtitle: "Serienturnier",
          prizePool: seriesFees + tournamentFees,
          participants,
          appearances,
          seriesFees,
          tournamentFees,
          sponsoring: 0,
          active: true,
        })
      } catch {
        next.push({
          key: "summer",
          label: "Summer Special",
          subtitle: "Serienturnier",
          prizePool: 0,
          participants: 0,
          appearances: 0,
          seriesFees: 0,
          tournamentFees: 0,
          sponsoring: 0,
          active: true,
        })
      }

      // MEMBERS CHAMPION CUP
      try {
        const { data: rows } = await supabase
          .from("members_cup_results")
          .select("round_robin_id,player_id")

        const playerSet = new Set(
          (rows || [])
            .map((r: any) => String(r.player_id || "").trim())
            .filter(Boolean),
        )
        const appearanceSet = new Set(
          (rows || [])
            .filter((r: any) => r?.round_robin_id && r?.player_id)
            .map((r: any) => `${r.round_robin_id}:${r.player_id}`),
        )

        const participants = playerSet.size
        const appearances = appearanceSet.size
        const tournamentFees = appearances * 10

        next.push({
          key: "members",
          label: "EMD MEMBERS Champion Cup",
          subtitle: "Mitglieder-Cup",
          prizePool: tournamentFees,
          participants,
          appearances,
          seriesFees: 0,
          tournamentFees,
          sponsoring: 0,
          active: true,
        })
      } catch {
        next.push({
          key: "members",
          label: "EMD MEMBERS Champion Cup",
          subtitle: "Mitglieder-Cup",
          prizePool: 0,
          participants: 0,
          appearances: 0,
          seriesFees: 0,
          tournamentFees: 0,
          sponsoring: 0,
          active: true,
        })
      }

      setCups(next)
      setLoading(false)
    }

    void load()
  }, [])

  const selected = useMemo(
    () => cups.find((cup) => cup.key === selectedCup) || cups[0],
    [cups, selectedCup],
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
                Preisgeld & Cups
              </h1>
              <div className="mt-1 text-sm font-semibold text-white/38">
                Preisfonds und Zusammensetzung
              </div>
            </div>
          </div>

          <select
            value={selectedCup}
            onChange={(e) => setSelectedCup(e.target.value as CupKey)}
            style={{ colorScheme: "dark" }}
            className="h-12 min-w-[280px] rounded-2xl border border-white/10 bg-[#0b0d10]/90 px-4 text-sm font-black text-white outline-none"
          >
            {cups.map((cup) => (
              <option key={cup.key} value={cup.key}>
                {cup.label}
              </option>
            ))}
          </select>
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
        ) : (
          <>
            <section className="relative mt-7 overflow-hidden rounded-[38px] border border-orange-400/20 bg-black/32 p-6 backdrop-blur-2xl sm:p-8">
              <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-orange-500/12 blur-3xl" />
              <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-cyan-400/[0.08] blur-3xl" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selected.active && (
                      <span className="rounded-full border border-emerald-300/18 bg-emerald-400/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
                        Aktiv
                      </span>
                    )}
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
                      {selected.subtitle}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-orange-400/20 bg-orange-500/10 text-orange-300">
                      <Trophy className="h-8 w-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black sm:text-4xl">{selected.label}</h2>
                      <div className="mt-1 text-sm font-semibold text-white/38">
                        Aktueller berechneter Preisfonds
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-orange-300/20 bg-orange-500/[0.07] px-7 py-6 text-center sm:min-w-[300px]">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-100/45">
                    Preisgeld aktuell
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
                <div className="mt-3 text-3xl font-black">{money(selected.seriesFees)}</div>
              </div>

              <div className="rounded-[26px] border border-white/[0.08] bg-black/27 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                  <Euro className="h-4 w-4 text-cyan-200" />
                  Turnierbeiträge
                </div>
                <div className="mt-3 text-3xl font-black">{money(selected.tournamentFees)}</div>
              </div>
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <div className="rounded-[30px] border border-white/[0.08] bg-black/28 p-5 backdrop-blur-2xl sm:p-6">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="h-5 w-5 text-orange-300" />
                  <h3 className="text-xl font-black">Zusammensetzung</h3>
                </div>

                <div className="mt-5 space-y-3">
                  {selected.seriesFees > 0 && (
                    <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-4">
                      <div>
                        <div className="font-black">Serienbeiträge</div>
                        <div className="mt-1 text-xs font-semibold text-white/35">
                          Einmaliger Beitrag je Spieler
                        </div>
                      </div>
                      <div className="text-xl font-black text-orange-100">{money(selected.seriesFees)}</div>
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-4">
                    <div>
                      <div className="font-black">Turnier-/Teilnahmebeiträge</div>
                      <div className="mt-1 text-xs font-semibold text-white/35">
                        Anteil aus den tatsächlich gespeicherten Antritten
                      </div>
                    </div>
                    <div className="text-xl font-black text-orange-100">{money(selected.tournamentFees)}</div>
                  </div>

                  {selected.sponsoring > 0 && (
                    <div className="flex items-center justify-between rounded-2xl border border-cyan-300/12 bg-cyan-400/[0.045] px-4 py-4">
                      <div>
                        <div className="flex items-center gap-2 font-black">
                          <Gift className="h-4 w-4 text-cyan-200" />
                          Sponsoring
                        </div>
                        <div className="mt-1 text-xs font-semibold text-white/35">
                          Zusatz zum Preisfonds
                        </div>
                      </div>
                      <div className="text-xl font-black text-cyan-100">{money(selected.sponsoring)}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[30px] border border-cyan-300/10 bg-cyan-400/[0.035] p-5 backdrop-blur-2xl sm:p-6">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-cyan-200" />
                  <h3 className="text-xl font-black">Berechnung</h3>
                </div>

                <div className="mt-5 text-sm font-semibold leading-7 text-white/48">
                  {selected.key === "lion" && (
                    <>
                      Beim Lion Cup fließen aktuell <span className="font-black text-white">10 € je Spieler</span> Serienbeitrag
                      und <span className="font-black text-white">5 € je Turnierantritt</span> in den Preisfonds.
                    </>
                  )}

                  {selected.key === "summer" && (
                    <>
                      Beim Summer Special fließen <span className="font-black text-white">10 € je Spieler</span> Serienbeitrag
                      und <span className="font-black text-white">5 € je Antritt</span> in den Preisfonds.
                    </>
                  )}

                  {selected.key === "members" && (
                    <>
                      Beim Members Champion Cup fließen
                      <span className="font-black text-white"> 10 € je Spieler und gespieltem Qualifikationsturnier</span>
                      in den Finalpreisfonds.
                    </>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
