"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, Mail, Clock, Navigation, ExternalLink } from "lucide-react"
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

export default function KontaktPage() {
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
          {/* App-Header Card */}
          <motion.div variants={itemVariants} className="mb-4 sm:mb-5">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-card shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)]  sm:rounded-[34px]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,.08),transparent_34%,rgba(14,165,233,.06)_78%,transparent)]" />
              <div className="relative flex items-start gap-4 p-4 sm:p-6 lg:p-8 xl:p-9">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                  <MapPin className="h-5 w-5 text-orange-300" />
                </div>
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-orange-400" />Vereinsheim · Salzburg</div>
                  <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">Kontakt & Anfahrt</h1>
                  <p className="mt-2 text-sm font-medium text-muted-foreground">Dart & Freizeit Vereinsheim „Pfeil-OK“ · Wir freuen uns auf deinen Besuch!</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Standort (Map) */}
          <motion.div variants={itemVariants} className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
            <Card className="overflow-hidden rounded-[24px] border border-white/10 bg-card shadow-[0_24px_80px_-54px_rgba(0,0,0,.95)] ">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
                  <MapPin className="w-5 h-5 text-orange-300" />
                  Standort
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative h-[300px] sm:h-[360px] lg:h-[430px]">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2653.8234567890123!2d13.0445678!3d47.8123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x477741234567890a%3A0x1234567890abcdef!2sLinzer%20Bundesstra%C3%9Fe%2016%2C%205020%20Salzburg%2C%20Austria!5e0!3m2!1sen!2sat!4v1234567890123!5m2!1sen!2sat"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="w-full h-full"
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() =>
                window.open(
                  "https://www.google.com/maps/dir//Linzer+Bundesstra%C3%9Fe+16,+5020+Salzburg,+Austria/@47.8123456,13.0445678,17z",
                  "_blank",
                )
              }
              className="w-full h-11 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-sm"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Route öffnen
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>

          {/* Adresse */}
          <motion.div variants={itemVariants} className="mt-5">
            <Card className="rounded-[24px] border border-white/10 bg-card shadow-[0_24px_80px_-54px_rgba(0,0,0,.95)] ">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
                  <MapPin className="w-5 h-5 text-orange-300" />
                  Adresse
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="space-y-1">
                  <p className="font-semibold text-white">Pfeil OK Salzburg</p>
                  <p className="text-muted-foreground">Linzer Bundesstraße 16</p>
                  <p className="text-muted-foreground">5020 Salzburg, Österreich</p>
                </div>

                <Button
                  variant="outline"
                  className="mt-4 w-full h-10 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold"
                  onClick={() =>
                    window.open(
                      "https://www.google.com/maps/search/?api=1&query=Linzer+Bundesstraße+16,+5020+Salzburg",
                      "_blank",
                    )
                  }
                >
                  In Maps suchen
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Öffnungszeiten */}
          <motion.div variants={itemVariants} className="mt-5">
            <Card className="rounded-[24px] border border-white/10 bg-card shadow-[0_24px_80px_-54px_rgba(0,0,0,.95)] ">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
                  <Clock className="w-5 h-5 text-orange-300" />
                  Öffnungszeiten
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">Mo – Do</p>
                    <p className="text-muted-foreground">ab 18:00 Uhr</p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">
                    Standard
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">Fr – Sa</p>
                    <p className="text-muted-foreground">ab 16:00 Uhr</p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-300">
                    Früher offen
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Kontakt */}
          <motion.div variants={itemVariants} className="mt-5">
            <Card className="rounded-[24px] border border-white/10 bg-card shadow-[0_24px_80px_-54px_rgba(0,0,0,.95)] ">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base font-semibold">Kontakt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a
                  href="tel:+436604696464"
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10 p-3"
                >
                  <div className="w-10 h-10 rounded-2xl border border-orange-400/20 bg-orange-400/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-orange-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-muted-foreground">Telefon</p>
                    <p className="font-semibold text-white">+43 660 4696464</p>
                  </div>
                </a>

                <a
                  href="mailto:emoji.s.dartvereinev@gmail.com"
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10 p-3"
                >
                  <div className="w-10 h-10 rounded-2xl border border-orange-400/20 bg-orange-400/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-orange-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-muted-foreground">E-Mail</p>
                    <p className="font-semibold text-white break-all">
                      emoji.s.dartvereinev@gmail.com
                    </p>
                  </div>
                </a>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button
                    className="h-10 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                    onClick={() => (window.location.href = "tel:+436604696464")}
                  >
                    Anrufen
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold"
                    onClick={() => (window.location.href = "mailto:emoji.s.dartvereinev@gmail.com")}
                  >
                    Mail
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}