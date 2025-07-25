"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Users, Dices, Heart, Target, Lightbulb, Phone, Mail, Globe } from "lucide-react"

const sectionVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
}

const cardItemVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 10 } },
}

export function AboutUsSection() {
  return (
    <motion.section
      className="py-20 px-4 md:px-8 bg-brutal-bg text-brutal-text"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2
          className="text-5xl md:text-6xl font-extrabold uppercase mb-16 text-brutal-accent-gold text-center drop-shadow-lg"
          variants={itemVariants}
        >
          WIR SIND MEHR
        </motion.h2>

        {/* Section 1: Unsere Geschichte */}
        <motion.div
          className="mb-20"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <Card className="bg-brutal-card-bg border-brutal-border shadow-xl rounded-lg p-8">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold text-brutal-accent-red uppercase">Unsere Geschichte</CardTitle>
              <Separator className="my-4 bg-brutal-accent-red/50" />
            </CardHeader>
            <CardContent className="text-lg leading-relaxed space-y-6 text-brutal-text-muted">
              <motion.p variants={itemVariants}>
                WIR haben vor einiger Zeit aus Spaß am Dartsport uns zuerst als einzelne Mannschaft versucht. Jeder auf
                seine eigene Art und Weise.
              </motion.p>
              <motion.p variants={itemVariants}>
                Aber nach langer Überlegung, guten Ergebnissen und Anfragen aus dem Bekanntenkreis haben WIR uns ein
                Herz gefasst und 2017 etwas Festes aus den ganzen Ideen herausgearbeitet.
              </motion.p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 2: Unsere Stärke in Zahlen */}
        <motion.div
          className="mb-20"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <h3 className="text-4xl font-bold text-center text-brutal-text mb-10 drop-shadow-md uppercase">
            Unsere Stärke in Zahlen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div variants={cardItemVariants}>
              <Card className="bg-brutal-card-bg border-brutal-border shadow-xl rounded-lg p-6 text-center">
                <Users className="h-12 w-12 text-brutal-accent-red mx-auto mb-4" />
                <p className="text-5xl font-extrabold text-brutal-accent-gold">40+</p>
                <p className="text-lg text-brutal-text-muted uppercase">Mitglieder</p>
              </Card>
            </motion.div>
            <motion.div variants={cardItemVariants}>
              <Card className="bg-brutal-card-bg border-brutal-border shadow-xl rounded-lg p-6 text-center">
                <Dices className="h-12 w-12 text-brutal-accent-red mx-auto mb-4" />
                <p className="text-5xl font-extrabold text-brutal-accent-gold">50</p>
                <p className="text-lg text-brutal-text-muted uppercase">Aktive Spieler</p>
              </Card>
            </motion.div>
            <motion.div variants={cardItemVariants}>
              <Card className="bg-brutal-card-bg border-brutal-border shadow-xl rounded-lg p-6 text-center">
                <Target className="h-12 w-12 text-brutal-accent-red mx-auto mb-4" />
                <p className="text-5xl font-extrabold text-brutal-accent-gold">12+</p>
                <p className="text-lg text-brutal-text-muted uppercase">Mannschaften (E-Dart & Steel-Dart)</p>
              </Card>
            </motion.div>
          </div>
          <motion.p variants={itemVariants} className="text-center text-lg mt-8 text-brutal-text-muted">
            WIR sind mittlerweile mehr als 40 Mitglieder und gesamt 50 Spieler aktuell auf 7 E-Dart Mannschaften, 5
            Steeldart Mannschaften und einigen Nebenbewerb-Mannschaften – Tendenz steigend.
          </motion.p>
        </motion.div>

        {/* Section 3: Unsere Philosophie */}
        <motion.div
          className="mb-20"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <h3 className="text-4xl font-bold text-center text-brutal-text mb-10 drop-shadow-md uppercase">
            Unsere Philosophie
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div variants={cardItemVariants}>
              <Card className="bg-brutal-card-bg border-brutal-border shadow-xl rounded-lg p-6">
                <CardHeader className="flex-row items-center gap-4 pb-4">
                  <Heart className="h-8 w-8 text-brutal-accent-red" />
                  <CardTitle className="text-2xl font-bold text-brutal-text uppercase">Dart-Familie</CardTitle>
                </CardHeader>
                <CardContent className="text-lg text-brutal-text-muted">
                  WIR sehen uns nicht als "normaler" Verein. WIR sehen uns als kleine Dart-Familie, das Soziale steht
                  bei uns an ERSTER Stelle. WIR sind auch privat eng untereinander verbunden, bei uns kommt jeder zu
                  Wort, dem etwas am Herzen liegt.
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={cardItemVariants}>
              <Card className="bg-brutal-card-bg border-brutal-border shadow-xl rounded-lg p-6">
                <CardHeader className="flex-row items-center gap-4 pb-4">
                  <Lightbulb className="h-8 w-8 text-brutal-accent-red" />
                  <CardTitle className="text-2xl font-bold text-brutal-text uppercase">
                    Herausforderungen & Ziele
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-lg text-brutal-text-muted">
                  WIR nehmen Herausforderungen an, diese fangen da an, wo andere scheitern. WIR setzen uns Ziele, dies
                  ist der erste Weg, um das Unsichtbare ins Sichtbare zu verwandeln.
                </CardContent>
              </Card>
            </motion.div>
          </div>
          <motion.p variants={itemVariants} className="text-center text-lg mt-8 text-brutal-text-muted">
            WIR agieren nicht als einzelne Personen, sondern spielen auf Turnieren, Meisterschaften und im Training in
            der Gemeinschaft. Wir sind auch neben dem Sport sehr gerne unterwegs auf Ausflügen oder anderen Aktivitäten
            neben dem Dartsport.
          </motion.p>
        </motion.div>

        {/* Section 4: Zitate */}
        <motion.div
          className="mb-20 bg-brutal-card-bg p-10 rounded-lg shadow-inner border border-brutal-border"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.p
            className="text-3xl md:text-4xl font-bold italic text-brutal-accent-gold text-center mb-8 drop-shadow-md"
            variants={itemVariants}
          >
            "Wir sind mehr" steht für uns ganz Oben!
          </motion.p>
          <motion.div
            className="text-2xl font-semibold text-brutal-text-muted space-y-4 text-center"
            variants={sectionVariants}
          >
            <motion.p variants={itemVariants}>"Zusammen kommen ist ein Beginn"</motion.p>
            <motion.p variants={itemVariants}>"Zusammen bleiben ein Fortschritt"</motion.p>
            <motion.p variants={itemVariants}>"Zusammen Arbeiten ein Erfolg"</motion.p>
          </motion.div>
        </motion.div>

        {/* Section 5: WIR SUCHEN DICH - Call to Action */}
        <motion.div
          className="bg-gradient-to-br from-brutal-accent-red to-red-900 p-10 rounded-lg shadow-2xl text-brutal-text text-center"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.h3
            className="text-5xl md:text-6xl font-extrabold uppercase mb-8 drop-shadow-lg"
            variants={itemVariants}
          >
            WIR SUCHEN DICH
          </motion.h3>
          <motion.p variants={itemVariants} className="text-xl leading-relaxed mb-8">
            Ein freundliches "Hallo" an alle Dart-Verrückten bzw. Begeisterten und Freunde und die es noch werden
            wollen! Der Emoj!'s Dartverein sucht genau DICH !!! Um in einem familienfreundlichen Umfeld Spaß zu haben.
            Mit Ehrgeiz, Können und Willen in der Dartszene wollen wir etwas bewegen, das nicht nur eine Eintagsfliege
            ist, sondern etwas Besonderes – genau wie DU!
          </motion.p>
          <motion.p variants={itemVariants} className="text-xl leading-relaxed mb-10">
            Wir suchen also engagierte Personen, die bei unserem Projekt "DART" mitmachen wollen und mit uns gemeinsam
            eine schöne familiäre Zeit verbringen!
          </motion.p>

          <motion.div
            className="flex flex-col md:flex-row justify-center items-center gap-6 text-xl font-semibold"
            variants={sectionVariants}
          >
            <motion.div variants={itemVariants} className="flex items-center gap-3">
              <Phone className="h-6 w-6 text-brutal-accent-gold" />
              <a href="tel:+436604696464" className="underline hover:text-brutal-accent-gold transition-colors">
                0660/4696464
              </a>
            </motion.div>
            <motion.div variants={itemVariants} className="flex items-center gap-3">
              <Mail className="h-6 w-6 text-brutal-accent-gold" />
              <a
                href="mailto:emoji.s.dartvereinev@gmail.com"
                className="underline hover:text-brutal-accent-gold transition-colors"
              >
                emoji.s.dartvereinev@gmail.com
              </a>
            </motion.div>
            <motion.div variants={itemVariants} className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-brutal-accent-gold" />
              <a
                href="https://www.emojisdartverein.at/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-brutal-accent-gold transition-colors"
              >
                emojisdartverein.at
              </a>
            </motion.div>
          </motion.div>

          <motion.p variants={itemVariants} className="text-2xl font-bold mt-12 mb-6">
            WIR SIND MEHR ist unser CREDO und wir würden uns freuen, DICH bald in unserem Verein begrüßen zu können!
          </motion.p>
          <motion.p variants={itemVariants} className="text-4xl font-extrabold text-brutal-accent-gold">
            ALS DANN BIS BALD !!!
          </motion.p>
        </motion.div>
      </div>
    </motion.section>
  )
}
