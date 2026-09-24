"use client"

import TerminalLink from "../_components/TerminalLink"
import { ArrowLeft, BarChart3, CalendarDays, ChevronRight, Target, Trophy, Users } from "lucide-react"

const tiles = [
  { title: "Spielpläne", subtitle: "Kommende Begegnungen, Heim & Auswärts", href: "/terminal/spielplaene", icon: CalendarDays, accent: "orange" },
  { title: "Ergebnisse", subtitle: "Resultate und vergangene Ligaspiele", href: "/terminal/ergebnisse", icon: Target, accent: "blue" },
  { title: "Tabellen", subtitle: "Platzierungen, Punkte und Leg-Differenz", href: "/terminal/tabellen", icon: Trophy, accent: "orange" },
  { title: "Statistiken", subtitle: "Spieler-, Team- und Leistungsstatistiken", href: "/terminal/statistiken", icon: BarChart3, accent: "blue" },
  { title: "Mannschaften", subtitle: "Teams, Kader und Mannschaftsinformationen", href: "/terminal/teams", icon: Users, accent: "orange" },
]

export default function TerminalLeagueMenuPage() {
  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
      <div className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.62]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.35),rgba(4,6,9,.65)),radial-gradient(circle_at_8%_0%,rgba(249,115,22,.15),transparent_28%),radial-gradient(circle_at_100%_80%,rgba(14,165,233,.11),transparent_30%)]" />

      <div className="relative mx-auto min-h-[100svh] max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">
        <header className="flex items-center gap-4">
          <TerminalLink href="/terminal/menu" label="Hauptmenü wird geöffnet" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]">
            <ArrowLeft className="h-5 w-5" />
          </TerminalLink>
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300/90">EMD Club Terminal</div>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">Ligabereich</h1>
            <div className="mt-1 text-sm font-semibold text-white/38">Alles rund um unsere Liga-Mannschaften</div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tiles.map((tile) => {
            const Icon = tile.icon
            const orange = tile.accent === "orange"
            return (
              <TerminalLink key={tile.title} href={tile.href} label={`${tile.title} wird geöffnet`} className={`group relative min-h-[210px] overflow-hidden rounded-[30px] border bg-black/28 p-6 backdrop-blur-2xl transition duration-300 hover:-translate-y-1 ${orange ? "border-orange-400/22 hover:border-orange-300/45" : "border-cyan-300/22 hover:border-cyan-200/45"}`}>
                <div className={`absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl ${orange ? "bg-orange-500/12" : "bg-cyan-400/10"}`} />
                <div className="relative flex h-full flex-col">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${orange ? "border-orange-400/20 bg-orange-500/10 text-orange-300" : "border-cyan-300/20 bg-cyan-400/10 text-cyan-200"}`}><Icon className="h-6 w-6" /></div>
                  <div className="mt-auto pt-8">
                    <div className="text-2xl font-black">{tile.title}</div>
                    <div className="mt-2 text-sm font-semibold leading-6 text-white/42">{tile.subtitle}</div>
                    <div className={`mt-4 flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.22em] ${orange ? "text-orange-300" : "text-cyan-200"}`}>Öffnen <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" /></div>
                  </div>
                </div>
              </TerminalLink>
            )
          })}
        </section>
      </div>
    </main>
  )
}
