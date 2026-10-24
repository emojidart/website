"use client"

import { ArrowRight, Calendar, Swords, Trophy, Zap } from "lucide-react"

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
    <section className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 pt-5 sm:px-5 sm:pt-6 lg:px-8 xl:px-10">
      <div className="relative overflow-hidden rounded-[30px] border border-white/[0.12] bg-[#070b11]/90 shadow-[0_30px_90px_-55px_rgba(0,0,0,.95)]">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] opacity-75"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,7,2,.92)_0%,rgba(20,9,3,.78)_36%,rgba(3,11,22,.46)_67%,rgba(2,8,17,.55)_100%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(249,115,22,.20),transparent_34%),radial-gradient(circle_at_82%_72%,rgba(14,165,233,.18),transparent_31%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 min-h-[430px] p-6 sm:p-8 lg:min-h-[540px] lg:p-10 xl:p-12">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/25 bg-black/35 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/70 backdrop-blur-md">
              <span className="text-orange-300">✨</span>
              EMD VereinsApp
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-white/[0.10] bg-black/35 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/55 backdrop-blur-md sm:flex">
              <Zap className="h-3.5 w-3.5 text-orange-300" />
              Dein Verein. Deine App.
            </div>
          </div>

          <div className="mt-12 max-w-[780px] sm:mt-14 lg:mt-12">
            <div className="text-[11px] font-black uppercase tracking-[0.38em] text-orange-300/90 sm:text-xs">
              Emoj&apos;s Dartverein
            </div>

            <h1 className="mt-5 max-w-[760px] text-[clamp(3.2rem,7vw,6.9rem)] font-black uppercase leading-[0.88] tracking-[-0.07em] text-white">
              Alles.
              <br />
              Auf einen Blick<span className="text-orange-400">.</span>
            </h1>

            <div className="mt-6 h-px w-24 bg-orange-400/80" />

            <p className="mt-6 max-w-[620px] text-base font-bold leading-relaxed text-white/55 sm:text-lg">
              Spiele, Turniere, Termine und Vereinsleben – direkt dort, wo du sie brauchst.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => (window.location.href = "/member-availability")}
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-orange-300/30 bg-orange-600/75 px-6 font-black text-white shadow-[0_18px_45px_-26px_rgba(249,115,22,.95)] transition hover:bg-orange-500"
              >
                <Calendar className="h-5 w-5" />
                Meine Spiele
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => (window.location.href = "/turniere")}
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/[0.12] bg-black/35 px-6 font-black text-white/85 backdrop-blur-md transition hover:bg-white/[0.08]"
              >
                <Trophy className="h-5 w-5 text-white/65" />
                Turniere entdecken
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:absolute lg:bottom-10 lg:right-10 lg:mt-0 lg:w-[520px] xl:right-12 xl:w-[560px]">
            <div className="rounded-[22px] border border-orange-300/15 bg-[#0c0d12]/88 p-5 backdrop-blur-xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-300/20 bg-orange-500/10 text-orange-300">
                <Swords className="h-5 w-5" />
              </div>
              <div className="mt-4 text-3xl font-black text-white">{leagueMatchCount}</div>
              <div className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/35">
                Ligaspiele
              </div>
            </div>

            <div className="rounded-[22px] border border-sky-300/15 bg-[#071527]/88 p-5 backdrop-blur-xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-500/10 text-sky-300">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="mt-4 text-3xl font-black text-white">{todaysEventCount}</div>
              <div className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/35">
                Heute
              </div>
            </div>

            <div className="rounded-[22px] border border-orange-300/15 bg-[#120c0d]/88 p-5 backdrop-blur-xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-300/20 bg-orange-500/10 text-orange-300">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="mt-4 text-3xl font-black text-[#ffd5a8]">{tournamentCount}</div>
              <div className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/35">
                Turniere
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
