"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

type Player = {
  id: string
  number: string
  name: string
  image: string
  role: string
  nickname?: string
  accent?: "gold" | "red" | "blue"
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function TeamRosterCard({
  player,
  active,
}: {
  player: Player
  active: boolean
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border px-4 py-4 transition-all duration-500",
        active
          ? "border-amber-300/45 bg-white/12 shadow-[0_0_40px_rgba(252,211,77,0.12)] scale-[1.02]"
          : "border-white/10 bg-white/5 opacity-80"
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04),transparent_65%)]" />

      <div className="relative z-10 flex items-center gap-4">
        <div className="relative h-20 w-16 overflow-hidden rounded-2xl bg-white/5">
          <Image
            src={player.image}
            alt={player.name}
            fill
            unoptimized
            className="object-contain object-bottom"
          />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/38">
            #{player.number} • {player.role}
          </p>
          <h3 className="mt-1 text-sm font-black uppercase tracking-[0.04em] text-white md:text-base">
            {player.name}
          </h3>
          {player.nickname ? (
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">
              {player.nickname}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function BottomBroadcastBar({
  player,
  phase,
}: {
  player: Player
  phase: "intro" | "walk" | "impact" | "ready"
}) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-black/45 backdrop-blur-xl">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06),transparent_55%)]" />
      <div className="relative z-10 flex flex-col gap-4 px-5 py-4 md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/42">
            Dart Team Presentation
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.05em] text-white md:text-4xl">
            {player.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-white/80">
              #{player.number}
            </span>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-amber-200">
              {player.role}
            </span>
            {player.nickname ? (
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-white/70">
                {player.nickname}
              </span>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">
            Sequence
          </p>
          <p className="mt-1 text-sm font-bold uppercase text-white">
            {phase === "intro"
              ? "Hero Reveal"
              : phase === "walk"
              ? "Walk To Oche"
              : phase === "impact"
              ? "Stage Impact"
              : "Ready"}
          </p>
        </div>
      </div>
    </div>
  )
}

function HeroPlayer({
  player,
  phase,
}: {
  player: Player
  phase: "intro" | "walk" | "impact" | "ready"
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[116px] z-30 flex justify-center">
      <div
        className={cn(
          "relative h-[520px] w-[320px] md:h-[700px] md:w-[430px]",
          phase === "intro" &&
            "animate-[playerHeroIn_1.2s_cubic-bezier(0.22,1,0.36,1)_forwards]",
          phase === "ready" &&
            "animate-[playerFloat_4.8s_ease-in-out_infinite]"
        )}
      >
        {phase !== "intro" && (
          <div className="absolute inset-0 animate-[playerSweep_1.2s_ease_forwards] bg-[linear-gradient(110deg,transparent_0%,transparent_38%,rgba(255,255,255,0.18)_50%,transparent_60%,transparent_100%)]" />
        )}

        <Image
          src={player.image}
          alt={player.name}
          fill
          priority
          unoptimized
          sizes="(max-width: 768px) 320px, 430px"
          className="object-contain object-bottom drop-shadow-[0_24px_44px_rgba(0,0,0,0.65)]"
        />

        <div className="absolute bottom-10 left-1/2 h-16 w-[72%] -translate-x-1/2 rounded-full bg-black/45 blur-2xl md:bottom-12 md:h-20" />
      </div>
    </div>
  )
}

export default function DartTeamIntroPage() {
  const players = useMemo<Player[]>(
    () => [
      {
        id: "bernhard",
        number: "1",
        name: "Bernhard Gastberger",
        image: "/lineup/players/bernhard.png",
        role: "Captain",
        nickname: "Team Leader",
        accent: "gold",
      },
      {
        id: "tolga",
        number: "2",
        name: "Tolga",
        image: "/lineup/players/tolga.png",
        role: "Player",
        nickname: "Challenger",
        accent: "red",
      },
      {
        id: "jimmy",
        number: "3",
        name: "Jimmy",
        image: "/lineup/players/jimmy.png",
        role: "Player",
        nickname: "Finisher",
        accent: "blue",
      },
      {
        id: "orhan",
        number: "4",
        name: "Orhan",
        image: "/lineup/players/orhan.png",
        role: "Player",
        nickname: "Closer",
        accent: "gold",
      },
    ],
    []
  )

  const [activeIndex, setActiveIndex] = useState(0)
  const [phase, setPhase] = useState<"intro" | "walk" | "impact" | "ready">(
    "intro"
  )

  useEffect(() => {
    setPhase("intro")

    const walkTimer = setTimeout(() => setPhase("walk"), 1100)
    const impactTimer = setTimeout(() => setPhase("impact"), 2200)
    const readyTimer = setTimeout(() => setPhase("ready"), 3400)

    const nextTimer = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % players.length)
    }, 6200)

    return () => {
      clearTimeout(walkTimer)
      clearTimeout(impactTimer)
      clearTimeout(readyTimer)
      clearTimeout(nextTimer)
    }
  }, [activeIndex, players.length])

  const activePlayer = players[activeIndex]
  const nextPlayer = players[(activeIndex + 1) % players.length]

  return (
    <main className="min-h-screen overflow-hidden bg-[#04070c] text-white">
      <section className="px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto max-w-[1650px] overflow-hidden rounded-[34px] border border-white/10 bg-[#060b12] shadow-[0_35px_120px_rgba(0,0,0,0.55)]">
          <div className="relative min-h-screen">
            <div className="absolute inset-0">
              <Image
                src="/lineup/backgrounds/arena.jpg"
                alt="Dart Arena"
                fill
                priority
                unoptimized
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,12,0.38),rgba(2,6,12,0.6)),radial-gradient(circle_at_center,transparent_18%,rgba(2,6,12,0.5)_78%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_20%_18%,rgba(252,211,77,0.08),transparent_18%),radial-gradient(circle_at_80%_12%,rgba(239,68,68,0.08),transparent_16%)]" />
            </div>

            <div className="pointer-events-none absolute inset-0 z-10">
              <div className="absolute left-1/2 top-[-120px] h-[340px] w-[340px] -translate-x-1/2 rounded-full border border-red-500/15 md:h-[470px] md:w-[470px]" />
              <div className="absolute left-1/2 top-[-76px] h-[250px] w-[250px] -translate-x-1/2 rounded-full border border-green-400/14 md:h-[360px] md:w-[360px]" />
              <div className="absolute left-1/2 top-[-20px] h-[160px] w-[160px] -translate-x-1/2 rounded-full border border-amber-300/20 md:h-[230px] md:w-[230px]" />

              <div className="absolute left-1/2 top-[40px] h-[240px] w-px -translate-x-1/2 bg-white/8 md:h-[320px]" />
              <div className="absolute left-1/2 top-[160px] h-px w-[220px] -translate-x-1/2 bg-white/8 md:top-[210px] md:w-[320px]" />

              {phase !== "intro" && (
                <>
                  <div className="absolute left-1/2 top-[-140px] h-[410px] w-[410px] -translate-x-1/2 rounded-full border border-white/10 opacity-0 animate-[boardPulse_1.2s_ease-out_forwards] md:h-[560px] md:w-[560px]" />
                  <div className="absolute left-1/2 top-[-118px] h-[360px] w-[360px] -translate-x-1/2 rounded-full border border-amber-300/18 opacity-0 animate-[boardPulse_1.35s_ease-out_forwards] md:h-[500px] md:w-[500px]" />
                </>
              )}
            </div>

            <div className="relative z-30 border-b border-white/10 bg-black/22 backdrop-blur-xl">
              <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-8 md:py-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[18px] border border-white/12 bg-white text-lg font-black text-black shadow-[0_10px_30px_rgba(255,255,255,0.15)] md:h-20 md:w-20 md:text-xl">
                    DT
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/48">
                      Elite Team Walk-On
                    </p>
                    <h1 className="text-2xl font-black uppercase tracking-[0.05em] md:text-4xl">
                      Dart Team Intro
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-md">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/36">
                      Active
                    </p>
                    <p className="mt-1 text-sm font-black uppercase text-white">
                      {activePlayer.name}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-md">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/36">
                      Next
                    </p>
                    <p className="mt-1 text-sm font-black uppercase text-white">
                      {nextPlayer.name}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-20 grid min-h-[calc(100vh-100px)] grid-cols-1 gap-8 px-5 py-5 md:px-8 md:py-8 xl:grid-cols-[1.22fr_0.78fr]">
              <div className="relative min-h-[760px] overflow-hidden rounded-[32px] border border-white/10 bg-black/18">
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(3,8,14,0.78),rgba(3,8,14,0.18)_45%,rgba(3,8,14,0.25))]" />

                <div className="pointer-events-none absolute left-1/2 top-[70px] z-20 h-[440px] w-[140px] -translate-x-1/2 bg-gradient-to-b from-white/20 via-amber-300/10 to-transparent blur-3xl md:h-[560px] md:w-[220px]" />

                {phase !== "intro" && (
                  <>
                    <div className="pointer-events-none absolute bottom-[176px] left-1/2 z-20 h-[18px] w-[360px] -translate-x-1/2 rounded-full bg-amber-300/18 blur-2xl animate-[ocheGlow_1s_ease-out_forwards]" />
                    <div className="pointer-events-none absolute bottom-[182px] left-1/2 z-30 h-[4px] w-[320px] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_32px_rgba(252,211,77,0.8)] animate-[ocheLineIn_0.9s_cubic-bezier(0.22,1,0.36,1)_forwards]" />
                  </>
                )}

                <div className="pointer-events-none absolute bottom-[136px] left-1/2 z-30 -translate-x-1/2 rounded-full border border-amber-300/25 bg-black/35 px-5 py-2 text-xs font-black uppercase tracking-[0.42em] text-amber-200 shadow-[0_0_20px_rgba(252,211,77,0.2)]">
                  Oche
                </div>

                {phase !== "intro" && (
                  <>
                    <div className="pointer-events-none absolute bottom-[184px] left-1/2 z-20 h-[360px] w-[10px] -translate-x-1/2 overflow-hidden rounded-full bg-white/5 md:h-[430px]">
                      <div className="h-full w-full animate-[beamGrow_1s_cubic-bezier(0.22,1,0.36,1)_forwards] bg-gradient-to-t from-amber-300 via-white to-transparent shadow-[0_0_44px_rgba(252,211,77,0.9)]" />
                    </div>

                    <div className="pointer-events-none absolute bottom-[184px] left-1/2 z-20 h-[370px] w-[120px] -translate-x-1/2 bg-gradient-to-t from-amber-300/18 via-white/12 to-transparent blur-3xl animate-[beamAura_1.2s_ease-out_forwards] md:h-[450px] md:w-[160px]" />
                  </>
                )}

                {phase === "impact" || phase === "ready" ? (
                  <>
                    <div className="pointer-events-none absolute bottom-[182px] left-1/2 z-10 h-[1px] w-[62%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/18 to-transparent" />
                    <div className="pointer-events-none absolute bottom-[182px] left-1/2 z-10 h-28 w-[48%] -translate-x-1/2 bg-gradient-to-t from-amber-300/12 to-transparent blur-3xl animate-[floorLight_1.15s_ease-out_forwards]" />
                  </>
                ) : null}

                <HeroPlayer player={activePlayer} phase={phase} />

                <div className="absolute bottom-5 left-5 right-5 z-40">
                  <BottomBroadcastBar player={activePlayer} phase={phase} />
                </div>
              </div>

              <div className="relative">
                <div className="overflow-hidden rounded-[32px] border border-white/10 bg-black/28 backdrop-blur-xl">
                  <div className="border-b border-white/10 px-5 py-5 md:px-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
                      Squad Overview
                    </p>
                    <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.05em] text-white md:text-3xl">
                      Dart Team
                    </h2>
                  </div>

                  <div className="space-y-4 p-5 md:p-6">
                    {players.map((player, index) => (
                      <TeamRosterCard
                        key={player.id}
                        player={player}
                        active={index === activeIndex}
                      />
                    ))}

                    <div className="mt-6 rounded-[26px] border border-white/10 bg-white/5 p-4">
                      <p className="text-[10px] uppercase tracking-[0.26em] text-white/38">
                        Stage Note
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/75">
                        Spieler steht frei vor der Arena, die Oche liegt sichtbar
                        auf dem Boden und der Lichtstrahl läuft separat über die
                        Bühne. Genau so wirkt es wie ein echtes Walk-on Intro und
                        nicht wie eine Card vor einem Hintergrund.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes playerHeroIn {
          0% {
            opacity: 0;
            transform: translateY(80px) scale(0.86);
            filter: blur(10px);
          }
          60% {
            opacity: 1;
            transform: translateY(-6px) scale(1.03);
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes beamGrow {
          0% {
            transform: translateY(100%);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes beamAura {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(18px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes ocheLineIn {
          0% {
            opacity: 0;
            transform: translateX(-50%) scaleX(0.18);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) scaleX(1);
          }
        }

        @keyframes ocheGlow {
          0% {
            opacity: 0;
            transform: translateX(-50%) scale(0.65);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
        }

        @keyframes boardPulse {
          0% {
            opacity: 0;
            transform: translateX(-50%) scale(0.92);
            filter: blur(3px);
          }
          60% {
            opacity: 1;
            transform: translateX(-50%) scale(1.03);
            filter: blur(0);
          }
          100% {
            opacity: 0.55;
            transform: translateX(-50%) scale(1);
            filter: blur(0);
          }
        }

        @keyframes floorLight {
          0% {
            opacity: 0;
            transform: translateX(-50%) scaleX(0.4);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) scaleX(1);
          }
        }

        @keyframes playerFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes playerSweep {
          0% {
            opacity: 0;
            transform: translateX(-70%);
          }
          100% {
            opacity: 1;
            transform: translateX(95%);
          }
        }
      `}</style>
    </main>
  )
}