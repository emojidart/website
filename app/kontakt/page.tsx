"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, Mail, Clock, Navigation, ExternalLink } from "lucide-react"
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

export default function KontaktPage() {
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
          {/* App-Header Card */}
          <motion.div variants={itemVariants} className="mb-5 sm:mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="p-4 sm:p-5 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black">Kontakt & Anfahrt</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Dart & Freizeit Vereinsheim <span className="font-semibold">„Pfeil-OK“</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Wir freuen uns auf deinen Besuch!</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Standort (Map) */}
          <motion.div variants={itemVariants} className="space-y-4">
            <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-black">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  Standort
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative h-[300px] sm:h-[360px]">
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
              className="w-full h-11 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-sm"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Route öffnen
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>

          {/* Adresse */}
          <motion.div variants={itemVariants} className="mt-5">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-black">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  Adresse
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="space-y-1">
                  <p className="font-black text-gray-900">Pfeil OK Salzburg</p>
                  <p className="text-gray-600">Linzer Bundesstraße 16</p>
                  <p className="text-gray-600">5020 Salzburg, Österreich</p>
                </div>

                <Button
                  variant="outline"
                  className="mt-4 w-full h-10 rounded-2xl border-gray-200 bg-white hover:bg-gray-50 font-black"
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
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-black">
                  <Clock className="w-5 h-5 text-orange-600" />
                  Öffnungszeiten
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-gray-900">Mo – Do</p>
                    <p className="text-gray-600">ab 18:00 Uhr</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-[11px] font-black text-gray-700">
                    Standard
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-gray-900">Fr – Sa</p>
                    <p className="text-gray-600">ab 16:00 Uhr</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-[11px] font-black text-orange-700">
                    Früher offen
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Kontakt */}
          <motion.div variants={itemVariants} className="mt-5">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base font-black">Kontakt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a
                  href="tel:+436604696464"
                  className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 p-3"
                >
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-bold">Telefon</p>
                    <p className="font-black text-gray-900">+43 660 4696464</p>
                  </div>
                </a>

                <a
                  href="mailto:emoji.s.dartvereinev@gmail.com"
                  className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 p-3"
                >
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-bold">E-Mail</p>
                    <p className="font-black text-gray-900 break-all">
                      emoji.s.dartvereinev@gmail.com
                    </p>
                  </div>
                </a>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button
                    className="h-10 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black"
                    onClick={() => (window.location.href = "tel:+436604696464")}
                  >
                    Anrufen
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 rounded-2xl border-gray-200 bg-white hover:bg-gray-50 font-black"
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