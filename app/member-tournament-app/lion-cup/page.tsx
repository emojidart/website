"use client"

import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Crown, Trophy, BookOpenCheck, UserPlus, ArrowRight, CalendarDays } from "lucide-react"

const tiles = [
  {
    title: "Tabelle & Ergebnisse",
    subtitle: "Aktuelle Gesamtwertung, Punkte, Antritte, Spielerstatistiken und Turnierergebnisse.",
    href: "/member-tournament-app/lion-cup/tabelle",
    eyebrow: "WERTUNG",
    icon: Trophy,
    accent: "amber",
  },
  {
    title: "Regelwerk",
    subtitle: "Alle Regeln, Startgelder, Punktewertung, Finaltag und Prämierung des Lion Cups.",
    href: "/member-tournament-app/lion-cup/regelwerk",
    eyebrow: "REGELN",
    icon: BookOpenCheck,
    accent: "sky",
  },
  {
    title: "Anmeldung",
    subtitle: "Für einen Lion-Cup-Spieltag anmelden und den aktuellen Anmeldestatus prüfen.",
    href: "/member-tournament-app/lion-cup/anmeldung",
    eyebrow: "SPIELTAG",
    icon: UserPlus,
    accent: "emerald",
  },
]

export default function MemberLionCupHubPage() {
  const router = useRouter()

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background font-sans text-white">
      <Header variant="app" title="Lion Cup" subtitle="Turnierbereich" backHref="/member-tournament-app" />

      <div className="pointer-events-none fixed inset-0 z-0 bg-background" aria-hidden="true" />

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 lg:pb-14 xl:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-amber-300/[0.13] bg-card p-5 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)]  sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -left-16 bottom-[-70px] h-48 w-48 rounded-full bg-amber-500/[0.13] blur-[70px]" />
          <div className="pointer-events-none absolute right-[12%] top-[-80px] h-52 w-52 rounded-full bg-orange-500/[0.10] blur-[75px]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/[0.14] bg-amber-500/[0.08] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                <Crown className="h-3.5 w-3.5" />
                EMD Lion Cup · Herbst 2026
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">
                Lion-Cup-Zentrale
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/48 sm:text-base">
                Tabelle, Regelwerk und Spieltagsanmeldung sauber an einem Ort.
              </p>
            </div>

            <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.035] p-4 sm:min-w-[290px]">
              <CalendarDays className="h-5 w-5 text-amber-200" />
              <div className="mt-2 text-sm font-semibold text-white">Lion Cup Part 3</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">Herbst 2026 · New Edition</div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {tiles.map((tile) => {
            const Icon = tile.icon
            const amber = tile.accent === "amber"
            const sky = tile.accent === "sky"

            const tone = amber
              ? "border-amber-300/[0.13] hover:border-amber-300/35 hover:shadow-[0_28px_80px_-46px_rgba(245,158,11,.18)]"
              : sky
                ? "border-sky-300/[0.12] hover:border-sky-300/30 hover:shadow-[0_28px_80px_-46px_rgba(14,165,233,.16)]"
                : "border-emerald-300/[0.12] hover:border-emerald-300/30 hover:shadow-[0_28px_80px_-46px_rgba(16,185,129,.15)]"

            const iconTone = amber
              ? "border-amber-300/[0.16] bg-amber-500/[0.09] text-amber-100"
              : sky
                ? "border-sky-300/[0.16] bg-sky-500/[0.09] text-sky-100"
                : "border-emerald-300/[0.16] bg-emerald-500/[0.09] text-emerald-100"

            return (
              <button
                key={tile.href}
                type="button"
                onClick={() => router.push(tile.href)}
                className={`group relative min-h-[245px] overflow-hidden rounded-[30px] border ${tone} bg-card text-left shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)]  transition duration-300 hover:-translate-y-1 active:scale-[0.995]`}
              >
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,.035),transparent_45%,rgba(0,0,0,.18))]" />
                <div className="relative flex min-h-[245px] flex-col justify-between p-5 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${iconTone}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.10] bg-card text-white/60 transition group-hover:bg-white/[0.08] group-hover:text-white">
                      <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/38">{tile.eyebrow}</div>
                    <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.035em] text-white">{tile.title}</h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-white/46">{tile.subtitle}</p>
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
