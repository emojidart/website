"use client"

import Image from "next/image"
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
  hidden: { opacity: 0, y: 70 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 50 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 90, damping: 10, duration: 0.6 } },
}

const buttonVariants = {
  hidden: { opacity: 0, scale: 0.8 },
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
      <section className="relative flex h-[calc(100vh-80px)] items-center justify-center bg-brutal-bg text-brutal-text">
        <p>Lade Event-Daten...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="relative flex h-[calc(100vh-80px)] items-center justify-center bg-brutal-bg text-brutal-text">
        <p className="text-destructive">Fehler beim Laden des Events: {error}</p>
      </section>
    )
  }

  if (!event) {
    return (
      <section className="relative flex h-[calc(100vh-80px)] items-center justify-center bg-brutal-bg text-brutal-text">
        <p>Keine Event-Daten gefunden.</p>
      </section>
    )
  }

  const startDate = new Date(event.date_start)
  const endDate = new Date(event.date_end)
  const formattedDate = `${startDate.getDate()}-${endDate.getDate()} ${startDate.toLocaleString("default", { month: "short" }).toUpperCase()}`
  const daysOfAction = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  const titleParts = ["EMOJIS", "DART", "COMPETITION"]
  const yearPart = "2025"

  return (
    <section className="relative flex h-[calc(100vh-80px)] items-center justify-center overflow-hidden bg-brutal-bg text-brutal-text">
      {/* Hintergrundbild mit dunklem Overlay */}
      <Image
        src="/images/brutal-darts-bg.png"
        alt="Hintergrundbild für Dartverein"
        layout="fill"
        objectFit="cover"
        quality={100}
        className="absolute inset-0 z-0 opacity-30"
        priority
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-brutal-bg to-transparent"></div>
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-12 md:py-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-7xl md:text-9xl lg:text-[10rem] font-extrabold uppercase leading-none tracking-tighter mb-4 drop-shadow-2xl">
          {titleParts.map((line, lineIndex) => (
            <motion.span
              key={lineIndex}
              className="block"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {line.split(" ").map((word, wordIndex) => (
                <motion.span
                  key={wordIndex}
                  className={`inline-block ${word === "C" ? "text-brutal-accent-red" : ""}`}
                  variants={itemVariants}
                  style={{ marginRight: "0.5em" }}
                >
                  {word}
                </motion.span>
              ))}
            </motion.span>
          ))}
        </h1>
        <motion.p
          variants={itemVariants}
          className="text-2xl md:text-3xl font-bold uppercase mb-12 text-brutal-text-muted"
        >
          {yearPart}
        </motion.p>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full max-w-5xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={cardVariants}
            className="flex flex-col items-center justify-center rounded-lg bg-brutal-card-bg p-6 backdrop-blur-sm border border-brutal-border shadow-xl"
          >
            <Calendar className="h-12 w-12 text-brutal-accent-red mb-3" />
            <span className="text-4xl font-bold">{formattedDate}</span>
            <span className="text-base uppercase text-brutal-text-muted">{daysOfAction} DAYS OF ACTION</span>
          </motion.div>
          <motion.div
            variants={cardVariants}
            className="flex flex-col items-center justify-center rounded-lg bg-brutal-card-bg p-6 backdrop-blur-sm border border-brutal-border shadow-xl"
          >
            <MapPin className="h-12 w-12 text-brutal-accent-red mb-3" />
            <span className="text-4xl font-bold">{event.location.split(",")[0]}</span>
            <span className="text-base uppercase text-brutal-text-muted">
              {event.location.split(",")[1]?.trim() || "MAGIC CASTLE"}
            </span>
          </motion.div>
          <motion.div
            variants={cardVariants}
            className="flex flex-col items-center justify-center rounded-lg bg-brutal-card-bg p-6 backdrop-blur-sm border border-brutal-border shadow-xl"
          >
            <Trophy className="h-12 w-12 text-brutal-accent-red mb-3" />
            <span className="text-4xl font-bold">
              €{currentPot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-base uppercase text-brutal-text-muted">AKTUELLER POT</span>
          </motion.div>
        </motion.div>

        <motion.p variants={itemVariants} className="text-xl uppercase font-bold mb-6 text-brutal-text-muted">
          EVENT STARTS IN
        </motion.p>
        {event.event_starts_at && (
          <motion.div variants={itemVariants}>
            <Countdown targetDate={event.event_starts_at} />
          </motion.div>
        )}

        <motion.div
          className="mt-12 flex flex-col sm:flex-row gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={buttonVariants}>
            <Button
              variant="outline"
              className="border-brutal-accent-red text-brutal-accent-red hover:bg-brutal-accent-red hover:text-brutal-bg font-extrabold py-4 px-10 rounded-md text-xl bg-transparent shadow-lg hover:scale-105 transition-transform uppercase"
            >
              MEHR ERFAHREN
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}
