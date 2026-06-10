// app/members-champion-cup/einstufungen/page.tsx

"use client"

import type React from "react"
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

function TierCard({
  title,
  subtitle,
  color,
  players,
}: {
  title: string
  subtitle: string
  color: string
  players: {
    platz: number
    name: string
    punkte: string
  }[]
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={`relative overflow-hidden rounded-[30px] border shadow-2xl ${color}`}
      style={{
        color: "#ffffff",
      }}
    >
      <div className="absolute inset-0 bg-black/35" />

      <div className="relative p-5">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-black/60 border border-white/20 px-4 py-1 text-xs font-black uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-orange-400" />
            <span style={{ color: "#ffffff" }}>{title}</span>
          </div>

          <h2
            className="mt-4 text-3xl font-black drop-shadow-lg"
            style={{ color: "#ffffff" }}
          >
            {subtitle}
          </h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/20 bg-black/60 backdrop-blur-md">
          <div
            className="grid grid-cols-3 px-4 py-3 text-xs font-black uppercase tracking-wider"
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#ffffff",
            }}
          >
            <div>Platz</div>
            <div>Name</div>
            <div className="text-right">Punkte</div>
          </div>

          <div>
            {players.map((player) => (
              <div
                key={player.platz}
                className="grid grid-cols-3 items-center px-4 py-3 border-t border-white/15"
                style={{
                  background: "rgba(0,0,0,0.35)",
                  color: "#ffffff",
                }}
              >
                <div className="font-black text-lg">{player.platz}</div>

                <div className="font-bold truncate text-base">
                  {player.name}
                </div>

                <div
                  className="text-right font-black text-lg"
                  style={{ color: "#ff8a00" }}
                >
                  {player.punkte}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="mt-4 rounded-2xl border border-white/20 p-4 text-center"
          style={{
            background: "rgba(0,0,0,0.65)",
            color: "#ffffff",
          }}
        >
          <div
            className="text-xs uppercase tracking-wider font-bold"
            style={{ color: "#d1d5db" }}
          >
            Punktedurchschnitt
          </div>

          <div className="font-black text-xl mt-1" style={{ color: "#ffffff" }}>
            Pro Spiel
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function MembersChampionCupEinstufungPage() {
  return (
    <div
      className="min-h-screen pb-24 md:pb-0"
      style={{
        background:
          "linear-gradient(135deg, #030303 0%, #0a0a0a 45%, #171717 100%)",
        color: "#ffffff",
      }}
    >
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
              href="/members-champion-cup"
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold"
              style={{
                background: "#111111",
                borderColor: "rgba(255,255,255,0.15)",
                color: "#ffffff",
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Link>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="relative overflow-hidden rounded-[35px] border shadow-2xl"
            style={{
              background:
                "linear-gradient(135deg, #111111 0%, #181818 50%, #050505 100%)",
              borderColor: "rgba(255,138,0,0.35)",
              color: "#ffffff",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at top, rgba(255,138,0,0.35), transparent 60%)",
              }}
            />

            <div className="relative p-6 sm:p-10">
              <div className="flex justify-center mb-6">
                <Image
                  src="/images/logo5.png"
                  alt="EMD"
                  width={180}
                  height={180}
                  className="drop-shadow-[0_0_30px_rgba(255,140,0,0.7)]"
                  priority
                />
              </div>

              <div className="text-center">
                <div
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest"
                  style={{
                    background: "rgba(255,138,0,0.15)",
                    borderColor: "rgba(255,138,0,0.45)",
                    color: "#ffb15c",
                  }}
                >
                  <Crown className="w-4 h-4" />
                  EMD Members Champion Cup
                </div>

                <h1 className="mt-6 text-5xl sm:text-7xl font-black leading-none tracking-tight">
                  <span style={{ color: "#ffffff" }}>Tabellen</span>
                  <span
                    className="block"
                    style={{
                      color: "#ff8a00",
                      textShadow: "0 0 25px rgba(255,138,0,0.45)",
                    }}
                  >
                    Einstufung
                  </span>
                </h1>

                <p
                  className="mt-6 max-w-5xl mx-auto text-sm sm:text-lg leading-relaxed"
                  style={{ color: "#e5e7eb" }}
                >
                  Die ausberechneten Zulosungstabellen für unsere
                  <strong style={{ color: "#ffffff" }}>
                    {" "}
                    EMD Members Champion Cup Serie K26/27
                  </strong>{" "}
                  wurden anhand der Leistungen aus den Saisonen
                  <strong style={{ color: "#ffb15c" }}> Herbst 2025</strong>{" "}
                  und/oder
                  <strong style={{ color: "#ffb15c" }}> Frühjahr 2026</strong>{" "}
                  berechnet.
                </p>

                <p
                  className="mt-5 max-w-5xl mx-auto text-sm sm:text-lg leading-relaxed"
                  style={{ color: "#d1d5db" }}
                >
                  Als Grundlage dienen die offiziellen Statistikpunkte unserer
                  EMD VereinsApp. Die Gesamtpunkte wurden durch die Anzahl der
                  gespielten Spiele dividiert. Dadurch ergibt sich ein fairer
                  und objektiver
                  <strong style={{ color: "#ffffff" }}>
                    {" "}
                    Punktedurchschnitt pro Spiel.
                  </strong>
                </p>
              </div>
            </div>

            <div
              className="h-1.5 w-full"
              style={{
                background:
                  "linear-gradient(90deg, #ff6a00 0%, #ffd000 50%, #ff6a00 100%)",
              }}
            />
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="grid md:grid-cols-3 gap-5 mt-7"
          >
            <div
              className="rounded-[28px] border p-6 shadow-xl"
              style={{
                background: "linear-gradient(135deg, #102040, #050b14)",
                borderColor: "rgba(59,130,246,0.35)",
                color: "#ffffff",
              }}
            >
              <BarChart3 className="w-10 h-10 text-blue-400 mb-4" />
              <h3 className="text-2xl font-black" style={{ color: "#ffffff" }}>
                Statistik-System
              </h3>
              <p className="mt-3 leading-relaxed" style={{ color: "#d1d5db" }}>
                Berechnung anhand der offiziellen EMD VereinsApp Statistiken
                und Durchschnittspunkte pro Spiel.
              </p>
            </div>

            <div
              className="rounded-[28px] border p-6 shadow-xl"
              style={{
                background: "linear-gradient(135deg, #3d1f00, #120700)",
                borderColor: "rgba(255,138,0,0.4)",
                color: "#ffffff",
              }}
            >
              <Shield className="w-10 h-10 text-orange-400 mb-4" />
              <h3 className="text-2xl font-black" style={{ color: "#ffffff" }}>
                Faire Zulosung
              </h3>
              <p className="mt-3 leading-relaxed" style={{ color: "#d1d5db" }}>
                Ziel ist eine möglichst faire und ausgeglichene Partner-Zulosung
                während der gesamten Serie.
              </p>
            </div>

            <div
              className="rounded-[28px] border p-6 shadow-xl"
              style={{
                background: "linear-gradient(135deg, #08261d, #03110c)",
                borderColor: "rgba(16,185,129,0.35)",
                color: "#ffffff",
              }}
            >
              <Target className="w-10 h-10 text-emerald-400 mb-4" />
              <h3 className="text-2xl font-black" style={{ color: "#ffffff" }}>
                Leistungsgruppen
              </h3>
              <p className="mt-3 leading-relaxed" style={{ color: "#d1d5db" }}>
                Spieler werden anhand ihrer Durchschnittswerte in
                unterschiedliche Leistungsgruppen eingeteilt.
              </p>
            </div>
          </motion.div>

          <div className="grid xl:grid-cols-3 gap-6 mt-8">
            <TierCard
              title="Tabelle 1"
              subtitle="Höchste Punkte"
              color="border-blue-500/30 bg-gradient-to-br from-[#0d234f] via-[#163779] to-[#08142b]"
              players={[
                { platz: 1, name: "Tomas B.", punkte: "41,52" },
                { platz: 2, name: "Huber L.", punkte: "33,57" },
                { platz: 3, name: "Christoph St.", punkte: "32,25" },
                { platz: 4, name: "Florian L.", punkte: "30,58" },
                { platz: 5, name: "Orhan A.", punkte: "30,41" },
                { platz: 6, name: "Roland Schw.", punkte: "28,82" },
                { platz: 7, name: "Peter M.", punkte: "26,08" },
                { platz: 8, name: "Rene St.", punkte: "24,86" },
              ]}
            />

            <TierCard
              title="Tabelle 2"
              subtitle="Mittlere Punkte"
              color="border-gray-500/30 bg-gradient-to-br from-[#2f2f2f] via-[#3a3a3a] to-[#171717]"
              players={[
                { platz: 14, name: "Jimmy W.", punkte: "21,47" },
                { platz: 15, name: "Ramona R.", punkte: "21,00" },
                { platz: 16, name: "Bernhard G.", punkte: "20,55" },
                { platz: 17, name: "Michael G.", punkte: "20,00" },
                { platz: 18, name: "Hasan C.", punkte: "19,94" },
                { platz: 19, name: "Christoph K.", punkte: "19,16" },
                { platz: 20, name: "Tina U.", punkte: "18,74" },
                { platz: 21, name: "Rene J.", punkte: "18,66" },
              ]}
            />

            <TierCard
              title="Tabelle 3"
              subtitle="Niedrigste Punkte"
              color="border-orange-500/30 bg-gradient-to-br from-[#5a2a00] via-[#7a3a00] to-[#2d1200]"
              players={[
                { platz: 28, name: "Wolfgang E.", punkte: "13,66" },
                { platz: 29, name: "Andrea G.", punkte: "12,74" },
                { platz: 30, name: "Tamara R.", punkte: "12,29" },
                { platz: 31, name: "Stefan N.", punkte: "10,71" },
                { platz: 32, name: "Mike Th.", punkte: "8,67" },
                { platz: 33, name: "Julia R.", punkte: "6,40" },
                { platz: 34, name: "Ulrike F.", punkte: "5,50" },
                { platz: 35, name: "Petra B.", punkte: "4,85" },
              ]}
            />
          </div>

          <motion.div
            variants={itemVariants}
            className="mt-8 rounded-[30px] border p-7 text-center shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #111111, #050505)",
              borderColor: "rgba(255,255,255,0.15)",
              color: "#ffffff",
            }}
          >
            <div className="flex justify-center mb-4">
              <Users className="w-10 h-10 text-orange-400" />
            </div>

            <h3 className="text-3xl font-black" style={{ color: "#ffffff" }}>
              EMD Members Champion Cup K26/27
            </h3>

            <p
              className="mt-4 max-w-4xl mx-auto leading-relaxed"
              style={{ color: "#d1d5db" }}
            >
              Die Tabellen dienen ausschließlich der fairen Partner-Zulosung und
              Leistungs-Einstufung innerhalb der offiziellen EMD Members
              Champion Cup Serie. Anpassungen und Neueinstufungen können
              während der Saison durch die Turnierleitung vorgenommen werden.
            </p>

            <div
              className="mt-6 inline-flex items-center gap-2 rounded-full border px-5 py-2 text-xs font-black uppercase tracking-widest"
              style={{
                background: "rgba(255,138,0,0.15)",
                borderColor: "rgba(255,138,0,0.45)",
                color: "#ffb15c",
              }}
            >
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