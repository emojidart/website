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
  const [event, setEvent] = useState<DartEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { data, error } = await supabase.from("dart_events").select("*").limit(1).single()

        if (error) {
          throw error
        }
        setEvent(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [])

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
          <p className="text-destructive text-sm sm:text-base">Fehler beim Laden des Events: {error}</p>
        </div>
      </section>
    )
  }

  if (!event) {
    return (
      <section className="relative flex min-h-[60vh] sm:min-h-[70vh] lg:h-[calc(100vh-80px)] items-center justify-center bg-brutal-bg text-brutal-text px-4">
        <p className="text-sm sm:text-base">Keine Event-Daten gefunden.</p>
      </section>
    )
  }

  const startDate = new Date(event.date_start)
  const endDate = new Date(event.date_end)
  const formattedDate = `${startDate.getDate()}-${endDate.getDate()} ${startDate.toLocaleString("default", { month: "short" }).toUpperCase()}`
  const daysOfAction = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  return (
    <section className="relative flex min-h-[60vh] sm:min-h-[70vh] lg:h-[calc(100vh-80px)] items-center justify-center overflow-hidden bg-brutal-bg text-brutal-text">
      {/* Hintergrundbild mit dunklem Overlay - Mobile optimiert */}
      <Image
        src="/images/brutal-darts-bg.png"
        alt="Hintergrundbild für Dartverein"
        fill
        className="absolute inset-0 z-0 opacity-20 sm:opacity-30 object-cover"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-brutal-bg to-transparent"></div>

      <motion.div
        className="relative z-10 flex flex-col items-center justify-center text-center px-3 sm:px-4 py-8 sm:py-12 md:py-20 w-full max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Title - Mobile optimiert */}
        <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold uppercase leading-none tracking-tighter mb-4 sm:mb-6 drop-shadow-2xl">
            <span className="block text-brutal-accent-red">SUMMER SPECIAL</span>
            <span className="block">DART COMPETITION</span>
            <span className="block text-brutal-accent-gold">2025</span>
          </h1>
          <p className="text-sm sm:text-lg md:text-xl lg:text-2xl font-bold uppercase text-brutal-text-muted mb-6 sm:mb-8">
            WITH SOFTDART & STEELDART COMP.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm sm:text-base lg:text-lg font-bold">
            <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-brutal-accent-red" />
              <span className="text-xs sm:text-sm lg:text-base">02. JULI - 29. AUG. 2025</span>
            </div>
            <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-100">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-brutal-accent-red" />
              <span className="text-xs sm:text-sm lg:text-base">PFEIL-OK SALZBURG</span>
            </div>
          </div>
        </motion.div>

        {/* Info Cards - Mobile Stack */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12 w-full max-w-5xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={cardVariants}
            className="flex flex-col items-center justify-center rounded-lg bg-brutal-card-bg p-4 sm:p-6 backdrop-blur-sm border border-brutal-border shadow-xl"
          >
            <Calendar className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-brutal-accent-red mb-2 sm:mb-3" />
            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold">{formattedDate}</span>
            <span className="text-xs sm:text-sm lg:text-base uppercase text-brutal-text-muted text-center">
              {daysOfAction} DAYS OF ACTION
            </span>
          </motion.div>
          <motion.div
            variants={cardVariants}
            className="flex flex-col items-center justify-center rounded-lg bg-brutal-card-bg p-4 sm:p-6 backdrop-blur-sm border border-brutal-border shadow-xl"
          >
            <MapPin className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-brutal-accent-red mb-2 sm:mb-3" />
            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center">
              {event.location.split(",")[0]}
            </span>
            <span className="text-xs sm:text-sm lg:text-base uppercase text-brutal-text-muted text-center">
              {event.location.split(",")[1]?.trim() || "MAGIC CASTLE"}
            </span>
          </motion.div>
          <motion.div
            variants={cardVariants}
            className="flex flex-col items-center justify-center rounded-lg bg-brutal-card-bg p-4 sm:p-6 backdrop-blur-sm border border-brutal-border shadow-xl sm:col-span-2 lg:col-span-1"
          >
            <Trophy className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-brutal-accent-red mb-2 sm:mb-3" />
            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold">
              €{currentPot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs sm:text-sm lg:text-base uppercase text-brutal-text-muted text-center">
              AKTUELLER POT
            </span>
          </motion.div>
        </motion.div>

        {/* Countdown Section */}
        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg lg:text-xl uppercase font-bold mb-4 sm:mb-6 text-brutal-text-muted"
        >
          EVENT STARTS IN
        </motion.p>
        {event.event_starts_at && (
          <motion.div variants={itemVariants} className="mb-8 sm:mb-12">
            <Countdown targetDate={event.event_starts_at} />
          </motion.div>
        )}

        {/* CTA Button */}
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
                className="border-brutal-accent-red text-brutal-accent-red hover:bg-brutal-accent-red hover:text-brutal-bg font-extrabold py-3 sm:py-4 px-6 sm:px-10 rounded-md text-base sm:text-lg lg:text-xl bg-transparent shadow-lg hover:scale-105 transition-transform uppercase w-full sm:w-auto min-h-[48px]"
              >
                MEHR ERFAHREN
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}
