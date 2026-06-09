"use client"

import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Gift,
  Medal,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

const prizeCategories = [
  {
    title: "Bronze",
    points: "ab 500 Punkte",
    image: "/praemien/bronze.png",
    text: "Flights, Shafts, kleine Darttaschen und Vereins-Merch.",
    icon: Medal,
  },
  {
    title: "Silber",
    points: "ab 1.000 Punkte",
    image: "/praemien/silber.png",
    text: "Profi-Darts, Dartboard-Zubehör, Schutzring und Dartmatte.",
    icon: Award,
  },
  {
    title: "Gold",
    points: "ab 1.500 Punkte",
    image: "/praemien/gold.png",
    text: "Elektronische Dartscheibe, Gadgets und hochwertige Sachpreise.",
    icon: Trophy,
  },
]

export default function PraemienPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#02070b",
        color: "#ffffff",
      }}
    >
      <Header />

      <div className="h-12 sm:h-14" />

      <section
        className="relative overflow-hidden border-b border-white/10"
        style={{
          background: "#02070b",
          color: "#ffffff",
        }}
      >
        <div className="absolute inset-0">
          <Image
            src="/images/praemien/hero.jpg"
            alt="EMD Prämien"
            fill
            priority
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#02070b] via-[#02070b]/95 to-[#02070b]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#02070b] via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-red-300">
              <Sparkles className="h-4 w-4" />
              EMD Verein Dart
            </div>

            <h1 className="text-5xl font-black uppercase leading-none tracking-tight text-white sm:text-6xl lg:text-7xl">
              Punkte sammeln.
              <span className="mt-2 block text-red-500">Prämien sichern.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base text-zinc-300 sm:text-lg">
              Sammle Bonuspunkte bei Turnieren, Training und Vereinsaktivitäten
              und löse sie gegen exklusive EMD Sachpreise ein.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/punkte-sammeln"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-red-950/40 transition hover:bg-red-500"
              >
                Jetzt Punkte sammeln
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/rangliste"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-white/10"
              >
                Rangliste ansehen
              </Link>
            </div>
          </div>

          <div
            className="mt-12 rounded-3xl border border-white/10 p-5 shadow-2xl backdrop-blur-xl lg:p-6"
            style={{ background: "rgba(8, 16, 24, 0.96)" }}
          >
            <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10">
                  <Target className="h-9 w-9 text-red-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                    Beispiel Level
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">1.250 Punkte</p>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[80%] rounded-full bg-red-600" />
                  </div>

                  <p className="mt-2 text-xs text-zinc-400">
                    Noch 250 Punkte bis Level 4
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 border-white/10 lg:border-l lg:pl-8">
                <Target className="h-7 w-7 text-zinc-300" />
                <span className="text-sm font-semibold text-zinc-200">
                  Bonuspunkte sammeln
                </span>
              </div>

              <div className="flex items-center gap-3 border-white/10 lg:border-l lg:pl-8">
                <Gift className="h-7 w-7 text-zinc-300" />
                <span className="text-sm font-semibold text-zinc-200">
                  Prämien auswählen
                </span>
              </div>

              <div className="flex items-center gap-3 border-white/10 lg:border-l lg:pl-8">
                <Trophy className="h-7 w-7 text-zinc-300" />
                <span className="text-sm font-semibold text-zinc-200">
                  Erfolge erleben
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
        style={{ background: "#02070b", color: "#ffffff" }}
      >
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
              Sachpreise
            </p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-wide text-white">
              Prämienkategorien
            </h2>
          </div>

          <Link
            href="/praemien"
            className="hidden items-center gap-2 text-sm font-black uppercase text-red-400 hover:text-red-300 sm:flex"
          >
            Alle ansehen
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {prizeCategories.map((item) => {
            const Icon = item.icon

            return (
              <div
                key={item.title}
                className="group overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition hover:-translate-y-1 hover:border-red-500/40"
                style={{ background: "#081018" }}
              >
                <div className="relative h-64 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                  <div className="absolute left-5 top-5 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-black/45 backdrop-blur-md">
                      <Icon className="h-7 w-7 text-white" />
                    </div>

                    <div>
                      <h3 className="text-xl font-black uppercase tracking-wide text-white">
                        {item.title}
                      </h3>
                      <p className="text-sm font-bold uppercase text-zinc-300">
                        {item.points}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <p className="min-h-[52px] text-lg font-medium text-zinc-200">
                    {item.text}
                  </p>

                  <Link
                    href="/praemien"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-red-400 transition hover:text-red-300"
                  >
                    Prämien entdecken
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        style={{ background: "#02070b", color: "#ffffff" }}
      >
        <h2 className="mb-8 text-3xl font-black uppercase tracking-wide text-white">
          So funktioniert’s
        </h2>

        <div className="grid gap-5 lg:grid-cols-3">
          {[
            {
              nr: "01",
              title: "Punkte sammeln",
              icon: Target,
              text: "Durch Turniere, Training, Vereinsleben und besondere Aktionen sammelst du Bonuspunkte.",
            },
            {
              nr: "02",
              title: "Prämien wählen",
              icon: Gift,
              text: "Je nach Punktestand kannst du hochwertige Sachpreise auswählen.",
            },
            {
              nr: "03",
              title: "Erfolge erleben",
              icon: Trophy,
              text: "Steige im Level auf und sichere dir immer bessere Prämien.",
            },
          ].map((item) => {
            const Icon = item.icon

            return (
              <div
                key={item.nr}
                className="rounded-3xl border border-white/10 p-6"
                style={{ background: "#081018" }}
              >
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600/15">
                  <Icon className="h-9 w-9 text-red-400" />
                </div>

                <p className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">
                  {item.nr}
                </p>

                <h3 className="mt-2 text-xl font-black uppercase text-white">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  {item.text}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-4 py-10 pb-28 sm:px-6 lg:px-8"
        style={{ background: "#02070b", color: "#ffffff" }}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="group relative h-72 overflow-hidden rounded-3xl border border-white/10 bg-[#081018]">
            <Image
              src="/images/praemien/wettkampf.jpg"
              alt="Wettkämpfe"
              fill
              className="object-cover opacity-75 transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

            <div className="absolute bottom-0 left-0 p-6">
              <h3 className="text-2xl font-black uppercase text-white">Wettkämpfe</h3>
              <p className="mt-2 max-w-sm text-sm text-zinc-300">
                Zeig dein Können und sammle wertvolle Punkte.
              </p>
              <Link
                href="/turniere"
                className="mt-4 inline-flex items-center gap-2 text-sm font-black uppercase text-red-400"
              >
                Mehr erfahren
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="group relative h-72 overflow-hidden rounded-3xl border border-white/10 bg-[#081018]">
            <Image
              src="/images/praemien/verein.jpg"
              alt="Vereinsleben"
              fill
              className="object-cover opacity-75 transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

            <div className="absolute bottom-0 left-0 p-6">
              <h3 className="text-2xl font-black uppercase text-white">Vereinsleben</h3>
              <p className="mt-2 max-w-sm text-sm text-zinc-300">
                Engagement wird belohnt – sei aktiv im Verein.
              </p>
              <Link
                href="/verein"
                className="mt-4 inline-flex items-center gap-2 text-sm font-black uppercase text-red-400"
              >
                Mehr erfahren
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div
          className="mt-6 grid gap-4 rounded-3xl border border-white/10 p-5 lg:grid-cols-4"
          style={{ background: "#081018" }}
        >
          <div className="flex items-start gap-3">
            <Users className="mt-1 h-6 w-6 text-zinc-300" />
            <div>
              <h4 className="font-black uppercase text-sm text-white">Für Mitglieder</h4>
              <p className="mt-1 text-xs text-zinc-400">
                Exklusive Prämien nur für Vereinsmitglieder.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-6 w-6 text-zinc-300" />
            <div>
              <h4 className="font-black uppercase text-sm text-white">Transparent</h4>
              <p className="mt-1 text-xs text-zinc-400">
                Punkte sind nachvollziehbar und klar definiert.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Star className="mt-1 h-6 w-6 text-zinc-300" />
            <div>
              <h4 className="font-black uppercase text-sm text-white">Mehr Aktivität</h4>
              <p className="mt-1 text-xs text-zinc-400">
                Mehr Teilnahme bedeutet mehr Chancen.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-6 w-6 text-zinc-300" />
            <div>
              <h4 className="font-black uppercase text-sm text-white">Support</h4>
              <p className="mt-1 text-xs text-zinc-400">
                Bei Fragen helfen wir direkt weiter.
              </p>
            </div>
          </div>
        </div>
      </section>

      <MobileBottomNav />
    </div>
  )
}