"use client"

import Link from "next/link"
import { ArrowRight, ArrowUpRight, CalendarDays, ChevronRight, CircleDot, Swords, Trophy, Tv2 } from "lucide-react"

type StartseitenHeroProps = {
  leagueMatchCount: number
  todaysEventCount: number
  tournamentCount: number
}

const shortcuts = [
  { label: "Meine Spiele", description: "Aufstellung & Zusagen", href: "/member-availability", icon: Swords, key: "matches" },
  { label: "Turniere", description: "Spielen & anmelden", href: "/turniere", icon: Trophy, key: "tournaments" },
  { label: "Veranstaltungen", description: "Was im Verein läuft", href: "/veranstaltungen", icon: CalendarDays, key: "events" },
  { label: "EMD TV", description: "Live aus dem Verein", href: "/emd-tv", icon: Tv2, key: "tv" },
] as const

export function StartseitenHero({ leagueMatchCount, todaysEventCount, tournamentCount }: StartseitenHeroProps) {
  const counts = { matches: leagueMatchCount, tournaments: tournamentCount, events: todaysEventCount, tv: null }

  return (
    <section aria-labelledby="home-heading" className="emd-home-intro mx-auto w-full max-w-[var(--emd-content-max)] px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
      <div className="emd-command">
        <div className="emd-command-main">
          <div className="emd-command-topline"><span className="emd-command-live"><CircleDot aria-hidden="true" size={12} /> DEIN VEREIN. DEINE APP.</span><span className="emd-command-edition">EMD SALZBURG</span></div>
          <div className="emd-command-content">
            <span className="emd-command-overline">WELCOME TO THE CLUB</span>
            <h1 id="home-heading">Alles, was <span>zählt.</span><br />An einem Ort.</h1>
            <p>Dein nächstes Match. Dein Team. Dein Verein. Entdecke, was heute läuft – direkt in deiner EMD App.</p>
            <div className="emd-command-cta">
              <Link href="/member-availability" className="emd-command-button emd-command-button-primary">Meine Spiele <ArrowUpRight size={18} aria-hidden="true" /></Link>
              <Link href="/veranstaltungen" className="emd-command-button emd-command-button-secondary">Termine ansehen <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          </div>
          <div className="emd-command-watermark" aria-hidden="true">EMD<span>.</span></div>
        </div>
        <div className="emd-command-side">
          <div className="emd-command-sidehead"><div><span>QUICK ACCESS</span><strong>Direkt zu deinem Ziel.</strong></div><span className="emd-command-side-index">01 / 04</span></div>
          <div className="emd-command-shortcuts">
            {shortcuts.map(({ label, description, href, icon: Icon, key }, index) => (
              <Link key={href} href={href} className="emd-command-shortcut">
                <span className="emd-command-shortcut-icon"><Icon size={21} strokeWidth={1.9} aria-hidden="true" /></span>
                <span className="emd-command-shortcut-content"><strong>{label}</strong><small>{description}</small></span>
                {counts[key] !== null && <span className="emd-command-shortcut-count" aria-label={`${counts[key]} Einträge`}>{counts[key]}</span>}
                <ChevronRight size={17} className="emd-command-shortcut-arrow" aria-hidden="true" />
              </Link>
            ))}
          </div>
          <div className="emd-command-sidefooter"><span className="emd-command-sidefooter-mark" /> ALWAYS IN THE GAME <span>0{shortcuts.length} BEREICHE</span></div>
        </div>
      </div>
    </section>
  )
}
