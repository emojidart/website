"use client"

import { ArrowRight, Calendar, Swords, Trophy } from "lucide-react"

type StartseitenHeroProps = {
  leagueMatchCount: number
  todaysEventCount: number
  tournamentCount: number
}

export function StartseitenHero({ leagueMatchCount, todaysEventCount, tournamentCount }: StartseitenHeroProps) {
  return (
    <section className="emd-saas-section emd-home-hero-section mx-auto w-full max-w-[var(--emd-content-max)] px-3 pt-5 sm:px-5 lg:px-8 xl:px-10">
      <div className="emd-home-hero">
        <div className="emd-home-eyebrow">EMOJ’S DARTVEREIN · SALZBURG</div>
        <h1>Dein Verein. <span>Alles im Blick.</span></h1>
        <p className="emd-home-hero-description">Ligaspiele, Turniere und Vereinsleben – übersichtlich an einem Ort.</p>
        <div className="emd-home-hero-actions">
          <button type="button" className="emd-home-button emd-home-button-primary" onClick={() => (window.location.href = "/member-availability")}>
            <Calendar aria-hidden="true" size={19} /> Meine Spiele <ArrowRight aria-hidden="true" size={18} />
          </button>
          <button type="button" className="emd-home-button emd-home-button-secondary" onClick={() => (window.location.href = "/turniere")}>
            <Trophy aria-hidden="true" size={19} /> Turniere entdecken <ArrowRight aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="emd-home-hero-stats">
          <div className="emd-home-stat"><Swords aria-hidden="true" size={19}/><strong>{leagueMatchCount}</strong><span>Ligaspiele</span></div>
          <div className="emd-home-stat"><Calendar aria-hidden="true" size={19}/><strong>{todaysEventCount}</strong><span>Heute im Verein</span></div>
          <div className="emd-home-stat"><Trophy aria-hidden="true" size={19}/><strong>{tournamentCount}</strong><span>Turniere</span></div>
        </div>
      </div>
    </section>
  )
}
