"use client"

import { ArrowRight, Calendar, Sparkles, Swords, Trophy, Zap } from "lucide-react"

type StartseitenHeroProps = {
  leagueMatchCount: number
  todaysEventCount: number
  tournamentCount: number
}

export function StartseitenHero({
  leagueMatchCount,
  todaysEventCount,
  tournamentCount,
}: StartseitenHeroProps) {
  return (
    <section className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 pt-4 sm:px-5 sm:pt-5 lg:px-8 xl:px-10">
      <div className="emd-home-hero relative min-h-[460px] overflow-hidden rounded-[34px] border border-white/10 text-white shadow-[0_34px_120px_-46px_rgba(0,0,0,.95)] sm:min-h-[500px] lg:min-h-[540px]">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat transition-transform duration-700"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,4,8,.92),rgba(2,4,8,.68)_44%,rgba(2,4,8,.72)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_82%,rgba(249,115,22,.24),transparent_31%),radial-gradient(circle_at_82%_24%,rgba(14,165,233,.16),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.75)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-orange-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-sky-500/10 blur-[110px]" />

        <div className="relative z-10 flex min-h-[460px] flex-col justify-between p-5 sm:min-h-[500px] sm:p-7 lg:min-h-[540px] lg:p-10">
          <div className="flex items-start justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/25 px-4 py-2 text-[10px] font-black uppercase tracking-[0.30em] text-white/70 backdrop-blur-xl sm:text-[11px]">
              <Sparkles className="h-4 w-4 text-orange-300" />
              EMD VereinsApp
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/55 backdrop-blur-xl sm:flex">
              <Zap className="h-3.5 w-3.5 text-orange-300" />
              Dein Verein. Deine App.
            </div>
          </div>

          <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_520px]">
            <div className="max-w-[760px]">
              <div className="text-[10px] font-black uppercase tracking-[0.42em] text-orange-300/90 sm:text-[11px]">
                Emoj&apos;s Dartverein
              </div>

              <h1 className="mt-4 text-[clamp(2.7rem,6vw,5.8rem)] font-black uppercase leading-[0.90] tracking-[-0.07em] text-white drop-shadow-[0_0_30px_rgba(0,0,0,.45)]">
                Alles.
                <span className="block bg-gradient-to-r from-white via-orange-200 to-orange-400 bg-clip-text text-transparent">
                  Auf einen Blick.
                </span>
              </h1>

              <div className="mt-5 h-px w-28 bg-gradient-to-r from-orange-400 to-transparent" />

              <p className="mt-5 max-w-[620px] text-sm font-semibold leading-6 text-white/58 sm:text-base sm:leading-7 lg:text-lg">
                Spiele, Turniere, Termine und Vereinsleben – direkt dort, wo du sie brauchst.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  className="emd-home-primary-action group relative inline-flex min-h-14 items-center justify-center gap-3 overflow-hidden rounded-2xl border border-orange-300/25 bg-orange-500/16 px-6 font-black text-white backdrop-blur-xl"
                  onClick={() => (window.location.href = "/member-availability")}
                >
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(249,115,22,.18),rgba(255,255,255,.03),rgba(14,165,233,.10))]" />
                  <Calendar className="relative h-5 w-5 text-orange-300" />
                  <span className="relative">Meine Spiele</span>
                  <ArrowRight className="relative h-4 w-4 text-orange-300 transition-transform duration-300 group-hover:translate-x-1" />
                </button>

                <button
                  type="button"
                  className="emd-home-secondary-action group relative inline-flex min-h-14 items-center justify-center gap-3 overflow-hidden rounded-2xl border border-white/12 bg-black/24 px-6 font-black text-white/90 backdrop-blur-xl"
                  onClick={() => (window.location.href = "/turniere")}
                >
                  <Trophy className="h-5 w-5 text-white/60 transition-colors group-hover:text-orange-300" />
                  <span>Turniere entdecken</span>
                  <ArrowRight className="h-4 w-4 text-white/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-orange-300" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
              <div className="emd-home-stat-card group rounded-[22px] border border-white/10 bg-black/28 p-3.5 backdrop-blur-2xl sm:p-4 lg:p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-300/20 bg-orange-500/10 text-orange-300 sm:h-10 sm:w-10">
                  <Swords className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {leagueMatchCount}
                </div>
                <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/38 sm:text-[10px]">
                  Ligaspiele
                </div>
              </div>

              <div className="emd-home-stat-card group rounded-[22px] border border-white/10 bg-black/28 p-3.5 backdrop-blur-2xl sm:p-4 lg:p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-500/10 text-sky-300 sm:h-10 sm:w-10">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {todaysEventCount}
                </div>
                <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/38 sm:text-[10px]">
                  Heute
                </div>
              </div>

              <div className="emd-home-stat-card group rounded-[22px] border border-white/10 bg-black/28 p-3.5 backdrop-blur-2xl sm:p-4 lg:p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-300/20 bg-orange-500/10 text-orange-300 sm:h-10 sm:w-10">
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="mt-4 text-2xl font-black tracking-tight text-orange-200 sm:text-3xl">
                  {tournamentCount}
                </div>
                <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/38 sm:text-[10px]">
                  Turniere
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
