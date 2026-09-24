"use client"

import TerminalLink from "../_components/TerminalLink"
import { ArrowLeft, CalendarDays, ChevronRight, Sparkles, Target, Trophy, UserRound } from "lucide-react"

const areas = [
  {
    title: "Ligabereich",
    subtitle: "Spielpläne · Ergebnisse · Tabellen · Statistiken · Mannschaften",
    href: "/terminal/liga",
    icon: Target,
    accent: "orange",
  },
  {
    title: "Turnierbereich",
    subtitle: "Turniere & Cups · Spielpläne · Ergebnisse · Ranglisten · KO",
    href: "/terminal/turniere",
    icon: Trophy,
    accent: "blue",
  },
  {
    title: "Veranstaltungen",
    subtitle: "Alle Events · Intern · Extern · Termine · Orte",
    href: "/terminal/veranstaltungen",
    icon: CalendarDays,
    accent: "blue",
  },
  {
    title: "Mein EMD",
    subtitle: "Persönlicher Bereich · Team · Termine · Statistiken · Verfügbarkeit",
    href: "/terminal/mein-emd",
    icon: UserRound,
    accent: "orange",
  },
]

export default function TerminalMainMenuPage() {
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#050608] text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.68]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,rgba(4,6,10,.72),rgba(4,6,10,.30)_46%,rgba(4,6,10,.58)_100%),linear-gradient(180deg,rgba(4,6,9,.12),rgba(4,6,9,.46))]" />
      <div className="pointer-events-none fixed -left-24 bottom-[-10%] h-[48vh] w-[42vw] rounded-full bg-orange-500/14 blur-[120px]" />
      <div className="pointer-events-none fixed -right-24 bottom-[-8%] h-[46vh] w-[40vw] rounded-full bg-cyan-500/12 blur-[130px]" />

      <div className="relative mx-auto flex min-h-[100svh] max-w-[1500px] flex-col px-5 py-6 lg:px-8 lg:py-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TerminalLink
              href="/terminal" label="Startscreen wird geöffnet"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]"
            >
              <ArrowLeft className="h-5 w-5" />
            </TerminalLink>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.34em] text-orange-300/90">
                <Sparkles className="h-4 w-4" /> EMD Club Terminal
              </div>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">Bereich auswählen</h1>
            </div>
          </div>
        </header>

        <section className="flex flex-1 items-center py-8">
          <div className="grid w-full gap-5 md:grid-cols-2 xl:grid-cols-4">
            {areas.map((area) => {
              const Icon = area.icon
              const orange = area.accent === "orange"
              return (
                <TerminalLink
                  key={area.title}
                  href={area.href} label={`${area.title} wird geöffnet`}
                  className={`group relative min-h-[310px] overflow-hidden rounded-[38px] border bg-black/30 p-7 backdrop-blur-2xl transition duration-300 hover:-translate-y-1 ${
                    orange
                      ? "border-orange-400/25 hover:border-orange-300/45"
                      : "border-cyan-300/25 hover:border-cyan-200/45"
                  }`}
                >
                  <div className={`absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl ${orange ? "bg-orange-500/14" : "bg-cyan-400/12"}`} />
                  <div className="relative flex h-full flex-col">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-[22px] border ${orange ? "border-orange-400/25 bg-orange-500/10 text-orange-300" : "border-cyan-300/20 bg-cyan-400/10 text-cyan-200"}`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="mt-auto pt-12">
                      <div className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">{area.title}</div>
                      <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-white/48">{area.subtitle}</p>
                      <div className={`mt-6 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] ${orange ? "text-orange-300" : "text-cyan-200"}`}>
                        Öffnen <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </TerminalLink>
              )
            })}
          </div>
        </section>

        <footer className="border-t border-white/[0.06] pt-5 text-center text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
          Liga · Turniere · Veranstaltungen · Persönlicher Bereich
        </footer>
      </div>
    </main>
  )
}
