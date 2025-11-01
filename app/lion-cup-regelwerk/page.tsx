"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { motion } from "framer-motion"
import {
  Crown,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Euro,
  Users,
  Target,
  AlertCircle,
  Shield,
  Camera,
  Gavel,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"

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

export default function RegelwerkAppPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Header />
      <main className="pt-8 pb-24">
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
                <span className="block text-white">EMD - LION CUP</span>
                <span className="block text-orange-200">REGELWERK</span>
              </h1>
              <p className="text-lg md:text-xl font-bold uppercase text-orange-100 mb-4">
                Prämierungsliste 01.09.25 – 01.06.26
              </p>
              <div className="bg-orange-600/30 rounded-xl p-4 text-orange-100">
                <p className="text-sm italic">
                  Diese Prämierungsliste ist ein allgemeines Informationsdokument und gilt nur als Hinweis des Ablaufs.
                  Änderungen vorbehalten!
                </p>
              </div>
            </div>
          </motion.div>

          {/* Bewerb Eigenschaften */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-100 rounded-lg p-2">
                <Crown className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Bewerb - Eigenschaften wie ein Löwe!</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>
                      <strong>Innovativ – Kreativ – Attraktiv</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>
                      <strong>Kämpfen und hungrig wie ein Löwe</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>Im Mittelpunkt der Dart Community, strahlen im Rampenlicht</span>
                  </li>
                </ul>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>
                      <strong>Loyal und sportlich fair, intensiv und aufrichtig</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>Beeindrucken mit Charisma und gesundem Optimismus</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>
                      <strong>Die Kombination aus Selbstsicherheit und Kreativität</strong>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
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
              <h2 className="text-2xl font-bold text-gray-900">Austragungsort & Termine</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h3 className="font-bold text-blue-700 mb-2">Austragungsort</h3>
                  <p className="text-gray-700">
                    <strong>Dart & Freizeit Vereinsheim „Pfeil-OK" e.V.</strong>
                    <br />
                    Linzer Bundesstraße 16
                    <br />
                    5020 Salzburg
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Periode des Bewerbes
                  </h3>
                  <p className="text-gray-700 font-semibold">01. September 2025 bis 01. Juni 2026</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Spielzeit
                  </h3>
                  <p className="text-gray-700">
                    <strong>Spieltag:</strong> Jeden Montag
                    <br />
                    <strong>Uhrzeit:</strong> 19:30 Uhr
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Prozess
                  </h3>
                  <p className="text-gray-700 font-semibold">34 Turniertage + 1 Mega-Finaltag</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Spielpausen */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
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

          {/* Leveleinstufung */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-green-100 rounded-lg p-2">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Leveleinstufung</h2>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-6">
              <p className="text-gray-700 text-lg">
                <strong>Jeder kann teilnehmen</strong>, ausgenommen <strong>„A-Level Spieler"</strong>, um
                unterschiedliche Spielstärken zu fördern und zu motivieren.
              </p>
              <p className="text-sm text-green-600 mt-3">
                <strong>Ausnahmen:</strong> Entscheidung der Veranstalter und/oder Turnierleitung
              </p>
            </div>
          </motion.div>

          {/* Kosten */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-100 rounded-lg p-2">
                <Euro className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Turnierstartgeld & Beiträge</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <h3 className="font-bold text-purple-700 mb-2">Reguläre Teilnahme</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>
                      • <strong>Turnierstartgeld pro Teilnahme:</strong> € 4,00
                    </li>
                    <li>
                      • <strong>Teilnahmebeitrag (einmalig):</strong> € 5,00
                    </li>
                    <li className="text-sm text-purple-600">Berechtigung für 34 Turniertage</li>
                  </ul>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <h3 className="font-bold text-purple-700 mb-2">Qualifizierte Teilnehmer</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>
                      • <strong>Finaltag-Beitrag (einmalig):</strong> € 5,00
                    </li>
                    <li className="text-sm text-purple-600">Berechtigung für Finaltag</li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <h3 className="font-bold text-purple-700 mb-2">Wirt-Sponsoring</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>
                      • <strong>Bis 500 Teilnahmen:</strong> € 100,00 (einmalig)
                    </li>
                    <li>
                      • <strong>Ab 501 Teilnahmen:</strong> € 250,00 (einmalig)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Starterfeld */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-red-100 rounded-lg p-2">
                <Target className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Starterfeld & Anmeldung</h2>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-6">
              <p className="text-gray-700 mb-4">
                Um ein <strong>EMD – LION CUP-Turnier</strong> zu organisieren, müssen mindestens{" "}
                <strong>4 Teilnehmer</strong> mitspielen.
              </p>
              <p className="text-gray-700">
                Die Spieler müssen sich mit <strong>vollem Namen anmelden</strong> und eingetragen werden.
              </p>
            </div>
          </motion.div>

          {/* Punktewertung */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 rounded-lg p-2">
                <Trophy className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Punktewertung</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                <h3 className="font-bold text-indigo-700 mb-3">Grundwertung</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • <strong>Letzter Platz:</strong> 10 Punkte
                  </li>
                  <li>
                    • <strong>Jede bessere Platzierung:</strong> +2 Punkte zusätzlich
                  </li>
                  <li>
                    • <strong>Ergebnis-Punkte:</strong> Zusätzlich zu den Platzierungspunkten
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-indigo-100 rounded-lg">
                  <p className="text-sm text-indigo-700">
                    <strong>Beispiel:</strong> 1:2 + 1:2 = 2 Punkte + Platzierungspunkte 10 = 12 Gesamtpunkte
                  </p>
                </div>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                <h3 className="font-bold text-indigo-700 mb-2">Bonus</h3>
                <p className="text-gray-700">
                  <strong>1. Platzierter von Gewinner-Seite:</strong> +5 Bonuspunkte zusätzlich
                </p>
              </div>
            </div>
          </motion.div>

          {/* Antritte */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-teal-100 rounded-lg p-2">
                <Calendar className="h-6 w-6 text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Antritte für Finaltag</h2>
            </div>
            <div className="bg-teal-50 border border-teal-100 rounded-xl p-6">
              <p className="text-gray-700 text-lg">
                Jeder <strong>EMD – LION CUP-Teilnehmer</strong>, der am Finaltag teilnehmen möchte, benötigt{" "}
                <strong className="text-teal-700">20 Antritte</strong>.
              </p>
            </div>
          </motion.div>

          {/* Wertung & Tabellen */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-100 rounded-lg p-2">
                <Trophy className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Wertung & Tabellensystem</h2>
            </div>
            <div className="space-y-6">
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
                <h3 className="font-bold text-orange-700 mb-3">Tabellenverlauf</h3>
                <p className="text-gray-700 mb-4">
                  Eine Tabelle bis zur Vollendung der <strong>34 Turniertage + 1 Finaltag</strong>
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white border border-orange-200 rounded-lg p-4">
                    <h4 className="font-bold text-orange-600 mb-2">Nach 17 Turniertagen</h4>
                    <p className="text-sm text-gray-700">
                      Punkte werden bei allen Teilnehmern <strong>geteilt</strong>
                    </p>
                  </div>
                  <div className="bg-white border border-orange-200 rounded-lg p-4">
                    <h4 className="font-bold text-orange-600 mb-2">Nach 24 Turniertagen</h4>
                    <p className="text-sm text-gray-700">
                      Tabelle wird <strong>halbiert</strong> - untere Tabelle kann nicht mehr in obere Tabelle gelangen.
                      Ab diesem Zeitpunkt sind <strong>keine neuen Teilnehmer/Teilnahmen</strong> mehr möglich.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
                <h3 className="font-bold text-orange-700 mb-3">Qualifikation (1.-5. Plätze je Tabelle)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white border border-orange-200 rounded-lg p-4">
                    <h4 className="font-bold text-orange-600 mb-2">Tabelle 1 (Obere Tabelle)</h4>
                    <p className="text-sm text-gray-700">Erspielte Platzierungen der 24 Turniertage</p>
                  </div>
                  <div className="bg-white border border-orange-200 rounded-lg p-4">
                    <h4 className="font-bold text-orange-600 mb-2">Tabelle 2 (Untere Tabelle)</h4>
                    <p className="text-sm text-gray-700">Die ersten fünf der geteilten Tabelle des unteren Feldes</p>
                    <p className="text-xs text-orange-600 mt-1">
                      Beispiel: 20 Teilnehmer geteilt durch zwei = Platz 11-15 werden zu Platz 1-5
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-700">
                  <strong>Hinweis:</strong> Sollten in Gruppe 1 und Gruppe 2 die ersten 5 Plätze mit den Antrittstagen
                  nicht erreicht werden, wird bis zum Finaltag entschieden.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Spielmodus */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-red-100 rounded-lg p-2">
                <Target className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Spielmodus & Spielregeln</h2>
            </div>
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-100 rounded-xl p-6">
                <h3 className="font-bold text-red-700 mb-3">Spielmodus</h3>
                <p className="text-gray-700 mb-4">
                  Der Spielmodus ist <strong>abwechselnd</strong> beginnend mit:
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-red-200 rounded-lg p-3 text-center">
                    <span className="font-bold text-red-600">1. Turniertag</span>
                    <br />
                    <span className="text-sm">501 Master Out</span>
                  </div>
                  <div className="bg-white border border-red-200 rounded-lg p-3 text-center">
                    <span className="font-bold text-red-600">2. Turniertag</span>
                    <br />
                    <span className="text-sm">501 Double Out</span>
                  </div>
                </div>
                <p className="text-sm text-red-600 mt-3">usw. (abwechselnd)</p>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-xl p-6">
                <h3 className="font-bold text-red-700 mb-3">Ausbullen & Spielbeginn</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • Vor Beginn des Spieles wird <strong>ausgebullt</strong>
                  </li>
                  <li>• Sieger ist derjenige, dessen Pfeil näher im Bull ist oder steckt</li>
                  <li>• Bei beiden Pfeilen im Innenbull oder Außenbull muss wiederholt werden</li>
                  <li>
                    • Der Sieger des Ausbullens entscheidet, wer das <strong>1. Leg</strong> beginnt
                  </li>
                  <li>
                    • Ein etwaiges <strong>3. Leg</strong> beginnt derjenige, der das 1. Leg begonnen hat
                  </li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-xl p-6">
                <h3 className="font-bold text-red-700 mb-3">Übungswürfe</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • Jeder Teilnehmer kann sich vor Turnierbeginn <strong>einwerfen</strong>
                  </li>
                  <li>
                    • Vor dem Ausbullen: maximal <strong>9 Übungspfeile</strong> pro Teilnehmer
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Teilnahmebedingungen */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 rounded-lg p-2">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Teilnahmebedingungen</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <h3 className="font-bold text-blue-700 mb-3">Allgemeine Bedingungen</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • Teilnehmen darf jeder Spieler, der das <strong>16. Lebensjahr vollendet</strong> hat
                  </li>
                  <li>• Gesamtpunkteanzahl kommt in die Wertung (wie oben beschrieben)</li>
                  <li>
                    • Jeder Spieler darf pro Turnier nur <strong>einmal genannt</strong> werden
                  </li>
                  <li>
                    • Persönliches Erscheinen vor Turnierbeginn ist <strong>Pflicht</strong>
                  </li>
                  <li>
                    • Mindestens <strong>gegen zwei Gegner</strong> gespielt haben für Wertung
                  </li>
                  <li>
                    • <strong>Freilos gilt nicht als Gegner</strong>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <h3 className="font-bold text-blue-700 mb-3">Regelakzeptanz & Veröffentlichung</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • Mit der Anmeldung werden die aktuellen <strong>EMD – LION Cup Regeln</strong> akzeptiert
                  </li>
                  <li>
                    • Verstoß gegen die Regeln kann zu einem <strong>Ausschluss</strong> führen
                  </li>
                  <li>
                    • Zustimmung zur <strong>Namensveröffentlichung</strong> in sämtlichen Publikationen
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <h3 className="font-bold text-blue-700 mb-3">Wurfregeln</h3>
                <p className="text-gray-700">
                  Die Pfeile müssen mit <strong>einer Hand</strong>, auf den <strong>Füßen stehend</strong> und{" "}
                  <strong>ohne Hilfsmittel</strong> eigenständig geworfen werden. Die{" "}
                  <strong>Abwurflinie darf nicht übertreten</strong> werden.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Turnierregeln */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-green-100 rounded-lg p-2">
                <Gavel className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Turnierregeln</h2>
            </div>
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-100 rounded-xl p-6">
                <h3 className="font-bold text-green-700 mb-3">Auslosung & Paarungen</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • Vor Turnierbeginn wird <strong>EINE angekündigte öffentliche Auslosung</strong> vorgenommen
                  </li>
                  <li>
                    • Es gibt <strong>keine gesetzten Spieler</strong>
                  </li>
                  <li>• Ausgeloste Paarungen werden von der Turnierleitung eingetragen (händisch oder elektronisch)</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-xl p-6">
                <h3 className="font-bold text-green-700 mb-3">Spielaufgabe & Weiterschreibung</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • Aufgabe während des Turniers muss auf Turnierplan eingetragen werden (mit genauem Zeitpunkt)
                  </li>
                  <li>
                    • Verlierer darf <strong>nicht als gewonnen</strong> weitergeschrieben werden
                  </li>
                  <li>
                    • Gegner ohne zu spielen weiterschreiben = <strong>Aufgabe für das Turnier</strong>
                  </li>
                  <li>
                    • Bei Aufgabe gegen die ersten zwei Gegner wird das Turnier <strong>nicht gewertet</strong>
                  </li>
                  <li>
                    • <strong>Freilos gilt nicht als Gegner</strong> (siehe Teilnahmebedingungen)
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-xl p-6">
                <h3 className="font-bold text-green-700 mb-3">Ergebnisse & Veröffentlichung</h3>
                <p className="text-gray-700">
                  Die Ergebnisse und Ranglisten werden <strong>fortlaufend geführt</strong> und{" "}
                  <strong>einmal wöchentlich</strong> auf der <strong>emojisdartverein.com Homepage</strong>{" "}
                  veröffentlicht.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Spielablauf */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-100 rounded-lg p-2">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Spielablauf</h2>
            </div>
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-6">
                <h3 className="font-bold text-purple-700 mb-3">Pünktlichkeit & Spielbeginn</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • Jeder Spieler muss sich <strong>rechtzeitig vor Spielbeginn</strong> am Board einfinden
                  </li>
                  <li>
                    • Bei Nichterscheinen innerhalb von <strong>5 Minuten</strong> = Match verloren
                  </li>
                  <li>• Nicht zu Ende gespieltes Match = Match verloren</li>
                  <li>
                    • Bei vorzeitigem Spielabbruch: <strong>Verlust aller Ansprüche</strong> auf Ranglistenpunkte und
                    Preisgelder/Trophäen
                  </li>
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-xl p-6">
                <h3 className="font-bold text-purple-700 mb-3">Spielbereich & Verhalten</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Im Spielbereich: nur Spieler, Turnierleitung oder Schiedsrichter</li>
                  <li>
                    • Gegenspieler muss sich in <strong>angemessenem Abstand hinter dem Werfer</strong> befinden
                  </li>
                  <li>
                    • Störung des Werfers ist <strong>nicht erlaubt</strong>
                  </li>
                  <li>
                    • Spieler hat maximal <strong>20 Sekunden</strong> Zeit für 3 Pfeile
                  </li>
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-xl p-6">
                <h3 className="font-bold text-purple-700 mb-3">Pausen & Unterbrechungen</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • Bei Pfeilschäden: maximal <strong>5-minütige Pause</strong> mit Zustimmung der Turnierleitung
                  </li>
                  <li>• Gleiches gilt für andere Gründe zum kurzfristigen Verlassen des Spielbereichs</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Verhaltensregeln */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-red-100 rounded-lg p-2">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Verhaltensregeln</h2>
            </div>
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-100 rounded-xl p-6">
                <h3 className="font-bold text-red-700 mb-3">Allgemeine Verhaltensregeln</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • <strong>Unsportliches Verhalten jeglicher Art</strong> ist strikt untersagt
                  </li>
                  <li>
                    • Jeder Teilnehmer ist selbst verantwortlich, sich über das{" "}
                    <strong>Turniergeschehen informiert</strong> zu halten
                  </li>
                  <li>
                    • <strong>Absprachen</strong> bezüglich Spielausgänge oder Preisgeldaufteilungen sind{" "}
                    <strong>strikt untersagt</strong>
                  </li>
                  <li>
                    • <strong>Jegliche Wetten</strong> in puncto Spielausgang sind im EMD-LION Cup{" "}
                    <strong>untersagt</strong>
                  </li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-xl p-6">
                <h3 className="font-bold text-red-700 mb-3">Spielbereich-Regeln</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • Während des Matches auf der Linie: <strong>Alkohol-, Ess- und Rauchverbot</strong>
                  </li>
                  <li>
                    • Der allgemeine Spielbetrieb darf <strong>nicht negativ beeinflusst</strong> werden
                  </li>
                  <li>
                    • Die <strong>Hausordnung</strong> des jeweiligen Austragungslokals ist einzuhalten
                  </li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-xl p-6">
                <h3 className="font-bold text-red-700 mb-3">Schwerwiegende Verstöße</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • <strong>Androhung und Anwendung von Gewalt</strong> ist strikt untersagt und wird{" "}
                    <strong>strafrechtlich verfolgt</strong>
                  </li>
                  <li>
                    • <strong>Sittenwidriges und diskriminierendes Verhalten</strong> (unabhängig von Geschlecht und
                    Herkunft) ist strikt untersagt
                  </li>
                  <li>
                    • Kann zu einem <strong>Ausschluss vom EMD – LION CUP</strong> führen
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Punktegleichstand */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-yellow-100 rounded-lg p-2">
                <Trophy className="h-6 w-6 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Vorgehensweise bei Punktegleichstand</h2>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <p className="text-gray-700 text-lg">
                Sollten die <strong>1.-5. Platzierten nach dem Finaltag punktegleich</strong> sein, werden diese zu
                einem <strong>Entscheidungsmatch</strong> eingeladen.
              </p>
              <div className="mt-4 p-4 bg-yellow-100 rounded-lg">
                <p className="text-yellow-800 font-semibold">
                  <strong>Spielmodus:</strong> 2 gewonnene Legs 501 Master Out
                </p>
              </div>
            </div>
          </motion.div>

          {/* Spielspezifische Regelung */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 rounded-lg p-2">
                <Target className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Spielspezifische Regelung</h2>
            </div>
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                <h3 className="font-bold text-indigo-700 mb-3">Dartspfeil-Spezifikationen</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • <strong>Maximale Länge:</strong> 20 cm
                  </li>
                  <li>
                    • <strong>Maximales Gewicht:</strong> 19 Gramm
                  </li>
                  <li>
                    • <strong>Bestandteile:</strong> Plastikspitze (Soft-Tip), Barrel, Schaft und Flight
                  </li>
                </ul>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                <h3 className="font-bold text-indigo-700 mb-3">Automatenwertung</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • <strong>Jeder Wurf, der vom Automaten gewertet wird, zählt</strong>
                  </li>
                  <li>
                    • <strong>Im Zweifelsfall hat der Automat Recht</strong>
                  </li>
                  <li>
                    • <strong>Einzige Ausnahme - Check-Darts:</strong> Wenn der Pfeil steckt und der Automat ihn nicht
                    erkennt, dann zählt er als Check
                  </li>
                </ul>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                <h3 className="font-bold text-indigo-700 mb-3">Weitere Spielregeln</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • Nach Ablauf der <strong>20. Runde</strong> muss ausgebullt werden
                  </li>
                  <li>
                    • Solange sich ein Spieler im Wurfbereich befindet, darf sein Gegenspieler{" "}
                    <strong>weder werfen noch eine Wurfstellung einnehmen</strong>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Presse */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-pink-100 rounded-lg p-2">
                <Camera className="h-6 w-6 text-pink-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Presse & Medienrechte</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-pink-50 border border-pink-100 rounded-xl p-6">
                <h3 className="font-bold text-pink-700 mb-3">Aufzeichnung & Veröffentlichung</h3>
                <p className="text-gray-700 mb-4">
                  Einzelne Ranglisten- und Qualifikationsturniere sowie die <strong>Finalturniere</strong> werden via{" "}
                  <strong>Video aufgezeichnet und veröffentlicht</strong>. Dieses Material dient zur Auswertung des EMD
                  – LION CUP-Events.
                </p>
              </div>

              <div className="bg-pink-50 border border-pink-100 rounded-xl p-6">
                <h3 className="font-bold text-pink-700 mb-3">Einverständniserklärung</h3>
                <p className="text-gray-700 mb-4">
                  Der Spieler/Teilnehmer nimmt mit der Anmeldung zum EMD – LION CUP zur Kenntnis und willigt ein, dass
                  der Veranstalter, <strong>bis auf Widerruf</strong>, gemäß §78 KunstUrhG,{" "}
                  <strong>Fotos und Videos</strong>, die im Rahmen des Turniers aufgenommen wurden, veröffentlicht
                  werden.
                </p>

                <div className="bg-white border border-pink-200 rounded-lg p-4">
                  <h4 className="font-bold text-pink-600 mb-2">Die Rechte umfassen insbesondere:</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Recht zur Sendung, zum Vortrag, zur Dokumentation</li>
                    <li>• Vor- und Aufführung sowie öffentliche Zugänglichkeit</li>
                    <li>• Vervielfältigung, Verbreitung und Wiedergabe von Bild- und Tonträgern</li>
                    <li>• Wiedergabe von Funksendungen</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Turnierleitung */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gray-100 rounded-lg p-2">
                <Gavel className="h-6 w-6 text-gray-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Turnierleitung / Veranstalter</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
                <h3 className="font-bold text-gray-700 mb-3">Befugnisse & Verantwortlichkeiten</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • Die Turnierleitung <strong>agiert selbstständig</strong> und fungiert auch als{" "}
                    <strong>Schiedsrichter</strong>
                  </li>
                  <li>
                    • <strong>Alle Entscheidungen</strong> werden von der Turnierleitung bzw. Veranstalter getroffen und
                    sind <strong>bindend</strong>
                  </li>
                  <li>
                    • Alle Turnierteilnehmer müssen sich <strong>rechtzeitig bei Turnierbeginn selbst vor Ort</strong>{" "}
                    bei der Turnierleitung anmelden
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
                <h3 className="font-bold text-gray-700 mb-3">Turnierstart & Proteste</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • Der EMD – LION CUP muss nach der angegebenen Uhrzeit des Veranstalters{" "}
                    <strong>PÜNKTLICH gestartet</strong> werden
                  </li>
                  <li>
                    • Etwaige Proteste müssen <strong>prompt der Turnierleitung gemeldet</strong> werden, ansonsten sind
                    sie <strong>ungültig</strong>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Wertung und Auszahlung */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-green-100 rounded-lg p-2">
                <Euro className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Wertung und Auszahlung</h2>
            </div>
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-100 rounded-xl p-6">
                <h3 className="font-bold text-green-700 mb-3">Preispool-Zusammensetzung</h3>
                <p className="text-gray-700 mb-4">In diesen Pott gehen:</p>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • Pro Turnier und Teilnehmer gesammelte <strong>€ 4,00</strong>
                  </li>
                  <li>
                    • Teilnahmebeitrag einmalig <strong>€ 5,00</strong> (Berechtigung für 34 Turniertage)
                  </li>
                  <li>
                    • Qualifizierte Teilnehmer einmalig <strong>€ 5,00</strong> (Berechtigung für Finaltag)
                  </li>
                  <li>
                    • Wirt-Sponsoring einmalig bis 500 Teilnahmen = <strong>€ 100,00</strong>
                  </li>
                  <li>
                    • Wirt-Sponsoring einmalig ab 501 Teilnahmen = <strong>€ 250,00</strong>
                  </li>
                </ul>
                <p className="text-sm text-green-600 mt-3">
                  Diese werden wie unten aufgelistet in Prozente aufgeteilt.
                </p>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-xl p-6">
                <h3 className="font-bold text-green-700 mb-3">Auszahlungsübersicht</h3>
                <div className="space-y-4">
                  <div className="bg-white border border-green-200 rounded-lg p-4">
                    <p className="font-bold text-green-600 mb-2">100% Auszahlung nach Final-Spieltag</p>
                    <p className="text-gray-700">1.-5. Platz bei Oberer Tabelle und Unterer Tabelle</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white border border-green-200 rounded-lg p-4">
                      <h4 className="font-bold text-green-600 mb-2">Obere Tabelle (70% vom Gesamtpott)</h4>
                      <div className="space-y-1 text-sm text-gray-700">
                        <div className="flex justify-between">
                          <span>1. Platz:</span>
                          <span className="font-bold">30%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>2. Platz:</span>
                          <span className="font-bold">25%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>3. Platz:</span>
                          <span className="font-bold">20%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>4. Platz:</span>
                          <span className="font-bold">15%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>5. Platz:</span>
                          <span className="font-bold">10%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-green-200 rounded-lg p-4">
                      <h4 className="font-bold text-green-600 mb-2">Untere Tabelle (30% vom Gesamtpott)</h4>
                      <div className="space-y-1 text-sm text-gray-700">
                        <div className="flex justify-between">
                          <span>1. Platz:</span>
                          <span className="font-bold">30%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>2. Platz:</span>
                          <span className="font-bold">25%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>3. Platz:</span>
                          <span className="font-bold">20%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>4. Platz:</span>
                          <span className="font-bold">15%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>5. Platz:</span>
                          <span className="font-bold">10%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h3 className="font-bold text-yellow-700 mb-2">Entscheidung bei Punktegleichheit nach Finaltag</h3>
                <p className="text-gray-700">
                  <strong>Reihenfolge der Entscheidungskriterien:</strong>
                  <br />
                  1. Tabellenpunkte → 2. Check-Punkte → 3. Antritte (zuletzt)
                </p>
              </div>
            </div>
          </motion.div>

          {/* Footer Hinweis */}
          <motion.div variants={itemVariants} className="text-center">
            <div className="bg-gray-100 border border-gray-200 rounded-xl p-6">
              <p className="text-gray-600 text-sm">
                <strong>Druck- und Satzfehler vorbehalten!</strong>
                <br />
                Stand: Herbst 2025
              </p>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
