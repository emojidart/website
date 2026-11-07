"use client"

import Link from "next/link"
import { ArrowUpRight, CalendarDays, ChevronRight, Swords, Trophy, Tv2 } from "lucide-react"

type StartseitenHeroProps = {
  leagueMatchCount: number
  todaysEventCount: number
  tournamentCount: number
}

export function StartseitenHero({ leagueMatchCount, todaysEventCount, tournamentCount }: StartseitenHeroProps) {
  const links = [
    { label: "Meine Ligaspiele", detail: "Spiele & Verfügbarkeit", count: leagueMatchCount, icon: Swords, href: "/member-availability" },
    { label: "Heute im Verein", detail: "Termine & Veranstaltungen", count: todaysEventCount, icon: CalendarDays, href: "/veranstaltungen" },
    { label: "Turniere", detail: "Wettbewerbe & Anmeldung", count: tournamentCount, icon: Trophy, href: "/turniere" },
  ]

  return (
    <section aria-labelledby="home-heading" className="emd-home-section emd-home-intro mx-auto w-full max-w-[var(--emd-content-max)] px-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <div className="emd-start-surface overflow-hidden rounded-[28px]">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,.74fr)]">
          <div className="emd-start-welcome px-5 py-8 sm:px-9 sm:py-11 lg:px-12 lg:py-14">
            <div className="emd-start-eyebrow inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[.2em]">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-700">EMD</span>
              Emoj!’s Dartverein · Salzburg
            </div>
            <h1 id="home-heading" className="mt-6 max-w-[690px] text-[clamp(2.35rem,5.2vw,4.7rem)] font-bold leading-[1.02] tracking-[-.065em]">
              Dein Verein.<br /><span className="emd-start-orange">Alles im Blick.</span>
            </h1>
            <p className="mt-5 max-w-[500px] text-[15px] leading-7 sm:text-[17px]">
              Spiele, Turniere, Termine und Neues aus dem Verein – direkt hier auf deiner Startseite.
            </p>
            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
              <Link href="/member-availability" className="emd-start-primary inline-flex min-h-[50px] items-center justify-center gap-3 rounded-xl px-5 text-sm font-bold">
                <Swords className="h-[18px] w-[18px]" /> Meine Spiele <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="/turniere" className="emd-start-outline inline-flex min-h-[50px] items-center justify-center gap-3 rounded-xl px-5 text-sm font-bold">
                <Trophy className="h-[18px] w-[18px]" /> Turniere ansehen <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="emd-start-actions border-t px-4 py-5 sm:px-6 sm:py-7 lg:border-l lg:border-t-0 lg:px-7 lg:py-9">
            <div className="mb-4 flex items-center justify-between px-1">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-orange-700">Direktzugriff</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight">Deine Bereiche</h2>
              </div>
              <span className="emd-start-access-mark text-[11px] font-semibold">EMD APP</span>
            </div>
            <div className="grid gap-2.5">
              {links.map(({ label, detail, count, icon: Icon, href }) => (
                <Link key={href} href={href} className="emd-start-action flex min-h-[78px] items-center gap-3 rounded-2xl p-3.5">
                  <span className="emd-start-action-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{label}</span>
                    <span className="mt-0.5 block text-xs">{detail}</span>
                  </span>
                  <span className="emd-start-count min-w-8 text-center text-lg font-bold tabular-nums">{count}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              ))}
              <Link href="/emd-tv" className="emd-start-action flex min-h-[74px] items-center gap-3 rounded-2xl p-3.5">
                <span className="emd-start-action-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"><Tv2 className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">EMD TV</span><span className="mt-0.5 block text-xs">Aufstellungen & Live-Ansichten</span></span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
