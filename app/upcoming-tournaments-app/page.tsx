"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { DKOSelfRegistrationModal } from "@/components/dko-self-registration-modal"
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
  X,
  LogOut,
  Lock,
  ShieldAlert,
  Timer,
  Trophy,
  RefreshCw,
} from "lucide-react"
import { motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

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

type DkoSeries = {
  id: string
  name: string
  slug: string
  is_active: boolean
}

type DkoSeriesEvent = {
  id: string
  series_id: string
  title: string | null
  start_at: string
  is_matchday: boolean
  registration_cutoff_minutes: number | null
  is_rescheduled?: boolean | null
  rescheduled_at?: string | null
}

type UiEvent = {
  id: string
  series_id: string
  is_matchday: boolean
  cutoffMinutes: number
  effectiveIso: string
  effectiveDT: Date
  originalIso: string
  originalDT: Date
  isRescheduled: boolean
  dateLabel: string
  timeLabel: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } },
}
const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 90, damping: 10 } },
}

/** ---------- Date/Time Helpers ---------- **/
function formatMMSS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mm = String(Math.floor(s / 60)).padStart(2, "0")
  const ss = String(s % 60).padStart(2, "0")
  return `${mm}:${ss}`
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function isDateInPastDT(d: Date) {
  return startOfDay(d).getTime() < startOfDay(new Date()).getTime()
}

function isDateTodayDT(d: Date) {
  return startOfDay(d).getTime() === startOfDay(new Date()).getTime()
}

function formatDateLabel(dt: Date) {
  return dt.toLocaleDateString("de-AT", { day: "2-digit", month: "short", year: "numeric" })
}

function formatTimeLabel(dt: Date) {
  return `${dt.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} Uhr`
}

function computeCutoffFromStart(startDT: Date, cutoffMinutes: number, nowMs: number) {
  const cutoffDT = new Date(startDT.getTime() - cutoffMinutes * 60 * 1000)
  const secondsLeft = Math.ceil((cutoffDT.getTime() - nowMs) / 1000)
  const closed = secondsLeft <= 0
  return { cutoffDT, secondsLeft, closed }
}

/** ---------- Modern "Verschoben" UI ---------- **/
function RescheduleBadge({
  isRescheduled,
  effectiveDT,
  originalDT,
  accent = "orange",
}: {
  isRescheduled: boolean
  effectiveDT: Date
  originalDT: Date
  accent?: "orange" | "slate"
}) {
  if (!isRescheduled) return null

  const newDate = formatDateLabel(effectiveDT)
  const newTime = formatTimeLabel(effectiveDT)
  const oldDate = formatDateLabel(originalDT)
  const oldTime = formatTimeLabel(originalDT)

  const accentClasses =
    accent === "orange"
      ? {
          chip: "bg-orange-600 text-white border-orange-500/30",
          ring: "ring-orange-200",
          label: "text-orange-700",
          dot: "bg-orange-600",
        }
      : {
          chip: "bg-slate-800 text-white border-slate-700/30",
          ring: "ring-slate-200",
          label: "text-slate-700",
          dot: "bg-slate-800",
        }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={[
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm",
            "ring-2",
            accentClasses.chip,
            accentClasses.ring,
          ].join(" ")}
        >
          <RefreshCw className="h-3 w-3 opacity-90" />
          Neuer Termin: {newDate} • {newTime}
        </span>

        <span className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide ${accentClasses.label}`}>
          <span className={`h-2 w-2 rounded-full ${accentClasses.dot}`} />
          Verschoben
        </span>
      </div>

      <div className="text-[11px] text-gray-600">
        <span className="opacity-70">Original:</span>{" "}
        <span className="line-through decoration-2 decoration-gray-400">
          {oldDate} • {oldTime}
        </span>
      </div>
    </div>
  )
}

type DkoModalState = { isOpen: boolean; date: string; time: string; title: string }

export default function UpcomingTournamentsAppPage() {
  const { session } = useAuth() as any

  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // ✅ Shared Self-Registration modal for ALL (Lion, Buffalo, Weitere Turniere)
  const [dkoModal, setDkoModal] = useState<DkoModalState>({
    isOpen: false,
    date: "",
    time: "",
    title: "Anmeldung",
  })

  // ✅ Prevent auto-close on initial modal sync
  const modalOpenedAtRef = useRef<number>(0)

  // ✅ Toast
  const [toast, setToast] = useState<{ show: boolean; text: string }>({ show: false, text: "" })
  const showToast = (text: string) => {
    setToast({ show: true, text })
    window.setTimeout(() => setToast({ show: false, text: "" }), 2500)
  }

  // ✅ registration state (as you already had)
  const [regLoading, setRegLoading] = useState(false)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)

  const [showAllLionCup, setShowAllLionCup] = useState(false)
  const [showAllBuffalo, setShowAllBuffalo] = useState(false)

  // ✅ tick for countdowns
  const [nowTick, setNowTick] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  /** ---------- Load DKO series + events from DB ---------- **/
  const [lionSeries, setLionSeries] = useState<DkoSeries | null>(null)
  const [buffaloSeries, setBuffaloSeries] = useState<DkoSeries | null>(null)
  const [lionEvents, setLionEvents] = useState<UiEvent[]>([])
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
          .select("id,name,slug,is_active")
          .in("slug", ["lion-cup-2025-26", "buffalo-steel-cup-2026"])

        if (sErr) throw sErr

        const list = (seriesData || []) as DkoSeries[]
        const lion = list.find((x) => x.slug === "lion-cup-2025-26") ?? null
        const buff = list.find((x) => x.slug === "buffalo-steel-cup-2026") ?? null

        setLionSeries(lion)
        setBuffaloSeries(buff)

        const fetchEventsFor = async (seriesId: string) => {
          const { data, error } = await supabase
            .from("dko_series_events")
            .select("id,series_id,title,start_at,is_matchday,registration_cutoff_minutes,is_rescheduled,rescheduled_at")
            .eq("series_id", seriesId)
            .order("start_at", { ascending: true })
          if (error) throw error
          return (data || []) as DkoSeriesEvent[]
        }

        const [lionRaw, buffRaw] = await Promise.all([
          lion?.id ? fetchEventsFor(lion.id) : Promise.resolve([] as DkoSeriesEvent[]),
          buff?.id ? fetchEventsFor(buff.id) : Promise.resolve([] as DkoSeriesEvent[]),
        ])

        const mapToUi = (ev: DkoSeriesEvent): UiEvent => {
          const isRescheduled = !!ev.is_rescheduled && !!ev.rescheduled_at
          const effectiveIso = isRescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at
          const effectiveDT = new Date(effectiveIso)
          const originalDT = new Date(ev.start_at)
          const cutoffMinutes = Number(ev.registration_cutoff_minutes ?? 10) || 10

          return {
            id: ev.id,
            series_id: ev.series_id,
            is_matchday: !!ev.is_matchday,
            cutoffMinutes,
            effectiveIso,
            effectiveDT,
            originalIso: ev.start_at,
            originalDT,
            isRescheduled,
            dateLabel: formatDateLabel(effectiveDT),
            timeLabel: formatTimeLabel(effectiveDT),
          }
        }

        setLionEvents(lionRaw.map(mapToUi))
        setBuffaloEvents(buffRaw.map(mapToUi))
      } catch (e: any) {
        console.error(e)
        setDkoError(e?.message ? String(e.message) : "Fehler beim Laden der DKO Serien/Termine.")
      } finally {
        setDkoLoading(false)
      }
    }

    run()
  }, [])

  const actualLionTournamentDays = useMemo(() => lionEvents.filter((e) => e.is_matchday).length, [lionEvents])

  const lionRange = useMemo(() => {
    if (lionEvents.length === 0) return null
    const first = lionEvents[0].effectiveDT
    const last = lionEvents[lionEvents.length - 1].effectiveDT
    return { from: formatDateLabel(first), to: formatDateLabel(last) }
  }, [lionEvents])

  /** ---------- Load other tournaments (tournaments table) ---------- **/
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

  /** ---------- Registration status for current user ---------- **/
  useEffect(() => {
    const run = async () => {
      setRegLoading(true)
      setAlreadyRegistered(false)

      try {
        if (!session?.user) return

        const { data: profile, error: profErr } = await supabase
          .from("user_profiles")
          .select("club_players(spieldatenbank_id)")
          .eq("user_id", session.user.id)
          .single()

        if (profErr) throw profErr

        const spieldatenbankId = profile?.club_players?.spieldatenbank_id
        if (!spieldatenbankId) return

        const pid = String(spieldatenbankId)

        const { data: reg, error: regErr } = await supabase
          .from("dko_tournament_registration")
          .select("id")
          .eq("player_id", pid)
          .limit(1)

        if (regErr) throw regErr

        setAlreadyRegistered((reg?.length ?? 0) > 0)
      } catch (e) {
        console.error("Registration status error:", e)
      } finally {
        setRegLoading(false)
      }
    }

    run()
  }, [session])

  /** ---------- Open self-reg modal (only today + before cutoff) ---------- **/
  const openSelfRegModalIfAllowed = (title: string, startDT: Date, cutoffMinutes: number) => {
    const today = isDateTodayDT(startDT)
    if (!today) return
    const { closed } = computeCutoffFromStart(startDT, cutoffMinutes, nowTick)
    if (closed) return

    modalOpenedAtRef.current = Date.now()
    setDkoModal({
      isOpen: true,
      title,
      date: formatDateLabel(startDT),
      time: formatTimeLabel(startDT),
    })
  }

  const openDkoModalIfAllowed = (title: string, ev: UiEvent, isToday: boolean) => {
    if (!isToday) return
    if (!ev.is_matchday) return
    const { closed } = computeCutoffFromStart(ev.effectiveDT, ev.cutoffMinutes, nowTick)
    if (closed) return

    modalOpenedAtRef.current = Date.now()
    setDkoModal({ isOpen: true, date: ev.dateLabel, time: ev.timeLabel, title })
  }

  const handleImageClick = (url: string) => setSelectedImage(url)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Header />

      <main className="pt-6 pb-24">
        <motion.div className="container mx-auto px-4" variants={containerVariants} initial="hidden" animate="visible">
          {/* ===== Lion Cup Header ===== */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl shadow-lg p-6 text-white">
              <div className="bg-white/10 rounded-full p-3 w-16 h-16 mx-auto mb-4">
                <Crown className="h-10 w-10 text-white mx-auto" />
              </div>

              <h1 className="text-2xl md:text-4xl font-extrabold uppercase leading-tight mb-3">
                <span className="block">EMD - LION CUP</span>
                <span className="block text-orange-200 text-xl md:text-3xl">2025/2026</span>
              </h1>

              <div className="bg-white/15 border border-white/20 rounded-lg p-3 text-xs font-semibold">
                <div className="flex items-center justify-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Anmeldung nur bis spätestens 10 Minuten vor Turnierbeginn möglich.</span>
                </div>
              </div>

              <p className="text-sm md:text-base font-bold text-orange-100 mt-4">
                {actualLionTournamentDays} TURNIERTAGE + 1 FINALTAG
              </p>

              <div className="flex flex-col gap-2 text-xs font-bold mt-3">
                <div className="flex items-center justify-center gap-2 bg-white/20 px-3 py-2 rounded-lg">
                  <Calendar className="h-4 w-4" />
                  <span>{lionRange ? `${lionRange.from} - ${lionRange.to}` : "—"}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ===== Lion Cup Schedule (DB) ===== */}
          <motion.div variants={itemVariants} className="space-y-6 mb-8">
            <motion.div variants={cardVariants} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-white" />
                  <h2 className="text-lg font-bold text-white uppercase">EMD - Lion Cup Spieltage</h2>
                </div>
              </div>

              <div className="p-4">
                {dkoLoading ? (
                  <div className="flex items-center justify-center gap-2 text-gray-700 py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Lade Termine…</span>
                  </div>
                ) : dkoError ? (
                  <div className="p-3 rounded-lg border bg-red-50 text-red-700 text-sm">Fehler beim Laden: {dkoError}</div>
                ) : lionSeries && lionEvents.length === 0 ? (
                  <div className="text-sm text-gray-600">Noch keine Termine in der DB.</div>
                ) : (
                  <div className="space-y-2">
                    {(showAllLionCup ? lionEvents : lionEvents.slice(0, 3)).map((ev, index) => {
                      const past = isDateInPastDT(ev.effectiveDT)
                      const today = isDateTodayDT(ev.effectiveDT)
                      const spielfrei = !ev.is_matchday

                      let cutoffDT: Date | null = null
                      let secondsLeft: number | null = null
                      let closed = false

                      if (today && !spielfrei) {
                        const r = computeCutoffFromStart(ev.effectiveDT, ev.cutoffMinutes, nowTick)
                        cutoffDT = r.cutoffDT
                        secondsLeft = r.secondsLeft
                        closed = r.closed
                      }

                      const canClick = today && !past && !spielfrei && !closed

                      const countdownLine =
                        today && !spielfrei
                          ? closed
                            ? "Anmeldung geschlossen (10 Min vorher)"
                            : secondsLeft !== null
                              ? `Anmeldung noch: ${formatMMSS(secondsLeft)}`
                              : null
                          : null

                      return (
                        <div
                          key={ev.id ?? index}
                          className={[
                            "flex justify-between items-center py-3 px-3 rounded-lg border transition-all",
                            spielfrei
                              ? "bg-yellow-50 border-yellow-200"
                              : past
                                ? "bg-gray-100 border-gray-200 opacity-60"
                                : today
                                  ? "bg-orange-50 border-orange-200"
                                  : "bg-gray-50 border-gray-100",
                            ev.isRescheduled ? "shadow-md border-orange-200 bg-gradient-to-r from-orange-50 to-white" : "",
                          ].join(" ")}
                        >
                          <div className="flex-1">
                            <span
                              className={`font-bold text-sm block ${
                                spielfrei ? "text-yellow-700" : past ? "text-gray-500" : "text-gray-900"
                              }`}
                            >
                              {ev.dateLabel} {today && !spielfrei ? <span className="text-orange-700">• Heute</span> : null}
                            </span>

                            <div
                              className={`flex items-center gap-1 mt-1 ${
                                spielfrei ? "text-yellow-600" : past ? "text-gray-400" : "text-orange-600"
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              <span className="text-xs font-bold">{ev.timeLabel}</span>
                            </div>

                            <RescheduleBadge
                              isRescheduled={ev.isRescheduled}
                              effectiveDT={ev.effectiveDT}
                              originalDT={ev.originalDT}
                              accent="orange"
                            />

                            {countdownLine && (
                              <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-800">
                                <Timer className="h-3 w-3 text-orange-600" />
                                <span className="font-semibold">{countdownLine}</span>
                              </div>
                            )}

                            {today && !spielfrei && cutoffDT && (
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-600">
                                <Info className="h-3 w-3" />
                                <span>
                                  Cutoff: {cutoffDT.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} Uhr
                                </span>
                              </div>
                            )}
                          </div>

                          {spielfrei ? (
                            <div className="bg-yellow-200 text-yellow-800 font-bold px-3 py-1 rounded-lg text-xs">Spielfrei</div>
                          ) : past ? (
                            <Button size="sm" disabled className="text-xs px-3 py-1 bg-gray-400 text-gray-600">
                              Vorbei
                            </Button>
                          ) : (
                            <Button
                              onClick={() => openDkoModalIfAllowed("Lion Cup Anmeldung", ev, today)}
                              size="sm"
                              disabled={!canClick}
                              title={
                                !today && !past
                                  ? "Anmeldung ist erst am Turniertag möglich."
                                  : today && closed
                                    ? "Anmeldung ist 10 Minuten vor Beginn geschlossen."
                                    : undefined
                              }
                              className={`text-xs px-3 py-1 ${
                                canClick
                                  ? alreadyRegistered
                                    ? "bg-gray-700 hover:bg-gray-800 text-white"
                                    : "bg-orange-600 hover:bg-orange-700 text-white"
                                  : "bg-gray-300 text-gray-700"
                              }`}
                            >
                              {regLoading ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  ...
                                </span>
                              ) : today ? (
                                alreadyRegistered ? (
                                  <span className="flex items-center gap-2">
                                    <LogOut className="h-3 w-3" />
                                    Abmelden
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-2">
                                    <UserPlus className="h-3 w-3" />
                                    Anmelden
                                  </span>
                                )
                              ) : (
                                <span className="flex items-center gap-2">
                                  <Lock className="h-3 w-3" />
                                  Am Turniertag
                                </span>
                              )}
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {!dkoLoading && !dkoError && lionEvents.length > 0 && (
                  <>
                    {!showAllLionCup ? (
                      <div className="mt-3 text-center">
                        <Button
                          onClick={() => setShowAllLionCup(true)}
                          variant="outline"
                          size="sm"
                          className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                        >
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Alle {lionEvents.length} Termine anzeigen
                        </Button>
                      </div>
                    ) : (
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
                  </>
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

          {/* ===== Buffalo Steel Cup (DB) ===== */}
          <motion.div variants={itemVariants} className="space-y-6 mb-8">
            <motion.div variants={cardVariants} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-white" />
                  <h2 className="text-lg font-bold text-white uppercase">Buffalo Steel Cup</h2>
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-gray-700 bg-slate-50 border border-slate-100 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldAlert className="h-4 w-4 text-slate-700" />
                    <span>Anmeldung nur am Turniertag – bis spätestens 10 Minuten vor Beginn.</span>
                  </div>
                </div>

                {dkoLoading ? (
                  <div className="flex items-center justify-center gap-2 text-gray-700 py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Lade Termine…</span>
                  </div>
                ) : dkoError ? (
                  <div className="p-3 rounded-lg border bg-red-50 text-red-700 text-sm">Fehler beim Laden: {dkoError}</div>
                ) : buffaloSeries && buffaloEvents.length === 0 ? (
                  <div className="text-sm text-gray-600">Noch keine Termine in der DB.</div>
                ) : (
                  <div className="space-y-2">
                    {(showAllBuffalo ? buffaloEvents : buffaloEvents.slice(0, 4)).map((ev) => {
                      const past = isDateInPastDT(ev.effectiveDT)
                      const today = isDateTodayDT(ev.effectiveDT)

                      const r = today
                        ? computeCutoffFromStart(ev.effectiveDT, ev.cutoffMinutes, nowTick)
                        : { cutoffDT: null as any, secondsLeft: null as any, closed: false }
                      const closed = today ? r.closed : false
                      const cutoffDT = today ? r.cutoffDT : null
                      const secondsLeft = today ? r.secondsLeft : null

                      const canClick = today && !past && !closed

                      const countdownLine = today
                        ? closed
                          ? "Anmeldung geschlossen (10 Min vorher)"
                          : secondsLeft !== null
                            ? `Anmeldung noch: ${formatMMSS(secondsLeft)}`
                            : null
                        : null

                      return (
                        <div
                          key={ev.id}
                          className={[
                            "flex justify-between items-center py-3 px-3 rounded-lg border transition-all",
                            past
                              ? "bg-gray-100 border-gray-200 opacity-60"
                              : today
                                ? "bg-slate-50 border-slate-200"
                                : "bg-gray-50 border-gray-100",
                            ev.isRescheduled ? "shadow-md border-slate-200 bg-gradient-to-r from-slate-50 to-white" : "",
                          ].join(" ")}
                        >
                          <div className="flex-1">
                            <div className="font-bold text-sm text-gray-900">
                              {ev.dateLabel} {today ? <span className="text-slate-700">• Heute</span> : null}
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-700 font-semibold">
                              <Clock className="h-3 w-3" />
                              <span>{ev.timeLabel}</span>
                            </div>

                            <RescheduleBadge
                              isRescheduled={ev.isRescheduled}
                              effectiveDT={ev.effectiveDT}
                              originalDT={ev.originalDT}
                              accent="slate"
                            />

                            {countdownLine && (
                              <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-800">
                                <Timer className="h-3 w-3 text-slate-700" />
                                <span className="font-semibold">{countdownLine}</span>
                              </div>
                            )}

                            {today && cutoffDT && (
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-600">
                                <Info className="h-3 w-3" />
                                <span>
                                  Cutoff: {cutoffDT.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} Uhr
                                </span>
                              </div>
                            )}
                          </div>

                          {past ? (
                            <Button size="sm" disabled className="text-xs px-3 py-1 bg-gray-400 text-gray-600">
                              Vorbei
                            </Button>
                          ) : (
                            <Button
                              onClick={() => openDkoModalIfAllowed("Buffalo Steel Cup Anmeldung", ev, today)}
                              size="sm"
                              disabled={!canClick}
                              title={
                                !today && !past
                                  ? "Anmeldung ist erst am Turniertag möglich."
                                  : today && closed
                                    ? "Anmeldung ist 10 Minuten vor Beginn geschlossen."
                                    : undefined
                              }
                              className={`text-xs px-3 py-1 ${
                                canClick
                                  ? alreadyRegistered
                                    ? "bg-gray-700 hover:bg-gray-800 text-white"
                                    : "bg-slate-800 hover:bg-slate-900 text-white"
                                  : "bg-gray-300 text-gray-700"
                              }`}
                            >
                              {regLoading ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  ...
                                </span>
                              ) : today ? (
                                alreadyRegistered ? (
                                  <span className="flex items-center gap-2">
                                    <LogOut className="h-3 w-3" />
                                    Abmelden
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-2">
                                    <UserPlus className="h-3 w-3" />
                                    Anmelden
                                  </span>
                                )
                              ) : (
                                <span className="flex items-center gap-2">
                                  <Lock className="h-3 w-3" />
                                  Am Turniertag
                                </span>
                              )}
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {!dkoLoading && !dkoError && buffaloEvents.length > 0 && (
                  <>
                    {!showAllBuffalo ? (
                      <div className="mt-4 text-center">
                        <Button
                          onClick={() => setShowAllBuffalo(true)}
                          variant="outline"
                          size="sm"
                          className="text-xs border-slate-200 text-slate-800 hover:bg-slate-50"
                        >
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Alle Termine anzeigen
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-4 text-center">
                        <Button
                          onClick={() => setShowAllBuffalo(false)}
                          variant="outline"
                          size="sm"
                          className="text-xs border-slate-200 text-slate-800 hover:bg-slate-50"
                        >
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Weniger anzeigen
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* ===== Lion Cup Finale ===== */}
          <motion.div variants={itemVariants} className="mb-8">
            <motion.div variants={cardVariants} className="bg-gradient-to-r from-orange-600 to-orange-800 rounded-xl shadow-lg p-6 text-center text-white">
              <Crown className="h-10 w-10 mx-auto mb-3" />
              <h2 className="text-xl font-extrabold uppercase mb-2">EMD - LION CUP FINALE</h2>
              <div className="text-lg font-bold">01. JUNI 2026</div>
            </motion.div>
          </motion.div>

          {/* ===== Weitere Turniere (tournaments table) — uses SAME self-register modal ===== */}
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
                {tournaments.map((tournament) => {
                  const startDT = new Date(`${tournament.date}T${tournament.time}:00`)
                  const today = isDateTodayDT(startDT)
                  const past = isDateInPastDT(startDT)

                  const r = today
                    ? computeCutoffFromStart(startDT, 10, nowTick)
                    : { cutoffDT: null as any, secondsLeft: null as any, closed: false }
                  const cutoffDT = today ? r.cutoffDT : null
                  const secondsLeft = today ? r.secondsLeft : null
                  const closed = today ? r.closed : false

                  const canOpen = today && !past && !closed

                  const buttonLabel = past
                    ? "Vorbei"
                    : today
                      ? closed
                        ? "Anmeldung geschlossen"
                        : alreadyRegistered
                          ? "Abmelden"
                          : "Anmelden"
                      : "Am Turniertag"

                  const countdownLine =
                    today
                      ? closed
                        ? "Anmeldung geschlossen (10 Min vorher)"
                        : secondsLeft !== null
                          ? `Anmeldung noch: ${formatMMSS(secondsLeft)}`
                          : null
                      : null

                  return (
                    <motion.div
                      key={tournament.id}
                      variants={cardVariants}
                      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                    >
                      {tournament.photo_url && (
                        <div
                          className="relative w-full h-40 bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(tournament.photo_url!)}
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

                          {countdownLine && (
                            <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-800">
                              <Timer className="h-3 w-3 text-red-600" />
                              <span className="font-semibold">{countdownLine}</span>
                            </div>
                          )}

                          {today && cutoffDT && (
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-600">
                              <Info className="h-3 w-3" />
                              <span>
                                Cutoff: {cutoffDT.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} Uhr
                              </span>
                            </div>
                          )}

                          {!today && !past && (
                            <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-600">
                              <ShieldAlert className="h-3 w-3 text-gray-700" />
                              <span>Anmeldung nur am Turniertag (bis 10 Minuten vor Beginn).</span>
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => {
                            if (!canOpen) return
                            openSelfRegModalIfAllowed(`Anmeldung • ${tournament.name}`, startDT, 10)
                          }}
                          size="sm"
                          disabled={!canOpen}
                          title={
                            past
                              ? "Dieses Turnier ist vorbei."
                              : !today
                                ? "Anmeldung ist erst am Turniertag möglich."
                                : closed
                                  ? "Anmeldung ist 10 Minuten vor Beginn geschlossen."
                                  : undefined
                          }
                          className={`w-full text-xs ${
                            canOpen ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-300 text-gray-700"
                          }`}
                        >
                          <span className="flex items-center justify-center gap-2">
                            {past || !today || closed ? <Lock className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                            {buttonLabel}
                          </span>
                        </Button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* ===== Location ===== */}
          <motion.div variants={itemVariants}>
            <motion.div variants={cardVariants} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
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

      {/* Fullscreen Image */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors">
            <X className="h-8 w-8" />
          </button>
          <div className="relative w-full h-full max-w-4xl max-h-[90vh]">
            <Image src={selectedImage || "/placeholder.svg"} alt="Tournament" fill style={{ objectFit: "contain" }} sizes="100vw" />
          </div>
        </div>
      )}

      {/* ✅ Self-registration modal for EVERYTHING + auto close + toast (but NOT on initial sync) */}
      <DKOSelfRegistrationModal
        isOpen={dkoModal.isOpen}
        onClose={() => setDkoModal({ ...dkoModal, isOpen: false })}
        title={dkoModal.title}
        dateLabel={dkoModal.date}
        timeLabel={dkoModal.time}
        onRegistrationChanged={(isReg: boolean) => {
          // Status immer übernehmen
          setAlreadyRegistered(isReg)

          // Wenn Callback zu schnell nach Öffnen kommt => Initial Sync => NICHT schließen
          const delta = Date.now() - (modalOpenedAtRef.current || 0)
          if (delta < 900) return

          // Echte Aktion => Toast + schließen
          setDkoModal((prev) => ({ ...prev, isOpen: false }))
          showToast(isReg ? "✅ Erfolgreich angemeldet!" : "✅ Erfolgreich abgemeldet!")
        }}
      />

      {/* ✅ Toast */}
      {toast.show && (
        <div className="fixed left-1/2 top-4 z-[9999] -translate-x-1/2">
          <div className="rounded-full bg-black/85 text-white px-4 py-2 text-sm font-semibold shadow-lg">{toast.text}</div>
        </div>
      )}
    </div>
  )
}
