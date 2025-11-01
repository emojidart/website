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
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Header />
      <main className="pt-8 pb-24">
        <motion.div
          className="container mx-auto px-4 md:px-6 py-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="text-center mb-12">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-8 md:p-12 text-white">
              <div className="bg-white/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 backdrop-blur-sm">
                <Trophy className="h-12 w-12 text-white mx-auto" />
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-4">
                <span className="block text-white">SPONSORING</span>
                <span className="block text-orange-200">PARTNERSCHAFTEN</span>
              </h1>
              <p className="text-lg md:text-xl font-bold uppercase text-orange-100 mb-4">
                Werden Sie Teil unserer Erfolgsgeschichte
              </p>
              <div className="bg-orange-600/30 rounded-xl p-4 text-orange-100">
                <p className="text-sm italic">Hohe Reichweite und Sichtbarkeit in der Region</p>
              </div>
            </div>
          </motion.div>

          <section className="border-y bg-muted/30 py-16 mb-8">
            <div className="grid gap-8 md:grid-cols-4">
              <div className="text-center">
                <div className="mb-2 text-4xl font-bold text-primary">50+</div>
                <div className="text-sm text-muted-foreground">Aktive Mitglieder</div>
              </div>
              <div className="text-center">
                <div className="mb-2 text-4xl font-bold text-primary">50+</div>
                <div className="text-sm text-muted-foreground">Turniere pro Jahr</div>
              </div>
              <div className="text-center">
                <div className="mb-2 text-4xl font-bold text-primary">1.000+</div>
                <div className="text-sm text-muted-foreground">Zuschauer jährlich</div>
              </div>
              <div className="text-center">
                <div className="mb-2 text-4xl font-bold text-primary">10+</div>
                <div className="text-sm text-muted-foreground">Jahre Tradition</div>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <div className="mb-12 text-center">
              <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">Ihre Vorteile</p>
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">Warum uns sponsern?</h2>
              <p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed">
                Als Sponsor profitieren Sie von vielfältigen Möglichkeiten zur Markenpräsentation und erreichen eine
                engagierte Zielgruppe.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <Card className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Hohe Sichtbarkeit</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ihr Logo auf Trikots, Bannern und bei allen Veranstaltungen prominent platziert.
                </p>
              </Card>

              <Card className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Zielgruppe erreichen</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Direkter Zugang zu einer sportbegeisterten und loyalen Community in der Region.
                </p>
              </Card>

              <Card className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Prestige & Image</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Verbinden Sie Ihre Marke mit Erfolg, Teamgeist und sportlicher Exzellenz.
                </p>
              </Card>

              <Card className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Wachsende Reichweite</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Profitieren Sie von unserer stetig wachsenden Social-Media-Präsenz und Medienberichterstattung.
                </p>
              </Card>
            </div>
          </section>

          <section>
            <Card className="overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5">
              <div className="p-12 text-center md:p-16">
                <h2 className="mb-4 text-3xl font-bold md:text-4xl">Bereit für eine Partnerschaft?</h2>
                <p className="mx-auto mb-8 max-w-2xl text-muted-foreground leading-relaxed">
                  Kontaktieren Sie uns noch heute und lassen Sie uns gemeinsam die perfekte Sponsoring-Lösung für Ihr
                  Unternehmen finden.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                  <Button size="lg" className="text-base">
                    <Mail className="mr-2 h-5 w-5" />
                    E-Mail senden
                  </Button>
                  <Button size="lg" variant="outline" className="text-base bg-transparent">
                    <Phone className="mr-2 h-5 w-5" />
                    Anrufen
                  </Button>
                </div>
              </div>
            </Card>
          </section>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
