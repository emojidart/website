"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { DKOSelfRegistrationModal } from "@/components/dko-self-registration-modal"
import {
  Calendar,
  Clock,
  MapPin,
  UserPlus,
  Info,
  Loader2,
  Crown,
  BookOpen,
  ChevronDown,
  ChevronUp,
  X,
  LogOut,
  Lock,
  ShieldAlert,
  Timer,
  RefreshCw,
} from "lucide-react"
import { motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

type DkoSeries = {
  id: string
  name: string
  slug: string
  is_active: boolean
  startgeld: number | null
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
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } },
}
const cardVariants = {
  hidden: { opacity: 0, scale: 0.985, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 14 } },
}

/** ---------- Date/Time Helpers ---------- **/
function formatDHMS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const days = Math.floor(s / 86400)
  const rest = s % 86400
  const hours = Math.floor(rest / 3600)
  const minutes = Math.floor((rest % 3600) / 60)
  const seconds = rest % 60
  const hms = [String(hours).padStart(2, "0"), String(minutes).padStart(2, "0"), String(seconds).padStart(2, "0")].join(":")
  return days > 0 ? `${days} Tage ${hms}` : hms
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
function computeOpenFromStart(startDT: Date, nowMs: number) {
  const openDT = startOfDay(startDT) // Anmeldung ab Turniertag 00:00
  const secondsLeft = Math.ceil((openDT.getTime() - nowMs) / 1000)
  const open = secondsLeft <= 0
  return { openDT, secondsLeft, open }
}
function computeCutoffFromStart(startDT: Date, cutoffMinutes: number, nowMs: number) {
  const cutoffDT = new Date(startDT.getTime() - cutoffMinutes * 60 * 1000)
  const secondsLeft = Math.ceil((cutoffDT.getTime() - nowMs) / 1000)
  const closed = secondsLeft <= 0
  return { cutoffDT, secondsLeft, closed }
}

function RescheduleBadge({
  isRescheduled,
  effectiveDT,
  originalDT,
}: {
  isRescheduled: boolean
  effectiveDT: Date
  originalDT: Date
}) {
  if (!isRescheduled) return null

  const newDate = formatDateLabel(effectiveDT)
  const newTime = formatTimeLabel(effectiveDT)
  const oldDate = formatDateLabel(originalDT)
  const oldTime = formatTimeLabel(originalDT)

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm ring-2 bg-orange-600 text-white border-orange-500/30 ring-orange-200">
          <RefreshCw className="h-3 w-3 opacity-90" />
          Neuer Termin: {newDate} • {newTime}
        </span>

        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-orange-700">
          <span className="h-2 w-2 rounded-full bg-orange-600" />
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

type DkoModalState = {
  isOpen: boolean
  date: string
  time: string
  title: string
  seriesId: string | null
  startgeld: number | null
}

export default function UpcomingTournamentsAppPage() {
  const { session } = useAuth() as any

  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // ✅ Shared Self-Registration modal (Lion Cup)
  const [dkoModal, setDkoModal] = useState<DkoModalState>({
    isOpen: false,
    date: "",
    time: "",
    title: "Anmeldung",
    seriesId: null,
    startgeld: null,
  })

  // ✅ Prevent auto-close on initial modal sync
  const modalOpenedAtRef = useRef<number>(0)

  // ✅ Toast
  const [toast, setToast] = useState<{ show: boolean; text: string }>({ show: false, text: "" })
  const showToast = (text: string) => {
    setToast({ show: true, text })
    window.setTimeout(() => setToast({ show: false, text: "" }), 2500)
  }

  // ✅ registration state
  const [regLoading, setRegLoading] = useState(false)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [canUnregister, setCanUnregister] = useState(true)
  const [unregisterDisabledReason, setUnregisterDisabledReason] = useState<string | null>(null)

  const [showAllLionCup, setShowAllLionCup] = useState(false)

  // ✅ tick for countdowns
  const [nowTick, setNowTick] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  /** **/
  const [lionSeries, setLionSeries] = useState<DkoSeries | null>(null)
  const [seriesById, setSeriesById] = useState<Record<string, DkoSeries>>({})
  const [lionEvents, setLionEvents] = useState<UiEvent[]>([])
  const [dkoLoading, setDkoLoading] = useState(true)
  const [dkoError, setDkoError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setDkoLoading(true)
      setDkoError(null)

      try {
        
        const { data: seriesData, error: sErr } = await supabase
          .from("dko_series")
          .select("id,name,slug,is_active,startgeld")
          .in("slug", ["lion-cup-2025-26"])

        if (sErr) throw sErr

        const list = (seriesData || []) as DkoSeries[]
        const lion = list.find((x) => x.slug === "lion-cup-2025-26") ?? null

        setLionSeries(lion)

        const mapById: Record<string, DkoSeries> = {}
        for (const s of list) mapById[s.id] = s
        setSeriesById(mapById)

        const fetchEventsFor = async (seriesId: string) => {
          const { data, error } = await supabase
            .from("dko_series_events")
            .select("id,series_id,title,start_at,is_matchday,registration_cutoff_minutes,is_rescheduled,rescheduled_at")
            .eq("series_id", seriesId)
            .order("start_at", { ascending: true })
          if (error) throw error
          return (data || []) as DkoSeriesEvent[]
        }

        const lionRaw = await (lion?.id ? fetchEventsFor(lion.id) : Promise.resolve([] as DkoSeriesEvent[]))

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

  const fetchRegStatus = async () => {
    setRegLoading(true)
    setAlreadyRegistered(false)
    setCanUnregister(true)
    setUnregisterDisabledReason(null)

    try {
      if (!session?.user) return

      const { data: profile, error: profErr } = await supabase
        .from("user_profiles")
        .select("club_players(spieldatenbank_id)")
        .eq("user_id", session.user.id)
        .single()

      if (profErr) throw profErr

      const clubPlayersRel: any = (profile as any)?.club_players
      const spieldatenbankId = Array.isArray(clubPlayersRel)
        ? clubPlayersRel?.[0]?.spieldatenbank_id
        : clubPlayersRel?.spieldatenbank_id

      if (!spieldatenbankId) return

      const pid = String(spieldatenbankId)

      const { data: reg, error: regErr } = await supabase
        .from("dko_tournament_registration")
        .select("id,payment_method")
        .eq("player_id", pid)
        .limit(1)

      if (regErr) throw regErr

      const isReg = (reg?.length ?? 0) > 0
      setAlreadyRegistered(isReg)

      const pm = (reg as any)?.[0]?.payment_method ?? null
      if (isReg && pm === "admin") {
        setCanUnregister(false)
        setUnregisterDisabledReason(
          "Du wurdest vor Ort angemeldet. Abmeldung ist nur vor Ort bei der Turnierleitung möglich."
        )
      } else {
        setCanUnregister(true)
        setUnregisterDisabledReason(null)
      }
    } catch (e) {
      console.error("Registration status error:", e)
    } finally {
      setRegLoading(false)
    }
  }

  /** ---------- Registration status for current user ---------- **/
  useEffect(() => {
    fetchRegStatus()
  }, [session])

  useEffect(() => {
    if (!session?.user) return

    const channel = supabase
      .channel("dko-registration-realtime-upcoming")
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_tournament_registration" }, () => {
        fetchRegStatus()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session])

  const openDkoModalIfAllowed = (title: string, ev: UiEvent, isToday: boolean) => {
    if (!isToday) return
    if (!ev.is_matchday) return
    const { closed } = computeCutoffFromStart(ev.effectiveDT, ev.cutoffMinutes, nowTick)
    if (closed) return

    const s = seriesById[ev.series_id]
    modalOpenedAtRef.current = Date.now()
    setDkoModal({
      isOpen: true,
      date: ev.dateLabel,
      time: ev.timeLabel,
      title,
      seriesId: ev.series_id,
      startgeld: Number(s?.startgeld ?? 0),
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24 md:pb-0">
      <Header />

      {/* */}
      <main className="pt-16 sm:pt-14">
        <motion.div   className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl"
 variants={containerVariants} initial="hidden" animate="visible">
          {/* ===== Lion Cup Header (APP CARD STYLE) ===== */}
          <motion.div variants={itemVariants} className="mb-4">
            <div className="rounded-3xl border border-gray-200/70 bg-white shadow-md ring-1 ring-black/5 overflow-hidden">
              <div className="p-5 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 rounded-2xl bg-orange-600 text-white p-3 shadow-sm">
                    <Crown className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-orange-50 text-orange-700 border border-orange-100">
                      EMD – LION CUP 2025/2026
                    </div>

                    <h1 className="mt-2 text-2xl sm:text-3xl font-black leading-tight">Spieltag Anmeldung</h1>

                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2">
                      <div className="inline-flex items-center gap-2 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-900">
                        <ShieldAlert className="h-4 w-4 text-orange-700" />
                        Anmeldung bis spätestens <strong>10 Minuten</strong> vor Turnierbeginn.
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
                        <TrophyMini />
                        <span className="font-black text-gray-900">{actualLionTournamentDays}</span>
                        <span>Turniertage + 1 Finaltag</span>
                      </div>
                    </div>

                    <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
                      <Calendar className="h-4 w-4 text-orange-700" />
                      <span>{lionRange ? `${lionRange.from} – ${lionRange.to}` : "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700" />
            </div>
          </motion.div>

          {/* ===== Schedule Card ===== */}
          <motion.div variants={itemVariants} className="space-y-4">
            <motion.div variants={cardVariants} className="rounded-2xl border border-gray-200/70 bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-orange-600" />
                    <h2 className="text-base sm:text-lg font-black text-gray-900">EMD – Lion Cup Spieltage</h2>
                  </div>

                  {!dkoLoading && !dkoError && lionEvents.length > 0 ? (
                    <div className="text-xs text-gray-600">
                      <span className="font-black text-gray-900">{lionEvents.length}</span> Termine
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="p-3 sm:p-4">
                {dkoLoading ? (
                  <div className="flex items-center justify-center gap-2 text-gray-700 py-8">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Lade Termine…</span>
                  </div>
                ) : dkoError ? (
                  <div className="p-3 rounded-xl border bg-red-50 text-red-700 text-sm">Fehler beim Laden: {dkoError}</div>
                ) : lionSeries && lionEvents.length === 0 ? (
                  <div className="text-sm text-gray-600 py-6">Noch keine Termine in der DB.</div>
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
                              ? `Anmeldung noch: ${formatDHMS(secondsLeft)}`
                              : null
                          : !past && !spielfrei
                            ? (() => {
                                const o = computeOpenFromStart(ev.effectiveDT, nowTick)
                                return o.open ? null : `Anmeldung öffnet in: ${formatDHMS(o.secondsLeft)}`
                              })()
                            : null

                      return (
                        <div
                          key={ev.id ?? index}
                          className={[
                            "rounded-2xl border p-3 sm:p-4 transition-all",
                            spielfrei
                              ? "bg-yellow-50 border-yellow-200"
                              : past
                                ? "bg-gray-50 border-gray-200 opacity-70"
                                : today
                                  ? "bg-orange-50 border-orange-200"
                                  : "bg-white border-gray-200",
                            ev.isRescheduled ? "shadow-sm" : "",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-black text-sm sm:text-base text-gray-900">
                                  {ev.dateLabel}
                                  {today && !spielfrei ? <span className="text-orange-700"> • Heute</span> : null}
                                </div>

                                {spielfrei ? (
                                  <span className="inline-flex items-center rounded-full bg-yellow-200 text-yellow-900 px-2.5 py-1 text-[11px] font-black">
                                    Spielfrei
                                  </span>
                                ) : past ? (
                                  <span className="inline-flex items-center rounded-full bg-gray-200 text-gray-700 px-2.5 py-1 text-[11px] font-black">
                                    Vorbei
                                  </span>
                                ) : today ? (
                                  <span className="inline-flex items-center rounded-full bg-orange-600 text-white px-2.5 py-1 text-[11px] font-black">
                                    Heute
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-800 px-2.5 py-1 text-[11px] font-black">
                                    Geplant
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-gray-700">
                                <Clock className="h-4 w-4 text-orange-600" />
                                <span>{ev.timeLabel}</span>
                              </div>

                              <RescheduleBadge
                                isRescheduled={ev.isRescheduled}
                                effectiveDT={ev.effectiveDT}
                                originalDT={ev.originalDT}
                              />

                              {countdownLine ? (
                                <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-orange-100 bg-white px-3 py-2 text-[11px] font-semibold text-gray-800">
                                  <Timer className="h-4 w-4 text-orange-600" />
                                  {countdownLine}
                                </div>
                              ) : null}

                              {today && !spielfrei && cutoffDT ? (
                                <div className="mt-2 text-[11px] text-gray-600">
                                  <div className="inline-flex items-center gap-2">
                                    <Info className="h-4 w-4 text-orange-600" />
                                    <span>
                                      Anmeldeschluss:{" "}
                                      <strong className="text-gray-900">
                                        {cutoffDT.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}
                                      </strong>
                                    </span>
                                  </div>

                                  <div className="mt-2 rounded-xl border border-orange-200 bg-white/70 px-3 py-2">
                                    <div className="flex items-start gap-2 text-[11px] leading-snug text-gray-700">
                                      <Info className="h-4 w-4 mt-0.5 text-orange-600 shrink-0" />
                                      <span>
                                        Abmeldungen sind jederzeit bis 10 Minuten vor Turnierbeginn möglich, solange die Anmeldung offen ist.
                                        Wenn du bis Turnierbeginn nicht anwesend bist, wird deine Anmeldung storniert und der Betrag bei vorab
                                        bezahlter Startgebühr rückerstattet.
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            {/* CTA */}
                            <div className="shrink-0">
                              {spielfrei ? null : (
                                <Button
                                  onClick={() => openDkoModalIfAllowed("Lion Cup Anmeldung", ev, today)}
                                  size="sm"
                                  disabled={!canClick || regLoading}
                                  title={
                                    !today && !past
                                      ? "Anmeldung ist erst am Turniertag möglich."
                                      : today && closed
                                        ? "Anmeldung ist 10 Minuten vor Beginn geschlossen."
                                        : undefined
                                  }
                                  className={[
                                    "h-9 px-3 text-xs font-black rounded-xl",
                                    canClick
                                      ? alreadyRegistered
                                        ? "bg-gray-800 hover:bg-gray-900 text-white"
                                        : "bg-orange-600 hover:bg-orange-700 text-white"
                                      : "bg-gray-200 text-gray-700",
                                  ].join(" ")}
                                >
                                  {regLoading ? (
                                    <span className="flex items-center gap-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      ...
                                    </span>
                                  ) : today ? (
                                    alreadyRegistered ? (
                                      <span className="flex items-center gap-2">
                                        <LogOut className="h-4 w-4" />
                                        Abmelden
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-2">
                                        <UserPlus className="h-4 w-4" />
                                        Anmelden
                                      </span>
                                    )
                                  ) : (
                                    <span className="flex items-center gap-2">
                                      <Lock className="h-4 w-4" />
                                      Am Turniertag
                                    </span>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {!dkoLoading && !dkoError && lionEvents.length > 0 ? (
                  <div className="mt-3 flex justify-center">
                    {!showAllLionCup ? (
                      <Button
                        onClick={() => setShowAllLionCup(true)}
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50"
                      >
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Alle {lionEvents.length} Termine anzeigen
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setShowAllLionCup(false)}
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50"
                      >
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Weniger anzeigen
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="bg-gray-50 px-3 sm:px-4 py-3 border-t border-gray-100">
                <Link href="lion-cup-regelwerk">
                  <Button size="sm" variant="outline" className="w-full rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Regelwerk
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* ===== Lion Cup Finale ===== */}
            <motion.div variants={cardVariants} className="rounded-2xl border border-gray-200/70 bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
              <div className="p-5 sm:p-6 bg-gradient-to-r from-orange-600 to-orange-800 text-white text-center">
                <Crown className="h-10 w-10 mx-auto mb-3" />
                <h2 className="text-lg sm:text-xl font-black uppercase mb-2">EMD - LION CUP FINALE</h2>
                <div className="text-base sm:text-lg font-extrabold">01. JUNI 2026</div>
              </div>
            </motion.div>

            {/* ===== Location ===== */}
            <motion.div variants={cardVariants} className="rounded-2xl border border-gray-200/70 bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
              <div className="p-5 sm:p-6 text-center">
                <MapPin className="h-8 w-8 text-red-600 mx-auto mb-3" />
                <h2 className="text-base sm:text-lg font-black uppercase mb-3 text-gray-900">Veranstaltungsort</h2>
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <div className="font-black text-red-700">Pfeil-OK e.V.</div>
                  <div className="text-sm text-gray-700 mt-1">Linzer Bundesstrasse 16, 5020 Salzburg</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />

      {/* Fullscreen Image */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            aria-label="Schließen"
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

      {/* ✅ Self-registration modal + auto close + toast (but NOT on initial sync) */}
      <DKOSelfRegistrationModal
        canUnregister={canUnregister}
        unregisterDisabledReason={unregisterDisabledReason}
        isOpen={dkoModal.isOpen}
        onClose={() => setDkoModal((prev) => ({ ...prev, isOpen: false }))}
        title={dkoModal.title}
        dateLabel={dkoModal.date}
        timeLabel={dkoModal.time}
        seriesId={dkoModal.seriesId}
        startgeld={dkoModal.startgeld}
        onRegistrationChanged={(isReg: boolean) => {
          setAlreadyRegistered(isReg)

          // initial sync protection
          const delta = Date.now() - (modalOpenedAtRef.current || 0)
          if (delta < 900) return

          setDkoModal((prev) => ({ ...prev, isOpen: false }))
          showToast(isReg ? "✅ Erfolgreich angemeldet!" : "✅ Erfolgreich abgemeldet!")
        }}
      />

      {/* ✅ Toast */}
      {toast.show && (
        <div className="fixed left-1/2 top-4 z-[9999] -translate-x-1/2">
          <div className="rounded-full bg-black/85 text-white px-4 py-2 text-sm font-semibold shadow-lg">
            {toast.text}
          </div>
        </div>
      )}
    </div>
  )
}

/** small helper icon without extra imports */
function TrophyMini() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-orange-700">
      <path
        d="M8 4h8v3a4 4 0 0 1-8 0V4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 7H4a2 2 0 0 0 2 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 7h2a2 2 0 0 1-2 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 11v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 21h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 15h4v6h-4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}