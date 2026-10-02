"use client"

export const dynamic = "force-dynamic"

import Link from "next/link"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  ShieldCheck,
  ArrowRight,
  UserPlus,
} from "lucide-react"

export default function LoginChoicePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white font-sans">
      <Header />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050608]">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.66),rgba(3,5,9,.93)_46%,rgba(2,4,7,.985))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.17),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_52%_84%,rgba(99,102,241,.08),transparent_24%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1680px] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 xl:px-8">
        <div className="mx-auto max-w-6xl">
          <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-black/35 p-5 text-center shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,.09),transparent_36%,rgba(14,165,233,.08))]" />
            <div className="relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
              <div className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">EMD VereinsApp</div>
              <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">Dein Zugang</h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-6 text-white/50 sm:text-base">
                Wähle den Bereich, der zu deinem Zugang passt.
              </p>
            </div>
          </section>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Link href="/member-login" className="group">
              <Card className="h-full overflow-hidden rounded-[28px] border border-orange-400/20 bg-black/35 shadow-[0_28px_90px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl transition duration-300 group-hover:-translate-y-1 group-hover:border-orange-400/40">
                <CardContent className="flex h-full flex-col p-6 sm:p-7">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-400/25 bg-orange-500/15">
                    <Users className="h-7 w-7 text-orange-100" />
                  </div>
                  <div className="mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-orange-200/60">Mitglieder</div>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">Member-Login</h2>
                  <p className="mt-3 flex-1 text-sm font-medium leading-6 text-white/45">
                    Für Vereinsmitglieder mit bestehendem persönlichen Zugang.
                  </p>
                  <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/80">
                    Zum Mitgliederbereich
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/guest-login" className="group">
              <Card className="h-full overflow-hidden rounded-[28px] border border-sky-300/20 bg-black/35 shadow-[0_28px_90px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl transition duration-300 group-hover:-translate-y-1 group-hover:border-sky-300/40">
                <CardContent className="flex h-full flex-col p-6 sm:p-7">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-300/25 bg-sky-500/15">
                    <ShieldCheck className="h-7 w-7 text-sky-100" />
                  </div>
                  <div className="mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-sky-200/60">Gäste</div>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">Gast-Login</h2>
                  <p className="mt-3 flex-1 text-sm font-medium leading-6 text-white/45">
                    Für freigeschaltete Gäste und Veranstalter der öffentlichen Turnierwelt.
                  </p>
                  <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/80">
                    Zum Gastbereich
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="mt-4 flex flex-col items-start justify-between gap-4 rounded-[24px] border border-white/10 bg-black/30 p-5 backdrop-blur-xl sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-black text-white">Noch keinen Gastzugang?</div>
              <div className="mt-1 text-sm text-white/40">Beantrage deinen Zugang für öffentliche Turniere und Gastfunktionen.</div>
            </div>
            <Link href="/gastzugang">
              <Button variant="outline" className="h-11 rounded-xl border-orange-400/25 bg-orange-500/10 font-black text-orange-100 hover:bg-orange-500/20 hover:text-white">
                <UserPlus className="mr-2 h-4 w-4" />
                Gastzugang beantragen
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
