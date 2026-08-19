"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { DKOSelfRegistrationModal } from "@/components/dko-self-registration-modal"
import {
  Calendar,
  Clock,
  Crown,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Trophy,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { useMembershipAccess } from "@/hooks/use-membership-access"

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

type RegisteredPlayer = {
  id: number
  player_id: string
  player_name: string
  registered_at: string
  payment_method?: string | null
}

type UiEvent = {
  id: string
  series_id: string
  title: string
  is_matchday: boolean
  effectiveDT: Date
  originalDT: Date
  isRescheduled: boolean
  dateLabel: string
  timeLabel: string
}

type DkoModalState = {
  isOpen: boolean
  date: string
  time: string
  title: string
  seriesId: string | null
  startgeld: number | null
}

const MEMBERS_CUP_SLUG = "2026/27"

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function formatDateLabel(dt: Date) {
  return dt.toLocaleDateString("de-AT", { day: "2-digit", month: "short", year: "numeric" })
}

function formatTimeLabel(dt: Date) {
  return `${dt.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} Uhr`
}

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

function isToday(dt: Date) {
  return startOfDay(dt).getTime() === startOfDay(new Date()).getTime()
}

function isPastDay(dt: Date) {
  return startOfDay(dt).getTime() < startOfDay(new Date()).getTime()
}

function getRegistrationOpenDT(startDT: Date) {
  const d = new Date(startDT)
  d.setHours(0, 0, 0, 0)
  return d
}

function getRegistrationCloseDT(startDT: Date) {
  const d = new Date(startDT)

  // Normaler Members Cup: Anmeldung bis 17:00 Uhr
  d.setHours(17, 0, 0, 0)
  return d
}

function getUnregisterCloseDT(startDT: Date) {
  const d = new Date(startDT)

  // Abmeldung nur bis 14:00 Uhr
  d.setHours(14, 0, 0, 0)
  return d
}

function getEventStatus(ev: UiEvent, nowMs: number) {
  const openDT = getRegistrationOpenDT(ev.effectiveDT)
  const regCloseDT = getRegistrationCloseDT(ev.effectiveDT)
  const unregCloseDT = getUnregisterCloseDT(ev.effectiveDT)

  const open = nowMs >= openDT.getTime()
  const registrationClosed = nowMs > regCloseDT.getTime()
  const unregisterClosed = nowMs > unregCloseDT.getTime()

  const secondsToOpen = Math.ceil((openDT.getTime() - nowMs) / 1000)
  const secondsToRegClose = Math.ceil((regCloseDT.getTime() - nowMs) / 1000)
  const secondsToUnregClose = Math.ceil((unregCloseDT.getTime() - nowMs) / 1000)

  return {
    open,
    registrationClosed,
    unregisterClosed,
    secondsToOpen,
    secondsToRegClose,
    secondsToUnregClose,
    openDT,
    regCloseDT,
    unregCloseDT,
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } },
}

export default function UpcomingTournamentsAppPage() {
  const { session } = useAuth() as any
  const {
    loading: membershipAccessLoading,
    hasModule,
  } = useMembershipAccess()

  const hasInternalTournamentAccess = hasModule("internal_tournaments")

  const [series, setSeries] = useState<DkoSeries | null>(null)
  const [events, setEvents] = useState<UiEvent[]>([])
  const [registeredPlayers, setRegisteredPlayers] = useState<RegisteredPlayer[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [canUnregister, setCanUnregister] = useState(true)
  const [unregisterDisabledReason, setUnregisterDisabledReason] = useState<string | null>(null)

  const modalOpenedAtRef = useRef<number>(0)

  const [dkoModal, setDkoModal] = useState<DkoModalState>({
    isOpen: false,
    date: "",
    time: "",
    title: "Members Champion Cup Anmeldung",
    seriesId: null,
    startgeld: null,
  })

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const loadCupData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: seriesData, error: seriesError } = await supabase
        .from("dko_series")
        .select("id,name,slug,is_active,startgeld")
        .eq("slug", MEMBERS_CUP_SLUG)
        .maybeSingle()

      if (seriesError) throw seriesError
      if (!seriesData) throw new Error("EMD MEMBERS Champion Cup Serie wurde nicht gefunden.")

      const currentSeries = seriesData as DkoSeries
      setSeries(currentSeries)

      const { data: eventData, error: eventError } = await supabase
        .from("dko_series_events")
        .select("id,series_id,title,start_at,is_matchday,registration_cutoff_minutes,is_rescheduled,rescheduled_at")
        .eq("series_id", currentSeries.id)
        .order("start_at", { ascending: true })

      if (eventError) throw eventError

      const mappedEvents = ((eventData || []) as DkoSeriesEvent[]).map((ev, index) => {
        const isRescheduled = !!ev.is_rescheduled && !!ev.rescheduled_at
        const effectiveDT = new Date(isRescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at)
        const originalDT = new Date(ev.start_at)

        return {
          id: ev.id,
          series_id: ev.series_id,
          title: ev.title || `Spieltag ${index + 1}`,
          is_matchday: !!ev.is_matchday,
          effectiveDT,
          originalDT,
          isRescheduled,
          dateLabel: formatDateLabel(effectiveDT),
          timeLabel: formatTimeLabel(effectiveDT),
        }
      })

      setEvents(mappedEvents)
    } catch (e: any) {
      console.error(e)
      setError(e?.message || "Fehler beim Laden vom Members Champion Cup.")
    } finally {
      setLoading(false)
    }
  }

  const loadRegistrations = async () => {
    if (!series?.id) return

    try {
      const { data, error } = await supabase
        .from("dko_tournament_registration")
        .select("id,player_id,player_name,registered_at,payment_method")
        .order("registered_at", { ascending: true })

      if (error) throw error

      setRegisteredPlayers((data || []) as RegisteredPlayer[])
    } catch (e) {
      console.error("Fehler beim Laden der Anmeldungen:", e)
    }
  }

  const loadOwnStatus = async () => {
    try {
      setAlreadyRegistered(false)
      setCanUnregister(true)
      setUnregisterDisabledReason(null)

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

      const { data: reg, error: regErr } = await supabase
        .from("dko_tournament_registration")
        .select("id,payment_method")
        .eq("player_id", String(spieldatenbankId))
        .limit(1)

      if (regErr) throw regErr

      const isReg = (reg?.length ?? 0) > 0
      setAlreadyRegistered(isReg)

      const pm = (reg as any)?.[0]?.payment_method ?? null
      if (isReg && pm === "admin") {
        setCanUnregister(false)
        setUnregisterDisabledReason("Du wurdest vor Ort angemeldet. Abmeldung ist nur bei der Turnierleitung möglich.")
      }
    } catch (e) {
      console.error("Registration status error:", e)
    }
  }

  useEffect(() => {
    loadCupData()
  }, [])

  useEffect(() => {
    if (!series?.id) return
    loadRegistrations()
  }, [series?.id])

  useEffect(() => {
    loadOwnStatus()
  }, [session])

  useEffect(() => {
    const channel = supabase
      .channel("members-cup-upcoming-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series" }, () => {
        loadCupData()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series_events" }, () => {
        loadCupData()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_tournament_registration" }, () => {
        loadRegistrations()
        loadOwnStatus()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [series?.id, session?.user?.id])

  const tournamentDays = useMemo(() => events.filter((e) => e.is_matchday).length, [events])

  const range = useMemo(() => {
    if (events.length === 0) return null
    return {
      from: formatDateLabel(events[0].effectiveDT),
      to: formatDateLabel(events[events.length - 1].effectiveDT),
    }
  }, [events])

  const nextEvent = useMemo(() => {
    return events.find((ev) => !isPastDay(ev.effectiveDT) && ev.is_matchday) ?? null
  }, [events])

  const isOdd = registeredPlayers.length % 2 !== 0
  const waitingPlayerId = isOdd && registeredPlayers.length > 0 ? registeredPlayers[registeredPlayers.length - 1].id : null

  const openModal = (ev: UiEvent) => {
    const status = getEventStatus(ev, nowTick)

    // Members Champion Cup = internes Vereinsturnier.
    // Nur Mitglieder mit dem Modul "Interne Turniere" (oder aktivem Testpaket)
    // dürfen die Selbstanmeldung öffnen.
    if (membershipAccessLoading) return
    if (!hasInternalTournamentAccess) return

    if (!isToday(ev.effectiveDT)) return
    if (!ev.is_matchday) return
    if (!status.open) return
    if (status.registrationClosed) return

    modalOpenedAtRef.current = Date.now()

    setDkoModal({
      isOpen: true,
      date: ev.dateLabel,
      time: ev.timeLabel,
      title: series?.name || "Members Champion Cup Anmeldung",
      seriesId: series?.id ?? null,
      startgeld: Number(series?.startgeld ?? 0),
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24 md:pb-0">
      <Header />

      <main className="pt-16 sm:pt-14">
        <motion.div
          className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-4">
            <div className="rounded-3xl border border-gray-200/70 bg-white shadow-md ring-1 ring-black/5 overflow-hidden">
              <div className="p-5 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 rounded-2xl bg-orange-600 text-white p-3 shadow-sm">
                    <Crown className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-orange-50 text-orange-700 border border-orange-100">
                      EMD MEMBERS CHAMPION CUP
                    </div>

                    <h1 className="mt-2 text-2xl sm:text-3xl font-black leading-tight">
                      Spieltag Anmeldung
                    </h1>

                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2">
                      <div className="inline-flex items-center gap-2 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-900">
                        <ShieldAlert className="h-4 w-4 text-orange-700" />
                       Anmeldung am Spieltag bis <strong>17:00 Uhr</strong>
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900">
                        <XCircle className="h-4 w-4 text-red-700" />
                        Abmeldung nur bis <strong>14:00 Uhr</strong>
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
                        <Trophy className="h-4 w-4 text-orange-700" />
                        <span className="font-black text-gray-900">{tournamentDays}</span>
                        <span>Spieltage</span>
                      </div>
                    </div>

                    <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
                      <Calendar className="h-4 w-4 text-orange-700" />
                      <span>{range ? `${range.from} – ${range.to}` : "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700" />
            </div>
          </motion.div>

          {!membershipAccessLoading && !hasInternalTournamentAccess ? (
            <motion.div variants={itemVariants} className="mb-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-amber-200">
                    <ShieldAlert className="h-4 w-4 text-amber-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-gray-900">
                      Internes Vereinsturnier
                    </div>
                    <div className="mt-1 text-sm font-semibold text-gray-700">
                      Für die Anmeldung zum Members Champion Cup benötigst du das Paket
                      <span className="font-black"> „Interne Turniere“</span>.
                    </div>
                    <div className="mt-1 text-xs font-semibold text-gray-500">
                      Eine aktive Testfreischaltung für „Interne Turniere“ zählt ebenfalls.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-600" />
              <div className="mt-2 text-sm font-semibold text-gray-600">Members Cup wird geladen...</div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 font-semibold">
              {error}
            </div>
          ) : (
            <>
              <motion.div variants={itemVariants} className="mb-4">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-gray-500 font-semibold">Aktuelle Anmeldungen</div>
                      <div className="mt-1 text-3xl font-black">{registeredPlayers.length}</div>
                    </div>

                    <div
                      className={
                        isOdd
                          ? "rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3"
                          : "rounded-2xl border border-green-200 bg-green-50 px-4 py-3"
                      }
                    >
                      <div className="flex items-center gap-2 font-black">
                        {isOdd ? (
                          <>
                            <AlertTriangle className="h-5 w-5 text-orange-700" />
                            <span className="text-orange-900">Ungerade Anzahl</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-green-700" />
                            <span className="text-green-900">Gerade Anzahl</span>
                          </>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-700">
                        {isOdd
                          ? "Der letzte angemeldete Spieler ist noch nicht fix dabei."
                          : "Alle angemeldeten Spieler sind aktuell fix dabei."}
                      </div>
                    </div>
                  </div>

                  {registeredPlayers.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {registeredPlayers.map((player, index) => {
                        const waiting = player.id === waitingPlayerId

                        return (
                          <div
                            key={player.id}
                            className={
                              waiting
                                ? "rounded-2xl border-2 border-orange-300 bg-orange-50 p-4 shadow-sm"
                                : "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                            }
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-xs text-gray-500 font-semibold">#{index + 1}</div>
                                <div className="font-black text-gray-900">{player.player_name}</div>
                              </div>

                              {waiting ? (
                                <span className="rounded-full bg-orange-600 text-white px-3 py-1 text-[11px] font-black">
                                  WARTET
                                </span>
                              ) : (
                                <span className="rounded-full bg-green-600 text-white px-3 py-1 text-[11px] font-black">
                                  FIX
                                </span>
                              )}
                            </div>

                            {waiting ? (
                              <div className="mt-2 text-xs font-semibold text-orange-800">
                                Wird fix, sobald sich noch ein Spieler anmeldet.
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                      Noch keine Anmeldungen vorhanden.
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-orange-600" />
                    <h2 className="text-base sm:text-lg font-black text-gray-900">
                      {series?.name || "EMD MEMBERS Champion Cup"} Spieltage
                    </h2>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {events.map((ev) => {
                    const today = isToday(ev.effectiveDT)
                    const past = isPastDay(ev.effectiveDT)
                    const status = getEventStatus(ev, nowTick)
                    const timeAllowsRegistration =
                      today && ev.is_matchday && status.open && !status.registrationClosed

                    const canRegister =
                      !membershipAccessLoading &&
                      hasInternalTournamentAccess &&
                      timeAllowsRegistration

                    return (
                      <div key={ev.id} className={today ? "p-4 sm:p-5 bg-orange-50/50" : "p-4 sm:p-5 bg-white"}>
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-black text-gray-900">{ev.title}</div>

                              {today ? (
                                <span className="rounded-full bg-orange-600 text-white px-3 py-1 text-[11px] font-black">
                                  HEUTE
                                </span>
                              ) : null}

                              {past ? (
                                <span className="rounded-full bg-gray-200 text-gray-700 px-3 py-1 text-[11px] font-black">
                                  VORBEI
                                </span>
                              ) : null}

                              {ev.isRescheduled ? (
                                <span className="rounded-full bg-blue-600 text-white px-3 py-1 text-[11px] font-black">
                                  VERSCHOBEN
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-orange-600" />
                                {ev.dateLabel}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-4 w-4 text-orange-600" />
                                {ev.timeLabel}
                              </span>
                            </div>

                            {ev.isRescheduled ? (
                              <div className="mt-2 text-xs text-gray-600">
                                Original:{" "}
                                <span className="line-through">
                                  {formatDateLabel(ev.originalDT)} • {formatTimeLabel(ev.originalDT)}
                                </span>
                              </div>
                            ) : null}

                            {!today && !past ? (
                              <div className="mt-2 text-xs font-semibold text-gray-500">
                                Anmeldung öffnet am Turniertag.
                              </div>
                            ) : null}

                            {today && !status.registrationClosed ? (
                              <div className="mt-2 text-xs font-semibold text-orange-800">
                                Anmeldung schließt in {formatDHMS(status.secondsToRegClose)}.
                              </div>
                            ) : null}

                            {today && !status.unregisterClosed ? (
                              <div className="mt-1 text-xs font-semibold text-red-700">
                                Abmeldung möglich bis 14:00 Uhr.
                              </div>
                            ) : null}

                            {today && status.registrationClosed ? (
                              <div className="mt-2 text-xs font-semibold text-red-700">
                                Anmeldung geschlossen.
                              </div>
                            ) : null}

                            {!membershipAccessLoading &&
                            timeAllowsRegistration &&
                            !hasInternalTournamentAccess ? (
                              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800">
                                <ShieldAlert className="h-3.5 w-3.5" />
                                Paket „Interne Turniere“ erforderlich
                              </div>
                            ) : null}
                          </div>

                          <Button
                            type="button"
                            disabled={!canRegister}
                            onClick={() => openModal(ev)}
                            className={
                              canRegister
                                ? "rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                                : "rounded-xl"
                            }
                            variant={canRegister ? "default" : "outline"}
                          >
                            {hasInternalTournamentAccess ? (
                              <UserPlus className="h-4 w-4 mr-2" />
                            ) : (
                              <ShieldAlert className="h-4 w-4 mr-2" />
                            )}
                            {!membershipAccessLoading && !hasInternalTournamentAccess
                              ? "Paket erforderlich"
                              : alreadyRegistered
                                ? "Anmeldung anzeigen"
                                : "Anmelden"}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            </>
          )}
        </motion.div>
      </main>

      <DKOSelfRegistrationModal
        isOpen={dkoModal.isOpen && !membershipAccessLoading && hasInternalTournamentAccess}
        onClose={() => {
          setDkoModal((prev) => ({ ...prev, isOpen: false }))
          loadRegistrations()
          loadOwnStatus()
        }}
        date={dkoModal.date}
        time={dkoModal.time}
        title={dkoModal.title}
        seriesId={dkoModal.seriesId}
        startgeld={dkoModal.startgeld}
      />

      <MobileBottomNav />
    </div>
  )
}