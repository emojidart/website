// app/members-champion-cup/einstufungen/page.tsx

"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { motion } from "framer-motion"
import Image from "next/image"
import {
  ArrowLeft,
  Crown,
  Trophy,
  BarChart3,
  Shield,
  Star,
  Target,
  Users,
} from "lucide-react"
import Link from "next/link"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 110,
      damping: 14,
    },
  },
}

const tabelle1Players = [
  { platz: 1, name: "Tomas B.", punkte: "41,52" },
  { platz: 2, name: "Huber L.", punkte: "33,57" },
  { platz: 3, name: "Christoph St.", punkte: "32,25" },
  { platz: 4, name: "Florian L.", punkte: "30,58" },
  { platz: 5, name: "Orhan A.", punkte: "30,41" },
  { platz: 6, name: "Roland Schw.", punkte: "28,82" },
  { platz: 7, name: "Peter M.", punkte: "26,08" },
  { platz: 8, name: "Rene St.", punkte: "24,86" },
  { platz: 9, name: "Roland R.", punkte: "24,59" },
  { platz: 10, name: "Patrik W.", punkte: "24,58" },
  { platz: 11, name: "Tolga E.", punkte: "23,19" },
  { platz: 12, name: "Karl K.", punkte: "23,05" },
  { platz: 13, name: "Andreas T.", punkte: "22,50" },
]

const tabelle2Players = [
  { platz: 14, name: "Jimmy W.", punkte: "21,47" },
  { platz: 15, name: "Ramona R.", punkte: "21,00" },
  { platz: 16, name: "Bernhard G.", punkte: "20,55" },
  { platz: 17, name: "Michael G.", punkte: "20,00" },
  { platz: 18, name: "Hasan C.", punkte: "19,94" },
  { platz: 19, name: "Christoph K.", punkte: "19,16" },
  { platz: 20, name: "Tina U.", punkte: "18,74" },
  { platz: 21, name: "Rene J.", punkte: "18,66" },
  { platz: 22, name: "Dominique H.", punkte: "18,42" },
  { platz: 23, name: "Medine K.", punkte: "18,38" },
  { platz: 24, name: "Christian M.", punkte: "18,25" },
  { platz: 25, name: "Tanju E.", punkte: "15,04" },
  { platz: 26, name: "Manfred E.", punkte: "14,85" },
  { platz: 27, name: "Michael Schl.", punkte: "14,70" },
]

const tabelle3Players = [
  { platz: 28, name: "Wolfgang E.", punkte: "13,66" },
  { platz: 29, name: "Andrea G.", punkte: "12,74" },
  { platz: 30, name: "Tamara R.", punkte: "12,29" },
  { platz: 31, name: "Stefan N.", punkte: "10,71" },
  { platz: 32, name: "Mike Th.", punkte: "8,67" },
  { platz: 33, name: "Julia R.", punkte: "6,40" },
  { platz: 34, name: "Ulrike F.", punkte: "5,50" },
  { platz: 35, name: "Petra B.", punkte: "4,85" },
  { platz: 36, name: "Angela Schm.", punkte: "4,20" },
  { platz: 37, name: "Sibel N.", punkte: "0,00" },
  { platz: 38, name: "Nicole R.", punkte: "0,00" },
  { platz: 39, name: "Sabina S.", punkte: "0,00" },
  { platz: 40, name: "Thomas R.", punkte: "0,00" },
]

function TierCard({
  title,
  subtitle,
  accent,
  iconBg,
  players,
}: {
  title: string
  subtitle: string
  accent: string
  iconBg: string
  players: {
    platz: number
    name: string
    punkte: string
  }[]
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="relative overflow-hidden rounded-[30px] border border-orange-100 bg-white shadow-xl"
    >
      <div className={`h-2 w-full ${accent}`} />

      <div className="relative p-4 sm:p-5">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-200 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-orange-700">
            <Trophy className="w-4 h-4 text-orange-600" />
            {title}
          </div>

          <h2 className="mt-4 text-2xl sm:text-3xl font-black text-gray-900">
            {subtitle}
          </h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-[60px_1fr_90px] px-3 sm:px-4 py-3 text-xs font-black uppercase tracking-wider bg-orange-50 text-orange-900 border-b border-orange-100">
            <div>Platz</div>
            <div>Name</div>
            <div className="text-right">Punkte</div>
          </div>

          <div>
            {players.map((player, index) => (
              <div
                key={`${player.platz}-${player.name}`}
                className={`grid grid-cols-[60px_1fr_90px] items-center px-3 sm:px-4 py-2.5 border-t border-gray-100 ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
              >
                <div className="font-black text-base sm:text-lg text-gray-900">
                  {player.platz}
                </div>

                <div className="font-bold truncate text-sm sm:text-base text-gray-800">
                  {player.name}
                </div>

                <div className="text-right font-black text-base sm:text-lg text-orange-700">
                  {player.punkte}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-center">
          <div className="text-xs uppercase tracking-wider font-bold text-orange-700">
            Punktedurchschnitt
          </div>

          <div className="font-black text-xl mt-1 text-gray-900">
            Pro Spiel
          </div>
        </div>
      </div>

      <div
        className={`absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-10 ${iconBg}`}
      />
    </motion.div>
  )
}

export default function MembersChampionCupEinstufungPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-gray-50 text-gray-900 pb-24 md:pb-0 overflow-x-hidden">
      <Header />

      <main className="pt-16 sm:pt-14">
        <motion.div
          className="mx-auto w-full px-4 py-6 sm:py-8 max-w-7xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-5">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-black text-orange-700 shadow-sm hover:bg-orange-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Link>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="relative overflow-hidden rounded-[35px] border border-orange-100 bg-white shadow-2xl"
          >
            <div className="relative p-6 sm:p-10 text-white bg-gradient-to-br from-orange-500 via-orange-600 to-red-600">
              <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_15%_15%,white,transparent_35%),radial-gradient(circle_at_85%_20%,white,transparent_30%),radial-gradient(circle_at_70%_90%,white,transparent_35%)]" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/10 to-transparent" />

              <div className="relative flex justify-center mb-6">
                <Image
                  src="/images/logo5.png"
                  alt="EMD"
                  width={180}
                  height={180}
                  className="drop-shadow-[0_0_30px_rgba(255,255,255,0.45)]"
                  priority
                />
              </div>

              <div className="relative text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest">
                  <Crown className="w-4 h-4" />
                  EMD Members Champion Cup
                </div>

                <h1 className="mt-6 text-5xl sm:text-7xl font-black leading-none tracking-tight">
                  Tabellen
                  <span className="block text-white drop-shadow-lg">
                    Einstufung
                  </span>
                </h1>

                <p className="mt-6 max-w-5xl mx-auto text-sm sm:text-lg leading-relaxed text-white/95">
                  Die ausberechneten Zulosungstabellen für unsere{" "}
                  <strong className="text-white">
                    EMD Members Champion Cup Serie K26/27
                  </strong>{" "}
                  wurden anhand der Leistungen aus den Saisonen{" "}
                  <strong className="text-white">Herbst 2025</strong> und/oder{" "}
                  <strong className="text-white">Frühjahr 2026</strong>{" "}
                  berechnet.
                </p>

                <p className="mt-5 max-w-5xl mx-auto text-sm sm:text-lg leading-relaxed text-white/90">
                  Als Grundlage dienen die offiziellen Statistikpunkte unserer
                  EMD VereinsApp. Die Gesamtpunkte wurden durch die Anzahl der
                  gespielten Spiele dividiert. Dadurch ergibt sich ein fairer
                  und objektiver{" "}
                  <strong className="text-white">
                    Punktedurchschnitt pro Spiel.
                  </strong>
                </p>
              </div>
            </div>

            <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500" />
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="grid md:grid-cols-3 gap-5 mt-7"
          >
            <div className="rounded-[28px] border border-blue-100 bg-white p-6 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900">
                Statistik-System
              </h3>
              <p className="mt-3 leading-relaxed text-gray-600 font-semibold">
                Berechnung anhand der offiziellen EMD VereinsApp Statistiken
                und Durchschnittspunkte pro Spiel.
              </p>
            </div>

            <div className="rounded-[28px] border border-orange-200 bg-orange-50 p-6 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-white border border-orange-200 flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900">
                Faire Zulosung
              </h3>
              <p className="mt-3 leading-relaxed text-gray-600 font-semibold">
                Ziel ist eine möglichst faire und ausgeglichene Partner-Zulosung
                während der gesamten Serie.
              </p>
            </div>

            <div className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900">
                Leistungsgruppen
              </h3>
              <p className="mt-3 leading-relaxed text-gray-600 font-semibold">
                Spieler werden anhand ihrer Durchschnittswerte in
                unterschiedliche Leistungsgruppen eingeteilt.
              </p>
            </div>
          </motion.div>

          <div className="grid xl:grid-cols-3 gap-6 mt-8 items-start">
            <TierCard
              title="Tabelle 1"
              subtitle="Höchste Punkte"
              accent="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600"
              iconBg="bg-blue-500"
              players={tabelle1Players}
            />

            <TierCard
              title="Tabelle 2"
              subtitle="Mittlere Punkte"
              accent="bg-gradient-to-r from-slate-400 via-slate-500 to-slate-700"
              iconBg="bg-slate-500"
              players={tabelle2Players}
            />

            <TierCard
              title="Tabelle 3"
              subtitle="Niedrigste Punkte"
              accent="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600"
              iconBg="bg-orange-500"
              players={tabelle3Players}
            />
          </div>

          <motion.div
            variants={itemVariants}
            className="mt-8 rounded-[30px] border border-orange-100 bg-white p-7 text-center shadow-xl"
          >
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                <Users className="w-9 h-9 text-orange-600" />
              </div>
            </div>

            <h3 className="text-3xl font-black text-gray-900">
              EMD Members Champion Cup K26/27
            </h3>

            <p className="mt-4 max-w-4xl mx-auto leading-relaxed text-gray-600 font-semibold">
              Die Tabellen dienen ausschließlich der fairen Partner-Zulosung und
              Leistungs-Einstufung innerhalb der offiziellen EMD Members
              Champion Cup Serie. Anpassungen und Neueinstufungen können
              während der Saison durch die Turnierleitung vorgenommen werden.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-5 py-2 text-xs font-black uppercase tracking-widest text-orange-700">
              <Star className="w-4 h-4" />
              Saison K26/27
            </div>
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}