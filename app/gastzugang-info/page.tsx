"use client"

import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  ShoppingBag,
  Target,
  Trophy,
  UserRound,
  Users,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    title: "Eigenes Dartprofil",
    description: "Dein Gastprofil mit Spielername und deinen persönlichen Dart-Infos.",
    icon: UserRound,
  },
  {
    title: "Turniere entdecken",
    description: "Turniere und öffentliche Veranstaltungen in der App ansehen.",
    icon: Trophy,
  },
  {
    title: "Community",
    description: "Im Community-Bereich mit anderen Dartspielern verbunden bleiben.",
    icon: MessageCircle,
  },
  {
    title: "Dartbörse",
    description: "Dartartikel entdecken, anbieten und mit anderen Spielern Kontakt aufnehmen.",
    icon: ShoppingBag,
  },
  {
    title: "Spieler & Statistiken",
    description: "Dein Profil kann mit einem vorhandenen Spieler in der Spieldatenbank verknüpft werden.",
    icon: Target,
  },
  {
    title: "Kostenloser Gastzugang",
    description: "Der Gastzugang ist kostenlos und wird nach kurzer Prüfung freigeschaltet.",
    icon: Users,
  },
]

export default function GastzugangInfoPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f6f8] text-slate-950 pb-24 md:pb-0">
      <Header />

      <main className="pt-16 sm:pt-20">
        <div className="mx-auto w-full max-w-[1800px] px-2 py-4 sm:px-4 sm:py-5 lg:px-5 xl:px-6 2xl:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Startseite
          </Link>

          <section className="mt-4 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_22px_65px_-48px_rgba(15,23,42,0.65)]">
            <div className="relative bg-gradient-to-br from-slate-950 via-slate-950 to-[#2a170f] p-4 text-white sm:p-5 lg:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-3 py-1.5 text-xs font-black text-orange-950">
                    <Users className="h-3.5 w-3.5" />
                    Jetzt auch für Gäste
                  </div>

                  <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
                    Die EMD VereinsApp kostenlos kennenlernen
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-orange-100 sm:text-base">
                    Auch ohne Vereinsmitgliedschaft kannst du einen kostenlosen Gastzugang beantragen
                    und ausgewählte Bereiche der EMD VereinsApp nutzen.
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:min-w-[220px]">
                  <Button asChild className="h-11 rounded-xl bg-orange-600 text-white font-black hover:bg-orange-700">
                    <Link href="/gastzugang">
                      Kostenlos anmelden
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="h-11 rounded-xl border-white/25 bg-white/10 text-white font-black hover:bg-white/15 hover:text-white"
                  >
                    <Link href="/guest-login">Bereits Gast? Zum Login</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-black">Das kannst du als Gast nutzen</h2>
              <p className="mt-1 text-sm font-semibold text-gray-600">
                Ein kompakter Überblick über die wichtigsten Gastfunktionen.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature) => {
                const Icon = feature.icon

                return (
                  <Card key={feature.title} className="rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
                    <CardContent className="p-4 sm:p-5">
                      <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-orange-700" />
                      </div>

                      <h3 className="mt-4 text-lg font-black">{feature.title}</h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>

          <section className="mt-6">
            <Card className="rounded-[22px] border border-orange-200 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />
              <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-2 text-orange-700 font-black">
                      <CheckCircle2 className="w-5 h-5" />
                      Kostenloser Gastzugang
                    </div>
                    <h2 className="mt-2 text-xl sm:text-2xl font-black">Interesse?</h2>
                    <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-600">
                      Antrag ausfüllen, Freischaltung abwarten und anschließend mit deinem Gastkonto anmelden.
                    </p>
                  </div>

                  <Button asChild className="h-12 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black">
                    <Link href="/gastzugang">
                      Kostenlos anmelden
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
