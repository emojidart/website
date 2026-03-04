"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Trophy, Heart, Target, Mail, ExternalLink } from "lucide-react"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } },
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-center">
      <div className="text-3xl font-black text-orange-700">{value}</div>
      <div className="text-sm font-bold text-orange-900/80 mt-1">{label}</div>
    </div>
  )
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-gray-900">{title}</p>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  )
}

export default function UberUnsPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 overflow-x-hidden">
      <Header />

      {/* fixed header offset */}
      <main className="pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/*  */}
          <motion.div variants={itemVariants} className="mb-5 sm:mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="p-4 sm:p-5 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black">Über uns</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    EMOJI&apos;S DARTVEREIN – mehr als ein Verein: <span className="font-semibold">Dart-Familie</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Gemeinschaft • Turniere • Liga • Spaß am Spiel</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Warum */}
          <motion.div variants={itemVariants} className="space-y-4">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base font-black flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  Warum EMOJI&apos;S DARTVEREIN?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Feature
                  icon={<Trophy className="w-5 h-5 text-orange-600" />}
                  title="Dynamische Liga"
                  text="Tritt unserer lebhaften Liga bei und miss dich mit E-Dart- und Steel-Dart Spielern."
                />
                <Feature
                  icon={<Heart className="w-5 h-5 text-orange-600" />}
                  title="Starke Gemeinschaft"
                  text="Wir sind mehr als ein Verein – wir sind eine Familie. Zusammenhalt und Freundschaft stehen im Fokus."
                />
                <Feature
                  icon={<Target className="w-5 h-5 text-orange-600" />}
                  title="Spannende Turniere"
                  text="Nimm an unseren Turnieren teil und kämpfe mit uns um Erfolge – fair, motivierend, respektvoll."
                />
                <Feature
                  icon={<Users className="w-5 h-5 text-orange-600" />}
                  title="Für alle Niveaus"
                  text="Egal ob Anfänger oder Profi: Bei uns findest du die passende Herausforderung und Unterstützung."
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Zahlen */}
          <motion.div variants={itemVariants} className="mt-5">
            <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base font-black flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-orange-600" />
                  Unsere Stärke in Zahlen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Stat value="50+" label="Mitglieder" />
                  <Stat value="60+" label="Aktive Spieler" />
                  <Stat value="10+" label="Teams" />
                </div>

                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Mit über 50 Mitgliedern und mehr als 60 aktiven Spielern sind wir einer der wachsenden Dartvereine
                    der Region. Aktuell stellen wir 5 E-Dart- und 5 Steeldart-Mannschaften sowie mehrere Teams für
                    Nebenbewerbe – Tendenz steigend.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Philosophie */}
          <motion.div variants={itemVariants} className="mt-5">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base font-black flex items-center gap-2">
                  <Heart className="w-5 h-5 text-orange-600" />
                  Unsere Philosophie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Dart-Familie</p>
                  <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                    Wir sehen uns nicht als „normalen“ Verein. Wir sind eine kleine Dart-Familie – das Soziale steht
                    bei uns an erster Stelle. Bei uns kommt jeder zu Wort, dem etwas am Herzen liegt.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Herausforderungen & Ziele</p>
                  <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                    Wir nehmen Herausforderungen an – dort, wo andere scheitern. Wir setzen uns Ziele und machen das
                    Unsichtbare sichtbar: Schritt für Schritt.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Gemeinschaft</p>
                  <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                    Wir agieren nicht als Einzelne: Turniere, Meisterschaften und Training erleben wir gemeinsam. Auch
                    neben dem Sport sind wir gern zusammen unterwegs – Ausflüge, Aktivitäten und Vereinsleben.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* CTA */}
          <motion.div variants={itemVariants} className="mt-5">
            <div className="rounded-2xl border border-orange-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-black text-gray-900">Werde Teil unserer Familie!</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Du willst dabei sein, neue Leute kennenlernen und Dart feiern? Schreib uns – wir freuen uns!
                    </p>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <Button
                        className="h-10 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black"
                        onClick={() => (window.location.href = "mailto:office@emojisdartverein.com")}
                        type="button"
                      >
                        Mail
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>

                      <Button
                        variant="outline"
                        className="h-10 rounded-2xl border-gray-200 bg-white hover:bg-gray-50 font-black"
                        onClick={() => (window.location.href = "/kontakt")}
                        type="button"
                      >
                        Kontakt
                      </Button>
                    </div>

                    
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}