"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Trophy, Target, Users, TrendingUp, Mail, Phone } from "lucide-react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

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

export default function SponsoringPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 overflow-x-hidden">
      <Header />

      <main className="pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* App Header Card */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="p-4 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black">Sponsoring</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Partnerschaften, Reichweite und Sichtbarkeit – gemeinsam für den Dartsport.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.section variants={itemVariants} className="mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5">
              <p className="text-xs font-black uppercase tracking-wider text-orange-600 mb-3">Auf einen Blick</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: "50+", label: "Aktive Mitglieder" },
                  { value: "50+", label: "Turniere pro Jahr" },
                  { value: "1.000+", label: "Zuschauer jährlich" },
                  { value: "10+", label: "Jahre Tradition" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
                    <div className="text-2xl sm:text-3xl font-black text-gray-900">{s.value}</div>
                    <div className="text-[11px] sm:text-xs text-gray-600 font-semibold mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Benefits */}
          <motion.section variants={itemVariants} className="mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-wider text-orange-600">Ihre Vorteile</p>
                <h2 className="text-base sm:text-lg font-black text-gray-900 mt-1">Warum uns sponsern?</h2>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  Als Sponsor profitieren Sie von vielfältigen Möglichkeiten zur Markenpräsentation und erreichen eine
                  engagierte Zielgruppe.
                </p>
              </div>

              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-2xl border border-gray-200 shadow-sm p-4">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200">
                    <Target className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-black text-gray-900 mb-1">Hohe Sichtbarkeit</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Ihr Logo auf Trikots, Bannern und bei allen Veranstaltungen prominent platziert.
                  </p>
                </Card>

                <Card className="rounded-2xl border border-gray-200 shadow-sm p-4">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200">
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-black text-gray-900 mb-1">Zielgruppe erreichen</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Direkter Zugang zu einer sportbegeisterten und loyalen Community in der Region.
                  </p>
                </Card>

                <Card className="rounded-2xl border border-gray-200 shadow-sm p-4">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200">
                    <Trophy className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-black text-gray-900 mb-1">Prestige & Image</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Verbinden Sie Ihre Marke mit Erfolg, Teamgeist und sportlicher Exzellenz.
                  </p>
                </Card>

                <Card className="rounded-2xl border border-gray-200 shadow-sm p-4">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-black text-gray-900 mb-1">Wachsende Reichweite</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Profitieren Sie von unserer stetig wachsenden Social-Media-Präsenz und Medienberichterstattung.
                  </p>
                </Card>
              </div>
            </div>
          </motion.section>

          {/* CTA */}
          <motion.section variants={itemVariants}>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="p-4 sm:p-6 text-center">
                <h2 className="text-base sm:text-lg font-black text-gray-900">Bereit für eine Partnerschaft?</h2>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  Kontaktieren Sie uns noch heute und lassen Sie uns gemeinsam die perfekte Sponsoring-Lösung für Ihr
                  Unternehmen finden.
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white font-black w-full sm:w-auto">
                    <Mail className="mr-2 h-5 w-5" />
                    E-Mail senden
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black w-full sm:w-auto"
                  >
                    <Phone className="mr-2 h-5 w-5" />
                    Anrufen
                  </Button>
                </div>
              </div>
            </div>
          </motion.section>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}