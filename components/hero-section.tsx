"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Trophy } from "lucide-react"
import Countdown from "./countdown"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { motion } from "framer-motion"

interface DartEvent {
  id: string
  name: string
  date_start: string
  date_end: string
  location: string
  prize_pool: number
  spots_left: number
  event_starts_at: string
}

interface HeroSectionProps {
  currentPot: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 90, damping: 10, duration: 0.6 } },
}

const buttonVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 120, damping: 10, delay: 0.8 } },
}

export function HeroSection({ currentPot }: HeroSectionProps) {
  const [events, setEvents] = useState<DartEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentEventIndex, setCurrentEventIndex] = useState(0)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase.from("dart_events").select("*").order("date_start", { ascending: true })

        if (error) {
          throw error
        }

        const sortedEvents = (data || []).sort((a, b) => {
          const aIsLioncup = a.name.toLowerCase().includes("lioncup")
          const bIsLioncup = b.name.toLowerCase().includes("lioncup")

          if (aIsLioncup && !bIsLioncup) return -1
          if (!aIsLioncup && bIsLioncup) return 1
          return 0
        })

        setEvents(sortedEvents)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  useEffect(() => {
    if (events.length > 1) {
      const currentEvent = events[currentEventIndex]
      const isCurrentLioncup = currentEvent?.name.toLowerCase().includes("lioncup")
      const intervalTime = isCurrentLioncup ? 12000 : 4000 // 12s for LIONCUP, 4s for others

      const interval = setInterval(() => {
        setCurrentEventIndex((prev) => (prev + 1) % events.length)
      }, intervalTime)
      return () => clearInterval(interval)
    }
  }, [events]) // Updated dependency to events

  if (loading) {
    return (
      <section className="relative flex min-h-[60vh] sm:min-h-[70vh] lg:h-[calc(100vh-80px)] items-center justify-center bg-brutal-bg text-brutal-text px-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm sm:text-base">Lade Event-Daten...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="relative flex min-h-[60vh] sm:min-h-[70vh] lg:h-[calc(100vh-80px)] items-center justify-center bg-brutal-bg text-brutal-text px-4">
        <div className="text-center max-w-md">
          <p className="text-destructive text-sm sm:text-base">Fehler beim Laden der Events: {error}</p>
        </div>
      </section>
    )
  }

  if (!events || events.length === 0) {
    return (
      <section className="relative flex min-h-[60vh] sm:min-h-[70vh] lg:h-[calc(100vh-80px)] items-center justify-center bg-brutal-bg text-brutal-text px-4">
        <p className="text-sm sm:text-base">Keine Event-Daten gefunden.</p>
      </section>
    )
  }

  const currentEvent = events[currentEventIndex]
  const isLioncup = currentEvent?.name.toLowerCase().includes("lioncup")

  const getBackgroundImage = () => {
    if (isLioncup) {
      return "/images/lioncup-bg.png" // Separate image for LIONCUP events
    }
    return "/images/summer-bg.png" // Separate image for SUMMER events
  }

  const eventColors = isLioncup
    ? {
        primary: "text-orange-400",
        secondary: "text-orange-200",
        accent: "text-white",
        buttonBg: "bg-orange-600",
        buttonHover: "hover:bg-orange-700",
        cardBg: "bg-gradient-to-br from-orange-500/20 to-orange-600/30",
        cardBorder: "border-orange-400/50",
      }
    : {
        primary: "text-brutal-accent-red",
        secondary: "text-brutal-accent-gold",
        accent: "text-white",
        buttonBg: "bg-red-600",
        buttonHover: "hover:bg-red-700",
        cardBg: "bg-white/95",
        cardBorder: "border-gray-200",
      }

  const getEventTitle = () => {
    if (isLioncup) {
      return (
        <>
          <span className={`block ${eventColors.primary}`}>EMD - LION CUP</span>
          <span className={`block ${eventColors.accent}`}>DART TOURNAMENT</span>
          <span className={`block ${eventColors.secondary}`}>2025/2026</span>
        </>
      )
    }
    return (
      <>
        <span className={`block ${eventColors.primary}`}>SUMMER SPECIAL</span>
        <span className={`block ${eventColors.accent}`}>DART COMPETITION</span>
        <span className={`block ${eventColors.secondary}`}>2025</span>
      </>
    )
  }

  const getEventDates = () => {
    if (isLioncup) {
      return "01. SEP. 2025 - 01. JUN. 2026"
    }
    return "02. JULI - 29. AUG. 2025"
  }

  const getEventLocation = () => {
    if (isLioncup) {
      return "JEDEN MONTAG 19:30"
    }
    return "PFEIL-OK SALZBURG"
  }

  return (
    <section className="relative flex min-h-[60vh] sm:min-h-[70vh] lg:h-[calc(100vh-80px)] items-center justify-center overflow-hidden bg-brutal-bg text-brutal-text">
      <Image
        src={getBackgroundImage() || "/placeholder.svg"}
        alt={isLioncup ? "LIONCUP Hintergrundbild" : "Summer Special Hintergrundbild"}
        fill
        className="absolute inset-0 z-0 opacity-20 sm:opacity-30 object-cover transition-opacity duration-500"
        priority
        sizes="100vw"
        key={currentEventIndex} // Force re-render when event changes
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-brutal-bg to-transparent"></div>

      <motion.div
        className="relative z-10 flex flex-col items-center justify-center text-center px-3 sm:px-4 py-8 sm:py-12 md:py-20 w-full max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={currentEventIndex}
      >
        {events.length > 1 && (
          <motion.div variants={itemVariants} className="mb-4 flex gap-2">
            {events.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentEventIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentEventIndex ? (isLioncup ? "bg-orange-400" : "bg-red-600") : "bg-white/30"
                }`}
              />
            ))}
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
          <h1
            className={`text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold uppercase leading-none tracking-tighter mb-4 sm:mb-6 drop-shadow-2xl ${
              isLioncup ? "drop-shadow-[0_0_30px_rgba(251,146,60,0.5)]" : ""
            }`}
          >
            {getEventTitle()}
          </h1>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm sm:text-base lg:text-lg font-bold">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border shadow-lg ${
                isLioncup ? "bg-orange-600 border-orange-700 shadow-orange-500/25" : "bg-red-600 border-red-700"
              }`}
            >
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
              <span className="text-xs sm:text-sm lg:text-base text-white font-bold">{getEventDates()}</span>
            </div>
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border shadow-lg ${
                isLioncup ? "bg-orange-500 border-orange-600 shadow-orange-400/25" : "bg-yellow-600 border-yellow-700"
              }`}
            >
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
              <span className="text-xs sm:text-sm lg:text-base text-white font-bold">{getEventLocation()}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12 w-full max-w-5xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={cardVariants}
            className={`flex flex-col items-center justify-center rounded-lg backdrop-blur-sm p-4 sm:p-6 border shadow-xl ${
              isLioncup
                ? `${eventColors.cardBg} ${eventColors.cardBorder} shadow-orange-500/20`
                : `${eventColors.cardBg} ${eventColors.cardBorder}`
            }`}
          >
            <Calendar
              className={`h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 mb-2 sm:mb-3 ${isLioncup ? "text-orange-600" : "text-red-600"}`}
            />
            <span
              className={`text-xl sm:text-2xl lg:text-3xl font-bold text-center ${isLioncup ? "text-white" : "text-black"}`}
            >
              {isLioncup ? "34 TURNIERTAGE" : "2 JULI - 29 AUGUST"}
            </span>
            <span
              className={`text-xs sm:text-sm lg:text-base uppercase text-center font-semibold ${
                isLioncup ? "text-orange-200" : "text-gray-600"
              }`}
            >
              {isLioncup ? "+ 1 FINALTAG" : "COMPETITION 2025"}
            </span>
          </motion.div>
          <motion.div
            variants={cardVariants}
            className={`flex flex-col items-center justify-center rounded-lg backdrop-blur-sm p-4 sm:p-6 border shadow-xl ${
              isLioncup
                ? `${eventColors.cardBg} ${eventColors.cardBorder} shadow-orange-500/20`
                : `${eventColors.cardBg} ${eventColors.cardBorder}`
            }`}
          >
            <MapPin
              className={`h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 mb-2 sm:mb-3 ${isLioncup ? "text-orange-600" : "text-red-600"}`}
            />
            <span
              className={`text-xl sm:text-2xl lg:text-3xl font-bold text-center ${isLioncup ? "text-white" : "text-black"}`}
            >
              {isLioncup ? "PFEIL-OK" : "PFEIL-OK"}
            </span>
            <span
              className={`text-xs sm:text-sm lg:text-base uppercase text-center font-semibold ${
                isLioncup ? "text-orange-200" : "text-gray-600"
              }`}
            >
              {isLioncup ? "SALZBURG" : "SALZBURG"}
            </span>
          </motion.div>
          <motion.div
            variants={cardVariants}
            className={`flex flex-col items-center justify-center rounded-lg backdrop-blur-sm p-4 sm:p-6 border shadow-xl sm:col-span-2 lg:col-span-1 ${
              isLioncup
                ? `${eventColors.cardBg} ${eventColors.cardBorder} shadow-orange-500/20`
                : `${eventColors.cardBg} ${eventColors.cardBorder}`
            }`}
          >
            <Trophy
              className={`h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 mb-2 sm:mb-3 ${isLioncup ? "text-orange-600" : "text-red-600"}`}
            />
            <span className={`text-xl sm:text-2xl lg:text-3xl font-bold ${isLioncup ? "text-white" : "text-black"}`}>
              {isLioncup
                ? "20 ANTRITTE"
                : `€${currentPot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
            <span
              className={`text-xs sm:text-sm lg:text-base uppercase text-center font-semibold ${
                isLioncup ? "text-orange-200" : "text-gray-600"
              }`}
            >
              {isLioncup ? "FÜR FINALE" : "AKTUELLER POT"}
            </span>
          </motion.div>
        </motion.div>

        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg lg:text-xl uppercase font-bold mb-4 sm:mb-6 text-white"
        >
          EVENT STARTS IN
        </motion.p>
        {currentEvent.event_starts_at && (
          <motion.div variants={itemVariants} className="mb-8 sm:mb-12">
            <Countdown targetDate={currentEvent.event_starts_at} />
          </motion.div>
        )}

        <motion.div
          className="flex flex-col sm:flex-row gap-3 sm:gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={buttonVariants}>
            <Link href="/tournament">
              <Button
                variant="outline"
                className={`border-white text-white hover:bg-white font-extrabold py-3 sm:py-4 px-6 sm:px-10 rounded-md text-base sm:text-lg lg:text-xl bg-white/90 shadow-lg hover:scale-105 transition-transform uppercase w-full sm:w-auto min-h-[48px] ${
                  isLioncup
                    ? "hover:text-orange-600 border-orange-400 text-orange-400"
                    : "hover:text-red-600 border-red-600 text-red-600"
                }`}
              >
                {isLioncup ? "EMD - LION CUP ANMELDUNG" : "MEHR ERFAHREN"}
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}
