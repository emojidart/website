"use client"

import { Header } from "@/components/header"
import { PublicUpcomingTournamentRegistrationModal } from "@/components/public-upcoming-tournament-registration-modal"
import { Calendar, Clock, MapPin, Trophy, Target, Users, Star, Sparkles, UserPlus, Euro, Swords, Info, Loader2, AlertCircle } from 'lucide-react'
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null) // New state for enlarged image

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
        .gte("date", new Date().toISOString().split('T')[0])
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
                <span className="block text-red-600">BEVORSTEHENDE</span>
                <span className="block text-gray-900">DART TURNIERE</span>
                <span className="block text-yellow-600">2025</span>
              </h1>
              <p className="text-lg md:text-xl font-bold uppercase text-gray-600 mb-8">
                Melde dich jetzt an und sei dabei!
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-base font-bold">
                <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                  <Calendar className="h-5 w-5 text-red-600" />
                  <span>Regelmäßige Events</span>
                </div>
                <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-100">
                  <MapPin className="h-5 w-5 text-yellow-600" />
                  <span>PFEIL-OK SALZBURG</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tournament Schedule */}
          <motion.div variants={itemVariants} className="mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold uppercase text-center mb-10 text-gray-900">
              Turnierübersicht
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
                <p className="text-xl font-semibold">Derzeit sind keine bevorstehenden Turniere geplant.</p>
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
                              style={{ objectFit: "contain", width: '100%', height: 'auto' }}
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
                          <span>Modus: {tournament.mode === "edart" ? "E-Dart" : tournament.mode === "steeldart" ? "Steel Dart" : "Beide"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Euro className="h-4 w-4 text-yellow-600" />
                          <span>Startgeld: {tournament.entry_fee.toFixed(2)} €</span>
                        </div>
                        {tournament.details && (
                          <p className="text-gray-600 text-sm mt-3">{tournament.details}</p>
                        )}
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
              {/* Header */}
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                  <Sparkles className="h-8 w-8 text-white mx-auto" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold uppercase text-gray-900">UNSERE PARTNER & SPONSOREN</h2>
                <p className="text-gray-600 mt-2"></p>
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
                      // fill // Removed fill as it conflicts with max-w/h and object-contain
                      style={{ objectFit: "contain" }}
                      className="max-w-full max-h-16 object-contain transition-all duration-300 group-hover:scale-110"
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
