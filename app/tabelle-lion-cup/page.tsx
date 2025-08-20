"use client"

import { Header } from "@/components/header"
import { motion } from "framer-motion"
import { Trophy, Calendar, Clock, Crown } from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } },
}

export default function TabellelionCupPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Header />
      <main className="pt-8 pb-20">
        <motion.div
          className="container mx-auto px-4 md:px-6 py-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Section */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-8 md:p-12 text-white">
              <div className="bg-white/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 backdrop-blur-sm">
                <Trophy className="h-12 w-12 text-white mx-auto" />
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-4">
                <span className="block text-white">EMD LIONCUP PART II</span>
                <span className="block text-orange-200">TABELLE</span>
              </h1>
              <p className="text-lg md:text-xl font-bold uppercase text-orange-100">2025/2026 - Aktuelle Rangliste</p>
            </div>
          </motion.div>

          {/* Coming Soon Section */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 md:p-12"
          >
            <div className="text-center">
              <div className="bg-orange-100 rounded-full p-6 w-24 h-24 mx-auto mb-8">
                <Crown className="h-12 w-12 text-orange-600 mx-auto" />
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase">Coming Soon</h2>

              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Die offizielle Tabelle des EMD Lion Cup II wird hier verfügbar sein, sobald das Turnier startet.
              </p>

              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
                  <Calendar className="h-8 w-8 text-orange-600 mx-auto mb-4" />
                  <h3 className="font-bold text-orange-700 mb-2">Turnierstart</h3>
                  <p className="text-gray-700 font-semibold">01. September 2025</p>
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
                  <Clock className="h-8 w-8 text-orange-600 mx-auto mb-4" />
                  <h3 className="font-bold text-orange-700 mb-2">Spielzeit</h3>
                  <p className="text-gray-700 font-semibold">Jeden Montag 19:30 Uhr</p>
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
                  <Trophy className="h-8 w-8 text-orange-600 mx-auto mb-4" />
                  <h3 className="font-bold text-orange-700 mb-2">Turniertage</h3>
                  <p className="text-gray-700 font-semibold">34 Spieltage + Finale</p>
                </div>
              </div>

              <div className="mt-12 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-6">
                <p className="text-lg font-bold">
                  🦁 Hier werden bald die aktuellen Standings, Punkte und Platzierungen aller Teilnehmer angezeigt!
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <footer className="py-6 bg-gray-200 text-gray-600 text-sm text-center border-t border-gray-300">
        <p>&copy; 2025 Emoj!'s Dartverein e.V. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  )
}
