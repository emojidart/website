"use client"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Target, Users, Trophy, Heart } from "lucide-react"
import { motion } from "framer-motion"

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

export default function UberUnsPage() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <motion.div
        className="container mx-auto px-4 md:px-6 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="text-center mb-12">
          <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-8 md:p-12 text-white">
            <div className="bg-white/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 backdrop-blur-sm">
              <Users className="h-12 w-12 text-white mx-auto" />
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-4">
              <span className="block text-white">ÜBER UNS</span>
              <span className="block text-orange-200">UNSERE DART-FAMILIE</span>
            </h1>
            <p className="text-lg md:text-xl font-bold uppercase text-orange-100 mb-4">Lerne unseren Verein kennen</p>
            <div className="bg-orange-600/30 rounded-xl p-4 text-orange-100">
              <p className="text-sm italic">Mehr als ein Verein – wir sind eine Familie</p>
            </div>
          </div>
        </motion.div>

        <main className="container mx-auto px-4 md:px-6 py-8">
          <div className="space-y-16 text-foreground/80">
            <section>
              <h2 className="text-3xl md:text-4xl font-bold mb-12 text-foreground text-center">
                Warum EMOJI'S DARTVEREIN?
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-card rounded-lg p-6 border border-border hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg flex-shrink-0">
                      <Trophy className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-foreground">Dynamische Liga</h3>
                      <p className="text-foreground/70">
                        Treten Sie unserer lebhaften Liga bei und messen Sie sich mit E-Dart und Steel-Dart Spielern.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg p-6 border border-border hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg flex-shrink-0">
                      <Heart className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-foreground">Starke Gemeinschaft</h3>
                      <p className="text-foreground/70">
                        Wir sind mehr als ein Verein – wir sind eine Familie. Erleben Sie Zusammenhalt und Freundschaft.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg p-6 border border-border hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg flex-shrink-0">
                      <Target className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-foreground">Spannende Turniere</h3>
                      <p className="text-foreground/70">
                        Nehmen Sie an unseren hochkarätigen Turnieren teil und kämpfen Sie um Ruhm und Preise.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg p-6 border border-border hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg flex-shrink-0">
                      <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-foreground">Für alle Niveaus</h3>
                      <p className="text-foreground/70">
                        Egal ob Anfänger oder Profi, bei uns finden Sie die richtige Herausforderung und Unterstützung.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 rounded-lg p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-12 text-foreground text-center">
                Unsere Stärke in Zahlen
              </h2>
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-orange-600 dark:text-orange-400 mb-2">50+</div>
                  <p className="text-lg text-foreground/70">Mitglieder</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-orange-600 dark:text-orange-400 mb-2">60+</div>
                  <p className="text-lg text-foreground/70">Aktive Spieler</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-orange-600 dark:text-orange-400 mb-2">10+</div>
                  <p className="text-lg text-foreground/70">Mannschaften</p>
                </div>
              </div>
              <p className="text-center text-foreground/80 leading-relaxed">
                Mit über 50 Mitgliedern und mehr als 60 aktiven Spielern sind wir einer der wachsenden Dartvereine der Region.
Aktuell stellen wir 5 E-Dart- und 5 Steeldart-Mannschaften sowie mehrere Teams für Nebenbewerbe – Tendenz weiter steigend.
              </p>
            </section>

            <section>
              <h2 className="text-3xl md:text-4xl font-bold mb-12 text-foreground text-center">Unsere Philosophie</h2>
              <div className="space-y-8">
                <div className="border-l-4 border-orange-500 pl-6 py-2">
                  <h3 className="text-2xl font-semibold mb-3 text-foreground">Dart-Familie</h3>
                  <p className="text-foreground/80 leading-relaxed">
                    WIR sehen uns nicht als "normaler" Verein. WIR sehen uns als kleine Dart-Familie, das Soziale steht
                    bei uns an ERSTER Stelle. WIR sind auch privat eng untereinander verbunden, bei uns kommt jeder zu
                    Wort, dem etwas am Herzen liegt.
                  </p>
                </div>

                <div className="border-l-4 border-orange-500 pl-6 py-2">
                  <h3 className="text-2xl font-semibold mb-3 text-foreground">Herausforderungen & Ziele</h3>
                  <p className="text-foreground/80 leading-relaxed">
                    WIR nehmen Herausforderungen an, diese fangen da an, wo andere scheitern. WIR setzen uns Ziele, dies
                    ist der erste Weg, um das Unsichtbare ins Sichtbare zu verwandeln.
                  </p>
                </div>

                <div className="border-l-4 border-orange-500 pl-6 py-2">
                  <h3 className="text-2xl font-semibold mb-3 text-foreground">Gemeinschaft</h3>
                  <p className="text-foreground/80 leading-relaxed">
                    WIR agieren nicht als einzelne Personen, sondern spielen auf Turnieren, Meisterschaften und im
                    Training in der Gemeinschaft. Wir sind auch neben dem Sport sehr gerne unterwegs auf Ausflügen oder
                    anderen Aktivitäten neben dem Dartsport.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-orange-600 dark:bg-orange-700 text-white rounded-lg p-8 md:p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Werde Teil unserer Familie!</h2>
              <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
                Interessiert dich Dart? Möchtest du neue Freunde treffen und Teil einer großartigen Gemeinschaft werden?
                Dann kontaktiere uns noch heute!
              </p>
              <a
                href="mailto:office@emojisdartverein.com"
                className="inline-block bg-white text-orange-600 dark:text-orange-700 px-8 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
              >
                Kontaktiere uns
              </a>
            </section>
          </div>
        </main>
      </motion.div>

      <MobileBottomNav />
    </div>
  )
}
