"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { CampusRegistrationModal } from "@/components/campus-registration-modal"
import { motion } from "framer-motion"
import { Target, Users, Trophy, Calendar, MapPin, Clock } from "lucide-react"

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

function App() {
  const [selectedAge, setSelectedAge] = useState<"kids" | "junior" | "teens">("kids")
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false)

  const kidsModules = [
    { monat: 1, schwerpunkt: "Grundhaltung & Spaß", module: "Koordination • Wurfspiele • Regeln spielerisch" },
    { monat: 2, schwerpunkt: "Zieltraining Basis", module: "Board-Basics • Zielpunkte-Spiel • Konzentrationsübungen" },
    { monat: 3, schwerpunkt: "Scoring Einstieg", module: "Zahlen kennenlernen • 10er-Ziele • Wurfserien" },
    { monat: 4, schwerpunkt: "Doppel spielerisch", module: "Doppel-Fangspiel • Ziel-Ringe • Rhythmus" },
    { monat: 5, schwerpunkt: "Technik Mini", module: "Stand • Armbewegung • einfache Routinen" },
    { monat: 6, schwerpunkt: "Mini-Matchphase", module: "301 Soft • Punkte-Rennen • Fair-Play-Training" },
    { monat: 7, schwerpunkt: "Sommer-Cup", module: "Fun Cup • Teamspiele • Medaillen" },
    { monat: 8, schwerpunkt: "Feinschliff", module: "Balance • Wiederholungen • Spieldisziplin" },
    { monat: 9, schwerpunkt: "Ziel & Konzentration", module: "Zielstrecken • 3-Wurf-Fokus • Mental Spiele" },
    { monat: 10, schwerpunkt: "Leg-Einstieg", module: "Mini Legs • Zählen-Basics • Team-Duelle" },
    { monat: 11, schwerpunkt: "Turnier", module: "Kids-Leagues • Motivation • Selbstbewusstsein" },
    { monat: 12, schwerpunkt: "Abschluss", module: "Skill-Test • Feedback • Urkunden" },
  ]

  const juniorModules = [
    { monat: 1, schwerpunkt: "Grundlagen & Analyse", module: "Technikcheck • Stand & Griff • Testspiele" },
    { monat: 2, schwerpunkt: "Ziel & Rhythmus", module: "Zielstationen • Rhythmus-Übungen" },
    { monat: 3, schwerpunkt: "Scoring-System", module: "60+ Ziel • Power-Würfe • Punkte-Rennen" },
    { monat: 4, schwerpunkt: "Checkout Basics", module: "Checkout Tabelle 32-80 • Doppel-Challenge" },
    { monat: 5, schwerpunkt: "Match Grundlagen", module: "Druckspiele • Routine-Training" },
    { monat: 6, schwerpunkt: "Liga Vorbereitung", module: "Matcharts • Zeitdruck • Team Matches" },
    { monat: 7, schwerpunkt: "Akademie-Sommerliga", module: "Liga-Runs • Mini-Turniere" },
    { monat: 8, schwerpunkt: "Technik-Feinschliff", module: "Video-Analyse • Formverbesserung" },
    { monat: 9, schwerpunkt: "Checkout Aufbau", module: "2-Dart Wege • Endgame-Übungen" },
    { monat: 10, schwerpunkt: "Taktik", module: "Leg-Planung • Gegner-Strategien" },
    { monat: 11, schwerpunkt: "Turnierphase", module: "Academy Cup • mentale Routinen" },
    { monat: 12, schwerpunkt: "Abschluss", module: "Skill-Tests • Feedback • Zertifikat" },
  ]

  const teensModules = [
    { monat: 1, schwerpunkt: "Analyse & Zielsetzung", module: "Video Check • Leistungsplan" },
    { monat: 2, schwerpunkt: "Technik Optimierung", module: "Bewegungseinheiten • Tempo-Stabilität" },
    { monat: 3, schwerpunkt: "Scoring Power", module: "100+ Training • Long-Runs" },
    { monat: 4, schwerpunkt: "Checkout Profi", module: "2-& 3-Dart-Systeme • Under Pressure Training" },
    { monat: 5, schwerpunkt: "Mental & Fokus", module: "Atemtechnik • Set-Reset-Routinen" },
    { monat: 6, schwerpunkt: "Liga-Simulation", module: "Matchplay • Tiebreak • Turnierdisziplin" },
    { monat: 7, schwerpunkt: "Turnierblock", module: "Open Finals • Leistungswertung" },
    { monat: 8, schwerpunkt: "Entwicklungsphase", module: "Korrekturen • Kraft/Koordination" },
    { monat: 9, schwerpunkt: "Turnierstrategie", module: "Gegneranalyse • Set Play" },
    { monat: 10, schwerpunkt: "Peak-Training", module: "High-Intensity Practice" },
    { monat: 11, schwerpunkt: "Final-Season", module: "Finals • Rangliste • Mentale Stärkung" },
    { monat: 12, schwerpunkt: "Abschluss", module: "Skill Test • Leistungsbrief • Academy Level" },
  ]

  const getCurrentModules = () => {
    switch (selectedAge) {
      case "kids":
        return kidsModules
      case "junior":
        return juniorModules
      case "teens":
        return teensModules
    }
  }

  const getAgeGroupInfo = () => {
    switch (selectedAge) {
      case "kids":
        return { title: "Kids (6-10 Jahre)", subtitle: "Mini-Darters", color: "from-red-500 to-red-600" }
      case "junior":
        return { title: "Junior (11-14 Jahre)", subtitle: "Young-Talents", color: "from-blue-500 to-blue-600" }
      case "teens":
        return { title: "Teens (15-18 Jahre)", subtitle: "Future-Pros", color: "from-red-500 to-red-600" }
    }
  }

  const ageInfo = getAgeGroupInfo()
  const modules = getCurrentModules()

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans overflow-x-hidden">
      <Header />
      <main className="pt-8 pb-24">
        <motion.div
          className="container mx-auto px-4 md:px-6 py-8 max-w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Section */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-6 md:p-12 text-white">
              <div className="bg-white/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 backdrop-blur-sm">
                <Target className="h-12 w-12 text-white mx-auto" />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold uppercase leading-tight tracking-tighter mb-4 text-balance">
                <span className="block text-white">EMD - CAMPUS</span>
                <span className="block text-orange-200 break-words">NACHWUCHS</span>
				  <span className="block text-orange-200 break-words">AKADEMIE</span>
              </h1>
              <p className="text-base md:text-xl font-bold uppercase text-orange-100 mb-4 text-balance">
                Young Talent Programm - Dein Weg zum Dart-Champion
              </p>
              <div className="bg-orange-600/30 rounded-xl p-4 text-orange-100">
                <p className="text-sm italic text-balance">
                  Der Weg zum Dart-Talent beginnt hier - Willkommen im EMD-CAMPUS Nachwuchsprogramm!
                </p>
              </div>
            </div>
          </motion.div>

          {/* Überblick */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-100 rounded-lg p-2">
                <Target className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Das EMD-CAMPUS Programm</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Beim EMD-CAMPUS steht die Entwicklung junger Dart-Spielerinnen und Spieler im Mittelpunkt. Unser
              12-monatiges Nachwuchsprogramm begleitet Kinder und Jugendliche von 6 bis 18 Jahren auf ihrem sportlichen
              Weg - vom spielerischen Einstieg bis hin zur Turnier- und Liga-Teilnahme.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Unsere leistungsorientierte Förderung beinhaltet:</strong> Technikanalyse & Wurftechnik-Coaching,
              Konzentrations- & Mentaltrainings, Zielorientierte Trainingspläne, Turnier- und Liga-Vorbereitung,
              Begleitung durch qualifizierte Trainer, Individuelles Feedback & Leistungsdokumentation
            </p>
          </motion.div>

          {/* Grunddaten */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 rounded-lg p-2">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Zeitraum & Ort</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Programmzeitraum
                  </h3>
                  <p className="text-gray-700 font-semibold">Jänner – Dezember 2026</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Teilnahmemodell
                  </h3>
                  <p className="text-gray-700">12 Monate, 12 Abenteuer mit spezialisiertem Training</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Austragungsort
                  </h3>
                  <p className="text-gray-700">
                    <strong>Vereinsheim Pfeil-OK e.V.</strong>
                    <br />
                    Linzer Bundesstraße 16
                    <br />
                    5020 Salzburg
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 12-Monats Modulplan */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 md:p-8 mb-8 overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-100 rounded-lg p-2">
                <Trophy className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">12-Monats Modulplan</h2>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg mb-4">
              <div className="flex justify-center gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedAge("kids")}
                  className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                    selectedAge === "kids" ? "bg-white text-orange-600" : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  Kids (6-10)
                </button>
                <button
                  onClick={() => setSelectedAge("junior")}
                  className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                    selectedAge === "junior" ? "bg-white text-orange-600" : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  Junior (11-14)
                </button>
                <button
                  onClick={() => setSelectedAge("teens")}
                  className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                    selectedAge === "teens" ? "bg-white text-orange-600" : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  Teens (15-18)
                </button>
              </div>
            </div>

            <div className={`bg-gradient-to-r ${ageInfo.color} text-white p-3 rounded-lg mb-4`}>
              <h3 className="text-center font-bold text-sm md:text-base text-balance">
                {ageInfo.title} - {ageInfo.subtitle}
              </h3>
            </div>

            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="inline-block min-w-full align-middle px-2 md:px-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-2 px-1 md:px-3 text-[10px] md:text-sm font-bold text-gray-700 w-12 md:w-auto">
                        Monat
                      </th>
                      <th className="text-left py-2 px-1 md:px-3 text-[10px] md:text-sm font-bold text-gray-700">
                        Schwerpunkt
                      </th>
                      <th className="text-left py-2 px-1 md:px-3 text-[10px] md:text-sm font-bold text-gray-700">
                        Module
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((item) => (
                      <tr key={item.monat} className="border-b border-gray-100 hover:bg-orange-50 transition-colors">
                        <td className="py-2 px-1 md:px-3 text-[10px] md:text-sm font-bold text-orange-600">
                          {item.monat}
                        </td>
                        <td className="py-2 px-1 md:px-3 text-[10px] md:text-sm font-semibold text-gray-900 break-words">
                          {item.schwerpunkt}
                        </td>
                        <td className="py-2 px-1 md:px-3 text-[10px] md:text-sm text-gray-700 break-words">
                          {item.module}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* Highlights */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-100 rounded-lg p-2">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Was dich im EMD-CAMPUS erwartet</h2>
            </div>
            <p className="text-gray-700 text-center mb-6">12 Monate, 12 Abenteuer im Vereinsheim Pfeil-OK</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                <Target className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Technik, Präzision, mentale Stärke</h3>
                  <p className="text-sm text-gray-700">Von den Grundlagen bis zur professionellen Wettkampftechnik</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                <Trophy className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Vom Spaßspieler zum Team-Champion</h3>
                  <p className="text-sm text-gray-700">Progressives Training mit klaren Zielen</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                <Users className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Teamgeist - respektvoll & pädagogisch</h3>
                  <p className="text-sm text-gray-700">Fair-Play und sportsmanship im Fokus</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                <Trophy className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Talente gesucht! Dart Future Players 2026</h3>
                  <p className="text-sm text-gray-700">Dein Potenzial entdecken und nutzen</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Vision */}
          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-8 mb-8 text-white"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-white/10 rounded-lg p-2">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold">Unsere Vision</h2>
            </div>
            <p className="text-lg font-semibold mb-6 text-orange-100">
              Kinder und Jugendliche bestmöglich auf den Dart-Sport vorbereiten, Talente fördern und Freude am Spiel
              vermitteln - fair, motivierend und professionell.
            </p>
            <div className="space-y-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <p className="text-sm font-bold">✓ Dein Kind liebt Zielspiele? Dann ist Dart genau richtig!</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <p className="text-sm font-bold">✓ Der EMD-Verein baut seine Jugend auf - sei dabei!</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <p className="text-sm font-bold">✓ Dein Pfeil. Dein Ziel. Deine Zukunft - EMD CAMPUS!</p>
              </div>
            </div>
          </motion.div>

          {/* Call to Action */}
          <motion.div variants={itemVariants} className="text-center">
            <button
              onClick={() => setIsRegistrationOpen(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 text-lg"
            >
              JETZT ANMELDEN - SEI DABEI!
            </button>
          </motion.div>

          <motion.div variants={itemVariants} className="text-center mt-12">
            <div className="bg-gray-100 border border-gray-200 rounded-xl p-6">
              <p className="text-gray-600 text-sm">
                <strong>© 2026 EMD CAMPUS – Young Talent Programm</strong>
                <br />
                Erstellt von <strong>Grafikguru</strong>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />

      <CampusRegistrationModal
        isOpen={isRegistrationOpen}
        onClose={() => setIsRegistrationOpen(false)}
        preselectedAgeGroup={selectedAge}
      />
    </div>
  )
}

export default App
