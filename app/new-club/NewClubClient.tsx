"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import Link from "next/link"
import { ArrowRight, ShieldCheck, UserPlus, Users } from "lucide-react"
import { TeamGallery } from "@/components/team-gallery"
import { Button } from "@/components/ui/button"

export default function NewClubClient({ teamsWithPlayers }: { teamsWithPlayers: any[] }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f6f8] pb-24 text-slate-950 font-sans md:pb-0">
      <Header />

      <main className="w-full max-w-none px-2 pb-24 pt-14 sm:px-4 sm:pt-16 lg:px-5 xl:px-6 2xl:px-8">
        <section className="relative overflow-hidden rounded-[24px] border border-slate-800/10 bg-slate-950 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.62)] sm:rounded-[28px] xl:rounded-[30px]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-72 rounded-full bg-white/5 blur-3xl" />

          <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07]">
                    <Users className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/50">Vereinsbereich</p>
                    <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                      Vereinsübersicht
                    </h1>
                  </div>
                </div>

                <p className="mt-4 max-w-3xl text-sm font-medium leading-6 text-white/55 sm:text-base">
                  Lerne unsere Teams und Spieler kennen.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                <Users className="h-5 w-5 text-orange-400" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">Teams</div>
                  <div className="text-lg font-black text-white">{teamsWithPlayers.length}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 xl:hidden">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)] sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
                <UserPlus className="h-5 w-5 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-black tracking-tight text-slate-950">Interesse am Verein?</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Erstelle zuerst einen Gastzugang. Danach kannst du im Gastbereich eine Beitrittsanfrage an den Verein stellen.
                </p>
              </div>
            </div>

            <Button asChild className="mt-4 h-11 w-full rounded-xl bg-orange-500 font-black text-white hover:bg-orange-600">
              <Link href="/gastzugang">
                Gastzugang erstellen
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start xl:gap-5">
          <div className="rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)] sm:rounded-[28px]">
            <div className="border-b border-slate-100 p-4 sm:p-5">
              <div className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">Teams</div>
              <div className="mt-1 text-sm text-slate-500">{teamsWithPlayers.length} Team(s)</div>
            </div>

            <div className="p-3 sm:p-5">
              <TeamGallery teamsWithPlayers={teamsWithPlayers} />
            </div>
          </div>

          <aside className="hidden rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)] sm:p-5 xl:sticky xl:top-20 xl:block">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
              <UserPlus className="h-5 w-5 text-orange-600" />
            </div>

            <h2 className="mt-4 text-xl font-black tracking-tight text-slate-950">Interesse am Verein?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Erstelle zuerst einen Gastzugang. Danach kannst du im Gastbereich eine Beitrittsanfrage an den Verein stellen.
            </p>

            <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                <p className="text-xs font-medium leading-5 text-slate-600">
                  Der erste Schritt zu uns: Gastzugang erstellen und anschließend die Beitrittsanfrage senden.
                </p>
              </div>
            </div>

            <Button asChild className="mt-4 h-11 w-full rounded-xl bg-orange-500 font-black text-white hover:bg-orange-600">
              <Link href="/gastzugang">
                Gastzugang erstellen
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </aside>
        </section>
      </main>

      <MobileBottomNav />
    </div>
  )
}