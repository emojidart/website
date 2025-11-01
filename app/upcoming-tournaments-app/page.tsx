"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { PublicUpcomingTournamentRegistrationModal } from "@/components/public-upcoming-tournament-registration-modal"
import { TournamentRegistrationModal } from "@/components/tournament-registration-modal"
import {
  Calendar,
  Clock,
  MapPin,
  UserPlus,
  Euro,
  Info,
  Loader2,
  AlertCircle,
  Crown,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Home,
  X,
} from "lucide-react"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
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
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 90, damping: 10 } },
}

export default function UpcomingTournamentsAppPage() {
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

  const [showAllLionCup, setShowAllLionCup] = useState(false)

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
        setError("Fehler beim Laden der Turniere.")
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
    { date: "25. Nov. 2025", time: "19:30 Uhr" },
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

return (
  <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
    <Header />
    <main className="pt-6 pb-24">
      <motion.div
        className="container mx-auto px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >

        {/* Lion Cup Header - Mobile optimized */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl shadow-lg p-6 text-white">
            <div className="bg-white/10 rounded-full p-3 w-16 h-16 mx-auto mb-4">
              <Crown className="h-10 w-10 text-white mx-auto" />
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold uppercase leading-tight mb-4">
              <span className="block">EMD - LION CUP</span>
              <span className="block text-orange-200 text-xl md:text-3xl">2025/2026</span>
            </h1>
            <p className="text-sm md:text-base font-bold text-orange-100 mb-4">
              {actualTournamentDays} TURNIERTAGE + 1 FINALTAG
            </p>
            <div className="flex flex-col gap-2 text-xs font-bold">
              <div className="flex items-center justify-center gap-2 bg-white/20 px-3 py-2 rounded-lg">
                <Calendar className="h-4 w-4" />
                <span>01. SEP. 2025 - 01. JUN. 2026</span>
              </div>
            </div>
          </div>
        </motion.div>

          {/* Lion Cup Schedule */}
          <motion.div variants={itemVariants} className="space-y-6 mb-8">
            <motion.div
              variants={cardVariants}
              className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-white" />
                  <h2 className="text-lg font-bold text-white uppercase">EMD - Lion Cup Spieltage</h2>
                </div>
              </div>

              <div className="p-4">
                <div className="space-y-2">
                  {(showAllLionCup ? lioncupDates : lioncupDates.slice(0, 3)).map((item, index) => {
                    const isPast = isDateInPast(item.date)
                    const isSpielFrei = item.spielfrei
                    return (
                      <div
                        key={index}
                        className={`flex justify-between items-center py-3 px-3 rounded-lg border ${
                          isSpielFrei
                            ? "bg-yellow-50 border-yellow-200"
                            : isPast
                              ? "bg-gray-100 border-gray-200 opacity-60"
                              : "bg-gray-50 border-gray-100"
                        }`}
                      >
                        <div className="flex-1">
                          <span
                            className={`font-bold text-sm block ${
                              isSpielFrei ? "text-yellow-700" : isPast ? "text-gray-500" : "text-gray-900"
                            }`}
                          >
                            {item.date}
                          </span>
                          <div
                            className={`flex items-center gap-1 mt-1 ${
                              isSpielFrei ? "text-yellow-600" : isPast ? "text-gray-400" : "text-orange-600"
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            <span className="text-xs font-bold">{item.time}</span>
                          </div>
                        </div>
                        {isSpielFrei ? (
                          <div className="bg-yellow-200 text-yellow-800 font-bold px-3 py-1 rounded-lg text-xs">
                            Spielfrei
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleSummerSpecialRegistration(item.date, item.time, "lioncup")}
                            size="sm"
                            disabled={isPast}
                            className={`text-xs px-3 py-1 ${
                              isPast ? "bg-gray-400 text-gray-600" : "bg-orange-600 hover:bg-orange-700 text-white"
                            }`}
                          >
                            {isPast ? "Vorbei" : "Anmelden"}
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
                {!showAllLionCup && (
                  <div className="mt-3 text-center">
                    <Button
                      onClick={() => setShowAllLionCup(true)}
                      variant="outline"
                      size="sm"
                      className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Alle {lioncupDates.length} Termine anzeigen
                    </Button>
                  </div>
                )}
                {showAllLionCup && (
                  <div className="mt-3 text-center">
                    <Button
                      onClick={() => setShowAllLionCup(false)}
                      variant="outline"
                      size="sm"
                      className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Weniger anzeigen
                    </Button>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                <Link href="/regelwerk-app">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-orange-200 text-orange-700 hover:bg-orange-50 text-xs bg-transparent"
                  >
                    <BookOpen className="h-3 w-3 mr-2" />
                    Regelwerk
                  </Button>
                </Link>
              </div>
            </motion.div>
          </motion.div>

          {/* Lion Cup Finale */}
          <motion.div variants={itemVariants} className="mb-8">
            <motion.div
              variants={cardVariants}
              className="bg-gradient-to-r from-orange-600 to-orange-800 rounded-xl shadow-lg p-6 text-center text-white"
            >
              <Crown className="h-10 w-10 mx-auto mb-3" />
              <h2 className="text-xl font-extrabold uppercase mb-2">EMD - LION CUP FINALE</h2>
              <div className="text-lg font-bold">01. JUNI 2026</div>
            </motion.div>
          </motion.div>

          {/* Dynamic Tournaments */}
          <motion.div variants={itemVariants} className="mb-8">
            <h2 className="text-2xl font-extrabold uppercase text-center mb-6 text-gray-900">Weitere Turniere</h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-red-600" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                <AlertCircle className="h-10 w-10 mx-auto mb-3" />
                <p className="text-sm">{error}</p>
              </div>
            ) : tournaments.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <Info className="h-10 w-10 mx-auto mb-3" />
                <p className="text-sm">Derzeit keine weiteren Turniere geplant.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tournaments.map((tournament) => (
                  <motion.div
                    key={tournament.id}
                    variants={cardVariants}
                    className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                  >
                    {tournament.photo_url && (
                      <div
                        className="relative w-full h-40 bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => handleImageClick(tournament.photo_url!)}
                      >
                        <Image
                          src={tournament.photo_url || "/placeholder.svg"}
                          alt={tournament.name}
                          fill
                          style={{ objectFit: "cover" }}
                          sizes="100vw"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-3">{tournament.name}</h3>
                      <div className="space-y-2 text-xs text-gray-700 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-red-600" />
                          <span>{new Date(tournament.date).toLocaleDateString("de-DE")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-blue-600" />
                          <span>{tournament.time} Uhr</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-green-600" />
                          <span>{tournament.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Euro className="h-3 w-3 text-yellow-600" />
                          <span>Startgeld: {tournament.entry_fee.toFixed(2)} €</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRegistration(tournament)}
                        size="sm"
                        className="w-full bg-red-600 hover:bg-red-700 text-white text-xs"
                      >
                        <UserPlus className="h-3 w-3 mr-2" />
                        Jetzt anmelden
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Location */}
          <motion.div variants={itemVariants}>
            <motion.div
              variants={cardVariants}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center"
            >
              <MapPin className="h-8 w-8 text-red-600 mx-auto mb-3" />
              <h2 className="text-xl font-extrabold uppercase mb-4 text-gray-900">VERANSTALTUNGSORT</h2>
              <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                <div className="font-bold text-red-700 mb-2">Pfeil-OK e.V.</div>
                <div className="text-sm text-gray-700">Linzer Bundesstrasse 16, 5020 Salzburg</div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X className="h-8 w-8" />
          </button>
          <div className="relative w-full h-full max-w-4xl max-h-[90vh]">
            <Image
              src={selectedImage || "/placeholder.svg"}
              alt="Tournament"
              fill
              style={{ objectFit: "contain" }}
              sizes="100vw"
            />
          </div>
        </div>
      )}

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
    </div>
  )
}
