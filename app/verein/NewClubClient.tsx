"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import Link from "next/link"
import { ArrowRight, ShieldCheck, UserPlus, Users, Sparkles, Trophy } from "lucide-react"
import { TeamGallery } from "@/components/team-gallery"
import { Button } from "@/components/ui/button"

export default function NewClubClient({ teamsWithPlayers }: { teamsWithPlayers: any[] }) {
  const totalPlayers = teamsWithPlayers.reduce(
    (sum, team) => sum + (Array.isArray(team?.players) ? team.players.length : 0),
    0,
  )

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white font-sans">
      <Header />

      {/* gleicher Hintergrund wie Mitgliederprofil */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.68),rgba(3,5,9,.93)_46%,rgba(2,4,7,.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.18),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_55%_82%,rgba(99,102,241,.09),transparent_24%)]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:68px_68px]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1680px] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-black/35 shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:rounded-[34px]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,.08),transparent_34%,rgba(14,165,233,.06)_78%,transparent)]" />
          <div className="pointer-events-none absolute -left-20 top-[-120px] h-80 w-80 rounded-full bg-orange-500/15 blur-[110px]" />
          <div className="pointer-events-none absolute -right-24 bottom-[-140px] h-96 w-96 rounded-full bg-sky-500/12 blur-[120px]" />

          <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
            <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/55 backdrop-blur-xl">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-400" />
                  </span>
                  EMD Vereinsbereich
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.055] shadow-[0_16px_50px_rgba(0,0,0,.45)] sm:h-24 sm:w-24">
                    <Users className="h-9 w-9 text-orange-300 sm:h-11 sm:w-11" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">Emoj!´s Dartverein</p>
                    <h1 className="mt-1 text-[clamp(1.8rem,5vw,3.4rem)] font-black leading-none tracking-[-0.055em] text-white">
                      Unsere Teams
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/50 sm:text-base">
                      Teams, Spieler und Rollen kompakt auf einen Blick.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:max-w-[620px] xl:justify-end">
                <div className="min-w-[150px] rounded-[20px] border border-white/[0.08] bg-white/[0.045] px-4 py-3 backdrop-blur-xl">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Teams</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-400" />
                    <span className="text-xl font-black text-white">{teamsWithPlayers.length}</span>
                  </div>
                </div>

                <div className="min-w-[150px] rounded-[20px] border border-white/[0.08] bg-white/[0.045] px-4 py-3 backdrop-blur-xl">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Spieler</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-sky-300" />
                    <span className="text-xl font-black text-white">{totalPlayers}</span>
                  </div>
                </div>

                <Button
                  asChild
                  variant="outline"
                  className="col-span-2 h-11 rounded-2xl border-white/10 bg-white/[0.045] px-4 text-white hover:bg-white/[0.09] hover:text-white sm:col-auto"
                >
                  <Link href="/gastzugang">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Gastzugang
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Teams */}
        <section className="mt-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-300/80">
                <Sparkles className="h-3.5 w-3.5" />
                Mannschaften
              </div>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">
                Vereinsübersicht
              </h2>
              <p className="mt-1 text-sm font-semibold text-white/45">
                Wähle ein Team, um Kader und Spielerdetails zu öffnen.
              </p>
            </div>

            <div className="hidden items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-3 text-xs font-semibold text-white/45 backdrop-blur-xl sm:flex">
              <ShieldCheck className="h-4 w-4 text-orange-300" />
              Vereinsbereich
            </div>
          </div>

          <TeamGallery teamsWithPlayers={teamsWithPlayers} />
        </section>

        {/* Beitritt – nicht mehr als riesige Seitenleiste */}
        <section className="mt-5 overflow-hidden rounded-[26px] border border-white/[0.08] bg-black/25 shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl">
          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.08]">
                <UserPlus className="h-5 w-5 text-orange-300" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white sm:text-xl">Interesse am Verein?</h3>
                <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-white/50">
                  Erstelle zuerst einen Gastzugang. Danach kannst du im Gastbereich deine Beitrittsanfrage senden.
                </p>
              </div>
            </div>

            <Button asChild className="h-11 rounded-2xl border border-orange-400/30 bg-orange-500 px-5 font-black text-white shadow-[0_0_30px_rgba(249,115,22,.14)] hover:bg-orange-400">
              <Link href="/gastzugang">
                Gastzugang erstellen
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <MobileBottomNav />
    </div>
  )
}
