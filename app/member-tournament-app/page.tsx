"use client"

import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import {
  Trophy,
  BarChart3,
  MapPinned,
  ArrowRight,
  Target,
  Crown,
} from "lucide-react"

const tiles = [
  {
    title: "Turnierstatistiken",
    subtitle: "Summer Special, DKO, Kratzer und deine bisherigen Turnierergebnisse übersichtlich ansehen.",
    href: "/member-tournament-statistics-app",
    eyebrow: "STATISTIK",
    icon: BarChart3,
    image: "/league/ergebnisse.png",
    accent: "orange",
  },
  {
    title: "DACH Turniere",
    subtitle: "Turniere und Veranstaltungen aus Österreich, Deutschland und der Schweiz entdecken.",
    href: "/dach-veranstaltungen",
    eyebrow: "AT · DE · CH",
    icon: MapPinned,
    image: "/terminal/hero-startscreen.png",
    accent: "sky",
  },
  {
    title: "Lion Cup",
    subtitle: "Tabelle, Regelwerk und Anmeldung für den aktuellen EMD Lion Cup.",
    href: "/member-tournament-app/lion-cup",
    eyebrow: "EMD · LION CUP",
    icon: Crown,
    image: "/league/ergebnisse.png",
    accent: "gold",
  },
]

export default function MemberTournamentHubPage() {
  const router = useRouter()

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] font-sans text-white">
      <Header
        variant="app"
        title="Turnierbereich"
        subtitle="Mein EMD"
        backHref="/member-profile-app"
      />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[64%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.66),rgba(3,5,9,.93)_46%,rgba(2,4,7,.985))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.18),transparent_26%),radial-gradient(circle_at_90%_28%,rgba(14,165,233,.13),transparent_28%),radial-gradient(circle_at_54%_84%,rgba(99,102,241,.07),transparent_24%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 lg:pb-14 xl:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-black/30 p-5 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -left-16 bottom-[-70px] h-48 w-48 rounded-full bg-orange-500/[0.13] blur-[70px]" />
          <div className="pointer-events-none absolute right-[12%] top-[-80px] h-52 w-52 rounded-full bg-sky-500/[0.11] blur-[75px]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                <Trophy className="h-3.5 w-3.5 text-orange-200" />
                Turnierzentrale
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">
                Alles rund um Turniere
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/48 sm:text-base">
                Deine Turnierstatistiken und externe Turniere aus dem DACH-Raum sauber in einem Bereich gebündelt.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:min-w-[300px]">
              <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-3.5">
                <Target className="h-5 w-5 text-orange-200" />
                <div className="mt-2 text-sm font-black text-white">Deine Turniere</div>
                <div className="mt-0.5 text-xs text-white/35">Ergebnisse & Statistik</div>
              </div>
              <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-3.5">
                <MapPinned className="h-5 w-5 text-sky-200" />
                <div className="mt-2 text-sm font-black text-white">DACH</div>
                <div className="mt-0.5 text-xs text-white/35">AT · DE · CH</div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {tiles.map((tile) => {
            const Icon = tile.icon
            const orange = tile.accent === "orange"
            const gold = tile.accent === "gold"

            return (
              <button
                key={tile.href}
                type="button"
                onClick={() => router.push(tile.href)}
                className={[
                  "group relative min-h-[250px] overflow-hidden rounded-[30px] border bg-black/30 text-left shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 active:scale-[0.995]",
                  orange
                    ? "border-orange-300/[0.12] hover:border-orange-300/30 hover:shadow-[0_30px_90px_-44px_rgba(249,115,22,.18)]"
                    : gold
                      ? "border-amber-300/[0.14] hover:border-amber-300/35 hover:shadow-[0_30px_90px_-44px_rgba(245,158,11,.18)]"
                      : "border-sky-300/[0.12] hover:border-sky-300/30 hover:shadow-[0_30px_90px_-44px_rgba(14,165,233,.16)]",
                ].join(" ")}
              >
                <div
                  className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.72] transition duration-700 group-hover:scale-[1.035]"
                  style={{ backgroundImage: `url('${tile.image}')` }}
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(4,6,9,.98)_0%,rgba(4,6,9,.88)_48%,rgba(4,6,9,.52)_100%)]" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.08),rgba(4,6,9,.24)_52%,rgba(4,6,9,.82))]" />

                <div
                  className={[
                    "pointer-events-none absolute -left-12 bottom-[-55px] h-44 w-44 rounded-full blur-[60px]",
                    orange ? "bg-orange-500/[0.15]" : "bg-sky-500/[0.13]",
                  ].join(" ")}
                />

                <div className="relative flex min-h-[250px] flex-col justify-between p-5 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={[
                        "flex h-13 w-13 items-center justify-center rounded-2xl border",
                        orange
                          ? "border-orange-300/[0.16] bg-orange-500/[0.09] text-orange-100"
                          : "border-sky-300/[0.16] bg-sky-500/[0.09] text-sky-100",
                      ].join(" ")}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    <div
                      className={[
                        "flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.12] bg-black/40 text-white/70 transition duration-300 group-hover:text-white",
                        orange
                          ? "group-hover:border-orange-300/35 group-hover:bg-orange-500"
                          : "group-hover:border-sky-300/35 group-hover:bg-sky-500",
                      ].join(" ")}
                    >
                      <ArrowRight className="h-5 w-5 transition duration-300 group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  <div className="max-w-xl">
                    <div
                      className={[
                        "text-[10px] font-black uppercase tracking-[0.22em]",
                        orange ? "text-orange-200/65" : "text-sky-200/65",
                      ].join(" ")}
                    >
                      {tile.eyebrow}
                    </div>
                    <h2 className="mt-1.5 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">
                      {tile.title}
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-white/48 sm:text-base">
                      {tile.subtitle}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
