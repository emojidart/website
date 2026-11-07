"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Trophy, Target, Users, TrendingUp, Mail, Phone } from "lucide-react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const containerVariants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
}

const itemVariants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
}

export default function SponsoringPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background pb-24 text-white md:pb-0">
      <Header variant="app" title="Sponsoring" subtitle="Partnerschaften & Sichtbarkeit" backHref="/" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-background" aria-hidden="true" />

      <main className="relative z-10 pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full max-w-[var(--emd-content-max)] px-2 py-4 sm:px-4 sm:py-5 lg:px-5 xl:px-6 2xl:px-8"
          variants={containerVariants}
          initial={false}
          animate="visible"
        >
          {/* App Header Card */}
          <motion.div variants={itemVariants} className="mb-4 sm:mb-5">
            <div className="overflow-hidden rounded-[22px] border border-white/10 bg-card shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
              <div className="text-foreground h-1.5 bg-card  " />
              <div className="flex items-start gap-3 p-4 sm:p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-300/20 bg-orange-500/10">
                  <Trophy className="h-5 w-5 text-orange-300" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold text-white sm:text-xl">Sponsoring</h1>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">Partnerschaften, Reichweite und Sichtbarkeit – gemeinsam für den Dartsport.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.section variants={itemVariants} className="mb-4 sm:mb-5">
            <div className="rounded-2xl border border-white/10 bg-card shadow-sm p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-300 mb-3">Auf einen Blick</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: "50+", label: "Aktive Mitglieder" },
                  { value: "50+", label: "Turniere pro Jahr" },
                  { value: "1.000+", label: "Zuschauer jährlich" },
                  { value: "10+", label: "Jahre Tradition" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border bg-white/5 p-4 text-center">
                    <div className="text-2xl sm:text-3xl font-semibold text-white">{s.value}</div>
                    <div className="text-xs sm:text-xs text-muted-foreground font-semibold mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Benefits */}
          <motion.section variants={itemVariants} className="mb-4 sm:mb-5">
            <div className="rounded-2xl border border-white/10 bg-card shadow-sm p-4 sm:p-5">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">Ihre Vorteile</p>
                <h2 className="text-base sm:text-lg font-semibold text-white mt-1">Warum uns sponsern?</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Als Sponsor profitieren Sie von vielfältigen Möglichkeiten zur Markenpräsentation und erreichen eine
                  engagierte Zielgruppe.
                </p>
              </div>

              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-[22px] border border-white/10 bg-card shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] p-4">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-300/20">
                    <Target className="h-5 w-5 text-orange-300" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Hohe Sichtbarkeit</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ihr Logo auf Trikots, Bannern und bei allen Veranstaltungen prominent platziert.
                  </p>
                </Card>

                <Card className="rounded-[22px] border border-white/10 bg-card shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] p-4">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-300/20">
                    <Users className="h-5 w-5 text-orange-300" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Zielgruppe erreichen</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Direkter Zugang zu einer sportbegeisterten und loyalen Community in der Region.
                  </p>
                </Card>

                <Card className="rounded-[22px] border border-white/10 bg-card shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] p-4">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-300/20">
                    <Trophy className="h-5 w-5 text-orange-300" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Prestige & Image</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Verbinden Sie Ihre Marke mit Erfolg, Teamgeist und sportlicher Exzellenz.
                  </p>
                </Card>

                <Card className="rounded-[22px] border border-white/10 bg-card shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] p-4">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-300/20">
                    <TrendingUp className="h-5 w-5 text-orange-300" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Wachsende Reichweite</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Profitieren Sie von unserer stetig wachsenden Social-Media-Präsenz und Medienberichterstattung.
                  </p>
                </Card>
              </div>
            </div>
          </motion.section>

          {/* CTA */}
          <motion.section variants={itemVariants}>
            <div className="rounded-2xl border border-orange-300/20 bg-orange-500/10 shadow-sm overflow-hidden">
              <div className="text-foreground h-2 bg-card  " />
              <div className="p-4 sm:p-6 text-center">
                <h2 className="text-base sm:text-lg font-semibold text-white">Bereit für eine Partnerschaft?</h2>
                <p className="text-sm text-white/70 mt-2 leading-relaxed">
                  Kontaktieren Sie uns noch heute und lassen Sie uns gemeinsam die perfekte Sponsoring-Lösung für Ihr
                  Unternehmen finden.
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white font-semibold w-full sm:w-auto">
                    <Mail className="mr-2 h-5 w-5" />
                    E-Mail senden
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-border bg-card hover:bg-white/5 text-white font-semibold w-full sm:w-auto"
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