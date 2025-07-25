"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Dices, Trophy, Zap } from "lucide-react"

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

const cardItemVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 10 } },
}

export function FeaturesSection() {
  return (
    <motion.section
      className="py-20 px-4 md:px-8 bg-brutal-bg text-brutal-text"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="max-w-6xl mx-auto text-center">
        <motion.h2
          className="text-5xl md:text-6xl font-extrabold uppercase mb-16 text-brutal-accent-gold drop-shadow-lg"
          variants={cardItemVariants}
        >
          Warum EMOJIS DARTVEREIN?
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <motion.div variants={cardItemVariants}>
            <Card className="bg-brutal-card-bg border-brutal-border shadow-2xl rounded-lg p-8 h-full flex flex-col justify-center items-center text-center transform hover:scale-105 transition-transform duration-300">
              <CardHeader className="pb-4">
                <Zap className="h-16 w-16 text-brutal-accent-red mx-auto mb-4" />
                <CardTitle className="text-3xl font-bold text-brutal-text uppercase">Dynamische Liga</CardTitle>
              </CardHeader>
              <CardContent className="text-lg text-brutal-text-muted">
                Treten Sie unserer lebhaften Liga bei und messen Sie sich mit den Besten in E-Dart und Steel-Dart.
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardItemVariants}>
            <Card className="bg-brutal-card-bg border-brutal-border shadow-2xl rounded-lg p-8 h-full flex flex-col justify-center items-center text-center transform hover:scale-105 transition-transform duration-300">
              <CardHeader className="pb-4">
                <Users className="h-16 w-16 text-brutal-accent-gold mx-auto mb-4" />
                <CardTitle className="text-3xl font-bold text-brutal-text uppercase">Starke Gemeinschaft</CardTitle>
              </CardHeader>
              <CardContent className="text-lg text-brutal-text-muted">
                Wir sind mehr als ein Verein – wir sind eine Familie. Erleben Sie Zusammenhalt und Freundschaft.
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardItemVariants}>
            <Card className="bg-brutal-card-bg border-brutal-border shadow-2xl rounded-lg p-8 h-full flex flex-col justify-center items-center text-center transform hover:scale-105 transition-transform duration-300">
              <CardHeader className="pb-4">
                <Trophy className="h-16 w-16 text-brutal-accent-red mx-auto mb-4" />
                <CardTitle className="text-3xl font-bold text-brutal-text uppercase">Spannende Turniere</CardTitle>
              </CardHeader>
              <CardContent className="text-lg text-brutal-text-muted">
                Nehmen Sie an unseren hochkarätigen Turnieren teil und kämpfen Sie um Ruhm und Preise.
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardItemVariants}>
            <Card className="bg-brutal-card-bg border-brutal-border shadow-2xl rounded-lg p-8 h-full flex flex-col justify-center items-center text-center transform hover:scale-105 transition-transform duration-300">
              <CardHeader className="pb-4">
                <Dices className="h-16 w-16 text-brutal-accent-gold mx-auto mb-4" />
                <CardTitle className="text-3xl font-bold text-brutal-text uppercase">Für alle Niveaus</CardTitle>
              </CardHeader>
              <CardContent className="text-lg text-brutal-text-muted">
                Egal ob Anfänger oder Profi, bei uns finden Sie die richtige Herausforderung und Unterstützung.
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}
