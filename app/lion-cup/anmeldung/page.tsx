"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { DKOSelfRegistrationModal } from "@/components/dko-self-registration-modal"
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react"
import { motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

type DkoSeries = {
  id: string
  name: string
  slug: string
  is_active: boolean
  series_type: string
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
  cutoffMinutes: number
}

type DkoModalState = {
  isOpen: boolean
  date: string
  time: string
  title: string
  seriesId: string | null
  startgeld: number | null
}

type GuestRequest = {
  id: string
  full_name: string
  player_name: string | null
  status: string
  auth_user_id: string | null
  linked_spieldatenbank_id: string | null
}

type SpieldatenbankPlayer = {
  id: string
  name: string
}

type AccountType = "member" | "guest" | "unknown"

const DEFAULT_CUTOFF_MINUTES = 10

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function formatDateLabel(dt: Date) {
  return dt.toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatTimeLabel(dt: Date) {
  return `${dt.toLocaleTimeString("de-AT", {
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`
}

function formatDHMS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const days = Math.floor(s / 86400)
  const rest = s % 86400
  const hours = Math.floor(rest / 3600)
  const minutes = Math.floor((rest % 3600) / 60)
  const seconds = rest % 60

  const hms = [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":")

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

function getRegistrationCloseDT(startDT: Date, cutoffMinutes: number) {
  const d = new Date(startDT)
  d.setMinutes(d.getMinutes() - cutoffMinutes)
  return d
}

function getEventStatus(ev: UiEvent, nowMs: number) {
  const openDT = getRegistrationOpenDT(ev.effectiveDT)
  const closeDT = getRegistrationCloseDT(ev.effectiveDT, ev.cutoffMinutes)

  const open = nowMs >= openDT.getTime()
  const registrationClosed = nowMs > closeDT.getTime()

  const secondsToOpen = Math.ceil((openDT.getTime() - nowMs) / 1000)
  const secondsToClose = Math.ceil((closeDT.getTime() - nowMs) / 1000)

  return {
    open,
    registrationClosed,
    secondsToOpen,
    secondsToClose,
    openDT,
    closeDT,
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 110, damping: 14 },
  },
}

export default function LionCupRegistrationPage() {
  const { session } = useAuth() as any

  const [series, setSeries] = useState<DkoSeries | null>(null)
  const [events, setEvents] = useState<UiEvent[]>([])
  const [registeredPlayers, setRegisteredPlayers] = useState<RegisteredPlayer[]>([])

  const [loading, setLoading] = useState(true)
  const [accountLoading, setAccountLoading] = useState(false)
  const [savingGuest, setSavingGuest] = useState(false)
  const [removing, setRemoving] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const [accountType, setAccountType] = useState<AccountType>("unknown")
  const [memberPlayerId, setMemberPlayerId] = useState<string | null>(null)

  const [guestPlayerId, setGuestPlayerId] = useState<string | null>(null)
  const [guestPlayerName, setGuestPlayerName] = useState<string | null>(null)
  const [guestStatusText, setGuestStatusText] = useState<string | null>(null)

  const modalOpenedAtRef = useRef<number>(0)

  const [dkoModal, setDkoModal] = useState<DkoModalState>({
    isOpen: false,
    date: "",
    time: "",
    title: "Lion Cup Anmeldung",
    seriesId: null,
    startgeld: null,
  })

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const loadLionCupData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: foundSeries, error: seriesError } = await supabase
        .from("dko_series")
        .select("id,name,slug,is_active,series_type,startgeld")
        .eq("series_type", "lion_cup")
        .eq("is_active", true)
        .maybeSingle()

      if (seriesError) throw seriesError

      if (!foundSeries) {
        throw new Error(
          "Keine aktive Lion-Cup-Serie gefunden. Bitte prüfe im Admin den Serientyp lion_cup und den Aktiv-Status."
        )
      }

      setSeries(foundSeries)

      const { data: eventData, error: eventError } = await supabase
        .from("dko_series_events")
        .select(
          "id,series_id,title,start_at,is_matchday,registration_cutoff_minutes,is_rescheduled,rescheduled_at"
        )
        .eq("series_id", foundSeries.id)
        .order("start_at", { ascending: true })

      if (eventError) throw eventError

      const mappedEvents = ((eventData || []) as DkoSeriesEvent[]).map(
        (ev, index) => {
          const isRescheduled = !!ev.is_rescheduled && !!ev.rescheduled_at
          const effectiveDT = new Date(
            isRescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at
          )
          const originalDT = new Date(ev.start_at)

          return {
            id: ev.id,
            series_id: ev.series_id,
            title: ev.title || `Lion Cup Spieltag ${index + 1}`,
            is_matchday: !!ev.is_matchday,
            effectiveDT,
            originalDT,
            isRescheduled,
            dateLabel: formatDateLabel(effectiveDT),
            timeLabel: formatTimeLabel(effectiveDT),
            cutoffMinutes:
              ev.registration_cutoff_minutes ?? DEFAULT_CUTOFF_MINUTES,
          }
        }
      )

      setEvents(mappedEvents)
    } catch (e: any) {
      console.error(e)
      setError(e?.message || "Fehler beim Laden vom Lion Cup.")
    } finally {
      setLoading(false)
    }
  }

  const loadRegistrations = async () => {
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

  const detectAccountType = async () => {
    try {
      setAccountLoading(true)

      setAccountType("unknown")
      setMemberPlayerId(null)

      setGuestPlayerId(null)
      setGuestPlayerName(null)
      setGuestStatusText(null)

      if (!session?.user?.id) {
        setGuestStatusText(
          "Bitte melde dich zuerst an, damit deine Anmeldung vorbereitet werden kann."
        )
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("club_players(spieldatenbank_id)")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (profileError) throw profileError

      const clubPlayersRel: any = (profile as any)?.club_players

      const spieldatenbankId = Array.isArray(clubPlayersRel)
        ? clubPlayersRel?.[0]?.spieldatenbank_id
        : clubPlayersRel?.spieldatenbank_id

      if (spieldatenbankId) {
        setMemberPlayerId(String(spieldatenbankId))
        setAccountType("member")
        return
      }

      const { data: guestRequestData, error: guestError } = await supabase
        .from("guest_requests")
        .select("id,full_name,player_name,status,auth_user_id,linked_spieldatenbank_id")
        .eq("auth_user_id", session.user.id)
        .maybeSingle()

      if (guestError) throw guestError

      const guestRequest = guestRequestData as GuestRequest | null

      if (!guestRequest) {
        setGuestStatusText(
          "Für deinen Zugang ist derzeit keine Anmeldung verfügbar."
        )
        setAccountType("unknown")
        return
      }

      if (guestRequest.status !== "approved") {
        setGuestStatusText("Dein Gastzugang ist noch nicht freigeschaltet.")
        setAccountType("unknown")
        return
      }

      if (!guestRequest.linked_spieldatenbank_id) {
        setGuestStatusText(
          "Deine Gast-Anmeldung ist noch nicht vollständig vorbereitet. Bitte wende dich an die Turnierleitung."
        )
        setAccountType("unknown")
        return
      }

      const { data: playerData, error: playerError } = await supabase
        .from("spieldatenbank")
        .select("id,name")
        .eq("id", guestRequest.linked_spieldatenbank_id)
        .maybeSingle()

      if (playerError) throw playerError

      const player = playerData as SpieldatenbankPlayer | null

      if (!player?.id || !player?.name) {
        setGuestStatusText(
          "Deine Gast-Anmeldung konnte nicht vollständig geladen werden. Bitte wende dich an die Turnierleitung."
        )
        setAccountType("unknown")
        return
      }

      setGuestPlayerId(String(player.id))
      setGuestPlayerName(String(player.name))
      setGuestStatusText(null)
      setAccountType("guest")
    } catch (e) {
      console.error("Fehler beim Erkennen des Zugangs:", e)
      setGuestStatusText(
        "Deine Anmeldung konnte nicht automatisch vorbereitet werden."
      )
      setAccountType("unknown")
    } finally {
      setAccountLoading(false)
    }
  }

  useEffect(() => {
    loadLionCupData()
    loadRegistrations()
  }, [])

  useEffect(() => {
    detectAccountType()
  }, [session?.user?.id])

  useEffect(() => {
    const channel = supabase
      .channel("lion-cup-registration-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dko_series" },
        () => {
          loadLionCupData()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dko_series_events" },
        () => {
          loadLionCupData()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dko_tournament_registration" },
        () => {
          loadRegistrations()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guest_requests" },
        () => {
          detectAccountType()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_profiles" },
        () => {
          detectAccountType()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.user?.id])

  const matchdays = useMemo(
    () => events.filter((ev) => ev.is_matchday),
    [events]
  )

  const todayEvent = useMemo(() => {
    return (
      matchdays.find((ev) => isToday(ev.effectiveDT)) ||
      matchdays.find((ev) => !isPastDay(ev.effectiveDT)) ||
      null
    )
  }, [matchdays])

  const currentStatus = useMemo(() => {
    if (!todayEvent) return null
    return getEventStatus(todayEvent, nowTick)
  }, [todayEvent, nowTick])

  const isCurrentEventToday = todayEvent ? isToday(todayEvent.effectiveDT) : false

  const canRegister =
    !!todayEvent &&
    isCurrentEventToday &&
    !!currentStatus?.open &&
    !currentStatus?.registrationClosed

  const ownRegistration = useMemo(() => {
    const ownPlayerId =
      accountType === "member" ? memberPlayerId : accountType === "guest" ? guestPlayerId : null

    if (!ownPlayerId) return null

    return (
      registeredPlayers.find(
        (p) => String(p.player_id) === String(ownPlayerId)
      ) || null
    )
  }, [registeredPlayers, accountType, memberPlayerId, guestPlayerId])

  const memberAlreadyRegistered =
    accountType === "member" && !!ownRegistration

  const guestAlreadyRegistered =
    accountType === "guest" && !!ownRegistration

  const canUnregister =
    !!ownRegistration &&
    !!todayEvent &&
    isCurrentEventToday &&
    !!currentStatus?.open &&
    !currentStatus?.registrationClosed

  const registrationInfoText = useMemo(() => {
    if (!todayEvent) return "Kein Lion Cup Spieltag gefunden."

    if (!isCurrentEventToday) {
      return "Die Anmeldung öffnet erst am jeweiligen Turniertag um 00:00 Uhr."
    }

    if (!currentStatus?.open) {
      return `Anmeldung öffnet in ${formatDHMS(
        currentStatus?.secondsToOpen || 0
      )}.`
    }

    if (currentStatus?.registrationClosed) {
      return "Die Anmeldung ist geschlossen."
    }

    return `Anmeldung geöffnet. Schließt in ${formatDHMS(
      currentStatus.secondsToClose
    )}.`
  }, [todayEvent, isCurrentEventToday, currentStatus])

  const openMemberModal = () => {
    if (!todayEvent) return
    if (!canRegister) return
    if (memberAlreadyRegistered) return

    modalOpenedAtRef.current = Date.now()

    setDkoModal({
      isOpen: true,
      date: todayEvent.dateLabel,
      time: todayEvent.timeLabel,
      title: series?.name || "Lion Cup Anmeldung",
      seriesId: series?.id ?? null,
      startgeld: Number(series?.startgeld ?? 0),
    })
  }

  const handleGuestRegister = async () => {
    try {
      setSavingGuest(true)
      setError(null)
      setSuccess(null)

      if (!todayEvent) {
        throw new Error("Kein Lion Cup Spieltag gefunden.")
      }

      const status = getEventStatus(todayEvent, Date.now())

      if (!isToday(todayEvent.effectiveDT)) {
        throw new Error(
          "Die Anmeldung ist nur am Turniertag ab 00:00 Uhr möglich."
        )
      }

      if (!status.open || status.registrationClosed) {
        throw new Error("Die Anmeldung ist aktuell nicht geöffnet.")
      }

      if (!guestPlayerId || !guestPlayerName) {
        throw new Error(
          "Deine Gast-Anmeldung ist noch nicht vollständig vorbereitet."
        )
      }

      const duplicate = registeredPlayers.some(
        (p) => String(p.player_id) === String(guestPlayerId)
      )

      if (duplicate) {
        throw new Error("Du bist bereits angemeldet.")
      }

      const payload = {
        player_id: guestPlayerId,
        player_name: guestPlayerName,
      }

      const { error: insertError } = await supabase
        .from("dko_tournament_registration")
        .insert(payload)

      if (insertError) throw insertError

      setSuccess(`${guestPlayerName} wurde erfolgreich angemeldet.`)

      await loadRegistrations()
    } catch (e: any) {
      console.error(e)
      setError(e?.message || "Gast-Anmeldung fehlgeschlagen.")
    } finally {
      setSavingGuest(false)
    }
  }

  const handleUnregister = async () => {
    try {
      setRemoving(true)
      setError(null)
      setSuccess(null)

      if (!ownRegistration?.id) {
        throw new Error("Keine aktive Anmeldung gefunden.")
      }

      if (!todayEvent) {
        throw new Error("Kein Lion Cup Spieltag gefunden.")
      }

      const status = getEventStatus(todayEvent, Date.now())

      if (!isToday(todayEvent.effectiveDT)) {
        throw new Error("Die Abmeldung ist nur am Turniertag möglich.")
      }

      if (!status.open || status.registrationClosed) {
        throw new Error("Die Abmeldung ist nicht mehr möglich.")
      }

      const { error: deleteError } = await supabase
        .from("dko_tournament_registration")
        .delete()
        .eq("id", ownRegistration.id)

      if (deleteError) throw deleteError

      setSuccess(`${ownRegistration.player_name} wurde erfolgreich abgemeldet.`)

      await loadRegistrations()
      await detectAccountType()
    } catch (e: any) {
      console.error(e)
      setError(e?.message || "Abmeldung fehlgeschlagen.")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24 md:pb-0">
      <Header />

      <main className="pt-16 sm:pt-14">
        <div className="mx-auto w-full max-w-7xl px-4 pt-4">
          <a href="/" className="text-sm font-black text-orange-700 hover:text-orange-800">
            ← Zur Startseite
          </a>
        </div>
        <motion.div
          className="mx-auto w-full px-4 py-6 sm:py-8 max-w-7xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-5">
            <div className="rounded-3xl border border-gray-200/70 bg-white shadow-md ring-1 ring-black/5 overflow-hidden">
              <div className="p-5 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 rounded-2xl bg-orange-600 text-white p-3 shadow-sm">
                    <Sparkles className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-orange-50 text-orange-700 border border-orange-100">
                      EMD LION CUP
                    </div>

                    <h1 className="mt-2 text-2xl sm:text-3xl font-black leading-tight">
                      Lion Cup Anmeldung
                    </h1>

                    <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-3xl">
                     
                    </p>

                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-2">
                      <div className="inline-flex items-center gap-2 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-900">
                        <Clock className="h-4 w-4 text-orange-700" />
                        Anmeldung ab <strong>00:00 Uhr</strong>
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900">
                        <XCircle className="h-4 w-4 text-red-700" />
                        An- und Abmeldung bis{" "}
                        <strong>10 Minuten vor Start</strong>
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
                        <Trophy className="h-4 w-4 text-orange-700" />
                        Startgeld:{" "}
                        <strong className="text-gray-900">
                          {Number(series?.startgeld ?? 0).toFixed(2)} €
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700" />
            </div>
          </motion.div>

          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-600" />
              <div className="mt-2 text-sm font-semibold text-gray-600">
                Lion Cup wird geladen...
              </div>
            </div>
          ) : (
            <>
              {error ? (
                <motion.div
                  variants={itemVariants}
                  className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
                >
                  {error}
                </motion.div>
              ) : null}

              {success ? (
                <motion.div
                  variants={itemVariants}
                  className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800"
                >
                  {success}
                </motion.div>
              ) : null}

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)] gap-5">
                <motion.div variants={itemVariants}>
                  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-orange-600" />
                        <h2 className="text-lg font-black text-gray-900">
                          Jetzt anmelden
                        </h2>
                      </div>

                      <div className="mt-2 text-sm font-semibold text-gray-600">
                        {registrationInfoText}
                      </div>
                    </div>

                    <div className="p-5">
                      {todayEvent ? (
                        <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <div className="font-black text-gray-900">
                            {todayEvent.title}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-orange-600" />
                              {todayEvent.dateLabel}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-4 w-4 text-orange-600" />
                              {todayEvent.timeLabel}
                            </span>
                          </div>

                          {isCurrentEventToday && currentStatus ? (
                            <div
                              className={
                                currentStatus.registrationClosed
                                  ? "mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-800"
                                  : "mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-black text-green-800"
                              }
                            >
                              {currentStatus.registrationClosed
                                ? "An- und Abmeldung geschlossen"
                                : `Geöffnet bis ${formatTimeLabel(
                                    currentStatus.closeDT
                                  )}`}
                            </div>
                          ) : (
                            <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-black text-orange-800">
                              Anmeldung erst am Turniertag möglich
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-900">
                          Kein aktiver Lion Cup Spieltag gefunden.
                        </div>
                      )}

                      {accountLoading ? (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-bold text-gray-600 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                          Anmeldung wird vorbereitet...
                        </div>
                      ) : null}

                      {!accountLoading && accountType === "member" ? (
                        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                            <div>
                              <div className="font-black text-gray-900">
                                Mitglieder-Anmeldung
                              </div>
                              <div className="mt-1 text-sm text-green-800 font-semibold">
                                
                              </div>
                            </div>
                          </div>

                          {memberAlreadyRegistered && ownRegistration ? (
                            <div className="mt-4 rounded-xl border border-green-300 bg-white px-3 py-2 text-xs font-black text-green-800">
                              Du bist bereits angemeldet.
                            </div>
                          ) : null}

                          {!memberAlreadyRegistered ? (
                            <Button
                              type="button"
                              disabled={!canRegister}
                              onClick={openMemberModal}
                              className={
                                canRegister
                                  ? "mt-4 w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                                  : "mt-4 w-full rounded-xl"
                              }
                              variant={canRegister ? "default" : "outline"}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Jetzt anmelden
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              disabled={!canUnregister || removing}
                              onClick={handleUnregister}
                              variant="outline"
                              className="mt-4 w-full rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                            >
                              {removing ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Abmeldung wird gespeichert...
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Abmelden
                                </>
                              )}
                            </Button>
                          )}

                          {memberAlreadyRegistered && !canUnregister ? (
                            <div className="mt-3 text-xs font-bold text-red-700">
                              Die Abmeldung ist nicht mehr möglich.
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {!accountLoading && accountType === "guest" ? (
                        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                            <div>
                              <div className="font-black text-gray-900">
                                Gast-Anmeldung
                              </div>
                              <div className="mt-1 text-sm text-green-800 font-semibold">
                               
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl border border-green-200 bg-white p-4">
                            <div className="text-xs font-black text-green-700 uppercase">
                              Spieler
                            </div>
                            <div className="mt-1 text-lg font-black text-gray-900">
                              {guestPlayerName || "—"}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-green-800">
                              Für Gäste ist keine Kartenzahlung erforderlich.
                            </div>
                          </div>

                          {guestAlreadyRegistered && ownRegistration ? (
                            <div className="mt-4 rounded-xl border border-green-300 bg-white px-3 py-2 text-xs font-black text-green-800">
                              Du bist bereits angemeldet.
                            </div>
                          ) : null}

                          {!guestAlreadyRegistered ? (
                            <Button
                              type="button"
                              disabled={
                                !canRegister ||
                                savingGuest ||
                                !guestPlayerId ||
                                !guestPlayerName
                              }
                              onClick={handleGuestRegister}
                              className={
                                canRegister &&
                                guestPlayerId &&
                                guestPlayerName
                                  ? "mt-4 w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                                  : "mt-4 w-full rounded-xl"
                              }
                              variant={
                                canRegister &&
                                guestPlayerId &&
                                guestPlayerName
                                  ? "default"
                                  : "outline"
                              }
                            >
                              {savingGuest ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Anmeldung wird gespeichert...
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Jetzt anmelden
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              disabled={!canUnregister || removing}
                              onClick={handleUnregister}
                              variant="outline"
                              className="mt-4 w-full rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                            >
                              {removing ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Abmeldung wird gespeichert...
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Abmelden
                                </>
                              )}
                            </Button>
                          )}

                          {guestAlreadyRegistered && !canUnregister ? (
                            <div className="mt-3 text-xs font-bold text-red-700">
                              Die Abmeldung ist nicht mehr möglich.
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {!accountLoading && accountType === "unknown" ? (
                        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                            <div>
                              <div className="font-black text-orange-900">
                                Anmeldung nicht verfügbar
                              </div>
                              <div className="mt-1 text-sm font-semibold text-orange-900">
                                {guestStatusText ||
                                  "Für deinen Zugang ist derzeit keine Anmeldung verfügbar."}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          loadLionCupData()
                          loadRegistrations()
                          detectAccountType()
                        }}
                        className="mt-4 w-full rounded-xl"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Aktualisieren
                      </Button>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-orange-600" />
                            <h2 className="text-lg font-black text-gray-900">
                              Aktuelle Anmeldungen
                            </h2>
                          </div>

                          <div className="mt-1 text-sm font-semibold text-gray-500">
                            {registeredPlayers.length} Spieler angemeldet
                          </div>
                        </div>

                        <div className="rounded-xl bg-green-100 text-green-800 px-3 py-2 text-xs font-black">
                          ANGEMELDET
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      {registeredPlayers.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {registeredPlayers.map((player, index) => {
                            const isOwn =
                              ownRegistration &&
                              String(ownRegistration.id) === String(player.id)

                            return (
                              <div
                                key={player.id}
                                className={
                                  isOwn
                                    ? "rounded-2xl border-2 border-orange-300 bg-orange-50 p-4 shadow-sm"
                                    : "rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm"
                                }
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div
                                      className={
                                        isOwn
                                          ? "text-xs text-orange-700 font-semibold"
                                          : "text-xs text-green-700 font-semibold"
                                      }
                                    >
                                      #{index + 1}
                                    </div>

                                    <div className="font-black text-gray-900">
                                      {player.player_name}
                                    </div>

                                    <div
                                      className={
                                        isOwn
                                          ? "mt-1 text-xs font-semibold text-orange-800"
                                          : "mt-1 text-xs font-semibold text-green-800"
                                      }
                                    >
                                      {isOwn ? "Deine Anmeldung" : "Angemeldet"}
                                    </div>
                                  </div>

                                  <span
                                    className={
                                      isOwn
                                        ? "rounded-full bg-orange-600 text-white px-3 py-1 text-[11px] font-black"
                                        : "rounded-full bg-green-600 text-white px-3 py-1 text-[11px] font-black"
                                    }
                                  >
                                    {isOwn ? "DU" : "ANGEMELDET"}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm font-semibold text-gray-600">
                          Noch keine Anmeldungen vorhanden.
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </motion.div>
      </main>

      <DKOSelfRegistrationModal
        isOpen={dkoModal.isOpen}
        onClose={() => {
          setDkoModal((prev) => ({ ...prev, isOpen: false }))
          loadRegistrations()
          detectAccountType()
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