"use client"

import { Header } from "@/components/header"
import { TournamentRegistrationModal } from "@/components/tournament-registration-modal"
import { Calendar, Clock, MapPin, Trophy, Target, Users, Star, Sparkles, UserPlus } from "lucide-react"
import { motion } from "framer-motion"
import { useState } from "react"
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
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 90, damping: 10 } },
}

const sponsorVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100, damping: 12 } },
}

export default function TournamentPage() {
  const [registrationModal, setRegistrationModal] = useState<{
    isOpen: boolean
    date: string
    time: string
    type: "edart" | "steeldart"
  }>({
    isOpen: false,
    date: "",
    time: "",
    type: "steeldart",
  })

  const steeldartDates = [
    { date: "02. Juli 2025", time: "19:00 Uhr" },
    { date: "08. Juli 2025", time: "19:00 Uhr" },
    { date: "21. Juli 2025", time: "19:00 Uhr" },
    { date: "30. Juli 2025", time: "19:00 Uhr" },
    { date: "05. Aug. 2025", time: "19:00 Uhr" },
    { date: "13. Aug. 2025", time: "19:00 Uhr" },
    { date: "20. Aug. 2025", time: "19:00 Uhr" },
    { date: "27. Aug. 2025", time: "19:00 Uhr" },
  ]

  const edartDates = [
    { date: "04. Juli 2025", time: "19:30 Uhr" },
    { date: "11. Juli 2025", time: "19:30 Uhr" },
    { date: "23. Juli 2025", time: "19:00 Uhr" },
    { date: "01 Aug. 2025", time: "19:30 Uhr" },
    { date: "08 Aug. 2025", time: "19:30 Uhr" },
    { date: "15. Aug. 2025", time: "19:30 Uhr" },
    { date: "22. Aug. 2025", time: "19:30 Uhr" },
    { date: "29. Aug. 2025", time: "19:30 Uhr" },
  ]

  const handleRegistration = (date: string, time: string, type: "edart" | "steeldart") => {
    setRegistrationModal({
      isOpen: true,
      date,
      time,
      type,
    })
  }

  // Sponsor-Logos - einfach Bilder in public/images/sponsoren/ legen
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
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 md:p-12 mb-8">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold uppercase leading-none tracking-tighter mb-6">
                <span className="block text-red-600">SUMMER SPECIAL</span>
                <span className="block text-gray-900">DART COMPETITION</span>
                <span className="block text-yellow-600">2025</span>
              </h1>
              <p className="text-lg md:text-xl font-bold uppercase text-gray-600 mb-8">
                WITH SOFTDART & STEELDART COMP.
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-base font-bold">
                <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                  <Calendar className="h-5 w-5 text-red-600" />
                  <span>02. JULI - 29. AUG. 2025</span>
                </div>
                <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-100">
                  <MapPin className="h-5 w-5 text-yellow-600" />
                  <span>PFEIL-OK SALZBURG</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tournament Schedule */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* Steeldart Schedule */}
            <motion.div
              variants={cardVariants}
              className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-shadow duration-300"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-lg p-2">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white uppercase">Steeldart</h2>
                    <p className="text-red-100 text-sm">Game Days</p>
                  </div>
                </div>
              </div>

              {/* Schedule List */}
              <div className="p-6">
                <div className="space-y-3">
                  {steeldartDates.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex justify-between items-center py-4 px-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-all duration-200 group"
                    >
                      <div className="flex-1">
                        <span className="font-bold text-gray-900 group-hover:text-red-700 block">{item.date}</span>
                        <div className="flex items-center gap-2 text-red-600 mt-1">
                          <Clock className="h-4 w-4" />
                          <span className="font-bold text-sm">{item.time}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRegistration(item.date, item.time, "steeldart")}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 shadow-md"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Anmelden
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                <div className="flex items-center justify-center text-sm text-gray-600">
                  <Star className="h-4 w-4 mr-2 text-red-500" />
                  <span className="font-medium">{steeldartDates.length} Spieltage geplant</span>
                </div>
              </div>
            </motion.div>

            {/* E-Dart Schedule */}
            <motion.div
              variants={cardVariants}
              className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-shadow duration-300"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-lg p-2">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white uppercase">E-Dart</h2>
                    <p className="text-blue-100 text-sm">Game Days</p>
                  </div>
                </div>
              </div>

              {/* Schedule List */}
              <div className="p-6">
                <div className="space-y-3">
                  {edartDates.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex justify-between items-center py-4 px-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all duration-200 group"
                    >
                      <div className="flex-1">
                        <span className="font-bold text-gray-900 group-hover:text-blue-700 block">{item.date}</span>
                        <div className="flex items-center gap-2 text-blue-600 mt-1">
                          <Clock className="h-4 w-4" />
                          <span className="font-bold text-sm">{item.time}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRegistration(item.date, item.time, "edart")}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 shadow-md"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Anmelden
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                <div className="flex items-center justify-center text-sm text-gray-600">
                  <Star className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="font-medium">{edartDates.length} Spieltage geplant</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Final Day */}
          <motion.div variants={itemVariants} className="mb-16">
            <motion.div
              variants={cardVariants}
              className="bg-gradient-to-r from-red-600 to-red-800 rounded-2xl shadow-2xl p-8 text-center border border-red-200 hover:shadow-3xl transition-shadow duration-300"
            >
              <div className="bg-white/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 backdrop-blur-sm">
                <Trophy className="h-12 w-12 text-white mx-auto" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold uppercase mb-4 text-white">FINALTAG</h2>
              <div className="text-xl md:text-2xl font-bold text-white mb-4">SAMSTAG: 30. AUG. 2025 - 19:00 UHR</div>
              <div className="flex items-center justify-center text-white/90">
                <Trophy className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium uppercase tracking-wide">Das große Finale</span>
                <Trophy className="h-5 w-5 ml-2" />
              </div>
            </motion.div>
          </motion.div>

          {/* Location & Contact */}
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
              {/* Header */}
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                  <Sparkles className="h-8 w-8 text-white mx-auto" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold uppercase text-gray-900">UNSERE SPONSOREN</h2>
                <p className="text-gray-600 mt-2">Unterstützer der Competition 2025</p>
              </div>

              {/* Sponsors Grid */}
              <motion.div
                className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {sponsors.map((sponsor, index) => (
                  <motion.div
                    key={index}
                    variants={sponsorVariants}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-center hover:border-red-300 hover:bg-red-50 transition-all duration-300 group cursor-pointer hover:shadow-lg"
                  >
                    <img
                      src={sponsor.logo || "/placeholder.svg"}
                      alt={`${sponsor.name} Logo`}
                      className="max-w-full max-h-16 object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300 group-hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=80&width=120&text=" + sponsor.name
                      }}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {/* Footer */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <p className="text-gray-700 font-bold text-center flex items-center justify-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-500" />
                  VIELEN DANK AN ALLE UNSERE PARTNER UND UNTERSTÜTZER!
                  <Star className="h-5 w-5 ml-2 text-yellow-500" />
                </p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>

      {/* Registration Modal */}
      <TournamentRegistrationModal
        isOpen={registrationModal.isOpen}
        onClose={() => setRegistrationModal({ ...registrationModal, isOpen: false })}
        tournamentDate={registrationModal.date}
        tournamentTime={registrationModal.time}
        tournamentType={registrationModal.type}
      />

      <footer className="py-6 bg-gray-200 text-gray-600 text-sm text-center border-t border-gray-300">
        <p>&copy; 2025 EMOJIS DARTVEREIN. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  )
}
