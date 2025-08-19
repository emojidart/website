"use client"

import { Header } from "@/components/header"
import { motion } from "framer-motion"
import { Crown, Calendar, Clock, MapPin, Trophy, Euro, Users, Target, AlertCircle } from "lucide-react"

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

export default function RegelwerkPage() {
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
                <Crown className="h-12 w-12 text-white mx-auto" />
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-4">
                <span className="block text-white">LIONCUP</span>
                <span className="block text-orange-200">REGELWERK</span>
              </h1>
              <p className="text-lg md:text-xl font-bold uppercase text-orange-100">
                2025/2026 - Offizielle Turnierregeln
              </p>
            </div>
          </motion.div>

          {/* Rules Content */}
          <div className="space-y-8">
            {/* Grunddaten */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-orange-100 rounded-lg p-2">
                  <MapPin className="h-6 w-6 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Veranstaltungsort & Termine</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                    <h3 className="font-bold text-orange-700 mb-2">Ort</h3>
                    <p className="text-gray-700">
                      <strong>D. & F. Vereinsheim „Pfeil-OK"</strong>
                      <br />
                      Linzer Bundesstraße 16
                      <br />
                      5020 Salzburg
                    </p>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                    <h3 className="font-bold text-orange-700 mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Zeitraum
                    </h3>
                    <p className="text-gray-700 font-semibold">01. September 2025 – 01. Juni 2026</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                    <h3 className="font-bold text-orange-700 mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Spielzeit
                    </h3>
                    <p className="text-gray-700 font-semibold">Jeden Montag 19:30 Uhr</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                    <h3 className="font-bold text-orange-700 mb-2 flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Turniertage
                    </h3>
                    <p className="text-gray-700 font-semibold">34 Turniertage + 1 Finaltag</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Spielpausen */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-yellow-100 rounded-lg p-2">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Spielpausen</h2>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <p className="text-gray-700 mb-4">
                  An folgenden Terminen finden <strong>keine Turniere</strong> statt:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {["27. Okt. 2025", "22. Dez. 2025", "29. Dez. 2025", "05. Jan. 2026", "11. Mai 2026"].map(
                    (date, index) => (
                      <div
                        key={index}
                        className="bg-yellow-200 text-yellow-800 font-bold px-3 py-2 rounded-lg text-center text-sm"
                      >
                        {date}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </motion.div>

            {/* Kosten */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-100 rounded-lg p-2">
                  <Euro className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Kosten & Gebühren</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <h3 className="font-bold text-green-700 mb-2">Reguläre Saison</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>
                        • <strong>Einmaliger Teilnahmebeitrag:</strong> € 5,-
                      </li>
                      <li>
                        • <strong>Pro Turniertag:</strong> € 4,- pro Teilnehmer
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <h3 className="font-bold text-green-700 mb-2">Finaltag (Qualifizierte)</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>
                        • <strong>Zusätzliche Gebühr:</strong> € 5,-
                      </li>
                      <li>
                        • <strong>Startgeld:</strong> € 4,-
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Sponsoring
                </h3>
                <p className="text-gray-700 font-semibold">€ 250,- Gesamtsponsoring</p>
              </div>
            </motion.div>

            {/* Qualifikation */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-100 rounded-lg p-2">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Qualifikation & Punkte</h2>
              </div>
              <div className="space-y-6">
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <h3 className="font-bold text-purple-700 mb-2">Finaltag-Qualifikation</h3>
                  <p className="text-gray-700">
                    <strong>20 Antritte</strong> sind erforderlich für die Finaltag-Qualifikation
                  </p>
                </div>

                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <h3 className="font-bold text-purple-700 mb-3">Punktewertung pro Turniertag</h3>
                  <div className="space-y-2 text-gray-700">
                    <p>
                      • <strong>Letzter Platz:</strong> 10 Punkte
                    </p>
                    <p>
                      • <strong>Jeder bessere Platz:</strong> +2 Punkte zusätzlich
                    </p>
                    <p>
                      • <strong>Check-Punkte:</strong> Zusätzliche Punkte für Checks
                    </p>
                    <p className="text-sm text-purple-600 mt-2">
                      <strong>Beispiel:</strong> (1):2 und (1):2 = 2 Punkte + Platzierungspunkte 10 = 12 Gesamtpunkte
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Spielmodus */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-red-100 rounded-lg p-2">
                  <Target className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Spielmodus & Regeln</h2>
              </div>
              <div className="space-y-6">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <h3 className="font-bold text-red-700 mb-2">Spielmodus</h3>
                  <p className="text-gray-700">
                    Jeden Turniertag <strong>abwechselnd</strong> Beginn mit:
                    <br />
                    <strong>501 Master-Out</strong> → <strong>501 Double-Out</strong> → usw.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <h3 className="font-bold text-red-700 mb-2">Nach 17 Turniertagen</h3>
                    <p className="text-gray-700">
                      <strong>Punkte-Halbierung</strong> aller Teilnehmer
                    </p>
                  </div>

                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <h3 className="font-bold text-red-700 mb-2">Nach 24 Turniertagen</h3>
                    <p className="text-gray-700">
                      <strong>Tabellen-Teilung</strong>
                      <br />
                      <small className="text-red-600">Untere Tabelle kann nicht mehr in obere Tabelle aufsteigen</small>
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <h3 className="font-bold text-yellow-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Mindest-Antritte
                  </h3>
                  <p className="text-gray-700">
                    Regelung für das <strong>Nicht-Erreichen der Mindest-Antritte</strong> ist noch offen und wird
                    bekannt gegeben.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>

      <footer className="py-6 bg-gray-200 text-gray-600 text-sm text-center border-t border-gray-300">
        <p>&copy; 2025 Emoj!'s Dartverein e.V. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  )
}
