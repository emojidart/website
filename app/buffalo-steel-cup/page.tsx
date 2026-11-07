"use client"

import { Header } from "@/components/header"
import { Calendar, MapPin, Sparkles, Star, Target, Trophy, Euro, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

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

/* ===================== DB TYPES + HELPERS ===================== */

type DkoSeries = {
  id: string
  name: string
  slug: string
}

type DkoSeriesEvent = {
  id: string
  series_id: string
  start_at: string
  is_matchday: boolean
  is_rescheduled?: boolean | null
  rescheduled_at?: string | null
}

type UiEvent = {
  id: string
  effectiveDT: Date
  originalDT: Date
  isRescheduled: boolean
}

type UiPair = {
  left: UiEvent
  right: UiEvent | null
}

function formatDateLabel(dt: Date) {
  return dt.toLocaleDateString("de-AT", { day: "2-digit", month: "short", year: "numeric" })
}

function formatTimeLabel(dt: Date) {
  return `${dt.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} Uhr`
}

function formatFullLabel(dt: Date) {
  // z.B. "Mi. 07. Jän. 2026 - 19:30 Uhr"
  const weekday = dt.toLocaleDateString("de-AT", { weekday: "short" })
  return `${weekday} ${formatDateLabel(dt)} - ${formatTimeLabel(dt)}`
}

function RescheduleInline({
  ev,
  accent = "slate",
}: {
  ev: UiEvent
  accent?: "slate" | "blue"
}) {
  if (!ev.isRescheduled) return null

  const accentClasses =
    accent === "blue"
      ? {
          chip: "bg-blue-600 text-white border-blue-500/30",
          ring: "ring-blue-200",
          dot: "bg-blue-600",
          label: "text-blue-700",
        }
      : {
          chip: "bg-background text-white border-border/30",
          ring: "ring-border",
          dot: "bg-background",
          label: "text-muted-foreground",
        }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={[
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm",
            "ring-2",
            accentClasses.chip,
            accentClasses.ring,
          ].join(" ")}
        >
          <RefreshCw className="h-3 w-3 opacity-90" />
          Neuer Termin: {formatDateLabel(ev.effectiveDT)} • {formatTimeLabel(ev.effectiveDT)}
        </span>

        <span className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${accentClasses.label}`}>
          <span className={`h-2 w-2 rounded-full ${accentClasses.dot}`} />
          Verschoben
        </span>
      </div>

      <div className="text-xs text-muted-foreground">
        <span className="opacity-70">Original:</span>{" "}
        <span className="line-through decoration-2 decoration-gray-400">
          {formatDateLabel(ev.originalDT)} • {formatTimeLabel(ev.originalDT)}
        </span>
      </div>
    </div>
  )
}

export default function BuffaloSteelCupPage() {
  // ❌ spieltage hardcode entfernt (war hier) :contentReference[oaicite:1]{index=1}

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

  /* ===================== DB STATE (nur für Spieltage) ===================== */
  const [buffaloSeries, setBuffaloSeries] = useState<DkoSeries | null>(null)
  const [buffaloEvents, setBuffaloEvents] = useState<UiEvent[]>([])
  const [dkoLoading, setDkoLoading] = useState(true)
  const [dkoError, setDkoError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setDkoLoading(true)
      setDkoError(null)

      try {
        const { data: seriesData, error: sErr } = await supabase
          .from("dko_series")
          .select("id,name,slug")
          .eq("slug", "buffalo-steel-cup-2026")
          .maybeSingle()

        if (sErr) throw sErr

        if (!seriesData?.id) {
          setBuffaloSeries(null)
          setBuffaloEvents([])
          return
        }

        setBuffaloSeries(seriesData as DkoSeries)

        const { data: evData, error: eErr } = await supabase
          .from("dko_series_events")
          .select("id,series_id,start_at,is_matchday,is_rescheduled,rescheduled_at")
          .eq("series_id", seriesData.id)
          .order("start_at", { ascending: true })

        if (eErr) throw eErr

        const mapped: UiEvent[] = (evData || [])
          .filter((e: DkoSeriesEvent) => !!e.is_matchday)
          .map((ev: DkoSeriesEvent) => {
            const isRescheduled = !!ev.is_rescheduled && !!ev.rescheduled_at
            const effectiveIso = isRescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at
            return {
              id: ev.id,
              effectiveDT: new Date(effectiveIso),
              originalDT: new Date(ev.start_at),
              isRescheduled,
            }
          })

        setBuffaloEvents(mapped)
      } catch (e: any) {
        console.error(e)
        setDkoError(e?.message ? String(e.message) : "Fehler beim Laden der Buffalo-Spieltage.")
      } finally {
        setDkoLoading(false)
      }
    }

    run()
  }, [])

  // Pairing: immer 2 Events -> ein Spieltag (mittwoch/samstag)
  const pairedSpieltage: UiPair[] = useMemo(() => {
    const res: UiPair[] = []
    for (let i = 0; i < buffaloEvents.length; i += 2) {
      res.push({ left: buffaloEvents[i], right: buffaloEvents[i + 1] ?? null })
    }
    return res
  }, [buffaloEvents])

  return (
    <div className="min-h-screen bg-muted text-foreground font-sans">
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
            <div className="text-foreground bg-card    rounded-3xl shadow-2xl border border-border p-8 md:p-16 mb-8 relative overflow-hidden">
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
                  <span className="block text-white text-balance">EMD-BUFFALO-STEEL</span>
                  <span className="block text-red-500 text-balance">DART SERIEN CUP</span>
                  <span className="block text-muted-foreground text-3xl md:text-4xl lg:text-5xl mt-4">EMD TO PFEIL OK - SINCE 2023</span>
                </h1>

                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-base md:text-lg font-bold mb-8">
                  <div className="flex items-center gap-2 bg-white/10 px-6 py-3 rounded-xl border border-white/20 ">
                    <Calendar className="h-5 w-5 text-red-400" />
                    <span className="text-white">07. JÄN. - 07. FEB. 2026</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-6 py-3 rounded-xl border border-white/20 ">
                    <MapPin className="h-5 w-5 text-red-400" />
                    <span className="text-white">PFEIL-OK SALZBURG</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <motion.div
              variants={cardVariants}
              className="bg-card rounded-2xl shadow-xl border border-border p-8 text-center hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <div className="text-foreground bg-card   rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                <Euro className="h-8 w-8 text-white mx-auto" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2 uppercase">Anmeldung</h3>
              <p className="text-3xl font-extrabold text-green-600 mb-2">€ 10,-</p>
              <p className="text-muted-foreground font-semibold">Einmalig</p>
            </motion.div>

            <motion.div
              variants={cardVariants}
              className="bg-card rounded-2xl shadow-xl border border-border p-8 text-center hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <div className="text-foreground bg-card   rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                <Target className="h-8 w-8 text-white mx-auto" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2 uppercase">Startgeld</h3>
              <p className="text-3xl font-extrabold text-blue-600 mb-2">€ 5,-</p>
              <p className="text-muted-foreground font-semibold">Pro Teilnahme</p>
            </motion.div>

            <motion.div
              variants={cardVariants}
              className="bg-card rounded-2xl shadow-xl border border-border p-8 text-center hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <div className="text-foreground bg-card   rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                <Trophy className="h-8 w-8 text-white mx-auto" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2 uppercase">Auszahlung</h3>
              <p className="text-muted-foreground font-semibold mb-2">1. - 5. Platz</p>
              <p className="text-muted-foreground font-semibold">Gesamtpot</p>
            </motion.div>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-16">
            <motion.div
              variants={cardVariants}
              className="text-foreground bg-card    rounded-2xl shadow-xl border border-yellow-400 p-8 text-center"
            >
              <div className="bg-card rounded-full p-4 w-16 h-16 mx-auto mb-6 shadow-lg">
                <Trophy className="h-8 w-8 text-yellow-600 mx-auto" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold uppercase mb-6 text-white">
                Preisverteilung & Belohnungen
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {[
                  { place: "1. Platz", percent: "30%" },
                  { place: "2. Platz", percent: "25%" },
                  { place: "3. Platz", percent: "20%" },
                  { place: "4. Platz", percent: "15%" },
                  { place: "5. Platz", percent: "10%" },
                ].map((prize, index) => (
                  <div key={index} className="bg-white/20  rounded-xl p-4 border border-white/30">
                    <div className="text-white font-bold text-lg mb-2">{prize.place}</div>
                    <div className="text-white text-3xl font-extrabold">{prize.percent}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white/20  rounded-xl p-4 border border-white/30">
                <p className="text-white font-bold text-lg">+ Überraschung & Urkunde für alle Gewinner</p>
              </div>
            </motion.div>
          </motion.div>

          {/* ===================== SPIELTAGE (DB) – NUR DIESER BLOCK IST GEÄNDERT ===================== */}
          <motion.div variants={itemVariants} className="mb-16">
            <motion.div variants={cardVariants} className="bg-card rounded-2xl shadow-xl border border-border p-8">
              <div className="text-center mb-8">
                <div className="text-foreground bg-card   rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                  <Calendar className="h-8 w-8 text-white mx-auto" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold uppercase text-foreground">Spieltage</h2>
              </div>

              {dkoLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Lade Termine…</span>
                </div>
              ) : dkoError ? (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">Fehler beim Laden: {dkoError}</span>
                </div>
              ) : !buffaloSeries ? (
                <div className="text-sm text-muted-foreground">Buffalo Steel Cup nicht in der DB gefunden.</div>
              ) : pairedSpieltage.length === 0 ? (
                <div className="text-sm text-muted-foreground">Noch keine Spieltage in der DB.</div>
              ) : (
                <div className="space-y-4">
                  {pairedSpieltage.map((pair, index) => {
                    const leftLabel = formatFullLabel(pair.left.effectiveDT)
                    const rightLabel = pair.right ? formatFullLabel(pair.right.effectiveDT) : "—"

                    return (
                      <motion.div
                        key={pair.left.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="text-foreground bg-card   border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="bg-blue-500 text-white font-bold rounded-full w-10 h-10 flex items-center justify-center text-lg">
                              {index + 1}
                            </div>

                            <div className="text-left">
                              <p className="font-bold text-foreground">{leftLabel}</p>
                              <RescheduleInline ev={pair.left} accent="blue" />
                            </div>
                          </div>

                          <div className="hidden md:block text-muted-foreground font-bold text-2xl">/</div>

                          <div className="flex items-center gap-3 flex-1 md:justify-end">
                            <div className="text-left md:text-right">
                              <p className="font-bold text-foreground">{rightLabel}</p>
                              {pair.right ? <RescheduleInline ev={pair.right} accent="blue" /> : null}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
          {/* ===================== ENDE SPIELTAGE (DB) ===================== */}

          {/* Location */}
          <motion.div variants={itemVariants} className="mb-16">
            <motion.div
              variants={cardVariants}
              className="bg-card rounded-2xl shadow-xl border border-border p-8 text-center hover:shadow-2xl transition-shadow duration-300"
            >
              <div className="text-foreground bg-card   rounded-full p-4 w-16 h-16 mx-auto mb-6 shadow-lg">
                <MapPin className="h-8 w-8 text-white mx-auto" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold uppercase mb-6 text-foreground">VERANSTALTUNGSORT</h2>
              <div className="space-y-4 text-lg">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <div className="font-bold text-red-700 text-xl mb-2">Dart & Freizeit Vereinsheim "Pfeil-OK" e.V.</div>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
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
              className="bg-card rounded-2xl shadow-xl border border-border p-8 hover:shadow-2xl transition-shadow duration-300"
            >
              <div className="text-center mb-8">
                <div className="text-foreground bg-card   rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                  <Sparkles className="h-8 w-8 text-white mx-auto" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold uppercase text-foreground">UNSERE PARTNER & SPONSOREN</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                {sponsors.map((sponsor, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-muted border border-border rounded-xl p-4 flex items-center justify-center hover:border-red-300 hover:bg-red-50 transition-all duration-300 group cursor-pointer hover:shadow-lg"
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

              <div className="bg-muted rounded-xl p-6 border border-border">
                <p className="text-muted-foreground font-bold text-center flex items-center justify-center flex-wrap gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-balance">VIELEN DANK AN ALLE UNSERE PARTNER UND UNTERSTÜTZER!</span>
                  <Star className="h-5 w-5 text-yellow-500" />
                </p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />

      <footer className="py-6 bg-secondary text-muted-foreground text-sm text-center border-t border-border">
        <p>&copy; 2026 Emoj!'s Dartverein e.V. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  )
}
