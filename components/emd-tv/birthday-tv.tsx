"use client"

import { Cake, Sparkles } from "lucide-react"

type BirthdayPlayer = {
  id: string
  name: string
  photoUrl: string | null
}

export default function BirthdayTv({ player }: { player: BirthdayPlayer }) {
  return (
    <section className="absolute inset-0 overflow-hidden bg-[#030303] text-white">
      <div className="absolute inset-0 bg-[url('/terminal/hero-startscreen.png')] bg-cover bg-center opacity-[.26]" />
      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(0,0,0,.98)_0%,rgba(7,5,3,.90)_44%,rgba(21,10,2,.78)_100%)]" />
      <div className="absolute -left-[10vw] top-[8vh] h-[42vw] w-[42vw] rounded-full bg-orange-500/[.11] blur-[8vw]" />
      <div className="absolute right-[-8vw] top-[2vh] h-[36vw] w-[36vw] rounded-full bg-amber-300/[.07] blur-[8vw]" />

      <div className="absolute inset-0 flex items-center px-[5vw] py-[5vh]">
        <div className="grid w-full grid-cols-[42%_58%] items-center gap-[4vw]">
          <div className="relative mx-auto h-[68vh] w-full max-w-[34vw] overflow-hidden rounded-[2.4vw] border border-white/[.10] bg-black/35 shadow-[0_35px_110px_rgba(0,0,0,.58)]">
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt=""
                loading="eager"
                decoding="sync"
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_28%,rgba(249,115,22,.18),transparent_32%),linear-gradient(180deg,#111317,#050607)]">
                <div className="relative h-[56%] w-[48%]">
                  <div className="absolute left-1/2 top-[8%] h-[28%] w-[42%] -translate-x-1/2 rounded-full bg-white/[.12]" />
                  <div className="absolute bottom-[5%] left-1/2 h-[58%] w-[82%] -translate-x-1/2 rounded-t-[48%] bg-white/[.10]" />
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_58%,rgba(0,0,0,.72)_100%)]" />
          </div>

          <div className="pr-[3vw]">
            <div className="flex items-center gap-3 text-[clamp(.72rem,.95vw,1rem)] font-black uppercase tracking-[.36em] text-orange-300/80">
              <Cake className="h-[1.25em] w-[1.25em]" />
              Heute feiern wir
            </div>
            <div className="mt-[1.8vh] text-[clamp(3.6rem,7vw,8.2rem)] font-black uppercase leading-[.86] tracking-[-.075em]">
              Happy <span className="text-orange-400">Birthday</span>
            </div>
            <div className="mt-[3.2vh] max-w-[44vw] text-[clamp(2rem,3.7vw,4.6rem)] font-black uppercase leading-[.94] tracking-[-.055em]">
              {player.name}
            </div>
            <div className="mt-[3.1vh] h-[4px] w-[10vw] bg-orange-400 shadow-[0_0_28px_rgba(251,146,60,.55)]" />
            <div className="mt-[2.4vh] flex items-center gap-3 text-[clamp(.9rem,1.35vw,1.45rem)] font-bold text-white/58">
              <Sparkles className="h-[1.15em] w-[1.15em] text-orange-300/70" />
              Alles Gute zum Geburtstag wünscht dir dein EMD-Team
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
