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

export default function KontaktPage() {
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
              <MapPin className="h-12 w-12 text-white mx-auto" />
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-4">
              <span className="block text-white">KONTAKT & ANFAHRT</span>
              <span className="block text-orange-200">BESUCH UNS</span>
            </h1>
            <p className="text-lg md:text-xl font-bold uppercase text-orange-100 mb-4">
              Dart & Freizeit Vereinsheim "Pfeil-OK"
            </p>
            <div className="bg-orange-600/30 rounded-xl p-4 text-orange-100">
              <p className="text-sm italic">Wir freuen uns auf deinen Besuch!</p>
            </div>
          </div>
        </motion.div>

        <main className="container mx-auto px-4 md:px-6 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Standort
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative h-96">
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2653.8234567890123!2d13.0445678!3d47.8123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x477741234567890a%3A0x1234567890abcdef!2sLinzer%20Bundesstra%C3%9Fe%2016%2C%205020%20Salzburg%2C%20Austria!5e0!3m2!1sen!2sat!4v1234567890123!5m2!1sen!2sat"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="w-full h-full"
                    ></iframe>
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
                className="w-full"
                size="lg"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Route in Google Maps öffnen
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Adresse
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-semibold">Pfeil OK Salzburg</p>
                    <p className="text-muted-foreground">Linzer Bundesstrasse 16</p>
                    <p className="text-muted-foreground">5020 Salzburg, Österreich</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Öffnungszeiten
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-semibold">Montag bis Donnerstag</p>
                    <p className="text-muted-foreground">ab 18:00 Uhr</p>
                  </div>
                  <div>
                    <p className="font-semibold">Freitag & Samstag</p>
                    <p className="text-muted-foreground">ab 16:00 Uhr</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kontakt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4" />
                    <div>
                      <p className="font-semibold">Telefon</p>
                      <p className="text-muted-foreground">+436604696464</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4" />
                    <div>
                      <p className="font-semibold">E-Mail</p>
                      <p className="text-muted-foreground">emoji.s.dartvereinev@gmail.com</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </motion.div>

      <MobileBottomNav />
    </div>
  )
}
