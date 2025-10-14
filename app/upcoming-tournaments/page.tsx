"use client"

import { Header } from "@/components/header"
import { PublicUpcomingTournamentRegistrationModal } from "@/components/public-upcoming-tournament-registration-modal"
import { TournamentRegistrationModal } from "@/components/tournament-registration-modal"
import {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Target,
  Users,
  Star,
  Sparkles,
  UserPlus,
  Euro,
  Swords,
  Info,
  Loader2,
  AlertCircle,
  Crown,
  BookOpen,
} from "lucide-react"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import Link from "next/link"

interface Tournament {
  id: string
  name: string
  date: string
  time: string
  location: string
  entry_fee: number
  mode: string
  details: string | null
  photo_url: string | null
}

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

export default function UpcomingTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const [summerSpecialModal, setSummerSpecialModal] = useState<{
    isOpen: boolean
    date: string
    time: string
    type: "edart" | "steeldart" | "lioncup"
  }>({
    isOpen: false,
    date: "",
    time: "",
    type: "steeldart",
  })

  const [registrationModal, setRegistrationModal] = useState<{
    isOpen: boolean
    tournamentId: string | null
    tournamentName: string | null
    tournamentDate: string | null
    tournamentTime: string | null
    tournamentLocation: string | null
    tournamentMode: string | null
    tournamentEntryFee: number | null
  }>({
    isOpen: false,
    tournamentId: null,
    tournamentName: null,
    tournamentDate: null,
    tournamentTime: null,
    tournamentLocation: null,
    tournamentMode: null,
    tournamentEntryFee: null,
  })

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .order("time", { ascending: true })

      if (error) {
        console.error("Error fetching tournaments:", error)
        setError("Fehler beim Laden der Turniere. Bitte versuchen Sie es später erneut.")
      } else {
        setTournaments(data || [])
      }
      setLoading(false)
    }

    fetchTournaments()
  }, [])

  const isDateInPast = (dateString: string): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const months: { [key: string]: number } = {
      "Jan.": 0,
      "Feb.": 1,
      "Mär.": 2,
      "Apr.": 3,
      Mai: 4,
      "Jun.": 5,
      Juli: 6,
      "Aug.": 7,
      "Sep.": 8,
      "Okt.": 9,
      "Nov.": 10,
      "Dez.": 11,
    }

    const parts = dateString.split(" ")
    if (parts.length >= 3) {
      const day = Number.parseInt(parts[0].replace(".", ""))
      const month = months[parts[1]]
      const year = Number.parseInt(parts[2])

      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        const eventDate = new Date(year, month, day)
        return eventDate < today
      }
    }

    return false
  }

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

  const lioncupDates = [
    { date: "01. Sep. 2025", time: "19:30 Uhr" },
    { date: "08. Sep. 2025", time: "19:30 Uhr" },
    { date: "15. Sep. 2025", time: "19:30 Uhr" },
    { date: "22. Sep. 2025", time: "19:30 Uhr" },
    { date: "29. Sep. 2025", time: "19:30 Uhr" },
    { date: "06. Okt. 2025", time: "19:30 Uhr" },
    { date: "13. Okt. 2025", time: "19:30 Uhr" },
    { date: "20. Okt. 2025", time: "19:30 Uhr" },
    { date: "27. Okt. 2025", time: "19:30 Uhr", spielfrei: true },
    { date: "03. Nov. 2025", time: "19:30 Uhr" },
    { date: "10. Nov. 2025", time: "19:30 Uhr" },
    { date: "17. Nov. 2025", time: "19:30 Uhr" },
    { date: "24. Nov. 2025", time: "19:30 Uhr" },
    { date: "01. Dez. 2025", time: "19:30 Uhr" },
    { date: "08. Dez. 2025", time: "19:30 Uhr" },
    { date: "15. Dez. 2025", time: "19:30 Uhr" },
    { date: "22. Dez. 2025", time: "19:30 Uhr", spielfrei: true },
    { date: "29. Dez. 2025", time: "19:30 Uhr", spielfrei: true },
    { date: "05. Jan. 2026", time: "19:30 Uhr", spielfrei: true },
    { date: "12. Jan. 2026", time: "19:30 Uhr" },
    { date: "19. Jan. 2026", time: "19:30 Uhr" },
    { date: "26. Jan. 2026", time: "19:30 Uhr" },
    { date: "02. Feb. 2026", time: "19:30 Uhr" },
    { date: "09. Feb. 2026", time: "19:30 Uhr" },
    { date: "16. Feb. 2026", time: "19:30 Uhr" },
    { date: "23. Feb. 2026", time: "19:30 Uhr" },
    { date: "02. Mär. 2026", time: "19:30 Uhr" },
    { date: "09. Mär. 2026", time: "19:30 Uhr" },
    { date: "16. Mär. 2026", time: "19:30 Uhr" },
    { date: "23. Mär. 2026", time: "19:30 Uhr" },
    { date: "30. Mär. 2026", time: "19:30 Uhr" },
    { date: "06. Apr. 2026", time: "19:30 Uhr" },
    { date: "13. Apr. 2026", time: "19:30 Uhr" },
    { date: "20. Apr. 2026", time: "19:30 Uhr" },
    { date: "27. Apr. 2026", time: "19:30 Uhr" },
    { date: "04. Mai 2026", time: "19:30 Uhr" },
    { date: "11. Mai 2026", time: "19:30 Uhr", spielfrei: true },
    { date: "18. Mai 2026", time: "19:30 Uhr" },
    { date: "25. Mai 2026", time: "19:30 Uhr" },
  ]

  const actualTournamentDays = lioncupDates.filter((date) => !date.spielfrei).length

  const handleSummerSpecialRegistration = (date: string, time: string, type: "edart" | "steeldart" | "lioncup") => {
    if (isDateInPast(date)) {
      return
    }

    setSummerSpecialModal({
      isOpen: true,
      date,
      time,
      type,
    })
  }

  const handleRegistration = (tournament: Tournament) => {
    setRegistrationModal({
      isOpen: true,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      tournamentDate: tournament.date,
      tournamentTime: tournament.time,
      tournamentLocation: tournament.location,
      tournamentMode: tournament.mode,
      tournamentEntryFee: tournament.entry_fee,
    })
  }

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl)
  }

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

          <motion.div variants={itemVariants} className="text-center mb-16">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-8 md:p-12 mb-8 text-white">
              <div className="bg-white/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 backdrop-blur-sm">
                <Crown className="h-12 w-12 text-white mx-auto" />
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold uppercase leading-none tracking-tighter mb-6">
                <span className="block text-white">EMD - LION CUP</span>
                <span className="block text-orange-200">2025/2026</span>
              </h1>
              <p className="text-lg md:text-xl font-bold uppercase text-orange-100 mb-8">
                {actualTournamentDays} TURNIERTAGE + 1 FINALTAG
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-base font-bold">
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg border border-white/30 backdrop-blur-sm">
                  <Calendar className="h-5 w-5 text-white" />
                  <span>01. SEP. 2025 - 01. JUN. 2026</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg border border-white/30 backdrop-blur-sm">
                  <Clock className="h-5 w-5 text-white" />
                  <span>JEDEN MONTAG 19:30 UHR</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg border border-white/30 backdrop-blur-sm">
                  <Trophy className="h-5 w-5 text-white" />
                  <span>20 ANTRITTE FÜR FINALE</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {/* Steeldart Schedule */}
            <motion.div
              variants={cardVariants}
              className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-shadow duration-300"
            >
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

              <div className="p-6">
                <div className="space-y-3">
                  {steeldartDates.map((item, index) => {
                    const isPast = isDateInPast(item.date)
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex justify-between items-center py-4 px-4 rounded-xl border transition-all duration-200 group ${
                          isPast
                            ? "bg-gray-100 border-gray-200 opacity-60"
                            : "bg-gray-50 border-gray-100 hover:border-red-200 hover:bg-red-50"
                        }`}
                      >
                        <div className="flex-1">
                          <span
                            className={`font-bold block ${isPast ? "text-gray-500" : "text-gray-900 group-hover:text-red-700"}`}
                          >
                            {item.date}
                          </span>
                          <div className={`flex items-center gap-2 mt-1 ${isPast ? "text-gray-400" : "text-red-600"}`}>
                            <Clock className="h-4 w-4" />
                            <span className="font-bold text-sm">{item.time}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleSummerSpecialRegistration(item.date, item.time, "steeldart")}
                          size="sm"
                          disabled={isPast}
                          className={`font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-md ${
                            isPast
                              ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                              : "bg-red-600 hover:bg-red-700 text-white hover:scale-105"
                          }`}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          {isPast ? "Vergangen" : "Anmelden"}
                        </Button>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

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

              <div className="p-6">
                <div className="space-y-3">
                  {edartDates.map((item, index) => {
                    const isPast = isDateInPast(item.date)
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex justify-between items-center py-4 px-4 rounded-xl border transition-all duration-200 group ${
                          isPast
                            ? "bg-gray-100 border-gray-200 opacity-60"
                            : "bg-gray-50 border-gray-100 hover:border-blue-200 hover:bg-blue-50"
                        }`}
                      >
                        <div className="flex-1">
                          <span
                            className={`font-bold block ${isPast ? "text-gray-500" : "text-gray-900 group-hover:text-blue-700"}`}
                          >
                            {item.date}
                          </span>
                          <div className={`flex items-center gap-2 mt-1 ${isPast ? "text-gray-400" : "text-blue-600"}`}>
                            <Clock className="h-4 w-4" />
                            <span className="font-bold text-sm">{item.time}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleSummerSpecialRegistration(item.date, item.time, "edart")}
                          size="sm"
                          disabled={isPast}
                          className={`font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-md ${
                            isPast
                              ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700 text-white hover:scale-105"
                          }`}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          {isPast ? "Vergangen" : "Anmelden"}
                        </Button>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                <div className="flex items-center justify-center text-sm text-gray-600">
                  <Star className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="font-medium">{edartDates.length} Spieltage geplant</span>
                </div>
              </div>
            </motion.div>

            {/* Lioncup Schedule */}
            <motion.div
              variants={cardVariants}
              className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-shadow duration-300"
            >
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-lg p-2">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white uppercase">EMD - Lion Cup</h2>
                    <p className="text-orange-100 text-sm">Montags 19:30</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {lioncupDates.map((item, index) => {
                    const isPast = isDateInPast(item.date)
                    const isSpielFrei = item.spielfrei
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex justify-between items-center py-4 px-4 rounded-xl border transition-all duration-200 group ${
                          isSpielFrei
                            ? "bg-yellow-50 border-yellow-200"
                            : isPast
                              ? "bg-gray-100 border-gray-200 opacity-60"
                              : "bg-gray-50 border-gray-100 hover:border-orange-200 hover:bg-orange-50"
                        }`}
                      >
                        <div className="flex-1">
                          <span
                            className={`font-bold block ${
                              isSpielFrei
                                ? "text-yellow-700"
                                : isPast
                                  ? "text-gray-500"
                                  : "text-gray-900 group-hover:text-orange-700"
                            }`}
                          >
                            {item.date}
                          </span>
                          <div
                            className={`flex items-center gap-2 mt-1 ${
                              isSpielFrei ? "text-yellow-600" : isPast ? "text-gray-400" : "text-orange-600"
                            }`}
                          >
                            <Clock className="h-4 w-4" />
                            <span className="font-bold text-sm">{item.time}</span>
                          </div>
                        </div>
                        {isSpielFrei ? (
                          <div className="bg-yellow-200 text-yellow-800 font-bold px-4 py-2 rounded-lg text-sm">
                            Spielfrei
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleSummerSpecialRegistration(item.date, item.time, "lioncup")}
                            size="sm"
                            disabled={isPast}
                            className={`font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-md ${
                              isPast
                                ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                                : "bg-orange-600 hover:bg-orange-700 text-white hover:scale-105"
                            }`}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            {isPast ? "Vergangen" : "Anmelden"}
                          </Button>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <Crown className="h-4 w-4 mr-2 text-orange-500" />
                    <span className="font-medium">{actualTournamentDays} Turniertage + Finale</span>
                  </div>
                  <Link href="/regelwerk">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 font-semibold bg-transparent"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Regelwerk
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Summer Special Final */}
            <motion.div
              variants={cardVariants}
              className="bg-gradient-to-r from-red-600 to-red-800 rounded-2xl shadow-2xl p-8 text-center border border-red-200 hover:shadow-3xl transition-shadow duration-300"
            >
              <div className="bg-white/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 backdrop-blur-sm">
                <Trophy className="h-12 w-12 text-white mx-auto" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold uppercase mb-4 text-white">SUMMER SPECIAL FINALE</h2>
              <div className="text-xl md:text-2xl font-bold text-white mb-4">SAMSTAG: 30. AUG. 2025 - 19:00 UHR</div>
              <div className="flex items-center justify-center text-white/90">
                <Trophy className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium uppercase tracking-wide">Das große Finale</span>
                <Trophy className="h-5 w-5 ml-2" />
              </div>
            </motion.div>

            {/* Lioncup Final */}
            <motion.div
              variants={cardVariants}
              className="bg-gradient-to-r from-orange-600 to-orange-800 rounded-2xl shadow-2xl p-8 text-center border border-orange-200 hover:shadow-3xl transition-shadow duration-300"
            >
              <div className="bg-white/10 rounded-full p-4 w-16 h-16 mx-auto mb-6 shadow-lg">
                <Crown className="h-8 w-8 text-white mx-auto" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold uppercase mb-4 text-white">EMD - LION CUP FINALE</h2>
              <div className="text-xl md:text-2xl font-bold text-white mb-4">01. JUNI 2026</div>
              <div className="flex items-center justify-center text-white/90">
                <Crown className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium uppercase tracking-wide">Die Krönung des Champions</span>
                <Crown className="h-5 w-5 ml-2" />
              </div>
            </motion.div>
          </motion.div>

          {/* Dynamic Tournament Schedule from Database */}
          <motion.div variants={itemVariants} className="mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold uppercase text-center mb-10 text-gray-900">
              Weitere Turniere
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-red-600" />
                <span className="ml-4 text-lg text-gray-700">Turniere werden geladen...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-600">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p className="text-xl font-semibold">{error}</p>
              </div>
            ) : tournaments.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <Info className="h-12 w-12 mx-auto mb-4" />
                <p className="text-xl font-semibold">Derzeit sind keine weiteren Turniere geplant.</p>
                <p className="mt-2">Schau bald wieder vorbei!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {tournaments.map((tournament, index) => (
                  <motion.div
                    key={tournament.id}
                    variants={cardVariants}
                    className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-shadow duration-300 flex flex-col"
                  >
                    {tournament.photo_url && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <div
                            className="relative w-full h-48 bg-gray-100 cursor-pointer"
                            onClick={() => handleImageClick(tournament.photo_url!)}
                          >
                            <Image
                              src={tournament.photo_url || "/placeholder.svg"}
                              alt={tournament.name}
                              fill
                              style={{ objectFit: "cover" }}
                              className="object-center"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl p-0 overflow-hidden">
                          {selectedImage && (
                            <Image
                              src={selectedImage || "/placeholder.svg"}
                              alt={tournament.name}
                              width={1000}
                              height={1000}
                              style={{ objectFit: "contain", width: "100%", height: "auto" }}
                              className="max-h-[90vh]"
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    )}
                    <div className="p-6 flex-grow flex flex-col">
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">{tournament.name}</h3>
                      <div className="space-y-2 text-gray-700 text-sm flex-grow">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-red-600" />
                          <span>{new Date(tournament.date).toLocaleDateString("de-DE")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span>{tournament.time} Uhr</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <span>{tournament.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {tournament.mode === "edart" ? (
                            <Target className="h-4 w-4 text-blue-600" />
                          ) : tournament.mode === "steeldart" ? (
                            <Swords className="h-4 w-4 text-green-600" />
                          ) : (
                            <Users className="h-4 w-4 text-purple-600" />
                          )}
                          <span>
                            Modus:{" "}
                            {tournament.mode === "edart"
                              ? "E-Dart"
                              : tournament.mode === "steeldart"
                                ? "Steel Dart"
                                : "Beide"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Euro className="h-4 w-4 text-yellow-600" />
                          <span>Startgeld: {tournament.entry_fee.toFixed(2)} €</span>
                        </div>
                        {tournament.details && <p className="text-gray-600 text-sm mt-3">{tournament.details}</p>}
                      </div>
                      <Button
                        onClick={() => handleRegistration(tournament)}
                        size="lg"
                        className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 hover:scale-105 shadow-md"
                      >
                        <UserPlus className="h-5 w-5 mr-2" />
                        Jetzt anmelden
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
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
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                  <Sparkles className="h-8 w-8 text-white mx-auto" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold uppercase text-gray-900">
                  UNSERE PARTNER & SPONSOREN
                </h2>
                <p className="text-gray-600 mt-2"></p>
              </div>

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
                      style={{ objectFit: "contain" }}
                      className="max-w-full max-h-16 object-contain transition-all duration-300 group-hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=80&width=120&text=" + sponsor.name
                      }}
                    />
                  </motion.div>
                ))}
              </motion.div>

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

      <TournamentRegistrationModal
        isOpen={summerSpecialModal.isOpen}
        onClose={() => setSummerSpecialModal({ ...summerSpecialModal, isOpen: false })}
        tournamentDate={summerSpecialModal.date}
        tournamentTime={summerSpecialModal.time}
        tournamentType={summerSpecialModal.type}
      />

      <PublicUpcomingTournamentRegistrationModal
        isOpen={registrationModal.isOpen}
        onClose={() => setRegistrationModal({ ...registrationModal, isOpen: false })}
        tournamentId={registrationModal.tournamentId}
        tournamentName={registrationModal.tournamentName}
        tournamentDate={registrationModal.tournamentDate}
        tournamentTime={registrationModal.tournamentTime}
        tournamentLocation={registrationModal.tournamentLocation}
        tournamentMode={registrationModal.tournamentMode}
        tournamentEntryFee={registrationModal.tournamentEntryFee}
      />

      <footer className="py-6 bg-gray-200 text-gray-600 text-sm text-center border-t border-gray-300">
        <p>&copy; 2025 Emoj!'s Dartverein e.V. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  )
}
