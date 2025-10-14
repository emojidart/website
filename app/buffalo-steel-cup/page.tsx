"use client"

import { Header } from "@/components/header"
import { Calendar, MapPin, Info, Sparkles, Star, Target } from "lucide-react"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 90, damping: 10 } },
}

const pulseVariants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Number.POSITIVE_INFINITY,
      ease: "easeInOut",
    },
  },
}

export default function BuffaloSteelCupPage() {
  const sponsors = [
    { name: "Sponsor 1", logo: "/images/sponsoren/sponsor1.png" },
    { name: "Sponsor 2", logo: "/images/sponsoren/sponsor2.png" },
    { name: "Sponsor 3", logo: "/images/sponsoren/sponsor3.png" },
    { name: "Sponsor 4", logo: "/images/sponsoren/sponsor4.png" },
    { name: "Sponsor 5", logo: "/images/sponsoren/sponsor5.png" },
    { name: "Sponsor 6", logo: "/images/sponsoren/sponsor6.png" },
    { name: "Sponsor 7", logo: "/images/sponsoren/sponsor7.png" },
    { name: "Sponsor 8", logo: "/images/sponsoren/sponsor8.png" },
    { name: "Sponsor 9", logo: "/images/sponsoren/sponsor9.png" },
    { name: "Sponsor 10", logo: "/images/sponsoren/sponsor10.png" },
    { name: "Sponsor 11", logo: "/images/sponsoren/sponsor11.png" },
    { name: "Sponsor 12", logo: "/images/sponsoren/sponsor12.png" },
  ]

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Header />
      <main className="pt-8 pb-20">
        <motion.div
          className="container mx-auto px-4 md:px-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Section */}
          <motion.div variants={itemVariants} className="text-center mb-16">
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 rounded-3xl shadow-2xl border border-gray-700 p-8 md:p-16 mb-8 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white rounded-full" />
                <div className="absolute bottom-10 right-10 w-40 h-40 border-4 border-red-500 rounded-full" />
                <div className="absolute top-1/2 left-1/4 w-24 h-24 border-4 border-white rounded-full" />
              </div>

              {/* Content */}
              <div className="relative z-10">
                <motion.div
                  variants={pulseVariants}
                  initial="initial"
                  animate="animate"
                  className="bg-red-600 rounded-full p-6 w-24 h-24 mx-auto mb-8 shadow-2xl flex items-center justify-center"
                >
                  <span className="text-5xl">🦬</span>
                </motion.div>

                <h1 className="text-4xl md:text-6xl lg:text-8xl font-extrabold uppercase leading-none tracking-tighter mb-6">
                  <span className="block text-white text-balance">EMD - BUFFALO</span>
                  <span className="block text-red-500 text-balance">STEEL CUP</span>
                  <span className="block text-gray-300 text-4xl md:text-5xl lg:text-6xl mt-4">2026</span>
                </h1>

                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-base md:text-lg font-bold mb-8">
                  <div className="flex items-center gap-2 bg-white/10 px-6 py-3 rounded-xl border border-white/20 backdrop-blur-sm">
                    <Calendar className="h-5 w-5 text-red-400" />
                    <span className="text-white">07. JAN. - 07. FEB. 2026</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-6 py-3 rounded-xl border border-white/20 backdrop-blur-sm">
                    <MapPin className="h-5 w-5 text-red-400" />
                    <span className="text-white">PFEIL-OK SALZBURG</span>
                  </div>
                </div>

                <motion.div
                  variants={pulseVariants}
                  initial="initial"
                  animate="animate"
                  className="inline-block bg-gradient-to-r from-red-600 to-red-700 px-8 py-4 rounded-2xl shadow-2xl border-2 border-red-400"
                >
                  <p className="text-xl md:text-2xl font-extrabold uppercase text-white tracking-wide text-balance">
                    Weitere Infos & Details folgen in Kürze
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Info Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <motion.div
              variants={cardVariants}
              className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                <Calendar className="h-8 w-8 text-white mx-auto" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 uppercase">Zeitraum</h3>
              <p className="text-gray-600 font-semibold">07. Januar 2026</p>
              <p className="text-gray-600 font-semibold">bis</p>
              <p className="text-gray-600 font-semibold">07. Februar 2026</p>
            </motion.div>

            <motion.div
              variants={cardVariants}
              className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                <Target className="h-8 w-8 text-white mx-auto" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 uppercase">Modus</h3>
              <p className="text-gray-600 font-semibold">Steel Dart</p>
              <p className="text-gray-500 text-sm mt-2">Folgen in Kürze</p>
            </motion.div>
          </motion.div>

          {/* Spieltage Section */}
          <motion.div variants={itemVariants} className="mb-16">
            <motion.div
              variants={cardVariants}
              className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center hover:shadow-2xl transition-all duration-300"
            >
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                <Calendar className="h-8 w-8 text-white mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 uppercase">Spieltage</h3>
              <p className="text-lg text-gray-600 font-semibold">Folgen in Kürze</p>
            </motion.div>
          </motion.div>

          {/* Coming Soon Banner */}
          <motion.div variants={itemVariants} className="mb-16">
            <motion.div
              variants={cardVariants}
              className="bg-gradient-to-r from-red-600 via-red-700 to-gray-900 rounded-2xl shadow-2xl border border-red-500 p-8 md:p-12 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[url('/dart-pattern.jpg')] opacity-5" />
              <div className="relative z-10">
                <motion.div
                  animate={{
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                  className="inline-block mb-6"
                >
                  <Info className="h-16 w-16 text-white" />
                </motion.div>
                <h2 className="text-3xl md:text-5xl font-extrabold uppercase mb-4 text-white text-balance">
                  Bald geht's los!
                </h2>
                <p className="text-lg md:text-xl text-white/90 mb-6 max-w-2xl mx-auto text-pretty">
                  Der EMD - Buffalo Steel Cup 2026 wird ein unvergessliches Turnier. Alle wichtigen Informationen zu
                  Anmeldung, Spielmodus und Zeitplan werden in Kürze hier veröffentlicht.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 text-white/80 text-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-400" />
                    <span className="font-semibold">Spannende Matches</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-400" />
                    <span className="font-semibold">Großartige Atmosphäre</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Location */}
          <motion.div variants={itemVariants} className="mb-16">
            <motion.div
              variants={cardVariants}
              className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center hover:shadow-2xl transition-shadow duration-300"
            >
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-full p-4 w-16 h-16 mx-auto mb-6 shadow-lg">
                <MapPin className="h-8 w-8 text-white mx-auto" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold uppercase mb-6 text-gray-900">VERANSTALTUNGSORT</h2>
              <div className="space-y-4 text-lg">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <div className="font-bold text-red-700 text-xl mb-2">Dart & Freizeit Vereinsheim "Pfeil-OK" e.V.</div>
                  <div className="flex items-center justify-center gap-2 text-gray-700">
                    <MapPin className="h-5 w-5 text-red-500" />
                    <span className="font-semibold">Linzer Bundesstrasse 16, 5020 Salzburg</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Sponsors Section */}
          <motion.div variants={itemVariants}>
            <motion.div
              variants={cardVariants}
              className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-shadow duration-300"
            >
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                  <Sparkles className="h-8 w-8 text-white mx-auto" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold uppercase text-gray-900">
                  UNSERE PARTNER & SPONSOREN
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                {sponsors.map((sponsor, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-center hover:border-red-300 hover:bg-red-50 transition-all duration-300 group cursor-pointer hover:shadow-lg"
                  >
                    <img
                      src={sponsor.logo || "/placeholder.svg"}
                      alt={`${sponsor.name} Logo`}
                      style={{ objectFit: "contain" }}
                      className="max-w-full max-h-16 object-contain transition-all duration-300 group-hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=80&width=120&text=" + sponsor.name
                      }}
                    />
                  </motion.div>
                ))}
              </div>

              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <p className="text-gray-700 font-bold text-center flex items-center justify-center flex-wrap gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-balance">VIELEN DANK AN ALLE UNSERE PARTNER UND UNTERSTÜTZER!</span>
                  <Star className="h-5 w-5 text-yellow-500" />
                </p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>

      <footer className="py-6 bg-gray-200 text-gray-600 text-sm text-center border-t border-gray-300">
        <p>&copy; 2026 Emoj!'s Dartverein e.V. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  )
}
