"use client"

import { useMemo } from "react"
import { Fingerprint, Sparkles } from "lucide-react"
import TerminalLink from "./_components/TerminalLink"

const particles = [
  { left: "8%", top: "18%", delay: "0.3s", duration: "8s", size: 8 },
  { left: "16%", top: "70%", delay: "1.2s", duration: "9s", size: 5 },
  { left: "26%", top: "28%", delay: "0.8s", duration: "7s", size: 6 },
  { left: "37%", top: "78%", delay: "1.6s", duration: "10s", size: 4 },
  { left: "52%", top: "16%", delay: "1.3s", duration: "8s", size: 7 },
  { left: "61%", top: "62%", delay: "0.4s", duration: "11s", size: 6 },
  { left: "73%", top: "27%", delay: "2.2s", duration: "9s", size: 5 },
  { left: "84%", top: "76%", delay: "1.1s", duration: "8s", size: 7 },
  { left: "92%", top: "20%", delay: "2s", duration: "10s", size: 6 },
]

export default function TerminalPage() {
  const currentTime = useMemo(
    () => new Intl.DateTimeFormat("de-AT", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
    [],
  )

  const currentDate = useMemo(
    () => new Intl.DateTimeFormat("de-AT", { weekday: "long", day: "2-digit", month: "long" }).format(new Date()),
    [],
  )


  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#050608] text-white">
      <div
        className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,6,10,.78),rgba(4,6,10,.30)_43%,rgba(4,6,10,.60)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_70%,rgba(249,115,22,.18),transparent_28%),radial-gradient(circle_at_72%_60%,rgba(59,130,246,.18),transparent_28%),linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.16))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.75)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none absolute bottom-[-8%] left-[-10%] h-[42vh] w-[45vw] rounded-full bg-orange-500/14 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-8%] h-[42vh] w-[40vw] rounded-full bg-sky-500/12 blur-[130px]" />

      {particles.map((particle, index) => (
        <span
          key={index}
          className="pointer-events-none absolute rounded-full bg-white/90 blur-[1px] animate-particle-float"
          style={{
            left: particle.left,
            top: particle.top,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}

      <section className="relative z-10 min-h-[100svh] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[100svh] max-w-[1560px] flex-col justify-between py-6 lg:py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="animate-fade-up [animation-delay:.1s] [animation-fill-mode:both]">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-[11px] font-black uppercase tracking-[0.34em] text-white/75 backdrop-blur-xl">
                <Sparkles className="h-4 w-4 text-orange-300" /> EMD
              </div>
            </div>

            <div className="hidden rounded-[24px] border border-white/10 bg-black/25 px-5 py-4 text-right backdrop-blur-xl animate-fade-up [animation-delay:.25s] [animation-fill-mode:both] md:block">
              <div className="text-2xl font-black tracking-tight lg:text-3xl">{currentTime}</div>
              <div className="mt-1 text-sm font-semibold text-white/60">{currentDate}</div>
            </div>
          </div>

          <div className="flex flex-1 items-center">
            <div className="max-w-[700px] pb-10">
              <div className="animate-fade-up [animation-delay:.2s] [animation-fill-mode:both]">
                <div className="text-[11px] font-black uppercase tracking-[0.42em] text-orange-300/90">Touch Interface</div>
                <h1 className="mt-4 text-[clamp(3rem,6.2vw,5.8rem)] font-black uppercase leading-[0.92] tracking-[-0.07em] text-white drop-shadow-[0_0_30px_rgba(0,0,0,.35)]">
                  Club
                  <span className="block bg-gradient-to-r from-white via-orange-200 to-orange-400 bg-clip-text text-transparent">Terminal</span>
                </h1>
                <div className="mt-4 h-px w-28 bg-gradient-to-r from-orange-400 to-transparent" />
                <p className="mt-6 max-w-[540px] text-base font-semibold leading-7 text-white/62 sm:text-lg">Liga · Turniere · Mein EMD</p>
              </div>
            </div>
          </div>

          <div className="pb-8 sm:pb-10">
            <div className="mx-auto flex max-w-[560px] justify-center animate-fade-up [animation-delay:.45s] [animation-fill-mode:both]">
              <TerminalLink
                href="/terminal/menu"
                label="Club Terminal wird geöffnet"
                className="terminal-cta group relative flex w-full items-center justify-center gap-4 overflow-hidden rounded-full border border-white/14 bg-black/35 px-6 py-4 shadow-[0_0_60px_rgba(249,115,22,.08)] backdrop-blur-2xl transition duration-300 hover:scale-[1.02] sm:px-8 sm:py-5"
              >
                <span className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(90deg,rgba(249,115,22,.14),rgba(59,130,246,.12))]" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-orange-300/30 bg-orange-500/10 text-orange-300 shadow-[0_0_26px_rgba(249,115,22,.16)]">
                  <span className="absolute inset-0 rounded-full border border-orange-300/25 animate-ping opacity-60" />
                  <Fingerprint className="relative h-6 w-6 animate-pulse" />
                </span>
                <span className="relative text-center">
                  <span className="block text-[clamp(1.2rem,3vw,2rem)] font-black uppercase tracking-[-0.04em] text-white">Bildschirm berühren</span>
                  <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.34em] text-white/42 sm:text-[11px]">Tippen zum Start</span>
                </span>
                <span className="relative text-3xl font-black text-orange-400 transition duration-300 group-hover:translate-x-1">»</span>
              </TerminalLink>
            </div>

          </div>
        </div>
      </section>
    </main>
  )
}
