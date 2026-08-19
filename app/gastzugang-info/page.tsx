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
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24">
      <Header />

      <main className="pt-16 sm:pt-20">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-black text-orange-700 hover:text-orange-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Startseite
          </Link>

          <section className="mt-5 overflow-hidden rounded-3xl border border-orange-200 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 text-white shadow-xl">
            <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />

            <div className="p-6 sm:p-10">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-orange-200">
                  Jetzt auch für Gäste
                </div>

                <h1 className="mt-4 text-3xl sm:text-5xl font-black leading-tight">
                  Die EMD VereinsApp kostenlos kennenlernen
                </h1>

                <p className="mt-4 text-sm sm:text-base font-semibold leading-7 text-slate-200">
                  Auch ohne Vereinsmitgliedschaft kannst du einen kostenlosen Gastzugang beantragen
                  und ausgewählte Bereiche der EMD VereinsApp nutzen.
                </p>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button asChild className="h-12 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black">
                  <Link href="/gastzugang">
                    Kostenlos anmelden
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white font-black"
                >
                  <Link href="/guest-login">Bereits Gast? Zum Login</Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-4">
              <h2 className="text-2xl sm:text-3xl font-black">Das kannst du als Gast nutzen</h2>
              <p className="mt-1 text-sm font-semibold text-gray-600">
                Ein kompakter Überblick über die wichtigsten Gastfunktionen.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature) => {
                const Icon = feature.icon

                return (
                  <Card key={feature.title} className="rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-5">
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
            <Card className="rounded-3xl border border-orange-200 bg-white shadow-lg overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-2 text-orange-700 font-black">
                      <CheckCircle2 className="w-5 h-5" />
                      Kostenloser Gastzugang
                    </div>
                    <h2 className="mt-2 text-2xl font-black">Interesse?</h2>
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
