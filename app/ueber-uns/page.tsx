"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Trophy, Heart, Target, Mail, ExternalLink } from "lucide-react"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } },
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[20px] border border-orange-400/20 bg-orange-400/10 p-4 text-center ">
      <div className="text-3xl font-semibold text-orange-300">{value}</div>
      <div className="mt-1 text-sm font-bold text-muted-foreground">{label}</div>
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
    <div className="rounded-[22px] border border-white/10 bg-white/5 p-5 shadow-[0_18px_55px_-44px_rgba(0,0,0,.95)] ">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl border border-orange-400/20 bg-orange-400/10 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
        </div>
      </div>
    </div>
  )
}

export default function UberUnsPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-white font-sans">
      <Header />

      {/* Stabiler Hintergrund wie im Member-Profil – ohne Fade/Flackern */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-background" aria-hidden="true" />

      {/* fixed header offset */}
      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">
        <motion.div
          className="w-full"
          variants={containerVariants}
          initial={false}
          animate="visible"
        >
          {/*  */}
          <motion.div variants={itemVariants} className="mb-5 sm:mb-6">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-card shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)]  sm:rounded-[34px]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,.08),transparent_34%,rgba(14,165,233,.06)_78%,transparent)]" />
              <div className="pointer-events-none absolute -left-20 top-[-120px] h-80 w-80 rounded-full bg-orange-500/15 blur-[110px]" />
              <div className="relative flex items-start gap-4 p-4 sm:p-6 lg:p-8 xl:p-9">
                <div className="w-11 h-11 rounded-2xl border border-orange-400/20 bg-orange-400/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-orange-300" />
                </div>
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-orange-400" />Verein · Gemeinschaft</div>
                  <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">Über uns</h1>
                  <p className="mt-2 text-sm font-medium text-muted-foreground">
                    EMOJI&apos;S DARTVEREIN – mehr als ein Verein: <span className="font-semibold">Dart-Familie</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Gemeinschaft • Turniere • Liga • Spaß am Spiel</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Warum */}
          <motion.div variants={itemVariants} className="space-y-4">
            <Card className="rounded-[24px] border border-white/10 bg-card shadow-[0_24px_80px_-54px_rgba(0,0,0,.95)] ">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-300" />
                  Warum EMOJI&apos;S DARTVEREIN?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Feature
                  icon={<Trophy className="w-5 h-5 text-orange-300" />}
                  title="Dynamische Liga"
                  text="Tritt unserer lebhaften Liga bei und miss dich mit E-Dart- und Steel-Dart Spielern."
                />
                <Feature
                  icon={<Heart className="w-5 h-5 text-orange-300" />}
                  title="Starke Gemeinschaft"
                  text="Wir sind mehr als ein Verein – wir sind eine Familie. Zusammenhalt und Freundschaft stehen im Fokus."
                />
                <Feature
                  icon={<Target className="w-5 h-5 text-orange-300" />}
                  title="Spannende Turniere"
                  text="Nimm an unseren Turnieren teil und kämpfe mit uns um Erfolge – fair, motivierend, respektvoll."
                />
                <Feature
                  icon={<Users className="w-5 h-5 text-orange-300" />}
                  title="Für alle Niveaus"
                  text="Egal ob Anfänger oder Profi: Bei uns findest du die passende Herausforderung und Unterstützung."
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Zahlen */}
          <motion.div variants={itemVariants} className="mt-5">
            <Card className="rounded-[24px] border border-white/10 bg-card shadow-[0_24px_80px_-54px_rgba(0,0,0,.95)]  overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-orange-300" />
                  Unsere Stärke in Zahlen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Stat value="50+" label="Mitglieder" />
                  <Stat value="60+" label="Aktive Spieler" />
                  <Stat value="10+" label="Teams" />
                </div>

                <div className="rounded-[20px] border border-orange-400/20 bg-orange-400/10 p-4">
                  <p className="text-sm leading-relaxed text-white/65">
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
            <Card className="rounded-[24px] border border-white/10 bg-card shadow-[0_24px_80px_-54px_rgba(0,0,0,.95)] ">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <Heart className="w-5 h-5 text-orange-300" />
                  Unsere Philosophie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dart-Familie</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">
                    Wir sehen uns nicht als „normalen“ Verein. Wir sind eine kleine Dart-Familie – das Soziale steht
                    bei uns an erster Stelle. Bei uns kommt jeder zu Wort, dem etwas am Herzen liegt.
                  </p>
                </div>

                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Herausforderungen & Ziele</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">
                    Wir nehmen Herausforderungen an – dort, wo andere scheitern. Wir setzen uns Ziele und machen das
                    Unsichtbare sichtbar: Schritt für Schritt.
                  </p>
                </div>

                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gemeinschaft</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">
                    Wir agieren nicht als Einzelne: Turniere, Meisterschaften und Training erleben wir gemeinsam. Auch
                    neben dem Sport sind wir gern zusammen unterwegs – Ausflüge, Aktivitäten und Vereinsleben.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* CTA */}
          <motion.div variants={itemVariants} className="mt-5">
            <div className="overflow-hidden rounded-[24px] border border-orange-400/20 bg-card shadow-[0_26px_85px_-55px_rgba(249,115,22,.35)] ">
              <div className="text-foreground h-1 bg-card   " />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl border border-orange-400/20 bg-orange-400/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-orange-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white">Werde Teil unserer Familie!</p>
                    <p className="mt-2 text-sm font-medium text-muted-foreground">
                      Du willst dabei sein, neue Leute kennenlernen und Dart feiern? Schreib uns – wir freuen uns!
                    </p>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <Button
                        className="h-10 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                        onClick={() => (window.location.href = "mailto:office@emojisdartverein.com")}
                        type="button"
                      >
                        Mail
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>

                      <Button
                        variant="outline"
                        className="h-10 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold"
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